// =====================================================================
//  styles/keynote/kit.js — a product reveal on a dark stage (the visual language of a launch keynote).
//  Built on kit/core.js. One invented product stands on a glossy floor under a spotlight: it starts as a silhouette
//  with only a white rim light, a key light sweeps across it and the finish appears, a specular band crosses it,
//  its mirror image fades into the floor. Round it: very large thin numerals that count up, small tracked caps,
//  hairline leaders, a kicker over a headline. Near-black, graphite greys, pure white type and ONE finish colour.
//  Any closed outline becomes a lit product with keyProduct(P, o); keyCase / keySpeaker / keySlab / keyPuck are
//  ready-made, unbranded objects built on it.
//  Optional piece constant (anywhere in the piece): KEY_FINISH = 'titanium' | 'midnight' | 'gold' (default titanium).
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const KEY = {
  ground: '#050507',                  // the stage: the blank sheet a morph happens on
  sil: '#08080b',                     // an unlit product (a hair above the ground, so the silhouette reads)
  g1: '#15151b', g2: '#24242b', g3: '#3a3a43', g4: '#6e6e78', g5: '#a4a4ae',   // graphite greys: floor, rules, labels
  soft: '#cfcfd6', white: '#ffffff',
  fin: {                              // the finishes: base (mid tone), hi (lit), lo (shaded)
    titanium: { name: 'titanium', base: '#8f8b84', hi: '#ebe6dd', lo: '#2a2927' },
    midnight: { name: 'midnight', base: '#2f4e86', hi: '#a9c4f2', lo: '#0b1428' },
    gold:     { name: 'gold',     base: '#b48a4e', hi: '#f8e2b4', lo: '#3b2912' },
  },
  rim: 5, hair: 2,                    // rim light and hairline widths in screen px (divided by the camera zoom)
  grain: 0.018,                       // dither over the near-black gradients (post)
};
const KEY_SANS = '"Helvetica Neue", "Segoe UI", Inter, Roboto, "Noto Sans", "Liberation Sans", Arial, sans-serif';

