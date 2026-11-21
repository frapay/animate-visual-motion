// =====================================================================
//  styles/liquid/kit.js — LIQUID: borderless organic blobs with bold two-stop gradients, a soft specular
//  highlight and a small soft shadow, on a clean light or deep ground. Blobs wobble (closed curves whose
//  radius is a sum of sines), merge and split through neck shapes (a faked metaball: no pixel field, no blur),
//  wave bands sweep, drops fall and splash, bubbles rise. Rounded bold sans type on white pills.
//  Built on kit/core.js. Motion on 1s. Helpers are prefixed lq…; the palette is LQ. Needs from the piece head: CX.
// =====================================================================
const LQ = {
  paper: '#fff6ee', paperB: '#ffe9e2',            // the light ground (top, bottom)
  deep: '#1a1040', deepB: '#2c1768',              // the deep ground (top, bottom)
  ink: '#2a1b4d', inkL: '#7d6d9e', white: '#ffffff',
  shadow: 'rgba(44,16,84,0.055)',                 // one of three stacked shadow layers
  g: {                                            // gradient pairs [light stop, deep stop]
    sky: ['#5fd2ff', '#5a55f2'],                  // the hero (Tetes) and its own water: reserved
    coral: ['#ff8f5c', '#f0388a'],                // coral -> magenta: the main subject
    heart: ['#ff7092', '#d02fb6'],                // pink -> magenta: love, the result
    berry: ['#4f86ff', '#9a4dff'],                // blue -> violet: waves, wipes
    violet: ['#8a6cff', '#4a2bb8'],               // violet -> deep violet: back waves on the deep ground
    lime: ['#c8f250', '#17c2a4'],                 // lime -> teal: the fresh accent, front waves
    sun: ['#ffd84a', '#ff8a3c'],                  // yellow -> orange: small accents only
    peach: ['#ffe2d2', '#ffd0e4'], lilac: ['#ece4ff', '#dcd6ff'], mint: ['#e2f8e0', '#cdf1ee'],   // pale drifters on the light ground
    dusk: ['#34207c', '#27155e'],                 // dim drifters on the deep ground
    dusk2: ['#5a3cc8', '#33208a'],                // the farthest wave on the deep ground
  },
};
const LQ_SANS = '"Arial Rounded MT Bold", "Varela Round", "Nunito", "Quicksand", "Segoe UI", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';

