// =====================================================================
//  styles/neon/kit.js — NEON: glowing tube signs at night, synthwave grid floor, HUD captions.
//  Built on kit/core.js. Everything is a tube: a coloured halo (wide, faint strokes added with 'lighter')
//  around a coloured line around a white-hot core. Sign lettering is a single-stroke tube alphabet (NEO_GLYPHS).
//  Signs power on with a deterministic flicker (a seeded flash / dark / flash / catch pattern on TT).
//  Motion on 1s. Helpers are prefixed neo…; the palette is NEO. Needs from the piece head: CX.
// =====================================================================
const NEO = {
  ground: '#07061a', groundT: '#130a33', horizon: '#3a0f52',
  mag: '#ff2bd6', magD: '#7a1068', cyan: '#22e6ff', cyanD: '#0d5d74', violet: '#8a5cff', violetD: '#3b2380',
  amber: '#ffb238', amberD: '#7a4a0c', pink: '#ff5c8a', white: '#fff4fb', ink: '#e9e4ff', inkD: '#8d86b8',
};
NEO.paper = NEO.ground;
const NEO_SANS = '"Arial Rounded MT Bold", "Varela Round", "Nunito", "Segoe UI", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';
const NEO_MONO = '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';

const neoZoom = () => Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;
// P is one polyline [[x, y], ...] or a list of polylines (drawn as one path, so crossings do not add up twice)
function neoPath(P, closed) {
  ctx.beginPath();
  for (const Q of (Array.isArray(P[0][0]) ? P : [P])) { Q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }
}

// ---------------------------------------------------------------------
//  power: a sign's brightness 0..1. Off before t0; then, over dur, the way a real tube catches: a short flash,
//  dark, a second flash, dark, then it holds and warms up to full (the gaps are seeded per key, so letters differ).
//  After that: on, with a faint mains hum and a rare short dip. Depends only on TT and the key.
// ---------------------------------------------------------------------
function neoFlicker(u, key = 'sign') {   // u 0..1 through the switch-on
  if (u >= 1) return 1; if (u < 0) return 0;
  const R = RNG('neopow', key), a = R.r(0.07, 0.15), b = R.r(0.27, 0.37), c = b + R.r(0.09, 0.15), d = R.r(0.6, 0.76);
  if (u < a) return 0.7; if (u < b) return 0.05; if (u < c) return 0.9; if (u < d) return 0.05;
  return 0.6 + 0.4 * (u - d) / (1 - d);
}
function neoPower(t0, key = 'sign', dur = 0.45) {
  if (TT < t0) return 0;
  if (TT < t0 + dur) return neoFlicker((TT - t0) / dur, key);
  const dip = RNG('neodip', key, Math.floor(TT * 12)).r() < 0.007 ? 0.5 : 1;
  return dip * (0.95 + 0.05 * Math.sin(TT * TAU * 7.3 + String(key).length));
}

// ---------------------------------------------------------------------
//  the tube: a wide soft halo (added light, five falling layers) + the saturated tube + a white-hot core.
//  P: a polyline or a list of polylines. o: { on 0..1, closed, w, core, halo, soft, dash, world, offC }
//  Widths are screen-constant under the camera (divided by zoom) unless o.world. Tubes without a core
//  (grids, grooves, outlines of dim things) get the cheap three-layer halo unless o.soft.
// ---------------------------------------------------------------------
const NEO_HALO = [[7.5, 0.05], [4.4, 0.09], [2.5, 0.17]];
const NEO_HALO_SOFT = [[14, 0.018], [9, 0.032], [5.8, 0.055], [3.7, 0.095], [2.3, 0.17]];
function neoTube(P, c, o = {}) {
  const on = o.on ?? 1; if (on <= 0.001 || !P.length || (!Array.isArray(P[0][0]) && P.length < 2)) return;
  const z = o.world ? 1 : neoZoom(), w = (o.w ?? 7) / z, halo = o.halo ?? 1;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (o.dash) ctx.setLineDash(o.dash.map((d) => d / z));
  neoPath(P, o.closed);
  const base = ctx.globalAlpha;
  if (on < 0.2) { ctx.globalAlpha = base * 0.55; ctx.lineWidth = w; ctx.strokeStyle = o.offC || NEO.inkD; ctx.stroke(); ctx.restore(); return; }   // an unlit tube: dull glass
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = c;
  for (const [k, a] of (!NEO_LITE && (o.soft ?? o.core !== false) ? NEO_HALO_SOFT : NEO_HALO)) { ctx.globalAlpha = base * a * on * halo; ctx.lineWidth = w * k; ctx.stroke(); }
  ctx.globalAlpha = base * on; ctx.lineWidth = w; ctx.stroke();
  if (o.core !== false) {   // the gas: a pale sleeve, then the white-hot centre
    ctx.strokeStyle = NEO.white;
    ctx.globalAlpha = base * on * 0.38; ctx.lineWidth = w * 0.68; ctx.stroke();
    ctx.globalAlpha = base * on * 0.95; ctx.lineWidth = w * 0.36; ctx.stroke();
  }
  ctx.restore();
}
// a soft round glow (a lamp, a sun, a light pool), added light
function neoGlow(x, y, r, c, a = 0.5) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// a dim fill behind a tube (coloured glass / a backboard)
function neoFill(P, c, a = 0.14) { ctx.save(); ctx.globalAlpha *= a; neoPath(P, true); ctx.fillStyle = c; ctx.fill(); ctx.restore(); }

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
function neoCirclePts(x, y, r, n = 72, a0 = 0, a1 = TAU) { const P = []; const closed = a1 - a0 >= TAU - 1e-6; for (let i = 0; i < n + (closed ? 0 : 1); i++) { const a = a0 + (a1 - a0) * i / n; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return P; }
function neoHeartPts(x, y, r, n = 96) {   // centred on (x, y), about 2r wide
  const P = []; for (let i = 0; i < n; i++) { const t = i / n * TAU; const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); P.push([x + hx / 16 * r, y - (hy + 2) / 16 * r]); }
  return P;
}
function neoRRectPts(x, y, w, h, r) { return rrectPts(x, y, w, h, r, 8); }
function neoCentroid(P) { return P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]); }

