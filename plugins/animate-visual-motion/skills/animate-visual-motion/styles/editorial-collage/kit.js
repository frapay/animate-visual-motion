// =====================================================================
//  styles/editorial-collage/kit.js — the editorial video-essay collage: scraps of paper and halftone "photo" cut-outs
//  slapped onto a desk, with a yellow highlighter and a red marker doing the pointing. Made for narrated explainers
//  (issues, news, opinions, "the story behind X"): every reveal takes an absolute start time t0, so a piece can cue it
//  on a spoken word.
//  Built on kit/core.js (RNG, EZ, geometry, trace, cameras, TT / ev / DEFER / E0 / SPARK_AT). Motion on 2s (stop-motion).
//  Needs from the piece head: CX (caption centre x) and, optionally, SAFE ({ top, bottom, right }).
//  Dark variant: `const EC_DARK = true;` before the kit (a src/options.js in the piece's "build" list) = a charcoal board.
//  Static textures (halftone fills, torn sheets, grain) are drawn once into keyed, seeded sprites (EC_CACHE); nothing
//  else carries between frames, and nothing inside a sprite depends on the frame it was first drawn on.
// =====================================================================
const EC_DARKMODE = typeof EC_DARK !== 'undefined' && !!EC_DARK;
const EC = {
  desk: EC_DARKMODE ? '#1c1c1e' : '#e9e3d5',     // the ground: warm grey-beige desk paper, or a charcoal board
  ink: '#191919',
  news: '#f3eee2', white: '#fbfaf6', kraft: '#c9a77c', graph: '#f1f5f0', legal: '#f7ea8f',   // the paper stock
  fibre: '#fffdf8',                               // the white core a tear exposes
  yellow: '#ffe24a', red: '#e3342b',              // the two pointing colours: highlighter, marker
  steel: '#3f5b7a',                               // the one cool photo tint
  grey: '#9a958b', greyL: '#c9c4b8',              // greeked text
  tape: 'rgba(236,223,178,0.80)',
};
const EC_SERIF = '"Playfair Display", Georgia, "Times New Roman", "Liberation Serif", "DejaVu Serif", serif';          // headlines
const EC_COND = '"Arial Narrow", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Liberation Sans Narrow", "DejaVu Sans Condensed", Impact, sans-serif';   // labels, kickers, stamps
const EC_TYPE = '"Courier New", Courier, "Liberation Mono", "DejaVu Sans Mono", monospace';                            // source lines, typed notes
const ecSafe = () => (typeof SAFE !== 'undefined' ? SAFE : { top: Math.round(H * 0.125), bottom: Math.round(H * 0.22), right: Math.round(W * 0.13) });
const EC_STEP = 2 / FPS;                           // one stop-motion step

// ---------------------------------------------------------------------
//  type
// ---------------------------------------------------------------------
const ecFont = (kind, size, weight) => `${weight ?? (kind === 'serif' ? 900 : 700)} ${size}px ${kind === 'cond' ? EC_COND : kind === 'type' ? EC_TYPE : EC_SERIF}`;
function ecTextW(str, size, kind = 'serif', weight, track = 0) {
  ctx.save(); ctx.font = ecFont(kind, size, weight); if ('letterSpacing' in ctx) ctx.letterSpacing = track + 'px';
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}
// o: font ('serif' | 'cond' | 'type'), weight, align, track (px), al
function ecText(str, x, y, size, color, o = {}) {
  ctx.save(); ctx.font = ecFont(o.font ?? 'serif', size, o.weight); if ('letterSpacing' in ctx) ctx.letterSpacing = (o.track ?? 0) + 'px';
  ctx.fillStyle = color; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha *= o.al ?? 1;
  const w = ctx.measureText(str).width; ctx.fillText(str, x, y); ctx.restore(); return w;
}
// greedy wrap to a measure
function ecWrap(str, size, maxW, kind = 'serif', weight) {
  const out = []; let line = '';
  for (const w of str.split(/\s+/)) { const t = line ? line + ' ' + w : w; if (line && ecTextW(t, size, kind, weight) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

// ---------------------------------------------------------------------
//  geometry and static roughness (none of this boils: paper and marker ink hold still, the pieces themselves jitter)
// ---------------------------------------------------------------------
function ecPoly(P) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
const ecOutline = (P, sharp) => (sharp ? ecPoly(P) : trace(P, true));
function ecResN(P, n) {   // a closed outline as exactly n points, evenly spaced along it
  const m = P.length, L = []; let tot = 0;
  for (let i = 0; i < m; i++) { const d = dist(P[i], P[(i + 1) % m]); L.push(d); tot += d; }
  const out = []; let i = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const want = tot * k / n;
    while (i < m - 1 && acc + L[i] < want) { acc += L[i]; i++; }
    const u = L[i] ? (want - acc) / L[i] : 0, a = P[i], b = P[(i + 1) % m];
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}
// unit outward normals of a closed outline (y down)
function ecNormals(Q) {
  const n = Q.length; let area = 0;
  for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area >= 0 ? 1 : -1;
  return Q.map((q, i) => { const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n], nx = (b[1] - a[1]) * sg, ny = -(b[0] - a[0]) * sg, l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l]; });
}
// a torn edge: the outline jagged by a seeded walk (outer = the white fibre the tear exposes, inner = the printed face)
// o: n (points) or step, amt (px), fibre (px), side(p) -> 0..1 tear strength at a point (0 = a clean scissor cut), v (boil variant)
function ecTear(P, key, o = {}) {
  const Q = o.n ? ecResN(P, o.n) : resample(P, true, o.step ?? 5), N = ecNormals(Q), R = RNG('ect', key), Rv = RNG('ectv', key, o.v ?? 0);
  const amt = o.amt ?? 5, fib = o.fibre ?? 5, outer = [], inner = []; let walk = 0;
  for (let i = 0; i < Q.length; i++) {
    const k = o.side ? o.side(Q[i]) : 1;
    walk = walk * 0.8 + R.n(0.55);
    const d = (walk * amt + R.n(amt * 0.32)) * k + Rv.n(0.5), f = fib * (0.35 + R.f() * 1.0) * k;
    outer.push([Q[i][0] + N[i][0] * d, Q[i][1] + N[i][1] * d]);
    inner.push([Q[i][0] + N[i][0] * (d - f), Q[i][1] + N[i][1] * (d - f)]);
  }
  return { outer, inner };
}
// a scissor cut round an outline: straight facets at an uneven distance
function ecScissor(P, key, lo = 10, hi = 22, step = 46) {
  let L = 0; for (let i = 0; i < P.length; i++) L += dist(P[i], P[(i + 1) % P.length]);
  const Q = ecResN(P, Math.max(7, Math.round(L / step))), N = ecNormals(Q), R = RNG('ecs', key);
  return Q.map((q, i) => { const d = R.r(lo, hi); return [q[0] + N[i][0] * d, q[1] + N[i][1] * d]; });
}
// a path with a fixed hand wobble (marker lines)
function ecRough(P, amt, key, step = 7) {
  const Q = resample(P, false, step), n = Q.length, R = RNG('ecr', key);
  const f1 = R.r(0.012, 0.028), f2 = R.r(0.05, 0.1), p1 = R.r(0, TAU), p2 = R.r(0, TAU), out = new Array(n); let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    const d = amt * (0.75 * Math.sin(s * f1 + p1) + 0.35 * Math.sin(s * f2 + p2));
    out[i] = [Q[i][0] + nx / l * d, Q[i][1] + ny / l * d];
  }
  return out;
}
const ecRoundPts = (x, y, r, n = 72) => ellipsePts(x, y, r, r, 0, n);                 // bridge shapes: a round scrap ...
function ecBoxPts(x, y, w, h, rot = 0) {                                             // ... and a squarish one (centre x, y)
  return xform(resample([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], true, 12), x, y, rot);
}

// ---------------------------------------------------------------------
//  sprites: static things drawn once (keyed and seeded), then placed every frame
// ---------------------------------------------------------------------
const EC_SS = 1.25;                                // sprites are drawn a little larger than shown, so a camera push stays crisp
const EC_CACHE = new Map();
function ecCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(h)); return c; }
// draw() works in local px with (0, 0) at the sprite's centre; core helpers work inside it (ctx is the sprite's context)
function ecSprite(key, w, h, pad, draw) {
  let sp = EC_CACHE.get(key); if (sp) return sp;
  if (EC_CACHE.size > 600) EC_CACHE.clear();       // everything is rebuilt identically from its key
  const cv = ecCanvas((w + pad * 2) * EC_SS, (h + pad * 2) * EC_SS), g = cv.getContext('2d'), keep = ctx;
  g.setTransform(EC_SS, 0, 0, EC_SS, cv.width / 2, cv.height / 2);
  ctx = g; try { draw(g); } finally { ctx = keep; }
  sp = { key, cv, w: cv.width / EC_SS, h: cv.height / EC_SS, sh: null };
  EC_CACHE.set(key, sp); return sp;
}
function ecShadowOf(sp) {   // the sprite's silhouette as a soft shadow
  if (sp.sh) return sp.sh;
  const m = Math.ceil(30 * EC_SS), cv = ecCanvas(sp.cv.width + m * 2, sp.cv.height + m * 2), g = cv.getContext('2d');
  g.shadowColor = EC_DARKMODE ? 'rgba(0,0,0,1)' : 'rgba(34,24,14,1)'; g.shadowBlur = 11 * EC_SS; g.shadowOffsetX = 20000; g.drawImage(sp.cv, m - 20000, m);
  sp.sh = cv; sp.shm = m / EC_SS; return cv;
}

