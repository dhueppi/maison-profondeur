// =====================================================================
//  GAME DATA – alle Inhalte des Spiels stehen hier.
//  Zum Skalieren: einfach Einträge in den Listen ergänzen.
//  Der Code in game.js muss dafür nicht angepasst werden.
// =====================================================================
const GAME_DATA = {
  world: {
    width: 40,          // Breite in Tiles
    // Tiefe ergibt sich aus den Areas: areas.length × areaDepth (+ Oberfläche + Grundgestein)
    surfaceRow: 6,      // Zeile, in der der Boden beginnt
    tileSize: 32,       // Pixel pro Tile
    metersPerTile: 5,   // für die Tiefenanzeige
    seed: 1337,         // gleicher Seed = gleiche Welt
  },

  physics: {
    gravity: 900,
    thrust: 1700,
    moveAccel: 1100,
    maxSpeedX: 190,
    maxSpeedUp: 280,
    maxFallSpeed: 750,
    fallDamageSpeed: 430,   // ab dieser Aufprallgeschwindigkeit gibt's Schaden
    fallDamageFactor: 0.06,
    drillBaseTime: 0.45,    // Sekunden für Härte 1 bei Bohrkraft 1
  },

  // Treibstoffverbrauch steht jetzt pro Antrieb bei den Upgrades (upgrades.engine[].use)
  fuelEmptyMsg: 'Der Tank ist leer. Ihr Pod steht still – und mit ihm Ihre Karriere.',

  currency: 'CHF',

  prices: {
    // Literpreis steht pro Antrieb (upgrades.engine[].pricePerLiter)
    repairPerHp: 3,
  },

  start: {
    money: 40,
  },

  // ===================================================================
  //  AREAS – von oben nach unten. Jede Area ist areaDepth Meter tief.
  //  Neue Area = neuer Eintrag in der Liste (+ passendes Erz in "ores").
  // ===================================================================
  areaDepth: 500,          // Meter pro Area
  areaBlend: 0.12,         // weicher Übergang: Anteil der Area (oben + unten), in dem sich zwei Areas mischen

  // Erz-Mix: Wie wahrscheinlich ist Erz aus einer anderen Area?
  // Schlüssel = Abstand zur aktuellen Area (-1 = eine Area höher = schlechteres Erz, +1 = besseres Erz)
  oreMix: { '-2': 0.04, '-1': 0.22, '0': 1, '1': 0.08, '2': 0.015 },

  areas: [
    {
      name: 'Eisen', ore: 'eisen',
      oreChance: 0.085, rockChance: 0.05,
      enemyScale: 1.0,                       // Multiplikator für HP, Schaden, Tempo der Würmer
      enemies: [ { id: 'erdfresser', density: 0.08 } ],
      mines: [ { id: 'blindgaenger', density: 0.0035 }, { id: 'dynamit_alt', density: 0.0025 } ],
      phenomena: { quicksand: 6, ice: 4 },                    // Anzahl Einschlüsse pro Area
      look: { dirt: [12, 30, 30], rock: '#2b2a2e', vein: '#a5532e', bg: '#150c08', accent: '#aab3bd' },
    },
    {
      name: 'Kupfer', ore: 'kupfer',
      oreChance: 0.08, rockChance: 0.10,
      enemyScale: 1.2,
      enemies: [ { id: 'erdfresser', density: 0.03 }, { id: 'schlundwurm', density: 0.07 } ],
      mines: [ { id: 'blindgaenger', density: 0.0008 }, { id: 'dynamit_alt', density: 0.0015 }, { id: 'seemine', density: 0.0025 } ],
      phenomena: { ice: 5, water: 6, quicksand: 3, fault: 4 },
      look: { dirt: [28, 55, 22], rock: '#1d2a27', vein: '#3fae8c', bg: '#0c120f', accent: '#e07b3c' },
    },
    {
      name: 'Silber', ore: 'silber',
      oreChance: 0.075, rockChance: 0.15,
      enemyScale: 1.45,
      enemies: [ { id: 'schlundwurm', density: 0.03 }, { id: 'spiegelwurm', density: 0.07 } ],
      mines: [ { id: 'seemine', density: 0.0015 }, { id: 'fliegerbombe', density: 0.0025 }, { id: 'atombombe', density: 0.0004 } ],
      phenomena: { water: 6, magma: 4, ice: 2, fault: 6 },
      look: { dirt: [222, 14, 25], rock: '#1b2030', vein: '#cfd8e6', bg: '#0a0c13', accent: '#e8eef5' },
    },
    {
      name: 'Gold', ore: 'gold',
      oreChance: 0.07, rockChance: 0.19,
      enemyScale: 1.75,
      enemies: [ { id: 'spiegelwurm', density: 0.03 }, { id: 'unaussprechlich', density: 0.06 } ],
      mines: [ { id: 'fliegerbombe', density: 0.0018 }, { id: 'atombombe', density: 0.0007 }, { id: 'hbombe', density: 0.00025 } ],
      phenomena: { magma: 8, water: 2, fault: 8 },
      look: { dirt: [36, 30, 19], rock: '#17161b', vein: '#c9a961', bg: '#0e0a05', accent: '#ffd23f' },
    },
  ],

  // ===================================================================
  //  ERZE – 5 pro Area. share = Anteil innerhalb der Area (häufig → legendär),
  //  value = Verkaufspreis. Faustregel: Preis × Anteil ist pro Erz ungefähr gleich,
  //  seltene Funde lohnen sich also, ohne das Einkommen zu sprengen.
  //  Erwartungswert pro Erzfeld: A1 ≈ 30, A2 ≈ 81, A3 ≈ 221, A4 ≈ 559 CHF.
  //  form: nugget (Metall) · gem (Kristall) · pearl · drop · heart (Trophäen)
  //  desc: Text für das Cabinet d'Histoire Naturelle im Musée
  // ===================================================================
  ores: [
    // --- Area 1: Eisen ---
    { id: 'eisen',  name: 'Eisen',  color: '#7f8a97', value: 15,  share: 0.45, hardness: 1.0,  area: 1, form: 'nugget',
      desc: 'Das Fundament der Industrie – und damit naturgemäss nichts für uns. Wir sammeln es aus reiner Herzensgüte.' },
    { id: 'zinn',   name: 'Zinn',   color: '#c9ccc4', value: 25,  share: 0.27, hardness: 1.1,  area: 1, form: 'nugget',
      desc: 'Früher für Teller und Zinnsoldaten verwendet. Heute nur noch für Teller, von denen niemand isst.' },
    { id: 'nickel', name: 'Nickel', color: '#a8bf9c', value: 40,  share: 0.16, hardness: 1.25, area: 1, form: 'nugget',
      desc: 'Glänzt beinahe wie Silber. Beinahe. Ein charmanter Hochstapler, den man dennoch gern zum Dinner bittet.' },
    { id: 'kobalt', name: 'Kobalt', color: '#3f6fe0', value: 70,  share: 0.08, hardness: 1.4,  area: 1, form: 'gem',
      desc: 'Verleiht dem Meissener Porzellan sein Blau. Also durchaus salonfähig.' },
    { id: 'achat',  name: 'Achat',  color: '#c8506a', value: 120, share: 0.04, hardness: 1.6,  area: 1, form: 'gem',
      desc: 'Gebänderte Eleganz, seit jeher erste Wahl für Siegelringe. Endlich ein Stein mit Stammbaum.' },
    // --- Area 2: Kupfer ---
    { id: 'kupfer',   name: 'Kupfer',      color: '#e07b3c', value: 42,  share: 0.45, hardness: 1.4,  area: 2, form: 'nugget',
      desc: 'Patiniert grün auf den Dächern alter Bankhäuser. Wir respektieren das.' },
    { id: 'malachit', name: 'Malachit',    color: '#2fae6a', value: 68,  share: 0.27, hardness: 1.55, area: 2, form: 'gem',
      desc: 'Die Zaren täfelten ganze Säle damit. Ein angemessener Massstab für Innenarchitektur.' },
    { id: 'lapis',    name: 'Lapislazuli', color: '#2a4fc8', value: 110, share: 0.16, hardness: 1.7,  area: 2, form: 'gem',
      desc: 'Daraus mahlten die alten Meister ihr Ultramarin – einst teurer als Gold. Völlig zu Recht.' },
    { id: 'tuerkis',  name: 'Türkis',      color: '#3fd0c8', value: 175, share: 0.08, hardness: 1.85, area: 2, form: 'gem',
      desc: 'Von Pharaonen getragen, von Neureichen kopiert. Dies hier ist selbstverständlich das Original.' },
    { id: 'jade',     name: 'Kaiserjade',  color: '#9fe0a0', value: 300, share: 0.04, hardness: 2.0,  area: 2, form: 'gem',
      desc: 'Am Kaiserhof wertvoller als Gold. Wir sehen das genauso – zumindest seit heute.' },
    // --- Area 3: Silber ---
    { id: 'silber',     name: 'Silber',     color: '#eef3fa', value: 115, share: 0.45, hardness: 1.9,  area: 3, form: 'nugget',
      desc: 'Unentbehrlich für das Besteck. Wer mit Edelstahl speist, hat aufgegeben.' },
    { id: 'mondstein',  name: 'Mondstein',  color: '#c8d8ff', value: 185, share: 0.27, hardness: 2.05, area: 3, form: 'gem',
      desc: 'Schimmert bläulich wie ein Champagnerglas um Mitternacht. Romantisch, aber stilsicher.' },
    { id: 'opal',       name: 'Edelopal',   color: '#f0c8f0', value: 300, share: 0.16, hardness: 2.2,  area: 3, form: 'gem',
      desc: 'Ein ganzer Regenbogen, eingesperrt in einem Stein. Genau so, wie es sich gehört.' },
    { id: 'saphir',     name: 'Saphir',     color: '#2050e0', value: 480, share: 0.08, hardness: 2.4,  area: 3, form: 'gem',
      desc: 'Der Stein königlicher Verlobungsringe. Bitte nicht für Uhrengläser verschwenden.' },
    { id: 'alexandrit', name: 'Alexandrit', color: '#9a3fc8', value: 820, share: 0.04, hardness: 2.6,  area: 3, form: 'gem',
      desc: 'Tagsüber grün, abends rot – wie ein Gast, der zu lange bleibt. Nur ungleich seltener.' },
    // --- Area 4: Gold ---
    { id: 'gold',    name: 'Gold',    color: '#ffd23f', value: 300,  share: 0.45, hardness: 2.6, area: 4, form: 'nugget',
      desc: 'Man spricht nicht darüber. Man hat es.' },
    { id: 'smaragd', name: 'Smaragd', color: '#18c060', value: 470,  share: 0.27, hardness: 2.8, area: 4, form: 'gem',
      desc: 'Mit feinen Einschlüssen, dem sogenannten «Jardin». Selbst seine Makel sind von Adel.' },
    { id: 'rubin',   name: 'Rubin',   color: '#e0102f', value: 760,  share: 0.16, hardness: 3.0, area: 4, form: 'gem',
      desc: 'Taubenblutrot. Der König der Edelsteine – und Sie haben ihn eigenhändig ausgegraben. Wie unüblich.' },
    { id: 'diamant', name: 'Diamant', color: '#e8fbff', value: 1200, share: 0.08, hardness: 3.2, area: 4, form: 'gem',
      desc: 'Für die Ewigkeit, behauptet die Werbung. Wir sagen: für die Vitrine.' },
    { id: 'painit',  name: 'Painit',  color: '#c0582a', value: 2000, share: 0.04, hardness: 3.5, area: 4, form: 'gem',
      desc: 'Einst der seltenste Stein der Welt. Wer ihn findet, nennt seinen Butler fortan «Herr Mineraloge».' },
    // --- Trophäen-Erze: kommen nicht im Boden vor, nur von erlegten Würmern ---
    { id: 'perle',  name: 'Perle Noire',     color: '#c4b2ec', value: 350,  lootOnly: true, form: 'pearl',
      desc: 'Aus dem Magen eines Erdfressers. Wir stellen keine Fragen – wir fassen sie in Platin.' },
    { id: 'ambre',  name: 'Ambre Royal',     color: '#ff9d2e', value: 900,  lootOnly: true, form: 'drop',
      desc: 'Darin eingeschlossen: ein Insekt aus besseren Zeiten. Es trägt, man beachte, eine Fliege.' },
    { id: 'larme',  name: "Larme d'Argent",  color: '#9fd8ff', value: 1800, lootOnly: true, form: 'drop',
      desc: 'Die Träne eines Spiegelwurms. Er hat sie, so versichern wir, nicht vermisst.' },
    { id: 'coeur',  name: "Cœur de l'Abîme", color: '#ff2e63', value: 3000, lootOnly: true, form: 'heart',
      desc: 'Das Herz des Unaussprechlichen. Man spricht nicht darüber. Man stellt es aus.' },
  ],

  upgradeCategories: [
    { id: 'drill',  name: 'Bohrkopf',   unit: '× Kraft' },
    { id: 'engine', name: 'Antrieb',    unit: '× Schub' },
    { id: 'tank',   name: 'Réservoir',  unit: ' L' },
    { id: 'hull',   name: 'Karosserie', unit: ' HP' },
    { id: 'cargo',  name: 'Tresor',     unit: ' Fächer' },
  ],

  // Stufe 0 = Startausrüstung. Es gibt so viele Upgrade-Stufen wie Areas (4 Areas = 4 Upgrades).
  // Jede Stufe sieht am Pod anders aus und hat oft eine Spezialfunktion (perk).
  upgrades: {
    drill: [
      { name: 'Classique',                   value: 1.0, price: 0,     perk: 'Ein ehrlicher Kegel. Bohrt Erde und Erz.' },
      { name: 'Diamant-Pavé',                value: 1.6, price: 400,   perk: 'Mit Diamanten besetzt. Funkelt beim Bohren.' },
      { name: 'Platine Grande Complication', value: 2.4, price: 1500,  perk: 'Zahnräder wie in einer Taschenuhr. Würmer: +25 % Schaden.', wormDamage: 1.25 },
      { name: 'Tourbillon Saphir',           value: 3.4, price: 5000,  perk: 'Rotierender Käfig mit Saphirspitze. BOHRT FELS!', rock: true, wormDamage: 1.5 },
      { name: 'Haute Joaillerie Absolue',    value: 4.8, price: 15000, perk: 'Goldbohrer mit Juwelenringen. Fels wie Butter, Würmer: doppelter Schaden.', rock: true, wormDamage: 2 },
    ],
    // value = Schub-Multiplikator · speed = Tempo · fuel = Name des Brennstoffs
    // use = Verbrauch in Liter pro Sekunde: idle (Stillstand) · move (Fahren) · thrust (Fliegen) · drill (Bohren)
    // pricePerLiter = Tankpreis an der Tankstelle Royale
    // Balancing: Stärkere Antriebe verbrauchen pro Sekunde mehr, sind aber schneller –
    // pro Tile Steigflug kosten alle Antriebe ähnlich viel (0.03–0.06 L). Eine volle Tankfüllung
    // reicht mit passender Ausrüstung (gleiche Stufe bei Antrieb, Tank, Bohrkopf) etwa für eine Tour
    // bis ans Ende der aktuellen Area – nicht für das ganze Spiel.
    engine: [
      { name: 'Kohle-Dampfkessel «Belle Époque»', value: 1.0,  speed: 1.0,  fuel: 'Kohle',  price: 0,     pricePerLiter: 2,
        use: { idle: 0.08, move: 0.12, thrust: 0.30, drill: 0.32 }, perk: 'Qualmt wie ein Grandhotel im Winter.' },
      { name: 'Gasturbine «Flamme Bleue»',       value: 1.3,  speed: 1.15, fuel: 'Gas',    price: 450,   pricePerLiter: 2.5,
        use: { idle: 0.09, move: 0.14, thrust: 0.36, drill: 0.36 }, perk: 'Blaue Flamme, kaum Russ.' },
      { name: 'V12 Benzin «Grand Tourisme»',     value: 1.65, speed: 1.35, fuel: 'Benzin', price: 1700,  pricePerLiter: 3,
        use: { idle: 0.12, move: 0.17, thrust: 0.46, drill: 0.42 }, perk: 'Zwei Chrom-Auspuffe. Knallt beim Abheben. Durstig.' },
      { name: 'Elektro «Silence Doré»',          value: 2.05, speed: 1.6,  fuel: 'Strom',  price: 5000,  pricePerLiter: 3.5,
        use: { idle: 0.06, move: 0.22, thrust: 0.75, drill: 0.70 }, perk: 'Tesla-Spule auf dem Dach. Im Stand fast lautlos und sparsam.' },
      { name: 'Reaktor «Soleil Privé»',          value: 2.6,  speed: 1.9,  fuel: 'Uran',   price: 15000, pricePerLiter: 5,
        use: { idle: 0.15, move: 0.30, thrust: 1.05, drill: 1.00 }, perk: 'Leuchtet grün. Gewaltiger Schub – und gewaltiger Durst.' },
    ],
    tank: [
      { name: 'Flacon',         value: 12,  price: 0,     perk: 'Reicht für einen Apéro.' },
      { name: 'Jéroboam',       value: 22,  price: 300,   perk: 'Vier Flaschen in einer.' },
      { name: 'Nabuchodonosor', value: 40,  price: 1100,  perk: 'Zwanzig Flaschen. Ein Fest.' },
      { name: 'Salmanazar',     value: 65,  price: 3800,  perk: 'Ragt schon über das Dach hinaus.' },
      { name: 'Melchior',       value: 100, price: 11000, perk: 'Die grösste Flasche der Welt. Am Rücken.' },
    ],
    // fallFactor = Fallschaden-Multiplikator · biteFactor = Wurmbiss-Multiplikator · thorns = Schaden an Wurmköpfen bei Kontakt
    hull: [
      { name: 'Lack Champagne',           value: 30,  price: 0,     perk: 'Glänzt. Mehr nicht.' },
      { name: 'Carbon mit Goldintarsien', value: 55,  price: 400,   perk: 'Leicht, schwarz, golden gestreift.' },
      { name: 'Haute Couture Matelassé',  value: 90,  price: 1500,  perk: 'Gestepptes Leder: halber Fallschaden.', fallFactor: 0.5 },
      { name: 'Blindage Royal',           value: 140, price: 5000,  perk: 'Samt, Hermelin, Krone. Würmer beissen 30 % sanfter.', fallFactor: 0.5, biteFactor: 0.7 },
      { name: 'Forteresse Couture',       value: 200, price: 15000, perk: 'Eine fahrende Burg. Wurmköpfe verletzen sich an den Zinnen.', fallFactor: 0.3, biteFactor: 0.6, thorns: 12 },
    ],
    cargo: [
      { name: 'Schmuckschatulle',  value: 6,  price: 0,     perk: 'Rotes Samtkästchen auf dem Dach.' },
      { name: 'Wandtresor',        value: 12, price: 350,   perk: 'Mit Drehschloss.' },
      { name: 'Privatbank-Tresor', value: 20, price: 1200,  perk: 'Schweizer Qualität. Diskret.' },
      { name: 'Salle des Coffres', value: 30, price: 4000,  perk: 'Ein ganzer Schliessfachraum.' },
      { name: 'Banque Centrale',   value: 45, price: 12000, perk: 'Eine eigene Notenbank auf dem Dach.' },
    ],
  },
  // ===================================================================
  //  GADGETS – im Atelier Privé kaufen, mit den Tasten 1–8 benutzen.
  //  Jeder Kauf gibt "uses" Nutzungen dazu. Kein Limit.
  //  type: bomb · fuel · repair · shield · bait · torch · teleport
  // ===================================================================
  gadgets: [
    { id: 'dynamit',  name: "Dynamit «Feu d'Artifice»",    type: 'bomb',     uses: 1, price: 450,
      radius: 1, wormDamage: 15, selfDamage: 12, fuse: 2.0,
      desc: 'Ablegen, 2 s warten, BOUM. Sprengt 3×3 Tiles inkl. Fels. Erz fällt als Beute heraus.' },
    { id: 'c4',       name: 'C4 «Le Grand Boum»',          type: 'bomb',     uses: 1, price: 1800,
      radius: 2, wormDamage: 40, selfDamage: 25, fuse: 2.5,
      desc: 'Wie Dynamit, nur 5×5 Tiles. Bitte Abstand halten.' },
    { id: 'kanister', name: 'Reservekanister «Petit Flacon»', type: 'fuel',   uses: 1, price: 180,
      amount: 10, desc: 'Sofort +10 L Brennstoff – mitten in der Tiefe.' },
    { id: 'reparatur', name: 'Reparaturset «Nécessaire»',  type: 'repair',   uses: 1, price: 600,
      amount: 30, desc: 'Sofort +30 HP. Der Butler poliert auch gleich.' },
    { id: 'schirm',   name: 'Schutzschirm «Parasol Doré»', type: 'shield',   uses: 1, price: 1500,
      duration: 8, desc: '8 s unverwundbar. Würmer prallen ab, das Seil reisst nicht.' },
    { id: 'koeder',   name: 'Wurmköder «Foie Gras»',       type: 'bait',     uses: 2, price: 750,
      duration: 10, radius: 14, desc: 'Ablegen: lockt 10 s alle Würmer in der Nähe an. Ideal mit Dynamit.' },
    { id: 'fackel',   name: 'Fackel «Chandelier»',        type: 'torch',    uses: 3, price: 360,
      duration: 20, desc: '20 s hell in der Tiefe + Pfeil zum nächsten Artefakt.' },
    { id: 'teleport', name: 'Teleporter «Retour au Château»', type: 'teleport', uses: 1, price: 2700,
      desc: 'Sofort zurück an die Oberfläche. Ein Artefakt am Seil bleibt unten liegen.' },
    { id: 'entschaerfer', name: 'Entschärfer «Fil Rouge»', type: 'defuse', uses: 2, price: 1200,
      reach: 1.5, duration: 0.6,
      desc: 'An eine tickende Bombe halten (höchstens 1 Tile entfernt): Sie landet entschärft im Inventar. Taste 0 legt sie selbst ab, Tab wechselt die Bombe.',
      msg: ['Roter Draht? Blauer Draht? Sie wählen den goldenen. Entschärft!', 'Mit ruhiger Hand und frisch manikürten Fingern: entschärft.', 'Der Kampfmittelräumdienst ist beeindruckt – und leicht beleidigt.', 'Entschärft. Der Butler verstaut sie neben dem Kaviar.'] },
  ],

  rockHardness: 4.5,        // Fels-Härte, wenn der Bohrkopf "rock" kann

  // Gebäude an der Oberfläche (x = Start-Spalte, w = Breite, h = Höhe in Tiles)
  stations: [
    { id: 'fuel', name: 'Tankstelle Royale', monogram: 'T', tagline: 'Nur das Feinste für Ihren Tank.', x: 10, w: 4, h: 3, color: '#c8352b' },
    { id: 'sell', name: 'Banque Privée',     monogram: 'B', tagline: 'Die Bank kauft. Die Bank zahlt. Die Bank gewinnt.', x: 16, w: 4, h: 3, color: '#1b5fa8' },
    { id: 'shop', name: 'Atelier Privé',     monogram: 'A', tagline: 'Upgrades für Menschen mit Geschmack.', x: 23, w: 5, h: 4, color: '#1f8a4c' },
    { id: 'museum', name: 'Musée de la Haute Couture', monogram: 'M', tagline: 'Für Dinge, die eigentlich niemand verlieren dürfte – und für Steine, die niemand verdient.', x: 2, w: 7, h: 3, color: '#8a5a2b' },
    { id: 'tower', name: "Tour de l'Amour",  monogram: '♥', tagline: 'Hier wohnt die Prinzessin. Sie wartet. Auf Tiefgang.', x: 35, w: 3, h: 9, color: '#c2417a' },
  ],

  spawnColumn: 32,

  camera: {
    singleViewWidth: 0.5,   // Einzelspieler: sichtbarer Anteil der Kartenbreite (0.5 = 50 %, alles doppelt so gross)
  },

  // ===================================================================
  //  ARTEFAKTE – pro Area 5 einmalige Fundstücke.
  //  Liegen sichtbar im Erdreich.
  //  Freilegen -> berühren -> hängt am Seil -> zum Musée de la Haute Couture bringen.
  //  Jeder Schaden am Pod lässt das Seil reissen: Das Artefakt fällt dort hin.
  // ===================================================================
  artifactRules: {
    ropeLength: 42,        // Pixel Seillänge
    reattachDelay: 1.5,    // Sekunden, bis man ein abgefallenes Artefakt wieder anhängen kann
    hardness: 1.6,         // Härte des Bodens um das Artefakt
  },
  // area = in welcher Area es versteckt ist · icon = Emoji · value = Finderlohn des Museums
  artifacts: [
    // Area 1 · Eisen – «Verlorene Mode»
    { id: 'tasche',   area: 1, name: 'Gucci-Tasche',                 value: 300,   desc: 'Bei einem Picknick 1987 im Boden versunken.' },
    { id: 'schuhe',   area: 1, name: 'Prada-Schuhe',                 value: 450,   desc: 'Ein Paar. Der linke Absatz fehlt leider.' },
    { id: 'schal',    area: 1, name: 'Hermès-Seidenschal',           value: 650,   desc: 'Riecht noch nach Monaco.' },
    { id: 'uhr',      area: 1, name: 'Goldene Taucheruhr',           value: 900,   desc: 'Wasserdicht bis 300 m. Erdedicht bis 120 m.' },
    { id: 'parfum',   area: 1, name: 'Parfum-Flakon von 1921',       value: 1200,  desc: 'Das Original. Ein Tropfen kostet ein Chalet.' },
    // Area 2 · Kupfer – «Königliche Schätze»
    { id: 'ei',       area: 2, name: 'Fabergé-Ei',                   value: 1600,  desc: 'Für die Zarin. Bitte nicht kochen.' },
    { id: 'collier',  area: 2, name: 'Collier Louis XIV',            value: 2200,  desc: 'Der Sonnenkönig trug es zum Frühstück.' },
    { id: 'maske',    area: 2, name: 'Maske Casanovas',              value: 2800,  desc: 'Venedig, Karneval 1755. Mehr wird nicht verraten.' },
    { id: 'hut',      area: 2, name: 'Zylinder des Barons',          value: 3500,  desc: 'Der Baron hat ihn beim Golfen verloren. Tief.' },
    { id: 'krone',    area: 2, name: 'Krone der Zarin',              value: 4500,  desc: '2564 Diamanten. Wir haben nachgezählt.' },
    // Area 3 · Silber – «Urzeit & Legenden»
    { id: 'ammonit',  area: 3, name: 'Goldener Ammonit',             value: 5500,  desc: '200 Millionen Jahre alt und trotzdem modisch.' },
    { id: 'zahn',     area: 3, name: 'Säbelzahn',                    value: 7000,  desc: 'Sein Besitzer bevorzugte Mammut medium-rare.' },
    { id: 'mammut',   area: 3, name: 'Mammut-Stosszahn',             value: 8500,  desc: 'Drei Meter. Passt knapp ins Museum.' },
    { id: 'trex',     area: 3, name: 'Schädel eines T-Rex',          value: 11000, desc: 'Grinst immer noch.' },
    { id: 'schwert',  area: 3, name: 'Excalibur',                    value: 14000, desc: 'Steckte gar nicht im Stein. Sondern hier.' },
    // Area 4 · Gold – «Das Unmögliche»
    { id: 'galeone',  area: 4, name: 'Versunkene Galeone',           value: 18000, desc: 'Wie sie 1700 m tief kam? Niemand weiss es.' },
    { id: 'saeule',   area: 4, name: 'Säule von Atlantis',          value: 24000, desc: 'Atlantis lag also unter der Schweiz.' },
    { id: 'diamant',  area: 4, name: "Riesendiamant «L'Étoile du Néant»", value: 32000, desc: 'So gross wie ein Fussball. Unbezahlbar. Fast.' },
    { id: 'meteor',   area: 4, name: 'Platin-Meteorit',             value: 40000, desc: 'Vor 4 Milliarden Jahren gelandet. Mit Absicht.' },
    { id: 'alien',    area: 4, name: 'Alien-Fragment',               value: 55000, desc: 'Es summt leise. Wir empfehlen Handschuhe.' },
  ],

  // Schlusswertung (Sieg oder Bankrott)
  // ===================================================================
  //  ENDBOSS – unter der letzten Area liegt sein Salon (lairRows Zeilen).
  //  Der Zugang ist eine Felskruste: nur mit Fels-Bohrkopf oder Sprengstoff.
  //  Verwundbar ist er von hinten und von oben (Bohren, Explosionen);
  //  die Diamantkrallen vorne tun weh. Nach dem Ansturm gegen die Wand ist er benommen
  //  und nimmt doppelten Bohrschaden.
  // ===================================================================
  boss: {
    name: 'Le Baron Noir', title: 'Ur-Maulwurf und Grundbesitzer der Tiefe',
    lairRows: 13, hp: 1200,          // 13 Zeilen: Decke und Boden passen gleichzeitig ins Bild
    contactDamage: 30,      // Krallen (× Biss-Faktor der Karosserie)
    rockDamage: 18,         // geworfene Felsbrocken
    slamDamage: 15,         // Schockwelle beim Stampfen (wer in der Luft ist, bleibt verschont)
    speed: 70, chargeSpeed: 430, explosionFactor: 1.5,
    // Der Twist: Bohren ist mühsam (Panzer aus Etikette), Kronleuchter sind der elegante Weg –
    // sie lösen sich nur durch Explosionen (Kette im Sprengradius). Bombe nahe am Leuchter = Haftladung.
    drillFactor: 0.15,      // Bohrschaden × 0.15 – möglich, aber mühsam
    chandelierDamage: 300,  // ein fallender Kronleuchter auf den Zylinder (4 Treffer = Sieg)
    chandelierStun: 3.2, wallStun: 3.8, feastTime: 4.5, rehang: 25,
    minion: 'erdfresser', maxMinions: 4,
    reward: 50000, score: 25000,
    treasure: ['coeur', 'coeur', 'painit', 'painit', 'diamant', 'diamant', 'rubin', 'alexandrit'],
    lines: {
      intro: '«Wer hat Sie hereingelassen? Dies ist ein Privatanwesen – seit 40 Millionen Jahren!»',
      charge: '«Ich bitte um Ihren sofortigen Abgang!»',
      wall: 'Der Baron ist gegen die Wand gerannt. Peinlich. Er ist benommen – und steht genau unter dem Kronleuchter!',
      throw: '«Ein kleines Präsent aus meiner Sammlung!»',
      summon: '«Personal! Begleiten Sie den Herrn hinaus!»',
      slam: '«Ich stampfe nur ungern. Aber Sie lassen mir keine Wahl.» – Springen Sie!',
      claws: 'Klirr! Die Krallen des Barons sind aus Diamant. Von hinten oder von oben bohren!',
      phase2: '«Sie haben mein Monokel beschlagen. Das wird teuer.»',
      phase3: '«GENUG! Ich enterbe Sie! Alle!»',
      death: 'Le Baron Noir ist besiegt! Sein Vermögen geht – ganz legal – an Sie über.',
      drill: 'Mühsam … Der Baron trägt einen Panzer aus reiner Etikette. Es gibt elegantere Wege.',
      feast: '«Foie Gras? Für mich? Wie aufmerksam!» – Der Baron diniert. Er steht jetzt still.',
      chandelier: 'KLIRR! Ein Kronleuchter auf den Zylinder. Der Baron verliert die Contenance!',
      miss: 'Der Kronleuchter zerschellt am Boden. Der Butler seufzt.',
      rehang: 'Der Butler hat diskret einen neuen Kronleuchter aufgehängt.',
      hint: ['Der Butler flüstert: «Der Herr Baron liebt Foie Gras über alles.»', 'Der Butler flüstert: «Die Kronleuchter hängen an sehr alten Ketten, Monsieur. Ein wenig Dynamit – und sie lösen sich.»', 'Der Butler flüstert: «Eine Ladung direkt am Kristall hält bombenfest. Wenn Sie verstehen.»', 'Der Butler flüstert: «Nach jedem Ansturm sieht der Herr Baron Sterne. Direkt unter den Leuchtern.»'],
    },
  },

  // ===================================================================
  //  STORYLINE – Dialoge. who: amelie · fernand · baron · narrator
  //  Jede Szene läuft einmal pro Spiel. {name} = Anrede (Monsieur / Messieurs).
  // ===================================================================
  story: {
    cast: {
      amelie:   { name: 'Prinzessin Amélie', color: '#ff9ac0', pitch: 520 },
      fernand:  { name: 'Fernand, Ihr Butler', color: '#c9b9e6', pitch: 190 },
      baron:    { name: 'Le Baron Noir', color: '#ff5a4a', pitch: 95 },
      narrator: { name: 'Chronik der Maison Profondeur', color: '#ffd23f', pitch: 300 },
    },
    scenes: {
      intro: [
        ['narrator', 'Maison Profondeur. Einst die vornehmste Familie der Schweiz. Heute: ein Pod, ein Butler und CHF 40.–.'],
        ['fernand', 'Die Gläubiger sind fort, {name}. Leider auch das Silber, die Gemälde und das Mobiliar.'],
        ['amelie', 'Bonsoir! Ich bin Amélie. Und ich heirate nur jemanden mit echtem Tiefgang.'],
        ['fernand', 'Sie meint das wörtlich, {name}. Je tiefer Sie graben, desto länger wird ihr Haar. Reicht es bis zum Boden, dürfen Sie im Turm um ihre Hand anhalten.'],
        ['fernand', 'Bohren Sie mit den Pfeiltasten, verkaufen Sie Erze in der Banque Privée, rüsten Sie im Atelier auf. Und bitte: Behalten Sie den Tank im Auge. Ist er leer, ist alles vorbei.'],
        ['narrator', 'Man munkelt, ganz unten, unter allen Erzen, residiere jemand, der die Unterwelt für seinen Privatbesitz hält …'],
      ],
      firstOre: [['fernand', 'Ein erstes Erz! Bringen Sie es zur Banque Privée, {name}. Die Bank kauft alles – ausser Gefühle.']],
      firstWorm: [['fernand', 'Ein Wurm, {name}! Meiden Sie den Kopf und bohren Sie in den Körper. Wie bei Verhandlungen.']],
      firstArtifact: [['fernand', 'Ein Erbstück der Haute Couture! Berühren, anseilen, unbeschädigt ins Musée bringen. Ein Kratzer – und das Seil reisst.']],
      firstMine: [['fernand', '{name} … das tickt. Entweder Sie laufen – oder Sie haben einen Entschärfer dabei. Im Atelier gäbe es einen.']],
      lowFuel: [['fernand', 'Der Tank wird leer, {name}. Ich erlaube mir den Hinweis: Ohne Treibstoff kein Rückweg – und kein Ruhm.']],
      area2: [
        ['amelie', 'In der Stadt spricht man von Ihnen! Kupfer, sagt man? Wie … rustikal.'],
        ['fernand', 'Ein Kompliment, {name}. Glaube ich. Die Würmer hier unten sind übrigens grösser. Und hungriger.'],
      ],
      area3: [['fernand', 'Ab hier wird es kalt, nass und kristallin. Die Spiegelwürmer zeigen einem sein wahres Gesicht. Bitte nicht hineinschauen.']],
      area4: [
        ['amelie', 'Mein Haar ist schon so lang, die Zofe kommt mit dem Bürsten kaum nach!'],
        ['fernand', 'Unter dem Gold liegt eine Felskruste, {name}. Dahinter: das Anwesen des Barons. Wir sind … nicht eingeladen.'],
      ],
      love50: [['amelie', 'Sie sind auf halbem Weg – zu mir. Und zum Mittelpunkt der Erde.']],
      hairDone: [['amelie', 'Mein Haar reicht bis zum Boden! Kommen Sie zum Turm, bevor ich es mir anders überlege.']],
      lair: [
        ['baron', 'Wer wagt es, unangemeldet meinen Salon zu betreten?'],
        ['fernand', 'Le Baron Noir, {name}. Er hat Ihrer Familie einst alles abgekauft. Zum Spottpreis.'],
        ['baron', 'Dies ist ein Privatanwesen. Seit 40 Millionen Jahren. Butler – zeigen Sie dem Herrn die Tür!'],
        ['fernand', '(flüsternd) Ich gehöre selbstverständlich nicht zu ihm. Aber mir fällt auf: Die Kronleuchter hängen an sehr alten Ketten.'],
      ],
      bossDead: [
        ['baron', 'Mein … Monokel … Sie haben … Stil …'],
        ['narrator', 'Le Baron Noir ist besiegt. Sein Vermögen, seine Kronleuchter und ein beträchtlicher Teil der Unterwelt gehen an die Maison Profondeur.'],
        ['fernand', 'Darf ich den Champagner reichen, {name}? Er ist nur leicht verstaubt.'],
      ],
      ending: [
        ['amelie', 'Sie haben Tiefgang bewiesen. Ich sage: Oui!'],
        ['narrator', 'Und so wurde die Maison Profondeur wieder die vornehmste Familie der Schweiz – mit dem tiefsten Keller der Welt.'],
        ['fernand', 'Das Bad ist eingelassen, {name}. Die Erde wasche ich gleich mit ab.'],
      ],
      endingBoss: [
        ['amelie', 'Und den Baron haben Sie auch besiegt? Mein Vater wird entzückt sein – er schuldet ihm Geld.'],
      ],
      gameOverFuel: [['fernand', 'Der Tank ist leer, {name}. Ich rufe den Abschleppdienst. Und das Konkursamt.']],
      gameOverHull: [['fernand', 'Totalschaden, {name}. Die Versicherung lacht noch immer.']],
    },
  },

  score: {
    perBoss: 25000,        // Punkte für den Sieg über den Endboss
    perArtifact: 2500,     // Punkte pro geborgenem Artefakt
    perMeter: 2,           // Punkte pro Meter Tiefenrekord
    moneyFactor: 1,        // Punkte pro CHF Vermögen
  },

  // Die Prinzessin: Ihr Haar wächst mit deiner grössten erreichten Tiefe.
  // Reicht es bis zum Boden, kannst du im Turm um ihre Hand anhalten = Spiel gewonnen.
  princess: {
    goalDepth: 390,          // Tiles Tiefe (× metersPerTile = 1950 m, also fast ganz unten in Area 4)
    hairColor: '#f2c14e',
    quotes: [               // [ab Fortschritt, Spruch]
      [0.00, 'Ein Gräber? Wie … bodenständig.'],
      [0.10, 'Tiefer, mein Herr. Ich bin nicht leicht zu beeindrucken.'],
      [0.35, 'Oh! Mein Haar wächst … Sie graben ja tatsächlich.'],
      [0.65, 'Fast bis zum Boden … mein Herz klopft im Takt Ihres Bohrers.'],
      [1.00, 'Mein Haar reicht bis zu Ihnen. Halten Sie um meine Hand an!'],
    ],
  },

  // Monster: Würmer, die sich durch den Boden fressen.
  // Wo sie leben und wie viele es gibt, steht bei den Areas (enemies + enemyScale).
  // Die Werte hier sind die Grundwerte – jede Area multipliziert sie mit ihrem enemyScale.
  // ===================================================================
  //  VERGRABENE BOMBEN – liegen im Erdreich und werden bei Annäherung scharf.
  //  trigger = Auslöse-Abstand in Tiles · fuse = Sekunden bis BOUM · radius = Sprengradius in Tiles
  //  bounty = Prämie, wenn man sie mit eigenem Dynamit/C4 kontrolliert sprengt (= sicher entschärft)
  // ===================================================================
  mines: [
    { id: 'blindgaenger', name: 'Blindgänger von 1916', radius: 1, damage: 14, trigger: 1.3, fuse: 1.6, wormDamage: 6, bounty: 60,
      boom: 'Ein Blindgänger von 1916 – pünktlich wie die Bahn, nur 110 Jahre zu spät.' },
    { id: 'dynamit_alt', name: 'Verlorenes Dynamit', radius: 1, damage: 20, trigger: 1.3, fuse: 2.2, wormDamage: 8, bounty: 90,
      boom: 'Verlorenes Dynamit eines Goldsuchers von 1880. Er lässt herzlich grüssen.' },
    { id: 'seemine', name: 'Seemine «Mal de Mer»', radius: 2, damage: 32, trigger: 1.6, fuse: 2.0, wormDamage: 12, bounty: 260,
      boom: 'Eine Seemine, 300 Meter unter der Erde. Niemand weiss, wie sie hierherkam – am wenigsten die Mine.' },
    { id: 'fliegerbombe', name: 'Fliegerbombe', radius: 2, damage: 45, trigger: 1.7, fuse: 2.6, wormDamage: 16, bounty: 600,
      boom: 'Eine Fliegerbombe! Der Kampfmittelräumdienst schickt Ihnen die Rechnung.' },
    { id: 'atombombe', name: 'Atombombe «Fin de Saison»', radius: 4, damage: 80, trigger: 2.0, fuse: 4.5, wormDamage: 40, flash: 1, bounty: 4000,
      boom: 'Die Atombombe «Fin de Saison» ist detoniert. Ihre Versicherung hat soeben aufgelegt.' },
    { id: 'hbombe', name: 'Wasserstoffbombe «Apocalypse Couture»', radius: 6, damage: 130, trigger: 2.3, fuse: 6, wormDamage: 80, flash: 1.6, bounty: 12000,
      boom: 'Die Wasserstoffbombe! Man hört sie bis Monaco. Die Yachten schaukeln, der Champagner schwappt.' },
  ],

  // ===================================================================
  //  NATURPHÄNOMENE – Einschlüsse im Boden (Anzahl pro Area in areas[].phenomena)
  // ===================================================================
  phenomena: {
    ice:       { name: 'Gletschereis', size: [3, 8], hardness: 0.7, freeze: 3.2, thawFuel: 2.5,   // eingefroren 3.2 s; Auftauen verbraucht 2.5× den Flug-Verbrauch
                 thawMsg: 'Der Motor heizt auf Hochtouren, um das Eis zu schmelzen. Der Treibstoff verdampft gleich mit.',
                 msg: ['Eiskalt erwischt! Der Champagner im Réservoir ist jetzt perfekt temperiert.', 'Gletschereis! Ihr Pod ist eingefroren – sehr exklusiv, sehr kurz.', 'Brrr. Der Butler bringt eine Kaschmirdecke.'],
                 slideMsg: 'Glatteis! Bitte bremsen Sie mit Würde.' },
    quicksand: { name: 'Treibsand', size: [4, 10], sink: 26,   // Sinkgeschwindigkeit px/s, Schub wirkungslos
                 thrustMsg: 'Schub im Treibsand? Die Schraube wirbelt nur Sand auf. Sie sinken trotzdem – mit Stil.',
                 msg: ['Treibsand! Sie versinken – aber mit Haltung.', 'Treibsand. Bitte nicht zappeln, das wirkt so unelegant.', 'Ein Sandbad wie im Spa. Nur leider unfreiwillig.'] },
    water:     { name: 'Wassereinschluss', size: [5, 14], electricDps: 14,
                 msg: ['Wassereinbruch! Ihr Pod ist jetzt ein U-Boot. Ein sehr teures.', 'Mineralwasser, naturbelassen. Leider ohne Kohlensäure.', 'Unterirdischer See! Kapitän, wir haben einen Wasserschaden.'],
                 coalMsg: 'Das Kohlefeuer zischt. Ihr Heizer kündigt fristlos.',
                 electricMsg: 'Kurzschluss! Wer baut auch eine Tesla-Spule in ein U-Boot?' },
    magma:     { name: 'Magma', size: [4, 12], dps: 30,
                 msg: ['Magma! Ihre Ledersitze schmelzen.', 'Heiss, heisser, Magma. Das Fondue ist angerichtet.', 'Lava! Das deckt die Garantie leider nicht.'],
                 obsidianMsg: 'Wasser trifft Magma: Obsidian! Wie apart.' },
    quake:     { name: 'Erdbeben', duration: 3.5, rockDamage: 10, randomEvery: [80, 160], fromArea: 2,
                 msg: ['Erdbeben! Die Erde räuspert sich.', 'Ein Beben! Bitte die Gläser festhalten.', 'Die Erde bebt – vermutlich vor Neid.'],
                 faultMsg: 'Sie haben eine Verwerfung angebohrt. Die Erde nimmt das persönlich.',
                 rockMsg: 'Steinschlag! Der Rückweg ist jetzt etwas rustikaler.' },
  },

  enemyHitCooldown: 1.1,   // Sekunden Unverwundbarkeit nach einem Treffer
  drillDamage: 8,          // Schaden pro Sekunde am Wurmkörper (× Bohrkraft)
  // Kopf = gefährlich für dich · Körper/Schwanz anbohren = Schaden für den Wurm
  // hp = Lebenspunkte · loot = Trophäen-Erz beim Erlegen
  enemies: [
    { id: 'erdfresser', name: 'Gemeiner Erdfresser', segments: 8, radius: 9,
      speed: 45, chaseSpeed: 75, turnRate: 2.4, damage: 9, aggroRange: 6, digsRock: false,
      hp: 6, loot: { ore: 'perle', count: 1 },
      color: '#4a2f2c', belly: '#8c5a50', eye: '#ff3b2f' },
    { id: 'schlundwurm', name: 'Schlundwurm', segments: 12, radius: 12,
      speed: 55, chaseSpeed: 95, turnRate: 2.1, damage: 17, aggroRange: 8, digsRock: false,
      hp: 14, loot: { ore: 'ambre', count: 2 },
      color: '#2f3a33', belly: '#4f7a62', eye: '#ffae1a' },
    { id: 'spiegelwurm', name: 'Spiegelwurm', segments: 15, radius: 13,
      speed: 62, chaseSpeed: 110, turnRate: 2.3, damage: 23, aggroRange: 9, digsRock: false,
      hp: 20, loot: { ore: 'larme', count: 2 },
      color: '#3a4256', belly: '#a9b6cc', eye: '#7fe3ff' },
    { id: 'unaussprechlich', name: 'Der Unaussprechliche', segments: 20, radius: 15,
      speed: 60, chaseSpeed: 120, turnRate: 1.7, damage: 30, aggroRange: 11, digsRock: true,
      hp: 28, loot: { ore: 'coeur', count: 3 },
      color: '#16171c', belly: '#4a1a2a', eye: '#ff1f4b' },
  ],
};
