// =====================================================================
//  styles/batik/kit.js — BATIK: Indonesian wax-resist cloth. A dyed ground (sogan brown or indigo) carrying cream
//  wax lines drawn with a canting: uneven weight, small pools of wax, fine crackle, a woven-cloth texture.
//  Motif families drawn in code: kawung (four-lobed ovals on a grid), parang (diagonal S-wave bands), mega mendung
//  (layered cloud contours in graded tones), truntum (small star flowers), isen-isen (cecek dots, sawut lines).
//  The hero is Kukila, a bird built from the same ornament. Motion on 2s; lines draw on like wax being applied,
//  patterns grow outward from a centre, the whole cloth sways (post). Built on kit/core.js.
//  Helpers are prefixed bt…; the palette is BT. Needs from the piece head: CX (caption centre x).
// =====================================================================
const BT = {
  sogan: '#6b3f1d', soganD: '#3d2311', soganL: '#8a5527', soganM: '#7b4a22',
  indigo: '#15244a', indigoD: '#0c1630', indigoL: '#2c4680',
  cream: '#f3e3bc', creamD: '#cfa96e', gold: '#e3ab3c', goldD: '#a8742a',
  red: '#9c3a21', redD: '#6a2313', ink: '#24130a',
};
BT.paper = BT.soganD;
const BT_BLUES = ['#dbe8f3', '#93b5dc', '#5681bd', '#2f5596', '#1d3566'];   // mega mendung, outer contour -> core
const BT_REDS = ['#f3d6b0', '#e09a66', '#c35a34', '#992f1c', '#64180f'];
const BT_FONT = 'Optima, Candara, "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", "DejaVu Sans", "Noto Sans", sans-serif';

// ---------------------------------------------------------------------
//  basics: paths, insets, a cache for static pieces of cloth (drawn once, keyed, seeded: deterministic)
// ---------------------------------------------------------------------
function btPath(P, closed) { ctx.beginPath(); for (let i = 0; i < P.length; i++) { if (i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[i][0], P[i][1]); } if (closed) ctx.closePath(); }
const btCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const btInset = (P, k, c = btCentroid(P), ky = k) => P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * ky]);
const BT_CACHE = {};
function btCache(key, w, h, draw) {
  if (BT_CACHE[key]) return BT_CACHE[key];
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h);
  const keep = ctx; ctx = cv.getContext('2d'); try { draw(); } finally { ctx = keep; }
  return (BT_CACHE[key] = cv);
}

// ---------------------------------------------------------------------
//  the canting line: a wax line of uneven weight (width breathes along its length), a slight hand wander, small
//  pools where the wax sat. Steady (no boil): wax on cloth does not move. o: { w, c, closed, frac (draw-on 0..1),
//  key, amt (wander px), drops (false = no pools), step }. Returns the tip { x, y } while frac < 1 (for btCanting).
//  Don't pass a translucent colour: the overlapping round caps would bead. Fade with ctx.globalAlpha on a cached tile.
// ---------------------------------------------------------------------
function btLine(P, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0.001 || P.length < 2) return null;
  const closed = !!o.closed, w = o.w ?? 6, key = o.key ?? 'line', amt = o.amt ?? Math.min(2.4, w * 0.3);
  const Q = resample(closed ? P.concat([P[0]]) : P, false, o.step ?? 9), n = Q.length;
  const R = RNG('btline', key), f1 = R.r(0.02, 0.04), f2 = R.r(0.07, 0.12), f3 = R.r(0.015, 0.035), p1 = R.r(0, TAU), p2 = R.r(0, TAU), p3 = R.r(0, TAU);
  const S = new Array(n); S[0] = 0; for (let i = 1; i < n; i++) S[i] = S[i - 1] + dist(Q[i - 1], Q[i]);
  const L = S[n - 1], last = Math.max(1, Math.round((n - 1) * frac)), X = [], Wd = [];
  for (let i = 0; i <= last; i++) {
    const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    const s = S[i], en = closed ? Math.min(1, s / 40, (L - s) / 40) : 1;
    const off = amt * en * (0.7 * Math.sin(s * f1 + p1) + 0.3 * Math.sin(s * f2 + p2));
    X.push([Q[i][0] + nx / l * off, Q[i][1] + ny / l * off]);
    Wd.push(w * (0.88 + 0.24 * Math.sin(s * f3 + p3) + 0.1 * Math.sin(s * f2 * 1.3 + p1)));
  }
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle = o.c ?? BT.cream;
  for (let i = 0; i < last; i += 3) {
    const j = Math.min(last, i + 3); ctx.beginPath(); ctx.moveTo(X[i][0], X[i][1]);
    for (let k = i + 1; k <= j; k++) ctx.lineTo(X[k][0], X[k][1]);
    ctx.lineWidth = Wd[i]; ctx.stroke();
  }
  if (o.drops !== false) {   // wax pools: where the canting paused
    ctx.beginPath();
    for (let s = R.r(50, 120); s < L * frac; s += R.r(110, 220)) { const i = Math.min(last, Math.round(s / L * (n - 1))), rr = w * R.r(0.58, 0.78); ctx.moveTo(X[i][0] + rr, X[i][1]); ctx.arc(X[i][0], X[i][1], rr, 0, TAU); }
    if (!closed) { ctx.moveTo(X[0][0] + w * 0.7, X[0][1]); ctx.arc(X[0][0], X[0][1], w * 0.7, 0, TAU); }
    ctx.fill();
  }
  let tip = null;
  if (frac < 1) { const t = X[last]; ctx.beginPath(); ctx.arc(t[0], t[1], w * 0.95, 0, TAU); ctx.fill(); tip = { x: t[0], y: t[1] }; }
  ctx.restore(); return tip;
}
// a dyed or waxed area. o: { al }
function btFill(P, c, o = {}) { ctx.save(); if (o.al != null) ctx.globalAlpha *= o.al; btPath(P, true); ctx.fillStyle = c; ctx.fill(); ctx.restore(); }

