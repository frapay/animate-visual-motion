// =====================================================================
//  styles/glass/kit.js — GLASS: glassmorphism UI over an aurora gradient mesh.
//  A dark-to-vivid backdrop of large, slowly drifting soft colour fields (violet, blue, teal, pink), and on top
//  frosted-glass panels: rounded rectangles that blur what is behind them, a translucent white fill, a bright
//  top-left edge, a soft drop shadow and a faint inner sheen. Panels hold simple UI: a stat, a chart, toggles,
//  an avatar, a progress ring, an icon. White system-sans type. Motion on 1s, springs, a slow parallax sway.
//  Built on kit/core.js. Helpers are prefixed gl…; the palette is GL. Needs from the piece head: CX.
//
//  The frost is real but cheap: the pixels behind a panel are copied down a chain of half-size scratch canvases
//  (1/2, 1/4, 1/8, 1/16) and drawn back up, clipped to the panel. No ctx.filter, no shadowBlur.
// =====================================================================
const GL = {
  ground: '#0b0a26', deep: '#070617', mid: '#17124a',
  violet: '#7c4dff', blue: '#3d7dff', teal: '#1fd6c4', pink: '#ff5fa2',
  mint: '#46e6b0', sun: '#ffc24d', sunD: '#ee7f2a', rose: '#ff7a90',
  white: '#ffffff', inkD: '#cfd0f2', eye: '#1b1442',
};
GL.paper = GL.ground;
const GL_SANS = 'system-ui, -apple-system, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "DejaVu Sans", sans-serif';

const glZoom = () => Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;
function glRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const glA = (c, a) => { const [r, g, b] = glRGB(c); return `rgba(${r},${g},${b},${clamp(a)})`; };
const glMix = (a, b, u) => { const x = glRGB(a), y = glRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
function glPath(P, closed) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }
function glRRectPts(x, y, w, h, r) { return rrectPts(x, y, w, h, r, 10); }
function glCirclePts(x, y, r, n = 72) { return ellipsePts(x, y, r, r, 0, n); }
function glCentroid(P) { return P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]); }
const GL_SCR = {};
function glScratch(name, w, h) { let c = GL_SCR[name]; if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; GL_SCR[name] = c; } return c; }
// the slow sway every layer shares, scaled by its depth (negative = far, moves the other way): the parallax
function glSway(depth = 1) { return [Math.sin(TT * 0.9) * 16 * depth, Math.cos(TT * 0.7 + 0.6) * 11 * depth]; }

