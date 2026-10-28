import dotenv from 'dotenv';
import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const migrationDatabase = process.env.MEDIKIOSK_MIGRATION_DB?.trim();
const configuredDatabase = process.env.DB_NAME?.trim();

if (!migrationDatabase) {
  console.error(
    'Migration refused: set MEDIKIOSK_MIGRATION_DB explicitly to the intended database name.'
  );
  process.exit(1);
}

if (!/^[A-Za-z0-9_]+$/.test(migrationDatabase)) {
  console.error('Migration refused: the target database name has an invalid format.');
  process.exit(1);
}

if (!migrationDatabase.toLowerCase().endsWith('_test')) {
  console.error('Migration refused: MEDIKIOSK_MIGRATION_DB must end in _test. Use an isolated test database only.');
  process.exit(1);
}
if (!configuredDatabase || configuredDatabase !== migrationDatabase) {
  console.error(
    'Migration refused: MEDIKIOSK_MIGRATION_DB must exactly match DB_NAME.'
  );
  process.exit(1);
}

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

  if (databaseName !== migrationDatabase) {
    throw new Error(
      'Connected database does not match MEDIKIOSK_MIGRATION_DB. Refusing to alter tables.'
    );
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