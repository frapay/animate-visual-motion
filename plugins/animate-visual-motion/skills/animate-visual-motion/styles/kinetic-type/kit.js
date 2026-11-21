// =====================================================================
//  styles/kinetic-type/kit.js — kinetic typography + Swiss / editorial infographic.
//  Type IS the picture: huge heavy grotesk words on a strict grid, near-black ink on warm off-white paper
//  (or inverted: paper on ink), ONE loud signal accent, an electric-blue second used sparingly.
//  Words enter from behind baseline masks, slam on the beat with a scale punch, swap, condense to fit;
//  solid-vs-outline word contrast, highlight bars sweeping behind a word, counting numbers, growing bars,
//  percentage rings, hairline rules and index numbers ("01 —"), colour-block wipes.
//  The hero is a full stop that came alive: an accent dot with two eyes that hops from word to word.
//  Motion on 1s, expo / snappy-spring easing. Built on kit/core.js.
//  Needs from the piece head: W, H, FPS, CX (caption centre x). Optional `const KT_DARK = true` before the kit
//  makes ink the default paper.
// =====================================================================

// ---- palette (6-digit hex: the renderer's mixHex blends these)
const KT_DARKMODE = typeof KT_DARK !== 'undefined' && !!KT_DARK;
const KT = {
  paper: '#f2efe8', paperD: '#e2ddd2', paperDD: '#c9c3b6',    // the light ground, rules on it, secondary marks
  ink: '#141414', inkL: '#2a2a2a', inkM: '#77736b',           // the ink (also the dark ground), its lifted tone, captions grey
  accent: '#ff4b1f', accentD: '#d63a12', accentL: '#ffb39e',  // THE accent: the hero, the one word, the ring
  blue: '#2f4bff', blueL: '#aab6ff',                          // second colour: one data series, one mark. Never with text on it
  white: '#ffffff',
};
KT.ground = KT_DARKMODE ? KT.ink : KT.paper;
const KT_SANS = '"Helvetica Neue", "Arial Black", "Segoe UI Black", "Segoe UI", Inter, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
const KT_MONO = '"SF Mono", Menlo, Consolas, "Cascadia Mono", "DejaVu Sans Mono", monospace';

// ---------------------------------------------------------------------
//  easing: expo out (the type slam), a scale punch on the beat
// ---------------------------------------------------------------------
const ktExpo = (t) => { t = clamp(t); return t >= 1 ? 1 : 1 - 2 ** (-10 * t); };
const ktExpoIO = (t) => { t = clamp(t); return t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2; };
// 0..1 progress of an entrance at t0 over d seconds, expo out
const ktIn = (t0, d = 0.35) => (TT < t0 ? 0 : ktExpo((TT - t0) / d));
// a scale punch: 1 + amt right at t0, decaying fast. Pass several times (beats) to punch on each.
function ktPunch(times, amt = 0.07, k = 11) { let s = 1; for (const t of [].concat(times)) if (TT >= t) s += amt * Math.exp(-(TT - t) * k); return s; }
const ktBlink = (key, period = 70) => mod(F + hash('ktb', key) % period, period) < 3;
function ktZoom() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }

