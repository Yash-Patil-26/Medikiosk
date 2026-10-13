import pool from '../config/db.js';

export async function log(actorRole, actorId, action, resourceType, resourceId, metadata = {}) {
  await pool.query(
    'INSERT INTO audit_logs (actor_role, actor_id, action, resource_type, resource_id, metadata_json) VALUES (?,?,?,?,?,?)',
    [actorRole, actorId, action, resourceType, String(resourceId), JSON.stringify(metadata)]
  );
}
