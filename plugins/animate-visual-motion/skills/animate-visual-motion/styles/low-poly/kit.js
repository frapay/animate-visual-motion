// =====================================================================
//  styles/low-poly/kit.js — low-poly faceted 3D illustration.
//  Every form is a mesh of flat-shaded triangles: one flat colour per facet, taken from a base colour and a fixed
//  light (top-left), so neighbours differ in brightness. No outlines, no gradients inside a facet; each facet is
//  stroked a hairline in its own fill so anti-aliasing never shows a crack. Meshes are seeded and static (cached by
//  key); life comes from a light shimmer sweeping over the facets, facets flipping in one by one, parallax between
//  depth layers, drifting faceted clouds, twinkling water and stars. Two palettes: dawn and night. A faceted fox hero.
//  Built on kit/core.js (RNG, EZ, SPRING / springEase, bbox, resample, trace, toScreen, TT / ev / DEFER / E0 / SPARK_AT).
//  Needs from the piece head: W, H, FPS, CX (caption centre x).
// =====================================================================

// ---- palette (6-digit hex). Each era palette carries its light (`lit`), its shadow (`shd`) and its haze.
const LP = {
  dawn: {
    bg: '#f3ab8c', sky: ['#4f629c', '#a985ad', '#f09a86', '#ffc89a', '#ffe6c0'],   // sky stops, zenith -> horizon
    lit: '#fff0d4', shd: '#27456f', haze: '#ffd0b0',     // warm light, blue-teal shadow, peach distance
    peak: '#e9686e', snow: '#fff4e8', ridge: '#cf6f88', water: '#3d9aa0', ground: '#1c4c57', tree: '#27797a',
    rock: '#7a6f95', cloud: '#fff0e0', ink: '#11323b', text: '#fff6e8', hi: '#ffd36b', hiText: '#11323b', star: '#fff6e8',
  },
  night: {
    bg: '#1a1f4c', sky: ['#0b0d2a', '#141945', '#1f2862', '#2a4379', '#356a8a'],
    lit: '#a4ecd4', shd: '#070919', haze: '#2a3d76',     // mint moonlight, near-black shadow, blue distance
    peak: '#35438a', snow: '#d6eef0', ridge: '#2c3a7c', water: '#18386a', ground: '#0e1436', tree: '#135a64',
    rock: '#2b3168', cloud: '#34407f', ink: '#090b22', text: '#f3ecd2', hi: '#8fe3c8', hiText: '#0e1436', star: '#f3ecd2',
    crystal: '#4fd6bd',
  },
  sunPal: { lit: '#fffbe2', shd: '#f0843f' }, moonPal: { lit: '#ffffff', shd: '#8691c0' },   // the gems carry their own light
  dusk: { lit: '#ffe0cc', shd: '#2a2352' },                                                 // the sheet a morph happens on
  sun: '#ffd36b', moon: '#f3ecd2',
  fox: '#ff8a2e', foxW: '#fff4e4', foxK: '#2b1c30',     // THE accent: amber-orange is the hero's and nothing else's
  paper: '#6f6396',
};
let lpPal = LP.dawn;                                                   // the palette in use; a scene sets it first thing
const lpUse = (p) => (lpPal = typeof p === 'string' ? LP[p] : p);
const LP_SANS = 'Futura, "Century Gothic", "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
const LP_L = (() => { const v = [-0.55, -0.65, 0.52], n = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / n); })();   // the light: top-left, toward the viewer
const LP_SWEEP = { every: 3.0, at: 1.5, len: 1.2 };                    // the shimmer: one sweep per `every` s, starting `at`, lasting `len`

// ---------------------------------------------------------------------
//  colour (accept '#rrggbb' or 'rgb(r,g,b)')
// ---------------------------------------------------------------------
const LP_RGBS = {};
function lpRGB(c) { if (c[0] === '#') return LP_RGBS[c] || (LP_RGBS[c] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const lpHex = (v) => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
const lpMix = (a, b, u) => { const x = lpRGB(a), y = lpRGB(b); return lpHex(x.map((v, i) => lerp(v, y[i], u))); };
// a facet's colour: base c pushed toward the light (s > 0) or the shadow (s < 0), s in -1..1
function lpTone(c, s, pal = lpPal) {
  const v = lpRGB(c), w = lpRGB(s >= 0 ? pal.lit : pal.shd), k = s >= 0 ? Math.min(1, s) * 0.5 : Math.min(1, -s) * 0.55;
  return `rgb(${Math.round(v[0] + (w[0] - v[0]) * k)},${Math.round(v[1] + (w[1] - v[1]) * k)},${Math.round(v[2] + (w[2] - v[2]) * k)})`;
}
const lpHaze = (c, far, pal = lpPal) => lpMix(c, pal.haze, clamp(far) * 0.75);   // atmospheric perspective: far = 0 near .. 1 horizon
const lpGrad = (stops, u) => { const x = clamp(u) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)); return lpMix(stops[i], stops[i + 1], x - i); };

// ---------------------------------------------------------------------
//  geometry and the light
// ---------------------------------------------------------------------
const lpZoom = () => ctx.getTransform().a || 1;
const lpCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
function lpInside(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
}
// Lambert for a triangle of [x, y, z] points (z toward the viewer), mapped so a flat facet = 0, lit > 0, shaded < 0
function lpLambert(A, B, C) {
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
  const d = (nx * LP_L[0] + ny * LP_L[1] + nz * LP_L[2]) / (Math.hypot(nx, ny, nz) || 1);
  return clamp(d >= LP_L[2] ? (d - LP_L[2]) / (1 - LP_L[2]) * 1.3 : (d - LP_L[2]) / LP_L[2] * 0.9, -1, 1);
}
// where the shimmer band is now, in screen units along the axis (0.8, 0.6); far away between sweeps
function lpBand() { const u = (mod(TT, LP_SWEEP.every) - LP_SWEEP.at) / LP_SWEEP.len; return u < 0 || u > 1 ? -9999 : -300 + u * 2700; }
function lpPath(P) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }   // straight edges only
// one flat facet: polygon P in colour c at tone s, stroked a hairline in its own fill (no seams)
function lpFacet(P, c, s = 0, pal = lpPal) {
  lpPath(P); ctx.fillStyle = ctx.strokeStyle = lpTone(c, s, pal); ctx.lineWidth = 1.2 / lpZoom(); ctx.lineJoin = 'round'; ctx.fill(); ctx.stroke();
}

