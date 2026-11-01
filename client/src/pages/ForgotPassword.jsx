import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Check, X } from 'lucide-react';
import UniversalHeader from '../components/UniversalHeader.jsx';
import api from '../services/api.js';

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifierType, setIdentifierType] = useState('mobile');
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateIdentifier = (value, type) => {
    if (!value) {
      setIdentifierError('');
      return false;
    }
    const rule = VALIDATION_RULES[type];
    if (!rule.pattern.test(value)) {
      setIdentifierError(rule.message);
      return false;
    }
    setIdentifierError('');
    return true;
  };

  const getPasswordStrength = (password) => {
    const checks = [
      { name: '10+ characters', test: password.length >= 10 },
      { name: 'Uppercase letter', test: /[A-Z]/.test(password) },
      { name: 'Lowercase letter', test: /[a-z]/.test(password) },
      { name: 'Number', test: /\d/.test(password) },
      { name: 'Special character', test: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
    ];
    return checks;
  };

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateIdentifier(identifier, identifierType)) {
      setError('Please enter a valid identifier');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        identifier_type: identifierType,
        identifier: identifier
      });
      setSuccess('Identifier verified. Please set your new password.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Identifier not found. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    const strength = getPasswordStrength(newPassword);
    if (!strength.every(check => check.test)) {
      setPasswordError('Password does not meet all requirements');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        identifier_type: identifierType,
        identifier: identifier,
        new_password: newPassword
      });
      setSuccess('Password reset successfully. You can now sign in with your new password.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const identifierLabel = identifierType === 'abha'
    ? 'ABHA Number'
    : identifierType === 'mobile'
      ? 'Mobile Number'
      : 'Email Address';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <UniversalHeader />
      <div className="flex-1 flex items-center justify-center p-5">
        <main className="card w-full max-w-md p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/login')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <span className="text-2xl font-bold text-gray-800">Reset Password</span>
              <span className="text-sm text-gray-500 block">
                {step === 1 ? 'Verify your identity' : 'Set new password'}
              </span>
            </div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleIdentifierSubmit} className="flex flex-col gap-4">
              <label className="block text-sm font-semibold text-gray-700">
                Login ID Type
                <select
                  value={identifierType}
                  onChange={(e) => {
                    setIdentifierType(e.target.value);
                    setIdentifier('');
                    setIdentifierError('');
                  }}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="mobile">Mobile Number</option>
                  <option value="email">Email Address</option>
                  <option value="abha">ABHA Number</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                {identifierLabel}
                <input
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    validateIdentifier(e.target.value, identifierType);
                  }}
                  type={identifierType === 'email' ? 'email' : 'text'}
                  placeholder={identifierType === 'abha' ? '14 digits' : identifierType === 'mobile' ? '10 digits' : 'you@example.com'}
                  maxLength={identifierType === 'abha' ? 14 : identifierType === 'mobile' ? 10 : 254}
                  required
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {identifierError && <p className="text-xs text-error-600 mt-1">{identifierError}</p>}
              </label>

              {error && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700">{error}</div>}
              {success && <div role="alert" className="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700">{success}</div>}

              <button
                type="submit"
                disabled={loading || identifierError}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-lg font-bold disabled:opacity-50 shadow-md"
              >
                {loading ? 'Verifying…' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <label className="block text-sm font-semibold text-gray-700">
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  maxLength={128}
                  required
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    {getPasswordStrength(newPassword).map(rule => (
                      <div key={rule.name} className="flex items-center gap-2 text-xs">
                        {rule.test ? <Check size={12} className="text-success-600" /> : <X size={12} className="text-gray-400" />}
                        <span className={rule.test ? 'text-success-700' : 'text-gray-500'}>{rule.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Confirm New Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={128}
                  required
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {passwordError && <p className="text-xs text-error-600 mt-1">{passwordError}</p>}
              </label>

              {error && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700">{error}</div>}
              {success && <div role="alert" className="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700">{success}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-lg font-bold disabled:opacity-50 shadow-md"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="text-sm text-center text-gray-500 mt-6">
            Remember your password? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
