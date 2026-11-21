// =====================================================================
//  styles/impasto/kit.js — a thick oil painting (post-impressionist impasto), on top of kit/core.js.
//
//  The whole picture is built from short, loaded, opaque brush marks that follow a flow field: skies turn in
//  eddies, fields run in ridged rows. One mark (impMarkDraw) is a body of paint, four to six bristle tracks in
//  slightly different hues (two tube colours dragged together), ragged ends where the bristles lift, a thin lit
//  ridge on the edge that faces the single raking light (top left) and a thin cast shadow on the other edge.
//  Flat things (walls, a moon, caption plaques) are palette-knife slabs (impKnife): one flat drag of paint with
//  streaks along the drag, a raised lip and a broken trailing edge. There are no outlines: an edge is where the
//  direction and the colour of the marks change. Under everything lies a toned canvas whose weave shows in the
//  gaps and round the edge of the picture.
//
//  How it is drawn: impFill(P, pal, o) turns any closed outline into flow-following marks picked from a weighted
//  palette. A region's marks are a fixed, seeded, ordered list; a region that does not change is painted once
//  into its own cached layer and only the newly laid marks are added on later frames (o.frac). A region whose
//  flow drifts (o.live) is repainted on every motion step: its marks ride along the flow, so a sky churns.
//  STYLE.post presses one relief pass over the finished frame (a signed emboss built from canvas compositing),
//  which lifts every bristle track the same way, towards the same light.
//  Time: on 2s. Things arrive by being painted (frac), newest marks wet and brighter; nothing fades.
// =====================================================================
const IMP = {
  ground: '#a8824e',     // the toned canvas (a raw-sienna imprimatura): gaps between marks, the picture's edge
  groundD: '#8a683a', groundL: '#c4a271',
  ink: '#0d1238',        // the darkest paint allowed (a blue-black): shadows of ridges, caption letters
  prussian: '#152052', ultra: '#1f2f9a', cobalt: '#2c5fc6', cerulean: '#4a98d8', sky: '#8fc6e8', turq: '#35a9a2',
  violet: '#5b3f9e', lilac: '#9c88d2',
  chrome: '#f6c015', lemon: '#f8e365', orange: '#ee7c17', verm: '#d53c1e',
  viridian: '#176f5a', emerald: '#3c9b49', sap: '#86a82d', olive: '#5b6923',
  ochre: '#c98d2b', sienna: '#8f4b21', umber: '#3b2719',
  white: '#f7f1dc',      // lead white, a little warm
  light: [-0.55, -0.835], // the direction towards the one raking light (top left)
  pic: { x0: 24, y0: 24, x1: 1056, y1: 1896 },   // the painted picture on the canvas; bare weave shows outside it
  w: 26,                 // default brush width
};
IMP.pic = { x0: 24, y0: 24, x1: W - 24, y1: H - 24 };
const IMP_FONT = '"Marker Felt", "Segoe Print", "Comic Sans MS", "Chalkboard SE", "Bradley Hand", "DejaVu Sans", "Liberation Sans", Arial, sans-serif';

// ---------------------------------------------------------------------
//  colour: tube colours are 6-digit hex; mixes are rgb() strings (the renderer also hands rgb() to blob / backdrop)
// ---------------------------------------------------------------------
const IMP_RGB = new Map(), IMP_SET = new Map(), IMP_TQ = new Map();
function impRGB(c) {
  let v = IMP_RGB.get(c);
  if (!v) { v = c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number); if (IMP_RGB.size > 8000) IMP_RGB.clear(); IMP_RGB.set(c, v); }
  return v;
}
function impMix(a, b, u) { const x = impRGB(a), y = impRGB(b); return `rgb(${Math.round(x[0] + (y[0] - x[0]) * u)},${Math.round(x[1] + (y[1] - x[1]) * u)},${Math.round(x[2] + (y[2] - x[2]) * u)})`; }
// lighter (k > 0: towards a warm white) or darker (k < 0: towards the blue-black, so darks stay rich)
const impTone = (c, k) => (k >= 0 ? impMix(c, '#fff6d6', k) : impMix(c, IMP.ink, -k));
function impToneQ(c, q) { const k = c + '|' + q; let v = IMP_TQ.get(k); if (!v) { if (IMP_TQ.size > 8000) IMP_TQ.clear(); v = impTone(c, q * 0.34); IMP_TQ.set(k, v); } return v; }
// everything one mark needs from its two colours
function impSet(c0, c1) {
  const k = c0 + '|' + c1; let s = IMP_SET.get(k);
  if (!s) { if (IMP_SET.size > 8000) IMP_SET.clear(); s = { b: c0, l: impTone(c0, 0.17), d: impTone(c0, -0.2), m: impMix(c0, c1, 0.62), c1, hi: impMix(c0, '#fffae6', 0.6), sh: impMix(c0, IMP.ink, 0.7), wet: impMix(c0, '#fff8e0', 0.28) }; IMP_SET.set(k, s); }
  return s;
}
// a weighted palette: [[colour, weight], ...]; a single colour becomes itself with a lighter, a darker and a warm touch
const IMP_PALW = new WeakMap(), IMP_PALS = new Map(); let IMP_PALN = 0;
function impPal(pal) {
  if (typeof pal === 'string') { let p = IMP_PALS.get(pal); if (!p) { if (IMP_PALS.size > 400) IMP_PALS.clear(); p = [[pal, 5], [impTone(pal, 0.2), 2], [impTone(pal, -0.22), 2], [impMix(pal, IMP.orange, 0.25), 1]]; IMP_PALS.set(pal, p); } pal = p; }
  let e = IMP_PALW.get(pal);
  if (!e) { let t = 0; const cum = pal.map(([, w]) => (t += w)); e = { id: ++IMP_PALN + ':' + pal.map((p) => p[0] + p[1]).join(','), cols: pal.map((p) => p[0]), cum, total: t }; IMP_PALW.set(pal, e); }
  return e;
}
// smooth value noise 0..1 (patches of one tube colour: neighbouring marks come off the same loaded brush)
function impNoise(x, y, sc = 100, seed = 0) {
  const u = x / sc, v = y / sc, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
  const h = (a, b) => { let n = Math.imul((a * 374761393 + b * 668265263 + seed * 362437) | 0, 1274126177); n ^= n >>> 15; n = Math.imul(n, 2246822519); n ^= n >>> 13; return (n >>> 0) / 4294967296; };
  return lerp(lerp(h(i, j), h(i + 1, j), su), lerp(h(i, j + 1), h(i + 1, j + 1), su), sv);
}
function impPick(p, u) { const x = u * p.total; for (let i = 0; i < p.cum.length; i++) if (x < p.cum[i]) return p.cols[i]; return p.cols[p.cols.length - 1]; }

// ---------------------------------------------------------------------
//  small helpers: time, memo, scratch canvases, geometry
// ---------------------------------------------------------------------
const impIn = (t0, d = 0.5) => clamp((TT - t0) / d);                                    // 0..1 from t0 over d: pass as frac
const impStep = (every = 0.5, phase = 0) => Math.floor(TT / every + phase + 1e-6);      // a counter for beat-stepped life
const IMP_MEMO = new Map(), IMP_CV = {};
function impMemo(key, make) { if (!IMP_MEMO.has(key)) { if (IMP_MEMO.size > 500) IMP_MEMO.clear(); IMP_MEMO.set(key, make()); } return IMP_MEMO.get(key); }
function impCanvas(key, w = W, h = H) { let c = IMP_CV[key]; if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; IMP_CV[key] = c; } return c; }
function impHash(P) { let h = 2166136261 >>> 0; for (const p of P) { h ^= Math.round(p[0] * 4) | 0; h = Math.imul(h, 16777619); h ^= Math.round(p[1] * 4) | 0; h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + P.length; }
function impInside(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const impCen = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const impDiscPts = (x, y, r, n = 64) => ellipsePts(x, y, r, r, 0, n);
const impRectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// a sun: a disc whose rim swells into soft flames (n lobes), close enough to a disc to morph from one cleanly
function impSunPts(x, y, r, n = 12, amp = 0.07, rot = 0, m = 96) { const P = []; for (let i = 0; i < m; i++) { const a = i / m * TAU; const k = 1 + amp * Math.cos(n * (a - rot)); P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); } return P; }
function impPath(g, P) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }

