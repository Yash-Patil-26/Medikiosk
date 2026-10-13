// Mock OCR provider — returns synthetic demo data
export async function extract(_buffer, _mimeType, filename = '') {
  const name = filename.toLowerCase();
  if (name.includes('lab') || name.includes('report')) {
    return {
      docType: 'lab_report',
      date: '2025-06-01',
      provider: 'Demo Diagnostics Lab',
      diagnoses: [],
      medications: [],
      labs: [
        { name: 'Hemoglobin', value: '13.2', unit: 'g/dL', referenceRange: '12-16' },
        { name: 'WBC', value: '11.5', unit: 'x10³/µL', referenceRange: '4-11' },
        { name: 'Platelets', value: '210', unit: 'x10³/µL', referenceRange: '150-400' }
      ],
      confidence: 0.88
    };
  }
  if (name.includes('prescription') || name.includes('rx')) {
    return {
      docType: 'prescription',
      date: '2025-05-15',
      provider: 'Demo Clinic',
      diagnoses: [{ text: 'Demo condition (synthetic)' }],
      medications: [
        { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
        { name: 'Aspirin', dose: '75mg', frequency: 'once daily' }
      ],
      labs: [],
      confidence: 0.82
    };
  }
  return {
    docType: 'medical_document',
    date: new Date().toISOString().slice(0, 10),
    provider: 'Demo Provider',
    diagnoses: [],
    medications: [],
    labs: [],
    confidence: 0.75
  };
}
