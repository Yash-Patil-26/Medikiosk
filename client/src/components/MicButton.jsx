import { Mic, MicOff, RotateCcw } from 'lucide-react';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function MicButton({ onResult, disabled }) {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recRef = useRef(null);

  const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const start = () => {
    if (!supported) { setError(t('voice_unavailable')); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const confidence = e.results[0][0].confidence;
      onResult({ text, confidence });
      setListening(false);
    };
    rec.onerror = () => { setError(t('voice_unavailable')); setListening(false); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    setError(null);
  };

  const stop = () => { recRef.current?.stop(); setListening(false); };

  if (!supported) return (
    <div className="text-sm text-amber-600 flex items-center gap-2">
      <MicOff size={16} /> {t('voice_unavailable')}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={listening ? stop : start} disabled={disabled}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition touch-target
          ${listening ? 'bg-red-500 animate-pulse text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        aria-label={listening ? 'Stop recording' : 'Start recording'}>
        {listening ? <MicOff size={32} /> : <Mic size={32} />}
      </button>
      {listening && <span className="text-sm text-gray-500 animate-pulse">{t('speak_now')}</span>}
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