// ---------------------------------------------------------------------
//  the night: sky gradient, stars, a striped synth sun on the horizon, a perspective grid floor scrolling in.
//  o: { hy horizon y, sun: { x, y, r, on }, speed, gridC, stars }
// ---------------------------------------------------------------------
function neoGround(o = {}) {
  const hy = o.hy ?? 1060;
  ctx.save(); screen();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, NEO.ground); g.addColorStop(0.5, NEO.groundT); g.addColorStop(1, NEO.ground);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  // stars (twinkle on their own phases)
  const R = RNG('neostars', o.key ?? 'sky');
  ctx.save();
  for (let i = 0; i < (o.stars ?? 70); i++) {
    const x = R.r(-200, W + 200), y = R.r(-200, hy - 260), s = R.r(1.2, 3.4), ph = R.r(0, TAU), tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(TT * R.r(1.5, 4) + ph));
    ctx.globalAlpha = tw * (s > 2.8 ? 0.95 : 0.55); ctx.fillStyle = s > 2.8 ? NEO.white : NEO.ink; ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
  // the sun: a gradient disc with horizontal cut stripes, sitting on the horizon
  if (o.sun) {
    const { x, y = hy, r, on = 1 } = o.sun;
    neoGlow(x, y - r * 0.3, r * 2.2, NEO.mag, 0.32 * on);
    ctx.save(); ctx.beginPath(); ctx.rect(x - r - 2, y - r - 2, r * 2 + 4, r + 2); ctx.clip();
    const sg = ctx.createLinearGradient(0, y - r, 0, y); sg.addColorStop(0, NEO.amber); sg.addColorStop(0.55, NEO.pink); sg.addColorStop(1, NEO.mag);
    ctx.globalAlpha = 0.85 * on; ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r + 1, Math.PI, TAU); ctx.clip();   // the cut stripes stay inside the disc
    ctx.globalAlpha = 1; ctx.fillStyle = NEO.groundT;
    for (let i = 0; i < 7; i++) { const yy = y - r * (0.08 + i * 0.13) + mod(TT * 16, r * 0.13); const hh = r * 0.012 * (7 - i) + 2; ctx.fillRect(x - r - 2, yy, r * 2 + 4, hh); }
    ctx.restore();
  }
  const gc = o.gridC ?? NEO.mag, vx = o.vx ?? CX, speed = o.speed ?? 0.9;
  // the haze over the horizon (the city's light in the air)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= o.haze ?? 0.3;
  const hz = ctx.createLinearGradient(0, hy - 300, 0, hy); hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(1, gc);
  ctx.fillStyle = hz; ctx.fillRect(-2000, hy - 300, W + 4000, 300); ctx.restore();
  // the floor
  ctx.save(); ctx.beginPath(); ctx.rect(-2000, hy, W + 4000, H * 3); ctx.clip();
  const fg = ctx.createLinearGradient(0, hy, 0, hy + 900); fg.addColorStop(0, NEO.horizon); fg.addColorStop(1, NEO.ground);
  ctx.fillStyle = fg; ctx.fillRect(-2000, hy, W + 4000, H * 3);
  const fade = (y) => clamp((y - hy) / 520) * 0.9 + 0.1;
  const rays = []; for (let i = -16; i <= 16; i++) rays.push([[vx + i * 14, hy], [vx + i * 230, hy + 1400]]);   // rays from the vanishing point, one path
  neoTube(rays, gc, { w: 2.2, on: 0.5, core: false, halo: 0.8 });
  const ph = mod(TT * speed, 1);
  for (let k = 0; k < 16; k++) {   // cross lines coming toward the camera
    const d = (k + 1 - ph), y = hy + 900 / (d * d * 0.55 + 0.6) - 900 / (16 * 16 * 0.55 + 0.6);
    if (y > hy + 1400) continue;
    neoTube([[-1500, y], [W + 1500, y]], gc, { w: 2.2, on: 0.5 * fade(y), core: false, halo: 0.8 });
  }
  ctx.restore();
  neoTube([[-1500, hy], [W + 1500, hy]], NEO.pink, { w: 3, on: 0.85, core: true });   // the horizon
}
// a skyline: building outlines as dim tubes along the horizon, windows that blink
function neoSkyline(hy, key = 'sky', o = {}) {
  const R = RNG('neocity', key); let x = -120;
  while (x < W + 120) {
    const w = R.r(70, 150), h = R.r(o.min ?? 140, o.tall ?? 380), c = R.r() < 0.5 ? NEO.violet : NEO.cyanD;
    const P = [[x, hy], [x, hy - h], [x + w, hy - h], [x + w, hy]];
    ctx.save(); neoPath(P, true); ctx.fillStyle = NEO.ground; ctx.globalAlpha = o.fill ?? 0.72; ctx.fill(); ctx.restore();
    neoTube(P, c, { w: 3, on: 0.42, core: false });
    for (let yy = hy - h + 26; yy < hy - 30; yy += 34) for (let xx = x + 16; xx < x + w - 16; xx += 26) {
      // each window has its own generator: the city generator R must draw the same numbers every frame
      const lit = RNG('neowin', key, Math.round(xx), Math.round(yy), Math.floor(TT * 1.5 + xx * 0.01)).r() < 0.28;
      if (lit) { ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = RNG('neowinc', key, Math.round(xx), Math.round(yy)).r() < 0.6 ? NEO.amber : NEO.cyan; ctx.fillRect(xx, yy, 9, 13); ctx.restore(); }
    }
    x += w + R.r(8, 40);
  }
}
// a wet-floor reflection: draw() again, mirrored about floorY, added as light below the floor line, fading with
// distance and broken into rippling rows. o: { stretch (the mirror's vertical scale, 0.8), len (fade length, world px), ripple (px) }
// draw() must not draw text (the text check would see mirrored strings) and should not queue DEFER items.
let NEO_SCRATCH = null, NEO_LITE = false;   // NEO_LITE: inside a reflection every tube takes the cheap halo (it is faint and rippled anyway)
function neoReflect(floorY, draw, a = 0.28, o = {}) {
  const T = ctx.getTransform(), main = ctx, z = Math.abs(T.d) || 1;
  const sy = Math.max(0, Math.floor(T.b * 0 + T.d * floorY + T.f)), len = Math.min(H - sy, Math.ceil((o.len ?? 560) * z));
  if (len <= 2) return;
  if (!NEO_SCRATCH) { NEO_SCRATCH = document.createElement('canvas'); NEO_SCRATCH.width = W; NEO_SCRATCH.height = H; }
  const c2 = NEO_SCRATCH.getContext('2d'), spark = SPARK_AT, defer = DEFER;
  c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over';
  c2.clearRect(0, sy, W, len); c2.beginPath(); c2.rect(0, sy, W, len); c2.clip();
  c2.setTransform(T); c2.translate(0, floorY); c2.scale(1, -(o.stretch ?? 0.8)); c2.translate(0, -floorY);
  ctx = c2; DEFER = null; NEO_LITE = true;
  try { draw(); } finally { ctx = main; DEFER = defer; SPARK_AT = spark; NEO_LITE = false; c2.restore(); }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'lighter';
  const base = main.globalAlpha, rows = 12, amp = (o.ripple ?? 7) * z;
  for (let y = 0; y < len; y += rows) {
    const d = y / len, h = Math.min(rows, len - y);
    main.globalAlpha = base * a * (1 - d) ** 1.6;
    main.drawImage(NEO_SCRATCH, 0, sy + y, W, h, Math.sin(y * 0.11 + TT * 3.1) * amp * (0.25 + d), sy + y, W, h);
  }
  main.restore();
}
// a hung sign: a dark backboard, two wires up to the ceiling, brackets
function neoSignBoard(x, y, w, h, c, on = 1) {
  for (const sx of [x + w * 0.2, x + w * 0.8]) neoTube([[sx, y - 900], [sx, y]], NEO.inkD, { w: 2, on: 0.2, offC: '#3b3560' });
  ctx.save(); neoPath(neoRRectPts(x, y, w, h, 46), true); ctx.fillStyle = '#0b0920'; ctx.fill(); ctx.restore();
  neoFill(neoRRectPts(x, y, w, h, 46), c, 0.06 * on);
  neoTube(neoRRectPts(x + 18, y + 18, w - 36, h - 36, 32), c, { w: 6, on });
}

