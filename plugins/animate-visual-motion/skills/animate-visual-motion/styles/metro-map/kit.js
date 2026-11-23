// =====================================================================
//  styles/metro-map/kit.js — a transit (subway) diagram come alive.
//  For narrated explainers about time and sequence: chronologies, roadmaps, stages of a journey, "where we are now".
//  An original, generic transit-diagram look (no real city's map, names, roundel or signage): thick flat-colour lines
//  that run only at 0 / 45 / 90 degrees with generous round bends, white station discs with a dark ring, capsule
//  interchanges, bar termini, tick stops, line bullets, a legend box, a pulsing "you are here" marker, a pale river
//  band, park and zone tints. Flat fills only: no gradients, no shadows, no texture.
//  The hero is a small train capsule with a headlight eye: it is the "now" of the story and rides the line.
//  Motion on 1s, smooth and steady: lines grow at constant speed, stations pop when the head passes, labels slide
//  out from behind them, the train eases out of a stop and into the next, the camera glides with it.
//  Widths and type are in WORLD units (they scale with the camera, like a real map being zoomed).
//  Built on kit/core.js. Needs from the piece head: W, H, FPS, CX (caption centre x).
//  Every reveal takes an absolute start time `t0` (seconds on the piece clock), so a narrated piece can cue it on a word.
// =====================================================================

// ---- palette (6-digit hex: the renderer's mixHex blends these)
const MM = {
  ground: '#f6f4ee', ink: '#1d2330', muted: '#8a8f9a', white: '#ffffff',
  red: '#e23d3d', blue: '#2a6fdb', green: '#1f9d63', yellow: '#f2b414', purple: '#8a55c7', orange: '#f07f2e',   // the lines
  water: '#cfe5f2', waterL: '#e9f3f9', waterD: '#6c9dbb',      // the river band, its drifting dashes, its label
  park: '#dcebd2', parkD: '#6c9a58',                            // park tint and its label
  zone: '#ebe7dc', zoneD: '#a39b86',                            // zone tint and its label
  plan: '#d9d5c9',                                              // a planned (not yet built) line
};
const MM_W = 26;                                                // line width, world units
const MM_SANS = '"Helvetica Neue", Helvetica, "Segoe UI", Inter, Roboto, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
const MM_VIEW = { top: -1e9, bottom: 1e9 };                    // the map window in screen px (mmView): labels outside it are not drawn
const MM_WARNED = new Set();

// ---------------------------------------------------------------------
//  timing
// ---------------------------------------------------------------------
// constant speed with eased ends: u 0..1 -> 0..1 (e = the share of the time spent accelerating, and braking)
function mmGlide(u, e = 0.15) {
  u = clamp(u); if (e <= 0) return u;
  const v = 1 / (1 - e);
  return u < e ? v * u * u / (2 * e) : u > 1 - e ? 1 - v * (1 - u) * (1 - u) / (2 * e) : v * (u - e / 2);
}
function mmGlideInv(s, e = 0.15) {
  s = clamp(s); if (e <= 0) return s;
  const v = 1 / (1 - e), s0 = v * e / 2;
  return s < s0 ? Math.sqrt(2 * e * s / v) : s > 1 - s0 ? 1 - Math.sqrt(2 * e * (1 - s) / v) : s / v + e / 2;
}
const mmIO = (t) => { t = clamp(t); return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); };   // a train's ease: soft out of a stop, soft into the next
const mmPop = (t0, d = 0.25) => (t0 == null ? 1 : TT < t0 ? 0 : EZ.back(clamp((TT - t0) / d)));
const mmIn = (t0, d = 0.25) => (t0 == null ? 1 : TT < t0 ? 0 : EZ.o3(clamp((TT - t0) / d)));
// the map window in screen px: labels and tags are not drawn once they have scrolled fully above `top` (under the
// title strip) or while their station is below `bottom` (the caption band). Call it first in every scene.
function mmView(top, bottom) { MM_VIEW.top = top ?? -1e9; MM_VIEW.bottom = bottom ?? 1e9; }

// ---------------------------------------------------------------------
//  paths: a route is a dense list of points [[x, y], ...] with cached arc lengths
// ---------------------------------------------------------------------
function mmCum(P) {
  if (P._cum) return P._cum;
  const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + dist(P[i - 1], P[i]));
  P._cum = c; return c;
}
const mmLen = (P) => { const c = mmCum(P); return c[c.length - 1]; };
// the point at a fraction of the path: [x, y, tangent angle]
function mmAt(P, frac) {
  const c = mmCum(P), n = P.length, s = clamp(frac) * c[n - 1];
  let lo = 0, hi = n - 2;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (c[m] <= s) lo = m; else hi = m - 1; }
  const a = P[lo], b = P[lo + 1], d = c[lo + 1] - c[lo] || 1, k = clamp((s - c[lo]) / d);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
