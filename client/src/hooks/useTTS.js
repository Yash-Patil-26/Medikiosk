import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useTTS() {
  const { i18n } = useTranslation();

  const getLanguageCode = () => {
    const lang = i18n.language || 'en';
    switch(lang) {
      case 'hi': return 'hi-IN';
      case 'mr': return 'mr-IN';
      default: return 'en-IN';
    }
  };

  const speak = useCallback((text, lang) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || getLanguageCode();
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }, [i18n.language]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop };
}