// ---------------------------------------------------------------------
//  type: T1 tube lettering — a single-stroke capital alphabet bent from one tube per stroke (NEO_GLYPHS);
//        T2 glowing filled sans (captions); T3 plain mono labels.
// ---------------------------------------------------------------------
function neoFont(size, weight = 800, fam = NEO_SANS) { ctx.font = `${weight} ${size}px ${fam}`; }
function neoTextW(str, size, weight, fam) { ctx.save(); neoFont(size, weight, fam); const w = ctx.measureText(str).width; ctx.restore(); return w; }

// The tube alphabet. Units: x in cap heights from the glyph's left edge, y 0 = cap line, 1 = baseline.
// Each glyph: [advance width, stroke, stroke, ...]; a stroke is a polyline (a closed loop repeats its first point).
const neoArc = (cx, cy, rx, ry, a0, a1) => {   // degrees, y down: 0 = right, 90 = down, -90 = up
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 12)), P = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * DEG; P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return P;
};
const NEO_GLYPHS = (() => {
  const a = neoArc, dot = (x, y) => [[x, y], [x + 0.002, y]];
  const bowlP = [[0, 1], [0, 0], [0.3, 0], ...a(0.3, 0.27, 0.26, 0.27, -90, 90), [0, 0.54]];
  const six = [...a(0.5, 0.68, 0.5, 0.66, -95, -180), ...a(0.28, 0.68, 0.28, 0.32, 180, -180)];
  const G = {
    A: [0.68, [[0, 1], [0.34, 0], [0.68, 1]], [[0.13, 0.64], [0.55, 0.64]]],
    B: [0.58, [[0, 1], [0, 0], [0.3, 0], ...a(0.3, 0.24, 0.25, 0.24, -90, 90), [0, 0.48]], [[0.3, 0.48], ...a(0.31, 0.74, 0.27, 0.26, -90, 90), [0, 1]]],
    C: [0.62, a(0.34, 0.5, 0.34, 0.5, -52, -308)],
    D: [0.62, [[0, 0], [0.26, 0], ...a(0.26, 0.5, 0.36, 0.5, -90, 90), [0, 1], [0, 0]]],
    E: [0.52, [[0.52, 0], [0, 0], [0, 1], [0.52, 1]], [[0, 0.5], [0.42, 0.5]]],
    F: [0.5, [[0.5, 0], [0, 0], [0, 1]], [[0, 0.5], [0.4, 0.5]]],
    G: [0.68, [...a(0.34, 0.5, 0.34, 0.5, -52, -360), [0.38, 0.5]]],
    H: [0.6, [[0, 0], [0, 1]], [[0.6, 0], [0.6, 1]], [[0, 0.5], [0.6, 0.5]]],
    I: [0.04, [[0.02, 0], [0.02, 1]]],
    J: [0.46, [[0.46, 0], [0.46, 0.74], ...a(0.23, 0.74, 0.23, 0.26, 0, 180)]],
    K: [0.58, [[0, 0], [0, 1]], [[0.56, 0], [0, 0.6]], [[0.19, 0.44], [0.58, 1]]],
    L: [0.48, [[0, 0], [0, 1], [0.48, 1]]],
    M: [0.78, [[0, 1], [0, 0], [0.39, 0.62], [0.78, 0], [0.78, 1]]],
    N: [0.62, [[0, 1], [0, 0], [0.62, 1], [0.62, 0]]],
    O: [0.68, a(0.34, 0.5, 0.34, 0.5, 0, 360)],
    P: [0.56, bowlP],
    Q: [0.68, a(0.34, 0.5, 0.34, 0.5, 0, 360), [[0.44, 0.74], [0.7, 1.04]]],
    R: [0.58, bowlP, [[0.28, 0.54], [0.58, 1]]],
    S: [0.54, [...a(0.27, 0.25, 0.27, 0.25, -30, -270), ...a(0.27, 0.75, 0.27, 0.25, -90, 150)]],
    T: [0.58, [[0, 0], [0.58, 0]], [[0.29, 0], [0.29, 1]]],
    U: [0.62, [[0, 0], [0, 0.69], ...a(0.31, 0.69, 0.31, 0.31, 180, 0), [0.62, 0]]],
    V: [0.64, [[0, 0], [0.32, 1], [0.64, 0]]],
    W: [0.88, [[0, 0], [0.21, 1], [0.44, 0.3], [0.67, 1], [0.88, 0]]],
    X: [0.6, [[0, 0], [0.6, 1]], [[0.6, 0], [0, 1]]],
    Y: [0.6, [[0, 0], [0.3, 0.5], [0.6, 0]], [[0.3, 0.5], [0.3, 1]]],
    Z: [0.56, [[0, 0], [0.56, 0], [0, 1], [0.56, 1]]],
    0: [0.56, a(0.28, 0.5, 0.28, 0.5, 0, 360)],
    1: [0.26, [[0, 0.2], [0.24, 0], [0.24, 1]]],
    2: [0.54, [...a(0.27, 0.27, 0.27, 0.27, -170, 40), [0, 1], [0.54, 1]]],
    3: [0.54, [...a(0.26, 0.25, 0.26, 0.25, -160, 90), ...a(0.26, 0.74, 0.28, 0.26, -90, 160)]],
    4: [0.6, [[0.44, 1], [0.44, 0], [0, 0.7], [0.6, 0.7]]],
    5: [0.54, [[0.5, 0], [0.08, 0], [0.04, 0.45], ...a(0.26, 0.68, 0.28, 0.32, -135, 150)]],
    6: [0.56, six],
    7: [0.54, [[0, 0], [0.54, 0], [0.18, 1]]],
    8: [0.54, a(0.27, 0.25, 0.23, 0.25, 0, 360), a(0.27, 0.74, 0.27, 0.26, 0, 360)],
    9: [0.56, six.map(([x, y]) => [0.56 - x, 1 - y])],
    ' ': [0.36],
    '.': [0.06, dot(0.03, 1)], ',': [0.08, [[0.06, 0.97], [0, 1.15]]], ':': [0.06, dot(0.03, 0.36), dot(0.03, 1)],
    '·': [0.06, dot(0.03, 0.5)], '-': [0.34, [[0, 0.52], [0.34, 0.52]]], '+': [0.44, [[0, 0.52], [0.44, 0.52]], [[0.22, 0.3], [0.22, 0.74]]],
    '!': [0.06, [[0.03, 0], [0.03, 0.7]], dot(0.03, 1)], '?': [0.5, [...a(0.25, 0.25, 0.25, 0.25, -180, 90), [0.25, 0.72]], dot(0.25, 1)],
    '/': [0.4, [[0, 1.02], [0.4, -0.02]]], "'": [0.04, [[0.02, 0], [0.02, 0.2]]],
  };
  return G;
})();
const NEO_CAP = 0.72;   // tube cap height / font size (matches the sans' capitals, so tube words sit on the same line)
// lay a string out in tube capitals: [{ ch, x, w, S: strokes in px relative to (0, baseline) or null }], total width
function neoTubeLay(str, size, track) {
  const cap = size * NEO_CAP, tr = track ?? size * 0.13, out = []; let x = 0;
  for (const raw of String(str)) {
    const ch = NEO_GLYPHS[raw] ? raw : raw.toUpperCase(), g = NEO_GLYPHS[ch];
    const w = g ? g[0] * cap : neoTextW(raw, size, 300);
    out.push({ ch: g ? ch : raw, x, w, S: g ? g.slice(1).map((Q) => Q.map(([px, py]) => [px * cap, (py - 1) * cap])) : null });
    x += w + tr;
  }
  return { items: out, w: Math.max(0, x - tr) };
}
function neoTubeW(str, size, track) { return neoTubeLay(str, size, track).w; }
// tell the text check a tube word is here (it only sees fillText / strokeText): an invisible fill of the same box
function neoTextMark(str, x, y, size, w) {
  ctx.save(); neoFont(size); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillText(String(str).toUpperCase(), x, y, w); ctx.restore();
}
// draw laid-out glyphs at (x, baseline y); on: one brightness, or a function of the letter index
function neoTubeDraw(lay, x, y, size, c, on, w) {
  const tw = w ?? Math.max(3, size * 0.058), at = (S, gx) => S.map((Q) => Q.map(([px, py]) => [x + gx + px, y + py]));
  if (typeof on !== 'function') {   // the whole word as one path
    const all = []; for (const g of lay.items) if (g.S) all.push(...at(g.S, g.x));
    if (all.length) neoTube(all, c, { on, w: tw });
  }
  lay.items.forEach((g, i) => {
    const v = typeof on === 'function' ? on(i) : on;
    if (g.S) { if (typeof on === 'function' && g.S.length) neoTube(at(g.S, g.x), c, { on: v, w: tw }); return; }
    if (v <= 0.001) return;   // a character outside the tube alphabet: a light weight of the sans, stroked as a thin tube
    ctx.save(); neoFont(size, 300); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    if (v < 0.2) { ctx.globalAlpha *= 0.5; ctx.fillStyle = NEO.inkD; ctx.fillText(g.ch, x + g.x, y); ctx.restore(); return; }
    ctx.globalCompositeOperation = 'lighter'; const base = ctx.globalAlpha; ctx.strokeStyle = c;
    for (const [k, al] of NEO_HALO) { ctx.globalAlpha = base * al * v; ctx.lineWidth = tw * k; ctx.strokeText(g.ch, x + g.x, y); }
    ctx.globalAlpha = base * v; ctx.fillStyle = NEO.white; ctx.fillText(g.ch, x + g.x, y); ctx.restore();
  });
}
// o: { on, align, base, tube (single-stroke tube capitals), w (tube width), track, weight, fam, hot (white over a filled word, 0.55) }
function neoText(str, x, y, size, c, o = {}) {
  const on = o.on ?? 1; if (on <= 0.001 || !str) return 0;
  if (o.tube) {
    const lay = neoTubeLay(str, size, o.track), x0 = o.align === 'center' ? x - lay.w / 2 : o.align === 'right' ? x - lay.w : x;
    const y0 = o.base === 'middle' ? y + size * NEO_CAP / 2 : y;
    neoTubeDraw(lay, x0, y0, size, c, on, o.w); neoTextMark(str, x0, y0, size, lay.w);
    return lay.w;
  }
  ctx.save(); neoFont(size, o.weight ?? 800, o.fam); ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const w = ctx.measureText(str).width, base = ctx.globalAlpha;
  if (on < 0.2) { ctx.globalAlpha = base * 0.3; ctx.fillStyle = NEO.inkD; ctx.fillText(str, x, y); ctx.restore(); return w; }   // unlit: dull glass
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = c; ctx.fillStyle = c;
  for (const [k, a] of [[size * 0.32, 0.05], [size * 0.18, 0.09], [size * 0.09, 0.16]]) { ctx.globalAlpha = base * a * on; ctx.lineWidth = k; ctx.strokeText(str, x, y); }
  ctx.globalAlpha = base * on; ctx.fillText(str, x, y);
  ctx.globalAlpha = base * on * (o.hot ?? 0.55); ctx.fillStyle = NEO.white; ctx.fillText(str, x, y);
  ctx.restore(); return w;
}
// a sign word in tube capitals, centred on x, baseline y, that lights letter by letter, each with its own flicker
function neoSignWord(str, x, y, size, c, t0, o = {}) {
  const lay = neoTubeLay(str, size, o.track ?? size * 0.17), x0 = x - lay.w / 2;
  // before a letter catches it hangs there as dull glass (o.unlit: false hides it instead)
  neoTubeDraw(lay, x0, y, size, c, (i) => Math.max(o.unlit === false ? 0 : 0.1, neoPower(t0 + i * (o.stagger ?? 0.125), (o.key ?? 'w') + i, o.dur ?? 0.4)), o.w);
  neoTextMark(str, x0, y, size, lay.w);
  return lay.w;
}