// ---------------------------------------------------------------------
//  motion: stop-motion on 2s. Pieces slap in from off-frame, the rotation settles in four steps, the shadow tightens.
// ---------------------------------------------------------------------
const EC_SLAP = [[0.34, 1, 1, 1.05], [-0.07, -0.42, 0.45, 1.02], [0.025, 0.16, 0.14, 1], [0, 0, 0, 1]];   // per step: [travel left, spin left, lift, scale]
const EC_OUT = [[0.06, 0.2, 0.5, 1], [0.45, 0.6, 1, 1.03], [1.25, 1, 1, 1.05]];
// o: t0 (absolute; absent = already lying there), from [dx, dy] (where it comes from, relative), spin (rad), out (absolute: it is pulled away)
function ecSlap(t0, o = {}) {
  const key = o.key ?? 'slap', R = RNG('ecsl', key);
  const from = o.from ?? R.pick([[-0.75 * W, -0.12 * H], [0.75 * W, 0.1 * H], [0.15 * W, -0.5 * H], [-0.2 * W, -0.5 * H]]), spin = o.spin ?? R.pick([-1, 1]) * R.r(0.14, 0.24);
  let row = EC_SLAP[3], n = 99;
  if (t0 != null) { if (TT < t0 - 1e-6) return null; n = Math.floor((TT - t0) / EC_STEP + 1e-6); row = EC_SLAP[Math.min(3, n)]; }
  if (o.out != null && TT >= o.out - 1e-6) { const k = Math.floor((TT - o.out) / EC_STEP + 1e-6); if (k > 2) return null; row = EC_OUT[k]; }
  return { dx: from[0] * row[0], dy: from[1] * row[0], rot: spin * row[1], lift: row[2], s: row[3], n };
}
// small things (tape, pins, labels pressed on): a one-step press. null before t0
function ecPop(t0) {
  if (t0 == null) return { s: 1, rot: 0, n: 99 };
  if (TT < t0 - 1e-6) return null;
  const n = Math.floor((TT - t0) / EC_STEP + 1e-6);
  return n === 0 ? { s: 1.16, rot: 0.07, n } : n === 1 ? { s: 0.97, rot: -0.02, n } : { s: 1, rot: 0, n };
}
// progress of a drawn mark (highlighter, marker): already one step in at t0, so the mark is visible on its cue
const ecEv = (t0, d) => (TT < t0 - 1e-6 ? 0 : clamp((TT - t0 + EC_STEP) / Math.max(d, EC_STEP)));
// place the origin at (cx, cy) for a piece: slap + the per-step jitter of a hand-moved scrap + a slow breath. Caller saves / restores.
function ecEnter(cx, cy, o, key) {
  const m = ecSlap(o.t0, { key, from: o.from, spin: o.spin, out: o.out }); if (!m) return null;
  const J = RNG('ecj', key, B), br = (o.breathe ?? 0.012) * Math.sin(TT * 0.9 + (hash(key) % 628) / 100);
  m.a = (o.rot ?? 0) + m.rot + br + J.n(0.0022);
  ctx.translate(cx + m.dx + J.n(0.45), cy + m.dy + J.n(0.45)); ctx.rotate(m.a); if (m.s !== 1) ctx.scale(m.s, m.s);
  return m;
}
function ecDrop(m, k = 1) {   // a live drop shadow for shapes drawn with fill(): far and soft while lifted, tight once down
  const l = m ? m.lift : 0;
  ctx.shadowColor = EC_DARKMODE ? 'rgba(0,0,0,0.55)' : `rgba(34,24,14,${0.34 - l * 0.12})`; ctx.shadowBlur = (7 + l * 14) * k; ctx.shadowOffsetX = (2 + l * 10) * k; ctx.shadowOffsetY = (4 + l * 22) * k;
}
function ecNoDrop() { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
// place a sprite: shadow (always falling down-right on screen), the sheet, then live(m) for text and marks that ride on it
function ecPut(sp, x, y, o = {}, live) {
  const key = o.key ?? sp.key;
  ctx.save();
  const m = ecEnter(x, y, o, key); if (!m) { ctx.restore(); return null; }
  const sh = ecShadowOf(sp), L = (o.lift ?? 1) * (5 + m.lift * 30);
  ctx.save(); ctx.rotate(-m.a); ctx.translate(L * 0.45, L); ctx.rotate(m.a); ctx.globalAlpha *= (EC_DARKMODE ? 0.6 : 0.42) - m.lift * 0.16;
  ctx.drawImage(sh, -sp.w / 2 - sp.shm, -sp.h / 2 - sp.shm, sh.width / EC_SS, sh.height / EC_SS); ctx.restore();
  ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  if (live) live(m);
  ctx.restore();
  return m;
}

// ---------------------------------------------------------------------
//  paper: stock, grain, the desk
// ---------------------------------------------------------------------
// fill the current clip with a paper stock: 'news' | 'white' | 'kraft' | 'graph' | 'legal' (or any colour)
function ecPaperFill(kind, bb, key) {
  const R = RNG('ecp', key), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  ctx.fillStyle = EC[kind] ?? kind; ctx.fillRect(bb.x0, bb.y0, w, h);
  if (kind === 'graph') {
    const g = 22, ox = R.r(0, g), oy = R.r(0, g);
    for (const [every, al, lw] of [[1, 0.3, 1], [5, 0.5, 1.5]]) {
      ctx.strokeStyle = `rgba(86,140,190,${al})`; ctx.lineWidth = lw; ctx.beginPath();
      for (let x = bb.x0 - g + ox, i = 0; x < bb.x1; x += g, i++) if (i % every === 0) { ctx.moveTo(x, bb.y0); ctx.lineTo(x, bb.y1); }
      for (let y = bb.y0 - g + oy, i = 0; y < bb.y1; y += g, i++) if (i % every === 0) { ctx.moveTo(bb.x0, y); ctx.lineTo(bb.x1, y); }
      ctx.stroke();
    }
  } else if (kind === 'legal') {
    ctx.strokeStyle = 'rgba(70,120,190,0.42)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let y = bb.y0 + R.r(18, 40); y < bb.y1; y += 40) { ctx.moveTo(bb.x0, y); ctx.lineTo(bb.x1, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214,72,60,0.55)'; ctx.beginPath();
    for (const dx of [0, 6]) { ctx.moveTo(bb.x0 + w * 0.13 + dx, bb.y0); ctx.lineTo(bb.x0 + w * 0.13 + dx, bb.y1); }
    ctx.stroke();
  } else if (kind === 'kraft') {
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (const c of ['rgba(96,62,30,0.20)', 'rgba(255,236,204,0.22)']) {
      ctx.strokeStyle = c; ctx.beginPath();
      for (let i = 0, n = Math.min(900, w * h / 420); i < n; i++) { const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), a = R.n(0.5), l = R.r(5, 26); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
      ctx.stroke();
    }
  }
  // tooth: fine specks, dark and light
  const n = Math.min(5000, Math.floor(w * h / 190));
  for (const c of ['rgba(60,45,28,0.09)', 'rgba(255,255,255,0.30)']) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < n; i++) ctx.rect(R.r(bb.x0, bb.x1), R.r(bb.y0, bb.y1), 1.5, 1.5); ctx.fill(); }
  const sh = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1); sh.addColorStop(0, 'rgba(255,255,255,0.10)'); sh.addColorStop(1, 'rgba(60,40,20,0.10)');
  ctx.fillStyle = sh; ctx.fillRect(bb.x0, bb.y0, w, h);
}
// paper fibres: short curved hairs, fixed in the sheet
function ecFibres(key, x0, y0, x1, y1, n) {
  const R = RNG('ecf', key);
  ctx.save(); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  for (const c of EC_DARKMODE ? ['rgba(255,255,255,0.07)', 'rgba(0,0,0,0.30)'] : ['rgba(96,74,50,0.17)', 'rgba(255,255,255,0.55)']) {
    ctx.strokeStyle = c; ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = R.r(x0, x1), y = R.r(y0, y1), a = R.r(0, TAU), l = R.r(8, 34), b = a + R.n(0.9); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5, x + Math.cos(b) * l, y + Math.sin(b) * l); }
    ctx.stroke();
  }
  ctx.restore();
}
// the ground of a scene (world coords, drawn wide so a camera drift never shows an edge). o: c, key, fibres
function ecDesk(o = {}) {
  const m = Math.max(W, H) * 0.3;
  ctx.fillStyle = o.c ?? EC.desk; ctx.fillRect(-m, -m, W + 2 * m, H + 2 * m);
  ecFibres(o.key ?? 'desk', -m, -m, W + m, H + m, o.fibres ?? 170);
}
// grain over the finished frame, shifted every step, and a faint lamp vignette
function ecGrain() {
  const M = 160, key = 'grain:' + W + 'x' + H; let cv = EC_CACHE.get(key);
  if (!cv) {
    cv = ecCanvas(W + M, H + M); const g = cv.getContext('2d'), R = RNG('ecgrain'), n = Math.floor(cv.width * cv.height / 105);
    for (const [c, s] of EC_DARKMODE ? [['rgba(255,255,255,0.055)', 2], ['rgba(0,0,0,0.20)', 2]] : [['rgba(62,46,28,0.15)', 2], ['rgba(255,252,244,0.2)', 2.2]]) {
      g.fillStyle = c; g.beginPath(); for (let i = 0; i < n; i++) g.rect(R.r(0, cv.width), R.r(0, cv.height), s, s); g.fill();
    }
    EC_CACHE.set(key, cv);
  }
  let vg = EC_CACHE.get('vig:' + key);
  if (!vg) {
    vg = ecCanvas(W, H); const g = vg.getContext('2d'), gr = g.createRadialGradient(W * 0.46, H * 0.44, Math.min(W, H) * 0.45, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62);
    gr.addColorStop(0, 'rgba(40,28,14,0)'); gr.addColorStop(1, EC_DARKMODE ? 'rgba(0,0,0,0.42)' : 'rgba(40,28,14,0.20)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    EC_CACHE.set('vig:' + key, vg);
  }
  const R = RNG('ecgo', B);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(vg, 0, 0); ctx.drawImage(cv, -R.i(0, M), -R.i(0, M)); ctx.restore();
}

// ---------------------------------------------------------------------
//  halftone
// ---------------------------------------------------------------------
// a monochrome dot screen over box bb in the current clip: tone(x, y) -> 0 (white) .. 1 (solid). o: pitch, angle, c
function ecHalftone(bb, tone, o = {}) {
  const p = o.pitch ?? 10, a = o.angle ?? Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
  const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, n = Math.ceil((Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + p) / p);
  ctx.fillStyle = o.c ?? EC.ink; ctx.beginPath();
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const x = cx + (i * ca - j * sa) * p, y = cy + (i * sa + j * ca) * p;
    if (x < bb.x0 - p || x > bb.x1 + p || y < bb.y0 - p || y > bb.y1 + p) continue;
    const t = clamp(tone(x, y)); if (t < 0.03) continue;
    const r = Math.min(p * 0.6, p * Math.sqrt(t / Math.PI) * 1.04);
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
}

// ---------------------------------------------------------------------
//  subjects: generic outlines drawn in code, each with a tone map, so a piece has "photo" material.
//  Units are arbitrary (about 100 tall); a cut-out scales the outline's box to the size asked for.
//  { P: outline, sharp: straight edges, tone(u, v, opt) -> 0..1 }
// ---------------------------------------------------------------------
function ecFinger(bx, by, ang, len, w, n = 6) {   // base (bx, by), pointing along ang (0 = up): up one side, round the tip, down the other
  const dx = Math.sin(ang), dy = -Math.cos(ang), px = dy, py = -dx, h = w / 2, cx = bx + dx * (len - h), cy = by + dy * (len - h), P = [[bx + px * h, by + py * h]];
  for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; P.push([cx + px * Math.cos(t) * h + dx * Math.sin(t) * h, cy + py * Math.cos(t) * h + dy * Math.sin(t) * h]); }
  P.push([bx - px * h, by - py * h]); return P;
}
const EC_SUBJECTS = {
  // head and shoulders in a jacket, shirt and tie; a redaction bar over the eyes (opt.bar === false: none)
  bust: {
    P: [[-46, 50], [-46, 30], [-41, 16], [-26, 7], [-9, 2], [-8, -5], ...ellipsePts(0, -25, 19, 23, 0, 24, 116 * DEG, 424 * DEG), [8, -5], [9, 2], [26, 7], [41, 16], [46, 30], [46, 50]],
    tone(u, v, opt) {
      if ((u / 19) ** 2 + ((v + 25) / 23) ** 2 < 1.04 && v < -4) {
        if (v < -37 + 9 * smooth(7, 17, Math.abs(u - 3))) return 0.95;   // hair: a fringe, lower at the temples
        if ((!opt || opt.bar !== false) && v > -31.5 && v < -24) return 1;                     // the bar
        return 0.14 + 0.3 * smooth(-4, 19, u) + 0.32 * smooth(-12, -4, v);                    // a face lit from the left
      }
      if (v < 5 && Math.abs(u) < 10) return 0.6;                                              // neck
      if (v > 2 && Math.abs(u) < 11.5 - (v - 3) * 0.3) return Math.abs(u) < 2.7 && v > 9 ? 0.92 : 0.06;   // tie on a white shirt
      return 0.76 + 0.17 * smooth(-40, 40, u);                                                // jacket
    },
  },
  // an open raised hand with a cuff
  hand: {
    P: [[-18, 50], [-18, 38], [-13, 36], [-20, 25], ...ecFinger(-20, 15, -0.78, 27, 11.5), [-21.8, -2],
      ...ecFinger(-17, -6, -0.08, 30, 9.6), ...ecFinger(-6.3, -6, -0.02, 38, 9.6), ...ecFinger(4.4, -6, 0.04, 35, 9.6), ...ecFinger(15, -6, 0.12, 26, 9.4),
      [20, -3], [20, 22], [13, 36], [16, 38], [16, 50]],
    tone: (u, v) => (v > 37.5 ? 0.93 : 0.2 + 0.34 * smooth(-22, 20, u) + 0.12 * smooth(-10, 34, v)),
  },
  // a civic building: pediment, columns, steps
  building: {
    sharp: true,
    P: [[-50, 50], [-50, 43], [-46, 43], [-46, 36], [-41, 36], [-41, -14], [-47, -14], [-47, -21], [0, -47], [47, -21], [47, -14], [41, -14], [41, 36], [46, 36], [46, 43], [50, 43], [50, 50]],
    tone(u, v) {
      if (v < -21) return v > -47 + Math.abs(u) * 26 / 47 + 6 && v < -24 ? 0.28 : 0.7;        // pediment with a pale field
      if (v < -14) return 0.86;                                                               // entablature
      if (v > 43) return 0.6; if (v > 36) return 0.34;                                        // steps
      if (v < -10.5 || v > 32.5) return 0.5;                                                  // capitals, bases
      const c = Math.round(u / 16) * 16, du = u - c;
      return Math.abs(c) <= 32 && Math.abs(du) < 5.2 ? 0.1 + 0.34 * smooth(-2, 5.2, du) : 0.93;   // lit columns in a dark porch
    },
  },
  // a row of towers in three greys, floor bands on the pale ones, haze at street level
  skyline: (() => {
    const T = [[-70, -2], [-58, -20], [-46, -8], [-38, -34], [-26, -14], [-16, -44], [-4, -22], [6, -6], [14, -30], [28, -12], [38, -24], [50, -4], [60, -14], [70, 0]], P = [[-70, 40]];
    for (let i = 0; i < T.length - 1; i++) P.push([T[i][0], T[i][1]], [T[i + 1][0], T[i][1]]);
    P.push([70, 40]);
    return { sharp: true, P, tone(u, v) {
      let i = 0; while (i < T.length - 2 && u >= T[i + 1][0]) i++;
      const lv = v - T[i][1], g = [0.97, 0.5, 0.8][i % 3];
      return (i % 3 === 1 && lv > 3 && mod(lv, 8) < 3 ? 0.9 : g) - 0.2 * smooth(8, 40, v);
    } };
  })(),
  // a megaphone pointing right
  megaphone: {
    sharp: true,
    P: [[-52, -6], [-44, -9], [26, -34], [30, -40], ...ellipsePts(37, 0, 7, 40, 0, 12, -90 * DEG, 90 * DEG), [30, 40], [26, 34], [-8, 22], [-6, 44], [-22, 44], [-22, 17], [-44, 9], [-52, 6]],
    tone(u, v) {
      if (u < -44) return 0.94;
      if (u > 27) return 0.95 - 0.6 * Math.exp(-(((v + 14) / 9) ** 2));                        // the bell's rim
      const hh = lerp(9, 34, (u + 44) / 70); if (v > hh + 0.5) return 0.93;                    // the grip
      if (u > -8 && u < 0) return 0.88;                                                       // a band
      return 0.12 + 0.62 * Math.abs(v / hh + 0.35) ** 1.25;                                   // a lit cone
    },
  },
  // a globe on a stand
  globe: {
    P: [...ellipsePts(0, -12, 36, 36, 0, 40, 105 * DEG, 435 * DEG), [6, 34], [22, 41], [26, 50], [-26, 50], [-22, 41], [-6, 34]],
    tone(u, v) {
      const d = Math.hypot(u, v + 12) / 36; if (d > 1.02 || v > 25) return 0.93;
      const land = Math.sin(u * 0.17 + 1.3) + Math.sin(v * 0.2 + u * 0.08) + Math.sin((u - v) * 0.12 + 2.1) > 0.7;
      return 0.1 + 0.42 * smooth(0.25, 1.6, Math.hypot(u + 13, v + 25) / 36) + (land ? 0.46 : 0) + (d > 0.93 ? 0.3 : 0);
    },
  },
  // a stack of coins
  coins: (() => {
    const N = 6, T = 13, rx = 30, ry = 8, ox = [0, 2, -1, 2, 0, 1], y0 = 40, top = y0 - N * T, P = [];
    for (let i = 0; i < N; i++) P.push([ox[i] - rx, y0 - i * T], [ox[i] - rx, y0 - (i + 1) * T]);
    P.push(...ellipsePts(ox[N - 1], top, rx, ry, 0, 14, Math.PI, TAU));
    for (let i = N - 1; i >= 0; i--) P.push([ox[i] + rx, y0 - (i + 1) * T], [ox[i] + rx, y0 - i * T]);
    P.push(...ellipsePts(ox[0], y0, rx, ry, 0, 14, 0, Math.PI));
    return { sharp: true, P, tone(u, v) {
      const dt = Math.hypot((u - ox[N - 1]) / rx, (v - top) / ry);
      if (dt < 1) return dt > 0.6 && dt < 0.78 ? 0.62 : 0.1 + 0.14 * smooth(-30, 30, u);       // the top face and its rim
      const vv = v - ry * Math.sqrt(Math.max(0, 1 - (u / (rx + 4)) ** 2)), f = mod(y0 - vv, T) / T;
      return f < 0.2 ? 0.97 : f > 0.72 ? 0.16 + 0.3 * smooth(-10, 32, u) : 0.46 + 0.36 * smooth(-16, 32, u);   // each coin: a lit rim, a darker edge, a black line under it
    } };
  })(),
  // a phone with a lit screen
  phone: {
    P: rrectPts(-25, -50, 50, 100, 7, 6),
    tone(u, v) {
      if (Math.abs(u) > 21.4 || Math.abs(v) > 46 || (Math.abs(u) < 6 && v < -42.5)) return 0.95;   // bezel, camera
      for (const c of [-33, -18, -3]) if (v > c && v < c + 11.5 && Math.abs(u) < 18) return u < -10.5 ? 0.82 : (u < 13 && (Math.abs(v - c - 3.6) < 1 || Math.abs(v - c - 7.6) < 1) ? 0.66 : 0.3);   // message cards
      if (v > 33 && Math.hypot(mod(u + 21.4, 10.7) - 5.35, v - 39.5) < 3.5) return 0.72;       // the dock
      return 0.05 + 0.1 * smooth(-46, 46, v);
    },
  },
  // an alarm clock (two bells, a hammer, two feet); draw the hands live with ecClockHands in o.over
  clock: (() => {
    const pol = (r, a) => [Math.cos(a) * r, Math.sin(a) * r], U = -Math.PI / 2;
    const parts = [[...pol(42, U - 0.62), 12.5], [...pol(42, U + 0.62), 12.5], [...pol(40, U), 4.5], [...pol(38, -U - 0.62), 6.5], [...pol(38, -U + 0.62), 6.5]], P = [];   // circles round the case: [x, y, r] from its centre (0, 6)
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * TAU, dx = Math.cos(a), dy = Math.sin(a); let r = 36;
      for (const [x, y, q] of parts) { const b = dx * x + dy * y, disc = q * q - (x * x + y * y - b * b); if (b > 0 && disc >= 0) r = Math.max(r, b + Math.sqrt(disc)); }
      P.push([dx * r, 6 + dy * r]);
    }
    return { P, tone(u, v) {
      const d = Math.hypot(u, v - 6);
      if (d > 36.6) {
        if (v > 6 || Math.abs(u) < 5) return 0.95;                                            // feet, the hammer
        if (d < 39.4) return 0.06;                                                            // the bells stand clear of the case
        const bx = Math.sign(u) * parts[1][0], by = 6 + parts[1][1];
        return 0.93 - 0.5 * Math.exp(-((u - bx + 4) ** 2 + (v - by + 5) ** 2) / 22);          // two bells, each with a highlight
      }
      if (d > 30) return 0.93;                                                                // the case
      const k = Math.abs(mod(Math.atan2(v - 6, u) / (TAU / 12) + 0.5, 1) - 0.5) * (TAU / 12) * d;
      return d > 22.5 && d < 27.5 && k < 1.3 ? 0.96 : 0.04 + 0.14 * smooth(-30, 30, u + v);    // hour marks on a white face
    } };
  })(),
};
// clock hands for o.over on the 'clock' subject: (at, k) come from ecCutout; h, m, s in clock units (s optional)
function ecClockHands(at, k, h, m, s) {
  const [cx, cy] = at(0, 6); ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = EC.ink;
  const hand = (frac, len, w) => { const a = frac * TAU - Math.PI / 2; ctx.lineWidth = w * k; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 3 * k, cy - Math.sin(a) * 3 * k); ctx.lineTo(cx + Math.cos(a) * len * k, cy + Math.sin(a) * len * k); ctx.stroke(); };
  hand(((h % 12) + m / 60) / 12, 14, 3.4); hand(m / 60, 21, 2.4); if (s != null) hand(s / 60, 23, 1);
  ctx.fillStyle = EC.ink; ctx.beginPath(); ctx.arc(cx, cy, 2.6 * k, 0, TAU); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  cut-outs: any outline as a halftone "photo" with an uneven white scissor-cut border and a drop shadow
