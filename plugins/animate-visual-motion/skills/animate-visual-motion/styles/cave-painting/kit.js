// =====================================================================
//  styles/cave-painting/kit.js — prehistoric rock art by firelight, on top of kit/core.js.
//
//  A living limestone wall deep in a cave, painted with red ochre, yellow ochre, umber, charcoal and a little
//  white clay, seen in the pool of light of one unseen flame.
//
//  How it is drawn: a scene runs inside cavePaint(() => { ... }). The rock wall (cached, seeded: relief, stains,
//  calcite, cracks, pits) is laid down first; inside the callback `ctx` is the PIGMENT LAYER, whose alpha is the
//  pigment's THICKNESS. When the callback returns the layer is "developed" against the wall's own roughness map
//  (cached with the wall): a pixel keeps its pigment only where the thickness beats the rock's roughness there, so
//  thick paint covers all but the pits and cracks, thin paint catches only on the high grains, and a soft edge
//  turns into speckle. That one pass is what makes every mark sit ON the rock and break over it.
//
//  Marks (three kinds only): caveDaub (a finger-daubed line that runs dry along its length), caveRub (a patchy
//  rubbed fill inside any closed outline), caveSpray / caveHand (blown pigment round a clean negative shape).
//  Light: STYLE.post multiplies the frame by a warm pool that flickers on 2s and drifts (caveAim), and floats dust
//  motes and sparks in it. The wall never moves; the light does.
//  Needs from the piece head: CX (caption centre x). No fonts: the lettering is daubed stroke by stroke.
// =====================================================================
const CAVE = {
  rock: '#c3b297',      // limestone, warm grey-buff (the wall's mean tone; also STYLE.paper)
  grey: '#b3ada0',      // cooler grey limestone
  stain: '#a8754a',     // iron staining where water has run
  calcite: '#e6ddcb',   // pale calcite crust
  soot: '#5a4c40',      // dark mineral / soot patches
  red: '#a8381f',       // red ochre: the hero, the hands
  yellow: '#cc9a3a',    // yellow ochre: rubbed bodies
  umber: '#70462a',     // brown umber: rubbed bodies, second contours
  black: '#221b17',     // charcoal: contours, manes, lettering
  white: '#efe7d6',     // white clay: tusks, a few dots (rare)
  dark: '#070504',      // what the light falls to
  flame: '#ffb25a',     // sparks and lit dust
};
const CAVE_CV = {}, CAVE_MEMO = new Map(), CAVE_ROCK = {}, CAVE_WALL_DEF = {};
let CAVE_ON = null;     // inside cavePaint: { base, wall, q }
let CAVE_AIM = null;    // this frame's torch aim (caveAim; read and cleared by STYLE.post)
let CAVE_BR = null;     // this frame's bridge light (set by the STYLE hooks; read and cleared by STYLE.post)
function caveCanvas(key, w = W, h = H, read = false) { let c = CAVE_CV[key]; if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', read ? { willReadFrequently: true } : undefined); CAVE_CV[key] = c; } return c; }
function caveMemo(key, make) { if (!CAVE_MEMO.has(key)) { if (CAVE_MEMO.size > 900) CAVE_MEMO.clear(); CAVE_MEMO.set(key, make()); } return CAVE_MEMO.get(key); }
function caveRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0]; }
const caveMix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
function caveSig(P) { let h = 2166136261 >>> 0; for (const p of P) { h ^= Math.round(p[0] * 4) + 7919 * Math.round(p[1] * 4); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + P.length; }
function caveCen(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } x /= P.length; y /= P.length; let r = 0; for (const p of P) r += Math.hypot(p[0] - x, p[1] - y); return [x, y, r / P.length]; }
// corner-cutting for hand-typed outlines (open lines keep their ends)
function caveSmooth(P, closed = false, it = 2) {
  for (let k = 0; k < it; k++) {
    const Q = [], n = P.length, m = closed ? n : n - 1; if (!closed) Q.push(P[0]);
    for (let i = 0; i < m; i++) { const a = P[i], b = P[(i + 1) % n]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    if (!closed) Q.push(P[n - 1]); P = Q;
  }
  return P;
}
function cavePath(g, P, closed = true) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); if (closed) g.closePath(); }

// ---------------------------------------------------------------------
//  timing (on the motion step TT)
//    caveIn(t0, d)          0..1 progress of a mark that starts at t0 and takes d seconds: pass it as `frac`
//    caveStep(every, phase) a whole-number counter (two-state life: % 2 picks the leg pose)
//    caveAim(x, y, r)       point the torch for this frame (screen px; r = the pool's radius, default 1180)
// ---------------------------------------------------------------------
const caveIn = (t0, d = 0.5) => clamp((TT - t0) / d);
const caveStep = (every = 0.5, phase = 0) => Math.floor(TT / every + phase + 1e-6);
function caveAim(x, y, r) { CAVE_AIM = { x, y, r }; }

