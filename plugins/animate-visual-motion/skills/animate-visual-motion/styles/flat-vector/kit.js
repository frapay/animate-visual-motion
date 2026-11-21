// =====================================================================
//  styles/flat-vector/kit.js — modern flat-vector motion graphics (the polished explainer / product-video look).
//  Clean geometric shapes with no outlines, rounded corners, a tight palette (cream or deep-navy ground,
//  one coral accent, yellow / teal / blue mids), flat single-tone shading (a darker facet, a bottom lip,
//  a 45-degree long shadow — never blur), bold sans type in pills, icons and UI cards built from primitives,
//  and a capsule mascot with two dot eyes and a bobble antenna. Motion on 1s, every entrance on a spring (pop-ins
//  with overshoot, staggers), hops with anticipation, stretch, a landing squash and follow-through, smooth camera moves. Built on kit/core.js (RNG, EZ, SPRING / springEase / springMove / springTrack,
//  rrectPts, ellipsePts, toScreen, TT / ev / DEFER / E0 / SPARK_AT).
//  Needs from the piece head: W, H, FPS, CX (caption centre x). Optional: `const FV_DARK = true` before the kit
//  for the navy ground as the default (paper, captions, tags).
// =====================================================================

// ---- palette (6-digit hex: the renderer's mixHex blends these)
const FV_DARKMODE = typeof FV_DARK !== 'undefined' && !!FV_DARK;
const FV = {
  cream: '#f6f1e7', creamD: '#ebe3d3', creamDD: '#ddd2bd',     // the light ground, its floor and its long shadow
  navy: '#1c2250', navyL: '#2a3270', navyD: '#151a40', navyDD: '#10132f',   // the dark ground / ink
  coral: '#ff6b4a', coralD: '#e2492b', coralL: '#ffa38c',       // THE accent (the hero, the one thing to look at)
  yellow: '#ffc23d', yellowD: '#eea21c', yellowL: '#ffe09a',
  teal: '#23c4a7', tealD: '#169c86', tealL: '#a6eadc',
  blue: '#4f7bff', blueD: '#3a5ee0', blueL: '#c9d6ff',
  white: '#ffffff', grey: '#cfd3e4', ink: '#1c2250', inkL: '#7a7fa6',
};
FV.paper = FV_DARKMODE ? FV.navy : FV.cream;
const FV_SANS = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
const FV_SHADE = 'rgba(16,19,47,0.20)';     // the facet: a darker flat tone laid over any colour
const FV_LIP = 'rgba(16,19,47,0.30)';       // the bottom lip of a 2.5D button / card

// ---------------------------------------------------------------------
//  colour helpers (accept '#rrggbb' or 'rgb(r,g,b)', return '#rrggbb')
// ---------------------------------------------------------------------
function fvRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const fvHex = (v) => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
const fvMix = (a, b, u) => { const x = fvRGB(a), y = fvRGB(b); return fvHex(x.map((v, i) => lerp(v, y[i], u))); };
const fvShade = (c, k = 0.22) => fvMix(c, FV.navyDD, k);
const fvTint = (c, k = 0.35) => fvMix(c, '#ffffff', k);
const fvLum = (c) => { const v = fvRGB(c); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; };

