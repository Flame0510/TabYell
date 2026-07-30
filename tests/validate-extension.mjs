import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function waitFor(predicate, message, timeout = 1000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeout) {
      assert.fail(message);
    }
    await wait(10);
  }
}

const [
  manifestSource,
  popupHtml,
  popupSource,
  backgroundSource,
  englishSource,
  italianSource,
  readme,
  handover
] = await Promise.all([
  read('manifest.json'),
  read('popup.html'),
  read('popup.js'),
  read('background.js'),
  read('_locales/en/messages.json'),
  read('_locales/it/messages.json'),
  read('README.md'),
  read('HANDOVER.md')
]);

const manifest = JSON.parse(manifestSource);
const english = JSON.parse(englishSource);
const italian = JSON.parse(italianSource);

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.default_locale, 'en');
assert.deepEqual(manifest.permissions.sort(), ['storage', 'tabs', 'tts']);
assert.equal(manifest.host_permissions, undefined);

const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
for (const [name, source] of [
  ['popup.html', popupHtml],
  ['popup.js', popupSource],
  ['English locale', englishSource],
  ['Italian locale', italianSource]
]) {
  assert.equal(emojiPattern.test(source), false, `${name} must not contain emoji`);
}

const englishKeys = Object.keys(english).sort();
const italianKeys = Object.keys(italian).sort();
assert.deepEqual(italianKeys, englishKeys, 'Locale catalogs must expose identical keys');

const manifestMessages = [...manifestSource.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)]
  .map((match) => match[1]);