// ---------------------------------------------------------------------
// subject = a name in EC_SUBJECTS, a { P, tone, sharp } or a plain outline [[x, y], ...]. (x, y) = centre, size = height in px.
// o: rot, t0, from, spin, out, tint ('ink' | 'steel' | a colour), pitch, tone(u, v), opt (passed to the tone map), key,
//    border (px), lift, breathe, over(at, k) = live drawing on top in the cut-out's own frame (at(u, v) -> local px)
function ecCutout(subject, x, y, size, o = {}) {
  const name = typeof subject === 'string' ? subject : null, sub = name ? EC_SUBJECTS[name] : Array.isArray(subject) ? { P: subject } : subject;
  if (!sub) throw new Error('ecCutout: unknown subject ' + subject);
  const bb = bbox(sub.P), k = size / (bb.y1 - bb.y0), c0 = [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2], w = (bb.x1 - bb.x0) * k;
  const tint = o.tint === 'steel' ? EC.steel : o.tint && o.tint !== 'ink' ? o.tint : EC.ink, pitch = o.pitch ?? 10, bd = o.border ?? 1;
  const key = o.key ?? 'cut:' + (name ?? hash(JSON.stringify(sub.P)));
  const sp = ecSprite([key, Math.round(size), tint, pitch, bd, JSON.stringify(o.opt ?? 0), o.tone ? 't' : ''].join('|'), w, size, 30 * bd + 8, () => {
    const P = sub.P.map(([u, v]) => [(u - c0[0]) * k, (v - c0[1]) * k]), lb = bbox(P);
    const tone = o.tone ?? sub.tone ?? ((u, v) => 0.3 + 0.5 * (v - bb.y0) / (bb.y1 - bb.y0));
    // the white margin the scissors left: straight facets at an uneven distance, never thinner than 9px
    ecPoly(ecScissor(P, key, 11 * bd, 24 * bd)); ctx.fillStyle = EC.white; ctx.fill();
    ecOutline(P, sub.sharp); ctx.lineJoin = 'round'; ctx.lineWidth = 18 * bd; ctx.strokeStyle = EC.white; ctx.stroke(); ctx.fill();
    // the print: a pale ground of its ink, then the dot screen
    ctx.save(); ecOutline(P, sub.sharp); ctx.clip();
    ctx.fillStyle = tint; ctx.globalAlpha = 0.13; ctx.fillRect(lb.x0, lb.y0, lb.x1 - lb.x0, lb.y1 - lb.y0); ctx.globalAlpha = 1;
    ecHalftone(lb, (px, py) => tone(px / k + c0[0], py / k + c0[1], o.opt), { pitch, c: tint });
    ctx.restore();
  });
  const at = (u, v) => [(u - c0[0]) * k, (v - c0[1]) * k];
  const m = ecPut(sp, x, y, { ...o, key }, o.over ? () => o.over(at, k) : null);
  return m ? { m, k, at, w, h: size } : null;
}

