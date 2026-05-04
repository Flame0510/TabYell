const el = {
  tabCount: document.getElementById('tabCount'),
  meterFill: document.getElementById('meterFill'),
  meterHint: document.getElementById('meterHint'),
  enabled: document.getElementById('enabled'),
  threshold: document.getElementById('threshold'),
  thresholdValue: document.getElementById('thresholdValue'),
  language: document.getElementById('language'),
  phraseMode: document.getElementById('phraseMode'),
  totalShames: document.getElementById('totalShames'),
  shameNow: document.getElementById('shameNow'),
  settingsToggle: document.getElementById('settingsToggle'),
  subtitle: document.querySelector('.subtitle')
};

let currentState = {
  threshold: 15,
  language: 'it',
  phraseMode: 'both',
  enabled: true,
  totalShames: 0,
  cooldownUntil: 0,
  lastTabCount: 0
};

function send(message) {
  return chrome.runtime.sendMessage(message);
}

function updateMeter(tabCount, threshold) {
  const ratio = Math.min((tabCount / threshold) * 100, 100);
  el.meterFill.style.width = `${ratio}%`;

  const near = tabCount >= threshold - 2;
  const over = tabCount >= threshold;

  if (over) {
    el.meterFill.style.background = 'var(--bad)';
    el.meterHint.textContent = 'Soglia superata: modalità drama';
  } else if (near) {
    el.meterFill.style.background = 'var(--warn)';
    el.meterHint.textContent = 'Quasi al limite: chiudi qualcosa';
  } else {
    el.meterFill.style.background = 'var(--good)';
    el.meterHint.textContent = 'Sotto controllo';
  }
}

function triggerShameFlash() {
  el.tabCount.classList.remove('shamed');
  // Force reflow so the animation restarts even if already shamed
  void el.tabCount.offsetWidth;
  el.tabCount.classList.add('shamed');
  el.tabCount.addEventListener('animationend', () => {
    el.tabCount.classList.remove('shamed');
  }, { once: true });
}

function render(state, flash = false) {
  currentState = { ...currentState, ...state };
  const tabCount = currentState.lastTabCount || 0;

  el.tabCount.textContent = String(tabCount);
  if (flash) triggerShameFlash();
  el.enabled.checked = !!currentState.enabled;
  el.threshold.value = String(currentState.threshold);
  el.thresholdValue.textContent = String(currentState.threshold);
  el.language.value = currentState.language;
  el.phraseMode.value = currentState.phraseMode || 'both';
  el.totalShames.textContent = String(currentState.totalShames || 0);
  updateMeter(tabCount, currentState.threshold);

  // Dynamic subtitle based on state
  const t = currentState.threshold;
  if (!currentState.enabled) {
    el.subtitle.textContent = 'Estensione disattivata. Vergogna sospesa.';
  } else if (tabCount >= t + 25) {
    el.subtitle.textContent = 'Situazione fuori controllo. Urgente.';
  } else if (tabCount >= t) {
    el.subtitle.textContent = 'Soglia superata. Modalità drama attiva.';
  } else if (tabCount >= t - 2) {
    el.subtitle.textContent = 'Quasi al limite. Stai attento.';
  } else {
    el.subtitle.textContent = 'Dignità del browser: in osservazione.';
  }
}

async function refresh() {
  const response = await send({ type: 'GET_STATUS' });
  if (response?.ok && response.state) {
    render(response.state);
  }
}

el.enabled.addEventListener('change', async () => {
  const response = await send({ type: 'UPDATE_SETTINGS', enabled: el.enabled.checked });
  if (response?.ok) render(response.state);
});

el.threshold.addEventListener('input', () => {
  el.thresholdValue.textContent = el.threshold.value;
  updateMeter(currentState.lastTabCount || 0, Number(el.threshold.value));
});

el.threshold.addEventListener('change', async () => {
  const threshold = Number(el.threshold.value);
  const response = await send({ type: 'UPDATE_SETTINGS', threshold });
  if (response?.ok) render(response.state);
});

el.language.addEventListener('change', async () => {
  const response = await send({ type: 'UPDATE_SETTINGS', language: el.language.value });
  if (response?.ok) render(response.state);
});

el.phraseMode.addEventListener('change', async () => {
  const response = await send({ type: 'UPDATE_SETTINGS', phraseMode: el.phraseMode.value });
  if (response?.ok) render(response.state);
});

// Opens the extension management page using the current extension's own ID
el.settingsToggle.addEventListener('click', () => {
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
});

el.shameNow.addEventListener('click', async () => {
  const response = await send({ type: 'SHAME_NOW' });
  if (response?.ok) render(response.state, true);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'TAB_COUNT_UPDATED') {
    render({ ...currentState, lastTabCount: message.tabCount });
  }
  if (message?.type === 'STATE_UPDATED' && message.state) {
    const wasShamed = message.state.totalShames > (currentState.totalShames || 0);
    render(message.state, wasShamed);
  }
});

refresh();
