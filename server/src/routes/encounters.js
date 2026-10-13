import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { buildSummary } from '../services/summaryService.js';
import { buildFhirBundle } from '../services/fhirBundleBuilder.js';
import { evaluateRedFlags } from '../services/redFlagService.js';
import { log } from '../utils/audit.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Safely parse a value that may already be an object (mysql2 JSON column) or a string
function safeJson(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

// Create encounter from session
router.post('/', async (req, res, next) => {
  try {
    const { patient_id, session_id, language, ayush_mode } = req.body;
    const token_no = `T${String(Date.now()).slice(-4)}`;

    const [slots] = await pool.query('SELECT * FROM session_slots WHERE session_id = ?', [session_id]);
    const [docs] = await pool.query('SELECT * FROM document_extractions WHERE session_id = ?', [session_id]);
    const slotMap = Object.fromEntries(
      slots.map(s => [s.slot_id, { value: s.value, source: s.source, confirmed_by: s.confirmed_by }])
    );
    const summary = buildSummary(slotMap, docs);

    const flags = evaluateRedFlags(slotMap);
    const flagLevel = flags.length > 0
      ? (flags.some(f => f.level === 'critical') ? 'critical' : 'warning')
      : 'none';

    const [result] = await pool.query(
      'INSERT INTO encounters (patient_id, token_no, language, ayush_mode, status, red_flag_level, red_flag_reasons, summary_draft_json) VALUES (?,?,?,?,?,?,?,?)',
      [
        patient_id || null, token_no, language || 'en', ayush_mode ? 1 : 0,
        'pending', flagLevel,
        JSON.stringify(flags.map(f => f.reason)),
        JSON.stringify(summary)
      ]
    );

    for (const flag of flags) {
      await pool.query(
        'INSERT INTO red_flags (session_id, rule_id, level, reason, alert_id) VALUES (?,?,?,?,?)',
        [session_id, flag.ruleId, flag.level, flag.reason, uuidv4()]
      );
    }

    await log('patient', patient_id || 0, 'ENCOUNTER_CREATED', 'encounter', result.insertId, {});
    res.status(201).json({ id: result.insertId, token_no, red_flag_level: flagLevel });
  } catch (err) { next(err); }
});

router.get('/', authenticate, requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT e.id, e.token_no, e.status, e.red_flag_level, e.language, e.created_at, e.summary_draft_json, p.sex FROM encounters e LEFT JOIN patients p ON e.patient_id = p.id ORDER BY e.created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id/summary', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM encounters WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const enc = rows[0];
    const [docs] = await pool.query(
      'SELECT * FROM document_extractions WHERE session_id IN (SELECT id FROM sessions WHERE patient_id = ?)',
      [enc.patient_id]
    );
    // Normalize JSON fields — mysql2 may return them already parsed
    enc.summary_draft_json = safeJson(enc.summary_draft_json);
    enc.summary_final_json = safeJson(enc.summary_final_json);
    enc.red_flag_reasons = safeJson(enc.red_flag_reasons);
    res.json({ ...enc, documents: docs });
  } catch (err) { next(err); }
});

router.patch('/:id/summary', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const { summary_draft_json, doctor_notes } = req.body;
    await pool.query(
      'UPDATE encounters SET summary_draft_json = ?, doctor_notes = ? WHERE id = ? AND status != ?',
      [JSON.stringify(summary_draft_json), doctor_notes, req.params.id, 'signed']
    );
    await log(req.user.role, req.user.id, 'SUMMARY_EDITED', 'encounter', req.params.id, {});
    res.json({ updated: true });
  } catch (err) { next(err); }
});

router.post('/:id/sign', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM encounters WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const enc = rows[0];
    if (enc.status === 'signed') return res.status(400).json({ error: 'Already signed' });

    const summary = safeJson(enc.summary_draft_json);
    const fhir = buildFhirBundle(enc, summary);

    await pool.query(
      'UPDATE encounters SET status = ?, summary_final_json = ?, fhir_bundle_json = ?, signed_by = ?, signed_at = NOW() WHERE id = ?',
      ['signed', JSON.stringify(summary), JSON.stringify(fhir), req.user.id, req.params.id]
    );

    await pool.query('INSERT INTO his_records (encounter_id, bundle_json) VALUES (?,?)', [enc.id, JSON.stringify(fhir)]);
    await pool.query('UPDATE encounters SET his_status = ? WHERE id = ?', ['sent', enc.id]);

    await log(req.user.role, req.user.id, 'ENCOUNTER_SIGNED', 'encounter', enc.id, {});
    res.json({ signed: true, fhir });
  } catch (err) { next(err); }
});

router.get('/:id/fhir', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT fhir_bundle_json FROM encounters WHERE id = ?', [req.params.id]);
    if (!rows[0]?.fhir_bundle_json) return res.status(404).json({ error: 'FHIR bundle not yet generated' });
    const bundle = safeJson(rows[0].fhir_bundle_json);
    res.json(bundle);
  } catch (err) { next(err); }
});

export default router;
