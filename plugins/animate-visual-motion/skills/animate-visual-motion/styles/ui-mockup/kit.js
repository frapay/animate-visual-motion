// =====================================================================
//  styles/ui-mockup/kit.js — the app demo film: a product shown being USED inside device frames. Built on kit/core.js.
//  A calm studio ground, a phone and a browser window drawn in code, and inside each a clipped screen with its own
//  logical coordinate system (a phone screen is 280 units wide, a browser page 480, whatever the device's size or tilt),
//  built from clean UI parts: rows, cards, buttons, toggles, a typed field, charts, skeleton loaders. Over the device:
//  a cursor or a touch dot that travels on eased arcs and clicks (the UI answers on the click frame), notification
//  banners that drop in on a spring, a magnifier lens, label chips with leaders.
//  Everything is an invented, unbranded app: no real names, logos or OS glyphs.
//  Optional piece constants (declare before the kit, e.g. in the head): UI_ACCENT = '#rrggbb' (the one brand colour),
//  UI_DARK = true (captions and ground default to the graphite variant).
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const UI_DARKMODE = typeof UI_DARK !== 'undefined' && !!UI_DARK;
const UI = {
  ground: '#f4f5f7', groundD: '#17191e',                 // the studio: soft off-white, or graphite
  light: '#ffffff', lightD: '#2c303a',                   // the middle of the large radial light on each
  surface: '#ffffff', fill: '#f0f1f4', fill2: '#e1e4ea', line: '#e3e5ea',   // screens and cards, wells, tracks, 1px hairlines
  ink: '#15171c', ink2: '#5f6672', ink3: '#a2a8b3',      // text: primary, secondary, placeholder
  accent: typeof UI_ACCENT !== 'undefined' ? UI_ACCENT : '#4a5cff',          // the ONE brand colour
  body: '#1c1e24', bodyHi: '#474b57', bodyD: '#0b0c0f',  // the phone's shell, its rim light, the camera pill
  chrome: '#eceef2', dots: '#cdd1d9',                    // the browser's title bar and its three dots
  shadow: [18, 22, 38],
};
const UI_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif';
// avatars are plain tinted circles with initials: [background, initials]
const UI_TINTS = [['#ffe1d2', '#b4532a'], ['#d8efdf', '#2f7a4d'], ['#e0defc', '#4a3fb0'], ['#fdebb8', '#8a6410'], ['#d5e8f8', '#2a6496']];
// soft layered drop shadows, by level: [offset y, blur, alpha] in px at zoom 1
const UI_SH = [[], [[2, 7, 0.09]], [[3, 9, 0.1], [14, 34, 0.12]], [[6, 16, 0.13], [34, 84, 0.2]]];

function uiRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const uiA = (c, a) => { const [r, g, b] = uiRGB(c); return `rgba(${r},${g},${b},${clamp(a)})`; };
const uiMix = (a, b, u) => { const x = uiRGB(a), y = uiRGB(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], clamp(u))).toString(16).padStart(2, '0')).join(''); };
const uiLum = (c) => { const v = uiRGB(c); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; };
const uiZ = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };   // the current zoom (camera x device x lens)
const uiHair = (px = 1.5) => px / uiZ();                                                 // a hairline that stays px wide on screen
const uiAlpha = (a, fn) => { if (a <= 0.004) return; ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); };
function uiRR(x, y, w, h, r) {   // a rounded-rectangle path
  r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function uiPath(P) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
const uiCirc = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); };
// the shadow under whatever path() traces (the path is filled with o.fill so nothing shows through)
function uiShadow(path, level = 2, o = {}) {
  const z = uiZ(), k = o.k ?? 1; if (k <= 0) return;
  for (const [dy, blur, a] of UI_SH[level] || []) { ctx.save(); ctx.shadowColor = `rgba(${UI.shadow},${a * k})`; ctx.shadowBlur = blur * z; ctx.shadowOffsetY = dy * z; ctx.fillStyle = o.fill ?? UI.surface; path(); ctx.fill(); ctx.restore(); }
}
// a surface: rounded box, optional shadow level and hairline
function uiBox(x, y, w, h, r, fill, o = {}) {
  if (o.shadow) uiShadow(() => uiRR(x, y, w, h, r), o.shadow, { fill, k: o.shadowK });
  uiRR(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = uiHair(o.lw); ctx.stroke(); }
}

