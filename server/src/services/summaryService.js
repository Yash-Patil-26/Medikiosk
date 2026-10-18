function parseJsonColumn(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const MEDICAL_HISTORY_LABELS = {
  diabetes: 'Diabetes',
  hypertension: 'High blood pressure',
  heart_disease: 'Heart disease',
  asthma: 'Asthma',
  thyroid: 'Thyroid disorder',
  none: 'None'
};

export function formatMedicalHistory(value) {
  if (value === null || value === undefined) return value;

  let selections = value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) selections = parsed;
    } catch {
      return value;
    }
  }

  if (!Array.isArray(selections)) return value;

  return selections
    .map(item => MEDICAL_HISTORY_LABELS[item] || item)
    .join(', ');
}

const AYUSH_SLOT_IDS = [
  'prakriti_type',
  'agni_type',
  'diet_type',
  'sleep_hours',
  'exercise_frequency',
  'vikriti_description'
];

function buildAyushAssessment(get, val) {
  const present = AYUSH_SLOT_IDS.some(key => val(key) !== null);

  if (!present) return null;

  return {
    disclaimer: 'Patient-reported self-assessment, not a clinical Prakriti/Vikriti diagnosis. Requires physician or Vaidya review.',
    prakritiType: val('prakriti_type'),
    agniType: val('agni_type'),
    dietType: val('diet_type'),
    sleepHours: val('sleep_hours'),
    exerciseFrequency: val('exercise_frequency'),
    vikritiDescription: val('vikriti_description'),
    source: 'patient_interview',
    confirmedBy: get('prakriti_type')?.confirmed_by || null
  };
}

export function buildSummary(slotMap, docs = []) {
  const get = key => slotMap[key] || null;
  const val = key => get(key)?.value || null;
  const src = key => get(key)?.source || 'touch';

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
      temperature: val('temperature'),
      chills: val('chills'),
      alteredConsciousness: val('altered_consciousness'),
      source: 'patient_interview'
    },
    pastMedicalHistory: {
      text: formatMedicalHistory(val('past_medical_history')),
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
    ayushAssessment: buildAyushAssessment(get, val),
    documentFindings: docs.map(doc => ({
      docType: doc.doc_type,
      date: doc.doc_date,
      provider: doc.provider,
      labs: parseJsonColumn(doc.labs_json),
      medications: parseJsonColumn(doc.medications_json),
      diagnoses: parseJsonColumn(doc.diagnoses_json),
      verifiedByPatient: Boolean(doc.verified_by_patient),
      source: 'uploaded_document'
    }))
  };
}
