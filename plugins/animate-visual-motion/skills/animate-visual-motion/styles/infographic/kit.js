// =====================================================================
//  styles/infographic/kit.js — a friendly editorial data-explainer (isotype / data journalism) for narrated videos.
//  THE CHART IS THE PICTURE: pictogram arrays that fill unit by unit, donuts, columns, bars, a line that draws on,
//  big counters. Categorical colour carries meaning (teal / amber / indigo = the series), coral is kept for the
//  number the story follows and for the hero, a little map-pin with eyes that sits on the datum being talked about.
//  Pale cool ground with a faint plotting grid, navy ink, white rounded cards with a flat offset shadow, flat fills,
//  rounded caps and corners, thin axis hairlines. No gradients, no glow, no outlines.
//  Every reveal takes an ABSOLUTE start time t0 (seconds), so a piece can cue it on a spoken word: t0: VW(line, word).
//  Everything is placed by explicit x, y, w, h and sized by UNIT, so 16:9 and 1:1 work as well as 9:16.
//  Motion on 1s, springs. Built on kit/core.js.
//  Needs from the piece head: W, H, FPS, CX (caption centre x). Optional `const IG_DARK = true` before the kit
//  gives the navy ground.
// =====================================================================

// ---- palette (6-digit hex: the renderer's mixHex blends these)
const IG_DARKMODE = typeof IG_DARK !== 'undefined' && !!IG_DARK;
const IG = {
  navy: '#1b2a41', pale: '#eef2f6', white: '#ffffff',
  ground: IG_DARKMODE ? '#1b2a41' : '#eef2f6',     // the sheet
  grid: IG_DARKMODE ? '#26384f' : '#dfe6ee',       // the plotting grid on it
  card: IG_DARKMODE ? '#24364f' : '#ffffff',       // cards
  ink: IG_DARKMODE ? '#eef2f6' : '#1b2a41',        // type, baselines
  grey: '#8794a8',                                 // labels, axis numbers
  greyL: IG_DARKMODE ? '#3b4e69' : '#cfd8e3',      // empty units, tracks, gridlines
  teal: '#1fa39a', coral: '#f26b5b', amber: '#f5b83d', indigo: '#5567e8',
};
const IG_CAT = [IG.teal, IG.amber, IG.indigo];     // the categorical order. Coral is NOT in it: it marks the followed number
const IG_ROUND = '"Arial Rounded MT Bold", "Nunito", "Varela Round", "Quicksand"';
const IG_SANS = '"Segoe UI", "Helvetica Neue", "Noto Sans", "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
const IG_SHADOW = IG_DARKMODE ? 'rgba(0,0,0,0.25)' : 'rgba(27,42,65,0.09)';
const IG_DETAIL = 'rgba(255,255,255,0.72)';        // marks inside a pictogram (works on any unit colour)

