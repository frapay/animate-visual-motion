// =====================================================================
//  styles/comic/kit.js — COMIC: a pop-art comic book page. Thick black ink outlines, flat saturated primaries
//  (red, yellow, cyan-blue) on off-white paper, Ben-Day halftone dots, radial speed lines, panels with gutters,
//  speech bubbles with tails, jagged starbursts holding sound-effect words, yellow caption boxes.
//  Lettering: heavy condensed capitals (Impact-like system stack) with a black outline and a hard offset shadow.
//  Motion on 2s, snappy: pops with overshoot. Helpers are prefixed cm…; the palette is CM.
//  Options (declare in a piece part built before or after the kit): const CM_MISREG = 3;  // colour plate offset in px
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const CM = {
  paper: '#f6efdc', paperD: '#e4d9bb', white: '#fffbee', ink: '#15120f',
  red: '#e8362b', redD: '#a91d18', yellow: '#ffd426', yellowD: '#f29a16',
  blue: '#1ea7e4', blueD: '#0e6cb0', blueL: '#9ad9f3',
};
const CM_FONT = 'Impact, Haettenschweiler, "Arial Narrow Bold", Anton, "League Gothic", Oswald, "Bebas Neue", "DejaVu Sans Condensed", "Liberation Sans Narrow", "Arial Black", sans-serif';

