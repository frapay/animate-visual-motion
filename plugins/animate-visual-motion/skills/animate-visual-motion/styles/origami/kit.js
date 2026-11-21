// =====================================================================
//  styles/origami/kit.js — ORIGAMI: folded paper models photographed on a plain tabletop. Every subject is a small
//  number of LARGE flat paper facets (6–20) meeting along straight creases. What makes it paper and not 3D render:
//  each facet is one flat tone of its paper colour, lighter or darker only by how it faces one soft light (top-left);
//  creases show as a thin dark valley line or a thin light mountain ridge; the paper has TWO sides (a coloured face
//  and a white reverse) and the reverse shows wherever a flap is folded over; facets carry faint paper fibres and a
//  very soft gradient near a fold; a model casts ONE soft contact shadow on a calm matte table with lots of empty
//  space, which may carry a faint crease-pattern diagram (dashed valley / dash-dot mountain lines) and instruction arrows.
//  Motion on 1s. The signature move is FOLDING: a flap is mirrored across its crease with its width scaled through
//  zero (oriFold), switching from face to reverse colour as it passes edge-on, shading as it turns, settling with one
//  small bounce. Nothing squashes or stretches: paper is rigid.
//  Built on kit/core.js. Helpers are prefixed ori…; the palette is ORI. Needs from the piece head: W, H, FPS (CX optional).
// =====================================================================
const ORI = {
  table: '#e5e2db',     // neutral pale-grey table: the ground a morph happens on (STYLE.paper)
  blue: '#cbdde5',      // a pale blue table (water, morning, calm)
  kraft: '#c8a57a',     // a warm kraft table (wood, afternoon, warmth)
  white: '#f8f5ee',     // the REVERSE side of every sheet; also tags, caption strips, pleats
  verm: '#e2472d',      // vermilion: RESERVED for the hero (the crane)
  indigo: '#2f4b8c',    // the calm second paper: boats, weight
  mustard: '#e3ab2f',   // small bright things: stars, a far boat
  sage: '#8db08c',      // quiet living things: butterflies, leaves
  ink: '#35323b',       // lettering, diagram lines, arrows
};
const ORI_LIT = [255, 250, 238], ORI_SHD = [40, 34, 62];      // what a facet turns toward in the light / away from it
const ORI_FONT = '"Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", "Noto Sans", "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
const ORI_L = (() => { const v = [-0.5, -0.6, 0.62], n = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / n); })();   // the one light: top-left, toward the viewer
const ORI_SH = [0.6, 0.8];                                    // the way shadows fall on the table (away from the light)
const ORI_W = Math.SQRT2 - 1;                                 // tan 22.5°: the kite-fold ratio

