import dotenv from 'dotenv';
import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const { default: pool } = await import('../src/config/db.js');

async function ensureEncounterSessionMigration() {
  const [dbRows] = await pool.query('SELECT DATABASE() AS database_name');
  const databaseName = dbRows[0]?.database_name;

  if (!databaseName) {
    throw new Error('No MySQL database is selected. Check server/.env.');
  }

  const [tables] = await pool.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME IN ('sessions', 'encounters')`,
    [databaseName]
  );

  const tableNames = new Set(tables.map(row => row.TABLE_NAME));
  if (!tableNames.has('sessions') || !tableNames.has('encounters')) {
    throw new Error(
      'Expected sessions and encounters tables. Apply the base schema first.'
    );
  }

  const [columns] = await pool.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'encounters'
       AND COLUMN_NAME = 'session_id'`,
    [databaseName]
  );

  if (columns.length === 0) {
    console.log('Adding encounters.session_id...');
    await pool.query(
      'ALTER TABLE encounters ADD COLUMN session_id VARCHAR(36) NULL AFTER patient_id'
    );
  } else if (!String(columns[0].COLUMN_TYPE).toLowerCase().includes('varchar(36)')) {
    throw new Error(
      `encounters.session_id already exists with unexpected type: ${columns[0].COLUMN_TYPE}`
    );
  } else {
    console.log('encounters.session_id already exists.');
  }

  const [indexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'encounters'
       AND COLUMN_NAME = 'session_id'
       AND SEQ_IN_INDEX = 1
     LIMIT 1`,
    [databaseName]
  );

  if (indexes.length === 0) {
    console.log('Adding encounter session index...');
    await pool.query(
      'ALTER TABLE encounters ADD INDEX idx_encounters_session_id (session_id)'
    );
  } else {
    console.log('An index beginning with session_id already exists.');
  }

  const [foreignKeys] = await pool.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'encounters'
       AND COLUMN_NAME = 'session_id'
       AND REFERENCED_TABLE_NAME = 'sessions'
       AND REFERENCED_COLUMN_NAME = 'id'
     LIMIT 1`,
    [databaseName]
  );

  if (foreignKeys.length === 0) {
    console.log('Adding encounter-to-session foreign key...');
    await pool.query(
      `ALTER TABLE encounters
       ADD CONSTRAINT fk_encounters_session_id
       FOREIGN KEY (session_id) REFERENCES sessions(id)
       ON DELETE SET NULL`
    );
  } else {
    console.log('Encounter-to-session foreign key already exists.');
  }

  const [hisColumns] = await pool.query(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'encounters'
       AND COLUMN_NAME = 'his_status'`,
    [databaseName]
  );

  if (hisColumns.length === 0) {
    throw new Error('encounters.his_status is missing from the database.');
  }

  if (!String(hisColumns[0].COLUMN_TYPE).includes("'not_shared'")) {
    console.log('Adding the not_shared HIS status...');
    await pool.query(
      `ALTER TABLE encounters
       MODIFY COLUMN his_status
       ENUM('pending','sent','failed','not_shared')
       DEFAULT 'pending'`
    );
  } else {
    console.log('HIS not_shared status already exists.');
  }

  const [counts] = await pool.query(
    'SELECT COUNT(*) AS total FROM encounters WHERE session_id IS NULL'
  );

  console.log(`Migration verified for database "${databaseName}".`);
  console.log(
    `Encounters currently without a session link: ${counts[0].total}.`
  );
  console.log('Historical encounter records were not guessed or backfilled.');
}

try {
  await ensureEncounterSessionMigration();
} catch (error) {
  console.error('Encounter/session migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
