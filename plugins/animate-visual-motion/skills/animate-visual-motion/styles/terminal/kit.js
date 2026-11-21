// =====================================================================
//  styles/terminal/kit.js — a text-mode world on an old CRT terminal. The whole picture lives on a fixed
//  character grid (30x60 px cells: 36 columns x 32 rows at 1080x1920). Everything is a character in a cell:
//  box-drawing frames, block and shade characters, typed text, bars, spinners, an ASCII robot. Shapes are
//  rasterised to the grid by sampling coverage per cell (trmFill). Nothing sits between cells, nothing is
//  rotated or scaled: movement is whole-cell steps. A post pass adds phosphor bloom, scanlines, a vignette,
//  a rounded bezel and a rare flicker.   Built on kit/core.js (RNG, EZ, geometry, TT / F / E0 / DEFER).
//  Needs from the piece head: W, H, CX (caption centre x).  Optional from the piece (src/bridges.js):
//    ERA_THEME = ['green', 'cyan', ...]   each era's phosphor (a TRM_THEMES key); the STYLE hooks use it
//  Scenes draw inside trmScreen(theme, () => { ... }) with CELL coordinates (col 0..35, row 0..31): calls
//  write into a screen buffer (later writes replace earlier ones, like a real terminal), flushed once.
//  Box, block, shade and dot characters are drawn as rectangles (they always join and fill their cells);
//  every other character comes from the system monospace font through a per-colour glyph atlas.
// =====================================================================
const TRM = { amber: '#ffb000', black: '#020503' };   // the one accent (the hero, the highlighted word) and the bezel
const TRM_THEMES = {   // bg = the dark tube, ink = the phosphor, dim = half brightness, hi = the hot near-white, panel = a lit strip
  green: { bg: '#06120a', ink: '#33ff66', dim: '#178a3a', hi: '#d9ffe2', panel: '#0d3118', accent: '#ffb000' },
  cyan:  { bg: '#04121a', ink: '#4de8ff', dim: '#1c7f96', hi: '#e3fbff', panel: '#0a2f3d', accent: '#ffb000' },
  amber: { bg: '#140c02', ink: '#ffb000', dim: '#8f6200', hi: '#fff0c4', panel: '#33230a', accent: '#5cf2ff' },
};
const TRM_FONT = 'Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';
const TRM_CW = 30, TRM_CH = 60, TRM_FS = 50, TRM_BASE = 47;   // cell size, font size, baseline inside the cell
const TRM_COLS = Math.ceil(W / TRM_CW), TRM_ROWS = Math.ceil(H / TRM_CH);
let trmT = TRM_THEMES.green;   // the current theme (set by trmScreen)
let trmBuf = null;             // the current screen buffer

const trmThemeOf = (t) => (typeof t === 'string' ? TRM_THEMES[t] || TRM_THEMES.green : t || TRM_THEMES.green);
const trmEraTheme = (e) => trmThemeOf(typeof ERA_THEME !== 'undefined' ? ERA_THEME[e] : 'green');
const trmStep = (rate, t0 = 0) => Math.floor((TT - t0) * rate + 1e-6);   // a whole-number clock: steps `rate` times a second

// ---------------------------------------------------------------------
//  the screen buffer: one character, one colour and an optional background per cell
// ---------------------------------------------------------------------
function trmNew() { const n = TRM_COLS * TRM_ROWS; return { ch: new Array(n).fill(''), fg: new Array(n).fill(''), bg: new Array(n).fill('') }; }
function trmSet(col, row, ch, fg, bg) {
  col = Math.round(col); row = Math.round(row);
  if (!trmBuf || col < 0 || row < 0 || col >= TRM_COLS || row >= TRM_ROWS) return;
  const i = row * TRM_COLS + col;
  trmBuf.ch[i] = ch === ' ' ? '' : ch; trmBuf.fg[i] = fg || trmT.ink; if (bg !== undefined) trmBuf.bg[i] = bg || '';
}
const trmGet = (col, row) => (trmBuf && col >= 0 && row >= 0 && col < TRM_COLS && row < TRM_ROWS ? trmBuf.ch[row * TRM_COLS + col] : '');
// write a string from (col, row); a space clears its cell. o.bg = a cell background, o.inv = inverse video. Returns the next column.
function trmPut(col, row, str, fg, o = {}) {
  const c = fg || trmT.ink, chars = Array.from(String(str));
  chars.forEach((ch, k) => { if (o.inv) trmSet(col + k, row, ch, trmT.bg, c); else trmSet(col + k, row, ch, c, o.bg); });
  return col + chars.length;
}
function trmClear(col, row, w, h, bg) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) trmSet(col + i, row + j, '', '', bg || ''); }

