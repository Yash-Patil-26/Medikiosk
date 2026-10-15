import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Phone, UserPlus } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createPatient = async () => {
    setLoading(true);
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
    <KioskShell step="Identify" showBack backTo="/">
      <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-8">{t('identify_title')}</h1>

      {!mode && (
        <div className="grid grid-cols-1 gap-4 w-full">
          {[
            { id: 'abha', icon: CreditCard, label: t('identify_abha'), desc: 'Use synthetic demo digits only; never enter a real ABHA number' },
            { id: 'mobile', icon: Phone, label: t('identify_mobile'), desc: 'Demo-only OTP; use synthetic details, not a real mobile number' },
            { id: 'new', icon: UserPlus, label: t('identify_new'), desc: 'Generate a new patient ID' }
          ].map(opt => (
            <button key={opt.id} onClick={() => setMode(opt.id)}
              className="flex items-center gap-5 p-6 bg-white border-2 border-gray-200 hover:border-blue-400 rounded-2xl text-left transition touch-target-lg">
              <opt.icon size={36} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-800">{opt.label}</p>
                <p className="text-sm text-gray-500">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {mode === 'abha' && (
        <div className="w-full flex flex-col gap-4">
          <label className="font-medium text-gray-700" htmlFor="abha-input">Synthetic demo ABHA value (14 digits only)</label>
          <input id="abha-input" value={abha} onChange={e => setAbha(e.target.value)} placeholder="12345678901234"
            className="border rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" maxLength={14} />
          {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
          <button onClick={handleAbha} disabled={loading}
            className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
            {loading ? t('please_wait') : t('continue')}
          </button>
          <button onClick={() => { setMode(null); setError(''); }} className="text-gray-500 text-sm">{t('back')}</button>
        </div>
      )}

      {mode === 'mobile' && (
        <div className="w-full flex flex-col gap-4">
          <label className="font-medium text-gray-700" htmlFor="phone-input">Synthetic demo mobile number</label>
          <input id="phone-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
            className="border rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" maxLength={10} />
          {!otpSent ? (
            <button onClick={sendOtp} className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
              {t('send_otp')}
            </button>
          ) : (
            <>
              <p className="text-sm text-teal-600">{t('demo_otp_sent')} <strong>123456</strong></p>
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder={t('enter_otp')}
                className="border rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" maxLength={6} />
              <button onClick={verifyOtp} disabled={loading}
                className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {loading ? t('verifying') : t('verify_continue')}
              </button>
            </>
          )}
          {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
          <button onClick={() => { setMode(null); setError(''); setOtpSent(false); }} className="text-gray-500 text-sm">{t('back')}</button>
        </div>
      )}

      {mode === 'new' && (
        <div className="w-full flex flex-col gap-4 items-center text-center">
          <p className="text-gray-600">{t('new_patient_desc')}</p>
          <p className="text-xs text-gray-400">{t('no_aadhaar')}</p>
          <button onClick={() => createPatient()} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
            {loading ? t('creating') : t('continue_new_patient')}
          </button>
          <button onClick={() => setMode(null)} className="text-gray-500 text-sm">{t('back')}</button>
        </div>
      )}
    </KioskShell>
  );
}