// ---------------------------------------------------------------------
//  flow fields: (x, y) -> the angle a brush mark takes there
//    impFlowSwirl(base, [{ x, y, r, s, pull }])  base = an angle or (x, y) -> angle; each eddy turns the marks round
//                                                its centre (s: +1 / -1 the turning sense and strength, r its reach,
//                                                pull: how much the marks spiral inwards)
//    impFlowRing(cx, cy, spiral)   concentric;   impFlowRadial(cx, cy, wave)   rays / furrows from a vanishing point
//    impFlowAlong(fn, wave)        along a ridge y = fn(x)
// ---------------------------------------------------------------------
function impFlowSwirl(base = 0, eddies = []) {
  const bf = typeof base === 'function' ? base : () => base;
  return (x, y) => {
    const a = bf(x, y); let vx = Math.cos(a), vy = Math.sin(a);
    for (const e of eddies) {
      const dx = x - e.x, dy = y - e.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1, g = (e.k ?? 3.2) * Math.exp(-d2 / (e.r * e.r)), s = e.s ?? 1, pull = e.pull ?? 0.22;
      vx += g * (-dy / d * s - dx / d * pull); vy += g * (dx / d * s - dy / d * pull);
    }
    return Math.atan2(vy, vx);
  };
}
const impFlowRing = (cx, cy, spiral = 0) => (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2 + spiral;
const impFlowRadial = (cx, cy, wave = 0, wl = 70) => (x, y) => Math.atan2(y - cy, x - cx) + (wave ? wave * Math.sin((x + y * 0.6) / wl) : 0);
const impFlowAlong = (fn, wave = 0, wl = 80) => (x, y) => Math.atan2(fn(x + 6) - fn(x - 6), 12) + (wave ? wave * Math.sin(x / wl + y / 47) : 0);
const IMP_FLOW0 = (x, y) => -0.12 + 0.2 * Math.sin(x / 190 + y / 260);

// ---------------------------------------------------------------------
//  THE MARK — one loaded brush stroke through four points X = [x0, y0, ... x3, y3] (Float64Array or array)
//    w width, c0 / c1 the two colours dragged together, sd an integer seed, wet 0..1 (just laid: brighter, glossy)
// ---------------------------------------------------------------------
const IMP_N = new Float64Array(8), IMP_X = new Float64Array(8);
function impLine(g, X, off, s0, s1) {
  const N = IMP_N;
  let x0 = X[0] + N[0] * off, y0 = X[1] + N[1] * off, x3 = X[6] + N[6] * off, y3 = X[7] + N[7] * off;
  const x1 = X[2] + N[2] * off, y1 = X[3] + N[3] * off, x2 = X[4] + N[4] * off, y2 = X[5] + N[5] * off;
  if (s0) { x0 += (x1 - x0) * s0; y0 += (y1 - y0) * s0; }
  if (s1) { x3 += (x2 - x3) * s1; y3 += (y2 - y3) * s1; }
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2); g.quadraticCurveTo(x2, y2, x3, y3); g.stroke();
}
function impMarkDraw(g, X, w, c0, c1, sd, wet = 0) {
  const N = IMP_N;
  for (let i = 0; i < 4; i++) { const a = i === 0 ? 0 : i - 1, b = i === 3 ? 3 : i + 1, tx = X[b * 2] - X[a * 2], ty = X[b * 2 + 1] - X[a * 2 + 1], l = Math.hypot(tx, ty) || 1; N[i * 2] = -ty / l; N[i * 2 + 1] = tx / l; }
  const S = impSet(c0, c1); let s = (sd >>> 0) || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const h = w / 2, k0 = h * (0.74 + 0.22 * rnd()), k1 = h * (0.96 + 0.1 * rnd()), k2 = h * (0.86 + 0.14 * rnd()), k3 = h * (0.34 + 0.36 * rnd());
  // the body of paint: it lands fat and round, thins as the brush empties, and lifts
  const ax = X[0] + N[0] * k0, ay = X[1] + N[1] * k0, bx = X[2] + N[2] * k1, by = X[3] + N[3] * k1, cx = X[4] + N[4] * k2, cy = X[5] + N[5] * k2, dx = X[6] + N[6] * k3, dy = X[7] + N[7] * k3;
  const ex = X[6] - N[6] * k3, ey = X[7] - N[7] * k3, fx = X[4] - N[4] * k2, fy = X[5] - N[5] * k2, gx = X[2] - N[2] * k1, gy = X[3] - N[3] * k1, hx = X[0] - N[0] * k0, hy = X[1] - N[1] * k0;
  const tx = N[7] * k3 * 0.9, ty = -N[6] * k3 * 0.9, sx = -N[1] * k0 * 1.1, sy = N[0] * k0 * 1.1;   // the tip beyond the end, the heel behind the start
  g.globalAlpha = 1; g.fillStyle = wet > 0.01 ? impMix(S.b, '#fff8e0', 0.3 * wet) : S.b;
  g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(bx, by, (bx + cx) / 2, (by + cy) / 2); g.quadraticCurveTo(cx, cy, dx, dy);
  g.quadraticCurveTo(X[6] + tx * 1.1, X[7] + ty * 1.1, ex, ey); g.quadraticCurveTo(fx, fy, (fx + gx) / 2, (fy + gy) / 2); g.quadraticCurveTo(gx, gy, hx, hy);
  g.quadraticCurveTo(X[0] + sx * 1.7, X[1] + sy * 1.7, ax, ay); g.fill();
  g.lineCap = 'butt'; g.lineJoin = 'round';
  // two or three soft bands: the other colour on the brush, dragged along with it
  g.lineWidth = w * 0.3;
  for (let k = 0; k < 3; k++) {
    const r = rnd(), off = (rnd() - 0.5) * w * 0.5, s0 = 0.06 + rnd() * 0.3, s1 = 0.1 + rnd() * 0.4, al = 0.5 + rnd() * 0.45;
    if (r > 0.86) continue;
    g.strokeStyle = r < 0.42 ? S.m : r < 0.62 ? S.l : r < 0.8 ? S.d : S.c1; g.globalAlpha = al; impLine(g, X, off, s0, s1);
  }
  // bristle tracks: hairlines of lighter and darker paint, each lifting at its own point (a ragged, dry end)
  const nh = w > 34 ? 8 : w > 22 ? 7 : w > 13 ? 5 : 3;
  for (let k = 0; k < nh; k++) {
    const r = rnd(), off = ((k + rnd()) / nh - 0.5) * w * 0.86, s0 = rnd() * 0.3, s1 = rnd() * 0.55 - 0.22;
    g.strokeStyle = r < 0.45 ? S.hi : r < 0.85 ? S.sh : S.c1; g.globalAlpha = 0.22 + rnd() * 0.36; g.lineWidth = 1 + rnd() * Math.min(2.4, w * 0.07);
    impLine(g, X, off, s0, s1);
  }
  // the ridge: a lit edge towards the light, a cast shadow away from it (broken, never the full length)
  const lx = IMP.light[0], ly = IMP.light[1];
  const lit = (N[2] + N[4]) * lx * 0.5 + (N[3] + N[5]) * ly * 0.5, sg = lit >= 0 ? 1 : -1, a = Math.min(1, Math.abs(lit) * 1.25);
  if (a > 0.06) {
    g.globalAlpha = 0.14 + 0.42 * a; g.strokeStyle = S.sh; g.lineWidth = Math.max(1.8, w * 0.1); impLine(g, X, -sg * (h * 0.94), 0.05 + rnd() * 0.2, 0.2 + rnd() * 0.2);
    g.globalAlpha = Math.min(1, 0.2 + 0.55 * a + 0.2 * wet); g.strokeStyle = S.hi; g.lineWidth = Math.max(1.4, w * 0.075); impLine(g, X, sg * (h * 0.8), 0.08 + rnd() * 0.25, 0.22 + rnd() * 0.25);
  }
  // the lips: paint piles up in a crescent where the brush lands and where it lifts
  const el = (-N[7] * lx + N[6] * ly) * 1, sl = -(-N[1] * lx + N[0] * ly);   // how much the tip / the heel faces the light
  if (Math.abs(el) > 0.15) { g.globalAlpha = 0.1 + 0.34 * Math.abs(el); g.strokeStyle = el > 0 ? S.hi : S.sh; g.lineWidth = Math.max(1.4, w * 0.08); g.beginPath(); g.moveTo(dx - tx * 0.3, dy - ty * 0.3); g.quadraticCurveTo(X[6] + tx * 0.9, X[7] + ty * 0.9, ex - tx * 0.3, ey - ty * 0.3); g.stroke(); }
  if (Math.abs(sl) > 0.15) { g.globalAlpha = 0.14 + 0.4 * Math.abs(sl); g.strokeStyle = sl > 0 ? S.hi : S.sh; g.lineWidth = Math.max(1.6, w * 0.09); g.beginPath(); g.moveTo(ax - sx * 0.3, ay - sy * 0.3); g.quadraticCurveTo(X[0] + sx * 1.35, X[1] + sy * 1.35, hx - sx * 0.3, hy - sy * 0.3); g.stroke(); }
  if (wet > 0.01) { g.globalAlpha = 0.6 * wet; g.strokeStyle = '#fffdf0'; g.lineWidth = Math.max(1.5, w * 0.08); impLine(g, X, sg * w * 0.18, 0.2, 0.3); }   // wet gloss
  g.globalAlpha = 1;
}
// four points of a mark of length len centred on (x, y), following the flow
function impTrace(flow, x, y, len, X = IMP_X) {
  const h = len / 3, a = flow(x, y), ca = Math.cos(a), sa = Math.sin(a);
  X[2] = x - ca * h / 2; X[3] = y - sa * h / 2; X[4] = x + ca * h / 2; X[5] = y + sa * h / 2;
  let b = flow(X[2], X[3]); if (Math.cos(b - a) < 0) b += Math.PI; X[0] = X[2] - Math.cos(b) * h; X[1] = X[3] - Math.sin(b) * h;
  b = flow(X[4], X[5]); if (Math.cos(b - a) < 0) b += Math.PI; X[6] = X[4] + Math.cos(b) * h; X[7] = X[5] + Math.sin(b) * h;
  return X;
}
// a straight mark at angle a, bent a little
function impStraight(x, y, a, len, bend = 0, X = IMP_X) {
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let i = 0; i < 4; i++) { const u = (i - 1.5) / 3, o = bend * (1 - (u * 2) ** 2); X[i * 2] = x + ca * len * u - sa * o; X[i * 2 + 1] = y + sa * len * u + ca * o; }
  return X;
}
// the stroke primitive for a piece: ONE loaded mark along a polyline P (2+ points) in colour c
//   o: w, c2 (the colour dragged in), key, wet (0..1), frac (0..1: how far the brush has travelled)
function impStroke(P, c, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const Q = frac < 1 ? subPath(P, frac) : P, X = IMP_X;
  for (let i = 0; i < 4; i++) { const p = pointAt(Q, i / 3); X[i * 2] = p[0]; X[i * 2 + 1] = p[1]; }
  impMarkDraw(ctx, X, o.w ?? IMP.w, c, o.c2 ?? c, hash('impstroke', o.key ?? 's'), o.wet ?? (frac < 1 ? 1 : 0));
}
// a blob: one round, heavy touch of the loaded brush (a star's core, a seed, a berry, a lamp)
function impBlob(x, y, r, c, o = {}) {
  const R = RNG('impblob', o.key ?? 'b'), S = impSet(c, o.c2 ?? c), la = Math.atan2(IMP.light[1], IMP.light[0]), rot = R.r(0, TAU), g = ctx;
  g.save(); g.fillStyle = S.b; g.beginPath(); g.ellipse(x, y, r, r * R.r(0.86, 0.98), rot, 0, TAU); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const a0 = R.r(0, TAU); g.strokeStyle = i ? S.m : S.sh; g.globalAlpha = R.r(0.3, 0.6); g.lineWidth = Math.max(1.2, r * R.r(0.08, 0.2)); g.beginPath(); g.arc(x, y, r * R.r(0.25, 0.7), a0, a0 + R.r(1.2, 3.2)); g.stroke(); }   // the brush was turned
  g.globalAlpha = 0.5; g.strokeStyle = S.sh; g.lineWidth = Math.max(1.6, r * 0.16); g.beginPath(); g.arc(x, y, r * 0.98, la + Math.PI - 1.15, la + Math.PI + 1.15); g.stroke();
  g.globalAlpha = 0.9; g.strokeStyle = S.hi; g.lineWidth = Math.max(1.4, r * 0.14); g.beginPath(); g.arc(x, y, r * 0.8, la - 0.95, la + 0.95); g.stroke();
  g.restore();
}
// a single dab: a short fat mark at angle a
function impDab(x, y, c, o = {}) { impMarkDraw(ctx, impStraight(x, y, o.a ?? -0.5, o.len ?? (o.w ?? IMP.w) * 1.5, o.bend ?? 0), o.w ?? IMP.w, c, o.c2 ?? c, hash('impdab', o.key ?? 'd'), o.wet ?? 0); }

