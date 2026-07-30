const DEFAULT_STATE = {
  threshold: 15,
  language: 'en',
  languageMode: 'auto',
  enabled: true,
  totalYells: 0,
  cooldownUntil: 0,
  lastTabCount: 0,
  phraseMode: 'both'
};

const AUTOMATIC_YELL_SETTLE_MS = 350;
const YELL_COOLDOWN_MS = 60_000;

function detectBrowserLanguage() {
  const locale = chrome.i18n.getUILanguage?.()
    || chrome.i18n.getMessage('@@ui_locale')
    || 'en';
  return locale.toLowerCase().replace('_', '-').startsWith('it') ? 'it' : 'en';
}

function resolveLanguageState(stored = {}) {
  const detectedLanguage = detectBrowserLanguage();
  const storedLanguage = stored.language === 'it' || stored.language === 'en'
    ? stored.language
    : null;

  if (stored.languageMode === 'manual' && storedLanguage) {
    return { language: storedLanguage, languageMode: 'manual' };
  }

  if (stored.languageMode === 'auto') {
    return { language: detectedLanguage, languageMode: 'auto' };
  }

  // Legacy migration: English on an Italian browser was a deliberate choice.
  // The old Italian default on every other browser becomes automatic English.
  if (detectedLanguage === 'it' && storedLanguage === 'en') {
    return { language: 'en', languageMode: 'manual' };
  }

  return { language: detectedLanguage, languageMode: 'auto' };
}

// ── Storage helpers ──────────────────────────────────────────────────────────

async function getState() {
  const stored = await chrome.storage.local.get(null);
  const totalYells = Number.isFinite(stored.totalYells)
    ? stored.totalYells
    : Number.isFinite(stored.totalShames)
      ? stored.totalShames
      : 0;
  const languageState = resolveLanguageState(stored);

  return { ...DEFAULT_STATE, ...stored, totalYells, ...languageState };
}

async function setState(patch) {
  await chrome.storage.local.set(patch);
}

async function getTabCount() {
  const tabs = await chrome.tabs.query({});
  return tabs.length;
}

// ── Badge ────────────────────────────────────────────────────────────────────

async function updateBadge(tabCount, threshold) {
  chrome.action.setBadgeText({ text: String(tabCount) });
  chrome.action.setBadgeBackgroundColor({
    color: tabCount >= threshold ? '#e53e3e'
         : tabCount >= threshold * 0.7 ? '#d97706'
         : '#2d7d46'
  });
}

// Debounced badge — fires once after rapid open/close bursts settle
let _badgeTimer = null;
function scheduleBadgeUpdate() {
  if (_badgeTimer) clearTimeout(_badgeTimer);
  _badgeTimer = setTimeout(async () => {
    _badgeTimer = null;
    const [state, count] = await Promise.all([getState(), getTabCount()]);
    await updateBadge(count, state.threshold);
    broadcast({ type: 'TAB_COUNT_UPDATED', tabCount: count });
  }, 200);
}

// ── Broadcast ────────────────────────────────────────────────────────────────

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

// ── TTS ──────────────────────────────────────────────────────────────────────

const VOICE_NAME_PRIORITY = {
  en: [
    'Samantha',
    'Alex',
    'Ava',
    'Allison',
    'Google US English',
    'Microsoft Aria',
    'Microsoft Jenny',
    'Microsoft Guy',
    'Daniel',
    'Karen',
    'Moira'
  ],
  it: [
    'Alice',
    'Federica',
    'Luca',
    'Paola',
    'Google italiano',
    'Microsoft Elsa',
    'Microsoft Isabella'
  ]
};

const LOW_QUALITY_VOICE_HINTS = [
  'compact',
  'espeak',
  'novelty',
  'whisper',
  'organ',
  'cellos',
  'bells',
  'boing',
  'bad news',
  'good news'
];

const _voiceCache = new Map();

function scoreVoice(voice, language) {
  const targetLanguage = language === 'it' ? 'it' : 'en';
  const targetLocale = language === 'it' ? 'it-it' : 'en-us';
  const voiceLocale = (voice.lang || '').toLowerCase().replace('_', '-');
  const voiceName = (voice.voiceName || '').toLowerCase();

  if (!voiceLocale.startsWith(targetLanguage)) return Number.NEGATIVE_INFINITY;

  let score = voiceLocale === targetLocale ? 60 : 40;
  const preferredIndex = VOICE_NAME_PRIORITY[language].findIndex((name) =>
    voiceName.includes(name.toLowerCase())
  );
  if (preferredIndex >= 0) score += 250 - preferredIndex * 12;

  if (/(enhanced|premium|natural|neural|online)/.test(voiceName)) score += 70;
  // Quality-first policy: remote voices are allowed and explicitly disclosed.
  if (voice.remote) score += 10;
  if (LOW_QUALITY_VOICE_HINTS.some((hint) => voiceName.includes(hint))) score -= 200;
  if (voice.eventTypes?.includes('end')) score += 15;
  if (voice.eventTypes?.includes('start')) score += 5;

  return score;
}

