// =====================================================================
//  SCENES — sand demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1500.
//  Every era is: sndGlow(tint) -> pour and wipe -> sndDone(). The caption band (y 1330-1455) lies on the front dune,
//  well below the ridge the camel walks on.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const SUN = { x: 360, y: 565, r: 122 };
const MOON = { x: 575, y: 490, r: 118 };
const UNTA = 1.5;                                                                  // the camel's scale
const G_BACK = { key: 'g-back', amp: 46, len: 760 }, G_FRONT = { key: 'g-front', amp: 30, len: 980 };
const M_BACK = { key: 'm-back', amp: 34, len: 900 }, M_FRONT = { key: 'm-front', amp: 26, len: 1100 };

// ---- era 1: a long walk in the desert
function sceneGurun() {
  const t = TT;
  sndGlow(SND.amber, { x: SUN.x + 60, y: SUN.y + 110 });
  // what the last picture left on the table: a film of sand with three wavy finger lines. One sweep clears it.
  sndLayer({ d: 0.5, key: 'old', streaks: 10 });
  for (let k = 0; k < 3; k++) { const P = []; for (let x = 80; x <= 1000; x += 40) P.push([x, 620 + k * 190 + 34 * Math.sin(x * 0.014 + k * 2)]); sndWipe(P, 26, 1, { ridge: 0.6 }); }
  sndSweep(EZ.io(seg(t, cu.sweep, cu.sweep + 0.62)), 1, { leave: 0.24, key: 'sapu' });
  // sand pours from the top and piles into the near dune (cue pour1), then the far one (cue pour2)
  const p2 = seg(t, cu.pour1 + 0.1, cu.pour1 + 0.75), p1 = seg(t, cu.pour2 + 0.1, cu.pour2 + 0.7);
  const back = sndDunePts(1000, G_BACK), front = sndDunePts(1160, G_FRONT);
  sndPour(770, -40, Math.max(sndDuneY(770, 1000, G_BACK), sndPileTop(back, p1, { from: 770, slope: 0.5 })), seg(t, cu.pour2, cu.pour2 + 0.78), { key: 'tuang1' });
  sndPour(330, -40, Math.max(sndDuneY(330, 1160, G_FRONT), sndPileTop(front, p2, { from: 330, slope: 0.5 })), seg(t, cu.pour1, cu.pour1 + 0.82), { key: 'tuang2' });
  sndDune(1000, { ...G_BACK, d: 0.6, p: p1, from: 770, ripples: 2, ripple: ev(1.3, 0.5), rdepth: 0.5 });
  sndDune(1160, { ...G_FRONT, p: p2, from: 330, ripples: 3, ripple: ev(1.5, 0.6) });
  // a palm is dribbled on; its fronds sway (background life)
  sndPalm(850, sndDuneY(850, 1160, G_FRONT) + 6, 1, { p: seg(t, cu.palm, cu.palm + 0.75), key: 'palem', lean: -0.17 });
  // the sun: a round patch rubbed clean in the haze with a circling finger
  sndDisc(SUN.x, SUN.y, SUN.r, { p: EZ.io(seg(t, cu.sun, cu.sun + 0.6)) });
  // two birds cross the top right (background life)
  [[0, 0], [0.3, 1]].forEach(([dl, i]) => { const k = t - cu.bird - dl; if (k > 0) sndBird(1060 - 300 * k + i * 30, 455 + i * 64 - 20 * k + 8 * Math.sin(k * 5 + i), 0.95 - i * 0.15, Math.sin(k * 15 + i * 2), { face: -1 }); });
  // Unta walks the near ridge toward the sun, leaving footprints, then stops and looks up at it
  const wk = EZ.o2(seg(t, 0.95, cu.look)), ux = lerp(-150, 450, wk), walking = t > 0.95 && t < cu.look, look = EZ.io(ev(cu.look, 0.3));
  for (let x = -20; x < ux - 70; x += 54) sndPoke(x, sndDuneY(x, 1160, G_FRONT) + 20 + (Math.round(x / 54) % 2) * 9, 5, { depth: 0.55, ridge: 0.3 });
  if (t > 0.9) sndCamel(ux, sndDuneY(ux, 1160, G_FRONT) + 7, UNTA, { key: 'unta', step: walking ? ux * 0.085 : undefined, look: look * 0.9 });
  // grains trickle down the far dune and drift across the light (background life)
  if (p1 >= 1) sndGrains({ path: [[905, sndDuneY(905, 1000, G_BACK) + 4], [960, 1040], [1010, 1085]], n: 16, key: 'gulir' });
  sndGrains({ box: [60, 380, 900, 900], n: 26, key: 'melayang', al: 0.5 });
  sndDone();
  sndTag('Gurun');
  sndCaption('Unta berjalan *jauh*', { at: 1.0 });
}

