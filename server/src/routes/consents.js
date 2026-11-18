import { Router } from 'express';
import { requireKioskSessionToken } from '../middleware/kioskSessionAuth.js';
import pool from '../config/db.js';
import { getSession, sessionIsActive } from '../utils/sessionAccess.js';
import { CONSENT_NOTICE_VERSION } from '../utils/patientRegistration.js';

const router = Router();

const CONSENT_COLUMNS = Object.freeze({
  voice: 'voice_consent',
  document: 'document_consent',
  his: 'share_his_consent',
  dashboard: 'save_dashboard_consent'
});

// New consent choices are stored at account level by POST /api/auth/consent-preferences.
// This module intentionally no longer accepts per-session consent grants.

router.post('/:id/revoke', requireKioskSessionToken(req => req.body?.session_id), async (req, res, next) => {
  const { session_id } = req.body || {};

  if (!session_id) {
    return res.status(400).json({ error: 'session_id required' });
  }

  let connection;
  let transactionOpen = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const session = await getSession(session_id, connection, true);

    if (!session) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!sessionIsActive(session)) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(410).json({
        error: 'Session is no longer active'
      });
    }

    const [rows] = await connection.query(
      'SELECT * FROM consents WHERE id = ? AND session_id = ? FOR UPDATE',
      [req.params.id, session_id]
    );

    if (!rows[0]) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({
        error: 'Consent record not found for this session'
      });
    }

    const consent = rows[0];
    const column = CONSENT_COLUMNS[consent.purpose_key];

    if (!column) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({
        error: 'Unsupported consent purpose'
      });
    }

    await connection.query(
      `INSERT INTO consents
       (patient_id, session_id, encounter_id, purpose_key,
        granted, language, action)
       VALUES (?, ?, ?, ?, 0, ?, 'revoke')`,
      [
        session.patient_id,
        session_id,
        consent.encounter_id,
        consent.purpose_key,
        session.language || consent.language || 'en'
      ]
    );

    await connection.query(
      `UPDATE sessions SET \`${column}\` = 0
       WHERE id = ? AND status = 'active' AND expires_at > NOW()`,
      [session_id]
    );

    // A patient revocation is durable for future sessions too. The kiosk
    // token can revoke, but cannot grant, consent; granting uses authenticated
    // account preferences and an explicit confirmation step.
    if (session.patient_id != null) {
      const patientId = Number(session.patient_id);
      await connection.query(
        `INSERT INTO patient_consent_preferences
         (patient_id, purpose_key, granted, notice_version, language)
         VALUES (?, ?, 0, ?, ?)
         ON CONFLICT (patient_id, purpose_key) DO UPDATE SET
           granted = 0,
           notice_version = EXCLUDED.notice_version,
           language = EXCLUDED.language`,
        [patientId, consent.purpose_key, CONSENT_NOTICE_VERSION, session.language || consent.language || 'en']
      );
      await connection.query(
        `INSERT INTO consents
         (patient_id, session_id, encounter_id, purpose_key, granted, notice_version, language, action)
         VALUES (?, NULL, ?, ?, 0, ?, ?, 'revoke')`,
        [patientId, consent.encounter_id, consent.purpose_key, CONSENT_NOTICE_VERSION, session.language || consent.language || 'en']
      );

      const [otherSessions] = await connection.query(
        `SELECT id FROM sessions
         WHERE patient_id = ? AND status = 'active' AND expires_at > NOW()
         FOR UPDATE`,
        [patientId]
      );
      for (const otherSession of otherSessions) {
        await connection.query(
          `UPDATE sessions SET \`${column}\` = 0 WHERE id = ? AND status = 'active'`,
          [otherSession.id]
        );
        if (otherSession.id !== session_id) {
          await connection.query(
            `INSERT INTO consents
             (patient_id, session_id, encounter_id, purpose_key, granted, notice_version, language, action)
             VALUES (?, ?, NULL, ?, 0, ?, ?, 'revoke')`,
            [patientId, otherSession.id, consent.purpose_key, CONSENT_NOTICE_VERSION, session.language || consent.language || 'en']
          );
        }
      }
    }

    const current = await getSession(session_id, connection, true);

    if (!sessionIsActive(current)) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(410).json({
        error: 'Session is no longer active'
      });
    }

    await connection.commit();
    transactionOpen = false;

    return res.json({ revoked: true });
  } catch (err) {
    if (connection && transactionOpen) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original database error.
      }
    }

    return next(err);
  } finally {
    connection?.release();
  }
});

export default router;
