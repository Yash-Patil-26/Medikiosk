import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'medikiosk'}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Convert MySQL syntax to PostgreSQL
function convertSql(sql) {
  let converted = sql;
  let paramIndex = 0;

  // Convert ? placeholders to $1, $2, $3...
  converted = converted.replace(/\?/g, () => `$${++paramIndex}`);

  // Convert backticks to double quotes (PostgreSQL identifier quoting)
  converted = converted.replace(/`/g, '"');

  // Convert MySQL INSERT ... ON DUPLICATE KEY UPDATE to PostgreSQL ON CONFLICT
  // This is complex - we'll handle specific cases manually

  // NOW() works the same in PostgreSQL
  // AUTO_INCREMENT is only in schema, not queries

  return converted;
}

// Check if query is an INSERT that needs RETURNING id
function needsReturning(sql) {
  const upper = sql.trim().toUpperCase();
  return upper.startsWith('INSERT') && !upper.includes('RETURNING');
}

// Main query function - mimics mysql2/promise interface
async function query(sql, params = []) {
  let pgSql = convertSql(sql);

  // For INSERT queries, add RETURNING id to get insertId
  if (needsReturning(pgSql)) {
    pgSql += ' RETURNING id';
  }

  const result = await pool.query(pgSql, params);

  // Mimic mysql2 return format [rows, fields]
  // For INSERT with RETURNING, extract insertId
  if (needsReturning(sql) && result.rows.length > 0) {
    result.rows[0].insertId = result.rows[0].id;
  }

  // Mimic mysql2 affectedRows
  const affectedRows = result.rowCount !== undefined ? result.rowCount : result.rows.length;

  return [{ rows: result.rows, affectedRows, insertId: result.rows[0]?.insertId, fields: result.fields }, result.fields];

}
// Get a connection for transactions - mimics mysql2 getConnection
async function getConnection() {
  const client = await pool.connect();

  return {
    query: async (sql, params = []) => {
      let pgSql = convertSql(sql);

      if (needsReturning(pgSql)) {
        pgSql += ' RETURNING id';
      }

      const result = await client.query(pgSql, params);

      if (needsReturning(sql) && result.rows.length > 0) {
        result.rows[0].insertId = result.rows[0].id;
      }

      const affectedRows = result.rowCount !== undefined ? result.rowCount : result.rows.length;

      return [{ rows: result.rows, affectedRows, insertId: result.rows[0]?.insertId, fields: result.fields }, result.fields];
    },
    beginTransaction: async () => {
      await client.query('BEGIN');
    },
    commit: async () => {
      await client.query('COMMIT');
    },
    rollback: async () => {
      await client.query('ROLLBACK');
    },
    release: () => client.release()
  };
}

// Export pool-like object that mimics mysql2 interface
const db = {
  query,
  getConnection,
  end: () => pool.end(),
  on: (event, callback) => pool.on(event, callback)
};

export async function testConnection() {
  const conn = await pool.connect();
  await conn.query('SELECT 1');
  conn.release();
  console.log('PostgreSQL connected successfully');
}

export default db;