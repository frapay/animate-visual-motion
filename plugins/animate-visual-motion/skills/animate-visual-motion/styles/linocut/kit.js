// =====================================================================
//  styles/linocut/kit.js — a linocut / woodcut relief print, on top of kit/core.js.
//
//  The picture is carved OUT OF a solid inked block: the ground is dense black ink, and every form is made of paper
//  showing through where the knife removed material. Three things exist: ink, paper, and one flat second colour
//  printed from its own block a few pixels off register. No greys, no gradients, no glows.
//
//  How it is drawn: a scene runs inside linBlock(() => { ... }). Inside it `ctx` is the BLACK BLOCK (an offscreen
//  layer, inked all over); every cut punches a hole in it (destination-out), so whatever lies under shows through:
//  the paper, or the second colour that linColor() printed on the paper. The block is then laid over the sheet,
//  shifted a hair on every boil step. STYLE.post salts the ink (lighten) and adds paper fibre (darken).
//
//  Marks: tapered V-gouge cuts (linLens: thick in the middle, pointed at both ends), rows of them that follow any
//  outline (linCarve), areas cleared with wide overlapping gouges that leave stray uncut ridges (linClear).
//  Time: on 2s. Things appear by being carved (`frac`), then the block is pressed (linBlock({ press })) and the
//  second colour drops in (linDrop).
// =====================================================================
const LIN = {
  ink: '#221e1a',       // the black block's ink (a warm black)
  inkD: '#070606',      // the denser rim where ink squashes out at an edge
  paper: '#ece3cf',     // warm off-white sheet
  fibre: '#d6cab0',     // paper fibres (only ever darkens the paper)
  red: '#b8432b',       // brick red
  ochre: '#c98f2c',     // ochre
  color: '#b8432b',     // THE second colour of this piece: set LIN.color = LIN.ochre in a piece's head to switch
  reg: [5, -4],         // misregistration of the colour block against the black, in px
  gap: 15,              // default distance between gouge rows
};
const LIN_FONT = '"Arial Black", "Arial Bold", Impact, Haettenschweiler, "Franklin Gothic Heavy", "DejaVu Sans", "Liberation Sans", "Helvetica Neue", Arial, sans-serif';
const LIN_B = { x0: 34, y0: 34, x1: W - 34, y1: H - 34 };   // the block on the sheet (a paper margin shows around it)
let LIN_ON = null;      // inside linBlock: { base } (the sheet's context)
let LIN_PRESS = 0;      // this frame's press pulse (set by linBlock, read and cleared by STYLE.post)
const LIN_CV = {}, LIN_ROWS = new Map(), LIN_MEMO = new Map();
function linCanvas(key, w = W, h = H) { let c = LIN_CV[key]; if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; LIN_CV[key] = c; } return c; }
function linMemo(key, make) { if (!LIN_MEMO.has(key)) { if (LIN_MEMO.size > 600) LIN_MEMO.clear(); LIN_MEMO.set(key, make()); } return LIN_MEMO.get(key); }

// ---------------------------------------------------------------------
//  timing (all on the motion step TT)
//    linIn(t0, d)   0..1 progress of a cut that starts at t0 and takes d seconds: pass it as `frac`
//    linPulse(t)    the press: 1 on its first step, 0.4 on the second, else 0
//    linDrop(t)     the second colour: 0 before t, 0.5 on the first step (it lands further off register), then 1
//    linStep(every, phase)  a whole-number counter that ticks every `every` seconds (two-state idle life: % 2)
// ---------------------------------------------------------------------
const linIn = (t0, d = 0.5) => clamp((TT - t0) / d);
const linPulse = (t) => (TT < t - 1e-6 ? 0 : TT < t + 1 / 12 - 1e-6 ? 1 : TT < t + 2 / 12 - 1e-6 ? 0.4 : 0);
const linDrop = (t) => (TT < t - 1e-6 ? 0 : TT < t + 1 / 12 - 1e-6 ? 0.5 : 1);
const linStep = (every = 0.5, phase = 0) => Math.floor(TT / every + phase + 1e-6);

