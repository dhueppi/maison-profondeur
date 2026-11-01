// =====================================================================
//  SPRITES (Teil 5) – Endboss «Le Baron Noir» und sein Salon
//  Nativ gezeichnet. Der Baron schaut nach rechts (das Spiel spiegelt).
//  Leinwand 140×116, Körpermitte bei (64, 62).
// =====================================================================
(() => {
  'use strict';
  const { ramp, mix, shade, dith, rng, pen, memo, INK, GOLD, SILVER, IVORY } = PIXEL;
  const BOSS_W = 140, BOSS_H = 116, BOSS_OX = 64, BOSS_OY = 62;

  // pose: idle0 · idle1 · raise (Krallen hoch) · roar (Maul offen) · stun · dead
  // mood: normal · hurt (rot) · rage (glühende Augen)
  function baron(pose, mood) {
    return memo(`baron|${pose}|${mood}`, () => {
      const S = pen(BOSS_W, BOSS_H);
      const tint = c => mood === 'hurt' ? mix(c, '#ff4a4a', 0.45) : c;
      const fur = ramp(tint('#40323e')), furL = ramp(tint('#5a4656'));
      const bob = pose === 'idle1' ? 2 : pose === 'stun' ? 5 : 0;
      const pink = ramp(tint('#e07a98')), white = ramp(tint('#f2ece0')), claw = ramp(tint('#e8f4ff'));
      // Schwanz & Hinterpfote
      S.poly([[14, 70 + bob], [2, 62 + bob], [4, 58 + bob], [18, 64 + bob]], pink, 'grad');
      S.ell(30, 104, 14, 8, pink, 'sphere');
      for (let k = 0; k < 3; k++) S.poly([[20 + k * 6, 108], [24 + k * 6, 108], [21 + k * 6, 114]], claw, 'flat', { level: 3 });
      // Körper
      S.ell(60, 66 + bob, 54, 44, fur, 'sphere');
      for (let k = 0; k < 40; k++) { const a = k * 2.4, r = 20 + (k * 7) % 30; S.px(Math.round(50 + Math.cos(a) * r), Math.round(62 + bob + Math.sin(a) * r * 0.75), fur[3]); }
      // Frack: Hemdbrust, Revers, Knöpfe
      S.ell(82, 76 + bob, 22, 28, white, 'sphere');
      S.poly([[62, 50 + bob], [74, 52 + bob], [70, 96 + bob], [60, 92 + bob]], ramp(tint('#1a1420')), 'grad', { bevel: true });
      S.poly([[102, 54 + bob], [94, 52 + bob], [98, 96 + bob], [104, 88 + bob]], ramp(tint('#1a1420')), 'grad', { bevel: true });
      for (const y of [66, 76, 86]) { S.px(84, y + bob, GOLD[3]); S.px(85, y + bob, GOLD[2]); S.px(84, y + 1 + bob, GOLD[1]); }
      // Fliege
      S.poly([[72, 46 + bob], [83, 52 + bob], [72, 58 + bob]], ramp(tint('#c8202a')), 'grad', { bevel: true });
      S.poly([[94, 46 + bob], [83, 52 + bob], [94, 58 + bob]], ramp(tint('#c8202a')), 'grad', { bevel: true });
      S.ell(83, 52 + bob, 3, 3, ramp(tint('#a01020')), 'sphere');
      // Kopf
      const hy = 34 + bob;
      S.ell(96, hy, 30, 25, furL, 'sphere');
      // Sternnase (der Ur-Maulwurf ist ein Sternmull – sehr distinguiert)
      S.ell(122, hy + 8, 13, 10, pink, 'sphere');
      for (let k = 0; k < 9; k++) { const a = -1.4 + k * 0.35; S.ell(128 + Math.cos(a) * 7, hy + 8 + Math.sin(a) * 8, 2.4, 2.4, pink, 'sphere', { min: 2 }); }
      // Maul
      if (pose === 'roar' || pose === 'dead') {
        S.ell(116, hy + 22, 10, 7, ['#14020a', '#2b0409', '#3a060e', '#5c0a14', '#8a1a2a'], 'flat', { level: 1 });
        for (let x = 108; x < 125; x += 3) S.poly([[x, hy + 16], [x + 2, hy + 16], [x + 1, hy + 20]], ['#efe6d2', '#efe6d2', '#efe6d2', '#ffffff', '#ffffff'], 'flat', { level: 4 });
      } else S.line(108, hy + 18, 120, hy + 19, fur[0]);
      // Schnurrhaare
      for (const [dx, dy] of [[14, -3], [15, 1], [13, 5]]) S.line(126, hy + 6 + dy, 126 + dx, hy + 4 + dy * 2, '#d8d0c8');
      // Augen: eines mit Monokel
      const eye = mood === 'rage' ? '#ff3a2a' : pose === 'stun' || pose === 'dead' ? '#ffffff' : INK;
      S.rect(92, hy - 4, 3, 3, eye);
      if (pose === 'stun') { S.px(93, hy - 3, INK); }
      S.ring(106, hy - 4, 6.5, 6.5, 1.6, GOLD, 'flat', { level: 3 });
      S.ell(106, hy - 4, 4.8, 4.8, ['#5a8ab8', '#7aaad8', '#a8d0f0', '#d8f0ff', '#ffffff'], 'grad');
      S.rect(105, hy - 5, 3, 3, eye); S.px(103, hy - 7, '#ffffff');
      S.path([[106, hy + 3], [104, hy + 14], [98, hy + 22], [92, hy + 18 + bob * 0]], GOLD[2]);
      // Zylinder
      const tilt = pose === 'stun' ? 6 : 0;
      S.ell(92, hy - 20 + tilt, 20, 4, ramp(tint('#2a2632')), 'sphere');
      S.poly([[80, hy - 20 + tilt], [80, hy - 44 + tilt], [104, hy - 46 + tilt], [104, hy - 21 + tilt]], ramp(tint('#2a2632')), 'cyl');
      S.box(80, hy - 27 + tilt, 24, 5, ramp(tint('#9a1a2a')), 'hcyl');
      S.ell(92, hy - 45 + tilt, 12, 2.5, ramp(tint('#4a4458')), 'flat', { level: 3 });
      // Vorderpranke mit Diamantkrallen
      const raised = pose === 'raise' ? -18 : pose === 'stun' ? 6 : 0;
      const cx = 114, cy = 86 + raised;
      S.ell(cx, cy, 14, 11, pink, 'sphere');
      for (let k = 0; k < 4; k++) {
        const y = cy - 9 + k * 6;
        S.poly([[cx + 8, y], [cx + 8, y + 5], [cx + 24, y + 4 + (k - 1.5)], [cx + 22, y + 1]], claw, 'grad', { edge: true, edgeCol: '#5a7a9a' });
        S.px(cx + 20, y + 2, '#ffffff');
      }
      if (pose === 'stun') for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; S.ell(96 + Math.cos(a) * 18, hy - 54 + Math.sin(a) * 5, 2.4, 2.4, GOLD, 'sphere'); }
      return S.done();
    });
  }

  // Salon des Barons: Damasttapete mit Goldmuster (64×64, nahtlos)
  const salonTile = () => memo('salon', () => {
    const S = pen(64, 64), red = ['#1e060c', '#2e0a14', '#40101c', '#5a1a28', '#7a2a38'];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) S.px(x, y, dith(x, y, 0.35) ? red[1] : red[2]);
    for (const [cx, cy] of [[16, 16], [48, 48], [48, 16 - 64], [16, 48], [48, 16]]) {
      if (cy < 0) continue;
      const big = (cx + cy) % 64 === 32;
      if (!big) continue;
      for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) {
        const x = cx + ox, y = cy + oy;
        S.poly([[x, y - 12], [x + 7, y], [x, y + 12], [x - 7, y]], ['#5a3a10', '#8a5a18', '#a8761c', '#c8962a', '#e0b040'], 'grad', { max: 2 });
        S.ell(x, y, 2.5, 2.5, [red[1], red[1], red[2], red[3], red[3]], 'flat', { level: 2 });
        for (const [dx, dy] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) S.px(x + dx, y + dy, '#8a5a18');
      }
    }
    S.rect(0, 62, 64, 2, '#14040a');
    return S.c;
  });
  const chandelier = () => memo('chandelier', () => {
    const S = pen(56, 48);
    S.line(28, 0, 28, 14, GOLD[1]);
    S.ell(28, 20, 22, 5, GOLD, 'sphere');
    S.ell(28, 28, 8, 10, GOLD, 'sphere');
    for (const x of [8, 18, 28, 38, 48]) {
      S.box(x - 1, 8, 3, 9, IVORY, 'cyl');
      S.ell(x + 0.5, 5, 2, 3.5, ['#c8301a', '#ff7a1a', '#ffc34a', '#fff6d0', '#ffffff'], 'grad');
    }
    for (let k = 0; k < 7; k++) { const x = 10 + k * 6; S.ell(x, 30 + (k % 2) * 4, 1.6, 3, ['#7aaad8', '#a8d0f0', '#d8f0ff', '#ffffff', '#ffffff'], 'grad'); }
    return S.done();
  });
  const portrait = v => memo(`portrait|${v}`, () => {
    const S = pen(48, 60);
    S.box(1, 1, 46, 58, GOLD, 'grad', { bevel: true });
    S.box(5, 5, 38, 50, ['#14100c', '#1e1812', '#2a2018', '#3a2c20', '#4a3828'], 'vgrad', { lo: 0.8, hi: 3 });
    const f = ramp(['#40323e', '#4a3a2a', '#3a3a4a'][v % 3]);
    S.ell(24, 46, 15, 11, ramp('#1a1420'), 'sphere');
    S.ell(24, 30, 10, 9, f, 'sphere');
    S.ell(31, 32, 4, 3, ramp('#e07a98'), 'sphere');
    S.box(17, 12, 12, 10, ramp('#2a2632'), 'cyl'); S.ell(23, 22, 9, 1.6, ramp('#2a2632'), 'flat', { level: 2 });
    if (v % 2) S.ring(27, 28, 3, 3, 1, GOLD, 'flat', { level: 3 });
    S.px(24, 40, '#c8202a'); S.px(23, 40, '#c8202a'); S.px(25, 40, '#c8202a');
    S.box(14, 52, 20, 4, GOLD, 'flat', { level: 2 });
    return S.done();
  });
  const bossRock = () => memo('bossrock', () => { const S = pen(20, 20); S.ell(10, 10, 8, 7.5, ramp('#5a4e5a'), 'sphere'); S.line(6, 9, 12, 7, '#2a2230'); S.px(7, 6, '#ffffff'); return S.done(); });

  Object.assign(PIXEL, { BOSS_W, BOSS_H, BOSS_OX, BOSS_OY, baron, salonTile, chandelier, portrait, bossRock });
})();
