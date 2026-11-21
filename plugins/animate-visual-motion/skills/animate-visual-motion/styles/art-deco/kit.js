// =====================================================================
//  styles/art-deco/kit.js — ART DECO: a 1920s–30s poster / theatre card. A deep lacquered ground (black-navy,
//  emerald, oxblood) with a soft vertical sheen and fine grain carries metallic gold linework: sets of parallel
//  hairlines beside one heavier line, sunburst fans, stepped towers, scallop repeats, chevrons, nested octagons and
//  diamonds, slender arches, fountains, palm and lotus leaves, a moon disc, a round lantern. Everything is mirrored
//  about the vertical centre line (decMirror); the hero, a gold crane in profile, is the one thing that is not.
//  Gold is never flat: every gold stroke and fill is painted with a cached metallic band pattern (bronze -> gold ->
//  champagne -> gold, tilted a little), and a narrow glint sweeps across it every few seconds (DEC_GLINT).
//  Solid shapes are few: dark silhouettes edged in gold. Lines keep their weight whatever the camera does.
//  Built on kit/core.js. Motion on 1s, eased in and out, never bouncing. Helpers are prefixed dec…; the palette is
//  DEC. Needs from the piece head: CX (the centre line / caption centre; W / 2 when absent).
// =====================================================================
const DEC = {
  paper: '#07080e',                                        // the black lacquer a morph happens on
  night: '#0a1024', emerald: '#0a3a30', oxblood: '#3b0e18',  // grounds: black-navy, emerald, oxblood
  ink: '#04050a', plaque: '#05060b',                       // silhouettes (towers, basins, leaves); the caption plaque
  gold: '#d4a94a', goldD: '#8a6426', goldL: '#fff1c4',     // the linework: metallic gold (painted as a band pattern)
  amber: '#f6b63c',                                        // WARM BRIGHT AMBER: reserved for the hero
  moon: '#ead9a0',                                         // the pale champagne of a moon / sun disc
  cream: '#f4ead2',                                        // ivory: tags, the highlighted word, lit windows, water
  teal: '#3fbcae', emer: '#2fa07a',                        // the one jewel tone (teal on green / navy, emerald on oxblood)
};
const DEC_W = { hair: 2.2, mid: 3.6, heavy: 6 };           // the three line weights (px at 1080 wide, constant under the camera)
const DEC_GLINT = { every: 3, at: 1.2, dur: 1.3, w: 80, al: 0.9, tilt: 0.36 };   // the glint: every N seconds, from `at`, taking `dur`; every: 0 turns it off
const DEC_SERIF = '"Didot", "Bodoni 72", "Playfair Display", "Bodoni MT", "Didot LT STD", Georgia, "Times New Roman", serif';       // tall display caps
const DEC_SANS = '"Copperplate", "Optima", "Gill Sans", "Century Gothic", "Gill Sans MT", "Trebuchet MS", "DejaVu Sans", sans-serif';  // small spaced caps
const DEC_METALS = {
  gold: ['#8a6426', '#d4a94a', '#fff1c4', '#dcb354', '#b58a35', '#e2bd62', '#f6e3a4', '#c79a3e', '#8a6426'],
  amber: ['#c27a1c', '#f6b63c', '#fff0b8', '#f9c04c', '#e39a25', '#fbc955', '#ffe9a0', '#eea52c', '#c27a1c'],
  pale: ['#c9b06a', '#ead9a0', '#fffbe6', '#efe0ae', '#d8c282', '#f3e6b8', '#fff7da', '#e2cf94', '#c9b06a'],
};