// ---------------------------------------------------------------------
//  the rock wall (built once per name, cached): caveRock(name) -> { cv, N, S }
//    cv  the wall as a picture: albedo (buff / grey limestone, vertical iron stains, calcite crust, dark patches,
//        grain) times its relief shading (large swells, small bumps, cracks, pits)
//    N   Uint8Array W*H: the roughness a pigment's thickness has to beat at each pixel (hollows, pits and cracks
//        are high; the tops of grains are low)
//    S   Uint8Array W*H: the relief shading, so pigment is shaded like the rock it lies on
//  caveDefWall(name, { seed, bulges: [[x, y, rx, ry, amt]] }) declares a wall before it is first used: a bulge is
//  a swelling of the rock to hang an animal's hump or belly on.
// ---------------------------------------------------------------------
function caveDefWall(name, spec = {}) { CAVE_WALL_DEF[name] = { seed: name, bulges: [], ...spec }; delete CAVE_ROCK[name]; }
function caveField(key, w, h, cx, cy = cx) {   // smooth value noise, w x h, cell cx x cy px, 0..1
  const R = RNG('cavefield', key), gw = Math.ceil(w / cx) + 2, gh = Math.ceil(h / cy) + 2, G = new Float32Array(gw * gh), out = new Float32Array(w * h);
  for (let i = 0; i < G.length; i++) G[i] = R.f();
  for (let y = 0; y < h; y++) {
    const v = y / cy, j = v | 0, f0 = v - j, fv = f0 * f0 * (3 - 2 * f0), r0 = j * gw, r1 = r0 + gw;
    for (let x = 0; x < w; x++) { const u = x / cx, i = u | 0, e0 = u - i, fu = e0 * e0 * (3 - 2 * e0), a = G[r0 + i], b = G[r0 + i + 1], c = G[r1 + i], d = G[r1 + i + 1]; out[y * w + x] = a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv; }
  }
  return out;
}
function caveCracks(seed) {   // a few branching cracks and a scatter of pits, as [x, y, w] polylines and [x, y, rx, ry, rot] pits
  const R = RNG('cavecrack', seed), lines = [], pits = [];
  const walk = (x, y, a, n, w, depth) => {
    const P = [[x, y, w]];
    for (let i = 0; i < n; i++) {
      a += R.n(0.55) + (R.f() < 0.16 ? R.n(1.1) : 0); const l = R.r(7, 20); x += Math.cos(a) * l; y += Math.sin(a) * l;
      const ww = w * (1 - 0.8 * i / n) * R.r(0.35, 1.4); P.push([x, y, ww]);
      if (depth < 1 && R.f() < 0.035) walk(x, y, a + (R.f() < 0.5 ? 1 : -1) * R.r(0.5, 1.2), Math.round(n * R.r(0.25, 0.5)), ww * 0.8, depth + 1);
    }
    lines.push(P);
  };
  for (let i = 0; i < 5; i++) walk(R.r(-40, W + 40), R.r(-40, H * 0.9), R.r(0.9, 2.2) + (R.f() < 0.3 ? R.n(1.2) : 0), R.i(40, 80), R.r(2.4, 4.6), 0);
  for (let i = 0; i < 620; i++) { const big = R.f() < 0.1, s = big ? R.r(4, 9) : R.r(1.2, 3.6); pits.push([R.r(0, W), R.r(0, H), s, s * R.r(0.5, 1), R.r(0, Math.PI), R.r(0.45, 1)]); }
  return { lines, pits };
}
function caveCrackDraw(g, K, dx, dy, color, wk) {
  g.save(); g.translate(dx, dy); g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const P of K.lines) for (let i = 1; i < P.length; i++) { g.lineWidth = Math.max(0.8, P[i][2] * wk); g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0], P[i][1]); g.stroke(); }
  for (const p of K.pits) { g.globalAlpha = p[5]; g.beginPath(); g.ellipse(p[0], p[1], p[2] * wk, p[3] * wk, p[4], 0, TAU); g.fill(); }
  g.restore();
}
function caveRock(name = 'wall') {
  if (CAVE_ROCK[name]) return CAVE_ROCK[name];
  const def = CAVE_WALL_DEF[name] || { seed: name, bulges: [] }, seed = def.seed ?? name, hw = Math.ceil(W / 2), hh = Math.ceil(H / 2), n = hw * hh;
  const f = (k, cx, cy) => caveField(seed + ':' + k, hw, hh, cx, cy);
  const n1 = f('a', 190), n2 = f('b', 74), n3 = f('c', 28), n4 = f('d', 10), n5 = f('e', 4.2), tone = f('tone', 240), stn = f('stain', 22, 210), cal = f('cal', 80, 150), cal2 = f('cal2', 12, 46), sot = f('soot', 170), fine = f('fine', 1.6);
  const hs = new Float32Array(n), hf = new Float32Array(n);   // the smooth swells, the fine bumps
  for (let i = 0; i < n; i++) { hs[i] = 13 * n1[i] + 6 * n2[i] + 2.5 * n3[i]; hf[i] = 0.8 * n4[i] + 0.2 * n5[i]; }   // each octave weighted so its slopes shade about equally
  { const R = RNG('caveledge', seed);   // bedding ledges: a few wavy near-horizontal steps in the rock
    for (let j = 0; j < 5; j++) { const y0 = R.r(0.08, 0.95) * hh, amp = R.r(0.7, 1.5) * (R.f() < 0.5 ? -1 : 1), f1 = R.r(90, 190), p1 = R.r(0, TAU), tilt = R.n(0.12), x0 = R.r(0, hw * 0.4), x1 = R.r(hw * 0.6, hw);
      for (let x = 0; x < hw; x++) { const fade = smooth(x0 - 80, x0, x) * (1 - smooth(x1, x1 + 80, x)); if (fade <= 0) continue; const yc = y0 + (x - hw / 2) * tilt + 22 * Math.sin(x / f1 + p1) + 46 * (n2[Math.min(hh - 1, Math.max(0, Math.round(y0))) * hw + x] - 0.5); for (let y = Math.max(0, Math.floor(yc - 9)); y < hh; y++) hs[y * hw + x] += amp * fade * smooth(-7, 7, y - yc); } } }
  for (const [bx, by, rx, ry, amt = 0.5] of def.bulges || []) {
    const x0 = Math.max(0, Math.floor((bx - rx * 2) / 2)), x1 = Math.min(hw - 1, Math.ceil((bx + rx * 2) / 2)), y0 = Math.max(0, Math.floor((by - ry * 2) / 2)), y1 = Math.min(hh - 1, Math.ceil((by + ry * 2) / 2));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = (x * 2 - bx) / rx, dy = (y * 2 - by) / ry; hs[y * hw + x] += 16 * amt * Math.exp(-(dx * dx + dy * dy) * 1.5); }
  }
  const rock = caveRGB(CAVE.rock), grey = caveRGB(CAVE.grey), stain = caveRGB(CAVE.stain), calc = caveRGB(CAVE.calcite), soot = caveRGB(CAVE.soot);
  const a = new ImageData(hw, hh), b = new ImageData(hw, hh), A = a.data, Bd = b.data, lx = -0.6, ly = -0.8;
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
    const i = y * hw + x, xm = x > 0 ? i - 1 : i, xp = x < hw - 1 ? i + 1 : i, ym = y > 0 ? i - hw : i, yp = y < hh - 1 ? i + hw : i;
    const lit = -((hs[xp] - hs[xm] + hf[xp] - hf[xm]) * lx + (hs[yp] - hs[ym] + hf[yp] - hf[ym]) * ly);
    const ao = 0.5 * n2[i] + 0.35 * n3[i] + 0.15 * n4[i] - 0.5;
    const sh = clamp(1 + lit * 1.15 + ao * 0.3, 0.45, 1.3);
    let c = caveMix(rock, grey, smooth(0.4, 0.8, tone[i]) * 0.6);
    c = caveMix(c, stain, smooth(0.55, 0.86, stn[i] * 0.72 + n2[i] * 0.28) * 0.62);
    c = caveMix(c, soot, smooth(0.6, 0.9, sot[i] * 0.72 + n3[i] * 0.28) * 0.5);
    const ca = smooth(0.58, 0.72, cal[i] * 0.68 + cal2[i] * 0.2 + n4[i] * 0.12);
    c = caveMix(c, calc, ca * 0.8);
    const m = 0.92 + 0.16 * n2[i] + 0.05 * (n5[i] - 0.5);
    A[i * 4] = clamp(c[0] * m, 0, 255); A[i * 4 + 1] = clamp(c[1] * m, 0, 255); A[i * 4 + 2] = clamp(c[2] * m, 0, 255); A[i * 4 + 3] = 255;
    const rough = 0.46 * n5[i] + 0.34 * n4[i] + 0.2 * n3[i];
    Bd[i * 4] = sh / 1.3 * 255; Bd[i * 4 + 1] = clamp(0.5 - (rough - 0.5) * 1.7) * 255; Bd[i * 4 + 2] = fine[i] * 255; Bd[i * 4 + 3] = 255;
  }
  const up = (im, key) => { const t = caveCanvas('cave-half', hw, hh), tg = t.getContext('2d'); tg.putImageData(im, 0, 0); const c = caveCanvas(key, W, H, true), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(t, 0, 0, W, H); return g; };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cg = cv.getContext('2d', { willReadFrequently: true });
  cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high'; { const t = caveCanvas('cave-half', hw, hh); t.getContext('2d').putImageData(a, 0, 0); cg.drawImage(t, 0, 0, W, H); }
  const aux = up(b, 'cave-aux').getImageData(0, 0, W, H).data;
  const K = caveCracks(seed), kc = caveCanvas('cave-crk', W, H, true), kg = kc.getContext('2d'); kg.clearRect(0, 0, W, H); caveCrackDraw(kg, K, 0, 0, '#000', 1);
  const crk = kg.getImageData(0, 0, W, H).data, img = cg.getImageData(0, 0, W, H), D = img.data, N = new Uint8Array(W * H), S = new Uint8Array(W * H), R = RNG('cavegrain', seed);
  for (let k = 0, i = 0; k < W * H; k++, i += 4) {
    const r1 = R.f(), r2 = R.f(), cr = crk[i + 3] / 255, sh = aux[i] / 255 * 1.3 * (1 - 0.68 * cr), g = (r1 - 0.5) * 20 + (aux[i + 2] - 128) * 0.09;
    S[k] = sh / 1.3 * 255;
    D[i] = (D[i] + g) * sh; D[i + 1] = (D[i + 1] + g) * sh; D[i + 2] = (D[i + 2] + g) * sh;
    const hol = aux[i + 1] / 255; N[k] = cr > 0.3 ? 255 : 255 * clamp(0.02 + 0.44 * hol + 0.2 * aux[i + 2] / 255 + 0.22 * r2 + 2.2 * Math.max(0, hol - 0.74));
  }
  cg.putImageData(img, 0, 0);
  caveCrackDraw(cg, K, 1.6, 2.2, 'rgba(255,238,210,0.2)', 0.5);   // the lit lip of every crack and pit
  return (CAVE_ROCK[name] = { cv, N, S });
}
const caveWallOf = (era) => (typeof CAVE_WALLS !== 'undefined' && CAVE_WALLS[era] ? CAVE_WALLS[era] : 'wall');

