// =====================================================================
//  styles/diorama/kit.js — DIORAMA: a layered paper-cut light box (a shadow-box diorama).
//  The picture is 5-8 sheets of plain paper stacked in depth, each cut into a silhouette and lit from behind:
//  a pale glowing back sheet with the light (a sun or moon disc cut through it), then sheets that step in value
//  from light (far) to nearly dark (near) inside ONE hue family per era. No outlines, no patterns, no ink:
//  only cut edges. Every sheet casts a soft shadow down-right onto the sheet behind and has a thin lit lip on its
//  top-left cut; a dark box mat frames the whole picture; depth is shown by parallax (far sheets move least).
//  Built on kit/core.js. Helpers are prefixed dio…; the palette is DIO. Needs from the piece head: CX.
//
//  Cheap by construction: a static sheet (dioSheet) is rendered ONCE — silhouette, holes, lit lip, grain, blurred
//  cast shadow — into its own cropped offscreen canvas and afterwards costs one drawImage a frame, wherever it
//  slides. Only small moving pieces (dioPiece: the deer, birds, leaves, the lantern) use a live shadowBlur.
// =====================================================================
const DIO = {
  // tones[0..8]: 0-2 the sky sheet (near the light -> far corners), 3-7 the scenery sheets far -> near, 8 the nearest pieces and the ink
  dusk: { name: 'dusk', light: '#fff6dc', tones: ['#fde6b0', '#f8cf85', '#f2b866', '#de8a42', '#cb6e36', '#aa522d', '#823a26', '#58251d', '#351513'], glow: '#ffdc96', text: '#fff3d2', strip: '#fff1cf', hi: '#ffd27a' },
  night: { name: 'night', light: '#f3f7ff', tones: ['#bcd5f5', '#93b4ea', '#7396dc', '#4f70c0', '#3d57a4', '#2e4287', '#212f68', '#161f49', '#0b112b'], glow: '#c4d8ff', text: '#eef4ff', strip: '#e6efff', hi: '#ffb650' },
  warm: '#ffb650', warmHi: '#fff0c2', warmD: '#d9741c',     // the one warm accent of the night: lantern, lit windows, fireflies
  mat: '#170f16', mat2: '#2b1c27',                          // the box: outer mat and the thin inner mat
  paper: '#4a2735',                                         // the blank sheet a morph happens on (between dusk and night)
  shade: 'rgba(14,6,14,0.6)',                               // cast shadow where no era ramp applies (morph, mat)
};
const DIO_SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", "Times New Roman", "DejaVu Serif", "Noto Serif", serif';
const DIO_SANS = '"Gill Sans", "Gill Sans MT", "Trebuchet MS", Optima, Candara, "Segoe UI", "Noto Sans", "DejaVu Sans", sans-serif';
const DIO_M = 140;            // how far a sheet reaches past the frame (room for parallax and slides)
const DIO_SHEETS = {};        // cached sheets, by key and colour
let DIO_R = DIO.dusk;         // the ramp of the era being drawn (set by dioEra at the top of every scene)
let DIO_L = [540, 700];       // where that era's light is (set by dioSky)

const dioRGB = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
const dioA = (c, a) => { const [r, g, b] = dioRGB(c); return `rgba(${r},${g},${b},${clamp(a)})`; };
const dioMix = (a, b, u) => { const x = dioRGB(a), y = dioRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const dioTone = (i) => DIO_R.tones[i];
const dioShade = (a = 0.5) => dioA(DIO_R.tones[8], a);
const dioPolys = (G) => (typeof G[0][0] === 'number' ? [G] : G);
function dioMk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function dioAdd(P, g = ctx) { P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
function dioTrace(Ps, g = ctx) { g.beginPath(); for (const P of Ps) dioAdd(P, g); }
function dioArc(cx, cy, rx, ry, a0, a1, n = 24) { const P = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return P; }
const dioCirclePts = (x, y, r, n = 72) => dioArc(x, y, r, r, 0, TAU * (1 - 1 / n), n - 1);
const dioRectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const dioMove = (Ps, dx, dy) => dioPolys(Ps).map((P) => P.map(([x, y]) => [x + dx, y + dy]));

// ---- era, depth and parallax. Depth 0 = the back sheet (never moves), 1 = the nearest sheet (moves most).
function dioEra(name) { DIO_R = DIO[name] || DIO.dusk; return DIO_R; }
const dioEye = () => [Math.sin(TT * 0.5 + 0.2) * 34, -Math.sin(TT * 0.5 + 0.2) * 9];      // the slow drift of the viewer's eye: a pure function of time
const dioOff = (depth) => { const e = dioEye(); return [e[0] * depth, e[1] * depth]; };
function dioLayer(depth, fn, o = {}) { const [ox, oy] = dioOff(depth); ctx.save(); ctx.translate(ox + (o.dx ?? 0), oy + (o.dy ?? 0)); fn(); ctx.restore(); }
const dioRise = (t0, d = 760, dur = 1.0) => (1 - EZ.o3(ev(t0, dur))) * d;                 // a sheet coming up from below (or in from a side): soft, no bounce
function dioLeaving() {   // captions fade out as a bridge starts (they would sit at screen size over the closing window)
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.25)); }
  return 1;
}
function dioArrive() {    // when this era is fully open (the end of the bridge that leads into it)
  if (typeof BRIDGES !== 'undefined') for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-6) return r.tc + (r.d ?? 0.6);
  return E0;
}

// ---------------------------------------------------------------------
//  paper: the grain tile, a cached sheet, a live piece, a lit hole, a glow
// ---------------------------------------------------------------------
let DIO_GRAIN = null;
function dioGrainTile() {   // very faint: light and dark specks plus a few fibres, fixed seed
  if (DIO_GRAIN) return DIO_GRAIN;
  const n = 256, c = dioMk(n, n), g = c.getContext('2d'), im = g.createImageData(n, n), R = RNG('dio-grain');
  for (let i = 0; i < n * n; i++) { const v = R.f(); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v > 0.5 ? 255 : 0; im.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) ** 1.5 * 2 * 44); }
  g.putImageData(im, 0, 0);
  g.lineWidth = 1; for (let i = 0; i < 46; i++) { const x = R.r(8, n - 8), y = R.r(8, n - 8), a = R.r(0, TAU), l = R.r(5, 16); g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return (DIO_GRAIN = c);
}
function dioGrainOver(g, w, h) { g.fillStyle = g.createPattern(dioGrainTile(), 'repeat'); g.fillRect(0, 0, w, h); }

