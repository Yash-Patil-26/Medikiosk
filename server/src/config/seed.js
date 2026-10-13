import bcrypt from 'bcryptjs';
import pool from './db.js';

const DEMO_USERS = [
  { role: 'doctor',  username: 'doctor',  password: 'Doctor@123',  display_name: 'Dr. Demo Sharma' },
  { role: 'triage',  username: 'triage',  password: 'Triage@123',  display_name: 'Triage Staff Demo' },
  { role: 'admin',   username: 'admin',   password: 'Admin@123',   display_name: 'Admin Demo' },
  { role: 'patient', username: 'patient', password: 'Patient@123', display_name: 'Demo Patient' }
];

export async function runSeed() {
  for (const u of DEMO_USERS) {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [u.username]);
    if (rows.length === 0) {
      const hash = await bcrypt.hash(u.password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (role, username, password_hash, display_name) VALUES (?,?,?,?)',
        [u.role, u.username, hash, u.display_name]
      );
      if (u.role === 'patient') {
        await pool.query(
          'INSERT INTO patients (name_encrypted, dob_encrypted, sex, phone_encrypted, phone_hash, preferred_language, user_id) VALUES (?,?,?,?,?,?,?)',
          ['DEMO_PATIENT', 'DEMO_DOB', 'male', 'DEMO_PHONE', 'DEMO_HASH', 'en', result.insertId]
        );
      }
      console.log(`Seeded demo user: ${u.username}`);
    }
  }
}