// ---------------------------------------------------------------------
//  easing and small tools
// ---------------------------------------------------------------------
const igSpr = (t0, p = SPRING.snappy) => springEase(TT - t0, p.k, p.d);          // 0 -> 1 with a small overshoot
const igIn = (t0, d = 0.35) => (TT < t0 ? 0 : EZ.o3((TT - t0) / d));             // 0 -> 1, lands exactly at t0 + d
const igPop = (t0, amt = 0.2, k = 10) => (TT < t0 ? 1 : 1 + amt * Math.exp(-(TT - t0) * k));   // a scale pop decaying to 1
const igBlink = (key, period = 62) => mod(F + hash('igb', key) % period, period) < 3;
function igZoom() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }
const igNum = (v, dec = 0) => { const s = Math.abs(v).toFixed(dec).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (v < 0 ? '−' : '') + s.join(','); };   // id-ID: 12.480 / 2,5
// the inverse of EZ.io: when does an io-eased 0..1 reach u (igLine uses it to time a note on a point)
const igIoInv = (u) => (u < 0.5 ? Math.cbrt(u / 4) : 1 - Math.cbrt((1 - u) * 2) / 2);
function igNiceMax(v, ticks = 4) {
  const raw = Math.max(1e-9, v) / ticks, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p * ticks;
}
function igPath(P, closed = true) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (closed) ctx.closePath(); }
// a rounded rectangle path. r = one radius or [tl, tr, br, bl]
function igRR(x, y, w, h, r = 14) {
  const R = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(v, Math.abs(w) / 2, Math.abs(h) / 2)));
  ctx.beginPath();
  ctx.moveTo(x + R[0], y); ctx.lineTo(x + w - R[1], y); ctx.arcTo(x + w, y, x + w, y + R[1], R[1]);
  ctx.lineTo(x + w, y + h - R[2]); ctx.arcTo(x + w, y + h, x + w - R[2], y + h, R[2]);
  ctx.lineTo(x + R[3], y + h); ctx.arcTo(x, y + h, x, y + h - R[3], R[3]);
  ctx.lineTo(x, y + R[0]); ctx.arcTo(x, y, x + R[0], y, R[0]); ctx.closePath();
}
function igDisc(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill(); }
// a hairline (screen-constant width under any camera), round caps
function igHair(x1, y1, x2, y2, c = IG.greyL, w = 2) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w / igZoom(); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  type. Numbers and headlines: a rounded bold face (Arial Rounded on macOS, Nunito where installed, else the
//  system sans at 800). Labels: the system sans at 700, upper case, tracked (igLabel).
// ---------------------------------------------------------------------
let IG_HASARM = null;   // is Arial Rounded MT Bold installed? (it has ONE weight, so it must not be asked for 800: fake bold)
function igHasArm() {
  if (IG_HASARM == null) {
    ctx.save(); ctx.font = '40px monospace'; const a = ctx.measureText('Rg0%m').width;
    ctx.font = '40px "Arial Rounded MT Bold", monospace'; IG_HASARM = Math.abs(ctx.measureText('Rg0%m').width - a) > 0.5; ctx.restore();
  }
  return IG_HASARM;
}
// o: sans (label face), weight, track (px)
function igFont(size, o = {}) {
  if (o.sans) ctx.font = `${o.weight ?? 700} ${size}px ${IG_SANS}`;
  else ctx.font = igHasArm() ? `400 ${size}px ${IG_ROUND}, ${IG_SANS}` : `${o.weight ?? 800} ${size}px "Nunito", "Varela Round", "Quicksand", ${IG_SANS}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.track ?? 0}px`;
}
function igTextW(str, size, o = {}) { ctx.save(); igFont(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// one string. o: align ('left' | 'center' | 'right'), sans, weight, track, al, base. Returns the drawn width.
function igText(str, x, y, size, color, o = {}) {
  const al = o.al ?? 1; if (al <= 0.05) return igTextW(str, size, o);
  ctx.save(); igFont(size, o); ctx.textBaseline = o.base ?? 'alphabetic'; ctx.textAlign = 'left';
  const w = ctx.measureText(str).width, x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  ctx.globalAlpha *= al; ctx.fillStyle = color; ctx.fillText(str, x0, y); ctx.restore(); return w;
}
// a small-caps label: upper case, tracked, the system sans. Default grey, 30px (the smallest size that reads on a phone).
const igLabelO = (size, o = {}) => ({ sans: true, weight: 700, track: size * 0.07, ...o });
function igLabel(str, x, y, size = 30, color = IG.grey, o = {}) { return igText(String(str).toUpperCase(), x, y, size, color, igLabelO(size, o)); }
const igLabelW = (str, size = 30, o = {}) => igTextW(String(str).toUpperCase(), size, igLabelO(size, o));

// ---------------------------------------------------------------------
//  ground and cards
// ---------------------------------------------------------------------
// the plotting grid alone (also drawn behind a morph). Idle life: the grid breathes, and one row lights in turn.
function igGridLines(o = {}) {
  const step = (o.step ?? 60) * UNIT, z = igZoom(), w = 2 / z, m = 260, br = 0.82 + 0.18 * Math.sin(TT * 1.7);
  ctx.save(); ctx.fillStyle = o.c ?? IG.grid;
  for (let i = Math.floor(-m / step); i * step < W + m; i++) { ctx.globalAlpha = (i % 4 === 0 ? 1 : 0.5) * br; ctx.fillRect(i * step - w / 2, -m, w, H + m * 2); }
  const rows = Math.ceil((H + m * 2) / step), lit = Math.floor(TT * 2) % 8;
  for (let j = Math.floor(-m / step); j * step < H + m; j++) { ctx.globalAlpha = (j % 4 === 0 ? 1 : 0.5) * br * (mod(j, 8) === lit ? 1.6 : 1); ctx.fillRect(-m, j * step - w / 2, W + m * 2, w); }
  ctx.restore(); return rows;
}
function igGround(o = {}) { fillAll(o.c ?? IG.ground); if (o.grid !== false) igGridLines(o); }
// a card: a flat rounded panel on a flat offset shadow. o: c, r (10-16; default 16), drop (shadow offset), shadow (false = none),
// line (a hairline border colour), t0 (rises 28px and fades in on a spring; the piece draws the content after it).
function igCard(x, y, w, h, o = {}) {
  const s = o.t0 != null ? clamp(igSpr(o.t0, SPRING.smooth), 0, 1.02) : 1; if (s <= 0.002) return 0;
  ctx.save(); ctx.globalAlpha *= clamp(s * 2.5); ctx.translate(0, (1 - s) * 28);
  if (o.shadow !== false) { ctx.fillStyle = IG_SHADOW; igRR(x, y + (o.drop ?? 10), w, h, o.r ?? 16); ctx.fill(); }
  ctx.fillStyle = o.c ?? IG.card; igRR(x, y, w, h, o.r ?? 16); ctx.fill();
  if (o.line) { ctx.lineWidth = 2 / igZoom(); ctx.strokeStyle = o.line; ctx.stroke(); }
  ctx.restore(); return s;
}
// a rounded card outline as dense points: the bridge shape (a donut's disc morphs into the next chart's card)
function igCardPts(x, y, w, h, r = 16) { return resample(rrectPts(x, y, w, h, r, 8), true, 14); }
const igCirclePts = (x, y, r, n = 96) => ellipsePts(x, y, r, r, 0, n);

// ---------------------------------------------------------------------
//  pictograms: one flat silhouette each, drawn in a unit box (-0.5..0.5), marks inside in translucent white.
//  igIcon(name, x, y, s, c, o): (x, y) = centre, s = height in px, c = colour. o: detail (the inner marks' colour),
//  live (clock: the hands turn), rot.   Names: person, coin, house, leaf, drop, phone, clock, book, dot.
// ---------------------------------------------------------------------
const IG_ICONS = {
  person(c) { igDisc(0, -0.29, 0.19, c); igRR(-0.33, -0.05, 0.66, 0.55, [0.27, 0.27, 0.1, 0.1]); ctx.fill(); },
  coin(c, d) {
    igDisc(0, 0, 0.47, c); ctx.strokeStyle = d; ctx.lineWidth = 0.065; ctx.beginPath(); ctx.arc(0, 0, 0.31, 0, TAU); ctx.stroke();
    ctx.fillStyle = d; igRR(-0.045, -0.16, 0.09, 0.32, 0.045); ctx.fill();
  },
  house(c, d) {
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 0.09; ctx.lineJoin = 'round';
    igPath([[-0.44, -0.04], [0, -0.42], [0.44, -0.04]]); ctx.fill(); ctx.stroke();
    igRR(-0.35, -0.08, 0.7, 0.56, [0, 0, 0.07, 0.07]); ctx.fill();
    ctx.fillStyle = d; igRR(-0.1, 0.14, 0.2, 0.34, [0.06, 0.06, 0, 0]); ctx.fill();
  },
  leaf(c, d) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-0.38, 0.42); ctx.bezierCurveTo(-0.52, -0.12, -0.12, -0.5, 0.44, -0.44);
    ctx.bezierCurveTo(0.5, 0.12, 0.12, 0.52, -0.38, 0.42); ctx.fill();
    ctx.strokeStyle = d; ctx.lineWidth = 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.27, 0.31); ctx.quadraticCurveTo(0.02, 0.08, 0.26, -0.27); ctx.stroke();
  },
  drop(c, d) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -0.49); ctx.bezierCurveTo(0.1, -0.26, 0.35, -0.06, 0.35, 0.15);
    ctx.arc(0, 0.15, 0.35, 0, Math.PI); ctx.bezierCurveTo(-0.35, -0.06, -0.1, -0.26, 0, -0.49); ctx.fill();
    ctx.strokeStyle = d; ctx.lineWidth = 0.065; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0.15, 0.21, Math.PI * 0.55, Math.PI * 0.95); ctx.stroke();
  },
  phone(c, d) {
    ctx.fillStyle = c; igRR(-0.27, -0.48, 0.54, 0.96, 0.11); ctx.fill();
    ctx.fillStyle = d; igRR(-0.2, -0.38, 0.4, 0.64, 0.045); ctx.fill(); igDisc(0, 0.37, 0.04, d);
  },
  clock(c, d, o) {
    igDisc(0, 0, 0.47, c); const a = o.live ? TT * 1.4 : 0.6;
    ctx.strokeStyle = d; ctx.lineWidth = 0.075; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * 0.3, -Math.cos(a) * 0.3); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a / 12 + 2.2) * 0.2, -Math.cos(a / 12 + 2.2) * 0.2); ctx.stroke();
  },
  book(c, d) {
    ctx.fillStyle = c;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -0.28); ctx.quadraticCurveTo(s * 0.24, -0.42, s * 0.48, -0.31); ctx.lineTo(s * 0.48, 0.33); ctx.quadraticCurveTo(s * 0.24, 0.22, 0, 0.37); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = d; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -0.2); ctx.lineTo(0, 0.28);
    for (const s of [-1, 1]) for (const yy of [-0.12, 0.04]) { ctx.moveTo(s * 0.13, yy - 0.04); ctx.quadraticCurveTo(s * 0.25, yy - 0.1, s * 0.37, yy - 0.05); }
    ctx.stroke();
  },
  dot(c) { igDisc(0, 0, 0.4, c); },
};
function igIcon(name, x, y, s, c = IG.teal, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
  ctx.fillStyle = c; (IG_ICONS[name] || IG_ICONS.dot)(c, o.detail ?? IG_DETAIL, o);
  ctx.restore();
}

