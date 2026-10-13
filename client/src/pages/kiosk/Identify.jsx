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
  const { update } = useKiosk();
  const [mode, setMode] = useState(null);
  const [abha, setAbha] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createPatient = async (label) => {
    setLoading(true);
    try {
      const r = await api.post('/patients', { name_encrypted: label });
      update({ patientId: r.data.id });
      navigate('/kiosk/consent');
    } catch { setError('Could not create patient record'); }
    finally { setLoading(false); }
  };

  const handleAbha = () => {
    if (!/^\d{14}$/.test(abha.replace(/-/g, ''))) { setError('Enter a valid 14-digit ABHA number (demo only)'); return; }
    createPatient(`ABHA-DEMO-${abha.slice(-4)}`);
  };

  const sendOtp = () => { setOtpSent(true); setError(''); };
  const verifyOtp = () => {
    if (otp !== '123456') { setError('Invalid OTP. Demo OTP is 123456'); return; }
    createPatient(`MOBILE-DEMO-${phone.slice(-4)}`);
  };

  return (
    <KioskShell step="Identify" showBack backTo="/">
      <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-8">{t('identify_title')}</h1>

      {!mode && (
        <div className="grid grid-cols-1 gap-4 w-full">
          {[
            { id: 'abha', icon: CreditCard, label: t('identify_abha'), desc: 'Enter your 14-digit ABHA number' },
            { id: 'mobile', icon: Phone, label: t('identify_mobile'), desc: 'Verify with OTP (Demo OTP: 123456)' },
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
          <label className="font-medium text-gray-700">ABHA Number (14 digits, demo only)</label>
          <input value={abha} onChange={e => setAbha(e.target.value)} placeholder="12345678901234"
            className="border rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleAbha} disabled={loading}
            className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
            {loading ? t('please_wait') : t('continue')}
          </button>
          <button onClick={() => { setMode(null); setError(''); }} className="text-gray-500 text-sm">{t('back')}</button>
        </div>
      )}

      {mode === 'mobile' && (
        <div className="w-full flex flex-col gap-4">
          <label className="font-medium text-gray-700">Mobile Number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
            className="border rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {!otpSent ? (
            <button onClick={sendOtp} className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
              {t('send_otp')}
            </button>
          ) : (
            <>
              <p className="text-sm text-teal-600">{t('demo_otp_sent')} <strong>123456</strong></p>
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder={t('enter_otp')}
                className="border rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <button onClick={verifyOtp} disabled={loading}
                className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {loading ? t('verifying') : t('verify_continue')}
              </button>
            </>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={() => { setMode(null); setError(''); setOtpSent(false); }} className="text-gray-500 text-sm">{t('back')}</button>
        </div>
      )}

      {mode === 'new' && (
        <div className="w-full flex flex-col gap-4 items-center text-center">
          <p className="text-gray-600">{t('new_patient_desc')}</p>
          <p className="text-xs text-gray-400">{t('no_aadhaar')}</p>
          <button onClick={() => createPatient('NEW-PATIENT')} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
            {loading ? t('creating') : t('continue_new_patient')}
          </button>
          <button onClick={() => setMode(null)} className="text-gray-500 text-sm">{t('back')}</button>
        </div>
      )}
    </KioskShell>
  );
}
