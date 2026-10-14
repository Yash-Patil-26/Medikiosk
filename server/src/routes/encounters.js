import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { buildSummary } from '../services/summaryService.js';
import { buildFhirBundle } from '../services/fhirBundleBuilder.js';
import { evaluateRedFlags } from '../services/redFlagService.js';
import { log } from '../utils/audit.js';
import { hasCurrentConsent } from '../utils/consentAccess.js';
import { v4 as uuidv4 } from 'uuid';
import { getSession, sessionIsActive } from '../utils/sessionAccess.js';

const router = Router();

function safeJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function validPositiveInteger(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

// Create exactly one encounter from a validated kiosk session.
router.post('/', async (req, res, next) => {
  const {
    patient_id,
    session_id,
    language,
    ayush_mode
  } = req.body || {};

  if (typeof session_id !== 'string' || !session_id.trim()) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  let requestedPatientId = null;

  if (patient_id !== undefined && patient_id !== null && patient_id !== '') {
    if (!validPositiveInteger(patient_id)) {
      return res.status(400).json({ error: 'Invalid patient_id' });
    }

    requestedPatientId = Number(patient_id);
  }

  let connection;
  let transactionOpen = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    // Lock the session while validating and creating its encounter.
    const session = await getSession(session_id, connection, true);

    if (!session) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'purged') {
      await connection.rollback();
      transactionOpen = false;
      return res.status(410).json({ error: 'Session has been purged' });
    }

    const sessionPatientId =
      session.patient_id === null || session.patient_id === undefined
        ? null
        : Number(session.patient_id);

    if (requestedPatientId !== sessionPatientId) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(403).json({
        error: 'Patient does not match the session'
      });
    }

    // Make retries safe when a submission succeeded but the response was lost.
    const [existingRows] = await connection.query(
      `SELECT id, token_no, red_flag_level
       FROM encounters
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [session_id]
    );

    if (existingRows[0]) {
      await connection.rollback();
      transactionOpen = false;

      return res.status(200).json({
        id: existingRows[0].id,
        token_no: existingRows[0].token_no,
        red_flag_level: existingRows[0].red_flag_level,
        existing: true
      });
    }

    if (!sessionIsActive(session)) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(410).json({
        error: 'Session is no longer active'
      });
    }

    const [slots] = await connection.query(
      'SELECT * FROM session_slots WHERE session_id = ?',
      [session_id]
    );

    const [docs] = await connection.query(
      'SELECT * FROM document_extractions WHERE session_id = ?',
      [session_id]
    );

    const slotMap = Object.fromEntries(
      slots.map(slot => [
        slot.slot_id,
        {
          value: slot.value,
          source: slot.source,
          confirmed_by: slot.confirmed_by
        }
      ])
    );

    const summary = buildSummary(slotMap, docs);
    const flags = evaluateRedFlags(slotMap);

    const flagLevel = flags.length > 0
      ? (flags.some(flag => flag.level === 'critical')
        ? 'critical'
        : 'warning')
      : 'none';

    const token_no = `T${String(Date.now()).slice(-4)}`;
    const encounterLanguage = session.language || language || 'en';
    const encounterAyushMode = session.ayush_mode == null
      ? (ayush_mode ? 1 : 0)
      : (Number(session.ayush_mode) === 1 ? 1 : 0);

    const [result] = await connection.query(
      `INSERT INTO encounters
       (patient_id, session_id, token_no, language, ayush_mode,
        status, red_flag_level, red_flag_reasons, summary_draft_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestedPatientId,
        session_id,
        token_no,
        encounterLanguage,
        encounterAyushMode,
        'pending',
        flagLevel,
        JSON.stringify(flags.map(flag => flag.reason)),
        JSON.stringify(summary)
      ]
    );

    for (const flag of flags) {
      await connection.query(
        `INSERT INTO red_flags
         (session_id, rule_id, level, reason, alert_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          session_id,
          flag.ruleId,
          flag.level,
          flag.reason,
          uuidv4()
        ]
      );
    }

    // Encounter creation and session submission succeed or fail together.
    await connection.query(
      `UPDATE sessions SET status = 'submitted' WHERE id = ?`,
      [session_id]
    );

    await connection.commit();
    transactionOpen = false;

    try {
      await log(
        'patient',
        requestedPatientId || 0,
        'ENCOUNTER_CREATED',
        'encounter',
        result.insertId,
        {}
      );
    } catch (auditError) {
      console.error('Encounter created, but audit logging failed:', auditError);
    }

    return res.status(201).json({
      id: result.insertId,
      token_no,
      red_flag_level: flagLevel
    });
  } catch (err) {
    if (connection && transactionOpen) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original error.
      }
    }

    return next(err);
  } finally {
    connection?.release();
  }
});

router.get(
  '/',
  authenticate,
  requireRole('doctor', 'admin'),
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT e.id, e.token_no, e.status, e.red_flag_level,
                e.language, e.created_at, e.summary_draft_json, p.sex
         FROM encounters e
         LEFT JOIN patients p ON p.id = e.patient_id
         ORDER BY e.created_at DESC
         LIMIT 50`
      );

      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  }
);

