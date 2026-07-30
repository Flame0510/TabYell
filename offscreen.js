chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SPEAK') return;
  const { text, lang } = message;

  window.speechSynthesis.cancel();

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'it' ? 'it-IT' : 'en-US';
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const wanted = lang === 'it' ? ['it-IT', 'it'] : ['en-US', 'en-GB', 'en'];
    const voice = voices.find((candidate) =>
      wanted.some((code) => candidate.lang?.toLowerCase().startsWith(code.toLowerCase()))
    );
    if (voice) utterance.voice = voice;

    utterance.onstart = () => console.log('[TabYell offscreen] speech started');
    utterance.onerror = (event) => console.warn('[TabYell offscreen] speech error', event);
    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    let spoken = false;
    window.speechSynthesis.onvoiceschanged = () => {
      if (!spoken) {
        spoken = true;
        speak();
      }
      window.speechSynthesis.onvoiceschanged = null;
    };
    setTimeout(() => {
      if (!spoken) {
        spoken = true;
        speak();
      }
    }, 600);
  } else {
    speak();
  }
});
