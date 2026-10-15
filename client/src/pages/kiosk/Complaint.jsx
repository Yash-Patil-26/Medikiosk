import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Thermometer, Wind, Brain, Activity, Zap, HelpCircle, Mic } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import MicButton from '../../components/MicButton.jsx';
import api from '../../services/api.js';

const COMPLAINTS = [
  { value: 'chest_pain', label: 'Chest Pain', desc: 'Pain or discomfort in chest', icon: Heart, color: 'text-rose-500' },
  { value: 'fever', label: 'Fever', desc: 'High body temperature', icon: Thermometer, color: 'text-orange-500' },
  { value: 'breathing', label: 'Breathing', desc: 'Difficulty breathing', icon: Wind, color: 'text-blue-500' },
  { value: 'headache', label: 'Headache', desc: 'Pain in head or neck', icon: Brain, color: 'text-purple-500' },
  { value: 'fatigue', label: 'Fatigue', desc: 'Feeling tired or weak', icon: Activity, color: 'text-amber-500' },
  { value: 'other', label: 'Other', desc: 'Something else', icon: HelpCircle, color: 'text-gray-500' }
];

export default function Complaint() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update } = useKiosk();
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');
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
      await api.post('/sessions/complaint', {
        session_id: kiosk.sessionId,
        complaint: selected === 'other' ? custom : selected,
        language: kiosk.language
      });
      navigate('/kiosk/interview');
    } catch {
      setError('Failed to save complaint. Please try again.');
    }
    finally { setLoading(false); }
  };

  return (
    <KioskShell step="Complaint" backTo="/kiosk/consent">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('complaint_title')}</h1>
          <p className="text-gray-500 text-lg">{t('complaint_subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full mb-6" role="listbox" aria-label="Select your complaint">
          {COMPLAINTS.map(c => (
            <button key={c.value} onClick={() => select(c.value, c.label)} disabled={loading}
              className={`card flex flex-col items-center gap-3 p-6 text-center transition-all touch-target-lg group ${
                selected === c.value
                  ? 'border-primary-500 ring-2 ring-primary-200 shadow-md'
                  : 'hover:border-primary-300'
              }`}
              role="option" aria-label={`${c.label}: ${c.desc}`}>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${selected === c.value ? 'from-primary-100 to-primary-200' : ''} group-hover:scale-110 transition-transform`}>
                <c.icon size={32} className={c.color} aria-hidden="true" />
              </div>
              <p className="font-bold text-gray-800">{c.label}</p>
              <p className="text-sm text-gray-500">{c.desc}</p>
            </button>
          ))}
        </div>

        {selected === 'other' && (
          <div className="card p-4 animate-scale-in">
            <label className="font-semibold text-gray-700 mb-2 block" htmlFor="custom-complaint">Please describe your concern</label>
            <textarea id="custom-complaint" value={custom} onChange={e => setCustom(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none"
              rows={3} placeholder="Describe your symptoms..." />
          </div>
        )}

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        <button onClick={save} disabled={!selected || loading}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-md shadow-primary-200 transition-all hover:shadow-lg">
          {loading ? t('please_wait') : t('continue')}
        </button>
      </div>
    </KioskShell>
  );
}