// ---------------------------------------------------------------------
//  cavePaint(fn, { wall, over, box }) — run a scene on the pigment layer and develop it onto the wall.
//    wall: the wall's name ('wall'); over: true = paint over what is already on ctx (captions, hooks) without
//    laying the wall again; box [x0, y0, x1, y1]: develop only this screen box (cheaper for small passes).
//  Inside fn, `ctx` is the pigment layer: use the marks below, or draw anything with a pigment colour and
//  globalAlpha = thickness (1 = thick paint, 0.5 = a dry rub, 0.25 = a ghost).
// ---------------------------------------------------------------------
function cavePaint(fn, o = {}) {
  const base = ctx, wall = caveRock(o.wall ?? 'wall'), m = base.getTransform();
  if (!o.over) { base.save(); base.setTransform(1, 0, 0, 1, 0, 0); base.globalAlpha = 1; base.globalCompositeOperation = 'source-over'; base.drawImage(wall.cv, 0, 0); base.restore(); }
  const cv = caveCanvas('cave-pig', W, H, true), g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W, H);
  g.save(); g.setTransform(m);
  const prev = CAVE_ON, on = { base, wall, q: [] }; CAVE_ON = on; ctx = g;
  try { fn(); } finally { ctx = base; g.restore(); CAVE_ON = prev; }
  const bx = o.box ? [Math.max(0, Math.floor(o.box[0])), Math.max(0, Math.floor(o.box[1])), Math.min(W, Math.ceil(o.box[2])), Math.min(H, Math.ceil(o.box[3]))] : [0, 0, W, H];
  const w = bx[2] - bx[0], h = bx[3] - bx[1];
  if (w > 0 && h > 0) {
    const im = g.getImageData(bx[0], bx[1], w, h), d = im.data, N = wall.N, S = wall.S;
    for (let y = 0; y < h; y++) {
      let i = y * w * 4, k = (bx[1] + y) * W + bx[0];
      for (let x = 0; x < w; x++, i += 4, k++) {
        const al = d[i + 3]; if (!al) continue;
        const nn = N[k]; if (al <= nn) { d[i + 3] = 0; continue; }
        const v = (al - nn) * 5, s = S[k];
        d[i + 3] = v > 236 ? 236 : v; d[i] = d[i] * s * 333 >> 16; d[i + 1] = d[i + 1] * s * 333 >> 16; d[i + 2] = d[i + 2] * s * 333 >> 16;
      }
    }
    g.putImageData(im, bx[0], bx[1]);
    base.save(); base.setTransform(1, 0, 0, 1, 0, 0); base.globalAlpha = 1; base.globalCompositeOperation = 'source-over'; base.drawImage(cv, bx[0], bx[1], w, h, bx[0], bx[1], w, h); base.restore();
  }
  on.q.forEach((q) => q());   // things that are light, not pigment (a hand's shadow), drawn over the developed paint
}
// one mark, drawn on a scratch canvas (so that drying it never eats the paint under it) and laid on the pigment layer
function caveMark(bb, draw) {
  const m = ctx.getTransform(), xs = [], ys = [];
  for (const [x, y] of [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x1, bb.y1], [bb.x0, bb.y1]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
  const X0 = clamp(Math.floor(Math.min(...xs)) - 2, 0, W), Y0 = clamp(Math.floor(Math.min(...ys)) - 2, 0, H), X1 = clamp(Math.ceil(Math.max(...xs)) + 2, 0, W), Y1 = clamp(Math.ceil(Math.max(...ys)) + 2, 0, H), w = X1 - X0, h = Y1 - Y0;
  if (w <= 0 || h <= 0) return;
  const sc = caveCanvas('cave-scratch'), g = sc.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(X0, Y0, w, h);
  g.save(); g.beginPath(); g.rect(X0, Y0, w, h); g.clip(); g.setTransform(m); draw(g); g.restore();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(sc, X0, Y0, w, h, X0, Y0, w, h); ctx.restore();
}
function caveSoft() {   // a soft round dab (alpha (1 - t^2)^2), used to dry a line and to leave bare patches in a rub
  if (CAVE_CV['cave-soft']) return CAVE_CV['cave-soft'];
  const c = caveCanvas('cave-soft', 64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (let i = 0; i <= 8; i++) { const t = i / 8; gr.addColorStop(t, `rgba(0,0,0,${((1 - t * t) ** 2).toFixed(3)})`); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
}

// ---------------------------------------------------------------------
//  caveDaub(P, o) — THE line: a finger or pad dragged along polyline P, thick and confident, running dry.
//    o: c (pigment), w (width, 20), frac (0..1 drawn so far, along its length), key (fixes its wobble),
//       dry (0.72: how much of its load the finger has lost when it is re-dipped), dip (560: px of line one load
//       of pigment lasts; a longer line starts again fat and wet), d (thickness, 1; 0.3 = a ghost),
//       wob (hand wobble in px, w * 0.1), closed
//    The line is widest and wettest where the finger lands, thins and breaks up as the load runs out, and lifts
//    off with a slight taper. Its rim is thin pigment, so it develops ragged. Returns the finger's position.
// ---------------------------------------------------------------------
function caveDaubGeo(P, o) {
  const w = o.w ?? 20, closed = !!o.closed, key = o.key ?? 'daub', dip = o.dip ?? 560, dry = o.dry ?? 0.72, wob = o.wob ?? w * 0.1;
  return caveMemo(['daub', key, w, closed ? 1 : 0, dip, dry, wob, caveSig(P)].join('|'), () => {
    const Q = resample(P, closed, Math.max(2.5, w * 0.26)); if (closed) Q.push(Q[0]);
    const n = Q.length, R = RNG('cavedaub', key), f1 = R.r(0.011, 0.02), f2 = R.r(0.045, 0.085), p1 = R.r(0, TAU), p2 = R.r(0, TAU), p3 = R.r(0, TAU), cum = new Float64Array(n);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + dist(Q[i - 1], Q[i]);
    const tot = cum[n - 1], pts = [];
    for (let i = 0; i < n; i++) {
      const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, s = cum[i];
      const off = wob * (0.7 * Math.sin(s * f1 + p1) + 0.4 * Math.sin(s * f2 + p2)), sd = s % dip;
      const load = 1 - dry * Math.pow(Math.min(1, sd / dip), 0.7), press = 0.92 + 0.1 * Math.sin(s * f2 * 1.9 + p3);
      const head = 0.78 + 0.22 * Math.sqrt(clamp((s + 1) / (w * 0.6))), tail = closed ? 1 : 0.62 + 0.38 * Math.sqrt(clamp((tot - s) / (w * 1.2)));
      pts.push([Q[i][0] + nx / l * off, Q[i][1] + ny / l * off, w * (0.7 + 0.3 * load) * press * head * tail / 2, load * (0.9 + 0.1 * press)]);
    }
    return { pts, cum, tot };
  });
}
function caveDaub(P, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0 || P.length < 2) return null;
  if (!CAVE_ON) { let tip = null; cavePaint(() => { tip = caveDaub(P, o); }, { over: true }); return tip; }
  const G = caveDaubGeo(P, o), w = o.w ?? 20, d = o.d ?? 1, c = o.c ?? CAVE.black, L = frac * G.tot;
  let m = G.pts.length - 1; if (frac < 1) { m = 0; while (m < G.pts.length - 1 && G.cum[m + 1] <= L) m++; }
  const pts = G.pts.slice(0, m + 1);
  if (frac < 1 && m < G.pts.length - 1) { const a = G.pts[m], b = G.pts[m + 1], t = (L - G.cum[m]) / ((G.cum[m + 1] - G.cum[m]) || 1); pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), a[2], a[3]]); }
  if (pts.length < 2) pts.push([pts[0][0] + 0.5, pts[0][1], pts[0][2], pts[0][3]]);
  caveMark(bbox(pts, w * 1.5 + 4), (g) => {
    const body = (k) => {
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], r = p[2] * k; g.moveTo(p[0] + r, p[1]); g.arc(p[0], p[1], r, 0, TAU);
        if (i) { const q = pts[i - 1], rq = q[2] * k, dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; g.moveTo(q[0] + nx * rq, q[1] + ny * rq); g.lineTo(q[0] - nx * rq, q[1] - ny * rq); g.lineTo(p[0] - nx * r, p[1] - ny * r); g.lineTo(p[0] + nx * r, p[1] + ny * r); g.closePath(); }
      }
    };
    g.fillStyle = c; g.globalAlpha = 0.46 * d; body(1.45); g.fill(); g.globalAlpha = 0.8 * d; body(1); g.fill();
    g.globalCompositeOperation = 'destination-out';                                           // the finger runs dry
    const soft = caveSoft(), rr = w * 0.95; let next = 0;
    for (let i = 0; i < pts.length; i++) { const s = i <= m ? G.cum[i] : L; if (s < next && i < pts.length - 1) continue; next = s + w * 0.45; const T = pts[i][3]; if (T > 0.985) continue; g.globalAlpha = Math.min(0.9, -Math.log(T) / 2.27); g.drawImage(soft, pts[i][0] - rr, pts[i][1] - rr, rr * 2, rr * 2); }
  });
  const e = pts[pts.length - 1]; return [e[0], e[1]];
}
// a finger-tip dab; a row or list of them
function caveDot(x, y, r, o = {}) { return caveDaub([[x - r * 0.25, y - r * 0.1], [x + r * 0.25, y + r * 0.1]], { w: r * 2, wob: 0, c: CAVE.red, ...o }); }
function caveDots(list, o = {}) { const frac = clamp(o.frac ?? 1), k = frac * list.length; list.forEach(([x, y, r], i) => { if (i < k) caveDot(x, y, r ?? o.r ?? 13, { ...o, frac: 1, key: (o.key ?? 'dots') + i }); }); }

