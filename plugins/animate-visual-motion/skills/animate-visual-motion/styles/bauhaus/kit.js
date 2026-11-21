// =====================================================================
//  styles/bauhaus/kit.js — BAUHAUS: a 1920s modernist poster printed on warm off-white paper. Pictures are built
//  ONLY from primitive geometry — circles, semicircles, quarter circles, squares, triangles, bars, concentric rings,
//  stripes and dot grids — placed on a visible modular grid (80 px modules, snapping to half modules, the 45° diagonal
//  as the favourite axis). Flat ink in a strict palette: red, yellow, blue, black, off-white, one grey. No outlines,
//  no gradients, no shadows, no rounded cards; where two shapes overlap the overlap is printed as a third flat colour.
//  The print shows: faint paper grain over everything and a slight unevenness inside every flat of ink.
//  Motion on 1s, mechanical: shapes slide along the grid and stop dead (or with ONE small overshoot), circles roll,
//  quarter circles turn 90° about their corner, bars extend like rulers, rings expand, stripes wipe.
//  Built on kit/core.js. Helpers are prefixed bau…; the palette is BAU. Needs from the piece head: W, H, FPS.
// =====================================================================
const BAU = {
  paper: '#efe6d2',     // warm off-white stock: the ground of every frame and of the morph
  red: '#d42b1e',       // RESERVED for the hero
  yellow: '#f3b61f',    // light, energy, the thing the story follows; the caption's highlight block
  blue: '#1f4fa3',      // weight, structure, the calm second colour; the other highlight block
  black: '#191715',     // bars, rules, type, the heaviest masses, the overlap colour
  grey: '#aaa598',      // the one grey: the grid, quiet background masses
};
const BAU_FONT = '"Futura", "Century Gothic", "Avenir Next", "Jost", "Poppins", "Trebuchet MS", Arial, sans-serif';

// ---------------------------------------------------------------------
//  the grid: 80 px modules from (60, 220): 11 columns across the phone-safe width, 16 rows down to y = 1500.
//  bauGX(i) / bauGY(j) = a grid line; bauSX / bauSY snap a pixel value to the nearest half module.
// ---------------------------------------------------------------------
const BAU_G = { x: 60, y: 220, u: 80 };
const bauGX = (i) => BAU_G.x + i * BAU_G.u, bauGY = (j) => BAU_G.y + j * BAU_G.u;
const bauSX = (x, d = BAU_G.u / 2) => BAU_G.x + Math.round((x - BAU_G.x) / d) * d;
const bauSY = (y, d = BAU_G.u / 2) => BAU_G.y + Math.round((y - BAU_G.y) / d) * d;

// ---------------------------------------------------------------------
//  mechanical timing
//   bauIn(t0, d)        linear 0..1 progress of a move that starts at t0 and takes d seconds: pass it as a helper's `in`
//   bauGo(u, over)      the move itself: it accelerates and stops dead at full speed; with `over` (0.02–0.08) it reaches
//                       the mark at 80%, runs past by that fraction ONCE and comes back
//   bauTick(t0, every, d)  a step counter: +1 every `every` seconds, each step a quick move of d seconds (ratchets)
// ---------------------------------------------------------------------
const bauIn = (t0, d = 0.25) => clamp((TT - t0) / d);
function bauGo(u, over = 0) {
  u = clamp(u);
  if (!over) return u * (0.55 + 0.45 * u);
  if (u < 0.8) { const v = u / 0.8; return v * (0.55 + 0.45 * v); }
  return 1 + over * Math.sin(Math.PI * (u - 0.8) / 0.2);
}
function bauTick(t0, every = 0.5, d = 0.12) { if (TT < t0) return 0; const s = (TT - t0) / every, n = Math.floor(s + 1e-6); return n + bauGo(clamp((s - n) * every / d)); }
// how a primitive arrives. o.in 0..1 (default 1 = at rest), o.from 'l' | 'r' | 't' | 'b' (slide o.dist px along the
// grid), 'grow' (scale up from nothing) or 'turn' (a quarter turn, o.turn = -1 for the other way), o.over (overshoot)
function bauEnter(o, dflt) {
  const u = o.in ?? 1; if (u <= 0) return null;
  const k = bauGo(u, o.over ?? 0), from = o.from ?? dflt, d = (o.dist ?? 480) * (1 - k);
  return { k, from, dx: from === 'l' ? -d : from === 'r' ? d : 0, dy: from === 't' ? -d : from === 'b' ? d : 0, s: from === 'grow' ? Math.max(0, k) : 1, rot: from === 'turn' ? (k - 1) * Math.PI / 2 * (o.turn ?? 1) : 0 };
}

