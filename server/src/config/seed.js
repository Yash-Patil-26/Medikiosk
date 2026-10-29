import bcrypt from 'bcryptjs';
import pool from './db.js';

// Only admin is seeded - this account is non-deletable
const ADMIN_USER = { 
  role: 'admin', 
  username: 'admin', 
  password: 'Admin@123', 
  display_name: 'System Administrator' 
};

export async function runSeed() {
  // Only seed admin if it doesn't exist
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [ADMIN_USER.username]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(ADMIN_USER.password, 10);
    await pool.query(
      'INSERT INTO users (role, username, password_hash, display_name) VALUES (?,?,?,?)',
      [ADMIN_USER.role, ADMIN_USER.username, hash, ADMIN_USER.display_name]
    );
    console.log(`Seeded admin user: ${ADMIN_USER.username}`);
  } else {
    console.log('Admin user already exists, skipping seed');
  }
}
