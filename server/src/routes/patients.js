import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { name_encrypted, dob_encrypted, sex, phone_hash, preferred_language } = req.body;
    const syntheticId = `DEMO-${uuidv4().slice(0, 8).toUpperCase()}`;
    const [result] = await pool.query(
      'INSERT INTO patients (name_encrypted, dob_encrypted, sex, phone_encrypted, phone_hash, preferred_language) VALUES (?,?,?,?,?,?)',
      [
        name_encrypted || syntheticId,
        dob_encrypted || 'DEMO',
        sex || 'prefer_not_to_say',
        'DEMO',
        phone_hash || 'DEMO',
        preferred_language || 'en'
      ]
    );
    res.status(201).json({ id: result.insertId, syntheticId });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, sex, preferred_language, created_at FROM patients WHERE id = ?',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
