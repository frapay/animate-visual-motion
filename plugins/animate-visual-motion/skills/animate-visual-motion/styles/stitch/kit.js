// =====================================================================
//  styles/stitch/kit.js — STITCH: hand embroidery and felt appliqué on woven cloth. Shapes are felt patches (flat,
//  fuzzy-edged, a soft shadow) sewn down with blanket or running stitch; lines are thread, drawn stitch by stitch:
//  running, back, chain, blanket, cross, satin fill, French knots; buttons and sequins are the accents. The ground
//  is natural linen (optionally stretched in a wooden hoop) or deep denim. Letters are embroidered (satin threads
//  clipped to the glyphs, a stitched outline) and captions sit on a sewn-on fabric label. The hero is Beru, a felt
//  plush bear with button eyes. Motion on 2s: stitches land one per step, patches drop on and then get sewn down;
//  nothing boils (stitch positions are seeded by path), the cloth only breathes a little (post).
//  Built on kit/core.js. Helpers are prefixed stc…; the palette is STC. Needs from the piece head: CX (caption centre x).
// =====================================================================
const STC = {
  linen: '#e2d3b5', linenD: '#c7b48f', denim: '#22344f', denimD: '#16233a', sageCloth: '#93a685',   // grounds
  brick: '#b5482f', mustard: '#d9a531', sage: '#8aa37b', sageD: '#5f7a55', pink: '#d99a9c', cream: '#f4ead2', teal: '#3d8c8a', tealD: '#2a6462',
  bear: '#c47a3e', ink: '#3a2a22', wood: '#d2a56c', woodD: '#a67842', brass: '#c9a24a', steel: '#cfd4d8',
};
STC.paper = STC.sageCloth;
const STC_FONT = '"Arial Rounded MT Bold", "Varela Round", Nunito, "Segoe UI", "Trebuchet MS", "DejaVu Sans", "Noto Sans", Arial, sans-serif';

// ---------------------------------------------------------------------
//  basics: paths, area, offsets, shades of a colour (hex or rgb()), a cache for static layers (keyed, seeded)
// ---------------------------------------------------------------------
function stcPath(P, closed) { ctx.beginPath(); for (let i = 0; i < P.length; i++) { if (i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[i][0], P[i][1]); } if (closed) ctx.closePath(); }
const stcCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
function stcArea(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }   // > 0 = clockwise on screen
// a closed outline moved d px toward its inside (d < 0: outward)
function stcOffset(P, d) {
  const n = P.length, s = stcArea(P) >= 0 ? 1 : -1;
  return P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [p[0] - ty / l * d * s, p[1] + tx / l * d * s]; });
}
const STC_SHADES = new Map();
function stcRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128]; }
// k > 0 lightens toward warm white, k < 0 darkens toward dark brown
function stcShade(c, k) {
  const id = c + '|' + k; let v = STC_SHADES.get(id); if (v) return v;
  const a = stcRGB(c), t = k > 0 ? [255, 248, 232] : [26, 15, 10], u = Math.abs(k);
  v = `rgb(${a.map((x, i) => Math.round(lerp(x, t[i], u))).join(',')})`; STC_SHADES.set(id, v); return v;
}
const STC_CACHE = {};
function stcCache(key, w, h, draw) {
  if (STC_CACHE[key]) return STC_CACHE[key];
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h);
  const keep = ctx; ctx = cv.getContext('2d'); try { draw(); } finally { ctx = keep; }
  return (STC_CACHE[key] = cv);
}
// one stitch lands every 1/rate s from t0: the fraction of n stitches done (a steady rhythm on 2s)
const stcStep = (t0, n, rate = 12) => (TT < t0 - 1e-6 ? 0 : clamp((Math.floor((TT - t0) * rate + 1e-6) + 1) / n));

