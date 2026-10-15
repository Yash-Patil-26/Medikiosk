import dotenv from 'dotenv';
import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const { default: pool } = await import('../src/config/db.js');

async function ensureColumn(databaseName, tableName, columnName, definition) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [databaseName, tableName, columnName]
  );

  if (rows.length) {
    console.log(`${tableName}.${columnName} already exists.`);
    return;
  }

  // Names and definitions are fixed constants in this migration.
  await pool.query(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`
  );

  console.log(`Added ${tableName}.${columnName}.`);
}

try {
  const [databaseRows] = await pool.query('SELECT DATABASE() AS database_name');
  const databaseName = databaseRows[0]?.database_name;

  if (!databaseName) {
    throw new Error('No MySQL database is selected. Check server/.env.');
  }

  const [tables] = await pool.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME IN ('patients', 'sessions')`,
    [databaseName]
  );

  const names = new Set(tables.map(row => row.TABLE_NAME));

  for (const required of ['patients', 'sessions']) {
    if (!names.has(required)) {
      throw new Error(
        `Required table "${required}" is missing. Apply database/schema.sql first.`
      );
    }
  }

  await ensureColumn(
    databaseName,
    'patients',
    'kiosk_enrollment_token_hash',
    'CHAR(64) NULL'
  );

  await ensureColumn(
    databaseName,
    'sessions',
    'kiosk_token_hash',
    'CHAR(64) NULL'
  );

  console.log(
    'Kiosk session-auth schema migration complete. ' +
    'Existing sessions do not have credentials and must not be reused.'
  );
} catch (err) {
  console.error('Kiosk session-auth migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}