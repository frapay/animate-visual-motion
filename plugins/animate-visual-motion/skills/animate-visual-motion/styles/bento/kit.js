// =====================================================================
//  styles/bento/kit.js — BENTO: a bento-grid feature board, the layout product launches use to show many features
//  at once. The frame is a modular grid of SOLID rounded tiles with even gutters on a calm ground; every tile holds
//  exactly one idea drawn in code (a huge numeral, a pictogram, a mini chart, a ring, a toggle, swatches, a meter,
//  a badge, the gradient hero tile with the product mark). Neutral greys plus ONE accent. Built on kit/core.js.
//  The core is the layout engine: bentoGrid -> cells -> bentoTile -> an inner rect that the content helpers fill;
//  bentoRelayout / bentoFlow re-flow one arrangement into another. Helpers are prefixed bento…; the palette is BENTO.
//  Needs from the piece head: CX (caption centre x).
//  Optional piece constants (plain consts anywhere in the piece; read when a frame is drawn):
//    BENTO_LIGHT = true              the default ground is light (scenes may still pick one: bentoGround('dark'))
//    BENTO_ACCENT = '#rrggbb'        the one brand accent
//    BENTO_MORPH = { glyph: 'out' }  the product mark on the morphing tile: 'out' (fades in the first half, default),
//                                    'in' (appears in the second half), 'both', 'none'
// =====================================================================
const BENTO = {
  dark: { name: 'dark', ground: '#0b0b0d', tile: '#17171b', raised: '#222228', track: '#2e2e36', ink: '#f5f5f7', dim: '#9d9da6', faint: '#565660',
    edgeHi: 'rgba(255,255,255,0.14)', edgeLo: 'rgba(255,255,255,0.035)', shadow: [0, 0, 0, 0.34] },
  light: { name: 'light', ground: '#f3f3f5', tile: '#ffffff', raised: '#f7f7f9', track: '#e4e4ea', ink: '#111114', dim: '#6e6e77', faint: '#b9b9c2',
    edgeHi: 'rgba(17,17,20,0.045)', edgeLo: 'rgba(17,17,20,0.10)', shadow: [28, 28, 48, 0.085] },
  accent: '#ff5a2c', onAccent: '#ffffff',
  r: 48, gap: 22, pad: 26, label: 29,      // corner radius, gutter, tile padding, label size (px at 1080 wide)
};
const BENTO_SANS = 'system-ui, -apple-system, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "DejaVu Sans", sans-serif';
const bentoAccent = () => (typeof BENTO_ACCENT !== 'undefined' ? BENTO_ACCENT : BENTO.accent);
const bentoDefault = () => (typeof BENTO_LIGHT !== 'undefined' && BENTO_LIGHT ? BENTO.light : BENTO.dark);
let BENTO_T = null;                        // the theme of the scene being drawn; reset after every frame (STYLE.post)
const bentoT = () => BENTO_T || bentoDefault();
function bentoTheme(name) { BENTO_T = name ? (typeof name === 'string' ? BENTO[name] : name) : bentoDefault(); return BENTO_T; }

// ---------------------------------------------------------------------
//  colour: hex or rgb() in, rgba() / rgb() / hex out
// ---------------------------------------------------------------------
function bentoRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const bentoA = (c, a) => { const [r, g, b] = bentoRGB(c); return `rgba(${r},${g},${b},${clamp(a).toFixed(4)})`; };
const bentoMix = (a, b, u) => { const x = bentoRGB(a), y = bentoRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const bentoHex = (c) => '#' + bentoRGB(c).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const bentoLum = (c) => { const [r, g, b] = bentoRGB(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const bentoSat = (c) => { const v = bentoRGB(c), mx = Math.max(...v), mn = Math.min(...v); return mx ? (mx - mn) / mx : 0; };
// the same colour with its hue turned by deg and its lightness shifted by dl (-1..1): the hero gradient's two ends
function bentoHue(c, deg, dl = 0) {
  const [r, g, b] = bentoRGB(c).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const H2 = mod(h * 60 + deg, 360), L = clamp(l + dl), C2 = (1 - Math.abs(2 * L - 1)) * s, X = C2 * (1 - Math.abs((H2 / 60) % 2 - 1)), m = L - C2 / 2;
  const [R, G, Bv] = H2 < 60 ? [C2, X, 0] : H2 < 120 ? [X, C2, 0] : H2 < 180 ? [0, C2, X] : H2 < 240 ? [0, X, C2] : H2 < 300 ? [X, 0, C2] : [C2, 0, X];
  return `rgb(${[R, G, Bv].map((v) => Math.round((v + m) * 255)).join(',')})`;
}

// ---------------------------------------------------------------------
//  geometry: rects are { x, y, w, h }; paths are plain canvas paths (crisp, no wobble: this is a screen, not paper)
// ---------------------------------------------------------------------
const bentoZ = () => Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;        // the camera's zoom (hairlines divide by it)
function bentoRR(x, y, w, h, r) { ctx.beginPath(); if (w <= 0 || h <= 0) return; ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
function bentoPoly(P, closed) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }
const bentoCen = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const bentoMixRect = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), w: lerp(a.w, b.w, u), h: lerp(a.h, b.h, u) });
const bentoGrow = (q, k) => ({ x: q.x + q.w * (1 - k) / 2, y: q.y + q.h * (1 - k) / 2, w: q.w * k, h: q.h * k });
const bentoInset = (q, p) => ({ x: q.x + p, y: q.y + p, w: q.w - 2 * p, h: q.h - 2 * p });
// a tile's outline as points, for bridge shapes: bentoPts(G.cell(0, 1, 2, 2))
const bentoPts = (q, r = BENTO.r) => rrectPts(q.x, q.y, q.w, q.h, r, 10);
const bentoCurve = (p0, c, p1, n = 14) => { const P = []; for (let i = 0; i <= n; i++) { const t = i / n, k = 1 - t; P.push([k * k * p0[0] + 2 * k * t * c[0] + t * t * p1[0], k * k * p0[1] + 2 * k * t * c[1] + t * t * p1[1]]); } return P; };