// build one sheet: geo = polygons (or { P: polygons, holes: polygons }) in world coords, col its paper colour
function dioBuildSheet(geo, col, o) {
  const P = dioPolys(geo.P ?? geo), holes = geo.holes && geo.holes.length ? dioPolys(geo.holes) : [], k = o.gap ?? 1, pad = 56 + 40 * k;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const Q of P) for (const [x, y] of Q) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  x0 = Math.max(-DIO_M, Math.floor(x0)) - pad; y0 = Math.max(-DIO_M, Math.floor(y0)) - pad; x1 = Math.min(W + DIO_M, Math.ceil(x1)) + pad;
  y1 = o.floor != null ? Math.round(o.floor) : Math.min(H + DIO_M, Math.ceil(y1)) + pad;
  const w = x1 - x0, h = y1 - y0;
  const sil = dioMk(w, h), s = sil.getContext('2d');                               // the silhouette, holes punched
  s.translate(-x0, -y0); dioTrace(P, s); s.fillStyle = col; s.fill();
  if (holes.length) { s.globalCompositeOperation = 'destination-out'; dioTrace(holes, s); s.fill(); }
  const body = dioMk(w, h), t = body.getContext('2d');                             // the paper: lit lip, value falloff, haze, grain
  t.drawImage(sil, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = dioMix(col, '#ffffff', o.lip ?? 0.4); t.fillRect(0, 0, w, h);
  t.globalCompositeOperation = 'source-atop'; t.drawImage(sil, 1.6, 2.6);          // the body, shifted: the lip stays on the top-left cuts
  const fall = t.createLinearGradient(0, pad, 0, o.floor != null ? h : h - pad); fall.addColorStop(0, 'rgba(255,255,255,0.06)'); fall.addColorStop(1, 'rgba(0,0,0,0.12)'); t.fillStyle = fall; t.fillRect(0, 0, w, h);
  if (o.haze > 0) { const hx = o.light[0] - x0, hy = o.light[1] - y0, hz = t.createRadialGradient(hx, hy, 0, hx, hy, 760); hz.addColorStop(0, dioA(o.glow, o.haze)); hz.addColorStop(0.45, dioA(o.glow, o.haze * 0.5)); hz.addColorStop(1, dioA(o.glow, 0)); t.fillStyle = hz; t.fillRect(0, 0, w, h); }
  dioGrainOver(t, w, h);
  const out = dioMk(w, h), c = out.getContext('2d');                               // the sheet over its own cast shadow
  c.shadowColor = o.shadow; c.shadowBlur = 48 * k; c.shadowOffsetX = 12 * k; c.shadowOffsetY = 12 * k; c.drawImage(body, 0, 0);
  return { cv: out, x0, y0, w, h, flat: dioMix(dioMix(col, '#000000', 0.12), '#808080', 0.049) };   // flat = the paper's average colour at the floor (falloff + grain)
}
// a static sheet. key names its geometry (never reuse a key for another shape); geo may be a function, called once.
// tone = a ramp index or a colour; o: { depth, dx, dy, gap (shadow distance, 1), lip, a, haze (light caught from the
// lamp, baked in; default falls with depth), floor (a world y below which the sheet is plain paper right across:
// only the part above it is cached, the rest is one flat fill — for hills whose lower part hides behind nearer sheets) }
function dioSheet(key, geo, tone, o = {}) {
  const col = typeof tone === 'number' ? DIO_R.tones[tone] : tone, id = key + '|' + col + '|' + DIO_L, depth = o.depth ?? 0;
  const s = DIO_SHEETS[id] || (DIO_SHEETS[id] = dioBuildSheet(typeof geo === 'function' ? geo() : geo, col, { shadow: dioShade(0.6), light: DIO_L, glow: DIO_R.glow, ...o, haze: o.haze ?? 0.34 * (1 - depth) ** 2 }));
  const [ox, oy] = dioOff(depth), x = s.x0 + ox + (o.dx ?? 0), y = s.y0 + oy + (o.dy ?? 0);
  if (y > H + DIO_M || x > W + DIO_M || x + s.w < -DIO_M || (o.floor == null && y + s.h < -DIO_M)) return;
  ctx.save(); if (o.a != null) ctx.globalAlpha *= o.a;
  ctx.drawImage(s.cv, x, y);
  if (o.floor != null && y + s.h < H + DIO_M) { ctx.fillStyle = s.flat; ctx.fillRect(-DIO_M, y + s.h - 0.5, W + 2 * DIO_M, H + DIO_M - (y + s.h) + 0.5); if (o.dy > 1 || o.bare) { ctx.fillStyle = ctx.createPattern(dioGrainTile(), 'repeat'); ctx.fillRect(-DIO_M, y + s.h, W + 2 * DIO_M, H + DIO_M - (y + s.h)); } }
  ctx.restore();
}
// a moving piece of paper: fn() traces and fills / strokes it WITHOUT setting colours; drawn once as the lit lip
// with the cast shadow, then again 1.4 / 2.2 px down-right as the body. o: { gap, shadow, lip }
function dioPiece(fn, col, o = {}) {
  const k = o.gap ?? 1;
  ctx.save(); ctx.lineJoin = ctx.lineCap = 'round';
  ctx.fillStyle = ctx.strokeStyle = dioMix(col, '#ffffff', o.lip ?? 0.4);
  ctx.shadowColor = o.shadow ?? dioShade(); ctx.shadowBlur = 20 * k; ctx.shadowOffsetX = 8 * k; ctx.shadowOffsetY = 11 * k; fn();
  ctx.shadowColor = 'transparent'; ctx.translate(1.4, 2.2); ctx.fillStyle = ctx.strokeStyle = col; fn();
  ctx.restore();
}
const dioCut = (Ps, col, o) => dioPiece(() => { dioTrace(dioPolys(Ps)); ctx.fill(); }, col, o);
const DIO_GLOWS = {};
function dioGlow(x, y, r, a, c) {   // light leaking: a soft radial bloom (a small cached sprite per colour, enlarged)
  if (a <= 0.004 || r <= 1) return;
  let sp = DIO_GLOWS[c];
  if (!sp) { sp = DIO_GLOWS[c] = dioMk(128, 128); const g = sp.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, dioA(c, 1)); gr.addColorStop(0.35, dioA(c, 0.46)); gr.addColorStop(0.7, dioA(c, 0.12)); gr.addColorStop(1, dioA(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.drawImage(sp, x - r, y - r, r * 2, r * 2); ctx.restore();
}
// the lit lip on the far (bottom-right) wall of a cut hole
function dioLip(P, col = 'rgba(255,255,255,0.5)', w = 3) { ctx.save(); dioTrace([P]); ctx.clip(); ctx.translate(-w * 0.6, -w * 0.9); dioTrace([P]); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
// a hole cut through the sheet in front, showing light of colour c: hot centre, the cut edge's shadow falling inside
function dioHole(P, c, o = {}) {
  const b = bbox(P), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, r = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2, pd = 90;
  ctx.save(); dioTrace([P]); ctx.clip();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.2); g.addColorStop(0, dioMix(c, '#ffffff', o.hot ?? 0.75)); g.addColorStop(0.55, dioMix(c, '#ffffff', (o.hot ?? 0.75) * 0.4)); g.addColorStop(1, dioMix(c, '#ffffff', 0));
  ctx.fillStyle = g; ctx.fillRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4);
  ctx.shadowColor = o.shadow ?? dioShade(0.55); ctx.shadowBlur = o.blur ?? 24; ctx.shadowOffsetX = 9; ctx.shadowOffsetY = 13;
  ctx.beginPath(); ctx.rect(b.x0 - pd, b.y0 - pd, b.x1 - b.x0 + pd * 2, b.y1 - b.y0 + pd * 2); dioAdd(P); ctx.fillStyle = '#000'; ctx.fill('evenodd');
  ctx.restore();
  dioLip(P, o.lipC);
}
// the light itself: a disc (or any outline P) cut through the sky sheet, with its bloom. p = 0..1 pulse
function dioLamp(P, c, glow, p = 0.5, o = {}) {
  const b = bbox(P), x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2, r = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2;
  dioGlow(x, y, r * (3.3 + 0.3 * p), 0.5 + 0.14 * p, glow);
  dioHole(P, c, { hot: 0.85, ...o });
  dioGlow(x, y, r * 1.55, 0.2 + 0.1 * p, '#ffffff');
}

// ---------------------------------------------------------------------
//  the back of the box: the sky sheet (cached), the light disc, haze between sheets, stars as punched holes
// ---------------------------------------------------------------------
function dioSky(x, y, o = {}) {   // light at (x, y): brightest there, a tone darker toward the far corners
  DIO_L = [x, y];
  const R = DIO_R, id = 'sky|' + R.name + '|' + x + '|' + y; let s = DIO_SHEETS[id];
  if (!s) {
    const w = W + 2 * DIO_M, h = H + 2 * DIO_M, cv = dioMk(w, h), g = cv.getContext('2d');
    const gr = g.createRadialGradient(x + DIO_M, y + DIO_M, 0, x + DIO_M, y + DIO_M, o.rad ?? 1500); gr.addColorStop(0, R.tones[0]); gr.addColorStop(0.5, R.tones[1]); gr.addColorStop(1, dioMix(R.tones[1], R.tones[2], 0.75));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const vg = g.createRadialGradient(w / 2, h * 0.46, h * 0.3, w / 2, h * 0.46, h * 0.62); vg.addColorStop(0, dioA(R.tones[8], 0)); vg.addColorStop(1, dioA(R.tones[8], 0.22)); g.fillStyle = vg; g.fillRect(0, 0, w, h);   // the box's dark corners
    dioGrainOver(g, w, h);
    s = DIO_SHEETS[id] = { cv };
  }
  ctx.drawImage(s.cv, -DIO_M, -DIO_M);
}
const dioPulse = () => 0.5 + 0.5 * Math.sin(TT * 2.1);
function dioDisc(x, y, r, o = {}) { dioLamp(dioCirclePts(x, y, r), o.c ?? DIO_R.light, DIO_R.glow, o.pulse ?? dioPulse()); }
function dioStarPts(x, y, r) { const P = []; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 - Math.PI / 2, k = i % 2 ? 0.34 : 1; P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); } return P; }
// stars: holes punched in the sky sheet (fixed places), each twinkling at its own rate. o: { y0, y1, avoid: [[x, y, r]], t0, stagger }
function dioStars(key, n, o = {}) {
  const R = RNG('dio-stars', key), c = o.c ?? DIO_R.light;
  for (let i = 0; i < n; i++) {
    const x = R.r(70, W - 70), y = R.r(o.y0 ?? 130, o.y1 ?? 1000), r = R.r(3, 6.2), f = R.r(1.6, 3.6), ph = R.r(0, TAU), big = i % 5 === 0;
    if ((o.avoid || []).some(([ax, ay, ar]) => Math.hypot(x - ax, y - ay) < ar)) continue;
    const on = o.t0 != null ? EZ.o2(ev(o.t0 + i * (o.stagger ?? 0.03), 0.25)) : 1; if (on <= 0) continue;
    const tw = (0.62 + 0.38 * Math.sin(TT * f + ph)) * on;
    ctx.fillStyle = dioA(c, 0.25 + 0.75 * tw);
    if (big) { dioTrace([dioStarPts(x, y, r * 2.5)]); ctx.fill(); dioGlow(x, y, r * 7, 0.3 * tw, c); } else { ctx.beginPath(); ctx.arc(x, y, r * (0.8 + 0.2 * tw), 0, TAU); ctx.fill(); }
  }
}

