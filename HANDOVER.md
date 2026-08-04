# TabYell — Handover

**Versione:** 1.2.3  
**Brand:** TabYell  
**Tagline:** Open too many tabs. Your browser yells at you.

## Prodotto

TabYell è un'estensione Chrome Manifest V3 che conta le tab aperte e interviene con frasi vocali sarcastiche quando l'utente supera una soglia configurabile.

- apertura sopra soglia → battuta vocale;
- chiusura mentre si era sopra o esattamente al limite → frase di sollievo, fino al rientro al valore di soglia;
- sotto soglia le chiusure restano silenziose;
- eventi rapidi accorpati in una sola valutazione;
- nessun cooldown tra frasi: ogni evento separato sopra soglia produce una frase;
- niente ripetizioni consecutive: la frase appena detta non viene riusata alla frase successiva (quando il pool lo consente);
- badge verde, arancione o rosso con il numero di tab;
- popup con contatore, soglia, lingua, stile delle frasi e attivazione rapida;
- interfaccia e frasi disponibili in italiano e inglese;
- italiano automatico per browser italiani, inglese come fallback globale;
- override manuale della lingua vocale dal popup;
- selezione automatica della voce TTS compatibile con punteggio migliore.

## Struttura

```text
manifest.json       Metadati, permessi e service worker
background.js       Stato, conteggio tab, badge, frasi e chrome.tts
popup.html          Interfaccia del popup
popup.css           Identità visiva TabYell
popup.js            Stato e interazioni del popup
_locales/           Cataloghi inglese e italiano
icons/              Icone dell'estensione
tests/              Validazione statica e test del service worker
content.js          Placeholder non registrato nel manifest
offscreen.js        Implementazione speechSynthesis legacy, non registrata
voices/phrases.js   Raccolta frasi legacy, non caricata dal manifest
```

## Architettura vocale

La voce viene riprodotta dal service worker tramite `chrome.tts`. Non sono richiesti accessi ai contenuti delle pagine e il manifest non richiede host permissions.

```text
chrome.tabs.onCreated/onRemoved
        ↓
debounce 350 ms e accorpamento eventi
        ↓
controllo soglia (sopra/al limite vs sotto)
        ↓
selezione voce e chrome.tts.speak
```

Il pulsante `YELL_NOW` annulla l'evento automatico pendente e riceve risposta immediata nel popup. Gli eventi automatici non possono accumulare un backlog: viene conservata al massimo una direzione pendente. Non esiste più un cooldown di 60 secondi: ogni evento separato sopra soglia produce una frase.

## Stato persistito

```js
{
  threshold: 15,
  language: 'en',
  languageMode: 'auto',
  enabled: true,
  totalYells: 0,
  lastTabCount: 0,
  lastPhrase: '',
  phraseMode: 'both'
}
```

Durante l'aggiornamento dalla versione precedente, `totalShames` viene migrato automaticamente in `totalYells`. Le installazioni legacy con il vecchio default italiano passano alla lingua del browser; una scelta inglese esplicita su browser italiano viene preservata.

## Lingua

- Chrome con UI italiana → interfaccia italiana e voce automatica italiana.
- Qualsiasi altra UI → interfaccia inglese e voce automatica inglese.
- L'override manuale cambia la voce, non la lingua dell'interfaccia.

## Voci e privacy

La selezione segue una policy quality-first e consente le voci remote esposte da Chrome. TabYell non legge URL, titoli o contenuti delle pagine e non possiede un server. Se Chrome seleziona un motore remoto, la frase generata — eventualmente comprensiva del numero totale di tab — può essere elaborata in rete dal provider della voce.

Il service worker registra nome, lingua e natura locale/remota della voce scelta.

## Controlli prima di una release

1. Eseguire `node tests/validate-extension.mjs`.
2. Verificare che GitHub Actions completi il workflow **Validate extension**.
3. Caricare la cartella da `chrome://extensions` in modalità sviluppatore.
4. Verificare l'upgrade sopra una versione già installata e la migrazione del contatore.
5. Aprire rapidamente molte tab e confermare che parta una sola frase.
6. Aprire poi tab singole distanziate sopra soglia e confermare che parta una frase per ogni apertura.
7. Chiudere tab fino al limite e confermare le frasi di sollievo, restando mute sotto il limite.
8. Provare un browser italiano e uno non italiano, la modalità automatica e gli override manuali.
9. Premere **Sgridami adesso** e verificare feedback immediato e priorità sulla voce automatica.
10. Controllare nel log del service worker quale voce TTS è stata scelta.
11. Provare tutte le modalità delle frasi e verificare badge, soglia e toggle.
12. Aprire/chiudere tab in sequenza sopra soglia e confermare che la stessa frase non si ripeta due volte di fila.
13. Preparare screenshot e testi Chrome Web Store con il nome TabYell.
14. Pubblicare la versione 1.2.3 mantenendo lo stesso extension ID.

## Identità

- Nome visualizzato: **TabYell**
- Frase principale: **Open too many tabs. Your browser yells at you.**
- Colore principale: `#ffd23f`
- Accento: `#ff9f1c`
- Icona: volto arrabbiato, riutilizzabile come personaggio di TabYell
