// =====================================================================
//  styles/chalkboard/kit.js — chalk drawings and handwriting on a classroom chalkboard.
//  On top of kit/core.js (RNG, resample, subPath, trace, bbox, toScreen, fillAll, screen, TT/ev/popS/DEFER/E0/SPARK_AT).
//  Every helper here is prefixed `ch` (never a core name). Needs from the piece head: HAND (a hand font stack), CX.
//
//  THE BOARD   deep green-black slate, built once from a seeded RNG and cached: fine grain, cloudy smudges of earlier
//              erasing, faint ghosts of old lessons, a wooden chalk ledge below the safe area. It moves with the camera.
//  THE CHALK   a stroke is not a line: it is a soft body whose width follows the pressure, plus hundreds of seeded
//              grain marks dragged along the stroke and loose dust at its edge, on a wobbly path. Pressure varies
//              along the stroke and drops out in places, so lines thin and break. Grain reseeds on the boil (B);
//              where the stroke goes (its structure and pressure map) is keyed and never moves.
//  THE TEXT    local hand fonts, rendered once per string into a cached canvas, then knocked through a chalk-grain mask
//              (destination-out) that reseeds on the boil; letters write on left to right.
//  THE COLOURS white chalk draws everything; yellow / blue / green chalk are for emphasis; pink is the hero's.
// =====================================================================
const CH = {
  board: '#1f3a32', boardD: '#16291f', boardL: '#2a4a40',
  white: '#f1efe4', dim: '#c9cfc4',
  yellow: '#f3d977', pink: '#f2a7b6', blue: '#9cd0ee', green: '#b8e2a4', orange: '#f2b27a',
  wood: '#7a5233', woodL: '#9c6c45', woodD: '#4d321e', felt: '#8e8f8a',
};
const CH_FONT = (size, weight = 700) => `${weight} ${size}px ${HAND}`;

// ---------------------------------------------------------------------
//  THE HAND: wobble that boils (index-based, so the tremor travels along the stroke)
// ---------------------------------------------------------------------
function chWob(P, key, amp) {
  const R = RNG('chw', key, B), p1 = R.r(0, TAU), p2 = R.r(0, TAU), f1 = 0.22 + R.f() * 0.2, f2 = 0.8 + R.f() * 0.5;
  const n = P.length, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let nx = a[1] - b[1], ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const o = amp * (0.62 * Math.sin(i * f1 + p1) + 0.38 * Math.sin(i * f2 + p2));
    out[i] = [P[i][0] + nx * o, P[i][1] + ny * o];
  }
  return out;
}
const chClose = (P) => [...P, P[0]];
// where the chalk tip is after writing `frac` of a path
const chTip = (P, frac) => { const Q = subPath(resample(P, false, 10), clamp(frac)); return Q[Q.length - 1]; };

// ---------------------------------------------------------------------
//  THE CHALK STROKE
//  chLine(P, o) o: w (width), col, a (alpha), key, frac (write-on 0..1), amp (wobble), step, closed,
//                 dens (speckle density x), press (pressure 0..1, lower = drier, thinner, more broken), under (body alpha; 0 = grain only)
//  Returns the wobbled, written-on polyline (or null).
// ---------------------------------------------------------------------
function chLine(P, o = {}) {
  const { w = 7, col = CH.white, a = 1, key = 'cl', frac = 1, amp = 1.6, step = 10, dens = 1, press = 1 } = o;
  let Q = resample(o.closed ? chClose(P) : P, false, step);
  Q = chWob(Q, key, amp);
  if (frac < 1) { if (frac <= 0) return null; Q = subPath(Q, frac); if (Q.length < 2) return null; }
  const S = resample(Q, false, Math.max(1.5, w * 0.3)), n = S.length;
  const K = RNG('chk', key), f1 = K.r(0.008, 0.02), f2 = K.r(0.03, 0.07), q1 = K.r(0, TAU), q2 = K.r(0, TAU), gapAt = K.r(0, 1);
  const R = RNG('chg', key, B), m = ctx.getTransform(), hw = w * 0.55, under = o.under ?? 0.2;
  const per = Math.max(2, Math.round(w * 0.8 * dens)), fat = Math.min(1.5, Math.max(0.8, w / 8));
  // the three layers of a chalk stroke: a soft body whose WIDTH follows the pressure (it thins and breaks where the
  // stick skips), grain marks dragged along the stroke (fine and coarse), and loose dust just outside the edge
  const body = new Path2D(), fine = new Path2D(), coarse = new Path2D(), dust = new Path2D();
  let Lp = [], Rp = [], s = 0;
  const flushBody = () => {
    if (Lp.length > 1) { body.moveTo(Lp[0][0], Lp[0][1]); for (let i = 1; i < Lp.length; i++) body.lineTo(Lp[i][0], Lp[i][1]); for (let i = Rp.length - 1; i >= 0; i--) body.lineTo(Rp[i][0], Rp[i][1]); body.closePath(); }
    Lp = []; Rp = [];
  };
  for (let i = 0; i < n; i++) {
    const p = S[i], pa = S[Math.max(0, i - 1)], pb = S[Math.min(n - 1, i + 1)];
    if (i) s += dist(S[i - 1], p);
    // cull off-screen samples (big window outlines)
    const sx = m.a * p[0] + m.c * p[1] + m.e, sy = m.b * p[0] + m.d * p[1] + m.f;
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) { flushBody(); continue; }
    let tx = pb[0] - pa[0], ty = pb[1] - pa[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    // pressure: slow swell, a dry drop-out now and then, a taper at both ends (static: keyed, never reseeds)
    const u = n > 1 ? i / (n - 1) : 0;
    let pr = press * (0.78 + 0.22 * Math.sin(s * f1 + q1) + 0.14 * Math.sin(s * f2 + q2));
    const g = mod(s * 0.0055 + gapAt, 1); if (g < 0.09) pr *= 0.2 + g * 7;
    pr *= Math.min(1, 0.45 + u * 9, 0.45 + (1 - u) * 9);
    const wf = clamp(0.3 + 0.75 * pr, 0.3, 1.08), hv = hw * wf;
    if (under > 0) {
      if (pr < 0.3) flushBody();
      else { const hb = w * 0.4 * wf * (1 + R.n(0.1)); Lp.push([p[0] + nx * hb, p[1] + ny * hb]); Rp.push([p[0] - nx * hb, p[1] - ny * hb]); }
    }
    for (let j = 0; j < per; j++) {
      const v = (R.f() + R.f() - 1) * hv, keep = pr * (0.95 - 0.6 * Math.abs(v) / hv);
      if (R.f() > keep) continue;
      const L = 0.6 + R.f() * R.f() * (2.2 + w * 0.32), x = p[0] + nx * v + R.n(0.6), y = p[1] + ny * v + R.n(0.6), q = R.f() < 0.4 ? coarse : fine;
      q.moveTo(x - tx * L, y - ty * L); q.lineTo(x + tx * L, y + ty * L);
    }
    if (R.f() < 0.3 * pr) { const v = (R.f() < 0.5 ? -1 : 1) * hv * (1.05 + R.f() * 0.9); dust.rect(p[0] + nx * v, p[1] + ny * v, 1 + R.f() * 0.9, 1 + R.f() * 0.9); }
  }
  flushBody();
  ctx.save(); ctx.lineCap = 'butt'; ctx.fillStyle = col; ctx.strokeStyle = col;
  const A0 = ctx.globalAlpha * a;
  if (under > 0) { ctx.globalAlpha = A0 * under; ctx.fill(body, 'nonzero'); }
  ctx.globalAlpha = A0 * 0.82; ctx.lineWidth = 1.5 * fat; ctx.stroke(fine);
  ctx.lineWidth = 2.6 * fat; ctx.stroke(coarse);
  ctx.globalAlpha = A0 * 0.4; ctx.fill(dust);
  ctx.restore();
  return Q;
}