// ---------------------------------------------------------------------
//  silhouettes (all return polygons in world coords, ready for dioSheet / dioCut)
// ---------------------------------------------------------------------
// a ridge line: y at any x. o: { amp, freq, tilt, bumps: [[x, height, width]] }. Keep it in a const: scenes ask it where things stand.
function dioRidge(key, y, o = {}) {
  const R = RNG('dio-ridge', key), amp = o.amp ?? 44, ks = [];
  for (let i = 0; i < 4; i++) ks.push([R.r(0.7, 1.3) * (o.freq ?? 1) * (i + 1) * TAU / 1500, R.r(0, TAU), 1 / (i + 1.3)]);
  return (x) => y + (o.tilt ?? 0) * (x - W / 2) - ks.reduce((s, [f, p, a]) => s + Math.sin(x * f + p) * a, 0) * amp - (o.bumps || []).reduce((s, [bx, bh, bw]) => s + bh * Math.exp(-(((x - bx) / bw) ** 2)), 0);
}
// the whole ground under a ridge line, down past the frame
function dioHillPts(ridge, step = 14) { const P = []; for (let x = -DIO_M; x <= W + DIO_M; x += step) P.push([x, ridge(x)]); P.push([W + DIO_M, H + DIO_M + 80], [-DIO_M, H + DIO_M + 80]); return P; }
function dioVolcanoPts(x, y, w, h) {   // peak at x, base line y (hide it behind a nearer sheet), half-width w, height h: concave flanks, a notched crater
  const P = [], cw = w * 0.085, n = 22;
  for (let i = 0; i <= n; i++) { const u = i / n; P.push([x - w + (w - cw) * u, y - h * u ** 1.75]); }
  P.push([x - cw * 0.35, y - h + h * 0.035], [x + cw * 0.3, y - h + h * 0.018]);
  for (let i = n; i >= 0; i--) { const u = i / n; P.push([x + w - (w - cw) * u, y - h * (u ** 1.75) * 0.985]); }
  P.push([x + w, y + 60], [x - w, y + 60]); return P;
}
function dioCloudPts(x, y, w, key) {   // a flat-bottomed cloud: a bar with round lumps on top (y = its base line)
  const R = RNG('dio-cloud', key), P = [rrectPts(x - w / 2, y - w * 0.12, w, w * 0.12, w * 0.058, 6)], n = 4;
  for (let i = 0; i < n; i++) { const r = w * (0.11 + 0.1 * Math.sin(Math.PI * (i + 0.6) / n)) * R.r(0.88, 1.12); P.push(dioArc(x - w / 2 + w * (0.2 + 0.6 * i / (n - 1)), y - w * 0.07, r * 1.12, r, Math.PI, TAU, 20)); }
  return P;
}
// a leaf / frond / blade: from (x, y) along angle ang, len long, wid at its widest, drooping (gravity) by droop
function dioFrondPts(x, y, len, ang, droop, wid, n = 9) {
  const L = [], Rt = [], ca = Math.cos(ang), sa = Math.sin(ang);
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = x + ca * len * t, py = y + sa * len * t + droop * len * t * t, tx = ca, ty = sa + 2 * droop * t, tl = Math.hypot(tx, ty) || 1, hw = wid * 0.5 * Math.sin(Math.PI * t ** 0.75) ** 0.8;
    L.push([px - ty / tl * hw, py + tx / tl * hw]); Rt.unshift([px + ty / tl * hw, py - tx / tl * hw]);
  }
  return L.concat(Rt);
}
function dioBlobPts(x, y, r, key, rough = 0.1, n = 44) { const R = RNG('dio-blob', key), p = [R.r(0, TAU), R.r(0, TAU), R.r(0, TAU)], P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + rough * (Math.sin(3 * a + p[0]) * 0.5 + Math.sin(5 * a + p[1]) * 0.32 + Math.sin(8 * a + p[2]) * 0.18); P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.92]); } return P; }
function dioTree(x, y, h, key) {   // a round-crowned tree standing on ground line y, h tall
  const R = RNG('dio-tree', key), r = h * 0.3, P = [[[x - h * 0.035, y + 50], [x - h * 0.022, y - h * 0.6], [x + h * 0.022, y - h * 0.6], [x + h * 0.035, y + 50]]];
  P.push(dioBlobPts(x, y - h * 0.7, r, key + 'a'), dioBlobPts(x - r * 0.62, y - h * 0.58, r * 0.66, key + 'b'), dioBlobPts(x + r * 0.6, y - h * 0.6, r * 0.7, key + 'c'), dioBlobPts(x + R.n(r * 0.2), y - h * 0.86, r * 0.6, key + 'd'));
  return P;
}
function dioPalm(x, y, h, key, lean = 0.14) {   // a coconut palm: a bent tapering trunk, a fan of drooping fronds
  const R = RNG('dio-palm', key), L = [], Rt = [], P = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10, cx = x + lean * h * u * u, cy = y + 50 - (h + 50) * u, hw = lerp(h * 0.034, h * 0.016, u); L.push([cx - hw, cy]); Rt.unshift([cx + hw, cy]); }
  P.push(L.concat(Rt));
  const tx = x + lean * h, ty = y - h, n = 7;
  for (let i = 0; i < n; i++) { const a = -Math.PI * (0.03 + 0.94 * i / (n - 1)) + R.n(0.09); P.push(dioFrondPts(tx, ty, h * R.r(0.36, 0.46), a, 0.5 + 0.3 * Math.abs(Math.cos(a)), h * 0.085)); }
  P.push(dioCirclePts(tx, ty + h * 0.012, h * 0.04, 14)); return P;
}
function dioGrass(x, y, h, key) { const R = RNG('dio-grass', key), P = []; for (let i = 0; i < 5; i++) P.push(dioFrondPts(x + R.n(h * 0.1), y + 8, h * R.r(0.55, 1), -Math.PI / 2 + R.n(0.55), 0.14, h * 0.13, 6)); return P; }
// a gabled village house on ground line y: { P, holes } (holes = its cut windows)
function dioHouse(x, y, w, h, o = {}) {
  const ov = w * 0.15, rh = o.roof ?? w * 0.44, ww = w * 0.2;
  return { P: [dioRectPts(x - w / 2, y - h, w, h + 70), [[x - w / 2 - ov, y - h + 5], [x, y - h - rh], [x + w / 2 + ov, y - h + 5]]], holes: (o.wins ?? [-0.22, 0.22]).map((f) => dioRectPts(x + f * w - ww / 2, y - h * 0.74, ww, ww * 1.3)) };
}
const dioArchPts = (x, y, w, h) => [[x - w / 2, y], ...dioArc(x, y - h + w / 2, w / 2, w / 2, Math.PI, TAU, 10), [x + w / 2, y]];   // an arched opening standing on y
// a small village mosque (a hall, a dome with a spike, a minaret): { P, holes }
function dioMosque(x, y, w) {
  const h = w * 0.52, top = y - h, dr = w * 0.3, mx = x + w * 0.74, mw = w * 0.13, mt = y - w * 1.32;
  const P = [dioRectPts(x - w / 2, top, w, h + 70), dioRectPts(x - dr * 0.82, top - w * 0.07, dr * 1.64, w * 0.08), dioArc(x, top - w * 0.06, dr * 1.04, dr * 1.02, Math.PI * 0.94, Math.PI * 2.06, 26),
    [[x - dr * 0.13, top - dr * 0.95], [x, top - dr * 1.62], [x + dr * 0.13, top - dr * 0.95]],
    dioRectPts(mx - mw / 2, mt, mw, y - mt + 70), dioRectPts(mx - mw * 0.95, y - w * 1.02, mw * 1.9, w * 0.05), [[mx - mw * 0.8, mt + 2], [mx, mt - w * 0.3], [mx + mw * 0.8, mt + 2]]];
  return { P, holes: [-0.3, 0, 0.3].map((f) => dioArchPts(x + f * w, y - h * 0.2, w * 0.13, h * 0.56)).concat([dioArchPts(mx, y - w * 0.72, mw * 0.5, w * 0.16)]) };
}
const dioJoin = (...gs) => ({ P: gs.flatMap((g) => dioPolys(g.P ?? g)), holes: gs.flatMap((g) => g.holes || []) });
// one side of the leaf frame (side -1 = left, 1 = right), as three sheets so each stays small: part 'top' = a leafy
// branch across the top corner, 'side' = leaves poking in along the edge, 'fern' = ferns rising from the bottom corner
function dioLeafFrame(side, part, key) {
  const R = RNG('dio-frame', key, part), P = [], X = (f) => (side < 0 ? f : W - f), A = (a) => (side < 0 ? a : Math.PI - a);
  if (part === 'top') {
    const L = [], Rt = [], n = 12;
    for (let i = 0; i <= n; i++) { const u = i / n, f = -150 + 380 * u, y = 46 + 170 * u - 40 * Math.sin(Math.PI * u), hw = lerp(13, 3, u); L.push([X(f), y - hw]); Rt.unshift([X(f), y + hw]);
      if (i > 2) { const up = i % 2 === 0; P.push(dioFrondPts(X(f), y, R.r(105, 150), A((up ? -0.62 : 0.95) + R.n(0.22)), up ? 0.1 : 0.22, R.r(44, 58))); } }
    P.push(L.concat(Rt));
  } else if (part === 'side') for (let i = 0; i < 4; i++) P.push(dioFrondPts(X(-50), 470 + i * 250 + R.n(50), R.r(120, 165), A(R.n(0.4) + 0.15), 0.25, R.r(46, 60)));
  else for (let i = 0; i < 6; i++) P.push(dioFrondPts(X(-40 + i * 36), H + 60, R.r(380, 540), A(-Math.PI / 2 + 0.1 + i * 0.17 + R.n(0.06)), 0.16, R.r(64, 88)));
  return P;
}
function dioLeafSheets(key, tone, o = {}) {   // both sides of the frame; o.slide = how far each side is still out of the picture
  for (const side of [-1, 1]) for (const part of ['top', 'side', 'fern']) dioSheet(key + side + part, () => dioLeafFrame(side, part, key + side), tone, { depth: 1, gap: 1.3, haze: 0, ...o, dx: side * (o.slide ?? 0) });
}

