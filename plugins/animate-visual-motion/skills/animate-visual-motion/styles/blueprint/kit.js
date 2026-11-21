// =====================================================================
//  styles/blueprint/kit.js — BLUEPRINT: a technical drawing on deep-blue paper.
//  Built on kit/core.js. A fine and a coarse grid, a sheet frame with registration crosses, and everything drawn
//  as constant-weight white / pale-cyan lines that DRAW THEMSELVES ON (a stroke reveal with a small plotter head
//  at the tip). Dimension lines with arrowheads, callouts on leader lines, dashed hidden lines, dash-dot centre
//  lines, 45-degree section hatching, a title block. One warm accent (amber) for the thing being pointed out.
//  Motion on 1s. Helpers are prefixed bp…; the palette is BP. Needs from the piece head: CX (caption centre x).
// =====================================================================
const BP = {
  paper: '#10477f', paper2: '#0d3d72', paperD: '#0a3261', paperL: '#1c5c9c',
  line: '#f4f9ff', cyan: '#a6dff8', dim: '#6ea9d8', grid: '#8fc3ee',
  amber: '#ffb545', amberD: '#b9791c',
};
const BP_MONO = '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';
const BP_CAPS = '"DIN Alternate", Bahnschrift, "Roboto Condensed", "Arial Narrow", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';
const BP_W = { obj: 5.5, part: 4, thin: 3, dim: 2.6, grid: 1.2 };   // line weights (screen px, constant under the camera)
const BP_DASH = { hidden: [15, 10], centre: [36, 9, 7, 9] };

const bpZoom = () => Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;
function bpPath(P, closed) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }
const bpUp = (s, o) => (o && o.raw ? String(s) : String(s).toUpperCase());