// ---------------------------------------------------------------------
//  caveRub(P, o) — the flat fill: pigment rubbed with the pad of the hand inside ANY closed outline, patchy, the
//  rock showing through. o: c, d (thickness, 0.7), frac (rubbed in from one side), key, a (rub direction, rad), edge (px the margin thins over)
// ---------------------------------------------------------------------
function caveRub(P, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0 || P.length < 3) return;
  if (!CAVE_ON) return cavePaint(() => caveRub(P, o), { over: true });
  const c = o.c ?? CAVE.yellow, d = o.d ?? 0.7, key = o.key ?? 'rub', a = o.a ?? -0.45, bb = bbox(P, 6), bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0, area = bw * bh, R = RNG('caverub', key), soft = caveSoft();
  caveMark(bbox(P, 12), (g) => {
    g.save(); cavePath(g, P); g.clip();
    g.fillStyle = c; g.strokeStyle = c; g.lineCap = 'round'; g.globalAlpha = d * 0.82; g.fillRect(bb.x0, bb.y0, bw, bh);
    const ns = clamp(Math.round(area / 6000), 4, 70), sz = clamp(Math.sqrt(area) / 300, 0.35, 1.4);
    for (let i = 0; i < ns; i++) {   // heavier passes of the pad
      const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), l = R.r(40, 150) * sz, aa = a + R.n(0.35), ww = R.r(26, 64) * sz, al = R.r(0.14, 0.4);
      g.globalAlpha = d * al; g.lineWidth = ww; g.beginPath(); g.moveTo(x - Math.cos(aa) * l / 2, y - Math.sin(aa) * l / 2); g.lineTo(x + Math.cos(aa) * l / 2, y + Math.sin(aa) * l / 2); g.stroke();
    }
    g.globalCompositeOperation = 'destination-out';
    const nb = clamp(Math.round(area / 13000), 2, 40);
    for (let i = 0; i < nb; i++) { const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), r = R.r(26, 78) * sz, al = R.r(0.25, 0.65); g.globalAlpha = al; g.drawImage(soft, x - r, y - r, r * 2, r * 2); }   // patches the pad missed
    const ed = o.edge ?? clamp(Math.sqrt(area) * 0.035, 4, 12); if (ed > 0) { g.lineJoin = 'round'; cavePath(g, P); g.globalAlpha = 0.25; g.lineWidth = ed * 2.6; g.stroke(); g.globalAlpha = 0.35; g.lineWidth = ed; g.stroke(); }   // the pad lifts off toward the edge
    if (frac < 1) { const xf = lerp(bb.x0 - 30, bb.x1 + 90, frac), gr = g.createLinearGradient(xf - 90, 0, xf, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(xf - 90, bb.y0 - 4, bb.x1 - xf + 200, bh + 8); }
    g.restore();
  });
}
// a painted shape: a rubbed fill with a daubed contour (a disc, a sign, the morph's blob)
function caveShape(P, o = {}) {
  const frac = clamp(o.frac ?? 1), key = o.key ?? 'shape', c = o.c ?? CAVE.red;
  caveRub(P, { c, d: (o.d ?? 0.62) * (o.k ?? 1), frac: clamp(frac * 2 - 0.6), key: key + 'f' });
  if (o.line !== false) caveDaub(P, { closed: true, c: o.line ?? c, w: o.w ?? 17, d: o.k ?? 1, frac: clamp(frac * 1.6), key: key + 'l', dip: o.dip ?? 420 });
}
const caveDiscPts = (x, y, r, n = 44) => { const R = RNG('cavedisc', Math.round(r)); return ellipsePts(x, y, r, r * 0.96, 0, n).map(([px, py], i) => { const k = 1 + 0.035 * Math.sin(i / n * TAU * 3 + 1) + 0.02 * Math.sin(i / n * TAU * 7 + 2); return [x + (px - x) * k, y + (py - y) * k]; }); };
function caveDisc(x, y, r, o = {}) { caveShape(caveDiscPts(x, y, r), { key: 'disc', ...o }); }

// ---------------------------------------------------------------------
//  caveSpray(x, y, r, o) — blown pigment: a cloud that develops into speckle, densest in the middle, with fat
//  droplets flung further out (cached sprites, keyed), round a shape that was covered and so stays clean rock.
//    o: c, d (peak thickness, 0.86), frac (how much has been blown so far), key, cut(g): fill / stroke the covered
//       shape on g (it is cut out of the cloud), core (0.28: the solid middle as a share of r)
//  caveHand(x, y, s, o) — the negative hand stencil: s = the palm's width in px (the hand is about 1.9 s tall).
//    o: frac, rot, flip, c, key, lift (0..1: the hand's shadow as it is taken off the wall; omit for none), arm
// ---------------------------------------------------------------------
function caveDrops(key, r, c, j) {
  const k = ['drops', key, Math.round(r), c, j].join('|'); if (CAVE_CV[k]) return CAVE_CV[k];
  const S = Math.ceil(r * 2.7), cv = caveCanvas(k, S, S), g = cv.getContext('2d'), R = RNG('cavedrop', key, j), n = Math.round(r * r / 230);
  g.fillStyle = c;
  for (let i = 0; i < n; i++) {
    const a = R.r(0, TAU), dd = r * (0.18 + 1.12 * Math.pow(R.f(), 0.75)), s = R.f() < 0.86 ? R.r(1.1, 2.5) : R.r(2.6, 5.6);
    g.globalAlpha = R.r(0.55, 1) * (dd > r ? 0.8 : 1); g.beginPath(); g.ellipse(S / 2 + Math.cos(a) * dd, S / 2 + Math.sin(a) * dd, s * R.r(1, 1.7), s, a, 0, TAU); g.fill();
  }
  return cv;
}
function caveSpray(x, y, r, o = {}) {
  const k = clamp(o.frac ?? 1); if (k <= 0) return;
  if (!CAVE_ON) return cavePaint(() => caveSpray(x, y, r, o), { over: true });
  const c = o.c ?? CAVE.red, d = o.d ?? 0.86, key = o.key ?? 'spray', [cr, cg, cb] = caveRGB(c), col = (a) => `rgba(${cr | 0},${cg | 0},${cb | 0},${a.toFixed(3)})`, kk = Math.pow(k, 0.8), R = RNG('cavespray', key);
  caveMark({ x0: x - r * 1.36, y0: y - r * 1.36, x1: x + r * 1.36, y1: y + r * 1.36 }, (g) => {
    const puff = (px, py, pr, a, core) => { const gr = g.createRadialGradient(px, py, pr * core, px, py, pr); gr.addColorStop(0, col(a)); gr.addColorStop(0.34, col(a * 0.9)); gr.addColorStop(0.58, col(a * 0.56)); gr.addColorStop(0.82, col(a * 0.2)); gr.addColorStop(1, col(0)); g.fillStyle = gr; g.fillRect(px - pr, py - pr, pr * 2, pr * 2); };
    puff(x, y, r, d * kk, o.core ?? 0.28);
    for (let i = 0; i < 5; i++) { const a = R.r(0, TAU), dd = r * R.r(0.25, 0.5), pr = r * R.r(0.45, 0.7), al = R.r(0.3, 0.55); puff(x + Math.cos(a) * dd, y + Math.sin(a) * dd, pr, d * al * kk * clamp(k * 5 - i * 0.6), 0.1); }   // breath by breath: a lumpy cloud
    const dc = c[0] === '#' ? c : CAVE.red;
    for (let j = 0; j < 4; j++) if (k > (j + 0.35) / 4.4) g.drawImage(caveDrops(key, r, dc, j), x - Math.ceil(r * 2.7) / 2, y - Math.ceil(r * 2.7) / 2);
    if (o.cut) { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; g.fillStyle = '#000'; g.strokeStyle = '#000'; o.cut(g); }
  });
}
const CAVE_HAND = {
  palm: [[-0.44, -0.34], [-0.2, -0.45], [0.14, -0.46], [0.42, -0.36], [0.5, 0.0], [0.44, 0.4], [0.3, 0.6], [-0.28, 0.6], [-0.44, 0.42], [-0.52, 0.04]],
  fingers: [[-0.33, -0.34, -106, 0.76, 0.2], [-0.07, -0.42, -91, 0.9, 0.21], [0.19, -0.4, -77, 0.8, 0.2], [0.4, -0.28, -58, 0.62, 0.17], [-0.4, 0.2, -157, 0.66, 0.24]],
};
function caveHandPath(g, x, y, s, rot = 0, flip = false, arm = 1.25) {   // fills the hand (and a stub of forearm) with g's current fill / stroke
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip ? -s : s, s); g.lineCap = 'round'; g.lineJoin = 'round';
  cavePath(g, caveMemo('handpalm', () => caveSmooth(CAVE_HAND.palm, true, 2))); g.fill();
  for (const [bx, by, a, l, w] of CAVE_HAND.fingers) { const ca = Math.cos(a * DEG), sa = Math.sin(a * DEG); g.lineWidth = w; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + ca * l * 0.62, by + sa * l * 0.62); g.stroke(); g.lineWidth = w * 0.86; g.beginPath(); g.moveTo(bx + ca * l * 0.55, by + sa * l * 0.55); g.lineTo(bx + ca * l, by + sa * l); g.stroke(); }
  if (arm > 0) { g.beginPath(); g.moveTo(-0.3, 0.5); g.lineTo(0.31, 0.5); g.lineTo(0.37, 0.6 + arm); g.lineTo(-0.36, 0.6 + arm); g.closePath(); g.fill(); }
  g.restore();
}
function caveHand(x, y, s, o = {}) {
  const frac = clamp(o.frac ?? 1), rot = o.rot ?? 0, flip = !!o.flip, key = o.key ?? 'hand' + Math.round(x) + ':' + Math.round(y);
  if (frac > 0) caveSpray(x + Math.sin(rot) * s * 0.22, y - Math.cos(rot) * s * 0.22, s * (o.reach ?? 2.15), { c: o.c ?? CAVE.red, d: o.d, frac, key, cut: (g) => caveHandPath(g, x, y, s, rot, flip, o.arm ?? 1.25) });
  if (o.lift != null && o.lift > 0 && o.lift < 1 && CAVE_ON) {
    const u = o.lift;
    CAVE_ON.q.push(() => { ctx.save(); ctx.globalAlpha = 0.6 * (1 - u) ** 1.3; ctx.filter = `blur(${(3 + 16 * u).toFixed(1)}px)`; ctx.fillStyle = ctx.strokeStyle = '#100905'; caveHandPath(ctx, x + 26 * u, y + 44 * u, s * (1 + 0.3 * u), rot, flip, o.arm ?? 1.25); ctx.filter = 'none'; ctx.restore(); });
  }
}

