# NUTRIA — Architettura

Documento tecnico. Per installazione, uso e come aggiungere ricette, vedi il
[README](./README.md).

---

## 1. Principio di fondo

L'app è divisa in quattro strati con responsabilità nette. La regola che tiene tutto insieme:
**la logica non conosce React, e React non conosce localStorage.**

```
┌──────────────────────────────────────────────────────────┐
│  pages/ + components/     interfaccia, nessuna regola     │
├──────────────────────────────────────────────────────────┤
│  context/AppContext       stato, orchestrazione           │
├──────────────────────────────────────────────────────────┤
│  services/                calcoli e regole, funzioni pure │
├──────────────────────────────────────────────────────────┤
│  data/                    ricette e vocabolari            │
└──────────────────────────────────────────────────────────┘
```

Conseguenze pratiche:

- I moduli in `services/` sono **funzioni pure testabili in isolamento**: si possono eseguire
  con Node senza un browser (è esattamente così che sono stati verificati generazione del piano,
  calcolo nutrizionale, aggregazione della spesa e sostituzioni).
- `services/storage.js` è **l'unico file che tocca `window.localStorage`**. Nessun componente vi
  accede direttamente. È la porta da cui passerà un futuro backend.
- I componenti non contengono regole di calcolo: chiedono, mostrano, e rimandano le azioni al
  contesto.

---

## 2. Struttura dei dati

### 2.1 Profilo

```js
{
  name: "Carol",
  sex: "femmina" | "maschio" | "altro",
  age: 31,
  height: 165,              // cm
  weight: 68,               // kg, attuale
  startWeight: 70,          // kg, di partenza — serve alla barra di avanzamento
  targetWeight: 62,         // kg, obiettivo
  goal: "dimagrimento" | "mantenimento" | "aumento" | "benessere",
  activity: "sedentario" | "leggero" | "moderato" | "attivo",
  meals: ["colazione", "spuntino_mattina", "pranzo", "spuntino_pomeriggio", "cena"],
  likedFamilies: ["pesce", "verdure"],
  dislikedFamilies: ["salumi"],
  excludedFamilies: ["crostacei"],
  excludedIngredients: ["funghi"],
  wakeTime: "07:30",                    // "HH:MM", usato da mealTimeFor per calcolare gli orari
  customMealTimes: { pranzo: "12:30" }, // orari scelti a mano, vincono sul calcolo automatico
  dietType: "onnivoro" | "vegetariano" | "vegano" | "pescetariano",
  breakfastStyle: "dolce" | "salata" | "mista",
  lunchTimeLimit: "nessuno" | "veloce" | "medio" | "elaborato",
  dinnerTimeLimit: "nessuno" | "veloce" | "medio" | "elaborato",
  isDemo: false,
  createdAt: "2026-09-06T…"
}
```

`startWeight` è distinto da `weight` perché senza di esso la barra di avanzamento non avrebbe un
punto di partenza da cui misurare.

### 2.2 Ricetta

```js
{
  id: "pra-001",
  name: "Pasta integrale al pomodoro e basilico",
  slots: ["pranzo"],                        // colazione | spuntino | pranzo | cena
  protein: 16, carbs: 82, fat: 12,          // grammi per porzione
  kcal: 500,                                // DERIVATO: 4·prot + 4·carb + 9·gras
  time: 20,
  difficulty: "facile",
  tags: ["vegetariano", "vegano", "veloce", "comfort"],
  families: ["pasta", "verdure"],           // per preferenze ed esclusioni
  equipment: "fornelli",                    // DERIVATO dal procedimento, vedi 2.2.1
  portable: true,                           // dichiarato a mano, vedi 2.2.2
  ingredients: [
    { name: "Pasta integrale", qty: 90, unit: "g", group: "cereali" },
    …
  ],
  steps: ["…", "…"]
}
```

Le calorie sono **calcolate**, mai scritte a mano. Elimina alla radice la possibilità che un
piatto dichiari 400 kcal e ne contenga 600.

Le `families` sono il perno della personalizzazione: sono l'unico ponte fra ciò che l'utente
dichiara nel questionario e ciò che l'algoritmo sa fare.

#### 2.2.1 Attrezzatura: derivata, non dichiarata

