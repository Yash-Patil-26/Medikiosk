import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Lock, User } from 'lucide-react';
import UniversalHeader from '../components/UniversalHeader.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier_type: 'mobile', identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.identifier_type, form.identifier, form.password);
      if (user.role === 'patient') {
        navigate(user.hasConsentSetup ? '/me' : '/register/consent', { replace: true });
      } else {
        setError('This login is for patients only. Please use doctor login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const identifierLabel = form.identifier_type === 'abha'
    ? 'ABHA Number'
    : form.identifier_type === 'mobile'
      ? 'Mobile Number'
      : 'Email Address';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader />
      <div className="flex-1 flex items-center justify-center p-5">
        <main className="card w-full max-w-md p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">Patient Login</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 block">Sign in to your account</span>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Login ID Type
              <select value={form.identifier_type} onChange={e => setField('identifier_type', e.target.value)}
                className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100">
                <option value="mobile">Mobile Number</option>
                <option value="email">Email Address</option>
                <option value="abha">ABHA Number</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {identifierLabel}
              <div className="relative mt-1.5">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.identifier} onChange={e => setField('identifier', e.target.value)}
                  autoComplete="username" maxLength={254} required
                  type={form.identifier_type === 'email' ? 'email' : 'text'}
                  placeholder={form.identifier_type === 'abha' ? '14 digits' : form.identifier_type === 'mobile' ? '10 digits' : 'you@example.com'}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-gray-100" />
              </div>
            </label>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Password
              <div className="relative mt-1.5">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={form.password} onChange={e => setField('password', e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-gray-100"
                  autoComplete="current-password" maxLength={128} required />
              </div>
            </label>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">Forgot password?</Link>
            </div>

            {error && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 dark:bg-error-900/20 dark:border-error-800 p-3 text-sm text-error-700 dark:text-error-400">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-lg font-bold disabled:opacity-50 shadow-md">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
            New patient? <Link to="/register" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Create an account</Link>
          </p>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
            <Link to="/doctor/login" className="font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">Doctor login</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
