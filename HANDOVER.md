# TabShame — Handover Document
**Versione attuale:** 0.7  
**Data:** 2026-04-03  
**Autore:** Claw (OpenClaw VPS) → Handover a OpenClaw locale Mac

---

## Cos'è TabShame

Estensione Chrome (Manifest V3) che conta i tab aperti e reagisce con la voce:
- **Tab aperta sopra soglia** → voce che ti vergogna (tono sarcastico/deluso)
- **Tab chiusa quando eri sopra soglia** → voce che ti ringrazia/prende in giro
- **Badge sull'icona** → numero tab in tempo reale (verde/arancione/rosso)
- **Popup** → counter live, toggle on/off, slider soglia, selector lingua 🇮🇹/🇬🇧, bottone "Fammi vergognare adesso"

Ispirato a [SlapMac](https://slapmac.com/) — formula: premise ridicola + demo virale + build weekend.

---

## Struttura file

```
tabshame/
├── manifest.json          # Manifest V3 — permissions: tabs, storage, scripting
├── background.js          # Service worker — logica principale, frasi, speech injection
├── content.js             # Placeholder (speech ora injettato direttamente)
├── popup.html             # UI popup
├── popup.js               # Logica popup
├── popup.css              # Stile dark, accent rosso/arancione
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── voices/
    └── phrases.js         # Frasi IT+EN (non più usato — frasi ora in background.js)
```

---

## Come funziona (architettura)

### Approccio speech — IMPORTANTE

**Non** si usa un content script persistente (si congela dopo un po' — bug noto Chrome/Arc).  
La voce viene iniettata **fresh ogni volta** via `chrome.scripting.executeScript` con una funzione inline. Questo evita il freeze e funziona anche su Arc Browser.

```js
// background.js — speakInTab()
await chrome.scripting.executeScript({
  target: { tabId },
  func: (text, lang) => {
    // speechSynthesis direttamente nel tab attivo
    window.speechSynthesis.cancel();
    // ... speak
  },
  args: [text, lang]
});
```

### Flusso eventi

```
chrome.tabs.onCreated  → handleTabChange('up')   → shame se sopra soglia
chrome.tabs.onRemoved  → handleTabChange('down')  → relief se eravamo sopra soglia
chrome.tabs.onActivated → aggiorna solo badge (no voce)
popup: SHAME_NOW       → handleTabChange('neutral', force=true)
```

### Stato salvato in chrome.storage.local

```js
{
  threshold: 3,      // soglia tab (3 per test, alzare a 15 per produzione)
  language: 'it',   // 'it' | 'en'
  enabled: true,
  totalShames: 0,
  cooldownUntil: 0,  // timestamp ms — cooldown 5s per test, alzare a 60s produzione
  lastTabCount: 0
}
```

---

## Bug risolti (storia)

| Versione | Bug | Fix |
|---|---|---|
| v0.1 | Silenzioso su Arc | Arc non carica content script — workaround con executeScript |
| v0.2 | Non scattava automaticamente | Fix injection dinamica Arc |
| v0.3 | Badge mancante | Aggiunto setBadgeText/Color |
| v0.5 | Voce si congela dopo un po' | Cambio architettura: speech inline ogni volta, non content script persistente |
| v0.6 | Numeri hardcoded nelle frasi ("Quindici tab...") | Tutte le frasi ora usano `{count}` dinamico |
| v0.7 | Voce doppia | Fix flag `spoken` nel fallback onvoiceschanged+setTimeout |

---

## Todo / Next steps

### 🔧 Tecnici
- [ ] Alzare soglia da 3 a 15 per produzione (`DEFAULT_STATE.threshold`)
- [ ] Alzare cooldown da 5s a 60s per produzione (`cooldownUntil: now + 60_000`)
- [ ] Testare su Chrome puro (non solo Arc) — Arc ha comportamenti non standard
- [ ] Fix popup: aggiornamento live del counter (ora richiede apertura popup)
- [ ] voices/phrases.js non è più usato — o rimuovere o re-integrare come sorgente unica di frasi

### 🎨 UI/UX
- [ ] Animazione sul badge quando scatta la vergogna
- [ ] Suono di notifica opzionale oltre alla voce
- [ ] Statistiche più ricche nel popup (tab record, sessione corrente)

### 🚀 Produzione
- [ ] Aggiungere icone vere (ora sono placeholder colorati)
- [ ] Privacy policy (richiesta da Chrome Web Store)
- [ ] Screenshot per lo store
- [ ] Scegliere prezzo (suggerito: $4.99 one-shot)
- [ ] Registrarsi su Chrome Web Store ($5 una tantum)

---

## Come fare il reload automatico dell'estensione su Mac

OpenClaw locale può automatizzare il reload così da non dover fare il giro manuale ogni volta.

### Metodo 1 — osascript (AppleScript)
```bash
osascript -e 'tell application "Google Chrome" to reload extension "ID_ESTENSIONE"'
```
L'ID lo trovi in `chrome://extensions` sotto il nome dell'estensione.

### Metodo 2 — Script shell completo
```bash
#!/bin/bash
# reload-tabshame.sh
EXTENSION_ID="qui_metti_l_id"
DEST_DIR="$HOME/tabshame"  # cartella dove tieni l'estensione unpacked

# Copia i file aggiornati
rsync -a /path/to/tabshame/ "$DEST_DIR/"

# Reload in Chrome via AppleScript
osascript -e "tell application \"Google Chrome\" to reload extension \"$EXTENSION_ID\""

echo "TabShame reloaded ✅"
```

### Flusso ideale con OpenClaw locale
1. OpenClaw riceve file aggiornati (zip o cartella)
2. Estrae in `~/tabshame/`
3. Esegue reload via osascript
4. Conferma a Michele via Telegram

---

## Stato attuale al momento dell'handover

- **Soglia:** 3 tab (test) — alzare a 15
- **Cooldown:** 5 secondi (test) — alzare a 60s
- **Frasi:** 7 per tier × 4 tier + 4 milestone + 10 relief, in IT e EN
- **Badge:** ✅ funzionante
- **Voce automatica:** ✅ funzionante su Arc
- **Voce al chiuder tab:** ✅ funzionante
- **Popup:** ✅ funzionante (toggle, slider, lingua, vergognami adesso)

---

## File da ricevere da Michele

Michele ti passa lo zip `tabshame.zip` con la versione v0.7 già funzionante.  
Estrai, carica in Chrome in modalità sviluppatore, e sei pronto.

Per caricare: `chrome://extensions` → Modalità sviluppatore ON → "Carica estensione non compressa" → seleziona cartella `tabshame/`
