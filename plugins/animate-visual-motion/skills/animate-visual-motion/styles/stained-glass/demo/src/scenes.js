// =====================================================================
//  SCENES — stained glass demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1500.
//  One pointed window in a stone wall, glazed twice: MALAM (night) and PAGI (morning). The glass never moves;
//  every change is a pane going from dark to lit. The dove is its own small glazing, so it can move in steps.
// =====================================================================
const cu = TIMELINE.cues;
const WIN = { cx: 500, top: 320, w: 800, h: 810, rise: 540, bw: 44 };
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const MOON = { x: 500, y: 610, r: 150 }, SUN = { x: 500, y: 590, r: 150 };
const FLOOR = 1196, DOVE_R = 92, DOVE_HOME = [700, 962];
const DEMO = {};
const demoFrame = () => (DEMO.fr = DEMO.fr || sglFrame(WIN.cx, WIN.top, WIN.w, WIN.h, { kind: 'pointed', rise: WIN.rise, border: WIN.bw }));
// two rolling hills across the foot of the window (the same land at night and in the morning)
function demoHills() {
  const inn = demoFrame().inner, back = [[100, 1100]], front = [[100, 1100]];
  for (let x = 100; x <= 900; x += 20) { back.push([x, 985 - 32 * Math.sin((x - 140) / 720 * Math.PI)]); front.push([x, 1034 + 16 * Math.sin(x * 0.012)]); }
  back.push([900, 1100]); front.push([900, 1100]);
  return { back: sglClipConvex(back, inn), front: sglClipConvex(front, inn) };
}
function demoRoom(key, G, k, warm) {
  const fr = demoFrame();
  sglWall('room', { open: [fr.out], sill: [58, 942, 1146], floor: FLOOR });
  sglAmbient(WIN.cx, 720, 640, warm, k);
}
function demoFloor(G, k, lamp) {
  sglSpill(G, k, { y: FLOOR + 4, h: 112, w: 860, x: 500 });
  sglMotes(120, 1200, 880, 1300, 16, 'floor', k);
  sglLantern(140, 1298, 0.72, { lit: lamp });
}