// ---- era 2: rest under the stars
const STARS = [[770, 330, 9], [330, 440, 12], [905, 420, 8], [760, 640, 8], [880, 700, 11], [130, 520, 9], [520, 750, 7], [935, 560, 7], [640, 830, 8], [400, 300, 7]];
const STARS_T = STARS.map((_, i) => cu.star + i * 0.25 - (i > 6 ? 1.625 : 0));   // on the 8ths, then three more on the 16ths between
function sceneMalam() {
  const t = TT;
  sndGlow(SND.moon, { x: MOON.x - 40, y: MOON.y + 130 });
  // the night sky: a thicker veil of sand, heavier at the top
  sndLayer({ d: 0.6, d1: 0.42, key: 'malam', streaks: 14, y1: 1010 });
  sndDisc(MOON.x, MOON.y, MOON.r);
  // stars are poked out one by one on the 8ths, then twinkle; one shooting star is flicked across
  sndStars(STARS.map(([x, y, r], i) => [x, y, r, STARS_T[i]]));
  sndWipe([[940, 760], [880, 800], [800, 870]], 9, seg(t, cu.shoot, cu.shoot + 0.2), { ridge: 0.4, depth: 0.9 * (1 - seg(t, cu.shoot + 0.3, cu.shoot + 0.5)) });
  // the far dune with a mosque on it: its door and windows are rubbed clean one by one
  sndDune(930, { ...M_BACK, d: 0.44, ripples: 2, rdepth: 0.6 });
  sndMosque(215, sndDuneY(215, 930, M_BACK) + 4, 0.92, { d: 0.62, lit: (t - cu.win) / 0.25, key: 'masjid' });
  sndCrescent(215, sndDuneY(215, 930, M_BACK) - 232, 17, { p: ev(cu.win - 0.25, 0.25), turn: -0.6, veil: 0.6 });
  // the near dune and the tent; its door is rubbed open and the lamp inside shows
  sndDune(1160, { ...M_FRONT, ripples: 3 });
  sndTent(775, sndDuneY(775, 1160, M_FRONT) + 6, 1, { lit: ev(cu.lamp, 0.3), key: 'tenda' });
  // Unta arrives, folds its legs, and falls asleep (it breathes)
  const wk = EZ.o2(seg(t, 3.0, 4.3)), ux = lerp(150, 440, wk), walking = t < 4.3, sit = EZ.io(seg(t, cu.sit, cu.sit + 0.35)), sleep = EZ.io(seg(t, cu.sleep, cu.sleep + 0.4));
  sndCamel(ux, sndDuneY(ux, 1160, M_FRONT) + 7, UNTA, { key: 'unta', step: walking ? ux * 0.085 : undefined, sit, sleep, look: 0.5 * (1 - sit), breath: sleep * 1.6 * Math.sin(t * 4) });
  sndGrains({ path: [[640, sndDuneY(640, 930, M_BACK) + 4], [700, 985], [760, 1030]], n: 12, key: 'gulir2', speed: 0.8 });
  sndGrains({ box: [60, 700, 900, 1100], n: 22, key: 'melayang2', al: 0.5, vx: -12 });
  sndDone();
  sndTag('Malam');
  sndCaption('lalu *istirahat* di tenda', { at: 0.75 });
}
