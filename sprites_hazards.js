// =====================================================================
//  SPRITES (Teil 4) – Gefahren: vergrabene Bomben und Naturphänomene
//  Alles nativ 32×32 gezeichnet (siehe PIXEL.pen in sprites.js).
// =====================================================================
(() => {
  'use strict';
  const { ramp, mix, shade, dith, rng, pen, memo, INK, GOLD, SILVER } = PIXEL;
  const def = (id, draw) => { PIXEL.ICONS[id] = { draw }; };
  const dark = c => [c, c, c, c, c];
  const trefoil = (S, cx, cy, bg, fg) => {
    S.ell(cx, cy, 3.6, 3.6, dark(bg), 'flat');
    for (const [x, y] of [[0, -2], [-1, -2], [-2, 1], [-2, 2], [2, 1], [2, 2], [0, 0]]) S.px(cx + x, cy + y, fg);
  };

  // ---------------- Vergrabene Bomben ----------------
  def('mine_blindgaenger', S => { // rostige Artilleriegranate, schräg im Boden
    const rust = ramp('#7a5a3a'), a = -0.75, dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx;
    const P = (u, v) => [16 + dx * u + qx * v, 17 + dy * u + qy * v];
    S.poly([P(-12, -4.5), P(4, -4.5), P(9, -3), P(13, 0), P(9, 3), P(4, 4.5), P(-12, 4.5)], rust, 'grad', { bevel: true });
    S.poly([P(-6, -4.6), P(-3, -4.6), P(-3, 4.6), P(-6, 4.6)], ramp('#c8783a'), 'grad');
    for (const [u, v] of [[-9, 1], [0, -2], [5, 2], [-1, 2]]) { const [x, y] = P(u, v); S.px(Math.round(x), Math.round(y), '#4a2a14'); }
    const [tx, ty] = P(12, 0); S.px(Math.round(tx), Math.round(ty), '#d8b080');
  });
  def('mine_dynamit_alt', S => { // vergilbte Stangen, mit Hanfschnur gebunden
    for (let i = 0; i < 3; i++) S.box(3, 9 + i * 6, 24, 6, ramp('#9a4a32'), 'hcyl');
    for (let i = 0; i < 3; i++) S.ell(27, 12 + i * 6, 1.6, 3, ramp('#d8b890'), 'flat', { level: 2 });
    S.box(12, 8, 3, 20, ramp('#c8a868'), 'cyl'); S.box(19, 8, 3, 20, ramp('#c8a868'), 'cyl');
    S.path([[27, 15], [29, 11], [28, 6], [30, 3]], '#6a5a3a');
    for (const [x, y] of [[6, 11], [22, 23], [9, 21]]) S.px(x, y, '#5a2a18');
  });
  def('mine_seemine', S => { // Kugel mit Hörnern
    const steel = ramp('#4e5462');
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 3, x = 16 + Math.cos(a) * 11, y = 16 + Math.sin(a) * 11;
      S.ell(x, y, 2.2, 2.2, ramp('#8a909c'), 'sphere'); S.px(Math.round(x), Math.round(y) - 1, '#d8dde6');
    }
    S.ell(16, 16, 10, 10, steel, 'sphere');
    S.line(6, 16, 26, 16, steel[1]); for (let x = 8; x < 25; x += 4) S.px(x, 17, steel[3]);
    S.px(12, 11, '#c8202a'); S.px(13, 11, '#ff6a5a');
  });
  def('mine_fliegerbombe', S => { // Bombe mit Leitwerk, senkrecht
    const olive = ramp('#5a6a48');
    S.box(10, 2, 12, 7, olive, 'cyl', { bevel: true }); S.rect(15, 2, 2, 8, olive[0]);
    S.ell(16, 18, 7.5, 12, olive, 'sphere');
    S.box(9, 13, 14, 2, ramp('#e0c030'), 'hcyl');
    S.px(16, 29, '#2a2a2a'); S.px(13, 21, olive[0]); S.px(19, 24, olive[0]);
  });
  def('mine_atombombe', S => { // dicker gelber Bauch, schwarzes Leitwerk
    S.box(5, 11, 6, 10, ramp('#2a2a32'), 'cyl', { bevel: true });
    S.poly([[3, 9], [9, 12], [9, 20], [3, 23]], ramp('#3a3a44'), 'grad');
    S.ell(18, 16, 12, 9.5, ramp('#e8c23a'), 'sphere');
    S.ell(28.5, 16, 1.5, 3, ramp('#c8a020'), 'flat', { level: 1 });
    trefoil(S, 18, 16, INK, '#e8c23a');
    S.line(12, 9, 24, 9, '#fff0a0');
  });
  def('mine_hbombe', S => { // langer Chromzylinder mit Leitwerk
    S.poly([[1, 9], [6, 12], [6, 20], [1, 23]], ramp('#5a606a'), 'grad');
    S.box(4, 11, 22, 10, SILVER, 'hcyl');
    S.ell(26, 16, 4.5, 5, SILVER, 'sphere');
    S.box(10, 11, 3, 10, ramp('#c8202a'), 'hcyl');
    trefoil(S, 19, 16, '#ffd23f', INK);
    S.line(6, 12, 24, 12, '#ffffff');
  });

  // ---------------- Gletschereis (Tile) ----------------
  function iceTile(v) {
    return memo(`ice|${v}`, () => {
      const S = pen(32, 32), ice = ['#3a6a9a', '#6aa8d8', '#a8d8f4', '#d8f2ff', '#ffffff'], r = rng(91 + v * 13);
      S.box(0, 0, 32, 32, ice, 'grad', { lo: 1.4, hi: 3.4 });
      for (let k = 0; k < 3; k++) { // Bruchkanten
        let x = r() * 32, y = 0; const step = 0.6 + r() * 0.8;
        while (y < 32) { S.px(Math.floor(x) & 31, Math.floor(y), ice[1]); S.px((Math.floor(x) + 1) & 31, Math.floor(y), ice[4]); y += 1; x += (r() - 0.5) * 2 * step; }
      }
      for (let k = 0; k < 6; k++) { const x = Math.floor(r() * 30), y = Math.floor(r() * 30); S.px(x, y, '#ffffff'); }
      for (let k = 0; k < 3; k++) { const x = 4 + r() * 24, y = 4 + r() * 24; S.ell(x, y, 1.6, 1.2, ice, 'flat', { level: 4 }); }
      S.rect(0, 0, 32, 1, '#ffffff'); S.rect(0, 31, 32, 1, ice[0]); S.rect(31, 0, 1, 32, ice[1]);
      return S.c;
    });
  }

  // ---------------- Verwerfung (löst Erdbeben aus) ----------------
  function faultTile(ai, edges, frame) {
    return memo(`fault|${ai}|${edges}|${frame}`, () => {
      const S = pen(32, 32);
      S.g.drawImage(PIXEL.dirtBase(ai, 0, edges), 0, 0);
      const pts = [[3, 0], [9, 7], [6, 13], [14, 18], [11, 24], [19, 32]], glow = frame % 2 ? '#ff9a3a' : '#ff6a2a';
      for (let i = 1; i < pts.length; i++) {
        S.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], INK, 2);
        S.line(pts[i - 1][0] + 1, pts[i - 1][1], pts[i][0] + 1, pts[i][1], glow);
      }
      for (const [x, y] of [[22, 6], [25, 12], [21, 20]]) { S.line(x, y, x + 4, y + 2, INK); S.px(x + 1, y, glow); }
      return S.c;
    });
  }

  // ---------------- Flüssigkeiten (4 Animationsbilder) ----------------
  // kind: water · magma · quicksand · surface = Oberkante (darüber ist keine gleiche Flüssigkeit)
  function fluid(kind, frame, surface) {
    return memo(`fluid|${kind}|${frame}|${surface}`, () => {
      const S = pen(32, 32), f = frame;
      if (kind === 'water') {
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          const wv = Math.sin((x + f * 4) * 0.4 + y * 0.25) + Math.sin((x - f * 3) * 0.17 - y * 0.4);
          S.px(x, y, wv > 1.3 ? 'rgba(160,220,255,0.75)' : wv > 0.6 ? 'rgba(70,150,230,0.66)' : 'rgba(30,90,190,0.62)');
        }
        if (surface) {
          for (let x = 0; x < 32; x++) { const y = 1 + Math.round(Math.sin((x + f * 5) * 0.45)); S.px(x, y, '#e8f8ff'); S.px(x, y + 1, 'rgba(200,240,255,0.9)'); for (let k = 0; k < y; k++) S.clear(x, k, 1, 1); }
        }
        for (const [bx, by] of [[6, 26 - f * 6], [20, 20 - f * 5], [27, 30 - f * 7]]) { const yy = ((by % 32) + 32) % 32; if (!surface || yy > 4) { S.px(bx, yy, '#e8f8ff'); S.px(bx + 1, yy - 1, 'rgba(232,248,255,0.7)'); } }
      } else if (kind === 'magma') {
        const pal = ['#3a0a08', '#8a1a0a', '#e0400a', '#ff9a1a', '#fff0a0'];
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          const n = Math.sin(x * 0.33 + f * 0.8 + Math.sin(y * 0.3 + f) * 1.6) + Math.sin(y * 0.27 - f * 0.6 + x * 0.12);
          let fv = 2.1 + n * 0.9; fv = Math.max(0, Math.min(4, fv));
          let i = Math.floor(fv); if (i < 4 && dith(x, y, fv - i)) i++;
          S.px(x, y, pal[i]);
        }
        if (surface) {
          for (let x = 0; x < 32; x++) { S.px(x, 0, '#fff0a0'); S.px(x, 1, '#ffc34a'); }
          const bx = (f * 9 + 5) % 28; S.ell(bx + 2, 3, 2.5, 2, pal, 'sphere');
        }
      } else { // Treibsand
        const sand = ramp('#c8a060');
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          const ring = Math.sin(Math.hypot(x - 16, (y - 16) * 1.4) * 0.8 - f * 0.9);
          let fv = 2.2 + ring * 0.7; fv = Math.max(1, Math.min(3.6, fv));
          let i = Math.floor(fv); if (dith(x, y, fv - i)) i++;
          S.px(x, y, sand[Math.min(4, i)]);
        }
        if (surface) for (let x = 0; x < 32; x++) { S.px(x, 0, sand[4]); if ((x + f) % 5 === 0) S.px(x, 1, sand[1]); }
      }
      return S.c;
    });
  }

  // ---------------- Kleinkram ----------------
  const rubble = ai => memo(`rubble|${ai}`, () => { const S = pen(14, 14); S.ell(7, 7, 5.5, 5, ramp(GAME_DATA.areas[ai].look.rock).map((c, i) => i === 4 ? shade(c, 0.5) : c), 'sphere'); S.px(5, 5, '#ffffff'); return S.done(); });
  const frost = () => memo('frost', () => {
    const S = pen(36, 36);
    S.box(1, 1, 34, 34, ['rgba(80,140,200,0.55)', 'rgba(120,190,240,0.5)', 'rgba(170,220,250,0.45)', 'rgba(220,245,255,0.55)', 'rgba(255,255,255,0.8)'], 'grad', { bevel: true });
    S.path([[4, 6], [10, 12], [8, 20]], '#ffffff'); S.path([[28, 4], [24, 14], [30, 22]], '#ffffff'); S.px(14, 5, '#ffffff'); S.px(26, 28, '#ffffff');
    return S.done('#2a5a8a');
  });

  Object.assign(PIXEL, { iceTile, faultTile, fluid, rubble, frost });
})();
