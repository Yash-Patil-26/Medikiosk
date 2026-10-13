import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import { useTTS } from '../../hooks/useTTS.js';
import api from '../../services/api.js';

const CONSENT_ITEMS = [
  { key: 'voice', label: 'Voice processing', desc: 'Your spoken responses may be processed to capture your answers.' },
  { key: 'document', label: 'Document processing', desc: 'Uploaded documents will be processed to extract medical information.' },
  { key: 'his', label: 'Share with hospital HIS', desc: 'Your summary may be shared with the hospital information system.' },
  { key: 'dashboard', label: 'Save to patient dashboard', desc: 'Your records will be saved to your patient dashboard.' }
];

export default function Consent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update } = useKiosk();
  const { speak } = useTTS();
  const [consents, setConsents] = useState({ voice: false, document: false, his: false, dashboard: false });
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (key) => setConsents(p => ({ ...p, [key]: !p[key] }));

  const readAloud = () => {
    const text = CONSENT_ITEMS.map(i => `${i.label}: ${i.desc}`).join('. ');
    speak(`Consent notice. ${text}. Please review each item and toggle to agree.`);
  };

  const proceed = async () => {
    setLoading(true);
    try {
      const r = await api.post('/sessions', {
        patient_id: kiosk.patientId,
        language: kiosk.language,
        ayush_mode: kiosk.ayushMode
      });
      update({
        sessionId: r.data.id,
        consents,
        voice_consent: consents.voice,
        document_consent: consents.document
      });
      // Record consents
      for (const [key, granted] of Object.entries(consents)) {
        await api.post('/consents', {
          patient_id: kiosk.patientId,
          session_id: r.data.id,
          purpose_key: key,
          granted,
          language: kiosk.language
        });
      }
      await api.patch(`/sessions/${r.data.id}`, {
        voice_consent: consents.voice ? 1 : 0,
        document_consent: consents.document ? 1 : 0,
        share_his_consent: consents.his ? 1 : 0,
        save_dashboard_consent: consents.dashboard ? 1 : 0
      });
      navigate('/kiosk/complaint');
    } catch { alert('Error saving consent'); }
    finally { setLoading(false); }
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
          {loading ? t('saving') : t('next') + ' →'}
        </button>
      </div>
    </KioskShell>
  );
}
