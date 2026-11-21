// =====================================================================
//  styles/islamic-geometric/kit.js — Islamic geometric ornament: compass-and-ruler star patterns
//  (8-fold Hankin strapwork on the 4.8.8 grid, over-under woven), arches, domes, minarets, lanterns,
//  crescents; flat zellige fills with a glaze sheen, crisp gold strapwork; motion on 1s, smooth eases.
//  Built on kit/core.js. Every helper is prefixed `ig` / `IG` (styles/README.md -> Names a kit must not reuse).
//  Respect rules: no figures or faces anywhere; the hero is a non-figurative glowing star; captions use a
//  clean Latin font — never fake Arabic script.
//  Needs from the piece head: CX (caption centre x).
// =====================================================================
const IG = {
  night: '#0c1f36', nightL: '#1a3c63', lapis: '#1d3f75', lapisD: '#132b52',
  teal: '#0f4f57', tealD: '#09343b', turq: '#2a9d97', turqL: '#7fd0c4',
  gold: '#d6a743', goldL: '#f3d68c', goldD: '#8f6a22', brass: '#b8862f',
  terra: '#b5533a', terraL: '#d98767', cream: '#f3e6c8', ivory: '#fbf5e6', sand: '#e9d6ad',
  ink: '#0a1a24', paper: '#103a46',
};
const IG_SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", "DejaVu Serif", "Times New Roman", serif';
const IG_SANS = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';

// ---- lines: constant on screen when asked (divide by the camera's zoom)
const igZoom = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
const igHair = (px) => px / igZoom();
function igPoly(P, closed = true) {   // straight polyline (core's trace() rounds corners — stars need sharp tips)
  ctx.beginPath(); if (!P.length) return;
  ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  if (closed) ctx.closePath();
}
function igStroke(color, w, o = {}) {
  ctx.strokeStyle = color; ctx.lineWidth = o.hair ? igHair(w) : w; ctx.lineJoin = o.join ?? 'miter'; ctx.miterLimit = 3; ctx.lineCap = o.cap ?? 'round';
  ctx.globalAlpha = o.al ?? 1; ctx.stroke(); ctx.globalAlpha = 1;
}
const igCentroid = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
const igInset = (P, px) => {   // shrink an outline toward its centroid by about px (good enough for convex-ish shapes)
  const c = igCentroid(P), rm = P.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / P.length || 1;
  const k = Math.max(0, 1 - px / rm); return P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
};
// a true parallel offset of a closed outline by d px (d > 0 = outward), mitred at the corners. For rims and
// rings that must keep a constant width (igInset only scales toward the centroid).
function igOffset(P, d) {
  const Q = P.filter((p, i) => { const q = P[(i + P.length - 1) % P.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6; }), n = Q.length;
  if (n < 3) return P.slice();
  let A = 0; for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const sg = A > 0 ? 1 : -1, nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return [sg * dy / L, -sg * dx / L]; };
  return Q.map((p, i) => {
    const n1 = nrm(Q[(i + n - 1) % n], p), n2 = nrm(p, Q[(i + 1) % n]);
    let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = d / Math.max(0.35, mx * n1[0] + my * n1[1]);
    return [p[0] + mx * k, p[1] + my * k];
  });
}
function igBez(p0, p1, p2, p3, n = 16) {
  const P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; P.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
  return P;
}
const igMix = (a, b, u) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], u)).toString(16).padStart(2, '0')).join(''); };
const igRGBA = (h, a) => `rgba(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`;

