// =====================================================================
//  styles/string-art/kit.js — pin-and-thread string art, on top of kit/core.js.
//
//  A dark stained board with visible grain. Small round-headed nails are hammered in along the outlines of
//  shapes, and coloured thread is pulled dead straight from nail to nail. Nothing else exists: every picture is
//  straight thread segments, and every curve is the ENVELOPE of straight chords (nail i to nail i+k round a ring,
//  or two rows of nails laced together). No curve is ever stroked, no area is ever filled with flat colour.
//
//  How it is drawn: place nails (strNailsOn / strCircle / strLine), string them (strFill: a ring with a chord
//  rule; strLace: two rows; strWrap: the outline, nail to nail), then draw the nail heads on top (strNails).
//  Thread is a batch of straight segments stroked three times: a cast shadow, the body (slightly translucent, in
//  a few interleaved groups, so brightness builds where strands cross) and a dashed lighter line (the twist).
//  A finished web (frac >= 1, with a key) is cached as a static layer; the board and the nail heads are cached too.
//
//  Time: on 1s. Nails are tapped in one by one (a bounce and a glint), then ONE thread end travels (`frac`): each
//  strand goes taut with a small twang (the newest segments are drawn plucked: a shallow triangle), wraps round
//  its nail and goes on. A finished web is re-strung by changing its chord step k.
// =====================================================================
const STR = {
  white: '#f6ecd8',     // warm white thread: sails, snow, stars, lettering
  coral: '#ff5a5f',     // THE HERO's thread, reserved for it
  teal: '#22c4ba',      // turquoise: water, the cool subject
  mustard: '#f5b82e',   // mustard: sun, warm subject, the caption's key word
  magenta: '#e2408f',   // a spare fourth colour (use three or four per piece, not all five)
  hi: '#f5b82e',        // the caption's highlighted word
  steel: '#cdd2d8', brass: '#e2b964',
  nail: 6,              // nail head radius
  thread: 3.1,          // thread thickness
  tones: ['walnut', 'ebony'],   // the board of each era (read by STYLE.blob); a piece's bridges.js may replace it
  bridge: [13 / 36, 17 / 36],   // the bridge blob's chord step as a fraction of its 36 nails, from A to B
};
const STR_TONE = {      // [base, the light streak of the grain, the dark streak]
  walnut: ['#2d1c12', '#6e4629', '#110905'],
  ebony: ['#161b27', '#3d4b62', '#05070c'],
  felt: ['#151417', '#3a383f', '#000000'],
};
const STR_CV = {}, STR_L = new Map();
function strCanvas(key, w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; STR_CV[key] = c; return c; }

// ---------------------------------------------------------------------
//  timing (all on TT, on 1s)
//    strIn(t0, d)     0..1, linear
//    strWind(t0, d)   0..1 for a web's `frac`: slow while the pattern is set up, then faster and faster
//    strBeat(every, phase)   a whole-number counter (re-string, twinkle, flap on the beat)
//    strHit(every, hold)     true for `hold` seconds after each beat (the hero's pulse)
// ---------------------------------------------------------------------
const strIn = (t0, d = 0.5) => clamp((TT - t0) / d);
const strWind = (t0, d = 0.8, p = 1.9) => clamp((TT - t0) / d) ** p;
const strBeat = (every = 0.5, phase = 0) => Math.floor(TT / every + phase + 1e-6);
const strHit = (every = 0.5, hold = 0.13) => mod(TT + 1e-6, every) < hold;