// ---- era 1: MALAM. Cobalt and violet; the moon lights the window
const STARS = [[500, 408, 46, 's1'], [285, 640, 56, 's2'], [715, 655, 52, 's3'], [560, 862, 44, 's4']];
function buildMalam() {
  const fr = demoFrame(), inn = fr.inner, R = RNG('malam'), hl = demoHills(), P = [];
  P.push(...sglPanes(fr.border, [SGL.violet, SGL.cobalt, SGL.turquoise, SGL.cobalt], 'border'));
  P.push(...sglOrder(sglPanes(sglQuarries(inn, 132, { x: MOON.x, y: MOON.y }), () => R.pick([SGL.night, SGL.night, SGL.cobalt, SGL.indigo, SGL.violet]), 'sky'), [MOON.x, MOON.y]));
  P.push(...sglPanes(sglCut(hl.back, { n: 4, key: 'hb', slant: 0.4 }), '#3c2f92', 'hill'));
  P.push(...sglMosque(272, 1004, { c: '#5a44b4', dome: SGL.turquoise, door: SGL.amber }));
  P.push(...sglPanes(sglCut(hl.front, { n: 5, key: 'hf', slant: 0.4 }), '#17694c', 'hill'));
  P.push(...sglRosette(MOON.x, MOON.y, MOON.r, { n: 8, rings: [0.66, 1], c: [SGL.night, [SGL.cobalt, '#3d6fe0']], id: 'moon' }));
  P.push(...sglCrescent(MOON.x - 10, MOON.y, 82, { n: 4, rot: -0.45, c: SGL.straw }));
  STARS.forEach(([x, y, r, id]) => P.push(...sglStar(x, y, r, { inner: 0.52, c: SGL.straw, id })));
  [[400, 846, 32], [786, 800, 30], [300, 520, 28]].forEach(([x, y, r]) => P.push(...sglStar(x, y, r, { n: 4, inner: 0.5, c: SGL.sky, id: 'tiny' })));
  const comet = []; for (let i = 0; i < 5; i++) { const x = 598 + i * 35, y = 452 + i * 24, s = 23 - i * 1.5; comet.push([[x, y - s], [x + s, y], [x, y + s], [x - s, y]]); }
  P.push(...sglPanes(comet, [SGL.straw, SGL.sky], 'comet'));
  return P;
}
function litMalam(p) {
  switch (p.id) {
    case 'border': return sglSeq(p, 0.08, 0.026, 0.2);                                                // round the arch, along the lead
    case 'crescent': return sglSeq(p, cu.moon, 0.09, 0.2);
    case 'moon': return sglSeq(p, cu.moon + 0.3, 0.035, 0.25);
    case 'sky': return 0.78 * sglSeq(p, cu.sky, 0.017, 0.3);                                          // outward from the moon
    case 'hill': return 0.55 * sglSeq(p, cu.s2, 0.07, 0.3);
    case 'mosque': return p.c === SGL.amber ? ev(cu.s3, 0.2) * sglTwinkle(p, 0.3, 9) : 0.7 * sglSeq(p, cu.s2, 0.05, 0.3);   // a lamp in the door
    case 'comet': return sglChase(p, cu.s3, 12, 9, 3);
    case 'tiny': return ev(cu.s4 + p.ph * 0.05, 0.2) * sglTwinkle(p, 0.6, 7);
  }
  const k = STARS.findIndex((s) => s[3] === p.id);
  return k < 0 ? 1 : ev([cu.s1, cu.s2, cu.s3, cu.s4][k], 0.15) * sglTwinkle(p, 0.3, 6);
}
function sceneMalam() {
  const G = sglGlaze('malam', buildMalam), sw = TT >= cu.sweep ? seg(TT, cu.sweep, cu.sweep + 0.6) : null, k0 = clamp(TT / 2.2);
  demoRoom('malam', G, k0 * 0.8, SGL.cobalt);
  const k = sglDraw(G, litMalam, { sweep: sw });
  // the dove sleeps on the hill as dark glass; the band of light wakes it and it lifts its wing
  const awake = ev(cu.wake, 0.25);
  sglHero(DOVE_HOME[0], DOVE_HOME[1], DOVE_R, { flip: true, lit: lerp(0.2, 1, awake), wing: TT >= cu.wake && TT < cu.wake + 0.25 ? 0 : 1, mood: awake >= 1 && TT < cu.wake + 0.5 ? 'wow' : 'smile' });
  demoFloor(G, k * 1.5, 1);
  sglTag('Malam', { c: SGL.sky });
  sglCaption('Malam, bulan *menyala*');
}