// ---------------------------------------------------------------------
//  type: one system UI sans. Sizes are in the current coordinate system (logical units inside a screen).
// ---------------------------------------------------------------------
let UI_LENS = false;  // true while a magnifier redraws its region (no lens inside a lens)
let UI_CULL = null;   // the screen-space box of the innermost viewport (a screen, a scroll region, a lens): text outside it is not drawn
// run fn with text culled to the box (x, y, w, h) of the current coordinate system
function uiCull(x, y, w, h, fn) {
  const b = bbox([[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => toScreen(px, py))), keep = UI_CULL;
  UI_CULL = keep ? { x0: Math.max(b.x0, keep.x0), y0: Math.max(b.y0, keep.y0), x1: Math.min(b.x1, keep.x1), y1: Math.min(b.y1, keep.y1) } : b;
  try { fn(); } finally { UI_CULL = keep; }
}
function uiFont(size, weight = 500) { ctx.font = `${weight} ${size}px ${UI_SANS}`; }
function uiTextW(str, size, weight = 500) { ctx.save(); uiFont(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// o: weight, align, base ('alphabetic' | 'middle'), a (alpha)
function uiText(str, x, y, size, color, o = {}) {
  const s = String(str); if (!s) return 0;
  ctx.save(); uiFont(size, o.weight ?? 500); const w = ctx.measureText(s).width;
  if (UI_CULL) {   // inside a viewport: text that is scrolled or magnified out of it is skipped, not just clipped
    const al = o.align ?? 'left', x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x, yt = y - size * (o.base === 'middle' ? 0.5 : 0.78), yb = yt + size;
    const b = bbox([[x0, yt], [x0 + w, yt], [x0 + w, yb], [x0, yb]].map(([px, py]) => toScreen(px, py)));
    if (b.x1 < UI_CULL.x0 || b.x0 > UI_CULL.x1 || Math.min(b.y1, UI_CULL.y1) - Math.max(b.y0, UI_CULL.y0) < (b.y1 - b.y0) * 0.45) { ctx.restore(); return w; }   // less than half a line showing: gone
  }
  ctx.fillStyle = color; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic'; if (o.a != null) ctx.globalAlpha *= clamp(o.a);
  ctx.fillText(s, x, y); ctx.restore(); return w;
}
// monoline icons in a unit box (-1..1): check, plus, up, chev, search, home, chart, bell, user, lock, list, clock
function uiGlyph(name, x, y, s, c, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = o.w ?? 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = c; ctx.beginPath();
  const L = (...p) => { ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); };
  if (name === 'check') L(-0.62, 0.04, -0.2, 0.46, 0.64, -0.42);
  else if (name === 'plus') { L(-0.68, 0, 0.68, 0); L(0, -0.68, 0, 0.68); }
  else if (name === 'up') { L(0, 0.7, 0, -0.66); L(-0.52, -0.14, 0, -0.68, 0.52, -0.14); }
  else if (name === 'chev') L(-0.28, -0.56, 0.28, 0, -0.28, 0.56);
  else if (name === 'search') { ctx.moveTo(0.4, -0.15); ctx.arc(-0.15, -0.15, 0.55, 0, TAU); L(0.26, 0.26, 0.74, 0.74); }
  else if (name === 'home') { L(-0.76, -0.04, 0, -0.74, 0.76, -0.04); L(-0.52, -0.2, -0.52, 0.7, 0.52, 0.7, 0.52, -0.2); }
  else if (name === 'chart') { L(-0.6, 0.7, -0.6, 0.12); L(0, 0.7, 0, -0.7); L(0.6, 0.7, 0.6, -0.24); }
  else if (name === 'bell') { L(-0.68, 0.42, 0.68, 0.42); ctx.moveTo(-0.48, 0.42); ctx.lineTo(-0.48, -0.12); ctx.arc(0, -0.12, 0.48, Math.PI, 0); ctx.lineTo(0.48, 0.42); L(-0.12, 0.74, 0.12, 0.74); }
  else if (name === 'user') { ctx.moveTo(0.36, -0.32); ctx.arc(0, -0.32, 0.36, 0, TAU); ctx.moveTo(-0.68, 0.76); ctx.arc(0, 0.76, 0.68, Math.PI, 0); }
  else if (name === 'lock') { ctx.rect(-0.5, -0.06, 1, 0.8); ctx.moveTo(-0.3, -0.06); ctx.lineTo(-0.3, -0.36); ctx.arc(0, -0.36, 0.3, Math.PI, 0); ctx.lineTo(0.3, -0.06); }
  else if (name === 'list') { L(-0.7, -0.5, 0.7, -0.5); L(-0.7, 0, 0.7, 0); L(-0.7, 0.5, 0.3, 0.5); }
  else if (name === 'clock') { ctx.moveTo(0.74, 0); ctx.arc(0, 0, 0.74, 0, TAU); L(0, -0.4, 0, 0, 0.3, 0.2); }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  timing: everything is a closed-form function of TT, so any frame draws on its own
// ---------------------------------------------------------------------
const uiAt = (t) => TT >= t - 1e-6;                                                          // has the cue's frame arrived?
// 0 -> 1 on a spring with a small overshoot; it has already moved on its cue's frame (the UI answers on the click frame)
const uiSpring = (t0, p = SPRING.snappy) => (uiAt(t0) ? springEase(TT - t0 + 1 / FPS, p.k, p.d) : 0);
// a press: fully down ON the click frame, held a moment, released on an ease
const uiPress = (t0, hold = 0.09, rel = 0.16) => (!uiAt(t0) ? 0 : TT - t0 < hold ? 1 : 1 - EZ.o2(seg(TT - t0, hold, hold + rel)));
// how many characters of str are typed at a steady rate from t0 (the first lands on t0's frame)
const uiTyped = (str, t0, cps = 12) => (uiAt(t0) ? Math.min(str.length, Math.floor((TT - t0) * cps + 1e-6) + 1) : 0);
const uiCount = (t0, d, a, b) => Math.round(lerp(a, b, EZ.o3(seg(TT, t0, t0 + d))));           // a number counting from a to b
const uiBlink = (rate = 2.2) => Math.floor(TT * rate * 2) % 2 === 0;                           // the caret

// ---------------------------------------------------------------------
//  the studio
// ---------------------------------------------------------------------
// the ground: colour c, a large faint radial light, optionally one soft brand-tinted glow. o: lx, ly, lr, glow [x, y, r], glowA
function uiGround(c = UI_DARKMODE ? UI.groundD : UI.ground, o = {}) {
  const dark = uiLum(c) < 0.4, lx = o.lx ?? W * 0.5, ly = o.ly ?? H * 0.4, lr = o.lr ?? H * 0.6, hi = dark ? UI.lightD : UI.light;
  ctx.save(); ctx.fillStyle = c; ctx.fillRect(-W, -H, W * 3, H * 3);
  let g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr); g.addColorStop(0, uiA(hi, dark ? 0.85 : 0.95)); g.addColorStop(0.5, uiA(hi, dark ? 0.3 : 0.4)); g.addColorStop(1, uiA(hi, 0));
  ctx.fillStyle = g; ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
  if (o.glow) {
    const [gx, gy, gr] = o.glow, a = o.glowA ?? (dark ? 0.34 : 0.2); g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, uiA(UI.accent, a)); g.addColorStop(0.55, uiA(UI.accent, a * 0.35)); g.addColorStop(1, uiA(UI.accent, 0)); ctx.fillStyle = g; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  }
  ctx.restore();
}
// background life: faint wireframe UI tiles (an outline, a dot, two bars) rising slowly behind the device. o: dark, speed, a
function uiDrift(key, n = 7, o = {}) {
  const c = o.dark ? uiMix(UI.groundD, '#ffffff', 0.1) : uiMix(UI.ground, UI.ink, 0.085), span = H + 500;
  ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = uiHair(2);
  for (let i = 0; i < n; i++) {
    const R = RNG('uidrift', key, i), w = R.r(130, 250), h = w * R.r(0.5, 0.8), x = R.r(-40, W - w + 40), y = mod(R.r(0, span) - TT * R.r(16, 34) * (o.speed ?? 1), span) - 300;
    ctx.globalAlpha = (o.a ?? 1) * smooth(-300, 0, y) * (1 - smooth(H - 200, H + 100, y));
    uiRR(x, y, w, h, 22); ctx.stroke(); uiCirc(x + 30, y + 32, 11); ctx.fill();
    uiRR(x + 52, y + 25, w * 0.42, 13, 6.5); ctx.fill(); uiRR(x + 20, y + h - 34, w * R.r(0.4, 0.7), 13, 6.5); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  device frames. Each returns its geometry g: g.at(lx, ly) turns a logical screen point into a world point
//  (for cursors, lenses, call-outs, bridge shapes); uiPhoneGeo / uiBrowserGeo give the same g without drawing.
//  Pose options (o): tilt (resting angle), in (the time it drifts in: rises, turns from tilt0 and settles), from [dx, dy],
//  float (idle bob in px), k (scale).
// ---------------------------------------------------------------------
function uiPose(o = {}) {
  const tilt = o.tilt ?? 0, bob = Math.sin(TT * 1.3 + (o.ph ?? 0)) * (o.float ?? 0);
  if (o.in == null) return { dx: 0, dy: bob, rot: tilt, k: o.k ?? 1, a: 1 };
  const t = TT - o.in, s = t <= 0 ? 0 : springEase(t, 110, 19), s2 = t <= 0 ? 0 : springEase(t, 60, 9.5), from = o.from ?? [0, 110];   // the turn settles later than the rise
  return { dx: (1 - s) * from[0], dy: (1 - s) * from[1] + bob, rot: tilt + (1 - s2) * (o.tilt0 ?? 0.07), k: (o.k ?? 1) * lerp(0.93, 1, s), a: clamp(t / 0.12) };
}
function uiGeo(x, y, w, h, o, ox, oy, s, vw, vh) {
  const p = uiPose(o), cx = x + p.dx, cy = y + p.dy, c = Math.cos(p.rot) * p.k, sn = Math.sin(p.rot) * p.k;
  const dev = (ux, uy) => [cx + ux * c - uy * sn, cy + ux * sn + uy * c];
  return { x: cx, y: cy, w, h, rot: p.rot, k: p.k, a: p.a, s, vw, vh, scale: s * p.k, dev, at: (lx, ly) => dev(ox + lx * s, oy + ly * s) };
}
// a phone, centre (x, y), height h. Its screen is o.vw (280) logical units wide. o: + body, bg, status, bezel, ratio
function uiPhoneGeo(x, y, h, o = {}) {
  const w = h * (o.ratio ?? 0.49), bz = o.bezel ?? h * 0.0132, vw = o.vw ?? 280, s = (w - bz * 2) / vw;
  const g = uiGeo(x, y, w, h, o, -w / 2 + bz, -h / 2 + bz, s, vw, (h - bz * 2) / s); g.bz = bz; g.R = w * 0.16;
  g.pts = () => rrectPts(-w / 2, -h / 2, w, h, g.R, 8).map(([ux, uy]) => g.dev(ux, uy));
  return g;
}
function uiPhone(x, y, h, o = {}, drawScreen) {
  const g = uiPhoneGeo(x, y, h, o), { w, bz, R } = g, body = o.body ?? UI.body;
  ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.scale(g.k, g.k); ctx.globalAlpha *= g.a;
  uiShadow(() => uiRR(-w / 2, -h / 2, w, h, R), 3, { fill: body, k: o.shadowK });
  ctx.fillStyle = uiMix(body, '#000000', 0.3);                                                // side buttons
  for (const [bx, by, bh] of [[w / 2 - 3, -h * 0.2, h * 0.1], [-w / 2 - 4, -h * 0.26, h * 0.055], [-w / 2 - 4, -h * 0.19, h * 0.055]]) { uiRR(bx, by, 7, bh, 3); ctx.fill(); }
  uiRR(-w / 2, -h / 2, w, h, R); ctx.fillStyle = body; ctx.fill();
  const rim = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); rim.addColorStop(0, UI.bodyHi); rim.addColorStop(0.45, body); rim.addColorStop(1, UI.bodyHi);
  uiRR(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, R - 1.5); ctx.strokeStyle = rim; ctx.lineWidth = 3; ctx.stroke();   // a thin rim light
  ctx.save(); uiRR(-w / 2 + bz, -h / 2 + bz, w - bz * 2, h - bz * 2, R - bz); ctx.clip(); ctx.fillStyle = o.bg ?? UI.surface; ctx.fill();
  ctx.translate(-w / 2 + bz, -h / 2 + bz); ctx.scale(g.s, g.s);
  const v = { w: g.vw, h: g.vh, s: g.s, scroll: o.scroll ?? 0, top: 42, bottom: 18 };
  if (drawScreen) uiCull(0, 0, v.w, v.h, () => drawScreen(v, g));
  if (o.status !== false) {   // a generic status row: signal bars left, a battery right (no clock: no tiny type)
    ctx.fillStyle = o.statusC ?? UI.ink;
    for (let i = 0; i < 4; i++) { uiRR(22 + i * 6, 26 - i * 2.6, 4, 4 + i * 2.6, 1.2); ctx.fill(); }
    uiRR(v.w - 46, 16.5, 24, 12, 3.5); ctx.strokeStyle = uiA(o.statusC ?? UI.ink, 0.45); ctx.lineWidth = 1.2; ctx.stroke(); uiRR(v.w - 44, 18.5, 15, 8, 2); ctx.fill();
  }
  ctx.fillStyle = UI.bodyD; uiRR(v.w / 2 - 33, 11, 66, 21, 10.5); ctx.fill();                 // the camera pill
  ctx.fillStyle = uiA(o.statusC ?? UI.ink, 0.88); uiRR(v.w / 2 - 46, v.h - 10, 92, 4.4, 2.2); ctx.fill();   // the home indicator
  ctx.restore(); ctx.restore(); return g;
}
// a browser window, centre (x, y), size w x h. Its page is o.vw (480) logical units wide. o: + bar (title bar height), url, bg
function uiBrowserGeo(x, y, w, h, o = {}) {
  const bar = o.bar ?? 72, vw = o.vw ?? 480, s = w / vw, g = uiGeo(x, y, w, h, o, -w / 2, -h / 2 + bar, s, vw, (h - bar) / s); g.bar = bar; g.R = o.r ?? 24;
  g.pts = () => rrectPts(-w / 2, -h / 2, w, h, g.R, 8).map(([ux, uy]) => g.dev(ux, uy));
  return g;
}
function uiBrowser(x, y, w, h, o = {}, drawScreen) {
  const g = uiBrowserGeo(x, y, w, h, o), { bar, R } = g, x0 = -w / 2, y0 = -h / 2;
  ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.scale(g.k, g.k); ctx.globalAlpha *= g.a;
  uiShadow(() => uiRR(x0, y0, w, h, R), 3, { fill: UI.surface, k: o.shadowK });
  ctx.save(); uiRR(x0, y0, w, h, R); ctx.clip();
  ctx.fillStyle = UI.chrome; ctx.fillRect(x0, y0, w, bar);                                    // the title bar: three dots and a rounded address field
  ctx.fillStyle = UI.dots; for (let i = 0; i < 3; i++) { uiCirc(x0 + 34 + i * 27, y0 + bar / 2, 8.5); ctx.fill(); }
  const fx = x0 + 122, fw = w - 122 - 64, fh = bar * 0.6, fy = y0 + (bar - fh) / 2;
  uiBox(fx, fy, fw, fh, fh / 2, UI.surface, { line: UI.line });
  uiGlyph('lock', fx + 30, fy + fh / 2 - 1, fh * 0.2, UI.ink3, { w: 0.26 });
  if (o.url) uiText(o.url, fx + 50, fy + fh / 2 + 1, fh * 0.54, UI.ink2, { base: 'middle' });
  uiGlyph('plus', x0 + w - 32, y0 + bar / 2, 10, UI.ink3);
  ctx.fillStyle = UI.line; ctx.fillRect(x0, y0 + bar - 1.5, w, 1.5);
  ctx.beginPath(); ctx.rect(x0, y0 + bar, w, h - bar); ctx.clip(); ctx.fillStyle = o.bg ?? UI.surface; ctx.fill();
  ctx.translate(x0, y0 + bar); ctx.scale(g.s, g.s);
  if (drawScreen) uiCull(0, 0, g.vw, g.vh, () => drawScreen({ w: g.vw, h: g.vh, s: g.s, scroll: o.scroll ?? 0, top: 0, bottom: 0 }, g));
  ctx.restore();
  uiRR(x0, y0, w, h, R); ctx.strokeStyle = uiA(UI.ink, 0.1); ctx.lineWidth = uiHair(); ctx.stroke();
  ctx.restore(); return g;
}
// a scrolling region of a screen: clipped to (x, y, w, h), its content moved up by scroll
function uiScroll(x, y, w, h, scroll, fn) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); uiCull(x, y, w, h, () => { ctx.translate(0, -scroll); fn(); }); ctx.restore(); }