// An isotype array: n units in rows of `cols`, `filled` of them (may be fractional: 6.5) take colour one by one from
// t0, each with a small pop; the rest stay grey. (x, y) = top left, w = the array's width.
// o: n (10), cols (5), filled, stagger (0.1; 0.25 puts every unit on an 8th at 120 BPM), c (the filled colour),
//    off (the empty colour), s (icon height; default 78% of a cell), rowH (default the cell width), tIn (the grey
//    array pops in from this time, 0.03s apart; default: already there), times ([t...]: an explicit time per unit).
// Returns { cells: [{ x, y, s, t, on, top: [x, y] }], count (units filled so far, whole), value (the same, eased,
//           fractional: drive a counter or a donut with it so number and picture move together), tEnd, w, h }.
function igPictoGrid(name, x, y, w, t0, o = {}) {
  const n = o.n ?? 10, cols = Math.min(n, o.cols ?? 5), filled = o.filled ?? n, cw = w / cols, rowH = o.rowH ?? cw;
  const s = o.s ?? Math.min(cw, rowH) * 0.78, st = o.stagger ?? 0.1, c = o.c ?? IG.teal, off = o.off ?? IG.greyL, cells = [];
  let count = 0, value = 0, tEnd = t0;
  for (let i = 0; i < n; i++) {
    const cx = x + cw * (i % cols + 0.5), cy = y + rowH * (Math.floor(i / cols) + 0.5);
    const part = clamp(filled - i), ti = o.times ? o.times[i] ?? 1e9 : t0 + i * st, on = part > 0 && TT >= ti;
    if (part > 0) { tEnd = Math.max(tEnd, ti); if (on) count += part; value += part * clamp(igSpr(ti), 0, 1); }
    const a = o.tIn != null ? igSpr(o.tIn + i * 0.03, SPRING.playful) : 1;
    cells.push({ x: cx, y: cy, s, t: ti, on, top: [cx, cy - s * 0.5] });
    if (a <= 0.01) continue;
    const k = a * (on ? igPop(ti, 0.24, 9) : 1);
    if (!on || part < 1) igIcon(name, cx, cy, s * k, off, o);
    if (on) {
      ctx.save(); if (part < 1) { ctx.beginPath(); ctx.rect(cx - s * k / 2, cy - s, s * k * part, s * 2); ctx.clip(); }
      igIcon(name, cx, cy, s * k, o.colors ? o.colors[i] ?? c : c, o); ctx.restore();
    }
  }
  return { cells, count, value, tEnd, w, h: rowH * Math.ceil(n / cols) };
}
// one row of units: igPictoRow(name, x, y, w, t0, { n, filled, ... })
const igPictoRow = (name, x, y, w, t0, o = {}) => igPictoGrid(name, x, y, w, t0, { ...o, cols: o.n ?? 10 });

