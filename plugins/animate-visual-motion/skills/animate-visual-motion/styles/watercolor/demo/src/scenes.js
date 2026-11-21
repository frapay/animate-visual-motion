// =====================================================================
//  SCENES — watercolor demo. World coordinates 1080x1920; time TT on 2s. Content inside x 60-940, y 250-1500.
//  Both eras share one landscape (the horizon at y = 880): far hills, near hills, a ground wash that runs out into
//  bare paper above the caption. Era 1 is painted in storm grey, indigo and olive; era 2 in clear blue, sap and lemon.
// =====================================================================
const cu = TIMELINE.cues;
const HORIZON = 880;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const PUD = { x: 600, y: 1128, rx: 236, ry: 66 };
const LAKE = { x: 548, y: 1140, rx: 330, ry: 94 };
const BIRD_R = 62;

// ---- era 1: rain
const pudGrow = () => springTrack([[0, 0.34], [cu.d1, 0.58], [cu.d2, 0.8], [cu.d3, 1]], SPRING.smooth);
const puddlePts = () => { const k = pudGrow(); return wclBlobPts(PUD.x, PUD.y, PUD.rx * k, PUD.ry * (0.35 + 0.65 * k), { key: 'pud', lump: 0.06 }); };
function sceneHujan() {
  wclLayer('hujan', () => {
    wclSky(WCL.storm, HORIZON, { key: 'sky1', al: 0.7, from: 0.35 });
    wclHills(770, 930, WCL.indigo, { key: 'far1', al: 0.42, amp: 46 });
    wclHills(852, 1010, WCL.olive, { key: 'near1', al: 0.6, amp: 26 });
    wclGround(930, 1300, WCL.sap, { key: 'gr1', al: 0.42 });
    wclGround(1010, 1290, WCL.ochre, { key: 'gr1o', al: 0.3 });
    wclTree(880, 905, 150, { key: 'tree1', c: WCL.olive });
    wclSplatter(770, 600, 150, 9, WCL.storm, 'sp1', { al: 0.5 });
  }, { ground: true });
  // rain clouds bloom in one after another and drift (background life)
  const rainK = seg(TT, cu.rain - 0.1, cu.rain + 0.3) * (1 - seg(TT, cu.stop - 0.1, cu.stop + 0.35));
  wclCloud(640 + 9 * TT, 470, 430, WCL.storm, { key: 'c1', bloom: wclBloom(cu.c1 - 0.45, 0.9) });
  wclCloud(292 + 6 * TT, 548, 350, WCL.storm, { key: 'c2', bloom: wclBloom(cu.c2, 0.75), belly: WCL.violet });
  wclCloud(820 + 12 * TT, 640, 290, WCL.storm, { key: 'c3', bloom: wclBloom(cu.c3, 0.75) });
  // the rain: everywhere but under the leaf
  wclRain(340, 600, 1010, 1190, 54, { key: 'r1', al: rainK });
  wclRain(60, 610, 330, 880, 14, { key: 'r2', al: rainK });
  // the puddle: it spreads a little with each of three big drops; rings and a splash where each lands
  wclWash(puddlePts(), WCL.water, { key: 'pud', mask: 0.7, al: 0.8, amt: 2.5, blooms: 1, keep: [[PUD.x - 40, PUD.y - 14, 120, 16, 0.55]] });
  [[cu.d1, -34], [cu.d2, 44], [cu.d3, -6]].forEach(([t, dx], i) => {
    const fall = seg(TT, t - 0.42, t), x = PUD.x + dx;
    if (fall > 0 && fall < 1) { const y = lerp(560, PUD.y - 8, EZ.i2(fall)); wclBrush([[x + 6, y - 50], [x, y]], 13, WCL.water, { key: 'drop' + i, dry: 0, taper: [0.1, 1], al: 0.9 }); wclDab(x, y, 8, 10, WCL.water, { al: 0.9 }); }
    wclRipple(x, PUD.y, PUD.rx * pudGrow() * 0.8, TT - t, { c: WCL.water, dur: 0.9 });
    wclSplash(x, PUD.y - 6, TT - t, WCL.water, { key: 'spl' + i });
  });
  // grass in the rain, a stone, a leaf blown across (background life)
  wclStone(905, 1182, 40, 23, 'st1');
  [[108, 1196, 1], [392, 1040, 0.8], [872, 1060, 0.9], [960, 1214, 1]].forEach(([x, y, s], i) => wclGrass(x, y, s, WCL.olive, 'g1' + i));
  const lf = TT / 3; wclLeaf(960 - 560 * lf, 700 + 300 * lf + 26 * Math.sin(TT * 5), TT * 2.6, 1.25, WCL.ochre);
  // the taro leaf and Pipit under it: hunched and shivering while it rains, a drip off the leaf tip, then a look up
  const drip = mod(TT - 0.9, 0.75);
  wclBigLeaf(92, 1168, 232, 868, 148, { key: 'talas', rot: -0.1 + 0.02 * Math.sin(B * 0.6) + 0.05 * rainK * (B % 2 ? 1 : -1) * 0.3 });
  if (TT > 0.9 && TT < 2.7 && drip < 0.4) wclDab(404, 886 + 620 * drip * drip, 5, 8, WCL.water, { al: 0.85 });
  const up = TT >= cu.peek, hop = Math.sin(Math.PI * ev(cu.peek, 0.34));
  wclBird(244, 1046, BIRD_R, { key: 'pipit', mood: up ? 'wow' : TT >= cu.stop ? 'smile' : 'sad', lift: 26 * hop, rot: up ? -0.16 : rainK > 0.5 ? 0.06 : 0, sx: 1 + (rainK > 0.5 ? 0.03 * (B % 2 ? 1 : -1) : 0), boil: true });
  wclTag('Hujan', { c: WCL.ochre });
  wclCaption('Rintik *hujan* turun', { hi: WCL.water, c: WCL.sky });
}

