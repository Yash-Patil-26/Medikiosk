import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Thermometer, Wind, Brain, Activity, Zap, HelpCircle, Mic } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import MicButton from '../../components/MicButton.jsx';
import api from '../../services/api.js';

const COMPLAINTS = [
  { value: 'chest_discomfort', label: 'Chest Discomfort', desc: 'Pressure, pain, or tightness in chest', icon: Heart, color: 'text-red-500' },
  { value: 'fever', label: 'Fever', desc: 'High body temperature, chills', icon: Thermometer, color: 'text-orange-500' },
  { value: 'cough', label: 'Cough', desc: 'Dry or productive cough', icon: Wind, color: 'text-blue-500' },
  { value: 'headache', label: 'Headache', desc: 'Head pain or pressure', icon: Brain, color: 'text-purple-500' },
  { value: 'abdominal_pain', label: 'Abdominal Pain', desc: 'Stomach or belly pain', icon: Activity, color: 'text-teal-500' },
  { value: 'general_weakness', label: 'General Weakness', desc: 'Fatigue or low energy', icon: Zap, color: 'text-yellow-500' },
  { value: 'other', label: 'Other', desc: 'Something else', icon: HelpCircle, color: 'text-gray-500' }
];

export default function Complaint() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update } = useKiosk();
  const [typed, setTyped] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [loading, setLoading] = useState(false);

  const select = async (value, label) => {
    setLoading(true);
    try {
      await api.post(`/dialogue/${kiosk.sessionId}/answer`, {
        node_id: 'complaint_selection',
        slot_id: 'complaint',
        value,
        source: 'touch',
        raw_text: label,
        confidence: 1.0,
        confirmed_by: 'touch'
      });
      update({ complaint: value });
      navigate('/kiosk/interview');
    } catch { alert('Error saving complaint'); }
    finally { setLoading(false); }
  };

  const handleVoice = ({ text }) => setVoiceText(text);

  return (
    <KioskShell step="Complaint" backTo="/kiosk/consent">
      <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-6">{t('complaint_title')}</h1>

      <div className="grid grid-cols-2 gap-3 w-full mb-6">
        {COMPLAINTS.map(c => (
          <button key={c.value} onClick={() => select(c.value, c.label)} disabled={loading}
            className="flex flex-col items-center gap-2 p-5 bg-white border-2 border-gray-200 hover:border-blue-400 rounded-2xl text-center transition touch-target-lg disabled:opacity-50">
            <c.icon size={36} className={c.color} />
            <p className="font-bold text-gray-800">{c.label}</p>
            <p className="text-xs text-gray-500">{c.desc}</p>
          </button>
        ))}
      </div>

      <div className="w-full border-t pt-5 flex flex-col gap-3">
        <p className="text-sm text-gray-500 text-center">{t('or_describe')}</p>
        <div className="flex gap-2">
          <input value={typed} onChange={e => setTyped(e.target.value)}
            placeholder={t('complaint_type')}
            className="flex-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <button onClick={() => typed && select('other', typed)} disabled={!typed || loading}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40">
            Go
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">{t('complaint_speak')}</p>
          <MicButton onResult={handleVoice} />
          {voiceText && (
            <div className="w-full bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-sm text-gray-500">{t('i_heard')}</p>
              <p className="font-semibold">"{voiceText}"</p>
              <button onClick={() => select('other', voiceText)}
                className="mt-2 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium">
                {t('use_this')}
              </button>
            </div>
          )}
        </div>
      </div>
    </KioskShell>
  );
}