// ---------------------------------------------------------------------
//  numbers: the big counter, the delta chip
// ---------------------------------------------------------------------
// A big numeral that counts to `to` and LANDS at t0 + d (ease out, no overshoot: a number must not pass its value).
// o: from (0), d (0.8), land (the time to land on, e.g. the spoken number: overrides t0 as land - d), v (an explicit
//    value: tie it to a chart's own progress), dec, prefix, suffix, suffixK (0.5), c (default coral: the followed
//    number), align, label (a small-caps line under it), labelC, pop (time(s) of a scale pop).
// The group is laid out at its FINAL width, so digits do not shove the suffix about while counting.
// Returns { w, x0, right, v }.
function igCounter(x, y, size, to, t0, o = {}) {
  const d = o.d ?? 0.8, ts = o.land != null ? o.land - d : t0, from = o.from ?? 0;
  const v = o.v ?? lerp(from, to, igIn(ts, d)), dec = o.dec ?? 0, s = (o.prefix ?? '') + igNum(v, dec), sFin = (o.prefix ?? '') + igNum(to, dec);
  const wN = Math.max(igTextW(sFin, size), igTextW(s, size)), ss = size * (o.suffixK ?? 0.5), gap = o.suffix ? size * 0.05 : 0, wS = o.suffix ? igTextW(o.suffix, ss) : 0;
  const tot = wN + gap + wS, x0 = o.align === 'center' ? x - tot / 2 : o.align === 'right' ? x - tot : x, c = o.c ?? IG.coral;
  const k = [].concat(o.pop ?? []).reduce((a, t) => a * igPop(t, 0.08, 11), 1);
  ctx.save(); ctx.translate(x0 + tot / 2, y - size * 0.35); ctx.scale(k, k); ctx.translate(-(x0 + tot / 2), -(y - size * 0.35));
  igText(s, x0 + wN, y, size, c, { align: 'right', al: o.al });
  if (o.suffix) igText(o.suffix, x0 + wN + gap, y, ss, o.suffixC ?? c, { al: o.al });
  ctx.restore();
  if (o.label) igLabel(o.label, o.align === 'center' ? x : o.align === 'right' ? x : x0, y + size * 0.14 + 34, o.labelSize ?? 30, o.labelC ?? IG.grey, { align: o.align, al: o.al });
  return { w: tot, x0, right: x0 + tot, v };
}
// a change chip: a pill with a drawn triangle and a value ("▲ 12%"). (x, y) = left, vertical centre.
// o: down (the triangle points down), c (default teal up / indigo down), size (32), t0 (pops in), align.
function igDelta(x, y, str, o = {}) {
  const size = o.size ?? 32, h = size * 1.6, tri = size * 0.34, padX = size * 0.5, c = o.c ?? (o.down ? IG.indigo : IG.teal);
  const tw = igTextW(str, size), w = padX * 2 + tri * 2 + size * 0.28 + tw, x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  const s = o.t0 != null ? igSpr(o.t0, SPRING.playful) : 1; if (s <= 0.02) return w;
  ctx.save(); ctx.translate(x0 + w / 2, y); ctx.scale(s, s); ctx.translate(-(x0 + w / 2), -y);
  ctx.fillStyle = c; igRR(x0, y - h / 2, w, h, h / 2); ctx.fill();
  const tx = x0 + padX + tri, d = o.down ? -1 : 1;
  ctx.fillStyle = IG.white; ctx.strokeStyle = IG.white; ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.1;
  igPath([[tx - tri, y + d * tri * 0.7], [tx, y - d * tri * 0.8], [tx + tri, y + d * tri * 0.7]]); ctx.fill(); ctx.stroke();
  igText(str, tx + tri + size * 0.28, y + size * 0.35, size, IG.white, { al: clamp(s * 2) });
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  legend, callout, ticking marker
// ---------------------------------------------------------------------
// legend chips in a row: items [{ c, label, ring (an empty unit: drawn as a grey disc) }]. o: size (30), gap, t0, stagger.
// Returns the row's width.
function igLegend(x, y, items, o = {}) {
  const size = o.size ?? 30, r = size * 0.32, gap = o.gap ?? size * 1.1; let xx = x;
  items.forEach((it, i) => {
    const s = o.t0 != null ? igSpr(o.t0 + i * (o.stagger ?? 0.1), SPRING.playful) : 1, lw = igTextW(it.label, size, { sans: true, weight: 600 });
    if (s > 0.02) { igDisc(xx + r, y, r * s, it.c); igText(it.label, xx + r * 2 + size * 0.36, y + size * 0.35, size, o.c ?? IG.ink, { sans: true, weight: 600, al: clamp(s * 2) }); }
    xx += r * 2 + size * 0.36 + lw + gap;
  });
  return xx - gap - x;
}
// a callout: a dot on the datum, an elbow leader, a label pill. (x, y) = the datum.
// o: dx, dy (where the label sits relative to the datum; default 70, -70), c (the dot), size (30), t0, pill (the
//    pill's colour, default ink), tc (label colour), dot (false = no dot).
function igCallout(x, y, text, o = {}) {
  const dx = o.dx ?? 70, dy = o.dy ?? -70, size = o.size ?? 30, c = o.c ?? IG.coral, t0 = o.t0 ?? -1e9;
  const a = igSpr(t0, SPRING.playful), l = igIn(t0 + 0.08, 0.22), p = igSpr(t0 + 0.2, SPRING.snappy);
  if (a <= 0.02) return null;
  const ex = x + dx, ey = y + dy, sgn = dx >= 0 ? 1 : -1;
  ctx.save(); ctx.strokeStyle = o.line ?? IG.ink; ctx.lineWidth = 2.5 / igZoom(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dy * Math.min(1, l * 2)); if (l > 0.5) ctx.lineTo(x + dx * (l - 0.5) * 2, ey); ctx.stroke(); ctx.restore();
  if (o.dot !== false) { igDisc(x, y, 11 * a, IG.card); igDisc(x, y, 7 * a, c); }
  if (p > 0.02) {
    const tw = igTextW(text, size, { sans: true, weight: 700 }), h = size * 1.6, w = tw + size * 1.1, bx = sgn > 0 ? ex + 6 : ex - 6 - w;
    ctx.save(); ctx.translate(bx + w / 2, ey); ctx.scale(Math.min(p, 1.06), Math.min(p, 1.06)); ctx.translate(-(bx + w / 2), -ey);
    ctx.fillStyle = o.pill ?? IG.ink; igRR(bx, ey - h / 2, w, h, Math.min(14, h / 2)); ctx.fill();
    igText(text, bx + size * 0.55, ey + size * 0.35, size, o.tc ?? (IG_DARKMODE ? IG.navy : IG.white), { sans: true, weight: 700, al: clamp(p * 2) });
    ctx.restore();
  }
  return [ex, ey];
}
// idle life: a row of ticks with one marker that steps along it (one step per `every` seconds) and loops
function igTick(x0, x1, y, o = {}) {
  const n = o.n ?? 12, every = o.every ?? 0.25, c = o.c ?? IG.amber, k = Math.floor(TT / every + 1e-6), u = igSpr(k * every, SPRING.snappy);
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); igHair(x, y, x, y + (i % 4 === 0 ? 14 : 8), o.tc ?? IG.greyL, 2.5); }
  const pos = lerp(mod(k - 1, n + 1), mod(k, n + 1), mod(k, n + 1) === 0 ? 1 : clamp(u)), x = lerp(x0, x1, pos / n);
  ctx.save(); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineJoin = 'round'; ctx.lineWidth = 3;
  igPath([[x - 8, y - 16], [x + 8, y - 16], [x, y - 4]]); ctx.fill(); ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  charts. Shared axis: horizontal gridlines with numbers on the left, a navy baseline.
