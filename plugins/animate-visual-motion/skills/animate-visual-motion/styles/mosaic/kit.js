// =====================================================================
//  styles/mosaic/kit.js — MOSAIC: an ancient floor / wall mosaic that is laid while you watch. Every picture is
//  built from small hand-cut tesserae (slightly irregular quadrilaterals, 13–22 px at 1080 wide) with pale sandy
//  grout between them. Tiles follow the form: mosFill() tiles ANY outline with rows that trace its contour and
//  fill inward (opus vermiculatum), mosLine() runs rows along a path, mosField() lays a ground in straight rows
//  or in the scallop "fan" pattern (opus tessellatum), mosBorder() / mosGuilloche() make meander and wave bands.
//  Each tile's colour varies a little around its area's colour, has a faint bevel (lit top-left, dark bottom-right),
//  and a few are gold glass that glint in a slow sweep. Tiles click into place one by one, in row order.
//  How it stays fast: an area's tile list is computed once (seeded, cached by key); settled tiles are painted into
//  an offscreen canvas that only ever grows in tile order; per frame only the tiles landing right now are drawn.
//  Things that move are rigid groups of tiles (mosGroup / mosStamp) stepping on 2s.
//  Built on kit/core.js. Motion on 1s (the laying); movers step on 2s. Helpers are prefixed mos…; the palette is
//  MOS. Needs from the piece head: CX.
// =====================================================================
const MOS = {
  paper: '#ece2cc',                                    // the plain marble floor a morph happens on
  grout: '#d8c8a6',                                    // pale sandy grout / the bare mortar bed
  marble: '#f3ecdc', sand: '#e2cc9c',                  // off-white marble; warm sand (skies, shells)
  ochre: '#c9953c', gold: '#e3b23c',                   // ochre stone; gold glass (the tiles that glint)
  terra: '#c85f3c',                                    // TERRACOTTA: reserved for the hero
  umber: '#70492f', char: '#3b342f',                   // trunks, rims, dark outlines; letters
  olive: '#7f8f4a', oliveD: '#566a39',                 // leaves, gardens
  teal: '#2c7c85', tealD: '#1d5a67', turq: '#5cb8b0',  // the sea, water
  lapis: '#27507f', rose: '#d9a48c',                   // borders and tags; shell pink
  sinopia: '#a8543a',                                  // the under-drawing sketched on the mortar
};
const MOS_SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", "Iowan Old Style", "Hoefler Text", Georgia, "Times New Roman", "DejaVu Serif", serif';
const MOS_SWEEP = { t0: 1.3, v: 900, per: 2700 };      // the gold glint: a diagonal band crossing the frame (start s, px/s, period px)

// ---------------------------------------------------------------------
//  colour (hex or rgb() in), small helpers
// ---------------------------------------------------------------------
const mosRGB = (c) => { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; };
const mosCSS = (r) => `rgb(${Math.round(clamp(r[0], 0, 255))},${Math.round(clamp(r[1], 0, 255))},${Math.round(clamp(r[2], 0, 255))})`;
const mosMix = (a, b, u) => { const x = mosRGB(a), y = mosRGB(b); return mosCSS(x.map((v, i) => lerp(v, y[i], u))); };
const mosTone = (c, k) => mosMix(c, k > 0 ? '#fff6e0' : '#261c18', Math.abs(k));   // k > 0 lighter, k < 0 deeper
const mosLum = (c) => { const r = mosRGB(c); return (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255; };
const mosZoom = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
const mosT2 = () => B * 2 / FPS;                        // the time on 2s: what every moving group steps on
function mosCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function mosPath(g, P, closed = true) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); if (closed) g.closePath(); }
function mosHashPts(P) { let h = 2166136261 >>> 0; for (const p of P) { h ^= Math.round(p[0] * 4) & 0xffff; h = Math.imul(h, 16777619); h ^= Math.round(p[1] * 4) & 0xffff; h = Math.imul(h, 16777619); } return (h >>> 0) + ':' + P.length; }
function mosOffset(P, d, closed) {
  const n = P.length;
  return P.map((p, i) => { const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [p[0] - (b[1] - a[1]) / l * d, p[1] + (b[0] - a[0]) / l * d]; });
}
// a cache of static, seeded things (tile lists and the canvases they are painted into); the oldest entry goes first
const MOS_CACHE = new Map();
function mosEntry(key, build) {
  let e = MOS_CACHE.get(key);
  if (!e) { if (MOS_CACHE.size > 320) MOS_CACHE.delete(MOS_CACHE.keys().next().value); e = build(); MOS_CACHE.set(key, e); }
  return e;
}
let MOS_DIRECT = false, MOS_LOG = null;                 // true while a rigid group (or a morph frame) is painted straight to ctx

// ---------------------------------------------------------------------
//  one tessera. q = 8 numbers (4 corners); its colour varies around rgb; hi / lo = the bevel's lit and dark edges
// ---------------------------------------------------------------------
function mosMk(q, rgb, R, o = {}) {
  const jit = o.jit ?? 1, vary = o.vary ?? 0.1;
  for (let i = 0; i < 8; i++) q[i] += R.n(jit);
  const cx = (q[0] + q[2] + q[4] + q[6]) / 4, cy = (q[1] + q[3] + q[5] + q[7]) / 4;
  const gold = !!o.gold && R.f() < o.gold;
  if (gold) rgb = [227, 178, 60];
  const k = 1 + R.n(vary), w = R.n(vary * 90), col = [rgb[0] * k + w, rgb[1] * k, rgb[2] * k - w];
  const hi = [], lo = [];
  for (let i = 0; i < 4; i++) {
    const x1 = q[i * 2], y1 = q[i * 2 + 1], x2 = q[(i * 2 + 2) % 8], y2 = q[(i * 2 + 3) % 8];
    const mx = (x1 + x2) / 2 - cx, my = (y1 + y2) / 2 - cy, d = (mx * -0.55 + my * -0.83) / (Math.hypot(mx, my) || 1);
    if (Math.abs(d) < 0.3) continue;
    (d > 0 ? hi : lo).push(x1 + (cx - x1) * 0.13, y1 + (cy - y1) * 0.13, x2 + (cx - x2) * 0.13, y2 + (cy - y2) * 0.13);
  }
  return { q, cx, cy, c: mosCSS(col), lt: mosCSS(col.map((v) => v + (255 - v) * (gold ? 0.55 : 0.3))), dk: mosCSS(col.map((v) => v * 0.7)), hi, lo, gold };
}
function mosQuad(g, q) { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.lineTo(q[4], q[5]); g.lineTo(q[6], q[7]); g.closePath(); }
function mosPaint(g, t) {
  if (t.poly) { mosPath(g, t.poly); g.fillStyle = t.c; g.fill(); return; }      // a patch of fresh mortar (fan beds)
  mosQuad(g, t.q); g.fillStyle = t.c; g.fill();
  let e = t.hi;
  if (e.length) { g.beginPath(); for (let i = 0; i < e.length; i += 4) { g.moveTo(e[i], e[i + 1]); g.lineTo(e[i + 2], e[i + 3]); } g.strokeStyle = t.lt; g.stroke(); }
  e = t.lo;
  if (e.length) { g.beginPath(); for (let i = 0; i < e.length; i += 4) { g.moveTo(e[i], e[i + 1]); g.lineTo(e[i + 2], e[i + 3]); } g.strokeStyle = t.dk; g.stroke(); }
}
// a tile on its way down: p = 0 just let go (lifted, a touch bigger, its shadow thrown down-right) … 1 settled
function mosLand(t, p) {
  if (t.poly) return mosPaint(ctx, t);
  const k = 1 - clamp(p), s = 1 + 0.2 * k;
  ctx.save(); ctx.translate(t.cx + 2 + 6 * k, t.cy + 3 + 8 * k); ctx.scale(s, s); ctx.translate(-t.cx, -t.cy); mosQuad(ctx, t.q); ctx.fillStyle = 'rgba(38,26,18,0.34)'; ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(t.cx, t.cy - 10 * k); ctx.scale(s, s); ctx.translate(-t.cx, -t.cy); mosPaint(ctx, t); ctx.restore();
}
// is the glint band over screen point (x, y)? 0 no, 1 edge of the band, 2 its bright middle (stepping on 2s)
function mosGlintK(x, y) {
  const d = x * 0.8 + y * 0.6 - (mod((mosT2() - MOS_SWEEP.t0) * MOS_SWEEP.v, MOS_SWEEP.per) - 200);
  return d > -70 && d < 90 ? (d > -20 && d < 40 ? 2 : 1) : 0;
}
function mosGlint(q, cx, cy) {
  const [sx, sy] = toScreen(cx, cy), k = mosGlintK(sx, sy); if (!k) return;
  mosQuad(ctx, q); ctx.fillStyle = k === 2 ? '#fffbe2' : '#f6dc82'; ctx.fill();
  if (k === 2) star4(cx, cy, 15, '#fffdf0');
}