const popupMessages = [
  ...popupHtml.matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g)
].map((match) => match[1]);
const popupScriptMessages = [...popupSource.matchAll(/\bt\('([^']+)'\)/g)]
  .map((match) => match[1]);
const referencedMessages = new Set([
  ...manifestMessages,
  ...popupMessages,
  ...popupScriptMessages
]);

for (const key of referencedMessages) {
  assert.ok(english[key], `Missing English message: ${key}`);
  assert.ok(italian[key], `Missing Italian message: ${key}`);
}

const htmlIds = new Set(
  [...popupHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
);
const scriptIds = [...popupSource.matchAll(/getElementById\('([^']+)'\)/g)]
  .map((match) => match[1]);
for (const id of scriptIds) {
  assert.ok(htmlIds.has(id), `popup.js references missing element #${id}`);
}

assert.ok(!readme.includes('\\n'), 'README contains a literal \\n sequence');
assert.ok(!handover.includes('\\n'), 'HANDOVER contains a literal \\n sequence');
assert.ok(!backgroundSource.includes('chrome.alarms'), 'Background still uses alarms');
assert.ok(
  backgroundSource.includes('Date.now() < state.cooldownUntil'),
  'Automatic speech must enforce cooldownUntil'
);

for (const [filename, source] of [
  ['background.js', backgroundSource],
  ['popup.js', popupSource]
]) {
  new vm.Script(source, { filename });
}

function createBackgroundHarness({
  locale = 'en-US',
  tabCount = 17,
  storedState = {},
  voices
} = {}) {
  const listeners = {};
  const state = {
    threshold: 15,
    language: 'en',
    languageMode: 'auto',
    enabled: true,
    totalYells: 0,
    cooldownUntil: 0,
    lastTabCount: 14,
    phraseMode: 'without-count',
    ...storedState
  };
  let currentTabCount = tabCount;
  const spoken = [];

  const scaledSetTimeout = (callback, delay, ...args) =>
    setTimeout(callback, Math.min(delay, 20), ...args);

  const chrome = {
    i18n: {
      getUILanguage: () => locale,
      getMessage: () => locale.replace('-', '_')
    },
    storage: {
      local: {
        get: async () => ({ ...state }),
        set: async (patch) => Object.assign(state, patch),
        remove: async (key) => {
          delete state[key];
        }
      }
    },
    tabs: {
      query: async () =>
        Array.from({ length: currentTabCount }, (_, id) => ({ id })),
      onCreated: {
        addListener: (listener) => {
          listeners.created = listener;
        }
      },
      onRemoved: {
        addListener: (listener) => {
          listeners.removed = listener;
        }
      },
      onActivated: {
        addListener: (listener) => {
          listeners.activated = listener;
        }
      }
    },
    action: {
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {}
    },
    runtime: {
      sendMessage: async () => {},
      onInstalled: {
        addListener: (listener) => {
          listeners.installed = listener;
        }
      },
      onStartup: {
        addListener: (listener) => {
          listeners.startup = listener;
        }
      },
      onMessage: {
        addListener: (listener) => {
          listeners.message = listener;
        }
      }
    },
    tts: {
      getVoices: async () =>
        voices || [{
          voiceName: 'Samantha',
          lang: 'en-US',
          remote: false,
          eventTypes: ['start', 'end']
        }],
      stop: () => {},
      speak: (text, options) => {
        spoken.push({ text, options });
        setTimeout(() => options.onEvent({ type: 'end' }), 1);
        return Promise.resolve();
      },
      onVoicesChanged: {
        addListener: () => {}
      }
    }
  };

  const context = vm.createContext({
    chrome,
    console: { log: () => {}, warn: () => {} },
    setTimeout: scaledSetTimeout,
    clearTimeout,
    Date,
    Map,
    Math,
    Number,
    Promise,
    String
  });
  vm.runInContext(backgroundSource, context, { filename: 'background.js' });

  return {
    listeners,
    state,
    spoken,
    setTabCount(value) {
      currentTabCount = value;
    },
    sendMessage(message) {
      return new Promise((resolve) => {
        listeners.message(message, null, resolve);
      });
    }
  };
}

{
  const harness = createBackgroundHarness();
  harness.listeners.created();
  harness.listeners.created();
  harness.listeners.created();
  await waitFor(
    () => harness.state.totalYells === 1,
    'Automatic yell did not complete'
  );

  assert.equal(harness.spoken.length, 1, 'Rapid tab events must be coalesced');
  assert.equal(harness.state.totalYells, 1);
  assert.ok(harness.state.cooldownUntil > Date.now());

  harness.setTabCount(18);
  harness.listeners.created();
  await wait(80);
  assert.equal(
    harness.spoken.length,
    1,
    'Automatic speech must be suppressed during cooldown'
  );

  const startedAt = Date.now();
  const response = await harness.sendMessage({ type: 'YELL_NOW' });
  assert.equal(response.ok, true);
  assert.equal(response.queued, true);
  assert.ok(Date.now() - startedAt < 100, 'Manual response should be immediate');
  await waitFor(
    () => harness.state.totalYells === 2,
    'Manual yell did not complete'
  );
  assert.equal(harness.spoken.length, 2, 'Manual speech must bypass cooldown');
}

{
  const harness = createBackgroundHarness({
    tabCount: 10,
    voices: [
      {
        voiceName: 'Local English Voice',
        lang: 'en-US',
        remote: false,
        eventTypes: ['end']
      },
      {
        voiceName: 'Google US English',
        lang: 'en-US',
        remote: true,
        eventTypes: ['end']
      }
    ]
  });
  await harness.sendMessage({ type: 'YELL_NOW' });
  await waitFor(
    () => harness.spoken.length === 1,
    'Remote voice test did not speak'
  );
  assert.equal(harness.spoken[0].options.voiceName, 'Google US English');
}

{
  const harness = createBackgroundHarness({
    locale: 'fr-FR',
    storedState: {
      language: undefined,
      languageMode: undefined
    }
  });
  const response = await harness.sendMessage({ type: 'GET_STATUS' });
  assert.equal(response.state.language, 'en');
  assert.equal(response.state.languageMode, 'auto');
}

{
  const harness = createBackgroundHarness({
    locale: 'it-IT',
    storedState: {
      language: undefined,
      languageMode: undefined
    }
  });
  const response = await harness.sendMessage({ type: 'GET_STATUS' });
  assert.equal(response.state.language, 'it');
  assert.equal(response.state.languageMode, 'auto');
}

console.log('TabYell validation passed');
