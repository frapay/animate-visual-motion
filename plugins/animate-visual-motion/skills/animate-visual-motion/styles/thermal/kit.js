// =====================================================================
//  styles/thermal/kit.js — an infrared camera image. Built on kit/core.js.
//  Nothing has a colour: every object is a TEMPERATURE 0..1. Scenes draw a greyscale heat field (grey = temperature);
//  STYLE.post shrinks it to the sensor's resolution, maps it through one false-colour ramp (iron), adds the sensor's
//  noise, scales it back up and only then draws the camera HUD on top, unmapped, with readings measured from the
//  frame itself (max, min, the centre spot, the hottest point).
//  Colours handed to the renderer (ERA_BG, bridge shapes' c, heroColor) are temperature greys: thmC(t).
//  Optional piece constants (declare before the kit, e.g. in the head): THM_SPAN = [[lo, hi], ...] degrees per era;
//  THM_NUC = [t, ...] shutter recalibrations; THM_HUD = { bar, cross, hot, cold, brackets, mode, clock, unit }.
// =====================================================================
const THM = {
  // the ramp: temperature 0..1 -> false colour (iron)
  stops: [[0.00, '#05030f'], [0.13, '#1b0c52'], [0.27, '#4a0f8a'], [0.42, '#9a1b8f'], [0.55, '#d2315f'], [0.68, '#f0602a'], [0.80, '#fb9a1c'], [0.90, '#fdd23c'], [0.97, '#fff7b0'], [1.00, '#ffffff']],
  amb: 0.22,                         // room temperature: the blank sheet a morph happens on
  hud: '#f3f5f7', hudD: 'rgba(8,5,22,0.6)', hudInk: '#1b0c52',
  res: 4,                            // the sensor: the frame is sampled at 1/res (270 x 480) and scaled back up
  span: [0, 90],                     // degrees shown for temperature 0 and 1 when the piece gives no THM_SPAN
  emis: 0.95,
  noise: 2.0, fpn: 1.5, band: 1.2, vig: 10,   // sensor character, in grey levels (of 255)
};
const THM_FONT = MONO;
const thmV = (t) => Math.round(clamp(t) * 255);
// a temperature as a canvas / renderer colour (a 6-digit grey), and with alpha
const thmC = (t) => { const h = thmV(t).toString(16).padStart(2, '0'); return '#' + h + h + h; };
const thmA = (t, a) => { const v = thmV(t); return `rgba(${v},${v},${v},${clamp(a)})`; };
const THM_LUT = (() => {
  const n = 1024, L = new Uint8ClampedArray(n * 3), S = THM.stops.map(([t, h]) => [t, parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); let k = 0; while (k < S.length - 2 && t > S[k + 1][0]) k++;
    const a = S[k], b = S[k + 1], u = clamp((t - a[0]) / (b[0] - a[0]));
    for (let c = 0; c < 3; c++) L[i * 3 + c] = Math.round(lerp(a[c + 1], b[c + 1], u));
  }
  return L;
})();
// the false colour of a temperature (HUD, documents): '#rrggbb'
const thmRamp = (t) => { const i = Math.round(clamp(t) * 1023) * 3; return '#' + [0, 1, 2].map((c) => THM_LUT[i + c].toString(16).padStart(2, '0')).join(''); };
// the temperature of a colour: a grey ('#9a9a9a', 'rgb(154,154,154)') is read directly; any other colour is the nearest ramp colour
function thmTemp(c) {
  if (typeof c === 'number') return clamp(c);
  let r, g, b; const s = String(c);
  if (s[0] === '#') { r = parseInt(s.slice(1, 3), 16); g = parseInt(s.slice(3, 5), 16); b = parseInt(s.slice(5, 7), 16); }
  else { const m = s.match(/[\d.]+/g) || [0, 0, 0]; r = +m[0]; g = +m[1]; b = +m[2]; }
  if (Math.max(r, g, b) - Math.min(r, g, b) <= 10) return (r + g + b) / 765;
  let best = 0, bd = 1e12;
  for (let i = 0; i < 1024; i++) { const d = (THM_LUT[i * 3] - r) ** 2 + (THM_LUT[i * 3 + 1] - g) ** 2 + (THM_LUT[i * 3 + 2] - b) ** 2; if (d < bd) { bd = d; best = i; } }
  return best / 1023;
}
// the span in degrees at the current time: each era's own, blended across a bridge's morph (the camera re-spans)
function thmSpanAt() {
  const S = typeof THM_SPAN !== 'undefined' ? THM_SPAN : null; if (!S) return THM.span;
  const era = (t) => Math.max(0, ERA_LIST.findIndex(([a, b]) => t >= a - 1e-6 && t < b - 1e-6)), at = (e) => S[Math.min(e, S.length - 1)];
  if (typeof BRIDGES !== 'undefined') for (const r of BRIDGES) {
    const d = r.d ?? 0.6, m = r.m ?? (r.d != null ? r.d / 3 : 0.2);
    if (Math.abs(TT - r.tc) < d) { const a = at(era(r.tc - 0.01)), b = at(era(r.tc + 0.01)), u = EZ.io(seg(TT, r.tc - m, r.tc + m)); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]; }
  }
  return at(era(TT));
}
const thmDeg = (t, span = thmSpanAt()) => span[0] + clamp(t) * (span[1] - span[0]);
// 1 outside bridges, 0 inside one (0.2s ramps): scene captions and spots hide while the world is seen through a window
function thmBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  let k = 1; for (const r of BRIDGES) k = Math.min(k, clamp((Math.abs(TT - r.tc) - (r.d ?? 0.6)) / 0.2));
  return k;
}
// 0..1 progress of something that starts at t0 and takes d seconds (smooth: heat has no hard starts)
const thmIn = (t0, d = 0.5) => EZ.io(seg(TT, t0, t0 + d));
// Newton cooling / warming: a value that moves from a to b from time t0 with time constant tau
const thmWarm = (t0, a, b, tau = 0.6) => (TT <= t0 ? a : b + (a - b) * Math.exp(-(TT - t0) / tau));

