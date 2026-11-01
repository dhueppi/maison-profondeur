// =====================================================================
//  SPRITES – Pixel-Art im 16-Bit-Stil (angelehnt an die Machart von
//  Super Metroid: wenige Farbtöne pro Objekt, violette Schatten,
//  Dithering, dunkle Höhlen mit leuchtenden Akzenten).
//  Alles wird per Code gezeichnet – keine Bilddateien, keine Emojis.
//
//  Auflösung: nativ 32×32 Pixel pro Tile (1 Pixel = 1 Welt-Pixel).
//  Nichts wird hochskaliert: Jede Form wird direkt in voller Auflösung
//  gerastert (Polygone, Ellipsen, Linien), pro Pixel beleuchtet
//  (Licht von oben links), gedithert und mit Tinte konturiert.
// =====================================================================
const PIXEL = (() => {
  'use strict';
  const PX = 1;   // Welt-Pixel pro Sprite-Pixel (nativ)
  const U = 2;    // Raster für einfache Effekte im Spiel (Seil, Stacheln …)
  const D = GAME_DATA;
  const cache = new Map();
  const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w); c.height = Math.max(1, h);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return [c, g];
  }
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  // ---------- Farben ----------
  const h2r = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const r2h = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = h2r(a), B = h2r(b); return r2h(A.map((v, i) => v + (B[i] - v) * t)); };
  // SNES-typisch: Schatten kippen ins Violette, Lichter ins Warme
  const shade = (hex, f) => f < 0 ? mix(hex, '#120a24', -f) : mix(hex, '#fff6d8', f);
  const ramp = hex => [shade(hex, -0.66), shade(hex, -0.34), hex, shade(hex, 0.3), shade(hex, 0.62)];
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return r2h([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  const INK = '#140c1c';
  const GOLD = ['#5e3f0c', '#a8761c', '#e0a828', '#ffd34a', '#fff0a0'];
  const SILVER = ['#343846', '#646c7c', '#a4acba', '#d8dde6', '#ffffff'];
  const IVORY = ['#6e5e40', '#a8987a', '#d9cfb4', '#f2ead6', '#fffaf0'];
  const FIRE = ['#7a1410', '#c8301a', '#ff7a1a', '#ffc34a', '#fff6d0'];

  // ---------- Dithering & Zufall ----------
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y, v) => v * 16 > B4[(y & 3) * 4 + (x & 3)] + 0.5;
  function rng(seed) {
    let a = seed | 0;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const LIGHT = (() => { const v = [-0.55, -0.65, 0.52]; const n = Math.hypot(...v); return v.map(x => x / n); })();

  // ===================================================================
  //  PIXEL-STIFT: rastert Formen direkt in voller Auflösung
  //  Schattierungen (pal = 5er-Farbrampe dunkel→hell):
  //   flat · grad (Verlauf von oben links) · sphere (Kugel/Ellipse)
  //   cyl (stehender Zylinder) · hcyl (liegender Zylinder)
  //  Optionen: bevel (Lichtkante oben/links, Schatten unten/rechts),
  //            edge (Innenkontur in Farbe edgeCol), dither:false
  // ===================================================================
  function pen(w, h) {
    const [c, g] = mk(w, h);
    const S = { c, g, w, h };
    const put = (x, y, col) => { if (x >= 0 && y >= 0 && x < w && y < h) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } };
    S.px = put;
    S.rect = (x, y, ww, hh, col) => R(g, x, y, ww, hh, col);
    S.clear = (x, y, ww, hh) => g.clearRect(x, y, ww, hh);
    S.shape = (inside, bb, pal, mode = 'grad', o = {}) => {
      const x0 = Math.max(0, Math.floor(bb[0])), y0 = Math.max(0, Math.floor(bb[1]));
      const x1 = Math.min(w - 1, Math.ceil(bb[2])), y1 = Math.min(h - 1, Math.ceil(bb[3]));
      const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
      const gx = o.gx ?? 0.9, gy = o.gy ?? 1.7, lo = o.lo ?? 0.6, hi = o.hi ?? 3.7;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!inside(x + 0.5, y + 0.5)) continue;
        let f;
        if (mode === 'flat') f = o.level ?? 2;
        else if (mode === 'grad') { const u = (x - x0) / bw, v = (y - y0) / bh; f = hi - (u * gx + v * gy) * (hi - lo) / (gx + gy); }
        else if (mode === 'vgrad') { const v = (y - y0) / bh; f = hi - v * (hi - lo); }
        else if (mode === 'sphere') {
          const nx = (x + 0.5 - o.cx) / o.rx, ny = (y + 0.5 - o.cy) / o.ry, d2 = Math.min(1, nx * nx + ny * ny);
          const nz = Math.sqrt(1 - d2), l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
          f = (l * 0.5 + 0.5) * 4.8 - 0.55;
        } else if (mode === 'cyl') {
          const nx = Math.max(-1, Math.min(1, ((x + 0.5 - x0) / (bw + 1)) * 2 - 1)), nz = Math.sqrt(1 - nx * nx);
          f = ((nx * -0.62 + nz * 0.78) * 0.5 + 0.5) * 4.6 - 0.3;
        } else { // hcyl
          const ny = Math.max(-1, Math.min(1, ((y + 0.5 - y0) / (bh + 1)) * 2 - 1)), nz = Math.sqrt(1 - ny * ny);
          f = ((ny * -0.7 + nz * 0.7) * 0.5 + 0.5) * 4.6 - 0.3;
        }
        f = Math.max(0, Math.min(4, f));
        let i = Math.floor(f);
        if (o.dither !== false && i < 4 && dith(x, y, f - i)) i++;
        i = Math.max(o.min ?? 0, Math.min(o.max ?? 4, i));
        if (o.edge || o.bevel) {
          const top = !inside(x + 0.5, y - 0.5), left = !inside(x - 0.5, y + 0.5);
          const bot = !inside(x + 0.5, y + 1.5), right = !inside(x + 1.5, y + 0.5);
          if (o.edge && (top || left || bot || right)) { put(x, y, o.edgeCol || pal[0]); continue; }
          if (o.bevel) { if (top || left) i = Math.min(4, i + 1); if (bot || right) i = Math.max(0, i - 1); }
        }
        put(x, y, pal[i]);
      }
    };
    const inE = (cx, cy, rx, ry) => (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
    S.inE = inE;
    S.ell = (cx, cy, rx, ry, pal, mode = 'sphere', o = {}) =>
      S.shape(inE(cx, cy, rx, ry), [cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1], pal, mode, { cx, cy, rx, ry, ...o });
    S.ring = (cx, cy, rx, ry, t, pal, mode = 'sphere', o = {}) => {
      const a = inE(cx, cy, rx, ry), b = inE(cx, cy, rx - t, ry - t), yMax = o.yMax ?? 1e9;
      S.shape((px, py) => a(px, py) && !b(px, py) && py <= yMax, [cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1], pal, mode, { cx, cy, rx, ry, ...o });
    };
    S.pip = pts => (px, py) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };
    S.poly = (pts, pal, mode = 'grad', o = {}) => {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      S.shape(S.pip(pts), [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1], pal, mode, o);
    };
    S.box = (x, y, ww, hh, pal, mode = 'grad', o = {}) =>
      S.shape((px, py) => px >= x && px < x + ww && py >= y && py < y + hh, [x, y, x + ww - 1, y + hh - 1], pal, mode, o);
    S.line = (x0, y0, x1, y1, col, wd = 1) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        if (wd === 1) put(x0, y0, col); else R(g, x0 - (wd >> 1), y0 - (wd >> 1), wd, wd, col);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    S.path = (pts, col, wd = 1) => { for (let i = 1; i < pts.length; i++) S.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, wd); };
    // äussere Tintenkontur um alles Gezeichnete
    S.done = (col = INK) => {
      const d = g.getImageData(0, 0, w, h), a = d.data, src = new Uint8ClampedArray(a);
      const [r, gg, b] = h2r(col);
      const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 100;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] > 100) continue;
        if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) { a[i] = r; a[i + 1] = gg; a[i + 2] = b; a[i + 3] = 255; }
      }
      g.putImageData(d, 0, 0);
      return c;
    };
    return S;
  }

  // ---------- Schattierte Kugel (Würmer, Rauch, Kuppeln) ----------
  function disc(r, pal, rim = true) {
    r = Math.max(1, Math.round(r));
    return memo(`disc|${r}|${pal.join()}|${rim}`, () => {
      const size = r * 2 + 1, [c, g] = mk(size, size), cc = size / 2;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - cc) / (r + 0.5), dy = (y + 0.5 - cc) / (r + 0.5), d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const l = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2];
        const f = Math.max(0, Math.min(3.999, (l * 0.5 + 0.5) * 4.4 - 0.5));
        let i = Math.floor(f); if (dith(x, y, f - i)) i++;
        if (rim && d2 > (1 - (r > 9 ? 2.2 : 1.4) / (r + 0.5)) ** 2) i = 0;
        R(g, x, y, 1, 1, pal[Math.min(4, i)]);
      }
      return c;
    });
  }

  // ===================================================================
  //  PIXEL-SCHRIFTEN (nativ, 1 Pixel = 1 Welt-Pixel)
  //  klein 5×7 mit 1-px-Strichen (Schilder) · gross 7×9 mit 2-px-Stämmen
  // ===================================================================
  const G = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'], J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'], N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'], X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], 3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'], '.': ['.', '.', '.', '.', '.', '.', '#'],
    ',': ['.', '.', '.', '.', '.', '#', '#'], ':': ['.', '.', '#', '.', '.', '#', '.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'], '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
    "'": ['#', '#', '.', '.', '.', '.', '.'], '-': ['...', '...', '...', '###', '...', '...', '...'],
    '–': ['....', '....', '....', '####', '....', '....', '....'], '−': ['....', '....', '....', '####', '....', '....', '....'], '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '·': ['.', '.', '.', '#', '.', '.', '.'], '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'], ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '%': ['##...', '##..#', '...#.', '..#..', '.#...', '#..##', '...##'], '×': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
    '♥': ['.#.#.', '#####', '#####', '#####', '.###.', '..#..', '.....'], '«': ['.....', '..#.#', '.#.#.', '#.#..', '.#.#.', '..#.#', '.....'],
    '»': ['.....', '#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..', '.....'], '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
    '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  };
  const GB = {
    A: ['.#####.', '##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##'],
    B: ['######.', '##...##', '##...##', '##...##', '######.', '##...##', '##...##', '##...##', '######.'],
    C: ['.#####.', '##...##', '##.....', '##.....', '##.....', '##.....', '##.....', '##...##', '.#####.'],
    D: ['#####..', '##..##.', '##...##', '##...##', '##...##', '##...##', '##...##', '##..##.', '#####..'],
    E: ['#######', '##.....', '##.....', '##.....', '######.', '##.....', '##.....', '##.....', '#######'],
    F: ['#######', '##.....', '##.....', '##.....', '######.', '##.....', '##.....', '##.....', '##.....'],
    G: ['.#####.', '##...##', '##.....', '##.....', '##.####', '##...##', '##...##', '##...##', '.######'],
    H: ['##...##', '##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##'],
    I: ['####', '.##.', '.##.', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
    J: ['....##', '....##', '....##', '....##', '....##', '....##', '##..##', '##..##', '.####.'],
    K: ['##...##', '##..##.', '##.##..', '####...', '###....', '####...', '##.##..', '##..##.', '##...##'],
    L: ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######'],
    M: ['##....##', '###..###', '########', '##.##.##', '##....##', '##....##', '##....##', '##....##', '##....##'],
    N: ['##...##', '###..##', '####.##', '##.####', '##..###', '##...##', '##...##', '##...##', '##...##'],
    O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
    P: ['######.', '##...##', '##...##', '##...##', '######.', '##.....', '##.....', '##.....', '##.....'],
    Q: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##.####', '##..##.', '.####.#'],
    R: ['######.', '##...##', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##', '##...##'],
    S: ['.######', '##.....', '##.....', '##.....', '.#####.', '.....##', '.....##', '.....##', '######.'],
    T: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
    U: ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
    V: ['##...##', '##...##', '##...##', '##...##', '##...##', '.##.##.', '.##.##.', '..###..', '...#...'],
    W: ['##....##', '##....##', '##....##', '##....##', '##.##.##', '##.##.##', '########', '###..###', '##....##'],
    X: ['##...##', '##...##', '.##.##.', '..###..', '...#...', '..###..', '.##.##.', '##...##', '##...##'],
    Y: ['##..##', '##..##', '##..##', '.####.', '..##..', '..##..', '..##..', '..##..', '..##..'],
    Z: ['#######', '.....##', '....##.', '...##..', '..##...', '.##....', '##.....', '##.....', '#######'],
    0: ['.####.', '##..##', '##..##', '##.###', '######', '###.##', '##..##', '##..##', '.####.'],
    1: ['..##.', '.###.', '####.', '..##.', '..##.', '..##.', '..##.', '..##.', '#####'],
    2: ['.####.', '##..##', '....##', '....##', '...##.', '..##..', '.##...', '##....', '######'],
    3: ['#####.', '....##', '....##', '....##', '.####.', '....##', '....##', '....##', '#####.'],
    4: ['...##.', '..###.', '.####.', '##.##.', '##.##.', '######', '...##.', '...##.', '...##.'],
    5: ['######', '##....', '##....', '#####.', '....##', '....##', '....##', '##..##', '.####.'],
    6: ['.####.', '##....', '##....', '#####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
    7: ['######', '....##', '....##', '...##.', '..##..', '..##..', '.##...', '.##...', '.##...'],
    8: ['.####.', '##..##', '##..##', '##..##', '.####.', '##..##', '##..##', '##..##', '.####.'],
    9: ['.####.', '##..##', '##..##', '##..##', '.#####', '....##', '....##', '....##', '.####.'],
    ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...'],
    '.': ['..', '..', '..', '..', '..', '..', '..', '##', '##'], ',': ['..', '..', '..', '..', '..', '..', '##', '##', '#.'],
    ':': ['..', '..', '##', '##', '..', '..', '##', '##', '..'], '!': ['##', '##', '##', '##', '##', '##', '..', '##', '##'],
    '?': ['.####.', '##..##', '....##', '...##.', '..##..', '..##..', '......', '..##..', '..##..'],
    "'": ['##', '##', '#.', '..', '..', '..', '..', '..', '..'], '"': ['##.##', '##.##', '#..#.', '.....', '.....', '.....', '.....', '.....', '.....'],
    '-': ['....', '....', '....', '....', '####', '####', '....', '....', '....'],
    '–': ['......', '......', '......', '......', '######', '######', '......', '......', '......'],
    '−': ['......', '......', '......', '......', '######', '######', '......', '......', '......'],
    '+': ['......', '......', '..##..', '..##..', '######', '######', '..##..', '..##..', '......'],
    '·': ['..', '..', '..', '..', '##', '##', '..', '..', '..'],
    '/': ['....##', '....##', '...##.', '...##.', '..##..', '.##...', '.##...', '##....', '##....'],
    '(': ['.##', '##.', '##.', '##.', '##.', '##.', '##.', '##.', '.##'], ')': ['##.', '.##', '.##', '.##', '.##', '.##', '.##', '.##', '##.'],
    '%': ['##....#', '##...##', '....##.', '...##..', '..##...', '.##....', '##...##', '#....##', '.......'],
    '×': ['......', '......', '##..##', '.####.', '..##..', '.####.', '##..##', '......', '......'],
    '♥': ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...', '.......', '.......'],
    '«': ['.......', '.......', '..##.##', '.##.##.', '##.##..', '.##.##.', '..##.##', '.......', '.......'],
    '»': ['.......', '.......', '##.##..', '.##.##.', '..##.##', '.##.##.', '##.##..', '.......', '.......'],
    '&': ['.###...', '##.##..', '##.##..', '.###...', '.###.##', '##.####', '##..##.', '##.####', '.###.##'],
  };
  const ACCENT = { 'É': ['E', 'acute'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ä': ['A', 'uml'], 'Ö': ['O', 'uml'], 'Ü': ['U', 'uml'], 'Ç': ['C', 'ced'], 'Ô': ['O', 'circ'], 'Î': ['I', 'circ'], 'Û': ['U', 'circ'] };
  // Akzente: Pixel relativ zur Glyphenmitte (y relativ zur Oberkante der Glyphe)
  const ACC = {
    small: { acute: [[1, -3], [0, -2]], grave: [[-1, -3], [0, -2]], circ: [[-1, -2], [0, -3], [1, -2]], uml: [[-2, -2], [1, -2]], ced: [[0, 7]] },
    big: { acute: [[1, -3], [2, -3], [0, -2], [1, -2]], grave: [[-2, -3], [-1, -3], [-1, -2], [0, -2]], circ: [[-2, -2], [-1, -3], [0, -3], [1, -2]], uml: [[-3, -3], [-2, -3], [-3, -2], [-2, -2], [1, -3], [2, -3], [1, -2], [2, -2]], ced: [[0, 9], [-1, 10]] },
  };
  function normText(s) { return String(s).toUpperCase().replace(/ß/g, 'SS').replace(/Œ/g, 'OE').replace(/Æ/g, 'AE').replace(/…/g, '...'); }
  function textWidth(s, small = false) { const F = small ? G : GB; let w = 0; for (const ch of normText(s)) { const base = ACCENT[ch] ? ACCENT[ch][0] : ch; w += ((F[base] || F['?'])[0].length) + 1; } return Math.max(0, w - 1); }
  // Text als Sprite mit Tintenkontur + Schlagschatten
  function text(s, color = '#ffffff', outline = INK, small = false) {
    const str = normText(s), F = small ? G : GB, gh = small ? 7 : 9, A = small ? ACC.small : ACC.big;
    return memo(`txt|${small}|${str}|${color}|${outline}`, () => {
      const top = 4, w = textWidth(str, small) + 4, h = gh + top + (small ? 3 : 4);
      const [c, g] = mk(w, h);
      const hl = shade(color, 0.45), lo = shade(color, -0.25);
      const plot = (ox, oy, col, grad) => {
        let x = 1 + ox;
        for (const ch of str) {
          const [baseCh, acc] = ACCENT[ch] || [ch, null];
          const gl = F[baseCh] || F['?'];
          for (let y = 0; y < gh; y++) for (let i = 0; i < gl[y].length; i++) if (gl[y][i] === '#')
            R(g, x + i, top + y + oy, 1, 1, grad ? (y < 2 ? hl : y >= gh - 2 ? lo : col) : col);
          const mid = x + Math.floor(gl[0].length / 2);
          if (acc) for (const [ax, ay] of A[acc]) R(g, mid + ax, top + ay + oy, 1, 1, col);
          x += gl[0].length + 1;
        }
      };
      if (outline) { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]]) plot(dx, dy, outline, false); }
      plot(0, 0, color, !small);
      return c;
    });
  }

  // ---------- Area-Paletten ----------
  function areaPal(ai) {
    return memo(`apal|${ai}`, () => {
      const lk = D.areas[ai].look;
      const dirtHex = hsl2hex(lk.dirt[0], lk.dirt[1], lk.dirt[2] + 4);
      return { dirt: ramp(dirtHex), rock: ramp(lk.rock), vein: ramp(lk.vein), bg: ramp(lk.bg), accent: lk.accent, accentRamp: ramp(lk.accent) };
    });
  }

  // Zellen-Textur 32×32: brockige Erde mit Fugen, Licht von oben links
  function cellTex(S, pal, n, rnd, o = {}) {
    const W = S.w, pts = Array.from({ length: n }, () => [rnd() * W, rnd() * W]);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      let d1 = 1e9, d2 = 1e9, cx = 0, cy = 0;
      for (const [px, py] of pts) for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) {
        const d = Math.hypot(x + 0.5 - px - ox, y + 0.5 - py - oy);
        if (d < d1) { d2 = d1; d1 = d; cx = px + ox; cy = py + oy; } else if (d < d2) d2 = d;
      }
      const edge = d2 - d1;
      let col;
      const soft = o.soft ?? 1;                              // < 1 = ruhigere, flachere Struktur
      if (edge < 0.7 * soft) col = edge < 0.25 * soft ? pal[0] : pal[1];
      else {
        const v = ((cx - (x + 0.5)) + (cy - (y + 0.5))) / (o.cell || 9);
        let f = 2.05 + v * 1.25 * soft + (o.bias || 0);
        if (edge < 1.7) f -= 0.55 * soft;                   // Schattenkante an der Fuge
        f = Math.max(1, Math.min(3.99, f));
        let i = Math.floor(f); if (dith(x, y, f - i)) i++;
        col = pal[Math.min(o.max ?? 4, i)];
      }
      S.px(x, y, col);
    }
  }
  function pebbles(S, pal, rnd, n) {
    for (let k = 0; k < n; k++) {
      const x = 4 + rnd() * 24, y = 4 + rnd() * 24, r = 1.2 + rnd() * 1.6;
      S.ell(x + 0.6, y + 0.8, r + 0.4, r * 0.8, [pal[0], pal[0], pal[0], pal[0], pal[0]], 'flat');      // Schlagschatten
      S.ell(x, y, r + 0.4, r * 0.8, pal, 'sphere', { min: 1 });
    }
  }
  function grains(S, pal, rnd, n) {
    for (let k = 0; k < n; k++) S.px(Math.floor(rnd() * 32), Math.floor(rnd() * 32), rnd() < 0.5 ? pal[4] : pal[0]);
  }

  // ---------- Nahtlose Erd-Varianten (Kantenabgleich + Wang-Kanten) ----------
  // Technik: Jede Kachel besteht aus Zellen (Brocken) um Stützpunkte.
  //  · Ecken: ein fester Punkt in jeder Ecke – bei allen Kacheln gleich.
  //  · Kanten: jede Kante hat einen Code (0–2, „Wang-Kante“). Zu jedem Code gehört
  //    eine feste Punktgruppe, die auf der Kantenlinie liegt. Zwei Nachbarn teilen
  //    sich diese Kante und damit genau dieselben Punkte → die Fugen laufen nahtlos durch.
  //  · Inneres: 5 Varianten mit eigenen Punkten und Details. Ihre Punkte bekommen zum
  //    Rand hin einen Abstandsaufschlag, damit sie die gemeinsame Kante nie verändern.
  // Variante 0 ist die ruhigste (kommt am häufigsten vor), 4 die detailreichste.
  const DIRT_WEIGHTS = [0.38, 0.26, 0.18, 0.11, 0.07];
  const EDGE_CODES = 3;
  function dirtVariant(h) { let a = 0; for (let i = 0; i < DIRT_WEIGHTS.length; i++) { a += DIRT_WEIGHTS[i]; if (h < a) return i; } return DIRT_WEIGHTS.length - 1; }
  function dirtPal(ai) {
    return memo(`dirtpal|${ai}`, () => { const dk = areaPal(ai).dirt.map(c => shade(c, -0.2)); return [dk[0], dk[1], dk[2], mix(dk[2], dk[3], 0.55), dk[3]]; });
  }
  // Punktgruppe einer Kante: u = Lage entlang der Kante (7..25), w = Abstand quer zur Kantenlinie (−3..3)
  const edgePts = (orient, code) => memo(`edgepts|${orient}|${code}`, () => {
    const r = rng(orient === 'h' ? 9001 + code * 37 : 4007 + code * 53);
    return [0, 1, 2].map(k => [7 + k * 6.5 + r() * 4, (r() - 0.5) * 6]);
  });
  function dirtBase(ai, v, edges = '0000') {
    return memo(`dirt|${ai}|${v}|${edges}`, () => {
      const pal = dirtPal(ai), S = pen(32, 32), W = 32, M = 7, soft = 0.6;
      const [n, e, sCode, w] = edges.split('').map(Number), B = [[0, 0], [32, 0], [0, 32], [32, 32]];
      for (const [u, q] of edgePts('h', n)) B.push([u, q]);            // Oberkante (y = 0)
      for (const [u, q] of edgePts('h', sCode)) B.push([u, 32 + q]);   // Unterkante (y = 32)
      for (const [u, q] of edgePts('v', w)) B.push([q, u]);            // linke Kante (x = 0)
      for (const [u, q] of edgePts('v', e)) B.push([32 + q, u]);       // rechte Kante (x = 32)
      const rv = rng(ai * 104729 + v * 7777 + 11), I = [];
      for (let k = 0; k < [1, 2, 2, 3, 3][v]; k++) I.push([10 + rv() * 12, 10 + rv() * 12]);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const de = Math.min(x + 0.5, y + 0.5, W - x - 0.5, W - y - 0.5), pen_ = Math.max(0, M - de) * 3;
        let d1 = 1e9, d2 = 1e9, cx = 0, cy = 0;
        const test = (px, py, extra) => { const d = Math.hypot(x + 0.5 - px, y + 0.5 - py) + extra; if (d < d1) { d2 = d1; d1 = d; cx = px; cy = py; } else if (d < d2) d2 = d; };
        for (const [px, py] of B) test(px, py, 0);
        for (const [px, py] of I) test(px, py, pen_);
        const edge = d2 - d1;
        let col;
        if (edge < 0.7 * soft) col = edge < 0.25 * soft ? pal[0] : pal[1];
        else {
          let f = 2.05 + ((cx - (x + 0.5)) + (cy - (y + 0.5))) / 12 * 1.25 * soft - 0.15;
          if (edge < 1.7) f -= 0.55 * soft;
          f = Math.max(1, Math.min(3.99, f));
          let i = Math.floor(f); if (dith(x, y, f - i)) i++;
          col = pal[Math.min(3, i)];
        }
        S.px(x, y, col);
      }
      // Details nur im Inneren (Rand bleibt bei allen Varianten identisch)
      const inner = () => 8 + rv() * 16;
      const grainsIn = n => { for (let k = 0; k < n; k++) S.px(Math.floor(inner()), Math.floor(inner()), rv() < 0.5 ? pal[3] : pal[1]); };
      const pebble = r => { const x = inner(), y = inner(); S.ell(x + 0.6, y + 0.8, r + 0.4, r * 0.8, [pal[0], pal[0], pal[0], pal[0], pal[0]], 'flat'); S.ell(x, y, r + 0.4, r * 0.8, pal, 'sphere', { min: 1 }); };
      const root = len => { let x = inner(), y = inner(); for (let k = 0; k < len; k++) { S.px(Math.floor(x), Math.floor(y), pal[0]); if (k % 3 === 0) S.px(Math.floor(x), Math.floor(y) - 1, pal[3]); x += rv() < 0.6 ? 1 : 0; y += rv() < 0.5 ? 1 : -1; x = Math.min(25, x); y = Math.max(7, Math.min(25, y)); } };
      if (v === 0) grainsIn(4);
      if (v === 1) { grainsIn(9); pebble(1.2); }
      if (v === 2) { grainsIn(8); pebble(1.6); pebble(1.1); root(6); }
      if (v === 3) { grainsIn(8); pebble(3); pebble(1.3); root(10); }
      if (v === 4) { // kleines Fossil
        const fx = 16 + (rv() - 0.5) * 6, fy = 16 + (rv() - 0.5) * 6, bone = [pal[1], mix(pal[2], '#bfb39a', 0.2), mix(pal[3], '#d9cfb4', 0.25), mix(pal[3], '#efe6cf', 0.38), mix(pal[3], '#efe6cf', 0.5)];
        S.ell(fx, fy, 4, 4, bone, 'sphere');
        let prev = null;
        for (let th = 0; th < 3.6 * Math.PI; th += 0.3) { const r = 4 * Math.exp(-th * 0.22), p = [fx + Math.cos(th) * r, fy + Math.sin(th) * r]; if (prev) S.line(prev[0], prev[1], p[0], p[1], pal[1]); prev = p; }
        pebble(1.3); grainsIn(6);
      }
      return S.c;
    });
  }

  // ---------- Tiles 32×32 ----------
  // kind: dirt · rock · ore · bedrock · concrete · artifact (= Erde)
  function tile(kind, ai, variant, oreHex, edges = '0000', form = 'gem') {
    return memo(`tile|${kind}|${ai}|${variant}|${oreHex || ''}|${edges}|${form}`, () => {
      const S = pen(32, 32);
      const P = areaPal(ai);
      const rnd = rng(ai * 977 + variant * 131 + kind.length * 17 + (oreHex ? parseInt(oreHex.slice(1), 16) % 997 : 0));
      if (kind === 'dirt' || kind === 'artifact') S.g.drawImage(dirtBase(ai, Math.min(4, variant), edges), 0, 0);
      if (kind === 'ore' || kind === 'rock') S.g.drawImage(dirtBase(ai, 0, edges), 0, 0);   // ruhiger Grund, damit Erz/Fels lesbar bleiben
      if (kind === 'ore') {
        const o = ramp(oreHex);
        const spots = [[9, 10], [22, 9], [10, 22], [22, 22], [16, 16]].sort(() => rnd() - 0.5).slice(0, 2 + (rnd() < 0.45 ? 1 : 0));
        for (const [sx, sy] of spots) {
          if (form === 'nugget') { nugget(S, sx, sy + 1, 3.2 + rnd() * 1.2, o, rnd); continue; }
          const n = 2 + (rnd() < 0.5 ? 1 : 0);
          for (let k = 0; k < n; k++) shard(S, sx, sy + 2, -Math.PI / 2 + (k - (n - 1) / 2) * 0.62 + (rnd() - 0.5) * 0.3, 9 + rnd() * 4, 4.4 + rnd() * 1.6, o);
        }
      }
      if (kind === 'rock') {
        const cx = 15.5, cy = 15.5, ph = rnd() * 6;
        const inR = (px, py) => { const dx = px - cx, dy = py - cy, t = Math.atan2(dy, dx); return Math.hypot(dx, dy) <= 13 + Math.sin(3 * t + ph) * 1.1 + Math.sin(5 * t + ph * 2) * 0.6; };
        S.shape((px, py) => inR(px - 1.5, py - 2) && !inR(px, py), [0, 0, 31, 31], [P.dirt[0], P.dirt[0], P.dirt[0], P.dirt[0], P.dirt[0]], 'flat'); // Schatten
        S.shape(inR, [0, 0, 31, 31], P.rock, 'sphere', { cx, cy, rx: 14, ry: 14, edge: true, edgeCol: INK });
        // Risse
        for (let k = 0; k < 2; k++) {
          let x = 9 + rnd() * 14, y = 7 + rnd() * 5;
          for (let i = 0; i < 9; i++) { if (inR(x + 0.5, y + 0.5)) { S.px(Math.floor(x), Math.floor(y), P.rock[0]); S.px(Math.floor(x) + 1, Math.floor(y), P.rock[3]); } y += 1; x += rnd() < 0.5 ? 1 : (rnd() < 0.3 ? -1 : 0); }
        }
        // Ader in Area-Farbe
        let x = 6 + rnd() * 6, y = 25;
        while (y > 5) { if (inR(x + 0.5, y + 0.5) && Math.hypot(x - cx, y - cy) < 11.5) { S.px(Math.floor(x), Math.floor(y), P.vein[2]); if (rnd() < 0.35) S.px(Math.floor(x), Math.floor(y) - 1, P.vein[4]); } y -= 1; if (rnd() < 0.6) x += 1; }
        S.px(9, 8, P.rock[4]); S.px(10, 8, P.rock[4]); S.px(9, 9, P.rock[4]);
      }
      if (kind === 'bedrock') {
        const pal = ramp('#2a2638');
        S.rect(0, 0, 32, 32, pal[0]);
        for (const [x, y] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
          S.box(x + 1, y + 1, 14, 14, pal, 'grad', { bevel: true, hi: 2.6, lo: 0.8 });
          for (const [bx, by] of [[3, 3], [12, 3], [3, 12], [12, 12]]) { S.px(x + bx, y + by, pal[4]); S.px(x + bx + 1, y + by, pal[2]); S.px(x + bx, y + by + 1, pal[0]); S.px(x + bx + 1, y + by + 1, pal[0]); }
        }
        for (let k = 0; k < 3; k++) { const x = 3 + rnd() * 24, y = 3 + rnd() * 24; S.line(x, y, x + 3 + rnd() * 3, y + rnd() * 2, pal[0]); }
      }
      if (kind === 'concrete') { // Marmor mit Goldkante
        const pal = ramp('#e2dccd');
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          const n = Math.sin(x * 0.35 + Math.sin(y * 0.3 + variant) * 1.7) + Math.sin(y * 0.22 + x * 0.11 + variant * 2);
          const f = 3.1 + n * 0.35;
          S.px(x, y, pal[Math.floor(f) + (dith(x, y, f - Math.floor(f)) ? 1 : 0)]);
        }
        for (let k = 0; k < 2; k++) {
          let x = rnd() * 32, y = 5 + rnd() * 6;
          let t = 0; while (y < 32) { const xi = ((Math.floor(x) % 32) + 32) % 32; S.px(xi, Math.floor(y), pal[1]); if (dith(xi, Math.floor(y), 0.5)) S.px((xi + 1) % 32, Math.floor(y), pal[2]); t += 0.35; x += Math.cos(t * 1.7) * 1.1 + 0.5; y += 0.45 + rnd() * 0.3; }
        }
        S.rect(0, 0, 32, 1, '#fff0b0'); S.rect(0, 1, 32, 2, '#ffd34a'); S.rect(0, 3, 32, 1, '#d4a63a'); S.rect(0, 4, 32, 1, '#8a6414');
        for (let x = 2; x < 32; x += 8) S.px(x, 1, '#ffffff');
        S.rect(31, 5, 1, 27, pal[1]); S.rect(0, 5, 1, 27, pal[4]);
      }
      return S.c;
    });
  }

  // Funkelnder Erz-Kristall (Beute, die herumliegt)
  // Kristall-Splitter (Edelsteine) und Klumpen (Metalle) – direkt gerastert
  function shard(S, sx, sy, a, L, wd, o) {
    const dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx;
    const cx = sx + dx * L * 0.35, cy = sy + dy * L * 0.35;
    const pt = (u, v) => [cx + dx * u + qx * v, cy + dy * u + qy * v];
    S.poly([pt(L / 2, 0), pt(L * 0.15, wd / 2), pt(-L / 2, wd * 0.35), pt(-L / 2, -wd * 0.35), pt(L * 0.15, -wd / 2)], o, 'grad', { edge: true, edgeCol: INK, lo: 1, hi: 4 });
    const [fx0, fy0] = pt(-L * 0.3, wd * 0.12), [fx1, fy1] = pt(L * 0.35, 0);
    S.line(fx0, fy0, fx1, fy1, o[4]);
    const [gx, gy] = pt(L * 0.25, -wd * 0.12); S.px(Math.round(gx), Math.round(gy), '#ffffff');
  }
  function nugget(S, x, y, r, o, rnd = Math.random) {
    S.ell(x + r * 0.75, y - r * 0.3, r * 0.75, r * 0.65, o, 'sphere', { edge: true, edgeCol: INK, min: 1 });
    S.ell(x, y, r * 1.15, r * 0.85, o, 'sphere', { edge: true, edgeCol: INK, min: 1 });
    S.px(Math.round(x - r * 0.45), Math.round(y - r * 0.4), '#ffffff');
    for (let k = 0; k < 2; k++) S.px(Math.round(x + (rnd() - 0.3) * r), Math.round(y + (rnd() - 0.2) * r * 0.6), o[1]);
  }
  const heartIn = (cx, cy, rx, ry) => (px, py) => { const x = (px - cx) / rx, y = -(py - cy) / ry; return (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0; };
  function crystal(hex, form = 'gem') {
    return memo(`crys|${hex}|${form}`, () => {
      const o = ramp(hex), S = pen(16, 18);
      if (form === 'nugget') nugget(S, 7, 10, 4.6, o, rng(3));
      else if (form === 'pearl') { S.ell(8, 9, 6, 6, o, 'sphere'); S.px(5, 6, '#ffffff'); S.px(6, 5, '#ffffff'); }
      else if (form === 'drop') { S.poly([[8, 1], [12, 8], [8, 9], [4, 8]], o, 'grad'); S.ell(8, 11, 5, 5.5, o, 'sphere'); S.px(6, 8, '#ffffff'); }
      else if (form === 'heart') { S.shape(heartIn(8, 8, 6.5, 6.5), [0, 0, 16, 16], o, 'sphere', { cx: 8, cy: 8, rx: 7, ry: 7 }); S.line(5, 5, 6, 4, '#ffffff'); }
      else {
        S.poly([[8, 1], [13.5, 6], [11.5, 16.5], [4.5, 16.5], [2.5, 6]], o, 'grad', { bevel: true, lo: 0.8, hi: 4 });
        S.line(5, 6, 8, 2, o[4]); S.line(5, 7, 11, 7, o[3]); S.line(8, 7, 8, 15, o[1]);
        S.px(6, 4, '#ffffff'); S.px(5, 5, '#ffffff');
      }
      return S.done();
    });
  }
  // Schaustück für das Cabinet d'Histoire Naturelle (32×32, Stein auf Muttergestein)
  function specimen(S, ore) {
    const o = ramp(ore.color), form = ore.form || 'gem', r = rng(ore.id.length * 97 + ore.value);
    if (form === 'pearl' || form === 'drop' || form === 'heart') {
      S.ell(16, 25, 13, 5, ramp('#7a1a3a'), 'sphere');                    // Samtkissen
      S.px(5, 25, '#e0a040'); S.px(27, 25, '#e0a040');
      if (form === 'pearl') { S.ell(16, 16, 8.5, 8.5, o, 'sphere'); S.px(12, 12, '#ffffff'); S.px(13, 11, '#ffffff'); S.px(12, 13, '#ffffff'); }
      else if (form === 'drop') {
        S.poly([[16, 2], [22, 12], [16, 14], [10, 12]], o, 'grad');
        S.ell(16, 16, 7.5, 7.5, o, 'sphere');
        if (ore.id === 'ambre') { S.rect(15, 15, 3, 2, '#3a1a08'); S.px(14, 14, '#5a2a10'); S.px(18, 14, '#5a2a10'); S.px(16, 17, '#e8e0d0'); }
        S.px(13, 12, '#ffffff'); S.px(12, 13, '#ffffff');
      } else {
        S.shape(heartIn(16, 15, 10, 10), [3, 3, 29, 28], o, 'sphere', { cx: 16, cy: 15, rx: 11, ry: 11 });
        S.line(16, 9, 16, 24, o[1]); S.line(9, 12, 16, 24, o[3]); S.line(23, 12, 16, 24, o[1]); S.px(10, 9, '#ffffff'); S.px(11, 8, '#ffffff');
      }
      return;
    }
    const m = ramp('#6a5e52');
    S.shape((px, py) => S.inE(16, 25, 14, 6.5)(px, py) || S.inE(10, 23, 7, 6)(px, py), [1, 16, 31, 32], m, 'sphere', { cx: 14, cy: 23, rx: 15, ry: 8, edge: true, edgeCol: INK });
    for (let k = 0; k < 6; k++) S.px(Math.floor(5 + r() * 22), Math.floor(22 + r() * 6), r() < 0.5 ? m[3] : m[1]);
    if (form === 'nugget') { nugget(S, 14, 17, 7, o, r); nugget(S, 24, 22, 3.5, o, r); }
    else {
      shard(S, 15, 21, -Math.PI / 2 - 0.05, 18, 8, o);
      shard(S, 9, 23, -Math.PI / 2 - 0.55, 12, 6, o);
      shard(S, 22, 23, -Math.PI / 2 + 0.5, 13, 6.5, o);
      if (ore.id === 'opal') for (const [x, y, c] of [[14, 8, '#9fe8ff'], [16, 12, '#ffe08a'], [14, 15, '#7ad08a'], [9, 17, '#9fe8ff'], [22, 18, '#ffe08a']]) S.px(x, y, c);
    }
  }

  // ---------- Hintergründe pro Area (Parallax, 64×64, nahtlos) ----------
  function bgTile(ai) {
    return memo(`bg|${ai}`, () => {
      const base = ramp(shade(D.areas[ai].look.bg, 0.12));
      const S = pen(64, 64), rnd = rng(ai * 4049 + 7);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) S.px(x, y, dith(x, y, 0.3) ? base[0] : base[1]);
      const wrap = fn => { for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) fn(ox, oy); };
      if (ai === 0) { // Eisen: genietete Stahlplatten, rostiges Rohr
        const rust = ramp(mix(D.areas[0].look.vein, base[2], 0.5));
        for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]]) {
          S.box(x + 1, y + 1, 30, 30, base, 'grad', { bevel: true, lo: 1, hi: 2.8 });
          for (const [bx, by] of [[3, 3], [27, 3], [3, 27], [27, 27]]) { S.px(x + bx, y + by, base[4]); S.px(x + bx + 1, y + by + 1, base[0]); }
          S.line(x + 6, y + 15, x + 25, y + 15, base[0]); S.line(x + 6, y + 16, x + 25, y + 16, base[3]);
        }
        S.box(0, 40, 64, 8, rust, 'hcyl');
        for (const fx of [10, 42]) { S.box(fx, 38, 5, 12, rust, 'cyl', { bevel: true }); S.px(fx + 1, 39, rust[4]); }
        for (let k = 0; k < 5; k++) { const x = Math.floor(rnd() * 64), l = 2 + Math.floor(rnd() * 7); S.rect(x, 48, 1, l, rust[1]); S.px(x, 48 + l, rust[3]); }
      } else if (ai === 1) { // Kupfer: organische Blasen und Tropfen
        const bub = ramp(mix(D.areas[1].look.vein, base[2], 0.5));
        const pal = [base[0], bub[0], bub[1], bub[2], bub[3]];
        for (let k = 0; k < 8; k++) {
          const r = 2 + rnd() * 6, x = rnd() * 64, y = rnd() * 64;
          wrap((ox, oy) => S.ell(x + ox, y + oy, r, r, pal, 'sphere'));
          wrap((ox, oy) => { S.px(Math.round(x + ox - r * 0.4), Math.round(y + oy - r * 0.5), bub[4]); });
        }
        for (let k = 0; k < 6; k++) { const x = Math.floor(rnd() * 64), l = 4 + Math.floor(rnd() * 12); S.rect(x, 0, 1, l, bub[1]); S.rect(x, l, 1, 2, bub[2]); S.px(x, l + 2, bub[3]); }
      } else if (ai === 2) { // Silber: Kristallsäulen
        const cr = ramp(mix(D.areas[2].look.vein, base[2], 0.55));
        for (let k = 0; k < 6; k++) {
          const x = Math.floor(rnd() * 60), hh = 16 + Math.floor(rnd() * 36), w = 5 + Math.floor(rnd() * 4);
          wrap((ox, oy) => {
            if (oy) return;
            S.poly([[x + ox, 64], [x + ox, 64 - hh + w * 0.7], [x + ox + w / 2, 64 - hh], [x + ox + w, 64 - hh + w * 0.7], [x + ox + w, 64]], cr, 'cyl', { hi: 3.2 });
            S.line(x + ox + Math.floor(w / 2), 64 - hh + 1, x + ox + Math.floor(w / 2), 63, cr[0]);
          });
        }
        for (let k = 0; k < 10; k++) S.px(Math.floor(rnd() * 64), Math.floor(rnd() * 64), cr[4]);
      } else { // Gold: glühende Risse im schwarzen Fels
        const gl = ramp(D.areas[3].look.vein);
        for (let k = 0; k < 4; k++) {
          let x = rnd() * 64, y = 0;
          while (y < 64) {
            const xi = ((Math.floor(x) % 64) + 64) % 64;
            S.px(xi, y, gl[3]);
            if (dith(xi + 1, y, 0.6)) S.px((xi + 1) % 64, y, gl[1]);
            if (dith(xi + 63, y, 0.4)) S.px((xi + 63) % 64, y, gl[1]);
            if (rnd() < 0.08) S.px(xi, y, gl[4]);
            y++; x += Math.floor(rnd() * 3) - 1;
          }
        }
        for (let k = 0; k < 12; k++) S.px(Math.floor(rnd() * 64), Math.floor(rnd() * 64), gl[4]);
      }
      return S.c;
    });
  }

  // ---------- Himmel & Skyline ----------
  function skyStrip(h) {
    return memo(`sky|${h}`, () => {
      const stops = [[0, '#06040e'], [0.45, '#171030'], [0.72, '#3a2450'], [0.88, '#7a4a5a'], [1, '#c48a4e']];
      const [c, g] = mk(8, h);
      for (let y = 0; y < h; y++) {
        const t = y / (h - 1);
        let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
        const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
        const f = (t - t0) / (t1 - t0), q = f * 6, qi = Math.floor(q);
        for (let x = 0; x < 8; x++) R(g, x, y, 1, 1, mix(c0, c1, Math.min(6, qi + (dith(x, y, q - qi) ? 1 : 0)) / 6));
      }
      return c;
    });
  }
  function skyline() {
    return memo('skyline', () => {
      const W = 640, H = 112, S = pen(W, H), rnd = rng(99);
      const far = '#2e2044', mid = '#1f1630', near = '#170f24', rim = '#3e2c58';
      for (let x = 0; x < W; x++) { const y = 46 + Math.round(Math.sin(x / 61) * 9 + Math.sin(x / 23) * 4); S.rect(x, y, 1, H - y, far); }
      for (let x = 0; x < W; x++) { const y = 70 + Math.round(Math.sin(x / 37 + 1) * 6 + Math.sin(x / 13) * 2); S.rect(x, y, 1, H - y, mid); S.px(x, y, rim); }
      let x = 6;
      while (x < W - 60) {
        const kind = rnd(), w = 24 + Math.floor(rnd() * 34), h = 18 + Math.floor(rnd() * 30), base = 92, top = base - h;
        S.rect(x, top, w, h + 20, near); S.rect(x, top, w, 1, rim);
        if (kind < 0.3) { for (let k = 0; k < w; k += 5) { S.rect(x + k, top - 3, 3, 3, near); S.rect(x + k, top - 3, 3, 1, rim); } }           // Zinnen
        else if (kind < 0.55) { for (let k = 0; k < w / 2; k++) { S.rect(x + k, top - k * 0.6, w - k * 2, 1, near); S.px(x + k, Math.floor(top - k * 0.6), rim); } } // Giebel
        else if (kind < 0.8) { const r = Math.min(12, w / 2 - 2); S.ell(x + w / 2, top, r, r * 0.8, [near, near, near, near, near], 'flat'); S.rect(x + Math.floor(w / 2), top - r - 7, 1, 7, near); S.px(x + Math.floor(w / 2), top - r - 8, '#c48a4e'); } // Kuppel
        else { const tx = x + w - 10; S.rect(tx, top - 28, 9, 28, near); for (let k = 0; k < 6; k++) S.rect(tx + k * 0.7, top - 28 - k * 2, 9 - k * 1.4, 2, near); S.px(tx + 4, top - 41, '#ffd36e'); } // Turm
        for (let wy = top + 4; wy < base - 4; wy += 7) for (let wx = x + 3; wx < x + w - 4; wx += 5) {
          const r = rnd();
          if (r < 0.32) { S.rect(wx, wy, 2, 3, r < 0.12 ? '#ffd36e' : '#c48a4e'); S.px(wx, wy, '#fff2b0'); }
          else if (r < 0.5) S.rect(wx, wy, 2, 3, '#2a1f3c');
        }
        x += w + 4 + Math.floor(rnd() * 12);
        if (rnd() < 0.6) { const r = 5 + rnd() * 5; S.ell(x + r, 92 - r, r, r * 1.1, [near, near, near, near, near], 'flat'); S.rect(Math.floor(x + r), 92 - 2, 1, 4, near); x += r * 2 + 4; }
      }
      S.rect(0, 92, W, 20, near);
      return S.c;
    });
  }

  // ---------- Icons (werden in sprites_icons.js nativ gezeichnet) ----------
  const ICONS = {};
  const icon = id => ICONS[id] ? memo(`icon|${id}`, () => { const S = pen(ICONS[id].w || 32, ICONS[id].h || 32); ICONS[id].draw(S); return S.done(); }) : null;
  function iconURL(id, scale = 2) {
    return memo(`url|${id}|${scale}`, () => {
      const ic = icon(id); if (!ic) return '';
      const [c, g] = mk(ic.width * scale, ic.height * scale);
      g.drawImage(ic, 0, 0, c.width, c.height);
      return c.toDataURL();
    });
  }

  return { specimen, DIRT_WEIGHTS, EDGE_CODES, dirtVariant, dirtBase, PX, U, h2r, INK, GOLD, SILVER, IVORY, FIRE, LIGHT, R, mk, memo, mix, shade, ramp, hsl2hex, dith, rng, pen, disc, text, textWidth, tile, crystal, bgTile, skyStrip, skyline, ICONS, icon, iconURL, areaPal };
})();