// ---------------------------------------------------------------------
function igAxis(px, top, pw, base, max, ticks, t0, o = {}) {
  const u = igIn(t0, 0.4); if (u <= 0) return;
  for (let i = 0; i <= ticks; i++) {
    const yy = lerp(base, top, i / ticks);
    if (i > 0) igHair(px, yy, px + pw * u, yy, IG.greyL, 2);
    if (o.numbers !== false) igText(igNum(max * i / ticks, o.dec ?? 0) + (o.unit ?? ''), px - 14, yy + 10, o.size ?? 30, IG.grey, { align: 'right', sans: true, weight: 600, al: u });
  }
  igHair(px, base, px + pw * u, base, IG.ink, 3.5);
}
// Columns. (x, y, w, h) = the chart's box (axis numbers left, category labels under the baseline inside it).
// data: [{ v, label, c }]. o: hi (index of the highlighted column: coral, its label in ink), c (the other columns,
//   default teal), max, ticks (4), stagger (0.1), axW (room for axis numbers, 64; 0 = none), top (headroom above the
//   tallest column, 56), fill (column width / slot, 0.58), dec, unit, hiIn (the highlighted value is written inside
//   its column, in white, so the hero can sit on top), axisT (when the axis draws on; default t0 - 0.3).
// Columns grow on a snappy spring and their value counts up with them. Returns { cols: [{ x, top, w, v, t }],
//   base, plotTop, max, Y(v) }.
function igColumns(x, y, w, h, data, t0, o = {}) {
  const n = data.length, ticks = o.ticks ?? 4, max = o.max ?? igNiceMax(Math.max(...data.map((d) => d.v)), ticks);
  const axW = o.axW ?? 64, px = x + axW, pw = w - axW, base = y + h - (o.labH ?? 56), top = y + (o.top ?? 56), ph = base - top;
  const slot = pw / n, bw = slot * (o.fill ?? 0.58), st = o.stagger ?? 0.1, vs = o.valSize ?? 36, cols = [];
  igAxis(px, top, pw, base, max, ticks, o.axisT ?? t0 - 0.3, { dec: o.axDec, unit: o.axUnit, numbers: axW > 0 });
  data.forEach((d, i) => {
    const ti = t0 + i * st, s = igSpr(ti), hi = o.hi === i, cx = px + slot * (i + 0.5), hh = Math.max(0, ph * d.v / max * s), yt = base - hh;
    cols.push({ x: cx, top: yt, w: bw, v: d.v, t: ti });
    if (d.label != null) igLabel(d.label, cx, base + 42, o.labSize ?? 30, hi ? IG.ink : IG.grey, { align: 'center', al: igIn(o.axisT ?? t0 - 0.3, 0.4) });
    if (s <= 0) return;
    ctx.fillStyle = hi ? (o.hiC ?? IG.coral) : d.c ?? o.c ?? IG.teal; igRR(cx - bw / 2, yt, bw, hh, [12, 12, 0, 0]); ctx.fill();
    const str = igNum(d.v * clamp(s), o.dec ?? 0) + (o.unit ?? ''), al = clamp(s * 4);
    if (hi && o.hiIn && ph * d.v / max > vs * 1.8) igText(str, cx, yt + vs * 1.15, vs, IG.white, { align: 'center', al });
    else igText(str, cx, yt - 12, vs, hi ? (o.hiC ?? IG.coral) : IG.ink, { align: 'center', al });
  });
  return { cols, base, plotTop: top, max, Y: (v) => base - ph * v / max };
}
// Horizontal bars. data: [{ v, label, c }]; each row = a label line over a bar with a rounded end; the value counts
// at the bar's end. o: hi, c, max, stagger, barH (default 40% of a row), track (a track colour behind each bar),
//   dec, unit, labSize (30), valSize (36). Returns { rows: [{ y, end: [x, y], v, t }], max }.
function igBars(x, y, w, h, data, t0, o = {}) {
  const n = data.length, max = o.max ?? Math.max(...data.map((d) => d.v)), rowH = h / n, bh = o.barH ?? rowH * 0.4, st = o.stagger ?? 0.1;
  const ls = o.labSize ?? 30, vs = o.valSize ?? 36, rows = [];
  const vw = Math.max(...data.map((d) => igTextW(igNum(d.v, o.dec ?? 0) + (o.unit ?? ''), vs))) + 18, bwMax = w - vw;
  data.forEach((d, i) => {
    const ti = t0 + i * st, s = igSpr(ti), hi = o.hi === i, y0 = y + rowH * i, by = y0 + rowH - bh - rowH * 0.12, bw = Math.max(0, bwMax * d.v / max * s);
    rows.push({ y: by + bh / 2, end: [x + bw, by + bh / 2], v: d.v, t: ti });
    const al = igIn(ti - 0.1, 0.3); if (al <= 0) return;
    igLabel(d.label ?? '', x, by - 14, ls, hi ? IG.ink : IG.grey, { al });
    if (o.track) { ctx.fillStyle = o.track; igRR(x, by, bwMax, bh, [4, bh / 2, bh / 2, 4]); ctx.fill(); }
    if (s <= 0) return;
    ctx.fillStyle = hi ? (o.hiC ?? IG.coral) : d.c ?? o.c ?? IG.teal; igRR(x, by, bw, bh, [4, bh / 2, bh / 2, 4]); ctx.fill();
    igText(igNum(d.v * clamp(s), o.dec ?? 0) + (o.unit ?? ''), x + bw + 14, by + bh / 2 + vs * 0.35, vs, hi ? (o.hiC ?? IG.coral) : IG.ink, { al: clamp(s * 4) });
  });
  return { rows, max };
}
// A line that draws on left to right with a travelling head dot. points: [v, ...] (evenly spaced) or [[x, v], ...].
// o: d (1.2s), u (explicit 0..1 progress instead of t0/d), c (indigo), lw (7), max, min (0), ticks (4), axis (false =
//   a bare sparkline), axW (64), labels ([..] under the baseline, one per point or null), area (a flat translucent
//   fill fading in after the line is drawn), dots (false = no point dots), head (false = no head dot),
//   note: { i, text, dx, dy, c } (a callout on point i, fired when the head passes it), top (headroom, 30).
// Returns { head: [x, y] (the travelling point: put the hero on it), v (the value under the head: feed a counter),
//   P (the points on screen), u, done, base, tAt(i) (when the head reaches point i) }.
function igLine(x, y, w, h, points, t0, o = {}) {
  const pts = points.map((p, i) => (Array.isArray(p) ? p : [i, p])), n = pts.length, ticks = o.ticks ?? 4, d = o.d ?? 1.2;
  const min = o.min ?? 0, max = o.max ?? igNiceMax(Math.max(...pts.map((p) => p[1])) - min, ticks) + min;
  const axis = o.axis !== false, axW = axis ? (o.axW ?? 64) : 0, labH = o.labels ? (o.labH ?? 56) : 0;
  const px = x + axW, pw = w - axW, base = y + h - labH, top = y + (o.top ?? 30), ph = base - top, x0 = pts[0][0], x1 = pts[n - 1][0];
  const P = pts.map(([a, v]) => [px + pw * (a - x0) / (x1 - x0 || 1), base - ph * (v - min) / (max - min || 1)]);
  const c = o.c ?? IG.indigo, u = o.u ?? (TT < t0 ? 0 : EZ.io(seg(TT, t0, t0 + d))), tAt = (i) => t0 + d * igIoInv((P[i][0] - px) / (pw || 1));
  if (axis) igAxis(px, top, pw, base, max, ticks, o.axisT ?? t0 - 0.3, { dec: o.axDec, unit: o.axUnit });
  else igHair(px, base, px + pw * igIn(o.axisT ?? t0 - 0.3, 0.4), base, IG.greyL, 2.5);
  if (o.labels) o.labels.forEach((s, i) => { if (s != null && P[i]) igLabel(s, P[i][0], base + 42, o.labSize ?? 30, IG.grey, { align: i === 0 && !axis ? 'left' : i === n - 1 ? 'right' : 'center', al: igIn(o.axisT ?? t0 - 0.3, 0.4) }); });
  // the part drawn so far, cut at the head's x
  const hx = px + pw * u, Q = [P[0]]; let head = P[0], v = pts[0][1];
  for (let i = 1; i < n; i++) {
    if (P[i][0] <= hx + 1e-6) { Q.push(P[i]); head = P[i]; v = pts[i][1]; continue; }
    const k = (hx - P[i - 1][0]) / (P[i][0] - P[i - 1][0] || 1); head = [hx, lerp(P[i - 1][1], P[i][1], k)]; v = lerp(pts[i - 1][1], pts[i][1], k); Q.push(head); break;
  }
  const done = u >= 1 - 1e-6;
  if (u > 0) {
    if (o.area) { const al = (o.u != null ? (done ? 1 : 0) : igIn(t0 + d, 0.4)) * 0.16; if (al > 0) { ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = c; igPath([...P, [P[n - 1][0], base], [P[0][0], base]]); ctx.fill(); ctx.restore(); } }
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = o.lw ?? 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; igPath(Q, false); ctx.stroke(); ctx.restore();
    if (o.dots !== false) P.forEach((p, i) => { if (p[0] <= hx + 1e-6 && i < n - 1) { const s = o.u != null ? 1 : igSpr(tAt(i), SPRING.playful); igDisc(p[0], p[1], 8 * s, IG.card); igDisc(p[0], p[1], 4.5 * s, c); } });
    if (o.head !== false) {
      if (done) { const q = mod(TT * 1.2, 1); ctx.save(); ctx.globalAlpha *= (1 - q) * 0.35; igDisc(head[0], head[1], 12 + q * 22, c); ctx.restore(); }   // idle life: the last point pulses
      igDisc(head[0], head[1], 14, IG.card); igDisc(head[0], head[1], 9.5, o.headC ?? c);
    }
  }
  if (o.note && P[o.note.i]) igCallout(P[o.note.i][0], P[o.note.i][1], o.note.text, { t0: o.u != null ? (P[o.note.i][0] <= hx ? -1e9 : 1e9) : tAt(o.note.i), c, dot: false, ...o.note });
  return { head, v, P, u, done, base, tAt };
}
// A donut. (x, y) = centre, r = the ring's centre-line radius, w = its width. segments: [{ v, c, label }]; they
// sweep clockwise from 12 o'clock in order, over o.d seconds from t0.
// o: d (1.0), u (explicit 0..1 progress), total (the full circle's value; default the segments' sum: pass 10 with one
//   segment of 7 for "7 of 10"), track (the unswept ring, default light grey; false = none), gap (px between
//   segments, 5), labels (true = a leader line and "label value" beside each finished segment), labSize (30),
//   unit, fill (0..1: a solid disc in fillC, default the first segment's colour, grows from the centre over the
//   ring, under the centre numeral: the donut becomes a badge, a clean bridge shape),
//   centre: { to, from, suffix, size, c, dec, label } (a numeral that counts with the sweep; `v` overrides).
// Returns { head: [x, y] (the sweep's head on the centre line), top: [x, y - r - w/2], u, R (outer radius),
//   anchors: [[x, y], ...] (where each segment's label starts) }.
function igDonut(x, y, r, w, segments, t0, o = {}) {
  const sum = segments.reduce((a, s) => a + s.v, 0), total = o.total ?? sum, d = o.d ?? 1.0, a0 = -Math.PI / 2;
  const u = o.u ?? (TT < t0 ? 0 : EZ.io(seg(TT, t0, t0 + d))), swept = sum / total * u, fill = clamp(o.fill ?? 0);
  const wv = w, rv = r, gap = (o.gap ?? 5) / r, anchors = [];
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineWidth = wv;
  if (o.track !== false) { ctx.strokeStyle = o.track ?? IG.greyL; ctx.beginPath(); ctx.arc(x, y, rv, 0, TAU); ctx.stroke(); }
  let f = 0;
  segments.forEach((s, i) => {
    const f0 = f / total, f1 = (f + s.v) / total; f += s.v;
    const e = Math.min(f1, swept), last = i === segments.length - 1 && Math.abs(sum - total) > 1e-9;
    if (e > f0 + 1e-6) { ctx.strokeStyle = s.c ?? IG_CAT[i % IG_CAT.length]; ctx.beginPath(); ctx.arc(x, y, rv, a0 + TAU * f0 + (i ? gap / 2 : 0), Math.max(a0 + TAU * f0 + (i ? gap / 2 : 0) + 1e-4, a0 + TAU * e - (last || e < f1 ? 0 : gap / 2))); ctx.stroke(); }
    const am = a0 + TAU * (f0 + f1) / 2, R1 = r + w / 2 + 8, R2 = r + w / 2 + 34, sgn = Math.cos(am) >= 0 ? 1 : -1;
    const ax = x + Math.cos(am) * R2 + sgn * 26, ay = y + Math.sin(am) * R2; anchors.push([ax, ay]);
    const al = clamp((swept - f1) / 0.03 + 1);
    if (o.labels && al > 0.05 && s.label) {
      ctx.save(); ctx.globalAlpha *= al; ctx.strokeStyle = IG.ink; ctx.lineWidth = 2.5 / igZoom(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x + Math.cos(am) * R1, y + Math.sin(am) * R1); ctx.lineTo(x + Math.cos(am) * R2, y + Math.sin(am) * R2); ctx.lineTo(ax, ay); ctx.stroke(); ctx.restore();
      const ls = o.labSize ?? 30, str = s.label + (o.values === false ? '' : ' ' + igNum(s.v, o.dec ?? 0) + (o.unit ?? ''));
      igText(str, ax + sgn * 10, ay + ls * 0.35, ls, IG.ink, { sans: true, weight: 600, align: sgn > 0 ? 'left' : 'right', al });
    }
  });
  ctx.restore();
  if (fill > 0) igDisc(x, y, (r + w / 2) * fill, o.fillC ?? segments[0].c ?? IG_CAT[0]);
  const C = o.centre;
  if (C) {
    const size = C.size ?? r * 0.62, v = C.v ?? lerp(C.from ?? 0, C.to, u);
    igCounter(x, y + size * 0.35 - (C.label ? size * 0.22 : 0), size, C.to, 0, { v, suffix: C.suffix, dec: C.dec, c: C.c ?? IG.ink, align: 'center', suffixK: C.suffixK ?? 0.55, al: C.al });
    if (C.label) igText(C.label, x, y + size * 0.62, C.labSize ?? 30, C.labelC ?? IG.grey, { sans: true, weight: 600, align: 'center', al: C.al });
  }
  const ah = a0 + TAU * swept;
  return { head: [x + Math.cos(ah) * r, y + Math.sin(ah) * r], top: [x, y - r - w / 2], u, R: r + w / 2, anchors };
}

