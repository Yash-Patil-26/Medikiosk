import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { log } from '../utils/audit.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username, display_name: user.display_name },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 3600 * 1000,
      secure: process.env.NODE_ENV === 'production'
    });
    await log(user.role, user.id, 'LOGIN', 'user', user.id, {});
    res.json({ user: { id: user.id, role: user.role, username: user.username, display_name: user.display_name } });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await log(req.user.role, req.user.id, 'LOGOUT', 'user', req.user.id, {});
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
