import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity, Lock, User, ArrowLeft } from 'lucide-react';

const ROLE_REDIRECTS = { doctor: '/doctor', triage: '/triage', admin: '/admin/audit' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ identifier_type: 'email', identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, value) => setForm(previous => ({ ...previous, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.identifier_type, form.identifier, form.password);
      if (user.role === 'patient') {
        navigate(user.hasConsentSetup ? '/me' : '/register/consent', { replace: true });
      } else {
        navigate(ROLE_REDIRECTS[user.role] || '/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your login ID and password.');
    } finally {
      setLoading(false);
    }
  };

  const identifierLabel = form.identifier_type === 'username'
    ? 'Staff username'
    : form.identifier_type === 'abha'
      ? 'ABHA number'
      : form.identifier_type === 'mobile'
        ? 'Mobile number'
        : 'Email address';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-5">
        <main className="card w-full max-w-md p-7 sm:p-8">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium">
            <ArrowLeft size={16} /> {t('back_to_home')}
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-800">MediKiosk</span>
              <span className="text-sm text-gray-500 block">Patient and staff sign-in</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h1>
          <p className="text-gray-500 mb-6 text-sm">Patients use the same ABHA number, mobile number or email they selected during registration. Staff use their username.</p>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="block text-sm font-semibold text-gray-700">
              Login ID type
              <select value={form.identifier_type} onChange={e => setField('identifier_type', e.target.value)}
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="email">Email address</option>
                <option value="mobile">Mobile number</option>
                <option value="abha">ABHA number</option>
                <option value="username">Staff username / legacy demo username</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              {identifierLabel}
              <div className="relative mt-2">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.identifier} onChange={e => setField('identifier', e.target.value)}
                  autoComplete="username" maxLength={254} required
                  type={form.identifier_type === 'email' ? 'email' : 'text'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white" />
              </div>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              {t('password')}
              <div className="relative mt-2">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={form.password} onChange={e => setField('password', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white"
                  autoComplete="current-password" maxLength={128} required />
              </div>
            </label>
            {form.identifier_type === 'username' && (
              <div className="rounded-xl bg-primary-50 border border-primary-200 p-4 text-sm text-primary-800">
                <strong className="block mb-2">Development demo staff accounts</strong>
                <div className="space-y-1 text-xs font-mono">
                  <p>doctor / Doctor@123</p>
                  <p>triage / Triage@123</p>
                  <p>admin / Admin@123</p>
                </div>
                <p className="text-xs mt-2">These demo credentials are for local project testing only.</p>
              </div>
            )}
            {error && <div role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 shadow-md">
              {loading ? 'Signing in…' : t('login')}
            </button>
          </form>
          <p className="text-sm text-center text-gray-500 mt-6">New patient? <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">Create an account</Link></p>
        </main>
      </div>
      <p className="text-center text-xs text-gray-400 p-5">Academic prototype. Identifier ownership is not verified by OTP or a government health identity service.</p>
    </div>
  );
}
