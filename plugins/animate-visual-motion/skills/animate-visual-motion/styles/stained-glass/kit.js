// =====================================================================
//  styles/stained-glass/kit.js — STAINED GLASS: a leaded window lit from behind in a dark stone room.
//  Every picture is cut into PANES of coloured glass (one jewel colour each, its own tint, a glow that is brighter
//  in the middle and darker toward the lead, streaks and seeds of hand-made glass) held by thick dark lead came
//  with solder dots at the junctions. The glass never moves: light does. Panes go from dark glass to glowing one
//  by one, a band of light crosses the window, a shimmer drifts over it, colour spills on the floor below.
//  Built on kit/core.js. Helpers are prefixed sgl…; the palette is SGL. Needs from the piece head: CX.
//
//  How it stays fast: a window is a GLAZING (sglGlaze): its lit glass, its lead and a soft bloom are painted once
//  into offscreen canvases (keyed, seeded). A frame only fills each pane from the lit canvas and darkens it by how
//  unlit it is (sglDraw). Panes are painted in order, so a later pane simply covers what is under it.
//  No ctx.filter, no shadowBlur, no per-pixel loops.
// =====================================================================
const SGL = {
  stone: '#131117', stoneL: '#2b2731', stoneD: '#070609', lead: '#0b0a0d', leadHi: '#6a645b', solder: '#353230',
  ruby: '#c81e33', cobalt: '#2450c8', emerald: '#1f9460', amber: '#f2a41f', violet: '#7440bd', turquoise: '#1fb0b8',
  milk: '#f4eedd',                                   // milky white: the hero's glass
  night: '#172c84', indigo: '#33289a', straw: '#f6cf6a', sky: '#93c8ee', cloud: '#d3e4f2', lime: '#86bf3c', rose: '#e9708c',
  gold: '#d8b25c', white: '#fff3d6', glow: '#ffd98a', light: '#fff3d2', shade: '#06050c',
};
SGL.paper = SGL.stone;
const SGL_SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", "Iowan Old Style", "Hoefler Text", Georgia, "Times New Roman", "DejaVu Serif", "Liberation Serif", serif';
const SGL_DIM = 0.86;                                // how dark an unlit pane is (a veil of near-black over its glass)

// ---------------------------------------------------------------------
//  colour (hex or rgb() in, rgb()/rgba() out)
// ---------------------------------------------------------------------
function sglRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const sglMix = (a, b, u) => { const x = sglRGB(a), y = sglRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const sglTone = (c, k) => (k >= 0 ? sglMix(c, SGL.light, k) : sglMix(c, SGL.shade, -k));   // k > 0 toward warm light, k < 0 toward shade
// brighter in its own hue (what glass does with light behind it), with a little warm white at the top end
const sglLift = (c, k) => { const v = sglRGB(c).map((x) => Math.min(255, x * (1 + k) + 14 * k)); return sglMix(`rgb(${v.map(Math.round).join(',')})`, SGL.light, k * 0.3); };
const sglA = (c, a) => { const [r, g, b] = sglRGB(c); return `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`; };
const sglZoom = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
function sglCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
// a soft glow of colour c added to what is there (a radial falloff, optionally flattened: ry)
function sglHalo(x, y, r, c, al = 0.3, ry = r) {
  if (al <= 0.004 || r <= 1) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / r); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, sglA(c, al)); g.addColorStop(0.5, sglA(c, al * 0.4)); g.addColorStop(1, sglA(c, 0));
  ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
}

// ---------------------------------------------------------------------
//  geometry: polygons are arrays of [x, y]
// ---------------------------------------------------------------------
function sglPath(g, P) { g.beginPath(); for (let i = 0; i < P.length; i++) { if (i) g.lineTo(P[i][0], P[i][1]); else g.moveTo(P[i][0], P[i][1]); } g.closePath(); }
function sglArea(P) { let s = 0; for (let i = 0, n = P.length; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function sglCen(P) {
  let s = 0, x = 0, y = 0;
  for (let i = 0, n = P.length; i < n; i++) { const a = P[i], b = P[(i + 1) % n], k = a[0] * b[1] - b[0] * a[1]; s += k; x += (a[0] + b[0]) * k; y += (a[1] + b[1]) * k; }
  if (Math.abs(s) < 1e-6) return P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
  return [x / (3 * s), y / (3 * s)];
}
function sglClean(P, tol = 0.05) { const out = []; for (const p of P) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > tol) out.push(p); } if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < tol) out.pop(); return out.length >= 3 ? out : []; }
function sglInside(P, x, y) { let c = false; for (let i = 0, n = P.length, j = n - 1; i < n; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
// the part of P on the side of the line through (ax, ay) that its normal (nx, ny) points to
function sglClipHalf(P, ax, ay, nx, ny) {
  const out = [], n = P.length;
  for (let i = 0; i < n; i++) {
    const p = P[i], q = P[(i + 1) % n], dp = (p[0] - ax) * nx + (p[1] - ay) * ny, dq = (q[0] - ax) * nx + (q[1] - ay) * ny;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return sglClean(out);
}
// P clipped to the convex polygon Q (P may be any outline)
function sglClipConvex(P, Q) {
  const s = sglArea(Q) >= 0 ? 1 : -1; let out = P;
  for (let i = 0; i < Q.length && out.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.5) continue; out = sglClipHalf(out, a[0], a[1], -(b[1] - a[1]) * s, (b[0] - a[0]) * s); }
  return out;
}
const sglCirclePts = (x, y, r, n = 48) => ellipsePts(x, y, r, r, 0, n);
// a ring sector between radii r0 and r1 and angles a0..a1 (r0 = 0: a pie slice)
function sglSectorPts(x, y, r0, r1, a0, a1, n) {
  n = n ?? Math.max(2, Math.ceil(Math.abs(a1 - a0) * r1 / 20)); const P = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); P.push([x + Math.cos(a) * r1, y + Math.sin(a) * r1]); }
  if (r0 <= 0.5) P.push([x, y]); else for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); P.push([x + Math.cos(a) * r0, y + Math.sin(a) * r0]); }
  return P;
}
// a window outline: (cx, top) the top centre, w wide, h tall. o.kind: 'pointed' (o.rise, default 0.6 w), 'round',
// 'horseshoe' (o.neck: jamb width / arc width, default 0.84), 'rect'. Starts bottom-left, runs up and over.
function sglArchPts(cx, top, w, h, o = {}) {
  const kind = o.kind ?? 'pointed', a = w / 2, bot = top + h, n = o.n ?? 30, P = [];
  if (kind === 'rect') return [[cx - a, bot], [cx - a, top], [cx + a, top], [cx + a, bot]];
  if (kind === 'horseshoe') {
    const j = a * (o.neck ?? 0.84), cy = top + a, a1 = Math.acos(j / a);
    P.push([cx - j, bot]);
    for (let i = 0; i <= 2 * n; i++) { const t = Math.PI - a1 + (Math.PI + 2 * a1) * i / (2 * n); P.push([cx + a * Math.cos(t), cy + a * Math.sin(t)]); }
    P.push([cx + j, bot]); return P;
  }
  const rise = kind === 'round' ? a : Math.max(a, o.rise ?? w * 0.6), R = (a * a + rise * rise) / (2 * a), ys = top + rise, phi = Math.atan2(rise, R - a);
  P.push([cx - a, bot]);
  for (let i = 0; i <= n; i++) { const t = Math.PI + phi * i / n; P.push([cx - a + R + R * Math.cos(t), ys + R * Math.sin(t)]); }
  for (let i = 1; i <= n; i++) { const t = TAU - phi + phi * i / n; P.push([cx + a - R + R * Math.cos(t), ys + R * Math.sin(t)]); }
  P.push([cx + a, bot]); return P;
}
// a border of small panes bw deep along outline P: { polys: the panes in order along the outline, inner: the field left inside }
function sglBorder(P, bw = 44, o = {}) {
  const n = P.length, turn = (i) => { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], d = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]); return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); };
  let cs = []; for (let i = 0; i < n; i++) if (turn(i) > (o.corner ?? 0.3)) cs.push(i);
  if (!cs.length) cs = [0];
  const Q = [];
  cs.forEach((c0, k) => {
    const c1 = cs[(k + 1) % cs.length], run = [];
    for (let i = c0, m = 0; m <= n; i = (i + 1) % n, m++) { run.push(P[i]); if (i === c1 && run.length > 1) break; }
    const m = Math.max(1, Math.round(pathLen(run) / (o.step ?? bw)));
    for (let j = 0; j < m; j++) Q.push(pointAt(run, j / m));
  });
  const s = sglArea(Q) >= 0 ? 1 : -1, m = Q.length;
  const I = Q.map((q, i) => {
    const a = Q[(i - 1 + m) % m], c = Q[(i + 1) % m], l1 = dist(a, q) || 1, l2 = dist(q, c) || 1;
    const n1 = [-(q[1] - a[1]) / l1 * s, (q[0] - a[0]) / l1 * s], n2 = [-(c[1] - q[1]) / l2 * s, (c[0] - q[0]) / l2 * s];
    let nx = n1[0] + n2[0], ny = n1[1] + n2[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const k = bw / Math.max(0.5, nx * n1[0] + ny * n1[1]);
    return [q[0] + nx * k, q[1] + ny * k];
  });
  return { polys: Q.map((q, i) => sglClean([q, Q[(i + 1) % m], I[(i + 1) % m], I[i]], 1)).filter((q) => q.length), inner: sglClean(I, 1) };
}
// an arched window in one call: { out: the outline, inner: the field inside the border, border: the border panes' polygons }
function sglFrame(cx, top, w, h, o = {}) { const out = sglArchPts(cx, top, w, h, o), b = sglBorder(out, o.border ?? 44, o); return { out, inner: b.inner, border: b.polys }; }