// ---------------------------------------------------------------------
//  background life: birds, falling leaves, fireflies, lit windows, the lantern
// ---------------------------------------------------------------------
function dioBirdPts(x, y, s, ph) {   // a gliding bird seen from afar; ph = flap phase
  const up = s * 0.55 * Math.sin(ph);
  return [[x - s, y - up], [x - s * 0.46, y - up * 0.72 - s * 0.17], [x, y - s * 0.1], [x + s * 0.46, y - up * 0.72 - s * 0.17], [x + s, y - up], [x + s * 0.42, y - up * 0.42 + s * 0.03], [x, y + s * 0.15], [x - s * 0.42, y - up * 0.42 + s * 0.03]];
}
function dioBird(x, y, s, ph, col) { dioCut(dioBirdPts(x, y, s, ph), col ?? dioTone(7), { gap: 0.45 }); }
function dioLeavesFall(key, n, col, o = {}) {   // small leaves drifting down, turning. o: { x0, x1, y0, y1 } (they sway up to 60px past x0 / x1)
  const R = RNG('dio-fall', key), y0 = o.y0 ?? 200, span = (o.y1 ?? 1500) - y0;
  for (let i = 0; i < n; i++) {
    const bx = R.r(o.x0 ?? 120, o.x1 ?? W - 160), sp = R.r(70, 120), ph = R.r(0, 10), len = R.r(26, 40), sw = R.r(30, 60), f = R.r(0.9, 1.5);
    const t = TT + ph, y = y0 + mod(t * sp, span), x = bx + Math.sin(t * f) * sw, a = Math.sin(t * f) * 0.9 + t * 0.6;
    const edge = Math.min(1, (y - y0) / 80, (y0 + span - y) / 80);
    ctx.save(); ctx.globalAlpha *= clamp(edge); dioCut(dioFrondPts(x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2, len, a, 0, len * 0.46, 6), col, { gap: 0.4 }); ctx.restore();
  }
}
function dioFireflies(key, n, o = {}) {   // glowing dots wandering near (o.x, o.y, o.w, o.h), blinking; they come on one by one from o.t0
  const R = RNG('dio-fly', key), c = o.c ?? DIO.warm;
  for (let i = 0; i < n; i++) {
    const bx = R.r(o.x ?? 80, (o.x ?? 80) + (o.w ?? 800)), by = R.r(o.y ?? 1000, (o.y ?? 1000) + (o.h ?? 400)), f1 = R.r(0.5, 1.1), f2 = R.r(0.4, 0.9), p1 = R.r(0, TAU), p2 = R.r(0, TAU), fb = R.r(1.6, 3);
    const on = o.t0 != null ? EZ.o2(ev(o.t0 + i * 0.13, 0.4)) : 1; if (on <= 0) continue;
    const x = bx + Math.sin(TT * f1 + p1) * 46, y = by + Math.cos(TT * f2 + p2) * 30, a = on * (0.45 + 0.55 * Math.sin(TT * fb + p1) ** 2);
    dioGlow(x, y, 34, 0.75 * a, c); ctx.fillStyle = dioA(DIO.warmHi, a); ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill();
  }
}
// windows cut in a sheet, lit from inside. Call with pass 'back' BEFORE the sheet (the warm paper behind the holes)
// and 'glow' AFTER it. lit(i) = 0..1 for hole i; o = the sheet's { depth, dx, dy }
function dioWindows(holes, pass, lit, o = {}) {
  dioLayer(o.depth ?? 0, () => holes.forEach((P, i) => {
    const a = clamp(lit(i)); if (a <= 0) return; const b = bbox(P), x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2;
    if (pass === 'back') { ctx.fillStyle = dioMix(dioTone(4), DIO.warm, a); ctx.fillRect(b.x0 - 5, b.y0 - 5, b.x1 - b.x0 + 10, b.y1 - b.y0 + 10); ctx.fillStyle = dioA(DIO.warmHi, 0.55 * a); ctx.fillRect(b.x0 - 5, b.y0 - 5, b.x1 - b.x0 + 10, (b.y1 - b.y0) * 0.6); } else dioGlow(x, y, 58, 0.5 * a * (0.9 + 0.1 * Math.sin(TT * 5 + i * 2)), DIO.warm);
  }), o);
}
// the hanging paper lantern: body centre (x, y) at rest, s = body height; it hangs from (x, o.top) and sways
function dioLanternGeo(x, y, s, o = {}) {
  const top = o.top ?? y - s * 2, a = o.sway ?? Math.sin(TT * 1.5 + 0.6) * 0.028, ca = Math.cos(a), sa = Math.sin(a);
  const rot = ([px, py]) => [x + (px - x) * ca - (py - top) * sa, top + (px - x) * sa + (py - top) * ca];
  const sup = (ax, by, n = 48) => { const P = []; for (let i = 0; i < n; i++) { const t = i / n * TAU, c = Math.cos(t), sn = Math.sin(t); P.push([x + Math.sign(c) * Math.abs(c) ** 0.6 * ax, y + Math.sign(sn) * Math.abs(sn) ** 0.72 * by]); } return P; };
  return { top, rot, body: sup(s * 0.38, s * 0.5).map(rot), shell: sup(s * 0.43, s * 0.535).map(rot) };
}
const dioLanternPts = (x, y, s, o) => dioLanternGeo(x, y, s, o).body;   // the bridge outline
function dioLantern(x, y, s, o = {}) {
  const g = dioLanternGeo(x, y, s, o), q = (px, py) => g.rot([x + px * s, y + py * s]), lit = (o.lit ?? 1) * (0.93 + 0.07 * Math.sin(TT * 5.3)), c = o.c ?? DIO.warm, col = o.col ?? dioTone(8);
  const [gx, gy] = g.rot([x, y]);
  dioGlow(gx, gy, s * 2.5, 0.5 * lit, c);
  dioPiece(() => {
    dioTrace([g.shell, [q(-0.3, -0.5), q(-0.2, -0.64), q(0.2, -0.64), q(0.3, -0.5)], [q(-0.3, 0.5), q(-0.21, 0.62), q(0.21, 0.62), q(0.3, 0.5)], [q(-0.02, 0.6), q(0.02, 0.6), q(0.02, 0.84), q(0.05, 0.92), q(0, 1.0), q(-0.05, 0.92), q(-0.02, 0.84)]]); ctx.fill();
    ctx.lineWidth = Math.max(3, s * 0.018); ctx.beginPath(); ctx.moveTo(...q(0, -0.62)); ctx.lineTo(x, g.top); ctx.stroke();
  }, col);
  dioHole(g.body, dioMix(dioTone(6), c, lit), { hot: 0.7 * lit });
  if ((o.ribs ?? 1) > 0) { ctx.save(); dioTrace([g.body]); ctx.clip(); ctx.globalAlpha *= o.ribs ?? 1; ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, s * 0.022); ctx.beginPath(); for (const f of [-0.14, 0.14]) { ctx.moveTo(...q(f, -0.6)); ctx.lineTo(...q(f, 0.6)); } ctx.stroke(); ctx.restore(); }
  dioGlow(gx, gy, s * 0.9, 0.28 * lit, DIO.warmHi);
}