// ---------------------------------------------------------------------
//  the aurora: a dark base + soft colour fields that drift, drawn at quarter size and scaled up (always in
//  screen space, following the camera only a little). o: { key, cols, n, speed, dim 0..1, par, top, mid, bottom }
// ---------------------------------------------------------------------
function glAurora(o = {}) {
  const key = o.key ?? 'aurora', cols = o.cols ?? [GL.violet, GL.blue, GL.pink, GL.teal], n = o.n ?? 6, sp = o.speed ?? 1;
  const sw = Math.ceil(W / 4), sh = Math.ceil(H / 4), cv = glScratch('aur', sw, sh), g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const bg = g.createLinearGradient(0, 0, sw * 0.35, sh); bg.addColorStop(0, o.top ?? GL.deep); bg.addColorStop(0.5, o.mid ?? GL.mid); bg.addColorStop(1, o.bottom ?? GL.ground);
  g.fillStyle = bg; g.fillRect(0, 0, sw, sh);
  g.globalCompositeOperation = 'screen';
  const R = RNG('glaur', key);
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length], bx = ((i % 2 ? 0.76 : 0.24) + R.n(0.16)) * sw, by = ((i + 0.5) / n + R.n(0.05)) * sh;
    const rad = R.r(0.62, 0.95) * sw, ph = R.r(0, TAU), f = R.r(0.5, 0.9) * sp, sx = R.r(1.0, 1.5), rot = R.r(-0.7, 0.7), al = R.r(0.62, 0.86);
    const x = bx + Math.sin(TT * f + ph) * sw * 0.2, y = by + Math.cos(TT * f * 0.8 + ph * 1.3) * sh * 0.07;
    g.save(); g.translate(x, y); g.rotate(rot + Math.sin(TT * f * 0.5 + ph) * 0.25); g.scale(sx, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad); gr.addColorStop(0, glA(c, al)); gr.addColorStop(0.45, glA(c, al * 0.42)); gr.addColorStop(1, glA(c, 0));
    g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2); g.restore();
  }
  g.globalCompositeOperation = 'source-over';
  if (o.dim) { g.fillStyle = glA(GL.deep, o.dim); g.fillRect(0, 0, sw, sh); }
  const k = 1.07 + (glZoom() - 1) * (o.par ?? 0.3), [dx, dy] = glSway(-0.7);
  ctx.save(); screen(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cv, W / 2 - W * k / 2 + dx, H / 2 - H * k / 2 + dy, W * k, H * k);
  ctx.restore();
}
// soft out-of-focus light discs drifting up (world coords, behind the panels). o: { cols, a, rMin, rMax, depth }
function glBokeh(key, n = 9, o = {}) {
  const cols = o.cols ?? [GL.white, GL.teal, GL.pink, GL.blue], [dx, dy] = glSway(o.depth ?? -0.3);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const R = RNG('glbok', key, i), r = R.r(o.rMin ?? 34, o.rMax ?? 120), x0 = R.r(0, W), y0 = R.r(0, H), v = R.r(14, 44), ph = R.r(0, TAU), c = R.pick(cols);
    const y = mod(y0 - TT * v, H + 2 * r) - r + dy, x = x0 + Math.sin(TT * 0.6 + ph) * 26 + dx;
    const a = (o.a ?? 0.2) * (0.6 + 0.4 * Math.sin(TT * 1.1 + ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, glA(c, a * 0.5)); g.addColorStop(0.78, glA(c, a * 0.62)); g.addColorStop(0.93, glA(c, a)); g.addColorStop(1, glA(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// a four-point glint
function glGlint(x, y, s, a = 1, c = GL.white) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill(); ctx.restore();
}
// tiny glints that twinkle in place. o: { box: [x0, y0, x1, y1], s, depth }
function glGlints(key, n = 10, o = {}) {
  const [bx0, by0, bx1, by1] = o.box ?? [40, 220, W - 40, 1560], [dx, dy] = glSway(o.depth ?? -0.15);
  for (let i = 0; i < n; i++) {
    const R = RNG('glgli', key, i), x = R.r(bx0, bx1), y = R.r(by0, by1), s = R.r(0.6, 1.3) * (o.s ?? 13), f = R.r(1.4, 2.8), ph = R.r(0, TAU);
    glGlint(x + dx, y + dy, s, Math.max(0, Math.sin(TT * f + ph)) ** 3 * 0.9);
  }
}

// ---------------------------------------------------------------------
//  frost: blur what is already drawn inside the screen box bb (pixels) and draw it back into the current clip.
//  Down four half-size steps, up two: a wide soft blur for the cost of a few small drawImage calls.
// ---------------------------------------------------------------------
function glFrost(bb) {
  const pad = 48, x0 = Math.max(0, Math.floor((bb.x0 - pad) / 16) * 16), y0 = Math.max(0, Math.floor((bb.y0 - pad) / 16) * 16);
  const x1 = Math.min(W, Math.ceil((bb.x1 + pad) / 16) * 16), y1 = Math.min(H, Math.ceil((bb.y1 + pad) / 16) * 16), w = x1 - x0, h = y1 - y0;
  if (w < 16 || h < 16) return;
  let src = ctx.canvas, sx = x0, sy = y0, sw = w, sh = h;
  for (let l = 1; l <= 4; l++) {
    const cv = glScratch('fr' + l, Math.ceil(W / 2 ** l) + 2, Math.ceil(H / 2 ** l) + 2), g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true;
    g.drawImage(src, sx, sy, sw, sh, 0, 0, sw / 2, sh / 2);
    src = cv; sx = 0; sy = 0; sw /= 2; sh /= 2;
  }
  const up = glScratch('frU', Math.ceil(W / 4) + 2, Math.ceil(H / 4) + 2), g = up.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true;
  g.drawImage(src, 0, 0, sw, sh, 0, 0, w / 4, h / 4);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(up, 0, 0, w / 4, h / 4, x0, y0, w, h);
  ctx.restore();
}
// ---------------------------------------------------------------------
//  glass: any closed outline P as a frosted pane. o: { tint (colour), a (fill strength, 1), dark (0..1 extra dark
//  tint, for captions), frost (true), shadow (true), shadowD (drop, px), edge (px), sheen (true) }
// ---------------------------------------------------------------------
function glGlass(P, o = {}) {
  if (ctx.globalAlpha <= 0.004 || P.length < 3) return;
  const z = glZoom(), b = bbox(P), w = b.x1 - b.x0, h = b.y1 - b.y0, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const tint = o.tint ?? GL.white, k = o.a ?? 1;
  if (o.shadow !== false) {   // a soft drop shadow: ten growing faint layers, dropped down
    const sd = o.shadowD ?? 20; ctx.save(); ctx.fillStyle = glA(GL.deep, 0.03);
    for (let i = 0; i < 10; i++) { const kx = 1 + i * 7 / w, ky = 1 + i * 7 / h; glPath(P.map(([x, y]) => [cx + (x - cx) * kx, cy + (y - cy) * ky + sd]), true); ctx.fill(); }
    ctx.restore();
  }
  ctx.save(); glPath(P, true); ctx.clip();
  if (o.frost !== false) {
    const q = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([x, y]) => toScreen(x, y));
    glFrost(bbox(q));
  }
  const lg = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1); lg.addColorStop(0, glA(tint, 0.27 * k)); lg.addColorStop(0.5, glA(tint, 0.13 * k)); lg.addColorStop(1, glA(tint, 0.08 * k));
  ctx.fillStyle = lg; ctx.fillRect(b.x0, b.y0, w, h);
  if (o.dark) { ctx.fillStyle = glA(GL.deep, o.dark); ctx.fillRect(b.x0, b.y0, w, h); }
  if (o.sheen !== false) {   // the inner sheen: a glow in the top-left corner + a faint diagonal band
    const R0 = Math.max(w, h) * 0.8, rg = ctx.createRadialGradient(b.x0 + w * 0.08, b.y0, 0, b.x0 + w * 0.08, b.y0, R0); rg.addColorStop(0, 'rgba(255,255,255,0.17)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(b.x0, b.y0, w, h);
    const d = (w + h) * 0.5, sg = ctx.createLinearGradient(b.x0, b.y0, b.x0 + d, b.y0 + d); sg.addColorStop(0.3, 'rgba(255,255,255,0)'); sg.addColorStop(0.42, 'rgba(255,255,255,0.075)'); sg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(b.x0, b.y0, w, h);
  }
  ctx.restore();
  // the edge: bright at the top-left, nearly gone in the middle, a lesser light at the bottom-right
  ctx.save(); glPath(P, true); ctx.lineJoin = 'round'; ctx.lineWidth = (o.edge ?? 2.4) / z;
  const eg = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1); eg.addColorStop(0, 'rgba(255,255,255,0.92)'); eg.addColorStop(0.38, 'rgba(255,255,255,0.26)'); eg.addColorStop(0.7, 'rgba(255,255,255,0.1)'); eg.addColorStop(1, 'rgba(255,255,255,0.45)');
  ctx.strokeStyle = eg; ctx.stroke(); ctx.restore();
}
// a rounded glass panel. o: glGlass options + { r }
function glPanel(x, y, w, h, o = {}) { glGlass(glRRectPts(x, y, w, h, o.r ?? 44), o); }
// where a floating card is now: o: { t0 (float-in time; absent = already there), key, depth (parallax 0..1.5), rise, spring }
function glCardPose(x, y, w, h, o = {}) {
  const t0 = o.t0, depth = o.depth ?? 0.6, ph = RNG('glcard', o.key ?? 'card').r(0, TAU), cx = x + w / 2, cy = y + h / 2;
  let a = 1, s = 1, rise = 0;
  if (t0 != null) { a = TT < t0 ? 0 : EZ.o2(seg(TT, t0, t0 + 0.28)); s = springMove(t0, 0.84, 1, o.spring ?? SPRING.smooth); rise = springMove(t0, o.rise ?? 90, 0, o.spring ?? SPRING.smooth); }
  const [sx, sy] = glSway(depth), dx = sx, dy = sy + rise + Math.sin(TT * 1.3 + ph) * 6 * depth;
  return { a, s, dx, dy, cx, cy, map: (px, py) => [cx + dx + (px - cx) * s, cy + dy + (py - cy) * s] };
}
// a floating glass card: draws the panel, then calls draw() with the card's transform applied (use the card's own coords)
function glCard(x, y, w, h, o = {}, draw) {
  const p = glCardPose(x, y, w, h, o); if (p.a <= 0.004) return false;
  ctx.save(); ctx.globalAlpha *= p.a; ctx.translate(p.cx + p.dx, p.cy + p.dy); ctx.scale(p.s, p.s); ctx.translate(-p.cx, -p.cy);
  glPanel(x, y, w, h, o); if (draw) draw(p);
  ctx.restore(); return true;
}

// ---------------------------------------------------------------------
//  type: white system sans, a soft dark offset under it so it holds on bright aurora
// ---------------------------------------------------------------------
function glFont(size, weight = 600) { ctx.font = `${weight} ${size}px ${GL_SANS}`; }
function glTextW(str, size, weight = 600) { ctx.save(); glFont(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// o: { weight, align, base, a, shadow (true) }
function glText(str, x, y, size, c = GL.white, o = {}) {
  const a = o.a ?? 1; if (a <= 0.01 || str === '' || str == null) return 0;
  ctx.save(); glFont(size, o.weight ?? 600); ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic';
  const w = ctx.measureText(str).width; ctx.globalAlpha *= clamp(a);
  if (o.shadow !== false) { ctx.fillStyle = glA(GL.deep, 0.3); ctx.fillText(str, x, y + Math.max(1.5, size * 0.035)); }
  ctx.fillStyle = c; ctx.fillText(str, x, y);
  ctx.restore(); return w;
}
const glNum = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // 12480000 -> 12.480.000
const glRp = (n) => 'Rp' + glNum(n);
// a number counting from a to b over [t0, t0 + dur], in steps
function glCount(t0, dur, a, b, step = 1) { const u = seg(TT, t0, t0 + dur); return u >= 1 ? b : Math.round(lerp(a, b, EZ.o3(u)) / step) * step; }

// ---------------------------------------------------------------------
//  UI parts (all in world coords; put them inside a glCard's draw callback)
// ---------------------------------------------------------------------
// a smooth line chart with a soft area under it. o: { c, frac (draw-on 0..1), w, fill (true), dot (true) }
function glSpark(x, y, w, h, vals, o = {}) {
  const c = o.c ?? GL.white, frac = clamp(o.frac ?? 1), n = vals.length; if (frac <= 0.001 || n < 2) return;
  const lo = Math.min(...vals), hi = Math.max(...vals), K = vals.map((v, i) => [x + (i / (n - 1)) * w, y + h - ((v - lo) / (hi - lo || 1)) * h]);
  const D = [];   // Catmull-Rom through the points, sampled
  for (let i = 0; i < n - 1; i++) {
    const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(n - 1, i + 2)];
    for (let j = 0; j < 10; j++) { const t = j / 10, t2 = t * t, t3 = t2 * t; D.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); }
  }
  D.push(K[n - 1]);
  const L = subPath(D, frac), end = L[L.length - 1], z = glZoom();
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.fill !== false) { const g = ctx.createLinearGradient(0, y, 0, y + h + 10); g.addColorStop(0, glA(c, 0.26)); g.addColorStop(1, glA(c, 0)); glPath([...L, [end[0], y + h + 10], [x, y + h + 10]], true); ctx.fillStyle = g; ctx.fill(); }
  glPath(L, false); ctx.strokeStyle = glA(c, 0.2); ctx.lineWidth = (o.w ?? 5) * 2.6; ctx.stroke();
  ctx.strokeStyle = c; ctx.lineWidth = o.w ?? 5; ctx.stroke();
  if (o.dot !== false) {
    const pr = 9 + 3 * Math.sin(TT * TAU * 1.2);
    ctx.fillStyle = glA(c, 0.25); ctx.beginPath(); ctx.arc(end[0], end[1], pr * 2, 0, TAU); ctx.fill();
    ctx.fillStyle = GL.white; ctx.beginPath(); ctx.arc(end[0], end[1], 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 3 / z; ctx.stroke();
  }
  ctx.restore(); return end;
}
// rounded bars growing from the baseline. o: { c, hi (index), hiC, t0, stagger, gap (0..1), spring }
function glBars(x, y, w, h, vals, o = {}) {
  const n = vals.length, hiV = Math.max(...vals), pitch = w / n, bw = pitch * (1 - (o.gap ?? 0.42));
  vals.forEach((v, i) => {
    const g = o.t0 != null ? springMove(o.t0 + i * (o.stagger ?? 0.06), 0, 1, o.spring ?? SPRING.smooth) : 1; if (TT < (o.t0 ?? -1e9) + i * (o.stagger ?? 0.06)) return;
    const bh = Math.max(bw, (v / hiV) * h * g), bx = x + i * pitch + (pitch - bw) / 2, by = y + h - bh, isHi = i === o.hi, c = isHi ? (o.hiC ?? GL.mint) : (o.c ?? GL.white);
    ctx.save(); const gr = ctx.createLinearGradient(0, by, 0, y + h); gr.addColorStop(0, glA(c, isHi ? 1 : 0.62)); gr.addColorStop(1, glA(c, isHi ? 0.55 : 0.2));
    glPath(glRRectPts(bx, by, bw, bh, bw / 2), true); ctx.fillStyle = gr; ctx.fill();
    if (isHi) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 / glZoom(); ctx.stroke(); }
    ctx.restore();
  });
}
// a toggle pill: (x, y) its top-left, w wide; on 0..1. o: { c }
function glToggle(x, y, w, on, o = {}) {
  const h = w * 0.56, c = o.c ?? GL.mint, u = clamp(on), kr = h / 2 - 5;
  ctx.save(); glPath(glRRectPts(x, y, w, h, h / 2), true);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill(); ctx.fillStyle = glA(c, 0.95 * u); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2 / glZoom(); ctx.stroke();
  const kx = x + h / 2 + (w - h) * on, ky = y + h / 2;
  ctx.fillStyle = glA(GL.deep, 0.22); ctx.beginPath(); ctx.arc(kx, ky + 3, kr + 1, 0, TAU); ctx.fill();
  ctx.fillStyle = GL.white; ctx.beginPath(); ctx.arc(kx, ky, kr, 0, TAU); ctx.fill();
  ctx.restore();
}
// a toggle that flips on at time t (spring); returns its 0..1 state
const glFlip = (t, from = 0, to = 1) => clamp(springMove(t, from, to, SPRING.snappy), -0.08, 1.08);
// an avatar: a gradient disc with a simple head and shoulders. o: { c1, c2 }
function glAvatar(x, y, r, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, o.c1 ?? GL.pink); g.addColorStop(1, o.c2 ?? GL.violet);
  ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.93)'; ctx.beginPath(); ctx.arc(x, y - r * 0.14, r * 0.34, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.82, r * 0.62, r * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5 / glZoom(); ctx.stroke();
  ctx.restore();
}
// a progress ring from 12 o'clock. o: { c, c2, w, track (alpha) }
function glRing(x, y, r, frac, o = {}) {
  const c = o.c ?? GL.blue, lw = o.w ?? r * 0.2, f = clamp(frac);
  ctx.save(); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = `rgba(255,255,255,${o.track ?? 0.17})`; ctx.lineWidth = lw; ctx.stroke();
  if (f > 0.002) {
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, o.c2 ?? GL.teal); g.addColorStop(1, c);
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + f * TAU);
    ctx.strokeStyle = glA(c, 0.2); ctx.lineWidth = lw * 1.9; ctx.stroke();
    ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.stroke();
    const a = -Math.PI / 2 + f * TAU; ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, lw * 0.24, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// line icons, s = half the icon's size. names: check, arrowUp, arrowDown, bolt, card, bell, shield, user, heart, lock, send, plus, chart