// ---------------------------------------------------------------------
//  laying an area. e = { tiles, x0, y0, w, h, under(g) } from mosEntry. o: at (the second the laying starts) + rate
//  (tiles per second, 420), out + outDur (the second it is lifted again), or reveal (0..1) + land (tiles in the air).
//  Returns how much of it is laid (0..1).
// ---------------------------------------------------------------------
function mosLay(e, o = {}) {
  const N = e.tiles.length; if (!N) return 1;
  if (MOS_DIRECT) {
    if (e.under) e.under(ctx);
    ctx.lineWidth = 1.4; ctx.lineCap = 'butt';
    for (const t of e.tiles) { mosPaint(ctx, t); if (t.gold && MOS_LOG) MOS_LOG.push(t); }
    return 1;
  }
  let n = N, m = N;
  if (o.at != null) {
    const rate = o.rate ?? 420; n = (TT - o.at) * rate + 1e-6; m = n - rate * 2 / FPS;
    if (o.out != null && TT > o.out) { n = Math.min(n, N * (1 - (TT - o.out) / (o.outDur ?? 0.2))); m = Math.min(m, n); }
  } else if (o.reveal != null && o.reveal < 1) { n = o.reveal * N; m = n - (o.land ?? Math.max(2, N * 0.04)); }
  n = clamp(Math.floor(n), 0, N); m = clamp(Math.floor(m), 0, n);
  if (n <= 0) return 0;
  if (!e.cv) { e.cv = mosCanvas(e.w, e.h); e.g = e.cv.getContext('2d'); e.n = -1; if (!e.goldT) e.goldT = e.tiles.filter((t) => t.gold); }
  if (e.n < 0 || e.n > m) {     // (re)start the settled layer: the mortar bed first, then the tiles in order
    e.g.setTransform(1, 0, 0, 1, 0, 0); e.g.clearRect(0, 0, e.cv.width, e.cv.height); e.g.setTransform(1, 0, 0, 1, -e.x0, -e.y0);
    e.g.lineWidth = 1.4; e.g.lineCap = 'butt'; if (e.under) e.under(e.g); e.n = 0;
  }
  while (e.n < m) mosPaint(e.g, e.tiles[e.n++]);
  ctx.drawImage(e.cv, e.x0, e.y0);
  if (m < n) {
    ctx.save(); ctx.lineWidth = 1.4; ctx.lineCap = 'butt';
    if (e.clip) { ctx.beginPath(); ctx.rect(e.x0, e.y0, e.w, e.h); ctx.clip(); }
    for (let i = m; i < n; i++) mosLand(e.tiles[i], (n - i - 0.5) / (n - m));
    ctx.restore();
  } else if (m >= N && o.glint !== false) for (const t of e.goldT) mosGlint(t.q, t.cx, t.cy);
  return n / N;
}

// ---------------------------------------------------------------------
//  a row of tiles along a path Q (closed loop or open), row height hgt, tile length ~s. Pushes onto out.
// ---------------------------------------------------------------------
function mosAlong(out, Q, closed, hgt, s, gap, rgb, R, o = {}) {
  const n0 = Q.length, m = closed ? n0 : n0 - 1, cum = [0];
  for (let i = 0; i < m; i++) cum.push(cum[i] + dist(Q[i], Q[(i + 1) % n0]));
  const Lp = cum[m]; if (!(Lp > 1)) return;
  const at = (a) => {
    a = closed ? mod(a, Lp) : clamp(a, 0, Lp);
    let lo = 0, hi = m; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (cum[md] <= a) lo = md; else hi = md; }
    const p = Q[lo], q = Q[(lo + 1) % n0], u = (a - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1);
    return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  };
  const hh = Math.max(1, (hgt - gap) / 2);
  if (closed && Lp < s * 2.5) {                         // the loop is too small for a ring: one tile in the middle
    if (Lp < s * 0.8) return;
    const c = Q.reduce((a, p) => [a[0] + p[0] / n0, a[1] + p[1] / n0], [0, 0]), d = Math.min(hgt, Lp / 3) * 0.6, a0 = R.r(0, TAU), q = [];
    for (let i = 0; i < 4; i++) q.push(c[0] + Math.cos(a0 + i * TAU / 4) * d, c[1] + Math.sin(a0 + i * TAU / 4) * d);
    out.push(mosMk(q, rgb, R, o)); return;
  }
  const n = Math.max(closed ? 3 : 1, Math.round(Lp / s)), wts = []; let tot = 0;
  for (let i = 0; i < n; i++) { const w = 1 + R.n(o.irr ?? 0.2); wts.push(w); tot += w; }
  const d = Math.min(3, hgt * 0.3), g2 = Math.min(gap / 2, Lp / n * 0.2);
  const nrm = (a) => { const p = at(a - d), q = at(a + d), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [-(q[1] - p[1]) / l * hh, (q[0] - p[0]) / l * hh]; };
  let a = closed ? R.f() * Lp : 0;
  for (let i = 0; i < n; i++) {
    const a1 = a + wts[i] / tot * Lp, p0 = at(a + g2), p1 = at(a1 - g2), u = nrm(a + g2), v = nrm(a1 - g2);
    out.push(mosMk([p0[0] + u[0], p0[1] + u[1], p1[0] + v[0], p1[1] + v[1], p1[0] - v[0], p1[1] - v[1], p0[0] - u[0], p0[1] - u[1]], rgb, R, o));
    a = a1;
  }
}

