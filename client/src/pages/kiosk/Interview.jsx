import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
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
  const { kiosk } = useKiosk();
  const { speak } = useTTS();
  const [node, setNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [textInput, setTextInput] = useState('');

  const fetchNext = useCallback(async () => {
    setLoading(true); setVoiceResult(null); setSelected([]); setTextInput('');
    try {
      const r = await api.get(`/dialogue/${kiosk.sessionId}/next`);
      setNode(r.data);
      if (kiosk.audioGuided && r.data.text) speak(r.data.text);
    } catch { setNode({ type: 'END' }); }
    finally { setLoading(false); }
  }, [kiosk.sessionId, kiosk.audioGuided]);

  useEffect(() => { if (kiosk.sessionId) fetchNext(); }, [kiosk.sessionId, fetchNext]);

  const saveAnswer = async (value, source, rawText, confirmedBy) => {
    setSaving(true);
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
      fetchNext();
    } catch { alert('Error saving answer'); }
    finally { setSaving(false); }
  };

  if (!kiosk.sessionId) {
    return (
      <KioskShell step="Interview">
        <div className="flex flex-col items-center gap-4 mt-10 text-center">
          <p className="text-gray-500">No active session. Please start from the beginning.</p>
          <button onClick={() => navigate('/kiosk/identify')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
            Start Over
          </button>
        </div>
      </KioskShell>
    );
  }

  if (loading) return <KioskShell step="Interview"><LoadingSpinner /></KioskShell>;

  if (!node || node.type === 'END') {
    return (
      <KioskShell step="Interview">
        <div className="flex flex-col items-center gap-6 mt-10 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-3xl">âœ“</div>
          <h2 className="text-2xl font-bold text-gray-800">Interview Complete</h2>
          <p className="text-gray-500">Thank you for answering all questions.</p>
          <button onClick={() => navigate('/kiosk/documents')}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700">
            Continue â†’
          </button>
        </div>
      </KioskShell>
    );
  }

  return (
    <KioskShell step="Interview" backTo="/kiosk/complaint">
      <div className="w-full mt-4 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex-1">{node.text}</h2>
          <button onClick={() => speak(node.text)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg shrink-0">
            <Volume2 size={20} />
          </button>
        </div>

        {voiceResult ? (
          <ReadBackDialog
            text={voiceResult.text}
            onConfirm={() => saveAnswer(voiceResult.text, 'voice', voiceResult.text, 'readback')}
            onRetry={() => setVoiceResult(null)}
          />
        ) : (
          <>
            {(node.inputType === 'choice' || node.inputType === 'multiselect') && node.options && (
              <div className="grid grid-cols-2 gap-3">
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
                    className={`p-4 rounded-xl border-2 text-left font-medium transition touch-target
                      ${(node.inputType === 'multiselect' && selected.includes(opt.value)) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {node.inputType === 'scale' && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap justify-center">
                  {Array.from({ length: (node.max - node.min + 1) }, (_, i) => i + node.min).map(n => (
                    <button key={n} onClick={() => saveAnswer(String(n), 'touch', String(n), 'touch')}
                      disabled={saving}
                      className={`w-12 h-12 rounded-xl border-2 font-bold text-lg transition
                        ${n <= 3 ? 'border-green-300 hover:bg-green-50' : n <= 6 ? 'border-yellow-300 hover:bg-yellow-50' : 'border-red-300 hover:bg-red-50'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 px-1">
                  <span>Mild</span><span>Moderate</span><span>Severe</span>
                </div>
              </div>
            )}

            {node.inputType === 'text_or_none' && (
              <div className="flex flex-col gap-3">
                <input value={textInput} onChange={e => setTextInput(e.target.value)}
                  placeholder={node.placeholder || 'Type here...'}
                  className="border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <div className="flex gap-3">
                  <button onClick={() => saveAnswer(textInput || 'none', 'text', textInput, 'touch')}
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Confirm'}
                  </button>
                  <button onClick={() => saveAnswer('none', 'touch', node.noneLabel, 'touch')}
                    disabled={saving}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50">
                    {node.noneLabel || 'None'}
                  </button>
                </div>
              </div>
            )}

            {node.inputType === 'multiselect' && selected.length > 0 && (
              <button onClick={() => saveAnswer(selected, 'touch', selected.join(', '), 'touch')} disabled={saving}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Confirm Selection'}
              </button>
            )}

            <div className="flex flex-col items-center gap-2 pt-2 border-t">
              <p className="text-sm text-gray-400">Or answer by voice</p>
              <MicButton onResult={setVoiceResult} />
            </div>
          </>
        )}
      </div>
    </KioskShell>
  );
}
