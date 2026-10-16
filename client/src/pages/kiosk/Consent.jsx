import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Volume2, Shield, FileText, Database, ArrowRight } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import { useTTS } from '../../hooks/useTTS.js';
import api from '../../services/api.js';
import { getKioskSessionCredentials, setKioskSessionCredentials } from '../../services/kioskCredentials.js';

const CONSENT_ITEMS = [
  { key: 'voice', label: 'Voice Processing', desc: 'Allow voice recording for transcription', icon: Volume2 },
  { key: 'document', label: 'Document Upload', desc: 'Allow document OCR and extraction', icon: FileText },
  { key: 'his', label: 'HIS Integration', desc: 'Share data with hospital information system', icon: Database },
  { key: 'dashboard', label: 'Save to Dashboard', desc: 'Save encounter for future reference', icon: Shield }
];

export default function Consent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update, reset } = useKiosk();
  const { speak } = useTTS();
  const [consents, setConsents] = useState({ voice: false, document: false, his: false, dashboard: false });
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key) => setConsents(p => ({ ...p, [key]: !p[key] }));

  const readAloud = () => {
    const text = CONSENT_ITEMS.map(item => `${item.label}: ${item.desc}`).join('. ');
    speak(text);
  };

  const proceed = async () => {
    setLoading(true);
    setError('');
    let createdSessionId = null;

    try {
      const existingCredentials = getKioskSessionCredentials();
      const canResume =
        Boolean(kiosk.sessionId) &&
        existingCredentials?.id === kiosk.sessionId;

      if (canResume) {
        createdSessionId = kiosk.sessionId;
      } else {
        const r = await api.post('/sessions', {
          patient_id: kiosk.patientId,
          language: kiosk.language,
          ayush_mode: kiosk.ayushMode
        });

        createdSessionId = r.data.id;

        if (!createdSessionId || typeof r.data.kioskToken !== 'string') {
          throw new Error('Server did not issue a kiosk session credential');
        }

        // Store the kiosk session credentials
        setKioskSessionCredentials(createdSessionId, r.data.kioskToken);

        // Keep the session ID in memory so consent can resume if a write fails.
        update({ sessionId: createdSessionId });
      }

      for (const [key, granted] of Object.entries(consents)) {
        await api.post('/consents', {
          patient_id: kiosk.patientId,
          session_id: createdSessionId,
          purpose_key: key,
          granted,
          language: kiosk.language
        });
      }

      update({
        sessionId: createdSessionId,
        consents,
        voice_consent: consents.voice,
        document_consent: consents.document,
        share_his_consent: consents.his,
        save_dashboard_consent: consents.dashboard
      });

      navigate('/kiosk/complaint');
    } catch {
      let cleanupConfirmed = false;

      if (createdSessionId) {
        try {
          const cleanup = await api.delete(`/sessions/${createdSessionId}`);
          cleanupConfirmed =
            cleanup.data?.purged === true &&
            Array.isArray(cleanup.data.items) &&
            Array.isArray(cleanup.data.retained);
        } catch {
          console.error('Consent setup cleanup could not be confirmed.');
        }
      }

      if (cleanupConfirmed) {
        // The enrollment token was consumed; start a fresh identity flow.
        reset();
        navigate('/kiosk/identify');
        setError('Consent setup could not be completed. Please start again.');
      } else if (createdSessionId) {
        // Keep the session credential so another attempt can resume this session.
        update({ sessionId: createdSessionId });
        setError('Consent could not be fully saved. Please retry to resume this session.');
      } else {
        setError('Could not create the session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KioskShell step="Consent" backTo="/kiosk/identify">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('consent_title')}</h1>
            <p className="text-gray-500 text-lg">{t('consent_subtitle')}</p>
          </div>
          <button onClick={readAloud} className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors font-medium">
            <Volume2 size={18} /> {t('read_aloud')}
          </button>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 mb-6">
          {CONSENT_ITEMS.map(item => (
            <div key={item.key} className="card p-5 flex items-start gap-4">
              <button onClick={() => toggle(item.key)}
                className={`w-14 h-8 rounded-full transition-colors shrink-0 mt-0.5 focus:ring-2 focus:ring-primary-500 focus:outline-none ${consents[item.key] ? 'bg-gradient-to-r from-success-500 to-success-600' : 'bg-gray-200'}`}
                role="switch" aria-checked={consents[item.key]} aria-label={`Toggle ${item.label}`}>
                <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform mx-1 ${consents[item.key] ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <item.icon size={20} className="text-primary-500" />
                  <p className="font-semibold text-gray-800">{item.label}</p>
                </div>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-4 bg-primary-50 border-primary-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5" />
            <span className="text-sm text-primary-800">{t('consent_understand')}</span>
          </label>
        </div>

        <button onClick={proceed} disabled={!understood || loading}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-md shadow-primary-200 transition-all hover:shadow-lg flex items-center justify-center gap-2">
          {loading ? t('please_wait') : t('continue')}
          <ArrowRight size={20} />
        </button>
      </div>
    </KioskShell>
  );
}
