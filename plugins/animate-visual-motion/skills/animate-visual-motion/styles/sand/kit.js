// =====================================================================
//  styles/sand/kit.js — SAND: sand animation performed on a backlit glass table. The ground is a glowing light box
//  (hot in the middle, deep brown in the corners). Pictures are made of sand: thick sand blocks the light (near-black
//  umber silhouettes), thin sand is a grainy translucent tan, glass wiped clean glows. So there are two ways to draw:
//  POUR sand on (sndPile, sndDribble, sndLayer, sndPour) or WIPE it away with a finger (sndWipe, sndPoke, sndDisc,
//  sndClear, sndSweep), which leaves a darker ridge of pushed sand along the stroke.
//
//  How it works: between sndGlow() and sndDone() the global `ctx` is a half-resolution SAND canvas whose alpha is the
//  sand's thickness (paint black with alpha = pour, 'destination-out' = wipe). sndDone() "develops" it in one pass:
//  every pixel's thickness is compared with a cached seeded noise tile fixed to the table, so soft edges break up into
//  scattered grains, thin layers become stipple and thick sand becomes a textured dark. Only a few hundred real moving
//  grains are ever drawn (pour streams, splashes, sweeps, drift).
//  Built on kit/core.js. Motion on 1s. Helpers are prefixed snd…; the palette is SND. Needs from the piece head: CX.
// =====================================================================
const SND = {
  paper: '#cfa873',                     // the lit table under an even film of sand: the ground a morph happens on
  amber: '#f2a437', moon: '#a6bbdc',    // BACKLIGHT TINTS (the only "colour" there is): warm day lamp, cool moonlight
  cream: '#ffedc2', moonlit: '#eef4ff', // glass wiped clean under each tint (bridge colours)
  tan: '#b98a50', umber: '#4f3018', black: '#1b0f07',   // sand: a thin scatter, the warm specks in a thick layer, thick sand
  dark: '#150b05',                      // what the light falls to in the corners
};
const SND_FONT = '"Arial Rounded MT Bold", "Varela Round", "Nunito", "Baloo 2", "Segoe UI", "Trebuchet MS", "DejaVu Sans", Arial, sans-serif';
const SND_RES = 0.5;                    // the sand canvas' resolution: one developed grain = 2 px at 1080 wide