// a loose chalk scribble fill: hatching chords across the shape that overshoot the outline a little (no flat paint).
// o: col, ang, gap, w, a, part (write-on), key, base (faint dust wash under it), over (overshoot px)
function chFill(P, col, o = {}) {
  const { ang = -0.55, gap = 16, a = 0.8, part = 1, key = 'cf', base = 0.07, over = 8 } = o, w = o.w ?? gap * 1.12;
  if (part <= 0) return;
  const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 2;
  const ca = Math.cos(ang), sa = Math.sin(ang), K = RNG('cfs', key), Z = [];
  const Pc = chClose(P);
  for (let d = -rad, row = 0; d <= rad; d += gap, row++) {
    // chord of the row line (direction (ca, sa), offset d along the normal) through the outline
    const dd = d + K.n(gap * 0.3), ox = cx - sa * dd, oy = cy + ca * dd; let t0 = 1e9, t1 = -1e9;
    for (let i = 0; i < Pc.length - 1; i++) {
      const [x1, y1] = Pc[i], [x2, y2] = Pc[i + 1];
      const ex = x2 - x1, ey = y2 - y1, den = ca * ey - sa * ex; if (Math.abs(den) < 1e-9) continue;
      const qx = x1 - ox, qy = y1 - oy, tt = (qx * ey - qy * ex) / den, uu = (qx * sa - qy * ca) / den;
      if (uu >= 0 && uu <= 1) { if (tt < t0) t0 = tt; if (tt > t1) t1 = tt; }
    }
    if (t1 - t0 < 4) continue;
    const e0 = t0 - over * K.f(), e1 = t1 + over * K.f(), A = [ox + ca * e0, oy + sa * e0], Bp = [ox + ca * e1, oy + sa * e1];
    if (row % 2) Z.push(Bp, A); else Z.push(A, Bp);
  }
  if (Z.length < 2) return;
  if (base > 0) {   // the rubbed-in dust wash: only where the scribble has already been (it follows the write-on front)
    ctx.save();
    if (part < 1) {   // the tip of the very polyline chLine writes below
      const Qz = subPath(chWob(resample(Z, false, 18), key + 'z', 2.2), part), q = Qz[Qz.length - 1];
      const df = (q[0] - cx) * -sa + (q[1] - cy) * ca - gap * 0.3, far = rad + over + 40;
      const pt = (t, d) => [cx + ca * t - sa * d, cy + sa * t + ca * d];
      ctx.beginPath(); [pt(-far, -far), pt(far, -far), pt(far, df), pt(-far, df)].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    }
    ctx.globalAlpha *= base; ctx.fillStyle = col; trace(chWob(resample(P, true, 14), key + 'b', 2), true); ctx.fill(); ctx.restore();
  }
  chLine(Z, { w, col, a, key: key + 'z', frac: part, amp: 2.2, step: 18, dens: o.dens ?? 0.7, press: o.press ?? 0.86, under: o.under ?? 0.17 });
}