// ---------------------------------------------------------------------
//  THE LAYOUT ENGINE
//  bentoGrid({ cols, rows, gap, rect: [x, y, w, h], r }) -> G
//    G.cell(col, row, spanC = 1, spanR = 1) -> { x, y, w, h }      one tile's rect (spans include the gutters between)
//    G.layout({ id: [col, row, spanC, spanR], ... }) -> { id: rect }  a whole arrangement
//  bentoCheck(G, spec) -> problems[] (tiles that overlap or leave the grid, empty cells): run it while laying out
// ---------------------------------------------------------------------
function bentoGrid(o = {}) {
  const cols = o.cols ?? 4, rows = o.rows ?? 5, gap = o.gap ?? BENTO.gap, [x, y, w, h] = o.rect ?? [60, 334, 880, 1016];
  const cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
  const G = { cols, rows, gap, x, y, w, h, cw, ch, r: o.r ?? BENTO.r };
  G.cell = (c, r, sc = 1, sr = 1) => ({ x: x + c * (cw + gap), y: y + r * (ch + gap), w: sc * cw + (sc - 1) * gap, h: sr * ch + (sr - 1) * gap });
  G.layout = (spec) => { const out = {}; for (const id in spec) out[id] = G.cell(...spec[id]); return out; };
  return G;
}
function bentoCheck(G, spec) {
  const used = {}, bad = [];
  for (const id in spec) {
    const [c, r, sc = 1, sr = 1] = spec[id];
    if (c < 0 || r < 0 || c + sc > G.cols || r + sr > G.rows) bad.push(`${id} leaves the grid`);
    for (let i = c; i < c + sc; i++) for (let j = r; j < r + sr; j++) { const k = i + ',' + j; if (used[k]) bad.push(`${id} overlaps ${used[k]} at ${k}`); else used[k] = id; }
  }
  const empty = G.cols * G.rows - Object.keys(used).length; if (empty > 0) bad.push(`${empty} empty cell${empty > 1 ? 's' : ''}`);
  return bad;
}
// the re-flow: layout A -> layout B at progress u (0..1). Tiles in both slide and resize; a tile only in A shrinks out,
// a tile only in B grows in. o: { stagger (0..1 of the move, per tile), order: [ids], ease: fn }.
// Each rect carries .a (alpha) and .u (its own progress): hand it to bentoTile as the cell.
function bentoRelayout(A, B, u, o = {}) {
  const ids = o.order ?? [...new Set([...Object.keys(A), ...Object.keys(B)])], n = ids.length, st = o.stagger ?? 0, ez = o.ease ?? EZ.io, out = {};
  ids.forEach((id, i) => {
    const raw = clamp(u * (1 + st * (n - 1)) - st * i), v = ez(raw), a = A[id], b = B[id];
    if (a && b) out[id] = { ...bentoMixRect(a, b, v), a: 1, u: raw };
    else if (a) out[id] = { ...bentoGrow(a, 1 - 0.14 * raw), a: 1 - EZ.o2(raw), u: raw };
    else if (b) out[id] = { ...bentoGrow(b, 0.86 + 0.14 * clamp(v)), a: EZ.o2(raw), u: raw };
  });
  return out;
}
// the same on a clock, with springs: starts at t0, each tile a step later, a small overshoot as it lands
function bentoFlow(t0, A, B, o = {}) {
  const ids = o.order ?? [...new Set([...Object.keys(A), ...Object.keys(B)])], p = o.spring ?? { k: 210, d: 22 }, step = o.step ?? 0.03, out = {};
  ids.forEach((id, i) => {
    const dt = TT - t0 - i * step, v = springEase(dt, p.k, p.d), raw = clamp(dt / 0.3), a = A[id], b = B[id];
    if (a && b) out[id] = { ...bentoMixRect(a, b, v), a: 1, u: clamp(v) };
    else if (a) out[id] = { ...bentoGrow(a, 1 - 0.14 * raw), a: 1 - EZ.o2(raw), u: raw };
    else if (b) out[id] = { ...bentoGrow(b, 0.86 + 0.14 * v), a: EZ.o2(raw), u: raw };
  });
  return out;
}
// one tile taking over the frame: its rect (and corner radius) at progress u; hand it to bentoTile as the cell
function bentoExpand(q, u, o = {}) { const to = o.to ?? { x: 0, y: 0, w: W, h: H }; return { ...bentoMixRect(q, to, u), r: lerp(o.r ?? BENTO.r, o.rTo ?? 0, u) }; }

