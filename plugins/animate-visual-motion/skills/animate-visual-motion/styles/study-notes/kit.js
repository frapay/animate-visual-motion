// =====================================================================
//  styles/study-notes/kit.js — "aesthetic study notes": a ruled notebook page that writes itself. Ballpoint
//  handwriting, lettered headings, pastel highlighters, sticky notes, washi tape, index tabs and margin doodles.
//  On top of kit/core.js (RNG, resample, subPath, trace, pointAt, ellipsePts, rrectPts, arcPts, toScreen, fillAll,
//  screen, grain, TT / ev / E0 / DEFER / SPARK_AT, PORTRAIT). Every helper here is prefixed `sn`, every constant `SN`.
//  Needs from the piece head: CX (caption centre x). Optional, before the kit: `const SN_DOTS = true` (dot-grid page).
//
//  THE PAGE   desk + page + rules + margin + coil, built once per geometry from a seeded RNG and cached. The page is
//             the world: it moves with the camera, and every rule sits on snLineY(n) (pitch 84).
//  THE PENS   navy ballpoint = body writing; black fineliner = headings, boxes, doodles; pastel highlighters go
//             UNDER the writing (multiply), a beat after their word; coral-red = the hero and the one mark that matters.
//  TIME       every reveal takes an absolute start time t0 (cue it on a spoken word). Left out, the mark is just there.
//             Writing returns its pen-tip point, so the pencil hero can follow it (snPenAt -> snHero).
// =====================================================================
const SN = {
  paper: '#fbf9f3', rule: '#c9d8ea', margin: '#f0a3a3', desk: '#d9cfc0', deskD: '#c2b5a1', under: '#f0ece2',
  navy: '#22315c', ink: '#1c1c1c',
  yellow: '#fff27a', pink: '#ffc2d9', mint: '#b9f0d2', lilac: '#d9c9ff', sky: '#bfe3ff',
  coral: '#e8503f', coralD: '#b93a2c', coralL: '#f58a77',
  sticky: '#ffe873', card: '#fffdf8', wood: '#f3d6a6', metal: '#c3c7d0', metalD: '#7d8391', eraser: '#ffb3c7',
};
const SN_HAND = '"Bradley Hand", "Segoe Print", "Chalkboard SE", "Comic Sans MS", "Comic Neue", cursive';     // body writing
const SN_LETTER = '"Marker Felt", "Segoe Print", "Chalkboard SE", "Comic Sans MS", "Comic Neue", cursive';    // lettered headings
const SN_DOTGRID = typeof SN_DOTS !== 'undefined' && !!SN_DOTS;
const SN_PITCH = 84;

// ---------------------------------------------------------------------
//  THE PEN: polylines with a very slight boil (structure is seeded by key, only the tremor keys on B)
// ---------------------------------------------------------------------
function snWob(P, key, amp) {
  if (!amp) return P;
  const R = RNG('snw', key, B), p1 = R.r(0, TAU), p2 = R.r(0, TAU), f1 = 0.3 + R.f() * 0.25, f2 = 0.95 + R.f() * 0.5;
  const n = P.length, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let nx = a[1] - b[1], ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const k = amp * (0.62 * Math.sin(i * f1 + p1) + 0.38 * Math.sin(i * f2 + p2));
    out[i] = [P[i][0] + nx * k, P[i][1] + ny * k];
  }
  return out;
}
// the pen line. o: w, col, a, key, amp, part (draw-on 0..1), closed, step, double (a thin second pass). Returns the
// drawn points (the last one is the pen tip) or null when nothing shows yet.
function snLine(P, o = {}) {
  const { w = 4.5, col = SN.ink, a = 1, key = 'sl', amp = 1.0, part = 1, step = 10 } = o;
  if (part <= 0 || P.length < 2) return null;
  let Q = resample(o.closed ? [...P, P[0]] : P, false, step);
  if (part < 1) { Q = subPath(Q, part); if (Q.length < 2) return null; }
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w;
  trace(snWob(Q, key, amp), false); ctx.stroke();
  if (o.double) { ctx.globalAlpha *= 0.5; ctx.lineWidth = w * 0.45; trace(snWob(Q, key + '~', amp * 2.2), false); ctx.stroke(); }
  ctx.restore();
  return Q;
}
// a flat highlighter-colour fill under a doodle or box, laid slightly off the line (o.off), multiplied onto the paper
function snFill(P, col, o = {}) {
  const { a = 0.9, off = [5, 4], mult = true } = o;
  ctx.save(); if (mult) ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= a; ctx.fillStyle = col;
  ctx.translate(off[0], off[1]); trace(resample(P, true, 12), true); ctx.fill(); ctx.restore();
}
const snEnd = (Q, P) => (Q ? Q[Q.length - 1] : P[0]);
// the 3-step slap: a thing that lands on the page arrives a little big and its rotation settles over three 2-frame steps
function snSlap(t0, amt = 1) {
  const dt = TT - t0; if (dt < 0) return null;
  const st = Math.floor(dt * FPS / 2 + 1e-6);
  return { rot: ([0.13, -0.065, 0.03][st] ?? 0) * amt, sc: 1 + 0.2 * amt * (1 - clamp(dt / 0.13)) ** 2, al: clamp(0.45 + dt / 0.09) };
}

