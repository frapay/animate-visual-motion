// =====================================================================
//  styles/vintage-map/kit.js — VINTAGE MAP: an antique explorer's map, hand-drawn on aged parchment.
//  Tea-stained paper with foxing spots, burnt edges and fold creases; a faint rhumb-line web radiating from a
//  compass rose; sepia iron-gall ink with an UNEVEN PEN WEIGHT (every line is a ribbon that swells and thins);
//  coastlines with stacked offshore hatching or fading contour lines; thin watercolour washes that pool at their
//  edges (ochre, sage, rose land; blue-grey sea); mountains as rows of shaded molehills, forests as clumps of tiny
//  trees, deserts as dotted dunes, rivers as tapering lines, cities as little domes and towers with italic labels on
//  curved baselines. One accent: a madder-red dashed ROUTE that travels across the sheet with the hero at its head.
//  Built on kit/core.js. Motion on 2s (the ink boils). Helpers are prefixed vmp…; the palette is VMP.
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const VMP = {
  paper: '#e6d2a5', paperL: '#f2e4c1', paperD: '#c8a86d', burn: '#6a4322',   // the sheet, a lighter patch (labels, ribbons), a shadowed fold, scorched edges
  ink: '#4a2e1a', inkL: '#8a6642', inkF: '#a98b62',                          // iron-gall sepia: fresh, thinned, faded (rhumb lines, far things)
  ochre: '#dbb568', sage: '#a9b584', rose: '#d9a08a',                         // land washes: desert, green country, towns
  sea: '#a8bdbd', seaD: '#6d8d94', slate: '#33434d',                          // sea wash, rivers and wave ink, the compass needle
  madder: '#b3322b',                                                          // MADDER RED: the route, its X and flag, the hero's saddle cloth, one rubricated word
};
const VMP_FONT = 'Baskerville, "Baskerville Old Face", "Palatino Linotype", Palatino, "Book Antiqua", "URW Palladio L", "Libre Baskerville", Georgia, "DejaVu Serif", "Times New Roman", serif';

// ---------------------------------------------------------------------
//  colour: hex or rgb() in, rgb()/rgba() out
// ---------------------------------------------------------------------
function vmpRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
const vmpMix = (a, b, u) => { const x = vmpRGB(a), y = vmpRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const vmpA = (c, al) => { const x = vmpRGB(c); return `rgba(${x[0]},${x[1]},${x[2]},${al})`; };

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
// a Catmull-Rom curve through the points (so a coast or a route can be given as a handful of points)
function vmpSmooth(P, closed = false, step = 8) {
  const n = P.length; if (n < 3) return P.slice();
  const out = [], g = (i) => (closed ? P[(i + n) % n] : P[clamp(i, 0, n - 1)]), m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), k = Math.max(1, Math.ceil(dist(p1, p2) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t, q = [0, 0];
      for (let d = 0; d < 2; d++) q[d] = 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3);
      out.push(q);
    }
  }
  if (!closed) out.push(P[n - 1]);
  return out;
}
const vmpArea = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const vmpCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
function vmpPoly(P, closed) { ctx.beginPath(); for (let i = 0; i < P.length; i++) { if (i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[i][0], P[i][1]); } if (closed) ctx.closePath(); }
// a damped swing that settles on 0: amp at t0, then a decaying oscillation (the compass needle, a hanging flag)
const vmpSwing = (t0, amp = 1.2, freq = 8, damp = 2.6) => (TT < t0 ? amp : amp * Math.exp(-(TT - t0) * damp) * Math.cos((TT - t0) * freq));
// the magnifier: a camera that glides between keys [[t, zoom, worldX, worldY], ...] and never leaves the sheet.
//   Returns a CAM for pieceCam. o.to = the screen point the world point lands on (default: the frame centre)
function vmpPan(t, keys, o = {}) {
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], u = a === b ? 0 : EZ.io(seg(t, a[0], b[0]));
  const z = Math.max(1, lerp(a[1], b[1], u)), x = lerp(a[2], b[2], u), y = lerp(a[3], b[3], u), to = o.to ?? [W / 2, H / 2];
  return { z, tx: clamp(to[0] - z * x, W - z * W, 0), ty: clamp(to[1] - z * y, H - z * H, 0) };
}

// ---------------------------------------------------------------------
//  the parchment: one seeded texture (stains, tide rings, foxing, specks, fibres, burnt edges, fold creases),
//  painted once on a transparent canvas so it can lie over any ground colour
// ---------------------------------------------------------------------
let VMP_TEX = null;
function vmpPaperTex() {
  if (VMP_TEX) return VMP_TEX;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = RNG('vmpparch');
  const blot = (x, y, r, col, al) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, vmpA(col, al)); gr.addColorStop(0.6, vmpA(col, al * 0.55)); gr.addColorStop(1, vmpA(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
  for (let i = 0; i < 36; i++) blot(R.r(0, W), R.r(0, H), R.r(140, 430), R.f() < 0.6 ? VMP.burn : '#fff4d2', R.r(0.04, 0.09));       // uneven tea stain
  for (let i = 0; i < 4; i++) {                                                                                                        // tide rings where a wet cup once stood
    const x = R.r(100, W - 100), y = R.r(200, H - 200), r = R.r(90, 230), p = R.r(0, TAU), q = R.r(0, TAU);
    g.beginPath(); for (let k = 0; k <= 80; k++) { const a = k / 80 * TAU, rr = r * (1 + 0.07 * Math.sin(3 * a + p) + 0.04 * Math.sin(5 * a + q)); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.86); }
    g.strokeStyle = vmpA(VMP.burn, 0.02); g.lineWidth = 16; g.stroke(); g.strokeStyle = vmpA(VMP.burn, 0.05); g.lineWidth = R.r(2.5, 5); g.stroke();
  }
  for (let k = 0; k < 13; k++) { const x = R.r(40, W - 40), y = R.r(40, H - 40); for (let j = R.i(3, 9); j > 0; j--) blot(x + R.n(80), y + R.n(80), R.r(3, 13), '#8a5a2b', R.r(0.12, 0.3)); }   // foxing
  g.fillStyle = vmpA(VMP.burn, 0.11); g.beginPath(); for (let i = 0; i < 3200; i++) g.rect(R.r(0, W), R.r(0, H), 1.6, 1.6); g.fill();
  g.fillStyle = 'rgba(255,246,220,0.16)'; g.beginPath(); for (let i = 0; i < 2600; i++) g.rect(R.r(0, W), R.r(0, H), 1.8, 1.8); g.fill();
  g.strokeStyle = vmpA(VMP.burn, 0.09); g.lineWidth = 1; g.beginPath();
  for (let i = 0; i < 240; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(8, 30); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + R.n(4), y + Math.sin(a) * l * 0.5 + R.n(4), x + Math.cos(a) * l, y + Math.sin(a) * l); }
  g.stroke();
  const fold = (v, at) => {                                                                                                            // a fold: a shadowed valley and a lit ridge
    const gr = v ? g.createLinearGradient(at - 26, 0, at + 26, 0) : g.createLinearGradient(0, at - 26, 0, at + 26);
    gr.addColorStop(0, vmpA(VMP.burn, 0)); gr.addColorStop(0.46, vmpA(VMP.burn, 0.1)); gr.addColorStop(0.5, vmpA(VMP.burn, 0.24)); gr.addColorStop(0.54, 'rgba(255,246,220,0.26)'); gr.addColorStop(1, 'rgba(255,246,220,0)');
    g.fillStyle = gr; if (v) g.fillRect(at - 26, 0, 52, H); else g.fillRect(0, at - 26, W, 52);
  };
  fold(true, Math.round(W * 0.5)); fold(false, Math.round(H * 0.335)); fold(false, Math.round(H * 0.665));
  const D = 170;                                                                                                                       // burnt, handled edges
  [[0, 0, D, 0], [W, 0, W - D, 0], [0, 0, 0, D], [0, H, 0, H - D]].forEach(([x0, y0, x1, y1]) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, vmpA(VMP.burn, 0.5)); gr.addColorStop(0.3, vmpA(VMP.burn, 0.2)); gr.addColorStop(1, vmpA(VMP.burn, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  for (let i = 0; i < 90; i++) { const e = R.i(0, 3), u = R.f(), x = e === 0 ? R.r(-20, 40) : e === 1 ? W - R.r(-20, 40) : u * W, y = e === 2 ? R.r(-20, 40) : e === 3 ? H - R.r(-20, 40) : u * H; blot(x, y, R.r(40, 150), VMP.burn, R.r(0.08, 0.22)); }
  [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => blot(x, y, 300, VMP.burn, 0.3));
  return (VMP_TEX = c);
}
// the sheet, in world coords (0..W x 0..H): the ground colour and the parchment texture over it
function vmpParchment(c = VMP.paper) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.drawImage(vmpPaperTex(), 0, 0); }
// STATIC geography painted once into an offscreen sheet and reused every frame: fn() draws in world coords with the
// kit's helpers (nothing in it may depend on the time). o.boil = n keeps n versions of the ink and steps through them.
const VMP_SHEETS = new Map();
function vmpSheet(key, fn, o = {}) {
  const nb = o.boil ?? 1, v = nb > 1 ? B % nb : 0, id = key + '|' + v;
  let c = VMP_SHEETS.get(id);
  if (!c) {
    c = document.createElement('canvas'); c.width = W; c.height = H;
    const keep = ctx, kb = B; ctx = c.getContext('2d'); B = v; ctx.save(); fn(v); ctx.restore(); ctx = keep; B = kb;
    if (VMP_SHEETS.size >= 8) VMP_SHEETS.delete(VMP_SHEETS.keys().next().value);
    VMP_SHEETS.set(id, c);
  }
  ctx.drawImage(c, 0, 0);
}
let VMP_VIG = null;
function vmpVignette() {
  if (VMP_VIG) return VMP_VIG;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H * 0.47, Math.min(W, H) * 0.5, W / 2, H * 0.5, Math.hypot(W, H) * 0.6);
  gr.addColorStop(0, vmpA(VMP.burn, 0)); gr.addColorStop(1, vmpA(VMP.burn, 0.3)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return (VMP_VIG = c);
}

