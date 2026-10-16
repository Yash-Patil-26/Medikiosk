import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle, User, Clock, FileText, Activity, Stethoscope, Shield, FileCheck, Heart, Pill, AlertCircle } from 'lucide-react';
import RedFlagBanner from '../../components/RedFlagBanner.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

function SummarySection({ title, data, onEdit, editable, icon: Icon }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(
    typeof data === 'object' ? data?.text || JSON.stringify(data) : data || ''
  );

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <Icon size={20} className="text-primary-600" />
          </div>}
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        </div>
        {editable && !editing && (
          <button onClick={() => setEditing(!editing)} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
            <PenLine size={16} /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea value={val} onChange={e => setVal(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none"
            rows={4}
          />
          <div className="flex gap-3">
            <button onClick={() => { onEdit(val); setEditing(false); }}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-sm font-medium shadow-md shadow-primary-200 transition-all">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-800 text-base leading-relaxed">{val || <span className="text-gray-400 italic">Not recorded</span>}</p>
          {data?.source && <ProvenanceChip source={data.source} confirmedBy={data.confirmedBy} />}
        </div>
      )}
    </div>
  );
}

const HPI_FIELDS = [
  { key: 'site', label: 'Location', icon: Activity },
  { key: 'onset', label: 'Onset', icon: Clock },
  { key: 'character', label: 'Character', icon: Stethoscope },
  { key: 'radiation', label: 'Radiation', icon: AlertCircle },
  { key: 'severity', label: 'Severity', icon: AlertTriangle },
  { key: 'duration', label: 'Duration', icon: Clock },
  { key: 'breathingDifficulty', label: 'Breathing difficulty', icon: AlertCircle }
];

