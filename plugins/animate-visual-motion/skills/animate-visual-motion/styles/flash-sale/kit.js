// =====================================================================
//  styles/flash-sale/kit.js — FLASH-SALE: the loud online-marketplace campaign banner come alive. Built on kit/core.js.
//  A hot gradient ground with slowly turning sunrays, halftone dot corners, falling confetti / coins and twinkles.
//  Every object is a glossy, slightly 3D "plate": a vertical gradient fill, a thick WHITE outline (FS.ow px, constant
//  on screen), a top gloss highlight and a SOFT drop shadow; big objects also get a darker extrusion (o.depth).
//  Type is bold italic, white-stroked, on a darker extrusion (fsText). The promo furniture: a product card with a
//  product pictogram drawn in code, stars, a struck old price and a big new price; a jagged starburst discount
//  badge; a hanging price tag on a string; a perforated coupon; the two-line lockup with a bolt; a flip-digit
//  countdown; a stock bar; a free-shipping truck pill; a pulsing CTA button with a tapping hand.
//  Brand-free: every word, price and currency is passed in by the piece; the kit hardcodes none.
//  Motion on 1s, fast and punchy. Times given to fsSlam / fsPop / `at` are the moment of IMPACT, not the start.
//  Coordinates: containers (fsBox, fsCard, fsCoupon, fsStock) take a top-left corner; objects (fsBurst, fsButton,
//  fsShip, fsTimer, fsBolt, fsProduct, fsHero) take their centre; fsText takes a baseline; fsTag takes its nail.
//  Needs from the piece head: CX (caption centre x). Optional piece constants (declare before the kit):
//  FS_PRESET ('hot' | 'berry' | 'ice'), FS_OW (outline px), FS_SH (shadow drop px).
// =====================================================================
const FS_PRESETS = {
  hot: { g0: '#ff1f3d', g1: '#ff8a00', glow: '#ffd23a', deep: '#8f0020', bg: '#ff4a1c' },     // red -> orange
  berry: { g0: '#ff2d8f', g1: '#6a21e8', glow: '#ff9ad5', deep: '#3f0b8f', bg: '#b02bc8' },   // magenta -> violet
  ice: { g0: '#1230c8', g1: '#12c2f0', glow: '#9af0ff', deep: '#061a6e', bg: '#1478dc' },     // deep blue -> cyan
};
const FS = {
  white: '#ffffff', ink: '#2b0a1e', mute: '#8d7f8c', line: '#efe3ea',
  red: '#f0142f', redD: '#96001c', orange: '#ff6a00', gold: '#ffc21a', goldD: '#e07a00', goldL: '#fff3a8',
  pink: '#ff2d8f', violet: '#6a21e8', blue: '#1e6bff', cyan: '#12c2f0', green: '#10b56a', greenD: '#087a45',
  night: '#24103a', nightL: '#40216a',
  hero: '#ffe81a', heroD: '#ff8a00',                           // lemon: reserved for the bolt mascot
  paper: '#ff6a14',                                            // the morph's blank sheet (a ground in between)
  shadow: 'rgba(48,0,32,0.36)',
  ow: typeof FS_OW !== 'undefined' ? FS_OW : 8,                // white outline, screen px
  sh: typeof FS_SH !== 'undefined' ? FS_SH : 16,               // soft shadow drop, screen px
  blur: 26,
  preset: typeof FS_PRESET !== 'undefined' ? FS_PRESET : 'hot',
};
const FS_FONT = '"Arial Black", "Helvetica Neue", "Segoe UI Black", "Segoe UI", Impact, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
const FS_UI = '"Helvetica Neue", "Segoe UI", Roboto, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
const FS_CAP = 0.716;                                          // cap height of the stack, in em

// ---- small things every helper uses
function fsZoom() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }   // outlines stay FS.ow on screen
function fsRGB(c) {
  let m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c); if (m) return m.slice(1).map((h) => parseInt(h, 16));
  m = /^rgba?\(([^)]+)\)/.exec(c); if (m) return m[1].split(',').slice(0, 3).map(Number);
  return [255, 255, 255];
}
const fsMix = (a, b, k) => { const x = fsRGB(a), y = fsRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',')})`; };
const fsLite = (c, k) => fsMix(c, '#ffffff', k);
const fsDark = (c, k) => fsMix(c, '#1a0010', k);
const fsA = (c, a) => `rgba(${fsRGB(c).join(',')},${a})`;
const fsPre = (name) => FS_PRESETS[name ?? FS.preset] ?? FS_PRESETS.hot;
function fsVGrad(y0, y1, a, b, mid) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); if (mid) g.addColorStop(0.55, mid); g.addColorStop(1, b); return g; }
function fsFont(size, o = {}) { ctx.font = `${o.italic === false ? '' : 'italic '}${o.weight ?? 900} ${size}px ${o.font ?? FS_FONT}`; }
function fsTextW(str, size, o = {}) { ctx.save(); fsFont(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function fsPath(P) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
const fsPoly = (U, x, y, r, rot = 0, kx = 1) => { const c = Math.cos(rot), s = Math.sin(rot); return U.map(([u, v]) => [x + (u * kx * c - v * s) * r, y + (u * kx * s + v * c) * r]); };
// 1234567 -> '1.234.567' (the separator is the piece's choice; the currency is written by the piece)
const fsFmt = (n, sep = '.') => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

// ---- motion: all closed-form, so any frame draws on its own
// a block slams in from off-frame and LANDS at time t, then carries a few px past and snaps back. Returns [dx, dy].
function fsSlam(t, from = 'l', o = {}) {
  const d = o.d ?? 0.17, far = o.dist ?? 1500, over = o.over ?? 22, u = TT - (t - d);
  const dir = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] }[from];
  let k;
  if (u <= 0) k = far; else if (u < d) k = far * (1 - (u / d) ** 1.7); else k = -over * Math.exp(-(u - d) * 16) * Math.sin((u - d) * 30);
  return [dir[0] * k, dir[1] * k];
}
// a pop: nothing before, small two frames before t, biggest ON t (1 + over), then it springs back to 1. Returns a scale.
function fsPop(t, o = {}) {
  const pre = o.pre ?? 0.085, over = o.over ?? 0.2, u = TT - t;
  if (u < -pre - 1e-6) return 0;
  if (u < 0) return lerp(0.3, 1 + over, ((u + pre) / pre) ** 0.7);
  return 1 + over * Math.exp(-u * 13) * Math.cos(u * 30);
}
// the rotation wobble that follows a pop at t
const fsWob = (t, amp = 0.22) => { const u = TT - t; return u < 0 ? 0 : amp * Math.exp(-u * 8) * Math.sin(u * 28); };
// a beat pulse: 1 + amt on every beat, decaying (the CTA breathes with the music)
const fsPulse = (per = 0.5, amt = 0.06, t0 = 0) => 1 + amt * Math.exp(-mod(TT - t0, per) * 9);
// a press envelope 0..1 for taps at each time in `times`
function fsPress(times, hold = 0.1) {
  let p = 0;
  for (const t of [].concat(times)) { const u = TT - t; p = Math.max(p, u < -0.05 ? 0 : u < -1e-6 ? 0.5 : u < hold ? 1 : 1 - seg(u, hold, hold + 0.085)); }
  return p;
}
// a number that runs from a to b over [t0, t1], fast then settling (a discount counting up, a price dropping)
const fsCount = (t0, t1, a, b) => lerp(a, b, EZ.o3(seg(TT, t0, t1)));
// a pendulum angle: kicked at t (amp radians), dying down to a small idle sway
function fsSwing(t = 0, o = {}) {
  const u = Math.max(0, TT - t), f = o.f ?? 0.9;
  return (o.amp ?? 0.42) * Math.exp(-u * (o.damp ?? 1.1)) * Math.cos(u * TAU * f) + (o.idle ?? 0.045) * Math.sin(TT * TAU * 0.5);
}
function fsInBridge(pad = 0) {   // is the renderer inside a morph bridge? (captions hide there)
  if (typeof BRIDGES === 'undefined') return false;
  return BRIDGES.some((r) => Math.abs(TT - r.tc) < (r.d ?? 0.6) + pad - 1e-6);
}

// ---- the plate: THE primitive. A path gets a soft shadow, an optional darker extrusion, a white outline, a
// gradient fill and a top gloss. path() must begin and build the path; bb = its bounding box { x0, y0, x1, y1 }.
// o: ow (outline px; 0 = none), line (outline colour), depth (extrusion px), ext (its colour), sh / blur / shc (shadow),
//    shadow: false, gloss: false, flat (no gradient), c0 / c1 (top / bottom colours), fill (a ready fillStyle)
function fsPlate(path, c, bb, o = {}) {
  const z = fsZoom(), ow = (o.ow ?? FS.ow) / z, dep = (o.depth ?? 0) / z, line = o.line ?? FS.white;
  const shadow = () => { if (o.shadow === false) return; ctx.shadowColor = o.shc ?? FS.shadow; ctx.shadowBlur = o.blur ?? FS.blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = o.sh ?? FS.sh; };
  ctx.save(); ctx.lineJoin = o.join ?? 'round'; ctx.lineCap = 'round';
  if (dep > 0) {
    const n = Math.max(1, Math.ceil(dep * z / 3)), ext = o.ext ?? fsDark(c, 0.42);
    for (let i = n; i >= 1; i--) {
      const k = dep * i / n; ctx.save(); ctx.translate(k * 0.35, k); path(); ctx.fillStyle = ctx.strokeStyle = ext; ctx.lineWidth = ow * 2;
      if (i === n) { ctx.save(); shadow(); ctx.fill(); ctx.restore(); } else ctx.fill();
      if (ow > 0) ctx.stroke(); ctx.restore();
    }
  }
  path(); ctx.fillStyle = ctx.strokeStyle = line; ctx.lineWidth = ow * 2;
  if (dep <= 0) { ctx.save(); shadow(); ctx.fill(); ctx.restore(); }
  if (ow > 0) ctx.stroke();
  path(); ctx.fillStyle = o.fill ?? (o.flat ? c : fsVGrad(bb.y0, bb.y1, o.c0 ?? fsLite(c, 0.28), o.c1 ?? fsDark(c, 0.16), c)); ctx.fill();
  if (o.gloss !== false) {
    const hh = bb.y1 - bb.y0, g = ctx.createLinearGradient(0, bb.y0, 0, bb.y0 + hh * 0.5);
    g.addColorStop(0, `rgba(255,255,255,${o.glossA ?? 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); path(); ctx.clip(); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse((bb.x0 + bb.x1) / 2, bb.y0, (bb.x1 - bb.x0) * 0.64, hh * 0.46, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
// a rounded box as a plate. x, y = top-left. o: r, rot (about the centre), s (scale about the centre), press 0..1,
//    draw(w, h): content in the box's own frame (origin top-left), clipped to it unless clip: false; + fsPlate's options
function fsBox(x, y, w, h, c, o = {}) {
  const s = o.s ?? 1; if (s <= 0 || w <= 0 || h <= 0) return;
  const r = Math.min(o.r ?? 28, w / 2, h / 2), pr = clamp(o.press ?? 0), dep = o.depth ?? 0;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); if (o.rot) ctx.rotate(o.rot); if (s !== 1) ctx.scale(s, s);
  const path = () => { ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); };
  if (pr > 0 && dep > 0) ctx.translate(dep * 0.35 * pr * 0.7, dep * pr * 0.7);
  fsPlate(path, c, { x0: -w / 2, y0: -h / 2, x1: w / 2, y1: h / 2 }, pr > 0 && dep > 0 ? { ...o, depth: dep * (1 - pr * 0.7) } : o);
  if (o.draw) { ctx.save(); if (o.clip !== false) { path(); ctx.clip(); } ctx.translate(-w / 2, -h / 2); o.draw(w, h); ctx.restore(); }
  ctx.restore();
}
// any outline P (world points) as a plate (pictograms, the morph blob). o: fsPlate's options
function fsShape(P, c, o = {}) { const bb = bbox(P); fsPlate(() => fsPath(P), c, bb, o); }