// ---------------------------------------------------------------------
//  THE TEXT: hand font, cached per string, knocked through a boiling chalk-grain mask
// ---------------------------------------------------------------------
const CH_TXT = new Map();
let CH_GRAIN = null;
function chGrainTex() {   // a tile of holes: specks and short drag marks at mixed strength (static, seeded)
  if (CH_GRAIN) return CH_GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), R = RNG('chgrain');
  for (const [al, n, s0, s1] of [[0.95, 1500, 1, 2.8], [0.6, 2000, 1, 2.2], [0.35, 2200, 1, 3.4]]) {
    g.fillStyle = `rgba(0,0,0,${al})`; g.beginPath();
    for (let i = 0; i < n; i++) g.rect(R.r(0, 160), R.r(0, 160), R.r(s0, s1), R.r(s0, s1) * 0.7);
    g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1.3; g.beginPath();
  for (let i = 0; i < 220; i++) { const x = R.r(0, 160), y = R.r(0, 160), l = R.r(3, 9), a = -0.35 + R.n(0.25); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
  g.stroke();
  return (CH_GRAIN = c);
}
function chTextEntry(str, size, col, weight) {
  const k = [str, size, col, weight].join('|'); let e = CH_TXT.get(k); if (e) return e;
  const m = document.createElement('canvas').getContext('2d'); m.font = CH_FONT(size, weight);
  const xs = []; for (let i = 0; i <= str.length; i++) xs.push(m.measureText(str.slice(0, i)).width);
  const pad = Math.ceil(size * 0.35), wT = xs[str.length];
  const base = document.createElement('canvas'); base.width = Math.ceil(wT + pad * 2); base.height = Math.ceil(size * 1.6 + pad);
  const g = base.getContext('2d'); g.font = CH_FONT(size, weight); g.textBaseline = 'alphabetic'; g.fillStyle = col; g.strokeStyle = col;
  g.lineWidth = size * 0.035; g.lineJoin = 'round';
  const by = Math.round(size * 1.12 + pad * 0.3);
  g.fillText(str, pad, by); g.strokeText(str, pad, by);
  const scratch = document.createElement('canvas'); scratch.width = base.width; scratch.height = base.height;
  e = { base, scratch, xs, pad, by, w: wT }; CH_TXT.set(k, e); return e;
}
// o: col, align ('left'|'center'|'right'), frac (letters write on), key, a, weight, rot. Returns [x0, x1].
function chText(str, x, y, size, o = {}) {
  const { col = CH.white, align = 'left', frac = 1, key = str, a = 1, weight = 700, rot = 0 } = o;
  const e = chTextEntry(str, size, col, weight), x0 = align === 'center' ? x - e.w / 2 : align === 'right' ? x - e.w : x;
  if (frac <= 0) return [x0, x0 + e.w];
  const R = RNG('cht', key, B), g = e.scratch.getContext('2d');
  g.globalCompositeOperation = 'copy'; g.drawImage(e.base, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  const pat = g.createPattern(chGrainTex(), 'repeat'); g.save(); g.translate(R.r(0, 160), R.r(0, 160)); g.fillStyle = pat; g.fillRect(-160, -160, e.scratch.width + 320, e.scratch.height + 320); g.restore();
  g.globalCompositeOperation = 'source-over';
  // write-on: whole letters up to frac, the next one partly
  const n = str.length, shown = clamp(frac) * n, i = Math.floor(shown), part = shown - i;
  const xr = frac >= 1 ? e.w + e.pad : e.xs[Math.min(i, n)] + (i < n ? (e.xs[i + 1] - e.xs[i]) * part : 0);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y);
  ctx.beginPath(); ctx.rect(x0 - e.pad, y - e.by - 4, xr + e.pad, e.scratch.height + 8); ctx.clip();
  const ox = x0 - e.pad + R.n(0.6), oy = y - e.by + R.n(0.6);
  ctx.globalAlpha *= a * 0.35; ctx.drawImage(e.scratch, ox + 1.6, oy + 1.2);   // a dusty second edge
  ctx.globalAlpha /= 0.35; ctx.drawImage(e.scratch, ox, oy);
  ctx.restore();
  return [x0, x0 + e.w];
}
const chTextW = (str, size, weight = 700) => chTextEntry(str, size, CH.white, weight).w;

// ---------------------------------------------------------------------
//  EMPHASIS MARKS (all write on with frac)
// ---------------------------------------------------------------------
function chUnderline(x0, x1, y, o = {}) {
  const P = [[x0 - 8, y + 2], [lerp(x0, x1, 0.5), y + (o.bow ?? 5)], [x1 + 12, y - 4]];
  const Q = chLine(P, { w: o.w ?? 7, col: o.col ?? CH.yellow, key: o.key ?? 'ul' + x0, frac: o.frac ?? 1, amp: 1.8 });
  if (o.double) chLine([[x0 + 10, y + 16], [x1 - 6, y + 13]], { w: (o.w ?? 7) * 0.8, col: o.col ?? CH.yellow, key: (o.key ?? 'ul') + '2', frac: seg(o.frac ?? 1, 0.5, 1) });
  return Q;
}
// a hand loop that runs past its start and drifts outward
function chLoopPts(cx, cy, rx, ry, over = 0.12, a0 = -2.4) {
  const N = Math.max(28, Math.ceil((rx + ry) * 0.3)), P = [];
  for (let i = 0; i <= N; i++) { const u = i / N, an = a0 + u * TAU * (1 + over), s = 1 + 0.06 * u; P.push([cx + Math.cos(an) * rx * s, cy + Math.sin(an) * ry * s]); }
  return P;
}
function chCircle(cx, cy, rx, ry, o = {}) {
  return chLine(chLoopPts(cx, cy, rx, ry, o.over ?? 0.12, o.a0 ?? -2.4), { w: o.w ?? 6, col: o.col ?? CH.yellow, key: o.key ?? 'cc' + cx, frac: o.frac ?? 1, amp: 2.4, step: 12 });
}
// an arrow along P; its two head strokes flick in at the end
function chArrow(P, o = {}) {
  const { col = CH.white, w = 6, key = 'arw', frac = 1 } = o;
  chLine(P, { w, col, key, frac: seg(frac, 0, 0.8), amp: 1.4 });
  if (frac > 0.8) {
    const Q = resample(P, false, 6), e = Q[Q.length - 1], q = Q[Math.max(0, Q.length - 5)], an = Math.atan2(e[1] - q[1], e[0] - q[0]), hk = seg(frac, 0.8, 1), L = o.head ?? 34;
    for (const s of [-1, 1]) chLine([e, [e[0] - Math.cos(an + s * 0.5) * L * hk, e[1] - Math.sin(an + s * 0.5) * L * hk]], { w, col, key: key + s, amp: 0.5, step: 6 });
  }
}
function chStar(x, y, r, o = {}) {   // a five-point star in one stroke
  const P = []; for (let i = 0; i <= 5; i++) { const an = -Math.PI / 2 + i * TAU * 2 / 5 + (o.rot ?? 0); P.push([x + Math.cos(an) * r, y + Math.sin(an) * r]); }
  return chLine(P, { w: o.w ?? 5, col: o.col ?? CH.yellow, key: o.key ?? 'star' + x, frac: o.frac ?? 1, amp: 0.8, step: 8 });
}
function chTick(x, y, s, o = {}) {
  return chLine([[x - 28 * s, y], [x - 8 * s, y + 24 * s], [x + 36 * s, y - 30 * s]], { w: o.w ?? 9 * s, col: o.col ?? CH.green, key: o.key ?? 'tick' + x, frac: o.frac ?? 1, amp: 1, step: 7 });
}
function chCross(x, y, s, o = {}) {
  const f = o.frac ?? 1, col = o.col ?? CH.pink, w = o.w ?? 8 * s, k = o.key ?? 'x' + x;
  chLine([[x - 26 * s, y - 26 * s], [x + 26 * s, y + 26 * s]], { w, col, key: k + 'a', frac: seg(f, 0, 0.5), step: 7 });
  chLine([[x + 26 * s, y - 26 * s], [x - 26 * s, y + 26 * s]], { w, col, key: k + 'b', frac: seg(f, 0.5, 1), step: 7 });
}
function chTwinkle(x, y, r, o = {}) {   // a four-tick sparkle that pulses on 2s
  const k = 0.75 + 0.25 * ((B + (o.ph ?? 0)) % 3) / 2, col = o.col ?? CH.yellow;
  for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; chLine([[x + Math.cos(an) * r * 0.25, y + Math.sin(an) * r * 0.25], [x + Math.cos(an) * r * k, y + Math.sin(an) * r * k]], { w: o.w ?? 4, col, key: (o.key ?? 'tw' + x) + i, amp: 0.4, step: 6 }); }
}