// ---------------------------------------------------------------------
//  colour: hex or rgb() in, rgb() out
// ---------------------------------------------------------------------
function sndRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
const sndMix = (a, b, u) => { const x = sndRGB(a), y = sndRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const sndLift = (c, k) => sndMix(c, '#ffffff', k);       // toward clean bright glass
const sndShade = (c, k) => sndMix(c, SND.dark, k);       // toward the dark corners
const sndA = (c, al) => { const x = sndRGB(c); return `rgba(${x[0]},${x[1]},${x[2]},${al})`; };

// ---------------------------------------------------------------------
//  the light box. sndLight(c, o) fills the current ctx with the backlight in tint c (current coords): hot centre at
//  (o.x, o.y), falling to deep brown at radius o.r. Works for hex and rgb() (the morph backdrop uses it too).
// ---------------------------------------------------------------------
function sndLight(c, o = {}) {
  const x = o.x ?? W * 0.48, y = o.y ?? H * 0.42, R = o.r ?? H * 0.66;
  const g = ctx.createRadialGradient(x, y, R * 0.03, x, y, R);
  g.addColorStop(0, sndLift(c, 0.66)); g.addColorStop(0.22, sndLift(c, 0.4)); g.addColorStop(0.5, c); g.addColorStop(0.78, sndShade(c, 0.5)); g.addColorStop(1, sndShade(c, 0.8));
  ctx.save(); ctx.fillStyle = sndShade(c, 0.8); ctx.fillRect(-W, -H, 3 * W, 3 * H); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); ctx.restore();
}
// dust that never leaves the glass: a few hundred stray grains and faint smears (one cached full-size canvas)
let SND_DUSTC = null;
function sndDust() {
  if (SND_DUSTC) return SND_DUSTC;
  const c = SND_DUSTC = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = RNG('snddust');
  g.fillStyle = SND.black;
  for (let i = 0; i < 1500; i++) { g.globalAlpha = R.r(0.06, 0.3); const s = R.r(1.6, 3.6); g.fillRect(R.r(0, W), R.r(0, H), s, s); }
  g.strokeStyle = SND.umber; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { g.globalAlpha = R.r(0.02, 0.05); g.lineWidth = R.r(30, 90); const x = R.r(0, W), y = R.r(0, H); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R.n(300), y + R.n(120), x + R.n(520), y + R.n(200)); g.stroke(); }
  return c;
}
let SND_VIGC = null;
function sndVignette() {
  if (SND_VIGC) return SND_VIGC;
  const c = SND_VIGC = document.createElement('canvas'); c.width = W / 4; c.height = H / 4; const g = c.getContext('2d');
  const gr = g.createRadialGradient(c.width / 2, c.height * 0.46, c.height * 0.3, c.width / 2, c.height * 0.5, c.height * 0.64);
  gr.addColorStop(0, 'rgba(18,9,4,0)'); gr.addColorStop(1, 'rgba(18,9,4,0.42)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------------------------------------------------------------------
//  the sand canvas and its development
// ---------------------------------------------------------------------
let SND_D = null, SND_G = null, SND_OC = null, SND_OG = null;   // thickness canvas (+ctx), developed output (+ctx)
let SND_REAL = null, SND_T = null, SND_Q = [], SND_TINT = SND.amber, SND_N = null, SND_L = null;
function sndInit() {
  if (SND_D) return;
  SND_D = document.createElement('canvas'); SND_D.width = Math.ceil(W * SND_RES); SND_D.height = Math.ceil(H * SND_RES);
  SND_G = SND_D.getContext('2d', { willReadFrequently: true });
  SND_OC = document.createElement('canvas'); SND_OC.width = SND_D.width; SND_OC.height = SND_D.height; SND_OG = SND_OC.getContext('2d');
}
// a 512x512 tile of grain thresholds: white noise with a little soft blotch so a thin film is never perfectly even
function sndNoise() {
  if (SND_N) return SND_N;
  const n = 512, N = SND_N = new Uint8Array(n * n), R = RNG('sndnoise'), G = 32, Lt = new Float32Array(G * G);
  for (let i = 0; i < G * G; i++) Lt[i] = R.f();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fx = x / n * G, fy = y / n * G, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy, sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
    const a = Lt[iy * G + ix], b = Lt[iy * G + (ix + 1) % G], c = Lt[((iy + 1) % G) * G + ix], d = Lt[((iy + 1) % G) * G + (ix + 1) % G];
    N[y * n + x] = Math.floor(clamp(R.f() * 0.86 + lerp(lerp(a, b, sx), lerp(c, d, sx), sy) * 0.14) * 255);
  }
  return N;
}
// thickness (0..255) x noise (0..255) -> the developed pixel (RGBA as a little-endian uint32)
function sndLut() {
  if (SND_L) return SND_L;
  const L = SND_L = new Uint32Array(65536), thin = sndRGB(SND.tan), thick = sndRGB(SND.black), warm = sndRGB(SND.umber);
  for (let d = 1; d < 256; d++) for (let n = 0; n < 256; n++) {
    const dn = d / 255, nn = n / 255, grain = clamp((dn * 1.45 - nn) * 2.2), a = clamp(grain * 0.86 + dn * dn * 0.3);
    if (a < 0.02) continue;
    const t = a ** 1.3, k = nn * 0.6 * t, px = [0, 1, 2].map((i) => Math.round(lerp(lerp(thin[i], thick[i], t), warm[i], k)));
    L[(d << 8) | n] = ((Math.round(a * 255) << 24) | (px[2] << 16) | (px[1] << 8) | px[0]) >>> 0;
  }
  return L;
}
// swap ctx to the sand canvas (same transform as the real one). Paint black with alpha = sand; destination-out = wipe.
function sndOpen() {
  sndInit(); SND_REAL = ctx; const m = SND_T = ctx.getTransform();
  ctx = SND_G; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
  ctx.clearRect(0, 0, SND_D.width, SND_D.height);
  ctx.setTransform(m.a * SND_RES, m.b * SND_RES, m.c * SND_RES, m.d * SND_RES, m.e * SND_RES, m.f * SND_RES);
  ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineCap = ctx.lineJoin = 'round'; SND_Q = [];
}
// develop the sand and lay it on the real canvas. bb (screen px) limits the work to a box; into = a cache canvas instead
function sndClose(bb, into) {
  const w = SND_D.width, h = SND_D.height, m = SND_T;
  let x0 = 0, y0 = 0, x1 = w, y1 = h;
  if (bb) { x0 = Math.max(0, Math.floor(bb.x0 * SND_RES)); y0 = Math.max(0, Math.floor(bb.y0 * SND_RES)); x1 = Math.min(w, Math.ceil(bb.x1 * SND_RES)); y1 = Math.min(h, Math.ceil(bb.y1 * SND_RES)); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx = SND_REAL; SND_REAL = null;
  const ww = x1 - x0, hh = y1 - y0;
  if (ww > 0 && hh > 0) {
    const img = SND_G.getImageData(x0, y0, ww, hh), p = new Uint32Array(img.data.buffer), N = sndNoise(), L = sndLut();
    // the noise is fixed to the table (world coords), so grains stay put under a camera move and re-form under a moving shape
    const iz = 1 / (m.a || 1), du = Math.round(iz * 65536), u0 = Math.round((x0 - m.e * SND_RES) * iz * 65536), v0 = Math.round((y0 - m.f * SND_RES) / (m.d || 1) * 65536), dv = Math.round(65536 / (m.d || 1));
    for (let y = 0, i = 0; y < hh; y++) {
      const row = (((v0 + y * dv) >> 16) & 511) << 9; let u = u0;
      for (let x = 0; x < ww; x++, i++, u += du) { const a = p[i] >>> 24; if (a) p[i] = L[(a << 8) | N[row | ((u >> 16) & 511)]]; }
    }
    SND_OG.clearRect(0, 0, w, h); SND_OG.putImageData(img, x0, y0);
    const g = into ? into.getContext('2d') : ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true;
    if (into) g.drawImage(SND_OC, x0, y0, ww, hh, x0, y0, ww, hh); else g.drawImage(SND_OC, x0, y0, ww, hh, x0 / SND_RES, y0 / SND_RES, ww / SND_RES, hh / SND_RES);
    g.restore();
  }
  const q = SND_Q; SND_Q = []; if (!into) q.forEach((f) => f());
}
// a scene: sndGlow(tint) lights the table and opens the sand; draw; sndDone() develops it (never forget it)
//   tint: SND.amber | SND.moon | any hex.  o: x, y (the hot spot), r, dust (false = no stray grains on the glass)
function sndGlow(tint = SND.amber, o = {}) { SND_TINT = tint; sndLight(tint, o); if (o.dust !== false) ctx.drawImage(sndDust(), 0, 0); sndOpen(); }
function sndDone() { if (SND_REAL) sndClose(); }
// a small sand pass of its own on the current ctx (used by the hooks and the captions); bb = its box in screen px
function sndPass(fn, bb) { sndOpen(); fn(); sndClose(bb); }
// real grains: list of [x, y, size, alpha] in world coords, drawn on top of the developed sand
function sndSpecks(list, c) {
  const draw = () => { ctx.save(); ctx.fillStyle = c || SND.black; for (const [x, y, s, al] of list) { if (al <= 0.02) continue; ctx.globalAlpha = Math.min(1, al); ctx.fillRect(x - s / 2, y - s / 2, s, s); } ctx.restore(); };
  if (SND_REAL) SND_Q.push(draw); else draw();
}

// ---------------------------------------------------------------------
//  primitives (all inside sndGlow … sndDone, in world coords)
// ---------------------------------------------------------------------
// a fixed hand-made unevenness along an outline (seeded by key: sand does not boil, it stays where it was put)
function sndRough(P, amt = 3, key = 'r', closed = true, step = 16) {
  const Q = resample(P, closed, step), n = Q.length; if (!amt) return Q;
  const R = RNG('sndrough', key), f1 = R.r(0.018, 0.04), f2 = R.r(0.07, 0.13), f3 = R.r(0.2, 0.32), p1 = R.r(0, TAU), p2 = R.r(0, TAU), p3 = R.r(0, TAU), out = new Array(n); let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    const o = amt * (0.6 * Math.sin(s * f1 + p1) + 0.3 * Math.sin(s * f2 + p2) + 0.25 * Math.sin(s * f3 + p3));
    out[i] = [Q[i][0] + nx / l * o, Q[i][1] + ny / l * o];
  }
  return out;
}
// the scattered skirt of the current path: three wide faint strokes that the development turns into stray grains
function sndSkirt(soft = 12, d = 1, w = 0) {
  ctx.globalAlpha = d * 0.13; ctx.lineWidth = w + soft * 2.6; ctx.stroke();
  ctx.globalAlpha = d * 0.28; ctx.lineWidth = w + soft * 1.3; ctx.stroke();
  ctx.globalAlpha = d * 0.5; ctx.lineWidth = w + soft * 0.45; ctx.stroke();
}
function sndFillSoft(Q, d = 1, soft = 12) {
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineJoin = ctx.lineCap = 'round';
  trace(Q, true); sndSkirt(soft, d); ctx.globalAlpha = d; ctx.fill(); ctx.restore();
}
// where the top of a growing heap is (for the stream that feeds it): sndPileTop(P, p, o) with the same o as sndPile
function sndPileTop(P, p, o = {}) {
  const bb = bbox(P), px = o.from ?? (bb.x0 + bb.x1) / 2, slope = o.slope ?? 0.45, base = o.base ?? bb.y1;
  return Math.max(bb.y0, base - clamp(p) * ((base - bb.y0) + slope * Math.max(px - bb.x0, bb.x1 - px) + 40));
}
// POURED SAND: a dark shape with a grainy scattered edge.
//   o: d (thickness 0..1, 1 = blocks the light), p (reveal 0..1), mode ('pour': a heap that rises from o.base under the
//      stream at x = o.from with side slope o.slope | 'sprinkle': grains accumulate everywhere at once),
//      soft (edge scatter, px), rough (outline unevenness), key, raw (use P as given)
function sndPile(P, o = {}) {
  const d = o.d ?? 1, p = clamp(o.p ?? 1), soft = o.soft ?? 12; if (p <= 0 || P.length < 3) return P;
  const Q = o.raw ? P : sndRough(P, o.rough ?? 3, o.key ?? 'pile');
  if (p >= 1) { sndFillSoft(Q, d, soft); return Q; }
  if (o.mode === 'sprinkle') { sndFillSoft(Q, d * p * p, soft); return Q; }
  const bb = bbox(Q), px = o.from ?? (bb.x0 + bb.x1) / 2, slope = o.slope ?? 0.45, base = o.base ?? bb.y1;
  const full = (base - bb.y0) + slope * Math.max(px - bb.x0, bb.x1 - px) + 40, ph = RNG('sndmound', o.key ?? 'pile').r(0, TAU);
  let prev = 0;
  for (const [off, c] of [[0, 0.3], [12, 0.55], [26, 0.8], [42, 1]]) {   // four stacked heaps = a soft, grainy heap surface
    const lift = p * full - off; if (lift <= 0) continue;
    const a = (c * d - prev) / (1 - prev); prev = c * d;
    ctx.save(); ctx.beginPath(); ctx.moveTo(bb.x0 - 60, base + 90);
    for (let x = bb.x0 - 60; x <= bb.x1 + 60; x += 20) ctx.lineTo(x, base - lift + slope * Math.abs(x - px) + 5 * Math.sin(x * 0.03 + ph));
    ctx.lineTo(bb.x1 + 60, base + 90); ctx.closePath(); ctx.clip(); sndFillSoft(Q, a, soft); ctx.restore();
  }
  return Q;
}
// a line of sand dribbled from the hand (the dark twin of sndWipe). o: d, soft
function sndDribble(P, w, p = 1, o = {}) {
  p = clamp(p); if (p <= 0) return; const Q = p < 1 ? subPath(P, p) : P; if (Q.length < 2) return;
  const d = o.d ?? 1;
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#000'; ctx.lineCap = ctx.lineJoin = 'round';
  trace(Q, false); sndSkirt(o.soft ?? 6, d, w); ctx.globalAlpha = d; ctx.lineWidth = w; ctx.stroke(); ctx.restore();
}
// A FINGER WIPE along a path: a clean bright stroke of the given width, growing with progress, with a ridge of pushed
// sand along both sides.  o: depth (1 = down to the glass, 0.3 = a faint ripple), ridge (0..1), edge (0.72: how much of
// the width is fully clean)
function sndWipe(P, w, p = 1, o = {}) {
  p = clamp(p); if (p <= 0) return; const Q = p < 1 ? subPath(P, p) : P; if (Q.length < 2) return;
  const depth = o.depth ?? 1, ridge = o.ridge ?? 0.5, edge = o.edge ?? 0.72;
  ctx.save(); ctx.strokeStyle = '#000'; ctx.lineCap = ctx.lineJoin = 'round'; trace(Q, false);
  if (ridge > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ridge * 0.3; ctx.lineWidth = w + Math.max(12, w * 0.8); ctx.stroke(); ctx.globalAlpha = ridge * 0.62; ctx.lineWidth = w + Math.max(5, w * 0.34); ctx.stroke(); }
  ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = depth * 0.5; ctx.lineWidth = w; ctx.stroke(); ctx.globalAlpha = depth; ctx.lineWidth = w * edge; ctx.stroke();
  ctx.restore();
}
// a fingertip pressed in: a clean dot with a ring of pushed sand (stars, eyes, lamps)
function sndPoke(x, y, r, o = {}) {
  if (r <= 0.3) return; const depth = o.depth ?? 1, ridge = o.ridge ?? 0.5;
  ctx.save(); ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (ridge > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ridge * 0.3; ctx.lineWidth = Math.max(8, r * 0.9); ctx.stroke(); ctx.globalAlpha = ridge * 0.62; ctx.lineWidth = Math.max(4, r * 0.4); ctx.stroke(); }
  ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = depth * 0.5; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.stroke(); ctx.globalAlpha = depth; ctx.fill(); ctx.restore();
}
// an area rubbed clean (a door, a window). o: depth, ridge, soft, rough, key, raw
function sndClear(P, o = {}) {
  const depth = o.depth ?? 1, ridge = o.ridge ?? 0.5, soft = o.soft ?? 5, Q = o.raw ? P : sndRough(P, o.rough ?? 1.2, o.key ?? 'clear', true, 10);
  ctx.save(); ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineCap = ctx.lineJoin = 'round'; trace(Q, true);
  if (ridge > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ridge * 0.3; ctx.lineWidth = soft * 4; ctx.stroke(); ctx.globalAlpha = ridge * 0.62; ctx.lineWidth = soft * 1.8; ctx.stroke(); }
  ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = depth * 0.5; ctx.lineWidth = soft * 0.8; ctx.stroke(); ctx.globalAlpha = depth; ctx.fill(); ctx.restore();
}
// a ridge of piled sand along an outline (the rim of a wiped area; the morph window's edge)
function sndRing(P, w, o = {}) {
  const d = o.d ?? 0.8;
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#000'; ctx.lineCap = ctx.lineJoin = 'round'; trace(P, true);
  ctx.globalAlpha = d * 0.16; ctx.lineWidth = w * 3; ctx.stroke(); ctx.globalAlpha = d * 0.4; ctx.lineWidth = w * 1.8; ctx.stroke(); ctx.globalAlpha = d; ctx.lineWidth = w; ctx.stroke(); ctx.restore();
}
// a round disc wiped clean with a circling finger (a sun, a full moon): the spiral grows with o.p and ends as a disc
// of radius r.  o: p, depth, ridge, turns
function sndDisc(x, y, r, o = {}) {
  const p = clamp(o.p ?? 1); if (p <= 0) return;
  const wd = r * 0.56, rc = r - wd * 0.4, turns = o.turns ?? 1.6, P = [], n = 96;
  for (let i = 0; i <= n; i++) { const t = i / n, a = -1.2 + t * TAU * (turns + 1), rr = rc * Math.min(1, t * (turns + 1) / turns); P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  sndWipe(P, wd, p, { depth: o.depth ?? 1, ridge: o.ridge ?? 0.7, edge: 0.8 });
  if (p >= 1) {   // the finger's last traces inside the clean glass
    ctx.save(); ctx.strokeStyle = '#000'; ctx.globalAlpha = 0.07; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x, y, r * (0.3 + k * 0.22), 0.6 + k * 1.9, 0.6 + k * 1.9 + 2.2); ctx.stroke(); }
    ctx.restore();
  }
}
// A THIN VEIL OF SAND to wipe into (a hazy day sky, a night sky), with finger-swipe streaks. Cached per set of options.
//   o: d (thickness at the top, 0.3), d1 (at the bottom, = d), y0, y1 (the band it covers; soft ends), streaks (12),
//      dir (the streaks' angle, -0.12), key, p (0..1: sprinkled on)
const SND_VEIL = new Map();
function sndLayer(o = {}) {
  const d = o.d ?? 0.3, d1 = o.d1 ?? d, n = o.streaks ?? 12, key = o.key ?? 'veil', ang = o.dir ?? -0.12, y0 = o.y0 ?? -60, y1 = o.y1 ?? H + 60;
  const id = [d, d1, n, key, ang, y0, y1].join('|'); let cv = SND_VEIL.get(id);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = Math.ceil(W * SND_RES); cv.height = Math.ceil(H * SND_RES); SND_VEIL.set(id, cv);
    const g = cv.getContext('2d'), R = RNG('sndveil', key), f = Math.min(80, (y1 - y0) / 3); g.scale(SND_RES, SND_RES);
    const gr = g.createLinearGradient(0, y0, 0, y1), q = f / (y1 - y0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(q, `rgba(0,0,0,${d})`); gr.addColorStop(1 - q, `rgba(0,0,0,${d1})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(-60, y0, W + 120, y1 - y0);
    g.save(); g.beginPath(); g.rect(-60, y0, W + 120, y1 - y0); g.clip(); g.strokeStyle = '#000'; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {   // long finger swipes: most lift a little sand, some leave a little more
      const yy = R.r(y0, y1), a = ang + R.n(0.2), cx = R.r(0, W), len = W * R.r(0.5, 1.1), bend = R.n(140), wd = R.r(24, 84), lift = R.f() < 0.62, al = lift ? R.r(0.14, 0.34) : R.r(0.05, 0.13);
      g.globalCompositeOperation = lift ? 'destination-out' : 'source-over';
      g.beginPath(); g.moveTo(cx - Math.cos(a) * len, yy - Math.sin(a) * len); g.quadraticCurveTo(cx, yy + bend, cx + Math.cos(a) * len, yy + Math.sin(a) * len);
      g.globalAlpha = al * 0.6; g.lineWidth = wd; g.stroke(); g.globalAlpha = al * 0.7; g.lineWidth = wd * 0.5; g.stroke();
    }
    g.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = clamp(o.p ?? 1) ** 2; ctx.drawImage(cv, 0, 0, W, H); ctx.restore();
}
// SAND FALLING from the hand: a thin wavering stream from y0 down to y1 with real grains beside it and a splash where
// it lands. progress 0..1: the head falls, the stream runs, the tail drops away.  o: w (10), key, n (grains)
function sndPour(x, y0, y1, p, o = {}) {
  p = clamp(p); if (p <= 0 || p >= 1) return;
  const w = o.w ?? 9, key = o.key ?? 'pour', yh = lerp(y0, y1, clamp(p / 0.16)), yt = lerp(y0, y1, clamp((p - 0.86) / 0.14)), wx = (y) => x + 2.4 * Math.sin(y * 0.021 + F * 1.3);
  const P = [], R = RNG('sndpour', key), G = []; for (let y = yt; y < yh; y += 36) P.push([wx(y), y]); P.push([wx(yh), yh]);
  if (P.length > 1) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; trace(P, false);
    ctx.globalAlpha = 0.1; ctx.lineWidth = w * 3; ctx.stroke(); ctx.globalAlpha = 0.2; ctx.lineWidth = w * 1.4; ctx.stroke();
    ctx.setLineDash([R.r(40, 90), R.r(10, 26), R.r(18, 50), R.r(8, 20)]); ctx.lineDashOffset = -TT * 1100;   // clumps falling down the stream
    ctx.globalAlpha = 0.62; ctx.lineWidth = w * 0.62; ctx.stroke(); ctx.restore();
  }
  for (let j = 0; j < (o.n ?? 70); j++) { const fr = mod(TT * R.r(1.6, 2.8) + R.f(), 1), y = lerp(yt, yh, fr); G.push([wx(y) + R.n(w * (0.5 + 1.6 * fr)), y, R.r(2, 4.4), R.r(0.6, 1)]); }
  if (p > 0.16) for (let j = 0; j < 26; j++) { const age = mod(TT * R.r(2, 3.2) + R.f(), 1), vx = R.n(120), vy = R.r(60, 200); G.push([x + vx * age, yh - vy * age + 270 * age * age, R.r(2, 4.2), (1 - age) * 0.95]); }
  sndSpecks(G);
}
// THE WHOLE PICTURE SWEPT AWAY sideways (everything drawn so far): behind the moving front only a thin streaky film is
// left, a ridge of pushed sand rides the front, grains fly ahead. Draw the next picture after this call.
//   progress 0..1, dir +1 (left to right) | -1.  o: leave (the film's thickness, 0.2), clean (0.96), key
function sndSweep(p, dir = 1, o = {}) {
  p = clamp(p); if (p <= 0) return;
  const m = 280, fe = 150, xf = dir > 0 ? lerp(-m, W + m + fe, p) : lerp(W + m, -m - fe, p), xr = xf - dir * fe * 0.5, key = o.key ?? 'sweep', leave = o.leave ?? 0.2, R = RNG('sndsweep', key);
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(xf - dir * fe, 0, xf, 0); g.addColorStop(0, `rgba(0,0,0,${o.clean ?? 0.96})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g;
  if (dir > 0) ctx.fillRect(-W, -H, xf + W, 3 * H); else ctx.fillRect(xf, -H, 2 * W, 3 * H);
  ctx.restore();
  if (leave > 0) { ctx.save(); ctx.beginPath(); if (dir > 0) ctx.rect(-W, -H, xr + W, 3 * H); else ctx.rect(xr, -H, 2 * W, 3 * H); ctx.clip(); sndLayer({ d: leave, key: key + 'film', streaks: 14, dir: 0 }); ctx.restore(); }
  const k = Math.sin(Math.PI * clamp(p)) ** 0.35, ph = R.r(0, TAU);
  if (k > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#000'; ctx.lineCap = ctx.lineJoin = 'round';
    for (let i = 0; i < 46; i++) {   // grains dragged along behind the hand
      const y = R.r(-20, H + 20), back = R.r(10, 260), len = R.r(60, 240); ctx.globalAlpha = R.r(0.08, 0.22) * k; ctx.lineWidth = R.r(2, 6);
      ctx.beginPath(); ctx.moveTo(xr - dir * back, y); ctx.lineTo(xr - dir * (back + len), y + R.n(5)); ctx.stroke();
    }
    const P = []; for (let y = -60; y <= H + 60; y += 60) P.push([xr + 26 * Math.sin(y * 0.006 + ph) + R.n(9), y]);
    trace(P, false); ctx.globalAlpha = 0.2 * k; ctx.lineWidth = 140; ctx.stroke(); ctx.globalAlpha = 0.36 * k; ctx.lineWidth = 80; ctx.stroke(); ctx.globalAlpha = 0.5 * k; ctx.lineWidth = 34; ctx.stroke();
    trace(P.map(([x, y]) => [x + 16 * Math.sin(y * 0.021 + ph * 2), y]), false); ctx.globalAlpha = 0.45 * k; ctx.lineWidth = 16; ctx.stroke();
    ctx.restore();
    const G = []; for (let j = 0; j < 130; j++) { const fr = mod(R.f() + F * R.r(0.07, 0.19), 1); G.push([xr + dir * (20 + fr * 250), R.r(0, H) - fr * R.n(30), R.r(2, 4.5), (1 - fr) * k * 0.9]); }
    sndSpecks(G);
  }
}
// LOOSE GRAINS. Drifting in a box: o.box [x0, y0, x1, y1], vx, vy (px/s). Trickling along a line: o.path (a polyline,
// e.g. down a dune's slope), speed, spread.  Common: n (40), key, al
function sndGrains(o = {}) {
  const n = o.n ?? 40, R = RNG('sndgrains', o.key ?? 'grains'), G = [];
  if (o.path) {
    for (let j = 0; j < n; j++) { const fr = mod(TT * R.r(0.25, 0.6) * (o.speed ?? 1) + R.f(), 1), off = R.n(o.spread ?? 7), [px, py] = pointAt(o.path, fr); G.push([px + off, py + off * 0.4 - Math.abs(Math.sin(fr * 38 + j)) * 3, R.r(2, 4.2), Math.sin(Math.PI * fr) * (o.al ?? 0.9)]); }
  } else {
    const [x0, y0, x1, y1] = o.box ?? [0, 0, W, H], vx = o.vx ?? 16, vy = o.vy ?? 7;
    for (let j = 0; j < n; j++) { const per = R.r(2, 5), fr = mod(TT / per + R.f(), 1), k = R.r(0.4, 1.6); G.push([R.r(x0, x1) + vx * k * fr * per, R.r(y0, y1) + vy * k * fr * per, R.r(2, 4), Math.sin(Math.PI * fr) * (o.al ?? 0.6)]); }
  }
  sndSpecks(G);
}

// ---------------------------------------------------------------------
//  ready props (world coords; every one is re-drawn each frame, so it can be poured on with o.p and it can sway)
// ---------------------------------------------------------------------
// a dune line across the frame at height y. sndDuneY gives the ridge height at x (walk things along it).
//   o: amp (40), len (wavelength, 800), key, d, p / from (poured under a stream at x = from), bottom (H + 60),
//      ripples (3 wind ripples wiped below the ridge), ripple (0..1: how far the finger has drawn them)
function sndDuneY(x, y, o = {}) {
  const R = RNG('snddune', o.key ?? 'dune'), amp = o.amp ?? 40, k = TAU / (o.len ?? 800), p1 = R.r(0, TAU), p2 = R.r(0, TAU);
  return y + amp * (0.65 * Math.sin(x * k + p1) + 0.35 * Math.sin(x * k * 2.3 + p2));
}
function sndDunePts(y, o = {}) {
  const P = [], bot = o.bottom ?? H + 60; for (let x = -80; x <= W + 80; x += 30) P.push([x, sndDuneY(x, y, o)]);
  P.push([W + 80, bot], [-80, bot]); return P;
}
function sndDune(y, o = {}) {
  const P = sndDunePts(y, o), key = o.key ?? 'dune', p = o.p ?? 1;
  sndPile(P, { d: o.d ?? 1, p, from: o.from, slope: o.slope ?? 0.5, soft: o.soft ?? 14, rough: 2.5, key });
  const n = o.ripples ?? 3, rp = clamp(o.ripple ?? (p >= 1 ? 1 : 0)), R = RNG('sndrip', key);
  for (let k = 0; k < n && rp > 0; k++) {
    const xa = R.r(-40, W * 0.45), xb = xa + R.r(360, 640), off = 54 + k * 62, Q = [];
    for (let x = xa; x <= xb; x += 28) Q.push([x, sndDuneY(x + off * 0.8, y, o) + off + 7 * Math.sin(x * 0.02 + k)]);
    sndWipe(Q, o.rw ?? 9, seg(rp, k / (n + 1), (k + 2) / (n + 1)), { depth: o.rdepth ?? 0.34, ridge: 0 });
  }
  return P;
}
// a palm: a leaning trunk that rises as a thin heap, fronds dribbled out one by one, leaflets, ring marks, two coconuts.
//   (x, base) = the foot of the trunk; s = scale (1 = 430 px tall).  o: p (reveal), lean, sway (1), key
function sndPalm(x, base, s = 1, o = {}) {
  const p = clamp(o.p ?? 1); if (p <= 0) return;
  const key = o.key ?? 'palm', h = 430 * s, lean = o.lean ?? 0.16, sw = (o.sway ?? 1) * Math.sin(TT * 1.6), C = [], Lf = [], Rt = [], wAt = (t) => lerp(15, 8, t) * s;
  for (let i = 0; i <= 10; i++) { const t = i / 10; C.push([x + (lean * h + sw * 5) * t * t, base + 20 - (h + 20) * t]); }
  C.forEach(([cx, cy], i) => { const w = wAt(i / 10); Lf.push([cx - w, cy]); Rt.push([cx + w, cy]); });
  const pt = seg(p, 0, 0.42);
  sndPile([...Lf, ...Rt.reverse()], { key: key + 't', p: pt, slope: 0, soft: 6 * s, rough: 1.5, base: base + 20 });
  if (pt >= 1) for (let k = 1; k <= 6; k++) { const [cx, cy] = pointAt(C, k / 7), w = wAt(k / 7) * 0.8; sndWipe([[cx - w, cy + 3 * s], [cx + w, cy - 3 * s]], 3.4 * s, 1, { depth: 0.5, ridge: 0 }); }
  const T = C[10];
  [-3.02, -2.5, -2.0, -1.45, -0.95, -0.45, 0.05].forEach((a0, i) => {
    const q = seg(p, 0.38 + i * 0.05, 0.68 + i * 0.05); if (q <= 0) return;
    const a = a0 + sw * 0.03 * (1 + (i % 2)), Ln = (i === 3 ? 165 : 215) * s, P = [];
    for (let j = 0; j <= 8; j++) { const t = j / 8; P.push([T[0] + Math.cos(a) * Ln * t, T[1] + Math.sin(a) * Ln * t + 0.62 * Ln * t * t * (0.6 + 0.4 * Math.abs(Math.cos(a)))]); }
    sndDribble(P, 9 * s, q, { soft: 4 * s });
    ctx.save(); ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.beginPath();
    for (let j = 1; j <= 8; j++) { const t = j / 8; if (t > q + 0.01) break; const [px, py] = P[j], ln = 34 * s * (1 - 0.45 * t); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 9 * s + sw * 2, py + ln); ctx.moveTo((px + P[j - 1][0]) / 2, (py + P[j - 1][1]) / 2); ctx.lineTo((px + P[j - 1][0]) / 2 + Math.cos(a) * 7 * s, (py + P[j - 1][1]) / 2 + ln * 0.9); }
    sndSkirt(3 * s, 1, 4.5 * s); ctx.globalAlpha = 1; ctx.lineWidth = 4.5 * s; ctx.stroke(); ctx.restore();
  });
  if (p > 0.6) { const k = EZ.back(seg(p, 0.6, 0.8)); sndPile(ellipsePts(T[0] - 12 * s, T[1] + 18 * s, 11 * s * k, 11 * s * k, 0, 14), { raw: true, soft: 3 * s }); sndPile(ellipsePts(T[0] + 11 * s, T[1] + 22 * s, 10 * s * k, 10 * s * k, 0, 14), { raw: true, soft: 3 * s }); }
}
// a tent: a peaked silhouette with a pole, a pennant, two guy ropes and a door that can be rubbed open so the lamp
// inside shows.  (x, base) = the middle of its foot; s = scale (1 = 300 wide, 210 tall).  o: p, lit (0..1), key
function sndTent(x, base, s = 1, o = {}) {
  const p = clamp(o.p ?? 1), key = o.key ?? 'tent', lit = clamp(o.lit ?? 0), hw = 150 * s, hh = 210 * s, P = [];
  if (p <= 0) return;
  for (let i = 0; i <= 10; i++) { const t = i / 10; P.push([x - hw * (1 - t), base + 14 - (hh + 14) * t ** 1.3]); }
  for (let i = 9; i >= 0; i--) { const t = i / 10; P.push([x + hw * (1 - t), base + 14 - (hh + 14) * t ** 1.3]); }
  sndPile(P, { key, p, from: x, slope: 0.3, soft: 8 * s, rough: 2, base: base + 14 });
  if (p < 1) return;
  sndDribble([[x, base - hh + 8], [x, base - hh - 40 * s]], 5 * s, 1, { soft: 2 * s });
  const fl = 6 * s * Math.sin(TT * 5);
  sndPile([[x, base - hh - 40 * s], [x + 40 * s, base - hh - 30 * s + fl], [x, base - hh - 18 * s]], { raw: true, soft: 2.5 * s });
  for (const sg of [-1, 1]) sndDribble([[x + sg * hw * 0.5, base - hh * 0.4], [x + sg * (hw + 50 * s), base + 8]], 3 * s, 1, { soft: 2 * s });
  if (lit > 0) { const dh = 118 * s * EZ.o3(lit); sndClear([[x - 30 * s, base + 4], [x - 6 * s, base + 4 - dh], [x + 6 * s, base + 4 - dh], [x + 30 * s, base + 4]], { key: key + 'door', soft: 4 * s, ridge: 0.3 }); }
}
// a distant mosque: a hall, an onion dome with a finial, two minarets; the door and windows are rubbed clean one by
// one as o.lit goes 0..3.  (x, base) = the middle of its foot; s = scale (1 = 370 wide, 300 tall).  o: d, p, lit, key
function sndMosque(x, base, s = 1, o = {}) {
  const p = clamp(o.p ?? 1), key = o.key ?? 'mosque', lit = o.lit ?? 0; if (p <= 0) return;
  const po = (k) => ({ d: o.d ?? 1, p, from: x, slope: 0.2, soft: 6 * s, rough: 1.2, base: base + 12, key: key + k }), top = base - 96 * s, D = [];
  sndPile([[x - 120 * s, base + 12], [x - 120 * s, top], [x + 120 * s, top], [x + 120 * s, base + 12]], po('h'));
  for (let i = 0; i <= 24; i++) { const a = Math.PI - i / 24 * Math.PI, sy = Math.sin(a), r = 78 * s * (1 + 0.1 * Math.sin(2 * a) ** 2); D.push([x + Math.cos(a) * r, top + 6 - 84 * s * sy - (sy > 0.9 ? (sy - 0.9) / 0.1 * 30 * s : 0)]); }
  sndPile(D, po('d'));
  for (const sg of [-1, 1]) {
    const mx = x + sg * 160 * s;
    sndPile([[mx - 13 * s, base + 12], [mx - 13 * s, base - 250 * s], [mx, base - 300 * s], [mx + 13 * s, base - 250 * s], [mx + 13 * s, base + 12]], po('m' + sg));
    sndPile([[mx - 23 * s, base - 168 * s], [mx - 23 * s, base - 182 * s], [mx + 23 * s, base - 182 * s], [mx + 23 * s, base - 168 * s]], po('b' + sg));
  }
  if (p < 1) return;
  sndDribble([[x, top - 100 * s], [x, top - 138 * s]], 4 * s, 1, { soft: 2 * s, d: o.d ?? 1 });
  const arch = (cx, w, h) => [[cx - w, base + 2], [cx - w, base + 2 - h], ...arcPts(cx, base + 2 - h, w, Math.PI, TAU, 8), [cx + w, base + 2]];
  [[0, 19, 52], [-70, 12, 40], [70, 12, 40]].forEach(([dx, w, h], i) => { const k = EZ.back(clamp(lit - i)); if (k > 0.05) sndClear(arch(x + dx * s, w * s * k, h * s * k), { key: key + 'w' + i, soft: 3 * s, ridge: 0.3 }); });
}
// a crescent: a disc poked clean, then a smaller disc of sand sprinkled back over one side.
//   o: p, turn (which way the horns open, radians; 0 = to the right), veil (the thickness put back, 0.5)
function sndCrescent(x, y, r, o = {}) {
  const p = EZ.back(clamp(o.p ?? 1)), turn = o.turn ?? -0.5; if (p <= 0.02) return;
  sndPoke(x, y, r * p, { ridge: o.ridge ?? 0.5 });
  sndFillSoft(ellipsePts(x + Math.cos(turn) * r * 0.42 * p, y + Math.sin(turn) * r * 0.42 * p, r * 0.84 * p, r * 0.84 * p, 0, 20), o.veil ?? 0.5, Math.max(1.5, r * 0.1));
}
// stars poked out one by one: list of [x, y, r, t] (t = the absolute time its dot is pressed); they twinkle afterwards
function sndStars(list, o = {}) {
  list.forEach(([x, y, r, t], i) => { const k = TT < t ? 0 : EZ.back(clamp((TT - t) / 0.2)); if (k > 0) sndPoke(x, y, r * k * (1 + (o.twinkle ?? 0.14) * Math.sin(TT * 5.2 + i * 1.7)), { ridge: o.ridge ?? 0.55 }); });
}
// a small bird, wings as two dribbled strokes. flap -1 (down) .. 1 (up).  o: face (-1 = flying left), wipe (true = a
// bright V flicked into a veil with a fingertip instead of a dark one)
function sndBird(x, y, s = 1, flap = 0, o = {}) {
  const face = o.face ?? -1, wing = (sg) => [[x, y], [x + sg * 18 * s, y - (14 * flap + 5) * s], [x + sg * 42 * s, y - (24 * flap - 5) * s]];
  if (o.wipe) { sndWipe(wing(-1), 7 * s, 1, { ridge: 0.4 }); sndWipe(wing(1), 7 * s, 1, { ridge: 0.4 }); return; }
  sndDribble(wing(-1), 7 * s, 1, { soft: 3 * s }); sndDribble(wing(1), 7 * s, 1, { soft: 3 * s });
  sndPile(ellipsePts(x, y + 2 * s, 14 * s, 7 * s, 0, 14), { raw: true, soft: 3 * s });
  sndPile(ellipsePts(x + face * 13 * s, y - 1 * s, 6 * s, 5 * s, 0, 10), { raw: true, soft: 2 * s });
}

// ---------------------------------------------------------------------
//  the hero: Unta, a small camel — a compact clump of thick sand with one fingertip-clean bright eye. It never slides:
//  its legs step (o.step = the walk phase in radians), it bobs, and it leaves a few kicked grains behind.
//   (x, y) = the ground under its middle; s = scale (1 = about 170 wide, 155 tall); faces right (o.face = -1: left)
//   o: step (walk phase), sit (0..1: folds its legs), look (-1..1: head down / up), sleep (0..1: head rests, eye shut),
//      blink (true = eye shut; default: a blink every 2.6 s), breath (px), trail (false = no kicked grains), key
// ---------------------------------------------------------------------
function sndCamel(x, y, s = 1, o = {}) {
  const face = o.face ?? 1, walk = o.step != null ? 1 : 0, ph = o.step ?? 0, sit = clamp(o.sit ?? 0), look = o.look ?? 0, sleep = clamp(o.sleep ?? 0), soft = o.soft ?? 4;
  const by = 36 * sit - walk * (1 - sit) * Math.abs(Math.sin(ph)) * 3 - (o.breath ?? 0);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineCap = ctx.lineJoin = 'round';
  const el = (cx, cy, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU); sndSkirt(soft); ctx.globalAlpha = 1; ctx.fill(); };
  const ln = (P, w) => { ctx.beginPath(); P.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); sndSkirt(soft, 1, w); ctx.globalAlpha = 1; ctx.lineWidth = w; ctx.stroke(); };
  // legs: back pair, front pair; each foot swings under its hip and lifts on the way forward
  [[-33, 0, 0], [-17, Math.PI, 0], [22, Math.PI * 0.5, 1], [38, Math.PI * 1.5, 1]].forEach(([hx, off, front]) => {
    const th = 0.42 * walk * (1 - sit) * Math.sin(ph + off), lift = walk * (1 - sit) * Math.max(0, Math.cos(ph + off)) * 8, hy = -66 + by;
    const fx = hx + 64 * Math.sin(th) * (1 - sit) + (front ? 26 : -18) * sit, fy = -lift - 3 * sit;
    ln([[hx, hy], [(hx + fx) / 2 + (front ? 3 : -3) * (1 - sit), (hy + fy) / 2], [fx, fy]], 8.5);
  });
  el(0, -84 + by, 50, 27); el(-6, -112 + by, 24, 22);                                              // body, hump
  ln([[-47, -92 + by], [-60, -78 + by], [-57, -60 + by]], 5);                                      // tail
  const hx = 78 + look * 3 + sleep * 8, hy = -140 + by - look * 12 + sleep * 44, rot = -look * 0.22 + sleep * 0.3;
  ln([[36, -86 + by], [55, -106 + by + sleep * 18], [hx - 16, hy + 7]], 20);                       // neck
  el(hx, hy, 20, 11.5, rot); el(hx + 15 * Math.cos(rot), hy + 15 * Math.sin(rot) + 2, 9.5, 8.5);   // head, muzzle
  el(hx - 13, hy - 11, 4.2, 7.5, -0.45);                                                           // ear
  if (!(o.blink ?? (mod(TT, 2.6) < 0.1)) && sleep < 0.5) { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(hx + 3, hy - 3, 3.9, 0, TAU); ctx.fill(); }
  else { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(hx + 3, hy - 4.5, 4, 0.5, Math.PI - 0.5); ctx.stroke(); }   // a shut eye: a small wiped arc
  ctx.restore();
  if (SND_T) SPARK_AT = [SND_T.a * x + SND_T.e, SND_T.d * (y - 84 * s) + SND_T.f];
  if (walk && sit < 0.5 && o.trail !== false) {
    const R = RNG('sndtrail', o.key ?? 'unta'), G = [];
    for (let j = 0; j < 16; j++) { const age = mod(ph / TAU * 2 + R.f(), 1); G.push([x - face * (18 + age * 80 + R.r(0, 30)) * s, y - 4 - age * (1 - age) * R.r(20, 110) * s, R.r(2, 4), (1 - age) * 0.9]); }
    sndSpecks(G);
  }
}
// the hero's rough outline for a hero-to-hero bridge
function sndCamelPts(x, y, r) { return ellipsePts(x, y, r * 1.05, r * 0.9, 0, 40); }

