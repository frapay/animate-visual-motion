// =====================================================================
//  SCENES — low-poly demo. World units = px at zoom 1; time TT on 1s. One world, drawn twice: at dawn and at night.
//  Depth layers (lpPar): sky 0 (pinned), sun / moon 0.12, far ridge 0.3, mid ridge 0.5, the peak 0.75, lake 0.9,
//  foreground 1. Content kept inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
const D_SKY = 0.12, D_FAR = 0.3, D_MID = 0.5, D_PEAK = 0.75, D_LAKE = 0.9;
const SUN = { x: 770, y: 560, r: 105, spike: 0.14 };
const MOON = { x: 270, y: 505, r: 100 };
const PEAK = { x: 455, y: 600, w: 800, h: 570 };
const FOX = { x: 770, y: 1236, s: 230 };
const FORE = [[-260, 1274], [60, 1220], [270, 1240], [480, 1268], [690, 1238], [900, 1222], [1340, 1260], [1340, 2300], [-260, 2300]];
const TREES = [[132, 1230, 250], [232, 1238, 185], [962, 1228, 225]];

// the land both eras share. o: { pal, peakT0 (assemble the peak), treeT0, glint }
function world(o) {
  const pal = o.pal;
  lpPar(D_FAR, () => lpRidge('far', 950, 100, lpHaze(pal.ridge, 0.85), { bot: 1260, shim: 0.12, k: 0.6 }));
  if (o.between) o.between();
  lpPar(D_MID, () => lpRidge('mid', 1030, 130, lpHaze(pal.ridge, 0.45), { bot: 1280, n: 5, shim: 0.2, k: 0.8 }));
  lpPar(D_PEAK, () => lpPeak('main', PEAK.x, PEAK.y, PEAK.w, PEAK.h, pal.peak, { t0: o.peakT0, dur: 1.25, capT0: o.capT0, shim: 0.45 }));
  lpPar(D_LAKE, () => lpWater('lake', -200, 1150, W + 400, 170, pal.water, { glint: o.glint }));
  lpPoly('fore', FORE, pal.ground, { cell: 190, z: (x, y, R) => -y * 0.2 + R.n(20), shim: 0.15, k: 0.8 });
  lpRock('a', 590, 1264, 44); lpRock('b', 318, 1256, 26);
  TREES.forEach(([x, y, h], i) => lpTree(x, y, h, { t0: o.treeT0 != null ? o.treeT0 + i * E8 : null }));
}

// ---- era 1: dawn
function sceneDawn() {
  const pal = lpUse('dawn');
  lpSky(pal);
  // the sun climbs out from behind the ridges on a heavy spring
  const sy = SUN.y + (1 - springEase(TT - cu.sun, SPRING.heavy.k, SPRING.heavy.d)) * 560;
  lpPar(D_SKY, () => lpGem(SUN.x, sy, SUN.r, LP.sun, { spike: SUN.spike, pal: LP.sunPal }));
  world({ pal, peakT0: cu.peak - 0.35, capT0: cu.cap, treeT0: cu.tree, glint: { x: SUN.x, w: 190, c: LP.sun },
    between: () => lpPar(0.4, () => {
      lpCloud('a', 80, 800, 230, null, { drift: 16 }); lpCloud('b', 640, 880, 170, null, { drift: 10 });
      for (let i = 0; i < 3; i++) {   // three birds cross the sky
        const u = TT - cu.birds - i * 0.22; if (u < 0) continue;
        lpBird(-60 + u * 210 - i * 14, 470 + i * 46 - u * 16 + Math.sin(u * 3 + i) * 10, 46 - i * 6, pal.ink, { ph: i * 1.7 });
      }
    }) });
  lpFox(FOX.x, FOX.y, FOX.s, { key: 'hero', flip: true, tilt: 0.04 });
  lpTag('01', 'PAGI');
  lpCaption('Pagi merekah\ndi *gunung*', { at: 0.75 });
}

// ---- era 2: night
function sceneNight() {
  const pal = lpUse('night');
  lpSky(pal);
  const peak = lpPeakPts(PEAK.x, PEAK.y, PEAK.w, PEAK.h).P;
  lpStars('sky', 24, [40, 250, 1000, 790], { t0: cu.stars, avoid: (x, y) => Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 50 || (x < 420 && y < 360) || lpInside(peak, x, y + 40) });
  lpPar(D_SKY, () => lpGem(MOON.x, MOON.y, MOON.r, LP.moon, { pal: LP.moonPal }));
  world({ pal, glint: { x: MOON.x, w: 170, c: LP.moon },
    between: () => lpPar(0.4, () => { lpCloud('n1', 600, 760, 250, null, { drift: 14 }); lpCloud('n2', 60, 900, 180, null, { drift: 9 }); }) });
  // crystals shoot up out of the ground, one per 16th
  [[440, 1270, 150, -0.1], [494, 1274, 96, 0.22], [392, 1266, 84, -0.32]].forEach(([x, y, h, lean], i) => lpCrystal(x, y, h, pal.crystal, { t0: cu.crystal + i * E16, lean }));
  lpMotes('fly', 9, [120, 1000, 900, 1210], pal.hi, { t0: cu.stars });
  const up = springEase(TT - cu.look, SPRING.playful.k, SPRING.playful.d);   // the fox lifts its head toward the moon
  lpFox(FOX.x, FOX.y, FOX.s, { key: 'hero', flip: true, tilt: 0.04 - 0.2 * up, twitch: [cu.look, cu.twitch] });
  lpTag('02', 'MALAM');
  lpCaption('malam turun,\n*rubah* berjaga', { at: 0.75 });
}