// ---------------------------------------------------------------------
//  colour
// ---------------------------------------------------------------------
function lqRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
const lqMix = (a, b, u) => { const x = lqRGB(a), y = lqRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const lqA = (c, al) => { const x = lqRGB(c); return `rgba(${x[0]},${x[1]},${x[2]},${al})`; };
// a gradient pair from anything: a pair stays; one colour becomes [lighter, deeper and a little more violet]
const lqPair = (c) => (Array.isArray(c) ? c : [lqMix(c, '#ffffff', 0.2), lqMix(c, '#7a1fb0', 0.3)]);

// ---------------------------------------------------------------------
//  geometry: every outline is a list of points drawn as one smooth closed curve (no corners)
// ---------------------------------------------------------------------
function lqBB(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; }
function lqCentroid(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; }
function lqSmooth(P, it = 2) {   // round a closed outline: average each point with its neighbours
  for (let k = 0; k < it; k++) { const n = P.length; P = P.map((p, i) => { const a = P[(i + n - 1) % n], b = P[(i + 1) % n]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; }); }
  return P;
}
function lqArea(P) { let s = 0; for (let i = 0, n = P.length; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
// the smooth closed path through P (quadratic curves through the midpoints). add = true appends a sub-path.
function lqPath(P, add) {
  if (!add) ctx.beginPath();
  const n = P.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s = m(P[n - 1], P[0]);
  ctx.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const e = m(P[i], P[(i + 1) % n]); ctx.quadraticCurveTo(P[i][0], P[i][1], e[0], e[1]); }
  ctx.closePath();
}
// a wobbling blob: a circle whose radius is a sum of three sines of the angle, phases from the key, drifting with time
//   o: key, amp (0.07 = calm, 0.14 = lively), speed, n, sx, sy (squash / stretch), rot, t (default TT)
function lqBlobPts(x, y, r, o = {}) {
  const R = RNG('lqblob', o.key ?? 'b'), p0 = R.r(0, TAU), p1 = R.r(0, TAU), p2 = R.r(0, TAU);
  const amp = o.amp ?? 0.07, sp = o.speed ?? 1, t = o.t ?? TT, n = o.n ?? 72, sx = o.sx ?? 1, sy = o.sy ?? 1, rot = o.rot ?? 0;
  const cr = Math.cos(rot), sr = Math.sin(rot), P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1 + amp * (0.5 * Math.sin(2 * a + p0 + t * sp * 1.3) + 0.3 * Math.sin(3 * a + p1 - t * sp * 1.9) + 0.2 * Math.sin(5 * a + p2 + t * sp * 2.6));
    const px = Math.cos(a) * r * k * sx, py = Math.sin(a) * r * k * sy;
    P.push([x + px * cr - py * sr, y + px * sr + py * cr]);
  }
  return P;
}
// a drop: a round body (centre x, y, radius r) with a soft rounded tip on top. o: tip (0.55), lean (rad), sx, sy, sig, n
function lqDropPts(x, y, r, o = {}) {
  const tip = o.tip ?? 0.55, up = -Math.PI / 2 + (o.lean ?? 0), sig = o.sig ?? 0.4, n = o.n ?? 72, sx = o.sx ?? 1, sy = o.sy ?? 1, P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU; let d = a - up; d = Math.atan2(Math.sin(d), Math.cos(d));
    const k = 1 + tip * Math.exp(-((d / sig) ** 2));
    P.push([x + Math.cos(a) * r * k * sx, y + Math.sin(a) * r * k * sy]);
  }
  return P;
}
// a rounded heart about (x, y), half-width ~r: the classic curve with its notch and point smoothed away
function lqHeartPts(x, y, r, n = 96) {
  const P = [];
  for (let i = 0; i < n; i++) { const t = i / n * TAU, s = Math.sin(t); P.push([x + 16 * s * s * s * r / 16.4, y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.6) * r / 16.4]); }
  return lqSmooth(P, 7);
}
const lqCirclePts = (x, y, r, n = 48) => lqBlobPts(x, y, r, { amp: 0, n });
// a pill (stadium) outline
function lqPillPts(x, y, w, h) {
  const r = Math.min(w, h) / 2, P = [], n = 14;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI; P.push([x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + i / n * Math.PI; P.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]); }
  return P;
}
function lqPoly(P, add) { if (!add) ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

// ---------------------------------------------------------------------
//  the neck between two round blobs a = [x, y, r], b = [x, y, r]: the faked metaball. Two curves tangent to
//  both circles; it thins as they move apart and breaks at `reach` (in small-radius units past touching).
//  Returns a closed polygon (through both centres, so it also fills the overlap), or null when they are apart.
// ---------------------------------------------------------------------
function lqNeck(a, b, v = 0.5, reach = 2.2) {
  const [x1, y1, r1] = a, [x2, y2, r2] = b, d = Math.hypot(x2 - x1, y2 - y1), maxD = r1 + r2 + Math.min(r1, r2) * reach;
  if (r1 < 1 || r2 < 1 || d <= Math.abs(r1 - r2) + 1 || d >= maxD) return null;
  const far = seg(d, r1 + r2, maxD); v *= 1 - far ** 1.6;
  let u1 = 0, u2 = 0;
  if (d < r1 + r2) { u1 = Math.acos(clamp((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d), -1, 1)); u2 = Math.acos(clamp((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d), -1, 1)); }
  const ab = Math.atan2(y2 - y1, x2 - x1), ms = Math.acos(clamp((r1 - r2) / d, -1, 1));
  const a1 = ab + u1 + (ms - u1) * v, a2 = ab - u1 - (ms - u1) * v, a3 = ab + Math.PI - u2 - (Math.PI - u2 - ms) * v, a4 = ab - Math.PI + u2 + (Math.PI - u2 - ms) * v;
  const vec = (x, y, an, r) => [x + Math.cos(an) * r, y + Math.sin(an) * r];
  const p1 = vec(x1, y1, a1, r1), p2 = vec(x1, y1, a2, r1), p3 = vec(x2, y2, a3, r2), p4 = vec(x2, y2, a4, r2);
  const d2 = Math.min(v * 2.4, Math.hypot(p1[0] - p3[0], p1[1] - p3[1]) / (r1 + r2)) * Math.min(1, d * 2 / (r1 + r2));
  const h1 = vec(p1[0], p1[1], a1 - Math.PI / 2, r1 * d2), h2 = vec(p2[0], p2[1], a2 + Math.PI / 2, r1 * d2);
  const h3 = vec(p3[0], p3[1], a3 + Math.PI / 2, r2 * d2), h4 = vec(p4[0], p4[1], a4 - Math.PI / 2, r2 * d2);
  const bez = (A, B2, C2, D, out) => { for (let i = 0; i <= 14; i++) { const t = i / 14, m = 1 - t; out.push([m * m * m * A[0] + 3 * m * m * t * B2[0] + 3 * m * t * t * C2[0] + t * t * t * D[0], m * m * m * A[1] + 3 * m * m * t * B2[1] + 3 * m * t * t * C2[1] + t * t * t * D[1]]); } };
  const P = []; bez(p1, h1, h3, p3, P); P.push([x2, y2]); bez(p4, h4, h2, p2, P); P.push([x1, y1]);
  return P;
}

// ---------------------------------------------------------------------
//  paint: the liquid surface. build() adds sub-paths to the current path; bb = [x0, y0, x1, y1] of the whole shape.
//  Three stacked offset fills make the soft shadow (no blur); a two-stop gradient across the box; then, clipped
//  to the shape, a soft sheen and a crisp glint per gloss spot [cx, cy, rx, ry].
//   o: al, angle (gradient direction, rad; 0.95 = towards bottom-right), shadow (false | px), gloss (0..1), spots
// ---------------------------------------------------------------------
function lqGloss(cx, cy, rx, ry, g) {
  const R = Math.max(rx, ry), hx = cx - rx * 0.34, hy = cy - ry * 0.4;
  const sh = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.8); sh.addColorStop(0, `rgba(255,255,255,${0.44 * g})`); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(hx - R * 0.8, hy - R * 0.8, R * 1.6, R * 1.6);
  const lw = Math.min(rx, ry) * 0.1; if (lw < 1.2) return;
  ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.8 * g})`; ctx.fillStyle = ctx.strokeStyle; ctx.lineCap = 'round'; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.7, ry * 0.7, 0, -2.62, -2.02); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + Math.cos(-2.9) * rx * 0.7, cy + Math.sin(-2.9) * ry * 0.7, lw * 0.56, 0, TAU); ctx.fill();
  ctx.restore();
}
function lqPaint(build, bb, c, o = {}) {
  const pair = lqPair(c), w = bb[2] - bb[0], h = bb[3] - bb[1], cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, s = Math.min(w, h);
  ctx.save(); ctx.globalAlpha *= o.al ?? 1;
  if (o.shadow !== false && s > 36) {
    const off = typeof o.shadow === 'number' ? o.shadow : clamp(s * 0.075, 6, 26);
    ctx.fillStyle = LQ.shadow;
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(cx, cy + off * (0.5 + i * 0.45)); ctx.scale(1 + i * 0.012, 1 + i * 0.012); ctx.translate(-cx, -cy); ctx.beginPath(); build(); ctx.fill(); ctx.restore(); }
  }
  const an = o.angle ?? 0.95, dx = Math.cos(an) * w / 2, dy = Math.sin(an) * h / 2;
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy); g.addColorStop(0, pair[0]); g.addColorStop(1, pair[1]);
  ctx.beginPath(); build(); ctx.fillStyle = g; ctx.fill();
  const gl = o.gloss ?? 1;
  if (gl > 0) { ctx.clip(); for (const sp of o.spots ?? [[cx, cy, w / 2, h / 2]]) lqGloss(sp[0], sp[1], sp[2], sp[3], gl); }
  ctx.restore();
}
// one closed outline, painted. o as lqPaint + raw (true = P is a polygon, drawn with straight segments)
function lqFill(P, c, o = {}) { lqPaint(() => (o.raw ? lqPoly(P, true) : lqPath(P, true)), lqBB(P), c, o); }
// several blobs as ONE liquid body: their outlines plus a neck between every pair that is close enough, filled
// together (one gradient, one shadow), a glint on each.
//   items: { x, y, r, key, amp, speed, sx, sy }   a wobbling blob, or
//          { P, x, y, r }                          a custom outline whose neck circle is (x, y, r); neck: false = never necks
//   o: as lqPaint + v (neck fatness 0.5), reach (2.2)
function lqGoo(items, c, o = {}) {
  const polys = [], smooth = [], spots = [];
  for (const it of items) {
    if (!(it.r > 0.5)) continue;
    const P = it.P || lqBlobPts(it.x, it.y, it.r, it);
    polys.push(lqArea(P) < 0 ? P.slice().reverse() : P); smooth.push(true);
    if (it.gloss !== false) spots.push(it.spot || [it.x, it.y, it.r * (it.sx ?? 1), it.r * (it.sy ?? 1)]);
  }
  const live = items.filter((it) => it.r > 0.5 && it.neck !== false);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const N = lqNeck([live[i].x, live[i].y, live[i].r * 0.96], [live[j].x, live[j].y, live[j].r * 0.96], o.v ?? 0.5, o.reach ?? 2.2);
    if (N) { polys.push(lqArea(N) < 0 ? N.reverse() : N); smooth.push(false); }
  }
  if (!polys.length) return;
  const bb = lqBB(polys.flat());
  lqPaint(() => polys.forEach((P, i) => (smooth[i] ? lqPath(P, true) : lqPoly(P, true))), bb, c, { ...o, spots: o.gloss === 0 ? [] : spots });
}

// ---------------------------------------------------------------------
//  ground, drifting background blobs, bubbles
// ---------------------------------------------------------------------
function lqGround(top = LQ.paper, bottom = LQ.paperB) {
  ctx.save(); screen(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// big quiet blobs drifting slowly behind everything. pairs: a list of gradient pairs. o: r [min, max], al, box [x0, y0, x1, y1], speed
function lqDrift(key, n, pairs, o = {}) {
  const [x0, y0, x1, y1] = o.box ?? [0, 0, W, H], rr = o.r ?? [150, 300], sp = o.speed ?? 1;
  for (let i = 0; i < n; i++) {
    const R = RNG('lqdrift', key, i), bx = R.r(x0, x1), by = R.r(y0, y1), r = R.r(rr[0], rr[1]), ph = R.r(0, TAU), f = R.r(0.25, 0.5) * sp;
    lqFill(lqBlobPts(bx + Math.sin(TT * f + ph) * 60, by + Math.cos(TT * f * 0.8 + ph) * 46, r, { key: key + i, amp: 0.12, speed: 0.5 * sp, n: 40 }), pairs[i % pairs.length], { shadow: false, gloss: 0, al: o.al ?? 1 });
  }
}
// small bubbles rising and swaying, each popping in and out at the ends of its path.
//   o: box [x0, yBottom, x1, yTop], r [min, max], c (rim colour), al, speed
function lqBubbles(key, n, o = {}) {
  const [x0, yb, x1, yt] = o.box ?? [0, H + 40, W, -40], rr = o.r ?? [8, 24], c = o.c ?? '#ffffff', al = o.al ?? 0.7, sp = o.speed ?? 1;
  for (let i = 0; i < n; i++) {
    const R = RNG('lqbub', key, i), per = R.r(3.2, 6.5) / sp, u = mod(TT / per + R.r(0, 1), 1), bx = R.r(x0, x1), sw = R.r(8, 26), sf = R.r(1, 2.4), ph = R.r(0, TAU);
    const rad = R.r(rr[0], rr[1]) * smooth(0, 0.07, u) * (1 - smooth(0.9, 1, u)); if (rad < 1) continue;
    const x = bx + Math.sin(TT * sf + ph) * sw, y = lerp(yb, yt, u);
    const g = ctx.createRadialGradient(x, y, rad * 0.35, x, y, rad); g.addColorStop(0, lqA(c, 0.1 * al)); g.addColorStop(0.75, lqA(c, 0.3 * al)); g.addColorStop(1, lqA(c, 0.85 * al));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.9 * al})`; ctx.beginPath(); ctx.arc(x - rad * 0.36, y - rad * 0.38, rad * 0.17, 0, TAU); ctx.fill();
  }
}

