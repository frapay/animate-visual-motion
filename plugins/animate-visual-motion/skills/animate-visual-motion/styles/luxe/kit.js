// =====================================================================
//  styles/luxe/kit.js — a luxury still-life film for premium physical products (perfume, jewellery, watches,
//  cosmetics, chocolate). Built on kit/core.js. Materials are the subject, all procedural: a polished marble slab
//  with branching white and gold veins and a soft mirror image (lxMarble / lxTable), satin that flows in folds with
//  a sheen that travels (lxSilk), banded polished and brushed gold for any outline or word (lxGold / lxGoldText),
//  cut glass with liquid, facets and refraction lines (lxGlass), a brilliant-cut gem that flashes facet by facet
//  (lxGem), four-point glints, warm bokeh discs, a thin haze. lxProduct('perfume' | 'ring' | 'lipstick' | 'gift', ...)
//  draws an invented, unbranded product. Type is a high-contrast serif in gold foil, tracked caps, a thin gold rule
//  and a monogram seal. The product never moves: the light does.
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const LUX = {
  ground: '#070605',                                   // the dark of the studio: the sheet a morph happens on
  wall: '#2b1a10', ember: '#5a3416',                   // the warm lift on the wall behind the product
  ivory: '#f4ecd9', cream: '#d8c9ab', taupe: '#93846c',   // type that is not gold
  gold: { deep: '#2b1a06', lo: '#6a4413', mid: '#b3822e', base: '#d6ad58', hi: '#f8e4a4', white: '#fffbe6' },
  marble: {                                            // base stone, its clouding, white veins, gold veins, the sheen it throws back
    black:   { base: '#0b0a0b', cloud: '#232024', vein: '#ece6da', gold: '#d6ad58', sheen: '#6b4a2a', edge: '#f1dfb4' },
    emerald: { base: '#041a13', cloud: '#0d4c38', vein: '#dcefe3', gold: '#e0bd68', sheen: '#2f7a5c', edge: '#e9f3d4' },
    ivory:   { base: '#e6dccb', cloud: '#fbf6ea', vein: '#8a7d68', gold: '#b88d3a', sheen: '#fff4d8', edge: '#ffffff' },
  },
  silk: {                                              // lo (the valley of a fold), base, hi (the lit ridge)
    champagne: { lo: '#4b3520', base: '#bf9b69', hi: '#f8e6c3' },
    ivory:     { lo: '#6d6250', base: '#d9ccb4', hi: '#fffaee' },
    burgundy:  { lo: '#22060b', base: '#7c1626', hi: '#e77a86' },
    emerald:   { lo: '#04201a', base: '#0e6b50', hi: '#62cfa4' },
    noir:      { lo: '#060607', base: '#2a2930', hi: '#b5b2c0' },
  },
  liquid: {
    amber: { lo: '#421603', base: '#bd610f', hi: '#ffc45c' },
    rose:  { lo: '#3d0d18', base: '#c04a66', hi: '#ffb3c0' },
    clear: { lo: '#15191c', base: '#6f7f88', hi: '#e8f4fa' },
  },
  gem: { diamond: '#cfe6f5', emerald: '#1fae7a', ruby: '#d21f4a', sapphire: '#2c5fd6', amber: '#f0a030' },
  grain: 0.02,                                         // fixed dither over the dark gradients (post)
};
const LUX_SERIF = 'Didot, "Bodoni 72", "Bodoni MT", "Playfair Display", "Libre Bodoni", "Noto Serif Display", "DejaVu Serif", Georgia, "Times New Roman", serif';
const LUX_CACHE = {};                                  // static, keyed and seeded things only (marble slabs, colour ramps, grain)
let LUX_LITE = false, LUX_SCRATCH = null;              // LITE: drawing a mirror image (no shadow, no nested mirror)

