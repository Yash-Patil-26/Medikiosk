import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hasCurrentConsent } from '../utils/consentAccess.js';
import { log } from '../utils/audit.js';

const router = Router();

function safeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Sort object keys recursively so equivalent JSON objects compare consistently.
function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalize(value[key])])
    );
  }

  return value;
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) ===
    JSON.stringify(canonicalize(right));
}

router.post(
  '/records',
  authenticate,
  requireRole('doctor', 'admin'),
  async (req, res, next) => {
    const encounterId = Number(req.body?.encounter_id);
    const incomingBundle = req.body?.bundle;

    if (!Number.isSafeInteger(encounterId) || encounterId <= 0) {
      return res.status(400).json({
        error: 'A valid encounter_id is required'
      });
    }

    if (
      !incomingBundle ||
      typeof incomingBundle !== 'object' ||
      Array.isArray(incomingBundle) ||
      incomingBundle.resourceType !== 'Bundle'
    ) {
      return res.status(400).json({
        error: 'A valid FHIR Bundle is required'
      });
    }

    let connection;
    let transactionOpen = false;
    let responseBody;
    let responseStatus;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionOpen = true;

      // Lock the encounter first, matching the sign-off lock order.
      const [encounterRows] = await connection.query(
        `SELECT id, status, session_id, fhir_bundle_json
         FROM encounters
         WHERE id = ?
         FOR UPDATE`,
        [encounterId]
      );

      const encounter = encounterRows[0];

      if (!encounter) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(404).json({ error: 'Encounter not found' });
      }

      if (
        encounter.status !== 'signed' ||
        !encounter.fhir_bundle_json
      ) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(409).json({
          error: 'Only a signed encounter with a finalized FHIR Bundle can be received'
        });
      }

      if (!encounter.session_id) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(403).json({
          error: 'The encounter has no linked consent-bearing session'
        });
      }

      const [sessionRows] = await connection.query(
        `SELECT id
         FROM sessions
         WHERE id = ?
         FOR UPDATE`,
        [encounter.session_id]
      );

      const linkedSession = sessionRows[0];
      const hasHisConsent = linkedSession
        ? await hasCurrentConsent(
            encounter.session_id,
            'his',
            connection
          )
        : false;

      if (!linkedSession || !hasHisConsent) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(403).json({
          error: 'Latest consent history does not permit HIS sharing'
        });
      }

      const storedBundle = safeJson(encounter.fhir_bundle_json);

      if (
        !storedBundle ||
        storedBundle.resourceType !== 'Bundle' ||
        !sameJson(incomingBundle, storedBundle)
      ) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(400).json({
          error: 'The submitted Bundle does not match the finalized encounter Bundle'
        });
      }

      // The encounter lock serializes calls through this route and sign-off.
      const [existingRecords] = await connection.query(
        `SELECT id
         FROM his_records
         WHERE encounter_id = ?
         LIMIT 1
         FOR UPDATE`,
        [encounterId]
      );

      if (existingRecords[0]) {
        await connection.query(
          `UPDATE encounters SET his_status = 'sent' WHERE id = ?`,
          [encounterId]
        );

        responseStatus = 200;
        responseBody = {
          status: 'received',
          already_received: true,
          encounter_id: encounterId,
          note: 'MOCK integration: not connected to a real HIS'
        };
      } else {
        // Persist the trusted server copy, never the caller's raw object.
        await connection.query(
          `INSERT INTO his_records (encounter_id, bundle_json)
           VALUES (?, ?)`,
          [encounterId, JSON.stringify(storedBundle)]
        );

        await connection.query(
          `UPDATE encounters SET his_status = 'sent' WHERE id = ?`,
          [encounterId]
        );

        responseStatus = 201;
        responseBody = {
          status: 'received',
          already_received: false,
          encounter_id: encounterId,
          note: 'MOCK integration: not connected to a real HIS'
        };
      }

      await connection.commit();
      transactionOpen = false;

      try {
        await log(
          req.user.role,
          req.user.id,
          'MOCK_HIS_RECORD_RECEIVED',
          'encounter',
          encounterId,
          { already_received: responseBody.already_received }
        );
      } catch (auditError) {
        console.error('HIS receipt recorded, but audit logging failed:', auditError);
      }

      return res.status(responseStatus).json(responseBody);
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
  '/records',
  authenticate,
  requireRole('doctor', 'admin'),
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, encounter_id, received_at
         FROM his_records
         ORDER BY received_at DESC
         LIMIT 50`
      );

      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
