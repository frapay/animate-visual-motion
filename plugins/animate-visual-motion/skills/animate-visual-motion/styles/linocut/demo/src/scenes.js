// =====================================================================
//  SCENES — linocut demo. World coordinates 1080x1920; time TT on 2s. Everything is drawn inside linBlock: `ctx`
//  is the black block and every mark is a cut. Content inside x 60-940, y 250-1300 (the caption owns y 1330-1460).
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const MOON = { x: 690, y: 520, r: 150 }, SUN = { x: 640, y: 560, r: 150 };
const BOX = [LIN_B.x0, LIN_B.y0, LIN_B.x1, LIN_B.y1];
// a hill: its ridge line, closed far outside the frame so that every row inside the block follows the ridge
const ridgePoly = (fn) => { const P = []; for (let x = -900; x <= 1980; x += 40) P.push([x, fn(x)]); P.push([1980, 3300], [-900, 3300]); return P; };
const RIDGE1 = (x) => 1100 + 26 * Math.sin(x / 260 + 0.6) + 12 * Math.sin(x / 97);
const HILL_FAR = (x) => 1010 + 34 * Math.sin(x / 300 + 2.0) + 10 * Math.sin(x / 110);
const HILL_MID = (x) => 1150 + 46 * Math.sin(x / 340 + 4.2) + 10 * Math.sin(x / 120 + 1);
const HILL_NEAR = (x) => 1300 + 34 * Math.sin(x / 280 + 1.0) + 8 * Math.sin(x / 90);
const P_RIDGE1 = ridgePoly(RIDGE1), P_FAR = ridgePoly(HILL_FAR), P_MID = ridgePoly(HILL_MID), P_NEAR = ridgePoly(HILL_NEAR);
const P_SKY = [[60, 60], [1020, 60], ...ridgePoly(HILL_FAR).slice(0, -2).filter(([x]) => x >= 60 && x <= 1020).reverse().map(([x, y]) => [x, y - 6])];   // an uncut border stays round it
const STARS = (() => { const R = RNG('demo-stars'), out = []; while (out.length < 15) { const x = R.r(80, 990), y = R.r(110, 930), s = R.r(9, 17); if (Math.hypot(x - MOON.x, y - MOON.y) < 270 || (x < 520 && y > 720) || (x < 300 && y < 360) || out.some((p) => Math.hypot(p[0] - x, p[1] - y) < 90)) continue; out.push([x, y, s]); } return out; })();
const HARE1 = { x: 320, r: 165 }, HARE2 = { x: 270, r: 150 };

// ---- era 1: carved out of the night
function sceneNight() {
  linBlock(() => {
    // the moon: two rows round the rim, then the middle cleared; a carved glow in two broken rings
    linDisc(MOON.x, MOON.y, MOON.r, { frac: linIn(cu.moon, 0.5) });
    linArcRow(MOON.x, MOON.y, MOON.r + 38, { n: 18, w: 9, frac: linIn(cu.moon + 0.4, 0.4), rot: linStep(0.5) % 2 * 0.09 });   // the glow turns a notch on the beat
    linArcRow(MOON.x, MOON.y, MOON.r + 70, { n: 14, w: 6, len: 0.45, frac: linIn(cu.moon + 0.6, 0.4), rot: 0.2 - linStep(0.5) % 2 * 0.09 });
    // stars are nicked one per sixteenth; three or four at a time are re-cut smaller (they twinkle on the beat)
    STARS.forEach(([x, y, s], i) => linStar(x, y, s, { frac: TT >= cu.stars + i * 0.0625 ? 1 : 0, alt: (linStep(0.5) + i) % 4 === 0 && TT > 1.3, key: 'st' + i }));
    // a drift of mist: long gouges that move one notch a beat
    linCloud(110 - linStep(0.5) * 12, 400, 420, { n: 4, frac: linIn(0.6, 0.5), key: 'mist' });
    // the ridge: three rows that follow its top edge, then tufts of grass in rows (they lean the other way on the beat)
    linCarve(P_RIDGE1, { key: 'ridge1', gap: 20, rows: 3, box: BOX, frac: linIn(cu.ridge, 0.6) });
    const sway = linStep(0.5) % 2 ? 7 : -7;
    linGrass(50, 1030, 1262, { n: 40, h: [56, 104], sway, frac: linIn(cu.grass, 0.5), key: 'g1' });
    linGrass(50, 1030, 1600, { n: 34, h: [70, 130], w: 11, sway: -sway, frac: linIn(cu.grass + 0.2, 0.5), key: 'g2' });
    linGrass(50, 1030, 1740, { n: 30, h: [80, 140], w: 12, sway, frac: linIn(cu.grass + 0.35, 0.5), key: 'g3' });
    linGrass(50, 1030, 1880, { n: 28, h: [80, 150], w: 13, sway: -sway, frac: linIn(cu.grass + 0.5, 0.5), key: 'g4' });
    // poppies: cut before the press, printed red by it
    [[520, 1262, 27, -10], [628, 1280, 23, 8], [738, 1258, 30, 5], [842, 1284, 24, -8], [930, 1262, 26, 9]].forEach(([x, y, s, lean], i) => linPoppy(x, y, s, { lean, frac: linIn(cu.poppy + i * 0.0625, 0.2), in: linDrop(cu.press + 1 / 12), key: 'p' + i }));
    // two moths: little V cuts that hop a step every eighth
    [0, 1].forEach((i) => { const st = linStep(0.25, i * 0.5), R = RNG('moth', i, st); if (TT > 1.0) linBird(470 + i * 90 + R.n(26), 800 + i * 70 + R.n(22), 13, { flap: st % 2 }); });
    // the hare is carved row by row; after the press its back ear flicks twice
    const ear = (TT >= cu.twitch && TT < cu.twitch + 0.17) || (TT >= cu.twitch + 0.33 && TT < cu.twitch + 0.5);
    linHare(HARE1.x, RIDGE1(HARE1.x) - HARE1.r * 0.93, HARE1.r, { frac: linIn(cu.hare, 0.75), ear });
  }, { press: cu.press });
  linTag('night');
  linCaption('Carve the *night*');
}