// ---------------------------------------------------------------------
//  impFill — any closed outline, filled with flow-following marks from a weighted palette
//    P      closed outline (world coords). It may run far outside the frame: only what is inside IMP.pic is painted.
//    pal    [[colour, weight], ...] (or one colour)
//    o.key    a stable name (one cached layer per key)                 o.flow   (x, y) -> angle (default: a slow wave)
//    o.w      brush width (26)        o.len  mark length (w * 3.4)     o.gap    spacing factor (1; smaller = denser)
//    o.frac   0..1 how much has been laid (use impIn); marks are laid block-in first, then thick paint in bands
//             along the flow, then the marks that follow the outline
//    o.order  (x, y) -> number: the laying order of the thick paint (default: bands from the top, alternating)
//    o.under  false = no block-in pass (the thin dark scrub that covers the canvas first)
//    o.edge   false = no row of marks along the outline (use it for a region that runs off the picture)
//    o.hole   an outline (or a list) left unpainted inside P
//    o.pal2 + o.mix(x, y) -> 0..1   a second palette and where it takes over (a glow, a horizon, a cloud)
//    o.tone(x, y) -> -1..1          darker / lighter by place (modelling)
//    o.live   true = repaint on every motion step (the flow or the colours change); with o.drift (px) the marks
//             ride along the flow in a cycle (o.rate cycles per second), so the region churns
//    o.wet    how many of the newest marks are still wet (10)          o.sig    extra cache signature
//  Returns the region's entry { seeds, n } (pass it to impWet for a gust of re-laid marks).
// ---------------------------------------------------------------------
const IMP_FILLS = new Map();
function impSeeds(P, w, len, o) {
  const key = o.key ?? 'fill', R = RNG('impseed', key), ns = hash('impns', key) % 9973, pc = IMP.pic, holes = o.hole ? (typeof o.hole[0][0] === 'number' ? [o.hole] : o.hole) : [];
  const bb = bbox(P), x0 = Math.max(bb.x0, pc.x0), x1 = Math.min(bb.x1, pc.x1), y0 = Math.max(bb.y0, pc.y0), y1 = Math.min(bb.y1, pc.y1), out = [];
  const ok = (x, y) => impInside(P, x, y) && !holes.some((h) => impInside(h, x, y));
  const band = len * 1.25, ord = o.order || ((x, y) => { const b = Math.floor((y - y0) / band); return b * 4000 + (b % 2 ? x1 - x : x - x0); });
  const grid = (d, pass) => {
    let row = 0;
    for (let y = y0 + d * 0.3; y < y1; y += d * 0.87, row++) for (let x = x0 + (row % 2 ? d * 0.5 : 0) + d * 0.2; x < x1; x += d) {
      const px = x + R.n(d * 0.36), py = y + R.n(d * 0.36), u1 = R.f(), u2 = R.f(), u3 = R.f(), kl = R.r(0.78, 1.22), kw = R.r(0.82, 1.18), ph = R.f(), sd = R.i(1, 2147483646);
      if (px < pc.x0 + 4 || px > pc.x1 - 4 || py < pc.y0 + 4 || py > pc.y1 - 4 || !ok(px, py)) continue;
      out.push({ x: px, y: py, u1: mod(u1 * 0.5 + impNoise(px, py, o.patch ?? 120, ns) * 1.6, 1), u2, u3, kl, kw, ph, sd, pass, ord: pass * 1e9 + ord(px, py) });
    }
  };
  const d = Math.sqrt(w * len * 0.3) * (o.gap ?? 1);
  if (o.under !== false) grid(d * 2.1, 0);
  grid(d, 1);
  if (o.edge !== false) {
    const Q = resample(P, true, len * 0.5), n = Q.length;
    for (let i = 0; i < n; i++) {
      const p = Q[i], a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), io = R.r(0.34, 0.74);
      let nx = -Math.sin(ang) * w * io, ny = Math.cos(ang) * w * io; if (!impInside(P, p[0] + nx, p[1] + ny)) { nx = -nx; ny = -ny; }
      const px = p[0] + nx, py = p[1] + ny, u1 = R.f(), u2 = R.f(), u3 = R.f(), kl = R.r(0.85, 1.15), kw = R.r(0.85, 1.1), ph = R.f(), sd = R.i(1, 2147483646), bend = R.n(w * 0.12);
      if (px < pc.x0 + 4 || px > pc.x1 - 4 || py < pc.y0 + 4 || py > pc.y1 - 4) continue;
      out.push({ x: px, y: py, u1, u2, u3, kl, kw, ph, sd, pass: 2, fix: ang + R.n(0.13), bend, ord: 2e9 + i });
    }
  }
  out.sort((p, q) => p.ord - q.ord);
  return out;
}
function impFill(P, pal, o = {}) {
  const w = o.w ?? IMP.w, len = o.len ?? w * 3.4, key = o.key ?? 'fill', flow = o.flow || IMP_FLOW0;
  const sig0 = [impHash(P), w, len, o.gap ?? 1, o.patch ?? 120, o.edge === false ? 0 : 1, o.under === false ? 0 : 1, o.hole ? impHash(typeof o.hole[0][0] === 'number' ? o.hole : o.hole.flat()) : ''].join('|');
  let e = IMP_FILLS.get(key);
  if (!e || e.sig0 !== sig0) {
    const pc = IMP.pic, bb = bbox(P), pad = Math.ceil(len * 0.9 + w);
    const ox = Math.floor(Math.max(bb.x0, pc.x0) - pad), oy = Math.floor(Math.max(bb.y0, pc.y0) - pad), cw = Math.ceil(Math.min(bb.x1, pc.x1) + pad) - ox, ch = Math.ceil(Math.min(bb.y1, pc.y1) + pad) - oy;
    e = { sig0, seeds: impSeeds(P, w, len, o), ox, oy, cw: Math.max(2, cw), ch: Math.max(2, ch), n: 0, sig: '', cv: e ? e.cv : null };
    IMP_FILLS.set(key, e);
  }
  const N = e.seeds.length, n = Math.round(clamp(o.frac ?? 1) * N);
  e.want = n; e.o = o; e.pal = pal;
  if (n <= 0) return e;
  const p1 = impPal(pal), p2 = o.pal2 ? impPal(o.pal2) : null;
  const sig = p1.id + (p2 ? '/' + p2.id : '') + '|' + (o.live ? 'T' + TT.toFixed(4) : 'S') + '|' + (o.sig ?? '');
  if (!e.cv || e.cv.width !== e.cw || e.cv.height !== e.ch) { e.cv = document.createElement('canvas'); e.cv.width = e.cw; e.cv.height = e.ch; e.n = 0; e.sig = ''; }
  const g = e.cv.getContext('2d');
  if (e.sig !== sig || n < e.n) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.cw, e.ch); e.n = 0; e.sig = sig; }
  if (n > e.n) {
    g.setTransform(1, 0, 0, 1, -e.ox, -e.oy);
    for (let i = e.n; i < n; i++) impSeedDraw(g, e.seeds[i], w, len, flow, p1, p2, o, 0);
    e.n = n;
  }
  ctx.drawImage(e.cv, e.ox, e.oy);
  if (n < N && o.wet !== 0) { const m = o.wet ?? 10; for (let i = Math.max(0, n - m); i < n; i++) impSeedDraw(ctx, e.seeds[i], w, len, flow, p1, p2, o, (i - (n - m) + 1) / m); }
  return e;
}
function impSeedDraw(g, m, w, len, flow, p1, p2, o, wet) {
  let x = m.x, y = m.y;
  if (o.live && o.drift && m.pass === 1) {   // ride along the flow: a cycle of o.drift px, each mark on its own phase
    let D = o.drift * (mod(TT * (o.rate ?? 0.5) + m.ph, 1) - 0.5); const st = D < 0 ? -12 : 12;
    for (let k = Math.ceil(Math.abs(D) / 12); k > 0; k--, D -= st) { const a = flow(x, y), q = Math.abs(D) < 12 ? D : st; x += Math.cos(a) * q; y += Math.sin(a) * q; }
  }
  const pp = p2 && o.mix && m.u3 < o.mix(x, y) ? p2 : p1;
  let c0 = impPick(pp, m.u1), c1 = impPick(pp, m.u2), ww = w * m.kw, ll = len * m.kl;
  if (m.pass === 0) { c0 = impToneQ(c0, -1); c1 = c0; ww *= 1.9; ll *= 1.35; }     // the block-in: big, dark, thin
  if (o.tone) { const q = Math.round(clamp(o.tone(x, y), -1, 1) * 4) / 4; if (q) { c0 = impToneQ(c0, q); c1 = impToneQ(c1, q); } }
  const X = m.fix != null ? impStraight(x, y, m.fix, ll, m.bend) : impTrace(flow, x, y, ll);
  impMarkDraw(g, X, ww, c0, c1, m.sd, wet);
}
// re-lay some of a painted region's marks wet (a gust over a field, light catching a wave): sel(x, y, mark) -> 0..1
function impWet(e, sel) {
  if (!e || !e.o) return; const o = e.o, w = o.w ?? IMP.w, len = o.len ?? w * 3.4, flow = o.flow || IMP_FLOW0, p1 = impPal(e.pal), p2 = o.pal2 ? impPal(o.pal2) : null;
  for (let i = 0; i < e.want; i++) { const m = e.seeds[i]; if (m.pass !== 1) continue; const k = sel(m.x, m.y, m); if (k > 0.02) impSeedDraw(ctx, m, w, len, flow, p1, p2, o, Math.min(1, k)); }
}