// ---------------------------------------------------------------------
//  LESSON PROPS (frac writes each one on; keys seed structure, B drives the grain)
// ---------------------------------------------------------------------
function chNumberLine(x0, x1, y, n, o = {}) {
  const f = o.frac ?? 1, col = o.col ?? CH.white, key = o.key ?? 'nl';
  chArrow([[x0, y], [x1, y]], { col, w: 5, key, frac: seg(f, 0, 0.5), head: 26 });
  for (let i = 0; i < n; i++) {
    const k = seg(f, 0.4 + i / n * 0.5, 0.45 + i / n * 0.5); if (k <= 0) continue;
    const x = lerp(x0 + 30, x1 - 50, n > 1 ? i / (n - 1) : 0);
    chLine([[x, y - 16], [x, y + 16]], { w: 4, col, key: key + 't' + i, frac: k, step: 5 });
    if (o.labels !== false) chText(String((o.start ?? 0) + i), x, y + 62, o.size ?? 40, { align: 'center', col, frac: k, key: key + 'n' + i });
  }
}
function chAxes(x, y, w, h, o = {}) {   // origin at (x, y): x axis to the right, y axis up; o.curve(u) 0..1 -> 0..1 plots a curve
  const f = o.frac ?? 1, col = o.col ?? CH.white, key = o.key ?? 'ax';
  chArrow([[x, y], [x + w, y]], { col, w: 5, key: key + 'x', frac: seg(f, 0, 0.35), head: 24 });
  chArrow([[x, y], [x, y - h]], { col, w: 5, key: key + 'y', frac: seg(f, 0.1, 0.45), head: 24 });
  if (o.curve) { const P = []; for (let i = 0; i <= 32; i++) { const u = i / 32; P.push([x + 14 + u * (w - 60), y - 14 - o.curve(u) * (h - 60)]); } chLine(P, { col: o.curveCol ?? CH.yellow, w: 6, key: key + 'c', frac: seg(f, 0.45, 1), amp: 1 }); }
}
function chBox(x, y, w, h, o = {}) {   // a diagram box drawn in one go, corners overshooting; o.label centred inside
  const f = o.frac ?? 1, P = [[x + 4, y], [x + w + 6, y - 2], [x + w, y + h + 4], [x - 3, y + h], [x + 2, y - 8]];
  if (o.fill) chFill(P.slice(0, 4), o.fill, { key: (o.key ?? 'box') + 'f', part: seg(f, 0.6, 1), gap: 16, a: 0.55 });
  chLine(P, { col: o.col ?? CH.white, w: o.w ?? 6, key: o.key ?? 'box' + x, frac: seg(f, 0, 0.7), amp: 1.4 });
  if (o.label) chText(o.label, x + w / 2, y + h / 2 + (o.size ?? 44) * 0.35, o.size ?? 44, { align: 'center', col: o.labelCol ?? CH.white, frac: seg(f, 0.6, 1), key: (o.key ?? 'box') + 'l' });
}
function chSun(x, y, r, o = {}) {   // a yellow chalk sun: scribble, outline, rays that write on and turn slowly
  const f = o.frac ?? 1, key = o.key ?? 'sun', P = ellipsePts(x, y, r, r, 0, 48), nR = o.rays ?? 12;
  chFill(P, CH.yellow, { key: key + 'f', part: seg(f, 0.35, 0.75), gap: 15, a: 0.7, base: 0.12 });
  chLine(chLoopPts(x, y, r, r, 0.08), { col: CH.yellow, w: 11, key: key + 'o', frac: seg(f, 0, 0.4), amp: 1.8 });
  for (let i = 0; i < nR; i++) {
    const an = i / nR * TAU + (o.turn ?? 0), r0 = r * 1.2, r1 = r * (1.5 + 0.08 * ((B + i) % 2));
    chLine([[x + Math.cos(an) * r0, y + Math.sin(an) * r0], [x + Math.cos(an) * r1, y + Math.sin(an) * r1]], { col: CH.yellow, w: 9, key: key + 'r' + i, frac: seg(f, 0.7 + i / nR * 0.2, 0.8 + i / nR * 0.2), amp: 0.6, step: 8 });
  }
  return P;
}
function chEarth(x, y, r, o = {}) {   // a blue scribble globe, green land scribbles, white outline
  const f = o.frac ?? 1, key = o.key ?? 'earth', P = ellipsePts(x, y, r, r, 0, 48);
  chFill(P, CH.blue, { key: key + 'f', part: seg(f, 0.3, 0.7), gap: 14, a: 0.65, base: 0.12, ang: -0.4 });
  const lands = [[[-0.55, -0.45], [-0.1, -0.62], [0.05, -0.3], [-0.2, 0.05], [-0.45, 0.1], [-0.7, -0.15]], [[0.15, 0.05], [0.55, -0.1], [0.62, 0.3], [0.35, 0.6], [0.1, 0.45]]];
  lands.forEach((L, i) => { const Q = L.map(([u, v]) => [x + u * r, y + v * r]); chFill(Q, CH.green, { key: key + 'l' + i, part: seg(f, 0.55, 0.9), gap: 11, a: 0.85, base: 0.18, ang: 0.7, over: 2 }); });
  chLine(chLoopPts(x, y, r, r, 0.06), { col: CH.white, w: 10, key: key + 'o', frac: seg(f, 0, 0.35), amp: 1.6 });
  return P;
}
function chBook(x, y, s, o = {}) {   // an open book
  const f = o.frac ?? 1, key = o.key ?? 'book', col = o.col ?? CH.white;
  const Lp = [[0, 0], [-60, -14], [-120, -4], [-120, 70], [-60, 62], [0, 76]].map(([u, v]) => [x + u * s, y + v * s]);
  const Rp = Lp.map(([u, v]) => [2 * x - u, v]);
  chLine(Lp, { col, w: 5, key: key + 'l', frac: seg(f, 0, 0.5), amp: 1 }); chLine(Rp, { col, w: 5, key: key + 'r', frac: seg(f, 0.2, 0.7), amp: 1 });
  chLine([[x, y], [x, y + 76 * s]], { col, w: 5, key: key + 's', frac: seg(f, 0.5, 0.7), step: 6 });
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) chLine([[x + sd * 20 * s, y + (16 + i * 16) * s], [x + sd * 98 * s, y + (12 + i * 16) * s]], { col: CH.dim, w: 3, key: key + 'ln' + i + sd, frac: seg(f, 0.7 + i * 0.08, 0.8 + i * 0.08), amp: 0.5, step: 8, press: 0.7 });
}
function chBulb(x, y, s, o = {}) {   // an idea lightbulb; o.lit adds yellow fill and rays
  const f = o.frac ?? 1, key = o.key ?? 'bulb', r = 60 * s, P = [];
  for (let i = 0; i <= 30; i++) { const an = Math.PI / 2 + 0.62 - i / 30 * (TAU - 1.24); P.push([x + Math.cos(an) * r, y + Math.sin(an) * r]); }
  P.push([x - 0.36 * r, y + 1.15 * r], [x - 0.34 * r, y + 1.5 * r], [x + 0.34 * r, y + 1.5 * r], [x + 0.36 * r, y + 1.15 * r]);
  if (o.lit) chFill(P, CH.yellow, { key: key + 'f', part: o.lit, gap: 13, a: 0.7, base: 0.15 });
  chLine(P, { col: CH.white, w: 6, key: key + 'o', frac: seg(f, 0, 0.8), closed: true, amp: 1.2 });
  for (let i = 0; i < 2; i++) chLine([[x - 0.34 * r, y + (1.27 + i * 0.12) * r], [x + 0.34 * r, y + (1.25 + i * 0.12) * r]], { w: 4, key: key + 's' + i, frac: seg(f, 0.8 + i * 0.1, 0.9 + i * 0.1), step: 6 });
  if (o.lit) for (let i = 0; i < 7; i++) { const an = -Math.PI / 2 + (i - 3) * 0.42, k = o.lit; chLine([[x + Math.cos(an) * r * 1.3, y + Math.sin(an) * r * 1.3], [x + Math.cos(an) * r * (1.3 + 0.45 * k), y + Math.sin(an) * r * (1.3 + 0.45 * k)]], { col: CH.yellow, w: 5, key: key + 'r' + i, step: 6 }); }
  return P;
}
// a felt board eraser prop (wooden back, grey felt, dusty): centre (x, y), angle ang
function chEraser(x, y, ang = 0, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.roundRect(-84, -30, 176, 74, 12); ctx.fill();
  ctx.fillStyle = CH.felt; ctx.beginPath(); ctx.roundRect(-88, 6, 176, 26, 6); ctx.fill();
  ctx.fillStyle = CH.wood; ctx.beginPath(); ctx.roundRect(-90, -38, 180, 48, 14); ctx.fill();
  ctx.fillStyle = CH.woodL; ctx.beginPath(); ctx.roundRect(-82, -34, 164, 14, 7); ctx.fill();
  ctx.strokeStyle = CH.woodD; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-70 + i * 6, -8 + i * 4); ctx.bezierCurveTo(-20, -14 + i * 4, 30, -2 + i * 4, 72, -10 + i * 4); } ctx.stroke();
  const R = RNG('erd', B); ctx.fillStyle = 'rgba(240,238,228,0.55)'; ctx.beginPath();
  for (let i = 0; i < 160; i++) ctx.rect(R.r(-86, 86), R.r(8, 32), R.r(1, 3), R.r(1, 2.4));
  ctx.fill(); ctx.restore();
}
// a stick of chalk prop (tip at (x, y), body along ang)
function chStick(x, y, ang, s = 1, col = CH.white) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(96, -11); ctx.quadraticCurveTo(104, 0, 96, 11); ctx.lineTo(0, 7); ctx.quadraticCurveTo(-6, 0, 0, -7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(2, 2, 94, 7);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  THE ERASER WIPE: a swipe along `path` (world coords), `width` wide, wiped up to frac. Whatever was drawn under the
//  band goes back to board, the band keeps streaks of smeared dust, and the eraser rides the front.
//  Call it AFTER drawing what it erases. o: key, tool (false hides the eraser), dust (0..1)
// ---------------------------------------------------------------------
// what an eraser leaves behind: feathered streaks of smeared dust along `path` (up to frac of it), hw to each side.
// Streak positions are keyed to the whole path, so the smear does not crawl while the swipe advances.
function chSmear(path, frac, hw, key = 'smear', dust = 1) {
  if (frac <= 0 || dust <= 0) return;
  const Q = resample(path, false, 10), n = Q.length, K = RNG('wps', key), nS = Math.round(clamp(hw / 4, 8, 16));
  const side = (i, off) => { const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [Q[i][0] - (b[1] - a[1]) / l * off, Q[i][1] + (b[0] - a[0]) / l * off]; };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = CH.white; const A0 = ctx.globalAlpha;
  for (let k = 0; k < nS; k++) {
    const off = (K.f() + K.f() - 1) * hw * 0.85, u0 = K.r(-0.1, 0.5), u1 = Math.min(frac, u0 + K.r(0.3, 0.9)), wd = 3 + K.f() * K.f() * hw * 0.3, al = (0.02 + K.f() * 0.045) * dust, dry = k % 4 === 0;
    const i0 = Math.max(0, Math.round(u0 * (n - 1))), i1 = Math.round(u1 * (n - 1)); if (i1 - i0 < 2) continue;
    const Pk = []; for (let i = i0; i <= i1; i++) Pk.push(side(i, off + 3 * Math.sin(i * 0.5 + k)));
    ctx.globalAlpha = A0 * al; ctx.lineWidth = wd; trace(Pk, false); ctx.stroke();
    if (dry) { ctx.globalAlpha = A0; chLine(Pk, { w: clamp(hw * 0.45, 12, 34), a: 0.16 * dust, key: key + 'd' + k, press: 0.34, dens: 0.22, under: 0, amp: 0, step: 14 }); }
  }
  ctx.restore();
}
function chWipe(path, width, frac, o = {}) {
  if (frac <= 0) return;
  const key = o.key ?? 'wipe', Q0 = resample(path, false, 8), Q = frac >= 1 ? Q0 : subPath(Q0, frac);
  if (Q.length < 2) return;
  const L = [], Rr = [], n = Q.length, hw = width / 2;
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    const jl = hw * (1 + 0.1 * Math.sin(i * 0.9 + hash(key) % 7) + 0.07 * Math.sin(i * 3.1)), jr = hw * (1 + 0.1 * Math.sin(i * 1.3 + 1) + 0.07 * Math.sin(i * 2.7));
    L.push([Q[i][0] + nx * jl, Q[i][1] + ny * jl]); Rr.push([Q[i][0] - nx * jr, Q[i][1] - ny * jr]);
  }
  ctx.save();
  const band = new Path2D(); band.moveTo(L[0][0], L[0][1]); for (const p of L) band.lineTo(p[0], p[1]); for (let i = n - 1; i >= 0; i--) band.lineTo(Rr[i][0], Rr[i][1]); band.closePath();
  ctx.clip(band, 'nonzero');
  chBoard();
  chSmear(Q0, frac, hw, key, o.dust ?? 1);
  ctx.restore();
  if (o.tool !== false && frac < 1) {
    const e = Q[n - 1], q = Q[Math.max(0, n - 4)];
    chEraser(e[0], e[1], Math.atan2(e[1] - q[1], e[0] - q[0]) + Math.PI / 2 + Math.sin(B * 1.3) * 0.05, width / 180);
    // dust puffs off the eraser's trailing side
    const R = RNG('wpd', key, B); ctx.save(); ctx.fillStyle = CH.white; ctx.globalAlpha = 0.5; ctx.beginPath();
    for (let i = 0; i < 40; i++) ctx.rect(e[0] + R.n(hw * 1.1), e[1] + R.n(hw * 0.9) + 12, R.r(1, 3), R.r(1, 3));
    ctx.fill(); ctx.restore();
  }
}

