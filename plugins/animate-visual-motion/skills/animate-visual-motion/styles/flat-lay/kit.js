// =====================================================================
//  styles/flat-lay/kit.js — FLAT LAY: a top-down "knolling" product photograph come alive. The camera looks straight
//  down at a tabletop; every object is a TOP VIEW of a real thing with a thickness you can read from its shadow.
//  What makes it a photograph and not clip art:
//   - the table is a material (flSurface: linen weave, pale oak planks, terrazzo, matte paper, marble), brighter
//     toward the upper left where the window is;
//   - ONE soft daylight from the upper left: every object casts the same two-part shadow to the lower right
//     (flShadow: a tight dark contact shadow + a wider soft one whose reach is the object's height) and carries a
//     light edge on its upper-left side, whatever angle it lies at (flL reads the light in the object's own space);
//   - objects sit squared on an invisible grid with even gaps (flGrid), or one hero in the centre with props round it;
//   - annotations are a stylist's: a hand-lettered note with a thin curved arrow, a kraft tag, a caption card held
//     by washi tape, a numbered-dot ingredient list.
//  Motion on 1s, tidy: things slide in from the frame edges already turning and snap square with a small overshoot
//  (flItem's `at` / `from`), props drop in with a spin, arrows draw themselves, notes write on; the shadow always
//  travels with its object and is longest while the object is in the air.
//  Built on kit/core.js. Helpers are prefixed fl…; the palette is FL. Needs from the piece head: W, H, FPS (CX optional).
// =====================================================================
const FL = {
  paper: '#e9e4da',     // a neutral matte sheet: the ground a morph happens on (STYLE.paper)
  linen: '#d9cfbd',     // natural linen
  oak: '#d8ba8e',       // pale oak planks
  terrazzo: '#ebe6dc',  // terrazzo's cement
  marble: '#efedea',    // white marble
  blush: '#e8c6b6',     // matte coloured paper (also sageP, sky)
  sageP: '#c9d3c0', sky: '#c9d9e2',
  white: '#fbf8f1',     // ceramic, cards, labels
  cream: '#f1eadc',     // unbleached cloth, label paper
  kraft: '#c8a276',     // cartons, tags
  ink: '#3a3430',       // lettering, arrows
  soft: '#857a72',      // small print
  terra: '#c8623a',     // terracotta: RESERVED for the hero (the tin) and the caption's key word
  sage: '#8ea481', leaf: '#7f9c8c', mustard: '#dfa63a', navy: '#2e3d5a', rose: '#d6968a',
  coffee: '#4a2a1a', bean: '#5c3521', steel: '#bfc2c6', wood: '#b98b58', amber: '#b06a2e', citrus: '#f0a236', pith: '#f7e9c9',
};
const FL_SH = [0.62, 0.78];                                   // the way every shadow falls (away from the window)
const FL_SHD = '48,36,30';                                    // the shadow's colour (warm, never pure black)
const FL_SANS = '"Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", "Noto Sans", "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
const FL_SERIF = 'Georgia, "Times New Roman", "Liberation Serif", "DejaVu Serif", serif';
const FL_HAND = 'Noteworthy, "Bradley Hand", "Segoe Print", "Ink Free", "Comic Sans MS", "Comic Neue", cursive';

// ---------------------------------------------------------------------
//  colour (accepts '#rrggbb', 'rgb(r,g,b)' or [r, g, b])
// ---------------------------------------------------------------------
const FL_RGBS = {};
function flRGB(c) { if (Array.isArray(c)) return c; if (c[0] === '#') return FL_RGBS[c] || (FL_RGBS[c] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
function flMix(a, b, k) { const x = flRGB(a), y = flRGB(b); return `rgb(${Math.round(lerp(x[0], y[0], k))},${Math.round(lerp(x[1], y[1], k))},${Math.round(lerp(x[2], y[2], k))})`; }
const flLit = (c, k) => flMix(c, [255, 251, 242], k);         // toward the daylight
const flDk = (c, k) => flMix(c, [52, 38, 34], k);             // toward the shade
const flA = (c, al) => { const v = flRGB(c); return `rgba(${v[0]},${v[1]},${v[2]},${al})`; };

// ---------------------------------------------------------------------
//  paths: small builders that ADD to the current path (so a silhouette can be several pieces)
// ---------------------------------------------------------------------
const flCirc = (x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); };
const flEll = (x, y, rx, ry, rot = 0) => { ctx.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); };
const flPoly = (P) => { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); };
const flPath = (path) => { ctx.beginPath(); if (typeof path === 'function') path(); else flPoly(path); };
function flFill(path, style) { flPath(path); ctx.fillStyle = style; ctx.fill(); }
function flLine(x1, y1, x2, y2, style, w) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = style; ctx.lineWidth = w; ctx.stroke(); }
const flZ = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
// a seeded, FIXED wavy edge (cloth, torn tape): never boils
function flWavy(P, amt, key, step = 7) {
  const Q = resample(P, true, step), R = RNG('fl-wavy', key), f1 = R.r(0.25, 0.45), f2 = R.r(0.7, 1.1), p1 = R.r(0, TAU), p2 = R.r(0, TAU);
  return Q.map((p, i) => { const l = Math.hypot(p[0], p[1]) || 1, k = 1 + amt * (Math.sin(i * f1 + p1) + 0.5 * Math.sin(i * f2 + p2)) / l; return [p[0] * k, p[1] * k]; });
}
const flCirclePts = (x, y, r, n = 72) => ellipsePts(x, y, r, r, 0, n);     // outlines for bridges
const flRectPts = (x, y, w, h, r = 8) => rrectPts(x - w / 2, y - h / 2, w, h, r, 5);

// ---------------------------------------------------------------------
//  THE LIGHT. One window, upper left.
//   flL()                 the unit vector toward the light in the CURRENT drawing space (so a rotated object is still
//                         lit from the upper left of the frame)
//   flLG(r, stops, x, y)  a linear gradient from the lit side to the far side across a thing of radius r
//   flBody(c, r, k)       colour c as a lit matte surface (k = contrast)
//   flEdge(path, w, r)    the light catching the near edge and the far edge falling off, inside the outline
//   flRing(x, y, r, w, rev) a ridge (or with rev a groove) around a circle
//   flSoft(draw, colour, blur, dx, dy)   anything drawn by draw() as a blurred mark (used for every shadow, steam, light)
//   flShadow(path, o)     THE shadow of an object: a wide soft one whose reach is o.h (the object's height, in its own
//                         units) plus a tight dark contact one. o.lift 0..1 = in the air: longer, softer, no contact.
// ---------------------------------------------------------------------
function flL() {
  const m = ctx.getTransform(), det = m.a * m.d - m.b * m.c || 1, lx = -FL_SH[0], ly = -FL_SH[1];
  const x = (m.d * lx - m.c * ly) / det, y = (-m.b * lx + m.a * ly) / det, n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
}
function flLG(r, stops, x = 0, y = 0) {
  const L = flL(), g = ctx.createLinearGradient(x + L[0] * r, y + L[1] * r, x - L[0] * r, y - L[1] * r);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
const flBody = (c, r, k = 1, x = 0, y = 0) => flLG(r, [[0, flLit(c, 0.2 * k)], [0.5, flMix(c, c, 0)], [1, flDk(c, 0.17 * k)]], x, y);
function flEdge(path, w, r, al = 1) {
  ctx.save(); flPath(path); ctx.clip(); flPath(path); ctx.lineWidth = w * 2; ctx.lineJoin = 'round';
  ctx.strokeStyle = flLG(r, [[0, `rgba(255,252,244,${0.6 * al})`], [0.42, 'rgba(255,252,244,0)'], [0.58, `rgba(${FL_SHD},0)`], [1, `rgba(${FL_SHD},${0.3 * al})`]]);
  ctx.stroke(); ctx.restore();
}
function flRing(x, y, r, w, rev, al = 1) {
  const a = `rgba(255,252,244,${0.62 * al})`, b = `rgba(${FL_SHD},${0.34 * al})`;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = w;
  ctx.strokeStyle = flLG(r, [[0, rev ? b : a], [0.5, 'rgba(150,140,130,0)'], [1, rev ? a : b]], x, y); ctx.stroke();
}
function flSoft(draw, col, blur, dx = 0, dy = 0) {
  const m = ctx.getTransform(), z = Math.hypot(m.a, m.b) || 1, OFF = 30000;
  ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = blur * z; ctx.shadowOffsetX = OFF + dx * z; ctx.shadowOffsetY = dy * z;
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e - OFF, m.f);       // the mark itself is drawn off-canvas: only its soft image lands
  ctx.fillStyle = ctx.strokeStyle = '#000'; draw(); ctx.restore();
}
function flShadow(path, o = {}) {
  const lift = clamp(o.lift ?? 0), h = (o.h ?? 10) + lift * (o.liftH ?? 46), al = o.al ?? 1, d = () => { flPath(path); ctx.fill(); };
  flSoft(d, `rgba(${FL_SHD},${(0.3 - 0.1 * lift) * al})`, h * 0.75 + 5, h * FL_SH[0], h * FL_SH[1]);
  if (lift < 0.98) flSoft(d, `rgba(${FL_SHD},${0.42 * (1 - lift) * al})`, 2.5, 2.2 * FL_SH[0], 2.2 * FL_SH[1]);
}

