// =====================================================================
//  SCENES — mosaic demo. World coordinates 1080x1920; TT on 1s (the laying), moving groups on 2s (mosT2()).
//  Content inside x 60-940, y 250-1500. Both eras are pictures inside the same meander frame on a marble floor.
//  Era 1: a teal sea in the fan pattern. Era 2: a sand sky in straight rows over an olive garden.
// =====================================================================
const cu = TIMELINE.cues;
const FR = { x: 36, y: 170, w: 1008, h: 1438 };                       // the frame band's outer edge
const IN = { x: 114, y: 248, w: 852, h: 1282 };                       // the picture inside it
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const PEARL = { x: 540, y0: 1168, y1: 760, r: 86 };
const SUN = { x: 540, y: 640, r: 186 };
const SHELL = { x: 540, y: 1300, r: 236 };
const HERO_R = 120;
const inPicture = (fn) => { ctx.save(); ctx.beginPath(); ctx.rect(IN.x, IN.y, IN.w, IN.h); ctx.clip(); fn(); ctx.restore(); };

// ---- era 1: a pearl in the sea
const pearlY = () => Math.round(lerp(PEARL.y0, PEARL.y1, EZ.o3(seg(mosT2(), cu.nudge + 1 / 12, cu.nudge + 0.4))));
const pearlPts = () => mosDiscPts(PEARL.x, pearlY(), PEARL.r);
const pearlLay = (o) => mosMedallion(PEARL.x, PEARL.y0, PEARL.r, MOS.marble, { key: 'pearl', gold: 0.07, ...o });
function sceneLaut() {
  mosFloor();
  mosBed(IN.x, IN.y, IN.w, IN.h);
  // the sinopia: what is about to be laid, sketched on the mortar
  mosSketch(mosShellPts(SHELL.x, SHELL.y, SHELL.r)); mosSketch(mosDiscPts(PEARL.x, PEARL.y0, PEARL.r));
  mosSketch(mosWavePts(150, 930, 430), { closed: false }); mosSketch(mosWavePts(150, 930, 610), { closed: false });
  // the sea: fans of teal tiles, laid fan by fan from the top
  mosField(IN.x, IN.y, IN.w, IN.h, MOS.teal, { pattern: 'fan', key: 'sea', c2: MOS.turq, c3: MOS.tealD, gold: 0.012, at: cu.sea - 0.1, rate: 8400 });
  mosBorder(FR.x, FR.y, FR.w, FR.h, { key: 'frame', c: MOS.lapis });
  // waves that slide, seaweed that leans, a starfish, bubbles (background life)
  mosWave(150, 930, 430, { key: 'w1', at: cu.waves, rate: 420 });
  mosWave(150, 930, 610, { key: 'w2', c: mosTone(MOS.turq, 0.5), dir: -1, at: cu.waves + 0.125, rate: 420 });
  mosSeaweed(196, 1322, 250, { key: 'wd1', at: 0.9, rate: 300 });
  mosSeaweed(872, 1322, 190, { key: 'wd2', n: 2, at: 1.05, rate: 300 });
  mosStar(852, 1010, 54, { key: 'bintang', at: 1.2, rate: 300, halo: MOS.tealD });
  // the scallop shell, then the pearl in it
  mosShell(SHELL.x, SHELL.y, SHELL.r, { at: cu.shell, rate: 1100, halo: MOS.tealD });
  if (TT < cu.nudge + 1 / 12) pearlLay({ at: cu.pearl, rate: 330 });
  inPicture(() => {
    mosBubbles(200, 1050, { key: 'b1', from: 1.2, rise: 330 }); mosBubbles(872, 1110, { key: 'b2', n: 3, from: 1.4, rise: 300, speed: 0.36 });
    // a school of pale minnows crossing above (they stay clear of where the pearl ends up)
    const T = mosT2();
    for (let i = 0; i < 3; i++) mosHero(1100 + i * 96 - 230 * (T - 0.9), 520 + [0, -30, 26][i] + 5 * Math.sin(T * 5 + i * 2), 46, { c: i === 1 ? MOS.sand : MOS.marble, flip: -1, eye: false, key: 'mn' + i });
    // Sisik swims in, dips to the shell and nudges the pearl; the pearl rises and Sisik watches it go
    const u = EZ.o2(seg(T, cu.swim, cu.swim + 0.85)), dart = Math.sin(Math.PI * seg(T, cu.nudge - 0.08, cu.nudge + 0.25)), up = T >= cu.nudge + 0.1;
    const hx = lerp(-40, 330, u) + 24 * dart, hy = lerp(900, 1172, EZ.io(u)) + (u < 1 ? 14 * Math.sin(T * 9) : 3 * Math.sin(T * 4));
    if (TT >= cu.nudge + 1 / 12) mosStamp(mosGroup('pearl', 2 * PEARL.r + 70, 2 * PEARL.r + 70, PEARL.x, PEARL.y0, () => pearlLay({})), PEARL.x, pearlY(), { lift: pearlY() > PEARL.y1 ? 10 : 0 });
    mosHero(hx, hy, HERO_R, { key: 'sisik', tilt: up ? -0.5 : 0.32 * (1 - u), mood: up ? 'wow' : 'smile' });
  });
  mosTag('Laut');
  mosCaption('Sebutir *mutiara* di laut', { hi: MOS.turq });
}