// ---------------------------------------------------------------------
//  LETTERING: local system fonts; words are placed one by one with a seeded baseline jitter and rotation, and the
//  line is uncovered left to right at a steady hand speed
// ---------------------------------------------------------------------
const SN_TW = new Map();   // static text measurements, keyed by font + string
const snFont = (size, face = 'hand', weight) => `${weight ?? 700} ${size}px ${face === 'letter' ? SN_LETTER : SN_HAND}`;
function snTW(str, font) {
  const k = font + '|' + str; let v = SN_TW.get(k); if (v != null) return v;
  ctx.save(); ctx.font = font; v = ctx.measureText(str).width; ctx.restore(); SN_TW.set(k, v); return v;
}
const snTextW = (str, size, face, weight) => { const f = snFont(size, face, weight); return str.split(' ').reduce((a, s) => a + snTW(s, f), 0) + (str.split(' ').length - 1) * (snTW('a a', f) - snTW('aa', f)); };
const snNorm = (s) => s.toLowerCase().replace(/[.,!?:;()"']/g, '');
// a highlighter sweep: a translucent band with rough ends, multiplied onto the paper, from x to x + w, centred on y.
// Draw it BEFORE the text it marks (snWrite's `hi` does that for you). t0 absent = fully there. Returns [x0, x1] or null.
function snHighlight(x, y, w, h, color, t0, o = {}) {
  const u = t0 == null ? 1 : EZ.o3(ev(t0, o.d ?? 0.3)); if (u <= 0) return null;
  const S = RNG('snhi', o.key ?? '', Math.round(x), Math.round(y)), xe = x + w * u, n = Math.max(2, Math.ceil((xe - x) / 26));
  const slope = S.n(h * 0.05), top = [], bot = [];
  for (let i = 0; i <= n; i++) { const k = i / n, xx = lerp(x, xe, k); top.push([xx, y - h / 2 + slope * (k - 0.5) + S.n(1.4)]); bot.push([xx, y + h / 2 + slope * (k - 0.5) + S.n(1.4)]); }
  const endR = [[xe + S.r(3, 9), y - h * 0.3], [xe + S.r(0, 5), y - h * 0.05], [xe + S.r(4, 10), y + h * 0.22]];
  const endL = [[x - S.r(3, 9), y + h * 0.25], [x - S.r(0, 5), y], [x - S.r(4, 9), y - h * 0.27]];
  const P = [...top, ...endR, ...bot.reverse(), ...endL];
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= o.a ?? 0.92; ctx.fillStyle = color;
  ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
  ctx.globalAlpha *= 0.3;                                                    // where two passes of the marker overlap
  ctx.fillRect(x + 2, y + h * 0.16 + slope * 0.2, Math.max(0, xe - x - 6), h * 0.2);
  ctx.restore();
  return [x, xe];
}
// handwriting that writes on. o: t0 (absolute start; absent = already written), speed (characters a second, 16) or
// t1 (finish exactly then), face ('hand' | 'letter'), weight, align ('left' | 'center' | 'right'), key, jit,
// hi: { word | phrase, color, t0, h } or a list of them (the band goes under the text, the text stays crisp).
// Returns { w, x0, x1, y, t0, t1, u, done, tip: [x, y] (the pen point now), start, end, a, b (baseline ends), words }.
function snWrite(str, x, y, size, color, o = {}) {
  const face = o.face ?? 'hand', font = snFont(size, face, o.weight), key = o.key ?? str, jit = o.jit ?? 1;
  const sp = snTW('a a', font) - snTW('aa', font);
  let pen = 0;
  const L = str.split(' ').map((s, i) => { const w = s ? snTW(s, font) : 0, r = { s, x: pen, w, i }; pen += w + sp; return r; });
  const total = Math.max(0, pen - sp), x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const t0 = o.t0 ?? -1e9, dur = o.t1 != null ? Math.max(0.04, o.t1 - t0) : Math.max(0.08, str.length / (o.speed ?? 16));
  const u = clamp((TT - t0) / dur), shown = u * total;
  for (const h of [].concat(o.hi ?? [])) {                                   // highlights first: under the writing
    if (!h) continue;
    const want = snNorm(h.word ?? h.phrase ?? '').split(' ').filter(Boolean); if (!want.length) continue;
    for (let i = 0; i + want.length <= L.length; i++) {
      if (!want.every((s, j) => snNorm(L[i + j].s) === s)) continue;
      const a = L[i], b = L[i + want.length - 1];
      snHighlight(x0 + a.x - size * 0.1, y - size * 0.3, b.x + b.w - a.x + size * 0.2, h.h ?? size * 0.95, h.color ?? SN.yellow, h.t0 ?? t0 + dur + 0.25, { key, d: h.d });
      break;
    }
  }
  if (u > 0) {
    const lw = o.stroke ?? (face === 'hand' ? size * 0.016 : 0);
    ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.globalAlpha *= o.al ?? 1;
    for (const wd of L) {
      if (!wd.s || shown <= wd.x) continue;
      const S = RNG('snwd', key, wd.i), R = RNG('snwb', key, wd.i, B);
      ctx.save(); ctx.translate(x0 + wd.x + wd.w / 2 + R.n(0.4), y + S.n(size * 0.035) * jit + R.n(0.4)); ctx.rotate(S.n(0.02) * jit);
      if (shown < wd.x + wd.w) { ctx.beginPath(); ctx.rect(-wd.w / 2 - size * 0.3, -size * 1.4, shown - wd.x + size * 0.3, size * 2.2); ctx.clip(); }
      ctx.fillText(wd.s, -wd.w / 2, 0); if (lw > 0) ctx.strokeText(wd.s, -wd.w / 2, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  const writing = u > 0 && u < 1;
  const tip = writing ? [x0 + shown, y - size * 0.26 + Math.sin(shown * 0.14) * size * 0.19] : u >= 1 ? [x0 + total + size * 0.12, y - size * 0.04] : [x0, y - size * 0.3];
  return { w: total, x0, x1: x0 + total, y, size, t0, t1: t0 + dur, u, done: u >= 1, tip, start: [x0, y - size * 0.3], end: [x0 + total + size * 0.12, y - size * 0.04], a: [x0, y], b: [x0 + total, y], words: L.map((d) => ({ s: d.s, x: x0 + d.x, w: d.w })) };
}

// ---------------------------------------------------------------------
//  THE PAGE (static: built once per geometry, seeded, cached; nothing carries between frames)
// ---------------------------------------------------------------------
const SN_M = 140;                 // the desk runs this far past the frame on every side (camera moves stay on it)
const SN_PAGES = new Map();
let SN_PG = null;                 // the current page's geometry (plain numbers, set by snPage / snGeom)
// geometry from the frame size. o: x, top, right (page edges), h (a taller page to pan down), line0, pitch, coil
function snGeom(o = {}) {
  const x = o.x ?? Math.round(W * 0.033), y = o.top ?? (PORTRAIT ? 150 : 70), right = o.right ?? W - 60;
  const w = right - x, h = o.h ?? H - 36 - y, pitch = o.pitch ?? SN_PITCH, line0 = o.line0 ?? y + 186, coil = o.coil ?? 'top';
  const marginX = x + (coil === 'top' || coil === 'none' ? 100 : 150), lines = [];
  for (let ly = line0; ly < y + h - 24; ly += pitch) lines.push(ly);
  return { x, y, w, h, pitch, line0, coil, marginX, left: marginX + 28, right: x + w - 80, lines, dots: o.dots ?? SN_DOTGRID };
}
function snPageTex(G) {
  const k = [W, H, G.x, G.y, G.w, G.h, G.pitch, G.line0, G.coil, G.dots].join('|');
  if (SN_PAGES.has(k)) return SN_PAGES.get(k);
  const c = document.createElement('canvas'); c.width = W + 2 * SN_M; c.height = Math.max(H, G.y + G.h + 36) + 2 * SN_M;
  const g = c.getContext('2d'), R = RNG('snpage', k), PW = c.width, PH = c.height;
  g.fillStyle = SN.desk; g.fillRect(0, 0, PW, PH);                           // the desk: a calm tone with a faint grain
  g.lineCap = 'round';
  for (let i = 0; i < 150; i++) { const yy = R.r(0, PH), xx = R.r(-200, PW), l = R.r(200, 900); g.strokeStyle = `rgba(120,96,64,${(0.03 + R.f() * 0.05).toFixed(3)})`; g.lineWidth = 1 + R.f() * 2; g.beginPath(); g.moveTo(xx, yy); g.bezierCurveTo(xx + l * 0.3, yy + R.n(6), xx + l * 0.7, yy + R.n(6), xx + l, yy + R.n(4)); g.stroke(); }
  g.fillStyle = 'rgba(90,70,45,0.05)'; g.beginPath(); for (let i = 0; i < 9000; i++) g.rect(R.r(0, PW), R.r(0, PH), 1.6, 1.6); g.fill();
  g.translate(SN_M, SN_M);
  const { x, y, w, h } = G, rr = (dx, dy) => { g.beginPath(); g.roundRect(x + dx, y + dy, w, h, 16); };
  g.save(); g.shadowColor = 'rgba(70,50,25,0.34)'; g.shadowBlur = 38; g.shadowOffsetX = 12; g.shadowOffsetY = 18; g.fillStyle = SN.under; rr(14, 12); g.fill(); g.restore();
  for (const [dx, dy] of [[14, 12], [7, 6]]) { rr(dx, dy); g.fillStyle = SN.under; g.fill(); g.strokeStyle = 'rgba(90,75,55,0.16)'; g.lineWidth = 1.5; g.stroke(); }   // the pages below
  rr(0, 0); g.fillStyle = SN.paper; g.fill();
  g.save(); rr(0, 0); g.clip();
  if (G.dots) {                                                              // dot-grid variant
    g.fillStyle = '#b4c4d9'; g.beginPath();
    for (let ly = G.line0 - G.pitch; ly < y + h; ly += G.pitch / 2) for (let lx = G.marginX + 28 - G.pitch; lx < x + w; lx += G.pitch / 2) { g.moveTo(lx + 2.4, ly); g.arc(lx, ly, 2.4, 0, TAU); }
    g.fill();
  } else {                                                                   // pale blue rules
    g.strokeStyle = SN.rule; g.lineWidth = 2.4; g.beginPath();
    for (const ly of G.lines) { g.moveTo(x, ly + 0.5); g.lineTo(x + w, ly + 0.5); }
    g.stroke();
  }
  g.strokeStyle = SN.margin; g.lineWidth = 2.6; g.beginPath(); g.moveTo(G.marginX, y); g.lineTo(G.marginX, y + h); g.stroke();   // the margin line
  for (const [rgb, al, n] of [['80,70,60', 0.03, 12000], ['255,255,255', 0.5, 9000]]) {   // paper grain
    g.fillStyle = `rgba(${rgb},${al})`; g.beginPath(); for (let i = 0; i < n; i++) g.rect(x + R.r(0, w), y + R.r(0, h), 1.5, 1.5); g.fill();
  }
  const eg = g.createLinearGradient(x + w - 60, 0, x + w, 0); eg.addColorStop(0, 'rgba(120,110,95,0)'); eg.addColorStop(1, 'rgba(120,110,95,0.07)');
  g.fillStyle = eg; g.fillRect(x + w - 60, y, 60, h);                        // the page rounds off toward its free edge
  g.restore();
  rr(0, 0); g.strokeStyle = 'rgba(90,75,55,0.22)'; g.lineWidth = 1.5; g.stroke();
  const hole = (hx, hy, rx, ry) => {                                         // a punched hole: the desk seen through, lit from the top left
    g.fillStyle = SN.deskD; g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(60,45,25,0.35)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(hx, hy, rx - 1, ry - 1, 0, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
  };
  const wire = (hx, hy, dx, dy) => {                                         // one loop of the coil, from its hole over the page edge
    const p = [[hx + 2 * dx - 3 * dy, hy + 2 * dy + 3 * dx], [hx + 44 * dx + 16 * dy, hy + 44 * dy - 16 * dx], [hx + 78 * dx - 12 * dy, hy + 78 * dy + 12 * dx], [hx + 82 * dx + 6 * dy, hy + 82 * dy - 6 * dx]];
    const st = (col, lw, ox = 0, oy = 0) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(p[0][0] + ox, p[0][1] + oy); g.bezierCurveTo(p[1][0] + ox, p[1][1] + oy, p[2][0] + ox, p[2][1] + oy, p[3][0] + ox, p[3][1] + oy); g.stroke(); };
    st('rgba(60,45,25,0.16)', 8, 5, 6); st(SN.metalD, 7.5); st(SN.metal, 4.5); st('rgba(255,255,255,0.85)', 1.6, -1, -1);
  };
  if (G.coil === 'top') for (let hx = x + 52; hx < x + w - 30; hx += 58) { hole(hx, y + 42, 9, 11); wire(hx, y + 42, 0, -1); }
  else if (G.coil === 'left') for (let hy = y + 52; hy < y + h - 30; hy += 58) { hole(x + 42, hy, 11, 9); wire(x + 42, hy, -1, 0); }
  else if (G.coil === 'holes') for (const f of [0.14, 0.5, 0.86]) hole(x + 62, y + h * f, 20, 20);
  SN_PAGES.set(k, c); return c;
}
// the desk and the page, in world coords. Returns the geometry: { x, y, w, h, left, right (the writing area), marginX,
// line0, pitch, lines: [y...] }. o: see snGeom, plus dots (true = dot grid).
function snPage(o = {}) {
  const G = (SN_PG = snGeom(o));
  ctx.drawImage(snPageTex(G), -SN_M, -SN_M);
  const br = 0.07 + 0.035 * Math.sin(TT * 1.7), ex = G.x + G.w + 14, ey = G.y + G.h + 12;   // idle life: the page shadow breathes
  ctx.save();
  let gr = ctx.createLinearGradient(ex, 0, ex + 46, 0); gr.addColorStop(0, `rgba(70,50,25,${br.toFixed(3)})`); gr.addColorStop(1, 'rgba(70,50,25,0)');
  ctx.fillStyle = gr; ctx.fillRect(ex, G.y + 24, 46, G.h);
  gr = ctx.createLinearGradient(0, ey, 0, ey + 46); gr.addColorStop(0, `rgba(70,50,25,${br.toFixed(3)})`); gr.addColorStop(1, 'rgba(70,50,25,0)');
  ctx.fillStyle = gr; ctx.fillRect(G.x + 24, ey, G.w, 46);
  ctx.restore();
  return G;
}
// the y of rule n (0 = the first rule under the header): put baselines on it
const snLineY = (n) => { const G = SN_PG || (SN_PG = snGeom()); return G.line0 + n * G.pitch; };

// ---------------------------------------------------------------------
//  MARKS: underline, circle, box, bracket, arrow. All draw on from o.t0 over o.d and return { tip, t0, t1, start, end }
//  (the same shape snWrite returns), so the pencil hero can follow them.
// ---------------------------------------------------------------------
const snMark = (P, Q, t0, d) => ({ t0, t1: t0 + d, tip: snEnd(Q, P), start: P[0], end: P[P.length - 1], done: TT >= t0 + d });
// an underline from point a to point b (snWrite returns them as r.a, r.b). o: style 'single' | 'double' | 'wavy', color, w, t0, d, gap
function snUnderline(a, b, o = {}) {
  const { style = 'single', color = SN.ink, w = 5, d = 0.3, key = 'ul' } = o, t0 = o.t0 ?? -1e9, part = ev(t0, d), gap = o.gap ?? 13;
  const L = dist(a, b) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux, P = [];
  const n = Math.max(2, Math.ceil(L / 9));
  for (let i = 0; i <= n; i++) {
    const k = i / n, s = -6 + (L + 14) * k, off = gap + (style === 'wavy' ? Math.sin(k * L / 44 * TAU) * 6.5 : Math.sin(k * Math.PI) * 4);
    P.push([a[0] + ux * s + nx * off, a[1] + uy * s + ny * off]);
  }
  const key2 = key + Math.round(a[0]) + Math.round(a[1]);
  let Q = snLine(P, { col: color, w, part: style === 'double' ? clamp(part * 2) : part, key: key2, amp: 0.9, step: 8 });
  if (style === 'double') { const P2 = P.map(([x, y]) => [x + nx * 12 - ux * 8, y + ny * 12 - uy * 8]).reverse(); const Q2 = snLine(P2, { col: color, w: w * 0.8, part: clamp(part * 2 - 1), key: key2 + 'b', amp: 0.9, step: 8 }); if (Q2) Q = Q2; }
  return snMark(P, Q, t0, d);
}
// a loop drawn round a word that spans x0..x1 on baseline y (size = its letter size); the pen runs past its start
function snCircleWord(x0, x1, y, size, o = {}) {
  const { color = SN.coral, w = 5, d = 0.35, key = 'cw' } = o, t0 = o.t0 ?? -1e9;
  const cx = (x0 + x1) / 2, cy = y - size * 0.3, rx = (x1 - x0) / 2 + size * 0.32, ry = size * 0.66, P = [], N = 44;
  for (let i = 0; i <= N; i++) { const k = i / N, a = -2.5 + k * TAU * 1.07, s = 1 + 0.05 * k; P.push([cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s - k * 3]); }
  const Q = snLine(P, { col: color, w, part: ev(t0, d), key: key + Math.round(cx), amp: 1.2 });
  return snMark(P, Q, t0, d);
}
// a hand-drawn box. o: r (corner), fill (a highlighter colour laid slightly off the line), double, color, w, t0, d
function snBoxPts(x, y, w, h, r = 12, over = 0.05) {
  const Q = [[x + r, y], ...rrectPts(x, y, w, h, r, 5)];   // rrectPts runs from the top edge's right end round to its left end
  if (over > 0) Q.push([x + r + w * over, y - 2]);
  return Q;
}
function snBox(x, y, w, h, o = {}) {
  const { color = SN.ink, d = 0.4, key = 'bx', r = 12 } = o, lw = o.w ?? 5, t0 = o.t0 ?? -1e9, part = ev(t0, d);
  if (part <= 0) return snMark([[x + r, y]], null, t0, d);
  if (o.fill) {                                                              // o.shadow: the pastel only shows as a block set off behind the box
    ctx.save(); ctx.globalAlpha *= clamp(part * 1.6 - 0.3); snFill(rrectPts(x, y, w, h, r, 5), o.fill, { off: o.off ?? (o.shadow ? [13, 13] : [9, 9]) });
    if (o.shadow) { ctx.fillStyle = SN.paper; trace(resample(rrectPts(x, y, w, h, r, 5), true, 12), true); ctx.fill(); }
    ctx.restore();
  }
  const P = snBoxPts(x, y, w, h, r), kk = key + Math.round(x) + Math.round(y);
  const Q = snLine(P, { col: color, w: lw, part, key: kk, amp: 1.1 });
  if (o.double) snLine(snBoxPts(x - 8, y - 8, w + 16, h + 16, r + 6, 0.03), { col: color, w: lw * 0.5, part: clamp(part * 1.2 - 0.2), key: kk + 'd', amp: 1.6 });
  return snMark(P, Q, t0, d);
}
// a curly bracket spanning y0..y1 at x. o: side 'left' (opens to the right) | 'right', color, w, t0, d, k (depth)
function snBracket(x, y0, y1, o = {}) {
  const { color = SN.ink, w = 4.5, d = 0.35, key = 'br' } = o, t0 = o.t0 ?? -1e9, s = o.side === 'right' ? -1 : 1, k = o.k ?? 18, ym = (y0 + y1) / 2;
  const P = [[x + s * k, y0], [x + s * k * 0.2, y0 + k * 0.5], [x, y0 + k * 1.6], [x, ym - k * 1.4], [x - s * k * 0.3, ym - k * 0.4], [x - s * k, ym], [x - s * k * 0.3, ym + k * 0.4], [x, ym + k * 1.4], [x, y1 - k * 1.6], [x + s * k * 0.2, y1 - k * 0.5], [x + s * k, y1]];
  const Q = snLine(P, { col: color, w, part: ev(t0, d), key: key + Math.round(x) + Math.round(y0), amp: 0.8, step: 7 });
  return snMark(P, Q, t0, d);
}
// a curved doodle arrow from a to b. o: bow (sideways bend as a fraction of the length), loop (a little loop on the
// way), color, w, d, head (size). The head is two flicks drawn after the line arrives.
function snArrow(a, b, t0, o = {}) {
  const { color = SN.ink, w = 4.5, d = 0.4, key = 'ar' } = o, L = dist(a, b) || 1, bow = (o.bow ?? 0.22) * L, hs = o.head ?? clamp(L * 0.12, 16, 30);
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux, cxx = (a[0] + b[0]) / 2 + nx * bow, cyy = (a[1] + b[1]) / 2 + ny * bow, P = [], N = 40, lr = L * 0.075;
  for (let i = 0; i <= N; i++) {
    const k = i / N, m = 1 - k; let px = m * m * a[0] + 2 * m * k * cxx + k * k * b[0], py = m * m * a[1] + 2 * m * k * cyy + k * k * b[1];
    if (o.loop) { const f = seg(k, 0.36, 0.62) * TAU, s1 = -Math.sin(f) * lr, c1 = (1 - Math.cos(f)) * lr * Math.sign(bow || 1); px += ux * s1 + nx * c1; py += uy * s1 + ny * c1; }
    P.push([px, py]);
  }
  const tt = t0 ?? -1e9, part = ev(tt, d), kk = key + Math.round(a[0]) + Math.round(b[1]);
  const Q = snLine(P, { col: color, w, part, key: kk, amp: 0.8, step: 8 });
  const hp = ev(tt + d, 0.12);
  if (hp > 0) {
    const e = P[N], q = P[N - 3], ang = Math.atan2(e[1] - q[1], e[0] - q[0]);
    for (const s of [-1, 1]) snLine([e, [e[0] - Math.cos(ang + s * 0.5) * hs, e[1] - Math.sin(ang + s * 0.5) * hs]], { col: color, w, part: hp, key: kk + 'h' + s, amp: 0.5 });
  }
  return snMark(P, Q, tt, d);
}

// ---------------------------------------------------------------------
//  HEADINGS and BULLETS
// ---------------------------------------------------------------------
// a lettered heading (caps, the marker face), '\n' for a second line; baselines y, y + lh. o: t0, speed, lh, color,
// style: 'box' (a drawn box with a pastel block set off behind it; shadow: false fills the box instead) | 'banner' (a ribbon) | 'block' (a highlighter
// block behind each line) | 'double' (a pastel echo of the letters and a double rule), fill (the pastel), caps,
// hi (as snWrite: one word marked in a second highlighter). Returns { x0, x1, y0, y1, t0, t1, lines, tip, start, end }.
function snHeading(str, x, y, size, o = {}) {
  const { style = 'box', color = SN.ink, key = 'hd' } = o, t0 = o.t0 ?? -1e9, lh = o.lh ?? (SN_PG ? SN_PG.pitch : SN_PITCH), fill = o.fill ?? SN.sky;
  const lines = (o.caps === false ? str : str.toUpperCase()).split('\n'), ws = lines.map((s) => snTextW(s, size, 'letter'));
  const wmax = Math.max(...ws), pad = size * 0.38, x0 = o.align === 'center' ? x - wmax / 2 : x, y0 = y - size * 0.98, y1 = y + (lines.length - 1) * lh + size * 0.34;
  const speed = o.speed ?? 24, starts = []; let tt = t0;
  for (const s of lines) { starts.push(tt); tt += t0 < -1e8 ? 0 : s.length / speed; }
  const tEnd = tt, lineX = (i) => (o.align === 'center' ? x - ws[i] / 2 : x0);
  // the decoration that sits under the letters
  if (style === 'box') snBox(x0 - pad, y0 - pad * 0.45, wmax + pad * 2, y1 - y0 + pad * 0.7, { t0: o.boxT0 ?? t0, d: o.boxD ?? 0.5, fill, shadow: o.shadow ?? true, key, double: o.double, w: 5.5 });
  else if (style === 'banner') {
    const u = EZ.o3(ev(o.boxT0 ?? t0, 0.3));
    if (u > 0) {
      const bx0 = x0 - pad * 1.3, bx1 = x0 + wmax + pad * 1.3, by0 = y0 - pad * 0.3, by1 = y1 + pad * 0.1, mid = (bx0 + bx1) / 2, tl = size * 0.75, dp = size * 0.26;
      ctx.save(); ctx.translate(mid, 0); ctx.scale(u, 1); ctx.translate(-mid, 0);
      for (const s of [-1, 1]) {                                             // the tails, folded behind
        const ex = s < 0 ? bx0 : bx1, T = [[ex + s * 2, by0 + dp], [ex + s * tl, by0 + dp], [ex + s * (tl - dp * 1.2), (by0 + by1) / 2 + dp], [ex + s * tl, by1 + dp], [ex - s * dp * 1.4, by1 + dp], [ex - s * dp * 1.4, by0 + dp]];
        snFill(T, fill, { off: [0, 0] }); snFill(T, fill, { off: [0, 0], a: 0.55 });
        snLine(T, { closed: true, w: 4.5, key: key + 'tl' + s, col: color });
        snLine([[ex, by1], [ex - s * dp * 1.4, by1 + dp]], { w: 4, key: key + 'fd' + s, col: color });
      }
      const Bp = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]];
      ctx.save(); ctx.fillStyle = SN.paper; ctx.beginPath(); ctx.rect(bx0, by0, bx1 - bx0, by1 - by0); ctx.fill(); ctx.restore();
      snFill(Bp, fill, { off: [0, 0] }); snLine(Bp, { closed: true, w: 5, key: key + 'bn', col: color });
      ctx.restore();
    }
  } else if (style === 'block') lines.forEach((s, i) => snHighlight(lineX(i) - pad * 0.6, y + i * lh - size * 0.36, ws[i] + pad * 1.2, size * 1.08, fill, o.boxT0 ?? (t0 < -1e8 ? null : starts[i] + s.length / speed + 0.1), { key: key + i }));
  const out = lines.map((s, i) => {
    const yy = y + i * lh, lx = lineX(i);
    if (style === 'double') snWrite(s, lx + size * 0.07, yy + size * 0.07, size, fill, { face: 'letter', t0: starts[i], speed, key: key + i, stroke: size * 0.05 });
    return snWrite(s, lx, yy, size, color, { face: 'letter', t0: starts[i], speed, key: key + i, hi: o.hi, jit: 0.7 });
  });
  if (style === 'double') snUnderline([x0, y1 - size * 0.2], [x0 + wmax, y1 - size * 0.2], { style: 'double', t0: t0 < -1e8 ? null : tEnd, color, key });
  const cur = out.find((r) => r.u > 0 && r.u < 1) || (TT < t0 ? out[0] : out[out.length - 1]);
  return { x0: x0 - pad, x1: x0 + wmax + pad, y0: y0 - pad * 0.45, y1: y1 + pad * 0.25, t0, t1: tEnd, lines: out, tip: cur.tip, start: out[0].start, end: out[out.length - 1].end };
}
// a list, one item per rule. items: 'text' or { s, t0, t1, hi, color, tick }. o: t0, stagger, size, lh, color, speed,
// marker: 'dot' | 'star' | 'arrow' | 'check' | 'num', ticks: [t...] (when each checkbox gets its tick), tickC.
// Returns one snWrite result per item, plus .mark (the marker's centre) and, for a ticked box, .tick (a mark the hero can follow).
function snBullets(items, x, y, o = {}) {
  const size = o.size ?? 54, lh = o.lh ?? (SN_PG ? SN_PG.pitch : SN_PITCH), t0 = o.t0 ?? -1e9, stag = o.stagger ?? 0.5, marker = o.marker ?? 'dot', col = o.color ?? SN.navy, key = o.key ?? 'bl';
  return items.map((it, i) => {
    const I = typeof it === 'string' ? { s: it } : it, ti = I.t0 ?? (t0 < -1e8 ? t0 : t0 + i * stag), yy = y + i * lh, mx = x + size * 0.38, my = yy - size * 0.3, tm = ti < -1e8 ? ti : ti - 0.2, bs = size * 0.62;
    if (marker === 'num') snWrite(`${i + 1}.`, x, yy, size, o.markC ?? SN.ink, { face: 'letter', t0: tm, speed: 12, key: key + 'n' + i, jit: 0.5 });
    else if (marker === 'dot') { const u = EZ.back(ev(tm, 0.17)); if (u > 0) { ctx.save(); ctx.fillStyle = o.markC ?? col; ctx.beginPath(); ctx.arc(mx, my, size * 0.105 * u, 0, TAU); ctx.fill(); ctx.restore(); } }
    else if (marker === 'star') snDoodle('star', mx, my, size * 0.34, { t0: tm, d: 0.2, key: key + 's' + i });
    else if (marker === 'arrow') snArrow([x + 2, my], [x + size * 0.78, my], tm, { d: 0.14, bow: 0.001, head: size * 0.24, key: key + 'a' + i, color: o.markC ?? SN.ink });
    else if (marker === 'check') snBox(mx - bs / 2, my - bs / 2, bs, bs, { t0: tm, d: 0.2, r: 5, w: 4.5, key: key + 'c' + i });
    const r = snWrite(I.s, x + size * 1.12, yy, size, I.color ?? col, { t0: ti, speed: o.speed, t1: I.t1, hi: I.hi, key: key + i });
    r.mark = [mx, my];
    const tk = I.tick ?? (o.ticks ? o.ticks[i] : null);
    if (marker === 'check' && tk != null) {
      const P = [[mx - bs * 0.36, my - bs * 0.02], [mx - bs * 0.06, my + bs * 0.32], [mx + bs * 0.66, my - bs * 0.7]];
      const Q = snLine(P, { col: o.tickC ?? SN.coral, w: size * 0.115, part: ev(tk, 0.17), key: key + 't' + i, amp: 0.6, step: 6 });
      r.tick = { t0: tk, t1: tk + 0.17, tip: snEnd(Q, P), start: P[0], end: P[2], done: TT >= tk + 0.17, tilt: o.tickTilt ?? -0.5 };   // the pencil leans left, off the words
    }
    return r;
  });
}

// ---------------------------------------------------------------------
//  STUCK-ON THINGS: sticky notes, washi tape, index tabs, a paper clip, taped-in cards
// ---------------------------------------------------------------------
const snRot = (p, c, rot, sc = 1) => { const co = Math.cos(rot), si = Math.sin(rot); return [c[0] + (p[0] * co - p[1] * si) * sc, c[1] + (p[0] * si + p[1] * co) * sc]; };
// the outline of a sticky note (top-left x, y; rotated about its centre): the bridge shape for a morph onto a note
function snStickyPts(x, y, w, h, rot = -0.04) {
  const c = [x + w / 2, y + h / 2];
  return resample(rrectPts(-w / 2, -h / 2, w, h, 8, 3), true, 14).map((p) => snRot(p, c, rot));
}
// a sticky note that slaps on: top-left x, y, size w x h. o: t0, rot, text ('line\nline', written on from textT0 (one
// time, or one per line) or t0 + 0.25), size, textC, speed, hi (as snWrite), curl (corner size 0..1), lift (false = the corner keeps still), key.
// Returns { cx, cy, rot, P (outline), lines: [snWrite results in world coords], t1 }.
function snSticky(x, y, w, h, color, o = {}) {
  const t0 = o.t0 ?? -1e9, key = o.key ?? 'st' + Math.round(x) + Math.round(y), c = [x + w / 2, y + h / 2], base = o.rot ?? -0.04;
  const res = { cx: c[0], cy: c[1], rot: base, P: snStickyPts(x, y, w, h, base), lines: [], t1: t0 };
  const sl = snSlap(t0); if (!sl) return res;
  const rot = base + sl.rot, hw = w / 2, hh = h / 2;
  const f = (o.curl ?? 0.17) * Math.min(w, h) * (o.lift === false ? 1 : 1 + 0.22 * Math.max(0, Math.sin(TT * 1.9 + key.length)));   // idle life: the corner lifts
  const body = () => { ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, -hh); ctx.lineTo(hw, hh - f); ctx.lineTo(hw - f, hh); ctx.lineTo(-hw, hh); ctx.closePath(); };
  ctx.save(); ctx.globalAlpha *= sl.al; ctx.translate(c[0], c[1]); ctx.rotate(rot); ctx.scale(sl.sc, sl.sc);
  ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.30)'; ctx.shadowBlur = 20; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 12; ctx.fillStyle = color; body(); ctx.fill(); ctx.restore();
  const gr = ctx.createLinearGradient(0, -hh, 0, hh); gr.addColorStop(0, 'rgba(0,0,0,0.06)'); gr.addColorStop(0.16, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.22)');
  ctx.fillStyle = gr; body(); ctx.fill();
  // the curled corner: the paper's underside folded up, with its own little shadow
  ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = -3; ctx.shadowOffsetY = -3;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(hw, hh - f); ctx.quadraticCurveTo(hw - f * 0.55, hh - f * 0.75, hw - f * 0.98, hh - f * 0.98); ctx.quadraticCurveTo(hw - f * 0.75, hh - f * 0.5, hw - f, hh); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.beginPath(); ctx.moveTo(hw, hh - f); ctx.quadraticCurveTo(hw - f * 0.55, hh - f * 0.75, hw - f * 0.98, hh - f * 0.98); ctx.quadraticCurveTo(hw - f * 0.75, hh - f * 0.5, hw - f, hh); ctx.closePath(); ctx.fill();
  if (o.text) {
    const L = o.text.split('\n'), size = o.size ?? 56, lh = o.lh ?? size * 1.3, speed = o.speed ?? 16; const TS = Array.isArray(o.textT0) ? o.textT0 : null; let tt = TS ? TS[0] : o.textT0 ?? (t0 < -1e8 ? t0 : t0 + 0.25);
    L.forEach((s, i) => {
      if (TS && TS[i] != null) tt = TS[i];
      const r = snWrite(s, 0, (i - (L.length - 1) / 2) * lh + size * 0.3 - h * 0.03, size, o.textC ?? SN.navy, { align: 'center', t0: tt, speed, hi: o.hi, key: key + i, face: o.face });
      tt = tt < -1e8 ? tt : r.t1 + (o.pause ?? 0);
      for (const k of ['tip', 'start', 'end', 'a', 'b']) r[k] = snRot(r[k], c, rot, sl.sc);
      res.lines.push(r);
    });
    res.t1 = tt;
  }
  ctx.restore();
  return res;
}
// washi tape: a translucent strip centred on x, y, w long, rotated. pattern: 'stripes' | 'dots' | 'plain'.
// o: color, h, t0 (it lands), a (opacity), key
function snWashi(x, y, w, rot = 0, pattern = 'stripes', o = {}) {
  const sl = snSlap(o.t0 ?? -1e9, 0.5); if (!sl) return;
  const h = o.h ?? 44, color = o.color ?? SN.mint, S = RNG('snwa', o.key ?? '', Math.round(x), Math.round(y)), hw = w / 2, hh = h / 2, n = 5;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + sl.rot * 0.4); ctx.scale(sl.sc, sl.sc); ctx.globalAlpha *= (o.a ?? 0.84) * sl.al;
  ctx.beginPath(); ctx.moveTo(-hw, -hh);
  ctx.lineTo(hw, -hh); for (let i = 1; i <= n; i++) ctx.lineTo(hw - (i % 2 ? 7 + S.r(0, 3) : 0), -hh + h * i / n);          // torn zigzag ends
  ctx.lineTo(-hw, hh); for (let i = 1; i < n; i++) ctx.lineTo(-hw + (i % 2 ? 7 + S.r(0, 3) : 0), hh - h * i / n);
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  if (pattern === 'stripes') { ctx.lineWidth = 6; ctx.beginPath(); for (let sx = -hw - h; sx < hw + h; sx += 19) { ctx.moveTo(sx, hh + 2); ctx.lineTo(sx + h, -hh - 2); } ctx.stroke(); }
  else if (pattern === 'dots') { ctx.beginPath(); let row = 0; for (let sy = -hh + 11; sy < hh; sy += 15, row++) for (let sx = -hw + 10 + (row % 2) * 9; sx < hw; sx += 18) { ctx.moveTo(sx + 4, sy); ctx.arc(sx, sy, 4, 0, TAU); } ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-hw, -hh, w, 4); ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(-hw, hh - 4, w, 4);
  ctx.restore();
}
// an index tab on the page's right edge at height y. o: t0 (it slides out), x (the edge), w, h, labelC, size
function snTab(y, color, label, o = {}) {
  const G = SN_PG || (SN_PG = snGeom()), edge = o.x ?? G.x + G.w, w = o.w ?? 46, h = o.h ?? Math.max(78, label ? snTextW(label, o.size ?? 30, 'letter') + 30 : 0), u = EZ.back(ev(o.t0 ?? -1e9, 0.25)); if (u <= 0) return;
  const x0 = edge - 30, x1 = edge + w * u;
  ctx.save();
  ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5; ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x0, y - h / 2, x1 - x0, h, [4, 14, 14, 4]); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x0, y - h / 2, x1 - x0, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(x0, y - h / 2, 30, h);     // the part glued onto the page
  if (label && u > 0.9) { const size = o.size ?? 30; ctx.translate((x0 + x1) / 2 + 6, y); ctx.rotate(Math.PI / 2); ctx.font = snFont(size, 'letter'); ctx.fillStyle = o.labelC ?? SN.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0); }
  ctx.restore();
}
// a wire paper clip centred on x, y; s = half its length. o: rot, color
function snClip(x, y, s, o = {}) {
  const P = [[-0.36, 0.2], [-0.36, -0.84], ...arcPts(0, -0.84, 0.36, Math.PI, TAU, 10), [0.36, 0.9], ...arcPts(0.08, 0.9, 0.28, 0, Math.PI, 10), [-0.2, -0.55], ...arcPts(0, -0.55, 0.2, Math.PI, TAU, 8), [0.2, 0.45]].map(([u, v]) => [u * s, v * s]);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0.12); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const st = (col, lw, dx = 0, dy = 0) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0] + dx, p[1] + dy) : ctx.moveTo(p[0] + dx, p[1] + dy))); ctx.stroke(); };
  st('rgba(60,45,25,0.18)', s * 0.12, 3, 5); st(o.color ?? SN.metalD, s * 0.12); st(SN.metal, s * 0.07); st('rgba(255,255,255,0.8)', s * 0.025, -s * 0.012, -s * 0.012);
  ctx.restore();
}
// a taped-in card: top-left x, y, size w x h. o: t0 (it lands; the tape lands two steps later), rot, fill,
// tape: 'stripes' | 'dots' | 'plain' | 'clip' | false, tapeC, draw(w, h): called in the card's own frame (origin at its centre).
function snCard(x, y, w, h, o = {}) {
  const t0 = o.t0 ?? -1e9, c = [x + w / 2, y + h / 2], base = o.rot ?? 0.03, key = o.key ?? 'cd' + Math.round(x) + Math.round(y);
  const sl = snSlap(t0, 0.7); if (!sl) return { cx: c[0], cy: c[1], rot: base };
  const rot = base + sl.rot;
  ctx.save(); ctx.globalAlpha *= sl.al; ctx.translate(c[0], c[1]); ctx.rotate(rot); ctx.scale(sl.sc, sl.sc);
  ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 9; ctx.fillStyle = o.fill ?? SN.card; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  ctx.strokeStyle = 'rgba(90,75,55,0.2)'; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
  if (o.draw) { ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); o.draw(w, h); ctx.restore(); }
  const tape = o.tape ?? 'stripes', tt = t0 < -1e8 ? t0 : t0 + 0.17, S = RNG('sncd', key);
  if (tape === 'clip') snClip(-w / 2 + 40, -h / 2 + 4, 44, { rot: -0.1 });
  else if (tape) snWashi(S.n(w * 0.06), -h / 2 + 2, Math.min(w * 0.5, 190), S.n(0.07), tape, { t0: tt, color: o.tapeC ?? SN.mint, key });
  ctx.restore();
  return { cx: c[0], cy: c[1], rot };
}
// a polaroid: a card with a tinted picture window (o.tint) that o.draw(pw, ph) draws into, and a hand-written o.caption
function snPolaroid(x, y, w, h, o = {}) {
  const m = w * 0.07, ph = h - m * 2 - h * 0.17;
  return snCard(x, y, w, h, {
    ...o, draw: () => {
      ctx.save(); ctx.fillStyle = o.tint ?? SN.sky; ctx.globalAlpha *= 0.55; ctx.fillRect(-w / 2 + m, -h / 2 + m, w - m * 2, ph); ctx.restore();
      ctx.save(); ctx.translate(0, -h / 2 + m + ph / 2); if (o.draw) o.draw(w - m * 2, ph); ctx.restore();
      if (o.caption) snWrite(o.caption, 0, h / 2 - h * 0.06, o.size ?? 34, SN.navy, { align: 'center', t0: o.t0 == null ? null : o.t0 + 0.3, key: 'pl' + o.caption });
    },
  });
}