// ---------------------------------------------------------------------
//  ink and paper
// ---------------------------------------------------------------------
let BAU_MOT = null, BAU_GRAIN = null;
// the unevenness inside a flat of ink: paper showing through in tiny flecks and a few soft thin patches (one seeded tile)
function bauMottle() {
  if (BAU_MOT) return BAU_MOT;
  const T = 256, c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d'), R = RNG('baumottle');
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(239,230,210,${R.r(0.012, 0.03).toFixed(3)})`; const x = R.r(0, T), y = R.r(0, T), r = R.r(14, 44); for (const [ox, oy] of [[0, 0], [T, 0], [-T, 0], [0, T], [0, -T]]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, TAU); g.fill(); } }
  for (let i = 0; i < 900; i++) { g.fillStyle = R.f() < 0.8 ? `rgba(239,230,210,${R.r(0.1, 0.34).toFixed(3)})` : 'rgba(25,23,21,0.16)'; const s = R.r(0.8, 2.4); g.fillRect(R.r(0, T), R.r(0, T), s, s * R.r(0.6, 1.5)); }
  return (BAU_MOT = g.createPattern(c, 'repeat'));
}
// fill the current path with flat ink c (hex or rgb()). o.flat = no mottle (tiny parts), o.rule = 'evenodd'
function bauInk(c, o = {}) {
  ctx.fillStyle = c; if (o.rule) ctx.fill(o.rule); else ctx.fill();
  if (o.flat || c === BAU.paper) return;
  ctx.save(); ctx.globalAlpha *= 0.6; ctx.fillStyle = bauMottle(); if (o.rule) ctx.fill(o.rule); else ctx.fill(); ctx.restore();
}
// the paper's grain over the whole printed sheet (static, screen space, made once)
function bauGrain() {
  if (BAU_GRAIN) return BAU_GRAIN;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = RNG('baugrain'), n = Math.round(W * H / 620);
  g.fillStyle = 'rgba(70,52,30,0.10)'; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, W), R.r(0, H), 1.7, 1.7); g.fill();
  g.fillStyle = 'rgba(255,251,238,0.20)'; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, W), R.r(0, H), 1.9, 1.9); g.fill();
  g.strokeStyle = 'rgba(80,60,36,0.07)'; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i < 140; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(6, 24); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
  g.stroke();
  return (BAU_GRAIN = c);
}

// ---------------------------------------------------------------------
//  paths and outlines (straight polygons: corners stay sharp)
// ---------------------------------------------------------------------
function bauPoly(P) { ctx.beginPath(); for (let i = 0; i < P.length; i++) { if (i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[0][0], P[0][1]); } ctx.closePath(); }
// add a bar from (x1, y1) to (x2, y2), w thick, to the current path (call ctx.beginPath() first)
function bauSeg(x1, y1, x2, y2, w) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L * w / 2, ny = (x2 - x1) / L * w / 2;
  ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.lineTo(x1 - nx, y1 - ny); ctx.closePath();
}
const bauCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// outlines for bridges (and for bauOverlap): a circle, a w x h box turned by rot about its centre, a triangle
const bauCirclePts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
function bauSquarePts(x, y, w, h = w, rot = 0) { return xform([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], x + w / 2, y + h / 2, rot); }
// a triangle in the box (x, y, w, h). dir 'u' | 'd' | 'l' | 'r' = isosceles, apex that way; 'nw' | 'ne' | 'se' | 'sw' =
// right-angled (half a square), the right angle in that corner. rot turns it about the box centre.
function bauTriPts(x, y, w, h, dir = 'u', rot = 0) {
  const a = -w / 2, b = w / 2, c = -h / 2, d = h / 2;
  const P = { u: [[a, d], [b, d], [0, c]], d: [[a, c], [b, c], [0, d]], l: [[b, c], [b, d], [a, 0]], r: [[a, c], [a, d], [b, 0]], nw: [[a, c], [b, c], [a, d]], ne: [[a, c], [b, c], [b, d]], se: [[b, c], [b, d], [a, d]], sw: [[a, c], [b, d], [a, d]] }[dir];
  return xform(P, x + w / 2, y + h / 2, rot);
}
// build the path of a shape spec: { k: 'c', x, y, r } | { k: 'r', x, y, w, h } | { k: 'a', x, y, r, a0, span, r0 } (degrees) | { k: 'p', P }
function bauShape(s) {
  if (s.k === 'p') return bauPoly(s.P);
  ctx.beginPath();
  if (s.k === 'c') ctx.arc(s.x, s.y, s.r, 0, TAU);
  else if (s.k === 'r') ctx.rect(s.x, s.y, s.w, s.h);
  else if (s.k === 'a') {
    const a0 = s.a0 * DEG, a1 = (s.a0 + s.span) * DEG;
    if (s.r0) { ctx.arc(s.x, s.y, s.r, a0, a1); ctx.arc(s.x, s.y, s.r0, a1, a0, true); } else { ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, s.r, a0, a1); }
    ctx.closePath();
  }
}
// print the part where shapes a and b overlap in a third flat colour (never transparency): call it after drawing both
function bauOverlap(a, b, c = BAU.black) { ctx.save(); bauShape(a); ctx.clip(); bauShape(b); bauInk(c); ctx.restore(); }

// ---------------------------------------------------------------------
//  the construction set. Every piece takes pixel coordinates, snaps its resting place to the half-module grid
//  (o.snap: false for things in motion) and arrives mechanically with o.in (see bauEnter). Nothing fades.
// ---------------------------------------------------------------------
// the visible grid: thin grey module lines, columns c0..c1 and rows r0..r1 (default: the safe area above the caption).
//   o: c, al, w, in (the lines rule themselves in), diag (also the 45° diagonals through every third module)
function bauGrid(o = {}) {
  const k = bauGo(o.in ?? 1); if (k <= 0) return;
  const c0 = o.c0 ?? 0, c1 = o.c1 ?? 11, r0 = o.r0 ?? 0, r1 = o.r1 ?? 13, z = Math.abs(ctx.getTransform().a) || 1;
  const xa = bauGX(c0), xb = bauGX(c1), ya = bauGY(r0), yb = bauGY(r1);
  ctx.save(); ctx.strokeStyle = o.c ?? BAU.grey; ctx.globalAlpha = o.al ?? 0.42; ctx.lineWidth = (o.w ?? 1.6) / z; ctx.lineCap = 'butt'; ctx.beginPath();
  for (let i = c0; i <= c1; i++) { ctx.moveTo(bauGX(i), ya); ctx.lineTo(bauGX(i), lerp(ya, yb, k)); }
  for (let j = r0; j <= r1; j++) { ctx.moveTo(xa, bauGY(j)); ctx.lineTo(lerp(xa, xb, k), bauGY(j)); }
  if (o.diag) for (let i = c0 - (r1 - r0); i < c1; i += 3) { const x0 = Math.max(i, c0), x1 = Math.min(i + (r1 - r0), c1); if (x1 > x0) { ctx.moveTo(bauGX(x0), bauGY(r1 - (x0 - i))); ctx.lineTo(bauGX(x1), bauGY(r1 - (x1 - i))); } }
  ctx.stroke(); ctx.restore();
}
// a disc, centre (x, y). o: in / from / dist / over, snap, roll (it turns as it slides in from the side),
//   rot (extra turn, radians), mark (a colour: a small dot near the rim that shows the rolling)
function bauCircle(x, y, r, c, o = {}) {
  const e = bauEnter(o, 'l'); if (!e) return;
  if (o.snap !== false) { x = bauSX(x); y = bauSY(y); }
  const rr = r * e.s; if (rr <= 0.5) return;
  ctx.beginPath(); ctx.arc(x + e.dx, y + e.dy, rr, 0, TAU); bauInk(c);
  if (o.mark) { const a = (o.rot ?? 0) + (o.roll ? e.dx / r : 0) - Math.PI / 2; ctx.beginPath(); ctx.arc(x + e.dx + Math.cos(a) * rr * 0.62, y + e.dy + Math.sin(a) * rr * 0.62, rr * 0.16, 0, TAU); bauInk(o.mark, { flat: true }); }
}
// a pie: a quarter (span 90) or a semicircle (span 180) of radius r about the corner / centre (x, y), from angle a0
//   (degrees, 0 = right, 90 = down). o.r0 = inner radius (an arc band). It arrives with a quarter turn about (x, y).
function bauArc(x, y, r, a0, span, c, o = {}) {
  const e = bauEnter(o, 'turn'); if (!e) return;
  if (o.snap !== false) { x = bauSX(x); y = bauSY(y); }
  bauShape({ k: 'a', x: x + e.dx, y: y + e.dy, r: r * e.s, r0: (o.r0 ?? 0) * e.s, a0: a0 + e.rot / DEG, span }); bauInk(c);
}
// a square or rectangle, top-left (x, y). from 'grow' extends it from the edge o.anchor ('b' default, 't', 'l', 'r')
function bauSquare(x, y, w, h, c, o = {}) {
  const e = bauEnter(o, 'l'); if (!e) return;
  if (o.snap !== false) { x = bauSX(x); y = bauSY(y); }
  let ww = w, hh = h; x += e.dx; y += e.dy;
  if (e.from === 'grow') { const an = o.anchor ?? 'b'; if (an === 'b' || an === 't') { hh = h * e.s; if (an === 'b') y += h - hh; } else { ww = w * e.s; if (an === 'r') x += w - ww; } }
  if (ww <= 0.5 || hh <= 0.5) return;
  ctx.beginPath(); ctx.rect(x, y, ww, hh); bauInk(c);
}
// a triangle in the box (x, y, w, h): see bauTriPts for dir. o.rot turns it about the box centre; 'grow' rises from the base
function bauTri(x, y, w, h, dir, c, o = {}) {
  const e = bauEnter(o, 't'); if (!e) return;
  if (o.snap !== false) { x = bauSX(x); y = bauSY(y); }
  let P = bauTriPts(x + e.dx, y + e.dy, w, h, dir, (o.rot ?? 0) + e.rot);
  if (e.from === 'grow') { const bx = x + w / 2, by = y + h; P = P.map(([px, py]) => [bx + (px - bx) * e.s, by + (py - by) * e.s]); }
  bauPoly(P); bauInk(c);
}
// a thick rule from (x1, y1) extending to (x2, y2) like a ruler being pushed out. o: in, over, snap,
//   ticks: { step (40), len (16), w, side (1 | -1), major (every 4th is longer) } = ruler marks that appear as it passes
function bauBar(x1, y1, x2, y2, w, c, o = {}) {
  const k = bauGo(o.in ?? 1, o.over ?? 0); if (k <= 0) return;
  if (o.snap !== false) { x1 = bauSX(x1); y1 = bauSY(y1); x2 = bauSX(x2); y2 = bauSY(y2); }
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  ctx.beginPath(); bauSeg(x1, y1, x1 + ux * L * k, y1 + uy * L * k, w);
  if (o.ticks) {
    const t = o.ticks, step = t.step ?? 40, len = t.len ?? 16, side = t.side ?? 1, nx = -uy * side, ny = ux * side, tw = t.w ?? Math.max(3, w * 0.4);
    for (let i = 0; i * step <= L * k + 0.5; i++) { const l = w / 2 + len * (i % (t.major ?? 4) === 0 ? 1.8 : 1), px = x1 + ux * i * step, py = y1 + uy * i * step; bauSeg(px, py, px + nx * l, py + ny * l, tw); }
  }
  bauInk(c);
}
// n concentric rings of total radius r, colours cols[] from the outside in. They expand from the centre (o.in, o.over).
function bauRings(x, y, r, n, cols, o = {}) {
  const u = o.in ?? 1; if (u <= 0) return;
  if (o.snap !== false) { x = bauSX(x); y = bauSY(y); }
  const R = r * bauGo(u, o.over ?? 0);
  for (let i = 0; i < n; i++) { const ri = Math.min(R, r * (n - i) / n); if (ri <= 0.5) continue; ctx.beginPath(); ctx.arc(x, y, ri, 0, TAU); bauInk(cols[i % cols.length], { flat: i > 0 && ri < 24 }); }
}
// a field of n stripes in the box (x, y, w, h). o.dir 'h' (horizontal stripes) | 'v' | 'd' (45° diagonal);
//   o.scroll = px the stripes have travelled (idle life); it wipes in from o.from ('l' default, 'r', 't', 'b') with o.in
function bauStripes(x, y, w, h, n, c, o = {}) {
  const k = bauGo(o.in ?? 1); if (k <= 0) return;
  if (o.snap !== false) { x = bauSX(x); y = bauSY(y); }
  const dir = o.dir ?? 'h', from = o.from ?? 'l', p = (dir === 'h' ? h : w) / n, off = mod(o.scroll ?? 0, p);
  ctx.save(); ctx.beginPath();
  if (from === 'l') ctx.rect(x, y, w * k, h); else if (from === 'r') ctx.rect(x + w * (1 - k), y, w * k, h); else if (from === 't') ctx.rect(x, y, w, h * k); else ctx.rect(x, y + h * (1 - k), w, h * k);
  ctx.clip(); ctx.beginPath();
  if (dir === 'h') for (let s = off - p; s < h; s += p) ctx.rect(x, y + s, w, p / 2);
  else if (dir === 'v') for (let s = off - p; s < w; s += p) ctx.rect(x + s, y, p / 2, h);
  else for (let s = off - p - h; s < w; s += p) { ctx.moveTo(x + s, y + h); ctx.lineTo(x + s + p / 2, y + h); ctx.lineTo(x + s + p / 2 + h, y); ctx.lineTo(x + s + h, y); ctx.closePath(); }
  bauInk(c); ctx.restore();
}
// a grid of cols x rows dots, the first centred on (x, y), `gap` apart, radius r. They are set one by one with o.in.
//   o.cf(i, j, idx) = that dot's colour (null skips it); o.sq = small squares instead of dots
function bauDots(x, y, cols, rows, gap, r, c, o = {}) {
  if (o.snap !== false) { x = bauSX(x); y = bauSY(y); }
  const N = cols * rows, n = Math.round(clamp(o.in ?? 1) * N);
  for (let idx = 0; idx < n; idx++) {
    const i = idx % cols, j = Math.floor(idx / cols), cc = o.cf ? o.cf(i, j, idx) : c; if (!cc) continue;
    ctx.beginPath(); if (o.sq) ctx.rect(x + i * gap - r, y + j * gap - r, r * 2, r * 2); else ctx.arc(x + i * gap, y + j * gap, r, 0, TAU);
    bauInk(cc, { flat: true });
  }
}

// ---------------------------------------------------------------------
//  ready objects, composed from the set. Things abstract into primitives: a sun is a disc with ray bars, a house a
//  square and a triangle, a tree a disc on a bar, a wheel rings and spokes, a bird a semicircle and triangles.
// ---------------------------------------------------------------------
// the sun: a yellow disc and `rays` short black bars around it. o: in (the rays push out), rot (radians: ratchet it
//   with bauTick), rays (8), c, ray (colour), disc (false = rays only, when the disc is drawn elsewhere)
function bauSun(x, y, r, o = {}) {
  const k = bauGo(o.in ?? 1), n = o.rays ?? 8, rot = o.rot ?? 0;
  if (o.disc !== false) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); bauInk(o.c ?? BAU.yellow); }
  if (k <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + i / n * TAU, ca = Math.cos(a), sa = Math.sin(a), r0 = r * 1.18, r1 = r * (1.18 + 0.22 * k); bauSeg(x + ca * r0, y + sa * r0, x + ca * r1, y + sa * r1, r * 0.1); }
  bauInk(o.ray ?? BAU.black);
}
// a house standing on `base`, left edge x, w wide: a square, a triangle roof that drops on, a door bar, a window.
//   o: in (0..0.6 the square rises, 0.5..1 the roof lands), c (grey), roof (black), door (yellow)
function bauHouse(x, base, w, o = {}) {
  const u = o.in ?? 1; if (u <= 0) return;
  const k1 = bauGo(u / 0.6), k2 = bauGo((u - 0.5) / 0.5), hh = w * k1, rh = o.rh ?? w * 0.6;
  ctx.beginPath(); ctx.rect(x, base - hh, w, hh); bauInk(o.c ?? BAU.grey);
  if (k1 >= 1) {
    ctx.beginPath(); ctx.rect(x + w * 0.58, base - w * 0.52, w * 0.24, w * 0.52); bauInk(o.door ?? BAU.yellow, { flat: true });
    ctx.beginPath(); ctx.rect(x + w * 0.16, base - w * 0.74, w * 0.26, w * 0.26); bauInk(BAU.paper);
  }
  if (k2 > 0) { bauPoly(bauTriPts(x, base - w - rh - 260 * (1 - k2), w, rh, 'u')); bauInk(o.roof ?? BAU.black); }
}
// a tree: a black bar pushed up h from `base` at x, then a disc of radius r set on its end. o: in, c (blue), trunk
function bauTree(x, base, h, r, o = {}) {
  const u = o.in ?? 1; if (u <= 0) return;
  const k1 = bauGo(u / 0.6), k2 = bauGo((u - 0.5) / 0.5, 0.08);
  ctx.beginPath(); bauSeg(x, base, x, base - h * k1, o.w ?? r * 0.24); bauInk(o.trunk ?? BAU.black);
  if (k2 > 0) { ctx.beginPath(); ctx.arc(x, base - h, r * k2, 0, TAU); bauInk(o.c ?? BAU.blue); }
}
// a tower block: a bar w wide pushed up h from `base`, left edge x. o: in, top ('tri' | 'arc' | 'arcl' | 'semi' |
//   'step': a roof primitive that rides up on it), topC, win: { cols, rows, c, lit (how many are lit), litC, m (margin) }
function bauTower(x, base, w, h, c, o = {}) {
  const u = o.in ?? 1; if (u <= 0) return;
  const hh = h * bauGo(u), top = base - hh, tc = o.topC ?? c;
  ctx.beginPath(); ctx.rect(x, top, w, hh); bauInk(c);
  if (o.top === 'tri') { bauPoly(bauTriPts(x, top - w * 0.6, w, w * 0.6, 'u')); bauInk(tc); }
  else if (o.top === 'arc') { bauShape({ k: 'a', x, y: top, r: w, a0: -90, span: 90 }); bauInk(tc); }
  else if (o.top === 'arcl') { bauShape({ k: 'a', x: x + w, y: top, r: w, a0: 180, span: 90 }); bauInk(tc); }
  else if (o.top === 'semi') { bauShape({ k: 'a', x: x + w / 2, y: top, r: w / 2, a0: 180, span: 180 }); bauInk(tc); }
  else if (o.top === 'step') { ctx.beginPath(); ctx.rect(x + w * 0.25, top - w * 0.5, w * 0.5, w * 0.5); ctx.rect(x + w * 0.375, top - w * 0.75, w * 0.25, w * 0.25); bauInk(tc); }
  const wn = o.win; if (!wn) return;
  const m = wn.m ?? w * 0.18, s = (w - m * (wn.cols + 1)) / wn.cols, lit = wn.lit ?? 0;
  ctx.save(); ctx.beginPath(); ctx.rect(x, top, w, hh); ctx.clip();
  for (let j = 0, idx = 0; j < wn.rows; j++) for (let i = 0; i < wn.cols; i++, idx++) { ctx.beginPath(); ctx.rect(x + m + i * (s + m), base - h + m + j * (s + m), s, s); bauInk(idx < lit ? (wn.litC ?? BAU.yellow) : (wn.c ?? BAU.paper), { flat: true }); }
  ctx.restore();
}
// a wheel: a black rim, spokes that turn with rot (radians), a hub. o: in / over (it expands from the hub), c, spokes (4),
//   hub (yellow), cabins (n dots riding the rim, like a big wheel at a fair), cabinC (blue)
function bauWheel(x, y, r, rot = 0, o = {}) {
  const u = o.in ?? 1; if (u <= 0) return;
  const R = r * bauGo(u, o.over ?? 0), c = o.c ?? BAU.black, n = o.spokes ?? 4;
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.arc(x, y, R * 0.8, 0, TAU, true); bauInk(c);
  ctx.beginPath(); ctx.arc(x, y, R * 0.8, 0, TAU); bauInk(o.inner ?? BAU.paper);
  ctx.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI, ca = Math.cos(a) * R * 0.85, sa = Math.sin(a) * R * 0.85; bauSeg(x - ca, y - sa, x + ca, y + sa, Math.max(3, R * 0.08)); } bauInk(c, { flat: true });
  for (let i = 0; i < (o.cabins ?? 0); i++) { const a = rot + i / o.cabins * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9, R * 0.17, 0, TAU); bauInk(o.cabinC ?? BAU.blue, { flat: true }); }
  ctx.beginPath(); ctx.arc(x, y, R * 0.24, 0, TAU); bauInk(o.hub ?? BAU.yellow, { flat: true });
}
// a bird in flight, (x, y) = the middle of its back, s = scale (1 = 150 px long). A semicircle body, a triangle beak,
//   a triangle tail, a quarter-circle wing that flips up / down. o: face (1 | -1), flap (0 up, 1 down), c, wing, beak, tail
function bauBird(x, y, s = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale((o.face ?? 1) * s, s);
  bauPoly([[-30, 0], [-84, 0], [-84, 32]]); bauInk(o.tail ?? BAU.grey);
  bauPoly([[38, 2], [70, 13], [38, 24]]); bauInk(o.beak ?? BAU.yellow, { flat: true });
  bauShape({ k: 'a', x: 0, y: 0, r: 42, a0: 0, span: 180 }); bauInk(o.c ?? BAU.black);
  bauShape({ k: 'a', x: -2, y: 0, r: 46, a0: o.flap ? 90 : 180, span: 90 }); bauInk(o.wing ?? BAU.blue);
  ctx.beginPath(); ctx.arc(22, 13, 5.5, 0, TAU); bauInk(BAU.paper);
  ctx.restore();
}
// a pendulum: a square pivot at (x, y), a rod `len` long at `ang` (radians from straight down), a disc bob. o: c, r, w
function bauPendulum(x, y, len, ang, o = {}) {
  const bx = x + Math.sin(ang) * len, by = y + Math.cos(ang) * len;
  ctx.beginPath(); bauSeg(x, y, bx, by, o.w ?? 8); ctx.rect(x - 16, y - 16, 32, 32); bauInk(o.rod ?? BAU.black, { flat: true });
  ctx.beginPath(); ctx.arc(bx, by, o.r ?? 30, 0, TAU); bauInk(o.c ?? BAU.blue);
}
// an orbit: a thin grey ring of radius r, a black centre dot and one dot going round at `ang` (radians). o: c, ring, w, dot
function bauOrbit(x, y, r, ang, o = {}) {
  const w = o.w ?? 6;
  ctx.beginPath(); ctx.arc(x, y, r + w / 2, 0, TAU); ctx.arc(x, y, r - w / 2, 0, TAU, true); bauInk(o.ring ?? BAU.grey, { flat: true });
  ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); bauInk(BAU.black, { flat: true });
  ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, o.dot ?? r * 0.24, 0, TAU); bauInk(o.c ?? BAU.blue, { flat: true });
}

// ---------------------------------------------------------------------
//  the hero: BOLA, a red disc with one eye (a paper disc and a black pupil), a black triangle nose and a flat yellow
//  bar for a cap: three primitives. It ROLLS: o.rot turns the whole figure, so the nose and cap go round with it.
//   (x, y) = the centre, r = the disc's radius (the nose reaches 1.42 r). o: rot (radians), face (1 right | -1 left),
//   look [x, y] (-1..1: where the pupil sits), mood 'smile' | 'wow' | 'blink', key, c, cap (false = no cap)
// ---------------------------------------------------------------------
const bauHeroPts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
function bauHero(x, y, r, o = {}) {
  const key = o.key ?? 'bola', look = o.look ?? [0.6, 0], mood = o.mood ?? 'smile';
  const blink = mood === 'blink' || (mood !== 'wow' && mod(F + hash('baublink', key) % 40, 62) < 3);
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(o.face ?? 1, 1);
  bauPoly([[r * 0.8, -r * 0.3], [r * 1.42, 0], [r * 0.8, r * 0.3]]); bauInk(BAU.black, { flat: true });
  if (o.cap !== false) { ctx.beginPath(); ctx.rect(-r * 0.62, -r * 1.14, r * 1.24, r * 0.2); bauInk(BAU.yellow, { flat: true }); }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); bauInk(o.c ?? BAU.red);
  const ex = r * 0.28, ey = -r * 0.26, er = r * (mood === 'wow' ? 0.36 : 0.3);
  if (blink) { ctx.beginPath(); ctx.rect(ex - er, ey - r * 0.06, er * 2, r * 0.12); bauInk(BAU.black, { flat: true }); }
  else {
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); bauInk(BAU.paper);
    ctx.beginPath(); ctx.arc(ex + look[0] * er * 0.42, ey + look[1] * er * 0.42, r * (mood === 'wow' ? 0.11 : 0.14), 0, TAU); bauInk(BAU.black, { flat: true });
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  type: a geometric sans, bold, lowercase preferred, set tight. o: align, rot (degrees: -90 reads up the edge),
//  reveal (0..1: wiped on along the reading direction), weight (700), track (em, -0.02)
// ---------------------------------------------------------------------
function bauFont(size, weight = 700, track = -0.02) { ctx.font = `${weight} ${size}px ${BAU_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${(size * track).toFixed(2)}px`; }
function bauTextW(str, size, weight = 700, track = -0.02) { ctx.save(); bauFont(size, weight, track); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function bauText(str, x, y, size, c, o = {}) {
  ctx.save(); bauFont(size, o.weight, o.track); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(str).width, ax = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0, rv = o.reveal ?? 1;
  if (rv > 0) {
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot * DEG);
    if (rv < 1) { ctx.beginPath(); ctx.rect(ax - size * 0.1, -size * 1.1, (w + size * 0.2) * rv, size * 1.5); ctx.clip(); }
    ctx.fillStyle = c; ctx.fillText(str, ax, 0);
  }
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  tag and caption (through DEFER: after the camera, at screen size).
//  The TAG runs up the left edge: a colour block, a thin black rule and the word turned 90°.
//  The CAPTION is black type on the paper under a thick black rule that extends like a ruler; one *word* stands on a
//  yellow or blue block. A paper band is printed behind it first, so nothing can show through. Both are wiped away
//  as a bridge starts and set again when the next era is open.
// ---------------------------------------------------------------------
function bauBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.2);
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
//   o: x (60), y (260: the block's top), size (64), block (72), c (the block: yellow), at (seconds after the era starts, 0.25)
function bauTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.25), k = bauBridgeK(); if (k <= 0 || TT < at) return;
  const x = o.x ?? 60, y = o.y ?? 260, size = o.size ?? 64, s = o.block ?? 72, c = o.c ?? BAU.yellow;
  const a = bauGo(bauIn(at, 0.2)), b = bauGo(bauIn(at + 0.15, 0.3)), tw = bauTextW(str, size), yb = y + s + 18 + tw;
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(x - 8, y - 8, s + 48, (yb - y + 16) * k); ctx.clip(); }   // leaving: wiped off upward
  ctx.beginPath(); ctx.rect(x - (1 - a) * (x + s), y, s, s); bauInk(c);
  if (b > 0) {
    ctx.beginPath(); bauSeg(x + 5, yb, x + 5, yb - tw * b, 10); bauInk(BAU.black, { flat: true });
    bauText(str, x + 24 + size * 0.72, yb, size, o.col ?? BAU.black, { rot: -90, reveal: b });
  }
  ctx.restore();
}
//   o: x (60: the left edge), y (1420: the baseline), w (880: the rule's length and the widest the line may be),
//      size (68), hi (the block: yellow; blue gets paper-coloured type), at (0.5), band (false = no paper band)
function bauCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = bauBridgeK(); if (k <= 0 || TT < at) return;
  const x = o.x ?? 60, y = o.y ?? 1420, w = o.w ?? 880, hi = o.hi ?? BAU.yellow;
  let size = o.size ?? 68;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { const pad = size * 0.2; let tw = 0; toks.forEach((t, i) => { t.w = bauTextW(t.s, size); t.gap = i === 0 ? (t.hi ? pad : 0) : (/^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.28) + (t.hi || toks[i - 1].hi ? pad : 0); tw += t.w + t.gap; }); return tw + (toks[toks.length - 1].hi ? pad : 0); };
  let tw = lay(); if (tw > w) { size *= w / tw; tw = lay(); }
  const pad = size * 0.2, yr = y - size * 1.32;
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(x - 24, yr - 24, (w + 48) * k, size * 1.82 + 24); ctx.clip(); }   // leaving: wiped off to the left in one piece
  if (o.band !== false) { ctx.fillStyle = BAU.paper; ctx.fillRect(x - 24, yr - 24, w + 48, size * 1.82 + 24); }
  ctx.beginPath(); bauSeg(x, yr, x + w * bauGo(bauIn(at, 0.3)), yr, 14); bauInk(BAU.black);
  let xx = x;
  toks.forEach((t, i) => {
    xx += t.gap;
    const t0 = at + 0.2 + i * 0.125, rev = bauGo(bauIn(t0 + 0.06, 0.16));
    if (t.hi) { const g = bauGo(bauIn(t0, 0.12)); if (g > 0) { ctx.beginPath(); ctx.rect(xx - pad, y - size * 0.96, (t.w + 2 * pad) * g, size * 1.26); bauInk(hi); } }
    bauText(t.s, xx, y, size, t.hi ? (hi === BAU.blue || hi === BAU.black || hi === BAU.red ? BAU.paper : BAU.black) : (o.col ?? BAU.black), { reveal: rev });
    xx += t.w;
  });
  ctx.restore();
}
const bauTag = (str, o = {}) => { const f = () => bauTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const bauCaption = (str, o = {}) => { const f = () => bauCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'bauhaus',
  paper: BAU.paper,
  // the sheet in colour c (hex, or rgb() mid-morph) with the module grid ruled on it
  backdrop(c) { ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); bauGrid(); ctx.restore(); },
  // the era seen through the bridge shape, framed by a flat band in the bridge colour and one thin black concentric
  // ring outside it; both thin to nothing as the window closes onto the object
  window(P, key, src, o = {}) {
    ctx.save(); bauPoly(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, k = o.phase === 'grow' ? Math.min(1, u * 4) : Math.min(1, (1 - u) * 4);
    if (k * 34 < 1) return;
    const ce = bauCentroid(P);
    ctx.save(); ctx.lineJoin = 'miter'; ctx.miterLimit = 6;
    bauPoly(P); ctx.strokeStyle = o.c ?? BAU.black; ctx.lineWidth = 34 * k; ctx.stroke();
    bauPoly(P.map(([x, y]) => [ce[0] + (x - ce[0]) * 1.2, ce[1] + (y - ce[1]) * 1.2])); ctx.strokeStyle = BAU.black; ctx.lineWidth = 10 * k; ctx.stroke();
    ctx.restore();
  },
  // the morphing shape: one flat of ink on the bare grid, on its construction axes (horizontal, vertical and the 45°
  // diagonal through its centre), with a black ring that expands away from it and thins out
  blob(P, c, key, u = 0) {
    const ce = bauCentroid(P), R = P.reduce((a, p) => a + Math.hypot(p[0] - ce[0], p[1] - ce[1]) / P.length, 0), q = Math.sin(Math.PI * clamp(u));
    ctx.save();
    ctx.beginPath(); bauSeg(ce[0] - R * 2.2 * q, ce[1], ce[0] + R * 2.2 * q, ce[1], 4); bauSeg(ce[0], ce[1] - R * 2.2 * q, ce[0], ce[1] + R * 2.2 * q, 4);
    bauSeg(ce[0] - R * 1.7 * q, ce[1] + R * 1.7 * q, ce[0] + R * 1.7 * q, ce[1] - R * 1.7 * q, 4); bauInk(BAU.grey, { flat: true });
    const rr = R * (1.25 + 0.75 * u), rw = 16 * (1 - u);
    if (rw > 1) { ctx.beginPath(); ctx.arc(ce[0], ce[1], rr + rw / 2, 0, TAU); ctx.arc(ce[0], ce[1], rr - rw / 2, 0, TAU, true); bauInk(BAU.black, { flat: true }); }
    bauPoly(P); bauInk(c);
    ctx.restore();
  },
  hero(x, y, r, o = {}) { bauHero(x, y, r * 0.8, { key: o.key, mood: o.mood }); },
  heroColor: BAU.red,
  heroPts(x, y, r) { return bauHeroPts(x, y, r * 0.8); },
  // the sheet's grain over the finished print
  post() { ctx.save(); screen(); ctx.drawImage(bauGrain(), 0, 0); ctx.restore(); },
  ones: true,
};
