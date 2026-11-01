// =====================================================================
//  AUDIO – düstere Soundeffekte im Stil von Super Metroid, live erzeugt
//  per Web Audio API (keine Audiodateien).
//  Klangkette wie beim SNES-Soundchip: dumpfer Tiefpass, Bit-Crusher
//  (Quantisierungsrauschen), Sättigung, Echo mit gefiltertem Feedback
//  und ein langer, dunkler Höhlenhall.
//  Klangsprache: tiefe Drones, gefiltertes Rauschen, metallische
//  Ringmodulation, abfallende Pitch-Sweeps, Moll, Tritonus, Halbtöne.
//  SFX.play(name, opts) · SFX.loop(name, an, opts) · Taste T = stumm
// =====================================================================
const SFX = (() => {
  'use strict';
  let ac = null, bus = null, master = null, noiseBuf = null, tOff = 0, rendering = false;
  let vMul = 1, dest = null;            // Lautstärke-Faktor & Ziel (Panner) für räumliche Effekte
  const OUT = () => dest || bus;
  let muted = false;
  try { muted = localStorage.getItem('mp_muted') === '1'; } catch (e) { /* privat */ }
  const VOL = 0.7;
  const last = {};
  const loops = {};

  // ---------- SNES-Klangkette ----------
  function crushCurve(bits) {
    const n = 4096, c = new Float32Array(n), steps = Math.pow(2, bits);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.round(Math.tanh(x * 1.6) * steps / 2) / (steps / 2); }
    return c;
  }
  function caveImpulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) { lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18; d[i] = lp * Math.pow(1 - i / len, decay) * 2.2; }  // dunkles, gefiltertes Rauschen
    }
    return buf;
  }
  // baut die Kette und liefert den Eingang (bus)
  function buildChain(ctx, out) {
    const input = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.5;   // dumpf wie 32 kHz BRR-Samples
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 35;
    const crush = ctx.createWaveShaper(); crush.curve = crushCurve(7); crush.oversample = 'none';          // Quantisierungsrauschen
    const post = ctx.createBiquadFilter(); post.type = 'lowpass'; post.frequency.value = 6500;
    input.connect(hp); hp.connect(lp); lp.connect(crush); crush.connect(post);
    const dry = ctx.createGain(); dry.gain.value = 0.85; post.connect(dry); dry.connect(out);
    // SNES-Echo: Delay mit dunklem Feedback
    const dl = ctx.createDelay(1); dl.delayTime.value = 0.21;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const fbf = ctx.createBiquadFilter(); fbf.type = 'lowpass'; fbf.frequency.value = 1800;
    const ew = ctx.createGain(); ew.gain.value = 0.28;
    post.connect(dl); dl.connect(fbf); fbf.connect(fb); fb.connect(dl); fbf.connect(ew); ew.connect(out);
    // Höhlenhall
    const conv = ctx.createConvolver(); conv.buffer = caveImpulse(ctx, 2.6, 2.4);
    const rw = ctx.createGain(); rw.gain.value = 0.42;
    post.connect(conv); conv.connect(rw); rw.connect(out);
    return input;
  }
  function makeNoise(ctx) {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 5;
    master = ac.createGain(); master.gain.value = muted ? 0 : VOL;
    master.connect(comp); comp.connect(ac.destination);
    bus = buildChain(ac, master);
    noiseBuf = makeNoise(ac);
    return true;
  }
  function unlock() { if (init() && ac.state === 'suspended') ac.resume(); }

  // ---------- Bausteine ----------
  const T0 = o => ac.currentTime + tOff + (o.at || 0);
  function env(g, t0, dur, v, a = 0.005, curve = 'exp') {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a);
    if (curve === 'lin') g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    else g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  // Ton: type, vol, to (Pitch-Sweep), filter (+ q, fto = Filter-Sweep), detune (zweite Stimme), grit (Rauschanteil), vib
  function tone(f, dur, o = {}) {
    const t0 = T0(o), g = ac.createGain(), out = ac.createGain(); out.gain.value = 1;
    const voices = o.detune ? [0, o.detune] : [0];
    for (const dt of voices) {
      const osc = ac.createOscillator();
      osc.type = o.type || 'sawtooth';
      osc.frequency.setValueAtTime(f, t0); osc.detune.value = dt;
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(15, o.to), t0 + dur);
      if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * (o.vibDepth ?? 0.025); l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
      osc.connect(g); osc.start(t0); osc.stop(t0 + dur + 0.05);
    }
    env(g, t0, dur, (o.vol ?? 0.25) * vMul / voices.length, o.attack ?? 0.008, o.curve);
    const fl = ac.createBiquadFilter(); fl.type = o.ftype || 'lowpass'; fl.frequency.setValueAtTime(o.filter || 1400, t0); fl.Q.value = o.q || 2;
    if (o.fto) fl.frequency.exponentialRampToValueAtTime(Math.max(40, o.fto), t0 + dur);
    g.connect(fl); fl.connect(OUT());
    if (o.grit) noise(dur, { at: o.at, freq: Math.min(4000, f * 3), type: 'bandpass', q: 1.2, vol: (o.vol ?? 0.25) * o.grit, attack: o.attack });
  }
  // Rauschen: freq (Filter), to (Filter-Sweep), type, q, vol, attack
  function noise(dur, o = {}) {
    const t0 = T0(o);
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;                     // < 1 = grober, „körniger“
    const fl = ac.createBiquadFilter(); fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.freq || 1000, t0); fl.Q.value = o.q || 0.8;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + dur);
    const g = ac.createGain(); env(g, t0, dur, (o.vol ?? 0.3) * vMul, o.attack ?? 0.005, o.curve);
    src.connect(fl); fl.connect(g); g.connect(OUT());
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
  }
  // metallischer Klang per Ringmodulation (Träger × Modulator)
  function metal(f, dur, o = {}) {
    const t0 = T0(o), car = ac.createOscillator(), mod = ac.createOscillator(), rm = ac.createGain(), g = ac.createGain();
    car.type = o.type || 'triangle'; car.frequency.setValueAtTime(f, t0);
    mod.type = 'square'; mod.frequency.setValueAtTime(f * (o.ratio || 1.414), t0);
    if (o.to) { car.frequency.exponentialRampToValueAtTime(o.to, t0 + dur); mod.frequency.exponentialRampToValueAtTime(o.to * (o.ratio || 1.414), t0 + dur); }
    rm.gain.value = 0; mod.connect(rm.gain); car.connect(rm);
    env(g, t0, dur, (o.vol ?? 0.25) * vMul, o.attack ?? 0.002);
    const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = o.filter || f * 2; fl.Q.value = o.q || 1.5;
    rm.connect(fl); fl.connect(g); g.connect(OUT());
    car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
  }
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  const seq = (list, fn) => { let t = 0; for (const [n, d, o] of list) { if (n) fn(N(n), d, t, o || {}); t += d; } };
  const pad = (n, dur, o = {}) => { for (const k of o.chord || [0, 3, 7]) tone(N(n + k), dur, { type: 'sawtooth', detune: 14, vol: (o.vol ?? 0.16), attack: o.attack ?? 0.25, filter: o.filter || 900, q: 1, at: o.at, curve: 'lin', grit: 0.3 }); };

  // ---------- Effekt-Bibliothek ----------
  const LIB = {
    // ---- Erze & Geld: metallische Klicks statt Glöckchen ----
    ore: o => { const p = Math.pow(2, (o.rank || 0) / 12 * 2); metal(N(64) * p, 0.35, { vol: 0.22, filter: 1800 * p }); tone(N(40) * p, 0.2, { type: 'square', vol: 0.12, filter: 500 }); },
    rare: () => { metal(N(69), 0.9, { vol: 0.2, ratio: 1.5, filter: 2200 }); seq([[57, 0.12], [60, 0.12], [63, 0.12], [68, 0.6]], (f, d, t) => tone(f, d * 1.4, { type: 'square', vol: 0.1, filter: 1300, at: t, detune: 9 })); },
    full: () => { tone(N(38), 0.3, { type: 'square', vol: 0.2, filter: 500, grit: 0.5 }); tone(N(37), 0.45, { type: 'square', vol: 0.2, filter: 450, at: 0.25, grit: 0.5 }); },
    sell: () => { noise(0.08, { freq: 3500, type: 'bandpass', q: 3, vol: 0.3 }); metal(N(52), 0.6, { vol: 0.2, at: 0.06, filter: 1500 }); tone(N(28), 0.5, { type: 'triangle', vol: 0.3, at: 0.06, filter: 300 }); noise(0.4, { freq: 2200, to: 800, type: 'bandpass', vol: 0.12, at: 0.15 }); },
    buy: () => { noise(0.25, { freq: 400, to: 1800, type: 'bandpass', q: 2, vol: 0.25 }); metal(N(55), 0.5, { vol: 0.18, at: 0.18 }); tone(N(31), 0.4, { type: 'square', vol: 0.18, filter: 400, at: 0.18 }); },
    denied: () => { tone(N(34), 0.35, { type: 'square', vol: 0.22, filter: 500, grit: 0.6 }); tone(N(40), 0.35, { type: 'square', vol: 0.14, filter: 500 }); },
    fuel: () => { for (let k = 0; k < 5; k++) tone(90 + Math.random() * 40, 0.14, { type: 'sine', vol: 0.3, to: 55, at: k * 0.1, filter: 400 }); noise(0.6, { freq: 500, type: 'bandpass', vol: 0.12 }); },
    repair: () => { for (let k = 0; k < 3; k++) { metal(N(50 + k), 0.25, { vol: 0.2, at: k * 0.16, ratio: 2.7 }); noise(0.05, { freq: 2500, type: 'bandpass', q: 4, vol: 0.25, at: k * 0.16 }); } },
    open: () => { noise(0.55, { freq: 5000, to: 600, type: 'bandpass', q: 0.7, vol: 0.28 }); tone(N(31), 0.3, { type: 'square', vol: 0.2, filter: 300, at: 0.3 }); },   // Metroid-Tür: Zischen + Klonk
    close: () => { tone(N(33), 0.25, { type: 'square', vol: 0.18, filter: 300 }); noise(0.3, { freq: 800, to: 3000, type: 'bandpass', vol: 0.15 }); },
    discovery: () => { pad(45, 2.4, { chord: [0, 7, 15], vol: 0.18, attack: 0.4 }); metal(N(69), 1.6, { vol: 0.14, at: 0.2, ratio: 1.5, filter: 2400 }); seq([[57, 0.25], [64, 0.25], [69, 0.25], [72, 0.9]], (f, d, t) => tone(f, d * 1.5, { type: 'square', vol: 0.08, filter: 1600, at: t + 0.3, detune: 7, vib: 5 })); },
    area: () => { pad(38, 3, { chord: [0, 6, 13], vol: 0.2, attack: 0.8, filter: 600 }); noise(2.5, { freq: 200, to: 80, vol: 0.2, attack: 0.6 }); },     // Tritonus-Drone: neue Tiefe
    blip: o => tone((o.pitch || 300) * (0.94 + Math.random() * 0.12), 0.05, { type: 'square', vol: 0.05, filter: 1400 }),   // Dialog-Schreibmaschine
    heart: () => seq([[64, 0.3], [68, 0.3], [71, 0.8]], (f, d, t) => tone(f, d * 1.6, { type: 'triangle', vol: 0.14, filter: 1600, at: t, vib: 5, attack: 0.05 })),
    // ---- Pod ----
    thud: () => { tone(70, 0.3, { type: 'sine', vol: 0.55, to: 30, filter: 300 }); noise(0.25, { freq: 600, to: 120, vol: 0.4, rate: 0.5 }); },
    ko: () => { tone(220, 1.6, { type: 'sawtooth', vol: 0.25, to: 30, filter: 1200, fto: 150, grit: 0.6 }); noise(1.4, { freq: 1500, to: 60, vol: 0.35, at: 0.15, rate: 0.4 }); },
    warn: () => { tone(N(57), 0.12, { type: 'square', vol: 0.14, filter: 1200 }); tone(N(56), 0.18, { type: 'square', vol: 0.14, filter: 1200, at: 0.16 }); },
    // ---- Würmer: jede Art hat eine eigene Stimme (o.kind) ----
    // erdfresser: klein, klickend · schlundwurm: gurgelnder Schlund · spiegelwurm: gläsernes Kreischen
    // unaussprechlich: tiefes, verzerrtes Mehrfach-Grollen mit Flüstern
    aggro: o => VOICE(o.kind).aggro(),
    lunge: o => VOICE(o.kind).lunge(),
    whurt: o => VOICE(o.kind).hurt(),
    wdie: o => VOICE(o.kind).die(),
    burrow: o => noise(0.45, { freq: 260 + Math.random() * 120, type: 'bandpass', q: 1.5, vol: 0.36, rate: 0.35, attack: 0.05 }),
    // ---- Würmer: organisch, nass, tief ----
    bite: () => { noise(0.12, { freq: 1800, to: 400, type: 'bandpass', q: 3, vol: 0.45, rate: 0.6 }); tone(55, 0.35, { type: 'sawtooth', vol: 0.3, to: 32, filter: 400, grit: 0.7 }); },
    squish: () => noise(0.12, { freq: 380, to: 160, type: 'bandpass', q: 5, vol: 0.25, rate: 0.5 }),
    wormdie: () => { tone(180, 1.2, { type: 'sawtooth', vol: 0.28, to: 35, filter: 900, fto: 120, vib: 11, vibDepth: 0.06, grit: 0.8 }); noise(0.8, { freq: 500, to: 90, vol: 0.3, rate: 0.5 }); },
    // ---- Gadgets & Explosionen ----
    fuse: () => noise(0.8, { freq: 4500, type: 'highpass', vol: 0.14, attack: 0.08, rate: 0.7 }),
    boom: o => {
      const r = o.radius || 1, big = r >= 4;
      noise(0.9 + r * 0.4, { freq: 900 + r * 200, to: 50, vol: 0.75, attack: 0.002, rate: 0.35 });   // grob gekörnt
      tone(60 - Math.min(30, r * 5), 0.9 + r * 0.3, { type: 'sine', vol: 0.65, to: 18, filter: 200 });
      noise(0.15, { freq: 3000, type: 'bandpass', vol: 0.35 });
      if (big) { noise(4, { freq: 220, to: 30, vol: 0.6, at: 0.2, attack: 0.5, rate: 0.3 }); tone(32, 3.6, { type: 'sawtooth', vol: 0.35, to: 16, filter: 120, at: 0.1, attack: 0.3 }); }
    },
    shield: () => { tone(N(45), 1.1, { type: 'sawtooth', detune: 18, vol: 0.18, filter: 400, fto: 2400, q: 6, attack: 0.05 }); metal(N(64), 0.9, { vol: 0.12, at: 0.15 }); },
    teleport: () => { tone(N(33), 1.2, { type: 'sawtooth', detune: 25, vol: 0.2, to: N(69), filter: 300, fto: 3000, q: 8, vib: 22 }); noise(1.1, { freq: 400, to: 4000, type: 'bandpass', q: 4, vol: 0.16 }); },
    torch: () => { noise(0.6, { freq: 1500, to: 400, type: 'bandpass', vol: 0.3, rate: 0.6 }); noise(1.2, { freq: 600, type: 'lowpass', vol: 0.1, at: 0.2, attack: 0.3 }); },
    bait: () => { noise(0.15, { freq: 700, to: 250, type: 'bandpass', q: 4, vol: 0.3, rate: 0.5 }); tone(140, 0.3, { type: 'sine', vol: 0.2, to: 70, filter: 400, at: 0.1 }); },
    clink: () => { metal(N(76), 0.5, { vol: 0.4, ratio: 2.3 }); metal(N(70), 0.6, { vol: 0.28, at: 0.08, ratio: 2.3 }); },
    // ---- Bomben im Boden ----
    arm: () => { for (let k = 0; k < 4; k++) tone(k % 2 ? N(58) : N(64), 0.14, { type: 'square', vol: 0.16, filter: 1500, at: k * 0.15, grit: 0.4 }); },   // Tritonus-Sirene
    tick: o => { metal(o.urgent ? N(76) : N(69), 0.1, { vol: o.urgent ? 0.5 : 0.36, ratio: 3.1 }); noise(0.03, { freq: 2500, type: 'bandpass', q: 3, vol: 0.2 }); },
    defuse: () => { noise(0.05, { freq: 5000, type: 'highpass', vol: 0.4 }); tone(N(40), 1.2, { type: 'sawtooth', vol: 0.2, filter: 1600, fto: 200, at: 0.1, to: N(28) }); metal(N(57), 0.8, { vol: 0.12, at: 0.3 }); },   // Energie entweicht
    snip: () => { noise(0.05, { freq: 6000, type: 'highpass', vol: 0.3 }); noise(0.4, { freq: 300, vol: 0.12, at: 0.05 }); },
    // ---- Artefakte ----
    artifact: () => { pad(48, 1.8, { chord: [0, 3, 10], vol: 0.15, attack: 0.3 }); metal(N(72), 1.2, { vol: 0.12, at: 0.1, ratio: 1.5 }); },
    snap: () => { noise(0.06, { freq: 2500, type: 'bandpass', q: 2, vol: 0.45 }); tone(220, 0.4, { type: 'sawtooth', vol: 0.18, to: 50, filter: 800 }); },
    deliver: () => { pad(45, 2.6, { chord: [0, 7, 12, 15], vol: 0.17, attack: 0.5 }); seq([[57, 0.3], [64, 0.3], [69, 1]], (f, d, t) => metal(f, d * 2, { vol: 0.1, at: t + 0.2, ratio: 1.5 })); },
    // ---- Naturphänomene ----
    freeze: () => { for (let k = 0; k < 5; k++) metal(N(84 + k), 0.4, { vol: 0.07, at: k * 0.05, ratio: 2.9 }); noise(0.8, { freq: 7000, type: 'highpass', vol: 0.12 }); tone(N(40), 0.8, { type: 'triangle', vol: 0.12, filter: 600 }); },
    splash: () => { noise(0.6, { freq: 1200, to: 250, type: 'bandpass', q: 1.2, vol: 0.4, rate: 0.6 }); for (let k = 0; k < 4; k++) tone(180 + Math.random() * 200, 0.12, { type: 'sine', vol: 0.12, to: 420, at: 0.15 + k * 0.09, filter: 900 }); },
    bubble: () => tone(150 + Math.random() * 150, 0.12, { type: 'sine', vol: 0.12, to: 380, filter: 700 }),
    sand: () => noise(0.9, { freq: 700, type: 'bandpass', q: 0.6, vol: 0.25, attack: 0.15, rate: 0.5 }),
    sizzle: () => noise(0.5, { freq: 3800, type: 'highpass', vol: 0.2, attack: 0.02, rate: 0.6 }),
    steam: () => noise(1.4, { freq: 2500, to: 900, type: 'bandpass', vol: 0.28, attack: 0.05 }),
    quake: () => { noise(3.6, { freq: 140, to: 50, vol: 0.65, attack: 0.5, rate: 0.3 }); tone(30, 3.4, { type: 'sawtooth', vol: 0.3, filter: 90, attack: 0.5, vib: 4, vibDepth: 0.1 }); },
    rockhit: () => { noise(0.25, { freq: 600, to: 150, vol: 0.45, rate: 0.4 }); tone(110, 0.2, { type: 'sine', vol: 0.3, to: 50, filter: 300 }); },
    rockland: () => noise(0.2, { freq: 400, to: 120, vol: 0.25, rate: 0.4 }),
    // ---- Endboss ----
    roar: () => { tone(70, 2.2, { type: 'sawtooth', detune: 30, vol: 0.4, to: 42, filter: 600, fto: 250, vib: 9, vibDepth: 0.05, attack: 0.12, grit: 0.9 }); noise(2, { freq: 450, to: 160, type: 'bandpass', q: 1.2, vol: 0.35, attack: 0.15, rate: 0.4 }); },
    charge: () => { for (let k = 0; k < 7; k++) { noise(0.12, { freq: 260, vol: 0.4, at: k * 0.11, rate: 0.4 }); tone(48, 0.12, { type: 'sine', vol: 0.3, at: k * 0.11, filter: 200 }); } },
    wallhit: () => { noise(0.6, { freq: 500, to: 60, vol: 0.7, rate: 0.35 }); tone(45, 0.9, { type: 'sine', vol: 0.55, to: 22, filter: 200 }); for (let k = 0; k < 3; k++) metal(N(81 - k * 4), 0.3, { vol: 0.07, at: 0.4 + k * 0.18, ratio: 2.2 }); },
    throw: () => noise(0.4, { freq: 500, to: 2000, type: 'bandpass', q: 1, vol: 0.5, rate: 0.5 }),
    slam: () => { noise(1.1, { freq: 250, to: 40, vol: 0.8, rate: 0.3 }); tone(40, 1.2, { type: 'sine', vol: 0.65, to: 18, filter: 150 }); },
    crash: () => { noise(1.2, { freq: 6000, type: 'highpass', vol: 0.35 }); for (let k = 0; k < 9; k++) metal(1500 + Math.random() * 2500, 0.5, { vol: 0.06, at: Math.random() * 0.6, ratio: 2.7 }); tone(60, 0.6, { type: 'sine', vol: 0.4, to: 30, filter: 200 }); },
    bosshurt: () => tone(110, 0.7, { type: 'sawtooth', detune: 25, vol: 0.3, to: 60, filter: 700, vib: 13, vibDepth: 0.07, grit: 0.8 }),
    summon: () => { pad(36, 2.2, { chord: [0, 1, 6], vol: 0.18, attack: 0.3, filter: 700 }); },          // Cluster: Halbton + Tritonus
    victory: () => { pad(45, 4, { chord: [0, 7, 12, 16], vol: 0.18, attack: 0.6 }); seq([[57, 0.35], [60, 0.35], [64, 0.35], [69, 0.5], [67, 0.35], [69, 1.4]], (f, d, t) => tone(f, d * 1.3, { type: 'square', vol: 0.09, filter: 1500, at: t + 0.3, detune: 8, vib: 5 })); },
    win: () => { pad(41, 4.5, { chord: [0, 7, 12, 16], vol: 0.17, attack: 0.8 }); seq([[65, 0.5], [69, 0.5], [72, 0.5], [77, 2]], (f, d, t) => tone(f, d * 1.4, { type: 'triangle', vol: 0.14, filter: 1800, at: t + 0.5, vib: 5 })); },
    gameover: () => { pad(33, 4, { chord: [0, 3, 6], vol: 0.2, attack: 0.4, filter: 500 }); seq([[57, 0.6], [56, 0.6], [53, 0.6], [50, 1.8]], (f, d, t) => tone(f, d * 1.3, { type: 'square', vol: 0.1, filter: 900, at: t, detune: 10 })); },
  };

  // Stimmen der Würmer
  const VOICES = {
    erdfresser: {
      aggro: () => { for (let k = 0; k < 4; k++) tone(520 + Math.random() * 200, 0.07, { type: 'square', vol: 0.12, to: 300, filter: 1800, at: k * 0.07, grit: 0.5 }); },
      lunge: () => { noise(0.12, { freq: 2200, type: 'bandpass', q: 4, vol: 0.25 }); tone(300, 0.12, { type: 'square', vol: 0.12, to: 500, filter: 1600 }); },
      hurt: () => tone(700, 0.18, { type: 'square', vol: 0.14, to: 380, filter: 1800, vib: 25, vibDepth: 0.08, grit: 0.4 }),
      die: () => { tone(600, 0.7, { type: 'square', vol: 0.16, to: 90, filter: 1500, fto: 300, vib: 20, vibDepth: 0.1, grit: 0.6 }); noise(0.5, { freq: 900, to: 200, vol: 0.2, rate: 0.5 }); },
    },
    schlundwurm: {
      aggro: () => { tone(95, 1.0, { type: 'sawtooth', vol: 0.26, to: 70, filter: 500, vib: 14, vibDepth: 0.08, attack: 0.06, grit: 0.8 }); noise(0.9, { freq: 400, to: 250, type: 'bandpass', q: 3, vol: 0.18, rate: 0.4 }); },
      lunge: () => { noise(0.25, { freq: 700, to: 300, type: 'bandpass', q: 4, vol: 0.32, rate: 0.5 }); tone(80, 0.3, { type: 'sawtooth', vol: 0.22, to: 140, filter: 500 }); },
      hurt: () => { tone(160, 0.4, { type: 'sawtooth', vol: 0.22, to: 90, filter: 700, vib: 16, vibDepth: 0.1, grit: 0.7 }); noise(0.3, { freq: 350, type: 'bandpass', q: 5, vol: 0.15, rate: 0.4 }); },
      die: () => { for (let k = 0; k < 5; k++) tone(90 + Math.random() * 60, 0.25, { type: 'sine', vol: 0.18, to: 220, filter: 600, at: 0.3 + k * 0.15 }); tone(140, 1.4, { type: 'sawtooth', vol: 0.28, to: 35, filter: 800, fto: 150, vib: 9, vibDepth: 0.08, grit: 0.9 }); },
    },
    spiegelwurm: {
      aggro: () => { metal(N(79), 1.1, { vol: 0.16, ratio: 1.41, to: N(73), filter: 2600 }); tone(N(67), 1.0, { type: 'sawtooth', vol: 0.1, filter: 2200, q: 8, vib: 8, attack: 0.1 }); },
      lunge: () => { metal(N(84), 0.3, { vol: 0.2, ratio: 2.3, to: N(76) }); noise(0.2, { freq: 5000, type: 'highpass', vol: 0.14 }); },
      hurt: () => { metal(N(81), 0.35, { vol: 0.2, ratio: 1.06 }); metal(N(82), 0.35, { vol: 0.14, ratio: 1.41, at: 0.04 }); },
      die: () => { for (let k = 0; k < 8; k++) metal(1800 + Math.random() * 2500, 0.6, { vol: 0.07, at: k * 0.06, ratio: 2.7 }); tone(N(76), 1.4, { type: 'sawtooth', vol: 0.14, to: N(40), filter: 2500, fto: 300, q: 6 }); },
    },
    unaussprechlich: {
      aggro: () => { tone(42, 2.2, { type: 'sawtooth', detune: 35, vol: 0.38, to: 33, filter: 400, fto: 180, vib: 6, vibDepth: 0.06, attack: 0.3, grit: 1 }); tone(N(42), 2.0, { type: 'sawtooth', vol: 0.1, filter: 900, q: 6, at: 0.2, attack: 0.6 }); noise(2, { freq: 2600, to: 1200, type: 'bandpass', q: 6, vol: 0.08, attack: 0.5 }); },
      lunge: () => { noise(0.4, { freq: 500, to: 150, vol: 0.45, rate: 0.3 }); tone(55, 0.5, { type: 'sawtooth', detune: 30, vol: 0.3, to: 90, filter: 500, grit: 0.9 }); },
      hurt: () => { tone(70, 0.6, { type: 'sawtooth', detune: 40, vol: 0.32, to: 48, filter: 600, vib: 11, vibDepth: 0.1, grit: 1 }); noise(0.4, { freq: 3000, type: 'bandpass', q: 5, vol: 0.08 }); },
      die: () => { tone(60, 3, { type: 'sawtooth', detune: 45, vol: 0.4, to: 18, filter: 700, fto: 90, vib: 7, vibDepth: 0.12, attack: 0.05, grit: 1 }); noise(2.6, { freq: 900, to: 60, vol: 0.4, rate: 0.3, attack: 0.1 }); for (let k = 0; k < 3; k++) tone(N(35 + k * 6), 2.4, { type: 'square', vol: 0.06, filter: 600, at: 0.3 + k * 0.25, attack: 0.4 }); },
    },
  };
  const VOICE = kind => VOICES[kind] || VOICES.erdfresser;

  // o.v = Lautstärke-Faktor (Entfernung), o.pan = Stereo-Position (−1 … 1)
  function play(name, o = {}) {
    if (muted || !ac || rendering || !LIB[name]) return;
    const now = performance.now(), gap = o.gap ?? 45, key = o.key ? name + '|' + o.key : name;
    if (last[key] && now - last[key] < gap) return;
    last[key] = now;
    vMul = o.v ?? 1;
    if (o.pan && ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, o.pan)); pn.connect(bus); dest = pn; setTimeout(() => pn.disconnect(), 6000); }
    try { LIB[name](o); } catch (e) { /* Audio darf das Spiel nie stoppen */ }
    vMul = 1; dest = null;
  }

  // ---------- Dauertöne ----------
  // drill: tiefes Mahlen mit grobem Rauschen · engine: je nach Antrieb (0 Kohle … 4 Reaktor)
  function makeLoop(name, lvl) {
    const g = ac.createGain(); g.gain.value = 0.0001; g.connect(bus);
    const nodes = [];
    const osc = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; nodes.push(o); return o; };
    const nz = (rate = 1) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate; nodes.push(s); return s; };
    const filt = (type, f, q = 1) => { const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; return fl; };
    const am = (rate, depth, target, type = 'square') => { const l = osc(type, rate), lg = ac.createGain(); lg.gain.value = depth; l.connect(lg); lg.connect(target.gain); };
    const vca = ac.createGain(); vca.gain.value = 0.5; vca.connect(g);
    if (name === 'drill') {
      const pitch = [42, 48, 55, 62, 70][lvl] ?? 70;
      const o = osc('sawtooth', pitch), fl = filt('lowpass', 380 + lvl * 90, 3);
      o.connect(fl); fl.connect(vca);
      const n = nz(0.35), nf = filt('bandpass', 700 + lvl * 160, 1.4), ng = ac.createGain(); ng.gain.value = 0.55;
      n.connect(nf); nf.connect(ng); ng.connect(vca);
      am(17 + lvl * 3, 0.4, vca);
    } else if (lvl === 0) { const n = nz(0.4), f = filt('lowpass', 320, 2); n.connect(f); f.connect(vca); am(7, 0.45, vca); }
    else if (lvl === 1) { const n = nz(0.6), f = filt('bandpass', 900, 0.8); n.connect(f); f.connect(vca); am(0.7, 0.15, vca, 'sine'); }
    else if (lvl === 2) { const o = osc('sawtooth', 44), f = filt('lowpass', 420, 3); o.connect(f); f.connect(vca); const n = nz(0.4), nf = filt('lowpass', 600); n.connect(nf); nf.connect(vca); am(21, 0.3, vca); }
    else if (lvl === 3) { const o = osc('square', 55), f = filt('bandpass', 700, 6); o.connect(f); f.connect(vca); const o2 = osc('sawtooth', 110.7), f2 = filt('lowpass', 1100); o2.connect(f2); f2.connect(vca); am(60, 0.2, vca); }
    else { const o = osc('sawtooth', 36), f = filt('lowpass', 160, 4); o.connect(f); f.connect(vca); const o2 = osc('sine', 54.3); o2.connect(vca); am(1.6, 0.35, vca, 'sine'); }
    nodes.forEach(n => n.start());
    return { g, nodes, lvl };
  }
  function loop(name, on, o = {}) {
    if (!ac || rendering) return;
    const lvl = o.lvl || 0;
    let L = loops[name];
    if (on && !muted) {
      if (L && L.lvl !== lvl) { stopLoop(name); L = null; }
      if (!L) L = loops[name] = makeLoop(name, lvl);
      L.g.gain.setTargetAtTime(o.vol ?? (name === 'drill' ? 0.22 : 0.16), ac.currentTime, 0.04);
    } else if (L) stopLoop(name);
  }
  function stopLoop(name) {
    const L = loops[name]; if (!L) return;
    delete loops[name];
    L.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
    setTimeout(() => { L.nodes.forEach(n => { try { n.stop(); } catch (e) { } }); L.g.disconnect(); }, 300);
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('mp_muted', muted ? '1' : '0'); } catch (e) { }
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOL, ac.currentTime, 0.02);
    if (muted) Object.keys(loops).forEach(stopLoop);
    return muted;
  }

  // =====================================================================
  //  AMBIENT – dezenter Hintergrund pro Zone, generativ (keine Schleife hörbar)
  //  Drone (verstimmte Sägezähne, Filter atmet langsam) + Wind/Rauschen
  //  + seltene Ereignisse in der Ferne (Tropfen, Knarzen, Grollen …)
  // =====================================================================
  const AMB_VOL = 0.32;
  const ZONES = {
    surface: { notes: [33, 40], filt: 220, wind: 0.22, windF: 500, ev: ['gust', 'gust', 'chime'] },
    a1:      { notes: [26, 33], filt: 180, wind: 0.10, windF: 300, ev: ['drip', 'drip', 'clank', 'creak'] },
    a2:      { notes: [25, 31], filt: 170, wind: 0.08, windF: 260, ev: ['drip', 'bubbles', 'drip', 'groan'] },   // Tritonus
    a3:      { notes: [29, 36, 48], filt: 260, wind: 0.07, windF: 900, ev: ['shimmer', 'drip', 'shimmer', 'creak'] },
    a4:      { notes: [24, 30], filt: 140, wind: 0.16, windF: 160, ev: ['rumble', 'groan', 'hiss', 'rumble'] },
    lair:    { notes: [21, 28, 33, 36], filt: 300, wind: 0.05, windF: 220, organ: true, ev: ['heartbeat', 'heartbeat', 'creak', 'clank'] },
  };
  const EVENTS = { // dezente Ereignisse in der Ferne (laufen durch Echo + Hall)
    gust: v => noise(3, { freq: 300, to: 900, type: 'bandpass', q: 0.8, vol: 0.18 * v, attack: 1.2, rate: 0.5 }),
    chime: v => metal(N(76 + [0, 3, 7][Math.floor(Math.random() * 3)]), 2.5, { vol: 0.05 * v, ratio: 2.01 }),
    drip: v => { const f = 500 + Math.random() * 600; tone(f, 0.12, { type: 'sine', vol: 0.12 * v, to: f * 2.2, filter: 2500 }); },
    clank: v => metal(N(40 + Math.floor(Math.random() * 6)), 1.4, { vol: 0.07 * v, ratio: 2.7 }),
    creak: v => tone(90 + Math.random() * 60, 1.6, { type: 'sawtooth', vol: 0.06 * v, to: 60, filter: 500, vib: 7, vibDepth: 0.05, grit: 0.5 }),
    bubbles: v => { for (let k = 0; k < 4; k++) tone(120 + Math.random() * 120, 0.15, { type: 'sine', vol: 0.08 * v, to: 320, filter: 700, at: k * 0.18 }); },
    groan: v => tone(55, 3, { type: 'sawtooth', detune: 20, vol: 0.08 * v, to: 40, filter: 260, attack: 0.8, curve: 'lin' }),
    shimmer: v => { const r = 72 + [0, 3, 7, 10][Math.floor(Math.random() * 4)]; for (let k = 0; k < 3; k++) metal(N(r + k * 7), 2.2, { vol: 0.03 * v, at: k * 0.35, ratio: 2.01 }); },
    rumble: v => noise(4, { freq: 120, to: 50, vol: 0.2 * v, attack: 1.4, rate: 0.3 }),
    hiss: v => noise(2.5, { freq: 3000, type: 'highpass', vol: 0.05 * v, attack: 0.8, rate: 0.6 }),
    heartbeat: v => { for (const at of [0, 0.32]) tone(48, 0.28, { type: 'sine', vol: 0.25 * v, to: 30, filter: 160, at }); },
  };
  let amb = null, ambZone = null, ambTimer = null;
  function buildAmbient(zone, t0) {
    const Z = ZONES[zone], g = ac.createGain(), nodes = [];
    g.gain.setValueAtTime(0.0001, t0); g.connect(bus);
    for (const n of Z.notes) for (const dt of [-9, 7]) {           // verstimmte Paare = Schwebung
      const o = ac.createOscillator(); o.type = Z.organ ? 'square' : 'sawtooth'; o.frequency.value = N(n); o.detune.value = dt;
      const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = Z.filt; fl.Q.value = 1.5;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.03 + Math.random() * 0.05; lg.gain.value = Z.filt * 0.45;
      lfo.connect(lg); lg.connect(fl.frequency);
      const vg = ac.createGain(); vg.gain.value = 0.11 / Z.notes.length;
      o.connect(fl); fl.connect(vg); vg.connect(g); nodes.push(o, lfo);
    }
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = 0.5;
    const wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = Z.windF; wf.Q.value = 0.9;
    const wl = ac.createOscillator(), wlg = ac.createGain(); wl.frequency.value = 0.06; wlg.gain.value = Z.windF * 0.5; wl.connect(wlg); wlg.connect(wf.frequency);
    const wg = ac.createGain(); wg.gain.value = Z.wind;
    src.connect(wf); wf.connect(wg); wg.connect(g); nodes.push(src, wl);
    nodes.forEach(n => n.start(t0));
    return { g, nodes, zone };
  }
  function ambEvent(zone, v = 1) { const Z = ZONES[zone]; EVENTS[Z.ev[Math.floor(Math.random() * Z.ev.length)]](AMB_VOL * 2.2 * v); }
  function ambient(zone) {
    if (!ac || rendering || zone === ambZone) return;
    ambZone = zone;
    const now = ac.currentTime;
    if (amb) { const old = amb; old.g.gain.setTargetAtTime(0.0001, now, 1.2); setTimeout(() => { old.nodes.forEach(n => { try { n.stop(); } catch (e) { } }); old.g.disconnect(); }, 6000); amb = null; }
    if (!zone || !ZONES[zone]) return;
    amb = buildAmbient(zone, now);
    amb.g.gain.setTargetAtTime(AMB_VOL, now, 2);
    if (!ambTimer) ambTimer = setInterval(() => { if (!muted && amb && ac && !rendering && ac.state === 'running' && Math.random() < 0.35) { try { ambEvent(amb.zone); } catch (e) { } } }, 1600);
  }

  // Nur für Entwicklung: Effekte offline rendern (Hörprobe), gleiche Klangkette
  async function _demo(list, gap = 1.2) {
    const save = [ac, bus, noiseBuf]; rendering = true;
    const sr = 44100, dur = list.reduce((a, x) => a + (x[2] || gap), 0) + 3;
    ac = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    const m = ac.createGain(); m.gain.value = VOL; m.connect(ac.destination);
    bus = buildChain(ac, m); noiseBuf = makeNoise(ac);
    tOff = 0.2;
    for (const [n, o, g] of list) {
      if (n.startsWith('amb:')) {                                    // Ambient-Zone für g Sekunden
        const z = n.slice(4), A = buildAmbient(z, tOff);
        A.g.gain.setTargetAtTime(AMB_VOL, tOff, 0.8); A.g.gain.setTargetAtTime(0.0001, tOff + g - 1.2, 0.4);
        A.nodes.forEach(nd => nd.stop(tOff + g));
        const keep = tOff; for (let t = 0.8; t < g - 1.5; t += 1.6) if (Math.random() < 0.55) { tOff = keep + t; ambEvent(z); }
        tOff = keep;
      } else LIB[n](o || {});
      tOff += g || gap;
    }
    const buf = await ac.startRendering();
    [ac, bus, noiseBuf] = save; tOff = 0; rendering = false;
    const L = buf.getChannelData(0), R = buf.getChannelData(1), out = new Array(L.length);
    for (let i = 0; i < L.length; i++) out[i] = (L[i] + R[i]) / 2;
    return out;
  }
  return { _demo, ambient, unlock, play, loop, toggleMute, get muted() { return muted; }, names: Object.keys(LIB), _raw: (n, o = {}) => LIB[n](o), get ctx() { return ac; } };
})();