// ---- type: bold italic, a white stroke, a darker extrusion and a soft shadow. y = baseline. Returns the drawn width.
// o: align, rot, s (scale about the centre), maxW (shrinks to fit), stroke (px; 0 = none), sc (stroke colour),
//    depth (extrusion px), ext (its colour), grad ([top, bottom] fill), shadow: false,
//    plain: true (flat type for cards and labels: no stroke, extrusion or shadow), italic: false, weight, font
function fsText(str, x, y, size, color, o = {}) {
  let sz = size, w = fsTextW(str, sz, o);
  if (o.maxW && w > o.maxW) { sz *= o.maxW / w; w = o.maxW; }
  const al = o.align ?? 'left', x0 = al === 'center' ? -w / 2 : al === 'right' ? -w : 0, s = o.s ?? 1;
  if (s <= 0) return w;
  { const [sx, sy] = toScreen(x, y), k = fsZoom(), m = sz * 0.5 * k, l = sx + x0 * k; if (l + w * k + m < 0 || l - m > ctx.canvas.width || sy + m < 0 || sy - sz * k - m > ctx.canvas.height) return w; }   // wholly off-frame (mid-slam)
  ctx.save(); ctx.translate(x, y);
  if (o.rot || s !== 1) { ctx.translate(x0 + w / 2, -sz * FS_CAP / 2); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s); ctx.translate(-(x0 + w / 2), sz * FS_CAP / 2); }
  fsFont(sz, o); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  if (!o.plain) {
    const z = fsZoom(), sw = o.stroke ?? sz * 0.1, dep = o.depth ?? sz * 0.075, ext = o.ext ?? fsPre().deep, n = Math.max(1, Math.ceil(dep * z / 3));
    ctx.fillStyle = ctx.strokeStyle = ext; ctx.lineWidth = Math.max(sw, 1);
    for (let i = n; i >= 1; i--) {
      const k = dep * i / n;
      if (i === n && o.shadow !== false) { ctx.save(); ctx.shadowColor = FS.shadow; ctx.shadowBlur = FS.blur * 0.8; ctx.shadowOffsetY = FS.sh * 0.8; ctx.strokeText(str, x0 + k * 0.35, k); ctx.restore(); } else ctx.strokeText(str, x0 + k * 0.35, k);
      ctx.fillText(str, x0 + k * 0.35, k);
    }
    if (sw > 0) { ctx.strokeStyle = o.sc ?? FS.white; ctx.lineWidth = sw; ctx.strokeText(str, x0, 0); }
    ctx.fillStyle = o.grad ? fsVGrad(-sz * FS_CAP, 0, o.grad[0], o.grad[1]) : color;
  } else ctx.fillStyle = color;
  ctx.fillText(str, x0, 0);
  ctx.restore(); return w;
}

// ---- the ground: a diagonal hot gradient, a glow, sunray stripes turning about (cx, cy), halftone dot corners.
// o: preset, g0 / g1 / glow (override the colours), cx, cy, rays (count), speed (rad/s), rayA, dots: false, dotA
function fsGround(o = {}) {
  const p = fsPre(o.preset), g0 = o.g0 ?? p.g0, g1 = o.g1 ?? p.g1, cx = o.cx ?? W / 2, cy = o.cy ?? H * 0.42;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H); g.addColorStop(0, g0); g.addColorStop(1, g1);
  ctx.fillStyle = g; ctx.fillRect(-W * 2, -H * 2, W * 5, H * 5);
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 980); rg.addColorStop(0, fsA(o.glow ?? p.glow, 0.62)); rg.addColorStop(1, fsA(o.glow ?? p.glow, 0));
  ctx.fillStyle = rg; ctx.fillRect(-W * 2, -H * 2, W * 5, H * 5);
  const n = o.rays ?? 14, rot = (o.rot ?? 0) + TT * (o.speed ?? 0.3), far = 3200, ra = o.rayA ?? 0.15;
  const wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1500); wg.addColorStop(0, 'rgba(255,255,255,0)'); wg.addColorStop(0.2, `rgba(255,255,255,${ra})`); wg.addColorStop(1, `rgba(255,255,255,${ra * 0.55})`);
  ctx.fillStyle = wg; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a0 = rot + i / n * TAU, a1 = a0 + TAU / n / 2; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * far, cy + Math.sin(a0) * far); ctx.lineTo(cx + Math.cos(a1) * far, cy + Math.sin(a1) * far); ctx.closePath(); }
  ctx.fill();
  if (o.dots !== false) {                                    // halftone corners: dots shrink away from the corner, and breathe
    const st = 38, reach = o.dotR ?? 620; ctx.fillStyle = `rgba(255,255,255,${o.dotA ?? 0.2})`; ctx.beginPath();
    for (const [qx, qy] of [[0, 0], [W, H]]) {
      let j = 0;
      for (let dy = 0; dy < reach; dy += st * 0.866, j++) for (let dx = (j % 2) * st / 2; dx < reach; dx += st) {
        const d = Math.hypot(dx, dy); if (d > reach) continue;
        const r = 15 * (1 - d / reach) * (1 + 0.14 * Math.sin(TT * TAU * 0.5 - d * 0.012)); if (r < 1.2) continue;
        const px = qx ? qx - dx : dx, py = qy ? qy - dy : dy; ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU);
      }
    }
    ctx.fill();
  }
  ctx.restore();
}

