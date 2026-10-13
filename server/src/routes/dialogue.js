import { Router } from 'express';
import pool from '../config/db.js';
import { getNextNode } from '../services/dialogueService.js';

const router = Router();

router.get('/:sessionId/next', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ?', [req.params.sessionId]);
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    const session = rows[0];
    const [slots] = await pool.query('SELECT slot_id, value FROM session_slots WHERE session_id = ?', [session.id]);
    const slotMap = Object.fromEntries(slots.map(s => [s.slot_id, s.value]));
    const node = await getNextNode(session, slotMap);
    res.json(node);
  } catch (err) { next(err); }
});

router.post('/:sessionId/answer', async (req, res, next) => {
  try {
    const { node_id, slot_id, value, source, raw_text, confidence, confirmed_by } = req.body;
    if (!slot_id || value === undefined) return res.status(400).json({ error: 'slot_id and value required' });
    const sessionId = req.params.sessionId;

    await pool.query(
      'INSERT INTO session_slots (session_id, slot_id, value, source, raw_text, confidence, confirmed_by) VALUES (?,?,?,?,?,?,?)',
      [sessionId, slot_id, String(value), source || 'touch', raw_text || String(value), confidence ?? 1.0, confirmed_by || null]
    );
    await pool.query(
      'INSERT INTO conversation_turns (session_id, node_id, role, text, source) VALUES (?,?,?,?,?)',
      [sessionId, node_id || null, 'patient', raw_text || String(value), source || 'touch']
    );
    if (node_id) {
      await pool.query('UPDATE sessions SET current_node_id = ? WHERE id = ?', [node_id, sessionId]);
    }
    res.json({ saved: true });
  } catch (err) { next(err); }
});

export default router;
