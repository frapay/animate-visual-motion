// =====================================================================
//  styles/ink-wash/kit.js — INK WASH: East Asian brush painting (sumi-e) on rice paper. Black ink in six grey
//  values on a warm off-white sheet with soft fibres. Two marks make everything:
//    the BRUSH STROKE (inwStroke): pressure makes it swell and taper; it starts with a loaded dark head and ends
//      in dry-brush streaks ("flying white") where the bristles split. It is drawn on with the brush tip leading.
//    the WET WASH (inwWash / inwPeak): pale grey with a soft feathered edge, a faint tide line and blooms; it
//      soaks outward. Mist is bare paper drifting over the washes.
//  Most of the frame stays bare paper. Exactly one colour: vermilion, for the seal stamp and the hero's crown.
//  The dry-brush texture is a cached, seeded strip of bristle streaks (inwBristle) that is laid along the stroke
//  in thin slices, so no per-pixel work happens in a frame.
//  Built on kit/core.js. Motion on 2s. Helpers are prefixed inw…; the palette is INW. Needs from the piece head: CX.
// =====================================================================
const INW = {
  paper: '#f1eadb',                                   // warm rice paper: the sheet, and the ground a morph happens on
  ink: '#1a1714',                                     // 1 burnt ink: accents, necks, leaves, near ridges (never pure black)
  dark: '#3b3733',                                    // 2 dark ink: trunks, ridge lines, the enso ring
  mid: '#6f6a63',                                     // 3 middle ink: bamboo stalks, fish, texture strokes
  light: '#a19b91',                                   // 4 light ink: water, the pond, mid-distance washes
  pale: '#c9c2b4',                                    // 5 pale wash: far mountains, the moon, reflections
  mist: '#dfd9ca',                                    // 6 the faintest wash: haze, halos
  red: '#c5341f',                                     // VERMILION: the seal, the hero's crown, the caption's one word
};
const INW_FONT = 'Baskerville, "Baskerville Old Face", "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", "Noto Serif", "DejaVu Serif", Georgia, "Times New Roman", serif';