function HistoryPresentIllnessSection({ data, onSave, editable }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...data });

  const startEditing = () => {
    setDraft({ ...data });
    setEditing(true);
  };

  const saveChanges = () => {
    onSave({
      ...draft,
      source: data.source || 'patient_interview'
    });
    setEditing(false);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <Stethoscope size={20} className="text-primary-600" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">History of Present Illness</h3>
        </div>
        {editable && !editing && (
          <button onClick={startEditing}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            aria-label="Edit history of present illness">
            <PenLine size={16} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {HPI_FIELDS.map(field => (
              <label key={field.key} className="flex flex-col gap-2 text-sm text-gray-600">
                <span className="font-medium">{field.label}</span>
                <input
                  value={draft[field.key] ?? ''}
                  onChange={event => setDraft(current => ({
                    ...current,
                    [field.key]: event.target.value || null
                  }))}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={saveChanges}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-sm font-medium shadow-md shadow-primary-200 transition-all">
              Save
            </button>
            <button onClick={() => {
              setDraft({ ...data });
              setEditing(false);
            }}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {HPI_FIELDS.map(field => (
            <div key={field.key} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <field.icon size={16} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium">{field.label}</p>
                <p className="text-gray-800 font-medium">
                  {data[field.key] || <span className="text-gray-400 italic">Not recorded</span>}
                </p>
              </div>
            </div>
          ))}
          <div className="sm:col-span-2 mt-4">
            <ProvenanceChip source={data.source || 'patient_interview'} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorEncounter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [summary, setSummary] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [fhir, setFhir] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Fetching encounter data:', id);
    api.get(`/encounters/${id}/summary`)
      .then(r => {
        console.log('Encounter data fetched:', r.data);
        setEncounter(r.data);
        const draft = r.data.summary_draft_json;
        setSummary(draft && typeof draft === 'object' ? draft : (draft ? JSON.parse(draft) : null));
        setNotes(r.data.doctor_notes || '');
        if (r.data.status === 'signed') setSigned(true);
      })
      .catch(err => {
        console.error('Error fetching encounter:', err);
        console.error('Error response:', err.response?.data);
        setError(err.response?.data?.error || 'Failed to load encounter');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const saveNotes = async () => {
    await api.patch(`/encounters/${id}/summary`, { summary_draft_json: summary, doctor_notes: notes });
  };

  const editSection = (key, subKey) => (val) => {
    setSummary(currentSummary => {
      const current = currentSummary?.[key] || {};
      let updated;

      if (subKey) {
        updated = { ...current, [subKey]: val };
      } else if (
        key === 'historyOfPresentIllness' &&
        val &&
        typeof val === 'object' &&
        !Array.isArray(val)
      ) {
        updated = {
          ...val,
          source: current.source || 'patient_interview'
        };
      } else {
        updated = { ...current, text: val };
      }

      return { ...currentSummary, [key]: updated };
    });
  };

  const sign = async () => {
    setSigning(true);
    setError('');
    try {
      await api.patch(`/encounters/${id}/summary`, { summary_draft_json: summary, doctor_notes: notes });
      const r = await api.post(`/encounters/${id}/sign`);
      setFhir(r.data.fhir);
      setSigned(true);
    } catch (e) {
      console.error('Sign error:', e);
      console.error('Sign error response:', e.response?.data);
      setError(e.response?.data?.error || 'Sign-off failed');
    }
    finally { setSigning(false); }
  };

  const downloadFhir = async () => {
    const r = await api.get(`/encounters/${id}/fhir`);
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fhir-encounter-${id}.json`; a.click();
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );

  const flags = Array.isArray(encounter?.red_flag_reasons)
    ? encounter.red_flag_reasons
    : (encounter?.red_flag_reasons ? JSON.parse(encounter.red_flag_reasons) : []);

  const getChiefComplaint = () => {
    if (!summary?.chiefComplaint) return '—';
    return typeof summary.chiefComplaint === 'string' 
      ? summary.chiefComplaint 
      : summary.chiefComplaint?.text || '—';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/doctor')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={22} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
              <span className="text-xs text-gray-500 font-medium block">Encounter Review</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {signed && (
            <button onClick={downloadFhir} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl text-sm font-medium shadow-md shadow-success-200 hover:from-success-600 hover:to-success-700 transition-all">
              <Download size={16} /> Download FHIR
            </button>
          )}
          <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-xl border border-primary-200">
            <Shield size={18} className="text-primary-600" />
            <span className="text-sm font-bold text-primary-700">{encounter?.token_no}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Patient info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-lg">
                  <User size={40} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Anonymous</h2>
                  <p className="text-sm text-gray-500 mt-1">ID: {encounter?.patient_id || '—'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Clock size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Encounter Time</p>
                    <p className="text-sm text-gray-800 font-medium">{new Date(encounter?.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <FileText size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Chief Complaint</p>
                    <p className="text-sm text-gray-800 font-medium">{getChiefComplaint()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Shield size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Language</p>
                    <p className="text-sm text-gray-800 font-medium capitalize">{encounter?.language || 'en'}</p>
                  </div>
                </div>
              </div>
            </div>

            {flags.length > 0 && (
              <RedFlagBanner level={encounter?.red_flag_level} reasons={flags} />
            )}
          </div>

          {/* Center: summary */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-sm text-error-700 flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            {!signed && (
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 text-sm text-warning-800 flex items-center gap-3">
                <AlertTriangle size={20} />
                <div>
                  <p className="font-semibold">This summary is a draft and requires physician verification.</p>
                  <p className="text-xs mt-1">Review all sections below and sign to finalize the encounter.</p>
                </div>
              </div>
            )}

            {summary && (
              <>
                <SummarySection title="Chief Complaint" data={summary.chiefComplaint} onEdit={editSection('chiefComplaint')} editable={!signed} icon={Activity} />
                <HistoryPresentIllnessSection data={summary.historyOfPresentIllness || {}} onSave={editSection('historyOfPresentIllness')} editable={!signed} />
                <SummarySection title="Past Medical History" data={summary.pastMedicalHistory} onEdit={editSection('pastMedicalHistory')} editable={!signed} icon={Stethoscope} />
                <SummarySection title="Past Surgical History" data={summary.pastSurgicalHistory} onEdit={editSection('pastSurgicalHistory')} editable={!signed} icon={FileCheck} />
                <SummarySection title="Drug History" data={summary.drugHistory} onEdit={editSection('drugHistory')} editable={!signed} icon={Pill} />
                <SummarySection title="Allergy History" data={summary.allergyHistory} onEdit={editSection('allergyHistory')} editable={!signed} icon={AlertCircle} />
                <SummarySection title="Family History" data={summary.familyHistory} onEdit={editSection('familyHistory')} editable={!signed} icon={Heart} />
              </>
            )}

            {summary?.documentFindings?.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <FileCheck size={20} className="text-primary-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Document Findings</h3>
                </div>
                <div className="space-y-4">
                  {summary.documentFindings.map((doc, i) => (
                    <div key={i} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-primary-500" />
                          <p className="font-semibold text-gray-800">{doc.docType}</p>
                        </div>
                        {doc.verifiedByPatient ? (
                          <span className="flex items-center gap-1 text-xs text-success-600 font-medium bg-success-50 px-2 py-1 rounded-full">
                            <CheckCircle size={12} /> Verified by patient
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-warning-600 font-medium bg-warning-50 px-2 py-1 rounded-full">
                            <AlertTriangle size={12} /> Not verified
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mb-3">
                        <span className="font-medium">{doc.date}</span> · <span>{doc.provider}</span>
                      </div>
                      {doc.labs?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lab Results</p>
                          {doc.labs.map((lab, j) => (
                            <div key={j} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{lab.name}</p>
                                <p className="text-xs text-gray-500">Ref: {lab.referenceRange}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{lab.value} {lab.unit}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {doc.medications?.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Medications</p>
                          {doc.medications.map((med, j) => (
                            <div key={j} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                              <Pill size={16} className="text-primary-500" />
                              <p className="text-sm text-gray-800">{med.name} {med.dose} — {med.frequency}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <FileText size={20} className="text-primary-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Doctor Notes</h3>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={signed}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none"
                rows={5}
                placeholder="Add your clinical notes here..."
              />
            </div>

            {!signed ? (
              <button onClick={sign} disabled={signing}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-primary-200 transition-all hover:shadow-xl flex items-center justify-center gap-3">
                {signing ? 'Signing...' : 'Sign & Complete Encounter'}
                <CheckCircle size={24} />
              </button>
            ) : (
              <div className="card p-6 bg-gradient-to-br from-success-50 to-success-100 border-success-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center shadow-lg">
                    <CheckCircle size={32} className="text-success-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-success-800 text-xl">Encounter Signed</h3>
                    <p className="text-sm text-success-700 mt-1">FHIR bundle generated successfully and ready for download</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
