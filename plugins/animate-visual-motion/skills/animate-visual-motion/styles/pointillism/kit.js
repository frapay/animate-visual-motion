// =====================================================================
//  styles/pointillism/kit.js — a Neo-Impressionist pointillist painting, on top of kit/core.js.
//  The whole picture, ground included, is small round DABS of pure paint laid side by side on a pale primed canvas:
//  no outlines, no flat fills, no gradients. Colour is mixed by the eye (a weighted palette per region, a second
//  palette mixed in by position for the lit / shadow side), a form is read by the change of hue at its edge plus a
//  thin halo of complementary dabs, and all motion is dabs appearing, swapping hue or moving as a group.
//
//  How it stays fast: every region's dab layout is generated once from seeded RNG (Poisson-disc, never a grid) and
//  painted once into an offscreen canvas. Per frame a finished region is one drawImage plus the few dabs that
//  shimmer or are lit; only a region that is being dabbed in is stamped dab by dab (from a cache of dab sprites).
//
//  Everything is prefixed pt / PT. Time: TT on 2s (STYLE.ones = false); per-step life keys on B.
// =====================================================================
const PT = {
  canvas: '#ece2c9', plaque: '#f7f1e0', ink: '#232a66',
  lemon: '#f8e04a', yellow: '#f5bd12', orange: '#ee8418', verm: '#e0412a', rose: '#e9799c',
  violet: '#7b4bb3', ultra: '#2a3aa6', cobalt: '#2c6fca', sky: '#7db5e8', viridian: '#15856a', emerald: '#4aa94c',
  white: '#fffdf4', deep: '#1b2168',
};
const PT_FONT = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", "DejaVu Serif", "Liberation Serif", "Times New Roman", serif';
// the complement of each tube colour (the halo around a form, the sprinkle in a shadow) and its neighbour on the
// wheel (what a dab shimmers to)
const PT_COMP = { [PT.lemon]: PT.violet, [PT.yellow]: PT.violet, [PT.orange]: PT.cobalt, [PT.verm]: PT.viridian, [PT.rose]: PT.emerald, [PT.violet]: PT.yellow, [PT.ultra]: PT.orange, [PT.cobalt]: PT.orange, [PT.sky]: PT.orange, [PT.viridian]: PT.verm, [PT.emerald]: PT.rose, [PT.white]: PT.violet, [PT.deep]: PT.orange };
const PT_NEAR = { [PT.lemon]: PT.white, [PT.yellow]: PT.lemon, [PT.orange]: PT.yellow, [PT.verm]: PT.orange, [PT.rose]: PT.verm, [PT.violet]: PT.rose, [PT.ultra]: PT.cobalt, [PT.cobalt]: PT.sky, [PT.sky]: PT.white, [PT.viridian]: PT.emerald, [PT.emerald]: PT.lemon, [PT.white]: PT.lemon, [PT.deep]: PT.violet };