// ---- era 2: a rainbow over the lake
const lakePts = () => wclBlobPts(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, { key: 'lake', lump: 0.06 });
const BOW = { x: 540, y: 905, r: 400, bw: 22 };
function scenePelangi() {
  const t = TT - 3;
  wclLayer('pelangi', () => {
    wclSky(WCL.ultra, HORIZON, { key: 'sky2', al: 0.62, from: 0.2 });
    wclHills(770, 930, WCL.ultra, { key: 'far1', al: 0.4, amp: 46 });
    wclHills(852, 1010, WCL.sap, { key: 'near1', al: 0.68, amp: 26 });
    wclGround(930, 1300, WCL.sap, { key: 'gr1', al: 0.5 });
    wclGround(1010, 1290, WCL.lemon, { key: 'gr1o', al: 0.45 });
    wclSplatter(330, 560, 130, 8, WCL.sky, 'sp2', { al: 0.5 });
  }, { ground: true });
  // the sun comes out; the rainbow is pulled across, one band after another
  wclSun(806, 418, 58, { key: 'sun', bloom: wclBloom(cu.sun, 0.75) });
  wclRainbow(BOW.x, BOW.y, BOW.r, BOW.bw, { key: 'bow', fadeY: 880, grow: [0, 1, 2, 3, 4, 5].map((i) => ev(cu.bow + i * E16, 0.6)) });
  wclTree(880, 905, 150, { key: 'tree1', mask: 0.92 });   // in front of the bow's foot, on reserved paper (a glaze over it would go grey)
  // the last clouds leave; far birds glide (background life)
  wclCloud(330 + 22 * t, 540, 300, WCL.sky, { key: 'f1', fair: true });
  wclCloud(-60 + 30 * t, 700, 220, WCL.sky, { key: 'f2', fair: true });
  [[1010, 560, 1], [1090, 512, 0.8], [1130, 610, 0.7]].forEach(([x, y, s], i) => wclFarBird(x - 62 * t * (1 + i * 0.1), y + 8 * Math.sin(t * 2 + i), s, Math.sin(B * 1.3 + i * 2), WCL.indigo, 'fb' + i));
  // the lake: slow rings, and the rainbow's colours running into it once the bands are up
  wclWash(lakePts(), WCL.lake, { key: 'lake', mask: 0.8, al: 0.8, amt: 2.5, blooms: 2, keep: [[LAKE.x - 70, LAKE.y - 24, 190, 20, 0.6]] });
  const refl = ev(cu.bow + 0.75, 0.9);
  if (refl > 0) [WCL.rose, WCL.lemon, WCL.violet].forEach((c, i) => wclWash(ellipsePts(LAKE.x - 170 + i * 170, LAKE.y + 26 - (i % 2) * 16, 78, 8, 0, 26), c, { key: 'refl' + i, bloom: refl, soft: 18, mask: 0.45, al: 0.42, rim: 0, blooms: 0, uneven: 0.2, gran: 0.3 }));
  [0.9, 1.9].forEach((t0, i) => wclRipple(LAKE.x + (i ? 130 : -110), LAKE.y + (i ? 20 : -8), 120, mod(t - t0, 2.0), { c: WCL.lake, dur: 1.4 }));
  // reeds, grass, a stone, flowers opening on the beat (background life)
  wclReed(918, 1128, 190, 'rd1'); wclReed(950, 1150, 150, 'rd2', { lean: 0.1 });
  wclStone(172, 1090, 46, 26, 'st2');
  [[86, 1230, 1], [408, 1030, 0.8], [700, 1034, 0.8]].forEach(([x, y, s], i) => wclGrass(x, y, s, WCL.sap, 'g2' + i));
  [[170, 1250, 78, WCL.violet, 4.5], [258, 1272, 64, WCL.rose, 4.75], [880, 1262, 72, WCL.violet, 5.0]].forEach(([x, y, h, c, at], i) => wclFlower(x, y, h, c, 'fl' + i, popS(at)));
  // Pipit: on the stone, then up under the rainbow in a flapping arc, and it sings
  const f = EZ.io(seg(TT, cu.fly, cu.land)), flying = TT >= cu.fly, there = TT >= cu.land;
  const bx = lerp(176, 548, f), by = lerp(1064 - 26 - 1.25 * BIRD_R, 706, f) - 70 * Math.sin(Math.PI * f) + (there ? 9 * Math.sin((TT - cu.land) * 5) : 0);
  const sing = Math.max(Math.sin(Math.PI * ev(cu.sing + 0.08, 0.36)), Math.sin(Math.PI * ev(cu.sing2, 0.36)));
  wclBird(bx, by, BIRD_R, { key: 'pipit', fly: flying, wing: B % 2 ? 0.9 : -0.7, mood: sing > 0.2 ? 'happy' : flying ? 'smile' : 'wow', rot: flying ? lerp(-0.3, -0.06, f) : -0.1, boil: true });
  [cu.sing + 0.08, cu.sing2].forEach((t0, j) => { const a = TT - t0; if (a > 0 && a < 0.5) for (let i = 0; i < 3; i++) wclDab(bx + 106 + i * 32 + 60 * a, by - 52 - i * 24 - 90 * a, 10 - i * 2, 10 - i * 2, [WCL.rose, WCL.ochre, WCL.violet][(i + j) % 3], { al: 0.9 * (1 - a * 2), mask: 0.9 * (1 - a * 2) }); });
  wclTag('Pelangi', { c: WCL.lemon });
  wclCaption('lalu muncul *pelangi*!', { hi: WCL.rose, c: WCL.sky });
}
