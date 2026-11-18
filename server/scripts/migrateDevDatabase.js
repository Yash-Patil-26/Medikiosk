import 'dotenv/config';
import pool from '../src/config/db.js';

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
  console.log('Starting database migration for development...');

  const [dbResult] = await pool.query('SELECT DATABASE() AS db');
  console.log(`Target database: ${dbResult[0].db}`);

  // Add new columns to users table
  await addColumnIfMissing('users', 'login_identifier_type', 'VARCHAR(16) NULL');
  await addColumnIfMissing('users', 'login_identifier', 'VARCHAR(254) NULL');

  // Add date_of_birth to patients table
  await addColumnIfMissing('patients', 'date_of_birth', 'DATE NULL');

  // Add unique index for login identifiers
  if (!(await indexExists('users', 'uq_users_login_identifier'))) {
    await pool.query(
      'CREATE UNIQUE INDEX uq_users_login_identifier ON users (login_identifier_type, login_identifier)'
    );
    console.log('Added unique patient login identifier index.');
  } else {
    console.log('Already present: users.uq_users_login_identifier');
  }

  // Create patient_consent_preferences table
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

  // Update consents action enum
  await pool.query(
    `ALTER TABLE consents MODIFY COLUMN action ENUM('grant','deny','revoke') DEFAULT 'grant'`
  );
  console.log('Updated consent action enum to distinguish denial from revocation.');

  console.log('\n✅ Migration completed successfully!');
  console.log('The database is now ready for the new patient registration workflow.');
}

try {
  await run();
} catch (error) {
  console.error(`❌ Migration failed: ${error.message}`);
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await pool.end();
}
