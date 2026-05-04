chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SPEAK') return;
  const { text, lang } = message;

  window.speechSynthesis.cancel();

  const speak = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'it' ? 'it-IT' : 'en-US';
    u.pitch = 1.0;
    u.rate = 1.0;
    u.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const wanted = lang === 'it' ? ['it-IT', 'it'] : ['en-US', 'en-GB', 'en'];
    const voice = voices.find(v => wanted.some(c => v.lang?.toLowerCase().startsWith(c.toLowerCase())));
    if (voice) u.voice = voice;

    u.onstart = () => console.log('[TabShame offscreen] speech started');
    u.onerror = (e) => console.warn('[TabShame offscreen] speech error', e);
    window.speechSynthesis.speak(u);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    let spoken = false;
    window.speechSynthesis.onvoiceschanged = () => {
      if (!spoken) { spoken = true; speak(); }
      window.speechSynthesis.onvoiceschanged = null;
    };
    setTimeout(() => { if (!spoken) { spoken = true; speak(); } }, 600);
  } else {
    speak();
  }
});
