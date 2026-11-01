// =====================================================================
//  ICONS – nativ 32×32 gezeichnet (Artefakte, Gadgets, Symbole)
//  Jede Grafik ist aus Formen gebaut (Polygone, Ellipsen, Linien),
//  pro Pixel schattiert und am Ende mit Tinte konturiert.
// =====================================================================
(() => {
  'use strict';
  const { ramp, GOLD, SILVER, IVORY, FIRE, INK, dith, ICONS } = PIXEL;
  const def = (id, draw, w, h) => { ICONS[id] = { draw, w, h }; };
  const dark = c => [c, c, c, c, c];

  // ---------------- Area 1: Verlorene Mode ----------------
  def('tasche', S => {
    S.ring(16, 13, 8, 8, 2, ramp('#6a3c1c'), 'sphere', { yMax: 13 });
    S.poly([[4, 13], [28, 13], [30, 29], [2, 29]], ramp('#a0682f'), 'grad', { bevel: true });
    S.poly([[4, 13], [28, 13], [26.5, 20], [5.5, 20]], ramp('#c2843e'), 'grad', { bevel: true });
    for (let x = 7; x <= 25; x += 2) S.px(x, 18, '#f0c890');
    S.rect(3, 22, 27, 1, '#2f8a44'); S.rect(3, 23, 27, 2, '#c8262e'); S.rect(3, 25, 27, 1, '#2f8a44');
    S.box(14, 17, 5, 5, GOLD, 'grad', { bevel: true }); S.px(16, 19, INK);
    S.rect(5, 28, 3, 1, '#4a2810'); S.rect(24, 28, 3, 1, '#4a2810');
  });
  def('schuhe', S => {
    S.poly([[23, 20], [27, 20], [26, 30], [24.5, 30]], ramp('#8a1020'), 'cyl');
    S.poly([[2, 25], [4, 21.5], [10, 19.5], [16, 18], [20, 14], [23, 8.5], [27, 6.5], [30, 8.5], [29.5, 15], [28.5, 21], [24, 23.5], [14, 25.5], [4, 27]], ramp('#d22a3a'), 'grad', { bevel: true });
    S.poly([[16, 18.5], [20.5, 14], [23.5, 10.5], [26.5, 11], [23, 17], [18.5, 19.5]], dark('#4a0810'), 'flat');
    S.line(3, 26, 22, 24, '#6a1020'); S.line(6, 22, 12, 20, '#ff9aa6'); S.px(27, 8, '#ffc0c8'); S.px(28, 9, '#ff9aa6');
    S.box(9, 19, 4, 3, GOLD, 'grad'); S.px(10, 20, '#fff0a0');
  });
  def('schal', S => {
    const or = ramp('#f08a24');
    S.poly([[1.5, 4], [30.5, 4], [17, 30]], or, 'grad', { bevel: true });
    S.path([[5, 6], [27, 6], [17, 25], [5, 6]], '#ffe08a');
    const inT = S.pip([[7, 7.5], [25, 7.5], [17, 22]]);
    for (let y = 8; y < 22; y += 4) for (let x = 7 + ((y / 4) % 2) * 2; x < 26; x += 4) if (inT(x + 0.5, y + 0.5)) { S.px(x, y, '#2a4a8a'); S.px(x + 1, y, '#4a7ac8'); S.px(x, y + 1, '#1a2a5a'); }
    S.line(11, 4, 17, 29, or[1]);
    S.poly([[1, 3], [5, 3], [3, 11], [0.5, 9]], or, 'grad'); S.poly([[27, 3], [31, 3], [31, 9], [29, 11]], or, 'grad');
    S.px(2, 10, '#ffe08a'); S.px(30, 10, '#ffe08a');
  });
  def('uhr', S => {
    const strap = ramp('#2a3a5a');
    S.box(11, 0, 10, 32, strap, 'cyl');
    for (const y of [3, 27, 30]) S.px(16, y, strap[0]);
    S.ell(16, 16, 11.5, 11.5, GOLD, 'sphere');
    S.ring(16, 16, 9.5, 9.5, 2, ramp('#1f3a7a'), 'flat', { level: 1 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.px(Math.round(16 + Math.cos(a) * 8.6 - 0.5), Math.round(16 + Math.sin(a) * 8.6 - 0.5), k % 3 ? '#8aa8e0' : '#ffffff'); }
    S.ell(16, 16, 7.4, 7.4, ramp('#16243a'), 'flat', { level: 2 });
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; S.px(Math.round(15.5 + Math.cos(a) * 5.5), Math.round(15.5 + Math.sin(a) * 5.5), '#d8f0ff'); }
    S.line(16, 16, 16, 10, '#ffffff'); S.line(16, 16, 20, 18, '#ffd34a'); S.px(16, 16, '#ff5a3a');
    S.box(27, 14, 3, 4, GOLD, 'grad'); S.px(12, 12, '#ffffff'); S.px(13, 11, '#c8e0ff');
  });
  def('parfum', S => {
    S.box(12, 1, 8, 6, GOLD, 'cyl'); S.line(13, 3, 18, 3, GOLD[1]); S.line(13, 5, 18, 5, GOLD[1]);
    S.box(14, 7, 4, 4, GOLD, 'cyl');
    S.poly([[6, 11], [26, 11], [28.5, 14], [28.5, 27], [26, 30.5], [6, 30.5], [3.5, 27], [3.5, 14]], ramp('#e8b850'), 'cyl', { bevel: true });
    S.box(9, 17, 14, 8, ramp('#f4ecd6'), 'flat', { level: 3 });
    S.path([[9, 17], [22, 17], [22, 24], [9, 24], [9, 17]], '#c99a40');
    S.line(12, 20, 19, 20, '#7a5a20'); S.line(13, 22, 18, 22, '#b89a60');
    S.line(6, 14, 6, 27, '#fff4c8'); S.px(7, 13, '#ffffff');
  });

  // ---------------- Area 2: Königliche Schätze ----------------
  def('ei', S => {
    const inEgg = S.inE(16, 17.5, 10.5, 13);
    S.ell(16, 17.5, 10.5, 13, ramp('#c0305a'), 'sphere');
    for (const by of [10, 17, 24]) for (let x = 3; x < 30; x++) if (inEgg(x + 0.5, by + 0.5)) { S.px(x, by, '#ffd34a'); S.px(x, by + 1, '#a8761c'); }
    for (const [x, y] of [[9, 14], [16, 13], [23, 14], [12, 21], [20, 21], [16, 28]]) { S.px(x, y, '#ffffff'); S.px(x + 1, y, '#c8d8ff'); S.px(x, y + 1, '#8a1838'); }
    for (const [x, y] of [[8, 10], [16, 10], [24, 10], [7, 17], [16, 17], [25, 17], [8, 24], [16, 24], [24, 24]]) S.px(x, y, '#1fd4a0');
    S.ell(16, 3.5, 2.4, 2.4, GOLD, 'sphere'); S.px(16, 1, '#e0115f');
    S.px(11, 8, '#ffb0c8'); S.px(10, 9, '#ffb0c8');
  });
  def('collier', S => {
    for (let t = 0; t <= 1.0001; t += 1 / 11) {
      const x = 4 + 24 * t, y = 3 + 15 * Math.sin(Math.PI * t);
      S.ell(x, y, 1.7, 1.7, ['#6a6480', '#a8a4c0', '#e0dcf0', '#f8f6ff', '#ffffff'], 'sphere', { dither: false });
    }
    S.box(15, 19, 3, 3, GOLD, 'grad');
    S.poly([[16.5, 21], [22, 25.5], [16.5, 31], [11, 25.5]], ramp('#d0103a'), 'grad', { bevel: true, lo: 0.6 });
    S.line(13, 25, 20, 25, '#ff8090'); S.line(16, 22, 16, 29, '#8a0a20'); S.px(14, 24, '#ffffff');
  });
  def('maske', S => {
    S.poly([[2.5, 10], [10, 7.5], [16, 10], [22, 7.5], [29.5, 10], [29.5, 15], [25, 21.5], [19, 22.5], [16, 20], [13, 22.5], [7, 21.5], [2.5, 15]], ramp('#f6f1e6'), 'grad', { bevel: true });
    S.ell(10, 14, 3.6, 2.3, dark(INK), 'flat'); S.ell(22, 14, 3.6, 2.3, dark(INK), 'flat');
    S.ring(10, 14, 4.6, 3.3, 1, GOLD, 'flat', { level: 3 }); S.ring(22, 14, 4.6, 3.3, 1, GOLD, 'flat', { level: 3 });
    S.path([[3, 10], [10, 8], [16, 10], [22, 8], [29, 10]], '#d4a63a');
    for (const [x, y] of [[6, 18], [26, 18], [16, 15]]) { S.px(x, y, '#c8202a'); S.px(x, y - 1, '#ffd34a'); }
    for (let k = 0; k < 5; k++) S.ell(25 + k * 1.2, 7 - k * 1.4, 2.2, 1.4, ramp('#7a3fc0'), 'sphere');
    S.px(30, 1, '#e0c0ff');
  });
  def('hut', S => {
    const blk = ramp('#2e2a38').map((c, i) => i === 4 ? '#5a5468' : i === 3 ? '#3e3a4c' : c);
    S.ell(16, 25, 14.5, 3.4, blk, 'sphere');
    S.box(9, 4, 14, 20, blk, 'cyl');
    S.ell(16, 4.5, 7, 1.6, ramp('#4a4458'), 'flat', { level: 3 });
    S.box(9, 18, 14, 4, ramp('#b8262e'), 'cyl');
    S.line(11, 7, 11, 16, '#6a6478'); S.px(20, 20, '#ffd34a');
  });
  def('krone', S => {
    S.poly([[3.5, 26], [3.5, 10], [9, 16], [12, 5], [16, 13], [20, 5], [23, 16], [28.5, 10], [28.5, 26]], GOLD, 'grad', { bevel: true });
    S.box(3, 20, 26, 7, GOLD, 'hcyl', { bevel: true });
    S.ell(9, 23.5, 2.2, 2.2, ramp('#d0103a'), 'sphere'); S.ell(16, 23.5, 2.8, 2.8, ramp('#2f6fe0'), 'sphere'); S.ell(23, 23.5, 2.2, 2.2, ramp('#1fa463'), 'sphere');
    for (const [x, y] of [[3.5, 9], [12, 4.5], [20, 4.5], [28.5, 9]]) S.ell(x, y, 1.8, 1.8, ['#8a8098', '#c8c0d8', '#f0ecf8', '#ffffff', '#ffffff'], 'sphere');
    S.ell(16, 12, 1.6, 1.6, ramp('#d0103a'), 'sphere');
  });

  // ---------------- Area 3: Urzeit & Legenden ----------------
  def('ammonit', S => {
    S.ell(16, 16, 13.5, 13.5, ramp('#c8902a'), 'sphere');
    const sp = th => { const r = 12.8 * Math.exp(-th * 0.19); return [16 + Math.cos(th) * r, 16 + Math.sin(th) * r]; };
    let prev = sp(0);
    for (let th = 0.15; th < 4.6 * Math.PI; th += 0.12) { const p = sp(th); S.line(prev[0], prev[1], p[0], p[1], '#5a3a10'); prev = p; }
    for (let th = 0.2; th < 2.6 * Math.PI; th += 0.42) { const a = sp(th), b = sp(th + 2 * Math.PI); S.line(a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, '#9a6a1c'); }
    S.ell(16.5, 16.5, 1.4, 1.4, dark('#5a3a10'), 'flat'); S.px(9, 7, '#fff0a0'); S.px(10, 6, '#ffe08a');
  });
  def('zahn', S => {
    S.poly([[4.5, 3], [15, 3], [18, 8], [21, 14], [24, 20], [26, 25], [26.5, 30.5], [22, 27], [17, 21.5], [12, 15.5], [7.5, 9.5]], IVORY, 'grad', { bevel: true });
    S.poly([[4.5, 3], [15, 3], [14, 7], [7, 7.5]], ramp('#8a6a4a'), 'grad');
    for (let k = 0; k < 6; k++) S.px(12 + k * 2.4, 16 + k * 2.3, IVORY[1]);
    S.line(10, 6, 21, 21, IVORY[4]);
  });
  def('mammut', S => {
    const C = t => { const a = Math.PI * (1.02 + 0.78 * t); return [19 + 16 * Math.cos(a), 26 + 17 * Math.sin(a)]; };
    const outer = [], inner = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, [x, y] = C(t), [x2, y2] = C(Math.min(1, t + 0.01)), [x1, y1] = C(Math.max(0, t - 0.01));
      let nx = -(y2 - y1), ny = x2 - x1; const n = Math.hypot(nx, ny); nx /= n; ny /= n;
      const w = 3.6 * (1 - t) + 0.6;
      outer.push([x + nx * w, y + ny * w]); inner.push([x - nx * w, y - ny * w]);
    }
    S.poly([...outer, ...inner.reverse()], IVORY, 'grad', { bevel: true });
    for (const t of [0.08, 0.14]) { const [x, y] = C(t); S.line(x - 2, y - 4, x + 2, y + 3, '#a8987a'); }
    for (let i = 4; i < 20; i += 3) { const [x, y] = C(i / 24); S.px(Math.round(x), Math.round(y - 1), IVORY[4]); }
  });
  def('trex', S => {
    S.poly([[1.5, 14], [5, 9], [13, 5.5], [24, 5.5], [29.5, 10], [30.5, 17], [27.5, 21], [20, 22], [14, 20.5], [8, 21.5], [2.5, 19]], ramp('#efe6cf'), 'grad', { bevel: true });
    S.poly([[6, 22], [14, 21.5], [22, 23], [28, 21.5], [27, 27], [17, 28.5], [8, 26.5]], ramp('#d6ccb0'), 'grad', { bevel: true });
    S.ell(21.5, 12, 3.4, 3.2, dark(INK), 'flat'); S.px(20, 11, '#ff3a3a');
    S.ell(27, 15, 1.6, 2.6, dark('#3a3020'), 'flat'); S.ell(6, 12.5, 1.5, 1.1, dark('#3a3020'), 'flat');
    for (let x = 5; x <= 23; x += 3) S.poly([[x, 20], [x + 2.2, 20], [x + 1.1, 23.5]], IVORY, 'flat', { level: 4 });
    S.line(13, 8, 16, 13, '#a89878'); S.line(16, 13, 15, 16, '#a89878');
  });
  def('schwert', S => {
    S.poly([[30.5, 1.5], [30.5, 4.5], [14, 20.5], [11.5, 18]], SILVER, 'grad', { bevel: true });
    S.line(28, 4, 14, 18, '#7a8496'); S.line(29, 3, 14, 17, '#ffffff');
    S.poly([[6.5, 15], [9, 12.5], [19.5, 23], [17, 25.5]], GOLD, 'grad', { bevel: true });
    S.poly([[10.5, 20.5], [12.5, 22.5], [7, 28], [5, 26]], ramp('#3a2aa0'), 'grad');
    S.px(9, 24, '#ffd34a'); S.px(7, 26, '#ffd34a');
    S.ell(4.5, 28.5, 2.6, 2.6, GOLD, 'sphere'); S.px(4, 28, '#2f6fe0');
  });

  // ---------------- Area 4: Das Unmögliche ----------------
  def('galeone', S => {
    S.box(0, 27, 32, 5, ramp('#2a5aa0'), 'vgrad');
    for (let x = 0; x < 32; x++) { const y = 26 + Math.round(Math.sin(x * 0.8)); S.px(x, y, '#7ab0e8'); if (x % 5 === 0) S.px(x, y - 1, '#ffffff'); }
    S.poly([[2.5, 18.5], [29.5, 18.5], [26, 27], [7, 27]], ramp('#7a4a22'), 'grad', { bevel: true });
    S.box(21, 14, 9, 5, ramp('#8a5a2a'), 'grad', { bevel: true });
    S.line(5, 22, 27, 22, '#4a2a10'); S.line(7, 25, 26, 25, '#4a2a10');
    for (let x = 8; x <= 24; x += 4) S.px(x, 20, '#ffd34a');
    S.line(11, 2, 11, 18, '#4a2a14'); S.line(19, 1, 19, 18, '#4a2a14');
    const sail = ramp('#f4ecd6');
    S.poly([[12, 3.5], [17, 3.5], [17.5, 10], [12, 10.5]], sail, 'grad', { bevel: true });
    S.poly([[20, 2], [27, 3], [27.5, 10.5], [20, 11]], sail, 'grad', { bevel: true });
    S.poly([[12, 12], [17, 12], [17, 17], [12, 17]], sail, 'grad', { bevel: true });
    S.poly([[20, 12.5], [27, 12.5], [26.5, 17], [20, 17]], sail, 'grad', { bevel: true });
    S.px(11, 1, '#c8202a'); S.px(19, 0, '#c8202a'); S.px(20, 0, '#c8202a');
  });
  def('saeule', S => {
    const st = ramp('#e4ddcc');
    S.box(4, 2, 24, 4, st, 'hcyl', { bevel: true });
    S.ell(5, 7, 2.2, 2.2, st, 'sphere'); S.ell(27, 7, 2.2, 2.2, st, 'sphere');
    S.box(8, 6, 16, 20, st, 'cyl');
    for (const x of [10, 13, 16, 19, 22]) S.line(x, 7, x, 25, st[1]);
    S.box(4, 26, 24, 4, st, 'hcyl', { bevel: true });
    const r = PIXEL.rng(7);
    for (let k = 0; k < 26; k++) { const x = 8 + Math.floor(r() * 16), y = 14 + Math.floor(r() * 16); S.px(x, y, r() < 0.5 ? '#3f9a5c' : '#7ad08a'); }
    S.path([[17, 7], [15, 11], [17, 14], [15, 18]], st[0]);
  });
  def('diamant', S => {
    S.poly([[2.5, 11], [9, 4.5], [23, 4.5], [29.5, 11]], ramp('#a8eeff'), 'grad', { hi: 4 });
    S.poly([[2.5, 11], [29.5, 11], [16, 29.5]], ramp('#4aa8e0'), 'grad');
    for (const [a, b] of [[[9, 5], [12, 11]], [[16, 5], [12, 11]], [[16, 5], [20, 11]], [[23, 5], [20, 11]], [[12, 11], [16, 29]], [[20, 11], [16, 29]], [[6, 11], [16, 29]], [[26, 11], [16, 29]]]) S.line(a[0], a[1], b[0], b[1], '#2a78b0');
    S.line(3, 11, 29, 11, '#e8fbff');
    S.line(8, 6, 10, 6, '#ffffff'); S.px(9, 5, '#ffffff'); S.px(9, 7, '#ffffff'); S.px(21, 15, '#ffffff');
  });
  def('meteor', S => {
    S.poly([[31, 0.5], [31.5, 4], [19, 16.5], [13.5, 11.5]], FIRE, 'grad', { gx: 1.6, gy: 0.4, hi: 4 });
    S.poly([[30, 3], [21, 13], [18, 11]], FIRE, 'flat', { level: 4 });
    S.ell(12.5, 19.5, 9.5, 9, ramp('#9aa0ac'), 'sphere');
    for (const [x, y, r] of [[9, 17, 2.2], [15, 23, 1.8], [16, 15.5, 1.5]]) { S.ell(x, y, r, r * 0.8, dark('#5a606a'), 'flat'); S.px(Math.round(x + r - 0.5), Math.round(y + r * 0.8 - 0.5), '#e4e8f0'); }
    S.px(7, 14, '#ffffff'); S.px(8, 13, '#ffffff');
  });
  def('alien', S => {
    S.poly([[16, 2], [23, 3], [28, 8], [29.5, 14], [26.5, 21], [20.5, 28], [16, 30.5], [11.5, 28], [5.5, 21], [2.5, 14], [4, 8], [9, 3]], ramp('#5ad86a'), 'sphere', { cx: 16, cy: 14, rx: 14, ry: 16 });
    S.poly([[5, 13.5], [9, 11.5], [14.5, 15], [13.5, 19.5], [9, 19]], dark(INK), 'flat');
    S.poly([[27, 13.5], [23, 11.5], [17.5, 15], [18.5, 19.5], [23, 19]], dark(INK), 'flat');
    S.px(8, 14, '#ffffff'); S.px(9, 14, '#c8ffd8'); S.px(22, 14, '#ffffff'); S.px(23, 14, '#c8ffd8');
    S.px(15, 22, '#1a6a2a'); S.px(17, 22, '#1a6a2a'); S.line(14, 25, 18, 25, '#1a6a2a');
    S.path([[24, 4], [22, 7], [25, 9]], '#c8ffbc');
  });

  // ---------------- Gadgets ----------------
  def('dynamit', S => {
    for (let i = 0; i < 3; i++) { S.box(5 + i * 7.5, 10, 7, 20, ramp('#c8202a'), 'cyl'); S.ell(8.5 + i * 7.5, 10, 3, 1.2, ramp('#e8a090'), 'flat', { level: 3 }); }
    S.box(4, 17, 24, 5, ramp('#e8d06a'), 'hcyl');
    S.line(9, 19, 22, 19, '#8a7020');
    S.path([[16, 10], [16, 7], [19, 4], [22, 4]], '#6a5a3a');
    S.px(23, 3, '#ffffff'); S.px(24, 3, '#ffd34a'); S.px(23, 2, '#ffd34a'); S.px(22, 2, '#ff7a1a'); S.px(25, 4, '#ff7a1a'); S.px(24, 1, '#ffd34a'); S.px(26, 2, '#ff7a1a');
  });
  def('c4', S => {
    S.box(2, 10, 28, 17, ramp('#9a9c80'), 'grad', { bevel: true });
    S.box(2, 21, 28, 3, ramp('#62644e'), 'hcyl');
    S.box(7, 13, 18, 7, dark('#141a12'), 'flat');
    const DIG = { 0: ['###', '#.#', '#.#', '#.#', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 2: ['###', '..#', '###', '#..', '###'] };
    for (const [x, d] of [[9, 0], [16, 4], [20, 2]]) DIG[d].forEach((row, y) => { for (let i = 0; i < 3; i++) if (row[i] === '#') S.px(x + i, 14 + y, '#ff3030'); });
    S.px(13, 15, '#ff3030'); S.px(13, 17, '#ff3030');
    S.path([[8, 10], [7, 6], [4, 3]], '#d02020'); S.path([[24, 10], [25, 6], [28, 3]], '#20b040');
    S.px(4, 2, '#ff6060'); S.px(28, 2, '#60ff80');
  });
  def('kanister', S => {
    const red = ramp('#c8202a');
    S.box(10, 3, 10, 6, red, 'grad'); S.clear(12, 5, 6, 2);
    S.poly([[21, 2], [26, 2], [27, 8], [22, 8]], GOLD, 'grad');
    S.box(5, 8, 22, 23, red, 'grad', { bevel: true });
    S.line(8, 11, 23, 27, red[0]); S.line(23, 11, 8, 27, red[0]);
    S.line(9, 11, 24, 26, red[4]); S.line(24, 12, 9, 27, red[4]);
    S.rect(5, 29, 22, 1, red[0]);
  });
  def('reparatur', S => {
    S.box(10, 3, 12, 7, SILVER, 'grad'); S.clear(12, 5, 8, 4);
    const red = ramp('#c8202a');
    S.box(2, 9, 28, 20, red, 'grad', { bevel: true });
    S.line(3, 14, 28, 14, red[0]); S.line(3, 15, 28, 15, red[3]);
    S.box(14, 12, 4, 5, GOLD, 'grad', { bevel: true });
    S.rect(14, 19, 4, 8, '#ffffff'); S.rect(12, 21, 8, 4, '#ffffff'); S.rect(14, 26, 4, 1, '#d8d0c8');
    for (const [x, y] of [[3, 10], [28, 10], [3, 27], [28, 27]]) S.px(x, y, SILVER[3]);
  });
  def('schirm', S => {
    const canopy = (px, py) => S.inE(16, 16, 14.5, 13)(px, py) && py <= 16;
    S.shape(canopy, [1, 2, 31, 16], GOLD, 'sphere', { cx: 16, cy: 16, rx: 14.5, ry: 13 });
    for (let k = 0; k < 7; k++) S.ell(4 + k * 4, 16, 2, 1.4, GOLD, 'flat', { level: 1 });
    for (let k = 0; k <= 6; k++) S.line(16, 3, 2.5 + k * 4.5, 15, '#a8761c');
    S.px(16, 1, '#ffd34a'); S.px(16, 2, '#ffd34a');
    S.line(16, 16, 16, 28, '#4a3020'); S.line(17, 17, 17, 27, '#8a6040');
    S.path([[16, 28], [17, 30], [19, 30], [20, 28]], '#4a3020');
  });
  def('koeder', S => {
    S.line(18, 18, 27, 27, IVORY[2], 3); S.line(19, 18, 27, 26, IVORY[4]);
    S.ell(28, 27, 2.4, 2.4, IVORY, 'sphere'); S.ell(26, 29, 2.4, 2.4, IVORY, 'sphere');
    S.ell(13, 13, 11, 9.5, ramp('#c8663a'), 'sphere');
    for (const [x, y] of [[8, 10], [12, 15], [16, 9], [10, 18]]) { S.line(x, y, x + 3, y - 1, '#f0a070'); }
    S.line(6, 13, 18, 7, '#7a2a10'); S.line(9, 18, 21, 12, '#7a2a10');
  });
  def('fackel', S => {
    S.poly([[13.5, 18], [18.5, 18], [17.5, 31], [14.5, 31]], ramp('#8a5a2a'), 'cyl');
    S.line(14, 22, 18, 21, '#5a3010'); S.line(14, 26, 18, 25, '#5a3010');
    S.poly([[9.5, 13], [22.5, 13], [19.5, 19], [12.5, 19]], GOLD, 'grad', { bevel: true });
    S.poly([[16, 0.5], [19.5, 5], [22.5, 9], [21.5, 13], [10.5, 13], [9.5, 9], [12.5, 5]], FIRE, 'vgrad', { lo: 1, hi: 3.8 });
    S.poly([[16, 5], [18.5, 9], [18, 12.5], [14, 12.5], [13.5, 9]], ['#ffc34a', '#ffe08a', '#fff6d0', '#ffffff', '#ffffff'], 'vgrad');
  });
  def('teleport', S => {
    S.ell(16, 26.5, 14, 4, ramp('#5a4a7a'), 'sphere');
    S.ell(16, 25.5, 11.5, 2.6, ramp('#9a4cff'), 'flat', { level: 3 });
    S.ell(16, 25.5, 8, 1.6, ramp('#e0c0ff'), 'flat', { level: 3 });
    for (let y = 3; y < 25; y++) for (let x = 7; x < 26; x++) if (dith(x, y, 0.42 * (1 - Math.abs(x - 16) / 9))) S.px(x, y, '#c09aff');
    S.box(12, 11, 9, 6, ramp('#d8cfbe'), 'grad', { bevel: true }); S.rect(17, 12, 3, 2, '#3a6ac8'); S.rect(12, 17, 9, 1, '#3a3242');
    for (const [x, y] of [[5, 7], [27, 11], [8, 19]]) { S.px(x, y, '#ffffff'); S.px(x - 1, y, '#e0c0ff'); S.px(x + 1, y, '#e0c0ff'); S.px(x, y - 1, '#e0c0ff'); S.px(x, y + 1, '#e0c0ff'); }
  });

  def('entschaerfer', S => { // Seitenschneider mit rotem und blauem Griff, gekappter Draht
    S.path([[2, 9], [9, 9], [12, 6]], '#d02020'); S.path([[20, 6], [24, 9], [30, 9]], '#d02020');
    S.px(12, 6, '#ffb0a0'); S.px(20, 6, '#ffb0a0');
    S.poly([[13.5, 2], [16.5, 2], [17.5, 12], [14.5, 12]], SILVER, 'grad', { bevel: true });
    S.poly([[16.5, 2], [19.5, 3], [17.5, 12], [16, 12]], SILVER, 'grad');
    S.ell(16, 14, 2.6, 2.6, GOLD, 'sphere');
    S.poly([[14, 15], [16, 16.5], [10, 30], [6.5, 28.5]], ramp('#c8202a'), 'grad', { bevel: true });
    S.poly([[18, 15], [16, 16.5], [22, 30], [25.5, 28.5]], ramp('#2a5ae0'), 'grad', { bevel: true });
    S.px(8, 27, '#ff8a80'); S.px(23, 27, '#9ab8ff');
  });

  // ---------------- Symbole für Gebäude (16×16) ----------------
  def('sym_fuel', S => {
    S.box(2, 3, 8, 12, GOLD, 'grad', { bevel: true });
    S.box(4, 5, 4, 3, ramp('#3a7ac8'), 'flat', { level: 3 }); S.px(4, 5, '#ffffff');
    S.path([[10, 6], [13, 7], [13, 12], [12, 13]], '#3a3242'); S.rect(11, 12, 3, 2, SILVER[2]);
  }, 16, 16);
  def('sym_bank', S => {
    S.poly([[1, 6], [8, 1.5], [15, 6]], GOLD, 'grad', { bevel: true });
    for (const x of [3, 7, 11]) S.box(x, 7, 2, 6, GOLD, 'cyl');
    S.box(1, 13, 14, 2, GOLD, 'hcyl');
  }, 16, 16);
  def('sym_gear', S => {
    S.shape((px, py) => { const dx = px - 8, dy = py - 8, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); return r >= 2.3 && r <= 5 + (Math.cos(a * 8) > 0.2 ? 2 : 0); }, [0, 0, 16, 16], GOLD, 'sphere', { cx: 8, cy: 8, rx: 7, ry: 7 });
  }, 16, 16);
  def('heart', S => {
    S.shape((px, py) => { const x = (px - 6.5) / 5.6, y = -(py - 5.5) / 5.4; return (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0; }, [0, 0, 13, 12], ramp('#e0457a'), 'sphere', { cx: 6, cy: 5, rx: 6, ry: 6 });
  }, 13, 12);

  // ---------------- Erze als Schaustücke (Cabinet d'Histoire Naturelle) ----------------
  for (const ore of GAME_DATA.ores) def(`ore_${ore.id}`, S => PIXEL.specimen(S, ore));
})();
