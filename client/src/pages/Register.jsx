import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import UniversalHeader from '../components/UniversalHeader.jsx';

const EMPTY_FORM = {
  role: 'patient',
  display_name: '',
  date_of_birth: '',
  sex: 'prefer_not_to_say',
  preferred_language: 'en',
  identifier_type: 'mobile',
  identifier: '',
  password: '',
  confirm_password: ''
};

const VALIDATION_RULES = {
  mobile: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Mobile number must be 10 digits starting with 6, 7, 8, or 9'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  abha: {
    pattern: /^\d{14}$/,
    message: 'ABHA number must be exactly 14 digits'
  },
  username: {
    pattern: /^[a-zA-Z0-9_]{3,50}$/,
    message: 'Username must be 3-50 characters (letters, numbers, underscore)'
  }
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState('');

  const setField = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
    if (field === 'identifier' && (form.role === 'patient' || form.role === 'doctor')) {
      validateIdentifier(value, form.identifier_type);
    }
    if (field === 'role') {
      // Reset identifier type based on role
      if (value === 'doctor') {
        setForm(prev => ({ ...prev, identifier_type: 'username', identifier: '' }));
        setIdentifierError('');
      } else if (value === 'patient') {
        setForm(prev => ({ ...prev, identifier_type: 'mobile', identifier: '' }));
        setIdentifierError('');
      }
    }
  };

  const validateIdentifier = (value, type) => {
    if (!value) {
      setIdentifierError('This field is required');
      return false;
    }
    const rule = VALIDATION_RULES[type];
    if (rule && !rule.pattern.test(value)) {
      setIdentifierError(rule.message);
      return false;
    }
    setIdentifierError('');
    return true;
  };

  const getPasswordStrength = (password) => {
    const rules = [
      { name: '10+ characters', test: password.length >= 10 },
      { name: 'Uppercase letter', test: /[A-Z]/.test(password) },
      { name: 'Lowercase letter', test: /[a-z]/.test(password) },
      { name: 'Number', test: /\d/.test(password) },
      { name: 'Special character', test: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
    ];
    return rules;
  };

  const submit = async event => {
    event.preventDefault();
    setError('');
    
    // Validate identifier for patients and doctors
    if ((form.role === 'patient' || form.role === 'doctor') && !validateIdentifier(form.identifier, form.identifier_type)) {
      return;
    }

    if (form.password !== form.confirm_password) {
      setError('The passwords do not match.');
      return;
    }

    const passwordRules = getPasswordStrength(form.password);
    if (!passwordRules.every(r => r.test)) {
      setError('Password does not meet all requirements');
      return;
    }

    setLoading(true);
    try {
      await register({
        role: form.role,
        display_name: form.display_name,
        date_of_birth: form.date_of_birth,
        sex: form.sex,
        preferred_language: form.preferred_language,
        identifier_type: form.identifier_type,
        identifier: form.identifier,
        password: form.password
      });
      if (form.role === 'patient') {
        navigate('/register/consent', { replace: true });
      } else {
        navigate('/login', { replace: true, state: { message: 'Registration successful. Please sign in.' } });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader />
      <div className="flex-1 flex items-center justify-center p-5">
        <main className="card w-full max-w-md p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">Create Account</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 block">to get started</span>
            </div>
          </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Account Type
            <select value={form.role} onChange={e => setField('role', e.target.value)}
              className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100">
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Full Name
            <input value={form.display_name} onChange={e => setField('display_name', e.target.value)}
              autoComplete="name" maxLength={100} required
              className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100" />
          </label>

          {form.role === 'patient' && (
            <>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Date of Birth
                <input type="date" value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)}
                  max={new Date().toISOString().slice(0, 10)} required
                  className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100" />
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sex
                <select value={form.sex} onChange={e => setField('sex', e.target.value)}
                  className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100">
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Login ID Type
                <select value={form.identifier_type} onChange={e => { setField('identifier_type', e.target.value); setField('identifier', ''); setIdentifierError(''); }}
                  className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100">
                  <option value="mobile">Mobile Number</option>
                  <option value="email">Email Address</option>
                  <option value="abha">ABHA Number</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {form.identifier_type === 'abha' ? 'ABHA Number' : form.identifier_type === 'mobile' ? 'Mobile Number' : 'Email Address'}
                <input value={form.identifier} onChange={e => setField('identifier', e.target.value)} required
                  type={form.identifier_type === 'email' ? 'email' : 'text'}
                  inputMode={form.identifier_type === 'email' ? 'email' : 'numeric'}
                  autoComplete={form.identifier_type === 'email' ? 'email' : 'off'}
                  maxLength={form.identifier_type === 'abha' ? 14 : form.identifier_type === 'mobile' ? 10 : 254}
                  placeholder={form.identifier_type === 'abha' ? '14 digits' : form.identifier_type === 'mobile' ? '10 digits' : 'you@example.com'}
                  className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100" />
                </label>
                {identifierError && <p className="text-xs text-error-600 dark:text-error-400 mt-1">{identifierError}</p>}
            </>
          )}

          {form.role === 'doctor' && (
            <>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Login ID Type
                <select value={form.identifier_type} onChange={e => { setField('identifier_type', e.target.value); setField('identifier', ''); setIdentifierError(''); }}
                  className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100">
                  <option value="username">Username</option>
                  <option value="email">Email Address</option>
                  <option value="mobile">Mobile Number</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {form.identifier_type === 'username' ? 'Username' : form.identifier_type === 'mobile' ? 'Mobile Number' : 'Email Address'}
                <input value={form.identifier} onChange={e => setField('identifier', e.target.value)} required
                  type={form.identifier_type === 'email' ? 'email' : 'text'}
                  inputMode={form.identifier_type === 'email' ? 'email' : form.identifier_type === 'mobile' ? 'numeric' : 'text'}
                  autoComplete={form.identifier_type === 'email' ? 'email' : 'off'}
                  maxLength={form.identifier_type === 'mobile' ? 10 : 254}
                  placeholder={form.identifier_type === 'username' ? 'Your username' : form.identifier_type === 'mobile' ? '10 digits' : 'you@example.com'}
                  className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100" />
                </label>
                {identifierError && <p className="text-xs text-error-600 dark:text-error-400 mt-1">{identifierError}</p>}
            </>
          )}

          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Password
            <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} maxLength={128} autoComplete="new-password" required
              className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100" />
            {form.password && (
              <div className="mt-2 space-y-1">
                {getPasswordStrength(form.password).map(rule => (
                  <div key={rule.name} className="flex items-center gap-2 text-xs">
                    {rule.test ? <Check size={12} className="text-success-600 dark:text-success-400" /> : <X size={12} className="text-gray-400 dark:text-gray-500" />}
                    <span className={rule.test ? 'text-success-700 dark:text-success-400' : 'text-gray-500 dark:text-gray-400'}>{rule.name}</span>
                  </div>
                ))}
              </div>
            )}
          </label>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Confirm Password
            <input type="password" value={form.confirm_password} onChange={e => setField('confirm_password', e.target.value)} maxLength={128} autoComplete="new-password" required
              className="mt-1.5 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100" />
          </label>

          {error && <div role="alert" className="rounded-lg border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20 p-3 text-sm text-error-700 dark:text-error-400">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-lg font-bold disabled:opacity-50 shadow-md">
            <UserPlus size={18} /> {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">Already registered? <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Sign in</Link></p>
      </main>
      </div>
    </div>
  );
}
