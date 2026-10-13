import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { log } from '../utils/audit.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { patient_id, language, ayush_mode, graph_id } = req.body;
    const id = uuidv4();
    const expires_at = new Date(Date.now() + 2 * 3600 * 1000);
    await pool.query(
      'INSERT INTO sessions (id, patient_id, language, ayush_mode, graph_id, expires_at) VALUES (?,?,?,?,?,?)',
      [id, patient_id || null, language || 'en', ayush_mode ? 1 : 0, graph_id || null, expires_at]
    );
    await log('patient', patient_id || 0, 'SESSION_CREATED', 'session', id, {});
    res.status(201).json({ id, expires_at });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const [slots] = await pool.query('SELECT * FROM session_slots WHERE session_id = ?', [req.params.id]);
    res.json({ ...rows[0], slots });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['language', 'ayush_mode', 'status', 'voice_consent', 'document_consent',
      'share_his_consent', 'save_dashboard_consent', 'current_node_id', 'graph_id'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
    const sets = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE sessions SET ${sets} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    res.json({ updated: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM session_slots WHERE session_id = ?', [req.params.id]);
    await pool.query('DELETE FROM conversation_turns WHERE session_id = ?', [req.params.id]);
    await pool.query('DELETE FROM document_extractions WHERE session_id = ?', [req.params.id]);
    await pool.query('UPDATE sessions SET status = ? WHERE id = ?', ['purged', req.params.id]);
    await log('system', 0, 'SESSION_PURGED', 'session', req.params.id, {});
    res.json({
      purged: true,
      items: ['Temporary session deleted', 'Transcript removed', 'Temporary extraction removed', 'Kiosk state cleared']
    });
  } catch (err) { next(err); }
});

export default router;
