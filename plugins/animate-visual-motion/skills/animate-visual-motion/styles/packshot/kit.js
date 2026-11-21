// =====================================================================
//  styles/packshot/kit.js — a bright studio packshot for physical-product ads (e-commerce / DTC), the opposite of
//  keynote's dark stage. Built on kit/core.js. A seamless pastel cyclorama (the wall curves into the floor, one
//  colour family per scene), geometric props in the same family (cylinder podiums, blocks, steps, arches, discs,
//  spheres) and ONE invented product drawn in code standing on the podium. One hard "sunlight" key from the upper
//  left: every object has a lit left side, a soft vertical highlight and a crisp cast shadow running down-right
//  across the floor; a palm-leaf or window-blind gobo shadow drifts on the wall. Clean sans type in the family's
//  ink, pill badges, a thin-line callout with a dot, a price / CTA pill.
//  pkStage(name) picks the scene; pkLit(() => { props, product }) draws every cast shadow first (as one layer, so
//  they never double up), then the bodies. Products: pkProduct('bottle' | 'dropper' | 'jar' | 'tube' | 'box' | 'can').
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const PK = {
  paper: '#f7efe6',                    // the empty studio: the blank sheet a morph happens on
  white: '#ffffff', cream: '#fff8ee',  // caps, lids, labels, badges
  dark: '#2a2233',                     // what a colour is mixed toward for its own shaded side
  hero: '#ffc23d',                     // the hero's reserved colour (a sunny yellow little jar)
  tilt: 0.2,                           // how much of a podium's top we see (ry / rx)
  sun: [0.74, 0.25],                   // where a point 1 px above the floor throws its shadow: right and toward us
  shadow: 0.8,                         // strength of the cast-shadow layer (multiplied in the scene's `shade`)
  hair: 2.5,                           // callout line width in screen px (divided by the camera zoom)
  grain: 0.035,                        // a fixed fine grain (overlay), so the pastel gradients do not band in the video
  spring: { k: 210, d: 21 },           // the look's one spring: soft, a hair of overshoot
  // one colour family per scene: wall (lit), wall2 (away from the sun), floor, prop / prop2 (mid tones),
  // deep (the product, the accent type), ink (type), shade (cast shadows, multiplied)
  scene: {
    peach:  { name: 'peach',  wall: '#f9d6c2', wall2: '#f2bea6', floor: '#fce4d6', prop: '#f3ac8e', prop2: '#ea9274', deep: '#c65f3f', ink: '#55281b', shade: '#e09a7c' },
    sage:   { name: 'sage',   wall: '#d2dfc9', wall2: '#bccdb1', floor: '#e0ead8', prop: '#a6bd98', prop2: '#8aa47c', deep: '#4f6d46', ink: '#22341e', shade: '#93b083' },
    lilac:  { name: 'lilac',  wall: '#dfd4f0', wall2: '#cbbce5', floor: '#eae2f6', prop: '#bca7df', prop2: '#a38bcf', deep: '#6a50a4', ink: '#2c204e', shade: '#a28dd2' },
    butter: { name: 'butter', wall: '#f9e8b2', wall2: '#f3da8e', floor: '#fcf1cb', prop: '#f1cf70', prop2: '#e4ba4e', deep: '#a87a12', ink: '#483507', shade: '#e2bd5c' },
    sky:    { name: 'sky',    wall: '#cbe2f3', wall2: '#b1d1eb', floor: '#deedf8', prop: '#96c1e3', prop2: '#77a9d5', deep: '#326c9d', ink: '#142f47', shade: '#86b1d9' },
  },
};
const PK_SANS = '"Helvetica Neue", "Segoe UI", Inter, Roboto, "Noto Sans", "Liberation Sans", Arial, sans-serif';
let PK_S = PK.scene.peach, PK_PASS = 'both', PK_GRAIN = null;           // PASS: 'shadow' | 'body' inside pkLit, else 'both'
const PK_SCR = [];