// ---------------------------------------------------------------------
//  small things: the centre line, the zoom, a cache for static things, colour maths (hex or rgb() in, rgb() out)
// ---------------------------------------------------------------------
const decAX = () => (typeof CX !== 'undefined' ? CX : W / 2);
const decZoom = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
const DEC_CACHE = new Map();
function decMemo(key, make) { let v = DEC_CACHE.get(key); if (v === undefined) { v = make(); DEC_CACHE.set(key, v); } return v; }
function decRGB(c) {
  if (c[0] === '#') { const h = c.length === 4 ? c.replace(/[0-9a-f]/gi, '$&$&') : c; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  return c.match(/[\d.]+/g).slice(0, 3).map(Number);
}
const decMix = (a, b, u) => { const x = decRGB(a), y = decRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const decTone = (c, k) => (k < 0 ? decMix(c, '#000000', -k) : decMix(c, '#ffffff', k));
const decA = (c, al) => `rgba(${decRGB(c).join(',')},${al})`;
const decCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// draw fn twice: as given and mirrored about the centre line (fn(1), then fn(-1) under a flipped transform)
function decMirror(fn, ax = decAX()) { fn(1); ctx.save(); ctx.translate(2 * ax, 0); ctx.scale(-1, 1); fn(-1); ctx.restore(); }

// ---------------------------------------------------------------------
//  metal: the gold is a cached band pattern, never a flat fill; the glint is a narrow light band in screen space,
//  re-expressed in the current transform so it can be stroked / filled straight over a gold path
// ---------------------------------------------------------------------
function decMetal(k = 'gold') {
  return decMemo('metal:' + k, () => {
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 520;
    const g = cv.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 520), S = DEC_METALS[k];
    S.forEach((c, i) => lg.addColorStop(i / (S.length - 1), c)); g.fillStyle = lg; g.fillRect(0, 0, 8, 520);
    const p = g.createPattern(cv, 'repeat'); p.setTransform(new DOMMatrix().rotate(-16)); return p;
  });
}
const decIsMetal = (c) => c == null || c === 'gold' || c === 'amber' || c === 'pale';
const decInk = (c) => (decIsMetal(c) ? decMetal(c || 'gold') : DEC[c] || c);   // 'gold' | 'amber' | 'pale' | a DEC key | any css colour
function decGlint() {
  const G = DEC_GLINT; if (!G.every) return null;
  const ph = mod(TT - G.at, G.every) / G.dur; if (ph >= 1) return null;
  const reach = H * Math.tan(G.tilt) / 2 + G.w, gx = lerp(-reach, W + reach, ph), dx = Math.cos(G.tilt) * G.w, dy = -Math.sin(G.tilt) * G.w;
  const inv = ctx.getTransform().inverse(), a = inv.transformPoint(new DOMPoint(gx - dx, H / 2 - dy)), b = inv.transformPoint(new DOMPoint(gx + dx, H / 2 + dy));
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, 'rgba(255,250,228,0)'); g.addColorStop(0.5, `rgba(255,250,228,${G.al})`); g.addColorStop(1, 'rgba(255,250,228,0)');
  return g;
}
// stroke / fill the CURRENT path in colour c (metal gets the glint). o: al, cap, join, glint (false = none)
function decStrokeNow(c, w = DEC_W.hair, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.al ?? 1; ctx.lineWidth = w / decZoom(); ctx.lineCap = o.cap || 'butt'; ctx.lineJoin = o.join || 'miter'; ctx.miterLimit = 6;
  ctx.strokeStyle = decInk(c); ctx.stroke();
  if (decIsMetal(c) && o.glint !== false) { const g = decGlint(); if (g) { ctx.strokeStyle = g; ctx.stroke(); } }
  ctx.restore();
}
function decFillNow(c, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.al ?? 1; ctx.fillStyle = decInk(c); ctx.fill();
  if (decIsMetal(c) && o.glint !== false) { const g = decGlint(); if (g) { ctx.fillStyle = g; ctx.fill(); } }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  geometry: straight polylines (Deco corners are sharp), parts of a path, parallel offsets, the basic outlines
// ---------------------------------------------------------------------
function decPoly(P, closed) { ctx.beginPath(); for (let i = 0; i < P.length; i++) { if (i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[i][0], P[i][1]); } if (closed) ctx.closePath(); }
function decSub(P, a, b) {   // the part of polyline P between length fractions a and b
  a = clamp(a); b = clamp(b); if (b <= a || P.length < 2) return [];
  const L = pathLen(P), la = a * L, lb = b * L, out = []; let s = 0;
  for (let i = 1; i < P.length; i++) {
    const d = dist(P[i - 1], P[i]), s1 = s + d;
    if (d > 0 && s1 >= la && s <= lb) {
      const u0 = clamp((la - s) / d), u1 = clamp((lb - s) / d);
      if (!out.length) out.push([lerp(P[i - 1][0], P[i][0], u0), lerp(P[i - 1][1], P[i][1], u0)]);
      out.push([lerp(P[i - 1][0], P[i][0], u1), lerp(P[i - 1][1], P[i][1], u1)]);
    }
    s = s1;
  }
  return out;
}
function decOffset(P, d, closed) {   // a parallel copy of P, d px to the left of its direction (mitred corners)
  const n = P.length, out = [], nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return l > 1e-6 ? [dy / l, -dx / l] : null; };
  for (let i = 0; i < n; i++) {
    const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[i], c = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let n1 = nrm(a, b), n2 = nrm(b, c); n1 = n1 || n2 || [0, -1]; n2 = n2 || n1;
    let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const l = Math.hypot(mx, my) || 1; mx /= l; my /= l;
    const k = d / Math.max(0.3, mx * n1[0] + my * n1[1]);
    out.push([b[0] + mx * k, b[1] + my * k]);
  }
  return out;
}
const decArea = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function decInset(P, d) { const Q = decOffset(P, d, true); return Math.abs(decArea(Q)) < Math.abs(decArea(P)) === d > 0 ? Q : decOffset(P, -d, true); }   // d > 0 shrinks
// a circle that starts at the bottom, so a draw-on 'from the middle' opens at the top and runs down both sides
function decCirclePts(x, y, r, n = 72) { const P = []; for (let i = 0; i < n; i++) { const a = Math.PI / 2 + i / n * TAU; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return P; }
function decNgon(x, y, rx, n = 8, rot = Math.PI / 8, ry = rx) { const P = []; for (let i = 0; i < n; i++) { const a = Math.PI / 2 + rot + i / n * TAU; P.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return P; }
function decChamfer(x, y, w, h, c) { c = Math.max(0, Math.min(c, w / 2, h / 2)); return [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]]; }
// a pointed leaf / petal from its base (x, y), len long, wid wide, pointing along ang
function decLeafPts(x, y, len, wid, ang = -Math.PI / 2, n = 10) {
  const P = [], ca = Math.cos(ang), sa = Math.sin(ang);
  for (let i = 0; i <= 2 * n; i++) { const u = i <= n ? i / n : 2 - i / n, s = i <= n ? 1 : -1, d = len * u, o = s * wid / 2 * Math.sin(Math.PI * u) ** 0.8; if (i === 2 * n) break; P.push([x + ca * d - sa * o, y + sa * d + ca * o]); }
  return P;
}
// a stepped pyramid outline standing on y = base: n steps, the top one `top` (0..1) as wide as the bottom
function decStepPts(x, base, w, h, n = 3, top = 0.4) {
  const L = [], R = [];
  for (let i = 0; i < n; i++) { const wi = w * lerp(1, top, n > 1 ? i / (n - 1) : 0) / 2, y0 = base - h * i / n, y1 = base - h * (i + 1) / n; L.push([x - wi, y0], [x - wi, y1]); R.unshift([x + wi, y1], [x + wi, y0]); }
  return [...L, ...R];
}
// an arch as an open path: left foot -> apex -> right foot. kind: 'pointed' | 'round' | 'step'
function decArchPts(x, base, w, h, kind = 'pointed', n = 20) {
  const R = w / 2, L = [[x - R, base]];
  if (kind === 'round') { const sy = base - h + R; for (let i = 0; i <= n; i++) { const a = Math.PI + Math.PI / 2 * i / n; L.push([x + Math.cos(a) * R, sy + Math.sin(a) * R]); } }
  else if (kind === 'step') { const st = 3, sw = R / (st + 1), sh = sw * 0.8, sy = base - h + st * sh; L.push([x - R, sy]); for (let i = 1; i <= st; i++) L.push([x - R + sw * i, sy - sh * (i - 1)], [x - R + sw * i, sy - sh * i]); L.push([x, base - h]); }
  else { const Rp = w * 0.92, cl = x - R + Rp, th = Math.acos((Rp - R) / Rp), sy = base - h + Rp * Math.sin(th); for (let i = 0; i <= n; i++) { const a = Math.PI + th * i / n; L.push([cl + Math.cos(a) * Rp, sy + Math.sin(a) * Rp]); } }
  return [...L, ...L.slice(0, -1).reverse().map(([px, py]) => [2 * x - px, py])];
}
// a crescent: a disc of radius r with a second disc bitten out toward angle `to` (default the upper right)
function decCrescentPts(x, y, r, o = {}) {
  const to = o.to ?? -0.5, d = r * (o.bite ?? 0.42), r1 = r * (o.inner ?? 0.84), cx = x + Math.cos(to) * d, cy = y + Math.sin(to) * d;
  const a = (r * r - r1 * r1 + d * d) / (2 * d), ha = Math.acos(clamp(a / r, -1, 1)), hb = Math.acos(clamp((a - d) / r1, -1, 1)), P = [], n = 40;
  for (let i = 0; i <= n; i++) { const t = to + ha + (TAU - 2 * ha) * i / n; P.push([x + Math.cos(t) * r, y + Math.sin(t) * r]); }
  for (let i = 1; i < n; i++) { const t = to - hb - (TAU - 2 * hb) * i / n; P.push([cx + Math.cos(t) * r1, cy + Math.sin(t) * r1]); }
  return P;
}

// ---------------------------------------------------------------------
//  the medium's primitives: a line that draws itself on, the set of parallel rules, a flat silhouette edged in gold
// ---------------------------------------------------------------------
// o: c ('gold'), w (hair), p (0..1 drawn), from ('start' | 'mid' | 'end'), closed, al, cap, join
function decLine(P, o = {}) {
  const p = clamp(o.p ?? 1); if (p <= 0 || P.length < 2) return;
  if (p >= 1) decPoly(P, !!o.closed);
  else {
    const Q = o.closed ? [...P, P[0]] : P, S = o.from === 'mid' ? decSub(Q, 0.5 - p / 2, 0.5 + p / 2) : o.from === 'end' ? decSub(Q, 1 - p, 1) : decSub(Q, 0, p);
    if (S.length < 2) return; decPoly(S, false);
  }
  decStrokeNow(o.c, o.w ?? DEC_W.hair, o);
}
// THE motif: one heavier line with n hairlines running beside it. o: n (2), gap (9), heavy (6), hair (2.2), side (1 | -1), + decLine's
function decRules(P, o = {}) {
  const n = o.n ?? 2, gap = o.gap ?? 9, hv = o.heavy ?? DEC_W.heavy, side = o.side ?? 1, p = o.p ?? 1;
  decLine(P, { ...o, w: hv });
  for (let k = 1; k <= n; k++) decLine(decOffset(P, side * (hv / 2 + gap * k), !!o.closed), { ...o, w: o.hair ?? DEC_W.hair, p: clamp(p * (1 + 0.12 * k) - 0.12 * k) });
}
// o: fill (a colour; 'gold' / 'amber' / 'pale' = metal), edge ('gold'; false = none), w (mid), inset ([px, …] hairlines inside), p (edge draw-on), al
function decShape(P, o = {}) {
  if (o.fill) { decPoly(P, true); decFillNow(o.fill, { al: o.al }); }
  if (o.edge !== false) decLine(P, { closed: true, c: o.edge, w: o.w ?? DEC_W.mid, al: o.al, p: o.p, from: o.from });
  for (const d of o.inset || []) decLine(decInset(P, d), { closed: true, c: o.edge || 'gold', w: DEC_W.hair, al: o.al, p: o.p, from: o.from });
}

// ---------------------------------------------------------------------
//  the ground: lacquer in colour c with a soft vertical sheen (cached overlay); grain and vignette go on in STYLE.post
// ---------------------------------------------------------------------
function decSheen() {
  return decMemo('sheen', () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const band = (x, w, al) => { const lg = g.createLinearGradient(x - w, 0, x + w, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${al})`); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(x - w, 0, 2 * w, H); };
    band(W * 0.5, W * 0.42, 0.085); band(W * 0.2, W * 0.08, 0.022); band(W * 0.8, W * 0.08, 0.022); band(W * 0.36, W * 0.035, 0.013); band(W * 0.64, W * 0.035, 0.013);
    const vg = g.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(0,0,0,0.34)'); vg.addColorStop(0.3, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.4)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H); return cv;
  });
}
function decLens() {
  return decMemo('lens', () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = RNG('decgrain');
    const rg = g.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, H * 0.72); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.38)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,238,200,0.075)'; g.beginPath(); for (let i = 0; i < 11000; i++) g.rect(R.r(0, W), R.r(0, H), 1.6, 1.6); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); for (let i = 0; i < 11000; i++) g.rect(R.r(0, W), R.r(0, H), 1.8, 1.8); g.fill();
    return cv;
  });
}
function decGround(c = DEC.night) { ctx.save(); ctx.fillStyle = c; ctx.fillRect(-80, -80, W + 160, H + 160); ctx.drawImage(decSheen(), 0, 0); ctx.restore(); }

// ---------------------------------------------------------------------
//  ornaments. Each is symmetric about its own x; mirror pairs with decMirror. Progress arguments are 0..1.
// ---------------------------------------------------------------------
// a sunburst fan about (x, y), opening like a hand fan from its middle ray. o: r0 (inner radius), n (13 rays, odd), mid (-90deg),
//   span (half angle, 90deg; 180deg = a full burst), open, ext (rays extend in sequence from the middle), wedge (true = thin gold
//   wedges, false = lines), alt (0.74: the short rays), fat (0.42), rim (arcs at the root), tips (dots on the long rays), c, w, al
function decFan(x, y, r, o = {}) {
  const n = o.n ?? 13, mid = o.mid ?? -Math.PI / 2, span = o.span ?? Math.PI / 2, r0 = o.r0 ?? r * 0.3, open = clamp(o.open ?? 1), ext = clamp(o.ext ?? 1);
  if (open <= 0) return;
  const full = span >= Math.PI - 1e-6, m = full ? n : n - 1, wedge = o.wedge !== false, alt = o.alt ?? 0.74, hw = span * open / Math.max(1, m) * (o.fat ?? 0.42), tips = [];
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const k = m ? i / m * 2 - 1 : 0, a = mid + k * span * open, e = EZ.io(clamp(ext * 2 - Math.abs(k))); if (e <= 0) continue;
    const long = Math.round(Math.abs(k) * m / 2) % 2 === 0, r1 = lerp(r0, r * (long ? 1 : alt), e), ca = Math.cos(a), sa = Math.sin(a);
    if (wedge) { ctx.moveTo(x + ca * r0, y + sa * r0); ctx.lineTo(x + Math.cos(a - hw) * r1, y + Math.sin(a - hw) * r1); ctx.lineTo(x + Math.cos(a + hw) * r1, y + Math.sin(a + hw) * r1); ctx.closePath(); }
    else { ctx.moveTo(x + ca * r0, y + sa * r0); ctx.lineTo(x + ca * r1, y + sa * r1); }
    if (long && e >= 1) tips.push([x + ca * (r1 + 12), y + sa * (r1 + 12)]);
  }
  if (wedge) decFillNow(o.c, { al: o.al }); else decStrokeNow(o.c, o.w ?? DEC_W.hair, { al: o.al });
  if (o.rim) for (const [d, w] of [[10, DEC_W.hair], [22, DEC_W.mid]]) { ctx.beginPath(); ctx.arc(x, y, Math.max(1, r0 - d), mid - span * open, mid + span * open); decStrokeNow(o.c, w, { al: o.al }); }
  if (o.tips) { ctx.beginPath(); for (const [tx, ty] of tips) { ctx.moveTo(tx + 4, ty); ctx.arc(tx, ty, 4, 0, TAU); } decFillNow(o.c, { al: o.al }); }
}
// a stepped tower (ziggurat / skyscraper) on y = base, rising tier by tier. o: tiers (4), rise, fill, lit (0..1: windows come on),
//   spire (px), pitch (28: pilaster spacing), key
function decZig(x, base, w, h, o = {}) {
  const n = o.tiers ?? 4, rise = clamp(o.rise ?? 1), key = o.key ?? 'zig', lit = clamp(o.lit ?? 0);
  const ws = []; let sum = 0; for (let i = 0; i < n; i++) { ws.push(n - 0.6 * i); sum += n - 0.6 * i; }
  let yb = base;
  for (let i = 0; i < n; i++) {
    const ri = EZ.io(clamp(rise * n - i)); if (ri <= 0) break;
    const wi = w * (1 - 0.72 * i / n), hi = h * ws[i] / sum * ri, x0 = x - wi / 2, y0 = yb - hi, m = Math.max(2, Math.round(wi / (o.pitch ?? 28)));
    ctx.fillStyle = o.fill ?? DEC.ink; ctx.fillRect(x0, y0, wi, hi + 1);
    ctx.beginPath(); for (let j = 1; j < m; j++) { const xx = x0 + wi * j / m; ctx.moveTo(xx, yb - 3); ctx.lineTo(xx, y0 + 6); } decStrokeNow(o.c, DEC_W.hair * 0.8, { al: 0.6 });
    if (lit > 0 && ri >= 1) {
      ctx.fillStyle = DEC.cream; const cw = wi / m, rows = Math.floor((hi - 22) / 30);
      for (let q = 0; q < rows; q++) for (let j = 0; j < m; j++) if (RNG(key, 'win', i, Math.min(j, m - 1 - j), q).f() < lit * 0.55) ctx.fillRect(x0 + cw * (j + 0.5) - cw * 0.17, y0 + 16 + q * 30, cw * 0.34, 13);
    }
    decLine([[x0, yb], [x0, y0], [x0 + wi, y0], [x0 + wi, yb]], { c: o.c, w: DEC_W.mid });
    decLine([[x0 - 6, y0], [x0 + wi + 6, y0]], { c: o.c, w: DEC_W.heavy - 1 });
    yb = y0;
  }
  const sp = o.spire ?? 0, k = EZ.io(clamp(rise * n - n + 1));
  if (sp && k >= 1) { decLine([[x, yb], [x, yb - sp]], { c: o.c, w: DEC_W.mid }); decShape(decNgon(x, yb - sp, 7, 4, 0, 11), { fill: o.c ?? 'gold', edge: false }); }
}
// a stepped plinth / pyramid. o: steps (3), top (0.4), fill, c, rise
function decSteps(x, base, w, h, o = {}) {
  const n = o.steps ?? 3, k = EZ.io(clamp(o.rise ?? 1)); if (k <= 0) return;
  const P = decStepPts(x, base, w, h * k, n, o.top ?? 0.4);
  decShape(P, { fill: o.fill ?? DEC.ink, edge: o.c ?? 'gold' });
  for (let i = 1; i < n; i++) { const wi = w * lerp(1, o.top ?? 0.4, i / (n - 1)) / 2, y = base - h * k * i / n + 7; decLine([[x - wi + 6, y], [x + wi - 6, y]], { c: o.c, al: 0.7 }); }
}
// a scallop (shell / fish-scale) repeat filling a band; drawn once into a cached canvas. o: s (44: the shell's radius), rings (3), c, al, p (opens from the middle)
function decScallops(x0, y0, w, h, o = {}) {
  const s = o.s ?? 44, rings = o.rings ?? 3, c = o.c ?? 'gold', p = clamp(o.p ?? 1); if (p <= 0) return;
  const cv = decMemo(`scal:${w}:${h}:${s}:${rings}:${c}`, () => {
    const v = document.createElement('canvas'); v.width = Math.ceil(w); v.height = Math.ceil(h); const g = v.getContext('2d');
    g.lineWidth = DEC_W.hair; g.strokeStyle = decInk(c);
    for (let j = 0, y = s; y - s < h + s; j++, y += s) for (let x = j % 2 ? 0 : s; x - s < w; x += 2 * s) {
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
      for (let k = 0; k < rings; k++) { g.beginPath(); g.arc(x, y, s * (1 - k / (rings + 0.4)) - 1.2, Math.PI, TAU); g.stroke(); }
    }
    return v;
  });
  ctx.save(); ctx.globalAlpha *= o.al ?? 1; ctx.beginPath(); ctx.rect(x0 + w / 2 * (1 - p), y0, w * p, h); ctx.clip(); ctx.drawImage(cv, x0, y0); ctx.restore();
}
// a chevron band centred on x. o: s (28: half a chevron), h (20), n (2 nested rows), gap (9), up (true), p (draws from the middle out), c, w, al
function decChevrons(x, y, w, o = {}) {
  const cnt = 2 * Math.max(1, Math.round(w / (2 * (o.s ?? 28)))), s = w / cnt, hh = (o.h ?? 20) * (o.up === false ? -1 : 1), P = [];
  for (let i = 0; i <= cnt; i++) P.push([x - w / 2 + i * s, y - (i % 2 ? hh : 0)]);
  for (let k = 0; k < (o.n ?? 2); k++) decLine(P.map(([px, py]) => [px, py + k * (o.gap ?? 9)]), { c: o.c, w: o.w ?? DEC_W.hair, p: o.p, from: 'mid', al: o.al });
}
// nested octagons (or any n-gon: sides, rot, squash). o: n (3 rings), gap (10), sides (8), rot, sq (ry / rx), fill, p, c
function decOct(x, y, r, o = {}) {
  const n = o.n ?? 3, gap = o.gap ?? 10, sides = o.sides ?? 8, rot = o.rot ?? Math.PI / sides, sq = o.sq ?? 1;
  for (let k = 0; k < n; k++) {
    const rr = r - k * gap; if (rr <= 2) break;
    const P = decNgon(x, y, rr, sides, rot, rr * sq);
    if (k === 0 && o.fill) { decPoly(P, true); decFillNow(o.fill); }
    decLine(P, { closed: true, c: o.c, w: k === 0 ? DEC_W.mid : DEC_W.hair, p: clamp((o.p ?? 1) * (1 + 0.15 * k) - 0.15 * k), from: 'mid', al: o.al });
  }
}
// nested diamonds: decOct with four sides. o: as decOct, ry (the half height; default 1.5 r)
const decDiamond = (x, y, r, o = {}) => decOct(x, y, r, { sides: 4, rot: 0, sq: (o.ry ?? r * 1.5) / r, ...o });
// a small four-point diamond that twinkles. o: c ('gold'), key (its phase), rate (2.6), tw (0..1 to drive it by hand), flare (true)
function decGem(x, y, s, o = {}) {
  if (s <= 0.3) return;
  const tw = o.tw ?? 0.5 + 0.5 * Math.sin(TT * (o.rate ?? 2.6) + RNG('gem', o.key ?? 'g').r(0, TAU)), k = s * (0.6 + 0.4 * tw), q = k * 0.2;
  decPoly([[x, y - k], [x + q, y - q], [x + k * 0.66, y], [x + q, y + q], [x, y + k], [x - q, y + q], [x - k * 0.66, y], [x - q, y - q]], true); decFillNow(o.c ?? 'gold');
  const f = clamp((tw - 0.7) / 0.3); if (f > 0 && o.flare !== false) { ctx.beginPath(); ctx.moveTo(x - k * 1.9 * f, y); ctx.lineTo(x + k * 1.9 * f, y); ctx.moveTo(x, y - k * 2.4 * f); ctx.lineTo(x, y + k * 2.4 * f); decStrokeNow(o.c ?? 'gold', 1.5, { al: 0.85 * f }); }
}
// a slender arch on y = base, drawn from both feet up to the apex. o: kind ('pointed' | 'round' | 'step'), n (2 inner hairlines),
//   gap (10), p, fill (the opening), caps (true: little cornices where the feet stand), c
function decArch(x, base, w, h, o = {}) {
  const p = clamp(o.p ?? 1), n = o.n ?? 2, gap = o.gap ?? 10; if (p <= 0) return;
  const P = decMemo(`arch:${x}:${base}:${w}:${h}:${o.kind}`, () => decArchPts(x, base, w, h, o.kind));
  if (o.fill) { ctx.save(); ctx.globalAlpha *= p; decPoly(P, true); ctx.fillStyle = o.fill; ctx.fill(); ctx.restore(); }
  for (let k = 0; k <= n; k++) {
    const Q = k ? decMemo(`arch:${x}:${base}:${w - 2 * gap * k - DEC_W.heavy}:${h - gap * k - 3}:${o.kind}`, () => decArchPts(x, base, w - 2 * gap * k - DEC_W.heavy, h - gap * k - 3, o.kind)) : P;
    const pk = clamp(p * (1 + 0.12 * k) - 0.12 * k), st = { c: o.c, w: k ? DEC_W.hair : DEC_W.heavy };
    if (pk >= 1) decLine(Q, st); else { decLine(decSub(Q, 0, pk / 2), st); decLine(decSub(Q, 1 - pk / 2, 1), st); }
  }
  if (o.caps !== false) for (const s of [-1, 1]) decLine([[x + s * (w / 2 + 12), base], [x + s * (w / 2 - 12 - gap * n), base]], { c: o.c, w: DEC_W.heavy, p: clamp(p * 4) });
}
// a fountain on y = base: a stepped basin, a centre jet and two arcs a side whose water runs in a loop. s = scale (1: 200 wide).
//   o: rise (0..1: the jets come up), jet ('cream'), t (TT), fill, c
function decFountain(x, base, s = 1, o = {}) {
  const rise = EZ.io(clamp(o.rise ?? 1)), t = o.t ?? TT, jc = o.jet ?? 'cream', y0 = base - 132 * s;
  if (rise > 0) {
    const arcs = [[46 * s, base - 106 * s, 54 * s], [92 * s, base - 46 * s, 96 * s]];
    for (const dir of [-1, 1]) arcs.forEach(([d, yl, ap], j) => {
      const P = []; for (let i = 0; i <= 20; i++) { const u = i / 20; P.push([x + dir * d * u, y0 + (yl - y0) * u - 4 * ap * rise * u * (1 - u)]); }
      decLine(P, { c: jc, al: 0.4, p: rise });
      if (rise >= 1) for (let k = 0; k < 3; k++) { const a = mod(t * 0.9 + k / 3 + j * 0.17, 1); decLine(decSub(P, a, a + 0.2), { c: jc, w: DEC_W.mid }); }
      if (rise >= 1) { const ph = mod(t * 1.8 + j * 0.37, 1); ctx.beginPath(); ctx.ellipse(x + dir * d, yl - 2, 4 + 12 * ph, 2 + 3 * ph, 0, 0, TAU); decStrokeNow(jc, 1.6, { al: 0.9 * (1 - ph) }); }
    });
    const top = y0 - 120 * s * rise, bob = rise >= 1 ? 5 * Math.sin(t * 5) : 0;
    decLine([[x, y0], [x, top + bob]], { c: jc, w: DEC_W.mid });
    for (const a of [-0.5, 0, 0.5]) decLine([[x, top + bob], [x + Math.sin(a) * 26 * s * rise, top + bob - Math.cos(a) * 22 * s * rise]], { c: jc });
  }
  const fill = o.fill ?? DEC.ink;
  decShape([[x - 7 * s, base - 46 * s], [x - 7 * s, base - 108 * s], [x + 7 * s, base - 108 * s], [x + 7 * s, base - 46 * s]], { fill, edge: o.c, w: DEC_W.hair });
  decShape([[x - 46 * s, y0 + 6 * s], [x + 46 * s, y0 + 6 * s], [x + 26 * s, base - 106 * s], [x - 26 * s, base - 106 * s]], { fill, edge: o.c });
  decShape([[x - 100 * s, base - 46 * s], [x + 100 * s, base - 46 * s], [x + 72 * s, base], [x - 72 * s, base]], { fill, edge: o.c });
  decLine([[x - 108 * s, base - 46 * s], [x + 108 * s, base - 46 * s]], { c: o.c, w: DEC_W.heavy - 1 });
  decLine([[x - 86 * s, base - 30 * s], [x + 86 * s, base - 30 * s]], { c: o.c, al: 0.8 }); decLine([[x - 78 * s, base - 17 * s], [x + 78 * s, base - 17 * s]], { c: o.c, al: 0.8 });
}
// a fan of pointed leaves from (x, y). o: n (5), mid (-90deg), span (half angle, 70deg), wid (0.24 of len), p (unfolds), fill, c, vein ('teal')
function decLeaves(x, y, len, o = {}) {
  const n = o.n ?? 5, mid = o.mid ?? -Math.PI / 2, span = o.span ?? 70 * DEG, p = EZ.io(clamp(o.p ?? 1)); if (p <= 0) return;
  const order = [...Array(n).keys()].sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));   // the outer leaves first, the middle one on top
  for (const i of order) {
    const k = n > 1 ? i / (n - 1) * 2 - 1 : 0, a = mid + k * span * p, l = len * (1 - 0.14 * Math.abs(k)) * lerp(0.45, 1, p);
    decShape(decLeafPts(x, y, l, l * (o.wid ?? 0.24), a), { fill: o.fill ?? DEC.ink, edge: o.c, w: DEC_W.hair + 0.6 });
    if (o.vein !== false) decLine([[x + Math.cos(a) * l * 0.12, y + Math.sin(a) * l * 0.12], [x + Math.cos(a) * l * 0.8, y + Math.sin(a) * l * 0.8]], { c: o.vein ?? 'teal', w: DEC_W.hair });
  }
}
// a stylised palm: a ringed trunk h tall and a crown of leaves. o: r (leaf length, 120), p, + decLeaves'
function decPalm(x, base, h, o = {}) {
  const p = clamp(o.p ?? 1), top = base - h * EZ.io(clamp(p * 2)); if (p <= 0) return;
  decLine([[x - 6, base], [x - 4, top]], { c: o.c }); decLine([[x + 6, base], [x + 4, top]], { c: o.c });
  ctx.beginPath(); for (let y = base - 22; y > top + 10; y -= 34) { ctx.moveTo(x - 6, y); ctx.lineTo(x, y - 8); ctx.lineTo(x + 6, y); } decStrokeNow(o.c, DEC_W.hair * 0.8, { al: 0.8 });
  decLeaves(x, top, o.r ?? 120, { n: 7, span: 100 * DEG, wid: 0.2, ...o, p: clamp(p * 2 - 1) });
  if (p > 0.5) { ctx.beginPath(); ctx.arc(x, top, 9, 0, TAU); decFillNow(o.c ?? 'gold'); }
}
// a lotus: decLeaves as broad petals on two hairline arcs. o: n (5), p (opens), fill, c
function decLotus(x, y, s, o = {}) {
  decLeaves(x, y, s, { n: 5, span: 62 * DEG, wid: 0.42, vein: false, ...o });
  for (const [r, w] of [[s * 0.2, DEC_W.mid], [s * 0.34, DEC_W.hair]]) { ctx.beginPath(); ctx.arc(x, y - s * 0.02, r, 0.12, Math.PI - 0.12); decStrokeNow(o.c, w, { al: clamp((o.p ?? 1) * 2) }); }
}
// a moon / sun disc: its rim draws on from the top, then it fills from the middle. o: p (rim), fill (0..1), c ('pale'), ring (true: a
//   hairline 12 px outside), bands (0: dark hairline stripes across the lower part), ground (the stripes' colour)
function decDisc(x, y, r, o = {}) {
  const p = clamp(o.p ?? 1), fill = EZ.io(clamp(o.fill ?? 1)), c = o.c ?? 'pale';
  if (fill > 0) {
    ctx.beginPath(); ctx.arc(x, y, r * fill, 0, TAU); decFillNow(c);
    if (o.bands && fill >= 1) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); ctx.fillStyle = o.ground ?? DEC.night; for (let i = 0; i < o.bands; i++) ctx.fillRect(x - r, y + r * (0.42 + 0.19 * i), 2 * r, 3 + 2.5 * i); ctx.restore(); }
  }
  const P = decCirclePts(x, y, r); decLine(P, { closed: true, from: 'mid', p, c: 'gold', w: DEC_W.mid });
  if (o.ring !== false) decLine(decCirclePts(x, y, r + 12), { closed: true, from: 'mid', p: clamp(p * 1.2 - 0.2), c: 'gold' });
}
// a crescent moon. o: to (the open side's angle, -0.5), bite, inner, c ('pale'), edge
function decCrescent(x, y, r, o = {}) { decShape(decCrescentPts(x, y, r, o), { fill: o.c ?? 'pale', edge: o.edge ?? 'gold', w: DEC_W.hair, p: o.p }); }
// a round lantern / medallion: a glowing ribbed globe between two gold bands, a stepped cap and finial, a chain and a tassel.
//   o: lit (0..1), hang (the y its chain hangs from), ribs (3), tassel (true), glow (true), ring (true), key
function decLantern(x, y, r, o = {}) {
  const lit = clamp(o.lit ?? 1), ribs = o.ribs ?? 3, z = decZoom();
  if (o.glow !== false && lit > 0) { const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3); g.addColorStop(0, decA('#ffd98a', 0.34 * lit)); g.addColorStop(1, decA('#ffd98a', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill(); }
  if (o.hang != null) {
    decLine([[x, o.hang], [x, y - r * 1.3]]);
    for (let yy = y - r * 1.3 - 26; yy > o.hang + 16; yy -= 54) decShape(decNgon(x, yy, 5, 4, 0, 8), { fill: 'gold', edge: false });
  }
  for (const s of [-1, 1]) {   // the cap above, the finial below
    decShape([[x - r * 0.36, y + s * r * 0.92], [x + r * 0.36, y + s * r * 0.92], [x + r * 0.24, y + s * r * 1.13], [x - r * 0.24, y + s * r * 1.13]], { fill: 'gold', edge: false });
    decShape([[x - r * 0.13, y + s * r * 1.13], [x + r * 0.13, y + s * r * 1.13], [x + r * 0.08, y + s * r * 1.3], [x - r * 0.08, y + s * r * 1.3]], { fill: 'gold', edge: false });
  }
  if (o.tassel !== false) {
    const y1 = y + r * 1.3, L = Math.max(28, r * 0.42);
    ctx.beginPath(); for (const [dx, k] of [[-r * 0.06, 0.74], [0, 1], [r * 0.06, 0.74]]) { ctx.moveTo(x + dx, y1); ctx.lineTo(x + dx, y1 + L * k); } decStrokeNow('gold', DEC_W.hair * 0.9);
    decGem(x, y1 + L + 12, Math.max(8, r * 0.1), { key: (o.key ?? 'lan') + 't', c: 'cream' });
  }
  const g2 = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
  g2.addColorStop(0, decMix('#a8802f', '#fffbe8', lit)); g2.addColorStop(0.5, decMix('#84601f', '#f6cf6c', lit)); g2.addColorStop(1, decMix('#58400f', '#c9952f', lit));
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g2; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.strokeStyle = decA(DEC.ink, 0.62); ctx.lineWidth = DEC_W.hair / z; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
  for (let k = 1; k <= ribs; k++) { const rx = r * Math.sin(k / (ribs + 1) * Math.PI / 2); ctx.moveTo(x + rx, y); ctx.ellipse(x, y, rx, r, 0, 0, TAU); }
  ctx.stroke();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.rect(x - r, y + s * r * 0.66 - r * 0.055, 2 * r, r * 0.11); decFillNow('gold'); ctx.strokeStyle = decA(DEC.ink, 0.7); ctx.stroke(); }
  ctx.restore();
  decGem(x, y, r * 0.22, { c: 'cream', tw: 0.6 + 0.4 * lit, flare: false });
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); decStrokeNow('gold', r > 70 ? DEC_W.heavy : DEC_W.mid);
  if (o.ring !== false) { ctx.beginPath(); ctx.arc(x, y, r + 12, 0, TAU); decStrokeNow('gold', DEC_W.hair); }
}
// water under a horizon: rows of short dashes mirrored about x, re-dealt four times a second. o: w (half width), rows (3), gap (13), c, al, key
function decShimmer(x, y, o = {}) {
  const hw = o.w ?? 300, rows = o.rows ?? 3, gap = o.gap ?? 13, step = Math.floor(TT * 4 + 1e-6);
  ctx.beginPath();
  for (let j = 0; j < rows; j++) {
    const R = RNG('shim', o.key ?? 's', j, step), yy = y + j * gap, n = 3 + j;
    for (let i = 0; i < n; i++) { const d = R.r(0.04, 0.95) * hw, l = R.r(16, 60) * (1 - d / hw * 0.5); for (const s of [-1, 1]) { ctx.moveTo(x + s * d, yy); ctx.lineTo(x + s * Math.min(hw, d + l), yy); } }
  }
  decStrokeNow(o.c, DEC_W.hair * 0.8, { al: o.al ?? 0.55 });
}
// the ornate frame: a heavy line and two hairlines with stepped corners, closing in from the four corners, and quarter fans
// inside the corners. o: x0, y0, x1, y1 (44, 150, W - 44, H - 150), notch (34), p, fans ('all' | 'top' | 'bottom' | false), fan (118: radius)
function decFrame(o = {}) {
  const x0 = o.x0 ?? 44, y0 = o.y0 ?? 150, x1 = o.x1 ?? W - 44, y1 = o.y1 ?? H - 150, nt = o.notch ?? 34, p = EZ.io(clamp(o.p ?? 1)); if (p <= 0) return;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, fans = o.fans ?? 'all', fr = o.fan ?? 118;
  const quad = (d) => [[cx, y0 + d], [x0 + 2 * nt + d, y0 + d], [x0 + 2 * nt + d, y0 + nt + d], [x0 + nt + d, y0 + nt + d], [x0 + nt + d, y0 + 2 * nt + d], [x0 + d, y0 + 2 * nt + d], [x0 + d, cy]];
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy); ctx.translate(-cx, -cy);
    [[0, DEC_W.heavy], [13, DEC_W.hair], [22, DEC_W.hair]].forEach(([d, w], k) => {
      const P = quad(d), fc = (pathLen(P.slice(0, 4)) + 0) / pathLen(P), pk = clamp(p * (1 + 0.1 * k) - 0.1 * k);
      decLine(pk >= 1 ? P : decSub(P, fc * (1 - pk), fc + (1 - fc) * pk), { w });
    });
    if (fans === 'all' || (fans === 'top' && sy === 1) || (fans === 'bottom' && sy === -1)) decFan(x0 + nt + 22, y0 + nt + 22, fr, { mid: Math.PI / 4, span: Math.PI / 4, n: 7, r0: 30, open: p, ext: p, wedge: false, rim: false, alt: 0.7, tips: true });
    ctx.restore();
  }
}

// ---------------------------------------------------------------------
//  the hero: a gold crane / peacock in profile, built from a teardrop, an S-curve neck and a tail that opens like a fan.
//  Faceless. (x, y) = the body's centre, r = half its standing height (it stands on y + r). Faces right; flip to face left.
//   o: key, mood ('calm' | 'wow' | 'bow'), neck (-1 bowed .. 0 .. 1 stretched up), fan (0 a closed train .. 1 a full display),
//      feathers (9), step (0..1: one foot lifted), tw (0..1: a ripple of light across the tail eyes), c ('amber'), flip
// ---------------------------------------------------------------------
function decBird(x, y, r, o = {}) {
  const key = o.key ?? 'bird', dir = o.flip ? -1 : 1, mood = o.mood ?? 'calm', c = o.c ?? 'amber', idle = Math.sin(TT * 2.4 + 0.6);
  const neck = clamp((o.neck ?? (mood === 'wow' ? 1 : mood === 'bow' ? -1 : 0)) + 0.05 * idle, -1, 1), fan = EZ.io(clamp(o.fan ?? (mood === 'wow' ? 1 : 0)));
  const L = (u, v) => [x + dir * u * r, y + v * r], hw = Math.max(DEC_W.hair, r * 0.03);
  SPARK_AT = toScreen(x, y);
  // the tail: a closed train trailing behind, or the fan standing up behind the body
  const nF = o.feathers ?? 9, tu = lerp(-0.46, -0.1, fan), tv = lerp(0.1, 0.05, fan), len = lerp(0.82, 1.4, fan), ang = (i) => lerp(163 + (i - (nF - 1) / 2) * 3.4, 192 + i * 156 / (nF - 1), fan) * DEG;
  const at = (a, d) => L(tu + Math.cos(a) * d, tv + Math.sin(a) * d);
  ctx.beginPath(); for (let i = 0; i < nF; i++) { const a = ang(i), p0 = at(a, 0.16), p1 = at(a, len); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); } decStrokeNow(c, hw);
  if (fan > 0.25) for (const d of [0.56, 0.8]) { const P = []; for (let i = 0; i <= 30; i++) P.push(at(lerp(ang(0), ang(nF - 1), i / 30), len * d)); decLine(P, { c, w: DEC_W.hair * 0.9, al: clamp((fan - 0.25) * 3) }); }
  for (let i = 0; i < nF; i++) {
    const [ex, ey] = at(ang(i), len), e = r * 0.07 * lerp(0.42, 1, fan), rip = o.tw != null ? clamp(1 - Math.abs(o.tw * (nF + 3) - 2 - i) / 1.6) : 0;
    ctx.beginPath(); ctx.arc(ex, ey, e * (1 + 0.5 * rip), 0, TAU); decFillNow(c);
    ctx.beginPath(); ctx.arc(ex, ey, e * 0.52, 0, TAU); ctx.fillStyle = rip > 0.3 ? DEC.cream : DEC.teal; ctx.fill();
  }
  // legs
  const lift = clamp(o.step ?? 0);
  for (let k = 0; k < 2; k++) { const up = k === 1 ? lift * 0.22 : 0, f = L(-0.03 + 0.17 * k, 1 - up); decLine([L(-0.04 + 0.16 * k, 0.2), L(-0.11 + 0.16 * k, 0.6 - up * 0.6), f, [f[0] + dir * r * 0.17, f[1]]], { c, w: hw, join: 'round' }); }
  // the body: a teardrop, its point toward the tail
  const body = []; for (let i = 0; i < 40; i++) { const th = i / 40 * TAU, ct = Math.cos(th), bx = ct * 0.44 - 0.22 * Math.max(0, -ct) ** 3, by = Math.sin(th) * 0.3 * (0.5 + 0.5 * (ct + 1) / 2), cr = Math.cos(-0.3), sr = Math.sin(-0.3); body.push(L(bx * cr - by * sr, bx * sr + by * cr)); }
  // the neck: an S-curve whose head goes up (neck 1) or forward and down (neck -1)
  const N0 = [[0.24, -0.12], [0.62, -0.3], [0.2, -0.62], [0.5, -0.92]], N1 = neck >= 0 ? [[0.24, -0.12], [0.6, -0.42], [0.28, -0.8], [0.4, -1.12]] : [[0.24, -0.12], [0.58, -0.56], [0.84, -0.74], [0.88, -0.28]];
  const q = Math.abs(neck), Nk = N0.map((p, i) => [lerp(p[0], N1[i][0], q), lerp(p[1], N1[i][1], q)]), sideA = [], sideB = [];
  const bez = (t) => { const m = 1 - t; return [0, 1].map((j) => m * m * m * Nk[0][j] + 3 * m * m * t * Nk[1][j] + 3 * m * t * t * Nk[2][j] + t * t * t * Nk[3][j]); };
  for (let i = 0; i <= 22; i++) { const t = i / 22, a = bez(Math.max(0, t - 0.02)), b = bez(Math.min(1, t + 0.02)), p = bez(t), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, w = lerp(0.105, 0.042, t), nx = -(b[1] - a[1]) / l * w, ny = (b[0] - a[0]) / l * w; sideA.push(L(p[0] + nx, p[1] + ny)); sideB.unshift(L(p[0] - nx, p[1] - ny)); }
  decPoly([...sideA, ...sideB], true); decFillNow(c);
  decPoly(body, true); decFillNow(c); decPoly(body, true); decStrokeNow(DEC.ink, 1.6, { al: 0.55 });
  // the wing: three nested arcs cut into the gold
  for (const [rr, a0, a1] of [[0.15, 0.3, 2.5], [0.23, 0.35, 2.4], [0.31, 0.45, 2.25]]) decLine(arcPts(0, 0, rr, a0, a1, 14).map(([u, v]) => L(u - 0.02, v * 0.72 - 0.08)), { c: DEC.ink, w: DEC_W.hair * 0.9, al: 0.75 });
  // the head, the beak and a crest of three
  const hd = Nk[3], bd = neck >= 0 ? [lerp(0.95, 0.82, q), lerp(0.3, -0.57, q)] : [lerp(0.95, 0.5, q), lerp(0.3, 0.87, q)], bl = Math.hypot(bd[0], bd[1]), ux = bd[0] / bl, uy = bd[1] / bl, H0 = L(hd[0], hd[1]);
  decPoly([L(hd[0] - uy * 0.055, hd[1] + ux * 0.055), L(hd[0] + ux * 0.4, hd[1] + uy * 0.4), L(hd[0] + uy * 0.055, hd[1] - ux * 0.055)], true); ctx.fillStyle = DEC.cream; ctx.fill();
  ctx.beginPath(); ctx.arc(H0[0], H0[1], r * 0.088, 0, TAU); decFillNow(c);
  for (let i = 0; i < 3; i++) {
    const a = Math.atan2(-uy, -ux) + (0.55 + i * 0.42) * 1 + 0.06 * idle, tip = L(hd[0] + Math.cos(a) * 0.26, hd[1] + Math.sin(a) * 0.26);
    decLine([L(hd[0] + Math.cos(a) * 0.07, hd[1] + Math.sin(a) * 0.07), tip], { c, w: DEC_W.hair * 0.9 }); ctx.beginPath(); ctx.arc(tip[0], tip[1], r * 0.03, 0, TAU); ctx.fillStyle = DEC.cream; ctx.fill();
  }
}
const decBirdPts = (x, y, r, n = 96) => ellipsePts(x, y, r * 0.8, r, 0, n);

// ---------------------------------------------------------------------
//  type: tall serif caps (DEC_SERIF) or small engraved caps (DEC_SANS), always tracked wide, set letter by letter so a
//  line can appear from its middle outward. Gold letters carry the metal pattern and the glint.
//   o: font ('serif' | 'sans'), weight (700), track (0.14 em), align ('center' | 'left' | 'right'), reveal (0..1), caps (true)
// ---------------------------------------------------------------------
const decFont = (size, o = {}) => `${o.weight ?? 700} ${size}px ${o.font === 'sans' ? DEC_SANS : DEC_SERIF}`;
const decCase = (s, o) => (o.caps === false ? s : s.toUpperCase());
function decRunW(segs, size, o = {}) {
  ctx.save(); ctx.font = decFont(size, o); let w = 0, n = 0;
  for (const sg of segs) for (const ch of decCase(sg.s, o)) { w += ctx.measureText(ch).width; n++; }
  ctx.restore(); return w + size * (o.track ?? 0.14) * Math.max(0, n - 1);
}
function decRun(segs, x, y, size, o = {}) {   // segs = [{ s, c }, …]: one line in several colours
  ctx.save(); ctx.font = decFont(size, o); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const tr = size * (o.track ?? 0.14), chars = [];
  for (const sg of segs) for (const ch of decCase(sg.s, o)) chars.push({ ch, c: sg.c, w: ctx.measureText(ch).width });
  const n = chars.length, total = chars.reduce((a, q) => a + q.w, 0) + tr * Math.max(0, n - 1), rev = clamp(o.reveal ?? 1), half = (n - 1) / 2 || 1, g = decGlint(), al0 = ctx.globalAlpha;
  let xx = x - (o.align === 'left' ? 0 : o.align === 'right' ? total : total / 2);
  chars.forEach((q, i) => {
    const k = clamp((rev * 1.6 - Math.abs(i - (n - 1) / 2) / half) / 0.6);
    if (k > 0 && q.ch !== ' ') {
      const yy = y + (1 - EZ.o2(k)) * size * 0.18;
      ctx.globalAlpha = al0 * k; ctx.fillStyle = decInk(q.c); ctx.fillText(q.ch, xx, yy);
      if (g && decIsMetal(q.c)) { ctx.fillStyle = g; ctx.fillText(q.ch, xx, yy); }
    }
    xx += q.w + tr;
  });
  ctx.restore(); return total;
}
const decTextW = (str, size, o = {}) => decRunW([{ s: str }], size, o);
const decText = (str, x, y, size, c, o = {}) => decRun([{ s: str, c }], x, y, size, o);

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). The caption is an opaque dark plaque with a
//  double gold rule that opens from its middle; one *word* is set in cream or teal. The tag is small spaced caps
//  between two hairlines. Both close as a bridge starts and open again when the next era is in.
// ---------------------------------------------------------------------
function decBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - EZ.io(seg(TT, r.tc - d, r.tc - d + 0.25));
    if (TT >= r.tc && TT < r.tc + d + 0.25) return EZ.io(seg(TT, r.tc + d - 0.1, r.tc + d + 0.25));
  }
  return 1;
}
//   o: y (the plaque's centre, 1392), x (the centre line), size (54; shrinks to fit maxW), maxW (660), at (seconds into the era, 0.5),
//      c ('gold'), hi ('cream' | 'teal'), plaque (its fill), + decRun's font options
function decCaptionNow(str, o = {}) {
  const bk = decBridgeK(), at = E0 + (o.at ?? 0.5), k = EZ.io(ev(at, 0.4)) * bk; if (k <= 0.02) return;
  const cx = o.x ?? decAX(), cy = o.y ?? 1392, maxW = o.maxW ?? 660, segs = str.split('*').map((s, i) => ({ s, c: i % 2 ? o.hi ?? 'cream' : o.c ?? 'gold' })).filter((q) => q.s);
  let size = o.size ?? 54; while (size > 40 && decRunW(segs, size, o) > maxW) size -= 2;
  const tw = decRunW(segs, size, o), w = (tw + size * 2.7) * k, h = size * 2.3, ch = Math.min(h * 0.2, w / 2 - 1); if (w < 24) return;
  decShape(decChamfer(cx - w / 2, cy - h / 2, w, h, ch), { fill: o.plaque ?? DEC.plaque, edge: 'gold', w: DEC_W.heavy - 1 });
  if (w > 60) decLine(decChamfer(cx - w / 2 + 11, cy - h / 2 + 11, w - 22, h - 22, Math.max(0, ch - 5)), { closed: true });
  if (k > 0.95) for (const s of [-1, 1]) decGem(cx + s * (w / 2 - size * 0.62), cy, size * 0.15, { key: 'cap' + s, c: 'gold', tw: 0.5 + 0.5 * Math.sin(TT * 3), flare: false });
  ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2 + 14, cy - h / 2, Math.max(0, w - 28), h); ctx.clip();   // the words never show outside the plaque
  decRun(segs, cx, cy + size * 0.35, size, { ...o, align: 'center', reveal: ev(at + 0.3, 0.5) * bk });
  ctx.restore();
}
//   o: x (the centre line), y (300), size (40), at (0.2), c ('cream'), half (the hairlines' half length; default from the word)
function decTagNow(str, o = {}) {
  const bk = decBridgeK(), at = E0 + (o.at ?? 0.2), k = EZ.io(ev(at, 0.5)) * bk; if (k <= 0.02) return;
  const size = o.size ?? 40, cx = o.x ?? decAX(), cy = o.y ?? 300, fo = { font: 'sans', track: 0.36, ...o }, half = (o.half ?? decRunW([{ s: str }], size, fo) / 2 + 66) * k, dy = size * 0.86;
  for (const s of [-1, 1]) { decLine([[cx - half, cy + s * dy], [cx + half, cy + s * dy]]); }
  if (k > 0.6) for (const s of [-1, 1]) decShape(decNgon(cx + s * (half + 14), cy, 6, 4, 0, 9), { fill: 'gold', edge: false });
  ctx.save(); ctx.beginPath(); ctx.rect(cx - half, cy - dy, 2 * half, 2 * dy); ctx.clip();
  decRun([{ s: str, c: o.c ?? 'cream' }], cx, cy + size * 0.34, size, { ...fo, align: 'center', reveal: ev(at + 0.2, 0.45) * bk });
  ctx.restore();
}
const decCaption = (str, o = {}) => { const f = () => decCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const decTag = (str, o = {}) => { const f = () => decTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'art-deco',
  paper: DEC.paper,
  // bare lacquer in colour c (hex, or rgb() mid-morph) with the sheen
  backdrop(c) { ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.drawImage(decSheen(), 0, 0); ctx.restore(); },
  // the era seen through a gold-rimmed opening: a heavy line that thins onto the object, a hairline outside it, and a ring of short rays
  window(P, key, src, o = {}) {
    ctx.save(); decPoly(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, k = o.phase === 'grow' ? Math.min(1, u * 4) : Math.min(1, (1 - u) * 4), ce = decCentroid(P), R = P.reduce((a, p) => a + Math.hypot(p[0] - ce[0], p[1] - ce[1]) / P.length, 0);
    if (R < 2 || R > 2600) return;
    decPoly(P, true); decStrokeNow('gold', 2 + 5 * k);
    decPoly(P.map(([x, y]) => [ce[0] + (x - ce[0]) * (R + 12) / R, ce[1] + (y - ce[1]) * (R + 12) / R]), true); decStrokeNow('gold', DEC_W.hair);
    ctx.beginPath(); for (let i = 0; i < 32; i++) { const a = i / 32 * TAU - Math.PI / 2, r0 = R + 26, r1 = r0 + (i % 2 ? 18 : 34) * k; ctx.moveTo(ce[0] + Math.cos(a) * r0, ce[1] + Math.sin(a) * r0); ctx.lineTo(ce[0] + Math.cos(a) * r1, ce[1] + Math.sin(a) * r1); }
    if (k > 0.02) decStrokeNow('gold', DEC_W.hair, { al: k });
  },
  // the morphing shape: a flat medallion in colour c with a metal sheen, the same double rim, and a sunburst that flares at the midpoint
  blob(P, c, key, u = 0) {
    const ce = decCentroid(P), bb = bbox(P), R = P.reduce((a, p) => a + Math.hypot(p[0] - ce[0], p[1] - ce[1]) / P.length, 0), q = Math.sin(Math.PI * clamp(u));
    if (R < 2) return;
    ctx.beginPath(); for (let i = 0; i < 32; i++) { const a = i / 32 * TAU - Math.PI / 2 + u * TAU / 32, r0 = R + 26, r1 = r0 + (i % 2 ? 60 : 130) * q; ctx.moveTo(ce[0] + Math.cos(a) * r0, ce[1] + Math.sin(a) * r0); ctx.lineTo(ce[0] + Math.cos(a) * r1, ce[1] + Math.sin(a) * r1); }
    if (q > 0.02) decStrokeNow('gold', DEC_W.hair, { al: Math.min(1, q * 3) });
    decPoly(P, true); ctx.fillStyle = c; ctx.fill();
    const g = ctx.createLinearGradient(0, bb.y0, 0, bb.y1); g.addColorStop(0, 'rgba(255,250,225,0.38)'); g.addColorStop(0.42, 'rgba(255,250,225,0)'); g.addColorStop(0.6, 'rgba(70,40,5,0)'); g.addColorStop(1, 'rgba(70,40,5,0.34)');
    ctx.fillStyle = g; ctx.fill(); const gl = decGlint(); if (gl) { ctx.fillStyle = gl; ctx.fill(); }
    decPoly(P, true); decStrokeNow('gold', 2 + 4 * q);
    decPoly(P.map(([x, y]) => [ce[0] + (x - ce[0]) * (R + 12) / R, ce[1] + (y - ce[1]) * (R + 12) / R]), true); decStrokeNow('gold', DEC_W.hair);
  },
  hero(x, y, r, o = {}) { decBird(x, y, r, { key: o.key, mood: o.mood }); },
  heroColor: DEC.amber,
  heroPts(x, y, r) { return decBirdPts(x, y, r); },
  // the print: fine static grain and a vignette over everything
  post() { ctx.save(); screen(); ctx.drawImage(decLens(), 0, 0); ctx.restore(); },
  ones: true,
};
