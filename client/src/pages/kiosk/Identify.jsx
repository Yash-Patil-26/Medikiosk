import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Phone, UserPlus, ArrowRight } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import api from '../../services/api.js';

export default function Identify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update } = useKiosk();
  const [mode, setMode] = useState(null);
  const [abha, setAbha] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createPatient = async () => {
    setLoading(true); setError('');
    try {
      const r = await api.post('/patients', {
        preferred_language: kiosk.language
      });

      if (!r.data?.id || typeof r.data?.enrollmentToken !== 'string') {
        throw new Error('Patient enrollment credential was not issued');
      }

      update({ patientId: r.data.id });
      navigate('/kiosk/consent');
    } catch {
      setError('Could not create patient record');
    } finally {
      setLoading(false);
    }
  };

  const handleAbha = () => {
    const cleanAbha = abha.replace(/-/g, '');
    if (!/^\d{14}$/.test(cleanAbha)) {
      setError('Enter a 14-digit synthetic demo value only; do not use a real ABHA number');
      return;
    }
    createPatient();
  };

  const sendOtp = () => { setOtpSent(true); setError(''); };

  const verifyOtp = () => {
    if (otp !== '123456') { setError('Invalid OTP. Demo OTP is 123456'); return; }
    createPatient();
  };

  return (
    <KioskShell step="Identify">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('identify_title')}</h1>
          <p className="text-gray-500 text-lg">{t('identify_subtitle')}</p>
        </div>

        {!mode && (
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => setMode('abha')} className="card card-hover flex items-center gap-5 p-6 transition-all touch-target-lg group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard size={32} className="text-primary-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-800 text-lg">{t('abha_card')}</p>
                <p className="text-sm text-gray-500">{t('abha_desc')}</p>
              </div>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </button>
            <button onClick={() => setMode('mobile')} className="card card-hover flex items-center gap-5 p-6 transition-all touch-target-lg group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone size={32} className="text-primary-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-800 text-lg">{t('mobile_otp')}</p>
                <p className="text-sm text-gray-500">{t('mobile_desc')}</p>
              </div>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </button>
            <button onClick={() => setMode('new')} className="card card-hover flex items-center gap-5 p-6 transition-all touch-target-lg group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus size={32} className="text-success-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-800 text-lg">{t('new_patient')}</p>
                <p className="text-sm text-gray-500">{t('new_patient_desc')}</p>
              </div>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-success-500 transition-colors" />
            </button>
          </div>
        )}

        {mode === 'abha' && (
          <div className="card p-6 animate-scale-in">
            <label className="font-semibold text-gray-700 mb-2 block" htmlFor="abha-input">Synthetic demo ABHA value (14 digits only)</label>
            <input id="abha-input" value={abha} onChange={e => setAbha(e.target.value)} placeholder="12345678901234"
              className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
              maxLength={14} />
            {error && (
              <div className="mt-3 bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-error-700 text-xs font-bold">!</span>
                </span>
                {error}
              </div>
            )}
            <button onClick={handleAbha} disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all">
              {loading ? t('please_wait') : t('continue')}
            </button>
            <button onClick={() => { setMode(null); setError(''); }} className="w-full mt-3 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors">
              {t('back')}
            </button>
          </div>
        )}

        {mode === 'mobile' && (
          <div className="card p-6 animate-scale-in">
            <label className="font-semibold text-gray-700 mb-2 block" htmlFor="phone-input">Synthetic demo mobile number</label>
            <input id="phone-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
              className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
              maxLength={10} />
            {!otpSent ? (
              <button onClick={sendOtp} className="w-full mt-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-primary-200 transition-all">
                {t('send_otp')}
              </button>
            ) : (
              <>
                <div className="mt-4 bg-success-50 border border-success-200 rounded-xl p-3 text-sm text-success-700">
                  {t('demo_otp_sent')} <strong>123456</strong>
                </div>
                <input value={otp} onChange={e => setOtp(e.target.value)} placeholder={t('enter_otp')}
                  className="w-full mt-3 border border-gray-200 rounded-xl px-4 py-4 text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  maxLength={6} />
                <button onClick={verifyOtp} disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-primary-500 to primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all">
                  {loading ? t('verifying') : t('verify_continue')}
                </button>
              </>
            )}
            {error && (
              <div className="mt-3 bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-error-700 text-xs font-bold">!</span>
                </span>
                {error}
              </div>
            )}
            <button onClick={() => { setMode(null); setError(''); setOtpSent(false); }} className="w-full mt-3 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors">
              {t('back')}
            </button>
          </div>
        )}

        {mode === 'new' && (
          <div className="card p-6 animate-scale-in text-center">
            <p className="text-gray-600 mb-2">{t('new_patient_desc')}</p>
            <p className="text-xs text-gray-400 mb-4">{t('no_aadhaar')}</p>
            <button onClick={() => createPatient()} disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all">
              {loading ? t('creating') : t('continue_new_patient')}
            </button>
            <button onClick={() => setMode(null)} className="w-full mt-3 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors">
              {t('back')}
            </button>
          </div>
        )}
      </div>
    </KioskShell>
  );
}
