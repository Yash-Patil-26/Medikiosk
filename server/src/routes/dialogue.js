import { Router } from 'express';
import pool from '../config/db.js';
import {
  getNextNode,
  validateAnswerForNode
} from '../services/dialogueService.js';
import {
  getSession,
  sessionIsActive,
  requireActiveSession
} from '../utils/sessionAccess.js';

const router = Router();

const VALID_SOURCES = new Set(['touch', 'voice', 'text']);
const VALID_CONFIRMATIONS = new Set(['touch', 'readback', 'patient_review']);

router.get('/:sessionId/next', async (req, res, next) => {
  try {
    const access = await requireActiveSession(req.params.sessionId);

    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error });
    }

    const [slots] = await pool.query(
      `SELECT slot_id, value
       FROM session_slots
       WHERE session_id = ?
       ORDER BY id`,
      [access.session.id]
    );

    const slotMap = Object.fromEntries(
      slots.map(slot => [slot.slot_id, slot.value])
    );

    return res.json(await getNextNode(access.session, slotMap));
  } catch (err) {
    return next(err);
  }
});

router.post('/:sessionId/answer', async (req, res, next) => {
  const body = req.body || {};
  const {
    node_id,
    slot_id,
    value,
    source = 'touch',
    raw_text,
    confidence,
    confirmed_by
  } = body;

  if (
    typeof node_id !== 'string' ||
    !node_id.trim() ||
    node_id.length > 100 ||
    typeof slot_id !== 'string' ||
    !slot_id.trim() ||
    slot_id.length > 100 ||
    value === undefined
  ) {
    return res.status(400).json({
      error: 'A valid node_id, slot_id and value are required'
    });
  }

  if (!VALID_SOURCES.has(source)) {
    return res.status(400).json({ error: 'Invalid answer source' });
  }

  if (
    confirmed_by != null &&
    !VALID_CONFIRMATIONS.has(confirmed_by)
  ) {
    return res.status(400).json({ error: 'Invalid confirmation method' });
  }

  if (source === 'voice' && confirmed_by !== 'readback') {
    return res.status(400).json({
      error: 'Voice answers must be confirmed through read-back'
    });
  }

  const numericConfidence =
    confidence === undefined ? 1 : Number(confidence);

  if (
    !Number.isFinite(numericConfidence) ||
    numericConfidence < 0 ||
    numericConfidence > 1
  ) {
    return res.status(400).json({ error: 'Invalid confidence value' });
  }

  const rawText = raw_text == null
    ? (Array.isArray(value) ? value.join(', ') : String(value))
    : String(raw_text);

  if (rawText.length > 20000) {
    return res.status(400).json({ error: 'Answer is too long' });
  }

  let connection;
  let transactionOpen = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const session = await getSession(
      req.params.sessionId,
      connection,
      true
    );

    if (!session) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!sessionIsActive(session)) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(410).json({
        error: 'Session is no longer active'
      });
    }

    if (source === 'voice' && Number(session.voice_consent) !== 1) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(403).json({
        error: 'Voice processing consent is required'
      });
    }

    const [savedSlots] = await connection.query(
      `SELECT slot_id, value
       FROM session_slots
       WHERE session_id = ?
       ORDER BY id`,
      [session.id]
    );

    const slotMap = Object.fromEntries(
      savedSlots.map(slot => [slot.slot_id, slot.value])
    );

    const expectedNode = await getNextNode(session, slotMap);

    if (expectedNode.type === 'END') {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({
        error: 'The interview is already complete'
      });
    }

    const expectedNodeId =
      expectedNode.id || (
        expectedNode.type === 'complaint_selection'
          ? 'complaint_selection'
          : null
      );

    const expectedSlotId = expectedNode.slotId || (
      expectedNode.type === 'complaint_selection'
        ? 'complaint'
        : null
    );

    if (
      node_id !== expectedNodeId ||
      slot_id.trim() !== expectedSlotId
    ) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({
        error: 'Answer does not match the current question'
      });
    }

    const validation = validateAnswerForNode(
      expectedNode,
      value,
      source
    );

    if (!validation.valid) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({ error: validation.error });
    }

    const valueText = validation.normalizedValue;

    await connection.query(
      `INSERT INTO session_slots
       (session_id, slot_id, value, source, raw_text,
        confidence, confirmed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        expectedSlotId,
        valueText,
        source,
        rawText,
        numericConfidence,
        confirmed_by || null
      ]
    );

    await connection.query(
      `INSERT INTO conversation_turns
       (session_id, node_id, role, text, source)
       VALUES (?, ?, 'patient', ?, ?)`,
      [
        session.id,
        node_id.trim(),
        rawText,
        source
      ]
    );

    const [updateResult] = await connection.query(
      `UPDATE sessions
       SET current_node_id = ?
       WHERE id = ? AND status = 'active' AND expires_at > NOW()`,
      [node_id.trim(), session.id]
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error('Session became inactive while saving the answer');
    }

    await connection.commit();
    transactionOpen = false;

    return res.json({ saved: true });
  } catch (err) {
    if (connection && transactionOpen) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original error.
      }
    }

    return next(err);
  } finally {
    connection?.release();
  }
});

export default router;
