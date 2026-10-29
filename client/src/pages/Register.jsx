import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';
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

const IDENTIFIER_HINTS = {
  abha: 'Enter the 14-digit ABHA number you want to use as your login ID.',
  mobile: 'Enter an Indian mobile number. A country code +91 is also accepted.',
  email: 'Use the email address you want to use as your login ID.'
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field, value) => setForm(previous => ({ ...previous, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('The passwords do not match.');
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
      // Redirect based on role
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
      <main className="card w-full max-w-2xl p-6 sm:p-9">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">Create your MediKiosk account</div>
            <p className="text-sm text-gray-500">Register once, then sign in with the same login ID.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5" noValidate>
          <label className="block text-sm font-semibold text-gray-700">
            Account type
            <select value={form.role} onChange={e => setField('role', e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold text-gray-700">
              Full name
              <input value={form.display_name} onChange={e => setField('display_name', e.target.value)}
                autoComplete="name" maxLength={100} required
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </label>
            
            {form.role === 'patient' && (
              <>
                <label className="block text-sm font-semibold text-gray-700">
                  Date of birth
                  <input type="date" value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)}
                    max={new Date().toISOString().slice(0, 10)} required
                    className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Sex
                  <select value={form.sex} onChange={e => setField('sex', e.target.value)}
                    className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Preferred language
                  <select value={form.preferred_language} onChange={e => setField('preferred_language', e.target.value)}
                    className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                  </select>
                </label>
              </>
            )}
          </div>

          {form.role === 'patient' && (
            <div className="border-t border-gray-100 pt-5">
              <h2 className="font-bold text-gray-900 mb-1">Choose your login ID</h2>
              <p className="text-sm text-gray-500 mb-4">Select one ID. You will use the same type and value each time you log in.</p>
              <label className="block text-sm font-semibold text-gray-700">
                Login ID type
                <select value={form.identifier_type} onChange={e => { setField('identifier_type', e.target.value); setField('identifier', ''); }}
                  className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="mobile">Mobile number</option>
                  <option value="email">Email address</option>
                  <option value="abha">ABHA number</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700 mt-4">
                {form.identifier_type === 'abha' ? 'ABHA number' : form.identifier_type === 'mobile' ? 'Mobile number' : 'Email address'}
                <input value={form.identifier} onChange={e => setField('identifier', e.target.value)} required
                  type={form.identifier_type === 'email' ? 'email' : 'text'}
                  inputMode={form.identifier_type === 'email' ? 'email' : 'numeric'}
                  autoComplete={form.identifier_type === 'email' ? 'email' : 'off'}
                  maxLength={254} placeholder={form.identifier_type === 'abha' ? '14 digits' : form.identifier_type === 'mobile' ? '10-digit mobile number' : 'you@example.com'}
                  className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </label>
              <p className="text-xs text-gray-500 mt-2">{IDENTIFIER_HINTS[form.identifier_type]}</p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                Prototype limitation: this form validates the identifier's format but does not verify ownership through OTP or an ABDM/ABHA service. Use synthetic data for demonstrations.
              </p>
            </div>
          )}

          {form.role !== 'patient' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">{form.role === 'doctor' ? 'Doctor' : 'Staff'} accounts will use their full name as the username.</p>
                  <p className="mt-1">After registration, you can sign in using your name and password.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-5">
            <label className="block text-sm font-semibold text-gray-700">
              Password
              <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <span className="block text-xs text-gray-500 font-normal mt-1">Use at least 10 characters.</span>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Confirm password
              <input type="password" value={form.confirm_password} onChange={e => setField('confirm_password', e.target.value)} maxLength={128} autoComplete="new-password" required
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </label>
          </div>

          {error && <div role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 shadow-md">
            <UserPlus size={18} /> {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">Already registered? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link></p>
      </main>
    </div>
  );
}
