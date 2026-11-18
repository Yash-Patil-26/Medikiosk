import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import os from 'os';

const router = Router();

// Dashboard statistics
router.get('/dashboard-stats', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const [patients] = await pool.query('SELECT COUNT(*) as count FROM patients');
    const [doctors] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'");
    const [sessions] = await pool.query('SELECT COUNT(*) as count FROM sessions');
    const [activeSessions] = await pool.query("SELECT COUNT(*) as count FROM sessions WHERE status = 'active'");
    const [encounters] = await pool.query('SELECT COUNT(*) as count FROM encounters');
    const [encountersToday] = await pool.query(
      "SELECT COUNT(*) as count FROM encounters WHERE DATE(created_at) = CURDATE()"
    );
    const [redFlags] = await pool.query('SELECT COUNT(*) as count FROM red_flags');

    res.json({
      total_patients: patients[0].count,
      total_doctors: doctors[0].count,
      total_sessions: sessions[0].count,
      active_sessions: activeSessions[0].count,
      total_encounters: encounters[0].count,
      encounters_today: encountersToday[0].count,
      red_flags: redFlags[0].count
    });
  } catch (err) { next(err); }
});

// Recent activity feed
router.get('/recent-activity', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT action, actor_role, resource_type, resource_id, timestamp
       FROM audit_logs
       ORDER BY timestamp DESC
       LIMIT 20`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// System health check
router.get('/system-health', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Database health check
    let dbStatus = 'healthy';
    let dbResponseTime = 0;
    let dbActiveConnections = 0;
    
    try {
      const dbStart = Date.now();
      await pool.query('SELECT 1');
      dbResponseTime = Date.now() - dbStart;
      const [connInfo] = await pool.query('SHOW STATUS LIKE "Threads_connected"');
      dbActiveConnections = connInfo[0]?.Value || 0;
    } catch (dbError) {
      dbStatus = 'error';
      console.error('Database health check failed:', dbError);
    }

    // System metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercentage = Math.round((usedMem / totalMem) * 100);

    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeString = `${uptimeHours}h ${uptimeMinutes}m`;

    // API performance metrics (simplified)
    const avgResponseTime = dbResponseTime + 50; // Base latency + DB time
    const requestsPerMinute = 100; // Mock value
    const errorRate = 0.5; // Mock value
    const activeSessions = 5; // Mock value

    res.json({
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      message: dbStatus === 'healthy' ? 'All systems operational' : 'Database connection issues detected',
      uptime: uptimeString,
      response_time: `${dbResponseTime}ms`,
      database: {
        status: dbStatus,
        response_time: `${dbResponseTime}ms`,
        active_connections: dbActiveConnections,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'medikiosk'
      },
      api: {
        status: 'healthy',
        uptime: uptimeString,
        version: '1.0.0'
      },
      memory: {
        status: memoryUsagePercentage > 80 ? 'warning' : 'healthy',
        used: Math.round(usedMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        usage_percentage: memoryUsagePercentage
      },
      disk: {
        status: 'healthy',
        used: 50, // Mock value in GB
        total: 100, // Mock value in GB
        usage_percentage: 50
      },
      performance: {
        avg_response_time: avgResponseTime,
        requests_per_minute: requestsPerMinute,
        error_rate: errorRate,
        active_sessions: activeSessions
      },
      system: {
        node_version: process.version,
        platform: os.platform(),
        arch: os.arch()
      },
      application: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        mode: 'DEMO'
      }
    });
  } catch (err) { next(err); }
});

// User management
router.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, status } = req.query;
    let query = `
      SELECT u.id, u.role, u.username, u.display_name, u.login_identifier_type, u.login_identifier,
             u.created_at, p.id as patient_id, p.preferred_language
      FROM users u
      LEFT JOIN patients p ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (status && status !== 'all') {
      query += ' AND u.status = ?';
      params.push(status);
    }

    query += ' ORDER BY u.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Get single user details
router.get('/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT u.id, u.role, u.username, u.display_name, u.login_identifier_type, u.login_identifier,
              u.created_at, p.id as patient_id, p.preferred_language, p.date_of_birth, p.sex
       FROM users u
       LEFT JOIN patients p ON p.user_id = u.id
       WHERE u.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Session management
router.get('/sessions', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, red_flag } = req.query;
    let query = `
      SELECT s.id, s.patient_id, s.language, s.status, s.current_node_id, s.created_at,
             p.name_encrypted as patient_name, s.doctor_id,
             (SELECT COUNT(*) FROM red_flags WHERE session_id = s.id) as red_flag_count
      FROM sessions s
      LEFT JOIN patients p ON p.id = s.patient_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND s.status = ?';
      params.push(status);
    }

    if (red_flag === 'true') {
      query += ' AND EXISTS (SELECT 1 FROM red_flags WHERE session_id = s.id)';
    }

    query += ' ORDER BY s.created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Get single session details
router.get('/sessions/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.*, p.name_encrypted as patient_name, p.preferred_language as patient_language
       FROM sessions s
       LEFT JOIN patients p ON p.id = s.patient_id
       WHERE s.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Purge session (admin only)
router.post('/sessions/:id/purge', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if session exists
    const [sessions] = await pool.query('SELECT * FROM sessions WHERE id = ?', [id]);
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Purge session data
    await pool.query('DELETE FROM session_slots WHERE session_id = ?', [id]);
    await pool.query('DELETE FROM conversation_turns WHERE session_id = ?', [id]);
    await pool.query('DELETE FROM document_extractions WHERE session_id = ?', [id]);
    await pool.query('DELETE FROM red_flags WHERE session_id = ?', [id]);
    await pool.query('DELETE FROM consents WHERE session_id = ?', [id]);
    await pool.query('DELETE FROM sessions WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Session purged successfully' });
  } catch (err) { next(err); }
});

export default router;