// ---------------------------------------------------------------------
//  colour, timing, small helpers
// ---------------------------------------------------------------------
const pkRGB = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
const pkHex = (v) => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
const pkMix = (a, b, u) => { const x = pkRGB(a), y = pkRGB(b); return pkHex(x.map((v, i) => lerp(v, y[i], u))); };
const pkA = (c, al) => { const [r, g, b] = pkRGB(c); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(al).toFixed(4)})`; };
const pkW = (al) => `rgba(255,255,255,${clamp(al).toFixed(4)})`;
const pkLum = (c) => { const [r, g, b] = pkRGB(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const pkZ = () => Math.abs(ctx.getTransform().a) || 1;                  // the camera zoom: hairlines divide by it
const pkSceneOf = (s) => (s && typeof s === 'object' ? s : PK.scene[s] || PK.scene.peach);
const pkIn = (t0, d = 0.5) => EZ.io(seg(TT, t0, t0 + d));               // ease in-out from t0 over d
const pkSpring = (t0, p = PK.spring) => springEase(TT - t0, p.k, p.d);  // 0 -> 1 from t0: podiums rise, props slide, pills pop
// a product dropping onto its spot at t0 from h px above: falls, lands, one small hop (rigid: no squash). -> { dy, a, down }
function pkDrop(t0, h = 560) {
  const t = TT - t0, fall = 0.34;
  if (t < 0) return { dy: -h, a: 0, down: 0 };
  if (t < fall) return { dy: -h * (1 - (t / fall) ** 2), a: clamp(t / 0.08), down: 0 };
  const tb = t - fall;
  return { dy: -Math.abs(Math.sin(tb * Math.PI / 0.24)) * h * 0.04 * Math.exp(-tb * 7.5), a: 1, down: 1 };
}
function pkBridgeK() {                                                  // 1 outside bridges, 0 inside: type steps aside for the morph
  if (typeof BRIDGES === 'undefined') return 1;
  let k = 1; for (const r of BRIDGES) k = Math.min(k, clamp((Math.abs(TT - r.tc) - (r.d ?? 0.6)) / 0.2));
  return k;
}
// straight-edged paths (core's trace() rounds corners; a packshot's blocks and cartons are crisp)
function pkPoly(P) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
function pkPaths(list, dx = 0, dy = 0) { ctx.beginPath(); list.forEach((P) => { P.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy))); ctx.closePath(); }); }
function pkRR(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// draw() on a scratch layer under the current transform (shadows and gobos are composited as one flat layer)
function pkScratch(i, draw) {
  const main = ctx, T = main.getTransform(), cv = main.canvas;
  let s = PK_SCR[i]; if (!s || s.width !== cv.width || s.height !== cv.height) { s = PK_SCR[i] = document.createElement('canvas'); s.width = cv.width; s.height = cv.height; }
  const c2 = s.getContext('2d'), defer = DEFER, spark = SPARK_AT;
  c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over'; c2.filter = 'none'; c2.clearRect(0, 0, s.width, s.height); c2.setTransform(T);
  ctx = c2; DEFER = null;
  try { draw(); } finally { ctx = main; DEFER = defer; SPARK_AT = spark; }
  c2.restore(); return s;
}
function pkStamp(cv, al, blur = 0) {                                    // multiply a scratch layer onto the frame
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = al;
  if (blur > 0) ctx.filter = `blur(${blur}px)`; ctx.drawImage(cv, 0, 0); ctx.restore();
}

// ---------------------------------------------------------------------
//  the studio: a seamless cyclorama, the sun, the gobo on the wall
// ---------------------------------------------------------------------
// pkStage('peach' | 'sage' | 'lilac' | 'butter' | 'sky' | scene object, { horizon (world y where wall turns into floor), curve })
function pkStage(name, o = {}) {
  PK_S = pkSceneOf(name);
  const S = PK_S, hy = o.horizon ?? 1090, cv = o.curve ?? 170;
  fillAll(S.wall);
  ctx.save();
  let g = ctx.createLinearGradient(0, 0, W * 0.9, hy);                  // the wall: brightest where the sun comes from
  g.addColorStop(0, pkMix(S.wall, PK.white, 0.42)); g.addColorStop(0.5, S.wall); g.addColorStop(1, S.wall2);
  ctx.fillStyle = g; ctx.fillRect(-W * 2, -H * 2, W * 5, H * 5);
  g = ctx.createLinearGradient(0, hy - cv * 0.55, 0, hy + cv);          // the cove: no line, the wall just turns into the floor
  g.addColorStop(0, pkA(S.wall2, 0)); g.addColorStop(0.36, pkA(pkMix(S.wall2, S.prop, 0.22), 0.6)); g.addColorStop(0.62, pkA(pkMix(S.wall2, S.floor, 0.6), 0.9)); g.addColorStop(1, S.floor);
  ctx.fillStyle = g; ctx.fillRect(-W * 2, hy - cv * 0.55, W * 5, cv * 1.55 + 2);
  g = ctx.createLinearGradient(0, hy + cv, 0, hy + cv + 760);           // the floor: sunlit, a little brighter toward the camera
  g.addColorStop(0, S.floor); g.addColorStop(1, pkMix(S.floor, PK.white, 0.4));
  ctx.fillStyle = g; ctx.fillRect(-W * 2, hy + cv, W * 5, H * 3);
  ctx.restore();
  ctx.save(); screen();                                                 // corners fall off a little, in the family's own colour
  g = ctx.createRadialGradient(W * 0.46, H * 0.46, Math.min(W, H) * 0.5, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, pkA(S.prop2, 0)); g.addColorStop(1, pkA(S.prop2, o.vig ?? 0.2)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  return { horizon: hy, scene: S };
}
// one palm frond as a shadow shape: a curved stem with tapering leaflets on both sides
function pkFrond(x, y, len, ang, bend, sway = 0) {
  const n = 17; let px = x, py = y;
  for (let i = 1; i <= n; i++) {
    const u = i / n, a = ang + bend * u * u + sway * u, st = len / n, nx = px + Math.cos(a) * st, ny = py + Math.sin(a) * st;
    ctx.lineWidth = lerp(11, 3, u); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
    const L = len * 0.36 * Math.sin(Math.PI * (0.1 + 0.86 * u)) ** 0.8;
    for (const s of [-1, 1]) {
      const d = a + s * (1.08 - 0.42 * u) + sway * 0.6 * u;
      ctx.beginPath(); ctx.ellipse(nx + Math.cos(d) * L * 0.5, ny + Math.sin(d) * L * 0.5, L * 0.5, Math.max(3, L * 0.075), d, 0, TAU); ctx.fill();
    }
    px = nx; py = ny;
  }
}
// the gobo: something between the sun and the wall. kind 'palm' | 'blinds'. It drifts and sways slowly, and fades out where
// the wall turns into the floor. o: x, y (palm: where the fronds hang from; blinds: top-left of the window), a, w, h, horizon, key
function pkGobo(kind = 'palm', o = {}) {
  if (PK_PASS === 'shadow') return;
  const S = PK_S, hy = o.horizon ?? 1090, a = o.a ?? 0.34, ph = (o.key ?? kind).length, sway = Math.sin(TT * 0.7 + ph), drift = Math.sin(TT * 0.32 + ph * 0.5);
  const cv = pkScratch(1, () => {
    ctx.save(); ctx.fillStyle = S.shade; ctx.strokeStyle = S.shade; ctx.lineCap = 'round';
    if (kind === 'blinds') {
      const x = (o.x ?? 520) + drift * 26 + (TT - E0) * 7, y = (o.y ?? 420) + drift * 8, w = o.w ?? 520, n = o.n ?? 13, gap = (o.h ?? 600) / n, th = gap * (0.52 + 0.05 * sway);
      ctx.translate(x, y); ctx.transform(1, 0.2, -0.32, 1, 0, 0);       // the window, thrown slanted onto the wall
      for (let i = 0; i < n; i++) ctx.fillRect(0, i * gap, w, th);
      ctx.fillRect(-90, -gap * 0.6, w + 180, gap * 0.6); ctx.fillRect(-90, -gap * 0.6, 90, n * gap + gap * 1.2); ctx.fillRect(w, -gap * 0.6, 90, n * gap + gap * 1.2); ctx.fillRect(-90, n * gap - gap * 0.48, w + 180, gap * 1.1);   // the wall round the window
    } else {
      const x = (o.x ?? W + 40) + drift * 22, y = (o.y ?? 180) + drift * 10, len = o.len ?? 640;
      pkFrond(x, y, len, Math.PI * 0.78, 0.5, sway * 0.07);
      pkFrond(x + 40, y - 60, len * 0.86, Math.PI * 0.98, 0.42, -sway * 0.06 + 0.02);
      pkFrond(x + 20, y + 30, len * 0.72, Math.PI * 0.6, 0.5, sway * 0.09);
    }
    ctx.restore();                                                      // fade it out through the cove
    const g = ctx.createLinearGradient(0, hy - 150, 0, hy + 70); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = g; ctx.fillRect(-W * 2, -H * 2, W * 5, H * 5);
  });
  pkStamp(cv, a, 3);
}
// dust in the sunlight: small white motes rising slowly, a fifth of them four-point sparkles. o: n, box [x0, y0, x1, y1], a, key
function pkMotes(o = {}) {
  if (PK_PASS === 'shadow') return;
  const n = o.n ?? 26, [x0, y0, x1, y1] = o.box ?? [70, 320, 1010, 1280], R = RNG('pkmotes', o.key ?? 'a'), z = pkZ(), a = o.a ?? 0.85;
  ctx.save(); ctx.fillStyle = PK.white;
  for (let i = 0; i < n; i++) {
    const px = R.f(), py = R.f(), sp = R.r(0.012, 0.034), ph = R.r(0, TAU), size = R.r(1.8, 4.4), tw = R.r(0.6, 1.6), star = R.f() > 0.8;
    const u = mod(py - TT * sp, 1), x = lerp(x0, x1, mod(px + TT * sp * 0.35, 1)) + Math.sin(TT * tw + ph) * 10, y = lerp(y0, y1, u);
    const al = a * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TT * tw * 2.1 + ph * 3))) * Math.sin(Math.PI * u);
    if (al <= 0.01) continue;
    if (star) pkSparkle(x, y, size * 3.4 / z, al); else { ctx.globalAlpha = al; ctx.beginPath(); ctx.arc(x, y, size / z, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
// a four-point white sparkle
function pkSparkle(x, y, r, al = 1, c = PK.white) {
  if (PK_PASS === 'shadow' || al <= 0.01 || r <= 0.2) return;
  ctx.save(); ctx.globalAlpha = clamp(al); ctx.fillStyle = c; ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(0, -r);
  for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i + 1) * Math.PI / 2; ctx.quadraticCurveTo(0, 0, Math.cos(a) * r, Math.sin(a) * r); }
  ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  the sun: cast shadows
// ---------------------------------------------------------------------
// where outline P (standing over floor line fy) throws its shadow
const pkCast = (P, fy) => P.map(([x, y]) => [x + (fy - y) * PK.sun[0], fy + (fy - y) * PK.sun[1]]);
// the cast shadow of one or more outlines (the first is the solid, the rest are holes) on the floor at y = fy
function pkShadow(paths, fy) {
  if (PK_PASS === 'body') return;
  const list = (Array.isArray(paths[0][0]) ? paths : [paths]).map((P) => pkCast(P, fy));
  ctx.save();
  if (PK_PASS === 'both') { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = PK.shadow; }
  ctx.fillStyle = PK_S.shade; pkPaths(list); ctx.fill('evenodd'); ctx.restore();
}
// the short shadow something throws on the top of the podium it stands on (on = what pkPodium returned)
function pkContact(hull, baseY, on, k = 1) {
  if (PK_PASS === 'shadow' || !on || k <= 0.01) return;
  ctx.save(); ctx.beginPath(); ctx.ellipse(on.x, on.y, on.rx, on.ry, 0, 0, TAU); ctx.clip();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = PK.shadow * k; ctx.fillStyle = PK_S.shade; pkPoly(pkCast(hull, baseY)); ctx.fill(); ctx.restore();
}
// the set: draw() is called twice, first for every cast shadow (one flat layer, multiplied, so overlaps never darken twice),
// then for the bodies. Put props and products inside; type and the stage outside.
function pkLit(draw, o = {}) {
  const cv = pkScratch(0, () => { PK_PASS = 'shadow'; try { draw(); } finally { PK_PASS = 'both'; } });
  pkStamp(cv, o.a ?? PK.shadow, o.blur ?? 1.6);
  PK_PASS = 'body'; try { draw(); } finally { PK_PASS = 'both'; }
}

// ---------------------------------------------------------------------
//  volumes: how every object is lit
// ---------------------------------------------------------------------
// a turned volume (a cylinder seen from the front): flat colour c inside outline P, whatever o.under draws on it (a label),
// then the turn of the form: a lit left, a soft vertical highlight, a shaded right with a little bounce at the edge.
// o: k (shading strength), gloss (highlight strength), flat (a face, not a turn), ribs (n grip lines), under(bb), over(bb), top [x, y, rx, ry]
function pkVol(P, c, o = {}) {
  const bb = bbox(P), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, k = o.k ?? 1, dk = pkMix(c, PK.dark, 0.74), box = () => ctx.fillRect(bb.x0 - 2, bb.y0 - 2, w + 4, h + 4);
  ctx.save(); pkPoly(P); ctx.clip(); ctx.fillStyle = c; box();
  if (o.under) o.under(bb);
  let g;
  if (o.flat) {
    g = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1); g.addColorStop(0, pkW(0.2 * k)); g.addColorStop(0.5, pkW(0)); g.addColorStop(1, pkA(dk, 0.16 * k)); ctx.fillStyle = g; box();
  } else {
    g = ctx.createLinearGradient(bb.x0, 0, bb.x1, 0);
    g.addColorStop(0, pkA(dk, 0.22 * k)); g.addColorStop(0.1, pkA(dk, 0.04 * k)); g.addColorStop(0.3, pkA(dk, 0)); g.addColorStop(0.56, pkA(dk, 0.03 * k));
    g.addColorStop(0.8, pkA(dk, 0.25 * k)); g.addColorStop(0.93, pkA(dk, 0.42 * k)); g.addColorStop(1, pkA(dk, 0.27 * k));
    ctx.fillStyle = g; box();
    const gl = o.gloss ?? 0.42, hx = bb.x0 + w * 0.22, hw = Math.max(w * 0.085, 0.02);
    pkStreak(hx, bb.y0 + h * 0.5, hw * 1.5, h * 0.47, gl);                                                // the soft vertical highlight
    pkStreak(bb.x0 + w * 0.9, bb.y0 + h * 0.52, Math.max(w * 0.05, 0.01), h * 0.42, gl * 0.34);           // bounce from the bright floor
  }
  g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1); g.addColorStop(0, pkW(0.1 * k)); g.addColorStop(0.35, pkW(0)); g.addColorStop(0.7, pkA(dk, 0)); g.addColorStop(1, pkA(dk, 0.12 * k));
  ctx.fillStyle = g; box();
  if (o.ribs) { ctx.strokeStyle = pkA(dk, 0.2); ctx.lineWidth = w * 0.014; for (let i = 0; i < o.ribs; i++) { const x = (bb.x0 + bb.x1) / 2 + Math.sin(lerp(-1.4, 1.4, i / (o.ribs - 1))) * w / 2; ctx.beginPath(); ctx.moveTo(x, bb.y0); ctx.lineTo(x, bb.y1); ctx.stroke(); } }
  if (o.over) o.over(bb);
  ctx.restore();
  if (o.top) pkTop(o.top[0], o.top[1], o.top[2], o.top[3], c);
  return bb;
}
// a soft vertical streak of light: an ellipse of white that fades to nothing at every edge
function pkStreak(x, y, rx, ry, al) {
  ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, pkW(al)); g.addColorStop(0.45, pkW(al * 0.6)); g.addColorStop(1, pkW(0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
}
// the top face of a cylinder: lighter than its side, with a thin lit edge toward the camera
function pkTop(x, y, rx, ry, c, o = {}) {
  const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry), hi = o.hi ?? 0.5;
  g.addColorStop(0, pkMix(c, PK.white, hi + 0.16)); g.addColorStop(1, pkMix(c, PK.white, hi - 0.14));
  ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0.12, Math.PI - 0.12); ctx.lineWidth = Math.max(ry * 0.09, rx * 0.012); ctx.strokeStyle = pkW(0.55); ctx.stroke(); ctx.restore();
}
// profiles: a turned object is a list of [half-width, y] from its base up; pkProf closes it into an outline, with the base
// bulging down by sb and the top up by st (the two half-ellipses we see of a cylinder from slightly above)
function pkProf(prof, sb = 0, st = 0) {
  const b = prof[0], t = prof[prof.length - 1], P = [];
  if (sb > 0) P.push(...arcPts(0, b[1], b[0], Math.PI, 0, 16, sb / b[0])); else P.push([-b[0], b[1]], [b[0], b[1]]);
  for (let i = 1; i < prof.length - 1; i++) P.push([prof[i][0], prof[i][1]]);
  if (st > 0) P.push(...arcPts(0, t[1], t[0], 0, -Math.PI, 16, st / t[0])); else P.push([t[0], t[1]], [-t[0], t[1]]);
  for (let i = prof.length - 2; i >= 1; i--) P.push([-prof[i][0], prof[i][1]]);
  return P;
}
// a quarter-turn between two profile points: mode 'v' leaves a vertically (a shoulder), 'h' leaves it horizontally (a heel)
function pkQ(a, b, mode = 'v', n = 9) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n * Math.PI / 2; out.push(mode === 'v' ? [b[0] + (a[0] - b[0]) * Math.cos(t), a[1] + (b[1] - a[1]) * Math.sin(t)] : [a[0] + (b[0] - a[0]) * Math.sin(t), b[1] + (a[1] - b[1]) * Math.cos(t)]); }
  return out;
}

// ---------------------------------------------------------------------
//  props: all in the scene's own colour family. y is always where the prop meets the floor.
// ---------------------------------------------------------------------
// a cylinder podium. x, y = centre of its base; returns its top { x, y, rx, ry, floor } to stand things on (pass it as `on`).
// o: color, tilt, floor (world y of the real floor, for a podium stacked on another), on (the podium under it), k
function pkPodium(x, y, w, h, o = {}) {
  const S = PK_S, c = o.color ?? S.prop, rx = w / 2, ry = rx * (o.tilt ?? PK.tilt), top = y - Math.max(0, h), sy = ry / rx;
  const P = [...arcPts(x, top, rx, Math.PI, TAU, 28, sy), ...arcPts(x, y, rx, 0, Math.PI, 28, sy)], out = { x, y: top, rx, ry, floor: o.floor ?? y, P };
  pkShadow(P, o.floor ?? y);
  if (PK_PASS === 'shadow') return out;
  if (o.on) pkContact(P, y, o.on);
  pkVol(P, c, { k: o.k ?? 0.8, gloss: o.gloss ?? 0.2 });
  pkTop(x, top, rx, ry, c, { hi: 0.42 });
  return out;
}
// a block seen from the front: a face and the strip of its top. x = centre, y = floor. o: color, d (how much top shows)
function pkBlock(x, y, w, h, o = {}) {
  const S = PK_S, c = o.color ?? S.prop, d = o.d ?? 34, x0 = x - w / 2, top = y - h, P = [[x0, y], [x0 + w, y], [x0 + w, top - d], [x0, top - d]];
  const out = { x, y: top - d / 2, rx: w / 2, ry: d / 2, floor: o.floor ?? y, P };
  pkShadow(P, o.floor ?? y);
  if (PK_PASS === 'shadow') return out;
  pkVol([[x0, y], [x0 + w, y], [x0 + w, top], [x0, top]], c, { flat: true, k: o.k ?? 0.55 });
  ctx.save(); const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, pkMix(c, PK.white, 0.56)); g.addColorStop(1, pkMix(c, PK.white, 0.36));
  ctx.fillStyle = g; ctx.fillRect(x0, top - d, w, d + 0.5); ctx.fillStyle = pkW(0.5); ctx.fillRect(x0, top - 1.5, w, 3); ctx.restore();
  return out;
}
// steps: n blocks side by side, rising to the right (dir 1) or to the left (dir -1)
function pkSteps(x, y, w, h, n = 3, o = {}) {
  const cw = w / n, dir = o.dir ?? 1, out = [];
  for (let i = 0; i < n; i++) { const j = dir > 0 ? i : n - 1 - i; out.push(pkBlock(x - w / 2 + cw * (i + 0.5), y, cw + 0.6, h * (j + 1) / n, { ...o, color: pkMix(o.color ?? PK_S.prop2, PK_S.deep, j / Math.max(1, n - 1) * 0.22) })); }
  return out;
}
// a flat standing slab cut from outlines (first = solid, others = holes): a lit face and a thickness going back to the right
function pkSlab(paths, c, fy, o = {}) {
  const S = PK_S, t = o.t ?? 30, dx = t, dy = -t * 0.26, n = 6, bb = bbox(paths[0]);
  pkShadow(paths, fy);
  if (PK_PASS === 'shadow') return bb;
  ctx.save(); ctx.fillStyle = pkMix(c, S.deep, 0.34);
  for (let i = n; i >= 1; i--) { pkPaths(paths, dx * i / n, dy * i / n); ctx.fill('evenodd'); }
  const g = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1); g.addColorStop(0, pkMix(c, PK.white, 0.3)); g.addColorStop(0.55, c); g.addColorStop(1, pkMix(c, S.prop2, 0.35));
  ctx.fillStyle = g; pkPaths(paths); ctx.fill('evenodd'); ctx.restore();
  return bb;
}
const pkArchPts = (x, y, w, h) => [[x - w / 2, y], ...arcPts(x, y - h + w / 2, w / 2, Math.PI, TAU, 30), [x + w / 2, y]];
// an arch standing on the floor (x = centre, y = floor). o: color, open (0..1: an arched doorway that share of its width), t (thickness)
function pkArch(x, y, w, h, o = {}) {
  const paths = [pkArchPts(x, y, w, h)];
  if (o.open) { const iw = w * o.open; paths.push(pkArchPts(x, y + 1, iw, h - (w - iw) / 2)); }
  return pkSlab(paths, o.color ?? PK_S.prop, y, o);
}
// a disc standing on its edge (x, y = where it touches the floor), or a half-disc lying on its flat side (o.half)
function pkDisc(x, y, r, o = {}) {
  return pkSlab([o.half ? arcPts(x, y, r, Math.PI, TAU, 36) : ellipsePts(x, y - r, r, r, 0, 56)], o.color ?? PK_S.prop2, y, o);
}
// a matte sphere. x, y = its centre. o: color, floor (world y of the floor under it: its shadow lands there), wall (a floating
// sphere's shadow on the wall behind: [dx, dy] or true)
function pkSphere(x, y, r, o = {}) {
  const S = PK_S, c = o.color ?? S.prop2;
  if (PK_PASS !== 'body') {
    if (o.wall) { const [dx, dy] = o.wall === true ? [r * 0.95, r * 1.15] : o.wall; ctx.save(); if (PK_PASS === 'both') { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = PK.shadow; } ctx.fillStyle = S.shade; ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill(); ctx.restore(); }
    else if (o.floor != null) pkShadow(ellipsePts(x, y, r, r, 0, 40), o.floor);
  }
  if (PK_PASS === 'shadow') return;
  ctx.save();
  let g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x - r * 0.1, y - r * 0.1, r * 1.15);
  g.addColorStop(0, pkMix(c, PK.white, 0.62)); g.addColorStop(0.42, c); g.addColorStop(1, pkMix(c, PK.dark, 0.36));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();                                                  // the bright floor bounces up into its underside
  g = ctx.createRadialGradient(x + r * 0.35, y + r * 1.15, 0, x + r * 0.35, y + r * 1.15, r * 0.9); g.addColorStop(0, pkA(S.floor, 0.55)); g.addColorStop(1, pkA(S.floor, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = pkW(0.5); ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.46, r * 0.17, r * 0.1, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the product: invented, unbranded, drawn in code. Local units: base centre at (0, 0), y up is negative, about 230-500 tall.
// ---------------------------------------------------------------------
// an invented brand mark, radius r: 'sun' | 'drop' | 'leaf' | 'ring' | 'wave' | 'half'
function pkMark(kind, x, y, r, c) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.16;
  if (kind === 'drop') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.2, -r * 0.4, r * 0.72, 0, r * 0.72, r * 0.36); ctx.arc(0, r * 0.36, r * 0.72, 0, Math.PI); ctx.bezierCurveTo(-r * 0.72, 0, -r * 0.2, -r * 0.4, 0, -r); ctx.fill(); }
  else if (kind === 'leaf') { ctx.rotate(0.6); for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * r * 0.06, -r); ctx.quadraticCurveTo(d * r * 1.02, -r * 0.1, d * r * 0.06, r); ctx.closePath(); ctx.fill(); } ctx.fillRect(-r * 0.05, r * 0.8, r * 0.1, r * 0.42); }
  else if (kind === 'ring') { ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, TAU); ctx.fill(); }
  else if (kind === 'wave') { for (const dy of [-0.38, 0.38]) { ctx.beginPath(); ctx.moveTo(-r, dy * r); ctx.bezierCurveTo(-r * 0.5, dy * r - r * 0.5, -r * 0.2, dy * r + r * 0.5, 0, dy * r); ctx.bezierCurveTo(r * 0.2, dy * r - r * 0.5, r * 0.5, dy * r + r * 0.5, r, dy * r); ctx.stroke(); } }
  else if (kind === 'half') { ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.8, Math.PI, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-r, r * 0.46); ctx.lineTo(r, r * 0.46); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, 0, r * 0.46, 0, TAU); ctx.fill(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); } }
  ctx.restore();
}
// a simple label between y0 (top) and y1, w wide, centred on cx: the mark, a bar where a name would be, thin lines, a size line.
// No words, so no brand. o: ink, mark, text (e.g. '50 ml'), panel (a colour: a paper label behind it)
function pkLabel(cx, y0, y1, w, o = {}) {
  const hh = y1 - y0, ink = o.ink ?? PK.cream, r = Math.min(w * 0.19, hh * 0.15);
  ctx.save();
  if (o.panel) { ctx.fillStyle = o.panel; pkRR(cx - w / 2 - hh * 0.07, y0 - hh * 0.07, w + hh * 0.14, hh * 1.14, hh * 0.04); ctx.fill(); }
  pkMark(o.mark ?? 'sun', cx, y0 + r * 1.15, r, ink);
  let y = y0 + r * 2.3 + hh * 0.1;
  ctx.fillStyle = ink; pkRR(cx - w * 0.3, y, w * 0.6, hh * 0.055, hh * 0.03); ctx.fill(); y += hh * 0.055 + hh * 0.085;
  ctx.globalAlpha = 0.7; ctx.fillRect(cx - w * 0.36, y, w * 0.72, Math.max(1.2, hh * 0.012)); y += hh * 0.06; ctx.fillRect(cx - w * 0.24, y, w * 0.48, Math.max(1.2, hh * 0.012));
  if (o.text) { ctx.globalAlpha = 0.9; ctx.font = `500 ${hh * 0.105}px ${PK_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.text, cx, y1 - hh * 0.02); }
  ctx.restore();
}
// the parts of a product in local units: [{ P, c, ...pkVol options } | { P, draw }], its hull (one outline, for bridges and contact shadows)
function pkParts(kind, o = {}) {
  const S = PK_S, c = o.color ?? S.deep, cap = o.cap ?? PK.cream, ink = o.ink ?? (pkLum(c) < 0.62 ? PK.cream : S.ink), lab = o.label ?? {}, parts = [];
  const label = (y0, y1, w, mark, extra = {}) => pkLabel(extra.cx ?? 0, y0, y1, w, { ink, mark: lab.mark ?? mark, text: lab.text, ...extra });
  let hull;
  if (kind === 'dropper') {            // an apothecary dropper bottle: tinted glass, a paper label, a ribbed collar, a rubber bulb
    const body = [[78, 0], ...pkQ([78, -196], [34, -258]), [34, -276]], dk = pkMix(c, PK.dark, 0.6);
    parts.push({ P: pkProf(body, 10, 0), c, gloss: 0.6, under: () => {
      ctx.fillStyle = pkA(dk, 0.3); ctx.fillRect(-100, -168, 200, 180);                                   // the liquid
      ctx.fillStyle = pkA(dk, 0.22); ctx.beginPath(); ctx.ellipse(0, -168, 78, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = pkW(0.2); ctx.fillRect(-5, -262, 10, 210);                                          // the pipette inside
      label(-150, -36, 96, 'drop', { ink: lab.ink ?? S.ink, panel: lab.panel ?? PK.cream });
    } });
    parts.push({ P: pkProf([[41, -272], [41, -318]], 5, 5), c: cap, ribs: 11, top: [0, -318, 41, 5] });
    parts.push({ P: pkProf([[27, -316], [31, -338], ...pkQ([31, -364], [3, -416])], 4, 0), c: o.bulb ?? pkMix(S.ink, PK.white, 0.14), gloss: 0.3 });
    hull = pkProf([[78, 0], ...pkQ([78, -196], [41, -262]), [41, -318], [31, -338], ...pkQ([31, -364], [3, -416])], 10, 0);
  } else if (kind === 'jar') {         // a low cream jar: a wide body with a heel, a tall lid whose top we see
    parts.push({ P: pkProf([...pkQ([118, 0], [146, -28], 'h'), [146, -150]], 13, 0), c, gloss: 0.4, under: () => label(-126, -22, 150, 'leaf') });
    parts.push({ P: pkProf([[153, -144], [153, -204]], 16, 19), c: cap, gloss: 0.5, top: [0, -204, 153, 19], over: () => {
      ctx.strokeStyle = pkA(pkMix(cap, PK.dark, 0.7), 0.16); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, -156, 153, 16, 0, 0, Math.PI); ctx.stroke();
    } });
    hull = pkProf([...pkQ([118, 0], [146, -28], 'h'), [146, -146], [153, -146], [153, -204]], 13, 19);
  } else if (kind === 'tube') {        // a squeeze tube standing on its cap: a ribbed cap, a body that widens to a crimped end
    parts.push({ P: pkProf([[56, 0], [56, -66]], 8, 8), c: cap, ribs: 13 });
    parts.push({ P: pkProf([...pkQ([50, -62], [86, -114], 'h'), [97, -404], [97, -432]], 0, 0), c, k: 0.75, gloss: 0.34, under: () => label(-350, -150, 120, 'half'), over: () => {
      ctx.fillStyle = pkA(pkMix(c, PK.dark, 0.7), 0.22); ctx.fillRect(-100, -406, 200, 2.5); ctx.fillStyle = pkW(0.25); ctx.fillRect(-100, -403, 200, 2);
      ctx.strokeStyle = pkA(pkMix(c, PK.dark, 0.7), 0.2); ctx.lineWidth = 1.6; for (let i = -9; i <= 9; i++) { ctx.beginPath(); ctx.moveTo(i * 10, -430); ctx.lineTo(i * 10, -410); ctx.stroke(); }
    } });
    hull = pkProf([[56, 0], [56, -64], [86, -114], [97, -404], [97, -432]], 8, 0);
  } else if (kind === 'box') {         // a carton seen three-quarter: a lit front, a shaded side, a bright top
    const fr = [[-110, 0], [70, 0], [70, -330], [-110, -330]], sd = [[70, 0], [128, -20], [128, -350], [70, -330]], tp = [[-110, -330], [70, -330], [128, -350], [-52, -350]];
    parts.push({ P: sd, draw: () => { ctx.save(); pkPoly(sd); ctx.clip(); ctx.fillStyle = pkMix(c, PK.dark, 0.3); ctx.fillRect(60, -360, 80, 370); const g = ctx.createLinearGradient(0, -350, 0, 0); g.addColorStop(0, pkW(0.08)); g.addColorStop(1, pkA(PK.dark, 0.14)); ctx.fillStyle = g; ctx.fillRect(60, -360, 80, 370); ctx.restore(); } });
    parts.push({ P: tp, draw: () => { ctx.fillStyle = pkMix(c, PK.white, 0.42); pkPoly(tp); ctx.fill(); } });
    parts.push({ P: fr, c, flat: true, k: 0.8, under: () => label(-272, -44, 118, 'ring', { cx: -20 }), over: () => { ctx.fillStyle = pkW(0.4); ctx.fillRect(-110, -330, 180, 2.5); ctx.fillRect(67.5, -330, 2.5, 330); } });
    hull = [[-110, 0], [70, 0], [128, -20], [128, -350], [-52, -350], [-110, -330]];
  } else if (kind === 'can') {         // a drinks can: aluminium rims, a printed wrap, a lid with a tab
    const al = '#dfe3e8', prof = [[70, 0], [80, -16], [80, -284], [69, -306], [69, -312]];
    parts.push({ P: pkProf(prof, 9, 8), c, k: 1.1, gloss: 0.62, under: () => { ctx.fillStyle = al; ctx.fillRect(-90, -14, 180, 30); ctx.fillRect(-90, -330, 180, 44); label(-248, -52, 112, 'wave'); } });
    parts.push({ P: ellipsePts(0, -312, 69, 8, 0, 28), draw: () => {
      pkTop(0, -312, 69, 8, al, { hi: 0.3 }); ctx.strokeStyle = pkA(PK.dark, 0.18); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, -312, 58, 6, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = pkA(PK.dark, 0.16); ctx.beginPath(); ctx.ellipse(6, -311.5, 20, 3, 0, 0, TAU); ctx.fill();
    } });
    hull = pkProf(prof, 9, 8);
  } else {                             // 'bottle': a pump bottle: a tall body with a round shoulder, a collar, a steel stem, a pump head with a spout
    const body = [[92, 0], ...pkQ([92, -296], [42, -372]), [42, -384]], head = [[36, -458], [36, -490], [28, -499], [-40, -499], [-112, -491], [-123, -482], [-123, -469], [-112, -470], [-40, -476], [-36, -458]];
    parts.push({ P: pkProf(body, 12, 0), c, gloss: 0.46, under: () => label(-258, -62, 124, 'sun') });
    parts.push({ P: pkProf([[47, -378], [47, -422]], 6, 6), c: cap, top: [0, -422, 47, 6] });
    parts.push({ P: pkProf([[10, -420], [10, -462]], 0, 0), c: pkMix(cap, '#8a909a', 0.5), gloss: 0.7 });
    parts.push({ P: head, c: cap, flat: true, k: 0.9, over: () => { ctx.fillStyle = pkW(0.6); ctx.fillRect(-112, -499, 148, 3); } });
    hull = pkProf([[92, 0], ...pkQ([92, -296], [46, -376]), [46, -424], [38, -458], [38, -499]], 12, 0);
  }
  return { parts, hull };
}
// the product's hull in world coords: a bridge shape, or something to point a callout at
const pkProductPts = (kind, x, y, s = 1, o = {}) => pkParts(kind, o).hull.map(([px, py]) => [x + px * s, y + py * s]);
// pkProduct(kind, x, y, s, o): kind 'bottle' | 'dropper' | 'jar' | 'tube' | 'box' | 'can'; x, y = where its base stands; s = scale.
// o: color (body; default the scene's deep), cap, ink, bulb, label { mark, text, panel, ink }, on (the podium it stands on),
//    floor (world y of the real floor: where its long shadow lands; default y), dy (lift above its spot: a drop), a (alpha),
//    glint 0..1 (a highlight band sweeping across; outside 0..1 = none)
// -> { x, y, top, x0, x1, w, h, hull, at(u, v) } (at: a world point by fractions of its box, for callouts)
function pkProduct(kind, x, y, s = 1, o = {}) {
  const S = PK_S, D = pkParts(kind, o), dy = o.dy ?? 0, yy = y + dy, wp = (P) => P.map(([px, py]) => [x + px * s, yy + py * s]);
  const hull = wp(D.hull), bb = bbox(hull), al = clamp(o.a ?? 1);
  const out = { kind, x, y: yy, s, hull, x0: bb.x0, x1: bb.x1, top: bb.y0, w: bb.x1 - bb.x0, h: bb.y1 - bb.y0, at: (u, v) => [lerp(bb.x0, bb.x1, u), lerp(bb.y0, bb.y1, v)] };
  if (al <= 0.01) return out;
  if (PK_PASS !== 'body') D.parts.forEach((p) => pkShadow(wp(p.P), o.floor ?? y));          // in the air, the shadow runs ahead of it
  if (PK_PASS === 'shadow') return out;
  if (o.on) pkContact(hull, yy, o.on, al * clamp(1 + dy / 90));
  ctx.save(); ctx.globalAlpha *= al; ctx.translate(x, yy); ctx.scale(s, s);
  D.parts.forEach((p) => (p.draw ? p.draw() : pkVol(p.P, p.c, p)));
  if (o.glint != null && o.glint > 0 && o.glint < 1) {                                                   // a glint sweeps the whole object
    const lb = bbox(D.hull), w = lb.x1 - lb.x0, h = lb.y1 - lb.y0, dx = 0.94, dyy = 0.34, bw = Math.max(w * 0.2, 26);
    const p0 = lb.x0 * dx + lb.y0 * dyy, p1 = lb.x1 * dx + lb.y1 * dyy, p = lerp(p0 - bw, p1 + bw, o.glint);
    const g = ctx.createLinearGradient(dx * (p - bw), dyy * (p - bw), dx * (p + bw), dyy * (p + bw));
    g.addColorStop(0, pkW(0)); g.addColorStop(0.4, pkW(0.22)); g.addColorStop(0.5, pkW(0.72)); g.addColorStop(0.6, pkW(0.22)); g.addColorStop(1, pkW(0));
    pkPaths(D.parts.map((q) => q.P)); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(lb.x0 - 140, lb.y0 - 20, w + 280, h + 40);
  }
  ctx.restore();
  return out;
}

