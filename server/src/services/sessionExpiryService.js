import pool from '../config/db.js';
import { clearTemporarySessionData } from '../utils/sessionCleanup.js';

const CLEANUP_BATCH_SIZE = 50;
let cleanupRunning = false;

export async function expireSessionIfDue(sessionId) {
  let connection;
  let transactionOpen = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const [rows] = await connection.query(
      `SELECT id, expires_at
       FROM sessions
       WHERE id = ?
         AND status IN ('active', 'submitted')
         AND (expires_at IS NULL OR expires_at <= NOW())
       FOR UPDATE`,
      [sessionId]
    );

    const session = rows[0];

    if (!session) {
      await connection.commit();
      transactionOpen = false;
      return false;
    }

    await clearTemporarySessionData(connection, sessionId);

    const [updateResult] = await connection.query(
      `UPDATE sessions
       SET status = 'expired',
           voice_consent = 0,
           document_consent = 0,
           share_his_consent = 0,
           save_dashboard_consent = 0,
           current_node_id = NULL
       WHERE id = ?
         AND status IN ('active', 'submitted')
         AND (expires_at IS NULL OR expires_at <= NOW())`,
      [sessionId]
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error('Expired session cleanup could not be confirmed');
    }

    const metadata = {
      removed: [
        'session_slots',
        'conversation_turns',
        'document_extractions'
      ],
      retained: [
        'consents',
        'red_flags',
        'session marker',
        'encounters'
      ],
      reason: session.expires_at === null ? 'missing_expiry' : 'expired'
    };

    await connection.query(
      `INSERT INTO audit_logs
       (actor_role, actor_id, action, resource_type, resource_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'system',
        0,
        'SESSION_EXPIRED',
        'session',
        sessionId,
        JSON.stringify(metadata)
      ]
    );

    await connection.commit();
    transactionOpen = false;
    return true;
  } catch (error) {
    if (connection && transactionOpen) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original error.
      }
    }

    throw error;
  } finally {
    connection?.release();
  }
}

export async function expireDueSessions({ batchSize = CLEANUP_BATCH_SIZE } = {}) {
  const safeBatchSize = Number.isInteger(batchSize) && batchSize > 0
    ? Math.min(batchSize, 250)
    : CLEANUP_BATCH_SIZE;

  const [candidates] = await pool.query(
    `SELECT id
     FROM sessions
     WHERE status IN ('active', 'submitted')
       AND (expires_at IS NULL OR expires_at <= NOW())
     ORDER BY expires_at ASC
     LIMIT ${safeBatchSize}`
  );

  let expired = 0;

  for (const candidate of candidates) {
    if (await expireSessionIfDue(candidate.id)) {
      expired += 1;
    }
  }

  return { scanned: candidates.length, expired };
}

export function startSessionExpiryCleanup(intervalMs = 60_000) {
  if (!Number.isInteger(intervalMs) || intervalMs < 1_000) {
    throw new Error('Session expiry cleanup interval must be at least 1000 ms');
  }

  const runCleanup = async () => {
    if (cleanupRunning) return;
    cleanupRunning = true;

    try {
      const result = await expireDueSessions();

      if (result.expired > 0) {
        console.info(
          `[session-expiry] Expired and cleaned ${result.expired} session(s).`
        );
      }
    } catch (error) {
      console.error('[session-expiry] Cleanup run failed:', error);
    } finally {
      cleanupRunning = false;
    }
  };

  // Run once at startup, then periodically.
  void runCleanup();

  const timer = setInterval(runCleanup, intervalMs);
  timer.unref?.();

  return timer;
}