// Delaunay (Bowyer-Watson) over points V -> index triples
function lpDelaunay(V) {
  const n = V.length, bb = bbox(V), d = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 20 + 10, mx = (bb.x0 + bb.x1) / 2, my = (bb.y0 + bb.y1) / 2;
  const Q = V.map(([x, y], i) => [x + ((i * 37) % 11 - 5) * 0.003, y + ((i * 53) % 13 - 6) * 0.003]).concat([[mx - d, my - d], [mx + d, my - d], [mx, my + d]]);   // a hair of fixed jitter against collinear edges
  const tri = (a, b, c) => {
    const [ax, ay] = Q[a], [bx, by] = Q[b], [cx, cy] = Q[c], D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) || 1e-9;
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const x = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D, y = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
    return { v: [a, b, c], x, y, r: (ax - x) ** 2 + (ay - y) ** 2 };
  };
  let T = [tri(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const [x, y] = Q[i], E = [], keep = [];
    for (const t of T) { if ((x - t.x) ** 2 + (y - t.y) ** 2 < t.r) E.push([t.v[0], t.v[1]], [t.v[1], t.v[2]], [t.v[2], t.v[0]]); else keep.push(t); }
    for (let a = 0; a < E.length; a++) {
      let dup = false;
      for (let b = 0; b < E.length && !dup; b++) dup = a !== b && ((E[a][0] === E[b][0] && E[a][1] === E[b][1]) || (E[a][0] === E[b][1] && E[a][1] === E[b][0]));
      if (!dup) keep.push(tri(E[a][0], E[a][1], i));
    }
    T = keep;
  }
  return T.filter((t) => t.v.every((k) => k < n)).map((t) => t.v);
}