// ---------------------------------------------------------------------
//  colour, timing, small helpers
// ---------------------------------------------------------------------
const keyRGB = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
const keyHex = (v) => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
const keyMix = (a, b, u) => { const x = keyRGB(a), y = keyRGB(b); return keyHex(x.map((v, i) => lerp(v, y[i], u))); };
const keyA = (c, al) => { const [r, g, b] = keyRGB(c); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(al).toFixed(4)})`; };
const keyW = (al) => `rgba(255,255,255,${clamp(al).toFixed(4)})`;
const keyK = (al) => `rgba(0,0,0,${clamp(al).toFixed(4)})`;
// a finish from a name, a finish object, or any base colour (hex or the renderer's rgb() blend mid-morph)
function keyFin(f) {
  if (f && typeof f === 'object') return f;
  const name = f ?? (typeof KEY_FINISH !== 'undefined' ? KEY_FINISH : 'titanium');
  if (KEY.fin[name]) return KEY.fin[name];
  const base = keyHex(keyRGB(name)), preset = Object.values(KEY.fin).find((p) => p.base === base);
  if (preset) return preset;
  return { name: 'custom', base, hi: keyMix(base, '#ffffff', 0.68), lo: keyMix(base, '#000000', 0.74) };
}
const keyZ = () => Math.abs(ctx.getTransform().a) || 1;                 // the camera zoom: hairlines divide by it
const keyIn = (t0, d = 0.5) => EZ.io(seg(TT, t0, t0 + d));              // ease in-out from t0 over d: the only curve this look uses
function keyBridgeK() {                                                 // 1 outside bridges, 0 inside: type steps aside for the morph
  if (typeof BRIDGES === 'undefined') return 1;
  let k = 1; for (const r of BRIDGES) k = Math.min(k, clamp((Math.abs(TT - r.tc) - (r.d ?? 0.6)) / 0.2));
  return k;
}
let KEY_LITE = false, KEY_SCRATCH = null, KEY_GRAIN = null;             // LITE: drawing a reflection (no shadow, no nested mirror)

// ---------------------------------------------------------------------
//  the stage: near-black wall, a soft floor line, a glossy floor, a very subtle vignette
// ---------------------------------------------------------------------
function keyVignette(al = 0.5) {
  ctx.save(); screen();
  const g = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.hypot(W, H) * 0.56);
  g.addColorStop(0, keyK(0)); g.addColorStop(1, keyK(al)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// o: floor (world y of the floor line), cx (where the light is centred), light 0..1 (house lights: 0 = black), span (half-length of the floor line)
function keyStage(o = {}) {
  const fy = o.floor ?? 1160, cx = o.cx ?? W / 2, L = clamp(o.light ?? 1), span = o.span ?? 430, z = keyZ();
  fillAll(KEY.ground);
  ctx.save();
  let g = ctx.createRadialGradient(cx, fy - 240, 40, cx, fy - 240, 820);              // the wall lifts a little behind the product
  g.addColorStop(0, keyA(KEY.g1, 0.85 * L)); g.addColorStop(0.55, keyA(KEY.g1, 0.3 * L)); g.addColorStop(1, keyA(KEY.g1, 0));
  ctx.fillStyle = g; ctx.fillRect(-W * 2, -H, W * 5, fy + H);
  ctx.save(); ctx.beginPath(); ctx.rect(-W * 2, fy, W * 5, H * 2); ctx.clip();        // the floor: a sheen under the light that falls to black, never a grey band
  ctx.translate(cx, fy); ctx.scale(1, 0.56);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 760);
  g.addColorStop(0, keyA(KEY.g2, 0.16 + 0.5 * L)); g.addColorStop(0.4, keyA(KEY.g1, 0.14 + 0.36 * L)); g.addColorStop(1, keyA(KEY.g1, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 760, 0, TAU); ctx.fill(); ctx.restore();
  g = ctx.createLinearGradient(cx - span, 0, cx + span, 0);                            // the floor line: a hairline that dies away to both sides
  g.addColorStop(0, keyW(0)); g.addColorStop(0.5, keyW(0.07 + 0.2 * L)); g.addColorStop(1, keyW(0));
  ctx.fillStyle = g; ctx.fillRect(cx - span, fy - 1 / z, span * 2, KEY.hair / z);
  ctx.restore();
  keyVignette(o.vig ?? 0.5);
}
// the beam: a soft cone from above ending in a pool of light on the floor at (x, y).
// o: a 0..1, w (half-width at the floor), sw (half-width at the lamp), sx (lamp x), top (lamp y), ry (pool height)
function keySpot(x, y, o = {}) {
  const a = clamp(o.a ?? 1); if (a <= 0.003) return;
  const top = o.top ?? -120, sx = o.sx ?? x, w = o.w ?? 300, sw = o.sw ?? 30, ry = o.ry ?? w * 0.16, n = 12;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, top, 0, y);
  g.addColorStop(0, keyW(0.028 * a)); g.addColorStop(0.5, keyW(0.013 * a)); g.addColorStop(0.92, keyW(0.002 * a)); g.addColorStop(1, keyW(0));
  ctx.fillStyle = g;
  for (let i = 0; i < n; i++) {                                         // nested cones: a soft edge without a blur
    const k = 1 - i * 0.07; ctx.beginPath(); ctx.moveTo(sx - sw * k, top); ctx.lineTo(sx + sw * k, top); ctx.lineTo(x + w * k, y); ctx.lineTo(x - w * k, y); ctx.closePath(); ctx.fill();
  }
  ctx.translate(x, y); ctx.scale(1, ry / w);
  const p = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.1);
  p.addColorStop(0, keyW(0.2 * a)); p.addColorStop(0.45, keyW(0.085 * a)); p.addColorStop(1, keyW(0));
  ctx.fillStyle = p; ctx.beginPath(); ctx.arc(0, 0, w * 1.1, 0, TAU); ctx.fill();
  ctx.restore();
}
// faint dust motes drifting in the beam (same geometry as keySpot). o: a, n, key, plus keySpot's w, sw, sx, top
function keyDust(x, y, o = {}) {
  const a = clamp(o.a ?? 1); if (a <= 0.003) return;
  const top = o.top ?? -120, sx = o.sx ?? x, w = o.w ?? 300, sw = o.sw ?? 30, n = o.n ?? 44, R = RNG('keydust', o.key ?? 'beam'), z = keyZ();
  ctx.save(); ctx.fillStyle = KEY.white;
  for (let i = 0; i < n; i++) {
    const v0 = R.f(), u = R.n(0.86), sp = R.r(0.01, 0.03), ph = R.r(0, TAU), size = R.r(1.3, 3.2), tw = R.r(0.5, 1.5), far = R.f() > 0.82;
    const v = mod(v0 + TT * sp, 1), k = lerp(0.22, 0.97, v), yy = lerp(top, y, k), half = lerp(sw, w, k);
    const xx = lerp(sx, x, k) + u * half + Math.sin(TT * tw + ph) * 9;
    const al = a * (far ? 0.1 : 0.42) * (0.5 + 0.5 * Math.sin(TT * tw * 1.9 + ph * 3)) * (1 - u * u) * Math.sin(Math.PI * v);
    if (al <= 0.004) continue;
    ctx.globalAlpha = al; ctx.beginPath(); ctx.arc(xx, yy, size * (far ? 3 : 1) / z, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// the contact shadow where something meets the floor
function keyShadow(x, y, rx, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, o.sq ?? 0.085);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, keyK(o.a ?? 0.85)); g.addColorStop(0.6, keyK((o.a ?? 0.85) * 0.5)); g.addColorStop(1, keyK(0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}
// the glossy floor: draw() again, mirrored about y = floorY, fading with depth. draw() must not draw text.
function keyReflect(floorY, draw, o = {}) {
  if (KEY_LITE || (o.a ?? 0.3) <= 0.003) return;
  const main = ctx, T = main.getTransform(), cv = main.canvas;
  if (!KEY_SCRATCH || KEY_SCRATCH.width !== cv.width || KEY_SCRATCH.height !== cv.height) { KEY_SCRATCH = document.createElement('canvas'); KEY_SCRATCH.width = cv.width; KEY_SCRATCH.height = cv.height; }
  const c2 = KEY_SCRATCH.getContext('2d'), spark = SPARK_AT, defer = DEFER;
  c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over'; c2.clearRect(0, 0, cv.width, cv.height);
  c2.setTransform(T); c2.translate(0, 2 * floorY); c2.scale(1, -1);
  ctx = c2; DEFER = null; KEY_LITE = true;
  try { draw(); } finally { ctx = main; DEFER = defer; SPARK_AT = spark; KEY_LITE = false; }
  c2.setTransform(T); c2.globalAlpha = 1; c2.globalCompositeOperation = 'destination-in';
  const depth = o.depth ?? 260, g = c2.createLinearGradient(0, floorY, 0, floorY + depth);
  g.addColorStop(0, keyK(o.a ?? 0.3)); g.addColorStop(0.45, keyK((o.a ?? 0.3) * 0.3)); g.addColorStop(1, keyK(0));
  c2.fillStyle = g; c2.fillRect(-W * 4, floorY - H * 4, W * 9, H * 9);
  c2.restore();
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(KEY_SCRATCH, 0, 0); main.restore();
}

// ---------------------------------------------------------------------
//  the lit product: any closed outline P (world coords)
// ---------------------------------------------------------------------
// the body alone (no shadow, no mirror image). See keyProduct for the options.
function keyBody(P, o = {}) {
  const fin = keyFin(o.finish), bb = o.bb ?? bbox(P), z = keyZ(), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  const lit = clamp(o.lit ?? 1), rim = clamp(o.rim ?? 1), sweep = o.sweep ?? 1, dx = 0.974, dy = 0.225;   // the key light travels along (dx, dy)
  const p0 = bb.x0 * dx + bb.y0 * dy, p1 = bb.x1 * dx + bb.y1 * dy, box = () => ctx.fillRect(bb.x0 - 4, bb.y0 - 4, w + 8, h + 8);
  ctx.save(); trace(P, true); ctx.clip();
  ctx.fillStyle = KEY.sil; box();
  if (lit > 0 && sweep > 0) {
    let g;
    if (o.shade === 'round') {                                          // a turned form: a cylinder's light runs across it
      g = ctx.createLinearGradient(bb.x0, 0, bb.x1, 0);
      g.addColorStop(0, fin.lo); g.addColorStop(0.2, fin.base); g.addColorStop(0.34, fin.hi); g.addColorStop(0.5, fin.base); g.addColorStop(0.86, fin.lo); g.addColorStop(1, keyMix(fin.lo, fin.base, 0.35));
    } else {                                                            // a flat or pillowed face: lit from the upper left
      g = ctx.createLinearGradient(bb.x0, bb.y0, bb.x0 + w * 0.62, bb.y1);
      g.addColorStop(0, fin.hi); g.addColorStop(0.4, fin.base); g.addColorStop(1, fin.lo);
    }
    ctx.globalAlpha = lit; ctx.fillStyle = g; box();
    g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);                   // the lamp is overhead: the top catches it, the underside falls off
    g.addColorStop(0, keyW(0.26)); g.addColorStop(0.42, keyW(0)); g.addColorStop(0.58, keyK(0)); g.addColorStop(1, keyK(0.55));
    ctx.fillStyle = g; box(); ctx.globalAlpha = 1;
    if (o.detail) o.detail(bb, fin, lit);                               // seams, lenses, rings: drawn inside the outline
    if (sweep < 1) {                                                    // the part the key light has not reached yet stays a silhouette
      const soft = o.soft ?? w * 0.4, p = lerp(p0, p1 + soft, clamp(sweep));
      g = ctx.createLinearGradient(dx * (p - soft), dy * (p - soft), dx * p, dy * p);
      g.addColorStop(0, keyA(KEY.sil, 0)); g.addColorStop(1, keyA(KEY.sil, 1)); ctx.fillStyle = g; box();
    }
    if (o.spec != null && o.spec > 0 && o.spec < 1) {                   // a specular band crossing the surface
      const bw = o.specW ?? w * 0.24, p = lerp(p0 - bw, p1 + bw, o.spec), al = (o.specA ?? 0.5) * lit;
      g = ctx.createLinearGradient(dx * (p - bw), dy * (p - bw), dx * (p + bw), dy * (p + bw));
      g.addColorStop(0, keyW(0)); g.addColorStop(0.42, keyW(al * 0.35)); g.addColorStop(0.5, keyW(al)); g.addColorStop(0.58, keyW(al * 0.35)); g.addColorStop(1, keyW(0));
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; box(); ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (rim > 0) {                                                        // the rim light: inside the outline, brightest on top (no halo outside)
    const rw = (o.rimW ?? KEY.rim) / z, g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1), g2 = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);
    g.addColorStop(0, keyW(0.2 * rim)); g.addColorStop(0.5, keyW(0.09 * rim)); g.addColorStop(1, keyW(0.04 * rim));
    g2.addColorStop(0, keyW(rim)); g2.addColorStop(0.45, keyW(0.62 * rim)); g2.addColorStop(1, keyW(0.3 * rim));
    ctx.lineJoin = 'round'; trace(P, true);
    ctx.strokeStyle = g; ctx.lineWidth = rw * 7; ctx.stroke();
    ctx.strokeStyle = g2; ctx.lineWidth = rw * 2; ctx.stroke();
  }
  ctx.restore();
  return bb;
}
// a lit product from an outline: contact shadow, mirror image in the floor, body gradient, key-light sweep, specular band, rim light.
// o: finish (name | hex | finish object), lit 0..1 (0 = silhouette), sweep 0..1 (how far the key light has crossed), soft,
//    spec 0..1 (where the specular band is; outside 0..1 = none), specW, specA, rim 0..1, rimW, shade 'flat' | 'round',
//    floor (world y; default the outline's lowest point), reflect (mirror alpha, 0 = none), depth, shadow (false = none),
//    detail(bb, fin, lit) (drawn clipped to the outline, under the rim)
function keyProduct(P, o = {}) {
  const bb = bbox(P), floor = o.floor ?? bb.y1 + 2, w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, oo = { ...o, bb };
  if (!KEY_LITE && o.shadow !== false) keyShadow((bb.x0 + bb.x1) / 2, floor, w * 0.62, { a: 0.9 });
  keyReflect(floor, () => keyBody(P, oo), { a: o.reflect ?? 0.34, depth: o.depth ?? h * 0.62 });
  keyBody(P, oo);
  return bb;
}

// ---- outlines (closed, world coords, centred on x, y)
const keySlabPts = (x, y, w, h, r = Math.min(w, h) * 0.16) => rrectPts(x - w / 2, y - h / 2, w, h, r, 10);
function keyCasePts(x, y, w, h, n = 3.4, m = 96) {                       // a pebble: a superellipse
  const P = []; for (let i = 0; i < m; i++) { const a = i / m * TAU, c = Math.cos(a), s = Math.sin(a); P.push([x + Math.sign(c) * Math.abs(c) ** (2 / n) * w / 2, y + Math.sign(s) * Math.abs(s) ** (2 / n) * h / 2]); }
  return P;
}
function keyCylPts(x, y, w, h, e = w * 0.13) {                           // an upright cylinder seen a little from above
  return [...arcPts(x, y - h / 2 + e, w / 2, Math.PI, TAU, 24, e / (w / 2)), ...arcPts(x, y + h / 2 - e, w / 2, 0, Math.PI, 24, e / (w / 2))];
}
const keyPuckPts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
const keyLine = (w, c) => { ctx.lineWidth = w / keyZ(); ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke(); };

// ---- ready-made, unbranded products (each returns its bbox; all take keyProduct's options)
// a pebble charging case: a lid seam, a thumb notch, one status light. o.led 0..1
function keyCase(x, y, w, h, o = {}) {
  return keyProduct(keyCasePts(x, y, w, h), { ...o, detail: (bb, fin, lit) => {
    const sy = y - h * 0.15, sag = h * 0.035, led = clamp(o.led ?? 0), lr = h * 0.02;
    ctx.globalAlpha = lit;
    ctx.beginPath(); ctx.moveTo(bb.x0, sy); ctx.quadraticCurveTo(x, sy + sag * 2, bb.x1, sy); keyLine(4, keyK(0.6));
    ctx.beginPath(); ctx.moveTo(bb.x0, sy + 4); ctx.quadraticCurveTo(x, sy + sag * 2 + 4, bb.x1, sy + 4); keyLine(2, keyA(fin.hi, 0.55));
    const ng = ctx.createLinearGradient(0, sy + sag - 8, 0, sy + sag + 22); ng.addColorStop(0, keyK(0.55)); ng.addColorStop(1, keyK(0));
    ctx.fillStyle = ng; ctx.beginPath(); ctx.ellipse(x, sy + sag + 4, w * 0.085, 18, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = keyK(0.6); ctx.beginPath(); ctx.arc(x, y + h * 0.13, lr * 1.5, 0, TAU); ctx.fill();
    if (led > 0) { ctx.globalAlpha = lit * led; const lg = ctx.createRadialGradient(x, y + h * 0.13, 0, x, y + h * 0.13, lr * 5); lg.addColorStop(0, keyW(0.5)); lg.addColorStop(1, keyW(0)); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y + h * 0.13, lr * 5, 0, TAU); ctx.fill(); ctx.fillStyle = KEY.white; ctx.beginPath(); ctx.arc(x, y + h * 0.13, lr, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  } });
}
// a smart-speaker cylinder: a fabric wrap of fine dots, a top cap with a light ring. o.led 0..1
function keySpeaker(x, y, w, h, o = {}) {
  const e = w * 0.13;
  return keyProduct(keyCylPts(x, y, w, h, e), { shade: 'round', ...o, detail: (bb, fin, lit) => {
    const ty = y - h / 2 + e, rows = Math.max(6, Math.round(h / 26)), cols = 17, led = clamp(o.led ?? 0);
    ctx.globalAlpha = lit; ctx.fillStyle = keyK(0.42);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {      // the fabric: dots that crowd toward the edges of the turn
      const a = lerp(-1.36, 1.36, (i + (j % 2) * 0.5) / (cols - 0.5)), dxx = Math.sin(a) * w / 2, yy = ty + e * 1.7 + j * (h - e * 3.6) / (rows - 1) + Math.cos(a) * e * 0.9;
      ctx.beginPath(); ctx.ellipse(x + dxx, yy, 4.6 * Math.cos(a), 4.6, 0, 0, TAU); ctx.fill();
    }
    const cg = ctx.createLinearGradient(bb.x0, 0, bb.x1, 0); cg.addColorStop(0, fin.base); cg.addColorStop(0.4, fin.hi); cg.addColorStop(1, fin.base);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(x, ty, w / 2, e, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, ty, w / 2, e, 0, 0, TAU); keyLine(2, keyK(0.45));
    ctx.beginPath(); ctx.ellipse(x, ty, w * 0.33, e * 0.66, 0, 0, TAU); keyLine(5, keyK(0.5));
    if (led > 0) { ctx.globalAlpha = lit * led; ctx.beginPath(); ctx.ellipse(x, ty, w * 0.33, e * 0.66, 0, 0, TAU); keyLine(3, KEY.white); }
    ctx.globalAlpha = 1;
  } });
}
// a rounded slab device seen from the back: one round lens, a thin band
function keySlab(x, y, w, h, o = {}) {
  return keyProduct(keySlabPts(x, y, w, h, o.r), { ...o, detail: (bb, fin, lit) => {
    const lx = x, ly = bb.y0 + w * 0.34, lr = w * 0.15;
    ctx.globalAlpha = lit;
    const lg = ctx.createRadialGradient(lx - lr * 0.3, ly - lr * 0.3, lr * 0.1, lx, ly, lr); lg.addColorStop(0, '#2a2a33'); lg.addColorStop(1, '#040406');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); keyLine(4, keyA(fin.hi, 0.8));
    ctx.beginPath(); ctx.arc(lx, ly, lr * 0.5, 0, TAU); keyLine(2, keyW(0.16));
    ctx.fillStyle = keyW(0.7); ctx.beginPath(); ctx.arc(lx - lr * 0.34, ly - lr * 0.36, lr * 0.09, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bb.x0, bb.y1 - h * 0.1); ctx.lineTo(bb.x1, bb.y1 - h * 0.1); keyLine(2, keyK(0.4));
    ctx.globalAlpha = 1;
  } });
}
// the hero: a watch-like puck. A bezel, a dark glass face with hour ticks and a charge ring (o.ring 0..1) that breathes.
// Sets SPARK_AT. o: ring, key, plus keyProduct's options
function keyPuck(x, y, r, o = {}) {
  if (!KEY_LITE) SPARK_AT = toScreen(x, y);
  const ring = clamp(o.ring ?? 0.75), pulse = 0.82 + 0.18 * Math.sin(TT * TAU * 0.5 + (o.key ?? 'puck').length);
  return keyProduct(keyPuckPts(x, y, r), { ...o, detail: (bb, fin, lit) => {
    ctx.globalAlpha = lit;
    ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, TAU); keyLine(3, keyK(0.55));
    ctx.beginPath(); ctx.arc(x, y + 2, r * 0.86, 0, TAU); keyLine(1.5, keyA(fin.hi, 0.6));
    const fg = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.05, x, y, r * 0.82); fg.addColorStop(0, '#1d1d24'); fg.addColorStop(1, '#060608');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, c = Math.cos(a), s = Math.sin(a); ctx.beginPath(); ctx.moveTo(x + c * r * 0.7, y + s * r * 0.7); ctx.lineTo(x + c * r * (i % 3 ? 0.735 : 0.76), y + s * r * (i % 3 ? 0.735 : 0.76)); keyLine(i % 3 ? 2 : 3, keyW(i % 3 ? 0.22 : 0.5)); }
    ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    ctx.strokeStyle = keyW(0.09); ctx.beginPath(); ctx.arc(x, y, r * 0.56, 0, TAU); ctx.stroke();
    if (ring > 0.004) { ctx.strokeStyle = keyA(fin.hi, pulse); ctx.beginPath(); ctx.arc(x, y, r * 0.56, -Math.PI / 2, -Math.PI / 2 + ring * TAU); ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.clip();                                  // the glass catches the lamp
    const gg = ctx.createLinearGradient(x - r, y - r, x + r * 0.2, y + r * 0.4); gg.addColorStop(0, keyW(0.2)); gg.addColorStop(0.5, keyW(0.03)); gg.addColorStop(0.51, keyW(0));
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x - r * 0.55, y - r * 0.75, r * 1.1, 0, TAU); ctx.fill(); ctx.restore();
    ctx.globalAlpha = 1;
  } });
}

// ---------------------------------------------------------------------
//  type: clean sans, thin for numerals, semibold for words, tracked caps for labels. Never a glow, never an outline.
// ---------------------------------------------------------------------
// one line. o: weight, color, track (em), align, a, and for a fade-in: at (seconds), dur, rise (px it settles through)
function keyType(str, x, y, size, o = {}) {
  const u = o.at != null ? seg(TT, o.at, o.at + (o.dur ?? 0.45)) : 1, al = clamp(o.a ?? 1) * EZ.io(u);
  ctx.save(); ctx.font = `${o.weight ?? 400} ${size}px ${KEY_SANS}`;
  const tr = (o.track ?? 0) * size, hasLS = 'letterSpacing' in ctx; if (hasLS) ctx.letterSpacing = tr.toFixed(2) + 'px';
  const w = ctx.measureText(str).width - (hasLS ? tr : 0), align = o.align ?? 'left';
  if (al > 0.004) {
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.color ?? KEY.white; ctx.globalAlpha = al;
    ctx.fillText(str, x + (hasLS ? (align === 'center' ? tr / 2 : align === 'right' ? tr : 0) : 0), y + (o.rise ?? size * 0.16) * (1 - EZ.o3(u)));
  }
  ctx.restore(); return w;
}
// a spec: a very large thin numeral that counts up and settles, its unit, a hairline and a small caps label (world coords; y = the numeral's baseline).
// keySpec(48, 'h', 'battery life', x, y, { at, dur, dec, size, align, pre, weight, a }) -> { x0, x1, y0, y1, mid, done }
function keySpec(value, unit, label, x, y, o = {}) {
  const at = o.at ?? E0 + 0.4, dur = o.dur ?? 0.75, size = o.size ?? 120, dec = o.dec ?? 0, weight = o.weight ?? 200, z = keyZ();
  const u = seg(TT, at, at + dur), al = clamp(o.a ?? 1) * EZ.io(seg(TT, at, at + 0.3)), us = size * 0.4, gap = unit ? size * 0.07 : 0;
  const fin = (o.pre ?? '') + Number(value).toFixed(dec), txt = (o.pre ?? '') + (value * EZ.io(u)).toFixed(dec);
  ctx.save(); ctx.font = `${weight} ${size}px ${KEY_SANS}`; const wN = ctx.measureText(fin).width; ctx.font = `500 ${us}px ${KEY_SANS}`; const wU = unit ? ctx.measureText(unit).width : 0; ctx.restore();
  const total = wN + gap + wU, x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x, box = { x0, x1: x0 + total, y0: y - size * 0.74, y1: y + size * 0.5, mid: y - size * 0.36, done: u >= 1 };
  if (al <= 0.004) return box;
  const rise = size * 0.1 * (1 - EZ.o3(seg(TT, at, at + 0.5)));
  keyType(txt, x0 + wN, y + rise, size, { weight, align: 'right', a: al });                       // right-aligned: the unit never jitters
  if (unit) keyType(unit, x0 + wN + gap, y + rise, us, { weight: 500, a: al });
  const rl = total * keyIn(at + 0.1, 0.6);
  if (rl > 0) { ctx.save(); ctx.globalAlpha = clamp(o.a ?? 1); ctx.fillStyle = KEY.g3; ctx.fillRect(x0, y + size * 0.17, rl, KEY.hair / z); ctx.restore(); }
  if (label) keyType(String(label).toUpperCase(), x0, y + size * 0.17 + Math.max(24, size * 0.21) * 1.5, o.lsize ?? Math.max(24, size * 0.21), { weight: 500, color: KEY.g5, track: 0.16, a: clamp(o.a ?? 1), at: at + 0.25, dur: 0.4, rise: 0 });
  return box;
}
// a hairline leader from a point on the product (x0, y0) to a label anchor (x1, y1): a 45-degree leg, then level. It draws on.
// o: at, dur, elbow (x of the bend), a, color
function keyLeader(x0, y0, x1, y1, o = {}) {
  const f = keyIn(o.at ?? E0 + 0.3, o.dur ?? 0.45), al = clamp(o.a ?? 1); if (f <= 0 || al <= 0.004) return;
  const z = keyZ(), ex = o.elbow ?? x0 + Math.sign(x1 - x0) * Math.min(Math.abs(x1 - x0), Math.abs(y1 - y0)), Q = subPath([[x0, y0], [ex, y1], [x1, y1]], f), k = clamp(f * 4);
  ctx.save(); ctx.globalAlpha = al; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  ctx.beginPath(); Q.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.lineWidth = KEY.hair / z; ctx.strokeStyle = o.color ?? keyA(KEY.g5, 0.9); ctx.stroke();
  ctx.fillStyle = keyK(0.5); ctx.beginPath(); ctx.arc(x0, y0, 9 * k / z, 0, TAU); ctx.fill();            // where it touches the product
  ctx.fillStyle = KEY.white; ctx.beginPath(); ctx.arc(x0, y0, 4.5 * k / z, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x0, y0, 12 * k / z, 0, TAU); ctx.lineWidth = 1.5 / z; ctx.strokeStyle = keyW(0.5); ctx.stroke();
  if (f >= 1) { ctx.fillStyle = KEY.g5; ctx.fillRect(x1 - 1 / z, y1 - 9 / z, KEY.hair / z, 18 / z); }     // a small stop at the label end
  ctx.restore();
}

// ---- screen-space type, through DEFER (after the camera, at screen size); all of it steps aside for a bridge
const keyDefer = (f) => { if (DEFER) DEFER.push(f); else f(); };
// a small caps kicker above a big headline; the headline may be an array of lines, which arrive one at a time.
// o: x, y (first headline baseline), size, align, at (seconds into the era), weight
function keyHeadline(kicker, head, o = {}) {
  keyDefer(() => {
    const k = keyBridgeK(); if (k <= 0) return;
    const at = E0 + (o.at ?? 0.4), x = o.x ?? CX, y = o.y ?? 492, size = o.size ?? 92, align = o.align ?? 'center';
    if (kicker) keyType(String(kicker).toUpperCase(), x, y - size * 1.12, o.ksize ?? Math.max(26, size * 0.31), { weight: 600, color: KEY.g5, track: 0.24, align, a: k, at, rise: 10 });
    [].concat(head).forEach((line, i) => keyType(line, x, y + i * size * 1.12, size, { weight: o.weight ?? 600, align, a: k, at: at + 0.2 + i * 0.2, dur: 0.55, rise: size * 0.2 }));
  });
}
// one short caption line near the bottom; words inside *...* are set semibold white, the rest light grey. Words arrive one at a time.
function keyCaption(str, o = {}) {
  keyDefer(() => {
    const k = keyBridgeK(); if (k <= 0) return;
    const at = E0 + (o.at ?? 0.5), size = o.size ?? 54, y = o.y ?? (H > W * 1.2 ? 1440 : H - 120), cx = o.x ?? CX;
    const words = []; String(str).split('*').forEach((part, i) => part.split(/\s+/).filter(Boolean).forEach((wd) => words.push({ s: wd, hi: i % 2 === 1 })));
    ctx.save(); const sp = size * 0.27, ws = words.map((wd) => { ctx.font = `${wd.hi ? 600 : 300} ${size}px ${KEY_SANS}`; return ctx.measureText(wd.s).width; }); ctx.restore();
    let x = cx - (ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1)) / 2;
    words.forEach((wd, i) => { keyType(wd.s, x, y, size, { weight: wd.hi ? 600 : 300, color: wd.hi ? KEY.white : KEY.soft, a: k, at: at + i * 0.09, dur: 0.4, rise: 12 }); x += ws[i] + sp; });
  });
}
// a small chapter mark, top left: a short hairline and tracked caps
function keyTag(str, o = {}) {
  keyDefer(() => {
    const k = keyBridgeK() * keyIn(E0 + (o.at ?? 0.15), 0.4); if (k <= 0.004) return;
    const x = o.x ?? 70, y = o.y ?? (H > W * 1.2 ? 296 : 84), size = o.size ?? 26;
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = KEY.g4; ctx.fillRect(x, y - size * 0.36, 44 * k, KEY.hair); ctx.restore();
    keyType(String(str).toUpperCase(), x + 60, y, size, { weight: 500, color: KEY.g5, track: 0.2, a: k });
  });
}
// dither: a fine fixed grain, so the near-black gradients do not band in the video
function keyGrain(al = KEY.grain) {
  if (al <= 0) return;
  if (!KEY_GRAIN) {
    const n = 256, R = RNG('keygrain'); KEY_GRAIN = document.createElement('canvas'); KEY_GRAIN.width = KEY_GRAIN.height = n;
    const g = KEY_GRAIN.getContext('2d'), img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = Math.floor(R.f() * 256); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
  }
  const ox = 0, oy = 0;                                                  // held still: moving grain multiplies the video's size several times
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = al; ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = false;
  for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(KEY_GRAIN, x, y);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks. Bridge colours are finish base colours (6-digit hex); mid-morph the blend arrives as rgb().
// =====================================================================
const STYLE = {
  name: 'keynote',
  paper: KEY.ground,                                                     // the empty stage
  backdrop(c) { fillAll(c); keyVignette(0.5); },                         // the house lights are down
  window(P, key, src) {                                                  // the scene through the product's outline, edged with its rim light
    const bb = bbox(P), g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1), far = bb.y1 - bb.y0 > H * 2.4;
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0);
    if (!far) { g.addColorStop(0, keyW(0.95)); g.addColorStop(0.5, keyW(0.55)); g.addColorStop(1, keyW(0.25)); trace(P, true); ctx.lineJoin = 'round'; ctx.lineWidth = KEY.rim * 2; ctx.strokeStyle = g; ctx.stroke(); }
    ctx.restore();
  },
  blob(P, c, key, u = 0) {                                               // the product itself changes shape, fully lit, while a specular band crosses it
    keyBody(P, { finish: c, lit: 1, rim: 1, spec: 0.12 + 0.76 * clamp(u), specA: 0.45 });
  },
  hero(x, y, r, o = {}) { keyPuck(x, y, r * 0.9, { key: o.key, ring: 0.75, reflect: 0, shadow: false }); },   // r = half the hero's size
  heroColor: KEY.fin.titanium.base,                                      // a piece on another finish sets STYLE.heroColor = KEY.fin.<name>.base
  heroPts(x, y, r) { return keyPuckPts(x, y, r * 0.9); },
  post() { keyGrain(); },
  ones: true,                                                            // slow and confident: on 1s
};