// ---------------------------------------------------------------------
//  geometry helpers
// ---------------------------------------------------------------------
function linPoly(P, add) { if (!add) ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
function linCen(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } x /= P.length; y /= P.length; let r = 0; for (const p of P) r += Math.hypot(p[0] - x, p[1] - y); return [x, y, r / P.length]; }
const linGrow = (P, px) => { const [x, y, r] = linCen(P), k = (r + px) / (r || 1); return P.map((p) => [x + (p[0] - x) * k, y + (p[1] - y) * k]); };
const linDiscPts = (x, y, r, n = 72) => ellipsePts(x, y, r, r, 0, n);
const linRectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// a hand-cut edge: the outline resampled and nudged, fixed by its key (it does not boil)
function linRough(P, amt = 2, key = 'r', step = 40) { const Q = resample(P, true, step), R = RNG('linrough', key); return Q.map(([x, y]) => [x + R.n(amt), y + R.n(amt)]); }
// corner-cutting (Chaikin): turns a hand-typed polygon into a rounded outline
function linRound(P, it = 2) {
  for (let k = 0; k < it; k++) { const Q = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } P = Q; }
  return P;
}
function linSig(P) { let h = 2166136261 >>> 0; for (const p of P) { h ^= Math.round(p[0] * 4) + 7919 * Math.round(p[1] * 4); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + P.length; }

// ---------------------------------------------------------------------
//  the block and the two ways to mark it
//    linBlock(fn, { press, bare, still })   run a scene on the black block and print it on the sheet.
//        press: the time the block is pressed (it drops 8px for a step and the ink goes salty); bare: start with
//        no ink at all (the morph's island); still: no idle shift.
//    linCut({ rim })   cut the current path out of the block (outside linBlock: fill it with paper)
//    linInk()          put ink back on the current path (an uncut ridge, an island to carve into)
//    linColor(P, { in, c, grow })   print outline P in the second colour UNDER the black, off register
// ---------------------------------------------------------------------
function linBlock(fn, o = {}) {
  const base = ctx, cv = linCanvas('block'), k = cv.getContext('2d'), m = base.getTransform();
  k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1; k.clearRect(0, 0, W, H);
  k.save(); k.setTransform(m);
  LIN_ON = { base }; ctx = k;
  try {
    if (!o.bare) linInkBlock(); fn();
    if (!o.bare) { k.setTransform(m); k.globalCompositeOperation = 'destination-in'; linPoly(linBlockEdge()); k.fillStyle = '#000'; k.fill(); }   // nothing prints beyond the block's edge
  } finally { ctx = base; LIN_ON = null; k.restore(); k.globalCompositeOperation = 'source-over'; }
  const p = o.press != null ? linPulse(o.press) : 0, S = RNG('linshift', B);
  const dx = o.still ? 0 : Math.round(S.n(1.45)), dy = (o.still ? 0 : Math.round(S.n(1.45))) + Math.round(8 * p);
  if (p > LIN_PRESS) LIN_PRESS = p;
  base.save(); base.setTransform(1, 0, 0, 1, 0, 0); base.drawImage(cv, dx, dy); base.restore();
}
const linBlockEdge = () => linMemo('blockedge', () => linRough(linRectPts(LIN_B.x0, LIN_B.y0, LIN_B.x1 - LIN_B.x0, LIN_B.y1 - LIN_B.y0), 2.4, 'block', 52));
function linInkBlock() {
  const P = linBlockEdge();
  ctx.save(); linPoly(P); ctx.fillStyle = LIN.ink; ctx.fill();
  ctx.clip(); linPoly(P); ctx.strokeStyle = LIN.inkD; ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.stroke();   // ink builds up along the block's edge
  ctx.restore();
}
function linCut(o = {}) {
  const rim = o.rim ?? 5;
  if (rim) { ctx.strokeStyle = LIN.inkD; const m = ctx.getTransform(); ctx.lineWidth = rim / (Math.hypot(m.a, m.b) || 1); ctx.lineJoin = 'round'; ctx.stroke(); }
  if (LIN_ON) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.fill(o.rule || 'nonzero'); ctx.globalCompositeOperation = 'source-over'; }
  else { ctx.fillStyle = LIN.paper; ctx.fill(o.rule || 'nonzero'); }
}
function linInk(c) { ctx.fillStyle = c || LIN.ink; ctx.fill(); }
function linColor(P, o = {}) {
  const k = o.in ?? 1; if (k <= 0) return;
  const g = LIN_ON ? LIN_ON.base : ctx, m = ctx.getTransform(), z = Math.hypot(m.a, m.b) || 1, off = (k < 1 ? 2.6 : 1) / z;
  const Q = o.grow ? linGrow(P, o.grow) : P;
  g.save(); g.setTransform(m); g.translate(LIN.reg[0] * off, LIN.reg[1] * off);
  g.beginPath(); g.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) g.lineTo(Q[i][0], Q[i][1]); g.closePath();
  g.fillStyle = o.c ?? LIN.color; g.fill(); g.restore();
}

// ---------------------------------------------------------------------
//  the gouge: one V-tool cut, a lens thick in the middle and pointed at both ends.
//  linLens adds it to the current path (q < 1 = the knife is part-way along it). Call ctx.beginPath() first and
//  linCut() / linInk() after. linGouge / linRidge do all three for a single mark.
// ---------------------------------------------------------------------
function linLens(x1, y1, x2, y2, w, bend = 0, q = 1) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const n = clamp(Math.ceil(l / 14), 6, 18), m = q >= 1 ? n : Math.max(1, Math.ceil(q * n));
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= m; i++) { const t = i / n, s = Math.sin(Math.PI * t), h = w / 2 * Math.pow(s, 0.75) + bend * s * s; ctx.lineTo(x1 + dx * t + nx * h, y1 + dy * t + ny * h); }
  for (let i = m; i >= 1; i--) { const t = i / n, s = Math.sin(Math.PI * t), h = -w / 2 * Math.pow(s, 0.75) + bend * s * s; ctx.lineTo(x1 + dx * t + nx * h, y1 + dy * t + ny * h); }
  ctx.closePath();
  const tq = m / n, sq = Math.sin(Math.PI * tq); return [x1 + dx * tq + nx * bend * sq * sq, y1 + dy * tq + ny * bend * sq * sq];
}
function linGouge(x1, y1, x2, y2, w, o = {}) { const q = clamp(o.frac ?? 1); if (q <= 0) return; ctx.beginPath(); linLens(x1, y1, x2, y2, w, o.bend ?? 0, q); linCut(o); }
function linRidge(x1, y1, x2, y2, w, o = {}) { ctx.beginPath(); linLens(x1, y1, x2, y2, w, o.bend ?? 0, 1); linInk(o.c); }
// little chips of lino flying off the knife's tip
function linChips(tip, key = 'chip') {
  if (!tip) return;
  const R = RNG('linchip', key, B); ctx.fillStyle = LIN.paper; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const x = tip[0] + R.n(22), y = tip[1] + R.n(22) - 6, a = R.r(0, TAU), s = R.r(3, 7); ctx.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.lineTo(x + Math.cos(a + 2.2) * s, y + Math.sin(a + 2.2) * s); ctx.lineTo(x + Math.cos(a + 4.1) * s * 0.7, y + Math.sin(a + 4.1) * s * 0.7); ctx.closePath(); }
  ctx.fill();
}