// ---------------------------------------------------------------------
//  THE PEN: a line is a filled ribbon whose width swells and thins along its length (fixed by the key) and tapers
//  at open ends; its path wobbles a hair on every boil step.
//   o: w (3.2), c, closed, frac (0..1 write-on), key, amt (boil px, 1.1), raw (no boil), taper (false = blunt ends),
//      wf (f => width multiplier along 0..1: a river that widens), al
//  Returns the drawn path (its last point is the pen tip).
// ---------------------------------------------------------------------
function vmpInk(P, o = {}) {
  if (!P || P.length < 2) return [];
  const cl = !!o.closed, key = o.key ?? 'vi', w = o.w ?? 3.2;
  let Q = o.raw ? resample(P, cl, 6) : wobble(P, cl, o.amt ?? 1.1, key, 6), open = !cl;
  if (o.frac != null && o.frac < 1) { if (o.frac <= 0) return []; Q = subPath(cl ? [...Q, Q[0]] : Q, o.frac); open = true; }
  const n = Q.length; if (n < 2) return Q;
  const S = RNG('vmpink', key), f1 = S.r(0.011, 0.021), f2 = S.r(0.04, 0.075), p1 = S.r(0, TAU), p2 = S.r(0, TAU);
  const tot = pathLen(Q), tp = o.taper === false ? 0 : Math.min(tot * 0.3, w * 6), L = new Array(n), Rt = new Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[open ? Math.max(0, i - 1) : (i - 1 + n) % n], b = Q[open ? Math.min(n - 1, i + 1) : (i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    let k = 0.84 + 0.26 * Math.sin(s * f1 + p1) + 0.13 * Math.sin(s * f2 + p2);
    if (open && tp > 0) k *= Math.min(1, 0.3 + 0.7 * Math.min(s, tot - s) / tp);
    if (o.wf) k *= o.wf(tot ? s / tot : 0);
    const hw = Math.max(0.35, w * k / 2), nx = -dy / l * hw, ny = dx / l * hw;
    L[i] = [Q[i][0] + nx, Q[i][1] + ny]; Rt[i] = [Q[i][0] - nx, Q[i][1] - ny];
  }
  ctx.save(); ctx.globalAlpha *= o.al ?? 1; ctx.fillStyle = o.c ?? VMP.ink; ctx.beginPath();
  if (open) { ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]); for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]); ctx.closePath(); }
  else { ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]); ctx.closePath(); ctx.moveTo(Rt[n - 1][0], Rt[n - 1][1]); for (let i = n - 2; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]); ctx.closePath(); }
  ctx.fill(); ctx.restore();
  return Q;
}
// the quill that is drawing: its nib sits on (x, y). o: s (1), rot (the shaft's angle, default up and to the right)
function vmpPen(x, y, o = {}) {
  const s = o.s ?? 1, rot = (o.rot ?? -0.95) + Math.sin(B * 1.7) * 0.05;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(44, 0); ctx.quadraticCurveTo(80, -30, 150, -16); ctx.quadraticCurveTo(176, -6, 182, 2); ctx.quadraticCurveTo(140, 22, 86, 16); ctx.quadraticCurveTo(60, 12, 44, 0); ctx.closePath();
  ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.strokeStyle = VMP.ink; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < 7; i++) { const u = 62 + i * 16; ctx.moveTo(u, 0); ctx.lineTo(u + 12, -11 + i * 0.6); ctx.moveTo(u, 1); ctx.lineTo(u + 12, 11 - i * 0.4); } ctx.lineWidth = 1.3; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(182, 2); ctx.lineWidth = 3.2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -4); ctx.lineTo(18, 4); ctx.closePath(); ctx.fillStyle = VMP.ink; ctx.fill();
  ctx.restore();
}
// a thin watercolour wash inside outline P: a translucent fill that pools darker along its edge, with a few blooms.
//   o: al (0.6), key, k (0..1 overall strength, for fading it in), blooms (5), edge (false = no pooled edge)
function vmpWash(P, c, o = {}) {
  const k = o.k ?? 1; if (k <= 0.01 || P.length < 3) return;
  const key = o.key ?? 'wash', bb = bbox(P), R = RNG('vmpwash', key), dk = vmpMix(c, VMP.ink, 0.4);
  ctx.save(); ctx.globalAlpha *= k; vmpPoly(P, true);
  ctx.save(); ctx.globalAlpha *= o.al ?? 0.6; ctx.fillStyle = c; ctx.fill(); ctx.restore();
  ctx.clip();
  if (o.edge !== false) { ctx.lineJoin = 'round'; ctx.strokeStyle = vmpA(dk, 0.1); ctx.lineWidth = 34; ctx.stroke(); ctx.strokeStyle = vmpA(dk, 0.14); ctx.lineWidth = 12; ctx.stroke(); }
  for (let i = 0, n = o.blooms ?? 5; i < n; i++) {
    const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), r = R.r(60, 190), lt = R.f() < 0.5, gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, lt ? 'rgba(255,246,220,0.16)' : vmpA(dk, 0.11)); gr.addColorStop(1, lt ? 'rgba(255,246,220,0)' : vmpA(dk, 0)); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  coast, land, sea