// o: { w (stroke px), frac (draw-on, for check) }
function glIcon(name, x, y, s, c = GL.white, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = (o.w ?? Math.max(3, s * 0.2)) / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = c; ctx.fillStyle = c;
  const L = (P, closed) => { glPath(P, closed); ctx.stroke(); };
  if (name === 'check') { const P = subPath([[-0.58, 0.04], [-0.16, 0.46], [0.62, -0.42]], clamp(o.frac ?? 1)); if (P.length > 1 && (o.frac ?? 1) > 0.02) L(P); }
  else if (name === 'arrowUp') { L([[0, 0.62], [0, -0.6]]); L([[-0.46, -0.14], [0, -0.6], [0.46, -0.14]]); }
  else if (name === 'arrowDown') { L([[0, -0.62], [0, 0.6]]); L([[-0.46, 0.14], [0, 0.6], [0.46, 0.14]]); }
  else if (name === 'bolt') { glPath([[0.16, -0.92], [-0.52, 0.12], [-0.04, 0.12], [-0.2, 0.92], [0.52, -0.16], [0.04, -0.16]], true); ctx.fill(); }
  else if (name === 'card') { L(rrectPts(-0.88, -0.58, 1.76, 1.16, 0.2, 5), true); L([[-0.88, -0.2], [0.88, -0.2]]); L([[-0.56, 0.22], [-0.14, 0.22]]); }
  else if (name === 'bell') { ctx.beginPath(); ctx.moveTo(-0.7, 0.42); ctx.lineTo(-0.52, 0.2); ctx.lineTo(-0.52, -0.12); ctx.bezierCurveTo(-0.52, -0.9, 0.52, -0.9, 0.52, -0.12); ctx.lineTo(0.52, 0.2); ctx.lineTo(0.7, 0.42); ctx.closePath(); ctx.stroke(); L([[-0.16, 0.72], [0.16, 0.72]]); }
  else if (name === 'shield') { ctx.beginPath(); ctx.moveTo(0, -0.9); ctx.lineTo(0.72, -0.6); ctx.lineTo(0.72, 0); ctx.quadraticCurveTo(0.72, 0.62, 0, 0.92); ctx.quadraticCurveTo(-0.72, 0.62, -0.72, 0); ctx.lineTo(-0.72, -0.6); ctx.closePath(); ctx.stroke(); L([[-0.3, 0.0], [-0.06, 0.24], [0.34, -0.22]]); }
  else if (name === 'user') { ctx.beginPath(); ctx.arc(0, -0.36, 0.34, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0.92, 0.7, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); }
  else if (name === 'heart') { ctx.beginPath(); ctx.moveTo(0, 0.78); ctx.bezierCurveTo(-1.3, -0.1, -0.6, -1.0, 0, -0.34); ctx.bezierCurveTo(0.6, -1.0, 1.3, -0.1, 0, 0.78); ctx.closePath(); ctx.stroke(); }
  else if (name === 'lock') { L(rrectPts(-0.64, -0.1, 1.28, 0.98, 0.2, 5), true); ctx.beginPath(); ctx.arc(0, -0.1, 0.4, Math.PI, 0); ctx.stroke(); }
  else if (name === 'send') { L([[-0.84, -0.1], [0.86, -0.76], [0.2, 0.82], [-0.06, 0.2]], true); L([[-0.06, 0.2], [0.86, -0.76]]); }
  else if (name === 'plus') { L([[0, -0.66], [0, 0.66]]); L([[-0.66, 0], [0.66, 0]]); }
  else if (name === 'chart') { L([[-0.6, 0.66], [-0.6, 0.1]]); L([[0, 0.66], [0, -0.66]]); L([[0.6, 0.66], [0.6, -0.2]]); }
  ctx.restore();
}
// a small pill with text (and an optional icon); (x, y) = its left (or right / centre with o.align) and middle. Returns its width.
// o: { size, c, bg, icon, align, weight, a }
function glChip(str, x, y, o = {}) {
  const size = o.size ?? 30, h = size * 1.75, ic = o.icon ? size * 1.05 : 0, tw = glTextW(str, size, o.weight ?? 700), w = tw + ic + size * 1.3;
  const x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x, c = o.c ?? GL.white;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1;
  glPath(glRRectPts(x0, y - h / 2, w, h, h / 2), true); ctx.fillStyle = o.bg ?? glA(c, 0.2); ctx.fill(); ctx.strokeStyle = glA(c, 0.55); ctx.lineWidth = 2 / glZoom(); ctx.stroke();
  if (o.icon) glIcon(o.icon, x0 + size * 0.65 + ic * 0.38, y, size * 0.42, c, { w: Math.max(3, size * 0.12) });
  glText(str, x0 + size * 0.65 + ic, y + size * 0.03, size, c, { base: 'middle', weight: o.weight ?? 700 });
  ctx.restore(); return w;
}
// a glossy round badge with a check that draws on. o: { c, frac, icon }
function glBadge(x, y, r, o = {}) {
  const c = o.c ?? GL.mint;
  ctx.save();
  const gl = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.9); gl.addColorStop(0, glA(c, 0.38)); gl.addColorStop(1, glA(c, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r); g.addColorStop(0, glMix(c, GL.white, 0.6)); g.addColorStop(0.5, c); g.addColorStop(1, glMix(c, GL.deep, 0.3));
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(x - r * 0.1, y - r * 0.62, r * 0.82, r * 0.5, -0.25, 0, TAU); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5 / glZoom(); ctx.stroke();
  ctx.restore();
  glIcon(o.icon ?? 'check', x, y + r * 0.02, r * 0.62, GL.white, { w: r * 0.17, frac: o.frac ?? 1 });
}