// ---------------------------------------------------------------------
//  the hero: a paper deer in profile (x, y = between its hooves on the ground line; s = height to the top of its head).
//  o: { face 1 | -1, graze 0..1 (head down), look -1..1 (lifts / drops the muzzle), ear, tail (0..1, else idle flicks),
//       antlers, col, ramp, key }. A pale cut-out eye that blinks. Sets SPARK_AT.
// ---------------------------------------------------------------------
function dioDeer(x, y, s, o = {}) {
  const R = o.ramp ?? DIO_R, f = o.face ?? 1, col = o.col ?? R.tones[8], gz = clamp(o.graze ?? 0);
  const flick = (off, every, len) => { const p = mod(TT + off, every); return p < len ? Math.sin(p / len * Math.PI) : 0; };
  const ear = o.ear ?? flick(0.5, 2.3, 0.3), tail = o.tail ?? flick(1.2, 1.7, 0.36), br = Math.sin(TT * 1.9) * 0.005;
  const pt = (lx, ly) => [x + f * lx * s, y + ly * s];
  const nb = [0.2, -0.58 + br], th = lerp(-64, 46, gz) * DEG, nl = lerp(0.3, 0.34, gz), hp = [nb[0] + Math.cos(th) * nl, nb[1] + Math.sin(th) * nl], nx = -Math.sin(th), ny = Math.cos(th);
  const ha = (lerp(10, 66, gz) - (o.look ?? 0) * 15) * DEG + Math.sin(TT * 1.3) * 0.015, ch = Math.cos(ha), sh = Math.sin(ha);
  const hl = (lx, ly) => [hp[0] + lx * ch - ly * sh, hp[1] + lx * sh + ly * ch], hpt = (lx, ly) => pt(...hl(lx, ly));
  const U = [   // body space: unit = s, y up is negative
    dioArc(0, -0.5 + br, 0.27, 0.125, 0, TAU, 26), dioArc(0.17, -0.53 + br, 0.13, 0.135, 0, TAU, 20), dioArc(-0.17, -0.52 + br, 0.14, 0.135, 0, TAU, 20),
    [[0.14, -0.48], [0.215, -0.48], [0.196, -0.24], [0.192, -0.03], [0.204, 0], [0.16, 0], [0.164, -0.03], [0.158, -0.24]], [[0.07, -0.46], [0.135, -0.46], [0.118, -0.24], [0.114, 0], [0.08, 0], [0.084, -0.24]],
    [[-0.3, -0.5], [-0.13, -0.46], [-0.185, -0.27], [-0.182, -0.02], [-0.172, 0], [-0.226, 0], [-0.23, -0.24], [-0.292, -0.34]], [[-0.2, -0.46], [-0.07, -0.45], [-0.118, -0.27], [-0.122, 0], [-0.164, 0], [-0.164, -0.25], [-0.212, -0.34]],
    [[0.12, -0.635 + br], [hp[0] - nx * 0.052, hp[1] - ny * 0.052], [hp[0] + nx * 0.052, hp[1] + ny * 0.052], [0.275, -0.47 + br]],
    [[-0.075, -0.05], [-0.01, -0.078], [0.07, -0.058], [0.165, -0.012], [0.19, 0.018], [0.175, 0.046], [0.08, 0.052], [-0.03, 0.07], [-0.08, 0.03]].map(([a, b]) => hl(a, b)),
    dioFrondPts(...hl(-0.035, -0.05), 0.14, ha + (-122 + ear * 36) * DEG, 0, 0.062, 6),
    dioFrondPts(-0.285, -0.57 + br, 0.115, (118 + tail * 95) * DEG, 0, 0.058, 6),
  ].map((P) => P.map(([a, b]) => pt(a, b)));
  const ant = o.antlers === false ? [] : [[[-0.01, -0.07], [-0.05, -0.19], [-0.02, -0.31], [0.03, -0.38]], [[-0.045, -0.17], [0.04, -0.22]], [[-0.03, -0.27], [-0.1, -0.34]], [[0.03, -0.07], [0.025, -0.18], [0.065, -0.28], [0.115, -0.33]], [[0.03, -0.2], [0.1, -0.22]]].map((L) => L.map(([a, b]) => hpt(a, b)));
  SPARK_AT = toScreen(x, y - s * 0.5);
  dioPiece(() => {
    dioTrace(U); ctx.fill();
    ctx.lineWidth = Math.max(3, s * 0.021); ctx.beginPath(); for (const L of ant) L.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
  }, col, { shadow: dioA(R.tones[8], 0.5), gap: 0.8 });
  if (mod(TT + 0.8, 2.9) > 0.12) { const [ex, ey] = hpt(0.058, -0.02); ctx.fillStyle = R.light; ctx.beginPath(); ctx.arc(ex, ey, Math.max(2.6, s * 0.017), 0, TAU); ctx.fill(); }
}
const dioDeerPts = (x, y, s) => dioArc(x, y - s * 0.52, s * 0.42, s * 0.5, 0, TAU * 47 / 48, 47);   // a bridge outline for the hero (its bounding egg)

