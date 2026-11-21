// =====================================================================
//  styles/retro-80s/kit.js — RETRO 80s: an airbrushed poster / VHS cover / arcade flyer in daylight-to-sunset colour.
//  The medium is the smooth airbrush GRADIENT: every surface is a banded gradient fill (never a flat colour, never a
//  glowing tube): a sunset sky, a sun cut by sliding horizontal slats, flat silhouette ranges (mountains, palms, a
//  skyline), a perspective grid floor of SOLID coloured lines, chrome with a hard bevel and four-point sparkles,
//  and Memphis confetti with hard offset shadows. A light VHS finish (chroma offset, scanlines, grain) sits on top.
//  Built on kit/core.js. Motion on 1s. Helpers are prefixed r80…; the palette is R80. Needs from the piece head: CX.
// =====================================================================
const R80 = {
  paper: '#f7ead0',                                     // cream poster board: the ground a morph happens on
  cream: '#fff3d6', peach: '#ffd2b0',                   // light grounds, caption text, horizon lines
  indigo: '#24104f',                                    // silhouettes, outlines, hard shadows, the caption bar (never black)
  deep: '#3b1791', purple: '#6b2fb5',                   // the top of the sky, far ranges, floors
  mag: '#c0268f', pink: '#ff4f9e',                      // the sky's middle, grid lines, underlines, records
  orange: '#ff9a3c', yellow: '#ffd43b',                 // the sun, the horizon; yellow = the highlighted word
  teal: '#12c4b8',                                      // RESERVED for the hero (Kaset)
  sky: '#4fb4ff', blue: '#2438b8', brown: '#2a0f45',    // chrome: its sky half, its top, its dark band
  white: '#ffffff',
};
const R80_DISPLAY = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Franklin Gothic Heavy", "Arial Black", Futura, "Helvetica Neue", Arial, sans-serif';
const R80_SCRIPT = '"Brush Script MT", "Segoe Script", "Lucida Handwriting", "Snell Roundhand", "Comic Sans MS", cursive';
const R80_SUNSET = [[0, '#2a1470'], [0.3, '#7a2bbd'], [0.54, '#e0359f'], [0.72, '#ff4f9e'], [0.88, '#ff8a3c'], [1, '#ffd95a']];
const R80_CHROME = [[0, '#2438b8'], [0.27, '#4fb4ff'], [0.46, '#e4f6ff'], [0.5, '#ffffff'], [0.515, '#2a0f45'], [0.7, '#8a2a80'], [0.9, '#ff9d4d'], [1, '#ffe9a6']];

// ---------------------------------------------------------------------
//  colour (hex or rgb() in), gradients, caches
// ---------------------------------------------------------------------
function r80RGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const r80Mix = (a, b, u) => { const x = r80RGB(a), y = r80RGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const r80Tone = (c, k) => (k < 0 ? r80Mix(c, R80.indigo, -k) : r80Mix(c, '#ffffff', k));   // k < 0 deeper, k > 0 lighter
const r80A = (c, a) => { const [r, g, b] = r80RGB(c); return `rgba(${r},${g},${b},${a})`; };
const r80Hot = (c) => [r80Mix(c, '#fff2a8', 0.5), c, r80Mix(c, R80.mag, 0.45)];             // the airbrush ramp of a warm object (sun, record)
// a linear gradient; stops = ['#a', '#b', ...] (evenly spaced) or [[0, '#a'], [0.4, '#b'], ...]
function r80Lin(x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((s, i) => (Array.isArray(s) ? g.addColorStop(s[0], s[1]) : g.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, s)));
  return g;
}
const r80V = (y0, y1, stops) => r80Lin(0, y0, 0, y1, stops);
const R80_CACHE = new Map(), R80_GEO = new Map();
// a static picture painted once into an offscreen canvas (draw() paints with the normal helpers: ctx points at it)
function r80Cache(key, w, h, draw) {
  let cv = R80_CACHE.get(key);
  if (!cv) { cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h); const keep = ctx; ctx = cv.getContext('2d'); draw(cv); ctx = keep; R80_CACHE.set(key, cv); }
  return cv;
}
function r80Pat(key, w, h, draw) { let p = R80_GEO.get('pat' + key); if (!p) { p = ctx.createPattern(r80Cache('pat' + key, w, h, draw), 'repeat'); R80_GEO.set('pat' + key, p); } return p; }
const r80DotPat = (c = 'rgba(107,47,181,0.16)', gap = 54, r = 4.5) => r80Pat('dot' + c + gap + r, gap, gap, () => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(gap / 2, gap / 2, r, 0, TAU); ctx.fill(); });
function r80Path(P, closed = true) { ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (closed) ctx.closePath(); }
const r80Centroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// the beat pulse: 1 on the beat, falling to 0 before the next one
const r80Beat = (every = 0.5, sharp = 7, t0 = 0) => Math.exp(-mod(TT - t0, every) * sharp);
// a soft airbrush puff (a radial spray of colour c, alpha a at the centre): shading only, never a light source
function r80Puff(x, y, rx, ry, c, a = 0.4) {
  ctx.save(); ctx.translate(x, y); ctx.scale(rx / 100, ry / 100);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 100); g.addColorStop(0, r80A(c, a)); g.addColorStop(0.55, r80A(c, a * 0.45)); g.addColorStop(1, r80A(c, 0));
  ctx.fillStyle = g; ctx.fillRect(-100, -100, 200, 200); ctx.restore();
}
// a flat poster shape: fill = a colour or gradient stops (top to bottom of the shape); o: shadow (colour | true), off [dx, dy], line, lw, smooth
function r80Shape(P, fill, o = {}) {
  const path = () => (o.smooth ? trace(P, true) : r80Path(P)), bb = bbox(P);
  if (o.shadow) { const [dx, dy] = o.off ?? [10, 11]; ctx.save(); ctx.translate(dx, dy); path(); ctx.fillStyle = o.shadow === true ? R80.indigo : o.shadow; ctx.fill(); ctx.restore(); }
  path(); ctx.fillStyle = Array.isArray(fill) ? r80V(bb.y0, bb.y1, fill) : fill; ctx.fill();
  if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = o.lw ?? 5; ctx.lineJoin = 'round'; ctx.stroke(); }
}