// ---------------------------------------------------------------------
//  colour
// ---------------------------------------------------------------------
const ptRGB = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
const ptHex = (r) => '#' + r.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const ptMix = (a, b, u) => { const x = ptRGB(a), y = ptRGB(b); return ptHex(x.map((v, i) => lerp(v, y[i], u))); };
const PT_TONE = new Map();
// a tube colour a little thicker or thinner: k > 0 toward white, k < 0 toward a deep blue-violet (never black)
function ptTone(c, k) {
  if (!k) return c;
  const key = c + k; let v = PT_TONE.get(key);
  if (!v) { if (PT_TONE.size > 4000) PT_TONE.clear(); v = ptMix(c, k > 0 ? '#fffdf2' : '#191a4a', Math.abs(k)); PT_TONE.set(key, v); }
  return v;
}
// the complement: from the table for a tube colour, else the hue turned half round at full strength
function ptComp(c) {
  if (PT_COMP[c]) return PT_COMP[c];
  const [r, g, b] = ptRGB(c).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.08) return PT.violet;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = mod(h * 60 + 180, 360);
  const f = (n) => { const k = (n + h / 30) % 12; return 255 * (0.5 - 0.42 * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return ptHex([f(0), f(8), f(4)]);
}
const ptNear = (c) => PT_NEAR[c] || ptTone(c, 0.3);
// a weighted palette: [[colour, weight], ...] or [colour, ...]. ptPal(pal).pick(u) maps 0..1 to a colour
const PT_PALS = new Map(), PT_PALW = new WeakMap();
function ptPal(pal) {
  if (pal && pal.pick) return pal;
  let p = PT_PALW.get(pal); if (p) return p;
  const sig = JSON.stringify(pal); p = PT_PALS.get(sig);
  if (!p) {
    const cols = pal.map((q) => (Array.isArray(q) ? q[0] : q)), ws = pal.map((q) => (Array.isArray(q) ? q[1] : 1)), tot = ws.reduce((a, b) => a + b, 0), cum = [];
    let s = 0; for (const w of ws) { s += w / tot; cum.push(s); }
    p = { cols, cum, id: hash(sig).toString(36), pick: (u) => { for (let i = 0; i < cum.length; i++) if (u < cum[i]) return cols[i]; return cols[cols.length - 1]; } };
    PT_PALS.set(sig, p);
  }
  PT_PALW.set(pal, p); return p;
}

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
function ptCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function ptPath(g, P) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
function ptHashPts(P) { let h = 2166136261 >>> 0; for (const p of P) { h ^= Math.round(p[0] * 4) & 0xffff; h = Math.imul(h, 16777619); h ^= Math.round(p[1] * 4) & 0xffff; h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + P.length; }
function ptInPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
}
const ptCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const ptRectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const ptDiscPts = (x, y, r, n = 72) => ellipsePts(x, y, r, r, 0, n);
// a bumpy round outline (a tree crown, a cloud, a bush): rx, ry, lumps (7), amt (0.1), seeded by key
function ptBlobPts(cx, cy, rx, ry, key = 'blob', lumps = 7, amt = 0.1) {
  const R = RNG('ptblob', key), ph = R.r(0, TAU), ph2 = R.r(0, TAU), P = [];
  for (let i = 0; i < 90; i++) { const a = i / 90 * TAU, k = 1 - amt + amt * Math.cos(a * lumps + ph) + amt * 0.5 * Math.cos(a * (lumps * 2 + 1) + ph2); P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return P;
}
// the outline moved d px along its normal, with the tangent angle of every point
function ptOffset(Q, d) {
  const n = Q.length;
  return Q.map((p, i) => { const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { x: p[0] - (b[1] - a[1]) / l * d, y: p[1] + (b[0] - a[0]) / l * d, a: Math.atan2(b[1] - a[1], b[0] - a[0]) }; });
}
// +1 or -1: which way ptOffset goes inward for this outline
function ptInward(P, Q) {
  let v = 0; const O = ptOffset(Q, 2.5), st = Math.max(1, Math.floor(Q.length / 12));
  for (let i = 0; i < Q.length; i += st) v += ptInPoly(P, O[i].x, O[i].y) ? 1 : -1;
  return v >= 0 ? 1 : -1;
}
// dab directions: pointing away from a centre (rays), or lying round it (rings)
const ptRadial = (cx, cy) => (x, y) => Math.atan2(y - cy, x - cx);
const ptRing = (cx, cy) => (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2;

// Poisson-disc points over a box (Bridson): hand-placed spacing, no rows, no grid. init = points placed first
// (an outline's edge row) that the rest grow away from
function ptPoisson(bb, r, R, init = []) {
  const cell = r / Math.SQRT2, gw = Math.ceil((bb.x1 - bb.x0) / cell) + 1, gh = Math.ceil((bb.y1 - bb.y0) / cell) + 1;
  const grid = new Int32Array(gw * gh).fill(-1), pts = [], act = [];
  const far = (x, y, d) => {
    const gx = Math.floor((x - bb.x0) / cell), gy = Math.floor((y - bb.y0) / cell), d2 = d * d;
    for (let j = Math.max(0, gy - 2); j <= Math.min(gh - 1, gy + 2); j++) for (let i = Math.max(0, gx - 2); i <= Math.min(gw - 1, gx + 2); i++) {
      const q = grid[j * gw + i]; if (q >= 0) { const p = pts[q], dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy < d2) return false; }
    }
    return true;
  };
  const add = (p) => { const gi = Math.floor((p.y - bb.y0) / cell) * gw + Math.floor((p.x - bb.x0) / cell); if (grid[gi] < 0) grid[gi] = pts.length; act.push(pts.length); pts.push(p); };
  for (const p of init) if (p.x >= bb.x0 && p.x < bb.x1 && p.y >= bb.y0 && p.y < bb.y1 && far(p.x, p.y, r * 0.72)) add(p);
  if (!pts.length) add({ x: lerp(bb.x0, bb.x1, 0.3 + 0.4 * R.f()), y: lerp(bb.y0, bb.y1, 0.3 + 0.4 * R.f()) });
  while (act.length) {
    const ai = Math.floor(R.f() * act.length), p = pts[act[ai]]; let ok = false;
    for (let k = 0; k < 18; k++) {
      const a = R.f() * TAU, d = r * (1 + 0.7 * R.f()), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (x >= bb.x0 && x < bb.x1 && y >= bb.y0 && y < bb.y1 && far(x, y, r)) { add({ x, y }); ok = true; break; }
    }
    if (!ok) { act[ai] = act[act.length - 1]; act.pop(); }
  }
  return pts;
}

// ---------------------------------------------------------------------
//  one dab of paint: a slightly irregular oval with a heavier head, a thin shadow under it and a ridge of light on
//  it (thick paint). Sprites are cached per colour and variant, and stamped with a rotation and a scale.
// ---------------------------------------------------------------------
const PT_SPR = new Map(), PT_SN = 32, PT_RX = 9, PT_RY = 6.3, PT_VARS = 6;
function ptSprite(css, v) {
  const key = css + '|' + v; let sp = PT_SPR.get(key);
  if (sp) return sp;
  if (PT_SPR.size > 1400) PT_SPR.delete(PT_SPR.keys().next().value);
  sp = ptCanvas(PT_SN, PT_SN);
  const g = sp.getContext('2d'), R = RNG('ptspr', v), n = 11, P = [], head = R.r(0.06, 0.2), ph = R.r(0, TAU);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + R.n(0.07) + 0.05 * Math.cos(a * 3 + ph); P.push([Math.cos(a) * PT_RX * k * (1 - head * 0.5 + head * 0.5 * Math.cos(a)), Math.sin(a) * PT_RY * k * (1 + head * Math.cos(a))]); }
  const tr = () => { g.beginPath(); g.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2); for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } g.closePath(); };
  g.translate(PT_SN / 2, PT_SN / 2);
  g.save(); g.translate(1.0, 1.5); tr(); g.fillStyle = 'rgba(46,34,74,0.26)'; g.fill(); g.restore();          // the shadow the paint casts
  tr(); g.fillStyle = css; g.fill();
  g.save(); tr(); g.clip();
  g.fillStyle = 'rgba(22,16,64,0.17)'; g.fillRect(-16, -16, 32, 32);                                            // the lee side of the ridge
  g.translate(-1.3, -1.7); tr(); g.fillStyle = css; g.fill(); g.translate(1.3, 1.7);
  g.strokeStyle = 'rgba(255,255,250,0.34)'; g.lineWidth = 1.5; g.lineCap = 'round';                             // light on the ridge
  g.beginPath(); g.moveTo(-PT_RX * 0.62, -PT_RY * 0.28 + R.n(0.6)); g.quadraticCurveTo(-PT_RX * 0.1, -PT_RY * 0.78, PT_RX * 0.45, -PT_RY * 0.42 + R.n(0.6)); g.stroke();
  g.strokeStyle = 'rgba(20,14,50,0.09)'; g.lineWidth = 0.9;                                                     // one bristle furrow
  g.beginPath(); g.moveTo(-PT_RX * 0.5, PT_RY * 0.2 + R.n(0.8)); g.lineTo(PT_RX * 0.55, PT_RY * 0.1 + R.n(0.8)); g.stroke();
  g.restore();
  PT_SPR.set(key, sp); return sp;
}
// stamp a sprite at (x, y) on g, whose base transform is M (dab axes ca, sa, cb, cd = rotation * scale)
function ptStamp(g, M, x, y, ca, sa, cb, cd, css, v) {
  g.setTransform(M.a * ca + M.c * sa, M.b * ca + M.d * sa, M.a * cb + M.c * cd, M.b * cb + M.d * cd, M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f);
  g.drawImage(ptSprite(css, v), -PT_SN / 2, -PT_SN / 2);
}
// one loose dab, drawn straight to ctx (a star, a bird's wing, a firefly, a lamp).
//   o: s (14: its length), a (angle), v (variant), tone, under (true: a patch of bare canvas round it; or a colour), asp
function ptDot(x, y, col, o = {}) {
  const s = o.s ?? 14, a = o.a ?? 0, rx = s * 0.55, ry = s * 0.4 * (o.asp ?? 1), M = ctx.getTransform(), c = Math.cos(a), sn = Math.sin(a);
  if (o.under !== false) { ctx.fillStyle = typeof o.under === 'string' ? o.under : PT.canvas; ctx.beginPath(); ctx.arc(x, y, s * 0.78, 0, TAU); ctx.fill(); }
  ptStamp(ctx, M, x, y, c * rx / PT_RX, sn * rx / PT_RX, -sn * ry / PT_RY, c * ry / PT_RY, ptTone(col, o.tone ?? 0), o.v ?? 0);
  ctx.setTransform(M);
}