// ---- era 2: printed in daylight
function sceneDay() {
  linBlock(() => {
    // the sun: the same carved disc, printed in the second colour (the bridge pressed it)
    linColor(linDiscPts(SUN.x, SUN.y, SUN.r), { grow: -4 });
    // the sky is cleared away with long wide cuts, top to bottom, round a patch of block left for the sun
    linClear(P_SKY, { key: 'sky', gap: 40, w: 0.86, hole: linDiscPts(SUN.x, SUN.y, SUN.r + 104, 48), frac: linIn(cu.sky, 0.85) });
    linDisc(SUN.x, SUN.y, SUN.r);
    linRays(SUN.x, SUN.y, SUN.r + 20, SUN.r + 90, { n: 20, w: 17, frac: linIn(cu.rays, 0.5), rot: linStep(0.5) % 2 * TAU / 40 });   // the rays move half a step on the beat
    // uncut streaks of cloud and three birds left standing in the cleared sky
    if (TT >= 3.9) { linCloud(700 - linStep(0.5) * 10, 180, 300, { n: 3, w: 9, gap: 24, ink: true, key: 'c1' }); linCloud(90 + linStep(0.5) * 10, 660, 260, { n: 3, w: 8, gap: 22, ink: true, key: 'c2' }); }
    if (TT >= 3.75) [0, 1, 2].forEach((i) => linBird(330 - linStep(0.25) * 9 + i * 74, 470 - i * 44 + (linStep(0.25, i * 0.5) % 2) * 8, 24 - i * 3, { flap: linStep(0.25, i * 0.5) % 2, ink: true }));
    // three hills, each carved in rows that follow its own ridge; two trees on the far one
    linCarve(P_FAR, { key: 'far', gap: 18, rows: 4, box: BOX, frac: linIn(cu.hills, 0.5) });
    linTree(600, HILL_FAR(600) + 4, 150, { frac: linIn(cu.hills + 0.3, 0.35), key: 't1' });
    linTree(860, HILL_FAR(860) + 4, 120, { frac: linIn(cu.hills + 0.45, 0.35), key: 't2' });
    linCarve(P_MID, { key: 'mid', gap: 21, rows: 5, ink: 0, hold: true, box: BOX, frac: linIn(cu.hills + 0.25, 0.5), shade: (x) => 0.7 + 0.4 * clamp(x / W) });
    linCarve(P_NEAR, { key: 'near', gap: 25, rows: 30, w: 0.6, ink: 0, hold: true, box: BOX, frac: linIn(cu.hills + 0.5, 0.6) });
    [[500, 1300, 26, 8], [600, 1286, 30, -6], [704, 1306, 23, 5], [800, 1290, 28, -9], [900, 1310, 24, 6]].forEach(([x, y, s, lean], i) => linPoppy(x, y, s, { lean, frac: linIn(cu.poppy2 + i * 0.0625, 0.2), in: linDrop(cu.press2 + 1 / 12), key: 'q' + i }));
    // the hare: carved on the middle hill, then it hops on the last two beats
    const hop = Math.max(Math.sin(Math.PI * linIn(cu.hop1, 0.33)), Math.sin(Math.PI * linIn(cu.hop2, 0.33)));
    if (TT >= cu.hare2) linHare(HARE2.x, HILL_MID(HARE2.x) - HARE2.r * 0.9 - 74 * hop, HARE2.r, { frac: linIn(cu.hare2, 0.6), ink: 15, ear: TT >= cu.hop1 - 0.17 && TT < cu.hop1 });
  }, { press: cu.press2 });
  linTag('day');
  linCaption('Print the *day*', { at: 0.75 });
}
