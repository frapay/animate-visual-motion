// =====================================================================
//  SCENES — neon demo. World units = px at zoom 1; time TT on 1s.
//  Content kept inside x 60-940, y 250-1500. Horizon at HY; Volt stands on the wet floor at FLOOR.
// =====================================================================
const cu = TIMELINE.cues;
const HY = 1080, FLOOR = 1275;   // Volt's feet stay above the caption band (which starts near y 1270)
const HEART = { x: 500, y: 500, r: 104 };
const REC = { x: 500, y: 640, r: 230 };
const BOARD = { x: 150, y: 350, w: 700, h: 480 };

function volt(t0, o = {}) {
  const on = neoPower(t0, 'volt', 0.4), r = 90, x = 250;
  const hopU = o.hop != null ? seg(TT, o.hop, o.hop + 0.42) : 0, hop = Math.sin(hopU * Math.PI) * 120;
  const land = o.hop != null ? Math.exp(-Math.max(0, TT - o.hop - 0.42) * 14) * (TT > o.hop + 0.42 ? 1 : 0) : 0;
  const beat = o.beat != null ? Math.abs(Math.sin((TT - o.beat) * Math.PI / BEAT)) : 0;
  const y = FLOOR - r * 0.86 - hop - beat * 26;
  const draw = () => neoHero(x, y, r, { key: 'volt', on: Math.max(on, 0.15), look: o.look ?? 0.4, mood: o.mood, squash: -0.18 * land + (o.beat != null ? 0.06 * (1 - beat) : 0), bob: o.beat != null ? 0 : undefined });
  // a light pool on the floor under him, his reflection in the wet floor, then Volt
  ctx.save(); ctx.translate(x, FLOOR); ctx.scale(1, 0.18); neoGlow(0, 0, 170, NEO.cyan, 0.4 * on * (1 - hop / 200)); ctx.restore();
  neoReflect(FLOOR, draw, 0.42 * (on > 0.2 ? 1 : 0.3), { len: 260, stretch: 0.9, ripple: 5 });
  draw();
}

// ---- era 1: the street sign powers on
function sceneStreet() {
  neoGround({ hy: HY, sun: { x: 500, r: 300, on: 1 }, speed: 0.9, key: 'sky1' });   // the sun sits centred behind the sign
  neoSkyline(HY, 'street', { min: 50, tall: 170, fill: 0.9 });
  neoDust('d1', 22);
  // the hung sign
  const bOn = neoPower(0.05, 'board', 0.3);
  const sign = (word = true) => {
    neoSignBoard(BOARD.x, BOARD.y, BOARD.w, BOARD.h, NEO.violet, Math.max(0.15, bOn));
    const hOn = Math.max(0.1, neoPower(cu.heart, 'heart', 0.5));
    neoFill(neoHeartPts(HEART.x, HEART.y, HEART.r), NEO.mag, 0.12 * hOn);
    neoTube(neoHeartPts(HEART.x, HEART.y, HEART.r), NEO.mag, { closed: true, w: 10, on: hOn });
    if (hOn > 0.2) neoGlow(HEART.x, HEART.y, 300, NEO.mag, 0.22 * hOn);
    if (word) {   // lettering: single-stroke tube capitals; "24 JAM" flanks the heart, "BUKA" lights letter by letter
      const lOn = neoPower(cu.label, 'label', 0.35);
      neoText('24', 278, HEART.y + 38, 106, NEO.amber, { tube: true, align: 'center', on: Math.max(0.15, lOn), w: 8 });
      neoText('JAM', 714, HEART.y + 38, 106, NEO.amber, { tube: true, align: 'center', on: Math.max(0.15, lOn), w: 8 });
      neoSignWord('BUKA', CX, 778, 216, NEO.cyan, cu.word, { key: 'buka', w: 9, stagger: E16 });
      const wOn = neoPower(cu.word + 3 * E16, 'buka3', 0.4);
      if (wOn > 0.2) neoGlow(CX, 705, 380, NEO.cyan, 0.13 * wOn);
    }
  };
  neoReflect(HY, () => sign(false), 0.5, { stretch: 0.55, len: 420 });   // shapes only: no mirrored letters
  sign();
  volt(cu.hero, { hop: cu.hop, look: 0.6, mood: TT > cu.hop && TT < cu.hop + 0.9 ? 'wow' : 'smile' });
  neoTag('01', 'KOTA');
  neoCaption('Malam ini\nkota *menyala*');
}

