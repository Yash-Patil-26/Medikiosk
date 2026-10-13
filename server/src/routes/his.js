import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/records', async (req, res, next) => {
  try {
    const { encounter_id, bundle } = req.body;
    await pool.query(
      'INSERT INTO his_records (encounter_id, bundle_json) VALUES (?,?)',
      [encounter_id || null, JSON.stringify(bundle || {})]
    );
    res.status(201).json({
      status: 'received',
      message: 'FHIR Bundle received successfully',
      encounter_id,
      received_at: new Date().toISOString(),
      note: 'MOCK integration — not connected to real HIS'
    });
  } catch (err) { next(err); }
});

router.get('/records', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, encounter_id, received_at FROM his_records ORDER BY received_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
