import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Shield, User, LogOut, ArrowRight, ClipboardList, CheckCircle2, Circle, Settings2 } from 'lucide-react';
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
  const { user, logout } = useAuth();
  const { kiosk, update, reset } = useKiosk();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

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
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4"><User size={24} className="text-gray-600" /></div>
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

        <p className="text-xs leading-relaxed text-gray-400">MediKiosk is an academic prototype. Do not use real patient data in demonstrations. Login identifiers are not verified through OTP or the official ABHA/ABDM services.</p>
      </main>
    </div>
  );
}