// ---------------------------------------------------------------------
//  the hero: "Volt", a round tube robot-blob with an antenna light and two capsule eyes that blink.
//  (x, y) = its centre, r = its radius. o: { key, on, bob, look, mood: 'smile' | 'wow', c }
// ---------------------------------------------------------------------
function neoHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', on = o.on ?? 1, c = o.c ?? NEO.cyan;
  y += (o.bob ?? Math.sin(TT * TAU * 0.8 + key.length) * 0.05) * r;
  const sq = 1 + (o.squash ?? 0);
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y + r); ctx.scale(1 / Math.sqrt(sq), sq); ctx.translate(-x, -(y + r));
  const body = neoHeroPts(x, y, r);
  ctx.save(); neoPath(body, true); ctx.fillStyle = NEO.ground; ctx.fill(); ctx.restore();
  neoFill(body, c, 0.16 * on);
  neoTube(body, c, { on, w: Math.max(4, r * 0.075) });
  // antenna
  neoTube([[x + r * 0.15, y - r * 0.95], [x + r * 0.32, y - r * 1.35]], c, { on, w: Math.max(3, r * 0.05) });
  const lamp = 0.6 + 0.4 * Math.sin(TT * TAU * 1.6);
  neoGlow(x + r * 0.32, y - r * 1.42, r * 0.5, NEO.amber, 0.5 * on * lamp);
  neoTube(neoCirclePts(x + r * 0.32, y - r * 1.42, r * 0.09, 16), NEO.amber, { on: on * lamp, w: Math.max(4, r * 0.07), closed: true });
  // eyes (blink every ~3s), and a mouth
  const look = (o.look ?? 0) * r * 0.12, blink = mod(TT + key.length * 0.37, 3.1) < 0.12;
  for (const s of [-1, 1]) {
    const ex = x + s * r * 0.3 + look, ey = y - r * 0.12;
    neoTube(blink ? [[ex - r * 0.08, ey], [ex + r * 0.08, ey]] : [[ex, ey - r * 0.12], [ex, ey + r * 0.1]], NEO.white, { on, w: Math.max(5, r * 0.11), halo: 0.7 });
  }
  if (o.mood === 'wow') neoTube(neoCirclePts(x + look, y + r * 0.32, r * 0.1, 20), NEO.pink, { on, w: Math.max(3, r * 0.05), closed: true });
  else neoTube(neoCirclePts(x + look, y + r * 0.14, r * 0.26, 14, 25 * DEG, 155 * DEG), NEO.pink, { on, w: Math.max(3, r * 0.055) });
  ctx.restore();
}
function neoHeroPts(x, y, r) {   // a soft rounded "gumdrop": flatter at the base
  const P = []; for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, s = Math.sin(a); P.push([x + Math.cos(a) * r * (s > 0 ? 1.04 : 0.96), y + s * r * (s > 0 ? 0.86 : 1)]); }
  return P;
}