// ---------------------------------------------------------------------
//  waves. lqWaveY gives the surface height at x (to float things on it); lqWave fills from the surface down.
//   o: key, amp (40), len (640, the wavelength), speed (1), t, depth (gradient length, 700), bottom (y to fill to),
//      al, gloss (crest line 0..1), shadow (false = none)
// ---------------------------------------------------------------------
function lqWaveY(x, y, o = {}) {
  const R = RNG('lqwave', o.key ?? 'w'), p1 = R.r(0, TAU), p2 = R.r(0, TAU), amp = o.amp ?? 40, len = o.len ?? 640, sp = o.speed ?? 1, t = o.t ?? TT;
  return y + amp * (0.62 * Math.sin(x / len * TAU + p1 + t * sp * 1.9) + 0.38 * Math.sin(x / (len * 0.43) * TAU + p2 - t * sp * 2.7));
}
function lqWaveEdge(y, o, x0, x1, step = 30) {
  const R = RNG('lqwave', o.key ?? 'w'), p1 = R.r(0, TAU), p2 = R.r(0, TAU), amp = o.amp ?? 40, len = o.len ?? 640, sp = o.speed ?? 1, t = o.t ?? TT, E = [];
  for (let x = x0; x <= x1 + 1; x += step) E.push([x, y + amp * (0.62 * Math.sin(x / len * TAU + p1 + t * sp * 1.9) + 0.38 * Math.sin(x / (len * 0.43) * TAU + p2 - t * sp * 2.7))]);
  return E;
}
function lqEdgeLine(E, dy = 0) { ctx.beginPath(); E.forEach(([x, y], i) => { if (!i) ctx.moveTo(x, y + dy); else { const p = E[i - 1]; ctx.quadraticCurveTo(p[0], p[1] + dy, (p[0] + x) / 2, (p[1] + y) / 2 + dy); } }); }
function lqWave(y, c, o = {}) {
  const pair = lqPair(c), amp = o.amp ?? 40, x0 = o.x0 ?? -160, x1 = o.x1 ?? W + 160, bottom = o.bottom ?? H + 400, E = lqWaveEdge(y, o, x0, x1);
  const body = (dy) => { lqEdgeLine(E, dy); ctx.lineTo(x1, bottom); ctx.lineTo(x0, bottom); ctx.closePath(); };
  ctx.save(); ctx.globalAlpha *= o.al ?? 1;
  if (o.shadow !== false) { ctx.fillStyle = LQ.shadow; for (let i = 0; i < 3; i++) { body(-8 - i * 9); ctx.fill(); } }
  const g = ctx.createLinearGradient(0, y - amp, 0, y + (o.depth ?? 700)); g.addColorStop(0, pair[0]); g.addColorStop(1, pair[1]);
  body(0); ctx.fillStyle = g; ctx.fill();
  const gl = o.gloss ?? 1;
  if (gl > 0) {   // the crest: a soft light band just under the surface and a thin bright line
    ctx.clip(); ctx.lineCap = 'round';
    lqEdgeLine(E, 30); ctx.lineWidth = 44; ctx.strokeStyle = `rgba(255,255,255,${0.13 * gl})`; ctx.stroke();
    lqEdgeLine(E, 17); ctx.lineWidth = 7; ctx.strokeStyle = `rgba(255,255,255,${0.5 * gl})`; ctx.stroke();
  }
  ctx.restore();
}
// a wave band sweeping the whole frame as a transition (screen space). u: 0 = not yet in, 0.5 = the frame is
// covered (swap the scene here), 1 = gone. o: dir (1 = upwards, -1 = downwards), key, amp, len, c2 (a second,
// trailing band in another pair)
function lqWipe(u, c, o = {}) {
  if (u <= 0 || u >= 1) return;
  const dir = o.dir ?? 1, band = H * 1.25, amp = o.amp ?? 70, len = o.len ?? 760, key = o.key ?? 'wipe';
  const one = (uu, cc, k) => {
    if (uu <= 0 || uu >= 1) return;
    const pair = lqPair(cc), top = lerp(H + amp + 20, -band - amp - 20, uu), wo = { key: key + k, amp, len, speed: 1.4 };
    const A = lqWaveEdge(top, wo, -40, W + 40), Bt = lqWaveEdge(top + band, { ...wo, key: key + k + 'b' }, -40, W + 40);
    const body = (dy) => { lqEdgeLine(A, dy); for (let i = Bt.length - 1; i >= 0; i--) ctx.lineTo(Bt[i][0], Bt[i][1] + dy); ctx.closePath(); };
    ctx.fillStyle = LQ.shadow; for (let i = 0; i < 3; i++) { body(10 + i * 10); ctx.fill(); body(-8 - i * 9); ctx.fill(); }
    const g = ctx.createLinearGradient(0, top, 0, top + band); g.addColorStop(0, pair[0]); g.addColorStop(1, pair[1]);
    body(0); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.lineCap = 'round';
    lqEdgeLine(A, 30); ctx.lineWidth = 44; ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.stroke();
    lqEdgeLine(A, 17); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    ctx.restore();
  };
  ctx.save(); screen(); if (dir < 0) { ctx.translate(0, H); ctx.scale(1, -1); }
  if (o.c2) one(u * 1.12 - 0.12, o.c2, '2');
  one(u, c, '1');
  ctx.restore();
}

