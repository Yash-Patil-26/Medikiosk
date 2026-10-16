import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle, User, Clock, FileText, Activity, Stethoscope, Shield, FileCheck, Heart, Pill, AlertCircle, Edit2, X } from 'lucide-react';
import RedFlagBanner from '../../components/RedFlagBanner.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

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
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    api.get(`/encounters/${id}/summary`)
      .then(r => {
        setEncounter(r.data);
        const draft = r.data.summary_draft_json;
        setSummary(draft && typeof draft === 'object' ? draft : (draft ? JSON.parse(draft) : null));
        setNotes(r.data.doctor_notes || '');
        if (r.data.status === 'signed') setSigned(true);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load encounter');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const startEdit = (field, value) => {
    setEditingField(field);
    setEditValue(typeof value === 'object' ? value?.text || JSON.stringify(value) : value || '');
  };

  const saveEdit = () => {
    if (!editingField) return;
    
    const key = editingField.split('.')[0];
    const subKey = editingField.includes('.') ? editingField.split('.')[1] : null;
    
    setSummary(currentSummary => {
      const current = currentSummary?.[key] || {};
      let updated;

      if (subKey) {
        updated = { ...current, [subKey]: editValue };
      } else if (
        key === 'historyOfPresentIllness' &&
        editValue &&
        typeof editValue === 'object' &&
        !Array.isArray(editValue)
      ) {
        updated = {
          ...editValue,
          source: current.source || 'patient_interview'
        };
      } else {
        updated = { ...current, text: editValue };
      }

      return { ...currentSummary, [key]: updated };
    });
    
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
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

  const getFieldValue = (path) => {
    const parts = path.split('.');
    let value = summary;
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value === 'object' && value !== null) {
      return value?.text || JSON.stringify(value);
    }
    return value || '—';
  };

  const hpiFields = [
    { key: 'site', label: 'Location' },
    { key: 'onset', label: 'Onset' },
    { key: 'character', label: 'Character' },
    { key: 'radiation', label: 'Radiation' },
    { key: 'severity', label: 'Severity' },
    { key: 'duration', label: 'Duration' },
    { key: 'breathingDifficulty', label: 'Breathing Difficulty' }
  ];

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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-lg">
                  <User size={32} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Anonymous</h2>
                  <p className="text-sm text-gray-500 mt-1">ID: {encounter?.patient_id || '—'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Time</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{new Date(encounter?.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Language</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800 capitalize">{encounter?.language || 'en'}</span>
                </div>
              </div>
            </div>

            {flags.length > 0 && (
              <RedFlagBanner level={encounter?.red_flag_level} reasons={flags} />
            )}
          </div>

          {/* Center: Summary Table */}
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
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-primary-200">
                  <h3 className="font-bold text-gray-900 text-lg">Patient Summary</h3>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {/* Chief Complaint */}
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity size={18} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 w-40">Chief Complaint</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-4">
                        {editingField === 'chiefComplaint' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 flex-1">{getFieldValue('chiefComplaint')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('chiefComplaint', getFieldValue('chiefComplaint'))} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <ProvenanceChip source={summary.chiefComplaint?.source} confirmedBy={summary.chiefComplaint?.confirmedBy} />
                  </div>

                  {/* History of Present Illness */}
                  <div className="p-4 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <Stethoscope size={18} className="text-primary-500" />
                      <span className="font-semibold text-gray-700">History of Present Illness</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {hpiFields.map(field => (
                        <div key={field.key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{field.label}</span>
                          {editingField === `historyOfPresentIllness.${field.key}` ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                              />
                              <button onClick={saveEdit} className="p-1 bg-success-500 text-white rounded hover:bg-success-600">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={cancelEdit} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{getFieldValue(`historyOfPresentIllness.${field.key}`)}</span>
                              {!signed && (
                                <button onClick={() => startEdit(`historyOfPresentIllness.${field.key}`, getFieldValue(`historyOfPresentIllness.${field.key}`))} className="p-1 text-primary-500 hover:bg-primary-50 rounded transition-colors">
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <ProvenanceChip source={summary.historyOfPresentIllness?.source} confirmedBy={summary.historyOfPresentIllness?.confirmedBy} />
                  </div>

                  {/* Past Medical History */}
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Stethoscope size={18} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 w-40">Past Medical History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-4">
                        {editingField === 'pastMedicalHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 flex-1">{getFieldValue('pastMedicalHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('pastMedicalHistory', getFieldValue('pastMedicalHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <ProvenanceChip source={summary.pastMedicalHistory?.source} confirmedBy={summary.pastMedicalHistory?.confirmedBy} />
                  </div>

                  {/* Past Surgical History */}
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCheck size={18} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 w-40">Past Surgical History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-4">
                        {editingField === 'pastSurgicalHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 flex-1">{getFieldValue('pastSurgicalHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('pastSurgicalHistory', getFieldValue('pastSurgicalHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <ProvenanceChip source={summary.pastSurgicalHistory?.source} confirmedBy={summary.pastSurgicalHistory?.confirmedBy} />
                  </div>

                  {/* Drug History */}
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Pill size={18} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 w-40">Drug History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-4">
                        {editingField === 'drugHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 flex-1">{getFieldValue('drugHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('drugHistory', getFieldValue('drugHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <ProvenanceChip source={summary.drugHistory?.source} confirmedBy={summary.drugHistory?.confirmedBy} />
                  </div>

                  {/* Allergy History */}
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertCircle size={18} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 w-40">Allergy History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-4">
                        {editingField === 'allergyHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 flex-1">{getFieldValue('allergyHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('allergyHistory', getFieldValue('allergyHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <ProvenanceChip source={summary.allergyHistory?.source} confirmedBy={summary.allergyHistory?.confirmedBy} />
                  </div>

                  {/* Family History */}
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Heart size={18} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 w-40">Family History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-4">
                        {editingField === 'familyHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 flex-1">{getFieldValue('familyHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('familyHistory', getFieldValue('familyHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <ProvenanceChip source={summary.familyHistory?.source} confirmedBy={summary.familyHistory?.confirmedBy} />
                  </div>
                </div>
              </div>
            )}

            {/* Document Findings */}
            {summary?.documentFindings?.length > 0 ? (
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-primary-200">
                  <div className="flex items-center gap-3">
                    <FileCheck size={20} className="text-primary-600" />
                    <h3 className="font-bold text-gray-900 text-lg">Document Findings</h3>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {summary.documentFindings.map((doc, i) => (
                    <div key={i} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-primary-500" />
                          <p className="font-semibold text-gray-800">{doc.docType}</p>
                        </div>
                        {doc.verifiedByPatient ? (
                          <span className="flex items-center gap-1 text-xs text-success-600 font-medium bg-success-50 px-2 py-1 rounded-full">
                            <CheckCircle size={12} /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-warning-600 font-medium bg-warning-50 px-2 py-1 rounded-full">
                            <AlertTriangle size={12} /> Not verified
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        <span className="font-medium">{doc.date}</span> · <span>{doc.provider}</span>
                      </div>
                      
                      {/* Labs Table */}
                      {doc.labs?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Lab Results</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 text-xs uppercase bg-gray-50">
                                <th className="px-3 py-2 rounded-tl-lg">Lab</th>
                                <th className="px-3 py-2">Value</th>
                                <th className="px-3 py-2 rounded-tr-lg">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doc.labs.map((lab, j) => (
                                <tr key={j} className="border-t border-gray-100">
                                  <td className="px-3 py-2 text-gray-800">{lab.name}</td>
                                  <td className="px-3 py-2 font-medium text-gray-900">{lab.value} {lab.unit}</td>
                                  <td className="px-3 py-2 text-gray-500">{lab.referenceRange}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Medications */}
                      {doc.medications?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Medications</p>
                          <div className="space-y-2">
                            {doc.medications.map((med, j) => (
                              <div key={j} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <Pill size={16} className="text-primary-500" />
                                <span className="text-sm text-gray-800">{med.name} {med.dose} — {med.frequency}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Diagnoses */}
                      {doc.diagnoses?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Diagnoses</p>
                          <div className="space-y-2">
                            {doc.diagnoses.map((diag, j) => (
                              <div key={j} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <AlertCircle size={16} className="text-warning-500" />
                                <span className="text-sm text-gray-800">{typeof diag === 'string' ? diag : diag.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-6 text-center">
                <FileText size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No documents uploaded</p>
              </div>
            )}

            {/* Doctor Notes */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText size={20} className="text-primary-600" />
                <h3 className="font-bold text-gray-900 text-lg">Doctor Notes</h3>
              </div>
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