// ---------------------------------------------------------------------
//  UI parts. Coordinates are the current system's: logical units inside a screen, world px when floating.
// ---------------------------------------------------------------------
function uiAvatar(x, y, r, initials, o = {}) {
  const [bg, fg] = UI_TINTS[(o.tint ?? hash('uiav', initials)) % UI_TINTS.length];
  uiCirc(x, y, r); ctx.fillStyle = bg; ctx.fill(); uiText(initials, x, y + r * 0.05, r * 0.82, fg, { weight: 700, align: 'center', base: 'middle' });
}
// a large-title navigation bar under the status row. o: chip (a count pill on the right), size, y
function uiNav(v, title, o = {}) {
  const y = o.y ?? v.top + 46, size = o.size ?? 30;
  uiText(title, 16, y, size, UI.ink, { weight: 700 });
  if (o.chip) uiChip(o.chip, v.w - 16, y - size * 0.34, { size: o.chipSize ?? 14, align: 'right', on: o.chipOn ?? 0 });
}
// a bottom tab bar: icons only, the active one in the accent with a dot under it
function uiTabBar(v, glyphs, active = 0, o = {}) {
  const h = o.h ?? 58, y = v.h - h, n = glyphs.length;
  ctx.fillStyle = UI.surface; ctx.fillRect(0, y, v.w, h); ctx.fillStyle = UI.line; ctx.fillRect(0, y, v.w, uiHair());
  glyphs.forEach((gl, i) => { const x = v.w * (i + 0.5) / n, on = i === active; uiGlyph(gl, x, y + h * 0.38, 10.5, on ? UI.accent : UI.ink3); if (on) { uiCirc(x, y + h * 0.7, 2.2); ctx.fillStyle = UI.accent; ctx.fill(); } });
}
// a list row. o: initials (an avatar), tint, title, sub, right ('check' | 'chev' | a short string), on (0..1: the check fills),
// k (0..1: the row opens), hi (0..1: an accent wash, for a row that was just added), sep (false = no hairline), size
function uiRow(x, y, w, h, o = {}) {
  const k = clamp(o.k ?? 1); if (k <= 0.01) return;
  const pad = o.pad ?? 16, r = o.ar ?? h * 0.3, cy = y + h / 2, size = o.size ?? 17; let tx = x + pad;
  ctx.save(); if (k < 1) { ctx.beginPath(); ctx.rect(x, y, w, h * k); ctx.clip(); }
  if (o.hi > 0.01) { uiRR(x + 6, y + 3, w - 12, h - 6, 14); ctx.fillStyle = uiA(UI.accent, 0.1 * o.hi); ctx.fill(); }
  if (k < 1) { ctx.globalAlpha *= smooth(0.55, 1, k); ctx.translate(0, -(1 - k) * h * 0.25); }   // the space opens first, then its content arrives
  if (o.initials) { uiAvatar(tx + r, cy, r, o.initials, { tint: o.tint }); tx += r * 2 + 12; }
  uiText(o.title ?? '', tx, o.sub ? cy - 4 : cy + size * 0.36, size, UI.ink, { weight: 600 });
  if (o.sub) uiText(o.sub, tx, cy + size * 0.96, size * 0.82, UI.ink2);
  const rx = x + w - pad, on = clamp(o.on ?? 0);
  if (o.right === 'check') { uiCirc(rx - 11, cy, 11); ctx.fillStyle = uiMix(UI.surface, UI.accent, on); ctx.fill(); ctx.strokeStyle = uiMix(UI.ink3, UI.accent, on); ctx.lineWidth = 1.6; ctx.stroke(); if (on > 0.3) uiGlyph('check', rx - 11, cy, 6.5 * Math.min(1, on * 1.2), '#ffffff', { w: 0.3 }); }
  else if (o.right === 'chev') uiGlyph('chev', rx - 6, cy, 8, UI.ink3);
  else if (o.right) uiText(o.right, rx, cy + size * 0.3, size * 0.82, UI.ink3, { align: 'right' });
  if (o.sep !== false) { ctx.fillStyle = UI.line; ctx.fillRect(tx, y + h - uiHair(), x + w - tx, uiHair()); }
  ctx.restore();
}
// a card: a white rounded surface with a hairline and a soft shadow; draw(x, y, w, h) runs clipped to it.
// o: r, fill, line (null = none), shadow (level), k (pop scale), press (0..1), a
function uiCard(x, y, w, h, o = {}, draw) {
  const k = o.k ?? 1; if (k <= 0.002) return;
  const r = o.r ?? 16, sc = k * (1 - 0.035 * clamp(o.press ?? 0)), fill = o.fill ?? UI.surface;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-x - w / 2, -y - h / 2); ctx.globalAlpha *= clamp(o.a ?? Math.min(1, k * 1.5));
  uiBox(x, y, w, h, r, fill, { shadow: o.shadow ?? 1, line: o.line === undefined ? UI.line : o.line });
  if (draw) { ctx.save(); uiRR(x, y, w, h, r); ctx.clip(); draw(x, y, w, h); ctx.restore(); }
  ctx.restore();
}
// a button. o: press (0..1: it sinks and darkens), kind ('primary' | 'soft' | 'plain'), glyph, r, size
function uiButton(x, y, w, h, label, o = {}) {
  const pr = clamp(o.press ?? 0), kind = o.kind ?? 'primary', sc = 1 - 0.07 * pr, size = o.size ?? h * 0.38;
  const fill = kind === 'primary' ? uiMix(UI.accent, '#000000', 0.2 * pr) : kind === 'soft' ? uiMix(uiMix(UI.surface, UI.accent, 0.12), UI.accent, 0.14 * pr) : uiMix(UI.fill, UI.fill2, pr);
  const fg = kind === 'primary' ? '#ffffff' : kind === 'soft' ? UI.accent : UI.ink;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-x - w / 2, -y - h / 2);
  uiBox(x, y, w, h, o.r ?? h / 2, fill, { shadow: kind === 'primary' && pr < 0.5 ? 1 : 0 });
  const tw = label ? uiTextW(label, size, 600) : 0, gs = o.glyph ? size * 0.5 : 0, total = tw + (gs ? gs * 2 + (label ? size * 0.4 : 0) : 0); let cx = x + (w - total) / 2;
  if (o.glyph) { uiGlyph(o.glyph, cx + gs, y + h / 2, gs, fg, { w: 0.28 }); cx += gs * 2 + size * 0.4; }
  if (label) uiText(label, cx, y + h / 2 + size * 0.04, size, fg, { weight: 600, base: 'middle' });
  ctx.restore();
}
// a toggle of width w: on = 0..1 (pass a spring; the knob may overshoot a little)
function uiToggle(x, y, w, on) {
  const h = w * 0.6, u = clamp(on, -0.08, 1.08), r = h / 2 - 2.5;
  uiRR(x, y, w, h, h / 2); ctx.fillStyle = uiMix(UI.fill2, UI.accent, clamp(on)); ctx.fill();
  const kx = lerp(x + h / 2, x + w - h / 2, u);
  uiShadow(() => uiCirc(kx, y + h / 2, r), 1); uiCirc(kx, y + h / 2, r); ctx.fillStyle = '#ffffff'; ctx.fill();
}
// a segmented control: pos = which item the white thumb sits on (fractional while it slides)
function uiSeg(x, y, w, h, items, pos, o = {}) {
  const n = items.length, iw = (w - 6) / n, size = o.size ?? h * 0.4;
  uiRR(x, y, w, h, h / 2); ctx.fillStyle = UI.fill; ctx.fill();
  const tx = x + 3 + clamp(pos, -0.1, n - 0.9) * iw; uiBox(tx, y + 3, iw, h - 6, (h - 6) / 2, UI.surface, { shadow: 1 });
  items.forEach((s, i) => uiText(s, x + 3 + (i + 0.5) * iw, y + h / 2 + size * 0.04, size, Math.abs(pos - i) < 0.5 ? UI.ink : UI.ink2, { weight: 600, align: 'center', base: 'middle' }));
}
// a text field: o.text typed up to o.n characters, a caret, an accent ring as o.focus goes 0..1.
// o: placeholder, size, r, pad, right (px kept free at the right end), typing (the caret holds solid while keys land)
function uiField(x, y, w, h, o = {}) {
  const f = clamp(o.focus ?? 0), size = o.size ?? h * 0.34, pad = o.pad ?? h * 0.36, str = String(o.text ?? '').slice(0, o.n ?? 1e9);
  uiBox(x, y, w, h, o.r ?? h / 2, uiMix(UI.fill, UI.surface, f), { line: uiMix(UI.line, UI.accent, f), lw: lerp(1.5, 3.2, f) });
  if (f > 0.02) { uiRR(x - 3, y - 3, w + 6, h + 6, (o.r ?? h / 2) + 3); ctx.strokeStyle = uiA(UI.accent, 0.2 * f); ctx.lineWidth = 3; ctx.stroke(); }
  let tw = 0;
  if (str) tw = uiText(str, x + pad, y + h / 2 + size * 0.04, size, UI.ink, { base: 'middle' });
  else if (o.placeholder) uiText(o.placeholder, x + pad, y + h / 2 + size * 0.04, size, UI.ink3, { base: 'middle', a: 1 - 0.35 * f });
  if (f > 0.5 && (o.typing || uiBlink())) { ctx.fillStyle = UI.accent; ctx.fillRect(x + pad + tw + (str ? 2 : 0), y + h / 2 - size * 0.62, Math.max(1.6, size * 0.1), size * 1.24); }
  return { caret: x + pad + tw, tw };
}
// bar tops / line points of a chart: [{ x, y, w, base, v }] (for lenses, call-outs and cursors)
function uiChartPts(x, y, w, h, vals, o = {}) {
  const n = vals.length, max = o.max ?? Math.max(...vals), lab = o.labels ? (o.size ?? 13) * 1.75 : 0, base = y + h - lab, top = y + (o.head ?? 0), slot = w / n, bw = slot * (1 - (o.gap ?? 0.4));
  return vals.map((v, i) => ({ x: x + (i + 0.5) * slot, y: base - (base - top) * clamp(v / max, 0, 1.2) * clamp(typeof o.grow === 'function' ? o.grow(i) : o.grow ?? 1, 0, 1.2), w: bw, base, v }));
}
// a chart. o: kind ('bars' | 'line'), grow (0..1 or i => 0..1), hi (the bar in the full accent), value (a label on the hi bar),
// labels, size, max, grid (how many hairlines), gap, head (px kept free above the tallest bar)
function uiChart(x, y, w, h, vals, o = {}) {
  const P = uiChartPts(x, y, w, h, vals, o), base = P[0].base, top = y + (o.head ?? 0), size = o.size ?? 13, soft = o.c ?? uiMix(UI.accent, '#ffffff', 0.74);
  ctx.save(); ctx.fillStyle = UI.line; for (let i = 0; i <= (o.grid ?? 3); i++) ctx.fillRect(x, lerp(base, top, i / (o.grid ?? 3)) - uiHair() / 2, w, uiHair());
  if (o.kind === 'line') {
    const g = clamp(typeof o.grow === 'number' ? o.grow : 1), Q = P.map((p) => [p.x, p.y]), S = subPath(resample(Q, false, 4), g), e = S[S.length - 1];
    ctx.beginPath(); ctx.moveTo(S[0][0], base); S.forEach(([px, py]) => ctx.lineTo(px, py)); ctx.lineTo(e[0], base); ctx.closePath(); ctx.fillStyle = uiA(UI.accent, 0.12); ctx.fill();
    ctx.beginPath(); S.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.strokeStyle = UI.accent; ctx.lineWidth = o.lw ?? 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    uiCirc(e[0], e[1], (o.lw ?? 3) * 1.9); ctx.fillStyle = UI.surface; ctx.fill(); ctx.strokeStyle = UI.accent; ctx.stroke();
  } else P.forEach((p, i) => { const bh = Math.max(2, p.base - p.y), r = Math.min(p.w / 2, o.r ?? 7); ctx.beginPath(); ctx.moveTo(p.x - p.w / 2, p.base); ctx.lineTo(p.x - p.w / 2, p.base - bh + r); ctx.arcTo(p.x - p.w / 2, p.base - bh, p.x, p.base - bh, Math.min(r, bh)); ctx.arcTo(p.x + p.w / 2, p.base - bh, p.x + p.w / 2, p.base, Math.min(r, bh)); ctx.lineTo(p.x + p.w / 2, p.base); ctx.closePath(); ctx.fillStyle = i === o.hi ? UI.accent : soft; ctx.fill(); });
  if (o.labels) o.labels.forEach((s, i) => uiText(s, P[i].x, y + h - size * 0.2, size, i === o.hi ? UI.ink : UI.ink3, { align: 'center', weight: i === o.hi ? 700 : 500 }));
  if (o.value != null && o.hi != null) { const p = P[o.hi], s = String(o.value), vs = o.valueSize ?? size, tw = uiTextW(s, vs, 700), bw = tw + vs * 1.1, by = p.y - vs * 1.9 - 4; uiBox(p.x - bw / 2, by, bw, vs * 1.7, vs * 0.6, UI.ink); uiText(s, p.x, by + vs * 0.88, vs, '#ffffff', { align: 'center', weight: 700, base: 'middle' }); }
  ctx.restore(); return P;
}
// a skeleton loader bar with a shimmer that sweeps across o.sweep = [x0, x1] (share it between bars so they shimmer as one)
function uiSkeleton(x, y, w, h, o = {}) {
  const sw = o.sweep ?? [x, x + w], band = (sw[1] - sw[0]) * 0.45, bx = lerp(sw[0] - band, sw[1] + band, mod(TT * (o.speed ?? 0.85) + (o.ph ?? 0), 1));
  ctx.save(); uiRR(x, y, w, h, o.r ?? h / 2); ctx.fillStyle = o.c ?? uiMix(UI.fill, UI.fill2, 0.45); ctx.fill(); ctx.clip();
  const g = ctx.createLinearGradient(bx - band, 0, bx + band, 0); g.addColorStop(0, uiA('#ffffff', 0)); g.addColorStop(0.5, uiA('#ffffff', 0.85)); g.addColorStop(1, uiA('#ffffff', 0));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}
