import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import { useTTS } from '../../hooks/useTTS.js';
import api from '../../services/api.js';
import { getKioskSessionCredentials } from '../../services/kioskCredentials.js';

const CONSENT_ITEMS = [
  { key: 'voice', label: 'Voice processing', desc: 'Your spoken responses may be processed to capture your answers.' },
  { key: 'document', label: 'Document processing', desc: 'Uploaded documents will be processed to extract medical information.' },
  { key: 'his', label: 'Share with hospital HIS', desc: 'Your summary may be shared with the hospital information system.' },
  { key: 'dashboard', label: 'Save to patient dashboard', desc: 'Your records will be saved to your patient dashboard.' }
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
    const text = CONSENT_ITEMS.map(i => `${i.label}: ${i.desc}`).join('. ');
    speak(`Consent notice. ${text}. Please review each item and toggle to agree.`);
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
      <div className="w-full mt-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('consent_title')}</h1>
          <button onClick={readAloud} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <Volume2 size={18} /> {t('read_aloud')}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex flex-col gap-4 mb-6">
          {CONSENT_ITEMS.map(item => (
            <div key={item.key} className="flex items-start gap-4 bg-white border rounded-xl p-4">
              <button onClick={() => toggle(item.key)}
                className={`w-12 h-7 rounded-full transition-colors shrink-0 mt-0.5 ${consents[item.key] ? 'bg-teal-500' : 'bg-gray-300'}`}
                role="switch" aria-checked={consents[item.key]}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${consents[item.key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <div>
                <p className="font-semibold text-gray-800">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)}
            className="w-5 h-5 rounded" />
          <span className="text-gray-700">{t('consent_understand')}</span>
        </label>

        <button onClick={proceed} disabled={!understood || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-40 transition">
          {loading ? t('saving') : t('next') + '→'}
        </button>
      </div>
    </KioskShell>
  );
}
