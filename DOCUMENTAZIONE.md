# NUTRIA

**Il tuo piano. Pensato per te.**

NUTRIA è un planner alimentare personale. Si risponde a poche domande su di sé, sui propri
gusti e sul proprio obiettivo, e l'app costruisce la settimana di pasti, mostra le ricette e
compila da sola la lista della spesa.

L'idea di fondo è togliere lavoro, non aggiungerne: niente da registrare a mano dopo ogni
pasto, nessun grammo da pesare per forza, nessun account da creare. Il cuore dell'app è la
**generazione automatica del piano** — la funzione che quasi tutte le app concorrenti tengono
dietro un abbonamento.

---

## Indice

- [Funzionalità](#funzionalità)
- [Stack tecnologico](#stack-tecnologico)
- [Installazione e avvio](#installazione-e-avvio)
- [Build di produzione](#build-di-produzione)
- [Deploy](#deploy)
- [Struttura delle cartelle](#struttura-delle-cartelle)
- [Come funziona l'algoritmo](#come-funziona-lalgoritmo)
- [Calcolo nutrizionale e limiti di sicurezza](#calcolo-nutrizionale-e-limiti-di-sicurezza)
- [Gestione dei dati](#gestione-dei-dati)
- [Come aggiungere una ricetta](#come-aggiungere-una-ricetta)
- [Come aggiungere una famiglia alimentare o un reparto](#come-aggiungere-una-famiglia-alimentare-o-un-reparto)
- [Come estendere il progetto con un backend](#come-estendere-il-progetto-con-un-backend)
- [Verifiche fatte](#verifiche-fatte)
- [Avvertenza](#avvertenza)

---

## Funzionalità

**Questionario iniziale** — dieci passaggi, una domanda per schermata, con barra di avanzamento:
dati personali, misure e orario di sveglia, obiettivo di peso, livello di attività, regime
alimentare, stile di colazione, tempo a disposizione per cucinare, attrezzatura in cucina e
pranzo fuori casa, pasti della giornata (con orari calcolati automaticamente), preferenze
alimentari.

**Piano generato automaticamente** — una settimana completa costruita sui dati inseriti, con
pulsante per rigenerarla quando la proposta non convince. Rispetta il regime alimentare
dichiarato (vegetariano, vegano, pescetariano...), dà la precedenza allo stile di colazione
preferito (dolce o salata, senza mai escludere l'altro), rispetta il tempo massimo di
preparazione indicato per pranzo e cena, propone solo ricette fattibili con l'attrezzatura
dichiarata in cucina e, per chi porta il pranzo fuori casa, solo piatti trasportabili nella
fascia lavorativa della giornata.

**Orari personalizzati** — gli orari dei pasti si calcolano a partire dall'ora di sveglia
dichiarata, invece di essere fissi per tutti. Ogni orario resta comunque modificabile a mano,
pasto per pasto, dal profilo.

**Calendario a tre livelli**
- *Giornaliero*: i pasti lungo il "nastro della giornata", con orario, calorie, macronutrienti,
  tempo di preparazione e le azioni Sostituisci e Modifica. Il pasto in arrivo è evidenziato.
- *Settimanale*: i sette giorni uno sotto l'altro, con il totale calorico di ciascuno.
- *Mensile*: la griglia del mese, con un segno sui giorni per cui esiste un piano.

**Sostituzione dei pasti** — per ogni pasto, alternative con profilo nutrizionale simile
(calorie e ripartizione dei macronutrienti), oppure scelta libera dall'intero ricettario con
ricerca. In entrambi i casi gli alimenti esclusi restano fuori.

**Ricettario** — 200 ricette con ingredienti, quantità, procedimento e valori nutrizionali.
Ricerca per nome o ingrediente, filtri per momento della giornata, caratteristiche, tempo di
preparazione, difficoltà, attrezzatura richiesta, trasportabilità e preferiti. Ogni ricetta si può
inserire nel piano scegliendo giorno e pasto.

**Lista della spesa** — generata dal piano della settimana: ingredienti sommati, divisi per
reparto del supermercato, con caselle da spuntare e barra di avanzamento. Le grammature grandi
diventano automaticamente chili.

**Profilo e impostazioni** — tutti i dati del questionario sono modificabili; tema chiaro,
scuro o automatico; esportazione e importazione dei dati in formato JSON; azzeramento con
conferma.

**Account (opzionale)** — ci si può registrare con email e password per ritrovare il proprio
piano su qualunque dispositivo. Senza account, tutto continua a funzionare esattamente come
prima: i dati restano solo sul dispositivo. Chi si registra dopo aver già usato l'app da ospite
non perde nulla — il primo accesso carica sull'account ciò che c'era in locale. Il recupero
password non è ancora disponibile (vedi la nota in fondo a questa sezione).

**PWA** — installabile sul telefono o sul computer, con icona propria e funzionamento anche
senza connessione.

---

## Stack tecnologico

| Cosa | Scelta | Perché |
|---|---|---|
| Framework | React 18 | Componenti riutilizzabili, ecosistema stabile |
| Build | Vite 5 | Avvio istantaneo in sviluppo, build ottimizzata |
| Routing | React Router 6 (`HashRouter`) | Funziona su qualsiasi hosting statico senza configurare riscritture degli URL |
| Icone | lucide-react | Set coerente, ad albero scuotibile |
| Stile | CSS puro con custom properties | Nessuna toolchain aggiuntiva, temi chiaro/scuro con un attributo |
| Persistenza | localStorage + Supabase (opzionale) | Funziona senza account; con account, i dati si sincronizzano su un vero database |

Nessuna dipendenza a pagamento, nessuna chiave API, nessun servizio esterno necessario al
funzionamento.

---

## Installazione e avvio

Serve un **Node.js 18 o superiore**.

```bash
cd NUTRIA
cp .env.example .env    # oppure rinomina .env.example in .env
npm install
npm run dev
```

Il file `.env` contiene le chiavi per collegare l'account (facoltativo — senza, l'app funziona
comunque solo in locale). Se manca del tutto, l'app parte lo stesso e la sezione Account nelle
impostazioni resta semplicemente nascosta.

**Nota su email e account.** Questo progetto Supabase ospita anche un'altra app. Per evitare
conflitti se la stessa persona usa entrambe con la stessa email, NUTRIA non manda a Supabase
l'email scritta dall'utente ma una versione trasformata e univoca per questa app — invisibile
a chi usa l'app, che continua a vedere e scrivere sempre la propria email vera. La conseguenza
è che al momento non esiste un modo automatico per recuperare la password dimenticata: servirà
aggiungere un servizio di invio email dedicato. I dettagli sono documentati direttamente in
`src/services/auth.js`.

L'app si apre su <http://localhost:5173>.

Al primo avvio compare la schermata di benvenuto con due strade: compilare il questionario
oppure premere **Guarda un esempio**, che carica un profilo dimostrativo con una settimana già
generata — utile per vedere subito l'app piena.

---

## Build di produzione

```bash
npm run build     # genera la cartella dist/
npm run preview   # serve dist/ in locale per un controllo finale
```

Il risultato è statico: HTML, CSS e JavaScript. Non serve alcun server applicativo.

---

## Deploy

La cartella `dist/` si pubblica su qualsiasi hosting statico.

- **Netlify** — trascinare `dist/` nell'interfaccia, oppure collegare il repository con
  comando di build `npm run build` e cartella di pubblicazione `dist`.
- **Vercel** — preset Vite, nessuna configurazione aggiuntiva.
- **GitHub Pages** — pubblicare il contenuto di `dist/`. Funziona anche in sottocartella:
  `vite.config.js` usa `base: './'` e il routing è a hash.

Il service worker si registra solo nella build di produzione, così in sviluppo non ci si
ritrova con versioni vecchie in cache.

---

## Struttura delle cartelle

```
NUTRIA/
├── index.html                 punto di ingresso, font, meta tag PWA
├── package.json
├── vite.config.js
├── public/
│   ├── manifest.webmanifest   descrittore PWA
│   ├── sw.js                  service worker
│   └── icons/                 icone generate (192, 512, maskable, apple-touch, favicon)
├── src/
│   ├── main.jsx               montaggio, import degli stili, service worker
│   ├── App.jsx                rotte e protezione delle pagine
│   ├── context/
│   │   └── AppContext.jsx     stato globale e salvataggio automatico
│   ├── data/
│   │   ├── recipes.js         le 94 ricette
│   │   ├── vocab.js           slot pasto, famiglie alimentari, tag, reparti, attività
│   │   └── demo.js            profilo dimostrativo e profilo vuoto
│   ├── services/
│   │   ├── nutrition.js       metabolismo, fabbisogno, limiti di sicurezza
│   │   ├── planGenerator.js   generazione del piano settimanale
│   │   ├── substitution.js    alternative ai pasti
│   │   ├── shoppingList.js    aggregazione della spesa
│   │   └── storage.js         unico punto di contatto con localStorage
│   ├── utils/
│   │   ├── date.js            chiavi data, settimane, griglia del mese, formati italiani
│   │   ├── random.js          generatore con seme (niente Math.random)
│   │   └── format.js          numeri e quantità
│   ├── components/            Layout, MealRow, MealSheet, Sheet, RecipeArt, ProgressRail…
│   ├── pages/                 Welcome, Onboarding, Dashboard, Calendar, Recipes,
│   │                          RecipeDetail, Shopping, Profile, Settings, NotFound
│   └── styles/                tokens, base, layout, components, pages
└── ARCHITECTURE.md            documentazione tecnica
```

---

## Come funziona l'algoritmo

Il piano **non** è una lista casuale di ricette. Per ogni pasto da riempire, l'app assegna un
punteggio a tutte le ricette compatibili e sceglie quella con il punteggio più alto.

**Passaggio 1 — filtro rigido.** Vengono scartate le ricette che contengono famiglie alimentari
escluse dall'utente o ingredienti presenti nell'elenco delle esclusioni scritte a mano.
Un'esclusione è una condizione, non una preferenza: non entra mai nel punteggio.

**Passaggio 2 — punteggio.** Quattro criteri, con i pesi indicati:

| Criterio | Peso | Cosa misura |
|---|---|---|
| Aderenza energetica | 1,00 | Quanto le calorie della ricetta si avvicinano a quelle previste per quel pasto |
| Preferenze | 0,60 | Bonus per le famiglie gradite, malus per quelle sgradite |
| Varietà | 0,80 | Malus crescente per le ricette già usate nella settimana, più forte se usate di recente |
| Variazione controllata | 0,15 | Scarto pseudo-casuale con seme, per rompere i pareggi |

**Passaggio 3 — determinismo.** Il seme del generatore deriva da profilo + settimana + numero
di variante. A parità di ingressi il piano è sempre lo stesso: ricaricare la pagina non
stravolge la settimana, e la lista della spesa continua a corrispondere a ciò che si mangia.
Il pulsante *Rigenera piano* incrementa il numero di variante, producendo una proposta diversa
ma altrettanto stabile.

Il risultato tipico è di circa 30 ricette distinte su 35 pasti settimanali: varia abbastanza da
non annoiare, senza inseguire la novità a scapito dell'obiettivo calorico.

La **sostituzione** di un pasto usa un criterio diverso: ordina le alternative per distanza
nutrizionale dal piatto di partenza, combinando lo scarto calorico con la differenza nella
ripartizione dei macronutrienti. Sostituire non deve sbilanciare la giornata.

---

## Calcolo nutrizionale e limiti di sicurezza

Il fabbisogno è stimato con la formula di **Mifflin-St Jeor**, moltiplicata per il fattore di
attività dichiarato.

Su questo numero valgono tre limiti fissi, scritti in `src/services/nutrition.js`:

1. L'apporto giornaliero non scende mai sotto il **metabolismo basale**.
2. L'apporto giornaliero non scende mai sotto un **pavimento assoluto**: 1200 kcal per le donne,
   1500 per gli uomini.
3. Il deficit non supera il **20% del fabbisogno**, che corrisponde a un calo di circa
   0,3–0,7 kg a settimana.

Inoltre, se il peso obiettivo indicato porta l'indice di massa corporea sotto 18,5, l'app lo
segnala e **non prosegue** con quell'obiettivo.

Quando uno di questi limiti scatta, l'app non lo nasconde: mostra in chiaro quale correzione ha
applicato e perché. Questi controlli non sono un dettaglio decorativo — sono la parte che
impedisce a un'app di questo tipo di fare danni. Non vanno rimossi senza una ragione clinica.

---

## Gestione dei dati

Tutto vive nel browser dell'utente. Non esiste un account, nessun dato lascia il dispositivo,
non ci sono strumenti di tracciamento.

Le chiavi usate in `localStorage` sono versionate:

```
nutria.v1.profile     profilo e preferenze
nutria.v1.plans       piani settimanali, indicizzati per lunedì di riferimento
nutria.v1.favorites   ricette preferite
nutria.v1.shopping    articoli spuntati, per settimana
nutria.v1.settings    tema e unità di misura
```

Il prefisso `v1` permette di scrivere una migrazione in futuro senza rompere le installazioni
esistenti. Tutte le letture sono difensive: un localStorage corrotto o non disponibile (per
esempio in navigazione privata) non blocca l'app.

Dalle impostazioni si esporta un backup `.json` completo e lo si reimporta. È l'unico modo per
spostare i propri dati su un altro dispositivo finché non ci sarà un backend, ed è per questo
che la funzione esiste fin dalla prima versione.

---

## Come aggiungere una ricetta

Le ricette stanno in `src/data/recipes.js`. Ognuna è una chiamata alla funzione `R(...)`:

```js
R("cen-029", "Pollo alle erbe con patate", ["cena"], 42, 46, 18, 35, "facile",
  ["carne", "proteico"], ["pollo", "patate", "verdure"],
  ["Petto di pollo|180|g|carne", "Patate|220|g|verdura", "Rosmarino|0|qb|verdura",
   "Olio extravergine d'oliva|1|cucchiaio|dispensa"],
  ["Inforna le patate a spicchi a 200 °C per 30 minuti.",
   "Aggiungi il pollo con le erbe e prosegui 15 minuti."]),
```

Gli argomenti, in ordine: `id`, `nome`, `slot`, `proteine`, `carboidrati`, `grassi`, `minuti`,
`difficoltà`, `tag`, `famiglie`, `ingredienti`, `passaggi`, e un dodicesimo argomento opzionale
`{ portable: true }` per le ricette trasportabili (vedi sotto).

Tre cose da sapere:

- **Le calorie non si scrivono**: sono calcolate dai macronutrienti (4 kcal/g per proteine e
  carboidrati, 9 per i grassi). Così non possono mai risultare incoerenti.
- **Ogni ingrediente è una stringa** `"Nome|quantità|unità|reparto"`, con le quantità riferite a
  una porzione. Il reparto serve alla lista della spesa; l'unità `qb` diventa "q.b." e non viene
  sommata.
- **L'attrezzatura richiesta non si scrive**: si legge da sola nel procedimento. Se un passaggio
  contiene "inforna", "200 °C" o simili, la ricetta risulta `forno`; se contiene "lasagne",
  "parmigiana", "sformato" o un'altra parola da teglia grande, risulta `forno_grande`; altrimenti
  si cerca "padella", "cuoci", "lessa" e simili per `fornelli`; se non c'è nessuna cottura, resta
  `nessuna`. La logica sta in `deriveEquipment()` in cima a `recipes.js`. Nel dubbio su una
  ricetta nuova, controllare il valore con `getRecipe("id").equipment` dopo averla scritta.

**Trasportabilità** invece va dichiarata a mano con `{ portable: true }` come tredicesimo
argomento, perché non è deducibile dal procedimento: dipende da come il piatto regge qualche ora
in un contenitore, non da come si cucina. Il valore predefinito è `false`.

Aggiungendo la ricetta in fondo all'array giusto (`COLAZIONI`, `SPUNTINI`, `PRANZI`, `CENE`)
entra automaticamente nel ricettario, nei filtri, nella generazione del piano e fra le possibili
sostituzioni. Non serve toccare nient'altro.

---

## Come aggiungere una famiglia alimentare o un reparto

Tutti i vocabolari dell'app stanno in `src/data/vocab.js`: slot dei pasti, famiglie alimentari,
tag delle ricette, reparti del supermercato, livelli di attività, obiettivi.

Aggiungendo una voce a `FOOD_FAMILIES`, questa compare automaticamente nel questionario e nel
profilo fra le preferenze e le esclusioni. Aggiungendo una voce a `SHOP_GROUPS`, la lista della
spesa acquisisce un nuovo reparto nell'ordine in cui è stato inserito. Aggiungendo una voce a
`KITCHEN_TOOLS`, questa compare nel passaggio 8 del questionario e nella sezione "La tua cucina"
del profilo — ma da sola non filtra nulla: serve anche collegarla a un valore di `equipment` in
`EQUIPMENT_NEEDS` (vedi la sezione precedente). Nessuna interfaccia da modificare a mano.

---

## Come estendere il progetto con un backend

L'architettura è già predisposta. `src/services/storage.js` è **l'unico punto dell'app che tocca
localStorage**: tutto il resto passa da `AppContext`. Per aggiungere account e sincronizzazione
cloud basta riscrivere quelle funzioni come chiamate di rete, mantenendo la stessa firma.

Il percorso ragionevole:

1. Rendere asincrone `read`/`write` in `storage.js` e gestire lo stato di caricamento già
   previsto in `AppContext` (`ready`).
2. Aggiungere autenticazione, salvando l'identificativo utente accanto al profilo.
3. Spostare il ricettario da `src/data/recipes.js` a un endpoint: la forma dei dati è già quella
   che servirebbe, `getRecipe(id)` resta il solo punto di accesso.
4. La generazione del piano può restare sul client (è deterministica e leggera) oppure passare
   sul server: `generatePlan(profile, weekStart, variant)` è una funzione pura, si sposta senza
   modifiche.

**Modello freemium.** La struttura permette di distinguere una versione gratuita da una premium
senza riscritture: il numero di varianti generate, la profondità dello storico e il numero di
profili sono già valori che passano dal contesto. In questa prima versione non c'è alcun
pagamento e non è predisposta alcuna integrazione con sistemi di incasso: la versione gratuita è
completa e utilizzabile.

---

## Verifiche fatte

Prima della consegna il progetto è stato installato e compilato da zero (`npm install`,
`npm run build`, entrambi senza errori o avvisi) e sottoposto a un test end-to-end automatico
(`node e2e.mjs`) che copre 64 controlli, in due parti:

- **Logica pura**, senza browser: integrità del ricettario (200 ricette, nessun duplicato,
  calorie sempre coerenti coi macronutrienti, vocabolari coerenti), derivazione corretta
  dell'attrezzatura dal procedimento, limiti di sicurezza nutrizionale, generazione del piano
  (copertura settimanale, determinismo, rigenerazione), tutti i filtri combinati fra loro
  (esclusioni, regime alimentare, attrezzatura disponibile, pranzo fuori casa), sostituzioni e
  lista della spesa.
- **Interfaccia**, su un DOM simulato con jsdom in cui l'app viene davvero eseguita (non solo
  compilata): schermata di benvenuto, dashboard, tutte le pagine principali raggiungibili senza
  errori in console, dettaglio ricetta con i nuovi contrassegni di attrezzatura e trasportabilità,
  ricettario con i nuovi filtri, questionario esteso a dieci passaggi, rotta inesistente gestita.

Tutti superati, senza errori in console. Il file `e2e.mjs` resta nel progetto come strumento di
verifica per le prossime sessioni: si esegue con `node e2e.mjs` (richiede `npm install` con le
dipendenze di sviluppo `jsdom` ed `esbuild`, non incluse in `package.json` per non appesantire
l'app in produzione — si installano al volo con
`npm install --no-save jsdom esbuild`).

---

## Avvertenza

NUTRIA propone piani alimentari a scopo informativo. Le calorie, le quantità e le stime
temporali sono indicative. **Non costituiscono una prescrizione dietetica e non sostituiscono il
parere di un medico o di un dietista**, in particolare in gravidanza, in età evolutiva, in
presenza di patologie o di terapie farmacologiche in corso.