// ---------------------------------------------------------------------
//  sparkles: the four-point star that sits on chrome, on the sun's rim, in the sky
// ---------------------------------------------------------------------
//   o: c (white), c2 (the small diagonal star, yellow), rot, al, shadow (true = a hard indigo copy, for light grounds)
function r80Sparkle(x, y, s, o = {}) {
  if (s <= 0.5) return;
  const st = (a, b, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -a); ctx.quadraticCurveTo(a * 0.07, -b * 0.07, b, 0); ctx.quadraticCurveTo(a * 0.07, b * 0.07, 0, a); ctx.quadraticCurveTo(-a * 0.07, b * 0.07, -b, 0); ctx.quadraticCurveTo(-a * 0.07, -b * 0.07, 0, -a); ctx.fill(); };
  const all = (c, c2) => { ctx.rotate(Math.PI / 4); st(s * 0.42, s * 0.42, c2); ctx.rotate(-Math.PI / 4); st(s, s * 0.74, c); ctx.beginPath(); ctx.arc(0, 0, s * 0.12, 0, TAU); ctx.fill(); };
  ctx.save(); ctx.globalAlpha *= o.al ?? 1;
  if (o.shadow) { ctx.save(); ctx.translate(x + s * 0.07, y + s * 0.08); ctx.rotate(o.rot ?? 0); all(R80.indigo, R80.indigo); ctx.restore(); }
  ctx.translate(x, y); ctx.rotate(o.rot ?? 0); all(o.c ?? R80.white, o.c2 ?? R80.yellow);
  ctx.restore();
}
// one sparkle that pops at t0: grows, turns a little, shrinks (o.dur 0.45)
function r80Twinkle(x, y, s, t0, o = {}) {
  const u = (TT - t0) / (o.dur ?? 0.45); if (u <= 0 || u >= 1) return;
  r80Sparkle(x, y, s * Math.sin(Math.PI * u) ** 0.8, { ...o, rot: (u - 0.5) * 0.9 });
}
// seeded sparkles popping on every beat inside a box; o: box [x0, y0, x1, y1], every (0.5), n (2 per beat), s [min, max], avoid [[x0, y0, x1, y1], ...]
function r80Twinkles(key, o = {}) {
  const every = o.every ?? 0.5, b = Math.floor(TT / every + 1e-6), box = o.box ?? [80, 280, 920, 900], R = RNG('r80tw', key, b), [s0, s1] = o.s ?? [34, 66];
  for (let i = 0; i < (o.n ?? 2); i++) {
    let x = 0, y = 0, ok = false;
    for (let k = 0; k < 8 && !ok; k++) { x = R.r(box[0], box[2]); y = R.r(box[1], box[3]); ok = !(o.avoid ?? []).some(([a, c, d, e]) => x > a && x < d && y > c && y < e); }
    const s = R.r(s0, s1), dt = R.r(0, every * 0.3);
    if (ok) r80Twinkle(x, y, s, b * every + dt, o);
  }
}