// ---------------------------------------------------------------------
//  the hero: Embun, a small glossy glass orb (warm amber, the one warm thing in a cool frame) with two simple eyes.
//  (x, y) = its centre, r = radius. o: { key, look (-1..1), lookY, mood: 'smile' | 'wow', squash, bob, a }. Sets SPARK_AT.
// ---------------------------------------------------------------------
function glHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', look = o.look ?? 0, lookY = o.lookY ?? 0, wow = o.mood === 'wow';
  y += (o.bob ?? Math.sin(TT * TAU * 0.55 + 1) * 0.06) * r;
  SPARK_AT = toScreen(x, y);
  const sq = 1 + (o.squash ?? 0), z = glZoom();
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(x, y + r * (1 - sq)); ctx.scale(1 / sq, sq);
  ctx.save(); ctx.globalCompositeOperation = 'screen';   // the light it throws
  const hl = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 2.2); hl.addColorStop(0, glA(GL.sun, 0.42)); hl.addColorStop(1, glA(GL.sun, 0)); ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill(); ctx.restore();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.38, r * 0.05, 0, 0, r); g.addColorStop(0, '#fff3cf'); g.addColorStop(0.42, GL.sun); g.addColorStop(1, GL.sunD);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();   // light pooling at the bottom of the glass
  const cg = ctx.createRadialGradient(r * 0.2, r * 0.7, 0, r * 0.2, r * 0.7, r * 0.8); cg.addColorStop(0, 'rgba(255,250,225,0.5)'); cg.addColorStop(1, 'rgba(255,250,225,0)'); ctx.fillStyle = cg; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
  const eg = ctx.createLinearGradient(-r, -r, r, r); eg.addColorStop(0, 'rgba(255,255,255,0.95)'); eg.addColorStop(0.5, 'rgba(255,255,255,0.2)'); eg.addColorStop(1, 'rgba(255,255,255,0.6)');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = eg; ctx.lineWidth = Math.max(2 / z, r * 0.04); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.52, r * 0.3, r * 0.15, -0.62, 0, TAU); ctx.fill();   // the gloss
  ctx.beginPath(); ctx.arc(-r * 0.66, -r * 0.16, r * 0.055, 0, TAU); ctx.fill();
  const blink = (F + key.length * 13) % 78 < 3, ex = look * r * 0.12, ey = r * 0.02 + lookY * r * 0.09;
  for (const s of [-1, 1]) {
    ctx.fillStyle = GL.eye; ctx.beginPath(); ctx.ellipse(s * r * 0.3 + ex, ey, r * (wow ? 0.105 : 0.09), blink ? r * 0.018 : r * (wow ? 0.16 : 0.13), 0, 0, TAU); ctx.fill();
    if (!blink) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(s * r * 0.3 + ex - r * 0.03, ey - r * 0.055, r * 0.032, 0, TAU); ctx.fill(); }
    ctx.fillStyle = glA(GL.rose, 0.4); ctx.beginPath(); ctx.ellipse(s * r * 0.56 + ex * 0.6, ey + r * 0.2, r * 0.11, r * 0.07, 0, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = GL.eye; ctx.fillStyle = GL.eye; ctx.lineWidth = r * 0.05; ctx.lineCap = 'round';
  if (wow) { ctx.beginPath(); ctx.ellipse(ex, ey + r * 0.3, r * 0.075, r * 0.095, 0, 0, TAU); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(ex, ey + r * 0.16, r * 0.15, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); }
  ctx.restore();
}
function glHeroPts(x, y, r, n = 72) { return ellipsePts(x, y, r, r, 0, n); }

