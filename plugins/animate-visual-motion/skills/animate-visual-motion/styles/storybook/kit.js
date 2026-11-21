// =====================================================================
//  styles/storybook/kit.js — a children's picture-book illustration: watercolour washes on warm cream paper
//  (soft uneven edges, pigment pooling at the rim, blooms, paper tooth showing through), a soft coloured-pencil
//  outline one shade darker than the fill (never black), round friendly shapes, cute characters with big eyes
//  and blush, rounded hand lettering on soft painted labels. Motion on 2s with a gentle boil.
//  Built on kit/core.js (RNG, EZ, trace, ev, popS, DEFER, toScreen, SPARK_AT ...). Every own name starts with sb / SB.
//  Needs from the piece head: HAND (a rounded hand-lettering font stack), CX (caption centre x).
// =====================================================================
const SB = {
  paper: '#fbf3e1', cream: '#fffaf0', plum: '#563a52', plumL: '#8a6a86',          // ground, highlights, the "ink" (eyes, text)
  sky: '#a9d8ef', skyL: '#e4f3f2', skyD: '#79b6da',                              // day sky
  night: '#6f74c0', nightL: '#aaa6dc',                                           // night sky (a soft indigo, never black)
  leaf: '#8fcb6e', leafL: '#b9e08d', leafD: '#5f9e4f',                           // grass, crowns, sprouts
  sun: '#ffd45e', sunD: '#f2b23c', moon: '#fdeeb4',                              // sunny yellow, moonlight
  lilac: '#c4a8e3', lilacD: '#9b80c6',                                           // roofs, far hills, night shapes
  pink: '#f6abc1', wood: '#d19a6c', woodD: '#a5704a', wall: '#fde3b0',           // flowers, trunks, walls
  hero: '#f58e74',                                                               // CORAL: reserved for the hero
};
const SB_FONT = HAND;
const SB_PLUM_RGB = [86, 52, 82];

// ---------------------------------------------------------------------
//  colour: hex or rgb() in, rgb() out. sbTone(c, k): k < 0 deepens toward a warm plum (the pencil line), k > 0 lifts toward cream
// ---------------------------------------------------------------------
function sbRGB(c) {
  if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
}
function sbTone(c, k, a = 1) {
  const p = sbRGB(c), t = k < 0 ? p.map((v, i) => v * 0.55 + SB_PLUM_RGB[i] * 0.45) : [255, 251, 240], u = Math.abs(k);
  const q = p.map((v, i) => Math.round(lerp(v, t[i], u)));
  return a < 1 ? `rgba(${q.join(',')},${a})` : `rgb(${q.join(',')})`;
}

const sbMix = (a, b, u) => { const x = sbRGB(a), y = sbRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const sbAlpha = (c, a) => { const p = sbRGB(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };

// ---------------------------------------------------------------------
//  outlines: a static, seeded irregularity (the wash's edge, never moves) and a boiling one (the pencil line, on B)
// ---------------------------------------------------------------------
function sbJit(P, closed, amt, key, step = 9, boil = false) {
  const Q = resample(P, closed, step), n = Q.length;
  const R = boil ? RNG('sbj', key, B) : RNG('sbj', key);
  const f1 = R.r(0.012, 0.03), f2 = R.r(0.05, 0.11), p1 = R.r(0, TAU), p2 = R.r(0, TAU);
  const out = new Array(n); let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    const o = amt * (0.7 * Math.sin(s * f1 + p1) + 0.4 * Math.sin(s * f2 + p2));
    out[i] = [Q[i][0] + nx / l * o, Q[i][1] + ny / l * o];
  }
  return out;
}
function sbSmooth(P, k = 2) {   // Chaikin smoothing of an open polyline (keeps the ends)
  for (let j = 0; j < k; j++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]); } Q.push(P[P.length - 1]); P = Q; }
  return P;
}
const sbCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const sbGrow = (P, d) => { const c = sbCentroid(P); return P.map(([x, y]) => { const l = Math.hypot(x - c[0], y - c[1]) || 1; return [x + (x - c[0]) / l * d, y + (y - c[1]) / l * d]; }); };

