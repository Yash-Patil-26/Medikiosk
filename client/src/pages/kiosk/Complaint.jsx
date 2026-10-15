import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Thermometer, Wind, Brain, Activity, Zap, HelpCircle, Mic } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import MicButton from '../../components/MicButton.jsx';
import api from '../../services/api.js';

const COMPLAINTS = [
  { value: 'chest_discomfort', label: 'Chest Discomfort', desc: 'Pressure, pain, or tightness in chest', icon: Heart, color: 'text-rose-500' },
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
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const select = (value, label) => {
    setSelected(value);
    update({ complaint: value, complaintLabel: label });
  };

  const save = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/dialogue/${kiosk.sessionId}/answer`, {
        node_id: 'complaint_selection',
        slot_id: 'complaint',
        value: selected,
        source: 'touch',
        raw_text: selected,
        confidence: 1.0,
        confirmed_by: 'touch'
      });
      navigate('/kiosk/interview');
    } catch {
      setError('Error saving complaint. Please try again.');
    }
    finally { setLoading(false); }
  };

  const handleVoice = ({ text }) => setVoiceText(text);

  return (
    <KioskShell step="Complaint" backTo="/kiosk/consent">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('complaint_title')}</h1>
          <p className="text-gray-500 text-lg">{t('complaint_subtitle')}</p>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 w-full mb-6" role="listbox" aria-label="Select your complaint">
          {COMPLAINTS.map(c => (
            <button key={c.value} onClick={() => select(c.value, c.label)} disabled={loading}
              className={`card flex flex-col items-center gap-3 p-6 text-center transition-all touch-target-lg group disabled:opacity-50 ${
                selected === c.value
                  ? 'border-primary-500 ring-2 ring-primary-200 shadow-md'
                  : 'card-hover'
              }`}
              role="option" aria-label={`${c.label}: ${c.desc}`}>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:scale-110 transition-transform ${
                selected === c.value ? 'from-primary-100 to-primary-200' : ''
              }`}>
                <c.icon size={32} className={c.color} aria-hidden="true" />
              </div>
              <p className="font-bold text-gray-800">{c.label}</p>
              <p className="text-sm text-gray-500">{c.desc}</p>
            </button>
          ))}
        </div>

        <div className="w-full border-t border-gray-200 pt-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500 text-center">{t('or_describe')}</p>
          <div className="flex gap-3">
            <input value={typed} onChange={e => setTyped(e.target.value)}
              placeholder={t('complaint_type')}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" />
            <button onClick={() => typed && setSelected(typed)} disabled={!typed || loading}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to primary-600 text-white rounded-xl font-medium disabled:opacity-50 shadow-md shadow-primary-200 transition-all">
              Go
            </button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500">{t('complaint_speak')}</p>
            <MicButton onResult={handleVoice} />
            {voiceText && (
              <div className="w-full card p-4 text-center bg-primary-50 border-primary-200">
                <p className="text-sm text-gray-500">{t('i_heard')}</p>
                <p className="font-semibold text-gray-800">"{voiceText}"</p>
                <button onClick={() => setSelected(voiceText)}
                  className="mt-3 px-5 py-2.5 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl text-sm font-medium shadow-md shadow-success-200 transition-all">
                  {t('use_this')}
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={save} disabled={!selected || loading}
          className="w-full bg-gradient-to-r from-primary-500 to primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-md shadow-primary-200 transition-all hover:shadow-lg">
          {loading ? t('please_wait') : t('continue')}
        </button>
      </div>
    </KioskShell>
  );
}