// ---------------------------------------------------------------------
//  DOODLES: little fineliner drawings in unit coords (-1..1, y down) that draw on stroke by stroke, with a pastel
//  fill laid slightly off the line once the outline is nearly there
// ---------------------------------------------------------------------
// the outline of a union of circles, seen from (cx, cy): clouds and brains
function snLumps(cs, cx, cy, n = 90, floor = null) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, dx = Math.cos(a), dy = Math.sin(a); let t = 0.02;
    for (const [ox, oy, r] of cs) { const bx = ox - cx, by = oy - cy, bd = dx * bx + dy * by, disc = bd * bd - (bx * bx + by * by) + r * r; if (disc >= 0) t = Math.max(t, bd + Math.sqrt(disc)); }
    if (floor != null && dy > 0 && cy + t * dy > floor) t = (floor - cy) / dy;
    P.push([cx + dx * t, cy + dy * t]);
  }
  return P;
}
const snClosed = (P) => [...P, P[0]];
const SN_DOODLES = {
  lightbulb: () => {
    const glass = [[-0.24, 0.5], ...arcPts(0, -0.22, 0.56, 125 * DEG, 415 * DEG, 30), [0.24, 0.5]];
    return {
      fills: [{ P: glass, c: SN.yellow }],
      strokes: [glass, [[-0.25, 0.5], [0.25, 0.5]], [[-0.22, 0.64], [0.22, 0.64]], [[-0.17, 0.78], [0.17, 0.78]], arcPts(0, 0.8, 0.1, 0, Math.PI, 8),
        [[-0.12, 0.46], [-0.14, 0.1], [-0.14, -0.02], ...arcPts(-0.07, -0.04, 0.07, Math.PI, TAU, 8), ...arcPts(0.07, -0.04, 0.07, Math.PI, TAU, 8), [0.14, 0.1], [0.12, 0.46]]],
      rays: [-162, -126, -90, -54, -18].map((d) => [[Math.cos(d * DEG) * 0.74, -0.22 + Math.sin(d * DEG) * 0.74], [Math.cos(d * DEG) * 0.98, -0.22 + Math.sin(d * DEG) * 0.98]]),
    };
  },
  brain: () => {
    const out = snLumps([[-0.5, -0.2, 0.36], [-0.12, -0.42, 0.38], [0.32, -0.36, 0.38], [0.6, 0, 0.34], [0.3, 0.3, 0.36], [-0.2, 0.28, 0.4], [-0.58, 0.14, 0.3]], 0, 0, 100);
    return {
      fills: [{ P: out, c: SN.pink }],
      strokes: [snClosed(out), [[-0.02, -0.74], [0.06, -0.4], [-0.08, -0.1], [0.05, 0.2], [-0.02, 0.62]], arcPts(-0.42, -0.1, 0.2, -1.2, 1.4, 10), arcPts(0.44, -0.12, 0.2, 1.8, 4.4, 10), arcPts(-0.3, 0.32, 0.14, 3.4, 5.8, 8), arcPts(0.32, 0.3, 0.14, 3.6, 6.0, 8),
        [[0.1, 0.62], [0.16, 0.86], [0.3, 0.92]]],
    };
  },
  clock: () => {
    const face = ellipsePts(0, 0.04, 0.78, 0.78, -1.8, 50);
    return {
      fills: [{ P: face, c: SN.sky }],
      strokes: [[...snClosed(face), face[2]], [[-0.5, 0.64], [-0.68, 0.92]], [[0.5, 0.64], [0.68, 0.92]], [[-0.14, -0.94], [0.14, -0.94]], [[0, -0.94], [0, -0.76]],
        ...[0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2; return [[Math.cos(a) * 0.6, 0.04 + Math.sin(a) * 0.6], [Math.cos(a) * 0.7, 0.04 + Math.sin(a) * 0.7]]; })],
      hands: [0.5, 0.34],
    };
  },
  book: () => {
    const L = [[0, -0.42], [-0.22, -0.56], [-0.6, -0.6], [-0.92, -0.5], [-0.92, 0.5], [-0.6, 0.4], [-0.22, 0.44], [0, 0.58]], Rr = L.map(([u, v]) => [-u, v]);
    return {
      fills: [{ P: L, c: SN.lilac }, { P: Rr, c: SN.lilac }],
      strokes: [L, Rr, [[0, -0.42], [0, 0.58]], ...[-0.22, 0, 0.2].flatMap((v) => [[[-0.74, v - 0.06], [-0.2, v]], [[0.2, v], [0.74, v - 0.06]]])],
    };
  },
  star: () => { const P = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 0.95; P.push([Math.cos(a) * r, Math.sin(a) * r]); } return { fills: [{ P, c: SN.yellow }], strokes: [[...snClosed(P), P[1]]], sharp: true }; },
  heart: () => { const P = []; for (let i = 0; i < 48; i++) { const t = i / 48 * TAU + Math.PI; P.push([16 * Math.sin(t) ** 3 / 18, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 18 - 0.08]); } return { fills: [{ P, c: SN.pink }], strokes: [[...snClosed(P), P[2]]] }; },
  cloud: () => { const P = snLumps([[-0.5, 0.12, 0.34], [-0.12, -0.16, 0.44], [0.38, -0.02, 0.36], [0.66, 0.2, 0.24], [0, 0.2, 0.4]], 0, 0.1, 90, 0.46); return { fills: [{ P, c: SN.sky }], strokes: [[...snClosed(P), P[2]]] }; },
  magnifier: () => {
    const lens = ellipsePts(-0.18, -0.18, 0.56, 0.56, 0.8, 44);
    return { fills: [{ P: lens, c: SN.sky }], strokes: [[...snClosed(lens), lens[2]], [[0.2, 0.28], [0.72, 0.8]], [[0.3, 0.18], [0.82, 0.7]], arcPts(0.77, 0.75, 0.075, -0.8, 2.4, 6), arcPts(-0.18, -0.18, 0.36, 3.5, 4.5, 8)] };
  },
  target: () => {
    const c1 = ellipsePts(-0.08, 0.08, 0.84, 0.84, -1.2, 50), c2 = ellipsePts(-0.08, 0.08, 0.54, 0.54, -1.2, 36), c3 = ellipsePts(-0.08, 0.08, 0.22, 0.22, -1.2, 20);
    return { fills: [{ P: c1, c: SN.pink }, { P: c2, c: 'paper' }, { P: c3, c: SN.pink }], strokes: [[...snClosed(c1), c1[2]], snClosed(c2), snClosed(c3), [[0.92, -0.92], [-0.04, 0.04]], [[0.92, -0.92], [0.66, -0.94]], [[0.92, -0.92], [0.94, -0.66]], [[0.06, 0.04], [-0.04, 0.04], [-0.04, -0.06]]] };
  },
  battery: () => {
    const body = rrectPts(-0.88, -0.44, 1.56, 0.88, 0.12, 4), bar = (u) => [[u, -0.28], [u + 0.34, -0.28], [u + 0.34, 0.28], [u, 0.28]];
    return { fills: [{ P: bar(-0.72), c: SN.mint, flat: true }, { P: bar(-0.28), c: SN.mint, flat: true }, { P: bar(0.16), c: SN.mint, flat: true }], strokes: [[[-0.76, -0.44], ...body, [-0.7, -0.45]], [[0.68, -0.2], [0.88, -0.2], [0.88, 0.2], [0.68, 0.2]], snClosed(bar(-0.72)), snClosed(bar(-0.28)), snClosed(bar(0.16))] };
  },
};
const SN_DOODLE_CACHE = new Map();
// a doodle centred on x, y; s = half its size. o: t0, d (how long the drawing takes), color (the pen), fill (a
// colour, or false for line only), w, twinkle (idle life: it pulses and throws little rays), time (clock hands).
// Returns a mark { tip, t0, t1, start, end } for the hero.
function snDoodle(name, x, y, s, o = {}) {
  let D = SN_DOODLE_CACHE.get(name); if (!D) { D = (SN_DOODLES[name] || SN_DOODLES.star)(); SN_DOODLE_CACHE.set(name, D); }
  const t0 = o.t0 ?? -1e9, d = o.d ?? 0.6, part = ev(t0, d), key = o.key ?? name + Math.round(x) + Math.round(y), col = o.color ?? SN.ink, lw = o.w ?? clamp(s * 0.055, 3.2, 6);
  const tw = o.twinkle ? 1 + 0.07 * Math.sin(TT * 5.2 + key.length) : 1, T = (p) => [x + p[0] * s * tw, y + p[1] * s * tw];
  const first = T(D.strokes[0][0]);
  if (part <= 0) return { t0, t1: t0 + d, tip: first, start: first, end: first, done: false };
  if (o.fill !== false) {
    const fa = clamp((part - 0.55) / 0.35);
    if (fa > 0) D.fills.forEach((f, i) => { ctx.save(); ctx.globalAlpha *= f.flat ? clamp(fa * D.fills.length - i) : fa; const c = f.c === 'paper' ? SN.paper : (i === 0 && o.fill) || f.c; snFill(f.P.map(T), c, { off: f.flat || f.c === 'paper' ? [0, 0] : [s * 0.07, s * 0.06], mult: f.c !== 'paper' }); ctx.restore(); });
  }
  const lens = D.strokes.map(pathLen), total = lens.reduce((a, b) => a + b, 0); let budget = part * total, tip = first;
  D.strokes.forEach((P, i) => {
    if (budget <= 0) return;
    const k = Math.min(1, budget / lens[i]); budget -= lens[i];
    const Q = snLine(P.map(T), { col, w: lw, part: k, key: key + i, amp: D.sharp ? 0.5 : 0.9, step: D.sharp ? 5 : 7 });
    if (Q) tip = Q[Q.length - 1];
  });
  if (part >= 1) {
    if (D.hands) { const tm = o.time ?? 0; [[tm * TAU / 12 - Math.PI / 2, D.hands[1]], [tm * TAU - Math.PI / 2, D.hands[0]]].forEach(([a, l], i) => snLine([T([0, 0.04]), T([Math.cos(a) * l, 0.04 + Math.sin(a) * l])], { col, w: lw * (i ? 1 : 1.3), key: key + 'h' + i, amp: 0 })); const c0 = T([0, 0.04]); ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c0[0], c0[1], lw * 1.1, 0, TAU); ctx.fill(); ctx.restore(); }
    if (D.rays) { const pulse = 0.6 + 0.4 * Math.sin(TT * 4.2); D.rays.forEach((r, i) => { const b = [lerp(r[0][0], r[1][0], (i + B) % 2 ? pulse : 1), lerp(r[0][1], r[1][1], (i + B) % 2 ? pulse : 1)]; snLine([T(r[0]), T(b)], { col, w: lw, key: key + 'r' + i, amp: 0.4 }); }); }
    if (o.twinkle && Math.floor(TT * 3 + key.length) % 3 === 0) for (const a of [-0.9, 0.5, 2.4]) snLine([[x + Math.cos(a) * s * 1.25, y + Math.sin(a) * s * 1.25], [x + Math.cos(a) * s * 1.6, y + Math.sin(a) * s * 1.6]], { col, w: lw * 0.8, key: key + 'tw' + a, amp: 0 });
  }
  return { t0, t1: t0 + d, tip, start: first, end: tip, done: part >= 1 };
}
// a highlighter-colour blob behind a doodle or a word (a round patch scribbled in): centre x, y, radius r
function snBlob(x, y, r, color, t0, o = {}) {
  const u = t0 == null ? 1 : EZ.back(ev(t0, o.d ?? 0.25)); if (u <= 0) return;
  const S = RNG('snbl', o.key ?? '', Math.round(x), Math.round(y)), P = ellipsePts(x, y, r * u, r * u * (o.sq ?? 1), 0, 40).map(([px, py], i) => [px + Math.sin(i * 0.9 + S.r(0, 6)) * r * 0.012, py + Math.cos(i * 0.7) * r * 0.012]);
  snFill(P, color, { off: [0, 0], a: o.a ?? 0.92 });
}