// ---------------------------------------------------------------------
//  heat drawing: everything takes a temperature, never a colour
// ---------------------------------------------------------------------
const thmCen = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// a body from any closed outline: a core at o.t, an edge that is cooler (o.edge), a bloom of heat round it.
// o: t, edge, soft (px the edge reaches in), bloom (px of halo outside), a (alpha), cold (a cold body: the halo darkens), mode
function thmBody(P, o = {}) {
  const t = o.t ?? 0.7, edge = o.edge ?? t - 0.14, bb = bbox(P), dim = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0);
  const soft = o.soft ?? dim * 0.3, bloom = o.bloom ?? Math.max(14, dim * 0.1), al = o.a ?? 1;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.raw === false) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); } else trace(P, true);
  if (bloom > 0) {
    ctx.globalCompositeOperation = o.cold ? 'darken' : 'lighten'; ctx.strokeStyle = thmC(edge);
    for (let i = 0; i < 5; i++) { ctx.lineWidth = bloom * 2 * (1 - i / 5); ctx.globalAlpha = al * (o.halo ?? 0.2); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = o.mode ?? 'source-over'; ctx.globalAlpha = al; ctx.fillStyle = thmC(t); ctx.fill();
  if (soft > 0 && edge !== t) {
    ctx.clip(); ctx.strokeStyle = thmC(edge);
    for (let i = 0; i < 7; i++) { ctx.lineWidth = soft * 2 * (1 - i / 7) + 2; ctx.globalAlpha = al * 0.3; ctx.stroke(); }
  }
  ctx.restore();
}
// run fn clipped to an outline (hot cores, liquid levels, markings inside a body)
function thmClip(P, fn) { ctx.save(); trace(P, true); ctx.clip(); fn(); ctx.restore(); }
// a soft heat blob. By default it only warms what is under it ('lighten'); o.cold = it only cools; o.set = it replaces.
// o: ry, rot, a, hard (0..1: the fraction of the radius that is fully at t)
function thmBlob(x, y, r, t, o = {}) {
  if (r <= 0.5) return;
  const a = o.a ?? 1, hard = clamp(o.hard ?? 0, 0, 0.95);
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(1, (o.ry ?? r) / r);
  const g = ctx.createRadialGradient(0, 0, r * hard, 0, 0, r);
  g.addColorStop(0, thmA(t, a)); g.addColorStop(0.35, thmA(t, a * 0.74)); g.addColorStop(0.7, thmA(t, a * 0.24)); g.addColorStop(1, thmA(t, 0));
  ctx.globalCompositeOperation = o.set ? 'source-over' : o.cold ? 'darken' : 'lighten';
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
}
// round the corners of an open path (Chaikin), keeping its ends
function thmSmooth(P, it = 2) {
  for (let k = 0; k < it; k++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]); } Q.push(P[P.length - 1]); P = Q; }
  return P;
}
// heat conducting along an open path from its first point. o: w, taper (end width as a fraction), t0 (the source end),
// t1 (the far end once heat has arrived), base (the unheated temperature; null = not drawn), frac (0..1: how far the heat has got)
function thmConduct(P, o = {}) {
  const w = o.w ?? 20, t0 = o.t0 ?? 0.85, t1 = o.t1 ?? t0 - 0.25, base = o.base ?? null, frac = clamp(o.frac ?? 1), taper = o.taper ?? 1;
  const Q = resample(P.length > 2 ? thmSmooth(P) : P, false, Math.max(3, w * 0.3)), n = Q.length; if (n < 2) return;
  const heat = (s) => clamp((frac * 1.25 - s) / 0.25), T = (s) => { const h = heat(s), hot = lerp(t0, t1, s); return base == null ? hot : lerp(base, hot, h * h * (3 - 2 * h)); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.bloom !== 0) {   // the bloom: only round the part the heat has reached
    const end = base == null ? n : Math.max(2, Math.ceil(n * Math.min(1, frac * 1.1)));
    ctx.globalCompositeOperation = 'lighten'; ctx.strokeStyle = thmC(lerp(t0, t1, 0.5) - 0.1); ctx.globalAlpha = 0.16 * (base == null ? 1 : Math.min(1, frac * 3));
    for (let k = 0; k < 3; k++) { ctx.lineWidth = w + (o.bloom ?? w * 1.4) * (1 - k / 3); ctx.beginPath(); for (let i = 0; i < end; i++) (i ? ctx.lineTo(Q[i][0], Q[i][1]) : ctx.moveTo(Q[i][0], Q[i][1])); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  for (let i = 0; i < n - 1; i++) {
    const s = i / (n - 1); if (base == null && s > frac) break;
    ctx.strokeStyle = thmC(T(s)); ctx.lineWidth = w * lerp(1, taper, s);
    ctx.beginPath(); ctx.moveTo(Q[i][0], Q[i][1]); ctx.lineTo(Q[i + 1][0], Q[i + 1][1]); ctx.stroke();
  }
  ctx.restore();
}
// a residual print left on a surface: outline(s) P at temperature o.t when fresh, cooling to the surface (o.amb) as
// o.age goes 0..1: it fades, its edge softens and it shrinks toward its middle (edges cool first).
function thmPrint(P, o = {}) {
  const parts = Array.isArray(P[0][0]) ? P : [P], age = clamp(o.age ?? 0); if (age >= 1) return;
  const amb = o.amb ?? THM.amb, t = lerp(o.t ?? 0.45, amb, age ** 0.7), k = 1 - 0.14 * age, al = (o.a ?? 1) * (1 - age * age);
  for (const Q of parts) {
    const c = thmCen(Q), bb = bbox(Q), dim = Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0);
    thmBody(Q.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]), { t, edge: lerp(t, amb, 0.6), soft: dim * (0.3 + 0.3 * age), bloom: dim * (0.25 + 0.5 * age), halo: 0.12, a: al, mode: 'lighten' });
  }
}
// a hand print (palm heel, finger pads, thumb) and a paw print (pad and four toes): outlines for thmPrint
function thmHandPts(x, y, s, rot = 0) {
  const P = [ellipsePts(0, 0.42, 0.4, 0.3, 0, 20), ellipsePts(-0.03, 0.02, 0.4, 0.17, -0.1, 18)];
  [[-0.4, -0.52, 0.085, 0.3, -0.26], [-0.15, -0.72, 0.09, 0.38, -0.08], [0.1, -0.72, 0.09, 0.37, 0.06], [0.33, -0.56, 0.085, 0.31, 0.22]].forEach(([fx, fy, rx, ry, a]) => P.push(ellipsePts(fx, fy, rx, ry, a, 14)));
  P.push(ellipsePts(0.62, 0.1, 0.1, 0.3, 0.9, 14));
  return P.map((Q) => xform(Q, x, y, rot, s));
}
function thmPawPts(x, y, s, rot = 0) {
  const P = [ellipsePts(0, 0.25, 0.46, 0.36, 0, 16)];
  [[-0.46, -0.22, -0.4], [-0.17, -0.5, -0.12], [0.17, -0.5, 0.12], [0.46, -0.22, 0.4]].forEach(([tx, ty, a]) => P.push(ellipsePts(tx, ty, 0.15, 0.2, a, 10)));
  return P.map((Q) => xform(Q, x, y, rot, s));
}
// steam, breath, warm air: faint warm wisps that rise from (x, y), widen and cool. Stateless: a function of TT.
// o: h (rise), w (sway), r (wisp size), t, a, n (columns), m (puffs per column), speed, from (start time), key, dir (angle; up = -PI/2)
function thmSteam(x, y, o = {}) {
  const n = o.n ?? 3, m = o.m ?? 6, h = o.h ?? 300, w = o.w ?? 46, t = o.t ?? 0.42, a = o.a ?? 0.5, sp = o.speed ?? 0.45, r0 = o.r ?? 26, from = o.from ?? -1e9, dir = o.dir ?? -Math.PI / 2;
  const dx = Math.cos(dir), dy = Math.sin(dir);
  for (let i = 0; i < n; i++) {
    const R = RNG('thmsteam', o.key ?? 's', i), ph = R.f(), fx = R.r(0.7, 1.5), off = R.n(w * 0.45), p2 = R.r(0, TAU);
    for (let j = 0; j < m; j++) {
      const u = mod(TT * sp + ph + j / m, 1); if (TT - u / sp < from) continue;
      const side = off * u + Math.sin(u * fx * TAU + p2 + TT * 1.3) * w * (0.2 + 0.8 * u), al = a * smooth(0, 0.14, u) * (1 - u) ** 1.2;
      thmBlob(x + dx * u * h - dy * side, y + dy * u * h + dx * side, r0 * (0.7 + 1.7 * u), lerp(t, t - 0.08, u), { a: al });
    }
  }
}
// a moving body's fading trail: pos(time) -> [x, y]. o: r, t, amb, n, dt, a
function thmTrail(pos, o = {}) {
  const n = o.n ?? 10, dt = o.dt ?? 0.05, r = o.r ?? 30, t = o.t ?? 0.6, amb = o.amb ?? THM.amb;
  for (let i = n; i >= 1; i--) { const p = pos(TT - i * dt); if (!p) continue; const u = i / (n + 1); thmBlob(p[0], p[1], r * (1 + 0.5 * u), lerp(t, amb, u ** 0.6), { a: (o.a ?? 0.8) * (1 - u), ry: (o.ry ?? r) * (1 + 0.5 * u) }); }
}
// a poured stream of hot liquid from (x0, y0) to (x1, y1). o: w, t, head (0..1: how far the front has fallen),
// tail (0..1: how far the cut-off end has fallen), bend
function thmPour(x0, y0, x1, y1, o = {}) {
  const w = o.w ?? 16, t = o.t ?? 0.97, head = clamp(o.head ?? 1), tail = clamp(o.tail ?? 0), bend = o.bend ?? 0; if (head <= tail) return;
  const at = (s) => { const q = 1 - s; return [q * q * x0 + 2 * q * s * (x0 + bend) + s * s * x1, q * q * y0 + 2 * q * s * lerp(y0, y1, 0.35) + s * s * y1]; };
  const n = 28, P = []; for (let i = 0; i <= n; i++) { const s = lerp(tail, head, i / n); P.push([...at(s), s]); }
  ctx.save(); ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighten'; ctx.strokeStyle = thmC(t - 0.3); ctx.globalAlpha = 0.22;
  for (let k = 0; k < 3; k++) { ctx.lineWidth = w * (4.5 - k * 1.2); ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.strokeStyle = thmC(t);
  for (let i = 0; i < n; i++) { ctx.lineWidth = w * (1 + 0.2 * Math.sin(P[i][2] * 14 - TT * 16)) * lerp(1.15, 0.8, P[i][2]); ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[i + 1][0], P[i + 1][1]); ctx.stroke(); }
  ctx.restore();
}
// cold spreading as dark: an irregular patch that grows from (x, y). o: t, grow (0..1), n (lobes), key, a, sy (squash)
function thmFrost(x, y, r, o = {}) {
  const g = clamp(o.grow ?? 1), R = RNG('thmfrost', o.key ?? 'f'), n = o.n ?? 7, t = o.t ?? 0.08, sy = o.sy ?? 1; if (g <= 0) return;
  thmBlob(x, y, r * 0.6 * (0.3 + 0.7 * g), t, { cold: true, a: o.a ?? 0.9, ry: r * 0.6 * (0.3 + 0.7 * g) * sy });
  for (let i = 0; i < n; i++) { const a = i / n * TAU + R.n(0.4), d = r * g * R.r(0.3, 0.75), rr = r * g * R.r(0.3, 0.55); thmBlob(x + Math.cos(a) * d, y + Math.sin(a) * d * sy, rr, t + 0.03, { cold: true, a: (o.a ?? 0.9) * 0.7, ry: rr * sy }); }
}
// the room: fills everything at temperature t, with a slow unevenness (no wall is one temperature). o: key, to (bottom temperature), amt
function thmAmbient(t, o = {}) {
  ctx.save();
  if (o.to != null) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, thmC(t)); g.addColorStop(1, thmC(o.to)); ctx.fillStyle = g; } else ctx.fillStyle = thmC(t);
  ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
  const R = RNG('thmamb', o.key ?? 'room'), amt = o.amt ?? 0.035;
  for (let i = 0; i < 7; i++) { const up = i % 2 === 0, r = R.r(320, 620); thmBlob(R.r(0, W), R.r(0, H), r, t + (up ? amt : -amt), { a: 0.7, cold: !up, ry: r * R.r(0.6, 1.2) }); }
}
// a surface seen from above (table, floor): everything below y, at t near the camera and t + far at the horizon
function thmPlane(y, t, o = {}) {
  ctx.save(); const g = ctx.createLinearGradient(0, y, 0, y + (o.depth ?? 500));
  g.addColorStop(0, thmC(t + (o.far ?? 0.03))); g.addColorStop(1, thmC(t)); ctx.fillStyle = g; ctx.fillRect(-W, y, W * 3, H * 2); ctx.restore();
}