// ---------------------------------------------------------------------
//  marks placed by hand: rings (halos, a sun), rays (petals), rows along a line (a rim, a stem, a ridge)
//    all take: w, len, frac (laid one after another), key, wet (how many newest marks are wet), pal2 + mix
// ---------------------------------------------------------------------
// concentric rings of marks between r0 and r1. o: rot (turn; odd rings turn the other way with o.counter), spiral
function impRing(cx, cy, r0, r1, pal, o = {}) {
  const w = o.w ?? 20, len = o.len ?? w * 3, key = o.key ?? 'ring', p1 = impPal(pal), p2 = o.pal2 ? impPal(o.pal2) : null, X = IMP_X;
  const rings = Math.max(1, Math.round((r1 - r0) / (w * 0.74))), list = [];
  for (let j = 0; j < rings; j++) {
    const r = r0 + (j + 0.5) * (r1 - r0) / rings, n = Math.max(4, Math.round(TAU * r / (len * 0.66)));
    for (let i = 0; i < n; i++) list.push([j, i, n, r]);
  }
  const total = list.length, cnt = Math.round(clamp(o.frac ?? 1) * total), wetN = o.wet ?? 6;
  for (let q = 0; q < cnt; q++) {
    const [j, i, n, r] = list[q], R = RNG('impring', key, j, i), u = (j + 0.5) / rings;
    const a0 = (i + R.n(0.22)) / n * TAU + j * 0.9 + (o.rot ?? 0) * (o.counter && j % 2 ? -1 : 1), da = len * R.r(0.85, 1.15) / r / 3, sp = (o.spiral ?? 0) * w;
    for (let k = 0; k < 4; k++) { const a = a0 + (k - 1.5) * da, rr = r + (k - 1.5) * sp + R.n(w * 0.06); X[k * 2] = cx + Math.cos(a) * rr; X[k * 2 + 1] = cy + Math.sin(a) * rr; }
    const pp = p2 && R.f() < (o.mix ? o.mix(u) : u) ? p2 : p1;
    impMarkDraw(ctx, X, w * R.r(0.85, 1.15), impPick(pp, R.f()), impPick(pp, R.f()), R.i(1, 2147483646), cnt < total && q >= cnt - wetN ? (q - (cnt - wetN) + 1) / wetN : 0);
  }
}
// radial marks from r0 to r1 (sun rays, petals). o: n, rot, bend, sx (squash the whole fan in x)
function impRays(cx, cy, r0, r1, pal, o = {}) {
  const n = o.n ?? 14, w = o.w ?? 20, key = o.key ?? 'rays', p = impPal(pal), X = IMP_X, cnt = Math.round(clamp(o.frac ?? 1) * n), sx = o.sx ?? 1;
  for (let i = 0; i < cnt; i++) {
    const R = RNG('imprays', key, i), a = i / n * TAU + (o.rot ?? 0) + R.n(0.07), ra = r0 * R.r(0.9, 1.1), rb = r1 * R.r(0.86, 1.1), bend = (o.bend ?? 0.12) * R.n(1);
    for (let k = 0; k < 4; k++) { const u = k / 3, r = lerp(ra, rb, u), aa = a + bend * u * u; X[k * 2] = cx + Math.cos(aa) * r * sx; X[k * 2 + 1] = cy + Math.sin(aa) * r; }
    impMarkDraw(ctx, X, w * R.r(0.88, 1.12), impPick(p, R.f()), impPick(p, R.f()), R.i(1, 2147483646), cnt < n && i >= cnt - 2 ? 1 : 0);
  }
}
// a row of marks along a polyline (a rim, a stem, a branch). o: closed, inset (px towards the left of travel), rows, rot (0..1 slides the marks along), cull
function impAlong(P, pal, o = {}) {
  const w = o.w ?? 22, len = o.len ?? w * 3, key = o.key ?? 'along', closed = !!o.closed, p = impPal(pal), X = IMP_X;
  const PP = closed ? [...P, P[0]] : P, L = pathLen(PP); if (L < 4) return;
  const n = Math.max(closed ? 3 : 1, Math.round(L / (len * (o.step ?? 0.62)))), cnt = Math.round(clamp(o.frac ?? 1) * n), rot = o.rot ?? 0, wetN = o.wet ?? 3;
  for (let i = 0; i < cnt; i++) {
    const R = RNG('impalong', key, i), f = closed ? mod((i + rot) / n, 1) : (i + 0.5) / n, hl = len * R.r(0.85, 1.15) / L / 2;
    const off = (o.inset ?? 0) + R.n(w * 0.1); let vis = !o.cull;
    for (let k = 0; k < 4; k++) {
      let ff = f + (k - 1.5) / 1.5 * hl; ff = closed ? mod(ff, 1) : clamp(ff, 0, 1);
      const q = pointAt(PP, ff), q2 = pointAt(PP, closed ? mod(ff + 0.004, 1) : Math.min(1, ff + 0.004)), q1 = pointAt(PP, closed ? mod(ff - 0.004, 1) : Math.max(0, ff - 0.004));
      const tx = q2[0] - q1[0], ty = q2[1] - q1[1], tl = Math.hypot(tx, ty) || 1;
      X[k * 2] = q[0] - ty / tl * off; X[k * 2 + 1] = q[1] + tx / tl * off;
      if (X[k * 2] > -60 && X[k * 2] < W + 60 && X[k * 2 + 1] > -60 && X[k * 2 + 1] < H + 60) vis = true;
    }
    if (!vis) continue;
    impMarkDraw(ctx, X, w * R.r(0.88, 1.12), impPick(p, R.f()), impPick(p, R.f()), R.i(1, 2147483646), cnt < n && i >= cnt - wetN ? 1 : 0);
  }
}

