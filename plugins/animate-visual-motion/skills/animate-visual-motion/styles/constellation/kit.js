// =====================================================================
//  styles/constellation/kit.js — a star chart come alive, on top of kit/core.js.
//  A deep night sky (indigo to midnight blue, a milky-way band of thousands of tiny stars, a little nebula haze:
//  all painted ONCE into one offscreen layer that is only rotated / drifted per frame). Every subject is a
//  CONSTELLATION: bright stars of different magnitudes (sharp disc, soft halo, four-point spikes on the brightest)
//  joined by thin pale lines that stop short of each star, with a very faint "atlas illustration" behind. Chart
//  furniture in hairlines: coordinate arcs, a dotted ecliptic, a ring with degree ticks, small italic star names.
//  Planets, a moon, comets, shooting stars, orbits. Gold belongs to the hero (Kejora, a little gold star with a
//  short tail) and to the caption's highlighted word. Motion on 1s, calm.
//  Every helper is prefixed cst…; the palette is CST. Randomness only from RNG(key).
// =====================================================================
const CST = {
  paper: '#0a0f26',                                   // the bare sky a morph happens on
  night: '#060818', night2: '#101c40', deep: '#03040c', band: '#070a1b',
  star: '#f6f8ff', warm: '#ffe6b0', cool: '#b9d6ff',  // star white, a warm star, a cool star
  gold: '#ffc247', goldD: '#e2861a', goldL: '#fff3cc',  // the hero and the highlighted word ONLY
  line: '#a9bcda', ink: '#e3eaf8', dim: '#7f90b4',    // chart lines, text, quiet text
  violet: '#7b5fd0', teal: '#3db5ad',                 // nebula haze (low alpha only)
  moon: '#e6ebf5', planet: '#86bccb', ring: '#d5dcef', face: '#2a1c3a',
};
const CST_FONT = '"Avenir Next", "Gill Sans", Optima, "Helvetica Neue", "Segoe UI", Arial, sans-serif';
const CST_ITALIC = 'Baskerville, "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif';
const CST_CACHE = new Map();

// ---------------------------------------------------------------------
//  colour (hex or rgb() in, rgb()/rgba() out) and small helpers
// ---------------------------------------------------------------------
function cstRGB(c) {
  if (c[0] === '#') { const h = c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  return (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
}
const cstA = (c, a) => { const [r, g, b] = cstRGB(c); return `rgba(${r},${g},${b},${clamp(a)})`; };
const cstMix = (a, b, u) => { const x = cstRGB(a), y = cstRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const cstPx = () => { const t = ctx.getTransform(); return 1 / (Math.hypot(t.a, t.b) || 1); };   // one screen pixel in world units (hairlines stay hairlines under the camera)
const cstCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const cstPt = (p) => (Array.isArray(p) ? { x: p[0], y: p[1], r: p[2] ?? 6, c: p[3] ?? CST.star, name: p[4] } : { r: 6, c: CST.star, ...p });
// progress 0..1 through a list of times: unit k of a figure (its k-th line) finishes at times[k + 1]. Lets lines land on the beat.
// After the last line the figure "settles" (the last star's pop and flash) for CST_SETTLE more units, at the average pace.
const CST_SETTLE = 1.5;
function cstTimed(times, t = TT) {
  const n = times.length - 1, tot = n + CST_SETTLE; if (t <= times[0]) return 0;
  for (let i = 0; i < n; i++) if (t < times[i + 1]) return (i + (t - times[i]) / (times[i + 1] - times[i])) / tot;
  return Math.min(1, (n + (t - times[n]) / ((times[n] - times[0]) / n)) / tot);
}

// ---------------------------------------------------------------------
//  the sky. cstSkyLayer(key): ONE big square canvas (transparent) holding the nebula haze, the milky way and the
//  field stars, painted once. cstSky() fills the vertical night gradient, draws that layer rotated about a pole
//  (or drifted) and adds the only per-frame stars: ~110 twinklers.
//   o: key, pole [x, y] (the layer's centre lands here), rot (radians), dx, dy (drift), al, top, bottom (gradient), twinkle (false = off)
// ---------------------------------------------------------------------
const CST_SKY_R = 1450;
function cstGlow(c) {   // a small soft glow sprite per colour (cached): cheap halos for the many small stars
  const id = 'glow:' + c; if (CST_CACHE.has(id)) return CST_CACHE.get(id);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), q = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  q.addColorStop(0, cstA(c, 0.75)); q.addColorStop(0.25, cstA(c, 0.26)); q.addColorStop(1, cstA(c, 0)); g.fillStyle = q; g.fillRect(0, 0, 64, 64);
  CST_CACHE.set(id, cv); return cv;
}
function cstSkyLayer(key = 'sky') {
  const id = 'sky:' + key; if (CST_CACHE.has(id)) return CST_CACHE.get(id);
  const S = CST_SKY_R * 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), R = RNG('cstsky', key), gauss = () => (R.f() + R.f() + R.f() + R.f() - 2) / 2;
  const glow = (x, y, r, c, a) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, cstA(c, a)); q.addColorStop(0.5, cstA(c, a * 0.4)); q.addColorStop(1, cstA(c, 0)); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); };
  g.globalCompositeOperation = 'lighter';
  // nebula haze: big soft clouds in violet and teal, low alpha
  for (let i = 0; i < 16; i++) glow(R.r(0, S), R.r(0, S), R.r(300, 680), R.pick([CST.violet, CST.teal, CST.violet, '#3a59c8']), R.r(0.05, 0.11));
  // the milky way: a slightly bowed band through the centre — soft glows, then thousands of tiny stars
  const th = R.r(-1.0, -0.7), ca = Math.cos(th), sa = Math.sin(th), bandAt = (d, off) => { const bow = 150 * Math.sin(d / S * 5.2); return [S / 2 + ca * d - sa * (off + bow), S / 2 + sa * d + ca * (off + bow)]; };
  for (let i = 0; i < 46; i++) { const [x, y] = bandAt(R.r(-S * 0.72, S * 0.72), gauss() * 130); glow(x, y, R.r(170, 360), R.pick(['#8ea0e6', '#a48fe0', '#7fb0d8']), R.r(0.035, 0.07)); }
  for (let i = 0; i < 9000; i++) {
    const [x, y] = bandAt(R.r(-S * 0.72, S * 0.72), gauss() * 210), s = R.r(0.8, 1.9);
    g.fillStyle = cstA(R.pick([CST.star, CST.star, CST.cool, CST.warm]), R.r(0.14, 0.62)); g.fillRect(x, y, s, s);
  }
  // dark dust lanes inside the band (so it has structure)
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 22; i++) { const [x, y] = bandAt(R.r(-S * 0.7, S * 0.7), gauss() * 60), r = R.r(60, 150); const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, 'rgba(0,0,0,0.5)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.globalCompositeOperation = 'lighter';
  // field stars: many faint, few bright
  for (let i = 0; i < 2600; i++) {
    const x = R.r(0, S), y = R.r(0, S), m = R.f() ** 3.2, r = 0.7 + m * 2.5, c = R.pick([CST.star, CST.star, CST.star, CST.cool, CST.warm]);
    if (r > 2.0) { g.globalAlpha = 0.5; g.drawImage(cstGlow(c), x - r * 4.5, y - r * 4.5, r * 9, r * 9); g.globalAlpha = 1; }
    g.fillStyle = cstA(c, 0.34 + 0.6 * m); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // twinklers are NOT painted here: they are the per-frame stars (positions relative to the layer's centre)
  const tw = [];
  for (let i = 0; i < 110; i++) tw.push({ x: R.r(-CST_SKY_R, CST_SKY_R), y: R.r(-CST_SKY_R, CST_SKY_R), r: R.r(1.7, 3.3), c: R.pick([CST.star, CST.cool, CST.warm]), ph: R.r(0, TAU), sp: R.r(1.1, 2.6) });
  const out = { cv, tw };
  CST_CACHE.set(id, out); return out;
}
function cstSky(o = {}) {
  const L = cstSkyLayer(o.key), pole = o.pole ?? [W / 2, H * 0.47], al = o.al ?? 1;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.top ?? CST.night); g.addColorStop(0.55, cstMix(o.top ?? CST.night, o.bottom ?? CST.night2, 0.62)); g.addColorStop(1, o.bottom ?? CST.night2);
  ctx.fillStyle = g; ctx.fillRect(-W * 0.25, -H * 0.25, W * 1.5, H * 1.5);
  ctx.translate(pole[0] + (o.dx ?? 0), pole[1] + (o.dy ?? 0)); ctx.rotate(o.rot ?? 0);
  ctx.globalAlpha = al; ctx.drawImage(L.cv, -CST_SKY_R, -CST_SKY_R);
  if (o.twinkle !== false) for (const s of L.tw) {
    const k = 0.5 + 0.5 * Math.sin(TT * s.sp + s.ph), a = al * (0.18 + 0.82 * k * k);
    ctx.fillStyle = s.c;
    ctx.globalAlpha = a * 0.8; ctx.drawImage(cstGlow(s.c), s.x - s.r * 5, s.y - s.r * 5, s.r * 10, s.r * 10);
    ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.75 + 0.35 * k), 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// darken the whole era (a fade up from black: cstDim(1 - ev(E0, 0.5)))
function cstDim(al, c = CST.deep) { if (al <= 0.003) return; ctx.save(); ctx.globalAlpha = clamp(al); ctx.fillStyle = c; ctx.fillRect(-W * 0.25, -H * 0.25, W * 1.5, H * 1.5); ctx.restore(); }
function cstVignette() {
  if (CST_CACHE.has('vig')) return CST_CACHE.get('vig');
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const q = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.5, W / 2, H * 0.5, Math.hypot(W, H) * 0.6);
  q.addColorStop(0, 'rgba(2,3,10,0)'); q.addColorStop(1, 'rgba(2,3,10,0.62)'); g.fillStyle = q; g.fillRect(0, 0, W, H);
  CST_CACHE.set('vig', cv); return cv;
}