// ---------------------------------------------------------------------
//  glyphs: box / block / shade / dot characters are rectangles; the rest is the monospace font, cached per colour
// ---------------------------------------------------------------------
const TRM_BOX = { '╵': 1, '╶': 2, '└': 3, '╷': 4, '│': 5, '┌': 6, '├': 7, '╴': 8, '┘': 9, '─': 10, '┴': 11, '┐': 12, '┤': 13, '┬': 14, '┼': 15 };   // bits: N 1, E 2, S 4, W 8
const TRM_BOXCH = ['', '╵', '╶', '└', '╷', '│', '┌', '├', '╴', '┘', '─', '┴', '┐', '┤', '┬', '┼'];
const TRM_SHADE = ['░', '▒', '▓', '█'];
function trmIsDrawn(ch) { const k = ch.codePointAt(0); return (k >= 0x2500 && k <= 0x259f) || ch === '•' || ch === '●'; }
function trmPaintGlyph(g, ch, fg) {   // one character at the origin of a cell
  const cw = TRM_CW, hh = TRM_CH, k = ch.codePointAt(0), box = TRM_BOX[ch];
  g.fillStyle = fg;
  if (box) {
    const lw = 4, x = cw / 2 - lw / 2, y = hh / 2 - lw / 2;
    if (box & 1) g.fillRect(x, 0, lw, y + lw);
    if (box & 4) g.fillRect(x, y, lw, hh - y);
    if (box & 2) g.fillRect(x, y, cw - x, lw);
    if (box & 8) g.fillRect(0, y, x + lw, lw);
  } else if (k >= 0x2581 && k <= 0x2588) { const h = Math.round(hh * (k - 0x2580) / 8); g.fillRect(0, hh - h, cw, h); }   // ▁..█ lower eighths
  else if (ch === '▀') g.fillRect(0, 0, cw, hh / 2);
  else if (ch === '▔') g.fillRect(0, 0, cw, 8);
  else if (ch === '▌') g.fillRect(0, 0, cw / 2, hh);
  else if (ch === '▐') g.fillRect(cw / 2, 0, cw / 2, hh);
  else if (ch === '░' || ch === '▒' || ch === '▓') {   // a 5 px dot screen that tiles from cell to cell: 25 / 50 / 75 %
    g.beginPath();
    for (let j = 0; j < hh / 5; j++) for (let i = 0; i < cw / 5; i++) {
      const on = ch === '▒' ? (i + j) % 2 === 0 : ch === '░' ? i % 2 === 0 && j % 2 === 0 : !(i % 2 === 1 && j % 2 === 1);
      if (on) g.rect(i * 5, j * 5, 5, 5);
    }
    g.fill();
  } else if (ch === '•' || ch === '●') { const r = ch === '•' ? 7 : 11; g.fillRect(cw / 2 - r, hh / 2 - r + 2, r * 2, r * 2); }   // square phosphor dots
  else { g.font = `700 ${TRM_FS}px ${TRM_FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(ch, cw / 2, TRM_BASE); }
}
const TRM_ATLAS = new Map(), TRM_PAD = 4;
function trmGlyph(ch, fg) {
  const key = ch + '|' + fg; let cv = TRM_ATLAS.get(key);
  if (!cv) {
    if (TRM_ATLAS.size > 1600) TRM_ATLAS.clear();
    cv = document.createElement('canvas'); cv.width = TRM_CW + TRM_PAD * 2; cv.height = TRM_CH + TRM_PAD * 2;
    const g = cv.getContext('2d'); g.translate(TRM_PAD, TRM_PAD); trmPaintGlyph(g, ch, fg); TRM_ATLAS.set(key, cv);
  }
  return cv;
}
// draw a buffer: backgrounds, then glyphs; words are reported to the text check with an invisible fillText of the run
function trmFlush(buf) {
  const n = TRM_COLS * TRM_ROWS;
  for (let i = 0; i < n; i++) if (buf.bg[i]) { ctx.fillStyle = buf.bg[i]; ctx.fillRect((i % TRM_COLS) * TRM_CW, Math.floor(i / TRM_COLS) * TRM_CH, TRM_CW, TRM_CH); }
  for (let i = 0; i < n; i++) if (buf.ch[i]) ctx.drawImage(trmGlyph(buf.ch[i], buf.fg[i]), (i % TRM_COLS) * TRM_CW - TRM_PAD, Math.floor(i / TRM_COLS) * TRM_CH - TRM_PAD);
  ctx.save(); ctx.font = `700 ${TRM_FS}px ${TRM_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(0,0,0,0)';
  for (let r = 0; r < TRM_ROWS; r++) {
    let run = '', c0 = 0;
    for (let c = 0; c <= TRM_COLS; c++) {
      const ch = c < TRM_COLS ? buf.ch[r * TRM_COLS + c] : '', texty = ch && !trmIsDrawn(ch);
      const next = c + 1 < TRM_COLS ? buf.ch[r * TRM_COLS + c + 1] : '';
      if (texty) { if (!run) c0 = c; run += ch; }
      else if (run && !ch && next && !trmIsDrawn(next)) run += ' ';   // one blank between words keeps the run
      else if (run) { if (run.length > 1) ctx.fillText(run, c0 * TRM_CW, r * TRM_CH + TRM_BASE, run.length * TRM_CW); run = ''; }
    }
  }
  ctx.restore();
}
// a scene: clear the tube to the theme's ground, run draw() against a fresh buffer, flush it
function trmScreen(theme, draw) {
  trmT = trmThemeOf(theme);
  ctx.fillStyle = trmT.bg; ctx.fillRect(0, 0, TRM_COLS * TRM_CW, TRM_ROWS * TRM_CH);
  const keep = trmBuf; trmBuf = trmNew(); draw(trmT); trmFlush(trmBuf); trmBuf = keep;
}
// cells drawn straight to the screen at screen size (captions, hooks): no ground fill
function trmOverlay(theme, draw) {
  const keepT = trmT, keep = trmBuf; trmT = trmThemeOf(theme); trmBuf = trmNew();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); draw(trmT); trmFlush(trmBuf); ctx.restore();
  trmBuf = keep; trmT = keepT;
}

// ---------------------------------------------------------------------
//  lines and boxes in box-drawing characters (crossings merge into the right junction: ┬ ┼ ┤ ...)
// ---------------------------------------------------------------------
function trmEdge(col, row, bits, fg) { trmSet(col, row, TRM_BOXCH[(TRM_BOX[trmGet(col, row)] || 0) | bits], fg); }
function trmLine(c0, r0, c1, r1, fg) {   // horizontal, vertical, or an L (across first, then down)
  if (r0 === r1 || c0 !== c1) { const a = Math.min(c0, c1), b = Math.max(c0, c1); for (let c = a; c <= b; c++) trmEdge(c, r0, (c > a ? 8 : 0) | (c < b ? 2 : 0), fg); }
  if (r0 !== r1) { const a = Math.min(r0, r1), b = Math.max(r0, r1); for (let r = a; r <= b; r++) trmEdge(c1, r, (r > a ? 1 : 0) | (r < b ? 4 : 0), fg); }
}
function trmRule(col, row, w, fg) { for (let i = 0; i < w; i++) trmEdge(col + i, row, 10, fg); }   // a full-width rule: both ends reach their cell edges
function trmBox(col, row, w, h, fg, o = {}) {   // a frame w x h cells; o.title sits in the top edge, o.bg fills the inside
  trmClear(col, row, w, h, o.bg);
  trmLine(col, row, col + w - 1, row, fg); trmLine(col, row + h - 1, col + w - 1, row + h - 1, fg);
  trmLine(col, row, col, row + h - 1, fg); trmLine(col + w - 1, row, col + w - 1, row + h - 1, fg);
  if (o.title) trmPut(col + 2, row, ' ' + o.title + ' ', o.titleC || trmT.hi);
}

// ---------------------------------------------------------------------
//  shapes: any outline rasterised to the grid (8 samples per cell -> shade, half-block or full block)
// ---------------------------------------------------------------------
function trmInside(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
}
function trmCellBox(P) {
  const q = bbox(P), bb = { x: q.x0, y: q.y0, w: q.x1 - q.x0, h: q.y1 - q.y0 };
  return [Math.max(0, Math.floor(q.x0 / TRM_CW)), Math.max(0, Math.floor(q.y0 / TRM_CH)), Math.min(TRM_COLS - 1, Math.floor(q.x1 / TRM_CW)), Math.min(TRM_ROWS - 1, Math.floor(q.y1 / TRM_CH)), bb];
}
// fill outline P (screen px) with shade characters. o.shade: 'ball' (lit from the top left, the default), a number 0..1,
// or (x, y) => 0..1 (0 ░ ... 1 █). o.where(x, y) limits it to some cells. Edges become ▀ ▄ ▌ ▐ or a lighter shade.
function trmFill(P, fg, o = {}) {
  const [c0, r0, c1, r1, bb] = trmCellBox(P), sh = o.shade ?? 'ball', cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
  const tone = typeof sh === 'function' ? sh : typeof sh === 'number' ? () => sh : (x, y) => clamp(0.66 - 0.5 * ((x - cx) / (bb.w / 2 || 1) + (y - cy) / (bb.h / 2 || 1)) / 1.4, 0.27, 1);
  const pick = (t) => TRM_SHADE[t >= 0.75 ? 3 : t >= 0.5 ? 2 : t >= 0.25 ? 1 : 0];
  let cells = 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const x = (c + 0.5) * TRM_CW, y = (r + 0.5) * TRM_CH;
    if (o.where && !o.where(x, y)) continue;
    let top = 0, bot = 0, lef = 0, rig = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) if (trmInside(P, (c + (i + 0.5) / 2) * TRM_CW, (r + (j + 0.5) / 4) * TRM_CH)) { if (j < 2) top++; else bot++; if (i) rig++; else lef++; }
    const n = top + bot; if (!n) continue;
    const tn = tone(x, y), full = pick(tn), solid = tn >= 0.5;   // only a bright fill gets solid half-block edges
    const ch = n >= 7 ? full : solid && bot >= 3 && top <= 1 ? '▄' : solid && top >= 3 && bot <= 1 ? '▀' : solid && lef >= 3 && rig <= 1 ? '▌' : solid && rig >= 3 && lef <= 1 ? '▐'
      : n >= 5 ? (full === '█' ? '▓' : full) : '';   // cells under 5 samples that are not a clean half are dropped: no nubs on the silhouette
    if (ch) { trmSet(c, r, ch, fg); cells++; }
  }
  return cells;
}
function trmMask(P) {   // which cells have their centre inside P (a cell-quantised hole)
  const M = new Uint8Array(TRM_COLS * TRM_ROWS), [c0, r0, c1, r1] = trmCellBox(P);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (trmInside(P, (c + 0.5) * TRM_CW, (r + 0.5) * TRM_CH)) M[r * TRM_COLS + c] = 1;
  return M;
}