// the fraction of the path nearest to a point (place a station by its coordinates)
function mmFracAt(P, pt) {
  const c = mmCum(P); let best = 0, bd = 1e18;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const k = clamp(((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / L2), d = Math.hypot(a[0] + dx * k - pt[0], a[1] + dy * k - pt[1]);
    if (d < bd) { bd = d; best = (c[i] + (c[i + 1] - c[i]) * k) / c[c.length - 1]; }
  }
  return best;
}
// the stretch of the path between two fractions
function mmSub(P, f0, f1) {
  const c = mmCum(P), L = c[c.length - 1], s0 = clamp(f0) * L, s1 = clamp(f1) * L, out = [];
  if (s1 <= s0) return out;
  out.push(mmAt(P, f0)); for (let i = 0; i < P.length; i++) if (c[i] > s0 && c[i] < s1) out.push(P[i]); out.push(mmAt(P, f1));
  return out;
}
// waypoints -> a dense rounded octilinear path. Every segment must run at 0 / 45 / 90 degrees: one that does not is
// reported in the console and (unless o.snap === false) turned to the nearest allowed angle, keeping its length.
// Bends are arcs of radius o.r (default 3 line widths; keep it at 2.5 or more), shortened only when a segment is too short.
function mmRoute(pts, o = {}) {
  const r = o.r ?? MM_W * 3, A8 = Math.PI / 4, Q = [[pts[0][0], pts[0][1]]];
  for (let i = 1; i < pts.length; i++) {
    const a = Q[Q.length - 1]; let dx = pts[i][0] - a[0], dy = pts[i][1] - a[1];
    const L = Math.hypot(dx, dy); if (L < 1e-6) continue;
    const ang = Math.atan2(dy, dx), sn = Math.round(ang / A8) * A8;
    if (Math.abs(ang - sn) > 0.006) {
      const msg = `mmRoute: segment ${i} (${a.map(Math.round)} -> ${[pts[i][0], pts[i][1]].map(Math.round)}) runs at ${(ang / DEG).toFixed(1)} deg, not 0/45/90` + (o.snap === false ? '' : `; snapped to ${Math.round(sn / DEG)} deg`);
      if (!MM_WARNED.has(msg)) { MM_WARNED.add(msg); console.warn(msg); }
      if (o.snap !== false) { dx = Math.cos(sn) * L; dy = Math.sin(sn) * L; }
    }
    Q.push([a[0] + dx, a[1] + dy]);
  }
  const out = [Q[0]];
  for (let i = 1; i < Q.length - 1; i++) {
    const a = Q[i - 1], b = Q[i], c = Q[i + 1], l1 = dist(a, b), l2 = dist(b, c);
    const u1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], u2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
    const cr = u1[0] * u2[1] - u1[1] * u2[0], phi = Math.atan2(Math.abs(cr), u1[0] * u2[0] + u1[1] * u2[1]);
    if (phi < 1e-3) continue;                                   // straight on: no bend
    if (phi > Math.PI - 1e-3) { out.push(b); continue; }        // a reversal: keep the corner
    const tn = Math.tan(phi / 2), t = Math.min(r * tn, l1 * 0.5, l2 * 0.5), rr = t / tn, sg = Math.sign(cr);
    const s = [b[0] - u1[0] * t, b[1] - u1[1] * t], cx = s[0] - u1[1] * rr * sg, cy = s[1] + u1[0] * rr * sg;
    const a0 = Math.atan2(s[1] - cy, s[0] - cx), n = Math.max(3, Math.ceil(rr * phi / 5));
    for (let j = 0; j <= n; j++) { const q = a0 + sg * phi * j / n; out.push([cx + Math.cos(q) * rr, cy + Math.sin(q) * rr]); }
  }
  out.push(Q[Q.length - 1]);
  const P = resample(out, false, 10); P.way = Q; P.r = r;
  return P;
}
// a route from relative moves: mmPath([x0, y0], 'S 300', 'SE 200', 'S 400', { r }). Directions N E S W NE SE SW NW;
// the number is the distance for N/E/S/W and the distance PER AXIS for diagonals ('SE 200' = 200 right and 200 down).
const MM_DIR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [1, -1], SE: [1, 1], SW: [-1, 1], NW: [-1, -1] };
function mmPath(start, ...moves) {
  const o = moves.length && typeof moves[moves.length - 1] === 'object' ? moves.pop() : {};
  const pts = [[start[0], start[1]]];
  for (const m of moves) {
    const [d, n] = String(m).trim().split(/\s+/), v = MM_DIR[d.toUpperCase()], k = Number(n), p = pts[pts.length - 1];
    if (!v || !isFinite(k)) { const msg = `mmPath: cannot read move "${m}"`; if (!MM_WARNED.has(msg)) { MM_WARNED.add(msg); console.warn(msg); } continue; }
    pts.push([p[0] + v[0] * k, p[1] + v[1] * k]);
  }
  return mmRoute(pts, o);
}
// a parallel copy of a route, d world units to the traveller's right (negative = left): lines sharing a corridor
// sit side by side at +-(MM_W / 2 + 2).
function mmOffset(P, d) {
  const n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], L = dist(a, b) || 1;
    out.push([P[i][0] - (b[1] - a[1]) / L * d, P[i][1] + (b[0] - a[0]) / L * d]);
  }
  return out;
}