// ---------------------------------------------------------------------
//  a splash at (x, y): t = seconds since the impact. A flat ripple ring that spreads and fades, and a crown of
//  droplets thrown up and outwards on arcs (a crown, open in the middle; stretched along their speed) that fall back.
//   o: key, n (9), power (1), r (droplet 13), spread (px: how far from x the droplets start, to clear what landed)
// ---------------------------------------------------------------------
function lqSplash(x, y, t, c, o = {}) {
  const dur = 0.85; if (t < 0 || t > dur) return;
  const pair = lqPair(c), u = t / dur, pw = o.power ?? 1, n = o.n ?? 9, r0 = o.r ?? 13, key = o.key ?? 'splash';
  ctx.save();
  for (let k = 0; k < 2; k++) {
    const uu = clamp(u * 1.25 - k * 0.22); if (uu <= 0 || uu >= 1) continue;
    ctx.beginPath(); ctx.ellipse(x, y, (36 + 190 * EZ.o2(uu)) * pw, (9 + 40 * EZ.o2(uu)) * pw, 0, 0, TAU);
    ctx.lineWidth = 11 * (1 - uu) * pw + 1; ctx.strokeStyle = lqA(pair[0], 0.75 * (1 - uu)); ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const R = RNG('lqsplash', key, i), sg = i % 2 ? 1 : -1, an = -Math.PI / 2 + sg * R.r(0.25, 0.95), sp = R.r(380, 780) * pw, grav = 2100, rr = R.r(0.6, 1.3) * r0 * (1 - u * 0.45);
    const vx = Math.cos(an) * sp, vy = Math.sin(an) * sp + grav * t, px = x + sg * (o.spread ?? 0) + vx * t, py = y + Math.sin(an) * sp * t + 0.5 * grav * t * t;
    if (py > y + 6 && vy > 0) continue;
    const st = 1 + Math.min(0.7, Math.hypot(vx, vy) / 1500);
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(vy, vx)); ctx.scale(st, 1 / st);
    ctx.fillStyle = i % 2 ? pair[0] : pair[1]; ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(px - rr * 0.3, py - rr * 0.34, rr * 0.24, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// squash from a landing at time t0: a damped wobble (wide, then tall, then settles). Add it to a blob's squash.
const lqLand = (t0, amt = 0.4, freq = 17, damp = 6.5) => (TT < t0 ? 0 : amt * Math.exp(-(TT - t0) * damp) * Math.cos((TT - t0) * freq));
// 0 -> 1 with an overshoot that settles (a playful spring) from time t0
const lqPop = (t0, k = 260, d = 15) => springEase(TT - t0, k, d);

// ---------------------------------------------------------------------
//  the hero: TETES, a drop with two simple eyes. (x, y) = the centre of its round body, r = the body radius;
//  the tip rises ~0.55r above it. Sets SPARK_AT.
//   o: key, squash (+ wide and low, - tall and thin; the base stays put), lean (rad, the tip trails), tip, look (-1..1),
//      lookY, mood ('smile' | 'wow' | 'calm'), bob (px; default an idle float), c (pair), shadow, eyes (false = none)
// ---------------------------------------------------------------------
function lqHeroShape(x, y, r, o = {}) {
  const q = o.squash ?? 0, sx = 1 + q, sy = 1 / (1 + q);
  return { sx, sy, cy: y + r * (1 - sy), tip: o.tip ?? 0.55, lean: o.lean ?? 0 };
}
function lqHeroPts(x, y, r, o = {}) { const s = lqHeroShape(x, y, r, o); return lqDropPts(x, s.cy, r, { tip: s.tip, lean: s.lean, sx: s.sx, sy: s.sy }); }
function lqHero(x, y, r, o = {}) {
  const key = o.key ?? 'tetes';
  y += o.bob ?? Math.sin(TT * TAU * 0.8 + key.length) * r * 0.045;
  const s = lqHeroShape(x, y, r, o), cy = s.cy, rx = r * s.sx, ry = r * s.sy;
  SPARK_AT = toScreen(x, cy);
  lqFill(lqHeroPts(x, y, r, o), o.c ?? LQ.g.sky, { spots: [[x, cy, rx, ry]], shadow: o.shadow });
  if (o.eyes === false) return;
  const mood = o.mood ?? 'smile', look = clamp(o.look ?? 0, -1, 1), ex = rx * 0.33, ey = cy - ry * 0.04 + (o.lookY ?? 0) * ry * 0.1, ox = look * rx * 0.1;
  const blink = mood !== 'wow' && mod(TT + (key.length % 5) * 0.37, 2.9) < 0.1;
  const ew = r * (mood === 'wow' ? 0.135 : 0.105), eh = blink ? r * 0.02 : r * (mood === 'wow' ? 0.165 : 0.145) * Math.min(1, s.sy + 0.15);
  ctx.save();
  for (const sg of [-1, 1]) {
    ctx.fillStyle = LQ.ink; ctx.beginPath(); ctx.ellipse(x + ox + sg * ex, ey, ew, eh, 0, 0, TAU); ctx.fill();
    if (!blink) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + ox + sg * ex + ew * 0.3 + look * ew * 0.2, ey - eh * 0.36, ew * 0.34, 0, TAU); ctx.fill(); }
  }
  const my = ey + ry * 0.3, mx = x + ox * 1.2;
  if (mood === 'wow') { ctx.fillStyle = LQ.ink; ctx.beginPath(); ctx.ellipse(mx, my + r * 0.03, r * 0.075, r * 0.1, 0, 0, TAU); ctx.fill(); }
  else if (mood !== 'calm') { ctx.strokeStyle = LQ.ink; ctx.lineWidth = r * 0.055; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(mx, my - r * 0.1, r * 0.17, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  type: a rounded bold sans. lqText draws one string; o: align, base, weight, al, grad (a pair: gradient-filled)
// ---------------------------------------------------------------------
const lqFont = (size, weight = 800) => { ctx.font = `${weight} ${size}px ${LQ_SANS}`; };
function lqTextW(str, size, weight = 800) { ctx.save(); lqFont(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function lqText(str, x, y, size, c, o = {}) {
  const al = o.al ?? 1; if (al <= 0.001) return 0;
  ctx.save(); lqFont(size, o.weight ?? 800); ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic'; ctx.globalAlpha *= al;
  const w = ctx.measureText(str).width;
  if (o.grad) { const x0 = x - (ctx.textAlign === 'center' ? w / 2 : ctx.textAlign === 'right' ? w : 0), g = ctx.createLinearGradient(x0, y - size, x0 + w, y); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; }
  else ctx.fillStyle = c;
  ctx.fillText(str, x, y); ctx.restore(); return w;
}
// a borderless plate (a pill) with the kit's soft shadow, no gloss
function lqPlate(x, y, w, h, c = '#ffffff', al = 1) {
  const P = lqPillPts(x, y, w, h);
  ctx.save(); ctx.globalAlpha *= al;
  ctx.fillStyle = 'rgba(44,16,84,0.06)'; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(0, 5 + i * 5); lqPoly(P); ctx.fill(); ctx.restore(); }
  lqPoly(P); ctx.fillStyle = c; ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size). Each caption line sits on its own white pill that
//  springs open; words rise in one by one; *a phrase* is filled with a gradient. They fade out as a bridge starts
//  to shrink and fade in when the next era has opened.
// ---------------------------------------------------------------------
function lqBridgeAl() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.25));
    if (TT >= r.tc && TT < r.tc + d + 0.2) return EZ.o2(seg(TT, r.tc + d - 0.15, r.tc + d + 0.2));
  }
  return 1;
}
//   o: y (baseline of the last line, 1452), size (70), at (seconds after the era starts, 0.6), hi (pair for the
//      *phrase*), c (text), plate (pill colour; false = no pill), x (centre)
function lqCaptionNow(str, o = {}) {
  const al = lqBridgeAl(); if (al <= 0.001) return;
  const size = o.size ?? 70, ph = size * 1.5, gap = size * 0.2, t0 = E0 + (o.at ?? 0.6), lines = str.split('\n'), yLast = o.y ?? 1452, cx = o.x ?? CX;
  const hi = o.hi ?? LQ.g.coral, col = o.c ?? LQ.ink;
  let k = 0;
  ctx.save(); ctx.globalAlpha = al;
  lines.forEach((line, li) => {
    const words = line.split(/(\*[^*]+\*)/).filter((g) => g.trim()).flatMap((g) => (g[0] === '*' ? g.slice(1, -1).trim().split(/\s+/).map((w) => ({ w, hi: true })) : g.trim().split(/\s+/).map((w) => ({ w, hi: false }))));
    lqFont(size); const sp = ctx.measureText(' ').width, ws = words.map((d) => lqTextW(d.w, size)), tw = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    const by = yLast - (lines.length - 1 - li) * (ph + gap), tl = t0 + li * 0.14, p = lqPop(tl, 300, 20);
    if (TT < tl) { k += words.length; return; }
    if (o.plate !== false) {
      const pw = (tw + size * 1.1) * lerp(0.35, 1, p), hh = ph * lerp(0.6, 1, Math.min(1, p));
      lqPlate(cx - pw / 2, by - size * 0.36 - hh / 2, pw, hh, o.plate ?? '#ffffff', clamp((TT - tl) * 8));
    }
    let xx = cx - tw / 2;
    words.forEach((d, i) => {
      const tw0 = tl + 0.08 + i * 0.07, q = lqPop(tw0, 280, 17), a = clamp((TT - tw0) * 9); k++;
      if (a > 0) lqText(d.w, xx, by + (1 - q) * size * 0.45, size, col, { al: a, grad: d.hi ? hi : null });
      xx += ws[i] + sp;
    });
  });
  ctx.restore();
}
//   a small tag, top-left: a gradient bead with the number, then the label. o: c (pair), x, y
function lqTagNow(num, label, o = {}) {
  const al = lqBridgeAl(), t0 = E0 + (o.at ?? 0.15); if (al <= 0.001 || TT < t0) return;
  const x = o.x ?? 70, y = o.y ?? 262, h = 72, size = 32, p = lqPop(t0, 300, 20), lw = lqTextW(label, size), w = (h + 16 + lw + 34) * lerp(0.4, 1, p);
  ctx.save(); ctx.globalAlpha = al * clamp((TT - t0) * 8);
  lqPlate(x, y, w, h, '#ffffff');
  lqFill(lqCirclePts(x + h / 2, y + h / 2, h / 2 - 8, 32), o.c ?? LQ.g.coral, { shadow: false, gloss: 0.7 });
  const a = clamp((TT - t0 - 0.1) * 8);
  lqText(num, x + h / 2, y + h / 2 + 2, 26, '#ffffff', { align: 'center', base: 'middle', al: a });
  lqText(label, x + h + 12, y + h / 2 + 2, size, LQ.ink, { base: 'middle', al: a });
  ctx.restore();
}
const lqTag = (num, label, o = {}) => { const f = () => lqTagNow(num, label, o); if (DEFER) DEFER.push(f); else f(); };
const lqCaption = (str, o = {}) => { const f = () => lqCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  bridges: register the two gradient pairs of a morph so the shape keeps its real gradients while it changes
//  (the renderer only hands STYLE.blob one blended colour). Call once, beside BRIDGES: lqBridgePair(3.0, pairA, pairB).
// ---------------------------------------------------------------------
const LQ_BRIDGE = {};
function lqBridgePair(tc, a, b) { LQ_BRIDGE['morph' + tc] = [a, b]; LQ_BRIDGE['mA' + tc] = [a, a]; LQ_BRIDGE['mB' + tc] = [b, b]; }

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'liquid',
  paper: LQ.paper,
  // a bridge happens on the clean paper (blending two grounds half-way gives a grey that no liquid frame has)
  backdrop(c, o) { fillAll(o && o.phase ? STYLE.paper : c); },
  // the era seen through the liquid outline P; a rim of the shape's own gradient swells as the window leaves the object
  window(P, key, src, o = {}) {
    ctx.save(); lqPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, wd = 40 * (o.phase === 'grow' ? Math.min(1, u * 5) : Math.min(1, (1 - u) * 5));
    if (wd < 0.5) return;
    const pair = (LQ_BRIDGE[key] || [lqPair(o.c ?? LQ.g.coral[0])])[0], bb = lqBB(P);
    const x0 = Math.max(bb[0], -200), y0 = Math.max(bb[1], -200), x1 = Math.min(bb[2], W + 200), y1 = Math.min(bb[3], H + 200);
    const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, pair[0]); g.addColorStop(1, pair[1]);
    ctx.save(); ctx.lineJoin = 'round';
    lqPath(P); ctx.lineWidth = wd; ctx.strokeStyle = g; ctx.stroke();
    lqPath(P); ctx.lineWidth = wd * 0.16; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
    ctx.restore();
  },
  // the morphing shape: the same liquid surface, its two gradients blended, with a jelly squash through the change
  blob(P, c, key, u = 0) {
    const reg = LQ_BRIDGE[key], pair = reg ? [lqMix(reg[0][0], reg[1][0], u), lqMix(reg[0][1], reg[1][1], u)] : lqPair(c);
    const ce = lqCentroid(P), q = 0.09 * Math.sin(u * TAU), sx = 1 + q, sy = 1 / (1 + q);
    lqFill(lqSmooth(P.map(([x, y]) => [ce[0] + (x - ce[0]) * sx, ce[1] + (y - ce[1]) * sy]), 1), pair);
  },
  hero(x, y, r, o = {}) { lqHero(x, y, r * 0.8, { key: o.key, mood: o.mood }); },
  heroColor: LQ.g.sky[1],
  heroPts(x, y, r) { return lqHeroPts(x, y, r * 0.8); },
  post() {},
  ones: true,
};
