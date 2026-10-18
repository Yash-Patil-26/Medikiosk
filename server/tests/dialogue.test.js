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

test('ayush questions are inserted between the complaint graph and general history when ayush_mode is on', async () => {
  // fever.json and general.json both use the "onset_type" slotId on purpose
  // (no need to ask a fever patient "when did this start" twice), so once
  // fever's own onset question is answered, general.json's onset node is
  // deduplicated away and "general_duration" is the next general-history
  // question — not "general_onset".
  const withoutAyush = await getNextNode(
    { ayush_mode: 0 },
    { complaint: 'fever', onset_type: 'today', temperature: 'high', chills: 'no', altered_consciousness: 'no' }
  );
  assert.equal(withoutAyush.id, 'general_duration');

  const withAyush = await getNextNode(
    { ayush_mode: 1 },
    { complaint: 'fever', onset_type: 'today', temperature: 'high', chills: 'no', altered_consciousness: 'no' }
  );
  assert.equal(withAyush.id, 'ayush_prakriti');

  const afterAyush = await getNextNode(
    { ayush_mode: 1 },
    {
      complaint: 'fever', onset_type: 'today', temperature: 'high', chills: 'no', altered_consciousness: 'no',
      prakriti_type: 'vata', agni_type: 'regular', diet_type: 'vegetarian',
      sleep_hours: '7', exercise_frequency: 'daily', vikriti_description: 'none'
    }
  );
  assert.equal(afterAyush.id, 'general_duration');
});

test('question selection does not insert ayush questions when ayush_mode is off', async () => {
  const node = await getNextNode({ ayush_mode: 0 }, { complaint: 'chest_discomfort' });
  assert.equal(node.id, 'cp_site');
});

test('summary surfaces fever vitals and an ayush assessment only when those slots exist', () => {
  const withoutAyush = buildSummary({
    complaint: { value: 'fever', source: 'touch', confirmed_by: 'touch' },
    temperature: { value: 'high', source: 'touch', confirmed_by: 'touch' },
    chills: { value: 'yes', source: 'touch', confirmed_by: 'touch' }
  });
  assert.equal(withoutAyush.historyOfPresentIllness.temperature, 'high');
  assert.equal(withoutAyush.historyOfPresentIllness.chills, 'yes');
  assert.equal(withoutAyush.ayushAssessment, null);

  const withAyush = buildSummary({
    prakriti_type: { value: 'vata', source: 'voice', confirmed_by: 'readback' },
    agni_type: { value: 'regular', source: 'touch', confirmed_by: 'touch' }
  });
  assert.equal(withAyush.ayushAssessment.prakritiType, 'vata');
  assert.equal(withAyush.ayushAssessment.confirmedBy, 'readback');
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