// ---- air: confetti, coins and twinkles (background life)
// falling confetti and coins over the whole frame. o: key, n, coins (how many of the n are coins), colors, speed (x), a
function fsConfetti(o = {}) {
  const n = o.n ?? 24, coins = o.coins ?? 6, key = o.key ?? 'c', cols = o.colors ?? [FS.white, FS.gold, FS.cyan, FS.pink, FS.goldL], sp = o.speed ?? 1, span = H + 260;
  ctx.save(); ctx.globalAlpha = o.a ?? 1;
  for (let i = 0; i < n; i++) {
    const R = RNG('fsconf', key, i), x0 = R.r(-40, W + 40), v = R.r(150, 340) * sp, ph = R.r(0, span), sz = R.r(16, 30), col = R.pick(cols), spin = R.r(2.5, 6) * (R.f() < 0.5 ? -1 : 1), sway = R.r(12, 44), sf = R.r(0.9, 2.2), kind = R.i(0, 2);
    const y = mod(ph + v * TT, span) - 130, x = x0 + Math.sin(TT * sf + i) * sway, flip = Math.cos(TT * spin + i * 1.7);
    ctx.save(); ctx.translate(x, y);
    if (i < coins) {
      const r = sz * 0.72; ctx.scale(Math.max(0.16, Math.abs(flip)), 1);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = fsVGrad(-r, r, FS.goldL, FS.goldD, FS.gold); ctx.fill(); ctx.lineWidth = r * 0.16; ctx.strokeStyle = FS.goldD; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.56, 0, TAU); ctx.lineWidth = r * 0.12; ctx.strokeStyle = fsA(FS.white, 0.75); ctx.stroke();
    } else {
      ctx.rotate(TT * spin * 0.35 + i); ctx.scale(1, flip); ctx.fillStyle = col;
      if (kind === 0) ctx.fillRect(-sz / 2, -sz * 0.3, sz, sz * 0.6);
      else if (kind === 1) { ctx.beginPath(); ctx.moveTo(-sz * 0.5, sz * 0.4); ctx.lineTo(0, -sz * 0.5); ctx.lineTo(sz * 0.5, sz * 0.4); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.roundRect(-sz * 0.7, -sz * 0.14, sz * 1.4, sz * 0.28, sz * 0.14); ctx.fill(); }
    }
    ctx.restore();
  }
  ctx.restore();
}
// a burst of confetti thrown from (x, y) at time t (a price lands, a tap registers). o: n, v (speed), life, key, colors
function fsPopper(x, y, t, o = {}) {
  const u = TT - t, life = o.life ?? 1.1; if (u < 0 || u > life) return;
  const n = o.n ?? 26, cols = o.colors ?? [FS.white, FS.gold, FS.cyan, FS.pink, FS.goldL];
  ctx.save(); ctx.globalAlpha = 1 - seg(u, life * 0.6, life);
  for (let i = 0; i < n; i++) {
    const R = RNG('fspop', o.key ?? 'p', i), a = R.r(-Math.PI * 0.95, -Math.PI * 0.05), v = R.r(0.45, 1) * (o.v ?? 900), sz = R.r(12, 24), col = R.pick(cols), spin = R.r(4, 9);
    const k = 1 - Math.exp(-u * 3.2), px = x + Math.cos(a) * v * k / 3.2, py = y + Math.sin(a) * v * k / 3.2 + 620 * u * u;
    ctx.save(); ctx.translate(px, py); ctx.rotate(u * spin + i); ctx.scale(1, Math.cos(u * spin * 1.3 + i)); ctx.fillStyle = col; ctx.fillRect(-sz / 2, -sz * 0.3, sz, sz * 0.6); ctx.restore();
  }
  ctx.restore();
}
// one four-point twinkle at (x, y): it swells and shrinks. o: f (twinkles per second), ph (phase 0..1), c
function fsSparkle(x, y, r, o = {}) {
  const k = Math.max(0, Math.sin((TT * (o.f ?? 1) + (o.ph ?? 0)) * TAU)) ** 2; if (k < 0.04) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.4); star4(x, y, r * k, o.c ?? FS.white); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r * k * 0.14, 0, TAU); ctx.fillStyle = o.c ?? FS.white; ctx.fill(); ctx.restore();
}
// n twinkles scattered over an area. o: key, x0, y0, x1, y1, r ([min, max])
function fsSparkles(n = 8, o = {}) {
  for (let i = 0; i < n; i++) { const R = RNG('fsspk', o.key ?? 's', i); fsSparkle(R.r(o.x0 ?? 40, o.x1 ?? W - 40), R.r(o.y0 ?? 120, o.y1 ?? H - 200), R.r(...(o.r ?? [22, 46])), { f: R.r(0.5, 1.1), ph: R.f() }); }
}
// a diagonal gloss band that crosses a w x h box once, starting at time t. Call it inside a box's draw() (it is clipped).
function fsSweep(w, h, t, o = {}) {
  const u = (TT - t) / (o.d ?? 0.45); if (u <= 0 || u >= 1) return;
  const bw = w * (o.bw ?? 0.26), x = lerp(-bw - h * 0.4, w + h * 0.4, u), g = ctx.createLinearGradient(x, 0, x + bw, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${o.a ?? 0.55})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.transform(1, 0, -0.4, 1, h * 0.2, 0); ctx.fillStyle = g; ctx.fillRect(x, -h, bw, h * 3); ctx.restore();
}

