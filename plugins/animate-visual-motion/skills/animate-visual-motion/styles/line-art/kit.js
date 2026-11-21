// =====================================================================
//  styles/line-art/kit.js — minimalist monoline illustration.
//  One constant line weight (round caps and joins), a calm off-white / soft tinted ground, a near-black line and
//  exactly ONE accent colour, used only as a flat blob sitting out of register behind the line drawing.
//  The signature move is the continuous-line draw: one unbroken stroke traces the subject on (laDraw), then the
//  accent blob pops in behind it (laBlob). Lines are rigid: no wobble, no boil, no texture, no hatching.
//  Built on kit/core.js. Every helper is prefixed `la`. Needs from the piece head: CX (caption centre x).
//  Options (a part listed before the style in piece.json "build"): LA_ACCENT, LA_GROUND, LA_TINT, LA_WEIGHT.
// =====================================================================
const LA = {
  ground: typeof LA_GROUND !== 'undefined' ? LA_GROUND : '#f6f2ea',   // warm off-white: the sheet, and the morph paper
  tint: typeof LA_TINT !== 'undefined' ? LA_TINT : '#e9efe8',         // a soft sage tint: a second era's ground
  ink: '#1c1c21',                                                     // the line and the type
  soft: '#8c8c93',                                                    // secondary type only (tags), never a line
  accent: typeof LA_ACCENT !== 'undefined' ? LA_ACCENT : '#f6b85a',   // the one accent: flat blobs only
  w: typeof LA_WEIGHT !== 'undefined' ? LA_WEIGHT : 7,                // THE line weight, in screen px
  off: [-20, -16],                                                    // the register slip: the line sits up-left of its blob
};
const LA_SANS = '"Helvetica Neue", "Avenir Next", "Segoe UI", "Inter", "Roboto", "Noto Sans", "Liberation Sans", Arial, sans-serif';

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
const laZoom = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
function laPath(P, closed) {
  ctx.beginPath(); if (!P.length) return;
  ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  if (closed) ctx.closePath();
}
const laCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const laOffset = (P, dx, dy) => P.map((p) => (p[2] ? [p[0] + dx, p[1] + dy, 1] : [p[0] + dx, p[1] + dy]));
const laScale = (P, c, k) => P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
function laCirclePts(x, y, r, n = 96, a0 = 0, a1 = TAU) { return laEllipsePts(x, y, r, r, n, a0, a1); }
// an ellipse or an arc of one (a0 -> a1, any direction, may run past a full turn); the end point is included for arcs
function laEllipsePts(x, y, rx, ry, n = 96, a0 = 0, a1 = TAU) {
  const P = [], full = Math.abs(Math.abs(a1 - a0) - TAU) < 1e-6, m = full ? n : n - 1;
  for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / m; P.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
  return P;
}
// a calm organic blob: a circle with two slow lobes, seeded by key (static: the same key is the same blob every frame)
function laBlobPts(x, y, r, key = 'blob', o = {}) {
  const R = RNG('lablob', key), p1 = R.r(0, TAU), p2 = R.r(0, TAU), a2 = o.lump ?? 0.07, a3 = (o.lump ?? 0.07) * 0.6, n = o.n ?? 96, P = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + a2 * Math.sin(2 * a + p1) + a3 * Math.sin(3 * a + p2); P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * (o.sy ?? 1)]); }
  return P;
}
// a smooth rigid curve through control points [x, y, corner?]: a point with a truthy third value is a sharp corner.
// Returns a dense polyline (about `step` px apart) that laLine / laDraw stroke and reveal.
function laSpline(pts, o = {}) {
  const step = o.step ?? 6, out = [];
  const add = (x, y) => { const q = out[out.length - 1]; if (!q || Math.hypot(q[0] - x, q[1] - y) > 0.01) out.push([x, y]); };
  const flush = (run) => {
    const n = run.length; if (n < 2) return;
    const g = (i) => run[i < 0 ? 0 : i > n - 1 ? n - 1 : i];
    for (let i = 0; i < n - 1; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), k = n === 2 ? 1 : Math.max(2, Math.ceil(dist(p1, p2) / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        const f = (d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3);
        add(f(0), f(1));
      }
    }
    add(run[n - 1][0], run[n - 1][1]);
  };
  let run = [];
  pts.forEach((p, i) => { run.push(p); if (p[2] && i > 0 && i < pts.length - 1) { flush(run); run = [p]; } });
  flush(run);
  return out;
}
// mark a stretch of path as a retrace: the pen runs back over a line it already drew, so it costs no drawing time.
// (A continuous line that closes a loop has to pass the same edge twice; retraces keep the stroke unbroken.)
const laSkip = (P) => P.map(([x, y], i) => (i ? [x, y, 1] : [x, y]));
// join paths end to start into ONE continuous line (coincident joints are merged)
function laJoin(...parts) {
  const out = [];
  for (const part of parts) for (const p of part) { const q = out[out.length - 1]; if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.01) out.push(p); }
  return out;
}
// the same line drawn from its other end (retrace marks move with their segments)
function laReverse(P) { const n = P.length; return P.map((_, j) => { const p = P[n - 1 - j], fl = j > 0 && P[n - j][2]; return fl ? [p[0], p[1], 1] : [p[0], p[1]]; }); }
// drawn length (retraces count as zero)
function laLen(P) { let L = 0; for (let i = 1; i < P.length; i++) if (!P[i][2]) L += dist(P[i - 1], P[i]); return L; }
// the part of a line between two fractions of its drawn length
function laCut(P, a, b) {
  const L = laLen(P), A = L * clamp(a), Z = L * clamp(b), out = []; let acc = 0;
  if (Z <= A || P.length < 2) return out;
  const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  for (let i = 1; i < P.length; i++) {
    if (P[i][2]) { if (out.length) out.push(P[i]); continue; }
    const d = dist(P[i - 1], P[i]), s1 = acc + d;
    if (s1 < A) { acc = s1; continue; }
    if (!out.length) out.push(mix(P[i - 1], P[i], d ? clamp((A - acc) / d) : 0));
    if (s1 <= Z) out.push(P[i]); else { out.push(mix(P[i - 1], P[i], (Z - acc) / d)); break; }
    acc = s1;
  }
  return out;
}