// ---------------------------------------------------------------------
//  text and widgets: typing, cursor, check lines, bars, spinners, charts, tables, bubbles
// ---------------------------------------------------------------------
const trmTyped = (str, t0, cps = 16) => clamp(trmStep(cps, t0), 0, Array.from(str).length);   // characters typed so far
const trmBlink = (period = 0.5) => mod(TT, period) < period / 2 - 1e-6;
function trmCursor(col, row, fg, solid) { if (solid || trmBlink()) trmSet(col, row, '█', fg || trmT.hi); }
// type a string at a steady rate from t0; o.cursor draws the block cursor after it. Returns true once it is all there.
function trmType(col, row, str, t0, fg, o = {}) {
  const chars = Array.from(str), n = trmTyped(str, t0, o.cps ?? 16);
  if (TT < t0 - 1e-6) return false;
  trmPut(col, row, chars.slice(0, n).join(''), fg, o);
  if (o.cursor) trmCursor(col + n, row, o.cursorC, n < chars.length);
  return n >= chars.length;
}
// "label ........ oke": the dots tick across between t0 and t1, then the answer lands in the hot colour
function trmCheck(col, row, label, t0, t1, w, o = {}) {
  if (TT < t0 - 1e-6) return;
  const ok = o.ok ?? 'oke', nd = w - label.length - ok.length - 2, done = TT >= t1 - 1e-6;
  trmPut(col, row, label, o.c || trmT.ink);
  trmPut(col + label.length + 1, row, '.'.repeat(done ? nd : clamp(Math.floor(seg(TT, t0, t1) * nd + 1e-6), 0, nd)), trmT.dim);
  if (done) trmPut(col + w - ok.length, row, ok, o.okC || trmT.hi);
}
function trmBar(col, row, w, frac, fg, o = {}) {   // [████░░░░] filling cell by cell
  const inner = w - 2, n = clamp(Math.floor(clamp(frac) * inner + 1e-6), 0, inner);
  trmSet(col, row, '[', o.edge || trmT.dim); trmSet(col + w - 1, row, ']', o.edge || trmT.dim);
  for (let i = 0; i < inner; i++) trmSet(col + 1 + i, row, i < n ? '█' : '░', i < n ? fg || trmT.ink : trmT.dim);
  return n;
}
function trmSpin(col, row, fg, rate = 8) { trmSet(col, row, '|/-\\'[mod(trmStep(rate), 4)], fg || trmT.hi); }
// vertical bars standing on rowBase: vals 0..1, o.h rows tall, o.halves(i) = how many half cells bar i shows so far
function trmChart(col, rowBase, vals, o = {}) {
  const h = o.h ?? 6, bw = o.bw ?? 2, gap = o.gap ?? 1;
  vals.forEach((v, i) => {
    const want = Math.round(clamp(v) * h * 2), halves = o.halves ? Math.min(want, Math.max(0, o.halves(i))) : want, x = col + i * (bw + gap);
    const fg = (o.colors && o.colors[i]) || o.fg || trmT.ink;
    for (let k = 0; k < Math.ceil(halves / 2); k++) for (let b = 0; b < bw; b++) trmSet(x + b, rowBase - k, k * 2 + 1 === halves ? '▄' : '█', fg);
    if (o.labels && o.labels[i]) trmPut(x, rowBase + 1, o.labels[i], o.labelC || trmT.dim);
  });
}
// a sparkline: one lower-eighth block per value (▁..█); cells from o.lit on are dim
function trmSpark(col, row, vals, fg, o = {}) {
  vals.forEach((v, i) => trmSet(col + i, row, String.fromCodePoint(0x2580 + clamp(Math.ceil(clamp(v) * 8), 1, 8)), o.lit != null && i >= o.lit ? trmT.dim : fg || trmT.ink));
}
// a small table: rows of cells, o.w = column widths; the first row is the header over a rule, │ between columns
function trmTable(col, row, rows, o = {}) {
  const w = o.w || rows[0].map((_, k) => Math.max(...rows.map((r) => String(r[k]).length)));
  rows.forEach((cells, j) => {
    const y = row + (j ? j + 1 : 0); let x = col;
    cells.forEach((cell, k) => {
      const s = String(cell);
      trmPut(k ? x + w[k] - s.length : x, y, s, j ? (k ? o.valC || trmT.hi : o.c || trmT.ink) : o.headC || trmT.dim);
      x += w[k]; if (k < cells.length - 1) { trmLine(x, row, x, row + rows.length, trmT.dim); x++; }
    });
  });
  trmRule(col, row + 1, w.reduce((a, b) => a + b, 0) + w.length - 1, trmT.dim);
}
function trmBubble(col, row, str, fg, o = {}) {   // a boxed line of speech; the tail '<' points left at the speaker
  const n = Array.from(str).length;
  trmBox(col, row, n + 4, 3, fg || trmT.ink);
  trmPut(col + 2, row + 1, Array.from(str).slice(0, o.n ?? n).join(''), o.c || trmT.hi);
  if (o.tail !== false) trmSet(col - 1, row + 1, '<', fg || trmT.ink);
}