// ---- pictograms
const FS_BOLT = [[0.3, -1], [-0.62, 0.1], [-0.12, 0.1], [-0.36, 1], [0.66, -0.2], [0.14, -0.2], [0.6, -1]];
const FS_STAR5 = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * TAU - Math.PI / 2, k = i % 2 ? 0.46 : 1; return [Math.cos(a) * k, Math.sin(a) * k]; });
// a glossy lightning bolt (no face: the mascot is fsHero). x, y = centre, r = half its height. o: rot, s, depth, ow, flat
function fsBolt(x, y, r, c, o = {}) {
  const P = fsPoly(FS_BOLT, x, y, r * (o.s ?? 1), o.rot ?? 0, 1.08); if (r <= 0 || (o.s ?? 1) <= 0) return;
  if (o.flat) { ctx.save(); fsPath(P); ctx.fillStyle = c; ctx.fill(); ctx.restore(); return; }
  fsShape(P, c ?? FS.gold, { depth: o.depth ?? r * 0.08, ext: o.ext ?? FS.goldD, ow: o.ow, join: 'round', ...o });
}
// a row of five rating stars, filled to `rating` (0..5). x = left, y = centre line, size = one star. Returns its width.
// o: at (they pop in one by one from that time), c, off
function fsStars(x, y, size, rating = 5, o = {}) {
  const pitch = size * 1.14;
  for (let i = 0; i < 5; i++) {
    const s = o.at != null ? fsPop(o.at + i * 0.042, { over: 0.35 }) : 1; if (s <= 0) continue;
    const P = fsPoly(FS_STAR5, x + size / 2 + i * pitch, y, size / 2 * s, 0), f = clamp(rating - i);
    ctx.save(); fsPath(P); ctx.fillStyle = o.off ?? '#e9dfe6'; ctx.fill();
    if (f > 0) { ctx.clip(); ctx.fillStyle = fsVGrad(y - size / 2, y + size / 2, '#ffd94a', '#ff9d00'); ctx.fillRect(x + i * pitch - size * 0.1, y - size, size * (0.1 + f), size * 2); }
    ctx.restore();
  }
  return pitch * 4 + size;
}
// a struck-through old price. y = baseline. o: strike 0..1 (the line draws across), c, lc (line colour), align, font
function fsOld(str, x, y, size, o = {}) {
  const fo = { plain: true, italic: false, weight: 700, font: FS_UI, ...o }, w = fsText(str, x, y, size, o.c ?? FS.mute, fo);
  const k = clamp(o.strike ?? 1), x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (k > 0) { ctx.save(); ctx.strokeStyle = o.lc ?? FS.red; ctx.lineWidth = Math.max(3, size * 0.11); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 - size * 0.12, y - size * 0.26); ctx.lineTo(x0 - size * 0.12 + (w + size * 0.24) * k, y - size * 0.42); ctx.stroke(); ctx.restore(); }
  return w;
}
// an old price over a big new one. x = left (or the centre / right with o.align), y = the NEW price's baseline.
// o: old, now (strings written by the piece), size (the new price), oldSize, strike, c, ext, s (the new price's scale)
function fsPrice(x, y, o = {}) {
  const size = o.size ?? 90;
  if (o.old) fsOld(o.old, x, y - size * 1.0, o.oldSize ?? size * 0.38, { strike: o.strike, align: o.align });
  return fsText(o.now ?? '', x, y, size, o.c ?? FS.red, { stroke: 0, depth: size * 0.06, ext: o.ext ?? FS.redD, shadow: false, align: o.align, maxW: o.maxW, s: o.s });
}
// invented product pictograms, drawn in a unit box (x, y = centre, r = half its size): sneaker | headphones | bag |
// bottle | blender. o: c (main colour), c2 (accent), rot, s
const FS_PRODUCTS = {
  sneaker(c, c2, dk, lt) {
    const fl = () => { ctx.fillStyle = 'rgba(60,0,40,0.16)'; ctx.beginPath(); ctx.ellipse(0.02, 0.66, 1.0, 0.07, 0, 0, TAU); ctx.fill(); }; fl();
    const up = () => { ctx.beginPath(); ctx.moveTo(-0.95, 0.42); ctx.lineTo(-0.97, -0.2); ctx.quadraticCurveTo(-0.97, -0.56, -0.72, -0.53); ctx.quadraticCurveTo(-0.55, -0.5, -0.5, -0.3); ctx.quadraticCurveTo(-0.38, -0.14, -0.2, -0.3); ctx.lineTo(-0.05, -0.5); ctx.quadraticCurveTo(0.05, -0.58, 0.13, -0.46); ctx.quadraticCurveTo(0.42, -0.1, 0.8, 0.06); ctx.quadraticCurveTo(1.0, 0.15, 1.0, 0.42); ctx.closePath(); };
    up(); ctx.fillStyle = fsVGrad(-0.55, 0.42, lt, dk, c); ctx.fill();
    ctx.save(); up(); ctx.clip();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(0.98, 0.44, 0.44, 0.34, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1, 0.46); ctx.lineTo(-1, -0.12); ctx.quadraticCurveTo(-0.7, -0.06, -0.6, 0.46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.moveTo(-0.5, 0.44); ctx.lineTo(-0.28, 0.44); ctx.lineTo(0.02, -0.1); ctx.lineTo(-0.15, -0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(0.5, 0, 0.26, 0.07, 0.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = FS.white; ctx.lineWidth = 0.055; for (let i = 0; i < 4; i++) { const px = 0.0 + 0.105 * i, py = -0.38 + 0.085 * i; ctx.beginPath(); ctx.moveTo(px + 0.03, py - 0.03); ctx.lineTo(px - 0.1, py + 0.14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-0.99, 0.36); ctx.lineTo(1.01, 0.36); ctx.quadraticCurveTo(1.05, 0.61, 0.82, 0.61); ctx.lineTo(-0.85, 0.61); ctx.quadraticCurveTo(-1.02, 0.61, -0.99, 0.36); ctx.closePath();
    ctx.fillStyle = fsVGrad(0.36, 0.61, '#ffffff', '#e2d8e4'); ctx.fill(); ctx.lineWidth = 0.02; ctx.strokeStyle = 'rgba(60,0,40,0.2)'; ctx.stroke();
    ctx.strokeStyle = c2; ctx.lineWidth = 0.045; ctx.beginPath(); ctx.moveTo(-0.94, 0.48); ctx.lineTo(0.98, 0.48); ctx.stroke();
  },
  headphones(c, c2, dk, lt) {
    ctx.fillStyle = 'rgba(60,0,40,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0.95, 0.85, 0.07, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 0.17; ctx.beginPath(); ctx.arc(0, 0.08, 0.76, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.045; ctx.beginPath(); ctx.arc(0, 0.08, 0.8, Math.PI * 1.2, Math.PI * 1.48); ctx.stroke();
    ctx.strokeStyle = dk; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.arc(0, 0.08, 0.675, Math.PI * 1.3, Math.PI * 1.7); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#3a2a44'; ctx.beginPath(); ctx.roundRect(s * 0.5 - 0.1, 0.2, 0.2, 0.64, 0.1); ctx.fill();
      ctx.fillStyle = fsVGrad(0.1, 0.92, lt, dk, c); ctx.beginPath(); ctx.roundRect(s * 0.76 - 0.2, 0.1, 0.4, 0.82, 0.18); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(s * 0.78, 0.52, 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(s * 0.76 - 0.1, 0.34, 0.04, 0.15, 0, 0, TAU); ctx.fill();
    }
  },
  bag(c, c2, dk, lt) {
    ctx.fillStyle = 'rgba(60,0,40,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0.93, 0.86, 0.07, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = dk; ctx.lineWidth = 0.09; ctx.beginPath(); ctx.ellipse(0, -0.28, 0.36, 0.56, 0, Math.PI, TAU); ctx.stroke();
    const body = () => { ctx.beginPath(); ctx.moveTo(-0.62, -0.3); ctx.lineTo(0.62, -0.3); ctx.lineTo(0.8, 0.78); ctx.quadraticCurveTo(0.8, 0.9, 0.68, 0.9); ctx.lineTo(-0.68, 0.9); ctx.quadraticCurveTo(-0.8, 0.9, -0.8, 0.78); ctx.closePath(); };
    body(); ctx.fillStyle = fsVGrad(-0.3, 0.9, lt, dk, c); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.beginPath(); ctx.moveTo(-0.9, -0.34); ctx.lineTo(0.9, -0.34); ctx.lineTo(0.74, 0.0); ctx.quadraticCurveTo(0, 0.36, -0.74, 0.0); ctx.closePath(); ctx.fillStyle = fsVGrad(-0.3, 0.2, fsLite(c2, 0.35), c2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(-0.56, -0.3); ctx.lineTo(-0.42, -0.3); ctx.lineTo(-0.54, 0.9); ctx.lineTo(-0.72, 0.9); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = FS.white; ctx.beginPath(); ctx.arc(0, 0.17, 0.11, 0, TAU); ctx.fill(); ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(0, 0.17, 0.055, 0, TAU); ctx.fill();
  },
  bottle(c, c2, dk, lt) {
    ctx.fillStyle = 'rgba(60,0,40,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0.95, 0.5, 0.06, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e9e2ee'; ctx.fillRect(-0.16, -0.8, 0.32, 0.18);
    ctx.fillStyle = fsVGrad(-1, -0.76, fsLite(c2, 0.35), c2); ctx.beginPath(); ctx.roundRect(-0.23, -1, 0.46, 0.25, 0.07); ctx.fill();
    const body = () => { ctx.beginPath(); ctx.moveTo(-0.16, -0.66); ctx.quadraticCurveTo(-0.44, -0.6, -0.44, -0.3); ctx.lineTo(-0.44, 0.8); ctx.quadraticCurveTo(-0.44, 0.94, -0.3, 0.94); ctx.lineTo(0.3, 0.94); ctx.quadraticCurveTo(0.44, 0.94, 0.44, 0.8); ctx.lineTo(0.44, -0.3); ctx.quadraticCurveTo(0.44, -0.6, 0.16, -0.66); ctx.closePath(); };
    body(); ctx.fillStyle = fsVGrad(-0.66, 0.94, lt, dk, c); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = FS.white; ctx.fillRect(-0.5, -0.08, 1, 0.54);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0.0); ctx.quadraticCurveTo(0.2, 0.24, 0, 0.3); ctx.quadraticCurveTo(-0.2, 0.24, 0, 0.0); ctx.fill();
    ctx.fillStyle = '#d9cfd8'; ctx.fillRect(-0.24, 0.35, 0.48, 0.04);
    ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.beginPath(); ctx.roundRect(-0.34, -0.42, 0.09, 1.2, 0.045); ctx.fill();
    ctx.restore();
  },
  blender(c, c2, dk, lt) {
    ctx.fillStyle = 'rgba(60,0,40,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0.95, 0.72, 0.07, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e9e2ee'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(0.48, -0.56); ctx.quadraticCurveTo(0.9, -0.52, 0.84, -0.12); ctx.quadraticCurveTo(0.78, 0.14, 0.44, 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.5, 0.42); ctx.lineTo(0.5, 0.42); ctx.lineTo(0.6, 0.86); ctx.quadraticCurveTo(0.6, 0.94, 0.52, 0.94); ctx.lineTo(-0.52, 0.94); ctx.quadraticCurveTo(-0.6, 0.94, -0.6, 0.86); ctx.closePath(); ctx.fillStyle = fsVGrad(0.42, 0.94, '#5a4670', '#2a1c36'); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0.68, 0.12, 0, TAU); ctx.fill(); ctx.strokeStyle = FS.white; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0, 0.68); ctx.lineTo(0.06, 0.6); ctx.stroke();
    const jar = () => { ctx.beginPath(); ctx.moveTo(-0.52, -0.72); ctx.lineTo(0.52, -0.72); ctx.lineTo(0.4, 0.42); ctx.lineTo(-0.4, 0.42); ctx.closePath(); };
    jar(); ctx.fillStyle = 'rgba(214,236,255,0.82)'; ctx.fill();
    ctx.save(); jar(); ctx.clip();
    const lv = -0.2; ctx.beginPath(); ctx.moveTo(-0.6, 0.5); ctx.lineTo(-0.6, lv); for (let i = 0; i <= 12; i++) { const px = -0.6 + i * 0.1; ctx.lineTo(px, lv + 0.045 * Math.sin(px * 7 + TT * 9)); } ctx.lineTo(0.6, 0.5); ctx.closePath(); ctx.fillStyle = fsVGrad(lv, 0.42, lt, dk, c); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 4; i++) { const u = mod(TT * 0.9 + i * 0.27, 1); ctx.beginPath(); ctx.arc(-0.22 + i * 0.15, 0.36 - u * 0.5, 0.03 + 0.015 * (i % 2), 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(-0.42, -0.64); ctx.lineTo(-0.32, -0.64); ctx.lineTo(-0.27, 0.32); ctx.lineTo(-0.34, 0.32); ctx.closePath(); ctx.fill();
    ctx.restore();
    jar(); ctx.strokeStyle = FS.white; ctx.lineWidth = 0.04; ctx.stroke();
    ctx.fillStyle = dk; ctx.beginPath(); ctx.roundRect(-0.14, -0.99, 0.28, 0.16, 0.05); ctx.fill();
    ctx.fillStyle = fsVGrad(-0.87, -0.7, lt, c); ctx.beginPath(); ctx.roundRect(-0.57, -0.87, 1.14, 0.17, 0.06); ctx.fill();
  },
};
function fsProduct(kind, x, y, r, o = {}) {
  const c = o.c ?? FS.red, c2 = o.c2 ?? FS.gold, k = r * (o.s ?? 1); if (k <= 0 || !FS_PRODUCTS[kind]) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(k, k); ctx.lineJoin = ctx.lineCap = 'round';
  FS_PRODUCTS[kind](c, c2, fsDark(c, 0.3), fsLite(c, 0.4));
  ctx.restore();
}

// ---- promo furniture
// the jagged starburst discount badge: a gold seal with a white outline, an extrusion and a big label that stays
// level while the spikes turn. x, y = centre. o: at (pops in with a wobble), sub (a small line above the label),
//    n (spikes), jag (0..1 depth), spin (rad/s), c, tc (label colour), rot (the label's tilt), s, size
function fsBurst(x, y, r, label, o = {}) {
  const s = (o.s ?? 1) * (o.at != null ? fsPop(o.at, { over: 0.26 }) : 1); if (s <= 0 || r <= 0) return;
  const n = o.n ?? 16, jag = o.jag ?? 0.2, rr = r * s, c = o.c ?? FS.gold, spin = TT * (o.spin ?? 0.5), rot = (o.rot ?? -0.1) + (o.at != null ? fsWob(o.at) : 0), P = [];
  for (let i = 0; i < n * 2; i++) { const a = spin + i / (n * 2) * TAU, k = i % 2 ? 1 - jag : 1; P.push([x + Math.cos(a) * rr * k, y + Math.sin(a) * rr * k]); }
  fsShape(P, c, { depth: o.depth ?? r * 0.09, ext: o.ext ?? FS.goldD, c0: FS.goldL, join: 'round' });
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, rr * 0.7, 0, TAU); ctx.fillStyle = fsVGrad(y - rr * 0.7, y + rr * 0.7, '#fff7c2', fsLite(c, 0.15)); ctx.fill();
  ctx.lineWidth = Math.max(2, rr * 0.03); ctx.strokeStyle = fsA(FS.white, 0.9); ctx.setLineDash([rr * 0.07, rr * 0.06]); ctx.beginPath(); ctx.arc(x, y, rr * 0.63, spin * -0.6, spin * -0.6 + TAU); ctx.stroke(); ctx.restore();
  const size = (o.size ?? r * 0.52) * s, tc = o.tc ?? FS.red;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (o.sub) fsText(o.sub, 0, -size * 0.52, size * 0.36, FS.ink, { plain: true, align: 'center', maxW: rr * 0.95 });
  fsText(label, 0, size * FS_CAP / 2 + (o.sub ? size * 0.2 : 0), size, tc, { align: 'center', maxW: rr * 1.2, stroke: size * 0.13, depth: size * 0.08, ext: FS.redD, shadow: false });
  ctx.restore();
}
// a hanging price tag on a string that swings from its nail (ax, ay). len = string length, w x h = the tag.
// o: ang (the swing angle: fsSwing()), lines ([small, big] text), tc, draw(w, h) (own content), c2 (eyelet), pin: false
function fsTag(ax, ay, len, w, h, c, o = {}) {
  const ch = h * 0.24, t0 = len, r = Math.min(w, h) * 0.12, z = fsZoom();
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(o.ang ?? 0);
  const path = () => { ctx.beginPath(); ctx.moveTo(-w * 0.2, t0); ctx.lineTo(w * 0.2, t0); ctx.lineTo(w / 2, t0 + ch); ctx.lineTo(w / 2, t0 + h - r); ctx.arcTo(w / 2, t0 + h, w / 2 - r, t0 + h, r); ctx.lineTo(-w / 2 + r, t0 + h); ctx.arcTo(-w / 2, t0 + h, -w / 2, t0 + h - r, r); ctx.lineTo(-w / 2, t0 + ch); ctx.closePath(); };
  fsPlate(path, c ?? FS.gold, { x0: -w / 2, y0: t0, x1: w / 2, y1: t0 + h }, { depth: o.depth ?? 8, ext: o.ext ?? FS.goldD, ...o });
  const ey = t0 + ch * 0.62, er = w * 0.065;
  ctx.fillStyle = FS.white; ctx.beginPath(); ctx.arc(0, ey, er * 1.7, 0, TAU); ctx.fill(); ctx.fillStyle = o.c2 ?? FS.redD; ctx.beginPath(); ctx.arc(0, ey, er, 0, TAU); ctx.fill();
  ctx.save(); ctx.shadowColor = FS.shadow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4; ctx.strokeStyle = FS.white; ctx.lineWidth = 5 / z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ey); ctx.stroke(); ctx.restore();
  if (o.pin !== false) { ctx.fillStyle = FS.white; ctx.beginPath(); ctx.arc(0, 0, 11 / z, 0, TAU); ctx.fill(); ctx.fillStyle = FS.gold; ctx.beginPath(); ctx.arc(0, 0, 6 / z, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(-w / 2, t0);
  if (o.draw) o.draw(w, h);
  else if (o.lines) { const [a, b] = o.lines, tc = o.tc ?? FS.redD; fsText(a, w / 2, ch + h * 0.25, h * 0.17, tc, { plain: true, align: 'center', maxW: w * 0.8 }); fsText(b, w / 2, ch + h * 0.58, h * 0.3, tc, { plain: true, align: 'center', maxW: w * 0.84 }); }
  ctx.restore(); ctx.restore();
}
// a perforated coupon / voucher ticket: a stub with the value, half-round notches and a dashed tear line, then the
// offer. x, y = top-left. o: split (0..1: where the tear is), value, unit (small, over the value), title, sub, code,
//    stub (the stub's colour), tc, rot, s, at (pops in), sweep (a gloss sweep at that time)
function fsCoupon(x, y, w, h, c, o = {}) {
  const s = (o.s ?? 1) * (o.at != null ? fsPop(o.at) : 1); if (s <= 0) return;
  const sx = w * (o.split ?? 0.34), nr = h * 0.1, r = h * 0.14, stub = o.stub ?? FS.red;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((o.rot ?? 0) + (o.at != null ? fsWob(o.at, 0.12) : 0)); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
  const path = () => { ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(sx - nr, 0); ctx.arc(sx, 0, nr, Math.PI, 0, true); ctx.lineTo(w - r, 0); ctx.arcTo(w, 0, w, r, r); ctx.lineTo(w, h - r); ctx.arcTo(w, h, w - r, h, r); ctx.lineTo(sx + nr, h); ctx.arc(sx, h, nr, 0, Math.PI, true); ctx.lineTo(r, h); ctx.arcTo(0, h, 0, h - r, r); ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r); ctx.closePath(); };
  fsPlate(path, c ?? FS.white, { x0: 0, y0: 0, x1: w, y1: h }, { depth: o.depth ?? 7, ext: o.ext ?? fsDark(stub, 0.35), gloss: false, c0: FS.white, c1: '#fff0f3', ...o });
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = fsVGrad(0, h, fsLite(stub, 0.22), fsDark(stub, 0.12), stub); ctx.fillRect(0, 0, sx, h);
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.5); g.addColorStop(0, 'rgba(255,255,255,0.38)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, sx, h * 0.5);
  ctx.strokeStyle = fsA(FS.white, 0.95); ctx.lineWidth = 4; ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.moveTo(sx, nr + 6); ctx.lineTo(sx, h - nr - 4); ctx.stroke(); ctx.setLineDash([]);
  if (o.unit) fsText(o.unit, sx / 2, h * 0.3, h * 0.13, FS.white, { plain: true, align: 'center', maxW: sx * 0.78 });
  if (o.value) fsText(o.value, sx / 2, h * (o.unit ? 0.68 : 0.62), h * 0.32, FS.white, { plain: true, align: 'center', maxW: sx * 0.8 });
  const tx = sx + nr + h * 0.12, tw = w - tx - h * 0.14, tc = o.tc ?? FS.ink;
  if (o.title) fsText(o.title, tx, h * 0.36, h * 0.2, stub, { plain: true, maxW: tw });
  if (o.sub) fsText(o.sub, tx, h * 0.56, h * 0.13, tc, { plain: true, italic: false, weight: 700, font: FS_UI, maxW: tw });
  if (o.code) { const cs = h * 0.13, cw = Math.min(tw, fsTextW(o.code, cs) + cs * 1.4); ctx.fillStyle = fsLite(stub, 0.86); ctx.beginPath(); ctx.roundRect(tx, h * 0.66, cw, cs * 1.7, cs * 0.4); ctx.fill(); ctx.strokeStyle = stub; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.stroke(); ctx.setLineDash([]); fsText(o.code, tx + cw / 2, h * 0.66 + cs * 0.85 + cs * FS_CAP / 2, cs, stub, { plain: true, align: 'center', maxW: cw - cs * 0.8 }); }
  if (o.sweep != null) fsSweep(w, h, o.sweep);
  ctx.restore(); ctx.restore();
}
// the two-line lockup: a gold top word and a bigger white bottom word, extruded, each slamming in, with a bolt.
// x = centre, y = the top word's baseline, size = the top word. o: top, bottom (the words), at1, at2 (slam times),
//    size2, dx2 (shift the bottom word), maxW, maxW2, rot, bolt: false (place fsHero or fsBolt yourself), boltAt
function fsLockup(x, y, size, o = {}) {
  const top = o.top ?? 'FLASH', bot = o.bottom ?? 'SALE', size2 = o.size2 ?? size * 1.16, rot = o.rot ?? -0.035, mw = o.maxW ?? 800, deep = o.ext ?? fsPre(o.preset).deep;
  const [d1] = o.at1 != null ? fsSlam(o.at1, 'l') : [0], [d2] = o.at2 != null ? fsSlam(o.at2, 'r') : [0], ind = o.bolt === false ? 0 : size * 0.42;
  fsText(top, x + d1, y, size, FS.gold, { align: 'center', rot, maxW: mw, grad: ['#fff470', '#ffae00'], ext: deep });
  fsText(bot, x + (o.dx2 ?? ind) + d2, y + size2 * 0.9 + size * 0.1, size2, FS.white, { align: 'center', rot, maxW: o.maxW2 ?? mw - ind * 2, grad: ['#ffffff', '#ffe9d6'], ext: deep });
  if (o.bolt !== false) { const s = o.boltAt != null ? fsPop(o.boltAt) : 1; fsBolt(x - mw / 2 + size * 0.36, y + size * 0.5, size * 0.78, FS.gold, { s, rot: 0.08 + (o.boltAt != null ? fsWob(o.boltAt) : 0), c0: FS.goldL }); }
}
// one flip card: char a turning into char b, p = 0..1 (1 = settled on b). x, y = top-left.
function fsFlip(x, y, w, h, a, b, p, o = {}) {
  const r = h * 0.14, size = h * 0.84, top = o.top ?? FS.nightL, bot = o.bot ?? FS.night;
  fsBox(x, y, w, h, bot, { r, ow: o.ow ?? 5, flat: true, gloss: false, sh: 10, blur: 16 });
  const half = (ch, up, sy) => {
    if (sy <= 0.03) return;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(1, sy);
    ctx.beginPath(); if (up) ctx.roundRect(-w / 2, -h / 2, w, h / 2, [r, r, 0, 0]); else ctx.roundRect(-w / 2, 0, w, h / 2, [0, 0, r, r]);
    ctx.fillStyle = up ? fsVGrad(-h / 2, 0, fsLite(top, 0.16), top) : bot; ctx.fill(); ctx.clip();
    fsFont(size, { italic: false }); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = FS.white; ctx.fillText(ch, 0, size * FS_CAP / 2);
    if (sy < 1) { ctx.fillStyle = `rgba(0,0,0,${0.4 * (1 - sy)})`; ctx.fillRect(-w / 2, -h / 2, w, h); }
    ctx.restore();
  };
  if (p >= 1 || a === b) { half(b, true, 1); half(b, false, 1); }
  else { half(b, true, 1); half(a, false, 1); if (p < 0.5) half(a, true, 1 - 2 * p); else half(b, false, 2 * p - 1); }
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
  ctx.fillStyle = FS.gold; ctx.fillRect(x - 2, y + h / 2 - 6, 6, 12); ctx.fillRect(x + w - 4, y + h / 2 - 6, 6, 12);
}
// the flip-digit countdown HH:MM:SS. x, y = centre. `total` = the seconds left at time o.t0 (default the era start);
// it ticks down once a second, and each changed digit flips over 0.25s. o: size (card height), t0, at (the three
// pairs pop in, staggered), labels ([h, m, s] words under the pairs, from the piece), flip (seconds), top, bot
function fsTimer(x, y, total, o = {}) {
  const h = o.size ?? 124, w = h * 0.68, g = h * 0.07, col = h * 0.34, pair = 2 * w + g, tw = 3 * pair + 2 * col;
  const el = Math.max(0, TT - (o.t0 ?? E0)), n = Math.floor(el + 1e-6), p = n > 0 ? (el - n) / (o.flip ?? 0.25) : 1;
  const hms = (v) => { v = Math.max(0, v); const two = (q) => String(q % 100).padStart(2, '0'); return two(Math.floor(v / 3600)) + two(Math.floor(v / 60) % 60) + two(v % 60); };
  const now = hms(total - n), was = hms(total - n + 1);
  for (let k = 0; k < 3; k++) {
    const s = o.at != null ? fsPop(o.at + k * 0.0834) : 1; if (s <= 0) continue;
    const px = x - tw / 2 + k * (pair + col);
    ctx.save(); ctx.translate(px + pair / 2, y); ctx.scale(s, s); ctx.translate(-(px + pair / 2), -y);
    for (let d = 0; d < 2; d++) { const i = k * 2 + d; fsFlip(px + d * (w + g), y - h / 2, w, h, was[i], now[i], p, o); }
    if (o.labels) fsText(o.labels[k], px + pair / 2, y + h / 2 + h * 0.3, h * 0.2, FS.white, { plain: true, align: 'center' });
    if (k < 2 && mod(el, 1) < 0.5) { ctx.fillStyle = FS.white; for (const dy of [-0.16, 0.16]) { ctx.beginPath(); ctx.arc(px + pair + col / 2, y + h * dy, h * 0.065, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  return tw;
}
// the stock bar: a rounded track filled to frac with a hot gradient and marching stripes, a bolt at the head and a
// label on it (written by the piece: 'SOLD 87%'). x, y = top-left. o: track, c0, c1 (fill colours), tc, bolt: false
function fsStock(x, y, w, h, frac, label, o = {}) {
  const f = clamp(frac), r = h / 2, fw = Math.max(h, w * f);
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.fillStyle = o.track ?? '#ffd3da'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, fw, h, r); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, o.c0 ?? '#ffb300'); g.addColorStop(1, o.c1 ?? FS.red); ctx.fillStyle = g; ctx.fillRect(0, 0, fw, h);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; const st = h * 0.9, off = mod(TT * 70, st * 2);
  for (let sx = -h * 2 + off; sx < fw + h; sx += st * 2) { ctx.beginPath(); ctx.moveTo(sx, h); ctx.lineTo(sx + st, h); ctx.lineTo(sx + st + h * 0.6, 0); ctx.lineTo(sx + h * 0.6, 0); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.roundRect(h * 0.2, h * 0.12, Math.max(0, fw - h * 0.4), h * 0.3, h * 0.15); ctx.fill();
  ctx.restore();
  if (o.bolt !== false) { const bx = clamp(fw, h * 0.6, w - h * 0.2); ctx.beginPath(); ctx.arc(bx, h / 2, h * 0.72, 0, TAU); ctx.fillStyle = FS.white; ctx.fill(); ctx.beginPath(); ctx.arc(bx, h / 2, h * 0.56, 0, TAU); ctx.fillStyle = FS.red; ctx.fill(); fsBolt(bx, h / 2, h * 0.4, FS.hero, { flat: true }); }
  if (label) { const size = h * 0.56; ctx.save(); fsFont(size); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.22; ctx.strokeStyle = o.sc ?? FS.redD; ctx.strokeText(label, w / 2, h / 2 + size * FS_CAP / 2); ctx.fillStyle = o.tc ?? FS.white; ctx.fillText(label, w / 2, h / 2 + size * FS_CAP / 2); ctx.restore(); }
  ctx.restore();
}
// the free-shipping pill: a little truck driving on the spot (wheels turn, speed lines) and a label. x, y = centre.
// o: size (label px), c (pill), tc (truck and label colour), at (pops in), rot. Returns its width.
function fsShip(x, y, label, o = {}) {
  const size = o.size ?? 36, s = (o.s ?? 1) * (o.at != null ? fsPop(o.at) : 1), tc = o.tc ?? FS.green, h = size * 2.0, tr = size * 2.3, px = size * 0.7, tw = fsTextW(label, size), w = px + tr + size * 0.4 + tw + px;
  if (s <= 0) return w;
  fsBox(x - w / 2, y - h / 2, w, h, o.c ?? FS.white, { r: h / 2, s, rot: (o.rot ?? 0) + (o.at != null ? fsWob(o.at, 0.1) : 0), ow: o.ow ?? 0, gloss: false, c0: FS.white, c1: '#eafff3', sh: 10, blur: 18, draw: (bw, bh) => {
    const u = size / 36, bx = px + 26 * u, by = bh / 2 + (mod(TT, 0.25) < 0.125 ? -1.5 : 0) * u;
    ctx.strokeStyle = fsA(tc, 0.55); ctx.lineWidth = 4 * u; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const lx = px + mod(22 - TT * 90 + i * 9, 26) * u - 4 * u, ly = by - 14 * u + i * 12 * u; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + (10 + i * 3) * u, ly); ctx.stroke(); }
    ctx.fillStyle = fsVGrad(by - 24 * u, by + 12 * u, fsLite(tc, 0.3), tc); ctx.beginPath(); ctx.roundRect(bx, by - 24 * u, 34 * u, 34 * u, 5 * u); ctx.fill();
    ctx.fillStyle = FS.greenD; ctx.beginPath(); ctx.moveTo(bx + 36 * u, by - 14 * u); ctx.lineTo(bx + 50 * u, by - 14 * u); ctx.lineTo(bx + 58 * u, by - 2 * u); ctx.lineTo(bx + 58 * u, by + 10 * u); ctx.lineTo(bx + 36 * u, by + 10 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9fff0'; ctx.beginPath(); ctx.moveTo(bx + 40 * u, by - 10 * u); ctx.lineTo(bx + 48 * u, by - 10 * u); ctx.lineTo(bx + 53 * u, by - 2 * u); ctx.lineTo(bx + 40 * u, by - 2 * u); ctx.closePath(); ctx.fill();
    for (const wx of [bx + 10 * u, bx + 46 * u]) { ctx.fillStyle = FS.ink; ctx.beginPath(); ctx.arc(wx, by + 12 * u, 8 * u, 0, TAU); ctx.fill(); ctx.strokeStyle = FS.white; ctx.lineWidth = 2.6 * u; const a = TT * 14; ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 5 * u, by + 12 * u - Math.sin(a) * 5 * u); ctx.lineTo(wx + Math.cos(a) * 5 * u, by + 12 * u + Math.sin(a) * 5 * u); ctx.stroke(); }
    fsText(label, px + tr + size * 0.4, bh / 2 + size * FS_CAP / 2, size, o.lc ?? FS.greenD, { plain: true });
  } });
  return w;
}
// the CTA button: a glossy extruded pill with an extruded label and a chevron; it pulses and can be pressed.
// x, y = centre. o: pulse (a scale: fsPulse()), press 0..1, size, tc, chevron: false, sweep (a gloss sweep time), rot, s, depth
function fsButton(x, y, w, h, label, c, o = {}) {
  const pr = clamp(o.press ?? 0), s = (o.s ?? 1) * (o.pulse ?? 1) * (1 - 0.04 * pr), size = o.size ?? h * 0.42, dep = o.depth ?? 16, col = c ?? FS.orange;
  fsBox(x - w / 2, y - h / 2, w, h, col, { r: h / 2, s, rot: o.rot, depth: dep, press: pr, ext: o.ext ?? fsDark(col, 0.5), draw: (bw, bh) => {
    const ar = o.chevron === false ? 0 : size * 0.34, gap = ar ? size * 0.36 : 0, tw = Math.min(fsTextW(label, size), bw - h * 0.7 - 2 * ar - gap), x0 = (bw - tw - gap - 2 * ar) / 2;
    fsText(label, x0, bh / 2 + size * FS_CAP / 2, size, o.tc ?? FS.white, { maxW: tw, stroke: 0, depth: size * 0.07, ext: fsDark(col, 0.5), shadow: false });
    if (ar) { const ax = x0 + tw + gap + ar + Math.sin(TT * TAU * 2) * size * 0.07; ctx.strokeStyle = o.tc ?? FS.white; ctx.lineWidth = size * 0.2; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(ax - ar * 0.5, bh / 2 - ar); ctx.lineTo(ax + ar * 0.5, bh / 2); ctx.lineTo(ax - ar * 0.5, bh / 2 + ar); ctx.stroke(); }
    if (o.sweep != null) fsSweep(bw, bh, o.sweep, { d: 0.35 });
  } });
}
// the tapping hand: a white pointing hand with a dark outline. x, y = the fingertip, r = its size (about half its
// height). o: press 0..1 (it dips and shrinks a little), rot
function fsHand(x, y, r, o = {}) {
  const pr = clamp(o.press ?? 0), k = r * (1 - 0.08 * pr); if (r <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.32); ctx.scale(k, k);
  const parts = () => { ctx.beginPath(); ctx.roundRect(-0.17, 0, 0.34, 1.1, 0.17); ctx.roundRect(-0.46, 0.66, 1.0, 0.92, 0.3); for (let i = 0; i < 2; i++) ctx.roundRect(0.14 + i * 0.2, 0.5 + i * 0.07, 0.24, 0.5, 0.12); };
  const thumb = () => { ctx.save(); ctx.translate(-0.42, 1.02); ctx.rotate(-0.7); ctx.beginPath(); ctx.roundRect(-0.14, -0.5, 0.28, 0.66, 0.14); ctx.restore(); };
  ctx.lineJoin = 'round'; ctx.strokeStyle = o.line ?? FS.ink; ctx.lineWidth = 0.15;
  ctx.save(); ctx.shadowColor = FS.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 10 * (1 - pr * 0.6); parts(); ctx.stroke(); ctx.restore();
  thumb(); ctx.stroke();
  ctx.fillStyle = o.c ?? FS.white; parts(); ctx.fill(); thumb(); ctx.fill();
  ctx.strokeStyle = fsA(FS.ink, 0.25); ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0.17, 0.72); ctx.lineTo(0.17, 0.98); ctx.moveTo(0.37, 0.76); ctx.lineTo(0.37, 0.98); ctx.stroke();
  ctx.restore();
}
// tap rings: two white rings that open out for 0.35s after a tap at time t
function fsRipple(x, y, r, t, o = {}) {
  const u = (TT - t) / (o.d ?? 0.35); if (u < 0 || u >= 1) return;
  ctx.save(); ctx.strokeStyle = o.c ?? FS.white; ctx.globalAlpha = 1 - u;
  for (const k of [1, 0.6]) { ctx.lineWidth = (o.w ?? 9) * (1 - u * 0.5); ctx.beginPath(); ctx.arc(x, y, r * k * (0.4 + 0.9 * EZ.o2(u)), 0, TAU); ctx.stroke(); }
  ctx.restore();
}
// the product card: a white rounded card with a tinted picture panel (rays, a bobbing product pictogram), a title,
// the rating row, the struck old price, the big new price and a stock bar. x, y = top-left; laid out for ~720 x 740.
// o: product, pc, pc2 (its colours), panel ([top, bottom] tint), title, rating, ratingText, old, now (price strings
//    from the piece), strike 0..1, nowS (the new price's scale: pop it when it lands), chip (a small saving label),
//    stock: { frac, label }, starsAt, sweep (a gloss sweep time), rot, s, r, draw(w, h) (extra content on top)
function fsCard(x, y, w, h, o = {}) {
  const k = w / 720;
  fsBox(x, y, w, h, o.c ?? FS.white, { r: o.r ?? 46 * k, rot: o.rot, s: o.s, ow: o.ow ?? 0, gloss: false, c0: FS.white, c1: '#fff3f6', sh: 22, blur: 40, draw: (cw, ch) => {
    const pad = 36 * k, ph = o.panelH ?? ch * 0.45, pn = o.panel ?? ['#fff3c4', '#ffc9de'];
    ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, cw - 2 * pad, ph, 30 * k); ctx.fillStyle = fsVGrad(pad, pad + ph, pn[0], pn[1]); ctx.fill(); ctx.clip();
    const pcx = cw / 2 + (o.px ?? 0) * k, pcy = pad + ph * 0.5; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a0 = TT * 0.4 + i / 10 * TAU, a1 = a0 + TAU / 20; ctx.moveTo(pcx, pcy); ctx.lineTo(pcx + Math.cos(a0) * cw, pcy + Math.sin(a0) * cw); ctx.lineTo(pcx + Math.cos(a1) * cw, pcy + Math.sin(a1) * cw); ctx.closePath(); }
    ctx.fill();
    if (o.product) fsProduct(o.product, pcx, pcy + Math.sin(TT * TAU * 0.5) * 6 * k, ph * (o.pr ?? 0.4), { c: o.pc, c2: o.pc2, rot: (o.prot ?? -0.12) + Math.sin(TT * TAU * 0.5 + 1) * 0.02 });
    fsSparkle(pad + (cw - 2 * pad) * 0.16, pad + ph * 0.24, 30 * k, { f: 0.8, ph: 0.1 }); fsSparkle(pad + (cw - 2 * pad) * 0.78, pad + ph * 0.8, 24 * k, { f: 0.7, ph: 0.55 });
    ctx.restore();
    let yy = pad + ph + 58 * k;
    if (o.title) fsText(o.title, pad, yy, 42 * k, FS.ink, { plain: true, italic: false, weight: 800, font: FS_UI, maxW: cw - 2 * pad });
    yy += 44 * k;
    if (o.rating != null) { const sw = fsStars(pad, yy, 34 * k, o.rating, { at: o.starsAt }); if (o.ratingText) fsText(o.ratingText, pad + sw + 16 * k, yy + 10 * k, 28 * k, FS.mute, { plain: true, italic: false, weight: 600, font: FS_UI, maxW: cw - 2 * pad - sw - 16 * k }); }
    yy += 62 * k;
    if (o.old) { const ow = fsOld(o.old, pad, yy, 34 * k, { strike: o.strike });
      if (o.chip) { const cs = 26 * k, cwd = fsTextW(o.chip, cs) + cs * 1.2, cx0 = pad + ow + 22 * k, sc = o.chipS ?? 1; if (sc > 0) { ctx.save(); ctx.translate(cx0 + cwd / 2, yy - 12 * k); ctx.scale(sc, sc); ctx.fillStyle = '#ffe1e6'; ctx.beginPath(); ctx.roundRect(-cwd / 2, -cs * 0.85, cwd, cs * 1.7, cs * 0.5); ctx.fill(); fsText(o.chip, 0, cs * FS_CAP / 2, cs, FS.red, { plain: true, align: 'center' }); ctx.restore(); } } }
    yy += 92 * k;
    if (o.now) fsText(o.now, pad, yy, 92 * k, FS.red, { stroke: 0, depth: 6 * k, ext: FS.redD, shadow: false, maxW: cw - 2 * pad, s: o.nowS });
    if (o.stock) fsStock(pad, ch - pad - 56 * k, cw - 2 * pad - 16 * k, 58 * k, o.stock.frac, o.stock.label, o.stock);
    if (o.draw) o.draw(cw, ch);
    if (o.sweep != null) fsSweep(cw, ch, o.sweep);
  } });
}