// ---------------------------------------------------------------------
//  colour, timing, small helpers
// ---------------------------------------------------------------------
const lxRGB = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
const lxHex = (v) => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
const lxMix = (a, b, u) => { const x = lxRGB(a), y = lxRGB(b); return lxHex(x.map((v, i) => lerp(v, y[i], u))); };
const lxA = (c, al) => { const [r, g, b] = lxRGB(c); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(al).toFixed(4)})`; };
const lxW = (al) => `rgba(255,248,228,${clamp(al).toFixed(4)})`;         // the light is warm
const lxK = (al) => `rgba(0,0,0,${clamp(al).toFixed(4)})`;
const lxZ = () => Math.abs(ctx.getTransform().a) || 1;                    // the camera zoom: hairlines divide by it
const lxIn = (t0, d = 0.6) => EZ.io(seg(TT, t0, t0 + d));                 // ease in-out from t0 over d: the only curve this look uses
const lxPoly = (P) => { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };   // a sharp-cornered outline (trace() rounds)
const lxArr = (a, v) => { const f = clamp(v) * (a.length - 1), i = Math.min(a.length - 2, Math.floor(f)); return lerp(a[i], a[i + 1], f - i); };
function lxRamp(stops, u) {                                               // [[t, hex], ...] -> hex at u
  if (u <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (u <= stops[i][0]) return lxMix(stops[i - 1][1], stops[i][1], (u - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
}
// a three-tone material (lo, base, hi) from a preset name, an object, or any base colour (hex, or the renderer's rgb() blend)
function lxTone(table, c, fallback) {
  if (c && typeof c === 'object') return c;
  if (table[c ?? fallback]) return table[c ?? fallback];
  const base = lxHex(lxRGB(c));
  return { lo: lxMix(base, '#000000', 0.76), base, hi: lxMix(base, '#ffffff', 0.62) };
}
function lxBridgeK() {                                                    // 1 outside bridges, 0 inside: type steps aside for the morph
  if (typeof BRIDGES === 'undefined') return 1;
  let k = 1; for (const r of BRIDGES) k = Math.min(k, clamp((Math.abs(TT - r.tc) - (r.d ?? 0.6)) / 0.2));
  return k;
}
const lxDefer = (f) => { if (DEFER) DEFER.push(f); else f(); };
function lxSpine(K, n) {                                                  // a smooth curve through control points K: n + 1 samples
  const m = K.length - 1, out = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n * m, k = Math.min(m - 1, Math.floor(f)), t = f - k, p0 = K[Math.max(0, k - 1)], p1 = K[k], p2 = K[k + 1], p3 = K[Math.min(m, k + 2)];
    out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t * t + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t * t * t)));
  }
  return out;
}

// ---------------------------------------------------------------------
//  the room: a warm lift on a dark wall, a vignette, bokeh, haze, glints
// ---------------------------------------------------------------------
function lxVignette(al = 0.62) {
  ctx.save(); screen();
  const g = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.4, W / 2, H * 0.5, Math.hypot(W, H) * 0.58);
  g.addColorStop(0, lxK(0)); g.addColorStop(1, lxK(al)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// the wall: near-black with one warm pool of light behind the product. o: cx, cy, r, light 0..1, color, ground
function lxWall(o = {}) {
  const cx = o.cx ?? W / 2, cy = o.cy ?? H * 0.42, r = o.r ?? 900, L = clamp(o.light ?? 1);
  fillAll(o.ground ?? LUX.ground);
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
  g.addColorStop(0, lxA(o.color ?? LUX.ember, 0.75 * L)); g.addColorStop(0.4, lxA(LUX.wall, 0.6 * L)); g.addColorStop(1, lxA(LUX.wall, 0));
  ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
}
// warm out-of-focus discs drifting in the dark. o: n, key, a, area { x0, y0, x1, y1 }, rmin, rmax, colors, speed
function lxBokeh(o = {}) {
  const a = clamp(o.a ?? 1); if (a <= 0.003) return;
  const n = o.n ?? 14, R = RNG('lxbokeh', o.key ?? 'bokeh'), ar = o.area ?? { x0: 0, y0: 0, x1: W, y1: H }, sp = o.speed ?? 1;
  const cols = o.colors ?? [LUX.gold.hi, LUX.gold.base, '#ffb866', LUX.ivory, '#e08a3c'];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x0 = R.r(ar.x0, ar.x1), y0 = R.r(ar.y0, ar.y1), r = R.r(o.rmin ?? 22, o.rmax ?? 86), c = R.pick(cols), ph = R.r(0, TAU), w1 = R.r(0.12, 0.3), w2 = R.r(0.1, 0.24), vy = R.r(4, 14), al0 = R.r(0.05, 0.17);
    const x = x0 + Math.sin(TT * w1 * sp + ph) * 34, y = y0 - TT * vy * sp + Math.cos(TT * w2 * sp + ph * 2) * 22;
    const al = a * al0 * (0.6 + 0.4 * Math.sin(TT * 0.7 * sp + ph * 3));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);                  // a lens disc: nearly flat, a slightly brighter rim, a soft edge
    g.addColorStop(0, lxA(c, al * 0.55)); g.addColorStop(0.78, lxA(c, al * 0.7)); g.addColorStop(0.92, lxA(c, al)); g.addColorStop(1, lxA(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// a thin haze: a few very large soft veils sliding sideways. o: a, key, y0, y1, color, n
function lxHaze(o = {}) {
  const a = clamp(o.a ?? 1); if (a <= 0.003) return;
  const R = RNG('lxhaze', o.key ?? 'haze'), n = o.n ?? 5, y0 = o.y0 ?? H * 0.25, y1 = o.y1 ?? H * 0.8, c = o.color ?? '#c9a27a';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const r = R.r(360, 640), y = R.r(y0, y1), ph = R.r(0, TAU), v = R.r(10, 26) * (R.f() < 0.5 ? -1 : 1), x = mod(R.r(0, W) + TT * v, W + r * 2) - r, al = a * R.r(0.025, 0.055) * (0.75 + 0.25 * Math.sin(TT * 0.5 + ph));
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.34);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, lxA(c, al)); g.addColorStop(1, lxA(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
// a four-point star glint with a small halo. s = the long spike's half-length.
// o: a 0..1, or at + dur (one brief flash), or every + off + dur (a flash that returns), rot, color
function lxGlint(x, y, s, o = {}) {
  let a = clamp(o.a ?? 1);
  if (o.at != null) a *= Math.sin(Math.PI * seg(TT, o.at, o.at + (o.dur ?? 0.5))) ** 1.4;
  else if (o.every) a *= Math.sin(Math.PI * clamp(mod(TT + (o.off ?? 0), o.every) / (o.dur ?? 0.5))) ** 1.4;
  if (a <= 0.01) return;
  const c = o.color ?? '#fff6dc', L = s * (0.45 + 0.55 * a);
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? 0) + (1 - a) * 0.25); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 0.42); g.addColorStop(0, lxA(c, 0.7 * a)); g.addColorStop(0.35, lxA(c, 0.2 * a)); g.addColorStop(1, lxA(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, L * 0.42, 0, TAU); ctx.fill();
  for (let i = 0; i < 8; i++) {
    const diag = i % 2 === 1, len = L * (diag ? 0.36 : i % 4 === 0 ? 1 : 0.72), hw = L * (diag ? 0.022 : 0.034);
    ctx.save(); ctx.rotate(i * Math.PI / 4);
    g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, lxA(c, a)); g.addColorStop(0.3, lxA(c, 0.55 * a)); g.addColorStop(1, lxA(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -hw); ctx.lineTo(len, 0); ctx.lineTo(0, hw); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = lxA('#ffffff', a); ctx.beginPath(); ctx.arc(0, 0, L * 0.045, 0, TAU); ctx.fill();
  ctx.restore();
}
// a soft dark band across the frame, so type keeps its dark empty space over a busy ground (world coords). al = its darkest
function lxDim(y0, y1, al = 0.45) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, lxK(0)); g.addColorStop(0.35, lxK(al)); g.addColorStop(0.65, lxK(al)); g.addColorStop(1, lxK(0));
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(-W, y0, W * 3, y1 - y0); ctx.restore();
}
// the contact shadow where something stands on the slab
function lxShadow(x, y, rx, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, o.sq ?? 0.1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, lxK(o.a ?? 0.85)); g.addColorStop(0.6, lxK((o.a ?? 0.85) * 0.5)); g.addColorStop(1, lxK(0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}
// the polished slab's mirror: draw() again, flipped about y = floorY, fading with depth and a little soft. draw() must not draw text.
function lxReflect(floorY, draw, o = {}) {
  const al = o.a ?? 0.3; if (LUX_LITE || al <= 0.003) return;
  const main = ctx, T = main.getTransform(), cv = main.canvas;
  if (!LUX_SCRATCH || LUX_SCRATCH.width !== cv.width || LUX_SCRATCH.height !== cv.height) { LUX_SCRATCH = document.createElement('canvas'); LUX_SCRATCH.width = cv.width; LUX_SCRATCH.height = cv.height; }
  const c2 = LUX_SCRATCH.getContext('2d'), spark = SPARK_AT, defer = DEFER;
  c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over'; c2.filter = 'none'; c2.clearRect(0, 0, cv.width, cv.height);
  c2.setTransform(T); c2.translate(0, 2 * floorY); c2.scale(1, -1);
  ctx = c2; DEFER = null; LUX_LITE = true;
  try { draw(); } finally { ctx = main; DEFER = defer; SPARK_AT = spark; LUX_LITE = false; }
  c2.setTransform(T); c2.globalAlpha = 1; c2.globalCompositeOperation = 'destination-in';
  const depth = o.depth ?? 300, g = c2.createLinearGradient(0, floorY, 0, floorY + depth);
  g.addColorStop(0, lxK(al)); g.addColorStop(0.5, lxK(al * 0.32)); g.addColorStop(1, lxK(0));
  c2.fillStyle = g; c2.fillRect(-W * 4, floorY - H * 4, W * 9, H * 9);
  c2.restore();
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); if (o.blur) main.filter = `blur(${o.blur}px)`; main.drawImage(LUX_SCRATCH, 0, 0); main.restore();
}

// ---------------------------------------------------------------------
//  marble: a seeded slab of stone, made once and kept
// ---------------------------------------------------------------------
function lxVein(g, R, x, y, a, len, w, col, al, depth, sc) {
  const pts = [[x, y]], kids = [], n = Math.max(4, Math.floor(len / (6 * sc))), drift = R.n(0.004), ph = R.r(0, TAU), mf = R.r(0.03, 0.08);
  for (let i = 0; i < n; i++) {
    a += R.n(0.05) + drift + 0.022 * Math.sin(i * mf + ph); if (R.f() < 0.012) a += R.n(0.5);             // stone veins wander, then kink
    x += Math.cos(a) * 6 * sc; y += Math.sin(a) * 6 * sc; pts.push([x, y]);
    if (depth < 2 && R.f() < 0.011) kids.push([x, y, a + R.pick([-1, 1]) * R.r(0.15, 0.55), len * R.r(0.22, 0.5), i / n]);
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [wk, ak] of [[18, 0.025], [7, 0.07], [2.6, 0.3], [1, 1]]) {              // a soft bleed into the stone, then the vein's core
    for (let c = 0; c < pts.length - 1; c += 4) {
      const f = c / pts.length, taper = Math.sin(Math.PI * clamp(0.06 + f * 0.94)) ** 0.5, wv = w * sc * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(c * 0.05 + ph))) * taper;
      g.beginPath(); pts.slice(c, c + 5).forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.lineWidth = Math.max(0.4, wv * wk); g.strokeStyle = lxA(col, al * ak * (0.12 + 0.88 * Math.sin(c * 0.017 + ph * 2) ** 2)); g.stroke();   // the core fades in and out along its run
    }
  }
  for (const [kx, ky, ka, kl, kf] of kids) lxVein(g, R, kx, ky, ka, kl, w * 0.6 * (1 - kf * 0.3), col, al * 0.85, depth + 1, sc);
}
// the stone seen flat, as a canvas w x h. preset: 'black' | 'emerald' | 'ivory'
function lxMarbleTex(preset = 'black', key = 'slab', w = 1280, h = 1280) {
  const id = ['tex', preset, key, w, h].join('|'); if (LUX_CACHE[id]) return LUX_CACHE[id];
  const m = LUX.marble[preset] || LUX.marble.black, cv = document.createElement('canvas'), R = RNG('lxmarble', preset, key), sc = Math.min(w, h) / 1000, light = preset === 'ivory';
  cv.width = w; cv.height = h; const g = cv.getContext('2d');
  g.fillStyle = m.base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {                                          // clouding: soft lighter and darker drifts inside the stone
    const x = R.r(0, w), y = R.r(0, h), r = R.r(90, 420) * sc, dark = R.f() < 0.3, al = R.r(0.05, 0.24);
    g.save(); g.translate(x, y); g.rotate(R.r(0, Math.PI)); g.scale(1, R.r(0.3, 0.8));
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, dark ? lxA(light ? m.vein : '#000000', al * (light ? 0.35 : 1)) : lxA(m.cloud, al)); gr.addColorStop(1, lxA(m.cloud, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
  }
  const flow = R.r(0.5, 0.95) * (R.f() < 0.5 ? 1 : -1);                    // the veins share one grain direction
  const start = () => { const side = R.f(), t = R.f(); return side < 0.5 ? [t * w, -20 * sc, Math.abs(flow) + R.n(0.35)] : flow > 0 ? [-20 * sc, t * h, Math.abs(flow) - 0.4 + R.n(0.35)] : [w + 20 * sc, t * h, Math.PI - Math.abs(flow) + 0.4 + R.n(0.35)]; };
  const dirOf = (a0, top) => (top ? (flow > 0 ? a0 : Math.PI - a0) : a0);
  for (let i = 0; i < 150; i++) {                                         // mottling: small patches
    const x = R.r(0, w), y = R.r(0, h), r = R.r(18, 90) * sc, al = R.r(0.04, 0.15), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, R.f() < 0.45 ? lxK(light ? al * 0.3 : al * 1.6) : lxA(m.cloud, al)); gr.addColorStop(1, lxA(m.cloud, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 9; i++) { const [x, y] = [R.r(0, w), R.r(0, h)]; lxVein(g, R, x, y, flow + R.n(0.4), R.r(500, 1200) * sc, R.r(10, 22), m.vein, R.r(0.05, 0.1), 2, sc); }      // broad ghost veins deep in the stone
  for (let i = 0; i < 9; i++) { const [x, y] = [R.r(0, w), R.r(0, h)]; lxVein(g, R, x, y, flow + R.n(0.3), R.r(160, 520) * sc, R.r(0.6, 1.2), m.vein, R.r(0.08, 0.2), 1, sc); }   // a hairline network
  for (let i = 0; i < 4; i++) { const s = start(), top = s[1] < 0; lxVein(g, R, s[0], s[1], dirOf(s[2], top), Math.hypot(w, h) * R.r(0.7, 1.2), R.r(2.4, 5.5), m.vein, R.r(0.65, 1), 0, sc); }   // the main white veins
  for (let i = 0; i < 2; i++) { const s = start(), top = s[1] < 0; lxVein(g, R, s[0], s[1], dirOf(s[2], top), Math.hypot(w, h) * R.r(0.6, 1.1), R.r(1.8, 3.6), m.gold, R.r(0.8, 1), 0, sc); }      // and the gold ones
  const img = g.getImageData(0, 0, w, h), d = img.data, RG = RNG('lxmarblegrain', preset, key);   // the stone's fine crystal grain
  for (let i = 0; i < d.length; i += 4) { const v = (RG.f() - 0.5) * 9; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  g.putImageData(img, 0, 0);
  return (LUX_CACHE[id] = cv);
}
// the slab seen from straight above, filling the frame. o: preset, key, light 0..1, cx, cy (where the light pools), sweep (a slow sheen crossing; default by time)
function lxMarble(o = {}) {
  const preset = o.preset ?? 'black', m = LUX.marble[preset] || LUX.marble.black, pad = 60, L = clamp(o.light ?? 1), cx = o.cx ?? W / 2, cy = o.cy ?? H * 0.45;
  ctx.drawImage(lxMarbleTex(preset, o.key ?? 'flat', W + pad * 2, H + pad * 2), -pad, -pad);
  ctx.save();
  let g = ctx.createRadialGradient(cx, cy, 80, cx, cy, 1250);              // the light falls off toward the edges
  g.addColorStop(0, lxK(0)); g.addColorStop(0.5, lxK(0.24)); g.addColorStop(1, lxK(0.7)); ctx.fillStyle = g; ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
  ctx.globalCompositeOperation = 'lighter';
  g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 720); g.addColorStop(0, lxA(m.sheen, 0.3 * L)); g.addColorStop(1, lxA(m.sheen, 0));
  ctx.fillStyle = g; ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
  const sw = o.sweep ?? mod(TT * 0.11 + 0.2, 1.3) - 0.15, p = lerp(-400, W + H * 0.5 + 400, sw);   // the polish catches a soft bar of light that crosses slowly
  g = ctx.createLinearGradient(p - 260, 0, p + 260, 0); g.addColorStop(0, lxW(0)); g.addColorStop(0.5, lxW(0.055 * L)); g.addColorStop(1, lxW(0));
  ctx.transform(1, 0, -0.5, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(-pad - H, -pad, W + H * 2, H + pad * 2);
  ctx.restore();
}
// the slab as a table top seen from a little above: its back edge is the line y = horizon, the stone runs to the bottom of the frame.
// o: horizon, preset, key, light 0..1, cx (where the light pools), cy
function lxTable(o = {}) {
  const hor = o.horizon ?? 1040, preset = o.preset ?? 'black', m = LUX.marble[preset] || LUX.marble.black, pad = 80, L = clamp(o.light ?? 1), cx = o.cx ?? W / 2, z = lxZ();
  const id = ['table', preset, o.key ?? 'table', hor, W, H].join('|');
  if (!LUX_CACHE[id]) {                                                   // perspective by rows: far rows see more of the stone, squeezed
    const tex = lxMarbleTex(preset, o.key ?? 'table', 2400, 1400), Hd = H - hor + pad, cw = W + pad * 2, cv = document.createElement('canvas'), d0 = Hd * 0.7;
    cv.width = cw; cv.height = Hd; const g = cv.getContext('2d'), zmax = 1 / d0, zmin = 1 / (Hd + d0);
    for (let j = 0; j < Hd; j++) { const zz = 1 / (j + d0), v = (zmax - zz) / (zmax - zmin), sw = tex.width * zz / zmax; g.drawImage(tex, (tex.width - sw) / 2, v * (tex.height - 3), sw, 2, 0, j, cw, 1); }
    LUX_CACHE[id] = cv;
  }
  ctx.drawImage(LUX_CACHE[id], -pad, hor);
  ctx.save(); ctx.beginPath(); ctx.rect(-pad, hor, W + pad * 2, H - hor + pad); ctx.clip();
  let g = ctx.createLinearGradient(0, hor, 0, H);                           // polished stone is a dark mirror: it falls to black toward the camera
  g.addColorStop(0, lxK(0.08)); g.addColorStop(0.45, lxK(0.28)); g.addColorStop(1, lxK(0.6)); ctx.fillStyle = g; ctx.fillRect(-pad, hor, W + pad * 2, H - hor + pad);
  ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, o.cy ?? hor + 150); ctx.scale(1, 0.34);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 700); g.addColorStop(0, lxA(m.sheen, 0.5 * L)); g.addColorStop(0.5, lxA(m.sheen, 0.16 * L)); g.addColorStop(1, lxA(m.sheen, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 700, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save();                                                              // the slab's polished back edge catches the light
  g = ctx.createLinearGradient(cx - 620, 0, cx + 620, 0); g.addColorStop(0, lxA(m.edge, 0)); g.addColorStop(0.5, lxA(m.edge, 0.5 * L)); g.addColorStop(1, lxA(m.edge, 0));
  ctx.fillStyle = g; ctx.fillRect(cx - 620, hor - 1 / z, 1240, 2.5 / z); ctx.restore();
}

// ---------------------------------------------------------------------
//  silk: a cloth that runs along a spine, shaded as satin folds; the sheen travels
// ---------------------------------------------------------------------
function lxSilkTone(c) {
  const t = lxTone(LUX.silk, c, 'champagne'), id = 'silk|' + t.lo + t.base + t.hi;
  if (!LUX_CACHE[id]) { const st = [[0, lxMix(t.lo, '#000000', 0.62)], [0.2, t.lo], [0.52, t.base], [0.86, t.hi], [1, lxMix(t.hi, '#ffffff', 0.4)]], lut = []; for (let i = 0; i < 256; i++) lut.push(lxRamp(st, i / 255)); LUX_CACHE[id] = lut; }
  return LUX_CACHE[id];
}
// spine: control points the cloth runs along (a drape: top to bottom; a ribbon lying on the slab: any curve).
// o: w (width: number | array along the spine | fn(v)), color (preset | hex | { lo, base, hi }), folds (how many across), depth 0..1.5 (how deep the folds are),
//    key, light (angle the light comes from), sheen (phase of the travelling light; default by time), travel (0..1 where the bright bar is along the cloth),
//    fall ([brightness at the start, ..., at the end]: two or more values along the cloth), shadow (alpha of a soft shadow under it, for cloth lying on the slab),
//    soft (1 = crisp, 2 = default, 3–4 = out of focus: the cloth is drawn at 1/soft size and scaled up), a, nu (columns; default one per ~5 px of width), nv
function lxSilk(spine, o = {}) {
  const lut = lxSilkTone(o.color), key = o.key ?? 'silk', R = RNG('lxsilk', key), NV = o.nv ?? 48, NU = o.nu ?? Math.round(clamp((Array.isArray(o.w) ? Math.max(...o.w) : typeof o.w === 'number' ? o.w : 600) / 5.5, 90, 250)), folds = o.folds ?? 5, depth = o.depth ?? 1, z = lxZ();
  const S = lxSpine(spine, NV), wf = typeof o.w === 'function' ? o.w : Array.isArray(o.w) ? (v) => lxArr(o.w, v) : () => o.w ?? 400;
  const k = [0, 1, 2, 3, 4, 5].map(() => R.r(0, TAU)), sheen = o.sheen ?? TT * 0.55, light = (o.light ?? -0.45) + 0.3 * Math.sin(sheen + k[5]), travel = o.travel ?? mod(TT * 0.17 + k[5], 1.5) - 0.25;
  const fall = o.fall ?? [1, 1];
  // folds run along the cloth (their tone belongs to a column, so bands stay unbroken); they deepen and flatten slowly along it
  const fold = (u) => { const ph = folds * TAU * (u + 0.035 * Math.sin(u * 9 + k[2])); return Math.sin(ph) + 0.3 * Math.sin(ph * 2.17 + k[3]) + 0.05 * Math.sin(ph * 4.3 + k[4]); };
  const hgt = (u, v) => (1 + 0.26 * Math.sin(v * 5.3 + u * 6 + k[1])) * fold(u);
  const wave = (u, v) => 0.05 * Math.sin(v * 4.2 + u * 2 + k[0]) + 0.02 * Math.sin(v * 9.1 + u * 7 + k[1]);   // and the whole cloth sways sideways
  const G = [];
  for (let j = 0; j <= NV; j++) {
    const v = j / NV, p = S[j], a = S[Math.max(0, j - 1)], b = S[Math.min(NV, j + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / tl, ny = (b[0] - a[0]) / tl, w = wf(v), row = [];
    for (let i = 0; i <= NU; i++) { const u = i / NU, d = (u - 0.5 + wave(u, v)) * w + hgt(u, v) * depth * w * 0.009; row.push([p[0] + nx * d, p[1] + ny * d]); }
    G.push(row);
  }
  if (o.shadow && !LUX_LITE) {                                            // cloth lying on the slab: a soft shadow down-right of it
    ctx.save(); ctx.translate(14, 22); ctx.lineJoin = 'round';
    const E = [...G.map((r) => r[0]), ...G.map((r) => r[NU]).reverse()];
    for (let i = 0; i < 6; i++) { lxPoly(E); ctx.fillStyle = ctx.strokeStyle = lxK(o.shadow * 0.2); ctx.lineWidth = 8 + i * 13; ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  const e = 0.5 / NU, col = [], rows = [];
  for (let i = 0; i < NU; i++) {                                          // a fold's tone belongs to its column: satin is a broad soft tone and a narrow bright ridge
    const u = (i + 0.5) / NU, sl = (fold(u + e) - fold(u - e)) / (2 * e) / (folds * TAU), d = Math.max(0, Math.cos(Math.atan(sl * 0.95 * depth) - light));
    col.push([0.08 + 0.62 * d * d * d + 0.3 * d ** 10, d ** 3, 1 - 0.4 * (2 * u - 1) ** 6]);
  }
  for (let j = 0; j < NV; j++) {
    const v = (j + 0.5) / NV, bar = 0.3 * Math.exp(-(((v - travel) / 0.17) ** 2)), fv = lxArr(fall, v);   // the travelling bar of light; the light's fall along the cloth
    rows.push([bar, fv]);
  }
  // drawn small and scaled up: the folds blend into each other, and cloth behind the product sits a little out of focus
  const soft = Math.max(1, o.soft ?? 2), main = ctx, T = main.getTransform(), mc = main.canvas;
  if (soft > 1) {
    const sw = Math.ceil(mc.width / soft), sh = Math.ceil(mc.height / soft), id = 'silkscratch' + (LUX_LITE ? 'L' : '');
    if (!LUX_CACHE[id] || LUX_CACHE[id].width !== sw || LUX_CACHE[id].height !== sh) { LUX_CACHE[id] = document.createElement('canvas'); LUX_CACHE[id].width = sw; LUX_CACHE[id].height = sh; }
    ctx = LUX_CACHE[id].getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, sw, sh);
    ctx.setTransform(T.a / soft, T.b / soft, T.c / soft, T.d / soft, T.e / soft, T.f / soft);
  }
  try {
    ctx.save();
    for (let j = 0; j < NV; j++) {                                        // in raster order, each patch reaching under its right and lower neighbours: no seams, no stroke
      const [bar, fv] = rows[j], j2 = Math.min(NV, j + 2), r0 = G[j], r1 = G[j2];
      for (let i = 0; i < NU; i++) {
        const i2 = Math.min(NU, i + 2), a = r0[i], b = r0[i2], c = r1[i2], dd = r1[i];
        ctx.fillStyle = lut[Math.round(clamp((col[i][0] + bar * col[i][1]) * col[i][2] * fv) * (lut.length - 1))];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(dd[0], dd[1]); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  } finally { ctx = main; }
  if (soft > 1) {
    const cv = LUX_CACHE['silkscratch' + (LUX_LITE ? 'L' : '')];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low'; if (o.a != null) ctx.globalAlpha = clamp(o.a);
    ctx.drawImage(cv, 0, 0, cv.width * soft, cv.height * soft); ctx.restore();
  }
}

// ---------------------------------------------------------------------
//  gold: a banded metallic gradient for any outline, and for words
// ---------------------------------------------------------------------
const LUX_GOLD_STOPS = {
  polished: [[0, 'lo'], [0.1, 'mid'], [0.22, 'hi'], [0.28, 'white'], [0.34, 'base'], [0.5, 'lo'], [0.6, 'deep'], [0.72, 'mid'], [0.84, 'hi'], [0.9, 'base'], [1, 'lo']],
  brushed:  [[0, 'lo'], [0.25, 'mid'], [0.45, 'hi'], [0.56, 'base'], [0.8, 'mid'], [1, 'lo']],
  round:    [[0, 'deep'], [0.13, 'mid'], [0.28, 'hi'], [0.34, 'white'], [0.42, 'base'], [0.68, 'lo'], [0.86, 'deep'], [0.94, 'mid'], [1, 'lo']],   // a turned form
};
function lxGoldGrad(x0, y0, x1, y1, kind = 'polished', shift = 0) {
  const dx = (x1 - x0) * shift, dy = (y1 - y0) * shift, g = ctx.createLinearGradient(x0 + dx, y0 + dy, x1 + dx, y1 + dy);
  for (const [t, n] of LUX_GOLD_STOPS[kind] || LUX_GOLD_STOPS.polished) g.addColorStop(t, LUX.gold[n]);
  return g;
}
function lxGoldConic(x, y, a0 = 0) {                                      // bands that run round a ring
  if (!ctx.createConicGradient) return lxGoldGrad(x - 100, y - 100, x + 100, y + 100);
  const g = ctx.createConicGradient(a0, x, y);
  let t0 = 0;                                                             // five uneven lobes: polished metal mirrors the room as hard light and dark
  for (const wd of [0.17, 0.24, 0.14, 0.26, 0.19]) { [[0, 'deep'], [0.14, 'lo'], [0.3, 'mid'], [0.48, 'base'], [0.64, 'hi'], [0.72, 'white'], [0.8, 'hi'], [0.9, 'base'], [0.97, 'lo']].forEach(([t, n]) => g.addColorStop(Math.min(1, t0 + t * wd), LUX.gold[n])); t0 += wd; }
  g.addColorStop(1, LUX.gold.deep);
  return g;
}
// fill outline P (points, or a function that builds the path; then give o.bb) with gold.
// o: kind 'polished' | 'brushed' | 'round', dir 'h' | 'v' | angle (the way the bands run across), shift (-0.5..0.5: the bands slide as the light moves),
//    spec 0..1 (a soft specular sweep crossing; outside 0..1 = none), specA, bevel (px: a lit top edge and a dark lower edge), sharp (corners stay sharp), a, bb
function lxGold(P, o = {}) {
  const fn = typeof P === 'function', bb = o.bb ?? bbox(P), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, kind = o.kind ?? 'polished';
  const path = () => (fn ? P() : o.sharp ? lxPoly(P) : trace(P, true)), box = () => ctx.fillRect(bb.x0 - 4, bb.y0 - 4, w + 8, h + 8);
  const ang = o.dir === 'v' ? Math.PI / 2 : typeof o.dir === 'number' ? o.dir : 0, hl = (Math.abs(Math.cos(ang)) * w + Math.abs(Math.sin(ang)) * h) / 2, gx = Math.cos(ang) * hl, gy = Math.sin(ang) * hl;
  ctx.save(); if (o.a != null) ctx.globalAlpha *= clamp(o.a); path(); ctx.clip();
  ctx.fillStyle = lxGoldGrad(cx - gx, cy - gy, cx + gx, cy + gy, kind, o.shift ?? 0); box();
  if (kind === 'brushed') {                                               // fine brush lines across the bands
    const R = RNG('lxbrush', o.key ?? 'gold'), n = Math.min(160, Math.round((Math.abs(Math.sin(ang)) * w + Math.abs(Math.cos(ang)) * h) / 3)), px = -Math.sin(ang), py = Math.cos(ang), rr = Math.hypot(w, h) / 2;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) { const t = (i / n - 0.5) * 2 * rr + R.n(1.5), ox = cx + px * t, oy = cy + py * t; ctx.strokeStyle = R.f() < 0.5 ? lxA(LUX.gold.white, R.r(0.03, 0.16)) : lxA(LUX.gold.deep, R.r(0.04, 0.2)); ctx.beginPath(); ctx.moveTo(ox - Math.cos(ang) * rr, oy - Math.sin(ang) * rr); ctx.lineTo(ox + Math.cos(ang) * rr, oy + Math.sin(ang) * rr); ctx.stroke(); }
  }
  let g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);                    // the lamp is overhead
  g.addColorStop(0, lxW(0.2)); g.addColorStop(0.3, lxW(0)); g.addColorStop(0.7, lxK(0)); g.addColorStop(1, lxK(0.36)); ctx.fillStyle = g; box();
  if (o.spec != null && o.spec > 0 && o.spec < 1) lxSpecBand(bb, o.spec, o.specA ?? 0.6, o.specW);
  if (o.bevel) {
    g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1); g.addColorStop(0, lxA(LUX.gold.white, 0.9)); g.addColorStop(0.4, lxA(LUX.gold.hi, 0.35)); g.addColorStop(1, lxA(LUX.gold.deep, 0.75));
    path(); ctx.lineJoin = 'miter'; ctx.lineWidth = o.bevel * 2; ctx.strokeStyle = g; ctx.stroke();
  }
  ctx.restore(); return bb;
}
// a soft slanted band of light crossing a bbox at position u (0..1); drawn into the current clip
function lxSpecBand(bb, u, al = 0.5, bw) {
  const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, dx = 0.974, dy = 0.225, p0 = bb.x0 * dx + bb.y0 * dy, p1 = bb.x1 * dx + bb.y1 * dy, b = bw ?? Math.max(w, h * 0.4) * 0.22, p = lerp(p0 - b, p1 + b, u);
  const g = ctx.createLinearGradient(dx * (p - b), dy * (p - b), dx * (p + b), dy * (p + b));
  g.addColorStop(0, lxW(0)); g.addColorStop(0.4, lxW(al * 0.3)); g.addColorStop(0.5, lxW(al)); g.addColorStop(0.6, lxW(al * 0.3)); g.addColorStop(1, lxW(0));
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(bb.x0 - 4, bb.y0 - 4, w + 8, h + 8); ctx.restore();
}
// one line of gold-foil lettering (y = baseline). o: weight, italic, track (em), align, a, font,
//    reveal 0..1 (a wipe of light uncovers it left to right), spec 0..1 (a later band of light crossing the letters), flat (one tone, for small sizes)
function lxGoldText(str, x, y, size, o = {}) {
  const al = clamp(o.a ?? 1), rev = clamp(o.reveal ?? 1); if (al <= 0.004 || rev <= 0) return 0;
  ctx.save(); ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${size}px ${o.font ?? LUX_SERIF}`;
  const tr = (o.track ?? 0) * size, hasLS = 'letterSpacing' in ctx; if (hasLS) ctx.letterSpacing = tr.toFixed(2) + 'px';
  const w = ctx.measureText(str).width - (hasLS ? tr : 0), align = o.align ?? 'left', x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, pad = size * 0.3;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = al;
  if (rev < 1) { ctx.beginPath(); ctx.rect(x0 - pad, y - size * 1.2, (w + pad * 2) * rev, size * 1.7); ctx.clip(); }
  ctx.fillStyle = lxK(0.55); ctx.fillText(str, x0, y + Math.max(1.5, size * 0.03));            // pressed into the surface
  let g;
  if (o.flat) g = LUX.gold.base;
  else { g = ctx.createLinearGradient(0, y - size * 0.74, 0, y + size * 0.2); [[0, 'hi'], [0.2, 'white'], [0.42, 'base'], [0.56, 'mid'], [0.64, 'hi'], [0.82, 'base'], [1, 'mid']].forEach(([t, n]) => g.addColorStop(t, LUX.gold[n])); }
  ctx.fillStyle = g; ctx.fillText(str, x0, y);
  const band = (p, bw, a2) => { const b = ctx.createLinearGradient(p - bw, 0, p + bw * 0.25, 0); b.addColorStop(0, lxA('#ffffff', 0)); b.addColorStop(0.8, lxA('#ffffff', a2)); b.addColorStop(1, lxA('#ffffff', 0)); ctx.fillStyle = b; ctx.fillText(str, x0, y); };
  if (rev < 1) band(x0 - pad + (w + pad * 2) * rev, size * 1.3, 0.95);                          // the light that uncovers it
  if (o.spec != null && o.spec > 0 && o.spec < 1) band(lerp(x0 - size, x0 + w + size * 1.6, o.spec), size * 1.1, 0.8);
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  cut glass and gems
// ---------------------------------------------------------------------
// a thick glass body from any closed outline. o: tint (hex | rgb()), liquid { level 0..1, color (preset | hex), inset, base }, facets (x fractions of vertical cuts),
//    spec 0..1, specA, rim 0..1, sharp, key, bb
function lxGlass(P, o = {}) {
  const bb = o.bb ?? bbox(P), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, cx = (bb.x0 + bb.x1) / 2, z = lxZ(), R = RNG('lxglass', o.key ?? 'glass');
  const tint = lxHex(lxRGB(o.tint ?? '#5a3a1e')), path = (Q) => (o.sharp ? lxPoly(Q) : trace(Q, true)), box = () => ctx.fillRect(bb.x0 - 4, bb.y0 - 4, w + 8, h + 8), fac = o.facets ?? [0.2, 0.8], rim = clamp(o.rim ?? 1);
  ctx.save(); path(P); ctx.clip();
  let g = ctx.createLinearGradient(bb.x0, 0, bb.x1, 0);                    // dark, thick glass: brighter where the wall is thickest (the edges)
  const d0 = lxMix(tint, '#000000', 0.9), d1 = lxMix(tint, '#000000', 0.74), d2 = lxMix(tint, '#000000', 0.45);
  g.addColorStop(0, d2); g.addColorStop(0.07, d0); g.addColorStop(0.5, d1); g.addColorStop(0.93, d0); g.addColorStop(1, d2); ctx.fillStyle = g; box();
  const lq = o.liquid, base = (lq?.base ?? 0.1) * h;
  if (lq) {                                                               // the liquid: the outline again, smaller, cut off at its level
    const ins = lq.inset ?? 0.07, lc = lxTone(LUX.liquid, lq.color, 'amber'), kx = 1 - ins * 2, ky = (h - base - ins * w) / h, top = bb.y1 - base - h * ky * clamp(lq.level ?? 0.84);
    const Q = P.map(([px, py]) => [cx + (px - cx) * kx, bb.y1 - base + (py - bb.y1) * ky]);
    ctx.save(); path(Q); ctx.clip(); ctx.beginPath(); ctx.rect(bb.x0, top, w, h); ctx.clip();
    g = ctx.createLinearGradient(bb.x0 + w * ins, 0, bb.x1 - w * ins, 0); g.addColorStop(0, lc.lo); g.addColorStop(0.2, lc.base); g.addColorStop(0.44, lc.hi); g.addColorStop(0.62, lc.base); g.addColorStop(1, lc.lo); ctx.fillStyle = g; box();
    g = ctx.createLinearGradient(0, top, 0, bb.y1 - base); g.addColorStop(0, lxK(0.42)); g.addColorStop(0.45, lxK(0)); g.addColorStop(0.7, lxA(lc.hi, 0)); g.addColorStop(1, lxA(lc.hi, 0.5)); ctx.fillStyle = g; box();   // light gathers at the bottom
    ctx.fillStyle = lxA(lc.hi, 0.8); ctx.fillRect(bb.x0, top, w, 3 / z); ctx.fillStyle = lxK(0.3); ctx.fillRect(bb.x0, top + 3 / z, w, 5 / z);   // the meniscus
    ctx.restore();
  }
  fac.forEach((f, i) => {                                                 // vertical cuts: the side facets take a different tone
    const fx = bb.x0 + f * w;
    ctx.fillStyle = f < 0.5 ? lxW(0.075) : lxK(0.28); ctx.fillRect(f < 0.5 ? bb.x0 : fx, bb.y0, f < 0.5 ? fx - bb.x0 : bb.x1 - fx, h);
    ctx.fillStyle = lxW(0.34); ctx.fillRect(fx - 1 / z, bb.y0, 2 / z, h); ctx.fillStyle = lxK(0.4); ctx.fillRect(fx + 1 / z, bb.y0, 2 / z, h);
  });
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {                                           // refraction in the thick base: short bright and dark slivers
    const x0 = bb.x0 + R.r(0.06, 0.94) * w, lean = R.n(0.09) * w; ctx.strokeStyle = R.f() < 0.6 ? lxW(R.r(0.14, 0.5)) : lxK(R.r(0.3, 0.6)); ctx.lineWidth = R.r(1.5, 5) / z;
    ctx.beginPath(); ctx.moveTo(x0, bb.y1 - base * R.r(0.75, 1)); ctx.lineTo(x0 + lean, bb.y1 - base * R.r(0, 0.2)); ctx.stroke();
  }
  ctx.fillStyle = lxW(0.2); ctx.fillRect(bb.x0, bb.y1 - base - 1 / z, w, 2 / z);
  for (let i = 0; i < 3; i++) {                                           // long faint reflections lying across the face
    const x0 = bb.x0 + R.r(0.25, 0.75) * w, bw = R.r(0.02, 0.06) * w; ctx.fillStyle = lxW(R.r(0.03, 0.07));
    ctx.beginPath(); ctx.moveTo(x0, bb.y0); ctx.lineTo(x0 + bw, bb.y0); ctx.lineTo(x0 + bw - h * 0.22, bb.y1); ctx.lineTo(x0 - h * 0.22, bb.y1); ctx.closePath(); ctx.fill();
  }
  g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1); g.addColorStop(0, lxW(0)); g.addColorStop(0.14, lxW(0.62)); g.addColorStop(0.6, lxW(0.3)); g.addColorStop(0.9, lxW(0));   // the long highlight down the left
  ctx.fillStyle = g; ctx.fillRect(bb.x0 + w * 0.085, bb.y0, w * 0.035, h); ctx.fillStyle = lxW(0.2); ctx.fillRect(bb.x0 + w * 0.925, bb.y0 + h * 0.1, 2.5 / z, h * 0.7);
  if (o.spec != null && o.spec > 0 && o.spec < 1) lxSpecBand(bb, o.spec, o.specA ?? 0.5);
  if (rim > 0) {                                                          // the glass edge: a bright line inside the outline
    g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1); g.addColorStop(0, lxW(0.85 * rim)); g.addColorStop(0.5, lxW(0.4 * rim)); g.addColorStop(1, lxW(0.55 * rim));
    path(P); ctx.lineJoin = 'miter'; ctx.strokeStyle = lxW(0.1 * rim); ctx.lineWidth = 16 / z; ctx.stroke(); ctx.strokeStyle = g; ctx.lineWidth = 5 / z; ctx.stroke();
  }
  ctx.restore(); return bb;
}
const lxGemPts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
// a round brilliant-cut stone seen from above: table, star, kite and girdle facets that flash one after another as the light turns.
// o: color (preset | hex), light (angle of the light; default by time), rot, glint 0..1 (a four-point star on the table edge), key, anchor (sets SPARK_AT)
function lxGem(x, y, r, o = {}) {
  const base = LUX.gem[o.color ?? 'diamond'] ?? lxHex(lxRGB(o.color)), R = RNG('lxgem', o.key ?? 'gem'), light = o.light ?? TT * 0.85, a0 = (o.rot ?? 0) - Math.PI / 2 + Math.PI / 8, z = lxZ();
  if (o.anchor && !LUX_LITE) SPARK_AT = toScreen(x, y);
  const st = [[0, lxMix(base, '#000000', 0.88)], [0.3, lxMix(base, '#000000', 0.5)], [0.58, base], [0.82, lxMix(base, '#ffffff', 0.62)], [1, '#ffffff']], fire = ['#ffb347', '#7fe3ff', '#ff8fb0', '#b9ff9a'];
  const pt = (rad, k) => [x + Math.cos(a0 + k * Math.PI / 8) * rad * r, y + Math.sin(a0 + k * Math.PI / 8) * rad * r];
  const Fs = [];                                                          // [points, direction (16ths of a turn), class]
  for (let i = 0; i < 8; i++) {
    const k = i * 2;
    Fs.push([[pt(1.04, k), pt(1.04, k + 1), pt(0.72, k + 1)], k + 0.5, 2], [[pt(1.04, k + 1), pt(1.04, k + 2), pt(0.72, k + 1)], k + 1.5, 2]);   // upper girdle
    Fs.push([[pt(0.5, k), pt(0.72, k + 1), pt(1.04, k), pt(0.72, k - 1)], k, 1]);                                                              // kite
    Fs.push([[pt(0.5, k), pt(0.5, k + 2), pt(0.72, k + 1)], k + 1, 0]);                                                                        // star
    Fs.push([[[x, y], pt(0.5, k), pt(0.46, k + 1)], k + 0.5, 3], [[[x, y], pt(0.46, k + 1), pt(0.5, k + 2)], k + 1.5, 3]);                       // the pavilion, seen through the table
  }
  for (let i = 0; i < 8; i++) Fs.push([[[x, y], pt(0.25, i * 2 - 0.6), pt(0.33, i * 2), pt(0.25, i * 2 + 0.6)], i * 2, 4]);                      // the arrows round the culet
  const off = [0, 1.9, 3.4, 0.8, 2.7], lobes = [2, 1, 3, 2, 1], sp = [1, -0.7, 1.3, -1.1, 0.9];
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.fillStyle = st[1][1]; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.lineJoin = 'round';
  for (const [Q, dir, cls] of Fs) {
    const b = 0.5 + 0.5 * Math.cos(dir * Math.PI / 8 * lobes[cls] - light * sp[cls] + off[cls] + R.n(0.7)), lum = 0.1 + 0.5 * b * b + 0.5 * b ** 9, f = R.f(), fc = R.pick(fire);
    let c = lxRamp(st, lum); if (lum > 0.62 && f < 0.3) c = lxMix(c, fc, 0.3);    // a little fire in the bright facets
    lxPoly(Q); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = lxW(cls === 4 ? 0.1 : 0.22); ctx.lineWidth = 1.2 / z; ctx.stroke();
  }
  let g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, 0, x - r * 0.4, y - r * 0.45, r * 1.1);   // the lamp on the crown
  g.addColorStop(0, lxW(0.3)); g.addColorStop(1, lxW(0)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = lxW(0.75); ctx.lineWidth = 3 / z; ctx.stroke();
  ctx.restore();
  if (o.glint && !LUX_LITE) { const p = pt(0.5, 12); lxGlint(p[0], p[1], r * 1.5, { a: o.glint }); }
}