// ---------------------------------------------------------------------
//  ready-made subjects, readable by their heat pattern
// ---------------------------------------------------------------------
// a mug: thmMugPts is its body (a bridge shape). o: level (0..1 liquid), heat (0..1: how far the wall above the liquid
// has warmed), hot (liquid temperature), cold (empty temperature), handle (false = none)
function thmMugPts(x, y, w, h) {
  const a = w / 2, b = h / 2, P = [[-a, -b], [0, -b - 6], [a, -b], [a * 0.99, 0], [a * 0.93, b * 0.72]];
  for (const q of arcPts(a * 0.93 - 34, b - 34, 34, 0, Math.PI / 2, 5)) P.push(q);
  P.push([0, b + 3]);
  for (const q of arcPts(-a * 0.93 + 34, b - 34, 34, Math.PI / 2, Math.PI, 5)) P.push(q);
  P.push([-a * 0.93, b * 0.72], [-a * 0.99, 0]);
  return P.map(([px, py]) => [x + px, y + py]);
}
function thmMug(x, y, w, h, o = {}) {
  const lv = clamp(o.level ?? 0), ht = clamp(o.heat ?? lv), hot = o.hot ?? 0.86, cold = o.cold ?? 0.27, P = thmMugPts(x, y, w, h);
  const y0 = y - h / 2, y1 = y + h / 2, yl = lerp(y1 - 8, y0 + 34, lv), wall = lerp(cold, hot - 0.06, lv > 0 ? 1 : 0);
  // the handle: a ring that warms from where it joins the wall
  if (o.handle !== false) { const hp = arcPts(x + w / 2 - 6, y - h * 0.02, h * 0.25, -Math.PI * 0.42, Math.PI * 0.42, 14).map(([px, py]) => [x + w / 2 - 6 + (px - (x + w / 2 - 6)) * 0.86, py]); thmConduct(hp, { w: w * 0.11, t0: lerp(cold, hot - 0.3, ht), t1: lerp(cold, hot - 0.42, ht), bloom: 10 }); }
  thmBody(P, { t: cold, edge: cold - 0.05, soft: w * 0.16, bloom: lerp(12, 46, ht), halo: lerp(0.12, 0.24, ht) });
  thmClip(P, () => {
    if (lv > 0) {   // the liquid shows through the wall; above it the wall warms by conduction
      const reach = 30 + 150 * ht, g = ctx.createLinearGradient(0, yl - reach, 0, yl + 26);
      g.addColorStop(0, thmA(wall, 0)); g.addColorStop(0.55, thmA(wall - 0.2, 0.7)); g.addColorStop(1, thmA(wall, 1));
      ctx.fillStyle = g; ctx.fillRect(x - w, yl - reach, w * 2, y1 - yl + reach + 20);
      thmBlob(x, lerp(yl, y1, 0.5), w * 0.42, hot - 0.01, { ry: Math.max(20, (y1 - yl) * 0.6), a: 0.9 });
    }
    // a cylinder's sides face away from the camera and read cooler
    for (const s of [-1, 1]) thmBlob(x + s * w * 0.56, y, w * 0.2, cold - 0.02, { ry: h * 0.7, cold: true, a: lerp(0.5, 0.75, lv) });
  });
  // the opening: what is inside the mug
  const ry = 24 + w * 0.02, top = lv > 0.02 ? lerp(0.6, hot + 0.1, clamp(lv * 2.2)) : cold - 0.05;
  thmBody(ellipsePts(x, y0 + ry * 0.55, w * 0.455, ry, 0, 40), { t: top, edge: lerp(cold, top, 0.55), soft: 12, bloom: lv > 0.02 ? 22 : 0 });
  return { rim: [x, y0 + ry * 0.55], level: yl };
}
// the hero: a sitting cat, front view. r = half its height. Its heat anatomy: the face is the hottest skin, the eyes
// are white-hot, the nose and ear tips are cold, the fur insulates (the body reads cooler than the face), the tail
// cools to its tip. o: blink, ear (0..1: the left ear folds), tail (swish, -1..1), look (-1..1: the head turns), fur
function thmCatUnit(ear = 0) {
  const side = (s, e) => [[0.1 * s, -0.8], [0.17 * s, -0.86], [(0.27 + 0.05 * e) * s, -0.985 + 0.1 * e], [(0.31 + 0.07 * e) * s, -1.02 + 0.13 * e], [(0.335 + 0.06 * e) * s, -0.96 + 0.1 * e], [0.37 * s, -0.74], [0.385 * s, -0.56], [0.34 * s, -0.39], [0.25 * s, -0.27], [0.3 * s, -0.1], [0.4 * s, 0.25], [0.47 * s, 0.6], [0.46 * s, 0.86], [0.36 * s, 1.0], [0.14 * s, 1.01]];
  return [[0, -0.8], ...side(1, 0), ...side(-1, ear).reverse()];
}
const thmCatPts = (x, y, r, ear = 0) => thmCatUnit(ear).map(([px, py]) => [x + px * r, y + py * r]);
function thmCat(x, y, r, o = {}) {
  const fur = o.fur ?? 0.6, key = o.key ?? 'cat', U = (px, py) => [x + px * r, y + py * r], hx = (o.look ?? 0) * 0.035, sw = o.tail ?? Math.sin(TT * 2.2);
  const breath = 0.012 * Math.sin(TT * TAU * 0.55);
  SPARK_AT = toScreen(x, y);
  thmBlob(x, y + r, r * 0.8, fur - 0.2, { ry: r * 0.1, a: 0.8 });                                              // the floor it warms
  thmConduct([U(0.3, 0.9), U(0.54, 1.0), U(0.74, 0.94), U(0.8, 0.72), U(0.75 + 0.06 * sw, 0.52), U(0.66 + 0.11 * sw, 0.4)], { w: r * 0.15, taper: 0.55, t0: fur - 0.02, t1: fur - 0.2, bloom: r * 0.1 });   // the tail cools to its tip
  thmBody(thmCatPts(x, y, r, o.ear ?? 0), { t: fur + breath, edge: fur - 0.17, soft: r * 0.17, bloom: r * 0.13 });
  thmBlob(...U(0, 0.08), r * 0.27, fur + 0.13 + breath, { ry: r * 0.4, a: 0.9 });                             // the chest
  for (const s of [-1, 1]) {
    thmBlob(...U(0.3 * s, 0.7), r * 0.17, fur + 0.05, { ry: r * 0.24, a: 0.7 });                              // haunches
    thmBlob(...U(0.15 * s, 0.96), r * 0.12, fur - 0.13, { ry: r * 0.06, set: true, a: 0.9 });                 // paws: cool
  }
  thmBlob(...U(0, 0.72), r * 0.03, fur - 0.16, { ry: r * 0.3, cold: true, a: 0.8 });                          // the gap between the front legs
  thmBlob(...U(hx, -0.53), r * 0.36, fur + 0.22, { ry: r * 0.29, hard: 0.3, a: 0.95 });                       // the face
  for (const s of [-1, 1]) {
    const e = s < 0 ? (o.ear ?? 0) : 0;
    thmBlob(...U((0.25 + 0.04 * e) * s + hx * 0.5, -0.83 + 0.07 * e), r * 0.085, fur + 0.2, { ry: r * 0.1, a: 0.85 });   // inside the ear: thin skin
    thmBlob(...U((0.31 + 0.07 * e) * s, -1.0 + 0.13 * e), r * 0.07, fur - 0.2, { cold: true, a: 0.75 });      // ear tips: cold
    if (!o.blink) thmBlob(...U(0.135 * s + hx * 1.6, -0.56), r * 0.058, o.eye ?? 0.97, { hard: 0.4, ry: r * 0.046 });     // eyes: the hottest point
  }
  thmBlob(...U(hx * 1.8, -0.41), r * 0.1, fur + 0.12, { ry: r * 0.075, set: true, a: 0.55 });                  // the muzzle: fur again
  thmBlob(...U(hx * 2, -0.445), r * 0.042, fur - 0.24, { set: true, hard: 0.3, ry: r * 0.034 });               // a cold wet nose
}

