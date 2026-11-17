import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle, User, Clock, FileText, Stethoscope, Shield, FileCheck, Heart, Pill, AlertCircle, Edit2, X, Activity } from 'lucide-react';
import RedFlagBanner from '../../components/RedFlagBanner.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import UniversalHeader from '../../components/UniversalHeader.jsx';
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
      await api.post(`/encounters/${id}/sign`);
      setSigned(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Sign-off failed');
    }
    finally { setSigning(false); }
  };

  const downloadPrintableSummary = () => {
    const summaryContent = `
      <html>
        <head>
          <title>MediKiosk Encounter Summary - ${encounter?.token_no}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin-bottom: 20px; }
            .section h2 { background: #f5f5f5; padding: 10px; margin: 0 0 10px 0; border-left: 4px solid #007bff; }
            .field { margin: 10px 0; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-left: 10px; }
            .footer { border-top: 2px solid #333; padding-top: 20px; margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .flag-warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
            .flag-critical { background: #f8d7da; border-left: 4px solid #dc3545; padding: 10px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MediKiosk Encounter Summary</h1>
            <p>Token No: ${encounter?.token_no}</p>
            <p>Date: ${new Date(encounter?.created_at).toLocaleString()}</p>
            <p>Status: ${encounter?.status?.toUpperCase()}</p>
          </div>

          ${encounter?.red_flag_level && encounter?.red_flag_level !== 'none' ? `
            <div class="${encounter?.red_flag_level === 'critical' ? 'flag-critical' : 'flag-warning'}">
              <strong>⚠️ RED FLAG: ${encounter?.red_flag_level?.toUpperCase()}</strong>
              <p>${Array.isArray(encounter?.red_flag_reasons) ? encounter.red_flag_reasons.join(', ') : encounter?.red_flag_reasons}</p>
            </div>
          ` : ''}

          <div class="section">
            <h2>Patient Summary</h2>
            <div class="field">
              <span class="field-label">Chief Complaint:</span>
              <span class="field-value">${getFieldValue('chiefComplaint')}</span>
            </div>
            <div class="field">
              <span class="field-label">Language:</span>
              <span class="field-value">${encounter?.language || 'en'}</span>
            </div>
          </div>

          <div class="section">
            <h2>History of Present Illness</h2>
            ${hpiFields.map(field => {
              const fieldValue = getFieldValue(`historyOfPresentIllness.${field.key}`);
              return `
              <div class="field">
                <span class="field-label">${field.label}:</span>
                <span class="field-value">${fieldValue}</span>
              </div>
            `}).join('')}
          </div>

          <div class="section">
            <h2>Past Medical History</h2>
            <div class="field">
              <span class="field-value">${getFieldValue('pastMedicalHistory')}</span>
            </div>
          </div>

          <div class="section">
            <h2>Past Surgical History</h2>
            <div class="field">
              <span class="field-value">${getFieldValue('pastSurgicalHistory')}</span>
            </div>
          </div>

          <div class="section">
            <h2>Drug History</h2>
            <div class="field">
              <span class="field-value">${getFieldValue('drugHistory')}</span>
            </div>
          </div>

          <div class="section">
            <h2>Allergy History</h2>
            <div class="field">
              <span class="field-value">${getFieldValue('allergyHistory')}</span>
            </div>
          </div>

          <div class="section">
            <h2>Family History</h2>
            <div class="field">
              <span class="field-value">${getFieldValue('familyHistory')}</span>
            </div>
          </div>

          ${summary?.documentFindings?.length > 0 ? `
            <div class="section">
              <h2>Document Findings</h2>
              ${summary.documentFindings.map(doc => `
                <div style="margin: 15px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd;">
                  <p><strong>${doc.docType}</strong> - ${doc.date || 'Date not specified'} - ${doc.provider || 'Provider not specified'}</p>
                  ${doc.verifiedByPatient ? '<p style="color: green;">✓ Verified by patient</p>' : '<p style="color: orange;">⚠ Not verified by patient</p>'}
                  ${doc.labs?.length > 0 ? `
                    <h3>Lab Results</h3>
                    <table>
                      <tr><th>Lab</th><th>Value</th><th>Reference</th></tr>
                      ${doc.labs.map(lab => `<tr><td>${lab.name}</td><td>${lab.value} ${lab.unit}</td><td>${lab.referenceRange}</td></tr>`).join('')}
                    </table>
                  ` : ''}
                  ${doc.medications?.length > 0 ? `
                    <h3>Medications</h3>
                    ${doc.medications.map(med => `<p>• ${med.name} ${med.dose} — ${med.frequency}</p>`).join('')}
                  ` : ''}
                  ${doc.diagnoses?.length > 0 ? `
                    <h3>Diagnoses</h3>
                    ${doc.diagnoses.map(diag => `<p>• ${typeof diag === 'string' ? diag : diag.text}</p>`).join('')}
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="section">
            <h2>Doctor Notes</h2>
            <div class="field">
              <span class="field-value">${notes || 'No notes provided'}</span>
            </div>
          </div>

          <div class="footer">
            <p>Generated by MediKiosk - AI-Assisted Pre-Consultation Clinical Information System</p>
            <p>This is a synthetic demo document. Not for actual clinical use.</p>
            <p>Encounter ID: ${id} | Signed at: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([summaryContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encounter-summary-${encounter?.token_no || id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />
      <div className="px-3 py-2 flex items-center justify-between">
        <button onClick={() => navigate('/doctor')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          {signed && (
            <button onClick={downloadPrintableSummary} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-sm font-medium shadow-md shadow-primary-200 hover:from-primary-600 hover:to-primary-700 transition-all">
              <Download size={16} /> Download Summary
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 p-3 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
          {/* Left: Patient info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-12 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <User size={20} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Anonymous</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ID: {encounter?.patient_id || '—'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">Time</span>
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(encounter?.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">Language</span>
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{encounter?.language || 'en'}</span>
                </div>
              </div>
            </div>

            {flags.length > 0 && (
              <RedFlagBanner level={encounter?.red_flag_level} reasons={flags} />
            )}
          </div>

          {/* Center: Summary Table */}
          <div className="lg:col-span-3 space-y-4">
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            {!signed && (
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 text-sm text-warning-800 flex items-center gap-2">
                <AlertTriangle size={18} />
                <div>
                  <p className="font-semibold">This summary is a draft and requires physician verification.</p>
                  <p className="text-xs mt-1">Review all sections below and sign to finalize the encounter.</p>
                </div>
              </div>
            )}

            {summary && (
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 px-3 py-2 border-b border-primary-200 dark:border-primary-700">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Patient Summary</h3>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {/* Chief Complaint */}
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm w-32">Chief Complaint</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        {editingField === 'chiefComplaint' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <button onClick={saveEdit} className="p-1 bg-success-500 text-white rounded hover:bg-success-600">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={cancelEdit} className="p-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 dark:text-gray-200 flex-1">{getFieldValue('chiefComplaint')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('chiefComplaint', getFieldValue('chiefComplaint'))} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
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
                  <div className="p-3 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope size={16} className="text-primary-500" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">History of Present Illness</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {hpiFields.map(field => (
                        <div key={field.key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{field.label}</span>
                          {editingField === `historyOfPresentIllness.${field.key}` ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="w-32 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              />
                              <button onClick={saveEdit} className="p-1 bg-success-500 text-white rounded hover:bg-success-600">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={cancelEdit} className="p-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{getFieldValue(`historyOfPresentIllness.${field.key}`)}</span>
                              {!signed && (
                                <button onClick={() => startEdit(`historyOfPresentIllness.${field.key}`, getFieldValue(`historyOfPresentIllness.${field.key}`))} className="p-1 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors">
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
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope size={16} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-28">Past Medical History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        {editingField === 'pastMedicalHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                            <span className="text-gray-800 dark:text-gray-200 flex-1">{getFieldValue('pastMedicalHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('pastMedicalHistory', getFieldValue('pastMedicalHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
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
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck size={16} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-28">Past Surgical History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        {editingField === 'pastSurgicalHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 dark:text-gray-200 flex-1">{getFieldValue('pastSurgicalHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('pastSurgicalHistory', getFieldValue('pastSurgicalHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
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
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill size={16} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-28">Drug History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        {editingField === 'drugHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 dark:text-gray-200 flex-1">{getFieldValue('drugHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('drugHistory', getFieldValue('drugHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
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
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-28">Allergy History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        {editingField === 'allergyHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 dark:text-gray-200 flex-1">{getFieldValue('allergyHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('allergyHistory', getFieldValue('allergyHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
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
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart size={16} className="text-primary-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-28">Family History</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        {editingField === 'familyHistory' ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-800 dark:text-gray-200 flex-1">{getFieldValue('familyHistory')}</span>
                            {!signed && (
                              <button onClick={() => startEdit('familyHistory', getFieldValue('familyHistory'))} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
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
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-3 py-2 border-b border-primary-200">
                  <div className="flex items-center gap-2">
                    <FileCheck size={18} className="text-primary-600" />
                    <h3 className="font-bold text-gray-900 text-base">Document Findings</h3>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {summary.documentFindings.map((doc, i) => (
                    <div key={i} className="p-3">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-primary-500" />
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
              <div className="card p-4 text-center">
                <FileText size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No documents uploaded</p>
              </div>
            )}

            {/* Doctor Notes */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-primary-600" />
                <h3 className="font-bold text-gray-900 text-base">Doctor Notes</h3>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={signed}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                rows={4}
                placeholder="Add your clinical notes here..."
              />
            </div>

            {!signed ? (
              <button onClick={sign} disabled={signing}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-2 rounded-2xl font-bold text-base disabled:opacity-50 shadow-lg shadow-primary-200 transition-all hover:shadow-xl flex items-center justify-center gap-2">
                {signing ? 'Signing...' : 'Sign & Complete Encounter'}
                <CheckCircle size={20} />
              </button>
            ) : (
              <div className="card p-4 bg-gradient-to-br from-success-50 to-success-100 border-success-200">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-10 rounded-2xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center shadow-lg">
                    <CheckCircle size={24} className="text-success-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-success-800 text-lg">Encounter Signed</h3>
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