// ---------------------------------------------------------------------
//  impKnife — a palette-knife slab: any outline P filled with ONE flat drag of paint
//    o.a     the drag direction (radians)          o.c2    a second colour streaked in (default: a lighter c)
//    o.frac  0..1 the knife has dragged this far (a pile of paint rides the front edge)
//    o.key   a stable name (fixes the streaks and the edge)       o.raw   true = P changes every frame (no memo)
//    o.rough edge irregularity in px (2.2)          o.lift  thickness: the cast shadow's offset (4)
// ---------------------------------------------------------------------
function impRough(P, amt, key, step = 13) {
  const Q = resample(P, true, step), n = Q.length, R = RNG('imprough', key), f1 = R.r(0.05, 0.09), f2 = R.r(0.19, 0.3), p1 = R.r(0, TAU), p2 = R.r(0, TAU), out = new Array(n);
  for (let i = 0; i < n; i++) { const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, d = amt * (0.6 * Math.sin(i * step * f1 + p1) + 0.4 * Math.sin(i * step * f2 + p2)); out[i] = [Q[i][0] + nx / l * d, Q[i][1] + ny / l * d]; }
  return out;
}
function impKnife(P, c, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const key = o.key ?? 'knife', a = o.a ?? 0, dx = Math.cos(a), dy = Math.sin(a), amt = o.rough ?? 2.2, lift = o.lift ?? 4;
  const Q = o.raw ? impRough(P, amt, key) : impMemo('kn|' + key + '|' + impHash(P) + amt, () => impRough(P, amt, key));
  let p0 = 1e9, p1 = -1e9, q0 = 1e9, q1 = -1e9, area = 0;
  for (let i = 0; i < Q.length; i++) { const [x, y] = Q[i], b = Q[(i + 1) % Q.length], p = x * dx + y * dy, q = -x * dy + y * dx; if (p < p0) p0 = p; if (p > p1) p1 = p; if (q < q0) q0 = q; if (q > q1) q1 = q; area += x * b[1] - b[0] * y; }
  const wp = (p, q) => [p * dx - q * dy, p * dy + q * dx], front = p0 + (p1 - p0) * frac, ori = area > 0 ? 1 : -1;
  const light = impMix(c, '#fffae6', 0.5), dark = impMix(c, IMP.ink, 0.42), c2 = o.c2 ?? impTone(c, 0.3), lx = IMP.light[0], ly = IMP.light[1];
  const g = ctx; g.save();
  if (frac < 1) { g.beginPath(); for (const [p, q] of [[p0 - 60, q0 - 60], [front, q0 - 60], [front, q1 + 60], [p0 - 60, q1 + 60]]) { const v = wp(p, q); g.lineTo(v[0], v[1]); } g.closePath(); g.clip(); }
  g.save(); g.translate(lift * 0.75, lift); impPath(g, Q); g.fillStyle = impMix(c, IMP.ink, 0.82); g.globalAlpha = 0.5; g.fill(); g.restore();   // the slab is thick: it casts
  impPath(g, Q); g.fillStyle = c; g.fill();
  g.save(); impPath(g, Q); g.clip();
  const R = RNG('impknife', key), n = Math.round((q1 - q0) / 2.4), Lp = p1 - p0; g.lineCap = 'butt';
  for (let i = 0; i < n; i++) {   // streaks along the drag: the knife leaves fine parallel tracks and drags the second colour
    const q = q0 + R.f() * (q1 - q0), ps = p0 + R.r(-0.15, 0.85) * Lp, pl = R.r(0.15, 0.95) * Lp, r = R.f(), va = wp(ps, q), vb = wp(ps + pl, q + R.n(1.6));
    g.strokeStyle = r < 0.42 ? light : r < 0.72 ? dark : c2; g.globalAlpha = R.r(0.1, r < 0.72 ? 0.42 : 0.7); g.lineWidth = R.r(1, r < 0.72 ? 4 : 7);
    g.beginPath(); g.moveTo(va[0], va[1]); g.lineTo(vb[0], vb[1]); g.stroke();
  }
  for (let i = 0; i < 3; i++) {   // chatter: where the knife paused it left a faint ridge across the drag
    const p = p0 + R.r(0.15, 0.9) * Lp, va = wp(p, q0), vb = wp(p, q1), wa = wp(p + 2.5, q0), wb = wp(p + 2.5, q1);
    g.lineWidth = 2; g.globalAlpha = 0.2; g.strokeStyle = light; g.beginPath(); g.moveTo(va[0], va[1]); g.lineTo(vb[0], vb[1]); g.stroke();
    g.globalAlpha = 0.13; g.strokeStyle = dark; g.beginPath(); g.moveTo(wa[0], wa[1]); g.lineTo(wb[0], wb[1]); g.stroke();
  }
  // the lip: paint squeezed out at the slab's edge, lit on the side towards the light, dark on the other
  const hi = new Path2D(), sh = new Path2D(), m = Q.length;
  for (let i = 0; i < m; i++) {
    const A = Q[i], B = Q[(i + 1) % m], ex = B[0] - A[0], ey = B[1] - A[1], el = Math.hypot(ex, ey) || 1, nx = ey / el * ori, ny = -ex / el * ori, lit = nx * lx + ny * ly;
    if (lit > 0.18) { hi.moveTo(A[0] - nx * 2.2, A[1] - ny * 2.2); hi.lineTo(B[0] - nx * 2.2, B[1] - ny * 2.2); }
    else if (lit < -0.18) { sh.moveTo(A[0] - nx * 2.4, A[1] - ny * 2.4); sh.lineTo(B[0] - nx * 2.4, B[1] - ny * 2.4); }
  }
  g.lineCap = 'round'; g.globalAlpha = 0.85; g.strokeStyle = impMix(c, '#fffbe8', 0.72); g.lineWidth = o.lip ?? 4; g.stroke(hi);
  g.globalAlpha = 0.6; g.strokeStyle = impMix(c, IMP.ink, 0.6); g.lineWidth = (o.lip ?? 4) * 1.15; g.stroke(sh);
  if (frac < 1) {   // the pile of paint riding the knife's edge
    const va = wp(front - 5, q0), vb = wp(front - 5, q1), wa = wp(front - 13, q0), wb = wp(front - 13, q1);
    g.lineCap = 'butt'; g.globalAlpha = 1; g.strokeStyle = impMix(c, '#fffbe8', 0.55); g.lineWidth = 11; g.beginPath(); g.moveTo(va[0], va[1]); g.lineTo(vb[0], vb[1]); g.stroke();
    g.globalAlpha = 0.5; g.strokeStyle = dark; g.lineWidth = 3; g.beginPath(); g.moveTo(wa[0], wa[1]); g.lineTo(wb[0], wb[1]); g.stroke();
  }
  g.restore(); g.restore();
}