// ---------------------------------------------------------------------
//  a field of dabs: the cached unit everything is made of
// ---------------------------------------------------------------------
const PT_CACHE = new Map();
function ptEntry(key, build) {
  let e = PT_CACHE.get(key);
  if (e) { PT_CACHE.delete(key); PT_CACHE.set(key, e); return e; }                  // keep what is in use
  if (PT_CACHE.size > 240) PT_CACHE.delete(PT_CACHE.keys().next().value);
  e = build(); PT_CACHE.set(key, e); return e;
}
// build the dabs of a region once. bb = its box, inside(x, y) = is this point in it, init = points placed first
// ({ x, y, a?, halo?, fix: true, ord? }). Options are those of ptFill.
function ptField(key, bb, inside, pal, o = {}, init = []) {
  const s = o.s ?? 13.5, R = RNG('ptfield', key), P1 = ptPal(pal), P2 = o.pal2 ? ptPal(o.pal2) : null, PH = o.haloPal ? ptPal(o.haloPal) : null;
  const raw = o.pointsOnly ? init : ptPoisson(bb, s * 0.94, R, init), dabs = [];
  const dir = o.dir ?? 0, jit = o.jit ?? 0.4, size = o.size ?? 1, asp = o.asp ?? 1, sw = o.sweep ?? 0, under = o.under !== false;
  const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, TONES = [-0.1, 0, 0, 0.09];
  const sf = typeof sw === 'function' ? sw : sw === 'out' ? (x, y) => Math.hypot(x - cx, y - cy) : sw === 'in' ? (x, y) => -Math.hypot(x - cx, y - cy) : (x, y) => x * Math.cos(sw) + y * Math.sin(sw);
  let lo = 1e9, hi = -1e9;
  for (const p of raw) {
    if (!p.fix) {
      if (!inside(p.x, p.y)) continue;
      if (o.hole && o.hole.some((h) => ptInPoly(h, p.x, p.y))) continue;
      if (o.dens && R.f() > o.dens(p.x, p.y)) continue;
    } else if (p.halo && R.f() > (o.haloDens ?? 0.55)) continue;
    const jj = p.fix ? s * (p.halo ? 0.2 : 0.1) : 0, x = p.x + (jj ? R.n(jj) : 0), y = p.y + (jj ? R.n(jj) : 0);
    const pl = p.halo ? PH : P2 && R.f() < (o.mix ? o.mix(x, y) : 0.5) ? P2 : P1, col = pl.pick(R.f()), tn = TONES[R.i(0, 3)];
    const a = (p.a != null ? p.a : typeof dir === 'function' ? dir(x, y) : dir) + R.n(p.a != null ? jit * 0.5 : jit);
    const rx = s * R.r(0.58, 0.7) * size, ry = s * R.r(0.44, 0.53) * size * asp, c = Math.cos(a), sn = Math.sin(a);
    const sv = o.sweep == null && p.ord != null ? p.ord : sf(x, y);
    if (sv < lo) lo = sv; if (sv > hi) hi = sv;
    dabs.push({ x, y, ca: c * rx / PT_RX, sa: sn * rx / PT_RX, cb: -sn * ry / PT_RY, cd: c * ry / PT_RY, c: ptTone(col, tn), c2: ptTone(ptNear(col), tn), tn, v: R.i(0, PT_VARS - 1),
      ur: under ? s * (p.halo ? 0.6 : p.fix ? 0.72 : 0.86) : 0, rx, sh: R.f(), th: R.f(), lp: R.f(), ord: sv, halo: !!p.halo });
  }
  const sc = o.scatter ?? 0.05, span = hi - lo || 1;
  for (const d of dabs) d.ord = (d.ord - lo) / span + R.n(sc) + (d.halo ? 0.05 : 0);
  dabs.sort((a, b) => a.ord - b.ord);
  const pad = s * 1.3 + 6;
  return { dabs, bb: { x0: Math.floor(bb.x0 - pad), y0: Math.floor(bb.y0 - pad), x1: Math.ceil(bb.x1 + pad), y1: Math.ceil(bb.y1 + pad) }, cx, cy, under, ucol: typeof o.under === 'string' ? o.under : PT.canvas, cv: null };
}
// stamp dabs i0..i1 of a field onto g (base transform M): first the patches of bare canvas under them, then the paint
function ptPaint(g, M, e, i0, i1) {
  const D = e.dabs;
  g.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
  if (e.under) {
    g.fillStyle = e.ucol;
    for (let i = i0; i < i1; i += 500) { g.beginPath(); for (let j = i; j < Math.min(i1, i + 500); j++) { const d = D[j]; g.moveTo(d.x + d.ur, d.y); g.arc(d.x, d.y, d.ur, 0, TAU); } g.fill(); }
  }
  for (let i = i0; i < i1; i++) { const d = D[i]; ptStamp(g, M, d.x, d.y, d.ca, d.sa, d.cb, d.cd, d.c, d.v); }
  g.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
}
// the finished field as one canvas (painted once)
function ptLayer(e) {
  if (!e.cv) { e.cv = ptCanvas(e.bb.x1 - e.bb.x0, e.bb.y1 - e.bb.y0); ptPaint(e.cv.getContext('2d'), { a: 1, b: 0, c: 0, d: 1, e: -e.bb.x0, f: -e.bb.y0 }, e, 0, e.dabs.length); }
  return e.cv;
}
// draw a field at this frame: dabbed in over [at, at + dur] in its sweep order, then alive.
//   o: at, dur (0.5), dx, dy, rot (about cx, cy: the field moves as one group of dabs),
//      shimmer (fraction of dabs that turn to their neighbouring hue each boil step), slide (those dabs also slip
//      sideways by this many px: water), lights: [{ k: (x, y) => 0..1, pal }] (dabs whose seeded threshold is under k
//      swap to a colour of pal: a wave of light, a reflection, a pulse; nothing ever fades)
function ptPlay(e, o = {}) {
  const k = o.at != null ? clamp((TT - o.at) / (o.dur ?? 0.5)) : 1, D = e.dabs, n = D.length;
  if (k <= 0 || !n) return k;
  const m = k >= 1 ? n : Math.max(1, Math.round(n * k));
  ctx.save();
  if (o.dx || o.dy) ctx.translate(o.dx || 0, o.dy || 0);
  if (o.rot) { const cx = o.cx ?? e.cx, cy = o.cy ?? e.cy; ctx.translate(cx, cy); ctx.rotate(o.rot); ctx.translate(-cx, -cy); }
  const M = ctx.getTransform();
  if (k >= 1) ctx.drawImage(ptLayer(e), e.bb.x0, e.bb.y0); else ptPaint(ctx, M, e, 0, m);
  const shim = o.shimmer ?? 0, slide = o.slide ?? 0, L = o.lights, ph = B * 0.6180339887;
  if (shim > 0 || L) {
    for (let i = 0; i < m; i++) {
      const d = D[i]; let css = null, ox = 0;
      if (L) for (let j = 0; j < L.length; j++) { const kk = L[j].k(d.x, d.y); if (kk > 0 && d.th < kk) { css = ptTone(ptPal(L[j].pal).pick(d.lp), d.tn); break; } }
      if (!css && shim > 0) { const f = d.sh + ph; if (f - Math.floor(f) < shim) { css = d.c2; if (slide) ox = d.lp < 0.5 ? -slide : slide; } }
      if (!css) continue;
      if (ox) { ctx.setTransform(M); ctx.fillStyle = e.ucol; ctx.beginPath(); ctx.arc(d.x, d.y, d.rx + 1.5, 0, TAU); ctx.fill(); }
      ptStamp(ctx, M, d.x + ox, d.y, d.ca, d.sa, d.cb, d.cd, css, d.v);
    }
    ctx.setTransform(M);
  }
  ctx.restore();
  return k;
}