// ---------------------------------------------------------------------
//  THE mesh: make any polygon outline low-poly. Seeded interior points on a jittered grid + Delaunay, triangles
//  outside the outline dropped; each vertex gets a height (a dome by default, or o.z(x, y, R, isEdge)), each facet a
//  fixed Lambert tone, a seeded jitter, a twinkle phase and a rank (the order it flips in). Cached by key: the
//  outline for one key must never change (move a mesh with ctx.translate / scale, not by rebuilding it).
//  o: { cell (facet size), n (about how many interior points, if no cell), z, bulge, from: 'bottom'|'top'|'left'|'center' }
// ---------------------------------------------------------------------
const LP_MESH = {};
function lpMesh(key, P, o = {}) {
  if (LP_MESH[key]) return LP_MESH[key];
  const bb = bbox(P), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, cell = o.cell ?? Math.max(16, Math.sqrt(w * h / (o.n ?? 12)));
  const R = RNG('lpmesh', key), E = resample(P, true, cell * 1.15), V = E.map((p) => [p[0], p[1], 0]), nb = V.length;
  let row = 0;
  for (let gy = bb.y0 + cell * 0.5; gy < bb.y1; gy += cell * 0.87, row++) for (let gx = bb.x0 + cell * (row % 2 ? 0.25 : 0.75); gx < bb.x1; gx += cell) {
    const x = gx + R.n(cell * 0.3), y = gy + R.n(cell * 0.3);
    if (lpInside(P, x, y) && !E.some((q) => Math.hypot(q[0] - x, q[1] - y) < cell * 0.5)) V.push([x, y, 0]);
  }
  if (V.length === nb) { const c = lpCentroid(P); V.push([c[0], c[1], 0]); }
  V.forEach((v, i) => {
    if (o.z) v[2] = o.z(v[0], v[1], R, i < nb);
    else if (i >= nb) v[2] = Math.min(...E.map((q) => Math.hypot(q[0] - v[0], q[1] - v[1]))) * (o.bulge ?? 0.7) + R.n(cell * 0.12);
  });
  const c0 = lpCentroid(P), T = [];
  for (const [a, b, c] of lpDelaunay(V)) {
    const A = V[a], B = V[b], C = V[c], cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3;
    if (Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])) < 1 || !lpInside(P, cx, cy)) continue;
    const from = o.from ?? 'bottom';
    const rank = (from === 'top' ? (cy - bb.y0) / h : from === 'left' ? (cx - bb.x0) / w : from === 'center' ? Math.hypot(cx - c0[0], cy - c0[1]) / (Math.hypot(w, h) / 2) : (bb.y1 - cy) / h) + R.n(0.1);
    T.push({ a, b, c, cx, cy, s: lpLambert(A, B, C), rank, jit: R.n(1), ph: R.r(0, TAU) });
  }
  const r0 = Math.min(...T.map((t) => t.rank)), r1 = Math.max(...T.map((t) => t.rank));
  T.forEach((t) => { t.rank = (t.rank - r0) / (r1 - r0 || 1); });
  let convex = true;   // a concave outline is clipped when drawn, so no facet ever bridges a notch
  for (let i = 0, sg = 0; i < P.length && convex; i++) {
    const a = P[i], b = P[(i + 1) % P.length], c = P[(i + 2) % P.length], cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) > 1e-6) { if (sg && Math.sign(cr) !== sg) convex = false; sg = Math.sign(cr); }
  }
  return (LP_MESH[key] = { P, V, T, convex, bb });
}
// draw a mesh in base colour c. o: { pal, k (shading contrast, 1), jit (per-facet tone jitter, 0.12), shim (shimmer
//   strength, 0.3; 0 = none), tw / twf (twinkle amount / speed), t0 + dur or grow 0..1 (facets flip in by rank),
//   tone(t) -> extra tone for facet t, col(t, rgbString) -> a replacement colour }
function lpDraw(M, c, o = {}) {
  const g = o.t0 != null ? clamp((TT - o.t0) / (o.dur ?? 0.8)) : clamp(o.grow ?? 1);
  if (g <= 0) return;
  const pal = o.pal ?? lpPal, k = o.k ?? 1, jit = o.jit ?? 0.12, sh = o.shim ?? 0.3, band = sh ? lpBand() : -9999, m = ctx.getTransform(), V = M.V;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 1.2 / (m.a || 1);
  if (!M.convex) { lpPath(M.P); ctx.clip(); }
  if (g >= 1) { lpPath(M.P); ctx.fillStyle = lpTone(c, 0, pal); ctx.fill(); }
  for (const t of M.T) {
    let q = 1;
    if (g < 1) { q = clamp((g * 1.25 - t.rank) / 0.25); if (q <= 0) continue; }
    let s = t.s * k + t.jit * jit;
    if (band > -9000) s += sh * Math.max(0, 1 - Math.abs((m.a * t.cx + m.e) * 0.8 + (m.d * t.cy + m.f) * 0.6 - band) / 190);
    if (o.tw) s += o.tw * Math.sin(TT * (o.twf ?? 3) + t.ph);
    if (o.tone) s += o.tone(t);
    if (q < 1) s += (1 - q) * 0.9;                                   // a facet flashes as it flips in
    let col = lpTone(c, s, pal); if (o.col) col = o.col(t, col) || col;
    const A = V[t.a], B = V[t.b], C = V[t.c], e = q < 1 ? EZ.back(q) : 1, fx = (x) => t.cx + (x - t.cx) * e;
    ctx.beginPath(); ctx.moveTo(fx(A[0]), A[1]); ctx.lineTo(fx(B[0]), B[1]); ctx.lineTo(fx(C[0]), C[1]); ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle = col; ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
const lpPoly = (key, P, c, o = {}) => lpDraw(lpMesh(key, P, o), c, o);   // triangulate + shade any outline

// ---------------------------------------------------------------------
//  depth: a layer that follows the camera only `depth` of the way (0 = pinned to the screen, 1 = the camera itself)
// ---------------------------------------------------------------------
function lpParT(depth, z, tx, ty) { const zz = 1 + (z - 1) * depth, px = W / 2 + ((W / 2 - tx) / z - W / 2) * depth, py = H / 2 + ((H / 2 - ty) / z - H / 2) * depth; return [zz, W / 2 - zz * px, H / 2 - zz * py]; }
function lpPar(depth, draw) { const m = ctx.getTransform(), [zz, ex, ey] = lpParT(depth, m.a, m.e, m.f); ctx.save(); ctx.setTransform(zz, 0, 0, zz, ex, ey); draw(); ctx.restore(); }
// world points that the full camera `cam` puts where a layer at `depth` shows P (for bridge outlines of far objects)
function lpParPts(P, depth, cam) { const c = cam || { z: 1, tx: 0, ty: 0 }, [zz, ex, ey] = lpParT(depth, c.z, c.tx, c.ty); return P.map(([x, y]) => [(zz * x + ex - c.tx) / c.z, (zz * y + ey - c.ty) / c.z]); }

// ---------------------------------------------------------------------
//  the sky: a triangulated gradient of large soft facets, pinned to the screen. lpSheet = the same sheet in one colour
// ---------------------------------------------------------------------
function lpSkyMesh() {
  if (LP_MESH.lpsky) return LP_MESH.lpsky;
  const R = RNG('lpsky'), nx = 4, ny = 8, G = [], T = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) G.push([-40 + i * (W + 80) / nx + (i && i < nx ? R.n(W / nx * 0.3) : 0), -40 + j * (H + 80) / ny + (j && j < ny ? R.n(H / ny * 0.3) : 0)]);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    for (const tr of R.f() < 0.5 ? [[a, b, c], [b, d, c]] : [[a, b, d], [a, d, c]]) T.push({ P: tr.map((q) => G[q]), cy: (G[tr[0]][1] + G[tr[1]][1] + G[tr[2]][1]) / 3, jit: R.n(1), ph: R.r(0, TAU) });
  }
  return (LP_MESH.lpsky = T);
}
// o: { horizon: the y where the gradient ends (1250) }
function lpSky(pal = lpPal, o = {}) {
  const hz = o.horizon ?? 1250, g = ctx.createLinearGradient(0, 0, 0, hz);
  ctx.save(); screen();
  pal.sky.forEach((c, i) => g.addColorStop(i / (pal.sky.length - 1), c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);   // an undercoat only: it shows nowhere but keeps the seams closed
  for (const t of lpSkyMesh()) lpFacet(t.P, lpGrad(pal.sky, t.cy / hz), t.jit * 0.1 + Math.sin(TT * 0.9 + t.ph) * 0.05, pal);
  ctx.restore();
}
function lpSheet(c, pal = LP.dusk) { fillAll(c); ctx.save(); screen(); for (const t of lpSkyMesh()) lpFacet(t.P, c, t.jit * 0.16 + Math.sin(TT * 0.9 + t.ph) * 0.04, pal); ctx.restore(); }

// ---------------------------------------------------------------------
//  land: ridges (a seeded skyline strip), a peak with a snow cap, rocks, trees (stacked faceted cones)
// ---------------------------------------------------------------------
function lpRidgePts(key, y, amp, o = {}) {
  const R = RNG('lpridge', key), n = o.n ?? 6, x0 = -240, x1 = W + 240, P = [];
  for (let i = 0; i <= n * 2; i++) P.push([lerp(x0, x1, i / (n * 2)) + (i && i < n * 2 ? R.n((x1 - x0) / (n * 2) * 0.28) : 0), y - amp * (i % 2 ? R.r(0.55, 1) : R.r(0, 0.22))]);
  return P.concat([[x1, o.bot ?? y + 280], [x0, o.bot ?? y + 280]]);
}
// a ridge across the frame: tops near y - amp, valleys near y. Slopes that face the light are lit, the others shaded.
function lpRidge(key, y, amp, c, o = {}) {
  const P = lpRidgePts(key, y, amp, o), top = P.slice(0, -2);
  const prof = (x) => { for (let i = 1; i < top.length; i++) if (x <= top[i][0]) return lerp(top[i - 1][1], top[i][1], clamp((x - top[i - 1][0]) / (top[i][0] - top[i - 1][0]))); return top[top.length - 1][1]; };
  lpPoly('rd' + key, P, c, { cell: amp * 0.95, z: (x, yy, R) => -prof(x) * 0.8 + (yy - y) * 0.15 + R.n(amp * 0.1), ...o });
}
function lpPeakPts(x, y, w, h) {   // apex (x, y), base width w at y + h; { P: outline, cap: the snow cap's outline }
  const ap = [x, y], l2 = [x - w * 0.17, y + h * 0.38], r1 = [x + w * 0.14, y + h * 0.34];
  const P = [[x - w * 0.5, y + h], [x - w * 0.33, y + h * 0.72], l2, ap, r1, [x + w * 0.31, y + h * 0.63], [x + w * 0.5, y + h]];
  const cl = [lerp(x, l2[0], 0.8), lerp(y, l2[1], 0.8)], cr = [lerp(x, r1[0], 0.86), lerp(y, r1[1], 0.86)], zz = (u, dy) => [lerp(cl[0], cr[0], u), lerp(cl[1], cr[1], u) + dy * h];
  return { P, cap: [ap, cr, zz(0.74, 0.085), zz(0.52, 0.0), zz(0.27, 0.1), cl] };
}
// THE mountain: a ridge line runs down from the apex; the left faces catch the light, the right faces fall in shadow
// o: { t0, dur (assemble facet by facet), capT0, snow, pal, shim }
function lpPeak(key, x, y, w, h, c, o = {}) {
  const pal = o.pal ?? lpPal, { P, cap } = lpPeakPts(x, y, w, h), z = (px, py, R) => -Math.abs(px - (x + (py - y) * 0.1)) * 0.85 + R.n(w * 0.022);
  lpPoly('pk' + key, P, c, { cell: w / 7.5, z, ...o });
  lpPoly('pkc' + key, cap, o.snow ?? pal.snow, { cell: w / 11, z, k: 0.55, pal, shim: o.shim, t0: o.capT0 ?? (o.t0 != null ? o.t0 + (o.dur ?? 0.8) * 0.85 : null), dur: 0.4, from: 'top' });
}
function lpRock(key, x, y, r, c, o = {}) {
  const R = RNG('lprock', key), P = [[-r, 0], [-r * R.r(0.8, 1), -r * R.r(0.4, 0.6)], [-r * R.r(0.2, 0.45), -r * R.r(0.8, 1)], [r * R.r(0.3, 0.5), -r * R.r(0.7, 0.9)], [r * R.r(0.85, 1), -r * R.r(0.3, 0.5)], [r, 0]];
  ctx.save(); ctx.translate(x, y); lpPoly('rk' + key + Math.round(r), P, c ?? (o.pal ?? lpPal).rock, { cell: r * 1.3, bulge: 1, ...o }); ctx.restore();
}
// a pine: three stacked faceted cones (a lit left facet, a shaded right facet each) on a trunk. (x, y) = foot, h = height
// o: { c, pal, t0 (the tiers pop up one after another), key }
function lpTree(x, y, h, o = {}) {
  const pal = o.pal ?? lpPal, c = o.c ?? pal.tree, g = o.t0 != null ? (TT - o.t0) / 0.5 : 1; if (g <= 0) return;
  const sway = Math.sin(TT * 1.4 + x * 0.013) * h * 0.012, tw = h * 0.035;
  lpFacet([[x - tw, y], [x - tw, y - h * 0.2], [x, y - h * 0.2], [x, y]], pal.ink, 0.25, pal); lpFacet([[x, y], [x, y - h * 0.2], [x + tw, y - h * 0.2], [x + tw, y]], pal.ink, -0.3, pal);
  for (let i = 0; i < 3; i++) {
    const q = clamp(g * 3 - i); if (q <= 0) continue;
    const e = EZ.back(q), by = y - h * (0.13 + i * 0.25), hw = h * (0.3 - i * 0.065) * e, ax = x + sway * (i + 1), ay = by - h * (0.4 - i * 0.02) * e, mx = x + hw * 0.16;
    lpFacet([[ax, ay], [x - hw, by], [mx, by + hw * 0.16]], c, 0.5 - i * 0.05 + (1 - q), pal);
    lpFacet([[ax, ay], [mx, by + hw * 0.16], [x + hw, by]], c, -0.6, pal);
  }
}

// ---------------------------------------------------------------------
//  sky things: the gem (a faceted sun / moon / jewel, also the morph's shape), stars, clouds, birds
// ---------------------------------------------------------------------
const lpGemWob = () => 0.07 * Math.sin(TT * 1.7);   // a gem's inner ring rocks a little, so its facets keep catching the light
// n points on a circle from angle -PI (the renderer resamples outlines from there); spike pulls every other vertex in
function lpGemPts(x, y, r, n = 12, spike = 0) { const P = []; for (let i = 0; i < n; i++) { const a = -Math.PI + i / n * TAU, k = r * (i % 2 ? 1 - spike : 1); P.push([x + Math.cos(a) * k, y + Math.sin(a) * k]); } return P; }
// a cut gem on an outer ring O (even count): a girdle of facets, an inner ring turned by o.turn (in steps), a table fan
function lpGemDraw(O, c, o = {}) {
  const pal = o.pal ?? lpPal, n = O.length, m = n / 2, ce = lpCentroid(O), turn = (o.turn ?? 0) * TAU / m, band = lpBand(), tm = ctx.getTransform();
  const rA = O.reduce((a, p) => a + Math.hypot(p[0] - ce[0], p[1] - ce[1]), 0) / n || 1, I = [];
  for (let j = 0; j < m; j++) { const b = O[2 * j + 1], a = Math.atan2(b[1] - ce[1], b[0] - ce[0]) + turn, r = Math.hypot(b[0] - ce[0], b[1] - ce[1]) * (o.inner ?? 0.52); I.push([ce[0] + Math.cos(a) * r, ce[1] + Math.sin(a) * r]); }
  const face = (A, B, C, slope) => {
    const gx = (A[0] + B[0] + C[0]) / 3, gy = (A[1] + B[1] + C[1]) / 3, nx = (gx - ce[0]) / rA * slope, ny = (gy - ce[1]) / rA * slope, d = (nx * LP_L[0] + ny * LP_L[1] + LP_L[2]) / Math.hypot(nx, ny, 1);
    let s = clamp((d - LP_L[2]) / (d >= LP_L[2] ? 1 - LP_L[2] : LP_L[2]), -1, 1) * (o.k ?? 1);
    if (band > -9000) s += 0.3 * Math.max(0, 1 - Math.abs((tm.a * gx + tm.e) * 0.8 + (tm.d * gy + tm.f) * 0.6 - band) / 190);
    lpFacet([A, B, C], c, s, pal);
  };
  lpFacet(O, c, 0, pal);
  for (let j = 0; j < m; j++) {
    const a = O[2 * j], b = O[2 * j + 1], d = O[(2 * j + 2) % n], i0 = I[j], i1 = I[(j + 1) % m];
    face(a, b, i0, 1.5); face(b, d, i0, 1.5); face(d, i0, i1, 1.1); face(i0, i1, ce, 0.55);
  }
}
const lpGem = (x, y, r, c, o = {}) => lpGemDraw(lpGemPts(x, y, r, o.n ?? 12, o.spike ?? 0), c, { turn: lpGemWob(), ...o });
// a small two-facet diamond (stars, fireflies, sparks)
function lpSpark(x, y, r, c, pal = lpPal) { lpFacet([[x, y - r], [x - r * 0.62, y], [x, y + r]], c, 0.35, pal); lpFacet([[x, y - r], [x, y + r], [x + r * 0.62, y]], c, -0.35, pal); }
// n seeded stars in box [x0, y0, x1, y1], popping in a stagger from o.t0, twinkling. o.avoid(x, y) -> true = no star there
function lpStars(key, n, box, o = {}) {
  const R = RNG('lpstars', key), pal = o.pal ?? lpPal;
  for (let i = 0, made = 0; made < n && i < n * 6; i++) {
    const x = R.r(box[0], box[2]), y = R.r(box[1], box[3]), r = R.r(7, 15), ph = R.r(0, TAU), f = R.r(2, 4.5);
    if (o.avoid && o.avoid(x, y)) continue;
    const s = o.t0 != null ? clamp(springEase(TT - o.t0 - made * 0.035, 260, 14), 0, 1.4) : 1; made++;
    if (s > 0.01) lpSpark(x, y, r * s * (0.75 + 0.3 * Math.sin(TT * f + ph)), o.c ?? pal.star, pal);
  }
}
// drifting motes (fireflies, pollen, snow): seeded, floating on slow sines, blinking
function lpMotes(key, n, box, c, o = {}) {
  const R = RNG('lpmotes', key), pal = o.pal ?? lpPal;
  for (let i = 0; i < n; i++) {
    const x = R.r(box[0], box[2]), y = R.r(box[1], box[3]), ph = R.r(0, TAU), f = R.r(0.35, 0.8), r = R.r(7, 12);
    const s = (o.t0 != null ? clamp(ev(o.t0 + i * 0.08, 0.3)) : 1) * (0.55 + 0.45 * Math.sin(TT * 3.1 + ph * 3));
    if (s > 0.05) lpSpark(x + Math.sin(TT * f + ph) * 26, y + Math.cos(TT * f * 1.3 + ph) * 18, r * s, c, pal);
  }
}
// a faceted cloud, w wide, flat-bottomed, sitting on (x, y). o.drift (px/s) carries it across and wraps it round
function lpCloud(key, x, y, w, c, o = {}) {
  const R = RNG('lpcloud', key), h = w * 0.34, P = [[0, 0], [-w * 0.04, -h * 0.3], [w * 0.1, -h * R.r(0.5, 0.65)], [w * 0.24, -h * 0.5], [w * R.r(0.36, 0.44), -h], [w * 0.6, -h * R.r(0.78, 0.9)], [w * 0.7, -h * 0.5], [w * 0.86, -h * R.r(0.52, 0.66)], [w * 1.02, -h * 0.26], [w, 0]];
  const xx = o.drift ? mod(x + o.drift * TT + w * 1.2, W + w * 2.4) - w * 1.2 : x;
  ctx.save(); ctx.translate(xx, y + Math.sin(TT * 0.7 + w) * 4); lpPoly('cl' + key + Math.round(w), P, c ?? (o.pal ?? lpPal).cloud, { cell: w * 0.2, bulge: 0.9, k: 0.6, ...o }); ctx.restore();
}
// a bird: two wing facets beating around a body point, s = wingspan
function lpBird(x, y, s, c, o = {}) {
  const fl = Math.sin(TT * (o.f ?? 9) + (o.ph ?? 0)), wy = -fl * s * 0.26, pal = o.pal ?? lpPal;
  lpFacet([[x, y], [x - s * 0.5, y + wy], [x - s * 0.14, y + s * 0.1]], c, 0.3, pal); lpFacet([[x, y], [x + s * 0.5, y + wy], [x + s * 0.16, y + s * 0.1]], c, -0.4, pal);
  lpFacet([[x - s * 0.14, y + s * 0.1], [x + s * 0.24, y + s * 0.02], [x + s * 0.16, y + s * 0.1], [x, y + s * 0.16]], c, -0.1, pal);
}

// ---------------------------------------------------------------------
//  water and crystals
// ---------------------------------------------------------------------
// a band of water: rows of long flat facets that twinkle; o.glint = { x, w, c } lays a light's reflection down it
function lpWater(key, x0, y0, w, h, c, o = {}) {
  const pal = o.pal ?? lpPal;
  let M = LP_MESH['wt' + key];
  if (!M) {
    const R = RNG('lpwater', key), rows = o.rows ?? 4, cell = o.cell ?? 150, nc = Math.ceil(w / cell) + 1, G = [];
    M = LP_MESH['wt' + key] = [];
    for (let r = 0; r <= rows; r++) { const y = y0 + h * (r / rows) ** 1.5, row = []; for (let i = 0; i <= nc; i++) row.push([x0 + (i - (r % 2 ? 0.5 : 0)) * cell + (r && r < rows ? R.n(cell * 0.22) : 0), y]); G.push(row); }
    for (let r = 0; r < rows; r++) for (let i = 0; i < nc; i++) {
      const a = G[r][i], b = G[r][i + 1], d = G[r + 1][i], e = G[r + 1][i + 1];
      for (const P of r % 2 ? [[a, b, d], [b, e, d]] : [[a, b, e], [a, e, d]]) M.push({ P, cx: (P[0][0] + P[1][0] + P[2][0]) / 3, v: (r + 0.5) / rows, jit: R.n(1), ph: R.r(0, TAU), id: M.length });
    }
  }
  const step = Math.floor(TT * 6);
  ctx.fillStyle = lpTone(c, 0, pal); ctx.fillRect(x0, y0, w, h);   // undercoat
  for (const t of M) {
    let s = t.jit * 0.22 + Math.sin(TT * 2.4 + t.ph) * 0.2 + (hash('lpglit', key, t.id, step) % 23 === 0 ? 0.9 : 0), col = c;   // now and then a facet flashes
    if (o.glint) { const d = Math.abs(t.cx - o.glint.x) / (o.glint.w * (0.45 + 0.55 * t.v)); if (d < 1) { col = lpMix(c, o.glint.c, (1 - d) * (0.5 + 0.3 * Math.sin(TT * 5 + t.ph))); s *= 0.4; } }
    lpFacet(t.P, col, s, pal);
  }
}
// a crystal growing out of the ground at (x, y), h tall, leaning o.lean (rad). o: { t0 (it shoots up on a spring), pal, glow }
function lpCrystal(x, y, h, c, o = {}) {
  const pal = o.pal ?? lpPal, g = o.t0 != null ? Math.max(0, springEase(TT - o.t0, 260, 15)) : 1; if (g <= 0.01) return;
  const w = h * 0.2, pu = 0.12 * Math.sin(TT * 2.6 + x * 0.05) * (o.glow ?? 1);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.lean ?? 0); ctx.scale(1, g);
  lpFacet([[-w, 0], [-w, -h * 0.72], [0, -h * 0.62], [0, 0]], c, 0.75 + pu, pal); lpFacet([[0, 0], [0, -h * 0.62], [w, -h * 0.72], [w, 0]], c, -0.45 + pu, pal);
  lpFacet([[-w, -h * 0.72], [0, -h], [0, -h * 0.62]], c, 1 + pu, pal); lpFacet([[0, -h * 0.62], [0, -h], [w, -h * 0.72]], c, 0.1 + pu, pal);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  type: clean geometric bold sans, flat colour; plates are faceted too
// ---------------------------------------------------------------------
function lpFont(size, weight = 700) { ctx.font = `${weight} ${size}px ${LP_SANS}`; }
// o: { align, base, weight, al, maxW: the widest the string may be (the size shrinks to fit) }. Returns the drawn width.
function lpText(str, x, y, size, color, o = {}) {
  ctx.save(); lpFont(size, o.weight); ctx.fillStyle = color; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic';
  let w = ctx.measureText(str).width;
  if (o.maxW && w > o.maxW) { lpFont(size * o.maxW / w, o.weight); w = ctx.measureText(str).width; }
  ctx.globalAlpha *= o.al ?? 1; ctx.fillText(str, x, y); ctx.restore(); return w;
}
const lpTextW = (str, size, weight) => { ctx.save(); lpFont(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; };
// a faceted plate (a chamfered slab of a few low-contrast facets) to set type on. o: { grow | t0 + dur, pal, k }
function lpPlate(key, x, y, w, h, c, o = {}) {
  const ch = Math.min(h * 0.32, w * 0.2), P = [[ch, 0], [w - ch * 0.5, 0], [w, h * 0.4], [w - ch * 0.8, h], [ch * 0.6, h], [0, h * 0.58]];
  ctx.save(); ctx.translate(x, y); lpPoly('pl' + key + Math.round(w) + 'x' + Math.round(h), P, c, { cell: Math.max(h * 0.85, w / 5), k: 0.3, jit: 0.1, shim: 0.12, from: 'left', bulge: 0.5, ...o }); ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: a low-poly fox sitting, seen from the front (about 40 facets): big ears, white cheeks and chest, a
//  white-tipped tail. Idle: it breathes, blinks, an ear twitches now and then, the tail sways. (x, y) = between its
//  front paws on the ground, s = its height. o: { key, pal, flip (tail on the left), tilt (head, rad),
//  twitch: time | [times] (extra ear twitches), pop: the time it springs up out of the ground, shadow: false }
// ---------------------------------------------------------------------
function lpFox(x, y, s, o = {}) {
  if (o.pop != null) {
    const k = TT < o.pop ? 0 : Math.max(0, springEase(TT - o.pop, 260, 14)); if (k <= 0.001) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y); lpFox(x, y, s, { ...o, pop: null }); ctx.restore(); SPARK_AT = toScreen(x, y - s * 0.6); return;
  }
  const key = o.key ?? 'fox', pal = o.pal ?? lpPal, f = o.flip ? -1 : 1, ph = hash('lpfox', key) % 628 / 100;
  const br = Math.sin(TT * TAU * 0.45 + ph) * 0.012, blink = mod(F + hash('lpblink', key) % 71, 71) < 3;
  let twitch = 0; { const u = mod(TT + ph, 2.3); if (u < 0.3) twitch = Math.sin(u / 0.3 * Math.PI); }
  for (const t of [].concat(o.twitch ?? [])) { const u = TT - t; if (u > 0 && u < 0.5) twitch = Math.max(twitch, Math.abs(Math.sin(u / 0.25 * Math.PI)) * (1 - u)); }
  const O = LP.fox, Wt = LP.foxW, K = LP.foxK;
  const fc = (P, c, sh) => lpFacet(P.map(([px, py]) => [x + px * s, y + py * s]), c, sh, pal);
  if (o.shadow !== false) fc([[-0.36, 0.005], [-0.2, -0.022], [0.2, -0.022], [0.36, 0.005], [0.2, 0.035], [-0.2, 0.035]], pal.ground, -0.75);
  // the tail: a leaf curling up beside the body, white-tipped, swaying about its root
  const sw = Math.sin(TT * TAU * 0.4 + ph) * 0.13, cs = Math.cos(sw), sn = Math.sin(sw), lt = f < 0 ? 0.25 : -0.15;
  const tp = (px, py) => { const dx = px - 0.18, dy = py + 0.06; return [f * (0.18 + dx * cs - dy * sn), -0.06 + dx * sn + dy * cs]; };
  const tA = tp(0.14, -0.02), tC = tp(0.48, -0.03), tD = tp(0.62, -0.3), tE = tp(0.5, -0.6), tB = tp(0.31, -0.35), tA2 = tp(0.2, -0.2), tM = tp(0.42, -0.22);
  const mid = (p, q, u) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)], tBw = mid(tB, tE, 0.48), tDw = mid(tD, tE, 0.48), tMw = mid(tBw, tDw, 0.5);
  fc([tA, tC, tM], O, -0.55 + lt); fc([tC, tD, tM], O, -0.25 + lt); fc([tA, tM, tA2], O, 0.05 + lt); fc([tA2, tM, tB], O, 0.3 + lt); fc([tM, tD, tDw], O, -0.1 + lt); fc([tM, tDw, tBw], O, 0.1 + lt); fc([tM, tBw, tB], O, 0.25 + lt);
  fc([tBw, tMw, tE], Wt, 0.1 + lt); fc([tMw, tDw, tE], Wt, -0.4 + lt);
  // the body: shoulders, flanks, haunches, a white chest
  const N = [0, -0.5 - br], Cc = [0, -0.17], Bt = [0, -0.015];
  for (const d of [-1, 1]) {
    const S = [d * 0.17, -0.45 - br], Hp = [d * 0.235, -0.02], Ck = [d * 0.085, -0.21];
    fc([N, S, Ck], O, -d * 0.3 + 0.05); fc([S, Hp, Ck], O, -d * 0.45 - 0.1); fc([Ck, Hp, Bt], O, -d * 0.3 - 0.3);
    fc([N, Ck, Cc], Wt, -d * 0.25); fc([Ck, Bt, Cc], Wt, -d * 0.25 - 0.2);
  }
  for (const d of [-1, 1]) fc([[d * 0.025, 0], [d * 0.125, 0], [d * 0.07, -0.1]], K, -d * 0.2);
  // the head: tilts about the neck; one ear tip flicks
  const tl = (o.tilt ?? 0) + Math.sin(TT * TAU * 0.22 + ph) * 0.025, hc = Math.cos(tl), hs = Math.sin(tl), hy = -0.66 - br * 1.5;
  const hp = (px, py) => [px * hc - (py - 0.14) * hs, hy + 0.14 + px * hs + (py - 0.14) * hc];   // about the neck, 0.14 below the head's centre
  const top = hp(0, -0.13), brow = hp(0, 0.01), nose = hp(0, 0.225);
  for (const d of [-1, 1]) {
    const tk = d === (f < 0 ? 1 : -1) ? twitch : 0;
    const tip = hp(d * (0.235 + tk * 0.05), -0.37 + tk * 0.07), out = hp(d * 0.275, -0.1), inn = hp(d * 0.07, -0.15), cheek = hp(d * 0.33, 0.05), jaw = hp(d * 0.13, 0.17);
    const ec = [(tip[0] + out[0] + inn[0]) / 3, (tip[1] + out[1] + inn[1]) / 3], ins = (p) => [lerp(p[0], ec[0], 0.42), lerp(p[1], ec[1], 0.42)];
    fc([tip, out, inn], O, -d * 0.3 - 0.15); fc([ins(tip), ins(out), ins(inn)], K, -d * 0.2);
    fc([inn, top, brow], O, -d * 0.3 + 0.3); fc([out, inn, brow], O, -d * 0.35 + 0.1); fc([out, cheek, brow], O, -d * 0.4 - 0.1);
    fc([cheek, jaw, brow], Wt, -d * 0.3 + 0.05); fc([brow, jaw, nose], Wt, -d * 0.3 - 0.15);
    const e = hp(d * 0.135, 0.0), eh = blink ? 0.006 : 0.032;
    fc([[e[0] - 0.036, e[1]], [e[0], e[1] - eh], [e[0] + 0.036, e[1]], [e[0], e[1] + eh]], K, 0);
  }
  fc([hp(-0.036, 0.183), hp(0.036, 0.183), nose], K, 0);
  SPARK_AT = toScreen(x, y - s * 0.6);
}
// the fox's silhouette for bridges: centred on (x, y), r = half its height
function lpFoxPts(x, y, r) { const s = r * 2; return [[-0.235, -1.03], [-0.07, -0.81], [0.07, -0.81], [0.235, -1.03], [0.275, -0.76], [0.33, -0.61], [0.17, -0.45], [0.235, -0.02], [-0.235, -0.02], [-0.17, -0.45], [-0.33, -0.61], [-0.275, -0.76]].map(([px, py]) => [x + px * s, y + r + py * s]); }

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size) on faceted plates that assemble facet by facet
// ---------------------------------------------------------------------
function lpLeaving() {   // 1 normally; falls to 0 over the first 0.3s of a bridge's shrink
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
function lpArrive() {    // after a bridge an era's overlays wait until the growing window has passed them
  if (typeof BRIDGES === 'undefined') return E0;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 0.05) return r.tc + (r.d ?? 0.6) * 0.75;
  return E0;
}
// a tag, top left: a small plate with a number chip and a label
function lpTagNow(num, label, pal) {
  const t0 = Math.max(E0 + 0.15, lpArrive()), al = lpLeaving(); if (TT < t0 || al <= 0.001) return;
  const x = 70, y = 262, h = 76, size = 36, w = h + 22 + lpTextW(label, size) + 40, g = Math.min(ev(t0, 0.35), al);
  lpPlate('tag' + label, x, y, w, h, pal.ink, { grow: g, pal });
  lpPlate('tagn' + num, x + 12, y + 11, h - 14, h - 22, pal.hi, { grow: Math.min(ev(t0 + 0.2, 0.25), al), pal, k: 0.5 });
  const a = al * ev(t0 + 0.25, 0.2);
  lpText(num, x + 12 + (h - 14) / 2, y + h / 2 + 2, 28, pal.hiText, { align: 'center', base: 'middle', al: a });
  lpText(label, x + h + 16, y + h / 2 + 2, size, pal.text, { base: 'middle', al: a });
}
// a caption: bold, centred at CX on a faceted plate; words rise in one after another. '\n' breaks lines;
// *a phrase* sits on its own bright chip in dark type. o: { y: last baseline, size, at, pal, x }
function lpCaptionNow(str, o, pal) {
  const al = lpLeaving(); if (al <= 0.001) return;
  const size = o.size ?? 72, lh = size * 1.24, t0 = Math.max(E0 + (o.at ?? 0.7), lpArrive()), yLast = o.y ?? 1450, cx = o.x ?? CX; if (TT < t0) return;
  ctx.save(); lpFont(size);
  const sp = ctx.measureText(' ').width, pad = size * 0.2;
  const lines = str.split('\n').map((line) => { const ws = line.split(/(\*[^*]+\*)/).filter((g) => g.trim()).flatMap((g) => (g[0] === '*' ? [{ w: g.slice(1, -1), hi: true }] : g.trim().split(/\s+/).map((w) => ({ w, hi: false })))); ws.forEach((d) => { d.W = ctx.measureText(d.w).width + (d.hi ? pad * 2 : 0); }); return { ws, W: ws.reduce((a, d) => a + d.W, 0) + sp * (ws.length - 1) }; });
  ctx.restore();
  const pw = Math.max(...lines.map((l) => l.W)) + size * 1.3, top = yLast - (lines.length - 1) * lh - size * 1.32, ph = yLast + size * 0.6 - top;
  lpPlate('cap' + str, cx - pw / 2, top, pw, ph, pal.ink, { grow: Math.min(ev(t0, 0.4), al), pal });
  let k = 0;
  lines.forEach((line, li) => {
    let xx = cx - line.W / 2; const yy = yLast - (lines.length - 1 - li) * lh;
    line.ws.forEach((d) => {
      const tw = t0 + 0.22 + k * 0.08, s = springEase(TT - tw, SPRING.playful.k, SPRING.playful.d); k++;
      if (TT >= tw && s > 0.001) {
        const dy = (1 - s) * size * 0.4, a = al * clamp(s * 1.6);
        if (d.hi) { lpPlate('hi' + d.w, xx, yy - size * 0.9 + dy, d.W, size * 1.2, pal.hi, { grow: Math.min(ev(tw + 0.05, 0.25), al), pal, k: 0.45, shim: 0.3 }); lpText(d.w, xx + pad, yy + dy, size, pal.hiText, { al: a }); }
        else lpText(d.w, xx, yy + dy, size, pal.text, { al: a });
      }
      xx += d.W + sp;
    });
  });
}
const lpTag = (num, label, o = {}) => { const pal = o.pal ?? lpPal, f = () => lpTagNow(num, label, pal); if (DEFER) DEFER.push(f); else f(); };
const lpCaption = (str, o = {}) => { const pal = o.pal ?? lpPal, f = () => lpCaptionNow(str, o, pal); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md)
// =====================================================================
const STYLE = {
  name: 'low-poly',
  paper: LP.paper,
  backdrop(c) { lpSheet(c); },                                           // a sheet of large soft facets in colour c (hex or rgb())
  // the era seen through outline P, framed by a girdle of facets in the bridge shape's colour
  window(P, key, src, o = {}) {
    const ce = lpCentroid(P), rA = P.reduce((a, p) => a + Math.hypot(p[0] - ce[0], p[1] - ce[1]), 0) / P.length || 1, k = 1 + 34 / rA, c = o.c ?? LP.sun;
    const pal = o.phase === 'grow' ? LP.moonPal : LP.sunPal, Q = P.map(([x, y]) => [ce[0] + (x - ce[0]) * k, ce[1] + (y - ce[1]) * k]);
    ctx.save(); lpPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    for (let i = 0; i < P.length; i++) { const j = (i + 1) % P.length; lpFacet([P[i], P[j], Q[i]], c, i % 2 ? 0.5 : -0.2, pal); lpFacet([P[j], Q[j], Q[i]], c, i % 2 ? -0.5 : 0.15, pal); }
  },
  // the morphing shape: a cut gem whose inner ring turns one step while its girdle changes shape, so it re-triangulates
  blob(P, c, key, u = 0) {
    const n = P.length, O = []; for (let i = 0; i < 12; i++) O.push(P[Math.round(i * n / 12) % n]);
    const mx = (a, b) => lpMix(a, b, clamp(u));
    lpGemDraw(O, c, { turn: u + lpGemWob(), pal: { lit: mx(LP.sunPal.lit, LP.moonPal.lit), shd: mx(LP.sunPal.shd, LP.moonPal.shd) } });
  },
  hero(x, y, r, o = {}) { if (r > 1) lpFox(x, y + r, r * 2, { key: o.key, pal: LP.night, shadow: false }); },
  heroColor: LP.fox,
  heroPts(x, y, r) { return lpFoxPts(x, y, r); },
  post() {},
  ones: true,
};