// ---------------------------------------------------------------------
//  the camera HUD: thin white, drawn after the colour map (STYLE.post), at screen size
// ---------------------------------------------------------------------
let THM_Q = [], THM_SPOTS = [];   // this frame's HUD draws and extra measuring spots; emptied by STYLE.post every frame
const thmSafe = () => (H > W * 1.2 ? { x0: 60, y0: 250, x1: 940, y1: 1500 } : { x0: 48, y0: 48, x1: W - 48, y1: H - 48 });
const thmHudOpt = (k, d = true) => (typeof THM_HUD !== 'undefined' && THM_HUD[k] != null ? THM_HUD[k] : d);
// a thin white path with a dark under-stroke: path() adds to the current path
function thmHudStroke(path, w = 2.5, al = 1) {
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.globalAlpha = al; ctx.beginPath(); path();
  ctx.strokeStyle = THM.hudD; ctx.lineWidth = w + 2.5; ctx.stroke(); ctx.strokeStyle = THM.hud; ctx.lineWidth = w; ctx.stroke(); ctx.restore();
}
function thmHudFont(size, weight = 400) { ctx.font = `${weight} ${size}px ${THM_FONT}`; }
function thmHudW(str, size, weight) { ctx.save(); thmHudFont(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// HUD text. o: align, al, weight, n (type-on: characters shown), c
function thmHudText(str, x, y, size, o = {}) {
  const s = o.n != null ? String(str).slice(0, Math.max(0, Math.floor(o.n))) : String(str); if (!s.trim()) return 0;
  ctx.save(); thmHudFont(size, o.weight); ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = o.al ?? 1; ctx.lineJoin = 'round';
  ctx.strokeStyle = THM.hudD; ctx.lineWidth = Math.max(3, size * 0.14); ctx.strokeText(s, x, y);
  ctx.fillStyle = o.c ?? THM.hud; ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}
const thmFmt = (deg, unit = thmHudOpt('unit', '°C')) => deg.toFixed(1) + unit;
// the scale: the ramp as a vertical bar, the frame's max above it and min below, carets where they sit in the span
function thmScaleBar(x, y, w, h, o = {}) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y + h, 0, y); THM.stops.forEach(([t, c]) => g.addColorStop(t, c));
  ctx.fillStyle = THM.hudD; ctx.fillRect(x - 3, y - 3, w + 6, h + 6); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  thmHudStroke(() => { ctx.rect(x - 1, y - 1, w + 2, h + 2); for (let i = 1; i < 8; i++) { const ty = y + h * i / 8; ctx.moveTo(x - (i % 2 ? 6 : 12), ty); ctx.lineTo(x - 1, ty); } }, 1.5);
  for (const t of [o.tmax, o.tmin]) if (t != null) { const ty = y + h * (1 - clamp(t)); ctx.save(); ctx.fillStyle = THM.hud; ctx.strokeStyle = THM.hudD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 16, ty); ctx.lineTo(x - 30, ty - 8); ctx.lineTo(x - 30, ty + 8); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); }
  if (o.max != null) thmHudText(o.max, x + w + 2, y - 18, o.size ?? 30, { align: 'right' });
  if (o.min != null) thmHudText(o.min, x + w + 2, y + h + 42, o.size ?? 30, { align: 'right' });
}
// the centre crosshair with its spot reading
function thmCross(x, y, reading, o = {}) {
  const g = o.gap ?? 12, l = o.len ?? 26;
  thmHudStroke(() => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * g, y + dy * g); ctx.lineTo(x + dx * (g + l), y + dy * (g + l)); } ctx.rect(x - 1.5, y - 1.5, 3, 3); }, 3);
  if (reading != null) thmHudText(reading, x + g + l - 2, y - g - 8, o.size ?? 40);
}
// the hottest-point marker (up = true) or coldest (up = false): a small open box with a triangle on it. No text: its value is the scale's max / min.
function thmMark(x, y, up = true, s = 15) {
  const d = up ? -1 : 1;
  thmHudStroke(() => { for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(x + sx * s, y + sy * s * 0.4); ctx.lineTo(x + sx * s, y + sy * s); ctx.lineTo(x + sx * s * 0.4, y + sy * s); } ctx.moveTo(x - 8, y + d * (s + 18)); ctx.lineTo(x + 8, y + d * (s + 18)); ctx.lineTo(x, y + d * (s + 5)); ctx.closePath(); }, 2.5);
}
function thmBrackets(S = thmSafe(), l = 44) {
  thmHudStroke(() => { for (const [cx, cy, sx, sy] of [[S.x0 + 4, S.y0 + 4, 1, 1], [S.x1 - 4, S.y0 + 4, -1, 1], [S.x0 + 4, S.y1 - 4, 1, -1], [S.x1 - 4, S.y1 - 4, -1, -1]]) { ctx.moveTo(cx + sx * l, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * l); } }, 2.5, 0.95);
}
// an extra measuring spot at a world point: a small box with a label; its reading is measured from the frame in post.
// o: label, dx, dy (where the text sits from the box), align, size
function thmSpot(x, y, o = {}) {
  const k = thmBridgeK(); if (k < 0.5) return;
  const [sx, sy] = toScreen(x, y); THM_SPOTS.push({ x: sx, y: sy, label: o.label ?? 'Sp', dx: o.dx ?? 22, dy: o.dy ?? -18, size: o.size ?? 28, al: o.al ?? 1, align: o.align ?? ((o.dx ?? 22) < 0 ? 'right' : 'left') });
}
// captions are HUD text, typed on: 'POUR THE *HEAT*' (the starred word sits in an inverse box). Through DEFER, drawn in post.
// o: x, y (baseline), size, at (seconds after the era starts), cps
function thmCaption(str, o = {}) {
  const f = () => {
    const at = E0 + (o.at ?? 0.5), k = thmBridgeK(); if (k <= 0 || TT < at - 1e-6) return;
    const size = o.size ?? 50, y = o.y ?? 1424, cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2);
    const toks = String(str).toUpperCase().split('*').map((s, i) => ({ s, hi: i % 2 === 1 })).filter((t) => t.s), n0 = Math.floor((TT - at) * (o.cps ?? 30)) + 1;
    THM_Q.push(() => {
      ctx.save(); thmHudFont(size, 500); const cw = ctx.measureText('M').width; ctx.restore();
      const total = toks.reduce((a, t) => a + t.s.length, 0); let x = cx - total * cw / 2, n = n0;
      for (const t of toks) {
        const m = Math.min(t.s.length, n); n -= m;
        if (m > 0 && t.hi) {
          const tr = t.s.trim(), lead = t.s.length - t.s.trimStart().length, shown = clamp(m - lead, 0, tr.length), bx = x + lead * cw - cw * 0.28;
          if (shown > 0) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = THM.hudD; ctx.fillRect(bx - 3, y - size * 0.9 - 3, shown * cw + cw * 0.56 + 6, size * 1.2 + 6); ctx.fillStyle = THM.hud; ctx.fillRect(bx, y - size * 0.9, shown * cw + cw * 0.56, size * 1.2); thmHudFont(size, 700); ctx.fillStyle = THM.hudInk; ctx.textBaseline = 'alphabetic'; ctx.fillText(tr.slice(0, shown), x + lead * cw, y); ctx.restore(); }
        } else if (m > 0) thmHudText(t.s, x, y, size, { n: m, al: k, weight: 500 });
        x += t.s.length * cw;
      }
      if (n0 <= total && Math.floor(TT * 6) % 2 === 0) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = THM.hud; ctx.fillRect(cx - total * cw / 2 + Math.min(n0, total) * cw + 4, y - size * 0.78, cw * 0.55, size * 0.95); ctx.restore(); }
    });
  };
  if (DEFER) DEFER.push(f); else f();
}
// the era's label, under the camera's mode line (top left)
function thmTag(str, o = {}) {
  const f = () => { const at = E0 + (o.at ?? 0.2), k = thmBridgeK(); if (k <= 0 || TT < at - 1e-6) return; const S = thmSafe(), n = Math.floor((TT - at) * 30) + 1; THM_Q.push(() => thmHudText(String(str).toUpperCase(), o.x ?? S.x0 + 24, o.y ?? S.y0 + 98, o.size ?? 34, { n, al: k, weight: 500 })); };
  if (DEFER) DEFER.push(f); else f();
}
// any other HUD text or drawing at a world point: fn(sx, sy) runs in post, in screen space
function thmHud(x, y, fn) { const k = thmBridgeK(); if (k < 0.5) return; const [sx, sy] = toScreen(x, y); THM_Q.push(() => fn(sx, sy)); }

