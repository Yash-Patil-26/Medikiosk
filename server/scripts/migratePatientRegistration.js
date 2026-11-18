import 'dotenv/config';
import pool from '../src/config/db.js';

const IDENTIFIER = /^[A-Za-z0-9_]+$/;

async function assertExplicitTarget() {
  const requested = process.env.MEDIKIOSK_MIGRATION_DB?.trim();
  const configured = process.env.DB_NAME?.trim();
  if (!requested || !IDENTIFIER.test(requested)) {
    throw new Error('Set MEDIKIOSK_MIGRATION_DB explicitly to the exact database name before running this migration.');
  }
  if (!/_test$/i.test(requested)) {
    throw new Error('Migration refused: MEDIKIOSK_MIGRATION_DB must end in _test. Use an isolated test database only.');
  }
  if (!configured || configured !== requested) {
    throw new Error('DB_NAME must exactly match MEDIKIOSK_MIGRATION_DB. No migration was run.');
  }
  const [rows] = await pool.query('SELECT DATABASE() AS db');
  if (!rows[0]?.db || rows[0].db !== requested) {
    throw new Error('Connected database does not match MEDIKIOSK_MIGRATION_DB. No migration was run.');
  }
  console.log(`Verified migration target: ${rows[0].db}`);
}

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(table, index) {
  const [rows] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, index]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`Already present: ${table}.${column}`);
    return;
  }
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`Added: ${table}.${column}`);
}

async function run() {
  await assertExplicitTarget();
  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users','patients','consents')`
  );
  const found = new Set(tables.map(row => row.TABLE_NAME));
  for (const table of ['users', 'patients', 'consents']) {
    if (!found.has(table)) throw new Error(`Required table '${table}' is missing. Run the base schema first.`);
  }

  await addColumnIfMissing('users', 'login_identifier_type', 'VARCHAR(16) NULL');
  await addColumnIfMissing('users', 'login_identifier', 'VARCHAR(254) NULL');
  await addColumnIfMissing('patients', 'date_of_birth', 'DATE NULL');

  if (!(await indexExists('users', 'uq_users_login_identifier'))) {
    await pool.query(
      'CREATE UNIQUE INDEX uq_users_login_identifier ON users (login_identifier_type, login_identifier)'
    );
    console.log('Added unique patient login identifier index.');
  } else {
    console.log('Already present: users.uq_users_login_identifier');
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS patient_consent_preferences (
       patient_id INT NOT NULL,
       purpose_key VARCHAR(32) NOT NULL,
       granted TINYINT(1) NOT NULL DEFAULT 0,
       notice_version VARCHAR(20) NOT NULL DEFAULT '1.0',
       language VARCHAR(10) NOT NULL DEFAULT 'en',
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       PRIMARY KEY (patient_id, purpose_key),
       CONSTRAINT fk_patient_consent_preferences_patient
         FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  console.log('Ensured patient_consent_preferences table exists.');

  await pool.query(
    `ALTER TABLE consents MODIFY COLUMN action ENUM('grant','deny','revoke') DEFAULT 'grant'`
  );
  console.log('Updated consent action enum to distinguish denial from revocation.');
  console.log('Migration completed. The legacy enrollment-token column is intentionally retained for rollback safety; new application code no longer uses it.');
}

try {
  await run();
} catch (error) {
  console.error(`Patient registration migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
