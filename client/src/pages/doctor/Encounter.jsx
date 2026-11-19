import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle, User, Clock, FileText, Stethoscope, Shield, FileCheck, Heart, Pill, AlertCircle, Edit2, X, Activity, ChevronRight, Calendar, Clipboard } from 'lucide-react';
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
            <p>Generated by MediKiosk - Pre-Consultation Clinical Information System</p>
            <p>This document was generated for clinical review.</p>
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

  const formatDisplayValue = (value) => {
    if (!value) return 'Not provided';
    if (value === '—') return 'Not provided';
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.join(', ');
        }
      } catch (e) {}
    }
    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/doctor')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient Encounter</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Token #{encounter?.token_no || '—'}</p>
            </div>
          </div>
          {signed && (
            <button onClick={downloadPrintableSummary} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-md hover:from-primary-600 hover:to-primary-700 transition-all">
              <Download size={18} /> Download Summary
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Patient Info Card */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <User size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Patient</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ID: {encounter?.patient_id || '—'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Clock size={18} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(encounter?.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <FileText size={18} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Language</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{encounter?.language || 'en'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Calendar size={18} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(encounter?.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {flags.length > 0 && (
                <div className="mt-6">
                  <RedFlagBanner level={encounter?.red_flag_level} reasons={flags} />
                </div>
              )}
            </div>
          </div>

          {/* Right: Main Content */}
          <div className="lg:col-span-9 space-y-6">
            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-2xl p-4 text-sm text-error-700 dark:text-error-400 flex items-center gap-3">
                <AlertTriangle size={20} />
                {error}
              </div>
            )}
            
            {!signed && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Draft Summary - Requires Verification</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Review all sections below, make any necessary edits, and sign to finalize the encounter.</p>
                  </div>
                </div>
              </div>
            )}

            {summary && (
              <>
                {/* Chief Complaint Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chief Complaint</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {editingField === 'chiefComplaint' ? (
                          <div className="flex gap-2">
                            <input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="flex-1 border-2 border-primary-300 dark:border-primary-600 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              autoFocus
                            />
                            <button onClick={saveEdit} className="px-4 py-3 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 transition-colors">
                              <CheckCircle size={18} />
                            </button>
                            <button onClick={cancelEdit} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{formatDisplayValue(getFieldValue('chiefComplaint'))}</p>
                        )}
                      </div>
                      {!signed && editingField !== 'chiefComplaint' && (
                        <button onClick={() => startEdit('chiefComplaint', getFieldValue('chiefComplaint'))} className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="mt-4">
                      <ProvenanceChip source={summary.chiefComplaint?.source} confirmedBy={summary.chiefComplaint?.confirmedBy} />
                    </div>
                  </div>
                </div>

                {/* History of Present Illness Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Stethoscope size={20} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">History of Present Illness</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hpiFields.map(field => (
                        <div key={field.key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{field.label}</p>
                          {editingField === `historyOfPresentIllness.${field.key}` ? (
                            <div className="flex gap-2">
                              <input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="flex-1 border-2 border-primary-300 dark:border-primary-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                autoFocus
                              />
                              <button onClick={saveEdit} className="p-2 bg-success-500 text-white rounded-lg hover:bg-success-600">
                                <CheckCircle size={16} />
                              </button>
                              <button onClick={cancelEdit} className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{formatDisplayValue(getFieldValue(`historyOfPresentIllness.${field.key}`))}</p>
                              {!signed && (
                                <button onClick={() => startEdit(`historyOfPresentIllness.${field.key}`, getFieldValue(`historyOfPresentIllness.${field.key}`))} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                                  <Edit2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <ProvenanceChip source={summary.historyOfPresentIllness?.source} confirmedBy={summary.historyOfPresentIllness?.confirmedBy} />
                    </div>
                  </div>
                </div>

                {/* Medical History Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Past Medical History */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Stethoscope size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Past Medical History</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      {editingField === 'pastMedicalHistory' ? (
                        <div className="flex gap-2">
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 border-2 border-primary-300 dark:border-primary-600 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="px-4 py-3 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 transition-colors">
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={cancelEdit} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex-1">{formatDisplayValue(getFieldValue('pastMedicalHistory'))}</p>
                          {!signed && (
                            <button onClick={() => startEdit('pastMedicalHistory', getFieldValue('pastMedicalHistory'))} className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
                              <Edit2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="mt-4">
                        <ProvenanceChip source={summary.pastMedicalHistory?.source} confirmedBy={summary.pastMedicalHistory?.confirmedBy} />
                      </div>
                    </div>
                  </div>

                  {/* Past Surgical History */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <FileCheck size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Past Surgical History</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      {editingField === 'pastSurgicalHistory' ? (
                        <div className="flex gap-2">
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 border-2 border-primary-300 dark:border-primary-600 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="px-4 py-3 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 transition-colors">
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={cancelEdit} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex-1">{formatDisplayValue(getFieldValue('pastSurgicalHistory'))}</p>
                          {!signed && (
                            <button onClick={() => startEdit('pastSurgicalHistory', getFieldValue('pastSurgicalHistory'))} className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
                              <Edit2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="mt-4">
                        <ProvenanceChip source={summary.pastSurgicalHistory?.source} confirmedBy={summary.pastSurgicalHistory?.confirmedBy} />
                      </div>
                    </div>
                  </div>

                  {/* Drug History */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Pill size={20} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Drug History</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      {editingField === 'drugHistory' ? (
                        <div className="flex gap-2">
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 border-2 border-primary-300 dark:border-primary-600 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="px-4 py-3 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 transition-colors">
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={cancelEdit} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex-1">{formatDisplayValue(getFieldValue('drugHistory'))}</p>
                          {!signed && (
                            <button onClick={() => startEdit('drugHistory', getFieldValue('drugHistory'))} className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
                              <Edit2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="mt-4">
                        <ProvenanceChip source={summary.drugHistory?.source} confirmedBy={summary.drugHistory?.confirmedBy} />
                      </div>
                    </div>
                  </div>

                  {/* Allergy History */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Allergy History</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      {editingField === 'allergyHistory' ? (
                        <div className="flex gap-2">
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 border-2 border-primary-300 dark:border-primary-600 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="px-4 py-3 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 transition-colors">
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={cancelEdit} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex-1">{formatDisplayValue(getFieldValue('allergyHistory'))}</p>
                          {!signed && (
                            <button onClick={() => startEdit('allergyHistory', getFieldValue('allergyHistory'))} className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
                              <Edit2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="mt-4">
                        <ProvenanceChip source={summary.allergyHistory?.source} confirmedBy={summary.allergyHistory?.confirmedBy} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Family History */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                        <Heart size={20} className="text-pink-600 dark:text-pink-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Family History</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    {editingField === 'familyHistory' ? (
                      <div className="flex gap-2">
                        <input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="flex-1 border-2 border-primary-300 dark:border-primary-600 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="px-4 py-3 bg-success-500 text-white rounded-xl font-medium hover:bg-success-600 transition-colors">
                          <CheckCircle size={18} />
                        </button>
                        <button onClick={cancelEdit} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex-1">{formatDisplayValue(getFieldValue('familyHistory'))}</p>
                        {!signed && (
                          <button onClick={() => startEdit('familyHistory', getFieldValue('familyHistory'))} className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
                            <Edit2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="mt-4">
                      <ProvenanceChip source={summary.familyHistory?.source} confirmedBy={summary.familyHistory?.confirmedBy} />
                    </div>
                  </div>
                </div>

                {/* Document Findings */}
                {summary?.documentFindings?.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <FileMedical size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Document Findings</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {summary.documentFindings.map((doc, i) => (
                        <div key={i} className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <FileText size={20} className="text-indigo-500" />
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{doc.docType}</p>
                            </div>
                            {doc.verifiedByPatient ? (
                              <span className="flex items-center gap-2 text-sm text-success-600 font-medium bg-success-50 dark:bg-success-900/20 px-3 py-1.5 rounded-full">
                                <CheckCircle size={16} /> Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-sm text-warning-600 font-medium bg-warning-50 dark:bg-warning-900/20 px-3 py-1.5 rounded-full">
                                <AlertTriangle size={16} /> Not verified
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <span className="font-medium">{doc.date}</span> · <span>{doc.provider}</span>
                          </div>
                          
                          {doc.labs?.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Lab Results</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-gray-500 text-xs uppercase bg-gray-50 dark:bg-gray-700">
                                      <th className="px-4 py-2 rounded-tl-lg">Lab</th>
                                      <th className="px-4 py-2">Value</th>
                                      <th className="px-4 py-2 rounded-tr-lg">Reference</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {doc.labs.map((lab, j) => (
                                      <tr key={j} className="border-t border-gray-100 dark:border-gray-700">
                                        <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{lab.name}</td>
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{lab.value} {lab.unit}</td>
                                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{lab.referenceRange}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          
                          {doc.medications?.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Medications</p>
                              <div className="space-y-2">
                                {doc.medications.map((med, j) => (
                                  <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <Pill size={18} className="text-orange-500" />
                                    <span className="text-sm text-gray-800 dark:text-gray-200">{med.name} {med.dose} — {med.frequency}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {doc.diagnoses?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Diagnoses</p>
                              <div className="space-y-2">
                                {doc.diagnoses.map((diag, j) => (
                                  <div key={j} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <AlertCircle size={18} className="text-red-500" />
                                    <span className="text-sm text-gray-800 dark:text-gray-200">{typeof diag === 'string' ? diag : diag.text}</span>
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
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <Clipboard size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 text-lg">No documents uploaded</p>
                  </div>
                )}

                {/* Doctor Notes */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-900/20 dark:to-gray-800/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center">
                        <FileText size={20} className="text-slate-600 dark:text-slate-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Doctor Notes</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      disabled={signed}
                      className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none text-base"
                      rows={4}
                      placeholder="Add your clinical notes here..."
                    />
                  </div>
                </div>

                {/* Sign Button */}
                {!signed && (
                  <button onClick={sign} disabled={signing}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-primary-200 dark:shadow-primary-900 transition-all hover:shadow-xl hover:shadow-primary-300 dark:hover:shadow-primary-800 flex items-center justify-center gap-3">
                    {signing ? <Save size={24} className="animate-spin" /> : <CheckCircle size={24} />}
                    {signing ? 'Signing...' : 'Sign & Complete Encounter'}
                    <ChevronRight size={24} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
