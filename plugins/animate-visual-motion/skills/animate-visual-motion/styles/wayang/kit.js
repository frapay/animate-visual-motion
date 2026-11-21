// =====================================================================
//  styles/wayang/kit.js — wayang kulit (Indonesian shadow-puppet theatre) seen on the kelir, the lit screen.
//  A warm screen lit by an oil lamp (blencong) that flickers; flat dark silhouettes with a soft shadow copy,
//  perforated with tatahan (dot rows along the edge, crescent "scale" rows inside): real holes, punched out of
//  each figure on a scratch layer (wyFigure), so the lit screen shows through;
//  jointed arms on thin rods (tuding); the gunungan / kayon as the transition object; the banana-trunk stage
//  (gedebog) as a dark band at the bottom. Motion on 2s, stiff pivots, sway.
//  Built on kit/core.js. Helpers are prefixed wy…; never redeclare a core name (styles/README.md).
//  Needs from the piece head: CX (caption centre x). The stage line is WY_STAGE (1530); a piece moves it with
//  wySetStage(y) at the top of its scenes file.
// =====================================================================
const WY = {
  paper: '#d08a3c',      // the bare lit screen (morph sheet)
  amber: '#d08a3c',      // era ground, warm
  dusk: '#c0703a',       // era ground, a touch redder
  glow: '#ffd27e', mid: '#e8963c', ember: '#a2441a', edge: '#2e0c05',   // the lamp's falloff, centre -> edge
  ink: '#1e0c06',        // the silhouette (a puppet pressed to the screen)
  inkS: '#2c140a',       // soft shadow copy
  far: '#6b3015',        // scenery further from the screen: lighter, blurrier
  cream: '#fbe9c0', gold: '#e2b24f', goldD: '#a8742a',
  red: '#5c170c', stage: '#120603', stageL: '#3a1a0c',
};
const WY_SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", "URW Palladio L", "P052", Georgia, "DejaVu Serif", serif';
let WY_STAGE = 1530;   // the top of the stage (gedebog): the kit's default
function wySetStage(y) { WY_STAGE = y; }   // a piece's override; call it before the first frame
const WY_LAMP = [540, 930];
const WY_STOPS = [[0, WY.glow], [0.3, WY.mid], [0.62, WY.ember], [1, WY.edge]];

// ---- colour
function wyRGB(c) {
  if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return c.match(/[\d.]+/g).slice(0, 3).map(Number);
}
const wyMix = (a, b, u) => { const x = wyRGB(a), y = wyRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
// the lamp's flicker, on 2s: -1..1
function wyFlick() { const R = RNG('wyflick', B); return 0.6 * R.n(1) + 0.4 * Math.sin(B * 1.7); }
// the screen's colour at a screen point (what shows through a cut-out there); tint c mixes in like the backdrop
function wyLightAt(x, y, c) {
  const d = clamp(Math.hypot(x - WY_LAMP[0], (y - WY_LAMP[1]) * 0.85) / (1150 * (1 + 0.025 * wyFlick())));
  let i = 0; while (i < WY_STOPS.length - 2 && d > WY_STOPS[i + 1][0]) i++;
  const [a, ca] = WY_STOPS[i], [b, cb] = WY_STOPS[i + 1];
  const col = wyMix(ca, cb, (d - a) / (b - a));
  const lit = wyMix(col, '#fff3d6', 0.18);   // a cut-out is brighter than the screen around it (no leather in front)
  return c ? wyMix(lit, c, 0.22) : lit;
}

// ---- scratch canvases (made once, by name)
const WY_SCR = {};
function wyScratch(name, w, h) {
  let c = WY_SCR[name];
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; c.g = c.getContext('2d'); WY_SCR[name] = c; }
  return c;
}