// Impact has one weight; asking for bold would smear it. Where it is missing, the fallbacks need their bold face.
let cmFontW = 0;
function cmWeight() {
  if (!cmFontW) {
    const g = document.createElement('canvas').getContext('2d'), s = 'HAMBURGEFONS WUSS 0123';
    g.font = '80px monospace'; const a = g.measureText(s).width;
    g.font = '80px Impact, monospace'; cmFontW = Math.abs(g.measureText(s).width - a) > 1 ? 400 : 800;
  }
  return cmFontW;
}
function cmFont(size, o = {}) { ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? cmWeight()} ${size}px ${o.fam ?? CM_FONT}`; }
function cmTextW(str, size, o = {}) { ctx.save(); cmFont(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
function cmPath(P, closed = true) { ctx.beginPath(); for (let i = 0; i < P.length; i++) { if (i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[i][0], P[i][1]); } if (closed) ctx.closePath(); }
function cmCirclePts(x, y, r, n = 72) { const P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return P; }
function cmRectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function cmBox(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; }
function cmCentroid(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; }
// a jagged starburst: n spikes, tips at (rx, ry), valleys at inner * that; seeded jitter (o.key, o.boil reseeds it)
function cmBurstPts(x, y, rx, ry, n = 14, o = {}) {
  const R = RNG('cmburst', o.key ?? 'b', o.boil ?? 0), inner = o.inner ?? 0.66, jit = o.jit ?? 0.1, rot = o.rot ?? -Math.PI / 2, P = [];
  for (let i = 0; i < n * 2; i++) {
    const tip = i % 2 === 0, a = rot + (i + R.n(tip ? 0.18 : 0.1)) / (n * 2) * TAU, k = tip ? 1 + R.n(jit) : inner * (1 + R.n(jit * 0.6));
    P.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  return P;
}
// a scalloped cloud outline (thought bubbles, dust puffs)
function cmCloudPts(x, y, rx, ry, n = 9, o = {}) {
  const P = [], ph = o.phase ?? 0;
  for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, k = 0.86 + 0.16 * Math.abs(Math.sin(n * a / 2 + ph)); P.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  return P;
}
// the colour plate's offset from the ink plate (misregistration); 0 unless the piece declares CM_MISREG
function cmMis() { const m = typeof CM_MISREG !== 'undefined' ? CM_MISREG : 0; return [m, m * 0.6]; }
// a pop: 0 before t0, overshoots past 1 and settles (closed form, so any frame draws on its own)
function cmPop(t0, p = {}) { return TT < t0 - 1e-6 ? 0 : springEase(TT - t0 + 0.05, p.k ?? 520, p.d ?? 21); }

// ---------------------------------------------------------------------
//  ink: a flat colour shape with a thick black outline, an optional hard offset shadow
//  o: { w (line width, 0 = none), line, shadow: true | [dx, dy], shadowC, closed, join }
// ---------------------------------------------------------------------
function cmShape(P, fill, o = {}) {
  const w = o.w ?? 8, closed = o.closed !== false;
  ctx.save(); ctx.lineJoin = o.join ?? 'round'; ctx.lineCap = 'round';
  if (o.shadow) {
    const [dx, dy] = o.shadow === true ? [w * 1.1, w * 1.3] : o.shadow;
    ctx.save(); ctx.translate(dx, dy); cmPath(P, closed); ctx.fillStyle = ctx.strokeStyle = o.shadowC ?? CM.ink; ctx.fill(); if (w > 0) { ctx.lineWidth = w; ctx.stroke(); } ctx.restore();
  }
  if (fill) { const [mx, my] = cmMis(); ctx.save(); ctx.translate(mx, my); cmPath(P, closed); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
  if (w > 0) { cmPath(P, closed); ctx.lineWidth = w; ctx.strokeStyle = o.line ?? CM.ink; ctx.stroke(); }
  ctx.restore();
}
function cmLine(P, o = {}) { ctx.save(); cmPath(P, false); ctx.lineWidth = o.w ?? 8; ctx.strokeStyle = o.c ?? CM.ink; ctx.lineCap = o.cap ?? 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }

// ---------------------------------------------------------------------
//  Ben-Day dots: a 45-degree dot screen in colour c, clipped to outline P (null = no clip; then give o.box).
//  The dot size follows a gradient: o.from -> o.to (linear, 0 -> full), or o.radial { x, y, r0, r1 }, or flat (o.g).
//  o: { pitch, r0 (min radius, default 0), r1 (max radius, default pitch * 0.46), angle, pow, box: [x0, y0, x1, y1] }
// ---------------------------------------------------------------------
function cmDots(P, c, o = {}) {
  const pitch = o.pitch ?? 22, ang = o.angle ?? 45 * DEG, r1 = o.r1 ?? pitch * 0.46, r0 = o.r0 ?? 0, pw = o.pow ?? 1;
  const [x0, y0, x1, y1] = o.box ?? (P ? cmBox(P) : [0, 0, W, H]);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) { const u = x * ca + y * sa, v = -x * sa + y * ca; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  let g;
  if (o.from) { const [fx, fy] = o.from, dx = o.to[0] - fx, dy = o.to[1] - fy, L = dx * dx + dy * dy; g = (x, y) => clamp(((x - fx) * dx + (y - fy) * dy) / L); }
  else if (o.radial) { const q = o.radial; g = (x, y) => seg(Math.hypot(x - q.x, y - q.y), q.r0 ?? 0, q.r1); }
  else { const k = o.g ?? 1; g = () => k; }
  ctx.save(); if (P) { cmPath(P, true); ctx.clip(); }
  ctx.fillStyle = c; ctx.beginPath();
  for (let j = Math.floor(v0 / pitch); j <= Math.ceil(v1 / pitch); j++) for (let i = Math.floor(u0 / pitch); i <= Math.ceil(u1 / pitch); i++) {
    const u = i * pitch, v = j * pitch, x = u * ca - v * sa, y = u * sa + v * ca;
    if (x < x0 - r1 || x > x1 + r1 || y < y0 - r1 || y > y1 + r1) continue;
    const r = r0 + (r1 - r0) * g(x, y) ** pw; if (r < 0.7) continue;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  action lines
// ---------------------------------------------------------------------
// radial speed lines: thin wedges pointing at (cx, cy), from r1 (outer, wide) in to about r0. Reseeded every o.hold boils.
// o: { n, c, key, w (half-width in radians at the outer end), hold, reach (how far inward the longest go, 1 = to r0) }
function cmSpeed(cx, cy, r0, r1, o = {}) {
  const n = o.n ?? 64, R = RNG('cmspd', o.key ?? 's', Math.floor(B / (o.hold ?? 2))), w = o.w ?? 0.02;
  ctx.save(); ctx.fillStyle = o.c ?? CM.ink; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i + R.n(0.38)) / n * TAU, hw = w * R.r(0.3, 1), ri = lerp(r1, r0, (o.reach ?? 1) * R.r(0.55, 1));
    ctx.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
    ctx.lineTo(cx + Math.cos(a - hw) * r1, cy + Math.sin(a - hw) * r1); ctx.lineTo(cx + Math.cos(a + hw) * r1, cy + Math.sin(a + hw) * r1); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
// parallel motion streaks trailing from (x, y) in direction ang (radians): tapered ink strokes of seeded lengths
// o: { n, len, spread, c, w, key, hold }
function cmZip(x, y, ang, o = {}) {
  const n = o.n ?? 7, R = RNG('cmzip', o.key ?? 'z', Math.floor(B / (o.hold ?? 1))), len = o.len ?? 400, sp = o.spread ?? 200, w = o.w ?? 9;
  const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  ctx.save(); ctx.fillStyle = o.c ?? CM.ink; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const off = (i / (n - 1 || 1) - 0.5) * sp + R.n(sp * 0.04), s = R.r(0, len * 0.25), l = len * R.r(0.45, 1), hw = w * R.r(0.5, 1) / 2;
    const ax = x + px * off + dx * s, ay = y + py * off + dy * s;
    ctx.moveTo(ax + px * hw, ay + py * hw); ctx.lineTo(ax + dx * l, ay + dy * l); ctx.lineTo(ax - px * hw, ay - py * hw); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
// impact ticks: short thick strokes flying outward from a pop at t0, gone after dur
function cmTicks(x, y, r0, r1, t0, o = {}) {
  const dur = o.dur ?? 0.34, u = (TT - t0) / dur; if (u < 0 || u >= 1) return;
  const n = o.n ?? 10, R = RNG('cmtick', o.key ?? 't'), e = EZ.o3(u), len = (o.len ?? 46) * (1 - u * 0.6);
  ctx.save(); ctx.strokeStyle = o.c ?? CM.ink; ctx.lineWidth = (o.w ?? 9) * (1 - u * 0.5); ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = (i + R.n(0.25)) / n * TAU + (o.rot ?? 0), ra = lerp(r0, r1, e) * R.r(0.9, 1.1); ctx.moveTo(x + Math.cos(a) * ra, y + Math.sin(a) * ra); ctx.lineTo(x + Math.cos(a) * (ra + len), y + Math.sin(a) * (ra + len)); }
  ctx.stroke(); ctx.restore();
}
// a four-point sparkle with an ink outline (twinkle it by passing a changing s)
function cmSparkle(x, y, s, c = CM.white, o = {}) {
  if (s < 2) return;
  const P = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + (o.rot ?? 0), r = i % 2 ? s * 0.3 : s; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  cmShape(P, c, { w: o.w ?? Math.max(3, s * 0.13), join: 'miter' });
}
// a dust / cloud puff
function cmPuff(x, y, r, o = {}) { if (r > 2) cmShape(cmCloudPts(x, y, r * 1.25, r, o.n ?? 7, { phase: o.phase ?? 0 }), o.c ?? CM.white, { w: o.w ?? 7 }); }

// ---------------------------------------------------------------------
//  the page and its panels
// ---------------------------------------------------------------------
function cmPaper(c = CM.paper) { fillAll(c); }
// a panel: outline P (a rectangle or a slanted quad), its art drawn by draw() and clipped, a thick border, a hard shadow
// o: { bg, w, shadow: [dx, dy] | false }
function cmPanel(P, draw, o = {}) {
  const w = o.w ?? 12;
  if (o.shadow !== false) { const [dx, dy] = o.shadow ?? [12, 14]; ctx.save(); ctx.translate(dx, dy); cmPath(P); ctx.fillStyle = CM.ink; ctx.fill(); ctx.restore(); }
  ctx.save(); cmPath(P); ctx.fillStyle = o.bg ?? CM.white; ctx.fill(); ctx.clip(); draw(); ctx.restore();
  ctx.save(); cmPath(P); ctx.lineWidth = w; ctx.strokeStyle = CM.ink; ctx.lineJoin = 'miter'; ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  lettering: capitals with a black outline and a hard offset shadow
//  o: { outline (px, 0 = none), shadow: [dx, dy] | false, line, shadowC, rot, skew, scale, align, base, grad: [top, bottom], italic }
// ---------------------------------------------------------------------
function cmText(str, x, y, size, fill, o = {}) {
  const ow = o.outline ?? size * 0.085, sh = o.shadow === false ? null : (o.shadow ?? [size * 0.07, size * 0.08]), [mx, my] = cmMis();
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.skew) ctx.transform(1, 0, -o.skew, 1, 0, 0); if (o.scale != null) ctx.scale(o.scale, o.scale);
  cmFont(size, o); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.base ?? 'alphabetic'; ctx.lineJoin = 'round';
  if (sh) { ctx.fillStyle = ctx.strokeStyle = o.shadowC ?? CM.ink; ctx.lineWidth = ow * 2; if (ow > 0) ctx.strokeText(str, sh[0], sh[1]); ctx.fillText(str, sh[0], sh[1]); }
  if (ow > 0) { ctx.strokeStyle = o.line ?? CM.ink; ctx.lineWidth = ow * 2; ctx.strokeText(str, 0, 0); }
  if (o.grad) { const g = ctx.createLinearGradient(0, -size * 0.74, 0, 0); g.addColorStop(0, o.grad[0]); g.addColorStop(0.52, o.grad[0]); g.addColorStop(0.53, o.grad[1]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; } else ctx.fillStyle = fill;
  ctx.fillText(str, ow > 0 ? mx * 0.5 : 0, ow > 0 ? my * 0.5 : 0);
  ctx.restore();
}
// a sound-effect word: cmText that pops in at o.t0 with overshoot, tilted and skewed, with a small on-2s shiver
// o: everything cmText takes, plus { t0, shiver }
function cmSfx(str, x, y, size, fill, o = {}) {
  const s = o.t0 != null ? cmPop(o.t0, { k: 620, d: 19 }) : 1; if (s <= 0.02) return;
  const R = RNG('cmsfx', str, B), sv = o.shiver ?? 0.012;
  cmText(str, x + R.n(size * sv), y + R.n(size * sv), size, fill, { skew: 0.12, ...o, rot: (o.rot ?? -8 * DEG) + R.n(sv * 0.6), scale: s });
}
// a starburst holding a sound-effect word: the jagged shape (with shadow and dot shading) and the word, popping at o.t0
// o: { rx, ry, n, fill, dots, textC, size, rot, t0, key, boil, grad }  -> returns the outline (for bridges)
function cmBurst(str, x, y, o = {}) {
  const s = o.t0 != null ? cmPop(o.t0) : 1; if (s <= 0.02) return null;
  const rx = (o.rx ?? 260) * s, ry = (o.ry ?? 220) * s, P = cmBurstPts(x, y, rx, ry, o.n ?? 14, { key: o.key ?? str, boil: o.boil ?? 0, inner: o.inner });
  cmShape(P, o.fill ?? CM.yellow, { w: o.w ?? 11, shadow: [12 * s, 14 * s], join: 'miter' });
  cmDots(P, o.dots ?? CM.yellowD, { pitch: 20, from: [x - rx * 0.1, y - ry * 0.1], to: [x + rx * 0.8, y + ry * 0.9] });
  cmShape(P, null, { w: o.w ?? 11, join: 'miter' });
  if (str) cmSfx(str, x, y + (o.size ?? 150) * 0.36 * s, (o.size ?? 150) * s, o.textC ?? CM.red, { rot: o.rot ?? -7 * DEG, grad: o.grad });
  return P;
}

// ---------------------------------------------------------------------
//  balloons: cmBubble('LINE ONE\nLINE TWO', cx, cy, { tail: [x, y], kind: 'speech' | 'thought' | 'shout', size, t0, out, fill, rx, ry })
//  The balloon sizes itself to the text; the tail points at o.tail (world coords). Pops in at t0, snaps shut at o.out.
// ---------------------------------------------------------------------
function cmBubble(str, cx, cy, o = {}) {
  let s = o.t0 != null ? cmPop(o.t0) : 1;
  if (o.out != null && TT >= o.out - 1e-6) s *= 1 - EZ.i2(seg(TT, o.out, o.out + 0.12));
  if (s <= 0.03) return;
  const size = (o.size ?? 54) * s, lines = str.split('\n'), lh = size * 1.1, kind = o.kind ?? 'speech', w = o.w ?? 8;
  let mw = 0; for (const l of lines) mw = Math.max(mw, cmTextW(l, size));
  const rx = o.rx != null ? o.rx * s : mw * 0.64 + size * 0.75, ry = o.ry != null ? o.ry * s : lines.length * lh * 0.62 + size * 0.62;
  const body = kind === 'shout' ? cmBurstPts(cx, cy, rx * 1.18, ry * 1.25, 16, { key: str, inner: 0.8, jit: 0.05 }) : kind === 'thought' ? cmCloudPts(cx, cy, rx * 1.08, ry * 1.1, 10) : ellipsePts(cx, cy, rx, ry, 0, 64);
  const parts = [body];
  if (o.tail) {
    const tx = cx + (o.tail[0] - cx) * s, ty = cy + (o.tail[1] - cy) * s, a = Math.atan2((ty - cy) / ry, (tx - cx) / rx);
    if (kind === 'thought') {
      const ex = cx + Math.cos(a) * rx * 1.05, ey = cy + Math.sin(a) * ry * 1.05;
      for (let i = 0; i < 3; i++) { const u = 0.22 + i * 0.32; parts.push(cmCirclePts(lerp(ex, tx, u), lerp(ey, ty, u), size * (0.3 - i * 0.075), 20)); }
    } else {
      const d = 0.2, k = 0.93;
      parts.push([[cx + Math.cos(a - d) * rx * k, cy + Math.sin(a - d) * ry * k], [tx, ty], [cx + Math.cos(a + d * 0.6) * rx * k, cy + Math.sin(a + d * 0.6) * ry * k]]);
    }
  }
  const fill = o.fill ?? CM.white;
  ctx.save(); ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(w * 1.1 * s, w * 1.3 * s); ctx.fillStyle = CM.ink; for (const P of parts) { cmPath(P); ctx.fill(); } ctx.restore();   // hard shadow
  ctx.strokeStyle = CM.ink; ctx.lineWidth = w * 2; for (const P of parts) { cmPath(P); ctx.stroke(); }                                     // outline (outer half shows)
  ctx.fillStyle = fill; for (const P of parts) { cmPath(P); ctx.fill(); }
  cmFont(size); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.c ?? CM.ink;
  lines.forEach((l, i) => ctx.fillText(l, cx, cy - (lines.length - 1) / 2 * lh + i * lh + size * 0.37));
  ctx.restore();
}

// an idea bulb: yellow glass, a striped base, ink rays that flick on 2s. (x, y) = centre of the glass, s = its diameter.
function cmBulb(x, y, s, o = {}) {
  const k = o.t0 != null ? cmPop(o.t0) : 1; if (k <= 0.03) return;
  const r = s * 0.5 * k, lw = Math.max(4, r * 0.16);
  const R = RNG('cmbulb', o.key ?? 'b');
  ctx.save(); ctx.strokeStyle = CM.ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < 7; i++) { const a = -Math.PI + (i + 0.5) / 7 * Math.PI + R.n(0.05), flick = (B + i) % 2 ? 1 : 0.8, a0 = r * 1.45, a1 = r * (1.45 + 0.6 * flick); ctx.moveTo(x + Math.cos(a) * a0, y + Math.sin(a) * a0); ctx.lineTo(x + Math.cos(a) * a1, y + Math.sin(a) * a1); }
  ctx.stroke(); ctx.restore();
  cmShape([[x - r * 0.5, y + r * 0.7], [x + r * 0.5, y + r * 0.7], [x + r * 0.42, y + r * 1.5], [x - r * 0.42, y + r * 1.5]], CM.white, { w: lw });
  cmLine([[x - r * 0.46, y + r * 1.12], [x + r * 0.46, y + r * 1.12]], { w: lw * 0.8 });
  cmShape(cmCirclePts(x, y, r, 40), CM.yellow, { w: lw });
  ctx.save(); ctx.strokeStyle = CM.white; ctx.lineWidth = lw * 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r * 0.62, -2.6, -1.75); ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: BANG — a red squircle kid with a yellow three-spike quiff, big white eyes, black noodle limbs,
//  white mitts, yellow boots and a blue cape. (x, y) = body centre, r = half the body's height (feet at y + 1.3r).
//  o: { key, mood: 'think' | 'aha' | 'grin' | 'dash', look (-1..1), lookY, squash, rot, wind (0 cape hangs .. 1 streams back),
//       bob, hands: [[lx, ly], [rx, ry]] in r units, stride (-1..1 legs swept back), c }
// ---------------------------------------------------------------------
function cmHeroPts(x, y, r, n = 72) {
  const P = [], e = 2 / 3.4;
  for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a), px = Math.sign(c) * Math.abs(c) ** e, py = Math.sign(s) * Math.abs(s) ** e; P.push([x + px * r * 0.9 * (1 + 0.07 * py), y + py * r]); }
  return P;
}
function cmHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', mood = o.mood ?? 'grin', lw = Math.max(5, r * 0.085), col = o.c ?? CM.red;
  y += (o.bob ?? Math.sin(TT * TAU * 0.9 + key.length) * 0.035) * r;
  SPARK_AT = toScreen(x, y);
  const sq = 1 + (o.squash ?? 0), wind = o.wind ?? 0, stride = o.stride ?? 0, look = o.look ?? 0, lookY = o.lookY ?? 0;
  const HANDS = { think: [[-1.02, 0.42], [0.42, 0.66]], aha: [[-1.02, -1.12], [1.08, 0.3]], grin: [[-1.08, 0.45], [1.08, 0.45]], dash: [[-1.05, 0.62], [1.2, -0.98]] };
  const hands = o.hands ?? HANDS[mood] ?? HANDS.grin;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.translate(0, r * 1.3); ctx.scale(1 / Math.sqrt(sq), sq); ctx.translate(0, -r * 1.3);
  // cape (behind): pinned at the left shoulder, its scalloped hem flaps on 2s
  {
    const A = [-0.2 * r, -0.72 * r], Bp = [-0.82 * r, -0.2 * r], fl = Math.sin(TT * 9 + key.length) * 0.07 * r;
    const E = [lerp(-1.0, -2.25, wind) * r + fl, lerp(1.0, 0.5, wind) * r - fl * 0.6], m = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2];
    const d = Math.hypot(E[0] - m[0], E[1] - m[1]) || 1, nx = -(E[1] - m[1]) / d, ny = (E[0] - m[0]) / d, hw = 0.62 * r, P = [A];
    for (let i = 0; i <= 6; i++) { const u = i / 6 * 2 - 1, zig = (i % 2 ? -0.16 : 0.06) * r; P.push([E[0] + nx * hw * u + (E[0] - m[0]) / d * zig, E[1] + ny * hw * u + (E[1] - m[1]) / d * zig]); }
    P.push(Bp);
    cmShape(P, CM.blue, { w: lw, join: 'miter' });
    cmDots(P, CM.blueD, { pitch: Math.max(9, r * 0.12), from: m, to: E });
    cmShape(P, null, { w: lw, join: 'miter' });
  }
  // legs and boots
  for (const s of [-1, 1]) {
    const hx = s * 0.36 * r, fx = hx + s * 0.06 * r - stride * (0.55 + 0.15 * s) * r, fy = (1.28 - Math.abs(stride) * (0.1 + 0.08 * s)) * r;
    cmLine([[hx, 0.86 * r], [(hx + fx) / 2 - stride * 0.1 * r, 1.1 * r], [fx, fy]], { w: lw * 1.7 });
    cmShape(ellipsePts(fx + (stride ? -0.05 : 0.1) * r, fy, 0.25 * r, 0.14 * r, -stride * 0.5, 24), CM.yellow, { w: lw * 0.9 });
  }
  // quiff (its base hides behind the body)
  cmShape([[-0.3, -0.92], [-0.2, -1.34], [-0.02, -1.1], [0.2, -1.5], [0.24, -1.08], [0.56, -1.26], [0.38, -0.88]].map(([a, b]) => [a * r, b * r]), CM.yellow, { w: lw, join: 'miter' });
  const arm = (i) => { const s = i ? 1 : -1, h = hands[i], sx = s * 0.82 * r, sy = 0.08 * r, hx = h[0] * r, hy = h[1] * r; cmLine([[sx, sy], [(sx + hx) / 2 + s * 0.12 * r, (sy + hy) / 2 + 0.12 * r], [hx, hy]], { w: lw * 1.6 }); };
  const mitt = (i) => { const h = hands[i]; cmShape(cmCirclePts(h[0] * r, h[1] * r, 0.21 * r, 24), CM.white, { w: lw * 0.9 }); };
  const front = (i) => Math.abs(hands[i][0]) < 0.8;   // a hand over the body (hand on chin) draws after it
  for (const i of [0, 1]) if (!front(i)) { arm(i); mitt(i); }
  if (mood === 'aha') cmLine([[hands[0][0] * r, hands[0][1] * r], [hands[0][0] * r - 0.02 * r, (hands[0][1] - 0.42) * r]], { w: lw * 1.5 });   // a pointing finger
  // body: flat red, dot shading toward the lower right, a white shine
  const body = cmHeroPts(0, 0, r);
  cmShape(body, col, { w: lw });
  cmDots(body, CM.redD, { pitch: Math.max(9, r * 0.125), from: [-0.1 * r, -0.1 * r], to: [1.0 * r, 1.05 * r] });
  cmShape(body, null, { w: lw });
  ctx.save(); ctx.strokeStyle = CM.white; ctx.lineWidth = lw * 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.66 * r, -0.42 * r); ctx.quadraticCurveTo(-0.66 * r, -0.74 * r, -0.36 * r, -0.78 * r); ctx.stroke(); ctx.restore();
  // face
  const blink = (B + key.length * 7) % 37 < 1 && mood !== 'aha', wide = mood === 'aha' ? 1.18 : 1;
  for (const s of [-1, 1]) {
    const ex = s * 0.31 * r, ey = -0.2 * r;
    if (blink) { cmLine([[ex - 0.2 * r, ey], [ex + 0.2 * r, ey]], { w: lw * 0.9 }); continue; }
    cmShape(ellipsePts(ex, ey, 0.215 * r, 0.285 * r * wide, 0, 28), CM.white, { w: lw * 0.75 });
    ctx.fillStyle = CM.ink; ctx.beginPath(); ctx.arc(ex + look * 0.09 * r, ey + (lookY + (mood === 'think' ? -0.5 : 0)) * 0.12 * r, (mood === 'aha' ? 0.075 : 0.1) * r, 0, TAU); ctx.fill();
  }
  const brow = { think: [[-0.52, -0.6, -0.12, -0.52], [0.1, -0.72, 0.52, -0.64]], aha: [[-0.52, -0.74, -0.12, -0.8], [0.12, -0.8, 0.52, -0.74]], grin: [[-0.52, -0.62, -0.12, -0.66], [0.12, -0.66, 0.52, -0.62]], dash: [[-0.54, -0.68, -0.1, -0.5], [0.1, -0.5, 0.54, -0.68]] }[mood] ?? [];
  for (const [a, b, c, d] of brow) cmLine([[a * r, b * r], [c * r, d * r]], { w: lw * 1.15 });
  if (mood === 'think') cmLine([[0.02 * r, 0.46 * r], [0.16 * r, 0.41 * r], [0.34 * r, 0.47 * r]], { w: lw });
  else if (mood === 'aha') {
    const M = ellipsePts(0, 0.44 * r, 0.27 * r, 0.22 * r, 0, 28);
    cmShape(M, CM.ink, { w: lw * 0.7 });
    ctx.save(); cmPath(M); ctx.clip(); ctx.fillStyle = CM.white; ctx.fillRect(-0.3 * r, 0.2 * r, 0.6 * r, 0.11 * r); ctx.restore();
  } else {
    ctx.save(); ctx.beginPath(); ctx.moveTo(-0.4 * r, 0.3 * r); ctx.lineTo(0.4 * r, 0.3 * r); ctx.quadraticCurveTo(0.36 * r, 0.74 * r, 0, 0.72 * r); ctx.quadraticCurveTo(-0.36 * r, 0.74 * r, -0.4 * r, 0.3 * r); ctx.closePath();
    ctx.fillStyle = CM.white; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = CM.ink; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.36 * r, 0.47 * r); ctx.lineTo(0.36 * r, 0.47 * r); ctx.lineWidth = lw * 0.5; ctx.stroke(); ctx.restore();
  }
  for (const i of [0, 1]) if (front(i)) { arm(i); mitt(i); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size). The caption is a yellow box with a black border and a
//  hard shadow; *a phrase* is set in red. Both pop in and snap shut during the first 0.3s of a bridge's shrink.
// ---------------------------------------------------------------------
function cmLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
// a caption's start time, held back until the bridge that opens its era has finished growing (no box floating over the window)
function cmArrive(t0) {
  if (typeof BRIDGES !== 'undefined') for (const r of BRIDGES) { const d = r.d ?? 0.6; if (E0 > r.tc - d && E0 < r.tc + d) t0 = Math.max(t0, r.tc + d); }
  return t0;
}
// o: { x (centre), y (baseline of the last line), size, at (seconds after the era starts), hi, fill, tilt }
function cmCaptionNow(str, o = {}) {
  const s = cmLeaving() * cmPop(cmArrive(E0 + (o.at ?? 0.7)), { k: 420, d: 24 }); if (s <= 0.03) return;
  const size = o.size ?? 58, lh = size * 1.16, lines = str.split('\n'), cx = o.x ?? CX, yLast = o.y ?? 1470, pad = size * 0.5;
  const rows = lines.map((line) => { const ws = line.split(/(\*[^*]+\*)/).filter((g) => g.trim()).map((g) => (g[0] === '*' ? { w: g.slice(1, -1).trim(), hi: true } : { w: g.trim(), hi: false })); return ws; });
  cmFont(size); const sp = ctx.measureText(' ').width;
  const widths = rows.map((ws) => ws.reduce((a, d) => a + ctx.measureText(d.w).width, 0) + sp * (ws.length - 1)), bw = Math.max(...widths) + pad * 2, bh = (lines.length - 1) * lh + size * 0.76 + pad * 1.7;
  const top = yLast - (lines.length - 1) * lh - size * 0.76 - pad * 0.85, cy = top + bh / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.tilt ?? -1.5 * DEG); ctx.scale(s, s); ctx.translate(-cx, -cy);
  cmShape(cmRectPts(cx - bw / 2, top, bw, bh), o.fill ?? CM.yellow, { w: 7, shadow: [10, 12], join: 'miter' });
  cmFont(size); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  rows.forEach((ws, li) => {
    let xx = cx - widths[li] / 2; const yy = yLast - (lines.length - 1 - li) * lh;
    for (const d of ws) { cmFont(size); ctx.textAlign = 'left'; ctx.fillStyle = d.hi ? (o.hi ?? CM.red) : CM.ink; ctx.fillText(d.w, xx, yy); xx += ctx.measureText(d.w).width + sp; }
  });
  ctx.restore();
}
// a panel number chip and a label, top-left: cmTag('1', 'IDE', { c })
function cmTagNow(num, label, o = {}) {
  const s = cmLeaving() * cmPop(cmArrive(E0 + (o.at ?? 0.15)), { k: 420, d: 24 }); if (s <= 0.03) return;
  const x = o.x ?? 74, y = o.y ?? 262, h = 68, size = 40, lw = cmTextW(label, size), w = h + lw + 44;
  ctx.save(); ctx.translate(x, y + h / 2); ctx.scale(s, s); ctx.translate(-x, -(y + h / 2));
  cmShape(cmRectPts(x, y, w, h), CM.white, { w: 6, shadow: [7, 9], join: 'miter' });
  cmShape(cmRectPts(x, y, h, h), o.c ?? CM.red, { w: 6, join: 'miter' });
  cmFont(size); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center'; ctx.fillStyle = CM.white; ctx.fillText(num, x + h / 2, y + h / 2 + size * 0.36);
  ctx.textAlign = 'left'; ctx.fillStyle = CM.ink; ctx.fillText(label, x + h + 20, y + h / 2 + size * 0.36);
  ctx.restore();
}
const cmCaption = (str, o = {}) => { const f = () => cmCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const cmTag = (num, label, o = {}) => { const f = () => cmTagNow(num, label, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  post: newsprint — a static seeded speckle of fibres and flecks (cached once; nothing changes between frames)
// ---------------------------------------------------------------------
let cmGrainCv = null;
function cmGrain() {
  if (!cmGrainCv || cmGrainCv.width !== W || cmGrainCv.height !== H) {
    cmGrainCv = document.createElement('canvas'); cmGrainCv.width = W; cmGrainCv.height = H;
    const g = cmGrainCv.getContext('2d'), R = RNG('cmgrain');
    g.fillStyle = 'rgba(70,45,10,0.07)'; for (let i = 0; i < 9000; i++) g.fillRect(R.r(0, W), R.r(0, H), R.r(1, 3.5), R.r(1, 2.5));
    g.fillStyle = 'rgba(255,250,235,0.10)'; for (let i = 0; i < 5000; i++) g.fillRect(R.r(0, W), R.r(0, H), R.r(1, 3), R.r(1, 3));
    g.strokeStyle = 'rgba(70,45,10,0.06)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 500; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(8, 26); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); } g.stroke();
  }
  return cmGrainCv;
}
function cmPost() { ctx.save(); screen(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(cmGrain(), 0, 0); ctx.restore(); }

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'comic',
  paper: CM.paper,
  // the page between panels: flat colour under a faint ink dot screen
  backdrop(c) { fillAll(c); ctx.save(); screen(); cmDots(null, 'rgba(21,18,15,0.07)', { pitch: 26, g: 0.55, box: [0, 0, W, H] }); ctx.restore(); },
  // the era seen through outline P like a cut-out panel: a hard ink shadow, the art, a thick ink rim
  window(P, key, src) {
    ctx.save(); ctx.translate(12, 14); cmPath(P); ctx.fillStyle = CM.ink; ctx.fill(); ctx.restore();
    ctx.save(); cmPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); cmPath(P); ctx.lineWidth = 13; ctx.lineJoin = 'miter'; ctx.strokeStyle = CM.ink; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: speed lines behind, flat colour, dot shading, thick ink, hard shadow
  blob(P, c, key) {
    const [cx, cy] = cmCentroid(P), b = cmBox(P), r = Math.max(b[2] - b[0], b[3] - b[1]) / 2;
    cmSpeed(cx, cy, r * 1.25, 2300, { n: 56, c: 'rgba(21,18,15,0.16)', key, w: 0.016 });
    cmShape(P, c, { w: 13, shadow: [12, 14], join: 'miter' });
    cmDots(P, 'rgba(200,90,10,0.55)', { pitch: 20, from: [cx - r * 0.1, cy - r * 0.1], to: [cx + r * 0.8, cy + r * 0.9] });
    cmShape(P, null, { w: 13, join: 'miter' });
  },
  hero(x, y, r, o = {}) { cmHero(x, y, r * 0.62, { key: o.key, mood: o.mood === 'wow' ? 'aha' : o.mood }); },
  heroColor: CM.red,
  heroPts(x, y, r) { return cmHeroPts(x, y, r * 0.62); },
  post() { cmPost(); },
  ones: false,
};