async function selectBestVoice(language) {
  if (_voiceCache.has(language)) return _voiceCache.get(language);

  try {
    const voices = await chrome.tts.getVoices();
    const selected = voices
      .map((voice) => ({ voice, score: scoreVoice(voice, language) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => b.score - a.score)[0]?.voice || null;

    _voiceCache.set(language, selected);
    return selected;
  } catch (error) {
    console.warn('[TabYell tts] Could not inspect installed voices', error);
    return null;
  }
}

if (chrome.tts.onVoicesChanged) {
  chrome.tts.onVoicesChanged.addListener(() => _voiceCache.clear());
}

async function speak(text, language) {
  const voice = await selectBestVoice(language);
  const languageTag = voice?.lang || (language === 'it' ? 'it-IT' : 'en-US');
  const fallbackDuration = Math.min(
    12_000,
    Math.max(4_500, text.length * (language === 'en' ? 85 : 80))
  );

  console.log(
    '[TabYell tts] voice:',
    voice?.voiceName || 'Chrome default',
    languageTag,
    voice ? (voice.remote ? '(remote)' : '(local)') : ''
  );

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      resolve(result);
    };
    const fallbackTimer = setTimeout(() => finish(true), fallbackDuration);

    chrome.tts.stop();

    const options = {
      lang: languageTag,
      rate: language === 'en' ? 0.94 : 1.0,
      pitch: language === 'en' ? 0.96 : 1.0,
      volume: 1.0,
      desiredEventTypes: ['start', 'end', 'interrupted', 'cancelled', 'error'],
      onEvent: (event) => {
        if (event.type === 'end') finish(true);
        if (event.type === 'interrupted' || event.type === 'cancelled') finish(false);
        if (event.type === 'error') {
          console.warn('[TabYell tts]', event.errorMessage || event);
          finish(false);
        }
      }
    };
    if (voice?.voiceName) options.voiceName = voice.voiceName;
    if (voice?.extensionId) options.extensionId = voice.extensionId;

    try {
      const speaking = chrome.tts.speak(text, options);
      speaking?.catch((error) => {
        console.warn('[TabYell tts] speak failed', error);
        finish(false);
      });
    } catch (error) {
      console.warn('[TabYell tts] speak failed', error);
      finish(false);
    }
  });
}

// ── Phrases ──────────────────────────────────────────────────────────────────

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTier(tabCount, threshold) {
  if (tabCount >= threshold + 85) return 'tier6'; // ~100+ tab
  if (tabCount >= threshold + 35) return 'tier5'; // ~50+ tab
  if (tabCount >= threshold + 25) return 'tier4'; // ~40+ tab
  if (tabCount >= threshold + 16) return 'tier3'; // ~31+ tab
  if (tabCount >= threshold + 6)  return 'tier2'; // ~21+ tab
  return 'tier1';
}

function isMilestone(tabCount, threshold) {
  return tabCount > threshold && (tabCount - threshold) % 10 === 0;
}

