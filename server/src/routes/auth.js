import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import pool from '../config/db.js';
import { getJwtSecret } from '../config/jwt.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { log } from '../utils/audit.js';
import {
  CONSENT_NOTICE_VERSION,
  CONSENT_PURPOSES,
  normalizePatientIdentifier,
  validateConsentPreferences,
  validatePatientRegistration
} from '../utils/patientRegistration.js';

const router = Router();
const PURPOSE_COLUMNS = Object.freeze({
  voice: 'voice_consent',
  document: 'document_consent',
  his: 'share_his_consent',
  dashboard: 'save_dashboard_consent'
});

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 3600 * 1000,
    secure: process.env.NODE_ENV === 'production'
  });
}

function createAuthToken(user) {
  return jwt.sign(
    {
      id: Number(user.id),
      role: user.role,
      username: user.username,
      display_name: user.display_name,
      patient_id: user.patient_id == null ? null : Number(user.patient_id)
    },
    getJwtSecret(),
    { expiresIn: '8h' }
  );
}

async function getPublicUser(userId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT u.id, u.role, u.username, u.display_name,
            u.login_identifier_type, u.login_identifier,
            p.id AS patient_id, p.preferred_language, p.date_of_birth, p.sex
     FROM users u
     LEFT JOIN patients p ON p.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;

  const user = {
    id: Number(row.id),
    role: row.role,
    username: row.username,
    display_name: row.display_name || row.username,
    patient_id: row.patient_id == null ? null : Number(row.patient_id)
  };

  if (row.role !== 'patient' || row.patient_id == null) {
    return { ...user, hasConsentSetup: false, consents: {} };
  }

  user.preferred_language = row.preferred_language || 'en';
  user.date_of_birth = row.date_of_birth || null;
  user.sex = row.sex || 'prefer_not_to_say';
  user.login_identifier_type = row.login_identifier_type || 'username';
  user.login_identifier = row.login_identifier || row.username;

  const [preferenceRows] = await executor.query(
    `SELECT purpose_key, granted, notice_version, language
     FROM patient_consent_preferences
     WHERE patient_id = ?`,
    [user.patient_id]
  );
  const prefs = {};
  let version = null;
  let language = user.preferred_language;
  for (const preference of preferenceRows) {
    if (!CONSENT_PURPOSES.includes(preference.purpose_key)) continue;
    prefs[preference.purpose_key] = Number(preference.granted) === 1;
    version = preference.notice_version || version;
    language = preference.language || language;
  }
  user.consents = prefs;
  user.consent_notice_version = version;
  user.consent_language = language;
  user.hasConsentSetup = CONSENT_PURPOSES.every(purpose => Object.hasOwn(prefs, purpose))
    && CONSENT_PURPOSES.every(purpose => preferenceRows.find(row => row.purpose_key === purpose)?.notice_version === CONSENT_NOTICE_VERSION);
  return user;
}