// ---------------------------------------------------------------------
//  surfaces: an opaque tile a shade off the ground, a very soft shadow, a 1px inner edge highlight
//  fill: 'tile' | 'raised' | 'accent' (the one tinted tile) | 'hero' (the accent gradient) | any colour
// ---------------------------------------------------------------------
function bentoFillStyle(fill, b, c) {
  const T = bentoT();
  if (fill === 'tile') return T.tile;
  if (fill === 'raised') return T.raised;
  if (fill === 'accent') { const ac = c ?? bentoAccent(), g = ctx.createLinearGradient(0, b.y0, 0, b.y1); g.addColorStop(0, bentoMix(ac, '#ffffff', 0.07)); g.addColorStop(1, bentoMix(ac, '#000000', 0.06)); return g; }
  if (fill === 'hero') { const ac = c ?? bentoAccent(), g = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1); g.addColorStop(0, bentoHue(ac, 17, 0.07)); g.addColorStop(0.5, ac); g.addColorStop(1, bentoHue(ac, -13, -0.06)); return g; }
  return fill;
}
function bentoShadowOf(path, k = 1) {       // path(e, dy): the outline grown by e px and dropped dy px
  const T = bentoT(), [r, g, b, a] = T.shadow; if (a * k <= 0) return;
  ctx.fillStyle = `rgba(${r},${g},${b},${(a * k / 6).toFixed(4)})`;
  for (let i = 1; i <= 6; i++) { path(i * 3.2, 12); ctx.fill(); }
}
function bentoEdge(b, on) {                 // the stroke style of the inner edge: lighter at the top
  const T = bentoT(), g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
  g.addColorStop(0, on ? 'rgba(255,255,255,0.42)' : T.edgeHi); g.addColorStop(1, on ? 'rgba(255,255,255,0.06)' : T.edgeLo); return g;
}
const bentoIsOn = (fill) => fill === 'accent' || fill === 'hero';
function bentoSurface(x, y, w, h, rad, fill = 'tile', o = {}) {
  const lw = 1.5 / bentoZ(), b = { x0: x, y0: y, x1: x + w, y1: y + h }, on = o.on ?? bentoIsOn(fill);
  ctx.save();
  bentoShadowOf((e, dy) => bentoRR(x - e, y - e + dy, w + 2 * e, h + 2 * e, rad + e), o.shadow ?? 1);
  bentoRR(x, y, w, h, rad); ctx.fillStyle = bentoFillStyle(fill, b, o.c); ctx.fill();
  if (fill === 'hero') {                   // a soft light on the gradient's shoulder
    ctx.save(); ctx.clip(); const m = Math.max(w, h), g = ctx.createRadialGradient(x + w * 0.22, y + h * 0.16, 0, x + w * 0.22, y + h * 0.16, m * 0.85);
    g.addColorStop(0, 'rgba(255,255,255,0.24)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  bentoRR(x + lw / 2, y + lw / 2, w - lw, h - lw, rad - lw / 2); ctx.lineWidth = lw; ctx.strokeStyle = bentoEdge(b, on); ctx.stroke();
  ctx.restore();
}
// the same surface on any outline P (the morphing tile, the hero's outline)
function bentoSolid(P, fill = 'tile', o = {}) {
  const b = bbox(P), ce = bentoCen(P), on = o.on ?? bentoIsOn(fill);
  ctx.save();
  bentoShadowOf((e, dy) => { const k = 1 + e * 2 / Math.max(1, b.x1 - b.x0); bentoPoly(P.map(([x, y]) => [ce[0] + (x - ce[0]) * k, ce[1] + (y - ce[1]) * k + dy]), true); }, o.shadow ?? 1);
  bentoPoly(P, true); ctx.fillStyle = bentoFillStyle(fill, b, o.c); ctx.fill();
  if (o.over && (o.overA ?? 1) > 0) {       // a second fill fading over the first (the hero gradient leaving the morphing tile)
    ctx.save(); ctx.globalAlpha *= o.overA ?? 1; ctx.fillStyle = bentoFillStyle(o.over, b, o.c); ctx.fill();
    if (o.over === 'hero') { ctx.clip(); const w = b.x1 - b.x0, h = b.y1 - b.y0, gx = b.x0 + w * 0.22, gy = b.y0 + h * 0.16, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.85); g.addColorStop(0, 'rgba(255,255,255,0.24)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(b.x0, b.y0, w, h); }
    ctx.restore(); bentoPoly(P, true);
  }
  ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.strokeStyle = bentoEdge(b, on); ctx.stroke();
  ctx.restore();
}
// a slow diagonal sheen across a tile (the hero tile's idle life). u: 0..1 across; nothing outside 0..1
function bentoSheen(x, y, w, h, rad, u) {
  if (u <= 0 || u >= 1) return;
  const cx = x - w * 0.5 + (w * 2) * u, bw = w * 0.34;
  ctx.save(); bentoRR(x, y, w, h, rad); ctx.clip();
  const g = ctx.createLinearGradient(cx - bw, y, cx + bw, y + h * 0.35); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}

// a tile popping in at time `at`: scale 0.9 -> 1 with a small overshoot, and a fade
const bentoPop = (at) => (at == null ? { s: 1, a: 1 } : { s: 0.9 + 0.1 * springEase(TT - at, 300, 17), a: EZ.o2(seg(TT, at, at + 0.16)) });
// bentoTile(G, cell, o, fn?) draws one tile and returns its INNER rect for the content helpers.
//   cell: [col, row, spanC, spanR] in G, or a rect (from G.cell, bentoRelayout, bentoFlow, bentoExpand)
//   o: { at (pop-in time; omit = already there), fill, c, r, pad, a, shadow, press (time of a tap: a quick dip), wait (s after `at` before contents) }
//   fn(inner): optional; drawn inside the tile's transform and clipped to it
//   returns { x, y, w, h (inside the padding), ox, oy, ow, oh (the tile), r, a, s, on, t0 (when contents may start), live }
function bentoTile(G, cell, o = {}, fn) {
  const q = Array.isArray(cell) ? G.cell(...cell) : cell, pop = bentoPop(o.at), pad = o.pad ?? BENTO.pad, fill = o.fill ?? 'tile';
  let s = pop.s; const a = pop.a * (q.a ?? 1) * (o.a ?? 1);
  if (o.press != null) s *= 1 - 0.05 * (springEase(TT - o.press, 420, 26) - springEase(TT - o.press - 0.09, 300, 15));
  const rad = Math.min(q.r ?? o.r ?? (G ? G.r : BENTO.r), q.w / 2, q.h / 2), on = o.on ?? bentoIsOn(fill);
  const inner = { x: q.x + pad, y: q.y + pad, w: q.w - pad * 2, h: q.h - pad * 2, ox: q.x, oy: q.y, ow: q.w, oh: q.h, r: rad, pad, a, s, on, t0: o.at == null ? -9 : o.at + (o.wait ?? 0.2), live: a > 0.004 };
  if (!inner.live) return inner;
  ctx.save(); ctx.globalAlpha *= a;
  if (Math.abs(s - 1) > 1e-4) { const cx = q.x + q.w / 2, cy = q.y + q.h / 2; ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
  bentoSurface(q.x, q.y, q.w, q.h, rad, fill, { shadow: o.shadow, c: o.c, on });
  if (fn) { ctx.save(); bentoRR(q.x, q.y, q.w, q.h, rad); ctx.clip(); fn({ ...inner, a: 1, s: 1 }); ctx.restore(); }
  ctx.restore();
  return inner;
}
// contents follow their tile: its alpha and its pop scale
function bentoIn(r, fn) {
  if (r.live === false) return;
  ctx.save(); ctx.globalAlpha *= r.a ?? 1;
  if (r.s != null && Math.abs(r.s - 1) > 1e-4 && r.ow) { const cx = r.ox + r.ow / 2, cy = r.oy + r.oh / 2; ctx.translate(cx, cy); ctx.scale(r.s, r.s); ctx.translate(-cx, -cy); }
  fn(); ctx.restore();
}
// the colours contents use on this tile (white on the tinted tile, greys and the accent elsewhere)
function bentoInk(r) {
  const T = bentoT(), ac = bentoAccent();
  return r.on ? { ink: '#ffffff', dim: 'rgba(255,255,255,0.82)', track: bentoMix(ac, '#ffffff', 0.3), mark: '#ffffff', tile: ac, faint: bentoMix(ac, '#ffffff', 0.45) }
    : { ink: T.ink, dim: T.dim, track: T.track, mark: ac, tile: T.tile, faint: T.faint };
}

// ---------------------------------------------------------------------
//  type: a clean system sans, tight; semibold numerals
// ---------------------------------------------------------------------
const bentoFont = (size, weight = 600) => `${weight} ${size}px ${BENTO_SANS}`;
function bentoSetType(size, weight, track) { ctx.font = bentoFont(size, weight); if ('letterSpacing' in ctx) ctx.letterSpacing = `${((track ?? 0) * size).toFixed(2)}px`; }
function bentoTextW(str, size, weight = 600, track = 0) { ctx.save(); bentoSetType(size, weight, track); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// the size (<= size) at which str fits maxW
const bentoFit = (str, maxW, size, weight = 600, track = 0) => { const w = bentoTextW(str, size, weight, track); return w > maxW ? size * maxW / w : size; };
// o: { weight, align, base, a, track (em), maxW (shrinks to fit) }
function bentoText(str, x, y, size, c, o = {}) {
  const a = o.a ?? 1; if (a <= 0.004 || !String(str).length) return 0;
  const weight = o.weight ?? 600, track = o.track ?? -0.01; if (o.maxW) size = bentoFit(str, o.maxW, size, weight, track);
  ctx.save(); ctx.globalAlpha *= clamp(a); bentoSetType(size, weight, track); ctx.fillStyle = c ?? bentoT().ink; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic';
  ctx.fillText(str, x, y); const w = ctx.measureText(str).width; ctx.restore(); return w;
}
// a tile's small label (top-left, or bottom-left with labelPos: 'bottom'); returns the rect left for the content
function bentoBody(r, o, K, at) {
  if (!o.label) return { x: r.x, y: r.y, w: r.w, h: r.h };
  const size = o.labelSize ?? BENTO.label, lh = size * 1.5, bottom = o.labelPos === 'bottom', a = EZ.o2(seg(TT, at - 0.04, at + 0.2));
  bentoText(o.label, r.x, (bottom ? r.y + r.h - size * 0.14 : r.y + size * 0.8) + (1 - a) * 8, size, o.labelC ?? K.dim, { weight: 600, a, maxW: r.w });
  return bottom ? { x: r.x, y: r.y, w: r.w, h: r.h - lh } : { x: r.x, y: r.y + lh, w: r.w, h: r.h - lh };
}
const bentoAt = (r, o) => o.at ?? r.t0 ?? -9;

// ---------------------------------------------------------------------
//  CONTENT: one idea per tile. Every helper takes the inner rect from bentoTile and animates from o.at
//  (default: just after the tile has landed). o.label adds the tile's small label.
// ---------------------------------------------------------------------
// a huge numeral that counts up, with a small unit. o: { value, from, decimals, prefix, suffix, label, dur, size, c, align }
function bentoStat(r, o = {}) {
  const K = bentoInk(r), at = bentoAt(r, o), dur = o.dur ?? 0.7;
  bentoIn(r, () => {
    const b = bentoBody(r, o, K, at), dec = o.decimals ?? 0, fmt = (v) => (o.prefix ?? '') + v.toFixed(dec), fin = fmt(o.value), suf = o.suffix ?? '', sk = o.suffixScale ?? 0.4;
    let size = Math.min(o.size ?? 1e4, b.h * 1.08);
    const wAt = (s, str) => bentoTextW(str, s, 600, -0.045) + (suf ? s * 0.07 + bentoTextW(suf, s * sk, 600, -0.02) : 0);
    const w1 = wAt(size, fin); if (w1 > b.w) size *= b.w / w1;
    const u = EZ.o3(seg(TT, at, at + dur)), a = EZ.o2(seg(TT, at, at + 0.2)), str = u >= 1 ? fin : fmt(lerp(o.from ?? 0, o.value, u));
    const wNow = wAt(size, str), x = o.align === 'center' ? b.x + (b.w - wNow) / 2 : o.align === 'right' ? b.x + b.w - wNow : b.x, y = b.y + b.h - size * 0.03 + (1 - a) * size * 0.1;
    const nw = bentoText(str, x, y, size, o.c ?? K.ink, { weight: 600, track: -0.045, a });
    if (suf) bentoText(suf, x + nw + size * 0.07, y, size * sk, o.sufC ?? K.dim, { weight: 600, track: -0.02, a });
  });
}

// pictograms: strokes in a unit box (-1..1), drawn on with frac. { P, closed, fill, dot: [x, y, r] }
const BENTO_ICON = (() => {
  const arc = (cx, cy, r, d0, d1, n = 20) => arcPts(cx, cy, r, d0 * DEG, d1 * DEG, n), ln = (...p) => ({ P: p });
  const moon = (() => { const B = [0.42, -0.3], aB = Math.atan2(B[1], B[0]) / DEG; return [...arc(0, 0, 0.9, aB + 56.4, aB + 360 - 56.4, 40), ...arc(B[0], B[1], 0.75, aB + 180 + 88.6, aB + 180 - 88.6, 30)]; })();
  const spark = (() => { const P = []; for (let i = 0; i < 4; i++) { const a = i * 90 * DEG, b = a + 90 * DEG, m = a + 45 * DEG; P.push(...bentoCurve([Math.cos(a), Math.sin(a)], [Math.cos(m) * 0.16, Math.sin(m) * 0.16], [Math.cos(b), Math.sin(b)], 10).slice(0, -1)); } return P; })();
  const drop = (() => { const P = []; for (let i = 0; i < 48; i++) { const t = i / 48 * TAU; P.push([0.8 * Math.sin(t) * Math.sin(t / 2), -Math.cos(t) * 0.95]); } return P; })();
  const heart = (() => { const P = []; for (let i = 0; i < 56; i++) { const t = i / 56 * TAU; P.push([16 * Math.sin(t) ** 3 / 17.5, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17.5 - 0.08]); } return P; })();
  return {
    bolt: [{ P: [[0.2, -1], [-0.62, 0.14], [-0.06, 0.14], [-0.2, 1], [0.62, -0.16], [0.06, -0.16]], closed: true, fill: true }],
    check: [ln([-0.62, 0.05], [-0.2, 0.5], [0.66, -0.48])],
    shield: [{ P: [[0, -0.95], [0.78, -0.62], ...bentoCurve([0.78, 0], [0.74, 0.66], [0, 0.98]), ...bentoCurve([0, 0.98], [-0.74, 0.66], [-0.78, 0]).slice(1), [-0.78, -0.62]], closed: true }, ln([-0.34, 0.02], [-0.08, 0.3], [0.38, -0.26])],
    drop: [{ P: drop, closed: true }, { P: arc(0, 0.3, 0.36, 100, 165, 8) }],
    heart: [{ P: heart, closed: true }],
    lock: [{ P: rrectPts(-0.64, -0.1, 1.28, 1.06, 0.24), closed: true }, { P: [[-0.4, -0.1], ...arc(0, -0.5, 0.4, 180, 360), [0.4, -0.1]] }, { dot: [0, 0.42, 0.13] }],
    wifi: [{ P: arc(0, 0.56, 1.25, -138, -42) }, { P: arc(0, 0.56, 0.84, -138, -42) }, { P: arc(0, 0.56, 0.43, -138, -42) }, { dot: [0, 0.56, 0.14] }],
    wave: [[-0.84, 0.28], [-0.42, 0.68], [0, 1], [0.42, 0.52], [0.84, 0.24]].map(([x, h]) => ln([x, -h], [x, h])),
    sun: [{ P: arc(0, 0, 0.42, 0, 360, 28), closed: true }, ...Array.from({ length: 8 }, (_, i) => ln([Math.cos(i * 45 * DEG) * 0.7, Math.sin(i * 45 * DEG) * 0.7], [Math.cos(i * 45 * DEG) * 0.98, Math.sin(i * 45 * DEG) * 0.98]))],
    moon: [{ P: moon, closed: true }],
    leaf: [{ P: [...bentoCurve([-0.72, 0.72], [-0.98, -0.62], [0.86, -0.86]), ...bentoCurve([0.86, -0.86], [0.62, 0.98], [-0.72, 0.72]).slice(1, -1)], closed: true }, ln([-0.94, 0.94], [0.24, -0.24])],
    spark: [{ P: spark, closed: true, fill: true }],
    chip: [{ P: rrectPts(-0.6, -0.6, 1.2, 1.2, 0.2), closed: true }, { P: rrectPts(-0.24, -0.24, 0.48, 0.48, 0.08), closed: true, fill: true },
      ...[-0.3, 0, 0.3].flatMap((d) => [ln([d, -0.6], [d, -0.94]), ln([d, 0.6], [d, 0.94]), ln([-0.6, d], [-0.94, d]), ln([0.6, d], [0.94, d])])],
    globe: [{ P: arc(0, 0, 0.9, 0, 360, 36), closed: true }, { P: ellipsePts(0, 0, 0.4, 0.9, 0, 30), closed: true }, ln([-0.9, 0], [0.9, 0])],
    arrow: [ln([-0.6, 0.6], [0.6, -0.6]), ln([-0.12, -0.6], [0.6, -0.6], [0.6, 0.12])],
  };
})();
// one pictogram centred on (x, y), half-size s. o: { c, frac (draw-on 0..1), w (stroke, in s) }
function bentoPict(x, y, s, name, o = {}) {
  const S = BENTO_ICON[name] ?? BENTO_ICON.spark, frac = clamp(o.frac ?? 1), n = S.length, c = o.c ?? bentoT().ink; if (frac <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = o.w ?? 0.17; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  S.forEach((k, i) => {
    const f = n > 1 ? clamp((frac * (1 + 0.6 * (n - 1) / n) - 0.6 * i / n)) : frac; if (f <= 0) return;   // strokes start one after another, overlapping
    if (k.dot) { ctx.beginPath(); ctx.arc(k.dot[0], k.dot[1], k.dot[2] * EZ.back(f), 0, TAU); ctx.fill(); return; }
    if (k.fill) { ctx.save(); ctx.globalAlpha *= f; const g = 0.6 + 0.4 * EZ.back(f); ctx.scale(g, g); bentoPoly(k.P, true); ctx.fill(); ctx.lineWidth = 0.05; ctx.stroke(); ctx.restore(); return; }
    const P = f >= 1 ? k.P : subPath(k.closed ? [...k.P, k.P[0]] : k.P, f);
    bentoPoly(P, k.closed && f >= 1); ctx.stroke();
  });
  ctx.restore();
}
// a pictogram tile: the icon top-left, the label bottom-left. o: { label, c, s, center, dur, accent }
function bentoIcon(r, name, o = {}) {
  const K = bentoInk(r), at = bentoAt(r, o);
  bentoIn(r, () => {
    const b = bentoBody(r, { labelPos: 'bottom', ...o }, K, at + 0.1), s = Math.min(o.s ?? 1e4, Math.min(b.w, b.h) * (o.center ? 0.42 : 0.4));
    const [x, y] = o.center ? [b.x + b.w / 2, b.y + b.h / 2] : [b.x + s, b.y + s];
    bentoPict(x, y, s, name, { c: o.c ?? (o.accent ? K.mark : K.ink), frac: EZ.io(seg(TT, at, at + (o.dur ?? 0.45))), w: o.w });
  });
}

// a mini chart. o: { data: [..], kind: 'bars' | 'line' | 'area', hi: index | 'last' | 'max' (the accent bar), max, label, dur, live (the end dot pulses) }
function bentoChart(r, o = {}) {
  const K = bentoInk(r), at = bentoAt(r, o), data = o.data ?? [3, 5, 4, 7, 6, 9], n = data.length, mx = o.max ?? Math.max(...data);
  bentoIn(r, () => {
    const b = bentoBody(r, o, K, at);
    if ((o.kind ?? 'bars') === 'bars') {
      const g = Math.min(14, b.w * 0.045), bw = (b.w - g * (n - 1)) / n, hi = o.hi === 'last' ? n - 1 : o.hi === 'max' ? data.indexOf(mx) : o.hi;
      data.forEach((v, i) => {
        const k = springEase(TT - at - i * 0.045, 240, 19), h = Math.max(0, (b.h - 4) * (v / mx) * k); if (h < 0.5) return;
        ctx.fillStyle = i === hi ? K.mark : K.track; bentoRR(b.x + i * (bw + g), b.y + b.h - h, bw, h, Math.min(bw * 0.32, 12)); ctx.fill();
      });
      return;
    }
    // line / area: a smooth curve through the points, drawn on left to right, with the newest point marked
    const pts = data.map((v, i) => [b.x + 8 + (b.w - 16) * i / (n - 1), b.y + b.h - 8 - (b.h - 16) * (v / mx)]), C = [];
    for (let i = 0; i < n - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let j = 0; j < 12; j++) { const t = j / 12, t2 = t * t, t3 = t2 * t; C.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3))); } }
    C.push(pts[n - 1]);
    const f = EZ.io(seg(TT, at, at + (o.dur ?? 0.8))); if (f <= 0) return;
    const P = f >= 1 ? C : subPath(C, f), end = P[P.length - 1], lw = o.w ?? 5;
    ctx.save(); ctx.lineWidth = 1.5 / bentoZ(); ctx.strokeStyle = K.track;
    for (let i = 0; i < 3; i++) { const y = b.y + 8 + (b.h - 16) * i / 2; ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); }
    if (o.kind === 'area') { const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, bentoMix(K.tile, K.mark, 0.3)); g.addColorStop(1, bentoMix(K.tile, K.mark, 0.02)); bentoPoly([...P, [end[0], b.y + b.h], [P[0][0], b.y + b.h]], true); ctx.fillStyle = g; ctx.fill(); }
    bentoPoly(P, false); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = K.mark; ctx.stroke();
    if (o.live !== false && f >= 1) { const pu = mod(TT - at, 1.2) / 1.2; ctx.beginPath(); ctx.arc(end[0], end[1], lw * (1.6 + 2.6 * pu), 0, TAU); ctx.fillStyle = bentoMix(K.tile, K.mark, 0.4 * (1 - pu)); ctx.fill(); }
    ctx.beginPath(); ctx.arc(end[0], end[1], lw * 1.9, 0, TAU); ctx.fillStyle = K.tile; ctx.fill(); ctx.beginPath(); ctx.arc(end[0], end[1], lw * 1.15, 0, TAU); ctx.fillStyle = K.mark; ctx.fill();
    ctx.restore();
  });
}

