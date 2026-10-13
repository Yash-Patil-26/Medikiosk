export function useTTS() {
  const speak = (text, lang = 'en-IN') => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    window.speechSynthesis.speak(utt);
  };
  const stop = () => window.speechSynthesis?.cancel();
  return { speak, stop };
}
