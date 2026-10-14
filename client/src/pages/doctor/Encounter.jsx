import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle } from 'lucide-react';
import DemoBanner from '../../components/DemoBanner.jsx';
import RedFlagBanner from '../../components/RedFlagBanner.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

function SummarySection({ title, data, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(
    typeof data === 'object' ? data?.text || JSON.stringify(data) : data || ''
  );

  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h3>
        <button onClick={() => setEditing(!editing)} className="text-blue-500 hover:text-blue-700 p-1">
          <PenLine size={15} />
        </button>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea value={val} onChange={e => setVal(e.target.value)}
            className="border rounded-lg p-2 text-sm w-full min-h-[80px] focus:ring-2 focus:ring-blue-400 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={() => { onEdit(val); setEditing(false); }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">Save</button>
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
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          History of Present Illness
        </h3>
        {editable && !editing && (
          <button onClick={startEditing}
            className="text-blue-500 hover:text-blue-700 p-1"
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
                  className="border rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveChanges}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">
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

  useEffect(() => {
    api.get(`/encounters/${id}/summary`).then(r => {
      setEncounter(r.data);
      const draft = r.data.summary_draft_json;
      // Server normalizes JSON columns — may be object or string
      setSummary(draft && typeof draft === 'object' ? draft : (draft ? JSON.parse(draft) : null));
      setNotes(r.data.doctor_notes || '');
      if (r.data.status === 'signed') setSigned(true);
    }).finally(() => setLoading(false));
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
    try {
      await api.patch(`/encounters/${id}/summary`, { summary_draft_json: summary, doctor_notes: notes });
      const r = await api.post(`/encounters/${id}/sign`);
      setFhir(r.data.fhir);
      setSigned(true);
    } catch (e) { alert(e.response?.data?.error || 'Sign-off failed'); }
    finally { setSigning(false); }
  };

  const downloadFhir = async () => {
    const r = await api.get(`/encounters/${id}/fhir`);
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fhir-encounter-${id}.json`; a.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  const flags = Array.isArray(encounter?.red_flag_reasons)
    ? encounter.red_flag_reasons
    : (encounter?.red_flag_reasons ? JSON.parse(encounter.red_flag_reasons) : []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DemoBanner />
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/doctor')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">Encounter #{id} — Token {encounter?.token_no}</h1>
          <p className="text-xs text-gray-400">Status: {encounter?.status}</p>
        </div>
        {signed && (
          <span className="ml-auto flex items-center gap-1 text-teal-600 font-medium text-sm">
            <CheckCircle size={16} /> Signed & Finalized
          </span>
        )}
      </header>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: encounter info */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border rounded-2xl p-4">
            <h2 className="font-bold text-gray-700 mb-3">Encounter Info</h2>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              <p>Token: <strong>{encounter?.token_no}</strong></p>
              <p>Language: {encounter?.language}</p>
              <p>Created: {new Date(encounter?.created_at).toLocaleString()}</p>
            </div>
          </div>
          <RedFlagBanner level={encounter?.red_flag_level} reasons={flags} />
          {!signed && (
            <div className="bg-white border rounded-2xl p-4 flex flex-col gap-3">
              <h2 className="font-bold text-gray-700">Doctor Notes</h2>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add clinical notes..."
                className="border rounded-lg p-2 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-400 focus:outline-none" />
              <button onClick={saveNotes} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
                <Save size={14} /> Save Notes
              </button>
            </div>
          )}
          {notes && signed && (
            <div className="bg-white border rounded-2xl p-4">
              <h2 className="font-bold text-gray-700 mb-2">Doctor Notes</h2>
              <p className="text-sm text-gray-700">{notes}</p>
            </div>
          )}
        </div>

        {/* Center: summary */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!signed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle size={16} /> This summary is a draft and requires physician verification.
            </div>
          )}

          {summary && (
            <>
              <SummarySection title="Chief Complaint" data={summary.chiefComplaint} onEdit={editSection('chiefComplaint')} />
              <HistoryPresentIllnessSection data={summary.historyOfPresentIllness || {}} onSave={editSection('historyOfPresentIllness')} editable={!signed} />
              <SummarySection title="Past Medical History" data={summary.pastMedicalHistory} onEdit={editSection('pastMedicalHistory')} />
              <SummarySection title="Past Surgical History" data={summary.pastSurgicalHistory} onEdit={editSection('pastSurgicalHistory')} />
              <SummarySection title="Drug History" data={summary.drugHistory} onEdit={editSection('drugHistory')} />
              <SummarySection title="Allergy History" data={summary.allergyHistory} onEdit={editSection('allergyHistory')} />
              <SummarySection title="Family History" data={summary.familyHistory} onEdit={editSection('familyHistory')} />
            </>
          )}

          {summary?.documentFindings?.length > 0 && (
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Document Findings</h3>
              {summary.documentFindings.map((doc, i) => (
                <div key={i} className="mb-3 text-sm">
                  <p className="font-medium">{doc.docType} — {doc.date} — {doc.provider}</p>
                  {doc.labs?.map((lab, j) => (
                    <p key={j} className="text-gray-600 ml-2">• {lab.name}: {lab.value} {lab.unit} (Ref: {lab.referenceRange})</p>
                  ))}
                  {doc.verifiedByPatient
                    ? <span className="text-xs text-teal-600">✓ Verified by patient</span>
                    : <span className="text-xs text-amber-600">⚠ Not verified by patient</span>}
                </div>
              ))}
            </div>
          )}

          {!signed ? (
            <button onClick={sign} disabled={signing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2">
              <PenLine size={20} /> {signing ? 'Signing...' : 'Sign & Finalize'}
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={downloadFhir}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold">
                <Download size={18} /> Download FHIR JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