// ---- the hero: Zap, a lemon lightning bolt with a face, an orange extrusion and a white outline.
// x, y = centre, r = half its height. o: mood ('happy' | 'wow' | 'wink'), look (-1..1), rot, bob (0 = hold still: do
//    that before a bridge), s, at (pops in), blink, key
const fsHeroPts = (x, y, r) => fsPoly(FS_BOLT, x, y, r, 0, 1.08);
function fsHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', bob = o.bob ?? 1, s = (o.s ?? 1) * (o.at != null ? fsPop(o.at, { over: 0.28 }) : 1); if (s <= 0 || r <= 0) return;
  const yy = y + Math.sin(TT * TAU + key.length) * r * 0.04 * bob, rot = (o.rot ?? 0) + (o.at != null ? fsWob(o.at) : 0) + Math.sin(TT * TAU * 0.5 + key.length) * 0.04 * bob;
  SPARK_AT = toScreen(x, yy);
  ctx.save(); ctx.translate(x, yy); ctx.rotate(rot); ctx.scale(s, s);
  fsShape(fsHeroPts(0, 0, r), FS.hero, { depth: o.depth ?? Math.max(6, r * 0.09), ext: FS.heroD, c0: '#fffbc0', c1: '#ffc400', glossA: 0.6, ow: o.ow });
  const blink = o.blink ?? ((F + hash('fsh', key) % 53) % 53 < 3), mood = o.mood ?? 'happy', lk = (o.look ?? 0) * r * 0.03, ey = -r * 0.2, er = r * 0.075;
  ctx.fillStyle = ctx.strokeStyle = FS.ink; ctx.lineCap = 'round';
  [-0.14, 0.2].forEach((u, i) => {
    const ex = u * r + lk, shut = blink || (mood === 'wink' && i === 1);
    if (shut) { ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(ex, ey, er, er * (mood === 'wow' ? 1.35 : 1.15), 0, 0, TAU); ctx.fill(); ctx.fillStyle = FS.white; ctx.beginPath(); ctx.arc(ex - er * 0.3, ey - er * 0.4, er * 0.36, 0, TAU); ctx.fill(); ctx.fillStyle = FS.ink; }
  });
  if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(0.03 * r + lk, -r * 0.02, r * 0.07, r * 0.085, 0, 0, TAU); ctx.fill(); ctx.fillStyle = FS.pink; ctx.beginPath(); ctx.ellipse(0.03 * r + lk, r * 0.02, r * 0.045, r * 0.035, 0, 0, TAU); ctx.fill(); }
  else { ctx.lineWidth = r * 0.045; ctx.beginPath(); ctx.arc(0.03 * r + lk, -r * 0.1, r * 0.11, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = fsA(FS.orange, 0.5); for (const u of [-0.3, 0.36]) { ctx.beginPath(); ctx.ellipse(u * r + lk, -r * 0.08, r * 0.06, r * 0.035, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---- captions and the kicker: screen-size, after the camera (DEFER). They slam in, and hide inside a morph bridge.
// fsCaption('Only *today*!'): a white pill at the bottom of the safe area; the part between * * sits on a gold chip
// in red. o: at (seconds after the era starts; default 0.5), y, size, c, hl, from
function fsCaptionNow(str, o = {}) {
  if (fsInBridge()) return;
  const t = E0 + (o.at ?? 0.5); if (TT < t - 0.2) return;
  const size = o.size ?? 54, parts = str.split('*').map((s, i) => ({ s, hi: i % 2 === 1 })).filter((p) => p.s);
  const ws = parts.map((p) => fsTextW(p.s, size)), tw = ws.reduce((a, b) => a + b, 0), px = size * 0.8, w = tw + 2 * px, h = size * 1.84;
  const [dx, dy] = fsSlam(t, o.from ?? 'b', { dist: 700 }), x = (typeof CX !== 'undefined' ? CX : W / 2) - w / 2 + dx, y = (o.y ?? 1432) - h / 2 + dy;
  fsBox(x, y, w, h, o.c ?? FS.white, { r: h / 2, ow: 0, gloss: false, c0: FS.white, c1: '#fff1f4', rot: o.rot ?? -0.015, draw: (bw, bh) => {
    let cx = px; const base = bh / 2 + size * FS_CAP / 2, sp = fsTextW(' ', size);
    parts.forEach((p, i) => {
      const lead = p.s.length - p.s.trimStart().length, trail = p.s.length - p.s.trimEnd().length, core = p.s.trim(), cw = ws[i] - (lead + trail) * sp;
      if (p.hi) { ctx.fillStyle = fsVGrad(base - size, base + size * 0.2, '#fff06a', o.hl ?? FS.gold); ctx.beginPath(); ctx.roundRect(cx + lead * sp - size * 0.2, base - size * (FS_CAP + 0.2), cw + size * 0.44, size * (FS_CAP + 0.4), size * 0.28); ctx.fill(); }
      fsText(core, cx + lead * sp, base, size, p.hi ? FS.red : FS.ink, { plain: true }); cx += ws[i];
    });
  } });
}
const fsCaption = (str, o) => { const f = () => fsCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
// the kicker: a dark pill with gold type and a small bolt, top-left of the safe area ('MEGA SALE', 'TODAY ONLY')
function fsKickerNow(str, o = {}) {
  if (fsInBridge()) return;
  const t = E0 + (o.at ?? 0.25), size = o.size ?? 40, ir = size * 0.5, w = fsTextW(str, size) + size * 1.5 + ir * 1.7, h = size * 1.75, [dx, dy] = fsSlam(t, o.from ?? 'l', { dist: 900 });
  fsBox((o.x ?? 60) + dx, (o.y ?? 262) + dy, w, h, o.c ?? FS.ink, { r: h / 2, ow: 5, flat: true, gloss: false, sh: 10, blur: 16, draw: (bw, bh) => {
    fsBolt(size * 0.7 + ir * 0.4, bh / 2, ir * (mod(TT, 0.5) < 0.25 ? 1 : 0.86), FS.hero, { flat: true });
    fsText(str, size * 0.7 + ir * 1.5, bh / 2 + size * FS_CAP / 2, size, o.tc ?? FS.gold, { plain: true });
  } });
}
const fsKicker = (str, o) => { const f = () => fsKickerNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract), each in the medium: the morph happens on a
//  hot gradient ground with rays; the window is a white-outlined plate with a soft shadow; the blob is a glossy plate.
// =====================================================================
const STYLE = {
  name: 'flash-sale',
  paper: FS.paper,
  backdrop(c) { ctx.save(); screen(); fsGround({ g0: fsMix(c, FS.red, 0.25), g1: fsMix(c, FS.gold, 0.3), glow: '#fff0a0', cx: W / 2, cy: H * 0.45, speed: 0.5 }); ctx.restore(); },
  window(P, key, src) {                                                  // the era seen through a white-outlined plate
    const bb = bbox(P), big = bb.x0 < -20 && bb.y0 < -20 && bb.x1 > W + 20 && bb.y1 > H + 20;
    if (!big) { ctx.save(); ctx.shadowColor = FS.shadow; ctx.shadowBlur = 34; ctx.shadowOffsetY = 20; fsPath(P); ctx.fillStyle = FS.white; ctx.fill(); ctx.restore(); }
    ctx.save(); fsPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    if (!big) { ctx.save(); fsPath(P); ctx.lineJoin = 'round'; ctx.lineWidth = FS.ow * 2; ctx.strokeStyle = FS.white; ctx.stroke(); ctx.restore(); }
  },
  blob(P, c, key, u = 0) {                                               // a glossy plate changing shape: it swells mid-way and throws twinkles
    const k = Math.sin(Math.PI * clamp(u)), cen = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]), s = 1 + 0.07 * k;
    fsShape(P.map(([x, y]) => [cen[0] + (x - cen[0]) * s, cen[1] + (y - cen[1]) * s]), c, { ow: FS.ow * 1.4, depth: 10 + 10 * k, ext: fsDark(c, 0.4), glossA: 0.6 });
    const bb = bbox(P), rr = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.62;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.4; star4(cen[0] + Math.cos(a) * rr, cen[1] + Math.sin(a) * rr * 0.9, 44 * k * (i % 2 ? 0.6 : 1), FS.white); }
  },
  hero(x, y, r, o = {}) { fsHero(x, y, r, { key: o.key, mood: o.mood, bob: 0 }); },   // r = half the hero's height
  heroColor: FS.hero,
  heroPts(x, y, r) { return fsHeroPts(x, y, r); },
  post() {},                                                             // nothing: the gloss is in the objects
  ones: true,                                                            // fast and punchy: on 1s
};