// ---------------------------------------------------------------------
//  two quantities side by side
// ---------------------------------------------------------------------
// igScale: proportional circles (AREA is proportional to the value) standing on one baseline. (x, y) = the middle of
// the baseline, a / b = { v, label, c }. o: r (the bigger circle's radius, 150), gap (40), dec, unit, valSize.
// The discs grow on a spring from t0 (b 0.12s later) and the values count with them. Returns { a: [x, y, r], b: [x, y, r] }.
function igScale(x, y, a, b, t0, o = {}) {
  const R = o.r ?? 150, m = Math.max(a.v, b.v), ra = R * Math.sqrt(a.v / m), rb = R * Math.sqrt(b.v / m), gap = o.gap ?? 40, vs = o.valSize ?? 44;
  const xa = x - (ra + rb + gap) / 2 + ra - (ra - rb) / 2, xb = xa + ra + gap + rb, out = {};
  [[a, xa, ra, t0, 'a'], [b, xb, rb, t0 + (o.stagger ?? 0.12), 'b']].forEach(([q, cx, r, t, k], i) => {
    const s = igSpr(t), c = q.c ?? (i ? IG.coral : IG.teal), rr = Math.max(0, r * s); out[k] = [cx, y - rr, rr];
    if (s <= 0) return;
    igDisc(cx, y - rr, rr, c);
    const str = igNum(q.v * clamp(s), o.dec ?? 0) + (o.unit ?? ''), inside = igTextW(str, vs) < r * 1.5;
    igText(str, cx, inside ? y - rr + vs * 0.35 : y - rr * 2 - 14, vs, inside ? IG.white : c, { align: 'center', al: clamp(s * 4) });
    if (q.label) igLabel(q.label, cx, y + 44, o.labSize ?? 30, IG.grey, { align: 'center', al: clamp(s * 4) });
  });
  igHair(x - (ra + rb) - gap, y, x + ra + rb + gap, y, IG.ink, 3.5);
  return out;
}
// igCompare: stacked units, one row per quantity: a label line, then v / per pictograms (the last one clipped) and
// the value at the row's end. (x, y) = top left, w = the full width. a / b = { v, label, c }.
// o: icon ('person'), per (what one unit stands for; default so that the bigger row has 10 units), s (unit size, 64),
//   stagger (0.08), rowH, dec, unit, valSize (40). Returns { rows: [igPictoGrid result, ...], per }.
function igCompare(x, y, w, a, b, t0, o = {}) {
  const m = Math.max(a.v, b.v), per = o.per ?? m / 10, nMax = Math.ceil(m / per - 1e-9), vs = o.valSize ?? 40, s = o.s ?? 64, rowH = o.rowH ?? s + 76;
  const vw = Math.max(igTextW(igNum(a.v, o.dec ?? 0) + (o.unit ?? ''), vs), igTextW(igNum(b.v, o.dec ?? 0) + (o.unit ?? ''), vs)) + 20, gw = Math.min(w - vw, nMax * s * 1.08), rows = [];
  [a, b].forEach((q, i) => {
    const y0 = y + rowH * i, t = t0 + i * (o.rowLag ?? 0.3), n = Math.ceil(q.v / per - 1e-9), c = q.c ?? (i ? IG.coral : IG.teal);
    if (q.label) igLabel(q.label, x, y0 + 26, o.labSize ?? 30, IG.grey, { al: igIn(t - 0.15, 0.3) });
    const g = igPictoGrid(o.icon ?? 'person', x, y0 + 40, gw / nMax * n, t, { n, cols: n, filled: q.v / per, stagger: o.stagger ?? 0.08, c, s, rowH: s + 8, off: 'rgba(0,0,0,0)' });
    igText(igNum(g.value * per, o.dec ?? 0) + (o.unit ?? ''), x + gw / nMax * n + 14, y0 + 40 + (s + 8) / 2 + vs * 0.35, vs, c, { al: clamp(g.value * 3) });
    rows.push(g);
  });
  return { rows, per };
}