// ---- era 2: it shines like the sun
const sunPts = () => mosDiscPts(SUN.x, SUN.y, SUN.r);
const CROWN = { x: 250, y: 962, r: 112 }, POND = { x: 700, y: 1222, rx: 204, ry: 72 };
const FRUIT = [[208, 932], [304, 950], [252, 1014]];
function flower(x, y, at, c) {
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; mosChip(x + Math.cos(a) * 15, y + Math.sin(a) * 15, 14, c, { key: 'fl' + x + i, rot: a, at: at + i / 24 }); }
  mosChip(x, y, 12, MOS.gold, { key: 'flc' + x, at: at + 5 / 24, gold: true });
}
function sceneMatahari() {
  const T = mosT2();
  mosFloor();
  // the ground of the picture: a sand sky in gently waving rows, a plaited band, an olive garden
  mosField(IN.x, IN.y, IN.w, 780, MOS.sand, { key: 'sky', c2: MOS.marble, mix: 0.1, wavy: 4, s: 18, gold: 0.006, vary: 0.07 });
  mosField(IN.x, 1093, IN.w, 437, MOS.olive, { key: 'garden', c2: MOS.oliveD, mix: 0.22, s: 18 });
  mosGuilloche(IN.x, 1028, IN.w, { key: 'plait' });
  mosBorder(FR.x, FR.y, FR.w, FR.h, { key: 'frame', c: MOS.umber });
  // the sun medallion (the bridge object) and its rays, laid one after another
  mosMedallion(SUN.x, SUN.y, SUN.r, MOS.gold, { key: 'sun', gold: 0.3, halo: MOS.sand });
  mosRays(SUN.x, SUN.y, SUN.r, { key: 'ray', at: cu.rays });
  // the tree: three fruit ripen on it, tile by tile
  mosTree(205, 1300, CROWN, { key: 'pohon', halo: MOS.sand });
  FRUIT.forEach(([x, y], i) => mosMedallion(x, y, 25, MOS.ochre, { key: 'buah' + i, s: 12, gold: 0.2, at: [cu.f1, cu.f2, cu.f3][i], rate: 110 }));
  // flowers, a butterfly, the pond with its ripple and a little fountain (background life)
  flower(158, 1196, 3.9, MOS.marble); flower(404, 1178, 4.4, MOS.rose); flower(452, 1296, 5.0, MOS.marble);
  mosPond(POND.x, POND.y, POND.rx, POND.ry, { key: 'kolam', halo: MOS.oliveD, rx0: -30 });
  mosJet(852, 1206, 120, { w: 44 });
  mosFlutter(880 + 26 * Math.sin(T * 2.1), 470 + 58 * Math.sin(T * 1.3 + 1), 27, { key: 'kupu' });
  // Sisik looks up at the sun from the pond, then leaps for joy (twice) with a splash
  const l1 = seg(T, cu.leap, cu.splash), l2 = seg(T, cu.leap2, cu.splash2), air = (l1 > 0 && l1 < 1) || (l2 > 0 && l2 < 1);
  const arc = l1 > 0 && l1 < 1 ? [l1, 205] : l2 > 0 && l2 < 1 ? [l2, 120] : [0, 0], hop = Math.sin(Math.PI * arc[0]);
  mosSplash(650, 1205, T - cu.leap, { key: 'a', n: 5 }); mosSplash(640, 1210, T - cu.splash, { key: 'b' }); mosSplash(640, 1210, T - cu.splash2, { key: 'c', n: 5 });
  mosHero(684 - 44 * EZ.io(seg(T, cu.leap, cu.splash)), 1216 - arc[1] * hop + (air ? 0 : 3 * Math.sin(T * 4)), HERO_R, { key: 'sisik', flip: -1,
    tilt: air ? lerp(-0.95, 0.8, arc[0]) : T < cu.leap ? -0.3 : -0.12, lift: 34 * hop, mood: air || T >= cu.splash ? 'happy' : T >= 3.7 ? 'wow' : 'smile' });
  mosTag('Matahari', { c: MOS.turq });
  mosCaption('bersinar bagai *matahari!*', { hi: MOS.gold });
}
