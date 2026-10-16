import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle, User, Clock, FileText, Activity, Stethoscope, Shield, FileCheck, Heart, Pill, AlertCircle, Edit2, X } from 'lucide-react';
import RedFlagBanner from '../../components/RedFlagBanner.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

function EditableCell({ value, onSave, editable, placeholder = 'Not recorded' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  const handleSave = () => {
    onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          autoFocus
        />
        <button onClick={handleSave} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors">
          <CheckCircle size={16} />
        </button>
        <button onClick={() => setEditing(false)} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group">
      <span className="text-gray-800">{val || <span className="text-gray-400 italic">{placeholder}</span>}</span>
      {editable && (
        <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
          <Edit2 size={14} />
        </button>
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
    try {
      await api.patch(`/encounters/${id}/summary`, { summary_draft_json: summary, doctor_notes: notes });
      // Show success feedback
      const btn = document.getElementById('save-notes-btn');
      if (btn) {
        btn.innerHTML = '<CheckCircle size={16} /> Saved';
        setTimeout(() => {
          btn.innerHTML = '<Save size={16} /> Save Notes';
        }, 2000);
      }
    } catch (err) {
      setError('Failed to save notes');
    }
  };

  const updateField = (section, field) => (value) => {
    setSummary(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
        source: prev[section]?.source || 'patient_interview'
      }
    }));
  };

  const updateSection = (section) => (value) => {
    setSummary(prev => ({
      ...prev,
      [section]: {
        text: value,
        source: prev[section]?.source || 'patient_interview'
      }
    }));
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

  const hpi = summary?.historyOfPresentIllness || {};

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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Patient info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-lg">
                  <User size={32} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Anonymous</h2>
                  <p className="text-sm text-gray-500 mt-1">ID: {encounter?.patient_id || '—'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-600">{new Date(encounter?.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield size={16} className="text-gray-400" />
                  <span className="text-gray-600 capitalize">{encounter?.language || 'en'}</span>
                </div>
              </div>
            </div>

            {flags.length > 0 && (
              <RedFlagBanner level={encounter?.red_flag_level} reasons={flags} />
            )}
          </div>

          {/* Right: Tabular summary */}
          <div className="lg:col-span-3 space-y-6">
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

            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={20} /> Patient Summary
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Chief Complaint */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Chief Complaint</h4>
                  <EditableCell 
                    value={getChiefComplaint()} 
                    onSave={updateSection('chiefComplaint')} 
                    editable={!signed} 
                  />
                  {summary?.chiefComplaint?.source && <ProvenanceChip source={summary.chiefComplaint.source} confirmedBy={summary.chiefComplaint.confirmedBy} />}
                </div>

                {/* History of Present Illness */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">History of Present Illness</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Location</label>
                      <EditableCell value={hpi.site} onSave={updateField('historyOfPresentIllness', 'site')} editable={!signed} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Onset</label>
                      <EditableCell value={hpi.onset} onSave={updateField('historyOfPresentIllness', 'onset')} editable={!signed} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Character</label>
                      <EditableCell value={hpi.character} onSave={updateField('historyOfPresentIllness', 'character')} editable={!signed} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Radiation</label>
                      <EditableCell value={hpi.radiation} onSave={updateField('historyOfPresentIllness', 'radiation')} editable={!signed} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Severity</label>
                      <EditableCell value={hpi.severity} onSave={updateField('historyOfPresentIllness', 'severity')} editable={!signed} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Duration</label>
                      <EditableCell value={hpi.duration} onSave={updateField('historyOfPresentIllness', 'duration')} editable={!signed} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">Breathing Difficulty</label>
                      <EditableCell value={hpi.breathingDifficulty} onSave={updateField('historyOfPresentIllness', 'breathingDifficulty')} editable={!signed} />
                    </div>
                  </div>
                  {hpi.source && <ProvenanceChip source={hpi.source} confirmedBy={hpi.confirmedBy} />}
                </div>

                {/* Past Medical History */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Medical History</h4>
                  <EditableCell 
                    value={typeof summary?.pastMedicalHistory === 'string' ? summary.pastMedicalHistory : summary?.pastMedicalHistory?.text} 
                    onSave={updateSection('pastMedicalHistory')} 
                    editable={!signed} 
                  />
                  {summary?.pastMedicalHistory?.source && <ProvenanceChip source={summary.pastMedicalHistory.source} confirmedBy={summary.pastMedicalHistory.confirmedBy} />}
                </div>

                {/* Past Surgical History */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Surgical History</h4>
                  <EditableCell 
                    value={typeof summary?.pastSurgicalHistory === 'string' ? summary.pastSurgicalHistory : summary?.pastSurgicalHistory?.text} 
                    onSave={updateSection('pastSurgicalHistory')} 
                    editable={!signed} 
                  />
                  {summary?.pastSurgicalHistory?.source && <ProvenanceChip source={summary.pastSurgicalHistory.source} confirmedBy={summary.pastSurgicalHistory.confirmedBy} />}
                </div>

                {/* Drug History */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Drug History</h4>
                  <EditableCell 
                    value={typeof summary?.drugHistory === 'string' ? summary.drugHistory : summary?.drugHistory?.text} 
                    onSave={updateSection('drugHistory')} 
                    editable={!signed} 
                  />
                  {summary?.drugHistory?.source && <ProvenanceChip source={summary.drugHistory.source} confirmedBy={summary.drugHistory.confirmedBy} />}
                </div>

                {/* Allergy History */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Allergy History</h4>
                  <EditableCell 
                    value={typeof summary?.allergyHistory === 'string' ? summary.allergyHistory : summary?.allergyHistory?.text} 
                    onSave={updateSection('allergyHistory')} 
                    editable={!signed} 
                  />
                  {summary?.allergyHistory?.source && <ProvenanceChip source={summary.allergyHistory.source} confirmedBy={summary.allergyHistory.confirmedBy} />}
                </div>

                {/* Family History */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Family History</h4>
                  <EditableCell 
                    value={typeof summary?.familyHistory === 'string' ? summary.familyHistory : summary?.familyHistory?.text} 
                    onSave={updateSection('familyHistory')} 
                    editable={!signed} 
                  />
                  {summary?.familyHistory?.source && <ProvenanceChip source={summary.familyHistory.source} confirmedBy={summary.familyHistory.confirmedBy} />}
                </div>
              </div>
            </div>

            {/* Document Findings */}
            {summary?.documentFindings?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck size={20} /> Document Findings
                  </h3>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Document Type</th>
                          <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Date</th>
                          <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Provider</th>
                          <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Key Findings</th>
                          <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.documentFindings.map((doc, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-3 text-sm text-gray-800 font-medium">{doc.docType}</td>
                            <td className="py-3 text-sm text-gray-600">{doc.date}</td>
                            <td className="py-3 text-sm text-gray-600">{doc.provider}</td>
                            <td className="py-3 text-sm text-gray-600">
                              {doc.labs?.length > 0 && (
                                <div className="space-y-1">
                                  {doc.labs.map((lab, j) => (
                                    <div key={j} className="text-xs">
                                      <span className="font-medium">{lab.name}:</span> {lab.value} {lab.unit}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {doc.medications?.length > 0 && (
                                <div className="space-y-1">
                                  {doc.medications.map((med, j) => (
                                    <div key={j} className="text-xs">
                                      <span className="font-medium">{med.name}:</span> {med.dose} - {med.frequency}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              {doc.verifiedByPatient ? (
                                <span className="flex items-center gap-1 text-xs text-success-600 font-medium bg-success-50 px-2 py-1 rounded-full">
                                  <CheckCircle size={12} /> Verified
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-warning-600 font-medium bg-warning-50 px-2 py-1 rounded-full">
                                  <AlertTriangle size={12} /> Not Verified
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Notes */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-primary-600" /> Doctor Notes
                </h3>
                <button 
                  id="save-notes-btn"
                  onClick={saveNotes} 
                  disabled={signed}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-sm font-medium shadow-md shadow-primary-200 hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50"
                >
                  <Save size={16} /> Save Notes
                </button>
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