// ---------------------------------------------------------------------
//  ready-made things
// ---------------------------------------------------------------------
// a star: a fat core dab inside rings of marks that turn (o.rot); o.frac, o.pal (halo), o.pal2 (the outer rings melt into the sky)
function impStar(x, y, r, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return; const key = o.key ?? 'star', w = o.w ?? Math.max(9, r * 0.3);
  impRing(x, y, r * 0.3, r, o.pal || [[IMP.lemon, 4], [IMP.chrome, 3], [IMP.white, 2], [IMP.orange, 0.8]], { pal2: o.pal2 || [[IMP.sky, 3], [IMP.cerulean, 3], [IMP.lemon, 1.5], [IMP.white, 1]], mix: (u) => smooth(0.35, 1, u), w, len: w * 2.6, rot: o.rot ?? 0, counter: true, frac, key, wet: 4 });
  if (frac > 0.2) impBlob(x, y, r * 0.3, o.core || IMP.white, { c2: IMP.lemon, key: key + 'c' });
}
// an orb (a moon, a sun; the bridge's morphing shape is drawn with it too): a knife slab inside a rim of marks that
// creeps round on the sixth of a second. o: frac (the knife's drag), raw (the outline changes every frame), a, c2
function impOrb(P, c, o = {}) {
  impKnife(P, c, { key: 'orb', a: o.a ?? 0.5, raw: o.raw, c2: o.c2 ?? impTone(c, 0.35), lift: 6, lip: 5, frac: o.frac });
  if ((o.frac ?? 1) >= 1) impAlong(P, c, { closed: true, w: 30, len: 92, inset: -6, key: 'win', rot: impStep(1 / 6) * 0.35, wet: 0, frac: o.rim ?? 1 });
}
// a bird on the wing: two marks. o: flap (0 / 1), c
function impBird(x, y, s, o = {}) {
  const c = o.c || IMP.ink, up = o.flap ? -0.55 : 0.2;
  impStroke([[x - s, y + s * up], [x - s * 0.5, y - s * 0.28 * (o.flap ? -1 : 1)], [x, y]], c, { w: s * 0.36, c2: IMP.ultra, key: 'bl' + (o.key ?? '') });
  impStroke([[x, y], [x + s * 0.5, y - s * 0.28 * (o.flap ? -1 : 1)], [x + s, y + s * up]], c, { w: s * 0.36, c2: IMP.ultra, key: 'br' + (o.key ?? '') });
}