// ---------------------------------------------------------------------
//  the hero: a coral map pin / data-point marker with two eyes. (x, y) = its TIP (the datum it stands on),
//  r = the head's radius (the pin is about 2.6 r tall). It bobs up off the datum, blinks, and squashes on landing.
//  o: key, color, look (-1..1), squash (0..1; negative = a stretch in the air), mood ('pin' | 'wow'), tilt, shadow (false = none)
// ---------------------------------------------------------------------
function igPinPts(x, y, r, n = 72) {
  const h = r * 1.62, th = Math.acos(r / h), a0 = Math.PI / 2 + th, a1 = Math.PI / 2 - th + TAU, P = [];
  for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / (n - 1)); P.push([x + Math.cos(a) * r, y - h + Math.sin(a) * r]); }
  P.push([x, y]); return P;
}
function igHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', sq = o.squash ?? 0, ph = hash('igh', key) % 7;
  const lift = o.bob === false ? 0 : (0.5 + 0.5 * Math.sin(TT * TAU * 0.75 + ph)) * r * 0.16 * (sq > 0.05 ? 0 : 1);
  const sx = 1 + sq * 0.26, sy = 1 - sq * 0.24, hy = -r * 1.62;
  if (o.shadow !== false && r > 6) { ctx.save(); ctx.fillStyle = 'rgba(27,42,65,0.2)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.04, r * (0.42 - lift / r * 0.6), r * 0.11, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.translate(x, y - lift); if (o.tilt) ctx.rotate(o.tilt); ctx.scale(sx, sy);
  SPARK_AT = toScreen(0, hy);
  ctx.fillStyle = ctx.strokeStyle = o.color ?? IG.coral; ctx.lineJoin = 'round'; ctx.lineWidth = r * 0.14;
  igPath(igPinPts(0, 0, r * 0.93)); ctx.fill(); ctx.stroke();
  if (o.eyes !== false && r > 8) {
    const blink = igBlink(key), lk = (o.look ?? 0) * r * 0.1, wow = o.mood === 'wow';
    for (const s of [-1, 1]) {
      const ex = s * r * 0.36, ey = hy - r * 0.02;
      if (blink) { ctx.fillStyle = IG.navy; igRR(ex - r * 0.2, ey - r * 0.04, r * 0.4, r * 0.09, r * 0.04); ctx.fill(); continue; }
      ctx.fillStyle = IG.white; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.23, r * (wow ? 0.3 : 0.26), 0, 0, TAU); ctx.fill();
      igDisc(ex + lk, ey + r * (wow ? -0.04 : 0.03), r * (wow ? 0.1 : 0.12), IG.navy);
    }
  }
  ctx.restore();
}
// a hop along a parabola from a to b over [t0, t0 + d] -> { x, y, squash, air } (squash spikes on landing, stretches in the air)
function igHop(a, b, t0, d, hgt = 120) {
  const u = clamp((TT - t0) / d), x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * hgt;
  const land = TT >= t0 + d ? Math.exp(-(TT - t0 - d) * 14) * Math.cos((TT - t0 - d) * 30) : 0, air = u > 0 && u < 1;
  return { x, y, squash: air && hgt > 0 ? -0.25 * Math.abs(Math.cos(u * Math.PI)) : Math.max(0, land), air };
}
// a chain of hops through points P, ARRIVING at P[i] on T[i] (so a landing can sit on a beat or a spoken word).
// Before T[0] the hero is not placed (returns null) unless o.wait: then it stands on P[0].
function igHops(P, T, hgt = 120, d = 0.2, o = {}) {
  let k = 0; for (let i = 1; i < T.length; i++) if (TT >= T[i] - d) k = i;
  if (k === 0) { if (TT < T[0] && !o.wait) return null; const dt = TT - T[0]; return { x: P[0][0], y: P[0][1], squash: dt >= 0 ? Math.max(0, Math.exp(-dt * 14) * Math.cos(dt * 30)) : 0, air: false }; }
  return igHop(P[k - 1], P[k], T[k] - d, d, hgt);
}

