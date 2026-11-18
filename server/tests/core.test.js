import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRedFlags } from '../src/services/redFlagService.js';
import { buildSummary } from '../src/services/summaryService.js';
import { buildFhirBundle } from '../src/services/fhirBundleBuilder.js';

describe('Red Flag Engine', () => {
  it('triggers critical flag for chest discomfort + severe breathing', () => {
    const slots = {
      complaint: { value: 'chest_discomfort' },
      breathing_difficulty: { value: 'severe' }
    };
    const flags = evaluateRedFlags(slots);
    assert.ok(flags.length > 0, 'Should trigger at least one flag');
    assert.equal(flags[0].level, 'critical');
    assert.equal(flags[0].reason, 'Priority for staff review.');
  });

  it('triggers critical flag for chest discomfort + arm/jaw radiation', () => {
    const slots = {
      complaint: { value: 'chest_discomfort' },
      radiation: { value: 'arm_or_jaw' }
    };
    const flags = evaluateRedFlags(slots);
    assert.ok(flags.some(f => f.ruleId === 'RF002'));
  });

  it('returns no flags for normal presentation', () => {
    const slots = {
      complaint: { value: 'cough' },
      severity_score: { value: '3' }
    };
    const flags = evaluateRedFlags(slots);
    assert.equal(flags.length, 0);
  });

  it('triggers warning for fever + altered consciousness', () => {
    const slots = {
      complaint: { value: 'fever' },
      altered_consciousness: { value: 'yes' }
    };
    const flags = evaluateRedFlags(slots);
    assert.ok(flags.some(f => f.level === 'warning'));
  });
});

describe('Summary Builder', () => {
  it('builds summary from slot map', () => {
    const slots = {
      complaint: { value: 'chest_discomfort', source: 'touch', confirmed_by: 'touch' },
      allergies: { value: 'Penicillin', source: 'voice', confirmed_by: 'readback' }
    };
    const summary = buildSummary(slots, []);
    assert.equal(summary.chiefComplaint.text, 'chest_discomfort');
    assert.equal(summary.allergyHistory.text, 'Penicillin');
    assert.equal(summary.allergyHistory.source, 'voice');
  });

  it('handles empty slots gracefully', () => {
    const summary = buildSummary({}, []);
    assert.equal(summary.chiefComplaint.text, 'Not specified');
  });
});

describe('FHIR Bundle Builder', () => {
  it('generates a valid FHIR bundle structure', () => {
    const encounter = { id: 1, patient_id: 1, token_no: 'T001', created_at: new Date().toISOString() };
    const summary = { chiefComplaint: { text: 'Chest pain' }, documentFindings: [] };
    const bundle = buildFhirBundle(encounter, summary);
    assert.equal(bundle.resourceType, 'Bundle');
    assert.equal(bundle.type, 'document');
    assert.ok(Array.isArray(bundle.entry));
    assert.ok(bundle.entry.length >= 3);
  });

  it('includes Patient, Encounter, and Composition resources', () => {
    const encounter = { id: 2, patient_id: 2, token_no: 'T002', created_at: new Date().toISOString() };
    const summary = { chiefComplaint: { text: 'Fever' }, documentFindings: [] };
    const bundle = buildFhirBundle(encounter, summary);
    const types = bundle.entry.map(e => e.resource.resourceType);
    assert.ok(types.includes('Patient'));
    assert.ok(types.includes('Encounter'));
    assert.ok(types.includes('Composition'));
  });
});
