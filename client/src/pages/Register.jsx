import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

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
    if (field === 'identifier' && form.role === 'patient') {
      validateIdentifier(value, form.identifier_type);
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
    
    // Validate identifier for patients
    if (form.role === 'patient' && !validateIdentifier(form.identifier, form.identifier_type)) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 px-4 py-10 flex items-center justify-center">
      <main className="card w-full max-w-md p-6 sm:p-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">Create Account</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block text-sm font-semibold text-gray-700">
            Account Type
            <select value={form.role} onChange={e => setField('role', e.target.value)}
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-gray-700">
            Full Name
            <input value={form.display_name} onChange={e => setField('display_name', e.target.value)}
              autoComplete="name" maxLength={100} required
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </label>
          
          {form.role === 'patient' && (
            <>
              <label className="block text-sm font-semibold text-gray-700">
                Date of Birth
                <input type="date" value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)}
                  max={new Date().toISOString().slice(0, 10)} required
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Sex
                <select value={form.sex} onChange={e => setField('sex', e.target.value)}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Login ID Type
                <select value={form.identifier_type} onChange={e => { setField('identifier_type', e.target.value); setField('identifier', ''); setIdentifierError(''); }}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="mobile">Mobile Number</option>
                  <option value="email">Email Address</option>
                  <option value="abha">ABHA Number</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                {form.identifier_type === 'abha' ? 'ABHA Number' : form.identifier_type === 'mobile' ? 'Mobile Number' : 'Email Address'}
                <input value={form.identifier} onChange={e => setField('identifier', e.target.value)} required
                  type={form.identifier_type === 'email' ? 'email' : 'text'}
                  inputMode={form.identifier_type === 'email' ? 'email' : 'numeric'}
                  autoComplete={form.identifier_type === 'email' ? 'email' : 'off'}
                  maxLength={form.identifier_type === 'abha' ? 14 : form.identifier_type === 'mobile' ? 10 : 254}
                  placeholder={form.identifier_type === 'abha' ? '14 digits' : form.identifier_type === 'mobile' ? '10 digits' : 'you@example.com'}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </label>
                {identifierError && <p className="text-xs text-error-600 mt-1">{identifierError}</p>}
            </>
          )}

          <label className="block text-sm font-semibold text-gray-700">
            Password
            <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} maxLength={128} autoComplete="new-password" required
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {form.password && (
              <div className="mt-2 space-y-1">
                {getPasswordStrength(form.password).map(rule => (
                  <div key={rule.name} className="flex items-center gap-2 text-xs">
                    {rule.test ? <Check size={12} className="text-success-600" /> : <X size={12} className="text-gray-400" />}
                    <span className={rule.test ? 'text-success-700' : 'text-gray-500'}>{rule.name}</span>
                  </div>
                ))}
              </div>
            )}
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Confirm Password
            <input type="password" value={form.confirm_password} onChange={e => setField('confirm_password', e.target.value)} maxLength={128} autoComplete="new-password" required
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </label>

          {error && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-lg font-bold disabled:opacity-50 shadow-md">
            <UserPlus size={18} /> {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">Already registered? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link></p>
      </main>
    </div>
  );
}