// ---------------------------------------------------------------------
//  type
// ---------------------------------------------------------------------
// track = extra letter spacing in px on top of the display tracking (outline words need it: see ktText)
function ktFont(size, weight = 900, mono = false, track = 0) {
  ctx.font = `${weight} ${size}px ${mono ? KT_MONO : KT_SANS}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(mono ? 0 : -Math.round(size * 0.035)) + track}px`;   // tight tracking on display sizes
}
function ktTextW(str, size, weight = 900, mono = false, track = 0) { ctx.save(); ktFont(size, weight, mono, track); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// An outline (hollow) word is stroked on the glyph edge, so each letter grows by half the stroke on every side and the
// tight display tracking would make neighbours collide. ktOutline gives the geometry both ktText and ktWords use:
// hs = the stroke's horizontal width on screen, lw = ctx.lineWidth under scale(sx, 1), track = letter spacing to add.
// (Under a condensing sx the stroke cannot be uniform; sqrt splits the error between verticals and horizontals.)
function ktOutline(outline, sx = 1) { const r = Math.sqrt(sx), hs = outline * r; return { hs, lw: outline / r, track: hs / sx }; }
const KT_MIN_SX = 0.62;   // a word is never condensed further than this; ktWords shrinks the size for the rest
// fit one word to maxW: returns { size, sx, w } (w = drawn width, including an outline's stroke)
function ktFit(str, size, maxW, outline = 0, sxFixed = null) {
  let sx = sxFixed ?? 1, w = 0;
  const width = () => { const ol = outline ? ktOutline(outline, sx) : null; return ktTextW(str, size, 900, false, ol ? ol.track : 0) * sx + (ol ? ol.hs : 0); };
  w = width();
  if (sxFixed == null && maxW && w > maxW) {
    for (let i = 0; i < 4; i++) { sx = Math.max(KT_MIN_SX, sx * maxW / w); w = width(); }
    if (w > maxW + 0.5) { size *= maxW / w; w = width(); if (w > maxW) { size *= maxW / w; w = width(); } }
  }
  return { size, sx, w };
}
// one string. o: align, weight, sx (horizontal scale: <1 condensed, >1 extended), outline (stroke width: hollow word),
// track (extra letter spacing), al, mono, base. Returns the drawn width. An outline word is inset by half its stroke, so
// its outer edge (not the glyph edge) sits on x, and it gets the stroke's width back as tracking.
function ktText(str, x, y, size, color, o = {}) {
  const sx = o.sx ?? 1, ol = o.outline ? ktOutline(o.outline, sx) : null;
  ctx.save(); ktFont(size, o.weight ?? 900, o.mono, (o.track ?? 0) + (ol ? ol.track : 0));
  ctx.textBaseline = o.base ?? 'alphabetic'; ctx.textAlign = 'left';
  const w = ctx.measureText(str).width, dw = w * sx + (ol ? ol.hs : 0);
  const x0 = o.align === 'center' ? x - dw / 2 : o.align === 'right' ? x - dw : x;
  ctx.globalAlpha *= o.al ?? 1;
  ctx.translate(x0 + (ol ? ol.hs / 2 : 0), y); ctx.scale(sx, 1);
  if (ol) { ctx.lineWidth = ol.lw; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.strokeText(str, 0, 0); }
  else { ctx.fillStyle = color; ctx.fillText(str, 0, 0); }
  ctx.restore(); return dw;
}

// Lines revealed from behind their own baseline mask, one after another.
// lines: ['WORD', { s: 'WORD', c, outline, hi: '#hex', hiT, sx, size, t0 }, ...]; (x, y) = first baseline.
// o: size, lh (line height, default size*0.98), t0, stagger, d, c, align, maxW (a wider line is condensed down to
//    KT_MIN_SX, then shrunk), out (time the lines leave upward, same stagger), punch (times: the block punches on
//    these), from ('below' | 'above'), lead (default 0.08s).
// A line's t0 is the BEAT IT LANDS ON: the rise starts `lead` earlier, so on the beat frame the word is ~3/4 out of
// its mask and still moving (expo out). Without the lead the beat frame shows an empty mask and the word reads late.
// A `hi` line sits on a bar that sweeps in just after it lands; the part of the word over the bar is drawn in hiT
// (default ink), the rest in the line's colour, so the word stays readable on any ground while the bar arrives.
// Returns the line boxes [{ x, y, w, size, sx, t0, hi, right }] (right = the right edge incl. the bar: land the hero there).
function ktWords(lines, x, y, o = {}) {
  const size0 = o.size ?? 160, lh = o.lh ?? size0 * 0.98, st = o.stagger ?? 0.12, d = o.d ?? 0.4, lead = o.lead ?? 0.08, boxes = [];
  lines.forEach((ln, i) => {
    const L = typeof ln === 'string' ? { s: ln } : ln, yy = y + i * lh;
    const t0 = (L.t0 ?? (o.t0 ?? 0) + i * st), ts = t0 - lead;
    const { size, sx, w } = ktFit(L.s, L.size ?? size0, o.maxW, L.outline || 0, L.sx ?? null);
    const x0 = (o.align ?? 'left') === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    const padX = size * 0.08;
    boxes.push({ x: x0, y: yy, w, size, sx, t0, hi: !!L.hi, right: x0 + w + (L.hi ? padX : 0) });
    if (TT <= ts) return;
    let off = (1 - ktIn(ts, d)) * size * 1.05 * (o.from === 'above' ? -1 : 1);
    const to = o.out != null ? o.out + i * st * 0.6 : null;
    if (to != null && TT >= to) off -= ktExpoIO((TT - to) / 0.35) * size * 1.1;
    if (to != null && TT >= to + 0.35) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - size * 0.2, yy - size * 0.86, w + size * 0.4, size * 1.08); ctx.clip();   // the baseline mask
    const p = ktPunch(o.punch ?? [], 0.06), cx = x0 + w / 2, cy = yy - size * 0.35;
    ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
    const col = L.c ?? o.c ?? (KT_DARKMODE ? KT.paper : KT.ink);
    ktText(L.s, x0, yy + off, size, col, { sx, outline: L.outline });
    if (L.hi) {
      const by = yy - size * 0.8 + Math.min(0, off), bh = size * 0.88;   // cap height 0.72: 0.08 of air above and below
      const ex = ktHighlight(x0 - padX, by, w + padX * 2, bh, t0 + 0.08, L.hi, { d: 0.3 });
      if (ex) { ctx.beginPath(); ctx.rect(ex[0], by, ex[1] - ex[0], bh); ctx.clip(); ktText(L.s, x0, yy + off, size, L.hiT ?? KT.ink, { sx, outline: L.outline }); }
    }
    ctx.restore();
  });
  return boxes;
}
// a word that swaps for the next one on each time: words [[t, 'WORD'], ...]; each new word pushes the old one up
function ktSwap(words, x, y, size, color, o = {}) {
  let k = -1; words.forEach(([t], i) => { if (TT >= t) k = i; }); if (k < 0) return;
  const [t, s] = words[k], u = ktIn(t, o.d ?? 0.3), prev = k > 0 ? words[k - 1][1] : null;
  const w = Math.max(ktTextW(s, size), prev ? ktTextW(prev, size) : 0);
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - size * 0.2, y - size * 0.86, w + size * 0.4, size * 1.08); ctx.clip();
  if (prev && u < 1) ktText(prev, x, y - u * size * 1.05, size, color, { align: o.align });
  ktText(s, x, y + (1 - u) * size * 1.05, size, color, { align: o.align });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  marks: highlight bars, rules, grid, wipes, index numbers