// ---- the kelir (screen): lamp glow + cloth weave
let WY_WEAVE = null;
function wyWeave() {
  if (WY_WEAVE) return WY_WEAVE;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), R = RNG('wyweave');
  g.lineWidth = 1;
  for (let y = 0; y < H; y += 3) { g.strokeStyle = `rgba(60,20,5,${R.r(0.05, 0.16)})`; g.beginPath(); g.moveTo(0, y + R.n(0.4)); g.lineTo(W, y + R.n(0.6)); g.stroke(); }
  for (let x = 0; x < W; x += 3) { g.strokeStyle = `rgba(255,235,190,${R.r(0.03, 0.09)})`; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + R.n(0.6), H); g.stroke(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(70,25,8,${R.r(0.04, 0.12)})`; g.fillRect(R.r(0, W), R.r(0, H), R.r(20, 120), 1.2); }   // slubs
  WY_WEAVE = cv; return cv;
}
function wyScreenFill(c) {
  // the glow is smooth, so it is painted at quarter size and enlarged (a full-size radial fill was the dearest thing in the frame)
  const fk = wyFlick(), rad = 1150 * (1 + 0.025 * fk), q = 4, sm = wyScratch('glow', Math.ceil(W / q), Math.ceil(H / q)), sg = sm.g;
  const g = sg.createRadialGradient(WY_LAMP[0], WY_LAMP[1], 0, WY_LAMP[0], WY_LAMP[1], rad);
  WY_STOPS.forEach(([s, col]) => g.addColorStop(s, wyMix(col, c, 0.22)));
  sg.save(); sg.scale(1 / q, 1 / q); sg.translate(0, WY_LAMP[1]); sg.scale(1, 1 / 0.85); sg.translate(0, -WY_LAMP[1]);
  sg.fillStyle = g; sg.fillRect(0, -400, W + q, H + 800); sg.restore();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sm, 0, 0, sm.width, sm.height, 0, 0, sm.width * q, sm.height * q);
  ctx.globalAlpha = 0.55; ctx.drawImage(wyWeave(), 0, 0);
  ctx.restore();
}
const wyScreen = (c = WY.amber) => wyScreenFill(c);

// ---- geometry
function wyInside(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
}
function wyEdgeD(P, x, y) {
  let m = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / l), px = ax + t * dx - x, py = ay + t * dy - y, d = px * px + py * py;
    if (d < m) m = d;
  }
  return Math.sqrt(m);
}
function wyChaikin(P, n = 2) { let Q = P; for (let k = 0; k < n; k++) { const R = []; for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; R.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]); } Q = R; } return Q; }
function wyTrace(P, closed, sharp) { if (!sharp) return trace(P, closed); ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }
const wyCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const wyZoom = () => Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;

// ---- tatahan: the cut-out pattern inside a silhouette (local coords; cached by key when the outline is fixed)
const WY_HOLES = {};
function wyHoles(P, o = {}) {
  if (o.key && WY_HOLES[o.key]) return WY_HOLES[o.key];
  const s = o.scale ?? 1, out = [], clr = o.clear || (() => false);   // clear(x, y): no cut-outs at all there (a face)
  const Q = resample(P, true, 19 * s), n = Q.length;
  for (let i = 0; i < n; i++) {
    const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n], q = Q[i];
    let nx = a[1] - b[1], ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if (!wyInside(P, q[0] + nx * 3, q[1] + ny * 3)) { nx = -nx; ny = -ny; }
    const p1 = [q[0] + nx * 13 * s, q[1] + ny * 13 * s];
    if (wyEdgeD(P, ...p1) > 9 * s && wyInside(P, ...p1) && !clr(...p1)) out.push({ k: 'dot', x: p1[0], y: p1[1], r: 3.1 * s });
    if (o.rows !== 1 && i % 2 === 0) {
      const p2 = [q[0] + nx * 30 * s, q[1] + ny * 30 * s];
      if (wyEdgeD(P, ...p2) > 22 * s && wyInside(P, ...p2) && !clr(...p2)) out.push({ k: 'cres', x: p2[0], y: p2[1], r: 6.5 * s, a: Math.atan2(ny, nx) });
    }
  }
  if (o.interior !== false) {   // crescent "scales" in staggered rows, opening down (tatah inten-like)
    const bb = bbox(P), g = (o.step ?? 30) * s;
    for (let row = 0, y = bb.y0 + g; y < bb.y1; y += g * 0.8, row++) {
      for (let x = bb.x0 + (row % 2 ? g / 2 : 0); x < bb.x1; x += g) {
        if (!wyInside(P, x, y) || wyEdgeD(P, x, y) < 50 * s) continue;
        if ((o.skip && o.skip(x, y)) || clr(x, y)) continue;
        out.push({ k: 'cres', x, y, r: 8 * s, a: Math.PI / 2 });
        if (row % 3 === 1) out.push({ k: 'dot', x, y: y - 9 * s, r: 2.4 * s });
      }
    }
  }
  if (o.key) WY_HOLES[o.key] = out;
  return out;
}
function wyDrawHoles(H0, col = null, a = 1) {   // col null = punch real holes (inside a figure); a colour = paint them
  ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha *= a;
  if (col) { ctx.fillStyle = col; ctx.strokeStyle = col; } else { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = ctx.strokeStyle = '#000'; }
  ctx.beginPath();
  for (const h of H0) if (h.k === 'dot') { ctx.moveTo(h.x + h.r, h.y); ctx.arc(h.x, h.y, h.r, 0, TAU); }
  ctx.fill();
  const byR = new Map();   // crescents of one size share a path (one stroke each)
  for (const h of H0) if (h.k === 'cres') { if (!byR.has(h.r)) byR.set(h.r, []); byR.get(h.r).push(h); }
  for (const [r, L] of byR) {
    ctx.lineWidth = r * 0.38; ctx.beginPath();
    for (const h of L) { const cy = h.y - Math.sin(h.a) * r * 0.5; ctx.moveTo(h.x + Math.cos(h.a - 1.25) * r, cy + Math.sin(h.a - 1.25) * r); ctx.arc(h.x, cy, r, h.a - 1.25, h.a + 1.25); }
    ctx.stroke();
  }
  ctx.restore();
}

// ---- a figure: one piece of leather. Everything drawn inside wyFigure(fn) goes to a scratch layer, where cut-outs
// (wySil's tatahan, wyCut) are punched with destination-out, so the lit screen and whatever stands behind really
// show through. The layer is then laid on the frame over a soft shadow copy made from the layer itself by halving
// it down and enlarging it again (bilinear smoothing does the blur; no ctx.filter, which cost 20-60 ms a shape).
// o: soft (shadow blur px, default 7; 0 = none), depth (0 near .. 1 far: a wider, softer shadow)
let WY_FIG = null;   // the open figure's screen bounding box (null = drawing straight on the frame)
function wyGrow(P) {
  const f = WY_FIG; if (!f) return;
  const m = ctx.getTransform();
  for (const [x, y] of P) {
    const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
    if (sx < f.x0) f.x0 = sx; if (sx > f.x1) f.x1 = sx; if (sy < f.y0) f.y0 = sy; if (sy > f.y1) f.y1 = sy;
  }
}
function wyFigure(fn, o = {}) {
  if (WY_FIG) { fn(); return; }   // already inside a figure: part of the same leather
  const main = ctx, T = main.getTransform(), z = Math.hypot(T.a, T.b) || 1, depth = o.depth ?? 0;
  const cv = wyScratch('fig', W, H), g = cv.g;
  const f = WY_FIG = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  g.save(); g.setTransform(T); ctx = g;
  try { fn(); } finally { ctx = main; g.restore(); WY_FIG = null; }
  const R = Math.max(0, (o.soft ?? 7) * (1 + depth * 1.6) * z), q = 16, pad = Math.ceil(R * 2.6 + 10 * z + 12);
  if (f.x1 < f.x0) { f.x0 = 0; f.y0 = 0; f.x1 = W; f.y1 = H; }   // nothing reported its size: take the whole frame
  const rx = Math.max(0, Math.floor((f.x0 - pad) / q) * q), ry = Math.max(0, Math.floor((f.y0 - pad) / q) * q);
  const rw = Math.min(Math.ceil(W / q) * q, Math.ceil((f.x1 + pad) / q) * q) - rx, rh = Math.min(Math.ceil(H / q) * q, Math.ceil((f.y1 + pad) / q) * q) - ry;
  if (rw <= 0 || rh <= 0) { g.clearRect(0, 0, W, H); return; }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  const al = main.globalAlpha;
  if (R > 0) {   // the soft copy: halve the layer down to 1/4, 1/8 or 1/16 and lay it back enlarged (no ctx.filter)
    const n = R < 5 ? 4 : R < 13 ? 8 : 16;
    let src = cv, sx = rx, sy = ry, sw = rw, sh = rh;
    for (let d = 4; d <= n; d *= 2) {
      const sm = wyScratch('soft' + d, Math.ceil(W / 4) + 8, Math.ceil(H / 4) + 8), sg = sm.g, dw = rw / d, dh = rh / d;   // all one size: tiny canvases leave the GPU path and every copy becomes a read-back
      sg.clearRect(0, 0, dw + 4, dh + 4); sg.drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh);
      src = sm; sx = 0; sy = 0; sw = dw; sh = dh;
    }
    main.globalAlpha = al * 0.55; main.imageSmoothingEnabled = true;
    main.drawImage(src, 0, 0, sw, sh, rx + 7 * z, ry + 5 * z, rw, rh);
  }
  main.globalAlpha = al; main.drawImage(cv, rx, ry, rw, rh, rx, ry, rw, rh);
  main.restore();
  g.clearRect(rx, ry, rw, rh);
}

// ---- a silhouette: a crisp fill with its cut-outs. P in current (local) coords. Called on its own it is a whole
// figure (soft shadow + real holes); inside wyFigure(...) it adds a part to that figure.
// o: key (cache the holes), col, soft (shadow blur px, 0 = none), depth (0 near .. 1 far: lighter, softer, holes only
//    partly open), holes: false, rows, interior, step, scale, skip (no inner scales there), clear (no cut-outs at all
//    there), sharp, light (paint the holes this colour instead)
function wySil(P, o = {}) {
  if (!WY_FIG) { wyFigure(() => wySil(P, o), { soft: o.soft, depth: o.depth }); return; }
  const depth = o.depth ?? 0, col = o.col ?? (depth ? wyMix(WY.ink, WY.far, depth) : WY.ink);
  wyGrow(P);
  ctx.save(); wyTrace(P, true, o.sharp); ctx.fillStyle = col; ctx.fill(); ctx.restore();
  if (o.holes !== false) wyDrawHoles(wyHoles(P, o), o.light ?? null, o.light ? 1 : 1 - depth * 0.3);
}
// a line (or, with fill, a shape) cut out of the figure being drawn: belts, folds, the tree of life, a doorway.
// o: fill, closed, sharp, a (0..1 how open the cut is), light (paint in this colour instead of cutting).
// Outside a figure there is nothing to cut, so it paints the screen's colour at that point (the old behaviour).
function wyCut(P, w, o = {}) {
  ctx.save(); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.light) ctx.strokeStyle = o.light;
  else if (WY_FIG) { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.globalAlpha *= o.a ?? 1; }
  else { const c = P[Math.floor(P.length / 2)], [sx, sy] = toScreen(c[0], c[1]); ctx.strokeStyle = wyLightAt(sx, sy); }
  wyTrace(P, !!o.closed || !!o.fill, o.sharp);
  if (o.fill) { ctx.fillStyle = ctx.strokeStyle; ctx.fill(); } else if (w > 0) ctx.stroke();
  ctx.restore();
}
function wyCutDot(x, y, r, ry = r, rot = 0) {   // a round or almond cut (eyes, pins, studs); inside a figure only
  ctx.save(); if (WY_FIG) ctx.globalCompositeOperation = 'destination-out'; else { const [sx, sy] = toScreen(x, y); ctx.fillStyle = wyLightAt(sx, sy); }
  ctx.beginPath(); ctx.ellipse(x, y, r, ry, rot, 0, TAU); ctx.fill(); ctx.restore();
}
// a rod (tuding / gapit): a thin dark line running down into the stage. Inside a figure it shares the figure's shadow.
function wyRod(x0, y0, x1, y1, w = 4) {
  ctx.save(); ctx.lineCap = 'round';
  if (WY_FIG) wyGrow([[x0, y0], [x1, y1]]);
  else { ctx.strokeStyle = 'rgba(30,12,6,0.35)'; ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.moveTo(x0 + 5, y0 + 4); ctx.lineTo(x1 + 5, y1 + 4); ctx.stroke(); }
  ctx.strokeStyle = WY.ink; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}


// ---- the gunungan / kayon: a tall pointed leaf on a gate, a tree of life cut through it
const WY_GUN_PROFILE = [[0, 0], [0.06, 0.08], [0.15, 0.2], [0.26, 0.36], [0.37, 0.53], [0.45, 0.68], [0.5, 0.8], [0.5, 0.89], [0.45, 0.95], [0.38, 1.0]];
function wyGunLocal(h) {   // base centre at (0,0), top at (0,-h)
  const w = 0.62 * h, R = WY_GUN_PROFILE.map(([u, v]) => [u * w, -h + v * h]);
  const L = R.slice().reverse().map(([x, y]) => [-x, y]);
  return wyChaikin(R.concat(L.slice(0, -1)), 2);
}
function wyGununganPts(x, y, h, o = {}) {
  const sx = o.turn ?? 1, a = o.tilt ?? 0, ca = Math.cos(a), sa = Math.sin(a);
  return resample(wyGunLocal(h), true, h / 70).map(([px, py]) => { px *= sx; return [x + px * ca - py * sa, y + px * sa + py * ca]; });
}
function wyTreeOfLife(h) {   // cut lines in local coords
  const lines = [], s = h / 1000;
  lines.push([[0, -170 * s], [0, -860 * s]]);
  for (let i = 0; i < 6; i++) {
    const y0 = -(250 + i * 105) * s, reach = (230 - i * 32) * s;
    for (const d of [-1, 1]) {
      const P = [[0, y0]];
      for (let k = 1; k <= 14; k++) { const u = k / 14; P.push([d * reach * Math.sin(u * 1.6), y0 - reach * 0.55 * u]); }
      const [ex, ey] = P[P.length - 1], rr = reach * 0.16;   // curl at the tip
      for (let k = 0; k <= 16; k++) { const a = -Math.PI / 2 + d * k / 16 * 1.8 * Math.PI, r = rr * (1 - k / 22); P.push([ex + d * rr * 0 + Math.cos(a) * r * d - d * 0, ey + rr + Math.sin(a) * r]); }
      lines.push(P);
    }
  }
  return lines;
}
// x, y: the base centre; h: height; o: turn (-1..1, its spin about the rod), tilt (radians), rod (true)
function wyGunungan(x, y, h, o = {}) {
  const turn = o.turn ?? 1, s = h / 1000, sx = Math.sign(turn || 1) * Math.max(0.035, Math.abs(turn));
  const u = (L) => L.map(([a, b]) => [a * s, b * s]);
  wyFigure(() => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt ?? 0);
    if (o.rod !== false) wyRod(0, -60 * s, 0, 900, 7 * s);
    ctx.scale(sx, 1);
    wySil(wyGunLocal(h), { key: 'gun' + Math.round(h), scale: s * 1.6, step: 34, skip: (px, py) => Math.abs(px) < 60 * s || py > -250 * s });
    wyCut(u([[-95, -10], [95, -10], [95, -120], [60, -150], [60, -175], [-60, -175], [-60, -150], [-95, -120]]), 0, { fill: true, sharp: true });   // the gateway
    for (const d of [-1, 1]) wySil(u([[d * 6, -12], [d * 50, -12], [d * 50, -96], [d * 6, -110]]), { holes: false, sharp: true });   // the doors, a slit of light between
    wySil(u([[-80, -130], [80, -130], [80, -144], [-80, -144]]), { holes: false, sharp: true });   // the lintel
    for (const d of [-1, 1]) { wyCutDot(d * 28 * s, -60 * s, 4 * s); wyCut(u([[d * 150, -40], [d * 150, -120], [d * 128, -150]]), 5 * s); }   // door studs, the gate's wings
    wyCut(u([[0, -196], [16, -216], [0, -236], [-16, -216]]), 0, { fill: true, sharp: true });   // a lozenge over the gate
    for (const L of wyTreeOfLife(h)) wyCut(L, 9 * s);
    wyCutDot(0, -900 * s, 6 * s);   // the bud at the tip
    ctx.restore();
  });
}

// ---- the hero: an original puppet in profile (a young villager, facing right), jointed arms on rods.
// Drawn to the wayang kulit canon: a small head with a long nose and a narrow eye, a long neck, broad shoulders
// turned to the viewer over a narrow waist, a wide stance with both feet pointing forward, a tail of cloth behind,
// and thin arms long enough to reach the knees. He wears a plain headcloth knotted at the back (no crown, no
// court hair-curl), so he is nobody from the epics or the punakawan.
// local units: 1000 = its height, origin between its feet
const WY_BODY = [[-10, -1000], [28, -990], [50, -964], [52, -934], [62, -906], [98, -872], [102, -866], [68, -856], [70, -843], [58, -833],
  [66, -821], [50, -800], [28, -790], [26, -766], [60, -754], [94, -738], [88, -700], [72, -660], [48, -600], [30, -560],
  [40, -535], [58, -500], [80, -420], [96, -340], [112, -230], [108, -120], [112, -50], [150, -34], [204, -14], [206, 0],
  [78, 0], [80, -50], [72, -130], [62, -235], [10, -330], [-40, -235], [-62, -125], [-72, -50], [-40, -34], [8, -14],
  [10, 0], [-112, 0], [-108, -50], [-112, -130], [-100, -235], [-96, -330], [-150, -300], [-190, -258], [-146, -362], [-112, -440],
  [-70, -500], [-58, -535], [-30, -560], [-56, -620], [-88, -690], [-114, -736], [-84, -756], [-18, -770], [-22, -800], [-52, -830],
  [-80, -852], [-106, -838], [-114, -872], [-88, -890], [-62, -896], [-56, -940], [-40, -982]];
const WY_SHF = [70, -730], WY_SHB = [-92, -730];   // the shoulder pins, front and back
function wyPuppetPts(x, y, s, face = 1) { const k = s / 1000; return WY_BODY.map(([a, b]) => [x + a * k * face, y + b * k]); }
// one arm (inside the puppet's figure): shoulder point, upper-arm and forearm angles from straight down (+ = forward).
// Returns where its rod is tied (the hand).
function wyArm(sh, a1, a2, k) {
  const L1 = 290 * k, L2 = 272 * k, d1 = [Math.sin(a1), Math.cos(a1)], d2 = [Math.sin(a2), Math.cos(a2)], n2 = [d2[1], -d2[0]];
  const el = [sh[0] + d1[0] * L1, sh[1] + d1[1] * L1], ha = [el[0] + d2[0] * L2, el[1] + d2[1] * L2];
  const limb = (p, q, w0, w1) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; return [[p[0] + nx * w0, p[1] + ny * w0], [q[0] + nx * w1, q[1] + ny * w1], [q[0] - nx * w1, q[1] - ny * w1], [p[0] - nx * w0, p[1] - ny * w0]]; };
  const at = (p, d, n, a, b) => [p[0] + d[0] * a * k + n[0] * b * k, p[1] + d[1] * a * k + n[1] * b * k];
  const n1 = [d1[1], -d1[0]], am = at(sh, d1, n1, 86, 0);
  const parts = [limb(sh, el, 14 * k, 10 * k), limb(el, ha, 10 * k, 7 * k),
    [at(am, d1, n1, -20, 0), at(am, d1, n1, 0, 25), at(am, d1, n1, 20, 0), at(am, d1, n1, 0, -25)],                                  // the armlet
    [at(ha, d2, n2, -6, -9), at(ha, d2, n2, 26, -11), at(ha, d2, n2, 58, -2), at(ha, d2, n2, 50, 15), at(ha, d2, n2, 34, 6), at(ha, d2, n2, 20, 22), at(ha, d2, n2, 2, 10)]];   // the hand: curled fingers, a thumb
  for (const P of parts) wySil(P, { holes: false, sharp: true });
  ctx.save(); ctx.fillStyle = WY.ink; ctx.beginPath();
  for (const [p, r] of [[sh, 16], [el, 13], [at(ha, d2, n2, -14, 0), 12]]) { ctx.moveTo(p[0] + r * k, p[1]); ctx.arc(p[0], p[1], r * k, 0, TAU); }   // shoulder, elbow, bracelet
  ctx.fill(); ctx.restore();
  wyCutDot(el[0], el[1], 4 * k); wyCutDot(sh[0], sh[1], 4 * k); wyCutDot(am[0], am[1], 5 * k);   // the joint pins, the armlet's stone
  return at(ha, d2, n2, 24, 2);
}
// x, y: between its feet; s: height. o: key, face (1 right / -1 left), walk (phase, radians; null = standing),
// stop (the time it stopped walking: a small rock that dies away), reach (0..1: the front arm lifts to present),
// wave (bool), pop (time it rises into view from the stage)
function wyPuppet(x, y, s, o = {}) {
  const key = o.key ?? 'hero', face = o.face ?? 1, k = s / 1000;
  let bob = 0, rot = 0, swing = 0;
  if (o.walk != null) { bob = -Math.abs(Math.sin(o.walk)) * 24 * k; rot = Math.sin(o.walk) * 0.035; swing = Math.sin(o.walk); }
  else {
    bob = Math.sin(TT * TAU * 0.5 + key.length) * 6 * k; rot = Math.sin(TT * TAU * 0.35) * 0.012;
    if (o.stop != null && TT >= o.stop) { const dt = TT - o.stop; rot += 0.05 * Math.sin(dt * 10) * Math.exp(-dt * 4.5); }   // follow-through
  }
  if (o.pop != null) bob += (1 - EZ.o3(ev(o.pop, 0.5))) * s * 0.9;
  const reach = clamp(o.reach ?? 0), wv = o.wave ? Math.sin(TT * TAU * 1.1) * 0.22 : 0;
  const u = (L) => L.map(([a, b]) => [a * k, b * k]);
  ctx.save(); ctx.translate(x, y + bob); ctx.rotate(rot); ctx.scale(face, 1);
  wyFigure(() => {
    // the back arm (behind the body), the body on its centre rod, its ornament, then the front arm
    const hb = wyArm(u([WY_SHB])[0], -0.2 - swing * 0.22, -0.02 - swing * 0.3, k);
    wyRod(hb[0], hb[1], hb[0] - 40 * k, 1200 * k + 400, 3);
    wyRod(-4 * k, -420 * k, -4 * k, 1200 * k + 400, 6 * k);
    wySil(u(WY_BODY), { key: 'wybody' + Math.round(s), scale: k * 1.25, interior: false, clear: (px, py) => py < -765 * k });   // the head stays solid
    wyCut(u([[52, -950], [0, -941], [-56, -930]]), 5 * k);                        // the headcloth's band
    wyCut(u([[-72, -884], [-100, -866]]), 4 * k);                                 // its knot
    wyCut(u([[-14, -884], [-2, -872], [-14, -860], [-22, -872]]), 4 * k, { closed: true });   // an ear stud
    const blink = (B + hash(key) % 29) % 37 < 1;
    wyCutDot(60 * k, -894 * k, 19 * k, (blink ? 1.5 : 5) * k, 0.28);              // the narrow eye
    wyCut(u([[-12, -742], [6, -712], [34, -706], [58, -728]]), 5 * k);            // a necklace
    wyCutDot(22 * k, -690 * k, 5 * k);
    wyCut(u([[-30, -556], [30, -556]]), 6 * k); wyCut(u([[-50, -526], [46, -526]]), 4 * k);   // the sash
    wyCut(u([[8, -500], [34, -410], [58, -330]]), 4 * k);                         // the kain's folds
    wyCut(u([[-22, -500], [-42, -420], [-70, -350]]), 4 * k);
    wyCut(u([[-104, -340], [-150, -292]]), 4 * k);                                // the tail of cloth
    const a1 = lerp(0.22 + swing * 0.3, 2.12, reach) + wv, a2 = lerp(0.6 + swing * 0.3, 1.92, reach) + wv * 1.6;
    const hf = wyArm(u([WY_SHF])[0], a1, a2, k);
    wyRod(hf[0], hf[1], hf[0] + 60 * k + reach * 90 * k, 1200 * k + 400, 3);
  });
  ctx.restore();
  if (typeof SPARK_AT !== 'undefined') SPARK_AT = toScreen(x, y + bob - s * 0.8);
}


// ---- scenery
function wyMountainPts(x, y, w, h, key = 'mt') {   // base centre x, base y
  const R = RNG('wymt', key), P = [[x - w * 0.56, y + h * 0.2]];   // the foot runs on below the stage line, so the corner rounding happens out of sight
  const n = 9;
  for (let i = 1; i < n; i++) { const u = i / n, peak = 1 - Math.abs(u - 0.5) * 2; P.push([x - w / 2 + u * w + R.n(w * 0.02), y - h * (peak ** 0.9) * (0.92 + 0.08 * Math.cos(u * 25)) + (i === n / 2 ? 0 : R.n(h * 0.03))]); }
  P.push([x + w * 0.56, y + h * 0.2]);
  return resample(wyChaikin(P, 1), true, 24);
}
function wyMountain(x, y, w, h, o = {}) {
  const P = wyMountainPts(x, y, w, h, o.key);
  wySil(P, { depth: o.depth ?? 0.6, key: 'mtn' + (o.key ?? 'mt') + w, scale: 1.6, step: 50 });
}
// a tree: trunk + lobed canopy, swaying about its base
function wyTree(x, y, h, o = {}) {
  const key = o.key ?? 'tree', s = h / 600, R = RNG('wytree', key), depth = o.depth ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(TT * TAU * 0.4 + R.r(0, 6)) * 0.03 + (o.tilt ?? 0));
  const cy = -h * 0.62, rx = h * 0.34, ry = h * 0.36, n = 9, C = [];
  for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, b = 1 + 0.12 * Math.abs(Math.sin(a * n / 2)); C.push([Math.cos(a) * rx * b, cy + Math.sin(a) * ry * b]); }
  const trunk = [[-14 * s, 0], [14 * s, 0], [10 * s, cy + ry * 0.5], [40 * s, cy], [-36 * s, cy], [-10 * s, cy + ry * 0.5]];
  wyFigure(() => {
    wyRod(0, -10, 0, 900, 4);
    wySil(trunk, { holes: false, depth });
    wySil(C, { key: 'tree' + key + h, scale: s * 1.4, step: 30, depth });
  }, { depth });
  ctx.restore();
}
// a joglo house: stepped roof, posts, a door. Its door, windows and ornament are lit from inside (o.lit, default true):
// they are painted in the screen's bright colour instead of being cut, so they glow even in front of dark scenery.
function wyHouse(x, y, w, o = {}) {
  const s = w / 300, depth = o.depth ?? 0;
  const lit = o.lit === false ? undefined : wyLightAt(...toScreen(x, y - 110 * s));
  ctx.save(); ctx.translate(x, y);
  wyFigure(() => {
    ctx.save(); ctx.scale(s, s);
    wySil([[-120, -150], [120, -150], [120, 0], [-120, 0]], { key: 'wyhouseb', scale: 1.2, rows: 1, interior: false, depth, sharp: true, light: lit });
    wySil([[-150, -150], [-95, -210], [-45, -215], [-25, -290], [25, -290], [45, -215], [95, -210], [150, -150]], { key: 'wyhouser', scale: 1.2, rows: 1, interior: false, depth, sharp: true, light: lit });
    wyCut([[-30, 0], [30, 0], [30, -100], [-30, -100]], 0, { fill: true, sharp: true, light: lit });
    const col = depth ? wyMix(WY.ink, WY.far, depth) : WY.ink;
    for (const sx of [-1, 1]) { wyCut([[sx * 95, -110], [sx * 60, -110], [sx * 60, -70], [sx * 95, -70]], 0, { fill: true, sharp: true, light: lit }); wyCut([[sx * 77.5, -110], [sx * 77.5, -70]], 3, { sharp: true, light: col }); }
    wyCut([[-140, -165], [140, -165]], 5, { light: lit }); wyCut([[-30, -240], [30, -240]], 4, { light: lit });
    ctx.restore();
  }, { depth });
  ctx.restore();
}
// a bird flapping on 2s
function wyBird(x, y, s, ph = 0) {
  const f = Math.sin(TT * TAU * 2.2 + ph), k = s / 100;
  const P = [[-56, -10], [-40, -4], [-18, -8], [-12, -9], [-26, -10 - 56 * f], [-4, -10 - 30 * f], [18, -11], [34, -13], [56, -8], [38, -3], [14, 6], [-20, 4], [-40, 2], [-58, 6]].map(([a, b]) => [x + a * k, y + b * k]);
  wySil(P, { holes: false, soft: 4, sharp: true });
}
// dust in the lamp's beam, drifting up
function wyMotes(n = 26, key = 'motes') {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const R = RNG('wymote', key, i), x0 = R.r(140, 940), sp = R.r(30, 70), y = 1500 - mod(R.r(0, 1100) + TT * sp, 1100);
    const x = x0 + Math.sin(TT * R.r(0.5, 1.2) + i) * 18, d = Math.hypot(x - WY_LAMP[0], y - WY_LAMP[1]) / 700;
    ctx.fillStyle = `rgba(255,236,190,${(clamp(1 - d) * R.r(0.35, 0.8)).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, R.r(1.6, 3.6), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---- type: an ornamental line, a tag, captions (through DEFER, at screen size)
function wyLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
function wyOrnament(x, y, half, frac, col = WY.gold) {   // a gold rule with a lozenge in the middle and curls at the ends
  if (frac <= 0) return;
  const L = half * EZ.o3(frac);
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(30,8,2,0.55)'; ctx.shadowBlur = 8;
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + d * 26, y); ctx.lineTo(x + d * L, y); ctx.stroke();
    if (frac > 0.7) { ctx.beginPath(); ctx.arc(x + d * (L + 0), y - 9, 9, d > 0 ? Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 + 4.5 : Math.PI / 2 - 4.5, d < 0); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x + d * L * 0.55, y, 3.5, 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 14, y); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function wyTextLine(str, x, y, size, col, o = {}) {
  ctx.save(); ctx.font = `${o.italic === false ? '' : 'italic '}${o.weight ?? 600} ${size}px ${WY_SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(str).width, fr = clamp(o.frac ?? 1);
  if (fr < 1) { ctx.beginPath(); ctx.rect(x - w / 2 - 20, y - size * 1.3, (w + 40) * fr, size * 1.9); ctx.clip(); }
  ctx.shadowColor = 'rgba(28,8,2,0.75)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  if (o.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = o.spacing + 'px';
  ctx.fillStyle = col; ctx.fillText(str, x, y);
  ctx.restore(); return w;
}
function wyCaptionNow(str, o = {}) {
  const al = wyLeaving(); if (al <= 0.001) return;
  const lines = str.split('\n'), size = o.size ?? 78, y0 = o.y ?? 400, at = o.at ?? E0 + 0.15;
  ctx.save(); ctx.globalAlpha = al;
  lines.forEach((ln, i) => wyTextLine(ln, CX, y0 + i * size * 1.12, size, WY.cream, { frac: ev(at + i * 0.3, 0.5) }));
  wyOrnament(CX, y0 + (lines.length - 1) * size * 1.12 + 46, 230, ev(at + 0.2, 0.7));
  ctx.restore();
}
function wyTagNow(label, o = {}) {
  const al = wyLeaving(); if (al <= 0.001) return;
  const y = o.y ?? 300, fr = ev(E0 + 0.1, 0.5);
  ctx.save(); ctx.globalAlpha = al * EZ.o2(fr);
  wyTextLine(label, CX, y, 34, WY.gold, { italic: false, weight: 700, spacing: 8 });
  ctx.restore();
}
const wyCaption = (str, o = {}) => { const f = () => wyCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const wyTag = (label, o = {}) => { const f = () => wyTagNow(label, o); if (DEFER) DEFER.push(f); else f(); };

// ---- the frame's fixed furniture, drawn after everything: the stage (gedebog), the screen's top border, the flicker
let WY_FURN = null, WY_FURN_Y = -1;
function wyFurniture() {   // the stage band and the top border never change: drawn once (again if the stage line moves)
  if (WY_FURN && WY_FURN_Y === WY_STAGE) return WY_FURN;
  const cv = WY_FURN || document.createElement('canvas'); cv.width = W; cv.height = H;
  const g0 = cv.getContext('2d'), y = WY_STAGE;
  const g = g0.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#2a1209'); g.addColorStop(0.08, WY.stage); g.addColorStop(1, '#070301');
  g0.fillStyle = g; g0.fillRect(0, y, W, H - y);
  g0.fillStyle = WY.stageL; g0.fillRect(0, y, W, 5);
  const R = RNG('wygedebog');   // the banana trunk's fibres
  g0.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) { const yy = y + 14 + R.r(0, 130); g0.strokeStyle = `rgba(90,45,20,${R.r(0.15, 0.4)})`; g0.beginPath(); g0.moveTo(R.r(-50, W * 0.6), yy); g0.lineTo(R.r(W * 0.4, W + 50), yy + R.n(3)); g0.stroke(); }
  // the top border (plisir): a dark red band with a scalloped edge
  const top = 120;
  g0.fillStyle = WY.red; g0.beginPath(); g0.moveTo(0, 0); g0.lineTo(W, 0); g0.lineTo(W, top);
  for (let x = W; x >= 0; x -= 60) g0.quadraticCurveTo(x - 30, top + 26, x - 60, top);
  g0.closePath(); g0.fill();
  g0.fillStyle = 'rgba(10,3,1,0.6)'; g0.fillRect(0, 0, W, top - 30);
  g0.strokeStyle = WY.goldD; g0.lineWidth = 2; g0.beginPath(); g0.moveTo(0, top - 22); g0.lineTo(W, top - 22); g0.stroke();
  WY_FURN = cv; WY_FURN_Y = y; return cv;
}
function wyStage() {
  const y = WY_STAGE, cv = wyFurniture();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cv, 0, 0, W, 150, 0, 0, W, 150); ctx.drawImage(cv, 0, y, W, H - y, 0, y, W, H - y);
  // the lamp's flicker: a faint darkening pass over the whole frame
  const fk = wyFlick();
  ctx.fillStyle = `rgba(20,5,2,${(0.035 + 0.03 * fk).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks
// =====================================================================
const STYLE = {
  name: 'wayang',
  paper: WY.paper,
  backdrop(c) { wyScreenFill(c); },
  // the world seen through a hole cut in leather: the scene clipped to P, a dark perforated rim around it
  window(P, key, src, o = {}) {
    const c = wyCentroid(P);
    const rAvg = P.reduce((a, p) => a + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / P.length || 1;
    const out = P.map(([x, y]) => [c[0] + (x - c[0]) * (1 + 40 / rAvg), c[1] + (y - c[1]) * (1 + 40 / rAvg)]);
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    wyFigure(() => {   // the rim: out minus P (even-odd), a row of real holes around it
      wyGrow(out);
      ctx.save(); ctx.beginPath();
      const addPath = (Q) => { const n = Q.length; ctx.moveTo((Q[n - 1][0] + Q[0][0]) / 2, (Q[n - 1][1] + Q[0][1]) / 2); for (let i = 0; i < n; i++) { const p = Q[i], q = Q[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); };
      addPath(out); addPath(P); ctx.fillStyle = WY.ink; ctx.fill('evenodd');
      ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath();
      for (const q of resample(P, true, 22)) { const dx = q[0] - c[0], dy = q[1] - c[1], l = Math.hypot(dx, dy) || 1, hx = q[0] + dx / l * 20, hy = q[1] + dy / l * 20; ctx.moveTo(hx + 3.6, hy); ctx.arc(hx, hy, 3.6, 0, TAU); }
      ctx.fill(); ctx.restore();
    }, { soft: 8 });
  },
  // the morphing shape: a dark perforated silhouette
  blob(P, c) { wySil(P, { col: c, scale: 1.5, step: 34 }); },
  hero(x, y, r, o = {}) { wyPuppet(x, y + r, r * 2, { key: o.key }); },
  heroColor: WY.ink,
  heroPts(x, y, r) { return wyPuppetPts(x, y + r, r * 2); },
  post() { wyStage(); },
  ones: false,
};