// ---------------------------------------------------------------------
//  stars: exact {n/k} star polygons (khatam = {8/2}, two squares; 10 = {10/3}; 12 = {12/4}, four triangles)
// ---------------------------------------------------------------------
const igStarK = (n) => (n >= 10 ? Math.round(n / 3) : n >= 5 ? 2 : 1);
const igStarRi = (n) => (n < 5 ? 0.5 : Math.cos(igStarK(n) * Math.PI / n) / Math.cos(Math.PI / n));
function igStarPts(x, y, r, n = 8, o = {}) {
  const ri = r * (o.ri ?? igStarRi(n)), rot = o.rot ?? -Math.PI / 2, P = [];
  for (let i = 0; i < 2 * n; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? ri : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return P;
}
// radius of a closed polygon around (0,0) along angle a (ray cast) — for blending stars by angle
function igPolar(P, a) {
  const dx = Math.cos(a), dy = Math.sin(a); let best = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], ex = q[0] - p[0], ey = q[1] - p[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (p[0] * ey - p[1] * ex) / den, s = (p[0] * dy - p[1] * dx) / den;
    if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9 && t > best) best = t;
  }
  return best;
}
const IG_RAD = new Map();
function igStarRad(n, m = 96) {   // unit star radii at m angles from -90deg (cached: static geometry)
  const k = n + '|' + m; if (IG_RAD.has(k)) return IG_RAD.get(k);
  const P = igStarPts(0, 0, 1, n), R = [];
  for (let i = 0; i < m; i++) R.push(igPolar(P, -Math.PI / 2 + i / m * TAU));
  IG_RAD.set(k, R); return R;
}
// a star with n0 points blending into n1 points (u 0..1), sampled by angle: the hero "gains points"
function igStarBlend(x, y, r, n0, n1, u, rot = 0, m = 192) {
  const A = igStarRad(n0, m), Bv = igStarRad(n1, m), P = [];
  for (let i = 0; i < m; i++) { const a = -Math.PI / 2 + i / m * TAU + rot, rr = r * lerp(A[i], Bv[i], u); P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return P;
}

// ---------------------------------------------------------------------
//  the pattern generator: 8-fold strapwork by Hankin's polygons-in-contact method on the 4.8.8 tiling
//  (octagons on a square grid of period s, squares between). Each tile edge's midpoint sends two rays
//  in at the contact angle theta; adjacent rays meet at X. Octagons give 8-point stars, squares 4-point
//  crosses; lines run straight through every midpoint, so strands cross there and are woven over-under
//  (the ray turning toward the tile's next vertex is "over" at its midpoint, which alternates along every strand).
// ---------------------------------------------------------------------
const IG_PAT = new Map();
function igPatternGeo(s, ox, oy, x0, y0, x1, y1, theta) {
  const key = [s, ox, oy, x0, y0, x1, y1, theta].map((v) => Math.round(v * 10) / 10).join('|');
  if (IG_PAT.has(key)) return IG_PAT.get(key);
  const a = s / (1 + Math.SQRT2), R = a / (2 * Math.sin(Math.PI / 8)), h = a / Math.SQRT2;
  const segs = [], stars = [], circles = [], ct = Math.cos(theta), st = Math.sin(theta);
  const hankin = (V, c, kind) => {
    const n = V.length, M = [], E = [], N = [];
    for (let i = 0; i < n; i++) {
      const p = V[i], q = V[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], L = dist(p, q);
      const e = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], nl = Math.hypot(c[0] - m[0], c[1] - m[1]);
      M.push(m); E.push(e); N.push([(c[0] - m[0]) / nl, (c[1] - m[1]) / nl]);
    }
    const star = [], sg = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, m1 = M[i], m2 = M[j];
      const d1 = [ct * E[i][0] + st * N[i][0], ct * E[i][1] + st * N[i][1]];
      const d2 = [-ct * E[j][0] + st * N[j][0], -ct * E[j][1] + st * N[j][1]];
      const den = d1[0] * d2[1] - d1[1] * d2[0];
      const t = ((m2[0] - m1[0]) * d2[1] - (m2[1] - m1[1]) * d2[0]) / den;
      const X = [m1[0] + d1[0] * t, m1[1] + d1[1] * t];
      const dd = (p) => Math.hypot(p[0] - ox, p[1] - oy);
      const ga = { m: m1, x: X, over: true, d: dd(m1) }, gb = { m: m2, x: X, over: false, d: dd(m2) };
      segs.push(ga, gb); sg.push(ga, gb);
      star.push(m1, X);
    }
    stars.push({ P: star, kind, c, segs: sg, d: Math.hypot(c[0] - ox, c[1] - oy) });
  };
  const i0 = Math.floor((x0 - ox) / s) - 1, i1 = Math.ceil((x1 - ox) / s) + 1, j0 = Math.floor((y0 - oy) / s) - 1, j1 = Math.ceil((y1 - oy) / s) + 1;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const cx = ox + i * s, cy = oy + j * s;
    const V = []; for (let k = 0; k < 8; k++) { const an = (22.5 + 45 * k) * DEG; V.push([cx + Math.cos(an) * R, cy + Math.sin(an) * R]); }
    hankin(V, [cx, cy], 'oct');
    circles.push({ x: cx, y: cy, r: s / 2, d: Math.hypot(cx - ox, cy - oy) });
    const qx = cx + s / 2, qy = cy + s / 2;
    hankin([[qx + h, qy], [qx, qy + h], [qx - h, qy], [qx, qy - h]], [qx, qy], 'sq');
  }
  let dmax = 1;
  const inBox = (p) => p[0] > x0 - s && p[0] < x1 + s && p[1] > y0 - s && p[1] < y1 + s;
  for (const g of segs) if (inBox(g.m)) dmax = Math.max(dmax, g.d);
  const geo = { segs: segs.filter((g) => inBox(g.m)), stars: stars.filter((g) => inBox(g.P[0])), circles: circles.filter((c) => inBox([c.x, c.y])), dmax, s };
  if (IG_PAT.size > 60) IG_PAT.clear();
  IG_PAT.set(key, geo); return geo;
}
// tile the pattern into outline P (world coords). o: s (period), ox, oy (construction centre), theta (deg, 67.5),
//   prog 0..1 (compass circles sweep on, then strapwork grows out of the midpoints, then the tiles glaze in, rippling
//   out from (ox, oy)), ground / oct / sq (fills, null = none), strap, key (keyline), bw (band width), weave,
//   lines: 'c' (lines only, one colour, width w), sheen (true: a moving glaze highlight), al (overall alpha),
//   inner / innerSq (a small star set in each 8-star / a dot in each cross), ghost: 'c' (the whole layout as a faint
//   hairline underdrawing while prog < 1, so a panel is never empty before it constructs; ghostAl its alpha)
// Every strand is the outline of a star tile, so a finished tile is stroked as one closed mitred polygon: bends
// and tips stay sharp and lines meet exactly. Only tiles still growing are drawn as separate segments.
function igPattern(P, o = {}) {
  const s = o.s ?? 150, bb = bbox(P), ox = o.ox ?? (bb.x0 + bb.x1) / 2, oy = o.oy ?? (bb.y0 + bb.y1) / 2;
  const geo = igPatternGeo(s, ox, oy, bb.x0, bb.y0, bb.x1, bb.y1, (o.theta ?? 67.5) * DEG);
  const prog = clamp(o.prog ?? 1), sp = o.spread ?? 0.55, dmax = o.dmax ?? geo.dmax;
  const loc = (d) => (prog >= 1 ? 1 : clamp((prog - sp * Math.min(1, d / dmax)) / (1 - sp)));
  ctx.save(); igPoly(P); ctx.clip(); ctx.globalAlpha = o.al ?? 1; const A0 = ctx.globalAlpha;
  if (o.ground) { ctx.fillStyle = o.ground; ctx.fillRect(bb.x0 - 2, bb.y0 - 2, bb.x1 - bb.x0 + 4, bb.y1 - bb.y0 + 4); }
  // compass construction: circles sweep on, then fade once the strapwork is down
  if (o.circles !== false && prog < 1) {
    ctx.strokeStyle = o.cc ?? IG.goldL; ctx.lineWidth = igHair(1.3);
    for (const c of geo.circles) {
      const u = loc(c.d), sw = clamp(u / 0.3), fade = 1 - clamp((u - 0.45) / 0.35);
      if (sw <= 0 || fade <= 0) continue;
      ctx.globalAlpha = A0 * 0.55 * fade; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, -Math.PI / 2, -Math.PI / 2 + TAU * sw); ctx.stroke();
      if (sw > 0.5) { ctx.beginPath(); for (let k = 0; k < 4; k++) { const an = k * Math.PI / 4; ctx.moveTo(c.x - Math.cos(an) * c.r, c.y - Math.sin(an) * c.r); ctx.lineTo(c.x + Math.cos(an) * c.r, c.y + Math.sin(an) * c.r); } ctx.globalAlpha = A0 * 0.3 * fade * clamp((sw - 0.5) * 2); ctx.stroke(); }
    }
    ctx.globalAlpha = A0;
  }
  // zellige fills: the stars glaze in after their lines
  if (!o.lines && (o.oct || o.sq)) {
    for (const g of geo.stars) {
      const c = g.kind === 'oct' ? o.oct : o.sq; if (!c) continue;
      const f = EZ.o2(clamp((loc(g.d) - 0.5) / 0.45)); if (f <= 0) continue;
      ctx.globalAlpha = A0 * f; igPoly(g.P); ctx.fillStyle = c; ctx.fill();
      if (o.inner && g.kind === 'oct') { igPoly(igStarPts(g.c[0], g.c[1], s * 0.11 * f, 8)); ctx.fillStyle = o.inner; ctx.fill(); }
      if (o.innerSq && g.kind === 'sq') { ctx.beginPath(); ctx.arc(g.c[0], g.c[1], s * 0.035 * f, 0, TAU); ctx.fillStyle = o.innerSq; ctx.fill(); }
    }
    ctx.globalAlpha = A0;
  }
  if (o.sheen && prog > 0.6) {   // a glaze highlight drifting diagonally across the tiles
    const ph = mod(TT * (o.sheenSpeed ?? 0.22) + (o.sheenPh ?? 0), 1.4) - 0.2, L = (bb.x1 - bb.x0) + (bb.y1 - bb.y0);
    const gx = bb.x0 + ph * L, g = ctx.createLinearGradient(gx - 160, bb.y0, gx + 160, bb.y0 + 160);
    g.addColorStop(0, 'rgba(255,250,235,0)'); g.addColorStop(0.5, `rgba(255,250,235,${0.16 * clamp((prog - 0.6) / 0.4)})`); g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  }
  // strapwork: grows from each midpoint toward its bend; a finished tile is one closed mitred outline
  const lfOf = (g) => (prog >= 1 ? 1 : clamp((loc(g.d) - 0.12) / 0.5));
  const segPath = (pieceLen) => {
    ctx.beginPath();
    if (pieceLen != null) {   // the short "over" pieces across each crossing
      for (const g of geo.segs) {
        if (!g.over) continue;
        const lf = lfOf(g); if (lf <= 0) continue;
        const L = dist(g.m, g.x), k = Math.min(pieceLen, L * lf) / (L || 1);
        ctx.moveTo(g.m[0], g.m[1]); ctx.lineTo(g.m[0] + (g.x[0] - g.m[0]) * k, g.m[1] + (g.x[1] - g.m[1]) * k);
      }
      return;
    }
    for (const st of geo.stars) {
      let full = true;
      if (prog < 1) for (const g of st.segs) if (lfOf(g) < 1) { full = false; break; }
      if (full) { const Q = st.P; ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.closePath(); continue; }
      for (const g of st.segs) {
        const lf = lfOf(g); if (lf <= 0) continue;
        ctx.moveTo(g.m[0], g.m[1]); ctx.lineTo(g.m[0] + (g.x[0] - g.m[0]) * lf, g.m[1] + (g.x[1] - g.m[1]) * lf);
      }
    }
  };
  if (o.ghost && prog < 1) {   // the layout as a faint underdrawing
    ctx.beginPath(); for (const st of geo.stars) { const Q = st.P; ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.closePath(); }
    igStroke(o.ghost, 1.3, { hair: true, al: A0 * (o.ghostAl ?? 0.3) * (1 - 0.6 * prog) });
  }
  if (o.lines) { segPath(); igStroke(o.lines, o.w ?? 2, { hair: o.hair, al: A0 }); ctx.restore(); return geo; }
  const bw = o.bw ?? s * 0.045, kw = o.kw ?? Math.max(igHair(1.6), bw * 0.32);
  segPath(); igStroke(o.key ?? IG.ink, bw + 2 * kw, { al: A0 });
  segPath(); igStroke(o.strap ?? IG.gold, bw, { al: A0 });
  if (o.weave !== false) {   // over-under: re-lay the "over" strand across each crossing, keylined
    const pl = bw * 2.6;
    segPath(pl); igStroke(o.key ?? IG.ink, bw + 2 * kw, { al: A0, cap: 'butt' });
    segPath(pl); igStroke(o.strap ?? IG.gold, bw, { al: A0, cap: 'butt' });
  }
  if (o.mid) { segPath(); igStroke(o.mid, Math.max(igHair(1), bw * 0.22), { al: A0 * 0.85 }); }
  ctx.restore();
  return geo;
}