// ---------------------------------------------------------------------
//  contour rows for any outline: a signed distance field on a coarse grid, then its iso-lines at half a row,
//  a row and a half, … traced by marching squares and chained into loops. Rows outside the shape (levels < 0)
//  are the halo: the ground's own tiles running once around a figure.
// ---------------------------------------------------------------------
function mosIso(D, nx, ny, g, bx, by, L) {
  const segs = [], pts = new Map(), adj = new Map();
  const pt = (id, i0, j0, i1, j1) => { if (!pts.has(id)) { const a = D[j0 * nx + i0], b = D[j1 * nx + i1], u = (L - a) / ((b - a) || 1e-9); pts.set(id, [bx + (i0 + (i1 - i0) * u) * g, by + (j0 + (j1 - j0) * u) * g]); } return id; };
  const add = (a, b) => { const k = segs.length; segs.push([a, b]); for (const id of [a, b]) { const l = adj.get(id); if (l) l.push(k); else adj.set(id, [k]); } };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const m = (D[j * nx + i] > L ? 1 : 0) | (D[j * nx + i + 1] > L ? 2 : 0) | (D[(j + 1) * nx + i + 1] > L ? 4 : 0) | (D[(j + 1) * nx + i] > L ? 8 : 0);
    if (m === 0 || m === 15) continue;
    const T = () => pt((j * nx + i) * 2, i, j, i + 1, j), Rt = () => pt((j * nx + i + 1) * 2 + 1, i + 1, j, i + 1, j + 1);
    const Bt = () => pt(((j + 1) * nx + i) * 2, i, j + 1, i + 1, j + 1), Lf = () => pt((j * nx + i) * 2 + 1, i, j, i, j + 1);
    if (m === 1 || m === 14) add(Lf(), T()); else if (m === 2 || m === 13) add(T(), Rt()); else if (m === 3 || m === 12) add(Lf(), Rt());
    else if (m === 4 || m === 11) add(Rt(), Bt()); else if (m === 6 || m === 9) add(T(), Bt()); else if (m === 7 || m === 8) add(Lf(), Bt());
    else if (m === 5) { add(Lf(), T()); add(Rt(), Bt()); } else { add(T(), Rt()); add(Lf(), Bt()); }
  }
  const used = new Uint8Array(segs.length), loops = [];
  const grow = (chain, end) => {       // follow unused segments from one end; true when the loop closes
    for (;;) {
      const cur = end ? chain[chain.length - 1] : chain[0], k = adj.get(cur).find((q) => !used[q]); if (k == null) return false;
      used[k] = 1; const nxt = segs[k][0] === cur ? segs[k][1] : segs[k][0];
      if (nxt === (end ? chain[0] : chain[chain.length - 1])) return true;
      if (end) chain.push(nxt); else chain.unshift(nxt);
    }
  };
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue; used[k] = 1;
    const chain = [segs[k][0], segs[k][1]], closed = grow(chain, true) || grow(chain, false);
    if (chain.length >= 3) loops.push({ P: chain.map((id) => pts.get(id)), closed });
  }
  return loops;
}
function mosContour(P, col, o, key) {
  const s = o.s ?? 17, gap = o.gap ?? 2.2, hr = o.halo ? (o.haloRows ?? 1) : 0, pad = Math.ceil(hr * s + 6);
  const bb = bbox(P, pad), bx = Math.floor(bb.x0), by = Math.floor(bb.y0), g = clamp(s / 5, 2.2, 4), n = P.length;
  const nx = Math.ceil((bb.x1 - bx) / g) + 2, ny = Math.ceil((bb.y1 - by) / g) + 2, D = new Float32Array(nx * ny);
  const ax = new Float64Array(n), ay = new Float64Array(n), ex = new Float64Array(n), ey = new Float64Array(n), il = new Float64Array(n);
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; ax[i] = a[0]; ay[i] = a[1]; ex[i] = b[0] - a[0]; ey[i] = b[1] - a[1]; il[i] = 1 / ((ex[i] * ex[i] + ey[i] * ey[i]) || 1e-9); }
  let dmax = 0;
  for (let j = 0; j < ny; j++) {
    const y = by + j * g + 0.0137, xs = [];
    for (let i = 0; i < n; i++) if ((ay[i] > y) !== (ay[i] + ey[i] > y)) xs.push(ax[i] + (y - ay[i]) / ey[i] * ex[i]);
    xs.sort((p, q) => p - q);
    let xi = 0;
    for (let i = 0; i < nx; i++) {
      const x = bx + i * g; while (xi < xs.length && xs[xi] < x) xi++;
      let best = 1e18;
      for (let e = 0; e < n; e++) { const px = x - ax[e], py = y - ay[e]; let u = (px * ex[e] + py * ey[e]) * il[e]; u = u < 0 ? 0 : u > 1 ? 1 : u; const qx = px - ex[e] * u, qy = py - ey[e] * u, d2 = qx * qx + qy * qy; if (d2 < best) best = d2; }
      const d = Math.sqrt(best) * (xi & 1 ? 1 : -1); D[j * nx + i] = d; if (d > dmax) dmax = d;
    }
  }
  const nrows = Math.max(1, Math.round(dmax / s)), h = dmax / nrows, rr = o.rim ? (o.rimRows ?? 1) : 0, R = RNG('mosfill', key), tiles = [];
  const rowCol = (k) => (k < rr ? o.rim : typeof o.rows === 'function' ? o.rows(k - rr, nrows - rr) : o.rows ? o.rows[Math.min(k - rr, o.rows.length - 1)] : col);
  for (let k = 0; k < nrows; k++) {
    const rgb = mosRGB(rowCol(k)), oo = k < rr ? { ...o, gold: 0 } : o;
    for (const lp of mosIso(D, nx, ny, g, bx, by, (k + 0.5) * h)) mosAlong(tiles, lp.P, lp.closed, Math.min(h, s * 1.5), Math.min(s, Math.max(h, s * 0.7)) * 1.05, gap, rgb, R, oo);
  }
  for (let k = 0; k < hr; k++) for (const lp of mosIso(D, nx, ny, g, bx, by, -(k + 0.5) * s)) mosAlong(tiles, lp.P, lp.closed, s, s * 1.05, gap, mosRGB(o.halo), R, { ...o, gold: 0 });
  const bed = o.bed ?? mosMix(MOS.grout, o.rim ?? col, 0.3);
  return { tiles, x0: bx, y0: by, w: nx * g, h: ny * g, under: (c2) => {
    if (hr) { mosPath(c2, P); c2.lineJoin = 'round'; c2.lineWidth = 2 * hr * s + 2; c2.strokeStyle = MOS.grout; c2.stroke(); c2.lineWidth = 1.4; }
    mosPath(c2, P); c2.fillStyle = bed; c2.fill();
  } };
}
//  mosFill(outline, colour, opts): tile ANY closed outline with contour-following rows.
//   o: key (seeds the cut of the tiles: keep it stable), s (tile size, 17), gap (grout, 2.2), rim (colour of the
//      outline row), rimRows (1), rows ([colours] from the outside in after the rim, or (k, n) => colour),
//      halo (colour of rows laid around the outside) + haloRows (1), gold (chance of a gold-glass tile), vary (0.1),
//      bed (mortar colour), and the laying: at + rate, out + outDur, or reveal (see mosLay). A static outline only:
//      something that moves is a mosGroup.
function mosFill(P, col, o = {}) {
  const id = 'fill:' + (o.key ?? '') + mosHashPts(P) + col + (o.rim ?? '') + (o.halo ?? '') + (o.s ?? '') + (typeof o.rows === 'object' ? o.rows.join('') : '');
  if (o.nocache) return mosLay(mosContour(P, col, o, o.key ?? col), o);
  return mosLay(mosEntry(id, () => mosContour(P, col, o, o.key ?? col)), o);
}
//  mosLine(path, colour, opts): rows of tiles along an open path (a wave, a stem, a ray). o: rows (1), s, key, + laying
function mosLine(P, col, o = {}) {
  const s = o.s ?? 15, gap = o.gap ?? 2.2, nr = o.rows ?? 1, id = 'line:' + (o.key ?? '') + mosHashPts(P) + col + s + nr;
  return mosLay(mosEntry(id, () => {
    const R = RNG('mosline', o.key ?? col), Q = resample(P, false, 6), tiles = [], bb = bbox(P, nr * s + 6), x0 = Math.floor(bb.x0), y0 = Math.floor(bb.y0);
    for (let r = 0; r < nr; r++) mosAlong(tiles, nr > 1 ? mosOffset(Q, (r - (nr - 1) / 2) * s, false) : Q, false, s, s * 1.05, gap, mosRGB(Array.isArray(col) ? col[r % col.length] : col), R, o);
    return { tiles, x0, y0, w: bb.x1 - x0, h: bb.y1 - y0, under: (g) => { mosPath(g, Q, false); g.lineJoin = 'round'; g.lineCap = 'butt'; g.lineWidth = nr * s + 1; g.strokeStyle = o.bed ?? MOS.grout; g.stroke(); g.lineWidth = 1.4; } };
  }), o);
}
//  one loose tessera, drawn straight (bubbles, drops, sparkles, eyes). o: w, h, rot, key, at (lands at that second),
//  lift (0..1: held above the floor with a shadow), gold (it glints)
function mosChip(x, y, sz, col, o = {}) {
  const w = (o.w ?? sz) / 2, h = (o.h ?? sz) / 2, c = Math.cos(o.rot ?? 0), s = Math.sin(o.rot ?? 0), q = [];
  for (const [u, v] of [[-w, -h], [w, -h], [w, h], [-w, h]]) q.push(x + u * c - v * s, y + u * s + v * c);
  const t = mosMk(q, mosRGB(col), RNG('moschip', o.key ?? col), { vary: o.vary ?? 0.04, jit: sz * 0.05 });
  ctx.lineWidth = 1.4; ctx.lineCap = 'butt';
  if (o.at != null) { const p = (TT - o.at) * FPS / 2 + 0.25; if (p < 0.2) return; if (p < 1) return mosLand(t, p); }
  if (o.lift) mosLand(t, 1 - o.lift); else mosPaint(ctx, t);
  if (o.gold && !MOS_DIRECT) mosGlint(t.q, x, y);
}