// ---------------------------------------------------------------------
//  a star: a sharp disc, a soft halo and (on bright ones) four diffraction spikes.
//   r = the disc radius (magnitude: 3 faint … 11 very bright)
//   o: c (tint), s (scale, for pops), al, tw (twinkle 0..1.5: scales halo and spikes), halo (radius in r, 4.6), spikes (default r >= 7.5), rot
// ---------------------------------------------------------------------
function cstStar(x, y, r, o = {}) {
  const c = o.c ?? CST.star, al = o.al ?? 1, tw = o.tw ?? 1, rr = r * (o.s ?? 1); if (rr <= 0.05 || al <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const hr = rr * (o.halo ?? 4.6), g = ctx.createRadialGradient(x, y, 0, x, y, hr);
  g.addColorStop(0, cstA(c, 0.5 * al * tw)); g.addColorStop(0.3, cstA(c, 0.16 * al * tw)); g.addColorStop(1, cstA(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, hr, 0, TAU); ctx.fill();
  if (o.spikes ?? r >= 7.5) {
    const L = rr * 5.6 * (0.8 + 0.2 * tw), w = Math.max(0.9, rr * 0.2);
    ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.fillStyle = cstA(c, 0.7 * al);
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, -w); ctx.lineTo(L, 0); ctx.lineTo(0, w); ctx.closePath();
    ctx.moveTo(0, -L); ctx.lineTo(w, 0); ctx.lineTo(0, L); ctx.lineTo(-w, 0); ctx.closePath(); ctx.fill();
    ctx.rotate(-(o.rot ?? 0)); ctx.translate(-x, -y);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = al; ctx.fillStyle = cstMix(c, '#ffffff', 0.55);
  ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
  ctx.restore();
}
// the tiny flash when a star lights: a thin ring opening and four short rays. t = seconds since it lit
function cstFlash(x, y, t, o = {}) {
  const d = o.dur ?? 0.45, u = t / d; if (u <= 0 || u >= 1) return;
  const r = (o.r ?? 12) + (o.grow ?? 58) * EZ.o3(u), a = (1 - u) ** 1.5 * (o.al ?? 1), px = cstPx();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = cstA(o.c ?? CST.star, 0.8 * a); ctx.lineWidth = 2 * px; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + Math.PI / 4; ctx.moveTo(x + Math.cos(an) * r * 1.15, y + Math.sin(an) * r * 1.15); ctx.lineTo(x + Math.cos(an) * r * 1.5, y + Math.sin(an) * r * 1.5); } ctx.stroke();
  ctx.restore();
}
// a small star cluster (a "seven sisters" patch): n stars and a faint haze, each twinkling on its own slow clock
function cstCluster(x, y, r, n = 9, key = 'cl', o = {}) {
  const R = RNG('cstcl', key), al = o.al ?? 1;
  ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.5); g.addColorStop(0, cstA(o.c ?? CST.cool, 0.13 * al)); g.addColorStop(1, cstA(o.c ?? CST.cool, 0)); ctx.fillStyle = g; ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3); ctx.restore();
  for (let i = 0; i < n; i++) {
    const a = R.r(0, TAU), d = r * Math.sqrt(R.f()) * 0.95, sr = R.r(2.2, 4.6), ph = R.r(0, TAU), sp = R.r(1.4, 3.2);
    cstStar(x + Math.cos(a) * d, y + Math.sin(a) * d, sr, { c: o.c ?? R.pick([CST.cool, CST.star]), al, tw: 0.55 + 0.6 * (0.5 + 0.5 * Math.sin(TT * sp + ph)), halo: 4, spikes: false });
  }
}