// ---------------------------------------------------------------------
//  architecture: outlines (points, for fills, clips and bridge shapes) and drawn props
// ---------------------------------------------------------------------
// pointed (two-centred) arch, optionally horseshoe; base at yb, springing at ys = yb - (h - rise)
function igArchPts(cx, yb, w, h, o = {}) {
  const hw = w / 2, e = hw * (o.point ?? 0.35), R = hw + e, beta = o.horse ?? 0;
  const rise = Math.sqrt(R * R - e * e), ys = yb - (h - rise), n = o.n ?? 22, P = [];
  const aTop = -Math.acos(e / R);
  const right = [], jx = cx - e + R * Math.cos(beta), jy = ys + R * Math.sin(beta);
  right.push([jx, yb]); right.push([jx, jy]);
  for (let i = 0; i <= n; i++) { const an = lerp(beta, aTop, i / n); right.push([cx - e + R * Math.cos(an), ys + R * Math.sin(an)]); }
  P.push(...right);
  for (let i = right.length - 2; i >= 0; i--) P.push([2 * cx - right[i][0], right[i][1]]);
  return P;
}
// pointed onion dome on a flat base at yb (w wide, h tall)
function igDomePts(cx, yb, w, h, o = {}) {
  const b = o.bulge ?? 1.16, R = igBez([cx + w / 2, yb], [cx + w / 2 * b, yb - h * 0.5], [cx + w * (o.neck ?? 0.05), yb - h * 0.7], [cx, yb - h], o.n ?? 20);
  const L = R.slice(0, -1).reverse().map(([x, y]) => [2 * cx - x, y]);
  return [...R, ...L];
}
// crescent: outer circle minus an offset inner circle; opens toward angle rot
function igCrescentPts(x, y, r, o = {}) {
  const d = r * (o.k ?? 0.42), r2 = r * (o.r2 ?? 0.86), rot = o.rot ?? -Math.PI / 4, n = o.n ?? 26;
  const xi = (d * d + r * r - r2 * r2) / (2 * d), yi = Math.sqrt(Math.max(0, r * r - xi * xi));
  const al = Math.atan2(yi, xi), P = [];
  for (let i = 0; i <= n; i++) { const an = lerp(al, TAU - al, i / n); P.push([Math.cos(an) * r, Math.sin(an) * r]); }
  const b1 = Math.atan2(-yi, xi - d), b0 = Math.atan2(yi, xi - d) - TAU;
  for (let i = 1; i < n; i++) { const an = lerp(b1, b0, i / n); P.push([d + Math.cos(an) * r2, Math.sin(an) * r2]); }
  return xform(P, x, y, rot);
}
// filled shape with a fine keyline, optional gold rim
function igShape(P, fill, o = {}) {
  igPoly(P); if (fill) { ctx.fillStyle = fill; ctx.globalAlpha = o.al ?? 1; ctx.fill(); ctx.globalAlpha = 1; }
  if (o.rim) { igPoly(P); igStroke(o.rim, o.rw ?? 3, { join: 'round', hair: o.hair }); }
}
function igCrescent(x, y, r, c = IG.gold, o = {}) { igShape(igCrescentPts(x, y, r, o), c, { rim: o.rim, rw: o.rw ?? 1.5, hair: true }); }
// a finial: a rod, two beads and a crescent on top
function igFinial(x, yb, h, c = IG.gold) {
  ctx.fillStyle = c; ctx.fillRect(x - h * 0.03, yb - h * 0.72, h * 0.06, h * 0.72);
  for (const [f, rr] of [[0.25, 0.07], [0.48, 0.055]]) { ctx.beginPath(); ctx.arc(x, yb - h * f, h * rr, 0, TAU); ctx.fill(); }
  igCrescent(x, yb - h * 0.86, h * 0.17, c, { rot: -Math.PI / 2 });
}
// minaret: shaft, two corbelled balconies, a pavilion, a pointed cap and a finial. o: c (body), trim, win (window colour),
//   cap (cap colour), line (a fine keyline colour: use it when the body sits on a ground of nearly the same value)
function igMinaret(x, yb, w, h, o = {}) {
  const c = o.c ?? IG.cream, trim = 'trim' in o ? o.trim : IG.gold, win = o.win, line = o.line;
  const box = (x0, y0, x1, y1, f) => { ctx.fillStyle = f; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); if (line) { ctx.strokeStyle = line; ctx.lineWidth = igHair(1.6); ctx.lineJoin = 'miter'; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); } };
  const y1 = yb - h * 0.62, y2 = yb - h * 0.8, y3 = yb - h * 0.88;
  box(x - w / 2, y1, x + w / 2, yb, c);
  box(x - w * 0.42, y2, x + w * 0.42, y1, c);
  box(x - w * 0.34, y3, x + w * 0.34, y2, c);
  for (const [yy, ww] of [[y1, w * 0.78], [y2, w * 0.62]]) {   // balconies with corbels
    igShape([[x - ww, yy - w * 0.14], [x + ww, yy - w * 0.14], [x + ww, yy], [x + w * 0.5, yy + w * 0.32], [x - w * 0.5, yy + w * 0.32], [x - ww, yy]], c, line ? { rim: line, rw: 1.6, hair: true } : {});
    if (trim) { ctx.fillStyle = trim; ctx.fillRect(x - ww, yy - w * 0.14, ww * 2, Math.max(2, w * 0.05)); }
  }
  igShape(igDomePts(x, y3, w * 0.8, h * 0.12, { bulge: 1.08, neck: 0.02 }), o.cap ?? c, line ? { rim: line, rw: 1.6, hair: true } : {});
  igFinial(x, y3 - h * 0.12 + 2, h * 0.09, trim || c);
  if (trim) { ctx.fillStyle = trim; ctx.fillRect(x - w / 2, yb - h * 0.2, w, Math.max(2, w * 0.05)); ctx.fillRect(x - w / 2, yb - h * 0.42, w, Math.max(2, w * 0.05)); }
  if (win) for (const yy of [yb - h * 0.3, yb - h * 0.52, y2 + (y1 - y2) * 0.65]) igShape(igArchPts(x, yy, w * 0.26, w * 0.5, { point: 0.4 }), win);
}
// a border band between x0 and x1, y..y+h: a ground, two gold rules and small 8-stars alternating with diamonds,
// laid out symmetrically about o.cx (default the middle). o: ground, c (motif), c2 (diamonds), rule, period
function igBand(x0, x1, y, h, o = {}) {
  const cx = o.cx ?? (x0 + x1) / 2, per = o.period ?? h * 1.5, cy = y + h / 2, r = h * 0.3, rule = o.rule ?? IG.gold, rh = Math.max(2, h * 0.11);
  ctx.fillStyle = o.ground ?? IG.lapisD; ctx.fillRect(x0, y, x1 - x0, h);
  ctx.fillStyle = rule; ctx.fillRect(x0, y, x1 - x0, rh); ctx.fillRect(x0, y + h - rh, x1 - x0, rh);
  const k0 = Math.floor((x0 - cx) / per) - 1, k1 = Math.ceil((x1 - cx) / per) + 1;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, h); ctx.clip();
  ctx.beginPath();
  for (let k = k0; k <= k1; k++) if (mod(k, 2) === 0) { const Q = igStarPts(cx + k * per, cy, r, 8); ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.closePath(); }
  ctx.fillStyle = o.c ?? IG.gold; ctx.fill();
  ctx.beginPath();
  for (let k = k0; k <= k1; k++) if (mod(k, 2) === 1) { const X = cx + k * per, d = r * 0.62; ctx.moveTo(X, cy - d); ctx.lineTo(X + d, cy); ctx.lineTo(X, cy + d); ctx.lineTo(X - d, cy); ctx.closePath(); }
  ctx.fillStyle = o.c2 ?? IG.turq; ctx.fill();
  ctx.restore();
}
// a hanging lantern (fanous) on a chain from (x, y0); sways about the hook. s = body size. o: amp, f, ph, glow
function igLantern(x, y0, len, s, o = {}) {
  const ang = (o.amp ?? 0.05) * Math.sin(TT * TAU * (o.f ?? 0.4) + (o.ph ?? 0));
  ctx.save(); ctx.translate(x, y0); ctx.rotate(ang);
  const brass = o.brass ?? IG.brass, dark = IG.goldD, by = len;
  // chain: alternating links
  ctx.strokeStyle = brass; ctx.lineWidth = igHair(2);
  for (let yy = 0; yy < by - 6; yy += 12) { ctx.beginPath(); if ((yy / 12) % 2) { ctx.moveTo(0, yy); ctx.lineTo(0, yy + 12); } else ctx.ellipse(0, yy + 6, 3, 6, 0, 0, TAU); ctx.stroke(); }
  const fl = 0.85 + 0.15 * Math.sin(TT * TAU * 1.3 + (o.ph ?? 0) * 3) * Math.sin(TT * TAU * 0.7 + 1);
  const gy = by + s * 0.95, gr = ctx.createRadialGradient(0, gy, 0, 0, gy, s * 1.5);
  gr.addColorStop(0, igRGBA(IG.goldL, 0.42 * fl)); gr.addColorStop(1, igRGBA(IG.goldL, 0));
  if (o.glow !== false) { ctx.fillStyle = gr; ctx.fillRect(-s * 1.6, gy - s * 1.6, s * 3.2, s * 3.2); }
  ctx.beginPath(); ctx.arc(0, by + s * 0.05, s * 0.07, 0, TAU); igStroke(brass, 2.4, { hair: true });
  igShape(igDomePts(0, by + s * 0.42, s * 0.62, s * 0.32, { bulge: 1.1 }), brass, { rim: dark, rw: 1.2 });
  igShape([[-s * 0.4, by + s * 0.42], [s * 0.4, by + s * 0.42], [s * 0.36, by + s * 0.52], [-s * 0.36, by + s * 0.52]], brass, { rim: dark, rw: 1.2 });
  const top = by + s * 0.52, bot = by + s * 1.3, tw = s * 0.36, bwd = s * 0.28;
  const body = [[-tw, top], [tw, top], [bwd, bot], [-bwd, bot]];
  igShape(body, igMix(IG.goldL, IG.ivory, 0.35 * fl));
  // panes: three glass panels with brass mullions; a khatam cut-out in the middle one
  ctx.save(); igPoly(body); ctx.clip();
  ctx.fillStyle = igRGBA(IG.terra, 0.35); ctx.fillRect(-tw, top, tw * 0.5, bot - top); ctx.fillRect(tw * 0.5, top, tw * 0.5, bot - top);
  ctx.restore();
  ctx.beginPath(); for (const f of [-0.5, 0.5]) { ctx.moveTo(f * tw, top); ctx.lineTo(f * bwd, bot); } igStroke(brass, 2.2, { hair: true });
  igPoly(igStarPts(0, (top + bot) / 2, s * 0.17, 8)); igStroke(brass, 1.8, { hair: true, join: 'miter' });
  igPoly(body); igStroke(dark, 2, { hair: true, join: 'round' });
  igShape([[-bwd - s * 0.05, bot], [bwd + s * 0.05, bot], [s * 0.06, bot + s * 0.32], [-s * 0.06, bot + s * 0.32]], brass, { rim: dark, rw: 1.2 });
  ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(0, bot + s * 0.38, s * 0.05, 0, TAU); ctx.fill();
  ctx.restore();
}
// night sky details: twinkling dots and a few sparkles (static positions, smooth twinkle). avoid: [x, y, r] or a list
// of them to keep clear (the moon, a tag, the hero's resting spot)
function igStars(x0, y0, x1, y1, n, o = {}) {
  const R = RNG('igsky', o.key ?? 's'), av = !o.avoid ? [] : Array.isArray(o.avoid[0]) ? o.avoid : [o.avoid];
  for (let i = 0; i < n; i++) {
    const x = R.r(x0, x1), y = R.r(y0, y1), sz = R.r(1.2, 3.4), ph = R.r(0, TAU), sp = R.r(0.4, 1.1), big = R.f() < (o.big ?? 0.12);
    if (av.some((a) => Math.hypot(x - a[0], y - a[1]) < a[2])) continue;
    const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TT * TAU * sp + ph));
    ctx.globalAlpha = tw * (o.al ?? 1);
    if (big) star4(x, y, sz * 3.4, o.c2 ?? IG.goldL);
    else { ctx.fillStyle = o.c ?? IG.cream; ctx.beginPath(); ctx.arc(x, y, sz * 0.6, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
//  the hero: a glowing 8-point star (khatam) — non-figurative, no face. It pulses, turns slowly and can
//  gain points (o.n0 -> o.n1 over o.gain 0..1). Sets SPARK_AT.
// ---------------------------------------------------------------------
function igHero(x, y, r, o = {}) {
  if (r <= 0.5) return;
  const n0 = o.n0 ?? o.rays ?? 8, n1 = o.n1 ?? n0, g = EZ.io(clamp(o.gain ?? 0)), pulse = 1 + 0.045 * Math.sin(TT * TAU * 0.9 + (o.ph ?? 0));
  const rot = o.rot ?? TT * 0.35, R = r * pulse;
  SPARK_AT = toScreen(x, y);
  // glow and a faint 16-ray halo
  const gr = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 2.4);
  gr.addColorStop(0, igRGBA(IG.goldL, 0.55)); gr.addColorStop(0.45, igRGBA(IG.gold, 0.16)); gr.addColorStop(1, igRGBA(IG.gold, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R * 2.4, 0, TAU); ctx.fill();
  ctx.beginPath(); for (let i = 0; i < 16; i++) { const an = rot * 0.5 + i / 16 * TAU, r0 = R * 1.18, r1 = R * (i % 2 ? 1.5 : 1.85); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); }
  igStroke(IG.goldL, 1.6, { hair: true, al: 0.55 });
  if (o.ring) { const u = clamp(o.ring); ctx.beginPath(); ctx.arc(x, y, R * (1.2 + 1.6 * EZ.o3(u)), 0, TAU); igStroke(IG.goldL, 2.5, { hair: true, al: 1 - u }); }
  // gaining points: the new star (n1) unfolds from behind while the old one (n0) shrinks and fades into it
  const face = (n, k, al) => {
    if (al <= 0.001) return;
    ctx.globalAlpha = al;
    const lg = ctx.createLinearGradient(x, y - R, x, y + R); lg.addColorStop(0, IG.goldL); lg.addColorStop(1, IG.gold);
    igPoly(igStarPts(x, y, R * k, n, { rot: -Math.PI / 2 + rot })); ctx.fillStyle = lg; ctx.fill(); igStroke(IG.goldD, 2, { hair: true, join: 'miter', al });
    igPoly(igStarPts(x, y, R * k * 0.6, n, { rot: -Math.PI / 2 - rot })); ctx.fillStyle = o.core ?? IG.turq; ctx.globalAlpha = al; ctx.fill(); igStroke(IG.goldL, 1.6, { hair: true, join: 'miter', al });
    ctx.globalAlpha = 1;
  };
  if (g <= 0) face(n0, 1, 1);
  else if (g >= 1) face(n1, 1, 1);
  else { face(n1, lerp(0.55, 1, g), 1); face(n0, lerp(1, 0.8, g), 1 - EZ.i2(g)); }
  ctx.beginPath(); ctx.arc(x, y, R * 0.2, 0, TAU); ctx.fillStyle = IG.ivory; ctx.fill(); igStroke(IG.goldD, 1.2, { hair: true });
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER, at screen size). Hidden while an era is seen through a morph window.
// ---------------------------------------------------------------------
function igBridgeFade() {   // 0 inside a bridge, easing back to 1 over the 0.2s on either side (no pop)
  if (typeof BRIDGES === 'undefined') return 1;
  let f = 1;
  for (const r of BRIDGES) f = Math.min(f, clamp((Math.abs(TT - r.tc) - (r.d ?? 0.6) + 1e-6) / 0.2));
  return EZ.io(f);
}
// cartouche: an elongated hexagon with pointed ends, ivory with a double gold border and two small stars
function igCartouchePts(cx, cy, w, h) { const e = h * 0.42; return [[cx - w / 2 + e, cy - h / 2], [cx + w / 2 - e, cy - h / 2], [cx + w / 2, cy], [cx + w / 2 - e, cy + h / 2], [cx - w / 2 + e, cy + h / 2], [cx - w / 2, cy]]; }
function igCaptionNow(str, o = {}) {
  const t0 = E0 + (o.at ?? 0.5), u = EZ.o3(ev(t0, 0.55)), tu = EZ.o2(ev(t0 + 0.25, 0.5)), fade = igBridgeFade();
  if (u <= 0 || fade <= 0) return;
  let sz = o.size ?? 54; const cy = o.y ?? 1420, cx = o.x ?? CX, maxW = o.maxW ?? 860;
  ctx.save(); ctx.font = `400 ${sz}px ${IG_SERIF}`;
  let tw = ctx.measureText(str).width;
  if (tw + sz * 2.6 > maxW) { sz = Math.max(30, Math.floor(sz * (maxW - sz * 2.6) / tw)); ctx.font = `400 ${sz}px ${IG_SERIF}`; tw = ctx.measureText(str).width; }   // a long line shrinks to fit its cartouche
  const w = Math.min(maxW, tw + sz * 2.6) * (0.25 + 0.75 * u), h = sz * 1.9;
  const P = igCartouchePts(cx, cy, w, h);
  ctx.globalAlpha = fade;
  ctx.shadowColor = 'rgba(5,15,25,0.28)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  igPoly(P); ctx.fillStyle = o.bg ?? IG.ivory; ctx.fill(); ctx.shadowColor = 'transparent';
  igPoly(P); ctx.strokeStyle = IG.gold; ctx.lineWidth = 4; ctx.lineJoin = 'miter'; ctx.stroke();
  igPoly(igCartouchePts(cx, cy, w - 22, h - 16)); ctx.strokeStyle = IG.goldD; ctx.lineWidth = 1.4; ctx.stroke();
  for (const sx of [-1, 1]) { igPoly(igStarPts(cx + sx * (w / 2 - h * 0.36), cy, h * 0.13 * u, 8)); ctx.fillStyle = IG.gold; ctx.fill(); }
  ctx.globalAlpha = fade * tu; ctx.fillStyle = o.c ?? IG.lapisD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(str, cx, cy + sz * 0.04 + (1 - tu) * 10);
  ctx.restore();
}
function igTagNow(label, o = {}) {
  const u = EZ.o3(ev(E0 + (o.at ?? 0.3), 0.5)), fade = igBridgeFade();
  if (u <= 0 || fade <= 0) return;
  const x = o.x ?? 72, y = o.y ?? 300, c = o.c ?? IG.goldL;
  ctx.save(); ctx.globalAlpha = fade * u;
  igPoly(igStarPts(x + 14, y - 11, 14, 8, { rot: -Math.PI / 2 + (1 - u) })); ctx.fillStyle = IG.gold; ctx.fill();
  ctx.font = `600 30px ${IG_SANS}`; ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const sp = label.toUpperCase().split('').join('  ');
  ctx.fillText(sp, x + 42, y); const w = ctx.measureText(sp).width;
  ctx.beginPath(); ctx.moveTo(x + 42, y + 16); ctx.lineTo(x + 42 + w * u, y + 16); ctx.strokeStyle = IG.gold; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
const igCaption = (str, o = {}) => { const f = () => igCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const igTag = (label, o = {}) => { const f = () => igTagNow(label, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract)
// =====================================================================
const STYLE = {
  name: 'islamic-geometric',
  paper: IG.paper,
  backdrop(c) {   // the ground in c, with the strapwork pressed into it and a soft darkening toward the corners
    fillAll(c);
    ctx.save(); screen();
    igPattern([[0, 0], [W, 0], [W, H], [0, H]], { s: 180, ox: W / 2, oy: H / 2, lines: IG.gold, w: 1.8, al: 0.2 });
    const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.18, W / 2, H * 0.42, H * 0.72);
    g.addColorStop(0, 'rgba(10,26,36,0)'); g.addColorStop(1, 'rgba(10,26,36,0.34)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },
  window(P, key, src) {   // the old/new world through the opening, with a keylined gold rim and a star finial
    ctx.save(); igPoly(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    igPoly(P); igStroke(IG.ink, 11, { join: 'round' }); igPoly(P); igStroke(IG.gold, 6, { join: 'round' });
    igPoly(igInset(P, 10)); igStroke(IG.goldL, 1.4, { join: 'round', al: 0.9 });
    const top = P.reduce((a, p) => (p[1] < a[1] ? p : a), P[0]), bb = bbox(P);
    if (bb.y1 - bb.y0 > 80 && top[1] > 30) { igPoly(igStarPts(top[0], top[1] - 18, 14, 8)); ctx.fillStyle = IG.gold; ctx.fill(); igStroke(IG.ink, 1.5); }
  },
  blob(P, c, key, u) {   // the morphing tile: a halo of compass rays, a flat glaze with strapwork inside, a keylined gold rim
    const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2;
    if (R < 2) return;
    const hg = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.6);
    hg.addColorStop(0, igRGBA(IG.goldL, 0.3)); hg.addColorStop(1, igRGBA(IG.goldL, 0));
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, R * 2.6, 0, TAU); ctx.fill();
    const turn = (u ?? 0) * Math.PI / 4;   // the ring turns one notch through the morph (upright again at the midpoint)
    ctx.beginPath(); for (let i = 0; i < 32; i++) { const an = turn + i / 32 * TAU, r0 = R * 1.5, r1 = R * (i % 4 === 0 ? 2.25 : i % 2 === 0 ? 1.95 : 1.72); ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); }
    igStroke(IG.goldL, 1.8, { al: 0.5 });
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, TAU); igStroke(IG.gold, 1.6, { al: 0.55 });
    igPoly(igStarPts(cx, cy, R * 2.45, 8, { rot: -Math.PI / 2 + turn })); igStroke(IG.gold, 1.6, { al: 0.4 });
    igPoly(P); ctx.fillStyle = c; ctx.fill();
    igPattern(P, { s: Math.max(48, R * 0.6), ox: cx, oy: cy, lines: IG.ivory, w: 1.8, al: 0.3 });
    ctx.save(); igPoly(P); ctx.clip();   // a glaze: light from the upper left, a little shade on the right
    const gl = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1);
    gl.addColorStop(0, 'rgba(255,250,235,0.3)'); gl.addColorStop(0.45, 'rgba(255,250,235,0)'); gl.addColorStop(1, 'rgba(10,26,36,0.2)');
    ctx.fillStyle = gl; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.restore();
    igPoly(P); igStroke(IG.ink, 9, { join: 'round' }); igPoly(P); igStroke(IG.gold, 5, { join: 'round' });
    igPoly(igOffset(P, -11)); igStroke(IG.goldL, 1.4, { join: 'round', al: 0.8 });
  },
  hero(x, y, r, o = {}) { igHero(x, y, r * 0.62, { n0: o.rays ?? 8, key: o.key }); },
  heroColor: IG.gold,
  heroPts(x, y, r, n) { return igStarBlend(x, y, r * 0.62, Math.max(4, n || 8), Math.max(4, n || 8), 0, 0, 96); },
  ones: true,
};