// ---------------------------------------------------------------------
//  captions and tags (screen space, after the camera, via DEFER). The caption sits on its own darker glass bar;
//  *a phrase* is set heavier in the highlight colour. Both fade during the first 0.3s of a bridge's shrink.
// ---------------------------------------------------------------------
function glLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
// when an overlay may appear: `at` seconds into the era, but not before the bridge that opens the era has nearly finished growing
function glArrive(at = 0.1) {
  let t = E0 + at;
  if (typeof BRIDGES !== 'undefined') for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) t = Math.max(t, r.tc + (r.d ?? 0.6) - 0.2);
  return t;
}
// o: { y (last baseline), x, size, at (seconds after the era starts), hi (colour), dark }
function glCaptionNow(str, o = {}) {
  const al = glLeaving(), size = o.size ?? 64, lh = size * 1.2, t0 = glArrive(o.at ?? 0.6), cx = o.x ?? CX, yLast = o.y ?? 1440; if (al <= 0.004 || TT < t0) return;
  const lines = str.split('\n').map((line) => line.split(/(\*[^*]+\*)/).filter((g) => g.trim()).flatMap((g) => (g[0] === '*' ? g.slice(1, -1).trim().split(/\s+/).map((w) => ({ w, hi: true })) : g.trim().split(/\s+/).map((w) => ({ w, hi: false })))));
  const sp = glTextW(' ', size, 700), wid = (d) => glTextW(d.w, size, d.hi ? 800 : 700), lw = lines.map((ws) => ws.reduce((a, d) => a + wid(d), 0) + sp * (ws.length - 1));
  const padX = 46, padY = 34, pw = Math.max(...lw) + padX * 2, top = yLast - (lines.length - 1) * lh - size * 0.92 - padY, ph = yLast + size * 0.26 + padY - top, cy = top + ph / 2;
  const a = EZ.o2(seg(TT, t0, t0 + 0.3)), s = springMove(t0, 0.9, 1, SPRING.smooth), dy = springMove(t0, 46, 0, SPRING.smooth);
  ctx.save(); ctx.globalAlpha = al * a; ctx.translate(cx, cy + dy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  glPanel(cx - pw / 2, top, pw, ph, { r: 40, dark: o.dark ?? 0.34, a: 0.75 });
  let k = 0;
  lines.forEach((ws, li) => {
    let xx = cx - lw[li] / 2; const yy = yLast - (lines.length - 1 - li) * lh;
    ws.forEach((d) => { const wa = EZ.o2(seg(TT, t0 + 0.12 + k * 0.07, t0 + 0.37 + k * 0.07)); k++; glText(d.w, xx, yy + (1 - wa) * 18, size, d.hi ? (o.hi ?? GL.mint) : GL.white, { weight: d.hi ? 800 : 700, a: wa }); xx += wid(d) + sp; });
  });
  ctx.restore();
}
// a small glass pill, top-left: a coloured dot, a number, a label. o: { c }
function glTagNow(num, label, o = {}) {
  const al = glLeaving(), t0 = glArrive(0.1), a = EZ.o2(seg(TT, t0, t0 + 0.3)); if (al * a <= 0.004) return;
  const x = 70, y = 258, h = 70, size = 30, nw = glTextW(num, size, 800), lw = glTextW(label, size, 700), w = 56 + nw + 16 + lw + 30;
  ctx.save(); ctx.globalAlpha = al * a; ctx.translate(springMove(t0, -30, 0, SPRING.smooth), 0);
  glPanel(x, y, w, h, { r: h / 2, shadowD: 10, dark: 0.12 });
  ctx.fillStyle = o.c ?? GL.teal; ctx.beginPath(); ctx.arc(x + 34, y + h / 2, 9, 0, TAU); ctx.fill();
  glText(num, x + 56, y + h / 2 + 1, size, GL.white, { base: 'middle', weight: 800 });
  glText(label, x + 56 + nw + 16, y + h / 2 + 1, size, GL.inkD, { base: 'middle', weight: 700 });
  ctx.restore();
}
const glTag = (num, label, o = {}) => { const f = () => glTagNow(num, label, o); if (DEFER) DEFER.push(f); else f(); };
const glCaption = (str, o = {}) => { const f = () => glCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  post: a soft vignette + fine grain (a seeded tile, shifted every frame) so the gradients do not band
// ---------------------------------------------------------------------
function glGrainTile() {
  if (GL_SCR.grain) return GL_SCR.grain;
  const s = 160, cv = glScratch('grain', s, s), g = cv.getContext('2d'), R = RNG('glgrain');
  for (let i = 0; i < 5200; i++) { const v = R.f() < 0.5; g.fillStyle = v ? `rgba(255,255,255,${R.r(0.2, 0.9).toFixed(2)})` : `rgba(0,0,0,${R.r(0.2, 0.9).toFixed(2)})`; g.fillRect(R.i(0, s - 1), R.i(0, s - 1), R.f() < 0.3 ? 2 : 1, 1); }
  return cv;
}
function glPost() {
  ctx.save(); screen();
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.48, H * 0.74); v.addColorStop(0, 'rgba(4,3,18,0)'); v.addColorStop(1, 'rgba(4,3,18,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const R = RNG('glgo', F), ox = R.i(0, 159), oy = R.i(0, 159);
  ctx.globalAlpha = 0.06; ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(glGrainTile(), 'repeat'); ctx.fillRect(0, 0, W + 160, H + 160);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'glass',
  paper: GL.paper,
  // the sheet a morph happens on is the aurora itself, calmer and tinted toward the era colour
  backdrop(c) {
    glAurora({ key: 'morph', dim: 0.1, speed: 1.4 });
    ctx.save(); screen(); ctx.globalAlpha = 0.2; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.restore();
    glGlints('morph', 14);
  },
  // an era seen through outline P: a glass rim (a soft colour glow, then the bright edge)
  window(P, key, src, o = {}) {
    ctx.save(); glPath(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const c = o.c ?? GL.white, b = bbox(P);
    ctx.save(); glPath(P, true); ctx.lineJoin = 'round';
    ctx.strokeStyle = glA(c, 0.16); ctx.lineWidth = 30; ctx.stroke(); ctx.strokeStyle = glA(c, 0.3); ctx.lineWidth = 14; ctx.stroke();
    const eg = ctx.createLinearGradient(Math.max(0, b.x0), Math.max(0, b.y0), Math.min(W, b.x1), Math.min(H, b.y1)); eg.addColorStop(0, 'rgba(255,255,255,0.95)'); eg.addColorStop(0.5, 'rgba(255,255,255,0.4)'); eg.addColorStop(1, 'rgba(255,255,255,0.7)');
    ctx.strokeStyle = eg; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: a pane of tinted glass with a glow behind it and a glint on its shoulder
  blob(P, c, key, u = 0) {
    const ce = glCentroid(P), b = bbox(P), r = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(ce[0], ce[1], r * 0.4, ce[0], ce[1], r * 2.6); g.addColorStop(0, glA(c, 0.5)); g.addColorStop(1, glA(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ce[0], ce[1], r * 2.6, 0, TAU); ctx.fill(); ctx.restore();
    glGlass(P, { tint: c, a: 1.2, edge: 3.5, shadowD: 26 });
    ctx.save(); glPath(P, true); ctx.clip();   // the colour inside the glass: lighter at the top-left, like a lit gem
    const jg = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1); jg.addColorStop(0, glA(glMix(c, GL.white, 0.45), 0.8)); jg.addColorStop(0.55, glA(c, 0.66)); jg.addColorStop(1, glA(glMix(c, GL.deep, 0.25), 0.6));
    ctx.fillStyle = jg; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.restore();
    ctx.save(); glPath(P.map(([x, y]) => [ce[0] + (x - ce[0]) * 0.8, ce[1] + (y - ce[1]) * 0.8]), true); ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    glGlint(b.x0 + r * 0.42, b.y0 + r * 0.36, r * 0.3, 0.5 + 0.5 * Math.sin(u * Math.PI));
    glGlint(b.x1 - r * 0.2, b.y1 - r * 0.3, r * 0.16, Math.sin(u * Math.PI));
  },
  hero(x, y, r, o = {}) { glHero(x, y, r * 0.8, { key: o.key, mood: o.mood }); },
  heroColor: GL.sun,
  heroPts(x, y, r) { return glHeroPts(x, y, r * 0.8); },
  post() { glPost(); },
  ones: true,
};