// ---- glazing an outline: every one returns an array of polygons
// split any outline into panes with n seeded straight cuts (always the largest piece, across its long side).
//   o: n (5), key, slant (0.5 rad of random tilt), angle (fixed cut direction), min (smallest pane area, 900)
function sglCut(P, o = {}) {
  const R = RNG('sglcut', o.key ?? 'cut'), n = o.n ?? 5, minA = o.min ?? 900; let pcs = [sglClean(P)];
  for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
    let idx = 0, best = -1; pcs.forEach((q, i) => { const a = Math.abs(sglArea(q)); if (a > best) { best = a; idx = i; } });
    const Q = pcs[idx], ce = sglCen(Q), bb = bbox(Q), wd = bb.x1 - bb.x0, hg = bb.y1 - bb.y0;
    const ang = (o.angle ?? (wd > hg ? Math.PI / 2 : 0)) + R.n(o.slant ?? 0.5), px = ce[0] + R.n(wd * 0.12), py = ce[1] + R.n(hg * 0.12);
    const nx = -Math.sin(ang), ny = Math.cos(ang), A = sglClipHalf(Q, px, py, nx, ny), Bq = sglClipHalf(Q, px, py, -nx, -ny);
    if (A.length < 3 || Bq.length < 3 || Math.abs(sglArea(A)) < minA || Math.abs(sglArea(Bq)) < minA) continue;
    pcs.splice(idx, 1, A, Bq); k++;
  }
  return pcs;
}
// split an outline into n wedges fanning from (cx, cy): rays of a sky, the petals of a flower. o: a0 (first cut's angle)
function sglFan(P, cx, cy, n, o = {}) {
  const a0 = o.a0 ?? -Math.PI / 2, out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + i / n * TAU, b = a0 + (i + 1) / n * TAU;
    const Q = sglClipHalf(sglClipHalf(P, cx, cy, -Math.sin(a), Math.cos(a)), cx, cy, Math.sin(b), -Math.cos(b));
    if (Q.length >= 3 && Math.abs(sglArea(Q)) > (o.min ?? 30)) out.push(Q);
  }
  return out;
}
// a diamond lattice (quarries) clipped to an outline. s = a diamond's width; o: ratio (height / width, 1.45), x, y (a lattice point)
function sglQuarries(P, s, o = {}) {
  const h = s * (o.ratio ?? 1.45), bb = bbox(P), ox = o.x ?? (bb.x0 + bb.x1) / 2, oy = o.y ?? (bb.y0 + bb.y1) / 2, out = [];
  for (let j = Math.floor((bb.y0 - oy) / (h / 2)) - 1; j <= Math.ceil((bb.y1 - oy) / (h / 2)) + 1; j++) {
    for (let i = Math.floor((bb.x0 - ox) / s) - 1; i <= Math.ceil((bb.x1 - ox) / s) + 1; i++) {
      const x = ox + (i + (mod(j, 2) ? 0.5 : 0)) * s, y = oy + j * h / 2;
      if (x + s / 2 < bb.x0 || x - s / 2 > bb.x1 || y + h / 2 < bb.y0 || y - h / 2 > bb.y1) continue;
      const Q = sglClipConvex(P, [[x, y - h / 2], [x + s / 2, y], [x, y + h / 2], [x - s / 2, y]]);
      if (Q.length >= 3 && Math.abs(sglArea(Q)) > (o.min ?? 30)) out.push(Q);
    }
  }
  return out;
}
// a rectangular lattice of panes cw x ch clipped to an outline. o: x, y (a lattice corner), brick (offset every other row)
function sglGrid(P, cw, ch, o = {}) {
  const bb = bbox(P), ox = o.x ?? bb.x0, oy = o.y ?? bb.y0, out = [];
  for (let j = Math.floor((bb.y0 - oy) / ch); j * ch + oy < bb.y1; j++) {
    const off = o.brick && mod(j, 2) ? cw / 2 : 0;
    for (let i = Math.floor((bb.x0 - ox - off) / cw); i * cw + ox + off < bb.x1; i++) {
      const x = ox + off + i * cw, y = oy + j * ch, Q = sglClipConvex(P, [[x, y], [x + cw, y], [x + cw, y + ch], [x, y + ch]]);
      if (Q.length >= 3 && Math.abs(sglArea(Q)) > (o.min ?? 30)) out.push(Q);
    }
  }
  return out;
}