// ---------------------------------------------------------------------
//  colour (accepts '#rrggbb' or 'rgb(r,g,b)')
// ---------------------------------------------------------------------
const ORI_RGBS = {};
function oriRGB(c) { if (c[0] === '#') return ORI_RGBS[c] || (ORI_RGBS[c] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
// a facet's flat tone: paper colour c turned toward the light (s > 0) or away from it (s < 0), s in -1..1
function oriTone(c, s = 0) {
  const v = oriRGB(c), w = s >= 0 ? ORI_LIT : ORI_SHD, k = s >= 0 ? Math.min(1, s) * 0.55 : Math.min(1, -s) * 0.62;
  return `rgb(${Math.round(v[0] + (w[0] - v[0]) * k)},${Math.round(v[1] + (w[1] - v[1]) * k)},${Math.round(v[2] + (w[2] - v[2]) * k)})`;
}
const oriShdCol = (al) => `rgba(${ORI_SHD[0]},${ORI_SHD[1]},${ORI_SHD[2]},${al})`;
// Lambert for a normal [x, y, z] (z toward the viewer; screen y down): a facet flat on the table = 0, lit > 0, shaded < 0
function oriLambert(n, L = ORI_L) {
  let [x, y, z] = n; if (z < 0) { x = -x; y = -y; z = -z; }
  const d = (x * L[0] + y * L[1] + z * L[2]) / (Math.hypot(x, y, z) || 1);
  return clamp(d >= L[2] ? (d - L[2]) / (1 - L[2]) : (d - L[2]) / L[2], -1, 1);
}

// ---------------------------------------------------------------------
//  geometry: straight edges only
// ---------------------------------------------------------------------
const oriZ = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
function oriPath(P) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
const oriCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
function oriArea(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
const oriLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// signed distance of p from the line a -> b (positive on the side of the normal (-uy, ux))
function oriDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; return (dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / (Math.hypot(dx, dy) || 1); }
function oriMirror(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, d = oriDist(p, a, b); return [p[0] + 2 * d * dy / L, p[1] - 2 * d * dx / L]; }
// the part of polygon P on side sg (+1 / -1) of the line a -> b
function oriClip(P, a, b, sg) {
  const out = [], n = P.length;
  for (let i = 0; i < n; i++) {
    const p = P[i], q = P[(i + 1) % n], sp = sg * oriDist(p, a, b), sq = sg * oriDist(q, a, b);
    if (sp >= -1e-9) out.push(p);
    if ((sp > 1e-9 && sq < -1e-9) || (sp < -1e-9 && sq > 1e-9)) out.push(oriLerp(p, q, sp / (sp - sq)));
  }
  return out;
}
// a model's placement: local point -> world. Scale sc, rotation rot (radians) about the local pivot (px, py)
function oriT(x, y, sc = 1, rot = 0, px = 0, py = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return (p) => [x + (px + (p[0] - px) * c - (p[1] - py) * s) * sc, y + (py + (p[0] - px) * s + (p[1] - py) * c) * sc];
}

// ---------------------------------------------------------------------
//  timing: a fold is a spring that reaches flat, bounces back ONCE a few degrees and settles
//   oriBounce(u)      folds progress past 1 back (paper cannot pass through paper)
//   oriGo(t0, d)      0..1 progress of a fold that starts at t0 and has settled after d seconds
//   oriSteps(ts, d)   a model's step counter: +1 per fold time in ts (integer part = folds done, fraction = the fold in hand)
// ---------------------------------------------------------------------
const oriBounce = (u) => (u <= 0 ? 0 : u > 1 ? 2 - u : u);
function oriGo(t0, d = 0.4) { const k = (6.6 / d) ** 2; return oriBounce(springEase(TT - t0, k, 1.4 * Math.sqrt(k))); }
const oriSteps = (ts, d = 0.4) => ts.reduce((a, t) => a + oriGo(t, d), 0);

// ---------------------------------------------------------------------
//  paper: fibres inside every facet (one seeded tile), grain and a soft vignette over the finished photograph
// ---------------------------------------------------------------------
let ORI_FIB = null, ORI_GRAIN = null;
function oriFibre() {
  if (ORI_FIB) return ORI_FIB;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d'), R = RNG('ori-fibre');
  for (let i = 0; i < 620; i++) {
    const x = R.r(0, 256), y = R.r(0, 256), a = R.r(0, TAU), l = R.r(3, 12);
    g.strokeStyle = R.f() < 0.5 ? 'rgba(255,255,255,0.11)' : 'rgba(40,34,62,0.075)'; g.lineWidth = R.r(0.5, 1.2);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = R.f() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(40,34,62,0.07)'; g.fillRect(R.r(0, 256), R.r(0, 256), 1.3, 1.3); }
  return (ORI_FIB = g.createPattern(cv, 'repeat'));
}
function oriGrain() {
  if (ORI_GRAIN) return ORI_GRAIN;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), R = RNG('ori-grain'), n = Math.round(W * H / 150);
  g.fillStyle = 'rgba(40,34,62,0.055)'; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, W), R.r(0, H), 1.5, 1.5); g.fill();
  g.fillStyle = 'rgba(255,252,244,0.07)'; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, W), R.r(0, H), 1.5, 1.5); g.fill();
  const v = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.5, W / 2, H * 0.46, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, 'rgba(30,24,50,0)'); v.addColorStop(1, 'rgba(30,24,50,0.16)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  return (ORI_GRAIN = cv);
}
// the table: one matte colour under the soft light (brighter toward the top-left, falling off to the far corner)
function oriTable(c) {
  ctx.save(); screen();
  ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.26, H * 0.2, 40, W * 0.26, H * 0.2, Math.hypot(W, H) * 0.95);
  g.addColorStop(0, 'rgba(255,252,244,0.30)'); g.addColorStop(0.5, 'rgba(255,252,244,0.05)'); g.addColorStop(1, 'rgba(30,24,50,0.12)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the three marks of the medium: a facet, a crease, a contact shadow
// ---------------------------------------------------------------------
// one flat facet: polygon P of paper c at tone s. o.fold = [[a, b, kind?], ...] adds the soft gradient beside those
// creases (kind 'm' = a lit ridge, default = a darker valley); o.soft = its reach in px (44); o.plain = no fibres
function oriFacet(P, c, s = 0, o = {}) {
  if (P.length < 3) return;
  const z = oriZ(), col = oriTone(c, s);
  oriPath(P); ctx.fillStyle = ctx.strokeStyle = col; ctx.lineWidth = 1.2 / z; ctx.lineJoin = 'round'; ctx.fill(); ctx.stroke();
  ctx.save(); oriPath(P); ctx.clip();
  const bb = bbox(P, 2), ce = oriCentroid(P);
  for (const f of o.fold || []) {
    const [a, b, kind] = f, d = oriDist(ce, a, b); if (Math.abs(d) < 0.5) continue;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * Math.sign(d), ny = (b[0] - a[0]) / L * Math.sign(d);
    const reach = Math.min(o.soft ?? 44, Math.abs(d) * 1.6), g = ctx.createLinearGradient(a[0], a[1], a[0] + nx * reach, a[1] + ny * reach);
    g.addColorStop(0, kind === 'm' ? 'rgba(255,252,244,0.22)' : oriShdCol(0.2)); g.addColorStop(1, kind === 'm' ? 'rgba(255,252,244,0)' : oriShdCol(0));
    ctx.fillStyle = g; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  }
  if (!o.plain) { ctx.fillStyle = oriFibre(); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); }
  ctx.restore();
}
// a crease from a to b: 'v' valley = a thin dark line whose far wall catches a little light, 'm' mountain = a thin
// light ridge with a little shade behind it, 'e' = a folded edge (a quiet light line). o: w (2), al (1), frac (draw-on)
function oriCrease(a, b, kind = 'v', o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const z = oriZ(), w = (o.w ?? 2) / z, q = oriLerp(a, b, f), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let ox = -(b[1] - a[1]) / L, oy = (b[0] - a[0]) / L; if (ox * ORI_L[0] + oy * ORI_L[1] > 0) { ox = -ox; oy = -oy; }   // away from the light
  const line = (dx, dy, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0] + dx, a[1] + dy); ctx.lineTo(q[0] + dx, q[1] + dy); ctx.stroke(); };
  ctx.save(); ctx.globalAlpha *= o.al ?? 1; ctx.lineCap = 'round';
  if (kind === 'm') { line(ox * w * 0.9, oy * w * 0.9, oriShdCol(0.2), w); line(0, 0, 'rgba(255,253,246,0.8)', w); }
  else if (kind === 'e') line(0, 0, 'rgba(255,253,246,0.5)', w * 0.8);
  else { line(ox * w * 0.9, oy * w * 0.9, 'rgba(255,253,246,0.34)', w); line(0, 0, oriShdCol(0.46), w); }
  ctx.restore();
}
// the ONE soft contact shadow of a model: polys = the polygons it is made of (drawn as one shape, so overlaps do not
// add up). o.lift 0..1 = how far the model stands off the table (a flat sheet ~0.1, a standing model 1), o.al (0.3)
function oriShadow(polys, o = {}) {
  polys = polys.filter((P) => P && P.length > 2); if (!polys.length) return;
  const lift = o.lift ?? 0.5, z = oriZ(), OFF = 20000;
  ctx.save();
  ctx.shadowColor = oriShdCol(o.al ?? 0.3); ctx.shadowBlur = ((o.blur ?? 30) * lift + 5) * z;
  ctx.shadowOffsetX = OFF + ((o.d ?? 30) * lift + 3) * ORI_SH[0] * z; ctx.shadowOffsetY = ((o.d ?? 30) * lift + 3) * ORI_SH[1] * z;
  const m = ctx.getTransform(); ctx.setTransform(m.a, m.b, m.c, m.d, m.e - OFF, m.f);   // the shape itself is drawn off-canvas: only its shadow lands
  ctx.fillStyle = '#000'; ctx.beginPath();
  for (const P of polys) { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
  ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  shading a list of facets from the light
//   oriShade(facets, o)   each facet { P, n: [x, y, z] } (a normal), or { P, P3: [[x, y, z], ...] } (3D corners), or
//                         { P, tilt: [dirAngle, amount] } (leaning toward the screen direction dirAngle by amount 0..1).
//                         Sets f.s = (f.ds || 0) + o.amp (0.85) x Lambert. o.light = another light direction.
//   oriFacets(facets, o)  shades (if needed) and draws them back to front: f.c || o.c, f.fold; then o.creases
//                         [[a, b, kind], ...] and, unless o.shadow === false, the one contact shadow first (o.lift)
// ---------------------------------------------------------------------
function oriShade(facets, o = {}) {
  const L = o.light ? (() => { const n = Math.hypot(...o.light); return o.light.map((x) => x / n); })() : ORI_L;
  for (const f of facets) {
    let n = f.n;
    if (!n && f.P3) { const [A, B, C] = f.P3, u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]; n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; }
    if (!n && f.tilt) n = [Math.cos(f.tilt[0]) * f.tilt[1], Math.sin(f.tilt[0]) * f.tilt[1], Math.sqrt(Math.max(0, 1 - f.tilt[1] ** 2))];
    f.s = (f.ds || 0) + (o.amp ?? 0.85) * oriLambert(n || [0, 0, 1], L);
  }
  return facets;
}
function oriFacets(facets, o = {}) {
  if (facets.some((f) => f.s == null)) oriShade(facets, o);
  if (o.shadow !== false) oriShadow(facets.map((f) => f.P), { lift: o.lift ?? 0.6 });
  for (const f of facets) oriFacet(f.P, f.c ?? o.c ?? ORI.verm, f.s, f);
  for (const [a, b, kind] of o.creases || []) oriCrease(a, b, kind);
}

// ---------------------------------------------------------------------
//  THE FOLD
//   oriFoldPts(P, [a, b], u, side, whole)   geometry only. The flap is the part of P on `side` of the crease a -> b
//        (side = +1 / -1, or a point on the flap's side, or omitted = the smaller part); whole = true: all of P is the
//        flap (it is hinged on the crease). u = 0 flat as drawn, 0.5 edge-on, 1 mirrored across the crease.
//        -> { stay, flap0, flap, k (width factor 1 .. -1), th (angle), a, b, n, side, d0, chord }
//   oriFoldDraw(g, o)   draws it: stay in the face colour, the flap in o.c while its face shows and o.rev once it has
//        passed edge-on, toned by the angle it has turned, its cast shadow on the paper below, the crease.
//        o: c (face), rev (reverse, white), s (base tone), ds (the flap's extra tone), stay (false = flap only),
//           behind (true = a mountain fold: the flap goes behind the paper), shadow (false = none), crease (false = none)
//   oriFold(P, cr, u, o)   both. o.side / o.whole as above.
//   oriFoldMap(g, T)       the same fold placed with a model transform (oriT)
// ---------------------------------------------------------------------
function oriFoldPts(P, cr, u, side, whole) {
  const [a, b] = cr, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
  if (Array.isArray(side)) side = oriDist(side, a, b) >= 0 ? 1 : -1;
  let flap0, stay;
  if (whole) { flap0 = P; stay = []; if (side == null) side = oriDist(oriCentroid(P), a, b) >= 0 ? 1 : -1; }
  else {
    const pos = oriClip(P, a, b, 1), neg = oriClip(P, a, b, -1);
    if (side == null) side = oriArea(pos) <= oriArea(neg) ? 1 : -1;
    flap0 = side > 0 ? pos : neg; stay = side > 0 ? neg : pos;
  }
  const th = Math.PI * oriBounce(u), k = Math.cos(th), d0 = flap0.map((p) => oriDist(p, a, b));
  const flap = flap0.map((p, i) => [p[0] - n[0] * d0[i] * (1 - k), p[1] - n[1] * d0[i] * (1 - k)]);
  let lo = 1e9, hi = -1e9;
  flap0.forEach((p, i) => { if (Math.abs(d0[i]) < 1e-6 * L + 1e-9) { const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (L * L); lo = Math.min(lo, t); hi = Math.max(hi, t); } });
  const chord = hi > lo ? [oriLerp(a, b, lo), oriLerp(a, b, hi)] : [a, b];
  return { stay, flap0, flap, k, th, a, b, n, side, d0, chord };
}
function oriFoldMap(g, T) {
  const a = T(g.a), b = T(g.b), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, L0 = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]) || 1;
  return { ...g, stay: g.stay.map(T), flap0: g.flap0.map(T), flap: g.flap.map(T), a, b, chord: g.chord.map(T), n: [-(b[1] - a[1]) / L, (b[0] - a[0]) / L], d0: g.d0.map((d) => d * L / L0) };
}
function oriFoldDraw(g, o = {}) {
  const c = o.c ?? ORI.verm, rev = o.rev ?? ORI.white, s0 = o.s ?? 0, th = g.th, sn = Math.sin(th), front = g.k >= 0, dir = o.behind ? -1 : 1;
  if (o.stay !== false && g.stay.length > 2) oriFacet(g.stay, c, s0);
  if (g.flap.length < 3 || (o.behind && !front)) return g;
  const px = g.n[0] * g.side * dir, py = g.n[1] * g.side * dir;
  const s = s0 + (o.ds ?? 0) + Math.max(-0.5, (o.amp ?? 0.8) * oriLambert(front ? [-sn * px, -sn * py, Math.cos(th)] : [sn * px, sn * py, -Math.cos(th)]));
  if (o.shadow !== false && !o.behind && th > 0.03) {   // the flap's shadow on the paper under it: long while it stands, a sliver once it lies flat
    const Q = g.flap.map((p, i) => { const h = Math.min(44, Math.abs(g.d0[i]) * sn * 0.34) + (front ? 0 : Math.min(4, Math.abs(g.d0[i]))); return [p[0] + ORI_SH[0] * h, p[1] + ORI_SH[1] * h]; });
    oriPath(Q); ctx.fillStyle = oriShdCol(0.16); ctx.fill();
  }
  if (Math.abs(g.k) > 0.012) oriFacet(g.flap, front ? c : rev, s, { fold: [[g.a, g.b]] });
  if (o.crease !== false && th > 0.03) oriCrease(g.chord[0], g.chord[1], th > Math.PI - 0.03 ? 'e' : 'v', { al: th > Math.PI - 0.03 ? 0.7 : 0.9 });
  return g;
}
function oriFold(P, cr, u, o = {}) { return oriFoldDraw(oriFoldPts(P, cr, u, o.side, o.whole), o); }