// ---------------------------------------------------------------------
//  type: letters cut out of pale paper (each glued on by hand, with its cast shadow), and a caption on a paper strip.
//  Both go through DEFER (drawn after the camera, at screen size) and fade as a bridge starts.
// ---------------------------------------------------------------------
function dioTitleNow(str, R, o = {}) {
  const al = dioLeaving(); if (al <= 0.001) return;
  const size = o.size ?? 112, sp = o.spacing ?? 14, at = o.at ?? Math.max(E0 + 0.1, dioArrive() - 0.1), y = o.y ?? 376, rng = RNG('dio-title', str), chars = [...str];
  ctx.save(); ctx.font = `700 ${size}px ${DIO_SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const ws = chars.map((ch) => ctx.measureText(ch).width); let px = (o.x ?? CX) - (ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1)) / 2;
  chars.forEach((ch, i) => {
    const u = EZ.o3(ev(at + i * 0.07, 0.5)), rot = rng.n(0.035), dy = rng.n(4), cx = px + ws[i] / 2; px += ws[i] + sp;
    if (u <= 0 || ch === ' ') return;
    ctx.save(); ctx.globalAlpha = al * Math.min(1, u * 1.7); ctx.translate(cx, y + dy + (1 - u) * 46); ctx.rotate(rot * (2 - u));
    ctx.shadowColor = dioA(R.tones[8], 0.55); ctx.shadowBlur = 14; ctx.shadowOffsetX = 7; ctx.shadowOffsetY = 10; ctx.fillStyle = dioMix(R.text, R.tones[3], 0.5); ctx.fillText(ch, 1.6, 2.6);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = R.text; ctx.fillText(ch, 0, 0); ctx.restore();
  });
  ctx.restore();
}
// 'Senja turun di *lembah*': the starred word sits on a dark chip of paper in the accent colour. o: { y, size, at, hi, rot }
function dioCaptionNow(str, R, o = {}) {
  const al = dioLeaving(), size = o.size ?? 52, y = o.y ?? 1404, u = EZ.o3(ev(o.at ?? dioArrive() + 0.25, 0.55)); if (al <= 0.001 || u <= 0) return;
  const parts = str.split('*').map((s, i) => ({ s: i % 2 ? s.trim() : s, hi: i % 2 === 1 })).filter((p) => p.s.length), chip = 16, rng = RNG('dio-strip', str);
  ctx.save(); ctx.font = `600 ${size}px ${DIO_SANS}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const p of parts) p.w = ctx.measureText(p.s).width + (p.hi ? chip * 2 : 0);
  const tot = parts.reduce((a, p) => a + p.w, 0), w = tot + 96, h = size * 1.9, j = () => rng.n(4);
  ctx.globalAlpha = al * Math.min(1, u * 1.6); ctx.translate(o.x ?? CX, y + (1 - u) * 70); ctx.rotate(o.rot ?? -0.012);
  const S = [[-w / 2 + j(), -h / 2 + j()], [w / 2 + j(), -h / 2 + j()], [w / 2 + j(), h / 2 + j()], [-w / 2 + j(), h / 2 + j()]];
  dioPiece(() => { dioTrace([S]); ctx.fill(); }, R.strip, { shadow: dioA(R.tones[8], 0.6), lip: 0.6 });
  ctx.save(); dioTrace([S]); ctx.clip(); dioGrainOver(ctx, 0, 0); ctx.fillRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16); ctx.restore();
  let px = -tot / 2;
  for (const p of parts) {
    if (p.hi) {
      ctx.save(); ctx.translate(px + p.w / 2, 0); ctx.rotate(0.022);
      dioPiece(() => { ctx.beginPath(); ctx.rect(-p.w / 2, -size * 0.7, p.w, size * 1.4); ctx.fill(); }, R.tones[7], { shadow: dioA(R.tones[8], 0.5), gap: 0.4, lip: 0.25 });
      ctx.textAlign = 'center'; ctx.fillStyle = o.hi ?? R.hi; ctx.fillText(p.s, 0, 2); ctx.restore();
    } else { ctx.fillStyle = R.tones[8]; ctx.fillText(p.s, px, 2); }
    px += p.w;
  }
  ctx.restore();
}
const dioTitle = (str, o = {}) => { const R = DIO_R, f = () => dioTitleNow(str, R, o); if (DEFER) DEFER.push(f); else f(); };
const dioCaption = (str, o = {}) => { const R = DIO_R, f = () => dioCaptionNow(str, R, o); if (DEFER) DEFER.push(f); else f(); };