// ---------------------------------------------------------------------
//  THE HERO — a small sunflower: a ring of chrome-yellow petal marks round a dark seeded disc, on a stem of green
//  marks with two leaves. (x, y) = the centre of the flower head, r = the head's radius (petal tips).
//    o.open   0..1 petals folded .. spread (1)        o.turn  -1..1 the head leans left / right (the stem bends)
//    o.nod    px the head dips (a nod on the beat)    o.stem  length of the stem in r (2.6); 0 = the head alone
//    o.frac   0..1 painted in: stem, leaves, petals, disc        o.key
//  Sets SPARK_AT (the head).
// ---------------------------------------------------------------------
const IMP_PETAL = [[IMP.chrome, 5], [IMP.lemon, 2.5], [IMP.orange, 1.6], [IMP.white, 0.5]];
const IMP_PETAL_B = [[IMP.orange, 4], [IMP.chrome, 2], [IMP.verm, 0.8]];
const IMP_LEAF = [[IMP.emerald, 4], [IMP.viridian, 3], [IMP.sap, 2.5], [IMP.lemon, 0.6]];
function impSunflower(x, y, r, o = {}) {
  const key = o.key ?? 'hero', frac = clamp(o.frac ?? 1), open = clamp(o.open ?? 1), turn = clamp(o.turn ?? 0, -1, 1), stem = o.stem ?? 2.6;
  const hx = x + turn * r * 0.34, hy = y + (o.nod ?? 0) + Math.abs(turn) * r * 0.05;
  if (frac <= 0) { return; }
  if (stem > 0) {
    const bx = x - turn * r * 0.1, by = y + r * stem, S = [[bx, by], [bx + r * 0.1, y + r * stem * 0.62], [x - r * 0.06 + turn * r * 0.1, y + r * stem * 0.3], [hx, hy + r * 0.3]];
    impAlong(S, [[IMP.viridian, 4], [IMP.emerald, 3], [IMP.sap, 1.5]], { w: r * 0.24, len: r * 0.75, step: 0.7, frac: clamp(frac / 0.3), key: key + 'stem', wet: 2 });
    const lf = clamp((frac - 0.25) / 0.2);
    if (lf > 0) for (const s of [-1, 1]) {
      const p = pointAt(S, s < 0 ? 0.36 : 0.56), tip = [p[0] + s * r * 1.02, p[1] - r * 0.34 + (o.nod ?? 0) * 0.3];
      for (let k = 0; k < 3; k++) { const t = [tip[0] - s * k * r * 0.08, tip[1] + (k - 1) * r * 0.24], R = RNG('implf', key, s, k); impStroke([p, [lerp(p[0], t[0], 0.5), lerp(p[1], t[1], 0.5) - r * 0.18 + k * r * 0.14], t], impPick(impPal(IMP_LEAF), R.f()), { w: r * 0.27, c2: impPick(impPal(IMP_LEAF), R.f()), key: key + 'lf' + s + k, frac: lf, wet: 0 }); }
    }
  }
  const pf = clamp((frac - 0.4) / 0.4), sx = 1 - 0.16 * Math.abs(turn), rin = r * 0.34, rout = r * (0.56 + 0.44 * open);
  if (pf > 0) {
    impRays(hx, hy, rin, rout * 0.94, IMP_PETAL_B, { n: 11, w: r * 0.3, rot: 0.29 + turn * 0.25, sx, key: key + 'pb', frac: pf, bend: 0.2 });   // the back row, in orange
    impRays(hx, hy, rin, rout, IMP_PETAL, { n: 13, w: r * 0.31, rot: turn * 0.25, sx, key: key + 'pf', frac: clamp((frac - 0.5) / 0.35), bend: 0.16 });
  }
  if (frac > 0.8) {   // the disc: a turn of dark marks and a few seeds of ochre
    impRing(hx, hy, r * 0.14, r * 0.45, [[IMP.umber, 4], [IMP.sienna, 3], [IMP.ink, 1.4], [IMP.ochre, 0.8]], { w: r * 0.16, len: r * 0.34, rot: turn, key: key + 'disc' });
    impBlob(hx, hy, r * 0.17, IMP.sienna, { c2: IMP.ochre, key: key + 'eye' });
  }
  SPARK_AT = toScreen(hx, hy);
}
const impSunflowerPts = (x, y, r, n = 13) => impSunPts(x, y, r * 0.82, n, 0.16);

