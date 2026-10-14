import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from '../src/config/db.js';
import { expireSessionIfDue } from '../src/services/sessionExpiryService.js';

test(
  'expired session cleanup removes temporary data and retains audit records',
  { skip: process.env.MEDIKIOSK_DB_INTEGRATION !== '1' },
  async () => {
    const sessionId = randomUUID();

    const cleanup = async () => {
      await pool.query('DELETE FROM session_slots WHERE session_id = ?', [sessionId]);
      await pool.query('DELETE FROM conversation_turns WHERE session_id = ?', [sessionId]);
      await pool.query('DELETE FROM document_extractions WHERE session_id = ?', [sessionId]);
      await pool.query('DELETE FROM consents WHERE session_id = ?', [sessionId]);
      await pool.query('DELETE FROM red_flags WHERE session_id = ?', [sessionId]);
      await pool.query(
        "DELETE FROM audit_logs WHERE resource_type = 'session' AND resource_id = ?",
        [sessionId]
      );
      await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId]);
    };

    try {
      await pool.query(
        `INSERT INTO sessions
         (id, language, status, expires_at,
          voice_consent, document_consent, share_his_consent, save_dashboard_consent)
         VALUES (?, 'en', 'active', DATE_SUB(NOW(), INTERVAL 1 MINUTE), 1, 1, 1, 1)`,
        [sessionId]
      );

      await pool.query(
        `INSERT INTO session_slots (session_id, slot_id, value, source)
         VALUES (?, 'expiry_test_slot', 'synthetic answer', 'touch')`,
        [sessionId]
      );

      await pool.query(
        `INSERT INTO conversation_turns (session_id, node_id, role, text, source)
         VALUES (?, 'expiry_test_node', 'patient', 'synthetic transcript', 'text')`,
        [sessionId]
      );

      await pool.query(
        `INSERT INTO document_extractions (session_id, doc_key, doc_type)
         VALUES (?, 'expiry-test-doc', 'synthetic_test_document')`,
        [sessionId]
      );

      await pool.query(
        `INSERT INTO consents (session_id, purpose_key, granted, action)
         VALUES (?, 'his', 1, 'grant')`,
        [sessionId]
      );

      await pool.query(
        `INSERT INTO red_flags (session_id, rule_id, level, reason, alert_id)
         VALUES (?, 'EXPIRY_TEST', 'warning', 'Synthetic expiry test', ?)`,
        [sessionId, randomUUID()]
      );

      assert.equal(await expireSessionIfDue(sessionId), true);
      assert.equal(
        await expireSessionIfDue(sessionId),
        false,
        'Repeating cleanup must not add a second expiry event'
      );

      for (const table of [
        'session_slots',
        'conversation_turns',
        'document_extractions'
      ]) {
        const [rows] = await pool.query(
          `SELECT COUNT(*) AS total FROM ${table} WHERE session_id = ?`,
          [sessionId]
        );

        assert.equal(Number(rows[0].total), 0, `${table} must be removed`);
      }

      const [sessions] = await pool.query(
        `SELECT status, voice_consent, document_consent,
                share_his_consent, save_dashboard_consent
         FROM sessions WHERE id = ?`,
        [sessionId]
      );

      assert.equal(sessions[0]?.status, 'expired');

      for (const flag of [
        'voice_consent',
        'document_consent',
        'share_his_consent',
        'save_dashboard_consent'
      ]) {
        assert.equal(Number(sessions[0][flag]), 0, `${flag} must be reset`);
      }

      const [consents] = await pool.query(
        'SELECT granted, action FROM consents WHERE session_id = ?',
        [sessionId]
      );
      assert.equal(consents.length, 1);
      assert.equal(Number(consents[0].granted), 1);
      assert.equal(consents[0].action, 'grant');

      const [flags] = await pool.query(
        'SELECT COUNT(*) AS total FROM red_flags WHERE session_id = ?',
        [sessionId]
      );
      assert.equal(Number(flags[0].total), 1);

      const [audit] = await pool.query(
        `SELECT id FROM audit_logs
         WHERE action = 'SESSION_EXPIRED'
           AND resource_type = 'session'
           AND resource_id = ?`,
        [sessionId]
      );
      assert.equal(audit.length, 1);

      console.log(
        'PASS: expiry cleanup removes temporary data, resets flags, retains consent/red-flag records, and audits once.'
      );
    } finally {
      await cleanup();
    }
  }
);

test.after(async () => {
  await pool.end();
});