// ---------------------------------------------------------------------
//  animals: simple side views in the cave manner — a rubbed body, a daubed back line and belly line, stick legs
//  that taper as the finger dries, a few strokes for horns, mane and tail, an unpainted eye.
//    caveAnimal(kind, x, y, s, o)   kind: 'deer' | 'bison' | 'horse' | 'babirusa' | 'anoa'
//      (x, y) = the middle of the body, s = px per unit (a body is about 2.4 units long, legs reach y + 1.15 s)
//      o: flip, c (the rubbed fill, or 'none'), line (the contour), d (fill thickness), frac (0..1: daubed on),
//         step (the leg pose, 0 | 1; default caveStep(0.5)), ghost (false = no second, fainter set of legs),
//         w (line width as a share of s, 0.085), key
//    The second set of legs is the old trick of the many-legged cave animals: in the flicker they seem to run.
// ---------------------------------------------------------------------
const CAVE_ANIMALS = {
  deer: {
    back: [[-1.12, 0.0], [-1.06, -0.22], [-0.8, -0.36], [-0.3, -0.4], [0.2, -0.38], [0.52, -0.46], [0.72, -0.78], [0.86, -1.12], [0.98, -1.3], [1.16, -1.33], [1.36, -1.2], [1.52, -1.04]],
    belly: [[1.52, -1.04], [1.42, -0.94], [1.22, -0.96], [1.08, -0.82], [1.0, -0.45], [0.92, -0.05], [0.78, 0.22], [0.3, 0.3], [-0.3, 0.27], [-0.74, 0.22], [-1.0, 0.12], [-1.1, -0.06]],
    legs: [[[[0.74, 0.18], [0.78, 0.66], [0.72, 1.18]], [[0.54, 0.22], [0.48, 0.7], [0.54, 1.18]], [[-0.8, 0.18], [-0.98, 0.62], [-0.86, 1.18]], [[-0.6, 0.22], [-0.72, 0.66], [-0.58, 1.18]]],
           [[[0.74, 0.18], [1.0, 0.6], [1.2, 1.04]], [[0.54, 0.22], [0.38, 0.7], [0.2, 1.12]], [[-0.8, 0.18], [-1.04, 0.6], [-1.32, 1.0]], [[-0.6, 0.22], [-0.56, 0.7], [-0.34, 1.14]]]],
    extra: [{ P: [[1.0, -1.3], [0.9, -1.7], [0.66, -2.05], [0.5, -2.3]], w: 0.62 }, { P: [[0.93, -1.6], [1.2, -1.86]], w: 0.5 }, { P: [[0.78, -1.9], [1.02, -2.2]], w: 0.5 },
            { P: [[1.08, -1.32], [1.22, -1.7], [1.14, -2.08], [1.04, -2.3]], w: 0.62 }, { P: [[1.21, -1.76], [1.46, -1.96]], w: 0.5 }, { P: [[0.96, -1.28], [0.8, -1.42]], w: 0.55 }],
    eye: [1.2, -1.19],
  },
  bison: {
    back: [[-1.26, 0.2], [-1.22, -0.1], [-1.05, -0.32], [-0.6, -0.44], [-0.18, -0.56], [0.16, -0.86], [0.5, -1.02], [0.82, -0.94], [1.02, -0.7], [1.12, -0.4], [1.22, -0.08], [1.32, 0.2], [1.27, 0.36]],
    belly: [[1.27, 0.36], [1.1, 0.42], [0.99, 0.36], [0.95, 0.62], [0.83, 0.46], [0.7, 0.56], [0.3, 0.5], [-0.3, 0.42], [-0.8, 0.38], [-1.1, 0.34], [-1.24, 0.1]],
    legs: [[[[0.62, 0.5], [0.66, 0.82], [0.6, 1.1]], [[0.4, 0.5], [0.36, 0.84], [0.42, 1.1]], [[-0.92, 0.36], [-1.04, 0.72], [-0.94, 1.1]], [[-0.7, 0.4], [-0.78, 0.76], [-0.66, 1.1]]],
           [[[0.62, 0.5], [0.84, 0.8], [1.0, 1.04]], [[0.4, 0.5], [0.28, 0.84], [0.12, 1.06]], [[-0.92, 0.36], [-1.12, 0.72], [-1.32, 1.0]], [[-0.7, 0.4], [-0.66, 0.78], [-0.48, 1.08]]]],
    extra: [{ P: [[0.98, -0.66], [1.02, -0.92], [1.2, -1.04]], w: 0.8 }, { P: [[-1.22, -0.1], [-1.42, -0.3], [-1.52, -0.66]], w: 0.5 }, { P: [[0.95, 0.56], [0.92, 0.8]], w: 0.6 }],
    mane: [4, 7, 0.13, 1], eye: [1.04, -0.28],
  },
  horse: {
    back: [[-1.16, 0.0], [-1.12, -0.2], [-0.9, -0.36], [-0.4, -0.36], [0.1, -0.34], [0.45, -0.5], [0.7, -0.86], [0.9, -1.08], [1.1, -1.1], [1.3, -0.88], [1.42, -0.66]],
    belly: [[1.42, -0.66], [1.3, -0.57], [1.12, -0.7], [1.0, -0.5], [0.9, -0.1], [0.78, 0.24], [0.3, 0.44], [-0.3, 0.44], [-0.8, 0.32], [-1.08, 0.12], [-1.16, -0.06]],
    legs: [[[[0.7, 0.24], [0.74, 0.62], [0.68, 1.04]], [[0.5, 0.3], [0.46, 0.66], [0.5, 1.04]], [[-0.84, 0.28], [-0.98, 0.62], [-0.88, 1.04]], [[-0.64, 0.32], [-0.72, 0.66], [-0.6, 1.04]]],
           [[[0.7, 0.24], [0.94, 0.58], [1.1, 0.94]], [[0.5, 0.3], [0.36, 0.66], [0.2, 0.98]], [[-0.84, 0.28], [-1.06, 0.6], [-1.3, 0.9]], [[-0.64, 0.32], [-0.6, 0.68], [-0.4, 1.0]]]],
    extra: [{ P: [[-1.14, -0.18], [-1.34, 0.1], [-1.4, 0.56]], w: 0.6 }, { P: [[0.94, -1.1], [0.86, -1.26]], w: 0.5 }],
    mane: [5, 8, 0.16, 1], eye: [1.12, -0.92],
  },
  babirusa: {   // a barrel body, a low head with a long snout, and the tusks that curl up and back over it
    back: [[-1.2, 0.05], [-1.15, -0.3], [-0.85, -0.55], [-0.3, -0.66], [0.25, -0.6], [0.62, -0.5], [0.82, -0.36], [1.0, -0.38], [1.18, -0.3], [1.45, -0.12], [1.7, 0.02]],
    belly: [[1.7, 0.02], [1.7, 0.16], [1.45, 0.2], [1.15, 0.24], [0.95, 0.36], [0.75, 0.52], [0.2, 0.6], [-0.4, 0.58], [-0.9, 0.46], [-1.14, 0.28], [-1.2, 0.05]],
    legs: [[[[0.62, 0.5], [0.66, 0.78], [0.62, 1.02]], [[0.42, 0.54], [0.38, 0.8], [0.42, 1.02]], [[-0.86, 0.46], [-0.94, 0.76], [-0.88, 1.02]], [[-0.66, 0.5], [-0.7, 0.8], [-0.64, 1.02]]],
           [[[0.62, 0.5], [0.8, 0.76], [0.92, 0.98]], [[0.42, 0.54], [0.3, 0.8], [0.18, 1.0]], [[-0.86, 0.46], [-1.02, 0.74], [-1.2, 0.94]], [[-0.66, 0.5], [-0.62, 0.8], [-0.48, 1.0]]]],
    extra: [{ P: [[1.42, -0.12], [1.52, -0.44], [1.36, -0.66], [1.14, -0.6]], w: 0.62 }, { P: [[1.54, 0.1], [1.66, -0.2], [1.56, -0.42]], w: 0.5 }, { P: [[0.92, -0.38], [0.82, -0.64]], w: 0.6 }, { P: [[-1.2, 0.0], [-1.38, 0.14], [-1.36, 0.44]], w: 0.42 }],
    mane: [2, 5, 0.15, 1], eye: [1.12, -0.12],
  },
  anoa: {
    back: [[-1.1, 0.12], [-1.08, -0.2], [-0.86, -0.4], [-0.3, -0.44], [0.3, -0.46], [0.62, -0.52], [0.84, -0.7], [1.02, -0.78], [1.2, -0.64], [1.38, -0.4], [1.44, -0.24]],
    belly: [[1.44, -0.24], [1.34, -0.14], [1.16, -0.2], [1.0, -0.1], [0.9, 0.2], [0.74, 0.4], [0.2, 0.44], [-0.4, 0.42], [-0.86, 0.36], [-1.06, 0.26], [-1.1, 0.08]],
    legs: [[[[0.66, 0.38], [0.7, 0.72], [0.64, 1.08]], [[0.46, 0.42], [0.42, 0.76], [0.46, 1.08]], [[-0.8, 0.34], [-0.92, 0.7], [-0.82, 1.08]], [[-0.6, 0.38], [-0.68, 0.74], [-0.56, 1.08]]],
           [[[0.66, 0.38], [0.88, 0.7], [1.02, 1.0]], [[0.46, 0.42], [0.32, 0.76], [0.18, 1.04]], [[-0.8, 0.34], [-1.0, 0.68], [-1.2, 0.98]], [[-0.6, 0.38], [-0.56, 0.74], [-0.38, 1.04]]]],
    extra: [{ P: [[1.0, -0.78], [0.72, -1.02], [0.5, -1.14]], w: 0.6 }, { P: [[1.08, -0.8], [0.86, -1.08], [0.68, -1.24]], w: 0.55 }, { P: [[-1.08, -0.18], [-1.22, 0.1], [-1.2, 0.46]], w: 0.42 }, { P: [[0.9, -0.74], [0.78, -0.84]], w: 0.5 }],
    eye: [1.16, -0.52],
  },
};
function caveAnimalGeo(kind, x, y, s, flip) {
  return caveMemo(['ani', kind, x.toFixed(1), y.toFixed(1), s.toFixed(2), flip ? 1 : 0].join('|'), () => {
    const A = CAVE_ANIMALS[kind], fl = flip ? -1 : 1, T = (P) => P.map(([u, v]) => [x + u * s * fl, y + v * s]);
    const back = T(caveSmooth(A.back)), belly = T(caveSmooth(A.belly)), out = { back, belly, body: [...back, ...belly], legs: A.legs.map((set) => set.map((l) => T(caveSmooth(l, false, 1)))), extra: (A.extra || []).map((e) => ({ ...e, P: T(caveSmooth(e.P, false, 1)) })), mane: [], eye: A.eye ? T([A.eye])[0] : null };
    if (A.mane) { const [i0, i1, len, dir] = A.mane, seg0 = T(caveSmooth(A.back.slice(i0, i1 + 1))), L = pathLen(seg0), n = Math.max(4, Math.round(L / (s * 0.085))), R = RNG('cavemane', kind);
      for (let i = 0; i < n; i++) { const p = pointAt(seg0, (i + 0.5) / n), q = pointAt(seg0, Math.min(1, (i + 0.5) / n + 0.02)), tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1, nx = ty / tl * dir * fl, ny = -tx / tl * dir * fl, l = len * s * R.r(0.75, 1.2), lean = R.r(-0.5, -0.1) * fl; out.mane.push([[p[0] - nx * l * 0.15, p[1] - ny * l * 0.15], [p[0] + nx * l + tx / tl * l * lean, p[1] + ny * l + ty / tl * l * lean]]); } }
    return out;
  });
}
function caveAnimal(kind, x, y, s, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  if (!CAVE_ON) return cavePaint(() => caveAnimal(kind, x, y, s, o), { over: true });
  const G = caveAnimalGeo(kind, x, y, s, !!o.flip), key = o.key ?? kind, line = o.line ?? CAVE.black, fill = o.c ?? CAVE.yellow, w = (o.w ?? 0.085) * s, ph = (a, b) => clamp((frac - a) / (b - a));
  if (fill !== 'none') caveRub(G.body, { c: fill, d: o.d ?? 0.52, frac: ph(0.42, 0.8), key: key + 'f' });
  caveDaub(G.back, { c: line, w, frac: ph(0, 0.4), key: key + 'b', dip: s * 2.6, dry: 0.55 });
  caveDaub(G.belly, { c: line, w: w * 0.9, frac: ph(0.26, 0.58), key: key + 'u', dip: s * 2.6, dry: 0.6 });
  const pose = ((o.step ?? caveStep(0.5)) % 2 + 2) % 2;
  G.legs[pose].forEach((P, i) => {
    if (frac >= 1 && o.ghost !== false) caveDaub(G.legs[1 - pose][i], { c: line, w: w * 0.66, d: 0.52, key: key + 'g' + i + (1 - pose), dip: s * 1.3, dry: 0.7 });
    caveDaub(P, { c: line, w: w * 0.8, frac: ph(0.5 + i * 0.06, 0.64 + i * 0.06), key: key + 'l' + i + pose, dip: s * 1.3, dry: 0.72 });
  });
  G.extra.forEach((e, i) => caveDaub(e.P, { c: e.c === 'white' ? CAVE.white : line, w: w * (e.w ?? 0.6), frac: ph(0.76 + i * 0.03, 0.88 + i * 0.03), key: key + 'x' + i, dry: 0.5 }));
  G.mane.forEach((P, i) => caveDaub(P, { c: o.mane ?? CAVE.black, w: w * 0.5, frac: ph(0.8, 0.9) >= (i + 1) / G.mane.length ? 1 : 0, key: key + 'm' + i, wob: 0 }));
  if (G.eye && frac >= 0.95) caveDot(G.eye[0], G.eye[1], w * 0.3, { c: fill === 'none' || line === CAVE.black ? CAVE.black : CAVE.white, key: key + 'e' });
}
// a stick hunter with a spear. (x, y) = the middle, s = the height in px. o: c, flip, step, frac, spear (false), throw (px the spear has flown), key
function caveHunter(x, y, s, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return;
  const fl = o.flip ? -1 : 1, c = o.c ?? CAVE.black, key = o.key ?? 'hunter' + Math.round(x), w = s * 0.085, pose = ((o.step ?? caveStep(0.5)) % 2 + 2) % 2, T = (P) => P.map(([u, v]) => [x + u * s * fl, y + v * s]), ph = (a, b) => clamp((frac - a) / (b - a));
  const legs = [[[[0.02, 0.1], [-0.11, 0.3], [-0.15, 0.5]], [[0.02, 0.1], [0.13, 0.3], [0.19, 0.5]]], [[[0.02, 0.1], [-0.2, 0.25], [-0.31, 0.45]], [[0.02, 0.1], [0.2, 0.24], [0.17, 0.48]]]];
  caveDaub(T([[0, -0.25], [0.02, 0.1]]), { c, w: w * 1.15, frac: ph(0, 0.3), key: key + 'b', wob: 0 });
  if (frac > 0.25) caveDot(x + 0.01 * s * fl, y - 0.36 * s, s * 0.085, { c, key: key + 'h' });
  legs[pose].forEach((P, i) => { if (frac >= 1 && o.ghost !== false) caveDaub(T(legs[1 - pose][i]), { c, w: w * 0.6, d: 0.5, key: key + 'g' + i + (1 - pose), wob: 0 }); caveDaub(T(P), { c, w: w * 0.85, frac: ph(0.3 + i * 0.12, 0.55 + i * 0.12), key: key + 'l' + i + pose, wob: 0, dry: 0.7, dip: s * 0.6 }); });
  caveDaub(T([[0, -0.2], [-0.14, -0.3], [-0.2, -0.43]]), { c, w: w * 0.8, frac: ph(0.6, 0.78), key: key + 'a1', wob: 0 });
  caveDaub(T([[0, -0.2], [0.16, -0.17], [0.27, -0.25]]), { c, w: w * 0.8, frac: ph(0.7, 0.88), key: key + 'a2', wob: 0 });
  if (o.spear !== false) { const th = (o.throw ?? 0) / s, a = [-0.46 + th, -0.5 - th * 0.12], b = [0.46 + th, -0.37 - th * 0.12]; caveDaub(T([a, b]), { c, w: w * 0.5, frac: ph(0.85, 1), key: key + 's', wob: 0, dry: 0.3 }); }
}