// ---------------------------------------------------------------------
//  titles, captions, the source line (through DEFER: after the camera, at screen size). All of them leave in the
//  first 0.3s of a bridge and stay hidden until it is over; in an era that opens out of a bridge they enter when
//  it ends (igEraIn), so no screen-size text ever sits on the morph window.
// ---------------------------------------------------------------------
function igLeaving() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) { const d = r.d ?? 0.6; if (TT >= r.tc - d - 1e-6 && TT < r.tc + d - 1e-6) return TT < r.tc ? 1 - EZ.o2(seg(TT, r.tc - d, r.tc - d + 0.3)) : 0; }
  return 1;
}
function igEraIn() {
  if (typeof BRIDGES === 'undefined') return -1e9;
  for (const r of BRIDGES) if (Math.abs(r.tc - E0) < 1e-3) return r.tc + (r.d ?? 0.6);
  return -1e9;
}
const igDefer = (f) => { if (DEFER) DEFER.push(f); else f(); };
const IG_TOP = () => (typeof SAFE !== 'undefined' && SAFE.top ? SAFE.top : H * 0.06);
// the title block, top left inside the safe area: a small-caps kicker with a colour chip, then a bold headline
// ('line one\nline two'). o: x, y (the kicker's baseline), size (64), at (seconds after the era starts, 0.1),
//   t0 (absolute, overrides at), c (the chip's colour, default teal), maxW.
function igTitleNow(kicker, headline, o = {}) {
  const al = igLeaving(); if (al <= 0.001) return;
  const U = UNIT, x = o.x ?? 60 * U, y = o.y ?? IG_TOP() + 56 * U, size = (o.size ?? 64) * U, ks = 30 * U, t0 = Math.max(o.t0 ?? E0 + (o.at ?? 0.1), igEraIn());
  if (TT <= t0) return;
  ctx.save(); ctx.globalAlpha = al;
  const a = igIn(t0, 0.35);
  if (kicker) {
    ctx.fillStyle = o.c ?? IG.teal; igRR(x, y - ks * 0.74, ks * 0.74 * igSpr(t0, SPRING.playful), ks * 0.74, 6 * U); ctx.fill();
    igLabel(kicker, x + ks * 1.1, y + (1 - a) * 14, ks, IG.grey, { al: a });
  }
  const lines = String(headline ?? '').split('\n'), maxW = o.maxW ?? W - x - (typeof SAFE !== 'undefined' && SAFE.right ? SAFE.right : x);
  lines.forEach((ln, i) => {
    const u = igIn(t0 + 0.08 + i * 0.1, 0.4); if (u <= 0 || !ln) return;
    const k = Math.min(1, maxW / igTextW(ln, size));
    igText(ln, x, y + size * 1.22 + i * size * 1.14 + (1 - u) * 22, size * k, IG.ink, { al: u });
  });
  ctx.restore();
}
const igTitle = (kicker, headline, o) => igDefer(() => igTitleNow(kicker, headline, o));
// the caption: 'text with a *keyword*' (one or two lines, '\n'), centred on CX near y = 0.75 H; the *keyword* sits on
// a coloured pill that pops in after the line (white type on it). o: y (the last line's baseline), size (54), at
// (seconds after the era starts, 0.6), t0 (absolute), hi (the pill, default coral), hiT (type on it), c, maxW, x.
function igCaptionNow(str, o = {}) {
  const al = igLeaving(); if (al <= 0.001) return;
  const U = UNIT, size0 = (o.size ?? 54) * U, yLast = o.y ?? H * 0.75, t0 = Math.max(o.t0 ?? E0 + (o.at ?? 0.6), igEraIn()), col = o.c ?? IG.ink;
  const lines = str.split('\n'), maxW = o.maxW ?? Math.min(860 * U, W * 0.8);
  ctx.save(); ctx.globalAlpha = al;
  lines.forEach((line, li) => {
    const lt = t0 + li * 0.1, u = igIn(lt, 0.35); if (TT <= lt) return;
    const parts = line.split(/(\*[^*]+\*)/).filter((g) => g.length), raw = parts.map((g) => (g[0] === '*' ? g.slice(1, -1) : g));
    const wide = (sz) => raw.map((g, i) => igTextW(g, sz) + (parts[i][0] === '*' ? sz * 0.44 : 0));
    let size = size0, ws = wide(size), tot = ws.reduce((a, b) => a + b, 0);
    if (tot > maxW) { size *= maxW / tot; ws = wide(size); tot = ws.reduce((a, b) => a + b, 0); }
    const yy = yLast - (lines.length - 1 - li) * size0 * 1.34 + (1 - u) * 20; let xx = (o.x ?? CX) - tot / 2;
    parts.forEach((g, i) => {
      if (g[0] === '*') {
        const p = clamp(igSpr(lt + 0.22, SPRING.snappy), 0, 1.03), pad = size * 0.22, h = size * 1.3, cx = xx + ws[i] / 2, cy = yy - size * 0.34;
        if (p > 0.02) { ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.fillStyle = o.hi ?? IG.coral; igRR(-ws[i] / 2, -h / 2, ws[i], h, 14 * U); ctx.fill(); ctx.restore(); }
        igText(raw[i], xx + pad, yy, size, p > 0.5 ? (o.hiT ?? IG.white) : col, { al: u });
      } else igText(raw[i], xx, yy, size, col, { al: u });
      xx += ws[i];
    });
  });
  ctx.restore();
}
const igCaption = (str, o) => igDefer(() => igCaptionNow(str, o));
// the source / footnote line: small, grey, left. o: x, y (default 0.705 H: under the charts, above the caption), size (30), at, t0
function igSourceNow(str, o = {}) {
  const al = igLeaving(); if (al <= 0.001) return;
  const U = UNIT, t0 = Math.max(o.t0 ?? E0 + (o.at ?? 0.3), igEraIn()), u = igIn(t0, 0.4); if (u <= 0) return;
  const x = o.x ?? 60 * U, y = o.y ?? H * 0.705, size = (o.size ?? 30) * U;
  ctx.save(); ctx.globalAlpha = al;
  igDisc(x + size * 0.18, y - size * 0.3, size * 0.14, IG.grey);
  igText(str, x + size * 0.6, y, size, IG.grey, { sans: true, weight: 600, al: u });
  ctx.restore();
}
const igSource = (str, o) => igDefer(() => igSourceNow(str, o));

// =====================================================================
//  STYLE — the renderer's hooks
// =====================================================================
const STYLE = {
  name: 'infographic',
  paper: IG.ground,
  // the sheet a morph happens on: flat ground with the plotting grid (so the grid never drops out during a bridge)
  backdrop(c, o) { fillAll(o ? STYLE.paper : c); if (o) { ctx.save(); screen(); igGridLines(); ctx.restore(); } },
  // the era seen through outline P: a hard mask with a thin ink ring
  // (the ring is 4px where the window hugs the bridge shape and is gone as soon as the window starts to open, so no stray line crosses the frame)
  window(P, key, src, o = {}) {
    ctx.save(); igPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const lw = 4 * (o.phase === 'grow' ? 1 - seg(o.u ?? 0, 0, 0.15) : o.phase === 'shrink' ? seg(o.u ?? 1, 0.8, 1) : 1);
    if (lw > 0.3) { ctx.save(); igPath(P); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.strokeStyle = IG.ink; ctx.stroke(); ctx.restore(); }
  },
  // the morphing shape: one flat solid on the cards' flat offset shadow
  blob(P, c) {
    ctx.save(); igPath(P.map(([x, y]) => [x, y + 10])); ctx.fillStyle = IG_SHADOW; ctx.fill(); ctx.restore();
    ctx.save(); igPath(P); ctx.fillStyle = c; ctx.fill(); ctx.restore();
  },
  hero(x, y, r, o = {}) { igHero(x, y + r, r * 0.76, { key: o.key, mood: o.mood }); },   // r = half the hero's size
  heroColor: IG.coral,
  heroPts(x, y, r) { return igPinPts(x, y + r, r * 0.76); },
  post() {},
  ones: true,
};