const PHRASES = {
  it: {
    tier1: {
      withCount: [
        '{count} tab aperte. Sei sicuro di star lavorando?',
        '{count} tab. Complimenti, il caos è ufficiale.',
        'Tab numero {count}. Ci siamo.',
      ],
      noCount: [
        'Il browser ti guarda con delusione.',
        'Respira. Chiudine due e nessuno si farà male.',
        'Produttività o collezionismo compulsivo?',
        'Stai accumulando tab o stai lavorando?'
      ]
    },
    tier2: {
      withCount: [
        '{count} tab. Il tuo browser sta soffrendo in silenzio.',
        '{count} tab. Interessante scelta di vita.',
      ],
      noCount: [
        'Questa non è ricerca, è una saga.',
        'La RAM ha mandato una lettera di protesta.',
        'Hai più tab che priorità chiare. E si sente.',
        'Se ognuna fosse un pensiero, avresti bisogno di ferie.',
        'Stai navigando o stai costruendo un archivio?'
      ]
    },
    tier3: {
      withCount: [
        '{count} tab aperte. Stai bene? Vuoi parlarne?',
        '{count} tab. Il tuo laptop sta entrando nella fase drammatica.',
      ],
      noCount: [
        'Questa finestra è un museo di decisioni rimandate.',
        'Il multitasking è bello, ma qui siamo in modalità survival.',
        "Ognuna è un 'poi lo leggo'. Non lo leggerai.",
        'A questo punto stai navigando o stai accumulando?',
        'Il browser ha smesso di sperare.'
      ]
    },
    tier4: {
      withCount: [
        '{count} tab. Questo non è più un browser, è un archivio psichiatrico.',
        '{count} tab. Sono senza parole. Quasi.',
      ],
      noCount: [
        'Stai navigando o stai costruendo un dungeon?',
        'Il computer ti vuole bene, ma non così tanto.',
        'Hai raggiunto il livello boss finale del tab hoarding.',
        'Serve un piano di evacuazione, non un altro tab.',
        'A questo punto chiama direttamente un terapeuta.'
      ]
    },
    tier5: {
      withCount: [
        '{count} tab. Sei clinicamente irrecuperabile.',
        '{count} tab aperte. Il browser ha scritto il testamento.',
        '{count} tab. Non sei un utente, sei un disastro naturale.',
      ],
      noCount: [
        'Hai superato ogni limite umano conosciuto.',
        'La RAM piange. Il processore ha già rassegnato le dimissioni.',
        'Questo non è più un browser. È una catastrofe con favicon.',
        'Non esiste terapia per quello che stai facendo.',
        'Sei il motivo per cui i computer hanno ventole.'
      ]
    },
    tier6: {
      withCount: [
        "{count} tab. Sei un crimine contro l'umanità digitale.",
        '{count} tab aperte. Questo è un atto di terrorismo informatico.',
        '{count} tab. Ho chiamato le autorità. Stanno arrivando.',
      ],
      noCount: [
        'Dovresti essere arrestato. Immediatamente.',
        'Hai rotto internet. Sei contento adesso?',
        'Nemmeno la NASA apre così tante tab. E loro vanno nello spazio.',
        'Il tuo laptop ti odia. Profondamente. E con ragione.',
        'Stai distruggendo la civiltà un tab alla volta.'
      ]
    },
    milestones: {
      withCount: [
        'Milestone drammatica: {count} tab esatte. Premio caos sbloccato.',
        '{count} tab tonde tonde. Terrificante.',
        '{count} tab. Anche il task manager si è messo a pregare.',
        '{count} tab aperte. Fase controllo: superata.'
      ],
      noCount: [
        'Hai raggiunto una milestone. Terrificante.',
        'Il task manager si è messo a pregare.',
        'Fase controllo: abbondantemente superata.'
      ]
    },
    relief: {
      withCount: [],
      noCount: [
        'Ah, finalmente. Sono commosso.',
        'Benvenuto nel club del buon senso.',
        'Piccolo passo per te, grande passo per la RAM.',
        'Il coraggio di fare spazio. Bravo.',
        'Sento già il browser respirare meglio.',
        'Continua così e forse tornerai umano.',
        'Stai liberando. Come ti senti? Bene, vero?',
        'Questo è crescita personale. Sono orgoglioso.',
        'Ce la stai facendo. Continua.'
      ]
    }
  },
  en: {
    tier1: {
      withCount: [
        "{count} tabs open. Bold strategy. Let's see how that plays out.",
        'Tab number {count}. This is getting cinematic.',
        '{count} tabs. Noted.',
      ],
      noCount: [
        'Your browser is quietly judging you.',
        'Close a couple. Your future self will thank you.',
        'Ambition or mild chaos? Hard to tell.',
        'Are you working or just collecting tabs?'
      ]
    },
    tier2: {
      withCount: [
        "{count} tabs. Your RAM called. It's crying.",
        '{count} tabs. Interesting life choice.',
      ],
      noCount: [
        'This is not a workflow, this is a side quest.',
        'More tabs than clear decisions right now.',
        'Your CPU is trying to stay positive. Help it.',
        'This feels like emotional multitasking.',
        'At this point, are you browsing or hoarding?'
      ]
    },
    tier3: {
      withCount: [
        '{count} tabs open. Are you okay? Blink twice if you need help.',
        '{count} tabs. Productivity has entered the danger zone.',
      ],
      noCount: [
        'This window is a museum of unfinished intentions.',
        "Tab-based procrastination. Let's call it what it is.",
        'You are no longer browsing. You are orbiting.',
        'The browser has given up hope.',
        'This is not a session, this is an emergency.'
      ]
    },
    tier4: {
      withCount: [
        "{count} tabs open. You're not browsing, you're hoarding.",
        '{count} tabs. I have no words. Almost.',
      ],
      noCount: [
        'Your laptop deserves a standing ovation for surviving this.',
        'Final boss mode: Chrome Tab Dragon. Unlocked.',
        'This is no longer a browser, this is a digital attic.',
        'Close some tabs before the fan takes off.',
        'At this point, just call a therapist.'
      ]
    },
    tier5: {
      withCount: [
        '{count} tabs. You are clinically beyond saving.',
        '{count} tabs open. The browser has written its will.',
        "{count} tabs. You're not a user, you're a natural disaster.",
      ],
      noCount: [
        'You have surpassed every known human limit.',
        'The RAM is crying. The CPU has already resigned.',
        'This is not a browser anymore. This is a catastrophe with a favicon.',
        'There is no therapy for what you are doing.',
        'You are the reason computers have fans.'
      ]
    },
    tier6: {
      withCount: [
        '{count} tabs. You are a crime against digital humanity.',
        '{count} tabs open. This is an act of cyber terrorism.',
        '{count} tabs. I have called the authorities. They are on their way.',
      ],
      noCount: [
        'You should be arrested. Immediately.',
        'You broke the internet. Happy now?',
        'Even NASA does not open this many tabs. And they go to space.',
        'Your laptop hates you. Deeply. And rightfully so.',
        'You are destroying civilization one tab at a time.'
      ]
    },
    milestones: {
      withCount: [
        'Milestone: exactly {count} tabs. Chaos with structure.',
        '{count} tabs exactly. Terrifyingly round.',
        '{count} tabs. Your task manager just sighed.',
        '{count} tabs. Impressive, concerning, iconic.'
      ],
      noCount: [
        'Another milestone. Terrifyingly impressive.',
        'Your task manager just sighed.',
        'Impressive, concerning, iconic.'
      ]
    },
    relief: {
      withCount: [],
      noCount: [
        'Finally. I almost cried.',
        'Welcome to the club of reasonable people.',
        'One tab down. Your RAM says thank you.',
        'Look at you, making good decisions.',
        'The browser can breathe again. Well done.',
        'Progress. Actual progress.',
        'Finally some common sense.',
        "You're freeing up space. How does that feel?",
        'Personal growth. I am here for it.',
        'Keep going. You can do this.'
      ]
    }
  }
};

