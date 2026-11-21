// =====================================================================
//  styles/watercolor/kit.js — WATERCOLOR: pure wet-on-wet watercolour on cold-press paper. There are NO outlines:
//  a shape is a translucent wash (multiplied onto the paper, so overlapping washes mix like glazes) with a slightly
//  ragged tide edge, darker pigment pooled at its rim, uneven pigment, backruns ("cauliflower" blooms), granulation
//  in the paper's tooth and, where the painter left it, the white of the paper. Thin things (grass, branches, legs,
//  rain) are loose tapered brush strokes. The sheet is warm white, with a visible tooth and a clean taped margin.
//  Everything expensive is a seeded tile or a cached layer; a wash is a handful of fills on a scratch canvas.
//  Built on kit/core.js. Motion on 2s. Helpers are prefixed wcl…; the palette is WCL. Needs from the piece head: CX.
// =====================================================================
const WCL = {
  paper: '#f6f1e4',                                    // warm white cold-press paper: the ground, and every highlight
  indigo: '#3f4c7c', ultra: '#5a86cc', sky: '#9fc3e6', storm: '#8590ad',     // shadows and far hills, clear sky, pale sky, rain cloud
  water: '#6f95bd', lake: '#4c9ec6',                   // a puddle under a grey sky, a lake under a clear one
  sap: '#86ad4c', olive: '#5c8048',                    // sap green (grass, near hills, leaves) and its shadow glaze
  sienna: '#b3693d', ochre: '#dfa643', lemon: '#f2d35c',   // burnt sienna (branches, earth), yellow ochre (ground, beaks), sunlight
  rose: '#de7391', violet: '#8c7abc',                  // the accent (flowers, the highlighted word's dab, rainbow ends)
  hero: '#e0562f',                                     // VERMILION: reserved for the hero
  ink: '#2c3158',                                      // the darkest pigment: lettering and the dot eye (never black)
};
const WCL_FONT = '"Bradley Hand", "Segoe Print", "Ink Free", "Comic Neue", "Comic Sans MS", "Chalkboard SE", "DejaVu Sans", cursive';