// ---------------------------------------------------------------------
//  ANY OUTLINE INTO THE MEDIUM
//   oriCut(P, o)   outline P (any polygon, world coords) as a piece of folded paper: it is split by straight creases
//        into a few large facets, each one flat tone by which way it leans from the light, the crease lines drawn, one
//        contact shadow under it. o.creases = [[a, b, kind], ...] ('m' mountain / 'v' valley; at most 4). Left out:
//        one mountain crease along the outline's long axis and one valley across it (o.cross = false: the axis only).
//        o: c (paper), s (base tone), amp (how hard the creases are folded, 0.5), shadow (false), lift, lines (false)
//   oriPleatFill(P, o)  the same outline as a fan of parallel pleats: o.n pleats (6) at angle o.a (radians, 0)
// ---------------------------------------------------------------------
function oriAxis(P) {   // centroid, long-axis direction and half-extent of an outline
  const ce = oriCentroid(P); let xx = 0, xy = 0, yy = 0;
  for (const p of P) { const x = p[0] - ce[0], y = p[1] - ce[1]; xx += x * x; xy += x * y; yy += y * y; }
  const a = 0.5 * Math.atan2(2 * xy, xx - yy), d = [Math.cos(a), Math.sin(a)];
  const R = Math.max(...P.map((p) => Math.abs((p[0] - ce[0]) * d[0] + (p[1] - ce[1]) * d[1])));
  return { ce, d, R };
}
function oriHalf(a, b, sg) {   // clip to one side of the line a -> b
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, G = 6000;
  ctx.beginPath(); ctx.moveTo(a[0] - ux * G, a[1] - uy * G); ctx.lineTo(b[0] + ux * G, b[1] + uy * G);
  ctx.lineTo(b[0] + ux * G - uy * sg * G, b[1] + uy * G + ux * sg * G); ctx.lineTo(a[0] - ux * G - uy * sg * G, a[1] - uy * G + ux * sg * G); ctx.closePath(); ctx.clip();
}
function oriCut(P, o = {}) {
  const c = o.c ?? ORI.verm, bb = bbox(P, 6), amp = o.amp ?? 0.5, s0 = o.s ?? 0, LL = Math.hypot(ORI_L[0], ORI_L[1]);
  let cr = o.creases;
  if (!cr) {
    const { ce, d, R } = oriAxis(P), e = [ce[0] + d[0] * R * 0.28, ce[1] + d[1] * R * 0.28];
    cr = [[[ce[0] - d[0] * R * 2, ce[1] - d[1] * R * 2], [ce[0] + d[0] * R * 2, ce[1] + d[1] * R * 2], 'm']];
    if (o.cross !== false) cr.push([[e[0] + d[1] * R * 2, e[1] - d[0] * R * 2], [e[0] - d[1] * R * 2, e[1] + d[0] * R * 2], 'v']);
  }
  cr = cr.slice(0, 4);
  if (o.shadow !== false) oriShadow([P], { lift: o.lift ?? 0.6 });
  oriPath(P); ctx.fillStyle = ctx.strokeStyle = oriTone(c, s0); ctx.lineWidth = 1.2 / oriZ(); ctx.lineJoin = 'round'; ctx.fill(); ctx.stroke();
  ctx.save(); oriPath(P); ctx.clip();
  for (let m = 0; m < 1 << cr.length; m++) {
    ctx.save(); let s = s0;
    cr.forEach(([a, b, kind], i) => {
      const sg = (m >> i) & 1 ? 1 : -1, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * sg, ny = (b[0] - a[0]) / L * sg;
      oriHalf(a, b, sg);
      s += amp * (nx * ORI_L[0] + ny * ORI_L[1]) / LL * (kind === 'v' ? -0.7 : 1);   // a mountain's side that leans to the light is lit; a valley's is shaded
    });
    ctx.fillStyle = oriTone(c, s); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
    ctx.restore();
  }
  ctx.fillStyle = oriFibre(); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  if (o.lines !== false) for (const [a, b, kind] of cr) oriCrease(a, b, kind || 'm', { al: clamp(amp / 0.3) });
  ctx.restore();
}
function oriPleatFill(P, o = {}) {
  const n = o.n ?? 6, a = o.a ?? 0, d = [Math.cos(a), Math.sin(a)], ce = oriCentroid(P);
  const ts = P.map((p) => (p[0] - ce[0]) * d[0] + (p[1] - ce[1]) * d[1]), t0 = Math.min(...ts), t1 = Math.max(...ts), bb = bbox(P, 6), amp = o.amp ?? 0.3;
  const at = (i) => { const t = lerp(t0, t1, i / n), q = [ce[0] + d[0] * t, ce[1] + d[1] * t]; return [[q[0] - d[1] * 4000, q[1] + d[0] * 4000], [q[0] + d[1] * 4000, q[1] - d[0] * 4000]]; };
  if (o.shadow !== false) oriShadow([P], { lift: o.lift ?? 0.6 });
  ctx.save(); oriPath(P); ctx.clip();
  const lean = (d[0] * ORI_L[0] + d[1] * ORI_L[1]) >= 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    ctx.save(); if (i > 0) oriHalf(...at(i), 1); if (i < n - 1) oriHalf(...at(i + 1), -1);
    ctx.fillStyle = oriTone(o.c ?? ORI.verm, (o.s ?? 0) + amp * (i % 2 ? -1 : 0.8) * lean); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.restore();
  }
  ctx.fillStyle = oriFibre(); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  for (let i = 1; i < n; i++) oriCrease(...at(i), i % 2 ? 'm' : 'v');
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the table's diagram: a crease pattern and instruction arrows, printed faintly on the ground
//   oriPattern(x, y, half, o)   a square sheet's crease pattern, half = half its side. o.lines = 'bird' | 'boat' or
//        [[x1, y1, x2, y2, kind], ...] in -1..1; valley = dashed, mountain = dash-dot. o: rot (radians), al (0.3),
//        in (0..1: the lines are ruled one after another), march (px/s: the dashes creep), c
//   oriArrow(a, b, o)   a fold arrow from a to b, bowed by o.bend (0.3 of its length), with an open head.
//        o: frac (draw-on), al, c, w
// ---------------------------------------------------------------------
const ORI_CP = {
  bird: (() => {
    const t = 2 * ORI_W - 1, L = [[-1, -1, 1, 1, 'm'], [-1, 1, 1, -1, 'm'], [0, -1, 0, 1, 'v'], [-1, 0, 1, 0, 'v']];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { L.push([sx, sy, -sx, sy * -t, 'v']); L.push([sx, sy, sx * -t, -sy, 'v']); }
    return L;
  })(),
  boat: [[-1, 0, 1, 0, 'v'], [-1, 0, -0.58, 1, 'v'], [1, 0, 0.58, 1, 'v'], [-0.52, 0, 0.08, 0.98, 'm'], [0.62, 0, 0.08, 0.98, 'm'], [0.08, 0, 0.08, 0.98, 'v'], [-1, 0.3, 1, 0.3, 'm'], [-1, -1, 0, 0, 'm'], [1, -1, 0, 0, 'm']],
};
function oriPattern(x, y, half, o = {}) {
  const lines = typeof o.lines === 'string' ? ORI_CP[o.lines] : o.lines || ORI_CP.bird, T = oriT(x, y, half, o.rot ?? 0), z = oriZ(), u = o.in ?? 1;
  if (u <= 0) return;
  ctx.save(); ctx.globalAlpha *= o.al ?? 0.3; ctx.strokeStyle = o.c ?? ORI.ink; ctx.lineWidth = (o.w ?? 1.7) / z; ctx.lineCap = 'butt';
  const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(T), per = subPath(sq, clamp(u * 2));
  ctx.beginPath(); ctx.moveTo(per[0][0], per[0][1]); for (let i = 1; i < per.length; i++) ctx.lineTo(per[i][0], per[i][1]); ctx.stroke();
  lines.forEach(([x1, y1, x2, y2, kind], i) => {
    const f = clamp(u * 2 * lines.length - lines.length * 0.6 - i * 0.7); if (f <= 0) return;
    const a = T([x1, y1]), b = oriLerp(a, T([x2, y2]), f);
    ctx.setLineDash(kind === 'm' ? [16 / z, 6 / z, 3 / z, 6 / z] : [10 / z, 8 / z]); ctx.lineDashOffset = -(o.march ?? 0) * TT / z * (i % 2 ? -1 : 1);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  });
  ctx.restore();
}
function oriArrow(a, b, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0 || (o.al ?? 1) <= 0) return;
  const z = oriZ(), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, bend = (o.bend ?? 0.3) * L, m = [(a[0] + b[0]) / 2 - (b[1] - a[1]) / L * bend, (a[1] + b[1]) / 2 + (b[0] - a[0]) / L * bend];
  const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * m[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * m[1] + t * t * b[1]]); }
  const Q = subPath(pts, f), e = Q[Q.length - 1], p = Q[Math.max(0, Q.length - 2)], ang = Math.atan2(e[1] - p[1], e[0] - p[0]), hl = (o.head ?? 20) / z;
  ctx.save(); ctx.globalAlpha *= o.al ?? 1; ctx.strokeStyle = o.c ?? ORI.ink; ctx.lineWidth = (o.w ?? 2.4) / z; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]);
  if (f > 0.25) { ctx.moveTo(e[0] - Math.cos(ang - 0.42) * hl, e[1] - Math.sin(ang - 0.42) * hl); ctx.lineTo(e[0], e[1]); ctx.lineTo(e[0] - Math.cos(ang + 0.42) * hl, e[1] - Math.sin(ang + 0.42) * hl); }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  small folded things (each one: a few facets, two sides, one shadow)
