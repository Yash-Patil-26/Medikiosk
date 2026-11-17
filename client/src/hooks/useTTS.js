import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function useTTS() {
  const { i18n } = useTranslation();
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  useEffect(() => {
    // Wait for voices to be loaded
    if (window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const getLanguageCode = () => {
    const lang = i18n.language || 'en';
    switch(lang) {
      case 'hi': return 'hi-IN';
      case 'mr': return 'mr-IN';
      default: return 'en-IN';
    }
  };

  const speak = useCallback((text, lang) => {
    if (!window.speechSynthesis || !voicesLoaded) {
      console.warn('Speech synthesis not available or voices not loaded');
      return;
    }

    window.speechSynthesis.cancel();

    // Clean the text - remove any special characters that might cause issues
    // Keep Hindi and Marathi Unicode ranges
    const cleanText = text.replace(/[^\w\s\u0900-\u097F\u0A80-\u0AFF.,?!'-]/g, '').trim();
    
    if (!cleanText) {
      console.warn('No text to speak after cleaning');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang || getLanguageCode();
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a matching voice for the language
    const voices = window.speechSynthesis.getVoices();
    const targetLang = lang || getLanguageCode();
    const matchingVoice = voices.find(voice => voice.lang.startsWith(targetLang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    // Add error handling
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error, 'for text:', cleanText);
    };

    utterance.onend = () => {
      console.log('Speech synthesis completed for:', cleanText);
    };

    window.speechSynthesis.speak(utterance);
  }, [i18n.language, voicesLoaded]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop, voicesLoaded };
}