// ---------------------------------------------------------------------
//  the sensor: shrink, measure, colour-map with noise, scale back up
// ---------------------------------------------------------------------
const THM_CV = {};
function thmCv(name, w, h, read) { let c = THM_CV[name]; if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; c.g = c.getContext('2d', read ? { willReadFrequently: true } : undefined); THM_CV[name] = c; } return c; }
const THM_OFF = {};   // the fixed pattern (per pixel, row and column) and the vignette, in grey levels; a new pattern after every NUC
function thmOffsets(lw, lh, seed) {
  const k = lw + 'x' + lh + ':' + seed; if (THM_OFF[k]) return THM_OFF[k];
  const o = new Float32Array(lw * lh), R = RNG('thmfpn', seed), row = new Float32Array(lh), col = new Float32Array(lw);
  for (let y = 0; y < lh; y++) row[y] = R.n(THM.band) + 0.6 * Math.sin(y * 0.11 + seed);
  for (let x = 0; x < lw; x++) col[x] = R.n(THM.band * 0.6);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const dx = (x / lw - 0.5) * 2, dy = (y / lh - 0.5) * 2, v = (dx * dx + dy * dy) / 2; o[y * lw + x] = R.n(THM.fpn) + row[y] + col[x] - THM.vig * v * v * 2; }
  return (THM_OFF[k] = o);
}
// the shutter (NUC): for two frames the sensor sees its own shutter, so the picture goes nearly flat; then a fresh fixed pattern
function thmNucAt() {
  const N = typeof THM_NUC !== 'undefined' ? THM_NUC : []; let count = 0, flat = 1, since = 1e9;
  for (const t of N) { const f = Math.round(t * FPS); if (F >= f) { count++; since = Math.min(since, F - f); if (F === f) flat = 0.22; else if (F === f + 1) flat = 0.55; } }
  return { count, flat, since };
}
function thmSense() {
  const cv = ctx.canvas, lw = Math.ceil(W / THM.res), lh = Math.ceil(H / THM.res);
  const half = thmCv('half', Math.ceil(W / 2), Math.ceil(H / 2)), low = thmCv('low', lw, lh, true);
  half.g.imageSmoothingEnabled = true; half.g.drawImage(cv, 0, 0, half.width, half.height);
  low.g.imageSmoothingEnabled = true; low.g.drawImage(half, 0, 0, lw, lh);
  const img = low.g.getImageData(0, 0, lw, lh), d = img.data, N = lw * lh, S = thmSafe(), kx = lw / W, ky = lh / H;
  // measure the clean field inside the frame brackets: max, min, where the hottest and coldest points are
  const x0 = Math.floor(S.x0 * kx) + 2, x1 = Math.ceil(S.x1 * kx) - 2, y0 = Math.floor(S.y0 * ky) + 2, y1 = Math.ceil(S.y1 * ky) - 2;
  let mx = -1, mn = 256, mxi = 0, mni = 0, sum = 0;
  for (let y = y0; y < y1; y++) for (let x = x0, i = y * lw + x0; x < x1; x++, i++) { const g = d[i * 4]; sum += g; if (g > mx) { mx = g; mxi = i; } if (g < mn) { mn = g; mni = i; } }
  const centre = (idx, sign, ref) => {   // the middle of the plateau round an extreme, so the marker does not sit on its corner
    const px = idx % lw, py = Math.floor(idx / lw); let sx = 0, sy = 0, n = 0;
    for (let y = Math.max(y0, py - 14); y < Math.min(y1, py + 15); y++) for (let x = Math.max(x0, px - 14); x < Math.min(x1, px + 15); x++) if (sign * (d[(y * lw + x) * 4] - ref) >= -3) { sx += x; sy += y; n++; }
    return [(sx / n + 0.5) / kx, (sy / n + 0.5) / ky];
  };
  const at = (sx, sy) => { const px = clamp(Math.round(sx * kx), 1, lw - 2), py = clamp(Math.round(sy * ky), 1, lh - 2); let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += d[((py + j) * lw + px + i) * 4]; return s / 9 / 255; };
  const M = { max: mx / 255, min: mn / 255, hot: centre(mxi, 1, mx), cold: centre(mni, -1, mn), at, mean: sum / Math.max(1, (x1 - x0) * (y1 - y0)) / 255 };
  M.spots = THM_SPOTS.map((s) => ({ ...s, t: at(s.x, s.y) }));
  M.cx = (S.x0 + S.x1) / 2; M.cy = (S.y0 + S.y1) / 2; M.spot = at(M.cx, M.cy);
  // colour-map through the ramp with the sensor's noise: fixed pattern, row / column banding, a slow rolling band, a vignette
  const nuc = thmNucAt(), off = thmOffsets(lw, lh, nuc.count), L = THM_LUT, flat = nuc.flat, mean = M.mean * 255 + (1 - flat) * 26;
  const roll = mod(TT * 70, lh + 80) - 40; let s = (Math.imul(F + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
  for (let y = 0, i = 0; y < lh; y++) {
    const rb = 1.3 * Math.exp(-(((y - roll) / 12) ** 2));
    for (let x = 0; x < lw; x++, i++) {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      let g = d[i * 4]; if (flat < 1) g = mean + (g - mean) * flat;
      let v = ((g + off[i] + rb + ((s & 1023) / 1023 - 0.5) * 2 * THM.noise) * 4.012 + ((s >>> 12) & 3)) | 0;
      v = (v < 0 ? 0 : v > 1023 ? 1023 : v) * 3;
      d[i * 4] = L[v]; d[i * 4 + 1] = L[v + 1]; d[i * 4 + 2] = L[v + 2]; d[i * 4 + 3] = 255;
    }
  }
  low.g.putImageData(img, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(low, 0, 0, cv.width, cv.height); ctx.restore();
  M.nuc = nuc;
  return M;
}
// the camera's own HUD, from the measurement M
function thmAutoHud(M) {
  const S = thmSafe(), span = thmSpanAt(), deg = (t) => thmFmt(thmDeg(t, span)), small = Math.round(26 * Math.min(1, (S.x1 - S.x0) / 880));
  if (thmHudOpt('brackets')) thmBrackets(S);
  if (thmHudOpt('bar')) { const bh = Math.min(700, (S.y1 - S.y0) * 0.56); thmScaleBar(S.x1 - 58, S.y0 + 196, 20, bh, { max: deg(M.max), min: deg(M.min), tmax: M.max, tmin: M.min }); }
  if (thmHudOpt('hot') && M.max - M.mean > 0.06) thmMark(M.hot[0], M.hot[1], true);
  if (thmHudOpt('cold', false) && M.mean - M.min > 0.06) thmMark(M.cold[0], M.cold[1], false);
  if (thmHudOpt('cross')) thmCross(M.cx, M.cy, deg(M.spot));
  for (const s of M.spots) {
    thmHudStroke(() => ctx.rect(s.x - 13, s.y - 13, 26, 26), 2.5, s.al);
    thmHudText(`${s.label} ${deg(s.t)}`, s.x + s.dx, s.y + s.dy, s.size, { al: s.al, align: s.align });
  }
  if (thmHudOpt('mode')) thmHudText(`IR  IRON  ε${THM.emis.toFixed(2)}`, S.x0 + 24, S.y0 + 52, small);
  if (thmHudOpt('clock')) {
    const sec = Math.floor(F / FPS), fr = F % FPS, p2 = (n) => String(n).padStart(2, '0');
    thmHudText(`${p2(Math.floor(sec / 60))}:${p2(sec % 60)}:${p2(fr)}  ${Math.round(span[0])}–${Math.round(span[1])}${thmHudOpt('unit', '°C')}`, S.x0 + 24, S.y1 - 18, small - 2);
    if (M.nuc.since < FPS * 0.4) thmHudText('NUC', S.x1 - 24, S.y1 - 18, small - 2, { align: 'right', weight: 700 });
  }
}

// =====================================================================
//  STYLE — the renderer's hooks. Colours arrive as temperature greys ('#rrggbb' or 'rgb()' mid-morph): thmTemp reads both.
// =====================================================================
const STYLE = {
  name: 'thermal',
  paper: thmC(THM.amb),                                                  // an empty room at room temperature
  backdrop(c) { ctx.save(); screen(); thmAmbient(thmTemp(c), { key: 'paper' }); ctx.restore(); },   // the backdrop is a temperature
  window(P, key, src) {                                                 // the old / new world through the object's outline; the edge is feathered, because heat has no hard edges
    const c = thmCen(P), bb = bbox(P), dim = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0), far = dim > Math.max(W, H) * 2.2;
    for (const [px, al] of far ? [[0, 1]] : [[34, 0.3], [22, 0.45], [11, 0.6], [0, 1]]) {
      const k = 1 + px * 2 / dim;
      ctx.save(); ctx.globalAlpha = al; trace(P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]), true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    }
  },
  blob(P, c, key, u = 0) {                                               // a heat body whose temperature (not hue) changes; it flares a little mid-morph
    const t = thmTemp(c), k = Math.sin(Math.PI * clamp(u));
    thmBody(P, { t: t + 0.05 * k, edge: t - 0.16, soft: 46, bloom: 44 + 26 * k, halo: 0.22 });
  },
  hero(x, y, r, o = {}) { thmCat(x, y, r * 0.95, { key: o.key }); },    // r = half the hero's size
  heroColor: thmC(0.6),
  heroPts(x, y, r) { return thmCatPts(x, y, r * 0.95); },
  post() { const M = thmSense(); thmAutoHud(M); for (const f of THM_Q) f(); THM_Q = []; THM_SPOTS = []; },
  ones: true,                                                            // heat moves smoothly: on 1s
};
