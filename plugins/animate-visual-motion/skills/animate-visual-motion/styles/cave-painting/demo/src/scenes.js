// =====================================================================
//  SCENES — cave-painting demo. World coordinates 1080x1920; time TT on 2s. Everything is drawn inside cavePaint:
//  `ctx` is the pigment layer and every mark is a daub, a rub or blown pigment. Content inside x 60-940, y 250-1300
//  (the caption owns y 1330-1460).
// =====================================================================
const cu = TIMELINE.cues;
// the wall: one stretch of limestone for both eras, with two swellings the big animals are hung on
caveDefWall('wall', { bulges: [[470, 700, 250, 150, 0.5], [340, 1080, 260, 130, 0.42]] });
// the bridge objects: nothing else may come within ~80px of them at the bridge, or it shows in the pool of light
const DISC = { x: 745, y: 400, r: 104 };
const HAND0 = { x: 700, y: 470, s: 96 };
const HALO = { x: HAND0.x, y: HAND0.y - HAND0.s * 0.22, r: HAND0.s * 1.5, spray: { x: HAND0.x, y: HAND0.y - HAND0.s * 0.22, r: HAND0.s * 2.15, key: 'hand0', cut: (g) => caveHandPath(g, HAND0.x, HAND0.y, HAND0.s, 0, false) } };
const DOTS1 = [[790, 660], [834, 648], [878, 652], [920, 668], [806, 716], [850, 706], [894, 714]].map(([x, y], i) => [x, y, 13 - (i % 3)]);
const DOTS2 = [[250, 1050], [306, 1030], [364, 1040], [300, 1104], [360, 1112], [424, 1090], [470, 1040]].map(([x, y], i) => [x - 54, y, 13 - (i % 2) * 2]);   // white clay dots on the babirusa's flank
// the torch: a slow path through a few stations (eased), so different parts of the wall light up
const torch = (keys) => { let i = 0; while (i < keys.length - 2 && TT >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1], u = EZ.io(seg(TT, a[0], b[0])); caveAim(lerp(a[1], b[1], u) + 22 * Math.sin(TT * 2.3), lerp(a[2], b[2], u) + 18 * Math.sin(TT * 1.7 + 1)); };

// ---- era 1: the hunt
function sceneHunt() {
  torch([[0, 640, 640], [0.9, 470, 860], [1.8, 560, 1010], [2.4, 620, 900], [3, 700, 620]]);
  const step = TT >= cu.spear ? caveStep(0.25) : 0;                                      // once the spear flies, the legs change on every eighth
  cavePaint(() => {
    caveDisc(DISC.x, DISC.y, DISC.r, { frac: caveIn(cu.disc, 0.5) });                    // a rubbed red disc, ringed with one stroke of the finger
    caveAnimal('bison', 400, 800, 205, { c: CAVE.yellow, frac: caveIn(cu.bison, 1.1), step, key: 'bison' });
    caveAnimal('horse', 235, 452, 92, { c: CAVE.umber, d: 0.42, frac: caveIn(cu.horse, 0.7), step: step + 1, key: 'horse' });
    caveDots(DOTS1, { c: CAVE.red, frac: caveIn(cu.dots, 0.45), key: 'd1' });            // finger dots, one per sixteenth
    [0, 1].forEach((i) => caveHunter(165 + i * 150, 1160 + i * 36, 176 - i * 14, { frac: caveIn(cu.hunters + i * 0.15, 0.45), step: step + i, spear: i === 0 || TT < cu.spear, throw: i === 0 ? 0 : 0, key: 'hun' + i }));
    if (TT >= cu.spear) { const u = caveIn(cu.spear, 0.5), x = lerp(400, 600, EZ.o2(u)), y = 1128 - 34 * Math.sin(u * Math.PI) + 30 * u; caveDaub([[x - 70, y + 10 - 20 * u], [x + 70, y - 10 + 20 * u]], { c: CAVE.black, w: 7.5, wob: 0, dry: 0.3, key: 'spear' }); }   // the thrown spear
    caveHero(790, 1070, 142, { frac: caveIn(cu.stag, 0.8), step });                      // Rusa, the red stag
  });
  caveCaption('We *hunted*', { at: 0.6 });
}

// ---- era 2: the hands
function sceneHands() {
  torch([[3, 700, 560], [3.7, 600, 720], [4.6, 500, 980], [5.4, 560, 860], [6, 600, 760]]);
  const step = caveStep(0.5);
  cavePaint(() => {
    caveHand(HAND0.x, HAND0.y, HAND0.s, { key: 'hand0', lift: caveIn(cu.lift, 0.33) });                               // the bridge left it: the hand is lifted
    [[330, 470, 90, -0.28, false, cu.hand1], [885, 735, 72, 0.3, true, cu.hand2], [470, 760, 84, 0.12, true, cu.hand3]].forEach(([x, y, s, rot, flip, t], i) =>
      caveHand(x, y, s, { rot, flip, frac: caveIn(t, 0.45), lift: caveIn(t + 0.45, 0.3), key: 'hand' + (i + 1) }));   // blown breath by breath round a hand
    caveAnimal('babirusa', 318, 1092, 176, { c: CAVE.umber, line: CAVE.black, d: 0.5, frac: caveIn(cu.pig, 1.0), step, key: 'pig' });
    caveAnimal('anoa', 190, 800, 78, { c: CAVE.yellow, d: 0.45, frac: caveIn(cu.anoa, 0.6), step: step + 1, key: 'anoa' });
    caveDots(DOTS2, { c: CAVE.white, frac: caveIn(cu.dots2, 0.45), key: 'd2' });
    caveHero(790, 1070, 142, { step });                                                                               // the stag is still on the wall; in the flicker it walks
  });
  caveCaption('We were *here*', { at: 0.9 });
}