// ---------------------------------------------------------------------
//  the line. o: { w, closed, frac 0..1 (stroke reveal from the first point), dash: 'hidden' | 'centre' | [..],
//  march (px/s the dashes travel toward the end), a (alpha), pen (draw the plotter head at the tip while frac < 1),
//  world (width scales with the camera) }
// ---------------------------------------------------------------------
function bpLine(P, c, o = {}) {
  if (!P || P.length < 2) return;
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const z = o.world ? 1 : bpZoom(), full = frac >= 1;
  let Q = o.closed && !full ? [...P, P[0]] : P;
  if (!full) Q = subPath(Q, frac);
  if (Q.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const d = typeof o.dash === 'string' ? BP_DASH[o.dash] : o.dash;
  if (d) { ctx.setLineDash(d.map((v) => v / z)); ctx.lineCap = 'butt'; if (o.march) ctx.lineDashOffset = -TT * o.march / z; }
  ctx.globalAlpha *= o.a ?? 1; ctx.lineWidth = (o.w ?? BP_W.obj) / z; ctx.strokeStyle = c;
  bpPath(Q, o.closed && full); ctx.stroke(); ctx.restore();
  if (o.pen && !full) bpPen(Q[Q.length - 1][0], Q[Q.length - 1][1], o.penC ?? c);
}
// a line that draws itself on from t0 over dur seconds (eased), with the plotter head. Returns its progress 0..1.
function bpDraw(P, c, t0, dur = 0.5, o = {}) {
  const u = ev(t0, dur); if (u <= 0) return 0;
  bpLine(P, c, { pen: true, ...o, frac: EZ.io(u) }); return u;
}
// the plotter head: a small ring and cross hairs at the tip of a line being drawn
function bpPen(x, y, c = BP.line) {
  const z = bpZoom(), r = 10 / z;
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2 / z; ctx.globalAlpha *= 0.9;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.moveTo(x - r * 2, y); ctx.lineTo(x + r * 2, y); ctx.moveTo(x, y - r * 2); ctx.lineTo(x, y + r * 2); ctx.stroke(); ctx.restore();
}
// a faint wash inside an outline (never a solid bright fill)
function bpFill(P, c, a = 0.06) { ctx.save(); ctx.globalAlpha *= a; bpPath(P, true); ctx.fillStyle = c; ctx.fill(); ctx.restore(); }
// a soft round wash (a lamp that is lit, a zone of interest)
function bpWash(x, y, r, c, a = 0.3) {
  ctx.save(); ctx.globalAlpha *= a; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// section hatching: 45-degree lines clipped to outline P, anchored to the sheet (they do not swim when P moves).
// o: { gap, a, w, frac (wipes in from the left) }
function bpHatch(P, c, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const bb = bbox(P), z = bpZoom(), g = (o.gap ?? 16) * Math.SQRT2;
  const k0 = Math.ceil((bb.x0 + bb.y0) / g) * g, k1 = bb.x1 + bb.y1, kEnd = k0 + (k1 - k0) * frac;
  ctx.save(); bpPath(P, true); ctx.clip(); ctx.globalAlpha *= o.a ?? 0.45; ctx.strokeStyle = c; ctx.lineWidth = (o.w ?? 1.6) / z; ctx.beginPath();
  for (let k = k0; k <= kEnd; k += g) { ctx.moveTo(k - bb.y1, bb.y1); ctx.lineTo(k - bb.y0, bb.y0); }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
function bpCirclePts(x, y, r, n = 72, a0 = 0, a1 = a0 + TAU) {
  const P = [], closed = Math.abs(a1 - a0) >= TAU - 1e-6;
  for (let i = 0; i < n + (closed ? 0 : 1); i++) { const a = a0 + (a1 - a0) * i / n; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  return P;
}
const bpRectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function bpCentroid(P) { return P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]); }
// one gear tooth (an open polyline from root to root), tooth k of n, tip radius rt, root radius rr, rotation rot
function bpGearTooth(x, y, rt, rr, n, rot, k) {
  const p = TAU / n, a = rot + k * p, P = [];
  for (const [f, r] of [[-0.5, rr], [-0.39, rr], [-0.28, rr], [-0.17, rt], [-0.06, rt], [0.06, rt], [0.17, rt], [0.28, rr], [0.39, rr]]) P.push([x + Math.cos(a + f * p) * r, y + Math.sin(a + f * p) * r]);
  return P;
}
// a gear outline (closed), n teeth
function bpGearPts(x, y, rt, rr, n = 12, rot = 0) { const P = []; for (let k = 0; k < n; k++) P.push(...bpGearTooth(x, y, rt, rr, n, rot, k)); return P; }
// a light bulb outline (closed): glass of radius r centred on (x, y), a neck and a screw base below (to y + 1.78r)
function bpBulbPts(x, y, r) {
  const P = bpCirclePts(x, y, r, 60, 128 * DEG, 412 * DEG);
  for (const [fx, fy] of [[0.45, 0.97], [0.36, 1.12], [0.36, 1.62], [0.16, 1.78], [-0.16, 1.78], [-0.36, 1.62], [-0.36, 1.12], [-0.45, 0.97]]) P.push([x + fx * r, y + fy * r]);
  return P;
}

// ---------------------------------------------------------------------
//  the sheet: blue paper with a soft light pool, a fine grid and a coarse grid (in the world, so they move with
//  the camera), a border frame with zone ticks, registration crosses. o: { c paper colour, fine, coarse, frame }
// ---------------------------------------------------------------------
function bpSheet(o = {}) {
  ctx.save(); screen();
  ctx.fillStyle = o.c ?? BP.paper; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 80, W * 0.5, H * 0.4, H * 0.78);
  g.addColorStop(0, 'rgba(150,200,250,0.13)'); g.addColorStop(1, 'rgba(0,8,36,0.20)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  bpGrid(o.fine ?? 30, o.coarse ?? 150);
  if (o.frame !== false) bpFrame();
}
function bpGrid(fine = 30, coarse = 150) {
  const z = bpZoom(), x0 = -360, x1 = W + 360, y0 = -360, y1 = H + 360;
  ctx.save(); ctx.strokeStyle = BP.grid;
  for (const [step, a, w] of [[fine, 0.13, 1], [coarse, 0.3, 1.5]]) {
    ctx.globalAlpha = a; ctx.lineWidth = w / z; ctx.beginPath();
    for (let x = x0; x <= x1; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += step) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();
  }
  ctx.restore();
}
function bpFrame(m = 40) {
  bpLine(bpRectPts(m, m, W - 2 * m, H - 2 * m), BP.line, { closed: true, w: 3.5, a: 0.85 });
  const z = bpZoom(); ctx.save(); ctx.strokeStyle = BP.line; ctx.globalAlpha = 0.7; ctx.lineWidth = 2 / z; ctx.beginPath();
  for (let x = 150; x < W - m; x += 150) { ctx.moveTo(x, m); ctx.lineTo(x, m + 16); ctx.moveTo(x, H - m); ctx.lineTo(x, H - m - 16); }
  for (let y = 150; y < H - m; y += 150) { ctx.moveTo(m, y); ctx.lineTo(m + 16, y); ctx.moveTo(W - m, y); ctx.lineTo(W - m - 16, y); }
  ctx.stroke(); ctx.restore();
  for (const [x, y] of [[105, 150], [W - 105, 150], [105, H - 150], [W - 105, H - 150]]) bpCross(x, y, 20, BP.cyan, { a: 0.75 });
}
// a registration cross: a small ring and cross hairs. o: { a, w }
function bpCross(x, y, s = 18, c = BP.cyan, o = {}) {
  const z = bpZoom(); ctx.save(); ctx.strokeStyle = c; ctx.globalAlpha *= o.a ?? 0.85; ctx.lineWidth = (o.w ?? 2) / z;
  ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); ctx.restore();
}
// centre lines through (x, y): dash-dot, half-lengths rx (horizontal) and ry (vertical); 0 skips one. o: { frac, c, a, w }
function bpCentre(x, y, rx, ry, o = {}) {
  const f = EZ.o2(clamp(o.frac ?? 1)); if (f <= 0) return;
  const q = { dash: 'centre', w: o.w ?? 2, a: o.a ?? 0.8 }, c = o.c ?? BP.cyan;
  if (rx) bpLine([[x - rx * f, y], [x + rx * f, y]], c, q);
  if (ry) bpLine([[x, y - ry * f], [x, y + ry * f]], c, q);
}
// a filled slender arrowhead, tip at (x, y), pointing along ang; s = its length in screen px
function bpArrow(x, y, ang, s = 22, c = BP.line) {
  if (s <= 0.5) return;
  const z = bpZoom(), L = s / z, hw = L * 0.2, ca = Math.cos(ang), sa = Math.sin(ang);
  ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x - ca * L - sa * hw, y - sa * L + ca * hw); ctx.lineTo(x - ca * L + sa * hw, y - sa * L - ca * hw); ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  type: engineering capitals. BP_MONO for labels and measurements, BP_CAPS (a DIN-like face) for captions and titles.
//  bpText o: { align, base, frac (typed on, character by character), fam, weight, rot, a, raw (keep the case) }
// ---------------------------------------------------------------------
function bpFont(size, o = {}) { ctx.font = `${o.weight ?? 700} ${size}px ${o.fam ?? BP_MONO}`; }
function bpTextW(str, size, o = {}) { ctx.save(); bpFont(size, o); const w = ctx.measureText(bpUp(str, o)).width; ctx.restore(); return w; }
function bpText(str, x, y, size, c, o = {}) {
  const s = bpUp(str, o), frac = clamp(o.frac ?? 1); if (!s) return 0;
  ctx.save(); bpFont(size, o); ctx.fillStyle = c; ctx.textBaseline = o.base ?? 'alphabetic'; ctx.globalAlpha *= o.a ?? 1;
  const w = ctx.measureText(s).width, al = o.align ?? 'left', n = Math.ceil(s.length * frac);
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  ctx.textAlign = 'left';
  if (n > 0) ctx.fillText(s.slice(0, n), al === 'center' ? x - w / 2 : al === 'right' ? x - w : x, y);
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  dimension line: measures from (x1, y1) to (x2, y2). The line sits `off` px to the side (positive = to the right of
//  the direction of travel rotated +90: below a left-to-right span, left of a top-to-bottom span); extension lines
//  start `gap` px from the measured points. o: { off, gap, frac, c, size }
//  frac plays: extension lines, then the line growing out from the label, then arrowheads, the label typed.
// ---------------------------------------------------------------------
function bpDim(x1, y1, x2, y2, label, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const c = o.c ?? BP.line, size = o.size ?? 36, off = o.off ?? 60, gap = o.gap ?? 12, sg = Math.sign(off) || 1;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
  const a = [x1 + nx * off, y1 + ny * off], b = [x2 + nx * off, y2 + ny * off], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const fe = EZ.o2(seg(frac, 0, 0.35)), fl = EZ.io(seg(frac, 0.2, 0.75)), fa = EZ.back(seg(frac, 0.65, 0.9)), ft = seg(frac, 0.4, 1);
  for (const [px, py] of [[x1, y1], [x2, y2]]) bpLine([[px + nx * gap * sg, py + ny * gap * sg], [px + nx * (off + 16 * sg), py + ny * (off + 16 * sg)]], c, { w: BP_W.dim, frac: fe, a: 0.9 });
  const inner = Math.min(L / 2, label ? (bpTextW(label, size) + size * 0.7) / 2 : 0);
  if (fl > 0) for (const s of [-1, 1]) { const r1 = inner + (L / 2 - inner) * fl; if (r1 > inner + 0.5) bpLine([[m[0] + ux * s * inner, m[1] + uy * s * inner], [m[0] + ux * s * r1, m[1] + uy * s * r1]], c, { w: BP_W.dim }); }
  if (fa > 0) { bpArrow(a[0], a[1], Math.atan2(-uy, -ux), 24 * fa, c); bpArrow(b[0], b[1], Math.atan2(uy, ux), 24 * fa, c); }
  if (label && ft > 0) {
    let rot = Math.atan2(uy, ux); if (rot > Math.PI / 2 - 1e-6) rot -= Math.PI; else if (rot < -Math.PI / 2 - 1e-6) rot += Math.PI;
    bpText(label, m[0], m[1] + (rot ? 0 : size * 0.04), size, c, { align: 'center', base: 'middle', rot, frac: ft });
  }
}
// a callout: a leader from the target (tx, ty) to an elbow (lx, ly), then a shelf under the label.
// The label runs away from the target (o.side: 1 right, -1 left). o: { frac, c, size, arrow (an arrowhead instead of a dot), pen }
function bpCallout(tx, ty, lx, ly, label, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const c = o.c ?? BP.line, size = o.size ?? 34, w = bpTextW(label, size), dir = o.side ?? (lx >= tx ? 1 : -1), z = bpZoom();
  const fl = EZ.io(seg(frac, 0, 0.6)), ft = seg(frac, 0.4, 1), k = EZ.back(seg(frac, 0, 0.3));
  bpLine([[tx, ty], [lx, ly], [lx + dir * (w + 10), ly]], c, { w: BP_W.dim + 0.4, frac: fl, pen: o.pen ?? true });
  if (o.arrow) bpArrow(tx, ty, Math.atan2(ty - ly, tx - lx), 24 * k, c);
  else { ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(tx, ty, Math.max(0, 7.5 * k) / z, 0, TAU); ctx.fill(); ctx.restore(); }
  if (ft > 0) bpText(label, dir > 0 ? lx + 5 : lx - w - 5, ly - size * 0.34, size, c, { frac: ft });
}
// a scale bar: n alternating boxes over width w, a label at each end. o: { n, from, to, c, size }
function bpScale(x, y, w, o = {}) {
  const n = o.n ?? 4, c = o.c ?? BP.cyan, h = 12, size = o.size ?? 26;
  for (let i = 0; i < n; i += 2) bpFill(bpRectPts(x + w * i / n, y, w / n, h), c, 0.75);
  bpLine(bpRectPts(x, y, w, h), c, { closed: true, w: 2 });
  for (let i = 0; i <= n; i++) bpLine([[x + w * i / n, y - 8], [x + w * i / n, y]], c, { w: 2 });
  bpText(o.from ?? '0', x, y - 18, size, c, { align: 'center' });
  bpText(o.to ?? '100 MM', x + w, y - 18, size, c, { align: 'right' });
}
// the title block: a ruled box, the drawing number on the left, the title and a sub line on the right.
// (x, y) = its top-left. o: { no, title, sub, frac, w, h }
function bpTitleBlock(x, y, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const no = o.no ?? '01', title = o.title ?? '', sub = o.sub ?? '', h = o.h ?? 104, wl = 112, mid = h * 0.56;
  const w = o.w ?? wl + Math.max(bpTextW(title, 36, { fam: BP_CAPS }), bpTextW(sub, 26)) + 44;
  const fl = EZ.io(seg(frac, 0, 0.7)), ft = seg(frac, 0.35, 1);
  bpFill(bpRectPts(x, y, w, h), BP.paperD, 0.85 * seg(frac, 0.3, 0.7));
  bpLine(bpRectPts(x, y, w, h), BP.line, { closed: true, w: 3.5, frac: fl });
  bpLine([[x + wl, y], [x + wl, y + h]], BP.line, { w: 2.5, frac: fl });
  bpLine([[x + wl, y + mid], [x + w, y + mid]], BP.line, { w: 2.5, frac: fl });
  bpText('GBR.', x + wl / 2, y + 30, 24, BP.cyan, { align: 'center', frac: ft });
  bpText(no, x + wl / 2, y + h - 16, 46, BP.line, { align: 'center', frac: ft });
  bpText(title, x + wl + 20, y + mid - 15, 36, BP.line, { fam: BP_CAPS, frac: ft });
  bpText(sub, x + wl + 20, y + h - 14, 26, BP.cyan, { frac: ft });
}

// ---------------------------------------------------------------------
//  the hero: "Jangka", a little pair of drafting compasses. A round hinge for a head (two eyes that blink, a mouth,
//  a knurled grip on top), a needle leg and a pencil leg that breathe in and out, a thumbwheel bar between them.
//  (x, y) = its centre, r = half its height (knob to feet is about 2.2r). Its colour is pale cyan (the pencil lead
//  and the wash in its head). o: { key, look, lookY, mood: 'smile' | 'wow', squash, bob, spread, c }
// ---------------------------------------------------------------------
function bpHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', c = o.c ?? BP.cyan, ph = key.length * 0.7;
  y += (o.bob ?? Math.sin(TT * TAU * 0.8 + ph) * 0.03) * r;
  SPARK_AT = toScreen(x, y);
  const sq = 1 + (o.squash ?? 0);
  ctx.save(); ctx.translate(x, y + r); ctx.scale(1 / Math.sqrt(sq), sq); ctx.translate(-x, -(y + r));
  const sw = o.spread ?? 0.3 + 0.05 * Math.sin(TT * TAU * 0.8 + ph + 1.2);
  const hx = x, hy = y - r * 0.42, hr = r * 0.44, fy = y + r, dx = Math.tan(sw) * (fy - hy);
  const thin = { w: BP_W.thin };
  const legs = [-1, 1].map((s) => {
    const top = [hx + s * hr * 0.3, hy + hr * 0.4], foot = [hx + s * dx, fy], L = dist(top, foot), d = [(foot[0] - top[0]) / L, (foot[1] - top[1]) / L], p = [-d[1], d[0]];
    const at = (f, k) => [top[0] + d[0] * L * f + p[0] * r * k, top[1] + d[1] * L * f + p[1] * r * k];
    return { s, foot, at };
  });
  // the bar between the legs, with its thumbwheel
  const b0 = legs[0].at(0.52, 0), b1 = legs[1].at(0.52, 0), bm = [(b0[0] + b1[0]) / 2, b0[1]];
  bpLine([b0, b1], BP.line, thin);
  for (const { s, foot, at } of legs) {
    const body = [at(0, -0.075), at(0.8, -0.045), at(0.8, 0.045), at(0, 0.075)];
    ctx.save(); bpPath(body, true); ctx.fillStyle = BP.paperD; ctx.fill(); ctx.restore();
    bpLine(body, BP.line, { closed: true, w: BP_W.thin });
    if (s < 0) bpLine([at(0.8, 0), foot], BP.line, thin);   // the needle
    else { const tip = [at(0.8, -0.045), foot, at(0.8, 0.045)]; ctx.save(); bpPath(tip, true); ctx.fillStyle = c; ctx.fill(); ctx.restore(); bpLine(tip, BP.line, { closed: true, w: BP_W.thin }); }   // the pencil lead
  }
  ctx.save(); ctx.fillStyle = BP.paperD; ctx.beginPath(); ctx.arc(bm[0], bm[1], r * 0.06, 0, TAU); ctx.fill(); ctx.restore();
  bpLine(bpCirclePts(bm[0], bm[1], r * 0.06, 16), BP.line, { closed: true, w: BP_W.thin });
  // the grip on top
  bpLine([[hx, hy - hr], [hx, hy - hr - r * 0.14]], BP.line, thin);
  const grip = bpRectPts(hx - r * 0.09, hy - hr - r * 0.36, r * 0.18, r * 0.22);
  ctx.save(); bpPath(grip, true); ctx.fillStyle = BP.paperD; ctx.fill(); ctx.restore();
  bpLine(grip, BP.line, { closed: true, w: BP_W.thin });
  for (const f of [0.33, 0.66]) bpLine([[hx - r * 0.09, hy - hr - r * 0.36 + r * 0.22 * f], [hx + r * 0.09, hy - hr - r * 0.36 + r * 0.22 * f]], BP.line, { w: 2 });
  // the head (the hinge)
  const head = bpCirclePts(hx, hy, hr, 48);
  ctx.save(); bpPath(head, true); ctx.fillStyle = BP.paperD; ctx.fill(); ctx.restore();
  bpFill(head, c, 0.22);
  bpLine(head, BP.line, { closed: true, w: BP_W.obj });
  const lx = (o.look ?? 0) * hr * 0.2, ly = (o.lookY ?? 0) * hr * 0.14, blink = mod(TT + ph, 2.9) < 0.11;
  for (const s of [-1, 1]) {
    const ex = hx + s * hr * 0.36 + lx, ey = hy - hr * 0.1 + ly;
    if (blink) bpLine([[ex - hr * 0.15, ey], [ex + hr * 0.15, ey]], BP.line, { w: BP_W.part });
    else { ctx.save(); ctx.fillStyle = BP.line; ctx.beginPath(); ctx.arc(ex, ey, hr * 0.15, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  if (o.mood === 'wow') bpLine(bpCirclePts(hx + lx * 0.7, hy + hr * 0.45 + ly * 0.5, hr * 0.14, 16), BP.line, { closed: true, w: BP_W.thin });
  else bpLine(bpCirclePts(hx + lx * 0.7, hy + hr * 0.2 + ly * 0.5, hr * 0.32, 12, 28 * DEG, 152 * DEG), BP.line, { w: BP_W.thin });
  ctx.restore();
}
function bpHeroPts(x, y, r) {   // the bridge outline: the round head over the spread legs
  const P = bpCirclePts(x, y - r * 0.42, r * 0.46, 40, 165 * DEG, 375 * DEG);
  P.push([x + r * 0.5, y + r], [x - r * 0.5, y + r]); return P;
}

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size). The caption is a ruled note box, typed on like a
//  plotter; *a phrase* is set in amber and underlined. The tag is the title block. Both fade during the first 0.3s
//  of a bridge's shrink.
// ---------------------------------------------------------------------
function bpLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
function bpCaptionNow(str, o = {}) {
  const al = bpLeaving(); if (al <= 0.001) return;
  const size = o.size ?? 62, lh = size * 1.26, t0 = E0 + (o.at ?? 0.5), cps = o.cps ?? 30, yLast = o.y ?? 1450, cx = o.x ?? CX, hi = o.hi ?? BP.amber, fo = { fam: BP_CAPS, weight: 700 };
  const lines = str.split('\n').map((ln) => ln.split(/(\*[^*]+\*)/).filter(Boolean).map((g) => (g[0] === '*' ? { s: bpUp(g.slice(1, -1)), hi: true } : { s: bpUp(g), hi: false })));
  const widths = lines.map((segs) => segs.reduce((a, g) => a + bpTextW(g.s, size, fo), 0));
  const bw = Math.max(...widths) + 96, bx = cx - bw / 2, top = yLast - (lines.length - 1) * lh - size * 0.95 - 26, bot = yLast + 32;
  const fb = ev(t0 - 0.3, 0.3); if (fb <= 0) return;
  ctx.save(); ctx.globalAlpha = al;
  const box = bpRectPts(bx, top, bw, bot - top);
  bpFill(box, BP.paperD, 0.9 * fb);
  bpLine(box, BP.line, { closed: true, w: 3, frac: EZ.io(fb), pen: true });
  for (const [px, py, sx, sy] of [[bx, top, -1, -1], [bx + bw, top, 1, -1], [bx, bot, -1, 1], [bx + bw, bot, 1, 1]]) bpLine([[px + sx * 12, py], [px + sx * 28, py]], BP.cyan, { w: 2, a: fb }), bpLine([[px, py + sy * 12], [px, py + sy * 28]], BP.cyan, { w: 2, a: fb });
  bpText(o.note ?? 'CATATAN', bx + 2, top - 12, 24, BP.cyan, { frac: seg(fb, 0.4, 1) });
  let left = Math.floor(Math.max(0, TT - t0) * cps), cur = null, total = 0;
  lines.forEach((segs, li) => {
    let xx = cx - widths[li] / 2; const yy = yLast - (lines.length - 1 - li) * lh;
    for (const g of segs) {
      const n = Math.min(g.s.length, left); left -= n; total += g.s.length;
      const wFull = bpTextW(g.s, size, fo), wNow = n >= g.s.length ? wFull : bpTextW(g.s.slice(0, n), size, fo);
      if (n > 0) {
        bpText(g.s.slice(0, n), xx, yy, size, g.hi ? hi : BP.line, { ...fo, raw: true });
        if (g.hi) bpLine([[xx, yy + 12], [xx + wNow, yy + 12]], hi, { w: 4 });
        cur = [xx + wNow, yy];
      } else if (!cur && li === 0) cur = [xx, yy];
      xx += wFull;
    }
  });
  const done = (TT - t0) * cps >= total;
  if (cur && TT >= t0 && (!done || mod(TT, 0.5) < 0.25)) { ctx.fillStyle = BP.cyan; ctx.fillRect(cur[0] + 6, cur[1] - size * 0.72, size * 0.42, size * 0.76); }
  ctx.restore();
}
function bpTagNow(no, title, o = {}) {
  const al = bpLeaving(), frac = (o.at ?? 0.45) < 0 ? 1 : ev(E0 + (o.at ?? 0.45), 0.5); if (al <= 0.001 || frac <= 0) return;
  ctx.save(); ctx.globalAlpha = al; bpTitleBlock(o.x ?? 70, o.y ?? 262, { no, title, sub: o.sub ?? '', frac }); ctx.restore();
}
// bpTag('01', 'RODA GIGI', { sub: 'SKALA 1:2', at }) — at < 0 shows it complete from the era's first frame
const bpTag = (no, title, o = {}) => { const f = () => bpTagNow(no, title, o); if (DEFER) DEFER.push(f); else f(); };
// bpCaption('LINE ONE\nLINE *ACCENT*', { y, size, at, cps, hi, note })
const bpCaption = (str, o = {}) => { const f = () => bpCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  post: the paper. Static speckle, a few uneven cyanotype blotches and a vignette, rendered once (seeded) and reused.
// ---------------------------------------------------------------------
let BP_PAPER = null;
function bpPost() {
  if (!BP_PAPER || BP_PAPER.width !== W || BP_PAPER.height !== H) {
    BP_PAPER = document.createElement('canvas'); BP_PAPER.width = W; BP_PAPER.height = H;
    const g = BP_PAPER.getContext('2d'), R = RNG('bppaper');
    for (let i = 0; i < 9; i++) {
      const x = R.r(0, W), y = R.r(0, H), r = R.r(260, 620), gr = g.createRadialGradient(x, y, 0, x, y, r), light = i % 2;
      gr.addColorStop(0, light ? 'rgba(170,215,255,0.05)' : 'rgba(0,12,48,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.fillStyle = 'rgba(220,240,255,0.07)'; g.beginPath(); for (let i = 0; i < 2600; i++) g.rect(R.r(0, W), R.r(0, H), 2, 2); g.fill();
    g.fillStyle = 'rgba(0,10,40,0.10)'; g.beginPath(); for (let i = 0; i < 1800; i++) g.rect(R.r(0, W), R.r(0, H), 2, 2); g.fill();
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.74); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,8,34,0.42)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  ctx.save(); screen(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(BP_PAPER, 0, 0); ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'blueprint',
  paper: BP.paper,
  backdrop(c) { bpSheet({ c, frame: false }); },                       // blank gridded paper
  // the era seen through outline P: a heavy object line for the rim and a dashed hidden-line echo outside it
  window(P, key, src) {
    ctx.save(); bpPath(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const ce = bpCentroid(P);
    bpLine(P.map(([x, y]) => [ce[0] + (x - ce[0]) * 1.07, ce[1] + (y - ce[1]) * 1.07]), BP.cyan, { closed: true, w: 2.5, dash: 'hidden', a: 0.7 });
    bpLine(P, BP.line, { closed: true, w: 6 });
  },
  // the morphing shape: a part in section (hatched), on its centre lines, with a registration cross at its centre
  blob(P, c) {
    const ce = bpCentroid(P), bb = bbox(P);
    bpCentre(ce[0], ce[1], (bb.x1 - bb.x0) / 2 + 70, (bb.y1 - bb.y0) / 2 + 70, { a: 0.7 });
    bpFill(P, BP.paperD, 0.55); bpHatch(P, BP.cyan, { gap: 18, a: 0.4 });
    bpLine(P, c, { closed: true, w: 6 });
    bpCross(ce[0], ce[1], 16, BP.amber, { a: 1, w: 2.5 });
  },
  hero(x, y, r, o = {}) { bpHero(x, y, r * 0.9, { key: o.key, mood: o.mood }); },
  heroColor: BP.cyan,
  heroPts(x, y, r) { return bpHeroPts(x, y, r * 0.9); },
  post() { bpPost(); },
  ones: true,
};