// ---------------------------------------------------------------------
//  THE GENERIC HELPER: fill any closed outline with dabs from a small weighted palette.
//  ptFill(P, pal, o) -> 0..1 (how much of it is laid).  P = outline points; pal = [[colour, weight], ...]
//   o: key        a name (the layout is seeded and cached by key + outline + palette; change it when the look changes)
//      s          dab spacing, px (13.5: dabs about 15 x 10); size, asp (flatter dabs: water 0.8)
//      dir, jit   the dabs' direction: an angle, or (x, y) => angle (ptRadial / ptRing), and its jitter (0.4 rad)
//      pal2, mix  a second palette and (x, y) => 0..1, the chance a dab comes from it (the shadow side, a glow, a haze)
//      halo       true = a thin ring of dabs in the complement of pal's first colour just outside the outline;
//                 or a colour, or a palette (warm dabs on the lit edge against a cool neighbour); haloDens (0.55)
//      edge       false = no row of dabs along the outline (grounds that end under the border)
//      under      false = no bare-canvas patch under the dabs (a ground laid on the bare canvas); or a colour
//      dens       (x, y) => 0..1 keep-chance (thinner toward an edge); hole: [outline, ...] left empty
//      sweep      the order the brush works in: an angle (0 = left to right, -PI/2 = bottom to top), 'out', 'in',
//                 or (x, y) => number; scatter (0.05)
//      at, dur, dx, dy, rot, cx, cy, shimmer, slide, lights   see ptPlay
// ---------------------------------------------------------------------
function ptHaloPal(pal, halo) { return halo === true ? [[ptComp(ptPal(pal).cols[0]), 3], [PT.white, 1]] : typeof halo === 'string' ? [halo] : halo; }
function ptFill(P, pal, o = {}) {
  const s = o.s ?? 13.5, hp = o.halo ? ptPal(ptHaloPal(pal, o.halo)) : null;
  const key = ['fill', o.key ?? '', ptHashPts(P), s, ptPal(pal).id, o.pal2 ? ptPal(o.pal2).id : '', hp ? hp.id : ''].join('|');
  const e = ptEntry(key, () => {
    const init = [];
    if (o.edge !== false || hp) {
      const Q = resample(P, true, s), sg = ptInward(P, Q);
      if (o.edge !== false) for (const q of ptOffset(Q, sg * s * 0.5)) init.push({ ...q, fix: true });
      if (hp) for (const q of ptOffset(Q, -sg * s * 0.74)) init.push({ ...q, fix: true, halo: true });
    }
    return ptField(key, bbox(P, s * 1.5), (x, y) => ptInPoly(P, x, y), pal, { ...o, haloPal: hp }, init);
  });
  return ptPlay(e, o);
}
// dabs along a line (a mast, a trunk, a horizon, a streak of reflection, a dotted edge): rows side by side.
//   o: closed, rows (1), s (12), gap (1: spacing along the line in dabs), plus ptFill's colour / time options.
//   Laid from the first point to the last unless o.sweep is given.
function ptLine(P, pal, o = {}) {
  const s = o.s ?? 12, rows = o.rows ?? 1, closed = !!o.closed;
  const key = ['line', o.key ?? '', ptHashPts(P), s, rows, closed ? 1 : 0, o.gap ?? 1, ptPal(pal).id].join('|');
  const e = ptEntry(key, () => {
    const PP = closed ? [...P, P[0]] : P, L = pathLen(PP), n = Math.max(1, Math.round(L / (s * (o.gap ?? 1)))), init = [];
    for (let i = 0; i < (closed ? n : n + 1); i++) {
      const f = i / n, q = pointAt(PP, f), q0 = pointAt(PP, Math.max(0, f - 0.5 / n)), q1 = pointAt(PP, Math.min(1, f + 0.5 / n)), a = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
      for (let r = 0; r < rows; r++) { const off = (r - (rows - 1) / 2) * s * 0.8; init.push({ x: q[0] - Math.sin(a) * off, y: q[1] + Math.cos(a) * off, a, fix: true, ord: f }); }
    }
    return ptField(key, bbox(P, s * rows), () => false, pal, { jit: 0.22, ...o, s, pointsOnly: true }, init);
  });
  return ptPlay(e, o);
}
// ONE large title word built from dabs (never body text: captions go on the plaque). x = its centre, y = baseline.
//   o: s (dab spacing: size / 26, kept between 8 and 13), weight (900), plus ptFill's colour / time options.
//   Keep it short, in capitals, 280 px or taller, in a strong warm colour on a cool ground (or the reverse).
function ptWord(str, x, y, size, pal, o = {}) {
  const s = o.s ?? clamp(size / 26, 8, 13), pad = Math.ceil(s * 2);
  const key = ['word', str, size, s, ptPal(pal).id, o.pal2 ? ptPal(o.pal2).id : '', o.key ?? ''].join('|');
  const e = ptEntry(key, () => {
    const font = `${o.weight ?? 900} ${size}px ${PT_FONT}`, t = ptCanvas(8, 8).getContext('2d'); t.font = font;
    const w = Math.ceil(t.measureText(str).width), mw = w + pad * 2, mh = Math.ceil(size * 1.45), cv = ptCanvas(mw, mh), g = cv.getContext('2d', { willReadFrequently: true });
    g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = '#000'; g.fillText(str, pad, Math.round(size * 1.05));
    const px = g.getImageData(0, 0, mw, mh).data;
    const f = ptField(key, { x0: 0, y0: 0, x1: mw, y1: mh }, (qx, qy) => px[(Math.round(qy) * mw + Math.round(qx)) * 4 + 3] > 120, pal, { sweep: 0, scatter: 0.03, ...o, s });
    f.w = w; return f;
  });
  return ptPlay(e, { ...o, dx: x - e.w / 2 - pad + (o.dx || 0), dy: y - Math.round(size * 1.05) + (o.dy || 0) });
}

