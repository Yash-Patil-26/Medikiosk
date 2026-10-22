import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test(
  'encounter and mock-HIS consent integration',
  { skip: process.env.MEDIKIOSK_DB_INTEGRATION !== '1', timeout: 30000 },
  async () => {
    await import('dotenv/config');

    const { default: pool } = await import('../src/config/db.js');
    const { default: app } = await import('../src/app.js');
    const request = (await import('supertest')).default;
    const jwt = (await import('jsonwebtoken')).default;
    const { getJwtSecret } = await import('../src/config/jwt.js');
const { createOpaqueToken } = await import('../src/utils/opaqueToken.js');

    const sessions = [];
    const encounters = [];
    const redFlagIds = [];
const sessionTokens = new Map();
    function createApiRequest(method, path) {
      const req = request(app)[method](path);

      const attachForSession = sessionId => {
        const token = sessionId && sessionTokens.get(sessionId);
        if (!token) return;

        req.set('X-Kiosk-Token', token);
        req.set('X-Kiosk-Session-Id', sessionId);
      };

      const match = path.match(
        /\/(?:sessions|dialogue)\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/|$)/i
      );

      if (match) attachForSession(match[1]);

      const originalSend = req.send.bind(req);
      req.send = function (body, ...args) {
        if (body && typeof body === 'object') {
          attachForSession(body.session_id);
        }

        return originalSend(body, ...args);
      };

      if (typeof req.field === 'function') {
        const originalField = req.field.bind(req);
        req.field = function (name, value, ...args) {
          if (name === 'session_id') attachForSession(value);
          return originalField(name, value, ...args);
        };
      }

      return req;
    }

    const api = {
      get: path => createApiRequest('get', path),
      post: path => createApiRequest('post', path),
      patch: path => createApiRequest('patch', path),
      delete: path => createApiRequest('delete', path)
    };

    async function cleanup() {
      if (!sessions.length) return;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const marks = sessions.map(() => '?').join(',');

        const [linked] = await connection.query(
          `SELECT id FROM encounters WHERE session_id IN (${marks})`,
          sessions
        );

        await connection.query(
          `DELETE FROM audit_logs
           WHERE resource_type = 'session' AND resource_id IN (${marks})`,
          sessions
        );

        if (redFlagIds.length) {
          const flagMarks = redFlagIds.map(() => '?').join(',');
          await connection.query(
            `DELETE FROM audit_logs
             WHERE resource_type = 'red_flag' AND resource_id IN (${flagMarks})`,
            redFlagIds.map(String)
          );
        }

        const ids = [...new Set([
          ...encounters,
          ...linked.map(row => Number(row.id))
        ])].filter(id => Number.isSafeInteger(id) && id > 0);

        if (ids.length) {
          const idMarks = ids.map(() => '?').join(',');

          await connection.query(
            `DELETE FROM his_records WHERE encounter_id IN (${idMarks})`,
            ids
          );
          await connection.query(
            `DELETE FROM audit_logs
             WHERE resource_type = 'encounter'
               AND resource_id IN (${idMarks})`,
            ids.map(String)
          );
          await connection.query(
            `DELETE FROM encounters WHERE id IN (${idMarks})`,
            ids
          );
        }

        await connection.query(
          `DELETE FROM red_flags WHERE session_id IN (${marks})`,
          sessions
        );
        // Test teardown may remove only consent rows created for these
        // unique synthetic sessions; production purge retains them.
        await connection.query(
          `DELETE FROM consents WHERE session_id IN (${marks})`,
          sessions
        );

        await connection.query(
          `DELETE FROM sessions WHERE id IN (${marks})`,
          sessions
        );

        await connection.commit();
      } catch (error) {
        try {
          await connection.rollback();
        } catch {
          // Preserve the cleanup error.
        }
        console.error('Test fixture cleanup failed. Session IDs:', sessions);
        throw error;
      } finally {
        connection.release();
      }
    }

    try {
      const [dbRows] = await pool.query('SELECT DATABASE() AS db');
      assert.equal(
        dbRows[0].db,
        process.env.MEDIKIOSK_TEST_DB || 'medikiosk',
        'Refusing to run against an unexpected database'
      );

      const [doctors] = await pool.query(
        `SELECT id, role FROM users
         WHERE role = 'doctor' ORDER BY id LIMIT 1`
      );
      assert.ok(doctors[0], 'A doctor account is required');

      const token = jwt.sign(
        { id: Number(doctors[0].id), role: 'doctor' },
        getJwtSecret(),
        { expiresIn: '5m' }
      );
      const auth = `Bearer ${token}`;

      const unauthenticated = await api.post('/api/his/records').send({});
      assert.equal(unauthenticated.status, 401);

      const missingId = await api.post('/api/encounters').send({});
      assert.equal(missingId.status, 401);

      const unknownSession = await api.post('/api/encounters').send({
        session_id: randomUUID(),
        patient_id: null
      });
      assert.equal(unknownSession.status, 401);

      async function seedSession(shareConsent, patientId = null) {
        const id = randomUUID();
        sessions.push(id);

        const credential = createOpaqueToken();
        sessionTokens.set(id, credential.token);

        await pool.query(
          `INSERT INTO sessions
            (id, patient_id, language, ayush_mode, status,
             share_his_consent, document_consent, voice_consent,
             save_dashboard_consent, expires_at, kiosk_token_hash)
           VALUES (?, ?, 'en', 0, 'active', ?, 0, 0, 0, ?, ?)`,
          [
            id,
            patientId,
            shareConsent ? 1 : 0,
            new Date(Date.now() + 3600000),
            credential.tokenHash
          ]
        );

        // Seed the corresponding authoritative consent event.
        await pool.query(
          `INSERT INTO consents
           (patient_id, session_id, encounter_id, purpose_key,
            granted, language, action)
           VALUES (?, ?, NULL, 'his', ?, 'en', ?)`,
          [
            patientId,
            id,
            shareConsent ? 1 : 0,
            shareConsent ? 'grant' : 'revoke'
          ]
        );

        return id;
      }

      async function createEncounter(sessionId, patientId = null) {
        const response = await api.post('/api/encounters').send({
          session_id: sessionId,
          patient_id: patientId,
          language: 'en',
          ayush_mode: false
        });
        if (response.body?.id) encounters.push(Number(response.body.id));
        return response;
      }

      async function signEncounter(id) {
        return api.post(`/api/encounters/${id}/sign`)
          .set('Authorization', auth)
          .send({});
      }

      async function hisCount(id) {
        const [rows] = await pool.query(
          'SELECT COUNT(*) AS total FROM his_records WHERE encounter_id = ?',
          [id]
        );
        return Number(rows[0].total);
      }

      // A patient identifier must match the session's patient.
      const [demoPatients] = await pool.query(
        'SELECT id FROM patients ORDER BY id LIMIT 1'
      );
      assert.ok(demoPatients[0], 'A seeded synthetic demo patient is required');

      const triagePatientId = Number(demoPatients[0].id);
      const noConsentSession = await seedSession(false, triagePatientId);

      const mismatch = await createEncounter(
        noConsentSession,
        triagePatientId + 1000000
      );
      assert.equal(mismatch.status, 403);

      const initialQuestion = await api.get(
        `/api/dialogue/${noConsentSession}/next`
      );
      assert.equal(initialQuestion.status, 200);
      assert.equal(initialQuestion.body.type, 'complaint_selection');

      const arbitraryQuestion = await api.post(
        `/api/dialogue/${noConsentSession}/answer`
      ).send({
        node_id: 'made_up_node',
        slot_id: 'made_up_slot',
        value: 'anything'
      });
      assert.equal(arbitraryQuestion.status, 409);

      const invalidComplaint = await api.post(
        `/api/dialogue/${noConsentSession}/answer`
      ).send({
        node_id: 'complaint_selection',
        slot_id: 'complaint',
        value: 'invalid-complaint',
        source: 'touch',
        confirmed_by: 'touch'
      });
      assert.equal(invalidComplaint.status, 400);

      const savedComplaint = await api.post(
        `/api/dialogue/${noConsentSession}/answer`
      ).send({
        node_id: 'complaint_selection',
        slot_id: 'complaint',
        value: 'chest_discomfort',
        source: 'touch',
        raw_text: 'Chest Discomfort',
        confidence: 1,
        confirmed_by: 'touch'
      });
      assert.equal(savedComplaint.status, 200);

      const firstQuestion = await api.get(
        `/api/dialogue/${noConsentSession}/next`
      );
      assert.equal(firstQuestion.body.id, 'cp_site');

      const skippedQuestion = await api.post(
        `/api/dialogue/${noConsentSession}/answer`
      ).send({
        node_id: 'cp_site',
        slot_id: 'unrelated_slot',
        value: 'center',
        source: 'touch',
        confirmed_by: 'touch'
      });
      assert.equal(skippedQuestion.status, 409);

      const savedSite = await api.post(
        `/api/dialogue/${noConsentSession}/answer`
      ).send({
        node_id: 'cp_site',
        slot_id: 'chest_site',
        value: 'center',
        source: 'touch',
        raw_text: 'Center of chest',
        confidence: 1,
        confirmed_by: 'touch'
      });
      assert.equal(savedSite.status, 200);

      const duplicateSite = await api.post(
        `/api/dialogue/${noConsentSession}/answer`
      ).send({
        node_id: 'cp_site',
        slot_id: 'chest_site',
        value: 'left',
        source: 'touch',
        raw_text: 'Left side',
        confidence: 1,
        confirmed_by: 'touch'
      });
      assert.equal(duplicateSite.status, 409);

      // Exercise multiselect through the actual HTTP route and MySQL.
      const historySession = await seedSession(false);

      const sendAnswer = (nodeId, slotId, value, rawText = String(value)) =>
        api.post(`/api/dialogue/${historySession}/answer`).send({
          node_id: nodeId,
          slot_id: slotId,
          value,
          source: 'touch',
          raw_text: rawText,
          confidence: 1,
          confirmed_by: 'touch'
        });

      const complaintSaved = await sendAnswer(
        'complaint_selection', 'complaint', 'cough', 'Cough'
      );
      assert.equal(complaintSaved.status, 200);

      // Follow the general question graph in order before testing multiselect.
      const onsetSaved = await sendAnswer(
        'general_onset', 'onset_type', 'today', 'Today'
      );
      assert.equal(
        onsetSaved.status, 200,
        `Onset answer failed: ${JSON.stringify(onsetSaved.body)}`
      );

      const durationSaved = await sendAnswer(
        'general_duration', 'duration', 'constant', 'Constant'
      );
      assert.equal(
        durationSaved.status, 200,
        `Duration answer failed: ${JSON.stringify(durationSaved.body)}`
      );

      const characterSaved = await sendAnswer(
        'general_character', 'character', 'persistent cough', 'Persistent cough'
      );
      assert.equal(
        characterSaved.status, 200,
        `Character answer failed: ${JSON.stringify(characterSaved.body)}`
      );

      const severitySaved = await sendAnswer(
        'general_severity', 'severity', '3', '3'
      );
      assert.equal(
        severitySaved.status, 200,
        `Severity answer failed: ${JSON.stringify(severitySaved.body)}`
      );

      const allergySaved = await sendAnswer(
        'general_allergies', 'allergies', 'none', 'No known allergies'
      );
      assert.equal(allergySaved.status, 200);

      const medicinesSaved = await sendAnswer(
        'general_medicines', 'current_medicines', 'none', 'No current medicines'
      );
      assert.equal(medicinesSaved.status, 200);

      const historyQuestion = await api.get(
        `/api/dialogue/${historySession}/next`
      );
      assert.equal(historyQuestion.body.id, 'general_past_history');

      const historySaved = await sendAnswer(
        'general_past_history',
        'past_medical_history',
        ['diabetes', 'asthma'],
        'Diabetes, Asthma'
      );
      assert.equal(
        historySaved.status, 200,
        `Multiselect save failed: ${JSON.stringify(historySaved.body)}`
      );

      const [historyRows] = await pool.query(
        `SELECT value FROM session_slots
         WHERE session_id = ? AND slot_id = 'past_medical_history'`,
        [historySession]
      );
      assert.equal(historyRows.length, 1);
      assert.deepEqual(
        JSON.parse(historyRows[0].value),
        ['diabetes', 'asthma']
      );

      // Signing without sharing consent must not write to mock HIS.
      const deniedCreate = await createEncounter(
        noConsentSession,
        triagePatientId
      );
      assert.equal(
        deniedCreate.status, 201,
        `Encounter creation failed: ${JSON.stringify(deniedCreate.body)}`
      );
      const deniedId = Number(deniedCreate.body.id);

      const deniedSign = await signEncounter(deniedId);
      assert.equal(
        deniedSign.status, 200,
        `Sign-off failed: ${JSON.stringify(deniedSign.body)}`
      );
      assert.equal(deniedSign.body.his_status, 'not_shared');
      assert.equal(await hisCount(deniedId), 0);

      const deniedReceipt = await api.post('/api/his/records')
        .set('Authorization', auth)
        .send({ encounter_id: deniedId, bundle: deniedSign.body.fhir });
      assert.equal(deniedReceipt.status, 403);
      assert.equal(await hisCount(deniedId), 0);

      // A later revocation must override an earlier grant.
      const revokedSession = await seedSession(true, triagePatientId);

      const [initialGrantRows] = await pool.query(
        `SELECT id FROM consents
         WHERE session_id = ? AND purpose_key = 'his'
         ORDER BY id DESC LIMIT 1`,
        [revokedSession]
      );
      assert.ok(initialGrantRows[0], 'The grant event should be seeded');

      const revokeResponse = await api.post(
        `/api/consents/${initialGrantRows[0].id}/revoke`
      ).send({ session_id: revokedSession });

      assert.equal(
        revokeResponse.status,
        200,
        `Consent revocation failed: ${JSON.stringify(revokeResponse.body)}`
      );

      const revokedCreate = await createEncounter(
        revokedSession,
        triagePatientId
      );
      assert.equal(
        revokedCreate.status,
        201,
        `Encounter creation failed: ${JSON.stringify(revokedCreate.body)}`
      );

      const revokedId = Number(revokedCreate.body.id);
      const revokedSign = await signEncounter(revokedId);

      assert.equal(
        revokedSign.status,
        200,
        `Sign-off failed: ${JSON.stringify(revokedSign.body)}`
      );
      assert.equal(revokedSign.body.his_status, 'not_shared');
      assert.equal(await hisCount(revokedId), 0);

      const [latestRevocation] = await pool.query(
        `SELECT granted, action FROM consents
         WHERE session_id = ? AND purpose_key = 'his'
         ORDER BY id DESC LIMIT 1`,
        [revokedSession]
      );
      assert.equal(Number(latestRevocation[0].granted), 0);
      assert.equal(latestRevocation[0].action, 'revoke');

      // With consent, sign-off should create exactly one mock receipt.
      const consentSession = await seedSession(true, triagePatientId);
      const allowedCreate = await createEncounter(
        consentSession,
        triagePatientId
      );
      assert.equal(
        allowedCreate.status, 201,
        `Encounter creation failed: ${JSON.stringify(allowedCreate.body)}`
      );
      const allowedId = Number(allowedCreate.body.id);

      const [alertInsert] = await pool.query(
        `INSERT INTO red_flags
          (session_id, rule_id, level, reason, alert_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          noConsentSession,
          'TEST_TRIAGE_LINK',
          'warning',
          'Synthetic integration test alert',
          randomUUID()
        ]
      );
      redFlagIds.push(Number(alertInsert.insertId));

      const alertList = await api.get('/api/triage/alerts')
        .set('Authorization', auth);
      assert.equal(
        alertList.status,
        200,
        `Triage alert list failed: ${JSON.stringify(alertList.body)}`
      );

      const linkedAlertRows = alertList.body.filter(
        row => Number(row.id) === Number(alertInsert.insertId)
      );

      assert.equal(
        linkedAlertRows.length,
        1,
        'One alert should produce only one row, even when the patient has multiple encounters'
      );
      assert.equal(Number(linkedAlertRows[0].encounter_id), deniedId);

      const acknowledge = await api.post(
        `/api/triage/alerts/${alertInsert.insertId}/acknowledge`
      ).set('Authorization', auth).send({});
      assert.equal(
        acknowledge.status,
        200,
        `Alert acknowledgment failed: ${JSON.stringify(acknowledge.body)}`
      );

      const acknowledgeAgain = await api.post(
        `/api/triage/alerts/${alertInsert.insertId}/acknowledge`
      ).set('Authorization', auth).send({});
      assert.equal(acknowledgeAgain.status, 409);

      // Purge removes temporary data, retains audit-relevant records,
      // and remains safe to retry.
      const purgeSessionId = await seedSession(false);

      await pool.query(
        `INSERT INTO session_slots
         (session_id, slot_id, value, source, raw_text, confidence, confirmed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          purgeSessionId, 'purge_test_slot', 'synthetic answer',
          'touch', 'synthetic answer', 1, 'touch'
        ]
      );

      await pool.query(
        `INSERT INTO conversation_turns
         (session_id, node_id, role, text, source)
         VALUES (?, ?, ?, ?, ?)`,
        [
          purgeSessionId, 'purge_test_node',
          'patient', 'synthetic transcript', 'text'
        ]
      );

      await pool.query(
        `INSERT INTO document_extractions
         (session_id, doc_key, doc_type, provider,
          diagnoses_json, medications_json, labs_json, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purgeSessionId, 'purge-test-doc', 'medical_document',
          'Synthetic integration test', '[]', '[]', '[]', 0.5
        ]
      );

      await pool.query(
        `INSERT INTO consents (session_id, purpose_key, granted, action)
         VALUES (?, ?, ?, ?)`,
        [purgeSessionId, 'his', 0, 'revoke']
      );

      const [purgeFlagInsert] = await pool.query(
        `INSERT INTO red_flags
         (session_id, rule_id, level, reason, alert_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          purgeSessionId, 'PURGE_TEST', 'warning',
          'Synthetic purge retention test', randomUUID()
        ]
      );
      redFlagIds.push(Number(purgeFlagInsert.insertId));

      const purgeResponse = await api.delete(
        `/api/sessions/${purgeSessionId}`
      );

      assert.equal(
        purgeResponse.status, 200,
        `Purge failed: ${JSON.stringify(purgeResponse.body)}`
      );
      assert.equal(purgeResponse.body.purged, true);
      assert.equal(purgeResponse.body.already_purged, false);
      assert.ok(Array.isArray(purgeResponse.body.items));
      assert.ok(Array.isArray(purgeResponse.body.retained));

      for (const table of [
        'session_slots',
        'conversation_turns',
        'document_extractions'
      ]) {
        const [remaining] = await pool.query(
          `SELECT COUNT(*) AS total FROM ${table} WHERE session_id = ?`,
          [purgeSessionId]
        );

        assert.equal(
          Number(remaining[0].total), 0,
          `${table} should be cleared during purge`
        );
      }

      const [purgedSessionRows] = await pool.query(
        `SELECT status, voice_consent, document_consent,
                share_his_consent, save_dashboard_consent
         FROM sessions WHERE id = ?`,
        [purgeSessionId]
      );

      assert.equal(purgedSessionRows[0]?.status, 'purged');

      for (const flag of [
        'voice_consent',
        'document_consent',
        'share_his_consent',
        'save_dashboard_consent'
      ]) {
        assert.equal(Number(purgedSessionRows[0][flag]), 0);
      }

      const [retainedConsents] = await pool.query(
        'SELECT COUNT(*) AS total FROM consents WHERE session_id = ?',
        [purgeSessionId]
      );
      assert.equal(Number(retainedConsents[0].total), 2);

      const [retainedFlags] = await pool.query(
        'SELECT COUNT(*) AS total FROM red_flags WHERE session_id = ?',
        [purgeSessionId]
      );
      assert.equal(Number(retainedFlags[0].total), 1);

      const [purgeAuditBeforeRetry] = await pool.query(
        `SELECT id FROM audit_logs
         WHERE action = 'SESSION_PURGED'
           AND resource_type = 'session'
           AND resource_id = ?`,
        [purgeSessionId]
      );
      assert.equal(purgeAuditBeforeRetry.length, 1);

      const purgeRetry = await api.delete(
        `/api/sessions/${purgeSessionId}`
      );
      assert.equal(
        purgeRetry.status, 200,
        `Purge retry failed: ${JSON.stringify(purgeRetry.body)}`
      );
      assert.equal(purgeRetry.body.purged, true);
      assert.equal(purgeRetry.body.already_purged, true);

      const [purgeAuditAfterRetry] = await pool.query(
        `SELECT id FROM audit_logs
         WHERE action = 'SESSION_PURGED'
           AND resource_type = 'session'
           AND resource_id = ?`,
        [purgeSessionId]
      );
      assert.equal(
        purgeAuditAfterRetry.length, 1,
        'Purge retry must not duplicate the audit event'
      );
      const purgeBeforeSign = await api.delete(
        `/api/sessions/${consentSession}`
      );
      assert.equal(
        purgeBeforeSign.status,
        200,
        `Pre-sign purge failed: ${JSON.stringify(purgeBeforeSign.body)}`
      );
      assert.equal(purgeBeforeSign.body.purged, true);

      const [purgedConsentSession] = await pool.query(
        `SELECT status, share_his_consent
         FROM sessions WHERE id = ?`,
        [consentSession]
      );
      assert.equal(purgedConsentSession[0].status, 'purged');
      assert.equal(Number(purgedConsentSession[0].share_his_consent), 0);

      const [grantAfterPurge] = await pool.query(
        `SELECT granted, action FROM consents
         WHERE session_id = ? AND purpose_key = 'his'
         ORDER BY id DESC LIMIT 1`,
        [consentSession]
      );
      assert.equal(Number(grantAfterPurge[0].granted), 1);
      assert.equal(grantAfterPurge[0].action, 'grant');

      const allowedSign = await signEncounter(allowedId);
      assert.equal(
        allowedSign.status, 200,
        `Sign-off failed: ${JSON.stringify(allowedSign.body)}`
      );
      assert.equal(allowedSign.body.his_status, 'sent');
      assert.equal(await hisCount(allowedId), 1);

      const [saved] = await pool.query(
        'SELECT session_id, status, his_status FROM encounters WHERE id = ?',
        [allowedId]
      );
      assert.equal(saved[0]?.session_id, consentSession);
      assert.equal(saved[0]?.status, 'signed');
      assert.equal(saved[0]?.his_status, 'sent');

      // The receiver must reject altered bundles and accept an exact retry.
      const alteredBundle = {
        ...allowedSign.body.fhir,
        id: randomUUID()
      };

      const altered = await api.post('/api/his/records')
        .set('Authorization', auth)
        .send({ encounter_id: allowedId, bundle: alteredBundle });
      assert.equal(altered.status, 400);
      assert.equal(await hisCount(allowedId), 1);

      const retry = await api.post('/api/his/records')
        .set('Authorization', auth)
        .send({
          encounter_id: allowedId,
          bundle: allowedSign.body.fhir
        });
      assert.equal(
        retry.status, 200,
        `Receipt retry failed: ${JSON.stringify(retry.body)}`
      );
      assert.equal(retry.body.already_received, true);
      assert.equal(await hisCount(allowedId), 1);

      console.log(
        'PASS: session validation, patient matching, HIS consent enforcement, ' +
        'FHIR integrity, idempotent receipt, latest consent decisions, and post-purge sign-off.'
      );
    } finally {
      try {
        await cleanup();
      } finally {
        await pool.end();
      }
    }
  }
);
