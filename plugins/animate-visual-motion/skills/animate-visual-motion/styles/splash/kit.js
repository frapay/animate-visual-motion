// =====================================================================
//  styles/splash/kit.js — a high-speed "freeze-frame" drink / food commercial.
//  Built on kit/core.js. A saturated, glowing ground in ONE flavour colour with a hot spot behind the product; an
//  invented product in the middle (can, glass bottle, carton, pouch, tall glass) with a glossy body, rim lights on
//  both edges, a made-up label and cold condensation; round it a crown of liquid tongues ending in detached beads,
//  fruit wheels, mint, ice cubes, bubbles and a few out-of-focus drops in front. Heavy rounded type, tilted, and a
//  pill badge. Everything erupts on the beat and then hangs in near-freeze slow motion (spFreeze).
//  Optional piece constant (anywhere in the piece): SPL_FLAVOR = 'citrus' | 'lime' | 'berry' | 'ice' | 'cola'.
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const SPL = {
  paper: '#ffc61a',                   // the flash a morph happens on: sunny yellow
  cream: '#fff8ea', silver: '#e4eaf0',
  // a flavour: deep (shade of the ground, badges), base (the ground), hi (the glow), hot (the hot spot),
  //            liq / liqHi / liqLo (the liquid: body, thin backlit parts, thick parts), ink (type shadow, vignette)
  fl: {
    citrus: { name: 'citrus', deep: '#d43a00', base: '#ff7a00', hi: '#ffb700', hot: '#fff0a8', liq: '#ffa000', liqHi: '#ffe07a', liqLo: '#d95a00', ink: '#7a1c00' },
    lime:   { name: 'lime',   deep: '#0c7a2a', base: '#35b82e', hi: '#b8e82a', hot: '#f4ffb0', liq: '#7fcc14', liqHi: '#dcfb7a', liqLo: '#268a10', ink: '#0a4a1c' },
    berry:  { name: 'berry',  deep: '#8a0a52', base: '#e6197e', hi: '#ff6aa8', hot: '#ffe1ee', liq: '#f0306e', liqHi: '#ffa6c6', liqLo: '#a80a4c', ink: '#56063a' },
    ice:    { name: 'ice',    deep: '#0b3fa6', base: '#1790ea', hi: '#6fd4ff', hot: '#ecfaff', liq: '#58c4f6', liqHi: '#d6f4ff', liqLo: '#1470c8', ink: '#082a6e' },
    cola:   { name: 'cola',   deep: '#2c0805', base: '#8a1f10', hi: '#d8502a', hot: '#ffd2a0', liq: '#6a2410', liqHi: '#e08a4a', liqLo: '#2e0c06', ink: '#1c0503' },
  },
};
const SP_SANS = '"Arial Rounded MT Bold", "Nunito ExtraBold", "Varela Round", "Segoe UI Black", "Arial Black", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
const SP_FRUIT = {
  orange:     { rind: '#ff8a00', rindD: '#d96200', pith: '#fff1c9', flesh: '#ffa81a', fleshHi: '#ffd768', fleshD: '#f08400', n: 10 },
  lime:       { rind: '#43a01e', rindD: '#2b7412', pith: '#f0f8c4', flesh: '#a6d638', fleshHi: '#dcf284', fleshD: '#7cb61c', n: 9 },
  lemon:      { rind: '#ffd21a', rindD: '#dea400', pith: '#fff9d6', flesh: '#ffe85a', fleshHi: '#fff6a8', fleshD: '#f0c41e', n: 9 },
  grapefruit: { rind: '#ffa24a', rindD: '#e2741a', pith: '#ffe9cf', flesh: '#ff6a5a', fleshHi: '#ffa090', fleshD: '#e6463a', n: 11 },
};

