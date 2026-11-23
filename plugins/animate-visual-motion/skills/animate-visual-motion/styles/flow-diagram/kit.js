// =====================================================================
//  styles/flow-diagram/kit.js — an animated flowchart / system diagram on a modern diagramming canvas.
//  Graphite ground with an even dot grid; flat rounded nodes (box, pill, diamond, cylinder, doc, circle) with a
//  category colour band or tint, an icon chip, a step badge and a done tick; orthogonal edges with rounded elbows
//  that draw on and then get their arrowhead; label chips on edges; packets travelling the edges; dashed
//  swimlanes; sticky notes. ONE signal colour (hot orange) means "active right now": the active node's border and
//  pulse rings, the travelling packet and the hero (the packet come alive: a rounded token with two eyes).
//  Line widths are constant under camera zoom. Motion on 1s. Built on kit/core.js.
//  Needs from the piece head: W, H, FPS, CX (caption centre x). Optional `const FD_LIGHT = true` before the kit
//  (a src/options.js in the piece's "build" list) for the light canvas.
//  Conventions: nodes are placed by their CENTRE (x, y) with a size (w, h); groups by their top-left corner.
//  Every reveal takes an absolute start time t0 (cue it on a spoken word); omitted = already there.
// =====================================================================

// ---- palette (6-digit hex: the renderer's mixHex blends these)
const FD_LIGHTMODE = typeof FD_LIGHT !== 'undefined' && !!FD_LIGHT;
const FD = Object.assign(FD_LIGHTMODE
  ? { bg: '#f5f6f8', dot: '#d3d8e2', node: '#ffffff', node2: '#eef0f5', border: '#c3c9d6', edge: '#8a93a8', text: '#1a1f2b', muted: '#667085', shadow: '#5d6880', shadowA: 0.16 }
  : { bg: '#14171f', dot: '#262b38', node: '#1e2330', node2: '#2a3144', border: '#3a4256', edge: '#5d6884', text: '#e8ecf4', muted: '#8b94a8', shadow: '#07080c', shadowA: 0.42 },
{ blue: '#4c8dff', violet: '#9b7bff', green: '#3ecf8e', amber: '#f5b83d',   // node categories
  signal: '#ff7a45', signalD: '#d95f2e', eye: '#14171f' });               // THE signal: active now + the hero
const FD_SANS = '-apple-system, "SF Pro Display", "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif';
const FD_MONO = '"SF Mono", Menlo, Consolas, "Cascadia Mono", "Roboto Mono", "DejaVu Sans Mono", monospace';
const FD_R = 18;   // the corner radius of everything