// ---------------------------------------------------------------------
// a flat bar that sweeps in left-to-right behind a word (o.d duration, o.out: sweeps away to the right).
// Returns the drawn extent [xLeft, xRight] (null before t0), so a caller can recolour the text over it.
function ktHighlight(x, y, w, h, t0, c = KT.accent, o = {}) {
  if (TT < t0) return null; const u = ktExpo((TT - t0) / (o.d ?? 0.3));
  let a = 0, b = u; if (o.out != null && TT > o.out) a = ktExpo((TT - o.out) / (o.d ?? 0.3));
  ctx.save(); ctx.fillStyle = c; ctx.fillRect(x + w * a, y, w * (b - a), h); ctx.restore();
  return [x + w * a, x + w * b];
}
// a hairline rule drawing on from (x1, y) to (x2, y); width screen-constant
function ktRule(x1, y, x2, t0 = -1, c = KT.ink, o = {}) {
  const u = TT < t0 ? 0 : ktExpo((TT - t0) / (o.d ?? 0.5)); if (u <= 0) return;
  ctx.save(); ctx.fillStyle = c; ctx.globalAlpha *= o.al ?? 1; const w = (o.w ?? 3) / ktZoom();
  ctx.fillRect(x1, y - w / 2, (x2 - x1) * u, w); ctx.restore();
}
// the faint column grid (6 columns by default) with crop marks (background life: the columns breathe in alpha)
function ktGrid(c = KT.ink, o = {}) {
  const x0 = o.x0 ?? 80, x1 = o.x1 ?? 940, cols = o.cols ?? 6, al = (o.al ?? 0.07) * (0.85 + 0.15 * Math.sin(TT * 2.1));
  ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = al; const w = 2 / ktZoom();
  for (let i = 0; i <= cols; i++) { const x = lerp(x0, x1, i / cols); ctx.fillRect(x - w / 2, o.y0 ?? 200, w, (o.y1 ?? 1560) - (o.y0 ?? 200)); }
  ctx.globalAlpha = (o.al ?? 0.07) * 4;
  for (const [x, y] of [[x0, o.y0 ?? 200], [x1, o.y0 ?? 200], [x0, o.y1 ?? 1560], [x1, o.y1 ?? 1560]]) { ctx.fillRect(x - 18, y - w / 2, 36, w * 1.5); ctx.fillRect(x - w / 2, y - 18, w * 1.5, 36); }
  ctx.restore();
}
// a colour-block wipe across the frame: dir 'up' | 'left'; covers over [t0, t0+d], uncovers over [t0+d+hold, ...]
function ktWipe(t0, d, c, o = {}) {
  if (TT < t0) return; const a = ktExpoIO((TT - t0) / d), hold = o.hold ?? 0, b = ktExpoIO((TT - t0 - d - hold) / d);
  if (b >= 1) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = c;
  if (o.dir === 'left') ctx.fillRect(W * (1 - a), 0, W * (a - b), H); else ctx.fillRect(0, H * (1 - a), W, H * (a - b));
  ctx.restore();
}
// a running ticker band: text repeated, scrolling left at speed px/s. The band is a texture, not reading text:
// it is drawn on a scratch canvas (redrawn in full every frame, so nothing carries between frames; only the canvas
// object is reused) and then blitted, so tools/textcheck.mjs, which traces text drawn on the frame, never sees its
// strings and doesn't flag their deliberate run past the frame edges. Keep anything the viewer must read out of it.
// Defaults: an ink band with paper type (a paper band with ink type in the dark variant).
let KT_TICK = null;
function ktTicker(y, h, str, o = {}) {
  const bg = o.bg ?? (KT_DARKMODE ? KT.paper : KT.ink), fg = o.fg ?? (KT_DARKMODE ? KT.ink : KT.paper), size = o.size ?? h * 0.56, sp = o.speed ?? 160;
  const u = o.t0 != null ? ktIn(o.t0, 0.4) : 1; if (u <= 0) return;
  const bw = W + 400, bh = Math.ceil(h);
  if (!KT_TICK || KT_TICK.width !== bw || KT_TICK.height !== bh) { KT_TICK = document.createElement('canvas'); KT_TICK.width = bw; KT_TICK.height = bh; }
  const keep = ctx; ctx = KT_TICK.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, bw, bh);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, bw, bh);
  const unit = str + '  ●  ', uw = ktTextW(unit, size, 800);
  for (let x = -mod(TT * sp, uw) - uw; x < bw + uw; x += uw) ktText(unit, x, h * 0.5 + size * 0.36, size, fg, { weight: 800 });
  ctx = keep;
  ctx.save(); ctx.beginPath(); ctx.rect(-200, y, bw, h * u); ctx.clip(); ctx.drawImage(KT_TICK, -200, y); ctx.restore();
}