router.get(
  '/:id/summary',
  authenticate,
  requireRole('doctor', 'admin'),
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM encounters WHERE id = ?',
        [req.params.id]
      );

      if (!rows[0]) {
        return res.status(404).json({ error: 'Not found' });
      }

      const enc = rows[0];

      // Only show documents belonging to this encounter's source session.
      let docs = [];

      if (enc.session_id) {
        const [documentRows] = await pool.query(
          'SELECT * FROM document_extractions WHERE session_id = ?',
          [enc.session_id]
        );
        docs = documentRows;
      }

      enc.summary_draft_json = safeJson(enc.summary_draft_json);
      enc.summary_final_json = safeJson(enc.summary_final_json);
      enc.red_flag_reasons = safeJson(enc.red_flag_reasons, []);

      return res.json({ ...enc, documents: docs });
    } catch (err) {
      return next(err);
    }
  }
);

router.patch(
  '/:id/summary',
  authenticate,
  requireRole('doctor'),
  async (req, res, next) => {
    try {
      const { summary_draft_json, doctor_notes } = req.body || {};

      if (
        !summary_draft_json ||
        typeof summary_draft_json !== 'object' ||
        Array.isArray(summary_draft_json)
      ) {
        return res.status(400).json({
          error: 'A valid summary object is required'
        });
      }

      if (
        doctor_notes !== undefined &&
        doctor_notes !== null &&
        typeof doctor_notes !== 'string'
      ) {
        return res.status(400).json({ error: 'Invalid doctor_notes' });
      }

      const [rows] = await pool.query(
        'SELECT status FROM encounters WHERE id = ?',
        [req.params.id]
      );

      if (!rows[0]) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (rows[0].status === 'signed' || rows[0].status === 'cancelled') {
        return res.status(409).json({
          error: 'This encounter can no longer be edited'
        });
      }

      await pool.query(
        `UPDATE encounters
         SET summary_draft_json = ?, doctor_notes = ?
         WHERE id = ?`,
        [
          JSON.stringify(summary_draft_json),
          doctor_notes ?? null,
          req.params.id
        ]
      );

      await log(
        req.user.role,
        req.user.id,
        'SUMMARY_EDITED',
        'encounter',
        req.params.id,
        {}
      );

      return res.json({ updated: true });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  '/:id/sign',
  authenticate,
  requireRole('doctor'),
  async (req, res, next) => {
    let connection;
    let transactionOpen = false;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionOpen = true;

      const [rows] = await connection.query(
        `SELECT e.*, p.sex
         FROM encounters e
         LEFT JOIN patients p ON p.id = e.patient_id
         WHERE e.id = ?
         FOR UPDATE`,
        [req.params.id]
      );

      if (!rows[0]) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(404).json({ error: 'Not found' });
      }

      const enc = rows[0];

      if (enc.status === 'signed') {
        await connection.rollback();
        transactionOpen = false;
        return res.status(409).json({ error: 'Already signed' });
      }

      if (enc.status === 'cancelled') {
        await connection.rollback();
        transactionOpen = false;
        return res.status(409).json({
          error: 'Cancelled encounters cannot be signed'
        });
      }

      // A purge clears temporary session flags, but is not itself consent
      // revocation. Use the latest durable HIS consent decision instead.
      // Missing history, a denial, or a later revocation fails closed.
      let hasHisConsent = false;

      if (enc.session_id) {
        const [sessionRows] = await connection.query(
          `SELECT id
           FROM sessions
           WHERE id = ?
           FOR UPDATE`,
          [enc.session_id]
        );

        if (sessionRows[0]) {
          hasHisConsent = await hasCurrentConsent(
            enc.session_id,
            'his',
            connection
          );
        }
      }

      const summary = safeJson(enc.summary_draft_json, {});
      const fhir = buildFhirBundle(enc, summary);
      const hisStatus = hasHisConsent ? 'sent' : 'not_shared';

      // The sign-off, FHIR snapshot and simulated HIS receipt are atomic.
      await connection.query(
        `UPDATE encounters
         SET status = 'signed',
             summary_final_json = ?,
             fhir_bundle_json = ?,
             signed_by = ?,
             signed_at = NOW(),
             his_status = ?
         WHERE id = ?`,
        [
          JSON.stringify(summary),
          JSON.stringify(fhir),
          req.user.id,
          hisStatus,
          enc.id
        ]
      );

      // This is a local mock-HIS record, not a real external transmission.
      if (hasHisConsent) {
        await connection.query(
          'INSERT INTO his_records (encounter_id, bundle_json) VALUES (?, ?)',
          [enc.id, JSON.stringify(fhir)]
        );
      }

      await connection.commit();
      transactionOpen = false;

      try {
        await log(
          req.user.role,
          req.user.id,
          'ENCOUNTER_SIGNED',
          'encounter',
          enc.id,
          { his_status: hisStatus }
        );
      } catch (auditError) {
        console.error('Encounter signed, but audit logging failed:', auditError);
      }

      return res.json({
        signed: true,
        fhir,
        his_status: hisStatus
      });
    } catch (err) {
      if (connection && transactionOpen) {
        try {
          await connection.rollback();
        } catch {
          // Preserve the original error.
        }
      }

      return next(err);
    } finally {
      connection?.release();
    }
  }
);

router.get(
  '/:id/fhir',
  authenticate,
  requireRole('doctor', 'admin'),
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        'SELECT fhir_bundle_json FROM encounters WHERE id = ?',
        [req.params.id]
      );

      if (!rows[0]?.fhir_bundle_json) {
        return res.status(404).json({
          error: 'FHIR bundle not yet generated'
        });
      }

      return res.json(safeJson(rows[0].fhir_bundle_json));
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
