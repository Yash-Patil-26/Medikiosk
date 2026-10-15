import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createOpaqueToken } from '../utils/opaqueToken.js';

const router = Router();

const ALLOWED_LANGUAGES = new Set(['en', 'hi', 'mr']);

router.post('/', async (req, res, next) => {
  let connection;
  let transactionOpen = false;

  try {
    const body = req.body || {};
    const unsupported = Object.keys(body).filter(
      key => !['preferred_language'].includes(key)
    );

    if (unsupported.length) {
      return res.status(400).json({
        error: 'Unsupported patient fields',
        fields: unsupported
      });
    }

    const language = body.preferred_language || 'en';

    if (!ALLOWED_LANGUAGES.has(language)) {
      return res.status(400).json({
        error: 'Invalid preferred_language'
      });
    }

    const enrollment = createOpaqueToken();
    const syntheticId = `DEMO-${uuidv4().slice(0, 8).toUpperCase()}`;

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const [result] = await connection.query(
      `INSERT INTO patients
         (kiosk_enrollment_token_hash, sex, preferred_language)
       VALUES (?, 'prefer_not_to_say', ?)`,
      [enrollment.tokenHash, language]
    );

    await connection.query(
      `INSERT INTO audit_logs
         (actor_role, actor_id, action, resource_type,
          resource_id, metadata_json)
       VALUES ('kiosk', 0, 'PATIENT_CREATED', 'patient', ?, ?)`,
      [String(result.insertId), JSON.stringify({ synthetic: true })]
    );

    await connection.commit();
    transactionOpen = false;

    return res.status(201).json({
      id: result.insertId,
      syntheticId,
      enrollmentToken: enrollment.token
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

router.get('/:id', authenticate, requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, sex, preferred_language, created_at FROM patients WHERE id = ?',
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
