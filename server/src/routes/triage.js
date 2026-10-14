import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { log } from '../utils/audit.js';

const router = Router();

router.get(
  '/alerts',
  authenticate,
  requireRole('triage', 'doctor', 'admin'),
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT rf.id, rf.session_id, rf.rule_id, rf.level, rf.reason,
                rf.alert_id, rf.acknowledged_by, rf.acknowledged_at,
                rf.created_at, e.token_no, e.id AS encounter_id
         FROM red_flags rf
         LEFT JOIN encounters e ON e.id = (
           SELECT candidate.id
           FROM encounters candidate
           WHERE candidate.session_id = rf.session_id
           ORDER BY candidate.created_at DESC, candidate.id DESC
           LIMIT 1
         )
         ORDER BY
           CASE
             WHEN rf.level = 'critical' AND rf.acknowledged_at IS NULL THEN 0
             WHEN rf.level = 'warning' AND rf.acknowledged_at IS NULL THEN 1
             WHEN rf.level = 'critical' THEN 2
             ELSE 3
           END,
           rf.created_at DESC
         LIMIT 50`
      );

      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  '/alerts/:id/acknowledge',
  authenticate,
  requireRole('triage', 'doctor'),
  async (req, res, next) => {
    const alertId = Number(req.params.id);

    if (!Number.isSafeInteger(alertId) || alertId <= 0) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    try {
      // Acknowledgment is one-way: do not overwrite the first acknowledgment.
      const [result] = await pool.query(
        `UPDATE red_flags
         SET acknowledged_by = ?, acknowledged_at = NOW()
         WHERE id = ? AND acknowledged_at IS NULL`,
        [req.user.id, alertId]
      );

      if (result.affectedRows === 0) {
        const [rows] = await pool.query(
          'SELECT id, acknowledged_at FROM red_flags WHERE id = ?',
          [alertId]
        );

        if (!rows[0]) {
          return res.status(404).json({ error: 'Alert not found' });
        }

        return res.status(409).json({
          error: 'Alert has already been acknowledged'
        });
      }

      await log(
        req.user.role,
        req.user.id,
        'ALERT_ACKNOWLEDGED',
        'red_flag',
        alertId,
        {}
      );

      return res.json({ acknowledged: true });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