// ---------------------------------------------------------------------
//  isen-isen (filling): cecek = rows of dots, sawut = fine parallel lines, dots along a path, crackle veins
// ---------------------------------------------------------------------
// cecek: staggered dot rows clipped to outline P. o: { gap, r, c, al, key }
function btCecek(P, o = {}) {
  const gap = o.gap ?? 16, r = o.r ?? 2.6, bb = bbox(P), R = RNG('btcecek', o.key ?? 'c');
  ctx.save(); btPath(P, true); ctx.clip(); ctx.fillStyle = o.c ?? BT.cream; if (o.al != null) ctx.globalAlpha *= o.al;
  ctx.beginPath(); let row = 0;
  for (let y = bb.y0 + gap * 0.5; y < bb.y1; y += gap * 0.86, row++) for (let x = bb.x0 + (row % 2 ? gap * 0.5 : 0); x < bb.x1; x += gap) {
    const px = x + R.n(gap * 0.08), py = y + R.n(gap * 0.08), rr = r * R.r(0.8, 1.2); ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU);
  }
  ctx.fill(); ctx.restore();
}
// sawut: fine parallel lines clipped to outline P. o: { gap, w, ang, c, al }
function btSawut(P, o = {}) {
  const gap = o.gap ?? 9, bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 2;
  const ang = o.ang ?? 0.6, dx = Math.cos(ang), dy = Math.sin(ang);
  ctx.save(); btPath(P, true); ctx.clip(); ctx.strokeStyle = o.c ?? BT.cream; ctx.lineWidth = o.w ?? 1.8; ctx.lineCap = 'round'; if (o.al != null) ctx.globalAlpha *= o.al;
  ctx.beginPath();
  for (let d = -rad; d <= rad; d += gap) { const ox = cx - dy * d, oy = cy + dx * d; ctx.moveTo(ox - dx * rad, oy - dy * rad); ctx.lineTo(ox + dx * rad, oy + dy * rad); }
  ctx.stroke(); ctx.restore();
}
// a row of dots along a path (the dotted line that follows a contour). o: { gap, r, closed, c, frac, al }
function btDots(P, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const Q = resample(o.closed ? P.concat([P[0]]) : P, false, o.gap ?? 18), r = o.r ?? 3, m = Math.round((Q.length - (o.closed ? 1 : 0)) * f);
  ctx.save(); ctx.fillStyle = o.c ?? BT.cream; if (o.al != null) ctx.globalAlpha *= o.al; ctx.beginPath();
  for (let i = 0; i < m; i++) { ctx.moveTo(Q[i][0] + r, Q[i][1]); ctx.arc(Q[i][0], Q[i][1], r, 0, TAU); }
  ctx.fill(); ctx.restore();
}
// wax crackle: hairline veins where dye crept through cracked wax, clipped to P. o: { n, c, key, w }
function btCrackle(P, o = {}) {
  const bb = bbox(P), R = RNG('btcrackle', o.key ?? 'k');
  ctx.save(); btPath(P, true); ctx.clip(); ctx.strokeStyle = o.c ?? 'rgba(88,48,18,0.55)'; ctx.lineWidth = o.w ?? 1.2; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let i = 0; i < (o.n ?? 12); i++) {
    let x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), a = R.r(0, TAU); ctx.moveTo(x, y);
    for (let k = 0, m = R.i(2, 5); k < m; k++) { a += R.n(0.9); const l = R.r(8, 26); x += Math.cos(a) * l; y += Math.sin(a) * l; ctx.lineTo(x, y); }
  }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  shapes: the leaf (every lobe, feather and plume is one), its spine, a scroll (ukel)
