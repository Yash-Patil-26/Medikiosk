import { Router } from 'express';
import { requireKioskSessionToken } from '../middleware/kioskSessionAuth.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createOpaqueToken } from '../utils/opaqueToken.js';
import { randomUUID } from 'node:crypto';
import pool from '../config/db.js';
import { getSession, requireActiveSession } from '../utils/sessionAccess.js';
import { CONSENT_NOTICE_VERSION, CONSENT_PURPOSES } from '../utils/patientRegistration.js';
import { clearTemporarySessionData } from '../utils/sessionCleanup.js';

const router = Router();

router.post('/', authenticate, requireRole('patient'), async (req, res, next) => {
  const body = req.body || {};
  const unsupported = Object.keys(body).filter(
    key => !['language', 'ayush_mode', 'graph_id', 'doctor_id'].includes(key)
  );
  if (unsupported.length) {
    return res.status(400).json({ error: 'Unsupported session fields', fields: unsupported });
  }

  const language = body.language === undefined ? 'en' : body.language;
  if (typeof language !== 'string' || !['en', 'hi', 'mr'].includes(language)) {
    return res.status(400).json({ error: 'Invalid language' });
  }
  if (
    body.ayush_mode !== undefined &&
    typeof body.ayush_mode !== 'boolean' && body.ayush_mode !== 0 && body.ayush_mode !== 1
  ) {
    return res.status(400).json({ error: 'Invalid ayush_mode' });
  }
  const graphId = body.graph_id ?? null;
  if (graphId !== null && (typeof graphId !== 'string' || graphId.length > 100)) {
    return res.status(400).json({ error: 'Invalid graph_id' });
  }
  const doctorId = body.doctor_id ?? null;
  if (doctorId !== null && (typeof doctorId !== 'number' || doctorId <= 0)) {
    return res.status(400).json({ error: 'Invalid doctor_id' });
  }

  const id = randomUUID();
  const expires_at = new Date(Date.now() + 2 * 3600 * 1000);
  const sessionCredential = createOpaqueToken();
  let connection;
  let transactionOpen = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const [patientRows] = await connection.query(
      'SELECT id, preferred_language FROM patients WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    if (!patientRows[0]) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({ error: 'Patient profile is not linked to this account.' });
    }
    const patientId = Number(patientRows[0].id);

    const [preferenceRows] = await connection.query(
      `SELECT purpose_key, granted, notice_version, language
       FROM patient_consent_preferences WHERE patient_id = ? FOR UPDATE`,
      [patientId]
    );
    const preferences = Object.fromEntries(
      preferenceRows.map(row => [row.purpose_key, Number(row.granted) === 1])
    );
    const complete = CONSENT_PURPOSES.every(purpose =>
      Object.hasOwn(preferences, purpose) &&
      preferenceRows.find(row => row.purpose_key === purpose)?.notice_version === CONSENT_NOTICE_VERSION
    );
    if (!complete) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({ error: 'Initial consent is required before starting a session.' });
    }

    await connection.query(
      `INSERT INTO sessions
       (id, patient_id, language, ayush_mode, graph_id, doctor_id,
        voice_consent, document_consent, share_his_consent, save_dashboard_consent,
        expires_at, kiosk_token_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        patientId,
        language,
        body.ayush_mode === true || body.ayush_mode === 1 ? 1 : 0,
        graphId,
        doctorId,
        preferences.voice ? 1 : 0,
        preferences.document ? 1 : 0,
        preferences.his ? 1 : 0,
        preferences.dashboard ? 1 : 0,
        expires_at,
        sessionCredential.tokenHash
      ]
    );

    // Snapshot previously saved account preferences into this session. This
    // is not a new consent prompt or decision; it makes downstream session-level
    // consent checks enforce the patient's saved choices consistently.
    for (const purpose of CONSENT_PURPOSES) {
      const preference = preferenceRows.find(row => row.purpose_key === purpose);
      await connection.query(
        `INSERT INTO consents
         (patient_id, session_id, encounter_id, purpose_key, granted, notice_version, language, action)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
        [
          patientId,
          id,
          purpose,
          preferences[purpose] ? 1 : 0,
          preference.notice_version || CONSENT_NOTICE_VERSION,
          preference.language || language,
          preferences[purpose] ? 'grant' : 'deny'
        ]
      );
    }

    await connection.query(
      `INSERT INTO audit_logs
       (actor_role, actor_id, action, resource_type, resource_id, metadata_json)
       VALUES ('patient', ?, 'SESSION_CREATED', 'session', ?, ?)`,
      [req.user.id, id, JSON.stringify({ consent_preferences_snapshotted: true })]
    );

    await connection.commit();
    transactionOpen = false;
    return res.status(201).json({
      id,
      patient_id: patientId,
      language,
      ayush_mode: body.ayush_mode === true || body.ayush_mode === 1,
      doctor_id: doctorId,
      expires_at,
      consents: preferences,
      kioskToken: sessionCredential.token
    });
  } catch (err) {
    if (connection && transactionOpen) {
      try { await connection.rollback(); } catch { /* Preserve original error. */ }
    }
    return next(err);
  } finally {
    connection?.release();
  }
});

router.get('/:id', requireKioskSessionToken(req => req.params.id), async (req, res, next) => {
  try {
    const access = await requireActiveSession(req.params.id);

    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error });
    }

    const session = { ...access.session };
    delete session._session_active;