// ---------------------------------------------------------------------
//  cloth: the weave (warp and weft threads, slubs, a soft mottle) is one cached neutral layer laid over any ground
//  colour, in world coords (it moves with the camera). stcCloth(c) accepts hex or rgb().
// ---------------------------------------------------------------------
const STC_M = 200;   // the cloth reaches this far past the frame on every side
function stcWeave() {
  return stcCache('weave', W + STC_M * 2, H + STC_M * 2, () => {
    const R = RNG('stcweave'), w = W + STC_M * 2, h = H + STC_M * 2;
    for (let i = 0; i < 26; i++) { const x = R.r(0, w), y = R.r(0, h), r = R.r(180, 480), g = ctx.createRadialGradient(x, y, 0, x, y, r), d = i % 2; g.addColorStop(0, d ? 'rgba(30,18,8,0.07)' : 'rgba(255,246,224,0.07)'); g.addColorStop(1, d ? 'rgba(30,18,8,0)' : 'rgba(255,246,224,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    ctx.lineWidth = 2;
    for (let y = 1; y < h; y += 5) { ctx.strokeStyle = `rgba(28,16,8,${R.r(0.05, 0.16).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(0, y + R.n(0.5)); ctx.lineTo(w, y + R.n(0.5)); ctx.stroke(); }   // weft
    for (let x = 1; x < w; x += 5) { ctx.strokeStyle = `rgba(255,246,224,${R.r(0.05, 0.15).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(x + R.n(0.5), 0); ctx.lineTo(x + R.n(0.5), h); ctx.stroke(); }   // warp
    ctx.fillStyle = 'rgba(28,16,8,0.085)'; for (let y = 0; y < h; y += 5) for (let x = (y / 5 % 2) * 5; x < w; x += 10) ctx.fillRect(x + 3, y + 3, 2.4, 2.4);   // the holes of a plain weave
    for (let i = 0; i < 420; i++) { const d = i % 3 === 0; ctx.fillStyle = d ? `rgba(28,16,8,${R.r(0.05, 0.12).toFixed(3)})` : `rgba(255,246,224,${R.r(0.06, 0.15).toFixed(3)})`; if (i % 2) ctx.fillRect(R.r(0, w), R.r(0, h), R.r(18, 90), 2); else ctx.fillRect(R.r(0, w), R.r(0, h), 2, R.r(18, 90)); }   // slubs
  });
}
function stcCloth(c = STC.linen) { ctx.save(); ctx.fillStyle = c; ctx.fillRect(-STC_M, -STC_M, W + STC_M * 2, H + STC_M * 2); ctx.drawImage(stcWeave(), -STC_M, -STC_M); ctx.restore(); }
// felt fibres: a seamless tile of short pale and dark hairs, used as a pattern over a patch's flat colour
function stcFibre() {
  if (STC_CACHE.fibrePat) return STC_CACHE.fibrePat;
  const S = 180, cv = stcCache('fibre', S, S, () => {
    const R = RNG('stcfibre'); ctx.lineCap = 'round';
    for (let i = 0; i < 1500; i++) {
      const x = R.r(0, S), y = R.r(0, S), a = R.r(0, TAU), l = R.r(3, 10); ctx.lineWidth = R.r(0.7, 1.5);
      ctx.strokeStyle = i % 2 ? `rgba(255,248,232,${R.r(0.05, 0.16).toFixed(3)})` : `rgba(26,15,10,${R.r(0.04, 0.12).toFixed(3)})`;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); ctx.stroke(); }
    }
  });
  return (STC_CACHE.fibrePat = ctx.createPattern(cv, 'repeat'));
}

// ---------------------------------------------------------------------
//  THREAD. stcThread draws a batch of stitches so each sits on top of the cloth: a shadow down-right, the thread,
//  a short highlight up-left. A stitch is [x0, y0, x1, y1], a loop [cx, cy, rx, ry, angle] (chain link, petal) or a
//  polyline [[x, y], ...] (an edge stitch that follows its outline round a corner).
// ---------------------------------------------------------------------
function stcThread(S, c, w) {
  if (!S.length) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pass = (dx, dy, col, lw, k) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    for (const s of S) {
      if (Array.isArray(s[0])) { s.forEach((q, i) => (i ? ctx.lineTo(q[0] + dx, q[1] + dy) : ctx.moveTo(q[0] + dx, q[1] + dy))); continue; }   // a stitch that bends round a corner
      if (s.length === 5) { ctx.moveTo(s[0] + dx + Math.cos(s[4]) * s[2], s[1] + dy + Math.sin(s[4]) * s[2]); ctx.ellipse(s[0] + dx, s[1] + dy, s[2], s[3], s[4], 0, TAU); continue; }
      const mx = (s[0] + s[2]) / 2 + dx, my = (s[1] + s[3]) / 2 + dy, hx = (s[2] - s[0]) / 2 * k, hy = (s[3] - s[1]) / 2 * k; ctx.moveTo(mx - hx, my - hy); ctx.lineTo(mx + hx, my + hy);
    }
    ctx.stroke();
  };
  pass(w * 0.22, w * 0.44, 'rgba(24,14,8,0.38)', w, 1); pass(0, 0, c, w, 1); pass(-w * 0.14, -w * 0.2, stcShade(c, 0.42), w * 0.3, 0.6);
  ctx.restore();
}
// an arc-length reader for a polyline: at(s) -> [x, y, tx, ty]; span(s, d) -> the piece of the path from s to s + d
function stcRun(P, closed) {
  const Q = closed ? P.concat([P[0]]) : P, S = [0]; for (let i = 1; i < Q.length; i++) S.push(S[i - 1] + dist(Q[i - 1], Q[i]));
  const L = S[S.length - 1];
  return { L, span(s0, d) {
    const a = closed ? mod(s0, L) : s0, out = [], put = (q) => out.push([q[0], q[1]]), mid = (u, v) => { for (let i = 0; i < Q.length; i++) if (S[i] > u + 0.01 && S[i] < v - 0.01) put(Q[i]); };
    put(this.at(a)); if (closed && a + d > L) { mid(a, L + 1); mid(-1, a + d - L); } else mid(a, a + d); put(this.at(a + d)); return out;
  }, at(s) {
    s = closed ? mod(s, L) : clamp(s, 0, L); let lo = 1, hi = Q.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (S[m] < s) lo = m + 1; else hi = m; }
    const a = Q[lo - 1], b = Q[lo], d = S[lo] - S[lo - 1] || 1, k = (s - S[lo - 1]) / d; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), (b[0] - a[0]) / d, (b[1] - a[1]) / d];
  } };
}
// ---------------------------------------------------------------------
//  stcStitch(P, o): stitches along any path, appearing in order. o: { type: 'running' | 'back' | 'chain' | 'blanket' |
//  'cross' | 'knot', c, w (thread width), len (stitch length; for blanket the spacing), gap, n (fix the count, so the
//  stitches follow a morphing outline), closed, frac (0..1 of the stitches sewn), key (seeds the tiny hand jitter),
//  prong (blanket: length of the teeth), out (blanket teeth point outward) }.
//  Returns the needle position { x, y, ang } while frac < 1, else null.
// ---------------------------------------------------------------------
function stcStitch(P, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0 || P.length < 2) return null;
  const type = o.type ?? 'running', closed = !!o.closed, w = o.w ?? 5, c = o.c ?? STC.cream, run = stcRun(P, closed), L = run.L; if (L < 2) return null;
  const len = o.len ?? w * ({ running: 3.2, back: 3.6, chain: 3.4, blanket: 4.4, cross: 2.6, knot: 2 }[type]), gap = o.gap ?? (type === 'running' ? len * 0.8 : type === 'cross' || type === 'knot' ? len : 0);
  const n = o.n ?? Math.max(closed ? 3 : 1, closed || !gap ? Math.round(L / (len + gap)) : Math.floor((L + gap) / (len + gap)));
  const pitch = closed || !gap ? L / n : len + gap, body = closed ? pitch * len / (len + gap) : len, start = closed || !gap ? 0 : (L - (n * pitch - gap)) / 2;
  const show = frac >= 1 ? n : Math.floor(n * frac + 1e-6), R = RNG('stc', o.key ?? type), S = [], K = [], sgn = (closed ? (stcArea(P) >= 0 ? 1 : -1) : 1) * (o.out ? -1 : 1), e = Math.min(pitch * 0.14, w * 0.5 + 0.6);
  for (let i = 0; i < show; i++) {
    const s0 = start + i * pitch, j = R.n(w * 0.12), j2 = R.n(0.06);
    if (type === 'running') { const a = run.at(s0 + (closed ? (pitch - body) / 2 : 0)), b = run.at(s0 + (closed ? (pitch + body) / 2 : body)); S.push([a[0] - a[3] * j, a[1] + a[2] * j, b[0] + b[3] * j, b[1] - b[2] * j]); }
    else if (type === 'back') S.push(run.span(s0 + e, pitch - e * 2));
    else if (type === 'chain') { const a = run.at(s0 + pitch / 2); S.push([a[0], a[1], pitch * 0.58, w * 1.05, Math.atan2(a[3], a[2])]); }
    else if (type === 'blanket') {
      const a = run.at(s0), pr = (o.prong ?? w * 3.2) * (1 + j2); S.push(run.span(s0, pitch - e * 0.5));
      S.push([a[0], a[1], a[0] - a[3] * pr * sgn + a[2] * j, a[1] + a[2] * pr * sgn + a[3] * j]);
    } else if (type === 'cross') { const a = run.at(s0 + pitch / 2), h = body / 2, ux = a[2] * h, uy = a[3] * h; K.push([a[0] - ux + uy, a[1] - uy - ux, a[0] + ux - uy, a[1] + uy + ux]); S.push([a[0] - ux - uy, a[1] - uy + ux, a[0] + ux + uy, a[1] + uy - ux]); }
    else { const a = run.at(s0 + pitch / 2); stcKnot(a[0], a[1], w, c); }
  }
  if (K.length) stcThread(K, stcShade(c, -0.2), type === 'cross' ? w * 0.8 : w);
  stcThread(S, c, type === 'chain' ? w * 0.6 : type === 'cross' ? w * 0.8 : w);
  if (frac >= 1) return null;
  const t = run.at(start + show * pitch); return { x: t[0], y: t[1], ang: Math.atan2(t[3], t[2]) };
}
// a French knot: a tight coil of thread that stands proud of the cloth
function stcKnot(x, y, r, c, k = 1) {
  if (k <= 0) return; r *= k; ctx.save();
  ctx.fillStyle = 'rgba(24,14,8,0.36)'; ctx.beginPath(); ctx.arc(x + r * 0.22, y + r * 0.4, r, 0, TAU); ctx.fill();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = stcShade(c, -0.3); ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0.6, 4.4); ctx.stroke();
  ctx.fillStyle = stcShade(c, 0.5); ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.38, r * 0.24, 0, TAU); ctx.fill();
  ctx.restore();
}
// ---------------------------------------------------------------------
//  stcSatin(P, c, o): satin stitch — dense parallel threads clipped to outline P, with a sheen across them.
//  o: { ang (thread direction), gap, frac (threads laid so far, 0..1), sheen (0..1 position of the shine), edge
//  (colour of a backstitched outline), ew, key }
// ---------------------------------------------------------------------
function stcSatin(P, c, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const gap = o.gap ?? 3.6, bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 2, top = -rad + rad * 2 * frac;
  ctx.save(); ctx.save(); ctx.translate(1.5, 3); stcPath(P, true); ctx.fillStyle = 'rgba(24,14,8,0.3)'; if (frac >= 1) ctx.fill(); ctx.restore();
  stcPath(P, true); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(o.ang ?? -0.5);
  ctx.fillStyle = stcShade(c, -0.28); ctx.fillRect(-rad, -rad, rad * 2, top + rad);
  for (const [k, off] of [[0, 0], [0.16, gap]]) { ctx.strokeStyle = k ? stcShade(c, k) : c; ctx.lineWidth = gap * 0.82; ctx.beginPath(); for (let d = -rad + off; d < top; d += gap * 2) { ctx.moveTo(-rad, d); ctx.lineTo(rad, d); } ctx.stroke(); }
  const sh = lerp(-rad, rad, o.sheen ?? 0.38), g = ctx.createLinearGradient(sh - rad * 0.5, 0, sh + rad * 0.5, 0);
  g.addColorStop(0, 'rgba(255,250,235,0)'); g.addColorStop(0.5, 'rgba(255,250,235,0.3)'); g.addColorStop(1, 'rgba(255,250,235,0)'); ctx.fillStyle = g; ctx.fillRect(-rad, -rad, rad * 2, top + rad);
  ctx.restore();
  if (o.edge && frac >= 1) stcStitch(P, { type: 'back', closed: true, c: o.edge, w: o.ew ?? 3, key: o.key ?? 'satin' });
}
// ---------------------------------------------------------------------
//  cross-stitch. stcXs(cells, cell, frac): little X's at [x, y, colour] (top-left corners), sewn in list order.
//  stcCross(rows, x, y, cell, o): a small bitmap, one X per character; o.pal maps characters to colours ('.' and ' '
//  are empty), o.frac. stcCrossBorder(x, y, w, h, cell, o): a frame of X's, o.cols cycles along it, o.frac.
// ---------------------------------------------------------------------
function stcXs(cells, cell, frac = 1) {
  const show = Math.floor(cells.length * clamp(frac) + 1e-6), by = new Map(), m = cell * 0.16, w = cell * 0.2;
  for (let i = 0; i < show; i++) { const [x, y, c] = cells[i]; if (!by.has(c)) by.set(c, [[], []]); const g = by.get(c); g[0].push([x + m, y + m, x + cell - m, y + cell - m]); g[1].push([x + m, y + cell - m, x + cell - m, y + m]); }
  for (const [c, g] of by) { stcThread(g[0], stcShade(c, -0.2), w); stcThread(g[1], c, w); }
}
function stcCross(rows, x, y, cell, o = {}) {
  const pal = o.pal ?? { '#': STC.brick }, cells = [];
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) cells.push([x + i * cell, y + j * cell, pal[ch]]); }));
  stcXs(cells, cell, o.frac ?? 1);
}
function stcCrossBorder(x, y, w, h, cell, o = {}) {
  const nx = Math.round(w / cell), ny = Math.round(h / cell), cols = o.cols ?? [STC.cream, STC.cream, STC.brick], ring = [], cells = [];
  for (let i = 0; i < nx; i++) ring.push([i, 0, 0, 1]); for (let j = 0; j < ny; j++) ring.push([nx - 1, j, -1, 0]);
  for (let i = nx - 1; i >= 0; i--) ring.push([i, ny - 1, 0, -1]); for (let j = ny - 1; j >= 0; j--) ring.push([0, j, 1, 0]);
  ring.forEach(([i, j, ix, iy], k) => {
    const c = cols[k % cols.length]; cells.push([x + i * cell, y + j * cell, c]);
    if (k % cols.length === cols.length - 1 && i + ix * 2 >= 2 && i + ix * 2 <= nx - 3 && j + iy * 2 >= 2 && j + iy * 2 <= ny - 3) cells.push([x + (i + ix * 2) * cell, y + (j + iy * 2) * cell, o.dot ?? STC.mustard]);   // a second, sparse row inside
  });
  stcXs(cells, cell, o.frac ?? 1);
}