// ---------------------------------------------------------------------
//  data: counters, bars, rings
// ---------------------------------------------------------------------
const ktNum = (v, dec = 0) => { const s = v.toFixed(dec).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return s.join(','); };   // id-ID: 12.480 / 2,5
// a number counting from `from` to `to` over [t0, t0+d] (expo out), with suffix. Number + suffix are aligned as one
// group (o.align 'left' | 'center' | 'right' on x). Returns the group's drawn width.
function ktCounter(x, y, size, color, t0, d, from, to, o = {}) {
  const v = TT < t0 ? from : lerp(from, to, ktExpo((TT - t0) / d)), s = ktNum(v, o.dec ?? 0), sx = o.sx ?? 1;
  const w = ktTextW(s, size) * sx, ss = size * (o.suffixK ?? 0.6), gap = o.suffix ? size * 0.04 : 0, sw = o.suffix ? ktTextW(o.suffix, ss) * sx : 0;
  const tot = w + gap + sw, x0 = o.align === 'center' ? x - tot / 2 : o.align === 'right' ? x - tot : x;
  ktText(s, x0, y, size, color, { sx });
  if (o.suffix) ktText(o.suffix, x0 + w + gap, y, ss, o.suffixC ?? color, { sx });
  return tot;
}
// a horizontal bar growing from x to x + w*frac (frac 0..1 already eased by the caller, or via o.t0/o.d)
function ktBar(x, y, w, h, frac, c = KT.accent, o = {}) {
  const f = o.t0 != null ? frac * (TT < o.t0 ? 0 : springEase(TT - o.t0, SPRING.snappy.k, SPRING.snappy.d)) : frac;
  if (o.track) { ctx.fillStyle = o.track; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = c; ctx.fillRect(x, y, w * Math.max(0, f), h);
  return x + w * Math.max(0, f);
}
// a vertical bar standing on baseline y
function ktColumn(x, y, w, h, frac, c = KT.accent) { const hh = h * Math.max(0, frac); ctx.fillStyle = c; ctx.fillRect(x, y - hh, w, hh); return y - hh; }
// a percentage ring (butt caps, flat): frac 0..1 from 12 o'clock clockwise. Returns the arc head point.
function ktRing(x, y, r, w, frac, c = KT.accent, o = {}) {
  ctx.save(); ctx.lineCap = 'butt';
  if (o.track) { ctx.strokeStyle = o.track; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
  const a0 = -Math.PI / 2, a1 = a0 + TAU * clamp(frac, 0, 1);
  if (frac > 0) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); }
  ctx.restore();
  return [x + Math.cos(a1) * r, y + Math.sin(a1) * r];
}
const ktCirclePts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
// a rectangle outline centred on (x, y), w by h, as dense points (a bridge shape: the Swiss block). rot in radians.
function ktBoxPts(x, y, w, h = w, rot = 0, n = 24) {
  const P = [], C = [[-1, -1], [1, -1], [1, 1], [-1, 1]], c = Math.cos(rot), s = Math.sin(rot);
  for (let k = 0; k < 4; k++) for (let i = 0; i < n; i++) {
    const a = C[k], b = C[(k + 1) % 4], px = lerp(a[0], b[0], i / n) * w / 2, py = lerp(a[1], b[1], i / n) * h / 2;
    P.push([x + px * c - py * s, y + px * s + py * c]);
  }
  return P;
}
function ktPath(P) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