// ---------------------------------------------------------------------
// A COASTLINE through pts: the inked shore plus its offshore marks.
//   o: closed (an island / a lake), side (open coasts: 1 = the sea lies to the LEFT of the direction of travel, -1 = right),
//      flip (closed: marks go inward — a lake), style ('hatch' short strokes | 'lines' fading contour lines | 'both'),
//      frac (0..1: the pen draws it on), pen (show the quill at the tip while frac < 1), w, c, key, len (hatch length),
//      n (contour lines, 3), raw (pts are already a dense curve)
//  Returns the pen tip [x, y] (or null).
function vmpCoast(P, o = {}) {
  const cl = !!o.closed, key = o.key ?? 'coast', frac = clamp(o.frac ?? 1); if (frac <= 0) return null;
  const S = o.raw ? P : vmpSmooth(P, cl, 10), c = o.c ?? VMP.ink, style = o.style ?? 'hatch';
  let side = o.side ?? 1; if (cl) side = (vmpArea(S) > 0 ? 1 : -1) * (o.flip ? -1 : 1);
  const Q = resample(S, cl, 9), n = Q.length, m = Math.max(1, Math.floor(n * frac));
  const nor = (i) => { const a = Q[cl ? (i - 1 + n) % n : Math.max(0, i - 1)], b = Q[cl ? (i + 1) % n : Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l * side, -dx / l * side]; };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = c;
  if (style !== 'lines') {
    const R = RNG('vmphat', key), J = RNG('vmphatj', key, B), ph = R.r(0, TAU), L0 = o.len ?? 24;
    ctx.beginPath();
    for (let i = 0; i < m; i++) {
      const [nx, ny] = nor(i), len = L0 * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(i * 0.47 + ph))) * R.r(0.75, 1.15), j = J.n(0.6), g0 = 6;
      ctx.moveTo(Q[i][0] + nx * g0 + j, Q[i][1] + ny * g0 - j); ctx.lineTo(Q[i][0] + nx * (g0 + len), Q[i][1] + ny * (g0 + len));
    }
    ctx.lineWidth = 1.5; ctx.globalAlpha = 0.62; ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (style !== 'hatch') {
    for (let k = 1, nl = o.n ?? 3; k <= nl; k++) {
      const d = 11 * k * (1 + 0.14 * k), O = []; for (let i = 0; i < m; i++) { const [nx, ny] = nor(i); O.push([Q[i][0] + nx * d, Q[i][1] + ny * d]); }
      if (O.length < 3) continue;
      const full = cl && frac >= 1; trace(wobble(O, full, 1.1, key + 'l' + k, 9), full);
      ctx.lineWidth = 2.1 - 0.35 * k; ctx.globalAlpha = 0.62 / k; ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  const out = vmpInk(S, { closed: cl, frac, key, w: o.w ?? 3.8, c, amt: o.amt ?? 1.1 });
  const tip = out.length ? out[out.length - 1] : null;
  if (o.pen && frac < 1 && tip) vmpPen(tip[0], tip[1]);
  return tip;
}
// LAND: a wash inside the coast, then the coast. For an open coast give o.close = the extra points that close the
// land's outline off the sheet. o: everything vmpCoast takes, plus al (wash strength), k (wash fade-in), wash (false = coast only)
function vmpLand(P, c = VMP.ochre, o = {}) {
  const cl = !!o.closed, S = vmpSmooth(P, cl, 10);
  if (o.wash !== false) vmpWash(cl ? S : [...S, ...(o.close ?? [])], c, { key: (o.key ?? 'land') + 'w', al: o.al, k: o.k });
  return vmpCoast(S, { ...o, raw: true });
}
// SEA: a pale blue-grey wash inside outline P (null = the whole sheet) with small scattered wave marks.
//   o: c, al, key, waves (how many marks, default by area), close (extra points, as vmpLand), marks (false = none)
function vmpSea(P, o = {}) {
  const key = o.key ?? 'sea', S = P ? [...vmpSmooth(P, !o.close && !!o.closed, 10), ...(o.close ?? [])] : [[0, 0], [W, 0], [W, H], [0, H]], bb = bbox(S);
  vmpWash(S, o.c ?? VMP.sea, { key: key + 'w', al: o.al ?? 0.62, k: o.k });
  if (o.marks === false) return;
  const R = RNG('vmpsea', key), J = RNG('vmpseaj', key, B), n = o.waves ?? Math.round((bb.x1 - bb.x0) * (bb.y1 - bb.y0) / 26000);
  ctx.save(); vmpPoly(S, true); ctx.clip(); ctx.strokeStyle = VMP.seaD; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.globalAlpha = 0.6 * (o.k ?? 1); ctx.beginPath();
  for (let i = 0; i < n; i++) { const x = R.r(bb.x0, bb.x1) + J.n(0.6), y = R.r(bb.y0, bb.y1), w = R.r(9, 16); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w / 2, y - w * 0.55, x, y); ctx.quadraticCurveTo(x + w / 2, y - w * 0.55, x + w, y); }
  ctx.stroke(); ctx.restore();
}
// a round lake / oasis pool: a sea wash, an inked shore and contour lines inside it. p = 0..1 (inked on)
function vmpLake(x, y, r, o = {}) {
  const p = clamp(o.p ?? 1); if (p <= 0) return;
  const P = ellipsePts(x, y, r, o.ry ?? r, 0, 40, -Math.PI / 2, TAU - Math.PI / 2), key = o.key ?? 'lake';
  vmpWash(P, o.c ?? VMP.sea, { key: key + 'w', al: 0.8, k: clamp(p * 1.6 - 0.4), blooms: 2 });
  vmpCoast(P, { closed: true, flip: true, style: 'lines', n: 2, frac: p, key, w: o.w ?? 3.6, raw: true });
}
// bobbing waves: rows of scalloped strokes that slide and lift on 2s (put them under a ship). o: rows (2), key, c, al
function vmpWaves(x, y, w, o = {}) {
  const rows = o.rows ?? 2, key = o.key ?? 'waves', ph = key.length * 0.9;
  ctx.save(); ctx.strokeStyle = o.c ?? VMP.seaD; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.2; ctx.globalAlpha *= o.al ?? 0.9;
  for (let r = 0; r < rows; r++) {
    const ww = w * (1 - 0.28 * r), n = Math.max(2, Math.round(ww / 30)), st = ww / n, sh = Math.sin(B * 0.55 + ph + r * 1.6), x0 = x - ww / 2 + sh * 5, yy = y + r * 15 + Math.cos(B * 0.55 + ph + r) * 2.5;
    ctx.beginPath(); ctx.moveTo(x0, yy);
    for (let i = 0; i < n; i++) ctx.quadraticCurveTo(x0 + (i + 0.5) * st, yy - 9 - sh * 2, x0 + (i + 1) * st, yy);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  terrain signs
// ---------------------------------------------------------------------
// MOUNTAINS: a row (or rows) of molehill peaks between (x0, y0) and (x1, y1), each shaded on its right flank.
//   o: n (peaks per row), s (peak size px, 70), rows (1), p (0..1: inked on one by one, left to right), key, fill, c
function vmpMountains(x0, y0, x1, y1, o = {}) {
  const key = o.key ?? 'mt', s = o.s ?? 70, rows = o.rows ?? 1, n = o.n ?? Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (s * 0.95))), p = clamp(o.p ?? 1); if (p <= 0) return;
  const fill = o.fill ?? vmpMix(VMP.paperL, VMP.paper, 0.45), c = o.c ?? VMP.ink, pk = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const S = RNG('vmpmt', key, r, i), f = (i + 0.5 + (r % 2 ? 0.5 : 0)) / (n + (rows > 1 ? 0.5 : 0));
    pk.push({ x: lerp(x0, x1, f) + S.n(s * 0.14), y: lerp(y0, y1, f) - (rows - 1 - r) * s * 0.42 + S.n(s * 0.07), h: s * S.r(0.7, 1.0), w: s * S.r(1.15, 1.5), lean: S.n(0.08), id: r + '.' + i });
  }
  const order = [...pk].sort((a, b) => a.x - b.x); order.forEach((q, i) => { q.k = clamp(p * (pk.length + 2) - i); });
  pk.sort((a, b) => a.y - b.y);
  for (const q of pk) {
    if (q.k <= 0) continue;
    const { x, y, h, w } = q, ax = x + q.lean * w, ay = y - h * EZ.o2(q.k);
    const hh = y - ay, Lf = [[x - w / 2, y], [x - w * 0.4, y - hh * 0.34], [x - w * 0.25, y - hh * 0.74], [ax - w * 0.1, ay + hh * 0.05], [ax, ay]], Rf = [[ax + w * 0.12, ay + hh * 0.08], [x + w * 0.28, y - hh * 0.7], [x + w * 0.42, y - hh * 0.3], [x + w / 2, y]];
    const O = vmpSmooth([...Lf, ...Rf], false, 7), ridge = [x + w * 0.07, y - 2];
    ctx.save(); vmpPoly(O, true); ctx.fillStyle = fill; ctx.globalAlpha = 0.94; ctx.fill(); ctx.globalAlpha = 1;
    ctx.clip();
    vmpPoly([[ax, ay], [x + w / 2 + 4, y + 2], ridge], true); ctx.fillStyle = vmpA(c, 0.13); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.7; ctx.beginPath();
    const J = RNG('vmpmtj', key, q.id, B);
    for (let j = 1; j <= 7; j++) { const t = j / 8, sx = lerp(ax, x + w / 2, t) + w * 0.12 * Math.sin(Math.PI * t), sy = lerp(ay, y, t) - hh * 0.1 * Math.sin(Math.PI * t), ex = lerp(ax, ridge[0], Math.min(1, t + 0.22)), ey = lerp(ay, ridge[1], Math.min(1, t + 0.22)); ctx.moveTo(sx + J.n(0.6), sy); ctx.lineTo(ex + J.n(0.6), ey); }
    ctx.stroke(); ctx.restore();
    vmpInk(O, { key: key + q.id, w: o.w ?? 2.8, c, amt: 0.8 });
    vmpInk([[ax, ay], [lerp(ax, ridge[0], 0.5) - w * 0.03, lerp(ay, ridge[1], 0.5)], ridge], { key: key + q.id + 'r', w: 1.6, c, amt: 0.6, al: 0.75 });
  }
}
// a FOREST: a clump of tiny round trees inside an ellipse. o: n, s (tree size, 1), p (0..1: they pop in), key, c (crown wash)
function vmpForest(x, y, rx, ry, o = {}) {
  const key = o.key ?? 'forest', s = o.s ?? 1, n = o.n ?? Math.max(3, Math.round(rx * ry / 520 / s)), p = clamp(o.p ?? 1), c = o.c ?? VMP.sage; if (p <= 0) return;
  const tr = [], R = RNG('vmpfor', key);
  for (let i = 0; i < n; i++) { const a = R.r(0, TAU), d = Math.sqrt(R.f()); tr.push({ x: x + Math.cos(a) * d * rx, y: y + Math.sin(a) * d * ry, r: 10 * s * R.r(0.85, 1.25), i }); }
  tr.sort((a, b) => a.y - b.y);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const t of tr) {
    const k = EZ.back(clamp(p * (n + 2) - t.i)); if (k <= 0.02) continue;
    const J = RNG('vmpforj', key, t.i, B), r = t.r * k, tx = t.x + J.n(0.5), cy = t.y - r * 1.5 + J.n(0.5);
    ctx.strokeStyle = VMP.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(tx, t.y); ctx.lineTo(tx, cy + r * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(tx - r * 0.42, cy + r * 0.18, r * 0.66, 0, TAU); ctx.arc(tx + r * 0.44, cy + r * 0.16, r * 0.62, 0, TAU); ctx.arc(tx, cy - r * 0.3, r * 0.74, 0, TAU);
    ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.fillStyle = vmpA(c, 0.85); ctx.fill();
    ctx.lineWidth = 1.9; ctx.beginPath(); ctx.arc(tx - r * 0.42, cy + r * 0.18, r * 0.66, 1.3, 4.4); ctx.stroke(); ctx.beginPath(); ctx.arc(tx, cy - r * 0.3, r * 0.74, 3.5, 6.1); ctx.stroke(); ctx.beginPath(); ctx.arc(tx + r * 0.44, cy + r * 0.16, r * 0.62, -1.2, 1.9); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; ctx.beginPath(); for (let j = 0; j < 3; j++) { ctx.moveTo(tx + r * (0.25 + j * 0.2), cy + r * 0.05); ctx.lineTo(tx + r * (0.02 + j * 0.2), cy + r * 0.55); } ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// a DESERT: dotted dune crests with stippled lee sides inside an ellipse. o: n, s (1), p (0..1: dotted in one by one), key, c
function vmpDunes(x, y, rx, ry, o = {}) {
  const key = o.key ?? 'dunes', s = o.s ?? 1, n = o.n ?? Math.max(2, Math.round(rx * ry / 3000 / s)), p = clamp(o.p ?? 1); if (p <= 0) return;
  const R = RNG('vmpdune', key), ds = [];
  for (let i = 0; i < n; i++) { const a = R.r(0, TAU), d = Math.sqrt(R.f()); ds.push({ x: x + Math.cos(a) * d * rx, y: y + Math.sin(a) * d * ry, w: 110 * s * R.r(0.75, 1.25), h: 30 * s * R.r(0.8, 1.25), sk: R.r(0.3, 0.45), i, sd: R.i(0, 9999) }); }
  ds.sort((a, b) => a.y - b.y);
  ctx.save(); ctx.fillStyle = o.c ?? VMP.ink;
  for (const d of ds) {
    const k = clamp(p * (n + 1) - d.i); if (k <= 0) continue;
    const S = RNG('vmpduned', key, d.sd), m = Math.round(d.w / 7), mk = Math.ceil(m * k); ctx.beginPath();
    for (let j = 0; j <= mk && j <= m; j++) {                                                         // the crest: a skewed bump, dot by dot
      const u = j / m, bx = d.x - d.w / 2 + u * d.w, by = d.y - d.h * (u < d.sk ? Math.sin(u / d.sk * Math.PI / 2) : Math.cos((u - d.sk) / (1 - d.sk) * Math.PI / 2) ** 0.8);
      ctx.moveTo(bx + 2.6, by); ctx.arc(bx, by, j % 3 === 0 ? 2.6 : 2, 0, TAU);
    }
    for (let j = 0, q = Math.round(d.w * 0.16 * k); j < q; j++) { const u = S.r(d.sk, 0.98), bx = d.x - d.w / 2 + u * d.w, top = d.y - d.h * Math.cos((u - d.sk) / (1 - d.sk) * Math.PI / 2) ** 0.8, by = lerp(top + 4, d.y + 3, S.f() ** 1.6); ctx.moveTo(bx + 1.5, by); ctx.arc(bx, by, 1.45, 0, TAU); }
    ctx.globalAlpha = 0.85; ctx.fill();
  }
  ctx.restore();
}
// a RIVER: a line that starts as a hair at its source and widens to w at its mouth. o: w (7), c, frac, key
function vmpRiver(P, o = {}) {
  const S = vmpSmooth(P, false, 8), w = o.w ?? 7;
  return vmpInk(S, { key: o.key ?? 'river', w, c: o.c ?? vmpMix(VMP.seaD, VMP.ink, 0.3), frac: o.frac, amt: 0.9, taper: false, wf: (f) => lerp(0.18, 1, f ** 1.3) });
}

// ---------------------------------------------------------------------
//  lettering: an old-style italic serif (or spaced capitals), one letter at a time on a gently curved baseline.
//   (x, y) = the centre of the baseline. o: curve (px the middle rises above the ends; negative sags), caps (spaced
//   capitals), upright, track (em), c, al, reveal (0..1: written on), halo (false = none; a paper glow so a label
//   reads over ink), haloC, key, weight
// ---------------------------------------------------------------------
const vmpFont = (size, o = {}) => `${o.caps || o.upright ? 'normal' : 'italic'} ${o.weight ?? (o.caps ? 600 : 500)} ${size}px ${VMP_FONT}`;
function vmpLabelW(str, size, o = {}) {
  const s = o.caps ? String(str).toUpperCase() : String(str);
  ctx.save(); ctx.font = vmpFont(size, o); let w = 0; for (const ch of s) w += ctx.measureText(ch).width; ctx.restore();
  return w + (o.track ?? (o.caps ? 0.14 : 0.015)) * size * Math.max(0, s.length - 1);
}
function vmpLabel(str, x, y, size, o = {}) {
  const s = o.caps ? String(str).toUpperCase() : String(str), n = s.length, rev = clamp(o.reveal ?? 1); if (rev <= 0 || !n) return 0;
  ctx.save(); ctx.font = vmpFont(size, o); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const tr = (o.track ?? (o.caps ? 0.14 : 0.015)) * size, ws = [...s].map((ch) => ctx.measureText(ch).width), w = ws.reduce((a, b) => a + b, 0) + tr * (n - 1);
  const sag = o.curve ?? 0, R = Math.abs(sag) > 0.5 ? w * w / (8 * Math.abs(sag)) + Math.abs(sag) / 2 : 0, sg = Math.sign(sag), shown = rev * n, J = RNG('vmplab', o.key ?? s, B >> 1), al = o.al ?? 1;
  let u = -w / 2;
  for (let i = 0; i < n; i++) {
    const ch = s[i], uc = u + ws[i] / 2; u += ws[i] + tr;
    if (ch === ' ') continue;
    const k = clamp(shown - i); if (k <= 0) break;
    let px = x + uc, py = y, rot = 0;
    if (R) { const th = uc / R; px = x + R * Math.sin(th); py = y + sg * (R - R * Math.cos(th)); rot = sg * th; }
    ctx.save(); ctx.translate(px + J.n(0.5), py + J.n(0.5)); ctx.rotate(rot + J.n(0.01)); ctx.globalAlpha *= al * k;
    if (o.halo !== false) { ctx.strokeStyle = vmpA(o.haloC ?? VMP.paperL, 0.7); ctx.lineWidth = size * 0.17; ctx.strokeText(ch, 0, 0); }
    ctx.fillStyle = o.c ?? VMP.ink; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  places
// ---------------------------------------------------------------------
// one little building standing on (x, y): kind 'flat' | 'dome' | 'tower'. roof = the dome / cap wash
function vmpBuilding(x, y, w, h, kind = 'flat', o = {}) {
  const J = RNG('vmpbld', o.key ?? kind + x, B), jx = J.n(0.45), jy = J.n(0.45), roof = o.roof ?? vmpMix(VMP.paperL, VMP.seaD, 0.5), lw = o.lw ?? 2.3;
  ctx.save(); ctx.translate(x + jx, y + jy); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = VMP.ink; ctx.lineWidth = lw;
  ctx.fillStyle = o.fill ?? VMP.paperL; ctx.beginPath(); ctx.rect(-w / 2, -h, w, h); ctx.fill(); ctx.stroke();
  ctx.fillStyle = vmpA(VMP.ink, 0.16); ctx.fillRect(w * 0.12, -h, w * 0.38, h);                                                    // the shaded side
  if (kind === 'dome') {
    ctx.beginPath(); ctx.moveTo(-w * 0.44, -h); ctx.bezierCurveTo(-w * 0.52, -h - w * 0.62, w * 0.52, -h - w * 0.62, w * 0.44, -h); ctx.closePath(); ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.fillStyle = vmpA(roof, 0.95); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h - w * 0.46); ctx.lineTo(0, -h - w * 0.72); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -h - w * 0.76, Math.max(1.6, w * 0.06), 0, TAU); ctx.fillStyle = VMP.ink; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w * 0.12, 0); ctx.lineTo(-w * 0.12, -h * 0.42); ctx.arc(0, -h * 0.42, w * 0.12, Math.PI, 0); ctx.lineTo(w * 0.12, 0); ctx.fillStyle = vmpA(VMP.ink, 0.8); ctx.fill();
  } else if (kind === 'tower') {
    ctx.beginPath(); ctx.moveTo(-w * 0.72, -h); ctx.lineTo(0, -h - w * 1.25); ctx.lineTo(w * 0.72, -h); ctx.closePath(); ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.fillStyle = vmpA(roof, 0.95); ctx.fill(); ctx.stroke();
    ctx.fillStyle = vmpA(VMP.ink, 0.8); ctx.fillRect(-w * 0.13, -h * 0.82, w * 0.26, h * 0.16);
  } else {
    ctx.fillStyle = vmpA(VMP.ink, 0.8); ctx.fillRect(-w * 0.28, -h * 0.66, w * 0.18, h * 0.24); ctx.fillRect(-w * 0.08, -h * 0.42, w * 0.2, h * 0.42);
    ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -h); ctx.lineTo(w / 2 + 2, -h); ctx.stroke();
  }
  ctx.restore();
}
// a CITY sign with its label. kind: 'dome' (a domed hall, houses and a tower) | 'tower' (a watchtower and wall) | 'dot'
// (a ringed dot) | 'tents' (a camp). o: kind, s (1), p (0..1: inked on with a small pop; the label is written after),
// size (label px, 40), at ('below' | 'above' | 'right' | 'left'), curve, caps, key, lc (label colour)
function vmpCity(x, y, label, o = {}) {
  const kind = o.kind ?? 'dome', s = o.s ?? 1, p = clamp(o.p ?? 1), key = o.key ?? 'city' + (label || kind); if (p <= 0) return;
  const k = EZ.back(clamp(p * 1.7)); let top = 60, half = 54;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  if (kind === 'dot') {
    ctx.strokeStyle = VMP.ink; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.arc(0, -13, 13, 0, TAU); ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -13, 5, 0, TAU); ctx.fillStyle = VMP.ink; ctx.fill(); top = 28; half = 18;
  } else if (kind === 'tents') {
    vmpTent(-22, 0, 0.8, { key: key + 'a' }); vmpTent(20, 4, 1, { key: key + 'b' }); top = 50; half = 50;
  } else if (kind === 'tower') {
    vmpBuilding(-26, 0, 30, 20, 'flat', { key: key + 'w1' }); vmpBuilding(26, 0, 30, 20, 'flat', { key: key + 'w2' }); vmpBuilding(0, 0, 20, 50, 'tower', { key: key + 't' }); top = 78; half = 44;
  } else {
    vmpBuilding(-34, 0, 26, 20, 'flat', { key: key + 'h1' }); vmpBuilding(31, 0, 12, 52, 'tower', { key: key + 't', roof: VMP.rose }); vmpBuilding(46, 2, 20, 16, 'flat', { key: key + 'h2' }); vmpBuilding(-1, 2, 38, 26, 'dome', { key: key + 'd' }); top = 70;
  }
  ctx.restore();
  vmpInk([[x - half * s, y + 2], [x, y + 3], [x + half * s, y + 2]], { key: key + 'g', w: 2.2, amt: 0.6, frac: clamp(p * 2) });
  if (!label) return;
  const size = o.size ?? 40, at = o.at ?? 'below', lw = vmpLabelW(label, size, o);
  const lx = at === 'right' ? x + half * s + 14 + lw / 2 : at === 'left' ? x - half * s - 14 - lw / 2 : x, ly = at === 'below' ? y + size * 0.95 + 8 : at === 'above' ? y - top * s - 12 : y - 6;
  vmpLabel(label, lx + (o.lx ?? 0), ly + (o.ly ?? 0), size, { curve: o.curve ?? (at === 'below' ? -5 : at === 'above' ? 6 : 0), caps: o.caps, key, c: o.lc, reveal: clamp(p * 2.2 - 1) });
}
// a ROUND WALLED CITY seen from above with its buildings standing up inside it: a crenellated ring wall, towers, a gate
// at the bottom, domes and houses. (x, y) = its centre, r = the wall's radius. o: p (0..1), key, c (ground wash), n (buildings)
function vmpWalledCity(x, y, r, o = {}) {
  const key = o.key ?? 'kota', p = clamp(o.p ?? 1), c = o.c ?? VMP.rose; if (p <= 0) return;
  const ring = ellipsePts(x, y, r, r, 0, 56, -Math.PI / 2, TAU - Math.PI / 2), R = RNG('vmpkota', key);
  vmpWash(ring, VMP.paperL, { key: key + 'p', al: 0.9, edge: false, blooms: 0 }); vmpWash(ring, c, { key: key + 'w', al: 0.6, blooms: 3 });
  ctx.save(); ctx.strokeStyle = VMP.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.globalAlpha = 0.8; ctx.beginPath();                    // crenels between the two wall lines
  for (let i = 0, n = Math.round(r * TAU / 15); i < n; i++) { const a = i / n * TAU; ctx.moveTo(x + Math.cos(a) * (r - 13), y + Math.sin(a) * (r - 13)); ctx.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2)); }
  ctx.stroke(); ctx.restore();
  vmpInk(ellipsePts(x, y, r - 15, r - 15, 0, 50), { closed: true, key: key + 'in', w: 2, amt: 0.9, frac: p });
  vmpInk(ring, { closed: true, key: key + 'out', w: 4.2, amt: 1.1, frac: p });
  const bs = [], nb = o.n ?? 9, ri = r - 15;                                                                                                  // buildings, back to front
  bs.push({ x, y: y + ri * 0.12, w: ri * 0.44, h: ri * 0.3, kind: 'dome', i: 0 });
  for (let i = 1; i <= nb; i++) { const a = (i / nb) * TAU + R.n(0.2), d = ri * R.r(0.5, 0.72), bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.8 + ri * 0.12; bs.push({ x: bx, y: by, w: ri * R.r(0.15, 0.22), h: ri * R.r(0.13, 0.2), kind: i % 3 === 0 ? 'dome' : i % 4 === 1 ? 'tower' : 'flat', i }); }
  bs.sort((a, b) => a.y - b.y);
  for (const b of bs) { const k = EZ.back(clamp(p * 2 - 0.5)); if (k <= 0.02) continue; const tall = b.kind === 'tower'; vmpBuilding(b.x, b.y, (tall ? b.w * 0.45 : b.w) * k, (tall ? b.h * 2.3 : b.h) * k, b.kind, { key: key + 'b' + b.i, roof: b.i % 2 ? VMP.sea : vmpMix(VMP.paperL, VMP.seaD, 0.55), lw: 2.1 }); }
  for (let i = 0; i < 8; i++) {                                                                                                               // wall towers (the bottom one is the gate)
    const a = Math.PI / 2 + i / 8 * TAU, tx = x + Math.cos(a) * (r - 6), ty = y + Math.sin(a) * (r - 6) + 12, gate = i === 0;
    vmpBuilding(tx, ty, gate ? 44 : 20, gate ? 40 : 30, gate ? 'dome' : 'flat', { key: key + 'tw' + i, roof: VMP.sea, lw: 2.2 });
    if (!gate && i % 2 === 0) vmpFlag(tx, ty - 30, 0.42, { c: VMP.ochre, key: key + 'fl' + i });
  }
}
// THE ROUTE: a madder-red dashed line along pts, drawn as far as progress (0..1). The dashes never slide: each has
// its own place on the path. Returns the head: { x, y, a (heading, rad), d (px travelled), len, done }.
//   o: c, w (5), dash ([17, 12]), key, raw (pts are already a dense curve), start (false = no ring at the start)
function vmpRoute(pts, progress = 1, o = {}) {
  const S = o.raw ? pts : vmpSmooth(pts, false, 6), len = pathLen(S), d1 = len * clamp(progress), c = o.c ?? VMP.madder, w = o.w ?? 5, [da, gp] = o.dash ?? [17, 12], key = o.key ?? 'route';
  const cum = [0]; for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + dist(S[i - 1], S[i]));
  let ci = 0; const at = (d) => { while (ci < S.length - 2 && cum[ci + 1] < d) ci++; while (ci > 0 && cum[ci] > d) ci--; const k = (d - cum[ci]) / ((cum[ci + 1] - cum[ci]) || 1); return [lerp(S[ci][0], S[ci + 1][0], clamp(k)), lerp(S[ci][1], S[ci + 1][1], clamp(k))]; };
  ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.start !== false && progress > 0) { ctx.lineWidth = w * 0.6; ctx.beginPath(); ctx.arc(S[0][0], S[0][1], w * 1.5, 0, TAU); ctx.stroke(); }
  for (let d = w * 2.6, k = 0; d < d1; d += da + gp, k++) {
    const b = Math.min(d1, d + da), Rk = RNG('vmpdash', key, k), J = RNG('vmpdashj', key, k, B), jx = J.n(0.5), jy = J.n(0.5);
    ctx.lineWidth = w * Rk.r(0.8, 1.14); ctx.beginPath();
    for (let t = d; ; t += 5) { const tt = Math.min(t, b), q = at(tt); if (t === d) ctx.moveTo(q[0] + jx, q[1] + jy); else ctx.lineTo(q[0] + jx, q[1] + jy); if (tt >= b) break; }
    ctx.stroke();
  }
  ctx.restore();
  const hd = at(d1), bk = at(Math.max(0, d1 - 14)), fw = at(Math.min(len, d1 + 14));
  return { x: hd[0], y: hd[1], a: Math.atan2(fw[1] - bk[1], fw[0] - bk[0]), d: d1, len, done: progress >= 1 };
}
// the X that marks the spot: two pen strokes, drawn on by p (0..1). o: c, w, key
function vmpX(x, y, s = 22, p = 1, o = {}) {
  const c = o.c ?? VMP.madder, w = o.w ?? 6.5, key = o.key ?? 'xmark';
  vmpInk([[x - s, y - s * 0.9], [x - s * 0.1, y + s * 0.05], [x + s, y + s * 0.9]], { c, w, key: key + 'a', frac: clamp(p * 2), amt: 0.8 });
  vmpInk([[x + s, y - s * 0.9], [x + s * 0.05, y - s * 0.05], [x - s, y + s * 0.9]], { c, w, key: key + 'b', frac: clamp(p * 2 - 1), amt: 0.8 });
}
// a pennant on a pole planted at (x, y), fluttering on 2s. o: c (madder), p (pop 0..1), key, h (pole height, 86)
function vmpFlag(x, y, s = 1, o = {}) {
  const p = o.p ?? 1; if (p <= 0.02) return;
  const key = o.key ?? 'flag', h = (o.h ?? 86) * s * p, fl = Math.sin(B * 1.1 + key.length), L = 40 * s * p;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = VMP.ink; ctx.lineWidth = Math.max(1.6, 3 * s);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.quadraticCurveTo(x + L * 0.5, y - h + (6 + fl * 5) * s, x + L, y - h + (11 + fl * 4) * s); ctx.quadraticCurveTo(x + L * 0.5, y - h + (17 - fl * 3) * s, x, y - h + 24 * s); ctx.closePath();
  ctx.fillStyle = o.c ?? VMP.madder; ctx.fill(); ctx.lineWidth = Math.max(1.2, 2 * s); ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  ornaments: compass rose, rhumb lines, border, scale bar, ribbon / cartouche
// ---------------------------------------------------------------------
// an ornate COMPASS ROSE. o: needle (rad from north; omit for no needle — animate it with vmpSwing), p (0..1: rings
// are drawn, then the points pop), letter ('U' for Utara; '' = none), key, c, plain (true = no minor points)
function vmpCompass(x, y, r, o = {}) {
  const p = clamp(o.p ?? 1), key = o.key ?? 'rose', c = o.c ?? VMP.ink; if (p <= 0) return;
  const J = RNG('vmprosej', key, B), k1 = clamp(p / 0.5), k2 = EZ.back(clamp((p - 0.3) / 0.7));
  ctx.save(); ctx.translate(x + J.n(0.4), y + J.n(0.4)); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = c;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = vmpA(VMP.paperL, 0.5 * k1); ctx.fill();
  const ring = (rr, lw) => { ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(0, 0, rr, -Math.PI / 2, -Math.PI / 2 + TAU * k1); ctx.stroke(); };
  ring(r, Math.max(2, r * 0.03)); ring(r * 0.9, 1.4); ring(r * 0.48, 1.3);
  ctx.lineWidth = 1.4; ctx.beginPath();
  for (let i = 0; i < 32 * k1; i++) { const a = -Math.PI / 2 + i / 32 * TAU, r0 = r * (i % 4 === 0 ? 0.83 : 0.9); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.stroke();
  const kite = (a, len, wd, dark) => {                                                                // a point split down the middle: one half inked, one half paper
    const tx = Math.cos(a) * len, ty = Math.sin(a) * len, b = wd * 1.45;
    for (const sd of [-1, 1]) { const bx = Math.cos(a + sd * Math.PI / 4) * b, by = Math.sin(a + sd * Math.PI / 4) * b; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, by); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fillStyle = sd < 0 ? dark : VMP.paperL; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); }
  };
  if (k2 > 0.02) {
    ctx.save(); ctx.scale(k2, k2);
    if (!o.plain) for (let i = 0; i < 8; i++) kite(-Math.PI / 2 + (i + 0.5) / 8 * TAU, r * 0.5, r * 0.06, VMP.inkL);
    for (let i = 0; i < 4; i++) kite(-Math.PI / 4 + i / 4 * TAU, r * 0.64, r * 0.1, VMP.inkL);
    for (let i = 0; i < 4; i++) kite(-Math.PI / 2 + i / 4 * TAU, r * 0.88, r * 0.14, c);
    ctx.restore();
    const lt = o.letter ?? 'U';
    if (lt) { ctx.beginPath(); ctx.moveTo(0, -r - r * 0.2); ctx.lineTo(-r * 0.07, -r - 2); ctx.lineTo(r * 0.07, -r - 2); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); vmpLabel(lt, 0, -r - r * 0.26, Math.max(26, r * 0.34), { upright: true, weight: 600, key: key + 'n', al: k2 }); }
  }
  if (o.needle != null && k2 > 0.5) {
    ctx.rotate(o.needle); const nl = r * 0.74, nw = r * 0.085;
    ctx.beginPath(); ctx.moveTo(0, -nl); ctx.lineTo(nw, 0); ctx.lineTo(-nw, 0); ctx.closePath(); ctx.fillStyle = VMP.slate; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = VMP.slate; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, nl * 0.8); ctx.lineTo(nw, 0); ctx.lineTo(-nw, 0); ctx.closePath(); ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.06, 0, TAU); ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.02, 0, TAU); ctx.fillStyle = VMP.slate; ctx.fill();
  }
  ctx.restore();
}
// the faint RHUMB-LINE web: 32 winds radiating from (x, y) and 16 from each of o.nodes points on a circle round it
function vmpRhumb(x, y, o = {}) {
  const c = o.c ?? VMP.inkL, al = o.al ?? 1, far = Math.hypot(W, H), nodes = o.nodes ?? 8, Rn = o.R ?? 560;
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.2;
  const rays = (cx, cy, n, a1, a2) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; ctx.globalAlpha = al * (i % 2 ? a2 : a1); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far); ctx.stroke(); } };
  rays(x, y, 32, 0.24, 0.12);
  for (let k = 0; k < nodes; k++) { const a = (k + 0.5) / nodes * TAU, nx = x + Math.cos(a) * Rn, ny = y + Math.sin(a) * Rn; rays(nx, ny, 16, 0.09, 0.05); ctx.globalAlpha = al * 0.3; ctx.beginPath(); ctx.arc(nx, ny, 6, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
// the neat BORDER of the sheet: a heavy line, a fine line, and a ladder of alternating blocks between them.
//   o: inset (26), gap (16), step (block length, ~46), c
function vmpBorder(o = {}) {
  const a = o.inset ?? 26, g = o.gap ?? 16, c = o.c ?? VMP.ink, x0 = a, y0 = a, x1 = W - a, y1 = H - a;
  ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = vmpA(c, 0.82); ctx.lineJoin = 'miter';
  ctx.lineWidth = 4; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.lineWidth = 1.6; ctx.strokeRect(x0 + g, y0 + g, x1 - x0 - 2 * g, y1 - y0 - 2 * g); ctx.lineWidth = 1.2; ctx.strokeRect(x0 + g + 7, y0 + g + 7, x1 - x0 - 2 * g - 14, y1 - y0 - 2 * g - 14);
  const run = (len, f) => { const n = Math.round((len - 2 * g) / (o.step ?? 46) / 2) * 2 + 1, st = (len - 2 * g) / n; for (let i = 0; i < n; i++) { if (i % 2 === 0) f(g + i * st, st); } };
  run(x1 - x0, (u, st) => { ctx.fillRect(x0 + u, y0 + 4, st, g - 7); ctx.fillRect(x0 + u, y1 - g + 3, st, g - 7); });
  run(y1 - y0, (u, st) => { ctx.fillRect(x0 + 4, y0 + u, g - 7, st); ctx.fillRect(x1 - g + 3, y0 + u, g - 7, st); });
  ctx.restore();
}
// a SCALE BAR whose left end is at (x, y): alternating blocks, ticks and small numerals. o: n (4), unit (10), label, p, h, size
function vmpScale(x, y, w, o = {}) {
  const n = o.n ?? 4, p = clamp(o.p ?? 1), h = o.h ?? 12, size = o.size ?? 26, st = w / n; if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = VMP.ink; ctx.fillStyle = VMP.ink; ctx.lineWidth = 2;
  const ww = w * EZ.o2(p), m = Math.min(n, Math.floor(ww / st + 1e-6));
  ctx.fillStyle = VMP.paperL; ctx.fillRect(x, y - h, ww, h); ctx.fillStyle = VMP.ink;
  for (let i = 0; i < m; i++) if (i % 2 === 0) ctx.fillRect(x + i * st, y - h, st, h / 2); else ctx.fillRect(x + i * st, y - h / 2, st, h / 2);
  ctx.strokeRect(x, y - h, ww, h);
  ctx.beginPath(); for (let i = 0; i <= m; i++) { ctx.moveTo(x + i * st, y - h - 7); ctx.lineTo(x + i * st, y); } ctx.stroke(); ctx.restore();
  for (let i = 0; i <= m; i += 2) vmpLabel(String(i * (o.unit ?? 10)), x + i * st, y + size * 0.95, size, { key: 'sc' + i, halo: false });
  if (o.label && p >= 1) vmpLabel(o.label, x + w / 2, y - h - 16, size, { key: 'scl', halo: false });
}
// an opaque parchment RIBBON centred on (cx, cy): a panel with two folded, forked tails. o: tail, fill, key
function vmpRibbon(cx, cy, w, h, o = {}) {
  const key = o.key ?? 'rib', fill = o.fill ?? VMP.paperL, t = o.tail ?? h * 0.62, dk = vmpMix(fill, VMP.burn, 0.3), dy = h * 0.2, x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, f = 16;
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = VMP.ink;
  for (const sd of [-1, 1]) {
    const xe = sd < 0 ? x0 : x1, T = [[xe - sd * f, y0 + dy], [xe + sd * t, y0 + dy], [xe + sd * (t - h * 0.3), cy + dy], [xe + sd * t, y1 + dy], [xe - sd * f, y1 + dy]];
    vmpPoly(T, true); ctx.fillStyle = dk; ctx.fill(); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(xe + sd * 4, y0 + dy + i * h / 4); ctx.lineTo(xe + sd * (t - h * 0.34), y0 + dy + i * h / 4); } ctx.lineWidth = 1; ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1;
    vmpPoly([[xe, y1], [xe - sd * f, y1], [xe - sd * f, y1 + dy]], true); ctx.fillStyle = vmpMix(fill, VMP.burn, 0.62); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
  }
  const P = rrectPts(x0, y0, w, h, 5, 2);
  vmpPoly(P, true); ctx.fillStyle = fill; ctx.fill();
  ctx.save(); ctx.clip(); const R = RNG('vmprib', key);
  for (let i = 0; i < 4; i++) { const x = R.r(x0, x1), y = R.r(y0, y1), r = R.r(60, 160), gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, vmpA(VMP.burn, 0.09)); gr.addColorStop(1, vmpA(VMP.burn, 0)); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
  ctx.strokeStyle = vmpA(VMP.burn, 0.16); ctx.lineWidth = 16; vmpPoly(P, true); ctx.stroke(); ctx.restore();
  ctx.restore();
  vmpInk(P, { closed: true, key, w: 3.2, amt: 0.8 });
  vmpInk(rrectPts(x0 + 8, y0 + 8, w - 16, h - 16, 3, 2), { closed: true, key: key + 'i', w: 1.3, amt: 0.6, al: 0.55 });
}
// a CARTOUCHE: a ribbon with a title set in spaced capitals (or italic). o: size (46), caps (true), p (0..1 unrolls), key, c
function vmpCartouche(str, x, y, o = {}) {
  const size = o.size ?? 46, caps = o.caps ?? true, p = clamp(o.p ?? 1); if (p <= 0.04) return null;
  const tw = vmpLabelW(str, size, { caps }), w = tw + size * 1.4, h = size * 1.75;
  ctx.save(); ctx.translate(x, y); ctx.scale(lerp(0.2, 1, EZ.o3(p)), 1);
  vmpRibbon(0, 0, w, h, { key: 'ct' + str, fill: o.fill });
  vmpLabel(str, 0, size * 0.34, size, { caps, key: 'ct' + str, halo: false, c: o.c, reveal: clamp(p * 2 - 0.8) });
  ctx.restore(); return { w, h };
}

// ---------------------------------------------------------------------
//  props for background life
// ---------------------------------------------------------------------
// a small DHOW on its waterline (x, y): a curved hull, a lateen sail, a pennant; it bobs and rocks on 2s.
//   o: dir (1 = bow to the right), key, pennant (colour; madder only if it is the hero), bob, tilt, sail
function vmpShip(x, y, s = 1, o = {}) {
  const key = o.key ?? 'ship', dir = o.dir ?? 1, ph = key.length * 1.3, bob = o.bob ?? Math.sin(B * 0.55 + ph) * 3.5, tilt = o.tilt ?? Math.sin(B * 0.55 + ph + 1.2) * 0.055, fl = Math.sin(B * 1.1 + ph);
  ctx.save(); ctx.translate(x, y + bob * s); ctx.rotate(tilt); ctx.scale(s * dir, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  vmpInk([[-3, -10], [1, -88]], { key: key + 'm', w: 3.4, amt: 0.3, taper: false });
  const sail = vmpSmooth([[-36, -34], [-8, -66], [30, -96], [36, -58], [30, -22], [0, -26]], true, 6);
  vmpPoly(sail, true); ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.fillStyle = vmpA(o.sail ?? VMP.ochre, 0.3); ctx.fill();
  ctx.strokeStyle = VMP.ink; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(-14, -48); ctx.lineTo(18, -24); ctx.moveTo(4, -68); ctx.lineTo(32, -40); ctx.stroke(); ctx.globalAlpha = 1;
  vmpInk(sail, { closed: true, key: key + 's', w: 2.4, amt: 0.6 });
  vmpInk([[-40, -30], [32, -100]], { key: key + 'y', w: 2.8, amt: 0.3, taper: false });
  ctx.beginPath(); ctx.moveTo(1, -88); ctx.quadraticCurveTo(-12, -92 + fl * 3, -24, -86 + fl * 4); ctx.quadraticCurveTo(-12, -82 - fl * 2, 1, -78); ctx.closePath(); ctx.fillStyle = o.pennant ?? VMP.ink; ctx.fill();
  const hull = vmpSmooth([[-52, -18], [-44, -2], [-28, 7], [22, 7], [44, -3], [60, -26], [42, -13], [-34, -12]], true, 6);
  vmpPoly(hull, true); ctx.fillStyle = VMP.paperL; ctx.fill(); ctx.fillStyle = vmpA(VMP.inkL, 0.35); ctx.fill();
  vmpInk(hull, { closed: true, key: key + 'h', w: 2.8, amt: 0.6 });
  vmpInk([[-44, -5], [0, -1], [44, -6]], { key: key + 'p', w: 1.4, amt: 0.4, al: 0.7 });
  ctx.restore();
}
// a CAMEL standing on (x, y), drawn in ink on a pale body. o: dir (1 = facing right), step (walk phase in cycles: feed
// it distance / stride; 0 = standing), cloth (saddle-cloth colour, null = none), head (0..1 raised), mood ('calm' |
// 'happy' | 'wow'), lift (px off the ground), key, fill, far (true = a small distant one: no face, no cloth detail)
function vmpCamel(x, y, s = 1, o = {}) {
  const key = o.key ?? 'camel', dir = o.dir ?? 1, step = o.step ?? 0, cloth = o.cloth ?? null, fill = o.fill ?? VMP.paperL, mood = o.mood ?? 'calm', up = o.head ?? (mood === 'calm' ? 0 : 1);
  const walking = Math.abs(Math.sin(TAU * step)) > 0.05, nod = walking ? Math.sin(TAU * step * 2) * 2 : 0, bobY = walking ? Math.abs(Math.sin(TAU * step)) * -2.5 : 0;
  ctx.save(); ctx.translate(x, y - (o.lift ?? 0)); ctx.scale(s * dir, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const leg = (hx, ph, far) => {
    const a = Math.sin(TAU * step + ph) * 0.42, fx = hx + Math.sin(a) * 52, lf = Math.max(0, Math.sin(TAU * step + ph + Math.PI / 2)) * 7 * (walking ? 1 : 0), fy = -lf, kx = (hx + fx) / 2 + 4 + (lf > 0 ? 5 : 0);
    vmpInk([[hx, -54 + bobY], [kx, -27], [fx, fy - 2]], { w: far ? 5 : 6.2, c: far ? VMP.inkL : VMP.ink, key: key + 'lg' + hx + (far ? 'f' : 'n'), raw: true, taper: false });
    ctx.fillStyle = far ? VMP.inkL : VMP.ink; ctx.beginPath(); ctx.ellipse(fx + 2.5, fy - 2, 5.5, 3, 0, 0, TAU); ctx.fill();
  };
  ctx.translate(0, 0);
  leg(-27, Math.PI, true); leg(27, 0, true);
  const hd = [61 + 2 * up, -121 - 12 * up + nod + bobY], tw = Math.sin(B * 0.9 + key.length) * 4;
  vmpInk([[-44, -72 + bobY], [-53, -60 + bobY], [-51 + tw, -44 + bobY]], { w: 3, key: key + 'tl', raw: true }); ctx.fillStyle = VMP.ink; ctx.beginPath(); ctx.arc(-51 + tw, -42 + bobY, 3.4, 0, TAU); ctx.fill();
  const neck = () => { ctx.beginPath(); ctx.moveTo(28, -62 + bobY); ctx.bezierCurveTo(44, -78 + bobY, 40, -102 + bobY, hd[0] - 8, hd[1] + 3); };
  neck(); ctx.strokeStyle = VMP.ink; ctx.lineWidth = 19; ctx.stroke(); neck(); ctx.strokeStyle = fill; ctx.lineWidth = 13.6; ctx.stroke();
  const body = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, bx = Math.cos(a) * 46; let by = Math.sin(a) * 23; if (by < 0) by -= 27 * Math.exp(-(((bx + 3) / 19) ** 2)); body.push([bx, -67 + by + bobY]); }
  vmpPoly(body, true); ctx.fillStyle = fill; ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = VMP.ink; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5; ctx.beginPath(); for (let i = 0; i < 9; i++) { ctx.moveTo(-34 + i * 9, -44 + bobY); ctx.lineTo(-40 + i * 9, -56 + bobY); } ctx.stroke(); ctx.restore();
  vmpInk(body, { closed: true, key: key + 'bd', w: 2.9, amt: 0.6 });
  ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-0.22 - 0.12 * up);                                                              // the head
  ctx.beginPath(); ctx.moveTo(-12, -11); ctx.lineTo(-17, -22); ctx.lineTo(-6, -13); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = VMP.ink; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 10.5, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2.8; ctx.stroke();
  if (!o.far) {
    const blink = mood === 'calm' && (B + key.length * 3) % 31 < 2; ctx.fillStyle = VMP.ink; ctx.lineWidth = 2.2;
    if (mood === 'happy' || blink) { ctx.beginPath(); ctx.arc(1, -2, 3.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(1, -3, mood === 'wow' ? 3.4 : 2.6, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(14, -1, 1.2, 0, TAU); ctx.fill();
    ctx.beginPath(); if (mood === 'calm') { ctx.moveTo(8, 5); ctx.lineTo(16, 4 + (B % 4 < 2 ? 0 : 1.2)); } else ctx.arc(10, 2, 5.5, 0.25, 1.9); ctx.lineWidth = 1.8; ctx.stroke();
  }
  ctx.restore();
  leg(-21, 0, false); leg(21, Math.PI, false);
  if (cloth) {                                                                                                                         // the saddle cloth over the hump
    const cp = [[-27, -84], [-15, -106], [-3, -118], [10, -108], [22, -86], [25, -60], [-29, -58]].map(([px, py]) => [px, py + bobY]);
    vmpPoly(cp, true); ctx.fillStyle = cloth; ctx.fill();
    if (!o.far) {
      ctx.strokeStyle = VMP.paperL; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-27, -68 + bobY); ctx.lineTo(24, -70 + bobY); ctx.stroke();
      ctx.strokeStyle = VMP.ink; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 7; i++) { ctx.moveTo(-26 + i * 8, -58 + bobY); ctx.lineTo(-27 + i * 8, -50 + bobY); } ctx.stroke();
      ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(hd[0] - 2, hd[1] + 9); ctx.quadraticCurveTo(40, -70 + bobY, 22, -84 + bobY); ctx.stroke(); ctx.globalAlpha = 1;
    }
    vmpInk(cp, { closed: true, key: key + 'cl', w: 2.4, amt: 0.5 });
  }
  ctx.restore();
}
// THE HERO: Unta, a little caravan camel in ink with a madder-red saddle cloth. It stands on (x, y); r = half its
// height. Sets SPARK_AT. o: as vmpCamel (dir, step, mood, lift, head, key)
function vmpHero(x, y, r, o = {}) {
  SPARK_AT = toScreen(x, y - r);
  vmpCamel(x, y, r / 66, { cloth: VMP.madder, key: 'unta', ...o });
}
function vmpHeroPts(x, y, r, n = 56) {   // the hero's rough outline round its centre (x, y), for hero bridges: a humped oval
  const P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a); P.push([x + c * r * 0.95, y + s * r * 0.8 - (s < 0 ? r * 0.24 * Math.exp(-((c * 2.2) ** 2)) : 0)]); }
  return P;
}
// a CARAVAN: n small camels in single file along path pts, the first at progress (0..1). o: s (0.45), gap (px), key, cloth
function vmpCaravan(pts, progress, n = 3, o = {}) {
  const S = vmpSmooth(pts, false, 8), len = pathLen(S), s = o.s ?? 0.45, gap = o.gap ?? 150 * s, key = o.key ?? 'kafilah';
  for (let i = n - 1; i >= 0; i--) {
    const d = len * clamp(progress) - i * gap; if (d < 0) continue;
    const q = pointAt(S, d / len), q2 = pointAt(S, Math.min(1, (d + 10) / len));
    vmpCamel(q[0], q[1], s, { key: key + i, dir: q2[0] >= q[0] ? 1 : -1, step: d / (64 * s) + i * 0.3, cloth: o.cloth ?? (i % 2 ? VMP.ochre : null), far: true });
  }
}
// a date PALM rooted at (x, y), its fronds swaying on 2s. o: p (pop 0..1), key
function vmpPalm(x, y, s = 1, o = {}) {
  const p = o.p ?? 1; if (p <= 0.02) return;
  const key = o.key ?? 'palm', k = s * EZ.back(clamp(p)), sw = Math.sin(B * 0.5 + key.length * 1.3) * 0.07;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  vmpInk([[0, 0], [5, -30], [-2, -62], [3, -92]], { key: key + 't', w: 6, taper: false, amt: 0.5, c: VMP.inkL });
  ctx.strokeStyle = VMP.ink; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 1; i < 8; i++) { ctx.moveTo(-3 + (i % 2), -i * 11); ctx.lineTo(5 + (i % 2), -i * 11 - 2); } ctx.stroke();
  ctx.translate(3, -92); ctx.rotate(sw);
  ctx.beginPath(); ctx.arc(0, -2, 26, 0, TAU); ctx.fillStyle = vmpA(VMP.sage, 0.45); ctx.fill();
  [-2.85, -2.3, -1.85, -1.3, -0.85, -0.3].forEach((a, i) => {
    const L = 46, P = [[0, 0], [Math.cos(a) * L * 0.5, Math.sin(a) * L * 0.5 - 6], [Math.cos(a) * L, Math.sin(a) * L + 14]];
    vmpInk(vmpSmooth(P, false, 5), { key: key + 'f' + i, w: 3.6, amt: 0.5 });
  });
  ctx.restore();
}
// a TENT pitched at (x, y). o: key, c (stripe wash)
function vmpTent(x, y, s = 1, o = {}) {
  const key = o.key ?? 'tent', J = RNG('vmptent', key, B), jx = J.n(0.4);
  ctx.save(); ctx.translate(x + jx, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  vmpPoly([[-34, 0], [0, -46], [34, 0]], true); ctx.fillStyle = VMP.paperL; ctx.fill();
  vmpPoly([[0, -46], [34, 0], [9, 0]], true); ctx.fillStyle = vmpA(o.c ?? VMP.inkL, 0.3); ctx.fill();
  vmpPoly([[0, -46], [-6, 0], [9, 0]], true); ctx.fillStyle = vmpA(VMP.ink, 0.75); ctx.fill();
  ctx.strokeStyle = VMP.ink; ctx.lineWidth = 2.4; vmpPoly([[-34, 0], [0, -46], [34, 0]], true); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -58); ctx.stroke();
  ctx.restore();
}
// a few GULLS wheeling round (x, y): small ink ticks that flap on 2s. o: n (3), s (1), key
function vmpGulls(x, y, o = {}) {
  const n = o.n ?? 3, s = o.s ?? 1, key = o.key ?? 'gulls';
  ctx.save(); ctx.strokeStyle = VMP.ink; ctx.lineWidth = 2.3 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const R = RNG('vmpgull', key, i), gx = x + R.n(70) * s + Math.sin(B * 0.2 + i * 2) * 10, gy = y + R.n(34) * s + Math.cos(B * 0.25 + i) * 6, z = 13 * s * R.r(0.8, 1.2), f = (B + i) % 4 < 2 ? 1 : 0.25;
    ctx.beginPath(); ctx.moveTo(gx - z, gy - z * 0.5 * f); ctx.quadraticCurveTo(gx - z * 0.45, gy - z * 0.75 * f, gx, gy); ctx.quadraticCurveTo(gx + z * 0.45, gy - z * 0.75 * f, gx + z, gy - z * 0.5 * f); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size, drawn last and OPAQUE).
