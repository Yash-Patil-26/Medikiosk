import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import pool from '../config/db.js';

const router = Router();

// Get all red flag alerts for staff/doctor review
router.get('/alerts', authenticate, requireRole('doctor', 'admin', 'staff'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT rf.id, rf.session_id, rf.rule_id, rf.level, rf.reason, rf.alert_id, rf.created_at,
              s.patient_id, e.id as encounter_id, e.token_no,
              CASE WHEN rf.acknowledged_at IS NOT NULL THEN true ELSE false END as acknowledged
       FROM red_flags rf
       LEFT JOIN sessions s ON s.id = rf.session_id
       LEFT JOIN encounters e ON e.session_id = rf.session_id
       ORDER BY rf.created_at DESC
       LIMIT 100`
    );

    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// Acknowledge a red flag alert
router.post('/alerts/:id/acknowledge', authenticate, requireRole('doctor', 'admin', 'staff'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, acknowledged_at FROM red_flags WHERE id = ?',
      [req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (rows[0].acknowledged_at) {
      return res.status(409).json({ error: 'Alert already acknowledged' });
    }

    await pool.query(
      'UPDATE red_flags SET acknowledged_at = NOW() WHERE id = ?',
      [req.params.id]
    );

    return res.json({ acknowledged: true });
  } catch (err) {
    return next(err);
  }
});

export default router;