// ---------------------------------------------------------------------
//  the hero: Bit, a 5x4-cell amber robot.   ┬      (col, row) = its top-left cell; it stands on row + 4.
//                                         ┌─┴─┐    o.sleep (eyes shut, z's), o.mood 'smile' | 'happy' | 'wow',
//                                         │•_•│    o.hop = whole cells off the ground, o.wave = a waving arm
//                                         └┬─┬┘
// ---------------------------------------------------------------------
function trmHero(col, row, o = {}) {
  const key = o.key ?? 'hero', c = o.c || TRM.amber, hop = Math.max(0, Math.round(o.hop ?? 0)), gy = row + 4;
  row -= hop;
  const shut = o.sleep || (F + hash(key) % 40) % 58 < 3;   // a blink every ~2.4 s
  const eye = shut ? '-' : o.mood === 'wow' ? '●' : '•', mouth = o.mood === 'wow' ? 'o' : o.mood === 'happy' ? 'v' : '_';
  trmClear(col, row, 5, 4);
  trmSet(col + 2, row, '┬', c);
  trmPut(col, row + 1, '┌─┴─┐', c);
  trmSet(col, row + 2, '│', c); trmSet(col + 1, row + 2, eye, trmT.hi); trmSet(col + 2, row + 2, mouth, c); trmSet(col + 3, row + 2, eye, trmT.hi); trmSet(col + 4, row + 2, '│', c);
  trmPut(col, row + 3, hop ? '└───┘' : '└┬─┬┘', c);
  if (o.wave) trmSet(col + 5, row + 2, mod(trmStep(6), 2) ? '/' : '-', c);
  if (o.sleep) { trmSet(col + 5, row, 'z', trmT.dim); if (mod(trmStep(2), 2)) trmSet(col + 6, row - 1, 'Z', trmT.dim); }
  if (o.ground !== false) trmPut(col + (hop ? 1 : 0), gy, hop ? '▔▔▔' : '▔▔▔▔▔', trmT.dim);   // its shadow shrinks while it is in the air
  SPARK_AT = toScreen((col + 2.5) * TRM_CW, (row + 2) * TRM_CH);
}
const trmHop = (t0, top = 2) => { const k = trmStep(12, t0); return TT < t0 - 1e-6 || k > 3 ? 0 : [1, top, top, 1][k]; };   // up and down in whole cells, 4 steps on 2s
const trmHeroPts = (x, y, r) => rrectPts(x - r * 0.62, y - r, r * 1.24, r * 2, r * 0.2);