// ---------------------------------------------------------------------
//  the hero: a full stop that came alive. (x, y) = its centre, r its radius.
//  o: key, color, look (-1..1 pupils), squash (0..1 landing squash), mood ('dot' | 'wow'), eyes (false = plain dot)
// ---------------------------------------------------------------------
function ktDot(x, y, r, o = {}) {
  const key = o.key ?? 'hero', sq = o.squash ?? 0;
  const br = 1 + 0.025 * Math.sin(TT * TAU * 1.1 + hash('ktd', key) % 7);
  const sx = (1 + sq * 0.28) * br, sy = (1 - sq * 0.24) / br;
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y + r * (1 - sy)); ctx.scale(sx, sy);
  ctx.fillStyle = o.color ?? KT.accent; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  if (o.eyes !== false && r > 10) {
    const blink = ktBlink(key), lk = (o.look ?? 0) * r * 0.12, ey = -r * 0.08, wow = o.mood === 'wow';
    for (const s of [-1, 1]) {
      ctx.fillStyle = o.eyeC ?? KT.ink; ctx.beginPath();
      if (blink) ctx.rect(s * r * 0.3 - r * 0.13 + lk, ey - r * 0.025, r * 0.26, r * 0.05);
      else ctx.ellipse(s * r * 0.3 + lk, ey, r * (wow ? 0.13 : 0.1), r * (wow ? 0.17 : 0.15), 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
// a hop along a parabola from point a to point b over [t0, t0+d]; returns { x, y, squash } (squash spikes on landing)
function ktHop(a, b, t0, d, hgt = 160) {
  const u = clamp((TT - t0) / d), x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * hgt;
  const land = TT >= t0 + d ? Math.exp(-(TT - t0 - d) * 14) * Math.cos((TT - t0 - d) * 30) : 0;
  const take = TT < t0 && TT > t0 - 0.12 ? (1 - (t0 - TT) / 0.12) * 0.6 : 0;
  const air = u > 0 && u < 1;
  // in the air the dot stretches along its travel (negative squash), most at take-off and touch-down, round at the top
  return { x, y, squash: air && hgt > 0 ? -0.3 * Math.abs(Math.cos(u * Math.PI)) : Math.max(0, land, take), air };
}
// a chain of hops through points P at times T (T[i] = arrival at P[i]); before T[0] it sits at P[0]
function ktHops(P, T, hgt = 160, d = 0.32) {
  let k = 0; for (let i = 1; i < T.length; i++) if (TT >= T[i] - d) k = i;
  if (k === 0) { const h = ktHop(P[0], P[0], T[0] - 1, 1e-3, 0); const land = TT >= T[0] ? Math.exp(-(TT - T[0]) * 14) * Math.cos((TT - T[0]) * 30) : 0; return { ...h, squash: Math.max(0, land) }; }
  return ktHop(P[k - 1], P[k], T[k] - d, d, hgt);
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER, screen size). Both leave during the first 0.3s of a bridge's shrink and stay
//  hidden until the bridge is over; in an era that opens out of a bridge they enter when it ends (ktEraIn), so no
//  screen-size text ever sits on top of the morph window.
// ---------------------------------------------------------------------
function ktLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d - 1e-6) return TT < r.tc ? 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)) : 0; }
  return 1;
}
// the earliest time this era's captions and tags may enter: the end of the bridge it opens out of (else no limit)
function ktEraIn() {
  if (typeof BRIDGES === 'undefined') return -1e9;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) return r.tc + (r.d ?? 0.6);
  return -1e9;
}
// 'line one\nline *highlight*' — each line rises from its baseline mask; the *phrase* sits on a bar (o.hi, default
// accent) that sweeps in after it: the phrase is in the caption colour until the bar covers it, then in o.hiT (ink).
// A line wider than o.maxW (default 860) is condensed to fit.
function ktCaptionNow(str, o = {}) {
  const al = ktLeaving(); if (al <= 0.001) return;
  const dark = o.dark ?? KT_DARKMODE, size = o.size ?? 72, lh = size * 1.12, t0 = Math.max(E0 + (o.at ?? 0.6), ktEraIn());
  const lines = str.split('\n'), yLast = o.y ?? 1452, col = o.c ?? (dark ? KT.paper : KT.ink);
  ctx.save(); ctx.globalAlpha = al;
  lines.forEach((line, li) => {
    const yy = yLast - (lines.length - 1 - li) * lh, lt = t0 + li * 0.1;
    if (TT <= lt) return;   // at lt itself the line is still fully behind its mask: draw nothing (and textcheck traces nothing)
    const parts = line.split(/(\*[^*]+\*)/).filter((g) => g.length), pad = size * 0.16;
    let ws = parts.map((g) => ktTextW(g[0] === '*' ? g.slice(1, -1) : g, size, 800) + (g[0] === '*' ? pad * 2 : 0));
    const tot = ws.reduce((a, b) => a + b, 0), sx = Math.min(1, (o.maxW ?? 860) / tot), pd = pad * sx;
    ws = ws.map((w) => w * sx);
    let xx = o.align === 'left' ? (o.x ?? 80) : (o.x ?? CX) - tot * sx / 2;
    const off = (1 - ktIn(lt, 0.4)) * size * 1.1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, yy - size * 0.92, W, size * 1.16); ctx.clip();
    parts.forEach((g, i) => {
      if (g[0] === '*') {
        const word = g.slice(1, -1), by = yy - size * 0.84 + off, bh = size * 1.06;
        ktText(word, xx + pd, yy + off, size, col, { weight: 800, sx });
        const ex = ktHighlight(xx, by, ws[i], bh, lt + 0.25, o.hi ?? KT.accent, { d: 0.3 });
        if (ex) { ctx.save(); ctx.beginPath(); ctx.rect(ex[0], by, ex[1] - ex[0], bh); ctx.clip(); ktText(word, xx + pd, yy + off, size, o.hiT ?? KT.ink, { weight: 800, sx }); ctx.restore(); }
      } else ktText(g, xx, yy + off, size, col, { weight: 800, sx });
      xx += ws[i];
    });
    ctx.restore();
  });
  ctx.restore();
}
const ktCaption = (str, o) => { const f = () => ktCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
// the index tag: "01 —— LABEL" in mono, top left, a rule drawing between
function ktTagNow(num, label, o = {}) {
  const al = ktLeaving(); if (al <= 0.001) return;
  const dark = o.dark ?? KT_DARKMODE, col = dark ? KT.paper : KT.ink, y = o.y ?? 300, x = o.x ?? 80, t0 = Math.max(E0 + (o.at ?? 0.1), ktEraIn());
  if (TT < t0) return;
  ctx.save(); ctx.globalAlpha = al;
  const u = ktIn(t0, 0.5);
  const nw = ktText(num, x, y, 34, o.numC ?? KT.accent, { mono: true, weight: 700, al: clamp(u * 3) });
  ktRule(x + nw + 18, y - 11, x + nw + 18 + 90, t0 + 0.05, col, { w: 4 });
  ctx.save(); ctx.beginPath(); ctx.rect(x + nw + 126, y - 40, 700, 52); ctx.clip();
  ktText(label, x + nw + 126, y + (1 - ktIn(t0 + 0.12, 0.4)) * 50, 34, col, { mono: true, weight: 700 });
  ctx.restore();
  if (o.right) ktText(o.right, o.rx ?? 940, y, 34, col, { mono: true, weight: 700, align: 'right', al: 0.55 * clamp(u * 2) });
  ctx.restore();
}
const ktTag = (num, label, o) => { const f = () => ktTagNow(num, label, o); if (DEFER) DEFER.push(f); else f(); };
function ktGround(c) { fillAll(c); }

// =====================================================================
//  STYLE — the renderer's hooks
// =====================================================================
const STYLE = {
  name: 'kinetic-type',
  paper: KT.ground,
  // flat, always. In a bridge's grow phase the renderer hands over a paper -> new-era blend (a muddy mid-tone);
  // this style has no soft edges, so the sheet stays blank paper until the hard-edged window has covered it.
  backdrop(c, o) { fillAll(o && o.phase === 'grow' ? STYLE.paper : c); },
  // the era seen through outline P: a hard-edged mask with a thick accent band hugging it (no softness anywhere).
  // Growing, the window opens like a flat iris: it starts as the solid accent block the morph ended on and the hole
  // snaps open from its centre over the first third of the phase, leaving the 26px band.
  window(P, key, src, o = {}) {
    const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    const rAvg = P.reduce((a, p) => a + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / P.length || 1;
    const hole = o.phase === 'grow' ? ktExpo((o.u ?? 1) / 0.35) : 1;
    // the band tapers to nothing where the window meets the bare morph shape (end of the shrink, start of the grow)
    const band = 26 * (o.phase === 'grow' ? hole : o.phase === 'shrink' ? 1 - EZ.io(seg(o.u ?? 0, 0.7, 1)) : 1);
    const k = 1 + band / rAvg, Q = P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
    ctx.save(); ktPath(Q); ctx.fillStyle = KT.accent; ctx.fill(); ctx.restore();
    if (hole <= 0) return;
    ctx.save(); ktPath(hole < 1 ? P.map(([x, y]) => [c[0] + (x - c[0]) * hole, c[1] + (y - c[1]) * hole]) : P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
  },
  // the morphing shape: one flat solid, plus a hairline offset outline in ink (the print's registration)
  blob(P, c, key, u) {
    ctx.save(); ktPath(P.map(([x, y]) => [x + 14, y + 14])); ctx.lineWidth = 3; ctx.strokeStyle = KT_DARKMODE ? KT.paper : KT.ink; ctx.stroke(); ctx.restore();
    ctx.save(); ktPath(P); ctx.fillStyle = c; ctx.fill(); ctx.restore();
  },
  hero(x, y, r, o = {}) { ktDot(x, y, r * 0.8, { key: o.key, mood: o.mood }); },
  heroColor: KT.accent,
  heroPts(x, y, r) { return ktCirclePts(x, y, r * 0.8); },
  post() {},
  ones: true,
};
