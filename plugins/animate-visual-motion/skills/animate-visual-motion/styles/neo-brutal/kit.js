// =====================================================================
//  styles/neo-brutal/kit.js — NEO-BRUTAL: neo-brutalist product / web design in motion. Built on kit/core.js.
//  Every element is a flat, fully saturated block with a thick pure-black border (NB.bw px, constant on screen,
//  mitred) and a HARD shadow: the same outline in black, shifted down-right by NB.sh px, zero blur. Nothing is
//  shaded, blurred, textured or transparent. Things sit a few degrees off, overlap and butt against the frame.
//  The medium's objects: cards, buttons that press into their own shadow, stickers and seal badges, angled marquee
//  strips, a window chrome with three square dots, tags, toggles, sliders, fat pictograms, very heavy grotesk type.
//  Motion on 1s, physical: blocks slam in and stop dead (nbSlam), stickers slap on (nbSlap), buttons press on the
//  beat (nbPress), marquees scroll linearly. Times given to those helpers are the moment of IMPACT, not the start.
//  Coordinates: containers (nbBox, nbWindow, nbToggle, nbSlider) take a top-left corner; objects (nbButton,
//  nbSticker, nbBurst, nbTag, nbIcon, nbHero) take their centre. Needs from the piece head: CX (caption centre x).
//  Optional piece constants (declare before the kit): NB_BW, NB_SH (border and shadow in px at 1080 wide).
// =====================================================================
const NB = {
  ink: '#0a0a0a', cream: '#fff4e0', white: '#ffffff',
  pink: '#ff4fa3', yellow: '#ffe14a', blue: '#2f6bff', mint: '#3ddc97', lilac: '#b79cff',
  hero: '#ff6a1f',                                         // orange: reserved for the mascot
  bw: typeof NB_BW !== 'undefined' ? NB_BW : 7,            // border width, screen px
  sh: typeof NB_SH !== 'undefined' ? NB_SH : 14,           // hard shadow offset (down and right), screen px
};
const NB_FONT = '"Arial Black", "Helvetica Neue", "Segoe UI Black", "Segoe UI", Impact, "Liberation Sans", "DejaVu Sans", Arial, sans-serif';
const NB_CAP = 0.716;                                      // cap height of the stack, in em: centres type in a block