// ---------------------------------------------------------------------
//  grounds: straight rows, or the fan (scallop) pattern; frames and bands
// ---------------------------------------------------------------------
function mosRowsGen(x, y, w, h, col, o, R) {
  const s = o.s ?? 17, gap = (o.gap ?? 2.2) / 2, nr = Math.max(1, Math.round(h / s)), rh = h / nr, tiles = [], c1 = mosRGB(col), c2 = o.c2 ? mosRGB(o.c2) : c1, wv = o.wavy ?? 0;
  for (let r = 0; r < nr; r++) {
    const row = [], y0 = y + r * rh; let xx = x, first = true;
    while (xx < x + w - 0.5) {
      let x1 = xx + s * (1 + R.n(0.24)) * (first ? R.r(0.45, 1) : 1); first = false; if (x + w - x1 < s * 0.5) x1 = x + w;
      const f = (px) => (wv ? wv * Math.sin(px * 0.011 + r * 0.33) : 0);
      row.push(mosMk([xx + gap, y0 + gap + f(xx), x1 - gap, y0 + gap + f(x1), x1 - gap, y0 + rh - gap + f(x1), xx + gap, y0 + rh - gap + f(xx)], o.mix && R.f() < o.mix ? c2 : c1, R, o));
      xx = x1;
    }
    if (r % 2) row.reverse();
    for (const t of row) tiles.push(t);
  }
  return tiles;
}
function mosFanGen(x, y, w, h, col, o, R) {
  const s = o.s ?? 17, gap = o.gap ?? 2.2, rings = o.rings ?? 6, RR = rings * s, hh = (s - gap) / 2, tiles = [];
  const c1 = mosRGB(col), c2 = mosRGB(o.c2 ?? col), c3 = mosRGB(o.c3 ?? col), nj = Math.ceil(h / RR) + 2, ni = Math.ceil(w / (2 * RR)) + 2;
  for (let j = 0; j <= nj; j++) for (let ii = -1; ii <= ni; ii++) {
    const cx = x + (ii + (j % 2) * 0.5) * 2 * RR, cy = y + (j - 0.4) * RR;
    if (cx < x - RR || cx > x + w + RR || cy - RR > y + h) continue;
    tiles.push({ poly: ellipsePts(cx, cy, RR, RR, 0, 30), c: MOS.grout, cx, cy });      // this fan's mortar, over the row above
    for (let k = 0; k < rings; k++) {
      const r = RR - (k + 0.5) * s, n = Math.max(3, Math.round(TAU * r / (s * 1.04))), off = R.f() * TAU / n, da = Math.PI / n - gap / (2 * r), rgb = k === 0 ? c2 : k === rings - 1 ? c3 : c1;
      for (let t = 0; t < n; t++) {
        const a = Math.PI + off + t * TAU / n, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (px < x - s || px > x + w + s || py < y - s || py > y + h + s) continue;
        if (Math.hypot(px - cx - RR, py - cy - RR) < RR - s * 0.5 || Math.hypot(px - cx + RR, py - cy - RR) < RR - s * 0.5) continue;   // under the next row's fans
        const q = []; for (const [rr, aa] of [[r + hh, a - da], [r + hh, a + da], [r - hh, a + da], [r - hh, a - da]]) q.push(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
        tiles.push(mosMk(q, rgb, R, o));
      }
    }
  }
  return tiles;
}
//  mosField(x, y, w, h, colour, opts): a rectangular ground. o: pattern ('rows' | 'fan'), key, s, c2 (rows: a second
//   colour mixed in with chance `mix`; fan: the outer arc of every fan), c3 (fan: the innermost ring), rings (6 per fan),
//   wavy (rows undulate by this many px), gold, vary, bed (false = no mortar painted under the rows), + laying.
//   A fan field brings its own mortar fan by fan, so whatever was sketched on the bed stays visible until it is covered.
function mosField(x, y, w, h, col, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const pat = o.pattern ?? 'rows', id = 'fld:' + [o.key ?? '', pat, x, y, w, h, col, o.c2 ?? '', o.s ?? ''].join(',');
  return mosLay(mosEntry(id, () => {
    const R = RNG('mosfld', o.key ?? pat, col);
    return { tiles: (pat === 'fan' ? mosFanGen : mosRowsGen)(x, y, w, h, col, o, R), x0: x, y0: y, w, h, clip: true, under: pat === 'fan' || o.bed === false ? null : (g) => { g.fillStyle = MOS.grout; g.fillRect(x, y, w, h); } };
  }), o);
}
// border patterns, read from the outside in; '#' = the dark stone
const MOS_PAT = {
  meander: ['......', '#####.', '#...#.', '#.###.', '#.....', '######'],
  checker: ['#.', '.#', '#.'],
  dentil: ['....', '##..', '##..', '####'],
  wave: ['........', '.##.....', '####....', '#####..#', '########'],
};
//  mosBorder(x, y, w, h, opts): a frame band around that rectangle (the band lies inside it). o: kind ('meander' |
//   'checker' | 'dentil' | 'wave'), s (13), c (dark), c2 (light), key, + laying. mosBorderW(o) = the band's thickness.
const mosBorderW = (o = {}) => MOS_PAT[o.kind ?? 'meander'].length * (o.s ?? 13);
function mosBorder(x, y, w, h, o = {}) {
  const kind = o.kind ?? 'meander', s = o.s ?? 13, id = 'brd:' + [o.key ?? '', kind, x, y, w, h, s, o.c ?? '', o.c2 ?? ''].join(',');
  return mosLay(mosEntry(id, () => {
    const pat = MOS_PAT[kind], nr = pat.length, per = pat[0].length, th = nr * s, g2 = (o.gap ?? 2) / 2, R = RNG('mosbrd', o.key ?? kind), tiles = [];
    const c1 = mosRGB(o.c ?? MOS.lapis), c0 = mosRGB(o.c2 ?? MOS.marble), gd = mosRGB(MOS.gold);
    const cell = (ox, oy, ux, uy, vx, vy, u0, u1, v0, v1, rgb) => { const q = []; for (const [u, v] of [[u0 + g2, v0 + g2], [u1 - g2, v0 + g2], [u1 - g2, v1 - g2], [u0 + g2, v1 - g2]]) q.push(ox + ux * u + vx * v, oy + uy * u + vy * v); tiles.push(mosMk(q, rgb, R, { vary: o.vary ?? 0.08, jit: 0.8 })); };
    const corner = (ox, oy, ux, uy, vx, vy) => { for (let c = 0; c < nr; c++) for (let r = 0; r < nr; r++) { const k = Math.min(r, c, nr - 1 - r, nr - 1 - c); cell(ox, oy, ux, uy, vx, vy, c * s, c * s + s, r * s, r * s + s, k === (nr >> 1) - 1 + (nr % 2) ? gd : k % 2 ? c1 : c0); } };
    const side = (ox, oy, ux, uy, vx, vy, len) => { const nc = Math.max(per, Math.round(len / s / per) * per), cw = len / nc; corner(ox - ux * th, oy - uy * th, ux, uy, vx, vy); for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) cell(ox, oy, ux, uy, vx, vy, c * cw, c * cw + cw, r * s, r * s + s, pat[r][c % per] === '#' ? c1 : c0); };
    side(x + th, y, 1, 0, 0, 1, w - 2 * th); side(x + w, y + th, 0, 1, -1, 0, h - 2 * th); side(x + w - th, y + h, -1, 0, 0, -1, w - 2 * th); side(x, y + h - th, 0, -1, 1, 0, h - 2 * th);
    return { tiles, x0: x, y0: y, w, h, under: (g) => { g.fillStyle = MOS.grout; g.fillRect(x, y, w, th); g.fillRect(x, y + h - th, w, th); g.fillRect(x, y, th, h); g.fillRect(x + w - th, y, th, h); } };
  }), o);
}
//  mosGuilloche(x, y, w, opts): a horizontal band with two plaited wave rows and a gold stud in every eye.
//   o: s (13), c (ground), c1 / c2 (the two strands), key, + laying. The band is 5 tiles tall, its top edge at y.
function mosGuilloche(x, y, w, o = {}) {
  const s = o.s ?? 13, th = 5 * s, per = Math.round(th * 1.9), key = o.key ?? 'gui';
  const k = mosField(x, y, w, th, o.c ?? MOS.lapis, { ...o, s, key: key + 'g' });
  const strand = (ph) => { const P = []; for (let px = 0; px <= w; px += 6) P.push([x + px, y + th / 2 + Math.sin(px / per * TAU + ph) * th * 0.3]); return P; };
  const lo = o.at != null ? { at: o.at + 0.12, rate: o.rate } : { reveal: o.reveal };
  mosLine(strand(0), o.c1 ?? MOS.marble, { ...lo, s: s - 1, key: key + 'a' }); mosLine(strand(Math.PI), o.c2 ?? MOS.ochre, { ...lo, s: s - 1, key: key + 'b' });
  if (k >= 1) for (let px = per / 4; px < w - s; px += per / 2) mosChip(x + px, y + th / 2, s - 2, MOS.gold, { key: key + px, gold: true });
  return k;
}
// the plain floor (grout + bevels + a little tone per tile, see-through where the stone is): any colour shows through it
function mosFloorCv() {
  return mosEntry('floor', () => {
    const cv = mosCanvas(W, H), g = cv.getContext('2d'), R = RNG('mosfloor');
    g.fillStyle = MOS.grout; g.fillRect(0, 0, W, H); g.lineWidth = 1.6;
    for (const t of mosRowsGen(0, 0, W, H, '#808080', { s: 24, gap: 2.6, jit: 1.2 }, R)) {
      mosQuad(g, t.q); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill(); g.globalCompositeOperation = 'source-over';
      const k = R.n(0.1); g.fillStyle = k > 0 ? `rgba(255,248,230,${k})` : `rgba(40,26,16,${-k})`; g.fill();
      const ln = (e, c) => { if (!e.length) return; g.beginPath(); for (let i = 0; i < e.length; i += 4) { g.moveTo(e[i], e[i + 1]); g.lineTo(e[i + 2], e[i + 3]); } g.strokeStyle = c; g.stroke(); };
      ln(t.hi, 'rgba(255,250,236,0.42)'); ln(t.lo, 'rgba(40,26,16,0.2)');
    }
    return { cv };
  }).cv;
}
function mosFloor(c = MOS.paper) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.drawImage(mosFloorCv(), 0, 0); }
// the bare mortar bed a picture is laid on (speckled), and the sinopia: the under-drawing sketched on it
function mosBed(x, y, w, h) {
  const e = mosEntry('bed:' + [x, y, w, h].join(','), () => {
    const cv = mosCanvas(w, h), g = cv.getContext('2d'), R = RNG('mosbed', w, h);
    g.fillStyle = MOS.grout; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 260; i++) { g.fillStyle = R.f() < 0.5 ? 'rgba(120,96,62,0.16)' : 'rgba(255,250,236,0.3)'; g.fillRect(R.r(0, w), R.r(0, h), R.r(1.5, 3.5), R.r(1.5, 3.5)); }
    return { cv };
  });
  ctx.drawImage(e.cv, x, y);
}
function mosSketch(P, o = {}) {
  ctx.save(); ctx.strokeStyle = o.c ?? MOS.sinopia; ctx.globalAlpha = o.al ?? 0.6; ctx.lineWidth = (o.w ?? 3.5) / mosZoom(); ctx.setLineDash([16, 8]); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  mosPath(ctx, P, o.closed ?? true); ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  rigid groups: tiles painted once into their own canvas, then moved as one piece (with a small shadow)
//  mosGroup(key, w, h, ox, oy, draw): draw() is called once with world point (ox, oy) at the canvas centre
//  mosStamp(group, x, y, { rot, flip, lift, shadow }): put it down with (ox, oy) at (x, y)
// ---------------------------------------------------------------------
function mosGroup(key, w, h, ox, oy, draw) {
  return mosEntry('grp:' + key, () => {
    const cv = mosCanvas(w, h), keep = ctx, kd = MOS_DIRECT, kl = MOS_LOG;
    ctx = cv.getContext('2d'); ctx.translate(Math.round(cv.width / 2) - ox, Math.round(cv.height / 2) - oy); MOS_DIRECT = true; MOS_LOG = [];
    draw();
    const gold = MOS_LOG.map((t) => ({ q: t.q.map((v, i) => v - (i % 2 ? oy : ox)), cx: t.cx - ox, cy: t.cy - oy }));
    ctx = keep; MOS_DIRECT = kd; MOS_LOG = kl;
    const sh = mosCanvas(w, h), sg = sh.getContext('2d'); sg.drawImage(cv, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgb(38,26,18)'; sg.fillRect(0, 0, sh.width, sh.height);
    return { cv, sh, hw: Math.round(cv.width / 2), hh: Math.round(cv.height / 2), gold };
  });
}
function mosPut(grp, x, y, rot = 0, flip = 1, shadow = false) {
  ctx.save(); ctx.translate(x, y); if (flip < 0) ctx.scale(-1, 1); if (rot) ctx.rotate(rot);
  ctx.drawImage(shadow ? grp.sh : grp.cv, -grp.hw, -grp.hh);
  if (!shadow) for (const t of grp.gold) mosGlint(t.q, t.cx, t.cy);
  ctx.restore();
}
function mosStamp(grp, x, y, o = {}) {
  const lift = o.lift ?? 0;
  if (o.shadow !== false) { ctx.save(); ctx.globalAlpha = 0.3; mosPut(grp, x + 4 + lift * 0.6, y + 6 + lift, o.rot, o.flip, true); ctx.restore(); }
  mosPut(grp, x, y, o.rot, o.flip);
}

// ---------------------------------------------------------------------
//  type: sturdy roman letters cut into tesserae (the glyphs are sliced by grout lines and toned cell by cell)
// ---------------------------------------------------------------------
let MOS_MEAS = null;
const mosFont = (size) => `700 ${size}px ${MOS_SERIF}`;
function mosTextW(str, size) { MOS_MEAS = MOS_MEAS || mosCanvas(4, 4).getContext('2d'); MOS_MEAS.font = mosFont(size); return MOS_MEAS.measureText(str).width; }
function mosTextCv(str, size, col) {
  return mosEntry('txt:' + [str, size, col].join('|'), () => {
    const pad = Math.ceil(size * 0.16), w = Math.ceil(mosTextW(str, size)) + 2 * pad, h = Math.ceil(size * 1.5), cv = mosCanvas(w, h), g = cv.getContext('2d'), R = RNG('mostxt', str, size);
    g.font = mosFont(size); g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(str, pad, size * 1.08);
    const c = size * 0.2; g.globalCompositeOperation = 'source-atop';
    for (let yy = 0; yy < h; yy += c) for (let xx = 0; xx < w; xx += c) { const k = R.n(0.13); g.fillStyle = k > 0 ? `rgba(255,246,224,${k})` : `rgba(20,14,10,${-k})`; g.fillRect(xx, yy, c + 1, c + 1); }
    g.globalCompositeOperation = 'destination-out'; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = Math.max(1.1, size * 0.02); g.beginPath();
    for (let xx = c; xx < w; xx += c) { g.moveTo(xx + R.n(1), 0); g.lineTo(xx + R.n(1), h); }
    for (let yy = c * 0.6; yy < h; yy += c) { g.moveTo(0, yy + R.n(0.8)); g.lineTo(w, yy + R.n(0.8)); }
    g.stroke();
    return { cv, pad, base: size * 1.08, w };
  });
}
//  mosText(str, x, y, size, colour, { align: 'left' | 'center' | 'right' }): y is the baseline
function mosText(str, x, y, size, col, o = {}) {
  const e = mosTextCv(str, size, col), tw = e.w - 2 * e.pad, x0 = o.align === 'center' ? x - tw / 2 : o.align === 'right' ? x - tw : x;
  ctx.drawImage(e.cv, Math.round(x0 - e.pad), Math.round(y - e.base)); return tw;
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). A caption is a band of plain marble tiles
//  inside a darker tile border, fully opaque, laid column by column with its letters; the *word* sits on an inlaid
//  panel of light coloured tiles (gold, turquoise, rose). A tag is a small gold band with an umber border. Both are lifted again just before a
//  bridge and are not laid until a bridge is over.
// ---------------------------------------------------------------------
function mosBand(key, x0, y0, nc, nr, s, field, edge, tabs, hi) {
  return mosEntry('band:' + [key, x0, y0, nc, nr, s, field, edge, hi].join(','), () => {
    const R = RNG('mosband', key), tiles = [], g2 = 1.1, cf = mosRGB(field), ce = mosRGB(edge), ch = mosRGB(hi ?? field);
    for (let c = 0; c < nc; c++) for (let rr = -1; rr < nr; rr++) {
      if (rr < 0) { const xa = x0 + c * s; tiles.push({ poly: [[xa, y0], [xa + s, y0], [xa + s, y0 + nr * s], [xa, y0 + nr * s]], c: MOS.grout, cx: xa, cy: y0 }); continue; }   // this column's mortar
      const r = c % 2 ? nr - 1 - rr : rr, rim = c === 0 || c === nc - 1 || r === 0 || r === nr - 1, xa = x0 + c * s, ya = y0 + r * s;
      const tab = !rim && tabs.some(([a, b]) => xa + s / 2 > a && xa + s / 2 < b);
      tiles.push(mosMk([xa + g2, ya + g2, xa + s - g2, ya + g2, xa + s - g2, ya + s - g2, xa + g2, ya + s - g2], rim ? ce : tab ? ch : cf, R, { vary: rim ? 0.09 : 0.035, jit: 0.7 }));
    }
    return { tiles, x0, y0, w: nc * s, h: nr * s, clip: true };
  });
}
function mosBridgeTimes(at) {     // when this era's overlay may start (after an opening bridge) and when it is lifted (before the next one)
  let t0 = E0 + at, out = null;
  if (typeof BRIDGES !== 'undefined') for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (Math.abs(r.tc - E0) < 1e-6) t0 = Math.max(t0, r.tc + d + 1 / FPS);
    else if (r.tc > E0 && (out == null || r.tc - d - 0.06 < out)) out = r.tc - d - 0.06;
  }
  return { t0, out };
}
//   o: y (the band's centre, 1392), x (CX), size (60), at (seconds after the era starts, 0.5), field, edge, hi (panel), col
function mosCaptionNow(str, o = {}) {
  const size = o.size ?? 60, s = 20, nr = 6, cx = o.x ?? CX, cy = o.y ?? 1392, field = o.field ?? MOS.marble, hi = o.hi ?? MOS.turq, col = o.col ?? MOS.char, { t0, out } = mosBridgeTimes(o.at ?? 0.5);
  if (TT < t0) return;
  const toks = str.split('*').map((t, i) => ({ s: t.trim(), hi: i % 2 === 1 })).filter((t) => t.s), pad = s * 0.7;
  toks.forEach((t, i) => { t.w = mosTextW(t.s, size); t.gap = i === 0 ? 0 : (/^[!?.,]/.test(t.s) ? size * 0.05 : size * 0.27) + (t.hi || toks[i - 1].hi ? pad : 0); });
  const tw = toks.reduce((a, t) => a + t.w + t.gap, 0), nc = Math.ceil((tw + size * 1.5) / s), x0 = Math.round(cx - nc * s / 2), y0 = Math.round(cy - nr * s / 2);
  let xx = cx - tw / 2; const tabs = [];
  for (const t of toks) { xx += t.gap; t.x = xx; if (t.hi) tabs.push([t.x - pad, t.x + t.w + pad]); xx += t.w; }
  const e = mosBand('cap' + str, x0, y0, nc, nr, s, field, o.edge ?? MOS.umber, tabs, hi), N = e.tiles.length;
  const k = mosLay(e, { at: t0, rate: N / 0.36, out, outDur: 0.2, glint: false }); if (k <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, Math.floor(k * nc) * s, nr * s); ctx.clip();
  for (const t of toks) mosText(t.s, t.x, cy + size * 0.33, size, t.hi ? (mosLum(hi) > 0.55 ? MOS.char : MOS.marble) : col);
  ctx.restore();
}
//   o: x (70, the left edge), y (300, the centre), size (46), at (0.25), c (the band: a light colour), edge, col
function mosTagNow(str, o = {}) {
  const size = o.size ?? 46, s = 17, nr = 5, c = o.c ?? MOS.gold, { t0, out } = mosBridgeTimes(o.at ?? 0.25);
  if (TT < t0) return;
  const tw = mosTextW(str, size), nc = Math.ceil((tw + size * 1.3) / s), x0 = Math.round(o.x ?? 70), y0 = Math.round((o.y ?? 300) - nr * s / 2);
  const e = mosBand('tag' + str, x0, y0, nc, nr, s, c, o.edge ?? MOS.umber, [], null), N = e.tiles.length;
  const k = mosLay(e, { at: t0, rate: N / 0.25, out, outDur: 0.16, glint: false }); if (k <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, Math.floor(k * nc) * s, nr * s); ctx.clip();
  mosText(str, x0 + nc * s / 2, y0 + nr * s / 2 + size * 0.33, size, o.col ?? (mosLum(c) > 0.55 ? MOS.char : MOS.marble), { align: 'center' });
  ctx.restore();
}
const mosCaption = (str, o = {}) => { const f = () => mosCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const mosTag = (str, o = {}) => { const f = () => mosTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the hero: Sisik, a small terracotta fish of ~60 tiles with one gold tile for an eye. Body and tail are two
//  rigid groups; the tail flips between two angles on 2s. (x, y) = the body centre, r = half its length.
//   o: flip (-1 faces left), tilt (rad, nose up < 0), lift (px above the floor: the shadow moves away), mood
//      ('smile' | 'wow' | 'happy'), tail (-1..1, default a slow wag), c (body colour: other fish), key, eye (false = none)
// ---------------------------------------------------------------------
function mosFishBody(r) { const P = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, c = Math.cos(a); P.push([(0.16 + 0.62 * c) * r, 0.42 * Math.sin(a) * r * (0.4 + 0.6 * Math.pow(0.5 + 0.5 * c, 0.55))]); } return P; }
const mosFishTail = (r) => [[0.1, -0.05], [-0.5, -0.44], [-0.36, 0], [-0.5, 0.44], [0.1, 0.05]].map(([x, y]) => [x * r, y * r]);
function mosHeroPts(x, y, r) {
  const b = mosFishBody(r), P = [];
  for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; if (Math.abs(a - Math.PI) < 0.42) { if (!P.tail) { P.tail = 1; P.push([x - 0.92 * r, y + 0.44 * r], [x - 0.78 * r, y], [x - 0.92 * r, y - 0.44 * r]); } } else P.push([x + b[i][0], y + b[i][1]]); }
  return P;
}
function mosHero(x, y, r, o = {}) {
  r = Math.max(20, Math.round(r));
  const c = o.c ?? MOS.terra, s = clamp(r * 0.125, 11, 18), key = 'fish' + r + c, flip = o.flip ?? 1, tilt = o.tilt ?? 0, lift = o.lift ?? 0, mood = o.mood ?? 'smile';
  const body = mosGroup(key + 'b', r * 1.8, r * 1.3, 0, 0, () => {
    mosFill(mosFishBody(r), c, { key: key + 'b', s, rim: mosTone(c, -0.38), rows: [mosTone(c, 0.12), c, mosTone(c, 0.3)], vary: 0.09 });
    mosChip(-0.02 * r, -0.37 * r, s, mosTone(c, -0.3), { key: key + 'f1', w: s * 1.5, rot: -0.25 }); mosChip(0.08 * r, 0.38 * r, s * 0.9, mosTone(c, -0.3), { key: key + 'f2', w: s * 1.3, rot: 0.3 });
    if (o.eye !== false) mosChip(0.47 * r, -0.07 * r, s * 1.5, MOS.char, { key: key + 'e0' });
  });
  const tail = mosGroup(key + 't', r * 1.5, r * 1.5, 0, 0, () => mosFill(mosFishTail(r), mosTone(c, -0.12), { key: key + 't', s, rim: mosTone(c, -0.38), vary: 0.09 }));
  const wag = (o.tail ?? ((B % 4) < 2 ? 1 : -1)) * (mood === 'happy' ? 0.5 : 0.3);
  const parts = (sh) => { ctx.save(); ctx.translate(-0.4 * r, 0); ctx.rotate(wag); ctx.drawImage(sh ? tail.sh : tail.cv, -tail.hw, -tail.hh); ctx.restore(); ctx.drawImage(sh ? body.sh : body.cv, -body.hw, -body.hh); };
  ctx.save(); ctx.translate(x + 4 + lift * 0.6, y + 6 + lift); ctx.scale(flip, 1); ctx.rotate(tilt); ctx.globalAlpha = 0.3; parts(true); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1); ctx.rotate(tilt); parts(false);
  if (o.eye !== false) {
    const blink = mod(B + hash(o.key ?? 'sisik') % 31, 36) === 35, es = s * (mood === 'wow' ? 1.25 : 0.95);
    if (!blink) mosChip(0.47 * r, -0.07 * r, es, MOS.gold, { key: key + 'e1', gold: true });
    if (mood !== 'smile') for (let i = 0; i < 3; i++) {     // little gold chips thrown up beside the head: surprise / joy
      const a = -1.9 + i * 0.5 + (mood === 'happy' ? 0.25 * ((B % 2) ? 1 : -1) : 0), d = r * (1.02 + 0.12 * ((B + i) % 2));
      mosChip(0.3 * r + Math.cos(a) * d, Math.sin(a) * d, s * 0.62, MOS.gold, { key: key + 'sp' + i, rot: a, lift: 0.5 });
    }
  }
  ctx.restore();
  SPARK_AT = toScreen(x, y);
}

