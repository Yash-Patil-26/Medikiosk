import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DemoBanner />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Activity size={28} className="text-blue-600" />
            <span className="text-xl font-bold text-blue-700">MediKiosk</span>
          </div>
          <h1 className="text-xl font-bold text-center text-gray-800 mb-6">{t('login_title')}</h1>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-xs text-blue-700">
            <strong>{t('demo_accounts_label')}</strong><br />
            doctor / Doctor@123 · triage / Triage@123<br />
            admin / Admin@123 · patient / Patient@123
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="doctor" autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50">
              {loading ? t('logging_in') : t('login')}
            </button>
          </form>
          <button onClick={() => navigate('/')} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700">
            {t('back_to_home')}
          </button>
        </div>
      </div>
    </div>
  );
}