// a tiny mind map: centre = { x, y, s (its word), rx, ry, color }, branches = [{ s, a (degrees, 0 = right), len, color, bend }].
// o: t0, stagger, size. The bubble draws, then each branch grows and its label writes on.
function snMindmap(center, branches, o = {}) {
  const t0 = o.t0 ?? -1e9, stag = o.stagger ?? 0.25, size = o.size ?? 44, key = o.key ?? 'mm', rx = center.rx ?? 120, ry = center.ry ?? 64, at = (t) => (t0 < -1e8 ? t0 : t0 + t);
  const out = { branches: [], t1: at(0.3 + branches.length * stag + 0.4) };
  const loop = []; for (let i = 0; i <= 40; i++) { const k = i / 40, a = -2.3 + k * TAU * 1.06; loop.push([center.x + Math.cos(a) * rx * (1 + 0.04 * k), center.y + Math.sin(a) * ry * (1 + 0.04 * k)]); }
  const bu = ev(t0, 0.3);
  if (bu > 0) { ctx.save(); ctx.globalAlpha *= clamp(bu * 2 - 0.6); snFill(ellipsePts(center.x, center.y, rx, ry, 0, 40), center.color ?? SN.yellow, { off: [6, 5] }); ctx.restore(); snLine(loop, { w: 5, part: bu, key: key + 'c' }); }
  snWrite(center.s, center.x, center.y + size * 0.42, size * 1.2, SN.ink, { face: 'letter', align: 'center', t0: at(0.1), speed: 24, key: key + 'ct', jit: 0.6 });
  branches.forEach((b, i) => {
    const bt = at(0.3 + i * stag), a = (b.a ?? 0) * DEG, len = b.len ?? 150, ca = Math.cos(a), sa = Math.sin(a), s0 = [center.x + ca * (rx + 8), center.y + sa * (ry + 8)], e = [s0[0] + ca * len, s0[1] + sa * len];
    const bend = (b.bend ?? (i % 2 ? -0.2 : 0.2)) * len, mid = [(s0[0] + e[0]) / 2 - sa * bend, (s0[1] + e[1]) / 2 + ca * bend], P = [];
    for (let j = 0; j <= 16; j++) { const k = j / 16, m = 1 - k; P.push([m * m * s0[0] + 2 * m * k * mid[0] + k * k * e[0], m * m * s0[1] + 2 * m * k * mid[1] + k * k * e[1]]); }
    const part = ev(bt, 0.25);
    if (part > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; snLine(P, { col: b.color ?? [SN.pink, SN.mint, SN.sky, SN.lilac][i % 4], w: 18, part, key: key + 'bh' + i, amp: 0.5 }); ctx.restore();
      snLine(P, { w: 4, part, key: key + 'b' + i });
      if (part >= 1) { ctx.save(); ctx.fillStyle = SN.ink; ctx.beginPath(); ctx.arc(e[0], e[1], 6, 0, TAU); ctx.fill(); ctx.restore(); }
    }
    const right = ca >= -0.2, lab = snWrite(b.s, e[0] + (right ? 16 : -16), e[1] + size * 0.3, size, SN.navy, { align: right ? 'left' : 'right', t0: t0 < -1e8 ? t0 : bt + 0.2, speed: 20, key: key + 'l' + i });
    out.branches.push({ end: e, label: lab });
  });
  return out;
}
// a formula in a double box with a pastel fill, centred on x, y. o: size, fill, t0
function snFormula(str, x, y, o = {}) {
  const size = o.size ?? 64, t0 = o.t0 ?? -1e9, w = snTextW(str, size, 'letter') + size * 1.1, h = size * 1.7;
  snBox(x - w / 2, y - h / 2, w, h, { t0, d: 0.4, fill: o.fill ?? SN.mint, double: true, key: 'fm' });
  const r = snWrite(str, x, y + size * 0.34, size, o.color ?? SN.ink, { face: 'letter', align: 'center', t0: t0 < -1e8 ? t0 : t0 + 0.25, speed: o.speed ?? 14, key: 'fm' + str, jit: 0.5 });
  return { ...r, x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 };
}
// a definition box: the term lettered on a highlighter band, the meaning ('line\nline') written under it.
// top-left x, y, width w. o: size, termSize, fill (the band), t0, lh. Returns { y1 (its bottom), lines, t1 }.
function snDefinition(term, text, x, y, w, o = {}) {
  const size = o.size ?? 46, ts = o.termSize ?? 56, t0 = o.t0 ?? -1e9, lh = o.lh ?? size * 1.35, L = text.split('\n'), pad = 30, h = pad * 1.6 + ts * 1.15 + L.length * lh, at = (t) => (t0 < -1e8 ? t0 : t0 + t);
  snBox(x, y, w, h, { t0, d: 0.45, key: 'df', w: 5 });
  const tr = snWrite(term, x + pad, y + pad * 0.6 + ts * 0.86, ts, SN.ink, { face: 'letter', t0: at(0.25), speed: 20, key: 'dft' + term, hi: { word: term, color: o.fill ?? SN.yellow, t0: at(0.25 + term.length / 20 + 0.2) }, jit: 0.5 });
  let tt = at(0.25 + term.length / 20 + 0.1); const lines = [tr];
  L.forEach((s, i) => { const r = snWrite(s, x + pad, y + pad * 0.6 + ts * 1.15 + (i + 0.82) * lh, size, SN.navy, { t0: tt, speed: o.speed ?? 18, key: 'df' + i + s }); tt = tt < -1e8 ? tt : r.t1; lines.push(r); });
  return { y1: y + h, lines, t1: tt };
}