// ---------------------------------------------------------------------
//  colour: every helper accepts '#rrggbb' or 'rgb(r,g,b)' (what the renderer hands over mid-morph)
// ---------------------------------------------------------------------
function wclRGB(c) {
  if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
}
const wclA = (c, a) => { const p = wclRGB(c); return `rgba(${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])},${a})`; };
const wclMix = (a, b, u) => { const x = wclRGB(a), y = wclRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
// the same pigment laid thicker: darker and more saturated (the colour multiplied by itself), never toward black
const wclDeep = (c, k = 0.7) => { const p = wclRGB(c); return `rgb(${p.map((v) => Math.round(lerp(v, v * v / 255 * 0.92, k))).join(',')})`; };

// ---------------------------------------------------------------------
//  caches: seeded tiles (paper tooth, granulation, sediment, pigment blotches), the scratch canvas, static layers
// ---------------------------------------------------------------------
const WCL_CACHE = {};
function wclMemo(key, w, h, fn) {
  if (!WCL_CACHE[key]) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), cv); WCL_CACHE[key] = cv; }
  return WCL_CACHE[key];
}
// one height field of the paper (soft bumps + fine noise, wrapping) feeds three tiles, so pigment settles where the
// paper is low and skips where it is high:  tooth = the lit bumps (multiplied over the whole frame in STYLE.post),
// gran = alpha on the high spots (erased from a wash), sed = dark sediment in the low spots (added to a wash)
function wclTiles() {
  if (WCL_CACHE.tiles) return WCL_CACHE.tiles;
  const N = 256, R = RNG('wcltooth'), Hf = new Float32Array(N * N);
  const oct = (G) => { const grid = new Float32Array(G * G), cell = N / G; for (let i = 0; i < G * G; i++) grid[i] = R.f(); return (x, y) => {
    const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy);
    let fx = gx - ix, fy = gy - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = grid[(iy % G) * G + (ix % G)], b = grid[(iy % G) * G + ((ix + 1) % G)], c = grid[((iy + 1) % G) * G + (ix % G)], d = grid[((iy + 1) % G) * G + ((ix + 1) % G)];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  }; };
  const o1 = oct(85), o2 = oct(32), o3 = oct(11);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) Hf[y * N + x] = 0.42 * o1(x, y) + 0.3 * o2(x, y) + 0.1 * o3(x, y) + 0.18 * R.f();
  const mk = (px) => wclMemo('tile' + px.name, N, N, (g) => {
    const im = g.createImageData(N, N), D = im.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, v = px(Hf[i], Hf[((y + 1) % N) * N + ((x + 1) % N)]); D[i * 4] = v[0]; D[i * 4 + 1] = v[1]; D[i * 4 + 2] = v[2]; D[i * 4 + 3] = v[3]; }
    g.putImageData(im, 0, 0);
  });
  const tooth = (h, h2) => { const v = clamp(248 + (h - h2) * 85, 224, 255); return [v, v - 1, v - 5, 255]; };
  const gran = (h) => [0, 0, 0, 255 * clamp((h - 0.6) * 4)];
  const sed = (h) => [40, 46, 82, 255 * clamp((0.4 - h) * 4)];
  const blotch = wclMemo('tileblotch', 512, 512, (g) => {
    const S = RNG('wclblotch');
    for (let i = 0; i < 24; i++) {
      const x = S.r(0, 512), y = S.r(0, 512), r = S.r(46, 130), a = S.r(0.25, 0.62);
      for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
        if (x + ox < -r || x + ox > 512 + r || y + oy < -r || y + oy > 512 + r) continue;
        const gr = g.createRadialGradient(x + ox, y + oy, r * 0.1, x + ox, y + oy, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  });
  return (WCL_CACHE.tiles = { tooth: mk(tooth), gran: mk(gran), sed: mk(sed), blotch });
}
function wclPat(name) { return WCL_CACHE['pat' + name] || (WCL_CACHE['pat' + name] = ctx.createPattern(wclTiles()[name], 'repeat')); }
// the scratch canvases: a wash is built here in full strength (so it can be erased into), then multiplied onto the
// frame. A few sizes are kept and the smallest that fits is used: handing a small canvas to drawImage is much cheaper.
function wclScratch(w, h) { const m = Math.max(w, h), s = m <= 160 ? 160 : m <= 320 ? 320 : m <= 640 ? 640 : 0; return s ? wclMemo('scratch' + s, s, s, () => {}) : wclMemo('scratch', W, H, () => {}); }
// open a scratch region covering the world-space box (under the current transform); returns null when it is off-frame
function wclBegin(x0, y0, x1, y1) {
  const T = ctx.getTransform(), cs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f]);
  const sx0 = Math.max(0, Math.floor(Math.min(...cs.map((p) => p[0])))), sy0 = Math.max(0, Math.floor(Math.min(...cs.map((p) => p[1]))));
  const sx1 = Math.min(W, Math.ceil(Math.max(...cs.map((p) => p[0])))), sy1 = Math.min(H, Math.ceil(Math.max(...cs.map((p) => p[1]))));
  const w = sx1 - sx0, h = sy1 - sy0; if (w < 1 || h < 1) return null;
  const cv = wclScratch(w, h), g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]);
  g.clearRect(0, 0, w, h);
  g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip(); g.setTransform(T.a, T.b, T.c, T.d, T.e - sx0, T.f - sy0);
  g.lineJoin = g.lineCap = 'round';
  return { g, cv, T, x: sx0, y: sy0, w, h, z: Math.hypot(T.a, T.b) };
}
function wclEnd(R, al = 1, mode = 'multiply') {
  R.g.restore();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = mode; ctx.globalAlpha *= al;
  ctx.drawImage(R.cv, 0, 0, R.w, R.h, R.x, R.y, R.w, R.h); ctx.restore();
}
// fill the open region with a tile (screen space; mx = an optional DOMMatrix placing the tile on the screen)
function wclPatFill(R, name, al, mode, mx) {
  if (al <= 0.004) return;
  const g = R.g, p = wclPat(name); p.setTransform(new DOMMatrix().translate(-R.x, -R.y).multiply(mx || new DOMMatrix()));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = mode; g.globalAlpha = Math.min(1, al); g.fillStyle = p; g.fillRect(0, 0, R.w, R.h); g.restore();
}
// a static part of the painting (sky, hills, ground), painted once into its own sheet and glazed on every frame.
// fn draws in world coords with the kit's helpers; it must not depend on TT or B.  o.ground = true: the layer is the
// scene's first coat, kept on its own sheet of paper and laid down opaque (cheaper than a glaze; it covers what is
// under it).  o.al: its strength.  (Inside a layer a wash's `mask` only reserves paper within that layer.)
function wclLayer(key, fn, o = {}) {
  const cv = wclMemo('layer' + key, W, H, (g) => { const keep = ctx, kd = DEFER; ctx = g; DEFER = null; if (o.ground) { g.fillStyle = WCL.paper; g.fillRect(0, 0, W, H); } try { fn(); } finally { ctx = keep; DEFER = kd; } });
  ctx.save(); if (!o.ground) ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= o.al ?? 1; ctx.drawImage(cv, 0, 0); ctx.restore();
}

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
const wclCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// the ragged edge water leaves: slow swells plus a fine tremble. Seeded by key only, so paint stays put on the paper;
// boil = true re-seeds it on every boil step (a thing that is repainted each drawing: the hero)
function wclEdge(P, closed, amt, key, boil = false, step = 10) {
  const Q = resample(P, closed, step), n = Q.length, R = RNG('wcle', key, boil ? B : -1);
  const f1 = R.r(0.011, 0.024), f2 = R.r(0.04, 0.075), f3 = R.r(0.13, 0.2), p1 = R.r(0, TAU), p2 = R.r(0, TAU), p3 = R.r(0, TAU);
  const out = new Array(n); let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    const d = amt * (0.7 * Math.sin(s * f1 + p1) + 0.4 * Math.sin(s * f2 + p2) + 0.22 * Math.sin(s * f3 + p3)) + R.n(amt * 0.18);
    out[i] = [Q[i][0] + nx / l * d, Q[i][1] + ny / l * d];
  }
  return out;
}
function wclTrace(g, P, closed) {
  g.beginPath(); const n = P.length; if (n < 2) return;
  if (closed) {
    g.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    g.closePath();
  } else {
    g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < n - 1; i++) { const p = P[i], q = P[i + 1]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    g.lineTo(P[n - 1][0], P[n - 1][1]);
  }
}
// a puddle of paint: an ellipse with a few fixed slow lumps (seeded by key). o: key, lump (0.07), n, rot
function wclBlobPts(x, y, rx, ry, o = {}) {
  const S = RNG('wclblob', o.key ?? 'blob'), n = o.n ?? 64, lump = o.lump ?? 0.07, ph = [S.r(0, TAU), S.r(0, TAU), S.r(0, TAU)], P = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + lump * (0.5 * Math.sin(2 * a + ph[0]) + 0.32 * Math.sin(3 * a + ph[1]) + 0.2 * Math.sin(5 * a + ph[2])); P.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]); }
  return xform(P, x, y, o.rot ?? 0);
}
// the outline of several overlapping ellipses [[x, y, rx, ry, rot?], ...] painted as ONE wash (a cloud, a bird's
// head on its body): overlapping two washes instead would leave a darker lens where they cross
function wclUnionPts(E, n = 56) {
  let cx = 0, cy = 0, A = 0, far = 0;
  for (const [x, y, rx, ry] of E) { const a = rx * ry; cx += x * a; cy += y * a; A += a; }
  cx /= A; cy /= A;
  for (const [x, y, rx, ry] of E) far = Math.max(far, Math.hypot(x - cx, y - cy) + Math.max(rx, ry));
  const inside = (px, py) => E.some(([x, y, rx, ry, rot = 0]) => { const c = Math.cos(-rot), s = Math.sin(-rot), dx = px - x, dy = py - y, u = (dx * c - dy * s) / rx, v = (dx * s + dy * c) / ry; return u * u + v * v <= 1; });
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, ca = Math.cos(a), sa = Math.sin(a); let lo = 0, hi = far;
    for (let t = far; t > 0; t -= far / 60) if (inside(cx + ca * t, cy + sa * t)) { lo = t; hi = t + far / 60; break; }
    for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (inside(cx + ca * m, cy + sa * m)) lo = m; else hi = m; }
    P.push([cx + ca * lo, cy + sa * lo]);
  }
  return P;
}
// a ridge line from x0 to x1 around height y (seeded swells of height amp), closed down to `base`
function wclHillPts(x0, x1, y, amp, key, base) {
  const S = RNG('wclhill', key), p = [S.r(0, TAU), S.r(0, TAU), S.r(0, TAU)], f = S.r(0.8, 1.3), P = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; P.push([lerp(x0, x1, u), y - amp * (0.6 * Math.sin(u * 3.1 * f + p[0]) + 0.3 * Math.sin(u * 7.3 * f + p[1]) + 0.1 * Math.sin(u * 15 + p[2]))]); }
  P.push([x1, base], [x0, base]); return P;
}
// progress of a wash that starts blooming at time t0 (seconds) and has settled d seconds later
const wclBloom = (t0, d = 0.6) => clamp((TT - t0) / d);