// ---------------------------------------------------------------------
//  linCarve(P, o) — THE generic helper: carve ANY closed outline into rows of gouges that follow its contour.
//  The outline's inside distance is measured on a small grid; every row is an iso-line of that distance, cut into
//  gouges with short uncut gaps between them. Rows run from the edge inward, each one walked along the contour,
//  so `frac` looks like a knife travelling.
//    o: key (seeds the cuts), gap (row distance, LIN.gap), w (gouge width as a share of gap, 0.66),
//       rows (how many rows; default all the way in), core (true = clear what is left inside the last row, with
//       a few stray ridges), chatter (how many ridges in the core), len [min, max], skip [min, max] (uncut gaps),
//       shade(x, y) -> width factor (thin gouges read darker: model a form with it),
//       frac (0..1 carved so far), chips (false = no flying chips), ink (px: first put an ink island this much
//       bigger than P under it, so it can sit on carved ground or a cleared sky), hold (ink even at frac 0),
//       box [x0, y0, x1, y1] (drop gouges whose middle is outside), cache (false for outlines that change every
//       frame), rim.
//  The rows are cached by key + outline, so MOVE a carved thing with ctx.translate / scale / rotate around a
//  fixed local outline; do not feed it new coordinates every frame. Returns the knife's tip while carving.
// ---------------------------------------------------------------------
function linField(P, s, bb) {
  const pad = 3, x0 = bb.x0 - pad * s, y0 = bb.y0 - pad * s, nx = Math.ceil((bb.x1 - bb.x0) / s) + 2 * pad + 1, ny = Math.ceil((bb.y1 - bb.y0) / s) + 2 * pad + 1;
  const E = P.length, ax = new Float64Array(E), ay = new Float64Array(E), ex = new Float64Array(E), ey = new Float64Array(E), il = new Float64Array(E);
  for (let e = 0; e < E; e++) { const a = P[e], b = P[(e + 1) % E]; ax[e] = a[0]; ay[e] = a[1]; ex[e] = b[0] - a[0]; ey[e] = b[1] - a[1]; il[e] = 1 / (ex[e] * ex[e] + ey[e] * ey[e] || 1e-9); }
  const f = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const py = y0 + j * s;
    for (let i = 0; i < nx; i++) {
      const px = x0 + i * s; let d2 = 1e18, inside = false;
      for (let e = 0; e < E; e++) {
        const qx = px - ax[e], qy = py - ay[e]; let t = (qx * ex[e] + qy * ey[e]) * il[e]; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = qx - ex[e] * t, dy = qy - ey[e] * t, d = dx * dx + dy * dy; if (d < d2) d2 = d;
        if ((ay[e] > py) !== (ay[e] + ey[e] > py) && px < ax[e] + ex[e] * (py - ay[e]) / ey[e]) inside = !inside;
      }
      f[j * nx + i] = inside ? Math.sqrt(d2) : -Math.sqrt(d2);
    }
  }
  return { f, nx, ny, x0, y0, s };
}
const LIN_MS = { 1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[3, 0], [2, 1]], 6: [[0, 2]], 7: [[3, 0]], 8: [[3, 0]], 9: [[0, 2]], 10: [[3, 2], [0, 1]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]] };
function linContours(F, L) {   // the closed iso-lines of the field at level L (marching squares, chained into loops)
  const { f, nx, ny, x0, y0, s } = F, pts = new Map(), nb = new Map();
  const link = (a, b) => { let x = nb.get(a); if (!x) nb.set(a, x = []); x.push(b); x = nb.get(b); if (!x) nb.set(b, x = []); x.push(a); };
  const put = (id, i0, j0, i1, j1) => { if (pts.has(id)) return; const a = f[j0 * nx + i0] - L, b = f[j1 * nx + i1] - L, t = a / (a - b); pts.set(id, [x0 + (i0 + (i1 - i0) * t) * s, y0 + (j0 + (j1 - j0) * t) * s]); };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const code = (f[j * nx + i] > L ? 8 : 0) | (f[j * nx + i + 1] > L ? 4 : 0) | (f[(j + 1) * nx + i + 1] > L ? 2 : 0) | (f[(j + 1) * nx + i] > L ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const id = [2 * (j * nx + i), 2 * (j * nx + i + 1) + 1, 2 * ((j + 1) * nx + i), 2 * (j * nx + i) + 1];   // top, right, bottom, left
    for (const [a, b] of LIN_MS[code]) {
      for (const e of [a, b]) { if (e === 0) put(id[0], i, j, i + 1, j); else if (e === 1) put(id[1], i + 1, j, i + 1, j + 1); else if (e === 2) put(id[2], i, j + 1, i + 1, j + 1); else put(id[3], i, j, i, j + 1); }
      link(id[a], id[b]);
    }
  }
  const seen = new Set(), loops = [];
  for (const start of nb.keys()) {
    if (seen.has(start)) continue;
    const lp = []; let cur = start;
    while (cur != null && !seen.has(cur)) { seen.add(cur); lp.push(pts.get(cur)); const ns = nb.get(cur); cur = !seen.has(ns[0]) ? ns[0] : ns.length > 1 && !seen.has(ns[1]) ? ns[1] : null; }
    if (lp.length < 4) continue;
    let Q = lp;
    for (let k = 0; k < 2; k++) { const n = Q.length; Q = Q.map((p, i) => { const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; }); }
    loops.push(Q);
  }
  return loops;
}
function linGougeLoop(lp, R, gap, wk, len, skip, shade, box, out) {
  const n = lp.length, cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + dist(lp[i], lp[(i + 1) % n]);
  const tot = cum[n]; if (tot < gap * 0.9) return;
  const at = (d) => { d = ((d % tot) + tot) % tot; let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; } const a = lp[lo], b = lp[(lo + 1) % n], t = (d - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const start = R.r(0, tot); let pos = 0;
  while (pos < tot - gap * 0.5) {
    let l = R.r(len[0], len[1]); const sk = R.r(skip[0], skip[1]), a = R.r(0.8, 1.3), wr = R.r(0.84, 1.12);
    if (tot - pos - l - sk < len[0] * 0.6) l = tot - pos - sk;      // the last cut of a row runs up to the first
    if (l < gap * 0.5) break;
    const mid = at(start + pos + l / 2);
    if (!box || (mid[0] >= box[0] && mid[0] <= box[2] && mid[1] >= box[1] && mid[1] <= box[3])) {
      const m = clamp(Math.ceil(l / 5), 4, 48), wg = Math.min(gap * wk * wr * (shade ? shade(mid[0], mid[1]) : 1), l * 0.7), Lp = [], Rp = [];
      for (let q = 0; q <= m; q++) {
        const t = q / m, d = start + pos + t * l, p = at(d), p0 = at(d - 1.5), p1 = at(d + 1.5);
        let ux = p0[1] - p1[1], uy = p1[0] - p0[0]; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
        const h = wg / 2 * Math.pow(Math.sin(Math.PI * Math.pow(t, a)), 0.7);
        Lp.push([p[0] + ux * h, p[1] + uy * h]); Rp.push([p[0] - ux * h, p[1] - uy * h]);
      }
      out.push({ L: Lp, R: Rp });
    }
    pos += l + sk;
  }
}
function linRows(P, o = {}) {
  const gap = o.gap ?? LIN.gap, key = o.key ?? 'carve', rowsMax = o.rows ?? 999, wk = o.w ?? 0.66;
  const ck = o.cache === false ? null : [key, gap.toFixed(2), rowsMax, wk, o.core ? 1 : 0, linSig(P)].join('|');
  if (ck && LIN_ROWS.has(ck)) return LIN_ROWS.get(ck);
  const bb = bbox(P), s = clamp(Math.sqrt((bb.x1 - bb.x0) * (bb.y1 - bb.y0) / 22000), 2.5, Math.max(2.5, gap / 3));
  const F = linField(P, s, bb), out = { g: [], core: [], ridges: [] };
  let maxF = 0; for (let i = 0; i < F.f.length; i++) if (F.f[i] > maxF) maxF = F.f[i];
  const len = o.len ?? [gap * 1.8, gap * 4.8], skip = o.skip ?? [gap * 0.2, gap * 0.5];
  let k = 0;
  for (; k < rowsMax && gap * (k + 0.5) < maxF - gap * 0.1; k++) linContours(F, gap * (k + 0.5)).forEach((lp, li) => linGougeLoop(lp, RNG('lingo', key, k, li), gap, wk, len, skip, o.shade, o.box, out.g));
  if (o.core && gap * k < maxF - 2) {
    const Lc = Math.max(0.5, gap * (k - 0.16)); out.core = linContours(F, Lc);
    let cells = 0; for (let i = 0; i < F.f.length; i++) if (F.f[i] > Lc + gap * 0.7) cells++;
    const want = o.chatter ?? Math.round(cells * s * s / 6500), R = RNG('linchat', key);
    for (let tries = 0; out.ridges.length < want && tries < want * 40; tries++) {
      const i = R.i(1, F.nx - 2), j = R.i(1, F.ny - 2), v = F.f[j * F.nx + i]; if (v < Lc + gap * 0.7) continue;
      let tx = -(F.f[(j + 1) * F.nx + i] - F.f[(j - 1) * F.nx + i]), ty = F.f[j * F.nx + i + 1] - F.f[j * F.nx + i - 1]; const tl = Math.hypot(tx, ty);
      if (tl < 1e-3) { const a = R.r(0, TAU); tx = Math.cos(a); ty = Math.sin(a); } else { tx /= tl; ty /= tl; }
      const x = F.x0 + i * s, y = F.y0 + j * s, l = Math.min(R.r(12, 34), (v - Lc) * 1.6), w = R.r(3, 6.5);
      out.ridges.push([x - tx * l / 2, y - ty * l / 2, x + tx * l / 2, y + ty * l / 2, w, R.n(3)]);
    }
  }
  if (ck) { if (LIN_ROWS.size > 300) LIN_ROWS.clear(); LIN_ROWS.set(ck, out); }
  return out;
}
function linGougePath(g, q = 1) {
  const n = g.L.length, m = q >= 1 ? n : Math.max(2, Math.ceil(q * (n - 1)) + 1);
  ctx.moveTo(g.L[0][0], g.L[0][1]); for (let i = 1; i < m; i++) ctx.lineTo(g.L[i][0], g.L[i][1]); for (let i = m - 1; i >= 0; i--) ctx.lineTo(g.R[i][0], g.R[i][1]); ctx.closePath();
  return [(g.L[m - 1][0] + g.R[m - 1][0]) / 2, (g.L[m - 1][1] + g.R[m - 1][1]) / 2];
}
function linCarve(P, o = {}) {
  const frac = clamp(o.frac ?? 1);
  if (o.ink != null && (frac > 0 || o.hold)) { linPoly(P); ctx.fillStyle = LIN.ink; ctx.fill(); if (o.ink > 0) { ctx.strokeStyle = LIN.ink; ctx.lineWidth = o.ink * 2; ctx.lineJoin = 'round'; ctx.stroke(); } }
  if (frac <= 0) return null;
  const R = linRows(P, o), N = R.g.length, extra = R.core.length ? Math.max(1, Math.round(N * 0.12)) : 0, k = frac * (N + extra), full = Math.min(N, Math.floor(k));
  let tip = null;
  ctx.beginPath();
  for (let i = 0; i < full; i++) linGougePath(R.g[i]);
  if (full < N) tip = linGougePath(R.g[full], Math.max(0.15, k - full)); else if (full > 0 && frac < 1) tip = R.g[N - 1].L[R.g[N - 1].L.length - 1];
  linCut(o);
  if (R.core.length && k >= N + extra * 0.5) {
    ctx.beginPath(); for (const lp of R.core) linPoly(lp, true); linCut(o);
    if (R.ridges.length) { ctx.beginPath(); for (const r of R.ridges) linLens(r[0], r[1], r[2], r[3], r[4], r[5]); linInk(); }
  }
  if (tip && frac < 1 && o.chips !== false) linChips(tip, o.key);
  return frac < 1 ? tip : null;
}

// ---------------------------------------------------------------------
//  linClear(P, o) — clear an area the way a carver does: rows of wide overlapping gouges, clipped to the outline.
//  Where neighbouring cuts do not quite meet, thin slivers of the block stay standing and print: the chatter.
//    o: key, gap (row distance, 36), a (the direction the knife travels, radians, 0), w (width factor: > 1 leaves
//       less chatter, < 1 more), len [min, max], hole (an outline, or a list of outlines, left uncut inside P),
//       frac, chips, rim
// ---------------------------------------------------------------------
function linClear(P, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return null;
  const gap = o.gap ?? 36, a = o.a ?? 0, key = o.key ?? 'clear', wk = o.w ?? 1, len = o.len ?? [150, 330];
  const G = linMemo(['clr', key, gap, a, wk, len[0], len[1], linSig(P)].join('|'), () => {
    const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + gap, ca = Math.cos(a), sa = Math.sin(a), out = [], R = RNG('linclr', key);
    for (let v = -rad; v <= rad; v += gap) {
      let u = -rad - R.r(0, len[1] * 0.6);
      while (u < rad) {
        const l = R.r(len[0], len[1]), w = gap * R.r(1.3, 1.8) * wk, vv = v + R.n(gap * 0.16), tilt = R.n(gap * 0.2), bend = R.n(gap * 0.22);
        const x1 = cx + ca * u - sa * (vv - tilt), y1 = cy + sa * u + ca * (vv - tilt), x2 = cx + ca * (u + l) - sa * (vv + tilt), y2 = cy + sa * (u + l) + ca * (vv + tilt), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        if (mx > bb.x0 - l / 2 && mx < bb.x1 + l / 2 && my > bb.y0 - gap && my < bb.y1 + gap) out.push([x1, y1, x2, y2, w, bend]);
        u += l * R.r(0.58, 0.76);
      }
    }
    return out;
  });
  const k = frac * G.length, full = Math.floor(k); let tip = null;
  ctx.save();
  linPoly(P);
  if (o.hole) { for (const hp of (Array.isArray(o.hole[0][0]) ? o.hole : [o.hole])) linPoly(hp, true); ctx.clip('evenodd'); } else ctx.clip();
  ctx.beginPath();
  for (let i = 0; i < full; i++) { const g = G[i]; linLens(g[0], g[1], g[2], g[3], g[4], g[5]); }
  if (full < G.length) { const g = G[full]; tip = linLens(g[0], g[1], g[2], g[3], g[4], g[5], Math.max(0.15, k - full)); }
  linCut(o);
  if (tip && o.chips !== false) linChips(tip, key);
  ctx.restore();
  return tip;
}

// ---------------------------------------------------------------------
//  ready-made cuts (all take `frac` and a key)
// ---------------------------------------------------------------------
// a carved disc: two rows of gouges round the rim, the middle cleared. The moon; with linColor under it, the sun.
function linDisc(x, y, r, o = {}) { return linCarve(linDiscPts(x, y, r), { key: 'disc', rows: 2, core: true, gap: 16, ...o }); }
// gouges radiating from a centre, alternately long and short. o: n, rot, frac, w, key, short (0.6)
function linRays(x, y, r0, r1, o = {}) {
  const n = o.n ?? 18, frac = clamp(o.frac ?? 1), k = frac * n, R = RNG('linray', o.key ?? 'rays'); if (k <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (o.rot ?? 0) + i / n * TAU + R.n(0.03), rr = i % 2 ? lerp(r0, r1, o.short ?? 0.6) : r1 * R.r(0.96, 1.03), w = (o.w ?? 15) * R.r(0.85, 1.15) * (i % 2 ? 0.8 : 1), bend = R.n(2.5);
    if (i >= k) continue;
    linLens(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * rr, y + Math.sin(a) * rr, w, bend, Math.min(1, k - i));
  }
  linCut(o);
}
// a ring of short gouges cut along a circle (a carved glow). o: n, w, len (share of each slot that is cut), frac, key
function linArcRow(x, y, r, o = {}) {
  const n = o.n ?? 16, frac = clamp(o.frac ?? 1), k = frac * n, R = RNG('linarc', o.key ?? 'arc', r); if (k <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = (o.rot ?? 0) + (i + R.n(0.12)) / n * TAU, da = TAU / n * (o.len ?? 0.7) * R.r(0.75, 1.15), w = (o.w ?? 9) * R.r(0.8, 1.2);
    if (i >= k) continue;
    const x1 = x + Math.cos(a0) * r, y1 = y + Math.sin(a0) * r, x2 = x + Math.cos(a0 + da) * r, y2 = y + Math.sin(a0 + da) * r;
    linLens(x1, y1, x2, y2, w, -(r - r * Math.cos(da / 2)) * 1.0, Math.min(1, k - i));
  }
  linCut(o);
}
// a star: two crossed nicks (alt: one small diamond, for a twinkle)
function linStar(x, y, s, o = {}) {
  if ((o.frac ?? 1) <= 0) return;
  const R = RNG('linstar', o.key ?? x + ':' + y), a = R.n(0.25);
  ctx.beginPath();
  if (o.alt) linLens(x - s * 0.5, y, x + s * 0.5, y, s * 0.55);
  else { linLens(x - Math.cos(a) * s, y - Math.sin(a) * s, x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.42); linLens(x + Math.sin(a) * s * 0.8, y - Math.cos(a) * s * 0.8, x - Math.sin(a) * s * 0.8, y + Math.cos(a) * s * 0.8, s * 0.36); }
  linCut({ rim: 0 });
}
// a tuft row of grass: tapered blades rising from y. o: n, h [min, max], w, sway (px the tips lean), frac, key
function linGrass(x0, x1, y, o = {}) {
  const n = o.n ?? Math.round((x1 - x0) / 22), frac = clamp(o.frac ?? 1), k = frac * n, R = RNG('lingrass', o.key ?? y), h = o.h ?? [50, 110]; if (k <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, (i + R.r(0.1, 0.9)) / n), hh = R.r(h[0], h[1]), lean = R.n(hh * 0.22), w = (o.w ?? 9) * R.r(0.75, 1.3), by = y + R.n(8), ph = R.f() < 0.5 ? 1 : -1;
    if (i >= k) continue;
    const sw = (o.sway ?? 0) * ph * hh / 80;
    linLens(x, by, x + lean + sw, by - hh, w, lean * 0.35 + sw * 0.5, Math.min(1, k - i));
  }
  linCut(o);
}
// a streak of cloud / mist: a few long horizontal gouges (ink: true = uncut ridges on a cleared sky instead)
function linCloud(x, y, w, o = {}) {
  const n = o.n ?? 4, R = RNG('lincloud', o.key ?? 'cloud'), frac = clamp(o.frac ?? 1), k = frac * n; if (k <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = w * R.r(0.5, 1), xx = x + R.r(0, w - l), yy = y + i * (o.gap ?? 20) + R.n(3), ww = (o.w ?? 11) * R.r(0.8, 1.2), b = R.n(4);
    if (i >= k) continue;
    linLens(xx, yy, xx + l, yy + R.n(4), ww, b, Math.min(1, k - i));
  }
  if (o.ink) linInk(); else linCut(o);
}
// a bird: two little gouges in a V. flap: 0 | 1. ink: true = an uncut bird on a cleared sky
function linBird(x, y, s, o = {}) {
  const up = o.flap ? -0.55 : 0.15;
  ctx.beginPath();
  linLens(x, y, x - s, y + s * up, s * 0.3, -s * 0.12); linLens(x, y, x + s, y + s * up, s * 0.3, s * 0.12);
  if (o.ink) linInk(); else linCut({ rim: 0 });
}
// a flower: a stem gouge and a cut head that prints in the second colour. o: frac (the cut), in (linDrop: the colour), lean, h, key
function linPoppy(x, y, s, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const h = o.h ?? s * 3.6, lean = o.lean ?? 0, hx = x + lean, hy = y - h;
  linGouge(x, y, hx, hy + s * 0.6, s * 0.42, { frac: Math.min(1, frac * 2), bend: lean * 0.3, rim: 0 });
  if (frac < 0.5) return;
  const head = linMemo('poppy' + (o.key ?? '') + s, () => linRough(ellipsePts(0, 0, s, s * 0.9, 0, 12), s * 0.09, 'poppy' + (o.key ?? ''), s * 0.6));
  ctx.save(); ctx.translate(hx, hy);
  linColor(head, { in: o.in ?? 1, grow: 1 });
  linPoly(head); linCut(o);
  ctx.beginPath(); linLens(-s * 0.3, s * 0.1, s * 0.3, -s * 0.05, s * 0.3); linInk();   // the dark heart: a little uncut ridge
  ctx.restore();
}
// a tree: an uncut trunk and a crown carved in rows. o: frac, rx, ry, key, hold
function linTree(x, base, h, o = {}) {
  const rx = o.rx ?? h * 0.3, ry = o.ry ?? h * 0.36, key = 'tree' + (o.key ?? x);
  const crown = linMemo(key + rx + ':' + ry, () => linRough(ellipsePts(0, 0, rx, ry, 0, 26), rx * 0.07, key, rx * 0.5));
  linRidge(x, base + 6, x, base - h + ry * 1.2, h * 0.11, { bend: 2 });
  ctx.save(); ctx.translate(x, base - h + ry);
  linCarve(crown, { key, gap: o.gap ?? 13, ink: 7, hold: true, frac: o.frac ?? 1, chips: o.chips });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: a hare, carved in rows that follow its outline; faceless but for one uncut dot of an eye.
//  linHare(x, y, r, { frac, ear: 0 | 1 (the back ear flicks down), flip, ink (px of island round it), hold, key })
//  r = half its size (it reaches about 1.2 r up and 0.97 r down from the centre). Sets SPARK_AT.
// ---------------------------------------------------------------------
const LIN_HARE_PTS = [
  [-0.74, 0.97], [-0.9, 0.8], [-0.99, 0.6], [-0.93, 0.42], [-0.86, 0.24], [-0.72, 0.02], [-0.5, -0.16], [-0.24, -0.25], [0.0, -0.27], [0.13, -0.34], [0.19, -0.48],
  'ear',
  [0.33, -0.63], [0.31, -0.9], [0.36, -1.14], [0.46, -1.22], [0.55, -1.1], [0.55, -0.84], [0.52, -0.6],
  [0.62, -0.53], [0.8, -0.43], [0.94, -0.3], [0.93, -0.18], [0.8, -0.08], [0.62, -0.03], [0.52, 0.12], [0.54, 0.42], [0.6, 0.72], [0.72, 0.9], [0.74, 0.97],
  [0.4, 0.97], [0.36, 0.78], [0.24, 0.84], [0.3, 0.97],
];
const LIN_HARE_EAR = [[[0.13, -0.56], [0.0, -0.86], [-0.03, -1.1], [0.05, -1.22], [0.16, -1.1], [0.24, -0.82], [0.29, -0.62]], [[0.08, -0.52], [-0.2, -0.66], [-0.46, -0.72], [-0.56, -0.64], [-0.44, -0.52], [-0.1, -0.44], [0.24, -0.58]]];
function linHareUnit(ear = 0) { return linMemo('hareu' + ear, () => linRound(LIN_HARE_PTS.flatMap((p) => (p === 'ear' ? LIN_HARE_EAR[ear ? 1 : 0] : [p])), 2)); }
function linHarePts(x, y, r, ear = 0, flip = false) { return linHareUnit(ear).map(([u, v]) => [x + (flip ? -u : u) * r, y + v * r]); }
function linHare(x, y, r, o = {}) {
  const ear = o.ear ? 1 : 0, U = linMemo('hare' + ear + ':' + Math.round(r * 4), () => linHareUnit(ear).map(([u, v]) => [u * r, v * r])), frac = clamp(o.frac ?? 1);
  ctx.save(); ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1);
  linCarve(U, { key: (o.key ?? 'hare') + ear, gap: r * 0.088, w: 0.7, ink: o.ink ?? r * 0.07, hold: o.hold, frac, chips: o.chips, shade: (px, py) => 0.72 + 0.4 * clamp(0.5 + (px - py) / (r * 2.6)) });
  if (frac >= 1) { ctx.beginPath(); ctx.ellipse(0.7 * r, -0.33 * r, r * 0.05, r * 0.045, 0, 0, TAU); linInk(); }
  ctx.restore();
  SPARK_AT = toScreen(x, y);
}

