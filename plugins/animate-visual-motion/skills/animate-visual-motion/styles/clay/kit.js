// =====================================================================
//  styles/clay/kit.js — CLAY: plasticine stop-motion on a small studio set. Everything is a lump of soft matte
//  clay: a chunky rounded volume lit from the top-left (a radial highlight, a shaded underside, a faint rim),
//  a slightly lumpy outline that is re-seeded on every boil step (the clay "breathes" like re-posed stop motion),
//  fingerprints and tool marks, seams where pieces are pressed together, rolled "sausages" for lines, and a soft
//  contact shadow on the tabletop. The ground is a plain card backdrop sweeping into a table, with a vignette.
//  Built on kit/core.js. Motion on 2s. Helpers are prefixed cly…; the palette is CL. Needs from the piece head: CX.
// =====================================================================
const CL = {
  paper: '#efe4cf',                                   // a neutral cream card: the ground a morph happens on
  sky: '#8fbcc4', butter: '#f2d9a0',                  // card backdrops: dusty sky blue, warm butter
  cream: '#f1e3c6', grass: '#8dbb5d',                 // tabletops: bare cream, a grass-green slab
  red: '#d4513c',                                     // WARM RED: reserved for the hero
  mustard: '#e3aa35', leaf: '#5f9a4a', blue: '#5f9fc8',   // fruit / tags / highlights, leaves, small critters
  brown: '#7b4a2e', choc: '#4f2f20',                  // seeds, trunks, soil; text, eyes, grooves
  pink: '#e79a8f', stone: '#b9b0a3', white: '#fbf4e6',    // worms and tongues, pebbles, clouds and eye glints
  shade: '#2e1a1e', light: '#fff6e0',                 // what every colour deepens toward / lifts toward
};
const CLY_FONT = '"Arial Rounded MT Bold", "Varela Round", "Nunito", "Baloo 2", "Segoe UI", "Trebuchet MS", "DejaVu Sans", Arial, sans-serif';

// ---------------------------------------------------------------------
//  colour: hex or rgb() in, rgb() out. clyTone(c, k): k < 0 deepens toward a warm shade, k > 0 lifts toward warm light
// ---------------------------------------------------------------------
function clyRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
const clyMix = (a, b, u) => { const x = clyRGB(a), y = clyRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const clyTone = (c, k) => clyMix(c, k < 0 ? CL.shade : CL.light, Math.abs(k));
const clyA = (c, al) => { const x = clyRGB(c); return `rgba(${x[0]},${x[1]},${x[2]},${al})`; };
const clyLum = (c) => { const x = clyRGB(c); return (0.3 * x[0] + 0.59 * x[1] + 0.11 * x[2]) / 255; };

// ---------------------------------------------------------------------
//  geometry: outlines are point lists, drawn as smooth closed curves (core trace)
// ---------------------------------------------------------------------
// a hand-rolled ball / ellipse: fixed lumps from the key (they never reshuffle), optional regular bumps (a tree crown)
//   o: key, lump (0.03), n, rot, bumps (0), bn (how many bumps)
function clyBlobPts(x, y, rx, ry = rx, o = {}) {
  const R = RNG('clyblob', o.key ?? 'b'), p0 = R.r(0, TAU), p1 = R.r(0, TAU), p2 = R.r(0, TAU);
  const lump = o.lump ?? 0.03, n = o.n ?? 48, rot = o.rot ?? 0, bumps = o.bumps ?? 0, bn = o.bn ?? 6, cr = Math.cos(rot), sr = Math.sin(rot), P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1 + lump * (0.5 * Math.sin(2 * a + p0) + 0.3 * Math.sin(3 * a + p1) + 0.2 * Math.sin(5 * a + p2)) + bumps * (0.5 + 0.5 * Math.cos(bn * a + p0));
    const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
    P.push([x + px * cr - py * sr, y + px * sr + py * cr]);
  }
  return P;
}
// a stubby sausage between two points (radii r0 at the start, r1 at the end): arms, leaves, beaks, grass
function clyCapsule(x0, y0, x1, y1, r0, r1 = r0, n = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0), P = [];
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + i / n * Math.PI; P.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + i / n * Math.PI; P.push([x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]); }
  return P;
}
const clyCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);