// ---------------------------------------------------------------------
//  type: finger-written in the sand. The letters are wiped out of a smoothed band of sand, left to right, with a
//  darker ridge along both sides of every stroke. Text only ever lives on a band (sndCaption, sndTag).
// ---------------------------------------------------------------------
const sndFont = (size) => `700 ${size}px ${SND_FONT}`;
function sndTextW(str, size) { ctx.save(); ctx.font = sndFont(size); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// how much of a band is left at a bridge: [k 0..1, leaving?]. It is swept off as a bridge starts and smoothed back on after
function sndBridgeK() {
  if (typeof BRIDGES === 'undefined') return [1, false];
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return [1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)), true];
    if (TT >= r.tc && TT < r.tc + d + 0.3) return [EZ.o2(seg(TT, r.tc + d - 0.1, r.tc + d + 0.3)), false];
  }
  return [1, false];
}
// one band with words on it (screen coords). toks = [{ s, hi, x }], xa..xb = the part of the band that exists, wx = how
// far the finger has written
function sndBand(bx, by, bw, bh, xa, xb, wx, toks, base, size, d, key) {
  if (xb - xa < 3) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  // the glass under the band is clean, so nothing of the picture shows through it and the letters glow
  ctx.beginPath(); ctx.rect(xa, by - 20, xb - xa, bh + 40); ctx.clip();
  ctx.fillStyle = sndLift(SND_TINT, 0.6); ctx.beginPath(); ctx.roundRect(bx + 12, by + 12, bw - 24, bh - 24, (bh - 24) * 0.42); ctx.fill(); ctx.restore();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  sndPass(() => {
    const R = RNG('sndband', key);
    ctx.save(); ctx.beginPath(); ctx.rect(xa, by - 50, xb - xa, bh + 100); ctx.clip();
    sndFillSoft(resample(rrectPts(bx, by, bw, bh, bh * 0.42, 8), true, 12), d, 8);
    ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';   // the palm's smoothing marks
    for (let i = 0; i < 4; i++) { const y = by + bh * R.r(0.15, 0.85), x0 = bx + bw * R.r(0, 0.4); ctx.globalAlpha = R.r(0.06, 0.13); ctx.lineWidth = R.r(4, 9); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + bw * R.r(0.3, 0.6), y + R.n(3)); ctx.stroke(); }
    ctx.beginPath(); ctx.rect(xa, by - 50, Math.min(xb, wx) - xa, bh + 100); ctx.clip();
    ctx.font = sndFont(size); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.fillStyle = ctx.strokeStyle = '#000';
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6; ctx.lineWidth = size * 0.2;
    for (const t of toks) ctx.strokeText(t.s, t.x, base);                                           // the ridges beside every stroke
    ctx.globalCompositeOperation = 'destination-out';
    for (const t of toks) {
      ctx.globalAlpha = t.hi ? 1 : 0.9; ctx.lineWidth = size * (t.hi ? 0.09 : 0.03); ctx.strokeText(t.s, t.x, base); ctx.fillText(t.s, t.x, base);
      if (t.hi && t.ul !== false) { ctx.globalAlpha = 1; ctx.lineWidth = size * 0.085; ctx.beginPath(); ctx.moveTo(t.x + 2, base + size * 0.27); ctx.quadraticCurveTo(t.x + t.w / 2, base + size * 0.33, t.x + t.w - 2, base + size * 0.25); ctx.stroke(); }
    }
    ctx.restore();
    const edge = xb < bx + bw - 2 ? xb : xa > bx + 2 ? xa : null;   // the heap riding the edge while the band is smoothed on / swept off
    if (edge != null) { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(edge, by + 10); ctx.lineTo(edge, by + bh - 10); ctx.globalAlpha = 0.35; ctx.lineWidth = 34; ctx.stroke(); ctx.globalAlpha = 0.85; ctx.lineWidth = 16; ctx.stroke(); }
  }, { x0: bx - 50, y0: by - 50, x1: bx + bw + 50, y1: by + bh + 50 });
  ctx.restore();
}
//   'words *highlight* words' — o: y (the band's centre, 1392), x (CX), size (62), at (seconds after the era starts, 0.5), d (the band's thickness, 0.78)
function sndCaptionNow(str, o = {}) {
  const size = o.size ?? 62, cx = o.x ?? CX, cy = o.y ?? 1392, at = E0 + (o.at ?? 0.5), [bk, out] = sndBridgeK();
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  let tw = 0; toks.forEach((t, i) => { t.w = sndTextW(t.s, size); t.gap = i === 0 ? 0 : /^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.3; tw += t.w + t.gap; });
  const bw = tw + size * 1.5, bh = size * 1.95, bx = cx - bw / 2, by = cy - bh / 2;
  let xx = cx - tw / 2; toks.forEach((t) => { xx += t.gap; t.x = xx; xx += t.w; });
  const xa = out ? bx + bw * (1 - bk) : bx, xb = out ? bx + bw : bx + bw * Math.min(EZ.o2(ev(at, 0.3)), bk);
  sndBand(bx, by, bw, bh, xa, xb, bx + size * 0.5 + (tw + size * 0.6) * ev(at + 0.22, Math.max(0.3, str.length * 0.03)), toks, cy + size * 0.33, size, o.d ?? 0.78, 'cap' + str);
}
//   a short label, top-left. o: x (the left edge, 70), y (the centre, 300), size (50), at (0.25), d
function sndTagNow(str, o = {}) {
  const size = o.size ?? 50, at = E0 + (o.at ?? 0.25), [bk, out] = sndBridgeK(), w = sndTextW(str, size), bw = w + size * 1.3, bh = size * 1.75, bx = o.x ?? 70, by = (o.y ?? 300) - bh / 2;
  const xa = out ? bx + bw * (1 - bk) : bx, xb = out ? bx + bw : bx + bw * Math.min(EZ.o2(ev(at, 0.25)), bk);
  sndBand(bx, by, bw, bh, xa, xb, bx + size * 0.4 + (w + size * 0.5) * ev(at + 0.15, 0.35), [{ s: str, hi: true, ul: false, x: bx + size * 0.65, w }], by + bh / 2 + size * 0.34, size, o.d ?? 0.8, 'tag' + str);
}
const sndCaption = (str, o = {}) => { const f = () => sndCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const sndTag = (str, o = {}) => { const f = () => sndTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
let SND_PAPERC = null;
function sndPaperFilm() {   // the even film of sand a morph happens on (developed once)
  if (SND_PAPERC) return SND_PAPERC;
  sndInit(); const c = SND_PAPERC = document.createElement('canvas'); c.width = SND_D.width; c.height = SND_D.height;
  const keep = ctx; ctx = c.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
  sndOpen(); sndLayer({ d: 0.44, key: 'paper', streaks: 16 }); sndClose(null, c); ctx = keep;
  return c;
}
const STYLE = {
  name: 'sand',
  paper: SND.paper,
  // the table in tint c (hex, or rgb() mid-morph) under an even streaky film of sand
  backdrop(c) {
    ctx.save(); screen(); sndLight(c); ctx.drawImage(sndDust(), 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(sndPaperFilm(), 0, 0, W, H); ctx.restore();
  },
  // the era seen through a patch rubbed clean in that film: a ridge of pushed sand rides its edge, grains roll along it
  window(P, key, src, o = {}) {
    ctx.save(); screen(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, k = o.phase === 'grow' ? Math.min(1, u * 4) : Math.min(1, (1 - u) * 4), wd = lerp(15, 34, k), bb = bbox(P, wd * 3.5);
    ctx.save(); screen(); sndPass(() => sndRing(P, wd), bb);
    const R = RNG('sndwin', key, F), G = [], n = P.length;
    for (let j = 0; j < 70; j++) { const [x, y] = P[R.i(0, n - 1)]; if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue; G.push([x + R.n(wd * 1.6), y + R.n(wd * 1.6), R.r(2, 4.2), R.r(0.4, 0.9)]); }
    sndSpecks(G); ctx.restore();
  },
  // the morphing shape: a patch of clean glass in the film, rubbed from one outline into the other; its light changes
  blob(P, c, key, u = 0) {
    const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, r = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2, rub = Math.sin(Math.PI * clamp(u)), wd = 15 + 9 * rub;
    ctx.save(); screen(); trace(P, true); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.1); g.addColorStop(0, sndLift(c, 0.45)); g.addColorStop(1, c); ctx.fillStyle = g; ctx.fillRect(bb.x0 - 4, bb.y0 - 4, bb.x1 - bb.x0 + 8, bb.y1 - bb.y0 + 8); ctx.restore();
    ctx.save(); screen();
    sndPass(() => {
      sndRing(P, wd);
      ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.globalAlpha = 0.07 + 0.1 * rub; ctx.lineWidth = 4;   // the rubbing finger's traces
      for (let k = 0; k < 3; k++) { const a = 0.6 + k * 1.9 + u * 5; ctx.beginPath(); ctx.arc(cx, cy, r * (0.3 + k * 0.22), a, a + 2.2); ctx.stroke(); }
    }, bbox(P, wd * 3.5));
    const R = RNG('sndblob', key, F), G = [], n = P.length;
    for (let j = 0; j < 30 + 60 * rub; j++) { const [x, y] = P[R.i(0, n - 1)]; G.push([x + R.n(wd * 2), y + R.n(wd * 2), R.r(2, 4.2), R.r(0.4, 0.9)]); }
    sndSpecks(G); ctx.restore();
  },
  hero(x, y, r, o = {}) { ctx.save(); sndPass(() => sndCamel(x - r * 0.1, y + r * 0.85, r / 88, { key: o.key, look: 0.6, blink: false })); ctx.restore(); },
  heroColor: SND.umber,
  heroPts(x, y, r) { return sndCamelPts(x, y, r); },
  // the lamp under the glass: its light breathes ±2%; the lens closes the corners a little
  post() {
    ctx.save(); screen(); ctx.imageSmoothingEnabled = true; ctx.drawImage(sndVignette(), 0, 0, W, H);
    const k = 0.02 * Math.sin(TT * 2.1); ctx.fillStyle = k > 0 ? `rgba(255,238,200,${k})` : `rgba(21,11,5,${-k})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  ones: true,
};