// ---- era 2: PAGI. Amber and ruby; the sun fills the window and the dove flies
const TULIPS = [[402, 1080, 0.82, SGL.ruby], [488, 1084, 0.98, SGL.rose], [570, 1080, 0.8, SGL.ruby]];
const DOVE_PATH = [DOVE_HOME, [742, 892], [704, 834], [736, 786]];
function buildPagi() {
  const fr = demoFrame(), inn = fr.inner, hl = demoHills(), P = [];
  P.push(...sglPanes(fr.border, [SGL.amber, SGL.ruby, SGL.amber, SGL.emerald], 'border'));
  P.push(...sglPanes(sglFan(inn, SUN.x, SUN.y, 20, { a0: -Math.PI / 2 - Math.PI / 20 }), [SGL.sky, SGL.straw], 'ray'));
  P.push(...sglPanes(sglFan(sglClipConvex(sglCirclePts(SUN.x, SUN.y, 318, 60), inn), SUN.x, SUN.y, 20, { a0: -Math.PI / 2 }), ['#f8d98a', '#aad6f4'], 'ray2'));
  P.push(...sglCloud(262, 742, 164, { n: 2, key: 'awan' }));
  P.push(...sglPanes(sglCut(hl.back, { n: 4, key: 'hb', slant: 0.4 }), SGL.emerald, 'hill'));
  P.push(...sglMosque(272, 1004, { c: '#f3dcae', dome: SGL.turquoise, door: SGL.ruby }));
  P.push(...sglPanes(sglCut(hl.front, { n: 5, key: 'hf', slant: 0.4 }), SGL.lime, 'hill'));
  TULIPS.forEach(([x, y, s, c], i) => P.push(...sglFlower(x, y, { s, c, id: 'f' + (i + 1) })));
  P.push(...sglFlames(SUN.x, SUN.y, SUN.r + 4, SUN.r + 48, 12, { c: [SGL.amber, SGL.ruby] }));
  P.push(...sglRosette(SUN.x, SUN.y, SUN.r, { n: 8, rings: [0.36, 0.7, 1], c: ['#ffc23a', [SGL.ruby, SGL.amber], [SGL.amber, '#ffc94a']], id: 'sun' }));
  return P;
}
function litPagi(p) {
  const beat = 0.5 + 0.5 * Math.cos((TT - cu.pulse) * TAU / BEAT);                                    // the sun breathes on the beat
  switch (p.id) {
    case 'sun': return 1 - 0.22 * (p.ring === 1 ? beat : p.ring === 2 ? 1 - beat : 0);
    case 'flame': return sglSeq(p, 3.25, 0.03, 0.15) * (0.75 + 0.25 * ((p.i + Math.floor(TT * 4)) % 2));
    case 'ray2': return sglSeq(p, 3.3, 0.025, 0.2);                                                   // round the sun like a clock
    case 'ray': return sglSeq(p, cu.rays, 0.03, 0.25);
    case 'border': return sglSeq(p, 3.4, 0.02, 0.2);
    case 'hill': return sglSeq(p, cu.hills, 0.05, 0.25);
    case 'mosque': return sglSeq(p, cu.hills + 0.2, 0.035, 0.2);
    case 'cloud': return sglSeq(p, cu.b1, 0.1, 0.25) * sglTwinkle(p, 0.08, 3);
    case 'f1': case 'f2': case 'f3': { const t0 = cu[p.id]; return p.bloom ? ev(t0 + 0.12 + (p.i - 3) * 0.05, 0.14) : 0.25 + 0.75 * sglSeq(p, t0 - 0.12, 0.05, 0.12); }   // stem and leaves, then the petals
  }
  return 1;
}
function scenePagi() {
  const G = sglGlaze('pagi', buildPagi), sw = TT >= cu.sweep2 ? seg(TT, cu.sweep2, cu.sweep2 + 0.6) : null, k0 = clamp((TT - 3.1) / 1.2);
  demoRoom('pagi', G, 0.4 + 0.6 * k0, SGL.amber);
  const k = sglDraw(G, litPagi, { sweep: sw });
  // the dove flies up toward the sun in three steps, its wing going up and down; then it glows and keeps flapping on the beat
  const step = [cu.b1, cu.b2, cu.b3].filter((t) => TT >= t).length, [dx, dy] = DOVE_PATH[step], done = TT >= cu.b3 + 0.25;
  const wing = step === 0 ? 1 : done ? (Math.floor((TT - cu.b3) / E8) % 2 ? 1 : 0) : (step + (TT >= [0, cu.b1, cu.b2, cu.b3][step] + 0.125 ? 1 : 0)) % 2;
  sglHero(dx, dy, DOVE_R, { flip: true, wing, mood: TT >= cu.sweep2 + 0.2 && TT < cu.sweep2 + 0.9 ? 'wow' : 'smile' });
  demoFloor(G, k, 0.08);
  sglTag('Pagi', { c: SGL.amber });
  sglCaption('Pagi pun *bersinar*!', { hi: SGL.amber });
}