// ---------------------------------------------------------------------
//  scraps: torn paper, a newspaper clipping, an index card, a label strip
// ---------------------------------------------------------------------
// a sheet of w x h centred on (x, y). kind = the stock. o: rot, t0, from, spin, out, key, round (an ellipse),
//   P (own outline, local coords), tear [top, right, bottom, left] 0..1 (default all torn), amt, fibre,
//   bake(w, h) = static drawing baked into the sheet (clipped to it), draw(w, h, m) = live drawing on it (text, marks)
function ecScrap(kind, x, y, w, h, o = {}) {
  const key = o.key ?? ['scrap', kind, w, h].join(':'), v = B % 3, tr = o.tear ?? [1, 1, 1, 1];
  const sp = ecSprite([key, kind, w, h, o.round ? 'r' : '', tr.join(), v].join('|'), w, h, 22, () => {
    const P = o.P ?? (o.round ? ellipsePts(0, 0, w / 2, h / 2, 0, 80) : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
    const side = o.round || o.P ? null : (p) => { const dT = p[1] + h / 2, dB = h / 2 - p[1], dL = p[0] + w / 2, dR = w / 2 - p[0], mn = Math.min(dT, dB, dL, dR); return mn === dT ? tr[0] : mn === dR ? tr[1] : mn === dB ? tr[2] : tr[3]; };
    const T = ecTear(P, key, { amt: o.amt ?? 5, fibre: o.fibre ?? 6, side, v });
    ecPoly(T.outer); ctx.fillStyle = EC.fibre; ctx.fill();
    ctx.save(); ecPoly(T.inner); ctx.clip(); ecPaperFill(kind, { x0: -w / 2 - 14, y0: -h / 2 - 14, x1: w / 2 + 14, y1: h / 2 + 14 }, key); if (o.bake) o.bake(w, h); ctx.restore();
    ecPoly(T.outer); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,50,30,0.14)'; ctx.stroke();
  });
  return ecPut(sp, x, y, { ...o, key }, o.draw ? (m) => o.draw(w, h, m) : null);
}
// greeked text: grey bars in a column, never fake words. Baked into sheets. o: lh, bar, c
function ecGreek(x, y, w, h, key, o = {}) {
  const R = RNG('ecgk', key), lh = o.lh ?? 15, bar = o.bar ?? 6; let left = R.i(3, 7), first = true;
  ctx.fillStyle = o.c ?? EC.grey; ctx.beginPath();
  for (let yy = y; yy + bar <= y + h; yy += lh) {
    if (left < 0) { left = R.i(3, 8); first = true; continue; }                       // a paragraph break
    const ind = first ? 12 : 0; ctx.rect(x + ind, yy, (w - ind) * (left === 0 ? R.r(0.35, 0.8) : R.r(0.94, 1)), bar);   // indent, ragged last line
    first = false; left--;
  }
  ctx.fill();
}
// a newspaper clipping: the real headline passed in, a rule, columns of greeked text, an optional halftone picture.
// o: size (headline px), cols, image (true | a subject name), kicker (a real short line in caps, optional), tear, + everything ecScrap takes
function ecClipping(headline, x, y, w, h, o = {}) {
  const key = o.key ?? 'clip:' + headline, pad = 26, size = o.size ?? 44, mw = w - pad * 2;
  const lines = ecWrap(headline, size, mw, 'serif', 900), top = -h / 2 + pad + (o.kicker ? 40 : 14), hy = top + size * 0.86, hb = hy + (lines.length - 1) * size * 1.08 + size * 0.34;
  return ecScrap('news', x, y, w, h, { tear: [0.12, 1, 1, 0.12], ...o, key,
    bake: () => {
      ctx.fillStyle = EC.ink; ctx.fillRect(-w / 2 + pad, -h / 2 + pad - 8, mw, 3); ctx.fillRect(-w / 2 + pad, -h / 2 + pad - 2, mw, 1.2);      // the masthead's double rule
      ctx.fillRect(-w / 2 + pad, hb, mw, 1.6);                                                                                                // the rule under the headline
      const cols = o.cols ?? (mw > 380 ? 3 : 2), gap = 16, cw = (mw - gap * (cols - 1)) / cols, y0 = hb + 18;
      for (let c = 0; c < cols; c++) {
        const cx = -w / 2 + pad + c * (cw + gap); let yy = y0;
        if (o.image && c === 0) {
          const ih = cw * 0.8, bb = { x0: cx, y0: yy, x1: cx + cw, y1: yy + ih }, sub = typeof o.image === 'string' ? EC_SUBJECTS[o.image] : null;
          ctx.save(); ctx.beginPath(); ctx.rect(cx, yy, cw, ih); ctx.clip(); ctx.fillStyle = '#e6e2d8'; ctx.fillRect(cx, yy, cw, ih);
          ecHalftone(bb, (px, py) => { const u = (px - cx) / cw, v = (py - yy) / ih; return v > 0.62 + 0.1 * Math.sin(u * 7 + 1) ? 0.86 : 0.14 + 0.3 * v + (Math.hypot(u - 0.7, v - 0.3) < 0.14 ? -0.2 : 0); }, { pitch: 7 });
          if (sub) { const sb = bbox(sub.P), k = ih * 0.86 / (sb.y1 - sb.y0), ox = cx + cw / 2 - (sb.x0 + sb.x1) / 2 * k, oy = yy + ih * 0.57 - (sb.y0 + sb.y1) / 2 * k; ecOutline(sub.P.map(([a, b]) => [ox + a * k, oy + b * k]), sub.sharp); ctx.clip(); ctx.fillStyle = '#e6e2d8'; ctx.fillRect(cx, yy, cw, ih); ecHalftone(bb, (px, py) => sub.tone((px - ox) / k, (py - oy) / k), { pitch: 7 }); }
          ctx.restore(); yy += ih + 14;
        }
        ecGreek(cx, yy, cw, h / 2 + 30 - yy, key + c);
        if (c) { ctx.fillStyle = 'rgba(25,25,25,0.25)'; ctx.fillRect(cx - gap / 2, y0, 1, h); }
      }
    },
    draw: (ww, hh, m) => {
      if (o.kicker) ecText(o.kicker, -w / 2 + pad, -h / 2 + pad + 30, 30, EC.ink, { font: 'cond', weight: 700, track: 1.5 });
      lines.forEach((l, i) => ecText(l, -w / 2 + pad, hy + i * size * 1.08, size, EC.ink, { font: 'serif', weight: 900 }));
      if (o.draw) o.draw(ww, hh, m);
    } });
}
// an index card: white, a red head rule, blue lines; typed lines sit on the rules (30px type, 40px pitch).
// lines = ['text', ...]. o: size, title (typed above the red rule), + ecScrap's placement options; o.draw(w, h, m, lineY) for marks on it
function ecCard(lines, x, y, w, h, o = {}) {
  const key = o.key ?? 'card:' + lines.join('|'), size = o.size ?? 30, pitch = size * 1.34, y0 = -h / 2 + 58, lineY = (i) => y0 + (i + 1) * pitch - 8;
  return ecScrap('white', x, y, w, h, { amt: 0.5, fibre: 0, ...o, key,
    P: rrectPts(-w / 2, -h / 2, w, h, 9, 4),
    bake: () => {
      ctx.fillStyle = 'rgba(214,72,60,0.7)'; ctx.fillRect(-w / 2, y0, w, 2.4);
      ctx.fillStyle = 'rgba(70,120,190,0.42)'; for (let yy = y0 + pitch; yy < h / 2 - 8; yy += pitch) ctx.fillRect(-w / 2, yy, w, 1.6);
    },
    draw: (ww, hh, m) => { if (o.title) ecText(o.title, -w / 2 + 24, y0 - 16, size, EC.ink, { font: 'type', weight: 700 }); lines.forEach((l, i) => ecText(l, -w / 2 + 24, lineY(i), size, EC.ink, { font: 'type', weight: 700 })); if (o.draw) o.draw(ww, hh, m, lineY); } });
}
// a label-maker strip: white condensed caps on black (o.c: EC.red for the red one). (x, y) = left end, vertical centre
// (o.align 'center': x is the middle). Returns its box { x, y, w, h, cx, cy, right }.
function ecLabel(str, x, y, size, o = {}) {
  const key = o.key ?? 'lab:' + str, tr = size * 0.07, tw = ecTextW(str, size, 'cond', 700, tr), w = tw + size * 0.95, h = size * 1.5;
  const cx = o.align === 'center' ? x : x + w / 2, box = { x: cx - w / 2, y: y - h / 2, w, h, cx, cy: y, right: cx + w / 2 };
  ctx.save();
  const m = ecEnter(cx, y, { from: [-150, 0], spin: 0.09, breathe: 0.004, rot: -0.015, ...o }, key); if (!m) { ctx.restore(); return box; }
  const R = RNG('eclb', key), q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a * w / 2 + R.n(2), b * h / 2 + R.n(1.6)]);
  ecDrop(m, 0.6); ecPoly(q); ctx.fillStyle = o.c ?? EC.ink; ctx.fill(); ecNoDrop();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.3);     // the tape's sheen
  ecText(str, -tw / 2, size * 0.355, size, EC.white, { font: 'cond', weight: 700, track: tr });
  ctx.restore(); return box;
}
// one headline word on its own cut strip. (x, y) = the strip's left edge and the text baseline.
// o: t0, hi (absolute time: the highlighter sweeps the word), paper, c, rot, key, from, out. Returns { x, y, w, h, top, cx, cy, right, bottom }.
function ecStrip(str, x, y, size, o = {}) {
  const key = o.key ?? 'strip:' + str, tw = ecTextW(str, size, 'serif', 900), px = size * 0.2, w = tw + px * 2, h = size * 1.24, top = y - size * 0.93;
  const box = { x, y, w, h, top, cx: x + w / 2, cy: top + h / 2, right: x + w, bottom: top + h }, R = RNG('ecst', key);
  ctx.save();
  const m = ecEnter(box.cx, box.cy, { from: [R.n(50), -170], spin: R.pick([-1, 1]) * 0.17, breathe: 0.005, rot: R.n(0.02), ...o }, key); if (!m) { ctx.restore(); return box; }
  const j = size * 0.035, q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a * w / 2 + R.n(j), b * h / 2 + R.n(j)]);
  ecDrop(m, 0.8); ecPoly(q); ctx.fillStyle = o.paper ?? EC.white; ctx.fill(); ecNoDrop();
  ecPoly(q); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,50,30,0.16)'; ctx.stroke();
  ecText(str, -tw / 2, y - box.cy, size, o.c ?? EC.ink, { font: 'serif', weight: 900 });
  if (o.hi != null) ecHighlight(-tw / 2 - size * 0.07, y - box.cy - size * 0.8, tw + size * 0.14, size * 1.02, o.hi, { key: key + 'hl' });
  ctx.restore(); return box;
}
// a headline, each word on its own strip. lines = ['two words', [{ s: 'word', t0, hi }, 'word'], ...]; (x, y) = first baseline's left.
// o: t0 + stagger (each word lands a stagger later), lh, gap, paper, out. Returns the word boxes in reading order.
function ecHeadline(lines, x, y, size, o = {}) {
  const out = []; let t = o.t0, yy = y;
  lines.forEach((line, li) => {
    let xx = x + (o.indent ? o.indent[li] ?? 0 : 0);
    (typeof line === 'string' ? line.split(' ') : line).forEach((wd, wi) => {
      const it = typeof wd === 'string' ? { s: wd } : wd, R = RNG('echd', it.s, li, wi);
      const b = ecStrip(it.s, xx, yy + R.n(size * 0.035), it.size ?? size, { t0: it.t0 ?? t, hi: it.hi, paper: it.paper ?? o.paper, key: 'hd' + li + ':' + wi + it.s, out: o.out });
      out.push(b); xx = b.right + (o.gap ?? size * 0.05); if (t != null) t += o.stagger ?? 0.25;
    });
    yy += o.lh ?? size * 1.4;
  });
  return out;
}

