// =====================================================================
//  styles/art-nouveau/kit.js — ART NOUVEAU: a lithographic poster from around 1900, printed on cream paper.
//  LINE is the star: a dark olive-brown contour of varying weight (thick on the outside of a form, hair-thin inside)
//  around flat, muted, slightly chalky colour with at most ONE soft tonal step. Everything is organic: whiplash
//  S-curves, stems that swell and taper, tendrils ending in tight spirals, lily / iris / poppy / ginkgo forms,
//  dragonfly and peacock-feather motifs. The composition is architectural: a tall arched panel in an ornamental
//  border, a big halo disc with a repeating pattern behind the subject, foliage in the corner spandrels, a plinth,
//  and a lettering cartouche at the bottom.
//  Motion on 1s, slow, ease-in-out only: stems GROW along their path with the thickness swelling behind the tip,
//  tendrils curl into their spirals, leaves unfurl in sequence, flowers open petal by petal, the halo fills ring by
//  ring, the border draws itself from the bottom corners up and meets at the top.
//  Built on kit/core.js. Helpers are prefixed nou…; the palette is NOU. Needs from the piece head: W, H, FPS.
// =====================================================================
const NOU = {
  paper: '#efe4c8',     // cream stock: the sheet, the ground of the morph
  line: '#3b3220',      // the key drawing: dark olive-brown contour, lettering
  cream: '#f6eeda',     // the lightest flat: lily petals, the cartouche, beads, highlights
  sage: '#b3bd92',      // quiet green: spandrels, leaves, panel tints
  olive: '#75803f',     // stems, the plinth, the deeper green
  rose: '#d9a79b',      // dusty rose: the lily's halo, petals, buds
  roseD: '#b9777a',     // the rose's one tonal step; the caption accent
  ochre: '#d3a650',     // ochre: the iris's halo, beads, anthers
  gold: '#b08428',      // old gold: the ochre's tonal step (flat, never shiny)
  teal: '#3f807d',      // peacock teal: the hero, feather eyes, the second panel
  tealL: '#8fb9ae',     // pale teal: wings, the teal's light step
  aub: '#5b3a55',       // aubergine: iris falls, eyes, the darkest flat
  mauve: '#8a6485',     // the aubergine's light step: iris falls
  lilac: '#b9a0b6',     // the lightest violet: iris standards
};
const NOU_FONT = '"Cochin", "Big Caslon", "Hoefler Text", "Palatino Linotype", "Book Antiqua", "URW Palladio L", "P052", "Georgia", "DejaVu Serif", serif';
// the poster plate: outer rounded plate, a band of beads, the arched panel inside it
const NOU_PANEL = { x0: 44, x1: 1036, y0: 100, y1: 1812, r: 44, band: 36, spring: 600, apex: 150 };

// ---------------------------------------------------------------------
//  timing: ease-in-out everywhere. nouE(u) eases 0..1; nouIn(t0, d) = eased progress of a move starting at t0.
// ---------------------------------------------------------------------
const nouE = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const nouIn = (t0, d = 0.8) => nouE((TT - t0) / d);