// ---- small things every helper uses
function nbZoom() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }   // borders stay NB.bw on screen under any camera
function nbFont(size, o = {}) { ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 900} ${size}px ${o.font ?? NB_FONT}`; }
function nbTextW(str, size, o = {}) { ctx.save(); nbFont(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }
function nbPath(P) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
const nbPoly = (U, x, y, r, rot = 0) => { const c = Math.cos(rot), s = Math.sin(rot); return U.map(([u, v]) => [x + (u * c - v * s) * r, y + (u * s + v * c) * r]); };
// black or white, whichever reads on colour c
const nbOn = (c) => { const m = /^#(..)(..)(..)$/.exec(c); if (!m) return NB.ink; const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16)); return r * 0.3 + g * 0.59 + b * 0.11 > 120 ? NB.ink : NB.white; };

// ---- motion: all closed-form, so any frame draws on its own
// a block slams in from off-frame and LANDS at time t: it accelerates, stops dead, carries a few px past and snaps back.
// from: 'l' | 'r' | 't' | 'b'. Returns the [dx, dy] to add to the resting position (far off-frame before it starts).
function nbSlam(t, from = 'l', o = {}) {
  const d = o.d ?? 0.17, far = o.dist ?? 1500, over = o.over ?? 16, u = TT - (t - d);
  const dir = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] }[from];
  let k;
  if (u <= 0) k = far; else if (u < d) k = far * (1 - (u / d) ** 1.7); else k = -over * Math.exp(-(u - d) * 20) * Math.sin((u - d) * 34);
  return [dir[0] * k, dir[1] * k];
}
const nbLanded = (t) => TT >= t - 1e-6;
// a sticker is slapped on at time t: it drops in big during the 2 frames before, then its rotation wobbles out.
// Returns { s: scale (0 = not there yet), rot: extra rotation }.
function nbSlap(t, o = {}) {
  const pre = o.pre ?? 0.085, u = TT - t;
  if (u < -pre - 1e-6) return { s: 0, rot: 0 };
  if (u < 0) return { s: lerp(1, 1.9, (-u / pre) ** 0.8), rot: (o.twist ?? 0.35) * (-u / pre) };
  return { s: 1 - 0.07 * Math.exp(-u * 16) * Math.cos(u * 30), rot: (o.wob ?? 0.16) * Math.exp(-u * 9) * Math.sin(u * 31) };
}
// a press envelope 0..1 for a button hit at each time in `times`: half down the frame before, fully down ON the
// beat, held for 3 frames, released in 2. Feed it to nbBox / nbButton as o.press.
function nbPress(times, hold = 0.125) {
  let p = 0;
  for (const t of [].concat(times)) { const u = TT - t; p = Math.max(p, u < -0.05 ? 0 : u < -1e-6 ? 0.5 : u < hold ? 1 : 1 - seg(u, hold, hold + 0.085)); }
  return p;
}
// a value that ticks on the beat instead of gliding: n steps per second (a badge turning notch by notch)
const nbStep = (per = 0.5, t0 = 0) => Math.floor((TT - t0) / per + 1e-6);
function nbInBridge(pad = 0) {   // is the renderer inside a morph bridge? (captions hide there)
  if (typeof BRIDGES === 'undefined') return false;
  return BRIDGES.some((r) => Math.abs(TT - r.tc) < (r.d ?? 0.6) + pad - 1e-6);
}

// ---- the block: THE primitive. Fill c, black border, hard shadow. x, y = top-left.
// o: r (corner radius), rot (about the centre), press 0..1 (the block sinks into its shadow), s (scale about the centre),
//    sh (shadow px; 0 = none), lw (border px), shc (shadow colour), line (border colour),
//    draw(w, h): content drawn in the block's own frame (origin top-left), clipped to it unless clip: false
function nbBox(x, y, w, h, c, o = {}) {
  const z = nbZoom(), sh = (o.sh ?? NB.sh) / z, pr = clamp(o.press ?? 0), s = o.s ?? 1, rot = o.rot ?? 0;
  if (s <= 0 || w <= 0 || h <= 0) return;
  const r = Math.min(o.r ?? 0, w / 2, h / 2), cx = x + w / 2, cy = y + h / 2;
  const path = () => { ctx.beginPath(); if (r > 0) ctx.roundRect(-w / 2, -h / 2, w, h, r); else ctx.rect(-w / 2, -h / 2, w, h); };
  const at = (d) => { ctx.translate(cx + d, cy + d); if (rot) ctx.rotate(rot); if (s !== 1) ctx.scale(s, s); };
  ctx.lineJoin = 'miter'; ctx.miterLimit = 10;
  if (sh > 0) { ctx.save(); at(sh); path(); ctx.fillStyle = ctx.strokeStyle = o.shc ?? NB.ink; ctx.lineWidth = (o.lw ?? NB.bw) / nbZoom(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.save(); at(sh * pr); path(); ctx.fillStyle = c; ctx.fill();
  if (o.draw) { ctx.save(); if (o.clip !== false) { path(); ctx.clip(); } ctx.translate(-w / 2, -h / 2); o.draw(w, h); ctx.restore(); }
  path(); ctx.lineWidth = (o.lw ?? NB.bw) / nbZoom(); ctx.lineJoin = 'miter'; ctx.strokeStyle = o.line ?? NB.ink; ctx.stroke();
  ctx.restore();
}
// any outline P (world points) as a block: fill, border, hard shadow. o: sh, lw, press, shc, join
function nbShape(P, c, o = {}) {
  const z = nbZoom(), sh = (o.sh ?? NB.sh) / z, lw = (o.lw ?? NB.bw) / z, pr = clamp(o.press ?? 0);
  ctx.save(); ctx.lineJoin = o.join ?? 'miter'; ctx.miterLimit = o.miter ?? 4; ctx.lineWidth = lw;
  if (sh > 0) { ctx.save(); ctx.translate(sh, sh); nbPath(P); ctx.fillStyle = ctx.strokeStyle = o.shc ?? NB.ink; ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.translate(sh * pr, sh * pr); nbPath(P); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = o.line ?? NB.ink; ctx.stroke();
  ctx.restore();
}
// open strokes as a block (asterisk arms, a tick): each [[x, y], ...] polyline gets a colour core, a black rim and the shadow
function nbStrokes(L, wd, c, o = {}) {
  const z = nbZoom(), sh = (o.sh ?? NB.sh) / z, lw = (o.lw ?? NB.bw) / z;
  const run = (Q, col, w, d) => { ctx.save(); ctx.translate(d, d); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; for (const P of Q) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); } ctx.restore(); };
  // the rim's ends reach lw past the core's ends, so the border closes round each arm
  const ext = L.map((P) => { const n = P.length, a = P[0], b = P[1], e = P[n - 1], f = P[n - 2], la = dist(a, b) || 1, le = dist(e, f) || 1; return [[a[0] + (a[0] - b[0]) / la * lw, a[1] + (a[1] - b[1]) / la * lw], ...P.slice(1, -1), [e[0] + (e[0] - f[0]) / le * lw, e[1] + (e[1] - f[1]) / le * lw]]; });
  if (sh > 0) run(ext, NB.ink, wd + 2 * lw, sh);
  run(ext, NB.ink, wd + 2 * lw, 0); if (c) run(L, c, wd, 0);
}

// ---- type: very heavy grotesk. y = baseline. Returns the drawn width.
// o: align, rot, maxW (shrinks to fit), hl (a highlighter block colour behind it: bordered, with a shadow), hlSh, hlPad,
//    stroke (a black outline + hard shadow on the letters themselves: for light or coloured words on a loud ground), weight
function nbText(str, x, y, size, color, o = {}) {
  let sz = size, w = nbTextW(str, sz, o);
  if (o.maxW && w > o.maxW) { sz *= o.maxW / w; w = o.maxW; }
  const al = o.align ?? 'left', x0 = al === 'center' ? -w / 2 : al === 'right' ? -w : 0, rot = o.rot ?? 0;
  { const [sx, sy] = toScreen(x, y), k = nbZoom(), m = sz * 0.4 * k, l = sx + x0 * k; if (l + w * k + m < 0 || l - m > ctx.canvas.width || sy + m < 0 || sy - sz * k - m > ctx.canvas.height) return w; }   // wholly off-frame (mid-slam): draw nothing
  ctx.save(); ctx.translate(x, y);
  if (o.hl) { const px = o.hlPad ?? sz * 0.13; nbBox(x0 - px, -sz * (NB_CAP + 0.17), w + 2 * px, sz * (NB_CAP + 0.34), o.hl, { rot: rot + (o.hlRot ?? 0), sh: o.hlSh ?? NB.sh * 0.7, press: o.press, r: o.hlR ?? 0 }); }
  if (rot) { ctx.translate(x0 + w / 2, -sz * NB_CAP / 2); ctx.rotate(rot); ctx.translate(-(x0 + w / 2), sz * NB_CAP / 2); }
  nbFont(sz, o); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (o.stroke) {
    const z = nbZoom(), d = (o.strokeSh ?? NB.sh * 0.6) / z, c = Math.cos(-rot), s = Math.sin(-rot), dx = d * (c - s), dy = d * (s + c);
    ctx.lineJoin = 'round'; ctx.lineWidth = (o.strokeW ?? NB.bw * 1.7) / z; ctx.strokeStyle = ctx.fillStyle = NB.ink;
    ctx.strokeText(str, x0 + dx, dy); ctx.fillText(str, x0 + dx, dy); ctx.strokeText(str, x0, 0);
  }
  ctx.fillStyle = color; ctx.fillText(str, x0, 0);
  ctx.restore(); return w;
}

// ---- pictograms: fat, flat, bordered. kind: arrow | bolt | cursor | star | plus | asterisk | check | smiley
// x, y = centre (cursor: its tip), r = half its size. o: rot, flat (no border or shadow: for use inside a button), sh, lw, press
const NB_ICON = {
  arrow: [[-1, -0.3], [0.08, -0.3], [0.08, -0.76], [1, 0], [0.08, 0.76], [0.08, 0.3], [-1, 0.3]],
  bolt: [[0.02, -1], [-0.62, 0.14], [-0.1, 0.14], [-0.3, 1], [0.62, -0.22], [0.08, -0.22], [0.48, -1]],
  cursor: [[0, 0], [0, 1.72], [0.44, 1.3], [0.76, 2.02], [1.08, 1.88], [0.76, 1.18], [1.36, 1.18]],
  star: Array.from({ length: 8 }, (_, i) => { const a = i / 8 * TAU - Math.PI / 2, k = i % 2 ? 0.4 : 1; return [Math.cos(a) * k, Math.sin(a) * k]; }),
  plus: [[-0.32, -1], [0.32, -1], [0.32, -0.32], [1, -0.32], [1, 0.32], [0.32, 0.32], [0.32, 1], [-0.32, 1], [-0.32, 0.32], [-1, 0.32], [-1, -0.32], [-0.32, -0.32]],
};
function nbIcon(kind, x, y, r, c, o = {}) {
  const rot = o.rot ?? 0, sh = o.flat ? 0 : (o.sh ?? NB.sh * 0.6), so = { sh, lw: o.lw, press: o.press };
  if (r <= 0) return;
  if (NB_ICON[kind]) {
    const P = nbPoly(NB_ICON[kind], x, y, r, rot);
    if (o.flat) { ctx.save(); nbPath(P); ctx.fillStyle = c; ctx.fill(); ctx.restore(); } else nbShape(P, c, so);
  } else if (kind === 'asterisk') {
    const n = o.n ?? 3, L = []; for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI; L.push([[x - Math.cos(a) * r, y - Math.sin(a) * r], [x + Math.cos(a) * r, y + Math.sin(a) * r]]); }
    if (o.flat) { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = r * 0.36; for (const P of L) { ctx.beginPath(); ctx.moveTo(...P[0]); ctx.lineTo(...P[1]); ctx.stroke(); } ctx.restore(); } else nbStrokes(L, r * 0.34, c, so);
  } else if (kind === 'check') {
    const P = nbPoly([[-0.9, 0.05], [-0.3, 0.65], [0.9, -0.6]], x, y, r, rot);
    if (o.flat) { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = r * 0.4; ctx.lineJoin = 'miter'; ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke(); ctx.restore(); } else nbStrokes([P], r * 0.36, c, so);
  } else if (kind === 'smiley') {
    nbShape(ellipsePts(x, y, r, r, 0, 40), c, so);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = ctx.strokeStyle = NB.ink;
    for (const s of [-1, 1]) ctx.fillRect(s * r * 0.34 - r * 0.09, -r * 0.42, r * 0.18, o.blink ? r * 0.06 : r * 0.34);
    ctx.lineWidth = r * 0.15; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.5, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); ctx.restore();
  }
}
// short fat ticks round a point for 0.2s after a hit at time t: a click registers (3-5 of them, never a full burst)
function nbTicks(x, y, r, t, o = {}) {
  const u = (TT - t) / (o.d ?? 0.21); if (u < 0 || u >= 1) return;
  const n = o.n ?? 4, a0 = o.a0 ?? -2.5, a1 = o.a1 ?? -0.65, z = nbZoom();
  ctx.save(); ctx.strokeStyle = o.c ?? NB.ink; ctx.lineWidth = (o.w ?? 12) / z; ctx.lineCap = 'butt';
  for (let i = 0; i < n; i++) { const a = lerp(a0, a1, n > 1 ? i / (n - 1) : 0.5), k0 = r * (1 + 0.5 * u), k1 = k0 + r * 0.55 * (1 - u * 0.6); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * k0, y + Math.sin(a) * k0); ctx.lineTo(x + Math.cos(a) * k1, y + Math.sin(a) * k1); ctx.stroke(); }
  ctx.restore();
}

// ---- interface blocks
// a button: a pill (default) or a rectangle (o.pill: false, o.r) with a heavy label; o.press sinks it into its shadow.
// o: size, tc (label colour), icon (a flat pictogram after the label), rot, s, at (slapped on at that time), sh
function nbButton(x, y, w, h, label, c, o = {}) {
  const sl = o.at != null ? nbSlap(o.at) : { s: 1, rot: 0 }, size = o.size ?? h * 0.42, tc = o.tc ?? nbOn(c);
  nbBox(x - w / 2, y - h / 2, w, h, c, { r: o.pill === false ? (o.r ?? 0) : h / 2, rot: (o.rot ?? 0) + sl.rot, s: (o.s ?? 1) * sl.s, press: o.press, sh: o.sh, lw: o.lw, draw: (bw, bh) => {
    const ir = o.icon ? size * 0.36 : 0, gap = o.icon ? size * 0.3 : 0, tw = Math.min(nbTextW(label, size), bw - h * 0.7 - 2 * ir - gap), x0 = (bw - tw - gap - 2 * ir) / 2;
    nbText(label, x0, bh / 2 + size * NB_CAP / 2, size, tc, { maxW: tw });
    if (o.icon) nbIcon(o.icon, x0 + tw + gap + ir, bh / 2, ir, tc, { flat: true });
  } });
}
// a sticker: a label block sized to its text, a few degrees off, slapped on at o.at. o: size, rot, r, tc, icon, pad, press
function nbSticker(x, y, label, c, o = {}) {
  const size = o.size ?? 64, sl = o.at != null ? nbSlap(o.at) : { s: 1, rot: 0 }, ir = o.icon ? size * 0.36 : 0, gap = o.icon ? size * 0.28 : 0;
  const tw = nbTextW(label, size), px = o.pad ?? size * 0.42, w = tw + 2 * px + gap + 2 * ir, h = size * 1.5, tc = o.tc ?? nbOn(c);
  nbBox(x - w / 2, y - h / 2, w, h, c, { r: o.r ?? 10, rot: (o.rot ?? -0.1) + sl.rot, s: (o.s ?? 1) * sl.s, press: o.press, sh: o.sh, draw: (bw, bh) => {
    if (o.icon) nbIcon(o.icon, px + ir, bh / 2, ir, tc, { flat: true });
    nbText(label, px + gap + 2 * ir, bh / 2 + size * NB_CAP / 2, size, tc);
  } });
  return w;
}
// a seal badge: a round block with n shallow points that turns one notch per beat; the label stays level-ish.
// o: n, depth (0..1 of r), rot (the label's tilt), size, tc, at, turn (seconds per notch; 0 = still), sub (a small second line)
function nbBurst(x, y, r, label, c, o = {}) {
  const sl = o.at != null ? nbSlap(o.at) : { s: 1, rot: 0 }; if (sl.s <= 0) return;
  const n = o.n ?? 14, dep = o.depth ?? 0.17, turn = o.turn ?? 0.5, rr = r * (o.s ?? 1) * sl.s, rot = (o.rot ?? 0.2) + sl.rot;
  const spin = turn ? nbStep(turn) * (TAU / n / 2) : 0, P = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + spin + i / (n * 2) * TAU, k = i % 2 ? 1 - dep : 1; P.push([x + Math.cos(a) * rr * k, y + Math.sin(a) * rr * k]); }
  nbShape(P, c, { sh: o.sh, miter: 3, press: o.press });
  const size = (o.size ?? r * 0.5) * (rr / r), tc = o.tc ?? nbOn(c);
  nbText(label, x, y + size * NB_CAP / 2 - (o.sub ? size * 0.22 : 0), size, tc, { align: 'center', rot, maxW: rr * 1.36 });
  if (o.sub) { const s2 = size * 0.42; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); nbText(o.sub, 0, size * 0.62, s2, tc, { align: 'center', maxW: rr * 1.1 }); ctx.restore(); }
}
// a tag: a small pill or slab label. o: size, tc, rot, r (default pill), dot (a colour: a square status dot before the text), at
function nbTag(x, y, label, c, o = {}) {
  const size = o.size ?? 36, sl = o.at != null ? nbSlap(o.at) : { s: 1, rot: 0 }, dot = o.dot ? size * 0.62 : 0, gap = dot ? size * 0.34 : 0;
  const tw = nbTextW(label, size), px = size * 0.6, w = tw + 2 * px + dot + gap, h = size * 1.62, tc = o.tc ?? nbOn(c);
  nbBox(x - w / 2, y - h / 2, w, h, c, { r: o.r ?? h / 2, rot: (o.rot ?? 0) + sl.rot, s: sl.s, sh: o.sh ?? NB.sh * 0.6, lw: o.lw, draw: (bw, bh) => {
    if (dot) { ctx.fillStyle = o.dot; ctx.fillRect(px, bh / 2 - dot / 2, dot, dot); ctx.lineWidth = 4 / nbZoom(); ctx.strokeStyle = NB.ink; ctx.strokeRect(px, bh / 2 - dot / 2, dot, dot); }
    nbText(label, px + dot + gap, bh / 2 + size * NB_CAP / 2, size, tc);
  } });
  return w;
}
// a toggle: a fat track (w x w/2) and a square knob. on = 0..1 (drive it with springEase for the snap). x, y = top-left.
function nbToggle(x, y, w, on, c, o = {}) {
  const h = w * 0.5, k = clamp(on, -0.08, 1.08), sh = o.sh ?? NB.sh * 0.5, kn = h * 0.98;
  nbBox(x, y, w, h, on > 0.5 ? c : (o.off ?? NB.white), { r: o.r ?? h / 2, sh, lw: o.lw });
  nbBox(x + lerp(0, w - kn, k), y + (h - kn) / 2, kn, kn, o.knob ?? NB.ink, { r: o.r ?? kn / 2, sh: 0, line: NB.ink });
  const kx = x + lerp(0, w - kn, k) + kn / 2, ky = y + h / 2; ctx.fillStyle = on > 0.5 ? c : NB.white; ctx.fillRect(kx - kn * 0.14, ky - kn * 0.14, kn * 0.28, kn * 0.28);
}
// a slider: a fat track filled to frac with a square thumb. x = left, y = the track's centre line.
function nbSlider(x, y, w, frac, c, o = {}) {
  const h = o.h ?? 30, f = clamp(frac), th = o.thumb ?? h * 2;
  nbBox(x, y - h / 2, w, h, o.off ?? NB.white, { sh: o.sh ?? NB.sh * 0.5, lw: o.lw, draw: (bw, bh) => { ctx.fillStyle = c; ctx.fillRect(0, 0, bw * f, bh); } });
  nbBox(x + (w - th) * f, y - th / 2, th, th, o.knob ?? NB.yellow, { sh: o.sh ?? NB.sh * 0.5, lw: o.lw });
}
// a browser-ish window: a title bar with three square dots, a rule, a body. x, y = top-left of the whole window.
// o: c (body), barC, bar (bar height), title, dots ([c, c, c]), rot, press, s, sh, r, draw(w, bodyH): body content, origin = body top-left
function nbWindow(x, y, w, h, o = {}) {
  const bar = o.bar ?? 68, dots = o.dots ?? [NB.pink, NB.yellow, NB.mint];
  nbBox(x, y, w, h, o.c ?? NB.white, { r: o.r ?? 0, rot: o.rot, press: o.press, s: o.s, sh: o.sh, draw: (bw, bh) => {
    const z = nbZoom(), lw = NB.bw / z, d = bar * 0.36;
    ctx.fillStyle = o.barC ?? NB.yellow; ctx.fillRect(0, 0, bw, bar);
    ctx.fillStyle = NB.ink; ctx.fillRect(0, bar - lw / 2, bw, lw);
    dots.forEach((dc, i) => { const dx = bar * 0.34 + i * d * 1.5, dy = (bar - d) / 2; ctx.fillStyle = dc; ctx.fillRect(dx, dy, d, d); ctx.lineWidth = 4 / z; ctx.strokeStyle = NB.ink; ctx.strokeRect(dx, dy, d, d); });
    if (o.title) nbText(o.title, bw - bar * 0.4, bar / 2 + bar * 0.4 * NB_CAP / 2, bar * 0.4, NB.ink, { align: 'right', maxW: bw - bar * 0.9 - d * 4.6 });
    if (o.draw) { ctx.save(); ctx.translate(0, bar); ctx.beginPath(); ctx.rect(0, lw / 2, bw, bh - bar); ctx.clip(); o.draw(bw, bh - bar); ctx.restore(); }
  } });
}

// ---- a marquee: a strip of repeated words crossing the whole frame at an angle, scrolling LINEARLY (never eased).
// y = the strip's centre at the middle of the frame, h = its height. The words are rasterised once per (words, size,
// colour) into a strip canvas and tiled, so scrolling costs nothing. o: rot, speed (px/s, negative = leftwards), size,
// tc, sep (pictogram between repeats: asterisk | star | arrow | bolt | plus), sepC, dx / dy (a slam offset), sh
const NB_STRIPS = new Map();
function nbStrip(str, size, tc, sep, sepC, h) {
  const key = [str, size, tc, sep, sepC, h].join('|'); let S = NB_STRIPS.get(key); if (S) return S;
  const gap = size * 0.5, ir = size * 0.34, tw = nbTextW(str, size), unit = Math.ceil(tw + gap * 2 + ir * 2), cv = document.createElement('canvas');
  cv.width = unit; cv.height = Math.ceil(h); const keep = ctx; ctx = cv.getContext('2d');
  nbText(str, gap, h / 2 + size * NB_CAP / 2, size, tc); nbIcon(sep, gap * 1.5 + tw + ir, h / 2, ir, sepC, { flat: true, rot: sep === 'asterisk' ? 0.26 : 0 });
  ctx = keep; S = { cv, unit }; NB_STRIPS.set(key, S); return S;
}
function nbMarquee(y, h, str, c, o = {}) {
  const size = o.size ?? Math.round(h * 0.56), tc = o.tc ?? nbOn(c), S = nbStrip(str, size, tc, o.sep ?? 'asterisk', o.sepC ?? tc, h);
  const len = W * 1.7, off = mod((o.speed ?? -220) * TT + (o.phase ?? 0), S.unit);
  nbBox(W / 2 - len / 2 + (o.dx ?? 0), y - h / 2 + (o.dy ?? 0), len, h, c, { rot: o.rot ?? -0.08, sh: o.sh, draw: (bw, bh) => { for (let x = off - S.unit; x < bw; x += S.unit) ctx.drawImage(S.cv, Math.round(x), 0); } });
}

// ---- the ground: one flat colour and a coarse black pattern at low density (dots | grid | plus | none)
// o: step, a (alpha), dx / dy (px/s: the pattern marches, linearly), r (dot radius)
function nbPattern(kind = 'dots', o = {}) {
  if (kind === 'none') return;
  const st = o.step ?? (kind === 'grid' ? 90 : 60), ox = mod((o.dx ?? 0) * TT, st), oy = mod((o.dy ?? 0) * TT, st), x0 = -st * 4, x1 = W + st * 4, y0 = -st * 4, y1 = H + st * 4;
  ctx.save(); ctx.globalAlpha = o.a ?? (kind === 'grid' ? 0.13 : 0.2); ctx.fillStyle = ctx.strokeStyle = o.c ?? NB.ink;
  if (kind === 'grid') { const lw = o.w ?? 3; for (let x = x0 + ox; x < x1; x += st) ctx.fillRect(x - lw / 2, y0, lw, y1 - y0); for (let y = y0 + oy; y < y1; y += st) ctx.fillRect(x0, y - lw / 2, x1 - x0, lw); }
  else { const r = o.r ?? 5; let j = 0; for (let y = y0 + oy; y < y1; y += st, j++) for (let x = x0 + ox + (j % 2 ? st / 2 : 0); x < x1; x += st) { if (kind === 'plus') { ctx.fillRect(x - r * 2, y - r / 2, r * 4, r); ctx.fillRect(x - r / 2, y - r * 2, r, r * 4); } else ctx.fillRect(x - r, y - r, r * 2, r * 2); } }
  ctx.restore();
}
function nbGround(c, o = {}) { ctx.save(); ctx.fillStyle = c; ctx.fillRect(-W * 2, -H * 2, W * 5, H * 5); ctx.restore(); nbPattern(o.pattern ?? 'dots', o); }

// ---- the hero: a hot orange smiley block with border and hard shadow. x, y = centre, r = half its side.
// o: mood ('happy' | 'wow' | 'wink'), look (-1..1), rot, bob (0 = hold still: do that before a bridge), press, s, at (slapped on), blink, c
const nbHeroPts = (x, y, r) => rrectPts(x - r, y - r, 2 * r, 2 * r, r * 0.2, 8);
function nbHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', bob = o.bob ?? 1, sl = o.at != null ? nbSlap(o.at) : { s: 1, rot: 0 }; if (sl.s <= 0 || r <= 0) return;
  const yy = y + Math.sin(TT * TAU + key.length) * r * 0.035 * bob, rot = (o.rot ?? 0) + sl.rot + Math.sin(TT * TAU * 0.5 + key.length) * 0.035 * bob;
  SPARK_AT = toScreen(x, yy);
  const blink = o.blink ?? ((F + hash('nbh', key) % 47) % 47 < 3), mood = o.mood ?? 'happy', look = (o.look ?? 0) * 0.05;
  nbBox(x - r, yy - r, 2 * r, 2 * r, o.c ?? NB.hero, { r: r * 0.2, rot, s: (o.s ?? 1) * sl.s, press: o.press, sh: o.sh ?? Math.max(NB.sh, Math.min(r * 0.11, 22)), draw: (w, h) => {
    ctx.fillStyle = ctx.strokeStyle = NB.ink;
    const ew = w * 0.115, eh = mood === 'wow' ? h * 0.24 : h * 0.2, ey = h * 0.4;
    [0.31, 0.69].forEach((u, i) => { const shut = blink || (mood === 'wink' && i === 1); ctx.beginPath(); ctx.roundRect(w * (u + look) - ew / 2, shut ? ey - h * 0.02 : ey - eh / 2, ew, shut ? h * 0.04 : eh, shut ? 0 : ew * 0.3); ctx.fill(); if (!shut) { ctx.fillStyle = NB.white; ctx.fillRect(w * (u + look) - ew * 0.22, ey - eh * 0.36, ew * 0.4, ew * 0.4); ctx.fillStyle = NB.ink; } });
    if (mood === 'wow') { ctx.beginPath(); ctx.roundRect(w * (0.4 + look), h * 0.59, w * 0.2, h * 0.21, w * 0.05); ctx.fill(); ctx.fillStyle = NB.pink; ctx.fillRect(w * (0.44 + look), h * 0.72, w * 0.12, h * 0.05); }
    else { ctx.lineWidth = w * 0.062; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(w * (0.5 + look), h * 0.5, w * 0.24, 0.17 * Math.PI, 0.83 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = NB.pink; for (const u of [0.13, 0.77]) { ctx.fillRect(w * u, h * 0.57, w * 0.1, h * 0.06); }
  } });
}

// ---- captions and the top tag: screen-size, after the camera (DEFER). They slam in, and hide inside a morph bridge.
// nbCaption('Say hi to *the new thing*'): a white slab at the bottom of the safe area; the part between * * sits on a
// highlighter block. o: at (seconds after the era starts; default 0.5), y, size, hl, c, rot, from
function nbCaptionNow(str, o = {}) {
  if (nbInBridge()) return;
  const t = E0 + (o.at ?? 0.5); if (TT < t - 0.2) return;
  const size = o.size ?? 56, parts = str.split('*').map((s, i) => ({ s, hi: i % 2 === 1 })).filter((p) => p.s);
  const ws = parts.map((p) => nbTextW(p.s, size)), tw = ws.reduce((a, b) => a + b, 0), px = size * 0.6, w = tw + 2 * px, h = size * 1.86;
  const [dx, dy] = nbSlam(t, o.from ?? 'b', { dist: 700 }), x = (typeof CX !== 'undefined' ? CX : W / 2) - w / 2 + dx, y = (o.y ?? 1410) - h / 2 + dy;
  nbBox(x, y, w, h, o.c ?? NB.white, { rot: o.rot ?? -0.022, draw: (bw, bh) => {
    let cx = px; const base = bh / 2 + size * NB_CAP / 2;
    parts.forEach((p, i) => {
      const lead = p.s.length - p.s.trimStart().length, trail = p.s.length - p.s.trimEnd().length, sp = nbTextW(' ', size), core = p.s.trim(), cw = ws[i] - (lead + trail) * sp;
      if (p.hi) { ctx.fillStyle = o.hl ?? NB.yellow; ctx.fillRect(cx + lead * sp - size * 0.14, base - size * (NB_CAP + 0.16), cw + size * 0.28, size * (NB_CAP + 0.32)); }
      nbText(core, cx + lead * sp, base, size, NB.ink); cx += ws[i];
    });
  } });
}
const nbCaption = (str, o) => { const f = () => nbCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
// the top tag: a black slab with light type at the top-left of the safe area (the kicker: 'LAUNCH DAY', 'FEATURE 01')
function nbKickerNow(str, o = {}) {
  if (nbInBridge()) return;
  const t = E0 + (o.at ?? 0.25), size = o.size ?? 44, w = nbTextW(str, size) + size * 1.3 + (o.dot ? size * 0.9 : 0), h = size * 1.7, [dx, dy] = nbSlam(t, o.from ?? 'l', { dist: 900 });
  nbBox((o.x ?? 60) + dx, (o.y ?? 268) + dy, w, h, o.c ?? NB.ink, { sh: 0, rot: o.rot ?? 0, draw: (bw, bh) => {
    let x = size * 0.65;
    if (o.dot) { if (mod(TT, 0.5) < 0.25) { ctx.fillStyle = o.dot; ctx.fillRect(x, bh / 2 - size * 0.28, size * 0.56, size * 0.56); } x += size * 0.9; }
    nbText(str, x, bh / 2 + size * NB_CAP / 2, size, o.tc ?? NB.cream);
  } });
}
const nbKicker = (str, o) => { const f = () => nbKickerNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract), each in the medium: the morph's blank sheet is
//  cream with the dot pattern, the window is a bordered block with a hard shadow, the morphing shape is a block.
// =====================================================================
const STYLE = {
  name: 'neo-brutal',
  paper: NB.cream,
  backdrop(c) { ctx.save(); screen(); nbGround(c, { pattern: 'dots' }); ctx.restore(); },
  window(P, key, src) {                                                  // the era seen through a bordered block; its hard shadow falls on the sheet
    const bb = bbox(P), big = bb.x0 < -NB.sh && bb.y0 < -NB.sh && bb.x1 > W + NB.sh && bb.y1 > H + NB.sh;
    if (!big) { ctx.save(); ctx.translate(NB.sh * 1.4, NB.sh * 1.4); nbPath(P); ctx.fillStyle = NB.ink; ctx.fill(); ctx.restore(); }
    ctx.save(); nbPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); nbPath(P); ctx.lineJoin = 'miter'; ctx.miterLimit = 3; ctx.lineWidth = NB.bw * 1.4; ctx.strokeStyle = NB.ink; ctx.stroke(); ctx.restore();
  },
  blob(P, c, key, u = 0) {                                               // a block changing shape: it tips a few degrees and its shadow deepens mid-way
    const k = Math.sin(Math.PI * clamp(u)), cen = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    const rot = -0.07 * k, cs = Math.cos(rot), sn = Math.sin(rot), s = 1 + 0.05 * k;
    nbShape(P.map(([x, y]) => [cen[0] + ((x - cen[0]) * cs - (y - cen[1]) * sn) * s, cen[1] + ((x - cen[0]) * sn + (y - cen[1]) * cs) * s]), c, { sh: NB.sh * (1.4 + 0.8 * k), lw: NB.bw * 1.4, join: 'round' });
  },
  hero(x, y, r, o = {}) { nbHero(x, y, r, { key: o.key, mood: o.mood, bob: 0 }); },   // r = half the hero's size
  heroColor: NB.hero,
  heroPts(x, y, r) { return nbHeroPts(x, y, r); },
  post() {},                                                             // nothing: flat colour stays flat (no grain, no vignette)
  ones: true,                                                            // snappy and physical: on 1s
};