// a skeleton list row (avatar disc, two bars), the placeholder of uiRow
function uiSkelRow(x, y, w, h, o = {}) {
  const r = h * 0.3, pad = 16, sweep = o.sweep ?? [x, x + w], R = RNG('uiskel', o.key ?? y);
  uiSkeleton(x + pad, y + h / 2 - r, r * 2, r * 2, { r, sweep }); uiSkeleton(x + pad + r * 2 + 12, y + h / 2 - 13, w * R.r(0.3, 0.42), 11, { sweep }); uiSkeleton(x + pad + r * 2 + 12, y + h / 2 + 6, w * R.r(0.2, 0.28), 9, { sweep });
}
// a skeleton that resolves into content as k goes 0..1: skel() fades out, content() fades in with a short rise
function uiResolve(k, skel, content, rise = 6) { k = clamp(k); uiAlpha(1 - k, skel); if (k > 0.004) { ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * rise); content(); ctx.restore(); } }
// a pill chip, centred on (x, y) (o.align 'left' / 'right': that end sits on x). o: on (0..1 selected), size, dot, glyph, k (pop), shadow, fill, c
function uiChip(str, x, y, o = {}) {
  const size = o.size ?? 15, h = o.h ?? size * 2.05, pad = o.pad ?? size * 0.82, on = clamp(o.on ?? 0), lead = o.dot ? size * 0.85 : o.glyph ? size * 1.2 : 0, w = uiTextW(str, size, 600) + pad * 2 + lead, k = o.k ?? 1;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2; if (k <= 0.01) return w;
  ctx.save(); ctx.translate(x0 + w / 2, y); ctx.scale(k, k); ctx.translate(-x0 - w / 2, -y); ctx.globalAlpha *= clamp(k * 1.6);
  uiBox(x0, y - h / 2, w, h, h / 2, o.fill ?? uiMix(UI.fill, UI.accent, on), { shadow: o.shadow ?? 0, line: o.line });
  if (o.dot) { uiCirc(x0 + pad + size * 0.2, y, size * 0.26); ctx.fillStyle = UI.accent; ctx.fill(); }
  if (o.glyph) uiGlyph(o.glyph, x0 + pad + size * 0.4, y, size * 0.42, on > 0.5 ? '#ffffff' : UI.accent, { w: 0.28 });
  uiText(str, x0 + pad + lead, y + size * 0.04, size, on > 0.5 ? '#ffffff' : o.c ?? UI.ink, { weight: 600, base: 'middle' });
  ctx.restore(); return w;
}
// a floating label chip at (x, y) with a leader to the feature at (tx, ty). o: k (0..1+ pop), size, glyph
function uiCallout(str, x, y, tx, ty, o = {}) {
  const k = o.k ?? 1; if (k <= 0.01) return;
  const u = clamp(k), ex = lerp(x, tx, u), ey = lerp(y, ty, u);
  ctx.save(); ctx.globalAlpha *= clamp(k * 2); ctx.lineCap = 'round';
  for (const [c, lw] of [['#ffffff', 6], [UI.ink, 2.2]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.strokeStyle = c; ctx.lineWidth = uiHair(lw); ctx.stroke(); }
  uiCirc(ex, ey, uiHair(9)); ctx.fillStyle = '#ffffff'; ctx.fill(); uiCirc(ex, ey, uiHair(5.5)); ctx.fillStyle = UI.accent; ctx.fill();
  ctx.restore();
  uiChip(str, x, y, { size: o.size ?? 28, shadow: 2, fill: UI.surface, dot: !o.glyph, glyph: o.glyph, k, align: o.align });
}
// a notification banner that drops in from above on a spring; (x, y) = its resting top-left corner.
// o: t0 (when it drops), out (when it leaves), h, title, sub, glyph, drop (px it falls), size. Returns { x, y, w, h, k }
function uiToast(x, y, w, o = {}) {
  const h = o.h ?? 100, t0 = o.t0 ?? 0; if (!uiAt(t0)) return null;
  const s = springEase(TT - t0 + 1 / FPS, 230, 19), leave = o.out != null ? EZ.i2(seg(TT, o.out, o.out + 0.22)) : 0, drop = o.drop ?? h * 0.5;
  const yy = y - (1 - s) * drop - leave * drop, al = clamp((TT - t0 + 1 / FPS) / 0.1) * (1 - leave), size = o.size ?? h * 0.3, ic = h - 36; if (al <= 0.004) return null;
  ctx.save(); ctx.globalAlpha *= al; ctx.translate(x + w / 2, yy); ctx.scale(lerp(0.9, 1, clamp(s)), lerp(0.9, 1, clamp(s))); ctx.translate(-x - w / 2, -yy);
  uiBox(x, yy, w, h, o.r ?? h * 0.27, UI.surface, { shadow: 3, line: UI.line });
  uiBox(x + 18, yy + 18, ic, ic, ic * 0.27, UI.accent); uiGlyph(o.glyph ?? 'check', x + 18 + ic / 2, yy + 18 + ic / 2, ic * 0.27 * clamp(uiSpring(t0 + 0.12) * 1.02), '#ffffff', { w: 0.26 });
  const tx = x + 18 + ic + 18;
  uiText(o.title ?? '', tx, o.sub ? yy + h / 2 - size * 0.14 : yy + h / 2 + size * 0.34, size, UI.ink, { weight: 700 });
  if (o.sub) uiText(o.sub, tx, yy + h / 2 + size * 0.86, size * 0.76, UI.ink2);
  ctx.restore(); return { x, y: yy, w, h, k: s };
}

// ---------------------------------------------------------------------
//  the pointer: a cursor (browser) or a touch dot (phone) that follows waypoints
//  keys = [[t, x, y, 'click'?], ...] in world coords, sorted by t. It rests on a key until the next leg starts, travels
//  an eased arc, and arrives o.pause (0.12 s) before a click key's time, so it hovers before it clicks.
// ---------------------------------------------------------------------
function uiPathAt(keys, t, o = {}) {
  const pause = o.pause ?? 0.12; let p = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i], d = Math.hypot(b[1] - a[1], b[2] - a[2]), t1 = b[0] - (b[3] === 'click' ? pause : 0), t0 = Math.max(a[0] + (a[3] === 'click' ? 0.1 : 0), t1 - (o.travel ?? clamp(0.22 + d / 1500, 0.26, 0.6)));
    if (t <= t0) break;
    if (t < t1) {
      const u = EZ.io(seg(t, t0, t1)), side = (i % 2 ? 1 : -1) * (o.bend ?? 0.16), mx = (a[1] + b[1]) / 2 - (b[2] - a[2]) * side, my = (a[2] + b[2]) / 2 + (b[1] - a[1]) * side, q = 1 - u;
      return [q * q * a[1] + 2 * q * u * mx + u * u * b[1], q * q * a[2] + 2 * q * u * my + u * u * b[2], 1];
    }
    p = b;
  }
  return [p[1], p[2], 0];
}
// the click state at time t: n (clicks so far), since (seconds since the last one), at (where), down (0..1: pressed)
function uiClicks(keys, t = TT) {
  let n = 0, since = 1e9, at = null;
  for (const k of keys) if (k[3] === 'click' && t >= k[0] - 1e-6) { n++; since = t - k[0]; at = [k[1], k[2]]; }
  return { n, since, at, down: since < 0.085 ? 1 : 1 - EZ.o2(seg(since, 0.085, 0.24)) };
}
function uiRipple(c, r0, r1, o = {}) {   // the ring a click leaves
  if (!c.at || c.since > 0.5) return; const u = EZ.o3(c.since / 0.5);
  ctx.save(); uiCirc(c.at[0], c.at[1], lerp(r0, r1, u)); ctx.strokeStyle = uiA(o.c ?? UI.accent, 0.85 * (1 - u)); ctx.lineWidth = lerp(7, 1.5, u); ctx.stroke();
  uiCirc(c.at[0], c.at[1], lerp(r0, r1, u) * 0.62); ctx.fillStyle = uiA(o.c ?? UI.accent, 0.16 * (1 - u)); ctx.fill(); ctx.restore();
}
const UI_ARROW = [[0, 0], [0, 1], [0.235, 0.775], [0.4, 1.155], [0.535, 1.095], [0.375, 0.72], [0.705, 0.72]];
const uiArrowPts = (x, y, s, rot = 0) => xform(UI_ARROW.map(([px, py]) => [px - 0.3, py - 0.55]), x, y, rot, s);   // centred: a bridge shape, the hero's stand-in
// the arrow cursor. o: s (its height, 58), out (the time it fades), c. Returns { x, y, n, since, down, at }
function uiCursor(keys, o = {}) {
  const [x, y] = uiPathAt(keys, TT, o), c = uiClicks(keys), s = (o.s ?? 58) * (1 - 0.12 * c.down), al = clamp((TT - keys[0][0]) / 0.15 + 0.01) * (o.out != null ? 1 - seg(TT, o.out, o.out + 0.2) : 1);
  uiRipple(c, 8, 62);
  if (al > 0.004) {
    const P = UI_ARROW.map(([px, py]) => [x + px * s, y + py * s]);
    ctx.save(); ctx.globalAlpha *= al; uiShadow(() => uiPath(P), 2, { fill: UI.ink });
    uiPath(P); ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.13; ctx.stroke(); ctx.fillStyle = o.c ?? UI.ink; ctx.fill(); ctx.restore();
  }
  return { x, y, ...c };
}
// the touch dot. o: r (36), out. Same keys and return value as uiCursor
function uiTap(keys, o = {}) {
  const [x, y] = uiPathAt(keys, TT, o), c = uiClicks(keys), r = (o.r ?? 36) * (1 - 0.24 * c.down), al = clamp((TT - keys[0][0]) / 0.15 + 0.01) * (o.out != null ? 1 - seg(TT, o.out, o.out + 0.2) : 1);
  uiRipple(c, r * 0.6, r * 2.3);
  if (al > 0.004) {
    ctx.save(); ctx.globalAlpha *= al; uiShadow(() => uiCirc(x, y, r), 1, { fill: uiA(UI.ink, 0.3) });
    uiCirc(x, y, r); ctx.fillStyle = uiA(UI.ink, 0.26 + 0.2 * c.down); ctx.fill(); ctx.strokeStyle = uiA('#ffffff', 0.95); ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
  }
  return { x, y, ...c };
}
// a magnifier: the region of radius sr round (sx, sy) redrawn larger inside a round lens of radius dr at (dx, dy), with a
// ring on the source and a leader. draw() redraws what is under the source (the device; no captions, no pointer).
// o: k (0..1+ pop). Crisp, because it is a redraw and not a pixel copy.
function uiZoom(sx, sy, sr, dx, dy, dr, o = {}, draw) {
  const k = o.k ?? 1; if (k <= 0.01 || UI_LENS) return;
  const R = dr * Math.min(k, 1.15), a = Math.atan2(dy - sy, dx - sx), cs = Math.cos(a), sn = Math.sin(a), mag = dr / sr;
  ctx.save(); ctx.globalAlpha *= clamp(k * 2); ctx.lineCap = 'round';
  for (const [c, lw] of [['#ffffff', 7], [UI.accent, 2.6]]) {
    ctx.strokeStyle = c; ctx.lineWidth = uiHair(lw); ctx.beginPath(); ctx.moveTo(sx + cs * sr, sy + sn * sr); ctx.lineTo(lerp(sx + cs * sr, dx - cs * R, clamp(k)), lerp(sy + sn * sr, dy - sn * R, clamp(k))); ctx.stroke();
    uiCirc(sx, sy, sr); ctx.stroke();
  }
  uiShadow(() => uiCirc(dx, dy, R), 3);
  ctx.save(); uiCirc(dx, dy, R); ctx.clip(); ctx.fillStyle = UI.surface; ctx.fill();
  UI_LENS = true;
  try { uiCull(dx - R, dy - R, R * 2, R * 2, () => { ctx.translate(dx, dy); ctx.scale(mag * Math.min(k, 1.15), mag * Math.min(k, 1.15)); ctx.translate(-sx, -sy); draw(); }); } finally { UI_LENS = false; }
  ctx.restore();
  uiCirc(dx, dy, R); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = uiHair(9); ctx.stroke(); uiCirc(dx, dy, R + uiHair(4.5)); ctx.strokeStyle = uiA(UI.ink, 0.14); ctx.lineWidth = uiHair(1.5); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: a rounded app-icon tile in the accent, with a white glyph. s = its side.
//  o: glyph, bob (0..1: how much it floats), kick (a time: it jumps a little, e.g. when its app does something), rot, c
// ---------------------------------------------------------------------
const uiAppIconPts = (x, y, s) => rrectPts(x - s / 2, y - s / 2, s, s, s * 0.235, 8);
function uiAppIcon(x, y, s, o = {}) {
  const kt = o.kick != null && uiAt(o.kick) ? TT - o.kick : -1, kick = kt >= 0 ? Math.exp(-kt * 7) * Math.cos(kt * 22) : 0;
  const by = Math.sin(TT * TAU * 0.45 + (o.ph ?? 0)) * s * 0.022 * (o.bob ?? 1), c = o.c ?? UI.accent, k = (o.k ?? 1) * (1 + 0.1 * kick);
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y + by); ctx.rotate((o.rot ?? 0) + 0.05 * kick); ctx.scale(k, k);
  uiShadow(() => uiRR(-s / 2, -s / 2, s, s, s * 0.235), o.shadow ?? 3, { fill: c });
  uiRR(-s / 2, -s / 2, s, s, s * 0.235); ctx.fillStyle = c; ctx.fill();
  const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,20,0.1)'); ctx.fillStyle = g; ctx.fill();
  uiGlyph(o.glyph ?? 'check', 0, s * 0.01, s * 0.27, '#ffffff', { w: 0.27 });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size). They fade as a bridge starts and wait for the new era's
