// =====================================================================
//  SPRITES (Teil 6) – Porträts für die Dialoge der Storyline (48×48, nativ)
//  amelie (Prinzessin) · fernand (Butler) · baron (Le Baron Noir) · narrator
// =====================================================================
(() => {
  'use strict';
  const { ramp, pen, memo, INK, GOLD, SILVER, IVORY } = PIXEL;
  const SKIN = ramp('#f2c9a5'), dark = c => [c, c, c, c, c];

  const DRAW = {
    amelie: S => {
      const hair = ramp('#f2c14e'), dress = ramp('#e66aa3');
      S.ell(24, 26, 17, 20, hair, 'sphere');                                   // Haar hinten
      S.poly([[6, 30], [10, 46], [16, 47], [14, 30]], hair, 'cyl'); S.poly([[42, 30], [38, 46], [32, 47], [34, 30]], hair, 'cyl');
      S.poly([[10, 47], [14, 40], [34, 40], [38, 47]], dress, 'grad', { bevel: true });   // Kleid
      S.rect(20, 40, 8, 2, '#ffffff'); S.px(24, 43, '#e0115f');
      S.box(21, 34, 6, 6, SKIN, 'cyl');                                        // Hals
      S.ell(24, 25, 11, 12, SKIN, 'sphere');                                   // Gesicht
      S.poly([[12, 22], [16, 14], [24, 12], [32, 14], [36, 22], [33, 19], [24, 17], [15, 19]], hair, 'grad');   // Pony
      for (const ex of [19, 28]) { S.rect(ex, 25, 3, 3, '#2a4a8a'); S.px(ex, 25, '#ffffff'); S.rect(ex - 1, 24, 5, 1, '#5a3a20'); }
      S.rect(17, 29, 3, 1, '#f0a0a0'); S.rect(29, 29, 3, 1, '#f0a0a0');
      S.line(22, 31, 26, 31, '#c8406a'); S.px(21, 30, '#c8406a'); S.px(27, 30, '#c8406a');
      S.poly([[16, 13], [16, 6], [19, 9], [24, 3], [29, 9], [32, 6], [32, 13]], GOLD, 'grad', { bevel: true });   // Krone
      S.px(24, 8, '#e0115f'); S.px(19, 11, '#2f6fe0'); S.px(29, 11, '#1fa463');
    },
    fernand: S => {
      const coat = ramp('#22202c');
      S.poly([[6, 47], [10, 38], [38, 38], [42, 47]], coat, 'grad', { bevel: true });   // Frack
      S.poly([[19, 38], [29, 38], [27, 47], [21, 47]], ramp('#f4efe4'), 'grad');           // Hemd
      S.poly([[19, 39], [24, 41], [19, 43]], dark(INK), 'flat'); S.poly([[29, 39], [24, 41], [29, 43]], dark(INK), 'flat');
      S.box(20, 32, 8, 7, SKIN, 'cyl');
      S.ell(24, 22, 11, 13, SKIN, 'sphere');                                   // Kopf (Glatze)
      S.ell(13, 23, 3, 5, ramp('#b8b2a6'), 'sphere'); S.ell(35, 23, 3, 5, ramp('#b8b2a6'), 'sphere');   // graue Schläfen
      S.px(18, 13, '#fff6e8'); S.px(19, 12, '#fff6e8');                        // Glanz auf der Glatze
      for (const ex of [19, 28]) { S.rect(ex, 21, 3, 2, INK); S.rect(ex - 1, 19, 5, 1, '#8a857a'); }
      S.line(24, 22, 24, 27, '#d89a7a');
      S.poly([[17, 30], [24, 28], [31, 30], [28, 32], [24, 30], [20, 32]], ramp('#b8b2a6'), 'grad');   // Schnurrbart
      S.line(21, 33, 27, 33, '#b07060');
    },
    baron: S => {
      const fur = ramp('#5a4656'), pink = ramp('#e07a98');
      S.poly([[4, 47], [10, 38], [38, 38], [44, 47]], ramp('#1a1420'), 'grad', { bevel: true });
      S.poly([[20, 38], [28, 38], [27, 47], [21, 47]], ramp('#f4efe4'), 'grad');
      S.poly([[17, 38], [24, 41], [17, 44]], ramp('#c8202a'), 'flat', { level: 2 }); S.poly([[31, 38], [24, 41], [31, 44]], ramp('#c8202a'), 'flat', { level: 2 });
      S.ell(24, 26, 15, 13, fur, 'sphere');
      S.ell(31, 30, 7, 5, pink, 'sphere');                                     // Sternnase
      for (let k = 0; k < 7; k++) { const a = -1.3 + k * 0.43; S.ell(35 + Math.cos(a) * 4, 30 + Math.sin(a) * 4.5, 1.6, 1.6, pink, 'sphere', { min: 2 }); }
      S.rect(17, 23, 2, 2, INK);
      S.ring(27, 23, 4, 4, 1.2, GOLD, 'flat', { level: 3 }); S.rect(26, 22, 2, 2, '#ff3a2a');
      S.path([[27, 27], [26, 33], [22, 37]], GOLD[2]);
      S.ell(24, 14, 13, 2.5, ramp('#2a2632'), 'sphere');                       // Zylinder
      S.box(15, 1, 18, 13, ramp('#2a2632'), 'cyl'); S.box(15, 9, 18, 3, ramp('#9a1a2a'), 'hcyl');
    },
    narrator: S => {
      const paper = ramp('#efe4c8');
      S.poly([[4, 14], [24, 18], [44, 14], [44, 40], [24, 44], [4, 40]], paper, 'grad', { bevel: true });   // offenes Buch
      S.line(24, 18, 24, 44, '#a8987a');
      for (let y = 22; y < 38; y += 4) { S.line(8, y, 20, y + 1, '#8a7a5a'); S.line(28, y + 1, 40, y, '#8a7a5a'); }
      S.poly([[30, 4], [34, 2], [27, 26], [25, 27]], IVORY, 'grad');           // Feder
      S.line(26, 27, 24, 31, INK);
      S.box(4, 4, 6, 8, IVORY, 'cyl'); S.ell(7, 2.5, 1.6, 2.5, ['#c8301a', '#ff7a1a', '#ffc34a', '#fff6d0', '#ffffff'], 'grad');   // Kerze
    },
  };
  const portrait = id => memo(`portrait48|${id}`, () => { const S = pen(48, 48); (DRAW[id] || DRAW.narrator)(S); return S.done(); });
  const portraitURL = id => memo(`portraitURL|${id}`, () => { const c = portrait(id), [o, g] = PIXEL.mk(96, 96); g.drawImage(c, 0, 0, 96, 96); return o.toDataURL(); });
  Object.assign(PIXEL, { storyPortrait: portrait, storyPortraitURL: portraitURL });
})();
