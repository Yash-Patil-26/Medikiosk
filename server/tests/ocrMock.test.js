import test from 'node:test';
import assert from 'node:assert/strict';
import { extract } from '../src/providers/ocr/mock.js';

test('ordinary filenames never generate fabricated clinical findings', async () => {
  for (const filename of [
    'patient-report.pdf',
    'my-lab-results.png',
    'prescription.pdf',
    'ordinary-document.jpg'
  ]) {
    const result = await extract(
      Buffer.from('contents are not inspected by the mock provider'),
      'application/pdf',
      filename
    );

    assert.deepEqual(result.diagnoses, [], filename + ': diagnoses must be empty');
    assert.deepEqual(result.medications, [], filename + ': medications must be empty');
    assert.deepEqual(result.labs, [], filename + ': lab results must be empty');
    assert.equal(result.date, null);
    assert.equal(result.confidence, 0);
    assert.match(result.provider, /mock OCR.*not extracted/i);
  }
});

test('explicit synthetic lab fixture is labeled and has no OCR confidence', async () => {
  const result = await extract(
    Buffer.from('synthetic fixture'),
    'application/pdf',
    'medikiosk-demo-lab-report.pdf'
  );

  assert.equal(result.docType, 'lab_report');
  assert.equal(result.labs.length, 3);
  assert.deepEqual(result.diagnoses, []);
  assert.deepEqual(result.medications, []);
  assert.match(result.provider, /synthetic demo fixture only/i);
  assert.equal(result.confidence, 0);
});

test('explicit synthetic prescription fixture is labeled', async () => {
  const result = await extract(
    Buffer.from('synthetic fixture'),
    'application/pdf',
    'medikiosk-demo-prescription.pdf'
  );

  assert.equal(result.docType, 'prescription');
  assert.equal(result.medications.length, 2);
  assert.match(result.provider, /synthetic demo fixture only/i);
  assert.equal(result.confidence, 0);
});