function buildPhrase(tabCount, lang, threshold, type, phraseMode) {
  const dict = PHRASES[lang] || PHRASES.it;
  const tierKey = type === 'relief' ? 'relief'
                : isMilestone(tabCount, threshold) ? 'milestones'
                : getTier(tabCount, threshold);
  const tier = dict[tierKey];

  let pool = [];
  if (phraseMode === 'with-count') {
    pool = tier.withCount.length ? tier.withCount : tier.noCount;
  } else if (phraseMode === 'without-count') {
    pool = tier.noCount.length ? tier.noCount : tier.withCount;
  } else {
    pool = [...tier.withCount, ...tier.noCount];
  }
  if (!pool.length) pool = [...(tier.withCount || []), ...(tier.noCount || [])];

  return pickRandom(pool).replaceAll('{count}', String(tabCount));
}

// ── Core yell logic ─────────────────────────────────────────────────────────

// Rapid automatic events are coalesced; at most one automatic yell stays pending.
let _yellHandling = false;
let _pendingAutomaticDirection = null;
let _manualYellPending = false;
let _automaticYellTimer = null;

function scheduleAutomaticYell(direction) {
  _pendingAutomaticDirection = direction;
  if (_automaticYellTimer) clearTimeout(_automaticYellTimer);
  _automaticYellTimer = setTimeout(() => {
    _automaticYellTimer = null;
    drainYellQueue();
  }, AUTOMATIC_YELL_SETTLE_MS);
}

function scheduleManualYell() {
  _manualYellPending = true;
  _pendingAutomaticDirection = null;
  if (_automaticYellTimer) {
    clearTimeout(_automaticYellTimer);
    _automaticYellTimer = null;
  }

  // A manual request takes priority over an automatic utterance already playing.
  chrome.tts.stop();
  drainYellQueue();
}