// ---------------------------------------------------------------------
//  fixings: masking tape, a paper clip, a push pin, a staple. Each takes o.t0 and is pressed on in one step.
// ---------------------------------------------------------------------
// a strip of masking tape centred on (x, y), len long, turned by rot. o: w, t0, c, flutter (false: the end stays down), key
function ecTape(x, y, len, rot = 0, o = {}) {
  const p = ecPop(o.t0); if (!p) return;
  const key = o.key ?? 'tape:' + Math.round(x) + ':' + Math.round(y), w = o.w ?? 44, hl = len / 2, hw = w / 2, R = RNG('ectp', key);
  const end = (ex, sx) => { const P = []; for (let i = 0; i <= 6; i++) P.push([ex + sx * (i % 2 ? R.r(0, 2) : R.r(3, 8)), -hw + w * i / 6]); return P; };   // a ragged end, top to bottom
  // idle life: now and then the right end lifts for a few steps
  const fl = o.flutter === false ? 0 : [0, 0, 0, 0, 0, 0.1, 0.24, 0.14, 0.05, 0, 0, 0][(B + hash(key) % 12) % 12], split = hl * 0.42;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + p.rot); ctx.scale(p.s, p.s);
  const body = (x0, x1, endR) => { const L = x0 === -hl ? end(-hl, -1) : [[x0, -hw], [x0, hw]], Rr = endR ? end(x1, 1) : [[x1, -hw], [x1, hw]]; ecPoly([...L, ...Rr.slice().reverse()]); };
  const paintTape = (x0, x1, lifted) => {
    ctx.shadowColor = `rgba(34,24,14,${lifted ? 0.3 : 0.2})`; ctx.shadowBlur = lifted ? 9 : 3; ctx.shadowOffsetX = lifted ? 4 : 1; ctx.shadowOffsetY = lifted ? 8 : 2;
    ctx.fillStyle = o.c ?? EC.tape; ctx.fill(); ecNoDrop();
    ctx.fillStyle = lifted ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)'; ctx.fillRect(x0, -hw + 3, x1 - x0, w * 0.26);
    ctx.strokeStyle = 'rgba(120,96,50,0.16)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 4; i++) { const cx = lerp(x0, x1, R.r(0.1, 0.9)); ctx.moveTo(cx, -hw + 2); ctx.lineTo(cx + R.n(5), hw - 2); } ctx.stroke();
  };
  if (fl > 0) { body(-hl, split, false); paintTape(-hl, split, false); ctx.translate(split, 0); ctx.rotate(-fl); ctx.scale(1 - fl * 0.5, 1); body(0, hl - split, true); paintTape(0, hl - split, true); }
  else { body(-hl, hl, true); paintTape(-hl, hl, false); }
  ctx.restore();
}
// a push pin seen from above, with its tiny shadow. o: c (default steel: red and yellow are for pointing), t0
function ecPin(x, y, r = 13, o = {}) {
  const p = ecPop(o.t0); if (!p) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(p.s, p.s);
  ctx.fillStyle = 'rgba(30,20,10,0.32)'; ctx.beginPath(); ctx.ellipse(r * 0.55, r * 0.8, r * 1.05, r * 0.62, 0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = o.c ?? EC.steel; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.beginPath(); ctx.arc(0, 0, r, 0.15, 2.3); ctx.arc(-r * 0.22, -r * 0.3, r * 0.95, 2.1, 0.3, true); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.36, r * 0.24, 0, TAU); ctx.fill();
  ctx.restore();
}
// a paper clip, s = its length in px
function ecClip(x, y, s = 90, rot = 0, o = {}) {
  const p = ecPop(o.t0); if (!p) return;
  const k = s / 90, path = () => { ctx.beginPath(); ctx.moveTo(-13, 26); ctx.lineTo(-13, -30); ctx.arc(0, -30, 13, Math.PI, 0); ctx.lineTo(13, 34); ctx.arc(3, 34, 10, 0, Math.PI); ctx.lineTo(-7, -20); ctx.arc(0, -20, 7, Math.PI, 0); ctx.lineTo(7, 22); };
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + p.rot); ctx.scale(k * p.s, k * p.s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(2.5, 4); path(); ctx.strokeStyle = 'rgba(30,20,10,0.28)'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
  path(); ctx.strokeStyle = o.c ?? '#868b92'; ctx.lineWidth = 4.2; ctx.stroke();
  ctx.translate(-0.9, -0.9); path(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.restore();
}
// a staple
function ecStaple(x, y, len = 38, rot = 0, o = {}) {
  const p = ecPop(o.t0); if (!p) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + p.rot); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,20,10,0.3)'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-len / 2 + 1.5, 3); ctx.lineTo(len / 2 + 1.5, 3); ctx.stroke();
  ctx.strokeStyle = '#8d9198'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-len / 2 + 3, -1); ctx.lineTo(len / 2 - 3, -1); ctx.stroke();
  ctx.fillStyle = 'rgba(30,20,10,0.4)'; ctx.fillRect(-len / 2 - 2, -2.5, 3, 5); ctx.fillRect(len / 2 - 1, -2.5, 3, 5);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  pointing: the yellow highlighter and the red marker. Every mark starts at an absolute t0.
