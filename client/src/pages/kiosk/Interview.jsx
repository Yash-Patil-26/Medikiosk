import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Volume2, ArrowRight, Mic, Loader2 } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import MicButton from '../../components/MicButton.jsx';
import ReadBackDialog from '../../components/ReadBackDialog.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import { useTTS } from '../../hooks/useTTS.js';
import api from '../../services/api.js';

export default function Interview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update } = useKiosk();
  const { speak } = useTTS();
  const [graph, setGraph] = useState(null);
  const [node, setNode] = useState(null);
  const [selected, setSelected] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [scaleValue, setScaleValue] = useState(5);
  const [readBackPrompt, setReadBackPrompt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kiosk.complaint) return;
    api.get(`/dialogue/graph/${kiosk.complaint}?lang=${kiosk.language}`)
      .then(r => {
        setGraph(r.data);
        setNode(r.data.nodes[0]);
      })
      .catch(() => setError('Could not load interview questions'))
      .finally(() => setLoading(false));
  }, [kiosk.complaint, kiosk.language]);

  const saveAnswer = async (value, source, label, provenance) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/dialogue/answer', {
        session_id: kiosk.sessionId,
        question_id: node.id,
        answer: value,
        source,
        provenance,
        language: kiosk.language
      });
      await fetchNext();
    } catch {
      setError('Error saving answer. Please try again.');
    }
    finally { setSaving(false); }
  };

  const fetchNext = useCallback(async () => {
    try {
      const r = await api.get(`/dialogue/next?session_id=${kiosk.sessionId}&question_id=${node.id}&answer=${JSON.stringify(selected.length ? selected : textAnswer || scaleValue)}`);
      if (r.data.next_question_id) {
        const nextNode = graph.nodes.find(n => n.id === r.data.next_question_id);
        setNode(nextNode);
        setSelected([]);
        setTextAnswer('');
        setScaleValue(5);
      } else {
        navigate('/kiosk/documents');
      }
    } catch { setError('Could not load next question'); }
  }, [kiosk.sessionId, node, graph, selected, textAnswer, scaleValue, navigate]);

  const handleVoiceTranscript = (transcript) => {
    if (node.inputType === 'text') {
      setTextAnswer(transcript);
    } else if (node.inputType === 'choice') {
      const match = node.options?.find(o => o.label.toLowerCase().includes(transcript.toLowerCase()));
      if (match) saveAnswer(match.value, 'voice', match.label, 'voice');
    }
  };

  const handleReadBackConfirm = async () => {
    await saveAnswer(readBackPrompt.value, 'voice', readBackPrompt.label, 'voice_confirmed');
    setReadBackPrompt(null);
  };

  const handleVoiceResult = (result) => {
    if (node.inputType === 'text' || node.inputType === 'choice') {
      setReadBackPrompt({ value: result, label: result });
    }
  };

  if (loading) return <KioskShell step="Interview"><LoadingSpinner /></KioskShell>;
  if (!node) return <KioskShell step="Interview"><p className="text-gray-500">{t('no_session')}</p></KioskShell>;

  return (
    <KioskShell step="Interview" backTo="/kiosk/complaint">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Volume2 size={20} className="text-primary-500" />
            <button onClick={() => speak(node.text)} className="text-sm text-primary-600 font-medium hover:text-primary-700">
              {t('read_question')}
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{node.text}</h1>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        {node.inputType === 'text' && (
          <div className="card p-4">
            <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none"
              rows={3} placeholder="Type your answer..." />
            <button onClick={() => saveAnswer(textAnswer, 'touch', textAnswer, 'touch')} disabled={!textAnswer.trim() || saving}
              className="w-full mt-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all flex items-center justify-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : t('continue')}
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {node.inputType === 'scale' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Not at all</span>
              <span className="text-sm text-gray-500">Extremely</span>
            </div>
            <input type="range" min="1" max="10" value={scaleValue} onChange={e => setScaleValue(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500" />
            <div className="text-center mt-3">
              <span className="text-3xl font-bold text-primary-600">{scaleValue}</span>
              <span className="text-gray-400 text-sm">/10</span>
            </div>
            <button onClick={() => saveAnswer(scaleValue, 'touch', `${scaleValue}/10`, 'touch')} disabled={saving}
              className="w-full mt-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all flex items-center justify-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : t('continue')}
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {(node.inputType === 'choice' || node.inputType === 'multiselect') && node.options && (
          <div className="grid grid-cols-2 gap-3" role={node.inputType === 'choice' ? 'radiogroup' : 'group'} aria-label={node.text}>
            {node.options.map(opt => (
              <button key={opt.value}
                onClick={() => {
                  if (node.inputType !== 'multiselect') {
                    saveAnswer(opt.value, 'touch', opt.label, 'touch');
                    return;
                  }

                  setSelected(current => {
                    if (opt.value === 'none') {
                      return current.length === 1 && current[0] === 'none'
                        ? []
                        : ['none'];
                    }

                    const withoutNone = current.filter(item => item !== 'none');

                    return withoutNone.includes(opt.value)
                      ? withoutNone.filter(item => item !== opt.value)
                      : [...withoutNone, opt.value];
                  });
                }}
                disabled={saving}
                className={`card p-4 rounded-xl text-left font-medium transition-all touch-target flex items-center gap-3
                  ${(node.inputType === 'multiselect' && selected.includes(opt.value)) ? 'border-primary-500 ring-2 ring-primary-200' : 'hover:border-primary-300'}`}
                role={node.inputType === 'choice' ? 'radio' : 'checkbox'}
                aria-checked={node.inputType === 'choice' ? undefined : selected.includes(opt.value)}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  (node.inputType === 'multiselect' && selected.includes(opt.value)) || (node.inputType === 'choice' && selected === opt.value)
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300'
                }`}>
                  {(node.inputType === 'multiselect' && selected.includes(opt.value)) || (node.inputType === 'choice' && selected === opt.value) ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {node.inputType === 'multiselect' && selected.length > 0 && (
          <button onClick={() => saveAnswer(selected, 'touch', selected.join(', '), 'touch')} disabled={saving}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : t('continue')}
            <ArrowRight size={18} />
          </button>
        )}

        <div className="flex items-center justify-center gap-4">
          <MicButton onTranscript={handleVoiceTranscript} onResult={handleVoiceResult} />
        </div>

        {readBackPrompt && (
          <ReadBackDialog
            text={readBackPrompt.label}
            onConfirm={handleReadBackConfirm}
            onCancel={() => setReadBackPrompt(null)}
          />
        )}
      </div>
    </KioskShell>
  );
}