// ---------------------------------------------------------------------
//  the line, the draw-on, the blob
// ---------------------------------------------------------------------
const laEase = (u) => { u = clamp(u); return lerp(u, u * u * (3 - 2 * u), 0.7); };   // a pen: nearly constant speed, soft at both ends
function laDot(x, y, r, c) { ctx.save(); ctx.fillStyle = c ?? LA.ink; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }
// stroke a line at THE weight (screen-constant under the camera). o: { frac, from, c, w, closed, al }. Returns the pen position.
function laLine(P, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0 || P.length < 2) return null;
  const Q = f >= 1 && !o.from ? P : laCut(P, o.from ?? 0, f); if (Q.length < 2) return null;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = (o.w ?? LA.w) / laZoom(); ctx.strokeStyle = o.c ?? LA.ink;
  if (o.al != null) ctx.globalAlpha = o.al;
  laPath(Q, o.closed && f >= 1 && !o.from); ctx.stroke(); ctx.restore();
  return Q[Q.length - 1];
}
// the continuous-line draw: reveal P along itself from time t0 over dur seconds, with a small pen dot at the head.
// o.start: the fraction already drawn at t0 (a line that enters the shot part-drawn). Returns the drawn fraction.
function laDraw(P, t0, dur, o = {}) {
  const u = clamp((TT - t0) / dur), f = lerp(o.start ?? 0, 1, laEase(u));
  if (TT < t0 && !o.start) return 0;
  const tip = laLine(P, { c: o.c, w: o.w, frac: f });
  if (tip && u > 0 && u < 1 && o.tip !== false) laDot(tip[0], tip[1], (o.w ?? LA.w) * 1.05 / laZoom(), o.c);
  return f;
}
// the fraction of P drawn at absolute time t by laDraw(P, t0, dur, o) and its inverse (when does the pen reach fraction f?)
const laFracAt = (t, t0, dur, o = {}) => lerp(o.start ?? 0, 1, laEase((t - t0) / dur));
function laTimeOf(f, t0, dur, o = {}) { let a = 0, b = 1; const want = clamp((f - (o.start ?? 0)) / (1 - (o.start ?? 0))); for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (laEase(m) < want) a = m; else b = m; } return t0 + dur * (a + b) / 2; }
// a flat fill (no outline)
function laFill(P, c) { ctx.save(); trace(P, true); ctx.fillStyle = c ?? LA.accent; ctx.fill(); ctx.restore(); }
// the accent blob: a flat shape that pops in at o.t0 (a springy scale from its centre). Draw it BEFORE the line it sits behind.
function laBlob(P, o = {}) {
  const k = o.t0 == null ? 1 : TT < o.t0 ? 0 : springEase(TT - o.t0, o.k ?? 240, o.d ?? 15);
  if (k <= 0.001) return 0;
  laFill(k === 1 ? P : laScale(P, laCentroid(P), k), o.c ?? LA.accent);
  return k;
}

