import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle, User, Clock, FileText, Activity } from 'lucide-react';
import RedFlagBanner from '../../components/RedFlagBanner.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

function SummarySection({ title, data, onEdit, editable }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(
    typeof data === 'object' ? data?.text || JSON.stringify(data) : data || ''
  );

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h3>
        {editable && !editing && (
          <button onClick={() => setEditing(!editing)} className="text-primary-500 hover:text-primary-700 p-1">
            <PenLine size={15} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea value={val} onChange={e => setVal(e.target.value)}
            className="border rounded-lg p-2 text-sm w-full min-h-[80px] focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={() => { onEdit(val); setEditing(false); }}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium">Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-800 text-sm">{val || <span className="text-gray-400 italic">Not recorded</span>}</p>
          {data?.source && <ProvenanceChip source={data.source} confirmedBy={data.confirmedBy} />}
        </div>
      )}
    </div>
  );
}

const HPI_FIELDS = [
  { key: 'site', label: 'Location' },
  { key: 'onset', label: 'Onset' },
  { key: 'character', label: 'Character' },
  { key: 'radiation', label: 'Radiation' },
  { key: 'severity', label: 'Severity' },
  { key: 'duration', label: 'Duration' },
  { key: 'breathingDifficulty', label: 'Breathing difficulty' }
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
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          History of Present Illness
        </h3>
        {editable && !editing && (
          <button onClick={startEditing}
            className="text-primary-500 hover:text-primary-700 p-1"
            aria-label="Edit history of present illness">
            <PenLine size={15} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HPI_FIELDS.map(field => (
              <label key={field.key} className="flex flex-col gap-1 text-sm text-gray-600">
                <span>{field.label}</span>
                <input
                  value={draft[field.key] ?? ''}
                  onChange={event => setDraft(current => ({
                    ...current,
                    [field.key]: event.target.value || null
                  }))}
                  className="border rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveChanges}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium">
              Save
            </button>
            <button onClick={() => {
              setDraft({ ...data });
              setEditing(false);
            }}
              className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HPI_FIELDS.map(field => (
            <div key={field.key} className="text-sm">
              <p className="text-gray-500">{field.label}</p>
              <p className="text-gray-800">
                {data[field.key] || <span className="text-gray-400 italic">Not recorded</span>}
              </p>
            </div>
          ))}
          <div className="sm:col-span-2">
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
            <button onClick={downloadFhir} className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white rounded-xl text-sm font-medium hover:bg-success-600 transition-colors">
              <Download size={16} /> Download FHIR
            </button>
          )}
          <span className="text-sm font-medium text-gray-600">{encounter?.token_no}</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Patient info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <User size={32} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Anonymous</h2>
                  <p className="text-sm text-gray-500">ID: {encounter?.patient_id || '—'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-600">{new Date(encounter?.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={16} className="text-gray-400" />
                  <span className="text-gray-600">{getChiefComplaint()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Language:</span>
                  <span className="text-gray-600 capitalize">{encounter?.language || 'en'}</span>
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
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 text-sm text-warning-800 flex items-center gap-2">
                <AlertTriangle size={16} />
                This summary is a draft and requires physician verification.
              </div>
            )}

            {summary && (
              <>
                <SummarySection title="Chief Complaint" data={summary.chiefComplaint} onEdit={editSection('chiefComplaint')} editable={!signed} />
                <HistoryPresentIllnessSection data={summary.historyOfPresentIllness || {}} onSave={editSection('historyOfPresentIllness')} editable={!signed} />
                <SummarySection title="Past Medical History" data={summary.pastMedicalHistory} onEdit={editSection('pastMedicalHistory')} editable={!signed} />
                <SummarySection title="Past Surgical History" data={summary.pastSurgicalHistory} onEdit={editSection('pastSurgicalHistory')} editable={!signed} />
                <SummarySection title="Drug History" data={summary.drugHistory} onEdit={editSection('drugHistory')} editable={!signed} />
                <SummarySection title="Allergy History" data={summary.allergyHistory} onEdit={editSection('allergyHistory')} editable={!signed} />
                <SummarySection title="Family History" data={summary.familyHistory} onEdit={editSection('familyHistory')} editable={!signed} />
              </>
            )}

            {summary?.documentFindings?.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Document Findings</h3>
                {summary.documentFindings.map((doc, i) => (
                  <div key={i} className="mb-3 text-sm">
                    <p className="font-medium">{doc.docType} — {doc.date} — {doc.provider}</p>
                    {doc.labs?.map((lab, j) => (
                      <p key={j} className="text-gray-600 ml-2">• {lab.name}: {lab.value} {lab.unit} (Ref: {lab.referenceRange})</p>
                    ))}
                    {doc.verifiedByPatient
                      ? <span className="text-xs text-success-600">✓ Verified by patient</span>
                      : <span className="text-xs text-warning-600">⚠ Not verified by patient</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Doctor Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={signed}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none"
                rows={4}
                placeholder="Add your clinical notes here..."
              />
            </div>

            {!signed ? (
              <button onClick={sign} disabled={signing}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-md shadow-primary-200 transition-all hover:shadow-lg flex items-center justify-center gap-2">
                {signing ? 'Signing...' : 'Sign & Complete Encounter'}
                <CheckCircle size={20} />
              </button>
            ) : (
              <div className="card p-6 bg-success-50 border-success-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                    <CheckCircle size={24} className="text-success-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-success-800">Encounter Signed</h3>
                    <p className="text-sm text-success-700">FHIR bundle generated successfully</p>
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