//  The caption is a parchment ribbon; a *word* is rubricated (madder red) with a pen flourish under it.
//  The tag is a small cartouche plate with spaced capitals. Both roll away as a bridge starts and unroll after it.
// ---------------------------------------------------------------------
function vmpBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.25));
    if (TT >= r.tc && TT < r.tc + d + 0.17) return EZ.o2(seg(TT, r.tc + d - 0.17, r.tc + d + 0.17));
  }
  return 1;
}
//   o: y (ribbon centre, 1392), x (CX), size (58), at (seconds after the era starts, 0.5), maxW (840), hi (the rubric colour)
function vmpCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), p = EZ.o3(ev(at, 0.34)) * vmpBridgeK(); if (p <= 0.06) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), cy = o.y ?? 1392, maxW = o.maxW ?? 840, hi = o.hi ?? VMP.madder;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  let size = o.size ?? 58, tw = 0, w = 0, h = 0;
  for (let pass = 0; pass < 2; pass++) {
    toks.forEach((t, i) => { t.w = vmpLabelW(t.s, size, { weight: t.hi ? 700 : 500 }); t.gap = i === 0 ? 0 : /^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.3; });
    tw = toks.reduce((a, t) => a + t.w + t.gap, 0); h = size * 1.72; w = tw + size * 1.3;
    const full = w + 2 * h * 0.62; if (full <= maxW) break; size = Math.max(50, size * maxW / full);
  }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.008); ctx.scale(lerp(0.12, 1, p), 1);
  vmpRibbon(0, 0, w, h, { key: 'cap' + str });
  let xx = -tw / 2, k = 0;
  for (const t of toks) {
    xx += t.gap;
    const rev = ev(at + 0.25 + k * 0.03, Math.max(0.12, t.s.length * 0.03));
    vmpLabel(t.s, xx + t.w / 2, size * 0.32, size, { key: 'cap' + t.s, halo: false, c: t.hi ? hi : VMP.ink, weight: t.hi ? 700 : 500, reveal: rev });
    if (t.hi) vmpInk(vmpSmooth([[xx - 2, size * 0.55], [xx + t.w * 0.3, size * 0.5], [xx + t.w * 0.7, size * 0.6], [xx + t.w + 4, size * 0.5]], false, 6), { c: hi, w: 3.4, key: 'capu' + t.s, frac: ev(at + 0.3 + (k + t.s.length) * 0.03, 0.25), amt: 0.6 });
    xx += t.w; k += t.s.length;
  }
  ctx.restore();
}
//   o: x (70, the left edge), y (300, the centre), size (44), at (0.25)
function vmpTagNow(str, o = {}) {
  const p = EZ.o3(ev(E0 + (o.at ?? 0.25), 0.3)) * vmpBridgeK(); if (p <= 0.06) return;
  const size = o.size ?? 44, tw = vmpLabelW(str, size, { caps: true }), w = tw + size * 2.3, h = size * 1.7, x = (o.x ?? 70) + w / 2, y = o.y ?? 300;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.02); ctx.scale(lerp(0.12, 1, p), 1);
  const P = rrectPts(-w / 2, -h / 2, w, h, 12, 4);
  ctx.save(); ctx.translate(5, 7); vmpPoly(P, true); ctx.fillStyle = vmpA(VMP.burn, 0.3); ctx.fill(); ctx.restore();
  vmpPoly(P, true); ctx.fillStyle = VMP.paperL; ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = vmpA(VMP.burn, 0.15); ctx.lineWidth = 14; vmpPoly(P, true); ctx.stroke(); ctx.restore();
  vmpInk(P, { closed: true, key: 'tag' + str, w: 3.2, amt: 0.7 }); vmpInk(rrectPts(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 7, 3), { closed: true, key: 'tagi' + str, w: 1.3, amt: 0.5, al: 0.6 });
  for (const sd of [-1, 1]) { const dx = sd * (w / 2 - size * 0.6); ctx.beginPath(); ctx.moveTo(dx, -9); ctx.lineTo(dx + 7, 0); ctx.lineTo(dx, 9); ctx.lineTo(dx - 7, 0); ctx.closePath(); ctx.fillStyle = VMP.ink; ctx.fill(); }
  vmpLabel(str, 0, size * 0.34, size, { caps: true, key: 'tag' + str, halo: false, reveal: clamp(p * 2 - 0.7) });
  ctx.restore();
}
const vmpCaption = (str, o = {}) => { const f = () => vmpCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const vmpTag = (str, o = {}) => { const f = () => vmpTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'vintage-map',
  paper: VMP.paper,
  // the bare sheet in colour c (hex, or rgb() mid-morph) under the parchment's stains, creases and burnt edges
  // (during a bridge a faint rhumb web shows on the blank sheet, so the morph still happens on a map)
  backdrop(c, o) {
    ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.drawImage(vmpPaperTex(), 0, 0);
    if (o && o.phase) { const k = o.phase === 'shrink' ? o.u : o.phase === 'grow' ? 1 - o.u : 1; if (k > 0.02) vmpRhumb(W / 2, H * 0.46, { al: 0.8 * k, nodes: 0 }); }
    ctx.restore();
  },
  // the era seen through a medallion: a heavy and a fine ink ring with a ladder of ticks between them, thinning onto the object
  window(P, key, src, o = {}) {
    ctx.save(); vmpPoly(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, k = o.phase === 'grow' ? Math.min(1, u * 5) : Math.min(1, (1 - u) * 5); if (k < 0.04) return;
    const ce = vmpCentroid(P), out = P.map(([x, y]) => { const d = Math.hypot(x - ce[0], y - ce[1]) || 1, g = 16 * k; return [x + (x - ce[0]) / d * g, y + (y - ce[1]) / d * g]; });
    ctx.save(); ctx.strokeStyle = VMP.ink; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.8 * k; ctx.beginPath();
    const Q = resample(P, true, 16), Q2 = resample(out, true, 16 * (pathLen(out) / (pathLen(P) || 1)));
    for (let i = 0; i < Math.min(Q.length, Q2.length); i++) { ctx.moveTo(Q[i][0], Q[i][1]); ctx.lineTo(Q2[i][0], Q2[i][1]); }
    ctx.stroke(); ctx.restore();
    vmpInk(out, { closed: true, key: key + 'o', w: 2 * k, amt: 0.8, al: k });
    vmpInk(P, { closed: true, key, w: 1 + 4 * k, amt: 0.8 });
  },
  // the morphing shape: an island being redrawn — a wash in the blended colour inside an inked shore; the lake's inner
  // contour lines fade out as the city's crenellated wall fades in, and fading contour lines ring it outside
  blob(P, c, key, u = 0) {
    const ce = vmpCentroid(P), bb = bbox(P), r = (bb.x1 - bb.x0 + bb.y1 - bb.y0) / 4, inner = (d) => P.map(([x, y]) => [ce[0] + (x - ce[0]) * (r - d) / r, ce[1] + (y - ce[1]) * (r - d) / r]);
    vmpWash(P, VMP.paperL, { key: key + 'p', al: 0.85, edge: false, blooms: 0 }); vmpWash(P, c, { key: key + 'w', al: 0.78, blooms: 2 });
    ctx.save(); ctx.strokeStyle = VMP.ink; ctx.lineCap = 'round';
    for (let k = 1; k <= 2; k++) { trace(wobble(inner(13 * k * 1.1), true, 1, key + 'i' + k, 9), true); ctx.lineWidth = 2 - 0.4 * k; ctx.globalAlpha = 0.6 / k * (1 - u); ctx.stroke(); }
    const I = inner(15), n = Math.min(P.length, I.length); ctx.globalAlpha = 0.8 * u; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < n; i++) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(I[i][0], I[i][1]); } ctx.stroke(); ctx.restore();
    vmpInk(I, { closed: true, key: key + 'in', w: 2, al: u, amt: 0.9 });
    vmpCoast(P, { closed: true, style: 'lines', key, w: 4, raw: true });
    const q = P[Math.floor(clamp(0.08 + u * 0.5) * P.length) % P.length]; vmpPen(q[0], q[1]);   // the quill that is redrawing it
  },
  hero(x, y, r, o = {}) { vmpHero(x, y + r, r, { key: o.key, mood: o.mood === 'wow' ? 'wow' : 'happy' }); },
  heroColor: VMP.madder,
  heroPts(x, y, r) { return vmpHeroPts(x, y, r); },
  // the reader's lamp: a soft dark corner all round, in screen space (cached)
  post() { ctx.save(); screen(); ctx.drawImage(vmpVignette(), 0, 0); ctx.restore(); },
  ones: false,
};