// ---------------------------------------------------------------------
//  panes: { P, c, id, i, n, ce, a } — a polygon, its glass colour, its group name and its place (i of n) in the group
//  c: a colour, a list (cycled), or (i, P) => colour.   sglOrder renumbers a group by distance from a point
//  (or by angle around it), so light can spread through it along the lead.
// ---------------------------------------------------------------------
function sglPanes(polys, c, id = 'pane', o = {}) {
  return polys.filter((P) => P.length >= 3).map((P, i, all) => {
    const Q = sglArea(P) < 0 ? P.slice().reverse() : P;
    return { P: Q, c: typeof c === 'function' ? c(i, Q) : Array.isArray(c) ? c[i % c.length] : c, id, i, n: all.length, ce: sglCen(Q), a: Math.abs(sglArea(Q)), ...o };
  });
}
function sglOrder(panes, from, byAngle = false) {
  const v = panes.map((p) => (byAngle ? mod(Math.atan2(p.ce[1] - from[1], p.ce[0] - from[0]) + Math.PI / 2, TAU) : Math.hypot(p.ce[0] - from[0], p.ce[1] - from[1])));
  panes.map((p, i) => i).sort((a, b) => v[a] - v[b] || a - b).forEach((k, rank) => { panes[k].i = rank; });
  return panes;
}
// how lit pane p is at time TT when its group lights one pane after another from t0 (per seconds apart, each over dur).
// It overshoots 1 for a moment as the pane catches (anything a lit function returns above 1 is drawn as a white flare).
const sglSeq = (p, t0, per = 0.04, dur = 0.22) => { const u = (TT - t0 - p.i * per) / dur; return u <= 0 ? 0 : clamp(u) + (u < 2.5 ? 0.6 * Math.sin(Math.PI * u / 2.5) ** 2 : 0); };
// a slow private twinkle, 1 - amt .. 1
const sglTwinkle = (p, amt = 0.2, speed = 4) => 1 - amt * (0.5 + 0.5 * Math.sin(TT * speed + (p.ph ?? 0) * 3));
// a pulse of light running through a group again and again (speed = panes per second, tail = panes it trails over)
const sglChase = (p, t0, speed = 10, gap = 4, tail = 2.5) => (TT < t0 ? 0 : clamp(1 - mod((TT - t0) * speed - p.i, p.n + gap) / tail));

// ---------------------------------------------------------------------
//  the glass of one pane, painted once into a glazing's lit canvas
// ---------------------------------------------------------------------
function sglGlassPane(g, p, key) {
  const R = RNG('sglglass', key), P = p.P, bb = bbox(P), ce = p.ce;
  let rad = 1; for (const q of P) rad = Math.max(rad, Math.hypot(q[0] - ce[0], q[1] - ce[1]));
  const base = sglTone(p.c, R.n(p.vary ?? 0.14));
  g.save(); sglPath(g, P); g.fillStyle = base; g.fill(); g.clip();
  // the inner glow: brighter in the middle, darker toward the lead
  const gr = g.createRadialGradient(ce[0] + R.n(rad * 0.14), ce[1] + R.n(rad * 0.14), 0, ce[0], ce[1], rad * 1.04);
  gr.addColorStop(0, sglLift(base, 0.5)); gr.addColorStop(0.5, sglLift(base, 0.08)); gr.addColorStop(1, sglTone(base, -0.46));
  g.fillStyle = gr; g.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  // uneven thickness: a few soft light and dark patches
  for (let k = 0; k < 3; k++) {
    const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), r = rad * R.r(0.3, 0.7), lt = R.f() < 0.5, b = g.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, lt ? 'rgba(255,244,210,0.16)' : 'rgba(5,4,14,0.16)'); b.addColorStop(1, lt ? 'rgba(255,244,210,0)' : 'rgba(5,4,14,0)');
    g.fillStyle = b; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // streaks of hand-rolled glass, all running one way
  const a = R.r(0, Math.PI), ca = Math.cos(a), sa = Math.sin(a), m = clamp(Math.floor(4 + rad / 12), 4, 16);
  g.lineCap = 'round';
  for (let k = 0; k < m; k++) {
    const d = R.n(rad), l0 = R.r(-1.2, -0.2) * rad, l1 = R.r(0.2, 1.2) * rad, bend = R.n(rad * 0.1), x = ce[0] - sa * d, y = ce[1] + ca * d;
    g.beginPath(); g.moveTo(x + ca * l0, y + sa * l0); g.quadraticCurveTo(x - sa * bend, y + ca * bend, x + ca * l1, y + sa * l1);
    g.strokeStyle = R.f() < 0.55 ? `rgba(255,246,220,${R.r(0.05, 0.17).toFixed(3)})` : `rgba(4,3,12,${R.r(0.05, 0.15).toFixed(3)})`; g.lineWidth = R.r(1, 6); g.stroke();
  }
  // seeds: small bubbles caught in the glass
  for (let k = R.i(1, 2 + Math.floor(rad / 26)); k > 0; k--) {
    const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), r = R.r(1.4, 3.6);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = 'rgba(255,250,235,0.3)'; g.fill(); g.lineWidth = 0.9; g.strokeStyle = 'rgba(0,0,10,0.28)'; g.stroke();
  }
  // the glass darkens where it meets the lead
  const ew = Math.min(rad * 0.7, 34); g.lineJoin = 'round'; g.strokeStyle = 'rgba(4,3,12,0.13)';
  for (const w of [0.95, 0.58, 0.3]) { sglPath(g, P); g.lineWidth = ew * w; g.stroke(); }
  g.restore();
}
// a soft small copy of a canvas (1/div of its size, blurred by a second down-and-up pass)
function sglSoft(src, div = 8) {
  const a = sglCanvas(src.width / div, src.height / div), b = sglCanvas(a.width / 2, a.height / 2), ga = a.getContext('2d'), gb = b.getContext('2d');
  ga.imageSmoothingQuality = gb.imageSmoothingQuality = 'high';
  ga.drawImage(src, 0, 0, a.width, a.height); gb.drawImage(a, 0, 0, b.width, b.height); ga.clearRect(0, 0, a.width, a.height); ga.drawImage(b, 0, 0, a.width, a.height);
  return a;
}

