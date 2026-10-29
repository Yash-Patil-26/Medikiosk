/**
 * Migration script to change 'triage' role to 'staff'
 * Run this from the server directory: node scripts/migrateTriageToStaff.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
dotenv.config({ path: join(__dirname, '../.env') });

async function migrate() {
  console.log('Starting migration: triage -> staff role...');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'medikiosk',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  try {
    // Step 1: Check current data
    console.log('Checking current user roles...');
    const [checkRows] = await pool.query('SELECT id, username, role FROM users');
    console.log('Current users:');
    checkRows.forEach(row => {
      console.log(`  ID: ${row.id}, Username: ${row.username}, Role: ${row.role}`);
    });
    
    // Step 2: First, add 'staff' to the enum temporarily
    console.log('Adding staff to role enum...');
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('patient','doctor','triage','staff','admin') NOT NULL
    `);
    console.log('Staff added to enum');
    
    // Step 3: Update existing triage users to staff role
    console.log('Updating existing triage users to staff role...');
    const [updateResult] = await pool.query(
      "UPDATE users SET role = 'staff' WHERE role = 'triage'"
    );
    console.log(`Updated ${updateResult.affectedRows} triage users to staff`);
    
    // Step 4: Remove 'triage' from the enum
    console.log('Removing triage from role enum...');
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('patient','doctor','staff','admin') NOT NULL
    `);
    console.log('Triage removed from enum');
    
    // Step 3: Verify the change
    const [rows] = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    console.log('Current user roles:');
    rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count}`);
    });
    
    console.log('Migration completed successfully!');
    
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error.message);
    await pool.end();
    throw error;
  }
}

migrate()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