// ---------------------------------------------------------------------
//  the hero: a little round jar in its own colour, whose lid hops now and then. x, y = its centre, r = half its height.
// ---------------------------------------------------------------------
const PK_HERO_BODY = [...pkQ([0.5, 0.94], [0.9, 0.34], 'h', 10), ...pkQ([0.9, 0.3], [0.5, -0.4], 'v', 10), [0.5, -0.44]];
const pkHeroPts = (x, y, r) => pkProf([...PK_HERO_BODY, [0.57, -0.44], [0.57, -0.82]], 0.06, 0.07).map(([px, py]) => [x + px * r, y + py * r]);
// o: color, lid, floor (world y of the floor: its shadow), on (the podium under it), dy (a drop), a, key, still (no lid hop)
function pkHero(x, y, r, o = {}) {
  const c = o.color ?? STYLE.heroColor ?? PK.hero, lid = o.lid ?? PK.cream, dy = o.dy ?? 0, yy = y + dy, al = clamp(o.a ?? 1), key = o.key ?? 'hero';
  const hop = o.still ? 0 : Math.max(0, Math.sin(TT * TAU * 0.5 + key.length * 1.3)) ** 10 * 0.13;       // the lid lifts once every two seconds
  const hull = pkHeroPts(x, yy, r), base = yy + r * 0.94;
  if (al <= 0.01) return;
  if (PK_PASS !== 'body' && o.floor != null) pkShadow(hull, o.floor);
  if (PK_PASS === 'shadow') return;
  SPARK_AT = toScreen(x, yy);
  if (o.on) pkContact(hull, base, o.on, al * clamp(1 + dy / 90));
  ctx.save(); ctx.globalAlpha *= al; ctx.translate(x, yy); ctx.scale(r, r);
  pkVol(pkProf(PK_HERO_BODY, 0.06, 0), c, { gloss: 0.5, k: 0.9, under: () => { pkMark('ring', 0, 0.28, 0.2, PK.cream); } });
  ctx.translate(0, -hop);
  pkVol(pkProf([[0.57, -0.4], [0.57, -0.8]], 0.06, 0.07), lid, { gloss: 0.5, top: [0, -0.8, 0.57, 0.07] });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  type: one clean sans in the family's ink. Bold for words, tracked caps for small labels. Never an outline, never a glow.
// ---------------------------------------------------------------------
// one line. o: weight, color, track (em), align, a, and for a fade-in: at (seconds), dur, rise (px it settles through)
function pkType(str, x, y, size, o = {}) {
  if (PK_PASS === 'shadow') return 0;
  const u = o.at != null ? seg(TT, o.at, o.at + (o.dur ?? 0.4)) : 1, al = clamp(o.a ?? 1) * EZ.io(u);
  ctx.save(); ctx.font = `${o.weight ?? 500} ${size}px ${PK_SANS}`;
  const tr = (o.track ?? 0) * size, hasLS = 'letterSpacing' in ctx; if (hasLS) ctx.letterSpacing = tr.toFixed(2) + 'px';
  const w = ctx.measureText(str).width - (hasLS ? tr : 0), align = o.align ?? 'left';
  if (al > 0.004) {
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.color ?? PK_S.ink; ctx.globalAlpha *= al;
    ctx.fillText(str, x + (hasLS ? (align === 'center' ? tr / 2 : align === 'right' ? tr : 0) : 0), y + (o.rise ?? size * 0.18) * (1 - EZ.o3(u)));
  }
  ctx.restore(); return w;
}
// a line of words centred on cx; words inside *...* take the accent weight and colour; they arrive one at a time
function pkWords(str, cx, y, size, o = {}) {
  const words = []; String(str).split('*').forEach((part, i) => part.split(/\s+/).filter(Boolean).forEach((wd) => words.push({ s: wd, hi: i % 2 === 1 })));
  const wt = (wd) => (wd.hi ? o.weightHi ?? 700 : o.weight ?? 400);
  ctx.save(); const sp = size * 0.26, ws = words.map((wd) => { ctx.font = `${wt(wd)} ${size}px ${PK_SANS}`; return ctx.measureText(wd.s).width; }); ctx.restore();
  let x = cx - (ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1)) / 2;
  words.forEach((wd, i) => { pkType(wd.s, x, y, size, { weight: wt(wd), color: wd.hi ? o.colorHi : o.color, a: o.a, at: o.at != null ? o.at + i * (o.step ?? 0.09) : null, dur: 0.4, rise: o.rise ?? 14 }); x += ws[i] + sp; });
}
// a pill badge ('NEW', '50 ml') in world coords: pops in with the spring at o.at (absolute seconds), then sits a little tilted.
// o: at, size, rot, solid (ink pill, white type; default a white pill with ink type), fill, color
function pkBadge(str, x, y, o = {}) {
  if (PK_PASS === 'shadow') return;
  const S = PK_S, at = o.at ?? E0 + 0.6; if (TT < at) return;
  const k = springEase(TT - at, 260, 17), size = o.size ?? 36, h = size * 1.95, tr = 0.08;
  ctx.save(); ctx.font = `700 ${size}px ${PK_SANS}`; const w = ctx.measureText(str).width + tr * size * str.length + size * 1.7;
  ctx.translate(x, y); ctx.rotate((o.rot ?? -0.1) + (1 - k) * 0.35); ctx.scale(k, k);
  ctx.fillStyle = pkA(S.ink, 0.16); pkRR(-w / 2 + 7, -h / 2 + 9, w, h, h / 2); ctx.fill();               // a hard little shadow, down-right like everything else
  ctx.fillStyle = o.fill ?? (o.solid ? S.ink : PK.white); pkRR(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  pkType(str, 0, size * 0.355, size, { weight: 700, track: tr, align: 'center', color: o.color ?? (o.solid ? PK.white : S.ink) });
  ctx.restore();
}
// a thin-line callout in world coords: a dot on the product at (x0, y0), a line to (x1, y1), a short level run, then the label.
// o: at (absolute seconds), dur, run, size, sub (a second, smaller line), color
function pkCallout(x0, y0, x1, y1, str, o = {}) {
  if (PK_PASS === 'shadow') return;
  const S = PK_S, at = o.at ?? E0 + 0.8, f = EZ.io(seg(TT, at, at + (o.dur ?? 0.45))); if (f <= 0) return;
  const z = pkZ(), dir = Math.sign(x1 - x0) || 1, run = o.run ?? 46, Q = subPath([[x0, y0], [x1, y1], [x1 + dir * run, y1]], f), k = clamp(f * 4), size = o.size ?? 40, col = o.color ?? S.ink;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); Q.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.lineWidth = PK.hair / z; ctx.strokeStyle = col; ctx.stroke();
  const pu = mod(TT - at, 1.6) / 1.6;                                                                     // the dot pings, softly, for ever
  ctx.globalAlpha = (1 - pu) * 0.55 * k; ctx.beginPath(); ctx.arc(x0, y0, (10 + pu * 20) / z, 0, TAU); ctx.lineWidth = 2 / z; ctx.strokeStyle = PK.white; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = PK.white; ctx.beginPath(); ctx.arc(x0, y0, 10 * k / z, 0, TAU); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, 5 * k / z, 0, TAU); ctx.fill();
  ctx.restore();
  const tx = x1 + dir * (run + 16), align = dir > 0 ? 'left' : 'right';
  pkType(str, tx, y1 + size * 0.34, size, { weight: 700, color: col, align, at: at + 0.3, dur: 0.35, rise: 8 });
  if (o.sub) pkType(o.sub, tx, y1 + size * 0.34 + size * 0.98, size * 0.72, { weight: 500, color: o.subColor ?? S.deep, align, at: at + 0.42, dur: 0.35, rise: 8 });
}
// the price / CTA pill in world coords, centred on (x, y): the price, a divider, the call to action, an arrow in a light disc.
// o: at (absolute seconds), size, fill, color
function pkPrice(price, cta, x, y, o = {}) {
  if (PK_PASS === 'shadow') return;
  const S = PK_S, at = o.at ?? E0 + 1.2; if (TT < at) return;
  const k = springEase(TT - at, PK.spring.k, PK.spring.d), size = o.size ?? 46, h = size * 2.05, pad = size * 0.8, gap = size * 0.44, cs = size * 0.76, ar = size * 0.62;
  ctx.save(); ctx.font = `700 ${size}px ${PK_SANS}`; const wp = ctx.measureText(price).width; ctx.font = `500 ${cs}px ${PK_SANS}`; const wc = cta ? ctx.measureText(cta).width : 0;
  const w = pad + wp + (cta ? gap * 2 + wc + gap * 0.8 : gap) + ar * 2 + size * 0.32;
  ctx.translate(x, y + (1 - k) * 30); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.globalAlpha *= clamp((TT - at) / 0.12);
  ctx.fillStyle = pkA(S.ink, 0.18); pkRR(-w / 2 + 8, -h / 2 + 11, w, h, h / 2); ctx.fill();
  ctx.fillStyle = o.fill ?? S.ink; pkRR(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  let cx = -w / 2 + pad;
  pkType(price, cx, size * 0.35, size, { weight: 700, color: o.color ?? PK.white }); cx += wp + gap;
  if (cta) { ctx.fillStyle = pkW(0.3); ctx.fillRect(cx - 1, -size * 0.42, 2, size * 0.84); cx += gap; pkType(cta, cx, cs * 0.35, cs, { weight: 500, color: pkA(o.color ?? PK.white, 0.9) }); cx += wc + gap * 0.8; }
  const ax = w / 2 - size * 0.32 - ar, nud = Math.max(0, Math.sin((TT - at) * TAU * 0.5)) ** 4 * size * 0.1;   // the arrow nudges on the beat
  ctx.fillStyle = S.floor; ctx.beginPath(); ctx.arc(ax, 0, ar, 0, TAU); ctx.fill();
  ctx.strokeStyle = S.ink; ctx.lineWidth = size * 0.085; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(ax - ar * 0.38 + nud, 0); ctx.lineTo(ax + ar * 0.38 + nud, 0); ctx.moveTo(ax + ar * 0.08 + nud, -ar * 0.3); ctx.lineTo(ax + ar * 0.38 + nud, 0); ctx.lineTo(ax + ar * 0.08 + nud, ar * 0.3); ctx.stroke();
  ctx.restore();
}

// ---- screen-space type, through DEFER (after the camera, at screen size); all of it steps aside for a bridge
const pkDefer = (f) => { if (PK_PASS === 'shadow') return; if (DEFER) DEFER.push(f); else f(); };
// a small tracked-caps kicker over a big bold headline (a string or an array of lines; *word* takes the family's deep colour).
// o: x, y (first headline baseline), size, at (seconds into the era)
function pkHeadline(kicker, head, o = {}) {
  const S = PK_S;
  pkDefer(() => {
    const k = pkBridgeK(); if (k <= 0) return;
    const at = E0 + (o.at ?? 0.4), x = o.x ?? CX, y = o.y ?? 440, size = o.size ?? 112;
    if (kicker) pkType(String(kicker).toUpperCase(), x, y - size * 1.02, o.ksize ?? Math.max(28, size * 0.29), { weight: 700, color: S.deep, track: 0.22, align: 'center', a: k, at, rise: 10 });
    [].concat(head).forEach((line, i) => pkWords(line, x, y + i * size * 1.06, size, { weight: 700, weightHi: 700, color: S.ink, colorHi: S.deep, a: k, at: at + 0.15 + i * 0.2, step: 0.12, rise: size * 0.2 }));
  });
}
// one short caption line near the bottom; words inside *...* are bold in the family's deep colour
function pkCaption(str, o = {}) {
  const S = PK_S;
  pkDefer(() => {
    const k = pkBridgeK(); if (k <= 0) return;
    pkWords(str, o.x ?? CX, o.y ?? (H > W * 1.2 ? 1440 : H - 110), o.size ?? 54, { weight: 400, weightHi: 700, color: S.ink, colorHi: S.deep, a: k, at: E0 + (o.at ?? 0.5) });
  });
}
// a small chapter mark, top left: a dot in the family's deep colour and tracked caps
function pkTag(str, o = {}) {
  const S = PK_S;
  pkDefer(() => {
    const k = pkBridgeK() * pkIn(E0 + (o.at ?? 0.15), 0.4); if (k <= 0.004) return;
    const x = o.x ?? 70, y = o.y ?? (H > W * 1.2 ? 296 : 84), size = o.size ?? 26;
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = S.deep; ctx.beginPath(); ctx.arc(x + 8, y - size * 0.34, 8, 0, TAU); ctx.fill(); ctx.restore();
    pkType(String(str).toUpperCase(), x + 30, y, size, { weight: 700, color: S.ink, track: 0.2, a: k });
  });
}
// a fixed fine grain over the whole frame: keeps the pastel gradients from banding in the video (held still on purpose)
function pkGrain(al = PK.grain) {
  if (al <= 0) return;
  if (!PK_GRAIN) {
    const n = 256, R = RNG('pkgrain'); PK_GRAIN = document.createElement('canvas'); PK_GRAIN.width = PK_GRAIN.height = n;
    const g = PK_GRAIN.getContext('2d'), img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = Math.floor(R.f() * 256); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = al; ctx.globalCompositeOperation = 'overlay'; ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(PK_GRAIN, x, y);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks. Bridge colours are product body colours (6-digit hex); mid-morph the blend arrives as rgb().
// =====================================================================
const STYLE = {
  name: 'packshot',
  paper: PK.paper,                                                       // the empty studio
  backdrop(c) {                                                          // an empty wall in sunlight
    fillAll(c); ctx.save(); screen();
    const g = ctx.createLinearGradient(0, 0, W * 0.9, H * 0.7); g.addColorStop(0, pkW(0.4)); g.addColorStop(0.6, pkW(0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  window(P, key, src) {                                                  // the set through the product's outline: a die-cut card, white edge, hard shadow
    const bb = bbox(P), far = bb.y1 - bb.y0 > H * 2.4;
    ctx.save();
    if (!far) { ctx.fillStyle = 'rgba(120,86,64,0.2)'; pkPoly(P.map(([x, y]) => [x + 20, y + 26])); ctx.fill(); }
    pkPoly(P); ctx.clip(); ctx.drawImage(src, 0, 0);
    if (!far) { pkPoly(P); ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = PK.white; ctx.stroke(); }
    ctx.restore();
  },
  blob(P, c, key, u = 0) {                                               // the product itself changes shape in the sun, while a glint crosses it
    const bb = bbox(P), w = bb.x1 - bb.x0, v = pkRGB(c), m = (v[0] + v[1] + v[2]) / 3, col = pkHex(v.map((x) => m + (x - m) * 1.5)), fy = bb.y1;   // keep the blend from going grey
    ctx.save(); ctx.fillStyle = 'rgba(120,86,64,0.22)'; pkPoly(pkCast(P, fy)); ctx.fill(); ctx.restore();
    pkVol(P, col, { gloss: 0.46, over: () => {
      const bw = w * 0.22, p = lerp(bb.x0 - bw, bb.x1 + bw, 0.1 + 0.8 * clamp(u)), g = ctx.createLinearGradient(p - bw, bb.y0, p + bw, bb.y0 + bw * 0.7);
      g.addColorStop(0, pkW(0)); g.addColorStop(0.5, pkW(0.55)); g.addColorStop(1, pkW(0)); ctx.fillStyle = g; ctx.fillRect(bb.x0, bb.y0, w, bb.y1 - bb.y0);
    } });
  },
  hero(x, y, r, o = {}) { pkHero(x, y, r, { key: o.key }); },            // r = half the hero's height
  heroColor: PK.hero,                                                    // a piece on a butter scene picks another: STYLE.heroColor = '#ff6f59'
  heroPts(x, y, r) { return pkHeroPts(x, y, r); },
  post() { pkGrain(); },
  ones: true,                                                            // smooth and springy: on 1s
};