// ---------------------------------------------------------------------
//  paper: static cached textures (seeded, built once). SB_TEX is a small tile for granulation inside washes;
//  sbToothCanvas is a transparent frame-sized layer of mottling, fibres and specks laid over any colour.
// ---------------------------------------------------------------------
let SB_TEXC = null, SB_TEXP = null, SB_TOOTH = null, SB_TOP = null;
function sbTexPattern() {
  if (SB_TEXP) return SB_TEXP;
  const T = 512, c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d'), R = RNG('sbtex');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, T, T);
  const dots = (x, y, r) => { for (const ox of [0, T, -T]) for (const oy of [0, T, -T]) { if (x + ox + r < 0 || x + ox - r > T || y + oy + r < 0 || y + oy - r > T) continue; g.moveTo(x + ox + r, y + oy); g.arc(x + ox, y + oy, r, 0, TAU); } };
  // granulation: pigment settles in the valleys of the paper, so the grain is soft round dots of several sizes (never square pixels)
  for (const [al, n, r0, r1] of [[0.05, 5200, 1.1, 2.4], [0.09, 2000, 0.7, 1.5], [0.035, 1100, 2.6, 5.5]]) {
    g.fillStyle = `rgba(108,86,92,${al})`; g.beginPath(); for (let i = 0; i < n; i++) dots(R.r(0, T), R.r(0, T), R.r(r0, r1)); g.fill();
  }
  for (let i = 0; i < 46; i++) {   // soft pigment clumps, faint enough that the tile's repeat does not show
    const x = R.r(0, T), y = R.r(0, T), r = R.r(14, 44), al = R.r(0.02, 0.05).toFixed(3);
    for (const ox of [0, T, -T]) for (const oy of [0, T, -T]) {
      if (x + ox + r < 0 || x + ox - r > T || y + oy + r < 0 || y + oy - r > T) continue;
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, `rgba(110,85,80,${al})`); gr.addColorStop(1, 'rgba(110,85,80,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r);
    }
  }
  SB_TEXC = c; SB_TEXP = ctx.createPattern(c, 'repeat'); return SB_TEXP;
}
const SB_M = 200;   // textures run this far past the frame (camera moves stay on paper)
function sbToothCanvas() {
  if (SB_TOOTH) return SB_TOOTH;
  const c = document.createElement('canvas'); c.width = W + 2 * SB_M; c.height = H + 2 * SB_M;
  const g = c.getContext('2d'), R = RNG('sbtooth'), PW = c.width, PH = c.height;
  for (let i = 0; i < 70; i++) {   // big soft mottles: cold-press watercolour paper
    const x = R.r(0, PW), y = R.r(0, PH), r = R.r(80, 260), dark = R.f() < 0.5, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, dark ? `rgba(150,110,70,${R.r(0.025, 0.05).toFixed(3)})` : `rgba(255,255,248,${R.r(0.05, 0.1).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (const [rgb, al, n] of [['120,90,60', 0.035, 16000], ['120,90,60', 0.07, 7000], ['255,253,245', 0.10, 12000]]) {
    g.fillStyle = `rgba(${rgb},${al})`; g.beginPath();
    for (let i = 0; i < n; i++) g.rect(R.r(0, PW), R.r(0, PH), 1 + R.f() * 1.8, 1 + R.f() * 1.8);
    g.fill();
  }
  g.lineCap = 'round'; g.lineWidth = 0.9;
  for (let i = 0; i < 380; i++) {
    const x = R.r(0, PW), y = R.r(0, PH), a = R.r(0, TAU), l = 6 + R.f() * 20;
    g.strokeStyle = `rgba(140,105,70,${(0.04 + R.f() * 0.05).toFixed(3)})`;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  SB_TOOTH = c; return c;
}
function sbTopCanvas() {   // screen-space finish: a warm page vignette and light tooth (drawn by post, offset with the boil)
  if (SB_TOP) return SB_TOP;
  const c = document.createElement('canvas'); c.width = W + 8; c.height = H + 8;
  const g = c.getContext('2d'), R = RNG('sbtop');
  const vg = g.createRadialGradient(W / 2, H * 0.46, H * 0.32, W / 2, H / 2, H * 0.68);
  vg.addColorStop(0, 'rgba(120,80,40,0)'); vg.addColorStop(1, 'rgba(120,80,40,0.16)'); g.fillStyle = vg; g.fillRect(0, 0, c.width, c.height);
  for (const [col, n] of [['rgba(255,252,240,0.16)', 9000], ['rgba(110,80,55,0.07)', 7000]]) {
    g.fillStyle = col; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, c.width), R.r(0, c.height), 1.3 + R.f(), 1.3 + R.f()); g.fill();
  }
  SB_TOP = c; return c;
}
// the bare page (world coords): cream + tooth. o.fill = another page colour
function sbPaper(o = {}) {
  ctx.save(); ctx.fillStyle = o.fill ?? SB.paper; ctx.fillRect(-SB_M, -SB_M, W + 2 * SB_M, H + 2 * SB_M);
  ctx.drawImage(sbToothCanvas(), -SB_M, -SB_M); ctx.restore();
}

// the canvas rectangle in the current drawing coordinates (through the camera and any local transform), with a small margin
function sbVisible() {
  const m = ctx.getTransform().invertSelf(), cw = ctx.canvas.width, ch = ctx.canvas.height; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [px, py] of [[0, 0], [cw, 0], [0, ch], [cw, ch]]) { const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0: x0 - 4, y0: y0 - 4, x1: x1 + 4, y1: y1 + 4 };
}
// ---------------------------------------------------------------------
//  THE WASH: a watercolour fill. A soft feathered fringe where the wet paint crept past its edge, a paper underlay
//  (so stacked things don't show through), two layered passes with different seeded edges (soft, uneven rim), then
//  inside the paint: blooms with a crinkled back-run rim, a warm and a cool colour bled in, pigment settled toward
//  one side, a lighter top, dry-brush skips where the paper shows, granulation, and pigment pooled dark at the rim.
//  Last the coloured-pencil outline a shade darker than the fill, boiling on 2s and sitting a hair off the paint.
//  Shapes under 48px take a short path (one edge, no bleed, one pooled stroke): they are too small to show more.
//  o: key, edge (edge irregularity px), under (paper underlay, default true), bloom (count), line (false | colour),
//     w (line width), lineA, light (top lift 0..1), alpha, pool (0..1), bleed (false), bleedA, grain (0..1),
//     feather (fringe px, 0 = none), settle (0..1), skip (true = dry-brush paper skips near the top-left rim), off (line offset)
// ---------------------------------------------------------------------
function sbWash(P, c, o = {}) {
  const key = o.key ?? 'w', al = o.alpha ?? 1, edge = o.edge ?? 3.2;
  if (al <= 0.01) return P;
  const bb0 = bbox(P), size = Math.max(bb0.x1 - bb0.x0, bb0.y1 - bb0.y0), st = clamp(size / 40, 4, 12), small = size < 48;
  const V = sbVisible(), pad = 24 + edge * 2;   // nothing is painted outside the canvas: a wash that is wholly off it is skipped, and the fills inside a huge one (a hill, a sky) stop at its edge
  if (bb0.x1 + pad < V.x0 || bb0.x0 - pad > V.x1 || bb0.y1 + pad < V.y0 || bb0.y0 - pad > V.y1) return P;
  const fillV = (x, y, w, h) => { const x0 = Math.max(x, V.x0), y0 = Math.max(y, V.y0), x1 = Math.min(x + w, V.x1), y1 = Math.min(y + h, V.y1); if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0); };
  const E1 = sbJit(P, true, edge, key + 'e1', st), E2 = small ? E1 : sbJit(P, true, edge * 1.3, key + 'e2', st);
  ctx.save(); ctx.lineJoin = 'round';
  const fr = o.feather ?? (small ? 0 : clamp(size * 0.02, 3, 8));
  if (fr > 0) {   // the feathered fringe: wet paint creeping a little past the edge
    ctx.strokeStyle = c;
    for (const [w, a] of [[fr * 2.4, 0.07], [fr * 1.3, 0.1]]) { ctx.globalAlpha = al * a; ctx.lineWidth = w; trace(E2, true); ctx.stroke(); }
  }
  ctx.globalAlpha = al;
  if (o.under !== false) { trace(P, true); ctx.fillStyle = sbMix(c, SB.paper, 0.35); ctx.fill(); }   // an opaque, paler underlay: stacked things don't show through
  ctx.fillStyle = c;
  if (small) { ctx.globalAlpha = al * 0.9; trace(E1, true); ctx.fill(); }
  else {
    ctx.globalAlpha = al * 0.72; trace(E1, true); ctx.fill();
    ctx.globalAlpha = al * 0.62; trace(E2, true); ctx.fill();
  }
  // inside the paint
  trace(E1, true); ctx.clip();
  const bb = bbox(E1, 4), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, S = RNG('sbbloom', key);
  const nb = o.bloom ?? (small ? 0 : clamp(Math.round(Math.sqrt(w * h) / 70), 2, 7));
  ctx.globalAlpha = al;
  for (let i = 0; i < nb; i++) {   // blooms: lighter back-runs with a crinkled darker rim, and darker pools, fixed in place
    const x = S.r(bb.x0, bb.x1), y = S.r(bb.y0, bb.y1), r = S.r(0.18, 0.42) * Math.max(w, h), light = S.f() < 0.55;
    const gr = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    if (light) { gr.addColorStop(0, 'rgba(255,252,240,0.36)'); gr.addColorStop(0.7, 'rgba(255,252,240,0.16)'); gr.addColorStop(0.83, 'rgba(255,252,240,0.02)'); gr.addColorStop(0.9, sbTone(c, -0.3, 0.13)); }
    else { gr.addColorStop(0, sbTone(c, -0.3, 0.26)); gr.addColorStop(0.7, sbTone(c, -0.3, 0.1)); gr.addColorStop(0.86, sbTone(c, -0.35, 0.16)); }
    gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; fillV(x - r, y - r, 2 * r, 2 * r);
  }
  if (o.bleed !== false && !small) {   // wet-in-wet: a warm and a cool neighbour colour bled into the wash
    const warm = sbMix(c, '#ffc75a', 0.45), cool = sbMix(c, '#8f86d6', 0.4);
    for (const [col, a] of [[warm, 0.32], [cool, 0.22]]) {
      const x = S.r(bb.x0, bb.x1), y = S.r(bb.y0, bb.y1), r = S.r(0.3, 0.55) * Math.max(w, h), gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, sbAlpha(col, a * (o.bleedA ?? 1))); gr.addColorStop(1, sbAlpha(col, 0)); ctx.fillStyle = gr; fillV(x - r, y - r, 2 * r, 2 * r);
    }
  }
  const vw = Math.min(w, W + 2 * SB_M), vh = Math.min(h, H + 2 * SB_M);   // the part of the shape a viewer can see (hills run far below the frame)
  if (!small && (o.settle ?? 1) > 0) {   // pigment settles toward one side while the wash dries (a seeded, mostly downward direction)
    const a = S.r(0.2, 0.8) * Math.PI, dx = Math.cos(a) * vw * 0.5, dy = Math.sin(a) * vh * 0.5, mx = bb.x0 + w / 2, my = bb.y0 + vh / 2;
    const sg = ctx.createLinearGradient(mx - dx, my - dy, mx + dx, my + dy);
    sg.addColorStop(0.25, sbTone(c, -0.3, 0)); sg.addColorStop(1, sbTone(c, -0.3, 0.24 * (o.settle ?? 1)));
    ctx.fillStyle = sg; fillV(bb.x0, bb.y0, w, vh + 4);
  }
  if ((o.light ?? 0.5) > 0) {   // the top catches the light
    const lg = ctx.createLinearGradient(0, bb.y0, 0, bb.y0 + vh * 0.6);
    lg.addColorStop(0, `rgba(255,252,240,${0.32 * (o.light ?? 0.5)})`); lg.addColorStop(1, 'rgba(255,252,240,0)');
    ctx.fillStyle = lg; fillV(bb.x0, bb.y0, w, vh);
  }
  if (o.skip && size >= 110) {   // dry-brush skips (opt-in, for round things): slivers of paper left showing just inside the upper-left rim
    const cen = [bb.x0 + w / 2, bb.y0 + vh / 2], n = E1.length;
    ctx.fillStyle = 'rgba(255,251,238,0.3)';
    for (let k = 0; k < 2; k++) {
      const ta = S.r(-2.85, -1.75); let best = 0, bd = 9;
      for (let i = 0; i < n; i++) { const d = Math.abs(mod(Math.atan2(E1[i][1] - cen[1], E1[i][0] - cen[0]) - ta + Math.PI, TAU) - Math.PI); if (d < bd) { bd = d; best = i; } }
      const p = E1[best], q = E1[(best + 2) % n], l = Math.hypot(cen[0] - p[0], cen[1] - p[1]) || 1, ins = clamp(size * 0.085, 11, 34) * (1 + 0.5 * k);
      const len = clamp(size * S.r(0.05, 0.085), 9, 40);
      ctx.beginPath(); ctx.ellipse(p[0] + (cen[0] - p[0]) / l * ins, p[1] + (cen[1] - p[1]) / l * ins, len, len * S.r(0.2, 0.32), Math.atan2(q[1] - p[1], q[0] - p[0]), 0, TAU); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = al * (o.grain ?? 0.85);   // granulation: paper tooth through the paint
  ctx.fillStyle = sbTexPattern(); fillV(bb.x0, bb.y0, w, vh + 4);
  ctx.globalCompositeOperation = 'source-over';
  const pool = o.pool ?? 1;   // pigment dries darker at the rim
  if (pool > 0) {
    ctx.strokeStyle = sbTone(c, -0.35);
    if (!small) {
      ctx.globalAlpha = al * 0.12 * pool; ctx.lineWidth = Math.min(30, 6 + size * 0.05); trace(E1, true); ctx.stroke();
      ctx.globalAlpha = al * 0.2 * pool; ctx.lineWidth = Math.min(12, 4 + size * 0.015); trace(E1, true); ctx.stroke();
    }
    ctx.globalAlpha = al * 0.32 * pool; ctx.lineWidth = 2.6; trace(E1, true); ctx.stroke();
  }
  ctx.restore();
  if (o.line !== false) sbLine(P, { col: o.line || sbTone(c, -0.42), w: o.w ?? clamp(size * 0.018, 2.4, 5), key, a: (o.lineA ?? 0.9) * al, off: o.off, closed: true });
  return E1;
}
// the coloured-pencil line: a main pass and a thinner second pass that doesn't quite agree; boils on 2s.
// o: col, w, key, a, closed, part (write-on 0..1), off [dx, dy], amt
function sbLine(P, o = {}) {
  const key = o.key ?? 'l', closed = !!o.closed, amt = o.amt ?? 1.3, [ox, oy] = o.off ?? [1.2, -1];
  let Q = sbJit(P, closed, amt, key + 'ln', 7, true).map(([x, y]) => [x + ox, y + oy]), cl = closed;
  if (o.part != null && o.part < 1) { if (o.part <= 0) return; Q = subPath(closed ? [...Q, Q[0]] : Q, o.part); cl = false; }
  ctx.save(); ctx.strokeStyle = o.col ?? SB.plum; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = o.a ?? 0.9; ctx.lineWidth = o.w ?? 3.5; trace(Q, cl); ctx.stroke();
  if (o.second !== false) {
    let Q2 = sbJit(P, closed, amt * 1.5 + 0.6, key + 'ln2', 7, true);
    if (o.part != null && o.part < 1) Q2 = subPath(closed ? [...Q2, Q2[0]] : Q2, o.part);
    ctx.globalAlpha = (o.a ?? 0.9) * 0.35; ctx.lineWidth = (o.w ?? 3.5) * 0.45; trace(Q2, cl); ctx.stroke();
  }
  ctx.restore();
}
// a soft round glow (moonlight, a lit window, fireflies)
function sbGlow(x, y, r, col, a = 0.5) {
  const [cr, cg, cb] = sbRGB(col), g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${a * 0.35})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
const sbDot = (x, y, r, c = SB.plum) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };

// ---------------------------------------------------------------------
//  SHAPES: point builders (world coords)
// ---------------------------------------------------------------------
const sbCircle = (x, y, r, n = 56) => ellipsePts(x, y, r, r, 0, n);
function sbCloudPts(x, y, w, h, key = 'cl', bumps = 5) {   // a puffy cloud: round bumps on top, a soft flat-ish bottom
  const S = RNG('sbcl', key), P = [], n = 90, amp = [];
  for (let k = 0; k < bumps; k++) amp.push(S.r(0.75, 1.15));
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, top = Math.sin(a) < 0, u = (Math.cos(a) * 0.5 + 0.5) * (bumps - 1e-6), k = Math.floor(u), fu = u - k;
    const bump = top ? amp[k] * (0.55 + 0.45 * Math.sin(fu * Math.PI)) : 1;
    P.push([x + Math.cos(a) * w / 2 * (top ? 1 : 1.02), y + Math.sin(a) * h / 2 * (top ? 0.8 + 0.5 * bump : 0.42)]);
  }
  return P;
}
function sbBlobPts(x, y, rx, ry, key = 'bl', bumps = 7, depth = 0.1) {   // a round crown or bush: soft bumps all around
  const S = RNG('sbbl', key), ph = S.r(0, TAU), P = [], n = 96, amp = []; for (let k = 0; k < bumps; k++) amp.push(S.r(0.6, 1.2));
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, u = mod((a + ph) / TAU * bumps, bumps), k = Math.floor(u), b = Math.sin((u - k) * Math.PI) ** 0.7;
    const rr = 1 - depth + depth * 2 * b * amp[k] * (Math.sin(a) > 0.55 ? 0.4 : 1); P.push([x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr]);
  }
  return P;
}
function sbStarPts(x, y, r, rot = -Math.PI / 2, inner = 0.5) {   // a chubby 5-point star (rounded by trace)
  const P = []; for (let i = 0; i < 10; i++) { const a = rot + i / 10 * TAU, k = i % 2 ? inner : 1; P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
  return P;
}
// a hill: a smooth top edge through pts [[x, y], ...], closed far below the frame
const sbHillPts = (pts) => { const a = pts[0], b = pts[pts.length - 1]; return [...pts, [b[0], H + SB_M + 400], [a[0], H + SB_M + 400]]; };
function sbHeroPts(x, y, r, n = 64) {   // the hero's egg-round body (a little wider at the bottom)
  const P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a); P.push([x + Math.cos(a) * r * (1 + 0.07 * s), y + s * r * 0.96]); }
  return P;
}

// ---------------------------------------------------------------------
//  FACES: big round eyes with two highlights, blush, a small mouth. mood: smile | happy | wow | sleepy | calm
// ---------------------------------------------------------------------
function sbFace(x, y, s, o = {}) {
  const mood = o.mood ?? 'smile', [lx, ly] = o.look ?? [0, 0], key = o.key ?? 'f';
  let blink = (B + (hash(key) % 29)) % 37 < 1;
  if (o.blink === false) blink = false;
  const er = 15 * s, ex = 34 * s;
  ctx.save();
  // blush
  ctx.fillStyle = 'rgba(246,128,140,0.38)'; ctx.beginPath();
  ctx.ellipse(x - ex - 18 * s, y + 24 * s, 14 * s, 8 * s, 0, 0, TAU); ctx.ellipse(x + ex + 18 * s, y + 24 * s, 14 * s, 8 * s, 0, 0, TAU); ctx.fill();
  for (const side of [-1, 1]) {
    const cx = x + side * ex, closed = blink || mood === 'happy' || mood === 'sleepy';
    if (closed) {
      const up = mood === 'happy';
      sbLine(arcPts(cx, y + (up ? 6 : -2) * s, er * 0.95, up ? Math.PI * 1.15 : Math.PI * 0.15, up ? Math.PI * 1.85 : Math.PI * 0.85, 10), { col: SB.plum, w: 4.2 * s, key: key + 'ec' + side, amt: 0.4, second: false, off: [0, 0], a: 1 });
    } else {
      const ry = er * (mood === 'wow' ? 1.3 : 1.18), rx = er * (mood === 'wow' ? 1.08 : 1);
      ctx.fillStyle = SB.plum; ctx.beginPath(); ctx.ellipse(cx + lx * 4 * s, y + ly * 4 * s, rx, ry, 0, 0, TAU); ctx.fill();
      sbDot(cx + lx * 4 * s + rx * 0.35, y + ly * 4 * s - ry * 0.38, er * 0.38, '#ffffff');
      sbDot(cx + lx * 4 * s - rx * 0.32, y + ly * 4 * s + ry * 0.4, er * 0.17, 'rgba(255,255,255,0.85)');
    }
  }
  const my = y + 30 * s;
  if (mood === 'wow') { ctx.fillStyle = SB.plum; ctx.beginPath(); ctx.ellipse(x, my + 3 * s, 7 * s, 9 * s, 0, 0, TAU); ctx.fill(); }
  else if (mood === 'happy') {
    ctx.fillStyle = SB.plum; ctx.beginPath(); ctx.arc(x, my - 4 * s, 13 * s, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2707e'; ctx.beginPath(); ctx.ellipse(x, my + 4 * s, 7 * s, 4 * s, 0, 0, TAU); ctx.fill();
  } else if (mood === 'sleepy') sbLine(arcPts(x, my - 2 * s, 6 * s, Math.PI * 0.2, Math.PI * 0.8, 8), { col: SB.plum, w: 3.6 * s, key: key + 'm', amt: 0.3, second: false, off: [0, 0], a: 1 });
  else sbLine(arcPts(x, my - 8 * s, 11 * s, Math.PI * 0.18, Math.PI * 0.82, 10), { col: SB.plum, w: 4.2 * s, key: key + 'm', amt: 0.3, second: false, off: [0, 0], a: 1 });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  THE HERO: a round coral sprout-kid. Coral is reserved for it. Idle bob and breath, blinks, a sprout that sways,
//  little arms (o.arms = [left, right] angles; up is negative), feet, squash (o.sx, o.sy). Sets SPARK_AT.
//  o: mood, look [x, y], arms, sx, sy (anchored at the feet), lift (px above the ground: the shadow stays), key, col, blink, s (overall scale 0..1)
// ---------------------------------------------------------------------
function sbHero(x, y, r, o = {}) {
  const sc = o.s ?? 1; if (sc <= 0.01) return; r *= sc;
  const key = o.key ?? 'hero', ph = (hash(key) % 100) / 16;
  const breath = 1 + 0.022 * Math.sin(TT * TAU * 0.75 + ph);
  const lift = Math.max(0, o.lift ?? 0) * sc, lk = clamp(lift / (r * 1.2)), gy = y + r * 1.02;   // the ground under the feet
  ctx.save(); ctx.fillStyle = `rgba(86,52,82,${(0.13 * (1 - 0.45 * lk)).toFixed(3)})`;         // a soft ground shadow: it stays put and shrinks as the hero leaves the ground
  ctx.beginPath(); ctx.ellipse(x, gy, r * 0.75 * (o.sx ?? 1) * (1 - 0.3 * lk), r * 0.12 * (1 - 0.3 * lk), 0, 0, TAU); ctx.fill(); ctx.restore();
  y += r * 0.96 * (1 - (o.sy ?? 1)) - lift;                                                    // squash and stretch keep the feet on the ground
  y += Math.sin(TT * TAU * 0.6 + ph) * r * 0.03;
  const sx = (o.sx ?? 1) / Math.sqrt(breath), sy = (o.sy ?? 1) * breath;
  SPARK_AT = toScreen(x, y);
  const C0 = o.col ?? SB.hero, line = sbTone(C0, -0.42);
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
  // feet
  for (const s of [-1, 1]) sbWash(ellipsePts(s * r * 0.38, r * 0.9, r * 0.24, r * 0.15, 0, 22), sbTone(C0, -0.12), { key: key + 'ft' + s, bloom: 1, edge: 1.2, line, w: 3 });
  // arms are drawn in front of the body (below), so a wave or a hug reads
  // the sprout: a stem and two leaves, swaying
  const sway = 0.12 * Math.sin(TT * TAU * 0.5 + ph);
  ctx.save(); ctx.translate(0, -r * 0.9); ctx.rotate(sway);
  sbLine([[0, 4], [r * 0.03, -r * 0.18], [r * 0.01, -r * 0.3]], { col: SB.leafD, w: Math.max(3, r * 0.05), key: key + 'stem', second: false, off: [0, 0], a: 1 });
  for (const s of [-1, 1]) {
    const lp = xform(ellipsePts(s * r * 0.15, 0, r * 0.15, r * 0.075, 0, 20), 0, -r * 0.3, s * -0.45);
    sbWash(lp, SB.leaf, { key: key + 'leaf' + s, bloom: 1, edge: 1, w: 3 });
  }
  ctx.restore();
  // body
  sbWash(sbHeroPts(0, 0, r, 72), C0, { key: key + 'b', edge: 2.4, line, w: Math.max(3.4, r * 0.035), light: 0.9, bloom: 3, skip: true });
  // belly patch
  sbWash(ellipsePts(0, r * 0.5, r * 0.42, r * 0.3, 0, 30), sbTone(C0, 0.45), { key: key + 'bel', bloom: 1, edge: 1.4, line: false, pool: 0.5, under: false, alpha: 0.85 });
  const arms = o.arms ?? [0, 0];   // raise per arm (left, right): 0 hangs down-out, ~1.3 points out-up, ~2.4 straight up, < 0 tucks in (holding something)
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    const phi = 0.75 + arms[i], bx = sd * r * 0.8, by = r * 0.22, L = r * 0.44;
    sbWash(sbCapsule(bx, by, bx + sd * Math.sin(phi) * L, by + Math.cos(phi) * L, r * 0.22), C0, { key: key + 'arm' + sd, bloom: 1, edge: 1.2, line, w: 3.4 });
  }
  sbFace(0, -r * 0.12, r / 105, { mood: o.mood ?? 'smile', look: o.look, key: key + 'face', blink: o.blink });
  ctx.restore();
}
// a rounded limb from (x1, y1) to (x2, y2), thickness w
function sbCapsule(x1, y1, x2, y2, w, n = 8) {
  const a = Math.atan2(y2 - y1, x2 - x1), r = w / 2, P = [];
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + Math.PI * i / n; P.push([x2 + Math.cos(t) * r, y2 + Math.sin(t) * r]); }
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + Math.PI * i / n; P.push([x1 + Math.cos(t) * r, y1 + Math.sin(t) * r]); }
  return P;
}

// ---------------------------------------------------------------------
//  PROPS (world coords; keys seed structure, B drives the boil)
// ---------------------------------------------------------------------
// the sun: soft rounded rays that turn on 2s, a yellow wash disc, a happy face (o.face false to skip)
function sbSun(x, y, r, o = {}) {
  const key = o.key ?? 'sun', sp = o.spin ?? 0.18, n = o.rays ?? 12, rp = clamp(o.rays01 ?? 1);
  sbGlow(x, y, r * 2.2, SB.sun, 0.35);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + TT * sp, k = EZ.back(clamp(rp * 1.4 - i / n * 0.4)); if (k <= 0) continue;
    const r0 = r * 1.1, r1 = r * (1.1 + 0.34 * k * (i % 2 ? 0.78 : 1)), wd = 0.15, rm = lerp(r0, r1, 0.72);
    const P = [[x + Math.cos(a - wd) * r0, y + Math.sin(a - wd) * r0], [x + Math.cos(a - wd * 0.3) * rm, y + Math.sin(a - wd * 0.3) * rm], [x + Math.cos(a) * r1, y + Math.sin(a) * r1], [x + Math.cos(a + wd * 0.3) * rm, y + Math.sin(a + wd * 0.3) * rm], [x + Math.cos(a + wd) * r0, y + Math.sin(a + wd) * r0]];
    sbWash(P, SB.sun, { key: key + 'ray' + i, bloom: 1, edge: 1, w: 3, line: sbTone(SB.sun, -0.35), light: 0 });
  }
  sbWash(sbCircle(x, y, r, 60), SB.sun, { key: key + 'disc', edge: 3, light: 0.8, skip: true });
  if (o.face !== false) sbFace(x, y + r * 0.04, r / 150, { mood: o.mood ?? 'happy', key: key + 'face' });
}
// the moon: a pale full moon with soft craters and a sleepy face; o.crescent for a crescent instead
function sbMoon(x, y, r, o = {}) {
  const key = o.key ?? 'moon';
  sbGlow(x, y, r * 2.4, SB.moon, o.glow ?? 0.32);
  if (o.crescent) {
    const P = []; for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + i / 40 * Math.PI; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    for (let i = 40; i >= 0; i--) { const a = -Math.PI / 2 + i / 40 * Math.PI; P.push([x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.92]); }
    sbWash(P, SB.moon, { key: key + 'c', edge: 2.4, light: 0.7, line: sbTone(SB.sun, -0.3) });
    return;
  }
  sbWash(sbCircle(x, y, r, 60), SB.moon, { key: key + 'disc', edge: 2.6, light: 0.8, line: sbTone(SB.sun, -0.3), skip: true });
  const S = RNG('sbcr', key);
  for (let i = 0; i < 3; i++) { const a = S.r(0, TAU), d = S.r(0.45, 0.7) * r, cr = S.r(0.1, 0.16) * r; sbWash(sbCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, cr, 20), sbTone(SB.moon, -0.12), { key: key + 'cr' + i, line: false, under: false, bloom: 0, edge: 1, alpha: 0.55, pool: 1.4 }); }
  if (o.face !== false) sbFace(x, y + r * 0.08, r / 160, { mood: o.mood ?? 'sleepy', key: key + 'face' });
}
// a cloud (o.c colour), drifting is the scene's job
function sbCloud(x, y, w, h, o = {}) {
  const key = o.key ?? 'cloud';
  sbWash(sbCloudPts(x, y, w, h, key, o.bumps ?? 5), o.c ?? SB.cream, { key, edge: 3, light: 0.4, line: o.line ?? sbTone(o.c ?? SB.skyD, -0.15), w: 3, alpha: o.alpha ?? 1, pool: 0.6 });
}
// a hill: top edge pts, colour, plus a few grass tufts along the ridge
function sbHill(pts, c, o = {}) {
  const key = o.key ?? 'hill'; pts = sbSmooth(pts, 2);   // a rolling ridge, never a polygon
  sbWash(sbHillPts(pts), c, { key, edge: 4, light: 0.6, w: o.w ?? 4, bloom: o.bloom ?? 4 });
  if (o.tufts) {
    const R = RNG('sbtuft', key), ridge = resample(pts, false, 30);
    for (let i = 0; i < o.tufts; i++) {
      const p = ridge[Math.floor(R.f() * (ridge.length - 2)) + 1], s = R.r(0.8, 1.3);
      for (let k = -1; k <= 1; k++) sbLine([[p[0] + k * 8 * s, p[1] + 26], [p[0] + k * 13 * s, p[1] + 6 - (k ? 0 : 6) * s]], { col: sbTone(c, -0.35), w: 3, key: key + 'tf' + i + k, second: false, off: [0, 0], amt: 0.6, a: 0.8 });
    }
  }
}
// a tree: a soft trunk, a round cloud-like crown that sways, optional fruit dots (o.fruit colour)
function sbTree(x, y, s, o = {}) {
  const key = o.key ?? 'tree', sway = (o.sway ?? 0.025) * Math.sin(TT * TAU * 0.4 + x * 0.01);
  sbWash([[x - 24 * s, y + 6 * s], [x - 13 * s, y - 150 * s], [x + 13 * s, y - 150 * s], [x + 24 * s, y + 6 * s]], SB.wood, { key: key + 'tr', edge: 1.6, bloom: 1, w: 3.4 });
  ctx.save(); ctx.translate(x, y - 160 * s); ctx.rotate(sway);
  const crown = sbBlobPts(0, -80 * s, 135 * s, 115 * s, key + 'cr', 8, 0.08);
  sbWash(crown, o.c ?? SB.leaf, { key: key + 'cw', edge: 3.4, light: 0.9, bloom: 4, skip: true });
  for (let i = 0; i < 3; i++) { const a = -2.4 + i * 0.7; sbLine(arcPts(Math.cos(a) * 60 * s, -80 * s + Math.sin(a) * 50 * s, 22 * s, Math.PI * 1.1, Math.PI * 1.7, 6), { col: sbTone(o.c ?? SB.leaf, -0.3), w: 3, key: key + 'cl' + i, second: false, a: 0.6 }); }
  if (o.fruit) { const R = RNG('sbfr', key); for (let i = 0; i < 6; i++) sbWash(sbCircle(R.r(-90, 90) * s, R.r(-120, -20) * s, 13 * s, 16), o.fruit, { key: key + 'f' + i, bloom: 0, edge: 0.8, w: 2.6 }); }
  ctx.restore();
}
// a bush: a low round clump (o.berries colour for dots)
function sbBush(x, y, w, h, c = SB.leafD, o = {}) {
  const key = o.key ?? 'bush';
  sbWash(sbBlobPts(x, y, w / 2, h / 2, key, 6, 0.1), c, { key, edge: 3, light: 0.8, bloom: 3, skip: true });
  if (o.berries) { const R = RNG('sbbe', key); for (let i = 0; i < 5; i++) sbWash(sbCircle(x + R.r(-0.32, 0.32) * w, y + R.r(-0.3, 0.1) * h, 9, 14), o.berries, { key: key + 'b' + i, bloom: 0, edge: 0.6, w: 2.2 }); }
}
// a soft sandy path winding down the hill: pts along its middle, width w0 at the start growing to w1
function sbPath(pts, w0, w1, c = '#f3dcae', o = {}) {
  pts = sbSmooth(pts, 3);
  const L = [], Rr = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); Rr.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]);
  }
  sbWash([...L, ...Rr.reverse()], c, { key: o.key ?? 'path', edge: 3, bloom: 3, light: 0.2, w: 3.4, line: o.line });
  if (o.pebbles) { const R = RNG('sbpb', o.key ?? 'path'); for (let i = 0; i < o.pebbles; i++) { const p = pointAt(pts, R.f()), k = 0.6 + R.f(); sbWash(ellipsePts(p[0] + R.n(30), p[1] + R.n(8), 12 * k, 8 * k, 0, 14), sbTone(c, -0.12), { key: (o.key ?? 'path') + 'pb' + i, bloom: 0, edge: 0.5, w: 2, line: sbTone(c, -0.3) }); } }
}
// a cottage: cream walls, a lilac roof, a round window (o.lit = warm glow), a door, an optional chimney with smoke
function sbHouse(x, y, s, o = {}) {
  const key = o.key ?? 'house', w = 210 * s, h = 160 * s;
  if (o.chimney !== false) {
    sbWash(rrectPts(x + w * 0.18, y - h - 120 * s, 34 * s, 90 * s, 6 * s), SB.woodD, { key: key + 'ch', bloom: 0, edge: 1, w: 3 });
    if (o.smoke) for (let i = 0; i < 4; i++) {
      const u = mod(TT * 0.5 + i / 4, 1), sx = x + w * 0.18 + 17 * s + Math.sin(u * 6 + i) * 14 * s + u * 40 * s, sy = y - h - 130 * s - u * 170 * s;
      sbWash(sbCircle(sx, sy, (12 + 22 * u) * s, 20), SB.cream, { key: key + 'sm' + i, alpha: 0.85 * (1 - u), bloom: 0, edge: 1.4, line: sbTone(SB.skyD, -0.1), w: 2.4, under: false });
    }
  }
  sbWash(rrectPts(x - w / 2, y - h, w, h, 10 * s), o.wall ?? SB.wall, { key: key + 'w', edge: 2, bloom: 2, w: 3.6 });
  sbWash([[x - w / 2 - 30 * s, y - h + 10 * s], [x, y - h - 120 * s], [x + w / 2 + 30 * s, y - h + 10 * s]], o.roof ?? SB.lilac, { key: key + 'rf', edge: 2, bloom: 2, w: 3.6 });
  sbWash([...arcPts(x - 40 * s, y - 70 * s, 26 * s, Math.PI, TAU, 10), [x - 14 * s, y], [x - 66 * s, y]], o.door ?? SB.skyD, { key: key + 'd', edge: 1.2, bloom: 1, w: 3 });
  const wx = x + 48 * s, wy = y - 92 * s;
  if (o.lit) sbGlow(wx, wy, 110 * s, SB.sun, 0.55 * o.lit);
  sbWash(sbCircle(wx, wy, 30 * s, 28), o.lit ? SB.sun : SB.skyL, { key: key + 'win', edge: 1, bloom: 1, w: 3, line: sbTone(SB.woodD, -0.2) });
  sbLine([[wx - 30 * s, wy], [wx + 30 * s, wy]], { col: sbTone(SB.woodD, -0.2), w: 3, key: key + 'wx', second: false });
  sbLine([[wx, wy - 30 * s], [wx, wy + 30 * s]], { col: sbTone(SB.woodD, -0.2), w: 3, key: key + 'wy', second: false });
}
// a star that twinkles on 2s
function sbStar(x, y, r, o = {}) {
  const key = o.key ?? 'star', tw = o.twinkle !== false ? 1 + 0.18 * Math.sin((B + (hash(key) % 7)) * 1.3) : 1;
  sbGlow(x, y, r * 2.4, SB.sun, 0.22 * tw);
  sbWash(sbStarPts(x, y, r * tw, -Math.PI / 2 + 0.08 * Math.sin(B * 0.7 + x), 0.52), o.c ?? SB.sun, { key, bloom: 1, edge: 1, w: Math.max(2.4, r * 0.08), light: 0.4 });
}
// a twinkle (four-point sparkle)
function sbSparkle(x, y, r, c = SB.cream, a = 1) {
  if (r <= 0.5) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore();
}
// an open book: a cover under two curved pages with lines of text; o.c cover colour, o.glow 0..1 (a magic glow)
function sbBook(x, y, s, o = {}) {
  const key = o.key ?? 'book', c = o.c ?? SB.skyD;
  if (o.glow) sbGlow(x, y - 30 * s, 190 * s, SB.sun, 0.45 * o.glow);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(s, s);
  sbWash([[-128, -8], [0, 10], [128, -8], [124, 22], [0, 40], [-124, 22]], c, { key: key + 'cv', edge: 1.2, bloom: 1, w: 3.2 });
  for (const side of [-1, 1]) {
    const P = [[0, 18], [side * 6, -62], [side * 60, -78], [side * 120, -66], [side * 120, 6], [side * 60, -6], [side * 6, 14]];
    sbWash(P, SB.cream, { key: key + 'pg' + side, edge: 1, bloom: 0, w: 2.8, line: sbTone(c, -0.15), light: 0 });
    for (let i = 0; i < 4; i++) { const yy = -54 + i * 15; sbLine([[side * 24, yy + 4], [side * 60, yy - 6], [side * (i === 3 ? 80 : 104), yy]], { col: sbTone(SB.lilacD, 0.1), w: 2.6, key: key + 'tx' + side + i, second: false, amt: 0.5, off: [0, 0], a: 0.7 }); }
  }
  ctx.restore();
}
// a flower on a stem that sways (c = petals)
function sbFlower(x, y, s, c = SB.pink, key = 'fl') {
  const sw = 0.12 * Math.sin(TT * TAU * 0.5 + x * 0.03);
  ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
  sbLine([[0, 0], [3 * s, -30 * s], [0, -60 * s]], { col: SB.leafD, w: 3.4 * s, key: key + 'st', second: false, off: [0, 0], a: 1 });
  sbWash(xform(ellipsePts(10 * s, -26 * s, 12 * s, 6 * s, 0, 14), 0, 0, -0.4), SB.leaf, { key: key + 'lf', bloom: 0, edge: 0.6, w: 2.4 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; sbWash(sbCircle(Math.cos(a) * 12 * s, -64 * s + Math.sin(a) * 12 * s, 10 * s, 14), c, { key: key + 'p' + i, bloom: 0, edge: 0.6, w: 2.4, light: 0.3 }); }
  sbWash(sbCircle(0, -64 * s, 8 * s, 14), SB.sun, { key: key + 'c', bloom: 0, edge: 0.5, w: 2.2 });
  ctx.restore();
}
// a little round bird, wings flapping on 2s (flap 0/1)
function sbBird(x, y, s, flap, key = 'bird', c = SB.skyD) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  sbWash(ellipsePts(0, 0, 26, 20, 0, 26), c, { key: key + 'b', bloom: 0, edge: 0.8, w: 2.6 });
  sbWash([[22, -4], [36, 2], [22, 6]], SB.sun, { key: key + 'bk', bloom: 0, edge: 0.3, w: 2 });
  sbWash(xform(ellipsePts(0, 0, 15, 8, 0, 16), -5, flap ? -15 : 7, flap ? 1.15 : -0.5), sbTone(c, 0.3), { key: key + 'w' + flap, bloom: 0, edge: 0.5, w: 2.4 });   // a rounded wing: up, or folded down
  sbDot(10, -5, 3.6, SB.plum); sbDot(11, -6.2, 1.2, '#fff');
  ctx.restore();
}
// a butterfly fluttering (wings open and close on 2s)
function sbButterfly(x, y, s, key = 'bf', c = SB.lilac) {
  const k = 0.35 + 0.65 * ((B % 2) ? 1 : 0.3);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const side of [-1, 1]) {
    sbWash(ellipsePts(side * 16 * k, -10, 17 * k, 20, side * 0.3, 18), c, { key: key + 'u' + side, bloom: 0, edge: 0.5, w: 2.2 });
    sbWash(ellipsePts(side * 12 * k, 12, 12 * k, 13, -side * 0.3, 16), SB.pink, { key: key + 'l' + side, bloom: 0, edge: 0.5, w: 2.2 });
  }
  sbLine([[0, -16], [0, 20]], { col: SB.plum, w: 4, key: key + 'body', second: false, off: [0, 0], a: 1 });
  ctx.restore();
}
// a firefly: a soft glow that pulses on 2s
function sbFirefly(x, y, key = 'ff') { const p = 0.6 + 0.4 * Math.sin((B + (hash(key) % 9)) * 1.1); sbGlow(x, y, 26 * p + 10, '#fff1a0', 0.75 * p); sbDot(x, y, 4, '#fffbe0'); }
// a falling "z" for sleep, soft lettering
function sbZ(x, y, size, a = 1, key = 'z') { sbText('z', x, y, size, SB.plumL, { a, key, stroke: 0, weight: 700 }); }

// ---------------------------------------------------------------------
//  LETTERING: rounded friendly hand-lettering, a soft cream halo, glyphs with a gentle boil; reveal 0..1 pops
//  letters in one after another (each grows, lifts and fades in). Returns the width.
//  o: align, col, reveal, key, weight, stroke (halo width, 0 = none), a, jit
// ---------------------------------------------------------------------
const SB_ADV = new Map();
function sbAdv(str, font) {   // cumulative x of each glyph (static measurement, cached)
  const k = font + '|' + str; if (SB_ADV.has(k)) return SB_ADV.get(k);
  ctx.save(); ctx.font = font; const xs = [0]; for (let i = 1; i <= str.length; i++) xs.push(ctx.measureText(str.slice(0, i)).width); ctx.restore();
  SB_ADV.set(k, xs); return xs;
}
const sbFontOf = (size, weight = 700) => `${weight} ${size}px ${SB_FONT}`;
const sbTextW = (str, size, weight = 700) => { const xs = sbAdv(str, sbFontOf(size, weight)); return xs[xs.length - 1]; };
function sbText(str, x, y, size, col, o = {}) {
  const font = sbFontOf(size, o.weight ?? 700), xs = sbAdv(str, font), w = xs[xs.length - 1];
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x, n = str.length, rv = o.reveal ?? 1;
  const R = RNG('sbtx', o.key ?? str, B), jit = o.jit ?? 0.8;
  ctx.save(); ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 0 && !(o.stroke ?? size * 0.17)) continue;
    for (let i = 0; i < n; i++) {
      const ch = str[i]; if (ch === ' ') continue;
      const k = clamp(rv * (n + 2) - i); if (k <= 0) continue;
      const pk = rv >= 1 ? 1 : EZ.back(clamp(k * 1.5));
      const gx = x0 + (xs[i] + xs[i + 1]) / 2 + R.n(jit), gy = y + R.n(jit) + (1 - pk) * size * 0.25;
      ctx.save(); ctx.translate(gx, gy - size * 0.32); ctx.rotate(R.n(0.03) + (o.rot ?? 0)); ctx.scale(0.6 + 0.4 * pk, 0.6 + 0.4 * pk); ctx.translate(0, size * 0.32);
      ctx.globalAlpha = (o.a ?? 1) * clamp(k * 2);
      ctx.textAlign = 'center';
      if (pass === 0) { ctx.strokeStyle = o.halo ?? SB.cream; ctx.lineWidth = o.stroke ?? size * 0.17; ctx.strokeText(ch, 0, 0); }
      else { ctx.fillStyle = col; ctx.fillText(ch, 0, 0); }
      ctx.restore();
    }
  }
  ctx.restore();
  return w;
}
// a soft painted label behind text: a rounded wash with a wavy edge (o.c colour)
function sbLabel(x, y, w, h, o = {}) {
  sbWash(rrectPts(x - w / 2, y - h / 2, w, h, h * 0.48, 8), o.c ?? SB.cream, { key: o.key ?? 'label', edge: 3, bloom: 2, light: 0.6, line: o.line ?? sbTone(o.c ?? SB.lilac, -0.2), w: 3.4, alpha: o.alpha ?? 1, pool: 0.7 });
}

// ---------------------------------------------------------------------
//  CAPTIONS (through DEFER, at screen size). The tag is a small sunny label top-left (the page's title);
//  the caption is one or two short lines on a cream label near the bottom of the safe area, letters popping in.
//  Both fade out quickly as a morph closes the era over them.
// ---------------------------------------------------------------------
function sbFadeOut() {   // 1, or falling to 0 in the shrink half of a bridge (the old era's captions leave first)
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)); }
  return 1;
}
function sbTag(str, o = {}) {
  const f = () => {
    const fa = sbFadeOut(), s = popS(E0 + (o.at ?? 0.25)); if (s <= 0.01 || fa <= 0.01) return;
    const size = o.size ?? 60, w = sbTextW(str, size) + size * 1.1, h = size * 1.5, x = 72 + w / 2, y = o.y ?? 340;
    ctx.save(); ctx.globalAlpha = fa; ctx.translate(x, y); ctx.rotate(-0.03); ctx.scale(s, s);
    sbLabel(0, 0, w, h, { c: o.c ?? SB.sun, key: 'tag' + str, line: sbTone(o.c ?? SB.sun, -0.35) });
    sbText(str, 0, size * 0.36, size, SB.plum, { align: 'center', key: 'tagt' + str, stroke: 0 });
    ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}
function sbCaption(lines, o = {}) {
  if (typeof lines === 'string') lines = [lines];
  const f = () => {
    const fa = sbFadeOut(); if (fa <= 0.01) return;
    const at = E0 + (o.at ?? 0.45), s = popS(at); if (s <= 0.01) return;
    const size = o.size ?? 66, lh = size * 1.22, w = Math.max(...lines.map((l) => sbTextW(l, size))) + size * 1.3, h = lines.length * lh + size * 0.7;
    const cx = o.x ?? CX, cy = o.y ?? (1400 - (lines.length - 1) * lh * 0.5);
    ctx.save(); ctx.globalAlpha = fa;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.008); ctx.scale(s, s); sbLabel(0, 0, w, h, { c: o.c ?? SB.cream, key: 'cap' + lines[0], line: sbTone(SB.lilac, -0.2) }); ctx.restore();
    lines.forEach((l, i) => sbText(l, cx, cy - (lines.length - 1) * lh / 2 + i * lh + size * 0.34, size, o.col ?? SB.plum, { align: 'center', key: 'cap' + i + l, reveal: ev(at + 0.05 + i * 0.35, 0.55), stroke: size * 0.12 }));
    ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}

// ---------------------------------------------------------------------
//  SKY: a big wet-in-wet wash, top colour to bottom colour, with large soft blooms (world coords, past the frame)
// ---------------------------------------------------------------------
const SB_SKIES = new Map();   // a sky never changes, so each one is painted once (seeded) and kept; at most 4 are held
function sbSky(top, bottom, o = {}) {
  const key = o.key ?? 'sky', w = W + 2 * SB_M, h = (o.to ?? H) + SB_M, id = [top, bottom, key, h].join('|');
  let c = SB_SKIES.get(id);
  if (!c) {
    c = document.createElement('canvas'); c.width = w; c.height = H + 2 * SB_M;
    const g = c.getContext('2d');
    g.fillStyle = SB.paper; g.fillRect(0, 0, w, c.height); g.drawImage(sbToothCanvas(), 0, 0);
    const gd = g.createLinearGradient(0, 0, 0, h); gd.addColorStop(0, top); gd.addColorStop(1, bottom);
    g.globalAlpha = 0.92; g.fillStyle = gd; g.fillRect(0, 0, w, h);
    const S = RNG('sbsky', key);
    for (let i = 0; i < 9; i++) {
      const x = S.r(0, w), y = S.r(0, h * 0.9), r = S.r(160, 380), light = S.f() < 0.6, gr = g.createRadialGradient(x, y, r * 0.1, x, y, r);
      if (light) { gr.addColorStop(0, 'rgba(255,252,240,0.24)'); gr.addColorStop(0.8, 'rgba(255,252,240,0.05)'); gr.addColorStop(0.9, sbTone(top, -0.25, 0.07)); }   // a back-run: pale inside, a faint darker rim
      else gr.addColorStop(0, sbTone(top, -0.25, 0.16));
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5; g.fillStyle = sbTexPattern(); g.fillRect(0, 0, w, h);
    if (SB_SKIES.size >= 4) SB_SKIES.delete(SB_SKIES.keys().next().value);
    SB_SKIES.set(id, c);
  }
  ctx.drawImage(c, -SB_M, -SB_M);
}

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract)
// =====================================================================
const STYLE = {
  name: 'storybook',
  paper: SB.paper,
  backdrop(c) {   // the page washed toward colour c, paper tooth on top
    ctx.save(); screen(); ctx.fillStyle = SB.paper; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.85; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5; ctx.fillStyle = sbTexPattern(); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(sbToothCanvas(), -SB_M, -SB_M); ctx.restore();
  },
  window(P, key, src, o = {}) {   // the world seen through a soft painted opening: a cream deckle rim and a pencil line in the bridge colour
    const Q = sbJit(P, true, 4, key, 10, false), Qb = sbJit(Q, true, 1.2, key + 'b', 10, true);
    ctx.save(); ctx.shadowColor = 'rgba(86,52,82,0.22)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6;
    trace(Qb, true); ctx.strokeStyle = SB.cream; ctx.lineWidth = 20; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    ctx.save(); trace(Qb, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    sbLine(Q, { col: sbTone(o.c ?? SB.lilac, -0.4), w: 4, key: key + 'rim', closed: true, off: [0, 0] });
  },
  blob(P, c, key) { sbWash(P, c, { key, edge: 3, light: 0.8, bloom: 3, skip: true }); },
  hero(x, y, r, o = {}) { sbHero(x, y + r * 0.1, r * 0.8, { ...o, mood: o.mood === 'wow' ? 'happy' : o.mood }); },
  heroColor: SB.hero,
  heroPts(x, y, r) { return sbHeroPts(x, y + r * 0.1, r * 0.8, 64); },
  post() {   // light paper tooth and a warm vignette over everything, nudged with the boil
    const o = [[0, 0], [3, 2], [1, 4], [4, 1]][B % 4];
    ctx.save(); screen(); ctx.drawImage(sbTopCanvas(), -o[0], -o[1]); ctx.restore();
  },
  ones: false,
};