`equipment` non si scrive a mano nella chiamata a `R(...)`: si **legge dal procedimento**,
esattamente come le calorie si leggono dai macronutrienti. `deriveEquipment(name, steps)` in
`recipes.js` cerca, in ordine dal vincolo più forte al più debole:

1. `forno_grande` — il nome o i passaggi contengono "lasagne", "parmigiana", "sformato" o
   un'altra parola da teglia grande. Una friggitrice ad aria non ci sta.
2. `forno` — il procedimento contiene "inforna", una temperatura in gradi, "cartoccio" o simili.
3. `fornelli` — il procedimento contiene "padella", "cuoci", "lessa", "rosola" e verbi affini.
4. `nessuna` — nessuno dei precedenti: si assembla e basta.

Il motivo di questa scelta è lo stesso delle calorie: un campo scritto a parte, prima o poi,
contraddice il testo. Nel derivarlo la prima volta si è trovato un caso reale di questo
problema — la regola per "parmigiana" (il piatto) inizialmente intercettava anche "parmigiano"
(il formaggio), mandando risotti e frittate fra le ricette che pretendono una teglia grande. La
regex è stata corretta per cercare "parmigiana" con la "a" finale.

Il quinto argomento opzionale `{ equip: "..." }` esiste per i pochi casi in cui la regola non
può indovinare (una ricetta cruda il cui procedimento nomina comunque una padella per un
dettaglio marginale): forza un valore senza passare dalla derivazione automatica. Va usato solo
quando serve, non come scorciatoia.

#### 2.2.2 Trasportabilità: dichiarata, non derivata

`portable` è l'opposto: **non** si può dedurre dal procedimento, perché dipende da come il
piatto regge qualche ora fuori dal frigo in un contenitore, non da come si cucina. Un uovo
all'occhio di bue e una frittata si preparano allo stesso modo, ma solo la seconda arriva
decente in ufficio dopo il trasporto. Si dichiara a mano con il dodicesimo argomento opzionale
`{ portable: true }`. Il valore predefinito è `false`: nel dubbio la ricetta non viene proposta
a chi porta il pranzo fuori casa — è l'errore meno fastidioso dei due (un'opzione trasportabile
mancante si nota subito e si corregge; una non trasportabile proposta per sbaglio si scopre solo
a pranzo già fatto).

### 2.3 Piano settimanale

```js
{
  weekStart: "2026-09-07",          // sempre un lunedì
  variant: 0,                       // incrementato da "Rigenera piano"
  signature: "femmina|31|68|165|…", // firma del profilo al momento della generazione
  generatedAt: "2026-09-06T…",
  dailyTarget: 1557,                // kcal
  slots: ["colazione", "pranzo", "cena"],
  days: {
    "2026-09-07": {
      meals: [
        { slotId: "colazione", recipeId: "col-016", targetKcal: 342 },
        …
      ]
    },
    …  // sette giorni
  }
}
```

I piani sono indicizzati per lunedì di riferimento. Nel piano si salva **solo l'id** della
ricetta: i dati completi si risolvono al momento del disegno con `getRecipe(id)`. Così il
localStorage resta leggero e correggere una ricetta la corregge ovunque, anche nei piani già
salvati.

La `signature` permette di capire se il profilo è cambiato dopo la generazione, senza dover
confrontare oggetti interi.

### 2.4 Chiavi data

Tutte le date circolano come stringhe `"YYYY-MM-DD"`, costruite sull'orario **locale**. Sono
ordinabili, leggibili dentro il localStorage e immuni agli scivoloni di fuso orario che si
ottengono passandosi oggetti `Date` o stringhe ISO in UTC.

---

## 3. Flusso dell'applicazione

```
   avvio
     │
     ├─ ready === false ──────────────► schermata di attesa (skeleton)
     │
     ├─ nessun profilo ───────────────► /benvenuto
     │                                    ├─ "Iniziamo"          → /inizia (questionario)
     │                                    └─ "Guarda un esempio" → profilo demo + piano
     │
     └─ profilo presente ─────────────► Layout
                                          ├─ /            Dashboard
                                          ├─ /calendario  giorno · settimana · mese
                                          ├─ /ricette     elenco e dettaglio
                                          ├─ /spesa       lista della settimana
                                          ├─ /profilo     dati e preferenze
                                          └─ /impostazioni
```