// ---------------------------------------------------------------------
//  constellation lines and figures
// ---------------------------------------------------------------------
// one line from star a to star b ([x, y, r]): it stops short of both stars (the atlas gap). o: frac, gap, w, c, al, head
function cstLink(a, b, o = {}) {
  const gap = o.gap ?? 9, ra = (a[2] ?? 5) + gap, rb = (b[2] ?? 5) + gap, d = dist(a, b), f = clamp(o.frac ?? 1); if (d <= ra + rb + 2 || f <= 0) return;
  const ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, x0 = a[0] + ux * ra, y0 = a[1] + uy * ra, L = (d - ra - rb) * f, px = cstPx();
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = o.c ?? CST.line; ctx.globalAlpha = o.al ?? 0.82; ctx.lineWidth = (o.w ?? 2.8) * px;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ux * L, y0 + uy * L); ctx.stroke();
  if (f < 1 && o.head !== false) { ctx.globalAlpha = 1; ctx.fillStyle = CST.star; ctx.beginPath(); ctx.arc(x0 + ux * L, y0 + uy * L, 3.2 * px, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// the faint "atlas illustration" behind a figure: outlines (closed: a whisper of fill + a dotted contour; { P, open: true }: dotted only)
function cstIllus(shapes, o = {}) {
  const al = o.al ?? 1; if (al <= 0.01 || !shapes || !shapes.length) return;
  const list = typeof shapes[0][0] === 'number' ? [shapes] : shapes, px = cstPx(), c = o.c ?? CST.line;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of list) {
    const open = !Array.isArray(s) && s.open, P = resample(Array.isArray(s) ? s : s.P, !open, o.step ?? 26);
    trace(P, !open);
    if (!open) { ctx.fillStyle = cstA(c, (o.fill ?? 0.075) * al); ctx.fill(); }
    ctx.setLineDash([0.1 * px, (o.gap ?? 9) * px]); ctx.lineWidth = (o.w ?? 2.4) * px; ctx.strokeStyle = cstA(c, (o.dot ?? 0.42) * al); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}
// when each star of a figure appears, in line units (line k is drawn over [k, k + 1]; its far star pops at k + 1)
function cstPlan(points, edges) {
  const at = points.map(() => Infinity);
  edges.forEach(([i, j], k) => { at[i] = Math.min(at[i], k); at[j] = Math.min(at[j], k + 1); });
  return at.map((v) => (v === Infinity ? edges.length : v));
}
const cstEase = (f) => { f = clamp(f); return f * f * (3 - 2 * f); };
// cstFigure(points, edges, o): draw a constellation.
//   points: [[x, y, r?, colour?, name?] | { x, y, r, c, name, side }], edges: [[i, j], …] in drawing order
//   o: progress (0..1: stars pop in one by one and each line is drawn from star to star, in edge order, then the last star settles; default 1),
//      ghost (0..1: stars not lit yet show as faint dots), illus (outline(s) for the faint picture), illusAl (0..1; default: fades up while the figure settles),
//      labels (true: draw each point's italic name), lineC, lineAl, w, gap, al, key, hero (index of a star to tint gold — use sparingly)
function cstFigure(points, edges, o = {}) {
  const P = points.map(cstPt), E = edges.length, p = clamp(o.progress ?? 1), u = p * (E + CST_SETTLE), at = cstPlan(P, edges), key = o.key ?? 'fig', al = o.al ?? 1, ghost = o.ghost ?? 0;
  if (o.illus) cstIllus(o.illus, { al: (o.illusAl ?? seg(u, E, E + CST_SETTLE)) * al, c: o.lineC });
  edges.forEach(([i, j], k) => { const f = cstEase(u - k); if (f > 0) cstLink([P[i].x, P[i].y, P[i].r], [P[j].x, P[j].y, P[j].r], { frac: f, c: o.lineC, al: (o.lineAl ?? 0.82) * al, w: o.w, gap: o.gap }); });
  P.forEach((s, i) => {
    const since = u - at[i], lit = p > 0 && since >= 0, c = o.hero === i ? CST.gold : s.c;
    const tw = 0.82 + 0.26 * Math.sin(TT * (1.2 + (hash(key, i) % 90) / 60) + i * 1.7);
    if (!lit) { if (ghost > 0) cstStar(s.x, s.y, Math.max(2.3, s.r * 0.42), { c, al: ghost * al, halo: 3.2, spikes: false, tw }); return; }
    const k = clamp(since / 0.7), fl = 1 - clamp(since / 1.5);
    if (fl > 0) cstFlash(s.x, s.y, 1 - fl, { dur: 1, c, r: s.r + 6, grow: 34 + s.r * 3, al });
    cstStar(s.x, s.y, s.r, { c, s: k < 1 ? EZ.back(k) : 1, al, tw: tw + fl * 0.9 });
    if (o.labels && s.name) cstLabel(s.name, s.x, s.y, { r: s.r, side: s.side, al: clamp((since - 0.6) / 1.2) * al });
  });
}
// where the "pen" is while a figure is being drawn — fly the hero here so it lights each star as the line reaches it.
// Returns [x, y, k (the line being drawn), f (0..1 along it)]. When the next line starts at another star, the pen flies there.
function cstFigurePen(points, edges, progress) {
  const P = points.map(cstPt), E = edges.length; if (!E) return [P[0].x, P[0].y, 0, 0];
  const u = clamp(progress) * (E + CST_SETTLE), k = Math.min(E - 1, Math.floor(u)), f = cstEase(u - k);
  const a = k === 0 ? P[edges[0][0]] : P[edges[k - 1][1]], b = P[edges[k][1]];
  return [lerp(a.x, b.x, f), lerp(a.y, b.y, f), k, f];
}
// cstFromOutline(pts, n, key): turn ANY closed outline into a constellation — n star positions (the outline's most
// telling corners, plus one or two stars inside when n >= 9) and the lines that link them. Seeded by key.
// Returns { points, edges, illus } for cstFigure(f.points, f.edges, { illus: f.illus, progress }).
function cstFromOutline(pts, n = 10, key = 'fig') {
  const Q = resample(pts, true, 6), N = Q.length, R = RNG('cstfo', key), ce = cstCentroid(Q);
  const inner = n >= 9 ? Math.max(1, Math.round(n * 0.14)) : 0, m = clamp(n - inner, 3, N);
  const far = (from) => { let b = 0, bd = -1; Q.forEach((q, i) => { const d = dist(q, from); if (d > bd) { bd = d; b = i; } }); return b; };
  const i0 = far(ce), idx = [...new Set([i0, far(Q[i0])])].sort((a, b) => a - b);
  const segD = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2); return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t); };
  while (idx.length < m) {   // add the outline point that sticks out farthest from the current star-to-star polygon
    let best = -1, bd = -1;
    for (let s = 0; s < idx.length; s++) { const a = idx[s], b = idx[(s + 1) % idx.length], cnt = ((b - a + N) % N) || N; for (let t = 1; t < cnt; t++) { const i = (a + t) % N, d = segD(Q[i], Q[a], Q[b]) + 0.02 * Math.min(t, cnt - t); if (d > bd) { bd = d; best = i; } } }
    if (best < 0) break; idx.push(best); idx.sort((a, b) => a - b);
  }
  const points = idx.map((i) => ({ x: Q[i][0], y: Q[i][1], r: R.r(4.6, 8), c: R.pick([CST.star, CST.star, CST.warm, CST.cool]) }));
  points[R.i(0, points.length - 1)].r = 10.5;   // one bright star with spikes
  const edges = points.map((_, i) => [i, (i + 1) % points.length]);
  const inside = (x, y) => { let c = false; for (let i = 0, j = N - 1; i < N; j = i++) { const a = Q[i], b = Q[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const bb = bbox(Q), size = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0);
  for (let k = 0, tries = 0; k < inner && tries < 400; tries++) {
    const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1); if (!inside(x, y)) continue;
    let near = 0, nd = 1e9; points.forEach((s, i) => { const d = Math.hypot(s.x - x, s.y - y); if (d < nd) { nd = d; near = i; } });
    if (nd < size * 0.16) continue;
    points.push({ x, y, r: R.r(4.2, 6.5), c: R.pick([CST.warm, CST.cool]) }); edges.push([near, points.length - 1]); k++;
  }
  return { points, edges, illus: pts };
}
// ready-made figures (generic, invented): each returns { points, edges, illus } in world coords. (x, y) = the anchor, s = scale.
function cstFig(x, y, s, pts, edges, illus) {
  return { points: pts.map(([px, py, r, c, name, side]) => ({ x: x + px * s, y: y + py * s, r: (r ?? 6) * Math.sqrt(s), c: c ?? CST.star, name, side })), edges,
    illus: illus.map((sh) => (Array.isArray(sh) ? sh.map(([px, py]) => [x + px * s, y + py * s]) : { ...sh, P: sh.P.map(([px, py]) => [x + px * s, y + py * s]) })) };
}
// a sailing boat (perahu): anchor = the middle of the deck. One unbroken pen path: deck, hull, sails, up the mast.
const cstBoat = (x, y, s = 1) => cstFig(x, y, s,
  [[0, -14, 6], [-212, -12, 7, CST.cool], [-138, 82, 5], [124, 82, 6, CST.warm], [224, -22, 7.5, CST.star, 'Haluan', 'r'], [-132, -92, 5], [0, -332, 10.5, CST.star, 'Tiang', 'r'], [172, -74, 6.5, CST.cool]],
  [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [5, 6], [6, 7], [7, 0], [0, 6]],
  [[[-240, -26], [-152, 98], [138, 98], [252, -38]], [[12, -350], [192, -68], [12, -46]], [[-12, -350], [-150, -86], [-12, -46]]]);