// ---------------------------------------------------------------------
//  shapes: polygons (dense enough to read as curves), no outlines
// ---------------------------------------------------------------------
function fvPath(P) { ctx.beginPath(); if (!P.length) return; ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
function fvHull(P) {   // convex hull (monotone chain)
  const S = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of S) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = S.length - 1; i >= 0; i--) { const p = S[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const fvCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const fvShift = (P, dx, dy) => P.map(([x, y]) => [x + dx, y + dy]);
const fvCirclePts = (x, y, r, n = 72) => ellipsePts(x, y, r, r, 0, n);
const fvRectPts = (x, y, w, h, r) => rrectPts(x, y, w, h, Math.min(r, w / 2, h / 2), 8);
const fvPillPts = (x, y, w, h) => rrectPts(x, y, w, h, Math.min(w, h) / 2, 10);

// a flat long shadow: the hull of the shape and the shape pushed `len` along angle `ang` (default 45 deg, down-right)
function fvLongShadow(P, len, col, ang = Math.PI / 4) {
  const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
  fvPath(fvHull(P.concat(fvShift(P, dx, dy)))); ctx.fillStyle = col; ctx.fill();
}
// the facet: a half-plane through the centroid (normal angle a, pushed `off` along it), filled with a darker flat tone
function fvFacet(P, o = {}) {
  const c = o.c ?? fvCentroid(P), a = o.a ?? Math.PI / 4, off = o.off ?? 0, Bg = 4000;
  const nx = Math.cos(a), ny = Math.sin(a), px = -ny, py = nx, cx = c[0] + nx * off, cy = c[1] + ny * off;
  ctx.save(); fvPath(P); ctx.clip();
  ctx.beginPath(); ctx.moveTo(cx + px * Bg, cy + py * Bg); ctx.lineTo(cx - px * Bg, cy - py * Bg);
  ctx.lineTo(cx - px * Bg + nx * Bg, cy - py * Bg + ny * Bg); ctx.lineTo(cx + px * Bg + nx * Bg, cy + py * Bg + ny * Bg); ctx.closePath();
  ctx.fillStyle = o.col ?? FV_SHADE; ctx.fill(); ctx.restore();
}
// the contoured shadow for round things: the part of P that a copy of P pushed (dx, dy) toward the light does not
// cover (so dx, dy negative = lit from the upper left, a crescent along the lower right), in a darker flat tone
function fvCrescent(P, dx, dy, col = FV_SHADE) {
  if (!P.length) return;
  const bb = bbox(P), m = 8;
  ctx.save(); fvPath(P); ctx.clip();
  ctx.beginPath(); ctx.rect(bb.x0 - m, bb.y0 - m, bb.x1 - bb.x0 + m * 2, bb.y1 - bb.y0 + m * 2);
  ctx.moveTo(P[0][0] + dx, P[0][1] + dy); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0] + dx, P[i][1] + dy); ctx.closePath();
  ctx.fillStyle = col; ctx.fill('evenodd'); ctx.restore();
}
// THE shape: P filled with c. o: { shadow: len, shadowC, shadowA, lip: px, facet: true | { a, off, col },
//   rim: [dx, dy] | { dx, dy, col } (fvCrescent), grad: 0..1, hi: true }
function fvShape(P, c, o = {}) {
  if (o.shadow) fvLongShadow(P, o.shadow, o.shadowC ?? (FV_DARKMODE ? FV.navyD : FV.creamDD), o.shadowA);
  if (o.lip) { const Q = fvShift(P, 0, o.lip); fvPath(Q); ctx.fillStyle = c; ctx.fill(); fvPath(Q); ctx.fillStyle = o.lipC ?? FV_LIP; ctx.fill(); }
  fvPath(P);
  if (o.grad && c[0] === '#') {   // a subtle linear gradient: a hair lighter at the top
    const bb = bbox(P), g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);
    g.addColorStop(0, fvTint(c, 0.12 * o.grad)); g.addColorStop(1, fvShade(c, 0.06 * o.grad)); ctx.fillStyle = g;
  } else ctx.fillStyle = c;
  ctx.fill();
  if (o.facet) fvFacet(P, o.facet === true ? {} : o.facet);
  if (o.rim) { const r = Array.isArray(o.rim) ? { dx: o.rim[0], dy: o.rim[1] } : o.rim; fvCrescent(P, r.dx, r.dy, r.col); }
  if (o.hi) {   // a flat highlight sliver, upper left
    const bb = bbox(P), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
    ctx.save(); fvPath(P); ctx.clip();
    fvPath(xform(fvPillPts(-w * 0.09, -h * 0.03, w * 0.18, h * 0.06), bb.x0 + w * 0.3, bb.y0 + h * 0.2, -0.75));
    ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.fill(); ctx.restore();
  }
}
const fvRect = (x, y, w, h, r, c, o) => fvShape(fvRectPts(x, y, w, h, r), c, o);
const fvCircle = (x, y, r, c, o) => fvShape(fvCirclePts(x, y, r), c, o);
const fvPill = (x, y, w, h, c, o) => fvShape(fvPillPts(x, y, w, h), c, o);
// a rounded line (strokes are for marks inside shapes: checks, smiles, orbits — never outlines)
function fvStroke(P, c, w, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  if (o.closed) ctx.closePath();
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha *= o.al ?? 1;
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.stroke(); ctx.restore();
}
// screen-constant width under the camera (for rings and orbits that must stay thin when the camera pushes in)
function fvZoom() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }

// ---------------------------------------------------------------------
//  springs: pop-ins with overshoot, staggered
// ---------------------------------------------------------------------
const fvPop = (t0, p = SPRING.playful) => (TT < t0 ? 0 : Math.max(0, springEase(TT - t0, p.k, p.d)));
// draw(…) scaled about (x, y) by a spring that starts at t0; nothing before t0. Returns the scale.
function fvPopIn(t0, x, y, draw, p = SPRING.playful) {
  const s = fvPop(t0, p); if (s <= 0.001) return 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); draw(s); ctx.restore(); return s;
}
// a value that rises from below on a spring (dy px), for staggered entrances: fvRise(t0, 80) -> offset
const fvRise = (t0, dy = 80, p = SPRING.smooth) => (1 - springMove(t0, 0, 1, p)) * dy;
// a kick: a damped wobble around 0 that starts at t0 (add it to a scale: 1 + fvKick(t0) swells, overshoots back, settles)
const fvKick = (t0, amp = 0.08, freq = 20, damp = 7) => (TT < t0 ? 0 : amp * Math.exp(-(TT - t0) * damp) * Math.sin((TT - t0) * freq));
const fvBlink = (key, period = 74) => mod(F + hash('fvb', key) % period, period) < 3;