// ---------------------------------------------------------------------
// a pointed leaf from base (x0, y0) to tip (x1, y1): half-width wid, bend = sideways curl (fraction of the length,
// growing toward the tip), p = where it is widest (< 1 near the base, > 1 near the tip)
function btLeafPts(x0, y0, x1, y1, wid, bend = 0, n = 12, p = 0.85) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L, A = [], Bk = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, hw = wid * Math.sin(Math.PI * u ** p), sx = x0 + dx * u + px * bend * L * u * u, sy = y0 + dy * u + py * bend * L * u * u;
    A.push([sx + px * hw, sy + py * hw]); if (i > 0 && i < n) Bk.unshift([sx - px * hw, sy - py * hw]);
  }
  return A.concat(Bk);
}
function btSpinePts(x0, y0, x1, y1, bend = 0, n = 12, u0 = 0, u1 = 1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L, P = [];
  for (let i = 0; i <= n; i++) { const u = lerp(u0, u1, i / n); P.push([x0 + dx * u + px * bend * L * u * u, y0 + dy * u + py * bend * L * u * u]); }
  return P;
}
// ukel: a spiral curl starting at angle a0 on radius r and winding inward. o: { turns, dir, a0, w, c, frac, key }
function btScroll(x, y, r, o = {}) {
  const turns = o.turns ?? 1.6, dir = o.dir ?? 1, a0 = o.a0 ?? 0, n = 40, P = [];
  for (let i = 0; i <= n; i++) { const u = i / n, a = a0 + dir * u * turns * TAU, rr = r * (1 - 0.84 * u); P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return btLine(P, { w: o.w ?? 5, c: o.c, frac: o.frac, key: o.key ?? 'ukel', step: 6, drops: false });
}

// ---------------------------------------------------------------------
//  the cloth: a dyed ground with uneven dye (mottle, cached); weave + crackle + sway + folds go on in post
// ---------------------------------------------------------------------
function btMottle() {
  return btCache('mottle', W, H, () => {
    const R = RNG('btmottle');
    for (let i = 0; i < 46; i++) {
      const x = R.r(0, W), y = R.r(0, H), r = R.r(140, 420), dark = R.f() < 0.55, a = R.r(0.05, 0.13);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, dark ? `rgba(20,8,2,${a})` : `rgba(255,226,170,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}
function btGround(c = BT.sogan) { ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.drawImage(btMottle(), 0, 0); ctx.restore(); }
function btWeave() {
  return btCache('weave', W, H, () => {
    const R = RNG('btweave'); ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 3) { ctx.strokeStyle = `rgba(20,8,2,${R.r(0.04, 0.15)})`; ctx.beginPath(); ctx.moveTo(0, y + R.n(0.4)); ctx.lineTo(W, y + R.n(0.6)); ctx.stroke(); }
    for (let x = 0; x < W; x += 3) { ctx.strokeStyle = `rgba(255,236,196,${R.r(0.025, 0.085)})`; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + R.n(0.6), H); ctx.stroke(); }
    for (let i = 0; i < 240; i++) { ctx.fillStyle = `rgba(30,12,4,${R.r(0.05, 0.13)})`; ctx.fillRect(R.r(0, W), R.r(0, H), R.r(20, 130), 1.3); }   // slubs
    ctx.lineJoin = 'round';
    for (let i = 0; i < 150; i++) {   // crackle over the whole cloth: dark veins (seen on wax) and pale ones (seen on dye)
      ctx.strokeStyle = i % 3 ? `rgba(70,36,12,${R.r(0.22, 0.45)})` : `rgba(243,227,188,${R.r(0.1, 0.22)})`; ctx.lineWidth = R.r(0.8, 1.5);
      let x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU); ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0, m = R.i(3, 7); k < m; k++) { a += R.n(0.8); const l = R.r(10, 38); x += Math.cos(a) * l; y += Math.sin(a) * l; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  });
}
let BT_SCRATCH = null;
// post: the cloth sways (the frame is redrawn in thin vertical strips on a slow travelling wave), soft fold shading
// travels with the wave, then weave + crackle and a vignette. amp = the sway in px (0 = a flat cloth).
function btPost(amp = (typeof BT_SWAY !== 'undefined' ? BT_SWAY : 4)) {
  ctx.save(); screen(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const wave = (x) => Math.sin(x * 0.0058 + TT * 1.5) + 0.5 * Math.sin(x * 0.0127 - TT * 1.05);
  if (amp > 0) {
    if (!BT_SCRATCH) { BT_SCRATCH = document.createElement('canvas'); BT_SCRATCH.width = W; BT_SCRATCH.height = H; }
    BT_SCRATCH.getContext('2d').drawImage(ctx.canvas, 0, 0);
    const sw = 18; for (let x = 0; x < W; x += sw) ctx.drawImage(BT_SCRATCH, x, 0, sw, H, x, amp * wave(x + sw / 2) - amp * 1.6, sw, H + amp * 3.2);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    for (let i = 0; i <= 18; i++) { const x = i / 18 * W, sl = wave(x + 40) - wave(x - 40); g.addColorStop(i / 18, sl > 0 ? `rgba(12,5,2,${(0.2 * Math.min(1, sl * 1.6)).toFixed(3)})` : `rgba(255,236,200,${(0.07 * Math.min(1, -sl * 1.6)).toFixed(3)})`); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 0.6; ctx.drawImage(btWeave(), 0, 0); ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.74); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,4,2,0.42)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  KAWUNG: four pointed ovals around a centre. btKawungPts = the flower's outline (a bridge shape);
//  btKawung draws one; btKawungField tiles the cloth and grows outward from (cx, cy).
// ---------------------------------------------------------------------
function btKawungPts(x, y, r, rot = Math.PI / 4, n = 96) {
  const P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.3 + 0.7 * Math.abs(Math.cos(2 * (a - rot))) ** 0.75; P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
  return P;
}
// o: { frac, key, c, w, fill (lobe dye), rot }
function btKawung(x, y, r, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const key = o.key ?? 'kawung', rot = o.rot ?? Math.PI / 4, c = o.c ?? BT.cream, w = o.w ?? Math.max(3, r * 0.045), d = seg(f, 0.7, 1);
  for (let k = 0; k < 4; k++) {
    const g = seg(f, k * 0.15, k * 0.15 + 0.45); if (g <= 0) continue;
    const a = rot + k * TAU / 4, ca = Math.cos(a), sa = Math.sin(a);
    const P = btLeafPts(x + ca * r * 0.08, y + sa * r * 0.08, x + ca * r, y + sa * r, r * 0.27, 0, 12, 1);
    if (o.fill) btFill(P, o.fill, { al: g * g });
    btLine(P, { closed: true, w, c, key: key + k, frac: g, drops: false });
    if (d > 0) {   // isen: a short vein and a cecek near the tip
      ctx.save(); ctx.globalAlpha *= d; ctx.strokeStyle = ctx.fillStyle = c; ctx.lineWidth = w * 0.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + ca * r * 0.34, y + sa * r * 0.34); ctx.lineTo(x + ca * r * 0.62, y + sa * r * 0.62); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + ca * r * 0.76, y + sa * r * 0.76, w * 0.6, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  if (d > 0) { ctx.save(); ctx.globalAlpha *= d; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(2, r * 0.05), 0, TAU); ctx.fill(); ctx.restore(); }
}
// mlinjon: the small lozenge with four dots that sits between kawung flowers
function btMlinjon(x, y, r, c = BT.cream, g = 1) {
  if (g <= 0) return; const q = r * EZ.o2(g);
  ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - q); ctx.lineTo(x + q, y); ctx.lineTo(x, y + q); ctx.lineTo(x - q, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); for (const [ax, ay] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(x + ax * r * 1.5 + r * 0.3, y + ay * r * 1.5); ctx.arc(x + ax * r * 1.5, y + ay * r * 1.5, r * 0.3 * g, 0, TAU); }
  ctx.fill(); ctx.restore();
}
function btKawungCell(x, y, s, o = {}) {   // one repeat: the flower + the mlinjon on its left and top edges
  const f = clamp(o.frac ?? 1);
  btKawung(x, y, s * 0.66, { c: o.c, fill: o.fill, key: o.key, frac: seg(f, 0, 0.8) });
  btMlinjon(x - s / 2, y, s * 0.075, o.c, seg(f, 0.5, 0.85)); btMlinjon(x, y - s / 2, s * 0.075, o.c, seg(f, 0.6, 0.95));
}
// o: { s (repeat px), cx, cy (the centre it grows from), t0, speed (px/s), dur, c, fill, x0, y0, x1, y1, skip(x, y) }
// Finished repeats are cached tiles (3 hand variants); only the growing ring is drawn live.
function btKawungField(o = {}) {
  const s = o.s ?? 180, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, t0 = o.t0 ?? -99, speed = o.speed ?? 650, dur = o.dur ?? 0.6, c = o.c ?? BT.creamD, fill = o.fill ?? null, pad = 40;
  const x0 = o.x0 ?? -s, x1 = o.x1 ?? W + s, y0 = o.y0 ?? -s, y1 = o.y1 ?? H + s;
  for (let j = Math.floor((y0 - cy) / s); j <= Math.ceil((y1 - cy) / s); j++) for (let i = Math.floor((x0 - cx) / s); i <= Math.ceil((x1 - cx) / s); i++) {
    const x = cx + i * s, y = cy + j * s; if (o.skip && o.skip(x, y)) continue;
    const v = hash('btkw', i, j) % 3, f = (TT - t0 - Math.hypot(x - cx, y - cy) / speed) / dur; if (f <= 0) continue;
    if (f >= 1) ctx.drawImage(btCache(`kw|${s}|${c}|${fill}|${v}`, s + pad * 2, s + pad * 2, () => btKawungCell(pad + s / 2, pad + s / 2, s, { c, fill, key: 'kw' + v })), x - s / 2 - pad, y - s / 2 - pad);
    else btKawungCell(x, y, s, { c, fill, key: 'kw' + v, frac: f });
  }
}

// ---------------------------------------------------------------------
//  PARANG: a band of diagonal S-waves with a cecek in each hollow, thin rules between, a ruled edge top and bottom.
//  o: { gap, c, bg, frac, dir (1 rising to the right, -1 falling), key }. Cached once fully drawn.
// ---------------------------------------------------------------------
function btParang(x, y, w, h, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const gap = o.gap ?? 96, c = o.c ?? BT.cream, dir = o.dir ?? 1, key = o.key ?? 'parang';
  const draw = (ox, oy, fr) => {
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, w, h); ctx.clip();
    if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(ox, oy, w, h); }
    const gx = gap * Math.SQRT2, ux = Math.SQRT1_2, uy = -Math.SQRT1_2 * dir, nx = -uy, ny = ux, Ld = h * Math.SQRT2 + 60, lam = gap * 1.05, A = gap * 0.2;
    const i0 = -Math.ceil(h / gx) - 1, i1 = Math.ceil(w / gx) + 1;
    for (let i = i0; i <= i1; i++) {
      const g = seg(fr, (i - i0) / (i1 - i0) * 0.6, (i - i0) / (i1 - i0) * 0.6 + 0.4); if (g <= 0) continue;
      const bx = ox + i * gx, by = dir > 0 ? oy + h + 20 : oy - 20, P = [];
      for (let s = 0; s <= Ld; s += 8) { const o2 = A * Math.sin(s / lam * TAU); P.push([bx + ux * s + nx * o2, by + uy * s + ny * o2]); }
      btLine(P, { w: Math.max(5, gap * 0.095), c, key: key + i, frac: g, step: 8 });
      ctx.save(); ctx.strokeStyle = ctx.fillStyle = c; ctx.lineWidth = Math.max(2, gap * 0.03); ctx.globalAlpha *= g;
      ctx.beginPath(); ctx.moveTo(bx + nx * gap * 0.5, by + ny * gap * 0.5); ctx.lineTo(bx + nx * gap * 0.5 + ux * Ld * g, by + ny * gap * 0.5 + uy * Ld * g); ctx.stroke();
      ctx.beginPath();
      for (let k = 0; (k + 0.25) * lam < Ld * g; k++) for (const [ph, sd] of [[0.25, -1], [0.75, 1]]) {
        const s = (k + ph) * lam, px = bx + ux * s + nx * sd * A * 0.25, py = by + uy * s + ny * sd * A * 0.25, r = gap * 0.045; ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU);
      }
      ctx.fill(); ctx.restore();
    }
    ctx.restore();
    for (const [yy, k] of [[oy + 3, 't'], [oy + h - 3, 'b']]) { btLine([[ox, yy], [ox + w, yy]], { w: 6, c, key: key + k, frac: fr, drops: false }); btDots([[ox, yy + (k === 't' ? -16 : 16)], [ox + w, yy + (k === 't' ? -16 : 16)]], { gap: 22, r: 3.2, c, frac: fr }); }
  };
  if (f >= 1) ctx.drawImage(btCache(`parang|${w}|${h}|${gap}|${c}|${o.bg}|${dir}|${key}`, w, h + 60, () => draw(0, 30, 1)), x, y - 30); else draw(x, y, f);
}

// ---------------------------------------------------------------------
//  MEGA MENDUNG: a scalloped cloud, drawn as contours nested toward its lower middle in graded tones.
//  btCloudPts = the outer contour (a bridge shape). o: { key, tones (outer -> core), grow 0..1 (core first, then
//  each contour outward), w, line }
// ---------------------------------------------------------------------
function btCloudPts(x, y, w, h, key = 'cloud', n = 96) {
  const R = RNG('btcloud', key), nb = 9 + R.i(0, 2), ph = R.r(0, TAU), P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, ca = Math.cos(a), sa = Math.sin(a), base = (Math.abs(ca / (w / 2)) ** 2.5 + Math.abs(sa / (h / 2)) ** 2.5) ** (-1 / 2.5);
    const rho = base * (0.86 + 0.16 * Math.abs(Math.sin(a * nb / 2 + ph)) ** 0.7 * (sa < 0 ? 1 : 0.55));
    P.push([x + ca * rho, y + sa * rho]);
  }
  return P;
}
const BT_CLOUD_STEP = 0.185;
function btCloud(x, y, w, h, o = {}) {
  const tones = o.tones ?? BT_BLUES, n = tones.length, grow = clamp(o.grow ?? 1); if (grow <= 0) return;
  const P0 = btCloudPts(x, y, w, h, o.key ?? 'cloud'), an = [x, y + h * 0.1];
  for (let k = 0; k < n; k++) {
    const g = EZ.o3(seg(grow, (n - 1 - k) * 0.14, (n - 1 - k) * 0.14 + 0.44)); if (g <= 0) continue;
    const P = btInset(P0, (1 - k * BT_CLOUD_STEP) * (0.55 + 0.45 * g), an);
    ctx.save(); ctx.globalAlpha *= Math.min(1, g * 2.5);
    btFill(P, tones[k]);
    if (k) { btPath(P, true); ctx.strokeStyle = BT.cream; ctx.globalAlpha *= 0.5; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(); }
    else btLine(P, { closed: true, w: o.w ?? 5.5, c: o.line ?? BT.cream, key: (o.key ?? 'cloud') + 'L', drops: false });
    ctx.restore();
  }
}
// the nested contours of a morphing shape: u = 0 a sogan-tinted kawung flower, u = 1 a mega mendung cloud in blues
function btLayers(P, c, u = 0) {
  const bb = bbox(P), ce = btCentroid(P), an = [ce[0], ce[1] + (bb.y1 - bb.y0) * 0.1 * u];
  btFill(P, c);
  for (let k = 1; k <= 4; k++) {
    const Q = btInset(P, 1 - k * BT_CLOUD_STEP, an);
    ctx.save(); btPath(Q, true); ctx.fillStyle = `rgba(24,46,98,${(0.34 * clamp(u * 2 - 1)).toFixed(3)})`; ctx.fill(); ctx.fillStyle = `rgba(150,92,40,${(0.2 * clamp(1 - u * 2)).toFixed(3)})`; ctx.fill();   // the tints cross through plain wax: no grey middle
    ctx.strokeStyle = BT.cream; ctx.globalAlpha *= 0.5; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  }
}

// ---------------------------------------------------------------------
//  TRUNTUM: a small star flower (long and short rays, a centre, dots at the short rays). o: { frac, c, rot, n, al }
// ---------------------------------------------------------------------
function btTruntum(x, y, r, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const rot = o.rot ?? 0, n = o.n ?? 8;
  ctx.save(); ctx.strokeStyle = ctx.fillStyle = o.c ?? BT.cream; ctx.lineCap = 'round'; if (o.al != null) ctx.globalAlpha *= o.al;
  for (let i = 0; i < n; i++) {
    const g = seg(f, i / n * 0.6, i / n * 0.6 + 0.4); if (g <= 0) continue;
    const a = rot + i / n * TAU, L = r * lerp(0.26, i % 2 ? 0.6 : 1, g), ca = Math.cos(a), sa = Math.sin(a);
    ctx.lineWidth = r * (i % 2 ? 0.1 : 0.15); ctx.beginPath(); ctx.moveTo(x + ca * r * 0.26, y + sa * r * 0.26); ctx.lineTo(x + ca * L, y + sa * L); ctx.stroke();
    if (i % 2 && g >= 1) { ctx.beginPath(); ctx.arc(x + ca * r * 0.86, y + sa * r * 0.86, r * 0.075, 0, TAU); ctx.fill(); }
  }
  ctx.beginPath(); ctx.arc(x, y, r * 0.15 * Math.min(1, f * 3), 0, TAU); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: KUKILA, a bird made of batik ornament — an egg body dyed mengkudu red, a curved neck, a three-feather
//  crest, three long tail plumes, a wing; every part outlined in cream wax and filled with cecek and sawut; gold
//  (prada) only on the beak, the crest tips and the plume eyes. (x, y) = the body's centre, s = the body's length
//  (the whole bird is about 2.4 s wide, 2 s tall). o: { key, face (1 right, -1 left), fly, flap (a phase, default
//  from TT), frac (draw-on 0..1), tilt, fill, bob }. Returns { tip } while drawing on (for btCanting).
// ---------------------------------------------------------------------
function btBird(x, y, s, o = {}) {
  const key = o.key ?? 'kukila', face = o.face ?? 1, fr = clamp(o.frac ?? 1), fly = !!o.fly, fillC = o.fill ?? BT.red, lw = Math.max(3, s * 0.021);
  const bob = o.bob ?? (fly ? Math.sin(TT * TAU * 1.1) * 0.03 : Math.sin(TT * TAU * 0.5) * 0.012);
  const M = (P) => xform(P, x, y + bob * s, (o.tilt ?? 0) * face, s * face, s);
  SPARK_AT = toScreen(x, y);
  let tip = null, idx = 0; const N = fly ? 13 : 12;
  const prog = () => { const a = idx / N * 0.72; idx++; return seg(fr, a, a + 0.28); };
  const shape = (P, g, closed = true, opt = {}) => {
    if (g <= 0) return null; const Q = M(P);
    if (opt.fill !== null) btFill(Q, opt.fill ?? fillC, { al: g * g });
    const t = btLine(Q, { closed, w: opt.w ?? lw, key: key + (opt.k ?? idx), frac: g, c: opt.c, drops: false, step: 7 });
    if (t) tip = t; return Q;
  };
  const isen = seg(fr, 0.8, 1), sw = Math.sin(TT * TAU * 0.45) * (fly ? 0.1 : 0.04);
  const dot = (px, py, r, c) => { const [q] = M([[px, py]]); ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(q[0], q[1], r * s, 0, TAU); ctx.fill(); ctx.restore(); };
  const thin = (P, c = BT.cream, k = 0.5) => { ctx.save(); btPath(M(P), false); ctx.strokeStyle = c; ctx.lineWidth = lw * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); };
  // tail plumes
  const tips = fly ? [[-1.48, 0.44 + sw], [-1.66, 0.12 + sw * 1.2], [-1.5, -0.2 + sw]] : [[-1.2, 0.78 + sw], [-1.42, 0.42 + sw], [-1.4, 0.02 + sw]];
  tips.forEach(([tx, ty], i) => {
    const g = prog(), bend = [0.1, 0.02, -0.1][i], Q = shape(btLeafPts(-0.38, 0.05, tx, ty, 0.125, bend, 14, 1.6), g, true, { fill: BT.redD });
    if (Q && isen > 0) {
      btSawut(Q, { gap: Math.max(6, s * 0.035), w: Math.max(1.2, lw * 0.3), ang: Math.atan2(ty - 0.05, (tx + 0.38) * face) + 1.1 * face, al: 0.55 * isen });
      const sp = btSpinePts(-0.38, 0.05, tx, ty, bend, 12, 0.05, 0.62); thin(sp, BT.cream, 0.55);
      const e = btSpinePts(-0.38, 0.05, tx, ty, bend, 1, 0.76, 0.76)[0]; dot(e[0], e[1], 0.05 * isen, BT.cream); dot(e[0], e[1], 0.03 * isen, BT.gold);
    }
  });
  // wing geometry (flying): a fan of four feathers from the shoulder, swinging up and down
  const fl = o.flap ?? TT * 2.2, up = 0.5 + 0.5 * Math.sin(fl * TAU), phi = lerp(-0.42, 1.3, up), SH = [0.06, -0.12];
  const fan = (ph, k0) => [0, 1, 2, 3].map((j) => { const a = ph - j * 0.21, len = [1.0, 0.9, 0.76, 0.6][j]; return btLeafPts(SH[0], SH[1], SH[0] - Math.cos(a) * len, SH[1] - Math.sin(a) * len, 0.12, 0.06, 12, 1.3); });
  if (fly) { const g = prog(); fan(phi + 0.22, 0).reverse().forEach((P, j) => shape(P, g, true, { fill: BT.redD, k: 'fw' + j, w: lw * 0.8 })); }
  // neck, body, head
  shape(btLeafPts(0.2, -0.02, 0.6, -0.8, 0.17, -0.1, 12, 0.6), prog());
  const gb = prog(), body = shape(ellipsePts(0, 0, 0.5, 0.33, -0.22, 40), gb);
  if (body && isen > 0) btCecek(btInset(body, 0.8), { gap: Math.max(9, s * 0.06), r: Math.max(1.6, s * 0.011), al: isen, key });
  shape(ellipsePts(0.56, -0.7, 0.17, 0.155, 0, 24), prog());
  shape([[0.7, -0.77], [0.96, -0.66], [0.71, -0.6]], prog(), true, { fill: BT.gold, w: lw * 0.7 });
  // crest
  [[0.2, -1.1], [0.38, -1.26], [0.58, -1.3]].forEach(([tx, ty], i) => { const g = prog(); shape(btLeafPts(0.5, -0.82, tx, ty, 0.05, 0.08, 10, 1.5), g, true, { w: lw * 0.7 }); if (g >= 1) dot(tx, ty, 0.035, BT.gold); });
  // near wing
  const gw = prog();
  if (fly) {
    fan(phi, 1).reverse().forEach((P, j) => { const Q = shape(P, gw, true, { k: 'nw' + j, w: lw * 0.85 }); if (Q && isen > 0 && j % 1 === 0) thin(btSpinePts(SH[0], SH[1], SH[0] - Math.cos(phi - (3 - j) * 0.21) * [0.6, 0.76, 0.9, 1.0][j], SH[1] - Math.sin(phi - (3 - j) * 0.21) * [0.6, 0.76, 0.9, 1.0][j], 0.06, 8, 0.25, 0.8), BT.cream, 0.45); });
    const a = phi - 0.3, cov = shape(btLeafPts(SH[0] + 0.05, SH[1], SH[0] - Math.cos(a) * 0.5, SH[1] - Math.sin(a) * 0.5, 0.17, 0, 12, 0.8), gw, true, { k: 'cov' });
    if (cov && isen > 0) btCecek(btInset(cov, 0.72), { gap: Math.max(8, s * 0.05), r: Math.max(1.5, s * 0.01), al: isen, key: key + 'cv' });
  } else {
    const wg = shape(btLeafPts(0.26, -0.1, -0.54, 0.17, 0.22, 0.08, 14, 0.7), gw);
    if (wg && isen > 0) {
      const an = M([[0.2, -0.08]])[0];
      for (const k of [0.72, 0.44]) { ctx.save(); btPath(btInset(wg, k, an), true); ctx.strokeStyle = BT.cream; ctx.lineWidth = lw * 0.5; ctx.globalAlpha *= isen; ctx.stroke(); ctx.restore(); }
      btSawut(btInset(wg, 0.44, an), { gap: Math.max(6, s * 0.03), w: Math.max(1.2, lw * 0.3), ang: 0.5 * face, al: 0.6 * isen });
    }
  }
  // eye (blinks), legs
  if (fr > 0.6) {
    const blink = mod(TT + key.length * 0.31, 2.7) < 0.13;
    if (blink) thin([[0.55, -0.72], [0.65, -0.72]], BT.cream, 0.7); else { dot(0.6, -0.73, 0.05, BT.cream); dot(0.612, -0.73, 0.023, BT.ink); }
    if (!fly) for (const lx of [-0.04, 0.12]) { thin([[lx, 0.31], [lx + 0.02, 0.55]], BT.cream, 0.8); thin([[lx - 0.08, 0.57], [lx + 0.02, 0.55], [lx + 0.12, 0.57]], BT.cream, 0.7); }
    else for (const lx of [-0.06, 0.06]) thin([[lx, 0.3], [lx - 0.16, 0.4], [lx - 0.24, 0.38]], BT.cream, 0.7);
  }
  return { tip: fr < 1 ? tip : null };
}
function btBirdPts(x, y, r) { return ellipsePts(x, y, r, r * 0.8, 0, 64); }
// the canting (the wax pen): a copper bowl with a spout on a bamboo handle, its spout at (x, y). o: { ang, s }
function btCanting(x, y, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.ang ?? -0.7); ctx.scale(o.s ?? 1, o.s ?? 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = BT.ink; ctx.lineWidth = 24; ctx.beginPath(); ctx.moveTo(70, -16); ctx.lineTo(230, -16); ctx.stroke();
  ctx.strokeStyle = BT.creamD; ctx.lineWidth = 17; ctx.stroke();
  ctx.strokeStyle = BT.soganL; ctx.lineWidth = 3; ctx.beginPath(); for (const hx of [120, 170]) { ctx.moveTo(hx, -24); ctx.lineTo(hx, -8); } ctx.stroke();
  ctx.beginPath(); ctx.ellipse(52, -16, 26, 18, 0, 0, TAU); ctx.fillStyle = BT.gold; ctx.fill(); ctx.strokeStyle = BT.ink; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, -8); ctx.quadraticCurveTo(12, -4, 0, 0); ctx.strokeStyle = BT.ink; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = BT.gold; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size). The caption sits on a plain band of cloth ruled
//  with a wax line and a cecek row; lines wipe on left to right; *a phrase* is in gold. Both fade during the first
//  0.3s of a bridge's shrink and stay hidden while the next era's window grows: after a bridge of half-length d,
//  give the tag { at: d } and the caption { at: d + 0.4 } or later.
// ---------------------------------------------------------------------
function btLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); if (TT >= r.tc && TT < r.tc + d - 1e-6) return 0; }   // and stay off while the new era opens
  return 1;
}
function btCaptionNow(str, o = {}) {
  const al = btLeaving(); if (al <= 0.001) return;
  const size = o.size ?? 70, lh = size * 1.2, lines = str.split('\n'), yLast = o.y ?? 1446, at = E0 + (o.at ?? 0.5), open = EZ.o3(ev(at - 0.35, 0.45)); if (open <= 0) return;
  const top = yLast - (lines.length - 1) * lh - size * 1.02 - 24, bot = yLast + size * 0.4 + 22;
  ctx.save(); ctx.globalAlpha = al;
  ctx.save(); ctx.globalAlpha = al * 0.93 * open; ctx.fillStyle = o.bg ?? BT.soganD; ctx.fillRect(0, top, W, bot - top); ctx.restore();
  for (const [yy, d, k] of [[top, -15, 'T'], [bot, 15, 'B']]) { btLine([[-20, yy], [W + 20, yy]], { w: 5, key: 'cap' + k, frac: open, drops: false }); btDots([[0, yy + d], [W, yy + d]], { gap: 22, r: 3.2, frac: open }); }
  ctx.font = `700 ${size}px ${BT_FONT}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  lines.forEach((line, li) => {
    const fr = EZ.o2(ev(at + li * 0.3, 0.5)); if (fr <= 0) return;
    const parts = line.split(/(\*[^*]+\*)/).filter(Boolean).map((g) => (g[0] === '*' ? { s: g.slice(1, -1), hi: true } : { s: g, hi: false }));
    const ws = parts.map((p) => ctx.measureText(p.s).width), tw = ws.reduce((a, b) => a + b, 0), yy = yLast - (lines.length - 1 - li) * lh;
    let xx = (o.x ?? CX) - tw / 2;
    ctx.save(); if (fr < 1) { ctx.beginPath(); ctx.rect(xx - 10, yy - size * 1.1, (tw + 20) * fr, size * 1.6); ctx.clip(); }
    parts.forEach((p, i) => { ctx.fillStyle = p.hi ? (o.hi ?? BT.gold) : (o.c ?? BT.cream); ctx.fillText(p.s, xx, yy); xx += ws[i]; });
    ctx.restore();
  });
  ctx.restore();
}
function btTagNow(label, o = {}) {
  const al = btLeaving(), fr = EZ.o2(ev(E0 + (o.at ?? 0.15), 0.4)); if (al <= 0.001 || fr <= 0) return;
  const x = o.x ?? 64, y = o.y ?? 262, h = 64, size = 32;
  ctx.save(); ctx.globalAlpha = al * fr; ctx.font = `700 ${size}px ${BT_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
  const w = 62 + ctx.measureText(label).width + 26;
  ctx.fillStyle = o.bg ?? BT.soganD; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = BT.cream; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  btTruntum(x + 34, y + h / 2, 18, { c: BT.gold, rot: TT * 0.6 });
  ctx.fillStyle = BT.cream; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(label, x + 62, y + h / 2 + 2);
  ctx.restore();
}
const btCaption = (str, o = {}) => { const f = () => btCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const btTag = (label, o = {}) => { const f = () => btTagNow(label, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'batik',
  paper: BT.paper,
  // blank cloth between eras: the dye colour with a tone-on-tone kawung ghost, so the medium still shows mid-morph
  backdrop(c) { btGround(c); ctx.save(); screen(); ctx.globalAlpha = 0.13; btKawungField({ c: BT.creamD }); ctx.restore(); },
  // the era seen through outline P, rimmed like a waxed motif: a cream line and a row of cecek outside it
  window(P, key, src) {
    ctx.save(); btPath(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); btPath(P, true); ctx.strokeStyle = BT.cream; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    const bb = bbox(P), rad = (bb.x1 - bb.x0 + bb.y1 - bb.y0) / 4;
    if (rad < 1400) btDots(btInset(P, 1 + 24 / Math.max(40, rad)), { closed: true, gap: 24, r: 4 });
  },
  // the morphing shape: nested contours (sogan-tinted at the kawung end, graded blue at the cloud end), a canting outline, a cecek ring
  blob(P, c, key, u = 0) {
    btLayers(P, c, u);
    btLine(P, { closed: true, w: 7, key: 'blob', drops: false });
    const bb = bbox(P), rad = (bb.x1 - bb.x0 + bb.y1 - bb.y0) / 4;
    btDots(btInset(P, 1 + 24 / Math.max(40, rad)), { closed: true, gap: 24, r: 4 });
  },
  hero(x, y, r, o = {}) { btBird(x + r * 0.2, y + r * 0.15, r / 1.2, { key: o.key }); },
  heroColor: BT.red,
  heroPts(x, y, r) { return btBirdPts(x, y, r); },
  post() { btPost(); },
  ones: false,
};