// ---------------------------------------------------------------------
//  stone and paper: the chalky unevenness inside a flat (one seeded tile) and the litho grain over the sheet
// ---------------------------------------------------------------------
let NOU_CHALK = null, NOU_GRAIN = null;
function nouChalk() {
  if (NOU_CHALK) return NOU_CHALK;
  const T = 256, c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d'), R = RNG('nouchalk');
  for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(246,238,218,${R.r(0.02, 0.05).toFixed(3)})`; const x = R.r(0, T), y = R.r(0, T), r = R.r(14, 46); for (const [ox, oy] of [[0, 0], [T, 0], [-T, 0], [0, T], [0, -T]]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, TAU); g.fill(); } }
  for (let i = 0; i < 1500; i++) { g.fillStyle = R.f() < 0.78 ? `rgba(246,238,218,${R.r(0.12, 0.4).toFixed(3)})` : `rgba(59,50,32,${R.r(0.06, 0.14).toFixed(3)})`; const s = R.r(0.8, 2.2); g.fillRect(R.r(0, T), R.r(0, T), s, s * R.r(0.6, 1.5)); }
  return (NOU_CHALK = g.createPattern(c, 'repeat'));
}
function nouGrain() {
  if (NOU_GRAIN) return NOU_GRAIN;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = RNG('nougrain'), n = Math.round(W * H / 300);
  g.fillStyle = 'rgba(59,50,32,0.085)'; g.beginPath(); for (let i = 0; i < n; i++) { const s = R.r(1, 2); g.rect(R.r(0, W), R.r(0, H), s, s); } g.fill();
  g.fillStyle = 'rgba(255,250,232,0.17)'; g.beginPath(); for (let i = 0; i < n; i++) { const s = R.r(1, 2.2); g.rect(R.r(0, W), R.r(0, H), s, s); } g.fill();
  g.fillStyle = 'rgba(59,50,32,0.05)'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(R.r(0, W), R.r(0, H), R.r(1.5, 3.5), 0, TAU); g.fill(); }   // a few stone pits
  return (NOU_GRAIN = c);
}

// ---------------------------------------------------------------------
//  curves and paths
//   nouCurve(C, n, closed)      a smooth curve through control points C (Catmull-Rom), n samples per span
//   nouWhip(x0, y0, x1, y1, amp, n)   a whiplash S-curve from one point to another (amp = how far it swings)
//   nouSpiral(Q, { r, turns, dir })   Q with a tightening spiral added to its end, tangent to it
//   nouBend(Q, ang, pow)        Q bent progressively about its root (the tip turns by ang radians): sway
//   nouAt(Q, f)                 [point, heading] at fraction f of Q's length
//   nouAdd(P, sharp)            add the closed outline P to the current path (smoothed unless sharp)
// ---------------------------------------------------------------------
function nouCurve(C, n = 12, closed = false) {
  const m = C.length, out = [], g = (i) => (closed ? C[mod(i, m)] : C[clamp(i, 0, m - 1)]), spans = closed ? m : m - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t, q = [0, 0];
      for (const k of [0, 1]) q[k] = 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
      out.push(q);
    }
  }
  if (!closed) out.push(C[m - 1]);
  return out;
}
function nouWhip(x0, y0, x1, y1, amp = 30, n = 40) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, o = amp * Math.sin(t * TAU) * (1 - 0.35 * t); P.push([lerp(x0, x1, t) + nx * o, lerp(y0, y1, t) + ny * o]); }
  return P;
}
function nouSpiral(Q, sp = {}) {
  const n = Q.length, a = Q[n - 2], b = Q[n - 1], th = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const dir = sp.dir ?? 1, r = sp.r ?? 30, turns = sp.turns ?? 1.6, a0 = th - dir * Math.PI / 2;
  const cx = b[0] - Math.cos(a0) * r, cy = b[1] - Math.sin(a0) * r, m = Math.ceil(turns * 28), out = Q.slice();
  for (let i = 1; i <= m; i++) { const u = i / m, ang = a0 + dir * u * turns * TAU, rr = r * (0.1 + 0.9 * (1 - u) ** 1.25); out.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]); }
  return out;
}
function nouBend(Q, ang, pw = 2.2) {
  const tot = pathLen(Q) || 1, out = [Q[0]]; let s = 0;
  for (let i = 1; i < Q.length; i++) {
    s += dist(Q[i - 1], Q[i]);
    const a = ang * (s / tot) ** pw, c = Math.cos(a), sn = Math.sin(a), dx = Q[i][0] - Q[0][0], dy = Q[i][1] - Q[0][1];
    out.push([Q[0][0] + dx * c - dy * sn, Q[0][1] + dx * sn + dy * c]);
  }
  return out;
}
function nouAt(Q, f) {
  const S = subPath(Q, clamp(f)), n = S.length, b = S[n - 1];
  let a = null; for (let j = n - 2; j >= 0 && !a; j--) if (dist(S[j], b) > 0.05) a = S[j];
  if (!a) return [b, Math.atan2(Q[1][1] - Q[0][1], Q[1][0] - Q[0][0])];
  return [b, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
function nouAdd(P, sharp) {
  const n = P.length; if (n < 3) return;
  if (sharp) { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); return; }
  ctx.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
  for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.closePath();
}
const nouCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const nouScaled = (P, c, k) => P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);

// ---------------------------------------------------------------------
//  THE LINE
//   nouRibbon(P, wa, wb, c, tot)   a stroke of varying weight along the open path P: wa(f) / wb(f) = the half-widths
//                                  on either side at fraction f (of `tot` px, default P's own length), filled with c
//   nouContour(P, w, o)            the contour of a closed outline: thickest (w) where the edge faces o.light
//                                  (radians, default down-right), thinning to o.thin * w on the far side
// ---------------------------------------------------------------------
function nouRibbon(P, wa, wb, c, tot) {
  const n = P.length; if (n < 2) return;
  const T = tot || pathLen(P) || 1, A = [], Bq = []; let s = 0;
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let nx = a[1] - b[1], ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if (i) s += dist(P[i - 1], P[i]);
    const f = s / T, w1 = wa(f), w2 = wb(f);
    A.push([P[i][0] + nx * w1, P[i][1] + ny * w1]); Bq.push([P[i][0] - nx * w2, P[i][1] - ny * w2]);
  }
  ctx.beginPath(); ctx.moveTo(A[0][0], A[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(A[i][0], A[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(Bq[i][0], Bq[i][1]);
  ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  const r0 = (wa(0) + wb(0)) / 2; if (r0 > 0.9) { ctx.beginPath(); ctx.arc(P[0][0], P[0][1], r0, 0, TAU); ctx.fill(); }   // a round root
}
function nouContour(P, w, o = {}) {
  const n = P.length; if (n < 3 || w <= 0) return;
  let A = 0; for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; }
  const sg = A > 0 ? 1 : -1, th0 = o.light ?? 0.9, thin = o.thin ?? 0.42, O = [], I = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = sg * dy / l, ny = -sg * dx / l, wi = w * (thin + (1 - thin) * (0.5 + 0.5 * Math.cos(Math.atan2(ny, nx) - th0)));
    O.push([P[i][0] + nx * wi * 0.62, P[i][1] + ny * wi * 0.62]); I.push([P[i][0] - nx * wi * 0.38, P[i][1] - ny * wi * 0.38]);
  }
  ctx.beginPath(); nouAdd(O, o.sharp); nouAdd(I, o.sharp); ctx.fillStyle = o.line || NOU.line; ctx.fill('evenodd');
}

// ---------------------------------------------------------------------
//  ANY OUTLINE IN THE MEDIUM: nouShape(P, o) draws the closed outline P as flat chalky colour inside a contour.
//   o.c      the flat (hex or rgb()); omit for line only          o.line   contour colour (false = none)
//   o.w      contour weight at its thickest (5)                   o.thin / o.light  see nouContour
//   o.shade  the ONE tonal step: a second flat on the side away from the light; o.sh = [dx, dy] how far it reaches
//   o.veins  open paths drawn hair-thin inside (midribs, folds); o.vw their weight (1.5)
//   o.inside(bb)  draw more inside the shape (clipped): a pattern, a band
//   o.chalk  false = no chalk texture (tiny parts)                o.sharp  true = keep corners (straight polygon)
// ---------------------------------------------------------------------
function nouShape(P, o = {}) {
  if (P.length < 3) return;
  if (o.c) {
    ctx.beginPath(); nouAdd(P, o.sharp); ctx.fillStyle = o.c; ctx.fill();
    if (o.shade || o.inside || o.chalk !== false) {
      const bb = bbox(P, 8);
      ctx.save(); ctx.clip();
      if (o.shade) {
        const d = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.17, sh = o.sh ?? [-d, -d * 0.8];
        ctx.beginPath(); ctx.rect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); nouAdd(P.map(([x, y]) => [x + sh[0], y + sh[1]]), o.sharp);
        ctx.fillStyle = o.shade; ctx.fill('evenodd');
      }
      if (o.chalk !== false) { ctx.save(); ctx.globalAlpha *= 0.55; ctx.fillStyle = nouChalk(); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.restore(); }
      if (o.inside) o.inside(bb);
      ctx.restore();
    }
  }
  if (o.veins) {
    ctx.save(); ctx.strokeStyle = o.line || NOU.line; ctx.lineWidth = o.vw ?? 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const V of o.veins) if (V.length > 1) { trace(V, false); ctx.stroke(); }
    ctx.restore();
  }
  if (o.line !== false) nouContour(P, o.w ?? 5, o);
}

// ---------------------------------------------------------------------
//  outlines of the vocabulary (local coordinates: base at 0,0, pointing along +x; place them with nouPlace)
//   nouLeafPts(len, w, o)   a leaf / petal / wing: o.bend (0.12: how far the midrib bows, as a fraction of len),
//                           o.s (true = S-curved midrib), o.fat (0.8: <1 widest near the base, >1 near the tip),
//                           o.round (1 = pointed ends, 0.5 = a broad rounded tip). Returns { P, rib }.
//   nouGinkgoPts(r)         a ginkgo fan with its notch          nouCartPts(cx, cy, w, h)  the soft cartouche plate
// ---------------------------------------------------------------------
function nouLeafPts(len, w, o = {}) {
  const n = o.n ?? 14, bend = (o.bend ?? 0.12) * len, q = o.fat ?? 0.8, e = o.round ?? 1, A = [], Bq = [], rib = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = t * len, m = bend * Math.sin(t * Math.PI) * (o.s ? 1.7 * Math.cos(t * Math.PI) : 1), hw = (w / 2) * Math.sin(Math.PI * t ** q) ** e;
    rib.push([x, m]); if (i > 0 && i < n) { A.push([x, m - hw]); Bq.push([x, m + hw]); }
  }
  return { P: [[0, 0], ...A, [len, 0], ...Bq.reverse()], rib };
}
const nouPlace = (L, x, y, rot = 0, s = 1) => ({ P: xform(L.P, x, y, rot, s), rib: xform(L.rib, x, y, rot, s) });
function nouGinkgoPts(r, n = 26) {
  const P = [[0, 0], [r * 0.2, -r * 0.02]];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (t - 0.5) * 1.95, rr = r * (0.93 + 0.05 * Math.cos(t * TAU * 4)) * (1 - 0.3 * Math.exp(-(((t - 0.5) / 0.04) ** 2))); P.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  P.push([r * 0.2, r * 0.02]);
  return P;
}
function nouCartPts(cx, cy, w, h, n = 72, p = 0.46) {
  const P = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a); P.push([cx + (w / 2) * Math.sign(c) * Math.abs(c) ** p, cy + (h / 2) * Math.sign(s) * Math.abs(s) ** p]); }
  return P;
}

// ---------------------------------------------------------------------
//  leaves, buds, ginkgo (x, y = the base, rot = the way it points). All take o.c, o.shade, o.lw (contour weight).
// ---------------------------------------------------------------------
function nouLeaf(x, y, len, rot, o = {}) {
  if (len < 3) return;
  const L = nouPlace(nouLeafPts(len, o.w ?? len * 0.26, o), x, y, rot);
  nouShape(L.P, { c: o.c ?? NOU.sage, shade: o.shade, sh: o.sh, w: o.lw ?? 3.6, veins: o.rib === false ? null : [L.rib.slice(1, -2)], vw: o.vw, chalk: o.chalk, light: o.light });
}
function nouBud(x, y, len, rot, o = {}) {
  if (len < 3) return;
  for (const sd of [-1, 1]) nouLeaf(x, y, len * 0.55, rot + sd * 0.55, { w: len * 0.2, c: o.calyx ?? NOU.sage, lw: 2, rib: false, chalk: false, bend: 0.1 * sd });
  nouLeaf(x, y, len, rot, { w: o.w ?? len * 0.5, fat: 1.25, bend: 0.04, c: o.c ?? NOU.rose, shade: o.shade ?? NOU.roseD, lw: o.lw ?? 3 });
}
function nouGinkgo(x, y, r, rot, o = {}) {
  if (r < 3) return;
  const P = xform(nouGinkgoPts(r), x, y, rot), V = [];
  for (const a of [-0.6, -0.3, 0.3, 0.6]) V.push(xform([[r * 0.22, 0], [Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78]], x, y, rot));
  nouShape(P, { c: o.c ?? NOU.ochre, shade: o.shade, w: o.lw ?? 3, veins: o.rib === false ? null : V, vw: 1.2, chalk: o.chalk });
}

// ---------------------------------------------------------------------
//  THE STEM: nouStem(C, o) grows a tapered stem along ANY path, from the root (the first point).
//   C        control points (smoothed with nouCurve), or a ready polyline with o.raw
//   o.grow   0..1: the tip travels along the path; the thickness swells behind it (o.swell = that zone, 0.3 of the length)
//   o.w / o.tip   width at the root / at the tip (14 / 1.6); o.taper (1.6: higher = stays thick longer)
//   o.c      the stem's flat colour inside the contour (omit: a plain dark tendril); o.lw contour weight (3)
//   o.spiral { r, turns, dir: 1 | -1 }   the tip curls into a tight spiral (drawn last, as the growth arrives)
//   o.sway   radians: the tip leans this far (pass a slow sine for idle life); o.swayPow (2.2: higher = only the tip moves)
//   o.leaves [{ at: 0..1 along the stem body, side: 1 | -1, len, ang (0.8), w, kind: 'leaf' | 'bud' | 'ginkgo',
//              c, shade, d (0.2: how much growth it takes to unfurl), draw(p, heading, u) }] — each unfurls as the tip passes
//   Returns { Q (the full path), tip, ang (heading at the tip), grow, at(f) -> [point, heading] }: hang a flower on the tip.
// ---------------------------------------------------------------------
function nouStem(C, o = {}) {
  const g = clamp(o.grow ?? 1);
  let Q = o.raw ? C : nouCurve(C, o.n ?? 12);
  const body = pathLen(Q);
  if (o.spiral) Q = nouSpiral(Q, o.spiral);
  if (o.sway) Q = nouBend(Q, o.sway, o.swayPow ?? 2.2);
  const tot = pathLen(Q) || 1, res = { Q, tip: Q[0], ang: Math.atan2(Q[1][1] - Q[0][1], Q[1][0] - Q[0][0]), grow: g, at: (f) => nouAt(Q, f) };
  if (g <= 0) return res;
  const S = subPath(Q, g), w0 = o.w ?? 14, w1 = o.tip ?? 1.6, tp = o.taper ?? 1.6, sw = o.swell ?? 0.3, line = o.line ?? NOU.line;
  [res.tip, res.ang] = nouAt(Q, g);
  const wAt = (f) => lerp(w1 * 0.7, w1 + (w0 - w1) * (1 - Math.min(1, f) ** tp), nouE((g - f) / sw + 0.04)) / 2;
  for (const lf of o.leaves || []) {
    const f = lf.at * body / tot, u = nouE((g - f) / (lf.d ?? 0.2)); if (u <= 0) continue;
    const [p, th] = nouAt(Q, f), a = th + lf.side * lerp(0.12, lf.ang ?? 0.8, u);
    if (lf.draw) lf.draw(p, th, u);
    else if (lf.kind === 'bud') nouBud(p[0], p[1], lf.len * (0.3 + 0.7 * u), a, lf);
    else if (lf.kind === 'ginkgo') nouGinkgo(p[0], p[1], lf.len * u, a, lf);
    else nouLeaf(p[0], p[1], lf.len * (0.2 + 0.8 * u), a, { ...lf, w: (lf.w ?? lf.len * 0.26) * (0.3 + 0.7 * u), bend: (lf.bend ?? 0.14) * lf.side });
  }
  if (o.c) {
    const lo = o.lw ?? 3;
    nouRibbon(S, (f) => wAt(f) + lo, (f) => wAt(f) + lo * 0.45, line, tot);
    nouRibbon(S, wAt, wAt, o.c, tot);
  } else nouRibbon(S, wAt, wAt, line, tot);
  return res;
}

// ---------------------------------------------------------------------
//  flowers (x, y = where the stem ends, s = petal length, o.rot = the way the flower faces, default up).
//  o.open 0..1 opens it petal by petal from a closed bud; o.breathe (-1..1, a slow sine) lets the petals breathe.
// ---------------------------------------------------------------------
const nouSeq = (op, i, n, lap = 0.6) => nouE(op * (1 + (n - 1) * lap) - i * lap);
function nouLily(x, y, s, o = {}) {
  const op = clamp(o.open ?? 1), ax = o.rot ?? -Math.PI / 2, br = o.breathe ?? 0, c = o.c ?? NOU.cream, sh = o.shade ?? NOU.rose;
  const OFF = [0, 2.2, -2.2, 1.08, -1.08, Math.PI * 0.94];   // three outer tepals, then three inner
  OFF.forEach((off, i) => {
    const u = nouSeq(op, i, 6), a = ax + off * lerp(0.07, 1 + br * 0.025, u), len = s * (i < 3 ? 1 : 0.9) * (0.52 + 0.48 * u) * (1 + br * 0.015);
    const L = nouPlace(nouLeafPts(len, s * 0.38 * (0.42 + 0.58 * u), { fat: 0.92, bend: 0.1 * u * (off > 0 ? 1 : -1), n: 16 }), x, y, a);
    nouShape(L.P, { c, shade: sh, w: 4.2, veins: [L.rib.slice(1, -3)], vw: 1.3 });
  });
  const k = nouE((op - 0.72) / 0.28); if (k <= 0) return;
  for (let j = 0; j < 5; j++) {   // stamens: hair-thin filaments, ochre anthers
    const a = ax + (j - 2) * 0.3 + br * 0.02 * (j - 2), l = s * 0.5 * k, ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
    ctx.save(); ctx.strokeStyle = NOU.line; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(ax) * l * 0.6, y + Math.sin(ax) * l * 0.6, ex, ey); ctx.stroke(); ctx.restore();
    nouShape(ellipsePts(ex, ey, s * 0.055 * k, s * 0.026 * k, a + 1.2, 12), { c: o.anther ?? NOU.gold, w: 1.8, chalk: false });
  }
  nouShape(ellipsePts(x, y, s * 0.06, s * 0.06, 0, 12), { c: NOU.sage, w: 2, chalk: false });
}
function nouIris(x, y, s, o = {}) {
  const op = clamp(o.open ?? 1), ax = o.rot ?? -Math.PI / 2, br = o.breathe ?? 0, c = o.c ?? NOU.mauve, c2 = o.c2 ?? NOU.lilac, sh = o.shade ?? NOU.aub;
  const part = (i, off, len, w, col, shade, bend, beard) => {
    const u = nouSeq(op, i, 6), a = ax + off * lerp(0.05, 1 + br * 0.03, u), l = s * len * (0.5 + 0.5 * u);
    const L = nouPlace(nouLeafPts(l, s * w * (0.3 + 0.7 * u), { fat: lerp(0.9, 1.5, u), round: lerp(1, 0.62, u), bend: bend * u, n: 16 }), x, y, a);
    nouShape(L.P, { c: col, shade, w: 4.2, veins: [L.rib.slice(1, -4)], vw: 1.3 });
    if (beard && u > 0.3) { const Bd = nouPlace(nouLeafPts(l * 0.5, s * 0.1 * u, { bend: bend * u * 0.5, n: 8 }), x, y, a); nouShape(Bd.P, { c: NOU.ochre, w: 1.6, chalk: false }); }
  };
  part(0, 1.72, 1.06, 0.6, c, sh, 0.3, true);         // falls: left and right arch out and droop
  part(1, -1.72, 1.06, 0.6, c, sh, -0.3, true);
  part(3, 0.5, 0.92, 0.5, c2, c, -0.2);             // standards: two leaning out and curling back in, then the tall middle one
  part(4, -0.5, 0.92, 0.5, c2, c, 0.2);
  part(5, 0, 1.06, 0.54, c2, c, 0.03);
  part(2, Math.PI, 0.86, 0.52, c, sh, 0.02, true);  // the fall hanging in front
}
function nouPoppy(x, y, s, o = {}) {
  const op = clamp(o.open ?? 1), ax = o.rot ?? -Math.PI / 2, br = o.breathe ?? 0, c = o.c ?? NOU.rose, sh = o.shade ?? NOU.roseD;
  [Math.PI, 0, 1.55, -1.55].forEach((off, i) => {
    const u = nouSeq(op, i, 4), a = ax + off * lerp(0.06, 1, u), L = nouPlace(nouLeafPts(s * (0.5 + 0.5 * u) * (1 + br * 0.02), s * 1.15 * (0.3 + 0.7 * u), { fat: 1.7, round: 0.5, bend: 0.03, n: 16 }), x, y, a);
    nouShape(L.P, { c, shade: sh, w: 3.8, veins: [L.rib.slice(2, -5)], vw: 1.2 });
  });
  const k = nouE((op - 0.6) / 0.4); if (k <= 0) return;
  nouShape(ellipsePts(x, y, s * 0.2 * k, s * 0.2 * k, 0, 20), { c: o.eye ?? NOU.aub, w: 2.4, chalk: false });
  ctx.save(); ctx.strokeStyle = NOU.cream; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let j = 0; j < 8; j++) { const a = j / 8 * TAU; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * s * 0.15 * k, y + Math.sin(a) * s * 0.15 * k); }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  the peacock feather: a thin stem (control points C) with barbs, ending in the eye. o.grow 0..1 (the stem first,
//  then the eye opens ring by ring), o.s (1 = an eye 150 px long), o.sway, o.cols [fringe, ring, heart, core]
// ---------------------------------------------------------------------
function nouFeather(C, o = {}) {
  const g = clamp(o.grow ?? 1), s = o.s ?? 1, cols = o.cols ?? [NOU.sage, NOU.ochre, NOU.teal, NOU.aub];
  const st = nouStem(C, { grow: nouE(g / 0.7), w: 5 * s, tip: 2, taper: 1, sway: o.sway, swayPow: 2 });
  if (g <= 0) return st;
  const hair = nouE((g - 0.35) / 0.4);
  if (hair > 0) {
    ctx.save(); ctx.strokeStyle = NOU.line; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let j = 0; j < 15; j++) {
      const [p, th] = nouAt(st.Q, 0.985 - j * 0.032), l = (50 - j * 2.6) * s * nouE(hair * 2 - j / 15);
      for (const sd of [-1, 1]) { const a = th + sd * 0.8; ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + Math.cos(th) * l * 0.55, p[1] + Math.sin(th) * l * 0.55, p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l); }
    }
    ctx.stroke(); ctx.restore();
  }
  const k = (g - 0.55) / 0.45; if (k <= 0) return st;
  const [tip, th] = nouAt(st.Q, 1), ex = tip[0] + Math.cos(th) * 62 * s, ey = tip[1] + Math.sin(th) * 62 * s;
  [[150, 100, 0], [104, 70, 1], [70, 48, 2], [40, 30, 3]].forEach(([len, w, i]) => {
    const u = nouE(k * 2.2 - i * 0.4); if (u <= 0) return;
    const l = len * s * u, L = nouPlace(nouLeafPts(l, w * s * u, { fat: 1.25, round: 0.72, bend: 0, n: 16 }), ex - Math.cos(th) * l * 0.52, ey - Math.sin(th) * l * 0.52, th);
    const V = [];
    if (i === 0) for (let j = 2; j < 8; j++) { V.push([[ex, ey], L.P[j * 2 - 1]]); V.push([[ex, ey], L.P[L.P.length - (j * 2 - 1)]]); }   // the fringe's barbs
    nouShape(L.P, { c: cols[i], w: i === 0 ? 3.2 : 2, veins: V, vw: 1, chalk: i < 2 });
  });
  return st;
}

// ---------------------------------------------------------------------
//  the halo: a big disc behind the subject, filled with a repeating pattern that sets itself ring by ring.
//   nouDisc(P, c, o)       the halo's base for ANY outline: flat colour, a rim band one tonal step down, beads
//                          (the morph blob uses it, so a bare halo and the blob match). o.rim (0.86), o.beads (36), o.bead
//   nouHalo(x, y, r, o)    o.c (base), o.kind 'floral' (rings of petals) | 'mosaic' (rings of tesserae),
//                          o.cols (pattern colours), o.rings (3), o.in 0..1 (rings fill from the centre out, each ring
//                          going round), o.key, plus nouDisc's options
// ---------------------------------------------------------------------
function nouDisc(P, c, o = {}) {
  const ce = nouCentroid(P), k = o.rim ?? 0.86, In = nouScaled(P, ce, k), R = P.reduce((a, p) => a + Math.hypot(p[0] - ce[0], p[1] - ce[1]) / P.length, 0);
  nouShape(P, { c, w: o.w ?? 6.5, inside: (bb) => { ctx.beginPath(); ctx.rect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); nouAdd(In); ctx.fillStyle = 'rgba(59,50,32,0.17)'; ctx.fill('evenodd'); } });
  ctx.save(); ctx.beginPath(); nouAdd(In); ctx.strokeStyle = NOU.line; ctx.lineWidth = 2; ctx.stroke();
  const M = resample(nouScaled(P, ce, (1 + k) / 2), true, 3), n = o.beads ?? 36, br = Math.max(2, R * (1 - k) * 0.27);
  ctx.beginPath(); for (let i = 0; i < n; i++) { const p = M[Math.floor(i / n * M.length)]; ctx.moveTo(p[0] + br, p[1]); ctx.arc(p[0], p[1], br, 0, TAU); }
  ctx.fillStyle = o.bead ?? NOU.cream; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}
function nouHalo(x, y, r, o = {}) {
  if (r < 4) return;
  nouDisc(ellipsePts(x, y, r, r, 0, 72), o.c ?? NOU.rose, o);
  const u = clamp(o.in ?? 1), rings = o.rings ?? 3, r0 = r * 0.17, r1 = r * (o.rim ?? 0.86) * 0.97, cols = o.cols ?? [NOU.cream, NOU.roseD, NOU.ochre], mosaic = o.kind === 'mosaic';
  if (u <= 0) return;
  ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = NOU.line; ctx.lineJoin = 'round';
  for (let i = 0; i < rings; i++) {
    const ui = clamp(u * rings - i); if (ui <= 0) continue;
    const ra = lerp(r0, r1, i / rings) + 3, rb = lerp(r0, r1, (i + 1) / rings) - 3, rm = (ra + rb) / 2, n = Math.max(6, Math.round(rm * TAU / ((rb - ra) * (mosaic ? 0.8 : 0.6)))), dir = i % 2 ? -1 : 1, pit = TAU / n;
    const S = mosaic ? RNG('noumos', o.key ?? 'h', i) : null;
    for (let j = 0; j < n; j++) {
      const col = mosaic ? S.pick(cols) : cols[(j + i) % cols.length], m = nouE(ui * n - j); if (m <= 0) continue;
      const a = -Math.PI / 2 + dir * (j + 0.5) * pit, ia = lerp(rm, ra, m), ob = lerp(rm, rb, m);
      ctx.beginPath();
      if (mosaic) { const h = pit * 0.43 * m, j1 = S.n(1.6), j2 = S.n(0.05) * pit; ctx.arc(x, y, ob + j1, a - h + j2, a + h + j2); ctx.arc(x, y, ia + j1, a + h + j2, a - h + j2, true); ctx.closePath(); }
      else { const h = pit * 0.86; ctx.moveTo(x + Math.cos(a) * ia, y + Math.sin(a) * ia); ctx.quadraticCurveTo(x + Math.cos(a - h) * rm, y + Math.sin(a - h) * rm, x + Math.cos(a) * ob, y + Math.sin(a) * ob); ctx.quadraticCurveTo(x + Math.cos(a + h) * rm, y + Math.sin(a + h) * rm, x + Math.cos(a) * ia, y + Math.sin(a) * ia); }
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, rb + 3, -Math.PI / 2, -Math.PI / 2 + dir * ui * TAU, dir < 0); ctx.stroke();   // the ring's hairline goes round with it
  }
  ctx.restore();
  const kc = nouE(u * rings * 1.5);
  nouShape(ellipsePts(x, y, r0 * kc, r0 * kc, 0, 24), { c: cols[0], w: 3, chalk: false });
  nouShape(ellipsePts(x, y, r0 * kc * 0.45, r0 * kc * 0.45, 0, 16), { c: cols[cols.length - 1], w: 2, chalk: false });
}

// ---------------------------------------------------------------------
//  the architecture (all take o.geo, a panel geometry like NOU_PANEL)
//   nouPanel(o)        the plate, the bead band, the corner spandrel flats and the arched panel's tint are printed first
//                      (flat colour); then the key drawing draws itself with o.in 0..1: every line starts at a bottom
//                      corner, climbs and meets its mirror at the top; beads are set as the line passes.
//                      o.tint (panel), o.sp (spandrels), o.frame (band), o.bead
//   nouSpandrel(side, o)   curling foliage growing into a top corner (side -1 left | 1 right): o.in, o.c (stem),
//                      o.leaf, o.bud, o.variant (0 | 1: the two corners are cousins, not mirror images)
//   nouPlinth(o)       the base band inside the panel: a shallow arched top edge and a frieze. o.c, o.y (1520), o.n,
//                      o.motif(x, y, i) draws one frieze motif (default: ginkgo fans), o.cols
// ---------------------------------------------------------------------
function nouPanelGeo(g = NOU_PANEL) { const xa = g.x0 + g.band, xb = g.x1 - g.band, ya = g.y0 + g.band, yb = g.y1 - g.band; return { ...g, xa, xb, ya, yb, cx: (xa + xb) / 2, rx: (xb - xa) / 2, ry: g.spring - g.apex }; }
function nouArchPts(geo, step = 34) {
  const G = nouPanelGeo(geo), P = [[G.xa, G.yb], [G.xa, G.spring]];
  for (let i = 1; i < 44; i++) { const a = Math.PI + Math.PI * i / 44; P.push([G.cx + Math.cos(a) * G.rx, G.spring + Math.sin(a) * G.ry]); }
  P.push([G.xb, G.spring], [G.xb, G.yb]);
  return resample(P, true, step);
}
function nouPanel(o = {}) {
  const G = nouPanelGeo(o.geo), u = clamp(o.in ?? 1), line = o.line ?? NOU.line;
  nouShape(resample(rrectPts(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0, G.r, 8), true, 30), { c: o.frame ?? NOU.cream, line: false });
  nouShape([[G.xa, G.ya], [G.xb, G.ya], [G.xb, G.spring + 8], [G.xa, G.spring + 8]], { c: o.sp ?? NOU.sage, line: false, sharp: true });
  nouShape(nouArchPts(o.geo), { c: o.tint ?? '#e3e0c2', line: false });
  if (u <= 0) return;
  const e = nouE(u), mir = (P) => P.map(([x, y]) => [2 * G.cx - x, y]);
  const draw = (P, w, k = e) => { if (k <= 0) return; for (const Q of [P, mir(P)]) { const wf = (f) => (w / 2) * (1 - 0.28 * f) * (0.4 + 0.6 * nouE((k - f) / 0.12 + 0.05)); nouRibbon(subPath(Q, k), wf, wf, line, pathLen(Q)); } };
  const r = G.r, outer = resample([...arcPts(G.x0 + r, G.y1 - r, r, Math.PI / 2, Math.PI, 6), ...arcPts(G.x0 + r, G.y0 + r, r, Math.PI, 1.5 * Math.PI, 6), [G.cx, G.y0]], false, 26);
  const inner = resample([[G.xa, G.yb], [G.xa, G.ya + 6], [G.xa + 6, G.ya], [G.cx, G.ya]], false, 26), fS = (G.yb - G.spring) / pathLen(inner);
  draw(outer, 8); draw([[G.x0 + r, G.y1], [G.cx, G.y1]], 8, nouE(u * 2.2));
  draw(inner, 3.2); draw([[G.xa, G.yb], [G.cx, G.yb]], 3.2, nouE(u * 2.2));
  draw(arcPts(G.cx, G.spring, G.rx, Math.PI, 1.5 * Math.PI, 40, G.ry / G.rx), 5.5, clamp((e - fS) / (1 - fS)));
  // beads in the band, set as the line climbs past them
  const beads = [], gap = 46, mx = G.x0 + G.band / 2, hh = G.y1 - G.y0;
  for (let y = G.yb - 4; y > G.ya; y -= gap) for (const x of [mx, 2 * G.cx - mx]) beads.push([x, y]);
  for (let x = G.xa + gap / 2; x < G.xb; x += gap) { beads.push([x, G.y1 - G.band / 2]); beads.push([x, G.y0 + G.band / 2]); }
  ctx.save(); ctx.beginPath();
  for (const [x, y] of beads) { const k = nouE((e - (G.y1 - y) / hh * 0.9) / 0.08), br = 6.5 * k; if (br > 0.6) { ctx.moveTo(x + br, y); ctx.arc(x, y, br, 0, TAU); } }
  ctx.fillStyle = o.bead ?? NOU.ochre; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}
function nouSpandrel(side, o = {}) {
  const G = nouPanelGeo(o.geo), g = clamp(o.in ?? 1); if (g <= 0) return;
  const bw = G.cx - G.xa, bh = G.spring - G.ya, X = (u) => G.xa + u * bw, Y = (v) => G.ya + v * bh, pts = (A) => A.map(([u, v]) => [X(u), Y(v)]), v1 = o.variant ? 1 : 0;
  const c = o.c ?? NOU.olive, leaf = o.leaf ?? NOU.cream, bud = o.bud ?? NOU.rose, k = bw / 460;
  ctx.save();
  if (side > 0) { ctx.translate(2 * G.cx, 0); ctx.scale(-1, 1); }
  ctx.beginPath(); ctx.rect(G.xa, G.ya, bw, bh); ctx.clip();
  ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); nouAdd(nouArchPts(o.geo)); ctx.clip('evenodd');
  // the corner tendril first (behind), then the main stem sweeping along the arch to its spiral
  nouStem(pts(v1 ? [[0.06, 0.66], [0.035, 0.44], [0.075, 0.25], [0.15, 0.13]] : [[0.07, 0.62], [0.04, 0.4], [0.07, 0.21], [0.17, 0.1]]), {
    grow: nouE((g - 0.25) / 0.75), w: 7 * k, tip: 1.6, c, lw: 2.4, spiral: { r: (v1 ? 30 : 25) * k, turns: v1 ? 1.5 : 1.8, dir: 1 }, sway: o.sway,
    leaves: [{ at: 0.42, side: -1, len: 50 * k, kind: 'bud', c: bud, ang: 0.5 }],
  });
  nouStem(pts([[0.03, 0.99], [0.05, 0.72], [0.1, 0.46], [0.22, 0.265], [0.38, 0.145], [0.55, 0.078]]), {
    grow: nouE(g / 0.85), w: 12 * k, tip: 1.8, c, lw: 2.8, spiral: { r: 15 * k, turns: 1.4, dir: -1 },
    leaves: [
      { at: 0.16, side: 1, len: 84 * k, ang: 0.75, c: leaf, w: 26 * k }, { at: v1 ? 0.36 : 0.3, side: 1, len: 96 * k, ang: 0.7, c: leaf, w: 30 * k },
      { at: 0.52, side: -1, len: 74 * k, ang: 0.8, c: leaf, w: 24 * k }, { at: v1 ? 0.62 : 0.7, side: 1, len: 60 * k, ang: 0.6, c: leaf, w: 20 * k },
      { at: 0.84, side: -1, len: 42 * k, kind: 'bud', c: bud, ang: 0.6 },
    ],
  });
  ctx.restore();
}
function nouPlinth(o = {}) {
  const G = nouPanelGeo(o.geo), y = o.y ?? 1520, rise = o.rise ?? 28, n = o.n ?? 7, cols = o.cols ?? [NOU.sage, NOU.ochre], top = [];
  for (let i = 0; i <= 28; i++) { const t = i / 28; top.push([lerp(G.xa, G.xb, t), y - rise * Math.sin(t * Math.PI)]); }
  ctx.save(); ctx.beginPath(); nouAdd(nouArchPts(o.geo)); ctx.clip();
  nouShape([...top, [G.xb, G.yb + 4], [G.xa, G.yb + 4]], { c: o.c ?? NOU.olive, line: false, sharp: true });
  for (let i = 0; i < n; i++) {
    const x = lerp(G.xa, G.xb, (i + 0.5) / n), my = lerp(y, G.yb, 0.74);
    if (o.motif) o.motif(x, my, i); else nouGinkgo(x, my, (i % 2 ? 92 : 118), -Math.PI / 2, { c: cols[i % cols.length], lw: 2.8 });
  }
  nouRibbon(top, (f) => 1 + 2.8 * Math.sin(f * Math.PI), (f) => 1 + 2.8 * Math.sin(f * Math.PI), NOU.line);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  idle life
//   nouFall(key, n, o)   n petals / ginkgo leaves drifting down on S-curves inside o.box { x0, x1, y0, y1 }.
//        o.kind 'petal' | 'ginkgo', o.c, o.shade, o.s (size, 26), o.speed (px/s, 90), o.t0 (they start falling then,
//        one after another, from above the box; omit = they are already in the air and wrap round)
//   nouHover(key, amp)   [dx, dy, tilt]: a slow figure-of-eight for something that hovers
// ---------------------------------------------------------------------
function nouFall(key, n, o = {}) {
  const box = o.box ?? { x0: 110, x1: 970, y0: 200, y1: 1500 }, span = box.y1 - box.y0 + 80, sp = o.speed ?? 90;
  for (let i = 0; i < n; i++) {
    const R = RNG('noufall', key, i), x0 = R.r(box.x0, box.x1), ph = R.r(0, TAU), v = sp * R.r(0.75, 1.3), A = R.r(22, 52), per = R.r(2.2, 3.4), s = (o.s ?? 26) * R.r(0.75, 1.2), off = R.f(), tilt = R.n(0.5);
    let yy;
    if (o.t0 != null) { yy = v * (TT - o.t0 - i * (o.every ?? 0.3) - off * 0.2); if (yy < 0 || yy > span) continue; } else yy = mod(v * TT + off * span, span);
    const w = TT * TAU / per + ph, x = x0 + A * Math.sin(w), y = box.y0 - 40 + yy, rot = Math.PI / 2 + 0.9 * Math.cos(w) + tilt;
    if (o.kind === 'ginkgo') nouGinkgo(x, y, s * 1.25, rot, { c: o.c ?? NOU.ochre, shade: o.shade, lw: 2.2, chalk: false });
    else nouLeaf(x, y, s * 1.7, rot, { w: s * 0.95, fat: 1.1, bend: 0.16, c: o.c ?? NOU.rose, shade: o.shade, lw: 2.2, rib: false, chalk: false });
  }
}
const nouHover = (key, amp = 10) => { const p = (hash('nouhover', key) % 100) / 100 * TAU; return [amp * Math.sin(TT * 1.7 + p), amp * 0.7 * Math.sin(TT * 3.4 + p), 0.07 * Math.sin(TT * 1.3 + p)]; };

// ---------------------------------------------------------------------
//  the hero: LIBEL, a dragonfly seen from above, built from the same tapered contour and flat fills.
//   (x, y) = the thorax, r = half its size (the wings reach r to either side, the tail 1.15 r behind).
//   o: rot (heading: 0 = up, radians), flap (-1..1: the wings' beat; pass a fast sine), curl (-1..1: the tail's bend),
//      c (body: teal), wing (pale teal), key
// ---------------------------------------------------------------------
const nouHeroPts = (x, y, r, n = 96) => ellipsePts(x, y + r * 0.2, r, r * 0.86, 0, n);
function nouDragonfly(x, y, r, o = {}) {
  const fl = o.flap ?? 0, c = o.c ?? NOU.teal, wing = o.wing ?? NOU.tealL, cu = o.curl ?? 0;
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(r / 100, r / 100);
  for (const [oy, len, wd, a0, sgn] of [[2, 90, 31, 0.36, 1], [-18, 100, 27, -0.2, -1]]) {   // hind pair, then fore pair
    for (const sd of [-1, 1]) {
      const a = a0 + sgn * fl * 0.2, L = nouPlace(nouLeafPts(len * (1 - 0.1 * Math.abs(fl)), wd, { fat: 1.5, round: 0.55, bend: 0.05 * sd, n: 14 }), sd * 5, oy, sd > 0 ? a : Math.PI - a);
      const V = [L.rib.slice(1, -1)]; for (const i of [5, 8, 11]) V.push([L.P[i], L.P[28 - i]]);
      nouShape(L.P, { c: wing, w: 2.8, veins: V, vw: 1, chalk: false });
      const sp = L.rib[12]; nouShape(ellipsePts(sp[0], sp[1] - 4, 5.5, 3.2, sd > 0 ? a : Math.PI - a, 10), { c: NOU.ochre, w: 1.3, chalk: false });   // the wing spot
    }
  }
  const tail = nouStem([[0, 4], [5 * cu, 40], [-7 * cu, 80], [4 * cu, 116]], { w: 13, tip: 4.5, taper: 1.1, c, lw: 2.6 });
  ctx.strokeStyle = NOU.line; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let j = 1; j <= 5; j++) { const [p, th] = nouAt(tail.Q, j / 6), hw = 6.4 - j * 0.6; ctx.moveTo(p[0] - Math.sin(th) * hw, p[1] + Math.cos(th) * hw); ctx.lineTo(p[0] + Math.sin(th) * hw, p[1] - Math.cos(th) * hw); }
  ctx.stroke();
  nouShape(ellipsePts(0, -9, 12.5, 22, 0, 24), { c, shade: '#2f6563', w: 3.2, chalk: false });
  nouShape(ellipsePts(0, -36, 10, 8, 0, 16), { c: NOU.olive, w: 2.6, chalk: false });
  for (const sd of [-1, 1]) nouShape(ellipsePts(sd * 9, -39, 7.2, 7.8, sd * 0.3, 16), { c: NOU.aub, w: 2.2, chalk: false });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  lettering: period display caps drawn from a system serif — bold, widely tracked, stretched a little taller.
//   nouText(str, x, y, size, c, o)   y = the baseline. o: align ('center' | 'left' | 'right'), track (em, 0.14),
//                                    tall (1.16), reveal (0..1, wiped on left to right), weight (700), caps (true)
//   nouFlourish(x0, x1, y, o)        the hand-drawn underline: a whiplash stroke, thick at its root, ending in a curl.
//                                    o.grow, o.amp (6), o.w (5), o.c
// ---------------------------------------------------------------------
function nouFont(size, weight = 700, track = 0.14) { ctx.font = `${weight} ${size}px ${NOU_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${(size * track).toFixed(2)}px`; }
function nouTextW(str, size, o = {}) { ctx.save(); nouFont(size, o.weight, o.track); const w = ctx.measureText(o.caps === false ? str : str.toUpperCase()).width - size * (o.track ?? 0.14); ctx.restore(); return w; }
function nouText(str, x, y, size, c, o = {}) {
  const s = o.caps === false ? str : str.toUpperCase(), rv = o.reveal ?? 1, w = nouTextW(str, size, o), tall = o.tall ?? 1.16;
  if (rv <= 0) return w;
  const ax = (o.align ?? 'center') === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
  ctx.save(); nouFont(size, o.weight, o.track); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y);
  if (rv < 1) { ctx.beginPath(); ctx.rect(ax - size * 0.1, -size * 1.2, (w + size * 0.2) * rv, size * 1.7); ctx.clip(); }
  ctx.scale(1, tall); ctx.fillStyle = c; ctx.fillText(s, ax, 0);
  ctx.restore(); return w;
}
function nouFlourish(x0, x1, y, o = {}) {
  return nouStem(nouWhip(x0, y, x1, y, o.amp ?? 6, 48), { raw: true, grow: o.grow ?? 1, w: o.w ?? 5, tip: 1.2, taper: 1, swell: 0.2, line: o.c ?? NOU.line, spiral: { r: o.curl ?? 9, turns: 1.3, dir: -1 } });
}

// ---------------------------------------------------------------------
//  the caption (through DEFER: after the camera, at screen size): a bordered cartouche at the bottom of the panel.
//  The plate unrolls from its middle, the words are wiped on, the underline flourish grows under them and curls.
//  One *word* may be printed in the accent colour. It rolls shut as a bridge starts and opens again in the next era.
//   o: x (540: centre), y (1410: centre), w (800), h (148), size (58; shrinks to fit), hi (accent: roseD),
//      c (plate: cream), col (lettering), at (seconds after the era starts, 0.5)
// ---------------------------------------------------------------------
function nouBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - nouE(seg(TT, r.tc - d - 0.001, r.tc - d + 0.25));
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
function nouCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = nouBridgeK(); if (k <= 0 || TT < at) return;
  const cx = o.x ?? 540, cy = o.y ?? 1410, w = o.w ?? 800, h = o.h ?? 148, a = nouE((TT - at) / 0.5) * k, ww = w * (0.06 + 0.94 * a), hh = h * (0.5 + 0.5 * a);
  const P = nouCartPts(cx, cy, ww, hh);
  nouShape(P, { c: o.c ?? NOU.cream, w: 6.5 });
  if (a > 0.5) {
    nouShape(nouCartPts(cx, cy, ww - 22, hh - 22), { w: 1.6, thin: 1 });
    for (const sd of [-1, 1]) nouShape(ellipsePts(cx + sd * (ww / 2 - 30), cy, 7, 7, 0, 14), { c: o.hi ?? NOU.roseD, w: 1.8, chalk: false });
  }
  const rv = nouE((TT - at - 0.35) / 0.6); if (rv <= 0) return;
  const plain = str.replace(/\*/g, ''), maxW = w - 170;
  let size = o.size ?? 58, tw = nouTextW(plain, size); if (tw > maxW) { size *= maxW / tw; tw = nouTextW(plain, size); }
  const x0 = cx - tw / 2, by = cy + size * 0.2, xl = Math.max(x0 - 12, cx - ww / 2 + 30), xr = Math.min(x0 - 12 + (tw + 24) * rv, cx + ww / 2 - 30);
  if (xr <= xl) return;
  ctx.save(); ctx.beginPath(); ctx.rect(xl, cy - h / 2, xr - xl, h); ctx.clip();
  let pre = '';
  str.split('*').forEach((tok, i) => {
    if (tok) { const px = pre ? nouTextW(pre + '.', size) - nouTextW('.', size) : 0; nouText(tok, x0 + px, by, size, i % 2 ? (o.hi ?? NOU.roseD) : (o.col ?? NOU.line), { align: 'left' }); }
    pre += tok;
  });
  nouFlourish(x0 - 6, x0 + tw - 4, by + size * 0.36, { grow: nouE((TT - at - 0.6) / 0.7) });
  ctx.restore();
}
const nouCaption = (str, o = {}) => { const f = () => nouCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'art-nouveau',
  paper: NOU.paper,
  // the bare sheet in colour c (hex, or rgb() mid-morph) with the plate's hairline on it
  backdrop(c) {
    ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
    const G = NOU_PANEL; nouShape(resample(rrectPts(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0, G.r, 8), true, 30), { w: 2.4 });
    ctx.restore();
  },
  // the era seen through the bridge shape, inside a border: a band in the bridge colour between two dark contours;
  // the band thins away as the window closes onto the object
  window(P, key, src, o = {}) {
    ctx.save(); ctx.beginPath(); nouAdd(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, k = o.phase === 'grow' ? nouE(u * 4) : nouE((1 - u) * 4), band = 26 * k;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); nouAdd(P); ctx.strokeStyle = NOU.line; ctx.lineWidth = band + 9; ctx.stroke();
    if (band > 1) { ctx.beginPath(); nouAdd(P); ctx.strokeStyle = o.c ?? NOU.rose; ctx.lineWidth = band; ctx.stroke(); }
    ctx.restore();
  },
  // the morphing shape: a bare halo (flat colour, rim band, beads) with tendrils that curl out of its edge and back
  blob(P, c, key, u = 0) {
    const ce = nouCentroid(P), q = Math.sin(Math.PI * clamp(u)), n = P.length;
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const p = P[Math.floor((i + 0.5) / 6 * n)], dx = p[0] - ce[0], dy = p[1] - ce[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, sd = i % 2 ? 1 : -1;
      nouStem([[p[0] - ux * 8, p[1] - uy * 8], [p[0] + ux * 34 - uy * 22 * sd, p[1] + uy * 34 + ux * 22 * sd], [p[0] + ux * 78 - uy * 8 * sd, p[1] + uy * 78 + ux * 8 * sd]], { grow: q, w: 9, tip: 1.6, c: NOU.olive, lw: 2.4, spiral: { r: 20, turns: 1.5, dir: sd } });
    }
    nouDisc(P, c);
    ctx.restore();
  },
  hero(x, y, r, o = {}) { nouDragonfly(x, y, r, { key: o.key, flap: Math.sin(TT * TAU * 6) }); },
  heroColor: NOU.teal,
  heroPts(x, y, r) { return nouHeroPts(x, y, r); },
  // the stone's grain over the finished print (static: a print holds still)
  post() { ctx.save(); screen(); ctx.drawImage(nouGrain(), 0, 0); ctx.restore(); },
  ones: true,
};
