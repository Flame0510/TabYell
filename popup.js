function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

function getBrowserVoiceLanguage() {
  const locale = chrome.i18n.getUILanguage?.() || chrome.i18n.getMessage('@@ui_locale') || 'en';
  return locale.toLowerCase().replace('_', '-').startsWith('it') ? 'it' : 'en';
}

function localizePopup() {
  const browserLanguage = getBrowserVoiceLanguage();
  document.documentElement.lang = browserLanguage;
  document.title = t('extensionName');

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  });

  const autoOption = document.getElementById('languageAuto');
  const detectedLanguage = browserLanguage === 'it' ? 'Italiano' : 'English';
  autoOption.textContent = `🌐 ${t('languageAuto')} (${detectedLanguage})`;
}

localizePopup();

const el = {
  tabCount: document.getElementById('tabCount'),
  meterFill: document.getElementById('meterFill'),
  meterHint: document.getElementById('meterHint'),
  enabled: document.getElementById('enabled'),
  threshold: document.getElementById('threshold'),
  thresholdValue: document.getElementById('thresholdValue'),
  language: document.getElementById('language'),
  phraseMode: document.getElementById('phraseMode'),
  totalYells: document.getElementById('totalYells'),
  yellNow: document.getElementById('yellNow'),
  settingsToggle: document.getElementById('settingsToggle'),
  subtitle: document.querySelector('.subtitle')
};

let currentState = {
  threshold: 15,
  language: getBrowserVoiceLanguage(),
  languageMode: 'auto',
  phraseMode: 'both',
  enabled: true,
  totalYells: 0,
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
    el.meterHint.textContent = t('meterOver');
  } else if (near) {
    el.meterFill.style.background = 'var(--warn)';
    el.meterHint.textContent = t('meterNear');
  } else {
    el.meterFill.style.background = 'var(--good)';
    el.meterHint.textContent = t('meterFine');
  }
}

function triggerYellPulse() {
  el.tabCount.classList.remove('yelled');
  void el.tabCount.offsetWidth;
  el.tabCount.classList.add('yelled');
  el.tabCount.addEventListener('animationend', () => {
    el.tabCount.classList.remove('yelled');
  }, { once: true });
}

function render(state, flash = false) {
  currentState = { ...currentState, ...state };
  const tabCount = currentState.lastTabCount || 0;

  el.tabCount.textContent = String(tabCount);
  if (flash) triggerYellPulse();
  el.enabled.checked = !!currentState.enabled;
  el.threshold.value = String(currentState.threshold);
  el.thresholdValue.textContent = String(currentState.threshold);
  el.language.value = currentState.languageMode === 'auto' ? 'auto' : currentState.language;
  el.phraseMode.value = currentState.phraseMode || 'both';
  el.totalYells.textContent = String(currentState.totalYells || 0);
  updateMeter(tabCount, currentState.threshold);

  const threshold = currentState.threshold;
  if (!currentState.enabled) {
    el.subtitle.textContent = t('subtitleDisabled');
  } else if (tabCount >= threshold + 25) {
    el.subtitle.textContent = t('subtitleCritical');
  } else if (tabCount >= threshold) {
    el.subtitle.textContent = t('subtitleOver');
  } else if (tabCount >= threshold - 2) {
    el.subtitle.textContent = t('subtitleNear');
  } else {
    el.subtitle.textContent = t('subtitleFine');
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
  const selectedLanguage = el.language.value;
  const message = selectedLanguage === 'auto'
    ? { type: 'UPDATE_SETTINGS', languageMode: 'auto' }
    : { type: 'UPDATE_SETTINGS', language: selectedLanguage, languageMode: 'manual' };
  const response = await send(message);
  if (response?.ok) render(response.state);
});

el.phraseMode.addEventListener('change', async () => {
  const response = await send({ type: 'UPDATE_SETTINGS', phraseMode: el.phraseMode.value });
  if (response?.ok) render(response.state);
});

el.settingsToggle.addEventListener('click', () => {
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
});

el.yellNow.addEventListener('click', async () => {
  const response = await send({ type: 'YELL_NOW' });
  if (response?.ok) render(response.state, true);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'TAB_COUNT_UPDATED') {
    render({ ...currentState, lastTabCount: message.tabCount });
  }
  if (message?.type === 'STATE_UPDATED' && message.state) {
    const wasYelled = message.state.totalYells > (currentState.totalYells || 0);
    render(message.state, wasYelled);
  }
});

refresh();
