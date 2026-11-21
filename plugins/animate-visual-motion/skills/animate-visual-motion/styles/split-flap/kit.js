// =====================================================================
//  styles/split-flap/kit.js — a mechanical split-flap departure board. Built on kit/core.js.
//  The whole frame is one board: a matte black housing holding a fixed grid of cells, each a pair of hinged flaps
//  (top half, bottom half) with a split line and two hinge pins. A cell shows a character (off-white condensed
//  caps, cut in two by the split) or solid colour (each half its own colour, so pictures have twice the rows).
//  Nothing is drawn freely on the board: a picture is a map of colour flaps, a word is a row of character flaps.
//  A cell changes only by flipping: the top flap falls forward (foreshortened, darkening), its back lands as the
//  new bottom half with a small bounce, and a few flaps of the reel pass before the target. Changes are declared
//  as a program over time (flapBoard) with per-cell wave delays, so the kit can draw any frame on its own.
//  Needs from the piece head: FPS, W, H, CX (caption centre x). Optional: BRIDGES (read by the morph hooks).
// =====================================================================
const FLP = {
  housing: '#16171a', housingD: '#0b0b0d', recess: '#050506',                    // the brushed frame, its dark side, the gap between flaps
  black: '#1b1c20', white: '#ece6d6', yellow: '#f5c21b', red: '#d8362c', blue: '#2e7fe0', green: '#2fa765',   // flap colours
  ink: '#101114', pin: '#9a9da4', dial: '#e8e3d4',                                // a letter on a colour flap, hinge pins, the clock face
  lampA: '#ffb02e', lampG: '#4be07f', lampR: '#ff4a3a',                           // indicator lamps: chase, power, busy
};
const FLAP_COL = { k: FLP.black, w: FLP.white, y: FLP.yellow, r: FLP.red, b: FLP.blue, g: FLP.green };   // one letter per flap colour
const FLAP_FONT = '"DIN Condensed", "Bahnschrift Condensed", "Avenir Next Condensed", "Arial Narrow", "Liberation Sans Narrow", "DejaVu Sans Condensed", "Helvetica Neue", Arial, sans-serif';
const FLAP_REEL = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/!?&+'";   // the order characters sit on a drum
const FLAP_CREEL = 'kwyrbg';                                           // the order colours sit on a drum
const FLAP_BLANK = ' kkw';                                             // a face is 4 letters: character, top colour, bottom colour, letter colour
// the board: cols x rows cells of cw x ch px from (x0, y0); gap = the dark gap round a flap; rate = flaps a second;
// clock = seconds since midnight at t = 0 (the housing clock and b.clock read it)
const FLAP_G = { cols: 16, rows: 18, x0: 60, y0: 256, cw: 60, ch: 84, gap: 4, rate: 12, clock: 6 * 3600 + 59 * 60 + 57 };
function flapSetup(o) { Object.assign(FLAP_G, o); }                    // call before the first board is built or drawn
const flapSig = () => { const G = FLAP_G; return `|${G.cols},${G.rows},${G.x0},${G.y0},${G.cw},${G.ch},${G.gap}`; };
const FLAP_CV = {}, FLAP_MEMO = {};
const flapCv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const flapDim = () => { const G = FLAP_G, fw = G.cw - G.gap, fh = G.ch - G.gap; return { fw, fh, hh: fh / 2, g2: G.gap / 2 }; };
const flapXY = (col, row) => [FLAP_G.x0 + col * FLAP_G.cw, FLAP_G.y0 + row * FLAP_G.ch];   // a cell's top-left corner (px)
const flapCenter = (str, cx = CX) => Math.round((cx - FLAP_G.x0) / FLAP_G.cw - String(str).replace(/\*/g, '').length / 2);   // the column that centres str on cx

