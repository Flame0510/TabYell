# TabYell

> Open too many tabs. Your browser yells at you.

TabYell is a deliberately dramatic Chrome extension that counts your open tabs and calls you out with sarcastic voice lines when things get out of hand.

## What it does

- speaks when a newly opened tab crosses your chosen threshold;
- reacts when you start closing tabs again;
- supports Italian and English voice lines;
- shows the current tab count in the extension badge;
- lets you choose phrases with a count, without a count, or a mix;
- keeps the experience local to the browser.

## Privacy

TabYell does not read page content and does not send browsing data to a server. It uses Chrome's tab count, local extension storage and text-to-speech APIs. No host permissions are required.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository folder.

## Main files

- `manifest.json` — Chrome Manifest V3 configuration;
- `background.js` — tab events, state, phrases, badge and speech;
- `popup.html`, `popup.css`, `popup.js` — popup interface;
- `icons/` — extension icons.

## Brand

- Name: **TabYell**
- Tagline: **Open too many tabs. Your browser yells at you.**
- Primary color: `#ffd23f`
- Accent color: `#ff9f1c`

## Release

The rebrand ships as version `1.2.0`. Updating the existing Chrome Web Store item preserves its extension ID and automatically migrates the old voice-interaction counter.
