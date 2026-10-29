import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Shield, User, LogOut, ArrowRight, ClipboardList, CheckCircle2, Circle, Settings2, Download, History, FileText, Calendar, X, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useKiosk } from '../context/KioskContext.jsx';
import api from '../services/api.js';

function maskLoginId(value, type) {
  if (!value) return 'Not available';
  if (type === 'email') {
    const [name, domain] = value.split('@');
    return domain ? `${name.slice(0, 1)}•••@${domain}` : '••••';
  }
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

export default function PatientDashboard() {
  const { user, logout, updateUser } = useAuth();
  const { kiosk, update, reset } = useKiosk();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const [encounters, setEncounters] = useState([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    date_of_birth: '',
    sex: '',
    preferred_language: '',
    identifier_type: '',
    identifier: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const openEditModal = () => {
    setEditForm({
      display_name: user.display_name || '',
      date_of_birth: user.date_of_birth || '',
      sex: user.sex || 'prefer_not_to_say',
      preferred_language: user.preferred_language || 'en',
      identifier_type: user.login_identifier_type || 'mobile',
      identifier: user.login_identifier || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError('');
  };

  const saveAccountDetails = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);

    try {
      const updateData = {
        display_name: editForm.display_name,
        date_of_birth: editForm.date_of_birth,
        sex: editForm.sex,
        preferred_language: editForm.preferred_language,
        identifier_type: editForm.identifier_type,
        identifier: editForm.identifier
      };

      if (editForm.new_password) {
        if (editForm.new_password !== editForm.confirm_password) {
          setEditError('New passwords do not match.');
          setEditLoading(false);
          return;
        }
        updateData.current_password = editForm.current_password;
        updateData.new_password = editForm.new_password;
      }

      const response = await api.patch('/patients/me', updateData);
      updateUser(response.data);
      closeEditModal();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update account details. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const startSession = async () => {
    setStarting(true);
    setError('');
    try {
      const response = await api.post('/sessions', {
        language: user.preferred_language || 'en',
        ayush_mode: Boolean(kiosk.ayushMode)
      });
      update({
        patientId: response.data.patient_id,
        sessionId: response.data.id,
        language: response.data.language || user.preferred_language || 'en',
        consents: response.data.consents || user.consents || {},
        complaint: null,
        slots: {},
        encounterId: null
      });
      navigate('/kiosk/complaint');
    } catch (err) {
      setError(err.response?.data?.error || 'A new intake session could not be started. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const signOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // The local UI is still cleared below if the server is unavailable.
    } finally {
      reset();
      setLoggingOut(false);
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    const loadEncounters = async () => {
      setLoadingEncounters(true);
      try {
        const r = await api.get('/patients/my-encounters');
        setEncounters(r.data || []);
      } catch {
        // No encounters yet or error loading
      } finally {
        setLoadingEncounters(false);
      }
    };
    loadEncounters();
  }, []);

  const downloadEncounterSummary = async (encounterId, tokenNo) => {
    try {
      const r = await api.get(`/encounters/${encounterId}/summary`);
      const encounter = r.data;
      const summary = encounter.summary_draft_json || encounter.summary_final_json || {};
      const docs = encounter.documents || [];
      const flags = Array.isArray(encounter.red_flag_reasons)
        ? encounter.red_flag_reasons
        : (encounter.red_flag_reasons ? JSON.parse(encounter.red_flag_reasons) : []);

      const hpiFields = [
        { key: 'site', label: 'Location' },
        { key: 'onset', label: 'Onset' },
        { key: 'character', label: 'Character' },
        { key: 'radiation', label: 'Radiation' },
        { key: 'severity', label: 'Severity' },
        { key: 'duration', label: 'Duration' },
        { key: 'breathingDifficulty', label: 'Breathing Difficulty' }
      ];

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

      const summaryContent = `
        <html>
          <head>
            <title>MediKiosk Encounter Summary - ${tokenNo}</title>
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
              <p>Token No: ${tokenNo}</p>
              <p>Date: ${new Date(encounter.created_at).toLocaleString()}</p>
              <p>Status: ${encounter.status?.toUpperCase()}</p>
            </div>

            ${encounter.red_flag_level && encounter.red_flag_level !== 'none' ? `
              <div class="${encounter.red_flag_level === 'critical' ? 'flag-critical' : 'flag-warning'}">
                <strong>⚠️ RED FLAG: ${encounter.red_flag_level?.toUpperCase()}</strong>
                <p>${flags.join(', ')}</p>
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
                <span class="field-value">${encounter.language || 'en'}</span>
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
              `;
              }).join('')}
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

            ${summary.documentFindings?.length > 0 ? `
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
                <span class="field-value">${encounter.doctor_notes || 'No notes provided'}</span>
              </div>
            </div>

            <div class="footer">
              <p>Generated by MediKiosk - AI-Assisted Pre-Consultation Clinical Information System</p>
              <p>This is a synthetic demo document. Not for actual clinical use.</p>
              <p>Encounter ID: ${encounterId} | Signed at: ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([summaryContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `encounter-summary-${tokenNo}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const consentEntries = [
    ['voice', 'Voice processing'],
    ['document', 'Document processing'],
    ['his', 'Hospital system sharing'],
    ['dashboard', 'Save to dashboard']
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20">
      <header className="bg-white/90 backdrop-blur border-b border-gray-200 px-5 sm:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md"><Activity size={20} className="text-white" /></div>
          <div><strong className="block text-gray-900">MediKiosk</strong><span className="text-xs text-gray-500">Patient dashboard</span></div>
        </div>
        <button onClick={signOut} disabled={loggingOut} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
          <LogOut size={16} /> {loggingOut ? 'Signing out…' : 'Log out'}
        </button>
      </header>

      <main className="max-w-5xl mx-auto w-full p-5 sm:p-8 space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary-600">WELCOME BACK</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">{user.display_name || 'Patient'}</h1>
            <p className="text-gray-500 mt-2">Start a new intake session or review your saved privacy choices.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-success-700 bg-success-50 border border-success-200 rounded-full px-3 py-2 w-fit">
            <CheckCircle2 size={15} /> Account signed in
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-6 lg:col-span-2">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4"><ClipboardList size={24} className="text-primary-600" /></div>
            <h2 className="text-xl font-bold text-gray-900">Start a new intake</h2>
            <p className="text-sm text-gray-500 mt-2 mb-5">Your saved consent choices will automatically be applied to the new session. You will not be prompted to consent again unless the consent notice requires an update.</p>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 mb-5 cursor-pointer">
              <input type="checkbox" checked={Boolean(kiosk.ayushMode)} onChange={event => update({ ayushMode: event.target.checked })} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span><strong className="block text-sm text-gray-800">AYUSH / Ayurveda consultation</strong><span className="block text-xs text-gray-500 mt-1">Enable additional questions about Prakriti, Agni, diet and lifestyle.</span></span>
            </label>
            {error && <div role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700 mb-4">{error}</div>}
            <button onClick={startSession} disabled={starting} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl px-6 py-3 font-semibold shadow-md disabled:opacity-50">
              {starting ? 'Starting session…' : 'Start new intake'} <ArrowRight size={18} />
            </button>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center"><User size={24} className="text-gray-600" /></div>
              <button onClick={openEditModal} className="text-sm font-semibold text-primary-600 hover:text-primary-700">Edit</button>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Account details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-gray-500">Login ID type</dt><dd className="font-semibold text-gray-800 capitalize">{user.login_identifier_type || 'Username'}</dd></div>
              <div><dt className="text-gray-500">Registered login ID</dt><dd className="font-mono text-gray-800 break-all">{maskLoginId(user.login_identifier, user.login_identifier_type)}</dd></div>
              <div><dt className="text-gray-500">Preferred language</dt><dd className="font-semibold text-gray-800">{{ en: 'English', hi: 'Hindi', mr: 'Marathi' }[user.preferred_language] || 'English'}</dd></div>
            </dl>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0"><Shield size={20} className="text-primary-600" /></div>
              <div><h2 className="text-lg font-bold text-gray-900">Saved privacy choices</h2><p className="text-sm text-gray-500 mt-1">Your choices are saved to your account and applied to new sessions.</p></div>
            </div>
            <Link to="/me/consent" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 shrink-0"><Settings2 size={16} /> Manage</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {consentEntries.map(([key, label]) => {
              const granted = Boolean(user.consents?.[key]);
              const Icon = granted ? CheckCircle2 : Circle;
              return <div key={key} className="flex items-center gap-2 text-sm rounded-lg bg-gray-50 px-3 py-3">
                <Icon size={17} className={granted ? 'text-success-600' : 'text-gray-400'} />
                <span className="text-gray-700">{label}</span>
                <span className={`ml-auto text-xs font-semibold ${granted ? 'text-success-700' : 'text-gray-500'}`}>{granted ? 'Allowed' : 'Declined'}</span>
              </div>;
            })}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><History size={20} className="text-gray-600" /></div>
            <div><h2 className="text-lg font-bold text-gray-900">Patient Profile & History</h2><p className="text-sm text-gray-500 mt-1">View and download your encounter summaries from completed sessions.</p></div>
          </div>
          
          {loadingEncounters ? (
            <div className="text-center py-8 text-gray-500">Loading your history...</div>
          ) : encounters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No completed encounters yet.</p>
              <p className="text-sm mt-2">Complete a kiosk session and have the doctor sign it to see your history here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {encounters.map(enc => (
                <div key={enc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <FileText size={18} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{enc.token_no}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} /> {new Date(enc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      enc.status === 'signed' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                    }`}>
                      {enc.status}
                    </span>
                    {enc.status === 'signed' && (
                      <button 
                        onClick={() => downloadEncounterSummary(enc.id, enc.token_no)}
                        className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"
                        title="Download summary"
                      >
                        <Download size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-relaxed text-gray-400">MediKiosk is an academic prototype. Do not use real patient data in demonstrations. Login identifiers are not verified through OTP or the official ABHA/ABDM services.</p>
      </main>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Account Details</h2>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={saveAccountDetails} className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Full Name
                <input
                  value={editForm.display_name}
                  onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Date of Birth
                <input
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                  max={new Date().toISOString().slice(0, 10)}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Sex
                <select
                  value={editForm.sex}
                  onChange={e => setEditForm({ ...editForm, sex: e.target.value })}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Preferred Language
                <select
                  value={editForm.preferred_language}
                  onChange={e => setEditForm({ ...editForm, preferred_language: e.target.value })}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Login ID Type
                <select
                  value={editForm.identifier_type}
                  onChange={e => setEditForm({ ...editForm, identifier_type: e.target.value })}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="mobile">Mobile Number</option>
                  <option value="email">Email Address</option>
                  <option value="abha">ABHA Number</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                {editForm.identifier_type === 'abha' ? 'ABHA Number' : editForm.identifier_type === 'mobile' ? 'Mobile Number' : 'Email Address'}
                <input
                  value={editForm.identifier}
                  onChange={e => setEditForm({ ...editForm, identifier: e.target.value })}
                  type={editForm.identifier_type === 'email' ? 'email' : 'text'}
                  inputMode={editForm.identifier_type === 'email' ? 'email' : 'numeric'}
                  maxLength={editForm.identifier_type === 'abha' ? 14 : editForm.identifier_type === 'mobile' ? 10 : 254}
                  placeholder={editForm.identifier_type === 'abha' ? '14 digits' : editForm.identifier_type === 'mobile' ? '10 digits' : 'you@example.com'}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </label>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Change Password (Optional)</p>
                
                <label className="block text-sm font-semibold text-gray-700">
                  Current Password
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={editForm.current_password}
                      onChange={e => setEditForm({ ...editForm, current_password: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="block text-sm font-semibold text-gray-700">
                  New Password
                  <div className="relative mt-1.5">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={editForm.new_password}
                      onChange={e => setEditForm({ ...editForm, new_password: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="block text-sm font-semibold text-gray-700">
                  Confirm New Password
                  <input
                    type="password"
                    value={editForm.confirm_password}
                    onChange={e => setEditForm({ ...editForm, confirm_password: e.target.value })}
                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
              </div>

              {editError && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700">{editError}</div>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
