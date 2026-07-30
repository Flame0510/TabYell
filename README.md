# TabYell

> Open too many tabs. Your browser yells at you.

TabYell is a deliberately dramatic Chrome extension that counts your open tabs and calls you out with sarcastic voice lines when things get out of hand.

## What it does

- speaks when newly opened tabs cross the chosen threshold;
- coalesces rapid tab events and applies a 60-second automatic speech cooldown;
- reacts when the user starts closing tabs again;
- follows the browser UI language: Italian for Italian browsers, English everywhere else;
- keeps a manual Italian/English voice override in the popup;
- ranks compatible voices installed on the device and avoids known low-quality variants;
- shows the current tab count in the extension badge;
- lets the user choose phrases with a count, without a count, or a mix.

## Speech and privacy

TabYell never reads page contents, URLs or tab titles, and it does not send browsing history to a TabYell server. It only uses the total number of open tabs, local extension storage and Chrome's text-to-speech API. No host permissions are required.

Voice synthesis follows a quality-first policy. Chrome may expose both local operating-system voices and remote speech engines installed or configured by the user. When Chrome marks the automatically selected voice as remote, the generated phrase — which may include the number of open tabs — can be processed by that speech engine over the network. The selected voice and whether it is local or remote are logged in the extension service worker console.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository folder.

## Validation

Run the repository checks with:

```bash
node tests/validate-extension.mjs
```

GitHub Actions runs the same validation for every pull request and push to `master`.

## Main files

- `manifest.json` — Chrome Manifest V3 configuration;
- `background.js` — tab events, state, phrases, badge and speech;
- `popup.html`, `popup.css`, `popup.js` — popup interface;
- `_locales/` — English and Italian interface catalogs;
- `icons/` — extension icons.

## Brand

- Name: **TabYell**
- Tagline: **Open too many tabs. Your browser yells at you.**
- Primary color: `#ffd23f`
- Accent color: `#ff9f1c`

## Release

The rebrand ships as version `1.2.0`. Updating the existing Chrome Web Store item preserves its extension ID and automatically migrates the old voice-interaction counter.