// ---------------------------------------------------------------------
//  THE HERO: a short coral-red pencil with a tiny face on its wooden collar. It writes: give it the pen-tip point.
// ---------------------------------------------------------------------
// where the pen is now, from the marks it has to make (snWrite / snUnderline / snDoodle results, bullets' .tick ...):
// on the mark being made it sits on that mark's tip; between marks it rests on the end of the last one and hops over
// to the next one's start in the last o.hop seconds. o: from (where it waits before the first mark), hop, height, rest
// (a point it drifts to o.restAfter seconds after the last mark). Returns { x, y, writing, air (0..1), idle, tilt }.
function snPenAt(marks, o = {}) {
  const M = marks.filter(Boolean).slice().sort((a, b) => a.t0 - b.t0), hop = o.hop ?? 0.25, hh = o.height ?? 70, lean = o.tilt ?? 1.1, tl = (m) => (m && m.tilt != null ? m.tilt : lean);
  let cur = null, prev = null, next = null;
  for (const m of M) { if (TT >= m.t0 && TT < m.t1) cur = m; else if (TT >= m.t1) prev = m; else if (!next) next = m; }
  if (cur) return { x: cur.tip[0], y: cur.tip[1], writing: true, air: 0, idle: false, tilt: tl(cur) + Math.sin(cur.tip[0] * 0.07) * 0.09 };
  const a = prev ? prev.end : o.from ?? (next ? [next.start[0] - 40, next.start[1] - 30] : [0, 0]);
  if (next) {
    const d = Math.min(hop, Math.max(0.085, next.t0 - (prev ? prev.t1 : -1e9))), u = seg(TT, next.t0 - d, next.t0);
    if (u > 0) { const k = EZ.io(u), air = Math.sin(Math.PI * u); return { x: lerp(a[0], next.start[0], k), y: lerp(a[1], next.start[1], k) - air * hh, writing: false, air, idle: false, tilt: lerp(tl(prev), tl(next), k) - air * 0.2 * Math.sign(next.start[0] - a[0] || 1) }; }
  }
  if (!next && prev && o.rest) { const k = EZ.io(seg(TT, prev.t1 + (o.restAfter ?? 0.1), prev.t1 + (o.restAfter ?? 0.1) + 0.3)), air = Math.sin(Math.PI * k); return { x: lerp(a[0], o.rest[0], k), y: lerp(a[1], o.rest[1], k) - air * hh * 0.6, writing: false, air, idle: k >= 1, tilt: lerp(tl(prev), lean, k) }; }
  return { x: a[0], y: a[1], writing: false, air: 0, idle: true, tilt: tl(prev) };
}
// the pencil: x, y = its TIP on the page (o.center: x, y = its middle), r = half its length. o: tilt (lean from
// upright, radians, + = to the right), writing, air, idle, key, color, look. Sets SPARK_AT (the middle, on screen).
function snHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', idle = o.idle ?? (!o.writing && !(o.air > 0)), col = o.color ?? SN.coral;
  const tilt = (o.tilt ?? 1.1) + (idle ? Math.sin(TT * 3.3 + key.length) * 0.06 : 0);          // idle life: it wiggles
  if (o.center) { x -= Math.sin(tilt) * r; y += Math.cos(tilt) * r; }
  if (idle && !o.center) y -= Math.abs(Math.sin(TT * 3.3 + key.length)) * r * 0.05;
  SPARK_AT = toScreen(x + Math.sin(tilt) * r, y - Math.cos(tilt) * r);
  const hw = r * 0.35, yc = -r * 0.82, yb = -r * 1.62, yf = -r * 1.79, ye = -r * 2.0, lw = Math.max(2.6, r * 0.058);
  ctx.save(); ctx.translate(x, y);
  if (!o.center) { ctx.save(); ctx.globalAlpha *= 0.16; ctx.fillStyle = '#3c2814'; ctx.beginPath(); ctx.ellipse(r * 0.5, r * 0.16 + (o.air ?? 0) * r * 0.3, r * (0.62 - 0.2 * (o.air ?? 0)), r * 0.09, -0.12, 0, TAU); ctx.fill(); ctx.restore(); }   // its shadow on the page
  ctx.rotate(tilt); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = SN.ink; ctx.lineWidth = lw;
  const shape = (fill, f) => { ctx.beginPath(); f(); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  shape(SN.eraser, () => { ctx.moveTo(-hw, yf); ctx.lineTo(-hw, ye + hw * 0.6); ctx.quadraticCurveTo(-hw, ye, 0, ye); ctx.quadraticCurveTo(hw, ye, hw, ye + hw * 0.6); ctx.lineTo(hw, yf); });
  shape(SN.wood, () => { ctx.moveTo(0, 0); ctx.lineTo(hw, yc); ctx.lineTo(-hw, yc); });
  shape(col, () => {                                                         // the painted body, scalloped where the wood starts
    ctx.moveTo(-hw, yb); ctx.lineTo(-hw, yc);
    for (let i = 0; i < 3; i++) { const xa = -hw + (i + 0.5) * hw * 2 / 3, xb = -hw + (i + 1) * hw * 2 / 3; ctx.quadraticCurveTo(xa, yc + r * 0.16, xb, yc); }
    ctx.lineTo(hw, yb);
  });
  ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(255,255,255,0.42)'; ctx.lineWidth = hw * 0.3; ctx.beginPath(); ctx.moveTo(-hw * 0.42, yc - r * 0.04); ctx.lineTo(-hw * 0.42, yb + lw); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = hw * 0.36; ctx.beginPath(); ctx.moveTo(hw * 0.62, yc - r * 0.02); ctx.lineTo(hw * 0.62, yb + lw); ctx.stroke(); ctx.restore();
  shape(SN.metal, () => { ctx.moveTo(-hw, yb); ctx.lineTo(hw, yb); ctx.lineTo(hw, yf); ctx.lineTo(-hw, yf); });
  ctx.save(); ctx.lineWidth = lw * 0.6; ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(-hw, (yb + yf) / 2); ctx.lineTo(hw, (yb + yf) / 2); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hw * 0.3, yc * 0.3); ctx.lineTo(-hw * 0.3, yc * 0.3); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke(); ctx.restore();   // the lead
  // the face, on the wood: two eyes that blink, a small smile
  const ey = yc * 0.72, ex = hw * 0.4, blink = (B + key.length * 7) % 37 < 2, look = o.look ?? (o.writing ? 0.6 : 0);
  for (const s of [-1, 1]) {
    if (blink) { ctx.save(); ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(s * ex - r * 0.07, ey); ctx.lineTo(s * ex + r * 0.07, ey); ctx.stroke(); ctx.restore(); continue; }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * ex, ey, r * 0.092, 0, TAU); ctx.fill();
    ctx.fillStyle = SN.ink; ctx.beginPath(); ctx.arc(s * ex + look * r * 0.02, ey + r * 0.022 + look * r * 0.02, r * 0.058, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.lineWidth = lw * 0.75; ctx.beginPath(); ctx.arc(0, yc * 0.5, r * 0.07, 0.25, Math.PI - 0.25); ctx.stroke(); ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  CAPTIONS (through DEFER: after the camera, at screen size). They leave in the first 0.3s of a bridge and stay
//  hidden until it is over; in an era that opens out of a bridge they enter when the bridge ends.
// ---------------------------------------------------------------------
function snLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d - 1e-6) return TT < r.tc ? 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)) : 0; }
  return 1;
}
function snEraIn() {
  if (typeof BRIDGES === 'undefined') return -1e9;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) return r.tc + (r.d ?? 0.6);
  return -1e9;
}
// 'text with a *keyword*' on a sticky-style strip near the bottom of the safe area; the keyword gets a highlighter
// sweep a beat after the line is written. o: y (baseline), size, at (seconds into the era), strip (its colour),
// hi (the highlighter), c (text colour), maxW, rot
function snCaptionNow(str, o = {}) {
  const al = snLeaving(); if (al <= 0.001) return;
  const t0 = Math.max(E0 + (o.at ?? 0.5), snEraIn()), sl = snSlap(t0, 0.5); if (!sl) return;
  const plain = str.replace(/\*/g, ''), kw = (str.match(/\*([^*]+)\*/) || [])[1], maxW = o.maxW ?? Math.min(820, W * 0.76);
  let size = o.size ?? 58; while (size > 50 && snTextW(plain, size) > maxW) size -= 2;
  const w = snTextW(plain, size), y = o.y ?? (PORTRAIT ? H * 0.75 : H * 0.86), pw = w + size * 1.5, ph = size * 1.9, cy = y - size * 0.3, f = size * 0.36;
  ctx.save(); ctx.globalAlpha = al * sl.al; ctx.translate(CX, cy); ctx.rotate((o.rot ?? -0.012) + sl.rot * 0.5); ctx.scale(sl.sc, sl.sc);
  const body = () => { ctx.beginPath(); ctx.moveTo(-pw / 2, -ph / 2); ctx.lineTo(pw / 2, -ph / 2); ctx.lineTo(pw / 2, ph / 2 - f); ctx.lineTo(pw / 2 - f, ph / 2); ctx.lineTo(-pw / 2, ph / 2); ctx.closePath(); };
  ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.30)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 10; ctx.fillStyle = o.strip ?? SN.card; body(); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(120,100,70,0.16)'; ctx.beginPath(); ctx.moveTo(pw / 2, ph / 2 - f); ctx.lineTo(pw / 2 - f, ph / 2 - f); ctx.lineTo(pw / 2 - f, ph / 2); ctx.closePath(); ctx.fill();   // the folded corner
  ctx.fillStyle = o.edge ?? SN.lilac; ctx.globalAlpha *= 0.9; ctx.fillRect(-pw / 2, -ph / 2, 10, ph); ctx.globalAlpha = al * sl.al;                                           // a coloured edge, like a page flag
  const tw = t0 + 0.08, sp = 44;
  snWrite(plain, 5, size * 0.3, size, o.c ?? SN.navy, { align: 'center', t0: tw, speed: sp, key: 'cap' + plain, jit: 0.5, hi: kw ? { word: kw, color: o.hi ?? SN.yellow, t0: tw + plain.length / sp + 0.17 } : null });
  ctx.restore();
}
const snCaption = (str, o) => { const f = () => snCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
// a hand-lettered title on a washi-taped label near the top of the safe area: a small kicker over the headline.
// o: y (the label's top), at, size, kickerSize, hi (the highlighter under the headline), tape, tapeC, rot
function snTitleNow(kicker, headline, o = {}) {
  const al = snLeaving(); if (al <= 0.001) return;
  const t0 = Math.max(E0 + (o.at ?? 0.15), snEraIn()), sl = snSlap(t0, 0.6); if (!sl) return;
  const ks = o.kickerSize ?? 34, maxW = o.maxW ?? Math.min(760, W * 0.7); let size = o.size ?? 66; while (size > 50 && snTextW(headline, size, 'letter') > maxW) size -= 2;
  const K = (kicker || '').toUpperCase(), hw = snTextW(headline, size, 'letter'), kw = K ? snTextW(K, ks, 'letter') : 0;
  const pw = Math.max(hw, kw) + size * 1.3, ph = size * 1.5 + (K ? ks * 1.5 : size * 0.3), top = o.y ?? (PORTRAIT ? H * 0.136 : H * 0.11), cy = top + ph / 2;
  ctx.save(); ctx.globalAlpha = al * sl.al; ctx.translate(CX, cy); ctx.rotate((o.rot ?? -0.018) + sl.rot * 0.5); ctx.scale(sl.sc, sl.sc);
  ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.30)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 10; ctx.fillStyle = o.fill ?? SN.card; ctx.fillRect(-pw / 2, -ph / 2, pw, ph); ctx.restore();
  ctx.strokeStyle = 'rgba(90,75,55,0.18)'; ctx.lineWidth = 1.5; ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  if (K) snWrite(K, 0, -ph / 2 + ks * 1.42, ks, o.kickerC ?? SN.navy, { face: 'letter', align: 'center', t0: t0 + 0.08, speed: 40, key: 'tk' + K, jit: 0.4 });
  const hy = ph / 2 - size * 0.48;
  snWrite(headline, 0, hy, size, SN.ink, { face: 'letter', align: 'center', t0: t0 + 0.12, speed: 36, key: 'th' + headline, jit: 0.6, hi: { word: headline, color: o.hi ?? SN.pink, t0: t0 + 0.12 + headline.length / 36 + 0.17, h: size * 0.62 } });
  if (o.tape !== false) snWashi(-pw * 0.3, -ph / 2 + 2, Math.min(170, pw * 0.36), -0.07, o.tape ?? 'stripes', { t0: t0 + 0.17, color: o.tapeC ?? SN.mint, key: 'tt' });
  ctx.restore();
}
const snTitle = (kicker, headline, o) => { const f = () => snTitleNow(kicker, headline, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract)
// =====================================================================
const STYLE = {
  name: 'study-notes',
  paper: SN.paper,
  // the bare sheet a morph happens on: paper colour c with the page's own rules and margin line (screen space)
  backdrop(c) {
    fillAll(c);
    const G = SN_PG || snGeom();
    ctx.save(); screen();
    if (G.dots) { ctx.fillStyle = '#b4c4d9'; ctx.beginPath(); for (let ly = G.line0 % (G.pitch / 2); ly < H; ly += G.pitch / 2) for (let lx = G.left % (G.pitch / 2); lx < W; lx += G.pitch / 2) { ctx.moveTo(lx + 2.4, ly); ctx.arc(lx, ly, 2.4, 0, TAU); } ctx.fill(); }
    else { ctx.strokeStyle = SN.rule; ctx.lineWidth = 2.4; ctx.beginPath(); for (let ly = G.line0 % G.pitch; ly < H; ly += G.pitch) { ctx.moveTo(0, ly + 0.5); ctx.lineTo(W, ly + 0.5); } ctx.stroke(); }
    ctx.strokeStyle = SN.margin; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(G.marginX, 0); ctx.lineTo(G.marginX, H); ctx.stroke();
    ctx.restore();
  },
  // the era seen through outline P: a piece cut out of the notebook, lifted by a soft shadow, with a fineliner
  // outline drawn twice (the second pass thinner and not quite on the first)
  window(P, key, src) {
    ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.32)'; ctx.shadowBlur = 24; ctx.shadowOffsetX = 8; ctx.shadowOffsetY = 12; trace(P, true); ctx.fillStyle = SN.paper; ctx.fill(); ctx.restore();
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    snLine(P, { closed: true, w: 6, key: key + 'o', amp: 1.2, step: 16, double: true });
  },
  // the morphing shape: a highlighter-colour blob with a pen outline, like a filled-in doodle
  blob(P, c, key) {
    ctx.save(); ctx.shadowColor = 'rgba(70,50,20,0.22)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 9; trace(P, true); ctx.fillStyle = c; ctx.fill(); ctx.restore();
    snLine(P, { closed: true, w: 6, key: key + 'o', amp: 1.2, step: 16, double: true });
  },
  hero(x, y, r, o = {}) { snHero(x, y, r * 0.8, { ...o, center: true, tilt: 0.5 }); },
  heroColor: SN.coral,
  heroPts: (x, y, r) => ellipsePts(x, y, r * 0.5, r * 0.8, 0.5, 96),
  post() { grain({ n: 500, dark: 'rgba(60,56,70,0.05)', light: 'rgba(255,255,255,0.10)' }); },
  ones: false,
};