// ---------------------------------------------------------------------
//  the clay surface
// ---------------------------------------------------------------------
let CLY_PAT = null;   // a matte speckle tile (seeded, made once): tiny dark and light flecks
function clyGrain() {
  if (CLY_PAT) return CLY_PAT;
  const T = 256, c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d'), R = RNG('clygrain');
  for (let i = 0; i < 1100; i++) { g.fillStyle = R.f() < 0.55 ? 'rgba(46,26,30,0.11)' : 'rgba(255,246,224,0.14)'; g.beginPath(); g.arc(R.r(0, T), R.r(0, T), R.r(0.5, 1.7), 0, TAU); g.fill(); }
  return (CLY_PAT = g.createPattern(c, 'repeat'));
}
// soft uneven patches (thumb-pressed hollows and bumps) at fixed, seeded places inside a box: g = a 2d context
function clyBlotch(g, x0, y0, w, h, n, key, r0, r1, al) {
  const R = RNG('clyblotch', key);
  for (let i = 0; i < n; i++) {
    const x = x0 + R.r(0, w), y = y0 + R.r(0, h), r = R.r(r0, r1), d = R.f() < 0.5, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, d ? `rgba(46,26,30,${al})` : `rgba(255,246,224,${al * 1.1})`); gr.addColorStop(1, d ? 'rgba(46,26,30,0)' : 'rgba(255,246,224,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
// the soft contact shadow of something standing on the table (a flattened radial gradient; no blur filter)
function clyShadow(x, y, rx, ry, al = 0.32) {
  if (rx < 2 || ry < 0.5 || al <= 0.005) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
  g.addColorStop(0, `rgba(46,26,30,${al})`); g.addColorStop(0.55, `rgba(46,26,30,${al * 0.6})`); g.addColorStop(1, 'rgba(46,26,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}
// a pressed groove: a dark line with a thin light lip under it (a seam between two pieces, a knife mark, a smile)
function clySeam(P, o = {}) {
  const w = o.w ?? 3, cl = !!o.closed;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(w * 0.35, w * 0.6); trace(P, cl); ctx.lineWidth = w * 0.8; ctx.strokeStyle = `rgba(255,246,224,${o.lip ?? 0.28})`; ctx.stroke(); ctx.restore();
  trace(P, cl); ctx.lineWidth = w; ctx.strokeStyle = o.c ?? `rgba(46,26,30,${o.al ?? 0.42})`; ctx.stroke();
  ctx.restore();
}
// fingerprints: n sets of concentric pressed arcs at fixed places inside box bb (nudged a hair on every boil step)
function clyPrints(bb, n, key) {
  const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, m = Math.min(w, h);
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const S = RNG('clyprint', key, i), J = RNG('clyprintj', key, i, B);
    const x = bb.x0 + w * S.r(0.2, 0.8) + J.n(1.2), y = bb.y0 + h * S.r(0.25, 0.8) + J.n(1.2), r = Math.min(34, m * S.r(0.1, 0.16)), rot = S.r(0, TAU), sq = S.r(0.55, 0.8);
    for (let k = 1; k <= 3; k++) {
      const rr = r * k / 3, a0 = S.r(0, 1.2), a1 = a0 + S.r(3.4, 5.2);
      ctx.lineWidth = Math.max(1.2, m * 0.012);
      ctx.strokeStyle = 'rgba(255,246,224,0.2)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 1.8, rr, rr * sq, rot, a0, a1); ctx.stroke();
      ctx.strokeStyle = 'rgba(46,26,30,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * sq, rot, a0, a1); ctx.stroke();
    }
  }
  ctx.restore();
}
// ONE LUMP OF CLAY: outline P (world coords), colour c.
//   o: key, amt (boil wobble px, 1.7), raw (P is used as it is), dents (fingerprints, 0), flat (a slab, lit evenly),
//      thick (px: a slab's visible side),
//      cast ([dx, dy]: a flat shadow on the card behind it), grain (false = none), inner(bb) (drawn clipped: seams, marks), al
function clyLump(P, c, o = {}) {
  const key = o.key ?? 'lump', Q = o.raw ? P : wobble(P, true, o.amt ?? 1.7, key, 9);
  const bb = bbox(Q), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, m = Math.min(w, h);
  ctx.save(); ctx.globalAlpha *= o.al ?? 1;
  if (o.cast) { ctx.save(); ctx.translate(o.cast[0], o.cast[1]); trace(Q, true); ctx.fillStyle = 'rgba(46,26,30,0.17)'; ctx.fill(); ctx.restore(); }
  if (o.thick) { ctx.save(); ctx.lineJoin = 'round'; ctx.translate(0, o.thick); trace(Q, true); ctx.fillStyle = ctx.strokeStyle = clyTone(c, -0.4); ctx.fill(); ctx.restore(); ctx.save(); ctx.translate(0, o.thick / 2); trace(Q, true); ctx.fillStyle = clyTone(c, -0.36); ctx.fill(); ctx.restore(); }
  trace(Q, true);
  let g;
  if (o.flat) { g = ctx.createLinearGradient(cx - h * 0.2, bb.y0, cx + h * 0.2, bb.y1); g.addColorStop(0, clyTone(c, 0.16)); g.addColorStop(0.5, c); g.addColorStop(1, clyTone(c, -0.13)); }   // a slab: lit across its top face
  else {                                                                                                                     // a ball: lit from the top-left
    g = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.26, m * 0.04, cx - w * 0.04, cy - h * 0.05, (w + h) * 0.4);
    g.addColorStop(0, clyTone(c, 0.24)); g.addColorStop(0.36, clyTone(c, 0.04)); g.addColorStop(0.78, clyTone(c, -0.15)); g.addColorStop(1, clyTone(c, -0.3));
  }
  ctx.fillStyle = g; ctx.fill(); ctx.clip();
  if (!o.flat) {                                                                                                             // the shaded underside
    const u = ctx.createLinearGradient(0, cy + h * 0.1, 0, bb.y1);
    u.addColorStop(0, 'rgba(46,26,30,0)'); u.addColorStop(1, 'rgba(46,26,30,0.26)'); ctx.fillStyle = u; ctx.fillRect(bb.x0, cy, w, h / 2 + 2);
  }
  if (m > 90 && o.grain !== false) clyBlotch(ctx, bb.x0, bb.y0, w, h, 5, key, m * 0.12, m * 0.3, 0.07);
  if (m > 26 && o.grain !== false) { ctx.save(); ctx.translate(Math.round(bb.x0), Math.round(bb.y0)); ctx.fillStyle = clyGrain(); ctx.fillRect(0, 0, w + 2, h + 2); ctx.restore(); }
  if (m > 40) {                                                                                                              // a soft matte highlight (never a glossy glint)
    const hx = cx - w * 0.2, hy = cy - h * 0.25, hr = m * 0.3, hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    hg.addColorStop(0, 'rgba(255,246,224,0.2)'); hg.addColorStop(1, 'rgba(255,246,224,0)'); ctx.fillStyle = hg; ctx.fillRect(hx - hr, hy - hr, 2 * hr, 2 * hr);
  }
  if (o.dents) clyPrints(bb, o.dents, key);
  if (o.inner) o.inner(bb);
  const rw = clamp(m * 0.035, 1.5, 5); ctx.lineJoin = 'round';                                                              // the rim: a light lip top-left, a darker edge all round
  ctx.save(); ctx.translate(rw * 0.8, rw); trace(Q, true); ctx.lineWidth = rw * 1.3; ctx.strokeStyle = 'rgba(255,246,224,0.22)'; ctx.stroke(); ctx.restore();
  trace(Q, true); ctx.lineWidth = rw * 2; ctx.strokeStyle = clyA(clyTone(c, -0.55), 0.42); ctx.stroke();
  ctx.restore();
  return Q;
}
// A ROLLED SAUSAGE along path P (open, or o.closed), w px thick: a shaded underside, the body, a lit top,
// and small knife nicks across it. o: key, amt, raw, closed, cast, nicks (false = none), al
function clyRoll(P, w, c, o = {}) {
  const cl = !!o.closed, key = o.key ?? 'roll', Q = o.raw ? P : wobble(P, cl, o.amt ?? 1.2, key, 8);
  if (Q.length < 2) return Q;
  const st = (dx, dy, lw, col) => { ctx.save(); ctx.translate(dx, dy); trace(Q, cl); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke(); ctx.restore(); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha *= o.al ?? 1;
  if (o.cast) st(o.cast[0], o.cast[1], w, 'rgba(46,26,30,0.17)');
  st(0, 0, w, clyTone(c, -0.36)); st(-w * 0.05, -w * 0.07, w * 0.82, c); st(-w * 0.13, -w * 0.17, w * 0.4, clyTone(c, 0.15)); st(-w * 0.19, -w * 0.24, w * 0.12, 'rgba(255,246,224,0.3)');
  if (o.nicks !== false && w >= 12) {
    const L = pathLen(Q), n = Math.floor(L / (w * 1.5)), S = RNG('clynick', key);
    ctx.lineWidth = Math.max(1.2, w * 0.07); ctx.strokeStyle = 'rgba(46,26,30,0.26)'; ctx.beginPath();
    for (let i = 1; i < n; i++) { const f = (i + S.n(0.25)) / n, a = pointAt(Q, f), b = pointAt(Q, Math.min(1, f + 0.01)), d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d; ctx.moveTo(a[0] + nx * w * 0.3, a[1] + ny * w * 0.3); ctx.lineTo(a[0] - nx * w * 0.12, a[1] - ny * w * 0.12); }
    ctx.stroke();
  }
  ctx.restore();
  return Q;
}
// a damped squash after a landing at t0 (wide and low, then tall, then settled); 0 before t0
const clyLand = (t0, amt = 0.3, freq = 16, damp = 6.5) => (TT < t0 ? 0 : amt * Math.exp(-(TT - t0) * damp) * Math.cos((TT - t0) * freq));
// crumbs of clay thrown up from (x, y) on small arcs; t = seconds since the impact. o: key, n (7), power (1), r (9)
function clyBits(x, y, t, c, o = {}) {
  const dur = 0.6; if (t < 0 || t > dur) return;
  const n = o.n ?? 7, pw = o.power ?? 1, r0 = o.r ?? 9, key = o.key ?? 'bits';
  for (let i = 0; i < n; i++) {
    const R = RNG('clybits', key, i), sg = i % 2 ? 1 : -1, an = -Math.PI / 2 + sg * R.r(0.3, 1.0), sp = R.r(300, 620) * pw, r = r0 * R.r(0.6, 1.2) * (1 - 0.5 * t / dur);
    const px = x + sg * (o.spread ?? 0) + Math.cos(an) * sp * t, py = y + Math.sin(an) * sp * t + 0.5 * 2200 * t * t;
    if (py > y + 4) continue;
    clyLump(ellipsePts(px, py, r, r * 0.9, 0, 12), Array.isArray(c) ? c[i % c.length] : c, { raw: true, grain: false });
  }
}

// ---------------------------------------------------------------------
//  the studio set: a card backdrop that bends into a tabletop at height hz (world coords, painted once per colour pair)
// ---------------------------------------------------------------------
const CLY_SETS = new Map(), CLY_M = 160;
function clySet(card, table, o = {}) {
  const hz = o.hz ?? 1000, id = [card, table, hz].join('|');
  let c = CLY_SETS.get(id);
  if (!c) {
    c = document.createElement('canvas'); c.width = W + 2 * CLY_M; c.height = H + 2 * CLY_M;
    const g = c.getContext('2d'), w = c.width, h = c.height, hy = hz + CLY_M;
    g.fillStyle = card; g.fillRect(0, 0, w, h);
    let gr = g.createRadialGradient(w * 0.4, hy * 0.45, 40, w * 0.5, hy * 0.5, h * 0.6);                    // the lamp's pool of light on the card
    gr.addColorStop(0, 'rgba(255,246,224,0.24)'); gr.addColorStop(1, 'rgba(255,246,224,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hy);
    gr = g.createLinearGradient(0, hy - 150, 0, hy + 6);                                                    // the bend of the card: it turns away from the light
    gr.addColorStop(0, clyA(card, 0)); gr.addColorStop(1, clyTone(card, -0.16)); g.fillStyle = gr; g.fillRect(0, hy - 150, w, 160);
    gr = g.createLinearGradient(0, hy - 14, 0, h);                                                          // the tabletop, a soft edge, darker toward the camera
    gr.addColorStop(0, clyA(table, 0)); gr.addColorStop(0.03, clyTone(table, 0.1)); gr.addColorStop(0.3, table); gr.addColorStop(1, clyTone(table, -0.2));
    g.fillStyle = gr; g.fillRect(0, hy - 14, w, h - hy + 14);
    clyBlotch(g, 0, 0, w, h, 26, id, 120, 320, 0.035);
    g.fillStyle = clyGrain(); g.globalAlpha = 0.7; g.fillRect(0, 0, w, h);
    if (CLY_SETS.size >= 4) CLY_SETS.delete(CLY_SETS.keys().next().value);
    CLY_SETS.set(id, c);
  }
  ctx.drawImage(c, -CLY_M, -CLY_M);
}
let CLY_VIG = null;
function clyVignette() {
  if (CLY_VIG) return CLY_VIG;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.hypot(W, H) * 0.6);
  gr.addColorStop(0, 'rgba(46,26,30,0)'); gr.addColorStop(1, 'rgba(46,26,30,0.34)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return (CLY_VIG = c);
}

// ---------------------------------------------------------------------
//  the hero: BULAT, a round red blob with bead eyes, a small smile, two stubby arms and two feet.
//  (x, y) = the centre of its body at rest, r = the body radius; it stands on y + r. Sets SPARK_AT.
//   o: key, sx, sy (squash; the feet stay on the ground), lift (px off the ground), arms [left, right] (rad: 0 = straight
//      out, + = up), look [x, y] (-1..1), mood ('smile' | 'happy' | 'wow'), c, shadow (false = none)
// ---------------------------------------------------------------------
function clyHeroPts(x, y, r, n = 56, sx = 1, sy = 1) {   // a gumdrop: a little wider below the middle
  const P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a); P.push([x + Math.cos(a) * r * sx * (1 + 0.07 * Math.max(0, s)), y + s * r * sy]); }
  return P;
}
function clyHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', c = o.c ?? CL.red, sx = o.sx ?? 1, sy = o.sy ?? 1, lift = o.lift ?? 0, base = y + r;
  const cy = base - lift - r * sy, rx = r * sx, ry = r * sy, mood = o.mood ?? 'smile', look = o.look ?? [0, 0], arms = o.arms ?? [-0.6, -0.6], up = clamp(lift / (r * 1.5));
  if (o.shadow !== false) clyShadow(x, base + r * 0.03, r * 1.15 * (1 - 0.35 * up), r * 0.2, 0.36 * (1 - 0.45 * up));
  SPARK_AT = toScreen(x, cy);
  for (const s of [-1, 1]) clyLump(ellipsePts(x + s * rx * 0.44, base - lift - r * 0.05, r * 0.21, r * 0.12, 0, 18), clyTone(c, -0.22), { key: key + 'ft' + s, amt: 0.8, grain: false });
  clyLump(clyHeroPts(x, cy, r, 56, sx, sy), c, { key, dents: o.dents ?? 2, amt: 2 });
  arms.forEach((a, i) => {   // drawn over the body and pressed onto it: the seam shows at the shoulder
    const s = i ? 1 : -1, ax = x + s * rx * 0.86, ay = cy + ry * 0.14, L = r * 0.5;
    clyLump(clyCapsule(ax, ay, ax + s * Math.cos(a) * L, ay - Math.sin(a) * L, r * 0.15, r * 0.17), clyTone(c, 0.07), { key: key + 'arm' + i, amt: 1, grain: false });
    clySeam(arcPts(ax - s * r * 0.02, ay, r * 0.16, s > 0 ? Math.PI * 0.6 : Math.PI * 0.4, s > 0 ? Math.PI * 1.4 : -Math.PI * 0.4, 8), { w: Math.max(1.6, r * 0.022), al: 0.3 });
  });
  const ex = rx * 0.3, ox = look[0] * rx * 0.09, ey = cy - ry * 0.16 + look[1] * ry * 0.07, er = r * 0.088, blink = mood !== 'wow' && (B + key.length * 5) % 37 < 2;
  ctx.save();
  for (const s of [-1, 1]) {   // cheeks: two small discs of lighter clay pressed flat
    ctx.fillStyle = clyA(clyTone(c, 0.34), 0.7); ctx.beginPath(); ctx.ellipse(x + ox * 0.6 + s * rx * 0.52, ey + ry * 0.24, r * 0.12, r * 0.085, 0, 0, TAU); ctx.fill();
  }
  for (const s of [-1, 1]) {   // eyes: dark beads pushed into the clay
    const px = x + ox + s * ex;
    if (blink) { clySeam([[px - er, ey], [px + er, ey]], { w: r * 0.035, al: 0.8 }); continue; }
    ctx.fillStyle = 'rgba(46,26,30,0.3)'; ctx.beginPath(); ctx.arc(px + er * 0.12, ey + er * 0.2, er * 1.16, 0, TAU); ctx.fill();
    ctx.fillStyle = CL.choc; ctx.beginPath(); ctx.ellipse(px, ey, er, er * (mood === 'wow' ? 1.2 : 1.05), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = CL.white; ctx.beginPath(); ctx.arc(px - er * 0.3 + look[0] * er * 0.15, ey - er * 0.36, er * 0.3, 0, TAU); ctx.fill();
  }
  const mx = x + ox * 1.2, my = ey + ry * 0.3;
  if (mood === 'wow') { ctx.fillStyle = CL.choc; ctx.beginPath(); ctx.ellipse(mx, my + r * 0.04, r * 0.07, r * 0.095, 0, 0, TAU); ctx.fill(); }
  else if (mood === 'happy') {   // an open mouth cut with a tool, a pink tongue inside
    ctx.beginPath(); ctx.arc(mx, my - r * 0.03, r * 0.19, 0, Math.PI); ctx.closePath(); ctx.fillStyle = CL.choc; ctx.fill(); ctx.save(); ctx.clip();
    ctx.fillStyle = CL.pink; ctx.beginPath(); ctx.ellipse(mx, my + r * 0.16, r * 0.11, r * 0.08, 0, 0, TAU); ctx.fill(); ctx.restore();
  } else clySeam(arcPts(mx, my - r * 0.1, r * 0.17, Math.PI * 0.18, Math.PI * 0.82, 10), { w: r * 0.05, c: CL.choc, lip: 0.3 });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  scene props, all made of lumps and rolls. (x, y) is where the prop touches the table unless noted.
// ---------------------------------------------------------------------
// a seed / ball of clay given as an outline P (so the piece can squash it and use it as a bridge shape): one curved groove
function clySeed(P, c = CL.brown, o = {}) {
  clyLump(P, c, { key: o.key ?? 'seed', dents: o.dents ?? 1, amt: 1.8, inner: (bb) => { const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, r = o.rot ?? 0, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2; clySeam(xform(arcPts(0, 0, 1, -1.2, 1.2, 12).map(([px, py]) => [px * w * 0.3 - w * 0.12, py * h * 0.4]), cx, cy, r), { w: Math.max(2, w * 0.02) }); } });
}
// a fruit: a ball, a short stem, one leaf. (x, y) = its centre. o: key, s (pop scale), leaf, squash
function clyFruit(x, y, r, c = CL.mustard, o = {}) {
  const s = o.s ?? 1, q = o.squash ?? 0, key = o.key ?? 'fruit'; if (s <= 0.02) return;
  const rx = r * s * (1 + q), ry = r * s / (1 + q), cy = y + r * s - ry;
  clyRoll([[x, cy - ry * 0.85], [x + r * 0.08 * s, cy - ry * 1.3]], r * 0.2 * s, CL.brown, { key: key + 's', amt: 0.5, nicks: false });
  clyLump(clyCapsule(x + r * 0.1 * s, cy - ry * 1.2, x + r * 0.62 * s, cy - ry * 1.42, r * 0.1 * s, r * 0.2 * s), o.leaf ?? CL.leaf, { key: key + 'l', amt: 0.6, grain: false });
  clyLump(clyBlobPts(x, cy, rx, ry, { key, lump: 0.03, n: 28 }), c, { key, amt: 1, dents: r * s > 30 ? 1 : 0 });
}
// a tree: a trunk pulled up from the table with knife grooves and two root lumps, and a bumpy crown pressed on top.
//   crown = { x, y, r } (its outline is clyCrownPts, usable as a bridge shape). o: key, h (trunk height), w, c, trunk
const clyCrownPts = (x, y, r, key = 'crown') => clyBlobPts(x, y, r, r * 0.94, { key, lump: 0.03, bumps: 0.1, bn: 7, n: 84 });
function clyTree(x, base, crown, o = {}) {
  const key = o.key ?? 'tree', h = o.h ?? base - crown.y - crown.r * 0.75, w = o.w ?? crown.r * 0.27, tc = o.trunk ?? CL.brown, c = o.c ?? CL.leaf;
  clyShadow(x, base + 4, crown.r * 0.95, crown.r * 0.16, 0.3);
  for (const s of [-1, 1]) clyLump(ellipsePts(x + s * w * 0.72, base - w * 0.12, w * 0.42, w * 0.26, 0, 18), clyTone(tc, -0.08), { key: key + 'rt' + s, amt: 1, grain: false });
  clyLump([[x - w * 0.66, base], [x - w * 0.42, base - h * 0.5], [x - w * 0.36, base - h], [x + w * 0.36, base - h], [x + w * 0.42, base - h * 0.5], [x + w * 0.66, base]], tc, { key: key + 'tr', amt: 1.6,
    inner: () => { for (let i = 0; i < 3; i++) { const S = RNG('clybark', key, i), gx = x + (i - 1) * w * 0.24; clySeam([[gx + S.n(4), base - h * S.r(0.08, 0.2)], [gx + S.n(5), base - h * 0.5], [gx + S.n(4), base - h * S.r(0.72, 0.9)]], { w: 2.6, al: 0.34 }); } } });
  clyLump(clyCrownPts(crown.x, crown.y, crown.r, key + 'cr'), c, { key: key + 'cr', dents: 3, amt: 2.2,
    inner: () => { for (let i = 0; i < 16; i++) { const S = RNG('clyleafm', key, i), a = S.r(0, TAU), d = crown.r * Math.sqrt(S.f()) * 0.82, lx = crown.x + Math.cos(a) * d, ly = crown.y + Math.sin(a) * d * 0.94, rr = S.r(13, 24); clySeam(arcPts(lx, ly, rr, 0.5 + S.n(0.5), 2.6 + S.n(0.5), 8), { w: 2.8, al: 0.3 }); } } });
}
// a cloud stuck on the card: balls of cream clay pressed together (their rims are the seams), a flat shadow behind
function clyCloud(x, y, w, o = {}) {
  const key = o.key ?? 'cloud', c = o.c ?? CL.white, cast = [w * 0.035, w * 0.06];
  const parts = [[-0.3, 0.06, 0.2], [0.3, 0.07, 0.19], [-0.05, -0.07, 0.27], [0.12, 0.09, 0.2], [-0.16, 0.1, 0.18]].map(([dx, dy, r], i) => clyBlobPts(x + dx * w, y + dy * w, r * w, r * w * 0.92, { key: key + i, lump: 0.04, n: 24 }));
  parts.forEach((P, i) => { ctx.save(); ctx.translate(cast[0], cast[1]); trace(wobble(P, true, 1.4, key + i, 9), true); ctx.fillStyle = 'rgba(46,26,30,0.14)'; ctx.fill(); ctx.restore(); });
  parts.forEach((P, i) => clyLump(P, c, { key: key + i, amt: 1.4, dents: i === 2 ? 1 : 0 }));
}
// a worm peeking out of a hole in the table: a rolled sausage that sways on 2s, two bead eyes
function clyWorm(x, y, len, o = {}) {
  const key = o.key ?? 'worm', c = o.c ?? CL.pink, w = o.w ?? 24, k = clamp(o.out ?? 1), P = [];
  ctx.fillStyle = 'rgba(46,26,30,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.95, w * 0.34, 0, 0, TAU); ctx.fill();
  if (k <= 0.05) return;
  for (let i = 0; i <= 6; i++) { const f = i / 6; P.push([x + Math.sin(f * 2.6 + B * 0.7 + key.length) * w * 0.5 * f, y - f * len * k]); }
  clyRoll(P, w, c, { key, amt: 0.6 });
  const [hx, hy] = P[6]; ctx.fillStyle = CL.choc; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * w * 0.2, hy - w * 0.05, w * 0.1, 0, TAU); ctx.fill(); }
}
// grass: three short tapered blades that lean on 2s. A flower: petals pressed round a ball centre on a rolled stem.
function clyTuft(x, y, s = 1, c = CL.leaf, key = 'tuft') {
  const sw = Math.sin(B * 0.9 + key.length * 1.7) * 0.1;
  [-0.5, 0, 0.5].forEach((a, i) => clyLump(clyCapsule(x + a * 16 * s, y, x + Math.sin(a + sw) * 44 * s, y - Math.cos(a + sw) * (i === 1 ? 58 : 42) * s, 10 * s, 4.5 * s, 5), i === 1 ? c : clyTone(c, -0.12), { key: key + i, amt: 0.6, grain: false }));
}
function clyFlower(x, y, s = 1, c = CL.white, key = 'flower') {
  const sw = Math.sin(B * 0.8 + key.length) * 5 * s, tx = x + sw, ty = y - 74 * s;
  clyRoll([[x, y], [x + sw * 0.4, y - 38 * s], [tx, ty]], 10 * s, CL.leaf, { key: key + 's', amt: 0.4, nicks: false });
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3; clyLump(ellipsePts(tx + Math.cos(a) * 17 * s, ty + Math.sin(a) * 17 * s, 13 * s, 10 * s, a, 12), c, { key: key + i, amt: 0.5, grain: false }); }
  clyLump(ellipsePts(tx, ty, 11 * s, 11 * s, 0, 14), CL.mustard, { key: key + 'c', amt: 0.4, grain: false });
}
function clyPebble(x, y, rx, ry, key = 'peb', c = CL.stone) { clyShadow(x, y + ry * 0.8, rx * 1.2, ry * 0.4, 0.26); clyLump(clyBlobPts(x, y, rx, ry, { key, lump: 0.08, n: 22 }), c, { key, amt: 0.8 }); }
// a small bird: a ball body, a wing that flaps (wing = 0 | 1), a cone beak, a bead eye. Faces left; (x, y) = its centre
function clyBird(x, y, s = 1, wing = 0, key = 'bird', c = CL.blue) {
  clyLump(clyCapsule(x + 26 * s, y, x + 58 * s, y - 8 * s, 12 * s, 7 * s, 5), clyTone(c, -0.15), { key: key + 't', amt: 0.6, grain: false });
  clyLump(clyCapsule(x - 30 * s, y - 4 * s, x - 52 * s, y, 8 * s, 3 * s, 5), CL.mustard, { key: key + 'k', amt: 0.4, grain: false });
  clyLump(clyBlobPts(x, y, 36 * s, 30 * s, { key, lump: 0.04, n: 24 }), c, { key, amt: 0.9 });
  clyLump(clyCapsule(x + 6 * s, y - 2 * s, x + 22 * s, y + (wing ? 34 : -40) * s, 15 * s, 8 * s, 6), clyTone(c, 0.12), { key: key + 'w' + wing, amt: 0.7, grain: false });
  ctx.fillStyle = CL.choc; ctx.beginPath(); ctx.arc(x - 16 * s, y - 8 * s, 4.6 * s, 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------------
//  type: a rounded bold sans, set letter by letter so each letter is its own piece of clay (a hair of tilt, re-posed
//  every other boil step). Raised letters have a side and a lit face; stamped ones (o.stamp) are pressed INTO a slab.
//   o: align, key, reveal (0..1: letters pressed on one by one), stamp, jit
// ---------------------------------------------------------------------
const clyFont = (size) => { ctx.font = `800 ${size}px ${CLY_FONT}`; };
const clyTrack = (size) => size * 0.03;
function clyTextW(str, size) { ctx.save(); clyFont(size); const w = ctx.measureText(str).width + clyTrack(size) * Math.max(0, str.length - 1); ctx.restore(); return w; }
function clyText(str, x, y, size, c, o = {}) {
  ctx.save(); clyFont(size); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const n = str.length, tr = clyTrack(size), w = ctx.measureText(str).width + tr * Math.max(0, n - 1), x0 = x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0);
  const shown = clamp(o.reveal ?? 1) * n, key = o.key ?? str, jit = o.jit ?? size * 0.012, d = size * 0.055;
  for (let i = 0; i < n; i++) {
    const ch = str[i], k = clamp(shown - i); if (ch === ' ') continue; if (k <= 0) break;
    const cw = ctx.measureText(ch).width, R = RNG('clytx', key, i, B >> 1), s = o.stamp ? 1 : EZ.back(k);
    ctx.save(); ctx.translate(x0 + ctx.measureText(str.slice(0, i)).width + tr * i + cw / 2 + R.n(jit), y + R.n(jit)); ctx.rotate(R.n(0.028)); ctx.scale(s, s);
    if (o.stamp) { ctx.fillStyle = 'rgba(255,246,224,0.5)'; ctx.fillText(ch, -cw / 2 + size * 0.02, size * 0.045); ctx.fillStyle = c; ctx.fillText(ch, -cw / 2, 0); }
    else {
      ctx.lineWidth = size * 0.028;
      ctx.fillStyle = ctx.strokeStyle = 'rgba(46,26,30,0.2)'; ctx.strokeText(ch, -cw / 2 + d * 0.5, d * 1.7); ctx.fillText(ch, -cw / 2 + d * 0.5, d * 1.7);   // its shadow on the slab
      ctx.fillStyle = ctx.strokeStyle = clyTone(c, -0.45); ctx.strokeText(ch, -cw / 2, d); ctx.fillText(ch, -cw / 2, d);                                        // the side of the letter
      const g = ctx.createLinearGradient(0, -size * 0.76, 0, size * 0.06); g.addColorStop(0, clyTone(c, 0.2)); g.addColorStop(0.5, c); g.addColorStop(1, clyTone(c, -0.14));
      ctx.fillStyle = ctx.strokeStyle = g; ctx.strokeText(ch, -cw / 2, 0); ctx.fillText(ch, -cw / 2, 0);                                                        // the lit face
    }
    ctx.restore();
  }
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). The caption is a pressed strip of clay with
//  raised letters; a *word* sits on its own coloured tab pressed into the strip. The tag is a small slab with the
//  word stamped into it. Both squash away as a bridge starts and pop back when the next era is open.
// ---------------------------------------------------------------------
function clyBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.25));
    if (TT >= r.tc && TT < r.tc + d + 0.17) return EZ.o2(seg(TT, r.tc + d - 0.17, r.tc + d + 0.17));
  }
  return 1;
}
//   o: y (strip centre, 1392), x (CX), size (64), at (seconds after the era starts, 0.5), c (strip), hi (tab colour), col (text)
function clyCaptionNow(str, o = {}) {
  const fk = clyBridgeK(), at = E0 + (o.at ?? 0.5), p = popS(at) * fk; if (p <= 0.15) return;
  const size = o.size ?? 64, cx = o.x ?? CX, cy = o.y ?? 1392, c = o.c ?? CL.cream, hi = o.hi ?? CL.mustard, col = o.col ?? CL.choc, pad = size * 0.26;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  toks.forEach((t, i) => { t.w = clyTextW(t.s, size); t.gap = i === 0 ? 0 : (/^[!?.,]/.test(t.s) ? size * 0.06 : size * 0.3) + (t.hi || toks[i - 1].hi ? pad : 0); });
  const tw = toks.reduce((a, t) => a + t.w + t.gap, 0), w = tw + size * 1.5, h = size * 1.85;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.012); ctx.scale(lerp(0.5, 1, p), p);
  clyShadow(0, h * 0.5 + 8, w * 0.54, 22, 0.3);
  clyLump(rrectPts(-w / 2, -h / 2, w, h, h * 0.44, 8), c, { key: 'cap' + str, thick: 13, dents: 3, amt: 1.6, flat: true });
  let xx = -tw / 2, k = 0;
  for (const t of toks) {
    xx += t.gap;
    const rev = ev(at + 0.17 + k * 0.035, Math.max(0.1, t.s.length * 0.035));
    if (t.hi) clyLump(rrectPts(xx - pad, -size * 0.6, t.w + 2 * pad, size * 1.2, size * 0.34, 6), hi, { key: 'tab' + t.s, thick: 6, amt: 1.1, al: clamp(rev * 6), flat: true });
    clyText(t.s, xx, size * 0.33, size, t.hi ? (clyLum(hi) > 0.52 ? CL.choc : CL.white) : col, { key: 'cap' + t.s, reveal: rev });
    xx += t.w; k += t.s.length;
  }
  ctx.restore();
}
//   o: x (70, the left edge), y (300, the centre), size (50), at (0.25), c
function clyTagNow(str, o = {}) {
  const p = popS(E0 + (o.at ?? 0.25)) * clyBridgeK(); if (p <= 0.15) return;
  const size = o.size ?? 50, c = o.c ?? CL.mustard, w = clyTextW(str, size) + size * 1.3, h = size * 1.7;
  ctx.save(); ctx.translate((o.x ?? 70) + w / 2, o.y ?? 300); ctx.rotate(-0.04); ctx.scale(p, p);
  clyShadow(0, h * 0.5 + 6, w * 0.56, 16, 0.28);
  clyLump(rrectPts(-w / 2, -h / 2, w, h, h * 0.4, 8), c, { key: 'tag' + str, thick: 9, dents: 1, amt: 1.3, flat: true });
  clyText(str, 0, size * 0.35, size, clyTone(c, -0.62), { align: 'center', stamp: true, key: 'tag' + str });
  ctx.restore();
}
const clyCaption = (str, o = {}) => { const f = () => clyCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const clyTag = (str, o = {}) => { const f = () => clyTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'clay',
  paper: CL.paper,
  // the bare card in colour c (hex, or rgb() mid-morph): the lamp's pool of light and the card's grain
  backdrop(c) {
    ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.42, H * 0.36, 40, W * 0.5, H * 0.45, H * 0.6); g.addColorStop(0, 'rgba(255,246,224,0.26)'); g.addColorStop(1, 'rgba(255,246,224,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); clyBlotch(ctx, 0, 0, W, H, 14, 'backdrop', 140, 320, 0.03); ctx.globalAlpha = 0.7; ctx.fillStyle = clyGrain(); ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  // the era seen through a hole ringed by a rolled sausage in the bridge colour; the ring thins onto the object
  window(P, key, src, o = {}) {
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, wd = 40 * (o.phase === 'grow' ? Math.min(1, u * 5) : Math.min(1, (1 - u) * 5));
    if (wd >= 1) clyRoll(P, wd, o.c ?? CL.brown, { raw: true, closed: true, nicks: false, key });
  },
  // the morphing shape: a ball of clay pressed flat against the table and re-shaped, fingerprints and all
  blob(P, c, key, u = 0) {
    const ce = clyCentroid(P), bb = bbox(P), q = 0.26 * Math.sin(Math.PI * u), sx = 1 + q, sy = 1 / (1 + q);
    const Q = P.map(([x, y]) => [ce[0] + (x - ce[0]) * sx, bb.y1 + (y - bb.y1) * sy]);
    clyShadow(ce[0], bb.y1 + 8, (bb.x1 - bb.x0) * 0.56 * sx, 26, 0.3);
    clyLump(Q, c, { key, dents: 3, amt: 2.4 });
  },
  hero(x, y, r, o = {}) { clyHero(x, y, r * 0.8, { key: o.key, mood: o.mood, arms: [0.9, 0.9] }); },
  heroColor: CL.red,
  heroPts(x, y, r) { return clyHeroPts(x, y, r * 0.8); },
  // the lens: a soft vignette, and a hair of exposure flicker on every boil step (stop motion is shot frame by frame)
  post() {
    ctx.save(); screen(); ctx.drawImage(clyVignette(), 0, 0);
    const k = RNG('clyflick', B).n(0.022); ctx.fillStyle = k > 0 ? `rgba(255,246,224,${k})` : `rgba(46,26,30,${-k})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  ones: false,
};
