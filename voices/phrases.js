(() => {
  const phrases = {
    it: {
      tier1: [
        '{count} tab aperte. Sei sicuro di star lavorando?',
        'Hai appena aperto la tab numero {count}. Il browser ti guarda con delusione.',
        '{count} tab: produttività o collezionismo compulsivo?',
        'Tab numero {count}. Complimenti, il caos è ufficiale.',
        'Siamo a {count} tab. Respira. Chiudine due e nessuno si farà male.'
      ],
      tier2: [
        '{count} tab. Il tuo browser sta soffrendo in silenzio.',
        '{count} tab aperte: questa non è ricerca, è una saga.',
        'La RAM ha mandato una lettera di protesta formale. Hai {count} tab aperte.',
        '{count} tab. Hai più tab che priorità chiare. E si sente.',
        '{count} tab. Se ognuna fosse un pensiero, avresti bisogno di ferie.'
      ],
      tier3: [
        '{count} tab aperte. Stai bene? Vuoi parlarne?',
        '{count} tab. Questa finestra è ormai un museo di decisioni rimandate.',
        'Siamo a {count} tab. Il multitasking è bello, ma qui siamo in modalità survival.',
        '{count} tab aperte. Ognuna è un "poi lo leggo". Non lo leggerai.',
        '{count} tab. Il tuo laptop sta entrando nella fase drammatica.'
      ],
      tier4: [
        '{count} tab. Questo non è più un browser, è un archivio psichiatrico.',
        '{count} tab aperte: stai navigando o stai costruendo un dungeon?',
        '{count} tab. Il computer ti vuole bene, ma non così tanto.',
        'Con {count} tab hai raggiunto il livello boss finale del tab hoarding.',
        '{count} tab. Serve un piano di evacuazione, non un altro tab.'
      ],
      milestones: [
        'Milestone drammatica: {count} tab esatte. Premio caos sbloccato.',
        '{count} tab tonde tonde. Elegante, ma terrificante.',
        '{count} tab! Anche il task manager si è messo a pregare.',
        '{count} tab aperte. Hai ufficialmente superato la fase controllo.'
      ],
      relief: [
        'Ah, finalmente. Stai chiudendo dei tab. Ora ne hai {count}. Sono commosso.',
        'Benvenuto nel club del buon senso. Ora sei a {count} tab. Ci sei quasi.',
        'Una tab in meno. Ora sei a {count}. Piccolo passo per te, grande passo per la RAM.',
        'Ah, eccolo. Il coraggio di fare spazio. {count} tab rimaste.',
        'Sento già il browser respirare meglio. Solo {count} tab ora.',
        'Bravo. Continua così. Sei già sceso a {count}.',
        'Ah, finalmente ti è tornato il buon senso. {count} tab rimaste.',
        'Stai liberando. Come ti senti? Ora sei a {count} tab.',
        'Questo è crescita personale. Sono orgoglioso. {count} tab.',
        'Solo {count} tab ancora. Ce la fai.'
      ]
    },
    en: {
      tier1: [
        "{count} tabs open. Bold strategy. Let's see how that plays out.",
        'You just opened tab number {count}. Your browser is quietly judging you.',
        '{count} tabs: ambition or mild chaos?',
        'Tab number {count}. This is getting cinematic.',
        '{count} tabs. Close a couple. Your future self will thank you.'
      ],
      tier2: [
        "{count} tabs. Your RAM called. It's crying.",
        '{count} tabs open: this is not a workflow, this is a side quest.',
        'You have {count} tabs open. More tabs than clear decisions right now.',
        '{count} tabs. Your CPU is trying to stay positive. Help it.',
        '{count} tabs. This feels like emotional multitasking.'
      ],
      tier3: [
        '{count} tabs open. Are you okay? Blink twice if you need help.',
        '{count} tabs. This window is now a museum of unfinished intentions.',
        "{count} tabs. Let's call this what it is: tab-based procrastination.",
        '{count} tabs. You are no longer browsing. You are orbiting.',
        '{count} tabs open. Productivity has entered the danger zone.'
      ],
      tier4: [
        "{count} tabs open. At this point you're not browsing, you're hoarding.",
        '{count} tabs. Your laptop deserves a standing ovation for surviving this.',
        '{count} tabs. You reached final boss mode: Chrome Tab Dragon.',
        '{count} tabs. This is no longer a browser, this is a digital attic.',
        '{count} tabs. Emergency meeting: close some before the fan takes off.'
      ],
      milestones: [
        'Milestone unlocked: exactly {count} tabs. Chaos with structure.',
        '{count} tabs exactly. Terrifyingly round number.',
        '{count} tabs. Your task manager just sighed.',
        '{count} tabs open. Impressive, concerning, iconic.'
      ],
      relief: [
        'Finally. A closed tab. Down to {count}. I almost cried.',
        'Welcome to the club of reasonable people. Only {count} tabs left.',
        'One tab down. Now at {count}. Your RAM says thank you.',
        'Look at you, making good decisions. {count} tabs remaining.',
        'The browser can breathe again. {count} tabs. Well done.',
        'Progress. Actual progress. Down to {count}.',
        'Only {count} tabs left. You can do this.',
        'Ah, finally some common sense. {count} tabs.',
        "You're freeing up space. {count} tabs. How does that feel?",
        'Personal growth. Down to {count}. I am here for it.'
      ]
    }
  };

  globalThis.TABYELL_PHRASES = phrases;
})();
