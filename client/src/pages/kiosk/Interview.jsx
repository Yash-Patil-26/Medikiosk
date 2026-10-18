import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Volume2, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import MicButton from '../../components/MicButton.jsx';
import ReadBackDialog from '../../components/ReadBackDialog.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import { useTTS } from '../../hooks/useTTS.js';
import { resolveVoiceAnswer } from '../../utils/voiceMatch.js';
import api from '../../services/api.js';

export default function Interview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk } = useKiosk();
  const { speak } = useTTS();

  const [node, setNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);
  const [voiceError, setVoiceError] = useState('');
  const [selected, setSelected] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setVoiceResult(null);
    setVoiceError('');
    setSelected([]);
    setTextInput('');
    setError('');

    try {
      const r = await api.get(`/dialogue/${kiosk.sessionId}/next`);
      setNode(r.data);

      if (kiosk.audioGuided && r.data.text) {
        speak(r.data.text);
      }
    } catch {
      setNode({ type: 'END' });
    } finally {
      setLoading(false);
    }
  }, [kiosk.sessionId, kiosk.audioGuided, speak]);

  useEffect(() => {
    if (kiosk.sessionId) {
      fetchNext();
    }
  }, [kiosk.sessionId, fetchNext]);

  const saveAnswer = async (value, source, rawText, confirmedBy) => {
    setSaving(true);
    setError('');
    setVoiceError('');

    try {
      await api.post(`/dialogue/${kiosk.sessionId}/answer`, {
        node_id: node.id,
        slot_id: node.slotId,
        value,
        source,
        raw_text: rawText || value,
        confidence: source === 'voice' ? 0.9 : 1.0,
        confirmed_by: confirmedBy
      });

      await fetchNext();
    } catch {
      setError('Error saving answer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVoiceResult = ({ text }) => {
    const resolved = resolveVoiceAnswer(node, text);

    if (!resolved) {
      setVoiceResult(null);
      setVoiceError(t('voice_no_match'));
      return;
    }

    setVoiceError('');
    setVoiceResult({
      value: resolved.value,
      label: resolved.label,
      rawText: text
    });
  };

  if (!kiosk.sessionId) {
    return (
      <KioskShell step="Interview">
        <div className="flex flex-col items-center gap-4 mt-10 text-center">
          <p className="text-gray-500">
            No active session. Please start from the beginning.
          </p>
          <button
            onClick={() => navigate('/kiosk/identify')}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all"
          >
            Start Over
          </button>
        </div>
      </KioskShell>
    );
  }

  if (loading) {
    return (
      <KioskShell step="Interview">
        <LoadingSpinner />
      </KioskShell>
    );
  }

  if (!node || node.type === 'END') {
    return (
      <KioskShell step="Interview">
        <div className="flex flex-col items-center gap-6 mt-10 text-center animate-scale-in">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center shadow-lg shadow-success-200">
            <CheckCircle size={40} className="text-success-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Interview Complete
          </h2>

          <p className="text-gray-500">
            Thank you for answering all questions.
          </p>

          <button
            onClick={() => navigate('/kiosk/documents')}
            className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl font-bold text-lg shadow-md shadow-primary-200 transition-all hover:shadow-lg flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={20} />
          </button>
        </div>
      </KioskShell>
    );
  }

  return (
    <KioskShell step="Interview" backTo="/kiosk/complaint">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        {error && (
          <div
            role="alert"
            className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-900 flex-1">
            {node.text}
          </h2>

          <button
            onClick={() => speak(node.text)}
            aria-label="Read question aloud"
            className="p-2.5 text-primary-500 hover:bg-primary-50 rounded-xl shrink-0 transition-colors"
          >
            <Volume2 size={22} />
          </button>
        </div>

        {voiceResult ? (
          <ReadBackDialog
            text={voiceResult.label}
            onConfirm={() =>
              saveAnswer(
                voiceResult.value,
                'voice',
                voiceResult.rawText,
                'readback'
              )
            }
            onRetry={() => {
              setVoiceResult(null);
              setVoiceError('');
            }}
          />
        ) : (
          <>
            {(node.inputType === 'choice' ||
              node.inputType === 'multiselect') &&
              node.options && (
                <div
                  className="grid grid-cols-2 gap-3"
                  role={node.inputType === 'choice' ? 'radiogroup' : 'group'}
                  aria-label={node.text}
                >
                  {node.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (node.inputType !== 'multiselect') {
                          saveAnswer(
                            opt.value,
                            'touch',
                            opt.label,
                            'touch'
                          );
                          return;
                        }

                        setSelected(current => {
                          if (opt.value === 'none') {
                            return current.length === 1 &&
                              current[0] === 'none'
                              ? []
                              : ['none'];
                          }

                          const withoutNone = current.filter(
                            item => item !== 'none'
                          );

                          return withoutNone.includes(opt.value)
                            ? withoutNone.filter(item => item !== opt.value)
                            : [...withoutNone, opt.value];
                        });
                      }}
                      disabled={saving}
                      className={`card p-4 rounded-xl text-left font-medium transition-all touch-target focus:ring-2 focus:ring-primary-500 focus:outline-none ${
                        node.inputType === 'multiselect' &&
                        selected.includes(opt.value)
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'card-hover'
                      }`}
                      role={node.inputType === 'choice' ? 'radio' : 'checkbox'}
                      aria-checked={
                        node.inputType === 'multiselect'
                          ? selected.includes(opt.value)
                          : undefined
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

            {node.inputType === 'scale' && (
              <div className="card p-6">
                <div className="flex gap-2 flex-wrap justify-center">
                  {Array.from(
                    { length: node.max - node.min + 1 },
                    (_, i) => i + node.min
                  ).map(n => (
                    <button
                      key={n}
                      onClick={() =>
                        saveAnswer(String(n), 'touch', String(n), 'touch')
                      }
                      disabled={saving}
                      className={`w-14 h-14 rounded-xl border-2 font-bold text-lg transition-all ${
                        n <= 3
                          ? 'border-success-300 bg-success-50 hover:bg-success-100'
                          : n <= 6
                            ? 'border-warning-300 bg-warning-50 hover:bg-warning-100'
                            : 'border-error-300 bg-error-50 hover:bg-error-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between text-xs text-gray-400 px-4 mt-3">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>
            )}

            {node.inputType === 'text_or_none' && (
              <div className="card p-6">
                <input
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={node.placeholder || 'Type here...'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() =>
                      saveAnswer(
                        textInput || 'none',
                        'text',
                        textInput,
                        'touch'
                      )
                    }
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all"
                  >
                    {saving ? (
                      <Loader2
                        size={18}
                        className="animate-spin inline mr-2"
                      />
                    ) : (
                      'Confirm'
                    )}
                  </button>

                  <button
                    onClick={() =>
                      saveAnswer('none', 'touch', node.noneLabel, 'touch')
                    }
                    disabled={saving}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {node.noneLabel || 'None'}
                  </button>
                </div>
              </div>
            )}

            {node.inputType === 'multiselect' && selected.length > 0 && (
              <button
                onClick={() =>
                  saveAnswer(
                    selected,
                    'touch',
                    selected.join(', '),
                    'touch'
                  )
                }
                disabled={saving}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary-200 transition-all"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin inline mr-2" />
                ) : (
                  'Confirm Selection'
                )}
              </button>
            )}

            <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Or answer by voice</p>
              <MicButton onResult={handleVoiceResult} />

              {voiceError && (
                <p role="status" className="text-sm text-amber-600 text-center">
                  {voiceError}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </KioskShell>
  );
}