async function drainYellQueue() {
  if (_yellHandling) return;

  let task = null;
  if (_manualYellPending) {
    _manualYellPending = false;
    task = { direction: 'neutral', force: true };
  } else if (!_automaticYellTimer && _pendingAutomaticDirection) {
    task = { direction: _pendingAutomaticDirection, force: false };
    _pendingAutomaticDirection = null;
  }

  if (!task) return;

  _yellHandling = true;
  try {
    await handleYell(task.direction, task.force);
  } catch (error) {
    console.warn('[TabYell] yell error', error);
  } finally {
    _yellHandling = false;
    drainYellQueue();
  }
}

async function handleYell(direction, force = false) {
  const [state, tabCount] = await Promise.all([getState(), getTabCount()]);

  await setState({ lastTabCount: tabCount });

  if (!state.enabled) return false;
  if (!force && Date.now() < state.cooldownUntil) return false;

  let type = null;
  if (force) {
    type = 'yell';
  } else if (direction === 'up' && tabCount >= state.threshold) {
    type = 'yell';
  } else if (direction === 'down' && state.lastTabCount >= state.threshold) {
    type = 'relief';
  }

  if (!type) return false;

  const text = buildPhrase(tabCount, state.language, state.threshold, type, state.phraseMode || 'both');
  console.log('[TabYell] speaking:', text);
  const spoke = await speak(text, state.language);

  if (!spoke) return false;

  const patch = { cooldownUntil: Date.now() + YELL_COOLDOWN_MS };
  if (type === 'yell') patch.totalYells = (state.totalYells || 0) + 1;
  await setState(patch);

  if (type === 'yell') {
    broadcast({
      type: 'STATE_UPDATED',
      source: force ? 'manual' : 'automatic',
      state: await getState()
    });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
    setTimeout(async () => {
      const [s, c] = await Promise.all([getState(), getTabCount()]);
      updateBadge(c, s.threshold);
    }, 2000);
  }

  return true;
}

// ── Listeners ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  const totalYells = Number.isFinite(current.totalYells)
    ? current.totalYells
    : Number.isFinite(current.totalShames)
      ? current.totalShames
      : 0;

  const languageState = resolveLanguageState(current);
  await chrome.storage.local.set({
    ...DEFAULT_STATE,
    ...current,
    totalYells,
    ...languageState
  });
  if ('totalShames' in current) await chrome.storage.local.remove('totalShames');

  const [nextState, count] = await Promise.all([getState(), getTabCount()]);
  await setState({ lastTabCount: count });
  await updateBadge(count, nextState.threshold);
});

chrome.runtime.onStartup.addListener(async () => {
  const [state, count] = await Promise.all([getState(), getTabCount()]);
  await setState({ lastTabCount: count });
  await updateBadge(count, state.threshold);
});

// Badge update is debounced — fires once after rapid burst settles
chrome.tabs.onCreated.addListener(() => {
  scheduleBadgeUpdate();
  scheduleAutomaticYell('up');
});

chrome.tabs.onRemoved.addListener(() => {
  scheduleBadgeUpdate();
  scheduleAutomaticYell('down');
});

chrome.tabs.onActivated.addListener(async () => {
  const [state, count] = await Promise.all([getState(), getTabCount()]);
  await updateBadge(count, state.threshold);
  broadcast({ type: 'TAB_COUNT_UPDATED', tabCount: count });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === 'GET_STATUS') {
      const [state, tabCount] = await Promise.all([getState(), getTabCount()]);
      sendResponse({ ok: true, state: { ...state, lastTabCount: tabCount } });
      return;
    }
    if (message?.type === 'UPDATE_SETTINGS') {
      const patch = {};
      if (typeof message.enabled === 'boolean') patch.enabled = message.enabled;
      if (typeof message.threshold === 'number') patch.threshold = message.threshold;
      if (message.languageMode === 'auto') {
        Object.assign(patch, resolveLanguageState({ languageMode: 'auto' }));
      } else if (message.language === 'it' || message.language === 'en') {
        patch.language = message.language;
        patch.languageMode = 'manual';
      }
      if (['with-count', 'without-count', 'both'].includes(message.phraseMode)) patch.phraseMode = message.phraseMode;
      await setState(patch);
      const [next, count] = await Promise.all([getState(), getTabCount()]);
      await updateBadge(count, next.threshold);
      sendResponse({ ok: true, state: { ...next, lastTabCount: count } });
      return;
    }
    if (message?.type === 'YELL_NOW') {
      const [next, count] = await Promise.all([getState(), getTabCount()]);
      if (next.enabled) scheduleManualYell();
      sendResponse({
        ok: true,
        queued: next.enabled,
        state: { ...next, lastTabCount: count }
      });
      return;
    }
    sendResponse({ ok: false, error: 'Unknown message type' });
  })();
  return true;
});