`RequireProfile` in `App.jsx` intercetta chiunque arrivi su una pagina interna senza un profilo
e lo rimanda al benvenuto. Nessuno dei tre stati di avvio produce una pagina bianca.

### Generazione pigra delle settimane

Il calendario e la lista della spesa chiamano `ensurePlan(weekStart)` in un effetto quando
atterrano su una settimana che non ha ancora un piano. Chi naviga in avanti trova la settimana
già pronta senza premere niente; chi non ci va non paga il costo di generarla. I piani si
accumulano in `plans` indicizzati per settimana, quindi lo storico resta consultabile.

---

## 4. Generazione del piano

`generatePlan(profile, weekStart, variant)` → piano, oppure `null`.

```
profilo
  │
  ├─► energyTarget()      fabbisogno + limiti di sicurezza  → kcal giornaliere
  │
  ├─► splitAcrossMeals()  ripartizione sui pasti attivi     → kcal per pasto
  │        (le quote di vocab.js sono normalizzate a 100%
  │         qualunque combinazione di pasti sia attiva)
  │
  ├─► filtro rigido       isAllowed() elimina le esclusioni scritte a mano
  │                       E quelle derivate dal regime alimentare (dietType)
  │                       — questo filtro NON SI ALLENTA MAI
  │
  ├─► filtri di comodità, in ordine di importanza CRESCENTE (vedi 4.1a)
  │       tempo di preparazione → trasportabilità → attrezzatura in cucina
  │
  └─► per ogni giorno, per ogni pasto:
          punteggio = 1,00 · aderenza energetica
                    + 0,60 · preferenze
                    + 0,80 · varietà
                    + 0,70 · stile di colazione (solo per lo slot colazione)
                    + 0,15 · variazione con seme
          si sceglie il massimo e si aggiorna il registro d'uso
```

**Aderenza energetica** `1 − |kcal_ricetta − kcal_obiettivo| / kcal_obiettivo`, con minimo 0.

**Preferenze** bonus fino a +1 per le famiglie gradite, malus fino a −1 per quelle sgradite.
Le esclusioni non compaiono qui: sono già state eliminate dal filtro.

**Varietà** `1 − usi·0,45 − recenza·0,35`. Il termine di recenza pesa i tre giorni precedenti,
perché ripetere un piatto a due giorni di distanza dà più fastidio che ripeterlo a cinque.

**Stile di colazione** +1 se la ricetta porta il tag dello stile preferito (`colazione_dolce` o
`colazione_salata`), −0,4 se porta l'altro, 0 per chi ha scelto "mi va bene entrambe". È un
bonus forte ma non un'esclusione: chi preferisce la colazione dolce può comunque trovarsi,
occasionalmente, una colazione salata in tavola — solo di rado.

**Variazione con seme** rompe i pareggi e differenzia le rigenerazioni. Il seme è
`hash(firmaProfilo + weekStart + "#" + variante)` con generatore mulberry32:
`Math.random()` non compare in nessun punto del progetto.

**Perché il determinismo conta.** Senza di esso il piano cambierebbe a ogni ricaricamento della
pagina e la lista della spesa smetterebbe di corrispondere a ciò che si è programmato di
mangiare. Con il determinismo, il piano cambia solo quando è l'utente a chiederlo.

**Caso limite — esclusioni.** Se le esclusioni (scritte a mano o derivate dal regime
alimentare) svuotano completamente una categoria di pasto, la funzione restituisce `null` e
l'interfaccia mostra uno stato dedicato. Non si allentano mai le esclusioni per riuscire a
produrre un piano: meglio nessun piano che un piano con dentro qualcosa che la persona non può
mangiare.

### 4.1 Pool per slot e filtri a cascata

Fino a questa sessione il pool delle ricette utilizzabili era raggruppato **per tipo di pasto**
(`colazione`, `spuntino`, `pranzo`, `cena`). Con l'arrivo della trasportabilità questo non basta
più: lo spuntino del mattino si porta in ufficio, quello della sera no, pur essendo entrambi di
tipo `spuntino`. Il pool è quindi ora raggruppato **per slot** (`spuntino_mattina`,
`spuntino_pomeriggio`, `spuntino_sera`, ciascuno con il proprio elenco), non più per tipo.

