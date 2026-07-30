# TabYell — Handover

**Versione:** 1.2.0  
**Brand:** TabYell  
**Tagline:** Open too many tabs. Your browser yells at you.

## Prodotto

TabYell è un'estensione Chrome Manifest V3 che conta le tab aperte e interviene con frasi vocali sarcastiche quando l'utente supera una soglia configurabile.

- apertura sopra soglia → battuta vocale;
- chiusura mentre si era sopra soglia → frase di sollievo;
- badge verde, arancione o rosso con il numero di tab;
- popup con contatore, soglia, lingua, stile delle frasi e attivazione rapida;
- frasi disponibili in italiano e inglese.

## Struttura

```text
manifest.json       Metadati, permessi e service worker
background.js       Stato, conteggio tab, badge, frasi e chrome.tts
popup.html          Interfaccia del popup
popup.css           Identità visiva TabYell
popup.js            Stato e interazioni del popup
icons/              Icone dell'estensione
content.js          Placeholder per future reazioni visive
 offscreen.js        Implementazione speechSynthesis legacy, non registrata
voices/phrases.js   Raccolta frasi legacy, non caricata dal manifest
```

## Architettura attuale

La voce viene riprodotta dal service worker tramite `chrome.tts`. Non sono richiesti accessi ai contenuti delle pagine e il manifest non richiede host permissions.

```text
chrome.tabs.onCreated  → enqueueYell('up')   → voce se sopra soglia
chrome.tabs.onRemoved  → enqueueYell('down') → sollievo se necessario
chrome.tabs.onActivated → aggiorna badge e popup
popup: YELL_NOW        → handleYell(..., true)
```

## Stato persistito

```js
{
  threshold: 15,
  language: 'it',
  enabled: true,
  totalYells: 0,
  cooldownUntil: 0,
  lastTabCount: 0,
  phraseMode: 'both'
}
```

Durante l'aggiornamento dalla versione precedente, `totalShames` viene migrato automaticamente in `totalYells`, così le statistiche dell'utente non vengono perse.

## Controlli prima di una release

1. Caricare la cartella da `chrome://extensions` in modalità sviluppatore.
2. Verificare l'upgrade sopra una versione già installata e la migrazione del contatore.
3. Testare apertura e chiusura rapida di più tab su Chrome e Arc.
4. Provare entrambe le lingue e tutte le modalità delle frasi.
5. Controllare badge, soglia, toggle e pulsante “Sgridami adesso”.
6. Preparare screenshot e testi Chrome Web Store con il nome TabYell.
7. Pubblicare la versione 1.2.0 mantenendo lo stesso extension ID.

## Identità

- Nome visualizzato: **TabYell**
- Frase principale: **Open too many tabs. Your browser yells at you.**
- Colore principale: `#ffd23f`
- Accento: `#ff9f1c`
- Icona: volto arrabbiato, riutilizzabile come personaggio di TabYell