// ---------------------------------------------------------------------
//  one flap face (cached): the card in its two colours and the glyph, sized from the font's own cap height so any
//  fallback font fills the flap the same way
// ---------------------------------------------------------------------
function flapFontM() {
  const id = 'font' + flapSig(); if (FLAP_MEMO[id]) return FLAP_MEMO[id];
  const { fw, fh } = flapDim(), g = flapCv(8, 8).getContext('2d');
  g.font = `700 100px ${FLAP_FONT}`;
  const m = g.measureText('H'), cap = m.actualBoundingBoxAscent || 72, capPx = fh * 0.68, fs = 100 * capPx / cap;
  return FLAP_MEMO[id] = { fs, capPx, sx: clamp(fw * 0.64 / (m.width * fs / 100), 0.85, 1.5), base: fh / 2 + capPx / 2 };
}
function flapFace(key) {
  const id = 'f' + key + flapSig(); if (FLAP_CV[id]) return FLAP_CV[id];
  const { fw, fh, hh } = flapDim(), cv = flapCv(fw, fh), g = cv.getContext('2d'), r = Math.min(5, fw * 0.09);
  const ch = key[0], bg = key[1], bg2 = key[2], fg = key[3];
  g.fillStyle = FLAP_COL[bg] || FLP.black; g.beginPath(); g.roundRect(0, 0, fw, hh, [r, r, 0, 0]); g.fill();
  g.fillStyle = FLAP_COL[bg2] || FLP.black; g.beginPath(); g.roundRect(0, hh, fw, hh, [0, 0, r, r]); g.fill();
  if (ch !== ' ') {
    const M = flapFontM();
    g.font = `700 ${M.fs}px ${FLAP_FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = fg === 'k' ? FLP.ink : FLAP_COL[fg] || FLP.white;
    const w = g.measureText(ch).width * M.sx, sx = M.sx * Math.min(1, fw * 0.84 / w);
    g.translate(fw / 2, M.base); g.scale(sx, 1); g.fillText(ch, 0, 0);
    g.strokeStyle = g.fillStyle; g.lineWidth = M.fs * 0.028; g.lineJoin = 'round'; g.strokeText(ch, 0, 0);   // a heavier cut: thin strokes vanish at phone size
  }
  return FLAP_CV[id] = cv;
}
// what sits on every cell, whatever it shows: light on the top flap, the shadow the top flap throws on the bottom
// one, darker sides (the cell is a little box), the split
function flapOverlay() {
  const id = 'ov' + flapSig(); if (FLAP_CV[id]) return FLAP_CV[id];
  const G = FLAP_G, { fw, fh, hh, g2 } = flapDim(), cv = flapCv(G.cw, G.ch), g = cv.getContext('2d');
  let lg = g.createLinearGradient(0, g2, 0, g2 + hh); lg.addColorStop(0, 'rgba(255,255,255,0.11)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lg; g.fillRect(g2, g2, fw, hh);
  g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(g2 + 4, g2, fw - 8, 1.5);
  lg = g.createLinearGradient(0, g2 + hh, 0, g2 + fh); lg.addColorStop(0, 'rgba(0,0,0,0.55)'); lg.addColorStop(0.3, 'rgba(0,0,0,0.10)'); lg.addColorStop(0.7, 'rgba(0,0,0,0.06)'); lg.addColorStop(1, 'rgba(0,0,0,0.26)');
  g.fillStyle = lg; g.fillRect(g2, g2 + hh, fw, hh);
  lg = g.createLinearGradient(g2, 0, g2 + fw, 0); lg.addColorStop(0, 'rgba(0,0,0,0.30)'); lg.addColorStop(0.16, 'rgba(0,0,0,0)'); lg.addColorStop(0.84, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.30)');
  g.fillStyle = lg; g.fillRect(g2, g2, fw, fh);
  g.fillStyle = 'rgba(0,0,0,0.92)'; g.fillRect(g2, g2 + hh - 1.5, fw, 3);
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(g2 + 3, g2 + hh + 1.5, fw - 6, 1);
  return FLAP_CV[id] = cv;
}
function flapPins() {   // the two hinge pins, in front of everything
  const id = 'pin' + flapSig(); if (FLAP_CV[id]) return FLAP_CV[id];
  const G = FLAP_G, { fw, hh, g2 } = flapDim(), cv = flapCv(G.cw, G.ch), g = cv.getContext('2d'), y = g2 + hh;
  for (const x of [g2 - 1, g2 + fw - 4]) {
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(x - 1, y - 6, 7, 12);
    g.fillStyle = FLP.pin; g.fillRect(x, y - 5, 5, 10);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x, y - 5, 5, 2);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y + 2, 5, 3);
  }
  return FLAP_CV[id] = cv;
}

// ---------------------------------------------------------------------
//  one cell at a flip phase. A and B are sources: a face canvas, { img, sx, sy } (a cell cut out of another canvas),
//  or { t, b } (a different source for each half).
//    flapCell(x, y, A)                    A at rest
//    flapCell(x, y, A, B, p)              p 0..1: A's top flap falls (p < 0.5), its back (B's bottom half) lands (p > 0.5)
//    flapCell(x, y, A, B, 1, { lift })    B has landed and bounces: its bottom flap is lifted by `lift` radians
//  o.raw = the sources already carry the cell's shading (a cut-out of a drawn board): only the split and pins are added
// ---------------------------------------------------------------------
function flapBlit(S, top, fx, fy, sc = 1, wide = 0) {
  const { fw, hh } = flapDim(), s = S.t ? (top ? S.t : S.b) : S, img = s.img || s, h = hh * sc;
  if (h < 0.5) return;
  ctx.drawImage(img, s.sx || 0, (s.sy || 0) + (top ? 0 : hh), fw, hh, fx - wide, top ? fy + hh - h : fy + hh, fw + 2 * wide, h);
}
function flapCell(x, y, A, B, p = 0, o = {}) {
  const { fw, fh, hh, g2 } = flapDim(), fx = x + g2, fy = y + g2, lift = o.lift || 0;
  if (!B || (p <= 0 && !lift)) { flapBlit(A, true, fx, fy); flapBlit(A, false, fx, fy); }
  else if (lift) {
    const s = Math.cos(lift);
    flapBlit(B, true, fx, fy); flapBlit(A, false, fx, fy);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(fx, fy + hh, fw, hh);              // what is left of the old flap sits in shadow
    flapBlit(B, false, fx, fy, s, 1.2 * Math.sin(lift));
    ctx.fillStyle = `rgba(0,0,0,${(0.3 * Math.sin(lift)).toFixed(3)})`; ctx.fillRect(fx, fy + hh, fw, hh * s);
  } else {
    const th = p * Math.PI, cs = Math.cos(th), sn = Math.sin(th), wide = 2.4 * sn;      // it swings toward the viewer: a hair wider
    flapBlit(B, true, fx, fy); flapBlit(A, false, fx, fy);
    if (p < 0.5) {
      const h = hh * cs, y0 = fy + hh - h;
      ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(fx, fy, fw, hh - h);             // the new top face, still under the falling flap's shadow
      flapBlit(A, true, fx, fy, cs, wide);
      ctx.fillStyle = `rgba(0,0,0,${(0.58 * sn).toFixed(3)})`; ctx.fillRect(fx - wide, y0, fw + 2 * wide, h);
      ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.fillRect(fx - wide, y0, fw + 2 * wide, 2);   // the flap's free edge catches the light
    } else {
      const h = hh * -cs, y1 = fy + hh + h;
      const lg = ctx.createLinearGradient(0, y1, 0, y1 + 14); lg.addColorStop(0, 'rgba(0,0,0,0.6)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg; ctx.fillRect(fx, y1, fw, Math.min(14, fy + fh - y1));        // its shadow on the old bottom face
      flapBlit(B, false, fx, fy, -cs, wide);
      ctx.fillStyle = `rgba(0,0,0,${(0.42 * sn).toFixed(3)})`; ctx.fillRect(fx - wide, fy + hh, fw + 2 * wide, h);
      ctx.fillStyle = 'rgba(255,255,255,0.34)'; ctx.fillRect(fx - wide, y1 - 2, fw + 2 * wide, 2);
    }
  }
  if (o.raw) { ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(fx, fy + hh - 1.5, fw, 3); } else ctx.drawImage(flapOverlay(), x, y);
  ctx.drawImage(flapPins(), x, y);
}
// the landing: two small bounces of the bottom flap (radians of lift, t seconds after it landed)
function flapBounce(t) {
  if (t < 0) return 0;
  if (t < 0.085) { const x = t / 0.085; return 34 * DEG * 4 * x * (1 - x); }
  t -= 0.085;
  if (t < 0.045) { const x = t / 0.045; return 11 * DEG * 4 * x * (1 - x); }
  return 0;
}

// ---------------------------------------------------------------------
//  wave order: the delay (seconds) before cell (c, r) starts flipping, inside box [c0, r0, c1, r1]
//    o.wave: 'lr' | 'rl' | 'tb' | 'bt' | 'diag' | 'radial' (from o.from = [col, row], default the box centre) | 'rand' | 'none'
//    o.gap: seconds per cell of distance (0.03); o.jit: extra random delay per cell; o.span: the range of 'rand' in cells
// ---------------------------------------------------------------------
function flapWave(o, c, r, box) {
  const w = o.wave || 'lr', gap = o.gap ?? 0.03, from = o.from || [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], R = RNG('flapw', o.key ?? '', c, r);
  const d = w === 'lr' ? c - box[0] : w === 'rl' ? box[2] - c : w === 'tb' ? (r - box[1]) * 2 : w === 'bt' ? (box[3] - r) * 2
    : w === 'diag' ? (c - box[0]) + (r - box[1]) * 1.4 : w === 'radial' ? Math.hypot(c - from[0], (r - from[1]) * 1.4) : w === 'rand' ? R.r(0, o.span ?? 8) : 0;
  return d * gap + (o.jit ? R.r(0, o.jit) : 0);
}
const flapParse = (str) => { const out = []; let hi = false; for (const ch of String(str).toUpperCase()) { if (ch === '*') hi = !hi; else out.push({ ch, hi }); } return out; };   // '*word*' = highlighted
// the faces a cell passes on its way to `to`: the n - 1 before it on the drum, then the target
function flapSeq(from, to, n) {
  const ch = to[0], bg = to[1], fg = to[3], out = [from], text = ch !== ' ' || to === FLAP_BLANK;
  for (let i = n - 1; i >= 1; i--) {
    if (text) { const k = Math.max(0, FLAP_REEL.indexOf(ch)), c = FLAP_REEL[mod(k - i, FLAP_REEL.length)]; out.push(c + bg + bg + fg); }
    else { const c = FLAP_CREEL[mod(FLAP_CREEL.indexOf(bg) - i, FLAP_CREEL.length)]; out.push(' ' + c + c + fg); }
  }
  out.push(to);
  return out;
}

// ---------------------------------------------------------------------
//  the board program: flapBoard(key, (b) => { ... }) declares what the board shows over time (absolute seconds).
//  It is compiled once into a list of flips per cell; flapDraw(board) draws any frame from it.
//    b.text(t, col, row, 'WORDS *HI*', o)        a row of characters; *..* = black letters on yellow flaps
//                                                o: fg, bg, hiFg, hiBg, flips (flaps per cell, 4), + the wave options
//    b.pic(t, col, hrow, MAP, o)                 a picture of colour flaps from a string map. One map row = HALF a
//                                                cell row (hrow counts half rows), letters k w y r b g, '.' = leave;
//                                                o.pal = { letter: colour letter }, o.erase = flip the map's cells back to black
//    b.shape(t, P, 'y', o)                       any outline (px) filled with colour flaps
//    b.clear(t, c0, r0, c1, r1, o)               flip a block of cells back to blank
//    b.flick(t, col, hrow, MAP, 'w', o)          the map's cells flip to colour `via` and back (a pulse, a twinkle)
//    b.sprite(MAP, [[t, col, hrow], ...], o)     a small picture that sits OVER the board and hops from place to place
//                                                ([t, null] hides it); the cells it leaves flip back to what is under it.
//                                                The last sprite declared is the hero (SPARK_AT) unless o.hero === false
//    b.clock(t0, t1, col, row, o)                HH:MM:SS from FLAP_G.clock, one flap on each second
//    b.stray(t0, t1, { n, box, key })            n blank cells that flip through a character or two and settle back
//    b.set(t, col, row, patch, o)                one cell: patch = { ch, bg, bg2, fg }
// ---------------------------------------------------------------------
function flapBoard(key, build) {
  const id = 'board:' + key + flapSig(); if (FLAP_MEMO[id]) return FLAP_MEMO[id];
  const G = FLAP_G, ev = [];
  let hero = null;
  const push = (t, col, row, patch, o = {}) => {
    if (col < 0 || row < 0 || col >= G.cols || row >= G.rows) return;
    ev.push({ tq: Math.round(t * FPS), idx: row * G.cols + col, patch, flips: Math.max(1, o.flips ?? 3), layer: o.layer || 0, force: !!o.force, viaP: o.viaP, viaSeq: o.viaSeq, blankOnly: !!o.blankOnly, i: ev.length });
  };
  const eachPx = (map, col, hrow, fn) => map.forEach((s, j) => { for (let i = 0; i < s.length; i++) { const m = s[i]; if (m !== '.' && m !== ' ') fn(col + i, Math.floor((hrow + j) / 2), mod(hrow + j, 2), m); } });
  const boxOf = (map, col, hrow) => [col, Math.floor(hrow / 2), col + Math.max(...map.map((s) => s.length)) - 1, Math.floor((hrow + map.length - 1) / 2)];
  const b = {
    set: push,
    text(t, col, row, str, o = {}) {
      const toks = flapParse(str), box = [col, row, col + toks.length - 1, row];
      toks.forEach((k, i) => { const bg = k.hi ? o.hiBg ?? 'y' : o.bg ?? 'k'; push(t + flapWave(o, col + i, row, box), col + i, row, { ch: k.ch, bg, bg2: bg, fg: k.hi ? o.hiFg ?? 'k' : o.fg ?? 'w' }, { flips: 4, ...o }); });
    },
    pic(t, col, hrow, map, o = {}) {
      const box = boxOf(map, col, hrow);
      eachPx(map, col, hrow, (c, r, half, m) => { const k = o.erase ? 'k' : (o.pal && o.pal[m]) || m; if (FLAP_COL[k]) push(t + flapWave({ wave: 'radial', gap: 0.045, ...o }, c, r, box), c, r, half ? { ch: ' ', bg2: k } : { ch: ' ', bg: k }, o); });
    },
    shape(t, P, c, o = {}) {
      const bb = bbox(P), c0 = Math.floor((bb.x0 - G.x0) / G.cw), h0 = Math.floor((bb.y0 - G.y0) / (G.ch / 2)), map = [];
      for (let h = h0; G.y0 + h * G.ch / 2 < bb.y1; h++) { let s = ''; for (let cc = c0; G.x0 + cc * G.cw < bb.x1; cc++) s += flapInside(P, G.x0 + (cc + 0.5) * G.cw, G.y0 + (h + 0.5) * G.ch / 2) ? c : '.'; map.push(s); }
      b.pic(t, c0, h0, map, o);
    },
    clear(t, c0, r0, c1, r1, o = {}) {
      const box = [c0, r0, c1, r1];
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) push(t + flapWave(o, c, r, box), c, r, { ch: ' ', bg: 'k', bg2: 'k', fg: 'w' }, { flips: 2, ...o });
    },
    flick(t, col, hrow, map, via, o = {}) {
      const box = boxOf(map, col, hrow);
      eachPx(map, col, hrow, (c, r, half) => push(t + flapWave({ wave: 'radial', gap: 0.04, ...o }, c, r, box), c, r, {}, { force: true, viaP: half ? { bg2: via } : { bg: via } }));
    },
    sprite(map, track, o = {}) {
      let prev = null;
      track.forEach(([t, col, hrow], n) => {
        if (prev) eachPx(map, prev[0], prev[1], (c, r, half) => push(t, c, r, half ? { bg2: null } : { bg: null }, { layer: 1, flips: o.flips ?? 1 }));
        prev = col == null ? null : [col, hrow];
        if (prev) { const box = boxOf(map, col, hrow); eachPx(map, col, hrow, (c, r, half, m) => push(t + (n ? 0 : flapWave({ wave: 'radial', gap: 0.04 }, c, r, box)), c, r, half ? { bg2: m } : { bg: m }, { layer: 1, flips: n ? o.flips ?? 1 : o.inFlips ?? 3 })); }
      });
      if (o.hero !== false) hero = { map, track: track.map(([t, col, hrow]) => [(Math.round(t * FPS) - 0.5) / FPS, col, hrow]) };
    },
    clock(t0, t1, col, row, o = {}) {
      const p2 = (v) => String(v).padStart(2, '0'), fmt = (s) => { s = mod(s, 86400); return `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`; };
      b.text(t0, col, row, fmt(G.clock + Math.floor(t0)), { flips: 3, ...o });
      for (let s = Math.floor(t0) + 1; s <= t1 + 1e-6; s++) b.text(s, col, row, fmt(G.clock + s), { ...o, flips: 1, wave: 'none', jit: 0 });
    },
    stray(t0, t1, o = {}) {
      const R = RNG('flapstray', key, o.key ?? ''), box = o.box || [0, 0, G.cols - 1, G.rows - 1], chars = FLAP_REEL.slice(1, 37);
      for (let i = 0; i < (o.n ?? 8); i++) {
        const c = R.i(box[0], box[2]), r = R.i(box[1], box[3]), t = R.r(t0, t1), a = R.pick(chars), a2 = R.pick(chars), two = R.f() < 0.5;
        push(t, c, r, {}, { force: true, blankOnly: true, viaSeq: two ? [a + 'kkw', a2 + 'kkw'] : [a + 'kkw'] });
      }
    },
  };
  build(b);
  // compile: fold each cell's events (in time order; events on the same frame are one change) into flips
  const by = new Map(); for (const e of ev) { if (!by.has(e.idx)) by.set(e.idx, []); by.get(e.idx).push(e); }
  const cells = new Array(G.cols * G.rows).fill(null), land = [];
  for (const [idx, L] of by) {
    L.sort((a, c) => a.tq - c.tq || a.i - c.i);
    const base = { ch: ' ', bg: 'k', bg2: 'k', fg: 'w' }, over = { bg: null, bg2: null }, list = [];
    const eff = () => (over.bg || over.bg2 ? ' ' : base.ch) + (over.bg || base.bg) + (over.bg2 || base.bg2) + (over.bg || over.bg2 ? 'w' : base.fg);
    let cur = FLAP_BLANK, i = 0;
    while (i < L.length) {
      const tq = L[i].tq; let force = false, flips = 1, viaP = null, viaSeq = null, blankOnly = false;
      while (i < L.length && L[i].tq === tq) { const e = L[i++]; Object.assign(e.layer ? over : base, e.patch); flips = Math.max(flips, e.flips); if (e.force) { force = true; if (e.viaP) viaP = { ...viaP, ...e.viaP }; if (e.viaSeq) viaSeq = e.viaSeq; blankOnly = blankOnly || e.blankOnly; } }
      const now = eff();
      if (now === cur && (!force || (blankOnly && now !== FLAP_BLANK))) continue;
      let seq;
      if (now !== cur) seq = flapSeq(cur, now, flips);
      else if (viaSeq) seq = [cur, ...viaSeq, now];
      else seq = [cur, cur[0] + (viaP.bg || cur[1]) + (viaP.bg2 || cur[2]) + cur[3], now];
      const t0 = (tq - 0.5) / FPS;
      list.push({ t0, seq });
      for (let k = 1; k < seq.length; k++) land.push([t0 + k / G.rate, idx % G.cols]);
      cur = now;
    }
    if (list.length) cells[idx] = list;
  }
  return FLAP_MEMO[id] = { key, cells, land, hero };
}
// flap landings per frame, for the score: [[t, how many flaps land, pan -1..1], ...] in time order
function flapActivity(board) {
  const m = new Map();
  for (const [t, col] of board.land) { const f = Math.round(t * FPS); if (!m.has(f)) m.set(f, [0, 0]); const v = m.get(f); v[0]++; v[1] += col; }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([f, [n, sc]]) => [f / FPS, n, clamp((sc / n / Math.max(1, FLAP_G.cols - 1)) * 2 - 1, -1, 1) * 0.6]);
}
// draw the board's cells at time TT (blank cells at rest are not drawn: the housing already shows them).
// Returns how many cells are moving. Words are reported to the text check with an invisible fillText per run.
function flapDraw(board) {
  const G = FLAP_G, rate = G.rate; let busy = 0;
  const shown = new Array(G.cols * G.rows);
  for (let idx = 0; idx < board.cells.length; idx++) {
    const L = board.cells[idx]; if (!L) continue;
    let i = -1; for (let k = 0; k < L.length && L[k].t0 <= TT + 1e-9; k++) i = k;
    if (i < 0) continue;
    const c = L[i], n = c.seq.length - 1, tau = (TT - c.t0) * rate, k = Math.floor(tau + 1e-9), [x, y] = flapXY(idx % G.cols, Math.floor(idx / G.cols));
    shown[idx] = c.seq[n][0];
    if (k < n) { flapCell(x, y, flapFace(c.seq[k]), flapFace(c.seq[k + 1]), tau - k); busy++; }
    else {
      const lift = flapBounce((tau - n) / rate);
      if (lift > 0) { flapCell(x, y, flapFace(c.seq[n - 1]), flapFace(c.seq[n]), 1, { lift }); busy++; }
      else if (c.seq[n] !== FLAP_BLANK) flapCell(x, y, flapFace(c.seq[n]));
    }
  }
  const M = flapFontM();
  ctx.save(); ctx.font = `700 ${M.fs}px ${FLAP_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(0,0,0,0)';
  for (let r = 0; r < G.rows; r++) {
    let run = '', c0 = 0;
    for (let c = 0; c <= G.cols; c++) {
      const ch = c < G.cols ? shown[r * G.cols + c] : null, has = ch && ch !== ' ', nx = c + 1 < G.cols ? shown[r * G.cols + c + 1] : null;
      if (has) { if (!run) c0 = c; run += ch; }
      else if (run && nx && nx !== ' ') run += ' ';
      else if (run) { if (run.length > 1) ctx.fillText(run, G.x0 + c0 * G.cw + G.gap, G.y0 + r * G.ch + G.gap / 2 + M.base, run.length * G.cw - 2 * G.gap); run = ''; }
    }
  }
  ctx.restore();
  if (board.hero) {
    const h = board.hero; let p = null; for (const k of h.track) if (k[0] <= TT + 1e-9) p = k;
    if (p && p[1] != null) SPARK_AT = toScreen(G.x0 + (p[1] + Math.max(...h.map.map((s) => s.length)) / 2) * G.cw, G.y0 + (p[2] + h.map.length / 2) * G.ch / 2);
  }
  return busy;
}

// ---------------------------------------------------------------------
//  geometry between outlines and cells
// ---------------------------------------------------------------------
function flapInside(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const flapCen = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// how far (x, y) is from the centroid, as a fraction of the outline's reach in that direction (< 1 = inside)
function flapRho(P, cx, cy, x, y) {
  const dx = x - cx, dy = y - cy; if (Math.abs(dx) + Math.abs(dy) < 1e-6) return 0;
  let best = 0;
  for (let i = 0, n = P.length; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
    const t = ((a[0] - cx) * ey - (a[1] - cy) * ex) / den, s = ((a[0] - cx) * dy - (a[1] - cy) * dx) / den;
    if (t > best && s >= -1e-6 && s <= 1 + 1e-6) best = t;
  }
  return best > 0 ? 1 / best : 9;
}
// the outline (px) of a picture map placed at (col, hrow): the bridge shape of a picture
function flapMapPts(map, col = 0, hrow = 0) {
  const G = FLAP_G, on = (i, j) => j >= 0 && j < map.length && i >= 0 && i < map[j].length && map[j][i] !== '.' && map[j][i] !== ' ';
  const E = new Map(), add = (x0, y0, x1, y1) => { const k = x0 + ',' + y0; if (!E.has(k)) E.set(k, []); E.get(k).push([x1, y1]); };
  for (let j = 0; j < map.length; j++) for (let i = 0; i < map[j].length; i++) {
    if (!on(i, j)) continue;
    if (!on(i, j - 1)) add(i, j, i + 1, j); if (!on(i + 1, j)) add(i + 1, j, i + 1, j + 1); if (!on(i, j + 1)) add(i + 1, j + 1, i, j + 1); if (!on(i - 1, j)) add(i, j + 1, i, j);
  }
  let best = [];
  while (E.size) {
    const start = E.keys().next().value, loop = []; let k = start;
    while (E.has(k)) { const outs = E.get(k), p = outs.pop(); if (!outs.length) E.delete(k); loop.push(k.split(',').map(Number)); k = p[0] + ',' + p[1]; if (k === start) break; }
    if (loop.length > best.length) best = loop;
  }
  const out = best.filter((p, i) => { const a = best[(i - 1 + best.length) % best.length], c = best[(i + 1) % best.length]; return (p[0] - a[0]) * (c[1] - p[1]) !== (p[1] - a[1]) * (c[0] - p[0]); });
  return out.map(([x, y]) => [G.x0 + (col + x) * G.cw, G.y0 + (hrow + y) * G.ch / 2]);
}
// the nearest flap colour (letter) to a colour the renderer hands over ('#rrggbb' or 'rgb(r,g,b)')
function flapNearest(c) {
  const rgb = (s) => (s[0] === '#' ? [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) : (String(s).match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number));
  const v = rgb(c); let best = 'w', bd = 1e9;
  for (const k of Object.keys(FLAP_COL)) { const q = rgb(FLAP_COL[k]), d = (q[0] - v[0]) ** 2 + (q[1] - v[1]) ** 2 + (q[2] - v[2]) ** 2; if (d < bd) { bd = d; best = k; } }
  return best;
}
// a picture map drawn at rest (no program): the hero in a bridge, a still
function flapStamp(map, col, hrow) {
  const G = FLAP_G, cells = new Map();
  map.forEach((s, j) => { for (let i = 0; i < s.length; i++) { const m = s[i]; if (!FLAP_COL[m]) continue; const c = col + i, r = Math.floor((hrow + j) / 2), k = r * G.cols + c; if (c < 0 || r < 0 || c >= G.cols || r >= G.rows) continue; if (!cells.has(k)) cells.set(k, ['k', 'k']); cells.get(k)[mod(hrow + j, 2)] = m; } });
  for (const [k, [a, b]] of cells) { const [x, y] = flapXY(k % G.cols, Math.floor(k / G.cols)); flapCell(x, y, flapFace(' ' + a + b + 'w')); }
}

// ---------------------------------------------------------------------
//  the housing (cached): a brushed dark frame, the recess with every cell blank, screws, a station clock, a speaker
//  grille, indicator lamps. flapLive draws what moves on it: the clock's hands and the lamps.
// ---------------------------------------------------------------------
function flapLayout() {
  const G = FLAP_G, m = 16, by1 = G.y0 + G.rows * G.ch, hh = G.y0 - m, fy = (by1 + m + H) / 2, cy = hh / 2 + 4, cr = Math.max(20, Math.min(88, hh / 2 - 26));
  const lamps = []; for (let i = 0; i < 6; i++) lamps.push([W - 118 - (5 - i) * 60, cy, 13, i === 0 ? 'g' : i === 5 ? 'r' : i - 1]);
  for (let i = 0; i < 2; i++) lamps.push([118 + i * 60, fy, 11, i ? 3 : 1]);
  return { m, by1, hh, fy, clock: [150, cy, cr], lamps, header: hh > 120, footer: H - by1 - m > 70 };
}
function flapHousing() {
  const id = 'housing' + flapSig() + W + 'x' + H; if (FLAP_CV[id]) return FLAP_CV[id];
  const G = FLAP_G, L = flapLayout(), cv = flapCv(W, H), g = cv.getContext('2d'), R = RNG('flaphousing'), bw = G.cols * G.cw, bh = G.rows * G.ch, m = L.m;
  let lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#202125'); lg.addColorStop(0.45, FLP.housing); lg.addColorStop(1, '#101113');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.lineWidth = 1;                                                             // brushed: long horizontal hairs
  for (let i = 0; i < 3200; i++) { const y = Math.floor(R.r(0, H)) + 0.5, x = R.r(-200, W), l = R.r(60, 420); g.strokeStyle = R.f() < 0.5 ? `rgba(255,255,255,${R.r(0.012, 0.05).toFixed(3)})` : `rgba(0,0,0,${R.r(0.05, 0.18).toFixed(3)})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.08)'; g.strokeRect(9, 9, W - 18, H - 18); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeRect(12, 12, W - 24, H - 24);
  // the recess the flaps sit in
  g.fillStyle = 'rgba(255,255,255,0.09)'; g.beginPath(); g.roundRect(G.x0 - m - 2, G.y0 - m - 1, bw + 2 * m + 4, bh + 2 * m + 4, 12); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.roundRect(G.x0 - m - 2, G.y0 - m - 3, bw + 2 * m + 4, bh + 2 * m + 3, 12); g.fill();
  g.fillStyle = FLP.recess; g.beginPath(); g.roundRect(G.x0 - m, G.y0 - m, bw + 2 * m, bh + 2 * m, 10); g.fill();
  const blank = flapFace(FLAP_BLANK), ov = flapOverlay(), pins = flapPins(), g2 = G.gap / 2;
  for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) { const [x, y] = flapXY(c, r); g.drawImage(blank, x + g2, y + g2); g.drawImage(ov, x, y); g.drawImage(pins, x, y); }
  lg = g.createLinearGradient(0, G.y0 - m, 0, G.y0 + 26); lg.addColorStop(0, 'rgba(0,0,0,0.75)'); lg.addColorStop(1, 'rgba(0,0,0,0)');   // the frame's shadow on the top row
  g.fillStyle = lg; g.fillRect(G.x0 - m, G.y0 - m, bw + 2 * m, m + 26);
  const screw = (x, y, a) => {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(x, y + 1.5, 10, 0, TAU); g.fill();
    const rg = g.createRadialGradient(x - 3, y - 3, 1, x, y, 9); rg.addColorStop(0, '#4a4d54'); rg.addColorStop(1, '#232428'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 8.5, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - Math.cos(a) * 6, y - Math.sin(a) * 6); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.stroke();
  };
  [[32, 32], [W - 32, 32], [32, H - 32], [W - 32, H - 32], [32, H / 2], [W - 32, H / 2]].forEach(([x, y]) => screw(x, y, R.r(0, Math.PI)));
  const slots = (x0, x1, y0, y1, n) => { const w = (x1 - x0) / (2 * n - 1); for (let i = 0; i < n; i++) { const x = x0 + i * 2 * w; g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.roundRect(x + 1, y0 + 1.5, w, y1 - y0, w / 2); g.fill(); g.fillStyle = '#050506'; g.beginPath(); g.roundRect(x, y0, w, y1 - y0, w / 2); g.fill(); } };
  const socket = (x, y, r) => { g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(x, y + 1.5, r + 5, 0, TAU); g.fill(); g.fillStyle = '#08080a'; g.beginPath(); g.arc(x, y, r + 5, 0, TAU); g.fill(); g.fillStyle = '#2a211a'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, TAU); g.fill(); };
  if (L.header) {
    const [cx, cy, cr] = L.clock;                                              // the station clock: rim, face, ticks
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.arc(cx, cy + 2, cr + 11, 0, TAU); g.fill();
    g.fillStyle = '#060607'; g.beginPath(); g.arc(cx, cy, cr + 10, 0, TAU); g.fill();
    const rg = g.createRadialGradient(cx - cr * 0.3, cy - cr * 0.4, cr * 0.1, cx, cy, cr); rg.addColorStop(0, '#f3eee0'); rg.addColorStop(1, '#d6d0c0'); g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();
    g.strokeStyle = FLP.ink; g.lineCap = 'butt';
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, big = i % 5 === 0, r0 = cr * (big ? 0.74 : 0.86), r1 = cr * 0.93; g.lineWidth = big ? cr * 0.075 : cr * 0.025; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
    slots(300, 520, cy - 46, cy + 46, 9);                                      // the speaker grille
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(40, L.hh - 13, W - 80, 2); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(40, L.hh - 11, W - 80, 1.5);
  }
  if (L.footer) slots(300, W - 110, L.fy - 22, L.fy + 22, 22);
  L.lamps.forEach(([x, y, r], i) => { if (i < 6 ? L.header : L.footer) socket(x, y, r); });
  return FLAP_CV[id] = cv;
}
function flapLive(busy = 0) {
  const L = flapLayout();
  L.lamps.forEach(([x, y, r, kind], i) => {
    if (!(i < 6 ? L.header : L.footer)) return;
    const on = kind === 'g' ? 1 : kind === 'r' ? (busy > 0 ? 0.5 + 0.5 * clamp(busy / 14) : 0) : Math.floor(TT * 4 + 1e-6) % 4 === kind ? 1 : 0;
    if (on <= 0) return;
    const col = kind === 'g' ? FLP.lampG : kind === 'r' ? FLP.lampR : FLP.lampA;
    ctx.save(); ctx.globalAlpha = on;
    const rg = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2); rg.addColorStop(0, col + '88'); rg.addColorStop(1, col + '00'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.38, 0, TAU); ctx.fill();
    ctx.restore();
  });
  if (!L.header) return;
  const [cx, cy, cr] = L.clock, s = FLAP_G.clock + Math.floor(TT + 1e-6), ft = TT - Math.floor(TT + 1e-6);
  const hand = (a, len, w, c, tail = 0.12) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(cx - Math.sin(a) * -len * tail * -1, cy + Math.cos(a) * len * tail); ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); ctx.stroke(); };
  hand(mod(s / 3600, 12) / 12 * TAU, cr * 0.5, cr * 0.085, FLP.ink);
  hand(mod(s / 60, 60) / 60 * TAU, cr * 0.76, cr * 0.06, FLP.ink);
  const sa = (mod(s, 60) + 0.35 * Math.exp(-ft * 16) * Math.cos(ft * 55)) / 60 * TAU;   // the second hand jumps and rings a little
  hand(sa, cr * 0.82, cr * 0.028, FLP.red, 0.28);
  ctx.fillStyle = FLP.red; ctx.beginPath(); ctx.arc(cx + Math.sin(sa) * cr * 0.6, cy - Math.cos(sa) * cr * 0.6, cr * 0.07, 0, TAU); ctx.fill();
  ctx.fillStyle = FLP.ink; ctx.beginPath(); ctx.arc(cx, cy, cr * 0.07, 0, TAU); ctx.fill();
}
// a scene: the housing, the board at time TT, the lamps and the clock
function flapScene(board) { ctx.drawImage(flapHousing(), 0, 0); flapLive(board ? flapDraw(board) : 0); }

// ---------------------------------------------------------------------
//  the hero: a small bluebird of colour flaps (6 x 3 cells). In a piece it is a sprite on the board:
//  b.sprite(FLAP_BIRD, [[t, col, hrow], ...]) — each hop is a handful of cells flipping.
// ---------------------------------------------------------------------
const FLAP_BIRD = ['...bb.', 'b..bwy', 'bbbbb.', '.bbbb.', '..bb..', '..y.y.'];
function flapHero(x, y, r) {   // at rest, snapped to the grid; (x, y) = its centre in px
  const G = FLAP_G, col = Math.round((x - G.x0) / G.cw - 3), hrow = Math.round((y - G.y0) / (G.ch / 2) - 3);
  flapStamp(FLAP_BIRD, col, hrow);
  SPARK_AT = toScreen(G.x0 + (col + 3) * G.cw, G.y0 + (hrow + 3) * G.ch / 2);
}

// ---------------------------------------------------------------------
//  captions (through DEFER): a row of the board's own cells that flips in left to right and flips back to blank
//  as the next bridge starts (it is gone before the morph). '*word*' sits on yellow flaps. Keep the row free of other board content.
//    flapCaption('EVERY *GOODBYE*', { row, col, at, out, flips })     flapTag('GATE 4', { row, col, at })
// ---------------------------------------------------------------------
function flapCaptionNow(str, o = {}) {
  const G = FLAP_G, at = E0 + (o.at ?? 0.5), row = o.row ?? 13, n = flapParse(str).length, col = o.col ?? clamp(flapCenter(str), 0, G.cols - n);
  const br = typeof BRIDGES !== 'undefined' ? BRIDGES.find((r) => r.tc > E0 + 1e-6) : null, out = o.out != null ? E0 + o.out : br ? br.tc - (br.d ?? 0.6) - 0.08 : 1e9;
  const bd = flapBoard(['cap', str, E0, row, col, at, out].join('|'), (b) => {
    b.text(at, col, row, str, { flips: o.flips ?? 4, gap: 0.035, ...o });
    if (out < 1e8) b.clear(out, col, row, col + n - 1, row, { flips: 1, gap: 0.008 });
  });
  flapDraw(bd);
  return bd;
}
const flapCaption = (str, o = {}) => { const f = () => flapCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const flapTag = (str, o = {}) => flapCaption(str, { row: 0, col: 0, at: 0.15, ...o });

// ---------------------------------------------------------------------
//  the finish: darker corners, a little dust on the housing (cached)
// ---------------------------------------------------------------------
function flapFinish() {
  const id = 'finish' + W + 'x' + H; if (FLAP_CV[id]) return FLAP_CV[id];
  const cv = flapCv(W, H), g = cv.getContext('2d'), R = RNG('flapfinish');
  const rg = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.45, W / 2, H * 0.5, Math.hypot(W, H) * 0.58); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.42)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) { g.fillStyle = R.f() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; g.fillRect(Math.floor(R.r(0, W)), Math.floor(R.r(0, H)), 2, 2); }
  return FLAP_CV[id] = cv;
}

// ---------------------------------------------------------------------
//  morph hooks. A bridge is read from the piece's BRIDGES by its key so the hooks know both shapes and both colours.
// ---------------------------------------------------------------------
function flapBridge(key) {
  if (typeof BRIDGES === 'undefined') return null;
  const tc = parseFloat(String(key).replace(/^[a-zA-Z]+/, '')), r = BRIDGES.find((q) => Math.abs(q.tc - tc) < 1e-6); if (!r) return null;
  const id = 'bridge' + r.tc + flapSig(); if (FLAP_MEMO[id]) return FLAP_MEMO[id];
  const sh = (s) => (s.spark ? { P: STYLE.heroPts(...s.spark), c: STYLE.heroColor } : s), A = sh(r.A()), Bs = sh(r.B());
  return FLAP_MEMO[id] = { tc: r.tc, D: r.d ?? 0.6, M: r.m ?? (r.d != null ? r.d / 3 : 0.2), A, B: Bs, RA: byAngle(A.P).P, RB: byAngle(Bs.P).P, cA: flapNearest(A.c), cB: flapNearest(Bs.c), faces: {} };
}
// the morphing region at time t: one face per cell. The outline blends from A to B; cells inside are colour flaps,
// and the colour changes from the middle outward
function flapBlobFaces(br, t) {
  const fk = Math.round(t * FPS * 8); if (br.faces[fk]) return br.faces[fk];
  const G = FLAP_G, u = EZ.io(seg(t, br.tc - br.M, br.tc + br.M));
  const P = u <= 0 ? br.A.P : u >= 1 ? br.B.P : br.RA.map((p, i) => [lerp(p[0], br.RB[i][0], u), lerp(p[1], br.RB[i][1], u)]);
  const [cx, cy] = flapCen(P), thr = (seg(t, br.tc - br.M, br.tc + br.M) - 0.04) / 0.62 * 1.3, out = new Array(G.cols * G.rows);   // the colour runs on plain time, ahead of the outline
  for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
    const x = G.x0 + (c + 0.5) * G.cw, y = G.y0 + r * G.ch, a = flapRho(P, cx, cy, x, y + G.ch * 0.25), b = flapRho(P, cx, cy, x, y + G.ch * 0.75);
    out[r * G.cols + c] = ' ' + (a < 1 ? (a < thr ? br.cB : br.cA) : 'k') + (b < 1 ? (b < thr ? br.cB : br.cA) : 'k') + 'w';
  }
  return br.faces[fk] = out;
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'split-flap',
  paper: FLP.housingD,
  // the board with every flap blank. The blended colour is not used: a flap cannot show an in-between colour
  backdrop(c, o) { ctx.save(); screen(); ctx.drawImage(flapHousing(), 0, 0); flapLive(o ? 9 : 0); ctx.restore(); },
  // the era seen through the bridge shape, cell by cell: a half cell whose middle is inside shows the era's flap.
  // The edge of the window is a wave of flips: cells just outside a closing window are falling to blank, cells
  // just inside an opening one are landing
  window(P, key, src, o = {}) {
    const G = FLAP_G, { g2 } = flapDim(), [cx, cy] = flapCen(P), blank = flapFace(FLAP_BLANK), grow = o.phase === 'grow', L = 0.7;
    const br = flapBridge(key), k0 = br && grow ? Math.exp(Math.log(maskK(br.B.P).kmax) * (o.u ?? 0)) : 0;   // how far the window has opened: the bridge object's own cells never flip
    ctx.save(); screen();
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const [x, y] = flapXY(c, r), mx = x + G.cw / 2;
      const inT = flapRho(P, cx, cy, mx, y + G.ch * 0.25) < 1, inB = flapRho(P, cx, cy, mx, y + G.ch * 0.75) < 1, rc = flapRho(P, cx, cy, mx, y + G.ch / 2), lg = Math.log(Math.max(rc, 1e-3));
      const S = { img: src, sx: x + g2, sy: y + g2 }, now = inT && inB ? S : inT ? { t: S, b: blank } : inB ? { t: blank, b: S } : null;
      if (!grow && lg > 0 && lg < L) flapCell(x, y, S, now || blank, lg / L, { raw: true });
      else if (grow && lg < 0 && lg > -L && rc * k0 >= 0.9) flapCell(x, y, blank, S, -lg / L, { raw: true });
      else if (inT && inB) ctx.drawImage(src, x, y, G.cw, G.ch, x, y, G.cw, G.ch);
      else if (now) flapCell(x, y, now, null, 0, { raw: true });
    }
    ctx.restore();
  },
  // the morphing shape: a region of colour flaps. Every cell whose face differs from the frame before flips to it
  // (two frames and a bounce), so the outline creeps by whole flaps and the colour turns over from the middle out
  blob(P, c, key, u = 0) {
    const G = FLAP_G, br = flapBridge(key);
    ctx.save(); screen();
    if (!br) {
      const [cx, cy] = flapCen(P), k = flapNearest(c);
      for (let r = 0; r < G.rows; r++) for (let cc = 0; cc < G.cols; cc++) { const [x, y] = flapXY(cc, r), a = flapRho(P, cx, cy, x + G.cw / 2, y + G.ch * 0.25) < 1, b = flapRho(P, cx, cy, x + G.cw / 2, y + G.ch * 0.75) < 1; if (a || b) flapCell(x, y, flapFace(' ' + (a ? k : 'k') + (b ? k : 'k') + 'w')); }
      ctx.restore(); return;
    }
    const hist = []; for (let j = 0; j <= 6; j++) hist.push(flapBlobFaces(br, TT - j / FPS));
    for (let i = 0; i < G.cols * G.rows; i++) {
      let j = 1; while (j <= 6 && hist[j - 1][i] === hist[j][i]) j++;
      const [x, y] = flapXY(i % G.cols, Math.floor(i / G.cols)), now = hist[0][i];
      if (j > 6) { if (now !== FLAP_BLANK) flapCell(x, y, flapFace(now)); continue; }
      const tau = (j - 0.5) / FPS * G.rate, from = flapFace(hist[j][i]), to = flapFace(hist[j - 1][i]);
      if (tau < 1) flapCell(x, y, from, to, tau);
      else { const lift = flapBounce((tau - 1) / G.rate); if (lift > 0) flapCell(x, y, from, to, 1, { lift }); else if (now !== FLAP_BLANK) flapCell(x, y, flapFace(now)); }
    }
    ctx.restore();
  },
  hero(x, y, r) { ctx.save(); screen(); flapHero(x, y, r); ctx.restore(); },
  heroColor: FLP.blue,
  heroPts(x, y, r) { return rrectPts(x - r * 0.85, y - r * 0.75, r * 1.7, r * 1.5, r * 0.3); },
  post() { ctx.save(); screen(); ctx.drawImage(flapFinish(), 0, 0); ctx.restore(); },
  ones: true,
};
