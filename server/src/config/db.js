import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'medikiosk',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
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

  return converted;
}

// Tables that have an 'id' column - only these need RETURNING id
const TABLES_WITH_ID = new Set([
  'users', 'patients', 'sessions', 'encounters', 'consents',
  'document_extractions', 'conversation_turns', 'session_slots',
  'red_flags', 'audit_logs', 'his_records'
]);

// Check if query is an INSERT that needs RETURNING id
function needsReturning(sql) {
  const upper = sql.trim().toUpperCase();
  if (!upper.startsWith('INSERT') || upper.includes('RETURNING')) {
    return false;
  }
  
  // Extract table name from INSERT INTO table_name
  const match = upper.match(/INSERT\s+INTO\s+[`"]?(\w+)[`"]?/i);
  if (!match) return false;
  
  const tableName = match[1].toLowerCase();
  return TABLES_WITH_ID.has(tableName);
}

// Main query function - mimics mysql2/promise interface
async function query(sql, params = []) {
  let pgSql = convertSql(sql);

  if (needsReturning(pgSql)) {
    pgSql += ' RETURNING id';
  }

  const result = await pool.query(pgSql, params);

  if (needsReturning(sql) && result.rows.length > 0) {
    result.rows[0].insertId = result.rows[0].id;
  }

  const affectedRows = result.rowCount !== undefined ? result.rowCount : result.rows.length;

  // Return [rows, fields] like mysql2/promise
  // For SELECT: rows is the array of result rows
  // For INSERT/UPDATE/DELETE: rows is the result object with affectedRows, insertId
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT') ||
                   sql.trim().toUpperCase().startsWith('SHOW') ||
                   sql.trim().toUpperCase().startsWith('DESCRIBE');

  if (isSelect) {
    return [result.rows, result.fields];
  } else {
    // For non-SELECT, return object with affectedRows and insertId
    const response = {
      affectedRows: result.rowCount || 0,
      insertId: result.rows[0]?.insertId || result.rows[0]?.id || 0,
      changedRows: result.rowCount || 0
    };
    return [response, result.fields];
  }
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

      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') ||
                       sql.trim().toUpperCase().startsWith('SHOW') ||
                       sql.trim().toUpperCase().startsWith('DESCRIBE');

      if (isSelect) {
        return [result.rows, result.fields];
      } else {
        const response = {
          affectedRows: result.rowCount || 0,
          insertId: result.rows[0]?.insertId || result.rows[0]?.id || 0,
          changedRows: result.rowCount || 0
        };
        return [response, result.fields];
      }
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