// ---------------------------------------------------------------------
//  invented, unbranded products. lxProduct(kind, x, y, s, o): x = centre, y = where it stands, s = its height.
//  o (all kinds): spec 0..1 (a specular sweep crossing gold and glass), shift (the gold's bands slide), glint 0..1, reflect (mirror alpha, 0 = none),
//    shadow (false | 'drop' for a top-down shot), color, blur (softness of the mirror image), key
// ---------------------------------------------------------------------
function lxStand(x, y, w, h, draw, o) {
  if (!LUX_LITE && o.shadow !== false && o.shadow !== 'drop') lxShadow(x, y, w * 0.66, { a: 0.9 });
  if (o.shadow !== 'drop') lxReflect(y + 1, draw, { a: o.reflect ?? 0.34, depth: o.depth ?? h * 0.62, blur: o.blur ?? 2 });
  draw();
}
// the bottle's silhouette (for bridges) and its glass body
function lxBottleParts(x, y, s) {
  const bw = 0.56 * s, bh = 0.62 * s, c1 = 0.03 * s, c2 = 0.1 * s, yb = y - bh, cw = 0.2 * s, ch = 0.055 * s, yc = yb - ch, kw = 0.27 * s, kh = 0.3 * s, yt = yc - kh, kc = 0.035 * s;
  const body = [[x - bw / 2 + c2, yb], [x + bw / 2 - c2, yb], [x + bw / 2, yb + c2], [x + bw / 2, y - c1], [x + bw / 2 - c1, y], [x - bw / 2 + c1, y], [x - bw / 2, y - c1], [x - bw / 2, yb + c2]];
  const cap = [[x - kw / 2 + kc, yt], [x + kw / 2 - kc, yt], [x + kw / 2, yt + kc], [x + kw / 2, yc], [x - kw / 2, yc], [x - kw / 2, yt + kc]];
  const sil = [[x - kw / 2 + kc, yt], [x + kw / 2 - kc, yt], [x + kw / 2, yt + kc], [x + kw / 2, yc], [x + cw / 2, yc], [x + cw / 2, yb], ...body.slice(1, 8), [x - bw / 2 + c2, yb], [x - cw / 2, yb], [x - cw / 2, yc], [x - kw / 2, yc], [x - kw / 2, yt + kc]];
  return { body, cap, sil, bw, bh, yb, yc, yt, cw, ch, kw, kh, kc };
}
// the outline a product is morphed from or to: 'perfume' (the whole bottle), 'gem' / 'ring' (the stone: s = the ring's height), 'lipstick', 'gift'
function lxProductPts(kind, x, y, s) {
  if (kind === 'perfume') return resample(lxBottleParts(x, y, s).sil, true, 14);
  if (kind === 'ring') return lxGemPts(x, y - 0.77 * s, 0.225 * s);
  if (kind === 'lipstick') return rrectPts(x - 0.13 * s, y - s, 0.26 * s, s, 0.05 * s, 8);
  return rrectPts(x - 0.48 * s, y - 0.94 * s, 0.96 * s, 0.94 * s, 0.05 * s, 8);
}
// a faceted perfume bottle: thick cut glass, amber liquid, a gold collar and a faceted gold cap. o.liquid (preset | hex), o.level
function lxPerfume(x, y, s, o = {}) {
  const p = lxBottleParts(x, y, s), z = lxZ(), spec = o.spec, shift = o.shift ?? 0;
  const draw = () => {
    lxGlass(p.body, { sharp: true, tint: o.tint ?? '#6b3d17', liquid: { color: o.liquid ?? 'amber', level: o.level ?? 0.86, inset: 0.065, base: 0.11 }, facets: [0.19, 0.81], spec, key: o.key ?? 'perfume' });
    ctx.save(); lxPoly(p.body); ctx.clip();                                 // the shoulders are cut: two bright facets
    ctx.fillStyle = lxW(0.2); lxPoly([[x - p.bw / 2, p.yb], [x - p.bw / 2 + 0.1 * s, p.yb], [x - p.bw / 2 + 0.16 * s, p.yb + 0.06 * s], [x - p.bw / 2, p.yb + 0.2 * s]]); ctx.fill();
    ctx.fillStyle = lxW(0.07); lxPoly([[x + p.bw / 2, p.yb], [x + p.bw / 2 - 0.1 * s, p.yb], [x + p.bw / 2 - 0.16 * s, p.yb + 0.06 * s], [x + p.bw / 2, p.yb + 0.2 * s]]); ctx.fill();
    ctx.strokeStyle = lxW(0.3); ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.moveTo(x - p.bw / 2 + 0.16 * s, p.yb + 0.06 * s); ctx.lineTo(x + p.bw / 2 - 0.16 * s, p.yb + 0.06 * s); ctx.stroke();
    ctx.restore();
    const lw = 0.2 * s, lh = 0.13 * s, ly = y - p.bh * 0.47;               // a small gold plaque with a lozenge (no lettering: it is mirrored in the slab)
    ctx.save(); ctx.strokeStyle = lxGoldGrad(x - lw / 2, 0, x + lw / 2, 0, 'polished', shift); ctx.lineWidth = 3 / z; ctx.strokeRect(x - lw / 2, ly - lh / 2, lw, lh);
    ctx.lineWidth = 1.2 / z; ctx.strokeRect(x - lw / 2 + 7, ly - lh / 2 + 7, lw - 14, lh - 14); ctx.restore();
    lxGold([[x, ly - lh * 0.24], [x + lw * 0.13, ly], [x, ly + lh * 0.24], [x - lw * 0.13, ly]], { sharp: true, dir: 0.6, shift });
    lxGold([[x - p.cw / 2, p.yc], [x + p.cw / 2, p.yc], [x + p.cw / 2, p.yb + 2], [x - p.cw / 2, p.yb + 2]], { sharp: true, kind: 'round', shift: shift * 0.5, spec, bevel: 1.5 });   // the collar
    lxGold(p.cap, { sharp: true, kind: 'polished', shift, spec, bevel: 2.5 });                                                                                                      // the cap
    ctx.save(); lxPoly(p.cap); ctx.clip();                                  // its cut faces
    for (const f of [0.22, 0.78]) { const fx = x - p.kw / 2 + f * p.kw; ctx.fillStyle = lxA(LUX.gold.white, 0.5); ctx.fillRect(fx - 1 / z, p.yt, 2 / z, p.kh); ctx.fillStyle = lxA(LUX.gold.deep, 0.5); ctx.fillRect(fx + 1 / z, p.yt, 2 / z, p.kh); }
    ctx.fillStyle = lxA(LUX.gold.deep, 0.32); ctx.fillRect(x + p.kw * 0.28, p.yt, p.kw * 0.22, p.kh); ctx.fillStyle = lxA(LUX.gold.white, 0.2); ctx.fillRect(x - p.kw / 2, p.yt, p.kw, p.kc * 1.2);
    ctx.fillStyle = lxA(LUX.gold.deep, 0.55); ctx.fillRect(x - p.kw / 2, p.yc - 5, p.kw, 5);
    ctx.restore();
  };
  lxStand(x, y, p.bw, s, draw, o);
  if (o.glint && !LUX_LITE) lxGlint(x - p.kw / 2 + p.kc, p.yt + p.kc, s * 0.2, { a: o.glint });
  return { bb: { x0: x - p.bw / 2, y0: p.yt, x1: x + p.bw / 2, y1: y }, cap: [x - p.kw / 2 + p.kc, p.yt + p.kc], shoulder: [x - p.bw / 2 + 0.05 * s, p.yb + 0.05 * s] };
}
// a solitaire ring seen as a jeweller shows it: the polished band as an ellipse, the stone face-on above it in four claws. o.color = the stone
function lxRing(x, y, s, o = {}) {
  const cy = y - 0.33 * s, rx = 0.36 * s, ry = 0.33 * s, ix = 0.318 * s, iy = 0.284 * s, icy = cy - 0.012 * s, gy = y - 0.77 * s, gr = 0.225 * s, z = lxZ(), turn = (o.shift ?? 0) * 1.6 + (o.spec != null ? o.spec * 1.2 : 0);
  const band = () => { ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.ellipse(x, icy, ix, iy, 0, 0, TAU); };
  const body = () => {
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, icy, ix, iy, 0, 0, TAU); ctx.clip();          // the inside of the band, seen through the ring
    ctx.beginPath(); ctx.ellipse(x, icy, ix, iy, 0, 0, TAU); ctx.ellipse(x, icy + 0.05 * s, ix * 0.985, iy * 0.97, 0, 0, TAU);
    const g = ctx.createLinearGradient(x - ix, 0, x + ix, 0); g.addColorStop(0, LUX.gold.deep); g.addColorStop(0.3, LUX.gold.mid); g.addColorStop(0.5, LUX.gold.lo); g.addColorStop(0.75, LUX.gold.base); g.addColorStop(1, LUX.gold.deep);
    ctx.fillStyle = g; ctx.fill('evenodd'); ctx.restore();
    ctx.save(); band(); ctx.clip('evenodd');
    ctx.fillStyle = lxGoldConic(x, cy, -2.2 + turn); ctx.fillRect(x - rx, cy - ry, rx * 2, ry * 2);
    let g2 = ctx.createLinearGradient(0, cy - ry, 0, cy + ry); g2.addColorStop(0, lxW(0.16)); g2.addColorStop(0.4, lxW(0)); g2.addColorStop(1, lxK(0.3)); ctx.fillStyle = g2; ctx.fillRect(x - rx, cy - ry, rx * 2, ry * 2);
    if (o.spec != null && o.spec > 0 && o.spec < 1) lxSpecBand({ x0: x - rx, y0: cy - ry, x1: x + rx, y1: cy + ry }, o.spec, 0.55);
    const mx = (rx + ix) / 2, my = (ry + iy) / 2, mcy = (cy + icy) / 2;                       // the band is round in section: a lit crown along its middle
    ctx.lineCap = 'round'; ctx.lineWidth = 0.014 * s; ctx.strokeStyle = lxA(LUX.gold.white, 0.5); ctx.beginPath(); ctx.ellipse(x, mcy, mx, my, 0, Math.PI * 1.08, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, mcy, mx, my, 0, Math.PI * 0.2, Math.PI * 0.45); ctx.stroke();
    ctx.lineWidth = 3 / z; ctx.strokeStyle = lxA(LUX.gold.white, 0.75); ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    ctx.strokeStyle = lxA(LUX.gold.deep, 0.7); ctx.beginPath(); ctx.ellipse(x, icy, ix, iy, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.5 / z; ctx.strokeStyle = lxA(LUX.gold.white, 0.8); ctx.beginPath(); ctx.ellipse(x, icy + 3 / z, ix + 3 / z, iy + 3 / z, 0, Math.PI * 0.12, Math.PI * 0.62); ctx.stroke();
    ctx.strokeStyle = lxA(LUX.gold.deep, 0.6); ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, Math.PI * 0.05, Math.PI * 0.8); ctx.stroke();
    ctx.restore();
    lxGold([[x - 0.045 * s, y - 0.655 * s], [x + 0.045 * s, y - 0.655 * s], [x + 0.13 * s, gy + gr * 0.5], [x - 0.13 * s, gy + gr * 0.5]], { sharp: true, kind: 'round', shift: o.shift ?? 0 });   // the basket under the stone
    lxGem(x, gy, gr, { color: o.color ?? 'diamond', key: o.key ?? 'ring', light: o.light, anchor: o.anchor });
    for (let i = 0; i < 4; i++) {                                          // four claws
      const a = Math.PI / 4 + i * Math.PI / 2, px = x + Math.cos(a) * gr * 0.97, py = gy + Math.sin(a) * gr * 0.97, pr = 0.03 * s;
      ctx.fillStyle = lxK(0.4); ctx.beginPath(); ctx.arc(px + 2, py + 3, pr, 0, TAU); ctx.fill();
      const g3 = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.4, pr * 0.1, px, py, pr); g3.addColorStop(0, LUX.gold.white); g3.addColorStop(0.4, LUX.gold.base); g3.addColorStop(1, LUX.gold.lo);
      ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    }
  };
  if (o.shadow === 'drop' && !LUX_LITE) {                                  // lying on the slab, seen from above: a soft shadow down-right
    ctx.save(); ctx.translate(16, 24); ctx.filter = `blur(${(13 * z).toFixed(2)}px)`;
    ctx.strokeStyle = lxK(0.62); ctx.lineWidth = 0.06 * s; ctx.beginPath(); ctx.ellipse(x, cy, rx - 0.025 * s, ry - 0.025 * s, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = lxK(0.6); ctx.beginPath(); ctx.arc(x, gy, gr, 0, TAU); ctx.fill();
    ctx.restore();
  }
  lxStand(x, y, rx * 1.5, s, body, { depth: s * 0.45, ...o });
  if (o.glint && !LUX_LITE) lxGlint(x - gr * 0.36, gy - gr * 0.36, gr * 1.7, { a: o.glint });
  return { bb: { x0: x - rx, y0: gy - gr, x1: x + rx, y1: y }, gem: [x, gy, gr] };
}
// a lipstick: a gold tube with turned bands, a brushed sleeve, the bullet with its slanted tip. o.color = the bullet
function lxLipstick(x, y, s, o = {}) {
  const tw = 0.26 * s, th = 0.46 * s, sw = 0.21 * s, sh = 0.17 * s, bw = 0.17 * s, bh = 0.37 * s, yt = y - th, ys = yt - sh, yb = ys - bh, c = lxTone({}, o.color ?? '#a3152f'), z = lxZ(), shift = o.shift ?? 0;
  const draw = () => {
    const B2 = [[x - bw / 2, ys + 2], [x - bw / 2, yb + bh * 0.1], [x - bw * 0.36, yb + bh * 0.015], [x - bw * 0.1, yb], [x + bw * 0.34, yb + bh * 0.3], [x + bw / 2, yb + bh * 0.44], [x + bw / 2, ys + 2]];
    ctx.save(); lxPoly(B2); ctx.clip();                                     // the bullet: a waxy cylinder cut on a slant
    let g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0); g.addColorStop(0, c.lo); g.addColorStop(0.22, c.base); g.addColorStop(0.36, lxMix(c.base, c.hi, 0.7)); g.addColorStop(0.5, c.base); g.addColorStop(1, c.lo);
    ctx.fillStyle = g; ctx.fillRect(x - bw, yb - 4, bw * 2, bh + 8);
    ctx.fillStyle = lxA(c.hi, 0.35); lxPoly([[x - bw * 0.36, yb + bh * 0.015], [x - bw * 0.1, yb], [x + bw * 0.34, yb + bh * 0.3], [x + bw / 2, yb + bh * 0.44], [x + bw * 0.1, yb + bh * 0.32]]); ctx.fill();   // the cut face
    if (o.spec != null && o.spec > 0 && o.spec < 1) lxSpecBand({ x0: x - bw / 2, y0: yb, x1: x + bw / 2, y1: ys }, o.spec, 0.4);
    ctx.restore();
    lxGold(rrectPts(x - sw / 2, ys, sw, sh + 4, 3, 2), { kind: 'brushed', dir: 0, key: 'sleeve', shift, spec: o.spec, bevel: 1.2 });
    lxGold(rrectPts(x - tw / 2, yt, tw, th, 0.02 * s, 3), { kind: 'round', shift: shift * 0.6, spec: o.spec, bevel: 2 });
    ctx.save(); for (const f of [0.06, 0.1, 0.9, 0.94]) { ctx.fillStyle = lxA(LUX.gold.deep, 0.55); ctx.fillRect(x - tw / 2, yt + th * f, tw, 2.5 / z); ctx.fillStyle = lxA(LUX.gold.white, 0.4); ctx.fillRect(x - tw / 2, yt + th * f + 2.5 / z, tw, 1.5 / z); } ctx.restore();
  };
  lxStand(x, y, tw, s, draw, o);
  if (o.glint && !LUX_LITE) lxGlint(x - tw * 0.2, yt + th * 0.08, s * 0.16, { a: o.glint });
  return { bb: { x0: x - tw / 2, y0: yb, x1: x + tw / 2, y1: y }, tip: [x - bw * 0.1, yb] };
}
// a small gift box: a lacquer body and lid, a gold satin ribbon and bow. o.color = the lacquer
function lxGift(x, y, s, o = {}) {
  const bw = 0.86 * s, bh = 0.5 * s, lw = 0.92 * s, lh = 0.16 * s, yb = y - bh, yl = yb - lh, rw = 0.15 * s, c = lxTone({}, o.color ?? '#141216'), z = lxZ(), shift = o.shift ?? 0;
  const draw = () => {
    const face = (x0, y0, w, h, top) => {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
      let g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, lxMix(c.base, c.hi, 0.22)); g.addColorStop(0.3, c.base); g.addColorStop(1, lxMix(c.base, '#000000', 0.55)); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
      g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, lxW(top ? 0.22 : 0.05)); g.addColorStop(0.25, lxW(0)); g.addColorStop(1, lxK(0.3)); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
      if (o.spec != null && o.spec > 0 && o.spec < 1) lxSpecBand({ x0, y0, x1: x0 + w, y1: y0 + h }, o.spec, 0.22);
      ctx.fillStyle = lxW(0.4); ctx.fillRect(x0, y0, w, 2 / z); ctx.restore();
    };
    face(x - bw / 2, yb, bw, bh, false); ctx.fillStyle = lxK(0.5); ctx.fillRect(x - bw / 2, yb, bw, 0.03 * s);    // the lid's shadow on the body
    face(x - lw / 2, yl, lw, lh, true);
    lxGold([[x - rw / 2, yl], [x + rw / 2, yl], [x + rw / 2, y], [x - rw / 2, y]], { sharp: true, kind: 'brushed', dir: 0, key: 'ribbon', shift, spec: o.spec });
    ctx.fillStyle = lxK(0.35); ctx.fillRect(x - rw / 2, yb, rw, 0.03 * s);
    for (const sd of [-1, 1]) {                                            // the bow: two satin loops and two tails
      const loop = () => { ctx.beginPath(); ctx.moveTo(x, yl - 0.03 * s); ctx.bezierCurveTo(x + sd * 0.12 * s, yl - 0.3 * s, x + sd * 0.46 * s, yl - 0.26 * s, x + sd * 0.4 * s, yl - 0.09 * s); ctx.bezierCurveTo(x + sd * 0.36 * s, yl + 0.0 * s, x + sd * 0.12 * s, yl - 0.02 * s, x, yl - 0.03 * s); ctx.closePath(); };
      lxGold(loop, { bb: { x0: Math.min(x, x + sd * 0.46 * s), y0: yl - 0.28 * s, x1: Math.max(x, x + sd * 0.46 * s), y1: yl }, kind: 'polished', dir: sd > 0 ? 0.5 : Math.PI - 0.5, shift, spec: o.spec, bevel: 1.5 });
      const hole = () => { ctx.beginPath(); ctx.moveTo(x + sd * 0.07 * s, yl - 0.07 * s); ctx.bezierCurveTo(x + sd * 0.16 * s, yl - 0.2 * s, x + sd * 0.33 * s, yl - 0.19 * s, x + sd * 0.32 * s, yl - 0.1 * s); ctx.bezierCurveTo(x + sd * 0.28 * s, yl - 0.05 * s, x + sd * 0.14 * s, yl - 0.05 * s, x + sd * 0.07 * s, yl - 0.07 * s); ctx.closePath(); };
      ctx.save(); hole(); ctx.fillStyle = lxA(LUX.gold.deep, 0.85); ctx.fill(); ctx.restore();
      lxGold([[x + sd * 0.02 * s, yl - 0.02 * s], [x + sd * 0.1 * s, yl - 0.03 * s], [x + sd * 0.25 * s, yl + 0.13 * s], [x + sd * 0.15 * s, yl + 0.1 * s], [x + sd * 0.13 * s, yl + 0.17 * s]], { sharp: true, kind: 'brushed', dir: 0.4 * sd, key: 'tail' + sd, shift });
    }
    lxGold(rrectPts(x - 0.055 * s, yl - 0.1 * s, 0.11 * s, 0.1 * s, 0.03 * s, 4), { kind: 'round', shift, bevel: 1.5 });   // the knot
  };
  lxStand(x, y, bw, s * 0.7, draw, o);
  if (o.glint && !LUX_LITE) lxGlint(x - 0.2 * s, yl - 0.2 * s, s * 0.2, { a: o.glint });
  return { bb: { x0: x - lw / 2, y0: yl - 0.28 * s, x1: x + lw / 2, y1: y }, knot: [x, yl - 0.05 * s] };
}
function lxProduct(kind, x, y, s, o = {}) {
  return kind === 'ring' ? lxRing(x, y, s, o) : kind === 'lipstick' ? lxLipstick(x, y, s, o) : kind === 'gift' ? lxGift(x, y, s, o) : lxPerfume(x, y, s, o);
}