// ---------------------------------------------------------------------
//  type
// ---------------------------------------------------------------------
function fvFont(size, weight = 800) { ctx.font = `${weight} ${size}px ${FV_SANS}`; }
// o: { align, base, weight, al, maxW: the widest the string may be (the size shrinks to fit) }. Returns the drawn width.
function fvText(str, x, y, size, color, o = {}) {
  ctx.save(); fvFont(size, o.weight ?? 800); ctx.fillStyle = color; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic';
  let w = ctx.measureText(str).width;
  if (o.maxW && w > o.maxW) { fvFont(size * o.maxW / w, o.weight ?? 800); w = ctx.measureText(str).width; }   // shrink to fit, never clip
  ctx.globalAlpha *= o.al ?? 1; ctx.fillText(str, x, y); ctx.restore(); return w;
}
const fvTextW = (str, size, weight = 800) => { ctx.save(); fvFont(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; };

// ---------------------------------------------------------------------
//  objects: the light bulb and the globe (with outlines for bridges), and the icon set
// ---------------------------------------------------------------------
// a light bulb's glass: a circle that narrows into a neck. (x, y) = the circle's centre, r its radius
function fvBulbPts(x, y, r) {
  const P = arcPts(x, y, r, 62 * DEG, -242 * DEG, 64);   // lower right, round the top, lower left
  const nb = y + r * 1.42, nw = r * 0.42;
  P.push([x - nw, nb - r * 0.12], [x - nw * 0.96, nb], [x + nw * 0.96, nb], [x + nw, nb - r * 0.12]);
  return P;
}
// o: { on: 0..1 lit, glass, shadow }
function fvBulb(x, y, r, o = {}) {
  const on = clamp(o.on ?? 1), offC = o.off ?? (FV_DARKMODE ? FV.navyL : '#e7e0d2'), glass = fvMix(offC, FV.yellow, on);
  const facetC = fvMix(fvShade(offC, 0.14), '#f39a1e', on);   // a warm darker facet, not a grey one
  const P = fvBulbPts(x, y, r), nb = y + r * 1.42, nw = r * 0.42;
  if (o.shadow) fvLongShadow(P.concat([[x - nw, nb + r * 0.62], [x + nw, nb + r * 0.62]]), o.shadow, o.shadowC ?? (FV_DARKMODE ? FV.navyD : FV.creamDD));
  // the screw base: bands of navy, the lower ones narrower, a rounded tip
  const bands = [[nw * 1.04, r * 0.16, FV.navyL], [nw * 0.98, r * 0.14, FV.navy], [nw * 0.92, r * 0.14, FV.navyL]];
  let by = nb - r * 0.02;
  for (const [hw, h, c] of bands) { fvPill(x - hw, by, hw * 2, h + r * 0.02, c); by += h; }
  fvShape(arcPts(x, by - r * 0.02, nw * 0.5, 0, Math.PI, 16), FV.navyD);
  fvShape(P, glass, { facet: { a: 0.25 * Math.PI, off: r * 0.18, col: facetC }, hi: true });
  // the filament: a little zig-zag, lit with the glass
  const fy = y + r * 0.5, fw = r * 0.26, fc = fvMix(FV.creamDD, FV.coral, on);
  fvStroke([[x - fw * 0.55, nb], [x - fw * 0.55, fy + r * 0.2], [x - fw, fy], [x - fw * 0.33, fy + r * 0.12], [x + fw * 0.33, fy], [x + fw, fy + r * 0.12], [x + fw * 0.55, fy + r * 0.2], [x + fw * 0.55, nb]], fc, Math.max(2, r * 0.05));
}
// rays: rounded dashes radiating from (x, y) over the upper half, popping in a stagger from t0
function fvRays(x, y, r0, len, t0, o = {}) {
  const n = o.n ?? 7, a0 = o.a0 ?? -165 * DEG, a1 = o.a1 ?? -15 * DEG, pulse = 1 + Math.sin(TT * TAU * 1.0) * 0.06;
  for (let i = 0; i < n; i++) {
    const s = fvPop(t0 + i * 0.045, SPRING.playful); if (s <= 0.01) continue;
    const a = lerp(a0, a1, n > 1 ? i / (n - 1) : 0.5), L = len * s * pulse * (i % 2 ? 0.72 : 1), w = o.w ?? 18;
    const ra = r0 + (1 - s) * 10;
    ctx.save(); ctx.translate(x + Math.cos(a) * ra, y + Math.sin(a) * ra); ctx.rotate(a);
    fvPill(0, -w / 2, Math.max(w, L), w, o.c ?? FV.yellow); ctx.restore();
  }
}
// a globe: ocean circle, flat continents that scroll as it turns (spin = phase in radii), a crescent night side
function fvGlobePts(x, y, r) { return fvCirclePts(x, y, r, 96); }
function fvGlobe(x, y, r, o = {}) {
  const P = fvGlobePts(x, y, r);
  if (o.shadow) fvLongShadow(P, o.shadow, o.shadowC ?? (FV_DARKMODE ? FV.navyD : FV.creamDD));
  fvShape(P, o.sea ?? FV.blue);
  ctx.save(); fvPath(P); ctx.clip();
  const spin = o.spin ?? 0, per = r * 3.2;
  const lands = [[-0.55, -0.45, 0.42, 0.3, 1], [0.15, -0.05, 0.36, 0.5, 2], [0.85, -0.55, 0.3, 0.2, 3], [1.15, 0.35, 0.34, 0.28, 4], [-0.25, 0.55, 0.26, 0.18, 5], [1.9, -0.1, 0.4, 0.34, 6]];
  for (const [lx, ly, rx, ry, k] of lands) {
    const R = RNG('fvland', k), pts = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, q = 0.72 + R.f() * 0.38; pts.push([Math.cos(a) * rx * r * q, Math.sin(a) * ry * r * q]); }
    for (const wrap of [0, -per, per]) {
      const cx = x + mod(lx * r - spin * r + r * 1.6, per) - r * 1.6 + wrap, cy = y + ly * r;
      if (cx < x - r * 1.6 || cx > x + r * 1.6) continue;
      trace(pts.map(([px, py]) => [cx + px, cy + py]), true); ctx.fillStyle = o.land ?? FV.teal; ctx.fill();
    }
  }
  ctx.restore();
  fvCrescent(P, -r * 0.24, -r * 0.17, 'rgba(16,19,47,0.26)');   // the night side follows the limb
  fvShape(P, 'rgba(0,0,0,0)', { hi: true });
}
// a gear: n teeth, rotation rot, hole in colour hole
function fvGearPts(x, y, r, n = 8, rot = 0) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU, da = TAU / n;
    for (const [f, rr] of [[-0.5, 0.78], [-0.3, 0.78], [-0.2, 1], [0.2, 1], [0.3, 0.78], [0.5, 0.78]]) P.push([x + Math.cos(a + f * da) * r * rr, y + Math.sin(a + f * da) * r * rr]);
  }
  return P;
}
// icons, centred on (x, y), about s across. kind: check, chart, gear, chat, phone, card, bulb, globe, star
// o: { c (main colour), frac (check write-on), vals [3] (chart bars 0..1), cols [3] (bar colours), rot (gear), dots (chat), lip }
function fvIcon(kind, x, y, s, o = {}) {
  if (kind === 'check') {
    fvCircle(x, y, s / 2, o.c ?? FV.teal, { lip: o.lip ?? s * 0.06, facet: { off: s * 0.12 } });
    const P = [[x - s * 0.2, y + s * 0.01], [x - s * 0.05, y + s * 0.15], [x + s * 0.22, y - s * 0.13]];
    const fr = clamp(o.frac ?? 1); if (fr > 0) fvStroke(subPath(P, fr), FV.white, s * 0.11);
  } else if (kind === 'chart') {
    const w = s, h = s * 0.82, x0 = x - w / 2, y0 = y - h / 2;
    fvRect(x0, y0, w, h, s * 0.12, o.c ?? FV.white, { lip: o.lip ?? s * 0.05 });
    const vals = o.vals ?? [0.45, 0.8, 0.6], cols = o.cols ?? [FV.blue, FV.yellow, FV.teal], bw = w * 0.16, gap = w * 0.08;
    const bx = x - (bw * 3 + gap * 2) / 2, base = y0 + h * 0.84, top = h * 0.62;
    fvPill(x0 + w * 0.12, base + h * 0.04, w * 0.76, h * 0.035, FV.creamD);
    vals.forEach((v, i) => { const bh = Math.max(bw, top * clamp(v, 0.02, 1)); fvRect(bx + i * (bw + gap), base - bh, bw, bh, bw * 0.3, cols[i % 3]); });
  } else if (kind === 'gear') {
    // a real hole (even-odd), so the gear sits on any ground; a warm facet so the yellow never goes olive
    const P = fvGearPts(x, y, s / 2, o.n ?? 8, o.rot ?? 0), c = o.c ?? FV.yellow, lip = o.lip ?? 0;
    const gear = (dy) => { fvPath(fvShift(P, 0, dy)); ctx.moveTo(x + s * 0.17, y + dy); ctx.arc(x, y + dy, s * 0.17, 0, TAU, true); ctx.closePath(); };
    if (lip) { gear(lip); ctx.fillStyle = c; ctx.fill('evenodd'); gear(lip); ctx.fillStyle = FV_LIP; ctx.fill('evenodd'); }
    gear(0); ctx.fillStyle = c; ctx.fill('evenodd');
    ctx.save(); gear(0); ctx.clip('evenodd');
    ctx.beginPath(); ctx.moveTo(x + s, y - s + s * 0.16); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s + s * 0.16, y + s); ctx.closePath();
    ctx.fillStyle = c === FV.yellow ? '#f39a1e' : FV_SHADE; ctx.fill(); ctx.restore();
  } else if (kind === 'chat') {
    const w = s, h = s * 0.72, x0 = x - w / 2, y0 = y - h / 2, c = o.c ?? FV.blue;
    const P = fvRectPts(x0, y0, w, h, h * 0.3);
    fvShape(P, c, { lip: o.lip ?? s * 0.05 });
    fvShape([[x0 + w * 0.2, y0 + h - 2], [x0 + w * 0.42, y0 + h - 2], [x0 + w * 0.14, y0 + h + h * 0.3]], c);
    for (let i = 0; i < 3; i++) {
      const b = o.dots ? Math.max(0, Math.sin(TT * TAU * 1.6 - i * 0.9)) * s * 0.06 : 0;
      fvCircle(x + (i - 1) * w * 0.22, y - b, s * 0.065, FV.white);
    }
  } else if (kind === 'phone') {
    const w = s * 0.58, h = s, x0 = x - w / 2, y0 = y - h / 2;
    fvRect(x0, y0, w, h, w * 0.18, o.c ?? FV.navy, { lip: o.lip ?? s * 0.04 });
    fvRect(x0 + w * 0.08, y0 + h * 0.07, w * 0.84, h * 0.82, w * 0.1, FV.white);
    fvPill(x - w * 0.12, y0 + h * 0.925, w * 0.24, h * 0.03, FV.navyL);
    fvCircle(x0 + w * 0.26, y0 + h * 0.2, w * 0.1, FV.coral);
    fvPill(x0 + w * 0.42, y0 + h * 0.175, w * 0.38, h * 0.045, FV.creamDD);
    for (let i = 0; i < 3; i++) fvPill(x0 + w * 0.18, y0 + h * (0.36 + i * 0.1), w * (i === 1 ? 0.44 : 0.64), h * 0.04, FV.creamD);
    fvPill(x0 + w * 0.18, y0 + h * 0.7, w * 0.64, h * 0.1, FV.blue);
  } else if (kind === 'card') {
    const w = s, h = s * 0.62, x0 = x - w / 2, y0 = y - h / 2;
    fvRect(x0, y0, w, h, s * 0.1, o.c ?? FV.white, { lip: o.lip ?? s * 0.04 });
    fvCircle(x0 + h * 0.42, y, h * 0.24, FV.coral);
    fvPill(x0 + h * 0.8, y - h * 0.16, w * 0.42, h * 0.11, FV.navyL);
    fvPill(x0 + h * 0.8, y + h * 0.06, w * 0.3, h * 0.1, FV.creamDD);
  } else if (kind === 'bulb') {
    fvBulb(x, y - s * 0.12, s * 0.3, { on: o.on ?? 1 });
  } else if (kind === 'globe') {
    fvGlobe(x, y, s / 2, { spin: o.spin ?? 0 });
  } else if (kind === 'star') {
    star4(x, y, s / 2, o.c ?? FV.yellow);
  }
}
// a floating shape for background life: circle, ring, plus, square, tri — drifting on a slow sine
function fvFloater(kind, x, y, s, c, o = {}) {
  const ph = o.ph ?? 0, dy = Math.sin(TT * TAU * (o.f ?? 0.35) + ph) * (o.amp ?? 12), rot = (o.spin ?? 0.4) * TT + ph;
  const X = x, Y = y + dy;
  if (kind === 'circle') fvCircle(X, Y, s / 2, c);
  else if (kind === 'ring') { ctx.save(); ctx.beginPath(); ctx.arc(X, Y, s * 0.38, 0, TAU); ctx.strokeStyle = c; ctx.lineWidth = s * 0.2; ctx.stroke(); ctx.restore(); }
  else if (kind === 'plus') { ctx.save(); ctx.translate(X, Y); ctx.rotate(rot * 0.5); fvPill(-s / 2, -s * 0.13, s, s * 0.26, c); fvPill(-s * 0.13, -s / 2, s * 0.26, s, c); ctx.restore(); }
  else if (kind === 'square') { ctx.save(); ctx.translate(X, Y); ctx.rotate(rot); fvRect(-s / 2, -s / 2, s, s, s * 0.25, c); ctx.restore(); }
  else if (kind === 'tri') fvShape(xform(ellipsePts(0, 0, s * 0.55, s * 0.55, -Math.PI / 2, 3), X, Y, rot), c);
  else if (kind === 'star') star4(X, Y, s / 2 * (0.75 + 0.25 * Math.sin(TT * TAU * 1.3 + ph)), c);
}

