// Mock OCR provider. It does not read uploaded file contents.
// Synthetic sample findings are returned only for explicitly named demo fixtures.
const LAB_FIXTURE = /^medikiosk-demo-lab-report\.(?:pdf|png|jpe?g)$/i;
const PRESCRIPTION_FIXTURE = /^medikiosk-demo-prescription\.(?:pdf|png|jpe?g)$/i;

const SYNTHETIC_PROVIDER =
  'SYNTHETIC DEMO FIXTURE ONLY; not extracted from the uploaded file';

export async function extract(_buffer, _mimeType, filename = '') {
  const name = String(filename || '')
    .split(/[\\/]/)
    .pop()
    .trim()
    .toLowerCase();

  if (LAB_FIXTURE.test(name)) {
    return {
      docType: 'lab_report',
      date: '2025-06-01',
      provider: SYNTHETIC_PROVIDER,
      diagnoses: [],
      medications: [],
      labs: [
        { name: 'Hemoglobin', value: '13.2', unit: 'g/dL', referenceRange: '12-16' },
        { name: 'WBC', value: '11.5', unit: 'x10?/?L', referenceRange: '4-11' },
        { name: 'Platelets', value: '210', unit: 'x10?/?L', referenceRange: '150-400' }
      ],
      // Canned sample values are not OCR measurements.
      confidence: 0
    };
  }

  if (PRESCRIPTION_FIXTURE.test(name)) {
    return {
      docType: 'prescription',
      date: '2025-05-15',
      provider: SYNTHETIC_PROVIDER,
      diagnoses: [{ text: 'Demo condition (synthetic)' }],
      medications: [
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
        { name: 'Aspirin', dose: '75mg', frequency: 'once daily' }
      ],
      labs: [],
      confidence: 0
    };
  }

  // Ordinary uploads must not produce fabricated clinical findings.
  return {
    docType: 'medical_document',
    date: null,
    provider: 'Mock OCR: file contents were not extracted',
    diagnoses: [],
    medications: [],
    labs: [],
    confidence: 0
  };
}