// ---------------------------------------------------------------------
//  colour and small geometry
// ---------------------------------------------------------------------
function strRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const strMix = (c, d, k) => { const a = strRGB(c), b = strRGB(d); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`; };
function strPoly(P) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
function strCen(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } x /= P.length; y /= P.length; let r = 0; for (const p of P) r += Math.hypot(p[0] - x, p[1] - y); return [x, y, r / P.length]; }
const strGrow = (P, px) => { const [x, y, r] = strCen(P), k = (r + px) / (r || 1); return P.map((p) => [x + (p[0] - x) * k, y + (p[1] - y) * k]); };
function strSig(S) { let h = 2166136261 >>> 0; for (const p of S) for (const v of p) { h ^= Math.round(v * 4); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + S.length; }
const strGcd = (a, b) => (b ? strGcd(b, a % b) : a);

// ---------------------------------------------------------------------
//  the board (cached): stained planks with grain that bends round a knot, pores, two seams; or matte felt
//    strBoard('walnut' | 'ebony' | 'felt')   draw it as the first thing of a scene (world 0,0 .. W,H)
// ---------------------------------------------------------------------
function strBoardLayer(tone = 'walnut') {
  const key = 'board' + tone; if (STR_CV[key]) return STR_CV[key];
  const cv = strCanvas(key), g = cv.getContext('2d'), R = RNG('strboard', tone), T = STR_TONE[tone] || STR_TONE.walnut;
  g.fillStyle = T[0]; g.fillRect(0, 0, W, H);
  if (tone === 'felt') {   // short fibres in every direction
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath();
      for (let i = 0; i < 15000; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(2, 8); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
      g.stroke();
    }
    return cv;
  }
  const seams = [0, Math.round(W * 0.335 + R.n(18)), Math.round(W * 0.672 + R.n(18)), W];
  for (let p = 0; p < 3; p++) {
    const x0 = seams[p], x1 = seams[p + 1];
    g.fillStyle = R.f() < 0.5 ? T[1] : T[2]; g.globalAlpha = R.r(0.06, 0.2); g.fillRect(x0, 0, x1 - x0, H); g.globalAlpha = 1;
    const kx = R.r(x0 + 70, x1 - 70), ky = R.r(H * 0.12, H * 0.88), ks = R.r(24, 44);
    g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, H); g.clip(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 170; i++) {
      const xs = R.r(x0 - 10, x1 + 10), amp = R.r(2, 11), L = R.r(300, 800), ph = R.r(0, TAU), lt = R.f() < 0.45, dx = xs - kx;
      g.strokeStyle = lt ? T[1] : T[2]; g.globalAlpha = lt ? R.r(0.05, 0.24) : R.r(0.12, 0.45); g.lineWidth = R.r(0.6, 2.8); g.beginPath();
      for (let y = -20; y <= H + 20; y += 20) {
        const dy = (y - ky) / (ks * 2.4);
        const x = xs + amp * Math.sin(y / L * TAU + ph) + 2.5 * Math.sin(y / 85 + ph * 3) + Math.sign(dx || 1) * ks * 1.15 * Math.exp(-dy * dy) * Math.exp(-Math.abs(dx) / (ks * 1.7));
        if (y === -20) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 0.55; g.fillStyle = T[2]; g.beginPath(); g.ellipse(kx, ky, ks * 0.34, ks * 0.62, 0, 0, TAU); g.fill();
    g.strokeStyle = T[2]; g.lineWidth = 1.4;
    for (let j = 1; j < 4; j++) { g.globalAlpha = 0.34 - j * 0.07; g.beginPath(); g.ellipse(kx, ky, ks * (0.34 + j * 0.2), ks * (0.62 + j * 0.42), 0, 0, TAU); g.stroke(); }
    g.restore();
  }
  g.globalAlpha = 0.4; g.fillStyle = T[2]; g.beginPath();
  for (let i = 0; i < 7000; i++) g.rect(Math.floor(R.r(0, W)), Math.floor(R.r(0, H)), 1, Math.floor(R.r(3, 11)));   // pores
  g.fill(); g.globalAlpha = 1;
  for (const x of [seams[1], seams[2]]) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 1.5, 0, 3, H); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 1.5, 0, 1.5, H); }
  const sh = g.createLinearGradient(0, 0, W, H * 0.8);   // a satin sheen across the varnish
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.36, 'rgba(255,240,220,0.07)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  return cv;
}
function strBoard(tone = 'walnut') { ctx.drawImage(strBoardLayer(tone), 0, 0); }

// ---------------------------------------------------------------------
//  nails
//    strCircle(x, y, r, n, rot)          n nails on a circle (nail 0 at the top)
//    strLine(a, b, n)                    n nails from a to b, both ends included
//    strNailsOn(P, n, { closed, corners })   n nails along ANY outline, equally spaced by length;
//                                        corners: true keeps every vertex of P as a nail (stars, hulls, letters)
//    strNails(N, { t0, dur, out, r, metal, glint })   draw the heads (always after the thread).
//        t0: tapped in one by one from t0 over dur seconds (a bounce and a glint each); without t0 they are all there
//        out: pulled again, one by one, from this time. glint: false switches the travelling sheen off
//    strGlint(x, y, s, a)                a four-point sparkle (straight-sided)
// ---------------------------------------------------------------------
const strCircle = (x, y, r, n, rot = -Math.PI / 2) => { const P = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return P; };
const strLine = (a, b, n) => { const P = []; for (let i = 0; i < n; i++) P.push([lerp(a[0], b[0], i / (n - 1)), lerp(a[1], b[1], i / (n - 1))]); return P; };
function strNailsOn(P, n, o = {}) {
  const closed = o.closed ?? true, m = P.length, E = [], out = []; let L = 0;
  for (let i = 0; i < (closed ? m : m - 1); i++) { const a = P[i], b = P[(i + 1) % m], d = dist(a, b); E.push([a, b, d, L]); L += d; }
  if (o.corners) {
    for (const [a, b, d] of E) { const k = Math.max(1, Math.round(n * d / L)); for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]); }
    if (!closed) out.push(P[m - 1].slice());
    return out;
  }
  let e = 0; const cnt = closed ? n : n - 1;
  for (let i = 0; i < n; i++) {
    const s = L * i / cnt; while (e < E.length - 1 && E[e][3] + E[e][2] < s) e++;
    const [a, b, d, l0] = E[e], u = d ? clamp((s - l0) / d) : 0; out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
  }
  return out;
}
function strNailSprite(metal, r) {
  const key = 'nail' + metal + r; if (STR_CV[key]) return STR_CV[key];
  const k = 3, S = Math.ceil(r * 5), cv = document.createElement('canvas'); cv.width = cv.height = S * k;
  const g = cv.getContext('2d'), c = S / 2, base = metal === 'brass' ? STR.brass : STR.steel; g.scale(k, k);
  let gr = g.createRadialGradient(c + r * 0.7, c + r * 0.95, r * 0.15, c + r * 0.7, c + r * 0.95, r * 1.45);     // the cast shadow, down and right
  gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  gr = g.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.08, c, c, r);                                     // the domed head
  gr.addColorStop(0, strMix(base, '#ffffff', 0.8)); gr.addColorStop(0.42, base); gr.addColorStop(1, strMix(base, '#000000', 0.66));
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = Math.max(0.8, r * 0.14); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.96)'; g.beginPath(); g.arc(c - r * 0.33, c - r * 0.38, r * 0.25, 0, TAU); g.fill();   // the specular dot
  return (STR_CV[key] = { cv, S });
}
function strGlint(x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = '#ffffff'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, rr = i % 2 ? s * 0.13 : s; if (i) ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); else ctx.moveTo(x + rr, y); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function strNails(N, o = {}) {
  const r = o.r ?? STR.nail, n = N.length, t0 = o.t0, dur = o.dur ?? Math.min(0.5, n * 0.014), sp = strNailSprite(o.metal ?? 'steel', r);
  const sw = mod(TT, 2.5) * 1500 - 500, G = [];
  for (let i = 0; i < n; i++) {
    const x = N[i][0], y = N[i][1]; let s = 1, gl = 0;
    if (t0 != null) { const age = TT - (t0 + dur * i / n); if (age < -1e-6) continue; s = 1 + 0.75 * Math.exp(-age * 17) * Math.cos(age * 38); if (age < 0.14) gl = 1 - age / 0.14; }
    if (o.out != null && TT >= o.out + (o.outDur ?? 0.25) * (n - 1 - i) / n - 1e-6) continue;
    const d = Math.abs(x * 0.45 + y - sw); if (o.glint !== false && d < 80) gl = Math.max(gl, (1 - d / 80) * 0.75);   // a sheen crosses the board
    const z = sp.S * s; ctx.drawImage(sp.cv, x - z / 2, y - z / 2, z, z);
    if (gl > 0.06) G.push([x - r * 0.33, y - r * 0.38, r * (1 + 2.4 * gl), gl]);
  }
  for (const q of G) strGlint(...q);
}

// ---------------------------------------------------------------------
//  thread
//    strThread(P, { c, w, frac, key, a, g, twang, nails, nr, tip })
//        P: the points the thread passes, in order (or ready-made segments [x1, y1, x2, y2]).
//        frac winds it on: whole strands, then the travelling end; the three newest strands are drawn plucked.
//        a: the body's opacity; g: how many interleaved groups it is stroked in (crossings between groups add up).
//        key: cache the finished web (frac >= 1) as a static layer. nails: where the loops round the nails go
//        (default: every point the thread touches). Returns the travelling end [x, y] while it winds, else null.
//    strFill(N, { k | rule: 'times', m | rule: 'fan', hub, ... })   a ring of nails strung with a chord rule:
//        k: nail i to nail i+k, round and round (the hole in the middle is the envelope: big k = small hole);
//        'times': nail i to nail m*i (m = 2 a cardioid, 3 a nephroid); 'fan': every nail to one hub (a point or an index)
//    strLace(A, B, { shift })   two rows of nails laced A[i] to B[i+shift] in a zigzag. With A running INTO a
//        corner and B running OUT of it this is the parabolic corner: sails, waves, peaks, leaves
//    strWrap(N, { loops, closed, off })   the outline, nail to nail, passing left and right of the nails
// ---------------------------------------------------------------------
function strSegs(P) { const S = []; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 0.5) S.push([a[0], a[1], b[0], b[1]]); } return S; }
function strStroke(g, S, o) {
  const c = o.c, w = o.w, a = o.a ?? 0.92, G = o.g ?? 1, al = g.globalAlpha;
  const path = (i0, step) => { g.beginPath(); for (let i = i0; i < S.length; i += step) { const s = S[i]; g.moveTo(s[0], s[1]); if (s.length > 4) g.lineTo(s[4], s[5]); g.lineTo(s[2], s[3]); } };
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([]);
  g.save(); g.translate(w * 0.8, w * 1.5); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = w * 1.1; path(0, 1); g.stroke(); g.restore();   // the cast shadow
  g.globalAlpha = al * a; g.strokeStyle = strMix(c, '#000000', 0.16); g.lineWidth = w;                                                   // the body
  for (let k = 0; k < G; k++) { path(k, G); g.stroke(); }
  g.globalAlpha = al * Math.min(1, a + 0.05); g.strokeStyle = strMix(c, '#ffffff', 0.42); g.lineWidth = w * 0.42; g.lineCap = 'butt';     // the twist: a dashed lighter ply on the lit side
  g.setLineDash([w * 1.5, w * 1.1]); g.beginPath();
  for (const s of S) {
    const dx = s[2] - s[0], dy = s[3] - s[1], l = Math.hypot(dx, dy) || 1; let nx = dy / l, ny = -dx / l; if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
    const ox = nx * w * 0.2, oy = ny * w * 0.2;
    g.moveTo(s[0] + ox, s[1] + oy); if (s.length > 4) g.lineTo(s[4] + ox, s[5] + oy); g.lineTo(s[2] + ox, s[3] + oy);
  }
  g.stroke(); g.restore();
}
function strLoops(g, pts, c, w, nr) {   // the thread wrapped round each nail: a collar that shows round the head
  const seen = new Set(); g.save(); g.strokeStyle = strMix(c, '#000000', 0.05); g.lineWidth = w * 0.85; g.setLineDash([]); g.beginPath();
  for (const p of pts) { const k = Math.round(p[0]) + ':' + Math.round(p[1]); if (seen.has(k)) continue; seen.add(k); g.moveTo(p[0] + nr, p[1]); g.arc(p[0], p[1], nr, 0, TAU); }
  g.stroke(); g.restore();
}
function strThread(P, o = {}) {
  if (!P.length) return null;
  const S = P[0].length === 2 ? strSegs(P) : P, n = S.length, q = clamp(o.frac ?? 1); if (q <= 0 || !n) return null;
  const c = o.c ?? STR.white, w = o.w ?? STR.thread, st = { c, w, a: o.a, g: o.g }, nr = (o.nr ?? STR.nail) + w * 0.3;
  const ends = (m) => { const E = []; for (let i = 0; i < m; i++) E.push([S[i][0], S[i][1]], [S[i][2], S[i][3]]); return E; };
  if (q >= 1) {
    const loops = o.nails ?? ends(n);
    if (!o.key || c[0] !== '#') { strStroke(ctx, S, st); if (o.loop !== false) strLoops(ctx, loops, c, w, nr); return null; }
    const key = o.key + ':' + c + w + (o.g ?? 1) + (o.a ?? '') + strSig(S); let L = STR_L.get(key);
    if (!L) {
      if (STR_L.size > 90) STR_L.clear();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of S) { x0 = Math.min(x0, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); x1 = Math.max(x1, s[0], s[2]); y1 = Math.max(y1, s[1], s[3]); }
      const pad = Math.ceil(nr + w * 4 + 4); x0 = Math.floor(x0) - pad; y0 = Math.floor(y0) - pad;
      const cv = document.createElement('canvas'); cv.width = Math.ceil(x1) + pad - x0; cv.height = Math.ceil(y1) + pad - y0;
      const g = cv.getContext('2d'); g.translate(-x0, -y0); strStroke(g, S, st); if (o.loop !== false) strLoops(g, loops, c, w, nr);
      L = { cv, x0, y0 }; STR_L.set(key, L);
    }
    ctx.drawImage(L.cv, L.x0, L.y0); return null;
  }
  const p = q * n, full = Math.floor(p), f = p - full, D = S.slice(0, full);
  if (o.twang !== false) for (let i = Math.max(0, full - 3); i < full; i++) {   // the newest strands twang: a plucked string is a shallow triangle
    const s = S[i], dx = s[2] - s[0], dy = s[3] - s[1], l = Math.hypot(dx, dy) || 1, amp = Math.min(o.amp ?? 10, l * 0.07) * Math.exp(-(p - i - 1) * 1.1) * ((F + i) % 2 ? 1 : -1);
    D[i] = [s[0], s[1], s[2], s[3], (s[0] + s[2]) / 2 - dy / l * amp, (s[1] + s[3]) / 2 + dx / l * amp];
  }
  let tip = [S[full][0], S[full][1]];
  if (f > 0.02) { const s = S[full]; tip = [lerp(s[0], s[2], f), lerp(s[1], s[3], f)]; D.push([s[0], s[1], tip[0], tip[1]]); }
  strStroke(ctx, D, st);
  if (o.loop !== false) strLoops(ctx, o.nails ? o.nails.slice(0, Math.ceil(q * o.nails.length)) : ends(full), c, w, nr);
  if (o.tip !== false) { ctx.save(); ctx.fillStyle = strMix(c, '#ffffff', 0.55); ctx.beginPath(); ctx.arc(tip[0], tip[1], w * 1.05, 0, TAU); ctx.fill(); ctx.restore(); }   // the thread's end
  return tip;
}
function strChords(N, o = {}) {
  const n = N.length, P = [], rule = o.rule ?? 'step';
  if (rule === 'times') { const m = o.m ?? 2; for (let i = 1; i < n; i++) { const j = (m * i) % n; if (j !== i) P.push(N[i], N[j]); } }
  else if (rule === 'fan') { const h = typeof o.hub === 'number' ? N[o.hub] : o.hub ?? N[0]; P.push(h); for (let i = 0; i < n; i++) { if (N[i] === h) continue; P.push(N[i]); if (i % 2) P.push(h); } }
  else { const k = clamp(Math.round(o.k ?? n * 0.36), 1, n - 1), g = strGcd(n, k); for (let c = 0; c < g; c++) { let i = c; do { P.push(N[i]); i = (i + k) % n; } while (i !== c); P.push(N[c]); } }
  return P;
}
function strFill(N, o = {}) {
  return strThread(strChords(N, o), { w: STR.thread * 0.8, a: 0.7, g: 4, ...o, key: o.key ? o.key + (o.rule ?? 'k') + (o.k ?? o.m ?? '') : null, nails: N });
}
function strLacePath(A, B, shift = 0) {
  const n = Math.min(A.length, B.length), P = [];
  for (let i = 0; i < n; i++) { const b = B[clamp(i + shift, 0, B.length - 1)]; if (i % 2) P.push(b, A[i]); else P.push(A[i], b); }
  return P;
}
function strLace(A, B, o = {}) { return strThread(strLacePath(A, B, o.shift ?? 0), { w: STR.thread * 0.8, a: 0.74, g: 3, ...o }); }
function strWrap(N, o = {}) {
  const loops = o.loops ?? 2, off = o.off ?? 2.2, closed = o.closed ?? true, n = N.length, S = [];
  for (let l = 0; l < loops; l++) {
    const sg = loops === 1 ? 0 : (l % 2 ? -off : off), m = closed ? n : n - 1;
    for (let j = 0; j < m; j++) {
      const i = !closed && l % 2 ? m - 1 - j : j;                       // an open row is wound there and back
      let a = N[i], b = N[(i + 1) % n]; if (!closed && l % 2) [a, b] = [b, a];
      const d = dist(a, b) || 1, nx = -(b[1] - a[1]) / d * sg * (!closed && l % 2 ? -1 : 1), ny = (b[0] - a[0]) / d * sg * (!closed && l % 2 ? -1 : 1);
      S.push([a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny]);
    }
  }
  return strThread(S, { w: STR.thread * 1.1, a: 0.95, nails: N, ...o });
}

// ---------------------------------------------------------------------
//  ready-made forms
//    strHeart(x, y, r, { frac, beat, t0, key })   THE HERO: a ring of nails on a heart, coral thread. It beats by
//        being re-strung: beat = true strings it with a short step (an open heart), else a long one (a full heart)
//    strStar(x, y, r, { c, frac, alt, t0 })   a five-point star: ten nails, wrapped; alt re-strings it as a pentagram
//    strBird(x, y, s, { c, flap })            a bird: five nails, one thread, re-strung wings up / wings down
// ---------------------------------------------------------------------
function strHeartPts(x, y, r, n = 26) {
  const key = 'heart' + n; let U = STR_L.get(key);
  if (!U) { const P = []; for (let i = 0; i < 180; i++) { const t = i / 180 * TAU, s = Math.sin(t); P.push([16 * s * s * s / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 - 0.12]); } U = strNailsOn(P, n); STR_L.set(key, U); }
  return U.map(([u, v]) => [x + u * r, y + v * r]);
}
function strHeart(x, y, r, o = {}) {
  const N = strHeartPts(x, y, r, o.n ?? 26), n = N.length, c = o.c ?? STR.coral, q = o.frac ?? 1, nr = Math.max(3.2, r * 0.068), w = Math.max(1.8, r * 0.03);
  SPARK_AT = toScreen(x, y);
  strFill(N, { k: Math.round(n * (o.beat ? 0.27 : 0.42)), c, w, nr, frac: clamp(q * 1.5), key: o.key === null ? null : 'heart' + r, a: 0.78 });
  strWrap(N, { c, w: w * 1.25, nr, off: w * 0.7, frac: clamp(q * 3 - 2), key: o.key === null ? null : 'heartw' + r });
  strNails(N, { r: nr, t0: o.t0, dur: 0.3, glint: o.glint });
  if (o.beat) for (let i = 0; i < n; i += 2) strGlint(N[i][0] - nr * 0.3, N[i][1] - nr * 0.35, nr * 2.1, 0.7);
}
function strStarPts(x, y, r, r2 = r * 0.42, rot = -Math.PI / 2) { const P = []; for (let i = 0; i < 10; i++) { const a = rot + i / 10 * TAU, rr = i % 2 ? r2 : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return P; }
function strStar(x, y, r, o = {}) {
  const N = strStarPts(x, y, r, undefined, o.rot), c = o.c ?? STR.white, nr = Math.max(3, r * 0.14), w = Math.max(1.8, r * 0.075);
  if (o.alt) strThread([0, 4, 8, 2, 6, 0].map((i) => N[i]), { c, w, nr, frac: o.frac, nails: N });
  else strWrap(N, { c, w, nr, off: w * 0.6, frac: o.frac });
  strNails(N, { r: nr, t0: o.t0, dur: 0.12 });
}
function strBird(x, y, s, o = {}) {
  const up = [[x - s, y - s * 0.55], [x + s, y - s * 0.55]], dn = [[x - s, y + s * 0.3], [x + s, y + s * 0.3]], b = [x, y], t = o.flap ? dn : up, nr = Math.max(2.6, s * 0.12);
  strWrap([t[0], b, t[1]], { closed: false, c: o.c ?? STR.white, w: Math.max(1.8, s * 0.09), nr, off: 1.2, frac: o.frac });
  strNails([...up, ...dn, b], { r: nr, t0: o.t0, dur: 0.1 });
}

// ---------------------------------------------------------------------
//  lettering: every letter is nails and thread. A stroke font of straight runs on a 4 x 6 grid; a nail at every
//  corner; the thread goes along each stroke and back, so a stroke is two strands side by side.
//    strText(str, x, y, size, { c, align, frac, t0, key, metal, w })   y = the baseline, size = the cap height
//    strTextW(str, size)
// ---------------------------------------------------------------------
const STR_FONT = {
  A: [4, [[0, 6], [2, 0], [4, 6]], [[0.9, 3.9], [3.1, 3.9]]],
  B: [4, [[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  C: [4, [[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [4, [[0, 6], [0, 0], [2.6, 0], [4, 1.5], [4, 4.5], [2.6, 6], [0, 6]]],
  E: [3.6, [[3.6, 0], [0, 0], [0, 6], [3.6, 6]], [[0, 3], [2.8, 3]]],
  F: [3.6, [[3.6, 0], [0, 0], [0, 6]], [[0, 3], [2.8, 3]]],
  G: [4, [[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.3], [2.2, 3.3]]],
  H: [4, [[0, 0], [0, 6]], [[0, 3], [4, 3]], [[4, 0], [4, 6]]],
  I: [0.4, [[0.2, 0], [0.2, 6]]],
  J: [3.4, [[3.4, 0], [3.4, 5], [2.4, 6], [1, 6], [0, 5]]],
  K: [4, [[0, 0], [0, 6]], [[4, 0], [0, 3.6]], [[1.5, 2.5], [4, 6]]],
  L: [3.4, [[0, 0], [0, 6], [3.4, 6]]],
  M: [4.8, [[0, 6], [0, 0], [2.4, 3.8], [4.8, 0], [4.8, 6]]],
  N: [4, [[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [4, [[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  P: [4, [[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.4], [3, 3.4], [0, 3.4]]],
  Q: [4, [[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[2.5, 4.3], [4.2, 6.3]]],
  R: [4, [[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.4], [3, 3.4], [0, 3.4]], [[1.9, 3.4], [4, 6]]],
  S: [4, [[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [4, [[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [4, [[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [4, [[0, 0], [2, 6], [4, 0]]],
  W: [5.2, [[0, 0], [1.2, 6], [2.6, 1.8], [4, 6], [5.2, 0]]],
  X: [4, [[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [4, [[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [4, [[0, 0], [4, 0], [0, 6], [4, 6]]],
  0: [4, [[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  1: [2, [[0, 1.3], [2, 0], [2, 6]]],
  2: [4, [[0, 1], [1, 0], [3, 0], [4, 1], [4, 2.2], [0, 6], [4, 6]]],
  3: [4, [[0, 0], [4, 0], [2, 2.6], [3, 2.6], [4, 3.6], [4, 5], [3, 6], [1, 6], [0, 5]]],
  4: [4, [[3, 6], [3, 0], [0, 4], [4, 4]]],
  5: [4, [[4, 0], [0, 0], [0, 2.6], [3, 2.6], [4, 3.6], [4, 5], [3, 6], [1, 6], [0, 5]]],
  6: [4, [[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.7], [3, 2.8], [0, 2.8]]],
  7: [4, [[0, 0], [4, 0], [1.6, 6]]],
  8: [4, [[1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0]], [[3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3]]],
  9: [4, [[0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0], [0, 1], [0, 2.3], [1, 3.2], [4, 3.2]]],
  '-': [3, [[0.2, 3.2], [2.8, 3.2]]],
  '+': [3, [[0, 3.2], [3, 3.2]], [[1.5, 1.7], [1.5, 4.7]]],
  '/': [3.2, [[0, 6], [3.2, 0]]],
  '!': [0.4, [[0.2, 0], [0.2, 4]], [[0.2, 6]]],
  '?': [4, [[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [2, 3.4], [2, 4.3]], [[2, 6]]],
  '.': [0.4, [[0.2, 6]]],
  ':': [0.4, [[0.2, 2]], [[0.2, 5.4]]],
  ',': [0.8, [[0.7, 5.5], [0.1, 6.9]]],
  "'": [0.4, [[0.2, 0], [0.2, 1.5]]],
};
function strGlyphs(str, size, track = 0.34) {
  const u = size / 6, out = []; let x = 0;
  for (const ch of String(str).toUpperCase()) { const g = STR_FONT[ch]; if (!g) { x += size * 0.5; continue; } out.push({ g, x }); x += g[0] * u + size * track; }
  return { out, w: Math.max(0, x - size * track) };
}
const strTextW = (str, size, track) => strGlyphs(str, size, track).w;
function strText(str, x, y, size, o = {}) {
  const G = strGlyphs(str, size, o.track), u = size / 6, ax = x + (o.align === 'center' ? -G.w / 2 : o.align === 'right' ? -G.w : 0), y0 = y - size;
  const w = o.w ?? Math.max(2, size * 0.058), nr = o.nr ?? Math.max(2.8, size * 0.07), off = w * 0.56, S = [], V = [];
  for (const { g, x: gx } of G.out) for (let s = 1; s < g.length; s++) {
    const P = g[s].map(([a, b]) => [ax + gx + a * u, y0 + b * u]); V.push(...P);
    for (const dir of [1, -1]) for (let j = 0; j < P.length - 1; j++) {   // along the stroke and back: two strands side by side
      const i = dir > 0 ? j : P.length - 2 - j, a = dir > 0 ? P[i] : P[i + 1], b = dir > 0 ? P[i + 1] : P[i], d = dist(a, b) || 1, nx = -(b[1] - a[1]) / d * off, ny = (b[0] - a[0]) / d * off;
      S.push([a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny]);
    }
  }
  if (S.length) strThread(S, { c: o.c ?? STR.white, w, nr, frac: o.frac, a: 0.97, amp: 5, nails: V, key: o.key === null ? null : 'txt' + str + size, tip: o.tip });
  strNails(V, { r: nr, metal: o.metal ?? 'brass', t0: o.t0, dur: o.dur ?? 0.3, glint: o.glint });
  return G.w;
}

// ---------------------------------------------------------------------
//  caption and tag (through DEFER: after the camera, at screen size).
//  The CAPTION is a strip of black felt tacked to the board, a thread frame strung round four brass tacks, and
//  the words wound on in nails and thread: warm white, one *word* in mustard. The TAG is a small felt tab.
//  Both are unwound as a bridge starts.
//    strCaption('NAIL BY *NAIL*', { x (the centre: CX or 500), y (the baseline, 1425), w (800), size (66), at (0.5) })
//    strTag('SEA', { x (60), y (the tab's top, 262), size (40), at (0.25) })
// ---------------------------------------------------------------------
function strBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.2);
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
function strFelt(x0, y0, x1, y1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x0 + 5, y0 + 8, x1 - x0, y1 - y0);
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.drawImage(strBoardLayer('felt'), 0, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
  ctx.restore();
}
function strCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = strBridgeK(); if (k <= 0 || TT < at - 1e-6) return;
  const cx = o.x ?? (typeof CX !== 'undefined' ? CX : W / 2), y = o.y ?? 1425, maxW = o.w ?? 800; let size = o.size ?? 66;
  const toks = String(str).toUpperCase().split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { let tw = 0; toks.forEach((t, i) => { t.w = strTextW(t.s, size); t.gap = i ? size * 0.62 : 0; tw += t.w + t.gap; }); return tw; };
  let tw = lay(); if (tw > maxW) { size *= maxW / tw; tw = lay(); }
  const m = size * 0.62, x0 = cx - tw / 2 - m, x1 = cx + tw / 2 + m, y0 = y - size - m * 0.95, y1 = y + m * 0.95;
  const pop = springEase(TT - at, SPRING.snappy.k, SPRING.snappy.d);
  ctx.save(); ctx.translate(cx, (y0 + y1) / 2); ctx.scale(1, pop); ctx.translate(-cx, -(y0 + y1) / 2);
  strFelt(x0, y0, x1, y1, k);
  ctx.restore();
  const T4 = [[x0 + 13, y0 + 13], [x1 - 13, y0 + 13], [x1 - 13, y1 - 13], [x0 + 13, y1 - 13]];
  strWrap(T4, { c: STR.hi, w: 2, loops: 1, nr: 5, frac: strIn(at + 0.12, 0.3) * k, a: 0.8, twang: false });
  strNails(T4, { r: 5, metal: 'brass', t0: at + 0.04, dur: 0.1 });
  let xx = cx - tw / 2;
  toks.forEach((t, i) => {
    xx += t.gap;
    const t0 = at + 0.2 + i * 0.1;
    if (TT >= t0 - 1e-6) strText(t.s, xx, y, size, { c: t.hi ? STR.hi : STR.white, t0, dur: 0.15, frac: strIn(t0 + 0.12, 0.3) * k, key: k < 1 ? null : undefined, glint: false });
    xx += t.w;
  });
}
function strTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.25), k = strBridgeK(); if (k <= 0 || TT < at - 1e-6) return;
  const x = o.x ?? 60, y = o.y ?? 262, size = o.size ?? 40, w = strTextW(str, size), m = size * 0.55, x1 = x + w + m * 2 + 22, y1 = y + size + m * 2;
  strFelt(x, y, x1, y1, k * strIn(at, 0.1));
  strNails([[x + 16, (y + y1) / 2]], { r: 5, metal: 'brass', t0: at });
  strText(str, x + m + 22, y + m + size, size, { c: o.c ?? STR.white, t0: at + 0.08, dur: 0.15, frac: strIn(at + 0.2, 0.3) * k, key: k < 1 ? null : undefined, glint: false });
}
const strCaption = (str, o = {}) => { const f = () => strCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const strTag = (str, o = {}) => { const f = () => strTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// the room's light falling off towards the corners (cached), drawn over every finished frame
function strVignette() {
  if (STR_CV.vig) return STR_CV.vig;
  const cv = strCanvas('vig'), g = cv.getContext('2d'), gr = g.createRadialGradient(W * 0.46, H * 0.42, H * 0.3, W * 0.5, H * 0.5, H * 0.74);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const R = RNG('strlint'); g.strokeStyle = 'rgba(255,245,225,0.1)'; g.lineWidth = 1; g.beginPath();   // lint: a few stray fibres on the board
  for (let i = 0; i < 260; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(3, 12); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
  g.stroke();
  return cv;
}
// a board cut to an outline, lying on the felt (the morph's plaque): shadow, then `fill` clipped to P
function strPlaque(P, fill) {
  ctx.save(); ctx.translate(7, 11); strPoly(P); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill(); ctx.restore();
  ctx.save(); strPoly(P); ctx.clip(); fill(); ctx.restore();
  ctx.save(); strPoly(P); ctx.strokeStyle = 'rgba(255,235,205,0.13)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();   // the sawn edge catches the light
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'string-art',
  paper: STR_TONE.felt[0],
  // the workbench under the boards: matte black felt. The blended colour is not used: nothing here is flat colour
  backdrop(c, o) { ctx.save(); screen(); ctx.drawImage(strBoardLayer('felt'), 0, 0); ctx.restore(); },
  // the era seen through the bridge shape: its board sawn to that outline, lying on the felt, with a rim of nails
  // strung with short chords in the bridge's colour. The rim is unpicked as the window closes onto the object,
  // whose own ring of nails takes over
  window(P, key, src, o = {}) {
    const u = o.u ?? 0, near = o.phase === 'grow' ? 1 - u : u, a = 1 - smooth(0.62, 0.95, near), c = o.c && o.c[0] === '#' ? o.c : STR.white;
    strPlaque(strGrow(P, 16), () => ctx.drawImage(src, 0, 0));
    if (a > 0.02) {
      const N = strNailsOn(P, 44), m = Math.round(N.length * a);
      strFill(N, { k: 3, c, frac: a, twang: false, tip: false, key: null });
      strWrap(N, { c: STR.white, loops: 1, frac: a, twang: false, tip: false });
      strNails(N.slice(0, Math.max(0, m)), { glint: false });
    }
  },
  // the morphing shape: a ring of 36 nails on a sawn board. The nails move with the outline, and the web is
  // re-strung on the way: its chord step runs from STR.bridge[0] to STR.bridge[1], so the hole in the middle closes
  blob(P, c, key, u = 0, o = {}) {
    const tA = STR.tones[o.eraA ?? 0] ?? 'walnut', tB = STR.tones[o.eraB ?? 1] ?? tA, n = 36, N = [], m = P.length;
    strPlaque(strGrow(P, 16), () => { ctx.drawImage(strBoardLayer(tA), 0, 0); if (tB !== tA) { ctx.globalAlpha = u; ctx.drawImage(strBoardLayer(tB), 0, 0); } });
    for (let i = 0; i < n; i++) { const f = i * m / n, j = Math.floor(f), q = f - j, a = P[j % m], b = P[(j + 1) % m]; N.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q)]); }
    strFill(N, { k: Math.round(n * lerp(STR.bridge[0], STR.bridge[1], u)), c, key: null });
    strWrap(N, { c, key: null });
    strNails(N, { glint: false });
    for (let i = (F % 3); i < n; i += 3) strGlint(N[i][0] - 2, N[i][1] - 2.5, 13, 0.55);   // every nail has just been moved: they glint in turn
  },
  hero(x, y, r, o = {}) { strHeart(x, y, r * 0.9, { key: null, beat: strHit(0.5, 0.13) }); },
  heroColor: STR.coral,
  heroPts(x, y, r) { return strHeartPts(x, y, r * 0.9, 64); },
  post() { ctx.save(); screen(); ctx.drawImage(strVignette(), 0, 0); ctx.restore(); },
  ones: true,
};
