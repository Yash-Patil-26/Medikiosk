import { Mic, MicOff, RotateCcw } from 'lucide-react';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function MicButton({ onResult, disabled }) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recRef = useRef(null);

  const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const getLanguageCode = () => {
    const lang = i18n.language || 'en';
    switch(lang) {
      case 'hi': return 'hi-IN';
      case 'mr': return 'mr-IN';
      default: return 'en-IN';
    }
  };

  const start = () => {
    if (!supported) { 
      setError(t('voice_unavailable')); 
      return; 
    }
    
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = getLanguageCode();
      rec.interimResults = false;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        const confidence = e.results[0][0].confidence;
        onResult({ text, confidence });
        setListening(false);
      };
      
      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        const errorMessage = e.error === 'not-allowed' 
          ? 'Microphone permission denied. Please allow microphone access.'
          : e.error === 'no-speech'
          ? 'No speech detected. Please try again.'
          : t('voice_unavailable');
        setError(errorMessage);
        setListening(false);
      };
      
      rec.onend = () => {
        setListening(false);
      };
      
      rec.onstart = () => {
        setListening(true);
        setError(null);
      };
      
      recRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Failed to start microphone. Please check your browser settings.');
      setListening(false);
    }
  };

  const stop = () => { 
    if (recRef.current) {
      recRef.current.stop();
    }
    setListening(false); 
  };

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
      {error && <span className="text-sm text-red-500 text-center max-w-xs">{error}</span>}
    </div>
  );
}
