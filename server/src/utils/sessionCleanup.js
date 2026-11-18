const TEMPORARY_SESSION_TABLES = Object.freeze([
  'session_slots',
  'conversation_turns',
  'document_extractions'
]);

export async function clearTemporarySessionData(connection, sessionId) {
  for (const table of TEMPORARY_SESSION_TABLES) {
    await connection.query(
      `DELETE FROM ${table} WHERE session_id = ?`,
      [sessionId]
    );
  }
}