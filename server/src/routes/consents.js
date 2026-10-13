import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { patient_id, session_id, encounter_id, purpose_key, granted, language } = req.body;
    if (!purpose_key) return res.status(400).json({ error: 'purpose_key required' });
    await pool.query(
      'INSERT INTO consents (patient_id, session_id, encounter_id, purpose_key, granted, language, action) VALUES (?,?,?,?,?,?,?)',
      [patient_id || null, session_id || null, encounter_id || null, purpose_key, granted ? 1 : 0, language || 'en', granted ? 'grant' : 'revoke']
    );
    res.status(201).json({ recorded: true });
  } catch (err) { next(err); }
});

router.post('/:id/revoke', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM consents WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const c = rows[0];
    await pool.query(
      'INSERT INTO consents (patient_id, session_id, encounter_id, purpose_key, granted, language, action) VALUES (?,?,?,?,0,?,?)',
      [c.patient_id, c.session_id, c.encounter_id, c.purpose_key, c.language, 'revoke']
    );
    res.json({ revoked: true });
  } catch (err) { next(err); }
});

export default router;