// ---------------------------------------------------------------------
//  a glazing: panes painted once (lit glass, lead with solder dots, bloom). sglGlaze(key, build, o)
//   build: () => [panes...] in painting order (called once per key).   o: lead (came width, 9)
//  sglDraw(G, lit, o) draws it with each pane as lit as lit(pane, i) says (0 dark glass .. 1 glowing, above 1 a flare; or one number).
//   o: x, y, s, flip (place a glazing built around 0,0), shimmer (0..1, the drifting shimmer), sweep (0..1: a band of
//      light crossing from the top-left to the bottom-right, lighting the panes it passes), band (its width, 150),
//      dim (how dark unlit glass is), bloom (0..1).   Returns how lit the window is (0..1, by area).
// ---------------------------------------------------------------------
const SGL_GLZ = {};
function sglGlaze(key, build, o = {}) {
  if (SGL_GLZ[key]) return SGL_GLZ[key];
  const panes = build(), lead = o.lead ?? 9, pad = Math.ceil(lead) + 6;
  let bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  for (const p of panes) { const b = bbox(p.P); bb = { x0: Math.min(bb.x0, b.x0), y0: Math.min(bb.y0, b.y0), x1: Math.max(bb.x1, b.x1), y1: Math.max(bb.y1, b.y1) }; }
  const ox = Math.floor(bb.x0 - pad), oy = Math.floor(bb.y0 - pad), w = Math.ceil(bb.x1 + pad) - ox, h = Math.ceil(bb.y1 + pad) - oy;
  const litC = sglCanvas(w, h), leadC = sglCanvas(w, h), gl = litC.getContext('2d'), gd = leadC.getContext('2d');
  gl.translate(-ox, -oy); gd.translate(-ox, -oy); gd.lineJoin = 'round'; gd.lineCap = 'round';
  const dots = new Map();
  panes.forEach((p, i) => {
    p.ph = RNG('sglph', key, i).r(0, TAU);
    sglGlassPane(gl, p, key + ':' + i);
    // the came: a later pane cuts away the lead it covers, then gets its own
    gd.globalCompositeOperation = 'destination-out'; sglPath(gd, p.P); gd.fill(); gd.globalCompositeOperation = 'source-over';
    sglPath(gd, p.P); gd.strokeStyle = SGL.lead; gd.lineWidth = lead; gd.stroke();
    gd.save(); gd.translate(-lead * 0.17, -lead * 0.17); sglPath(gd, p.P); gd.strokeStyle = sglA(SGL.leadHi, 0.4); gd.lineWidth = Math.max(1, lead * 0.15); gd.stroke(); gd.restore();
    const P = p.P, n = P.length;
    for (let k = 0; k < n; k++) {
      const a = P[(k - 1 + n) % n], b = P[k], c = P[(k + 1) % n], d = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.4) continue;
      const id = Math.round(b[0] / 6) + ',' + Math.round(b[1] / 6), e = dots.get(id);
      if (e) { e.n++; e.last = i; } else dots.set(id, { x: b[0], y: b[1], n: 1, last: i });
    }
  });
  // solder dots where the leads of two or more panes meet (not under a pane painted later)
  const dr = lead * 0.62;
  for (const d of dots.values()) {
    if (d.n < 2) continue;
    let hid = false; for (let j = d.last + 1; j < panes.length && !hid; j++) hid = sglInside(panes[j].P, d.x, d.y);
    if (hid) continue;
    gd.beginPath(); gd.arc(d.x, d.y, dr, 0, TAU); gd.fillStyle = SGL.solder; gd.fill();
    gd.beginPath(); gd.arc(d.x - dr * 0.28, d.y - dr * 0.28, dr * 0.36, 0, TAU); gd.fillStyle = sglA(SGL.leadHi, 0.75); gd.fill();
  }
  const pat = gl.createPattern(litC, 'no-repeat'); pat.setTransform(new DOMMatrix().translate(ox, oy));
  return (SGL_GLZ[key] = { key, panes, bb, ox, oy, w, h, lead, litC, leadC, pat, bloomC: sglSoft(litC, 8) });
}
function sglDraw(G, lit = 1, o = {}) {
  const f = typeof lit === 'function' ? lit : null, sh = o.shimmer ?? 1, dim = o.dim ?? SGL_DIM, sw = o.sweep, band = o.band ?? 150, s = o.s ?? 1, bb = G.bb;
  const ext = (bb.x1 - bb.x0) * 0.8 + (bb.y1 - bb.y0) * 0.6, hot = [];
  let sum = 0, tot = 0;
  ctx.save(); ctx.translate(o.x ?? 0, o.y ?? 0); ctx.scale(o.flip ? -s : s, s);
  for (let i = 0; i < G.panes.length; i++) {
    const p = G.panes[i], raw = f ? f(p, i) ?? 0 : lit; let k = clamp(raw), fl = clamp(raw - 1);
    if (sw != null) { const v = clamp(1 - Math.abs((p.ce[0] - bb.x0) * 0.8 + (p.ce[1] - bb.y0) * 0.6 - lerp(-band, ext + band, sw)) / band); if (v > 0) { k = Math.max(k, v); fl = Math.max(fl, v * 0.85); } }
    const wv = 0.5 + 0.5 * Math.sin(p.ce[0] * 0.012 + p.ce[1] * 0.008 - TT * 2.4 + p.ph * 0.35), ke = k * (1 - 0.22 * sh * wv * wv);
    sglPath(ctx, p.P); ctx.fillStyle = G.pat; ctx.fill();
    if (ke < 0.995) { ctx.fillStyle = `rgba(7,6,16,${(dim * (1 - ke)).toFixed(3)})`; ctx.fill(); }
    if (fl > 0.01) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,236,190,${(0.34 * fl).toFixed(3)})`; ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    sum += k * p.a; tot += p.a; if (k > 0.5) hot.push(p);
  }
  ctx.drawImage(G.leadC, G.ox, G.oy);
  // halation: the glow of lit panes creeps over the lead between them
  const bl = o.bloom ?? 1;
  if (hot.length && bl > 0) {
    ctx.save(); ctx.beginPath(); for (const p of hot) { p.P.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); }
    ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15 * bl; ctx.drawImage(G.bloomC, G.ox, G.oy, G.w, G.h); ctx.restore();
  }
  ctx.restore();
  return tot ? sum / tot : 0;
}
// the window's colours thrown on the floor below it: its blurred image, upside down and squashed, fading away from the wall.
//   k: how lit the window is (what sglDraw returned).   o: x (centre), y (top), w, h, al
function sglSpill(G, k, o = {}) {
  if (k <= 0.01) return;
  if (!G.spillC) {
    const c = sglCanvas(G.bloomC.width, 40), g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.save(); g.translate(0, c.height); g.scale(1, -1); g.drawImage(G.bloomC, 0, 0, c.width, c.height); g.restore();
    g.globalCompositeOperation = 'destination-in';
    let m = g.createLinearGradient(0, 0, 0, c.height); m.addColorStop(0, 'rgba(0,0,0,0.9)'); m.addColorStop(0.55, 'rgba(0,0,0,0.5)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, c.width, c.height);
    m = g.createLinearGradient(0, 0, c.width, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.16, 'rgba(0,0,0,1)'); m.addColorStop(0.84, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, c.width, c.height);
    G.spillC = sglSoft(c, 1);
  }
  const w = o.w ?? G.w * 1.1, h = o.h ?? 150;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingQuality = 'high'; ctx.globalAlpha = clamp(k) * (o.al ?? 0.8) * (0.93 + 0.07 * Math.sin(TT * 5.3));
  ctx.drawImage(G.spillC, (o.x ?? G.ox + G.w / 2) - w / 2, o.y ?? G.oy + G.h + 40, w, h); ctx.restore();
}

// ---------------------------------------------------------------------
//  the room: near-black dressed stone, a moulded opening for each window, a sill and a floor. Painted once per key.
//   sglWall(key, { open: [outline, ...], sill: [x0, x1, y], floor: y })   draws the cached wall at the world origin
//   sglAmbient(x, y, r, c, k)   the window's glow on the stone around it (draw before the glazing)
// ---------------------------------------------------------------------
const SGL_WALL = {};
function sglStone() {
  if (SGL_WALL.$stone) return SGL_WALL.$stone;
  const c = sglCanvas(W, H), g = c.getContext('2d'), R = RNG('sglstone');
  g.fillStyle = SGL.stone; g.fillRect(0, 0, W, H);
  for (let y = -30, row = 0; y < H; y += 122, row++) {   // ashlar courses
    for (let x = -R.r(0, 220); x < W;) {
      const w = R.r(170, 310), k = R.n(1);
      g.fillStyle = k > 0 ? `rgba(255,240,225,${(k * 0.03).toFixed(3)})` : `rgba(0,0,0,${(-k * 0.22).toFixed(3)})`; g.fillRect(x, y, w, 122);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + w - 3, y, 3, 122); g.fillStyle = 'rgba(255,238,215,0.035)'; g.fillRect(x + w, y, 1.5, 122);
      x += w;
    }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y + 119, W, 3); g.fillStyle = 'rgba(255,238,215,0.035)'; g.fillRect(0, y + 122, W, 1.5);
  }
  for (let i = 0; i < 34; i++) { const x = R.r(0, W), y = R.r(0, H), r = R.r(90, 280), lt = R.f() < 0.45, b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, lt ? 'rgba(255,236,214,0.035)' : 'rgba(0,0,0,0.2)'); b.addColorStop(1, lt ? 'rgba(255,236,214,0)' : 'rgba(0,0,0,0)'); g.fillStyle = b; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.fillStyle = 'rgba(255,240,225,0.05)'; g.beginPath(); for (let i = 0; i < 5200; i++) g.rect(R.r(0, W), R.r(0, H), 1.6, 1.6); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); for (let i = 0; i < 5200; i++) g.rect(R.r(0, W), R.r(0, H), 1.8, 1.8); g.fill();
  return (SGL_WALL.$stone = c);
}
function sglWall(key, o = {}) {
  let c = SGL_WALL[key];
  if (!c) {
    c = SGL_WALL[key] = sglCanvas(W, H); const g = c.getContext('2d'); g.drawImage(sglStone(), 0, 0); g.lineJoin = 'round';
    if (o.floor != null) {   // the floor: big flags running away from the wall
      const fy = o.floor, R = RNG('sglfloor', key);
      let m = g.createLinearGradient(0, fy, 0, fy + 420); m.addColorStop(0, 'rgba(255,236,214,0.06)'); m.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = m; g.fillRect(0, fy, W, H - fy);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, fy - 3, W, 5); g.fillStyle = 'rgba(255,238,215,0.07)'; g.fillRect(0, fy + 2, W, 2);
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3; g.beginPath();
      for (const dy of [96, 250, 470]) { g.moveTo(0, fy + dy); g.lineTo(W, fy + dy); }
      for (let x = -400; x < W + 400; x += 250) { const x1 = W / 2 + (x + R.n(30) - W / 2) * 2.3; g.moveTo(x, fy); g.lineTo(x1, H); }
      g.stroke();
    }
    for (const P of o.open || []) {   // a moulded opening: an outer roll, a lighter chamfer, a deep rebate
      sglPath(g, P); g.strokeStyle = '#0a090c'; g.lineWidth = 58; g.stroke();
      sglPath(g, P); g.strokeStyle = '#231f29'; g.lineWidth = 46; g.stroke();
      g.save(); g.translate(-2.5, -2.5); sglPath(g, P); g.strokeStyle = 'rgba(255,236,214,0.09)'; g.lineWidth = 44; g.stroke(); g.restore();
      sglPath(g, P); g.strokeStyle = '#2f2a37'; g.lineWidth = 30; g.stroke();
      sglPath(g, P); g.strokeStyle = '#17141b'; g.lineWidth = 20; g.stroke();
      sglPath(g, P); g.fillStyle = '#040306'; g.fill(); g.strokeStyle = '#040306'; g.lineWidth = 9; g.stroke();
    }
    if (o.sill) {   // a stone sill under the window
      const [x0, x1, y] = o.sill;
      g.fillStyle = '#060508'; g.fillRect(x0 + 6, y + 30, x1 - x0 - 12, 9); g.fillStyle = '#2b2731'; g.fillRect(x0, y, x1 - x0, 30);
      g.fillStyle = 'rgba(255,236,214,0.13)'; g.fillRect(x0, y, x1 - x0, 3); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x0, y + 19, x1 - x0, 11);
    }
  }
  ctx.drawImage(c, 0, 0);
}
const sglAmbient = (x, y, r, c, k = 1) => sglHalo(x, y, r, c, 0.2 * clamp(k));
function sglVignette() {
  if (SGL_WALL.$vig) return SGL_WALL.$vig;
  const c = sglCanvas(W, H), g = c.getContext('2d'), v = g.createRadialGradient(W / 2, H * 0.44, H * 0.3, W / 2, H * 0.5, H * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  return (SGL_WALL.$vig = c);
}
// dust in the light: fixed specks that only twinkle. k = how much light there is
function sglMotes(x0, y0, x1, y1, n, key, k = 1, c = SGL.glow) {
  if (k <= 0.02) return;
  const R = RNG('sglmote', key);
  for (let i = 0; i < n; i++) {
    const x = R.r(x0, x1), y = R.r(y0, y1), s = R.r(4, 9), a = Math.max(0, Math.sin(TT * R.r(2.2, 4.6) + R.r(0, TAU))) ** 3 * k;
    if (a > 0.04) { ctx.globalAlpha = a; star4(x, y, s, c); }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
//  ready-made pieces of a window (each returns panes, to go into a sglGlaze build list)
// ---------------------------------------------------------------------
// a round rosette / sun / medallion: a centre disc and rings of n sectors. o: n (8), rings ([0.34, 0.7, 1] of r),
//   c ([centre, ring 1, ring 2...]; a ring's colour may be a list that alternates), rot, id. Pane .ring = its ring.
function sglRosette(x, y, r, o = {}) {
  const n = o.n ?? 8, rings = o.rings ?? [0.34, 0.7, 1], cols = o.c ?? [SGL.amber, [SGL.ruby, SGL.amber], SGL.straw], rot = o.rot ?? -Math.PI / 2, polys = [], cs = [], rg = [];
  polys.push(sglCirclePts(x, y, r * rings[0], 28)); cs.push(cols[0]); rg.push(0);
  for (let j = 1; j < rings.length; j++) for (let k = 0; k < n; k++) {
    const a0 = rot + (k + (j % 2 ? 0 : 0.5)) / n * TAU, c = cols[Math.min(j, cols.length - 1)];
    polys.push(sglSectorPts(x, y, r * rings[j - 1], r * rings[j], a0, a0 + TAU / n)); cs.push(Array.isArray(c) ? c[k % c.length] : c); rg.push(j);
  }
  return sglPanes(polys, (i) => cs[i], o.id ?? 'rose').map((p, i) => ({ ...p, ring: rg[i] }));
}
// flames / petals standing on a circle: n pointed panes from r0 out to r1. o: c (colour or list), rot, id, fat (0..1 of the gap)
function sglFlames(x, y, r0, r1, n = 12, o = {}) {
  const rot = o.rot ?? -Math.PI / 2, hw = Math.PI / n * (o.fat ?? 0.8), polys = [];
  for (let k = 0; k < n; k++) { const a = rot + k / n * TAU, P = []; for (let i = 0; i <= 4; i++) { const t = a - hw + 2 * hw * i / 4; P.push([x + Math.cos(t) * r0, y + Math.sin(t) * r0]); } P.push([x + Math.cos(a) * r1, y + Math.sin(a) * r1]); polys.push(P); }
  return sglPanes(polys, o.c ?? [SGL.amber, SGL.ruby], o.id ?? 'flame');
}
// a geometric star of n points: one pane, or kites meeting at the centre when r >= o.split (64). o: n (8), inner (0.46), rot, c, c2, id
function sglStar(x, y, r, o = {}) {
  const n = o.n ?? 8, k = o.inner ?? 0.46, rot = o.rot ?? -Math.PI / 2, pt = (a, rr) => [x + Math.cos(a) * rr, y + Math.sin(a) * rr], polys = [];
  if (r < (o.split ?? 64)) { const P = []; for (let i = 0; i < n; i++) { P.push(pt(rot + i / n * TAU, r), pt(rot + (i + 0.5) / n * TAU, r * k)); } polys.push(P); }
  else for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; polys.push([[x, y], pt(a - Math.PI / n, r * k), pt(a, r), pt(a + Math.PI / n, r * k)]); }
  return sglPanes(polys, [o.c ?? SGL.straw, o.c2 ?? o.c ?? SGL.amber], o.id ?? 'star');
}
// a crescent moon cut into n panes along its curve; it opens to the right before o.rot. o: n (4), rot, c, id, d, r2 (the bite)
function sglCrescent(x, y, r, o = {}) {
  const n = o.n ?? 4, d = r * (o.d ?? 0.42), r2 = r * (o.r2 ?? 0.82), rot = o.rot ?? 0, xi = (r * r - r2 * r2 + d * d) / (2 * d), phi = Math.acos(clamp(xi / r, -1, 1)), psi = Math.atan2(r * Math.sin(phi), r * Math.cos(phi) - d);
  const O = (t) => { const a = phi + t * (TAU - 2 * phi); return [r * Math.cos(a), r * Math.sin(a)]; }, I = (t) => { const a = psi + t * (TAU - 2 * psi); return [d + r2 * Math.cos(a), r2 * Math.sin(a)]; }, polys = [];
  for (let k = 0; k < n; k++) {
    const P = [], m = 7;
    for (let i = 0; i <= m; i++) P.push(O((k + i / m) / n));
    for (let i = m; i >= 0; i--) P.push(I((k + i / m) / n));
    polys.push(xform(sglClean(P), x, y, rot));
  }
  return sglPanes(polys, o.c ?? SGL.straw, o.id ?? 'crescent');
}
// a small mosque: a body of three panes (the middle one a lit door), an onion dome cut in four with a gold finial,
// and a minaret. (x, base) = the middle of the body's foot. o: s, c (walls), dome, door, id, side (-1: minaret on the left)
function sglMosque(x, base, o = {}) {
  const s = o.s ?? 1, c = o.c ?? SGL.cloud, dome = o.dome ?? SGL.turquoise, door = o.door ?? SGL.amber, id = o.id ?? 'mosque', sd = o.side ?? 1, bw = 65 * s, bh = 66 * s, top = base - bh, out = [];
  const mx = x + sd * 92 * s, mw = 16 * s;   // the minaret: two lengths of shaft and a cap
  out.push(...sglPanes([[[mx - mw, base], [mx - mw, base - 78 * s], [mx + mw, base - 78 * s], [mx + mw, base]], [[mx - mw, base - 78 * s], [mx - mw, base - 150 * s], [mx + mw, base - 150 * s], [mx + mw, base - 78 * s]]], c, id));
  out.push(...sglPanes([[[mx - mw - 5 * s, base - 150 * s], [mx, base - 190 * s], [mx + mw + 5 * s, base - 150 * s]]], dome, id));
  const D = [], R = 46 * s, hd = 72 * s;   // the onion dome
  for (let i = 0; i <= 20; i++) { const t = i / 20, hw = R * (1 + 1.6 * t) * (1 - t) ** 0.8; D.push([x - hw, top - hd * t]); }
  for (let i = 19; i >= 0; i--) { const t = i / 20, hw = R * (1 + 1.6 * t) * (1 - t) ** 0.8; D.push([x + hw, top - hd * t]); }
  out.push(...sglPanes(sglFan(D, x, top + 4 * s, 8, { a0: Math.PI }), [dome, sglTone(dome, 0.22)], id));
  out.push(...sglPanes([sglCirclePts(x, top - hd - 9 * s, 11 * s, 14)], door, id));
  out.push(...sglPanes([[[x - bw, base], [x - bw, top], [x - bw * 0.36, top], [x - bw * 0.36, base]], [[x + bw * 0.36, base], [x + bw * 0.36, top], [x + bw, top], [x + bw, base]]], c, id));
  const dr = [[x - bw * 0.36, base], [x - bw * 0.36, top + 22 * s]]; for (let i = 1; i < 8; i++) { const a = Math.PI + Math.PI * i / 8; dr.push([x + Math.cos(a) * bw * 0.36, top + 22 * s + Math.sin(a) * 20 * s]); } dr.push([x + bw * 0.36, top + 22 * s], [x + bw * 0.36, base]);
  out.push(...sglPanes([[[x - bw * 0.36, top], [x + bw * 0.36, top], [x + bw * 0.36, base], [x - bw * 0.36, base]]], c, id), ...sglPanes([dr], door, id, { door: true }));
  return out.map((p, i) => ({ ...p, i, n: out.length }));
}
// a cloud: three bumps on a flat base, cut into o.n panes. (x, y) = its middle, w = its width
function sglCloud(x, y, w, o = {}) {
  const cs = [[x - 0.27 * w, y + 0.02 * w, 0.2 * w], [x + 0.02 * w, y - 0.08 * w, 0.27 * w], [x + 0.29 * w, y + 0.03 * w, 0.19 * w]], base = y + 0.16 * w, P = [[x - 0.47 * w, base]];
  for (let i = 0; i <= 44; i++) { const px = x - 0.47 * w + 0.95 * w * i / 44; let py = base; for (const [cx, cy, r] of cs) if (Math.abs(px - cx) < r) py = Math.min(py, cy - Math.sqrt(r * r - (px - cx) ** 2)); P.push([px, py]); }
  P.push([x + 0.48 * w, base]);
  return sglPanes(sglCut(sglClean(P), { n: o.n ?? 2, key: o.key ?? 'cloud' + Math.round(x), slant: 0.35, angle: Math.PI / 2, min: 500 }), o.c ?? SGL.cloud, o.id ?? 'cloud');
}
// a tulip: a stem, two leaves and a bloom of three petals. (x, base) = the foot of the stem. o: s, c (bloom), leaf, id
function sglFlower(x, base, o = {}) {
  const s = o.s ?? 1, c = o.c ?? SGL.ruby, lf = o.leaf ?? SGL.emerald, id = o.id ?? 'flower', h = 150 * s, ty = base - h;
  const lens = (x0, y0, x1, y1, f, f2 = f * 0.25) => { const P = [], nx = -(y1 - y0), ny = x1 - x0; for (let i = 0; i <= 8; i++) { const t = i / 8, b = Math.sin(Math.PI * t) ** 0.8 * f; P.push([lerp(x0, x1, t) + nx * b, lerp(y0, y1, t) + ny * b]); } for (let i = 7; i >= 1; i--) { const t = i / 8, b = Math.sin(Math.PI * t) ** 0.8 * f2; P.push([lerp(x0, x1, t) - nx * b, lerp(y0, y1, t) - ny * b]); } return P; };
  const petal = (a, len, f) => lens(x, ty + 12 * s, x + Math.sin(a) * len, ty + 12 * s - Math.cos(a) * len, f, f);
  const out = [
    ...sglPanes([lens(x, base - 14 * s, x - 62 * s, base - 78 * s, 0.26), lens(x + 62 * s, base - 92 * s, x, base - 20 * s, 0.26)], lf, id),
    ...sglPanes([[[x - 10 * s, base], [x - 10 * s, ty + 8 * s], [x + 10 * s, ty + 8 * s], [x + 10 * s, base]]], sglTone(lf, -0.15), id),
    ...sglPanes([petal(-0.5, 70 * s, 0.24), petal(0.5, 70 * s, 0.24)], sglTone(c, -0.12), id, { bloom: true }), ...sglPanes([petal(0, 84 * s, 0.26)], c, id, { bloom: true }),
  ];
  return out.map((p, i) => ({ ...p, i, n: out.length }));
}

// ---------------------------------------------------------------------
//  things that stand in the room (each has its own small glazing)
// ---------------------------------------------------------------------
// a leaded lantern: (x, base) = the middle of its foot; it is ~195 s tall. o: lit (0..1), c, c2 (glass), hang (a chain this long)
function sglLantern(x, base, s = 1, o = {}) {
  const c = o.c ?? SGL.amber, c2 = o.c2 ?? SGL.ruby, G = sglGlaze('sgl-lantern' + c + c2, () => {
    const body = [[-30, -150], [30, -150], [44, -34], [-44, -34]], low = sglClipHalf(body, 0, -120, 0, 1);
    return [...sglPanes([sglClipHalf(body, 0, -120, 0, -1)], SGL.turquoise, 'cap'), ...sglPanes([sglClipHalf(low, -15, 0, -1, 0), sglClipHalf(sglClipHalf(low, -15, 0, 1, 0), 15, 0, -1, 0), sglClipHalf(low, 15, 0, 1, 0)], [c, c2, c], 'glass')];
  }, { lead: 7 });
  const k = clamp(o.lit ?? 1) * (0.8 + 0.2 * RNG('sglflick', x, B).f());
  sglHalo(x, base + 2, 150 * s, c, 0.34 * k, 26 * s);   // its pool of light on the floor
  sglHalo(x, base - 92 * s, 210 * s, c, 0.3 * k);
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
  const metal = (P) => { sglPath(ctx, P); ctx.fillStyle = '#1b181d'; ctx.fill(); ctx.strokeStyle = '#08070a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.strokeStyle = 'rgba(255,236,214,0.2)'; ctx.lineWidth = 2; ctx.stroke(); };
  if (o.hang) { ctx.strokeStyle = '#08070a'; ctx.lineWidth = 4; ctx.setLineDash([9, 5]); ctx.beginPath(); ctx.moveTo(0, -200); ctx.lineTo(0, -200 - o.hang / s); ctx.stroke(); ctx.setLineDash([]); }
  metal([[-56, -9], [56, -9], [56, 0], [-56, 0]]); metal([[-50, -34], [50, -34], [56, -9], [-56, -9]]);
  metal([[-38, -150], [-15, -184], [15, -184], [38, -150]]); metal(sglCirclePts(0, -193, 9, 14));
  sglDraw(G, k, { shimmer: 0.5 });
  ctx.restore();
}
// THE HERO: a small leaded dove of eight panes (two tail feathers, back, breast, head, beak, two wing feathers). Faceless.
//   (x, y) its middle, r half its size. o: wing (0 raised | 1 lowered), lit (0..1), flip (face left),
//   mood ('sleep' dark glass | 'smile' | 'wow' a flare and glints), key. It never slides: move it in steps and swap the wing.
function sglHeroGlaze(wing) {
  return sglGlaze('sgl-dove' + wing, () => {
    const body = ellipsePts(0, 14, 56, 36, -0.2, 30), w = SGL.milk, t = '#dbe7f1';
    return [
      ...sglPanes([[[-38, 2], [-100, -22], [-104, 10], [-46, 22]], [[-46, 22], [-104, 10], [-96, 44], [-40, 38]]], t, 'tail', { vary: 0.05 }),
      ...sglPanes([[[70, -36], [100, -24], [71, -14]]], SGL.amber, 'beak'),
      ...sglPanes([sglClipHalf(body, 2, 0, -0.92, 0.38), sglClipHalf(body, 2, 0, 0.92, -0.38)], [sglTone(w, -0.07), w], 'body', { vary: 0.04 }),
      ...sglPanes([sglCirclePts(52, -26, 23, 18)], w, 'head', { vary: 0.03 }),
      ...sglPanes(wing ? [[[16, -8], [-18, -32], [-52, -28], [-30, 12], [4, 22]], [[-52, -28], [-80, -38], [-72, -6], [-30, 12]]]
        : [[[14, -8], [6, -58], [-14, -98], [-36, -62], [-24, -4]], [[-24, -4], [-36, -62], [-66, -82], [-70, -42], [-46, 0]]], [w, t], 'wing', { vary: 0.05 }),
    ];
  }, { lead: 7 });
}
function sglHero(x, y, r, o = {}) {
  const mood = o.mood ?? 'smile', lit = clamp(o.lit ?? (mood === 'sleep' ? 0.06 : 1)), s = r / 100, wow = mood === 'wow';
  sglHalo(x, y, r * (wow ? 2.5 : 1.9), SGL.white, lit * (wow ? 0.34 : 0.2) * (0.9 + 0.1 * Math.sin(TT * 6)));
  sglDraw(sglHeroGlaze(o.wing ? 1 : 0), lit, { x, y, s, flip: o.flip, shimmer: 0.4, dim: 0.82 });
  if (wow && lit > 0.5) [[-1.15, -0.75, 13], [1.2, -0.95, 16], [1.3, 0.55, 11], [-1.25, 0.5, 10]].forEach(([dx, dy, sz], i) => { if ((B + i) % 3) star4(x + dx * r, y + dy * r, sz * s * (1 + 0.3 * ((B + i) % 2)), SGL.white); });
  SPARK_AT = toScreen(x, y);
}
// the dove's outline, for hero-to-hero bridges
function sglHeroPts(x, y, r) {
  const s = r / 100;
  return [[100, -24], [70, -46], [52, -50], [30, -42], [8, -60], [-14, -98], [-40, -72], [-66, -82], [-70, -42], [-100, -22], [-104, 10], [-96, 44], [-40, 40], [-10, 50], [30, 44], [54, 22], [62, 0], [72, -14]].map(([px, py]) => [x + px * s, y + py * s]);
}

// ---------------------------------------------------------------------
//  type: a bold roman serif that glows on the dark stone. Letters light one after another (o.reveal 0..1);
//  an unlit letter is still there, as dark glass.   o: align, reveal, glow (colour), al, track (em), weight
// ---------------------------------------------------------------------
const sglFont = (size, weight = 700) => { ctx.font = `${weight} ${size}px ${SGL_SERIF}`; };
function sglTextW(str, size, track = 0) { ctx.save(); sglFont(size); const w = ctx.measureText(str).width + track * size * Math.max(0, str.length - 1); ctx.restore(); return w; }
function sglText(str, x, y, size, c, o = {}) {
  ctx.save(); sglFont(size, o.weight); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const tr = (o.track ?? 0) * size, n = str.length, w = ctx.measureText(str).width + tr * Math.max(0, n - 1), x0 = x - (o.align === 'center' ? w / 2 : o.align === 'right' ? w : 0);
  const shown = clamp(o.reveal ?? 1) * n, glow = o.glow ?? SGL.amber, al = o.al ?? 1;
  for (let i = 0; i < n; i++) {
    const ch = str[i]; if (ch === ' ') continue;
    const k = clamp(shown - i), px = x0 + ctx.measureText(str.slice(0, i)).width + tr * i;
    if (k < 1) { ctx.globalAlpha = al * 0.22; ctx.fillStyle = c; ctx.fillText(ch, px, y); }
    if (k > 0) {
      ctx.strokeStyle = glow; ctx.globalAlpha = al * k * 0.09; ctx.lineWidth = size * 0.4; ctx.strokeText(ch, px, y);
      ctx.globalAlpha = al * k * 0.15; ctx.lineWidth = size * 0.18; ctx.strokeText(ch, px, y);
      ctx.globalAlpha = al * k; ctx.fillStyle = c; ctx.fillText(ch, px, y);
    }
  }
  ctx.restore(); return w;
}
// a dark opaque plaque with a lead edge and a thin gold rule
function sglPlaque(x, y, w, h, al = 1, rule = SGL.gold) {
  ctx.save(); ctx.globalAlpha = al; ctx.lineJoin = 'round';
  sglPath(ctx, rrectPts(x, y, w, h, 10, 5)); ctx.fillStyle = '#0b0a0e'; ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,236,214,0.07)'); g.addColorStop(0.5, 'rgba(255,236,214,0)'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#040305'; ctx.lineWidth = 6; ctx.stroke();
  sglPath(ctx, rrectPts(x + 11, y + 11, w - 22, h - 22, 5, 4)); ctx.strokeStyle = rule; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = rule; for (const px of [x + 11, x + w - 11]) { ctx.beginPath(); ctx.moveTo(px - 7, y + h / 2); ctx.lineTo(px, y + h / 2 - 7); ctx.lineTo(px + 7, y + h / 2); ctx.lineTo(px, y + h / 2 + 7); ctx.fill(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  captions and tags (through DEFER: after the camera, at screen size). Both are opaque plaques drawn last, so
//  nothing shows through them. They go dark as a bridge starts and light again when the next era is open.
// ---------------------------------------------------------------------
function sglBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.2);
    if (TT >= r.tc && TT < r.tc + d + 0.2) return seg(TT, r.tc + d - 0.1, r.tc + d + 0.2);
  }
  return 1;
}
//   'words *highlight* words'.  o: y (plaque centre, 1394), x (CX), size (60), at (seconds after the era starts, 0.4), hi, col
function sglCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.4), a = sglBridgeK() * ev(at, 0.25); if (a <= 0.02) return;
  const size = o.size ?? 60, cx = o.x ?? CX, cy = o.y ?? 1394, hi = o.hi ?? SGL.amber, col = o.col ?? SGL.white;
  const toks = str.split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  toks.forEach((t, i) => { t.w = sglTextW(t.s, size); t.gap = i === 0 ? 0 : /^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.27; });
  const tw = toks.reduce((s, t) => s + t.w + t.gap, 0), w = tw + size * 1.7, h = size * 1.9;
  sglPlaque(cx - w / 2, cy - h / 2, w, h, a);
  let xx = cx - tw / 2, k = 0;
  for (const t of toks) {
    xx += t.gap;
    sglText(t.s, xx, cy + size * 0.33, size, t.hi ? hi : col, { reveal: ev(at + 0.2 + k * 0.03, Math.max(0.1, t.s.length * 0.03)), glow: t.hi ? hi : SGL.glow, al: a });
    xx += t.w; k += t.s.length;
  }
}
//   o: x (70, the left edge), y (300, the centre), size (44), at (0.2), c
function sglTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.2), a = sglBridgeK() * ev(at, 0.25); if (a <= 0.02) return;
  const size = o.size ?? 44, c = o.c ?? SGL.amber, S = str.toUpperCase(), tw = sglTextW(S, size, 0.14), w = tw + size * 2.5, h = size * 1.8, x = o.x ?? 70, cy = o.y ?? 300;
  sglPlaque(x, cy - h / 2, w, h, a);
  const sx = x + size * 0.95, lit = ev(at + 0.1, 0.25);
  ctx.save(); ctx.globalAlpha = a; sglHalo(sx, cy, size * 0.8, c, 0.4 * lit);
  sglPath(ctx, sglStar(sx, cy, size * 0.36, { split: 1e9 })[0].P); ctx.fillStyle = sglMix(sglTone(c, -0.7), c, lit); ctx.fill(); ctx.restore();
  sglText(S, x + size * 1.6, cy + size * 0.35, size, c, { reveal: ev(at + 0.15, 0.3), glow: c, al: a, track: 0.14 });
}
const sglCaption = (str, o = {}) => { const f = () => sglCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const sglTag = (str, o = {}) => { const f = () => sglTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'stained-glass',
  paper: SGL.paper,
  // the bare stone wall, warmed or cooled a little by colour c (hex, or rgb() mid-morph)
  backdrop(c) {
    ctx.save(); screen(); ctx.drawImage(sglStone(), 0, 0); ctx.globalAlpha = 0.2; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  // the era seen through a leaded opening: a ring of came in the wall, glowing in the bridge colour, closing on the object
  window(P, key, src, o = {}) {
    ctx.save(); sglPath(ctx, P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const u = o.u ?? 0, k = o.phase === 'grow' ? 1 - u : u, wd = lerp(30, 12, k);
    ctx.save(); ctx.lineJoin = 'round';
    sglPath(ctx, P); ctx.strokeStyle = sglA(o.c ?? SGL.amber, 0.14); ctx.lineWidth = wd + 46; ctx.stroke(); ctx.strokeStyle = sglA(o.c ?? SGL.amber, 0.2); ctx.lineWidth = wd + 18; ctx.stroke();
    ctx.strokeStyle = SGL.lead; ctx.lineWidth = wd; ctx.stroke();
    ctx.translate(-wd * 0.16, -wd * 0.16); sglPath(ctx, P); ctx.strokeStyle = sglA(SGL.leadHi, 0.5); ctx.lineWidth = Math.max(1.5, wd * 0.14); ctx.stroke(); ctx.restore();
  },
  // the morphing shape: one leaded roundel of glass, eight panes round a boss, flaring white-hot as its colour turns
  blob(P, c, key, u = 0) {
    const n = P.length, ce = P.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]), fl = Math.sin(Math.PI * clamp(u)), cc = sglMix(c, '#fff1c4', 0.72 * fl);
    let rad = 1; for (const q of P) rad = Math.max(rad, Math.hypot(q[0] - ce[0], q[1] - ce[1]));
    sglHalo(ce[0], ce[1], rad * (2.1 + 0.7 * fl), cc, 0.34 + 0.2 * fl);
    sglHalo(ce[0], ce[1] + rad * 3.6, rad * 2.6, cc, 0.16 + 0.12 * fl, rad * 0.5);          // its colour on the floor
    const R = RNG('sglblob', key), In = P.map(([x, y]) => [ce[0] + (x - ce[0]) * 0.4, ce[1] + (y - ce[1]) * 0.4]);
    ctx.save(); sglPath(ctx, P); ctx.clip();
    const g = ctx.createRadialGradient(ce[0], ce[1], 0, ce[0], ce[1], rad * 1.03); g.addColorStop(0, sglTone(cc, 0.62)); g.addColorStop(0.42, sglTone(cc, 0.16)); g.addColorStop(1, sglTone(cc, -0.4));
    ctx.fillStyle = g; ctx.fillRect(ce[0] - rad, ce[1] - rad, 2 * rad, 2 * rad);
    ctx.lineCap = 'round';
    for (let k = 0; k < 16; k++) {   // streaks (seeded by the key: they do not crawl)
      const a = 0.5 + R.n(0.2), d = R.n(rad), l = rad * R.r(0.3, 1.1), x = ce[0] - Math.sin(a) * d, y = ce[1] + Math.cos(a) * d;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.strokeStyle = R.f() < 0.55 ? 'rgba(255,246,220,0.13)' : 'rgba(4,3,12,0.11)'; ctx.lineWidth = R.r(1.5, 6); ctx.stroke();
    }
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(4,3,12,0.14)'; for (const w of [34, 20]) { sglPath(ctx, P); ctx.lineWidth = w; ctx.stroke(); }
    ctx.restore();
    const lead = () => { ctx.beginPath(); for (let k = 0; k < 8; k++) { const i = Math.round(k * n / 8) % n; ctx.moveTo(In[i][0], In[i][1]); ctx.lineTo(P[i][0], P[i][1]); } ctx.stroke(); sglPath(ctx, In); ctx.stroke(); };
    ctx.save(); ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = SGL.lead; ctx.lineWidth = 9; lead(); sglPath(ctx, P); ctx.lineWidth = 13; ctx.stroke();
    ctx.translate(-1.6, -1.6); ctx.strokeStyle = sglA(SGL.leadHi, 0.4); ctx.lineWidth = 1.5; lead(); sglPath(ctx, P); ctx.stroke(); ctx.translate(1.6, 1.6);
    for (let k = 0; k < 8; k++) for (const Q of [In, P]) { const q = Q[Math.round(k * n / 8) % n]; ctx.beginPath(); ctx.arc(q[0], q[1], 5.6, 0, TAU); ctx.fillStyle = SGL.solder; ctx.fill(); ctx.beginPath(); ctx.arc(q[0] - 1.6, q[1] - 1.6, 2, 0, TAU); ctx.fillStyle = sglA(SGL.leadHi, 0.75); ctx.fill(); }
    ctx.restore();
  },
  hero(x, y, r, o = {}) { sglHero(x, y, r * 0.9, { mood: o.mood, wing: B % 4 < 2 ? 0 : 1 }); },
  heroColor: SGL.milk,
  heroPts(x, y, r) { return sglHeroPts(x, y, r * 0.9); },
  // the dark room closes in round the frame
  post() { ctx.save(); screen(); ctx.drawImage(sglVignette(), 0, 0); ctx.restore(); },
  ones: true,
};
