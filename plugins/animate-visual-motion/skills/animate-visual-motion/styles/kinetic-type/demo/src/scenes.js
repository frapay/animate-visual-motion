// =====================================================================
//  SCENES — kinetic-type demo. World units = px at zoom 1; time TT on 1s. Content inside x 80-940, y 260-1500.
//  Era 1 on paper (ink type, one accent), era 2 inverted on ink.
// =====================================================================
const cu = TIMELINE.cues;
// maxW leaves room for the dot after the widest word: 80 + 780 + gap 14 + dot 60 = 934 (the safe edge is 940)
const WORDS = { x: 80, y: 660, size: 190, lh: 186, maxW: 780 };
const DOT_R = 30;
const DOT_BIG = { x: 500, y: 830, r: 170 };
const RING = { x: 500, y: 740, r: 220, w: 52 };
const TILE = { x: RING.x, y: RING.y, s: 600 };   // the square the morph ends on; era 2 keeps its corners as crop marks

// ---- era 1: the hook
function hookLines() {
  return ktWords([
    { s: 'BELAJAR', t0: cu.w1 },
    { s: 'LEBIH', t0: cu.w2, outline: 7 },
    { s: 'CEPAT', t0: cu.w3, hi: KT.accent },
  ], WORDS.x, WORDS.y, { size: WORDS.size, lh: WORDS.lh, maxW: WORDS.maxW, d: 0.38, out: cu.out, stagger: 0.12, punch: [cu.w2, cu.w3, cu.stop] });
}
function sceneHook() {
  ktGround(KT.paper);
  ktGrid(KT.ink);
  asterisk(900, 420, 0, 34, 6, TT * 1.4, KT.ink, 9);   // background life: a turning asterisk (ink: the accent is spent on CEPAT)
  ktRule(80, 1120, 940, -1, KT.ink, { w: 3 });
  ktTicker(1176, 84, 'BELAJAR LEBIH CEPAT', { t0: cu.ticker, speed: 150 });
  const bx = hookLines();
  // the hero: drops onto the end of each word as it lands, sits as the full stop, then grows to centre
  const end = (b) => [b.right + 14 + DOT_R, b.y - DOT_R];
  const P = [end(bx[0]), end(bx[1]), end(bx[2])];
  if (TT < cu.grow) {
    const h = ktHops(P, [0, cu.w2 + 0.25, cu.stop], 170, 0.3);
    ktDot(h.x, h.y, DOT_R, { key: 'hero', squash: h.squash, look: 0.4 });
  } else {
    const s = springEase(TT - cu.grow, 240, 26);
    const p0 = P[2];
    ktDot(lerp(p0[0], DOT_BIG.x, s), lerp(p0[1], DOT_BIG.y, s), lerp(DOT_R, DOT_BIG.r, s), { key: 'hero', mood: TT > cu.grow + 0.3 ? 'wow' : 'dot', look: lerp(0.4, 0, s) });
  }
  ktTag('01', 'PROMO', { right: '2026', at: -1 });
  // one accent per frame: the caption's bar is ink (paper type on it), CEPAT keeps the accent
  ktCaption('Kursus kilat 15 menit,\n*hasil nyata*', { y: 1452, size: 66, at: 0.5, hi: KT.ink, hiT: KT.paper });
}

// ---- era 2: the proof
function sceneStat() {
  ktGround(KT.ink);
  ktGrid(KT.paper, { al: 0.06 });
  // background life: tick marks turning slowly around the ring
  ctx.save(); ctx.fillStyle = KT.paper; ctx.globalAlpha = 0.28 * ktIn(3.1, 0.5);
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU + (TT - 3) * 0.25; ctx.save(); ctx.translate(RING.x + Math.cos(a) * 274, RING.y + Math.sin(a) * 274); ctx.rotate(a); ctx.fillRect(-(i % 3 ? 8 : 18), -2, i % 3 ? 16 : 36, 4); ctx.restore(); }
  ctx.restore();
  // the stat tile: the corners of the square the morph ended on stay as crop marks around the ring
  ctx.save(); ctx.fillStyle = KT.paper; ctx.globalAlpha = 0.6;
  { const h = TILE.s / 2, L = 44 * ktIn(3.2, 0.5), w = 4;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = TILE.x + sx * h, y = TILE.y + sy * h; ctx.fillRect(Math.min(x, x - sx * L), y - w / 2, L, w); ctx.fillRect(x - w / 2, Math.min(y, y - sy * L), w, L); } }
  ctx.restore();
  const f = TT < cu.ring ? 0 : EZ.io(clamp((TT - cu.ring) / 1.0));
  const pr = ktPunch([cu.full], 0.06);
  ctx.save(); ctx.translate(RING.x, RING.y); ctx.scale(pr, pr); ctx.translate(-RING.x, -RING.y);
  const head = ktRing(RING.x, RING.y, RING.r, RING.w, f, KT.paper, { track: KT.inkL });
  // the counter: 1x -> 3x in step with the ring (all paper: the accent is kept for our bar and the hero)
  const n = Math.min(3, Math.floor(lerp(1, 3.999, f))), num = String(n), size = 250, xs = size * 0.62;
  const nw = ktTextW(num, size), xw = ktTextW('x', xs), x0 = RING.x - (nw + xw + 8) / 2, by = RING.y + size * 0.36;
  ktText(num, x0, by, size, KT.paper, { al: clamp((TT - 3.1) * 4) });
  ktText('x', x0 + nw + 8, by, xs, KT.paper, { al: clamp((TT - 3.1) * 4) });
  ctx.restore();
  // the hero rides the ring's head, then hops down to be the full stop after "3x"
  if (TT >= cu.ring - 0.05) {
    const a = [head[0], head[1]], stop = [x0 + nw + 8 + xw + 34 + 8, by - 34];
    const h = TT < cu.hop ? { x: a[0], y: a[1], squash: 0 } : ktHop([RING.x, RING.y - RING.r], stop, cu.hop, 0.34, 140);
    const r = 34 * springEase(TT - (cu.ring - 0.05), SPRING.playful.k, SPRING.playful.d);
    ktDot(h.x, h.y, r, { key: 'hero2', squash: h.squash, mood: TT > cu.full && TT < cu.full + 0.8 ? 'wow' : 'dot', look: -0.3 });
  }
  // the bars: 60 minutes the old way, 20 with us
  const row = (y, label, val, frac, c, t0, vc) => {
    if (TT < t0 - 0.1) return;
    ctx.save(); ctx.beginPath(); ctx.rect(70, y - 40, 900, 50); ctx.clip();
    const dy = (1 - ktIn(t0 - 0.1, 0.35)) * 50;
    ktText(label, 80, y + dy, 32, KT.paper, { mono: true, weight: 700, al: 0.75 });
    ktText(val, 940, y + dy, 32, vc, { mono: true, weight: 700, align: 'right' });
    ctx.restore();
    ktBar(80, y + 20, 860, 44, frac, c, { t0 });
  };
  row(1090, 'CARA LAMA', '60 MENIT', 1, KT.inkM, cu.bar1, KT.paper);
  row(1210, 'DENGAN KAMI', '20 MENIT', 1 / 3, KT.accent, cu.bar2, KT.paper);
  ktTag('02', 'HASIL', { dark: true, right: '00:0' + Math.floor(TT) });
  ktCaption('lebih *hemat waktu*', { dark: true, y: 1452, size: 84, at: 1.5, hi: KT.paper, hiT: KT.ink });
}