// ---------------------------------------------------------------------
//  drawing basics
// ---------------------------------------------------------------------
function mmPoly(Q, closed) { ctx.beginPath(); if (!Q.length) return; ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); if (closed) ctx.closePath(); }
function mmStroke(Q, color, w, cap = 'round') { if (Q.length < 2) return; ctx.save(); mmPoly(Q); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
function mmDisc(x, y, r, c) { if (r <= 0) return; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
// a rounded box path; rb = radius of the left corners, rf = of the right corners (default the same)
function mmBox(x, y, w, h, rb, rf = rb) {
  rb = Math.max(0, Math.min(rb, w / 2, h / 2)); rf = Math.max(0, Math.min(rf, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + rb, y); ctx.lineTo(x + w - rf, y); ctx.arcTo(x + w, y, x + w, y + rf, rf); ctx.lineTo(x + w, y + h - rf); ctx.arcTo(x + w, y + h, x + w - rf, y + h, rf);
  ctx.lineTo(x + rb, y + h); ctx.arcTo(x, y + h, x, y + h - rb, rb); ctx.lineTo(x, y + rb); ctx.arcTo(x, y, x + rb, y, rb); ctx.closePath();
}
function mmPlate(x, y, w, h, r, fill, ring = 0, ringC = MM.ink) {   // a flat plate, optionally with a dark ring inside its edge
  if (ring > 0) { mmBox(x, y, w, h, r); ctx.fillStyle = ringC; ctx.fill(); mmBox(x + ring, y + ring, w - ring * 2, h - ring * 2, Math.max(0, r - ring)); ctx.fillStyle = fill; ctx.fill(); } else { mmBox(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
}
function mmFont(size, weight = 700, italic = false, track = 0) { ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${MM_SANS}`; if ('letterSpacing' in ctx) ctx.letterSpacing = track + 'px'; }
function mmTextW(str, size, weight = 700, track = 0) { ctx.save(); mmFont(size, weight, false, track); const w = ctx.measureText(str).width; ctx.restore(); return w - track; }
function mmText(str, x, y, size, color, o = {}) {
  ctx.save(); mmFont(size, o.weight ?? 700, o.italic, o.track ?? 0); ctx.fillStyle = color; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic';
  if (o.al != null) ctx.globalAlpha *= clamp(o.al);
  const w = ctx.measureText(str).width - (o.track ?? 0);
  // map text (drawn in a scene, not a deferred caption) that has scrolled fully under the title strip is not drawn
  // nor is map text below the window's bottom (the caption band): it fades out over the last 40px
  if (DEFER && (MM_VIEW.top > -1e8 || MM_VIEW.bottom < 1e8)) {
    const m = ctx.getTransform(), z = Math.abs(m.d || m.a), sy = m.b * x + m.d * y + m.f, low = clamp((MM_VIEW.bottom - (sy - size * 0.75 * z)) / 40);
    if (sy + size * 0.3 * z < MM_VIEW.top || low <= 0) { ctx.restore(); return w; }
    ctx.globalAlpha *= low;
  }
  if (ctx.globalAlpha > 0.004) ctx.fillText(str, x, y);
  ctx.restore(); return w;
}
// does dark or white type sit better on this fill? (yellow takes ink, the rest take white)
function mmOn(c) { const v = [1, 3, 5].map((i) => parseInt(String(c).slice(i, i + 2), 16) / 255); return 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2] > 0.66 ? MM.ink : MM.white; }

// ---------------------------------------------------------------------
//  ground, water, tints
// ---------------------------------------------------------------------
function mmGround(c = MM.ground) { fillAll(c); }
// a river: a pale band along octilinear waypoints with round bends, and slow dashes drifting downstream.
// o: { r, label, at (0..1 along the band), size, speed (px/s), c }
function mmWater(pts, w = 90, o = {}) {
  const P = pts.way ? pts : mmRoute(pts, { r: o.r ?? Math.max(w * 1.3, MM_W * 3) });
  mmStroke(P, o.c ?? MM.water, w, 'butt');
  ctx.save(); ctx.lineWidth = Math.max(4, w * 0.06); ctx.strokeStyle = MM.waterL; ctx.lineCap = 'round'; ctx.setLineDash([w * 0.34, w * 0.62]);
  [-0.24, 0.22].forEach((k, i) => { mmPoly(mmOffset(P, w * k)); ctx.lineDashOffset = -TT * (o.speed ?? 26) * (i ? 0.8 : 1) + i * w * 0.45; ctx.stroke(); });
  ctx.restore();
  if (o.label) {
    const p = mmAt(P, o.at ?? 0.5), size = o.size ?? 28; let a = p[2]; if (Math.cos(a) < -1e-6) a += Math.PI;
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a); mmText(o.label, 0, size * 0.34, size, MM.waterD, { weight: 600, italic: true, align: 'center', track: 1 }); ctx.restore();
  }
  return P;
}
// a tinted area. Zones have 45-degree cut corners (they echo the lines), parks are rounded.
// o: { label, at: 'tl' | 'tr' | 'bl' | 'br', cut, r, size, t0 }
function mmTint(x, y, w, h, c, lc, o = {}) {
  const al = mmIn(o.t0, 0.3); if (al <= 0) return;
  ctx.save(); ctx.globalAlpha *= al;
  if (o.r != null) mmBox(x, y, w, h, o.r);
  else { const k = Math.min(o.cut ?? 46, w / 2, h / 2); mmPoly([[x + k, y], [x + w - k, y], [x + w, y + k], [x + w, y + h - k], [x + w - k, y + h], [x + k, y + h], [x, y + h - k], [x, y + k]], true); }
  ctx.fillStyle = c; ctx.fill();
  if (o.label) {
    const size = o.size ?? 28, at = o.at ?? 'tl', pad = size * 0.9, right = at[1] === 'r';
    mmText(o.label, right ? x + w - pad : x + pad, at[0] === 't' ? y + pad + size * 0.6 : y + h - pad, size, lc, { weight: 700, track: 2, align: right ? 'right' : 'left' });
  }
  ctx.restore();
}
function mmZone(x, y, w, h, o = {}) { mmTint(x, y, w, h, o.c ?? MM.zone, o.lc ?? MM.zoneD, o); }
function mmPark(x, y, w, h, o = {}) { mmTint(x, y, w, h, o.c ?? MM.park, o.lc ?? MM.parkD, { r: 34, ...o }); }

// ---------------------------------------------------------------------
//  lines
//  The options that time a line: { t0, d | speed, from, to, ease }. It grows from fraction `from` (0) to `to` (1) of its
//  path, starting at t0 and taking d seconds (default: length / speed, speed 520 world px/s), at constant speed with
//  eased ends. Pass the SAME options to mmArrive / mmStationsOn so stations pop when the head passes.
// ---------------------------------------------------------------------
function mmLineDur(P, o = {}) { return o.d ?? mmLen(P) * ((o.to ?? 1) - (o.from ?? 0)) / (o.speed ?? 520); }
function mmLineFrac(P, o = {}, t = TT) {   // where the head is at time t, as a fraction of the path
  const f0 = o.from ?? 0, f1 = o.to ?? 1;
  if (o.frac != null) return clamp(o.frac);
  return o.t0 == null ? f1 : lerp(f0, f1, mmGlide((t - o.t0) / Math.max(1e-6, mmLineDur(P, o)), o.ease ?? 0.15));
}
function mmArrive(P, frac, o = {}) {       // when the head reaches a fraction of the path
  if (o.t0 == null) return null;
  const f0 = o.from ?? 0, f1 = o.to ?? 1;
  return o.t0 + mmLineDur(P, o) * mmGlideInv(clamp((frac - f0) / Math.max(1e-6, f1 - f0)), o.ease ?? 0.15);
}
// draw a line growing along its path. o: timing (above) + { w, cap, casing (a ground-colour edge so it reads as
// passing over what it crosses), frac (set the head yourself) }. Returns the head: [x, y, angle].
function mmLine(P, color, o = {}) {
  const w = o.w ?? MM_W, f0 = o.from ?? 0, f = mmLineFrac(P, o), head = mmAt(P, Math.max(f0, f));
  if (o.t0 != null && TT < o.t0 && o.frac == null) return head;
  if (f <= f0) return head;
  const Q = mmSub(P, f0, f);
  if (o.casing) mmStroke(Q, o.casing === true ? MM.ground : o.casing, w + 14, 'butt');
  mmStroke(Q, color, w, o.cap ?? 'round');
  return head;
}

// ---------------------------------------------------------------------
//  labels: a bold name with an optional regular sub-label, horizontal (or at 45 degrees with o.tilt),
//  sliding out from behind the station over 0.25s.
// ---------------------------------------------------------------------
const MM_SIDE = { right: [1, 0], left: [-1, 0], top: [0, -1], bottom: [0, 1], ne: [1, -1], se: [1, 1], nw: [-1, -1], sw: [-1, 1] };
function mmLabel(x, y, gap, o = {}) {
  if (!o.name && !o.sub) return;
  const u = o.t0 == null ? 1 : EZ.o3(clamp((TT - o.t0 - (o.lag ?? 0.05)) / 0.25));
  if (u <= 0) return;
  const size = o.size ?? 42, ss = o.subSize ?? 30, side = o.side ?? 'right', v = MM_SIDE[side] || MM_SIDE.right;
  const sp = toScreen(x, y), z = Math.abs(ctx.getTransform().a) || 1, reach = (size + ss + gap) * z;
  if (sp[1] + reach < MM_VIEW.top + 4 || sp[1] > MM_VIEW.bottom) return;               // outside the map window
  const edge = clamp((MM_VIEW.bottom - sp[1]) / 40);                                    // fades in as it scrolls up into it
  const cap = size * 0.72, lineGap = ss * 1.28, blockH = (o.name ? cap : 0) + (o.sub ? (o.name ? lineGap : ss * 0.72) : 0);
  const col = o.c ?? (o.future ? MM.muted : MM.ink), slide = (1 - u) * 30;
  ctx.save(); ctx.translate(x + (o.dx ?? 0), y + (o.dy ?? 0)); ctx.globalAlpha *= clamp(u * 2.2) * edge;
  let ax = 0, top = 0, align = 'left', ox = 0, oy = 0;
  if (o.tilt && v[0] && v[1]) {             // at 45 degrees: rising to the right for ne / sw, falling for se / nw
    ctx.rotate(v[0] * v[1] > 0 ? Math.PI / 4 : -Math.PI / 4);
    ax = v[0] * gap; top = -blockH / 2; align = v[0] > 0 ? 'left' : 'right'; ox = -v[0] * slide;
    ctx.beginPath(); ctx.rect(v[0] > 0 ? gap - 8 : -4000, -2000, 4000 - gap + 8, 4000); ctx.clip();
  } else if (v[0] && !v[1]) {               // right / left: centred on the station's height
    ax = v[0] * gap; top = -blockH / 2; align = v[0] > 0 ? 'left' : 'right'; ox = -v[0] * slide;
    ctx.beginPath(); ctx.rect(v[0] > 0 ? gap - 8 : -4000, -2000, 4000 - gap + 8, 4000); ctx.clip();
  } else if (!v[0]) {                       // top / bottom: centred on the station
    align = 'center'; top = v[1] < 0 ? -gap - blockH - 4 : gap + 4; oy = -v[1] * slide;
    ctx.beginPath(); ctx.rect(-2000, v[1] > 0 ? gap - 6 : -4000, 4000, 4000 - gap + 6); ctx.clip();
  } else {                                  // a quadrant: horizontal text up-right, down-right, up-left, down-left
    const g = gap * 0.74; ax = v[0] * g; align = v[0] > 0 ? 'left' : 'right'; top = v[1] < 0 ? -g - blockH : g; ox = -v[0] * slide;
    ctx.beginPath(); ctx.rect(v[0] > 0 ? g - 8 : -4000, -2000, 4000 - g + 8, 4000); ctx.clip();
  }
  let by = top + (o.name ? cap : 0);
  if (o.name) mmText(o.name, ax + ox, by + oy, size, col, { weight: 700, align });
  if (o.sub) { by += o.name ? lineGap : ss * 0.72; mmText(o.sub, ax + ox, by + oy, ss, o.subC ?? MM.muted, { weight: 400, align }); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  stations
//  mmStation(x, y, o): o = { t0, name, sub, side, tilt, size, subSize, dx, dy,
//    minor (a tick stop: needs color, ang), terminus (a bar across the line end: needs ang), ang (the line's angle
//    here, radians; default vertical), color (the line's colour), active (the stop the story is at: bigger, a
//    line-colour core), visited (a small ink core), future (muted ring and name), w (line width) }
// ---------------------------------------------------------------------
function mmStation(x, y, o = {}) {
  const w = o.w ?? MM_W, s = mmPop(o.t0), ang = o.ang ?? Math.PI / 2, side = MM_SIDE[o.side ?? 'right'] || MM_SIDE.right;
  const sl = Math.hypot(side[0], side[1]), sv = [side[0] / sl, side[1] / sl], nx = -Math.sin(ang), ny = Math.cos(ang), across = Math.abs(sv[0] * nx + sv[1] * ny);
  const ringC = o.future ? MM.muted : MM.ink;
  let gap = w * 0.77 + 14;
  if (o.terminus) {
    const hb = w * 1.2, th = w * 0.5;
    if (s > 0) mmStroke([[x - nx * hb * s, y - ny * hb * s], [x + nx * hb * s, y + ny * hb * s]], ringC, th, 'round');
    gap = lerp(w * 0.5, hb + th / 2, across) + 14;
  } else if (o.minor) {
    const d = sv[0] * nx + sv[1] * ny >= 0 ? 1 : -1, L = w * 1.15;   // the tick sticks out on the label's side
    if (s > 0) mmStroke([[x, y], [x + nx * d * L * s, y + ny * d * L * s]], o.color ?? ringC, w * 0.46, 'butt');
    gap = lerp(w * 0.5, L, across) + 14;
  } else {
    const R = (o.r ?? w * 0.77) * (o.active ? 1.22 : 1), ring = R * 0.3;
    if (s > 0) {
      mmDisc(x, y, R * s, ringC); mmDisc(x, y, (R - ring) * s, MM.white);
      if (o.active) mmDisc(x, y, (R - ring) * 0.52 * s, o.color ?? MM.red); else if (o.visited) mmDisc(x, y, (R - ring) * 0.42 * s, MM.ink);
    }
    gap = R + 14;
  }
  mmLabel(x, y, gap, o);
  return [x, y];
}
// stations at fractions of a path, each popping when the line's head arrives.
//   names: strings or { name, sub, side, minor, terminus, ... } (per-station options over o)
//   o: shared station options + { line: the SAME timing options given to mmLine, color, lag (pop this much later) }
// Returns [{ x, y, ang, t, frac }].
function mmStationsOn(P, fracs, names = [], o = {}) {
  const { line, lag, ...rest } = o, out = [];
  fracs.forEach((f, i) => {
    const p = mmAt(P, f), per = typeof names[i] === 'string' ? { name: names[i] } : names[i] || {};
    const t = line ? mmArrive(P, f, line) + (lag ?? 0) : rest.t0 ?? null;
    mmStation(p[0], p[1], { ...rest, ang: p[2], ...per, t0: per.t0 ?? t });
    out.push({ x: p[0], y: p[1], ang: p[2], t, frac: f });
  });
  return out;
}
// an interchange: a white capsule with a dark ring spanning the lines it joins (a and b are points on those lines).
// With a t0 it grows from a towards b; o.seed draws a plain station disc at a until then. Label options as mmStation.
function mmInterchange(a, b, o = {}) {
  const w = o.w ?? MM_W, R = o.r ?? w * 0.77, ring = R * 0.3, s = mmPop(o.t0, 0.3);
  const e = [lerp(a[0], b[0], s), lerp(a[1], b[1], s)], show = s > 0 || o.seed;
  if (show) { mmStroke([a, e[0] === a[0] && e[1] === a[1] ? [a[0] + 0.01, a[1]] : e], MM.ink, R * 2, 'round'); mmStroke([a, e[0] === a[0] && e[1] === a[1] ? [a[0] + 0.01, a[1]] : e], MM.white, (R - ring) * 2, 'round'); }
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, side = MM_SIDE[o.side ?? 'right'] || MM_SIDE.right, sl = Math.hypot(side[0], side[1]);
  const half = Math.abs(((b[0] - a[0]) * side[0] + (b[1] - a[1]) * side[1]) / sl) / 2;
  mmLabel(mx, my, half + R + 14, { ...o, t0: o.labelT0 ?? (o.seed ? null : o.t0) });
  return [mx, my];
}

// ---------------------------------------------------------------------
//  bullets, legend, signs, tags, the "you are here" marker
// ---------------------------------------------------------------------
// a line bullet: a filled circle in the line colour holding a letter or number
function mmBullet(x, y, r, color, char, o = {}) {
  const s = o.s ?? 1; if (s <= 0) return;
  mmDisc(x, y, r * s, color);
  if (char != null && char !== '') mmText(String(char), x, y + r * s * 0.4, r * s * 1.12, o.tc ?? mmOn(color), { weight: 800, align: 'center' });
}
// a legend box: (x, y) is its top-left. items = [{ c, ch, label }]. o: { title, t0, size, w, tick (false = still bullets) }
// The bullets pop in one per 8th and then tick in turn, one every half second. Returns { w, h }.
function mmLegend(x, y, items, o = {}) {
  const size = o.size ?? 30, pad = 26, br = size * 0.7, row = br * 2 + 16, th = o.title ? size * 1.5 : 0;
  const w = o.w ?? pad * 2 + br * 2 + 16 + Math.max(...items.map((it) => mmTextW(it.label, size, 500)), o.title ? mmTextW(o.title, size * 0.93, 700, 2) - br * 2 - 16 : 0);
  const h = pad * 2 + th + items.length * row - 16, s = mmPop(o.t0, 0.3);
  if (s <= 0) return { w, h };
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.86 + 0.14 * s, 0.86 + 0.14 * s); ctx.globalAlpha *= clamp(s * 3); ctx.translate(-w / 2, -h / 2);
  mmPlate(0, 0, w, h, 24, MM.white, 5);
  if (o.title) mmText(o.title, pad, pad + size * 0.7, size * 0.93, MM.muted, { weight: 700, track: 2 });
  const tb = o.t0 ?? -1e9, done = tb + 0.3 + items.length * 0.125 + 0.3;
  items.forEach((it, i) => {
    const cy = pad + th + br + i * row, t = tb + 0.125 * (i + 1);
    let bs = mmPop(o.t0 == null ? null : t);
    if (o.tick !== false && TT >= done) { const k = Math.floor(TT / 0.5 + 1e-6), ph = TT - k * 0.5; if (mod(k, items.length) === i) bs *= 1 + 0.16 * Math.exp(-Math.max(0, ph) * 9); }
    mmBullet(pad + br, cy, br, it.c, it.ch, { s: bs });
    const u = mmIn(o.t0 == null ? null : t + 0.05);
    if (u > 0) mmText(it.label, pad + br * 2 + 16 - (1 - u) * 16, cy + size * 0.35, size, MM.ink, { weight: 500, al: u * 1.6 });
  });
  ctx.restore();
  return { w, h };
}
// a platform-sign plate: a line-colour strip and white type on a dark plate. (x, y) is its centre (o.align: 'left'
// puts x on its left edge). o: { t0, size, light (white plate, ink type), bullet (a letter on the strip) }
function mmSign(x, y, text, color = MM.red, o = {}) {
  const size = o.size ?? 34, h = size * 1.9, strip = o.bullet != null ? h : size * 0.56, padX = size * 0.6;
  const w = strip + padX * 2 + mmTextW(text, size, 700, 1), x0 = o.align === 'left' ? x : x - w / 2, y0 = y - h / 2, u = mmIn(o.t0, 0.3);
  if (u <= 0) return { w, h };
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y0 - 2, (w + 4) * u, h + 4); ctx.clip();
  mmBox(x0, y0, w, h, 12); ctx.fillStyle = o.light ? MM.white : MM.ink; ctx.fill();
  ctx.save(); mmBox(x0, y0, w, h, 12); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x0, y0, strip, h); ctx.restore();
  if (o.light) { ctx.save(); mmBox(x0 + 2, y0 + 2, w - 4, h - 4, 10); ctx.lineWidth = 4; ctx.strokeStyle = MM.ink; ctx.stroke(); ctx.restore(); }
  if (o.bullet != null) mmText(String(o.bullet), x0 + strip / 2, y + size * 0.37, size * 1.05, mmOn(color), { weight: 800, align: 'center' });
  mmText(text, x0 + strip + padX, y + size * 0.35, size, o.light ? MM.ink : MM.white, { weight: 700, track: 1, al: seg(u, 0.3, 1) });
  ctx.restore();
  return { w, h };
}
// a year (or date) beside a station: a white pill with a dark ring. (x, y) = the station; o: { side: 'left' | 'right'
// | 'top' | 'bottom', gap, t0, size, c (a line colour fills the pill instead) }
function mmYearTag(x, y, text, o = {}) {
  const size = o.size ?? 28, h = size * 1.7, w = mmTextW(String(text), size, 700, 1) + size * 1.3, gap = o.gap ?? MM_W * 0.77 + 16;
  const v = MM_SIDE[o.side ?? 'left'] || MM_SIDE.left, cx = x + v[0] * (gap + w / 2), cy = y + v[1] * (gap + h / 2), u = mmIn(o.t0, 0.25);
  if (u <= 0) return;
  const sp = toScreen(cx, cy), z = Math.abs(ctx.getTransform().a) || 1;
  if (sp[1] + h * z < MM_VIEW.top + 4 || sp[1] > MM_VIEW.bottom) return;
  ctx.save(); ctx.globalAlpha *= clamp(u * 2) * clamp((MM_VIEW.bottom - sp[1]) / 40); ctx.translate(-v[0] * (1 - u) * 24, -v[1] * (1 - u) * 24);
  if (o.c) mmPlate(cx - w / 2, cy - h / 2, w, h, h / 2, o.c); else mmPlate(cx - w / 2, cy - h / 2, w, h, h / 2, MM.white, 4);
  mmText(String(text), cx, cy + size * 0.35, size, o.c ? mmOn(o.c) : MM.ink, { weight: 700, align: 'center', track: 1 });
  ctx.restore();
}
// a step number beside a station: a line bullet that pops, with an optional small label after it
function mmMilestone(x, y, n, color = MM.red, o = {}) {
  const r = o.r ?? 22, s = mmPop(o.t0);
  mmBullet(x, y, r, color, n, { s });
  if (o.label && s > 0) mmText(o.label, x + r + 12, y + (o.size ?? 28) * 0.35, o.size ?? 28, MM.muted, { weight: 400, al: mmIn(o.t0 == null ? null : o.t0 + 0.1) });
}
// "you are here": a ring that pulses outward once a second, with an optional small dark tag pointing at it.
// o: { t0, color, r, spread (how far the pulse travels, x r; 2.1), label, side: 'left' | 'right' | 'top' | 'bottom', size }
function mmHere(x, y, o = {}) {
  const c = o.color ?? MM.ink, r = o.r ?? 40, s = mmPop(o.t0, 0.3); if (s <= 0) return;
  const tb = o.t0 ?? 0;
  ctx.save(); ctx.strokeStyle = c;
  for (const off of [0, 0.5]) {                                 // two rings, half a second apart, on the beat
    const p = mod(TT - tb - off, 1); if (TT - tb < off) continue;
    ctx.globalAlpha = (1 - p) * 0.7; ctx.lineWidth = lerp(7, 2, p); ctx.beginPath(); ctx.arc(x, y, r * lerp(1, o.spread ?? 2.1, EZ.o2(p)), 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, r * s, 0, TAU); ctx.stroke();
  ctx.restore();
  if (o.label) {
    const size = o.size ?? 28, tw = mmTextW(o.label, size, 700, 1), w = tw + size * 1.2, h = size * 1.75, v = MM_SIDE[o.side ?? 'left'] || MM_SIDE.left, g = r + 22;
    const cx = x + v[0] * (g + w / 2), cy = y + v[1] * (g + h / 2), u = mmPop(o.t0 == null ? null : o.t0 + 0.125);
    if (u > 0) {
      ctx.save(); ctx.translate(x + v[0] * g, y + v[1] * g); ctx.scale(u, u); ctx.translate(-(x + v[0] * g), -(y + v[1] * g));
      ctx.fillStyle = MM.ink; ctx.beginPath(); ctx.moveTo(x + v[0] * (g - 12), y + v[1] * (g - 12)); ctx.lineTo(x + v[0] * (g + 4) - v[1] * 12, y + v[1] * (g + 4) + v[0] * 12); ctx.lineTo(x + v[0] * (g + 4) + v[1] * 12, y + v[1] * (g + 4) - v[0] * 12); ctx.closePath(); ctx.fill();
      mmPlate(cx - w / 2, cy - h / 2, w, h, 12, MM.ink);
      mmText(o.label, cx, cy + size * 0.35, size, MM.white, { weight: 700, align: 'center', track: 1 });
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------
//  the hero: a small train capsule. Line-colour body on a white casing, three windows, a headlight "eye" that
//  looks ahead and blinks. It points along its path and squashes a little when it stops.
// ---------------------------------------------------------------------
// mmHero(x, y, r, o): r = half the train's length. o: { ang, color, squash (0..1), key, bg (a background train: does
// not set SPARK_AT), s (scale) }
function mmHero(x, y, r, o = {}) {
  const key = o.key ?? 'train', c = o.color ?? MM.red, hw = r * 0.4, sq = clamp(o.squash ?? 0), s = o.s ?? 1;
  if (s <= 0) return;
  if (!o.bg) SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.ang ?? Math.PI / 2); ctx.scale(s * (1 - 0.1 * sq), s * (1 + 0.14 * sq));
  const cs = r * 0.1;
  mmBox(-r - cs, -hw - cs, r * 2 + cs * 2, hw * 2 + cs * 2, (hw + cs) * 0.62, hw + cs); ctx.fillStyle = MM.white; ctx.fill();
  mmBox(-r, -hw, r * 2, hw * 2, hw * 0.55, hw); ctx.fillStyle = c; ctx.fill();
  ctx.fillStyle = MM.white;
  for (let i = 0; i < 3; i++) { mmBox(-r * 0.78 + i * r * 0.39, -hw * 0.5, r * 0.28, hw, r * 0.07); ctx.fill(); }
  const ex = r * 0.63, er = hw * 0.56, blink = mod(F + hash('mmblink', key) % 80, 80) < 3;
  mmDisc(ex, 0, er, MM.white);
  ctx.fillStyle = MM.ink; ctx.beginPath(); ctx.ellipse(ex + er * 0.3, 0, blink ? er * 0.12 : er * 0.5, er * 0.5, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
// the train at a fraction of a path, pointing along it (its chord follows the bends). o: as mmHero + { len }.
// At the two ends of the path it stops with its nose (or tail) on the end, so a terminus stays visible.
function mmTrain(P, frac, o = {}) {
  const len = o.len ?? 140, L = mmLen(P), df = Math.min(0.5, len * 0.5 / L), f = clamp(frac, df, 1 - df);
  const a = mmAt(P, f + df), b = mmAt(P, f - df);
  mmHero((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len / 2, { ...o, ang: Math.atan2(a[1] - b[1], a[0] - b[0]) });
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
// the train's timetable: stops = [[tArrive, frac, travel?], ...] sorted by time. It waits at each stop, leaves
// `travel` seconds before the next arrival (default o.travel ?? 0.75, never before it arrived), easing out and in.
// Returns { frac, squash (a short bump on arrival), at (the stop it is at or left last), moving }.
function mmRide(stops, o = {}) {
  let frac = stops[0][1], squash = 0, at = 0, moving = false;
  for (let i = 1; i < stops.length; i++) {
    const [t1, f1] = stops[i], f0 = stops[i - 1][1], t0 = Math.max(stops[i - 1][0], t1 - (stops[i][2] ?? o.travel ?? 0.75));
    if (TT >= t1) { frac = f1; at = i; const k = (TT - t1) / 0.3; squash = k < 1 ? Math.sin(Math.PI * k) * (1 - k) * 1.6 : 0; }
    else { if (TT > t0) { frac = lerp(f0, f1, mmIO((TT - t0) / (t1 - t0))); moving = true; } break; }
  }
  return { frac, squash: clamp(squash), at, moving };
}
// a camera that follows the train with look-ahead, for pieceCam: the point a little ahead of `frac` sits on screen
// point o.to (default [CX, H * 0.47]) at `zoom`. o: { ahead (world px, 90), lead (0..1, 0.6), xk / yk (how much of the
// sideways / vertical travel the camera follows, 0..1; 9:16 routes run down, so damp x; 16:9 routes run across, so
// damp y), x0 / y0 (the resting position the damping pulls to; default the path's middle), to }
function mmFollow(P, frac, zoom = 1.15, o = {}) {
  const L = mmLen(P), a = mmAt(P, frac), b = mmAt(P, clamp(frac + (o.ahead ?? 90) / L)), k = o.lead ?? 0.6;
  let px = lerp(a[0], b[0], k), py = lerp(a[1], b[1], k);
  if (o.xk != null || o.yk != null) {
    const bb = P._bb || (P._bb = P.reduce((m, p) => [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])], [1e9, 1e9, -1e9, -1e9]));
    if (o.xk != null) px = lerp(o.x0 ?? (bb[0] + bb[2]) / 2, px, o.xk);
    if (o.yk != null) py = lerp(o.y0 ?? (bb[1] + bb[3]) / 2, py, o.yk);
  }
  return camOf({ z: zoom, p: [px, py], to: o.to ?? [CX, H * 0.47] });
}
// bridge shapes (world coords): a station disc, an interchange capsule / rounded square
const mmDiscPts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);
const mmCapsulePts = (x, y, w, h, r = Math.min(w, h) / 2) => rrectPts(x - w / 2, y - h / 2, w, h, r, 14);

// ---------------------------------------------------------------------
//  captions: screen-size, drawn after the camera (DEFER). Both stay out of the way of a shape morph: they fade out
//  as the era's window starts to shrink and enter only when the new era's window has opened.
// ---------------------------------------------------------------------
function mmLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d - 1e-6) return TT < r.tc ? 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.25)) : 0; }
  return 1;
}
function mmEraIn() {
  if (typeof BRIDGES === 'undefined') return -1e9;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) return r.tc + (r.d ?? 0.6);
  return -1e9;
}
// the title: a header strip in the ground colour with a dark rule (the map scrolls under it), a kicker with an
// optional line bullet, and a bold headline. o: { at (seconds after the era starts), bullet: [colour, char],
// band (false = no strip), bandY (the rule's y, default 428: give the same to mmView), x, y (the kicker's baseline) }
function mmTitleNow(kicker, headline, o = {}) {
  const al = mmLeaving(); if (al <= 0.001) return;
  const t0 = Math.max(E0 + (o.at ?? 0.1), mmEraIn()), x = o.x ?? 60, y = o.y ?? 306, bandY = o.bandY ?? 428;
  ctx.save(); ctx.globalAlpha = al;
  if (o.band !== false) { ctx.fillStyle = MM.ground; ctx.fillRect(0, 0, W, bandY); ctx.fillStyle = MM.ink; ctx.fillRect(0, bandY - 5, W, 5); }
  if (TT > t0) {
    let kx = x;
    if (o.bullet) { mmBullet(x + 22, y - 11, 22, o.bullet[0], o.bullet[1], { s: mmPop(t0) }); kx += 58; }
    const u = mmIn(t0, 0.3);
    if (kicker) mmText(kicker, kx - (1 - u) * 20, y, 30, MM.muted, { weight: 700, track: 2, al: u * 1.5 });
    const hs = o.size ?? 66, hy = y + 24 + hs * 0.78, v = mmIn(t0 + 0.1, 0.35);
    if (v > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0, hy - hs * 1.0, W, hs * 1.3); ctx.clip(); mmText(headline, x, hy + (1 - v) * hs * 1.1, hs, MM.ink, { weight: 800 }); ctx.restore(); }
  }
  ctx.restore();
}
// the caption: 'text with a *keyword*' on a white rounded plate with a dark ring, the keyword in a line colour.
// The plate opens from a disc (a station turning into an interchange), then the words fade up.
// o: { at, y (the last line's baseline, default 1440), size (56), c (the keyword's colour: not yellow), x, maxW }
function mmCaptionNow(str, o = {}) {
  const al = mmLeaving(); if (al <= 0.001) return;
  const size = o.size ?? 56, t0 = Math.max(E0 + (o.at ?? 0.5), mmEraIn()); if (TT <= t0) return;
  const lines = String(str).split('\n'), lh = size * 1.2, y = o.y ?? 1440, x = o.x ?? CX, kc = o.c ?? MM.red;
  const rows = lines.map((line) => { const parts = line.split(/(\*[^*]+\*)/).filter((g) => g.length).map((g) => (g[0] === '*' ? { s: g.slice(1, -1), k: 1 } : { s: g, k: 0 })); parts.forEach((p) => { p.w = mmTextW(p.s, size, 700); }); return { parts, w: parts.reduce((a, p) => a + p.w, 0) }; });
  const tw = Math.max(...rows.map((r) => r.w)), fit = Math.min(1, (o.maxW ?? W - 220) / tw), padX = size * 0.72;
  const h = (lines.length - 1) * lh + size * 1.82, w = tw * fit + padX * 2, top = y - (lines.length - 1) * lh - size * 1.16;
  const u = mmIn(t0, 0.3), cw = lerp(h, w, u);
  ctx.save(); ctx.globalAlpha = al * clamp(u * 4);
  mmPlate(x - cw / 2, top, cw, h, h / 2 > 60 ? 40 : h / 2, MM.white, 5);
  mmBox(x - cw / 2 + 5, top + 5, cw - 10, h - 10, 36); ctx.clip();
  ctx.globalAlpha = al * seg(u, 0.45, 1);
  rows.forEach((r, li) => {
    let xx = x - r.w * fit / 2; const yy = y - (lines.length - 1 - li) * lh;
    for (const p of r.parts) { ctx.save(); ctx.translate(xx, yy); ctx.scale(fit, 1); mmText(p.s, 0, 0, size, p.k ? kc : MM.ink, { weight: 700 }); ctx.restore(); xx += p.w * fit; }
  });
  ctx.restore();
}
const mmTitle = (kicker, headline, o) => { const f = () => mmTitleNow(kicker, headline, o); if (DEFER) DEFER.push(f); else f(); };
const mmCaption = (str, o) => { const f = () => mmCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks. A morph happens on the bare map ground; the bridge shape is a giant station:
//  a flat white disc inside a white band and a dark ring, and an era is seen through the same double ring.
// =====================================================================
const MM_RING = { band: 12, ring: 9 };   // screen px
function mmRinged(P) {                   // the station edge around outline P: dark ring outside, white band inside it
  ctx.save(); ctx.lineJoin = 'round';
  mmPoly(P, true); ctx.lineWidth = (MM_RING.band + MM_RING.ring) * 2; ctx.strokeStyle = MM.ink; ctx.stroke();
  mmPoly(P, true); ctx.lineWidth = MM_RING.band * 2; ctx.strokeStyle = MM.white; ctx.stroke();
  ctx.restore();
}
const STYLE = {
  name: 'metro-map',
  paper: MM.ground,
  backdrop() { fillAll(MM.ground); },   // flat, always: no mid-tone blends on a printed diagram
  // the era seen through outline P: a hard mask inside the station double ring. Shrinking, a flat white veil closes
  // over the last third so the window lands on the white bridge disc; growing, the hole opens from the centre.
  window(P, key, src, o = {}) {
    const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    const hole = o.phase === 'grow' ? EZ.o3((o.u ?? 1) / 0.4) : 1, veil = o.phase === 'shrink' ? EZ.io(seg(o.u ?? 0, 0.72, 1)) : 0;
    mmRinged(P);
    ctx.save(); mmPoly(P, true); ctx.fillStyle = MM.white; ctx.fill(); ctx.restore();
    if (hole > 0) { ctx.save(); mmPoly(hole < 1 ? P.map(([x, y]) => [c[0] + (x - c[0]) * hole, c[1] + (y - c[1]) * hole]) : P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore(); }
    if (veil > 0) { ctx.save(); ctx.globalAlpha = veil; mmPoly(P, true); ctx.fillStyle = MM.white; ctx.fill(); ctx.restore(); }
  },
  blob(P, c) { mmRinged(P); ctx.save(); mmPoly(P, true); ctx.fillStyle = c; ctx.fill(); ctx.restore(); },
  hero(x, y, r, o = {}) { mmHero(x, y, r * 0.9, { key: o.key, ang: 0 }); },
  heroColor: MM.red,
  heroPts(x, y, r) { return mmCapsulePts(x, y, r * 1.8, r * 0.67); },
  post() {},
  ones: true,
};
