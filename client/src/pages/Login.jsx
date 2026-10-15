import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity, Lock, User, ArrowLeft } from 'lucide-react';
import DemoBanner from '../components/DemoBanner.jsx';

const ROLE_REDIRECTS = { doctor: '/doctor', triage: '/triage', admin: '/admin/audit', patient: '/me' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(form.username, form.password);
      navigate(ROLE_REDIRECTS[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <DemoBanner />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card w-full max-w-md p-8 animate-scale-in">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium transition-colors">
            <ArrowLeft size={16} />
            {t('back_to_home')}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-800">MediKiosk</span>
              <span className="text-sm text-gray-500 block">Staff Portal</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('login_title')}</h1>
          <p className="text-gray-500 mb-6">Sign in to access your dashboard</p>

          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 text-sm text-primary-700">
            <strong className="block mb-2">{t('demo_accounts_label')}</strong>
            <div className="space-y-1 text-xs">
              <p><span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">doctor</span> / <span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">Doctor@123</span></p>
              <p><span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">triage</span> / <span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">Triage@123</span></p>
              <p><span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">admin</span> / <span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">Admin@123</span></p>
              <p><span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">patient</span> / <span className="font-mono bg-white/50 px-1.5 py-0.5 rounded">Patient@123</span></p>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="username">{t('username')}</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input id="username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  placeholder="doctor" autoComplete="username" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">{t('password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input id="password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  placeholder="•••••••••" autoComplete="current-password" required />
              </div>
            </div>
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2 animate-slide-down">
                <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-error-700 text-xs font-bold">!</span>
                </span>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all hover:shadow-lg">
              {loading ? t('logging_in') : t('login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