// ---------------------------------------------------------------------
//  type: a thin clean sans. Weight 300 for sentences, 400 for the one stressed phrase.
// ---------------------------------------------------------------------
const laFont = (size, weight = 300) => `${weight} ${size}px ${LA_SANS}`;
function laTextW(str, size, weight = 300, track = 0) { ctx.save(); ctx.font = laFont(size, weight); const w = ctx.measureText(str).width + track * str.length; ctx.restore(); return w; }
// o: { align, weight, al, track (px between letters), base }
function laText(str, x, y, size, c, o = {}) {
  ctx.save(); ctx.font = laFont(size, o.weight ?? 300); ctx.fillStyle = c ?? LA.ink; ctx.textBaseline = o.base ?? 'alphabetic';
  if (o.al != null) ctx.globalAlpha *= clamp(o.al);
  const tr = o.track ?? 0, w = ctx.measureText(str).width + tr * str.length;
  let x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (!tr) { ctx.textAlign = 'left'; ctx.fillText(str, x0, y); }
  else for (const ch of str) { ctx.fillText(ch, x0, y); x0 += ctx.measureText(ch).width + tr; }
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  the hero: Garis, a sitting cat drawn in one continuous line. The line enters at the left foot, runs under the cat,
//  climbs the right flank, crosses the head and both ears, comes down the left flank and leaves as the tail,
//  which wraps in front of the paws and flicks up at the right. Eyes and a tiny mouth appear when the line is done.
//  Unit coords: base centre (0, 0), y up is negative, the ear tips at -1.98 (so r = half the cat's height).
// ---------------------------------------------------------------------
const LA_CAT = [
  [-0.52, 0, 1], [0.52, 0, 1], [0.66, -0.38], [0.57, -0.8], [0.36, -1.04], [0.56, -1.2], [0.6, -1.46], [0.58, -1.66],
  [0.56, -1.98, 1], [0.25, -1.73, 1], [0, -1.68], [-0.25, -1.73, 1], [-0.56, -1.98, 1],
  [-0.58, -1.66], [-0.6, -1.46], [-0.56, -1.2], [-0.36, -1.04], [-0.57, -0.8], [-0.66, -0.38], [-0.52, 0, 1],
];
const LA_TAIL = [[-0.2, -0.14], [0.3, -0.17], [0.72, -0.1], [0.96, -0.2], [1.03, -0.42], [0.9, -0.57]];
// the cat's line. (bx, by) = the middle of its base, r = half its height. o.sway = the tail tip's flick in radians.
function laCatPts(bx, by, r, o = {}) {
  const sw = o.sway ?? 0, c = Math.cos(sw), s = Math.sin(sw), px = 0.62, py = -0.1;
  const tail = LA_TAIL.map(([x, y], i) => { if (i < 3) return [x, y]; const k = (i - 2) / 3, cc = lerp(1, c, k), ss = s * k, dx = x - px, dy = y - py; return [px + dx * cc - dy * ss, py + dx * ss + dy * cc]; });
  return laSpline([...LA_CAT, ...tail].map(([x, y, k]) => [bx + x * r, by + y * r, k]), { step: Math.max(3, r * 0.03) });
}
// the closed body outline (no tail), for bridges
function laHeroPts(x, y, r) { return laSpline([...LA_CAT.slice(1), LA_CAT[1]].map(([px, py, k]) => [x + px * r, y + r + py * r, k]), { step: 8 }); }
// eyes + mouth. o: { on (0..1 pop), look (-1..1), lookY (-1..1), mood: 'calm' | 'happy', blink (true/false overrides the idle blink), key }
function laCatFace(bx, by, r, o = {}) {
  const on = clamp(o.on ?? 1); SPARK_AT = toScreen(bx, by - r * 1.36);
  if (on <= 0) return;
  const key = o.key ?? 'cat', blink = o.blink ?? ((F + 20 + key.length * 11) % 70 < 3);
  const lx = (o.look ?? 0) * r * 0.05, ly = (o.lookY ?? 0) * r * 0.04, ey = by - r * 1.37 + ly, er = r * 0.05 * EZ.back(on);
  for (const sgn of [-1, 1]) {
    const ex = bx + sgn * r * 0.25 + lx;
    if (o.mood === 'happy') laLine(laEllipsePts(ex, ey + r * 0.03, r * 0.07, r * 0.07, 12, Math.PI * 1.15, Math.PI * 1.85));
    else if (blink) laLine([[ex - r * 0.06, ey], [ex + r * 0.06, ey]]);
    else laDot(ex, ey, er);
  }
  laLine(laSpline([[bx - r * 0.07 + lx, by - r * 1.22 + ly], [bx + lx, by - r * 1.17 + ly], [bx + r * 0.07 + lx, by - r * 1.22 + ly]], { step: 3 }), { frac: on });
}
// the whole hero in one call. (x, y) = its centre, r = half its height.
// o: { frac (line drawn 0..1), blob (true = an accent blob behind it), blobAt (its pop time), sway, look, lookY, mood, blink, key }
function laHero(x, y, r, o = {}) {
  const by = y + r, key = o.key ?? 'cat', f = clamp(o.frac ?? 1);
  if (o.blob) laBlob(laBlobPts(x - LA.off[0] * 1.6, y - LA.off[1] * 1.2, r * 0.92, key), { t0: o.blobAt });
  const tip = laLine(laCatPts(x, by, r, { sway: o.sway ?? Math.sin(TT * 1.7 + key.length) * 0.2 }), { frac: f });
  if (tip && f < 1) laDot(tip[0], tip[1], LA.w * 1.05 / laZoom());
  laCatFace(x, by, r, { ...o, on: o.on ?? seg(f, 0.97, 1) });
}

// ---------------------------------------------------------------------
//  small subjects and background life (all monoline, all rigid)
// ---------------------------------------------------------------------
// a cup as part of a continuous line. (x, y) = the middle of its base, s = scale (1 = 240 px across the rim).
// The line enters at the base's left corner and leaves at the base's right corner (so a table line can run through it).
// o.handle: 'left' (default) | 'right' | 'none'.
function laCupPts(x, y, s = 1, o = {}) {
  const h = o.handle ?? 'left', T = (pts) => pts.map(([px, py, k]) => [x + px * s, y + py * s, k]);
  const flank = (sg) => laSpline(T([[72 * sg, 0], [94 * sg, -62], [110 * sg, -130], [120 * sg, -200]]));
  const withHandle = (sg, up) => {   // one flank, travelling up or down, with the handle looped in and its stretch of flank retraced
    const fl = flank(sg), a = laCut(fl, 0, 0.36), b = laCut(fl, 0.36, 0.74), c = laCut(fl, 0.74, 1), lo = b[0], hi = b[b.length - 1];
    const hd = laSpline([[lo[0], lo[1], 1], ...T([[140 * sg, -62], [176 * sg, -86], [182 * sg, -132], [154 * sg, -160]]), [hi[0], hi[1], 1]]);
    return up ? laJoin(a, b, laSkip(laReverse(b)), hd, c) : laJoin(laReverse(c), laReverse(b), laReverse(hd), laSkip(laReverse(b)), laReverse(a));
  };
  const plain = (sg, up) => (up ? flank(sg) : laReverse(flank(sg)));
  const rim1 = laEllipsePts(x, y - 200 * s, 120 * s, 30 * s, 72, 0, TAU + 1e-3), rim2 = laEllipsePts(x, y - 200 * s, 120 * s, 30 * s, 36, 0, Math.PI);
  return laJoin(
    T([[-72, 0], [72, 0]]),
    h === 'right' ? withHandle(1, true) : plain(1, true),
    rim1, laSkip(rim2),                                       // once round the rim, then the front arc again (a retrace) to reach the left
    h === 'left' ? withHandle(-1, false) : plain(-1, false),
    laSkip(T([[-72, 0], [72, 0]])),                           // back under the cup, over the line already there
  );
}
// a wisp of steam: a short S-curve whose drawn part travels upward and loops. (x, y) = its foot, h = its height.
// o: { period, amp, key, c }
function laSteam(x, y, h, t0, o = {}) {
  if (TT < t0) return;
  const per = o.period ?? 1.8, u = mod((TT - t0) / per, 1), ph = RNG('lasteam', o.key ?? x).r(0, TAU), amp = o.amp ?? h * 0.14, pts = [];
  for (let j = 0; j <= 6; j++) pts.push([x + Math.sin(j / 6 * TAU * 0.9 + ph) * amp * Math.sin(j / 6 * Math.PI * 0.9 + 0.3), y - h * j / 6]);
  const P = laSpline(pts, { step: 4 }), b = laEase(seg(u, 0, 0.62)), a = laEase(seg(u, 0.38, 1));
  if (b > a) laLine(P, { from: a, frac: b, c: o.c });
}
// short ray ticks around a circle, popping on one after another from t0 and turning slowly. o: { n, r0, r1, stagger, spin, c }
function laRays(x, y, r, t0, o = {}) {
  const n = o.n ?? 10, r0 = r + (o.r0 ?? 30), r1 = r + (o.r1 ?? 62), rot = (TT - t0) * (o.spin ?? 0.18) + (o.rot ?? 0);
  for (let i = 0; i < n; i++) {
    const k = laEase((TT - t0 - i * (o.stagger ?? 0.05)) / 0.22); if (k <= 0) continue;
    const a = i / n * TAU + rot, c = Math.cos(a), s = Math.sin(a);
    laLine([[x + c * r0, y + s * r0], [x + c * lerp(r0, r1, k), y + s * lerp(r0, r1, k)]], { c: o.c });
  }
}
// a far bird: two shallow arcs that flap slowly. s = wingspan.
function laBird(x, y, s, o = {}) {
  const fl = Math.sin(TT * (o.rate ?? 5) + (o.ph ?? 0)) * 0.35;
  for (const sg of [-1, 1]) laLine(laSpline([[x, y], [x + sg * s * 0.25, y - s * (0.16 + fl * 0.1)], [x + sg * s * 0.5, y - s * fl * 0.22]], { step: 3 }), { al: o.al });
}
// a potted plant as the END of a continuous line. (x, y) = the middle of the pot's base, s = scale (1 = 172 px across the rim).
// The line enters at the pot's base, right corner (coming from the right), closes the pot, then grows the stem and its leaves.
// o: { sway (radians, leaf tilt), leaves: [[height, side(-1|1|0 = top), length]] }
function laPlantPts(x, y, s = 1, o = {}) {
  const T = (pts) => pts.map(([px, py, k]) => [x + px * s, y + py * s, k]), sw = o.sway ?? 0;
  const ry = 20, top = -140, R = (a0, a1, n = 36) => laEllipsePts(x, y + top * s, 86 * s, ry * s, n, a0, a1);
  const right = T([[60, 0], [86, top]]), left = T([[-86, top], [-60, 0]]);
  const pot = laJoin(right, R(0, -Math.PI), left, T([[-60, 0], [60, 0]]), laSkip(right), R(0, Math.PI), laSkip(R(Math.PI, Math.PI / 2, 18)));
  const leaves = o.leaves ?? [[-250, -1, 118], [-335, 1, 124], [-415, -1, 104], [-480, 0, 128]];
  const stemX = (h) => Math.sin((h + 120) / 360 * Math.PI * 1.6) * 9;
  const nodes = [[0, top + ry], ...leaves.map(([h]) => [stemX(h), h])];
  const leaf = ([nx, ny], side, L, i) => {
    const a = (side === 0 ? -Math.PI / 2 : side < 0 ? -Math.PI * 0.82 : -Math.PI * 0.18) + sw * (side === 0 ? 0.6 : 1) * (i % 2 ? -1 : 1);
    const c = Math.cos(a), sn = Math.sin(a), wd = L * 0.27, q = (u, v) => [nx + c * u - sn * v, ny + sn * u + c * v];
    return laSpline(T([[nx, ny, 1], q(L * 0.42, -wd), [...q(L, 0), 1], q(L * 0.42, wd), [nx, ny, 1]]), { step: 4 });
  };
  const parts = [pot];
  leaves.forEach(([h, side, L], i) => { parts.push(laSpline(T([nodes[i], [(nodes[i][0] + nodes[i + 1][0]) / 2 + (i % 2 ? -4 : 4), (nodes[i][1] + nodes[i + 1][1]) / 2], nodes[i + 1]]), { step: 4 }), leaf(nodes[i + 1], side, L, i)); });
  return laJoin(...parts);
}

// ---------------------------------------------------------------------
//  captions and tags: drawn after the camera, at screen size (DEFER). They fade out over the first 0.3s of a bridge's
//  shrink and stay hidden until the new era has opened.
// ---------------------------------------------------------------------
function laLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3));
    if (TT >= r.tc && TT < r.tc + d - 1e-6) return 0;
  }
  return 1;
}
// 'line one\nline *stressed phrase*': each line fades up in turn; the stressed phrase is weight 400 and gets a flat
// accent pill slipped out of register behind it. o: { y (last baseline), size, at (seconds after the era starts), c, hi (false = no pill) }
function laCaptionNow(str, o = {}) {
  const al = laLeaving(); if (al <= 0.001) return;
  const size = o.size ?? 66, lh = size * 1.3, t0 = E0 + (o.at ?? 0.6), lines = str.split('\n'), yLast = o.y ?? 1430, cx = o.x ?? CX;
  ctx.save(); ctx.globalAlpha = al;
  lines.forEach((line, li) => {
    const k = EZ.o3((TT - t0 - li * 0.16) / 0.5); if (k <= 0) return;
    const y = yLast - (lines.length - 1 - li) * lh + (1 - k) * 18;
    const parts = line.split(/(\*[^*]+\*)/).filter((g) => g.length).map((g) => (g[0] === '*' ? { s: g.slice(1, -1), hi: true } : { s: g, hi: false }));
    const ws = parts.map((p) => laTextW(p.s, size, p.hi ? 400 : 300)), total = ws.reduce((a, b) => a + b, 0);
    let x = cx - total / 2;
    parts.forEach((p, i) => {
      if (p.hi && o.hi !== false) {
        const pk = TT < t0 + li * 0.16 + 0.3 ? 0 : springEase(TT - t0 - li * 0.16 - 0.3, 240, 16), lead = p.s.length - p.s.trimStart().length ? laTextW(' ', size, 400) : 0;
        const w = ws[i] - lead, px = x + lead - size * 0.2 - LA.off[0] * 0.45, py = y - size * 0.86 - LA.off[1] * 0.45, ph = size * 1.22, pw = w + size * 0.4;
        if (pk > 0.001) { ctx.save(); ctx.globalAlpha = al; laFill(laScale(rrectPts(px, py, pw, ph, ph / 2, 8), [px + pw / 2, py + ph / 2], pk), LA.accent); ctx.restore(); }
      }
      ctx.save(); ctx.globalAlpha = al * k; laText(p.s, x, y, size, o.c ?? LA.ink, { weight: p.hi ? 400 : 300 }); ctx.restore();
      x += ws[i];
    });
  });
  ctx.restore();
}
const laCaption = (str, o) => { const f = () => laCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
// the index tag, top left: "01 —— pagi" (a number, a short line that draws on, a spaced lower-case word)
function laTagNow(num, label, o = {}) {
  const al = laLeaving(), t0 = E0 + (o.at ?? 0.1); if (al <= 0.001 || TT < t0) return;
  const x = o.x ?? 80, y = o.y ?? 306, k = EZ.o3((TT - t0) / 0.5);
  ctx.save(); ctx.globalAlpha = al;
  const nw = laText(num, x, y, 36, LA.ink, { weight: 500, al: k });
  laLine([[x + nw + 18, y - 12], [x + nw + 18 + 64, y - 12]], { frac: laEase((TT - t0 - 0.1) / 0.4), w: LA.w * 0.5 });
  laText(label, x + nw + 18 + 64 + 18, y, 36, LA.ink, { weight: 300, track: 3, al: EZ.o3((TT - t0 - 0.25) / 0.5) });
  ctx.restore();
}
const laTag = (num, label, o) => { const f = () => laTagNow(num, label, o); if (DEFER) DEFER.push(f); else f(); };
function laGround(c) { fillAll(c ?? LA.ground); }

// =====================================================================
//  STYLE — the renderer's hooks
// =====================================================================
const STYLE = {
  name: 'line-art',
  paper: LA.ground,
  backdrop(c) { fillAll(c); },
  // an era seen through outline P: a clean clip with one monoline rim. Near the bridge shape the inside melts into the
  // flat accent and the rim slips out of register, so the window hands over to the blob (and back) without a pop.
  window(P, key, src, o = {}) {
    const c = o.c || LA.accent, u = clamp(o.u ?? 0), k = o.phase === 'grow' ? 1 - u : u, kk = k * k * k;
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0);
    if (kk > 0.002) { ctx.globalAlpha = kk; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    ctx.save(); trace(laOffset(P, LA.off[0] * kk, LA.off[1] * kk), true); ctx.lineWidth = LA.w; ctx.lineJoin = 'round'; ctx.strokeStyle = LA.ink; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: the flat accent blob and the same outline in ink, out of register
  blob(P, c) {
    laFill(P, c);
    ctx.save(); trace(laOffset(P, LA.off[0], LA.off[1]), true); ctx.lineWidth = LA.w; ctx.lineJoin = 'round'; ctx.strokeStyle = LA.ink; ctx.stroke(); ctx.restore();
  },
  hero(x, y, r, o = {}) { laHero(x, y, r * 0.9, { key: o.key, mood: o.mood === 'wow' ? 'happy' : o.mood, blob: true }); },
  heroColor: LA.accent,
  heroPts(x, y, r) { return laHeroPts(x, y, r * 0.9); },
  post() {},
  ones: true,
};