// ---------------------------------------------------------------------
//  stcFelt(P, c, o): a felt patch from any closed outline — a soft shadow, flat colour, fibres, a fuzzy edge — sewn
//  down along its edge. o: { key, stitch: 'blanket' | 'running' | 'back' | 'none', thread, sw (thread width), pitch
//  (stitch spacing), n (fixed stitch count), sewn (0..1 of the edge stitched), drop (0..1: the patch landing on the
//  cloth), lift (shadow size), tex: 'weave' = a woven label instead of felt }. Returns stcStitch's needle position.
// ---------------------------------------------------------------------
function stcFelt(P, c, o = {}) {
  const drop = clamp(o.drop ?? 1); if (drop <= 0) return null;
  const lift = (o.lift ?? 1) * lerp(2.6, 1, EZ.o2(drop)), sw = o.sw ?? 4.5, bb = bbox(P, 6);
  ctx.save();
  if (drop < 1) { const m = stcCentroid(P), k = lerp(1.2, 1, EZ.o3(drop)); ctx.translate(m[0], m[1] - (1 - EZ.o2(drop)) * 46); ctx.scale(k, k); ctx.translate(-m[0], -m[1]); ctx.globalAlpha *= clamp(drop * 4); }
  ctx.save(); ctx.shadowColor = 'rgba(24,14,8,0.42)'; ctx.shadowBlur = 9 * lift; ctx.shadowOffsetX = 2.5 * lift; ctx.shadowOffsetY = 5 * lift; stcPath(P, true); ctx.fillStyle = c; ctx.fill(); ctx.restore();
  ctx.save(); stcPath(P, true); ctx.lineJoin = 'round';
  if (o.tex !== 'weave') { ctx.strokeStyle = stcShade(c, 0.14); ctx.lineWidth = 3.2; ctx.setLineDash([1.6, 2.4]); ctx.stroke(); ctx.setLineDash([]); }   // the fuzzy edge
  ctx.clip();
  if (o.tex === 'weave') { ctx.globalAlpha *= 0.7; ctx.drawImage(stcWeave(), bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0, bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.globalAlpha /= 0.7; }
  else { ctx.fillStyle = stcFibre(); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); }
  stcPath(P, true); ctx.strokeStyle = 'rgba(24,14,8,0.1)'; ctx.lineWidth = 12; ctx.stroke(); ctx.restore();   // the edge rolls away from the light
  const st = o.stitch ?? 'blanket'; let tip = null;
  if (st !== 'none' && drop >= 1) tip = stcStitch(st === 'blanket' ? P : stcOffset(P, sw * 2.2), { type: st, closed: true, c: o.thread ?? STC.cream, w: sw, len: o.pitch ?? (st === 'blanket' ? sw * 4.4 : undefined), n: o.n, frac: o.sewn ?? 1, key: o.key ?? 'felt', prong: o.prong });
  ctx.restore(); return tip;
}
// a button: two or four holes with thread through them. o: { holes, thread, rot, pop (scale 0..1+) }
function stcButton(x, y, r, c, o = {}) {
  const k = o.pop ?? 1; if (k <= 0) return; const holes = o.holes ?? 4, d = r * 0.21;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(o.rot ?? 0);
  ctx.save(); ctx.shadowColor = 'rgba(24,14,8,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
  ctx.lineCap = 'round'; ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = stcShade(c, -0.28); ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0.2, 1.9); ctx.stroke();
  ctx.strokeStyle = stcShade(c, 0.4); ctx.beginPath(); ctx.arc(0, 0, r * 0.93, 3.5, 4.9); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0.4, 1.6); ctx.stroke();
  const H = holes === 2 ? [[-d, 0], [d, 0]] : [[-d, -d], [d, -d], [d, d], [-d, d]];
  ctx.fillStyle = stcShade(c, -0.7); for (const [hx, hy] of H) { ctx.beginPath(); ctx.arc(hx, hy, r * 0.1, 0, TAU); ctx.fill(); }
  stcThread(holes === 2 ? [[-d, 0, d, 0]] : [[-d, -d, d, d], [d, -d, -d, d]], o.thread ?? STC.cream, r * 0.13);
  ctx.restore();
}
// a sequin: a shiny disc held by one stitch; its glint comes and goes
function stcSequin(x, y, r, c, o = {}) {
  const k = o.pop ?? 1; if (k <= 0) return; const tw = 0.5 + 0.5 * Math.sin(TT * 5.2 + (o.ph ?? x * 0.013));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = 'rgba(24,14,8,0.4)'; ctx.beginPath(); ctx.arc(1.5, 3, r, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, stcShade(c, 0.45)); g.addColorStop(0.5, c); g.addColorStop(1, stcShade(c, -0.3)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  stcThread([[0, 0, r * 0.95, r * 0.1]], o.thread ?? STC.cream, Math.max(1.6, r * 0.16));
  ctx.fillStyle = `rgba(255,252,240,${(0.25 + 0.75 * tw).toFixed(3)})`; const q = r * (0.5 + 0.7 * tw);
  ctx.beginPath(); ctx.moveTo(-r * 0.3 - q, -r * 0.3); ctx.quadraticCurveTo(-r * 0.3, -r * 0.3, -r * 0.3, -r * 0.3 - q); ctx.quadraticCurveTo(-r * 0.3, -r * 0.3, -r * 0.3 + q, -r * 0.3); ctx.quadraticCurveTo(-r * 0.3, -r * 0.3, -r * 0.3, -r * 0.3 + q); ctx.quadraticCurveTo(-r * 0.3, -r * 0.3, -r * 0.3 - q, -r * 0.3); ctx.fill();
  ctx.restore();
}
// the needle, its point at (x, y), trailing thread from the last stitch. o: { ang (point -> eye), len, c (thread),
// from: [x, y] (where the thread leaves the cloth), dip (0..1: how much of the point is through the cloth) }
function stcNeedle(x, y, o = {}) {
  const ang = o.ang ?? -1.0, len = (o.len ?? 215) * (1 - (o.dip ?? 0) * 0.4), ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux, w0 = (o.dip ?? 0) * 5 + 0.8;
  const ex = x + ux * len * 0.93, ey = y + uy * len * 0.93, f = o.from ?? [x, y], c = o.c ?? STC.cream;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [dx, dy, col, lw] of [[2, 4, 'rgba(24,14,8,0.3)', 4], [0, 0, c, 3.4]]) {   // the thread: a slack curve to the eye, then a loose tail
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(f[0] + dx, f[1] + dy);
    ctx.quadraticCurveTo((f[0] + ex) / 2 + px * 46 + dx, (f[1] + ey) / 2 + py * 46 + 26 + dy, ex + dx, ey + dy);
    ctx.bezierCurveTo(ex + px * 40 + dx, ey + py * 40 + dy, ex + 54 + dx, ey + 44 + dy, ex + 38 + dx, ey + 104 + dy); ctx.stroke();
  }
  const body = (dx, dy) => { ctx.beginPath(); ctx.moveTo(x + px * w0 + dx, y + py * w0 + dy); ctx.lineTo(x + ux * len + px * 6 + dx, y + uy * len + py * 6 + dy); ctx.lineTo(x + ux * len - px * 6 + dx, y + uy * len - py * 6 + dy); ctx.lineTo(x - px * w0 + dx, y - py * w0 + dy); ctx.closePath(); };
  body(5, 9); ctx.fillStyle = 'rgba(24,14,8,0.28)'; ctx.fill();
  body(0, 0); ctx.fillStyle = STC.steel; ctx.fill(); ctx.strokeStyle = '#5c646b'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + ux * len * 0.12 - px, y + uy * len * 0.12 - py); ctx.lineTo(x + ux * len * 0.8 - px * 1.6, y + uy * len * 0.8 - py * 1.6); ctx.stroke();
  ctx.strokeStyle = STC.ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x + ux * len * 0.9, y + uy * len * 0.9); ctx.lineTo(x + ux * len * 0.96, y + uy * len * 0.96); ctx.stroke();   // the eye
  ctx.restore();
}
// a wooden embroidery hoop around (cx, cy), inner radius r: the cloth outside it hangs loose (darker), the ring casts
// a shadow on the taut cloth inside, a brass screw clasp sits on top. Static: cached.
function stcHoop(cx, cy, r, o = {}) {
  const wd = o.w ?? 36, pad = 110, S = (r + wd + pad) * 2, m = S / 2;
  const cv = stcCache('hoop' + r + '|' + wd, S, S, () => {
    const R = RNG('stchoop', r), rc = r + wd / 2;
    ctx.fillStyle = 'rgba(40,24,10,0.15)'; ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(m, m, r + wd, 0, TAU, true); ctx.fill('evenodd');   // loose cloth outside
    const g = ctx.createRadialGradient(m, m, r - 46, m, m, r); g.addColorStop(0, 'rgba(24,14,8,0)'); g.addColorStop(1, 'rgba(24,14,8,0.3)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m, m, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.shadowColor = 'rgba(24,14,8,0.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 10; ctx.strokeStyle = STC.wood; ctx.lineWidth = wd; ctx.beginPath(); ctx.arc(m, m, rc, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.lineCap = 'round';
    for (let i = 0; i < 90; i++) { const rr = rc + R.n(wd * 0.44), a = R.r(0, TAU); ctx.strokeStyle = i % 2 ? `rgba(120,78,36,${R.r(0.18, 0.4).toFixed(3)})` : `rgba(255,236,196,${R.r(0.15, 0.35).toFixed(3)})`; ctx.lineWidth = R.r(1, 2.2); ctx.beginPath(); ctx.arc(m, m, rr, a, a + R.r(0.2, 0.9)); ctx.stroke(); }   // grain
    ctx.strokeStyle = 'rgba(90,56,24,0.6)'; ctx.lineWidth = 2.5; for (const rr of [r + 1, r + wd * 0.42, r + wd - 1]) { ctx.beginPath(); ctx.arc(m, m, rr, 0, TAU); ctx.stroke(); }   // inner ring | outer ring
    ctx.strokeStyle = 'rgba(255,244,214,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m, m, r + wd * 0.74, 3.5, 5.0); ctx.stroke();
    const y0 = m - r - wd - 44;   // the clasp: two wooden lugs, a brass bolt and a round nut
    ctx.fillStyle = STC.woodD; ctx.fillRect(m - 40, y0 + 8, 26, 50); ctx.fillRect(m + 14, y0 + 8, 26, 50); ctx.fillStyle = 'rgba(24,14,8,0.5)'; ctx.fillRect(m - 14, y0 + 30, 28, 30);
    ctx.strokeStyle = STC.brass; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(m - 58, y0 + 28); ctx.lineTo(m + 62, y0 + 28); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,60,10,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = m - 12; x <= m + 12; x += 5) { ctx.moveTo(x, y0 + 24); ctx.lineTo(x + 2, y0 + 32); } ctx.stroke();
    ctx.fillStyle = STC.brass; ctx.beginPath(); ctx.arc(m + 68, y0 + 28, 17, 0, TAU); ctx.fill(); ctx.strokeStyle = stcShade(STC.brass, -0.4); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = stcShade(STC.brass, 0.5); ctx.beginPath(); ctx.arc(m + 63, y0 + 23, 5, 0, TAU); ctx.fill();
  });
  ctx.save(); ctx.fillStyle = 'rgba(40,24,10,0.15)'; ctx.beginPath(); ctx.rect(-STC_M, -STC_M, W + STC_M * 2, H + STC_M * 2); ctx.rect(cx - m, cy - m, S, S); ctx.fill('evenodd'); ctx.drawImage(cv, cx - m, cy - m); ctx.restore();
}

// ---------------------------------------------------------------------
//  shapes and small embroidered motifs
// ---------------------------------------------------------------------
function stcHeartPts(x, y, r, n = 72) { const P = []; for (let i = 0; i < n; i++) { const t = i / n * TAU; P.push([x + 16 * Math.sin(t) ** 3 * r / 16, y + (-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.5) * r / 16]); } return P; }
// a house silhouette (roof with eaves on a body) centred on (x, y), w wide at the eaves, h tall
function stcHousePts(x, y, w, h) { const t = y - h / 2, e = t + h * 0.38, b = w * 0.42; return [[x, t], [x + w / 2, e], [x + b, e], [x + b, y + h / 2], [x - b, y + h / 2], [x - b, e], [x - w / 2, e]]; }
function stcLeafPts(x0, y0, x1, y1, wid, n = 9) { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L, A = [], Bk = []; for (let i = 0; i <= n; i++) { const u = i / n, hw = wid * Math.sin(Math.PI * u ** 0.8); A.push([x0 + dx * u + px * hw, y0 + dy * u + py * hw]); if (i > 0 && i < n) Bk.unshift([x0 + dx * u - px * hw, y0 + dy * u - py * hw]); } return A.concat(Bk); }
// a satin-stitched leaf with a backstitched vein. k = growth 0..1
function stcLeaf(x0, y0, x1, y1, wid, c = STC.sage, k = 1) {
  if (k <= 0) return; const e = EZ.o2(k), X = lerp(x0, x1, e), Y = lerp(y0, y1, e);
  stcSatin(stcLeafPts(x0, y0, X, Y, wid * e), c, { ang: Math.atan2(Y - y0, X - x0) + 0.9, gap: 3.2 });
  stcStitch([[x0, y0], [lerp(x0, X, 0.8), lerp(y0, Y, 0.8)]], { type: 'back', c: stcShade(c, -0.4), w: 2.4, key: 'vein' });
}
// a lazy-daisy flower: looped petals sewn one by one around a French knot. o: { n, frac, rot, centre }
function stcFlower(x, y, r, c = STC.pink, o = {}) {
  const n = o.n ?? 6, show = Math.floor(n * clamp(o.frac ?? 1) + 1e-6), S = [], T = []; if (show <= 0) return;
  for (let i = 0; i < show; i++) { const a = (o.rot ?? 0) + i / n * TAU, ca = Math.cos(a), sa = Math.sin(a); S.push([x + ca * r * 0.56, y + sa * r * 0.56, r * 0.42, r * 0.2, a]); T.push([x + ca * r * 0.94, y + sa * r * 0.94, x + ca * r * 1.08, y + sa * r * 1.08]); }
  stcThread(S, c, Math.max(2.4, r * 0.11)); stcThread(T, stcShade(c, -0.25), Math.max(2, r * 0.09));
  if (show >= n) stcKnot(x, y, r * 0.2, o.centre ?? STC.mustard);
}
// a straight-stitch star (four threads crossing). k = pop 0..1+
function stcStar(x, y, r, c = STC.cream, k = 1, rot = 0) {
  if (k <= 0) return; const S = []; for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 4, q = r * k * (i % 2 ? 0.6 : 1); S.push([x - Math.cos(a) * q, y - Math.sin(a) * q, x + Math.cos(a) * q, y + Math.sin(a) * q]); }
  stcThread(S, c, Math.max(2, r * 0.16));
}
// a tuft of grass: a fan of straight stitches
function stcTuft(x, y, h, c = STC.sageD, k = 1) { if (k > 0) stcThread([-0.5, -0.12, 0.3].map((a, i) => [x + i * 3 - 3, y, x + i * 3 - 3 + Math.sin(a) * h * k, y - Math.cos(a) * h * k * (i === 1 ? 1 : 0.76)]), c, 3.2); }

// a little felt house: brick body, sage roof with a cross-stitch heart in the gable, satin-stitch windows, a cream
// door, a chimney. Same box as stcHousePts(x, y, w, h). o: { key, body, roof, sheen (0..1: where the windows shine) }
const STC_HEART = [' # # ', '#####', '#####', ' ### ', '  #  '];
function stcHouse(x, y, w, h, o = {}) {
  const t = y - h / 2, e = t + h * 0.38, b = w * 0.42, bot = y + h / 2, key = o.key ?? 'house', F = { sw: 5, pitch: 26, prong: 14 };
  stcFelt([[x - b * 0.62, t + h * 0.06], [x - b * 0.32, t + h * 0.06], [x - b * 0.32, t + h * 0.26], [x - b * 0.62, t + h * 0.26]], o.body ?? STC.brick, { sw: 3, pitch: 13, prong: 8, key: key + 'ch' });
  stcFelt([[x - b, e - 8], [x + b, e - 8], [x + b, bot], [x - b, bot]], o.body ?? STC.brick, { ...F, key: key + 'body' });
  stcFelt([[x, t], [x + w / 2, e], [x - w / 2, e]], o.roof ?? STC.sage, { ...F, key: key + 'roof' });
  stcStitch([[x - w * 0.3, e - h * 0.105], [x + w * 0.3, e - h * 0.105]], { type: 'running', c: STC.sageD, w: 4, key: key + 'tile' });
  const cell = w / 24; stcCross(STC_HEART, x - cell * 2.5, t + h * 0.115, cell, { pal: { '#': o.body ?? STC.brick } });
  const dw = b * 0.24, dh = h * 0.27, door = [[x + dw, bot - 6], [x - dw, bot - 6], [x - dw, bot - dh + dw]].concat(arcPts(x, bot - dh + dw, dw, Math.PI, TAU, 12));
  stcFelt(door, STC.cream, { stitch: 'running', thread: STC.brick, sw: 3, lift: 0.4, key: key + 'door' }); stcKnot(x + dw * 0.45, bot - dh * 0.45, 5.5, STC.mustard);
  for (const d of [-1, 1]) {
    const ws = b * 0.21, wx = x + d * b * 0.62, wy = e + (bot - e) * 0.2, P = rrectPts(wx - ws, wy, ws * 2, ws * 2, 5, 3);
    stcSatin(P, STC.mustard, { ang: 0.5, sheen: o.sheen ?? 0.4, edge: STC.cream, ew: 3, key: key + 'win' + d });
    stcStitch([[wx, wy + 3], [wx, wy + ws * 2 - 3]], { type: 'back', c: STC.cream, w: 3, n: 3 }); stcStitch([[wx - ws + 3, wy + ws], [wx + ws - 3, wy + ws]], { type: 'back', c: STC.cream, w: 3, n: 3 });
  }
}

// ---------------------------------------------------------------------
//  lettering: system bold rounded glyphs rendered as embroidery — satin threads clipped to the letters, a stitched
//  (dashed) outline in a deeper shade, a thread shadow. Static per string: cached. Reveal letter by letter with o.frac.
//  o: { frac, align: 'center', ls (letter spacing px), weight }
// ---------------------------------------------------------------------
function stcFontSet(size, o = {}) { ctx.font = `${o.weight ?? 700} ${size}px ${STC_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls ?? 0) + 'px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; }
function stcWordW(str, size, o = {}) { ctx.save(); stcFontSet(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function stcWord(str, x, y, size, c, o = {}) {
  const frac = clamp(o.frac ?? 1), w = stcWordW(str, size, o); if (frac <= 0 || !str.trim()) return w;
  const pad = Math.ceil(size * 0.3), by = pad + Math.ceil(size * 1.1), x0 = o.align === 'center' ? x - w / 2 : x;
  const cv = stcCache(['word', str, size, c, o.ls ?? 0, o.weight ?? 700].join('|'), w + pad * 2, by + size * 0.45 + pad, () => {
    const cw = w + pad * 2, ch = by + size * 0.45 + pad, g = Math.max(3, size * 0.06);
    stcFontSet(size, o); ctx.fillStyle = c; ctx.fillText(str, pad, by);
    ctx.globalCompositeOperation = 'source-atop'; ctx.lineWidth = g * 0.5;
    for (const [k, off] of [[0.2, 0], [-0.16, g / 2]]) { ctx.strokeStyle = stcShade(c, k); ctx.beginPath(); for (let d = -ch + off; d < cw; d += g) { ctx.moveTo(d, ch); ctx.lineTo(d + ch * 0.55, 0); } ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = stcShade(c, -0.38); ctx.lineWidth = Math.max(1.6, size * 0.04); ctx.setLineDash([size * 0.1, size * 0.085]); ctx.strokeText(str, pad, by);
  });
  ctx.save();
  if (frac < 1) { const k = Math.floor(str.length * frac + 1e-6); ctx.beginPath(); ctx.rect(x0 - pad, y - by, pad + stcWordW(str.slice(0, k), size, o) + 1, cv.height); ctx.clip(); }
  ctx.shadowColor = 'rgba(24,14,8,0.4)'; ctx.shadowBlur = 2; ctx.shadowOffsetX = 1.5; ctx.shadowOffsetY = 3; ctx.drawImage(cv, x0 - pad, y - by);
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  the hero: BERU, a felt plush bear — caramel felt sewn with cream blanket stitch, button eyes, a satin nose, a
//  backstitched smile, a heart patch on the tummy. (x, y) = its middle, s = half its height.
//  o: { key, wave (true: the right arm waves), drop (0..1 landing), face: -1 mirrors }. Idle: bob, head tilt, ear wiggle.
// ---------------------------------------------------------------------
function stcBear(x, y, s, o = {}) {
  const drop = clamp(o.drop ?? 1); if (drop <= 0) return;
  const key = o.key ?? 'beru', ph = key.length * 0.7, bob = Math.sin(TT * 2.4 + ph) * s * 0.018, tilt = Math.sin(TT * 1.7 + ph) * 0.07, tw = Math.max(0, Math.sin(TT * TAU / 1.5 + ph)) ** 8;
  const sw = Math.max(2.2, s * 0.02), pitch = Math.max(9, s * 0.085), F = { thread: STC.cream, sw, pitch, prong: sw * 2.6, lift: 0.6 }, E = (cx, cy, rx, ry, rot = 0, n = 40) => ellipsePts(cx * s, cy * s, rx * s, ry * s, rot, n);
  ctx.save(); ctx.translate(x, y + bob); SPARK_AT = toScreen(0, 0);
  if (drop < 1) { const k = lerp(1.25, 1, EZ.o3(drop)); ctx.translate(0, -(1 - EZ.o2(drop)) * s * 0.4); ctx.scale(k * (o.face ?? 1), k); ctx.globalAlpha *= clamp(drop * 4); } else if (o.face === -1) ctx.scale(-1, 1);
  for (const d of [-1, 1]) { stcFelt(E(d * 0.25, 0.82, 0.2, 0.17), STC.bear, { ...F, key: key + 'leg' + d }); stcFelt(E(d * 0.26, 0.85, 0.1, 0.085, 0, 20), STC.cream, { stitch: 'none', lift: 0.2 }); }
  stcFelt(E(0, 0.37, 0.43, 0.46), STC.bear, { ...F, key: key + 'body' });
  stcFelt(E(0, 0.43, 0.25, 0.27, 0, 30), STC.cream, { stitch: 'running', thread: STC.bear, sw: sw * 0.8, lift: 0.3, key: key + 'tum' });
  stcFelt(stcHeartPts(0, 0.42 * s, 0.105 * s, 30), STC.brick, { stitch: 'none', lift: 0.3 });
  for (const d of [-1, 1]) {   // arms, in front of the body: the left hangs, the right can wave
    const a = d === 1 && o.wave ? -2.25 + Math.sin(TT * 7.5) * 0.32 : d * -0.5 + Math.sin(TT * 2.4 + d) * 0.05;
    ctx.save(); ctx.translate(d * 0.37 * s, 0.14 * s); ctx.rotate(a); stcFelt(E(0, 0.2, 0.125, 0.25, 0, 30), STC.bear, { ...F, key: key + 'arm' + d }); ctx.restore();
  }
  ctx.translate(0, -0.42 * s); ctx.rotate(tilt);
  for (const d of [-1, 1]) { ctx.save(); ctx.translate(d * 0.36 * s, -0.33 * s); ctx.rotate(d * (0.1 + (d === 1 ? tw : 0) * 0.42)); stcFelt(E(0, -0.1, 0.19, 0.19, 0, 30), STC.bear, { ...F, key: key + 'ear' + d }); stcFelt(E(0, -0.085, 0.085, 0.085, 0, 20), STC.pink, { stitch: 'none', lift: 0.2 }); ctx.restore(); }
  stcFelt(E(0, 0, 0.54, 0.47, 0, 48), STC.bear, { ...F, key: key + 'head' });
  for (const d of [-1, 1]) stcFelt(E(d * 0.35, 0.14, 0.075, 0.06, 0, 16), STC.pink, { stitch: 'none', lift: 0.15 });
  stcFelt(E(0, 0.15, 0.23, 0.17, 0, 30), STC.cream, { stitch: 'running', thread: STC.bear, sw: sw * 0.8, lift: 0.3, key: key + 'muz' });
  stcSatin(E(0, 0.07, 0.075, 0.05, 0, 18), STC.ink, { ang: 0, gap: 2.6 });
  stcStitch([[0, 0.12 * s], [0, 0.18 * s]], { type: 'back', c: STC.ink, w: sw * 0.9, n: 1 });
  stcStitch(arcPts(0, 0.1 * s, 0.14 * s, 0.5, Math.PI - 0.5, 12), { type: 'back', c: STC.ink, w: sw * 0.9, n: 5, key: 'smile' });
  for (const d of [-1, 1]) stcButton(d * 0.21 * s, -0.07 * s, 0.085 * s, STC.ink, { holes: 2, thread: STC.cream, rot: d * 0.35 });
  ctx.restore();
}
function stcBearPts(x, y, r) { return ellipsePts(x, y, r * 0.62, r, 0, 64); }

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size). The caption is a sewn-on fabric label: a cream
//  ribbon with pinked ends drops on, a running stitch sews along its edges, the embroidered lines appear letter by
//  letter; *a phrase* is in brick red with a mustard chain-stitch underline. The tag is a small teal felt tab with a
//  button. Both fade in the first 0.3s of a bridge's shrink and stay hidden while the next era's window grows:
//  after a bridge of half-length d, give the tag { at: d } and the caption { at: d + 0.4 } or later.
// ---------------------------------------------------------------------
function stcLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); if (TT >= r.tc && TT < r.tc + d - 1e-6) return 0; }
  return 1;
}
function stcRibbonPts(x, y, w, h, tooth = 13) { const P = [[x, y], [x + w, y]], n = Math.max(2, Math.round(h / tooth)); for (let i = 0; i < n; i++) P.push([x + w - tooth * 0.6, y + (i + 0.5) * h / n], [x + w, y + (i + 1) * h / n]); P.push([x, y + h]); for (let i = n - 1; i >= 0; i--) P.push([x + tooth * 0.6, y + (i + 0.5) * h / n], [x, y + i * h / n]); P.pop(); return P; }
function stcCaptionNow(str, o = {}) {
  const al = stcLeaving(), at = E0 + (o.at ?? 0.5), land = ev(at - 0.42, 0.25); if (al <= 0.001 || land <= 0) return;
  const size = o.size ?? 62, lh = size * 1.22, raw = str.split('\n'), yLast = o.y ?? 1444, cx = o.x ?? CX;
  const lines = raw.map((line) => { const parts = line.split(/(\*[^*]+\*)/).filter(Boolean).map((g) => (g[0] === '*' ? { s: g.slice(1, -1), hi: true } : { s: g, hi: false })); parts.forEach((p) => { p.w = stcWordW(p.s, size); }); return { parts, w: parts.reduce((a, p) => a + p.w, 0), n: parts.reduce((a, p) => a + p.s.length, 0) }; });
  const bw = Math.max(...lines.map((l) => l.w)) + 120, top = yLast - (lines.length - 1) * lh - size * 0.98 - 26, bot = yLast + size * 0.36 + 28, x0 = cx - bw / 2;
  ctx.save(); ctx.globalAlpha = al;
  stcFelt(stcRibbonPts(x0, top, bw, bot - top), o.bg ?? STC.cream, { tex: 'weave', stitch: 'none', drop: land, lift: 1.1 });
  const sewn = stcStep(at - 1 / 6, 24, 24);   // the running stitch along the top and bottom edges: 12 stitches each
  for (const [yy, k] of [[top + 13, 'T'], [bot - 13, 'B']]) stcStitch([[x0 + 24, yy], [x0 + bw - 24, yy]], { type: 'running', c: o.thread ?? STC.brick, w: 4, n: 12, len: (bw - 48) / 12 * 0.56, gap: (bw - 48) / 12 * 0.44, frac: clamp(sewn * 2 - (k === 'B' ? 1 : 0)), key: 'cap' + k });
  lines.forEach((line, li) => {
    const fr = ev(at + li * 0.33, 0.5); if (fr <= 0) return;
    const yy = yLast - (lines.length - 1 - li) * lh; let xx = cx - line.w / 2, left = Math.floor(line.n * fr + 1e-6);
    for (const p of line.parts) {
      const f = clamp(left / p.s.length); left = Math.max(0, left - p.s.length);
      if (p.hi && f >= 1) stcStitch([[xx + 2, yy + size * 0.2], [xx + p.w - 2, yy + size * 0.2]], { type: 'chain', c: o.under ?? STC.mustard, w: 4.4, frac: stcStep(at + li * 0.33 + 0.5, Math.round(p.w / 15)), key: 'under' });
      stcWord(p.s, xx, yy, size, p.hi ? (o.hi ?? STC.brick) : (o.c ?? STC.ink), { frac: f }); xx += p.w;
    }
  });
  ctx.restore();
}
function stcTagNow(label, o = {}) {
  const al = stcLeaving(), land = ev(E0 + (o.at ?? 0.15), 0.25); if (al <= 0.001 || land <= 0) return;
  const x = o.x ?? 64, y = o.y ?? 258, h = 72, size = 36, w = 74 + stcWordW(label, size, { ls: 3 }) + 30;
  ctx.save(); ctx.globalAlpha = al;
  stcFelt(rrectPts(x, y, w, h, 14), o.bg ?? STC.tealD, { stitch: 'running', thread: STC.cream, sw: 3, drop: land, sewn: stcStep(E0 + (o.at ?? 0.15) + 0.25, 24, 48), n: 24, key: 'tag' });
  if (land >= 1) { stcButton(x + 40, y + h / 2, 17, STC.mustard, { holes: 2, thread: STC.brick, rot: 0.5 + Math.sin(TT * 1.3) * 0.12 }); stcWord(label, x + 74, y + h / 2 + size * 0.36, size, STC.cream, { ls: 3, frac: ev(E0 + (o.at ?? 0.15) + 0.25, 0.4) }); }
  ctx.restore();
}
const stcCaption = (str, o = {}) => { const f = () => stcCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const stcTag = (label, o = {}) => { const f = () => stcTagNow(label, o); if (DEFER) DEFER.push(f); else f(); };

// the cloth breathes: a soft fold of light and shade drifts a little (on 2s), under a vignette
function stcPost() {
  ctx.save(); screen(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const ph = Math.sin(TT * 1.3), g = ctx.createLinearGradient(0, 0, W, H * 0.62);
  g.addColorStop(0, `rgba(255,246,224,${(0.06 + 0.025 * ph).toFixed(3)})`); g.addColorStop(0.36 + 0.03 * ph, 'rgba(255,246,224,0)'); g.addColorStop(0.5 + 0.03 * ph, 'rgba(24,14,8,0)');
  g.addColorStop(0.72 + 0.02 * ph, `rgba(24,14,8,${(0.06 - 0.02 * ph).toFixed(3)})`); g.addColorStop(1, 'rgba(24,14,8,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.76); v.addColorStop(0, 'rgba(24,14,8,0)'); v.addColorStop(1, 'rgba(24,14,8,0.34)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'stitch',
  paper: STC.paper,                                                     // the sage cloth a morph happens on
  backdrop(c) { stcCloth(c); },                                         // any colour of the same woven cloth (hex or rgb())
  // a hole cut in the top cloth, the era showing through it: the cut edge shades the layer below, and the hem is
  // sewn with a fixed number of blanket stitches whose teeth point out onto the top cloth
  window(P, key, src) {
    ctx.save(); stcPath(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); stcPath(P, true); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(24,14,8,0.2)'; ctx.lineWidth = 34; ctx.stroke(); ctx.strokeStyle = 'rgba(24,14,8,0.3)'; ctx.lineWidth = 12; ctx.stroke(); ctx.restore();
    const L = pathLen(P.concat([P[0]])), n = 56, pitch = L / n; if (pitch > 420) return;   // the hem has left the frame
    ctx.save(); stcPath(P, true); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,246,224,0.4)'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
    stcStitch(P, { type: 'blanket', closed: true, out: true, n, c: STC.cream, w: clamp(pitch * 0.14, 3.5, 7), prong: clamp(pitch * 0.5, 9, 30), key: 'hem' });
  },
  // the morphing shape: a felt patch whose blanket stitching (a fixed count) follows the changing edge
  blob(P, c, key) { stcFelt(P, c, { n: 40, sw: 6, prong: 20, key: 'blob', lift: 1.3 }); },
  hero(x, y, r, o = {}) { stcBear(x, y, r, { key: o.key }); },
  heroColor: STC.bear,
  heroPts(x, y, r) { return stcBearPts(x, y, r); },
  post() { stcPost(); },
  ones: false,
};
