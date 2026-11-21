// =====================================================================
//  styles/aurora/kit.js — AURORA: the grainy gradient-mesh brand film (a launch-page hero in motion).
//  The gradient itself is the picture. A deep ground carries a mesh of 4-6 huge blurred colour fields that drift
//  and turn; aurora ribbons (soft curtain bands with vertical rays) bend across it; a visible film grain lies over
//  everything. The only objects are soft 3D gradient orbs and rings with a grainy terminator; the only structure is
//  1.5px hairline circles, arcs and tiny plus marks; the only type is very large, tight, clean sans in white (ink on
//  the light preset), with one word filled by the gradient. No panels, no cards, no UI widgets, no outlines.
//  Built on kit/core.js. Helpers are prefixed aur…; the palette is AUR. Needs from the piece head: CX.
//
//  Cheap and deterministic: the mesh and the ribbons are drawn small on scratch canvases (1/6 and 1/3 size) and
//  scaled up smoothly; no ctx.filter, no shadowBlur. The grain is three seeded tiles that take turns, one per boil step (B): a short cycle a video encoder can reuse.
//  Optional piece constant: AUR_ERAS = [{ preset: 'dusk', key, fields, ... }, ...] (one aurMesh spec per era): scenes
//  call aurMesh(AUR_ERAS[i]) and the morph's blank sheet is then the two eras' own meshes, dimmed and cross-faded.
// =====================================================================
const AUR = {
  presets: {
    // violet / magenta / orange on navy
    dusk: { ground: '#0b0b2a', deep: '#05051a', cols: ['#6d3bff', '#e0409a', '#ff7a3d', '#3147e8', '#ff5470'], grad: ['#ffd0a1', '#ff8ac6', '#b9a6ff'], ink: '#ffffff', sub: '#d6d2f5', light: false },
    // teal / lime / sky on near-black
    mint: { ground: '#06131a', deep: '#02070b', cols: ['#10c8a6', '#b4ef3a', '#2f9dff', '#0c7c92', '#62f0c6'], grad: ['#e2ff9a', '#7df5d3', '#9ad4ff'], ink: '#ffffff', sub: '#cfeee8', light: false },
    // peach / rose / lilac on off-white (the light variant: ink type, fields laid on normally instead of screened)
    dawn: { ground: '#f6f0e9', deep: '#e9dfd6', cols: ['#ffab82', '#ff86ad', '#b49cff', '#ffd08f', '#8cc2ff'], grad: ['#ff6a3a', '#ee3f8c', '#7350ee'], ink: '#15142e', sub: '#4f4b6b', light: true },
  },
  paper: '#07081c',                 // the blank sheet a morph happens on
  hero: '#ff8a5c',                  // the hero orb
  res: 6, soft: 3, margin: 180,     // mesh at 1/6, ribbons at 1/3; both cover the world plus a margin (camera pushes)
  grain: 0.08, grainPx: 2, grainN: 3,   // film grain: strength (alpha of a +-1 noise tile), the size of one grain in px, how many placements it cycles through
};
const AUR_SANS = 'system-ui, -apple-system, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "DejaVu Sans", sans-serif';
let AUR_CUR = AUR.presets.dusk;     // the preset of the era being drawn: set by aurMesh, read as the default by the other helpers
const aurPreset = (p) => (p && typeof p === 'object' ? (p.ground ? p : AUR.presets[p.preset] || AUR_CUR) : AUR.presets[p] || AUR_CUR);