// ---------------------------------------------------------------------
//  colour, timing
// ---------------------------------------------------------------------
const spRGB = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
const spHex = (v) => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
const spMix = (a, b, u) => { const x = spRGB(a), y = spRGB(b); return spHex(x.map((v, i) => lerp(v, y[i], u))); };
const spA = (c, al) => { const [r, g, b] = spRGB(c); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(al).toFixed(4)})`; };
const spW = (al) => `rgba(255,255,255,${clamp(al).toFixed(4)})`;
const spK = (al) => `rgba(0,0,0,${clamp(al).toFixed(4)})`;
// a flavour from a name, a flavour object, or any base colour (hex, or the renderer's rgb() blend mid-morph)
function spFlavor(f) {
  if (f && typeof f === 'object') return f;
  const name = f ?? (typeof SPL_FLAVOR !== 'undefined' ? SPL_FLAVOR : 'citrus');
  if (SPL.fl[name]) return SPL.fl[name];
  const base = spHex(spRGB(name)), preset = Object.values(SPL.fl).find((p) => p.base === base);
  if (preset) return preset;
  return { name: 'custom', base, deep: spMix(base, '#2a0a00', 0.34), hi: spMix(base, '#fff36a', 0.5), hot: spMix(base, '#ffffff', 0.82),
    liq: spMix(base, '#ffe07a', 0.25), liqHi: spMix(base, '#ffffff', 0.62), liqLo: spMix(base, '#3a0010', 0.38), ink: spMix(base, '#000000', 0.62) };
}
const spFruitOf = (f) => ({ citrus: 'orange', lime: 'lime', berry: 'grapefruit', ice: 'lemon', cola: 'lemon' }[spFlavor(f).name] ?? 'orange');
// the freeze: t seconds after the eruption -> 0..1 very fast, then a very slow drift on past 1 (the hang)
const spFreeze = (t, k = 9, drift = 0.03) => (t <= 0 ? 0 : (1 - Math.exp(-t * k)) * (1 + drift * t));
// something thrown out of the eruption: from -> to on the freeze curve. Returns [x, y, g]
function spFly(t, from, to, o = {}) { const g = spFreeze(t, o.k ?? 8, o.drift ?? 0.035); return [lerp(from[0], to[0], g), lerp(from[1], to[1], g) + (o.sag ?? 0) * Math.max(0, t) ** 2, g]; }
function spBridgeK() {                                                   // 1 outside bridges, 0 inside: type steps aside for the morph
  if (typeof BRIDGES === 'undefined') return 1;
  let k = 1; for (const r of BRIDGES) k = Math.min(k, clamp((Math.abs(TT - r.tc) - (r.d ?? 0.6)) / 0.15));
  return k;
}

// ---------------------------------------------------------------------
//  the ground: one flavour colour, a hot spot behind the product, soft rays, a vignette in the flavour's ink
// ---------------------------------------------------------------------
// o: cx, cy (the hot spot, world coords), r, rays (false = none), a (hot spot strength), vig
function spGround(f, o = {}) {
  const fl = spFlavor(f), cx = o.cx ?? W / 2, cy = o.cy ?? H * 0.47, r = o.r ?? Math.max(W, H) * 0.5, a = clamp(o.a ?? 1);
  ctx.save(); screen();
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, spMix(fl.base, fl.deep, 0.4)); g.addColorStop(0.42, fl.base); g.addColorStop(1, fl.deep);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save();
  g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, spA(fl.hot, a)); g.addColorStop(0.2, spA(fl.hi, 0.92 * a)); g.addColorStop(0.52, spA(fl.hi, 0.36 * a)); g.addColorStop(1, spA(fl.hi, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  if (o.rays !== false) {                                                // a slow fan of light behind everything
    const n = 14, rot = TT * 0.05 + 0.3, rg = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.5);
    rg.addColorStop(0, spA(fl.hot, 0)); rg.addColorStop(0.22, spA(fl.hot, 0.2 * a)); rg.addColorStop(1, spA(fl.hot, 0));
    ctx.fillStyle = rg; ctx.beginPath();
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU + rot, da = TAU / n * (i % 2 ? 0.18 : 0.32); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * 1.5, a0 - da, a0 + da); ctx.closePath(); }
    ctx.fill();
  }
  ctx.restore();
  ctx.save(); screen();
  g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.5, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, spA(fl.ink, 0)); g.addColorStop(1, spA(fl.ink, o.vig ?? 0.55)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// bubbles rising through a region (world coords). o: x0, x1, y0, y1, rmin, rmax, sp, a
function spBubbles(key, n, o = {}) {
  const x0 = o.x0 ?? 40, x1 = o.x1 ?? W - 40, y0 = o.y0 ?? 120, y1 = o.y1 ?? H - 120, R = RNG('spbub', key);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const bx = R.r(x0, x1), v0 = R.f(), sp = R.r(0.05, 0.14) * (o.sp ?? 1), r = R.r(o.rmin ?? 5, o.rmax ?? 17), ph = R.r(0, TAU), wob = R.r(5, 16), k = R.r(0.45, 0.95);
    const v = mod(v0 + TT * sp, 1), x = bx + Math.sin(TT * 1.3 + ph) * wob, y = lerp(y1, y0, v), al = (o.a ?? 1) * k * Math.sin(Math.PI * v) ** 0.5;
    if (al <= 0.01) continue;
    ctx.fillStyle = spW(0.08 * al); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.15); ctx.strokeStyle = spW(0.62 * al); ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.2, r * 0.13); ctx.strokeStyle = spW(0.4 * al); ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0.15 * Math.PI, 0.6 * Math.PI); ctx.stroke();
    ctx.fillStyle = spW(0.95 * al); ctx.beginPath(); ctx.arc(x - r * 0.36, y - r * 0.36, Math.max(1.2, r * 0.2), 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// out-of-focus foreground drops: large, soft, low alpha, drifting up slowly. Drawn last. o: rmin, rmax, a, mid (true = anywhere, default = toward the edges)
function spBokeh(key, n, f, o = {}) {
  const fl = spFlavor(f), R = RNG('spbokeh', key), c = spMix(fl.hot, '#ffffff', 0.55);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const side = R.f() < 0.5, x0 = o.mid ? R.r(0, W) : side ? R.r(-50, 230) : R.r(W - 230, W + 50), y0 = R.r(0, H), r = R.r(o.rmin ?? 46, o.rmax ?? 118), al = R.r(0.1, 0.2) * (o.a ?? 1), sp = R.r(7, 24), ph = R.r(0, TAU);
    const x = x0 + Math.sin(TT * 0.4 + ph) * 22, y = mod(y0 - TT * sp, H + 2 * r) - r, g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, spA(c, al * 0.5)); g.addColorStop(0.7, spA(c, al * 0.58)); g.addColorStop(0.9, spA(c, al)); g.addColorStop(1, spA(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const h = ctx.createRadialGradient(x - r * 0.3, y - r * 0.32, 0, x - r * 0.3, y - r * 0.32, r * 0.3);
    h.addColorStop(0, spW(al * 1.1)); h.addColorStop(1, spW(0)); ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.32, r * 0.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  liquid: tapered ribbons with a lit side and a shaded side, beads, the crown, a swoosh
// ---------------------------------------------------------------------
// a closed outline round a centreline C with half-width wf(k), k 0..1, and a round tip
function spRibbonPts(C, wf) {
  const n = C.length, Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, hw = wf(i / (n - 1));
    Lp.push([C[i][0] - dy / l * hw, C[i][1] + dx / l * hw]); Rp.push([C[i][0] + dy / l * hw, C[i][1] - dx / l * hw]);
  }
  const a = C[n - 2], b = C[n - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hw = wf(1), cap = [];
  for (let j = 1; j < 6; j++) { const t = ang + Math.PI / 2 - j / 6 * Math.PI; cap.push([b[0] + Math.cos(t) * hw * 1.05, b[1] + Math.sin(t) * hw * 1.05]); }
  return [...Lp, ...cap, ...Rp.reverse()];
}
// a ribbon of liquid along C: thick parts dark, thin tips backlit, one white highlight, one shaded side. o: a, hi (highlight alpha)
function spLiquid(C, wf, f, o = {}) {
  const fl = spFlavor(f), P = spRibbonPts(C, wf), n = C.length, a = C[0], b = C[n - 1], g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, spMix(fl.liqLo, fl.liq, 0.35)); g.addColorStop(0.5, fl.liq); g.addColorStop(1, spMix(fl.liq, fl.liqHi, 0.75));
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; trace(P, true); ctx.fillStyle = g; ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, wf(0.3) * 0.1); ctx.strokeStyle = spA(fl.liqLo, 0.45); ctx.stroke();   // liquid darkens at its edge
  const m = Math.floor(n / 2), mdx = C[m + 1][0] - C[m - 1][0], mdy = C[m + 1][1] - C[m - 1][1], lit = (-mdy * -0.6 + mdx * -0.8) >= 0 ? 1 : -1;
  const side = (s, k0, k1, off) => { ctx.beginPath(); let on = false; for (let i = 1; i < n - 1; i++) { const k = i / (n - 1); if (k < k0 || k > k1) continue; const p = C[i - 1], q = C[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, hw = wf(k) * off * s; const x = C[i][0] - dy / l * hw, y = C[i][1] + dx / l * hw; if (on) ctx.lineTo(x, y); else { ctx.moveTo(x, y); on = true; } } };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  side(-lit, 0.06, 0.7, 0.56); ctx.lineWidth = Math.max(2, wf(0.35) * 0.34); ctx.strokeStyle = spA(fl.liqLo, 0.5); ctx.stroke();
  side(lit, 0.1, 0.76, 0.5); ctx.lineWidth = Math.max(2, wf(0.45) * 0.24); ctx.strokeStyle = spW(o.hi ?? 0.78); ctx.stroke();
  ctx.restore();
}
// a detached bead of liquid. o: rot, st (stretch along rot), a
function spBead(x, y, r, f, o = {}) {
  if (r <= 0.6) return;
  const fl = spFlavor(f);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(o.st ?? 1, 1); ctx.globalAlpha *= o.a ?? 1;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.08, 0, 0, r);
  g.addColorStop(0, fl.liqHi); g.addColorStop(0.55, fl.liq); g.addColorStop(1, fl.liqLo);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.lineCap = 'round'; ctx.lineWidth = r * 0.16; ctx.strokeStyle = spA(fl.hot, 0.6); ctx.beginPath(); ctx.arc(0, 0, r * 0.66, 0.12 * Math.PI, 0.62 * Math.PI); ctx.stroke();
  ctx.fillStyle = spW(0.95); ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.38, r * 0.24, r * 0.17, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
// the crown: a ring of liquid at (x, y) throwing up tapered tongues that end in detached beads, plus spray.
// t = seconds since it erupted. Draw part 'back' before the product and 'front' after it, so the product stands in the crown.
// o: R (ring radius), h (tongue height), n (tongues), sq (ring squash), part 'back' | 'front' | 'all', key, spray (beads thrown), k, drift, pool (false = no disc)
function spSplash(x, y, t, f, o = {}) {
  const g = spFreeze(t, o.k ?? 9, o.drift ?? 0.03); if (g <= 0.003) return;
  const fl = spFlavor(f), key = o.key ?? 'crown', R0 = o.R ?? 280, h = o.h ?? 400, n = o.n ?? 13, sq = o.sq ?? 0.26, part = o.part ?? 'all';
  const R = R0 * (0.5 + 0.5 * g), wallH = h * 0.2 * g, slow = Math.max(0, t) * 0.05, S = RNG('spcrown', key), fast = Math.exp(-Math.max(0, t) * 7);
  const ring = (a) => [x + Math.cos(a) * R, y + Math.sin(a) * R * sq];
  const T = [], D = [];
  for (let i = 0; i < n; i++) { const a = (i + S.n(0.28)) / n * TAU; T.push({ a, len: S.r(0.5, 1.05), wb: S.r(0.15, 0.23), lean: S.r(0.28, 0.6), nb: S.i(1, 3), ph: S.r(0, TAU), back: Math.sin(a) < 0 }); }
  // the sheet between the tongues: it climbs into each tongue's root and sags between them
  const top = (a) => { const p = ring(a); let b = 0; for (const tg of T) { const d = mod(a - tg.a + Math.PI, TAU) - Math.PI; b += tg.len * Math.exp(-((d / 0.3) ** 2)); } b = Math.min(1.15, b * 0.8); return [p[0] + Math.cos(a) * wallH * 0.3 * b, p[1] - wallH * (0.45 + 0.75 * b)]; };
  for (let i = 0; i < (o.spray ?? 22); i++) D.push({ ang: -Math.PI / 2 + S.n(1.2), d: S.r(0.55, 1.75), r: S.r(4, 15), back: S.f() < 0.6 });
  T.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  const wall = (a0, a1, front) => {
    const P = []; for (let i = 0; i <= 48; i++) P.push(top(lerp(a0, a1, i / 48))); for (let i = 26; i >= 0; i--) P.push(ring(lerp(a0, a1, i / 26)));
    const gy = ctx.createLinearGradient(0, y - R * sq - wallH, 0, y + R * sq);
    gy.addColorStop(0, front ? fl.liqHi : fl.liq); gy.addColorStop(front ? 0.5 : 0.7, front ? fl.liq : fl.liqLo); gy.addColorStop(1, spMix(fl.liqLo, fl.liq, front ? 0.5 : 0));
    ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = gy; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = spA(fl.liqLo, 0.4); ctx.stroke();
    if (front) { ctx.beginPath(); for (let i = 3; i <= 45; i++) { const p = top(lerp(a0, a1, i / 48)); if (i === 3) ctx.moveTo(p[0], p[1] + 7); else ctx.lineTo(p[0], p[1] + 7); } ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = spW(0.7); ctx.stroke(); }
  };
  const tongue = (tg) => {
    const c = Math.cos(tg.a), b0 = ring(tg.a), L = h * tg.len * g * (tg.back ? 1 : 0.6), wb = R0 * tg.wb * (0.55 + 0.45 * g), curl = 0.14 + slow * 1.4, lean = tg.lean * (1 + slow);
    const pt = (k) => [b0[0] + c * L * (lean * k + 0.24 * k * k), b0[1] - L * k + L * curl * k * k];
    const C = []; for (let i = 0; i <= 14; i++) C.push(pt(i / 14));
    const wf = (k) => wb * (0.2 + 0.8 * (1 - k) ** 1.2) * (1 + 0.1 * Math.sin(k * 7 + tg.ph)) + wb * 0.2 * Math.exp(-(((k - 0.9) / 0.1) ** 2));
    spLiquid(C, wf, fl);
    for (let j = 0; j < tg.nb; j++) {                                   // the detached beads: they keep going, drawing apart slowly
      const k = 1 + (0.15 + 0.2 * j) * (0.75 + 7 * slow) * (0.4 + 0.6 * g), p = pt(k), q = pt(k + 0.02);
      spBead(p[0], p[1], wb * (0.42 - 0.1 * j), fl, { rot: Math.atan2(q[1] - p[1], q[0] - p[0]), st: 1 + 0.25 * (2 - j) * 0.5 + fast });
    }
  };
  const spray = (back) => D.forEach((d) => {
    if (d.back !== back) return;
    const dd = d.d * h * g, px = x + Math.cos(d.ang) * dd * 1.05, py = y - R * sq * 0.3 + Math.sin(d.ang) * dd + slow * dd * 0.5;
    spBead(px, py, d.r * (0.5 + 0.5 * g), fl, { rot: d.ang, st: 1 + 2.4 * fast });
  });
  ctx.save();
  if (part !== 'front') {
    wall(Math.PI, TAU, false);
    if (o.pool !== false) { const pg = ctx.createRadialGradient(x, y, 0, x, y, R); pg.addColorStop(0, fl.liq); pg.addColorStop(0.7, spMix(fl.liq, fl.liqLo, 0.6)); pg.addColorStop(1, fl.liqLo); ctx.save(); ctx.translate(0, y); ctx.scale(1, sq); ctx.translate(0, -y); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.restore(); }
    T.filter((tg) => tg.back).forEach(tongue); spray(true);
  }
  if (part !== 'back') { T.filter((tg) => !tg.back).forEach(tongue); wall(0, Math.PI, true); spray(false); }
  ctx.restore();
}
// an arc of liquid thrown round a centre: thick in the middle, tapered at both ends, beads flying off the leading end.
// o: u (0..1 how far it has grown), sq, key, a
function spSwoosh(cx, cy, r, a0, a1, wd, f, o = {}) {
  const u = clamp(o.u ?? 1); if (u <= 0.03) return;
  const ph = (o.key ?? 'sw').length * 1.7, m = 30, C = [], ae = lerp(a0, a1, u), sq = o.sq ?? 1;
  const pt = (a, k) => { const rr = r * (1 + 0.05 * Math.sin(k * 7 + ph)); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]; };
  for (let i = 0; i <= m; i++) C.push(pt(lerp(a0, ae, i / m), i / m));
  const wf = (k) => wd * (0.14 + 0.86 * Math.sin(Math.PI * Math.min(1, k * 0.93 + 0.03)) ** 0.8) * (1 + 0.2 * Math.sin(k * 11 + ph));
  spLiquid(C, wf, f, o);
  const da = (a1 - a0) / Math.abs(a1 - a0 || 1) * wd / r;
  for (let j = 0; j < 3; j++) { const a = ae + da * (1.2 + 1.5 * j), p = pt(a, 1), q = pt(a + da * 0.1, 1); spBead(p[0], p[1], wd * (0.46 - 0.11 * j), f, { rot: Math.atan2(q[1] - p[1], q[0] - p[0]), st: 1.3, a: o.a }); }
}

// ---------------------------------------------------------------------
//  fruit, mint, ice
// ---------------------------------------------------------------------
// a citrus wheel: rind, pith, flesh segments with juice vesicles, a gloss. kind 'orange' | 'lime' | 'lemon' | 'grapefruit'.
// o: tilt (1 = face on, smaller = turned away: it shows its thickness), a, flat (true = printed on a pack: no shadow)
function spSlice(kind, x, y, r, rot = 0, o = {}) {
  const fr = SP_FRUIT[kind] ?? SP_FRUIT.orange, tilt = clamp(o.tilt ?? 1, 0.12, 1), n = fr.n, th = r * 0.2 * Math.sqrt(1 - tilt * tilt);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= o.a ?? 1;
  if (!o.flat) { ctx.shadowColor = spK(0.3); ctx.shadowBlur = r * 0.24; ctx.shadowOffsetY = r * 0.09; }
  ctx.fillStyle = fr.rindD; ctx.beginPath(); ctx.ellipse(0, th, r, r * tilt, 0, 0, TAU); ctx.rect(-r, 0, r * 2, th); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.scale(1, tilt);
  ctx.fillStyle = fr.rind; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = fr.pith; ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r * 0.86);
  g.addColorStop(0, fr.fleshHi); g.addColorStop(0.55, fr.flesh); g.addColorStop(1, fr.fleshD);
  ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineJoin = 'round'; ctx.lineWidth = r * 0.05;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU + 0.07, a1 = (i + 1) / n * TAU - 0.07, am = (a0 + a1) / 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(am) * r * 0.13, Math.sin(am) * r * 0.13); ctx.arc(0, 0, r * 0.8, a0, a1); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = spW(0.34); ctx.lineWidth = Math.max(1, r * 0.014); ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) for (let j = 1; j <= 3; j++) { const a = (i + j / 4) / n * TAU, r0 = r * (0.3 + 0.06 * ((i + j) % 3)), r1 = r * (0.62 + 0.05 * ((i * 2 + j) % 3)); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); }
  ctx.stroke();
  ctx.fillStyle = fr.pith; ctx.beginPath(); ctx.arc(0, 0, r * 0.065, 0, TAU); ctx.fill();
  ctx.strokeStyle = spW(0.8); ctx.lineWidth = r * 0.035; ctx.beginPath(); ctx.arc(0, 0, r * 0.962, -2.55, -1.75); ctx.stroke();
  ctx.fillStyle = spW(0.14); ctx.beginPath(); ctx.ellipse(-r * 0.26, -r * 0.3, r * 0.5, r * 0.26, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
// a strawberry: a red heart with seeds, a green calyx, a gloss. o: a, flat
function spBerry(x, y, r, rot = 0, o = {}) {
  const P = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; P.push([r * 0.84 * Math.sin(a) * (1 + 0.24 * Math.cos(a)), -r * Math.cos(a) * 0.98]); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= o.a ?? 1;
  if (!o.flat) { ctx.shadowColor = spK(0.3); ctx.shadowBlur = r * 0.24; ctx.shadowOffsetY = r * 0.09; }
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.15);
  g.addColorStop(0, '#ff5a48'); g.addColorStop(0.5, '#e4142a'); g.addColorStop(1, '#9c051c');
  trace(P, true); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); trace(P, true); ctx.clip();
  const S = RNG('spberry');
  for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
    const sx = (i - 2.5 + (j % 2) * 0.5) * r * 0.3, sy = (j - 2.2) * r * 0.3 + S.n(r * 0.03);
    ctx.fillStyle = spK(0.25); ctx.beginPath(); ctx.ellipse(sx + 1, sy + 2, r * 0.035, r * 0.055, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd96a'; ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.03, r * 0.05, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = spW(0.3); ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.34, r * 0.2, r * 0.36, 0.5, 0, TAU); ctx.fill();
  ctx.restore();
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(0, -r * 0.9); ctx.rotate((i - 2) * 0.62); ctx.fillStyle = i % 2 ? '#2f9a2c' : '#49b83a'; ctx.beginPath(); ctx.moveTo(0, r * 0.06); ctx.quadraticCurveTo(r * 0.2, -r * 0.1, 0, -r * 0.42); ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, 0, r * 0.06); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
// a mint leaf: serrated almond, two-tone, a pale midrib and side veins. r = half its length. o: bend, a, flat
function spLeaf(x, y, r, rot = 0, o = {}) {
  const m = 26, bend = (o.bend ?? 0.12) * r, up = [], dn = [], ax = (k) => [lerp(-r, r, k), -bend * Math.sin(Math.PI * k)], hw = (k) => r * 0.5 * Math.sin(Math.PI * k) ** 0.7 * (1 + 0.07 * Math.abs(Math.sin(k * Math.PI * 9)));
  for (let i = 0; i <= m; i++) { const k = i / m, p = ax(k), w = hw(k); up.push([p[0], p[1] - w]); dn.push([p[0], p[1] + w]); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= o.a ?? 1;
  if (!o.flat) { ctx.shadowColor = spK(0.28); ctx.shadowBlur = r * 0.2; ctx.shadowOffsetY = r * 0.08; }
  const g = ctx.createLinearGradient(0, -r * 0.55, 0, r * 0.5); g.addColorStop(0, '#8fe85a'); g.addColorStop(0.48, '#43b836'); g.addColorStop(0.52, '#2f9c30'); g.addColorStop(1, '#17702a');
  ctx.beginPath(); up.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); dn.reverse().forEach((p) => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(214,250,170,0.85)'; ctx.lineWidth = Math.max(1.5, r * 0.035);
  ctx.beginPath(); for (let i = 1; i < m; i++) { const p = ax(i / m); if (i === 1) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); } ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.02); ctx.strokeStyle = 'rgba(214,250,170,0.5)'; ctx.beginPath();
  for (let i = 1; i <= 5; i++) { const k = i / 6.4, p = ax(k), w = hw(k + 0.1) * 0.78; for (const s of [-1, 1]) { ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + r * 0.12, p[1] + s * w * 0.5, p[0] + r * 0.26, p[1] + s * w); } }
  ctx.stroke();
  ctx.fillStyle = spW(0.22); ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.2 - bend * 0.8, r * 0.42, r * 0.09, -0.08, 0, TAU); ctx.fill();
  ctx.restore();
}
// an ice cube: a clear rounded cube with three faces, refraction streaks, a ghost of its far corner, bright edges. o: tint (a flavour), a, flat
function spIce(x, y, r, rot = 0, o = {}) {
  const tint = o.tint ? spFlavor(o.tint).liqHi : '#bfeaff', V = [];
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i / 6 * TAU; V.push([Math.cos(a) * r, Math.sin(a) * r * 0.96]); }
  const P = resample(V, true, r * 0.3), poly = (Q) => { ctx.beginPath(); Q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= o.a ?? 1;
  if (!o.flat) { ctx.shadowColor = spK(0.22); ctx.shadowBlur = r * 0.3; ctx.shadowOffsetY = r * 0.1; }
  trace(P, true); ctx.fillStyle = spA('#f2fbff', 0.36); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); trace(P, true); ctx.clip();
  let g = ctx.createLinearGradient(-r, -r, r * 0.4, 0); g.addColorStop(0, spW(0.85)); g.addColorStop(1, spW(0.3));
  poly([V[5], V[0], V[1], [0, 0]]); ctx.fillStyle = g; ctx.fill();                                   // the top face
  poly([V[5], [0, 0], V[3], V[4]]); ctx.fillStyle = spA(tint, 0.42); ctx.fill();                      // the left face takes the drink's colour
  g = ctx.createLinearGradient(0, 0, r, r); g.addColorStop(0, spW(0.2)); g.addColorStop(1, spA('#2f86c8', 0.22));
  poly([[0, 0], V[1], V[2], V[3]]); ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = spW(0.34);                                                                          // refraction streaks
  poly([[-r * 0.62, r * 0.02], [-r * 0.46, r * 0.1], [-r * 0.46, r * 0.72], [-r * 0.62, r * 0.6]]); ctx.fill();
  poly([[r * 0.3, r * 0.2], [r * 0.4, r * 0.14], [r * 0.4, r * 0.74], [r * 0.3, r * 0.8]]); ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.2, r * 0.03); ctx.strokeStyle = spW(0.34);
  poly(V.map(([px, py]) => [px * 0.5 + r * 0.06, py * 0.5 + r * 0.14])); ctx.stroke();               // the far corner, seen through it
  ctx.fillStyle = spW(0.6); for (const [bx, by, br] of [[-0.2, 0.42, 0.045], [0.12, 0.6, 0.03], [-0.34, 0.2, 0.03], [0.55, 0.3, 0.035]]) { ctx.beginPath(); ctx.arc(bx * r, by * r, br * r, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.5, r * 0.045); ctx.strokeStyle = spW(0.72);
  ctx.beginPath(); for (const i of [1, 3, 5]) { ctx.moveTo(0, 0); ctx.lineTo(V[i][0] * 0.9, V[i][1] * 0.9); } ctx.stroke();
  trace(P, true); ctx.lineWidth = Math.max(2, r * 0.06); ctx.strokeStyle = spW(0.92); ctx.stroke();
  ctx.lineWidth = Math.max(2, r * 0.08); ctx.strokeStyle = spW(1); ctx.beginPath(); ctx.moveTo(lerp(V[5][0], V[0][0], 0.2) + r * 0.08, lerp(V[5][1], V[0][1], 0.2) + r * 0.12); ctx.lineTo(lerp(V[5][0], V[0][0], 0.6) + r * 0.04, lerp(V[5][1], V[0][1], 0.6) + r * 0.13); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the product: flat pack art, then the light on top of it (cylinder shade, highlights, both rim lights),
//  condensation, a glint. All in local coords: centred on 0,0, height s, half-width w.
// ---------------------------------------------------------------------
// a profile [[y, halfWidth], ...] top to bottom (y in -0.5..0.5 of s, halfWidth in 0..1 of w) -> a closed local outline
function spProf(prof, w, s) { return resample([...prof.map(([y, k]) => [k * w, y * s]), ...prof.slice().reverse().map(([y, k]) => [-k * w, y * s])], true, Math.max(4, s * 0.012)); }
function spLabelText(str, x, y, maxW, size, color, o = {}) {
  ctx.save(); const font = (z) => { ctx.font = `${o.weight ?? 900} ${z}px ${SP_SANS}`; }; font(size);
  const w = ctx.measureText(str).width; if (w > maxW) font(size * maxW / w);
  ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (o.under) { ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.18; ctx.strokeStyle = o.under; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0); ctx.restore();
}
function spShade(mode, w, s) {
  const box = () => ctx.fillRect(-w - 2, -s / 2 - 2, w * 2 + 4, s + 4), kd = mode === 'cyl' ? 1 : mode === 'glass' ? 0.55 : 0.6;
  let g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, spK(0.56 * kd)); g.addColorStop(0.09, spK(0.24 * kd)); g.addColorStop(0.24, spK(0)); g.addColorStop(0.62, spK(0)); g.addColorStop(0.86, spK(0.26 * kd)); g.addColorStop(1, spK(0.6 * kd));
  ctx.fillStyle = g; box();
  if (mode === 'pillow' || mode === 'flat') {                           // a soft slanted sheen across a flat or pillowed face
    g = ctx.createLinearGradient(-w, -s * 0.5, w, s * 0.2);
    g.addColorStop(0.18, spW(0)); g.addColorStop(0.34, spW(0.3)); g.addColorStop(0.44, spW(0.06)); g.addColorStop(0.56, spW(0)); ctx.fillStyle = g; box();
  } else {                                                              // a turned form: one hard highlight, one soft return
    g = ctx.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0.16, spW(0)); g.addColorStop(0.26, spW(mode === 'glass' ? 0.75 : 0.62)); g.addColorStop(0.32, spW(0.2)); g.addColorStop(0.42, spW(0)); g.addColorStop(0.66, spW(0)); g.addColorStop(0.73, spW(0.2)); g.addColorStop(0.8, spW(0));
    ctx.fillStyle = g; box();
  }
  g = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
  g.addColorStop(0, spW(0.16)); g.addColorStop(0.2, spW(0)); g.addColorStop(0.72, spK(0)); g.addColorStop(1, spK(0.3)); ctx.fillStyle = g; box();
}
function spRim(P, w, s, a = 1) {                                         // the backlight catches both edges
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, spW(a)); g.addColorStop(0.1, spW(0.6 * a)); g.addColorStop(0.22, spW(0)); g.addColorStop(0.78, spW(0)); g.addColorStop(0.9, spW(0.55 * a)); g.addColorStop(1, spW(0.95 * a));
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = g; trace(P, true);
  ctx.globalAlpha *= 0.5; ctx.lineWidth = s * 0.055; ctx.stroke(); ctx.globalAlpha *= 2; ctx.lineWidth = s * 0.02; ctx.stroke(); ctx.restore();
}
// cold condensation inside the current clip: many small droplets (shadow, body, lower light, highlight dot), a few running down.
// o: n, run (how many run), y0, y1 (of s), frost
function spCondense(w, s, key, o = {}) {
  const n = o.n ?? 90, y0 = (o.y0 ?? -0.36) * s, y1 = (o.y1 ?? 0.46) * s, R = RNG('spcond', key), D = [];
  const fg = ctx.createLinearGradient(0, -s * 0.1, 0, s / 2); fg.addColorStop(0, spW(0)); fg.addColorStop(1, spW(o.frost ?? 0.14)); ctx.fillStyle = fg; ctx.fillRect(-w, -s * 0.1, w * 2, s * 0.6);
  for (let i = 0; i < n; i++) { const u = R.n(0.985), c = Math.cos(u * Math.PI / 2), r = s * R.r(0.0035, 0.0085) * (R.f() > 0.88 ? 1.7 : 1); D.push([Math.sin(u * Math.PI / 2) * w, R.r(y0, y1), r * Math.max(0.4, c), r * R.r(1, 1.25)]); }
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < (o.run ?? 5); i++) {                              // the runners: a droplet creeps down, sticking and slipping, leaving a wet trail
    const u = R.n(0.8), c = Math.cos(u * Math.PI / 2), x = Math.sin(u * Math.PI / 2) * w, r = s * R.r(0.008, 0.012), ya = R.r(y0, lerp(y0, y1, 0.45)), span = s * R.r(0.18, 0.34), sp = R.r(0.1, 0.2), ph = R.f();
    const p = mod(TT * sp + ph, 1), yy = ya + span * (p + 0.035 * Math.sin(p * TAU * 4)), al = Math.sin(Math.PI * p) ** 0.6;
    const tg = ctx.createLinearGradient(0, ya, 0, yy); tg.addColorStop(0, spW(0)); tg.addColorStop(1, spW(0.3 * al));
    ctx.strokeStyle = tg; ctx.lineWidth = r * 1.3 * Math.max(0.4, c); ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x, yy); ctx.stroke();
    D.push([x, yy, r * Math.max(0.4, c) * al, r * 1.5 * al]);
  }
  const each = (fn) => { ctx.beginPath(); for (const d of D) if (d[2] > 0.3) fn(d); };
  each(([x, y, rx, ry]) => { ctx.moveTo(x + rx * 1.3, y + ry * 0.4); ctx.ellipse(x + rx * 0.3, y + ry * 0.4, rx, ry, 0, 0, TAU); }); ctx.fillStyle = spK(0.22); ctx.fill();
  each(([x, y, rx, ry]) => { ctx.moveTo(x + rx, y); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }); ctx.fillStyle = spW(0.2); ctx.fill();
  each(([x, y, rx, ry]) => { ctx.moveTo(x + rx * 0.62, y + ry * 0.2); ctx.ellipse(x, y, rx * 0.64, ry * 0.64, 0, 0.1 * Math.PI, 0.72 * Math.PI); }); ctx.lineWidth = Math.max(1, s * 0.0016); ctx.strokeStyle = spW(0.6); ctx.stroke();
  each(([x, y, rx, ry]) => { ctx.moveTo(x - rx * 0.1, y - ry * 0.4); ctx.arc(x - rx * 0.36, y - ry * 0.4, Math.max(0.9, ry * 0.26), 0, TAU); }); ctx.fillStyle = spW(0.96); ctx.fill();
  ctx.restore();
}
function spGlint(w, s, u, al = 0.7) {                                     // a specular band sweeping across, u 0..1
  if (!(u > 0 && u < 1)) return;
  const dx = 0.94, dy = 0.34, bw = w * 0.5, ext = w * dx + s / 2 * dy, p = lerp(-ext - bw, ext + bw, u), g = ctx.createLinearGradient(dx * (p - bw), dy * (p - bw), dx * (p + bw), dy * (p + bw));
  g.addColorStop(0, spW(0)); g.addColorStop(0.42, spW(al * 0.3)); g.addColorStop(0.5, spW(al)); g.addColorStop(0.58, spW(al * 0.3)); g.addColorStop(1, spW(0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-w - 2, -s / 2 - 2, w * 2 + 4, s + 4); ctx.restore();
}
// light a local outline P: a soft dark halo behind it (it is backlit), art() clipped to it, then shade, rims, condensation, glint.
function spLit(P, w, s, fl, o, mode, art) {
  if (o.shadow !== false) { ctx.save(); ctx.shadowColor = spA(fl.ink, 0.6); ctx.shadowBlur = Math.max(18, s * 0.08); ctx.shadowOffsetY = s * 0.03; trace(P, true); ctx.fillStyle = fl.deep; ctx.fill(); ctx.restore(); }
  ctx.save(); trace(P, true); ctx.clip();
  art(); spShade(mode, w, s); spRim(P, w, s, o.rim ?? 1);
  if ((o.cond ?? 1) > 0) spCondense(w, s, o.key ?? 'prod', { n: Math.round((o.drops ?? 90) * (o.cond ?? 1)), run: o.run, y0: o.condY0, y1: o.condY1 });
  spGlint(w, s, o.glint ?? -1, o.glintA);
  ctx.restore();
}
const spCrimp = (x0, x1, y0, y1, step, al = 0.14) => { ctx.strokeStyle = spK(al); ctx.lineWidth = 2; ctx.beginPath(); for (let x = x0 + step / 2; x < x1; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); } ctx.stroke(); };
const spHLine = (w, y, al = 0.25, lw = 3) => { ctx.strokeStyle = spK(al); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke(); ctx.strokeStyle = spW(al * 0.9); ctx.beginPath(); ctx.moveTo(-w, y + lw); ctx.lineTo(w, y + lw); ctx.stroke(); };
function spInnerBubbles(w, s, key, n, y0, y1) {
  const R = RNG('spinb', key); ctx.save(); ctx.lineWidth = Math.max(1, s * 0.002); ctx.strokeStyle = spW(0.55); ctx.fillStyle = spW(0.16);
  for (let i = 0; i < n; i++) { const x = R.n(0.82) * w, v = mod(R.f() + TT * R.r(0.12, 0.3), 1), r = s * R.r(0.003, 0.008), y = lerp(y1, y0, v) ; ctx.globalAlpha = Math.sin(Math.PI * v) ** 0.5; ctx.beginPath(); ctx.arc(x + Math.sin(TT * 2 + i) * 3, y, r, 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
// the five packs. hw = half-width as a fraction of the height; prof = the right-hand profile; art draws the flat pack art.
const SP_KINDS = {
  // an aluminium can: silver shoulders and base, a printed wrap with a sun disc, two waves and the name
  can: {
    hw: 0.262, mode: 'cyl', prof: [[-0.5, 0.8], [-0.493, 0.84], [-0.47, 0.845], [-0.455, 0.86], [-0.4, 1], [0.42, 1], [0.465, 0.9], [0.49, 0.84], [0.5, 0.8]],
    art(fl, w, s, o) {
      const L = o.label ?? {}, y0 = -0.4 * s, y1 = 0.42 * s;
      let g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, '#f4f7fa'); g.addColorStop(0.1, '#c9d2dc'); g.addColorStop(0.9, '#c2ccd6'); g.addColorStop(1, '#8e9aa8');
      ctx.fillStyle = g; ctx.fillRect(-w, -s / 2, w * 2, s);
      g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, fl.hi); g.addColorStop(0.4, fl.base); g.addColorStop(1, fl.deep);
      ctx.fillStyle = g; ctx.fillRect(-w, y0, w * 2, y1 - y0);
      ctx.fillStyle = spA(fl.hot, 0.95); ctx.beginPath(); ctx.arc(0, -0.085 * s, w * 0.8, 0, TAU); ctx.fill();
      ctx.fillStyle = spA(fl.hi, 0.95); ctx.beginPath(); ctx.moveTo(-w, 0.19 * s); ctx.bezierCurveTo(-w * 0.3, 0.09 * s, w * 0.3, 0.3 * s, w, 0.13 * s); ctx.lineTo(w, y1); ctx.lineTo(-w, y1); ctx.fill();
      ctx.fillStyle = fl.deep; ctx.beginPath(); ctx.moveTo(-w, 0.25 * s); ctx.bezierCurveTo(-w * 0.3, 0.16 * s, w * 0.3, 0.37 * s, w, 0.2 * s); ctx.lineTo(w, y1); ctx.lineTo(-w, y1); ctx.fill();
      spLabelText(L.name ?? 'FIZZ', 0, -0.045 * s, w * 1.32, s * 0.15, fl.deep, { rot: -0.07 });
      spLabelText(L.sub ?? 'SPARKLING', 0, 0.02 * s, w * 1.3, s * 0.036, fl.ink, { rot: -0.07, weight: 800 });
      spLabelText(L.note ?? '330 ML', 0, 0.375 * s, w * 1.2, s * 0.03, spW(0.9), { weight: 800 });
      ctx.fillStyle = spW(0.9); ctx.fillRect(-w, y0, w * 2, s * 0.008); ctx.fillRect(-w, y1 - s * 0.008, w * 2, s * 0.008);
      ctx.fillStyle = '#9aa6b4'; ctx.beginPath(); ctx.ellipse(0, -0.487 * s, w * 0.86, s * 0.014, 0, 0, TAU); ctx.fill();
      spHLine(w, -0.455 * s, 0.22, 2); spHLine(w, 0.465 * s, 0.2, 2);
    },
  },
  // a glass bottle: backlit drink inside, an empty neck, a crown cap, a cream paper label that wraps the turn
  bottle: {
    hw: 0.176, mode: 'cyl', prof: [[-0.5, 0.36], [-0.497, 0.42], [-0.456, 0.42], [-0.452, 0.34], [-0.3, 0.34], [-0.22, 0.42], [-0.14, 0.72], [-0.08, 0.93], [-0.03, 1], [0.44, 1], [0.485, 0.94], [0.5, 0.8]],
    art(fl, w, s, o) {
      const L = o.label ?? {}, lvl = -0.4 * s, ly0 = 0.03 * s, ly1 = 0.31 * s, sag = s * 0.02;
      ctx.fillStyle = spMix(fl.hi, fl.liq, 0.35); ctx.fillRect(-w, -s / 2, w * 2, s);
      let g = ctx.createLinearGradient(0, lvl, 0, s / 2); g.addColorStop(0, spMix(fl.liq, fl.liqHi, 0.5)); g.addColorStop(0.3, fl.liq); g.addColorStop(1, fl.liqLo);
      ctx.fillStyle = g; ctx.fillRect(-w, lvl, w * 2, s / 2 - lvl);
      g = ctx.createRadialGradient(0, -0.05 * s, 0, 0, -0.05 * s, w * 1.7); g.addColorStop(0, spA(fl.hot, 0.5)); g.addColorStop(1, spA(fl.hot, 0)); ctx.fillStyle = g; ctx.fillRect(-w, lvl, w * 2, s / 2 - lvl);
      ctx.fillStyle = spW(0.7); ctx.beginPath(); ctx.ellipse(0, lvl, w * 0.34, s * 0.006, 0, 0, TAU); ctx.fill();
      spInnerBubbles(w, s, (o.key ?? 'bot') + 'in', 16, lvl, 0.48 * s);
      g = ctx.createLinearGradient(0, -s / 2, 0, -0.452 * s); g.addColorStop(0, spMix(fl.ink, fl.deep, 0.7)); g.addColorStop(1, fl.ink);
      ctx.fillStyle = g; ctx.fillRect(-w, -s / 2, w * 2, 0.048 * s); spCrimp(-w * 0.42, w * 0.42, -0.488 * s, -0.454 * s, w * 0.085, 0.3);
      spHLine(w, -0.425 * s, 0.14, 2);
      const lab = (a, b) => { ctx.beginPath(); ctx.moveTo(-w, a); ctx.quadraticCurveTo(0, a + sag * 2, w, a); ctx.lineTo(w, b); ctx.quadraticCurveTo(0, b + sag * 2, -w, b); ctx.closePath(); };
      lab(ly0, ly1); ctx.fillStyle = SPL.cream; ctx.fill();
      lab(ly0, ly0 + s * 0.022); ctx.fillStyle = fl.deep; ctx.fill(); lab(ly1 - s * 0.022, ly1); ctx.fill();
      ctx.fillStyle = fl.base; ctx.beginPath(); ctx.arc(0, ly0 + 0.075 * s, s * 0.022, 0, TAU); ctx.fill();
      ctx.fillStyle = fl.hi; ctx.beginPath(); ctx.arc(-s * 0.05, ly0 + 0.07 * s, s * 0.012, 0, TAU); ctx.arc(s * 0.05, ly0 + 0.07 * s, s * 0.012, 0, TAU); ctx.fill();
      spLabelText(L.name ?? 'FROST', 0, ly0 + 0.18 * s, w * 1.66, s * 0.075, fl.deep);
      spLabelText(L.sub ?? 'COLD PRESSED', 0, ly0 + 0.228 * s, w * 1.5, s * 0.026, fl.ink, { weight: 800 });
    },
  },
  // a gable-top carton: a crimped fin, a folded roof with a screw cap, a white face over a wave of colour and a printed fruit wheel
  carton: {
    hw: 0.25, mode: 'flat', prof: [[-0.5, 0.9], [-0.497, 0.92], [-0.458, 0.92], [-0.45, 0.93], [-0.33, 1], [0.492, 1], [0.5, 0.97]],
    art(fl, w, s, o) {
      const L = o.label ?? {};
      ctx.fillStyle = SPL.cream; ctx.fillRect(-w, -s / 2, w * 2, s);
      ctx.fillStyle = fl.hi; ctx.beginPath(); ctx.moveTo(-w, 0.07 * s); ctx.bezierCurveTo(-w * 0.4, -0.02 * s, w * 0.3, 0.17 * s, w, 0.02 * s); ctx.lineTo(w, s / 2); ctx.lineTo(-w, s / 2); ctx.fill();
      const g = ctx.createLinearGradient(0, 0.05 * s, 0, s / 2); g.addColorStop(0, fl.base); g.addColorStop(1, fl.deep);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w, 0.12 * s); ctx.bezierCurveTo(-w * 0.4, 0.03 * s, w * 0.3, 0.22 * s, w, 0.07 * s); ctx.lineTo(w, s / 2); ctx.lineTo(-w, s / 2); ctx.fill();
      spSlice(L.fruit ?? spFruitOf(fl), 0, 0.27 * s, w * 0.56, 0.3, { flat: true });
      spLabelText(L.name ?? 'JUICY', 0, -0.13 * s, w * 1.6, s * 0.13, fl.deep, { rot: -0.05 });
      spLabelText(L.sub ?? '100% SQUEEZED', 0, -0.07 * s, w * 1.5, s * 0.034, fl.ink, { rot: -0.05, weight: 800 });
      ctx.fillStyle = spK(0.09); ctx.fillRect(-w, -s / 2, w * 2, 0.17 * s); ctx.fillStyle = spK(0.07); ctx.fillRect(-w, -s / 2, w * 2, 0.045 * s);
      spHLine(w, -0.33 * s, 0.16, 2); spHLine(w, -0.456 * s, 0.14, 2);
      ctx.strokeStyle = spK(0.1); ctx.lineWidth = 2; ctx.beginPath(); for (const k of [-1, 1]) { ctx.moveTo(k * w * 0.5, -0.455 * s); ctx.lineTo(k * w * 0.94, -0.33 * s); } ctx.stroke();
      ctx.strokeStyle = spK(0.12); ctx.beginPath(); for (const yy of [-0.488, -0.476, -0.466]) { ctx.moveTo(-w, yy * s); ctx.lineTo(w, yy * s); } ctx.stroke();
      const cx = w * 0.4, cy = -0.39 * s, cr = w * 0.2;
      ctx.fillStyle = spK(0.2); ctx.beginPath(); ctx.ellipse(cx + 3, cy + 6, cr, cr * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = fl.deep; ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = spMix(fl.deep, '#ffffff', 0.25); ctx.beginPath(); ctx.ellipse(cx, cy - cr * 0.16, cr * 0.82, cr * 0.6, 0, 0, TAU); ctx.fill();
    },
  },
  // a stand-up pouch with a spout: a crimped top seal, a pale blob for the name, a printed wheel, a bottom gusset
  pouch: {
    hw: 0.3, mode: 'pillow', prof: [[-0.5, 0.2], [-0.497, 0.22], [-0.458, 0.22], [-0.455, 0.8], [-0.4, 0.84], [-0.36, 0.8], [-0.1, 0.93], [0.25, 1], [0.42, 0.98], [0.48, 0.88], [0.5, 0.7]],
    art(fl, w, s, o) {
      const L = o.label ?? {};
      const g = ctx.createLinearGradient(-w, -s / 2, w, s / 2); g.addColorStop(0, fl.hi); g.addColorStop(0.45, fl.base); g.addColorStop(1, fl.deep);
      ctx.fillStyle = g; ctx.fillRect(-w, -s / 2, w * 2, s);
      ctx.fillStyle = spA(fl.hot, 0.96); ctx.beginPath(); ctx.ellipse(0, -0.03 * s, w * 0.76, s * 0.16, -0.1, 0, TAU); ctx.fill();
      spLabelText(L.name ?? 'SQUEEZE', 0, 0.0 * s, w * 1.3, s * 0.11, fl.deep, { rot: -0.1 });
      spLabelText(L.sub ?? 'FRUIT SMOOTHIE', 0, 0.05 * s, w * 1.1, s * 0.03, fl.ink, { rot: -0.1, weight: 800 });
      spSlice(L.fruit ?? spFruitOf(fl), w * 0.3, 0.3 * s, w * 0.34, 0.5, { flat: true }); spSlice(L.fruit ?? spFruitOf(fl), -w * 0.32, 0.26 * s, w * 0.24, 1.3, { flat: true });
      ctx.fillStyle = spW(0.26); ctx.fillRect(-w, -0.456 * s, w * 2, 0.06 * s); spCrimp(-w * 0.84, w * 0.84, -0.452 * s, -0.4 * s, w * 0.07, 0.13);
      const cg = ctx.createLinearGradient(0, -s / 2, 0, -0.456 * s); cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#b9c4cf'); ctx.fillStyle = cg; ctx.fillRect(-w * 0.3, -s / 2, w * 0.6, 0.045 * s); spCrimp(-w * 0.22, w * 0.22, -0.496 * s, -0.46 * s, w * 0.055, 0.2);
      ctx.strokeStyle = spK(0.2); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w * 0.94, 0.41 * s); ctx.quadraticCurveTo(0, 0.35 * s, w * 0.94, 0.41 * s); ctx.stroke();
    },
  },
  // a tall glass: the drink, ice at the top, bubbles, a thick base; a striped straw and a wheel on the rim
  glass: {
    hw: 0.235, mode: 'glass', prof: [[-0.5, 1], [-0.25, 0.945], [0, 0.89], [0.25, 0.835], [0.46, 0.79], [0.49, 0.77], [0.5, 0.7]],
    straw(fl, w, s, al) { ctx.save(); ctx.globalAlpha *= al; ctx.lineCap = 'butt'; ctx.lineWidth = w * 0.13; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-w * 0.1, 0.36 * s); ctx.lineTo(w * 0.62, -0.74 * s); ctx.stroke(); ctx.setLineDash([w * 0.14, w * 0.14]); ctx.strokeStyle = fl.deep; ctx.stroke(); ctx.restore(); },
    under(fl, w, s) { SP_KINDS.glass.straw(fl, w, s, 1); },
    art(fl, w, s, o) {
      const lvl = -0.37 * s, base = 0.445 * s, key = o.key ?? 'glass';
      ctx.fillStyle = spMix(fl.hot, '#ffffff', 0.3); ctx.fillRect(-w, -s / 2, w * 2, s);
      let g = ctx.createLinearGradient(0, lvl, 0, base); g.addColorStop(0, fl.liqHi); g.addColorStop(0.35, fl.liq); g.addColorStop(1, fl.liqLo);
      ctx.fillStyle = g; ctx.fillRect(-w, lvl, w * 2, base - lvl);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.5); g.addColorStop(0, spA(fl.hot, 0.7)); g.addColorStop(1, spA(fl.hot, 0)); ctx.fillStyle = g; ctx.fillRect(-w, lvl, w * 2, base - lvl);
      SP_KINDS.glass.straw(fl, w, s, 0.6);
      spIce(-w * 0.4, lvl + 0.085 * s, w * 0.46, 0.25 + Math.sin(TT * 0.9) * 0.05, { tint: fl, flat: true }); spIce(w * 0.42, lvl + 0.065 * s, w * 0.4, -0.5, { tint: fl, flat: true }); spIce(w * 0.02, lvl + 0.2 * s, w * 0.42, 0.9, { tint: fl, flat: true });
      spInnerBubbles(w, s, key + 'in', 22, lvl + 0.1 * s, base);
      ctx.fillStyle = spA(fl.liqHi, 0.8); ctx.beginPath(); ctx.ellipse(0, lvl, w * 0.98, s * 0.014, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = spW(0.7); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = spA('#ffffff', 0.55); ctx.fillRect(-w, base, w * 2, s / 2 - base); spHLine(w, base, 0.2, 2);
      ctx.strokeStyle = spW(0.95); ctx.lineWidth = Math.max(2, s * 0.006); ctx.beginPath(); ctx.moveTo(-w, -0.495 * s); ctx.lineTo(w, -0.495 * s); ctx.stroke();
    },
    over(fl, w, s, o) { spSlice((o.label ?? {}).fruit ?? spFruitOf(fl), -w * 0.92, -0.47 * s, w * 0.46, 0.5, { tilt: 0.92 }); },
  },
};
// the outline of a product in world coords (closed): for bridges and for clearance checks
function spProductPts(kind, x, y, s, rot = 0) { const K = SP_KINDS[kind] ?? SP_KINDS.can; return xform(spProf(K.prof, K.hw * s, s), x, y, rot); }
// an invented product, centred on (x, y), s px tall. kind: 'can' | 'bottle' | 'carton' | 'pouch' | 'glass'.
// o: flavor, rot, scale, a, label { name, sub, note, fruit }, glint 0..1 (a specular band crossing; outside 0..1 = none), glintA,
//    cond 0..1 (how wet; 0 = dry), drops, run (droplets running down), rim 0..1, shadow (false = none), key
function spProduct(kind, x, y, s, o = {}) {
  const K = SP_KINDS[kind] ?? SP_KINDS.can, fl = spFlavor(o.flavor), w = K.hw * s, P = spProf(K.prof, w, s), sc = o.scale ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(sc, sc); ctx.globalAlpha *= o.a ?? 1;
  if (K.under) K.under(fl, w, s, o);
  spLit(P, w, s, fl, { key: kind, ...o }, K.mode, () => K.art(fl, w, s, o));
  if (K.over) K.over(fl, w, s, o);
  ctx.restore();
}
// any closed outline (world coords) as a glossy, wet, lit body in colour c: the morph shape. o: glint, cond, rim
function spGloss(P, c, o = {}) {
  const fl = spFlavor(c), bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, w = (bb.x1 - bb.x0) / 2, s = bb.y1 - bb.y0;
  ctx.save(); ctx.translate(cx, cy);
  spLit(P.map(([x, y]) => [x - cx, y - cy]), w, s, fl, { key: 'gloss', drops: 70, run: 0, ...o }, 'cyl', () => {
    const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, fl.hi); g.addColorStop(0.45, fl.base); g.addColorStop(1, spMix(fl.base, fl.deep, 0.6)); ctx.fillStyle = g; ctx.fillRect(-w, -s / 2, w * 2, s);
    ctx.fillStyle = spA(fl.hot, 0.9); ctx.beginPath(); ctx.arc(0, -s * 0.05, w * 0.7, 0, TAU); ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: an orange wheel that turns, with two beads of juice in orbit. Sets SPARK_AT. o: key, rot, tilt, kind
// ---------------------------------------------------------------------
function spHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', ph = key.length;
  y += Math.sin(TT * TAU * 0.45 + ph) * r * 0.05;
  SPARK_AT = toScreen(x, y);
  spSlice(o.kind ?? 'orange', x, y, r, (o.rot ?? 0) + TT * 0.45 + ph, { tilt: o.tilt ?? 0.95 });
  for (let i = 0; i < 2; i++) { const a = TT * 1.3 + ph + i * Math.PI; spBead(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.18, r * (0.11 - 0.03 * i), 'citrus', { rot: a + Math.PI / 2, st: 1.25 }); }
}

// ---------------------------------------------------------------------
//  type: heavy rounded sans, tilted, white on a block shadow in the flavour's ink; a pill badge
// ---------------------------------------------------------------------
// one line. o: flavor, color, shadow, rot, align, depth, weight, a, at (seconds: it pops in with a small overshoot)
function spType(str, x, y, size, o = {}) {
  const fl = spFlavor(o.flavor), at = o.at; if (at != null && TT < at) return 0;
  const p = at != null ? springEase(TT - at, o.k ?? 300, o.d ?? 16) : 1, al = clamp(o.a ?? 1) * (at != null ? clamp((TT - at) / 0.08) : 1); if (al <= 0.004) return 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -0.06) + (1 - p) * 0.14); ctx.scale(Math.max(0.01, p), Math.max(0.01, p)); ctx.globalAlpha *= al;
  ctx.font = `${o.weight ?? 900} ${size}px ${SP_SANS}`; ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const w = ctx.measureText(str).width, dep = o.depth ?? size * 0.08, sh = o.shadow ?? fl.ink;
  ctx.fillStyle = sh; ctx.strokeStyle = sh; ctx.lineWidth = size * 0.11;
  for (let i = dep; i > 0; i -= 2) ctx.strokeText(str, i * 0.45, i);
  ctx.strokeText(str, 0, 0);
  ctx.fillStyle = o.color ?? '#ffffff'; ctx.fillText(str, 0, 0);
  ctx.restore(); return w;
}
// a pill badge ("NEW", "0 SUGAR"): flavour-coloured, white rim and type, a hard shadow, a shine. o: flavor, size, rot, c, at, a
function spBadge(str, x, y, o = {}) {
  const fl = spFlavor(o.flavor), size = o.size ?? 46, at = o.at; if (at != null && TT < at) return;
  const p = at != null ? springEase(TT - at, 300, 13) : 1, idle = Math.sin(TT * 2.2 + str.length) * 0.02;
  ctx.save(); ctx.font = `900 ${size}px ${SP_SANS}`; const w = ctx.measureText(str).width + size * 1.3, h = size * 1.75;
  ctx.translate(x, y); ctx.rotate((o.rot ?? 0.1) - (1 - p) * 0.5 + idle); ctx.scale(Math.max(0.01, p), Math.max(0.01, p)); ctx.globalAlpha *= clamp(o.a ?? 1);
  ctx.fillStyle = spA(fl.ink, 0.5); ctx.beginPath(); ctx.roundRect(-w / 2 + 5, -h / 2 + 10, w, h, h / 2); ctx.fill();
  ctx.fillStyle = o.c ?? fl.deep; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = spW(0.2); ctx.beginPath(); ctx.ellipse(0, -h * 0.55, w * 0.6, h * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.lineWidth = Math.max(4, size * 0.12); ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, 0, size * 0.35);
  ctx.restore();
}

// ---- screen-space type, through DEFER (after the camera, at screen size); all of it steps aside for a bridge
const spDefer = (f) => { if (DEFER) DEFER.push(f); else f(); };
// the headline: one or two short lines, each popping in on its own. o: flavor, x, y (first baseline), size, rot, at (seconds into the era), gap
function spHeadline(lines, o = {}) {
  spDefer(() => {
    const k = spBridgeK(); if (k <= 0) return;
    const at = E0 + (o.at ?? 0.4), x = o.x ?? CX, y = o.y ?? 400, size = o.size ?? 128, rot = o.rot ?? -0.06;
    [].concat(lines).forEach((line, i) => { const d = i * size * 1.04; spType(line, x - Math.sin(rot) * d, y + Math.cos(rot) * d, size, { flavor: o.flavor, rot, at: at + i * (o.gap ?? 0.17), a: k, color: o.color }); });
  });
}
// one caption line on a dark pill near the bottom; words inside *...* take the flavour's hot colour. o: flavor, x, y, size, at
function spCaption(str, o = {}) {
  spDefer(() => {
    const k = spBridgeK(), at = E0 + (o.at ?? 0.6); if (k <= 0 || TT < at) return;
    const fl = spFlavor(o.flavor), size = o.size ?? 52, y = o.y ?? (H > W * 1.2 ? 1440 : H - 120), cx = o.x ?? CX, p = springEase(TT - at, 280, 18);
    const words = []; String(str).split('*').forEach((part, i) => part.split(/\s+/).filter(Boolean).forEach((wd) => words.push({ s: wd, hi: i % 2 === 1 })));
    ctx.save(); ctx.font = `900 ${size}px ${SP_SANS}`; const sp = size * 0.28, ws = words.map((wd) => ctx.measureText(wd.s).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1), w = tw + size * 1.4, h = size * 1.8;
    ctx.translate(cx, y - size * 0.34); ctx.rotate(-0.02); ctx.scale(Math.max(0.01, p), Math.max(0.01, p)); ctx.globalAlpha = k * clamp((TT - at) / 0.08);
    ctx.fillStyle = spA(fl.ink, 0.9); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = spA(fl.hi, 0.9); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; let x = -tw / 2;
    words.forEach((wd, i) => { ctx.fillStyle = wd.hi ? fl.hi : '#ffffff'; ctx.fillText(wd.s, x, size * 0.35); x += ws[i] + sp; });
    ctx.restore();
  });
}
// a small chapter pill, top left: a number in a white disc and a tracked caps label. o: flavor, x, y, size, at
function spTag(num, label, o = {}) {
  spDefer(() => {
    const k = spBridgeK(), at = E0 + (o.at ?? 0.15); if (k <= 0 || TT < at) return;
    const fl = spFlavor(o.flavor), size = o.size ?? 30, x = o.x ?? 70, y = o.y ?? (H > W * 1.2 ? 296 : 84), p = springEase(TT - at, 300, 20);
    ctx.save(); ctx.font = `900 ${size}px ${SP_SANS}`; const str = String(label).toUpperCase(), hasLS = 'letterSpacing' in ctx; if (hasLS) ctx.letterSpacing = (size * 0.12).toFixed(2) + 'px';
    const h = size * 1.8, w = ctx.measureText(str).width + h * 1.45;
    ctx.translate(x, y - size * 0.34); ctx.scale(Math.max(0.01, p), Math.max(0.01, p)); ctx.globalAlpha = k;
    ctx.fillStyle = spA(fl.ink, 0.85); ctx.beginPath(); ctx.roundRect(0, -h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(h / 2, 0, h * 0.38, 0, TAU); ctx.fill();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillText(str, h * 1.02, size * 0.35);
    if (hasLS) ctx.letterSpacing = '0px'; ctx.font = `900 ${size * 0.74}px ${SP_SANS}`; ctx.textAlign = 'center'; ctx.fillStyle = fl.deep; ctx.fillText(String(num), h / 2, size * 0.27);
    ctx.restore();
  });
}

// =====================================================================
//  STYLE — the renderer's hooks. Bridge colours are flavour base colours (6-digit hex); mid-morph the blend arrives as rgb().
// =====================================================================
const STYLE = {
  name: 'splash',
  paper: SPL.paper,                                                      // the flash between two flavours
  backdrop(c) { spGround(c, { cx: W / 2, cy: H * 0.48 }); },             // the glowing ground in whatever colour the morph is passing through
  window(P, key, src, o = {}) {                                          // the scene through the product's outline, edged with a wet rim of its liquid
    const bb = bbox(P), far = bb.y1 - bb.y0 > H * 2.4, fl = spFlavor(o.c);
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0);
    if (!far) { ctx.lineJoin = 'round'; trace(P, true); ctx.lineWidth = 44; ctx.strokeStyle = spA(fl.liq, 0.9); ctx.stroke(); ctx.lineWidth = 16; ctx.strokeStyle = spW(0.9); ctx.stroke(); }
    ctx.restore();
  },
  blob(P, c, key, u = 0) {                                               // the pack itself changes shape: glossy, wet, a glint crossing, beads thrown off it
    const fl = spFlavor(c), bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rr = (bb.y1 - bb.y0) * 0.5, S = RNG('spblob', key), k = Math.sin(Math.PI * clamp(u));
    for (let i = 0; i < 26; i++) { const a = S.r(0, TAU), d = rr * (0.7 + S.r(0.2, 0.9) * (0.5 + 0.5 * u)); spBead(cx + Math.cos(a) * d * 0.85, cy + Math.sin(a) * d, S.r(9, 30) * (0.45 + 0.55 * k), fl, { rot: a, st: 1.5 }); }
    spGloss(P, c, { glint: 0.1 + 0.8 * clamp(u), cond: 0.8 });
  },
  hero(x, y, r, o = {}) { spHero(x, y, r * 0.9, o); },                   // r = half the hero's size
  heroColor: SP_FRUIT.orange.rind,
  heroPts(x, y, r) { return ellipsePts(x, y, r * 0.9, r * 0.9, 0, 96); },
  ones: true,                                                            // energetic, on 1s: everything erupts fast, then hangs
};
