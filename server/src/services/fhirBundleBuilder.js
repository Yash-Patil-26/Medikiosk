import { randomUUID } from 'node:crypto';

export function buildFhirBundle(encounter, summary) {
  const now = new Date().toISOString();
  const encId = `encounter-${encounter.id}`;
  const patientId = `patient-${encounter.patient_id || 'unknown'}`;

  const bundle = {
    resourceType: 'Bundle',
    id: randomUUID(),
    meta: { lastUpdated: now },
    type: 'document',
    timestamp: now,
    entry: []
  };

  // Composition
  bundle.entry.push({
    fullUrl: `urn:uuid:${randomUUID()}`,
    resource: {
      resourceType: 'Composition',
      id: randomUUID(),
      status: 'final',
      type: { text: 'OPConsultRecord' },
      subject: { reference: patientId },
      encounter: { reference: encId },
      date: now,
      title: 'MediKiosk Pre-Consultation Summary',
      section: [
        { title: 'Chief Complaint', text: { div: summary?.chiefComplaint?.text || '' } },
        { title: 'History of Present Illness', text: { div: JSON.stringify(summary?.historyOfPresentIllness || {}) } },
        { title: 'Past Medical History', text: { div: summary?.pastMedicalHistory?.text || 'None reported' } },
        { title: 'Past Surgical History', text: { div: summary?.pastSurgicalHistory?.text || 'None reported' } },
        { title: 'Drug History', text: { div: summary?.drugHistory?.text || 'None reported' } },
        { title: 'Allergy History', text: { div: summary?.allergyHistory?.text || 'None reported' } },
        { title: 'Family History', text: { div: summary?.familyHistory?.text || 'None reported' } },
        ...(summary?.ayushAssessment
          ? [{ title: 'AYUSH Assessment (Patient-Reported)', text: { div: JSON.stringify(summary.ayushAssessment) } }]
          : [])
      ]
    }
  });

  // Patient
  bundle.entry.push({
    fullUrl: patientId,
    resource: {
      resourceType: 'Patient',
      id: patientId,
      text: { div: 'DEMO SYNTHETIC PATIENT — NOT REAL DATA' },
      gender: encounter.sex || 'unknown'
    }
  });

  // Encounter
  bundle.entry.push({
    fullUrl: encId,
    resource: {
      resourceType: 'Encounter',
      id: encId,
      status: 'finished',
      class: { code: 'AMB', display: 'ambulatory' },
      subject: { reference: patientId },
      period: { start: encounter.created_at, end: now }
    }
  });

  // Observations from labs
  const docs = summary?.documentFindings || [];
  for (const doc of docs) {
    for (const lab of (doc.labs || [])) {
      bundle.entry.push({
        fullUrl: `urn:uuid:${randomUUID()}`,
        resource: {
          resourceType: 'Observation',
          status: 'final',
          code: { text: lab.name },
          subject: { reference: patientId },
          valueQuantity: { value: parseFloat(lab.value) || 0, unit: lab.unit },
          referenceRange: lab.referenceRange ? [{ text: lab.referenceRange }] : []
        }
      });
    }
  }

  return bundle;
}