//  window to open.
// ---------------------------------------------------------------------
function uiBridgeK() {   // 1 outside bridges; falls to 0 over the first 0.2 s of a shrink; back to 1 once the new window has mostly opened
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d * 0.7) return TT < r.tc ? 1 - seg(TT, r.tc - d, r.tc - d + 0.2) : 0; }
  return 1;
}
function uiArrive() { if (typeof BRIDGES !== 'undefined') for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 0.05) return r.tc + (r.d ?? 0.6) * 0.7; return E0; }
// a caption: one bold line centred on CX, words rising in one after another; *starred words* take the accent.
// o: y (baseline), size, at (seconds after the era starts), dark, x
function uiCaption(str, o = {}) {
  const f = () => {
    const al = uiBridgeK(); if (al <= 0.004) return;
    const dark = o.dark ?? UI_DARKMODE, size = o.size ?? 62, y = o.y ?? (PORTRAIT ? 362 : H - 96), t0 = Math.max(E0 + (o.at ?? 0.2), uiArrive());
    const words = String(str).split(/(\*[^*]+\*)/).filter((g) => g.trim()).flatMap((g) => (g[0] === '*' ? g.slice(1, -1).trim().split(/\s+/).map((w) => ({ w, hi: true })) : g.trim().split(/\s+/).map((w) => ({ w, hi: false }))));
    ctx.save(); uiFont(size, 700); const sp = ctx.measureText(' ').width, ws = words.map((d) => ctx.measureText(d.w).width); ctx.restore();
    let x = (o.x ?? (typeof CX !== 'undefined' ? CX : W / 2)) - (ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1)) / 2;
    words.forEach((d, i) => {
      const s = uiSpring(t0 + i * 0.06, SPRING.smooth);
      if (s > 0.02) uiText(d.w, x, y + (1 - s) * size * 0.4, size, d.hi ? (dark ? uiMix(UI.accent, '#ffffff', 0.38) : UI.accent) : dark ? '#ffffff' : UI.ink, { weight: 700, a: al * clamp(s * 1.5) });
      x += ws[i] + sp;
    });
  };
  if (DEFER) DEFER.push(f); else f();
}
// a tag: a small pill above the caption (an accent dot and a label). o: y, size, at, dark, x
function uiTag(str, o = {}) {
  const f = () => {
    const al = uiBridgeK(), k = uiSpring(Math.max(E0 + (o.at ?? 0.1), uiArrive() - 0.05), SPRING.smooth); if (al <= 0.004 || k <= 0.02) return;
    const dark = o.dark ?? UI_DARKMODE;
    uiAlpha(al, () => uiChip(str, o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), o.y ?? (PORTRAIT ? 276 : 70), { size: o.size ?? 26, dot: true, k, fill: dark ? uiMix(UI.groundD, '#ffffff', 0.12) : UI.surface, c: dark ? '#ffffff' : UI.ink, line: dark ? null : UI.line, shadow: dark ? 0 : 1 }));
  };
  if (DEFER) DEFER.push(f); else f();
}