// ---------------------------------------------------------------------
//  light that moves by swapping hues (each returns a k(x, y) for ptFill's lights)
// ---------------------------------------------------------------------
// a ring that steps outward from (cx, cy) between radii r0 and r1, one step per boil: the sun's pulse.
//   o: steps (6), w (half-width 15), k (0.75 at the start, thinning outward), every (1 boil step per move)
function ptPulse(cx, cy, r0, r1, o = {}) {
  const n = o.steps ?? 6, w = o.w ?? 15, st = Math.floor(B / (o.every ?? 1)) % n, rr = r0 + (r1 - r0) * st / Math.max(1, n - 1), k = (o.k ?? 0.75) * (1 - 0.55 * st / n);
  return (x, y) => (Math.abs(Math.hypot(x - cx, y - cy) - rr) < w ? k : 0);
}
// an upright band of light at x = xc (a warm wave passing over the water). o: w (half-width 60), k (0.8), lean, wob
function ptBand(xc, o = {}) {
  const w = o.w ?? 60, k = o.k ?? 0.8, lean = o.lean ?? 0.12, wob = o.wob ?? 18;
  return (x, y) => (Math.abs(x - xc - lean * (y - (o.y0 ?? 0)) - wob * Math.sin(y * 0.021)) < w ? k : 0);
}
// a column of glitter under a light at x = xc, from y0 down to y1, widening as it comes: broken into rows that flicker.
//   o: w0 (20), spread (0.09), k (0.8)
function ptGlitter(xc, y0, y1, o = {}) {
  const w0 = o.w0 ?? 20, sp = o.spread ?? 0.09, k = o.k ?? 0.8;
  return (x, y) => {
    if (y < y0 || y > y1) return 0;
    const hw = w0 + (y - y0) * sp, dx = Math.abs(x - xc); if (dx > hw) return 0;
    const row = Math.floor(y / 15), fl = ((row * 7 + B * 3) % 5) / 4;
    return k * (0.3 + 0.7 * fl) * (1 - 0.6 * dx / hw);
  };
}
// inside an ellipse (a reflection under a boat, a pool of lamplight)
const ptPool = (cx, cy, rx, ry, k = 0.6) => (x, y) => (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 ? k : 0);

// ---------------------------------------------------------------------
//  picture parts
// ---------------------------------------------------------------------
// the painted border, as in the period: a band of small dabs round the picture in the complements of what it holds.
//   (x, y, w, h) = its outer edge. o: band (44), pal, s (11), key, at, dur, shimmer
const PT_BORDER = [[PT.ultra, 4], [PT.violet, 3], [PT.cobalt, 2], [PT.orange, 1.6], [PT.verm, 1]];
function ptBorder(x, y, w, h, o = {}) {
  const bw = o.band ?? 44, s = o.s ?? 11, pal = o.pal ?? PT_BORDER, cx = x + w / 2, cy = y + h / 2;
  const key = ['border', o.key ?? '', x, y, w, h, bw, s, ptPal(pal).id].join('|');
  const e = ptEntry(key, () => ptField(key, { x0: x, y0: y, x1: x + w, y1: y + h }, (px, py) => px < x + bw || px > x + w - bw || py < y + bw || py > y + h - bw, pal,
    { s, jit: 0.3, dir: (px, py) => (px < x + bw || px > x + w - bw ? Math.PI / 2 : 0), sweep: (px, py) => mod(Math.atan2(py - cy, px - cx) + 2.3, TAU), scatter: 0.02, ...o }));
  return ptPlay(e, { shimmer: 0.02, ...o });
}
// the sun or the moon: a disc of dabs lying in rings. o: pal, halo, key, at, dur, shimmer, s
const PT_SUN = [[PT.yellow, 5], [PT.lemon, 3], [PT.white, 2], [PT.orange, 1.3]], PT_MOON = [[PT.lemon, 4], [PT.white, 4], [PT.yellow, 1.2], [PT.rose, 0.8]];
function ptDisc(x, y, r, o = {}) {
  return ptFill(ptDiscPts(x, y, r), o.pal ?? PT_SUN, { key: 'disc', dir: ptRing(x, y), sweep: 'out', shimmer: 0.07, jit: 0.25, ...o });
}
// a tree: a trunk of dabs from (x, base) into a bumpy crown { x, y, r, ry? }, lit on one side.
//   o: lit, shade (palettes), sun ([dx, dy]: the direction the light comes from), halo, trunk (palette), key, at, shimmer
const PT_LEAF = [[PT.emerald, 4], [PT.yellow, 3], [PT.lemon, 2], [PT.viridian, 2], [PT.orange, 1]], PT_LEAFSH = [[PT.viridian, 4], [PT.ultra, 3], [PT.violet, 2], [PT.verm, 1]];
function ptTree(x, base, crown, o = {}) {
  const key = o.key ?? 'tree', sun = o.sun ?? [0.75, -0.65], at = o.at, ry = crown.ry ?? crown.r * 0.95;
  ptLine([[x, base], [x + (crown.x - x) * 0.25, (base + crown.y) / 2], [crown.x, crown.y + ry * 0.35]], o.trunk ?? [[PT.violet, 3], [PT.ultra, 2], [PT.verm, 1.4], [PT.orange, 0.8]], { key: key + 'tr', rows: 2, s: 12, at, dur: 0.25, sweep: -Math.PI / 2 });
  return ptFill(ptBlobPts(crown.x, crown.y, crown.r, ry, key), o.lit ?? PT_LEAF, { key: key + 'cr', pal2: o.shade ?? PT_LEAFSH,
    mix: (px, py) => clamp(0.5 - 0.95 * ((px - crown.x) * sun[0] + (py - crown.y) * sun[1]) / crown.r), dir: ptRing(crown.x, crown.y), halo: o.halo ?? [[PT.rose, 2], [PT.orange, 1.5]],
    sweep: -Math.PI / 2, shimmer: o.shimmer ?? 0.05, ...(at != null ? { at: at + 0.12, dur: o.dur ?? 0.5 } : {}) });
}
// a bird: a V of five dark dabs; flap 0 / 1. s = a wing dab's length
function ptBird(x, y, s, o = {}) {
  const up = o.flap ? -1 : 0.45, c = o.c ?? PT.deep;
  for (const sd of [-1, 1]) {
    ptDot(x + sd * s * 1.55, y + up * s * 0.75, c, { s: s * 0.95, a: sd * up * 0.5, v: 1, under: false });
    ptDot(x + sd * s * 0.8, y + up * s * 0.3, o.c2 ?? PT.violet, { s, a: sd * up * 0.42, v: 2, under: false });
  }
  ptDot(x, y, c, { s: s * 0.9, a: 0.2, v: 3, under: false });
}
// a star: one bright dab on its own patch of canvas that twinkles between white, lemon and rose (i seeds it)
function ptStar(x, y, i = 0, o = {}) {
  const c = [PT.lemon, PT.white, PT.yellow, PT.lemon, PT.rose][(i * 3 + Math.floor(B / 2) * (1 + i % 2)) % 5];
  ptDot(x, y, c, { s: o.s ?? 19, a: i * 1.3, v: i % PT_VARS, asp: 1.15 });
}
// a lamp on a post: two dark dabs, a warm head and, once lit, a ring of orange dabs that breathes.
function ptLamp(x, y, h, lit, o = {}) {
  ptDot(x, y, PT.deep, { s: 11, a: Math.PI / 2, v: 1, under: false }); ptDot(x, y - h * 0.5, PT.violet, { s: 11, a: Math.PI / 2, v: 2, under: false });
  if (!lit) { ptDot(x, y - h, PT.ultra, { s: 12, v: 3, under: false }); return; }
  const n = 7, rr = (o.r ?? 20) + (B % 2) * 3;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + (B % 2) * 0.45; ptDot(x + Math.cos(a) * rr, y - h + Math.sin(a) * rr, i % 2 ? PT.orange : PT.yellow, { s: 10, a: a + Math.PI / 2, v: i % PT_VARS, under: false }); }
  ptDot(x, y - h, B % 2 ? PT.white : PT.lemon, { s: 15, v: 4, asp: 1.15 });
}

