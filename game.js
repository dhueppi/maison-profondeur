// =====================================================================
//  MY MOTHERLOAD – Prototyp
//  Alle Inhalte (Erze, Upgrades, Gebäude, Physik) kommen aus data.js.
// =====================================================================
(() => {
  'use strict';

  const D = GAME_DATA;
  const T = D.world.tileSize;
  const W = D.world.width;
  const SURF = D.world.surfaceRow;
  const P = D.physics;
  const AREAS = D.areas;
  const AREA_TILES = Math.round(D.areaDepth / D.world.metersPerTile);   // 500 m = 100 Tiles
  const BOSS = D.boss || null;
  const LAIR_ROWS = BOSS ? BOSS.lairRows : 0;                              // Salon des Endbosses unter der letzten Area
  const LAIR_TOP = SURF + AREAS.length * AREA_TILES;
  const H = SURF + AREAS.length * AREA_TILES + LAIR_ROWS + 1;             // + 1 Zeile Grundgestein
  const GROUND_ORES = D.ores.map((o, i) => ({ o, i })).filter(x => !x.o.lootOnly);

  // ---------- Areas ----------
  const areaIndexAt = depth => Math.max(0, Math.min(AREAS.length - 1, Math.floor(depth / AREA_TILES)));
  // Liefert die beteiligten Areas mit Gewicht – an den Grenzen mischen sich zwei Areas weich.
  function areaBlendAt(depth) {
    const i = areaIndexAt(depth);
    const frac = depth / AREA_TILES - i;
    const b = D.areaBlend;
    if (frac > 1 - b && i < AREAS.length - 1) {
      const t = (frac - (1 - b)) / (2 * b);
      return [{ i, w: 1 - t }, { i: i + 1, w: t }];
    }
    if (frac < b && i > 0) {
      const t = (b - frac) / (2 * b);
      return [{ i, w: 1 - t }, { i: i - 1, w: t }];
    }
    return [{ i, w: 1 }];
  }
  const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbStr = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // Look pro Zeile vorberechnen (Farben weich zwischen Areas gemischt)
  const rowLook = [];
  for (let r = 0; r < H; r++) {
    const depth = Math.max(0, r - SURF);
    const parts = areaBlendAt(depth);
    const L = { dirt: [0, 0, 0], rock: [0, 0, 0], vein: [0, 0, 0], area: areaIndexAt(depth) };
    for (const { i, w } of parts) {
      const lk = AREAS[i].look;
      for (let k = 0; k < 3; k++) {
        L.dirt[k] += lk.dirt[k] * w;
        L.rock[k] += hexRgb(lk.rock)[k] * w;
        L.vein[k] += hexRgb(lk.vein)[k] * w;
      }
    }
    L.parts = parts;
    L.rockStr = rgbStr(L.rock);
    L.veinStr = rgbStr(L.vein, 0.6);
    L.veinFaint = rgbStr(L.vein, 0.35);
    rowLook.push(L);
  }
  // Erz-Gewichte für eine Tiefe: Haupterz der Area + seltener schlechteres/besseres Erz
  function oreWeightsAt(depth) {
    const weights = GROUND_ORES.map(() => 0);
    let oreChance = 0, rockChance = 0;
    for (const { i, w } of areaBlendAt(depth)) {
      oreChance += AREAS[i].oreChance * w;
      rockChance += AREAS[i].rockChance * w;
      GROUND_ORES.forEach((g, k) => { weights[k] += (D.oreMix[String(g.o.area - 1 - i)] || 0) * (g.o.share ?? 1) * w; });
    }
    return { weights, total: weights.reduce((a, b) => a + b, 0), oreChance, rockChance };
  }

  // ---------- Tile-Typen ----------
  const EMPTY = 0, DIRT = 1, ROCK = 2, BEDROCK = 3, CONCRETE = 4, ARTIFACT = 5;
  const ICE = 6, MAGMA = 7, SAND = 8, WATER = 9, FAULT = 10;           // Naturphänomene
  const ORE_BASE = 20; // Erz i => ORE_BASE + i
  const PH = D.phenomena;
  const isFluid = t => t === MAGMA || t === SAND || t === WATER;

  const isOre = t => t >= ORE_BASE;
  const oreOf = t => D.ores[t - ORE_BASE];
  const solid = t => t !== EMPTY && !isFluid(t);
  function hardnessOf(t) {
    if (t === DIRT) return 1;
    if (t === ICE) return PH.ice.hardness;
    if (t === FAULT) return 1.3;
    if (t === ARTIFACT) return D.artifactRules.hardness;
    if (isOre(t)) return oreOf(t).hardness;
    return Infinity; // Fels, Grundgestein, Beton: nicht bohrbar
  }

  // ---------- Pixel-Helfer (sprites.js) ----------
  // Sprites sind nativ 1:1 (32 px pro Tile). PXS = Rastermass (2 px) für einfache Effekte
  // für Schrift, Schilder, Seil, Stacheln usw.
  const PXS = PIXEL.U;
  const snap = v => Math.round(v);
  function blit(img, x, y, flip = false, sc = 1) {  // Sprite an Weltposition (sc = Vergrösserung)
    if (!img) return;
    const w = img.width * sc, h = img.height * sc;
    if (flip) { ctx.save(); ctx.translate(snap(x) + w, snap(y)); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); ctx.restore(); }
    else ctx.drawImage(img, snap(x), snap(y), w, h);
  }
  function blitC(img, cx, cy, sc = 1) { if (img) blit(img, cx - img.width * sc / 2, cy - img.height * sc / 2, false, sc); }
  function sparkle(x, y, n = 2) { // feiner Stern: 1-px-Arme
    x = snap(x); y = snap(y);
    ctx.fillStyle = '#fff6d8'; ctx.fillRect(x - n, y, n * 2 + 1, 1); ctx.fillRect(x, y - n, 1, n * 2 + 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
  }
  function pxRect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(snap(x), snap(y), w * PXS, h * PXS); }
  function ptext(str, cx, y, color = '#ffffff', align = 'center', small = false) {
    const sp = PIXEL.text(str, color, PIXEL.INK, small);
    const x = align === 'center' ? cx - sp.width / 2 : align === 'right' ? cx - sp.width : cx;
    blit(sp, x, y);
  }
  const smokeRamps = {};
  const smokeRamp = c => smokeRamps[c] || (smokeRamps[c] = PIXEL.ramp(c));

  // ---------- Canvas & DOM ----------
  const canvas = document.getElementById('game');
  let ctx = canvas.getContext('2d'); // let: wird für die Shop-Vorschau kurz auf eine andere Leinwand umgeschaltet
  const $ = id => document.getElementById(id);
  const hud = [1, 2].map(n => ({
    money: $(`hud${n}-money`), depth: $(`hud${n}-depth`), fuel: $(`hud${n}-fuel`),
    hull: $(`hud${n}-hull`), cargo: $(`hud${n}-cargo`), love: $(`hud${n}-love`), fuelName: $(`hud${n}-fuelname`), relics: $(`hud${n}-relics`),
  }));
  const hintEl = $('hint'), toastEl = $('toast'), panelEl = $('panel'), introEl = $('intro');
  let introOpen = true;
  const fmt = n => `${D.currency} ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.–`;
  const BORDEAUX = '#6e1423', EMERALD = '#1f4d3a';

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Zufall mit Seed ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- Welt ----------
  let world, shade;

  function stationAtColumn(c) {
    return D.stations.find(s => c >= s.x && c < s.x + s.w) || null;
  }

  function generateWorld(seed) {
    const rnd = mulberry32(seed);
    world = new Uint8Array(W * H);
    shade = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        shade[i] = rnd();
        let t = EMPTY;
        if (y < SURF) t = EMPTY;
        else if (x === 0 || x === W - 1 || y === H - 1) t = BEDROCK;
        else if (y === SURF && stationAtColumn(x)) t = CONCRETE;
        else if (LAIR_ROWS && y >= LAIR_TOP) t = y < LAIR_TOP + 2 ? ROCK : y === H - 2 ? CONCRETE : EMPTY;   // Felskruste, Salon, Marmorboden
        else {
          const depth = y - SURF;
          const mix = oreWeightsAt(depth);
          t = DIRT;
          if (depth > 2 && rnd() < mix.rockChance) {
            t = ROCK;
          } else if (depth >= 1 && rnd() < mix.oreChance) {
            // Erz nach Area-Gewichten auswählen
            let roll = rnd() * mix.total;
            for (let k = 0; k < GROUND_ORES.length; k++) {
              roll -= mix.weights[k];
              if (roll <= 0) { t = ORE_BASE + GROUND_ORES[k].i; break; }
            }
          }
        }
        world[i] = t;
      }
    }
    hideArtifacts(mulberry32(seed + 4242));
    placeHazards(mulberry32(seed + 9191));
  }

  // ---------- Gefahren im Boden: Einschlüsse (Eis, Treibsand, Wasser, Magma, Verwerfungen) + Bomben ----------
  let mines = [];
  function placeHazards(rnd) {
    const KIND = { ice: ICE, quicksand: SAND, water: WATER, magma: MAGMA };
    AREAS.forEach((a, ai) => {
      const top = SURF + Math.max(8, ai * AREA_TILES + 3), bot = SURF + (ai + 1) * AREA_TILES - 3;
      for (const [key, count] of Object.entries(a.phenomena || {})) {
        for (let n = 0; n < count; n++) {
          let c = 2 + Math.floor(rnd() * (W - 4)), r = top + Math.floor(rnd() * (bot - top));
          if (key === 'fault') { for (let k = 0; k < 2 + Math.floor(rnd() * 2); k++) if (world[(r + k) * W + c] === DIRT) world[(r + k) * W + c] = FAULT; continue; }
          const [mn, mx] = PH[key].size, size = mn + Math.floor(rnd() * (mx - mn + 1));
          for (let k = 0, tries = 0; k < size && tries < 60; tries++) {
            const i = r * W + c;
            if (c > 1 && c < W - 2 && r < bot && world[i] === DIRT) { world[i] = KIND[key]; k++; }
            const d = Math.floor(rnd() * 4);
            c += d === 0 ? 1 : d === 1 ? -1 : 0; r += d === 2 ? 1 : d === 3 ? -1 : 0;
            c = Math.max(2, Math.min(W - 3, c)); r = Math.max(top, Math.min(bot, r));
          }
        }
      }
    });
    mines = [];
    for (let r = SURF + 8; r < H - 2; r++) {
      const list = AREAS[areaIndexAt(r - SURF)].mines || [];
      for (let c = 1; c < W - 1; c++) {
        if (world[r * W + c] !== DIRT) continue;
        if (Math.abs(c - D.spawnColumn) < 3 && r < SURF + 30) continue;
        for (const m of list) if (rnd() < m.density) { mines.push({ c, r, x: c * T + T / 2, y: r * T + T / 2, vy: 0, def: D.mines.find(d => d.id === m.id), armed: false, fuse: 0 }); break; }
      }
    }
  }

  // Jedes Artefakt wird genau einmal in seiner Area versteckt
  let artifactAt = new Map(); // Tile-Index -> Artefakt-Definition
  function hideArtifacts(rnd) {
    artifactAt = new Map();
    for (const def of D.artifacts) {
      const ai = def.area - 1;
      if (ai < 0 || ai >= AREAS.length) continue;
      const top = Math.max(6, ai * AREA_TILES + 4), bottom = (ai + 1) * AREA_TILES - 4;
      for (let tries = 0; tries < 200; tries++) {
        const c = 2 + Math.floor(rnd() * (W - 4));
        const r = SURF + top + Math.floor(rnd() * (bottom - top));
        const i = r * W + c;
        if (artifactAt.has(i) || world[i] === BEDROCK) continue;
        world[i] = ARTIFACT;
        artifactAt.set(i, def);
        break;
      }
    }
  }

  function tileAt(c, r) {
    if (c < 0 || c >= W || r >= H) return BEDROCK;
    if (r < 0) return EMPTY;
    return world[r * W + c];
  }
  function setTile(c, r, t) { world[r * W + c] = t; }

  // ---------- Spielzustand ----------
  let state, pod, particles;
  let players = [];
  const stat = cat => D.upgrades[cat][pod.levels[cat]].value;
  const tier = (cat, pl = pod) => D.upgrades[cat][pl.levels[cat]];
  // So viele Upgrade-Stufen wie Areas (bei 4 Areas: Stufe 0 + 4 Upgrades)
  const maxLevel = cat => Math.min(D.upgrades[cat].length - 1, D.areas.length);

  const PLAYER_DEFS = [
    { name: 'Spieler 1', short: '1', color: '#1f8a4c', body: ['#f1dfa8', '#c9a961', '#7d6230'], spawn: D.spawnColumn - 2,
      controls: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', action: 'KeyE' }, actionLabel: 'E' },
    { name: 'Spieler 2', short: '2', color: '#1b5fa8', body: ['#e6f0fa', '#8fb3d9', '#34587f'], spawn: D.spawnColumn,
      controls: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', action: 'KeyM' }, actionLabel: 'M' },
  ];

  // Einzelspieler: WASD oder Pfeile, Aktion mit E, M oder Enter
  const SINGLE_DEF = { ...PLAYER_DEFS[0], spawn: D.spawnColumn,
    controls: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], action: ['KeyE', 'KeyM', 'Enter'] } };
  let mode = 'single';
  const multi = () => mode === 'multi';
  const who = (pl = pod) => multi() ? `${pl.name}: ` : '';
  const ctrlHas = (pl, k, code) => [].concat(pl.controls[k]).includes(code);

  function makePlayer(def, idx) {
    const pw = 24, ph = 24;
    return {
      ...def, idx,
      keys: { left: false, right: false, up: false, down: false },
      money: D.start.money, levels: { drill: 0, engine: 0, tank: 0, hull: 0, cargo: 0 },
      maxDepth: 0, loveStep: 0, hitCooldown: 0, lastHitBy: null, dead: 0,
      towing: null, trail: [], artifacts: [],
      gadgets: {}, captured: {}, capSel: null, defusing: null, shield: 0, torch: 0,
      x: def.spawn * T + (T - pw) / 2, y: SURF * T - ph, w: pw, h: ph, vx: 0, vy: 0,
      onGround: true, blockedL: false, blockedR: false,
      fuel: D.upgrades.tank[0].value, hull: D.upgrades.hull[0].value,
      cargo: [], drill: null, facing: idx ? -1 : 1, thrusting: false, attack: null,
    };
  }

  function newGame(newMode) {
    if (newMode) mode = newMode;
    generateWorld(D.world.seed);
    state = {
      paused: false, over: false, won: false, time: 0,
      heartBurst: 0, hair: 0, shake: 0, danger: 0,
      panel: null, panelPlayer: null,
    };
    players = multi() ? PLAYER_DEFS.map(makePlayer) : [makePlayer(SINGLE_DEF, 0)];
    applyModeUi();
    pod = players[0];
    particles = [];
    pickups = [];
    floats = [];
    relics = [];
    delivered = [];
    discovered = [];
    bombs = [];
    baits = [];
    spawnWorms(mulberry32(D.world.seed + 777));
    rocks = [];
    boss = makeBoss();
    state.quake = 0; state.flash = 0; state.rockAcc = 0;
    state.nextQuake = PH.quake.randomEvery[0] + Math.random() * (PH.quake.randomEvery[1] - PH.quake.randomEvery[0]);
    closePanel();
    storyDone = {}; dialog = null; if (dlgEl) dlgEl.classList.add('hidden');
    if (cheatOn()) pimpPods();
  }
  // Geheimcode «pimp» auf dem Startbildschirm: alle Upgrades auf Maximum, 99 Stück von jedem Gadget
  const cheatEl = document.getElementById('cheat');
  const cheatOn = () => !!cheatEl && cheatEl.value.trim().toLowerCase() === 'pimp';
  function pimpPods() {
    for (const pl of players) {
      for (const cat in pl.levels) pl.levels[cat] = D.upgrades[cat].length - 1;
      for (const g of D.gadgets) pl.gadgets[g.id] = 99;
      pod = pl; pl.fuel = stat('tank'); pl.hull = stat('hull');
    }
    pod = players[0];
    state.pimped = true;
  }

  // ---------- Eingabe ----------
  // Zwei-Spieler-Modus ist eingebaut, kann aber über data.js (features.multiplayer) ausgeblendet werden
  const MULTI_ENABLED = !!(D.features && D.features.multiplayer);
  if (!MULTI_ENABLED) {
    const mb = introEl.querySelector('[data-mode="multi"]');
    if (mb) mb.style.display = 'none';
    introEl.querySelector('.modes').classList.add('single-only');
    introEl.querySelector('.press').textContent = 'Enter, Leertaste oder 1 drücken – oder klicken';
  }

  document.querySelectorAll('img[data-icon]').forEach(el => { el.src = PIXEL.iconURL(el.dataset.icon); });

  function startMode(m) {
    if (m === 'multi' && !MULTI_ENABLED) m = 'single';
    newGame(m);
    introOpen = false;
    introEl.classList.add('gone');
    if (cheatEl) cheatEl.blur();
    story('intro', state.pimped ? () => toast('Pimp my Pod! Alle Upgrades auf Maximum, 99 Stück von jedem Gadget. Fernand ist schockiert.', EMERALD) : null);
  }
  function showMenu() {
    introOpen = true;
    dialog = null; dlgEl.classList.add('hidden');
    introEl.classList.remove('gone');
    panelEl.classList.add('hidden');
  }
  introEl.addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (b) startMode(b.dataset.mode);
  });

  function applyModeUi() {
    $('hud2').style.display = multi() ? '' : 'none';
    $('hud1').querySelector('.kicker').textContent = multi() ? 'WASD · AKTION E' : 'WASD / PFEILE · AKTION E';
    $('hud1').querySelector('.card-title').textContent = multi() ? 'Spieler 1' : 'Ihr Pod';
    $('help').innerHTML = multi()
      ? `<b>Spieler 1:</b> WASD + E &nbsp;·&nbsp; <b>Spieler 2:</b> Pfeile + M &nbsp;·&nbsp; <b>T</b> Ton ${SFX.muted ? 'aus' : 'an'} &nbsp;·&nbsp; <b>Esc</b> zurück`
      : `<b>WASD / Pfeile</b> fliegen &amp; bohren &nbsp;·&nbsp; <b>E</b> eintreten / bestätigen &nbsp;·&nbsp; <b>T</b> Ton ${SFX.muted ? 'aus' : 'an'} &nbsp;·&nbsp; <b>Esc</b> zurück`;
  }
  function releaseAllKeys() { for (const pl of players) for (const k in pl.keys) pl.keys[k] = false; }
  window.addEventListener('pointerdown', () => SFX.unlock());
  window.addEventListener('keydown', e => {
    SFX.unlock();
    if (introOpen && e.target === cheatEl) {   // Tippen im Geheimcode-Feld
      if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); startMode('single'); }
      return;
    }
    if (e.code === 'KeyT' && !e.repeat) { const m = SFX.toggleMute(); toast(m ? 'Ton aus. Die Stille des Adels.' : 'Ton an. Bitte um Ruhe für das Orchester.', EMERALD); applyModeUi(); }
    if (dialog && !introOpen) {
      if (!e.repeat && ['KeyE', 'KeyM', 'Enter', 'Space', 'NumpadEnter'].includes(e.code)) advanceDialog(false);
      if (e.code === 'Escape') advanceDialog(true);
      e.preventDefault();
      return;
    }
    if (introOpen) {
      if (['Digit1', 'Numpad1', 'Enter', 'Space'].includes(e.code)) startMode('single');
      if (MULTI_ENABLED && (e.code === 'Digit2' || e.code === 'Numpad2')) startMode('multi');
      e.preventDefault();
      return;
    }
    let used = false;
    for (const pl of players) {
      for (const k of ['left', 'right', 'up', 'down']) if (ctrlHas(pl, k, e.code)) { pl.keys[k] = true; used = true; }
      if (ctrlHas(pl, 'action', e.code)) { used = true; if (!e.repeat) actionPressed(pl); }
    }
    if (used) e.preventDefault();
    if (e.code === 'Escape') closePanel();
    // Gadgets: Einzelspieler & Spieler 1 = Tasten 1–9, Spieler 2 = Numpad 1–9
    // Erbeutete Bomben: 0 legt, Tab wechselt (Spieler 2: Numpad 0 / Numpad-Komma)
    if (!state.paused && !state.over && !introOpen) {
      if (e.code === 'Digit0' || (e.code === 'Numpad0' && !multi())) { placeCaptured(players[0]); e.preventDefault(); }
      else if (e.code === 'Numpad0' && multi()) { placeCaptured(players[1]); e.preventDefault(); }
      else if (e.code === 'Tab') { cycleCaptured(players[0]); e.preventDefault(); }
      else if (e.code === 'NumpadDecimal' && multi()) { cycleCaptured(players[1]); e.preventDefault(); }
    }
    const dm = e.code.match(/^(Digit|Numpad)([1-9])$/);
    if (dm && !state.paused && !state.over) {
      const pl = dm[1] === 'Numpad' && multi() ? players[1] : players[0];
      if (pl) { useGadget(pl, Number(dm[2]) - 1); e.preventDefault(); }
    }
  });
  window.addEventListener('keyup', e => {
    for (const pl of players) for (const k of ['left', 'right', 'up', 'down']) if (ctrlHas(pl, k, e.code)) pl.keys[k] = false;
  });
  window.addEventListener('blur', releaseAllKeys);

  // Aktionstaste: E (Spieler 1) / M (Spieler 2)
  function actionPressed(pl) {
    if (state.over) { newGame(); return; }
    if (state.paused) {
      if (state.panelPlayer !== pl) return;
      pod = pl;
      if (state.panel === 'fuel') { doAction('refuel'); doAction('repair'); }
      if (state.panel === 'sell') doAction('sell');
      if (state.panel === 'museum') doAction('deliver');
      if (state.panel === 'tower' && loveProgress(pl) >= 1) { winGame(pl); return; }
      closePanel();
    } else if (pl.dead <= 0) {
      pod = pl;
      const s = currentStation();
      if (s) openPanel(s.id, pl);
    }
  }

  // ---------- Meldungen ----------
  let toastTimer = 0;
  function toast(msg, color = BORDEAUX) {
    const good = color === EMERALD;
    toastEl.style.setProperty('--tc', good ? '#1f8a4c' : '#c8352b');
    document.getElementById('toast-tag').textContent = good ? 'GLÜCKSKARTE' : 'EREIGNISKARTE';
    document.getElementById('toast-text').textContent = msg;
    toastEl.classList.add('show');
    toastTimer = 2;
  }

  // ---------- Storyline: Dialoge mit Porträt & Schreibmaschine ----------
  const STORY = D.story || { cast: {}, scenes: {} };
  const dlgEl = $('dialog');
  let dialog = null, storyDone = {};
  const dialogOpen = () => !!dialog;
  function story(key, onDone, lines) {
    if (storyDone[key] && !lines) { if (onDone) onDone(); return; }
    storyDone[key] = true;
    const src = lines || STORY.scenes[key];
    if (!src || !src.length) { if (onDone) onDone(); return; }
    const nm = multi() ? 'Messieurs' : 'Monsieur';
    const q = src.map(([who, text]) => ({ who, text: text.replace(/\{name\}/g, nm) }));
    if (dialog) { dialog.queue.push(...q); if (onDone) dialog.done.push(onDone); return; }
    dialog = { queue: q, i: 0, shown: 0, done: onDone ? [onDone] : [], blip: 0 };
    releaseAllKeys(); SFX.loop('drill', false); SFX.loop('engine', false);
    showLine();
  }
  function showLine() {
    const ln = dialog.queue[dialog.i], c = STORY.cast[ln.who] || { name: '', color: '#ffd23f' };
    dlgEl.classList.remove('hidden');
    dlgEl.style.setProperty('--dc', c.color);
    $('dlg-portrait').src = PIXEL.storyPortraitURL(ln.who);
    $('dlg-name').textContent = c.name;
    $('dlg-text').classList.toggle('narr', ln.who === 'narrator');
    dialog.shown = 0; $('dlg-text').textContent = '';
  }
  function updateDialog(dt) {
    if (!dialog) return;
    const ln = dialog.queue[dialog.i];
    if (dialog.shown < ln.text.length) {
      const before = Math.floor(dialog.shown);
      dialog.shown = Math.min(ln.text.length, dialog.shown + dt * 48);
      const now = Math.floor(dialog.shown);
      if (now !== before) {
        $('dlg-text').textContent = ln.text.slice(0, now);
        dialog.blip -= now - before;
        if (dialog.blip <= 0 && ln.text[now - 1] !== ' ') { SFX.play('blip', { pitch: (STORY.cast[ln.who] || {}).pitch, gap: 30 }); dialog.blip = 3; }
      }
    }
  }
  function advanceDialog(skipAll) {
    if (!dialog) return;
    const ln = dialog.queue[dialog.i];
    if (!skipAll && dialog.shown < ln.text.length) { dialog.shown = ln.text.length; $('dlg-text').textContent = ln.text; return; }
    dialog.i++;
    if (skipAll || dialog.i >= dialog.queue.length) {
      const done = dialog.done; dialog = null; dlgEl.classList.add('hidden');
      last = performance.now();
      for (const f of done) f();
      return;
    }
    showLine();
  }

  // ---------- Physik & Kollision ----------
  function moveX(dx) {
    pod.x += dx;
    const top = Math.floor(pod.y / T);
    const bot = Math.floor((pod.y + pod.h - 0.01) / T);
    if (dx > 0) {
      const c = Math.floor((pod.x + pod.w - 0.01) / T);
      for (let r = top; r <= bot; r++) {
        if (solid(tileAt(c, r))) { pod.x = c * T - pod.w; pod.vx = 0; pod.blockedR = true; return; }
      }
    } else if (dx < 0) {
      const c = Math.floor(pod.x / T);
      for (let r = top; r <= bot; r++) {
        if (solid(tileAt(c, r))) { pod.x = (c + 1) * T; pod.vx = 0; pod.blockedL = true; return; }
      }
    }
  }

  function moveY(dy) {
    pod.y += dy;
    const left = Math.floor(pod.x / T);
    const right = Math.floor((pod.x + pod.w - 0.01) / T);
    if (dy > 0) {
      const r = Math.floor((pod.y + pod.h - 0.01) / T);
      for (let c = left; c <= right; c++) {
        if (solid(tileAt(c, r))) {
          pod.y = r * T - pod.h;
          landed(pod.vy);
          pod.vy = 0; pod.onGround = true;
          return;
        }
      }
    } else if (dy < 0) {
      if (pod.y < -T * 4) { pod.y = -T * 4; pod.vy = 0; return; }
      const r = Math.floor(pod.y / T);
      for (let c = left; c <= right; c++) {
        if (solid(tileAt(c, r))) { pod.y = (r + 1) * T; pod.vy = 0; return; }
      }
    }
  }

  function landed(speed) {
    if (pod.shield > 0) return;
    if (speed > P.fallDamageSpeed) {
      const dmg = Math.round((speed - P.fallDamageSpeed) * P.fallDamageFactor * (tier('hull').fallFactor ?? 1));
      if (dmg > 0) {
        pod.hull -= dmg;
        toast(`${who()}Harte Landung! −${dmg} HP`); SFX.play('thud');
      }
    }
  }

  // ---------- Bohren ----------
  let drillWarnCooldown = 0;
  function tryDrill(dx, dy) {
    const cx = pod.x + pod.w / 2;
    const c = Math.floor(cx / T);
    const r = Math.floor((pod.y + pod.h / 2) / T);
    const tc = c + dx, tr = r + dy;
    const t = tileAt(tc, tr);
    if (!solid(t)) return;
    let hard = hardnessOf(t);
    if (t === ROCK && tier('drill').rock) hard = D.rockHardness; // Tourbillon Saphir & besser bohren Fels
    if (!isFinite(hard)) {
      if (drillWarnCooldown <= 0) {
        const rockDrill = D.upgrades.drill.find(d => d.rock);
        toast(t === ROCK ? `${who()}Fels! Zu hart – erst mit Bohrkopf «${rockDrill ? rockDrill.name : '?'}».` : 'Hier kann man nicht bohren.');
        drillWarnCooldown = 1.5;
      }
      return;
    }
    if (dy === 1 && Math.abs(cx - (c * T + T / 2)) > T * 0.45) return;
    // Wer direkt in eine vergrabene Bombe bohrt, zündet sie sofort
    const mine = mineAt(tc, tr);
    if (mine) {
      mine.owner = pod;
      toast(`${who()}Sie haben direkt in eine Bombe gebohrt: ${mine.def.name}! Das war … mutig.`);
      detonateMine(mine);
      return;
    }
    pod.drill = {
      tc, tr, t, dx, dy, progress: 0,
      duration: P.drillBaseTime * hard / stat('drill'),
      sx: pod.x, sy: pod.y,
      ex: tc * T + (T - pod.w) / 2,
      ey: tr * T + (T - pod.h),
    };
    pod.vx = 0; pod.vy = 0;
    if (dx) pod.facing = dx;
  }

  function updateDrill(dt) {
    const d = pod.drill;
    d.progress += dt / d.duration;
    burnFuel('drill', dt);
    const p = Math.min(1, d.progress);
    const e = p * p * (3 - 2 * p);
    pod.x = d.sx + (d.ex - d.sx) * e;
    pod.y = d.sy + (d.ey - d.sy) * e;

    if (Math.random() < 0.6) spawnParticle(d.tc * T + T / 2, d.tr * T + T / 2, isOre(d.t) ? oreOf(d.t).color : '#6b4a30');
    if (isOre(d.t) && Math.random() < 0.4) spawnParticle(d.tc * T + T / 2, d.tr * T + T / 2, '#f3e3b0');

    if (p >= 1) {
      setTile(d.tc, d.tr, EMPTY);
      if (d.t === ARTIFACT) uncoverArtifact(d.tc, d.tr);
      if (d.t === ICE) { // Gletschereis: kurz eingefroren
        pod.frozen = PH.ice.freeze; SFX.play('freeze');
        floatText(pod.x + pod.w / 2, pod.y - 12, 'EINGEFROREN!', '#bfe8ff');
        say('ice', pick(PH.ice.msg));
        for (let k = 0; k < 14; k++) spawnParticle(pod.x + pod.w / 2, pod.y + pod.h / 2, k % 2 ? '#d8f2ff' : '#ffffff', { size: 2 });
      }
      if (d.t === FAULT) startQuake(true);
      if (isOre(d.t)) {
        const ore = oreOf(d.t);
        if (pod.cargo.length < stat('cargo')) {
          pod.cargo.push(ore.id);
          floatText(pod.x + pod.w / 2, pod.y - 4, `+${fmt(ore.value)}`, ore.color);
          SFX.play('ore', { rank: oreRank(ore) });
          discoverOre(ore);
        } else {
          toast(`${who()}Tresor voll! Ab zur Bank.`); SFX.play('full', { gap: 800 });
        }
      }
      pod.drill = null;
      pod.onGround = true;
    }
  }

  function toastInfo(msg) { toast(msg, EMERALD); }
  // Treibstoff verbrauchen: Verbrauch pro Antrieb (L/s) × Umgebungsfaktor (Wasser, Treibsand …)
  function burnFuel(kind, dt, mul = 1) {
    const use = tier('engine').use || { idle: 0.08, move: 0.12, thrust: 0.3, drill: 0.32 };
    pod.fuel = Math.max(0, pod.fuel - use[kind] * mul * dt);
    const pct = pod.fuel / stat('tank');
    if (pct > 0.3) pod.fuelWarn = 0;
    if (pct <= 0.25 && (pod.fuelWarn || 0) < 1) { pod.fuelWarn = 1; toast(`${who()}Reserve! Nur noch ${pod.fuel.toFixed(1)} L ${tier('engine').fuel}. Zeit für die Tankstelle Royale.`); if (pod.fuel > 0) story('lowFuel'); }
    if (pct <= 0.1 && (pod.fuelWarn || 0) < 2) { pod.fuelWarn = 2; toast(`${who()}Letzte Tropfen! ${pod.fuel.toFixed(1)} L – sofort nach oben!`); SFX.play('arm'); }
  }
  // Räumlicher Sound: leiser mit Entfernung zum nächsten Pod, Stereo nach Bildschirmposition
  function sfxAt(name, x, y, o = {}) {
    const alive = players.filter(pl => pl.dead <= 0);
    if (!alive.length) return;
    let d = 1e9; for (const pl of alive) d = Math.min(d, Math.hypot(pl.x + pl.w / 2 - x, pl.y + pl.h / 2 - y));
    const range = (o.range || 16) * T;
    if (d > range) return;
    const v = Math.pow(1 - d / range, 1.3);
    const ref = alive[0], pan = (x - (ref.x + ref.w / 2)) / (T * 10) * 0.8;
    SFX.play(name, { ...o, v: (o.v ?? 1) * Math.max(0.08, v), pan });
  }
  // Rang eines Erzes in seiner Area (0 = häufig … 4 = legendär) – höherer Ton für seltene Funde
  const oreRank = ore => ore.lootOnly ? 4 : D.ores.filter(o => o.area === ore.area).indexOf(ore);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const sayCd = {};
  function say(key, msg, good = false, cd = 6) { // Meldung höchstens alle cd Sekunden pro Thema
    const k = key + '|' + (pod ? pod.idx : 0);
    if ((sayCd[k] || 0) > state.time) return;
    sayCd[k] = state.time + cd;
    toast(`${who()}${msg}`, good ? EMERALD : BORDEAUX);
  }

  // ---------- Cabinet d'Histoire Naturelle: entdeckte Erze ----------
  let discovered = [];
  const RARITY = s => s === undefined ? 'Trophäe der Tiefe' : s >= 0.4 ? 'häufig' : s >= 0.2 ? 'gelegentlich' : s >= 0.12 ? 'selten' : s >= 0.06 ? 'sehr selten' : 'legendär';
  function discoverOre(ore) {
    if (discovered.includes(ore.id)) return false;
    discovered.push(ore.id);
    state.museumOre = ore.id;
    const tagEl = document.getElementById('toast-tag');
    toastEl.style.setProperty('--tc', '#b8862a');
    tagEl.textContent = `NEUE ENTDECKUNG · ${discovered.length}/${D.ores.length} IM CABINET`;
    document.getElementById('toast-text').innerHTML = `<span class="disc"><img class="pxi big" src="${PIXEL.iconURL('ore_' + ore.id)}" alt="">
      <span><b>${who()}${ore.name}</b> · ${RARITY(ore.share)} · ${fmt(ore.value)}<br><i>«&nbsp;${ore.desc}&nbsp;»</i><br><small>Ab sofort im Musée ausgestellt.</small></span></span>`;
    toastEl.classList.add('show');
    toastTimer = 5;
    floatText(pod.x + pod.w / 2, pod.y - 22, 'NEU ENTDECKT!', '#ffd23f');
    SFX.play('discovery');
    story('firstOre');
    return true;
  }

  // ---------- Schwebende Texte (+CHF) ----------
  let floats = [];
  function floatText(x, y, text, color) { floats.push({ x, y, text, color, t: 0 }); }
  function updateFloats(dt) {
    for (const f of floats) { f.t += dt; f.y -= 38 * dt; }
    floats = floats.filter(f => f.t < 1.4);
  }
  function drawFloats(ox, oy) {
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, (1.4 - f.t) * 2);
      ptext(f.text, f.x - ox, f.y - oy - 10, f.color);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Partikel ----------
  function spawnParticle(x, y, color, o = {}) {
    const life = o.life ?? 0.5 + Math.random() * 0.3;
    particles.push({
      x, y, vx: o.vx ?? (Math.random() - 0.5) * 160, vy: o.vy ?? -Math.random() * 160,
      life, maxLife: life, color, g: o.g ?? 600, size: o.size ?? 4, grow: o.grow ?? 0, round: !!o.round,
    });
  }
  function updateParticles(dt) {
    for (const p of particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.size += p.grow * dt; }
    particles = particles.filter(p => p.life > 0);
  }

  // ---------- Würmer ----------
  let worms = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function wormPassable(e, c, r) {
    const minRow = SURF + Math.max(3, e.minDepth - 4);
    if (r < minRow || r >= H - 1 || c <= 0 || c >= W - 1) return false;
    const t = tileAt(c, r);
    return t === EMPTY || t === DIRT || (t === ROCK && e.digsRock);
  }

  function scaledEnemy(base, areaIdx) {
    const k = AREAS[areaIdx].enemyScale;
    const soft = 1 + (k - 1) * 0.5; // Tempo & Reichweite wachsen langsamer als HP und Schaden
    return {
      ...base,
      hp: base.hp * k, damage: Math.round(base.damage * k),
      speed: base.speed * soft, chaseSpeed: base.chaseSpeed * soft,
      aggroRange: base.aggroRange * soft,
      minDepth: Math.max(8, areaIdx * AREA_TILES - 6),
      area: areaIdx,
    };
  }

  function spawnWorms(rnd) {
    worms = [];
    AREAS.forEach((area, ai) => {
      const top = Math.max(8, ai * AREA_TILES), bottom = (ai + 1) * AREA_TILES - 2;
      for (const entry of area.enemies) {
        const base = D.enemies.find(en => en.id === entry.id);
        if (!base) continue;
        const e = scaledEnemy(base, ai);
        const n = Math.round((bottom - top) * entry.density);
        for (let k = 0; k < n; k++) {
          let c, r, ok = false;
          for (let tries = 0; tries < 60 && !ok; tries++) {
            c = 1 + Math.floor(rnd() * (W - 2));
            r = SURF + top + Math.floor(rnd() * (bottom - top));
            ok = wormPassable(e, c, r);
          }
          if (!ok) continue;
          const x = c * T + T / 2, y = r * T + T / 2;
          worms.push({
            e, x, y, angle: rnd() * Math.PI * 2, turn: 0, phase: rnd() * 10,
            chasing: false, retreat: 0, hp: e.hp, hurt: 0, enraged: 0,
            segs: Array.from({ length: e.segments }, () => ({ x, y })),
          });
        }
      }
    });
  }

  const segR = (w, i) => w.e.radius * (1 - (i + 1) / w.segs.length * 0.55);

  function updateWorms(dt) {
    let danger = 0;
    const alive = players.filter(pl => pl.dead <= 0);
    for (const w of worms) {
      const e = w.e;
      // nächster lebender Spieler ist das Ziel
      let dx = 1e9, dy = 1e9, dist = 1e9;
      for (const pl of alive) {
        const ddx = pl.x + pl.w / 2 - w.x, ddy = pl.y + pl.h / 2 - w.y, dd = Math.hypot(ddx, ddy);
        if (dd < dist) { dist = dd; dx = ddx; dy = ddy; }
      }
      // Köder in der Nähe? Dann ist der das Ziel
      for (const b of baits) {
        const bd = Math.hypot(b.x - w.x, b.y - w.y);
        if (bd < b.def.radius * T) { dx = b.x - w.x; dy = b.y - w.y; dist = Math.min(dist, bd); w.baited = true; w.enraged = 0.5; break; }
        w.baited = false;
      }
      if (!baits.length) w.baited = false;
      if (dist > T * 35) continue; // weit weg: schläft
      w.retreat -= dt; w.hurt -= dt; w.enraged -= dt;
      const range = e.aggroRange * T * (w.enraged > 0 ? 2.5 : 1);
      const wasChasing = w.chasing;
      w.chasing = w.retreat <= 0 && (dist < range || w.baited);
      // Stimmen: Kampfschrei beim Entdecken, Zuschnappen aus kurzer Distanz
      if (w.chasing && !wasChasing && !w.baited && dist < T * 9) story('firstWorm');
      if (w.chasing && !wasChasing && !w.baited && (w.voiceCd || 0) <= 0) { sfxAt('aggro', w.x, w.y, { kind: e.id, key: 'a' + worms.indexOf(w), gap: 300 }); w.voiceCd = 6; }
      w.voiceCd = (w.voiceCd || 0) - dt; w.lungeCd = (w.lungeCd || 0) - dt;
      if (w.chasing && dist < T * 2.6 && w.lungeCd <= 0) { sfxAt('lunge', w.x, w.y, { kind: e.id, gap: 250 }); w.lungeCd = 1.6 + Math.random(); }
      if (w.chasing && !w.baited) danger = Math.max(danger, 1 - dist / (e.aggroRange * T));

      // Zielrichtung: Jagd oder Herumschlängeln
      let target;
      if (w.chasing) target = Math.atan2(dy, dx);
      else {
        w.turn = clamp(w.turn + (Math.random() - 0.5) * 5 * dt, -1, 1);
        target = w.angle + w.turn;
      }
      const diff = Math.atan2(Math.sin(target - w.angle), Math.cos(target - w.angle));
      w.angle += clamp(diff, -e.turnRate * dt, e.turnRate * dt);

      // Hindernis voraus? -> neue Richtung suchen
      const look = e.radius + 8;
      const ax = w.x + Math.cos(w.angle) * look, ay = w.y + Math.sin(w.angle) * look;
      if (!wormPassable(e, Math.floor(ax / T), Math.floor(ay / T))) {
        let best = null;
        for (let i = 0; i < 10 && best === null; i++) {
          const a = w.angle + (Math.random() - 0.5) * Math.PI * (i < 6 ? 1.4 : 2);
          const bx = w.x + Math.cos(a) * look, by = w.y + Math.sin(a) * look;
          if (wormPassable(e, Math.floor(bx / T), Math.floor(by / T))) best = a;
        }
        w.angle = best !== null ? best : w.angle + Math.PI;
        w.turn = 0;
        continue;
      }

      const speed = w.chasing ? e.chaseSpeed : e.speed;
      w.x += Math.cos(w.angle) * speed * dt;
      w.y += Math.sin(w.angle) * speed * dt;
      w.phase += dt * (w.chasing ? 12 : 5);

      // Tunnel graben
      const c = Math.floor(w.x / T), r = Math.floor(w.y / T);
      const t = tileAt(c, r);
      if (t === DIRT || (t === ROCK && e.digsRock)) {
        setTile(c, r, EMPTY);
        if (dist < T * 9) sfxAt('burrow', w.x, w.y, { range: 9, v: 0.8, gap: 380 });   // es gräbt sich heran …
        if (dist < T * 16) for (let k = 0; k < 4; k++) spawnParticle(w.x, w.y, t === ROCK ? '#2a2830' : '#4a3020');
      }

      // Körper zieht nach
      const sp = e.radius * 0.85;
      let px = w.x, py = w.y;
      for (const sg of w.segs) {
        const ddx = sg.x - px, ddy = sg.y - py;
        const d = Math.hypot(ddx, ddy) || 1;
        if (d > sp) { sg.x = px + ddx / d * sp; sg.y = py + ddy / d * sp; }
        px = sg.x; py = sg.y;
      }
    }
    state.danger += (danger - state.danger) * Math.min(1, dt * 4);
  }

  // Angriff (Bohrer in Körper/Schwanz) und Kopfkontakt – für den aktuellen Spieler
  function wormInteract(dt) {
    const pcx = pod.x + pod.w / 2, pcy = pod.y + pod.h / 2;
    pod.attack = null;
    let dir = null;
    if (pod.drill) dir = { x: pod.drill.dx, y: pod.drill.dy };
    else if (pod.keys.down) dir = { x: 0, y: 1 };
    else if (pod.keys.left) dir = { x: -1, y: 0 };
    else if (pod.keys.right) dir = { x: 1, y: 0 };
    if (dir) {
      const tx = pcx + dir.x * (pod.w / 2 + 7), ty = pcy + dir.y * (pod.h / 2 + 7);
      for (const w of worms) {
        if (Math.abs(w.x - pcx) > T * 14 || Math.abs(w.y - pcy) > T * 14) continue;
        const hitSeg = w.segs.find((sg, i) => Math.hypot(sg.x - tx, sg.y - ty) < segR(w, i) + 6);
        if (hitSeg) {
          pod.attack = dir;
          // Der Wurmkörper bremst den Pod: man bohrt sich hinein statt hindurchzufahren
          if (!pod.drill) {
            if (dir.x) { pod.x = pod.prevX; pod.vx = 0; }
            if (dir.y > 0 && pod.vy >= 0) { pod.y = pod.prevY; pod.vy = 0; pod.onGround = true; }
          }
          w.hp -= D.drillDamage * stat('drill') * (tier('drill').wormDamage ?? 1) * dt;
          w.hurt = 0.12; w.enraged = 4; SFX.play('squish', { gap: 140 }); sfxAt('whurt', hitSeg.x, hitSeg.y, { kind: w.e.id, gap: 420 });
          if (Math.random() < 0.7) spawnParticle(hitSeg.x, hitSeg.y, Math.random() < 0.5 ? '#5c0a14' : '#9c2a3a');
          burnFuel('drill', dt);
          if (w.hp <= 0) killWorm(w);
          break;
        }
      }
    }

    // Kontakt mit dem Kopf tut weh
    if (pod.hitCooldown > 0) return;
    for (const w of worms) {
      if (Math.abs(w.x - pcx) > T * 14 || Math.abs(w.y - pcy) > T * 14) continue;
      const r = w.e.radius;
      const p = { x: w.x + Math.cos(w.angle) * r * 0.4, y: w.y + Math.sin(w.angle) * r * 0.4, r: r * 1.15 };
      const nx = clamp(p.x, pod.x, pod.x + pod.w), ny = clamp(p.y, pod.y, pod.y + pod.h);
      if ((p.x - nx) ** 2 + (p.y - ny) ** 2 < p.r ** 2) { wormHit(w, p); return; }
    }
  }

  function killWorm(w) {
    worms.splice(worms.indexOf(w), 1);
    sfxAt('wdie', w.x, w.y, { kind: w.e.id, range: 20, gap: 60 }); SFX.play('squish');
    state.shake = Math.max(state.shake, 0.3);
    const parts = [w, ...w.segs];
    for (const sg of parts) {
      for (let k = 0; k < 4; k++) spawnParticle(sg.x, sg.y, k % 2 ? w.e.color : '#7a1426');
    }
    const ore = D.ores.find(o => o.id === w.e.loot.ore);
    for (let k = 0; k < w.e.loot.count; k++) {
      const sg = parts[Math.floor(k * parts.length / w.e.loot.count)];
      pickups.push({ x: sg.x, y: sg.y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60, ore, t: Math.random() * 6 });
    }
    toast(multi() ? `${pod.name} erlegt ${w.e.name}! Beute einsammeln.` : `${w.e.name} erlegt! Beute einsammeln.`, EMERALD);
  }

  // ===================================================================
  //  ARTEFAKTE
  // ===================================================================
  const AR = D.artifactRules;
  let relics = [];     // freigelegte Artefakte in der Welt {def, x, y, vy, state:'loose'|'towed', owner, cooldown}
  let delivered = [];  // im Museum ausgestellte Artefakte (Definitionen)
  const RELIC_R = 13;

  function uncoverArtifact(c, r) {
    const def = artifactAt.get(r * W + c);
    if (!def) return;
    artifactAt.delete(r * W + c);
    relics.push({ def, x: c * T + T / 2, y: r * T + T / 2, vy: 0, state: 'loose', owner: null, cooldown: 0, t: 0 });
    state.shake = Math.max(state.shake, 0.2);
    for (let k = 0; k < 16; k++) spawnParticle(c * T + T / 2, r * T + T / 2, k % 2 ? '#ffd23f' : '#fff6dc');
    toast(`${who()}Artefakt freigelegt: ${def.name}! Berühren zum Anseilen.`, EMERALD); SFX.play('artifact');
    story('firstArtifact');
  }

  // Spur des Pods – das Artefakt folgt am Seil genau dem Weg, den der Pod gefahren ist
  function updateTow() {
    const cx = pod.x + pod.w / 2, cy = pod.y + pod.h / 2;
    const last = pod.trail[pod.trail.length - 1];
    if (!last || Math.hypot(cx - last.x, cy - last.y) > 3) {
      pod.trail.push({ x: cx, y: cy });
      if (pod.trail.length > 120) pod.trail.shift();
    }
  }

  function trailPoint(pl, dist) {
    let px = pl.x + pl.w / 2, py = pl.y + pl.h / 2, left = dist;
    for (let i = pl.trail.length - 1; i >= 0; i--) {
      const p = pl.trail[i], seg = Math.hypot(px - p.x, py - p.y);
      if (seg >= left) { const k = left / seg; return { x: px + (p.x - px) * k, y: py + (p.y - py) * k }; }
      left -= seg; px = p.x; py = p.y;
    }
    return { x: px, y: py };
  }

  function updateRelics(dt) {
    for (const rel of relics) {
      rel.t += dt;
      rel.cooldown -= dt;
      if (rel.state === 'towed') {
        const pl = rel.owner;
        const target = trailPoint(pl, AR.ropeLength);
        rel.x += (target.x - rel.x) * Math.min(1, dt * 10);
        rel.y += (target.y - rel.y) * Math.min(1, dt * 10);
        continue;
      }
      // lose: fällt, bis es auf etwas liegt
      rel.vy = Math.min(500, rel.vy + P.gravity * dt);
      const ny = rel.y + rel.vy * dt;
      const below = Math.floor((ny + RELIC_R) / T), col = Math.floor(rel.x / T);
      if (solid(tileAt(col, below)) && Math.floor(rel.y / T) < below) { rel.y = below * T - RELIC_R; rel.vy = 0; }
      else if (solid(tileAt(col, Math.floor(rel.y / T)))) { rel.vy = 0; }
      else rel.y = ny;
      // anseilen bei Berührung
      if (rel.cooldown > 0) continue;
      for (const pl of players) {
        if (pl.dead > 0 || pl.towing) continue;
        if (Math.hypot(pl.x + pl.w / 2 - rel.x, pl.y + pl.h / 2 - rel.y) < 26) {
          pod = pl;
          rel.state = 'towed'; rel.owner = pl; pl.towing = rel;
          pl.trail = [{ x: rel.x, y: rel.y }];
          toast(`${who()}${rel.def.name} hängt am Seil. Ab ins Musée – und bloss keinen Schaden nehmen!`, EMERALD);
          break;
        }
      }
    }
  }

  function dropTow() {
    const rel = pod.towing;
    if (!rel) return;
    rel.state = 'loose'; rel.owner = null; rel.vy = 0; rel.cooldown = AR.reattachDelay;
    pod.towing = null;
    const m = Math.max(0, Math.floor(rel.y / T) - SURF) * D.world.metersPerTile;
    toast(`${who()}Seil gerissen! ${rel.def.name} liegt jetzt bei ${m} m.`); SFX.play('snap');
    floatText(rel.x, rel.y - 18, 'Seil gerissen!', '#ff8a8a');
  }

  function deliverTow() {
    const rel = pod.towing;
    if (!rel) return false;
    relics.splice(relics.indexOf(rel), 1);
    pod.towing = null;
    delivered.push(rel.def);
    pod.artifacts.push(rel.def.id);
    SFX.play('deliver');
    pod.money += rel.def.value;
    state.heartBurst = 0;
    toast(`${who()}${rel.def.name} ausgestellt! Finderlohn ${fmt(rel.def.value)}.`, EMERALD);
    return true;
  }

  // Artefakt sichtbar im Erdreich – Pixel-Icon direkt im Boden
  function drawArtifactInGround(c, r, x, y) {
    const def = artifactAt.get(r * W + c);
    if (def) blit(PIXEL.icon(def.id), x, y);
  }

  function drawArtifacts(ox, oy) {
    for (const rel of relics) {
      const x = rel.x - ox, y = rel.y - oy;
      if (rel.state === 'towed') { // Seil aus Pixeln
        const pl = rel.owner;
        const hx = pl.x + pl.w / 2 - ox - pl.facing * 8, hy = pl.y + pl.h - 6 - oy;
        const mx = (hx + x) / 2, my = (hy + y) / 2 + 10;
        const n = Math.max(6, Math.round(Math.hypot(x - hx, y - hy) / PXS));
        for (let k = 0; k <= n; k++) {
          const t = k / n, u = 1 - t;
          const px = u * u * hx + 2 * u * t * mx + t * t * x, py = u * u * hy + 2 * u * t * my + t * t * (y - 14);
          pxRect(px - PXS / 2, py, 1, 1, '#3b2412'); pxRect(px - PXS / 2, py - PXS / 2, 1, 1, k % 2 ? '#a0703a' : '#6b3d1e');
        }
      }
      const bob = rel.state === 'towed' ? Math.round(Math.sin(rel.t * 3)) * PXS : 0;
      blitC(PIXEL.icon(rel.def.id), x, y + bob);
      if (rel.state === 'loose' && rel.cooldown <= 0 && Math.sin(rel.t * 3) > 0) ptext('ANSEILEN', x, y - 30, '#ffd23f', 'center', true);
    }
  }

  // Museum: wächst mit jedem ausgestellten Artefakt (Vitrinen mit Pixel-Icons)
  function drawMuseum(s, ox, oy) {
    const img = PIXEL.museum(s, delivered.map(d => d.id), discovered);
    const x = s.x * T - ox - 8 * PXS, y = SURF * T - oy - img.height;
    blit(img, x, y);
    signAbove(`COUTURE ${delivered.length}/${D.artifacts.length} · ERZE ${discovered.length}/${D.ores.length}`, s.color, s.x * T - ox + s.w * T / 2, y);
  }

  // ===================================================================
  //  GADGETS
  // ===================================================================
  let bombs = [];  // {def, x, y, vy, fuse, owner}
  let baits = [];  // {def, x, y, vy, t}

  function gadgetShopHtml() {
    let h = `<div class="gadget-title">GADGETS <span class="muted">· Tasten 1–${D.gadgets.length} · kein Limit · erbeutete Bomben: Taste 0, Tab wechselt</span></div><table class="gadget-table">`;
    D.gadgets.forEach((g, i) => {
      const have = pod.gadgets[g.id] || 0;
      h += `<tr><td class="g-key"><kbd>${i + 1}</kbd></td><td class="g-icon"><img class="pxi" src="${PIXEL.iconURL(g.id)}" alt=""></td>
        <td><b>${g.name}</b> <span class="muted">· Besitz: ${have}</span><br><span style="font-size:12px" class="muted">${g.desc}${g.uses > 1 ? ` (${g.uses} Nutzungen pro Kauf)` : ''}</span></td>
        <td class="num"><button data-act="buygadget" data-cat="${g.id}" ${pod.money < g.price ? 'disabled' : ''}>${fmt(g.price)}</button></td></tr>`;
    });
    return h + '</table>';
  }

  function useGadget(pl, idx) {
    const g = D.gadgets[idx];
    if (!g || pl.dead > 0) return;
    pod = pl;
    if ((pl.gadgets[g.id] || 0) <= 0) { toast(`${who()}Kein ${g.name.split(' «')[0]} mehr – im Atelier Privé nachkaufen.`); SFX.play('denied'); return; }
    const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
    let used = true;
    switch (g.type) {
      case 'bomb':
        bombs.push({ def: g, x: cx, y: cy, vy: 0, fuse: g.fuse, owner: pl });
        attachToChandelier(bombs[bombs.length - 1], pl);
        floatText(cx, cy - 24, 'Zündschnur brennt!', '#ffb347'); SFX.play('fuse');
        break;
      case 'fuel':
        if (pl.fuel >= stat('tank') - 0.1) { toast(`${who()}Der Tank ist schon voll.`); used = false; break; }
        pl.fuel = Math.min(stat('tank'), pl.fuel + g.amount);
        floatText(cx, cy - 24, `+${g.amount} L`, '#ffd23f'); SFX.play('fuel');
        break;
      case 'repair':
        if (pl.hull >= stat('hull') - 0.5) { toast(`${who()}Die Hülle ist bereits makellos.`); used = false; break; }
        pl.hull = Math.min(stat('hull'), pl.hull + g.amount);
        pl.lastHull = pl.hull;
        floatText(cx, cy - 24, `+${g.amount} HP`, '#7dff9a'); SFX.play('repair');
        break;
      case 'shield':
        pl.shield = g.duration;
        floatText(cx, cy - 24, 'Parasol Doré!', '#ffd23f'); SFX.play('shield');
        break;
      case 'bait':
        baits.push({ def: g, x: cx, y: cy, vy: 0, t: g.duration });
        floatText(cx, cy - 24, 'Mmh, Foie Gras…', '#ffb3c1'); SFX.play('bait');
        break;
      case 'torch':
        pl.torch = g.duration;
        floatText(cx, cy - 24, 'Es werde Licht!', '#fff1b0'); SFX.play('torch');
        break;
      case 'defuse': { // Entschärfer: nächste Bombe in Reichweite (max. 1 Tile Abstand)
        if (pl.defusing) { used = false; break; }
        let best = null, bd = Infinity;
        for (const m of mines) { const d = Math.hypot(m.x - cx, m.y - cy); if (!m.gone && d < bd) { bd = d; best = m; } }
        if (!best || bd > g.reach * T + 16) { toast(`${who()}Hier tickt nichts in Reichweite. Der Entschärfer bleibt im Etui.`); used = false; break; }
        pl.defusing = { m: best, t: g.duration, g };
        best.defusing = true;
        floatText(best.x, best.y - 30, 'Rot oder Blau …?', '#ffd23f'); SFX.play('snip');
        break;
      }
      case 'teleport': {
        SFX.play('teleport');
        if (pl.towing) dropTow();
        for (let k = 0; k < 30; k++) spawnParticle(cx, cy, k % 2 ? '#c9a0ff' : '#ffffff', { g: -100, size: 3 });
        const fuelSt = D.stations.find(st => st.id === 'fuel');
        const col = fuelSt ? fuelSt.x + 1 + pl.idx : pl.spawn;
        pl.x = col * T + (T - pl.w) / 2; pl.y = SURF * T - pl.h; pl.vx = pl.vy = 0; pl.drill = null; pl.trail = [];
        for (let k = 0; k < 30; k++) spawnParticle(pl.x + pl.w / 2, pl.y + pl.h / 2, k % 2 ? '#c9a0ff' : '#ffffff', { g: -100, size: 3 });
        floatText(pl.x + pl.w / 2, pl.y - 24, 'Retour au Château!', '#c9a0ff');
        break;
      }
    }
    if (used) pl.gadgets[g.id]--;
  }

  // Erbeutete Bomben: Taste 0 legt die gewählte Bombe, Tab wechselt die Sorte
  function capturedList(pl) { return D.mines.filter(m => (pl.captured[m.id] || 0) > 0); }
  function placeCaptured(pl) {
    if (!pl || pl.dead > 0) return;
    pod = pl;
    let id = pl.capSel;
    if (!id || !(pl.captured[id] > 0)) { const l = capturedList(pl); id = l.length ? l[l.length - 1].id : null; }
    if (!id) { toast(`${who()}Keine erbeutete Bombe im Inventar. Erst eine mit dem Entschärfer einsammeln.`); return; }
    const md = D.mines.find(m => m.id === id), cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
    bombs.push({ def: { id: 'mine_' + md.id, name: md.name, radius: md.radius, wormDamage: md.wormDamage, selfDamage: md.damage, flash: md.flash }, x: cx, y: cy, vy: 0, fuse: md.fuse, owner: pl });
    attachToChandelier(bombs[bombs.length - 1], pl);
    pl.captured[id]--;
    floatText(cx, cy - 24, `${md.name.split(' «')[0]} scharf!`, '#ff9a3a'); SFX.play('fuse'); SFX.play('arm');
    if (md.radius >= 4) toast(`${who()}${md.name} gelegt. ${md.fuse} s – Laufen Sie. Elegant, aber schnell.`);
    if (!(pl.captured[id] > 0)) { const l = capturedList(pl); pl.capSel = l.length ? l[l.length - 1].id : null; }
  }
  function cycleCaptured(pl) {
    if (!pl) return;
    const l = capturedList(pl);
    if (!l.length) { pod = pl; toast(`${who()}Ihr Bomben-Inventar ist leer.`); return; }
    const i = l.findIndex(m => m.id === pl.capSel);
    pl.capSel = l[(i + 1) % l.length].id;
  }
  function updateDefusing(dt) {
    for (const pl of players) {
      const d = pl.defusing;
      if (!d) continue;
      if (d.m.gone || pl.dead > 0) { pl.defusing = null; continue; }
      d.t -= dt;
      if (Math.random() < 0.3) spawnParticle(d.m.x + (Math.random() - 0.5) * 10, d.m.y - 6, Math.random() < 0.5 ? '#ffd23f' : '#ffffff', { size: 2, vy: -40 });
      if (d.t <= 0) {
        const m = d.m;
        m.gone = true; pl.defusing = null;
        pl.captured[m.def.id] = (pl.captured[m.def.id] || 0) + 1;
        pl.capSel = m.def.id;
        pod = pl;
        toastInfo(`${who()}${m.def.name}: ${pick(d.g.msg)} Taste 0 legt sie wieder ab.`);
        floatText(m.x, m.y - 26, 'ENTSCHÄRFT!', '#7dff6a'); SFX.play('defuse');
        if (solid(tileAt(m.c, Math.floor(m.y / T))) === false) for (let k = 0; k < 8; k++) spawnParticle(m.x, m.y, '#cfc6b4', { size: 2 });
      }
    }
  }

  // einfache Schwerkraft für abgelegte Dinge (Bombe, Köder)
  function fallBody(o, dt, r) {
    o.vy = Math.min(500, o.vy + P.gravity * dt);
    const ny = o.y + o.vy * dt;
    const below = Math.floor((ny + r) / T), col = Math.floor(o.x / T);
    if (solid(tileAt(col, below)) && Math.floor(o.y / T) < below) { o.y = below * T - r; o.vy = 0; }
    else if (solid(tileAt(col, Math.floor(o.y / T)))) o.vy = 0;
    else o.y = ny;
  }

  function updateBombs(dt) {
    for (const b of bombs) {
      if (b.stuck) { b.x = b.stuck.x + b.ox; b.y = b.stuck.y + b.oy; }
      else fallBody(b, dt, 10);
      b.fuse -= dt;
      if (Math.random() < 0.5) spawnParticle(b.x + 4, b.y - 12, Math.random() < 0.5 ? '#ffd36e' : '#ff7a1a', { vy: -60, g: 100, size: 2, life: 0.3 });
      if (b.fuse <= 0) explode(b);
    }
    bombs = bombs.filter(b => b.fuse > 0);
  }

  function explode(b) {
    const g = b.def, c0 = Math.floor(b.x / T), r0 = Math.floor(b.y / T), R = g.radius;
    // Tiles sprengen – Erz fällt als Beute heraus, Artefakte werden freigelegt
    for (let r = r0 - R; r <= r0 + R; r++) for (let c = c0 - R; c <= c0 + R; c++) {
      if (c <= 0 || c >= W - 1 || r < SURF || r >= H - 1) continue;
      const t = tileAt(c, r);
      if (t === EMPTY || t === BEDROCK || t === CONCRETE) continue;
      setTile(c, r, EMPTY);
      if (isOre(t)) pickups.push({ x: c * T + T / 2, y: r * T + T / 2, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 80, ore: oreOf(t), t: Math.random() * 6 });
      if (t === ARTIFACT) { pod = b.owner; uncoverArtifact(c, r); }
      for (let k = 0; k < 3; k++) spawnParticle(c * T + T / 2, r * T + T / 2, t === ROCK ? '#2a2830' : '#6b4a30', { size: 4 });
    }
    const blast = (R + 1.2) * T;
    // Vergrabene Bomben im Wirkungskreis: eigene Sprengladung entschärft sie, eine Bombe reisst die nächste mit
    for (const m of mines) {
      if (m.gone || Math.hypot(m.x - b.x, m.y - b.y) > blast) continue;
      if (b.mine) { if (!m.armed) { m.armed = true; m.fuse = 0.35; } else m.fuse = Math.min(m.fuse, 0.35); }
      else {
        m.gone = true;
        const pl = b.owner || players[0];
        pl.money += m.def.bounty;
        pod = pl; toastInfo(`${who()}${m.def.name} kontrolliert gesprengt! Prämie vom Kampfmittelräumdienst: +${fmt(m.def.bounty)}`);
        floatText(m.x, m.y - 24, `ENTSCHÄRFT +${fmt(m.def.bounty)}`, '#7dff6a');
      }
    }
    // Kronleuchter: Kette im Sprengradius → fällt
    for (const ch of chandeliers) {
      if (ch.state !== 'hang') continue;
      const ceil = (LAIR_TOP + 2) * T, cy = Math.max(ceil, Math.min(ch.y, b.y));   // nächster Punkt auf Kette + Leuchter
      if (Math.hypot(ch.x - b.x, cy - b.y) < blast) dropChandelier(ch, b.owner);
    }
    // Endboss
    if (boss && boss.active && !boss.dead && Math.hypot(boss.x - b.x, boss.y - b.y) < blast + 50) {
      const dmg = Math.round(g.wormDamage * BOSS.explosionFactor);
      hurtBoss(dmg, b.owner); floatText(boss.x, boss.y - 80, `−${dmg}`, '#ffd23f'); SFX.play('bosshurt', { gap: 200 });
    }
    // Würmer
    for (const w of [...worms]) {
      const parts = [w, ...w.segs];
      if (parts.some(p => Math.hypot(p.x - b.x, p.y - b.y) < blast)) {
        w.hp -= g.wormDamage; w.hurt = 0.4; w.retreat = 1.2;
        sfxAt('whurt', w.x, w.y, { kind: w.e.id, gap: 120 });
        floatText(w.x, w.y - 20, `−${g.wormDamage}`, '#ffd23f');
        if (w.hp <= 0) { pod = b.owner; killWorm(w); }
      }
    }
    // Spieler in der Nähe (Schaden – Seil reisst dann automatisch)
    let hurtAny = false;
    for (const pl of players) {
      if (pl.dead > 0 || pl.shield > 0) continue;
      const dist = Math.hypot(pl.x + pl.w / 2 - b.x, pl.y + pl.h / 2 - b.y);
      if (dist < blast) {
        const dmg = Math.round(g.selfDamage * (b.mine ? 1 - 0.5 * dist / blast : 1));
        pl.hull -= dmg; pl.hitCooldown = 0.6; hurtAny = true;
        pl.koReason = b.mine ? `Pulverisiert: ${b.mine.name}!` : 'Von der eigenen Sprengladung erwischt!'; pl.koTimer = 0.6;
        pod = pl; toast(b.mine ? `${who()}${b.mine.boom} −${dmg} HP` : `${who()}Zu nah an der Explosion! −${dmg} HP`);
      }
    }
    if (b.mine && !hurtAny) toastInfo(`Knapp entkommen! ${b.mine.boom}`);
    if (g.flash) state.flash = Math.max(state.flash, g.flash);
    // Effekte
    state.shake = Math.max(state.shake, 0.35 + R * 0.15);
    for (let k = 0; k < 50 + R * 30; k++) {
      const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 260 * (R + 1) / 2;
      spawnParticle(b.x, b.y, ['#fff1b0', '#ffb347', '#ff5a1a', '#5a5a5a'][k % 4], { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 200, size: 3 + Math.random() * 3, life: 0.5 + Math.random() * 0.4 });
    }
    for (let k = 0; k < 10; k++) spawnParticle(b.x, b.y, '#4a4a4a', { vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 40, g: -20, size: 8, grow: 20, round: true, life: 1.2 });
    floatText(b.x, b.y - 10, R >= 4 ? 'KA-BOUM!!!' : R > 1 ? 'BOUM!!' : 'BOUM!', '#ffb347');
    SFX.play('boom', { radius: R, gap: 20 });
  }

  function updateBaits(dt) {
    for (const b of baits) { fallBody(b, dt, 10); b.t -= dt; }
    baits = baits.filter(b => b.t > 0);
  }

  function drawBombs(ox, oy) {
    for (const b of bombs) {
      const x = b.x - ox, y = b.y - oy;
      const flash = b.fuse < 1 && Math.floor(b.fuse * 10) % 2 === 0;
      blitC(PIXEL.icon(b.def.id), x, y);
      if (flash) { ctx.globalAlpha = 0.6; pxRect(x - 8 * PXS, y - 8 * PXS, 16, 16, '#ffffff'); ctx.globalAlpha = 1; }
      ptext(Math.max(0, b.fuse).toFixed(1), x, y - 30, flash ? '#ff5a1a' : '#ffd23f', 'center', true);
    }
  }

  function drawBaits(ox, oy) {
    for (const b of baits) {
      const x = b.x - ox, y = b.y - oy;
      for (let k = 0; k < 3; k++) { // Duftringe aus Pixeln
        const rr = 14 + ((state.time * 30 + k * 14) % 42);
        for (let q = 0; q < 20; q++) { const a = q / 20 * Math.PI * 2; if ((q + k) % 2) pxRect(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1, 1, '#ffb3c1'); }
      }
      blitC(PIXEL.icon('koeder'), x, y);
    }
  }

  function drawShield(x, y) {
    if (pod.shield < 2 && Math.floor(pod.shield * 8) % 2 === 0) return;
    const cx = x + pod.w / 2, cy = y + pod.h / 2;
    blitC(PIXEL.shieldDome(), cx, cy);
    blitC(PIXEL.icon('schirm'), cx, y - 26);
  }

  // Fackel: Pixel-Pfeil zum nächsten Artefakt
  function drawTorchArrows(ox, oy) {
    for (const pl of players) {
      if (pl.torch <= 0 || pl.dead > 0) continue;
      const px = pl.x + pl.w / 2, py = pl.y + pl.h / 2;
      let best = null, bd = Infinity;
      for (const i of artifactAt.keys()) {
        const x = (i % W) * T + T / 2, y = Math.floor(i / W) * T + T / 2, d = Math.hypot(x - px, y - py);
        if (d < bd) { bd = d; best = { x, y }; }
      }
      for (const r of relics) if (r.state === 'loose') { const d = Math.hypot(r.x - px, r.y - py); if (d < bd) { bd = d; best = r; } }
      if (!best) continue;
      const a = Math.atan2(best.y - py, best.x - px), cx = px - ox + Math.cos(a) * 40, cy = py - oy + Math.sin(a) * 40;
      for (let k = -4; k <= 4; k++) pxRect(cx + Math.cos(a) * k * PXS - PXS / 2, cy + Math.sin(a) * k * PXS - PXS / 2, 1, 1, '#ffd23f');
      for (let k = 1; k <= 4; k++) for (const sd of [-1, 1]) {
        const aa = a + sd * 2.4;
        pxRect(cx + Math.cos(a) * 4 * PXS + Math.cos(aa) * k * PXS - PXS / 2, cy + Math.sin(a) * 4 * PXS + Math.sin(aa) * k * PXS - PXS / 2, 1, 1, '#ffd23f');
      }
      ptext(`${Math.round(bd / T * D.world.metersPerTile)} M`, cx, cy + 14, '#ffd23f', 'center', true);
    }
  }

  // ---------- Trophäen zum Einsammeln ----------
  let pickups = [];
  let fullWarn = 0;
  function updatePickups(dt) {
    fullWarn -= dt;
    for (const p of pickups) {
      p.t += dt;
      p.vy = Math.min(500, p.vy + P.gravity * 0.8 * dt);
      const nx = p.x + p.vx * dt;
      if (solid(tileAt(Math.floor((nx + Math.sign(p.vx) * 6) / T), Math.floor(p.y / T)))) p.vx *= -0.3; else p.x = nx;
      const ny = p.y + p.vy * dt;
      if (p.vy < 0 && solid(tileAt(Math.floor(p.x / T), Math.floor((ny - 6) / T)))) {
        p.vy = 0;
      } else if (solid(tileAt(Math.floor(p.x / T), Math.floor((ny + 6) / T)))) {
        p.y = Math.floor((ny + 6) / T) * T - 6; p.vy = 0; p.vx *= 0.85;
      } else p.y = ny;
      for (const pl of players) {
        if (p.taken || pl.dead > 0) continue;
        if (Math.hypot(p.x - pl.x - pl.w / 2, p.y - pl.y - pl.h / 2) < 22) {
          pod = pl;
          if (pod.cargo.length < stat('cargo')) {
            pod.cargo.push(p.ore.id);
            p.taken = true;
            SFX.play('rare');
            if (!discoverOre(p.ore)) toastInfo(`${who()}Trophäe ${p.ore.name}`);
            floatText(p.x, p.y - 16, `+${fmt(p.ore.value)}`, p.ore.color);
          } else if (fullWarn <= 0) {
            toast(`${who()}Tresor voll! Die Trophäe wartet hier.`); SFX.play('full', { gap: 800 });
            fullWarn = 2;
          }
        }
      }
    }
    pickups = pickups.filter(p => !p.taken);
  }

  function drawPickups(ox, oy) {
    for (const p of pickups) {
      const x = p.x - ox, y = p.y - oy - 2 + Math.round(Math.sin(p.t * 3)) * PXS;
      blitC(PIXEL.crystal(p.ore.color, p.ore.form), x, y);
      if (Math.sin(p.t * 4) > 0.6) { sparkle(x - 7, y - 8, 2); sparkle(x + 7, y - 4, 1); }
    }
  }

  // Lebensbalken verletzter Würmer
  function drawWormHp(ox, oy) {
    for (const w of worms) {
      if (w.hp >= w.e.hp) continue;
      const x = w.x - ox, y = w.y - oy - w.e.radius - 14, bw = 34;
      ctx.fillStyle = 'rgba(11,11,13,.85)';
      ctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, 5);
      ctx.fillStyle = '#c9a961';
      ctx.fillRect(x - bw / 2, y, bw * Math.max(0, w.hp / w.e.hp), 3);
    }
  }

  function wormHit(w, p) {
    if (pod.shield > 0) { // Parasol Doré: Wurm prallt ab
      w.retreat = 1.5; w.angle += Math.PI; pod.hitCooldown = 0.4;
      floatText(w.x, w.y - 18, 'abgeprallt!', '#ffd23f'); SFX.play('clink', { gap: 200 }); sfxAt('whurt', w.x, w.y, { kind: w.e.id, gap: 400 });
      return;
    }
    const hullT = tier('hull');
    const dmg = Math.max(1, Math.round(w.e.damage * (hullT.biteFactor ?? 1)));
    if (hullT.thorns) { // Zinnen der Forteresse verletzen den Wurmkopf
      w.hp -= hullT.thorns; w.hurt = 0.3; w.enraged = 4; sfxAt('whurt', w.x, w.y, { kind: w.e.id, gap: 200 });
      floatText(w.x, w.y - 20, `−${hullT.thorns}`, '#ffd23f');
      if (w.hp <= 0) { killWorm(w); }
    }
    pod.hull -= dmg;
    pod.hitCooldown = D.enemyHitCooldown;
    state.shake = 0.4;
    pod.lastHitBy = w.e.name;
    w.retreat = 1.5;
    w.angle += Math.PI;
    toast(`${who()}${w.e.name} beisst zu! −${dmg} HP`); SFX.play('bite'); sfxAt('lunge', w.x, w.y, { kind: w.e.id, gap: 200 });
    for (let k = 0; k < 10; k++) spawnParticle(pod.x + pod.w / 2, pod.y + pod.h / 2, k % 2 ? '#c9a961' : '#6e1423');
    if (!pod.drill) {
      const a = Math.atan2(pod.y + pod.h / 2 - p.y, pod.x + pod.w / 2 - p.x);
      pod.vx = Math.cos(a) * 260;
      pod.vy = Math.sin(a) * 260 - 120;
      pod.onGround = false;
    }
  }

  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function wormVisible(w, ox, oy, vw, vh) {
    const m = 40 + w.segs.length * w.e.radius;
    return w.x - ox > -m && w.x - ox < vw + m && w.y - oy > -m && w.y - oy < vh + m;
  }

  function drawWorms(ox, oy, vw, vh) {
    for (const w of worms) {
      if (!wormVisible(w, ox, oy, vw, vh)) continue;
      const pal = PIXEL.wormRamp(w.e, w.hurt > 0);
      for (let i = w.segs.length - 1; i >= 0; i--) {
        const sg = w.segs[i], prev = i === 0 ? w : w.segs[i - 1];
        const r = segR(w, i) * (1 + 0.08 * Math.sin(w.phase - i * 0.8));
        const x = sg.x - ox, y = sg.y - oy;
        if (i % 2 === 0) { // Knochenstacheln
          const a = Math.atan2(prev.y - sg.y, prev.x - sg.x);
          for (const side of [-1, 1]) {
            const na = a + side * Math.PI / 2;
            for (let k = 0; k < 5; k++) {
              const d = r * 0.85 + k * 1.6, aa = na - side * 0.1 * k, sz = k < 2 ? 2 : 1;
              ctx.fillStyle = k === 4 ? PIXEL.BONE[3] : k >= 2 ? PIXEL.BONE[2] : PIXEL.BONE[1];
              ctx.fillRect(snap(x + Math.cos(aa) * d - sz / 2), snap(y + Math.sin(aa) * d - sz / 2), sz, sz);
            }
          }
        }
        blitC(PIXEL.disc(Math.max(4, Math.round(r)), pal), x, y);
      }
      drawWormHead(w, ox, oy, pal);
    }
  }

  const MAW = ['#14020a', '#2b0409', '#3a060e', '#5c0a14', '#8a1a2a'];
  function drawWormHead(w, ox, oy, pal) {
    const e = w.e, r = e.radius, a = w.angle, hx = w.x - ox, hy = w.y - oy;
    blitC(PIXEL.disc(Math.max(6, Math.round(r * 1.05)), pal), hx, hy);
    const bite = 0.35 + 0.3 * Math.sin(w.phase * 1.6);
    // Kieferzangen aus Pixeln
    for (const side of [-1, 1]) {
      const ba = a + side * (0.55 + bite * 0.4);
      const p0 = [hx + Math.cos(ba) * r * 0.8, hy + Math.sin(ba) * r * 0.8];
      const p1 = [hx + Math.cos(a + side * 0.6) * r * 1.6, hy + Math.sin(a + side * 0.6) * r * 1.6];
      const p2 = [hx + Math.cos(a + side * bite * 0.35) * r * 1.75, hy + Math.sin(a + side * bite * 0.35) * r * 1.75];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
        const sz = k < 12 ? 3 : 2;
        ctx.fillStyle = PIXEL.BONE[0]; ctx.fillRect(snap(x - sz / 2), snap(y - sz / 2) + 1, sz, sz);
        ctx.fillStyle = k > 12 ? PIXEL.BONE[3] : PIXEL.BONE[2]; ctx.fillRect(snap(x - sz / 2), snap(y - sz / 2), sz, sz - 1);
      }
    }
    // Schlund mit Zahnkranz
    const mx = hx + Math.cos(a) * r * 0.38, my = hy + Math.sin(a) * r * 0.38, mr = Math.max(4, Math.round(r * 0.6));
    blitC(PIXEL.disc(mr, MAW, false), mx, my);
    for (let k = 0; k < 9; k++) {
      const ta = k / 9 * Math.PI * 2 + w.phase * 0.2, tr = mr * (0.8 - bite * 0.25);
      ctx.fillStyle = '#efe6d2'; ctx.fillRect(snap(mx + Math.cos(ta) * tr - 1), snap(my + Math.sin(ta) * tr - 1), 2, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(snap(mx + Math.cos(ta) * tr - 1), snap(my + Math.sin(ta) * tr - 1), 1, 1);
    }
  }

  // Augen leuchten durch die Dunkelheit (gedithertes Glimmen)
  function drawWormEyes(ox, oy, vw, vh) {
    for (const w of worms) {
      if (!wormVisible(w, ox, oy, vw, vh)) continue;
      const r = w.e.radius, a = w.angle;
      const blink = Math.sin(w.phase * 0.7 + w.x * 0.01) > 0.97;
      for (const side of [-1, 1]) {
        const ea = a + side * 1.75;
        const ex = w.x - ox + Math.cos(ea) * r * 0.65, ey = w.y - oy + Math.sin(ea) * r * 0.65;
        const gr = w.chasing ? 7 : 5;
        ctx.globalAlpha = 0.5;
        for (let yy = -gr; yy <= gr; yy++) for (let xx = -gr; xx <= gr; xx++)
          if (xx * xx + yy * yy <= gr * gr && PIXEL.dith(xx + 16, yy + 16, 0.5 - Math.hypot(xx, yy) / gr * 0.35)) { ctx.fillStyle = w.e.eye; ctx.fillRect(snap(ex + xx), snap(ey + yy), 1, 1); }
        ctx.globalAlpha = 1;
        if (!blink) { ctx.fillStyle = PIXEL.INK; ctx.fillRect(snap(ex - 2), snap(ey - 2), 5, 5); ctx.fillStyle = w.e.eye; ctx.fillRect(snap(ex - 1), snap(ey - 2), 3, 5); ctx.fillRect(snap(ex - 2), snap(ey - 1), 5, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(snap(ex - 1), snap(ey - 1), 1, 1); }
      }
    }
  }

  // ---------- Prinzessin ----------
  const PR = D.princess;
  const loveProgress = (pl = pod) => Math.min(1, pl.maxDepth / PR.goalDepth);
  const bestLove = () => Math.max(...players.map(pl => loveProgress(pl)));
  function princessQuote() {
    const p = loveProgress();
    let q = PR.quotes[0][1];
    for (const [min, text] of PR.quotes) if (p >= min) q = text;
    return q;
  }
  function checkLoveMilestones() {
    const p = loveProgress();
    const step = Math.floor(p * 4); // 25 % Schritte
    if (step > pod.loveStep) {
      pod.loveStep = step;
      state.heartBurst = 2.5; SFX.play('heart');
      if (p >= 1) { toast(`${who()}Ihr Haar reicht bis zum Boden! Schnell zum Turm!`, EMERALD); story('hairDone'); }
      else { if (step === 2) story('love50'); toast(multi() ? `${pod.name} beeindruckt die Prinzessin! ♥ ${step * 25} %` : `Das Haar der Prinzessin wächst! ♥ ${step * 25} %`, EMERALD); }
    }
  }

  function winGame(winner) {
    if (!state.endingShown) {
      state.endingShown = true;
      const e = STORY.scenes.ending || [], lines = [e[0], ...(winner.bossKill ? STORY.scenes.endingBoss || [] : []), ...e.slice(1)].filter(Boolean);
      closePanel(); state.paused = true;
      SFX.play('heart');
      story('ending', () => winGame(winner), lines);
      return;
    }
    SFX.play('win');
    state.over = true; state.paused = true; state.won = true;
    hintEl.style.display = 'none';
    const min = Math.floor(state.time / 60), sec = Math.floor(state.time % 60);
    const rows = players.map(pl => `<tr><td><b style="color:${pl.color}">${pl.name}</b>${pl === winner ? ' ♥' : ''}</td>
      <td class="num">${pl.maxDepth * D.world.metersPerTile} m</td><td class="num">${fmt(pl.money)}</td><td class="num">${pl.artifacts.length}</td><td class="num">${scoreOf(pl).total.toLocaleString('de-CH')}</td></tr>`).join('');
    const stats = multi()
      ? `<table><tr><td class="muted">Spieler</td><td class="num muted">Tiefe</td><td class="num muted">Vermögen</td><td class="num muted">Artefakte</td><td class="num muted">Punkte</td></tr>${rows}</table>`
      : scoreHtml(winner);
    panelEl.innerHTML = cardHead('ENDE GUT, ALLES GUT', multi() ? `${winner.name} gewinnt! ♥` : 'Liebe gewonnen! ♥', '#c2417a') + `<div class="card-body">
      <div class="tagline">«&nbsp;Ein Mann, der so tief gräbt, gräbt auch für mich.&nbsp;»<br>Die Prinzessin sagt Ja${multi() ? ' – zu ' + winner.name : ''}.</div>
      ${stats}
      <div class="balance"><span>Spielzeit</span><b>${min}:${String(sec).padStart(2, '0')}</b></div>
      ${endButtons()}</div>`;
    panelEl.classList.remove('hidden');
  }

  // ---------- Gebäude ----------
  function currentStation() {
    if (!pod.onGround || pod.drill) return null;
    const bottomRow = Math.round((pod.y + pod.h) / T);
    if (bottomRow !== SURF) return null;
    return stationAtColumn(Math.floor((pod.x + pod.w / 2) / T));
  }

  // Maus über einer Upgrade-Zeile -> Vorschau zeigt den Pod mit genau diesem Upgrade
  panelEl.addEventListener('mouseover', e => {
    const row = e.target.closest('[data-preview]');
    state.previewCat = row ? row.dataset.preview : null;
  });
  panelEl.addEventListener('mouseleave', () => { state.previewCat = null; });

  function openPanel(id, pl) {
    SFX.play('open');
    panelEl.classList.toggle('wide', id === 'shop' || id === 'museum');
    state.previewCat = null;
    state.paused = true;
    state.panel = id;
    state.panelPlayer = pl;
    releaseAllKeys();
    renderPanel();
    panelEl.classList.remove('hidden');
  }
  function closePanel() {
    if (state && state.panel) SFX.play('close');
    if (state && !state.over) { state.paused = false; state.panel = null; state.panelPlayer = null; }
    panelEl.classList.add('hidden');
    panelEl.classList.remove('wide');
  }

  function cardHead(kicker, title, color) {
    return `<div class="card-head" style="background:${color}"><div class="kicker">${kicker}</div><div class="card-title">${title}</div></div>`;
  }

  // Cabinet d'Histoire Naturelle: Detailkarte + Raster aller Erze
  function cabinetHtml() {
    const sel = D.ores.find(o => o.id === state.museumOre && discovered.includes(o.id));
    let h = `<div class="cabinet"><div class="cabinet-head"><span>Cabinet d'Histoire Naturelle</span><span>${discovered.length}/${D.ores.length} Erze entdeckt</span></div>`;
    if (sel) {
      const where = sel.lootOnly ? 'Nur aus erlegten Würmern' : `Area ${sel.area} · ${AREAS[sel.area - 1].name}`;
      h += `<div class="ore-detail"><img class="pxi big" src="${PIXEL.iconURL('ore_' + sel.id)}" alt="">
        <div><div class="ore-name">${sel.name}</div>
        <div class="ore-facts"><span>${RARITY(sel.share)}</span><span>${where}</span>${sel.hardness ? `<span>Härte ${sel.hardness.toFixed(1)}</span>` : ''}<span>${fmt(sel.value)}</span></div>
        <div class="ore-desc">«&nbsp;${sel.desc}&nbsp;»</div></div></div>`;
    } else {
      h += `<div class="keyhint" style="margin:4px 0 10px">${discovered.length ? 'Wählen Sie ein Exponat für die Expertise.' : 'Noch kein Erz entdeckt. Graben Sie – die Vitrinen warten.'}</div>`;
    }
    const groups = AREAS.map((a, i) => ({ title: `Area ${i + 1} · ${a.name}`, list: D.ores.filter(o => o.area === i + 1) }));
    groups.push({ title: 'Trophäen der Tiefe', list: D.ores.filter(o => o.lootOnly) });
    for (const gr of groups) {
      if (!gr.list.length) continue;
      h += `<div class="board-title">${gr.title}</div><div class="ore-row">`;
      for (const o of gr.list) {
        const known = discovered.includes(o.id);
        h += known
          ? `<div class="ore-card${state.museumOre === o.id ? ' sel' : ''}" data-ore="${o.id}"><img class="pxi" src="${PIXEL.iconURL('ore_' + o.id)}" alt=""><span class="nm">${o.name}</span><span class="val">${fmt(o.value)}</span></div>`
          : `<div class="ore-card unknown"><span class="q">?</span><span class="nm">${RARITY(o.share)}</span></div>`;
      }
      h += `</div>`;
    }
    return h + `</div>`;
  }
  panelEl.addEventListener('click', e => {
    const card = e.target.closest('.ore-card[data-ore]');
    if (!card || state.panel !== 'museum') return;
    state.museumOre = card.dataset.ore;
    const top = panelEl.scrollTop; renderPanel(); panelEl.scrollTop = top;
  });

  function renderPanel() {
    const id = state.panel;
    pod = state.panelPlayer;
    const st = D.stations.find(s => s.id === id);
    const K = pod.actionLabel;
    const owner = multi() ? ` · <span style="background:${pod.color};padding:1px 8px;border-radius:4px">${pod.name.toUpperCase()}</span>` : '';
    let html = cardHead(`BESITZURKUNDE${owner}`, st.name, st.color) + '<div class="card-body">';
    html += `<div class="tagline">${st.tagline}</div>
      <div class="balance"><span>${multi() ? 'Vermögen ' + pod.name : 'Ihr Vermögen'}</span><b>${fmt(pod.money)}</b></div>`;

    if (id === 'fuel') {
      const missingFuel = stat('tank') - pod.fuel;
      const fuelCost = Math.ceil(missingFuel * tier('engine').pricePerLiter);
      const missingHull = stat('hull') - pod.hull;
      const repairCost = Math.ceil(missingHull * D.prices.repairPerHp);
      html += `<table>
        <tr><td>${tier('engine').fuel} <span class="muted">· CHF ${tier('engine').pricePerLiter.toFixed(2)} pro Liter</span></td><td class="num">${pod.fuel.toFixed(1)} / ${stat('tank')} L</td></tr>
        <tr><td class="muted" colspan="2" style="font-size:13px">Verbrauch ${tier('engine').name.split(' «')[0]}: Fliegen ${tier('engine').use.thrust} L/s · Bohren ${tier('engine').use.drill} L/s · Fahren ${tier('engine').use.move} L/s · Stand ${tier('engine').use.idle} L/s</td></tr>
        <tr><td>Hülle</td><td class="num">${Math.max(0, Math.round(pod.hull))} / ${stat('hull')} HP</td></tr>
      </table>
      <div class="actions">
        <button data-act="refuel" ${missingFuel < 0.05 || pod.money <= 0 ? 'disabled' : ''}>${tier('engine').fuel} nachfüllen · ${fmt(fuelCost)}</button>
        <button data-act="repair" ${missingHull < 0.5 || pod.money <= 0 ? 'disabled' : ''}>Reparieren · ${fmt(repairCost)}</button>
      </div>
      <div class="keyhint"><kbd>${K}</kbd> tankt und repariert sofort</div>`;
    }

    if (id === 'sell') {
      const counts = {};
      for (const o of pod.cargo) counts[o] = (counts[o] || 0) + 1;
      let total = 0;
      html += '<table>';
      for (const ore of D.ores) {
        if (!counts[ore.id]) continue;
        const sum = counts[ore.id] * ore.value;
        total += sum;
        html += `<tr><td><span class="swatch" style="background:${ore.color}"></span>${ore.name}</td><td class="num muted">${counts[ore.id]} × ${fmt(ore.value)}</td><td class="num">${fmt(sum)}</td></tr>`;
      }
      if (!total) html += '<tr><td class="muted">Ihr Tresor ist leer. Die Bank ist enttäuscht.</td></tr>';
      html += `</table><div class="actions"><button class="gold" data-act="sell" ${total ? '' : 'disabled'}>Alles verkaufen · ${fmt(total)}</button></div>
        <div class="keyhint"><kbd>${K}</kbd> verkauft sofort alles</div>`;
    }

    if (id === 'museum') {
      const rel = pod.towing;
      if (rel) {
        html += `<div class="museum-offer"><span class="big-icon"><img class="pxi big" src="${PIXEL.iconURL(rel.def.id)}" alt=""></span><div><b>${rel.def.name}</b><br>
          <span class="muted">${rel.def.desc}</span></div>
          <button class="gold" data-act="deliver">Ausstellen · ${fmt(rel.def.value)}</button></div>
          <div class="keyhint"><kbd>${K}</kbd> stellt das Artefakt sofort aus</div>`;
      } else {
        html += `<div class="keyhint" style="margin-bottom:8px">Kein Artefakt am Seil. Die Artefakte liegen sichtbar im Erdreich – freibohren, berühren, herbringen.</div>`;
      }
      html += `<div class="museum-board">`;
      AREAS.forEach((area, ai) => {
        const list = D.artifacts.filter(a => a.area === ai + 1);
        if (!list.length) return;
        html += `<div class="board-area"><div class="board-title">Area ${ai + 1} · ${area.name}</div><div class="board-row">`;
        for (const def of list) {
          const isDone = delivered.includes(def);
          const relic = relics.find(r => r.def === def);
          let cls = 'unknown', body = `<span class="big-icon">?</span><span class="nm">Unbekannt</span>`;
          if (isDone) { cls = 'done'; body = `<span class="big-icon"><img class="pxi big" src="${PIXEL.iconURL(def.id)}" alt=""></span><span class="nm">${def.name}</span><span class="val">${fmt(def.value)}</span>`; }
          else if (relic && relic.state === 'towed') { cls = 'towed'; body = `<span class="big-icon"><img class="pxi big" src="${PIXEL.iconURL(def.id)}" alt=""></span><span class="nm">${def.name}</span><span class="val">am Seil</span>`; }
          else if (relic) { const m = Math.max(0, Math.floor(relic.y / T) - SURF) * D.world.metersPerTile; cls = 'found'; body = `<span class="big-icon"><img class="pxi big" src="${PIXEL.iconURL(def.id)}" alt=""></span><span class="nm">${def.name}</span><span class="val">liegt bei ${m} m</span>`; }
          html += `<div class="relic ${cls}" title="${isDone ? def.desc : ''}">${body}</div>`;
        }
        html += `</div></div>`;
      });
      html += `</div>`;
      html += cabinetHtml();
    }

    if (id === 'tower') {
      const p = loveProgress();
      const hairM = Math.round(p * PR.goalDepth * D.world.metersPerTile);
      const goalM = PR.goalDepth * D.world.metersPerTile;
      const hearts = Array.from({ length: 10 }, (_, i) => `<span style="color:${i < Math.round(p * 10) ? '#c2417a' : '#d8cdb3'}">♥</span>`).join('');
      html = cardHead(multi() ? `DIE PRINZESSIN · ${pod.name.toUpperCase()}` : 'DIE PRINZESSIN', st.name, st.color) + `<div class="card-body">
        <div class="tagline" style="font-size:20px">«&nbsp;${princessQuote()}&nbsp;»</div>
        <div style="text-align:center;font-size:30px;letter-spacing:2px;margin:6px 0 10px">${hearts}</div>
        <table>
          <tr><td>Haarlänge</td><td class="num">${hairM} m / ${goalM} m</td></tr>
          <tr><td>Ihr Tiefenrekord</td><td class="num">${pod.maxDepth * D.world.metersPerTile} m</td></tr>
        </table>`;
      if (p >= 1) {
        html += `<div class="actions"><button class="gold" data-act="propose" style="background:#c2417a;color:#fff">♥ Um ihre Hand anhalten</button></div>
          <div class="keyhint"><kbd>${K}</kbd> hält sofort um ihre Hand an</div>`;
      } else {
        html += `<div class="keyhint">Graben Sie tiefer als je zuvor – dann wächst ihr Haar.<br>Reicht es bis zum Boden, gehört ihr Herz Ihnen.</div>`;
      }
      html += '<div class="actions"><button class="secondary" data-act="close">Zurück (Esc)</button></div></div>';
      panelEl.innerHTML = html;
      return;
    }

    if (id === 'shop') {
      const catColors = { drill: '#c8352b', engine: '#e0752d', tank: '#d4a63a', hull: '#1b5fa8', cargo: '#7b3fa0' };
      html += '<div class="shop-grid"><div><table class="shop-table">';
      for (const cat of D.upgradeCategories) {
        const lvl = pod.levels[cat.id];
        const cur = D.upgrades[cat.id][lvl];
        const next = lvl < maxLevel(cat.id) ? D.upgrades[cat.id][lvl + 1] : null;
        const max = maxLevel(cat.id);
        html += `<tr data-preview="${cat.id}"><td><div style="display:flex;align-items:center"><span class="catbar" style="background:${catColors[cat.id] || '#1b1b1b'};flex:none"></span><div><b>${cat.name}</b> <span class="muted">Stufe ${lvl}/${max}</span><br><span class="muted">${cur.name} · ${cur.value}${cat.unit}</span></div></div></td>`;
        if (next) {
          html += `<td class="muted">→ <b style="color:#1b1b1b">${next.name}</b> · ${next.value}${cat.unit}<br><span style="font-size:12px">${next.perk || ''}${next.use ? `<br>Verbrauch: Fliegen ${next.use.thrust} · Bohren ${next.use.drill} L/s (bisher ${cur.use.thrust} · ${cur.use.drill}) · CHF ${next.pricePerLiter.toFixed(2)}/L` : ''}</span></td>
            <td class="num"><button data-act="buy" data-cat="${cat.id}" ${pod.money < next.price ? 'disabled' : ''}>${fmt(next.price)}</button></td>`;
        } else {
          html += '<td class="muted" colspan="2" style="text-align:right">★ Maximal</td>';
        }
        html += '</tr>';
      }
      html += `</table>${gadgetShopHtml()}</div>
        <div class="preview-box">
          <div class="preview-title">VORSCHAU</div>
          <canvas id="shop-preview"></canvas>
          <div id="shop-preview-caption" class="preview-caption"></div>
        </div></div>`;
      state.previewKey = null; // Beschriftung neu setzen
    }

    html += '<div class="actions"><button class="secondary" data-act="close">Zurück (Esc)</button></div></div>';
    panelEl.innerHTML = html;
  }

  panelEl.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === 'restart' || act === 'menu' || !state.panel) return;
    if (act === 'close') { closePanel(); return; }
    pod = state.panelPlayer;
    if (act === 'propose') { winGame(pod); return; }
    doAction(act, btn.dataset.cat);
    renderPanel();
  });

  function doAction(act, cat) {
    if (act === 'refuel') {
      const ppl = tier('engine').pricePerLiter;
      const liters = Math.max(0, Math.min(stat('tank') - pod.fuel, pod.money / ppl));
      pod.money -= Math.ceil(liters * ppl);
      pod.fuel += liters;
      if (liters > 0.05) SFX.play('fuel');
    }
    if (act === 'repair') {
      const hp = Math.min(stat('hull') - pod.hull, pod.money / D.prices.repairPerHp);
      pod.money -= Math.ceil(hp * D.prices.repairPerHp);
      pod.hull += hp;
      if (hp > 0.5) SFX.play('repair', { gap: 200 });
    }
    if (act === 'deliver') deliverTow();
    if (act === 'sell') {
      let sum = 0;
      for (const id of pod.cargo) sum += (D.ores.find(o => o.id === id) || { value: 0 }).value;
      pod.money += sum;
      if (sum) { toast(multi() ? `Die Bank zahlt ${pod.name} ${fmt(sum)}.` : `Die Bank zahlt Ihnen ${fmt(sum)}.`, EMERALD); SFX.play('sell'); }
      pod.cargo = [];
    }
    if (act === 'buygadget') {
      const g = D.gadgets.find(x => x.id === cat);
      if (g && pod.money >= g.price) {
        pod.money -= g.price;
        pod.gadgets[g.id] = (pod.gadgets[g.id] || 0) + g.uses;
        toast(`${who()}${g.name} gekauft (+${g.uses}). Taste ${D.gadgets.indexOf(g) + 1} zum Benutzen.`, EMERALD); SFX.play('buy');
      }
    }
    if (act === 'buy') {
      const next = pod.levels[cat] < maxLevel(cat) ? D.upgrades[cat][pod.levels[cat] + 1] : null;
      if (next && pod.money >= next.price) {
        toast(`${who()}${next.name} montiert! ${next.perk || ''}`, EMERALD); SFX.play('buy');
        pod.money -= next.price;
        pod.levels[cat]++;
        if (cat === 'hull') pod.hull = stat('hull');
      }
    }
    if (act === 'sell' && pod.cargo.length === 0) { /* schon verkauft */ }
    pod.money = Math.max(0, Math.round(pod.money));
  }

  // ---------- Update ----------
  function update(dt) {
    state.time += dt;
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) { toastEl.classList.remove('show'); } }
    drillWarnCooldown -= dt;
    updateParticles(dt);
    updateFloats(dt);
    state.shake = Math.max(0, state.shake - dt);
    state.flash = Math.max(0, (state.flash || 0) - dt * 0.7);
    updateDialog(dt);
    if (introOpen || dialog || state.paused || state.over) { SFX.loop('drill', false); SFX.loop('engine', false); if (introOpen) SFX.ambient('surface'); return; }

    for (const pl of players) { pod = pl; updatePlayer(dt); }
    updateWorms(dt);
    for (const pl of players) {
      if (pl.dead > 0) continue;
      pod = pl;
      pod.hitCooldown -= dt;
      wormInteract(dt);
    }
    updatePickups(dt);
    updateRelics(dt);
    updateBombs(dt);
    updateBaits(dt);
    updateBoss(dt);
    updateDefusing(dt);
    updateMines(dt);
    updateFluids(dt);
    updateQuake(dt);
    for (const pl of players) { // jeder Schaden lässt das Seil reissen
      if (pl.towing && pl.hull < pl.lastHull - 0.01) { pod = pl; dropTow(); }
      pl.lastHull = pl.hull;
    }
    hintEl.style.display = 'none';
    // Ambient-Hintergrund je nach Zone des (ersten lebenden) Pods
    const ref = players.find(pl => pl.dead <= 0) || players[0];
    if (ref) {
      const d = Math.floor((ref.y + ref.h) / T) - SURF;
      SFX.ambient(d < 3 ? 'surface' : LAIR_ROWS && ref.y + ref.h > LAIR_TOP * T ? 'lair' : 'a' + (areaIndexAt(d) + 1));
    }
    // Dauertöne: Bohrer und Antrieb (lautester Pod zählt)
    const alive = players.filter(pl => pl.dead <= 0);
    const driller = alive.find(pl => pl.drill || pl.attack);
    SFX.loop('drill', !!driller, { lvl: driller ? driller.levels.drill : 0 });
    const thruster = alive.find(pl => pl.thrusting);
    SFX.loop('engine', !!thruster, { lvl: thruster ? thruster.levels.engine : 0 });
    // Warnpiepen bei wenig Brennstoff oder Hülle
    for (const pl of alive) {
      pod = pl;
      if (pl.fuel < stat('tank') * 0.15 || pl.hull < stat('hull') * 0.2) SFX.play('warn', { gap: 2200 });
    }
  }

  // =====================================================================
  //  ENDBOSS «Le Baron Noir» – mit Köpfchen statt mit Bohrer:
  //  Bohren macht nur 15 % Schaden. Der elegante Weg: ihn unter einen
  //  Kronleuchter locken (Foie-Gras-Köder oder Ansturm gegen die Wand → benommen)
  //  und mit der Aktionstaste die Kette lösen.
  // =====================================================================
  let boss = null, chandeliers = [], bossRocks = [], salonPattern = null;
  const FLOOR_Y = () => (H - 2) * T;
  const bossMinX = 2 * T + 58, bossMaxX = () => (W - 2) * T - 58;
  function makeBoss() {
    if (!BOSS) return null;
    const ceil = (LAIR_TOP + 2) * T;
    chandeliers = [bossMinX, W * T / 2, bossMaxX()].map(x => ({ x, y: ceil + 150, home: ceil + 150, vy: 0, state: 'hang', respawn: 0 }));
    bossRocks = [];
    return { x: W * T / 2, y: FLOOR_Y() - 50, vy: 0, hp: BOSS.hp, state: 'sleep', t: 0, facing: -1, phase: 1, hurt: 0, active: false, dead: false, hintT: 0, hintI: 0, lastHitter: null, thrown: 0, air: false };
  }
  const bossLine = k => `${BOSS.name}: ${BOSS.lines[k]}`;
  function inLair(pl) { return pl.dead <= 0 && pl.y + pl.h > (LAIR_TOP + 2) * T; }
  function hurtBoss(dmg, by) {
    if (!boss || boss.dead) return;
    boss.hp -= dmg; boss.hurt = 0.15;
    if (by) boss.lastHitter = by;
    const ph = boss.hp / BOSS.hp > 0.66 ? 1 : boss.hp / BOSS.hp > 0.33 ? 2 : 3;
    if (ph > boss.phase && boss.hp > 0) { boss.phase = ph; toast(bossLine(ph === 2 ? 'phase2' : 'phase3')); SFX.play('roar'); }
    if (boss.hp <= 0) killBoss();
  }
  function killBoss() {
    boss.dead = true; boss.state = 'dead'; boss.t = 3; state.shake = 1.2; state.flash = 0.6;
    const pl = boss.lastHitter || players.find(p => p.dead <= 0) || players[0];
    pl.money += BOSS.reward; pl.bossKill = true;
    pod = pl; toastInfo(`${who()}${BOSS.lines.death} +${fmt(BOSS.reward)}`); SFX.play('victory');
    for (const id of BOSS.treasure) { const ore = D.ores.find(o => o.id === id); if (ore) pickups.push({ x: boss.x, y: boss.y - 30, vx: (Math.random() - 0.5) * 320, vy: -200 - Math.random() * 200, ore, t: Math.random() * 6 }); }
    for (let k = 0; k < 80; k++) { const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 260; spawnParticle(boss.x, boss.y, ['#ffd23f', '#fff0a0', '#40323e', '#e07a98'][k % 4], { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 300, size: 3, life: 0.9 }); }
    floatText(boss.x, boss.y - 90, 'TRIOMPHE!', '#ffd23f');
    setTimeout(() => { if (!state.over) story('bossDead'); }, 1600);
  }
  function chandelierNear(pl) {
    if (!boss || pl.dead > 0) return null;
    const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
    return chandeliers.find(ch => ch.state === 'hang' && Math.abs(cx - ch.x) < 48 && Math.abs(cy - ch.y) < 64) || null;
  }
  // Kronleuchter lösen sich nur durch Explosionen (Kette im Sprengradius)
  function dropChandelier(ch, by) {
    ch.state = 'fall'; ch.vy = 0; ch.by = by;
    floatText(ch.x, ch.y - 40, 'KETTE GESPRENGT!', '#ffd23f');
    for (let k = 0; k < 8; k++) spawnParticle(ch.x, (LAIR_TOP + 2) * T + 4, '#c8962a', { size: 2 });
  }
  // Bombe nahe am Kronleuchter abgelegt → bleibt als Haftladung daran hängen
  function attachToChandelier(b, pl) {
    const ch = chandelierNear(pl);
    if (!ch) return;
    b.stuck = ch; b.ox = Math.max(-16, Math.min(16, b.x - ch.x)); b.oy = 4;
    floatText(ch.x, ch.y - 44, 'HAFTLADUNG!', '#ff9a3a'); SFX.play('clink');
  }
  function updateBoss(dt) {
    if (!boss) return;
    const B = BOSS, floorY = FLOOR_Y() - 50;
    // Kronleuchter
    for (const ch of chandeliers) {
      if (ch.state === 'fall') {
        ch.vy = Math.min(900, ch.vy + P.gravity * dt); ch.y += ch.vy * dt;
        if (boss.active && !boss.dead && Math.abs(ch.x - boss.x) < 66 && ch.y + 20 >= boss.y - 72) {
          ch.state = 'broken'; ch.respawn = B.rehang;
          hurtBoss(B.chandelierDamage, ch.by);
          if (!boss.dead) { boss.state = 'stun'; boss.t = B.chandelierStun; }
          toast(B.lines.chandelier, EMERALD); state.shake = 0.8; SFX.play('crash'); SFX.play('bosshurt');
          floatText(boss.x, boss.y - 100, `−${B.chandelierDamage}`, '#ffd23f');
          for (let k = 0; k < 40; k++) spawnParticle(ch.x, ch.y, k % 3 ? '#d8f0ff' : '#ffd23f', { vx: (Math.random() - 0.5) * 380, vy: -Math.random() * 300, g: 600, size: 2 + Math.random() * 2 });
          continue;
        }
        for (const pl of players) {
          if (pl.dead > 0 || pl.shield > 0) continue;
          if (Math.abs(pl.x + pl.w / 2 - ch.x) < 30 && Math.abs(pl.y + pl.h / 2 - ch.y) < 26 && pl.hitCooldown <= 0) {
            pl.hull -= 20; pl.hitCooldown = 0.8; pl.koReason = 'Vom eigenen Kronleuchter erschlagen. Stilvoll.'; pl.koTimer = 0.6;
            pod = pl; toast(`${who()}Autsch – Kronleuchter auf den eigenen Pod! −20 HP`);
          }
        }
        if (ch.y >= FLOOR_Y() - 20) {
          ch.state = 'broken'; ch.respawn = B.rehang;
          toast(B.lines.miss); SFX.play('crash');
          for (let k = 0; k < 30; k++) spawnParticle(ch.x, ch.y, k % 3 ? '#d8f0ff' : '#ffd23f', { vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 200, g: 600, size: 2 });
        }
      } else if (ch.state === 'broken') {
        ch.respawn -= dt;
        if (ch.respawn <= 0) { ch.state = 'hang'; ch.y = ch.home; if (boss.active && !boss.dead) toast(B.lines.rehang); }
      }
    }
    // geworfene Felsbrocken
    for (const r of bossRocks) {
      r.vy += P.gravity * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      for (const pl of players) {
        if (pl.dead > 0 || r.dead) continue;
        if (Math.hypot(pl.x + pl.w / 2 - r.x, pl.y + pl.h / 2 - r.y) < 22) {
          r.dead = true;
          if (pl.shield > 0) continue;
          pl.hull -= B.rockDamage; pl.koReason = `Vom Baron mit Felsen beworfen!`; pl.koTimer = 0.6;
          pod = pl; say('bossrock', `Volltreffer! −${B.rockDamage} HP`, false, 1.5); SFX.play('rockhit');
        }
      }
      if (!r.dead && solid(tileAt(Math.floor(r.x / T), Math.floor(r.y / T)))) {
        r.dead = true; for (let k = 0; k < 6; k++) spawnParticle(r.x, r.y, '#5a4e5a', { size: 3 });
      }
    }
    bossRocks = bossRocks.filter(r => !r.dead && r.y < H * T);

    if (boss.state === 'dead') { boss.t -= dt; boss.y += 20 * dt; return; }
    boss.hurt = Math.max(0, boss.hurt - dt);
    const targets = players.filter(inLair);
    if (boss.state === 'sleep') {
      if (targets.length && !boss.greeting) {
        boss.greeting = true; SFX.play('roar'); state.shake = 0.6;
        story('lair', () => { boss.active = true; boss.state = 'intro'; boss.t = 2.4; state.shake = 1; toast(bossLine('intro')); SFX.play('roar'); });
      }
      return;
    }
    if (!targets.length) { boss.state = 'walk'; boss.t = 1; return; }       // wartet, bis jemand zurückkommt
    const tgt = targets.reduce((a, b) => Math.abs(b.x - boss.x) < Math.abs(a.x - boss.x) ? b : a);
    const tx = tgt.x + tgt.w / 2, mul = boss.phase === 3 ? 1.4 : 1;
    boss.t -= dt;
    // Hinweise des Butlers, falls es nicht vorwärtsgeht
    boss.hintT += dt;
    if (boss.hintT > 30 && boss.hp > BOSS.hp * 0.7) { boss.hintT = 0; toast(B.lines.hint[boss.hintI++ % B.lines.hint.length], EMERALD); }
    // Foie Gras lockt ihn an
    const bait = baits.find(b => b.y > (LAIR_TOP + 2) * T);
    if (bait && ['walk', 'throw'].includes(boss.state)) { boss.state = 'feast'; boss.bait = bait; boss.t = 99; boss.eating = 0; }
    const clampX = () => { boss.x = Math.max(bossMinX, Math.min(bossMaxX(), boss.x)); };
    switch (boss.state) {
      case 'intro':
        if (boss.t <= 0) { boss.state = 'walk'; boss.t = 2; }
        break;
      case 'walk':
        boss.facing = tx > boss.x ? 1 : -1;
        if (Math.abs(tx - boss.x) > 70) boss.x += boss.facing * B.speed * mul * dt;
        if (boss.t <= 0) {
          const pool = ['charge', 'charge', 'throw'].concat(boss.phase >= 2 ? ['summon'] : [], boss.phase >= 3 ? ['slam', 'charge'] : []);
          const a = pick(pool);
          if (a === 'charge') { boss.state = 'windup'; boss.t = 0.7; boss.facing = tx > boss.x ? 1 : -1; }
          if (a === 'throw') { boss.state = 'throw'; boss.t = 1.5; boss.thrown = 0; say('bossthrow', B.lines.throw, false, 12); }
          if (a === 'summon') {
            const base = D.enemies.find(e => e.id === B.minion), alive = worms.filter(w => w.minion).length;
            if (base && alive < B.maxMinions) {
              toast(bossLine('summon')); SFX.play('summon');
              for (let k = 0; k < Math.min(2, B.maxMinions - alive); k++) {
                const e = scaledEnemy(base, AREAS.length - 1), x = boss.x + (k ? 90 : -90), y = FLOOR_Y() - 24;
                worms.push({ e, x, y, angle: -Math.PI / 2, turn: 0, phase: Math.random() * 10, chasing: true, retreat: 0, hp: e.hp, hurt: 0, enraged: 6, minion: true, segs: Array.from({ length: e.segments }, () => ({ x, y })) });
              }
            }
            boss.state = 'walk'; boss.t = 1.6;
          }
          if (a === 'slam') { boss.state = 'slam'; boss.vy = -560; boss.air = true; toast(bossLine('slam')); SFX.play('roar'); }
        }
        break;
      case 'windup':
        state.shake = Math.max(state.shake, 0.12);
        if (boss.t <= 0) { boss.state = 'charge'; say('bosscharge', bossLine('charge'), false, 14); SFX.play('charge'); }
        break;
      case 'charge':
        boss.x += boss.facing * B.chargeSpeed * mul * dt;
        if (Math.random() < 0.6) spawnParticle(boss.x - boss.facing * 50, FLOOR_Y() - 4, '#cfc6b4', { size: 3, vy: -60 });
        if (boss.x <= bossMinX || boss.x >= bossMaxX()) {
          clampX(); boss.state = 'stun'; boss.t = B.wallStun; state.shake = 0.6; SFX.play('wallhit');
          say('bosswall', B.lines.wall, true, 10);
          for (let k = 0; k < 16; k++) spawnParticle(boss.x + boss.facing * 70, boss.y, '#5a4e5a', { size: 3 });
        }
        break;
      case 'stun':
        if (boss.t <= 0) { boss.state = 'walk'; boss.t = 1.4; }
        break;
      case 'throw':
        boss.facing = tx > boss.x ? 1 : -1;
        if (boss.thrown < 3 && boss.t < 1.5 - boss.thrown * 0.4) {
          boss.thrown++;
          const x0 = boss.x + boss.facing * 50, y0 = boss.y - 40, ft = 0.9, ty = tgt.y + tgt.h / 2;
          SFX.play('throw');
          bossRocks.push({ x: x0, y: y0, vx: (tx - x0) / ft + (Math.random() - 0.5) * 60, vy: (ty - y0) / ft - 0.5 * P.gravity * ft });
        }
        if (boss.t <= 0) { boss.state = 'walk'; boss.t = 1.8; }
        break;
      case 'slam':
        boss.vy += P.gravity * 1.2 * dt; boss.y += boss.vy * dt;
        if (boss.y >= floorY && boss.vy > 0) {
          boss.y = floorY; boss.air = false; state.shake = 1; SFX.play('slam');
          for (const pl of targets) {
            if (pl.shield > 0 || !pl.onGround || Math.abs(pl.x - boss.x) > 9 * T) continue;
            pl.hull -= B.slamDamage; pl.koReason = 'Vom Stampfen des Barons erschüttert!'; pl.koTimer = 0.6;
            pod = pl; say('bossslam', `Schockwelle! −${B.slamDamage} HP – nächstes Mal springen!`, false, 2);
          }
          for (let k = 0; k < 7; k++) rocks.push({ x: Math.max(2 * T, Math.min((W - 2) * T, tx + (Math.random() - 0.5) * 12 * T)), y: (LAIR_TOP + 2) * T + 8, vy: Math.random() * 100, ai: AREAS.length - 1 });
          boss.state = 'walk'; boss.t = 2;
        }
        break;
      case 'feast': {
        const bt = boss.bait;
        if (!bt || !baits.includes(bt)) { boss.state = 'walk'; boss.t = 1.5; break; }
        boss.facing = bt.x > boss.x ? 1 : -1;
        if (Math.abs(bt.x - boss.x) > 36 && boss.eating <= 0) boss.x += boss.facing * B.speed * 1.6 * dt;
        else {
          if (boss.eating <= 0) { boss.eating = B.feastTime; bt.t = B.feastTime + 0.5; toast(bossLine('feast'), EMERALD); SFX.play('bait'); }
          boss.eating -= dt;
          if (Math.random() < dt * 1.2) floatText(boss.x + boss.facing * 40, boss.y - 60, pick(['mmh', 'köstlich', 'exquisit']), '#ffb3c1');
          if (boss.eating <= 0) { baits.splice(baits.indexOf(bt), 1); boss.state = 'walk'; boss.t = 1.5; }
        }
        break;
      }
    }
    if (boss.state !== 'slam') { boss.y = floorY; }
    clampX();
    // Kontakt mit Pods: Krallen vorne tun weh, der Körper ist fest (man kann auf ihm stehen)
    const harmless = boss.state === 'stun' || boss.state === 'feast' || boss.state === 'intro';
    const ex = boss.x - boss.facing * 4, ey = boss.y + 4, rx = 54, ry = 46;
    const clawX = boss.x + boss.facing * 62, clawY = boss.y + (boss.state === 'windup' ? 6 : 24);
    for (const pl of targets) {
      pod = pl;
      const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
      if (!harmless && pl.hitCooldown <= 0 && Math.hypot(pcx - clawX, pcy - clawY) < 26 + 14) {
        if (pl.shield > 0) { pl.hitCooldown = 0.4; floatText(clawX, clawY - 20, 'abgeprallt!', '#ffd23f'); }
        else {
          const dmg = Math.round(B.contactDamage * (tier('hull').biteFactor ?? 1));
          pl.hull -= dmg; pl.hitCooldown = D.enemyHitCooldown; pl.koReason = `Von den Diamantkrallen des ${B.name} erwischt!`; pl.koTimer = 0.6;
          state.shake = 0.5; toast(`${who()}Diamantkrallen! −${dmg} HP`); SFX.play('bite'); SFX.play('clink'); SFX.play('bosshurt', { gap: 600, v: 0.5 });
          pl.vx = boss.facing * 320; pl.vy = -260; pl.onGround = false; pl.drill = null;
        }
      }
      const nx = (pcx - ex) / (rx + 12), ny = (pcy - ey) / (ry + 12);
      if (nx * nx + ny * ny < 1 && !pl.drill) {
        if (ny < -0.45) { pl.y = ey - (ry + 12) * Math.sqrt(Math.max(0, 1 - nx * nx)) - pl.h / 2; if (pl.vy > 0) pl.vy = 0; pl.onGround = true; pl.onBoss = true; }
        else { pl.x = (pcx > ex ? ex + (rx + 12) * Math.sqrt(Math.max(0, 1 - ny * ny)) : ex - (rx + 12) * Math.sqrt(Math.max(0, 1 - ny * ny))) - pl.w / 2; pl.vx = 0; }
      }
      // Bohren in den Baron (von hinten oder oben): mühsam, aber möglich
      let dir = null;
      if (pl.keys.down) dir = { x: 0, y: 1 }; else if (pl.keys.left) dir = { x: -1, y: 0 }; else if (pl.keys.right) dir = { x: 1, y: 0 };
      if (dir) {
        const ptx = pl.x + pl.w / 2 + dir.x * (pl.w / 2 + 14), pty = pl.y + pl.h / 2 + dir.y * (pl.h / 2 + 14);
        const inBody = ((ptx - ex) / rx) ** 2 + ((pty - ey) / ry) ** 2 < 1;
        const inClaw = Math.hypot(ptx - clawX, pty - clawY) < 30;
        if (inBody || inClaw) {
          pl.attack = dir;
          if (inClaw && !harmless) { say('bossclaw', B.lines.claws, false, 8); }
          else {
            const dmg = D.drillDamage * stat('drill') * (tier('drill').wormDamage ?? 1) * B.drillFactor * (boss.state === 'stun' ? 2 : 1) * dt;
            hurtBoss(dmg, pl); SFX.play('bosshurt', { gap: 900, v: 0.6 });
            burnFuel('drill', dt);
            if (Math.random() < 0.5) spawnParticle(ptx, pty, Math.random() < 0.5 ? '#40323e' : '#ffd23f', { size: 2 });
            say('bossdrill', B.lines.drill, false, 18);
          }
        }
      }
    }
  }
  function drawBoss(ox, oy) {
    if (!boss) return;
    for (const ch of chandeliers) {
      if (ch.state === 'broken') continue;
      const x = ch.x - ox, y = ch.y - oy, ceil = (LAIR_TOP + 2) * T - oy;
      if (ch.state === 'hang') { ctx.fillStyle = '#8a5a18'; for (let yy = ceil; yy < y - 22; yy += 4) { ctx.fillRect(snap(x) - 1, snap(yy), 2, 3); } }
      blitC(PIXEL.chandelier(), x, y);
    }
    for (const r of bossRocks) blitC(PIXEL.bossRock(), r.x - ox, r.y - oy);
    if (boss.state === 'sleep') return;
    let pose = Math.floor(state.time * 3) % 2 ? 'idle1' : 'idle0';
    if (boss.state === 'windup' || boss.state === 'charge' || boss.state === 'slam') pose = 'raise';
    if (boss.state === 'intro' || boss.state === 'throw' || (boss.state === 'feast' && boss.eating > 0 && Math.floor(state.time * 6) % 2)) pose = 'roar';
    if (boss.state === 'stun') pose = 'stun';
    if (boss.state === 'dead') pose = 'dead';
    const mood = boss.hurt > 0 ? 'hurt' : boss.phase === 3 ? 'rage' : 'normal';
    const img = PIXEL.baron(pose, mood);
    let x = boss.x - ox, y = boss.y - oy;
    if (boss.state === 'intro') y += Math.max(0, boss.t - 0.6) / 1.8 * 110;           // steigt aus dem Boden
    if (boss.state === 'dead') ctx.globalAlpha = Math.max(0, boss.t / 3);
    ctx.save();
    ctx.beginPath(); ctx.rect(-4000, -4000, 9000, FLOOR_Y() - oy + 4000); ctx.clip();
    if (boss.facing > 0) blit(img, x - PIXEL.BOSS_OX, y - PIXEL.BOSS_OY);
    else blit(img, x - (PIXEL.BOSS_W - PIXEL.BOSS_OX), y - PIXEL.BOSS_OY, true);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (boss.state === 'feast' && boss.eating > 0) ptext('BON APPÉTIT', x, y - 120, '#ffb3c1', 'center', true);
  }
  function drawBossBar(sw) {
    if (!boss || !boss.active || (boss.dead && boss.t <= 0)) return;
    if (!players.some(inLair) && !boss.dead) return;
    const w = Math.min(520, sw - 80), x = Math.round((sw - w) / 2), y = 150;
    ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y - 26, w + 12, 50);
    ctx.fillStyle = '#d4a63a'; ctx.fillRect(x - 4, y - 24, w + 8, 46);
    ctx.fillStyle = '#120c20'; ctx.fillRect(x - 2, y - 22, w + 4, 42);
    const t = PIXEL.text(BOSS.name, '#ffd23f', PIXEL.INK, true);
    ctx.drawImage(t, x + Math.round(w / 2 - t.width), y - 22, t.width * 2, t.height * 2);
    const f = Math.max(0, boss.hp / BOSS.hp);
    ctx.fillStyle = '#07040d'; ctx.fillRect(x, y + 4, w, 12);
    ctx.fillStyle = boss.phase === 3 ? '#e8402e' : '#9a1a2a'; ctx.fillRect(x, y + 4, Math.round(w * f), 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y + 4, Math.round(w * f), 3);
    for (const q of [0.33, 0.66]) { ctx.fillStyle = '#000'; ctx.fillRect(x + Math.round(w * q), y + 4, 2, 12); }
  }

  // ---------- Umgebung des Pods: Wasser, Treibsand, Magma, Glatteis ----------
  function environment(dt) {
    const e = { accel: 1, speed: 1, gravity: 1, lift: 0, thrust: 1, maxFall: P.maxFallSpeed, fuel: 1, ice: false };
    if (pod.dead > 0) return e;
    const cx = pod.x + pod.w / 2, c = Math.floor(cx / T);
    const tm = tileAt(c, Math.floor((pod.y + pod.h / 2) / T)), tb = tileAt(c, Math.floor((pod.y + pod.h - 2) / T));
    const fl = isFluid(tm) ? tm : isFluid(tb) ? tb : 0;
    const under = tileAt(c, Math.floor((pod.y + pod.h + 1) / T));
    if (pod.onGround && under === ICE && !pod.drill) {
      e.ice = true; e.accel = 0.5;
      if (Math.abs(pod.vx) > 60) { say('slide', PH.ice.slideMsg, false, 20); if (Math.random() < 0.3) spawnParticle(cx, pod.y + pod.h, '#d8f2ff', { size: 2, vy: -20 }); }
    }
    if (fl && fl !== pod.inFluid) {
      if (fl === WATER) { say('water', pick(PH.water.msg)); SFX.play('splash', { gap: 600 }); }
      if (fl === SAND) { say('sand', pick(PH.quicksand.msg)); SFX.play('sand', { gap: 600 }); }
      if (fl === MAGMA) { say('magma', pick(PH.magma.msg), false, 3); SFX.play('sizzle'); }
    }
    pod.inFluid = fl;
    if (fl === WATER) {
      Object.assign(e, { accel: 0.6, speed: 0.6, gravity: 0.25, lift: 120, thrust: 0.7, maxFall: 110 });
      if (pod.levels.engine === 0) { e.fuel = 3; say('coal', PH.water.coalMsg, false, 12); }
      if (pod.levels.engine === 3 && pod.shield <= 0) { pod.hull -= PH.water.electricDps * dt; pod.koReason = 'Kurzschluss im Wasserbad!'; pod.koTimer = 0.5; say('electric', PH.water.electricMsg, false, 8); if (Math.random() < 0.4) spawnParticle(cx + (Math.random() - 0.5) * 20, pod.y, '#bff8ff', { size: 2, vy: -40 }); }
      if (Math.random() < 0.25) spawnParticle(cx + (Math.random() - 0.5) * 18, pod.y + 6, '#e8f8ff', { size: 2, vy: -70, g: -40, life: 0.6 });
      if (Math.random() < 0.03) SFX.play('bubble', { gap: 150 });
    } else if (fl === SAND) {
      Object.assign(e, { accel: 0.3, speed: 0.35, gravity: 0.2, thrust: 0, maxFall: PH.quicksand.sink || 26, fuel: 2.5, sand: true });
      if (Math.random() < 0.2) spawnParticle(cx + (Math.random() - 0.5) * 22, pod.y + 4, '#e0c080', { size: 2 });
    } else if (fl === MAGMA) {
      Object.assign(e, { accel: 0.5, speed: 0.6, gravity: 0.4, thrust: 0.8, maxFall: 90 });
      if (pod.shield <= 0) { pod.hull -= PH.magma.dps * dt; pod.koReason = 'Im Magma geschmolzen!'; pod.koTimer = 0.5; SFX.play('sizzle', { gap: 450 }); }
      if (Math.random() < 0.5) spawnParticle(cx + (Math.random() - 0.5) * 22, pod.y + pod.h, Math.random() < 0.5 ? '#ffc34a' : '#ff6a1a', { size: 2, vy: -90, life: 0.4 });
    }
    return e;
  }

  // ---------- Vergrabene Bomben ----------
  function updateMines(dt) {
    for (const m of mines) {
      if (m.gone) continue;
      if (!solid(tileAt(m.c, Math.floor(m.y / T)))) { fallBody(m, dt, 12); m.c = Math.floor(m.x / T); }
      if (!m.armed) {
        for (const pl of players) {
          if (pl.dead > 0) continue;
          if (Math.hypot(pl.x + pl.w / 2 - m.x, pl.y + pl.h / 2 - m.y) < m.def.trigger * T + 12) {
            m.armed = true; m.fuse = m.def.fuse; m.owner = pl; m.tick = -1;
            pod = pl; toast(`${who()}${m.def.name} ist scharf! ${m.def.fuse.toFixed(1)} s – nichts wie weg!`); SFX.play('arm');
            if (!storyDone.firstMine) { m.fuse += 1.5; story('firstMine'); }
            state.shake = Math.max(state.shake, 0.15);
            break;
          }
        }
      } else {
        if (!m.defusing) m.fuse -= dt;                     // beim Entschärfen hält auch die Bombe den Atem an
        const tk = Math.floor(m.fuse * 2);
        if (tk !== m.tick) { m.tick = tk; SFX.play('tick', { urgent: m.fuse < 1.2, gap: 20 }); floatText(m.x, m.y - 26, m.fuse < 1.2 ? 'TICK!' : 'tick', m.fuse < 1.2 ? '#ff5a3a' : '#ffd23f'); }
        if (m.fuse <= 0) detonateMine(m);
      }
    }
    mines = mines.filter(m => !m.gone);
  }
  function detonateMine(m) {
    if (m.gone) return;
    m.gone = true;
    explode({ x: m.x, y: m.y, def: { radius: m.def.radius, wormDamage: m.def.wormDamage, selfDamage: m.def.damage, flash: m.def.flash }, owner: m.owner || pod || players[0], mine: m.def });
  }
  const mineAt = (c, r) => mines.find(m => !m.gone && m.c === c && Math.floor(m.y / T) === r);
  function drawMines(ox, oy, vw, vh) {
    for (const m of mines) {
      const x = m.x - ox, y = m.y - oy;
      if (x < -64 || y < -64 || x > vw + 64 || y > vh + 64) continue;
      const buried = solid(tileAt(m.c, Math.floor(m.y / T)));
      const near = players.some(pl => pl.dead <= 0 && Math.hypot(pl.x + pl.w / 2 - m.x, pl.y + pl.h / 2 - m.y) < (m.def.trigger + 3) * T);
      if (buried && !near && !m.armed) continue;           // erst in der Nähe sichtbar (der Metalldetektor piept)
      if (m.armed) {
        const blink = Math.floor(state.time * (m.fuse < 1.2 ? 14 : 6)) % 2;
        if (blink) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff3a2a'; ctx.beginPath(); ctx.arc(x, y, (m.def.radius + 1) * T, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      }
      ctx.globalAlpha = buried && !m.armed ? 0.55 + 0.2 * Math.sin(state.time * 5) : 1;
      blitC(PIXEL.icon('mine_' + m.def.id), x, y);
      ctx.globalAlpha = 1;
      if (m.armed) ptext(Math.max(0, m.fuse).toFixed(1), x, y - 30, m.fuse < 1.2 ? '#ff5a3a' : '#ffd23f', 'center', true);
      else if (buried) ptext('?!', x, y - 26, '#ff9a3a', 'center', true);
    }
  }

  // ---------- Flüssigkeiten: Wasser fliesst, Magma kriecht, Treibsand rieselt ----------
  let flowAcc = 0, flowTick = 0, flowStamp = null;
  function updateFluids(dt) {
    flowAcc += dt;
    if (flowAcc < 0.1) return;
    flowAcc = 0; flowTick = (flowTick + 1) & 0xffff;
    if (!flowStamp || flowStamp.length !== world.length) flowStamp = new Uint16Array(world.length);
    const steps = [];
    for (let r = H - 2; r >= SURF; r--) {
      const ltr = (r + flowTick) & 1;
      for (let k = 1; k < W - 1; k++) {
        const c = ltr ? k : W - 1 - k, i = r * W + c, t = world[i];
        if (t !== WATER && t !== MAGMA && t !== SAND) continue;
        if (flowStamp[i] === flowTick) continue;
        if (t === MAGMA && flowTick % 3) continue;           // Magma ist zäh
        if (t === SAND && flowTick % 2) continue;
        // Wasser trifft Magma -> Obsidian
        if (t === MAGMA) for (const j of [i - 1, i + 1, i - W, i + W]) if (world[j] === WATER) { world[i] = ROCK; world[j] = EMPTY; steps.push(i); break; }
        if (world[i] !== t) continue;
        const below = i + W;
        if (world[below] === EMPTY) { world[below] = t; world[i] = EMPTY; flowStamp[below] = flowTick; continue; }
        if (t === SAND) continue;                            // Treibsand rieselt nur nach unten
        const side = Math.random() < 0.5 ? 1 : -1;
        for (const d of [side, -side]) {
          const j = i + d;
          if (world[j] === EMPTY && (world[j + W] === EMPTY || Math.random() < (t === WATER ? 0.35 : 0.12))) { world[j] = t; world[i] = EMPTY; flowStamp[j] = flowTick; break; }
        }
      }
    }
    for (const i of steps) {
      const x = (i % W) * T + T / 2, y = Math.floor(i / W) * T + T / 2;
      for (let k = 0; k < 6; k++) spawnParticle(x, y, '#d8d8e0', { vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, g: -30, size: 8, grow: 14, round: true, life: 1 });
      if (players.some(pl => Math.hypot(pl.x - x, pl.y - y) < 10 * T)) { pod = players[0]; say('obsidian', PH.magma.obsidianMsg, true, 15); SFX.play('steam', { gap: 600 }); }
    }
  }

  // ---------- Erdbeben & Steinschlag ----------
  let rocks = [];
  function startQuake(fromFault) {
    if (state.quake > 0) return;
    state.quake = PH.quake.duration; SFX.play('quake');
    toast(fromFault ? `${who()}${PH.quake.faultMsg}` : pick(PH.quake.msg));
  }
  function updateQuake(dt) {
    const deep = players.some(pl => pl.dead <= 0 && areaIndexAt(Math.floor((pl.y + pl.h) / T) - SURF) >= PH.quake.fromArea - 1 && pl.y > (SURF + 5) * T);
    if (deep && state.quake <= 0) {
      state.nextQuake -= dt;
      if (state.nextQuake <= 0) { state.nextQuake = PH.quake.randomEvery[0] + Math.random() * (PH.quake.randomEvery[1] - PH.quake.randomEvery[0]); startQuake(false); }
    }
    if (state.quake > 0) {
      state.quake -= dt;
      state.shake = Math.max(state.shake, 0.22);
      state.rockAcc += dt;
      while (state.rockAcc > 0.16) { state.rockAcc -= 0.16; spawnRock(); }
    }
    for (const rk of rocks) {
      rk.vy = Math.min(600, rk.vy + P.gravity * dt); rk.y += rk.vy * dt;
      for (const pl of players) {
        if (pl.dead > 0 || rk.dead) continue;
        if (Math.hypot(pl.x + pl.w / 2 - rk.x, pl.y + pl.h / 2 - rk.y) < 20) {
          rk.dead = true;
          if (pl.shield > 0) continue;
          pl.hull -= PH.quake.rockDamage; pl.koReason = 'Vom Steinschlag erwischt!'; pl.koTimer = 0.6;
          pod = pl; say('rock', `${PH.quake.rockMsg} −${PH.quake.rockDamage} HP`, false, 2.5); SFX.play('rockhit');
          for (let k = 0; k < 8; k++) spawnParticle(rk.x, rk.y, '#6a6070', { size: 3 });
        }
      }
      const c = Math.floor(rk.x / T), r = Math.floor((rk.y + 7) / T);
      if (!rk.dead && solid(tileAt(c, r))) {
        rk.dead = true;
        const rr = Math.floor(rk.y / T);
        const blocked = players.some(pl => Math.floor((pl.x + pl.w / 2) / T) === c && Math.abs(Math.floor((pl.y + pl.h / 2) / T) - rr) <= 1);
        if (!blocked && tileAt(c, rr) === EMPTY && Math.random() < 0.5) setTile(c, rr, DIRT);   // Geröll bleibt liegen
        SFX.play('rockland', { gap: 90 });
        for (let k = 0; k < 6; k++) spawnParticle(rk.x, rk.y, '#7a6a5a', { size: 3 });
      }
    }
    rocks = rocks.filter(rk => !rk.dead && rk.y < H * T);
  }
  function spawnRock() {
    const alive = players.filter(pl => pl.dead <= 0);
    if (!alive.length) return;
    const pl = pick(alive);
    const pc = Math.floor((pl.x + pl.w / 2) / T), pr = Math.floor(pl.y / T);
    const c = pc + Math.floor(Math.random() * 13) - 6;
    if (c <= 0 || c >= W - 1) return;
    for (let r = pr + 2; r >= Math.max(SURF + 1, pr - 10); r--) {
      if (tileAt(c, r) === EMPTY && solid(tileAt(c, r - 1))) {
        if (tileAt(c, r - 1) === DIRT && Math.random() < 0.35) setTile(c, r - 1, EMPTY); // die Decke bröckelt
        rocks.push({ x: c * T + T / 2 + (Math.random() - 0.5) * 12, y: r * T + 6, vy: 0, ai: areaIndexAt(r - SURF) });
        return;
      }
    }
  }
  function drawRocks(ox, oy) { for (const rk of rocks) blitC(PIXEL.rubble(rk.ai), rk.x - ox, rk.y - oy); }

  function updatePlayer(dt) {
    if (pod.dead > 0) {
      pod.dead -= dt;
      if (pod.dead <= 0) respawn(pod);
      return;
    }
    pod.thrusting = false;
    pod.prevX = pod.x; pod.prevY = pod.y;

    const env = environment(dt);
    if (pod.drill) {
      updateDrill(dt);
    } else {
      const eng = tier('engine');
      const keys = pod.frozen > 0 || pod.defusing ? {} : pod.keys;
      if (pod.frozen > 0) { pod.frozen -= dt; pod.vx *= Math.exp(-10 * dt); }
      if (keys.left) { pod.vx -= P.moveAccel * eng.speed * env.accel * dt; pod.facing = -1; }
      else if (keys.right) { pod.vx += P.moveAccel * eng.speed * env.accel * dt; pod.facing = 1; }
      else pod.vx *= Math.exp((pod.onGround ? (env.ice ? -0.6 : -12) : -2.5) * dt);
      const maxX = P.maxSpeedX * eng.speed * env.speed;
      pod.vx = Math.max(-maxX, Math.min(maxX, pod.vx));

      pod.vy += P.gravity * env.gravity * dt - env.lift * dt;
      if (keys.up && pod.fuel > 0) {
        if (!pod.wasThrusting && pod.levels.engine === 2) backfire(); // V12 knallt beim Abheben
        pod.vy -= P.thrust * eng.value * env.thrust * dt; pod.thrusting = true;
        if (env.sand) {   // Treibsand: Schub wirkungslos, der Pod sinkt weiter
          pod.vy = Math.max(pod.vy, (PH.quicksand.sink || 26) * 0.6);
          say('sandthrust', PH.quicksand.thrustMsg, false, 8);
          if (Math.random() < 0.6) spawnParticle(pod.x + pod.w / 2 + (Math.random() - 0.5) * 20, pod.y + pod.h, '#e0c080', { size: 2, vy: -60 - Math.random() * 40 });
        }
      }
      if (env.sand) pod.vy = Math.max(pod.vy, (PH.quicksand.sink || 26) * 0.6);
      pod.wasThrusting = pod.thrusting;
      pod.vy = Math.max(-P.maxSpeedUp * eng.speed, Math.min(env.maxFall, pod.vy));

      if (pod.onGround && !keys.up && !(pod.frozen > 0) && !pod.defusing) {
        if (pod.keys.down) tryDrill(0, 1);
        else if (pod.keys.left && pod.blockedL) tryDrill(-1, 0);
        else if (pod.keys.right && pod.blockedR) tryDrill(1, 0);
      }

      if (!pod.drill) {
        pod.blockedL = pod.blockedR = false;
        pod.onGround = false;
        moveX(pod.vx * dt);
        moveY(pod.vy * dt);
      }

      if (pod.frozen > 0) {   // Eingefroren: der Motor heizt mit Volllast, bis das Eis geschmolzen ist
        burnFuel('thrust', dt, PH.ice.thawFuel || 2.5);
        say('thaw', PH.ice.thawMsg, false, 10);
        if (Math.random() < 0.5) spawnParticle(pod.x + pod.w / 2 + (Math.random() - 0.5) * 22, pod.y + 2, Math.random() < 0.5 ? '#e8f8ff' : '#bfe8ff', { size: 2, vy: -50, g: -30, life: 0.7 });
      } else burnFuel(pod.thrusting ? 'thrust' : (pod.keys.left || pod.keys.right) ? 'move' : 'idle', dt, env.fuel);
    }
    engineEffects(dt);
    pod.shield = Math.max(0, pod.shield - dt);
    pod.torch = Math.max(0, pod.torch - dt);
    {
    }

    const depth = Math.max(0, Math.floor((pod.y + pod.h) / T) - SURF);
    pod.maxDepth = Math.max(pod.maxDepth, depth);
    updateTow();
    checkLoveMilestones();
    const ai = areaIndexAt(depth);
    if (ai > (pod.areaReached || 0)) {
      pod.areaReached = ai;
      const a = AREAS[ai];
      toast(`${who()}Area ${ai + 1} erreicht: ${a.name}! Neues Erz, stärkere Würmer.`, EMERALD); SFX.play('area');
      story('area' + (ai + 1));
    }

    pod.koTimer = Math.max(0, (pod.koTimer || 0) - dt);
    if (pod.hull <= 0) pod.koTitle = 'Totalschaden!';
    if (pod.hull <= 0) knockout(pod.koTimer > 0 && pod.koReason ? pod.koReason : pod.hitCooldown > 0 && pod.lastHitBy ? `Gefressen von ${pod.lastHitBy}!` : 'Pod ist Schrott!');
    else if (pod.fuel <= 0) { pod.fuel = 0; pod.koTitle = 'Tank leer!'; knockout(`Tank leer – ${tier('engine').fuel} aufgebraucht! ${D.fuelEmptyMsg}`); }
  }

  // Ausgeschieden: Abschleppdienst bringt den Pod nach 3 s zurück an die Oberfläche
  function scoreOf(pl) {
    const sc = D.score;
    const meters = pl.maxDepth * D.world.metersPerTile;
    const parts = {
      money: Math.round(pl.money * sc.moneyFactor),
      depth: meters * sc.perMeter,
      artifacts: pl.artifacts.length * sc.perArtifact,
      boss: pl.bossKill ? (sc.perBoss || 0) : 0,
    };
    return { ...parts, total: parts.money + parts.depth + parts.artifacts + parts.boss, meters };
  }
  function scoreHtml(pl) {
    const s = scoreOf(pl);
    return `<table>
      <tr><td>Vermögen</td><td class="num muted">${fmt(pl.money)}</td><td class="num">${s.money.toLocaleString('de-CH')}</td></tr>
      <tr><td>Tiefenrekord</td><td class="num muted">${s.meters} m</td><td class="num">${s.depth.toLocaleString('de-CH')}</td></tr>
      <tr><td>Artefakte geborgen</td><td class="num muted">${pl.artifacts.length} / ${D.artifacts.length}</td><td class="num">${s.artifacts.toLocaleString('de-CH')}</td></tr>
      ${BOSS ? `<tr><td>${BOSS.name}</td><td class="num muted">${pl.bossKill ? 'besiegt' : '—'}</td><td class="num">${s.boss.toLocaleString('de-CH')}</td></tr>` : ''}
    </table>
    <div class="balance"><span>Punkte</span><b>${s.total.toLocaleString('de-CH')}</b></div>`;
  }

  function endButtons() {
    const keys = multi() ? 'E / M' : 'E';
    return `<div class="actions"><button class="gold" data-act="restart">Nochmal spielen (${keys})</button>
      <button class="secondary" data-act="menu">Hauptmenü</button></div>`;
  }

  function knockout(reason) {
    SFX.play('ko');
    if (!multi()) { gameOver(reason); return; }
    const fee = Math.round(pod.money * 0.25);
    pod.money -= fee;
    pod.cargo = [];
    pod.drill = null;
    if (pod.towing) dropTow();
    pod.dead = 3;
    state.shake = 0.5;
    for (let k = 0; k < 30; k++) spawnParticle(pod.x + pod.w / 2, pod.y + pod.h / 2, k % 2 ? pod.body[1] : '#1b1b1b');
    toast(`${who()}${reason} Abschleppdienst −${fmt(fee)}, Tresor verloren.`);
  }

  function respawn(pl) {
    pod = pl;
    // Abschleppdienst stellt den Pod vor der Tankstelle ab (Marmorboden, kann nicht weggegraben werden)
    const fuelSt = D.stations.find(st => st.id === 'fuel');
    const col = fuelSt ? fuelSt.x + 1 + pl.idx : pl.spawn;
    pl.x = col * T + (T - pl.w) / 2; pl.y = SURF * T - pl.h;
    pl.vx = pl.vy = 0; pl.onGround = true;
    pl.fuel = stat('tank'); pl.hull = stat('hull');
    pl.hitCooldown = 1.5;
  }

  // Einzelspieler: Bankrott = Spielende
  function gameOver(reason) {
    if (!state.koStory) {
      state.koStory = true; state.paused = true;
      story(pod.koTitle === 'Tank leer!' ? 'gameOverFuel' : 'gameOverHull', () => gameOver(reason));
      return;
    }
    SFX.play('gameover');
    state.over = true;
    state.paused = true;
    panelEl.innerHTML = cardHead('SPIEL VORBEI', pod.koTitle || 'Bankrott!', '#1b1b1b') + `<div class="card-body">
      <div class="tagline">${reason}</div>
      ${scoreHtml(pod)}
      ${endButtons()}</div>`;
    panelEl.classList.remove('hidden');
  }
  panelEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && b.dataset.act === 'restart') newGame();
    if (b && b.dataset.act === 'menu') showMenu();
  });

  // ---------- Rendering ----------
  const cam = { x: 0, y: 0, zoom: 1 };
  const bgPatterns = [];
  function bgPattern(i) {
    if (!bgPatterns[i]) {
      const src = PIXEL.bgTile(i), [c, g] = PIXEL.mk(src.width, src.height);
      g.drawImage(src, 0, 0, c.width, c.height);
      bgPatterns[i] = ctx.createPattern(c, 'repeat');
    }
    return bgPatterns[i];
  }
  let darkCanvas = null;
  const STARS = Array.from({ length: 90 }, () => ({
    x: Math.random() * W * T, y: -T * 6 + Math.random() * T * (SURF + 2),
    s: Math.random() < 0.15 ? 2 : 1, tw: 0.3 + Math.random() * 1.5, ph: Math.random() * 6,
  }));

  function render() {
    // Gemeinsame Kamera: Mitte zwischen beiden Pods, zoomt heraus, wenn sie sich entfernen
    const sw = canvas.width, sh0 = canvas.height;
    const focus = players.filter(pl => pl.dead <= 0);
    const fp = focus.length ? focus : players;
    let minX = Infinity, maxX2 = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pl of fp) {
      minX = Math.min(minX, pl.x); maxX2 = Math.max(maxX2, pl.x + pl.w);
      minY = Math.min(minY, pl.y); maxY = Math.max(maxY, pl.y + pl.h);
    }
    const spanX = maxX2 - minX + 420, spanY = maxY - minY + 340;
    // Einzelspieler: näher dran – sichtbar ist nur ~50 % der Kartenbreite (alles doppelt so gross)
    const targetZoom = multi()
      ? Math.max(0.45, Math.min(1, sw / spanX, sh0 / spanY))
      : Math.max(1.6, Math.min(3, sw / (W * T * D.camera.singleViewWidth)));
    // Salon des Barons: Kamera rastet ein – Decke, Kronleuchter und Boss immer gleichzeitig im Bild
    const lairCam = BOSS && players.every(pl => pl.dead > 0 || inLair(pl));
    const tz = lairCam ? Math.min(targetZoom, sh0 / ((LAIR_ROWS - 1) * T)) : targetZoom;
    cam.zoom += (tz - cam.zoom) * 0.08;
    const z = cam.zoom;
    const vw = sw / z, vh = sh0 / z;
    ctx.setTransform(z, 0, 0, z, 0, 0);
    const targetX = (minX + maxX2) / 2 - vw / 2;
    const targetY = lairCam ? H * T - vh : (minY + maxY) / 2 - vh / 2;
    cam.x += (targetX - cam.x) * 0.15;
    cam.y += (targetY - cam.y) * 0.15;
    const maxX = Math.max(0, W * T - vw);
    cam.x = Math.max(Math.min(0, (W * T - vw) / 2), Math.min(maxX, cam.x));
    if (W * T < vw) cam.x = (W * T - vw) / 2;
    cam.y = Math.max(-T * 6, Math.min(H * T - vh, cam.y));
    const sh = state.shake * 22;
    const ox = snap(cam.x + (Math.random() - 0.5) * sh), oy = snap(cam.y + (Math.random() - 0.5) * sh);
    ctx.imageSmoothingEnabled = false;

    // Himmel: gestufter 16-Bit-Verlauf, Sterne, Skyline der Villen
    const skyBottom = SURF * T - oy;
    const skyTop = -T * 10;
    if (skyBottom > 0) {
      ctx.fillStyle = '#06040e'; ctx.fillRect(0, 0, vw, Math.max(0, skyTop - oy));
      const strip = PIXEL.skyStrip(Math.round(SURF * T - skyTop));
      const sw16 = strip.width;
      for (let x = -(((ox % sw16) + sw16) % sw16); x < vw; x += sw16) ctx.drawImage(strip, x, skyTop - oy);
      for (const st of STARS) {
        if (Math.sin(state.time * st.tw + st.ph) < -0.6) continue;
        pxRect(st.x - ox * 0.6, st.y - oy, st.s, st.s, st.s > 1 ? '#fff6d8' : '#c8c0e0');
      }
      const sk = PIXEL.skyline(), skw = sk.width;
      const sx0 = -((((ox * 0.5) % skw) + skw) % skw);
      for (let x = sx0; x < vw; x += skw) ctx.drawImage(sk, x, skyBottom - sk.height + 6 * PXS, skw, sk.height);
    }
    // Untergrund: Parallax-Hintergrund pro Area (sichtbar in den gegrabenen Gängen)
    AREAS.forEach((a, i) => {
      const top = Math.max(0, (SURF + i * AREA_TILES) * T - oy), bot = Math.min(vh, (SURF + (i + 1) * AREA_TILES) * T - oy);
      if (bot <= top) return;
      const pat = bgPattern(i), size = PIXEL.bgTile(i).width;
      const px = -(((ox * 0.6) % size) + size) % size, py = -(((oy * 0.6) % size) + size) % size;
      ctx.save(); ctx.beginPath(); ctx.rect(0, top, vw, bot - top); ctx.clip();
      ctx.translate(px, py); ctx.fillStyle = pat; ctx.fillRect(-px, top - py, vw, bot - top);
      ctx.restore();
    });
    // Salon des Barons: Damasttapete und Ahnengalerie
    if (LAIR_ROWS) {
      const top = Math.max(0, LAIR_TOP * T - oy), bot = Math.min(vh, (H - 1) * T - oy);
      if (bot > top) {
        if (!salonPattern) salonPattern = ctx.createPattern(PIXEL.salonTile(), 'repeat');
        ctx.save(); ctx.beginPath(); ctx.rect(0, top, vw, bot - top); ctx.clip();
        ctx.translate(-ox, -oy); ctx.fillStyle = salonPattern; ctx.fillRect(ox, oy + top, vw, bot - top);
        ctx.restore();
        [[4, 0], [11, 1], [W - 14, 2], [W - 7, 3]].forEach(([c, v]) => blit(PIXEL.portrait(v), c * T - ox, (LAIR_TOP + 2) * T + 10 - oy));
      }
    }
    // ausserhalb der Welt
    ctx.fillStyle = '#0a0812';
    if (-ox > 0) ctx.fillRect(0, 0, -ox, vh);
    if (W * T - ox < vw) ctx.fillRect(W * T - ox, 0, vw, vh);

    // Gebäude
    for (const s of D.stations) {
      if (s.id === 'tower') drawTower(s, ox, oy);
      else if (s.id === 'museum') drawMuseum(s, ox, oy);
      else drawStation(s, ox, oy);
    }

    // Tiles
    magmaLights.length = 0;
    const c0 = Math.max(0, Math.floor(ox / T)), c1 = Math.min(W - 1, Math.floor((ox + vw) / T));
    const r0 = Math.max(0, Math.floor(oy / T)), r1 = Math.min(H - 1, Math.floor((oy + vh) / T));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = world[r * W + c];
        if (t === EMPTY) continue;
        drawTile(t, c, r, c * T - ox, r * T - oy);
      }
    }

    drawAreaMarkers(ox, oy, vw, vh);
    drawWorms(ox, oy, vw, vh);
    drawArtifacts(ox, oy);
    drawMines(ox, oy, vw, vh);
    drawBoss(ox, oy);
    drawRocks(ox, oy);
    drawBaits(ox, oy);
    drawBombs(ox, oy);

    // Partikel
    for (const p of particles) {
      ctx.globalAlpha = p.round ? Math.max(0, p.life / p.maxLife) * 0.85 : Math.max(0, Math.min(1, p.life * 2));
      if (p.round) blitC(PIXEL.disc(Math.max(1, Math.round(p.size / 2)), smokeRamp(p.color), false), p.x - ox, p.y - oy);
      else { const n = Math.max(1, Math.round(p.size)); ctx.fillStyle = p.color; ctx.fillRect(snap(p.x - ox - n / 2), snap(p.y - oy - n / 2), n, n); }
    }
    ctx.globalAlpha = 1;

    // Pods (blinken nach einem Treffer)
    for (const pl of players) {
      if (pl.dead > 0) continue;
      pod = pl;
      if (pod.hitCooldown <= 0 || Math.floor(state.time * 14) % 2 === 0) drawPod(pod.x - ox, pod.y - oy);
      if (pod.shield > 0) drawShield(pod.x - ox, pod.y - oy);
      if (pod.frozen > 0) blitC(PIXEL.frost(), pod.x + pod.w / 2 - ox, pod.y + pod.h / 2 - oy - 2);
    }
    drawButler(ox, oy);   // Fernand steht vor dem Pod

    // Dunkelheit in der Tiefe – jeder Pod hat seinen eigenen Lichtkegel
    const depthTiles = (cam.y + vh / 2) / T - SURF;
    const torchOn = players.some(pl => pl.torch > 0 && pl.dead <= 0);
    const dark = Math.max(0, Math.min(0.88, depthTiles / 45)) * (torchOn ? 0.25 : 1);
    if (dark > 0) {
      if (!darkCanvas || darkCanvas.width !== sw || darkCanvas.height !== sh0) {
        darkCanvas = document.createElement('canvas');
        darkCanvas.width = sw; darkCanvas.height = sh0;
      }
      const dc = darkCanvas.getContext('2d');
      dc.setTransform(1, 0, 0, 1, 0, 0);
      dc.globalCompositeOperation = 'source-over';
      dc.clearRect(0, 0, sw, sh0);
      dc.fillStyle = `rgba(0,0,0,${dark})`;
      dc.fillRect(0, 0, sw, sh0);
      dc.globalCompositeOperation = 'destination-out';
      for (const pl of players) {
        if (pl.dead > 0) continue;
        const px = (pl.x + pl.w / 2 - ox) * z, py = (pl.y + pl.h / 2 - oy) * z;
        const r1 = 70 * z, r2 = 380 * z;
        const rg = dc.createRadialGradient(px, py, r1, px, py, r2);
        rg.addColorStop(0, 'rgba(0,0,0,1)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        dc.fillStyle = rg;
        dc.fillRect(px - r2, py - r2, r2 * 2, r2 * 2);
      }
      if (boss && LAIR_ROWS && (LAIR_TOP + 2) * T - oy < vh) { // Kronleuchter & Baron leuchten
        const lights = chandeliers.filter(ch => ch.state !== 'broken').map(ch => [ch.x - ox, ch.y - oy, 190]);
        if (boss.active) lights.push([boss.x - ox, boss.y - oy, 130]);
        for (const [lx, ly, lr] of lights) {
          const px = lx * z, py = ly * z, rr = lr * z;
          const rg = dc.createRadialGradient(px, py, 0, px, py, rr);
          rg.addColorStop(0, 'rgba(0,0,0,0.95)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
          dc.fillStyle = rg; dc.fillRect(px - rr, py - rr, rr * 2, rr * 2);
        }
      }
      for (const [mx, my] of magmaLights) { // Magma leuchtet
        const px = mx * z, py = my * z, rr = 60 * z;
        const rg = dc.createRadialGradient(px, py, 0, px, py, rr);
        rg.addColorStop(0, 'rgba(0,0,0,0.8)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
        dc.fillStyle = rg; dc.fillRect(px - rr, py - rr, rr * 2, rr * 2);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(darkCanvas, 0, 0);
      ctx.setTransform(z, 0, 0, z, 0, 0);
    }

    drawWormEyes(ox, oy, vw, vh);
    drawPickups(ox, oy);
    drawWormHp(ox, oy);
    drawFloats(ox, oy);
    drawPlayerTags(ox, oy);
    drawTorchArrows(ox, oy);

    // ab hier wieder Bildschirmkoordinaten
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    {
      const vw = sw, vh = sh0;
    // Gefahr: roter, pulsierender Rand
    if (state.danger > 0.02 || state.shake > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(state.time * 8);
      const a = Math.min(0.55, state.danger * 0.45 * pulse + state.shake * 0.9);
      const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
      vg.addColorStop(0, 'rgba(110,20,35,0)');
      vg.addColorStop(1, `rgba(110,20,35,${a})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, vw, vh);
    }
    }

    drawBossBar(sw);
    if (state.flash > 0) { ctx.fillStyle = `rgba(255,250,230,${Math.min(1, state.flash)})`; ctx.fillRect(0, 0, sw, sh0); }
    updateHud();
    drawShopPreview();
  }

  // Nummer über jedem Pod + Hinweis, wenn er vor einem Gebäude steht
  function drawPlayerTags(ox, oy) {
    for (const pl of players) {
      if (pl.dead > 0) continue;
      pod = pl;
      const x = pl.x + pl.w / 2 - ox, y = pl.y - oy - 30;
      const s = currentStation();
      if (s && !state.paused) {
        const sg = PIXEL.sign(`${pl.actionLabel}: ${s.name}`, '#b8862a');
        blit(sg, x - sg.width / 2, y - 34);
      } else if (chandelierNear(pl) && !state.paused) {
        const sg = PIXEL.sign('BOMBE HIER = HAFTLADUNG AM KRONLEUCHTER', '#9a1a2a');
        blit(sg, x - sg.width / 2, y - 34);
      }
      if (!multi()) continue;
      blitC(PIXEL.disc(10, PIXEL.ramp(pl.color)), x, y);
      ptext(pl.short, x, y - 8, '#ffffff', 'center', true);
    }
  }

  // Gestrichelte Pixel-Linie + Schild an jeder Area-Grenze
  function drawAreaMarkers(ox, oy, vw, vh) {
    if (LAIR_ROWS) {
      const y = LAIR_TOP * T - oy;
      if (y > -40 && y < vh + 40) {
        for (let x = -ox; x < W * T - ox; x += 8 * PXS) pxRect(x, y - PXS, 4, 1, '#c8202a');
        const sg = PIXEL.sign(`SALON DU ${BOSS.name} · ${AREAS.length * D.areaDepth} M · PRIVAT!`, '#9a1a2a');
        blit(sg, Math.max(10, -ox + T * 1.5), y - sg.height / 2);
      }
    }
    AREAS.forEach((a, i) => {
      const y = (SURF + i * AREA_TILES) * T - oy;
      if (i === 0 || y < -40 || y > vh + 40) return;
      for (let x = -ox; x < W * T - ox; x += 8 * PXS) pxRect(x, y - PXS, 4, 1, a.look.accent);
      const sg = PIXEL.sign(`AREA ${i + 1} · ${a.name} · ${i * D.areaDepth} M`, a.look.accent);
      blit(sg, Math.max(10, -ox + T * 1.5), y - sg.height / 2);
    });
  }

  // ---------- Shop-Vorschau ----------
  function drawShopPreview() {
    const cv = document.getElementById('shop-preview');
    if (!cv || state.panel !== 'shop' || !state.panelPlayer) return;
    const owner = state.panelPlayer;
    const cat = state.previewCat;
    const levels = { ...owner.levels };
    let next = null;
    if (cat && owner.levels[cat] < maxLevel(cat)) { levels[cat]++; next = D.upgrades[cat][levels[cat]]; }

    // Beschriftung nur bei Änderung neu setzen
    const key = `${cat}|${levels[cat]}`;
    if (state.previewKey !== key) {
      state.previewKey = key;
      const capEl = document.getElementById('shop-preview-caption');
      const catDef = D.upgradeCategories.find(c => c.id === cat);
      if (next) capEl.innerHTML = `<span class="tag">NACH DEM KAUF</span><b>${next.name}</b><br><span class="muted">${catDef.name} · ${next.value}${catDef.unit}</span>`;
      else if (cat) capEl.innerHTML = `<span class="tag grey">BEREITS MAXIMAL</span><b>${D.upgrades[cat][owner.levels[cat]].name}</b>`;
      else capEl.innerHTML = `<span class="tag grey">IHR POD HEUTE</span><span class="muted">Fahren Sie mit der Maus über ein Upgrade.</span>`;
    }

    // Leinwand scharf halten
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(cv.clientWidth * dpr), ch = Math.round(cv.clientHeight * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const pc = cv.getContext('2d');
    pc.setTransform(1, 0, 0, 1, 0, 0);
    pc.imageSmoothingEnabled = false;
    const bg = pc.createRadialGradient(cw / 2, ch * 0.45, 10, cw / 2, ch * 0.45, cw * 0.7);
    bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#e6dcc4');
    pc.fillStyle = bg; pc.fillRect(0, 0, cw, ch);

    const sc = Math.min(cw / 42, ch / 60);
    const ox = cw / 2 - 12 * sc, oy = ch * 0.56 - 12 * sc;
    // Boden + Schatten
    pc.fillStyle = '#5a3d2a'; pc.fillRect(0, oy + 24 * sc, cw, ch);
    pc.fillStyle = '#d4a63a'; pc.fillRect(0, oy + 24 * sc, cw, 2 * dpr);
    // Glanz beim neuen Teil
    if (next) {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 4);
      const gl = pc.createRadialGradient(cw / 2, oy + 10 * sc, 0, cw / 2, oy + 10 * sc, 30 * sc);
      gl.addColorStop(0, `rgba(255,214,90,${0.35 * pulse})`); gl.addColorStop(1, 'rgba(255,214,90,0)');
      pc.fillStyle = gl; pc.fillRect(0, 0, cw, ch);
    }

    const savedCtx = ctx, savedPod = pod;
    ctx = pc;
    pod = {
      ...owner, levels, x: 0, y: 0, vx: 0, facing: 1, drill: null, noAnim: true,
      attack: cat === 'drill' ? { x: 0, y: 1 } : null,            // Bohrer dreht sich
      thrusting: cat === 'engine' ? state.time % 2.2 < 1.4 : false, // Antrieb zündet im Takt
    };
    try {
      pc.setTransform(sc, 0, 0, sc, ox, oy);
      drawPod(0, 0);
    } finally {
      ctx = savedCtx; pod = savedPod;
    }
  }

  // ---------- Tiles im Pixel-Stil ----------
  function tileArea(c, r) {
    const parts = rowLook[r].parts;
    if (parts.length > 1 && shade[r * W + c] < parts[1].w) return parts[1].i;
    return parts[0].i;
  }
  function drawLawn(x, y, c) { // gepflegter Golfrasen an der Oberfläche
    pxRect(x, y, 16, 3, '#3f8f3a'); pxRect(x, y, 16, 1, '#8fdc68'); pxRect(x, y, 16, 0.5, '#c4f29a');
    // feine Halme (1 px) über der Kante
    for (let k = 0; k < 32; k += 3) {
      const hx = x + (k * 7 + c * 11) % 32, hh = 2 + (k * 13 + c * 5) % 3;
      ctx.fillStyle = (k + c) % 2 ? '#6fc050' : '#8fdc68'; ctx.fillRect(snap(hx), snap(y - hh), 1, hh);
    }
    for (let k = 0; k < 32; k += 5) { ctx.fillStyle = '#2f7a30'; ctx.fillRect(snap(x + (k * 3 + c * 7) % 32), snap(y + 3), 1, 2); }
    pxRect(x, y + 3 * PXS, 16, 1, '#24502a');
  }
  const tileHash = (c, r) => { const h = Math.sin(c * 127.1 + r * 311.7) * 43758.5453; return h - Math.floor(h); };
  const hEdge = (c, r) => Math.floor(tileHash(c * 3.7 + 17.3, r * 1.9 + 5.1) * PIXEL.EDGE_CODES);   // Kante über Tile (c,r)
  const vEdge = (c, r) => Math.floor(tileHash(c * 2.3 + 41.7, r * 4.1 + 9.9) * PIXEL.EDGE_CODES);   // Kante links von Tile (c,r)
  const magmaLights = [];
  function drawTile(t, c, r, x, y) {
    if (isFluid(t)) {
      const kind = t === WATER ? 'water' : t === MAGMA ? 'magma' : 'quicksand';
      const fr = Math.floor(state.time * (t === MAGMA ? 3 : t === SAND ? 2 : 6)) % 4;
      ctx.drawImage(PIXEL.fluid(kind, fr, tileAt(c, r - 1) !== t), x, y);
      if (t === MAGMA && magmaLights.length < 40) magmaLights.push([x + T / 2, y + T / 2]);
      return;
    }
    const s = shade[r * W + c];
    const v = Math.floor(s * 4) % 4;
    const ai = tileArea(c, r);
    let img;
    // Erde: 5 nahtlose Varianten, gewichtet gewählt (ruhige häufig, detailreiche selten)
    // Wang-Kantencodes: Nachbarn teilen sich den Code ihrer gemeinsamen Kante
    const edges = `${hEdge(c, r)}${vEdge(c + 1, r)}${hEdge(c, r + 1)}${vEdge(c, r)}`;
    if (t === DIRT || t === ARTIFACT) img = PIXEL.tile('dirt', ai, PIXEL.dirtVariant(tileHash(c, r)), null, edges);
    else if (isOre(t)) img = PIXEL.tile('ore', ai, v, oreOf(t).color, edges, oreOf(t).form);
    else if (t === ROCK) img = PIXEL.tile('rock', ai, v, null, edges);
    else if (t === BEDROCK) img = PIXEL.tile('bedrock', 0, v);
    else if (t === ICE) img = PIXEL.iceTile(v);
    else if (t === FAULT) img = PIXEL.faultTile(ai, edges, Math.floor(state.time * 3) % 2);
    else img = PIXEL.tile('concrete', 0, v);
    ctx.drawImage(img, x, y, T, T);
    // Kanten zu freien Gängen: Licht oben, harte Schatten unten (typisch 16-Bit)
    if (t !== CONCRETE && t !== BEDROCK) {
      const P = PIXEL.areaPal(ai), pal = t === ROCK ? P.rock : P.dirt;
      if (!solid(tileAt(c, r - 1))) {
        if (r === SURF) drawLawn(x, y, c);
        else { pxRect(x, y, 16, 0.5, pal[4]); pxRect(x, y + 1, 16, 1, pal[3]); pxRect(x, y + 3, 16, 0.5, pal[2]); }
      }
      if (!solid(tileAt(c, r + 1))) { pxRect(x, y + T - 2, 16, 1, PIXEL.INK); pxRect(x, y + T - 4, 16, 1, pal[0]); }
      if (!solid(tileAt(c - 1, r))) { pxRect(x, y, 0.5, 16, pal[4]); pxRect(x + 1, y, 0.5, 16, pal[3]); }
      if (!solid(tileAt(c + 1, r))) { pxRect(x + T - 2, y, 1, 16, PIXEL.INK); pxRect(x + T - 3, y, 0.5, 16, pal[0]); }
    }
    if (isOre(t) && Math.sin(state.time * 2.2 + s * 40) > 0.9) { // Funkeln
      const fx = x + (4 + Math.floor(s * 8)) * PXS, fy = y + (4 + Math.floor(s * 97 % 6)) * PXS;
      sparkle(fx, fy, 3);
    }
    if (t === ARTIFACT) drawArtifactInGround(c, r, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- Gebäude ----------
  function signAbove(name, color, cx, topY) {
    const sg = PIXEL.sign(name, color);
    blit(sg, cx - sg.width / 2, topY - sg.height - 4);
  }
  function drawStation(s, ox, oy) {
    const img = PIXEL.station(s);
    const x = s.x * T - ox - 4 * PXS, y = SURF * T - oy - img.height;
    blit(img, x, y);
    signAbove(s.name.toUpperCase(), s.color, s.x * T - ox + s.w * T / 2, y);
  }

  // ---------- Fernand, der Butler an der Tankstelle Royale ----------
  // Steht neben der Zapfsäule, verbeugt sich bei Kundschaft und tankt den Pod persönlich, solange das Tank-Menü offen ist.
  const FUEL_ST = D.stations.find(s => s.id === 'fuel');
  const FL = PIXEL.FUEL_LAYOUT, fuelX0 = FUEL_ST ? FUEL_ST.x * T - 8 : 0;
  const butler = { x: fuelX0 + FL.butlerHome, dir: 1, pose: 'stand', bowT: 0, greeted: null, walkT: 0 };
  function updateButler(dt) {
    if (!FUEL_ST || !players) return;
    const pl = state && state.panel === 'fuel' ? state.panelPlayer : null;
    const home = fuelX0 + FL.butlerHome;
    let tx = home;
    if (pl) tx = Math.max(fuelX0 + FL.pumpRight + 8, pl.x - 16);
    const d = tx - butler.x;
    if (Math.abs(d) > 1) { butler.x += Math.sign(d) * Math.min(Math.abs(d), 46 * dt); butler.dir = Math.sign(d); butler.walkT += dt; butler.pose = Math.floor(butler.walkT * 7) % 2 ? 'walk0' : 'walk1'; return; }
    butler.x = tx; butler.dir = 1;
    if (pl) { butler.pose = 'pump'; return; }
    // Kundschaft erkannt: einmal verbeugen und grüssen
    const guest = players.find(p => p.dead <= 0 && Math.abs(p.y + p.h - SURF * T) < 4 && p.x + p.w > FUEL_ST.x * T && p.x < (FUEL_ST.x + FUEL_ST.w) * T);
    if (guest && butler.greeted !== guest) {
      butler.greeted = guest; butler.bowT = 1.3;
      if (!introOpen) floatText(butler.x + 10, SURF * T - 44, pick(['Bonjour, Monsieur.', 'Volltanken, Monsieur?', 'Einmal Super Royale?', 'Sehr wohl, Monsieur.']), '#c9b9e6');
    }
    if (!guest) butler.greeted = null;
    butler.bowT = Math.max(0, butler.bowT - dt);
    butler.pose = butler.bowT > 0 ? 'bow' : 'stand';
  }
  function drawButler(ox, oy) {
    if (!FUEL_ST) return;
    const gy = SURF * T - oy - 2, bx = butler.x - ox;
    // Schlauch: von der Zapfsäule zur Hand (beim Tanken) oder zum Haken (in Ruhe)
    const sx = fuelX0 + FL.hoseX - ox, sy = SURF * T - oy - (FUEL_ST.h * 32 + 8) + FL.hoseY;
    const pumping = butler.pose === 'pump';
    const ex = pumping ? bx + 18 : fuelX0 + FL.hookX - ox + 2, ey = pumping ? gy - 36 + 16 : sy + 6;
    const sag = pumping ? 14 : 10;
    for (const [col, dy, sz] of [['#14101c', 0, 3], ['#4a4252', 0.5, 2], ['#7a7282', 0.5, 1]]) {
      ctx.fillStyle = col;
      for (let k = 0; k <= 32; k++) {
        const t = k / 32, x = sx + (ex - sx) * t, y = sy + (ey - sy) * t + Math.sin(t * Math.PI) * sag;
        ctx.fillRect(snap(x - sz / 2 + dy), snap(y - sz / 2 + dy), sz, sz);
      }
    }
    ctx.fillStyle = PIXEL.INK; ctx.fillRect(snap(ex) - 1, snap(ey) - 2, pumping ? 7 : 5, 4); ctx.fillStyle = PIXEL.GOLD[3]; ctx.fillRect(snap(ex), snap(ey) - 1, pumping ? 5 : 3, 2);
    if (pumping && Math.floor(state.time * 8) % 3 === 0) { ctx.fillStyle = '#ffd36e'; ctx.fillRect(snap(ex + 6), snap(ey + 1), 1, 1); ctx.fillStyle = '#9fe0b0'; ctx.fillRect(snap(ex + 5), snap(ey + 3), 1, 1); }
    blit(PIXEL.butler(butler.pose), bx, gy - 36 + 1, butler.dir < 0);
  }

  function drawTower(s, ox, oy) {
    const p = bestLove();
    state.hair += (p - state.hair) * 0.03;
    const img = PIXEL.towerBase(s);
    const x0 = snap(s.x * T - ox - 8 * PXS), y0 = snap(SURF * T - oy - img.height);
    blit(img, x0, y0);
    const L = PIXEL.towerLayout(s), cx = L.cw / 2, t = state.time;
    const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, w, h); };
    // Fahne mit Herz am Mast
    const wave = Math.floor(t * 4) % 2;
    P(cx + 1, 0, 16, 10, PIXEL.INK); P(cx + 1, 1, 14, 8, '#d4a63a'); P(cx + 1, 1, 14, 2, '#ffe08a'); P(cx + 13, 2 + wave, 3, 7, '#a07a10');
    P(cx + 5, 3, 2, 2, '#e0457a'); P(cx + 8, 3, 2, 2, '#e0457a'); P(cx + 5, 4, 5, 2, '#e0457a'); P(cx + 6, 6, 3, 1, '#e0457a'); P(cx + 5, 3, 1, 1, '#ff9ac0');
    // Prinzessin im Fenster
    const wy = L.winY, bob = Math.round(Math.sin(t * 2));
    P(cx - 10, wy + 13 + bob, 20, 24, '#a87a1c'); P(cx - 9, wy + 13 + bob, 18, 23, '#e8b440');      // Haar hinten
    P(cx - 9, wy + 28, 18, L.sillY - wy - 28, '#e66aa3');                                              // Kleid
    P(cx - 9, wy + 28, 3, L.sillY - wy - 28, '#ff9ac8'); P(cx + 6, wy + 28, 3, L.sillY - wy - 28, '#b03a78');
    for (let x = -6; x < 6; x += 2) P(cx + x, wy + 28, 1, 1, '#ffffff');
    P(cx - 3, wy + 29, 6, 2, '#f6d2b4'); P(cx - 1, wy + 31, 2, 2, '#e0115f');
    P(cx - 6, wy + 16 + bob, 12, 12, '#f6d2b4'); P(cx + 4, wy + 17 + bob, 2, 10, '#e8b898'); P(cx - 6, wy + 26 + bob, 12, 2, '#e8b898');  // Gesicht
    P(cx - 7, wy + 14 + bob, 14, 4, '#f2c14e'); P(cx - 7, wy + 14 + bob, 6, 1, '#ffe08a'); P(cx - 7, wy + 18 + bob, 2, 6, '#f2c14e'); P(cx + 5, wy + 18 + bob, 2, 6, '#f2c14e');
    const blink = Math.sin(t * 1.3) > 0.97;
    for (const ex of [cx - 4, cx + 2]) { if (blink) P(ex, wy + 21 + bob, 2, 1, '#3a2030'); else { P(ex, wy + 20 + bob, 2, 3, '#2a1838'); P(ex, wy + 20 + bob, 1, 1, '#ffffff'); P(ex - 1, wy + 19 + bob, 3, 1, '#3a2030'); } }
    P(cx - 5, wy + 23 + bob, 2, 1, '#f0a0a0'); P(cx + 3, wy + 23 + bob, 2, 1, '#f0a0a0'); P(cx - 1, wy + 25 + bob, 3, 1, '#e0607e');
    P(cx - 5, wy + 11 + bob, 10, 3, '#ffd23f'); P(cx - 5, wy + 13 + bob, 10, 1, '#c89a20');                // Krone
    P(cx - 5, wy + 9 + bob, 1, 2, '#ffd23f'); P(cx - 1, wy + 8 + bob, 2, 3, '#ffd23f'); P(cx + 4, wy + 9 + bob, 1, 2, '#ffd23f'); P(cx - 1, wy + 11 + bob, 2, 1, '#e0115f');
    P(cx - 13, L.sillY - 4, 7, 4, '#f6d2b4'); P(cx + 6, L.sillY - 4, 7, 4, '#f6d2b4'); P(cx - 13, L.sillY - 4, 7, 1, '#ffe6d0'); P(cx + 6, L.sillY - 4, 7, 1, '#ffe6d0');
    // Zopf über die Fensterbank, Länge = Tiefenfortschritt
    const hx0 = L.winX + L.winW + 4, hairTop = L.sillY + 5, maxLen = img.height - hairTop - 2;
    P(cx + 8, L.sillY - 2, hx0 - cx - 6, 3, '#c9962a'); P(cx + 8, L.sillY - 2, hx0 - cx - 6, 1, '#f2c14e');
    P(hx0 - 1, L.sillY - 1, 6, 6, '#c9962a'); P(hx0, L.sillY, 4, 4, '#f2c14e');
    const len = Math.max(3, Math.round(state.hair * maxLen));
    for (let y = 0; y < len; y++) {
      const sway = Math.round(Math.sin(t * 1.6 + y * 0.06) * 3 * (y / Math.max(1, maxLen)));
      const seg = Math.floor(y / 4), ry = y % 4, zig = seg % 2;
      const hx = hx0 + sway;
      P(hx - 1, hairTop + y, 7, 1, PIXEL.INK);
      P(hx + (zig ? 2 : 0), hairTop + y, 3, 1, ry === 3 ? '#a87a1c' : ry === 0 ? '#ffe08a' : '#f2c14e');
      P(hx + (zig ? 0 : 3), hairTop + y, 2, 1, ry === 3 ? '#8a5a10' : '#c9962a');
    }
    const ex = hx0 + 2 + Math.round(Math.sin(t * 1.6 + len * 0.06) * 3 * (len / Math.max(1, maxLen))), ey = hairTop + len;
    P(ex - 8, ey - 3, 7, 7, PIXEL.INK); P(ex + 2, ey - 3, 7, 7, PIXEL.INK);
    P(ex - 7, ey - 2, 5, 5, '#e0457a'); P(ex + 3, ey - 2, 5, 5, '#e0457a'); P(ex - 2, ey - 1, 5, 3, '#b02a5a'); P(ex - 7, ey - 2, 2, 2, '#ff9ac0'); P(ex + 3, ey - 2, 2, 2, '#ff9ac0');
    // Schild
    const sg = PIXEL.sign("TOUR DE L'AMOUR", s.color);
    blit(sg, x0 + (img.width - sg.width) / 2, y0 + L.signY);
    // Herzen steigen auf
    state.heartBurst = Math.max(0, state.heartBurst - 1 / 60);
    if ((state.heartBurst > 0 || p >= 1) && Math.random() < 0.08) {
      floats.push({ x: s.x * T + s.w * T / 2 + (Math.random() - 0.5) * 50, y: (SURF - s.h) * T + 80, text: '♥', color: '#ff7aa8', t: 0 });
    }
  }

  // ===================================================================
  //  POD – Aussehen hängt von den Upgrades ab
  //  Lokales Koordinatensystem: Pod ist 24×24, "vorne" ist immer rechts
  //  (bei Blick nach links wird gespiegelt).
  // ===================================================================
  const worldX = lx => pod.facing > 0 ? pod.x + lx : pod.x + pod.w - lx;

  // Rauch, Funken & Co. – laufen auch im Stand
  function engineEffects(dt) {
    const lvl = pod.levels.engine, thr = pod.thrusting;
    const bx = pod.x + pod.w / 2, by = pod.y + pod.h + 2;
    if (lvl === 0) { // Kohle: Schornstein qualmt immer, beim Fliegen richtig
      if (Math.random() < (thr ? 0.6 : 0.12)) spawnParticle(worldX(5), pod.y - 16, Math.random() < 0.5 ? '#3a3a3a' : '#5a5a5a',
        { vx: -pod.facing * 15 + (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, g: -10, size: 4, grow: 14, round: true, life: 1.4 });
      if (thr && Math.random() < 0.4) spawnParticle(bx, by, Math.random() < 0.5 ? '#ff6a1a' : '#ffb347', { vy: 120 + Math.random() * 80, g: 200, size: 2 });
    }
    if (lvl === 1 && thr && Math.random() < 0.3) spawnParticle(bx, by + 6, '#8fd0ff', { vy: 80, g: 0, size: 2, life: 0.3 });
    if (lvl === 2 && thr && Math.random() < 0.35) spawnParticle(worldX(-10), pod.y + 12, '#9a9a9a',
      { vx: -pod.facing * 60, vy: -10, g: -20, size: 3, grow: 10, round: true, life: 0.6 });
    if (lvl === 3) { // Elektro: Funken an der Tesla-Spule
      if (Math.random() < (thr ? 0.5 : 0.08)) spawnParticle(worldX(4), pod.y - 22, '#9ff3ff', { vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 80, g: 300, size: 2, life: 0.25 });
    }
    if (lvl === 4) { // Reaktor: grünes Glimmen
      if (Math.random() < (thr ? 0.7 : 0.1)) spawnParticle(bx + (Math.random() - 0.5) * 8, by + 4, '#7dff6a',
        { vx: (Math.random() - 0.5) * 30, vy: thr ? 160 : 20, g: 0, size: 3, grow: -2, round: true, life: 0.5 });
    }
  }

  function backfire() {
    for (let k = 0; k < 8; k++) spawnParticle(worldX(-10), pod.y + 12, k % 2 ? '#ffb347' : '#ff5a1a',
      { vx: -pod.facing * (80 + Math.random() * 80), vy: (Math.random() - 0.5) * 60, g: 0, size: 3, life: 0.25 });
    floatText(worldX(-6), pod.y + 4, 'PENG!', '#ffb347');
  }

  function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }

  const [podCv, podG] = PIXEL.mk(PIXEL.POD_W, PIXEL.POD_H);
  function drawPod(x, y) {
    const d = pod.drill, att = pod.attack;
    const dir = d ? { x: d.dx, y: d.dy } : att ? { x: att.x, y: att.y } : null;
    // Bohrer ein-/ausfahren: nur sichtbar, solange gebohrt wird
    if (dir) pod.drillLast = dir;
    const target = dir ? 1 : 0;
    pod.drillExt = pod.noAnim ? target : (pod.drillExt || 0) + (target - (pod.drillExt || 0)) * (target ? 0.45 : 0.25);
    PIXEL.paintPod(podG, {
      levels: pod.levels, body: pod.body, thrusting: pod.thrusting,
      drillDir: dir || pod.drillLast || null, drillExt: pod.drillExt,
      spinning: !!(d || att), t: state.time, vx: pod.vx,
      cargo: pod.cargo.map(id => (D.ores.find(o => o.id === id) || {}).color || '#ffffff'),
    });
    // Rumpf (Kunst-Pixel 16..28) liegt genau auf der Hitbox; bei Blick nach links gespiegelt
    blit(podCv, x - PIXEL.POD_OX, y - PIXEL.POD_OY, pod.facing < 0);
  }

  // Gadget-Leiste unten (für Spieler 1 bzw. Einzelspieler)
  const gadgetBar = document.getElementById('gadgetbar');
  let gadgetBarKey = '';
  function updateGadgetBar() {
    if (!gadgetBar) return;
    const pl = players[0];
    if (!pl) return;
    const key = D.gadgets.map(g => pl.gadgets[g.id] || 0).join(',') + `|${Math.ceil(pl.shield)}|${Math.ceil(pl.torch)}|${JSON.stringify(pl.captured)}|${pl.capSel}|${!!pl.defusing}`;
    if (key === gadgetBarKey) return;
    gadgetBarKey = key;
    gadgetBar.innerHTML = D.gadgets.map((g, i) => {
      const n = pl.gadgets[g.id] || 0;
      const timer = g.type === 'shield' && pl.shield > 0 ? Math.ceil(pl.shield) : g.type === 'torch' && pl.torch > 0 ? Math.ceil(pl.torch) : 0;
      return `<div class="gslot ${n || timer ? '' : 'empty'} ${timer ? 'active' : ''}" title="${g.name}">
        <span class="gk">${i + 1}</span><span class="gi"><img class="pxi" src="${PIXEL.iconURL(g.id)}" alt=""></span><span class="gn">${timer ? timer + 's' : '×' + n}</span></div>`;
    }).join('') + (() => {
      const l = capturedList(pl), sel = l.find(m => m.id === pl.capSel) || l[l.length - 1];
      if (!sel) return `<div class="gslot empty capt" title="Erbeutete Bomben (Entschärfer benutzen)"><span class="gk">0</span><span class="gi"><img class="pxi" src="${PIXEL.iconURL('mine_blindgaenger')}" alt=""></span><span class="gn">×0</span></div>`;
      return `<div class="gslot capt ${pl.defusing ? 'active' : ''}" title="${sel.name} – Taste 0 legen, Tab wechseln"><span class="gk">0</span>${l.length > 1 ? '<span class="gtab">TAB</span>' : ''}<span class="gi"><img class="pxi" src="${PIXEL.iconURL('mine_' + sel.id)}" alt=""></span><span class="gn">×${pl.captured[sel.id]}</span></div>`;
    })();
  }

  function updateHud() {
    updateGadgetBar();
    for (const pl of players) {
      pod = pl;
      const h = hud[pl.idx];
      h.money.textContent = fmt(pl.money);
      const depth = Math.max(0, Math.floor((pl.y + pl.h) / T) - SURF);
      h.depth.textContent = pl.dead > 0 ? `Abschlepp… ${Math.ceil(pl.dead)}` : `${depth * D.world.metersPerTile} m · ${LAIR_ROWS && pl.y + pl.h > LAIR_TOP * T + T * 2 ? 'Salon' : 'A' + (areaIndexAt(depth) + 1)}`;
      const fuelPct = Math.max(0, pl.fuel / stat('tank'));
      const hullPct = Math.max(0, pl.hull / stat('hull'));
      // nur bei echter Änderung schreiben (auf 0.2 % gerundet)
      const fw = `${(Math.round(Math.min(1, fuelPct) * 500) / 5).toFixed(1)}%`, hw = `${(Math.round(Math.min(1, hullPct) * 500) / 5).toFixed(1)}%`;
      if (h.fuel.style.width !== fw) h.fuel.style.width = fw;
      if (h.hull.style.width !== hw) h.hull.style.width = hw;
      h.fuel.classList.toggle('low', fuelPct < 0.25);
      h.hull.classList.toggle('low', hullPct < 0.25);
      h.cargo.textContent = `${pl.cargo.length}/${stat('cargo')}`;
      if (h.fuelName) {
        const lt = `${pl.fuel < 100 ? pl.fuel.toFixed(1) : Math.round(pl.fuel)} L`, key = tier('engine').fuel + lt;
        if (h.fuelName.dataset.key !== key) { h.fuelName.dataset.key = key; h.fuelName.innerHTML = `${tier('engine').fuel}<span class="num">${lt}</span>`; }
      }
      h.love.style.width = `${loveProgress(pl) * 100}%`;
      if (h.relics) {
        const key = pl.towing ? 'tow|' + pl.towing.def.id : 'n|' + pl.artifacts.length;
        if (h.relics.dataset.key !== key) {
          h.relics.dataset.key = key;
          h.relics.innerHTML = pl.towing ? `<img class="pxi" src="${PIXEL.iconURL(pl.towing.def.id)}" alt=""> am Seil` : `${pl.artifacts.length}/${D.artifacts.length}`;
        }
      }
    }
  }

  // ---------- Hauptschleife ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    updateButler(dt);
    render();
    requestAnimationFrame(loop);
  }

  newGame('single'); // Hintergrund hinter dem Menü
  requestAnimationFrame(loop);

  // Nur für Entwicklung: Zeichenfunktionen auf eine andere Leinwand umleiten (z. B. für einen Sprite-Katalog)
  window.__debugDraw = (c2d, fn) => {
    const sc = ctx, sp = pod, sw = worms;
    ctx = c2d;
    try {
      fn({
        drawPod: (pl, x, y) => { pod = pl; drawPod(x, y); if (pl.shield > 0) drawShield(x, y); },
        drawTile, drawStation, drawTower, drawMuseum, blit, blitC, ptext, scaledEnemy,
        drawWorm: (w, ox, oy) => { worms = [w]; drawWorms(ox, oy, 1e5, 1e5); drawWormEyes(ox, oy, 1e5, 1e5); },
        players, T, SURF, AREA_TILES, ORE_BASE, DIRT, ROCK, BEDROCK, CONCRETE, ARTIFACT,
      });
    } finally { ctx = sc; pod = sp; worms = sw; }
  };

  // Für Debugging in der Browser-Konsole
  window.__game = { get state() { return state; }, get pod() { return players[0]; }, get players() { return players; }, get worms() { return worms; }, get pickups() { return pickups; }, setTile, tileAt, newGame, startMode, get mode() { return mode; }, get cam() { return cam; }, get relics() { return relics; }, get bombs() { return bombs; }, useGadget, get delivered() { return delivered; }, get discovered() { return discovered; }, get mines() { return mines; }, get boss() { return boss; }, hurtBoss, winGame, get chandeliers() { return chandeliers; }, LAIR_TOP, placeCaptured, cycleCaptured, get rocks() { return rocks; }, startQuake, ICE, MAGMA, SAND, WATER, FAULT, H, artifactAt: () => artifactAt };
})();