// =====================================================================
//  STYLE — the renderer's hooks. The morph happens on the bare studio ground; the bridge object is a rounded tile.
// =====================================================================
const STYLE = {
  name: 'ui-mockup',
  paper: UI.ground,
  backdrop(c) { ctx.save(); screen(); uiGround(c); ctx.restore(); },      // the studio in colour c (a hex, or rgb() mid-morph), with its light
  window(P, key, src) {                                                  // the era seen through the object's outline: a screen with a shadow and a hairline
    const bb = bbox(P), small = bb.x1 - bb.x0 < W * 1.5 && bb.y1 - bb.y0 < H * 1.5;
    if (small) uiShadow(() => uiPath(P), 3, { fill: UI.surface });
    ctx.save(); uiPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    if (small) { ctx.save(); uiPath(P); ctx.strokeStyle = uiA(UI.ink, 0.1); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
  },
  blob(P, c, key, u = 0) {                                               // the tile itself: a flat accent surface, soft shadow, its glyph fading as it changes
    const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, s = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0), k = 1 + 0.04 * Math.sin(Math.PI * clamp(u));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
    uiShadow(() => uiPath(P), 3, { fill: c }); uiPath(P); ctx.fillStyle = c; ctx.fill();
    const g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1); g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,20,0.1)'); ctx.fillStyle = g; ctx.fill();
    uiAlpha(1 - smooth(0.1, 0.6, u), () => uiGlyph('check', cx, cy, s * 0.27, '#ffffff', { w: 0.27 }));
    ctx.restore();
  },
  hero(x, y, r, o = {}) { uiAppIcon(x, y, r * 1.7, { ph: (o.key || '').length }); },   // r = half the hero's size
  heroColor: UI.accent,
  heroPts(x, y, r) { return uiAppIconPts(x, y, r * 1.7); },
  post() {                                                               // the studio's falloff: corners a touch darker, nothing else (the look is clean)
    const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.55, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, 'rgba(14,16,28,0)'); g.addColorStop(1, 'rgba(14,16,28,0.075)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
  ones: true,                                                            // UI motion is crisp: on 1s
};