// ---------------------------------------------------------------------
//  THE BOARD (static overlay built once, seeded; the slate colour is filled under it so the backdrop can tint it)
// ---------------------------------------------------------------------
const CH_M = 140;
let CH_TEX = null;
function chBoardTex() {
  if (CH_TEX) return CH_TEX;
  const c = document.createElement('canvas'); c.width = W + 2 * CH_M; c.height = H + 2 * CH_M;
  const g = c.getContext('2d'), R = RNG('chboard'), PW = c.width, PH = c.height, ox = CH_M, oy = CH_M;
  // light falls on the middle of the board; the edges go darker
  const vg = g.createRadialGradient(PW / 2, PH * 0.42, 200, PW / 2, PH / 2, 1300);
  vg.addColorStop(0, 'rgba(255,255,255,0.035)'); vg.addColorStop(0.6, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = vg; g.fillRect(0, 0, PW, PH);
  // slate grain
  for (const [rgb, al, n] of [['0,0,0', 0.10, 26000], ['255,255,255', 0.025, 26000], ['255,255,255', 0.05, 6000]]) {
    g.fillStyle = `rgba(${rgb},${al})`; g.beginPath();
    for (let i = 0; i < n; i++) g.rect(R.r(0, PW), R.r(0, PH), 1 + R.f() * 1.5, 1 + R.f() * 1.5);
    g.fill();
  }
  // ghosts of old lessons (written, then wiped: barely there)
  g.fillStyle = 'rgba(241,239,228,0.05)'; g.textBaseline = 'alphabetic';
  for (const [s, x, y, sz, r] of [['a² + b² = c²', 470, 1600, 70, -0.04], ['12 × 4', 400, 1215, 64, 0.03], ['ABC', 110, 1640, 90, -0.06], ['x = 7', 700, 300, 60, 0.02], ['3/4', 840, 1730, 80, 0]]) {
    g.save(); g.translate(x + ox, y + oy); g.rotate(r); g.font = CH_FONT(sz); g.fillText(s, 0, 0); g.restore();
  }
  g.strokeStyle = 'rgba(241,239,228,0.04)'; g.lineWidth = 5; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const x = R.r(60, 1000) + ox, y = R.r(200, 1700) + oy, l = R.r(120, 300); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + R.n(40), x + l, y + R.n(20)); g.stroke(); }
  // smudge clouds: swirls of an eraser dragged through chalk dust
  for (let k = 0; k < 9; k++) {
    const cx = R.r(0, W) + ox, cy = R.r(150, H - 150) + oy, rx = R.r(150, 330), ry = R.r(60, 140), rot = R.n(0.5);
    g.save(); g.translate(cx, cy); g.rotate(rot); g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(230,236,226,${(0.008 + R.f() * 0.016).toFixed(3)})`; g.lineWidth = R.r(18, 60);
      const yy = R.n(ry), x0 = -rx * R.r(0.5, 1), x1 = rx * R.r(0.5, 1);
      g.beginPath(); g.moveTo(x0, yy); g.bezierCurveTo(x0 * 0.3, yy + R.n(ry * 0.7), x1 * 0.3, yy + R.n(ry * 0.7), x1, yy + R.n(ry * 0.3)); g.stroke();
    }
    g.restore();
  }
  // the chalk ledge (below the safe area): a wooden rail with a few chalk stubs and dust
  const ly = H - 92 + oy;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, ly - 14, PW, 14);
  g.fillStyle = CH.wood; g.fillRect(0, ly, PW, PH - ly);
  g.fillStyle = CH.woodL; g.fillRect(0, ly, PW, 9);
  g.strokeStyle = 'rgba(40,24,12,0.45)'; g.lineWidth = 1.5; g.beginPath();
  for (let i = 0; i < 14; i++) { const y = ly + 16 + i * 6 + R.n(2); g.moveTo(0, y); g.bezierCurveTo(PW * 0.3, y + R.n(6), PW * 0.6, y + R.n(6), PW, y + R.n(3)); }
  g.stroke();
  g.fillStyle = 'rgba(240,238,228,0.25)'; g.beginPath(); for (let i = 0; i < 1400; i++) g.rect(R.r(0, PW), ly + R.r(0, 10), R.r(1, 3), R.r(1, 2)); g.fill();
  for (const [x, col, l] of [[260, CH.white, 70], [330, CH.yellow, 46], [820, CH.pink, 58]]) {
    g.fillStyle = col; g.beginPath(); g.roundRect(x + ox, ly - 13, l, 14, 6); g.fill(); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x + ox + 2, ly - 5, l - 4, 5);
  }
  return (CH_TEX = c);
}
// the board in world coords (it is the world: it moves with the camera)
function chBoard(o = {}) {
  ctx.save(); ctx.fillStyle = o.fill ?? CH.board; ctx.fillRect(-CH_M, -CH_M, W + 2 * CH_M, H + 2 * CH_M);
  ctx.drawImage(chBoardTex(), -CH_M, -CH_M); ctx.restore();
}

// ---------------------------------------------------------------------
//  THE HERO: "Kapur", a stick of pink chalk with a worn top, white chalk outline, eyes and stick limbs.
//  o: key, mood ('calm' | 'wow' | 'happy'), look [dx, dy], arms [l, r] (radians up from horizontal; null = none),
//     sx, sy (squash), rot, legs. r = half its height. Sets SPARK_AT.
// ---------------------------------------------------------------------
function chHeroPts(x, y, r) {   // the body outline: a rounded stick, its top worn to a slant
  const w = r * 0.5, P = [[x - w, y - r * 0.7], [x - w * 0.55, y - r * 0.82], [x + w * 0.45, y - r * 0.99], [x + w, y - r * 0.9]];
  for (let i = 0; i <= 8; i++) { const an = i / 8 * Math.PI; P.push([x + Math.cos(an) * w, y + r * 0.8 + Math.sin(an) * w * 0.4]); }
  return P;
}
function chHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', mood = o.mood ?? 'calm', lw = Math.max(4, r * 0.07);
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.legs !== false) for (const s of [-1, 1]) {
    const st = (o.step ?? 0) * s;
    chLine([[s * r * 0.24, r * 0.9], [s * r * 0.3 + st * r * 0.15, r * 1.32]], { w: lw, key: key + 'leg' + s, amp: 0.6, step: 8 });
    chLine([[s * r * 0.3 + st * r * 0.15, r * 1.32], [s * r * 0.52 + st * r * 0.15, r * 1.34]], { w: lw, key: key + 'ft' + s, amp: 0.4, step: 6 });
  }
  if (o.arms) [-1, 1].forEach((s, i) => {
    const ang = o.arms[i]; if (ang == null) return;
    const sh = [s * r * 0.5, r * 0.05], L = r * 0.75;
    const el = [sh[0] + s * L * 0.55 * Math.cos(ang * 0.55), sh[1] - L * 0.55 * Math.sin(ang * 0.55)], hd = [sh[0] + s * L * Math.cos(ang), sh[1] - L * Math.sin(ang)];
    chLine([sh, el, hd], { w: lw, key: key + 'arm' + s, amp: 0.7, step: 8 });
  });
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  const body = chHeroPts(0, 0, r);
  chFill(body, CH.pink, { key: key + 'f', gap: Math.max(8, r * 0.12), a: 0.9, base: 0.3, ang: -0.9, over: 2, press: 0.95 });
  chLine(body, { closed: true, w: lw, key: key + 'o', amp: 1, step: 9, col: CH.white });
  // the worn top: a dusty powder smear
  chLine([[-r * 0.3, -r * 0.8], [r * 0.32, -r * 0.93]], { w: lw * 1.6, key: key + 'top', col: CH.white, a: 0.6, step: 6, press: 0.6 });
  // features are white chalk over a rubbed-dark patch, so the face reads on top of the scribble at phone size
  const feat = (Pf, wd, k) => {
    ctx.save(); ctx.strokeStyle = CH.boardD; ctx.globalAlpha *= 0.6; ctx.lineWidth = wd * 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; trace(Pf, false); ctx.stroke(); ctx.restore();
    chLine(Pf, { w: wd, key: k, step: 5, amp: 0.3 });
  };
  const [lx, ly] = o.look ?? [0, 0], blink = mood !== 'wow' && (B + hash(key)) % 31 === 0;
  for (const s of [-1, 1]) {
    const ex = s * r * 0.22 + lx * r * 0.05, ey = -r * 0.3 + ly * r * 0.06;
    if (blink) { feat([[ex - r * 0.12, ey], [ex + r * 0.12, ey]], lw * 0.9, key + 'bl' + s); continue; }
    if (mood === 'happy') { feat([[ex - r * 0.12, ey + r * 0.04], [ex - r * 0.05, ey - r * 0.06], [ex + r * 0.05, ey - r * 0.06], [ex + r * 0.12, ey + r * 0.04]], lw * 0.9, key + 'hp' + s); continue; }
    ctx.fillStyle = CH.white; ctx.globalAlpha = 0.96; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.15, r * (mood === 'wow' ? 0.2 : 0.17), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = CH.boardD; ctx.beginPath(); ctx.arc(ex + lx * r * 0.05, ey + ly * r * 0.06, r * 0.075, 0, TAU); ctx.fill();
  }
  const my = r * 0.1;
  if (mood === 'wow') { ctx.fillStyle = CH.boardD; ctx.beginPath(); ctx.ellipse(0, my + r * 0.04, r * 0.09, r * 0.11, 0, 0, TAU); ctx.fill(); chLine(ellipsePts(0, my + r * 0.04, r * 0.1, r * 0.12, 0, 14), { closed: true, w: lw * 0.6, key: key + 'mo', step: 4, amp: 0.3 }); }
  else feat(arcPts(0, my - r * 0.13, r * 0.22, Math.PI * 0.18, Math.PI * 0.82, 8), lw * 0.9, key + 'm');
  // blush
  ctx.fillStyle = CH.white; ctx.globalAlpha = 0.25; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.36, my - r * 0.04, r * 0.07, r * 0.04, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.restore();
  return body;
}

// ---------------------------------------------------------------------
//  CAPTIONS (DEFER: drawn after the camera, at screen size)
//  chTag(str)                       a lesson heading top left, written on at the era's start, with a white underline
//  chCaption(lines, mark, o)        1–2 chalk lines centred on CX; mark = [lineIndex, 'word', 'underline'|'circle', colour]
// ---------------------------------------------------------------------
// how far the current era's captions are wiped (0..1) while its picture is being erased down into a morph
function chErasing() {
  if (typeof BRIDGES === 'undefined') return 0;
  for (const r of BRIDGES) { const d = r.d ?? 0.6, m = r.m ?? (r.d != null ? r.d / 3 : 0.2); if (E0 < r.tc - 1e-6 && TT >= r.tc - d - 1e-6 && TT < r.tc) return seg(TT, r.tc - d, r.tc - m - 0.1); }
  return 0;
}
// draw() with its left part [xa, front] wiped away (er 0..1), a dust smear left where it was
function chErased(xa, xb, yc, hh, er, key, draw) {
  if (er <= 0) return draw();
  const x0 = xa - 24, x1 = xb + 30, front = lerp(x0, x1, er);
  if (er < 1) { ctx.save(); ctx.beginPath(); ctx.rect(front, yc - hh - 60, x1 - front + 200, 2 * hh + 120); ctx.clip(); draw(); ctx.restore(); }
  chSmear([[x0, yc + 3], [lerp(x0, x1, 0.5), yc - 3], [x1, yc + 2]], er, hh, key, 0.9);
}
function chTagDraw(str) {
  const size = 66, x = 84, y = 340, wT = chTextW(str, size);
  chErased(x, x + wT, y - 16, 44, seg(chErasing(), 0, 0.5), 'tage' + str, () => {
    const [x0, x1] = chText(str, x, y, size, { frac: ev(E0 + 0.1, 0.35), key: 'tag' + str, col: CH.white });
    chUnderline(x0, x1, y + 22, { col: CH.white, w: 5, key: 'tagu' + str, frac: ev(E0 + 0.45, 0.2), bow: 3 });
  });
}
function chCaptionDraw(lines, mark, o = {}) {
  const size = o.size ?? 78, y0 = o.y ?? 1330, lh = size * 1.18, t0 = E0 + (o.at ?? 0.35), kE = chErasing();
  lines.forEach((line, li) => {
    const y = y0 + li * lh, wT = chTextW(line, size), xl = CX - wT / 2;
    chErased(xl, xl + wT, y - size * 0.3, size * 0.6, seg(kE, 0.2 + li * 0.25, 0.7 + li * 0.25), 'cape' + li + line, () => {
      const [x0] = chText(line, CX, y, size, { align: 'center', frac: ev(t0 + li * 0.3, 0.45), key: 'cap' + li + line });
      if (mark && mark[0] === li) {
        const e = chTextEntry(line, size, CH.white, 700), k = line.indexOf(mark[1]); if (k < 0) return;
        const a = x0 + e.xs[k], b = x0 + e.xs[k + mark[1].length], f = ev(t0 + 0.55 + li * 0.3, 0.25), col = mark[3] ?? CH.yellow;
        if (mark[2] === 'circle') chCircle((a + b) / 2, y - size * 0.3, (b - a) / 2 + 22, size * 0.62, { col, frac: f, key: 'capc' + line });
        else chUnderline(a, b, y + 18, { col, frac: f, key: 'capu' + line });
      }
    });
  });
}
const chTag = (str) => { const f = () => chTagDraw(str); if (DEFER) DEFER.push(f); else f(); };
const chCaption = (lines, mark, o) => { const f = () => chCaptionDraw(lines, mark, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (kit/morph.js). A morph happens on the bare board.
// =====================================================================
const STYLE = {
  name: 'chalkboard',
  paper: CH.board,
  backdrop(c, o) {   // the slate tinted toward c, its old smudges kept; mid-transition a fresh erase swirl sits on it
    fillAll(c);
    ctx.save(); screen(); ctx.drawImage(chBoardTex(), -CH_M, -CH_M);
    if (o) {
      const K = RNG('bdsw'), al = o.phase === 'morph' ? 1 : o.phase === 'shrink' ? o.u : 1 - o.u;
      ctx.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        const y = 560 + K.r(0, 640), x0 = K.r(80, 300), x1 = K.r(760, 1000);
        ctx.strokeStyle = `rgba(232,238,228,${((0.015 + K.f() * 0.03) * al).toFixed(3)})`; ctx.lineWidth = K.r(20, 70);
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.bezierCurveTo(x0 + 200, y + K.n(90), x1 - 200, y + K.n(90), x1, y + K.n(40)); ctx.stroke();
      }
    }
    ctx.restore();
  },
  window(P, key, src, o = {}) {   // the old lesson erased down into the shape (eraser riding the rim), the new one opening out of it
    const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    // the wiped band just outside the rim: dusty smears that follow the outline
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 1; k <= 4; k++) {
      const s = 1 + 0.05 * k, Q = P.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s]);
      ctx.globalAlpha = 0.07 * (1 - k / 5); ctx.strokeStyle = CH.white; ctx.lineWidth = 18 + 10 * k;
      trace(chWob(resample(Q, true, 30), key + 'sm' + k, 6), true); ctx.stroke();
    }
    ctx.restore();
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    chLine(P, { closed: true, w: 8, col: CH.white, key: key + 'rim', step: 16, amp: 2 });
    if (o.phase === 'shrink') {   // the eraser works its way round the rim
      const Q = resample(chClose(P), false, 12), i = Math.floor(clamp(0.18 + o.u * 0.5) * (Q.length - 2)), e = Q[i], q = Q[i + 1];
      if (e[0] > -100 && e[0] < W + 100 && e[1] > -100 && e[1] < H + 100) chEraser(e[0], e[1], Math.atan2(q[1] - e[1], q[0] - e[0]), 0.8);
    }
  },
  blob(P, c, key) {   // the shape mid-morph: a chalk scribble in its colour inside a white chalk outline
    chFill(P, c, { key: key + 'f', gap: 15, a: 0.75, base: 0.12 });
    chLine(P, { closed: true, w: 10, col: CH.white, key: key + 'o', step: 12, amp: 1.8 });
  },
  hero(x, y, r, o = {}) { chHero(x, y, r * 0.8, o); },
  heroColor: '#f2a7b6',
  heroPts: (x, y, r) => chHeroPts(x, y, r * 0.8),
  post() {   // a few motes of chalk dust in the air, reseeded on the boil
    const R = RNG('chdust', B); ctx.save(); screen(); ctx.fillStyle = CH.white;
    ctx.globalAlpha = 0.10; ctx.beginPath(); for (let i = 0; i < 500; i++) ctx.rect(R.r(0, W), R.r(0, H), R.r(1, 2.2), R.r(1, 2.2)); ctx.fill();
    ctx.restore();
  },
  ones: false,
};
