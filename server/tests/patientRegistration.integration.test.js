import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../src/app.js';
import pool from '../src/config/db.js';

const shouldRun = process.env.MEDIKIOSK_DB_INTEGRATION === '1';

test('patient registration, persistent consent, repeat login and session start', {
  skip: !shouldRun
    ? 'Set MEDIKIOSK_DB_INTEGRATION=1 only after configuring a dedicated _test database.'
    : false
}, async () => {
  const expectedTestDb = process.env.MEDIKIOSK_TEST_DB?.trim();
  assert.ok(expectedTestDb, 'Set MEDIKIOSK_TEST_DB explicitly to a dedicated test database.');
  assert.match(expectedTestDb, /^[A-Za-z0-9_]+_test$/i, 'MEDIKIOSK_TEST_DB must end in _test.');
  assert.equal(process.env.DB_NAME?.trim(), expectedTestDb, 'DB_NAME must exactly match MEDIKIOSK_TEST_DB.');
  const [selectedRows] = await pool.query('SELECT current_database() AS db');
  assert.equal(selectedRows[0]?.db, expectedTestDb, 'Refusing to test against an unapproved database.');

  const email = `mk-${randomUUID()}@example.test`;
  const password = 'SyntheticRegistrationPass123';
  const agent = request.agent(app);
  let userId = null;
  let patientId = null;
  let staffLoginAuditId = null;
  const sessions = [];

  const cleanup = async () => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (staffLoginAuditId !== null) {
        await connection.query('DELETE FROM audit_logs WHERE id = ?', [staffLoginAuditId]);
      }
      if (sessions.length) {
        const marks = sessions.map(() => '?').join(',');
        for (const table of ['session_slots', 'conversation_turns', 'document_extractions', 'consents', 'red_flags']) {
          await connection.query(`DELETE FROM ${table} WHERE session_id IN (${marks})`, sessions);
        }
        await connection.query(
          `DELETE FROM audit_logs WHERE resource_type = 'session' AND resource_id IN (${marks})`,
          sessions
        );
        await connection.query(`DELETE FROM sessions WHERE id IN (${marks})`, sessions);
      }
      if (patientId !== null) {
        await connection.query('DELETE FROM patient_consent_preferences WHERE patient_id = ?', [patientId]);
        await connection.query('DELETE FROM consents WHERE patient_id = ?', [patientId]);
        await connection.query('DELETE FROM audit_logs WHERE resource_type = ? AND resource_id = ?', ['patient', String(patientId)]);
        await connection.query('DELETE FROM patients WHERE id = ?', [patientId]);
      }
      if (userId !== null) {
        await connection.query('DELETE FROM audit_logs WHERE actor_id = ?', [userId]);
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  try {
    const registration = await agent.post('/api/auth/register').send({
      display_name: 'Synthetic Integration Patient',
      date_of_birth: '1995-04-12',
      sex: 'prefer_not_to_say',
      preferred_language: 'en',
      identifier_type: 'email',
      identifier: email,
      password
    });
    assert.equal(registration.status, 201, JSON.stringify(registration.body));
    assert.equal(registration.body.user.role, 'patient');
    assert.equal(registration.body.user.hasConsentSetup, false);
    userId = Number(registration.body.user.id);
    patientId = Number(registration.body.user.patient_id);
    assert.ok(userId > 0 && patientId > 0);

    const blockedBeforeConsent = await agent.post('/api/sessions').send({ language: 'en', ayush_mode: false });
    assert.equal(blockedBeforeConsent.status, 409, 'A patient must save initial consent before starting intake.');

    const duplicate = await request(app).post('/api/auth/register').send({
      display_name: 'Another Synthetic Patient',
      date_of_birth: '1990-01-01',
      sex: 'prefer_not_to_say',
      preferred_language: 'en',
      identifier_type: 'email',
      identifier: email,
      password
    });
    assert.equal(duplicate.status, 409);

    const [storedUsers] = await pool.query(
      'SELECT password_hash, login_identifier, login_identifier_type FROM users WHERE id = ?',
      [userId]
    );
    assert.ok(storedUsers[0].password_hash !== password, 'Password must be stored as a hash.');
    assert.equal(storedUsers[0].login_identifier, email);
    assert.equal(storedUsers[0].login_identifier_type, 'email');

    const choices = { voice: true, document: false, his: false, dashboard: true };
    const saved = await agent.post('/api/auth/consent-preferences').send({
      preferences: choices,
      language: 'en',
      understood: true
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.user.hasConsentSetup, true);
    assert.deepEqual(saved.body.user.consents, choices);

    // A policy version bump must require explicit confirmation again even if
    // the four booleans themselves have not changed.
    await pool.query(
      'UPDATE patient_consent_preferences SET notice_version = ? WHERE patient_id = ?',
      ['0.9', patientId]
    );
    const staleVersion = await agent.get('/api/auth/me');
    assert.equal(staleVersion.body.user.hasConsentSetup, false);
    const renewed = await agent.post('/api/auth/consent-preferences').send({
      preferences: choices, language: 'en', understood: true
    });
    assert.equal(renewed.status, 200, JSON.stringify(renewed.body));
    assert.equal(renewed.body.user.hasConsentSetup, true);
    const [renewedHistory] = await pool.query(
      `SELECT purpose_key, action, notice_version FROM consents
       WHERE patient_id = ? AND session_id IS NULL
       ORDER BY id DESC LIMIT 4`,
      [patientId]
    );
    assert.equal(renewedHistory.length, 4);
    assert.ok(renewedHistory.every(row => row.notice_version === '1.0'));

    const started = await agent.post('/api/sessions').send({ language: 'en', ayush_mode: false });
    assert.equal(started.status, 201, JSON.stringify(started.body));
    assert.deepEqual(started.body.consents, choices);
    sessions.push(started.body.id);

    const [sessionRows] = await pool.query(
      `SELECT voice_consent, document_consent, share_his_consent, save_dashboard_consent
       FROM sessions WHERE id = ?`,
      [started.body.id]
    );
    assert.equal(Number(sessionRows[0].voice_consent), 1);
    assert.equal(Number(sessionRows[0].document_consent), 0);
    assert.equal(Number(sessionRows[0].share_his_consent), 0);
    assert.equal(Number(sessionRows[0].save_dashboard_consent), 1);

    const secondLogin = await request(app).post('/api/auth/login').send({
      identifier_type: 'email', identifier: email, password
    });
    assert.equal(secondLogin.status, 200, JSON.stringify(secondLogin.body));
    assert.equal(secondLogin.body.user.hasConsentSetup, true);
    assert.deepEqual(secondLogin.body.user.consents, choices);

    const secondAgent = request.agent(app);
    const loginAgain = await secondAgent.post('/api/auth/login').send({
      identifier_type: 'email', identifier: email, password
    });
    assert.equal(loginAgain.status, 200);
    const secondSession = await secondAgent.post('/api/sessions').send({ language: 'en', ayush_mode: false });
    assert.equal(secondSession.status, 201, JSON.stringify(secondSession.body));
    sessions.push(secondSession.body.id);
    assert.deepEqual(secondSession.body.consents, choices);

    const changedChoices = { ...choices, voice: false, document: true };
    const updatedPreferences = await agent.post('/api/auth/consent-preferences').send({
      preferences: changedChoices, language: 'en', understood: true
    });
    assert.equal(updatedPreferences.status, 200, JSON.stringify(updatedPreferences.body));
    for (const sessionId of [started.body.id, secondSession.body.id]) {
      const [currentFlags] = await pool.query(
        `SELECT voice_consent, document_consent FROM sessions WHERE id = ?`,
        [sessionId]
      );
      assert.equal(Number(currentFlags[0].voice_consent), 0);
      assert.equal(Number(currentFlags[0].document_consent), 1);
    }
    const afterChange = await agent.post('/api/sessions').send({ language: 'en', ayush_mode: false });
    assert.equal(afterChange.status, 201, JSON.stringify(afterChange.body));
    sessions.push(afterChange.body.id);
    assert.deepEqual(afterChange.body.consents, changedChoices);

    // Verify staff login and track only the audit entry created by this test.
    const [auditMarkerRows] = await pool.query(
      'SELECT COALESCE(MAX(id), 0) AS id FROM audit_logs'
    );
    const auditIdBeforeStaffLogin = Number(auditMarkerRows[0].id);

    const staffLogin = await request(app).post('/api/auth/login').send({
      identifier_type: 'username', identifier: 'doctor', password: 'Doctor@123'
    });

    assert.equal(staffLogin.status, 200, JSON.stringify(staffLogin.body));
    assert.equal(staffLogin.body.user.role, 'doctor');

    const staffId = Number(staffLogin.body.user.id);
    const [staffAuditRows] = await pool.query(
      `SELECT id FROM audit_logs
       WHERE id > ?
         AND actor_id = ?
         AND action = 'LOGIN'
         AND resource_type = 'user'
         AND resource_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [auditIdBeforeStaffLogin, staffId, String(staffId)]
    );

    assert.equal(
      staffAuditRows.length,
      1,
      'Successful staff login should create a matching audit entry.'
    );
    staffLoginAuditId = Number(staffAuditRows[0].id);
  } finally {
    await cleanup();
  }
});

test.after(async () => {
  await pool.end();
});