router.post('/register', async (req, res, next) => {
  const validation = validatePatientRegistration(req.body || {});
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error, ...(validation.fields ? { fields: validation.fields } : {}) });
  }

  const registration = validation.value;
  const internalUsername = `patient_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  let passwordHash;
  let connection;
  let transactionOpen = false;

  try {
    passwordHash = await bcrypt.hash(registration.password, 12);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const [duplicateRows] = await connection.query(
      `SELECT id FROM users
       WHERE login_identifier_type = ? AND login_identifier = ?
       LIMIT 1 FOR UPDATE`,
      [registration.identifier_type, registration.identifier]
    );
    if (duplicateRows.length) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({ error: 'An account already uses this login ID. Sign in instead or use another ID.' });
    }

    const [userResult] = await connection.query(
      `INSERT INTO users
       (role, username, login_identifier_type, login_identifier,
        password_hash, display_name)
       VALUES ('patient', ?, ?, ?, ?, ?)`,
      [
        internalUsername,
        registration.identifier_type,
        registration.identifier,
        passwordHash,
        registration.display_name
      ]
    );
    const userId = Number(userResult.insertId);

    const [patientResult] = await connection.query(
      `INSERT INTO patients
       (sex, preferred_language, user_id, date_of_birth)
       VALUES (?, ?, ?, ?)`,
      [registration.sex, registration.preferred_language, userId, registration.date_of_birth]
    );
    const patientId = Number(patientResult.insertId);

    await connection.query(
      `INSERT INTO audit_logs
       (actor_role, actor_id, action, resource_type, resource_id, metadata_json)
       VALUES ('patient', ?, 'PATIENT_REGISTERED', 'patient', ?, ?)`,
      [userId, String(patientId), JSON.stringify({ identifier_type: registration.identifier_type })]
    );

    await connection.commit();
    transactionOpen = false;

    const user = await getPublicUser(userId);
    setAuthCookie(res, createAuthToken({ ...user, patient_id: patientId }));
    return res.status(201).json({ user });
  } catch (err) {
    if (connection && transactionOpen) {
      try { await connection.rollback(); } catch { /* Preserve original error. */ }
    }
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account already uses this login ID. Sign in instead or use another ID.' });
    }
    return next(err);
  } finally {
    connection?.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body || {};
    const identifierType = body.identifier_type || (body.username ? 'username' : '');
    const identifierInput = body.identifier ?? body.username;
    const password = body.password;

    if (
      typeof identifierType !== 'string' ||
      !['username', 'abha', 'mobile', 'email'].includes(identifierType) ||
      typeof identifierInput !== 'string' || !identifierInput.trim() ||
      typeof password !== 'string' || !password || password.length > 128
    ) {
      return res.status(400).json({ error: 'Login ID and password are required.' });
    }

    let queryValue = identifierInput.trim();
    if (identifierType !== 'username') {
      const normalized = normalizePatientIdentifier(identifierType, queryValue);
      if (!normalized.valid) return res.status(400).json({ error: normalized.error });
      queryValue = normalized.value;
    }

    const [rows] = identifierType === 'username'
      ? await pool.query('SELECT id, password_hash FROM users WHERE username = ? LIMIT 1', [queryValue])
      : await pool.query(
        `SELECT id, password_hash FROM users
         WHERE login_identifier_type = ? AND login_identifier = ? LIMIT 1`,
        [identifierType, queryValue]
      );

    const account = rows[0];
    if (!account || !(await bcrypt.compare(password, account.password_hash))) {
      return res.status(401).json({ error: 'Invalid login ID or password.' });
    }

    const user = await getPublicUser(account.id);
    if (!user) return res.status(401).json({ error: 'Invalid login ID or password.' });

    await log(user.role, user.id, 'LOGIN', 'user', user.id, { identifier_type: identifierType });
    setAuthCookie(res, createAuthToken(user));
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

router.post('/consent-preferences', authenticate, requireRole('patient'), async (req, res, next) => {
  const validation = validateConsentPreferences(req.body || {});
  if (!validation.valid) return res.status(400).json({ error: validation.error });
  const { preferences, language } = validation.value;

  let connection;
  let transactionOpen = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const [patientRows] = await connection.query(
      'SELECT id FROM patients WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    const patientId = patientRows[0] ? Number(patientRows[0].id) : null;
    if (!patientId) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({ error: 'Patient profile is not linked to this account.' });
    }

    const [oldRows] = await connection.query(
      `SELECT purpose_key, granted, notice_version, language FROM patient_consent_preferences
       WHERE patient_id = ? FOR UPDATE`,
      [patientId]
    );
    const oldPrefs = new Map(oldRows.map(row => [row.purpose_key, Number(row.granted) === 1]));
    const oldByPurpose = new Map(oldRows.map(row => [row.purpose_key, row]));
    const changed = CONSENT_PURPOSES.filter(purpose => {
      const previous = oldByPurpose.get(purpose);
      return !previous
        || oldPrefs.get(purpose) !== preferences[purpose]
        || previous.notice_version !== CONSENT_NOTICE_VERSION
        || (previous.language || 'en') !== language;
    });

    for (const purpose of CONSENT_PURPOSES) {
      await connection.query(
        `INSERT INTO patient_consent_preferences
         (patient_id, purpose_key, granted, notice_version, language)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           granted = VALUES(granted),
           notice_version = VALUES(notice_version),
           language = VALUES(language)`,
        [patientId, purpose, preferences[purpose] ? 1 : 0, CONSENT_NOTICE_VERSION, language]
      );
    }

    const [activeSessions] = await connection.query(
      `SELECT id FROM sessions
       WHERE patient_id = ? AND status = 'active' AND expires_at > NOW()
       FOR UPDATE`,
      [patientId]
    );

    for (const purpose of changed) {
      const granted = preferences[purpose];
      const previous = oldPrefs.get(purpose);
      const action = previous === undefined || previous === granted
        ? (granted ? 'grant' : 'deny')
        : (granted ? 'grant' : 'revoke');
      await connection.query(
        `INSERT INTO consents
         (patient_id, session_id, encounter_id, purpose_key, granted, notice_version, language, action)
         VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)`,
        [patientId, purpose, granted ? 1 : 0, CONSENT_NOTICE_VERSION, language, action]
      );

      const column = PURPOSE_COLUMNS[purpose];
      for (const session of activeSessions) {
        await connection.query(
          `UPDATE sessions SET \`${column}\` = ? WHERE id = ? AND status = 'active'`,
          [granted ? 1 : 0, session.id]
        );
        await connection.query(
          `INSERT INTO consents
           (patient_id, session_id, encounter_id, purpose_key, granted, notice_version, language, action)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
          [patientId, session.id, purpose, granted ? 1 : 0, CONSENT_NOTICE_VERSION, language, action]
        );
      }
    }

    if (changed.length) {
      await connection.query(
        `INSERT INTO audit_logs
         (actor_role, actor_id, action, resource_type, resource_id, metadata_json)
         VALUES ('patient', ?, 'PATIENT_CONSENT_PREFERENCES_SAVED', 'patient', ?, ?)`,
        [req.user.id, String(patientId), JSON.stringify({
          notice_version: CONSENT_NOTICE_VERSION,
          language,
          preferences,
          changed_purposes: changed
        })]
      );
    }

    await connection.commit();
    transactionOpen = false;
    const user = await getPublicUser(req.user.id);
    return res.json({ saved: true, user });
  } catch (err) {
    if (connection && transactionOpen) {
      try { await connection.rollback(); } catch { /* Preserve original error. */ }
    }
    return next(err);
  } finally {
    connection?.release();
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  };
  try {
    await log(req.user.role, req.user.id, 'LOGOUT', 'user', req.user.id, {});
    res.clearCookie('token', cookieOptions);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    // Logout must clear the browser credential even if the audit write fails.
    res.clearCookie('token', cookieOptions);
    return next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getPublicUser(req.user.id);
    if (!user) {
      res.clearCookie('token', { path: '/' });
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

export default router;
