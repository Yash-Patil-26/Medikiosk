import pool from '../config/db.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getSession(sessionId, executor = pool, lock = false) {
  if (typeof sessionId !== 'string' || !UUID_PATTERN.test(sessionId)) {
    return null;
  }

  const lockClause = lock ? ' FOR UPDATE' : '';
  const [rows] = await executor.query(
    `SELECT s.*,
       (s.status = 'active'
         AND s.expires_at IS NOT NULL
         AND s.expires_at > NOW()) AS _session_active
     FROM sessions s
     WHERE s.id = ?${lockClause}`,
    [sessionId]
  );

  return rows[0] || null;
}

export async function findSession(sessionId) {
  return getSession(sessionId);
}

export function sessionIsActive(session) {
  if (!session) return false;

  if (session._session_active !== undefined) {
    return Number(session._session_active) === 1;
  }

  const expiry = session.expires_at instanceof Date
    ? session.expires_at.getTime()
    : Date.parse(session.expires_at);

  return session.status === 'active'
    && Number.isFinite(expiry)
    && expiry > Date.now();
}

export async function requireActiveSession(sessionId) {
  const session = await getSession(sessionId);

  if (!session) {
    return { session: null, status: 404, error: 'Session not found' };
  }

  if (!sessionIsActive(session)) {
    return { session, status: 410, error: 'Session is no longer active' };
  }

  return { session, status: 200, error: null };
}