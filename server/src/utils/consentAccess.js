import pool from '../config/db.js';

// Consent decisions are append-only. The newest record wins, including
// a later denial or revocation. Auto-increment IDs provide stable ordering
// when multiple decisions share the same created_at timestamp.
export async function getLatestConsent(sessionId, purposeKey, executor = pool) {
  if (
    typeof sessionId !== 'string' ||
    !sessionId ||
    typeof purposeKey !== 'string' ||
    !purposeKey
  ) {
    return null;
  }

  const [rows] = await executor.query(
    `SELECT id, granted, action, created_at
     FROM consents
     WHERE session_id = ? AND purpose_key = ?
     ORDER BY id DESC
     LIMIT 1`,
    [sessionId, purposeKey]
  );

  return rows[0] || null;
}

export async function hasCurrentConsent(sessionId, purposeKey, executor = pool) {
  const decision = await getLatestConsent(sessionId, purposeKey, executor);

  return Boolean(
    decision &&
    Number(decision.granted) === 1 &&
    decision.action === 'grant'
  );
}