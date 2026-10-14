import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextNode,
  validateAnswerForNode
} from '../src/services/dialogueService.js';
import { buildSummary } from '../src/services/summaryService.js';

test('complaint selection rejects unsupported complaints', () => {
  const node = { type: 'complaint_selection' };

  assert.equal(validateAnswerForNode(node, 'chest_discomfort').valid, true);
  assert.equal(validateAnswerForNode(node, 'not-a-complaint').valid, false);
});

test('choice answers must match a graph option value', () => {
  const node = {
    inputType: 'choice',
    options: [
      { value: 'center', label: 'Center of chest' },
      { value: 'left', label: 'Left side' }
    ]
  };

  assert.equal(validateAnswerForNode(node, 'center').valid, true);
  assert.equal(validateAnswerForNode(node, 'unknown').valid, false);
});

test('scale answers must be whole numbers within the graph bounds', () => {
  const node = { inputType: 'scale', min: 1, max: 10 };

  assert.deepEqual(validateAnswerForNode(node, '7'), {
    valid: true,
    normalizedValue: '7'
  });
  assert.equal(validateAnswerForNode(node, '11').valid, false);
  assert.equal(validateAnswerForNode(node, '2.5').valid, false);
});

test('multiselect stores a JSON array and enforces the exclusive none option', () => {
  const node = {
    inputType: 'multiselect',
    options: [
      { value: 'diabetes', label: 'Diabetes' },
      { value: 'asthma', label: 'Asthma' },
      { value: 'none', label: 'None' }
    ]
  };

  const valid = validateAnswerForNode(node, ['diabetes', 'asthma']);
  assert.equal(valid.valid, true);
  assert.deepEqual(JSON.parse(valid.normalizedValue), ['diabetes', 'asthma']);

  assert.equal(validateAnswerForNode(node, ['none', 'asthma']).valid, false);
  assert.equal(validateAnswerForNode(node, ['diabetes', 'diabetes']).valid, false);
  assert.equal(validateAnswerForNode(node, ['invalid']).valid, false);
  assert.equal(validateAnswerForNode(node, 'diabetes').valid, false);
});

test('question selection follows the existing graph order', async () => {
  assert.equal((await getNextNode({}, {})).type, 'complaint_selection');

  const first = await getNextNode({}, { complaint: 'chest_discomfort' });
  assert.equal(first.id, 'cp_site');

  const second = await getNextNode({}, {
    complaint: 'chest_discomfort',
    chest_site: 'center'
  });
  assert.equal(second.id, 'cp_onset');
});

test('summary renders saved past medical history selections as readable labels', () => {
  const summary = buildSummary({
    past_medical_history: {
      value: '["diabetes","asthma"]',
      source: 'touch',
      confirmed_by: 'touch'
    }
  });

  assert.equal(summary.pastMedicalHistory.text, 'Diabetes, Asthma');
});
