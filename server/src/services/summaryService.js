export function buildSummary(slotMap, docs = []) {
  const get = (key) => slotMap[key] || null;
  const val = (key) => get(key)?.value || null;
  const src = (key) => get(key)?.source || 'touch';

  return {
    chiefComplaint: {
      text: val('complaint') || 'Not specified',
      source: src('complaint'),
      confirmedBy: get('complaint')?.confirmed_by || null
    },
    historyOfPresentIllness: {
      site: val('chest_site') || val('headache_site') || null,
      onset: val('onset_type'),
      character: val('character'),
      radiation: val('radiation'),
      severity: val('severity') || val('severity_score'),
      duration: val('duration'),
      breathingDifficulty: val('breathing_difficulty'),
      source: 'patient_interview'
    },
    pastMedicalHistory: {
      text: val('past_medical_history'),
      source: src('past_medical_history'),
      confirmedBy: get('past_medical_history')?.confirmed_by || null
    },
    pastSurgicalHistory: {
      text: val('surgical_history'),
      source: src('surgical_history'),
      confirmedBy: get('surgical_history')?.confirmed_by || null
    },
    drugHistory: {
      text: val('current_medicines'),
      source: src('current_medicines'),
      confirmedBy: get('current_medicines')?.confirmed_by || null
    },
    allergyHistory: {
      text: val('allergies'),
      source: src('allergies'),
      confirmedBy: get('allergies')?.confirmed_by || null
    },
    familyHistory: {
      text: val('family_history'),
      source: src('family_history'),
      confirmedBy: get('family_history')?.confirmed_by || null
    },
    documentFindings: docs.map(d => ({
      docType: d.doc_type,
      date: d.doc_date,
      provider: d.provider,
      labs: d.labs_json ? JSON.parse(d.labs_json) : [],
      medications: d.medications_json ? JSON.parse(d.medications_json) : [],
      diagnoses: d.diagnoses_json ? JSON.parse(d.diagnoses_json) : [],
      verifiedByPatient: !!d.verified_by_patient,
      source: 'uploaded_document'
    }))
  };
}