delete session.kiosk_token_hash;

    const [slots] = await pool.query(
      `SELECT id, session_id, slot_id, value, source,
              confidence, confirmed_by, created_at
       FROM session_slots
       WHERE session_id = ?`,
      [req.params.id]
    );

    return res.json({ ...session, slots });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireKioskSessionToken(req => req.params.id), async (req, res, next) => {
  try {
    const access = await requireActiveSession(req.params.id);

    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error });
    }

    const body = req.body || {};
    const allowed = new Set(['language', 'ayush_mode', 'slots']);
    const unsupported = Object.keys(body).filter(key => !allowed.has(key));

    if (unsupported.length) {
      return res.status(400).json({
        error: 'Unsupported session fields',
        fields: unsupported
      });
    }

    const updates = {};

    if (body.language !== undefined) {
      if (
        typeof body.language !== 'string' ||
        body.language.trim().length < 2 ||
        body.language.trim().length > 10
      ) {
        return res.status(400).json({ error: 'Invalid language' });
      }

      updates.language = body.language.trim();
    }

    if (body.ayush_mode !== undefined) {
      if (
        typeof body.ayush_mode !== 'boolean' &&
        body.ayush_mode !== 0 &&
        body.ayush_mode !== 1
      ) {
        return res.status(400).json({ error: 'Invalid ayush_mode' });
      }

      updates.ayush_mode =
        body.ayush_mode === true || body.ayush_mode === 1 ? 1 : 0;
    }

    // Handle slot updates
    if (body.slots !== undefined) {
      if (!Array.isArray(body.slots)) {
        return res.status(400).json({ error: 'slots must be an array' });
      }

      for (const slotUpdate of body.slots) {
        if (!slotUpdate.slot_id || slotUpdate.value === undefined) {
          return res.status(400).json({ error: 'Each slot update must have slot_id and value' });
        }

        await pool.query(
          `UPDATE session_slots
           SET value = ?, source = 'touch', raw_text = ?, confidence = 1.0, confirmed_by = 'touch'
           WHERE session_id = ? AND slot_id = ?`,
          [slotUpdate.value, slotUpdate.value, req.params.id, slotUpdate.slot_id]
        );
      }
    }

    if (!Object.keys(updates).length && !body.slots) {
      return res.status(400).json({ error: 'No valid fields' });
    }

    const sets = Object.keys(updates)
      .map(key => `\`${key}\` = ?`)
      .join(', ');

    await pool.query(
      `UPDATE sessions
       SET ${sets}
       WHERE id = ? AND status = 'active' AND expires_at > NOW()`,
      [...Object.values(updates), req.params.id]
    );

    // Same-value updates can yield affectedRows = 0 in MySQL.
    const current = await requireActiveSession(req.params.id);

    if (current.status !== 200) {
      return res.status(current.status).json({ error: current.error });
    }

    return res.json({ updated: true });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireKioskSessionToken(req => req.params.id), async (req, res, next) => {
  const purgeItems = [
    'Temporary interview answers removed',
    'Conversation transcript removed',
    'Temporary document extraction results removed',
    'Session marked as purged and consent flags disabled'
  ];

  const retainedItems = [
    'Consent history retained for audit',
    'Red-flag alerts retained for doctor review',
    'Session metadata retained as a purged marker',
    'Encounter records and purge audit event retained'
  ];

  let connection;
  let transactionOpen = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    // Lock the session so simultaneous purge requests cannot race.
    const session = await getSession(req.params.id, connection, true);

    if (!session) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'purged') {
      // Repair the audit proof if an earlier implementation purged
      // this session but failed to record the event.
      const [auditRows] = await connection.query(
        `SELECT id
         FROM audit_logs
         WHERE action = 'SESSION_PURGED'
           AND resource_type = 'session'
           AND resource_id = ?
         LIMIT 1`,
        [req.params.id]
      );

      if (!auditRows[0]) {
        const metadata = {
          removed: [
            'session_slots',
            'conversation_turns',
            'document_extractions'
          ],
          retained: [
            'consents',
            'red_flags',
            'session marker',
            'encounters'
          ],
          audit_repaired_on_retry: true
        };

        await connection.query(
          `INSERT INTO audit_logs
           (actor_role, actor_id, action, resource_type,
            resource_id, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            'system',
            0,
            'SESSION_PURGED',
            'session',
            req.params.id,
            JSON.stringify(metadata)
          ]
        );
      }

      await connection.commit();
      transactionOpen = false;

      return res.json({
        purged: true,
        already_purged: true,
        items: purgeItems,
        retained: retainedItems
      });
    }

    await clearTemporarySessionData(connection, req.params.id);

    const [updateResult] = await connection.query(
      `UPDATE sessions
       SET status = 'purged',
           voice_consent = 0,
           document_consent = 0,
           share_his_consent = 0,
           save_dashboard_consent = 0,
           current_node_id = NULL
       WHERE id = ?`,
      [req.params.id]
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error('Session purge could not be confirmed');
    }

    const metadata = {
      removed: [
        'session_slots',
        'conversation_turns',
        'document_extractions'
      ],
      retained: [
        'consents',
        'red_flags',
        'session marker',
        'encounters'
      ]
    };

    // Audit record and data removal commit together.
    await connection.query(
      `INSERT INTO audit_logs
       (actor_role, actor_id, action, resource_type,
        resource_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'system',
        0,
        'SESSION_PURGED',
        'session',
        req.params.id,
        JSON.stringify(metadata)
      ]
    );

    await connection.commit();
    transactionOpen = false;

    return res.json({
      purged: true,
      already_purged: false,
      items: purgeItems,
      retained: retainedItems
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
export default router;