// ---------------------------------------------------------------------
//  THE WASH — the one primitive everything is made of.  wclWash(P, colour, o)
//   P: closed outline in world coords.   o:
//   key      seeds the edge, the blotches and the backruns (keep it stable)
//   al       pigment strength 0..1 (0.8): the wash is multiplied onto what is under it
//   soft     px of wet-in-wet feathering (0 = a crisp dried edge with a tide fringe)
//   rim      edge darkening 0..1 (0.6; soft washes 0.15): pigment pooled where the puddle dried
//   uneven   0..1 (0.45) how blotchy the pigment lies;  gran 0..1 (1) granulation in the paper tooth
//   blooms   number of backruns (default by area, 0-3)
//   keep     [[x, y, rx, ry, a?], ...] soft spots where the white of the paper is left
//   grade    [x0, y0, x1, y1, a?] a graded wash: full strength at (x0,y0) running out to clear water at (x1,y1)
//   bloom    0..1 the wash arriving: a wet spot spreads from `from` (default its centre) with a pale feathered edge
//            leading, then the pigment settles and the rim darkens.  wet 0..1 keeps a settled wash looking wet
//   lift     0..1 the wash being lifted off with clean water (how things leave)
//   mask     0..1 paper reserved under the wash first (masking fluid): what is behind does not show through
//   amt, raw, boil, deep (rim colour), from, rimW
// ---------------------------------------------------------------------
function wclWash(P, c, o = {}) {
  const key = o.key ?? 'wash', bloom = clamp(o.bloom ?? 1), lift = clamp(o.lift ?? 0);
  if (bloom <= 0.02 || lift >= 0.98 || P.length < 3) return P;
  const spread = EZ.o3(seg(bloom, 0, 0.7)), settle = seg(bloom, 0.45, 1), wet = Math.max(1 - settle, clamp(o.wet ?? 0));
  const soft = o.soft ?? 0, feather = soft + wet * (o.wetSoft ?? 12), amt = o.amt ?? 3;
  const k = lerp(0.1, 1, spread), ce = k < 1 ? (o.from ?? wclCentroid(P)) : null, bp = bbox(P);
  const shape = (a, kk) => { const Q = o.raw ? P : wclEdge(P, true, a, kk, o.boil); return ce ? Q.map(([x, y]) => [ce[0] + (x - ce[0]) * k, ce[1] + (y - ce[1]) * k]) : Q; };
  const Q = shape(amt, key), bb = bbox(Q, feather + amt * 3 + 6);
  if (o.mask) {
    ctx.save(); ctx.globalAlpha *= o.mask * (1 - lift) * seg(bloom, 0, 0.3); ctx.fillStyle = ctx.strokeStyle = WCL.paper; ctx.lineJoin = 'round';
    wclTrace(ctx, Q, true); ctx.fill(); if (feather > 1.5) { ctx.lineWidth = feather; ctx.stroke(); } ctx.restore();
  }
  const R = wclBegin(bb.x0, bb.y0, bb.x1, bb.y1); if (!R) return Q;
  const g = R.g, deep = o.deep ?? wclDeep(c), size = Math.min(bp.x1 - bp.x0, bp.y1 - bp.y0);
  // the puddle: a feathered wet edge, or a crisp dried one with a paler tide fringe just outside it
  g.fillStyle = g.strokeStyle = c;
  if (feather > 1.5) { g.globalAlpha = 0.3; for (let i = 5; i >= 1; i--) { g.lineWidth = 2 * feather * i / 5; wclTrace(g, Q, true); g.stroke(); } }
  else if (!o.raw) { g.globalAlpha = 0.45; wclTrace(g, shape(amt * 2.2, key + '~'), true); g.fill(); }
  g.globalAlpha = 1; wclTrace(g, Q, true); g.fill();
  // pigment lies unevenly (blotches that travel with the shape) and skips the high spots of the paper
  const S = RNG('wclun', key), ox = R.T.a * bp.x0 + R.T.c * bp.y0 + R.T.e, oy = R.T.b * bp.x0 + R.T.d * bp.y0 + R.T.f;
  if (size > 50) wclPatFill(R, 'blotch', o.uneven ?? 0.45, 'destination-out', new DOMMatrix().translate(ox + S.r(0, 512), oy + S.r(0, 512)).scale(R.z * (o.blotch ?? 1.3)));
  const gran = o.gran ?? 1; wclPatFill(R, 'gran', 0.42 * gran * (0.4 + 0.6 * settle), 'destination-out');
  // white of the paper, graded washes, lifting
  g.globalCompositeOperation = 'destination-out';
  const spot = (x, y, rx, ry, a) => { g.save(); g.translate(x, y); g.scale(rx, ry); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.5, `rgba(0,0,0,${a * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore(); };
  for (const [x, y, rx, ry, a = 0.85] of o.keep || []) spot(x, y, rx, ry, a);
  if (o.grade) { const [x0, y0, x1, y1, a = 1] = o.grade, gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); }
  if (lift > 0) for (let i = 0; i < 4; i++) { const r = size * (0.2 + 0.5 * lift); spot(lerp(bp.x0, bp.x1, S.r(0.2, 0.8)), lerp(bp.y0, bp.y1, S.r(0.2, 0.8)), r * 1.4, r, lift); }
  // edge darkening: the pooled pigment line (broken, like a real one) inside the rim
  const rim = (o.rim ?? (soft ? 0.15 : 0.6)) * (1 - wet);
  if (rim > 0.01) {
    const rw = o.rimW ?? clamp(size / 170, 0.4, 1.25);
    g.globalCompositeOperation = 'source-atop'; g.strokeStyle = deep;
    for (const [w, a] of [[22, 0.13], [10, 0.26]]) { g.lineWidth = w * rw; g.globalAlpha = a * rim; wclTrace(g, Q, true); g.stroke(); }
    g.setLineDash([S.r(50, 130), S.r(8, 26), S.r(90, 220), S.r(6, 20)]); g.lineWidth = 3.4 * rw; g.globalAlpha = 0.62 * rim; wclTrace(g, Q, true); g.stroke(); g.setLineDash([]);
  }
  // backruns: water crept back into drying paint: a paler centre and a ragged pigment line round it
  const nb = o.blooms ?? clamp(Math.floor((bp.x1 - bp.x0) * (bp.y1 - bp.y0) / 70000), 0, 3);
  for (let i = 0; i < nb; i++) {
    const Sb = RNG('wclbr', key, i), x = lerp(bp.x0, bp.x1, Sb.r(0.22, 0.78)), y = lerp(bp.y0, bp.y1, Sb.r(0.25, 0.75)), r = Math.min(110, size * Sb.r(0.16, 0.28));
    g.globalCompositeOperation = 'destination-out'; spot(x, y, r * 1.25, r, 0.34);
    g.globalCompositeOperation = 'source-atop'; g.strokeStyle = deep; g.lineWidth = 2.8; g.globalAlpha = 0.46 * settle;
    wclTrace(g, wclEdge(ellipsePts(x, y, r * 1.2, r * 0.95, Sb.r(0, 3), 30), true, r * 0.1, key + 'br' + i, false, 7), true); g.stroke();
  }
  g.globalAlpha = 1;
  if (size > 90) wclPatFill(R, 'sed', 0.42 * gran * settle, 'source-atop');
  wclEnd(R, (o.al ?? 0.8) * lerp(0.6, 1, settle) * (1 - lift));
  return Q;
}

// ---------------------------------------------------------------------
//  small marks, painted straight onto the frame (multiplied): dabs, brush strokes, splatter, lifted lights
// ---------------------------------------------------------------------
// a touch of the brush: a small ellipse with its own pooled rim. o: rot, al, deep, mask (paper reserved under it)
function wclDab(x, y, rx, ry, c, o = {}) {
  if (rx <= 0.3 || ry <= 0.3) return;
  const lw = Math.max(1, Math.min(rx, ry) * 0.3);
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, o.rot ?? 0, 0, TAU);
  if (o.mask) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * o.mask; ctx.fillStyle = WCL.paper; ctx.fill(); ctx.globalAlpha = ga; }
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= o.al ?? 0.8; ctx.fillStyle = c; ctx.fill();
  ctx.globalAlpha *= 0.55; ctx.strokeStyle = o.deep ?? wclDeep(c); ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.2, rx - lw / 2), Math.max(0.2, ry - lw / 2), o.rot ?? 0, 0, TAU); ctx.stroke(); ctx.restore();
}
// a small flat shape in one touch (a beak, a petal, a leaf). o: al, mask
function wclPoly(P, c, o = {}) {
  ctx.save(); trace(P, true);
  if (o.mask) { ctx.fillStyle = WCL.paper; const ga = ctx.globalAlpha; ctx.globalAlpha = ga * o.mask; ctx.fill(); ctx.globalAlpha = ga; }
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= o.al ?? 0.85; ctx.fillStyle = c; ctx.fill();
  ctx.globalAlpha *= 0.45; ctx.strokeStyle = wclDeep(c); ctx.lineWidth = o.w ?? 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
}
// a loose brush stroke along the polyline P: w = its widest, taper = [start, end] width fractions, dry 0..1 = how much
// the bristles skip (paper showing in streaks), frac = how much of it is painted so far. o: key, al, taper, dry, frac
function wclBrush(P, w, c, o = {}) {
  const fr = clamp(o.frac ?? 1); if (fr <= 0.01) return;
  const key = o.key ?? 'br', [ta, tb] = o.taper ?? [0.55, 0.12], S = RNG('wclbrush', key);
  let Q = resample(P, false, Math.max(5, w * 0.6)); if (fr < 1) Q = subPath(Q, fr);
  const n = Q.length; if (n < 2) return;
  const wob = [S.r(0, TAU), S.r(0.5, 1.4)], L = [], Rr = [], off = [];
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, f = i / (n - 1);
    const h = w / 2 * Math.min(1, lerp(ta, 1, f / 0.3)) * Math.min(1, lerp(tb, 1, (1 - f) / 0.45)) * (1 + 0.14 * Math.sin(f * 9 * wob[1] + wob[0]));
    off.push([nx / l, ny / l, h]); L.push([Q[i][0] + nx / l * h, Q[i][1] + ny / l * h]); Rr.unshift([Q[i][0] - nx / l * h, Q[i][1] - ny / l * h]);
  }
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= o.al ?? 0.82; ctx.fillStyle = c; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (const p of Rr) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = wclDeep(c); ctx.lineWidth = Math.max(0.8, w * 0.12); ctx.globalAlpha *= 0.4; ctx.beginPath(); for (const p of Rr) ctx.lineTo(p[0], p[1]); ctx.stroke();   // pigment pooled along one side
  ctx.restore();
  const dry = o.dry ?? 0.5;
  if (dry > 0 && w >= 5) {   // dry-brush streaks: the bristles skipped, the paper shows
    ctx.save(); ctx.strokeStyle = WCL.paper; ctx.lineCap = 'butt'; ctx.globalAlpha *= 0.8 * dry;
    for (let j = 0; j < 3; j++) {
      const d = S.r(-0.6, 0.6); ctx.lineWidth = Math.max(1, w * S.r(0.08, 0.16)); ctx.setLineDash([S.r(6, 22), S.r(8, 30)]); ctx.lineDashOffset = S.r(0, 40);
      ctx.beginPath(); for (let i = 0; i < n; i++) ctx.lineTo(Q[i][0] + off[i][0] * off[i][2] * d, Q[i][1] + off[i][1] * off[i][2] * d); ctx.stroke();
    }
    ctx.restore();
  }
}
// flicked drops round (x, y): n seeded dots within radius r, a few larger. o: al, s (dot size 1)
function wclSplatter(x, y, r, n, c, key = 'spl', o = {}) {
  const S = RNG('wclspl', key), s = o.s ?? 1;
  for (let i = 0; i < n; i++) { const a = S.r(0, TAU), d = r * Math.sqrt(S.f()), rr = s * (S.f() < 0.25 ? S.r(5, 9) : S.r(1.6, 4.2)); wclDab(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, rr, rr * S.r(0.75, 1), c, { al: (o.al ?? 0.7) * S.r(0.6, 1) }); }
}
// lift a light out of what is already painted: a soft spot of clean paper
function wclLight(x, y, rx, ry, al = 0.6) {
  ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, wclA(WCL.paper, al)); gr.addColorStop(0.55, wclA(WCL.paper, al * 0.6)); gr.addColorStop(1, wclA(WCL.paper, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  the set: sky, hills, ground. Paint them inside wclLayer(key, () => { ... }) so they are made once.
// ---------------------------------------------------------------------
// a graded sky from the top of the sheet down to the horizon hz, where it has run out to clear water. o: key, al, soft
function wclSky(c, hz, o = {}) {
  wclWash(resample([[-60, -60], [W + 60, -60], [W + 60, hz + 40], [-60, hz + 40]], true, 60), c, { key: o.key ?? 'sky', raw: true, al: o.al ?? 0.75, soft: 1, rim: 0, uneven: o.uneven ?? 0.7, blotch: 2.4, blooms: o.blooms ?? 3, grade: [0, hz * (o.from ?? 0.25), 0, hz, o.to ?? 0.92] });
}
// a ridge of hills glazed over the sky: strong along the ridge, thinning to mist at `base`. o: key, al, amp, x0, x1
function wclHills(y, base, c, o = {}) {
  const key = o.key ?? 'hills';
  wclWash(wclHillPts(o.x0 ?? -60, o.x1 ?? W + 60, y, o.amp ?? 40, key, base + 20), c, { key, al: o.al ?? 0.75, amt: 2.5, rim: o.rim ?? 0.5, blooms: o.blooms ?? 2, grade: [0, y + (base - y) * 0.2, 0, base, o.to ?? 0.9] });
}
// the ground: a wash from the horizon down that runs out into bare paper at `base` (captions then sit on clean paper)
function wclGround(y, base, c, o = {}) {
  const key = o.key ?? 'ground';
  wclWash(wclHillPts(-60, W + 60, y, o.amp ?? 10, key, base + 30), c, { key, al: o.al ?? 0.6, amt: 2, rim: 0.2, uneven: 0.6, blotch: 2, blooms: o.blooms ?? 2, grade: [0, y + (base - y) * 0.35, 0, base, 1] });
}

// ---------------------------------------------------------------------
//  props (background life)
// ---------------------------------------------------------------------
// a cloud, wet-in-wet: one soft wash, a darker belly glazed in while it is damp, its top left as paper.
//   (x, y) = its centre, w = its width. o: key, bloom, al, belly (colour of the belly glaze | false), fair (true = a white
//   cloud lifted out of the sky with only a pale shadow under it), lift
const wclCloudPts = (x, y, w) => wclUnionPts([[x - 0.27 * w, y + 0.04 * w, 0.23 * w, 0.14 * w], [x + 0.25 * w, y + 0.05 * w, 0.25 * w, 0.13 * w], [x - 0.02 * w, y - 0.07 * w, 0.25 * w, 0.19 * w], [x + 0.06 * w, y + 0.09 * w, 0.34 * w, 0.11 * w]], 48);
function wclCloud(x, y, w, c = WCL.storm, o = {}) {
  const key = o.key ?? 'cloud', bl = o.bloom ?? 1, P = wclCloudPts(x, y, w);
  if (o.fair) {
    wclWash(P, c, { key, bloom: bl, lift: o.lift, soft: w * 0.05, al: o.al ?? 0.3, mask: 0.9, rim: 0, blooms: 0, uneven: 0.7, keep: [[x - 0.05 * w, y - 0.08 * w, 0.36 * w, 0.17 * w, 0.95]] });
    return;
  }
  wclWash(P, c, { key, bloom: bl, lift: o.lift, soft: w * 0.045, al: o.al ?? 0.8, rim: 0.3, blooms: 2, uneven: 0.65, blotch: 1, keep: [[x - 0.1 * w, y - 0.12 * w, 0.2 * w, 0.09 * w, 0.6]], from: [x, y] });
  if (o.belly !== false) wclWash(ellipsePts(x + 0.02 * w, y + 0.1 * w, 0.36 * w, 0.085 * w, 0, 28), o.belly ?? WCL.indigo, { key: key + 'b', bloom: seg(bl, 0.35, 1), lift: o.lift, soft: w * 0.05, al: 0.55, rim: 0, blooms: 0, from: [x, y] });
}
// falling rain: n short slanted strokes looping through the box (x0, y0)-(x1, y1). o: key, c, al, slant, speed (px/s), len
function wclRain(x0, y0, x1, y1, n, o = {}) {
  const al = o.al ?? 1; if (al <= 0.02) return;
  const key = o.key ?? 'rain', sl = o.slant ?? -0.16, sp = o.speed ?? 1000, hgt = y1 - y0;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = o.c ?? WCL.indigo; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const S = RNG('wclrain', key, i), px = S.r(x0, x1), y = y0 + mod(S.f() * hgt + TT * sp * S.r(0.8, 1.2), hgt), len = (o.len ?? 46) * S.r(0.6, 1.3);
    const fade = seg(y, y0, y0 + 70) * (1 - seg(y, y1 - 90, y1));
    ctx.globalAlpha = 0.55 * al * fade * S.r(0.55, 1); ctx.lineWidth = S.r(3, 5.6);
    ctx.beginPath(); ctx.moveTo(px + sl * (y - y0), y); ctx.lineTo(px + sl * (y - y0 + len), y + len); ctx.stroke();
  }
  ctx.restore();
}
// one ring spreading on water: a lifted light line and the pigment it pushed aside. age = seconds since it began.
//   o: dur (0.9), sq (how flat, 0.28), c (the water's colour)
function wclRipple(x, y, rx, age, o = {}) {
  const dur = o.dur ?? 0.9, k = age / dur; if (k <= 0 || k >= 1) return;
  const sq = o.sq ?? 0.28, c = wclDeep(o.c ?? WCL.water);
  for (const d of [0, 0.3]) {
    const u = k - d; if (u <= 0) continue;
    const r = rx * (0.2 + 0.8 * EZ.o2(u / (1 - d))), a = 1 - u / (1 - d);
    ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = wclA(WCL.paper, 0.75 * a); ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'multiply'; ctx.lineWidth = 2.6; ctx.strokeStyle = c; ctx.globalAlpha *= 0.5 * a; ctx.beginPath(); ctx.ellipse(x, y + 4, r + 3, r * sq + 2, 0, 0.15, Math.PI - 0.15); ctx.stroke(); ctx.restore();
  }
}
// drops thrown up from (x, y): age = seconds since the impact. o: key, n, power
function wclSplash(x, y, age, c, o = {}) {
  if (age < 0 || age > 0.5) return;
  const n = o.n ?? 5, pw = o.power ?? 1;
  for (let i = 0; i < n; i++) { const S = RNG('wclsplash', o.key ?? 's', i), vx = S.n(170) * pw, vy = -S.r(240, 420) * pw, r = S.r(3, 6.5) * (1 - age); wclDab(x + vx * age, y + vy * age + 900 * age * age, r, r * 1.2, c, { al: 0.75 }); }
}
// grass: a few dry-brush blades leaning on 2s. A reed: a tall stalk with a sienna head. (x, y) = the root.
function wclGrass(x, y, s = 1, c = WCL.sap, key = 'grass', n = 5) {
  const sw = Math.sin(B * 0.55 + hash(key) % 7) * 0.09;
  for (let i = 0; i < n; i++) { const S = RNG('wclgrass', key, i), a = (i / (n - 1) - 0.5) * 1.1 + S.n(0.12) + sw, h = S.r(46, 86) * s, bx = x + (i - (n - 1) / 2) * 9 * s; wclBrush([[bx, y], [bx + Math.sin(a) * h * 0.45, y - Math.cos(a) * h * 0.55], [bx + Math.sin(a * 1.5) * h, y - Math.cos(a) * h]], 9 * s, i % 2 ? c : wclDeep(c, 0.4), { key: key + i, dry: 0.5, taper: [0.9, 0.08], al: 0.8 }); }
}
function wclReed(x, y, h, key = 'reed', o = {}) {
  const sw = Math.sin(B * 0.45 + hash(key) % 5) * 0.05 + (o.lean ?? 0.04), tx = x + Math.sin(sw) * h, ty = y - Math.cos(sw) * h;
  wclBrush([[x, y], [lerp(x, tx, 0.5) - 3, lerp(y, ty, 0.5)], [tx, ty]], 7, o.c ?? WCL.olive, { key, dry: 0.4, taper: [1, 0.5] });
  wclBrush([[lerp(x, tx, 0.72), lerp(y, ty, 0.72)], [lerp(x, tx, 0.96), lerp(y, ty, 0.96)]], 19, WCL.sienna, { key: key + 'h', dry: 0.3, taper: [0.5, 0.5], al: 0.9 });
  wclBrush([[x + 3, y], [x + 22 + sw * 90, y - h * 0.32], [x + 50 + sw * 160, y - h * 0.42]], 10, WCL.sap, { key: key + 'l', dry: 0.4, taper: [0.8, 0.05] });
}
// a tree: a dry-brush trunk and two branches, a crown of three overlapping glazes (sap, a shadow, a sunny touch)
function wclTree(x, base, h, o = {}) {
  const key = o.key ?? 'tree', r = o.r ?? h * 0.34, cy = base - h + r * 0.7, bl = o.bloom ?? 1;
  wclBrush([[x, base], [x - 3, base - h * 0.3], [x + 2, cy + r * 0.2]], h * 0.085, WCL.sienna, { key, dry: 0.6, taper: [1, 0.4] });
  wclBrush([[x, base - h * 0.34], [x - r * 0.4, cy + r * 0.3], [x - r * 0.62, cy + r * 0.05]], h * 0.04, WCL.sienna, { key: key + 'a', dry: 0.4, taper: [1, 0.2] });
  wclBrush([[x + 1, base - h * 0.4], [x + r * 0.4, cy + r * 0.25], [x + r * 0.6, cy - r * 0.05]], h * 0.04, WCL.sienna, { key: key + 'b', dry: 0.4, taper: [1, 0.2] });
  wclWash(wclBlobPts(x, cy, r, r * 0.86, { key, lump: 0.12 }), o.c ?? WCL.sap, { key: key + 'c', bloom: bl, mask: o.mask ?? 0.8, al: 0.8, blooms: 1, keep: [[x - r * 0.3, cy - r * 0.35, r * 0.4, r * 0.3, 0.6]] });
  wclWash(wclBlobPts(x + r * 0.28, cy + r * 0.3, r * 0.62, r * 0.46, { key: key + 's', lump: 0.14 }), WCL.olive, { key: key + 's', bloom: seg(bl, 0.3, 1), al: 0.6, soft: 6, blooms: 0 });
  wclWash(wclBlobPts(x - r * 0.42, cy - r * 0.3, r * 0.46, r * 0.36, { key: key + 'y', lump: 0.14 }), WCL.lemon, { key: key + 'y', bloom: seg(bl, 0.3, 1), al: 0.55, soft: 6, blooms: 0, rim: 0 });
}
// a broad leaf on a stalk (a taro leaf to shelter under): the stalk rises from (x, y) to the leaf, centre (lx, ly), half-width r
function wclBigLeaf(x, y, lx, ly, r, o = {}) {
  const key = o.key ?? 'leaf', rot = o.rot ?? 0, c = o.c ?? WCL.sap, P = [];
  wclBrush([[x, y], [lerp(x, lx, 0.35) - r * 0.2, lerp(y, ly, 0.5)], [lx - r * 0.1, ly + r * 0.05]], r * 0.11, WCL.olive, { key: key + 's', dry: 0.4, taper: [1, 0.6] });
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, k = 1 - 0.3 * Math.max(0, Math.cos(a - Math.PI)) ** 6 + 0.26 * Math.max(0, Math.cos(a)) ** 5; P.push([Math.cos(a) * r * 1.15 * k, Math.sin(a) * r * 0.5 * (1 - 0.25 * Math.cos(a))]); }
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot);
  wclWash(P, c, { key, al: 0.85, mask: o.mask ?? 0.85, blooms: 1, amt: 2.5, keep: [[-r * 0.3, -r * 0.2, r * 0.5, r * 0.16, 0.5]] });
  wclWash(P.map(([px, py]) => [px, Math.max(py, r * 0.04) + r * 0.02]), WCL.olive, { key: key + 'u', al: 0.45, soft: 5, rim: 0, blooms: 0, raw: true });   // the underside glaze
  ctx.strokeStyle = wclA(WCL.paper, 0.5); ctx.lineWidth = 3; ctx.lineCap = 'round';   // veins: lifted with a damp brush
  ctx.beginPath(); ctx.moveTo(-r * 0.95, 0); ctx.quadraticCurveTo(0, -r * 0.08, r * 1.3, 0);
  for (const u of [-0.5, -0.05, 0.4, 0.8]) { ctx.moveTo(u * r, -r * 0.03); ctx.lineTo(u * r + r * 0.24, -r * 0.3); ctx.moveTo(u * r, 0); ctx.lineTo(u * r + r * 0.22, r * 0.28); }
  ctx.stroke(); ctx.restore();
}
// a small leaf in one touch (falling leaves, leaves on a branch); a far bird in two strokes (flap -1..1)
function wclLeaf(x, y, rot, s = 1, c = WCL.ochre) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  wclPoly([[-20 * s, 0], [-6 * s, -9 * s], [14 * s, -6 * s], [24 * s, 0], [12 * s, 7 * s], [-6 * s, 8 * s]], c, { al: 0.8, w: 1.6 });
  ctx.restore();
}
function wclFarBird(x, y, s = 1, flap = 0, c = WCL.indigo, key = 'fb') {
  const d = -16 * s * flap - 6 * s;
  wclBrush([[x, y], [x - 16 * s, y + d * 0.9], [x - 34 * s, y + d * 0.6]], 6.5 * s, c, { key: key + 'l', dry: 0, taper: [0.9, 0.1], al: 0.75 });
  wclBrush([[x, y], [x + 15 * s, y + d], [x + 32 * s, y + d * 0.55]], 6.5 * s, c, { key: key + 'r', dry: 0, taper: [0.9, 0.1], al: 0.75 });
}
// a flower: a stalk and petals dabbed round a centre; s = how open (pop it with popS)
function wclFlower(x, y, h, c = WCL.rose, key = 'fl', s = 1) {
  const sw = Math.sin(B * 0.5 + hash(key) % 9) * 4, tx = x + sw, ty = y - h;
  wclBrush([[x, y], [x + sw * 0.3 - 4, y - h * 0.5], [tx, ty]], 5, WCL.olive, { key, dry: 0.2, taper: [1, 0.6] });
  if (s <= 0.05) return;
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; wclDab(tx + Math.cos(a) * 12 * s, ty + Math.sin(a) * 12 * s, 10 * s, 7 * s, c, { rot: a, al: 0.8, mask: 0.85 }); }
  wclDab(tx, ty, 5.5 * s, 5.5 * s, WCL.ochre, { al: 0.9, mask: 0.85 });
}
// a stone: a small grey wash with the light left on its top
function wclStone(x, y, rx, ry, key = 'stone', c = WCL.storm, o = {}) {
  wclWash(wclBlobPts(x, y, rx, ry, { key, lump: 0.12, n: 28 }), c, { key, mask: o.mask ?? 0.85, al: 0.7, amt: 1.5, blooms: 0, keep: [[x - rx * 0.2, y - ry * 0.4, rx * 0.6, ry * 0.45, 0.8]] });
}
// the sun: bare paper with a soft halo of lemon and ochre bled round it. o: key, bloom
function wclSun(x, y, r, o = {}) {
  const key = o.key ?? 'sun', bl = o.bloom ?? 1;
  wclWash(ellipsePts(x, y, r * 2.1, r * 2.1, 0, 40), WCL.lemon, { key, bloom: bl, soft: r * 0.7, al: 0.75, rim: 0, blooms: 0, uneven: 0.4, gran: 0.25, keep: [[x, y, r * 1.15, r * 1.15, 1]] });
  wclWash(ellipsePts(x, y, r * 1.35, r * 1.35, 0, 36), WCL.ochre, { key: key + 'o', bloom: seg(bl, 0.3, 1), soft: r * 0.35, al: 0.24, rim: 0, blooms: 0, gran: 0.25, keep: [[x, y, r * 1.12, r * 1.12, 1]] });
  wclLight(x, y, r * 1.05, r * 1.05, 0.9 * seg(bl, 0.2, 0.8));
}
// a rainbow of soft bands that bleed into each other. (cx, cy) = the circle's centre, r = outer radius, bw = band width.
//   o: key, cols, grow (0..1, or one value per band: each band is pulled across from the left), al, fadeY (the bands
//   run out to clear water by this y; default cy)
function wclRainbow(cx, cy, r, bw, o = {}) {
  const cols = o.cols ?? [WCL.rose, WCL.ochre, WCL.lemon, WCL.sap, WCL.ultra, WCL.violet], key = o.key ?? 'bow', fy = o.fadeY ?? cy;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.lineCap = 'round'; const ga = ctx.globalAlpha;
  cols.forEach((c, i) => {
    const gk = clamp(Array.isArray(o.grow) ? o.grow[i] : o.grow ?? 1); if (gk <= 0.01) return;
    const rr = r - bw * (i + 0.5), P = wclEdge(arcPts(cx, cy, rr, Math.PI, Math.PI + Math.PI * EZ.io(gk), 40), false, bw * 0.07, key + i, false, 14);
    const gr = ctx.createLinearGradient(0, cy - r, 0, fy); gr.addColorStop(0, wclA(c, 1)); gr.addColorStop(0.5, wclA(c, 1)); gr.addColorStop(1, wclA(c, 0));
    ctx.strokeStyle = gr;
    for (const [wk, a] of [[1.75, 0.2], [1.25, 0.3], [0.8, 0.42]]) { ctx.lineWidth = bw * wk; ctx.globalAlpha = ga * a * (o.al ?? 1) * lerp(0.65, 1, seg(gk, 0.6, 1)); trace(P, false); ctx.stroke(); }
  });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  THE HERO — Pipit, a small vermilion bird painted in three washes (tail, body, wing) with an ochre beak and a dot eye.
//  No outline anywhere. (x, y) = the body's centre, r = the body's radius (the bird is ~2.9 r long); perched, it
//  stands on y + 1.25 r.   o: key, dir (1 faces right, -1 left), mood 'smile' | 'sad' | 'happy' | 'wow',
//  fly (true = wings out, no legs), wing (-1 down .. 1 up, the flying pose), lift, rot, sx, sy, boil (false), c, al
// ---------------------------------------------------------------------
const wclBirdShape = (r, hd = 0) => wclUnionPts([[0, 0, r, r * 0.8, -0.15], [r * 0.6, -r * (0.6 - hd), r * 0.5, r * 0.5]], 48);
const wclHeroPts = (x, y, r) => xform(wclBirdShape(r * 0.62), x, y);
function wclBird(x, y, r, o = {}) {
  const key = o.key ?? 'pipit', c = o.c ?? WCL.hero, deep = wclDeep(c, 0.8), mood = o.mood ?? 'smile', fly = !!o.fly, wing = o.wing ?? 0, boil = !!o.boil;
  const hd = mood === 'sad' ? 0.2 : mood === 'wow' ? -0.07 : 0, hx = r * 0.6, hy = -r * (0.6 - hd), open = mood === 'happy' ? 0.4 : mood === 'wow' ? 0.22 : 0;
  ctx.save(); ctx.translate(x, y - (o.lift ?? 0)); ctx.scale((o.dir ?? 1) * (o.sx ?? 1), o.sy ?? 1); ctx.rotate(o.rot ?? 0); ctx.globalAlpha *= o.al ?? 1;
  SPARK_AT = toScreen(0, 0);
  if (!fly) for (const lx of [-0.14 * r, 0.2 * r]) {
    wclBrush([[lx, r * 0.66], [lx + r * 0.03, r * 1.22]], r * 0.11, WCL.sienna, { key: key + 'lg' + lx, dry: 0, taper: [0.9, 0.7] });
    wclBrush([[lx - r * 0.06, r * 1.22], [lx + r * 0.24, r * 1.25]], r * 0.09, WCL.sienna, { key: key + 'ft' + lx, dry: 0, taper: [0.8, 0.3] });
  }
  const tw = fly ? -0.1 * wing : 0;
  wclWash([[-r * 0.7, -r * 0.14], [-r * 1.85, r * (0.14 + tw)], [-r * 1.72, r * (0.5 + tw)], [-r * 0.6, r * 0.34]], deep, { key: key + 't', amt: 1.4, al: 0.8, mask: 0.9, blooms: 0, boil, uneven: 0.3 });
  wclWash(wclBirdShape(r, hd), c, { key, amt: 1.8, al: 0.92, mask: 0.95, blooms: 0, uneven: 0.4, gran: 0.5, boil, rimW: 0.7, keep: [[r * 0.32, r * 0.34, r * 0.52, r * 0.36, 0.72]] });
  const wa = fly ? lerp(1.15, -1.25, (wing + 1) / 2) : 0.42 - (mood === 'happy' ? 0.5 : 0), wl = fly ? r * 0.78 : r * 0.6;   // the wing: a petal hinged at the shoulder
  const WP = fly ? xform(ellipsePts(-wl * 0.82, 0, wl, r * 0.34, 0, 28).map(([px, py]) => [px, py * (0.55 + 0.45 * clamp(-px / wl))]), r * 0.12, -r * 0.08, -wa) : xform(ellipsePts(0, 0, wl, r * 0.33, 0, 26), -r * 0.2, r * 0.02, wa);
  wclWash(WP, deep, { key: key + 'w', amt: 1.4, al: 0.75, mask: fly ? 0.9 : 0, blooms: 0, boil, uneven: 0.3, rimW: 0.6 });
  // beak (opens when it sings), the dot eye with a speck of paper left in it
  const bx = hx + r * 0.42, by = hy + r * 0.04;
  for (const s of open ? [-1, 1] : [0]) { ctx.save(); ctx.translate(bx, by); ctx.rotate(s * open); wclPoly(s ? [[0, s * r * 0.02], [r * 0.44, s * r * 0.03], [0, s * r * 0.15]] : [[0, -r * 0.14], [r * 0.5, r * 0.02], [0, r * 0.15]], WCL.ochre, { mask: 0.9, al: 0.95, w: 1.6 }); ctx.restore(); }
  const ex = hx + r * 0.14, ey = hy - r * 0.1, er = r * (mood === 'wow' ? 0.125 : mood === 'sad' ? 0.085 : 0.1), blink = !o.noBlink && (B + hash(key) % 20) % 34 < 1;
  ctx.fillStyle = ctx.strokeStyle = WCL.ink; ctx.lineCap = 'round';
  if (blink) { ctx.lineWidth = er * 0.8; ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey + er * 0.2); ctx.stroke(); }
  else if (mood === 'sad') { ctx.lineWidth = er * 0.85; ctx.beginPath(); ctx.arc(ex, ey - er * 1.1, er * 1.5, 0.5, Math.PI - 0.5); ctx.stroke(); }   // shut tight
  else {
    ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 1.08, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = WCL.paper; ctx.beginPath(); ctx.arc(ex - er * 0.3, ey - er * 0.35, er * 0.33, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  type: soft brush lettering from a system hand face, painted like a wash: each letter sits a hair off the line,
//  the pigment lies unevenly inside the strokes and pools at their feet.   o: align, key, reveal (0..1: letters
//  painted one after another, each arriving pale and wet), al
// ---------------------------------------------------------------------
const wclFont = (g, size) => { g.font = `700 ${size}px ${WCL_FONT}`; };
function wclTextW(str, size) { ctx.save(); wclFont(ctx, size); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function wclText(str, x, y, size, c = WCL.ink, o = {}) {
  const w = wclTextW(str, size), x0 = x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0), key = o.key ?? str;
  const R = wclBegin(x0 - size * 0.3, y - size * 1.15, x0 + w + size * 0.3, y + size * 0.5); if (!R) return w;
  const g = R.g, n = str.length, shown = clamp(o.reveal ?? 1) * n;
  wclFont(g, size); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = g.strokeStyle = c; g.lineWidth = size * 0.028;
  for (let i = 0; i < n; i++) {
    const ch = str[i], k = clamp(shown - i); if (ch === ' ') continue; if (k <= 0) break;
    const cw = g.measureText(ch).width, S = RNG('wcltx', key, i);
    g.save(); g.translate(x0 + g.measureText(str.slice(0, i)).width + cw / 2, y + S.n(size * 0.02)); g.rotate(S.n(0.035)); g.globalAlpha = lerp(0.3, 1, k); g.fillText(ch, -cw / 2, 0); g.strokeText(ch, -cw / 2, 0); g.restore();
  }
  const S = RNG('wcltxb', key);
  wclPatFill(R, 'blotch', 0.42, 'destination-out', new DOMMatrix().translate(R.x + S.r(0, 512), R.y + S.r(0, 512)).scale(0.5 * R.z));
  wclPatFill(R, 'gran', 0.28, 'destination-out');
  g.globalCompositeOperation = 'source-atop'; const gr = g.createLinearGradient(0, y - size * 0.62, 0, y + size * 0.12); gr.addColorStop(0, wclA(wclDeep(c, 1), 0)); gr.addColorStop(1, wclA(wclDeep(c, 1), 0.6));
  g.fillStyle = gr; g.fillRect(x0 - size * 0.3, y - size * 1.15, w + size * 0.6, size * 1.65);
  wclEnd(R, o.al ?? 0.96); return w;
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). The caption is a pale wash strip brushed in
//  from the left over reserved paper (nothing shows through it), its letters painted one by one; a *word* gets a dab
//  of accent colour under it. The tag is a small puddle of colour with a few flicked drops. Both are lifted off as a
//  bridge starts and painted back when the next era is open.
// ---------------------------------------------------------------------
function wclBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.25);
    if (TT >= r.tc && TT < r.tc + d + 0.25) return seg(TT, r.tc + d - 0.09, r.tc + d + 0.25);
  }
  return 1;
}
//   o: y (strip centre, 1392), x (CX), size (68), at (seconds after the era starts, 0.5), c (strip), hi (dab), col (text)
function wclCaptionNow(str, o = {}) {
  const fk = wclBridgeK(), at = E0 + (o.at ?? 0.5), p = ev(at, 0.5); if (p <= 0.02 || fk <= 0.02) return;
  const size = o.size ?? 68, cx = o.x ?? CX, cy = o.y ?? 1392, c = o.c ?? WCL.sky, hi = o.hi ?? WCL.ochre, col = o.col ?? WCL.ink;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  toks.forEach((t, i) => { t.w = wclTextW(t.s, size); t.gap = i === 0 ? 0 : /^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.3; });
  const tw = toks.reduce((a, t) => a + t.w + t.gap, 0), w = tw + size * 1.5, h = size * 1.7;
  ctx.save(); ctx.globalAlpha = fk;
  wclWash(wclBlobPts(cx, cy, w / 2, h / 2, { key: 'cap' + str, lump: 0.05, n: 72 }).map(([x, y]) => [cx + (x - cx) * (1 + 0.08 * Math.cos((y - cy) / h * Math.PI)), cy + clamp((y - cy) * 1.45, -h / 2, h / 2)]),
    c, { key: 'cap' + str, bloom: p, from: [cx - w / 2 + 30, cy], mask: 0.97, al: 0.5, amt: 2.4, blooms: 1, uneven: 0.5, rim: 0.45, gran: 0.6 });
  let xx = cx - tw / 2, k = 0;
  for (const t of toks) {
    xx += t.gap;
    const rev = ev(at + 0.25 + k * 0.03, Math.max(0.12, t.s.length * 0.03));
    if (t.hi) wclWash(wclBlobPts(xx + t.w / 2, cy + size * 0.06, t.w / 2 + size * 0.2, size * 0.52, { key: 'hi' + t.s, lump: 0.1, n: 40 }), hi, { key: 'hi' + t.s, bloom: ev(at + 0.2 + k * 0.03, 0.4), al: 0.7, amt: 2, blooms: 0, soft: 3, rim: 0.35 });
    wclText(t.s, xx, cy + size * 0.3, size, col, { key: 'cap' + t.s, reveal: rev });
    xx += t.w; k += t.s.length;
  }
  ctx.restore();
}
//   o: x (70, the left edge), y (300, the centre), size (56), at (0.25), c, col
function wclTagNow(str, o = {}) {
  const fk = wclBridgeK(), at = E0 + (o.at ?? 0.25), p = ev(at, 0.45); if (p <= 0.02 || fk <= 0.02) return;
  const size = o.size ?? 56, c = o.c ?? WCL.ochre, w = wclTextW(str, size) + size * 1.3, h = size * 1.55, cx = (o.x ?? 70) + w / 2, cy = o.y ?? 300;
  ctx.save(); ctx.globalAlpha = fk;
  wclWash(wclBlobPts(cx, cy, w / 2, h / 2, { key: 'tag' + str, lump: 0.09, n: 48 }), c, { key: 'tag' + str, bloom: p, mask: 0.95, al: 0.72, amt: 2.4, blooms: 1, uneven: 0.5 });
  if (p > 0.6) wclSplatter(cx + w / 2 + 26, cy + 4, 30, 5, c, 'tag' + str, { al: 0.7 * seg(p, 0.6, 1) });
  wclText(str, cx, cy + size * 0.32, size, o.col ?? WCL.ink, { align: 'center', key: 'tag' + str, reveal: ev(at + 0.2, 0.25) });
  ctx.restore();
}
const wclCaption = (str, o = {}) => { const f = () => wclCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const wclTag = (str, o = {}) => { const f = () => wclTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the sheet: the tooth of the paper over everything, and the clean margin the masking tape left
// ---------------------------------------------------------------------
const WCL_TAPE = 30;
function wclSheet() {   // the margin: clean paper outside a slightly uneven taped edge, with the paint that pooled against the tape
  return wclMemo('sheet', W, H, (g) => {
    const m = WCL_TAPE, E = wclEdge([[m, m], [W - m, m], [W - m, H - m], [m, H - m]], true, 1.3, 'tape', false, 16);
    g.fillStyle = WCL.paper; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); E.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(70,80,120,0.16)'; g.lineWidth = 2.5; g.stroke();
  });
}
function wclTooth() { return wclMemo('toothsheet', W, H, (g) => { g.fillStyle = g.createPattern(wclTiles().tooth, 'repeat'); g.fillRect(0, 0, W, H); }); }

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'watercolor',
  paper: WCL.paper,
  // the sheet tinted with a thin, slightly uneven wash of c (hex, or rgb() mid-morph)
  backdrop(c) {
    ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
    const p = wclPat('blotch'); p.setTransform(new DOMMatrix().scale(3)); ctx.globalAlpha = 0.05; ctx.fillStyle = p; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  // the era seen through a patch that is still wet: its edge fades into clean water, with the bridge colour pooled
  // along it; the pooled line thins away as the patch closes onto the object
  window(P, key, src, o = {}) {
    const u = o.u ?? 0, k = o.phase === 'grow' ? Math.min(1, u * 5) : Math.min(1, (1 - u) * 5), Q = wclEdge(P, true, 4 * k, key, false, 16);
    ctx.save(); trace(Q, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    if (k <= 0.02) return;
    const bg = typeof ERA_BG === 'undefined' ? STYLE.paper : o.phase === 'grow' ? mixHex(STYLE.paper, ERA_BG[o.eraB], u * 0.5) : mixHex(ERA_BG[o.eraA], STYLE.paper, 0.5 + u * 0.5);
    ctx.save(); ctx.lineJoin = 'round'; trace(Q, true);
    ctx.strokeStyle = bg; for (const [w, a] of [[56, 0.22], [34, 0.3], [16, 0.4]]) { ctx.lineWidth = w * k; ctx.globalAlpha = a; ctx.stroke(); }
    ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = o.c ?? WCL.indigo;
    for (const [w, a] of [[26, 0.12], [11, 0.24], [4, 0.5]]) { ctx.lineWidth = w * k; ctx.globalAlpha = a * k; ctx.stroke(); }
    ctx.restore();
  },
  // the morphing shape: one puddle of paint, re-wetted (its edge feathers and the rim lets go at the midpoint, the
  // colour running from one pigment to the other), with a few drops flicked round it
  blob(P, c, key, u = 0) {
    const wet = Math.sin(Math.PI * clamp(u)), ce = wclCentroid(P), bb = bbox(P);
    wclWash(P, c, { key, amt: 2.5, al: 0.8, wet: wet * 0.75, wetSoft: 16, blooms: 2, uneven: 0.5 });
    if (wet > 0.15) wclSplatter(ce[0], ce[1] - (bb.y1 - bb.y0) * 0.2, (bb.x1 - bb.x0) * 0.62, 9, c, key, { al: 0.75 * seg(wet, 0.15, 0.7) });
  },
  hero(x, y, r, o = {}) { wclBird(x, y, r * 0.62, { key: o.key, mood: o.mood, fly: true, wing: 0.6 }); },
  heroColor: WCL.hero,
  heroPts(x, y, r) { return wclHeroPts(x, y, r); },
  // the paper: its tooth multiplied over the whole painting, then the taped margin
  post() {
    const sh = wclSheet(), m = WCL_TAPE + 6;
    ctx.save(); screen();
    for (const [x, y, w, h] of [[0, 0, W, m], [0, H - m, W, m], [0, m, m, H - 2 * m], [W - m, m, m, H - 2 * m]]) ctx.drawImage(sh, x, y, w, h, x, y, w, h);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(wclTooth(), 0, 0); ctx.restore();
  },
  ones: false,
};
