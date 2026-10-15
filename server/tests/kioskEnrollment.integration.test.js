import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { hashOpaqueToken } from '../src/utils/opaqueToken.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));

test(
  'kiosk enrollment token is single-use and creates an authorized session',
  {
    skip: process.env.MEDIKIOSK_DB_INTEGRATION !== '1',
    timeout: 30000
  },
  async () => {
    dotenv.config({ path: path.resolve(testDirectory, '../.env') });

    const { default: pool } = await import('../src/config/db.js');
    const { default: app } = await import('../src/app.js');
    const request = (await import('supertest')).default;

    let patientId = null;
    let sessionId = null;

    try {
      // Create a synthetic patient using the actual HTTP route.
      const patientResponse = await request(app)
        .post('/api/patients')
        .send({ preferred_language: 'en' });

      assert.equal(
        patientResponse.status,
        201,
        `Patient creation failed: ${JSON.stringify(patientResponse.body)}`
      );

      patientId = Number(patientResponse.body.id);
      const enrollmentToken = patientResponse.body.enrollmentToken;

      assert.ok(Number.isSafeInteger(patientId) && patientId > 0);
      assert.equal(typeof enrollmentToken, 'string');
      assert.ok(enrollmentToken.length >= 32);
      assert.equal(typeof patientResponse.body.syntheticId, 'string');

      const [patientRows] = await pool.query(
        `SELECT kiosk_enrollment_token_hash
         FROM patients
         WHERE id = ?`,
        [patientId]
      );

      assert.equal(patientRows.length, 1);
      assert.equal(
        patientRows[0].kiosk_enrollment_token_hash,
        hashOpaqueToken(enrollmentToken),
        'Only the enrollment token hash should be stored'
      );

      // Enrollment authorization must be required.
      const missingEnrollment = await request(app)
        .post('/api/sessions')
        .send({ patient_id: patientId, language: 'en' });

      assert.equal(missingEnrollment.status, 401);

      // The real HTTP route consumes the one-time enrollment token.
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('X-Kiosk-Enrollment-Token', enrollmentToken)
        .send({
          patient_id: patientId,
          language: 'en',
          ayush_mode: false
        });

      assert.equal(
        sessionResponse.status,
        201,
        `Session creation failed: ${JSON.stringify(sessionResponse.body)}`
      );

      sessionId = sessionResponse.body.id;
      const kioskToken = sessionResponse.body.kioskToken;

      assert.equal(typeof sessionId, 'string');
      assert.equal(typeof kioskToken, 'string');
      assert.ok(kioskToken.length >= 32);

      const [consumedPatientRows] = await pool.query(
        `SELECT kiosk_enrollment_token_hash
         FROM patients
         WHERE id = ?`,
        [patientId]
      );

      assert.equal(
        consumedPatientRows[0].kiosk_enrollment_token_hash,
        null,
        'The enrollment token must be consumed'
      );

      const [sessionRows] = await pool.query(
        `SELECT kiosk_token_hash
         FROM sessions
         WHERE id = ?`,
        [sessionId]
      );

      assert.equal(sessionRows.length, 1);
      assert.equal(
        sessionRows[0].kiosk_token_hash,
        hashOpaqueToken(kioskToken),
        'Only the session token hash should be stored'
      );

      // Replaying the consumed enrollment token must fail.
      const replay = await request(app)
        .post('/api/sessions')
        .set('X-Kiosk-Enrollment-Token', enrollmentToken)
        .send({ patient_id: patientId, language: 'en' });

      assert.equal(replay.status, 401);

      // The new session must reject absent and incorrect credentials.
      const missingSessionToken = await request(app)
        .get(`/api/sessions/${sessionId}`);

      assert.equal(missingSessionToken.status, 401);

      const incorrectSessionToken = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('X-Kiosk-Token', 'incorrect-token-for-integration-test-123456');

      assert.equal(incorrectSessionToken.status, 401);

      // The correct session token must authorize reads without exposing
      // the stored hash or the internal active-state calculation.
      const authorizedRead = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('X-Kiosk-Token', kioskToken);

      assert.equal(
        authorizedRead.status,
        200,
        `Authorized session read failed: ${JSON.stringify(authorizedRead.body)}`
      );

      assert.equal(authorizedRead.body.id, sessionId);
      assert.equal(
        Object.hasOwn(authorizedRead.body, 'kiosk_token_hash'),
        false
      );
      assert.equal(
        Object.hasOwn(authorizedRead.body, '_session_active'),
        false
      );

      // Purge must work with the valid token and remain safe to retry.
      const purge = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('X-Kiosk-Token', kioskToken);

      assert.equal(
        purge.status,
        200,
        `Purge failed: ${JSON.stringify(purge.body)}`
      );
      assert.equal(purge.body.purged, true);
      assert.ok(Array.isArray(purge.body.items));
      assert.ok(Array.isArray(purge.body.retained));

      const purgeRetry = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('X-Kiosk-Token', kioskToken);

      assert.equal(
        purgeRetry.status,
        200,
        `Purge retry failed: ${JSON.stringify(purgeRetry.body)}`
      );
      assert.equal(purgeRetry.body.purged, true);
      assert.equal(purgeRetry.body.already_purged, true);

      console.log(
        'PASS: enrollment issuance, token hashing, one-time use, session authorization, response sanitization, and purge retry.'
      );
    } finally {
      // Remove only records created by this synthetic test patient.
      if (Number.isSafeInteger(patientId) && patientId > 0) {
        const connection = await pool.getConnection();

        try {
          await connection.beginTransaction();

          await connection.query(
            `DELETE FROM audit_logs
             WHERE (resource_type = 'patient' AND resource_id = ?)
                OR (
                  resource_type = 'session'
                  AND resource_id IN (
                    SELECT id FROM sessions WHERE patient_id = ?
                  )
                )`,
            [String(patientId), patientId]
          );

          await connection.query(
            `DELETE FROM consents
             WHERE session_id IN (
               SELECT id FROM sessions WHERE patient_id = ?
             )`,
            [patientId]
          );

          await connection.query(
            'DELETE FROM sessions WHERE patient_id = ?',
            [patientId]
          );

          await connection.query(
            'DELETE FROM patients WHERE id = ?',
            [patientId]
          );

          await connection.commit();
        } catch (error) {
          try {
            await connection.rollback();
          } catch {
            // Preserve the original cleanup error.
          }

          throw error;
        } finally {
          connection.release();
        }
      }

      await pool.end();
    }
  }
);