//   oriStar(x, y, r, o)       a five-point folded star, ten facets. o: c, rev, rot, in (0..1: its points fold out of the
//                             middle one after another, white side first), lift
//   oriButterfly(x, y, r, o)  four wing facets hinged on the body crease. o: c, rev (the lower wings), rot,
//                             flap (0 flat .. 1 wings up), lift
//   oriPleat(x, y, n, o)      an accordion strip of n rigid panels centred on (x, y). o: len (each panel, 44), h (28),
//                             ang (the fold angle, radians: 0.2 nearly flat .. 1.3 squeezed shut), c, rot, lift
// ---------------------------------------------------------------------
function oriStar(x, y, r, o = {}) {
  const c = o.c ?? ORI.mustard, rev = o.rev ?? ORI.white, T = oriT(x, y, r, o.rot ?? 0), u = o.in ?? 1; if (u <= 0) return;
  const O = [], I = [], LL = Math.hypot(ORI_L[0], ORI_L[1]);
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; O.push([Math.cos(a), Math.sin(a)]); I.push([Math.cos(a + TAU / 10) * 0.42, Math.sin(a + TAU / 10) * 0.42]); }
  const tone = (A, B) => { const m = oriCentroid([A, B]), l = Math.hypot(m[0], m[1]) || 1; return 0.34 * (m[0] * ORI_L[0] + m[1] * ORI_L[1]) / l / LL; };
  const core = [], arms = [];
  for (let i = 0; i < 5; i++) {
    const i0 = I[(i + 4) % 5], i1 = I[i], m = oriLerp(i0, i1, 0.5), ui = clamp(u * 2.2 - i * 0.3);
    for (const [p, q, ds] of [[i0, m, 0.1], [m, i1, -0.1]]) {
      const s = tone(p === i0 ? i0 : O[i], p === i0 ? O[i] : i1) + ds;
      core.push({ P: [[0, 0], p, q].map(T), s });
      arms.push({ g: oriFoldMap(oriFoldPts([p, q, O[i]], [i0, i1], 1 - ui, O[i], true), T), s });
    }
  }
  oriShadow([...core.map((f) => f.P), ...arms.map((f) => f.g.flap)], { lift: o.lift ?? 0.35 });
  for (const f of core) oriFacet(f.P, c, f.s, { plain: r < 30 });
  // a point folded in shows the reverse; folded out (u = 0 of the fold) it shows the face
  for (const f of arms) oriFoldDraw(f.g, { c, rev, s: f.s, amp: 0.5, stay: false, crease: false, shadow: f.g.th > 0.03 });
  if (u >= 1) for (let i = 0; i < 5; i++) { oriCrease(T([0, 0]), T(O[i]), 'm', { w: 1.6, al: 0.8 }); oriCrease(T([0, 0]), T(I[i]), 'v', { w: 1.4, al: 0.5 }); }
}
function oriButterfly(x, y, r, o = {}) {
  const c = o.c ?? ORI.sage, rev = o.rev ?? ORI.white, T = oriT(x, y, r, o.rot ?? 0), u = clamp(o.flap ?? 0) * 0.4, ax = [[0, -1], [0, 1]];
  const up = [[0, -0.12], [0.95, -0.78], [0.78, 0.06], [0, 0.22]], lo = [[0, 0.16], [0.66, 0.2], [0.5, 0.86], [0, 0.46]], mir = (P) => P.map(([px, py]) => [-px, py]);
  const parts = [[lo, rev, -0.04, 1], [mir(lo), rev, 0.04, -1], [up, c, -0.04, 1], [mir(up), c, 0.06, -1]].map(([P, col, ds, sd]) => ({ g: oriFoldMap(oriFoldPts(P, ax, u, [sd, 0], true), T), col, ds }));
  oriShadow(parts.map((p) => p.g.flap), { lift: (o.lift ?? 0.4) + u });
  for (const p of parts) oriFoldDraw(p.g, { c: p.col, rev: p.col, ds: p.ds, stay: false, shadow: false, crease: false });
  oriCrease(T([0, -0.2]), T([0, 0.5]), 'v', { w: 2.4 });
  ctx.save(); ctx.strokeStyle = o.ink ?? ORI.ink; ctx.lineWidth = 1.6 / oriZ(); ctx.lineCap = 'round'; ctx.globalAlpha *= 0.7;
  for (const sx of [-1, 1]) { const a = T([0, -0.18]), b = T([sx * 0.2, -0.56]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.restore();
}
function oriPleat(x, y, n, o = {}) {
  const len = o.len ?? 44, h = o.h ?? 28, ang = o.ang ?? 0.45, dx = len * Math.cos(ang), dy = len * Math.sin(ang), T = oriT(x, y, 1, o.rot ?? 0), c = o.c ?? ORI.white;
  const F = [];
  for (let i = 0; i < n; i++) {
    const x0 = (i - n / 2) * dx, x1 = x0 + dx, y0 = i % 2 ? -dy / 2 : dy / 2, y1 = -y0;
    F.push({ P: [[x0, y0 - h / 2], [x1, y1 - h / 2], [x1, y1 + h / 2], [x0, y0 + h / 2]].map(T), s: (i % 2 ? 0.3 : -0.34) * Math.sin(ang) + 0.04 });
  }
  oriShadow(F.map((f) => f.P), { lift: o.lift ?? 0.25 });
  for (const f of F) oriFacet(f.P, c, f.s);
}

// ---------------------------------------------------------------------
//  the boat: a sheet (white side up) folded in three moves into a hull with white bow and stern flaps and a white sail
//   oriBoat(x, y, a, o)   (x, y) = the centre of the sheet, a = half its side. o: step (0 flat sheet .. 3 the boat:
//        1 the top half comes down, 2 the two lower corners fold up, 3 the sail stands), c (hull), rev, rot (rocks on
//        the keel), lift (how far it stands off the table). Default step 3.
//   oriBoatPts(x, y, a, rot)   the finished boat's outline (for bridges)
// ---------------------------------------------------------------------
const ORI_BOAT = { q: 0.42, sail: [[-0.52, 0], [0.62, 0], [0.08, 0.98]], rim: 0.3 };
function oriBoat(x, y, a, o = {}) {
  const st = o.step ?? 3, c = o.c ?? ORI.indigo, rev = o.rev ?? ORI.white, q = ORI_BOAT.q, T = oriT(x, y, a, o.rot ?? 0, 0, 1), M = (P) => P.map(T);
  const polys = [], draws = [], small = a < 80;
  const flat = (P, col, s, f) => { const Q = M(P); polys.push(Q); draws.push(() => oriFacet(Q, col, s, f)); };
  const fold = (P, cr, u, side, f) => { const g = oriFoldMap(oriFoldPts(P, cr, u, side, f.whole), T); if (f.stay !== false) polys.push(g.stay); polys.push(g.flap); draws.push(() => oriFoldDraw(g, small ? { ...f, shadow: false } : f)); return g; };
  if (st < 1) fold([[-1, -1], [1, -1], [1, 1], [-1, 1]], [[-1, 0], [1, 0]], st, [0, -1], { c: rev, rev: c });
  else {
    const rm = ORI_BOAT.rim;   // the hull: a lit rim above a mountain crease, the shaded side below it
    flat([[-1, 0], [1, 0], [1 - q * rm, rm], [-1 + q * rm, rm]], c, 0.1);
    flat([[-1 + q * rm, rm], [1 - q * rm, rm], [1 - q, 1], [-1 + q, 1]], c, -0.1);
    draws.push(() => oriCrease(T([-1 + q * rm, rm]), T([1 - q * rm, rm]), 'm', { al: 0.45, w: small ? 1.2 : 2 }));
    const uc = clamp(st - 1);
    fold([[-1, 0], [-1 + q, 1], [-1, 1]], [[-1, 0], [-1 + q, 1]], uc, null, { whole: true, stay: false, c, rev, ds: 0.04 });
    fold([[1, 0], [1, 1], [1 - q, 1]], [[1 - q, 1], [1, 0]], uc, null, { whole: true, stay: false, c, rev, ds: -0.1 });
    if (st > 1.999) {
      const us = clamp(st - 2), [s0, s1, tip] = ORI_BOAT.sail, m = [tip[0], 0], cr = [[-1, 0], [1, 0]];
      fold([s0, m, tip], cr, us, tip, { whole: true, stay: false, c, rev, ds: 0.1, crease: false });
      const g = fold([m, s1, tip], cr, us, tip, { whole: true, stay: false, c, rev, ds: -0.2, crease: false });
      draws.push(() => { if (us > 0.02) { oriCrease(T(m), g.flap[2], 'm', { al: Math.abs(g.k) }); oriCrease(T(s0), T(s1), us > 0.97 ? 'e' : 'v'); } });
    }
  }
  if (o.shadow !== false) oriShadow(polys, { lift: o.lift ?? (st >= 2.9 ? 0.8 : 0.12), d: small ? 12 : 30, blur: small ? 10 : 30 });
  draws.forEach((f) => f());
}
function oriBoatPts(x, y, a, rot = 0) {
  const q = ORI_BOAT.q, [s0, s1, tip] = ORI_BOAT.sail;
  return [[-1, 0], s0, [tip[0], -tip[1]], s1, [1, 0], [1 - q, 1], [-1 + q, 1]].map(oriT(x, y, a, rot, 0, 1));
}

// ---------------------------------------------------------------------
//  THE HERO: the classic crane, ten facets. It is folded from a square standing on its corner:
//   step 0 the flat sheet (a diamond, face up)   1 the top half folded down (a white triangle)
//   2 both corners folded in to the centre line (the kite)   3 opened: the far wing (its white reverse showing), the
//   tail and the neck swing out from behind the body, the near wing lifts off it, the belly tip tucks away
//   4 the head is folded down (white beak)
//   oriCrane(x, y, r, o)   (x, y) = the centre of the sheet (the middle of the crane's back), r = half its wingspan.
//        o: step (default 4), c, rev, rot (it rocks on its flat base), flap (0..1 the near wing dips toward you),
//           flap2 (the far wing), lift (how far it stands off the table), shadow (false = none)
//   oriCranePts(x, y, r, rot)   the finished crane's outline; oriSheetPts(x, y, r) the diamond it starts from
// ---------------------------------------------------------------------
const ORI_CR = {
  wingF: [[-0.36, 0.079], [0.34, -0.002]], wingN: [[-0.38, -0.04], [0.36, 0.055]], neck: [[-0.30, 0.093], [-0.05, -0.074]], tail: [[0.04, -0.076], [0.30, 0.08]],
  belly: 0.42, head: 0.72,
};
function oriCrane(x, y, r, o = {}) {
  const d = r / 0.95, st = o.step ?? 4, c = o.c ?? ORI.verm, rev = o.rev ?? ORI.white, w = ORI_W, K = ORI_CR;
  const T = oriT(x, y, d, o.rot ?? 0, 0, K.belly), M = (P) => P.map(T), polys = [], draws = [];
  const flat = (P, col, s, f) => { const Q = M(P); polys.push(Q); draws.push(() => oriFacet(Q, col, s, f)); };
  const fold = (P, cr, u, side, f) => {
    const g = oriFoldMap(oriFoldPts(P, cr, u, side, f.whole), T);
    if (f.stay !== false) polys.push(g.stay); if (!(f.behind && g.k < 0)) polys.push(g.flap);
    draws.push(() => oriFoldDraw(g, f)); return g;
  };
  if (st < 1) fold([[0, -1], [1, 0], [0, 1], [-1, 0]], [[-1, 0], [1, 0]], st, [0, -1], { c, rev });
  else if (st < 2) {
    const u = st - 1;
    flat([[-w, 0], [w, 0], [0, 1]], rev, 0);
    fold([[-1, 0], [-w, 0], [0, 1]], [[-w, 0], [0, 1]], u, null, { whole: true, stay: false, c: rev, rev: c, ds: 0.1 });
    fold([[1, 0], [w, 0], [0, 1]], [[0, 1], [w, 0]], u, null, { whole: true, stay: false, c: rev, rev: c, ds: -0.13 });
  } else {
    const op = clamp(st - 2), hd = clamp(st - 3), B = [0, 1], bx = w * (1 - K.belly);
    const uF = op * (1 - 0.13 * (o.flap2 ?? 0)), uN = op * (1 - 0.15 * (o.flap ?? 0));
    // behind the body: the far wing (its reverse shows once it is up), the tail, the neck
    const mF = oriLerp(K.wingF[0], K.wingF[1], 0.55);
    fold([K.wingF[0], mF, B], K.wingF, uF, B, { whole: true, stay: false, c, rev, ds: 0.02, amp: 0.45, crease: false });
    const gF = fold([mF, K.wingF[1], B], K.wingF, uF, B, { whole: true, stay: false, c, rev, ds: -0.14, amp: 0.45, crease: false });
    draws.push(() => oriCrease(T(mF), gF.flap[2], 'v', { al: 0.6 * Math.abs(gF.k) }));
    fold([K.tail[0], K.tail[1], [0, 0.92]], K.tail, op, [0, 0.92], { whole: true, stay: false, c, rev: c, ds: -0.12, crease: false });
    if (hd <= 0.001) fold([K.neck[0], K.neck[1], [0, 0.92]], K.neck, op, [0, 0.92], { whole: true, stay: false, c, rev: c, ds: 0.06, crease: false });
    else {
      const tip = oriMirror([0, 0.92], K.neck[0], K.neck[1]), yh = lerp((K.neck[0][1] + K.neck[1][1]) / 2, tip[1], K.head);
      fold([K.neck[0], K.neck[1], tip], [[-2, yh], [2, yh]], hd, tip, { c, rev, s: 0.06, ds: -0.1 });
    }
    // the body: two facets about the ridge of the back; its belly tip tucks up behind it
    fold([[-bx, K.belly], [bx, K.belly], B], [[-1, K.belly], [1, K.belly]], op, B, { whole: true, stay: false, behind: true, c, rev: c, s: -0.05, crease: false });
    flat([[0, -w], [0, K.belly], [-bx, K.belly], [-w, 0]], c, 0.1);
    flat([[0, -w], [w, 0], [bx, K.belly], [0, K.belly]], c, -0.13);
    draws.push(() => oriCrease(T([0, -w]), T([0, K.belly]), 'm', { al: 0.9 }));
    // in front: the near wing, two facets about its own ridge
    const mN = oriLerp(K.wingN[0], K.wingN[1], 0.45);
    fold([K.wingN[0], mN, B], K.wingN, uN, B, { whole: true, stay: false, c, rev: c, ds: 0.1, amp: 0.45, crease: false });
    const gN = fold([mN, K.wingN[1], B], K.wingN, uN, B, { whole: true, stay: false, c, rev: c, ds: -0.1, amp: 0.45, crease: false });
    draws.push(() => { oriCrease(T(mN), gN.flap[2], 'm', { al: 0.85 * Math.max(0.25, Math.abs(gN.k)) }); oriCrease(T(K.wingN[0]), T(K.wingN[1]), 'v', { al: 0.75 }); });
  }
  if (o.shadow !== false) oriShadow(polys, { lift: o.lift ?? (st < 2 ? 0.12 : 0.12 + 0.78 * clamp(st - 2)), d: 34 * Math.min(1, d / 300), blur: 34 * Math.min(1, d / 300) });
  draws.forEach((f) => f());
}
const ORI_CRANE_OUT = [[-0.95, -0.21], [-0.79, -0.36], [-0.65, -0.36], [-0.32, -0.2], [-0.22, -0.9], [-0.014, -0.57], [0.25, -0.95], [0.33, -0.25], [0.9, -0.58], [0.3, 0.08], [0.414, 0], [0.24, 0.42], [-0.24, 0.42], [-0.414, 0]];
const oriCranePts = (x, y, r, rot = 0) => ORI_CRANE_OUT.map(oriT(x, y, r / 0.95, rot, 0, ORI_CR.belly));
const oriSheetPts = (x, y, r) => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(oriT(x, y, r / 0.95));

// ---------------------------------------------------------------------
//  lettering: a clean light sans, small and quiet
// ---------------------------------------------------------------------
function oriFont(size, weight = 400, track = 0.02) { ctx.font = `${weight} ${size}px ${ORI_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${(size * track).toFixed(2)}px`; }
function oriTextW(str, size, weight = 400, track = 0.02) { ctx.save(); oriFont(size, weight, track); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// o: align ('left' | 'center' | 'right'), weight (400), track (0.02 em), al
function oriText(str, x, y, size, c = ORI.ink, o = {}) {
  ctx.save(); oriFont(size, o.weight, o.track); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha *= o.al ?? 1;
  const w = ctx.measureText(str).width; ctx.fillStyle = c; ctx.fillText(str, x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0), y);
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  tag and caption (through DEFER: after the camera, at screen size). Both are lifted off the table as a bridge
//  starts and laid down again once the next era is open.
//  The TAG is a little white paper strip whose left end is folded over, showing the era's paper colour.
//  The CAPTION is a white paper strip that unfolds from its middle (its coloured reverse shows as it opens), then
//  its two top corners are dog-eared; *word* is set a little heavier in the paper colour.
// ---------------------------------------------------------------------
function oriBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.2);
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
//   o: x (64), y (262: the strip's top), size (30), c (the folded end: indigo), at (seconds after the era starts, 0.3)
function oriTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.3), k = oriBridgeK(); if (k <= 0 || TT < at - 0.3) return;
  const x = o.x ?? 64, y = o.y ?? 262, size = o.size ?? 30, c = o.c ?? ORI.indigo, h = size * 2.1, fw = size * 1.1;
  const w = fw + size * 0.75 + oriTextW(str, size, 500, 0.1) + size * 0.8, sl = (1 - EZ.o3(seg(TT, at - 0.3, at))) * -(x + w + fw + 40), u = oriGo(at, 0.35);
  ctx.save(); ctx.globalAlpha *= k; ctx.translate(x + sl, y); ctx.rotate(-0.035);
  const g = oriFoldPts([[-fw, 0], [w, 0], [w, h], [-fw, h]], [[0, 0], [0, h]], u, [-1, 0]);
  oriShadow([g.stay, g.flap], { lift: 0.14 });
  oriFoldDraw(g, { c: ORI.white, rev: c });
  if (u > 0.5) oriText(str, fw + size * 0.75, h / 2 + size * 0.35, size, o.col ?? ORI.ink, { weight: 500, track: 0.1, al: seg(u, 0.5, 1) });
  ctx.restore();
}
//   o: x (CX), y (1400: the strip's centre line), size (50), c (the reverse and the *word*: vermilion),
//      at (0.5), w (820: the widest the strip may be)
function oriCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = oriBridgeK(); if (k <= 0 || TT < at) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), cy = o.y ?? 1400, c = o.c ?? ORI.verm, maxW = o.w ?? 820;
  let size = o.size ?? 50;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { let tw = 0; toks.forEach((t, i) => { t.w = oriTextW(t.s, size, t.hi ? 600 : 400); t.gap = i === 0 ? 0 : /^[!?.,:;]/.test(t.s) ? 0 : size * 0.3; tw += t.w + t.gap; }); return tw; };
  let tw = lay(); if (tw + size * 2.2 > maxW) { size *= (maxW - size * 2.2) / tw; tw = lay(); }
  const w = tw + size * 2.2, h = size * 2, x0 = cx - w / 2, y0 = cy - h / 2, e = size * 0.5;
  const u = oriGo(at, 0.45), ue = oriGo(at + 0.5, 0.3);
  ctx.save(); ctx.globalAlpha *= k;
  if (ue <= 0) {   // the strip opens: its right half unfolds off the left half
    const g = oriFoldPts([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], [[cx, y0], [cx, y0 + h]], 1 - u, [x0 + w, cy]);
    oriShadow([g.stay, g.flap], { lift: 0.16 }); oriFoldDraw(g, { c: ORI.white, rev: c });
  } else {         // then both top corners are dog-eared
    const body = [[x0 + e, y0], [x0 + w - e, y0], [x0 + w, y0 + e], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0 + e]];
    const gl = oriFoldPts([[x0, y0], [x0 + e, y0], [x0, y0 + e]], [[x0 + e, y0], [x0, y0 + e]], ue, null, true);
    const gr = oriFoldPts([[x0 + w, y0], [x0 + w, y0 + e], [x0 + w - e, y0]], [[x0 + w, y0 + e], [x0 + w - e, y0]], ue, null, true);
    oriShadow([body, gl.flap, gr.flap], { lift: 0.16 }); oriFacet(body, ORI.white, 0);
    oriFoldDraw(gl, { c: ORI.white, rev: c, stay: false }); oriFoldDraw(gr, { c: ORI.white, rev: c, stay: false, ds: -0.08 });
    oriCrease([cx, y0 + 2], [cx, y0 + h - 2], 'v', { al: 0.35, w: 1.6 });
  }
  const ta = seg(TT, at + 0.3, at + 0.55);
  if (ta > 0) {
    let xx = cx - tw / 2;
    for (const t of toks) { xx += t.gap; oriText(t.s, xx, cy + size * 0.35, size, t.hi ? oriTone(c, -0.25) : o.col ?? ORI.ink, { weight: t.hi ? 600 : 400, al: ta }); xx += t.w; }
  }
  ctx.restore();
}
const oriTag = (str, o = {}) => { const f = () => oriTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const oriCaption = (str, o = {}) => { const f = () => oriCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'origami',
  paper: ORI.table,
  // the bare table in colour c (hex, or rgb() mid-morph) under the same soft light
  backdrop(c) { oriTable(c); },
  // the era seen as a picture on a sheet of paper cut to the bridge shape, lying on the table: its one soft shadow
  // and a light paper edge, both strongest when the sheet is small
  window(P, key, src, o = {}) {
    const u = o.u ?? 0, k = o.phase === 'grow' ? 1 - u : u;
    ctx.save();
    oriShadow([P], { lift: 0.15 + 0.5 * k });
    oriPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); oriPath(P); ctx.strokeStyle = `rgba(255,253,246,${0.55 * k})`; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: one sheet of paper in the blended colour, lifted off the table and flexed about a centre
  // mountain crease (and a cross valley) that is folded hardest halfway through, so the unfolding and refolding reads
  blob(P, c, key, u = 0) {
    const q = Math.sin(Math.PI * clamp(u)), ce = oriCentroid(P);
    oriCut(P, {
      c, amp: 0.1 + 0.3 * q, lift: 0.2 + 0.6 * q,
      creases: [[[ce[0], ce[1] - 3000], [ce[0], ce[1] + 3000], 'm'], [[ce[0] - 3000, ce[1]], [ce[0] + 3000, ce[1]], 'v']],
    });
  },
  hero(x, y, r, o = {}) { oriCrane(x, y + r * 0.22, r, { flap: 0.4 }); },
  heroColor: ORI.verm,
  heroPts(x, y, r) { return oriCranePts(x, y + r * 0.22, r); },
  // the photograph's finish: fine grain and a soft vignette
  post() { ctx.save(); screen(); ctx.drawImage(oriGrain(), 0, 0); ctx.restore(); },
  ones: true,
};