// ---------------------------------------------------------------------
//  the hero: Rusa, a small red-ochre stag — red body, red line, antlers, an unpainted eye. Red ochre belongs to the
//  living: the hero and the hands. caveHero(x, y, r, o): r = half its size; o: frac, flip, step, key. Sets SPARK_AT.
// ---------------------------------------------------------------------
function caveHero(x, y, r, o = {}) {
  const s = r * 0.72;
  caveAnimal('deer', x - 0.15 * s * (o.flip ? -1 : 1), y + 0.5 * s, s, { c: CAVE.red, line: CAVE.red, d: 0.66, w: 0.1, key: 'rusa', ...o });
  SPARK_AT = toScreen(x, y);
}
function caveHeroPts(x, y, r) { const s = r * 0.72, A = CAVE_ANIMALS.deer; return [...caveSmooth(A.back), ...caveSmooth(A.belly)].map(([u, v]) => [x - 0.15 * s + u * s, y + 0.5 * s + v * s]); }

// ---------------------------------------------------------------------
//  lettering: rough capitals daubed with a finger, stroke by stroke (no font). `size` works like a font size:
//  the caps are 0.72 * size tall. caveText(str, x, y, size, { c, frac, align, key, w, d, track }) — y = baseline.
//  A transparent fillText of the same box is issued so tools/textcheck.mjs can see where the words are.
// ---------------------------------------------------------------------
const CAVE_ARC = (cx, cy, rx, ry, a0, a1, n = 8) => { const P = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * DEG; P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return P; };
const CAVE_GLYPH = {
  A: [0.72, [[0, 1], [0.36, 0], [0.72, 1]], [[0.15, 0.64], [0.57, 0.64]]],
  B: [0.62, [[0, 1], [0, 0]], [[0, 0], [0.34, 0], ...CAVE_ARC(0.34, 0.24, 0.22, 0.24, -90, 90, 6), [0, 0.48]], [[0, 0.48], [0.36, 0.48], ...CAVE_ARC(0.36, 0.74, 0.26, 0.26, -90, 90, 6), [0, 1]]],
  C: [0.64, CAVE_ARC(0.36, 0.5, 0.35, 0.5, -42, -318, 12)],
  D: [0.66, [[0, 1], [0, 0]], [[0, 0], [0.26, 0], ...CAVE_ARC(0.28, 0.5, 0.38, 0.5, -90, 90, 9), [0, 1]]],
  E: [0.58, [[0.56, 0], [0, 0], [0, 1], [0.58, 1]], [[0, 0.5], [0.44, 0.5]]],
  F: [0.56, [[0.56, 0], [0, 0], [0, 1]], [[0, 0.5], [0.42, 0.5]]],
  G: [0.68, [...CAVE_ARC(0.36, 0.5, 0.35, 0.5, -42, -335, 12), [0.68, 0.56], [0.4, 0.56]]],
  H: [0.66, [[0, 0], [0, 1]], [[0.66, 0], [0.66, 1]], [[0, 0.5], [0.66, 0.5]]],
  I: [0.1, [[0.05, 0], [0.05, 1]]],
  J: [0.5, [[0.5, 0], [0.5, 0.72], ...CAVE_ARC(0.26, 0.74, 0.24, 0.26, 0, 170, 6)]],
  K: [0.64, [[0, 0], [0, 1]], [[0.6, 0], [0.03, 0.58]], [[0.22, 0.42], [0.64, 1]]],
  L: [0.54, [[0, 0], [0, 1], [0.54, 1]]],
  M: [0.82, [[0, 1], [0.04, 0], [0.41, 0.68], [0.78, 0], [0.82, 1]]],
  N: [0.66, [[0, 1], [0, 0], [0.66, 1], [0.66, 0]]],
  O: [0.72, CAVE_ARC(0.36, 0.5, 0.36, 0.5, -90, 275, 16)],
  P: [0.6, [[0, 1], [0, 0]], [[0, 0], [0.34, 0], ...CAVE_ARC(0.34, 0.27, 0.25, 0.27, -90, 90, 6), [0, 0.54]]],
  Q: [0.72, CAVE_ARC(0.36, 0.5, 0.36, 0.5, -90, 275, 16), [[0.44, 0.72], [0.74, 1.06]]],
  R: [0.64, [[0, 1], [0, 0]], [[0, 0], [0.34, 0], ...CAVE_ARC(0.34, 0.27, 0.25, 0.27, -90, 90, 6), [0, 0.54]], [[0.26, 0.54], [0.64, 1]]],
  S: [0.6, [...CAVE_ARC(0.31, 0.26, 0.28, 0.26, -30, -230, 8), ...CAVE_ARC(0.3, 0.74, 0.3, 0.26, -60, 150, 8)]],
  T: [0.68, [[0, 0], [0.68, 0]], [[0.34, 0], [0.34, 1]]],
  U: [0.66, [[0, 0], [0, 0.66], ...CAVE_ARC(0.33, 0.66, 0.33, 0.34, 180, 0, 8), [0.66, 0]]],
  V: [0.7, [[0, 0], [0.35, 1], [0.7, 0]]],
  W: [0.92, [[0, 0], [0.22, 1], [0.46, 0.3], [0.7, 1], [0.92, 0]]],
  X: [0.66, [[0, 0], [0.66, 1]], [[0.66, 0], [0, 1]]],
  Y: [0.68, [[0, 0], [0.34, 0.52], [0.68, 0]], [[0.34, 0.52], [0.34, 1]]],
  Z: [0.64, [[0.02, 0], [0.62, 0], [0, 1], [0.64, 1]]],
  0: [0.62, CAVE_ARC(0.31, 0.5, 0.31, 0.5, -90, 275, 16)],
  1: [0.3, [[0, 0.22], [0.26, 0], [0.26, 1]]],
  2: [0.6, [...CAVE_ARC(0.3, 0.27, 0.27, 0.27, -170, 30, 8), [0, 1], [0.6, 1]]],
  3: [0.58, [...CAVE_ARC(0.27, 0.25, 0.27, 0.25, -150, 90, 8)], [...CAVE_ARC(0.27, 0.74, 0.31, 0.26, -90, 150, 8)]],
  4: [0.66, [[0.48, 1], [0.48, 0], [0, 0.68], [0.66, 0.68]]],
  5: [0.6, [[0.56, 0], [0.08, 0], [0.04, 0.44], ...CAVE_ARC(0.28, 0.68, 0.31, 0.3, -100, 150, 9)]],
  6: [0.62, [[0.5, 0.02], [0.14, 0.4], ...CAVE_ARC(0.31, 0.7, 0.3, 0.29, -170, 190, 12)]],
  7: [0.6, [[0, 0], [0.6, 0], [0.22, 1]]],
  8: [0.6, [...CAVE_ARC(0.3, 0.25, 0.24, 0.24, 90, -270, 12), ...CAVE_ARC(0.3, 0.74, 0.3, 0.26, -90, 270, 12)]],
  9: [0.62, [...CAVE_ARC(0.31, 0.3, 0.3, 0.29, 10, 370, 12), [0.48, 0.62], [0.14, 1]]],
  '.': [0.1, [[0.03, 0.97], [0.07, 0.99]]], ',': [0.12, [[0.08, 0.92], [0.02, 1.14]]], '!': [0.1, [[0.05, 0], [0.05, 0.66]], [[0.03, 0.97], [0.07, 0.99]]],
  '?': [0.54, [...CAVE_ARC(0.26, 0.25, 0.26, 0.25, -170, 70, 8), [0.26, 0.68]], [[0.24, 0.97], [0.28, 0.99]]],
  '-': [0.4, [[0.02, 0.54], [0.38, 0.54]]], "'": [0.08, [[0.05, 0], [0.03, 0.24]]], ':': [0.1, [[0.03, 0.36], [0.07, 0.38]], [[0.03, 0.97], [0.07, 0.99]]],
};
function caveTextLay(str, size, track = 0.24) {
  const h = size * 0.72, out = []; let x = 0;
  for (const ch of String(str).toUpperCase()) { const g = CAVE_GLYPH[ch]; if (!g) { x += h * 0.5; continue; } out.push({ ch, x, g }); x += g[0] * h + track * h; }
  return { g: out, w: Math.max(0, x - track * h), h };
}
const caveTextW = (str, size, track) => caveTextLay(str, size, track).w;
function caveText(str, x, y, size, o = {}) {
  const frac = clamp(o.frac ?? 1); if (frac <= 0) return 0;
  if (!CAVE_ON) { let w = 0; cavePaint(() => { w = caveText(str, x, y, size, o); }, { over: true }); return w; }
  const L = caveTextLay(str, size, o.track), h = L.h, ax = o.align === 'center' ? -L.w / 2 : o.align === 'right' ? -L.w : 0, key = o.key ?? 'txt' + str, R = RNG('cavetext', key), w = o.w ?? size * 0.15;
  ctx.save(); ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`; ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(str).toUpperCase(), x + ax, y, Math.max(1, L.w)); ctx.restore();   // for the text check only: draws nothing
  let total = 0; for (const g of L.g) total += g.g.length - 1;
  let k = frac * total, si = 0;
  L.g.forEach((gl, gi) => {
    const rot = R.n(0.045), dy = R.n(h * 0.035), sx = 1 + R.n(0.05), ox = x + ax + gl.x, gw = gl.g[0] * h, c0 = Math.cos(rot), s0 = Math.sin(rot);
    for (let j = 1; j < gl.g.length; j++, si++) {
      const f = clamp(k - si); if (f <= 0) continue;
      const P = gl.g[j].map(([u, v]) => { const px = (u * h - gw / 2) * sx, py = (v - 0.5) * h; return [ox + gw / 2 + px * c0 - py * s0, y - h / 2 + dy + px * s0 + py * c0]; });
      caveDaub(P, { c: o.c ?? CAVE.black, w, d: o.d ?? 1, frac: f, key: key + ':' + gi + ':' + j, wob: w * 0.07, dry: 0.28, dip: h * 2.6 });
    }
  });
  return L.w;
}

// ---------------------------------------------------------------------
//  the caption (through DEFER: after the camera, at screen size). Charcoal capitals daubed straight on the rock
//  over a patch rubbed pale with white clay; one *word* in red ochre with a red finger stroke under it.
//    caveCaption('WE WERE *HERE*', { x (CX), y (the baseline, 1420), w (800: it shrinks to fit), size (92), at (0.5), dur (0.7) })
//  It thins out to grain as a bridge starts and is gone while the light is closed.
// ---------------------------------------------------------------------
function caveBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.25);
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
function caveCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = caveBridgeK(); if (k <= 0.02 || TT < at - 1e-6) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), y = o.y ?? 1420, maxW = o.w ?? 800; let size = o.size ?? 92;
  const toks = String(str).toUpperCase().split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { let tw = 0; toks.forEach((t, i) => { t.w = caveTextW(t.s, size); tw += t.w + (i ? size * 0.42 : 0); }); return tw; };
  let tw = lay(); if (tw > maxW) { size *= maxW / tw; tw = lay(); }
  const h = size * 0.72, x0 = cx - tw / 2, key = 'cap' + str, u = caveIn(at, o.dur ?? 0.7), nTok = toks.length;
  cavePaint(() => {
    if (o.ground !== false) {   // the wall is rubbed pale first, so charcoal reads on it
      const R = RNG('cavecapg', key), P = []; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; P.push([cx + Math.cos(a) * (tw / 2 + 64) * (1 + R.n(0.04)), y - h * 0.45 + Math.sin(a) * h * 1.18 * (1 + R.n(0.1))]); }
      caveRub(P, { c: CAVE.white, d: 0.5 * k, edge: 30, frac: caveIn(at - 0.25, 0.35), key: key + 'g', a: 0.05 });
    }
    let xx = x0;
    toks.forEach((t, i) => {
      if (i) xx += size * 0.42;
      const f = clamp(u * nTok - i);
      caveText(t.s, xx, y, size, { c: t.hi ? CAVE.red : CAVE.black, frac: f, d: k, key: key + i });
      if (t.hi) caveDaub([[xx - 4, y + h * 0.34], [xx + t.w * 0.5, y + h * 0.3], [xx + t.w + 6, y + h * 0.33]], { c: CAVE.red, w: size * 0.1, d: k, frac: caveIn(at + (o.dur ?? 0.7) * (i + 1) / nTok, 0.2), key: key + 'ul', dry: 0.7, dip: t.w + 40 });
      xx += t.w;
    });
  }, { over: true, box: [x0 - 120, y - h * 2.1, x0 + tw + 120, y + h * 1.4] });
}
const caveCaption = (str, o = {}) => { const f = () => caveCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the light: one unseen flame. caveLight() -> { x, y, r, k }: where the pool is this frame (it wanders slowly,
//  jumps a little on every 2s step, dips now and then), caveLightAt(L, x, y) -> 0..1 how lit a point is.
// ---------------------------------------------------------------------
const CAVE_FALL = [[0, 1], [0.3, 0.98], [0.5, 0.88], [0.66, 0.62], [0.8, 0.34], [0.92, 0.12], [1, 0.03]], CAVE_SQ = 0.74;   // brightness by distance / r; the pool is taller than wide
function caveLight() {
  const R = RNG('caveflick', B), dip = R.f() < 0.14 ? 0.1 : 0, k = 1 - 0.07 * R.f() - dip;
  let x = W * 0.5 + 120 * Math.sin(TT * 0.83 + 0.4) + 40 * Math.sin(TT * 2.1 + 1), y = H * 0.47 + 100 * Math.sin(TT * 0.61 + 1.3), r = 1180;
  if (CAVE_AIM) { x = CAVE_AIM.x; y = CAVE_AIM.y; r = CAVE_AIM.r ?? r; }
  if (CAVE_BR) { x = lerp(x, CAVE_BR.x, CAVE_BR.w); y = lerp(y, CAVE_BR.y, CAVE_BR.w); }
  return { x: x + R.n(16), y: y + R.n(16), r: r * (0.95 + 0.07 * R.f()) * (1 - dip * 0.5), k };
}
function caveLightAt(L, x, y) {
  const t = Math.hypot((x - L.x) / CAVE_SQ, y - L.y) / L.r; if (t >= 1) return 0.03 * L.k;
  for (let i = 1; i < CAVE_FALL.length; i++) if (t <= CAVE_FALL[i][0]) { const a = CAVE_FALL[i - 1], b = CAVE_FALL[i]; return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0])) * L.k; }
  return 0.03;
}
function caveTorch(L) {
  ctx.save(); screen();
  ctx.globalCompositeOperation = 'multiply'; ctx.translate(L.x, L.y); ctx.scale(CAVE_SQ, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L.r), warm = [[255, 245, 226], [255, 238, 212], [252, 218, 176], [238, 184, 130], [216, 148, 94], [182, 108, 62], [130, 72, 38]];
  CAVE_FALL.forEach(([t, v], i) => { const c = warm[i].map((q) => Math.round(q * v * L.k)); g.addColorStop(t, `rgb(${c[0]},${c[1]},${c[2]})`); });
  ctx.fillStyle = g; ctx.fillRect(-(W + L.r) * 2, -(H + L.r) * 2, (W + L.r) * 4, (H + L.r) * 4);
  ctx.restore();
}
// dust in the light and a spark or two (closed-form in TT; nothing is carried between frames)
function caveAir(L) {
  ctx.save(); screen(); ctx.globalCompositeOperation = 'lighter';
  const [fr, fg, fb] = caveRGB(CAVE.flame);
  for (let i = 0; i < 46; i++) {
    const R = RNG('cavemote', i), x0 = R.r(0, W), y0 = R.r(0, H), vx = R.n(16), vy = R.r(-22, -4), f = R.r(0.5, 1.4), p = R.r(0, TAU), s = R.r(1.3, 3.4), a0 = R.r(0.1, 0.42);
    const x = mod(x0 + vx * TT + 26 * Math.sin(TT * f + p), W), y = mod(y0 + vy * TT + 14 * Math.cos(TT * f * 0.7 + p), H), a = a0 * caveLightAt(L, x, y) * (0.6 + 0.4 * Math.sin(TT * 2.2 * f + p));
    if (a < 0.02) continue;
    ctx.fillStyle = `rgba(255,${218 + (i % 3) * 10},${170 + (i % 4) * 12},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const life = 1.7 + i * 0.35, t = TT + i * 0.77 + 0.3, n = Math.floor(t / life), u = t / life - n, R = RNG('cavespark', i, n), x0 = R.r(W * 0.2, W * 0.8), sw = R.r(40, 110), ph = R.r(0, TAU), top = R.r(0.42, 0.62);
    const at = (v) => [x0 + sw * Math.sin(v * 5 + ph) * v + 60 * v * (i - 1), H * 0.93 - H * top * (1 - (1 - v) ** 1.7)];
    const fl = RNG('cavesparkf', i, B).r(0.55, 1), a = fl * Math.min(1, u * 8) * (1 - u) ** 0.7; if (a < 0.03) continue;
    const [x, y] = at(u), [px, py] = at(Math.max(0, u - 0.035));
    ctx.strokeStyle = `rgba(${fr},${fg},${fb},${(a * 0.55).toFixed(3)})`; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, `rgba(255,200,120,${(a * 0.5).toFixed(3)})`); g.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.fillStyle = `rgba(255,236,190,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// a picture seen in a pool of light shaped like outline P; everything else is left in near-darkness
function caveLit(P, src, w = 1, pad = 46) {
  const [cx, cy, r] = caveCen(P), k = (r + pad) / (r || 1), m = caveCanvas('cave-mask'), g = m.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  g.filter = 'blur(26px)'; g.fillStyle = '#000'; cavePath(g, P.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k])); g.fill(); g.filter = 'none';
  g.globalCompositeOperation = 'source-in'; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over';
  ctx.save(); screen(); ctx.globalAlpha = 0.085; ctx.drawImage(src, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(m, 0, 0); ctx.restore();
  CAVE_BR = { x: cx, y: cy, w };
}
function caveOnLayer(fn) { const lay = caveCanvas('cave-hook'), g = lay.getContext('2d'), keep = ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; ctx = g; try { fn(); } finally { ctx = keep; } return lay; }

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md). A bridge is done with light: the pool closes onto the
//  bridge object and the rest of the wall falls dark; in the dark the object is repainted as its counterpart
//  (a bridge shape may carry `spray: { x, y, r, cut(g) }` to say it is a blown cloud round a covered shape, e.g. a
//  hand); then the light opens on the new wall.
// =====================================================================
const STYLE = {
  name: 'cave-painting',
  paper: CAVE.rock,
  backdrop() { fillAll(CAVE.dark); },                                        // the unlit cave; the blended colour has no use here
  window(P, key, src, o = {}) { caveLit(P, src, o.phase === 'grow' ? 1 - (o.u ?? 0) : (o.u ?? 1)); },
  blob(P, c, key, u = 0, o = {}) {
    const br = typeof BRIDGES !== 'undefined' ? BRIDGES.find((r) => 'morph' + r.tc === key) : null, sa = br && br.A(), sb = br && br.B(), [cx, cy, r] = caveCen(P);
    const wall = caveWallOf(u < 0.5 ? o.eraA : o.eraB), spA = sa && sa.spray, spB = sb && sb.spray, col = spB && !spA ? sa.c : spA && !spB ? sb.c : c;
    const lay = caveOnLayer(() => cavePaint(() => {
      const kShape = spB && !spA ? (1 - u) ** 1.4 : spA && !spB ? u ** 1.4 : 1, kSpray = spB && !spA ? u : spA && !spB ? 1 - u : spA && spB ? 1 : 0;
      if (kShape > 0.03) caveShape(P, { c: col, k: kShape, key: 'disc' });
      if (kSpray > 0) { const sp = spB || spA, [sx, sy] = caveCen((spB ? sb : sa).P), dx = cx - sx, dy = cy - sy; caveSpray(sp.x + dx, sp.y + dy, sp.r, { c: (spB ? sb : sa).c, frac: Math.max(0.05, kSpray), key: sp.key, cut: sp.cut ? (g) => { g.save(); g.translate(dx, dy); sp.cut(g); g.restore(); } : null }); }
    }, { wall }));
    caveLit(P, lay, 1, spA || spB ? 46 + 60 * (spB ? u : 1 - u) : 46);
  },
  hero(x, y, r, o = {}) { const lay = caveOnLayer(() => cavePaint(() => caveHero(x, y, r, { step: 0 }))); caveLit(caveDiscPts(x, y, r * 1.5, 30), lay, 1); },
  heroColor: CAVE.red,
  heroPts(x, y, r) { return caveHeroPts(x, y, r); },
  // the torchlight over the finished frame: a warm pool that falls to near-black, flickering on 2s, then the air
  post() { const L = caveLight(); caveTorch(L); caveAir(L); CAVE_AIM = null; CAVE_BR = null; },
  ones: false,
};
