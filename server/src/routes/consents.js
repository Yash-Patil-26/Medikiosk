import { Router } from 'express';
import pool from '../config/db.js';
import { getSession, sessionIsActive } from '../utils/sessionAccess.js';

const router = Router();

const CONSENT_COLUMNS = Object.freeze({
  voice: 'voice_consent',
  document: 'document_consent',
  his: 'share_his_consent',
  dashboard: 'save_dashboard_consent'
});

router.post('/', async (req, res, next) => {
  const body = req.body || {};
  const { patient_id, session_id, purpose_key, granted } = body;

  if (
    !session_id ||
    !Object.prototype.hasOwnProperty.call(CONSENT_COLUMNS, purpose_key)
  ) {
    return res.status(400).json({
      error: 'A valid session_id and purpose_key are required'
    });
  }

  if (typeof granted !== 'boolean') {
    return res.status(400).json({ error: 'granted must be true or false' });
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

    // The session's patient ID is authoritative.
    if (patient_id !== undefined) {
      const suppliedId =
        patient_id === null || patient_id === ''
          ? null
          : Number(patient_id);
      const actualId =
        session.patient_id == null ? null : Number(session.patient_id);

      if (
        (suppliedId !== null && !Number.isSafeInteger(suppliedId)) ||
        suppliedId !== actualId
      ) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(403).json({
          error: 'Patient does not match session'
        });
      }
    }

    const column = CONSENT_COLUMNS[purpose_key];

    await connection.query(
      `INSERT INTO consents
       (patient_id, session_id, encounter_id, purpose_key,
        granted, language, action)
       VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      [
        session.patient_id,
        session_id,
        purpose_key,
        granted ? 1 : 0,
        session.language || 'en',
        granted ? 'grant' : 'revoke'
      ]
    );

    await connection.query(
      `UPDATE sessions
       SET \`${column}\` = ?
       WHERE id = ? AND status = 'active' AND expires_at > NOW()`,
      [granted ? 1 : 0, session_id]
    );

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

    return res.status(201).json({
      recorded: true,
      purpose_key,
      granted
    });
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

router.post('/:id/revoke', async (req, res, next) => {
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