// ---- the box: a dark outer mat over a thin inner mat, each throwing its shadow into the picture; darker corners. Cached.
let DIO_MAT = null;
function dioMat() {
  const t = 104;   // how far the mats and their shadows reach in from the frame edge: only these four strips are drawn
  if (!DIO_MAT) {
    const g = (DIO_MAT = dioMk(W, H)).getContext('2d');
    for (const [inset, rad, col, k] of [[42, 12, DIO.mat2, 0.75], [18, 22, DIO.mat, 1]]) {
      const O = rrectPts(inset, inset, W - inset * 2, H - inset * 2, rad, 8);
      g.save(); g.shadowColor = 'rgba(8,4,10,0.62)'; g.shadowBlur = 36 * k; g.shadowOffsetX = 13 * k; g.shadowOffsetY = 18 * k;
      g.beginPath(); g.rect(-300, -300, W + 600, H + 600); dioAdd(O, g); g.fillStyle = col; g.fill('evenodd'); g.restore();
      g.save(); g.beginPath(); dioAdd(O, g); g.clip(); g.translate(-1.6, -2.4); g.beginPath(); dioAdd(O, g); g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 3; g.stroke(); g.restore();
    }
    g.globalCompositeOperation = 'source-atop'; dioGrainOver(g, W, H);
  }
  ctx.save(); screen(); ctx.globalAlpha = 1;
  for (const [x, y, w, h] of [[0, 0, W, t], [0, H - t, W, t], [0, t, t, H - 2 * t], [W - t, t, t, H - 2 * t]]) ctx.drawImage(DIO_MAT, x, y, w, h, x, y, w, h);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks. The morph happens on one blank sheet of paper: the old era is seen through a hole
//  cut in it (the cut edge's shadow falls into the scene), the hole closes onto the light disc, the disc's outline
//  changes shape as a lit hole, and the new era opens out of it.
// =====================================================================
let DIO_BACK = DIO.paper;   // the morph sheet's colour this frame (backdrop always runs before window / blob)
const dioGrowPts = (P, d) => { const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]), r = P.reduce((a, p) => a + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / P.length || 1, k = (r + d) / r; return P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]); };
// one step down into the box (screen coords): through outline P the next sheet shows (colour col, or whatever fn draws),
// with the shadow of the cut edge above falling onto it and a lit lip on the cut
function dioStep(P, col, fn) {
  const b = bbox(P), x0 = Math.max(b.x0, 0) - 90, y0 = Math.max(b.y0, 0) - 90, x1 = Math.min(b.x1, W) + 90, y1 = Math.min(b.y1, H) + 90; if (x1 <= x0 || y1 <= y0) return;
  ctx.save(); dioTrace([P]); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();   // the cut's thickness catching light
  ctx.save(); dioTrace([P]); ctx.clip();
  if (col) { ctx.fillStyle = col; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.fillStyle = ctx.createPattern(dioGrainTile(), 'repeat'); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); } else fn();
  ctx.shadowColor = DIO.shade; ctx.shadowBlur = 34; ctx.shadowOffsetX = 13; ctx.shadowOffsetY = 18;
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); dioAdd(P); ctx.fillStyle = '#000'; ctx.fill('evenodd'); ctx.restore();
  dioLip(P, 'rgba(255,255,255,0.4)', 3.2);
}
// the stack of sheets around a morph opening: two wider cuts, each a step lighter (nearer the light of colour c)
function dioSteps(P, c) { dioStep(dioGrowPts(P, 104), dioMix(DIO_BACK, c, 0.14)); dioStep(dioGrowPts(P, 50), dioMix(DIO_BACK, c, 0.32)); }
const STYLE = {
  name: 'diorama',
  paper: DIO.paper,
  backdrop(c) { DIO_BACK = c; fillAll(c); ctx.save(); screen(); dioGrainOver(ctx, W, H); ctx.restore(); },
  window(P, key, src, o = {}) { dioSteps(P, o.c ?? '#ffffff'); dioStep(P, null, () => ctx.drawImage(src, 0, 0)); },
  blob(P, c, key, u = 0) { dioSteps(P, c); dioLamp(P, c, c, 0.5 + 0.5 * Math.sin(u * Math.PI), { shadow: DIO.shade }); },
  hero(x, y, r, o = {}) { dioDeer(x, y + r, r * 2, { ramp: DIO.night, key: o.key }); },
  heroColor: DIO.night.tones[8],
  heroPts(x, y, r) { return dioDeerPts(x, y + r, r * 2); },
  post() { dioMat(); },
  ones: true,
};