// ---------------------------------------------------------------------
//  background life: a scanner rule, a memory map of shade cells
// ---------------------------------------------------------------------
function trmScan(row, key, o = {}) {   // a dim rule across the screen with a bright block stepping along it
  trmRule(0, row, TRM_COLS, trmT.dim);
  const p = mod(trmStep(o.rate ?? 12) + hash(key) % TRM_COLS, TRM_COLS);
  for (let k = 0; k < 3; k++) trmSet(mod(p - k, TRM_COLS), row, ['█', '▓', '░'][k], k ? trmT.dim : trmT.ink);
}
function trmMem(row, rows, key, o = {}) {   // a block of shade cells; each one changes level at its own slow pace
  for (let r = 0; r < rows; r++) for (let c = 0; c < TRM_COLS; c++) {
    const R = RNG('trmmem', key, c, r), per = R.i(3, 9), ph = R.i(0, 8), lvl = RNG('trmmem', key, c, r, Math.floor((trmStep(o.rate ?? 4) + ph) / per)).i(0, 8);
    if (lvl < 3) trmSet(c, row + r, TRM_SHADE[lvl], trmT.dim);
  }
}

// ---------------------------------------------------------------------
//  captions and tags: typed on a lit strip, at screen size, after the camera (DEFER). Hidden while a bridge runs.
// ---------------------------------------------------------------------
const trmInBridge = () => typeof BRIDGES !== 'undefined' && BRIDGES.some((r) => Math.abs(TT - r.tc) < (r.d ?? 0.6) - 1e-6);
// 'semua sistem *siap*': the *word* is typed like the rest, then flips to inverse amber. o.row, o.at (seconds), o.cps
function trmCaptionNow(str, th, o = {}) {
  if (trmInBridge()) return;
  const at = o.at ?? E0 + 0.4, typed = trmStep(o.cps ?? 30, at); if (typed < 0) return;
  let k = 0;
  trmOverlay(th, () => str.split('\n').forEach((line, j) => {
    const cells = []; line.split(/(\*[^*]+\*)/).forEach((part) => { const hi = part[0] === '*' && part.length > 2; Array.from(hi ? part.slice(1, -1) : part).forEach((ch) => cells.push([ch, hi])); });
    const row = (o.row ?? 23) + j, col = Math.max(1, Math.round(CX / TRM_CW - cells.length / 2)), shown = clamp(typed - k, 0, cells.length);
    const hiDone = (i) => { let e = i; while (e < cells.length && cells[e][1]) e++; return typed - k >= e; };   // the whole word is there
    if (typed - k >= 0) trmClear(col - 1, row, cells.length + 2, 1, th.panel);
    for (let i = 0; i < shown; i++) { const [ch, hi] = cells[i]; if (hi && hiDone(i)) trmSet(col + i, row, ch, th.bg, th.accent); else trmSet(col + i, row, ch, th.hi, th.panel); }
    if (shown < cells.length && typed - k >= 0) trmSet(col + shown, row, '█', th.hi, th.panel);
    k += cells.length;
  }));
}
function trmTagNow(num, label, th, o = {}) {
  if (trmInBridge()) return;
  const at = o.at ?? E0 + 0.1; if (TT < at - 1e-6) return;
  trmOverlay(th, () => { const row = o.row ?? 4, col = o.col ?? 2, x = trmPut(col, row, ' ' + num + ' ', th.ink, { inv: true }); trmPut(x + 1, row, Array.from(label).slice(0, trmStep(o.cps ?? 30, at)).join(''), th.hi); });
}
const trmCaption = (str, o = {}) => { const th = trmT, f = () => trmCaptionNow(str, th, o); if (DEFER) DEFER.push(f); else f(); };
const trmTag = (num, label, o = {}) => { const th = trmT, f = () => trmTagNow(num, label, th, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  post: phosphor bloom (the frame, shrunk and added back), scanlines + vignette + bezel (one cached layer), a rare flicker
// ---------------------------------------------------------------------
const TRM_SCRATCH = {};
function trmScratch(key, w, h) { let cv = TRM_SCRATCH[key]; if (!cv || cv.width !== w || cv.height !== h) { cv = TRM_SCRATCH[key] = document.createElement('canvas'); cv.width = w; cv.height = h; } return cv; }
function trmTube() {   // static: built once
  const made = TRM_SCRATCH.tube; if (made) return made;
  const cv = trmScratch('tube', W, H), g = cv.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.2)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y + 2, W, 2);   // scanlines: 15 to a text row
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.56);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.7, 'rgba(0,0,0,0.22)'); v.addColorStop(1, 'rgba(0,0,0,0.72)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const rr = Math.min(W, H) * 0.075, m = 10;   // the bezel: everything outside a rounded rectangle, plus a soft inner shade
  g.fillStyle = TRM.black; g.beginPath(); g.rect(0, 0, W, H);
  g.moveTo(m + rr, m); g.arcTo(m, m, m, m + rr, rr); g.lineTo(m, H - m - rr); g.arcTo(m, H - m, m + rr, H - m, rr); g.lineTo(W - m - rr, H - m); g.arcTo(W - m, H - m, W - m, H - m - rr, rr); g.lineTo(W - m, m + rr); g.arcTo(W - m, m, W - m - rr, m, rr); g.closePath();
  g.fill('evenodd');
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.moveTo(m + rr, m + 2); g.lineTo(W - m - rr, m + 2); g.stroke();   // a glint on the glass
  return cv;
}
function trmPost() {
  const src = ctx.canvas, w = src.width, h = src.height;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
  // bloom: halve three times (smooth), brighten the 1/4 and 1/8 copies, lay them back with `lighten`
  const b1 = trmScratch('b1', w >> 1, h >> 1), b2 = trmScratch('b2', w >> 2, h >> 2), b3 = trmScratch('b3', w >> 3, h >> 3);
  b1.getContext('2d').drawImage(src, 0, 0, b1.width, b1.height); b2.getContext('2d').drawImage(b1, 0, 0, b2.width, b2.height); b3.getContext('2d').drawImage(b2, 0, 0, b3.width, b3.height);
  for (const b of [b2, b3]) { const g = b.getContext('2d'); g.globalCompositeOperation = 'lighter'; g.drawImage(b, 0, 0); g.globalCompositeOperation = 'source-over'; }   // twice as bright
  ctx.globalCompositeOperation = 'lighten';   // per-channel max: the halo fills the dark around a glyph, lit cells keep their exact colour
  ctx.globalAlpha = 0.5; ctx.drawImage(b2, 0, 0, w, h);
  ctx.globalAlpha = 0.6; ctx.drawImage(b3, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // a slow bright band rolling down the tube, then the static glass layer
  const by = mod(F * 14, h + 500) - 250, band = ctx.createLinearGradient(0, by - 200, 0, by + 200);
  band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(0.5, 'rgba(255,255,255,0.035)'); band.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = band; ctx.fillRect(0, by - 200, w, 400);
  ctx.drawImage(trmTube(), 0, 0, w, h);
  const R = RNG('trmflicker', F);   // the occasional gentle flicker: one dim frame now and then
  if (R.f() < 0.07) { ctx.fillStyle = `rgba(0,0,0,${(0.05 + R.f() * 0.06).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'terminal',
  paper: TRM_THEMES.green.bg,   // a blank tube: morphs happen on an empty screen
  // the dark tube in colour c with a little static: a few dim shade cells that jump every frame
  backdrop(c, o) {
    fillAll(c);
    const th = o ? trmEraTheme(o.phase === 'shrink' || (o.phase === 'morph' && o.u < 0.5) ? o.eraA : o.eraB) : trmT, R = RNG('trmstatic', F);
    trmOverlay(th, () => { for (let i = 0; i < 26; i++) trmSet(R.i(0, TRM_COLS - 1), R.i(0, TRM_ROWS - 1), TRM_SHADE[R.i(0, 1)], th.dim); });
  },
  // the other era seen through a cell-quantised hole: whole cells only, rimmed by a ring of ▓ in the bridge colour and ░ outside it
  window(P, key, src, o = {}) {
    const M = trmMask(P), at = (c, r) => c >= 0 && r >= 0 && c < TRM_COLS && r < TRM_ROWS && M[r * TRM_COLS + c];
    const th = trmEraTheme(o.phase === 'grow' ? o.eraB : o.eraA ?? 0), rim = o.c && o.c[0] === '#' ? o.c : th.ink;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    for (let r = 0; r < TRM_ROWS; r++) for (let c = 0; c < TRM_COLS; c++) { if (!M[r * TRM_COLS + c]) continue; let e = c; while (e + 1 < TRM_COLS && M[r * TRM_COLS + e + 1]) e++; ctx.rect(c * TRM_CW, r * TRM_CH, (e - c + 1) * TRM_CW, TRM_CH); c = e; }
    ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    trmOverlay(th, () => {
      const ring = new Uint8Array(M.length);
      for (let r = 0; r < TRM_ROWS; r++) for (let c = 0; c < TRM_COLS; c++) if (!at(c, r) && (at(c - 1, r) || at(c + 1, r) || at(c, r - 1) || at(c, r + 1))) { ring[r * TRM_COLS + c] = 1; trmSet(c, r, '▓', rim, th.bg); }
      const rg = (c, r) => c >= 0 && r >= 0 && c < TRM_COLS && r < TRM_ROWS && ring[r * TRM_COLS + c];
      for (let r = 0; r < TRM_ROWS; r++) for (let c = 0; c < TRM_COLS; c++) if (!at(c, r) && !rg(c, r) && (rg(c - 1, r) || rg(c + 1, r) || rg(c, r - 1) || rg(c, r + 1))) trmSet(c, r, '░', rim);
    });
  },
  // the morphing shape: the outline rasterised to shade characters, lit from the top left
  blob(P, c, key, u, o = {}) { trmOverlay(trmEraTheme(u < 0.5 ? o.eraA ?? 0 : o.eraB ?? 0), () => trmFill(P, c)); },
  hero(x, y, r, o = {}) { trmOverlay(trmT, () => trmHero(Math.round(x / TRM_CW - 2.5), Math.round(y / TRM_CH - 2), { key: o.key, mood: o.mood, ground: false })); },
  heroColor: TRM.amber,
  heroPts(x, y, r) { return trmHeroPts(x, y, r); },
  post() { trmPost(); },
  ones: true,   // on 1s, but stepped: every motion is a whole-cell change at a steady rate (typing, bars, hops on 2s)
};