// ---------------------------------------------------------------------
//  colour
// ---------------------------------------------------------------------
function aurRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const aurA = (c, a) => { const [r, g, b] = aurRGB(c); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(a).toFixed(4)})`; };
const aurMix = (a, b, u) => { const x = aurRGB(a), y = aurRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const aurHex = (c) => '#' + aurRGB(c).map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
// a colour along a list of colours, s = 0..1
function aurMixN(cols, s) { const t = clamp(s) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(t)); return cols.length < 2 ? cols[0] : aurMix(cols[i], cols[i + 1], t - i); }
// turn the hue by dh degrees and move the lightness by dl (-1..1): the shade and bounce colours of an orb come from its one colour
function aurShift(c, dh = 0, dl = 0, ds = 0) {
  let [r, g, b] = aurRGB(c).map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0, l = (mx + mn) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = mod(h * 60 + dh, 360); l = clamp(l + dl); s = clamp(s + ds);
  const k = (1 - Math.abs(2 * l - 1)) * s, x = k * (1 - Math.abs((h / 60) % 2 - 1)), m = l - k / 2, q = h < 60 ? [k, x, 0] : h < 120 ? [x, k, 0] : h < 180 ? [0, k, x] : h < 240 ? [0, x, k] : h < 300 ? [x, 0, k] : [k, 0, x];
  return `rgb(${q.map((v) => Math.round((v + m) * 255)).join(',')})`;
}

// ---------------------------------------------------------------------
//  plumbing: scratch canvases, paths, timing
// ---------------------------------------------------------------------
const AUR_CV = {};
function aurCv(name, w, h) { let c = AUR_CV[name]; if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; c.g = c.getContext('2d'); AUR_CV[name] = c; } return c; }
const aurZoom = () => Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;
const aurCen = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
function aurPath(P, closed = true) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }
function aurSmooth(P, it = 3) {   // round an open path (Chaikin), keeping its ends
  for (let k = 0; k < it; k++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]); } Q.push(P[P.length - 1]); P = Q; }
  return P;
}
const aurSafe = () => (H > W * 1.2 ? { x0: 60, y0: 250, x1: 940, y1: 1500 } : { x0: 48, y0: 48, x1: W - 48, y1: H - 48 });
// 1 outside bridges, 0 inside one (0.2s ramps): screen-size type hides while the world is seen through a window
function aurBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  let k = 1; for (const r of BRIDGES) k = Math.min(k, clamp((Math.abs(TT - r.tc) - (r.d ?? 0.6)) / 0.2));
  return k;
}
// 0..1 progress of something that starts at t0 and takes d seconds (nothing snaps in this look)
const aurIn = (t0, d = 0.8) => EZ.io(seg(TT, t0, t0 + d));
// a value that rises from a to b on a soft, heavy spring from time t0 (orbs rise and settle)
const aurRise = (t0, a, b, p = { k: 46, d: 11 }) => a + (b - a) * springEase(TT - t0, p.k, p.d);
// a slow idle drift for anything that floats: [dx, dy]
function aurFloat(key, amp = 12, sp = 1) { const R = RNG('aurfloat', key), a = R.r(0, TAU), b = R.r(0, TAU); return [Math.sin(TT * 0.7 * sp + a) * amp * 0.6, Math.sin(TT * 1.1 * sp + b) * amp]; }
// run fn on a small scratch canvas that covers the world (plus the margin), then lay it back scaled up: everything fn
// draws comes back soft. o: mode (composite), a
function aurSoft(name, res, fn, o = {}) {
  const M = AUR.margin, lw = Math.ceil((W + 2 * M) / res), lh = Math.ceil((H + 2 * M) / res), cv = aurCv(name, lw, lh), g = cv.g, saved = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, lw, lh);
  g.setTransform(1 / res, 0, 0, 1 / res, M / res, M / res);
  ctx = g; try { fn(); } finally { ctx = saved; }
  ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.globalCompositeOperation = o.mode ?? 'source-over'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cv, -M, -M, lw * res, lh * res); ctx.restore();
}

// ---------------------------------------------------------------------
//  the mesh: the ground and its drifting colour fields. Call it first in every scene.
// ---------------------------------------------------------------------
// default fields for a preset: one per colour plus one, on a loose ring round the frame so the middle stays deep
function aurFields(p, key, n) {
  const R = RNG('aurfield', key), out = []; n = n ?? p.cols.length + 1;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + R.n(0.5), d = R.r(0.3, 0.62); out.push({ x: W / 2 + Math.cos(a) * W * d, y: H / 2 + Math.sin(a) * H * d * 0.9, r: R.r(0.5, 0.8) * W, c: i % p.cols.length, a: R.r(0.55, 0.85) }); }
  return out;
}
// aurMesh('dusk', o) or aurMesh({ preset: 'dusk', ...o }). o: key, fields ([{ x, y, r, c (index or colour), a, sx }] in
// world units: where the colour sits), drift (px), speed, turn (rad/s the whole mesh turns), folds (silk shadows),
// dim (0..1 toward the ground), vig (corner darkening), a (alpha of the whole mesh), set (false = leave AUR_CUR alone)
function aurMesh(preset, o = {}) {
  if (preset && typeof preset === 'object' && !preset.ground) o = { ...preset, ...o };
  const p = aurPreset(preset); if (o.set !== false) AUR_CUR = p;
  const key = o.key ?? 'mesh', res = o.res ?? AUR.res, M = AUR.margin, lw = Math.ceil((W + 2 * M) / res), lh = Math.ceil((H + 2 * M) / res), cv = aurCv('mesh', lw, lh), g = cv.g;
  const sp = o.speed ?? 1, drift = o.drift ?? 120, turn = (o.turn ?? 0.035) * TT, ct = Math.cos(turn), st = Math.sin(turn);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const bg = g.createLinearGradient(0, 0, lw * 0.3, lh); bg.addColorStop(0, p.light ? p.ground : p.deep); bg.addColorStop(0.55, p.ground); bg.addColorStop(1, p.light ? p.deep : p.ground);
  g.fillStyle = bg; g.fillRect(0, 0, lw, lh);
  g.setTransform(1 / res, 0, 0, 1 / res, M / res, M / res);
  g.globalCompositeOperation = p.light ? 'source-over' : 'screen';
  (o.fields ?? aurFields(p, key, o.n)).forEach((f, i) => {
    const R = RNG('aurf', key, i), ph = R.r(0, TAU), fq = R.r(0.45, 0.8) * sp, rot0 = R.r(-0.8, 0.8), sx = f.sx ?? R.r(1.05, 1.5), dir = R.f() < 0.5 ? -1 : 1;
    const c = typeof f.c === 'number' ? p.cols[f.c % p.cols.length] : f.c ?? p.cols[i % p.cols.length], al = f.a ?? 0.7, rad = f.r * (1 + 0.07 * Math.sin(TT * fq * 0.9 + ph * 2));
    const ax = f.x - W / 2, ay = f.y - H / 2;   // the whole mesh turns slowly round the middle of the frame
    const x = W / 2 + ax * ct - ay * st + Math.sin(TT * fq + ph) * drift, y = H / 2 + ax * st + ay * ct + Math.cos(TT * fq * 0.8 + ph * 1.7) * drift * 0.75;
    g.save(); g.translate(x, y); g.rotate(rot0 + dir * TT * 0.11 * sp); g.scale(sx, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad); gr.addColorStop(0, aurA(c, al)); gr.addColorStop(0.3, aurA(c, al * 0.7)); gr.addColorStop(0.6, aurA(c, al * 0.26)); gr.addColorStop(0.82, aurA(c, al * 0.06)); gr.addColorStop(1, aurA(c, 0));
    g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2); g.restore();
  });
  // silk folds: wide soft bands of the ground laid across the colour, drifting: they give the mesh its depth
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < (o.folds ?? 2); i++) {
    const R = RNG('aurfold', key, i), ang = R.r(-0.9, -0.3) + Math.sin(TT * 0.21 * sp + i) * 0.12, wd = R.r(300, 520), off = R.r(-0.3, 0.3) * H + Math.sin(TT * 0.33 * sp + R.r(0, TAU)) * 170;
    g.save(); g.translate(W / 2, H / 2 + off); g.rotate(ang);
    const fg = g.createLinearGradient(0, -wd, 0, wd), fa = (o.fold ?? 0.3) * (p.light ? 0.75 : 1); fg.addColorStop(0, aurA(p.ground, 0)); fg.addColorStop(0.5, aurA(p.light ? '#ffffff' : p.deep, fa)); fg.addColorStop(1, aurA(p.ground, 0));
    g.fillStyle = fg; g.fillRect(-W * 2, -wd, W * 4, wd * 2); g.restore();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if ((o.vig ?? (p.light ? 0 : 0.5)) > 0) { const vg = g.createRadialGradient(lw / 2, lh / 2, lh * 0.3, lw / 2, lh / 2, lh * 0.72); vg.addColorStop(0, aurA(p.deep, 0)); vg.addColorStop(1, aurA(p.deep, o.vig ?? 0.5)); g.fillStyle = vg; g.fillRect(0, 0, lw, lh); }
  if (o.dim) { g.fillStyle = aurA(o.dimTo ?? p.deep, o.dim); g.fillRect(0, 0, lw, lh); }
  ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cv, -M, -M, lw * res, lh * res); ctx.restore();
}
// a soft pool of light (or, with o.shade, of the ground: a quiet place for type). o: ry, a, shade, mode
function aurGlow(x, y, r, c, o = {}) {
  const p = aurPreset(o.preset), a = o.a ?? 0.5; if (r <= 0 || a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, (o.ry ?? r) / r); ctx.globalCompositeOperation = o.mode ?? (o.shade || p.light ? 'source-over' : 'screen');
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, aurA(c, a)); g.addColorStop(0.4, aurA(c, a * 0.62)); g.addColorStop(0.75, aurA(c, a * 0.16)); g.addColorStop(1, aurA(c, 0));
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
}
const aurShade = (x, y, rx, ry, a = 0.4, o = {}) => aurGlow(x, y, rx, aurPreset(o.preset).light ? aurPreset(o.preset).ground : aurPreset(o.preset).deep, { ...o, ry, a, shade: true });

// ---------------------------------------------------------------------
//  ribbons: an aurora curtain along an open path. A bright hem on the path, rays that fade away from it, vertical
//  striation that crawls sideways, the whole band undulating like silk. Drawn at 1/3 size, so it is always soft.
//  o: h (ray length), dir (-1 rays go up, 1 down), cols (along the ribbon), a, amp (undulation px), speed, key,
//     frac (0..1: unrolls from its first point), fine (0..1: how strong the striation is)
// ---------------------------------------------------------------------
function aurRibbon(P, o = {}) {
  const p = aurPreset(o.preset), cols = o.cols ?? [p.cols[0], p.cols[1], p.cols[2]], h = o.h ?? 440, dir = o.dir ?? -1, a = o.a ?? 0.7, amp = o.amp ?? 44, sp = o.speed ?? 1, key = o.key ?? 'rib';
  const frac = clamp(o.frac ?? 1), fine = o.fine ?? 0.7, step = 6; if (frac <= 0 || a <= 0) return;
  const Q = resample(aurSmooth(P), false, step), n = Q.length, R0 = RNG('aurrib', key), p1 = R0.r(0, TAU), p2 = R0.r(0, TAU), p3 = R0.r(0, TAU), p4 = R0.r(0, TAU);
  const N = RNG('aurribn', key), col = []; for (let i = 0; i < 400; i++) col.push(N.f());   // one fixed brightness per ray
  aurSoft('soft', AUR.soft, () => {
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1), front = clamp((frac * 1.15 - s) / 0.15); if (front <= 0) break;
      const wave = amp * (0.62 * Math.sin(s * 5.1 + TT * 0.95 * sp + p1) + 0.38 * Math.sin(s * 12.3 - TT * 0.6 * sp + p2));
      const x = Q[i][0], y = Q[i][1] + wave, cr = col[Math.floor(mod(i + TT * 3.3 * sp, 400))];
      const stri = 1 - fine + fine * (0.25 + 0.75 * cr) * (0.55 + 0.45 * Math.sin(s * 47 + TT * 0.8 * sp + p3));
      const hh = h * (0.72 + 0.28 * Math.sin(s * 8.3 + TT * 0.5 * sp + p4)) * (0.8 + 0.2 * cr), end = Math.sin(Math.PI * s) ** 0.55;
      const al = a * stri * end * front, c = aurMixN(cols, s), g = ctx.createLinearGradient(0, y - dir * hh * 0.1, 0, y + dir * hh);
      g.addColorStop(0, aurA(c, 0)); g.addColorStop(0.09, aurA(aurMix(c, '#ffffff', p.light ? 0 : 0.35), al)); g.addColorStop(0.2, aurA(c, al * 0.74)); g.addColorStop(0.55, aurA(c, al * 0.28)); g.addColorStop(1, aurA(c, 0));
      ctx.fillStyle = g; ctx.fillRect(x - step / 2, Math.min(y - dir * hh * 0.1, y + dir * hh), step + 0.6, hh * 1.1);
    }
  }, { mode: p.light ? 'source-over' : 'screen' });
}

// ---------------------------------------------------------------------
//  objects: orbs and rings. A body is any closed outline shaded as one soft form: lit from the upper left, a shade
//  that turns in hue (not just darker), a bounce light on the far limb, grain along the terminator, a glow behind.
//  o: c (its one colour) or cols [light, mid, shade]; rim (bounce colour); light (angle to the light); glow; a; key
// ---------------------------------------------------------------------
function aurBody(P, o = {}) {
  const p = aurPreset(o.preset), bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, r = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2, al = o.a ?? 1; if (r < 1 || al <= 0) return;
  const base = o.c ?? p.cols[2], [hi, mid, lo] = o.cols ?? [aurMix(base, '#ffffff', 0.42), base, aurShift(base, o.shift ?? -52, -0.17)];
  const rim = o.rim ?? aurShift(base, 165, 0.04), deep = o.deep ?? (p.light ? aurShift(base, -70, -0.1) : AUR.paper), la = o.light ?? -2.25, lc = Math.cos(la), ls = Math.sin(la), lx = cx + lc * r * 0.42, ly = cy + ls * r * 0.42;
  const glow = o.glow ?? 0.42; if (glow > 0) aurGlow(cx, cy, r * 2.3, mid, { a: glow * al, preset: p });
  ctx.save(); ctx.globalAlpha = al; aurPath(P);
  const g = ctx.createRadialGradient(lx, ly, r * 0.04, cx - lc * r * 0.14, cy - ls * r * 0.14, r * 1.42);
  g.addColorStop(0, aurMix(hi, '#ffffff', 0.5)); g.addColorStop(0.18, hi); g.addColorStop(0.48, mid); g.addColorStop(0.8, lo); g.addColorStop(1, aurMix(lo, deep, 0.72));
  ctx.fillStyle = g; ctx.fill(); ctx.clip();
  const bx = cx - lc * r * 1.0, by = cy - ls * r * 1.0, bg = ctx.createRadialGradient(bx, by, 0, bx, by, r * 0.92);   // the bounce: the mesh lights the far limb
  bg.addColorStop(0, aurA(rim, 0.62)); bg.addColorStop(0.5, aurA(rim, 0.2)); bg.addColorStop(1, aurA(rim, 0));
  ctx.globalCompositeOperation = p.light ? 'source-over' : 'screen'; ctx.fillStyle = bg; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  ctx.globalCompositeOperation = 'source-over';
  // the grainy terminator: specks where light turns to shade, fixed to the body (they travel with it)
  const R = RNG('aurterm', o.key ?? 'orb'), n = Math.round(clamp(r * r * 0.11, 200, 6000)), sz = Math.max(1.3, r / 150), dk = aurA(deep, 0.36), lt = aurA(hi, 0.24);
  for (let i = 0; i < n; i++) {
    const ux = R.n(1), uy = R.n(1), keep = R.f(), big = R.f(), d = ux * lc + uy * ls, w = Math.exp(-(((d + 0.36) / 0.3) ** 2));
    if (keep > w) continue; const s = sz * (0.7 + 0.6 * big);
    ctx.fillStyle = (i & 1) ? dk : lt; ctx.fillRect(cx + ux * r - s / 2, cy + uy * r - s / 2, s, s);
  }
  const sg = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.55); sg.addColorStop(0, 'rgba(255,255,255,0.4)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = p.light ? 'source-over' : 'screen'; ctx.fillStyle = sg; ctx.fillRect(lx - r * 0.55, ly - r * 0.55, r * 1.1, r * 1.1);
  ctx.restore();
}
const aurOrbPts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
function aurOrb(x, y, r, o = {}) { if (r > 0.5) aurBody(aurOrbPts(x, y, r), o); }
// a flat gradient ring (an annulus seen at a tilt): a conic sweep of the colours that turns, a shaded inner edge and a
// lit outer one. o: w (band width), tilt (0..1: ry / rx), rot, cols, spin (rad), a, half ('back' | 'front': draw one
// half, so an orb can sit inside it: back half, orb, front half), glow
function aurRing(x, y, r, o = {}) {
  const p = aurPreset(o.preset), w = o.w ?? r * 0.12, tilt = o.tilt ?? 1, al = o.a ?? 1, cols = o.cols ?? [p.cols[0], p.cols[1], p.cols[2]], spin = o.spin ?? TT * 0.5; if (r <= 1 || al <= 0) return;
  const [a0, a1] = o.half === 'back' ? [Math.PI, TAU] : o.half === 'front' ? [0, Math.PI] : [0, TAU], arc = (rr) => { ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, rr), a0, a1); ctx.stroke(); };
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(1, tilt); ctx.lineCap = 'butt';
  let g;
  if (ctx.createConicGradient) { g = ctx.createConicGradient(spin, 0, 0); cols.forEach((c, i) => g.addColorStop(i / cols.length, c)); g.addColorStop(1, cols[0]); }
  else { g = ctx.createLinearGradient(-r, 0, r, 0); cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), c)); }
  ctx.strokeStyle = g;
  if ((o.glow ?? 0.07) > 0) { ctx.globalCompositeOperation = p.light ? 'source-over' : 'screen'; ctx.globalAlpha = al * (o.glow ?? 0.07); for (const k of [3.2, 2.4, 1.7]) { ctx.lineWidth = w * k; arc(r); } ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = al; ctx.lineWidth = w; arc(r);
  ctx.strokeStyle = aurA(p.light ? '#ffffff' : AUR.paper, 0.3); ctx.lineWidth = w * 0.36; arc(r - w * 0.32);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1.2, w * 0.08); arc(r + w * 0.4);
  ctx.restore();
}
// a point on a tilted ring at angle a: [x, y, front] (front = it is on the near half)
function aurRingPt(x, y, r, a, o = {}) { const px = Math.cos(a) * r, py = Math.sin(a) * r * (o.tilt ?? 1), c = Math.cos(o.rot ?? 0), s = Math.sin(o.rot ?? 0); return [x + px * c - py * s, y + px * s + py * c, Math.sin(a) > 0]; }
// the hero: a small warm orb with a glow and a thin tilted halo. r = its radius. Sets SPARK_AT. o: c, key, halo (false = none), bob
function aurHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', c = o.c ?? AUR.hero; if (r <= 0.5) return;
  if (o.bob !== false) y += Math.sin(TT * 1.9 + key.length) * r * 0.08;
  SPARK_AT = toScreen(x, y);
  aurGlow(x, y, r * 3.4, c, { a: 0.3, preset: o.preset });
  aurOrb(x, y, r, { c, key, glow: 0.5, preset: o.preset });
  if (o.halo !== false) aurHair(x, y, r * 1.75, { tilt: 0.34, rot: -0.4 + Math.sin(TT * 0.8) * 0.12, a: 0.7, w: 1.5, dot: TT * 2.2, preset: o.preset });
}

// ---------------------------------------------------------------------
//  quiet structure: hairlines, plus marks, dust. Constant width on screen whatever the camera does.
// ---------------------------------------------------------------------
// a hairline circle or arc. o: a0, a1, frac (draws on), a, w, dash, ticks (n short radial ticks), dot (angle of a small
// dot riding the line), tilt, rot, c
function aurHair(x, y, r, o = {}) {
  const p = aurPreset(o.preset), z = aurZoom(), a0 = o.a0 ?? 0, a1 = a0 + ((o.a1 ?? a0 + TAU) - a0) * clamp(o.frac ?? 1), al = o.a ?? 0.4; if (r <= 0 || al <= 0 || a1 === a0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(1, o.tilt ?? 1);
  ctx.strokeStyle = ctx.fillStyle = o.c ?? p.ink; ctx.globalAlpha = al; ctx.lineWidth = (o.w ?? 1.5) / z; ctx.setLineDash(o.dash ? o.dash.map((v) => v / z) : []);
  ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke(); ctx.setLineDash([]);
  if (o.ticks) { ctx.beginPath(); for (let i = 0; i < o.ticks; i++) { const a = a0 + (i / o.ticks) * TAU; if (a > a1) break; ctx.moveTo(Math.cos(a) * (r - 7 / z), Math.sin(a) * (r - 7 / z)); ctx.lineTo(Math.cos(a) * (r + 7 / z), Math.sin(a) * (r + 7 / z)); } ctx.stroke(); }
  if (o.dot != null) { ctx.globalAlpha = Math.min(1, al * 2.2); ctx.beginPath(); ctx.arc(Math.cos(o.dot) * r, Math.sin(o.dot) * r, (o.dotR ?? 4.5) / z, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function aurLine(x0, y0, x1, y1, o = {}) {
  const p = aurPreset(o.preset), f = clamp(o.frac ?? 1); if (f <= 0) return;
  ctx.save(); ctx.strokeStyle = o.c ?? p.ink; ctx.globalAlpha = o.a ?? 0.35; ctx.lineWidth = (o.w ?? 1.5) / aurZoom(); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, f), lerp(y0, y1, f)); ctx.stroke(); ctx.restore();
}
function aurPlus(x, y, s = 9, o = {}) {
  const p = aurPreset(o.preset), z = aurZoom(); ctx.save(); ctx.strokeStyle = o.c ?? p.ink; ctx.globalAlpha = o.a ?? 0.6; ctx.lineWidth = (o.w ?? 1.5) / z; s /= z;
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); ctx.restore();
}
// plus marks on a sparse grid, twinkling slowly, appearing one after another. o: x0, y0, x1, y1, step, s, a, at (era seconds), skip(x, y) -> true
function aurMarks(key, o = {}) {
  const S = aurSafe(), x0 = o.x0 ?? S.x0 + 40, y0 = o.y0 ?? S.y0 + 40, x1 = o.x1 ?? S.x1 - 40, y1 = o.y1 ?? S.y1 - 40, step = o.step ?? 220, R = RNG('aurmarks', key); let i = 0;
  for (let y = y0; y <= y1 + 1; y += step) for (let x = x0; x <= x1 + 1; x += step) {
    const ph = R.r(0, TAU), on = aurIn(E0 + (o.at ?? 0.2) + i * 0.05, 0.6); i++;
    if (o.skip && o.skip(x, y)) continue;
    aurPlus(x, y, o.s ?? 8, { a: (o.a ?? 0.5) * on * (0.55 + 0.45 * Math.sin(TT * 1.4 + ph)), preset: o.preset });
  }
}
// dust: tiny soft motes that rise and fade, a few of them tinted by the mesh. o: x0, y0, x1, y1, rise, speed, a, r
function aurDust(key, n = 24, o = {}) {
  const p = aurPreset(o.preset), x0 = o.x0 ?? 0, x1 = o.x1 ?? W, y0 = o.y0 ?? 0, y1 = o.y1 ?? H, rise = o.rise ?? 260, sp = o.speed ?? 0.16;
  ctx.save(); ctx.globalCompositeOperation = p.light ? 'source-over' : 'screen';
  for (let i = 0; i < n; i++) {
    const R = RNG('aurdust', key, i), bx = R.r(x0, x1), by = R.r(y0, y1), ph = R.f(), f = R.r(0.6, 1.5), rr = R.r(1.6, 4.2) * (o.r ?? 1), sway = R.r(10, 40), tint = R.f() < 0.35 ? p.cols[i % p.cols.length] : p.ink;
    const u = mod(TT * sp * f + ph, 1), al = (o.a ?? 0.7) * Math.sin(Math.PI * u) ** 1.5 * (0.6 + 0.4 * Math.sin(TT * 3 * f + ph * 9));
    ctx.globalAlpha = clamp(al); ctx.fillStyle = p.light ? aurMix(tint, p.ink, 0.3) : aurMix(tint, '#ffffff', 0.5); ctx.beginPath(); ctx.arc(bx + Math.sin(u * TAU * f + ph * 7) * sway, by - u * rise, rr, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  type: one family, very large and tight. Headlines, captions, tags and pills draw after the camera (DEFER), at
//  screen size, and fade for a bridge. o.world = true draws right away, under the camera.
// ---------------------------------------------------------------------
function aurFont(size, weight = 700, track = 0) { ctx.font = `${weight} ${size}px ${AUR_SANS}`; if ('letterSpacing' in ctx) ctx.letterSpacing = (size * track).toFixed(2) + 'px'; }
function aurTextW(str, size, weight = 700, track = 0) { ctx.save(); aurFont(size, weight, track); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// plain text. o: weight, track, align, c, a
function aurText(str, x, y, size, o = {}) {
  const p = aurPreset(o.preset); ctx.save(); aurFont(size, o.weight ?? 600, o.track ?? 0); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const w = ctx.measureText(str).width; ctx.globalAlpha = o.a ?? 1; ctx.fillStyle = o.c ?? p.ink;
  if (ctx.globalAlpha > 0.004) ctx.fillText(str, o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x, y);
  ctx.restore(); return w;
}
// 'a *word* b' -> words, each a list of runs { s, hi }
const aurParse = (line) => { const words = [[]]; String(line).split('*').forEach((part, i) => part.split(/( )/).forEach((s) => { if (s === ' ') words.push([]); else if (s) words[words.length - 1].push({ s, hi: i % 2 === 1 }); })); return words.filter((w) => w.length); };
const aurDeferred = (o, f) => { if (DEFER && !o.world) DEFER.push(f); else f(); };
// the headline: lines split on \n, a *starred* word is filled with the preset's gradient. Words arrive one by one:
// each rises a little and comes out of a soft blur. A veil of the ground sits behind the block so it always reads.
// o: x, y (first baseline), size, align, lh, weight, track, at (era seconds), stagger, dur, veil (0..1), c, grad
function aurHeadline(str, o = {}) {
  const p = aurPreset(o.preset);
  aurDeferred(o, () => {
    const k = o.world ? 1 : aurBridgeK(); if (k <= 0) return;
    const S = aurSafe(), size = o.size ?? 132, lh = (o.lh ?? 1.02) * size, align = o.align ?? 'left', x0 = o.x ?? (align === 'center' ? (typeof CX !== 'undefined' ? CX : W / 2) : S.x0 + 24), y0 = o.y ?? S.y0 + 240;
    const at = E0 + (o.at ?? 0.3), stg = o.stagger ?? 0.14, dur = o.dur ?? 0.7, grad = o.grad ?? p.grad;
    ctx.save(); aurFont(size, o.weight ?? 700, o.track ?? -0.035); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const sp = size * 0.23, L = String(str).split('\n').map((line) => { const words = aurParse(line).map((runs) => { runs.forEach((r) => (r.w = ctx.measureText(r.s).width)); return { runs, w: runs.reduce((a, r) => a + r.w, 0) }; }); return { words, w: words.reduce((a, w) => a + w.w, 0) + sp * Math.max(0, words.length - 1) }; });
    const mw = Math.max(...L.map((l) => l.w)), left = (w) => (align === 'center' ? x0 - w / 2 : align === 'right' ? x0 - w : x0), veil = (o.veil ?? 0.34) * k * seg(TT, at - 0.15, at + 0.6);
    if (veil > 0) aurShade(left(mw) + mw / 2, y0 - size * 0.36 + (L.length - 1) * lh / 2, mw * 0.82, (L.length * lh) * 0.82, veil, { preset: p });
    let wi = 0;
    L.forEach((ln, li) => {
      let x = left(ln.w); const y = y0 + li * lh;
      for (const wd of ln.words) {
        const t0 = at + wi * stg, u = EZ.o3(seg(TT, t0, t0 + dur)); wi++;
        if (u > 0) {
          const dy = (1 - u) * size * 0.3; let rx = x;
          for (const run of wd.runs) {
            if (run.hi) { const g = ctx.createLinearGradient(rx, 0, rx + run.w, 0); grad.forEach((c, i) => g.addColorStop(i / (grad.length - 1), c)); ctx.fillStyle = g; } else ctx.fillStyle = o.c ?? p.ink;
            if (u < 0.999) { const rad = (1 - u) * size * 0.11; ctx.globalAlpha = k * u * 0.2; for (let j = 0; j < 6; j++) ctx.fillText(run.s, rx + Math.cos(j / 6 * TAU) * rad, y + dy + Math.sin(j / 6 * TAU) * rad); ctx.globalAlpha = k * u * seg(u, 0.4, 1); } else ctx.globalAlpha = k;
            if (ctx.globalAlpha > 0.004) ctx.fillText(run.s, rx, y + dy);
            rx += run.w;
          }
        }
        x += wd.w + sp;
      }
    });
    ctx.restore();
  });
}
// a small line under the picture: sub colour, a *starred* phrase in full ink. o: x, y, size, at, veil
function aurCaption(str, o = {}) {
  const p = aurPreset(o.preset);
  aurDeferred(o, () => {
    const k = o.world ? 1 : aurBridgeK(), at = E0 + (o.at ?? 0.9), u = EZ.o3(seg(TT, at, at + 0.7)); if (k <= 0 || u <= 0) return;
    const size = o.size ?? 44, cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), y = (o.y ?? 1440) + (1 - u) * 16, runs = String(str).split('*').map((s, i) => ({ s, hi: i % 2 === 1 })).filter((r) => r.s);
    const tw = runs.reduce((a, r) => a + aurTextW(r.s, size, r.hi ? 600 : 500, 0), 0); let x = cx - tw / 2;
    if ((o.veil ?? 0.3) > 0) aurShade(cx, y - size * 0.3, tw * 0.75, size * 2.2, (o.veil ?? 0.3) * k * u, { preset: p });
    for (const r of runs) x += aurText(r.s, x, y, size, { weight: r.hi ? 600 : 500, c: r.hi ? p.ink : p.sub, a: k * u * (r.hi ? 1 : 0.92), preset: p });
  });
}
// the era's label, top left: a plus mark and small tracked caps. o: x, y, size, at
function aurTag(str, o = {}) {
  const p = aurPreset(o.preset);
  aurDeferred(o, () => {
    const k = o.world ? 1 : aurBridgeK(), at = E0 + (o.at ?? 0.15), u = EZ.o3(seg(TT, at, at + 0.6)); if (k <= 0 || u <= 0) return;
    const S = aurSafe(), size = o.size ?? 27, x = o.x ?? S.x0 + 26, y = o.y ?? S.y0 + 62;
    aurPlus(x + 9, y - size * 0.36, 9, { a: 0.9 * k * u, w: 2, preset: p });
    aurText(String(str).toUpperCase(), x + 34 + (1 - u) * 14, y, size, { weight: 600, track: 0.2, a: 0.88 * k * u, preset: p });
  });
}
function aurRR(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// a pill, centred on (x, y): the one button-like thing the look allows. Solid ink with ground-coloured text, or
// o.outline = a hairline pill. It settles in on a soft spring. o: size, at, arrow (false = none), dot (a colour), outline
function aurPill(str, x, y, o = {}) {
  const p = aurPreset(o.preset);
  aurDeferred(o, () => {
    const k = o.world ? 1 : aurBridgeK(), at = E0 + (o.at ?? 1.0), s = springEase(TT - at, 120, 17), al = k * clamp((TT - at) / 0.3); if (al <= 0) return;
    const size = o.size ?? 38, tw = aurTextW(str, size, 600, 0), h = size * 2.05, pad = size * 0.95, arrow = o.arrow === false ? 0 : size * 1.05, dot = o.dot ? size * 0.75 : 0, w = tw + pad * 2 + arrow + dot;
    const fg = o.outline ? p.ink : (p.light ? '#ffffff' : aurHex(aurMix(p.ground, p.deep, 0.5)));
    ctx.save(); ctx.translate(x, y + (1 - s) * 26); ctx.scale(0.9 + 0.1 * s, 0.9 + 0.1 * s); ctx.globalAlpha = al;
    aurRR(-w / 2, -h / 2, w, h, h / 2);
    if (o.outline) { ctx.strokeStyle = aurA(p.ink, 0.7); ctx.lineWidth = 1.5; ctx.stroke(); } else { ctx.fillStyle = p.ink; ctx.fill(); }
    let tx = -w / 2 + pad;
    if (dot) { ctx.fillStyle = o.dot; ctx.beginPath(); ctx.arc(tx + size * 0.18, 0, size * 0.2, 0, TAU); ctx.fill(); tx += dot; }
    ctx.restore();
    ctx.save(); ctx.translate(x, y + (1 - s) * 26); ctx.scale(0.9 + 0.1 * s, 0.9 + 0.1 * s);
    aurText(str, tx, size * 0.35, size, { weight: 600, c: fg, a: al, preset: p });
    if (arrow) { const ax = tx + tw + size * 0.42 + Math.max(0, Math.sin(TT * 3)) * 5, l = size * 0.5; ctx.globalAlpha = al; ctx.strokeStyle = fg; ctx.lineWidth = Math.max(2, size * 0.08); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax + l, 0); ctx.moveTo(ax + l * 0.55, -l * 0.42); ctx.lineTo(ax + l, 0); ctx.lineTo(ax + l * 0.55, l * 0.42); ctx.stroke(); }
    ctx.restore();
  });
}

// ---------------------------------------------------------------------
//  grain: what makes a gradient read as designed. Three seeded tiles of +-1 luminance noise; every boil step (two
//  frames) the next of AUR.grainN fixed placements. The cycle is short on purpose: an encoder finds each placement
//  again a few frames back, which halves the file against grain that never repeats (it is most of the bitrate).
//  Grains are AUR.grainPx wide, so they survive a video encode.
// ---------------------------------------------------------------------
function aurGrainTile(i) {
  const name = 'grain' + i; if (AUR_CV[name]) return AUR_CV[name];
  const s = 256, cv = aurCv(name, s, s), img = cv.g.createImageData(s, s), d = img.data, R = RNG('aurgrain', i);
  for (let j = 0; j < s * s; j++) { const v = R.f() + R.f() - 1, w = v > 0 ? 255 : 0; d[j * 4] = w; d[j * 4 + 1] = w; d[j * 4 + 2] = w; d[j * 4 + 3] = Math.round(Math.abs(v) * 255); }
  cv.g.putImageData(img, 0, 0); return cv;
}
function aurGrain(a = AUR.grain) {
  if (a <= 0) return;
  const i = B % Math.max(1, AUR.grainN), t = aurGrainTile(i % 3), R = RNG('aurgo', i), s = 256 * AUR.grainPx, ox = -R.i(0, 255) * AUR.grainPx, oy = -R.i(0, 255) * AUR.grainPx, cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false;
  for (let y = oy; y < ch; y += s) for (let x = ox; x < cw; x += s) ctx.drawImage(t, x, y, s, s);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks. Bridge shapes are orbs (or any round form) given as one 6-digit colour; the morph's
//  blank sheet is the mesh itself, dimmed (the eras' own meshes when the piece declares AUR_ERAS).
// =====================================================================
const STYLE = {
  name: 'aurora',
  paper: AUR.paper,
  backdrop(c, o) {
    ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
    const E = typeof AUR_ERAS !== 'undefined' ? AUR_ERAS : null;
    if (E && o) {
      const A = E[Math.min(o.eraA, E.length - 1)], Bm = E[Math.min(o.eraB, E.length - 1)], u = clamp(o.u ?? 0);
      if (o.phase === 'shrink') aurMesh(A, { set: false, dim: lerp(0.3, 0.72, u), dimTo: AUR.paper });
      else if (o.phase === 'grow') aurMesh(Bm, { set: false, dim: lerp(0.72, 0.3, u), dimTo: AUR.paper });
      else { aurMesh(A, { set: false, dim: 0.72, dimTo: AUR.paper }); aurMesh(Bm, { set: false, dim: 0.72, dimTo: AUR.paper, a: u }); }
    } else { aurGlow(W * 0.3, H * 0.3, W * 0.9, c, { a: 0.5, preset: AUR.presets.dusk }); aurGlow(W / 2, H / 2, H * 0.75, AUR.paper, { a: 0.6, shade: true }); }
    ctx.restore();
  },
  // an era seen through outline P: a feathered opening (light has no hard edge here), one hairline, a breath of the object's colour
  window(P, key, src, o = {}) {
    const c0 = aurCen(P), bb = bbox(P), dim = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0), far = dim > Math.max(W, H) * 2.2;
    for (const [px, al] of far ? [[0, 1]] : [[34, 0.22], [20, 0.4], [9, 0.62], [0, 1]]) {
      const k = 1 + px * 2 / dim;
      ctx.save(); ctx.globalAlpha = al; aurPath(P.map(([x, y]) => [c0[0] + (x - c0[0]) * k, c0[1] + (y - c0[1]) * k])); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    }
    if (far) return;
    const fade = clamp(1.4 - dim / Math.max(W, H));
    ctx.save(); aurPath(P); ctx.lineJoin = 'round';
    if (o.c) { ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = aurA(o.c, 0.1 * fade); ctx.lineWidth = 40; ctx.stroke(); ctx.strokeStyle = aurA(o.c, 0.14 * fade); ctx.lineWidth = 18; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.strokeStyle = `rgba(255,255,255,${(0.55 * fade).toFixed(3)})`; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  },
  // the morphing shape: the same soft body the eras' orbs are, in the blended colour, with two hairline orbits that breathe
  blob(P, c, key, u = 0) {
    const ce = aurCen(P), bb = bbox(P), r = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2, k = Math.sin(Math.PI * clamp(u)), D = AUR.presets.dusk;
    c = aurShift(c, 0, 0.03 * k, 0.9 * k);   // a straight blend of two hues goes grey half way: keep it a colour
    aurGlow(ce[0], ce[1], r * (2.6 + 0.5 * k), c, { a: 0.3 + 0.16 * k, preset: D });
    aurHair(ce[0], ce[1], r * (1.42 + 0.2 * k), { a: 0.42, preset: D, dot: -1.2 + u * 2.4 });
    aurHair(ce[0], ce[1], r * (1.95 + 0.3 * k), { a: 0.22, dash: [3, 12], preset: D });
    aurBody(P, { c, preset: D, glow: 0.42 });
  },
  hero(x, y, r, o = {}) { aurHero(x, y, r * 0.62, { key: o.key, preset: AUR.presets.dusk }); },   // r = half the hero's size (orb + halo)
  heroColor: AUR.hero,
  heroPts(x, y, r) { return aurOrbPts(x, y, r * 0.62); },
  post() { aurGrain(); },
  ones: true,                                                            // slow and floaty: on 1s
};