Sopra il filtro di sicurezza (`isAllowed`, invariato: esclusioni ed regime alimentare, mai
allentato) agiscono tre filtri di comodità, in un ordine preciso che riflette quanto ciascuno è
aggirabile nella pratica:

1. **Tempo di preparazione** (`withinTimeLimit`) — il più morbido: un pasto più lungo del
   desiderato è comunque preparabile.
2. **Trasportabilità** (`isPortableOk`) — più rigido: se un piatto non regge il trasporto,
   proporlo per l'ufficio è un consiglio inutilizzabile, ma resta una preferenza di prodotto.
3. **Attrezzatura in cucina** (`canCook`) — il più rigido dei tre: è l'unico vincolo *fisico*.
   Chi non ha il forno non può cucinare quella ricetta, punto.

Se applicare tutti e tre insieme lascia il pool vuoto per uno slot, si molla il primo della
lista (il tempo), si riprova; se ancora vuoto si molla anche il secondo (la trasportabilità); se
ancora vuoto si molla pure il terzo. Le esclusioni di `isAllowed` restano fuori da questa
cascata e non si toccano mai. Il risultato pratico: un profilo con vincoli di prodotto molto
stretti ottiene comunque un piano, allentando prima le preferenze meno importanti; un profilo
senza soluzioni possibili (esclusioni troppo ampie) resta `null` come prima.

**Caso limite — tempo di preparazione.** Comportamento invariato rispetto a prima: se il tempo
massimo dichiarato per un pasto svuota la categoria (per esempio "15 minuti" a pranzo, quando il
dataset ne ha solo 5 sotto quella soglia), il filtro sul tempo viene ignorato per quella
categoria per primo, non le esclusioni alimentari. È una scelta di prodotto, non di sicurezza:
meglio un pranzo più lungo del desiderato che nessun piano.

### 4.2 Orari dei pasti

Gli orari non sono più fissi. `mealTimeFor(slotId, profile)`, in `data/vocab.js`, calcola
l'orario di un pasto sommando l'ora di sveglia dichiarata (`profile.wakeTime`) a uno scarto in
minuti definito per ciascuno slot (`offsetMinutes`, calibrato su una sveglia di riferimento alle
7:30). Se il profilo non ha un orario di sveglia — per esempio un profilo creato prima
dell'introduzione di questo campo — la funzione ricade sull'orario fisso di riferimento
(`slot.time`), così le installazioni esistenti continuano a funzionare senza migrazione.

Un profilo può inoltre fissare un orario specifico per un singolo pasto
(`profile.customMealTimes[slotId]`), che vince sempre sul calcolo automatico: cambiare la
sveglia non sposta un orario che la persona ha scelto a mano.

### 4.3 Regime alimentare

`DIET_TYPES` in `vocab.js` associa a ogni regime (vegetariano, vegano, pescetariano) l'elenco
delle famiglie alimentari da escludere. Queste esclusioni si sommano — non sostituiscono — a
quelle scelte manualmente dall'utente nel filtro rigido di `isAllowed`. Dichiarare "vegetariana"
nel questionario è equivalente, nell'effetto sul piano, a spuntare a mano le famiglie di carne e
pesce: la differenza è solo di comodità nell'interfaccia.

---

## 5. Sostituzione dei pasti

`findAlternatives(recipeId, mealType, profile, targetKcal, limit)` ordina i candidati per
**distanza nutrizionale**:

```
distanza = 1,2 · scarto calorico relativo
         + 0,8 · distanza euclidea fra i profili di macronutrienti
         − 0,12 se contiene una famiglia gradita
         + 0,30 se contiene una famiglia sgradita
```

Il profilo di macronutrienti è la quota di calorie che ciascun macronutriente rappresenta sul
totale del piatto: due piatti con la stessa forma nutrizionale hanno profili vicini anche se le
calorie assolute differiscono un po'.

---

## 6. Lista della spesa