// ---------------------------------------------------------------------
//  the sunset set: sky, slatted sun, silhouette ranges, skyline, palms, the grid floor
// ---------------------------------------------------------------------
// the sky above horizon hy (world coords, cached): banded sunset gradient, airbrushed streaks, a warm haze, tiny stars
//   o: stops (R80_SUNSET), sun { x, y } (where the haze sits), stars (22), key
function r80Sky(hy, o = {}) {
  const M = 240, stops = o.stops ?? R80_SUNSET, key = ['sky', hy, o.key ?? '', o.sun ? o.sun.x + ',' + o.sun.y : ''].join('|');
  const cv = r80Cache(key, W + 2 * M, hy + M, () => {
    ctx.fillStyle = r80V(M * 0.5, hy + M, stops); ctx.fillRect(0, 0, W + 2 * M, hy + M);
    const R = RNG('r80sky', key);
    if (o.sun) r80Puff(M + o.sun.x, M + o.sun.y, 620, 470, '#fff0b0', 0.42);
    for (let i = 0; i < 10; i++) r80Puff(R.r(0, W + 2 * M), M + R.r(0.3, 0.97) * hy, R.r(260, 560), R.r(10, 26), i % 2 ? '#ffe9a8' : '#ff86c6', R.r(0.2, 0.42));
    for (let i = 0; i < (o.stars ?? 22); i++) r80Sparkle(R.r(0, W + 2 * M), M + R.r(-0.1, 0.3) * hy, R.r(5, 13), { al: R.r(0.45, 0.95), c2: '#ffc9ef' });
  });
  ctx.drawImage(cv, -M, -M);
}
// the gaps of a slatted disc between yTop and yBot: [[centre y, height], ...] sliding downward with phase ph, wider toward the bottom
function r80SlatGaps(yTop, yBot, n = 6, ph = 0, hMax = 30, open = 1) {
  const G = []; for (let k = 0; k < n; k++) { const f = (k + mod(ph, 1)) / n; G.push([lerp(yTop, yBot, f), lerp(1.5, hMax, f) * open]); } return G;
}
// fill outline P in horizontal bands, leaving the gaps open (what is behind shows through)
function r80BandFill(P, gaps, fill, dx = 0, dy = 0, smoothP = true) {
  const bb = bbox(P, 4); ctx.save(); ctx.translate(dx, dy); if (smoothP) trace(P, true); else r80Path(P); ctx.clip(); ctx.fillStyle = fill;
  let y0 = bb.y0;
  for (const [gy, gh] of gaps) { if (gh <= 0.2) continue; ctx.fillRect(bb.x0, y0, bb.x1 - bb.x0, gy - gh / 2 - y0); y0 = gy + gh / 2; }
  ctx.fillRect(bb.x0, y0, bb.x1 - bb.x0, bb.y1 - y0); ctx.restore();
}
const r80SunGaps = (bb, u = 0) => r80SlatGaps(lerp(bb.y0, bb.y1, 0.45), bb.y1, 6, TT * 0.9, (bb.y1 - bb.y0) * 0.075, 1 - u);
// the sun: an airbrushed disc cut by slats that slide down. o: c (orange), clipY (hide what is below this y: the horizon), shine
function r80Sun(x, y, r, o = {}) {
  const P = ellipsePts(x, y, r, r, 0, 64), bb = bbox(P);
  ctx.save();
  if (o.clipY != null) { ctx.beginPath(); ctx.rect(x - r * 2, y - r * 2, r * 4, o.clipY - (y - r * 2)); ctx.clip(); }
  r80BandFill(P, r80SunGaps(bb), r80V(bb.y0, bb.y1, o.stops ?? r80Hot(o.c ?? R80.orange)));
  ctx.save(); trace(P, true); ctx.clip(); r80Puff(x - r * 0.35, y - r * 0.5, r * 0.75, r * 0.5, '#ffffff', 0.34); ctx.restore();   // an airbrushed highlight
  ctx.restore();
}
const r80SunPts = (x, y, r) => ellipsePts(x, y, r, r, 0, 64);
// a silhouette mountain range standing on y. o: amp (200), step (90), x (parallax shift), stops [top, bottom],
//   gap [cx, halfWidth, floorK] (a dip, e.g. where the sun sits), sunX (the lit facets face it), lit (colour | false), bottom
function r80Range(key, y, o = {}) {
  const amp = o.amp ?? 200, step = o.step ?? 90, x0 = -600, n = Math.ceil((W + 1200) / step);
  let K = R80_GEO.get('rg' + key + step);
  if (!K) { const R = RNG('r80range', key); K = []; for (let i = 0; i <= n; i++) K.push(i % 2 ? R.r(0.55, 1) : R.r(0.1, 0.42)); R80_GEO.set('rg' + key + step, K); }
  const dx = o.x ?? 0, gap = o.gap, sunX = o.sunX ?? W / 2, P = [];
  for (let i = 0; i <= n; i++) { const x = x0 + i * step + dx; let k = K[i]; if (gap) k *= lerp(gap[2] ?? 0.08, 1, smooth(gap[1] * 0.45, gap[1], Math.abs(x - gap[0]))); P.push([x, y - amp * k]); }
  const bot = o.bottom ?? y + 6;
  r80Path([...P, [P[n][0], bot], [P[0][0], bot]]); ctx.fillStyle = r80V(y - amp, y, o.stops ?? [R80.purple, R80.indigo]); ctx.fill();
  if (o.lit !== false) for (let i = 1; i < n; i += 2) {   // an airbrushed facet on the slope facing the sun
    const p = P[i], v = P[p[0] < sunX ? i + 1 : i - 1]; if (v[1] - p[1] < 8) continue;
    r80Path([p, v, [lerp(p[0], v[0], 0.28), v[1]]]); ctx.fillStyle = r80V(p[1], v[1], [r80A(o.lit ?? '#ff9ad0', 0.6), r80A(o.lit ?? '#ff9ad0', 0)]); ctx.fill();
  }
}
// a silhouette skyline standing on y. o: amp (160), x0, x1, x (shift), stops, win (window colour | false)
function r80City(key, y, o = {}) {
  const xa = o.x0 ?? -100, xb = o.x1 ?? W + 100, gk = ['ct', key, xa, xb].join('|');
  let L = R80_GEO.get(gk);
  if (!L) {
    const R = RNG('r80city', key); L = []; let x = xa;
    while (x < xb) { const w = R.r(36, 78), h = R.r(0.3, 1), top = R.i(0, 3), wins = []; for (let r = 0; r < 14; r++) for (let c = 0; c < 4; c++) if (R.f() < 0.28) wins.push([c, r, R.f()]); L.push({ x, w, h, top, wins }); x += w + R.r(-2, 12); }
    R80_GEO.set(gk, L);
  }
  const amp = o.amp ?? 160, dx = o.x ?? 0;
  ctx.save(); ctx.translate(dx, 0); ctx.beginPath();
  for (const b of L) {
    const h = b.h * amp, t = y - h; ctx.rect(b.x, t, b.w, h + 6);
    if (b.top === 1) ctx.rect(b.x + b.w * 0.45, t - h * 0.22, b.w * 0.1, h * 0.22);
    else if (b.top === 2) ctx.rect(b.x + b.w * 0.22, t - 14, b.w * 0.56, 14);
    else if (b.top === 3) { ctx.moveTo(b.x, t); ctx.lineTo(b.x + b.w, t - 18); ctx.lineTo(b.x + b.w, t); ctx.closePath(); }
  }
  ctx.fillStyle = r80V(y - amp, y, o.stops ?? ['#4a1d8f', R80.indigo]); ctx.fill();
  if (o.win !== false) {
    ctx.fillStyle = o.win ?? R80.yellow; ctx.beginPath();
    for (const b of L) { const cw = b.w / 5, h = b.h * amp; for (const [c, r, p] of b.wins) { const wy = y - h + 10 + r * 13; if (wy > y - 12 || mod(TT * 0.7 + p * 5, 5) < 0.6) continue; ctx.rect(b.x + cw * (c + 0.75), wy, cw * 0.5, 6); } }
    ctx.fill();
  }
  ctx.restore();
}
// a silhouette palm: (x, base) the foot, h the trunk height. o: key, lean (-1..1), sway (radians; default a slow breeze), stops, fronds (8)
function r80Palm(x, base, h, o = {}) {
  const key = o.key ?? 'palm', lean = o.lean ?? 0.4, R = RNG('r80palm', key), sway = o.sway ?? Math.sin(TT * 1.7 + R.r(0, TAU)) * 0.06;
  const tx = x + lean * h * 0.3 + sway * h * 0.5, ty = base - h, cxm = x + lean * h * 0.02, cym = base - h * 0.55, L = [], Rr = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u, px = a * x + b * cxm + c * tx, py = a * base + b * cym + c * ty, w = lerp(h * 0.05, h * 0.022, u); L.push([px - w, py]); Rr.unshift([px + w, py]); }
  ctx.save(); ctx.fillStyle = r80V(ty - h * 0.3, base, o.stops ?? ['#5a22a6', R80.indigo]);
  r80Path([...L, ...Rr]); ctx.fill();
  const n = o.fronds ?? 8;
  for (let i = 0; i < n; i++) {
    const a = lerp(-200, 20, i / (n - 1)) * DEG + R.n(0.1) + sway * (1.2 + (i % 3) * 0.5), len = h * 0.46 * R.r(0.82, 1.1), droop = R.r(0.5, 0.75) + sway * 0.6, up = [], lo = [];
    for (let k = 0; k <= 18; k++) {
      const u = k / 18, px = tx + Math.cos(a) * len * u, py = ty + Math.sin(a) * len * u + droop * len * u * u, wd = len * 0.17 * Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 0.6;
      up.push([px, py - wd * 0.2]); lo.unshift([px + (k % 2 ? len * 0.012 : 0), py + wd * (k % 2 ? 1 : 0.42)]);
    }
    r80Path([...up, ...lo]); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(tx - h * 0.03, ty + h * 0.035, h * 0.034, 0, TAU); ctx.arc(tx + h * 0.035, ty + h * 0.045, h * 0.03, 0, TAU); ctx.fill();
  ctx.restore();
}
// the ground plane below horizon hy: a gradient floor with a perspective grid of SOLID lines scrolling toward the viewer.
//   o: speed (1.1 squares/s), vx (vanishing x), stops, c (line colour), gap (190: square width at the bottom), dz (0.3), w (7),
//      near (H: the y where a square is `gap` wide), hc (horizon line colour), sun { x } (a rippling reflection under the sun)
function r80Floor(hy, o = {}) {
  const t = o.t ?? TT, vx = o.vx ?? W / 2, near = o.near ?? H, bot = near + 260, h0 = near - hy, M = 300, stops = o.stops ?? [R80.deep, '#6a1fa8', R80.mag];
  const c = o.c ?? R80.pink, sx = o.gap ?? 190, dz = o.dz ?? 0.3, lw = o.w ?? 7, ph = mod(t * (o.speed ?? 1.1), 1), s = (bot - hy) / h0;
  ctx.save();
  ctx.beginPath(); ctx.rect(-M, hy, W + 2 * M, bot - hy); ctx.clip();
  ctx.fillStyle = r80V(hy, near, stops); ctx.fillRect(-M, hy, W + 2 * M, bot - hy);
  if (o.sun) for (let k = 0; k < 8; k++) {
    const y = hy + 16 + k * 17 + k * k * 4.5, hw = (150 - k * 13) * (1 + 0.13 * Math.sin(t * 5 + k * 1.7)), hh = 5 + k * 1.3;
    ctx.fillStyle = r80Mix(o.sun.c ?? '#ffe07a', R80.pink, k / 8); ctx.beginPath(); ctx.roundRect(o.sun.x - hw, y, hw * 2, hh, hh / 2); ctx.fill();
  }
  ctx.fillStyle = c; ctx.beginPath();
  for (let j = -64; j <= 64; j++) { const bx = vx + j * sx * s, w = lw * s / 2; ctx.moveTo(vx, hy); ctx.lineTo(bx - w, bot); ctx.lineTo(bx + w, bot); ctx.closePath(); }
  for (let i = -2; i < 44; i++) { const z = 1 + (i - ph) * dz, y = hy + h0 / z, w = Math.max(1.6, lw / z); ctx.rect(-M, y - w / 2, W + 2 * M, w); }
  ctx.fill();
  ctx.fillStyle = r80V(hy, hy + h0 * 0.15, [r80A(stops[0], 0.8), r80A(stops[0], 0)]); ctx.fillRect(-M, hy, W + 2 * M, h0 * 0.15);   // airbrushed distance
  ctx.restore();
  ctx.fillStyle = o.hc ?? '#fff0b0'; ctx.fillRect(-M, hy - 3, W + 2 * M, 6);
}
// a light poster wall (cached): a cream-to-peach gradient, a dotted grid, a few big pale Memphis shapes. o: stops, key, dot
function r80Wall(o = {}) {
  const M = 200, stops = o.stops ?? [R80.cream, R80.peach, '#ffb9cd'], key = 'wall|' + stops.join() + (o.key ?? '');
  const cv = r80Cache(key, W + 2 * M, H + 2 * M, () => {
    ctx.fillStyle = r80V(M, M + (o.hy ?? H * 0.7), stops); ctx.fillRect(0, 0, W + 2 * M, H + 2 * M);
    ctx.save(); ctx.beginPath(); ctx.arc(M + W + 20, M + 300, 330, 0, TAU); ctx.fillStyle = r80V(M - 30, M + 630, ['#ffe58f', '#ffc98a']); ctx.globalAlpha = 0.75; ctx.fill();
    ctx.beginPath(); ctx.arc(M + 30, M + 840, 210, 0, TAU); ctx.strokeStyle = '#ffb3cf'; ctx.lineWidth = 30; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 7; i++) { ctx.moveTo(M + 720 + i * 34, M + 1010); ctx.lineTo(M + 620 + i * 34, M + 1190); } ctx.strokeStyle = '#ffc3a0'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    ctx.fillStyle = r80DotPat(o.dot); ctx.fillRect(0, 0, W + 2 * M, H + 2 * M);
  });
  ctx.drawImage(cv, -M, -M);
}
// a scrolling pattern band (a Memphis border). kind: 'check' | 'tri' | 'stripe'; o: speed (px/s), a, b (the two colours)
function r80Band(y, h, kind = 'check', o = {}) {
  const a = o.a ?? R80.indigo, b = o.b ?? R80.cream, M = 200, sp = TT * (o.speed ?? 40);
  ctx.save(); ctx.beginPath(); ctx.rect(-M, y, W + 2 * M, h); ctx.clip(); ctx.fillStyle = b; ctx.fillRect(-M, y, W + 2 * M, h); ctx.fillStyle = a; ctx.beginPath();
  if (kind === 'check') { const cs = h / 2, off = mod(sp, cs * 2); for (let i = -2; i * cs < W + 2 * M; i++) ctx.rect(-M + i * cs - off + cs * 2, y + (mod(i, 2) ? cs : 0), cs, cs); }
  else if (kind === 'tri') { const off = mod(sp, h); for (let x = -M - off; x < W + M; x += h) { ctx.moveTo(x, y + h); ctx.lineTo(x + h / 2, y); ctx.lineTo(x + h, y + h); ctx.closePath(); } }
  else { const off = mod(sp, h); for (let x = -M - off - h; x < W + M; x += h) { ctx.moveTo(x, y + h); ctx.lineTo(x + h, y); ctx.lineTo(x + h * 1.5, y); ctx.lineTo(x + h * 0.5, y + h); ctx.closePath(); } }
  ctx.fill(); ctx.restore();
  ctx.fillStyle = a; ctx.fillRect(-M, y - 6, W + 2 * M, 6); ctx.fillRect(-M, y + h, W + 2 * M, 6);
}