// ---- era 2: the music
function record() {
  const { x, y, r } = REC, rot = (TT - 3) * 3.2;
  ctx.save(); neoPath(neoCirclePts(x, y, r, 96), true); ctx.fillStyle = '#0a0820'; ctx.fill(); ctx.restore();
  neoGlow(x, y, r * 1.8, NEO.violet, 0.22);
  for (let k = 0; k < 6; k++) neoTube(neoCirclePts(x, y, r * (0.48 + k * 0.085), 72), NEO.violetD, { closed: true, w: 2, on: 0.6, core: false });
  for (const a of [0, Math.PI]) {   // the light catching the grooves, turning with the record
    neoTube(neoCirclePts(x, y, r * 0.86, 24, rot + a, rot + a + 0.7), NEO.cyan, { w: 4, on: 0.8 });
    neoTube(neoCirclePts(x, y, r * 0.66, 24, rot + a + 0.3, rot + a + 0.9), NEO.mag, { w: 4, on: 0.7 });
  }
  neoTube(neoCirclePts(x, y, r, 96), NEO.violet, { closed: true, w: 10 });
  const lOn = neoPower(cu.rec, 'lab', 0.3);
  neoFill(neoCirclePts(x, y, r * 0.3, 40), NEO.amber, 0.25 * lOn);
  neoTube(neoCirclePts(x, y, r * 0.3, 40), NEO.amber, { closed: true, w: 6, on: lOn });
  neoTube(neoCirclePts(x, y, r * 0.2, 16, rot, rot + 1.6), NEO.amber, { w: 5, on: lOn });
  neoTube(neoCirclePts(x, y, 8, 12), NEO.white, { closed: true, w: 4, on: lOn });
  // the tonearm swings in
  const arm = springMove(cu.rec, -0.5, 0, SPRING.smooth), px = x + r * 1.02, py = y - r * 0.98;
  const ax = px + Math.cos(Math.PI * 0.62 + arm) * r * 0.95, ay = py + Math.sin(Math.PI * 0.62 + arm) * r * 0.95;
  neoTube([[px, py], [ax, ay], [ax - 34, ay + 22]], NEO.cyan, { w: 7 });
  neoTube(neoCirclePts(px, py, 22, 20), NEO.cyan, { closed: true, w: 6 });
}
const NOTES = [[150, 0.0, NEO.cyan, 70], [860, 0.25, NEO.mag, 60], [120, 0.75, NEO.amber, 52], [890, 1.25, NEO.cyan, 66], [180, 1.5, NEO.mag, 48]];   // [x, delay after cu.notes (on the 8th grid), colour, size]
function sceneMusic() {
  neoGround({ hy: HY, speed: 2.0, gridC: NEO.cyan, key: 'sky2' });
  neoDust('d2', 30);
  NOTES.forEach(([x, d, c, s], i) => {
    const t = TT - cu.notes - d; if (t < 0) return;
    const u = mod(t, 2.2) / 2.2, y = 1000 - u * 640, on = neoPower(cu.notes + d, 'note' + i, 0.25) * (1 - EZ.i2(seg(u, 0.75, 1)));
    neoNote(x + Math.sin(t * 2.5 + i) * 26, y, s, c, on);
  });
  const draw = () => { neoEQ(370, 900, HY - 6, 10, 170, cu.eq, { every: BEAT }); record(); };
  neoReflect(HY, draw, 0.5, { stretch: 0.55, len: 420 });
  draw();
  volt(cu.hero2 - 0.6, { beat: 3.0, look: 0.3 });
  neoTag('02', 'MUSIK', { c: NEO.mag });
  neoCaption('dan musiknya\n*tak berhenti*', { hi: NEO.mag });
}