// ---------------------------------------------------------------------
//  lettering: chunky hand-cut caps. Every glyph is turned, shifted and stretched a little (fixed by its key), and
//  the knife takes two small bites out of its feet and head.
//    linText(str, x, y, size, { c, bg, align, key, n, track })
//      c: 'cut' (default: cut out of the block, so it prints as paper), or a colour (LIN.ink on a cleared plate)
//      bg: the colour of the bites (default: ink for cut letters, paper for inked ones)
// ---------------------------------------------------------------------
function linFont(size) { ctx.font = `900 ${size}px ${LIN_FONT}`; }
function linGlyphs(str, size, track = 0.05) {
  ctx.save(); linFont(size); const out = []; let x = 0;
  for (const ch of str) { const w = ctx.measureText(ch).width; out.push({ ch, x, w }); x += w + size * track; }
  ctx.restore(); return { g: out, w: x - size * track };
}
const linTextW = (str, size, track) => linGlyphs(String(str).toUpperCase(), size, track).w;
function linText(str, x, y, size, o = {}) {
  str = String(str).toUpperCase();
  const G = linGlyphs(str, size, o.track), cut = (o.c ?? 'cut') === 'cut', ax = o.align === 'center' ? -G.w / 2 : o.align === 'right' ? -G.w : 0, R = RNG('lintext', o.key ?? str);
  const bg = o.bg ?? (cut ? LIN.ink : LIN.paper), n = o.n ?? G.g.length;
  ctx.save(); linFont(size); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  G.g.forEach((g, i) => {
    const rot = R.n(0.035), dy = R.n(size * 0.022), sx = 1 + R.n(0.045), sy = 1 + R.n(0.05), b1 = R.r(0.12, 0.88), b2 = R.r(0.12, 0.88), bs = R.r(0.07, 0.11) * size;
    if (g.ch === ' ' || i >= n) return;
    ctx.save(); ctx.translate(x + ax + g.x + g.w / 2, y + dy); ctx.rotate(rot); ctx.scale(sx, sy);
    if (cut && LIN_ON) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; } else ctx.fillStyle = cut ? LIN.paper : o.c;
    ctx.fillText(g.ch, -g.w / 2, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = bg; ctx.beginPath();
    const bx = (b1 - 0.5) * g.w, tx = (b2 - 0.5) * g.w, top = -size * 0.725;
    ctx.moveTo(bx - bs, size * 0.02); ctx.lineTo(bx, -bs * 0.75); ctx.lineTo(bx + bs * 0.8, size * 0.02);
    ctx.moveTo(tx - bs * 0.8, top - size * 0.02); ctx.lineTo(tx + bs * 0.1, top + bs * 0.7); ctx.lineTo(tx + bs, top - size * 0.02);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore(); return G.w;
}

// ---------------------------------------------------------------------
//  caption and tag (through DEFER: after the camera, at screen size).
//  The CAPTION is a plate cleared out of a black bar: black caps on paper, stray ridges left along its edges; one
//  *word* stays uncut (paper letters in a black bar) over a strip of the second colour printed off register.
//  The TAG is a small black bar with the word cut out of it. Both are wiped away as a bridge starts.
//    linCaption('CARVE THE *NIGHT*', { x (the centre: CX or 500), y (the baseline, 1420), w (820), size (78), at (0.5) })
//    linTag('NIGHT', { x (60), y (the bar's top, 262), size (40), at (0.25) })
// ---------------------------------------------------------------------
function linBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.2);
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
function linCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = linBridgeK(); if (k <= 0 || TT < at - 1e-6) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), y = o.y ?? 1420, maxW = o.w ?? 820; let size = o.size ?? 78;
  const toks = String(str).toUpperCase().split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { const pad = size * 0.2; let tw = 0; toks.forEach((t, i) => { t.w = linTextW(t.s, size); t.gap = (i ? size * 0.36 : 0) + (t.hi ? pad : 0) + (i && toks[i - 1].hi ? pad : 0); tw += t.w + t.gap; }); return tw + (toks[toks.length - 1].hi ? pad : 0); };
  let tw = lay(); if (tw > maxW) { size *= maxW / tw; tw = lay(); }
  const pad = size * 0.2, m = size * 0.4, x0 = cx - tw / 2 - m, x1 = cx + tw / 2 + m, y0 = y - size * 1.16, y1 = y + size * 0.44, key = 'cap' + str + ':' + cx + ':' + y;
  const bar = linMemo(key + 'bar' + size, () => linRough(linRectPts(x0 - 13, y0 - 13, x1 - x0 + 26, y1 - y0 + 26), 2.2, key + 'b', 44));
  const plate = linMemo(key + 'plate' + size, () => linRough(linRectPts(x0, y0, x1 - x0, y1 - y0), 2.6, key + 'p', 38));
  const chat = linMemo(key + 'chat' + size, () => { const R = RNG('lincapch', key), out = []; for (let i = 0; i < 16; i++) { const top = R.f() < 0.5, l = R.r(18, 60), xx = R.r(x0 + 10, x1 - l - 10), yy = top ? y0 + R.r(5, 12) : y1 - R.r(5, 12); out.push([xx, yy, xx + l, yy + R.n(2), R.r(3, 6), R.n(2)]); } return out; });
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(x0 - 30, y0 - 30, (x1 - x0 + 60) * k, y1 - y0 + 60); ctx.clip(); }   // leaving: wiped off to the left in one piece
  linPoly(bar); linInk();                                                                                    // the uncut bar is stamped down first
  const u = linIn(at, 0.3), xf = lerp(x0 - 60, x1 + 30, u), ym = (y0 + y1) / 2;                              // then the plate is cleared, left to right
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x0 - 30, y0 - 30); ctx.lineTo(xf, y0 - 30); ctx.lineTo(xf + 46, ym); ctx.lineTo(xf, y1 + 30); ctx.lineTo(x0 - 30, y1 + 30); ctx.closePath(); ctx.clip();
  linPoly(plate); ctx.fillStyle = LIN.paper; ctx.fill();
  ctx.beginPath(); for (const r of chat) linLens(r[0], r[1], r[2], r[3], r[4], r[5]); linInk();
  ctx.restore();
  let xx = cx - tw / 2;
  toks.forEach((t, i) => {
    xx += t.gap;
    const t0 = at + 0.25 + i * 0.125; if (TT < t0 - 1e-6) { xx += t.w; return; }
    const dy = TT < t0 + 1 / 12 - 1e-6 ? 5 : 0;                                                              // each word is stamped: it lands a step low
    if (t.hi) {
      const hb = linMemo(key + 'hi' + i + size, () => linRough(linRectPts(xx - pad, y - size * 0.93, t.w + 2 * pad, size * 1.14), 1.8, key + 'h' + i, 36));
      ctx.save(); ctx.translate(0, dy);
      if (TT >= t0 + 1 / 12 - 1e-6) { ctx.save(); ctx.translate(7, 9); linPoly(hb); ctx.fillStyle = LIN.color; ctx.fill(); ctx.restore(); }   // the colour block, off register
      linPoly(hb); linInk();
      linText(t.s, xx, y, size, { c: LIN.paper, bg: LIN.ink, key: key + i });
      ctx.restore();
    } else linText(t.s, xx, y + dy, size, { c: LIN.ink, bg: LIN.paper, key: key + i });
    xx += t.w;
  });
  ctx.restore();
}
function linTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.25), k = linBridgeK(); if (k <= 0 || TT < at - 1e-6) return;
  const x = o.x ?? 60, y = o.y ?? 262, size = o.size ?? 40, w = linTextW(str, size, 0.12), bw = w + size * 0.9, bh = size * 1.5, key = 'tag' + str;
  const bar = linMemo(key + size, () => linRough(linRectPts(x, y, bw, bh), 2, key, 34));
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(x - 10, y - 10, (bw + 20) * k, bh + 20); ctx.clip(); }
  linPoly(bar); linInk();
  ctx.beginPath(); linLens(x + 8, y + bh + 12, x + bw - 8, y + bh + 11, 7, 1.5, linIn(at, 0.25)); ctx.fillStyle = LIN.color; ctx.fill();   // one stroke of the second colour under it
  linText(str, x + size * 0.45, y + size * 1.11, size, { c: LIN.paper, bg: LIN.ink, key, track: 0.12, n: Math.ceil(linIn(at + 0.08, 0.25) * String(str).length) });
  ctx.restore();
}
const linCaption = (str, o = {}) => { const f = () => linCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const linTag = (str, o = {}) => { const f = () => linTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the print's surface (cached, seeded): salt in the ink where the roller missed, fibre and ink flecks in the paper
//    linSalt(i): 0 = the block's own fixed salt, 1..3 = the boil (one per boil step), 4 = the heavy salt of a press
// ---------------------------------------------------------------------
function linSalt(i) {
  const key = 'salt' + i; if (LIN_CV[key]) return LIN_CV[key];
  const c = linCanvas(key), g = c.getContext('2d'), R = RNG('linsalt', i), gx = 9, gy = 15, N = [];
  for (let k = 0; k < (gx + 1) * (gy + 1); k++) N.push(R.f());
  const patch = (x, y) => { const u = x / W * gx, v = y / H * gy, i0 = Math.min(gx - 1, Math.floor(u)), j0 = Math.min(gy - 1, Math.floor(v)), fu = u - i0, fv = v - j0, a = N[j0 * (gx + 1) + i0], b = N[j0 * (gx + 1) + i0 + 1], cc = N[(j0 + 1) * (gx + 1) + i0], d = N[(j0 + 1) * (gx + 1) + i0 + 1]; return lerp(lerp(a, b, fu), lerp(cc, d, fu), fv); };
  const n = i === 0 ? 30000 : i === 4 ? 90000 : 8000;
  g.fillStyle = LIN.paper;
  for (let k = 0; k < n; k++) {
    const x = Math.floor(R.r(0, W)), y = Math.floor(R.r(0, H)), p = R.f(), sz = R.f(), d = patch(x, y);
    if (p > (i === 4 ? 0.15 + 0.85 * d : 0.03 + 0.97 * d * d * d)) continue;
    const s = sz < 0.62 ? 1 : sz < 0.93 ? 2 : 3; g.fillRect(x, y, s, sz > 0.8 ? 1 + (s > 2 ? 1 : 0) : s);
  }
  return c;
}
function linFibre() {
  if (LIN_CV.fibre) return LIN_CV.fibre;
  const c = linCanvas('fibre'), g = c.getContext('2d'), R = RNG('linfibre');
  g.strokeStyle = LIN.fibre; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i < 1500; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(8, 34), b = R.n(5); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 - Math.sin(a) * b, y + Math.sin(a) * l / 2 + Math.cos(a) * b, x + Math.cos(a) * l, y + Math.sin(a) * l); }
  g.stroke();
  g.fillStyle = LIN.fibre; for (let i = 0; i < 5000; i++) g.fillRect(Math.floor(R.r(0, W)), Math.floor(R.r(0, H)), 2, 2);
  g.fillStyle = LIN.ink;                                     // flecks of ink the cleared lino still picked up
  for (let i = 0; i < 900; i++) { const s = R.f() < 0.8 ? 2 : 3; g.fillRect(Math.floor(R.r(LIN_B.x0 + 8, LIN_B.x1 - 8)), Math.floor(R.r(LIN_B.y0 + 8, LIN_B.y1 - 8)), s, R.f() < 0.5 ? s : 1); }
  return c;
}
// the stray ridges left on the sheet while a bridge cuts the block down to one shape
function linStray() {
  return linMemo('stray', () => { const R = RNG('linstray'), out = []; for (let i = 0; i < 150; i++) { const x = R.r(50, W - 50), y = R.r(50, H - 50), a = R.n(0.5) + (R.f() < 0.2 ? 1.2 : 0), l = R.r(18, 80), w = R.r(3.5, 9); out.push([x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2, x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2, w, R.n(4)]); } return out; });
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'linocut',
  paper: LIN.paper,
  // the bare sheet. A linocut has no in-between tones, so the colour the renderer blends is not used: instead the
  // block is cut away around the bridge shape, and the stray ridges it leaves thin out as the bridge goes on
  backdrop(c, o) {
    ctx.save(); screen(); ctx.fillStyle = LIN.paper; ctx.fillRect(0, 0, W, H);
    if (o) {
      const S = linStray(), n = Math.round(o.phase === 'shrink' ? S.length * (1 - o.u) ** 1.5 : o.phase === 'grow' ? 14 + 40 * o.u : 14);
      ctx.beginPath(); for (let i = 0; i < n; i++) { const r = S[i]; linLens(r[0], r[1], r[2], r[3], r[4], r[5]); } linInk();
    }
    ctx.restore();
  },
  // the era seen through the bridge shape. As the window closes onto the object an uncut ring of block is left
  // standing round it (the same ring the morphing island has)
  window(P, key, src, o = {}) {
    const u = o.u ?? 0, g = smooth(0.5, 1, o.phase === 'grow' ? 1 - u : u);
    ctx.save();
    if (g > 0.02) { linPoly(linGrow(P, 26 * g)); linInk(); }
    linPoly(P); ctx.clip(); ctx.drawImage(src, 0, 0);
    ctx.restore();
  },
  // the morphing shape: an island of block left on the sheet, carved with two rows and a cleared middle. Half-way
  // through it is pressed and the second colour drops in, off register
  blob(P, c, key, u = 0) {
    const tc = parseFloat(String(key).replace('morph', '')), t = Number.isFinite(tc) ? tc : TT + (u >= 0.5 ? -1 : 1);
    linBlock(() => {
      linPoly(linGrow(P, 26)); linInk();
      linColor(P, { in: linDrop(t), grow: -4 });
      linCarve(P, { key: 'disc', rows: 2, core: true, gap: 16, cache: false, chips: false });
    }, { bare: true, press: t });
  },
  hero(x, y, r, o = {}) { linBlock(() => { linHare(x, y, r * 0.8, { ink: r * 0.14, hold: true, key: 'hare' }); }, { bare: true }); },
  heroColor: LIN.paper,
  heroPts(x, y, r) { return linHarePts(x, y, r * 0.8); },
  // the print's surface over the finished frame: salt where the ink missed (it boils a little), paper fibre
  post() {
    ctx.save(); screen();
    ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(linSalt(0), 0, 0); ctx.drawImage(linSalt(1 + B % 3), 0, 0);
    if (LIN_PRESS > 0) ctx.drawImage(linSalt(4), 0, 0);
    ctx.globalCompositeOperation = 'darken';
    ctx.drawImage(linFibre(), 0, 0);
    ctx.restore();
    LIN_PRESS = 0;
  },
  ones: false,
};