// ---------------------------------------------------------------------
//  THE TABLE. flSurface(name, o) fills the frame (and a margin for camera drift) with a material, built once per
//  name + colour from seeded noise and kept: 'linen' | 'oak' | 'terrazzo' | 'paper' | 'marble'.
//   o.c = the base colour (default FL[name]; 'paper' takes any colour: FL.blush, FL.sageP, FL.sky ...), o.seed
//  Draw it first, under the camera. flTable(c) is the plain matte sheet used while a morph happens.
// ---------------------------------------------------------------------
const FL_M = 160, FL_SURF = {};
const FL_MAKE = {
  linen(g, w, h, c, R) {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {                             // the cloth is never one flat tone
      const x = R.r(0, w), y = R.r(0, h), r = R.r(180, 520), q = g.createRadialGradient(x, y, 0, x, y, r), d = R.f() < 0.5;
      q.addColorStop(0, d ? 'rgba(90,70,50,0.05)' : 'rgba(255,250,236,0.07)'); q.addColorStop(1, d ? 'rgba(90,70,50,0)' : 'rgba(255,250,236,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    const t = document.createElement('canvas'); t.width = t.height = 8; const q = t.getContext('2d');   // plain weave: over, under
    q.fillStyle = 'rgba(255,252,240,0.16)'; q.fillRect(0, 0, 3, 3); q.fillRect(4, 4, 3, 3);
    q.fillStyle = 'rgba(70,52,36,0.10)'; q.fillRect(4, 0, 3, 3); q.fillRect(0, 4, 3, 3);
    q.fillStyle = 'rgba(60,44,30,0.20)'; q.fillRect(3, 0, 1, 8); q.fillRect(7, 0, 1, 8); q.fillRect(0, 3, 8, 1); q.fillRect(0, 7, 8, 1);
    g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 4) { const a = R.f(); g.fillStyle = a < 0.5 ? `rgba(70,52,36,${a * 0.2})` : `rgba(255,250,236,${(a - 0.5) * 0.22})`; g.fillRect(0, y, w, R.r(1, 3)); }   // threads of uneven weight
    for (let x = 2; x < w; x += 4) { const a = R.f(); g.fillStyle = a < 0.5 ? `rgba(70,52,36,${a * 0.16})` : `rgba(255,250,236,${(a - 0.5) * 0.2})`; g.fillRect(x, 0, R.r(1, 3), h); }
    for (let i = 0; i < 520; i++) {                            // slubs: short thick places in a thread
      const x = R.r(0, w), y = R.r(0, h), l = R.r(18, 110), v = R.f() < 0.5; g.fillStyle = R.f() < 0.6 ? 'rgba(255,250,236,0.2)' : 'rgba(80,60,40,0.14)';
      g.beginPath(); g.ellipse(x, y, v ? R.r(1.2, 2.4) : l / 2, v ? l / 2 : R.r(1.2, 2.4), 0, 0, TAU); g.fill();
    }
  },
  oak(g, w, h, c, R) {
    const pw = w / 6;
    for (let i = 0; i < 6; i++) {
      let y = -R.r(0, 900);
      while (y < h) {
        const len = R.r(760, 1500), x = i * pw, tone = R.r(-0.5, 1), col = tone > 0 ? flLit(c, tone * 0.16) : flMix(c, [150, 104, 60], -tone * 0.22);
        g.save(); g.beginPath(); g.rect(x, y, pw, len); g.clip();
        g.fillStyle = col; g.fillRect(x, y, pw, len);
        const cath = R.f() < 0.55, cx = x + R.r(0.3, 0.7) * pw, cy = y + R.r(0.2, 0.8) * len;       // a cathedral figure: nested arches
        for (let k = 0; k < 74; k++) {                         // the grain: long lines that wander a little
          const gx = x + R.f() * pw, A = R.r(1.5, 6), f = R.r(0.003, 0.009), ph = R.r(0, TAU), bow = cath ? (gx - cx) * R.r(0.2, 0.5) : 0;
          g.strokeStyle = `rgba(${R.f() < 0.75 ? '128,84,44' : '250,232,200'},${R.r(0.05, 0.2)})`; g.lineWidth = R.r(0.8, 2.6); g.beginPath();
          for (let yy = y - 20; yy <= y + len + 20; yy += 24) { const xx = gx + A * Math.sin(yy * f + ph) + bow * Math.exp(-(((yy - cy) / (len * 0.22)) ** 2)); if (yy === y - 20) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
          g.stroke();
        }
        if (R.f() < 0.3) {                                     // a knot
          const kx = x + R.r(0.25, 0.75) * pw, ky = y + R.r(0.15, 0.85) * len;
          for (let k = 5; k > 0; k--) { g.strokeStyle = `rgba(110,70,36,${0.1 + 0.05 * (5 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(kx, ky, k * 4.5, k * 8, 0, 0, TAU); g.stroke(); }
          g.fillStyle = 'rgba(96,58,30,0.5)'; g.beginPath(); g.ellipse(kx, ky, 3.5, 6, 0, 0, TAU); g.fill();
        }
        g.restore();
        g.fillStyle = 'rgba(70,42,20,0.5)'; g.fillRect(x, y + len - 2, pw, 3); g.fillStyle = 'rgba(255,240,214,0.3)'; g.fillRect(x, y + len + 1, pw, 1.5);   // the butt joint
        y += len;
      }
    }
    for (let i = 1; i < 6; i++) { g.fillStyle = 'rgba(64,38,18,0.6)'; g.fillRect(i * pw - 2, 0, 3.5, h); g.fillStyle = 'rgba(255,240,214,0.34)'; g.fillRect(i * pw + 1.5, 0, 1.5, h); }   // the gaps between planks
  },
  terrazzo(g, w, h, c, R) {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    const cols = [FL.terra, FL.terra, FL.sage, FL.sage, FL.mustard, '#5d646c', '#5d646c', FL.rose, '#a69a8f', '#a69a8f', FL.coffee, FL.white];
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(80,66,56,${R.r(0.08, 0.3)})`; g.fillRect(R.r(0, w), R.r(0, h), R.r(1, 2.6), R.r(1, 2.6)); }
    const n = Math.round(w * h / 3800);
    for (let i = 0; i < n; i++) {
      const x = R.r(0, w), y = R.r(0, h), r = R.f() < 0.08 ? R.r(24, 40) : R.r(5, 19), m = R.i(4, 7), a0 = R.r(0, TAU), el = R.r(0.55, 1), er = R.r(0, TAU);
      g.beginPath();
      for (let k = 0; k < m; k++) { const a = a0 + k / m * TAU + R.n(0.3), rr = r * R.r(0.6, 1), px = Math.cos(a) * rr, py = Math.sin(a) * rr * el; g[k ? 'lineTo' : 'moveTo'](x + px * Math.cos(er) - py * Math.sin(er), y + px * Math.sin(er) + py * Math.cos(er)); }
      g.closePath(); g.fillStyle = flMix(R.pick(cols), c, R.r(0, 0.28)); g.fill(); g.strokeStyle = 'rgba(60,46,38,0.14)'; g.lineWidth = 1; g.stroke();
    }
  },
  paper(g, w, h, c, R) {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16000; i++) { g.fillStyle = R.f() < 0.5 ? 'rgba(255,252,244,0.12)' : 'rgba(60,44,36,0.07)'; g.fillRect(R.r(0, w), R.r(0, h), 1.6, 1.6); }
    g.lineWidth = 1;
    for (let i = 0; i < 700; i++) { const x = R.r(0, w), y = R.r(0, h), a = R.r(0, TAU), l = R.r(8, 30); g.strokeStyle = R.f() < 0.5 ? 'rgba(255,252,244,0.16)' : 'rgba(60,44,36,0.08)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  },
  marble(g, w, h, c, R) {
    g.fillStyle = c; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {                             // clouds
      const x = R.r(0, w), y = R.r(0, h), r = R.r(160, 560), q = g.createRadialGradient(x, y, 0, x, y, r);
      q.addColorStop(0, `rgba(138,140,150,${R.r(0.03, 0.09)})`); q.addColorStop(1, 'rgba(138,140,150,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    const vein = (x, y, a, steps, wd) => {                    // a vein: a wandering line, drawn soft, then sharp
      const P = [[x, y]];
      for (let k = 0; k < steps; k++) { a += R.n(0.34); x += Math.cos(a) * 34; y += Math.sin(a) * 34; P.push([x, y]); if (wd > 1.2 && R.f() < 0.07) vein(x, y, a + R.pick([-1, 1]) * R.r(0.5, 1), R.i(8, 26), wd * 0.55); }
      for (const [lw, al, bl] of [[wd * 10, 0.07, 8], [wd * 3, 0.09, 2], [wd, 0.24, 0]]) {
        g.filter = bl ? `blur(${bl}px)` : 'none'; g.strokeStyle = `rgba(120,122,132,${al})`; g.lineWidth = lw; g.lineJoin = g.lineCap = 'round';
        g.beginPath(); P.forEach((p, k) => g[k ? 'lineTo' : 'moveTo'](p[0], p[1])); g.stroke();
      }
      g.filter = 'none';
    };
    for (let i = 0; i < 6; i++) vein(R.r(0, w), -40, Math.PI / 2 + R.n(0.5) + 0.5, R.i(50, 90), R.r(1.2, 2.4));
  },
};
function flSurface(name = 'linen', o = {}) {
  const make = FL_MAKE[name] || FL_MAKE.paper, c = o.c ?? FL[name] ?? FL.paper, key = name + '|' + c + '|' + (o.seed ?? 0);
  let cv = FL_SURF[key];
  if (!cv) {
    cv = FL_SURF[key] = document.createElement('canvas'); cv.width = W + 2 * FL_M; cv.height = H + 2 * FL_M;
    const g = cv.getContext('2d'); make(g, cv.width, cv.height, c, RNG('fl-surface', key));
    const q = g.createRadialGradient(cv.width * 0.24, cv.height * 0.18, 60, cv.width * 0.24, cv.height * 0.18, Math.hypot(cv.width, cv.height) * 0.92);   // the window's falloff
    q.addColorStop(0, 'rgba(255,250,236,0.22)'); q.addColorStop(0.5, 'rgba(255,250,236,0.02)'); q.addColorStop(1, 'rgba(40,28,24,0.2)'); g.fillStyle = q; g.fillRect(0, 0, cv.width, cv.height);
  }
  ctx.drawImage(cv, -FL_M, -FL_M);
}
function flTable(c) {
  ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
  const q = ctx.createRadialGradient(W * 0.24, H * 0.18, 60, W * 0.24, H * 0.18, Math.hypot(W, H) * 0.92);
  q.addColorStop(0, 'rgba(255,250,236,0.22)'); q.addColorStop(0.5, 'rgba(255,250,236,0.02)'); q.addColorStop(1, 'rgba(40,28,24,0.2)'); ctx.fillStyle = q; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
let FL_GRAIN = null;
function flGrain() {                                          // the photograph's finish: fine grain and a soft vignette
  if (FL_GRAIN) return FL_GRAIN;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), R = RNG('fl-grain'), n = Math.round(W * H / 170);
  g.fillStyle = 'rgba(50,38,32,0.05)'; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, W), R.r(0, H), 1.5, 1.5); g.fill();
  g.fillStyle = 'rgba(255,252,244,0.06)'; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, W), R.r(0, H), 1.5, 1.5); g.fill();
  const v = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.55, W / 2, H * 0.46, Math.hypot(W, H) * 0.64);
  v.addColorStop(0, 'rgba(36,26,22,0)'); v.addColorStop(1, 'rgba(36,26,22,0.2)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  return (FL_GRAIN = cv);
}

// ---------------------------------------------------------------------
//  LAYOUT: knolling is the point.
//   flGrid({ x, y, w, h, cols, rows, gap })  ->  g.cell(col, row, colSpan, rowSpan) = { x, y, w, h, cx, cy, s } where
//        s = half the cell's short side (an item of that size fills it). g.marks(alpha) draws the stylist's faint
//        corner ticks. Put ONE thing in a cell, centred, squared (rot 0 or a quarter turn).
//   flAround(cx, cy, r, n, a0)  ->  n points on a ring: props round a hero
// ---------------------------------------------------------------------
function flGrid(o = {}) {
  const x = o.x ?? 96, y = o.y ?? 340, w = o.w ?? W - 2 * x - 84, h = o.h ?? 940, cols = o.cols ?? 3, rows = o.rows ?? 4, gap = o.gap ?? 28;
  const cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
  const cell = (c, r, cs = 1, rs = 1) => { const cx = x + c * (cw + gap), cy = y + r * (ch + gap), ww = cw * cs + gap * (cs - 1), hh = ch * rs + gap * (rs - 1); return { x: cx, y: cy, w: ww, h: hh, cx: cx + ww / 2, cy: cy + hh / 2, s: Math.min(ww, hh) / 2 }; };
  const marks = (al = 1, c = '#ffffff') => {
    if (al <= 0) return;
    ctx.save(); ctx.globalAlpha *= al * 0.55; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
      const px = x + i * (cw + gap) - (i ? gap / 2 : 0) + (i === cols ? gap / 2 : 0), py = y + j * (ch + gap) - (j ? gap / 2 : 0) + (j === rows ? gap / 2 : 0);
      ctx.moveTo(px - 9, py); ctx.lineTo(px + 9, py); ctx.moveTo(px, py - 9); ctx.lineTo(px, py + 9);
    }
    ctx.stroke(); ctx.restore();
  };
  return { x, y, w, h, cols, rows, gap, cw, ch, cell, marks };
}
const flAround = (cx, cy, r, n, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => [cx + Math.cos(a0 + i / n * TAU) * r, cy + Math.sin(a0 + i / n * TAU) * r]);

// ---------------------------------------------------------------------
//  ARRIVING. flArrive(o) -> null (not in frame yet) or { dx, dy, rot, lift, sc, al }
//   o.at   the second it starts (left out = it is simply there)
//   o.from 'l' | 'r' | 't' | 'b' (slides in from that frame edge, turning, and snaps square with a small overshoot),
//          [dx, dy] (a direction), or 'drop' (a prop set down from above: a little spin, it shrinks onto the table)
//   o.spin radians it is turned by when it starts (0.5; props: a random spin)
// ---------------------------------------------------------------------
function flArrive(o = {}) {
  if (o.at == null) return { dx: 0, dy: 0, rot: 0, lift: 0, sc: 1, al: 1 };
  const t = TT - o.at; if (t < 0) return null;
  const tau = Math.max(0, t - 0.17), wob = Math.exp(-10 * tau) * Math.sin(26 * tau), from = o.from ?? 'l';
  if (from === 'drop') { const q = 1 - EZ.o3(t / 0.24); return { dx: 0, dy: 0, rot: (o.spin ?? 0.8) * q, lift: q, sc: 1 + 0.4 * q - 0.05 * wob, al: clamp(t / 0.07) }; }
  const q = 1 - EZ.o3(t / 0.3), D = o.dist ?? 1150, v = Array.isArray(from) ? from : { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] }[from];
  const sp = o.spin ?? 0.5;
  return { dx: v[0] * (D * q - 15 * wob), dy: v[1] * (D * q - 15 * wob), rot: sp * q - 0.07 * Math.sign(sp) * wob, lift: 0.7 * clamp(1 - t / 0.3), sc: 1, al: 1 };
}

// ---------------------------------------------------------------------
//  lettering
//   flType(str, x, y, size, c, o)   set type: o.font (FL_SANS), weight, italic, track (em), align, base, al, rot
//   flHand(str, x, y, size, c, o)   the stylist's handwriting; o.frac 0..1 writes it on from the left; -> its width
//   flArcType(str, r, size, c, o)   type on a circle about the origin (labels on lids); o.bottom = along the bottom
//   flMark(kind, x, y, r, c)        an invented brand mark: 'sun' | 'leaf' | 'drop' | 'bean' | 'wave'
// ---------------------------------------------------------------------
function flFont(size, o = {}) { ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 500} ${size}px ${o.font ?? FL_SANS}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${(size * (o.track ?? 0)).toFixed(2)}px`; }
function flTypeW(str, size, o = {}) { ctx.save(); flFont(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function flType(str, x, y, size, c, o = {}) {
  ctx.save(); flFont(size, o); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.base ?? 'middle'; ctx.fillStyle = c; ctx.globalAlpha *= o.al ?? 1;
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = y = 0; }
  ctx.fillText(str, x, y); const w = ctx.measureText(str).width; ctx.restore(); return w;
}
function flHand(str, x, y, size, c = FL.ink, o = {}) {
  const f = clamp(o.frac ?? 1), oo = { font: FL_HAND, weight: o.weight ?? 600, track: 0.01 }, w = flTypeW(str, size, oo);
  if (f <= 0) return w;
  const x0 = x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0);
  ctx.save(); if (o.rot) { ctx.translate(x0, y); ctx.rotate(o.rot); ctx.translate(-x0, -y); }
  if (f < 1) { ctx.beginPath(); ctx.rect(x0 - 6, y - size * 1.3, (w + 12) * f, size * 2.1); ctx.clip(); }
  flType(str, x0, y, size, c, { ...oo, align: 'left', base: o.base ?? 'alphabetic', al: o.al });
  ctx.restore(); return w;
}
function flArcType(str, r, size, c, o = {}) {
  ctx.save(); flFont(size, { weight: o.weight ?? 600, font: o.font }); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = c; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ch = [...str], dir = o.bottom ? -1 : 1; let ws, tot;
  for (let pass = 0; pass < 2; pass++) {                       // shrink a long line so it stays within o.max radians (1.9)
    ws = ch.map((s) => ctx.measureText(s).width + (o.track ?? 0.16) * size); tot = ws.reduce((a, b) => a + b, 0);
    if (pass || tot / r <= (o.max ?? 1.9)) break;
    size *= (o.max ?? 1.9) * r / tot; flFont(size, { weight: o.weight ?? 600, font: o.font }); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  let a = (o.bottom ? Math.PI / 2 : -Math.PI / 2) - dir * tot / r / 2;
  ch.forEach((s, i) => { a += dir * ws[i] / r / 2; ctx.save(); ctx.rotate(a + dir * Math.PI / 2); ctx.fillText(s, 0, -dir * r); ctx.restore(); a += dir * ws[i] / r / 2; });
  ctx.restore();
}
function flMark(kind, x, y, r, c) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = ctx.strokeStyle = c; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'leaf') { ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(-r * 1.1, 0, 0, -r); ctx.quadraticCurveTo(r * 1.1, 0, 0, r); ctx.fill(); ctx.strokeStyle = 'rgba(255,252,244,0.75)'; ctx.beginPath(); ctx.moveTo(0, r * 0.7); ctx.lineTo(0, -r * 0.55); ctx.stroke(); }
  else if (kind === 'drop') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 1.2, r * 0.2, r * 0.6, r, 0, r); ctx.bezierCurveTo(-r * 0.6, r, -r * 1.2, r * 0.2, 0, -r); ctx.fill(); }
  else if (kind === 'bean') { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.66, r, 0.5, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,252,244,0.8)'; ctx.beginPath(); ctx.moveTo(r * 0.36, -r * 0.7); ctx.bezierCurveTo(-r * 0.3, -r * 0.2, r * 0.3, r * 0.2, -r * 0.36, r * 0.7); ctx.stroke(); }
  else if (kind === 'wave') { for (const dy of [-0.4, 0.4]) { ctx.beginPath(); ctx.moveTo(-r, dy * r); ctx.bezierCurveTo(-r * 0.5, (dy - 0.6) * r, 0, (dy + 0.6) * r, r, dy * r); ctx.stroke(); } }
  else { ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU); ctx.fill(); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  THE OBJECTS. Each is a top view drawn in its own space, about the origin, inside roughly +-100 units (long things
//  lie along the y axis), with a silhouette path (for its shadow) and a height h (how far its shadow reaches).
//  Labels are invented marks and words: never a real brand.
// ---------------------------------------------------------------------
const FL_ITEMS = {};
// a cylinder seen from the side (tubes, bottles, handles): the highlight runs along it on the window's side
function flCyl(c, hw, k = 1) {
  const L = flL(), g = ctx.createLinearGradient(-hw, 0, hw, 0), s = L[0] <= 0 ? [[0, flDk(c, 0.1 * k)], [0.28, flLit(c, 0.34 * k)], [0.62, flMix(c, c, 0)], [1, flDk(c, 0.3 * k)]] : [[0, flDk(c, 0.3 * k)], [0.38, flMix(c, c, 0)], [0.72, flLit(c, 0.34 * k)], [1, flDk(c, 0.1 * k)]];
  for (const [t, col] of s) g.addColorStop(t, col);
  return g;
}
// --- a round tin (or with o.knurl a jar lid) with a paper label. o: c, label, sub, mark, knurl, labelC, glint (0..1)
FL_ITEMS.tin = {
  h: 17, path: () => flCirc(0, 0, 100),
  draw(o) {
    const c = o.c ?? FL.terra, L = flL(), x = L[0] * 2.5, y = L[1] * 2.5, lc = o.labelC ?? FL.cream, tc = o.ink ?? flDk(c, 0.42);
    flFill(() => flCirc(0, 0, 100), flDk(c, 0.36));                                  // the side wall shows as a dark edge away from the light
    flFill(() => flCirc(x, y, 97), flBody(c, 100, 1, x, y));                         // the lid
    if (o.knurl) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = flDk(c, 0.3); ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; ctx.moveTo(Math.cos(a) * 90, Math.sin(a) * 90); ctx.lineTo(Math.cos(a) * 96.5, Math.sin(a) * 96.5); } ctx.stroke(); ctx.restore(); }
    flRing(x, y, o.knurl ? 87 : 91, 5, false); flRing(x, y, o.knurl ? 82 : 85, 2.6, true);   // the rolled rim: a ridge, then a groove
    if (o.glint != null) {                                                          // a soft band of light crossing the lid
      ctx.save(); flPath(() => flCirc(x, y, 97)); ctx.clip(); ctx.rotate(-0.6); const gx = lerp(-150, 150, o.glint), g = ctx.createLinearGradient(gx - 34, 0, gx + 34, 0);
      g.addColorStop(0, 'rgba(255,252,244,0)'); g.addColorStop(0.5, 'rgba(255,252,244,0.3)'); g.addColorStop(1, 'rgba(255,252,244,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 34, -140, 68, 280); ctx.restore();
    }
    if (o.label === false) return;
    flFill(() => flCirc(x, y, 64), lc); flRing(x, y, 64, 1.6, true, 0.5);
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, 57, 0, TAU); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke();
    flMark(o.mark ?? 'sun', 0, -27, 13, c);
    { const lb = o.label ?? 'SOL', lo = { font: FL_SERIF, weight: 700, track: 0.1 }; flType(lb, 0, 5, Math.min(30, 30 * 74 / flTypeW(lb, 30, lo)), tc, lo); }
    flArcType(o.sub ?? 'DAILY BALM', 45, 9.5, tc, { bottom: true });
    ctx.restore();
  },
};
// --- a carton. o: c, w (half width, 58), label, sub, mark, accent, labelC
FL_ITEMS.box = {
  h: 26, path: (o) => ctx.roundRect(-(o.w ?? 58), -100, 2 * (o.w ?? 58), 200, 5),
  draw(o) {
    const w = o.w ?? 58, c = o.c ?? FL.kraft, L = flL(), ac = o.accent ?? FL.terra, P = () => ctx.roundRect(-w + 1.5, -98.5, 2 * w - 3, 197, 4);
    flFill(() => ctx.roundRect(-w, -100, 2 * w, 200, 5), flDk(c, 0.34));
    ctx.save(); ctx.translate(L[0] * 1.5, L[1] * 1.5);
    flFill(P, flBody(c, 115, 0.8)); flEdge(P, 3, 115);
    flLine(-w + 2, -70, w - 2, -70, `rgba(${FL_SHD},0.28)`, 1.6); flLine(-w + 2, -68.2, w - 2, -68.2, 'rgba(255,252,244,0.4)', 1.2);   // the tuck flap
    flFill(() => { ctx.moveTo(-9, -70); ctx.arc(0, -70, 9, Math.PI, 0, true); }, `rgba(${FL_SHD},0.2)`);
    flFill(() => ctx.rect(-w + 9, -48, 2 * w - 18, 104), o.labelC ?? FL.cream);
    flMark(o.mark ?? 'bean', 0, -24, 13, ac);
    flType(o.label ?? 'ROAST', 0, 8, 15.5, FL.ink, { weight: 700, track: 0.16 });
    flType(o.sub ?? 'No. 4', 0, 28, 12.5, FL.soft, { font: FL_SERIF, italic: true });
    flFill(() => ctx.rect(-w + 9, 43, 2 * w - 18, 3), ac);
    flFill(() => ctx.rect(-w + 1.5, 70, 2 * w - 3, 13), ac);
    ctx.restore();
  },
};
// --- a tube lying on its side: crimped end up, cap down. o: c, cap, label, sub, mark, accent
const flTubeP = () => { ctx.moveTo(-46, -100); ctx.lineTo(46, -100); ctx.lineTo(46, -84); ctx.lineTo(40, 54); ctx.quadraticCurveTo(39, 68, 24, 70); ctx.lineTo(-24, 70); ctx.quadraticCurveTo(-39, 68, -40, 54); ctx.lineTo(-46, -84); ctx.closePath(); };
FL_ITEMS.tube = {
  h: 22, path: () => { flTubeP(); ctx.roundRect(-27, 66, 54, 34, 7); },
  draw(o) {
    const c = o.c ?? FL.blush, cap = o.cap ?? FL.white, ac = o.accent ?? FL.terra;
    flFill(() => ctx.roundRect(-27, 66, 54, 34, 7), flCyl(cap, 27));
    ctx.save(); flPath(() => ctx.roundRect(-27, 66, 54, 34, 7)); ctx.clip(); for (let x = -24; x <= 24; x += 6) flLine(x, 70, x, 100, `rgba(${FL_SHD},0.16)`, 1.4); ctx.restore();
    flFill(flTubeP, flCyl(c, 46));
    flFill(() => ctx.rect(-46, -100, 92, 17), flLit(c, 0.3));                         // the crimp: pressed flat, ribbed
    for (let x = -42; x <= 42; x += 5) flLine(x, -99, x, -84, `rgba(${FL_SHD},0.2)`, 1.2);
    flLine(-46, -83, 46, -83, `rgba(${FL_SHD},0.3)`, 1.5);
    flFill(() => ctx.rect(-45, -66, 90, 5), flA(ac, 0.9));
    flMark(o.mark ?? 'leaf', 0, 42, 9, ac);
    flType(o.label ?? 'CREAM', -2, -12, 19, FL.ink, { font: FL_SERIF, weight: 700, track: 0.1, rot: -Math.PI / 2 });
    flType(o.sub ?? 'hand', 18, -12, 11, FL.soft, { font: FL_SERIF, italic: true, rot: -Math.PI / 2 });
    flLine(-39, 62, 39, 62, `rgba(${FL_SHD},0.22)`, 1.5);
  },
};
// --- a dropper bottle lying on its side: bulb up. o: c (the glass), cap, label, mark
FL_ITEMS.bottle = {
  h: 28, path: () => { ctx.roundRect(-40, -36, 80, 136, 16); ctx.rect(-15, -50, 30, 18); ctx.roundRect(-22, -66, 44, 19, 4); ctx.roundRect(-14, -100, 28, 38, 12); },
  draw(o) {
    const c = o.c ?? FL.amber, cap = o.cap ?? FL.ink, L = flL(), B = () => ctx.roundRect(-40, -36, 80, 136, 16);
    flFill(() => ctx.roundRect(-14, -100, 28, 38, 12), flCyl(flLit(cap, 0.12), 14));      // the rubber bulb
    flFill(() => ctx.rect(-15, -50, 30, 18), flCyl(flDk(c, 0.2), 15));
    flFill(() => ctx.roundRect(-22, -66, 44, 19, 4), flCyl(cap, 22));
    for (let x = -18; x <= 18; x += 4.5) flLine(x, -65, x, -48, 'rgba(255,252,244,0.14)', 1.1);
    flFill(B, flCyl(c, 40, 1.2)); flEdge(B, 4, 80, 0.7);
    flFill(() => ctx.roundRect(-34, 0, 68, 74, 2), o.labelC ?? FL.cream);
    const g = ctx.createLinearGradient(-34, 0, 34, 0); g.addColorStop(0, `rgba(${FL_SHD},0.2)`); g.addColorStop(0.25, `rgba(${FL_SHD},0)`); g.addColorStop(0.75, `rgba(${FL_SHD},0)`); g.addColorStop(1, `rgba(${FL_SHD},0.26)`);
    flFill(() => ctx.rect(-34, 0, 68, 74), g);                                        // the label wraps round the glass
    flMark(o.mark ?? 'drop', 0, 20, 9, flDk(c, 0.2));
    flType(o.label ?? 'OIL', 0, 42, 14, FL.ink, { weight: 700, track: 0.18 });
    flType(o.sub ?? 'face', 0, 58, 10.5, FL.soft, { font: FL_SERIF, italic: true });
    const sx = L[0] <= 0 ? -29 : 23;
    flFill(() => ctx.roundRect(sx, -22, 6, 112, 3), 'rgba(255,252,244,0.42)');           // the window, long and thin, in the glass
    flFill(() => ctx.roundRect(sx + (L[0] <= 0 ? 10 : -6), -14, 2.4, 96, 1.2), 'rgba(255,252,244,0.22)');
  },
};
// --- a cup or a bowl from above: wall, rim, inner wall (in shade on the window's side), the surface of what is in
//     it with the rim's crescent shadow and a crescent highlight. o: c (ceramic), liquid (colour), handle (radians;
//     cup only), ripple (a time: rings travel outward), grains { n, c, s } (sugar, salt, seeds heaped in it),
//     swirl (cream), empty
function flVessel(o, handle) {
  const c = o.c ?? FL.white, L = flL(), lq = o.liquid ?? FL.coffee, la = Math.atan2(L[1], L[0]), R = 79;
  if (handle) { ctx.save(); ctx.rotate(o.handle ?? 0); const hp = () => ctx.roundRect(82, -15, 54, 30, 14); flFill(hp, flBody(c, 60, 1, 108, 0)); flEdge(hp, 3, 110); ctx.restore(); }
  flFill(() => flCirc(0, 0, 100), flBody(c, 100, 1.15));
  flRing(0, 0, 95, 6, false);
  flFill(() => flCirc(0, 0, 89), flLG(89, [[0, flDk(c, 0.46)], [0.45, flDk(c, 0.18)], [1, flLit(c, 0.2)]]));
  ctx.save(); flPath(() => flCirc(0, 0, R)); ctx.clip();
  if (o.empty) flFill(() => flCirc(0, 0, R), flLG(R, [[0, flDk(c, 0.3)], [1, flDk(c, 0.04)]]));
  else {
    const g = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, R); g.addColorStop(0, flLit(lq, 0.1)); g.addColorStop(1, flDk(lq, 0.24)); ctx.fillStyle = g; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    if (o.grains) {
      const Rn = RNG('fl-grains', o.key ?? 'g'), n = o.grains.n ?? 90, s = o.grains.s ?? 9, gc = o.grains.c ?? FL.white;
      for (let i = 0; i < n; i++) { const a = Rn.r(0, TAU), d = Math.sqrt(Rn.f()) * R * 0.94, rot = Rn.r(0, TAU), k = Rn.r(0.7, 1.2) * s; ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(rot); ctx.fillStyle = `rgba(${FL_SHD},0.22)`; ctx.fillRect(-k / 2 + 1.4, -k / 2 + 1.8, k, k); ctx.fillStyle = flDk(gc, Rn.r(0, 0.1)); ctx.fillRect(-k / 2, -k / 2, k, k); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-k / 2, -k / 2, k * 0.5, k * 0.5); ctx.restore(); }
    }
    if (o.swirl) { ctx.strokeStyle = flA(flLit(lq, 0.6), 0.5); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU * 1.6 + (o.swirl === true ? 0 : o.swirl), d = 6 + i / 60 * R * 0.62; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * d, Math.sin(a) * d); } ctx.stroke(); }
    if (o.ripple != null) for (let i = 0; i < 3; i++) {                                // rings travelling outward
      const f = mod(o.ripple * 0.42 + i / 3, 1);
      ctx.beginPath(); ctx.arc(0, 0, 5 + f * R * 0.96, 0, TAU); ctx.lineWidth = 2.4; ctx.strokeStyle = flA(flLit(lq, 0.55), 0.34 * Math.sin(Math.PI * f)); ctx.stroke();
    }
  }
  ctx.beginPath(); flCirc(0, 0, R + 2); flCirc(-L[0] * R * 0.2, -L[1] * R * 0.2, R * 0.93); ctx.fillStyle = `rgba(${FL_SHD},0.36)`; ctx.fill('evenodd');   // the rim's shadow: a crescent on the window's side
  if (!o.empty && !o.grains) {                                                        // the window in the liquid: a crescent, and a dot
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,250,238,0.42)'; ctx.lineWidth = R * 0.08; ctx.beginPath(); ctx.arc(0, 0, R * 0.56, la - 0.5, la + 0.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,238,0.4)'; ctx.beginPath(); ctx.arc(Math.cos(la + 0.86) * R * 0.56, Math.sin(la + 0.86) * R * 0.56, R * 0.04, 0, TAU); ctx.fill();
  }
  ctx.restore();
  flRing(0, 0, R, 2.4, true, 0.8);
}
FL_ITEMS.cup = { h: 34, path: (o) => { flCirc(0, 0, 100); ctx.save(); ctx.rotate(o.handle ?? 0); ctx.roundRect(82, -15, 54, 30, 14); ctx.restore(); }, draw: (o) => flVessel(o, true) };
FL_ITEMS.bowl = { h: 28, path: () => flCirc(0, 0, 100), draw: (o) => flVessel(o, false) };
// --- a plate or saucer. o: c, well (the flat middle's radius, 68), band (a colour line round the rim)
FL_ITEMS.plate = {
  h: 9, path: () => flCirc(0, 0, 100),
  draw(o) {
    const c = o.c ?? FL.white, L = flL(), wl = o.well ?? 68;
    flFill(() => flCirc(0, 0, 100), flDk(c, 0.24));
    flFill(() => flCirc(L[0] * 1.5, L[1] * 1.5, 98.5), flBody(c, 100, 0.8));
    flRing(0, 0, 96.5, 3, false, 0.9);
    if (o.band) { ctx.beginPath(); ctx.arc(0, 0, 88, 0, TAU); ctx.strokeStyle = flA(o.band, 0.85); ctx.lineWidth = 2.4; ctx.stroke(); }
    flFill(() => flCirc(0, 0, wl), flLG(wl, [[0, flDk(c, 0.17)], [0.4, flDk(c, 0.05)], [1, flLit(c, 0.2)]]));
    flRing(0, 0, wl, 3, true, 0.7);
  },
};
// --- a spoon: bowl up. o: c (steel, or FL.wood)
FL_ITEMS.spoon = {
  h: 6, path: () => { flEll(0, -66, 25, 34); ctx.roundRect(-4.5, -40, 9, 110, 4); ctx.roundRect(-7.5, 52, 15, 48, 7.5); },
  draw(o) {
    const c = o.c ?? FL.steel;
    flFill(() => { ctx.roundRect(-4.5, -40, 9, 110, 4); ctx.roundRect(-7.5, 52, 15, 48, 7.5); }, flCyl(c, 7.5, 1.3));
    flFill(() => flEll(0, -66, 25, 34), flBody(c, 36, 1.5, 0, -66));
    flFill(() => flEll(0, -65, 19.5, 28), flLG(30, [[0, flDk(c, 0.36)], [0.5, flDk(c, 0.08)], [1, flLit(c, 0.5)]], 0, -65));    // hollow: dark on the window's side
    flEdge(() => flEll(0, -66, 25, 34), 2.2, 36, 0.9);
  },
};
// --- a folded cloth. o: c, hh (half height in units, 80), stripe (a colour: tea-towel stripes), key
FL_ITEMS.cloth = {
  h: 8, path: (o) => flPoly(flWavy(rrectPts(-100, -(o.hh ?? 80), 200, 2 * (o.hh ?? 80), 9, 4), 1.3, o.key ?? 'cloth')),
  draw(o) {
    const c = o.c ?? FL.cream, hh = o.hh ?? 80, P = flWavy(rrectPts(-100, -hh, 200, 2 * hh, 9, 4), 1.3, o.key ?? 'cloth'), L = flL();
    flFill(P, flBody(c, 120, 0.7));
    ctx.save(); flPath(P); ctx.clip();
    ctx.lineWidth = 1; for (let y = -hh; y < hh; y += 4) flLine(-104, y, 104, y, `rgba(${FL_SHD},0.055)`, 1.2); for (let x = -100; x < 104; x += 4) flLine(x, -hh - 4, x, hh + 4, 'rgba(255,252,244,0.1)', 1.2);   // the weave
    if (o.stripe) for (const [x, w] of [[54, 2.5], [64, 8], [76, 2.5]]) flFill(() => ctx.rect(x, -hh - 4, w, 2 * hh + 8), flA(o.stripe, 0.82));
    const far = L[1] < 0 ? 1 : -1, ye = far * (hh - 15);                              // the layer underneath peeks out on the far side
    flFill(() => ctx.rect(-104, far > 0 ? ye : -hh - 4, 208, 19), `rgba(${FL_SHD},0.09)`);
    flLine(-104, ye, 104, ye, `rgba(${FL_SHD},0.3)`, 1.8); flLine(-104, ye - far * 1.6, 104, ye - far * 1.6, 'rgba(255,252,244,0.5)', 1.2);
    for (const x of [-34]) { flLine(x, -hh - 4, x, hh + 4, `rgba(${FL_SHD},0.16)`, 2); flLine(x + 2, -hh - 4, x + 2, hh + 4, 'rgba(255,252,244,0.4)', 1.4); }   // a pressed fold
    ctx.setLineDash([5, 4]); ctx.strokeStyle = `rgba(${FL_SHD},0.26)`; ctx.lineWidth = 1.2; ctx.strokeRect(-93, -hh + 7, 186, 2 * hh - 14); ctx.setLineDash([]);   // the hem
    ctx.restore(); flEdge(P, 2.5, 120, 0.8);
  },
};
// --- a notebook. o: c (the cover), label
FL_ITEMS.notebook = {
  h: 13, path: () => ctx.roundRect(-70, -100, 140, 200, 7),
  draw(o) {
    const c = o.c ?? FL.navy, L = flL(), P = () => ctx.roundRect(-70, -100, 140, 200, 7);
    flFill(P, FL.cream); ctx.save(); flPath(P); ctx.clip(); for (let i = -100; i < 100; i += 2.2) { flLine(-70, i, 70, i, `rgba(${FL_SHD},0.1)`, 0.7); } ctx.restore();   // the block of pages
    ctx.save(); ctx.translate(L[0] * 2.6, L[1] * 2.6); ctx.scale(0.962, 0.974);
    flFill(P, flBody(c, 120, 0.8)); flEdge(P, 3, 120, 0.8);
    const g = ctx.createLinearGradient(-70, 0, -52, 0); g.addColorStop(0, `rgba(${FL_SHD},0.3)`); g.addColorStop(1, `rgba(${FL_SHD},0)`); flFill(() => ctx.rect(-70, -100, 18, 200), g);
    flFill(() => ctx.rect(42, -100, 7, 200), flDk(c, 0.55)); flLine(43, -100, 43, 100, 'rgba(255,252,244,0.16)', 1);      // the elastic
    flFill(() => ctx.roundRect(-38, -56, 64, 36, 2), FL.cream);
    if (o.label !== false) { const lb = o.label ?? 'NOTES', lw = flTypeW(lb, 10, { weight: 700, track: 0.2 }); flType(lb, -6, -42, Math.min(10, 10 * 54 / lw), FL.ink, { weight: 700, track: 0.2 }); } flLine(-30, -31, 18, -31, flA(FL.soft, 0.6), 1);
    ctx.restore();
  },
};
// --- sunglasses, arms folded. o: c (frame), lens, glare (0..1: a reflection sliding across the lenses)
const flLensP = (sg) => ctx.roundRect(sg > 0 ? 9 : -97, -38, 88, 76, [26, 30, 38, 34]);
FL_ITEMS.glasses = {
  h: 11, path: () => { flLensP(1); flLensP(-1); ctx.rect(-12, -28, 24, 26); },
  draw(o) {
    const c = o.c ?? '#4d3122', ln = o.lens ?? '#2c3440', gl = o.glare ?? 0.35;
    ctx.lineCap = 'round'; flLine(88, -22, -40, -6, flDk(c, 0.25), 7); flLine(-88, -22, 40, -12, flDk(c, 0.1), 7);          // the arms, folded behind the lenses
    for (const sg of [1, -1]) {
      const P = () => flLensP(sg);
      flFill(P, flLG(60, [[0, flA(flLit(ln, 0.22), 0.82)], [1, flA(flDk(ln, 0.3), 0.9)]], sg * 53, 0));
      ctx.save(); flPath(P); ctx.clip(); ctx.translate(sg * 53 + lerp(-70, 70, gl), 0); ctx.rotate(-0.55); ctx.fillStyle = 'rgba(255,252,244,0.2)'; ctx.fillRect(-9, -90, 18, 180); ctx.fillStyle = 'rgba(255,252,244,0.14)'; ctx.fillRect(17, -90, 5, 180); ctx.restore();
      flPath(P); ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.stroke();
      flPath(P); ctx.strokeStyle = flLG(60, [[0, 'rgba(255,240,220,0.5)'], [0.5, 'rgba(255,240,220,0)']], sg * 53, 0); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-11, -20); ctx.quadraticCurveTo(0, -31, 11, -20); ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.stroke();
  },
};
// --- props -----------------------------------------------------------
// a coffee bean (o.c)
FL_ITEMS.bean = {
  h: 30, path: () => flEll(0, 0, 66, 100),
  draw(o) {
    const c = o.c ?? FL.bean, L = flL();
    flFill(() => flEll(0, 0, 66, 100), flBody(c, 100, 1.9));
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -84); ctx.bezierCurveTo(-26, -30, 26, 30, -6, 84); ctx.strokeStyle = flDk(c, 0.62); ctx.lineWidth = 11; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -78); ctx.bezierCurveTo(-18, -30, 32, 30, 2, 80); ctx.strokeStyle = 'rgba(255,236,210,0.2)'; ctx.lineWidth = 3.5; ctx.stroke();
    flFill(() => flEll(L[0] * 34, L[1] * 50, 13, 24, 0.3), 'rgba(255,240,220,0.17)');
  },
};
// a citrus slice (o.c the rind, o.key)
FL_ITEMS.citrus = {
  h: 7, path: () => flCirc(0, 0, 100),
  draw(o) {
    const c = o.c ?? FL.citrus, R = RNG('fl-citrus', o.key ?? 'c'), L = flL(), la = Math.atan2(L[1], L[0]);
    flFill(() => flCirc(0, 0, 100), flBody(flDk(c, 0.06), 100, 0.9)); flFill(() => flCirc(0, 0, 91), FL.pith);
    flFill(() => flCirc(0, 0, 84), flBody(flLit(c, 0.16), 84, 0.7));
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = flA(flLit(c, 0.62), 0.6); ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i < 90; i++) { const a = R.r(0, TAU), d = R.r(18, 74), l = R.r(6, 13); ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d); ctx.lineTo(Math.cos(a) * (d + l), Math.sin(a) * (d + l)); }
    ctx.stroke();
    ctx.strokeStyle = FL.pith; ctx.lineWidth = 5; ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.2; ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 85, Math.sin(a) * 85); } ctx.stroke();
    flFill(() => flCirc(0, 0, 8), FL.pith);
    ctx.strokeStyle = 'rgba(255,252,244,0.3)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 62, la - 0.45, la + 0.45); ctx.stroke(); ctx.restore();
    flRing(0, 0, 97, 3, false, 0.7);
  },
};
// a eucalyptus sprig: stem up, round leaves in pairs. o: c, c2, sway (radians: the leaves stir)
function flSprigLeaves(o) {
  const out = [], sw = o.sway ?? 0;
  for (let i = 0; i < 7; i++) {
    const t = i / 6.4, y = 76 - t * 158, r = 31 - t * 15, sx = 5 * Math.sin(t * 2.6);
    for (const sg of [-1, 1]) { const rot = sg * (-0.5 + sw * (1 + 0.3 * i) * (i % 2 ? 1 : -1)); out.push({ x: sx + sg * Math.cos(rot) * r * 0.98, y: y + sg * Math.sin(rot) * r * 0.98 - r * 0.12, rx: r, ry: r * 0.74, rot, ax: sx, ay: y, alt: (i + (sg > 0 ? 1 : 0)) % 2 }); }
  }
  out.push({ x: 5 * Math.sin(2.6) - 1, y: -96, rx: 11, ry: 14, rot: 0, ax: 5 * Math.sin(2.6), ay: -84, alt: 0 });
  return out;
}
FL_ITEMS.sprig = {
  h: 5, path: (o) => { for (const l of flSprigLeaves(o)) flEll(l.x, l.y, l.rx, l.ry, l.rot); ctx.rect(-2, -84, 4, 184); },
  draw(o) {
    const c = o.c ?? FL.leaf, c2 = o.c2 ?? '#95ad9f';
    ctx.lineCap = 'round'; ctx.strokeStyle = '#8a7a5c'; ctx.lineWidth = 3.4; ctx.beginPath(); for (let i = 0; i <= 20; i++) { const t = i / 20, y = 100 - t * 186; ctx[i ? 'lineTo' : 'moveTo'](5 * Math.sin(((76 - y) / 158) * 2.6) * clamp((100 - y) / 30), y); } ctx.stroke();
    for (const l of flSprigLeaves(o)) {
      const col = l.alt ? c2 : c;
      flFill(() => flEll(l.x, l.y, l.rx, l.ry, l.rot), flBody(col, l.rx, 1.5, l.x, l.y));
      flLine(l.ax, l.ay, l.x + (l.x - l.ax) * 0.7, l.y + (l.y - l.ay) * 0.7, 'rgba(240,246,236,0.45)', 1.3);
    }
  },
};
// a monstera leaf: tip down, stalk up
let FL_MON = null;
function flMonsteraPts() {
  if (FL_MON) return FL_MON;
  const P = [];
  for (let i = 0; i < 280; i++) {
    const t = i / 280 * TAU, tt = t > Math.PI ? TAU - t : t, k = (tt - 0.5) / 2.2 * 4, n = k > 0 && k < 4 ? Math.max(0, 1 - Math.abs(mod(k, 1) - 0.5) / 0.16) * 0.6 : 0;
    P.push([16 * Math.sin(t) ** 3 * 6 * (1 - n), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 6 - 12 - n * 10]);
  }
  return (FL_MON = P);
}
FL_ITEMS.monstera = {
  h: 4, path: () => { flPoly(flMonsteraPts()); ctx.rect(-3, -100, 6, 60); },
  draw(o) {
    const c = o.c ?? '#547d5f';
    flLine(0, -100, 0, -40, flDk(c, 0.2), 6); flFill(flMonsteraPts(), flBody(c, 100, 1.4));
    ctx.save(); flPath(flMonsteraPts()); ctx.clip(); ctx.lineCap = 'round';
    flLine(0, -42, 0, 86, 'rgba(226,240,222,0.5)', 2.6);
    for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) { const y = -34 + i * 22; ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(sg * 40, y - 6, sg * 96, y - 30 + i * 12); ctx.strokeStyle = 'rgba(226,240,222,0.3)'; ctx.lineWidth = 1.6; ctx.stroke(); }
    ctx.restore(); flEdge(flMonsteraPts(), 2, 100, 0.6);
  },
};
// a sprig of dried flowers: heads up. o: c, c2, key
function flFlowerBuds(o) {
  const R = RNG('fl-flower', o.key ?? 'f'), out = [];
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.3 + R.n(0.06), l = R.r(62, 96), x = Math.cos(a) * l, y = 10 + Math.sin(a) * l; out.push({ x, y, bx: Math.cos(a) * 20, by: 10 + Math.sin(a) * 20, r: R.r(9, 13), alt: i % 2, a }); }
  return out;
}
FL_ITEMS.flower = {
  h: 4, path: (o) => { for (const b of flFlowerBuds(o)) flCirc(b.x, b.y, b.r + 3); ctx.rect(-2, 0, 4, 100); },
  draw(o) {
    const c = o.c ?? FL.rose, c2 = o.c2 ?? FL.mustard, B = flFlowerBuds(o);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#9a8a62'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, 100); ctx.quadraticCurveTo(3, 50, 0, 10); for (const b of B) { ctx.moveTo(0, 14); ctx.quadraticCurveTo(b.bx, b.by, b.x, b.y); } ctx.stroke();
    for (const b of B) { const col = b.alt ? c2 : c; for (let k = 0; k < 5; k++) { const a = b.a + k / 5 * TAU; flFill(() => flCirc(b.x + Math.cos(a) * b.r * 0.55, b.y + Math.sin(a) * b.r * 0.55, b.r * 0.52), flBody(col, b.r, 1.4, b.x, b.y)); } flFill(() => flCirc(b.x, b.y, b.r * 0.34), flDk(col, 0.3)); }
  },
};
// a sugar crystal
FL_ITEMS.sugar = {
  h: 34, path: () => ctx.roundRect(-100, -100, 200, 200, 22),
  draw(o) {
    const c = o.c ?? '#fbf9f3', P = () => ctx.roundRect(-100, -100, 200, 200, 22);
    flFill(P, flBody(c, 140, 1.5)); flEdge(P, 16, 140, 1.1);
    flFill(() => ctx.roundRect(-52, -52, 104, 104, 12), 'rgba(255,255,255,0.5)');
  },
};

// ---------------------------------------------------------------------
//  THE BUILDER
//   flItem(kind, x, y, s, o)   one object, centred on (x, y), s = half its long side in px (a cup's s is the radius
//        of its bowl; its handle sticks out further). kind: 'tin' | 'box' | 'tube' | 'bottle' | 'cup' | 'bowl' |
//        'plate' | 'spoon' | 'cloth' | 'notebook' | 'glasses' and the props 'bean' | 'citrus' | 'sprig' | 'monstera' |
//        'flower' | 'sugar'. o: rot (keep it 0 or a quarter turn for products), the kind's own options, and the
//        arrival: at, from, spin (flArrive). Its shadow is drawn with it, so it moves with it.
//   flScatter(kind, pts, s, o) props set down one after another: pts = [[x, y, rot?, scale?], ...] or a number with
//        o.box = [x, y, w, h]; o.at, o.step (0.04 s apart), o.key; each drops in with its own spin
//   flHero(x, y, r, o)         the hero: the terracotta tin (sets SPARK_AT)
// ---------------------------------------------------------------------
function flItem(kind, x, y, s, o = {}) {
  const it = FL_ITEMS[kind], a = flArrive(o); if (!it || !a) return false;
  ctx.save(); ctx.globalAlpha *= a.al; ctx.translate(x + a.dx, y + a.dy); ctx.rotate((o.rot ?? 0) + a.rot); ctx.scale(s / 100 * a.sc, s / 100 * a.sc);
  if (o.shadow !== false) flShadow(() => it.path(o), { h: o.h ?? it.h, lift: a.lift + (o.lift ?? 0), liftH: 46 * 100 / s, al: a.al });
  it.draw(o);
  ctx.restore(); return true;
}
function flScatter(kind, pts, s, o = {}) {
  const R = RNG('fl-scatter', o.key ?? kind);
  if (typeof pts === 'number') { const [bx, by, bw, bh] = o.box; pts = Array.from({ length: pts }, () => [bx + R.f() * bw, by + R.f() * bh]); }
  pts.forEach((p, i) => {
    const rot = R.r(0, TAU), k = R.r(0.85, 1.15), sp = R.r(0.6, 1.6) * (R.f() < 0.5 ? -1 : 1);
    flItem(kind, p[0], p[1], s * (p[3] ?? k), { ...o, key: (o.key ?? kind) + i, rot: p[2] ?? rot, at: o.at != null ? o.at + i * (o.step ?? 0.04) : null, from: o.from ?? 'drop', spin: sp });
  });
}
function flHero(x, y, r, o = {}) { SPARK_AT = toScreen(x, y); flItem('tin', x, y, r, { c: FL.terra, label: 'SOL', sub: 'DAILY BALM', mark: 'sun', ...o }); }

// ---------------------------------------------------------------------
//  THE STYLIST'S MARKS (world space, under the camera)
//   flArrow(a, b, o)        a thin curved arrow from a to b that draws itself: o.frac, bend (0.25 of its length), c, w
//   flNote(str, x, y, o)    a hand-lettered label at (x, y) with an arrow to o.to (from o.from, default just under the
//                           words): the arrow draws from o.at, then the words write on. o: size (42), c, align
//   flDot(n, x, y, o)       a numbered dot pinned on an item: o.at (pops in), r (22), c
//   flList(items, x, y, o)  a numbered-dot list, one line written after another: o.size (38), gap, at, step, c
//   flTape(x, y, w, o)      a strip of washi tape: o.c, rot, h (38), in (0..1 pulled across)
//   flCard(x, y, w, h, o)   a paper card lying on the table: o.c, rot, tape (a colour: a strip holds its top edge),
//                           draw() (its contents, in px about the card's centre), and the arrival (at, from, spin)
// ---------------------------------------------------------------------
function flArrow(a, b, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, bend = (o.bend ?? 0.25) * L, m = [(a[0] + b[0]) / 2 - (b[1] - a[1]) / L * bend, (a[1] + b[1]) / 2 + (b[0] - a[0]) / L * bend], pts = [];
  for (let i = 0; i <= 28; i++) { const t = i / 28; pts.push([(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * m[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * m[1] + t * t * b[1]]); }
  const Q = subPath(pts, f), e = Q[Q.length - 1], p = Q[Math.max(0, Q.length - 3)], ang = Math.atan2(e[1] - p[1], e[0] - p[0]), hl = o.head ?? 17;
  ctx.save(); ctx.globalAlpha *= o.al ?? 1; ctx.strokeStyle = o.c ?? FL.ink; ctx.lineWidth = o.w ?? 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]);
  if (f > 0.4) { ctx.moveTo(e[0] - Math.cos(ang - 0.45) * hl, e[1] - Math.sin(ang - 0.45) * hl); ctx.lineTo(e[0], e[1]); ctx.lineTo(e[0] - Math.cos(ang + 0.45) * hl, e[1] - Math.sin(ang + 0.45) * hl); }
  ctx.stroke(); ctx.restore();
}
function flNote(str, x, y, o = {}) {
  const size = o.size ?? 42, at = o.at, fa = at == null ? 1 : seg(TT, at, at + 0.35), ft = at == null ? 1 : seg(TT, at + 0.22, at + 0.62);
  if (at != null && TT < at) return;
  const w = flHand(str, x, y, size, o.c ?? FL.ink, { frac: ft, align: o.align, rot: o.rot });
  if (o.to) flArrow(o.from ?? [x + (o.align === 'center' ? 0 : w / 2), y + size * 0.35], o.to, { frac: fa, bend: o.bend, c: o.c, w: o.w });
}
function flDot(n, x, y, o = {}) {
  const r = o.r ?? 22, k = o.at == null ? 1 : TT < o.at ? 0 : EZ.back(clamp((TT - o.at) / 0.22)); if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  if (o.shadow !== false) flShadow(() => flCirc(0, 0, r), { h: 3 });
  flFill(() => flCirc(0, 0, r), o.c ?? FL.terra); ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, TAU); ctx.strokeStyle = 'rgba(255,252,244,0.9)'; ctx.lineWidth = 2.4; ctx.stroke();
  flType(String(n), 0, r * 0.06, r * 1.12, FL.white, { weight: 700 });
  ctx.restore();
}
function flList(items, x, y, o = {}) {
  const size = o.size ?? 38, gap = o.gap ?? size * 1.5, step = o.step ?? 0.2;
  items.forEach((s, i) => {
    const t = o.at == null ? null : o.at + i * step, yy = y + i * gap;
    flDot(i + 1, x, yy, { r: size * 0.46, at: t, c: o.c, shadow: false });
    flHand(s, x + size * 0.95, yy + size * 0.34, size, o.ink ?? FL.ink, { frac: t == null ? 1 : seg(TT, t + 0.08, t + 0.42) });
  });
}
function flTape(x, y, w, o = {}) {
  const k = clamp(o.in ?? 1); if (k <= 0) return;
  const h = o.h ?? 38, c = o.c ?? FL.mustard, R = RNG('fl-tape', o.key ?? x + ':' + y), ww = w * k, P = [];
  for (let i = 0; i <= 6; i++) P.push([-w / 2 + (i % 2 ? 4 : 0) + R.n(1.5), -h / 2 + i / 6 * h]);
  for (let i = 6; i >= 0; i--) P.push([-w / 2 + ww - (i % 2 ? 4 : 0) + R.n(1.5), -h / 2 + i / 6 * h]);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.03);
  flShadow(P, { h: 1.5, al: 0.7 }); flFill(P, flA(c, 0.84));
  ctx.save(); flPath(P); ctx.clip(); ctx.strokeStyle = 'rgba(255,252,244,0.34)'; ctx.lineWidth = 5; ctx.beginPath(); for (let u = -w; u < w; u += 15) { ctx.moveTo(u, h); ctx.lineTo(u + h * 1.4, -h); } ctx.stroke(); ctx.restore();
  ctx.restore();
}
function flCard(x, y, w, h, o = {}) {
  const a = flArrive(o); if (!a) return false;
  const P = () => ctx.roundRect(-w / 2, -h / 2, w, h, o.r ?? 4), r = Math.hypot(w, h) / 2;
  ctx.save(); ctx.globalAlpha *= a.al; ctx.translate(x + a.dx, y + a.dy); ctx.rotate((o.rot ?? 0) + a.rot); ctx.scale(a.sc, a.sc);
  flShadow(P, { h: 3, lift: a.lift }); flFill(P, flBody(o.c ?? FL.white, r, 0.4)); flEdge(P, 1.5, r, 0.5);
  if (o.draw) o.draw();
  if (o.tape) flTape(o.tapeX ?? 0, -h / 2 + 3, o.tapeW ?? 140, { c: o.tape, rot: o.tapeRot ?? -0.04, in: o.at == null ? 1 : seg(TT, o.at + 0.38, o.at + 0.52), key: 'card' + w });
  ctx.restore(); return true;
}

// ---------------------------------------------------------------------
//  BACKGROUND LIFE (a held frame is never dead)
//   flLeafShadow(o)   the shadow of a plant by the window lying across the table, swaying: o.x, y (where its stem
//                     leaves the frame), s (its length), rot, sway (radians), speed, al, kind ('frond' | 'monstera')
//                     Draw it AFTER the objects: it falls on them too.
//   flWindowLight(o)  a patch of sun through a window: o.x, y, w, h (the patch), cols, rows (panes), skew, al, and it
//                     drifts by o.vx, o.vy px a second. Draw it right after the surface.
//   flSteam(x, y, s, o)  steam curling off a hot drink of radius s: o.n wisps, dir, al, speed
//   (the ripple in a cup is flItem('cup', ..., { ripple: TT }); a lid's glint is { glint }; lenses: { glare })
// ---------------------------------------------------------------------
function flLeafShadow(o = {}) {
  const s = o.s ?? 560, rot = (o.rot ?? 2.5) + (o.sway ?? 0.035) * Math.sin(TT * (o.speed ?? 1.5));
  ctx.save(); ctx.translate(o.x ?? W + 40, o.y ?? 220); ctx.rotate(rot);
  flSoft(() => {
    ctx.beginPath();
    if (o.kind === 'monstera') { ctx.save(); ctx.translate(s * 0.62, 0); ctx.rotate(-Math.PI / 2); ctx.scale(s * 0.0042, s * 0.0042); flPoly(flMonsteraPts()); ctx.rect(-3, -160, 6, 120); ctx.restore(); }
    else for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate((i - 1) * 0.34 + 0.03 * Math.sin(TT * 1.9 + i * 2)); const L = s * (i === 1 ? 1 : 0.78);
      ctx.rect(0, -3, L, 6);
      for (let j = 2; j < 12; j++) for (const sg of [-1, 1]) { const px = j / 12 * L, th = sg * (0.85 + 0.05 * Math.sin(TT * 2.3 + j)), rx = L * 0.13 * (1 - j / 16); flEll(px + Math.cos(th) * rx, Math.sin(th) * rx, rx, L * 0.03, th); }
      ctx.restore();
    }
    ctx.fill();
  }, `rgba(${FL_SHD},${o.al ?? 0.2})`, o.blur ?? 8);
  ctx.restore();
}
function flWindowLight(o = {}) {
  const w = o.w ?? 520, h = o.h ?? 640, cols = o.cols ?? 2, rows = o.rows ?? 2, bar = o.bar ?? 26, sk = o.skew ?? 0.28;
  ctx.save(); ctx.translate((o.x ?? W * 0.4) + (o.vx ?? 12) * TT, (o.y ?? H * 0.5) + (o.vy ?? 5) * TT); ctx.transform(1, 0, sk, 1, 0, 0); ctx.rotate(o.rot ?? 0.2);
  flSoft(() => {
    ctx.beginPath(); const pw = (w - bar * (cols - 1)) / cols, ph = (h - bar * (rows - 1)) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.rect(-w / 2 + i * (pw + bar), -h / 2 + j * (ph + bar), pw, ph);
    ctx.fill();
  }, `rgba(255,244,214,${o.al ?? 0.17})`, o.blur ?? 22);
  ctx.restore();
}
function flSteam(x, y, s, o = {}) {
  const n = o.n ?? 3, al = o.al ?? 0.5, d = o.dir ?? [0.34, -1], dl = Math.hypot(d[0], d[1]) || 1, ux = d[0] / dl, uy = d[1] / dl; if (al <= 0) return;
  for (let i = 0; i < n; i++) {
    const f = mod(TT * (o.speed ?? 0.3) + i / n, 1), x0 = x + (i - (n - 1) / 2) * s * 0.34 + ux * f * s * 0.9, y0 = y + uy * f * s * 0.9, len = s * (0.9 + 0.5 * f);
    flSoft(() => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * (0.1 + 0.1 * f); ctx.beginPath();
      for (let j = 0; j <= 14; j++) { const t = j / 14, off = Math.sin(t * 5 + TT * 2.2 + i * 2.1) * s * 0.16 * t; ctx[j ? 'lineTo' : 'moveTo'](x0 + ux * len * t - uy * off, y0 + uy * len * t + ux * off); }
      ctx.stroke();
    }, `rgba(255,253,248,${al * Math.sin(Math.PI * f) * 0.6})`, s * 0.11);
  }
}

// ---------------------------------------------------------------------
//  TAG AND CAPTION (through DEFER: after the camera, at screen size). Both lift off as a bridge starts and are laid
//  down again once the next table is open.
//   flTag(str, o)      a kraft-paper tag with a punched hole and a loop of string, top left: o.x (64), y (262), size (28), at
//   flCaption(str, o)  a white card held by a strip of washi tape; *word* is hand-lettered in the hero's terracotta.
//                      o: x (CX), y (1400), size (50), tape (a colour), c (the *word*), at (0.5), w (max width 840)
// ---------------------------------------------------------------------
function flBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.18);
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
function flTagNow(str, o = {}) {
  const k = flBridgeK(), a = flArrive({ at: E0 + (o.at ?? 0.25), from: 'drop', spin: -0.25 }); if (k <= 0 || !a) return;
  const size = o.size ?? 28, s = str.toUpperCase(), oo = { weight: 700, track: 0.16 }, h = size * 2.2, w = 46 + flTypeW(s, size, oo) + size * 0.8;
  const P = [[16, 0], [w, 0], [w, h], [16, h], [0, h - 14], [0, 14]];
  ctx.save(); ctx.globalAlpha *= k * a.al; ctx.translate((o.x ?? 64) + w / 2, (o.y ?? 262) + h / 2); ctx.rotate(-0.035 + a.rot); ctx.scale(a.sc, a.sc); ctx.translate(-w / 2, -h / 2);
  ctx.strokeStyle = '#f3ead8'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(24, h / 2); ctx.bezierCurveTo(-10, h / 2 - 26, -44, h / 2 + 10, -90, h / 2 - 12); ctx.stroke();   // the string
  flShadow(P, { h: 3, lift: a.lift }); flFill(P, flBody(o.c ?? FL.kraft, w / 2, 0.6, w / 2, h / 2)); flEdge(P, 1.6, w / 2, 0.6);
  flFill(() => flCirc(24, h / 2, 10), flLit(FL.kraft, 0.45)); flFill(() => flCirc(24, h / 2, 4.6), `rgba(${FL_SHD},0.62)`);
  flType(s, 46, h / 2 + size * 0.04, size, o.ink ?? FL.ink, { ...oo, align: 'left' });
  ctx.restore();
}
function flCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = flBridgeK(), a = flArrive({ at, from: 'drop', spin: -0.05 }); if (k <= 0 || !a) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), cy = o.y ?? 1400, c = o.c ?? FL.terra, maxW = o.w ?? 840;
  let size = o.size ?? 50;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { let tw = 0; toks.forEach((t, i) => { t.o = t.hi ? { font: FL_HAND, weight: 700 } : { weight: 400, track: 0.005 }; t.z = t.hi ? size * 1.12 : size; t.w = flTypeW(t.s, t.z, t.o); t.gap = i === 0 ? 0 : /^[!?.,:;]/.test(t.s) ? 0 : size * 0.3; tw += t.w + t.gap; }); return tw; };
  let tw = lay(); if (tw + size * 2 > maxW) { size *= (maxW - size * 2) / tw; tw = lay(); }
  const w = tw + size * 2, h = size * 2.1, P = () => ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  ctx.save(); ctx.globalAlpha *= k * a.al; ctx.translate(cx, cy); ctx.rotate(-0.012 + a.rot); ctx.scale(a.sc, a.sc);
  flShadow(P, { h: 4, lift: a.lift }); flFill(P, flBody(FL.white, w / 2, 0.35)); flEdge(P, 1.5, w / 2, 0.5);
  const f = seg(TT, at + 0.2, at + 0.6);
  if (f > 0) {
    ctx.save(); if (f < 1) { ctx.beginPath(); ctx.rect(-tw / 2 - 8, -h / 2, (tw + 16) * f, h); ctx.clip(); }
    let xx = -tw / 2; for (const t of toks) { xx += t.gap; flType(t.s, xx, size * 0.36, t.z, t.hi ? c : o.col ?? FL.ink, { ...t.o, align: 'left', base: 'alphabetic' }); xx += t.w; }
    ctx.restore();
  }
  flTape(0, -h / 2 + 2, 150, { c: o.tape ?? FL.sage, rot: -0.045, in: seg(TT, at + 0.3, at + 0.46), key: 'cap' });
  ctx.restore();
}
const flTag = (str, o = {}) => { const f = () => flTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const flCaption = (str, o = {}) => { const f = () => flCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'flat-lay',
  paper: FL.paper,
  // the bare matte sheet in colour c (hex, or rgb() mid-morph) under the same window light
  backdrop(c) { flTable(c); },
  // the era as a printed photograph cut to the bridge shape, lying on the sheet with the same two-part shadow and a
  // white paper edge; it lifts as it gets small
  window(P, key, src, o = {}) {
    const u = o.u ?? 0, k = o.phase === 'grow' ? 1 - u : u;
    ctx.save(); flShadow(P, { h: 5 + 22 * k });
    flPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); flPath(P); ctx.strokeStyle = `rgba(255,252,244,${0.7 * k})`; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: one solid object seen from above in the blended colour, with its shadow, a lit body, a
  // light-catching edge and an inset rim, so it reads as a lid turning into another lid
  blob(P, c, key, u = 0) {
    const ce = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]), r = Math.max(...P.map((p) => Math.hypot(p[0] - ce[0], p[1] - ce[1]))), q = Math.sin(Math.PI * clamp(u));
    const In = (k) => P.map((p) => [ce[0] + (p[0] - ce[0]) * k, ce[1] + (p[1] - ce[1]) * k]);
    flShadow(P, { h: 17 + 16 * q });
    flFill(P, flDk(c, 0.36)); flFill(In(0.972), flBody(c, r, 1, ce[0], ce[1])); flEdge(P, 4, r);
    ctx.save(); ctx.lineJoin = 'round'; flPath(In(0.88)); ctx.lineWidth = 4; ctx.strokeStyle = flLG(r, [[0, 'rgba(255,252,244,0.55)'], [0.5, 'rgba(150,140,130,0)'], [1, `rgba(${FL_SHD},0.3)`]], ce[0], ce[1]); ctx.stroke();
    flPath(In(0.83)); ctx.lineWidth = 2.4; ctx.strokeStyle = flLG(r, [[0, `rgba(${FL_SHD},0.3)`], [0.5, 'rgba(150,140,130,0)'], [1, 'rgba(255,252,244,0.5)']], ce[0], ce[1]); ctx.stroke(); ctx.restore();
  },
  hero(x, y, r, o = {}) { flHero(x, y, r); },
  heroColor: FL.terra,
  heroPts(x, y, r) { return flCirclePts(x, y, r); },
  post() { ctx.save(); screen(); ctx.drawImage(flGrain(), 0, 0); ctx.restore(); },
  ones: true,
};