// a progress ring that sweeps to value (0..1) with the number counting inside. o: { value, label, w, dur, text (false = no number), suffix, c }
function bentoRing(r, o = {}) {
  const K = bentoInk(r), at = bentoAt(r, o), val = clamp(o.value ?? 0.75);
  bentoIn(r, () => {
    const b = bentoBody(r, { labelPos: 'bottom', ...o }, K, at + 0.1), rad0 = Math.min(b.w, b.h) / 2, lw = o.w ?? Math.max(9, rad0 * 0.2), rad = rad0 - lw / 2, cx = b.x + (o.align === 'left' ? rad0 : b.w / 2), cy = b.y + b.h / 2;
    const u = EZ.o3(seg(TT, at, at + (o.dur ?? 0.8))), a = EZ.o2(seg(TT, at - 0.05, at + 0.15));
    ctx.save(); ctx.globalAlpha *= a; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.strokeStyle = K.track; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke();
    if (u > 0) { ctx.strokeStyle = o.c ?? K.mark; ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + TAU * val * u); ctx.stroke(); }
    ctx.restore();
    if (o.text !== false) bentoText(`${Math.round(val * 100 * u)}${o.suffix ?? ''}`, cx, cy + rad * 0.03, rad * (o.suffix ? 0.62 : 0.74), K.ink, { weight: 600, align: 'center', base: 'middle', track: -0.04, a });
  });
}

