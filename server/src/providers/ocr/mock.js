// Mock OCR provider. It does not read uploaded file contents.
// Synthetic sample findings are returned for demo fixtures or any upload with keywords.
const LAB_FIXTURE = /^(?:medikiosk-demo-)?(?:lab|report|lab.*report)\.(?:pdf|png|jpe?g)$/i;
const PRESCRIPTION_FIXTURE = /^(?:medikiosk-demo-)?(?:prescription|rx|medication)\.(?:pdf|png|jpe?g)$/i;

const SYNTHETIC_PROVIDER =
  'SYNTHETIC DEMO FIXTURE ONLY; not extracted from the uploaded file';

export async function extract(_buffer, _mimeType, filename = '') {
  const name = String(filename || '')
    .split(/[\\/]/)
    .pop()
    .trim()
    .toLowerCase();

  // Check for lab report keywords
  if (LAB_FIXTURE.test(name) || name.includes('lab') || name.includes('report')) {
    return {
      docType: 'lab_report',
      date: '2025-06-01',
      provider: SYNTHETIC_PROVIDER,
      diagnoses: [],
      medications: [],
      labs: [
        { name: 'Hemoglobin', value: '13.2', unit: 'g/dL', referenceRange: '12-16' },
        { name: 'WBC', value: '11.5', unit: 'x10³/µL', referenceRange: '4-11' },
        { name: 'Platelets', value: '210', unit: 'x10³/µL', referenceRange: '150-400' }
      ],
      confidence: 0
    };
  }

  // Check for prescription keywords
  if (PRESCRIPTION_FIXTURE.test(name) || name.includes('prescription') || name.includes('rx') || name.includes('medication')) {
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

  // For other files, return generic medical document with demo data
  return {
    docType: 'medical_document',
    date: '2025-04-10',
    provider: SYNTHETIC_PROVIDER,
    diagnoses: [{ text: 'Prior condition (synthetic demo data)' }],
    medications: [
      { name: 'Sample Medication', dose: '100mg', frequency: 'once daily' }
    ],
    labs: [
      { name: 'Sample Lab', value: 'Normal', unit: '-', referenceRange: 'Normal range' }
    ],
    confidence: 0
  };
}