// ---------------------------------------------------------------------
//  the hero: Skiff, a small sailboat read purely by dab colour (white and lemon sail in the light, a sky-and-violet
//  jib in shade, a vermilion hull, a mast that is one column of dabs, a pennant of three). (x, y) = its centre,
//  r = half its size.
//   o: rock (rad), key, at, dur (dabbed in from the keel up), dusk (the evening palette), lantern (true: lit, with a
//      ring of warm dabs at the bow), halo (false = none)
// ---------------------------------------------------------------------
function ptHeroParts(r) {
  const q = (P) => P.map(([u, v]) => [u * r, v * r]), sail = [], jib = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10, b = Math.sin(Math.PI * u) * 0.09; sail.push([lerp(0.11, 0.92, u) + b, lerp(-0.96, 0.4, u) - b * 0.6]); }   // the bellied leech
  sail.push([0.15, 0.4]);
  for (let i = 0; i <= 8; i++) { const u = i / 8, b = Math.sin(Math.PI * u) * 0.06; jib.push([lerp(-0.01, -0.7, u) + b * 0.4, lerp(-0.74, 0.4, u) + b * 0.2]); }
  jib.push([-0.03, 0.4]);
  return { sail: q(sail), jib: q(jib), hull: q([[-0.93, 0.52], [-0.5, 0.57], [0.3, 0.57], [0.99, 0.47], [0.84, 0.72], [0.6, 0.88], [-0.66, 0.88], [-0.84, 0.74]]), mast: q([[0.05, 0.54], [0.05, -1.0]]) };
}
function ptHeroPts(x, y, r) {
  return [[-0.93, 0.5], [-0.72, 0.4], [-0.02, -0.76], [0.08, -1.0], [0.56, -0.3], [0.94, 0.4], [1.0, 0.47], [0.84, 0.74], [0.6, 0.88], [-0.66, 0.88], [-0.84, 0.74]].map(([u, v]) => [x + u * r, y + v * r]);
}
function ptHero(x, y, r, o = {}) {
  r = Math.max(8, Math.round(r));
  const key = (o.key ?? 'skiff') + (o.dusk ? 'd' : ''), G = ptHeroParts(r), s = clamp(r * 0.075, 7, 14), at = o.at, tm = (d0, d) => (at != null ? { at: at + d0 * (o.dur ?? 0.4), dur: d * (o.dur ?? 0.4) } : {});
  const up = -Math.PI / 2, D = !!o.dusk, glow = o.lantern ? [{ k: ptPool(r * 0.5, 0.2 * r, r * 0.75, r * 0.7, 0.6), pal: [[PT.yellow, 3], [PT.orange, 2], [PT.white, 1]] }] : null;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (o.rock) ctx.rotate(o.rock);
  ptLine([[-0.8 * r, 0.95 * r], [0.76 * r, 0.95 * r]], [[PT.deep, 3], [PT.ultra, 3], [PT.violet, 1.5], [PT.viridian, 1]], { key: key + 'wl', s: s * 1.05, gap: 1.3, jit: 0.3, ...tm(0, 0.2) });   // the dark water under the keel
  ptFill(G.hull, D ? [[PT.verm, 4], [PT.deep, 2], [PT.violet, 1.5], [PT.orange, 1]] : [[PT.verm, 5], [PT.orange, 3], [PT.rose, 1], [PT.ultra, 0.7]], { key: key + 'hull', s, dir: 0, jit: 0.2, sweep: up, shimmer: 0.03, ...tm(0, 0.35) });
  ptLine(G.mast, [[PT.ultra, 2], [PT.violet, 2], [PT.verm, 1]], { key: key + 'mast', s: s * 0.92, ...tm(0.25, 0.4) });
  const halo = o.halo === false ? null : D ? [[PT.orange, 2], [PT.yellow, 1]] : [[PT.orange, 3], [PT.verm, 1]];
  ptFill(G.jib, D ? [[PT.violet, 3], [PT.ultra, 2], [PT.rose, 1.5]] : [[PT.rose, 3], [PT.white, 2], [PT.violet, 2], [PT.orange, 1]], { key: key + 'jib', s, size: 1.2, dir: 1.1, sweep: up, halo, haloDens: 0.4, shimmer: 0.04, lights: glow, ...tm(0.4, 0.5) });
  ptFill(G.sail, D ? [[PT.white, 3], [PT.rose, 3], [PT.lemon, 2], [PT.orange, 1]] : [[PT.white, 4], [PT.lemon, 4], [PT.yellow, 1.2], [PT.rose, 0.8]], { key: key + 'sail', s, size: 1.2, dir: -1.05, sweep: up, halo, haloDens: 0.4, shimmer: 0.04, lights: glow, ...tm(0.5, 0.5) });
  if (at == null || TT >= at + (o.dur ?? 0.4)) {                       // the pennant: three dabs that flick on the boil
    const fl = B % 2 ? 0.07 : -0.04;
    for (let i = 0; i < 3; i++) ptDot(r * (0.02 - 0.085 * (i + 1)), r * (-1.03 + fl * (i + 1) * 0.6), i === 1 ? PT.orange : PT.verm, { s: s * 1.05, a: fl * 3, v: i, under: i === 0 });
    if (o.lantern) { const n = 6, rr = r * 0.13 + (B % 2) * 2.5; for (let i = 0; i < n; i++) { const a = i / n * TAU + (B % 2) * 0.5; ptDot(r * 0.8 + Math.cos(a) * rr, r * 0.3 + Math.sin(a) * rr, i % 2 ? PT.orange : PT.yellow, { s: s * 0.9, a: a + Math.PI / 2, v: i, under: false }); } ptDot(r * 0.8, r * 0.3, B % 2 ? PT.white : PT.lemon, { s: s * 1.35, v: 2, asp: 1.15 }); }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the canvas: its weave is laid over the finished frame (paint is thin enough to show it), cached once
// ---------------------------------------------------------------------
let PT_WEAVE = null;
function ptWeave() {
  if (PT_WEAVE && PT_WEAVE.width === W && PT_WEAVE.height === H) return PT_WEAVE;
  const cv = ptCanvas(W, H), g = cv.getContext('2d'), R = RNG('ptweave');
  for (let x = 0; x < W; x += 4) { g.fillStyle = `rgba(86,64,34,${(0.05 + R.f() * 0.075).toFixed(3)})`; g.fillRect(x + (R.f() < 0.12 ? 1 : 0), 0, 1.4, H); }       // warp
  for (let y = 0; y < H; y += 4) { g.fillStyle = `rgba(86,64,34,${(0.05 + R.f() * 0.075).toFixed(3)})`; g.fillRect(0, y + (R.f() < 0.12 ? 1 : 0), W, 1.4); }       // weft
  const t = ptCanvas(8, 8), tg = t.getContext('2d');                                                                                                                // the over-under knots
  tg.fillStyle = 'rgba(255,252,240,0.16)'; tg.fillRect(1.6, 1.6, 2, 2); tg.fillRect(5.6, 5.6, 2, 2); tg.fillStyle = 'rgba(70,50,26,0.07)'; tg.fillRect(5.6, 1.6, 2, 2); tg.fillRect(1.6, 5.6, 2, 2);
  g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(80,58,30,0.10)'; g.beginPath(); for (let i = 0; i < 700; i++) { const hz = R.f() < 0.5, l = R.r(8, 40); g.rect(Math.floor(R.r(0, W) / 4) * 4, Math.floor(R.r(0, H) / 4) * 4, hz ? l : 1.6, hz ? 1.6 : l); } g.fill();   // slubs
  PT_WEAVE = cv; return cv;
}

// ---------------------------------------------------------------------
//  text. Captions are never built from dabs: they sit in a plain serif on a calm plaque, a strip of bare primed
//  canvas with a dotted edge. Tag and caption go through DEFER (after the camera, at screen size) and are taken
//  away for the length of a bridge.
// ---------------------------------------------------------------------
function ptFont(size, weight = 400, italic = false, track = 0) { ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${PT_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${(size * track).toFixed(2)}px`; }
function ptTextW(str, size, weight = 400, italic = false, track = 0) { ctx.save(); ptFont(size, weight, italic, track); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// plain serif text. o: weight (400), italic, track, align ('left' | 'center' | 'right')
function ptText(str, x, y, size, c, o = {}) {
  ctx.save(); ptFont(size, o.weight, o.italic, o.track); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(str).width; ctx.fillStyle = c ?? PT.ink; ctx.fillText(str, x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0), y);
  ctx.restore(); return w;
}
function ptBridgeOff() {
  if (typeof BRIDGES === 'undefined') return false;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d - 1e-6) return true; }
  return false;
}
// the plaque: a strip of bare primed canvas (x, y, w, h) with a dotted edge that runs round it from time at
function ptPlaque(x, y, w, h, o = {}) {
  ctx.save();
  ctx.fillStyle = PT.plaque; ctx.beginPath(); ctx.roundRect(x, y, w, h, o.r ?? 14); ctx.fill();
  ptLine(rrectPts(x + 9, y + 9, w - 18, h - 18, (o.r ?? 14) - 4, 3), o.pal ?? [[PT.ultra, 3], [PT.cobalt, 2], [PT.verm, 1.2], [PT.orange, 1]], { key: 'plq' + (o.key ?? ''), closed: true, s: o.s ?? 9.5, gap: 1.25, under: false, jit: 0.15, at: o.at, dur: o.dur ?? 0.4 });
  ctx.restore();
}
//   o: x (CX or 500: the centre), y (1440: the baseline), size (60), w (820: the widest the line may be),
//      hi (the *word*'s colour: vermilion), at (seconds after the era starts: 0.5)
function ptCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5); if (ptBridgeOff() || TT < at) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), y = o.y ?? 1440, wmax = o.w ?? 820, hi = o.hi ?? PT.verm;
  let size = o.size ?? 60;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { let tw = 0; toks.forEach((t, i) => { t.w = ptTextW(t.s, size, t.hi ? 700 : 400, t.hi); t.gap = i === 0 ? 0 : /^[!?.,;:]/.test(t.s) ? size * 0.03 : size * 0.27; tw += t.w + t.gap; }); return tw; };
  let tw = lay(); if (tw > wmax - 90) { size *= (wmax - 90) / tw; tw = lay(); }
  const pw = tw + 110, ph = size * 1.95, px = cx - pw / 2, py = y - size * 1.28;
  ptPlaque(px, py, pw, ph, { key: 'cap' + str, at, dur: 0.4 });
  let xx = cx - tw / 2;
  toks.forEach((t, i) => {
    xx += t.gap;
    if (TT >= at + 0.08 + i * 0.165) {                                    // the words are set one by one, on the step
      ptText(t.s, xx, y, size, t.hi ? hi : PT.ink, { weight: t.hi ? 700 : 400, italic: t.hi });
      if (t.hi) ptLine([[xx + 2, y + size * 0.24], [xx + t.w - 2, y + size * 0.24]], [[hi, 3], [PT.orange, 1.5], [PT.yellow, 1]], { key: 'capu' + str, s: 8.5, under: false, jit: 0.12, at: at + 0.16 + i * 0.165, dur: 0.25 });
    }
    xx += t.w;
  });
}
//   a small plaque with one tracked word (the era's name). o: x (112), y (258: its top), size (34), at (0.3)
function ptTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.3); if (ptBridgeOff() || TT < at) return;
  const x = o.x ?? 112, y = o.y ?? 258, size = o.size ?? 34, s = str.toUpperCase(), tw = ptTextW(s, size, 700, false, 0.16);
  ptPlaque(x, y, tw + 52, size * 2.0, { key: 'tag' + str, at, dur: 0.3, s: 8, r: 10, pal: o.pal });
  if (TT >= at + 0.08) ptText(s, x + 28, y + size * 1.36, size, o.c ?? PT.ink, { weight: 700, track: 0.16 });
}
const ptCaption = (str, o = {}) => { const f = () => ptCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const ptTag = (str, o = {}) => { const f = () => ptTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the hooks' own pieces
// ---------------------------------------------------------------------
// loose dabs over the whole frame (the backdrop of a bridge), and dabs in the unit disc (the morphing shape)
function ptLoose() { return ptEntry('loose|' + W + 'x' + H, () => { const R = RNG('ptloose'), pts = ptPoisson({ x0: 0, y0: 0, x1: W, y1: H }, 30, R); return { pts: pts.map((p) => ({ x: p.x, y: p.y, a: R.n(0.5), sz: R.r(0.9, 1.15), v: R.i(0, PT_VARS - 1), tn: [-0.1, 0, 0.1][R.i(0, 2)], u: R.f() })) }; }); }
function ptUnit() {
  return ptEntry('unitdisc', () => {
    const R = RNG('ptunit'), r = 0.105, pts = ptPoisson({ x0: -1, y0: -1, x1: 1, y1: 1 }, r, R).filter((p) => Math.hypot(p.x, p.y) < 0.97);
    return { r, pts: pts.map((p) => ({ a: Math.atan2(p.y, p.x), rho: Math.hypot(p.x, p.y), jit: R.n(0.3), sz: R.r(0.9, 1.12), v: R.i(0, PT_VARS - 1), kind: R.f(), tn: [-0.08, 0, 0.08][R.i(0, 2)] })) };
  });
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'pointillism',
  paper: PT.canvas,
  // the bare primed canvas with loose dabs of the era's own colour on it; as the window closes onto the bridge
  // object they are taken away a few at a time (and laid again as the next era opens). Nothing fades.
  backdrop(c, o) {
    ctx.save(); screen(); ctx.fillStyle = PT.canvas; ctx.fillRect(0, 0, W, H);
    const ph = o && o.phase; if (ph === 'morph') { ctx.restore(); return; }
    const col = o && typeof ERA_BG !== 'undefined' ? ERA_BG[ph === 'grow' ? o.eraB : o.eraA] : ptHex(ptRGB(c)), k = !o ? 1 : ph === 'grow' ? o.u : 1 - o.u;
    const M = ctx.getTransform(), near = ptNear(col);
    for (const p of ptLoose().pts) {
      if (p.u > k * 0.9) continue;
      const cs = Math.cos(p.a), sn = Math.sin(p.a), rx = 8.2 * p.sz / PT_RX, ry = 5.6 * p.sz / PT_RY;
      ptStamp(ctx, M, p.x, p.y, cs * rx, sn * rx, -sn * ry, cs * ry, ptTone(p.v === 0 ? near : col, p.tn), p.v);
    }
    ctx.setTransform(M); ctx.restore();
  },
  // the era seen through the bridge shape; its cut edge is hidden under two rows of dabs laid round it, the inner
  // row in the bridge object's colour, the outer in its complement
  window(P, key, src, o = {}) {
    ctx.save(); ptPath(ctx, P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const c = o.c ?? PT.yellow, cc = ptComp(c), Q = resample(P, true, 13), sg = ptInward(P, Q), R = RNG('ptwin', key), M = ctx.getTransform();
    const rows = [[ptOffset(Q, sg * 1.5), [c, c, ptNear(c), PT.white]], [ptOffset(Q, -sg * 12), [cc, cc, ptNear(cc), c]]];
    ctx.save(); ctx.fillStyle = PT.canvas;
    for (const [O, cols] of rows) for (const q of O) {
      const jx = R.n(1.6), jy = R.n(1.6), a = q.a + R.n(0.3), sz = R.r(0.9, 1.12), col = cols[R.i(0, 3)], v = R.i(0, PT_VARS - 1), tn = [-0.1, 0, 0.09][R.i(0, 2)];
      if (q.x < -20 || q.x > W + 20 || q.y < -20 || q.y > H + 20) continue;
      ctx.setTransform(M); ctx.beginPath(); ctx.arc(q.x + jx, q.y + jy, 9.5, 0, TAU); ctx.fill();
      const cs = Math.cos(a), sn = Math.sin(a), rx = 7.6 * sz / PT_RX, ry = 5.2 * sz / PT_RY;
      ptStamp(ctx, M, q.x + jx, q.y + jy, cs * rx, sn * rx, -sn * ry, cs * ry, ptTone(col, tn), v);
    }
    ctx.setTransform(M); ctx.restore();
  },
  // the morphing shape: the same dabs regroup. Each dab keeps its place inside the outline (an angle and a fraction
  // of the radius), so as the outline changes the dabs travel, turning a little round the centre on the way; most
  // carry the blended colour, some its lighter neighbour or white, a few its complement; a ring of complement dabs
  // stands round it
  blob(P, c, key, u = 0) {
    const ce = ptCentroid(P), n = P.length, rad = P.map((p) => Math.hypot(p[0] - ce[0], p[1] - ce[1])), a0 = Math.atan2(P[0][1] - ce[1], P[0][0] - ce[0]);
    const Rm = rad.reduce((a, b) => a + b, 0) / n, U = ptUnit(), col = ptHex(ptRGB(c)), cc = ptComp(col), lite = ptTone(col, 0.35), q = Math.sin(Math.PI * clamp(u));
    const rAt = (a) => { const f = mod((a - a0) / TAU, 1) * n, i = Math.floor(f) % n; return lerp(rad[i], rad[(i + 1) % n], f - Math.floor(f)); };
    const M = ctx.getTransform(), sz = U.r * Rm;
    ctx.save();
    const put = (a, rho, d, css, k) => {
      const rr = rAt(a) * rho, x = ce[0] + Math.cos(a) * rr, y = ce[1] + Math.sin(a) * rr, an = a + Math.PI / 2 + d.jit, cs = Math.cos(an), sn = Math.sin(an), rx = sz * 0.64 * d.sz * k / PT_RX, ry = sz * 0.46 * d.sz * k / PT_RY;
      ptStamp(ctx, M, x, y, cs * rx, sn * rx, -sn * ry, cs * ry, ptTone(css, d.tn), d.v);
    };
    for (const d of U.pts) put(d.a + 0.7 * q * (1 - d.rho), d.rho, d, d.kind < 0.66 ? col : d.kind < 0.82 ? lite : d.kind < 0.92 ? PT.white : cc, 1);
    const m = Math.max(12, Math.round(TAU * Rm * 1.14 / 13));
    for (let i = 0; i < m; i++) { const d = U.pts[i % U.pts.length]; if (d.kind < 0.3) continue; put(i / m * TAU - 0.5 * q + d.jit * 0.1, 1.15 + 0.1 * q + d.jit * 0.12, d, i % 4 === 3 ? ptNear(cc) : cc, 12 / sz); }
    ctx.setTransform(M); ctx.restore();
  },
  hero(x, y, r, o = {}) { ptHero(x, y, r, { key: o.key }); },
  heroColor: PT.verm,
  heroPts(x, y, r) { return ptHeroPts(x, y, r); },
  // the canvas weave over the finished frame (static: a canvas does not flicker)
  post() { ctx.save(); screen(); ctx.drawImage(ptWeave(), 0, 0); ctx.restore(); },
  ones: false,
};