// ---------------------------------------------------------------------
//  small helpers
// ---------------------------------------------------------------------
function fdZ() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }   // camera zoom
const fdHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const fdA = (h, a) => { const c = fdHex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const fdMix = (a, b, u) => { const x = fdHex(a), y = fdHex(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
// a state value -> 0..1. v: true | false | a start time | [from, to]. It switches on fast (two frames), so a node
// lights on the frame the packet arrives.
function fdOn(v) {
  if (v == null || v === false) return 0; if (v === true) return 1;
  const up = (t) => (TT < t ? 0 : clamp(0.45 + (TT - t) / 0.1));
  return Array.isArray(v) ? up(v[0]) * (1 - up(v[1])) : up(v);
}
const fdT0 = (v) => (Array.isArray(v) ? v[0] : typeof v === 'number' ? v : null);
const fdPop = (t0, k = 320, d = 25) => (t0 == null ? 1 : springEase(TT - t0, k, d));   // a pop with a small overshoot
const fdBlink = (key, period = 62) => mod(F + hash('fdb', key) % period, period) < 3;

function fdFont(size, weight = 600, mono = false) { ctx.font = `${weight} ${size}px ${mono ? FD_MONO : FD_SANS}`; if ('letterSpacing' in ctx) ctx.letterSpacing = mono ? '0px' : `${-(size * 0.012).toFixed(2)}px`; }
function fdTextW(str, size, weight = 600, mono = false) { ctx.save(); fdFont(size, weight, mono); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// one string. o: align, weight, mono, al. Returns the drawn width.
function fdText(str, x, y, size, color, o = {}) {
  ctx.save(); fdFont(size, o.weight ?? 600, o.mono); ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha *= o.al ?? 1; ctx.fillStyle = color; ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}
function fdRR(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fdPoly(P, closed) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }

// ---------------------------------------------------------------------
//  the ground: a flat canvas with an even dot grid. Dots sit in the world (they pan with the camera) but keep
//  their size under zoom; their alpha drifts in a slow diagonal wave (background life).
// ---------------------------------------------------------------------
function fdDots(o = {}) {
  const pitch = o.pitch ?? 48, z = fdZ(), r = (o.r ?? 3.3) / z, inv = ctx.getTransform().inverse();
  const a = inv.transformPoint(new DOMPoint(0, 0)), b = inv.transformPoint(new DOMPoint(W, H));
  const x0 = Math.floor(a.x / pitch) * pitch, y0 = Math.floor(a.y / pitch) * pitch;
  ctx.save(); ctx.fillStyle = o.color ?? FD.dot;
  for (let y = y0; y <= b.y + pitch; y += pitch) {
    ctx.globalAlpha = (o.al ?? 1) * (0.72 + 0.28 * Math.sin(TT * 1.3 + y * 0.006));
    ctx.beginPath(); for (let x = x0; x <= b.x + pitch; x += pitch) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); } ctx.fill();
  }
  ctx.restore();
}
function fdGround(o = {}) { fillAll(o.color ?? FD.bg); fdDots(o); }

// ---------------------------------------------------------------------
//  icons: 24-unit line icons drawn in code. fdIcon(name, cx, cy, size, color)
// ---------------------------------------------------------------------
const FD_ICONS = {
  gear(c) { c.arc(12, 12, 3.2, 0, TAU); c.moveTo(18.4, 12); c.arc(12, 12, 6.4, 0, TAU); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = Math.cos(a), y = Math.sin(a); c.moveTo(12 + x * 6.4, 12 + y * 6.4); c.lineTo(12 + x * 9.4, 12 + y * 9.4); } },
  user(c) { c.arc(12, 8.2, 3.7, 0, TAU); c.moveTo(4.8, 20); c.bezierCurveTo(4.8, 15.4, 8, 13.6, 12, 13.6); c.bezierCurveTo(16, 13.6, 19.2, 15.4, 19.2, 20); },
  database(c) { c.ellipse(12, 6.4, 7, 2.9, 0, 0, TAU); c.moveTo(5, 6.4); c.lineTo(5, 17.6); c.ellipse(12, 17.6, 7, 2.9, 0, Math.PI, 0, true); c.lineTo(19, 6.4); c.moveTo(19, 12); c.ellipse(12, 12, 7, 2.9, 0, 0, Math.PI); },
  mail(c) { c.roundRect ? c.roundRect(3.5, 6, 17, 12.5, 2) : c.rect(3.5, 6, 17, 12.5); c.moveTo(4.2, 7.6); c.lineTo(12, 13.4); c.lineTo(19.8, 7.6); },
  check(c) { c.moveTo(5, 12.6); c.lineTo(10, 17.4); c.lineTo(19, 7.2); },
  cross(c) { c.moveTo(6.2, 6.2); c.lineTo(17.8, 17.8); c.moveTo(17.8, 6.2); c.lineTo(6.2, 17.8); },
  clock(c) { c.arc(12, 12, 8.6, 0, TAU); c.moveTo(12, 7.2); c.lineTo(12, 12); c.lineTo(15.4, 14); },
  bolt(c) { c.moveTo(13.2, 3); c.lineTo(5.6, 13.4); c.lineTo(11, 13.4); c.lineTo(10, 21); c.lineTo(18.4, 10.2); c.lineTo(12.6, 10.2); c.closePath(); },
  cloud(c) { c.moveTo(7, 18.4); c.bezierCurveTo(2.2, 18.4, 2.2, 11.6, 7, 11.2); c.bezierCurveTo(7.4, 5.6, 15.6, 4.8, 17, 10); c.bezierCurveTo(21.8, 10, 22, 18.4, 17.4, 18.4); c.closePath(); },
  doc(c) { c.moveTo(6.5, 3.5); c.lineTo(14, 3.5); c.lineTo(18, 7.5); c.lineTo(18, 20.5); c.lineTo(6.5, 20.5); c.closePath(); c.moveTo(14, 3.5); c.lineTo(14, 7.5); c.lineTo(18, 7.5); c.moveTo(9.2, 12); c.lineTo(15.2, 12); c.moveTo(9.2, 15.6); c.lineTo(15.2, 15.6); },
  cart(c) { c.moveTo(2.8, 4.8); c.lineTo(5.4, 4.8); c.lineTo(8, 15); c.lineTo(18, 15); c.lineTo(20.2, 8); c.lineTo(6.3, 8); c.moveTo(11, 19); c.arc(9.6, 19, 1.4, 0, TAU); c.moveTo(18, 19); c.arc(16.6, 19, 1.4, 0, TAU); },
  card(c) { c.roundRect ? c.roundRect(3, 5.8, 18, 12.4, 2.4) : c.rect(3, 5.8, 18, 12.4); c.moveTo(3, 10); c.lineTo(21, 10); c.moveTo(6.4, 14.4); c.lineTo(10.4, 14.4); },
  truck(c) { c.rect(2.6, 6.6, 10.8, 9.6); c.moveTo(13.4, 9.8); c.lineTo(17.8, 9.8); c.lineTo(21.2, 13); c.lineTo(21.2, 16.2); c.lineTo(13.4, 16.2); c.moveTo(8.8, 18); c.arc(6.9, 18, 1.9, 0, TAU); c.moveTo(19.1, 18); c.arc(17.2, 18, 1.9, 0, TAU); },
  home(c) { c.moveTo(3.6, 11.6); c.lineTo(12, 4.2); c.lineTo(20.4, 11.6); c.moveTo(6, 10); c.lineTo(6, 19.6); c.lineTo(18, 19.6); c.lineTo(18, 10); c.moveTo(10.4, 19.6); c.lineTo(10.4, 14.4); c.lineTo(13.6, 14.4); c.lineTo(13.6, 19.6); },
  box(c) { c.rect(4, 8.2, 16, 11.8); c.moveTo(4, 8.2); c.lineTo(6.6, 4.4); c.lineTo(17.4, 4.4); c.lineTo(20, 8.2); c.moveTo(12, 4.4); c.lineTo(12, 12.4); },
  retry(c) { c.arc(12, 12, 7.4, -0.5, Math.PI * 1.45); c.moveTo(18.9, 4.6); c.lineTo(18.9, 9.2); c.lineTo(14.3, 9.2); },
};
function fdIcon(name, cx, cy, size, color, o = {}) {
  const f = FD_ICONS[name]; if (!f) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
  ctx.beginPath(); f(ctx); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = o.w ?? 2;
  if (name === 'bolt') { ctx.fillStyle = color; ctx.fill(); }
  ctx.strokeStyle = color; ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  node geometry: fdBox gives a node's box and anchor points without drawing it (lay the flow out first, draw
//  edges under nodes). fdStack lays out a column (or a row) with optional side branches.
// ---------------------------------------------------------------------
function fdBox(x, y, w, h, shape = 'box', id = '') {
  if (shape === 'circle') { const d = Math.min(w, h); w = d; h = d; }
  const b = { id, x, y, w, h, shape, top: [x, y - h / 2], right: [x + w / 2, y], bottom: [x, y + h / 2], left: [x - w / 2, y] };
  // corners for badges (tl = step number, tr = done tick), the hero's seat on the top edge
  if (shape === 'diamond') { b.tl = [x - w * 0.27, y - h * 0.27]; b.tr = [x + w * 0.27, y - h * 0.27]; b.seat = [x + w * 0.16, y - h * 0.34]; }
  else if (shape === 'circle') { const k = w / 2 * 0.72; b.tl = [x - k, y - k]; b.tr = [x + k, y - k]; b.seat = [x, y - h / 2]; }
  else { const ix = shape === 'pill' ? Math.min(h * 0.34, w * 0.2) : 14; b.tl = [x - w / 2 + ix, y - h / 2 + 4]; b.tr = [x + w / 2 - ix, y - h / 2 + 4]; b.seat = [x + w * (shape === 'pill' ? 0.13 : 0.2), y - h / 2]; }
  return b;
}
// items: [{ id, w, h, shape, gap (space before this node), side: -1 | 1 (a side branch on the row of the previous main node), dy / dx (nudge) }]
// o: { x, y (centre of the first node), gap (default 100), w, h (default node size 620 x 170), dir: 'down' | 'right', branch (side offset, default 420) }
// Returns the boxes in order, also by id: boxes.by.<id>.
function fdStack(items, o = {}) {
  const down = (o.dir ?? 'down') === 'down', out = [], by = {};
  let main = down ? (o.y ?? H * 0.3) : (o.x ?? W * 0.2), cross = down ? (o.x ?? CX) : (o.y ?? H / 2), prev = null, first = true;
  for (const it of items) {
    const w = it.w ?? o.w ?? 620, h = it.h ?? o.h ?? 170, size = down ? h : w;
    let m = main, c = cross;
    if (it.side) c = cross + it.side * (it.branch ?? o.branch ?? 420);
    else { if (!first) main = m = prev.m + prev.size / 2 + (it.gap ?? o.gap ?? 100) + size / 2; prev = { m, size }; first = false; }
    if (it.side && prev) m = prev.m;
    const bx = (down ? c : m) + (it.dx ?? 0), byy = (down ? m : c) + (it.dy ?? 0);
    const b = fdBox(bx, byy, w, h, it.shape ?? 'box', it.id ?? ''); out.push(b); if (it.id) by[it.id] = b;
  }
  out.by = by; return out;
}
const fdLayout = fdStack;
// the outline of a node shape as a canvas path, grown by g px (pulse rings, shadows)
function fdShapePath(shape, x, y, w, h, g = 0) {
  if (shape === 'pill') return fdRR(x - w / 2 - g, y - h / 2 - g, w + 2 * g, h + 2 * g, h / 2 + g);
  if (shape === 'circle') { ctx.beginPath(); ctx.arc(x, y, Math.min(w, h) / 2 + g, 0, TAU); return; }
  if (shape === 'diamond') {
    const a = w / 2 + g * 1.35, b = h / 2 + g * 1.35, r = 14; ctx.beginPath();
    ctx.moveTo(x - a / 2, y - b / 2); ctx.arcTo(x, y - b, x + a, y, r); ctx.arcTo(x + a, y, x, y + b, r); ctx.arcTo(x, y + b, x - a, y, r); ctx.arcTo(x - a, y, x, y - b, r); ctx.closePath(); return;
  }
  if (shape === 'cylinder') {
    const ry = Math.min(h * 0.17, 28), x0 = x - w / 2 - g, x1 = x + w / 2 + g, y0 = y - h / 2 - g + ry, y1 = y + h / 2 + g - ry; ctx.beginPath();
    ctx.ellipse(x, y0, w / 2 + g, ry, 0, Math.PI, 0); ctx.lineTo(x1, y1); ctx.ellipse(x, y1, w / 2 + g, ry, 0, 0, Math.PI); ctx.lineTo(x0, y0); ctx.closePath(); return;
  }
  if (shape === 'doc') {
    const x0 = x - w / 2 - g, x1 = x + w / 2 + g, y0 = y - h / 2 - g, y1 = y + h / 2 + g, r = FD_R + g, wv = Math.min(16, h * 0.12); ctx.beginPath();
    ctx.moveTo(x0 + r, y0); ctx.arcTo(x1, y0, x1, y1, r); ctx.lineTo(x1, y1 - wv);
    ctx.bezierCurveTo(lerp(x1, x0, 0.3), y1 - wv * 3, lerp(x1, x0, 0.6), y1 + wv * 1.6, x0, y1 - wv * 0.4); ctx.arcTo(x0, y0, x1, y0, r); ctx.closePath(); return;
  }
  return fdRR(x - w / 2 - g, y - h / 2 - g, w + 2 * g, h + 2 * g, FD_R + g);
}
// a node's outline as dense points (bridge shapes for kit/morph.js)
function fdShapePts(b, grow = 0) {
  const { x, y } = b, w = b.w + grow * 2, h = b.h + grow * 2;
  if (b.shape === 'circle') return ellipsePts(x, y, w / 2, w / 2, 0, 96);
  if (b.shape === 'diamond') return resample([[x, y - h / 2], [x + w / 2, y], [x, y + h / 2], [x - w / 2, y]], true, 8);
  return resample(rrectPts(x - w / 2, y - h / 2, w, h, b.shape === 'pill' ? h / 2 : FD_R + grow, 8), true, 8);
}
const fdCirclePts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
const fdPanelPts = (x, y, w, h, r = 40) => resample(rrectPts(x - w / 2, y - h / 2, w, h, r, 8), true, 8);

// ---------------------------------------------------------------------
//  fdNode(id, x, y, w, h, o)  or  fdNode(box, o)   ->  the box (anchors top / right / bottom / left, seat, tl, tr)
//  o: shape ('box' | 'pill' | 'diamond' | 'cylinder' | 'doc' | 'circle'), title, sub, color (category), icon,
//     t0 (pop-in time), active, done, dim (each: true | a time | [from, to]), step (a number badge), size (title px)
//  States: idle; active = signal border + two pulse rings + a small lift; done = green tick badge; dim = faded.
// ---------------------------------------------------------------------
function fdNode(id, x, y, w, h, o) {
  let b; if (id && typeof id === 'object') { b = id; o = x || {}; } else { o = o || {}; b = fdBox(x, y, w, h, o.shape, id); }
  if (o.t0 != null && TT < o.t0) return b;
  const z = fdZ(), px = (n) => n / z, sh = b.shape, cat = o.color ?? null;
  const act = fdOn(o.active), dim = fdOn(o.dim), pop = fdPop(o.t0), lift = -7 * act;
  ctx.save();
  ctx.globalAlpha *= clamp((o.t0 == null ? 1 : (TT - o.t0) / 0.1 + 0.3)) * lerp(1, o.dimTo ?? 0.62, dim);
  ctx.translate(b.x, b.y); ctx.scale(pop, pop); ctx.translate(-b.x, -b.y);
  // pulse rings (stay on the canvas while the node lifts)
  if (act > 0.01) for (let i = 0; i < 2; i++) {
    const ph = mod(TT * 0.85 + i * 0.5, 1);
    ctx.save(); ctx.globalAlpha *= act * 0.5 * (1 - ph) ** 1.6; fdShapePath(sh, b.x, b.y, b.w, b.h, 6 + ph * 30);
    ctx.lineWidth = px(3); ctx.strokeStyle = FD.signal; ctx.stroke(); ctx.restore();
  }
  // the soft flat shadow: two offset copies
  for (const [dy, g, a] of [[16 + 10 * act, 3, 0.4], [7 + 5 * act, 0, 1]]) { ctx.save(); ctx.globalAlpha *= FD.shadowA * a; fdShapePath(sh, b.x, b.y + dy, b.w, b.h, g); ctx.fillStyle = FD.shadow; ctx.fill(); ctx.restore(); }
  ctx.translate(0, lift);
  const banded = cat && (sh === 'box' || sh === 'doc');
  fdShapePath(sh, b.x, b.y, b.w, b.h); ctx.fillStyle = FD.node; ctx.fill();
  if (banded) { ctx.save(); ctx.clip(); ctx.fillStyle = cat; ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, 7); ctx.restore(); }
  if (sh === 'cylinder') { const ry = Math.min(b.h * 0.17, 28); ctx.save(); ctx.beginPath(); ctx.ellipse(b.x, b.y - b.h / 2 + ry, b.w / 2, ry, 0, 0, Math.PI); ctx.lineWidth = px(3); ctx.strokeStyle = cat ? fdMix(FD.border, cat, 0.6) : FD.border; ctx.stroke(); ctx.restore(); }
  fdShapePath(sh, b.x, b.y, b.w, b.h);
  const idle = cat && !banded ? fdMix(FD.border, cat, 0.7) : FD.border;
  ctx.lineWidth = px(lerp(3, 5, act)); ctx.lineJoin = 'round'; ctx.strokeStyle = act > 0 ? fdMix(idle.startsWith('#') ? idle : FD.border, FD.signal, act) : idle; ctx.stroke();
  // content: an icon chip on the left with title + sub beside it, or centred text
  const ts = o.size ?? 48, ss = o.subSize ?? 30, cy = b.y + (sh === 'cylinder' ? Math.min(b.h * 0.17, 28) * 0.6 : banded ? 3 : 0);
  const tint = cat ?? FD.muted;
  if (o.icon && sh !== 'diamond' && !(sh === 'circle' && !o.title)) {
    const cs = Math.min(84, b.h - 56), inset = sh === 'pill' ? Math.max(30, b.h * 0.24) : 30, cx0 = b.x - b.w / 2 + inset;
    fdRR(cx0, cy - cs / 2, cs, cs, 18); ctx.fillStyle = fdA(tint, FD_LIGHTMODE ? 0.14 : 0.17); ctx.fill();
    fdIcon(o.icon, cx0 + cs / 2, cy, cs * 0.6, tint);
    const tx = cx0 + cs + 24, room = b.x + b.w / 2 - 22 - tx, tf = o.title ? Math.min(ts, ts * room / fdTextW(o.title, ts)) : ts;   // a long title shrinks to fit
    if (o.title) fdText(o.title, tx, o.sub ? cy - 3 : cy + tf * 0.35, tf, FD.text);
    if (o.sub) fdText(o.sub, tx, cy + ss + 7, ss, FD.muted, { mono: true, weight: 500 });
  } else if (o.icon && !o.title) fdIcon(o.icon, b.x, cy, Math.min(b.w, b.h) * 0.46, tint);
  else {
    if (o.title) fdText(o.title, b.x, o.sub ? cy - 3 : cy + ts * 0.35, ts, FD.text, { align: 'center' });
    if (o.sub) fdText(o.sub, b.x, cy + ss + 7, ss, FD.muted, { mono: true, weight: 500, align: 'center' });
  }
  // badges: the step number (top left), the done tick (top right)
  if (o.step != null) {
    const [bx, by] = b.tl; ctx.beginPath(); ctx.arc(bx, by, 28, 0, TAU); ctx.fillStyle = act > 0.5 ? FD.signal : FD.node2; ctx.fill();
    ctx.lineWidth = px(3); ctx.strokeStyle = act > 0.5 ? FD.signal : FD.border; ctx.stroke();
    fdText(String(o.step), bx, by + 11, 31, act > 0.5 ? FD.eye : FD.text, { mono: true, weight: 700, align: 'center' });
  }
  const dn = fdOn(o.done);
  if (dn > 0) {
    const [bx, by] = b.tr, s = fdPop(fdT0(o.done), 420, 22);
    ctx.save(); ctx.translate(bx, by); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fillStyle = FD.green; ctx.fill(); ctx.lineWidth = px(4) / Math.max(s, 0.2); ctx.strokeStyle = FD.node; ctx.stroke();
    fdIcon('check', 0, 0, 34, FD.eye, { w: 3 }); ctx.restore();
  }
  ctx.restore();
  return b;
}

// ---------------------------------------------------------------------
//  edges. fdRoute(a, b, o) -> the path (dense points) from a to b; a / b are node boxes or [x, y] points.
//  o.route: 'elbow' (default: orthogonal, rounded corners) | 'straight' | 'curve'; o.from / o.to: the sides
//  ('top' | 'right' | 'bottom' | 'left'; picked from the direction when omitted); o.via: [[x, y], ...] corner points
//  for a hand-routed elbow (a loop back); o.r: corner radius (default 22); o.gap: space left before the target.
// ---------------------------------------------------------------------
const FD_DIR = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
function fdRoute(a, b, o = {}) {
  const pa = Array.isArray(a), pb = Array.isArray(b), ca = pa ? a : [a.x, a.y], cb = pb ? b : [b.x, b.y];
  const dx = cb[0] - ca[0], dy = cb[1] - ca[1];
  let sa = o.from, sb = o.to;
  if (!sa || !sb) {
    let fa, fb;
    if (Math.abs(dx) < 8 || (pa && pb && Math.abs(dy) >= Math.abs(dx))) { fa = dy > 0 ? 'bottom' : 'top'; fb = dy > 0 ? 'top' : 'bottom'; }
    else if (Math.abs(dy) < 8 || (pa && pb)) { fa = dx > 0 ? 'right' : 'left'; fb = dx > 0 ? 'left' : 'right'; }
    else { fa = dx > 0 ? 'right' : 'left'; fb = dy > 0 ? 'top' : 'bottom'; }   // a side branch: out sideways, in from above / below
    sa = sa || fa; sb = sb || fb;
  }
  const p = pa ? a : a[sa], q0 = pb ? b : b[sb], db = FD_DIR[sb], gap = o.gap ?? (pb ? 0 : 5);
  const q = [q0[0] + db[0] * gap, q0[1] + db[1] * gap], route = o.route ?? 'elbow';
  if (route === 'curve') {
    const da = FD_DIR[sa], k = Math.max(50, Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.45), P = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, m = 1 - t; P.push([m ** 3 * p[0] + 3 * m * m * t * (p[0] + da[0] * k) + 3 * m * t * t * (q[0] + db[0] * k) + t ** 3 * q[0], m ** 3 * p[1] + 3 * m * m * t * (p[1] + da[1] * k) + 3 * m * t * t * (q[1] + db[1] * k) + t ** 3 * q[1]]); }
    return P;
  }
  let C = [p];
  if (o.via) C.push(...o.via);
  else if (route === 'elbow') {
    const va = sa === 'top' || sa === 'bottom', vb = sb === 'top' || sb === 'bottom';
    if (va && vb) { if (Math.abs(p[0] - q[0]) > 1) { const my = o.mid ?? (p[1] + q[1]) / 2; C.push([p[0], my], [q[0], my]); } }
    else if (!va && !vb) { if (Math.abs(p[1] - q[1]) > 1) { const mx = o.mid ?? (p[0] + q[0]) / 2; C.push([mx, p[1]], [mx, q[1]]); } }
    else if (va) C.push([p[0], q[1]]); else C.push([q[0], p[1]]);
  }
  C.push(q);
  // round the corners
  const R = o.r ?? 22, P = [C[0]];
  for (let i = 1; i < C.length - 1; i++) {
    const A = C[i - 1], M = C[i], B2 = C[i + 1], la = dist(A, M), lb = dist(M, B2), r = Math.min(R, la / 2, lb / 2);
    const s = [M[0] + (A[0] - M[0]) / (la || 1) * r, M[1] + (A[1] - M[1]) / (la || 1) * r], e = [M[0] + (B2[0] - M[0]) / (lb || 1) * r, M[1] + (B2[1] - M[1]) / (lb || 1) * r];
    for (let k = 0; k <= 8; k++) { const t = k / 8, m = 1 - t; P.push([m * m * s[0] + 2 * m * t * M[0] + t * t * e[0], m * m * s[1] + 2 * m * t * M[1] + t * t * e[1]]); }
  }
  P.push(C[C.length - 1]);
  return P;
}
// fdPath utilities: a point, the heading and a stretch of a path by fraction
const fdPath = {
  at: (P, f) => pointAt(P, clamp(f)),
  angle(P, f) { const a = pointAt(P, clamp(f - 0.02)), b = pointAt(P, clamp(f + 0.02)); return Math.atan2(b[1] - a[1], b[0] - a[0]); },
  slice(P, f0, f1) {   // the stretch between two fractions
    const L = pathLen(P), a = L * clamp(f0), b = L * clamp(f1), out = []; let run = 0;
    for (let i = 1; i < P.length; i++) {
      const d = dist(P[i - 1], P[i]), s = run, e = run + d; run = e;
      if (e < a || s > b || d === 0) continue;
      const k0 = clamp((a - s) / d), k1 = clamp((b - s) / d);
      if (!out.length) out.push([lerp(P[i - 1][0], P[i][0], k0), lerp(P[i - 1][1], P[i][1], k0)]);
      out.push([lerp(P[i - 1][0], P[i][0], k1), lerp(P[i - 1][1], P[i][1], k1)]);
    }
    return out;
  },
  len: (P) => pathLen(P),
};
// fdEdge(a, b, o) -> the path (so packets can travel it). The line draws on from a to b over [t0, t0 + d], then
// the arrowhead lands. o: t0, d (default 0.35), route / from / to / via / mid / r (see fdRoute), label (a chip on
// the edge), labelAt (0..1, default 0.5), labelColor, dashed, march (px/s: the dashes move), color, active, dim,
// head (false = no arrowhead), w.
function fdEdge(a, b, o = {}) {
  const P = fdRoute(a, b, o), t0 = o.t0, d = o.d ?? 0.35;
  P.t0 = t0 ?? -1e9; P.t1 = (t0 ?? -1e9) + d;
  if (t0 != null && TT < t0) return P;
  const z = fdZ(), px = (n) => n / z, L = pathLen(P), u = t0 == null ? 1 : EZ.o3((TT - t0) / d);
  const act = fdOn(o.active), dim = fdOn(o.dim), col = act > 0 ? fdMix(o.color ?? FD.edge, FD.signal, act) : (o.color ?? FD.edge);
  const hl = o.head === false ? 0 : 26, hw = 13, landed = t0 == null ? 1 : fdPop(t0 + d * 0.9, 520, 26);
  ctx.save(); ctx.globalAlpha *= lerp(1, o.dimTo ?? 0.75, dim);
  const body = subPath(P, u * clamp(1 - hl * 0.75 / (L || 1)));
  ctx.save(); fdPoly(body); ctx.lineWidth = px((o.w ?? 5) + act); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col;
  if (o.dashed) { ctx.setLineDash([px(14), px(13)]); ctx.lineDashOffset = -(o.march ?? 0) * TT / z; }
  ctx.stroke(); ctx.restore();
  if (hl && landed > 0.01) {   // the arrowhead lands at the end
    const tip = P[P.length - 1], ang = fdPath.angle(P, 1);
    ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang); ctx.scale(landed, landed);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-hl, -hw); ctx.lineTo(-hl * 0.78, 0); ctx.lineTo(-hl, hw); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = px(3) / Math.max(landed, 0.2); ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
  }
  if (o.label) {   // the chip pops when the line passes it
    const lf = o.labelAt ?? 0.5, tl = t0 == null ? null : t0 + d * lf * 0.7, s = fdPop(tl, 380, 24);
    if (s > 0.01) {
      const [lx, ly] = pointAt(P, lf), tw = fdTextW(o.label, 31, 700, true), cw = tw + 40, ch = 54;
      ctx.save(); ctx.translate(lx, ly); ctx.scale(s, s);
      fdRR(-cw / 2, -ch / 2, cw, ch, ch / 2); ctx.fillStyle = FD.node; ctx.fill(); ctx.lineWidth = px(3) / Math.max(s, 0.2); ctx.strokeStyle = col; ctx.stroke();
      fdText(o.label, 0, 11, 31, o.labelColor ?? FD.text, { mono: true, weight: 700, align: 'center' }); ctx.restore();
    }
    P.label = pointAt(P, lf);
  }
  ctx.restore();
  return P;
}
// continuous marching dashes on an edge (background life on the path that is in use). o: t0, color, speed (px/s), al
function fdFlow(P, o = {}) {
  if (!P || P.length < 2) return; const t0 = o.t0 ?? P.t1 ?? -1e9; if (TT < t0) return;
  const z = fdZ(), px = (n) => n / z, L = pathLen(P);
  ctx.save(); ctx.globalAlpha *= (o.al ?? 0.75) * clamp((TT - t0) / 0.25);
  fdPoly(fdPath.slice(P, 0, 1 - 30 / (L || 1))); ctx.lineWidth = px(o.w ?? 5); ctx.lineCap = 'round';
  ctx.setLineDash([px(5), px(27)]); ctx.lineDashOffset = -(o.speed ?? 70) * TT / z;
  ctx.strokeStyle = o.color ?? (FD_LIGHTMODE ? FD.node : FD.text); ctx.stroke(); ctx.restore();
}
// a packet travelling a path over [t0, t0 + d], eased. o.kind: 'dot' (default, with a short tail) | 'mail' | 'doc';
// o.color, o.r, o.hold (keep it at the end). Returns { x, y, u, on, arrived }: light the target node on `arrived`.
function fdToken(P, t0, d, o = {}) {
  const raw = (TT - t0) / d, u = EZ.io(raw), [x, y] = pointAt(P, u), st = { x, y, u, on: raw >= 0 && raw <= 1, arrived: TT >= t0 + d - 1e-6 };
  if (raw < 0 || (raw > 1 && !o.hold)) return st;
  const z = fdZ(), px = (n) => n / z, col = o.color ?? FD.signal, r = o.r ?? 15, kind = o.kind ?? 'dot';
  const sp = Math.sin(clamp(raw) * Math.PI), s = raw < 0.12 ? raw / 0.12 : 1;
  ctx.save();
  for (let k = 6; k >= 1; k--) {   // the tail: shrinking dots behind it along the path
    const [tx, ty] = pointAt(P, u - k * 0.03 * sp); ctx.globalAlpha = 0.5 * (1 - k / 7) * sp;
    ctx.beginPath(); ctx.arc(tx, ty, r * (1 - k / 9), 0, TAU); ctx.fillStyle = col; ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.translate(x, y); ctx.scale(s, s);
  if (kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = px(3); ctx.strokeStyle = FD.bg; ctx.stroke(); }
  else {
    const cw = r * 3.6, ch = r * 2.7; fdRR(-cw / 2, -ch / 2, cw, ch, 9); ctx.fillStyle = FD.node; ctx.fill(); ctx.lineWidth = px(3); ctx.strokeStyle = col; ctx.stroke();
    fdIcon(kind === 'mail' ? 'mail' : 'doc', 0, 0, ch * 0.82, col);
  }
  ctx.restore(); return st;
}

// ---------------------------------------------------------------------
//  containers, notes, badges
// ---------------------------------------------------------------------
// a dashed swimlane / container with a label tab on its top edge. (x, y) = top-left. o: t0, color, fill (false = none)
function fdGroup(x, y, w, h, label, o = {}) {
  if (o.t0 != null && TT < o.t0) return; const z = fdZ(), px = (n) => n / z, a = o.t0 == null ? 1 : EZ.o3((TT - o.t0) / 0.35), col = o.color ?? FD.border;
  ctx.save(); ctx.globalAlpha *= a;
  fdRR(x, y, w, h, 28); if (o.fill !== false) { ctx.fillStyle = fdA(o.color ?? FD.text, FD_LIGHTMODE ? 0.035 : 0.022); ctx.fill(); }
  ctx.setLineDash([px(10), px(10)]); ctx.lineDashOffset = -(o.march ?? 0) * TT / z; ctx.lineWidth = px(2.5); ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]);
  if (label) {
    const tw = fdTextW(label, 30, 700, true), tx = x + 30;
    fdRR(tx - 14, y - 25, tw + 28, 50, 12); ctx.fillStyle = FD.bg; ctx.fill(); ctx.lineWidth = px(2.5); ctx.strokeStyle = col; ctx.stroke();
    fdText(label, tx, y + 11, 30, o.labelColor ?? FD.muted, { mono: true, weight: 700 });
  }
  ctx.restore();
}
// an annotation chip with a thin dotted leader to a point. (x, y) = the chip's centre. o: to: [x, y], t0, color
function fdNote(x, y, text, o = {}) {
  if (o.t0 != null && TT < o.t0) return; const z = fdZ(), px = (n) => n / z, s = fdPop(o.t0, 300, 24), col = o.color ?? FD.amber;
  const tw = fdTextW(text, 31, 500), cw = tw + 46, ch = 60;
  ctx.save();
  if (o.to) {
    const u = o.t0 == null ? 1 : EZ.o3((TT - o.t0 - 0.1) / 0.3), sx = clamp(o.to[0], x - cw / 2, x + cw / 2), sy = clamp(o.to[1], y - ch / 2, y + ch / 2);
    const ex = lerp(sx, o.to[0], u), ey = lerp(sy, o.to[1], u);
    ctx.save(); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.setLineDash([px(2), px(8)]); ctx.lineCap = 'round'; ctx.lineWidth = px(3); ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
    if (u > 0.95) { ctx.beginPath(); ctx.arc(o.to[0], o.to[1], 7, 0, TAU); ctx.fillStyle = FD.bg; ctx.fill(); ctx.lineWidth = px(3); ctx.strokeStyle = col; ctx.stroke(); }
  }
  ctx.translate(x, y); ctx.scale(s, s);
  fdRR(-cw / 2, -ch / 2, cw, ch, 14); ctx.fillStyle = FD.node2; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(-cw / 2, -ch / 2, 7, ch); ctx.restore();
  fdText(text, 3, 11, 31, FD.text, { weight: 500, align: 'center' });
  ctx.restore();
}
// a small pill badge centred on (x, y). o: t0, color (fill), textColor
function fdBadge(x, y, text, o = {}) {
  if (o.t0 != null && TT < o.t0) return; const s = fdPop(o.t0, 380, 22), tw = fdTextW(text, 31, 700, true), cw = tw + 40, ch = 54;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  fdRR(-cw / 2, -ch / 2, cw, ch, ch / 2); ctx.fillStyle = o.color ?? FD.node2; ctx.fill();
  fdText(text, 0, 11, 31, o.textColor ?? (o.color ? FD.eye : FD.text), { mono: true, weight: 700, align: 'center' });
  ctx.restore();
}
// a ring that bursts once from a point (a step completed). o: color, r
function fdPing(x, y, t0, o = {}) {
  const u = (TT - t0) / (o.d ?? 0.6); if (u < 0 || u > 1) return; const z = fdZ();
  ctx.save(); for (let i = 0; i < 2; i++) { const v = clamp(u * 1.25 - i * 0.25); if (v <= 0) continue; ctx.globalAlpha = (1 - v) ** 1.5; ctx.beginPath(); ctx.arc(x, y, (o.r ?? 90) * EZ.o3(v), 0, TAU); ctx.lineWidth = (5 - 2 * i) / z; ctx.strokeStyle = o.color ?? FD.green; ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: the travelling packet come alive. A signal-orange rounded token with two eyes. (x, y) = its centre,
//  r = half its size. o: key, squash (0..1 on landing, negative = stretch in the air), look (-1..1), lookY,
//  mood ('idle' | 'wow' | 'happy'), trail ([[x, y], ...] older positions), idle (false = no bob), color
// ---------------------------------------------------------------------
function fdHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', sq = o.squash ?? 0, z = fdZ();
  if (o.trail) o.trail.forEach(([tx, ty], i) => { const k = 1 - (i + 1) / (o.trail.length + 1); ctx.save(); ctx.globalAlpha = 0.42 * k; ctx.beginPath(); ctx.arc(tx, ty, r * 0.55 * k, 0, TAU); ctx.fillStyle = FD.signal; ctx.fill(); ctx.restore(); });
  if (o.idle !== false) y += Math.sin(TT * TAU * 0.8 + hash('fdh', key) % 7) * r * 0.045;
  SPARK_AT = toScreen(x, y);
  const sx = 1 + sq * 0.26, sy = 1 - sq * 0.24;
  ctx.save(); ctx.translate(x, y + r * (1 - sy)); ctx.scale(sx, sy);
  fdRR(-r, -r, r * 2, r * 2, r * 0.62); ctx.fillStyle = o.color ?? FD.signal; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = FD.signalD; ctx.globalAlpha = 0.55; ctx.fillRect(-r, r * 0.62, r * 2, r); ctx.restore();   // a flat darker foot
  fdRR(-r, -r, r * 2, r * 2, r * 0.62); ctx.lineWidth = 3.5 / z; ctx.strokeStyle = FD.bg; ctx.stroke();                  // a cut-out rim, so it reads over lines
  if (r > 8) {
    const blink = fdBlink(key), lk = (o.look ?? 0) * r * 0.14, ly = -r * 0.1 + (o.lookY ?? 0) * r * 0.12, mood = o.mood ?? 'idle';
    ctx.fillStyle = FD.eye; ctx.strokeStyle = FD.eye; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const ex = s * r * 0.36 + lk; ctx.beginPath();
      if (mood === 'happy') { ctx.lineWidth = r * 0.13; ctx.arc(ex, ly + r * 0.08, r * 0.17, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); }
      else if (blink) { ctx.rect(ex - r * 0.16, ly - r * 0.03, r * 0.32, r * 0.07); ctx.fill(); }
      else { ctx.ellipse(ex, ly, r * (mood === 'wow' ? 0.16 : 0.125), r * (mood === 'wow' ? 0.22 : 0.19), 0, 0, TAU); ctx.fill(); }
    }
    if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(lk, ly + r * 0.46, r * 0.1, r * 0.12, 0, 0, TAU); ctx.fill(); }
    if (mood === 'happy') { ctx.beginPath(); ctx.lineWidth = r * 0.11; ctx.arc(lk, ly + r * 0.3, r * 0.2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  }
  ctx.restore();
}
// where the hero sits on a node: on its top edge (box.seat), r above it
const fdSeat = (b, r) => [b.seat[0], b.seat[1] - r * 0.96];
// The hero walks the flow. legs: [{ from: [x, y], path, to: [x, y], t0, d }] in time order (from / to = fdSeat
// points, path = the edge between). Each leg: a hop off the node onto the edge, a ride along it, a hop up onto the
// next node, arriving at t0 + d with a landing squash. Returns { x, y, squash, look, lookY, moving, trail, leg }.
function fdWalk(legs, o = {}) {
  const pos = (t) => {
    let k = 0; for (let i = 0; i < legs.length; i++) if (t >= legs[i].t0) k = i;
    const g = legs[k], raw = (t - g.t0) / g.d;
    if (raw <= 0) return { x: g.from[0], y: g.from[1], squash: t > g.t0 - 0.1 ? (1 - (g.t0 - t) / 0.1) * 0.45 : 0, moving: false, leg: k, look: 0, lookY: 0.6 };
    if (raw >= 1) { const dt = t - g.t0 - g.d; return { x: g.to[0], y: g.to[1], squash: Math.max(0, Math.exp(-dt * 13) * Math.cos(dt * 28)) * 0.9, moving: false, leg: k, look: 0, lookY: 0 }; }
    const h = o.hop ?? 0.3, f0 = 0.12, f1 = 0.86, a = pointAt(g.path, f0), b = pointAt(g.path, f1);
    if (raw < h) { const u = raw / h; return { x: lerp(g.from[0], a[0], EZ.io(u)), y: lerp(g.from[1], a[1], u * u) - Math.sin(u * Math.PI) * 26, squash: -0.25 * Math.sin(u * Math.PI), moving: true, leg: k, look: Math.sign(a[0] - g.from[0]) * 0.6, lookY: 0.8 }; }
    if (raw > 1 - h) { const u = (raw - (1 - h)) / h; return { x: lerp(b[0], g.to[0], EZ.io(u)), y: lerp(b[1], g.to[1], 1 - (1 - u) ** 2) - Math.sin(u * Math.PI) * 34, squash: -0.25 * Math.sin(u * Math.PI), moving: true, leg: k, look: Math.sign(g.to[0] - b[0]) * 0.6, lookY: 0.3 }; }
    const u = EZ.io((raw - h) / (1 - 2 * h)), p = pointAt(g.path, lerp(f0, f1, u)), ang = fdPath.angle(g.path, lerp(f0, f1, u));
    return { x: p[0], y: p[1], squash: -0.12, moving: true, leg: k, look: Math.cos(ang) * 0.8, lookY: Math.sin(ang) * 0.9 };
  };
  const st = pos(TT); st.trail = [];
  if (st.moving) for (let i = 1; i <= 4; i++) { const q = pos(TT - i * 0.028); if (q.moving) st.trail.push([q.x, q.y]); }
  return st;
}

// ---------------------------------------------------------------------
//  captions, titles and the step row (through DEFER: screen size, after the camera). All of them leave in the first
//  0.3s of a bridge and stay hidden until it is over; in the era that opens out of a bridge they enter when it ends.
// ---------------------------------------------------------------------
function fdLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d - 1e-6) return TT < r.tc ? 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)) : 0; }
  return 1;
}
function fdEraIn() {
  if (typeof BRIDGES === 'undefined') return -1e9;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) return r.tc + (r.d ?? 0.6);
  return -1e9;
}
const fdDefer = (f) => { if (DEFER) DEFER.push(f); else f(); };
// kicker (mono caps, muted, with a small category square) over a semibold headline, top left of the safe area.
// o: x, y (the headline's baseline), at (seconds after the era starts), size, color (the square)
function fdTitle(kicker, headline, o = {}) {
  fdDefer(() => {
    const al = fdLeaving(); if (al <= 0.001) return; const t0 = Math.max(E0 + (o.at ?? 0.1), fdEraIn()); if (TT <= t0) return;
    const x = o.x ?? W * 0.074, y = o.y ?? 372, size = o.size ?? 58, u = EZ.o3((TT - t0) / 0.35), u2 = EZ.o3((TT - t0 - 0.08) / 0.35);
    ctx.save(); ctx.globalAlpha = al;
    if (kicker) { ctx.save(); ctx.globalAlpha *= u; fdRR(x, y - size - 34 + (1 - u) * 14, 20, 20, 5); ctx.fillStyle = o.color ?? FD.blue; ctx.fill(); fdText(kicker, x + 34, y - size - 13 + (1 - u) * 14, 30, FD.muted, { mono: true, weight: 700 }); ctx.restore(); }
    if (headline && u2 > 0) fdText(headline, x, y + (1 - u2) * 18, size, FD.text, { weight: 700, al: u2 });
    ctx.restore();
  });
}
// 'text with a *keyword*' on a node-style plate near the bottom of the safe area; the keyword is in the signal
// colour on a subtle pill. '\n' breaks lines. o: y (last baseline), size, at, x, maxW, plate (false = bare text)
function fdCaption(str, o = {}) {
  fdDefer(() => {
    const al = fdLeaving(); if (al <= 0.001) return; const t0 = Math.max(E0 + (o.at ?? 0.4), fdEraIn()); if (TT <= t0) return;
    const lines = str.split('\n'), yLast = o.y ?? 1440, cx = o.x ?? CX, maxW = o.maxW ?? W * 0.78, u = fdPop(t0, 260, 24), a = clamp((TT - t0) / 0.15);
    let size = o.size ?? 54; const pad = (s) => s * 0.2;
    const measure = (s) => lines.map((ln) => ln.split(/(\*[^*]+\*)/).filter((g) => g.length).map((g) => { const k = g[0] === '*', t = k ? g.slice(1, -1) : g; return { k, t, w: fdTextW(t, s, k ? 700 : 600) + (k ? pad(s) * 2 : 0) }; }));
    let rows = measure(size), widest = Math.max(...rows.map((r) => r.reduce((q, g) => q + g.w, 0)));
    if (widest > maxW) { size = Math.max(50, size * maxW / widest); rows = measure(size); widest = Math.max(...rows.map((r) => r.reduce((q, g) => q + g.w, 0))); }
    const lh = size * 1.3, top = yLast - (lines.length - 1) * lh - size * 0.92, pw = widest + 72, ph = (lines.length - 1) * lh + size * 1.42 + 20, py = top - 22;
    ctx.save(); ctx.globalAlpha = al * a; ctx.translate(cx, py + ph / 2 + (1 - u) * 26); ctx.scale(lerp(0.94, 1, u), lerp(0.94, 1, u)); ctx.translate(-cx, -(py + ph / 2));
    if (o.plate !== false) {
      ctx.save(); ctx.globalAlpha *= FD.shadowA; fdRR(cx - pw / 2, py + 8, pw, ph, 26); ctx.fillStyle = FD.shadow; ctx.fill(); ctx.restore();
      fdRR(cx - pw / 2, py, pw, ph, 26); ctx.fillStyle = FD.node; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = FD.border; ctx.stroke();
    }
    rows.forEach((row, li) => {
      const yy = yLast - (lines.length - 1 - li) * lh; let xx = cx - row.reduce((q, g) => q + g.w, 0) / 2;
      for (const g of row) {
        if (g.k) { const k = clamp((TT - t0 - 0.2) / 0.2); ctx.save(); ctx.globalAlpha *= k; fdRR(xx, yy - size * 0.95, g.w, size * 1.3, 14); ctx.fillStyle = fdA(FD.signal, 0.16); ctx.fill(); ctx.restore(); fdText(g.t, xx + pad(size), yy, size, fdMix(FD.text, FD.signal, k), { weight: 700 }); }
        else fdText(g.t, xx, yy, size, FD.text);
        xx += g.w;
      }
    });
    ctx.restore();
  });
}
// a row of step dots (top right of the safe area): done = green, current = signal with a pulse, to come = hollow.
// steps: a count; current: 1-based (a piece passes the step that is active now). o: x (right end), y, label (false = no "2/5")
function fdProgress(steps, current, o = {}) {
  fdDefer(() => {
    const al = fdLeaving(); if (al <= 0.001) return; const t0 = Math.max(E0 + (o.at ?? 0.1), fdEraIn()); if (TT <= t0) return;
    const n = steps, x1 = o.x ?? W * 0.87, y = o.y ?? 290, gap = 40, r = 9, x0 = x1 - (n - 1) * gap - r;
    ctx.save(); ctx.globalAlpha = al * clamp((TT - t0) / 0.25);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - r, y); ctx.lineWidth = 3; ctx.strokeStyle = FD.border; ctx.stroke();
    for (let i = 0; i < n; i++) {
      const x = x0 + i * gap, st = i + 1 < current ? 'done' : i + 1 === current ? 'now' : 'todo';
      if (st === 'now') { const ph = mod(TT * 0.85, 1); ctx.save(); ctx.globalAlpha *= 0.5 * (1 - ph); ctx.beginPath(); ctx.arc(x, y, r + 3 + ph * 12, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = FD.signal; ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.arc(x, y, st === 'now' ? r + 2 : r, 0, TAU); ctx.fillStyle = st === 'done' ? FD.green : st === 'now' ? FD.signal : FD.bg; ctx.fill();
      if (st === 'todo') { ctx.lineWidth = 3; ctx.strokeStyle = FD.border; ctx.stroke(); }
    }
    if (o.label !== false) fdText(`${Math.min(current, n)}/${n}`, x0 - r - 18, y + 11, 30, FD.muted, { mono: true, weight: 700, align: 'right' });
    ctx.restore();
  });
}

// =====================================================================
//  STYLE — the renderer's hooks
// =====================================================================
const STYLE = {
  name: 'flow-diagram',
  paper: FD.bg,
  // the canvas with its dots, always (both eras sit on the same canvas, so the morph happens on the diagram's ground)
  backdrop() { fillAll(FD.bg); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); fdDots(); ctx.restore(); },
  // the era seen through outline P: a hard mask with a node-style border (flat shadow under it, signal-colour rim)
  window(P, key, src, o = {}) {
    ctx.save(); ctx.globalAlpha = FD.shadowA; fdPoly(P.map(([x, y]) => [x, y + 12]), true); ctx.fillStyle = FD.shadow; ctx.fill(); ctx.restore();
    ctx.save(); fdPoly(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); fdPoly(P, true); ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = o.c && o.c[0] === '#' ? o.c : FD.signal; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: a flat token with a darker inner rim and the hero's eyes (the packet is what changes shape)
  blob(P, c, key, u) {
    const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length, bb = bbox(P), r = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2;
    ctx.save(); ctx.globalAlpha = FD.shadowA; fdPoly(P.map(([x, y]) => [x, y + 12]), true); ctx.fillStyle = FD.shadow; ctx.fill(); ctx.restore();
    ctx.save(); fdPoly(P, true); ctx.fillStyle = c; ctx.fill(); ctx.clip(); ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.fillStyle = FD.eye;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * r * 0.3, cy - r * 0.06, r * 0.12, r * 0.18, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  },
  hero(x, y, r, o = {}) { fdHero(x, y, r * 0.7, { key: o.key, mood: o.mood }); },
  heroColor: FD.signal,
  heroPts(x, y, r) { return resample(rrectPts(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4, r * 0.43, 8), true, 4); },
  post() {},
  ones: true,
};
