import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/audit', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/purge-proof', authenticate, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM audit_logs WHERE action = 'SESSION_PURGED' ORDER BY timestamp DESC LIMIT 50"
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/stats', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const [[{ patients }]] = await pool.query('SELECT COUNT(*) as patients FROM patients');
    const [[{ sessions }]] = await pool.query('SELECT COUNT(*) as sessions FROM sessions');
    const [[{ encounters }]] = await pool.query('SELECT COUNT(*) as encounters FROM encounters');
    const [[{ flags }]] = await pool.query('SELECT COUNT(*) as flags FROM red_flags');
    res.json({ patients, sessions, encounters, flags });
  } catch (err) { next(err); }
});

export default router;
