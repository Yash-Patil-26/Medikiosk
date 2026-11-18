import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Thermometer, Wind, Brain, Activity, Zap, HelpCircle, Mic } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import MicButton from '../../components/MicButton.jsx';
import api from '../../services/api.js';

const COMPLAINTS = [
  { value: 'chest_discomfort', labelKey: 'complaint_chest', descKey: 'complaint_chest_desc', icon: Heart, color: 'text-rose-500' },
  { value: 'fever', labelKey: 'complaint_fever', descKey: 'complaint_fever_desc', icon: Thermometer, color: 'text-orange-500' },
  { value: 'cough', labelKey: 'complaint_cough', descKey: 'complaint_cough_desc', icon: Wind, color: 'text-blue-500' },
  { value: 'headache', labelKey: 'complaint_headache', descKey: 'complaint_headache_desc', icon: Brain, color: 'text-purple-500' },
  { value: 'abdominal_pain', labelKey: 'complaint_abdominal', descKey: 'complaint_abdominal_desc', icon: Activity, color: 'text-teal-500' },
  { value: 'general_weakness', labelKey: 'complaint_weakness', descKey: 'complaint_weakness_desc', icon: Zap, color: 'text-yellow-500' },
  { value: 'other', labelKey: 'complaint_other', descKey: 'complaint_other_desc', icon: HelpCircle, color: 'text-gray-500' }
];

const COMPLAINT_KEYWORDS = [
  { value: 'chest_discomfort', terms: ['chest', 'heart', 'cardiac', 'breathless', 'breathing difficulty'] },
  { value: 'fever', terms: ['fever', 'temperature', 'chills', 'shivering'] },
  { value: 'headache', terms: ['headache', 'head pain', 'migraine', 'head ache'] },
  { value: 'cough', terms: ['cough', 'cold', 'throat', 'phlegm'] },
  { value: 'abdominal_pain', terms: ['stomach', 'abdomen', 'belly', 'abdominal'] },
  { value: 'general_weakness', terms: ['weak', 'tired', 'fatigue', 'low energy', 'dizzy', 'dizziness'] }
];

function classifyComplaint(rawText) {
  const text = (rawText || '').toLowerCase();
  const match = COMPLAINT_KEYWORDS.find(entry =>
    entry.terms.some(term => text.includes(term))
  );

  return match ? match.value : 'other';
}
export default function Complaint() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update } = useKiosk();
  const [typed, setTyped] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const select = async (value, label) => {
    setLoading(true);
    setError('');
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
    } catch {
      setError(t('error_saving_complaint'));
    }
    finally { setLoading(false); }
  };

  const handleVoice = ({ text }) => setVoiceText(text);

  return (
    <KioskShell step="Complaint" backTo="/register/consent">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('complaint_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('complaint_subtitle')}</p>
        </div>

        {error && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-3 text-sm text-error-700 dark:text-error-400 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 dark:bg-error-800 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 dark:text-error-400 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full mb-6" role="listbox" aria-label="Select your complaint">
          {COMPLAINTS.map(c => {
            const label = t(c.labelKey);
            const desc = t(c.descKey);
            return (
              <button key={c.value} onClick={() => select(c.value, label)} disabled={loading}
                className="card card-hover flex flex-col items-center gap-2 p-4 text-center transition-all touch-target group disabled:opacity-50"
                role="option" aria-label={`${label}: ${desc}`}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <c.icon size={24} className={c.color} aria-hidden="true" />
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{desc}</p>
              </button>
            );
          })}
        </div>

        <div className="w-full border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{t('or_describe')}</p>
          <div className="flex gap-3">
            <input value={typed} onChange={e => setTyped(e.target.value)}
              placeholder={t('complaint_type')}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-gray-100" />
            <button onClick={() => typed.trim() && select(classifyComplaint(typed), typed)} disabled={!typed || loading}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium disabled:opacity-50 shadow-md shadow-primary-200 transition-all">
              Go
            </button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('complaint_speak')}</p>
            <MicButton onResult={handleVoice} />
            {voiceText && (
              <div className="w-full card p-4 text-center bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('i_heard')}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">"{voiceText}"</p>
                <button onClick={() => select(classifyComplaint(voiceText), voiceText)}
                  className="mt-3 px-5 py-2.5 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl text-sm font-medium shadow-md shadow-success-200 transition-all">
                  {t('use_this')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </KioskShell>
  );
}