// a switch: (x, y) its left-middle, w wide, u = 0 (off) .. 1 (on)
function bentoSwitch(x, y, w, u, K) {
  const h = w * 0.58, kr = h / 2 - h * 0.09, cu = clamp(u), stretch = 1 + 0.22 * Math.sin(Math.PI * cu), kx = x + h / 2 + (w - h) * u;
  ctx.save(); bentoRR(x, y - h / 2, w, h, h / 2); ctx.fillStyle = bentoMix(K.track, K.mark, cu); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(kx, y + h * 0.05, kr * stretch + 1.5, kr + 1.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = K.on ? bentoMix('#ffffff', K.tile, cu) : '#ffffff'; ctx.beginPath(); ctx.ellipse(kx, y, kr * stretch, kr, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
// a toggle tile: the label, the state as a big word, and a switch that flips at o.flip.
// o: { on, flip (time it flips to `on`), label, w, onText, offText, state (false = no word) }
function bentoToggle(r, o = {}) {
  const K = { ...bentoInk(r), on: r.on }, at = bentoAt(r, o), on = o.on ?? true;
  bentoIn(r, () => {
    const b = bentoBody(r, o, K, at), wide = b.w > b.h * 2.2, w = o.w ?? (wide ? Math.min(170, b.w * 0.42, b.h * 1.72) : Math.min(150, b.w, b.h * 1.5));
    const k = o.flip == null ? 1 : springEase(TT - o.flip, SPRING.snappy.k, 24), u = on ? k : 1 - k, a = EZ.o2(seg(TT, at, at + 0.2)), sy = b.y + b.h - w * 0.29 + (1 - a) * 8;
    ctx.save(); ctx.globalAlpha *= a; bentoSwitch(wide ? b.x + b.w - w : b.x, sy, w, u, K); ctx.restore();
    if (o.state === false) return;
    const isOn = clamp(u) > 0.5, word = isOn ? (o.onText ?? 'On') : (o.offText ?? 'Off');
    if (wide) bentoText(word, b.x, b.y + b.h - 2 + (1 - a) * 8, Math.min(b.h * 0.98, 96), isOn ? K.ink : K.dim, { track: -0.04, a, maxW: b.w - w - 20 });
    else if (b.w - w > 70) bentoText(word, b.x + w + 16, sy, 30, isOn ? K.ink : K.dim, { base: 'middle', a });
  });
}

// a pill badge with its top-left at (x, y). o: { kind: 'plain' | 'accent' | 'tint', size, dot, live (the dot pulses), at, align: 'left' | 'right' | 'center' }
function bentoBadge(x, y, str, o = {}) {
  const T = bentoT(), ac = bentoAccent(), size = o.size ?? 26, h = size * 1.85, dot = o.dot || o.live, tw = bentoTextW(str, size, 600, -0.01), w = tw + size * 1.5 + (dot ? size * 0.8 : 0);
  const kind = o.kind ?? 'plain', fill = o.fill ?? (kind === 'accent' ? ac : kind === 'tint' ? bentoMix(T.tile, ac, 0.16) : T.raised), c = o.c ?? (kind === 'accent' ? '#ffffff' : kind === 'tint' ? ac : T.ink);
  const pop = bentoPop(o.at), x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x; if (pop.a <= 0.004) return { w, h };
  ctx.save(); ctx.globalAlpha *= pop.a; ctx.translate(x0 + w / 2, y + h / 2); ctx.scale(pop.s, pop.s); ctx.translate(-w / 2, -h / 2);
  bentoRR(0, 0, w, h, h / 2); ctx.fillStyle = fill; ctx.fill();
  if (kind === 'plain') { const lw = 1.5 / bentoZ(); bentoRR(lw / 2, lw / 2, w - lw, h - lw, h / 2); ctx.lineWidth = lw; ctx.strokeStyle = bentoEdge({ y0: 0, y1: h }, false); ctx.stroke(); }
  let tx = size * 0.75;
  if (dot) {
    const dc = kind === 'accent' ? '#ffffff' : ac, dx = tx + size * 0.2, pu = mod(TT, 1) / 1;
    if (o.live) { ctx.beginPath(); ctx.arc(dx, h / 2, size * (0.2 + 0.3 * pu), 0, TAU); ctx.fillStyle = bentoMix(fill, dc, 0.5 * (1 - pu)); ctx.fill(); }
    ctx.beginPath(); ctx.arc(dx, h / 2, size * 0.2, 0, TAU); ctx.fillStyle = dc; ctx.fill(); tx += size * 0.8;
  }
  bentoText(str, tx, h / 2 + size * 0.03, size, c, { base: 'middle' });
  ctx.restore(); return { w, h };
}

// a row of colour swatches; `pick` (may be fractional: it slides) wears the selection ring. o: { colors, pick, label, gap }
function bentoSwatches(r, o = {}) {
  const K = bentoInk(r), at = bentoAt(r, o), cols = o.colors ?? ['#f5f5f7', '#8e8e96', '#3a3a42', bentoAccent()], n = cols.length;
  bentoIn(r, () => {
    const b = bentoBody(r, o, K, at), d = Math.min(b.h - 12, (b.w - 12) / (n + (n - 1) * 0.28)), g = d * 0.28, cy = b.y + b.h - d / 2 - 6, cxOf = (i) => b.x + 6 + d / 2 + i * (d + g), lw = 1.5 / bentoZ();
    cols.forEach((c, i) => {
      const k = springEase(TT - at - i * 0.06, 300, 18); if (k <= 0.01) return;
      ctx.beginPath(); ctx.arc(cxOf(i), cy, d / 2 * k, 0, TAU); ctx.fillStyle = c; ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = bentoLum(c) > 0.5 ? 'rgba(17,17,20,0.14)' : 'rgba(255,255,255,0.16)'; ctx.stroke();
    });
    if (o.pick != null) { const k = springEase(TT - at - n * 0.06, 300, 18); if (k > 0.01) { ctx.beginPath(); ctx.arc(cxOf(o.pick), cy, (d / 2 + 6) * (2 - k), 0, TAU); ctx.lineWidth = 3.5; ctx.strokeStyle = K.ink; ctx.globalAlpha *= clamp(k); ctx.stroke(); } }
  });
}

// a meter. kind 'battery' (a cell that fills to value) or 'level' (segments that light one by one); upright in a tall tile.
// o: { value, kind, label, n (segments), dur, vertical }
function bentoMeter(r, o = {}) {
  const K = bentoInk(r), at = bentoAt(r, o), val = clamp(o.value ?? 0.8), dur = o.dur ?? 0.8;
  bentoIn(r, () => {
    const b = bentoBody(r, o, K, at), vert = o.vertical ?? b.h > b.w * 1.1, u = EZ.o3(seg(TT, at, at + dur)), a = EZ.o2(seg(TT, at - 0.05, at + 0.15));
    ctx.save(); ctx.globalAlpha *= a;
    if (o.kind === 'level') {
      const n = o.n ?? 8, g = 8, L = vert ? b.h : b.w, sz = (L - g * (n - 1)) / n, lit = val * n * u;
      for (let i = 0; i < n; i++) {
        const k = clamp(lit - i), c = bentoMix(K.track, K.mark, k), grow = 1 + 0.06 * Math.sin(Math.PI * k);
        ctx.fillStyle = c;
        if (vert) { const w = b.w * (0.62 + 0.38 * (i / (n - 1))) * grow; bentoRR(b.x, b.y + b.h - (i + 1) * sz - i * g, w, sz, Math.min(sz / 2, 10)); }
        else { const h = b.h * (0.4 + 0.6 * (i / (n - 1))) * grow; bentoRR(b.x + i * (sz + g), b.y + b.h - h, sz, h, Math.min(sz / 2, 10)); }
        ctx.fill();
      }
    } else {
      const nub = 10, lw = 4, bw = vert ? Math.min(b.w, (b.h - nub) * 0.56) : b.w - nub, bh = vert ? b.h - nub : Math.min(b.h, bw * 0.56), x = b.x + (vert && o.align !== 'left' ? (b.w - bw) / 2 : 0), y = vert ? b.y + nub : b.y + b.h - bh, rad = Math.min(bw, bh) * 0.24, pad = 9;
      ctx.lineWidth = lw; ctx.strokeStyle = K.faint; bentoRR(x + lw / 2, y + lw / 2, bw - lw, bh - lw, rad); ctx.stroke();
      ctx.fillStyle = K.faint; if (vert) bentoRR(x + bw * 0.34, y - nub + 2, bw * 0.32, nub, 4); else bentoRR(x + bw - 2, y + bh * 0.34, nub, bh * 0.32, 4); ctx.fill();
      const iw = bw - pad * 2, ih = bh - pad * 2, f = val * u;
      if (f > 0.01) { ctx.fillStyle = o.c ?? K.mark; if (vert) bentoRR(x + pad, y + pad + ih * (1 - f), iw, ih * f, Math.max(4, rad - pad)); else bentoRR(x + pad, y + pad, iw * f, ih, Math.max(4, rad - pad)); ctx.fill(); }
    }
    ctx.restore();
  });
}

// ---------------------------------------------------------------------
//  the ground and the hero
// ---------------------------------------------------------------------
// a faint dot lattice on the ground with a slow diagonal swell (visible only in the gutters and margins)
function bentoDots(c, o = {}) {
  const step = o.step ?? 44, dark = bentoLum(c) < 0.5, base = (dark ? 0.085 : 0.11) * (o.a ?? 1);
  ctx.save(); ctx.fillStyle = dark ? '#ffffff' : '#111114'; const ga = ctx.globalAlpha;
  for (let y = step / 2 - 2; y < H; y += step) for (let x = step / 2 + 2; x < W; x += step) {
    const k = 0.5 + 0.5 * Math.sin(x * 0.0062 + y * 0.0041 - TT * 1.3); ctx.globalAlpha = ga * base * (0.4 + 0.95 * k * k); ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// start every scene with it: picks the theme ('dark' | 'light' | omitted = the piece's default) and lays the calm ground
function bentoGround(theme, o = {}) {
  const T = bentoTheme(theme);
  ctx.save(); ctx.fillStyle = o.c ?? T.ground; ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
  if (o.dots !== false) bentoDots(o.c ?? T.ground, o);
  return T;
}
// the product mark: an open ring and the dot that closes it; it turns slowly. o: { c, frac (draw-on), rot, a }
function bentoGlyph(x, y, s, o = {}) {
  const frac = clamp(o.frac ?? 1), rot = o.rot ?? (-Math.PI / 2 + 0.5 * TT + 0.14 * Math.sin(TT * 2.1)), gap = 0.22 * TAU, a0 = rot + gap / 2;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.strokeStyle = ctx.fillStyle = o.c ?? '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.3;
  if (frac > 0) { ctx.beginPath(); ctx.arc(x, y, s * 0.82, a0, a0 + (TAU - gap) * frac); ctx.stroke(); }
  const dk = EZ.back(clamp(frac * 3)); ctx.beginPath(); ctx.arc(x + Math.cos(rot) * s * 0.82, y + Math.sin(rot) * s * 0.82, s * 0.17 * dk, 0, TAU); ctx.fill();
  ctx.restore();
}
// the hero: a rounded-square accent tile carrying the mark. r = half its side. o: { at (pop), frac, sheen (0..1), key }
const bentoHeroPts = (x, y, r) => rrectPts(x - r, y - r, r * 2, r * 2, r * 0.46, 10);
function bentoHero(x, y, r, o = {}) {
  const pop = bentoPop(o.at); if (pop.a <= 0.004) return;
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.globalAlpha *= pop.a; ctx.translate(x, y); ctx.scale(pop.s, pop.s); ctx.translate(-x, -y);
  bentoSurface(x - r, y - r, r * 2, r * 2, r * 0.46, 'hero', { c: o.c });
  bentoSheen(x - r, y - r, r * 2, r * 2, r * 0.46, o.sheen ?? mod(TT, 2.4) / 0.9);
  bentoGlyph(x, y, r * 0.5, { frac: o.frac });
  ctx.restore();
}
// the hero as a grid tile (any span): the gradient surface, the sheen, the mark sized to the tile. Returns the inner rect.
function bentoHeroTile(G, cell, o = {}) {
  const r = bentoTile(G, cell, { ...o, fill: 'hero' });
  bentoIn(r, () => {
    bentoSheen(r.ox, r.oy, r.ow, r.oh, r.r, o.sheen ?? mod(TT - (o.at ?? 0) - 0.9, 2.4) / 0.9);
    const cx = r.ox + r.ow / 2, cy = r.oy + r.oh / 2; SPARK_AT = toScreen(cx, cy);
    bentoGlyph(cx, cy, Math.min(r.ow, r.oh) * (o.glyph ?? 0.25), { frac: o.frac ?? (o.at == null ? 1 : EZ.io(seg(TT, o.at + 0.1, o.at + 0.6))) });
  });
  return r;
}

// ---------------------------------------------------------------------
//  captions and tags (screen space, after the camera, via DEFER). The caption is itself a small raised tile;
//  *a phrase* is set in the accent. Both fade as a bridge starts and wait until the bridge that opens the era has grown.
// ---------------------------------------------------------------------
function bentoLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.25)); }
  return 1;
}
function bentoArrive(at = 0.1) {
  let t = E0 + at;
  if (typeof BRIDGES !== 'undefined') for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) t = Math.max(t, r.tc + (r.d ?? 0.6) - 0.15);
  return t;
}
// o: { x, y (the tile's centre line), size, at (seconds into the era) }
function bentoCaptionNow(str, o, T) {
  const al = bentoLeaving(), size = o.size ?? 58, t0 = bentoArrive(o.at ?? 0.6); if (al <= 0.004 || TT < t0) return;
  const keep = BENTO_T; BENTO_T = T;
  const ws = str.split(/(\*[^*]+\*)/).filter((g) => g.trim()).flatMap((g) => (g[0] === '*' ? g.slice(1, -1).trim().split(/\s+/).map((w) => ({ w, hi: true })) : g.trim().split(/\s+/).map((w) => ({ w, hi: false }))));
  const sp = size * 0.26, wid = (d) => bentoTextW(d.w, size, 600, -0.02), tw = ws.reduce((s, d) => s + wid(d), 0) + sp * (ws.length - 1);
  const padX = 44, h = size * 2.0, w = tw + padX * 2, cx = o.x ?? CX, cy = o.y ?? 1432, pop = bentoPop(t0);
  ctx.save(); ctx.globalAlpha *= al * pop.a; ctx.translate(cx, cy); ctx.scale(pop.s, pop.s); ctx.translate(-cx, -cy);
  bentoSurface(cx - w / 2, cy - h / 2, w, h, Math.min(40, h / 2), T.name === 'dark' ? 'raised' : 'tile', {});
  let x = cx - tw / 2;
  ws.forEach((d, i) => { const wa = EZ.o2(seg(TT, t0 + 0.1 + i * 0.06, t0 + 0.32 + i * 0.06)); bentoText(d.w, x, cy + size * 0.35 + (1 - wa) * 14, size, d.hi ? bentoAccent() : T.ink, { weight: 600, track: -0.02, a: wa }); x += wid(d) + sp; });
  ctx.restore(); BENTO_T = keep;
}
function bentoTagNow(str, o, T) {
  const al = bentoLeaving(), t0 = bentoArrive(o.at ?? 0.1); if (al <= 0.004 || TT < t0) return;
  const keep = BENTO_T; BENTO_T = T;
  ctx.save(); ctx.globalAlpha *= al; bentoBadge(o.x ?? 60, o.y ?? 262, str, { size: o.size ?? 30, live: o.live ?? true, kind: o.kind, at: t0 }); ctx.restore();
  BENTO_T = keep;
}
const bentoCaption = (str, o = {}) => { const T = bentoT(), f = () => bentoCaptionNow(str, o, T); if (DEFER) DEFER.push(f); else f(); };
const bentoTag = (str, o = {}) => { const T = bentoT(), f = () => bentoTagNow(str, o, T); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md). A bridge is a tile: the old board is seen through one tile's
//  outline and closes onto it, the tile changes proportions on the bare ground, the new board opens out of it.
// =====================================================================
// the ground under a bridge at morph progress u: the old board's, then a quick glide (the middle half) to the new board's
const bentoBridgeGround = (o, u) => (o && typeof ERA_BG !== 'undefined' ? bentoMix(ERA_BG[o.eraA], ERA_BG[o.eraB], EZ.io(seg(u, 0.2, 0.7))) : null);
const STYLE = {
  name: 'bento',
  get paper() { return bentoDefault().ground; },                         // the bare ground a morph happens on (6-digit hex)
  backdrop(c, o) {                                                       // the ground with its dot lattice. In a bridge it does not fade to "paper":
    let g = c;                                                           // it stays the old board's ground, glides to the new one under the morphing tile, and stays there
    if (o && typeof ERA_BG !== 'undefined') g = o.phase === 'shrink' ? ERA_BG[o.eraA] : o.phase === 'grow' ? ERA_BG[o.eraB] : bentoBridgeGround(o, o.u);
    ctx.save(); screen(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); bentoDots(g); ctx.restore();
  },
  window(P, key, src, o = {}) {                                          // a board seen through a tile-shaped opening; the opening gains a tile's soft shadow and edge as it nears tile size
    const rim = o.phase === 'shrink' ? EZ.i2(o.u ?? 1) : o.phase === 'grow' ? 1 - EZ.o2(o.u ?? 0) : 1;
    ctx.save(); bentoPoly(P, true); ctx.lineJoin = 'round';
    for (const [w, a] of [[52, 0.014], [40, 0.018], [28, 0.024], [16, 0.03], [8, 0.036]]) { ctx.lineWidth = w; ctx.strokeStyle = `rgba(0,0,0,${(a * rim).toFixed(4)})`; ctx.stroke(); }
    ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); bentoPoly(P, true); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(140,140,150,${(0.32 * rim).toFixed(4)})`; ctx.stroke(); ctx.restore();
  },
  blob(P, c, key, u = 0, o) {                                            // the morphing tile: solid, in colour c, with a small swell mid-way
    const ce = bentoCen(P), k = 1 + 0.04 * Math.sin(Math.PI * clamp(u)), Q = P.map(([x, y]) => [ce[0] + (x - ce[0]) * k, ce[1] + (y - ce[1]) * k]), b = bbox(Q);
    const brand = bentoSat(c) > 0.3, mode = typeof BENTO_MORPH !== 'undefined' && BENTO_MORPH.glyph ? BENTO_MORPH.glyph : 'out';
    const g = !brand || mode === 'none' ? 0 : mode === 'both' ? 1 : mode === 'in' ? clamp(u * 2 - 1) : clamp(1 - u * 2), gr = !brand || mode === 'none' ? 0 : mode === 'both' ? 1 : mode === 'in' ? clamp(u) : clamp(1 - u);
    const keep = BENTO_T, lum = bentoLum(bentoBridgeGround(o, u) ?? STYLE.paper), sk = clamp(1 - lum * 4);
    BENTO_T = { ...(lum < 0.5 ? BENTO.dark : BENTO.light), shadow: [0, 0, 0, lerp(BENTO.light.shadow[3], BENTO.dark.shadow[3], sk)] };   // its shadow and edge belong to the ground it is on
    bentoSolid(Q, brand ? 'accent' : bentoHex(c), { c: bentoHex(c), on: brand, over: gr > 0 ? 'hero' : null, overA: gr });
    if (g > 0) bentoGlyph((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.25, { a: g });
    BENTO_T = keep;
  },
  hero(x, y, r, o = {}) { bentoHero(x, y, r * 0.9, { key: o.key, sheen: 0 }); },   // r = half the hero's size
  get heroColor() { return bentoAccent(); },
  heroPts(x, y, r) { return bentoHeroPts(x, y, r * 0.9); },
  post() { BENTO_T = null; },                                            // a clean screen: no grain, no vignette; the theme never carries to the next frame
  ones: true,                                                            // UI motion: on 1s, springs
};