// a bird in flight (burung), flying left: anchor = its chest
const cstBird = (x, y, s = 1) => cstFig(x, y, s,
  [[-232, 12, 5, CST.warm, 'Paruh', 'b'], [-165, -16, 8], [-40, 20, 7], [150, 46, 6], [226, 8, 4.6], [220, 82, 4.6], [-12, -128, 6, CST.cool], [92, -236, 10.5, CST.star, 'Sayap', 'r'], [64, -106, 5], [192, -168, 7, CST.cool]],
  [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [2, 6], [6, 7], [2, 8], [8, 9]],
  [[[-244, 16], [-172, -40], [-40, -10], [150, 24], [236, -4], [232, 94], [150, 68], [-40, 54], [-150, 26]], [[-56, 8], [-22, -142], [100, -254], [44, -92], [12, 8]], [[22, 8], [66, -122], [206, -182], [132, -70], [74, 14]]]);
// a tree (pohon): anchor = the foot of the trunk
const cstTree = (x, y, s = 1) => cstFig(x, y, s,
  [[0, 0, 6], [0, -150, 7], [-150, -240, 6, CST.cool], [-96, -380, 5], [8, -452, 10.5], [124, -372, 6], [158, -226, 7, CST.cool], [4, -290, 5, CST.warm]],
  [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [1, 7]],
  [ellipsePts(4, -312, 196, 172, 0, 22), [[-24, 4], [-17, -150], [17, -150], [24, 4]]]);
// a hanging lantern (lentera): anchor = the middle of its foot; the warm star inside is the flame
const cstLantern = (x, y, s = 1) => cstFig(x, y, s,
  [[0, -372, 4.6], [0, -300, 7], [-82, -226, 5.5], [-116, -66, 6.5, CST.cool], [-72, 58, 5], [72, 58, 5], [116, -66, 6.5, CST.cool], [82, -226, 5.5], [0, -84, 10.5, CST.warm]],
  [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 1], [2, 7]],
  [[[0, -314], [-94, -234], [-130, -66], [-82, 72], [82, 72], [130, -66], [94, -234]]]);