// ---------------------------------------------------------------------
//  colour and geometry (colours are hex or the rgb() strings the renderer hands over mid-morph)
// ---------------------------------------------------------------------
function inwRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
const inwMix = (a, b, u) => { const x = inwRGB(a), y = inwRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const inwA = (c, al) => { const [r, g, b] = inwRGB(c); return `rgba(${r},${g},${b},${clamp(al)})`; };
const inwCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// a smooth curve through a few control points (Catmull-Rom), n samples per span
function inwCurve(P, n = 8, closed = false) {
  const m = P.length, out = [], g = (i) => (closed ? P[mod(i, m)] : P[clamp(i, 0, m - 1)]);
  if (m < 3 && !closed) return P.slice();
  for (let i = 0; i < (closed ? m : m - 1); i++) {
    const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t, f = (k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  if (!closed) out.push(P[m - 1]);
  return out;
}

// ---------------------------------------------------------------------
//  the sheet: rice paper with blotches, long and short fibres and specks, painted once (screen space).
//  inwTooth is a second, lighter set of fibres laid OVER the finished frame, so ink looks soaked into the paper.
// ---------------------------------------------------------------------
let INW_PAPER = null, INW_TOOTH = null;
const INW_SCR = {};   // scratch canvases a stroke is assembled on, by size (small ones keep the copy to the frame cheap)
function inwCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function inwPaperTex() {
  if (INW_PAPER) return INW_PAPER;
  const cv = INW_PAPER = inwCanvas(W, H), g = cv.getContext('2d'), R = RNG('inwpaper');
  for (let i = 0; i < 30; i++) {
    const x = R.r(0, W), y = R.r(0, H), r = R.r(180, 520), gr = g.createRadialGradient(x, y, 0, x, y, r), lt = i % 3 === 0;
    gr.addColorStop(0, lt ? 'rgba(255,251,240,0.16)' : 'rgba(150,118,74,0.05)'); gr.addColorStop(1, lt ? 'rgba(255,251,240,0)' : 'rgba(150,118,74,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.lineCap = 'round';
  const fibre = (n, l0, l1, col, w0, w1) => {
    g.strokeStyle = col;
    for (let i = 0; i < n; i++) {
      const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(l0, l1), b = R.n(l * 0.3);
      g.lineWidth = R.r(w0, w1); g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l / 2 - Math.sin(a) * b, y + Math.sin(a) * l / 2 + Math.cos(a) * b, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  };
  fibre(800, 14, 80, 'rgba(126,100,66,0.09)', 0.6, 1.4); fibre(520, 14, 90, 'rgba(255,252,243,0.34)', 0.7, 1.5);
  fibre(60, 160, 420, 'rgba(126,100,66,0.06)', 0.8, 1.6); fibre(40, 160, 420, 'rgba(255,252,243,0.26)', 0.8, 1.7);
  g.fillStyle = 'rgba(110,86,56,0.11)'; for (let i = 0; i < 2200; i++) g.fillRect(R.r(0, W), R.r(0, H), 1.5, 1.5);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62); v.addColorStop(0, 'rgba(150,120,80,0)'); v.addColorStop(1, 'rgba(150,120,80,0.11)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return cv;
}
function inwTooth() {
  if (INW_TOOTH) return INW_TOOTH;
  const cv = INW_TOOTH = inwCanvas(W, H), g = cv.getContext('2d'), R = RNG('inwtooth');
  g.lineCap = 'round'; g.strokeStyle = 'rgba(246,240,226,0.17)';
  for (let i = 0; i < 800; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(10, 70); g.lineWidth = R.r(0.7, 1.7); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.fillStyle = 'rgba(246,240,226,0.22)'; for (let i = 0; i < 5000; i++) g.fillRect(R.r(0, W), R.r(0, H), 1.6, 1.6);
  return cv;
}
// the bare sheet, in screen space (it does not move with the camera). c: hex or rgb()
function inwSet(c = INW.paper) { ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.drawImage(inwPaperTex(), 0, 0); ctx.restore(); }

// ---------------------------------------------------------------------
//  the brush. inwBristle(c, v) is a cached 512x48 strip of ink in colour c: left = a fully loaded brush, right =
//  a dry one. Each of 22 bristle rows runs dry at its own point and then skips, the outer rows first; the edges
//  are nicked and carry a little pooled ink. A stroke lays this strip along its path in thin slices, scaled to the
//  pressure, so the streaks follow the stroke and close up where it tapers.
// ---------------------------------------------------------------------
const INW_TEX = new Map(), INW_TW = 512, INW_TH = 48;
function inwBristle(c, v = 0) {
  const k = c + '|' + v; let t = INW_TEX.get(k); if (t) return t;
  if (INW_TEX.size > 120) INW_TEX.clear();
  t = inwCanvas(INW_TW, INW_TH); const g = t.getContext('2d'), R = RNG('inwbr', v);
  g.fillStyle = c; g.fillRect(0, 0, INW_TW, INW_TH);
  const e = g.createLinearGradient(0, 0, 0, INW_TH);   // ink pools at the two edges of a wet stroke
  e.addColorStop(0, 'rgba(20,16,12,0.2)'); e.addColorStop(0.16, 'rgba(20,16,12,0)'); e.addColorStop(0.84, 'rgba(20,16,12,0)'); e.addColorStop(1, 'rgba(20,16,12,0.2)');
  g.fillStyle = e; g.fillRect(0, 0, INW_TW, INW_TH);
  g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round';
  for (let j = 0; j < 12; j++) { const y = R.r(4, INW_TH - 4); g.globalAlpha = R.r(0.05, 0.18); g.lineWidth = R.r(0.6, 1.6); g.beginPath(); g.moveTo(0, y); g.lineTo(INW_TW, y); g.stroke(); }
  g.globalAlpha = 1;
  for (let j = 0; j < 22; j++) {   // flying white
    const y = (j + 0.5 + R.n(0.4)) / 22 * INW_TH, edge = Math.abs(y / INW_TH - 0.5) * 2;
    let x = INW_TW * clamp(R.r(0.16, 1.0) - edge * 0.3 * R.f(), 0.05, 1);
    while (x < INW_TW) {
      const u = x / INW_TW, len = R.r(12, 36) + u * u * 130, gap = R.r(5, 44) * (1.15 - u);
      g.lineWidth = R.r(1.2, 2.3) + u * 2.6; g.beginPath(); g.moveTo(x, y + R.n(0.5)); g.lineTo(Math.min(INW_TW, x + len), y + R.n(0.5)); g.stroke();
      x += len + Math.max(3, gap);
    }
  }
  for (let i = 0; i < 170; i++) { const x = R.r(0, INW_TW), u = x / INW_TW; g.beginPath(); g.ellipse(x, R.f() < 0.5 ? 0 : INW_TH, R.r(3, 13), R.r(0.5, 1.4) + u * 2.2, 0, 0, TAU); g.fill(); }
  INW_TEX.set(k, t); return t;
}
// pressure along a stroke (t = 0..1 -> 0..1) and whether each end is a blunt, rounded press [head, tail]
const INW_SHAPE = {
  taper: (t) => 1 - 0.94 * smooth(0.22, 1, t) ** 1.1,      // press, travel, lift away: ridges, trunks, the enso
  leaf: (t) => Math.sin(Math.PI * clamp(t) ** 0.55) ** 0.9,   // touch, press at a third, flick out: leaves, fish, feathers
  bone: (t) => 0.84 + 0.16 * Math.cos(TAU * t),            // press, travel, press: a bamboo joint
  flick: (t) => (1 - clamp(t)) ** 1.35,                    // press and whip away: reeds, grass, bird wings
  swell: (t) => 0.3 + 0.7 * Math.sin(Math.PI * clamp(t)),  // thin, full, thin with soft ends: hulls, bellies
  even: () => 1,                                           // one pressure: legs, poles
};
const INW_CAP = { taper: [1, 0], leaf: [0, 0], bone: [1, 1], flick: [1, 0], swell: [1, 1], even: [1, 1] };
// one brush stroke along P (a few control points; smoothed unless o.smooth === false).
//   o: w (full width, 14), c (INW.ink), shape ('taper' | 'leaf' | 'bone' | 'flick' | 'swell' | 'even' | fn(t)), cap [head, tail],
//      frac (0..1 drawn on, the tip leading), dry [u0, u1] (how dry the brush is at the start and the end: 0 wet .. 1 split),
//      load (0.4: how much darker the loaded head is; 0 for none), al, key, amt (boil, 0.9), raw (no boil), over (opaque, not multiplied)
function inwStroke(P, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0 || P.length < 2) return null;
  const key = o.key ?? 'st', w = o.w ?? 14, c = o.c ?? INW.ink, sh = o.shape ?? 'taper';
  const prof = typeof sh === 'function' ? sh : INW_SHAPE[sh], cap = o.cap ?? INW_CAP[sh] ?? [1, 0];
  const step = clamp(w * 0.35, 3, 7), S = o.smooth === false ? P : inwCurve(P, o.n ?? 8);
  const Q = o.raw ? resample(S, false, step) : wobble(S, false, o.amt ?? 0.9, key, step), n = Q.length;
  const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + dist(Q[i - 1], Q[i]));
  const L = cum[n - 1]; if (L < 1) return null;
  const R = RNG('inwst', key), f1 = R.r(1.5, 4) * TAU, p1 = R.r(0, TAU), v = o.v ?? R.i(0, 3), jw = 1 + RNG('inwsw', key, B).n(0.035);
  const dry = o.dry ?? [0, 0.6], end = frac * L, tipL = Math.max(w * 1.4, 12), hm = w / 2;
  const T = ctx.getTransform(), z = Math.hypot(T.a, T.b), pad = hm * z * 1.4 + 4;
  const hw = (s) => {
    const t = s / L; let h = hm * prof(t) * (1 + 0.07 * Math.sin(t * f1 + p1)) * jw;
    if (cap[0] && s < hm) h *= Math.sqrt(Math.max(0, 1 - (1 - s / hm) ** 2));
    if (cap[1] && L - s < hm) h *= Math.sqrt(Math.max(0, 1 - (1 - (L - s) / hm) ** 2));
    if (frac < 1) h *= clamp((end - s) / tipL) ** 0.5;
    return h;
  };
  const sp = Q.map(([x, y]) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < n && (i === 0 || cum[i - 1] < end); i++) { const [x, y] = sp[i]; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(W, Math.ceil(x1 + pad)); y1 = Math.min(H, Math.ceil(y1 + pad));
  if (x1 <= x0 || y1 <= y0) return Q;
  const bw = x1 - x0, bh = y1 - y0, bk = (q) => (q <= 96 ? 96 : q <= 192 ? 192 : q <= 384 ? 384 : q <= 768 ? 768 : Math.max(W, H)), sz = bk(bw) + 'x' + bk(bh);
  const scr = INW_SCR[sz] || (INW_SCR[sz] = inwCanvas(bk(bw), bk(bh))), g = scr.getContext('2d'), tex = inwBristle(c, v);
  const T0 = [T.a, T.b, T.c, T.d, T.e - x0, T.f - y0];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, bw, bh);
  let tip = Q[0];
  for (let i = 0; i < n - 1 && cum[i] < end; i++) {
    const a = Q[i], b = Q[i + 1], d = Math.min(cum[i + 1], end) - cum[i], k = d / (cum[i + 1] - cum[i] || 1);
    tip = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    const [px, py] = sp[i]; if (px < -pad || px > W + pad || py < -pad || py > H + pad) continue;
    const h = hw(cum[i] + d / 2); if (h < 0.2 || d <= 0) continue;
    const u0 = clamp(lerp(dry[0], dry[1], cum[i] / L)), u1 = clamp(lerp(dry[0], dry[1], (cum[i] + d) / L)), sx = u0 * (INW_TW - 1), sw = clamp((u1 - u0) * INW_TW, 0.5, INW_TW - sx);
    g.setTransform(...T0); g.translate(a[0], a[1]); g.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
    g.drawImage(tex, sx, 0, sw, INW_TH, -0.4, -h, d + 0.8, h * 2);
  }
  // the loaded head, and the wet tip while the brush is still moving: darker ink, only where the stroke already is
  const dab = (p, r, al) => { const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); gr.addColorStop(0, inwA(INW.ink, al)); gr.addColorStop(1, inwA(INW.ink, 0)); g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill(); };
  const load = o.load ?? (c === INW.red || c === INW.paper ? 0 : 0.4);
  g.setTransform(...T0); g.globalCompositeOperation = 'source-atop';
  if (load > 0) dab(Q[0], w * 1.5, load);
  if (frac < 1 && load > 0) dab(tip, w * 1.1, 0.3);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= o.al ?? 1; ctx.globalCompositeOperation = o.over ? 'source-over' : 'multiply';
  ctx.drawImage(scr, 0, 0, bw, bh, x0, y0, bw, bh); ctx.restore();
  return Q;
}
// an enso: one round stroke that does not quite close. o: w, c, sweep (0.94), a0, + inwStroke options
function inwEnso(x, y, r, o = {}) {
  const a0 = o.a0 ?? -2.2;
  return inwStroke(arcPts(x, y, r, a0, a0 + TAU * (o.sweep ?? 0.94), 48), { w: r * 0.16, c: INW.dark, dry: [0, 0.92], smooth: false, key: 'enso', ...o });
}
// spattered ink: n small dots around (x, y), seeded by key
function inwDots(x, y, n, spread, o = {}) {
  const R = RNG('inwdot', o.key ?? 'dots');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.c ?? INW.dark; ctx.globalAlpha *= o.al ?? 0.8; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = R.r(0, TAU), d = spread * R.f() ** 0.7, r = (o.r ?? 4) * R.r(0.3, 1); ctx.moveTo(x + Math.cos(a) * d + r, y + Math.sin(a) * d); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r, r * R.r(0.6, 1), a, 0, TAU); }
  ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  wet washes
// ---------------------------------------------------------------------
// a pale wash over the closed outline P with a feathered edge, blooms inside and a faint tide line.
//   o: c (INW.pale), al (0.55), feather (22 px), grow (0..1: it soaks outward from `from`, default its centre), edge (0.3), blooms (5), key
//   A bridge object is drawn with the defaults and key 'inwblob', so it matches STYLE.blob at both ends of a morph.
function inwWash(P, o = {}) {
  const k = o.grow == null ? 1 : EZ.o3(o.grow); if (k <= 0.01) return;
  const key = o.key ?? 'wash', c = o.c ?? INW.pale, al = (o.al ?? 0.55) * clamp(k * 2.5), fe = o.feather ?? 22, ga = ctx.globalAlpha;
  const fr = o.from ?? inwCentroid(P), s0 = lerp(0.2, 1, k), Pk = s0 >= 1 ? P : P.map(([x, y]) => [fr[0] + (x - fr[0]) * s0, fr[1] + (y - fr[1]) * s0]);
  const ce = inwCentroid(Pk); let rad = 1; for (const p of Pk) rad = Math.max(rad, Math.hypot(p[0] - ce[0], p[1] - ce[1]));
  const n = 6, a = 1 - (1 - al) ** (1 / n), sc = (s) => Pk.map(([x, y]) => [ce[0] + (x - ce[0]) * s, ce[1] + (y - ce[1]) * s]), R = RNG('inwgr', key);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = c; ctx.globalAlpha = ga * a;
  for (let i = 0; i < n; i++) { trace(sc(1 + fe / rad * (0.4 - 1.25 * i / (n - 1))), true); ctx.fill(); }
  trace(sc(1 + fe / rad * 0.4), true); ctx.clip(); ctx.globalAlpha = ga;
  for (let i = 0; i < (o.blooms ?? 5); i++) {   // pigment settles darker in places and blooms lighter in others
    const an = R.r(0, TAU), d = rad * R.r(0.1, 0.8), bx = ce[0] + Math.cos(an) * d, by = ce[1] + Math.sin(an) * d, br = rad * R.r(0.25, 0.6), dk = i % 3 !== 2;
    const gr = ctx.createRadialGradient(bx, by, 0, bx, by, br); gr.addColorStop(0, inwA(dk ? c : INW.paper, (dk ? 0.4 : 0.3) * al)); gr.addColorStop(1, inwA(dk ? c : INW.paper, 0));
    ctx.globalCompositeOperation = dk ? 'multiply' : 'source-over'; ctx.fillStyle = gr; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  ctx.restore();
  const ed = (o.edge ?? 0.3) * clamp(k * 2 - 1);
  if (ed > 0.01) {   // the tide line: where the wash stopped, the edge dried a little darker, in broken runs
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = ga * ed; ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.setLineDash([R.r(120, 260), R.r(30, 110), R.r(160, 340), R.r(20, 80)]); trace(sc(1 + fe / rad * 0.26), true); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
}
// a far mountain: wash under the ridge line Rg (left to right), crisp at the ridge and dissolving downward into mist.
//   o: c, al (0.55), base (the y where it has faded out), soak (0..1), soft (px: a blurred ridge for the farthest range), key
function inwPeak(Rg, o = {}) {
  const k = clamp(o.soak ?? 1); if (k <= 0.01) return;
  const c = o.c ?? INW.pale, al = (o.al ?? 0.55) * clamp(k * 2), S = inwCurve(Rg, 8), bb = bbox(S), base = o.base ?? bb.y1 + 240, ga = ctx.globalAlpha;
  const path = (dy) => { ctx.beginPath(); S.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + dy) : ctx.moveTo(p[0], p[1] + dy))); const e = S[S.length - 1]; ctx.lineTo(e[0] + Math.max(0, base - e[1]) * 1.3, base); ctx.lineTo(S[0][0] - Math.max(0, base - S[0][1]) * 1.3, base); ctx.closePath(); };
  const g = ctx.createLinearGradient(0, bb.y0, 0, lerp(bb.y0 + 80, base, EZ.o2(k)));
  g.addColorStop(0, inwA(c, 1)); g.addColorStop(0.3, inwA(c, 0.72)); g.addColorStop(0.7, inwA(c, 0.25)); g.addColorStop(1, inwA(c, 0));
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g;
  const soft = o.soft ?? 0, m = soft ? 4 : 1;
  for (let j = 0; j < m; j++) { ctx.globalAlpha = ga * (1 - (1 - al) ** (1 / m)); path(soft * (j / m - 0.5)); ctx.fill(); }
  path(0); ctx.clip(); ctx.globalAlpha = ga;
  const R = RNG('inwpk', o.key ?? 'peak');
  for (let i = 0; i < 5; i++) {
    const bx = R.r(bb.x0, bb.x1), by = R.r(bb.y0, lerp(bb.y0, base, 0.5)), br = (bb.x1 - bb.x0) * R.r(0.1, 0.24), dk = i % 2 === 0;
    const gr = ctx.createRadialGradient(bx, by, 0, bx, by, br); gr.addColorStop(0, inwA(dk ? c : INW.paper, (dk ? 0.42 : 0.4) * al)); gr.addColorStop(1, inwA(dk ? c : INW.paper, 0));
    ctx.globalCompositeOperation = dk ? 'multiply' : 'source-over'; ctx.fillStyle = gr; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  ctx.restore();
}
// a nearer mountain, built in three passes on one clock t (0..1): the ridge is brushed on with a drying brush, the
// wash soaks down from it, a broad dry band is dragged under it, then short dry texture strokes (cun) run down the slopes.
//   o: t, c (wash), line (ridge ink; false for none), w (ridge width, 16), al, base, cun (how many texture strokes, 6), key
function inwMountain(Rg, o = {}) {
  const t = o.t ?? 1, key = o.key ?? 'gunung'; if (t <= 0) return;
  inwPeak(Rg, { c: o.c ?? INW.light, al: o.al ?? 0.55, base: o.base, soak: seg(t, 0.2, 1), key });
  const S = inwCurve(Rg, 8), bb = bbox(S), base = o.base ?? bb.y1 + 240, R = RNG('inwmt', key), n = o.cun ?? 6, w = o.w ?? 16;
  for (let i = 0; i < n; i++) {
    const u = R.r(0.12, 0.88), p = pointAt(S, u), q = pointAt(S, Math.min(1, u + 0.04)), down = q[1] > p[1] ? 1 : -1, len = R.r(0.18, 0.42) * (base - p[1]), lean = R.r(0.25, 0.6) * down;
    const f = seg(t, 0.4 + 0.5 * i / n, 0.55 + 0.5 * i / n);
    inwStroke([[p[0] + lean * 8, p[1] + w * 0.5], [p[0] + lean * len * 0.5, p[1] + len * 0.55], [p[0] + lean * len * 0.8, p[1] + len]],
      { w: w * R.r(0.5, 0.95), c: o.cunC ?? INW.mid, shape: 'flick', dry: [0.4, 1], frac: f, key: key + 'c' + i, load: 0.2, al: 0.85 });
  }
  // the side of the brush dragged under the ridge: a broad, drying band of the wash tone
  inwStroke(Rg.map(([a, b]) => [a, b + w * 1.5]), { w: w * 2.8, c: o.c ?? INW.light, dry: [0.3, 1], frac: seg(t, 0.1, 0.75), load: 0.15, al: 0.75, key: key + 's', shape: (x) => 0.35 + 0.65 * Math.sin(Math.PI * clamp(x) ** 0.8) });
  if (o.line !== false) inwStroke(Rg, { w, c: o.line ?? INW.dark, dry: [0.06, 0.9], frac: seg(t, 0, 0.6), key: key + 'r', shape: (x) => 0.4 + 0.6 * Math.sin(Math.PI * clamp(x) ** 0.6) ** 0.8 });
}
// mist: bare paper drifting over whatever is under it. (x, y) the band's centre, w x h its size.
//   o: drift (px to slide: pass 14 * TT), n (lobes, 5), al (0.9), c (INW.paper), key
function inwMist(x, y, w, h, o = {}) {
  const R = RNG('inwmist', o.key ?? 'mist'), n = o.n ?? 5, c = o.c ?? INW.paper, al = o.al ?? 0.9;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const cx = x - w / 2 + (i + 0.5) / n * w + R.n(w * 0.06) + (o.drift ?? 0) * R.r(0.6, 1.4), cy = y + R.n(h * 0.22), rx = w / n * R.r(1.0, 1.6), ry = h * R.r(0.5, 0.9);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, inwA(c, al)); g.addColorStop(0.5, inwA(c, al * 0.7)); g.addColorStop(1, inwA(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
// a moon (or, with c: INW.red and halo: false, a sun): a wash disc with a faint halo soaked into the sky around it.
//   o: soak (0..1), c (INW.pale), halo. The disc is a bridge-ready wash (key 'inwblob').
function inwMoon(x, y, r, o = {}) {
  const k = clamp(o.soak ?? 1); if (k <= 0.01) return;
  if (o.halo !== false) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; const R1 = lerp(r * 1.3, r * 2.5, EZ.o2(k)), g = ctx.createRadialGradient(x, y, r, x, y, R1);
    g.addColorStop(0, inwA(INW.pale, 0.3 * k)); g.addColorStop(1, inwA(INW.pale, 0)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R1, 0, TAU); ctx.arc(x, y, r, 0, TAU, true); ctx.fill('evenodd'); ctx.restore();
  }
  inwWash(ellipsePts(x, y, r, r, 0, 64), { c: o.c ?? INW.pale, grow: o.soak, key: 'inwblob' });
}

// ---------------------------------------------------------------------
//  props (each takes t = 0..1: it is brushed on stroke by stroke, then lives on the boil)
// ---------------------------------------------------------------------
// a fan of pine needles from (x, y) between angles a0 and a1
function inwNeedles(x, y, len, a0, a1, n, o = {}) {
  const R = RNG('inwnd', o.key ?? 'nd'), k = clamp(o.t ?? 1); if (k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.c ?? INW.ink; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = lerp(a0, a1, (i + R.n(0.3)) / (n - 1)), l = len * R.r(0.7, 1.1) * k, nx = -Math.sin(a) * 1.7, ny = Math.cos(a) * 1.7;
    ctx.moveTo(x - nx, y - ny); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.lineTo(x + nx, y + ny); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
// a crooked pine rooted at (x, y). o: t, dir (1 leans right, -1 left), key
function inwPine(x, y, s = 1, o = {}) {
  const t = o.t ?? 1, d = o.dir ?? 1, key = o.key ?? 'pinus', M = (pts) => pts.map(([a, b]) => [x + a * d * s, y + b * s]);
  inwStroke(M([[0, 0], [12, -55], [-6, -118], [20, -178], [58, -232]]), { w: 22 * s, c: INW.ink, dry: [0.12, 0.9], frac: seg(t, 0, 0.45), key: key + 't' });
  const bf = seg(t, 0.3, 0.62);
  inwStroke(M([[-6, -118], [-48, -142], [-94, -138]]), { w: 9 * s, c: INW.dark, dry: [0.1, 0.8], frac: bf, key: key + 'b1' });
  inwStroke(M([[20, -178], [70, -198], [126, -186]]), { w: 9 * s, c: INW.dark, dry: [0.1, 0.8], frac: bf, key: key + 'b2' });
  inwStroke(M([[58, -232], [80, -252], [100, -264]]), { w: 7 * s, c: INW.dark, dry: [0.1, 0.8], frac: bf, key: key + 'b3' });
  [[-94, -138], [-50, -152], [126, -186], [78, -206], [100, -264], [40, -246]].forEach(([a, b], i) => {
    const k = seg(t, 0.45 + i * 0.07, 0.7 + i * 0.07), [cx, cy] = M([[a, b]])[0], sw = Math.sin(B * 0.6 + i) * 0.035;
    if (k <= 0) return;
    inwWash(ellipsePts(cx, cy - 10 * s, 46 * s, 20 * s, 0, 20), { c: INW.light, al: 0.3, feather: 12, grow: k, edge: 0, blooms: 2, key: key + 'w' + i });
    inwNeedles(cx, cy, 38 * s, -Math.PI * 0.94 + sw, -Math.PI * 0.06 + sw, 13, { t: k, key: key + 'n' + i });
  });
}
// a cluster of bamboo leaves hanging from (x, y). o: n (4), len (120), ang (the middle leaf's direction, PI/2 = down), spread (1.1), t, c, key
function inwLeaves(x, y, o = {}) {
  const n = o.n ?? 4, len = o.len ?? 120, ang = o.ang ?? Math.PI / 2, key = o.key ?? 'daun', R = RNG('inwlv', key), t = o.t ?? 1;
  for (let i = 0; i < n; i++) {
    const a = ang + (o.spread ?? 1.1) * (n > 1 ? i / (n - 1) - 0.5 : 0) + R.n(0.12) + Math.sin(B * 0.55 + i * 1.7) * 0.035, l = len * R.r(0.7, 1.1), bd = R.n(0.1) * l;
    const f = clamp(t * (1 + n * 0.5) - i * 0.5); if (f <= 0) continue;
    inwStroke([[x, y], [x + Math.cos(a) * l * 0.5 - Math.sin(a) * bd, y + Math.sin(a) * l * 0.5 + Math.cos(a) * bd], [x + Math.cos(a) * l, y + Math.sin(a) * l]],
      { w: l * 0.2, c: o.c ?? (i % 3 === 2 ? INW.dark : INW.ink), shape: 'leaf', dry: [0, 0.55], frac: f, load: 0.2, amt: 0.6, key: key + i });
  }
}
// one loose leaf (a falling leaf, a leaf on the water): centre (x, y), length len, direction ang
function inwLeaf(x, y, len, ang, o = {}) {
  const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
  inwStroke([[x - dx, y - dy], [x - dy * 0.12, y + dx * 0.12], [x + dx, y + dy]], { w: len * 0.22, c: INW.ink, shape: 'leaf', dry: [0, 0.5], load: 0.2, amt: 0.4, key: 'leaf', ...o });
}
// a bamboo stalk from its foot (x0, y0) to its top (x1, y1): joints brushed on one after another, a dark tick at each node.
//   o: t, n (joints, 6), w (26), c (INW.mid), bend (0.06), leaves: [[u along the stalk, side -1 | 1, how many, length], ...], key
function inwBamboo(x0, y0, x1, y1, o = {}) {
  const key = o.key ?? 'bambu', n = o.n ?? 6, w = o.w ?? 26, c = o.c ?? INW.mid, t = o.t ?? 1;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L, sway = Math.sin(B * 0.5 + key.length) * 4;
  const at = (u) => { const b = ((o.bend ?? 0.06) * L + sway) * u * u; return [x0 + dx * u + nx * b, y0 + dy * u + ny * b]; };
  for (let i = 0; i < n; i++) {
    const f = clamp(t * n - i); if (f <= 0) break;
    const ua = i / n + 0.004, ub = (i + 1) / n - 0.004;
    inwStroke([0, 0.25, 0.5, 0.75, 1].map((k) => at(lerp(ua, ub, k))), { w: w * (1 - 0.3 * ua), c, shape: 'bone', dry: [0.05, 0.5], frac: f, load: 0.25, amt: 0.6, key: key + i });
    if (f >= 1 && i < n - 1) { const p = at(ub + 0.004), h = w * (1 - 0.3 * ub) * 0.62; inwStroke([[p[0] - nx * h, p[1] - ny * h + 2], [p[0], p[1] - 3], [p[0] + nx * h, p[1] + ny * h + 2]], { w: 5, c: INW.ink, shape: 'swell', load: 0, amt: 0.4, key: key + 'k' + i }); }
  }
  (o.leaves || []).forEach(([u, side, m, len], i) => {
    const k = seg(t, u * 0.85, u * 0.85 + 0.3); if (k <= 0) return;
    const p = at(u), q = [p[0] + nx * side * len * 0.45, p[1] + ny * side * len * 0.45 - len * 0.12];
    inwStroke([p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - len * 0.05], q], { w: 4.5, c: INW.dark, shape: 'flick', frac: clamp(k * 3), load: 0, amt: 0.4, key: key + 'tw' + i });
    inwLeaves(q[0], q[1], { n: m, len, ang: Math.PI / 2 + side * 0.55, t: clamp(k * 1.5 - 0.3), key: key + 'lv' + i });
  });
  return at;
}
// reeds: n flicked blades fanning up from (x, y). o: n (6), h (170), lean (0.25), t, c, key
function inwReeds(x, y, o = {}) {
  const n = o.n ?? 6, h = o.h ?? 170, key = o.key ?? 'ilalang', R = RNG('inwrd', key), t = o.t ?? 1;
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * R.r(9, 17), hh = h * R.r(0.55, 1.1), ln = (o.lean ?? 0.25) + R.n(0.3) + Math.sin(B * 0.5 + i) * 0.035, f = clamp(t * 1.8 - i * 0.12);
    const tip = [bx + ln * hh, y - hh], mid = [bx + ln * hh * 0.22, y - hh * 0.55], wd = R.r(5, 8.5);
    if (f <= 0) continue;
    inwStroke([[bx, y], mid, tip], { w: wd, c: o.c ?? INW.dark, shape: 'flick', dry: [0, 0.65], frac: f, load: 0.3, amt: 0.5, key: key + i });
    if (i % 2 === 0 && f >= 1) inwStroke([[lerp(mid[0], tip[0], 0.55), lerp(mid[1], tip[1], 0.55)], [lerp(mid[0], tip[0], 0.82) + 2, lerp(mid[1], tip[1], 0.82)]], { w: 11, c: INW.mid, shape: 'leaf', dry: [0.2, 0.8], load: 0, amt: 0.4, key: key + 'h' + i });
  }
}
// a small boat with a mat roof and a pole, bobbing, with two reflection strokes. (x, y) = the waterline under its middle
function inwBoat(x, y, s = 1, o = {}) {
  const t = o.t ?? 1, key = o.key ?? 'perahu', by = y + Math.sin(B * 0.5) * 2 * s, M = (pts) => pts.map(([a, b]) => [x + a * s, by + b * s]);
  inwStroke(M([[-66, 16], [0, 19], [70, 15]]), { w: 6 * s, c: INW.pale, shape: 'leaf', dry: [0.3, 0.9], frac: seg(t, 0.5, 1), load: 0, key: key + 'r1' });
  inwStroke(M([[-40, 30], [6, 32], [46, 29]]), { w: 5 * s, c: INW.pale, shape: 'leaf', dry: [0.4, 1], frac: seg(t, 0.6, 1), load: 0, key: key + 'r2' });
  inwStroke(M([[-78, -12], [-36, 4], [30, 5], [82, -14]]), { w: 17 * s, c: INW.ink, shape: 'swell', dry: [0, 0.6], frac: seg(t, 0, 0.5), key: key + 'h' });
  inwStroke(M([[-28, -4], [-10, -30], [16, -28], [28, -4]]), { w: 8 * s, c: INW.dark, shape: 'swell', dry: [0.1, 0.6], frac: seg(t, 0.3, 0.7), load: 0.2, key: key + 'c' });
  inwStroke(M([[44, -6], [58, -40], [70, -72]]), { w: 3.5 * s, c: INW.dark, shape: 'even', frac: seg(t, 0.5, 0.9), load: 0, amt: 0.4, key: key + 'p' });
}
// a far bird: two flicked strokes. flap -1 (wings down) .. 1 (up)
function inwBird(x, y, s = 1, o = {}) {
  const f = o.flap ?? Math.sin(B * 0.9), key = o.key ?? 'burung', op = { w: 6.5 * s, c: o.c ?? INW.ink, shape: 'flick', dry: [0, 0.5], frac: o.frac ?? 1, load: 0, amt: 0.3 };
  inwStroke([[x, y], [x - 15 * s, y - (9 + 9 * f) * s], [x - 32 * s, y - (2 + 15 * f) * s]], { ...op, key: key + 'l' });
  inwStroke([[x, y], [x + 13 * s, y - (10 + 9 * f) * s], [x + 27 * s, y - (4 + 15 * f) * s]], { ...op, key: key + 'r' });
}
// water rings. inwRipple: broken arcs of one flattened ring. inwRipples: rings spreading from an impact `age` seconds ago.
//   o: sy (0.4 flattening), w (4), c (INW.mid), al, arcs (2), key   |   + r (the last ring's radius, 130), n (3), dur (1.4 s)
function inwRipple(x, y, r, o = {}) {
  const key = o.key ?? 'riak', R = RNG('inwrip', key);
  for (let i = 0; i < (o.arcs ?? 2); i++) { const a0 = R.r(0, TAU), sp = R.r(1.2, 2.4); inwStroke(arcPts(x, y, r, a0, a0 + sp, 14, o.sy ?? 0.4), { w: o.w ?? 4, c: o.c ?? INW.mid, shape: 'leaf', dry: [0.2, 0.75], al: o.al ?? 1, load: 0, amt: 0.5, smooth: false, over: o.over, key: key + i }); }
}
function inwRipples(x, y, age, o = {}) {
  const dur = o.dur ?? 1.4, n = o.n ?? 3;
  for (let i = 0; i < n; i++) { const a = age - i * 0.2; if (a <= 0 || a >= dur) continue; const u = a / dur; inwRipple(x, y, (o.r ?? 130) * (0.12 + 0.88 * EZ.o2(u)) * (1 - i * 0.12), { ...o, al: (o.al ?? 1) * (1 - u), key: (o.key ?? 'riak') + i }); }
}
// a fish seen from above: one body stroke, a split tail, two fins. ang = heading. o: c (INW.mid), spot (a colour for a koi's mark), wig, key
function inwFish(x, y, s = 1, ang = 0, o = {}) {
  const key = o.key ?? 'ikan', wig = o.wig ?? Math.sin(B * 1.3), ca = Math.cos(ang), sa = Math.sin(ang), M = (pts) => pts.map(([a, b]) => [x + (a * ca - b * sa) * s, y + (a * sa + b * ca) * s]);
  const c = o.c ?? INW.mid, al = o.al ?? 1;
  inwStroke(M([[-44, -wig * 9], [-66, -12 - wig * 14], [-82, -20 - wig * 10]]), { w: 7 * s, c, shape: 'flick', dry: [0.2, 0.9], load: 0, al, amt: 0.3, key: key + 't1' });
  inwStroke(M([[-44, -wig * 9], [-68, 8 - wig * 14], [-84, 18 - wig * 10]]), { w: 7 * s, c, shape: 'flick', dry: [0.2, 0.9], load: 0, al, amt: 0.3, key: key + 't2' });
  inwStroke(M([[6, -9], [-6, -22], [-20, -26]]), { w: 5 * s, c, shape: 'flick', load: 0, al, amt: 0.3, key: key + 'f1' });
  inwStroke(M([[6, 9], [-6, 22], [-20, 26]]), { w: 5 * s, c, shape: 'flick', load: 0, al, amt: 0.3, key: key + 'f2' });
  inwStroke(M([[42, 0], [8, wig * 4], [-46, -wig * 9]]), { w: 24 * s, c, shape: (t) => Math.sin(Math.PI * clamp(t) ** 0.6) ** 0.8, cap: [0, 0], dry: [0, 0.45], load: 0.35, al, amt: 0.4, key: key + 'b' });
  if (o.spot) inwStroke(M([[30, -1], [14, 1]]), { w: 13 * s, c: o.spot, shape: 'swell', load: 0, al, amt: 0.3, key: key + 's' });
}
// the seal: a small vermilion square stamp with an abstract carved meander (no characters), a little worn.
//   (x, y) its centre, s its side. o: p (0..1 pressed on), rot, c, key
function inwSeal(x, y, s, o = {}) {
  const p = clamp(o.p ?? 1); if (p <= 0) return;
  const R = RNG('inwseal', o.key ?? 'seal'), c = o.c ?? INW.red, k = s / 100 * lerp(1.35, 1, EZ.o3(p));
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.05); ctx.scale(k, k); ctx.globalAlpha *= clamp(p * 2);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = c;
  trace(rrectPts(-50, -50, 100, 100, 9, 3).map(([a, b]) => [a + R.n(1.6), b + R.n(1.6)]), true); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = INW.paper; ctx.lineWidth = 8; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  for (const L of [[[-32, -30], [32, -30], [32, -6], [-8, -6]], [[-32, -8], [-32, 32], [-8, 32]], [[-8, 12], [-8, 34]], [[12, 14], [32, 14], [32, 32], [12, 32], [12, 10]]]) { ctx.beginPath(); L.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke(); }
  ctx.fillStyle = INW.paper; ctx.globalAlpha *= 0.85;   // wear: the stamp did not take everywhere
  for (let i = 0; i < 22; i++) { const e = i < 9, a = R.r(-50, 50), b = e ? (R.f() < 0.5 ? -50 : 50) + R.n(3) : R.r(-50, 50), r = R.r(1.2, e ? 5 : 3.2); ctx.beginPath(); ctx.ellipse(i % 2 ? a : b, i % 2 ? b : a, r, r * R.r(0.5, 1), R.r(0, 3), 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: Bangau, a red-crowned crane in a dozen strokes. Its body is bare paper (so it reads white over a wash),
//  a pale belly stroke, a black neck, black tail plumes and wing tips, and ONE vermilion dab: the crown.
//  (x, y) = the body's centre; r = half its standing height (feet at y + r, crown near y - r). It faces +x.
//   o: pose 'stand' | 'fly', dir (1 | -1), flap (-1 wings down .. 1 up; fly), wing (0..1 wings lifted; stand),
//      bow (0..1 head down to the water), wade (0..1 of the legs under water), mood 'smile' | 'happy' | 'wow', key
// ---------------------------------------------------------------------
function inwHero(x, y, r, o = {}) {
  const key = o.key ?? 'bangau', d = o.dir ?? 1, mood = o.mood ?? 'smile';
  const P = (a, b) => [x + a * r * d, y + b * r];
  const st = (pts, q) => inwStroke(pts.map(([a, b]) => P(a, b)), { amt: 0.5, ...q, w: q.w * r, key: key + q.key });
  const white = (cx, cy, rx, ry, rot) => { const [px, py] = P(cx, cy); ctx.save(); ctx.fillStyle = INW.paper; trace(ellipsePts(px, py, rx * r, ry * r, rot * d, 24), true); ctx.fill(); ctx.restore(); };
  // a wing from its root to its tip: a white blade, a pale shade, a leading-edge line and three black tip feathers
  const wing = (rx, ry, phi, tipC, k) => {
    const tx = rx - 0.12 - 0.3 * Math.cos(phi), ty = ry - 0.95 * Math.sin(phi), mx = (rx + tx) / 2 - 0.14, my = (ry + ty) / 2, ux = tx - rx, uy = ty - ry, l = Math.hypot(ux, uy) || 1;
    st([[rx, ry], [mx, my], [tx, ty]], { w: 0.34, c: INW.paper, shape: 'leaf', over: true, dry: [0, 0], key: k + 'w' });
    st([[rx - 0.04, ry], [mx - 0.07, my], [tx - 0.03, ty]], { w: 0.15, c: INW.pale, shape: 'leaf', load: 0, dry: [0.1, 0.7], key: k + 's' });
    st([[rx + 0.03, ry], [mx + 0.12, my], [tx, ty]], { w: 0.03, c: INW.mid, shape: 'swell', load: 0, key: k + 'e' });
    [0.5, 0.7, 0.9].forEach((u, i) => { const ax = lerp(rx, tx, u) + (mx - (rx + tx) / 2) * 4 * u * (1 - u), ay = lerp(ry, ty, u); st([[ax, ay], [ax - 0.12 + ux / l * 0.1, ay + uy / l * 0.12], [ax - 0.2 + ux / l * 0.2, ay + uy / l * 0.26]], { w: 0.085, c: tipC, shape: 'leaf', dry: [0, 0.6], load: 0.2, key: k + 'f' + i }); });
  };
  // the head: a white dab, the black of the neck behind it, a beak flicked out, an eye, the vermilion crown
  const head = (hx, hy, ba) => {
    st([[hx + 0.05, hy + 0.01], [hx + 0.05 + Math.cos(ba) * 0.34, hy + 0.01 + Math.sin(ba) * 0.34]], { w: 0.055, c: INW.dark, shape: 'flick', dry: [0, 0.4], load: 0.2, key: 'bk' });
    white(hx, hy, 0.085, 0.075, 0);
    const [px, py] = P(hx, hy), R = RNG('inwcr', key, B);
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = INW.mid; ctx.lineWidth = Math.max(1.4, r * 0.014); ctx.beginPath(); ctx.arc(px, py, r * 0.082, 0, TAU); ctx.stroke();
    ctx.fillStyle = INW.red; trace(ellipsePts(px - 0.005 * r * d + R.n(0.6), py - 0.07 * r + R.n(0.6), r * 0.085, r * 0.055, -0.15 * d, 14), true); ctx.fill();
    ctx.fillStyle = INW.ink; ctx.beginPath(); ctx.arc(px + 0.035 * r * d, py + 0.005 * r, Math.max(1.6, r * 0.017), 0, TAU); ctx.fill(); ctx.restore();
  };
  const leg = { w: 0.036, c: INW.ink, shape: 'even', dry: [0, 0.35], load: 0 }, nk = (t) => 1 - 0.42 * t, bob = Math.sin(B * 0.7) * 0.012;
  if (o.pose === 'fly') {
    const up = ((o.flap ?? Math.sin(B * 1.05)) + 1) / 2;
    wing(0.14, -0.05, lerp(-0.6, 1.4, up), INW.mid, 'wf');
    st([[-0.3, 0.04], [-0.68, 0.1], [-1.0, 0.1]], { ...leg, key: 'l1' }); st([[-0.3, 0.08], [-0.66, 0.15], [-0.96, 0.17]], { ...leg, key: 'l2' });
    st([[-0.3, -0.04], [-0.46, -0.03], [-0.6, 0.02]], { w: 0.12, c: INW.ink, shape: 'leaf', dry: [0, 0.5], key: 't1' });
    white(0, 0, 0.42, 0.15, -0.05);
    st([[-0.38, 0.05], [0, 0.15], [0.36, 0.04]], { w: 0.1, c: INW.pale, shape: 'leaf', load: 0, key: 'bl' });
    st([[-0.36, -0.08], [0, -0.15], [0.34, -0.08]], { w: 0.03, c: INW.mid, shape: 'swell', load: 0, key: 'bk2' });
    st([[0.3, -0.04], [0.6, -0.07], [0.88, -0.13 + bob]], { w: 0.08, c: INW.ink, shape: nk, cap: [1, 1], dry: [0, 0.3], key: 'nk' });
    head(0.95, -0.14 + bob, 0.1);
    wing(-0.02, -0.07, lerp(-0.75, 1.3, up), INW.ink, 'wn');
  } else {
    const bow = clamp(o.bow ?? 0), wow = mood === 'wow' ? 1 : 0, wg = o.wing ?? (mood === 'happy' ? 0.85 : 0), wd = clamp(o.wade ?? 0) * 0.5;
    if (wg > 0.03) wing(0.08, -0.1, lerp(-0.5, 1.2, wg), INW.mid, 'wf');
    st([[-0.04, 0.24], [-0.09, 0.62], [-0.03, 1 - wd]], { ...leg, key: 'l1' }); st([[0.1, 0.24], [0.12, 0.64], [0.15, 1 - wd]], { ...leg, key: 'l2' });
    if (!wd) { st([[-0.03, 1], [0.1, 1.0]], { ...leg, w: 0.03, shape: 'flick', key: 'f1' }); st([[0.15, 1], [0.28, 1.0]], { ...leg, w: 0.03, shape: 'flick', key: 'f2' }); }
    const sw = Math.sin(B * 0.6) * 0.02;
    st([[-0.28, -0.06], [-0.56, 0.1], [-0.7 + sw, 0.36]], { w: 0.13, c: INW.ink, shape: 'leaf', dry: [0, 0.6], key: 't1' });
    st([[-0.27, 0.0], [-0.5, 0.2], [-0.56 + sw, 0.46]], { w: 0.13, c: INW.ink, shape: 'leaf', dry: [0, 0.6], key: 't2' });
    st([[-0.24, 0.06], [-0.4, 0.26], [-0.42 + sw, 0.48]], { w: 0.11, c: INW.dark, shape: 'leaf', dry: [0, 0.6], key: 't3' });
    white(0.0, 0.04, 0.4, 0.25, -0.28);
    st([[-0.34, 0.14], [-0.02, 0.3], [0.32, 0.1]], { w: 0.13, c: INW.pale, shape: 'leaf', load: 0, key: 'bl' });
    st([[-0.36, -0.02], [-0.04, -0.22], [0.3, -0.2]], { w: 0.03, c: INW.mid, shape: 'swell', load: 0, key: 'bk2' });
    const mx3 = (a, b, c2) => lerp(lerp(a, b, wow), c2, bow);
    const c1 = [mx3(0.46, 0.38, 0.56), mx3(-0.42, -0.45, -0.3)], c2 = [mx3(0.3, 0.34, 0.74), mx3(-0.68, -0.76, -0.06)], hd = [mx3(0.38, 0.36, 0.76), mx3(-0.9, -1.0, 0.2) + bob];
    st([[0.26, -0.14], c1, c2, [hd[0] - 0.02, hd[1] + 0.05]], { w: 0.09, c: INW.ink, shape: nk, cap: [1, 1], dry: [0, 0.3], key: 'nk' });
    head(hd[0], hd[1], lerp(0.08, 1.05, bow) - wow * 0.45);
    if (wg > 0.03) wing(-0.04, -0.12, lerp(-0.6, 1.05, wg), INW.ink, 'wn');
  }
  SPARK_AT = toScreen(x, y);
}
// the hero's outline for bridges (an upright oval)
function inwHeroPts(x, y, r, n = 48) { return ellipsePts(x, y, r * 0.55, r, 0, n); }

// ---------------------------------------------------------------------
//  type: a quiet, thin serif in ink, set letter by letter (each letter soaks in; a hair of jitter every other boil step)
//   o: align, key, reveal (0..1), track (letter spacing in ems, 0.04), al, weight, italic
// ---------------------------------------------------------------------
const inwFont = (size, o = {}) => { ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${size}px ${INW_FONT}`; };
function inwTextW(str, size, o = {}) { ctx.save(); inwFont(size, o); const w = ctx.measureText(str).width + size * (o.track ?? 0.04) * Math.max(0, str.length - 1); ctx.restore(); return w; }
function inwText(str, x, y, size, c, o = {}) {
  ctx.save(); inwFont(size, o); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalCompositeOperation = 'multiply';
  const n = str.length, tr = size * (o.track ?? 0.04), w = ctx.measureText(str).width + tr * Math.max(0, n - 1), x0 = x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0);
  const shown = clamp(o.reveal ?? 1) * n, ga = ctx.globalAlpha * (o.al ?? 1), key = o.key ?? str;
  ctx.fillStyle = c ?? INW.ink;
  for (let i = 0; i < n; i++) {
    const ch = str[i], k = clamp(shown - i); if (k <= 0) break; if (ch === ' ') continue;
    const R = RNG('inwtx', key, i, B >> 1); ctx.globalAlpha = ga * k;
    ctx.fillText(ch, x0 + ctx.measureText(str.slice(0, i)).width + tr * i + R.n(size * 0.006), y + R.n(size * 0.006) + (1 - k) * size * 0.06);
  }
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). No box: ink straight on the paper, so keep
//  the picture out of their band. The caption's *word* is vermilion; one dry stroke is pulled under the line.
//  The tag is the seal pressed on, then the word. Both fade out as a bridge starts and come back after it.
// ---------------------------------------------------------------------
function inwBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.25));
    if (TT >= r.tc && TT < r.tc + d + 0.25) return EZ.o2(seg(TT, r.tc + d - 0.08, r.tc + d + 0.25));
  }
  return 1;
}
//   o: y (the line's centre, 1392), x (CX), size (60), at (seconds after the era starts, 0.5), col (ink), hi (vermilion), rule (true)
function inwCaptionNow(str, o = {}) {
  const fk = inwBridgeK(), at = E0 + (o.at ?? 0.5); if (TT < at - 1e-6 || fk <= 0.02) return;
  const size = o.size ?? 60, cx = o.x ?? CX, cy = o.y ?? 1392, base = cy + size * 0.32;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  toks.forEach((t, i) => { t.w = inwTextW(t.s, size); t.gap = i === 0 ? 0 : /^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.3; });
  const tw = toks.reduce((a, t) => a + t.w + t.gap, 0);
  ctx.save(); ctx.globalAlpha = fk;
  let xx = cx - tw / 2, k = 0;
  for (const t of toks) {
    xx += t.gap;
    inwText(t.s, xx, base, size, t.hi ? (o.hi ?? INW.red) : (o.col ?? INW.ink), { key: 'cap' + t.s, reveal: ev(at + k * 0.03, Math.max(0.12, t.s.length * 0.03)) });
    xx += t.w; k += t.s.length;
  }
  if (o.rule !== false) inwStroke([[cx - tw * 0.3, cy + size * 0.8], [cx, cy + size * 0.84], [cx + tw * 0.3, cy + size * 0.78]], { w: 6, c: INW.light, shape: 'leaf', dry: [0.3, 1], frac: ev(at + 0.25, 0.5), load: 0, key: 'caprule' + str });
  ctx.restore();
}
//   o: x (70, the seal's left edge), y (300, the centre), size (56), at (0.25), c
function inwTagNow(str, o = {}) {
  const fk = inwBridgeK(), at = E0 + (o.at ?? 0.25); if (TT < at - 1e-6 || fk <= 0.02) return;
  const size = o.size ?? 56, x = o.x ?? 70, y = o.y ?? 300, ss = size * 1.2;
  ctx.save(); ctx.globalAlpha = fk;
  inwSeal(x + ss / 2, y, ss, { p: ev(at, 0.17), key: 'seal' + str });
  inwText(str, x + ss + size * 0.4, y + size * 0.33, size, o.c ?? INW.ink, { key: 'tag' + str, reveal: ev(at + 0.12, 0.3), track: 0.12 });
  ctx.restore();
}
const inwCaption = (str, o = {}) => { const f = () => inwCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const inwTag = (str, o = {}) => { const f = () => inwTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'ink-wash',
  paper: INW.paper,
  // the bare sheet in colour c (hex, or rgb() mid-morph)
  backdrop(c) { inwSet(c); },
  // the era seen through a hole ringed by an enso: one round dry stroke that thins as it closes onto the object
  window(P, key, src, o = {}) {
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, k = o.phase === 'grow' ? Math.min(1, u * 5) : Math.min(1, (1 - u) * 5);
    if (k > 0.04) inwStroke([...P, P[0], P[1]], { w: 30 * k, c: INW.dark, dry: [0.02, 0.95], smooth: false, amt: 1.6, key });
  },
  // the morphing shape: a wet wash that changes outline and tone, with an enso pulled round it mid-way
  blob(P, c, key, u = 0) {
    inwWash(P, { c, key: 'inwblob' });
    const k = Math.sin(Math.PI * clamp(u));
    if (k > 0.04) inwStroke([...P, P[0], P[1]], { w: 22 * k, c: inwMix(c, INW.ink, 0.6), dry: [0.02, 0.95], smooth: false, amt: 1.6, key });
  },
  hero(x, y, r, o = {}) { inwHero(x, y, r, { key: o.key, mood: o.mood }); },
  heroColor: INW.pale,
  heroPts(x, y, r) { return inwHeroPts(x, y, r); },
  // the paper's tooth over the finished frame: light fibres and specks that break up the ink
  post() { ctx.save(); screen(); ctx.drawImage(inwTooth(), 0, 0); ctx.restore(); },
  ones: false,
};