// ---------------------------------------------------------------------
//  type: a high-contrast serif, widely tracked small caps, a thin gold rule, a foil seal. Lots of dark empty space.
// ---------------------------------------------------------------------
// one line. o: weight, italic, color, track (em), align, a, font, and for a fade-in: at (seconds), dur, rise
function lxType(str, x, y, size, o = {}) {
  const u = o.at != null ? seg(TT, o.at, o.at + (o.dur ?? 0.6)) : 1, al = clamp(o.a ?? 1) * EZ.io(u);
  ctx.save(); ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${size}px ${o.font ?? LUX_SERIF}`;
  const tr = (o.track ?? 0) * size, hasLS = 'letterSpacing' in ctx; if (hasLS) ctx.letterSpacing = tr.toFixed(2) + 'px';
  const w = ctx.measureText(str).width - (hasLS ? tr : 0), align = o.align ?? 'left';
  if (al > 0.004) {
    const xx = x + (hasLS ? (align === 'center' ? tr / 2 : align === 'right' ? tr : 0) : 0), yy = y + (o.rise ?? size * 0.14) * (1 - EZ.io(u));
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = al;
    ctx.fillStyle = lxK(0.6); ctx.fillText(str, xx, yy + 2); ctx.fillStyle = o.color ?? LUX.ivory; ctx.fillText(str, xx, yy);
  }
  ctx.restore(); return w;
}
// a thin gold rule that grows from its centre, with a small lozenge. o: a, at, dur, gem (false = no lozenge)
function lxRule(x, y, w, o = {}) {
  const f = o.at != null ? lxIn(o.at, o.dur ?? 0.7) : 1, al = clamp(o.a ?? 1); if (f <= 0 || al <= 0.004) return;
  const z = lxZ(), hw = w / 2 * f, g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
  g.addColorStop(0, lxA(LUX.gold.base, 0)); g.addColorStop(0.25, lxA(LUX.gold.base, 1)); g.addColorStop(0.5, lxA(LUX.gold.hi, 1)); g.addColorStop(0.75, lxA(LUX.gold.base, 1)); g.addColorStop(1, lxA(LUX.gold.base, 0));
  ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = g; ctx.fillRect(x - hw, y - 1 / z, hw * 2, 2 / z);
  if (o.gem !== false) { const d = 7 * f / z; ctx.fillStyle = LUX.ground; lxPoly([[x, y - d * 1.6], [x + d * 1.6, y], [x, y + d * 1.6], [x - d * 1.6, y]]); ctx.fill(); ctx.fillStyle = LUX.gold.hi; lxPoly([[x, y - d], [x + d, y], [x, y + d], [x - d, y]]); ctx.fill(); }
  ctx.restore();
}
// a small gold-foil monogram seal: a scalloped disc, two rings, a pressed italic letter. o: mono, a, spec 0..1, shift
function lxSeal(x, y, r, o = {}) {
  const al = clamp(o.a ?? 1); if (al <= 0.004) return;
  const n = 26, P = []; for (let i = 0; i < n * 6; i++) { const a = i / (n * 6) * TAU, rr = r * (1 + 0.035 * Math.cos(a * n)); P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  ctx.save(); ctx.globalAlpha = al;
  lxGold(P, { dir: 0.9, shift: o.shift ?? 0, spec: o.spec, specA: 0.8 });
  ctx.lineWidth = r * 0.04; ctx.strokeStyle = lxA(LUX.gold.deep, 0.75); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.stroke();
  ctx.lineWidth = r * 0.02; ctx.strokeStyle = lxA(LUX.gold.white, 0.7); ctx.beginPath(); ctx.arc(x, y + r * 0.02, r * 0.8, 0, TAU); ctx.stroke();
  ctx.font = `italic 400 ${r * 1.12}px ${LUX_SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = lxA(LUX.gold.white, 0.65); ctx.fillText(o.mono ?? 'L', x, y + r * 0.4 + r * 0.035); ctx.fillStyle = LUX.gold.deep; ctx.fillText(o.mono ?? 'L', x, y + r * 0.4);
  ctx.restore();
}

// ---- screen-space type, through DEFER (after the camera, at screen size); all of it steps aside for a bridge
// tracked caps over a thin gold rule over a gold-foil headline that a wipe of light uncovers. head may be an array of lines.
// o: x, y (first headline baseline), size, at (seconds into the era), ksize, rule (width), italic
function lxTitle(kicker, head, o = {}) {
  lxDefer(() => {
    const k = lxBridgeK(); if (k <= 0) return;
    const at = E0 + (o.at ?? 0.4), x = o.x ?? CX, y = o.y ?? 500, size = o.size ?? 100;
    if (kicker) lxType(String(kicker).toUpperCase(), x, y - size * 1.42, o.ksize ?? 28, { color: LUX.cream, track: 0.38, align: 'center', a: k, at, rise: 8 });
    lxRule(x, y - size * 1.08, o.rule ?? 250, { a: k, at: at + 0.15 });
    [].concat(head).forEach((line, i) => lxGoldText(line, x, y + i * size * 1.08, size, { align: 'center', italic: o.italic, a: k, reveal: lxIn(at + 0.3 + i * 0.35, 1.0), spec: seg(TT, at + 1.7 + i * 0.2, at + 2.6 + i * 0.2) }));
  });
}
// one caption line near the bottom, in italic serif; words inside *...* are set in gold. Words arrive one at a time.
function lxCaption(str, o = {}) {
  lxDefer(() => {
    const k = lxBridgeK(); if (k <= 0) return;
    const at = E0 + (o.at ?? 0.6), size = o.size ?? 52, y = o.y ?? (H > W * 1.2 ? 1440 : H - 120), cx = o.x ?? CX;
    const words = []; String(str).split('*').forEach((part, i) => part.split(/\s+/).filter(Boolean).forEach((wd) => words.push({ s: wd, hi: i % 2 === 1 })));
    ctx.save(); ctx.font = `italic 400 ${size}px ${LUX_SERIF}`; const sp = size * 0.26, ws = words.map((wd) => ctx.measureText(wd.s).width); ctx.restore();
    let x = cx - (ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1)) / 2;
    words.forEach((wd, i) => {
      const t0 = at + i * 0.1;
      if (wd.hi) lxGoldText(wd.s, x, y, size, { italic: true, a: k * lxIn(t0, 0.5) }); else lxType(wd.s, x, y, size, { italic: true, color: LUX.ivory, a: k, at: t0, dur: 0.5, rise: 10 });
      x += ws[i] + sp;
    });
  });
}
// a small mark, top left: the foil seal and a line of tracked caps
function lxTag(str, o = {}) {
  lxDefer(() => {
    const k = lxBridgeK() * lxIn(E0 + (o.at ?? 0.15), 0.5); if (k <= 0.004) return;
    const x = o.x ?? 104, y = o.y ?? (H > W * 1.2 ? 292 : 90), r = o.r ?? 30;
    lxSeal(x, y, r, { mono: o.mono, a: k, spec: seg(TT, E0 + 0.8, E0 + 1.6) });
    lxType(String(str).toUpperCase(), x + r + 22, y + 9, o.size ?? 25, { color: LUX.cream, track: 0.3, a: k });
  });
}
// dither: a fine fixed grain, so the dark gradients do not band in the video (held still: moving grain multiplies the file size)
function lxGrain(al = LUX.grain) {
  if (al <= 0) return;
  if (!LUX_CACHE.grain) {
    const n = 256, R = RNG('lxgrain'), cv = document.createElement('canvas'); cv.width = cv.height = n;
    const g = cv.getContext('2d'), img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = Math.floor(R.f() * 256); img.data[i * 4] = v; img.data[i * 4 + 1] = v * 0.96; img.data[i * 4 + 2] = v * 0.88; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); LUX_CACHE.grain = cv;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = al; ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(LUX_CACHE.grain, x, y);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks. Bridge colours are 6-digit hex (a liquid's or a stone's base colour); mid-morph the blend arrives as rgb().
// =====================================================================
const STYLE = {
  name: 'luxe',
  paper: LUX.ground,                                                     // the dark of the studio
  backdrop(c) { fillAll(c); lxBokeh({ n: 9, key: 'bridge', a: 0.8 }); lxVignette(0.6); },   // the lights are down: only bokeh drifts
  window(P, key, src) {                                                  // the scene through the product's outline, edged in gold
    const bb = bbox(P), far = bb.y1 - bb.y0 > H * 2.4;
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0);
    if (!far) { trace(P, true); ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = lxGoldGrad(bb.x0, bb.y0, bb.x1, bb.y1, 'polished'); ctx.stroke(); }
    ctx.restore();
  },
  blob(P, c, key, u = 0) {                                               // cut glass changing shape while a band of light crosses it and a glint flares
    const bb = bbox(P);
    lxGlass(P, { tint: c, liquid: { color: c, level: 0.9, inset: 0.05, base: 0.06 }, facets: [0.22, 0.78], spec: 0.1 + 0.8 * clamp(u), specA: 0.6, key: 'blob' });
    ctx.save(); trace(P, true); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = lxGoldGrad(bb.x0, bb.y0, bb.x1, bb.y1, 'polished', u * 0.3 - 0.15); ctx.stroke(); ctx.restore();
    lxGlint(lerp(bb.x0, bb.x1, 0.24), lerp(bb.y0, bb.y1, 0.2), (bb.x1 - bb.x0) * 0.5, { a: Math.sin(Math.PI * clamp(u)) ** 2 });
  },
  hero(x, y, r, o = {}) { lxGem(x, y, r * 0.9, { key: o.key ?? 'hero', anchor: true, glint: 0.5 + 0.5 * Math.sin(TT * 3) }); },   // r = half the hero's size
  heroColor: LUX.gem.diamond,
  heroPts(x, y, r) { return lxGemPts(x, y, r * 0.9); },
  post() { lxGrain(); },
  ones: true,                                                            // slow and sensual: on 1s
};
