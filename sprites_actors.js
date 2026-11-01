// =====================================================================
//  SPRITES (Teil 3) – Pod, Bohrer, Würmer, Gebäude – nativ gezeichnet
//  Pod «Le Nautilus Classique», Leinwand 88×88: Hitbox 24×24 liegt bei x/y 32..55.
//  Vorne ist immer rechts (das Spiel spiegelt bei Blick nach links).
// =====================================================================
(() => {
  'use strict';
  const { R, mk, memo, mix, shade, ramp, dith, pen, text, icon, INK, GOLD, SILVER, IVORY } = PIXEL;

  const POD_W = 88, POD_H = 88, POD_OX = 32, POD_OY = 32;

  // ---------------- Le Nautilus Classique (statische Teile, gecacht pro Ausbaustufe) ----------------
  // Entwurf auf 56×48 (Boden y = 44), wird mit NX/NY in die 88×88-Pod-Leinwand gesetzt.
  // Hitbox 24×24 (x/y 32..55) entspricht im Entwurf x 17..40, y 20..43.
  const NX = 15, NY = 12;
  const GLASS = ramp('#3a6a9a'), SKIN = ramp('#f2c9a5'), TYRE = ramp('#2a2432');
  const GEMS = ['#e0115f', '#1fa463', '#2f6fe0'];
  const BOTTLE = ['#0b2416', '#14402a', '#1f6a3e', '#3f9a5c', '#9fe0b0'];
  const COPPER = ramp('#c87a40'), PLAT = ['#4a505c', '#8a92a0', '#c8ced8', '#eef2f6', '#ffffff'];
  const STONE = ramp('#b8b2a6');
  const trimFor = hl => [SILVER, GOLD, GOLD, GOLD, ramp('#8e897e')][hl];
  const paintOf = body => { const pc = body || ['#f1dfa8', '#e2cc94', '#7d6230']; return [shade(pc[2], -0.3), pc[2], pc[1], pc[0], shade(pc[0], 0.5)]; };

  const sparkle = (S, x, y) => { S.px(x, y, '#ffffff'); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) S.px(x + dx, y + dy, '#fff0a0'); };
  const crown = (S, x, y, w = 7) => { S.poly([[x, y + 4], [x, y], [x + w * 0.25, y + 2], [x + w / 2, y - 1], [x + w * 0.75, y + 2], [x + w, y], [x + w, y + 4]], GOLD, 'grad', { bevel: true }); S.px(Math.round(x + w / 2), y + 1, '#e0115f'); };
  const pilot = (S, x, y) => { S.rect(x - 1, y - 1, 5, 1, INK); S.rect(x, y - 4, 3, 3, INK); S.rect(x, y, 3, 2, SKIN[3]); S.px(x + 2, y, GOLD[3]); S.px(x + 1, y + 2, '#f4efe4'); };
  const porthole = (S, cx, cy, r, trim) => { S.ell(cx, cy, r, r, GLASS, 'sphere'); S.ring(cx, cy, r + 0.4, r + 0.4, 1.1, trim, 'flat', { level: 3 }); S.px(Math.round(cx - r / 2), Math.round(cy - r / 2), '#d8f2ff'); };
  const battlements = (S, x0, x1, y) => { for (let x = x0; x < x1; x += 4) S.box(x, y - 3, 3, 3, STONE, 'grad', { bevel: true }); };

  // Hülle: 0 Lack Champagne (Spielerfarbe) · 1 Carbon mit Goldintarsien · 2 Matelassé · 3 Blindage Royal · 4 Forteresse Couture
  function material(S, inside, bb, lvl, sph, paint) {
    const lightAt = (x, y) => { const nx = (x + 0.5 - sph.cx) / sph.rx, ny = (y + 0.5 - sph.cy) / sph.ry; return -(nx * 0.55 + ny * 0.8); };
    if (lvl === 0) { S.shape(inside, bb, paint, 'sphere', sph); return; }
    if (lvl === 3) {
      S.shape(inside, bb, ramp('#5b2a86'), 'sphere', sph);
      for (let y = Math.floor(bb[1]); y <= bb[3]; y++) for (let x = Math.floor(bb[0]); x <= bb[2]; x++) {
        if (!inside(x + .5, y + .5) || y < sph.cy + sph.ry * 0.35) continue;      // Hermelin unten
        S.px(x, y, (x * 3 + y * 5) % 9 === 0 ? INK : lightAt(x, y) > -0.2 ? '#fffaf0' : '#e4dccc');
      }
      return;
    }
    for (let y = Math.floor(bb[1]); y <= bb[3]; y++) for (let x = Math.floor(bb[0]); x <= bb[2]; x++) {
      if (!inside(x + .5, y + .5)) continue;
      const l = lightAt(x, y);
      let c;
      if (lvl === 1) { const weave = ((x + (y >> 1)) >> 1) & 1; c = weave ? '#4a4858' : '#2a2834'; if (l > 0.35) c = weave ? '#6a6878' : '#3a3846'; if (l < -0.45) c = '#1a1822'; }
      else if (lvl === 2) {
        const u = (x + y) % 6, v = (x - y + 600) % 6;
        if (u === 0 && v === 0) c = '#d4a63a';
        else if (u === 0 || v === 0) c = '#b89a68';
        else { const d = Math.min(u, 6 - u) + Math.min(v, 6 - v); c = d >= 4 ? '#fff6e4' : d >= 3 ? (dith(x, y, 0.5) ? '#fff6e4' : '#f2e4c4') : '#e4d0aa'; }
        if (l < -0.3) c = shade(c, -0.18);
      } else {
        const row = Math.floor((y - bb[1]) / 4), by = (y - bb[1]) % 4, bx = (x + (row % 2 ? 3 : 0)) % 6;
        c = by === 3 || bx === 5 ? '#5a554c' : by === 0 ? '#d0cabe' : bx === 0 ? '#bcb6aa' : '#a8a296';
        if (l < -0.35 && c !== '#5a554c') c = shade(c, -0.2);
      }
      S.px(x, y, c);
    }
  }
  function hullBands(S, inside, x0, x1, y, lvl) {
    for (let x = x0; x <= x1; x++) {
      if (!inside(x + .5, y + .5)) continue;
      if (lvl === 0) { S.px(x, y, '#ffd34a'); if (inside(x + .5, y + 1.5)) S.px(x, y + 1, '#8a1a2a'); }
      if (lvl === 1) { S.px(x, y - 3, GOLD[3]); S.px(x, y + 2, GOLD[3]); }
      if (lvl === 3) { S.px(x, y - 1, GOLD[3]); S.px(x, y, GOLD[1]); }
    }
  }
  // Bugnase = eingefahrener Bohrkopf: Classique · Diamant-Pavé · Platine Grande Complication · Tourbillon Saphir · Haute Joaillerie
  function drillNose(S, x, y, lvl) {
    const len = 5 + lvl * 0.6, half = 3 + (lvl >= 3 ? 0.5 : 0), pal = [SILVER, SILVER, PLAT, GOLD, GOLD][lvl];
    S.box(x - 2, y - half - 1, 3, half * 2 + 2, lvl >= 3 ? GOLD : lvl === 2 ? PLAT : ramp('#6a6e7a'), 'cyl');
    S.poly([[x, y - half], [x + len, y], [x, y + half]], pal, 'grad', { bevel: true });
    for (let k = 1; k < len; k += 3) S.line(x + k, y - half * (1 - k / len) + 0.5, x + k + 1, y + half * (1 - k / len) - 0.5, pal[0]);
    if (lvl === 1) for (let k = 1; k < len - 1; k += 2) S.px(x + k, Math.round(y + ((k % 4) - 1.5) * half * (1 - k / len) * 0.5), k % 4 ? '#ffffff' : '#9fe8ff');
    if (lvl === 2) { S.ring(x - 1, y, half + 1.2, half + 1.2, 1, PLAT, 'flat', { level: 3 }); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; S.px(Math.round(x - 1 + Math.cos(a) * (half + 2)), Math.round(y + Math.sin(a) * (half + 2)), PLAT[2]); } }
    if (lvl === 3) { S.path([[x + 1, y - half + 1], [x + len * 0.4, y + half * 0.5], [x + len * 0.7, y - half * 0.2]], GOLD[4]); S.ell(x + len - 1, y, 1.4, 1.4, ramp('#1f5fd1'), 'sphere'); }
    if (lvl === 4) { [0.25, 0.5, 0.72].forEach((t, i) => { const xx = Math.round(x + len * t), h = half * (1 - t); for (let yy = Math.ceil(y - h); yy <= y + h; yy++) S.px(xx, yy, GEMS[i]); }); sparkle(S, Math.round(x + len), y - 3); }
  }
  // Tank = Champagnerflasche als Ballasttank am Kiel: Flacon · Jéroboam · Nabuchodonosor · Salmanazar · Melchior
  function bottle(S, x, y, lvl, straps) {
    const len = [9, 12, 15, 19, 24][lvl], r = [1.6, 2, 2.6, 3.2, 4][lvl];
    const neck = Math.round(len * 0.28), body = len - neck;
    S.box(x, y - r, body, r * 2, BOTTLE, 'hcyl');
    S.ell(x + 0.5, y, 1.2, r, BOTTLE, 'sphere');
    S.poly([[x + body, y - r], [x + body + 3, y - r * 0.45], [x + body + 3, y + r * 0.45], [x + body, y + r]], BOTTLE, 'hcyl');
    S.box(x + body + 3, y - Math.max(1, r * 0.45), neck - 3, Math.max(2, r * 0.9), GOLD, 'hcyl');
    if (r >= 2) { S.box(x + Math.round(body * 0.3), y - r + 0.5, Math.max(3, Math.round(body * 0.35)), r * 2 - 1, ramp('#f2e6c8'), 'flat', { level: 3 }); S.px(x + Math.round(body * 0.3) + 1, Math.round(y), '#c8262e'); }
    for (const sx of straps) S.box(x + sx, y - r - 0.5, 1, r * 2 + 1, GOLD, 'cyl');
  }
  // Tresor auf dem Vorderdeck: Schmuckschatulle · Wandtresor · Privatbank-Tresor · Salle des Coffres · Banque Centrale
  const SAFE = [[6, 4], [7, 6], [8, 7], [10, 8], [11, 10]], SAFE_XR = 42, SAFE_YB = 26;
  function safe(S, xr, yb, lvl) {
    const [w, h] = SAFE[lvl], x0 = xr - w, y0 = yb - h, cx = x0 + Math.floor(w / 2), cy = y0 + Math.floor(h / 2);
    if (lvl === 0) { S.box(x0, y0, w, h, ramp('#a3172f'), 'grad', { bevel: true }); S.line(x0, y0 + 1, x0 + w - 1, y0 + 1, '#5a0a18'); S.rect(cx - 1, y0 + 1, 2, 2, GOLD[3]); }
    else if (lvl <= 2) {
      S.box(x0, y0, w, h, ramp(lvl === 1 ? '#7c8088' : '#2f4a3a'), 'grad', { bevel: true });
      S.ell(cx + 0.5, cy + 0.5, 1.8, 1.8, lvl === 1 ? SILVER : GOLD, 'sphere'); S.px(cx, cy, INK);
      if (lvl === 2) { S.rect(x0 + 1, y0 + 1, 1, 2, GOLD[3]); S.rect(x0 + 1, y0 + h - 3, 1, 2, GOLD[3]); S.px(x0 + w - 2, cy, GOLD[3]); }
    } else if (lvl === 3) {
      S.box(x0, y0, w, h, ramp('#8c929c'), 'grad', { bevel: true });
      for (let yy = y0 + 1; yy < y0 + h - 1; yy += 3) for (let xx = x0 + 1; xx < x0 + w - 1; xx += 3) { S.rect(xx, yy, 2, 2, '#5a606a'); S.px(xx + 1, yy + 1, GOLD[3]); }
    } else {
      S.box(x0, y0 + 4, w, h - 4, ramp('#f3ecdc'), 'grad', { bevel: true });
      for (let i = 0; i < 3; i++) S.box(x0 + 1 + i * 4, y0 + 5, 2, h - 7, IVORY, 'cyl');
      S.box(x0 - 1, y0 + h - 2, w + 2, 2, IVORY, 'hcyl');
      S.poly([[x0 - 1, y0 + 4.5], [x0 + w / 2, y0 - 0.5], [x0 + w + 1, y0 + 4.5]], GOLD, 'grad', { bevel: true });
      S.px(Math.round(x0 + w / 2), y0 - 2, '#1f8a4c');
    }
  }
  // Antrieb auf dem Achterdeck: Kohle-Schlot · Gasflasche · Chrom-Auspuffe · Tesla-Spule · Reaktorkuppel
  function funnel(S, x, y) {
    S.box(x, y - 9, 4, 9, ramp('#3a3a44'), 'cyl'); S.box(x - 1, y - 11, 6, 2, ramp('#4a4a56'), 'hcyl'); S.box(x, y - 5, 4, 1, GOLD, 'cyl');
    S.rect(x, y - 11, 4, 1, '#1a1a20');
  }
  function tesla(S, x, y) { S.box(x - 1, y - 2, 6, 2, ramp('#7a4a1e'), 'grad'); S.box(x + 1, y - 10, 2, 8, ramp('#5a3a1a'), 'cyl'); for (let k = 0; k < 4; k++) { S.rect(x, y - 9 + k * 2, 4, 1, '#d9773b'); S.px(x, y - 9 + k * 2, '#ffc08a'); } S.ell(x + 2, y - 12, 2.6, 2.6, ramp('#5ad0f0'), 'sphere'); }
  function reactorDome(S, x, y, w = 8) { S.box(x - 1, y - 1, w + 2, 2, SILVER, 'hcyl'); S.shape((px, py) => S.inE(x + w / 2, y - 1, w / 2, w / 2)(px, py) && py <= y - 1, [x, y - w / 2 - 1, x + w, y - 1], ramp('#3ad84a'), 'sphere', { cx: x + w / 2, cy: y - 1, rx: w / 2, ry: w / 2 }); for (const [px, py] of [[x + w / 2 - 1, y - 4], [x + w / 2 + 1, y - 4], [x + w / 2, y - 2]]) S.px(Math.round(px), Math.round(py), INK); }
  function gasBottle(S, x, y, len = 8) { S.box(x, y, len, 4, ramp('#2f6fe0'), 'hcyl'); S.ell(x, y + 2, 1.4, 2, ramp('#2f6fe0'), 'sphere'); S.rect(x + 2, y + 1, 3, 2, '#e8eef8'); S.px(x + 3, y + 1, '#c8262e'); S.box(x + len, y + 1, 2, 2, SILVER, 'grad'); }
  function chromePipes(S, x, y1, y2, len = 5) { for (const y of [y1, y2]) { S.box(x - len, y - 1, len, 2, SILVER, 'hcyl'); S.box(x - len - 1, y - 1.5, 2, 3, ramp('#2a2a30'), 'flat', { level: 2 }); } }
  function greenJet(S, x, y) { S.ell(x, y, 2, 3, SILVER, 'sphere'); S.ell(x - 1, y, 1.2, 2, ramp('#7dff6a'), 'flat', { level: 4 }); }

  // Schiffsschraube (animiert, 4 Bilder je Antrieb), Entwurfskoordinaten der Nabe: (13, 31)
  const PROP_POS = [[13, 31], [13, 31], [12, 31], [13, 31], [13, 31]];
  function propFrame(e, f) {
    return memo(`nprop|${e}|${f}`, () => {
      const S = pen(16, 16), c = 8, pal = [ramp('#5a5a62'), SILVER, SILVER, COPPER, SILVER][e], n = e === 0 ? 2 : 3, r = e === 2 || e === 3 ? 5 : 4;
      if (e === 4) { greenJet(S, c, c); return S.done(); }
      for (let k = 0; k < n; k++) {
        const a = f * Math.PI / (2 * n) + k * 2 * Math.PI / n, s = Math.sin(a), cz = Math.cos(a);
        if (Math.abs(s) < 0.15) continue;
        S.ell(c + cz * 0.8, c + s * r * 0.55, 1.2 + Math.abs(cz) * 0.4, Math.abs(s) * r * 0.5, pal, 'sphere');
      }
      S.ell(c, c, 1.6, 1.6, pal, 'sphere');
      if (e === 3) S.ring(c, c, 1.6, r, 1, COPPER, 'flat', { level: 3 });
      return S.done();
    });
  }

  function nautilus(L, body) {
    return memo(`naut|${L.drill}${L.engine}${L.tank}${L.hull}${L.cargo}|${body ? body.join() : ''}`, () => {
      const S = pen(56, 48), cx = 29, cy = 31, rx = 15, ry = 7.5, trim = trimFor(L.hull), paint = paintOf(body), e = L.engine, tl = L.tank;
      const inside = S.inE(cx, cy, rx, ry), bb = [cx - rx, cy - ry, cx + rx, cy + ry];
      if (e === 2) chromePipes(S, 16, 28, 34, 5);
      // Raupen (Kettenglieder werden animiert darübergezeichnet)
      S.box(17, 38, 25, 6, TYRE, 'hcyl', { bevel: true });
      for (let i = 20; i < 40; i += 5) S.ell(i, 41, 2, 2, trim, 'sphere');
      // Rumpf
      material(S, inside, bb, L.hull, { cx: cx - 4, cy: cy - 4, rx: rx + 2, ry: ry + 2 }, paint);
      hullBands(S, inside, bb[0], bb[2], cy, L.hull);
      for (let x = bb[0] + 3; x < bb[2] - 2; x += 3) if (L.hull <= 1 && inside(x, cy + 4)) S.px(x, cy + 4, trim[1]);
      bottle(S, 19 - tl, 37 - (tl >= 3 ? 1 : 0), tl, [3 + tl, 7 + tl]);
      porthole(S, 38, 30, 2.6, trim);
      porthole(S, 32, 31, 1.6, trim);
      // Turm mit Monsieur
      if (L.hull === 4) { S.box(23, 16, 10, 8, STONE, 'grad', { bevel: true }); battlements(S, 23, 33, 16); S.box(25, 18, 6, 4, GLASS, 'grad'); pilot(S, 27, 20); battlements(S, 15, 22, 26); }
      else {
        const tp = [paint, ramp('#2a2834'), ramp('#f2e4c4'), ramp('#5b2a86')][L.hull];
        S.poly([[22, 25], [24, 16], [33, 16], [34, 25]], tp, 'grad', { bevel: true });
        S.box(23, 15, 11, 2, trim, 'hcyl');
        S.box(26, 18, 6, 4, GLASS, 'grad'); pilot(S, 27, 20);
        if (L.hull === 3) crown(S, 25, 10);
        if (L.hull === 2) for (const y of [19, 22]) S.px(24, y, GOLD[3]);
      }
      // Antrieb auf Deck
      if (e === 0) funnel(S, 17, 25);
      if (e === 1) gasBottle(S, 13, 22, 8);
      if (e === 3) tesla(S, 17, 25);
      if (e === 4) reactorDome(S, 14, 26, 8);
      safe(S, SAFE_XR, SAFE_YB, L.cargo);
      drillNose(S, 44, 31, L.drill);
      const done = S.done(), [c, g] = mk(POD_W, POD_H);
      g.drawImage(done, NX, NY);
      return c;
    });
  }

  // ---------------- animierte Teile (jedes Bild) ----------------
  // Kettenglieder laufen mit der Fahrgeschwindigkeit
  function treadLugs(g, t, vx) {
    const off = Math.floor(t * 22 * Math.sign(vx || 0.0001) * Math.min(1, Math.abs(vx) / 60)), x0 = NX + 18, w = 23;
    for (let i = 0; i < w; i += 4) { R(g, x0 + ((i + off) % w + w) % w, NY + 43, 2, 1, '#5a5262'); R(g, x0 + ((i - off) % w + w) % w, NY + 38, 2, 1, '#4a4252'); }
  }

  function flame(g, cx, top, len, half, cols, ph) {
    for (let y = 0; y < len; y++) {
      const k = y / len, w = half * Math.pow(1 - k, 0.75) * (0.85 + Math.random() * 0.3);
      for (let x = Math.floor(-w); x <= Math.ceil(w); x++) {
        const f = Math.min(4, (Math.abs(x) / Math.max(1, w)) * 1.6 + k * 3);
        const i = Math.min(4, Math.floor(f) + (dith(cx + x, top + y + ph, f - Math.floor(f)) ? 1 : 0));
        R(g, cx + x, top + y, 1, 1, cols[i]);
      }
    }
  }
  function exhaust(g, lvl, thr, t) {
    const cx = 44, top = 56, ph = Math.floor(t * 30);
    const len = 11 + Math.floor(Math.random() * 6);
    if (lvl === 0) {
      if (!thr) return;
      flame(g, cx, top, len, 4.5, ['#fff6d0', '#ffd36e', '#ff7a1a', '#c8301a', '#5a1a14'], ph);
      if (Math.random() < 0.6) R(g, cx - 5 + Math.floor(Math.random() * 10), top + len + Math.floor(Math.random() * 4), 1, 1, '#ffb347');
    } else if (lvl === 1) {
      R(g, cx - 5, top - 1, 10, 3, INK); R(g, cx - 4, top - 1, 8, 1, '#8a9aaa'); R(g, cx - 4, top, 8, 1, '#5b6b7a');
      if (thr) flame(g, cx, top + 2, len + 3, 4, ['#ffffff', '#bfe8ff', '#5ab0ff', '#2f6fe0', '#1a3a8a'], ph);
    } else if (lvl === 2) {
      for (const yy of [NY + 28, NY + 34]) if (thr && Math.random() < 0.8) { R(g, NX + 8, yy, 2, 1, '#ffb347'); if (Math.random() < 0.5) R(g, NX + 6, yy, 2, 1, '#ff7a1a'); }
      if (thr) flame(g, cx, top, len + 4, 5, ['#fff6d0', '#fff1b0', '#ffb347', '#ff7a1a', '#c8301a'], ph);
    } else if (lvl === 3) {
      R(g, cx - 6, top - 1, 12, 3, INK); R(g, cx - 5, top - 1, 10, 1, '#20343a'); R(g, cx - 3, top, 6, 1, '#7fe8ff');
      if (!thr) return;
      for (let y = 2; y < 12; y++) for (let x = -7; x <= 7; x++) if (dith(cx + x, top + y + ph, 0.6 - y * 0.05 - Math.abs(x) * 0.04)) R(g, cx + x, top + y, 1, 1, '#a0f5ff');
      for (let k = 0; k < 2; k++) { let x = cx + (k ? 2 : -3); for (let y = 2; y < 16; y++) { x += Math.floor(Math.random() * 3) - 1; R(g, x, top + y, 1, 1, y % 4 === 0 ? '#ffffff' : '#bff8ff'); } }
    } else {
      const pulse = Math.sin(t * 8) > 0;
      R(g, cx - 6, top - 1, 12, 3, INK); R(g, cx - 5, top - 1, 10, 1, '#2b3a2a'); R(g, cx - 3, top, 6, 1, pulse ? '#b8ff9a' : '#5ad86a');
      if (!thr) return;
      const l = len + 8;
      R(g, cx - 4, top + 2, 8, l, '#2aa83a'); R(g, cx - 3, top + 2, 6, l, '#3ad84a'); R(g, cx - 1, top + 2, 2, l + 2, '#e8ffdc');
      for (let y = 2 + (Math.floor(t * 20) % 4); y < l; y += 4) R(g, cx - 6, top + y, 12, 1, '#7dff6a');
    }
  }

  // Bohrer: nativ 32×32, zeigt nach unten (wird für vorne gedreht)
  const [drillCv, drillG] = mk(32, 32);
  const DRILL = [ramp('#a8b0bc'), ['#5a6a80', '#9ab0c8', '#d8e8f4', '#f4faff', '#ffffff'], ramp('#c8ccd6'), ramp('#9aa0ac'), GOLD];
  function paintDrill(lvl, spinning, t) {
    const g = drillG; g.clearRect(0, 0, 32, 32);
    const len = [11, 13, 15, 17, 21][lvl] ?? 21, half = [7, 7, 8, 9, 10][lvl] ?? 10;
    const pal = DRILL[lvl] || GOLD, ph = spinning ? Math.floor(t * 30) : 0;
    const col = lvl >= 3 ? GOLD : SILVER;
    for (let x = 16 - half - 1; x < 16 + half + 1; x++) { R(g, x, 0, 1, 1, col[3]); R(g, x, 1, 1, 1, col[2]); R(g, x, 2, 1, 1, col[1]); }
    if (lvl === 2) for (let x = 16 - half - 1; x < 16 + half + 1; x += 2) R(g, x + (ph % 2), 0, 1, 1, '#ffd34a');
    for (let y = 0; y < len; y++) {
      const w = half * 2 * (1 - y / len), x0 = 16 - w / 2;
      for (let x = Math.floor(x0); x < Math.ceil(16 + w / 2); x++) {
        const rel = w < 1.5 ? 0.4 : (x + 0.5 - x0) / w;
        let f = 3.7 - rel * 2.9;
        if (((x * 2 + y * 3 + ph) % 7 + 7) % 7 < 1.5) f -= 1.6;
        f = Math.max(0, Math.min(4, f));
        const i = Math.min(4, Math.floor(f) + (dith(x, y, f - Math.floor(f)) ? 1 : 0));
        R(g, x, y + 3, 1, 1, pal[i]);
      }
    }
    if (lvl === 1) for (let y = 4; y < len; y++) for (let x = 9; x < 23; x++) if ((x * 7 + y * 3 + ph) % 13 === 0 && Math.abs(x - 16) < half * (1 - (y - 3) / len)) R(g, x, y, 1, 1, (x + y) % 2 ? '#ffffff' : '#9fe8ff');
    if (lvl === 3) {
      const a = Math.round(Math.sin(t * 12) * (half - 2));
      for (let y = 3; y < len - 1; y++) { R(g, 16 + a * (1 - y / len), y, 1, 1, GOLD[3]); R(g, 15 - a * (1 - y / len), y, 1, 1, GOLD[2]); }
      R(g, 15, len + 1, 2, 2, '#1f5fd1'); R(g, 15, len + 1, 1, 1, '#9fc4ff'); R(g, 15, len + 3, 2, 1, '#1f5fd1');
    }
    if (lvl === 4) {
      const gems = ['#e0115f', '#1fa463', '#2f6fe0'];
      [6, 10, 14].forEach((y, k) => { const w = half * 2 * (1 - (y - 3) / len), x0 = Math.ceil(16 - w / 2); for (let x = x0 + 1; x < 16 + w / 2 - 1; x += 3) R(g, x + ((ph + k) % 3), y, 1, 1, gems[k]); });
      if (Math.sin(t * 6) > 0.6) { R(g, 15, len + 1, 1, 5, '#ffffff'); R(g, 13, len + 3, 5, 1, '#ffffff'); }
    }
    // Tintenkontur
    const d = g.getImageData(0, 0, 32, 32), a = d.data, src = new Uint8Array(32 * 32);
    for (let i = 0; i < 1024; i++) src[i] = a[i * 4 + 3] > 100 ? 1 : 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (src[y * 32 + x]) continue;
      if ((x > 0 && src[y * 32 + x - 1]) || (x < 31 && src[y * 32 + x + 1]) || (y > 0 && src[(y - 1) * 32 + x]) || (y < 31 && src[(y + 1) * 32 + x])) { const i = (y * 32 + x) * 4; a[i] = 20; a[i + 1] = 12; a[i + 2] = 28; a[i + 3] = 255; }
    }
    g.putImageData(d, 0, 0);
    return drillCv;
  }
  // Bohrer fährt nur aus, wenn gebohrt wird (drillExt 0 = eingefahren, 1 = ganz draussen)
  // Nach vorne kommt er aus der Bugnase, nach unten zwischen den Raupen hervor.
  function drillOnPod(g, lvl, o, t) {
    const ext = o.drillExt ?? (o.drillDir ? 1 : 0);
    if (ext < 0.04) return;
    const dir = o.drillDir || { x: 0, y: 1 };
    const cv = paintDrill(lvl, !!o.spinning, t), hide = Math.round((1 - ext) * 30);
    g.save(); g.beginPath();
    if (dir.y === 1) { g.rect(0, 50, POD_W, POD_H - 50); g.clip(); g.drawImage(cv, 44 - 16, 52 - hide); }
    else { g.rect(NX + 45, 0, POD_W, POD_H); g.clip(); g.translate(NX + 45 - hide, NY + 31 + 16); g.rotate(-Math.PI / 2); g.drawImage(cv, 0, 0); }
    g.restore();
  }

  function paintPod(g, o) {
    // o: { levels, body:[hell,mittel,dunkel], thrusting, drillDir:{x,y}|null, spinning, t, cargo:[Farben], vx }
    const L = o.levels, t = o.t || 0, e = L.engine;
    g.clearRect(0, 0, POD_W, POD_H);
    if (o.thrusting && !o.spinning) { drillOnPod(g, L.drill, o, t); exhaust(g, e, o.thrusting, t); }
    else { exhaust(g, e, o.thrusting, t); drillOnPod(g, L.drill, o, t); }
    // Schiffsschraube: dreht beim Fahren schneller, beim Fliegen am schnellsten
    const spin = o.thrusting ? 3 : Math.abs(o.vx || 0) > 5 ? 1.6 : 0.3;
    const [px, py] = PROP_POS[e];
    g.drawImage(propFrame(e, Math.floor(t * 10 * spin) % 4), NX + px - 8, NY + py - 8);
    g.drawImage(nautilus(L, o.body), 0, 0);
    treadLugs(g, t, o.vx || 0);
    // lebendige Details
    if (e === 0) for (let k = 0; k < 3; k++) {          // Kohlerauch aus dem Schlot
      const ph = (t * (o.thrusting ? 1.4 : 0.6) + k / 3) % 1, r = 1 + Math.round(ph * 2);
      const x = NX + 19 - Math.round(ph * 4), y = NY + 13 - Math.round(ph * 10);
      R(g, x - r, y - r, r * 2 + 1, r * 2 + 1, ph < 0.5 ? '#5a5662' : '#7a7682'); R(g, x - r, y - r, r, 1, '#9a96a2');
    }
    if (e === 0 && Math.sin(t * 9) > 0.7) R(g, NX + 18, NY + 14, 2, 1, '#ff9a4a');
    if (e === 1 && o.thrusting) { R(g, NX + 10, NY + 23, 2, 2, '#5ab0ff'); R(g, NX + 9, NY + 24, 1, 1, '#bfe8ff'); }
    if (e === 3 && Math.random() < 0.45) { let x = NX + 19, y = NY + 10; for (let k = 0; k < 5; k++) { x += Math.floor(Math.random() * 3) - 1; y -= 1; R(g, x, y, 1, 1, k % 2 ? '#ffffff' : '#9ff4ff'); } }
    if (e === 4) { const p = Math.sin(t * 6) > 0; R(g, NX + 17, NY + 22, 2, 1, p ? '#d8ffcc' : '#7dff6a'); R(g, NX + 12, NY + 31, 1, 1, p ? '#ffffff' : '#b8ff9a'); }
    if (L.hull === 4) { // Fahne in Spielerfarbe auf dem Burgturm
      const pc = o.body || ['#f1dfa8', '#c9a961', '#7d6230'], wave = Math.floor(t * 6) % 2, fx = NX + 31, fy = NY + 4;
      R(g, fx, fy, 1, 9, '#5a4a3a'); R(g, fx + 1, fy, 7, 5, INK); R(g, fx + 1, fy + 1, 6, 3, pc[1]); R(g, fx + 1, fy + 1, 6, 1, pc[0]); R(g, fx + 6, fy + 1 + wave, 2, 2, pc[2]);
    }
    // geladene Erze glitzern über dem Tresor
    const [w, h] = SAFE[L.cargo], x0 = NX + SAFE_XR - w, y0 = NY + SAFE_YB - h - (L.cargo === 4 ? 2 : 0);
    (o.cargo || []).slice(-4).forEach((col, i) => {
      const gx = x0 + Math.floor(w / 2) - 5 + i * 3, gy = y0 - 4 - (i % 2);
      R(g, gx - 1, gy - 1, 5, 5, INK); R(g, gx, gy, 3, 3, col); R(g, gx, gy, 1, 1, shade(col, 0.6)); R(g, gx + 2, gy + 2, 1, 1, shade(col, -0.4));
    });
  }

  // ===================================================================
  //  WÜRMER (Farbrampen; gezeichnet wird im Spiel mit PIXEL.disc)
  // ===================================================================
  function wormRamp(e, hurt) {
    return memo(`wramp|${e.color}|${e.belly}|${hurt}`, () => hurt
      ? ['#3a0612', '#7a1426', '#b3263c', '#e05a6a', '#ffb0b8']
      : [shade(e.color, -0.6), e.color, mix(e.color, e.belly, 0.5), e.belly, shade(e.belly, 0.45)]);
  }
  const BONE = ['#4a4030', '#8a8068', '#d9cfbd', '#fff6e0'];

  // ===================================================================
  //  GEBÄUDE (nativ, Ränder: Station 8 px, Turm/Museum 16 px)
  // ===================================================================
  function sign(name, color) {
    return memo(`sign|${name}|${color}`, () => {
      const tx = text(name, '#ffffff', INK, true);
      const w = tx.width + 6, h = 16, S = pen(w, h), r = ramp(color);
      S.box(1, 1, w - 2, h - 2, r, 'vgrad', { bevel: true, lo: 1.2, hi: 3.2 });
      S.px(2, 2, GOLD[4]); S.px(w - 3, 2, GOLD[4]); S.px(2, h - 3, GOLD[2]); S.px(w - 3, h - 3, GOLD[2]);
      S.g.drawImage(tx, 2, 0);
      return S.done();
    });
  }

  // ---------------- Gebäude an der Oberfläche ----------------
  // Leinwand je Gebäude: (w·32 + 16) × (h·32 + 8); Boden = unterste Zeile. Lokale x-Koordinate 8 = linker Rand der Station.
  const MARBLE = ['#8a8270', '#b8ae98', '#d9cfb8', '#f2ead6', '#fffaf0'];
  const WARM = ['#a86a14', '#d89a2a', '#ffd36e', '#ffe9a8', '#fff8dc'];
  function checkerFloor(S, x0, x1, y0, y1, a = '#efe6d2', b = '#2a2432') {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) S.px(x, y, ((x >> 3) + (y >> 2)) & 1 ? a : b);
    S.rect(x0, y0, x1 - x0, 1, GOLD[2]);
  }
  function goldFrameWindow(S, x, y, w, h, o = {}) {
    S.box(x, y, w, h, GOLD, 'grad', { bevel: true });
    S.box(x + 2, y + 2, w - 4, h - 4, WARM, 'vgrad', { lo: 2, hi: 4 });
    if (o.bars) for (let bx = x + 4; bx < x + w - 2; bx += 3) S.rect(bx, y + 2, 1, h - 4, GOLD[1]);
    else { S.rect(x + Math.floor(w / 2), y + 2, 1, h - 4, GOLD[1]); S.rect(x + 2, y + Math.floor(h / 2), w - 4, 1, GOLD[1]); }
    if (o.curtain) { S.poly([[x + 2, y + 2], [x + 5, y + 2], [x + 3, y + h - 2], [x + 2, y + h - 2]], ramp(o.curtain), 'grad'); S.poly([[x + w - 2, y + 2], [x + w - 5, y + 2], [x + w - 3, y + h - 2], [x + w - 2, y + h - 2]], ramp(o.curtain), 'grad'); }
  }
  const champagneBottle = (S, x, y) => { S.box(x, y + 3, 3, 6, ['#0b2416', '#14402a', '#1f6a3e', '#3f9a5c', '#9fe0b0'], 'cyl'); S.rect(x + 1, y, 1, 3, GOLD[3]); S.px(x + 1, y + 5, '#f2e6c8'); };

  // Tankstelle Royale: Art-déco-Vordach, goldene Zapfsäule mit Leuchtglobus, Champagner-Kiosk
  function fuelStation(st) {
    const W = st.w * 32, CW = W + 16, CH = st.h * 32 + 8, S = pen(CW, CH), base = CH, col = ramp(st.color);
    checkerFloor(S, 0, CW, base - 5, base);
    // Kiosk rechts (Champagner-Bar)
    const kx = 86, ky = 40;
    S.box(kx, ky, CW - kx - 4, base - 5 - ky, ramp('#efe6d2'), 'grad', { bevel: true, lo: 1.8 });
    for (let y = ky + 6; y < base - 6; y += 6) S.line(kx + 1, y, CW - 6, y, '#d9cfb4');
    goldFrameWindow(S, kx + 5, ky + 10, 24, 22, { curtain: st.color });
    for (const [bx, by] of [[kx + 9, ky + 21], [kx + 14, ky + 21], [kx + 19, ky + 21], [kx + 24, ky + 21]]) champagneBottle(S, bx, by);
    S.rect(kx + 7, ky + 30, 20, 1, GOLD[1]);
    const dx = CW - 26;
    S.box(dx - 2, ky + 6, 18, base - 5 - ky - 6, GOLD, 'grad', { bevel: true });
    S.box(dx, ky + 8, 14, base - 5 - ky - 8, col, 'grad', { bevel: true });
    S.box(dx + 2, ky + 10, 10, 10, WARM, 'vgrad', { lo: 2, hi: 4 });
    S.px(dx + 11, ky + 30, GOLD[4]); S.px(dx + 11, ky + 31, GOLD[2]);
    // Säulen des Vordachs
    for (const px0 of [3, kx - 6]) {
      S.box(px0, 26, 6, base - 5 - 26, IVORY, 'cyl');
      for (const yy of [28, base - 12]) S.box(px0 - 1, yy, 8, 3, GOLD, 'hcyl');
    }
    // Zapfsäule mit Leuchtglobus
    const pxl = 14, pw = 14;
    S.box(pxl - 2, base - 10, pw + 4, 5, MARBLE, 'hcyl', { bevel: true });
    S.box(pxl, 52, pw, base - 10 - 52, col, 'grad', { bevel: true });
    S.box(pxl + 2, 57, pw - 4, 12, ramp('#f4efe4'), 'grad', { bevel: true });
    S.ell(pxl + pw / 2, 62, 3.6, 3.6, IVORY, 'flat', { level: 4 }); S.ring(pxl + pw / 2, 62, 3.8, 3.8, 1, GOLD, 'flat', { level: 2 });
    S.line(pxl + pw / 2, 62, pxl + pw / 2 + 2, 60, '#c8202a'); S.px(pxl + pw / 2, 62, INK);
    S.rect(pxl + 3, 72, pw - 6, 2, GOLD[3]); S.rect(pxl + 3, 75, pw - 6, 2, GOLD[3]);
    S.box(pxl - 1, 48, pw + 2, 4, GOLD, 'hcyl', { bevel: true });
    S.box(pxl + pw - 1, 64, 3, 6, SILVER, 'grad');                    // Haken für die Zapfpistole
    S.ell(pxl + pw / 2, 41, 6, 6.5, ['#c89a4a', '#ffd36e', '#fff1c0', '#fffaf0', '#ffffff'], 'sphere');
    S.ring(pxl + pw / 2, 41, 6, 6.5, 1.2, col, 'flat', { level: 2 });
    S.px(pxl + pw / 2, 39, '#c8202a'); S.rect(pxl + pw / 2 - 1, 40, 3, 1, '#c8202a'); S.px(pxl + pw / 2, 41, '#c8202a');
    crownSmall(S, pxl + pw / 2 - 3, 31);
    // Vordach: rote Blende, Goldkante, weisses Band, Lampen
    S.box(0, 9, CW, 14, col, 'vgrad', { bevel: true, lo: 1.2, hi: 3.4 });
    S.box(0, 6, CW, 4, GOLD, 'hcyl', { bevel: true });
    S.box(0, 20, CW, 3, ramp('#f4efe4'), 'hcyl');
    for (let x = 6; x < CW - 4; x += 8) S.px(x, 21, col[1]);
    S.box(2, 23, CW - 4, 3, ramp('#3a2a2a'), 'flat', { level: 1 });
    for (let x = 22; x < CW - 10; x += 26) { S.ell(x, 27, 2, 1.6, WARM, 'sphere'); }
    // Stufen-Ornament mittig
    const mx = Math.floor(CW / 2);
    S.poly([[mx - 14, 9], [mx - 10, 4], [mx - 5, 4], [mx - 2, 0], [mx + 2, 0], [mx + 5, 4], [mx + 10, 4], [mx + 14, 9]], GOLD, 'grad', { bevel: true });
    const sym = icon('sym_fuel'); if (sym) S.g.drawImage(sym, mx - 8, 7);
    return S.done();
  }
  function crownSmall(S, x, y) { S.poly([[x, y + 4], [x, y], [x + 1.5, y + 2], [x + 3, y - 1], [x + 4.5, y + 2], [x + 6, y], [x + 6, y + 4]], GOLD, 'grad', { bevel: true }); S.px(x + 3, y + 1, '#e0115f'); }

  // Banque Privée: Tempel mit Säulen, Giebel und Tresortür als Eingang
  function bank(st) {
    const W = st.w * 32, CW = W + 16, CH = st.h * 32 + 8, S = pen(CW, CH), base = CH, col = ramp(st.color);
    // Stufen
    S.box(0, base - 4, CW, 4, MARBLE, 'hcyl', { bevel: true });
    S.box(4, base - 8, CW - 8, 4, MARBLE, 'hcyl', { bevel: true });
    S.box(8, base - 12, CW - 16, 4, MARBLE, 'hcyl', { bevel: true });
    const top = 34, floor = base - 12;
    // Rückwand
    S.box(10, top, CW - 20, floor - top, ['#6a6250', '#8a8270', '#a89e88', '#c4baa2', '#d9cfb8'], 'flat', { level: 2 });
    for (let y = top + 6; y < floor; y += 6) S.line(11, y, CW - 12, y, '#968c76');
    // Fenster mit Gittern und blauen Vorhängen
    for (const wx of [24, CW - 36]) goldFrameWindow(S, wx, top + 12, 12, 26, { bars: true, curtain: st.color });
    // Tresortür als Eingang
    const cx = CW / 2, cy = floor - 17;
    S.box(cx - 18, top + 4, 36, floor - top - 4, ['#3a3226', '#4a4030', '#5a4e3a', '#6a5e48', '#7a6e58'], 'flat', { level: 1 });
    S.ell(cx, cy, 15, 15, SILVER, 'sphere');
    S.ring(cx, cy, 15, 15, 2, GOLD, 'flat', { level: 2 });
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; S.px(Math.round(cx + Math.cos(a) * 12.5), Math.round(cy + Math.sin(a) * 12.5), SILVER[4]); S.px(Math.round(cx + Math.cos(a) * 12.5) + 1, Math.round(cy + Math.sin(a) * 12.5) + 1, SILVER[0]); }
    S.ring(cx, cy, 7, 7, 1.4, GOLD, 'flat', { level: 3 });
    for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + 0.3; S.line(cx - Math.cos(a) * 7, cy - Math.sin(a) * 7, cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, GOLD[2]); }
    S.ell(cx, cy, 2.2, 2.2, GOLD, 'sphere');
    // Säulen (ionisch, kanneliert)
    for (const x of [12, 38, CW - 48, CW - 22]) {
      S.box(x, top + 3, 10, floor - top - 3, IVORY, 'cyl');
      for (let k = 2; k < 9; k += 2) S.line(x + k, top + 4, x + k, floor - 2, IVORY[1]);
      S.box(x - 2, floor - 3, 14, 3, MARBLE, 'hcyl', { bevel: true });
      S.box(x - 2, top, 14, 4, GOLD, 'hcyl', { bevel: true });
      S.ell(x - 1, top + 2, 2, 2, GOLD, 'sphere'); S.ell(x + 11, top + 2, 2, 2, GOLD, 'sphere');
    }
    // Gebälk mit Fries und Zahnschnitt
    S.box(4, 24, CW - 8, 10, MARBLE, 'grad', { bevel: true });
    for (let x = 6; x < CW - 6; x += 4) S.rect(x, 31, 2, 2, MARBLE[1]);
    const fr = text('BANQUE PRIVÉE', GOLD[2], null, true);
    S.g.drawImage(fr, Math.round(cx - fr.width / 2), 21);
    // Giebel mit Münzrelief und Goldspitzen
    S.poly([[2, 24.5], [cx, 3], [CW - 2, 24.5]], MARBLE, 'grad', { bevel: true });
    S.poly([[14, 22], [cx, 8], [CW - 14, 22]], ['#8a8270', '#a89e88', '#c4baa2', '#d9cfb8', '#e8dfc8'], 'grad');
    S.ell(cx, 16, 5, 5, GOLD, 'sphere'); S.ring(cx, 16, 5, 5, 1, GOLD, 'flat', { level: 1 });
    S.rect(cx - 0.5, 13, 2, 7, '#c8202a'); S.rect(cx - 2.5, 15, 6, 2, '#c8202a'); S.rect(cx, 14, 1, 5, '#ffffff'); S.rect(cx - 2, 16, 5, 1, '#ffffff');
    for (const [ax, ay] of [[cx, 1], [4, 22], [CW - 5, 22]]) S.ell(ax, ay, 2.2, 2.2, GOLD, 'sphere');
    // Laternen
    for (const lx of [3, CW - 7]) { S.box(lx, floor - 22, 4, 6, WARM, 'grad', { bevel: true }); S.box(lx - 1, floor - 23, 6, 2, GOLD, 'hcyl'); S.box(lx + 1, floor - 16, 2, 16, ramp('#2a2632'), 'cyl'); }
    return S.done();
  }

  // Atelier Privé: Pariser Couture-Werkstatt mit Mansarddach und Schaufenstern
  function atelier(st) {
    const W = st.w * 32, CW = W + 16, CH = st.h * 32 + 8, S = pen(CW, CH), base = CH, col = ramp(st.color);
    const shopTop = base - 50, upTop = 40;
    // Mansarddach
    S.poly([[6, upTop], [14, 14], [CW - 14, 14], [CW - 6, upTop]], ['#22262e', '#363b46', '#4a505c', '#6a7280', '#8a92a0'], 'grad', { bevel: true });
    for (let y = 18; y < upTop; y += 4) for (let x = 10; x < CW - 10; x += 6) S.px(x + ((y >> 2) & 1) * 3, y, '#2a2e38');
    S.box(12, 11, CW - 24, 4, SILVER, 'hcyl', { bevel: true });
    S.box(CW - 36, 0, 10, 12, ramp('#8a4a3a'), 'grad', { bevel: true }); S.box(CW - 37, 0, 12, 3, ramp('#6a3a2a'), 'hcyl');
    for (const dx of [36, CW / 2 - 8, CW - 52]) {                     // Gauben mit Rundfenster
      S.box(dx, 20, 16, 18, ramp('#efe6d2'), 'grad', { bevel: true });
      S.poly([[dx - 2, 21], [dx + 8, 14], [dx + 18, 21]], ['#22262e', '#363b46', '#4a505c', '#6a7280', '#8a92a0'], 'grad', { bevel: true });
      S.ell(dx + 8, 29, 5, 5, WARM, 'sphere'); S.ring(dx + 8, 29, 5, 5, 1, GOLD, 'flat', { level: 2 });
      S.line(dx + 8, 24, dx + 8, 34, GOLD[1]); S.line(dx + 3, 29, dx + 13, 29, GOLD[1]);
    }
    // Obergeschoss: Kalkstein, hohe Fenster mit Balkongitter
    S.box(6, upTop, CW - 12, shopTop - upTop, ramp('#efe6d2'), 'grad', { bevel: true, lo: 1.8 });
    for (let y = upTop + 5; y < shopTop; y += 5) S.line(7, y, CW - 8, y, '#d9cfb4');
    for (const wx of [18, CW / 2 - 9, CW - 36]) {
      goldFrameWindow(S, wx, upTop + 4, 18, 26, { curtain: '#b8262e' });
      S.box(wx - 3, upTop + 22, 24, 2, GOLD, 'hcyl');
      for (let k = 0; k < 24; k += 3) S.rect(wx - 3 + k, upTop + 24, 1, 6, GOLD[1]);
      S.box(wx - 3, upTop + 30, 24, 2, ramp('#cfc6b4'), 'hcyl', { bevel: true });
    }
    // Markise
    for (let x = 4; x < CW - 4; x += 8) {
      const r = (x / 8) % 2 ? ramp('#f4efe4') : col;
      S.box(x, shopTop - 2, 8, 10, r, 'vgrad', { lo: 1.4, hi: 3.4 });
      S.ell(x + 4, shopTop + 8, 4, 3, r, 'flat', { level: 1 });
    }
    S.box(2, shopTop - 4, CW - 4, 3, GOLD, 'hcyl', { bevel: true });
    // Ladenfront in Hausfarbe mit zwei Schaufenstern
    const fy = shopTop + 10;
    S.box(6, fy, CW - 12, base - 4 - fy, col, 'grad', { bevel: true });
    const win = (x, w, fill) => { S.box(x, fy + 4, w, base - 14 - fy, GOLD, 'grad', { bevel: true }); S.box(x + 2, fy + 6, w - 4, base - 18 - fy, WARM, 'vgrad', { lo: 2, hi: 4 }); S.box(x + 1, base - 13, w - 2, 3, ramp('#8a6a3a'), 'hcyl'); fill(x + 2, fy + 6, w - 4, base - 18 - fy); };
    win(12, 52, (x, y, w, h) => {                                      // Bohrköpfe auf Podesten
      for (const [k, pal] of [[0, SILVER], [1, GOLD], [2, ['#4a7a9a', '#7ab0d0', '#bfe8ff', '#e8fbff', '#ffffff']]]) {
        const bx = x + 6 + k * 15, by = y + h - 6;
        S.box(bx - 1, by, 10, 6, IVORY, 'grad', { bevel: true });
        S.poly([[bx, by - 1], [bx + 8, by - 1], [bx + 4, by - 12 + k * 0]], pal, 'grad', { bevel: true });
      }
    });
    win(CW - 64, 52, (x, y, w, h) => {                                  // Zahnrad und Champagner
      S.shape((px, py) => { const dx = px - (x + 16), dy = py - (y + h / 2), r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); return r >= 3 && r <= 7 + (Math.cos(a * 8) > 0.2 ? 2 : 0); }, [x + 5, y + h / 2 - 10, x + 27, y + h / 2 + 10], GOLD, 'sphere', { cx: x + 16, cy: y + h / 2, rx: 9, ry: 9 });
      champagneBottle(S, x + 32, y + h - 12); champagneBottle(S, x + 37, y + h - 12);
      S.box(x + 30, y + h - 3, 14, 3, IVORY, 'hcyl');
    });
    // Tür
    const dx = CW / 2 - 12;
    S.box(dx - 2, fy + 2, 28, base - 4 - fy - 2, GOLD, 'grad', { bevel: true });
    S.box(dx, fy + 4, 24, base - 4 - fy - 4, ramp(col[1]), 'grad', { bevel: true });
    S.box(dx + 3, fy + 7, 8, base - fy - 20, WARM, 'vgrad', { lo: 2, hi: 4 }); S.box(dx + 13, fy + 7, 8, base - fy - 20, WARM, 'vgrad', { lo: 2, hi: 4 });
    S.px(dx + 11, fy + 24, GOLD[4]); S.px(dx + 13, fy + 24, GOLD[4]);
    S.box(0, base - 4, CW, 4, MARBLE, 'hcyl', { bevel: true });
    // Ausleger mit Zahnrad-Schild
    S.box(CW - 8, shopTop - 18, 2, 12, ramp('#2a2632'), 'cyl'); S.line(CW - 18, shopTop - 18, CW - 7, shopTop - 18, '#2a2632');
    const sym = icon('sym_gear'); if (sym) S.g.drawImage(sym, CW - 22, shopTop - 17);
    return S.done();
  }

  // Fernand, der Butler (20×36, Blick nach rechts). pose: stand · bow · walk0 · walk1 · pump
  function butler(pose) {
    return memo(`butler|${pose}`, () => {
      const S = pen(20, 36), coat = ramp('#22202c'), skin = ramp('#f2c9a5'), grey = ramp('#b8b2a6');
      const bow = pose === 'bow' ? 1 : 0, hx = 9 + bow * 3, hy = 7 + bow * 4;
      // Beine
      const legs = pose === 'walk0' ? [[6, -2], [11, 2]] : pose === 'walk1' ? [[6, 2], [11, -2]] : [[7, 0], [10, 0]];
      for (const [lx, sw] of legs) { S.line(lx + 1, 24, lx + 1 + sw, 32, '#1a1820', 2); S.box(lx + sw - 1, 32, 6, 3, ramp('#14121a'), 'grad', { bevel: true }); S.px(lx + sw + 3, 32, '#ffffff'); }
      // Frack mit Schössen
      S.poly([[4, 13 + bow * 3], [13 + bow * 2, 12 + bow * 3], [14, 25], [4, 27]], coat, 'grad', { bevel: true });
      S.poly([[3, 20], [6, 20], [5, 29], [2, 28]], coat, 'grad');
      S.poly([[9 + bow * 2, 13 + bow * 3], [13 + bow * 2, 13 + bow * 3], [13, 24], [10, 24]], ramp('#f4efe4'), 'grad');
      S.px(11 + bow * 2, 14 + bow * 3, '#1a1420'); S.px(12 + bow * 2, 14 + bow * 3, '#1a1420'); S.px(10 + bow * 2, 15 + bow * 3, '#1a1420');
      for (const y of [18, 21]) S.px(11, y, GOLD[3]);
      // Arm
      if (pose === 'pump') { S.line(10, 15, 16, 16, coat[1], 2); S.ell(17, 16, 1.6, 1.6, ramp('#ffffff'), 'sphere'); }
      else if (pose === 'bow') { S.line(9, 16, 6, 21, coat[1], 2); S.ell(6, 21, 1.5, 1.5, ramp('#ffffff'), 'sphere'); S.line(13, 16, 15, 19, coat[1], 2); S.px(16, 19, '#ffffff'); }
      else { const sw = pose === 'walk0' ? 2 : pose === 'walk1' ? -2 : 0; S.line(9, 15, 9 + sw, 22, coat[1], 2); S.ell(9 + sw, 23, 1.5, 1.5, ramp('#ffffff'), 'sphere'); }
      // Kopf: Glatze, graue Schläfen, Schnurrbart
      S.box(hx - 1, hy + 4, 3, 2, skin, 'cyl');
      S.ell(hx, hy, 4.5, 5, skin, 'sphere');
      S.ell(hx - 3.5, hy + 1, 1.4, 2.2, grey, 'sphere');
      S.px(hx + 2, hy - 1, INK); S.rect(hx + 1, hy - 2, 3, 1, '#8a857a');
      S.rect(hx + 1, hy + 2, 4, 1, grey[2]); S.px(hx + 4, hy + 3, grey[1]);
      S.px(hx + 5, hy, skin[2]);
      S.px(hx - 1, hy - 4, '#fff6e8');
      return S.done();
    });
  }

  function station(st) {
    return memo(`station2|${st.id}|${st.w}|${st.h}`, () => st.id === 'fuel' ? fuelStation(st) : st.id === 'sell' ? bank(st) : atelier(st));
  }
  // Positionen für das Spiel (lokale Koordinaten in der Tankstellen-Leinwand)
  const FUEL_LAYOUT = { hoseX: 28, hoseY: 62, hookX: 29, hookY: 66, butlerHome: 38, pumpRight: 30 };

  // Turm-Geometrie (für die Prinzessin im Spiel)
  function towerLayout(st) {
    const W = st.w * 32, cw = W + 32, bodyTop = 104;
    return { cw, ch: st.h * 32 + 80, bodyTop, winX: cw / 2 - 20, winY: bodyTop + 22, winW: 40, winH: 50, sillY: bodyTop + 72, signY: st.h * 32 + 80 - 96 };
  }
  function towerBase(st) {
    return memo(`tower|${st.w}|${st.h}`, () => {
      const L = towerLayout(st), W = st.w * 32, cw = L.cw, ch = L.ch, S = pen(cw, ch), ox = 16, base = ch, bodyTop = L.bodyTop, cx = cw / 2;
      const roof = ramp(st.color), rnd = PIXEL.rng(5);
      // Mauerwerk 12×6
      for (let y = bodyTop; y < base; y++) for (let x = ox; x < ox + W; x++) {
        const row = Math.floor((y - bodyTop) / 6), by = (y - bodyTop) % 6, bx = (x - ox + (row % 2) * 6) % 12;
        let c;
        if (by === 5 || bx === 11) c = '#8e8676';
        else { const tint = ((row * 7 + Math.floor((x - ox + (row % 2) * 6) / 12) * 13) % 5) * 0.03; c = by === 0 ? '#f0e8d6' : bx === 0 ? '#e2d9c6' : by === 4 ? '#b8ae9a' : '#d4cbb8'; c = shade(c, -tint); }
        if (x < ox + 3) c = shade(c, 0.12); if (x > ox + W - 4) c = shade(c, -0.18);
        S.px(x, y, c);
      }
      for (let k = 0; k < 60; k++) { const x = ox + 2 + Math.floor(rnd() * 20), y = base - 6 - Math.floor(rnd() * 90 * rnd()); S.px(x, y, rnd() < 0.5 ? '#3f8a3a' : '#6fc050'); }
      // Balkon mit Zinnen
      for (let x = 2; x < cw - 4; x += 16) S.box(x, bodyTop - 26, 11, 12, STONE, 'grad', { bevel: true });
      S.box(0, bodyTop - 14, cw, 12, STONE, 'hcyl', { bevel: true });
      for (let x = 6; x < cw - 4; x += 12) S.box(x, bodyTop - 2, 6, 5, STONE, 'grad', { bevel: true });
      // Kegeldach mit Schindeln
      const peak = 12, roofBot = bodyTop - 26;
      for (let y = peak; y < roofBot; y++) {
        const half = (y - peak) / (roofBot - peak) * (cw / 2 - 2) + 1.5;
        for (let x = Math.floor(cx - half); x < Math.ceil(cx + half); x++) {
          const rowY = Math.floor((y - peak) / 6), ry = (y - peak) % 6, sx = ((x + (rowY % 2) * 4) % 8 + 8) % 8;
          const nx = (x + 0.5 - cx) / half;
          let f = 2.4 - nx * 1.3 + (ry < 2 ? 0.7 : 0) - (ry === 4 ? 0.5 : 0);
          if (ry === 5 || (ry >= 3 && sx === 0)) f = 0.3;
          f = Math.max(0, Math.min(4, f));
          S.px(x, y, roof[Math.min(4, Math.floor(f) + (dith(x, y, f - Math.floor(f)) ? 1 : 0))]);
        }
      }
      S.rect(cx, 0, 1, peak - 2, '#5a4a3a'); S.ell(cx + 0.5, peak - 2, 2.5, 2.5, GOLD, 'sphere');
      // Bogenfenster
      const inWin = (px, py, g = 0) => px >= L.winX - g && px < L.winX + L.winW + g && py < L.winY + L.winH + g && (py >= L.winY + 20 || ((px - cx) / (L.winW / 2 + g)) ** 2 + ((py - L.winY - 20) / (20 + g)) ** 2 <= 1);
      S.shape((px, py) => inWin(px, py, 4), [L.winX - 5, L.winY - 5, L.winX + L.winW + 5, L.winY + L.winH + 5], STONE, 'grad', { bevel: true, lo: 2, hi: 4 });
      S.shape((px, py) => inWin(px, py), [L.winX, L.winY, L.winX + L.winW, L.winY + L.winH], ['#140a1c', '#1e1028', '#2a1838', '#3a2448', '#4a3058'], 'vgrad', { lo: 0.5, hi: 3 });
      const pink = ramp('#e66aa3');
      S.shape((px, py) => inWin(px, py) && px < L.winX + 8 - (py - L.winY) * 0.06, [L.winX, L.winY, L.winX + 9, L.winY + L.winH], pink, 'cyl');
      S.shape((px, py) => inWin(px, py) && px > L.winX + L.winW - 8 + (py - L.winY) * 0.06, [L.winX + L.winW - 9, L.winY, L.winX + L.winW, L.winY + L.winH], pink, 'cyl');
      S.box(L.winX - 7, L.sillY, L.winW + 14, 5, STONE, 'hcyl', { bevel: true });
      // Tür
      const dw = 28, dh = 44, dx = cx - 14, dy = base - dh;
      const inDoor = (px, py) => px >= dx && px < dx + dw && py < base && (py >= dy + 14 || ((px - cx) / 14) ** 2 + ((py - dy - 14) / 14) ** 2 <= 1);
      S.shape((px, py) => inDoor(px + (px < cx ? 3 : -3), py + 3) || inDoor(px, py), [dx - 4, dy - 4, dx + dw + 4, base], STONE, 'grad', { bevel: true });
      S.shape(inDoor, [dx, dy, dx + dw, base], roof, 'grad', { bevel: true, hi: 2.8 });
      for (let x = dx + 4; x < dx + dw; x += 5) S.line(x, dy + 4, x, base - 1, roof[0]);
      for (const hy of [dy + 18, base - 10]) S.rect(dx + 2, hy, dw - 4, 2, '#3a3242');
      S.ell(cx + 6, base - 20, 2, 2, GOLD, 'sphere');
      return S.done();
    });
  }

  // Museum: oben die Couture-Galerie (pro Area eine Etage mit 5 Vitrinen, wächst
  // mit jeder belegten Area), unten die Galerie Minérale mit allen entdeckten Erzen.
  function museum(st, deliveredIds, discoveredIds = []) {
    const D = GAME_DATA, areas = D.areas.length;
    const done = new Set(deliveredIds), found = new Set(discoveredIds);
    let rows = 1;
    D.artifacts.forEach(a => { if (done.has(a.id)) rows = Math.max(rows, a.area); });
    return memo(`museum|${rows}|${[...done].sort().join(',')}|${[...found].sort().join(',')}`, () => {
      const W = st.w * 32, galH = 52, floorH = 42, pedH = 36;
      const bodyH = 16 + rows * floorH + galH + 14, H = bodyH + pedH + 18;
      const cw = W + 32, S = pen(cw, H), ox = 16, base = H, top = base - bodyH;
      const marble = ramp('#ece4d2'), bronze = ramp(st.color);
      for (let k = 0; k < 3; k++) S.box(ox - 12 + k * 4, base - 4 - k * 4, W + 24 - k * 8, 4, marble, 'hcyl', { bevel: true });
      S.box(ox, top, W, bodyH - 12, marble, 'flat', { level: 2 });
      for (let y = top; y < base - 12; y++) for (let x = ox; x < ox + W; x++) if (dith(x, y, 0.3)) S.px(x, y, marble[3]);
      for (const cx of [ox + 1, ox + W - 8]) { S.box(cx, top + 4, 7, bodyH - 18, marble, 'cyl'); S.line(cx + 3, top + 6, cx + 3, base - 16, marble[2]); }
      // Couture-Etagen: Area 1 unten, tiefere Areas darüber
      const galTop = base - 14 - galH;
      for (let r = 0; r < rows; r++) {
        const vy = galTop - (r + 1) * floorH + 3;
        S.box(ox + 8, vy + 37, W - 16, 3, GOLD, 'hcyl');                                  // Gesims der Etage
        const list = D.artifacts.filter(a => a.area === r + 1);
        list.slice(0, 5).forEach((a, i) => {
          const vx = ox + 10 + Math.round(i * (W - 20 - 38) / 4);
          S.box(vx, vy, 38, 36, GOLD, 'grad', { bevel: true });
          S.box(vx + 2, vy + 2, 34, 32, ['#140c1c', '#1e1628', '#2b2236', '#3a304a', '#4a3e5c'], 'vgrad', { lo: 0.8, hi: 3 });
          if (done.has(a.id)) { const ic = icon(a.id); if (ic) S.g.drawImage(ic, vx + 3, vy + 2); }
          else { S.rect(vx + 17, vy + 13, 4, 2, '#4a3e5c'); S.rect(vx + 19, vy + 15, 2, 3, '#4a3e5c'); S.rect(vx + 18, vy + 21, 2, 2, '#4a3e5c'); }
          S.line(vx + 4, vy + 4, vx + 9, vy + 4, 'rgba(255,255,255,0.3)');
        });
      }
      // Galerie Minérale: 24 Nischen für alle Erze (2 Reihen × 12)
      S.box(ox + 6, galTop, W - 12, galH, ramp('#3a2c22'), 'vgrad', { bevel: true, lo: 0.8, hi: 2.4 });
      D.ores.forEach((ore, i) => {
        const nx = ox + 9 + (i % 12) * Math.floor((W - 18) / 12), ny = galTop + 3 + Math.floor(i / 12) * 24;
        S.box(nx, ny, 16, 21, ['#0e0814', '#160e1e', '#1e1628', '#2b2236', '#3a304a'], 'vgrad', { lo: 0.6, hi: 2.5 });
        if (found.has(ore.id)) S.g.drawImage(PIXEL.crystal(ore.color, ore.form), nx, ny + 2);
        else S.rect(nx + 7, ny + 9, 2, 2, '#3a304a');
      });
      S.box(0, top - 9, cw, 9, GOLD, 'hcyl', { bevel: true });
      for (let x = 4; x < cw - 2; x += 5) S.rect(x, top - 4, 2, 2, GOLD[1]);
      S.poly([[0, top - 9], [cw / 2, top - 9 - pedH], [cw, top - 9]], bronze, 'grad', { bevel: true });
      S.poly([[14, top - 12], [cw / 2, top - 6 - pedH], [cw - 14, top - 12]], bronze, 'flat', { level: 1 });
      const mt = text('MUSÉE', '#ffe08a', INK);
      S.g.drawImage(mt, Math.round(cw / 2 - mt.width / 2), Math.round(top - 9 - pedH * 0.45 - mt.height / 2));
      return S.done();
    });
  }

  // Schutzschirm-Kuppel (gedithert, wirkt halbdurchsichtig)
  function shieldDome() {
    return memo('shielddome', () => {
      const r = 30, s = r * 2 + 1, [c, g] = mk(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const d = Math.hypot(x - r, y - r);
        if (d > r) continue;
        if (d > r - 1.5) R(g, x, y, 1, 1, (Math.floor(Math.atan2(y - r, x - r) * 12) & 1) ? '#ffd23f' : '#fff0a0');
        else if (d > r - 2.5) { if (dith(x, y, 0.5)) R(g, x, y, 1, 1, '#c89a20'); }
        else if (d > r - 6 && dith(x, y, 0.18 * (1 - (r - d) / 6))) R(g, x, y, 1, 1, '#ffd23f');
        else if (dith(x, y, 0.03)) R(g, x, y, 1, 1, '#fff0a0');
      }
      for (let k = 0; k < 6; k++) { const a = -2.4 + k * 0.12; R(g, Math.round(r + Math.cos(a) * (r - 5)), Math.round(r + Math.sin(a) * (r - 5)), 2, 1, '#ffffff'); }
      return c;
    });
  }

  Object.assign(PIXEL, { POD_W, POD_H, POD_OX, POD_OY, paintPod, paintDrill, wormRamp, BONE, sign, station, butler, FUEL_LAYOUT, towerBase, towerLayout, museum, shieldDome });
})();