`buildShoppingList(plan, dayKeys)` scorre le giornate indicate, raccoglie tutti gli ingredienti
delle ricette programmate e li aggrega con chiave `nome+unità`. Le quantità si sommano solo a
parità di unità; gli ingredienti `q.b.` compaiono senza quantità. Sopra i 1000 g o ml la misura
passa a chili o litri. Il risultato è raggruppato secondo l'ordine di `SHOP_GROUPS`, pensato per
come si gira davvero un supermercato.

Gli articoli spuntati vivono in uno stato separato, indicizzato per settimana: rigenerare il
piano azzera le spunte di quella settimana, perché si riferirebbero a una spesa diversa.

---

## 7. Gestione dello stato

Un solo contesto, `AppContext`, con cinque porzioni di stato: `profile`, `plans`, `favorites`,
`shopping`, `settings`. Ognuna ha un effetto di salvataggio dedicato che scrive su localStorage
a ogni cambiamento.

**Il caso della cancellazione.** Azzerando i dati, gli effetti di salvataggio scatterebbero
comunque — lo stato è cambiato — riscrivendo immediatamente le chiavi appena svuotate. Serve
quindi un flag `wiping` che li disinnesca per un giro, più un effetto dichiarato **dopo** tutti
quelli di salvataggio che ripulisce il localStorage. React esegue gli effetti nell'ordine di
dichiarazione, quindi la sequenza è deterministica. Senza questo accorgimento "cancella tutto"
lascerebbe dietro di sé chiavi con dentro `null`.

**Modifiche al profilo.** Cambiando qualcosa che influenza il piano, la settimana in corso
**non** viene rigenerata automaticamente: l'app segnala che il piano non è più allineato e
lascia decidere. Rigenerare senza chiedere significherebbe cancellare sotto le mani dell'utente
un piano che magari stava seguendo, e su cui aveva già fatto la spesa.

### 7.1 Account e sincronizzazione

Il localStorage resta sempre la fonte di verità immediata: ogni lettura e scrittura
dell'interfaccia passa da lì, come prima. Quando esiste una sessione Supabase attiva
(`account` non nullo), gli stessi effetti che scrivono su localStorage lanciano *in aggiunta*
una scrittura verso il database, con un breve ritardo (900 ms) per non aprire una richiesta di
rete a ogni carattere digitato. L'interfaccia non aspetta mai la rete per aggiornarsi: la
sincronizzazione avviene in un secondo momento, in background.

```
azione dell'utente
      │
      ▼
 stato React (immediato)
      │
      ├──► localStorage (sempre, sincrono)
      │
      └──► Supabase (solo se account attivo, con debounce)
```

**Primo accesso.** Quando compare una sessione (login o registrazione), l'app scarica lo stato
dell'account con `pullAll`. Se l'account è vuoto ma sul dispositivo c'era già un profilo — cioè
la persona aveva usato l'app da ospite e si registra solo dopo — quei dati locali vengono
caricati sull'account una sola volta (`pushAllLocal`), invece di essere scartati a favore di un
account vuoto. In caso contrario (account già popolato, per esempio da un altro dispositivo),
lo stato locale viene sostituito con quello scaricato.

Un flag `pulling` evita che il download appena ricevuto venga interpretato come una modifica
dell'utente e rispedito indietro al server nello stesso giro.

**Struttura dati remota.** Le tabelle (`nutria_profiles`, `nutria_plans`, `nutria_favorites`,
`nutria_shopping`, `nutria_settings`, definite in `supabase/schema.sql`) rispecchiano
esattamente le chiavi di `localStorage`, con l'aggiunta della colonna `user_id`. Ogni tabella ha
Row Level Security attiva: un utente può leggere e scrivere solo le righe con il proprio
`user_id`, verificato lato database con `auth.uid() = user_id`. Questa è la protezione che
conta — non il fatto che la chiave usata dal client sia pubblica o meno.

**Uscita dall'account.** Il logout (`signOutAccount`) chiude solo la sessione: i dati restano
sia sul server sia, com'erano, nella copia locale del dispositivo. Non c'è alcuna cancellazione
implicita nel logout.