// ---------------------------------------------------------------------
//  chrome: sky-blue top, a white horizon line, a dark band, a warm underside, a hard bevel, a shine that sweeps across
// ---------------------------------------------------------------------
// a white band sweeping across box bb at progress u (0..1); call under a clip
function r80ShineBand(bb, u, wd) {
  const hgt = bb.y1 - bb.y0, w = wd ?? hgt * 0.5, x = lerp(bb.x0 - w - hgt * 0.5, bb.x1 + hgt * 0.5, u);
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.transform(1, 0, -0.5, 1, 0.5 * bb.y1, 0); ctx.fillStyle = g; ctx.fillRect(x - hgt, bb.y0 - 4, w + hgt * 2, hgt + 8); ctx.restore();
}
// a chrome shape. P: outline; o: hole (an inner outline: a chrome frame), bevel (9), out (outline width 7), shadow [dx, dy] | false,
//   shine (0..1: the sweep's progress), smooth, stops (R80_CHROME)
function r80Chrome(P, o = {}) {
  const bb = bbox(P), bev = o.bevel ?? 9, rule = o.hole ? 'evenodd' : 'nonzero';
  const path = () => { if (o.smooth) trace(P, true); else r80Path(P); if (o.hole) { o.hole.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); } };
  const sh = o.shadow === undefined ? [9, 11] : o.shadow;
  ctx.save(); ctx.lineJoin = 'miter'; ctx.miterLimit = 4;
  if (sh) { ctx.save(); ctx.translate(sh[0], sh[1]); path(); ctx.fillStyle = ctx.strokeStyle = R80.indigo; ctx.lineWidth = o.out ?? 7; ctx.fill(rule); ctx.stroke(); ctx.restore(); }
  path(); ctx.strokeStyle = R80.indigo; ctx.lineWidth = o.out ?? 7; ctx.stroke();
  path(); ctx.fillStyle = r80V(bb.y0, bb.y1, o.stops ?? R80_CHROME); ctx.fill(rule); ctx.clip(rule);
  path(); ctx.lineWidth = bev * 2 + 5; ctx.strokeStyle = 'rgba(36,16,79,0.6)'; ctx.stroke();                                                    // the seam under the bevel
  path(); ctx.lineWidth = bev * 2; ctx.strokeStyle = r80V(bb.y0, bb.y1, [[0, '#ffffff'], [0.45, '#c4e8ff'], [0.56, '#a765cf'], [1, '#3a1560']]); ctx.stroke();   // the bevel: lit above, dark below
  if (o.shine != null && o.shine > 0 && o.shine < 1) r80ShineBand(bb, o.shine);
  ctx.restore();
}
// chrome lettering is painted once per word into a sprite (face, bevel, outline, hard shadow) plus a mask for the shine
function r80ChromeSprite(str, size, o = {}) {
  const fam = o.fam ?? R80_DISPLAY, sk = o.skew ?? 0.16, key = ['ct', str, size, fam, sk].join('|');
  let S = R80_GEO.get(key); if (S) return S;
  const font = `${size}px ${fam}`;
  ctx.save(); ctx.font = font; const m = ctx.measureText(str); ctx.restore();
  const w = m.width, asc = m.actualBoundingBoxAscent || size * 0.8, desc = m.actualBoundingBoxDescent || 0, pad = Math.ceil(size * 0.24 + sk * size), by = pad + Math.ceil(asc);
  const cw = Math.ceil(w + pad * 2), ch = Math.ceil(asc + desc + pad * 2), bev = size * 0.05;
  const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'); g.font = font; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.setTransform(1, 0, -sk, 1, sk * by, 0); return [c, g]; };
  const [cv, g] = mk(), [tv, t] = mk(), [mask, mg] = mk(), [sv, sg] = mk();
  const stops = (gr, st) => { st.forEach(([a, c]) => gr.addColorStop(a, c)); return gr; };
  mg.fillStyle = '#fff'; mg.fillText(str, pad, by);
  g.fillStyle = g.strokeStyle = R80.indigo; g.lineWidth = size * 0.1;
  g.fillText(str, pad + size * 0.06, by + size * 0.075); g.strokeText(str, pad + size * 0.06, by + size * 0.075);   // the hard shadow
  g.strokeText(str, pad, by);                                                                                       // the outline
  g.fillStyle = stops(g.createLinearGradient(0, by - asc, 0, by + desc), o.stops ?? R80_CHROME); g.fillText(str, pad, by);
  t.lineWidth = bev * 2 + size * 0.03; t.strokeStyle = 'rgba(36,16,79,0.6)'; t.strokeText(str, pad, by);
  t.lineWidth = bev * 2; t.strokeStyle = stops(t.createLinearGradient(0, by - asc, 0, by + desc), [[0, '#ffffff'], [0.45, '#c4e8ff'], [0.56, '#a765cf'], [1, '#3a1560']]); t.strokeText(str, pad, by);
  t.globalCompositeOperation = 'destination-in'; t.fillStyle = '#000'; t.fillText(str, pad, by);                   // keep the bevel inside the letters
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tv, 0, 0);
  sg.setTransform(1, 0, 0, 1, 0, 0);
  S = { cv, mask, sv, sg, pad, by, w, font, asc }; R80_GEO.set(key, S); return S;
}
// chrome display caps at baseline (x, y). o: align ('center'), shine (0..1), skew (0.16), fam, stops
function r80ChromeText(str, x, y, size, o = {}) {
  const S = r80ChromeSprite(str, size, o), al = o.align ?? 'center', x0 = al === 'center' ? x - S.w / 2 : al === 'right' ? x - S.w : x;
  ctx.drawImage(S.cv, x0 - S.pad, y - S.by);
  if (o.shine != null && o.shine > 0 && o.shine < 1) {
    const g = S.sg, cw = S.cv.width, ch = S.cv.height, bw = size * 0.55, bx = lerp(-bw - ch * 0.5, cw + ch * 0.5, o.shine);
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cw, ch);
    const gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.setTransform(1, 0, -0.5, 1, 0.5 * ch, 0); g.fillStyle = gr; g.fillRect(bx - ch, 0, bw + ch * 2, ch); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(S.mask, 0, 0);
    ctx.drawImage(S.sv, x0 - S.pad, y - S.by);
  }
  ctx.save(); ctx.font = S.font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillText(str, x0, y, S.w); ctx.restore();   // for the text check (it only sees fillText)
  return S.w;
}
// gradient display caps with a dark offset shadow (drawn live, so it can be scaled / revealed). o: stops, align, skew (0.16), fam, out (outline width)
function r80GradText(str, x, y, size, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -(o.skew ?? 0.16), 1, 0, 0);
  ctx.font = `${size}px ${o.fam ?? R80_DISPLAY}`; ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.fillStyle = ctx.strokeStyle = R80.indigo; ctx.lineWidth = o.out ?? size * 0.08;
  ctx.fillText(str, size * 0.06, size * 0.07); ctx.strokeText(str, size * 0.06, size * 0.07); ctx.strokeText(str, 0, 0);
  ctx.fillStyle = r80V(-size * 0.78, 0, o.stops ?? [R80.yellow, R80.orange, R80.pink]); ctx.fillText(str, 0, 0);
  ctx.restore();
}
// a casual brush-script accent word with a swash under it. o: rot (-0.1), reveal (0..1 written on from the left), shc
function r80Script(str, x, y, size, c, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.1); ctx.font = `${size}px ${R80_SCRIPT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(str).width, rv = clamp(o.reveal ?? 1); if (rv <= 0) { ctx.restore(); return; }
  ctx.beginPath(); ctx.rect(-w / 2 - size * 0.3, -size * 1.2, (w + size * 0.7) * rv, size * 2); ctx.clip();
  const draw = (col, dx, dy) => {
    ctx.fillStyle = ctx.strokeStyle = col; ctx.fillText(str, dx, dy);
    ctx.lineWidth = size * 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-w / 2 + dx, size * 0.3 + dy); ctx.quadraticCurveTo(dx, size * 0.44 + dy, w / 2 + size * 0.15 + dx, size * 0.2 + dy); ctx.stroke();
  };
  draw(o.shc ?? R80.indigo, size * 0.05, size * 0.06); draw(c, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Memphis confetti: squiggles, zigzags, triangles, dotted grids, half-circles, rings, plus signs; flat colour + a hard offset shadow
// ---------------------------------------------------------------------
//   kind: 'squig' | 'zig' | 'tri' | 'triO' | 'dots' | 'half' | 'ring' | 'plus'; s = its size; o: shadow (false = none), off [dx, dy], shc
function r80Mem(kind, x, y, s, c, rot = 0, o = {}) {
  if (s <= 1) return;
  const draw = (col) => {
    ctx.fillStyle = ctx.strokeStyle = col; ctx.lineWidth = s * 0.17; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    if (kind === 'squig') { for (let i = 0; i <= 28; i++) { const u = i / 28, px = (u - 0.5) * s * 2, py = Math.sin(u * TAU * 2) * s * 0.26; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
    else if (kind === 'zig') { ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; for (let i = 0; i <= 6; i++) { const px = (i / 6 - 0.5) * s * 2, py = (i % 2 ? -1 : 1) * s * 0.26; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
    else if (kind === 'tri' || kind === 'triO') { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3, px = Math.cos(a) * s * 0.64, py = Math.sin(a) * s * 0.64; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); if (kind === 'tri') ctx.fill(); else ctx.stroke(); }
    else if (kind === 'dots') { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { ctx.moveTo(i * s * 0.42 + s * 0.11, j * s * 0.42); ctx.arc(i * s * 0.42, j * s * 0.42, s * 0.11, 0, TAU); } ctx.fill(); }
    else if (kind === 'half') { ctx.arc(0, 0, s * 0.62, Math.PI, 0); ctx.closePath(); ctx.fill(); }
    else if (kind === 'ring') { ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.stroke(); }
    else { ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5); ctx.stroke(); }
  };
  if (o.shadow !== false) { const [dx, dy] = o.off ?? [7, 8]; ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(rot); draw(o.shc ?? R80.indigo); ctx.restore(); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); draw(c); ctx.restore();
}
// a seeded scatter of Memphis shapes that spring in one after another, spin slowly, float and pulse on the beat.
//   o: box [x0, y0, x1, y1], avoid [[x0, y0, x1, y1], ...], colors, kinds, size [min, max], t0 (era start), stagger (0.06),
//      at(i) (each shape's own start time), spin (0.5 rad/s), every (0.5: the beat), pulse (1)
function r80Confetti(key, n, o = {}) {
  const box = o.box ?? [70, 330, 930, 1290], avoid = o.avoid ?? [], cols = o.colors ?? [R80.pink, R80.yellow, R80.purple, R80.orange, R80.sky];
  const kinds = o.kinds ?? ['squig', 'tri', 'dots', 'zig', 'half', 'ring', 'plus', 'triO'], [s0, s1] = o.size ?? [46, 82];
  let L = R80_GEO.get('cf' + key);
  if (!L) {
    const R = RNG('r80conf', key); L = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < 60; k++) {
      const x = R.r(box[0], box[2]), y = R.r(box[1], box[3]), s = R.r(s0, s1);
      if (avoid.some(([a, b, c, d]) => x > a - s && x < c + s && y > b - s && y < d + s) || L.some((q) => Math.hypot(q.x - x, q.y - y) < (q.s + s) * 1.3)) continue;
      L.push({ x, y, s, kind: kinds[L.length % kinds.length], c: cols[(L.length * 2 + R.i(0, 1)) % cols.length], rot: R.r(0, TAU), dir: R.f() < 0.5 ? -1 : 1, ph: R.f() }); break;
    }
    R80_GEO.set('cf' + key, L);
  }
  const t0 = o.t0 ?? E0, st = o.stagger ?? 0.06, beat = r80Beat(o.every ?? 0.5);
  L.forEach((q, i) => {
    const s = springEase(TT - (o.at ? o.at(i) : t0 + i * st), 260, 14); if (s <= 0.02) return;
    r80Mem(q.kind, q.x, q.y + Math.sin(TT * 2.2 + q.ph * TAU) * 6, q.s * s * (1 + 0.1 * beat * (o.pulse ?? 1)), q.c, q.rot + q.dir * (o.spin ?? 0.5) * TT, o);
  });
}

// ---------------------------------------------------------------------
//  props for background life
// ---------------------------------------------------------------------
// an 80s stripe cloud: stacked rounded bars. o: key, stops
function r80Cloud(x, y, w, o = {}) {
  const R = RNG('r80cloud', o.key ?? 'c'), h = w * 0.085; ctx.save(); ctx.fillStyle = r80V(y - h, y + h * 5.4, o.stops ?? ['#fff6dc', '#ffc2d8']); ctx.beginPath();
  for (let i = 0; i < 4; i++) { const bw = w * (i === 1 || i === 2 ? R.r(0.8, 1) : R.r(0.42, 0.66)), bx = x - bw / 2 + R.n(w * 0.12); ctx.roundRect(bx, y + i * h * 1.45, bw, h, h / 2); }
  ctx.fill(); ctx.restore();
}
// a gull silhouette; flap -1..1
function r80Bird(x, y, s, flap = 0, c = R80.indigo) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = c; ctx.lineWidth = s * 0.15; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  const wy = -s * 0.36 * flap; ctx.moveTo(-s, wy); ctx.quadraticCurveTo(-s * 0.5, wy - s * 0.42, 0, 0); ctx.quadraticCurveTo(s * 0.5, wy - s * 0.42, s, wy); ctx.stroke(); ctx.restore();
}
// an eighth note with a hard shadow
function r80Note(x, y, s, c = R80.purple, rot = 0) {
  if (s <= 1) return;
  const draw = (col) => { ctx.fillStyle = ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.22, -0.4, 0, TAU); ctx.fill(); ctx.lineWidth = s * 0.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 0.26, -s * 0.06); ctx.lineTo(s * 0.26, -s); ctx.quadraticCurveTo(s * 0.7, -s * 0.8, s * 0.62, -s * 0.42); ctx.stroke(); };
  ctx.save(); ctx.translate(x + s * 0.09, y + s * 0.1); ctx.rotate(rot); draw(R80.indigo); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); draw(c); ctx.restore();
}
// a coloured vinyl record: an airbrushed disc, grooves, two shine wedges, a spinning label. o: c (pink), label (yellow), spin (radians), shadow
function r80Record(x, y, r, o = {}) {
  const c = o.c ?? R80.pink, spin = o.spin ?? TT * 3, P = ellipsePts(x, y, r, r, 0, 64);
  if (o.shadow !== false) { ctx.save(); ctx.translate(14, 16); trace(P, true); ctx.fillStyle = R80.indigo; ctx.fill(); ctx.restore(); }
  ctx.save(); trace(P, true); ctx.fillStyle = r80V(y - r, y + r, r80Hot(c)); ctx.fill(); ctx.clip();
  ctx.strokeStyle = r80A(r80Tone(c, -0.45), 0.5); ctx.lineWidth = 3;
  for (const k of [0.5, 0.6, 0.7, 0.78, 0.86, 0.93]) { ctx.beginPath(); ctx.arc(x, y, r * k, 0, TAU); ctx.stroke(); }
  for (const a of [-0.9, Math.PI - 0.9]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a - 0.2, a + 0.2); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill(); }   // the airbrushed shine stays put while the label turns
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, TAU); ctx.fillStyle = r80V(-r * 0.38, r * 0.38, ['#fff2a8', o.label ?? R80.yellow, R80.orange]); ctx.fill(); ctx.strokeStyle = R80.indigo; ctx.lineWidth = r * 0.03; ctx.stroke();
  ctx.fillStyle = R80.indigo; ctx.beginPath(); ctx.roundRect(-r * 0.26, -r * 0.2, r * 0.52, r * 0.07, r * 0.03); ctx.roundRect(-r * 0.18, r * 0.14, r * 0.36, r * 0.05, r * 0.02); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.06, 0, TAU); ctx.fillStyle = R80.cream; ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: Kaset, a little teal cassette tape whose two reels are its eyes. (x, y) = the body centre at rest, r = half its
//  width; it stands on y + 0.95r. o: key, c, mood 'smile' | 'happy' | 'wow', look [x, y] (-1..1), tilt (radians), sx, sy
//  (squash about the feet), lift, step (-1..1: which foot is up), spin (reel angle), blink, legs (false = none), shadow
// ---------------------------------------------------------------------
function r80Hero(x, y, r, o = {}) {
  const key = o.key ?? 'kaset', c = o.c ?? R80.teal, look = o.look ?? [0, 0], mood = o.mood ?? 'smile', lift = o.lift ?? 0;
  const hb = r * 1.3, leg = o.legs === false ? 0 : r * 0.3, gy = y + hb / 2 + leg, spin = o.spin ?? TT * 4, ink = R80.indigo;
  const blink = o.blink ?? (mod(TT + (hash(key) % 97) / 31, 2.9) < 0.1);
  SPARK_AT = toScreen(x, y - lift);
  if (o.shadow !== false) { const k = clamp(lift / (r * 1.6)); ctx.save(); ctx.globalAlpha *= 0.34 * (1 - 0.5 * k); ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(x, gy + r * 0.05, r * (1.05 - 0.3 * k), r * 0.13, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.translate(x, gy - lift); ctx.scale(o.sx ?? 1, o.sy ?? 1); ctx.translate(0, -(hb / 2 + leg)); ctx.rotate(o.tilt ?? 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (leg) for (const s of [-1, 1]) {   // short legs and yellow sneakers
    const up = Math.max(0, (o.step ?? 0) * s) * r * 0.14, fx = s * r * 0.42, fy = hb / 2 + leg - up;
    ctx.strokeStyle = ink; ctx.lineWidth = r * 0.11; ctx.beginPath(); ctx.moveTo(fx, hb / 2 - 4); ctx.lineTo(fx, fy - r * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(fx - r * 0.2 + s * r * 0.05, fy - r * 0.17, r * 0.4, r * 0.17, r * 0.08); ctx.fillStyle = R80.yellow; ctx.fill(); ctx.lineWidth = r * 0.05; ctx.stroke();
  }
  const B0 = rrectPts(-r, -hb / 2, 2 * r, hb, r * 0.16, 5);
  r80Path(B0); ctx.fillStyle = r80V(-hb / 2, hb / 2, [r80Tone(c, 0.42), c, r80Tone(c, -0.34)]); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = r * 0.07; ctx.stroke();
  ctx.save(); r80Path(B0); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(-r * 0.86, -hb / 2); ctx.lineTo(-r * 0.4, -hb / 2); ctx.lineTo(-r * 0.92, hb / 2); ctx.lineTo(-r * 1.4, hb / 2); ctx.fill(); ctx.restore();   // an airbrushed sheen
  // the shell's lower trapezoid, where the mouth sits
  r80Path([[-r * 0.56, hb / 2 - r * 0.035], [-r * 0.44, r * 0.3], [r * 0.44, r * 0.3], [r * 0.56, hb / 2 - r * 0.035]]); ctx.fillStyle = r80Tone(c, 0.3); ctx.fill(); ctx.lineWidth = r * 0.04; ctx.stroke();
  // the label: cream with three sunset stripes
  ctx.save(); ctx.beginPath(); ctx.roundRect(-r * 0.84, -r * 0.54, r * 1.68, r * 0.76, r * 0.08); ctx.fillStyle = R80.cream; ctx.fill(); ctx.clip();
  [R80.pink, R80.orange, R80.yellow].forEach((sc, i) => { ctx.fillStyle = sc; ctx.fillRect(-r, -r * 0.54 + i * r * 0.065, 2 * r, r * 0.07); });
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(-r * 0.84, -r * 0.54, r * 1.68, r * 0.76, r * 0.08); ctx.lineWidth = r * 0.04; ctx.stroke();
  // the tape window with the two reels = the eyes
  ctx.beginPath(); ctx.roundRect(-r * 0.66, -r * 0.3, r * 1.32, r * 0.46, r * 0.21); ctx.fillStyle = ink; ctx.fill();
  for (const s of [-1, 1]) {
    const ex = s * r * 0.37, ey = -r * 0.07, er = r * 0.18;
    ctx.fillStyle = R80.white;
    if (blink) { ctx.beginPath(); ctx.roundRect(ex - er, ey - r * 0.02, er * 2, r * 0.04, r * 0.02); ctx.fill(); continue; }
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b9a8e0'; ctx.lineWidth = r * 0.035; ctx.beginPath();
    for (let i = 0; i < 3; i++) { const a = spin * s + i * TAU / 3; ctx.moveTo(ex + Math.cos(a) * er * 0.72, ey + Math.sin(a) * er * 0.72); ctx.lineTo(ex + Math.cos(a) * er * 0.98, ey + Math.sin(a) * er * 0.98); }
    ctx.stroke(); ctx.strokeStyle = ink;
    const px = ex + clamp(look[0], -1, 1) * er * 0.3, py = ey + clamp(look[1], -1, 1) * er * 0.3, pr = er * (mood === 'wow' ? 0.4 : 0.5);
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    ctx.fillStyle = R80.white; ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.38, pr * 0.32, 0, TAU); ctx.fill();
  }
  // cheeks and mouth
  r80Puff(-r * 0.74, r * 0.36, r * 0.17, r * 0.12, R80.pink, 0.75); r80Puff(r * 0.74, r * 0.36, r * 0.17, r * 0.12, R80.pink, 0.75);
  ctx.strokeStyle = ctx.fillStyle = ink; ctx.lineWidth = r * 0.055;
  if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(0, r * 0.47, r * 0.075, r * 0.095, 0, 0, TAU); ctx.fill(); }
  else if (mood === 'happy') { ctx.beginPath(); ctx.moveTo(-r * 0.17, r * 0.4); ctx.arc(0, r * 0.4, r * 0.17, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.save(); ctx.clip(); ctx.fillStyle = R80.pink; ctx.beginPath(); ctx.ellipse(0, r * 0.58, r * 0.11, r * 0.07, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  else { ctx.beginPath(); ctx.arc(0, r * 0.37, r * 0.15, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.restore();
}
const r80HeroPts = (x, y, r) => rrectPts(x - r, y - r * 0.65, 2 * r, r * 1.3, r * 0.16, 6);

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). The caption is a solid dark-indigo slanted bar
//  with a pink underline bar behind it; cream italic display caps, one *word* in yellow. The tag is a small yellow
//  slanted plate. Both slide away as a bridge starts and come back when the next era is open.
// ---------------------------------------------------------------------
function r80BridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.i2(seg(TT, r.tc - d, r.tc - d + 0.22));
    if (TT >= r.tc && TT < r.tc + d + 0.25) return EZ.o3(seg(TT, r.tc + d - 0.1, r.tc + d + 0.25));
  }
  return 1;
}
const r80Slant = (w, h, sk = 0.22) => [[-w / 2 + sk * h / 2, -h / 2], [w / 2 + sk * h / 2, -h / 2], [w / 2 - sk * h / 2, h / 2], [-w / 2 - sk * h / 2, h / 2]];
//   o: y (bar centre, 1392), x (CX), size (62), at (seconds after the era starts, 0.5), hi (yellow), c (text), bar, under (pink), caps (true)
function r80CaptionNow(str, o = {}) {
  const k = r80BridgeK(), at = E0 + (o.at ?? 0.5); if (TT < at || k <= 0.004) return;
  const size = o.size ?? 62, cx = o.x ?? CX, cy = o.y ?? 1392, hi = o.hi ?? R80.yellow, col = o.c ?? R80.cream;
  const toks = str.split('*').map((s, i) => ({ s: (o.caps === false ? s : s.toUpperCase()).trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  ctx.save(); ctx.font = `${size}px ${R80_DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = (size * 0.035).toFixed(1) + 'px';
  toks.forEach((t, i) => { t.w = ctx.measureText(t.s).width; t.gap = i === 0 ? 0 : /^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.28; });
  const tw = toks.reduce((a, t) => a + t.w + t.gap, 0), w = tw + size * 1.5, h = size * 1.72;
  const sIn = springEase(TT - at, 320, 30), off = (1 - sIn) * -(cx + w) + (1 - k) * (W - cx + w);
  ctx.translate(cx + off, cy); ctx.rotate(-0.02);
  const P = r80Slant(w, h);
  ctx.save(); ctx.translate(12, 13); r80Path(P); ctx.fillStyle = o.under ?? R80.pink; ctx.fill(); ctx.restore();
  r80Path(P); ctx.fillStyle = o.bar ?? R80.indigo; ctx.fill();
  ctx.transform(1, 0, -0.14, 1, 0, 0);
  let xx = -tw / 2;
  toks.forEach((t, i) => {
    xx += t.gap; const p = springEase(TT - (at + 0.14 + i * 0.09), 260, 16);
    if (p > 0.05) { ctx.save(); ctx.translate(xx + t.w / 2, size * 0.36); ctx.scale(p, p); ctx.fillStyle = t.hi ? hi : col; ctx.fillText(t.s, -t.w / 2, 0); ctx.restore(); }
    xx += t.w;
  });
  ctx.restore();
}
//   o: x (70, the left edge), y (300, the centre), size (48), at (0.25), c (yellow), col (text)
function r80TagNow(str, o = {}) {
  const k = r80BridgeK(), p = springEase(TT - (E0 + (o.at ?? 0.25)), 260, 14) * k; if (p <= 0.05) return;
  const size = o.size ?? 48, s = (o.caps === false ? str : str.toUpperCase());
  ctx.save(); ctx.font = `${size}px ${R80_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = (size * 0.05).toFixed(1) + 'px';
  const w = ctx.measureText(s).width + size * 1.3, h = size * 1.6, P = r80Slant(w, h);
  ctx.translate((o.x ?? 70) + w / 2 + h * 0.11, o.y ?? 300); ctx.rotate(-0.035); ctx.scale(p, p);
  ctx.save(); ctx.translate(8, 9); r80Path(P); ctx.fillStyle = o.under ?? R80.pink; ctx.fill(); ctx.restore();
  r80Path(P); ctx.fillStyle = r80V(-h / 2, h / 2, ['#ffe98a', o.c ?? R80.yellow, R80.orange]); ctx.fill(); ctx.strokeStyle = R80.indigo; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.transform(1, 0, -0.14, 1, 0, 0); ctx.fillStyle = o.col ?? R80.indigo; ctx.fillText(s, size * 0.03, size * 0.36);
  ctx.restore();
  r80Twinkle((o.x ?? 70) + w + h * 0.1, (o.y ?? 300) - h * 0.5, 40, E0 + (o.at ?? 0.25) + 0.2, { shadow: true });
}
const r80Caption = (str, o = {}) => { const f = () => r80CaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const r80Tag = (str, o = {}) => { const f = () => r80TagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the VHS finish: a slight chroma offset (red slips 2px right), faint scanlines, soft film grain, a light vignette
// ---------------------------------------------------------------------
function r80Post(o = {}) {
  const dst = ctx.canvas, sc = r80Cache('scratch', W, H, () => {}), g = sc.getContext('2d'), dx = o.chroma ?? 2;
  ctx.save(); screen();
  if (dx) {
    g.globalCompositeOperation = 'copy'; g.drawImage(dst, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#ff0000'; g.fillRect(0, 0, W, H);   // the red channel alone
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#00ffff'; ctx.fillRect(0, 0, W, H);                                                            // take red out of the frame
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sc, 0, 0, dx, H, 0, 0, dx, H); ctx.drawImage(sc, dx, 0);                                            // put it back, shifted
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = r80Pat('scan', 4, 4, () => { ctx.fillStyle = 'rgba(36,16,79,0.11)'; ctx.fillRect(0, 0, 4, 1); ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(0, 2, 4, 1); });
  ctx.fillRect(0, 0, W, H);
  const k = F % 4, R = RNG('r80grain', F), gx = R.i(0, 255), gy = R.i(0, 255);
  ctx.translate(-gx, -gy);
  ctx.fillStyle = r80Pat('grain' + k, 256, 256, () => { const S = RNG('r80grainT', k); for (let i = 0; i < 2600; i++) { ctx.fillStyle = S.f() < 0.5 ? 'rgba(255,255,255,0.075)' : 'rgba(36,16,79,0.075)'; ctx.fillRect(S.i(0, 255), S.i(0, 255), 2, 2); } });
  ctx.fillRect(gx, gy, W, H); ctx.translate(gx, gy);
  ctx.drawImage(r80Cache('vig', W, H, () => { const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.74); v.addColorStop(0, 'rgba(36,16,79,0)'); v.addColorStop(1, 'rgba(36,16,79,0.3)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }), 0, 0);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'retro-80s',
  paper: R80.paper,
  // the poster board in colour c (hex, or rgb() mid-morph): an airbrushed top-to-bottom ramp and the dotted grid
  backdrop(c) {
    ctx.save(); screen(); ctx.fillStyle = r80V(0, H, [r80Tone(c, 0.3), c, r80Mix(c, R80.pink, 0.22)]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = r80DotPat(); ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  // the era seen through a hole with a chrome rim; the rim thins onto the bridge object
  window(P, key, src, o = {}) {
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, wd = 26 * (o.phase === 'grow' ? Math.min(1, u * 5) : Math.min(1, (1 - u) * 5)); if (wd < 1) return;
    const bb = bbox(P); ctx.save(); ctx.lineJoin = 'round';
    trace(P, true); ctx.strokeStyle = R80.indigo; ctx.lineWidth = wd + 10; ctx.stroke();
    ctx.strokeStyle = r80V(Math.max(bb.y0, -200), Math.min(bb.y1, H + 200), R80_CHROME); ctx.lineWidth = wd; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = wd * 0.14; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: an airbrushed disc with a hard shadow; the sun's slats close and a record's grooves appear as u goes 0 -> 1
  blob(P, c, key, u = 0) {
    const ce = r80Centroid(P), bb = bbox(P), gaps = r80SunGaps(bb, EZ.io(u));
    const k = EZ.io(u);   // the hard shadow slides out from under the disc (the sun has none, the record has one); never seen through the slats
    ctx.save(); ctx.beginPath(); ctx.rect(-50, -50, W + 100, H + 100); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip('evenodd');
    ctx.translate(14 * k, 16 * k); trace(P, true); ctx.fillStyle = R80.indigo; ctx.fill(); ctx.restore();
    r80BandFill(P, gaps, r80V(bb.y0, bb.y1, r80Hot(c)));
    ctx.save(); trace(P, true); ctx.clip();
    r80Puff(lerp(bb.x0, bb.x1, 0.32), lerp(bb.y0, bb.y1, 0.25), (bb.x1 - bb.x0) * 0.38, (bb.y1 - bb.y0) * 0.25, '#ffffff', 0.34 * (1 - u));
    ctx.strokeStyle = r80A(r80Tone(c, -0.45), 0.5 * u); ctx.lineWidth = 3;
    for (const k of [0.5, 0.6, 0.7, 0.78, 0.86, 0.93]) { trace(P.map(([x, y]) => [ce[0] + (x - ce[0]) * k, ce[1] + (y - ce[1]) * k]), true); ctx.stroke(); }
    ctx.restore();
    const s = Math.sin(Math.PI * u);
    r80Sparkle(lerp(bb.x0, bb.x1, 0.86), lerp(bb.y0, bb.y1, 0.12), 90 * s, { rot: u * 1.2, shadow: true });
    r80Sparkle(lerp(bb.x0, bb.x1, 0.08), lerp(bb.y0, bb.y1, 0.8), 56 * s, { rot: -u, shadow: true });
  },
  hero(x, y, r, o = {}) { r80Hero(x, y, r * 0.8, { key: o.key, mood: o.mood }); },
  heroColor: R80.teal,
  heroPts(x, y, r) { return r80HeroPts(x, y, r * 0.8); },
  post() { r80Post(); },
  ones: true,
};
