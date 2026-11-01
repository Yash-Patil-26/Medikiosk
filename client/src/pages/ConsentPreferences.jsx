import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, Shield, Volume2, FileText, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import UniversalHeader from '../components/UniversalHeader.jsx';
import api from '../services/api.js';

const CONSENT_ITEMS = [
  { key: 'voice', title: 'Voice processing', description: 'Allow voice input to be processed for transcription.', icon: Volume2 },
  { key: 'document', title: 'Document processing', description: 'Allow uploaded documents to be processed by the document extraction workflow.', icon: FileText },
  { key: 'his', title: 'Share with hospital information system', description: 'Allow a signed encounter summary to be shared with the connected mock hospital system.', icon: Database },
  { key: 'dashboard', title: 'Save to patient dashboard', description: 'Allow the application to save encounter information for future reference where supported.', icon: Shield }
];
const EMPTY_PREFERENCES = { voice: false, document: false, his: false, dashboard: false };

export default function ConsentPreferences({ mode = 'initial' }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isManageMode = mode === 'manage';
  const [preferences, setPreferences] = useState({ ...EMPTY_PREFERENCES });
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isManageMode && user?.consents) {
      setPreferences({ ...EMPTY_PREFERENCES, ...user.consents });
    }
  }, [isManageMode, user?.consents]);

  if (!user || user.role !== 'patient') return <Navigate to="/login" replace />;
  if (!isManageMode && user.hasConsentSetup) return <Navigate to="/me" replace />;

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (!understood) {
      setError('Please confirm that you understand how the selected information may be used.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/consent-preferences', {
        preferences,
        language: user.preferred_language || 'en',
        understood: true
      });
      await refreshUser();
      navigate('/me', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Your consent choices could not be saved. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20">
      <UniversalHeader />
      <div className="px-4 py-10 flex items-center justify-center">
        <main className="card w-full max-w-3xl p-6 sm:p-9 mt-20">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0">
              <Shield size={24} className="text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{isManageMode ? 'Manage consent preferences' : 'Your privacy and consent choices'}</h1>
              <p className="text-gray-500 mt-2">Choose which uses of information you allow. Each choice can be allowed or declined separately.</p>
            </div>
          </div>

        <div className="rounded-xl bg-primary-50 border border-primary-200 p-4 mt-5 mb-6 text-sm text-primary-900">
          {isManageMode
            ? 'These are the choices saved to your account. Changes apply to future sessions and update the permissions on any active sessions.'
            : 'These choices are saved to your account after registration. You will not be asked again at every session. You can change them later from your dashboard.'}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {CONSENT_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <label key={item.key} className="card p-4 sm:p-5 flex items-start gap-4 cursor-pointer hover:border-primary-200 transition-colors">
                <input type="checkbox" checked={Boolean(preferences[item.key])}
                  onChange={event => setPreferences(previous => ({ ...previous, [item.key]: event.target.checked }))}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-primary-600" />
                </div>
                <div className="flex-1">
                  <span className="block font-semibold text-gray-900">{item.title}</span>
                  <span className="block text-sm text-gray-500 mt-1">{item.description}</span>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${preferences[item.key] ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-600'}`}>
                  {preferences[item.key] ? 'Allowed' : 'Declined'}
                </span>
              </label>
            );
          })}

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 cursor-pointer">
            <input type="checkbox" checked={understood} onChange={event => setUnderstood(event.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">I have read and understood these choices, and I confirm the selections shown above.</span>
          </label>

          {error && <div role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 shadow-md">
            <Check size={18} /> {loading ? 'Saving choices…' : isManageMode ? 'Save preference changes' : 'Save choices and continue'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-5">Consent choices are recorded for traceability. This academic prototype does not provide legal advice or verify external health identifiers.</p>
      </main>
      </div>
    </div>
  );
}