// ---------------------------------------------------------------------
// a highlighter sweep over the box (x, y = top left), drawn left to right, rough at both ends, multiplied onto the paper.
// o: d (0.3), c, key. Returns its progress 0..1. Use it on paper (on the bare dark board it would vanish).
function ecHighlight(x, y, w, h, t0, o = {}) {
  const f = EZ.o2(ecEv(t0, o.d ?? 0.3)); if (f <= 0) return 0;
  const key = o.key ?? 'hl:' + Math.round(x) + ':' + Math.round(y) + ':' + Math.round(w), R = RNG('echl', key), x1 = x + w * f, sl = R.n(h * 0.05), n = Math.max(3, Math.round(w * f / 40));
  const edge = (yy, amp) => { const P = []; for (let i = 0; i <= n; i++) { const u = i / n; P.push([lerp(x, x1, u), yy + sl * (u * w * f / w - 0.5) + Math.sin(u * w * f * 0.021 + R.r(0, 6)) * amp]); } return P; };
  const band = (y0, y1, al, inL, inR) => {
    const T = edge(y0, h * 0.035), Bt = edge(y1, h * 0.045).reverse(), endR = [[x1 + inR + R.r(2, 9), lerp(y0, y1, 0.3)], [x1 + inR - R.r(0, 5), lerp(y0, y1, 0.62)], [x1 + inR + R.r(0, 6), lerp(y0, y1, 0.85)]], endL = [[x - inL - R.r(0, 7), lerp(y0, y1, 0.75)], [x - inL + R.r(0, 4), lerp(y0, y1, 0.4)], [x - inL - R.r(1, 6), lerp(y0, y1, 0.15)]];
    ecPoly([...T, ...endR, ...Bt, ...endL]); ctx.globalAlpha *= al; ctx.fill(); ctx.globalAlpha /= al;
  };
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.c ?? EC.yellow;
  band(y, y + h, 0.86, 0, 0); band(y + h * 0.1, y + h * 0.58, 0.3, -6, -10);       // one pass, plus where the nib overlapped itself
  ctx.restore(); return f;
}
// a red marker line along path P, drawn on from t0 over o.d (0.4s). o: w (9), c, amt, key, raw. Returns its progress.
function ecMarker(P, t0, o = {}) {
  const f = ecEv(t0, o.d ?? 0.4); if (f <= 0) return 0;
  const key = o.key ?? 'mk:' + Math.round(P[0][0]) + ':' + Math.round(P[0][1]), w = o.w ?? 9, Q = subPath(o.raw ? P : ecRough(P, o.amt ?? 2.2, key), f);
  if (Q.length < 2) return f;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = EC_DARKMODE ? 'source-over' : 'multiply'; ctx.strokeStyle = o.c ?? EC.red; ctx.lineWidth = w; ctx.globalAlpha *= 0.95; trace(Q, false); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(255,255,255,0.17)'; ctx.lineWidth = w * 0.2; ctx.translate(-w * 0.2, -w * 0.22); trace(Q, false); ctx.stroke();   // the felt tip's dry streak
  ctx.restore(); return f;
}
// a hand-drawn loop round (x, y) that starts a little inside and overshoots its start. o: d (0.4), a0, turns, tilt, w, key
function ecCircle(x, y, rx, ry, t0, o = {}) {
  const key = o.key ?? 'circ:' + Math.round(x) + ':' + Math.round(y), R = RNG('ecc', key), a0 = o.a0 ?? -2.3 + R.n(0.3), turns = o.turns ?? 1.13, tilt = o.tilt ?? -0.07, n = 60, P = [];
  const p1 = R.r(0, 6), ct = Math.cos(tilt), st = Math.sin(tilt);
  for (let i = 0; i <= n; i++) { const u = i / n, a = a0 + u * TAU * turns, k = 0.94 + 0.12 * u + 0.025 * Math.sin(u * 8 + p1), px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k; P.push([x + px * ct - py * st, y + px * st + py * ct]); }
  return ecMarker(P, t0, { d: 0.4, amt: 1.6, ...o, key });
}
// an underline from (x, y), w long. o.double: it comes back underneath
function ecUnderline(x, y, w, t0, o = {}) {
  const key = o.key ?? 'ul:' + Math.round(x) + ':' + Math.round(y), R = RNG('ecu', key), P = [[x, y + R.n(2)], [x + w * 0.5, y + R.n(3)], [x + w, y - R.r(0, 4)]];
  if (o.double) P.push([x + w * 0.97, y + 9], [x + w * 0.5, y + 13 + R.n(2)], [x + w * 0.12, y + 12]);
  return ecMarker(P, t0, { d: o.double ? 0.4 : 0.25, ...o, key });
}
// a wobbly arrow from a to b that draws on, then gets its head. o: bend (fraction of its length, sign = side), head (px), d
function ecArrow(a, b, t0, o = {}) {
  const key = o.key ?? 'arr:' + Math.round(a[0]) + ':' + Math.round(a[1]), L = dist(a, b) || 1, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, bend = (o.bend ?? 0.2) * L;
  const c = [(a[0] + b[0]) / 2 + nx * bend, (a[1] + b[1]) / 2 + ny * bend], P = [], d = o.d ?? 0.4, hs = o.head ?? 38;
  for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u; P.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]); }
  const f = ecMarker(P, t0, { ...o, d, key });
  const ang = Math.atan2(b[1] - c[1], b[0] - c[0]);
  for (const [s, i] of [[-1, 0], [1, 1]]) { const aa = ang + Math.PI + s * 0.5; ecMarker([[b[0] + Math.cos(aa) * hs, b[1] + Math.sin(aa) * hs], b], t0 + d + i * EC_STEP, { ...o, d: 0.1, amt: 0.8, key: key + 'h' + i }); }
  return f;
}
// a cross, s = half its size
function ecCross(x, y, s, t0, o = {}) {
  const key = o.key ?? 'x:' + Math.round(x) + ':' + Math.round(y), R = RNG('ecx', key);
  ecMarker([[x - s + R.n(3), y - s + R.n(3)], [x + s + R.n(3), y + s + R.n(3)]], t0, { d: 0.15, amt: 1, ...o, key: key + 'a' });
  return ecMarker([[x + s + R.n(3), y - s + R.n(3)], [x - s + R.n(3), y + s + R.n(3)]], t0 + 0.17, { d: 0.15, amt: 1, ...o, key: key + 'b' });
}
// a rubber stamp centred on (x, y): caps in a double frame, broken ink, turned a little. It thuds: a one-frame scale
// punch on its first frame. o: rot (-0.12), c (red), sub (a small second line), key. The stamp is a sprite, so
// tools/textcheck.mjs does not trace its text: keep it inside the safe area yourself.
function ecStamp(str, x, y, size, t0, o = {}) {
  const fn = F - Math.ceil(t0 * FPS - 1e-6); if (fn < 0) return null;
  const c = o.c ?? EC.red, tr = size * 0.09, key = ['stamp', str, size, c, o.sub ?? ''].join('|');
  const tw = ecTextW(str, size, 'cond', 700, tr), sw = o.sub ? ecTextW(o.sub, size * 0.36, 'type', 700) : 0, w = Math.max(tw, sw) + size * 0.95, h = size * (o.sub ? 1.95 : 1.5);
  const sp = ecSprite(key, w, h, 10, () => {
    const R = RNG('ecsp', key), lw = size * 0.085;
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.roundRect(-w / 2 + lw / 2, -h / 2 + lw / 2, w - lw, h - lw, size * 0.13); ctx.stroke();
    ctx.lineWidth = lw * 0.3; ctx.beginPath(); ctx.roundRect(-w / 2 + lw * 2, -h / 2 + lw * 2, w - lw * 4, h - lw * 4, size * 0.07); ctx.stroke();
    ecText(str, -tw / 2 + tr / 2, (o.sub ? -size * 0.1 : 0) + size * 0.355, size, c, { font: 'cond', weight: 700, track: tr });
    if (o.sub) ecText(o.sub, 0, h / 2 - size * 0.34, size * 0.36, c, { font: 'type', weight: 700, align: 'center' });
    // broken ink: the rubber did not touch everywhere
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000'; ctx.beginPath(); for (let i = 0, n = Math.floor(w * h / 55); i < n; i++) { const s = R.r(1, 3.2); ctx.rect(R.r(-w / 2, w / 2), R.r(-h / 2, h / 2), s, s); } ctx.fill();
    for (let i = 0; i < 7; i++) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1), px = R.r(-w / 2, w / 2), py = R.r(-h / 2, h / 2), rr = R.r(size * 0.25, size * 0.7); g.addColorStop(0, `rgba(0,0,0,${R.r(0.35, 0.7)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.translate(px, py); ctx.scale(rr * R.r(1, 2.2), rr); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i < 9; i++) { const px = R.r(-w / 2, w / 2), py = R.r(-h / 2, h / 2), a = -0.5 + R.n(0.25), l = R.r(20, 90); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); } ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  });
  const s = fn === 0 ? 1.3 : fn === 1 ? 1.07 : 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -0.12) + (fn === 0 ? 0.03 : 0)); ctx.scale(s, s);
  ctx.globalCompositeOperation = EC_DARKMODE ? 'source-over' : 'multiply'; ctx.globalAlpha *= fn < 2 ? 1 : 0.92;
  ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h); ctx.restore();
  return { w, h, fn };
}

// ---------------------------------------------------------------------
//  the hero: a small cut-out pointing hand (a mitten manicule in halftone, white cut border, a red cuff: the red is
//  reserved for the cuff and the marker). It hops to the thing being discussed and taps it.
// ---------------------------------------------------------------------
const EC_HAND = [[-100, -6], [-60, -6], [-54, -15], [-20, -17], [86, -13], ...ellipsePts(87, 0, 13, 13, 0, 9, -90 * DEG, 90 * DEG), [86, 13], [27, 14], [36, 24], [39, 40], [33, 54], [20, 62], [-40, 62], [-56, 57], [-60, 54], [-100, 54]];
const ecHandTone = (u, v) => 0.1 + 0.3 * smooth(4, 62, v) + (v < 13 ? 0.12 * smooth(-4, 13, v) : 0);   // a pale screen, darker underneath
// (x, y) = the fingertip (o.center: the middle of the hand), r = half the hand's length, o.a = where it points (rad, 0 = right).
// o: tap [absolute times] (a jab forward on each), key, t0 (it slaps in). Sets SPARK_AT (the fingertip).
function ecHero(x, y, r, o = {}) {
  if (r <= 1) return;
  const key = o.key ?? 'hero', a = o.a ?? 0, rq = Math.max(8, Math.round(r / 6) * 6), k = rq / 100;
  const sp = ecSprite('hand|' + rq, 200 * k, 80 * k, 26 * k + 6, () => {
    const P = EC_HAND.map(([u, v]) => [u * k, (v - 22.5) * k]), lb = bbox(P);
    ecPoly(ecScissor(P, 'hand', 9 * k + 3, 18 * k + 5, 60 * k + 14)); ctx.fillStyle = EC.white; ctx.fill();
    trace(P, true); ctx.lineJoin = 'round'; ctx.lineWidth = 12 * k + 8; ctx.strokeStyle = EC.white; ctx.stroke(); ctx.fill();
    ctx.save(); trace(P, true); ctx.clip();
    ctx.fillStyle = 'rgba(25,25,25,0.12)'; ctx.fillRect(lb.x0, lb.y0, lb.x1 - lb.x0, lb.y1 - lb.y0);
    ecHalftone(lb, (px, py) => ecHandTone(px / k, py / k + 22.5), { pitch: clamp(5 * k + 2.5, 4.5, 8) });
    ctx.fillStyle = EC.red; ctx.fillRect(lb.x0 - 2, lb.y0, 42 * k, lb.y1 - lb.y0);                                                   // the cuff
    ctx.fillStyle = EC.white; ctx.beginPath(); ctx.arc(lb.x0 + 22 * k, 3 * k, 4.5 * k, 0, TAU); ctx.fill();                            // its button
    ctx.restore();
    // a clean ink drawing over the screen: contour, cuff edge, the thumb lying on the fist, two curled fingers
    const lw = Math.max(2, 3.4 * k), V = (v) => (v - 22.5) * k;
    ctx.strokeStyle = EC.ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; trace(P, true); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-60 * k, V(-8)); ctx.lineTo(-60 * k, V(55));
    ctx.moveTo(-34 * k, V(4)); ctx.quadraticCurveTo(-4 * k, V(-6), 20 * k, V(8)); ctx.quadraticCurveTo(26 * k, V(17), 10 * k, V(19)); ctx.lineTo(-22 * k, V(17));
    ctx.moveTo(14 * k, V(31)); ctx.lineTo(37 * k, V(31)); ctx.moveTo(12 * k, V(46)); ctx.lineTo(35 * k, V(46)); ctx.stroke();
  });
  // idle: a small bob along the pointing axis; a tap = one step back, a jab, a rebound
  let j = Math.sin(TT * TAU * 0.8 + key.length) * 0.025;
  for (const t of o.tap ?? []) { const n = Math.floor((TT - t) / EC_STEP + 1e-6); if (n === -1) j = -0.13; else if (n === 0) j = 0.16; else if (n === 1) j = 0.05; }
  const m = o.t0 != null ? ecSlap(o.t0, { key, from: o.from ?? [W * 0.5, H * 0.1], spin: o.spin ?? 0.3 }) : { dx: 0, dy: 0, rot: 0, lift: 0, s: 1 }; if (!m) return;
  const s = r / rq, ca = Math.cos(a), sa = Math.sin(a), ox = o.center ? 0 : -rq, oy = o.center ? 0 : 22.5 * k, tx = x + m.dx + ca * j * r, ty = y + m.dy + sa * j * r;
  SPARK_AT = toScreen(o.center ? tx + ca * r : tx, o.center ? ty + sa * r : ty);
  const J = RNG('ecj', key, B), sh = ecShadowOf(sp), L = 6 + m.lift * 26, flip = ca < -0.01 ? -1 : 1;
  ctx.save(); ctx.translate(tx + J.n(0.4), ty + J.n(0.4));
  ctx.save(); ctx.translate(L * 0.45, L); ctx.rotate(a + m.rot); ctx.scale(s, s * flip); ctx.translate(ox, oy); ctx.globalAlpha *= 0.4 - m.lift * 0.14; ctx.drawImage(sh, -sp.w / 2 - sp.shm, -sp.h / 2 - sp.shm, sh.width / EC_SS, sh.height / EC_SS); ctx.restore();
  ctx.rotate(a + m.rot); ctx.scale(s, s * flip); ctx.translate(ox, oy); ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  ctx.restore();
}
// a hop from a to b (parabola), stepped on 2s like everything else: { x, y, air }
function ecHop(a, b, t0, d = 0.375, height = 120) {
  const u = clamp((TT - t0) / d), e = EZ.io(u);
  return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e) - Math.sin(u * Math.PI) * height, air: u > 0 && u < 1 };
}

// ---------------------------------------------------------------------
//  captions (through DEFER: after the camera, at screen size). They are paper too: they drop in, and in the first
//  0.3s of a bridge they are pulled off the frame and stay away until it is over (ecLeaving); in an era that opens
//  out of a bridge they land when it ends (ecEraIn), so nothing at screen size sits on the morph window.
// ---------------------------------------------------------------------
function ecLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d - 1e-6) return TT < r.tc ? 1 - EZ.i2(seg(TT, r.tc - d, r.tc - d + 0.3)) : 0; }
  return 1;
}
function ecEraIn() {
  if (typeof BRIDGES === 'undefined') return -1e9;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) return r.tc + (r.d ?? 0.6);
  return -1e9;
}
// lines of text with one or more *highlighted* phrases, on one cut sheet centred on (0, 0) of the current transform.
function ecSheetText(lines, size, o) {
  const plain = lines.map((l) => l.replace(/\*/g, '')), ws = plain.map((l) => ecTextW(l, size, 'serif', 800)), tw = Math.max(...ws), lh = size * 1.26;
  const w = tw + size * 1.1, h = lines.length * lh + size * 0.44, R = RNG('ecsh', o.key), j = size * 0.04;
  const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a * w / 2 + R.n(j), b * h / 2 + R.n(j)]);
  ecDrop(o.m, 0.9); ecPoly(q); ctx.fillStyle = o.paper ?? EC.white; ctx.fill(); ecNoDrop();
  ecPoly(q); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,50,30,0.16)'; ctx.stroke();
  lines.forEach((line, li) => {
    const by = -h / 2 + size * 0.22 + li * lh + size * 0.95; let xx = o.align === 'left' ? -tw / 2 : -ws[li] / 2;
    for (const part of line.split(/(\*[^*]+\*)/).filter((s) => s.length)) {
      const kw = part[0] === '*', s = kw ? part.slice(1, -1) : part, pw = ecText(s, xx, by, size, EC.ink, { font: 'serif', weight: 800 });
      if (kw) ecHighlight(xx - size * 0.08, by - size * 0.8, pw + size * 0.16, size * 1.04, o.hiAt, { key: o.key + 'hl' + li + s });
      xx += pw;
    }
  });
  return { w, h };
}
// 'text with a *keyword*' on a paper strip near the bottom of the safe area; the highlighter sweeps the keyword.
// o: y (strip centre; default H - SAFE.bottom - 60), x, size (56; shrinks to fit maxW, never below what fits), maxW, at (after E0)
//    or t0 (absolute), hiAt (absolute; default 0.5s after it lands), paper, rot
function ecCaptionNow(str, o = {}) {
  const lv = ecLeaving(); if (lv <= 0.001) return;
  const S = ecSafe(), u = UNIT, lines = str.split('\n'), maxW = o.maxW ?? Math.min(800 * u, W - S.right - 200 * u); let size = o.size ?? 56 * u;
  const widest = Math.max(...lines.map((l) => ecTextW(l.replace(/\*/g, ''), size, 'serif', 800))); if (widest > maxW) size *= maxW / widest;
  const t0 = o.t0 ?? Math.max(E0 + (o.at ?? 0.5), ecEraIn()), key = 'cap:' + str, cy = (o.y ?? H - S.bottom - 60 * u) - (lines.length - 1) * size * 0.63;
  ctx.save(); ctx.translate(0, (1 - lv) * (H - cy + 200));
  const m = ecEnter(o.x ?? CX, cy, { t0, from: [0, -90 * u], spin: 0.06, rot: o.rot ?? 0.008, breathe: 0.003 }, key);
  if (m) { const b = ecSheetText(lines, size, { key, m, paper: o.paper, hiAt: o.hiAt ?? t0 + 0.5 }); ecTape(-b.w / 2 + 8, -b.h / 2 + 6, 86 * u, -0.62, { w: 34 * u, flutter: false, key: key + 'tp', t0: t0 + 0.25 }); }
  ctx.restore();
}
const ecCaption = (str, o) => { const f = () => ecCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
// the title block near the top of the safe area: a kicker on a label strip and (optional) a serif headline on a paper strip.
// o: x, y (the kicker's centre line; default SAFE.top + 62), size (headline, 68), at / t0, kc (label colour), hiAt, paper
function ecTitleNow(kicker, headline, o = {}) {
  const lv = ecLeaving(); if (lv <= 0.001) return;
  const S = ecSafe(), u = UNIT, x = o.x ?? 64 * u, y = o.y ?? S.top + 62 * u, t0 = o.t0 ?? Math.max(E0 + (o.at ?? 0.25), ecEraIn()), ks = o.ksize ?? 36 * u;
  ctx.save(); ctx.translate(-(1 - lv) * W, 0);
  if (headline) {
    const lines = headline.split('\n'), maxW = o.maxW ?? W - S.right - x - 90 * u; let size = o.size ?? 68 * u;
    const widest = Math.max(...lines.map((l) => ecTextW(l.replace(/\*/g, ''), size, 'serif', 800))); if (widest > maxW) size *= maxW / widest;
    const tw = Math.min(widest, maxW), w = tw + size * 1.1, h = lines.length * size * 1.26 + size * 0.44, key = 'ttl:' + headline;
    ctx.save();
    const m = ecEnter(x + w / 2 + 6 * u, y + ks * 0.75 + h / 2 + 4 * u, { t0: t0 + 0.25, from: [-170 * u, 0], spin: -0.07, rot: o.rot ?? 0.006, breathe: 0.003 }, key);
    if (m) ecSheetText(lines, size, { key, m, paper: o.paper ?? EC.news, hiAt: o.hiAt ?? t0 + 0.75, align: 'left' });
    ctx.restore();
  }
  if (kicker) ecLabel(kicker, x, y, ks, { t0, c: o.kc, key: 'kick:' + kicker });
  ctx.restore();
}
const ecTitle = (kicker, headline, o) => { const f = () => ecTitleNow(kicker, headline, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract)
// =====================================================================
const STYLE = {
  name: 'editorial-collage',
  paper: EC.desk,
  // the desk itself in colour c (a blend during a bridge): fibres here, the grain comes with post()
  backdrop(c) { fillAll(c); ctx.save(); screen(); ecFibres('desk', 0, 0, W, H, 120); ctx.restore(); },
  // the era seen through a hole torn in the top sheet: an inner shadow falls on the world below, a white fibre rim round it
  window(P, key, src) {
    const T = ecTear(P, 'win', { n: 150, amt: 6, fibre: -13, v: B % 3 }), hole = T.outer, rim = T.inner;   // fibre < 0: the rim lies outside the hole
    ctx.save(); ecPoly(hole); ctx.clip(); ctx.drawImage(src, 0, 0);
    ctx.beginPath(); ctx.rect(-200, -200, W + 400, H + 400); ctx.moveTo(hole[0][0], hole[0][1]); for (let i = 1; i < hole.length; i++) ctx.lineTo(hole[i][0], hole[i][1]); ctx.closePath();
    ctx.shadowColor = 'rgba(24,16,8,0.6)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 7; ctx.shadowOffsetY = 12; ctx.fillStyle = '#000'; ctx.fill('evenodd'); ecNoDrop();
    ctx.translate(5, 9); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(24,16,8,0.07)'; for (const lw of [54, 34, 18]) { ecPoly(hole); ctx.lineWidth = lw; ctx.stroke(); }   // the sheet's thickness: a banded shadow just inside the edge
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.moveTo(rim[0][0], rim[0][1]); for (let i = 1; i < rim.length; i++) ctx.lineTo(rim[i][0], rim[i][1]); ctx.closePath();
    ctx.moveTo(hole[0][0], hole[0][1]); for (let i = 1; i < hole.length; i++) ctx.lineTo(hole[i][0], hole[i][1]); ctx.closePath();
    ctx.fillStyle = EC.fibre; ctx.fill('evenodd'); ctx.restore();
    ctx.save(); ecPoly(rim); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(70,50,30,0.2)'; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: a torn scrap of paper in colour c, with its fibre edge and shadow
  blob(P, c, key) {
    const T = ecTear(P, 'blob', { n: 170, amt: 5, fibre: 6, v: B % 3 }), bb = bbox(T.outer), R = RNG('ecbl', key);
    ctx.save(); ctx.shadowColor = EC_DARKMODE ? 'rgba(0,0,0,0.6)' : 'rgba(34,24,14,0.36)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 10; ecPoly(T.outer); ctx.fillStyle = EC.fibre; ctx.fill(); ctx.restore();
    ctx.save(); ecPoly(T.inner); ctx.clip(); ctx.fillStyle = c; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
    const n = Math.min(2500, Math.floor((bb.x1 - bb.x0) * (bb.y1 - bb.y0) / 230));
    for (const col of ['rgba(60,45,28,0.10)', 'rgba(255,255,255,0.28)']) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < n; i++) ctx.rect(lerp(bb.x0, bb.x1, R.f()), lerp(bb.y0, bb.y1, R.f()), 1.6, 1.6); ctx.fill(); }
    ctx.restore();
  },
  hero(x, y, r, o = {}) { ecHero(x, y, r * 0.9, { center: true, key: o.key }); },
  heroColor: EC.red,
  heroPts(x, y, r) { return EC_HAND.map(([u, v]) => [x + u * r * 0.009, y + (v - 22.5) * r * 0.009]); },
  post() { ecGrain(); },
  ones: false,
};