// ---------------------------------------------------------------------
//  chart furniture: hairlines at low alpha
// ---------------------------------------------------------------------
// a coordinate grid: declination circles and right-ascension spokes about a pole (usually off-frame, so only arcs show)
//   o: pole [x, y], r0, dr, n (circles), spokes, rot, rmax, al, c
function cstGrid(o = {}) {
  const [px0, py0] = o.pole ?? [W * 1.1, -H * 0.1], r0 = o.r0 ?? 300, dr = o.dr ?? 260, n = o.n ?? 8, m = o.spokes ?? 24, px = cstPx();
  ctx.save(); ctx.strokeStyle = o.c ?? CST.line; ctx.globalAlpha = o.al ?? 0.13; ctx.lineWidth = 1.4 * px;
  ctx.beginPath(); for (let i = 0; i < n; i++) { ctx.moveTo(px0 + r0 + dr * i, py0); ctx.arc(px0, py0, r0 + dr * i, 0, TAU); }
  const r1 = o.rmax ?? r0 + dr * (n - 1);
  for (let i = 0; i < m; i++) { const a = (o.rot ?? 0) + i / m * TAU; ctx.moveTo(px0 + Math.cos(a) * r0, py0 + Math.sin(a) * r0); ctx.lineTo(px0 + Math.cos(a) * r1, py0 + Math.sin(a) * r1); }
  ctx.stroke(); ctx.restore();
}
// a dotted path (the ecliptic, a wave, a route). o: frac, gap, w, c, al, ticks (a short cross-tick every n-th px)
function cstDotted(P, o = {}) {
  const px = cstPx(), Q = (o.frac ?? 1) < 1 ? subPath(P, o.frac) : P; if (Q.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = o.c ?? CST.line; ctx.globalAlpha = o.al ?? 0.42; ctx.lineWidth = (o.w ?? 2.6) * px; ctx.setLineDash([0.1 * px, (o.gap ?? 11) * px]);
  trace(Q, false); ctx.stroke(); ctx.setLineDash([]);
  if (o.ticks) { const L = pathLen(Q), R2 = resample(Q, false, o.ticks); ctx.lineWidth = 1.4 * px; ctx.beginPath(); for (let i = 1; i < R2.length - 1; i++) { const a = R2[i - 1], b = R2[i + 1], d = dist(a, b) || 1, nx = -(b[1] - a[1]) / d * 7 * px, ny = (b[0] - a[0]) / d * 7 * px; ctx.moveTo(R2[i][0] - nx, R2[i][1] - ny); ctx.lineTo(R2[i][0] + nx, R2[i][1] + ny); } if (L > 0) ctx.stroke(); }
  ctx.restore();
}
// a bowed dotted ecliptic from (x0, y0) to (x1, y1); bow = how far its middle sags (px)
function cstEcliptic(x0, y0, x1, y1, bow = 120, o = {}) {
  const P = []; for (let i = 0; i <= 28; i++) { const u = i / 28; P.push([lerp(x0, x1, u), lerp(y0, y1, u) + bow * 4 * u * (1 - u)]); }
  cstDotted(P, { al: 0.34, gap: 13, ticks: 150, ...o });
}
// a chart ring with degree ticks. o: frac (draws round), rot, step (degrees per tick, 5), major (every n-th tick longer, 6), inner (second circle offset, 13), labels [[deg, 'text'], …], c, al
function cstRing(x, y, r, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const px = cstPx(), rot = o.rot ?? -Math.PI / 2, step = (o.step ?? 5) * DEG, major = o.major ?? 6, c = o.c ?? CST.line, al = o.al ?? 0.6;
  ctx.save(); ctx.strokeStyle = c; ctx.lineCap = 'round';
  ctx.globalAlpha = al; ctx.lineWidth = 1.8 * px; ctx.beginPath(); ctx.arc(x, y, r, rot, rot + TAU * f); ctx.stroke();
  if (o.inner !== 0) { ctx.globalAlpha = al * 0.5; ctx.lineWidth = 1.2 * px; ctx.beginPath(); ctx.arc(x, y, r - (o.inner ?? 13), rot, rot + TAU * f); ctx.stroke(); }
  ctx.globalAlpha = al; ctx.lineWidth = 1.5 * px; ctx.beginPath();
  const n = Math.round(TAU / step);
  for (let i = 0; i < n; i++) { if (i / n > f) break; const a = rot + i * step, L = i % major === 0 ? 24 : i % (major / 2) === 0 ? 15 : 9; ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * (r + L), y + Math.sin(a) * (r + L)); }
  ctx.stroke(); ctx.restore();
  for (const [deg, str] of o.labels ?? []) { const a = deg * DEG, la = clamp((f - mod(a - rot, TAU) / TAU) * 6); if (la > 0) cstText(str, x + Math.cos(a) * (r + 54), y + Math.sin(a) * (r + 54) + 8, o.size ?? 24, CST.ink, { italic: true, align: 'center', al: la * 0.7 }); }
}
// a small reticle marking a point: four ticks (and a circle). o: c, al, rot, circle
function cstCross(x, y, s = 22, o = {}) {
  const px = cstPx(); ctx.save(); ctx.strokeStyle = o.c ?? CST.line; ctx.globalAlpha = o.al ?? 0.6; ctx.lineWidth = 1.5 * px; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const a = (o.rot ?? 0) + i * Math.PI / 2; ctx.moveTo(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); }
  if (o.circle) { ctx.moveTo(x + s * 0.55, y); ctx.arc(x, y, s * 0.55, 0, TAU); }
  ctx.stroke(); ctx.restore();
}
// an orbit: a thin ellipse. o: frac, dash, c, al, w.   cstOrbitPt → [x, y, front] for a body at angle a (front = on the near half)
function cstOrbit(x, y, rx, ry, rot = 0, o = {}) {
  const px = cstPx(); ctx.save(); ctx.strokeStyle = o.c ?? CST.line; ctx.globalAlpha = o.al ?? 0.38; ctx.lineWidth = (o.w ?? 1.5) * px;
  if (o.dash) ctx.setLineDash([o.dash * px, o.dash * px]);
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, o.a0 ?? 0, (o.a0 ?? 0) + TAU * clamp(o.frac ?? 1)); ctx.stroke(); ctx.restore();
}
function cstOrbitPt(x, y, rx, ry, rot, a) { const c = Math.cos(rot), s = Math.sin(rot), ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; return [x + ex * c - ey * s, y + ex * s + ey * c, Math.sin(a) > 0]; }