// ---------------------------------------------------------------------
//  type in the medium: thick painted letters (a lit edge, a cast shadow, bristle tracks inside the glyphs)
//    impText(str, x, y, size, c, { align, weight, key, c2 }) -> width.   Cached per string, size and colour.
// ---------------------------------------------------------------------
const impFont = (size, weight = 700) => `${weight} ${size}px ${IMP_FONT}`;
function impTextW(str, size, weight) { ctx.save(); ctx.font = impFont(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function impText(str, x, y, size, c, o = {}) {
  const font = impFont(size, o.weight); ctx.save(); ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const w = ctx.measureText(str).width, x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x, d = Math.max(1.5, size * 0.034);
  ctx.globalAlpha = 0.5; ctx.fillStyle = impMix(c, IMP.ink, 0.85); ctx.fillText(str, x0 + d * 1.1, y + d * 1.5);        // the letters are thick: they cast
  ctx.globalAlpha = 0.95; ctx.fillStyle = impMix(c, '#fffbe8', 0.55); ctx.fillText(str, x0 - d * 0.55, y - d * 0.8);   // and catch the light on one side
  ctx.globalAlpha = 1;
  const t = impMemo('txt|' + str + '|' + size + '|' + c + '|' + (o.weight ?? 700) + (o.key ?? ''), () => {
    const pad = Math.ceil(size * 0.2), cw = Math.ceil(w) + pad * 2, ch = Math.ceil(size * 1.6), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d'), base = Math.round(size * 1.1), R = RNG('imptext', str, size, o.key ?? '');
    g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = c; g.fillText(str, pad, base);
    g.globalCompositeOperation = 'source-atop'; g.lineCap = 'butt';
    const li = impTone(c, 0.28), da = impTone(c, -0.3), c2 = o.c2 ?? impMix(c, IMP.cobalt, 0.35);
    for (let yy = 2; yy < ch; yy += R.r(2.2, 4.2)) {   // bristle tracks, dragged left to right and a little up
      let xx = R.r(-40, 0);
      while (xx < cw) { const l = R.r(30, 140), r = R.f(); g.strokeStyle = r < 0.42 ? li : r < 0.8 ? da : c2; g.globalAlpha = R.r(0.12, 0.42); g.lineWidth = R.r(1, 3); g.beginPath(); g.moveTo(xx, yy + xx * -0.05); g.lineTo(xx + l, yy + (xx + l) * -0.05 + R.n(1.2)); g.stroke(); xx += l + R.r(4, 40); }
    }
    return { cv, pad, base };
  });
  ctx.drawImage(t.cv, x0 - t.pad, y - t.base);
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  captions (through DEFER: drawn after the camera, at screen size)
//    impCaption('Paint it *thick*', { x, y, w, size, at })   a knife slab of white is dragged across, the words are
//       painted on it one per eighth; the *starred* word sits on its own slab of chrome yellow
//    impTag('night', { x, y, size, at })                     a small slab, top left
//    Both are scraped off as a bridge starts (impBridgeK).
// ---------------------------------------------------------------------
function impBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.2); if (TT >= r.tc && TT < r.tc + d) return 0; }
  return 1;
}
function impCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = impBridgeK(); if (k <= 0 || TT < at - 1e-6) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), y = o.y ?? 1420, maxW = o.w ?? 800, key = 'cap' + str;
  const parts = String(str).split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((p) => p.s), words = [];
  for (const p of parts) p.s.split(/\s+/).forEach((s) => words.push({ s, hi: p.hi }));
  let size = o.size ?? 76; const measure = () => { const sp = size * 0.3; let w = 0; words.forEach((t, i) => { t.w = impTextW(t.s, size); t.gap = i ? sp + (t.hi || words[i - 1].hi ? size * 0.16 : 0) : 0; w += t.w + t.gap; }); return w; };
  let tw = measure(); if (tw > maxW) { size *= maxW / tw; tw = measure(); }
  const padX = size * 0.5, x0 = cx - tw / 2 - padX, x1 = cx + tw / 2 + padX, y0 = y - size * 1.02, y1 = y + size * 0.46;
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(x0 - 30 + (x1 - x0 + 60) * (1 - k), y0 - 30, (x1 - x0 + 60) * k, y1 - y0 + 60); ctx.clip(); }   // leaving: scraped off from the left
  impKnife([[x0, y0 + 5], [x1 - 6, y0], [x1, y1 - 4], [x0 + 8, y1]], o.c ?? IMP.white, { a: -0.02, c2: o.c2 ?? '#e6d6a6', key: key + 'slab', frac: impIn(at, 0.3), rough: 3, lift: 6, lip: 5 });
  let xx = cx - tw / 2;
  words.forEach((t, i) => {
    xx += t.gap; const t0 = at + 0.25 + i * 0.125;
    if (TT >= t0 - 1e-6) {
      const fresh = TT < t0 + 1 / 12 - 1e-6;
      if (t.hi) impKnife([[xx - size * 0.2, y - size * 0.86], [xx + t.w + size * 0.22, y - size * 0.9], [xx + t.w + size * 0.18, y + size * 0.3], [xx - size * 0.16, y + size * 0.34]], o.hi ?? IMP.chrome, { a: 0.03, c2: IMP.orange, key: key + 'hi' + i, frac: fresh ? 0.6 : 1, rough: 2, lift: 4 });
      if (!(t.hi && fresh)) impText(t.s, xx, y + (fresh ? 4 : 0), size, o.ink ?? IMP.prussian, { key: key + i });
    }
    xx += t.w;
  });
  ctx.restore();
}
function impTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.25), k = impBridgeK(); if (k <= 0 || TT < at - 1e-6) return;
  const x = o.x ?? 62, y = o.y ?? 262, size = o.size ?? 44, w = impTextW(str, size), bw = w + size * 0.9, bh = size * 1.42;
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(x - 12, y - 12, (bw + 30) * k, bh + 30); ctx.clip(); }
  impKnife([[x, y + 3], [x + bw - 4, y], [x + bw, y + bh - 3], [x + 5, y + bh]], o.c ?? IMP.white, { a: 0.02, c2: '#e6d6a6', key: 'tag' + str, frac: impIn(at, 0.2), rough: 2, lift: 4 });
  if (TT >= at + 0.2 - 1e-6) impText(str, x + size * 0.45, y + size * 1.02, size, o.ink ?? IMP.prussian, { key: 'tag' + str });
  ctx.restore();
}
const impCaption = (str, o = {}) => { const f = () => impCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const impTag = (str, o = {}) => { const f = () => impTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the toned canvas (cached, seeded): a sienna ground brushed on thin, the weave showing through
// ---------------------------------------------------------------------
function impGroundCv() {
  if (IMP_CV.ground && IMP_CV.ground.width === W && IMP_CV.ground.height === H) return IMP_CV.ground;
  const c = impCanvas('ground'), g = c.getContext('2d'), R = RNG('impground');
  g.fillStyle = IMP.ground; g.fillRect(0, 0, W, H);
  g.lineCap = 'butt';
  for (let i = 0; i < 420; i++) {   // the imprimatura was scrubbed on with a wide brush: soft streaks of lighter and darker ground
    const x = R.r(-80, W), y = R.r(0, H), l = R.r(160, 520), a = -0.1 + R.n(0.22);
    g.strokeStyle = R.f() < 0.5 ? IMP.groundD : IMP.groundL; g.globalAlpha = R.r(0.05, 0.16); g.lineWidth = R.r(14, 60);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // the weave: warp and weft threads, each a little lighter or darker than its neighbour
  for (let y = 0; y < H; y += 4) { g.globalAlpha = R.r(0.05, 0.17); g.fillStyle = (y / 4) % 2 ? '#3a2a14' : '#f0dcae'; g.fillRect(0, y + R.n(0.4), W, 1.6); }
  for (let x = 0; x < W; x += 4) { g.globalAlpha = R.r(0.05, 0.17); g.fillStyle = (x / 4) % 2 ? '#3a2a14' : '#f0dcae'; g.fillRect(x + R.n(0.4), 0, 1.6, H); }
  g.globalAlpha = 0.22; g.fillStyle = '#2e2010';
  for (let i = 0; i < 2600; i++) g.fillRect(Math.floor(R.r(0, W / 4)) * 4 + 2, Math.floor(R.r(0, H / 4)) * 4 + 2, 2, 2);   // the holes of the weave
  g.globalAlpha = 0.3; g.fillStyle = '#e9d3a2';
  for (let i = 0; i < 500; i++) g.fillRect(R.r(0, W), Math.floor(R.r(0, H / 4)) * 4, R.r(6, 26), 2);                       // slubs in the thread
  g.globalAlpha = 1;
  return c;
}
const impGround = () => { ctx.drawImage(impGroundCv(), 0, 0); };
// the scrub of thin paint that a bridge leaves on the canvas (a fixed list of big marks)
function impScrub() {
  return impMemo('scrub', () => { const R = RNG('impscrub'), out = []; for (let i = 0; i < 230; i++) out.push({ x: R.r(40, W - 40), y: R.r(40, H - 40), kl: R.r(0.7, 1.3), kw: R.r(0.7, 1.3), u1: R.f(), u2: R.f(), sd: R.i(1, 2147483646) }); return out; });
}
const IMP_SCRUBFLOW = impFlowSwirl((x, y) => -0.3 + 0.35 * Math.sin(x / 260 + y / 330), [{ x: W * 0.36, y: H * 0.3, r: 330, s: 1 }, { x: W * 0.7, y: H * 0.68, r: 300, s: -1 }]);

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'impasto',
  paper: IMP.ground,
  // the toned canvas. During a bridge the old picture is scraped back to it: big thin marks of its colour thin
  // out as the window closes, and the new picture's first scrub comes in as the window opens
  backdrop(c, o) {
    ctx.save(); screen(); ctx.drawImage(impGroundCv(), 0, 0);
    if (o) {
      const S = impScrub(), bg = typeof ERA_BG !== 'undefined' ? ERA_BG : [c, c];
      const n = Math.max(14, Math.round(S.length * (o.phase === 'shrink' ? (1 - o.u) ** 1.6 : o.phase === 'grow' ? 0.85 * o.u ** 1.4 : 0)));
      // scraped thin: the further the scraping has gone, the more the mark is only a stain in the ground
      const thin = Math.round((o.phase === 'shrink' ? 0.15 + 0.6 * o.u : o.phase === 'grow' ? 0.75 - 0.6 * o.u : 0.75) * 8) / 8;
      const col = impMix(o.phase === 'shrink' ? bg[o.eraA] : o.phase === 'grow' ? bg[o.eraB] : impMix(bg[o.eraA], bg[o.eraB], Math.round(o.u * 6) / 6), IMP.ground, thin), p = impPal(col);
      for (let i = 0; i < n; i++) { const m = S[i]; impMarkDraw(ctx, impTrace(IMP_SCRUBFLOW, m.x, m.y, 230 * m.kl), 62 * m.kw, impPick(p, m.u1), impPick(p, m.u2), m.sd, 0); }
    }
    ctx.restore();
  },
  // the era seen through the bridge shape, inside a wreath of thick marks in the shape's colour that tightens
  // as the window closes onto the object
  window(P, key, src, o = {}) {
    const u = o.u ?? 0, g = smooth(0.25, 1, o.phase === 'grow' ? 1 - u : u);
    ctx.save(); impPath(ctx, P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const w = 16 + 14 * g;
    impAlong(P, o.c ?? IMP.chrome, { closed: true, w, len: w * 3.1, inset: -w * 0.2, key: 'win', cull: true, rot: impStep(1 / 6) * 0.35, wet: 0 });
  },
  // the morphing shape: a knife slab of the blended colour inside a turning rim of marks
  blob(P, c, key, u = 0) { impOrb(P, c, { raw: true }); },
  hero(x, y, r, o = {}) { impSunflower(x, y, r * 0.95, { stem: 0, key: 'hero', turn: 0 }); },
  heroColor: IMP.chrome,
  heroPts(x, y, r) { return impSunflowerPts(x, y, r * 0.95); },
  // one relief pass over the finished frame: every tonal step (a bristle track, a mark's edge, a slab's lip) is
  // raised towards the light. A signed emboss made of compositing only: e = 0.5 * frame + 0.5 * inverted frame
  // shifted towards the light's far side, greyed, laid back over the frame with `overlay`.
  post() {
    const src = ctx.canvas, a = impCanvas('embA', src.width, src.height), b = impCanvas('embB', src.width, src.height), ga = a.getContext('2d'), gb = b.getContext('2d');
    ga.globalCompositeOperation = 'copy'; ga.globalAlpha = 1; ga.drawImage(src, 0, 0);
    ga.globalCompositeOperation = 'difference'; ga.fillStyle = '#fff'; ga.fillRect(0, 0, a.width, a.height);
    gb.globalCompositeOperation = 'copy'; gb.globalAlpha = 1; gb.drawImage(src, 0, 0);
    gb.globalCompositeOperation = 'source-over'; gb.globalAlpha = 0.5; gb.drawImage(a, 2, 3);
    gb.globalAlpha = 1; gb.globalCompositeOperation = 'saturation'; gb.fillStyle = '#808080'; gb.fillRect(0, 0, b.width, b.height);
    ctx.save(); screen(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.9; ctx.drawImage(b, 0, 0); ctx.restore();
  },
  ones: false,
};