// ---------------------------------------------------------------------
//  props
// ---------------------------------------------------------------------
// a medallion: a disc whose contour rows are rings. Pearls, suns, fruit. The same rule gives the morphing blob its rows.
const mosMedRows = (c) => [c, mosTone(c, -0.17), c, mosTone(c, 0.38), c, mosTone(c, -0.1)];
const mosDiscPts = (x, y, r) => ellipsePts(x, y, r, r, 0, 72);
function mosMedallion(x, y, r, c, o = {}) { return mosFill(mosDiscPts(x, y, r), c, { rim: mosTone(c, -0.45), rows: mosMedRows(c), ...o, key: o.key ?? 'med' }); }
// a wavy row of pale tiles that slides along in 8 steps. o: amp (15), len (150), c, rows, key, + laying
function mosWave(x0, x1, y, o = {}) {
  const amp = o.amp ?? 15, len = o.len ?? 150, ph = (Math.floor(B / 3) % 8) / 8 * TAU * (o.dir ?? 1), P = [];
  for (let x = x0; x <= x1; x += 10) P.push([x, y + amp * Math.sin((x - x0) / len * TAU - ph) + amp * 0.35 * Math.sin((x - x0) / len * TAU * 2 - ph)]);
  return mosLine(P, o.c ?? MOS.marble, { s: 15, ...o, key: (o.key ?? 'wave') });
}
const mosWavePts = (x0, x1, y, amp = 15, len = 150) => { const P = []; for (let x = x0; x <= x1; x += 10) P.push([x, y + amp * Math.sin((x - x0) / len * TAU)]); return P; };
// a scallop shell standing on its hinge at (x, y); r = its height. Ribs are laid after the body.
function mosShellPts(x, y, r) {
  const P = [[x - 0.15 * r, y], [x - 0.2 * r, y - 0.1 * r]];
  for (let i = 0; i <= 56; i++) { const a = (-166 + 152 * i / 56) * DEG, k = r * (0.93 + 0.07 * Math.abs(Math.cos((i / 56) * Math.PI * 7))); P.push([x + Math.cos(a) * k, y - 0.06 * r + Math.sin(a) * k]); }
  P.push([x + 0.2 * r, y - 0.1 * r], [x + 0.15 * r, y]);
  return P;
}
function mosShell(x, y, r, o = {}) {
  const key = o.key ?? 'shell', lay = (d) => (o.at != null ? { at: o.at + d, rate: o.rate ?? 520 } : {});
  const k = mosFill(mosShellPts(x, y, r), MOS.sand, { key, rim: MOS.umber, rows: [MOS.rose, MOS.sand, MOS.marble, MOS.sand, MOS.rose], halo: o.halo, ...lay(0) });
  for (let i = 0; i < 5; i++) { const a = (-150 + 30 * i) * DEG; mosLine([[x + Math.cos(a) * r * 0.2, y - 0.06 * r + Math.sin(a) * r * 0.2], [x + Math.cos(a) * r * 0.84, y - 0.06 * r + Math.sin(a) * r * 0.84]], MOS.ochre, { key: key + 'rib' + i, s: 12, ...lay(0.45 + i * 0.03) }); }
  return k;
}
// seaweed: fronds of olive tiles that lean left and right on 2s. (x, y) = the root, h = height
function mosSeaweed(x, y, h, o = {}) {
  const pose = (Math.floor(B / 4) % 2) ? 1 : -1, n = o.n ?? 3;
  for (let i = 0; i < n; i++) {
    const hh = h * (1 - 0.22 * Math.abs(i - (n - 1) / 2) - 0.1 * (i % 2)), bx = x + (i - (n - 1) / 2) * 34, P = [];
    for (let k = 0; k <= 10; k++) { const u = k / 10; P.push([bx + Math.sin(u * 4.2 + i * 1.7) * 16 * u + pose * 15 * u * u, y - hh * u]); }
    mosLine(P, i % 2 ? MOS.oliveD : MOS.olive, { s: 14, ...o, key: (o.key ?? 'weed') + i });
  }
}
// bubbles: loose round-ish marble chips rising in steps from (x, y). o: n (4), rise (260), speed, key
function mosBubbles(x, y, o = {}) {
  const n = o.n ?? 4, rise = o.rise ?? 260, T = mosT2();
  for (let i = 0; i < n; i++) {
    const R = RNG('mosbub', o.key ?? 'b', i), u = mod(T * (o.speed ?? 0.42) + i / n + R.f() * 0.2, 1); if (T < (o.from ?? 0) + i * 0.12) continue;
    mosChip(x + R.n(26) + Math.sin(u * 9 + i) * 10, y - u * rise, 11 + 9 * R.f(), i % 2 ? MOS.marble : MOS.turq, { key: 'bub' + (o.key ?? '') + i, rot: 0.6 + u * 2, lift: 0.45 });
  }
}
// a five-armed starfish
function mosStar(x, y, r, o = {}) { return mosFill(starPts(x, y, r, 5, o.rot ?? -Math.PI / 2, 80), o.c ?? MOS.ochre, { s: 13, rim: MOS.umber, rows: [MOS.ochre, MOS.gold], gold: 0.25, ...o, key: o.key ?? 'star' }); }
// a tree: an umber trunk from (x, base) into a bumpy olive crown { x, y, r }
function mosCrownPts(cx, cy, r, key = 'crown') { const R = RNG('moscrown', key), P = [], ph = R.r(0, TAU); for (let i = 0; i < 80; i++) { const a = i / 80 * TAU; P.push([cx + Math.cos(a) * r * (0.9 + 0.1 * Math.cos(a * 7 + ph)), cy + Math.sin(a) * r * 0.94 * (0.9 + 0.1 * Math.cos(a * 7 + ph))]); } return P; }
function mosTree(x, base, crown, o = {}) {
  const key = o.key ?? 'tree';
  mosLine([[x, base], [x + 6, (base + crown.y) / 2], [crown.x, crown.y + crown.r * 0.3]], [MOS.umber, mosTone(MOS.umber, 0.16), MOS.umber], { key: key + 'tr', rows: 3, s: 14, ...o });
  return mosFill(mosCrownPts(crown.x, crown.y, crown.r, key), MOS.olive, { key: key + 'cr', rim: MOS.oliveD, rows: [MOS.olive, mosTone(MOS.olive, 0.16), MOS.olive, mosTone(MOS.olive, 0.3)], halo: o.halo, ...o });
}
// the sun's rays: n wedges of gold and ochre tiles around a medallion of radius r, laid one after another from o.at
function mosRays(x, y, r, o = {}) {
  const n = o.n ?? 12, len = o.len ?? r * 0.56, w = o.w ?? r * 0.21;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i / n * TAU, c = Math.cos(a), s = Math.sin(a), r0 = r + 34, L = i % 2 ? len * 0.7 : len;
    const P = [[x + c * r0 - s * w, y + s * r0 + c * w], [x + c * (r0 + L), y + s * (r0 + L)], [x + c * r0 + s * w, y + s * r0 - c * w]];
    mosFill(P, i % 2 ? MOS.ochre : MOS.gold, { key: (o.key ?? 'ray') + i, s: 14, rim: i % 2 ? mosTone(MOS.ochre, -0.2) : MOS.ochre, gold: i % 2 ? 0.15 : 0.5, ...(o.at != null ? { at: o.at + i * (o.step ?? 0.042), rate: o.rate ?? 260 } : {}) });
  }
}
// a pond: teal contour rows inside a marble rim, with a ring of pale tiles spreading on it in 4 steps
function mosPond(x, y, rx, ry, o = {}) {
  const k = mosFill(ellipsePts(x, y, rx, ry, 0, 72), MOS.teal, { key: o.key ?? 'pond', rim: MOS.marble, rows: [MOS.tealD, MOS.teal, MOS.turq, MOS.teal], gold: 0.02, halo: o.halo, ...o });
  if (k >= 1 && o.ripple !== false) { const st = Math.floor(B / 3) % 4, u = 0.3 + st * 0.13; mosLine(ellipsePts(x + (o.rx0 ?? 0), y, rx * u, ry * u, 0, 40, -2.6, -0.5), MOS.marble, { s: 11, key: (o.key ?? 'pond') + 'rp' + st }); }
  return k;
}
// a fountain jet: two arcs of water chips leaping from (x, y), stepping along on 2s
function mosJet(x, y, h, o = {}) {
  const T = mosT2();
  for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) {
    const u = mod(i / 5 + T * 0.9, 1), px = x + sd * (o.w ?? h * 0.42) * u, py = y - h * 4 * u * (1 - u) * (1 - 0.25 * u);
    mosChip(px, py, 14 - 4 * u, (i + (sd > 0 ? 1 : 0)) % 2 ? MOS.turq : MOS.marble, { key: 'jet' + sd + i, rot: u * 3 * sd, lift: 0.4 });
  }
}
// a splash: chips thrown up from (x, y), t seconds after the impact (drawn for 0.5 s)
function mosSplash(x, y, t, o = {}) {
  if (t < 0 || t > 0.5) return; const n = o.n ?? 7, u = Math.floor(t * 12) / 6;
  for (let i = 0; i < n; i++) { const R = RNG('mossplash', o.key ?? 's', i), vx = (i - (n - 1) / 2) * 34 + R.n(10), vy = 200 + R.r(0, 130); mosChip(x + vx * u, y - vy * u + 290 * u * u, 13 - 4 * u, (o.c ?? [MOS.marble, MOS.turq])[i % 2], { key: 'spl' + (o.key ?? '') + i, rot: i + u * 4, lift: 0.5 }); }
}
// a butterfly: four wing chips that open and close on 2s
function mosFlutter(x, y, s, o = {}) {
  const open = B % 2 === 0, w = open ? s : s * 0.42, c = o.c ?? MOS.rose, key = o.key ?? 'kupu';
  for (const sd of [-1, 1]) { mosChip(x + sd * (w * 0.5 + 2), y - s * 0.3, s, c, { key: key + sd, w, rot: sd * 0.35, lift: 0.5 }); mosChip(x + sd * (w * 0.42 + 2), y + s * 0.42, s * 0.75, mosTone(c, 0.3), { key: key + 'b' + sd, w: w * 0.75, rot: -sd * 0.3, lift: 0.5 }); }
  mosChip(x, y, s * 1.1, MOS.char, { key: key + 'body', w: s * 0.28 });
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'mosaic',
  paper: MOS.paper,
  // a plain floor of square-cut tiles in colour c (hex, or rgb() mid-morph)
  backdrop(c) { ctx.save(); screen(); mosFloor(c); ctx.restore(); },
  // the era seen through a hole edged by rows of tiles laid around it: a dark row in the bridge colour, a marble row outside
  window(P, key, src, o = {}) {
    ctx.save(); mosPath(ctx, P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    let ar = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; ar += a[0] * b[1] - b[0] * a[1]; }
    const s = 18, sg = ar > 0 ? -1 : 1, c = o.c ?? MOS.umber, R = RNG('moswin', key), tiles = [], Q = resample(P, true, 8);
    mosAlong(tiles, mosOffset(Q, sg * s * 0.5, true), true, s, s * 1.05, 2.2, mosRGB(mosTone(c, -0.4)), R, {});
    mosAlong(tiles, mosOffset(Q, sg * s * 1.5, true), true, s, s * 1.05, 2.2, mosRGB(MOS.marble), R, {});
    ctx.save(); mosPath(ctx, mosOffset(Q, sg * s, true)); ctx.lineWidth = 2 * s + 2; ctx.lineJoin = 'round'; ctx.strokeStyle = MOS.grout; ctx.stroke();
    ctx.lineWidth = 1.4; ctx.lineCap = 'butt';
    for (const t of tiles) if (t.cx > -30 && t.cx < W + 30 && t.cy > -30 && t.cy < H + 30) mosPaint(ctx, t);
    ctx.restore();
  },
  // the morphing shape: the outline is re-laid every frame as a medallion in the blended colour, a deeper row around it
  blob(P, c, key) {
    const kd = MOS_DIRECT, kl = MOS_LOG; MOS_DIRECT = true; MOS_LOG = null;
    ctx.save(); mosFill(P, c, { key: 'med', nocache: true, rim: mosTone(c, -0.45), rows: mosMedRows(c), halo: mosTone(c, -0.24) }); ctx.restore();
    MOS_DIRECT = kd; MOS_LOG = kl;
  },
  hero(x, y, r, o = {}) { mosHero(x, y, r, { key: o.key, mood: o.mood }); },
  heroColor: MOS.terra,
  heroPts(x, y, r) { return mosHeroPts(x, y, r); },
  // stone dust and a soft darkening toward the corners (static: a wall does not flicker)
  post() {
    const e = mosEntry('post', () => {
      const cv = mosCanvas(W, H), g = cv.getContext('2d'), R = RNG('mosdust');
      for (let i = 0; i < 9000; i++) { g.fillStyle = R.f() < 0.5 ? 'rgba(60,40,24,0.10)' : 'rgba(255,250,236,0.13)'; g.fillRect(R.r(0, W), R.r(0, H), R.r(1, 2.6), R.r(1, 2.6)); }
      const v = g.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, H * 0.72); v.addColorStop(0, 'rgba(40,26,16,0)'); v.addColorStop(1, 'rgba(40,26,16,0.2)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      return { cv };
    });
    ctx.save(); screen(); ctx.drawImage(e.cv, 0, 0); ctx.restore();
  },
  ones: true,
};