// ---------------------------------------------------------------------
//  bodies: a moon, planets, comets, shooting stars
// ---------------------------------------------------------------------
// clip to the lit part of a disc: everything outside the shadow circle (the dark side stays sky, with a hint of earthshine)
function cstPhaseClip(x, y, r, phase, rot = 0, c = CST.moon) {
  const off = r * 2 * clamp(phase); ctx.fillStyle = cstA(c, 0.07); ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.beginPath(); ctx.rect(x - r * 2, y - r * 2, r * 4, r * 4); ctx.arc(x - Math.cos(rot) * off, y - Math.sin(rot) * off, r * 1.04, 0, TAU); ctx.clip('evenodd');
}
// a moon. o: phase (1 = full; 0.15–0.6 = a crescent), rot (which way the lit side faces, radians; 0 = lit on the right), c, al, glow, key
function cstMoon(x, y, r, o = {}) {
  const c = o.c ?? CST.moon, al = o.al ?? 1, phase = o.phase ?? 1, key = o.key ?? 'moon', R = RNG('cstmoon', key);
  ctx.save(); ctx.globalAlpha = al;
  if (o.glow !== 0) { const hr = r * 2.9, g = ctx.createRadialGradient(x, y, r * 0.7, x, y, hr), k = (o.glow ?? 1) * (phase >= 1 ? 1 : 0.55); g.addColorStop(0, cstA(c, 0.34 * k)); g.addColorStop(0.35, cstA(c, 0.1 * k)); g.addColorStop(1, cstA(c, 0)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, hr, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  if (phase < 1) cstPhaseClip(x, y, r, phase, o.rot ?? 0, c);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05); g.addColorStop(0, cstMix(c, '#ffffff', 0.7)); g.addColorStop(0.6, c); g.addColorStop(1, cstMix(c, CST.night2, 0.42));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  for (let i = 0; i < 5; i++) { const a = i * 2.4 + R.r(0, 1.2), d = r * R.r(0.25, 0.68), mr = r * R.r(0.14, 0.3); ctx.fillStyle = cstA(CST.night2, 0.085); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, mr, mr * R.r(0.6, 0.9), R.r(0, 3), 0, TAU); ctx.fill(); }
  ctx.lineWidth = Math.max(1, r * 0.018); for (let i = 0; i < 4; i++) { const a = R.r(0, TAU), d = r * R.r(0.2, 0.8), cr = r * R.r(0.04, 0.08); ctx.strokeStyle = cstA('#ffffff', 0.28); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
// a planet: a shaded disc lit from the upper left, faint bands, an optional ring (drawn half behind, half in front).
//   o: c, ring (true | { rx, ry, tilt, c, al, s }), bands (false = none), phase (as cstMoon: a crescent planet), rot, glow, al, key
function cstPlanet(x, y, r, o = {}) {
  const c = o.c ?? CST.planet, al = o.al ?? 1, key = o.key ?? 'planet', R = RNG('cstpl', key);
  const rg = o.ring ? { rx: r * 1.85, ry: r * 0.44, tilt: -0.28, c: CST.ring, al: 1, s: 1, ...(o.ring === true ? {} : o.ring) } : null;
  const ringHalf = (a0, a1) => {
    if (!rg || rg.al <= 0.01 || rg.s <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rg.tilt); ctx.scale(rg.s, rg.s * rg.ry / rg.rx); ctx.lineCap = 'butt';
    ctx.globalAlpha = al * rg.al * 0.5; ctx.strokeStyle = rg.c; ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.arc(0, 0, rg.rx - r * 0.15, a0, a1); ctx.stroke();
    ctx.globalAlpha = al * rg.al * 0.9; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(0, 0, rg.rx, a0, a1); ctx.stroke();
    ctx.globalAlpha = al * rg.al * 0.7; ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.arc(0, 0, rg.rx - r * 0.34, a0, a1); ctx.stroke();
    ctx.restore();
  };
  ctx.save(); ctx.globalAlpha = al;
  if (o.glow !== 0) { const hr = r * 2.4, g = ctx.createRadialGradient(x, y, r * 0.8, x, y, hr); g.addColorStop(0, cstA(c, 0.26 * (o.glow ?? 1))); g.addColorStop(1, cstA(c, 0)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, hr, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  ringHalf(Math.PI, TAU);   // the far half of the ring, behind the disc
  ctx.save(); ctx.globalAlpha = al; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  if (o.phase != null && o.phase < 1) cstPhaseClip(x, y, r, o.phase, o.rot ?? 0, c);
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.08, x - r * 0.1, y - r * 0.1, r * 1.25); g.addColorStop(0, cstMix(c, '#ffffff', 0.62)); g.addColorStop(0.45, c); g.addColorStop(1, cstMix(c, CST.night, 0.72));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if (o.bands !== false) { ctx.translate(x, y); ctx.rotate(rg ? rg.tilt : (o.rot ?? -0.2)); for (let i = 0; i < 5; i++) { const by = R.r(-0.8, 0.8) * r, bh = R.r(0.06, 0.16) * r; ctx.fillStyle = i % 2 ? cstA('#ffffff', 0.1) : cstA(CST.night2, 0.16); ctx.beginPath(); ctx.ellipse(0, by, r * 1.1, bh, 0, 0, TAU); ctx.fill(); } ctx.rotate(-(rg ? rg.tilt : (o.rot ?? -0.2))); ctx.translate(-x, -y); }
  ctx.restore();
  ringHalf(0, Math.PI);     // the near half, in front
}
// a comet: a small bright head and a tapering tail pointing along ang (radians), len long. o: r, c, al, w
function cstComet(x, y, ang, len, o = {}) {
  const c = o.c ?? CST.cool, al = o.al ?? 1, r = o.r ?? 5, w = (o.w ?? 1.5) * r; if (al <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, cstA(c, 0.62 * al)); g.addColorStop(0.3, cstA(c, 0.22 * al)); g.addColorStop(1, cstA(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -w); ctx.quadraticCurveTo(len * 0.35, -w * 0.55, len, 0); ctx.quadraticCurveTo(len * 0.35, w * 0.55, 0, w); ctx.closePath(); ctx.fill();
  ctx.restore();
  cstStar(x, y, r, { c, al, halo: 4, spikes: false });
}
// a shooting star crossing from → to. t = seconds since it started. o: from [x, y], to [x, y], dur (0.55), len (300), c, r
function cstShoot(t, o = {}) {
  const d = o.dur ?? 0.55, u = t / d; if (u <= 0 || u >= 1.35) return;
  const a = o.from ?? [W * 0.2, H * 0.25], b = o.to ?? [W * 0.55, H * 0.4], k = Math.min(1, u), x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k);
  const al = Math.min(1, u * 5) * (u > 1 ? 1 - (u - 1) / 0.35 : 1), len = (o.len ?? 300) * Math.min(1, u * 2.5) * (u > 1 ? 1 - (u - 1) / 0.35 : 1);
  cstComet(x, y, Math.atan2(a[1] - b[1], a[0] - b[0]), len, { c: o.c ?? CST.star, r: o.r ?? 4.2, al, w: 1.1 });
}

// ---------------------------------------------------------------------
//  the hero: Kejora, a small bright gold star with a short tail and two tiny dot eyes. It flies from star to star
//  and lights them. (x, y) = its centre, r = its body radius (points reach r, halo to ~3r). Sets SPARK_AT.
//   o: dir (the way the TAIL points, radians; default π = flying right), tail (0..1.6 length), mood: 'smile' | 'happy' | 'wow',
//      look [x, y] (-1..1), bob (false = still), spin (extra rotation), al, key
// ---------------------------------------------------------------------
function cstHeroPts(x, y, r, n = 5, rot = -Math.PI / 2, m = 60) {
  const P = []; for (let i = 0; i < m; i++) { const a = i / m * TAU, k = 0.79 + 0.21 * Math.cos(5 * (a - rot)); P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
  return P;
}
function cstHero(x, y, r, o = {}) {
  const key = o.key ?? 'kejora', al = o.al ?? 1, ph = (hash('cstk', key) % 628) / 100; if (al <= 0.01 || r <= 0.5) return;
  const cy = y + (o.bob === false ? 0 : Math.sin(TT * 3.3 + ph) * r * 0.09), dir = o.dir ?? Math.PI, tail = o.tail ?? 1, pulse = 0.5 + 0.5 * Math.sin(TT * 4.6 + ph);
  SPARK_AT = toScreen(x, cy);
  ctx.save(); ctx.globalAlpha = al; ctx.globalCompositeOperation = 'lighter';
  if (tail > 0.02) {   // the short tail and its sparkles
    const L = r * 3.1 * tail, w = r * 0.72; ctx.save(); ctx.translate(x, cy); ctx.rotate(dir);
    const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, cstA(CST.gold, 0.7)); g.addColorStop(0.45, cstA(CST.gold, 0.22)); g.addColorStop(1, cstA(CST.gold, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -w); ctx.quadraticCurveTo(L * 0.4, -w * 0.5, L, 0); ctx.quadraticCurveTo(L * 0.4, w * 0.5, 0, w); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 6; i++) { const R = RNG('cstks', key, i), u = mod(TT * R.r(0.9, 1.5) + R.f(), 1), sx = r * 0.8 + u * L * 0.95, sy = R.n(w * 0.8) * (1 - u * 0.5); star4(sx, sy, r * 0.2 * (1 - u) + 1, cstA(CST.goldL, 0.85 * (1 - u))); }
    ctx.restore();
  }
  const hr = r * (3 + 0.25 * pulse), g = ctx.createRadialGradient(x, cy, 0, x, cy, hr); g.addColorStop(0, cstA(CST.gold, 0.55)); g.addColorStop(0.35, cstA(CST.gold, 0.2)); g.addColorStop(1, cstA(CST.gold, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, hr, 0, TAU); ctx.fill();
  const SL = r * (2.1 + 0.3 * pulse), sw = r * 0.1; ctx.fillStyle = cstA(CST.goldL, 0.6);
  ctx.beginPath(); ctx.moveTo(x - SL, cy); ctx.lineTo(x, cy - sw); ctx.lineTo(x + SL, cy); ctx.lineTo(x, cy + sw); ctx.closePath(); ctx.moveTo(x, cy - SL); ctx.lineTo(x + sw, cy); ctx.lineTo(x, cy + SL); ctx.lineTo(x - sw, cy); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // the body: a chubby five-point star
  const rot = -Math.PI / 2 + (o.spin ?? 0) + Math.sin(TT * 2.1 + ph) * 0.07, P = cstHeroPts(x, cy, r, 5, rot);
  const bg = ctx.createRadialGradient(x - r * 0.25, cy - r * 0.3, r * 0.05, x, cy, r * 1.05); bg.addColorStop(0, CST.goldL); bg.addColorStop(0.5, CST.gold); bg.addColorStop(1, CST.goldD);
  trace(P, true); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = cstA(CST.goldL, 0.8); ctx.stroke();
  // the face: two tiny dot eyes and a small mouth
  const mood = o.mood ?? 'smile', lx = clamp(o.look?.[0] ?? 0, -1, 1) * r * 0.1, ly = clamp(o.look?.[1] ?? 0, -1, 1) * r * 0.08;
  const ex = r * 0.22, ey = cy - r * 0.06 + ly, er = r * (mood === 'wow' ? 0.105 : 0.085), blink = mod(TT + ph, 2.6) < 0.1;
  ctx.fillStyle = ctx.strokeStyle = CST.face; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.4, r * 0.065);
  for (const sgn of [-1, 1]) {
    const px0 = x + lx + sgn * ex;
    if (mood === 'happy') { ctx.beginPath(); ctx.arc(px0, ey + er * 0.7, er * 1.25, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); }
    else if (blink) { ctx.beginPath(); ctx.moveTo(px0 - er, ey); ctx.lineTo(px0 + er, ey); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(px0, ey, er, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(px0 + er * 0.3, ey - er * 0.35, er * 0.32, 0, TAU); ctx.fill(); ctx.fillStyle = CST.face; }
  }
  const my = cy + r * 0.2 + ly; ctx.beginPath();
  if (mood === 'wow') { ctx.ellipse(x + lx, my + r * 0.03, r * 0.075, r * 0.1, 0, 0, TAU); ctx.fill(); }
  else { ctx.arc(x + lx, my - r * (mood === 'happy' ? 0.1 : 0.06), r * (mood === 'happy' ? 0.17 : 0.12), Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  type: a thin elegant sans with wide tracking for labels; a small serif italic for star names
//   o: align, track (px), italic, weight, al, upper
// ---------------------------------------------------------------------
function cstFont(size, o = {}) { ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${size}px ${o.italic ? CST_ITALIC : CST_FONT}`; ctx.letterSpacing = `${o.track ?? 0}px`; }
function cstTextW(str, size, o = {}) { ctx.save(); cstFont(size, o); const w = ctx.measureText(o.upper ? str.toUpperCase() : str).width - (o.track ?? 0); ctx.restore(); return w; }
function cstText(str, x, y, size, c, o = {}) {
  const al = o.al ?? 1; if (al <= 0.01) return 0;
  const s = o.upper ? str.toUpperCase() : str, w = cstTextW(s, size, o), x0 = x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0);
  ctx.save(); cstFont(size, o); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha *= al; ctx.fillStyle = c ?? CST.ink; ctx.fillText(s, x0, y); ctx.restore();
  return w;
}
// a small italic star name beside a star. o: r (the star's radius), side: 'r' | 'l' | 't' | 'b', size (27), c, al
function cstLabel(str, x, y, o = {}) {
  const size = o.size ?? 27, d = (o.r ?? 6) + 15, side = o.side ?? 'r';
  if (side === 'l') cstText(str, x - d, y + size * 0.32, size, o.c ?? CST.ink, { italic: true, align: 'right', al: (o.al ?? 1) * 0.82 });
  else if (side === 't') cstText(str, x, y - d - 4, size, o.c ?? CST.ink, { italic: true, align: 'center', al: (o.al ?? 1) * 0.82 });
  else if (side === 'b') cstText(str, x, y + d + size * 0.72, size, o.c ?? CST.ink, { italic: true, align: 'center', al: (o.al ?? 1) * 0.82 });
  else cstText(str, x + d, y + size * 0.32, size, o.c ?? CST.ink, { italic: true, al: (o.al ?? 1) * 0.82 });
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). Both sit on a dark plate that is opaque
//  enough that no star shows through; both close as a bridge starts and reopen once the next era is open.
// ---------------------------------------------------------------------
function cstBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d - 0.05, r.tc - d + 0.2));
    if (TT >= r.tc && TT < r.tc + d + 0.25) return EZ.o2(seg(TT, r.tc + d - 0.1, r.tc + d + 0.25));
  }
  return 1;
}
function cstPlate(x, y, w, h, al = 1) {   // the dark cartouche: opaque fill, a hairline frame, a tick at each end
  ctx.save(); ctx.globalAlpha = al;
  ctx.fillStyle = cstA(CST.band, 0.95); ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = cstA(CST.line, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = cstA(CST.line, 0.22); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 14, y + 7); ctx.lineTo(x + w - 14, y + 7); ctx.moveTo(x + 14, y + h - 7); ctx.lineTo(x + w - 14, y + h - 7); ctx.stroke();
  ctx.restore();
}
//   'words *highlight* words'. o: y (band centre, 1392), x (CX), size (54), at (seconds after the era starts, 0.5), hi (the highlight colour: gold)
function cstCaptionNow(str, o = {}) {
  const p = EZ.o3(ev(E0 + (o.at ?? 0.5), 0.45)) * cstBridgeK(); if (p <= 0.02) return;
  const size = o.size ?? 54, cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), cy = o.y ?? 1392, track = size * 0.045, hi = o.hi ?? CST.gold;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s), sp = size * 0.3;
  toks.forEach((t, i) => { t.w = cstTextW(t.s, size, { track, weight: t.hi ? 600 : 400 }); t.gap = i === 0 ? 0 : /^[!?.,]/.test(t.s) ? size * 0.04 : sp; });
  const tw = toks.reduce((a, t) => a + t.w + t.gap, 0), bw = tw + size * 2.3, bh = size * 1.95, w = bw * lerp(0.12, 1, p);
  ctx.save(); cstPlate(cx - w / 2, cy - bh / 2, w, bh, Math.min(1, p * 3));
  star4(cx - w / 2 + size * 0.55, cy, size * 0.2, cstA(CST.line, 0.8 * p)); star4(cx + w / 2 - size * 0.55, cy, size * 0.2, cstA(CST.line, 0.8 * p));
  ctx.beginPath(); ctx.rect(cx - w / 2 + size * 0.95, cy - bh / 2, Math.max(0, w - size * 1.9), bh); ctx.clip();
  let xx = cx - tw / 2; const ta = clamp((p - 0.45) / 0.5);
  for (const t of toks) {
    xx += t.gap;
    if (t.hi) { ctx.save(); ctx.globalAlpha = ta * 0.7; ctx.strokeStyle = hi; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.setLineDash([0.1, 8]); ctx.beginPath(); ctx.moveTo(xx + 2, cy + size * 0.5); ctx.lineTo(xx + t.w - 2, cy + size * 0.5); ctx.stroke(); ctx.restore(); }
    cstText(t.s, xx, cy + size * 0.34, size, t.hi ? hi : (o.c ?? CST.ink), { track, weight: t.hi ? 600 : 400, al: ta });
    xx += t.w;
  }
  ctx.restore();
}
//   o: x (70, the left edge), y (300, the centre), size (36), at (0.25), c (the little star's colour)
function cstTagNow(str, o = {}) {
  const p = EZ.o3(ev(E0 + (o.at ?? 0.25), 0.4)) * cstBridgeK(); if (p <= 0.02) return;
  const size = o.size ?? 36, track = size * 0.24, x = o.x ?? 70, cy = o.y ?? 300, tw = cstTextW(str, size, { track, weight: 500, upper: true }), bw = tw + size * 2.7, bh = size * 1.8, w = bw * lerp(0.2, 1, p);
  ctx.save(); cstPlate(x, cy - bh / 2, w, bh, Math.min(1, p * 3));
  ctx.beginPath(); ctx.rect(x, cy - bh / 2, w - 8, bh); ctx.clip();
  star4(x + size * 0.85, cy, size * 0.36, o.c ?? CST.cool); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + size * 0.85, cy, size * 0.07, 0, TAU); ctx.fill();
  cstText(str, x + size * 1.65, cy + size * 0.35, size, CST.ink, { track, weight: 500, upper: true, al: clamp((p - 0.4) / 0.5) });
  ctx.restore();
}
const cstCaption = (str, o = {}) => { const f = () => cstCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const cstTag = (str, o = {}) => { const f = () => cstTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'constellation',
  paper: CST.paper,
  // the bare sky in colour c (hex, or rgb() mid-morph): the cached star field, still, a little dimmed
  backdrop(c) {
    ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(3,4,12,0.55)'); g.addColorStop(1, 'rgba(3,4,12,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(0.9); ctx.globalAlpha = 0.7; ctx.drawImage(cstSkyLayer().cv, -CST_SKY_R, -CST_SKY_R); ctx.restore();
  },
  // the era seen through a hole in the sky, rimmed like a chart ring: a hairline, a soft glow and a string of small stars
  window(P, key, src, o = {}) {
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, al = o.phase === 'grow' ? 1 - smooth(0.45, 0.95, u) : smooth(0, 0.35, u); if (al <= 0.01) return;
    ctx.save(); ctx.lineJoin = 'round';
    trace(P, true); ctx.strokeStyle = cstA(CST.cool, 0.16 * al); ctx.lineWidth = 16; ctx.stroke();
    trace(P, true); ctx.strokeStyle = cstA(CST.line, 0.9 * al); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
    const n = 14, off = (o.phase === 'grow' ? u : -u) * 0.6;
    for (let i = 0; i < n; i++) { const q = pointAt([...P, P[0]], mod(i / n + off, 1)), R = RNG('cstwin', i); cstStar(q[0], q[1], R.r(3.4, 7.4), { c: R.pick([CST.star, CST.cool, CST.warm]), al, tw: 0.8 + 0.4 * Math.sin(TT * 9 + i * 2.1), spikes: i % 5 === 0 }); }
  },
  // the morphing shape: a lit celestial body (halo, shaded disc) inside a turning chart ring with a few stars riding on it
  blob(P, c, key, u = 0) {
    const ce = cstCentroid(P), bb = bbox(P), r = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2, k = Math.sin(Math.PI * clamp(u));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const hr = r * 2.8, hg = ctx.createRadialGradient(ce[0], ce[1], r * 0.6, ce[0], ce[1], hr); hg.addColorStop(0, cstA(c, 0.34)); hg.addColorStop(0.4, cstA(c, 0.1)); hg.addColorStop(1, cstA(c, 0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(ce[0], ce[1], hr, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); trace(P, true);
    const g = ctx.createRadialGradient(ce[0] - r * 0.38, ce[1] - r * 0.42, r * 0.08, ce[0] - r * 0.05, ce[1] - r * 0.05, r * 1.2); g.addColorStop(0, cstMix(c, '#ffffff', 0.66)); g.addColorStop(0.5, c); g.addColorStop(1, cstMix(c, CST.night, 0.6));
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    cstRing(ce[0], ce[1], r * (1.5 + 0.12 * k), { rot: -Math.PI / 2 + u * 1.4, al: 0.25 + 0.4 * k, step: 10, major: 3, inner: 0 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + u * 2.4 + 0.5, d = r * (1.5 + 0.12 * k); cstStar(ce[0] + Math.cos(a) * d, ce[1] + Math.sin(a) * d, 4 + (i % 3) * 1.6, { c: i % 2 ? CST.cool : CST.star, al: 0.5 + 0.5 * k, spikes: i === 0 }); }
  },
  hero(x, y, r, o = {}) { cstHero(x, y, r * 0.5, { key: o.key, mood: o.mood, tail: 0.6, dir: Math.PI / 2 }); },
  heroColor: CST.gold,
  heroPts(x, y, r) { return cstHeroPts(x, y, r * 0.5); },
  // the lens: a soft vignette (cached)
  post() { ctx.save(); screen(); ctx.drawImage(cstVignette(), 0, 0); ctx.restore(); },
  ones: true,
};
