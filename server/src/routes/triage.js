import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { log } from '../utils/audit.js';

const router = Router();

router.get('/alerts', authenticate, requireRole('triage', 'doctor', 'admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT rf.id, rf.session_id, rf.rule_id, rf.level, rf.reason, rf.alert_id,
              rf.acknowledged_by, rf.acknowledged_at, rf.created_at,
              e.token_no, e.id as encounter_id
       FROM red_flags rf
       LEFT JOIN sessions s ON rf.session_id = s.id
       LEFT JOIN encounters e ON e.patient_id = s.patient_id
       ORDER BY rf.created_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/alerts/:id/acknowledge', authenticate, requireRole('triage', 'doctor'), async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'UPDATE red_flags SET acknowledged_by = ?, acknowledged_at = NOW() WHERE id = ?',
      [req.user.id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Alert not found' });
    await log(req.user.role, req.user.id, 'ALERT_ACKNOWLEDGED', 'red_flag', req.params.id, {});
    res.json({ acknowledged: true });
  } catch (err) { next(err); }
});

export default router;
