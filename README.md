# TabYell

> Open too many tabs. Your browser yells at you.

TabYell is a deliberately dramatic Chrome extension that counts your open tabs and calls you out with sarcastic voice lines when things get out of hand.

## What it does

- speaks when newly opened tabs cross the chosen threshold;
- coalesces rapid tab events so bursts of tabs produce a single evaluation;
- reacts with relief phrases when the user starts closing tabs again, down to (and including) returning to the configured limit;
- stays silent once the tab count drops below the limit;
- follows the browser UI language: Italian for Italian browsers, English everywhere else;
- keeps a manual Italian/English voice override in the popup;
- ranks compatible voices installed on the device and avoids known low-quality variants;
- avoids repeating the same phrase twice in a row (when the phrase pool allows it);
- shows the current tab count in the extension badge;
- lets the user choose phrases with a count, without a count, or a mix.

## Speech and privacy

TabYell never reads page contents, URLs or tab titles, and it does not send browsing history to a TabYell server. It only uses the total number of open tabs, local extension storage and Chrome's text-to-speech API. No host permissions are required.

Voice synthesis follows a quality-first policy. Chrome may expose both local operating-system voices and remote speech engines installed or configured by the user. When Chrome marks the automatically selected voice as remote, the generated phrase — which may include the number of open tabs — can be processed by that speech engine over the network. The selected voice and whether it is local or remote are logged in the extension service worker console.

## Build and test locally

Create both the Chrome Web Store ZIP and an unpacked test directory with:

```bash
bash scripts/package-extension.sh
```

The command reads the version from `manifest.json` and creates:

- `dist/tabyell-<version>.zip` — upload this file to the Chrome Web Store;
- `dist/tabyell-<version>.zip.sha256` — package checksum;
- `dist/tabyell-<version>-unpacked/` — load this directory directly in Chrome.

To test the unpacked build:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `dist/tabyell-<version>-unpacked/`.

The packaging script requires Bash, Node.js, `zip` and `unzip`.

## GitHub Actions packages

The **Package extension** workflow validates and packages TabYell for every pull request, every push to `master`, and every manual run.

Open the relevant run in the repository's **Actions** tab and download the `tabyell-<version>` artifact. It contains the Chrome Web Store ZIP and its SHA-256 checksum. Workflow artifacts are retained for 90 days.

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

Updating the existing Chrome Web Store item preserves its extension ID and the current users.

Before publishing a new version:

1. update `version` in `manifest.json`;
2. merge the change into `master` and verify the **Package extension** workflow;
3. upload the generated ZIP to the existing Chrome Web Store listing.

To also create a permanent GitHub Release, push a tag matching the manifest version exactly, for example:

```bash
git tag v1.2.0
git push origin v1.2.0
```

A mismatched tag and manifest version intentionally fails instead of publishing the wrong package. A valid tag creates a GitHub Release containing the ZIP and checksum.