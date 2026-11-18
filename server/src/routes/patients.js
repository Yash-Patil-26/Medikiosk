import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

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

// Update patient account details
router.patch('/me', authenticate, requireRole('patient'), async (req, res, next) => {
  const body = req.body || {};
  const userId = req.user.id;
  const patientId = req.user.patient_id;

  try {
    let connection;
    let transactionOpen = false;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionOpen = true;

      // Update display name if provided
      if (body.display_name !== undefined) {
        const displayName = body.display_name.trim();
        if (displayName.length < 2 || displayName.length > 100) {
          await connection.rollback();
          return res.status(400).json({ error: 'Display name must be between 2 and 100 characters.' });
        }
        await connection.query(
          'UPDATE users SET display_name = ? WHERE id = ?',
          [displayName, userId]
        );
      }

      // Update patient details
      const updates = [];
      const values = [];
      
      if (body.date_of_birth !== undefined) {
        updates.push('date_of_birth = ?');
        values.push(body.date_of_birth);
      }
      
      if (body.sex !== undefined) {
        updates.push('sex = ?');
        values.push(body.sex);
      }
      
      if (body.preferred_language !== undefined) {
        updates.push('preferred_language = ?');
        values.push(body.preferred_language);
      }

      if (updates.length > 0) {
        values.push(patientId);
        await connection.query(
          `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Update login identifier if provided
      if (body.identifier_type !== undefined && body.identifier !== undefined) {
        const identifier = body.identifier.trim();
        
        // Validate based on type
        if (body.identifier_type === 'mobile') {
          if (!/^[6-9]\d{9}$/.test(identifier)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Mobile number must be 10 digits starting with 6, 7, 8, or 9.' });
          }
        } else if (body.identifier_type === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Please enter a valid email address.' });
          }
        } else if (body.identifier_type === 'abha') {
          if (!/^\d{14}$/.test(identifier)) {
            await connection.rollback();
            return res.status(400).json({ error: 'ABHA number must be exactly 14 digits.' });
          }
        }

        // Check for duplicate
        const [duplicateRows] = await connection.query(
          'SELECT id FROM users WHERE login_identifier_type = ? AND login_identifier = ? AND id != ? LIMIT 1',
          [body.identifier_type, identifier, userId]
        );
        if (duplicateRows.length) {
          await connection.rollback();
          return res.status(409).json({ error: 'This login ID is already in use by another account.' });
        }

        await connection.query(
          'UPDATE users SET login_identifier_type = ?, login_identifier = ? WHERE id = ?',
          [body.identifier_type, identifier, userId]
        );
      }

      // Update password if provided
      if (body.new_password !== undefined) {
        if (!body.current_password) {
          await connection.rollback();
          return res.status(400).json({ error: 'Current password is required to change password.' });
        }

        // Verify current password
        const [userRows] = await connection.query(
          'SELECT password_hash FROM users WHERE id = ?',
          [userId]
        );
        if (!userRows[0]) {
          await connection.rollback();
          return res.status(404).json({ error: 'User not found.' });
        }

        const isValid = await bcrypt.compare(body.current_password, userRows[0].password_hash);
        if (!isValid) {
          await connection.rollback();
          return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        if (body.new_password.length < 10 || body.new_password.length > 128) {
          await connection.rollback();
          return res.status(400).json({ error: 'Password must be between 10 and 128 characters.' });
        }

        const passwordHash = await bcrypt.hash(body.new_password, 12);
        await connection.query(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [passwordHash, userId]
        );
      }

      await connection.commit();
      transactionOpen = false;

      // Fetch updated user data
      const [updatedRows] = await pool.query(
        `SELECT u.id, u.display_name, u.login_identifier_type, u.login_identifier,
                p.date_of_birth, p.sex, p.preferred_language
         FROM users u
         LEFT JOIN patients p ON p.user_id = u.id
         WHERE u.id = ?`,
        [userId]
      );

      return res.json(updatedRows[0]);
    } catch (err) {
      if (transactionOpen) {
        await connection.rollback();
      }
      throw err;
    } finally {
      if (connection) connection.release();
    }
  } catch (err) {
    return next(err);
  }
});

export default router;