**Nessun account configurato.** Se le variabili d'ambiente Supabase non sono presenti,
`isSupabaseConfigured` è `false`: la sezione Account scompare dalle impostazioni, la pagina
`/account` mostra un messaggio invece del modulo di accesso, e ogni funzione di sincronizzazione
diventa un no-op. L'app si comporta esattamente come nella prima versione, solo locale.

---

## 8. Interfaccia

**Stile** CSS puro con custom properties, diviso in cinque file: `tokens` (colori, tipografia,
spazi, forme), `base` (reset e form), `layout` (struttura e navigazione), `components`,
`pages`. Il tema si cambia con un attributo `data-theme` sull'elemento radice: nessuna classe da
propagare, nessun JavaScript da eseguire per ridipingere.

**Responsive** mobile-first. Sotto i 900px: navigazione in basso, contenuto a piena larghezza.
Sopra: sidebar fissa e contenuto centrato con larghezza massima. Il calendario mensile usa celle
a rapporto quadrato che si adattano allo spazio senza uscire dallo schermo.

**Elemento distintivo** il "nastro della giornata": i pasti non sono una griglia di schede
identiche ma scorrono lungo una guida verticale, con l'orario in tipografia display sulla
sinistra. È il ritmo di una giornata, non un elenco. Il pasto in arrivo è l'unico elemento in
zafferano: un solo accento, in un solo punto.

**Illustrazioni** ogni ricetta ha un disegno SVG generato dal proprio id, con colori derivati
dalle famiglie alimentari. Nessuna immagine esterna, quindi nessun collegamento che può
smettere di funzionare, nessun peso da scaricare e resa identica anche senza connessione.

**Accessibilità** focus visibile ovunque, aree toccabili di almeno 44px, `aria-pressed` su tutti
i controlli a due stati, `aria-current` sulla navigazione, `role="dialog"` con Esc e clic sullo
sfondo per i pannelli modali, `aria-live` per i messaggi temporanei, etichette esplicite su ogni
campo, `prefers-reduced-motion` rispettato.

---

## 9. PWA

`manifest.webmanifest` con icone a 192, 512 e maskable, avvio in modalità standalone e percorsi
relativi (funziona anche pubblicata in sottocartella).

Il service worker usa due strategie: **rete prima** per le navigazioni, con la copia in cache
come rete di salvataggio; **cache prima con aggiornamento in sottofondo** per le risorse. Si
registra solo in produzione, così in sviluppo non si servono versioni vecchie. Cambiando
`CACHE_NAME` si forza l'aggiornamento su tutti i dispositivi.

I dati dell'utente non passano dal service worker: vivono in localStorage e non escono dal
dispositivo.

**Chunk del ricettario.** `vite.config.js` separa `src/data/recipes.js` in un file di build
dedicato (`manualChunks`), invece di lasciarlo fondere con il resto del codice. Il ricettario è
il file più pesante del progetto (200 ricette) e cambia molto più spesso della logica
applicativa: tenendolo isolato, aggiungere ricette invalida solo quel chunk nella cache del
browser e del service worker, non l'intera applicazione. Le librerie esterne (React, Supabase,
lucide-react...), che cambiano ancora più raramente, stanno in un terzo chunk (`vendor`).

## 9.1 Test end-to-end

Il progetto include `e2e.mjs` nella radice, non parte dell'applicazione servita ma uno
strumento di verifica per chi ci lavora. Si esegue con `node e2e.mjs` dopo aver installato le
dipendenze di sviluppo non presenti in `package.json` (per non appesantire l'app in
produzione):

```bash
npm install --no-save jsdom esbuild
node e2e.mjs
```

Il test ha due parti, con una scelta tecnica non ovvia nella seconda:

**Logica pura** — importa direttamente i moduli di `src/services` e `src/data` con Node, senza
alcun browser: verifica l'integrità del ricettario, la derivazione dell'attrezzatura, i limiti
di sicurezza nutrizionale, il generatore del piano con tutte le combinazioni di filtri, le
sostituzioni, la lista della spesa. Sessantina di controlli su questa parte.

