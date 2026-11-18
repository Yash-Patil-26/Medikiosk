import bcrypt from 'bcryptjs';
import pool from './db.js';

// Only admin is seeded - this account is non-deletable
const ADMIN_USER = { 
  role: 'admin', 
  username: 'admin', 
  password: 'Admin@123', 
  display_name: 'System Administrator',
  login_identifier_type: 'username',
  login_identifier: 'admin'
};

export async function runSeed() {
  // Only seed admin if it doesn't exist
  const [rows] = await pool.query('SELECT id, login_identifier_type, login_identifier FROM users WHERE username = ?', [ADMIN_USER.username]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(ADMIN_USER.password, 10);
    await pool.query(
      'INSERT INTO users (role, username, password_hash, display_name, login_identifier_type, login_identifier) VALUES (?,?,?,?,?,?)',
      [ADMIN_USER.role, ADMIN_USER.username, hash, ADMIN_USER.display_name, ADMIN_USER.login_identifier_type, ADMIN_USER.login_identifier]
    );
    console.log(`Seeded admin user: ${ADMIN_USER.username}`);
  } else {
    // Update existing admin user if login identifiers are missing
    const admin = rows[0];
    if (!admin.login_identifier_type || !admin.login_identifier) {
      await pool.query(
        'UPDATE users SET login_identifier_type = ?, login_identifier = ? WHERE username = ?',
        [ADMIN_USER.login_identifier_type, ADMIN_USER.login_identifier, ADMIN_USER.username]
      );
      console.log('Updated admin user with login identifiers');
    } else {
      console.log('Admin user already exists, skipping seed');
    }
  }
}
