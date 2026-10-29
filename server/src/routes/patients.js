import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Public anonymous enrollment has been removed. Patient accounts are created
// transactionally through POST /api/auth/register.
router.get('/:id', authenticate, requireRole('doctor', 'admin'), async (req, res, next) => {
  const patientId = Number(req.params.id);
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return res.status(400).json({ error: 'A valid patient ID is required.' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT p.id, u.display_name, p.date_of_birth, p.sex,
              p.preferred_language, p.created_at
       FROM patients p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [patientId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Patient not found.' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// Get encounters for the currently logged-in patient
router.get('/my-encounters', authenticate, requireRole('patient'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.token_no, e.status, e.red_flag_level,
              e.language, e.created_at, e.summary_draft_json, e.summary_final_json
       FROM encounters e
       WHERE e.patient_id = ?
       ORDER BY e.created_at DESC
       LIMIT 20`,
      [req.user.patient_id]
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

export default router;