**Interfaccia**, su un DOM simulato con **jsdom**: qui la scelta tecnica interessante è che
**jsdom non esegue mai `<script type="module">` aggiunto a runtime con `appendChild`** — il tag
resta presente nel DOM ma il suo contenuto non viene mai interpretato come codice, e
`document.body.textContent` finisce per restituire il sorgente del bundle come testo letterale
invece del risultato del render. La soluzione è compilare il bundle con esbuild in formato
**IIFE** classico (non ESM) e inserirlo come `<script>` direttamente nell'HTML iniziale passato
al costruttore di `JSDOM`, con `runScripts: "dangerously"`: lì viene eseguito per davvero, React
monta, e si può leggere il DOM risultante. Il JSX richiede inoltre `jsx: "automatic"` nella
configurazione di esbuild — senza, il runtime automatico di React non viene incluso nel bundle e
si ottiene un errore a runtime ("React is not defined") anche se il codice sorgente non lo
richiede mai esplicitamente.

Questo pattern (IIFE + script inline nell'HTML iniziale, mai `appendChild` a runtime) vale per
qualunque futuro test che debba eseguire davvero l'app dentro jsdom, non solo verificarne la
compilazione.

## 10. Sviluppi possibili

Predisposto, non implementato:

| Estensione | Punto di intervento |
|---|---|
| Ricettario remoto | sostituire `data/recipes.js` con un endpoint; `getRecipe(id)` resta l'unico accesso |
| Generazione lato server | `generatePlan` è una funzione pura, si sposta senza modifiche |
| Personalizzazione con IA | aggiungere un ulteriore termine al punteggio in `planGenerator.js` |
| Notifiche push | richiede una Edge Function programmata; l'account (per sapere a chi mandarle) esiste già |
| Storico del peso | oggi si conservano `startWeight` e `weight`; servirebbe una serie di misurazioni datate |
| Più profili sullo stesso account | indicizzare le chiavi con un identificativo di profilo oltre a `user_id` |

Il modello freemium non è implementato e non esiste alcuna integrazione con sistemi di
pagamento. La versione attuale è completa e gratuita.

**Recupero password — analisi fatta, non ancora implementato.** Richiede una Edge Function su
Supabase (gratuita), perché generare il link di recupero serve la chiave `service_role`, che
non può stare nel client. La funzione riceve l'email vera, ricalcola l'indirizzo camuffato
(vedi `auth.js`), chiede a Supabase il link e lo manda all'indirizzo reale con un servizio di
invio email esterno. Il vincolo emerso: **Resend**, nel piano gratuito, richiede un dominio
verificato per mandare email a indirizzi diversi dal proprio — non praticabile senza comprare un
dominio. Le alternative gratuite valutate: **Brevo** (300 email/giorno, verifica un singolo
indirizzo mittente invece di un dominio intero — la strada consigliata) o SMTP di una casella
Gmail personale con password per app (limiti d'invio bassi, pensato per posta personale). Un
dettaglio tecnico a favore: essendo l'app su `HashRouter`, i link di recupero standard di
Supabase (token nel frammento URL) andrebbero in conflitto con il routing; costruendo il link a
mano con `verifyOtp` il problema non si pone.

### 10.1 Valutate e rimandate volutamente

Durante la progettazione del questionario esteso sono state valutate anche queste idee, non
implementate per una ragione specifica — non per dimenticanza:

| Idea | Perché non ora |
|---|---|
| Allergie severe come categoria separata dai gusti sgraditi | il comportamento di sicurezza richiesto (esclusione rigida, mai un punteggio) esiste già per ogni esclusione indistintamente; separare le categorie a video aggiungerebbe complessità di interfaccia senza cambiare il comportamento reale |
| Condizioni mediche (gravidanza, patologie, terapie) | un planner automatico non è nella posizione di raccogliere dati sanitari sensibili e adattarvi un piano in autonomia; il disclaimer attuale ("per persone sane, non sostituisce un professionista") resta la scelta più onesta |
| Idratazione, obiettivi di benessere secondari | fuori dallo scopo di un planner pasti: non cambierebbero una singola ricetta proposta |

**Implementate in questa sessione** (erano in questa tabella, ora non più): attrezzatura in
cucina e pasti trasportabili — vedi §2.2.1, §2.2.2 e §4.1. Il ricettario è stato ampliato a 200
ricette nella stessa sessione, il che ha reso ragionevole affrontare anche la catalogazione che
prima le teneva bloccate.