// ---------------------------------------------------------------------
//  background life: drifting sparks, floating tube notes, an equalizer
// ---------------------------------------------------------------------
function neoDust(key, n = 26, o = {}) {
  const R = RNG('neodust', key);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = R.r(20, 60), x0 = R.r(0, W), y0 = R.r(0, H), y = mod(y0 - TT * sp, H + 100) - 50, x = x0 + Math.sin(TT * R.r(0.5, 1.4) + i) * 18;
    ctx.globalAlpha = R.r(0.25, 0.7); ctx.fillStyle = [NEO.mag, NEO.cyan, NEO.amber][i % 3]; ctx.beginPath(); ctx.arc(x, y, R.r(1.5, 3.5), 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function neoNote(x, y, s, c, on = 1) {   // an eighth note in tube
  neoTube(neoCirclePts(x, y, s * 0.28, 20), c, { on, closed: true, w: 5 });
  neoTube([[x + s * 0.28, y], [x + s * 0.28, y - s], [x + s * 0.62, y - s * 0.7]], c, { on, w: 5 });
}
function neoEQ(x0, x1, yb, n, hMax, t0, o = {}) {
  const bw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const R = RNG('neoeq', i), beat = Math.exp(-mod(TT - t0, o.every ?? 0.5) * 5);
    const h = hMax * clamp((0.25 + 0.45 * (0.5 + 0.5 * Math.sin(TT * R.r(4, 9) + i)) + 0.35 * beat * R.r(0.4, 1)) * EZ.o3(ev(t0 + i * 0.03, 0.3)));
    const x = x0 + i * bw + bw * 0.18, w = bw * 0.64, c = i / n < 0.5 ? NEO.cyan : NEO.mag;
    if (h > 6) neoTube(neoRRectPts(x, yb - h, w, h, Math.min(10, w / 2)), c, { closed: true, w: 4, on: 0.9 });
  }
}

// ---------------------------------------------------------------------
//  captions and tags (DEFER: after the camera, at screen size). Captions flicker on word by word like a sign;
//  *a phrase* is the same bold glowing sans in the accent colour (tube capitals are for sign words only). They fade out during the first 0.3s of a bridge's shrink.
// ---------------------------------------------------------------------
function neoLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
function neoCaptionNow(str, o = {}) {
  const al = neoLeaving(); if (al <= 0.001) return;
  const size = o.size ?? 76, lh = size * 1.22, t0 = E0 + (o.at ?? 0.7), lines = str.split('\n'), yLast = o.y ?? 1470;
  const hiC = o.hi ?? NEO.amber, col = o.c ?? NEO.ink;
  ctx.save(); ctx.globalAlpha = al;
  // a dark band so the caption reads over the grid
  const top = yLast - (lines.length - 1) * lh - size * 1.05, bh = (lines.length - 1) * lh + size * 1.5;
  const bg = ctx.createLinearGradient(0, top - 30, 0, top + bh + 60); bg.addColorStop(0, 'rgba(7,6,26,0)'); bg.addColorStop(0.2, 'rgba(7,6,26,0.74)'); bg.addColorStop(0.75, 'rgba(7,6,26,0.74)'); bg.addColorStop(1, 'rgba(7,6,26,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, top - 30, W, bh + 90);
  let k = 0;
  lines.forEach((line, li) => {
    const words = line.split(/(\*[^*]+\*)/).filter((g) => g.trim()).flatMap((g) => (g[0] === '*' ? [{ w: g.slice(1, -1), hi: true }] : g.trim().split(/\s+/).map((w) => ({ w, hi: false }))));
    neoFont(size); const sp = ctx.measureText(' ').width, ws = words.map((d) => neoTextW(d.w, size));
    let xx = (o.x ?? CX) - (ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1)) / 2;
    const yy = yLast - (lines.length - 1 - li) * lh;
    words.forEach((d, i) => {
      const tw = t0 + k * 0.09, on = TT < tw + 0.22 ? neoPower(tw, 'cap' + E0 + k, 0.22) : 1; k++;   // once lit, a caption holds steady (no dips: it has to be read)
      neoText(d.w, xx, yy, size, d.hi ? hiC : col, { on, hot: d.hi ? 0.22 : 0.55 });   // the highlight: the same bold sans, in the accent, less white so the colour stays saturated
      xx += ws[i] + sp;
    });
  });
  ctx.restore();
}
function neoTagNow(num, label, c) {
  const al = neoLeaving(), on = TT < E0 + 0.45 ? neoPower(E0 + 0.15, 'tag' + E0, 0.3) : 1; if (al <= 0.001 || on <= 0) return;
  const x = 70, y = 262, h = 70, size = 32, lw = neoTextW(label, size, 700, NEO_MONO), w = h + 20 + lw + 30;
  ctx.save(); ctx.globalAlpha = al;
  ctx.save(); neoPath(neoRRectPts(x, y, w, h, h / 2), true); ctx.fillStyle = 'rgba(7,6,26,0.8)'; ctx.fill(); ctx.restore();
  neoTube(neoRRectPts(x, y, w, h, h / 2), c, { closed: true, w: 3.5, on });
  neoText(num, x + h / 2 + 4, y + h / 2 + 2, 30, NEO.amber, { align: 'center', base: 'middle', fam: NEO_MONO, weight: 700, on });
  neoText(label, x + h + 14, y + h / 2 + 2, size, NEO.ink, { base: 'middle', fam: NEO_MONO, weight: 700, on });
  ctx.restore();
}
const neoTag = (num, label, o = {}) => { const f = () => neoTagNow(num, label, o.c ?? NEO.cyan); if (DEFER) DEFER.push(f); else f(); };
const neoCaption = (str, o = {}) => { const f = () => neoCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  post: scanlines, a vignette, a little grain (reseeded every frame)
// ---------------------------------------------------------------------
function neoPost() {
  ctx.save(); screen();
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = mod(F * 2, 6); y < H; y += 6) ctx.fillRect(0, y, W, 2);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,1,10,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const R = RNG('neograin', F); ctx.fillStyle = 'rgba(255,240,255,0.06)'; ctx.beginPath();
  for (let i = 0; i < 1400; i++) ctx.rect(R.r(0, W), R.r(0, H), 2, 2);
  ctx.fill(); ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'neon',
  paper: NEO.paper,
  backdrop(c) { fillAll(c); },
  // the old/new era seen through outline P, rimmed by a glowing tube in the bridge colour (it stutters on as it grows)
  window(P, key, src, o = {}) {
    ctx.save(); neoPath(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const on = o.phase === 'grow' && o.u < 0.3 ? neoFlicker(o.u / 0.3, key) : 1;   // the new era's rim catches as it opens
    neoTube(P, o.c && o.c[0] === '#' ? o.c : NEO.mag, { closed: true, w: 9, on });
  },
  // the morphing shape: a dim coloured glass fill and a tube outline, plus an echo ring
  blob(P, c) {
    const ce = neoCentroid(P);
    neoGlow(ce[0], ce[1], 420, c, 0.25);
    neoFill(P, c, 0.16);
    neoTube(P.map(([x, y]) => [ce[0] + (x - ce[0]) * 1.12, ce[1] + (y - ce[1]) * 1.12]), c, { closed: true, w: 3, on: 0.5, core: false });
    neoTube(P, c, { closed: true, w: 10 });
  },
  hero(x, y, r, o = {}) { neoHero(x, y, r * 0.8, { key: o.key, mood: o.mood }); },
  heroColor: NEO.cyan,
  heroPts(x, y, r) { return neoHeroPts(x, y, r * 0.8); },
  post() { neoPost(); },
  ones: true,
};