// ---------------------------------------------------------------------
//  the hero: a capsule mascot with two big dot eyes that blink, blush cheeks, a bobble antenna, nub arms (the right
//  one may wave), an idle breathe, a flat ground shadow. A hop has the whole chain: anticipation squash, stretch on
//  the way up and down, a springy landing squash, and follow-through (the arms and the antenna trail the body and
//  settle a beat later). (x, y) = between its feet on the ground; s = its body height (the antenna adds ~0.14 s).
//  o: { key, color, look: -1..1 | [x, y], hop: time | [times], wave, mood: 'smile' | 'wow',
//       pop: time it pops up from the floor, dark, shadowC, antenna: false to drop it }
// ---------------------------------------------------------------------
const FV_HOP = 0.42;   // seconds in the air
function fvMascot(x, y, s, o = {}) {
  if (o.pop != null) {   // springs up out of the floor, anchored at its feet (nothing before o.pop)
    const k = fvPop(o.pop, SPRING.playful); if (k <= 0.001) return null;
    ctx.save(); ctx.translate(x, y); ctx.scale(lerp(1.25, 1, clamp(k)) * k, k); ctx.translate(-x, -y);
    const r = fvMascot(x, y, s, { ...o, pop: null }); ctx.restore(); SPARK_AT = toScreen(x, y - s * 0.45); return r;
  }
  const key = o.key ?? 'hero', c = o.color ?? FV.coral, t = TT, ph = hash('fvm', key) % 100 / 100 * TAU;
  const hops = [].concat(o.hop ?? []);
  const air = (tt) => { let L = 0; for (const hp of hops) { const u = (tt - hp) / FV_HOP; if (u > 0 && u < 1) L += 4 * u * (1 - u); } return L; };   // height 0..1
  let sq = Math.sin(t * TAU * 1.0 + ph) * 0.025;   // idle: breathe (+ = squashed: wider and shorter)
  // drag: what trails the body. + = thrown up (falling, just landed), - = pulled down (rising); it lags the body by ~2 frames
  let drag = clamp(-(air(t - 0.03) - air(t - 0.09)) / 0.06 * FV_HOP / 4, -1, 1), sway = 0;
  for (const hp of hops) {
    const u = (t - hp) / FV_HOP, dl = t - hp - FV_HOP;
    if (t > hp - 0.16 && t <= hp) sq += 0.11 * smooth(0, 1, (t - hp + 0.16) / 0.16);                       // anticipation: crouch
    if (u > 0 && u < 1) sq -= 0.10 * Math.abs(2 * u - 1) * Math.min(1, u * 6, (1 - u) * 6);              // stretch with speed, round at the top
    if (dl >= 0) sq += Math.exp(-dl * 9) * Math.cos(dl * 30) * 0.13;                                     // landing squash, springy
    if (dl >= 0.05) { const e = Math.exp(-(dl - 0.05) * 6.5); drag += e * Math.cos((dl - 0.05) * 21) * 0.75; sway += e * Math.sin((dl - 0.05) * 21) * 0.5; }   // follow-through
  }
  const lift = air(t) * s * 0.32;
  const w = s * 0.74 * (1 + sq), h = s * 0.86 * (1 - sq), fh = s * 0.08, by = y - fh - lift;
  const dark = fvShade(c, 0.35), mid = fvShade(c, 0.13);
  // the ground shadow: flat, shrinks as it rises
  const k = clamp(1 - lift / (s * 0.9), 0.35, 1);
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + s * 0.01, w * 0.58 * k, s * 0.06 * k, 0, 0, TAU); ctx.fillStyle = o.shadowC ?? (FV_DARKMODE || o.dark ? FV.navyD : FV.creamDD); ctx.fill(); ctx.restore();
  // feet (they dangle a little in the air)
  for (const sx of [-1, 1]) fvPill(x + sx * w * 0.2 - w * 0.13, by - fh * 0.3 + Math.min(1, air(t) * 3) * fh * 0.25, w * 0.26, fh * 1.25, dark);
  // the antenna: a short stem and a bobble; it leans with the idle, stretches and whips with the drag
  if (o.antenna !== false) {
    const lean = Math.sin(t * TAU * 0.5 + ph) * 0.12 + sway, L = s * 0.105 * (1 + 0.3 * clamp(drag, -1, 1));
    const ax = x - w * 0.02, ay = by - h + s * 0.02, tx = ax + Math.sin(lean) * L, ty = ay - Math.cos(lean) * L;
    fvStroke([[ax, ay], [ax + Math.sin(lean * 0.4) * L * 0.5, ay - L * 0.5], [tx, ty]], dark, Math.max(2, s * 0.034));
    fvCircle(tx, ty, s * 0.042, c);
  }
  // arms: nubs from the shoulders, hanging out and down; they fly up when it falls and flop after the landing
  const idle = Math.sin(t * TAU * 0.5 + ph) * 0.07, rest = 0.9 + idle - clamp(drag, -0.35, 1.2) * 1.15;
  const armR = o.wave ? -0.95 + Math.sin(t * TAU * 2.2) * 0.4 : rest;   // the wave: up and out, where it can be seen
  for (const [sx, a] of [[-1, Math.PI - rest], [1, armR]]) {
    ctx.save(); ctx.translate(x + sx * w * 0.42, by - h * 0.43); ctx.rotate(a);
    fvPill(-s * 0.04, -s * 0.05, s * 0.26, s * 0.1, mid); ctx.restore();
  }
  // body: a capsule, a contoured shadow along its right side and base, a highlight sliver
  const P = rrectPts(x - w / 2, by - h, w, h, w * 0.48, 10);
  fvShape(P, c, { rim: [-w * 0.13, -h * 0.045], hi: true });
  // belly patch
  fvPill(x - w * 0.21, by - h * 0.31, w * 0.42, h * 0.2, fvTint(c, 0.26));
  // face: big eyes set low and wide, cheeks just outside and below them, a small mouth between
  const lk = [].concat(o.look ?? 0), lx = (lk[0] ?? 0) * w * 0.07, ly = (lk[1] ?? 0) * h * 0.035;
  const wow = o.mood === 'wow', ey = by - h * 0.61 + ly, ex = w * 0.175, er = w * 0.088 * (wow ? 1.12 : 1);
  const blink = fvBlink(key) || hops.some((hp) => t > hp + FV_HOP - 0.02 && t < hp + FV_HOP + 0.08);
  for (const sx of [-1, 1]) {
    fvCircle(x + sx * ex * 1.95 + lx * 0.6, ey + h * 0.105, w * 0.062, fvTint(c, 0.42));   // cheeks
    ctx.save(); ctx.beginPath(); ctx.ellipse(x + sx * ex + lx, ey, er, blink ? er * 0.16 : er * 1.12, 0, 0, TAU); ctx.fillStyle = FV.navy; ctx.fill();
    if (!blink) { ctx.beginPath(); ctx.arc(x + sx * ex + lx + er * 0.34, ey - er * 0.42, er * 0.34, 0, TAU); ctx.fillStyle = FV.white; ctx.fill(); }
    ctx.restore();
  }
  if (wow) { ctx.save(); ctx.beginPath(); ctx.ellipse(x + lx, ey + h * 0.125, w * 0.05, w * 0.062, 0, 0, TAU); ctx.fillStyle = FV.navy; ctx.fill(); ctx.restore(); }
  else fvStroke(arcPts(x + lx, ey + h * 0.075, w * 0.085, 18 * DEG, 162 * DEG, 12), FV.navy, Math.max(2, w * 0.04));
  SPARK_AT = toScreen(x, by - h * 0.5);
  return { top: by - h, cx: x, cy: by - h * 0.5 };
}
function fvMascotPts(x, y, r) { const s = r * 2, w = s * 0.74, h = s * 0.86; return rrectPts(x - w / 2, y - h / 2, w, h, w * 0.48, 10); }

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size), springing in; they fade out as the era's window shrinks
// ---------------------------------------------------------------------
function fvLeaving() {   // 1 normally; falls to 0 over the first 0.3s of a bridge's shrink
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
// the earliest an era's overlays may start: at its start, or (after a bridge) once the growing window has passed them,
// so a tag never pops on the bare backdrop outside the window
function fvArrive() {
  if (typeof BRIDGES === 'undefined') return E0;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 0.05) return r.tc + (r.d ?? 0.6) * 0.75;
  return E0;
}
// a tag: a small pill (number in a disc + label), top left, popping in from its left end.
// The disc is ink on light and yellow on dark: coral stays the hero's.
function fvTagNow(num, label, dark) {
  const s = fvPop(Math.max(E0 + 0.15, fvArrive()), SPRING.playful), al = fvLeaving();
  if (s <= 0.001 || al <= 0.001) return;
  const x = 70, y = 262, h = 76, size = 36, lw = fvTextW(label, size);
  const w = h + 18 + lw + 30;
  ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y + h / 2); ctx.scale(s, s); ctx.translate(-x, -(y + h / 2));
  fvPill(x, y, w, h, dark ? FV.navyL : FV.white, { lip: 5, lipC: dark ? 'rgba(0,0,0,0.35)' : FV_LIP });
  fvCircle(x + h / 2, y + h / 2, h * 0.36, dark ? FV.yellow : FV.navy);
  fvText(num, x + h / 2, y + h / 2 + 1, 28, dark ? FV.navy : FV.white, { align: 'center', base: 'middle' });
  fvText(label, x + h + 14, y + h / 2 + 1, size, dark ? FV.white : FV.navy, { base: 'middle' });
  ctx.restore();
}
// a caption: bold, centred at CX, words rising in on a spring one after another. '\n' breaks lines;
// *a phrase* gets one highlight pill (yellow on either ground; its text is ink, or white on a dark `hi`).
// o: { y: last baseline, size, at, dark, hi, x }
function fvCaptionNow(str, o = {}) {
  const al = fvLeaving(); if (al <= 0.001) return;
  const dark = o.dark ?? FV_DARKMODE, size = o.size ?? 78, lh = size * 1.18, t0 = Math.max(E0 + (o.at ?? 0.7), fvArrive());
  const lines = str.split('\n'), yLast = o.y ?? 1452, col = dark ? FV.white : FV.navy;
  const hiC = o.hi ?? FV.yellow, hiT = fvLum(hiC) > 0.6 ? FV.navy : FV.white;
  let k = 0;
  ctx.save(); ctx.globalAlpha = al; fvFont(size);
  lines.forEach((line, li) => {
    const words = line.split(/(\*[^*]+\*)/).filter((g) => g.trim()).flatMap((g) => (g[0] === '*' ? [{ w: g.slice(1, -1), hi: true }] : g.trim().split(/\s+/).map((w) => ({ w, hi: false }))));
    const sp = ctx.measureText(' ').width, pad = size * 0.22;
    const ws = words.map((d) => ctx.measureText(d.w).width + (d.hi ? pad * 2 : 0));
    let xx = (o.x ?? CX) - (ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1)) / 2;
    const yy = yLast - (lines.length - 1 - li) * lh;
    words.forEach((d, i) => {
      const s = springEase(TT - (t0 + k * 0.07), SPRING.playful.k, SPRING.playful.d); k++;
      if (TT >= t0 + (k - 1) * 0.07 && s > 0.001) {
        ctx.save(); ctx.globalAlpha = al * clamp(s * 1.6);
        const dy = (1 - s) * size * 0.45;   // a short rise: a word never dips under the phone UI on its way in
        if (d.hi) {
          const hs = springEase(TT - (t0 + k * 0.07 + 0.12), SPRING.snappy.k, SPRING.snappy.d);
          if (hs > 0.02) fvPill(xx, yy - size * 0.86 + dy, ws[i] * hs, size * 1.12, hiC);   // wipes on from its left end, ends stay round
          fvText(d.w, xx + pad, yy + dy, size, hiT);
        } else fvText(d.w, xx, yy + dy, size, col);
        ctx.restore();
      }
      xx += ws[i] + sp;
    });
  });
  ctx.restore();
}
const fvTag = (num, label, o = {}) => { const dark = o.dark ?? FV_DARKMODE, f = () => fvTagNow(num, label, dark); if (DEFER) DEFER.push(f); else f(); };
const fvCaption = (str, o = {}) => { const f = () => fvCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// the ground for a scene: a flat fill (under the camera, it fills the whole frame)
function fvGround(c) { fillAll(c); }

// =====================================================================
//  STYLE — the renderer's hooks (see the skill's styles/README.md)
// =====================================================================
const STYLE = {
  name: 'flat-vector',
  paper: FV.paper,
  // while the new era's window grows, the renderer fades the backdrop toward the new ground in RGB (cream -> navy
  // goes grey); flat colour never blends, so the sheet stays paper until the window has covered it
  backdrop(c, o) { fillAll(o && o.phase === 'grow' ? STYLE.paper : c); },
  // the era seen through outline P: a clean mask, a thin accent ring hugging it and a second, thinner ring trailing outside
  window(P, key, src, o = {}) {
    const c = fvCentroid(P), u = o.u ?? 0;
    const rAvg = P.reduce((a, p) => a + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / P.length || 1;
    const ring = (k, w, col, al) => { const Q = P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]); fvPath(Q); ctx.save(); ctx.globalAlpha = al; ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); };
    ring(1 + 34 / rAvg, 4, FV.yellow, o.phase === 'shrink' ? clamp(u * 2) : clamp((1 - u) * 2));
    ctx.save(); fvPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ring(1 + 5 / rAvg, 10, FV.coral, 1);
  },
  // the morphing shape: flat fill, a darker facet, a highlight sliver, a soft long shadow on the paper
  // (the straight RGB mix of two palette colours goes dull halfway, so its saturation is lifted in the middle)
  blob(P, c, key, u = 0) {
    const v = fvRGB(c), m = (v[0] + v[1] + v[2]) / 3, k = 1 + 0.35 * Math.sin(clamp(u) * Math.PI);
    fvLongShadow(P, 60, FV_DARKMODE ? FV.navyD : FV.creamDD);
    fvShape(P, fvHex(v.map((x) => m + (x - m) * k)), { facet: { off: 30 }, hi: true });
  },
  hero(x, y, r, o = {}) { if (r > 1) fvMascot(x, y + r, r * 2, { key: o.key, mood: o.mood }); },
  heroColor: FV.coral,
  heroPts(x, y, r) { return fvMascotPts(x, y, r); },
  post() {},
  ones: true,
};
