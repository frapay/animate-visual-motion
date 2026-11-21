// =====================================================================
//  SCENES — pointillism demo. World coordinates 1080x1920; time TT on 2s. Both eras are the same river, painted
//  inside the same dotted border: noon in blues, yellows and greens, dusk in violets and oranges.
//  Important content inside x 60-940, y 250-1340 (the caption plaque owns y 1363-1480).
// =====================================================================
const cu = TIMELINE.cues;
const FR = { x: 40, y: 170, w: 1000, h: 1440 };                       // the painted border's outer edge
const IN = { x: 84, y: 214, w: 912, h: 1352 };                        // the picture inside it
const HOR = 905;                                                      // the horizon
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const SUN = { x: 690, y: 470, r: 104 }, MOON = { x: 380, y: 480, r: 96 };
const HERO_R = 150, HERO_Y = 1085;
const inPicture = (fn) => { ctx.save(); ctx.beginPath(); ctx.rect(IN.x - 8, IN.y - 8, IN.w + 16, IN.h + 16); ctx.clip(); fn(); ctx.restore(); };
const SKY = ptRectPts(IN.x - 6, IN.y - 6, IN.w + 12, HOR - IN.y + 14), WATER = ptRectPts(IN.x - 6, HOR + 6, IN.w + 12, IN.y + IN.h - HOR);
const FARBANK = (() => { const P = []; for (let i = 0; i <= 36; i++) P.push([IN.x - 6 + (IN.w + 12) * i / 36, HOR - 74 - 26 * Math.sin(i * 0.42) - 14 * Math.sin(i * 1.1 + 1)]); P.push([IN.x + IN.w + 6, HOR + 16], [IN.x - 6, HOR + 16]); return P; })();
const BANK = [[78, 1268], [150, 1252], [240, 1250], [320, 1272], [390, 1320], [440, 1390], [476, 1470], [500, 1574], [78, 1574]];
const TREE = { x: 150, base: 1300, crown: { x: 196, y: 716, r: 172 } };

// ---- the palettes: a few tube colours each, weighted; the eye mixes them
const SKY1 = [[PT.sky, 5], [PT.cobalt, 3], [PT.white, 2.2], [PT.rose, 0.7]], GLOW1 = [[PT.lemon, 4], [PT.yellow, 3], [PT.white, 2], [PT.orange, 1.2]];
const WATER1 = [[PT.cobalt, 4], [PT.sky, 3], [PT.ultra, 2], [PT.white, 1.4], [PT.viridian, 1.2], [PT.orange, 0.5]];
const FAR1 = [[PT.viridian, 3], [PT.cobalt, 3], [PT.emerald, 2], [PT.violet, 2], [PT.rose, 0.6]];
const GRASS = [[PT.yellow, 4], [PT.cobalt, 3], [PT.lemon, 2], [PT.emerald, 2], [PT.orange, 1]], GRASS_SH = [[PT.ultra, 3], [PT.viridian, 3], [PT.violet, 2], [PT.verm, 0.9]];
const CLOUD = [[PT.white, 6], [PT.rose, 1], [PT.sky, 1.5], [PT.lemon, 1]], WARM = [[PT.yellow, 2], [PT.orange, 2.5], [PT.rose, 1.2], [PT.white, 1]];
const SKY2 = [[PT.ultra, 4], [PT.violet, 4], [PT.cobalt, 2], [PT.deep, 2], [PT.rose, 0.6]], GLOW2 = [[PT.orange, 4], [PT.rose, 3], [PT.verm, 2], [PT.yellow, 2], [PT.violet, 1]];
const WATER2 = [[PT.ultra, 4], [PT.violet, 3], [PT.cobalt, 2], [PT.deep, 1.6], [PT.rose, 0.8]], WGLOW2 = [[PT.orange, 3], [PT.rose, 3], [PT.verm, 1.5], [PT.violet, 2]];
const FAR2 = [[PT.ultra, 4], [PT.deep, 3], [PT.violet, 3], [PT.viridian, 2], [PT.verm, 0.7]];
const GRASS2 = [[PT.viridian, 3], [PT.ultra, 3], [PT.violet, 2], [PT.emerald, 1], [PT.orange, 0.8]];
const GLINT = [[PT.white, 3], [PT.lemon, 3], [PT.yellow, 1.4]], LAMPL = [[PT.orange, 3], [PT.yellow, 3], [PT.white, 1]];

// ---- era 1: a riverside afternoon, dabbed in from the sun outward
function sceneNoon() {
  const T = TT, sd = (x, y) => Math.hypot(x - SUN.x, y - SUN.y);
  const bx = Math.round(lerp(345, 600, EZ.io(seg(T, cu.sail, 2.5)))), by = HERO_Y + Math.round(3 * Math.sin(T * 5));
  const pulse = T >= 1.0 ? [{ k: ptPulse(SUN.x, SUN.y, 24, 334, { steps: 6 }), pal: [[PT.white, 2], [PT.lemon, 3]] }] : null;   // the sun's dabs pulse outward, once a beat
  inPicture(() => {
    // the sky works outward from the sun: warm dabs near it, cool beyond, every dab pointing away from it
    ptFill(SKY, SKY1, { key: 'sky1', edge: false, under: false, pal2: GLOW1, mix: (x, y) => clamp((330 - sd(x, y)) / 200), dir: ptRadial(SUN.x, SUN.y), jit: 0.3,
      hole: [ptDiscPts(SUN.x, SUN.y, SUN.r + 4)], sweep: sd, at: cu.sky, dur: 0.75, shimmer: 0.025, lights: pulse });
    ptDisc(SUN.x, SUN.y, SUN.r, { key: 'sun', at: cu.sun, dur: 0.33, lights: pulse });
    // two clouds that drift (background life)
    ptFill(ptBlobPts(400, 372, 124, 40, 'c1', 5, 0.14), CLOUD, { key: 'cloud1', dir: 0, jit: 0.25, at: 0.9, dur: 0.3, dx: Math.round(13 * (T - 0.9)), shimmer: 0.03 });
    ptFill(ptBlobPts(880, 300, 74, 27, 'c2', 5, 0.14), CLOUD, { key: 'cloud2', dir: 0, jit: 0.25, at: 1.0, dur: 0.25, dx: Math.round(9 * (T - 1.0)), shimmer: 0.03 });
    ptFill(FARBANK, FAR1, { key: 'far1', s: 12, dir: 0, jit: 0.3, sweep: 0, at: cu.far, dur: 0.4, shimmer: 0.02 });
    // the water: flat dabs laid left to right; some slip sideways each step, the sun glitters down it, the boat is
    // mirrored in it, and a warm wave of light crosses it by swapping hues (background life)
    const wl = [];
    if (T >= cu.boat + 0.4) wl.push({ k: ptPool(bx + 8, by + HERO_R * 1.2, HERO_R * 0.86, HERO_R * 0.25, 0.62), pal: [[PT.white, 3], [PT.rose, 1.5], [PT.verm, 1.6]] });
    if (T >= cu.wave && T < cu.wave + 1.0) wl.push({ k: ptBand(lerp(IN.x - 90, IN.x + IN.w + 90, seg(T, cu.wave, cu.wave + 1.0)), { w: 62, y0: HOR }), pal: WARM });
    wl.push({ k: ptGlitter(SUN.x, HOR + 10, HOR + 330, { w0: 26, spread: 0.1, k: 0.85 }), pal: GLINT });
    ptFill(WATER, WATER1, { key: 'water1', edge: false, under: false, s: 14, asp: 0.8, dir: 0, jit: 0.12, sweep: 0, at: cu.water, dur: 0.75, shimmer: 0.07, slide: 5, lights: wl });
    // the near bank (yellow and blue dabs make its green; warm dabs along its edge against the cool water) and a tree
    ptFill(BANK, GRASS, { key: 'bank1', pal2: GRASS_SH, mix: (x, y) => clamp(1.15 - Math.hypot((x - 170) / 190, (y - 1300) / 70)), dir: 0.15, halo: [[PT.orange, 2], [PT.rose, 1.2], [PT.yellow, 1]], sweep: 0, at: cu.bank, dur: 0.35, shimmer: 0.03 });
    ptTree(TREE.x, TREE.base, TREE.crown, { key: 'tree1', at: cu.tree, dur: 0.5 });
    // three birds cross under the sun (background life)
    if (T >= cu.birds) for (let i = 0; i < 3; i++) ptBird(1010 - 165 * (T - cu.birds) - i * 78, 662 + i * 30 + (i % 2) * 8, 11, { flap: (Math.floor(B / 2) + i) % 2 });
    // Skiff is dabbed in from the keel up, then sails across as one group of dabs
    ptHero(bx, by, HERO_R, { key: 'skiff', rock: 0.025 * Math.sin(T * 4.2), at: cu.boat, dur: 0.42 });
  });
  ptBorder(FR.x, FR.y, FR.w, FR.h, { key: 'b1', at: 0, dur: 0.6 });
  ptTag('Noon');
  ptCaption('Colour, *dab* by dab', { hi: PT.verm });
}

// ---- era 2: the same river at dusk
const STARS = [[560, 300], [770, 372], [905, 284], [928, 520], [640, 566], [822, 652], [246, 392]];
const LAMPS = [[640, HOR - 8], [782, HOR - 4], [914, HOR - 10]];
function sceneDusk() {
  const T = TT, md = (x, y) => Math.hypot(x - MOON.x, y - MOON.y);
  const bx = Math.round(lerp(700, 585, EZ.o2(seg(T, 3.2, 5.0)))), by = HERO_Y + Math.round(3 * Math.sin(T * 4)), lit = T >= cu.lantern;
  const lamp = LAMPS.map((p, i) => T >= [cu.lamp1, cu.lamp2, cu.lamp3][i]);
  inPicture(() => {
    // the sky: ultramarine and violet above, orange and rose toward the horizon; rings of dabs round the moon,
    // and a slow ring of paler dabs that leaves it
    ptFill(SKY, SKY2, { key: 'sky2', edge: false, under: false, pal2: GLOW2, mix: (x, y) => 0.95 * clamp((y - 560) / 330) ** 1.4, dir: (x, y) => (md(x, y) < 250 ? Math.atan2(y - MOON.y, x - MOON.x) + Math.PI / 2 : 0), jit: 0.25,
      hole: [ptDiscPts(MOON.x, MOON.y, MOON.r + 4)], shimmer: 0.025, lights: [{ k: ptPulse(MOON.x, MOON.y, MOON.r + 22, MOON.r + 160, { steps: 6, every: 2, k: 0.5 }), pal: [[PT.rose, 2], [PT.white, 2], [PT.lemon, 1]] }] });
    ptDisc(MOON.x, MOON.y, MOON.r, { key: 'moon', pal: PT_MOON, halo: [[PT.violet, 2], [PT.rose, 1]], shimmer: 0.05 });
    // stars come out one by one, on the 8ths, and twinkle (background life)
    STARS.forEach(([x, y], i) => { if (T >= cu.star + i * 0.25) ptStar(x, y, i); });
    // a long evening cloud drifting the other way
    ptFill(ptBlobPts(660, 772, 214, 27, 'c3', 6, 0.16), [[PT.rose, 3], [PT.orange, 3], [PT.violet, 2], [PT.yellow, 1]], { key: 'cloud3', dir: 0, jit: 0.15, dx: -Math.round(11 * (T - 3)), shimmer: 0.03 });
    ptFill(FARBANK, FAR2, { key: 'far2', s: 12, dir: 0, jit: 0.3, shimmer: 0.02 });
    // lamps light along the far bank, one per 8th, and stand in the water (background life)
    LAMPS.forEach(([x, y], i) => ptLamp(x, y, 40, lamp[i]));
    const wl = [];
    wl.push({ k: ptPool(bx + 8, by + HERO_R * 1.2, HERO_R * 0.86, HERO_R * 0.25, 0.62), pal: lit ? LAMPL : [[PT.rose, 3], [PT.orange, 1.5], [PT.white, 1]] });
    LAMPS.forEach(([x], i) => { if (lamp[i]) wl.push({ k: ptGlitter(x, HOR + 14, HOR + 170, { w0: 11, spread: 0.035, k: 0.95 }), pal: LAMPL }); });
    wl.push({ k: ptGlitter(MOON.x, HOR + 10, lerp(HOR + 40, HOR + 420, seg(T, cu.glit, cu.glit + 1.0)), { w0: 24, spread: 0.11, k: 0.85 }), pal: [[PT.white, 3], [PT.lemon, 3], [PT.rose, 1]] });   // the moon's road grows down the water
    ptFill(WATER, WATER2, { key: 'water2', edge: false, under: false, s: 14, asp: 0.8, dir: 0, jit: 0.12, pal2: WGLOW2, mix: (x, y) => 0.75 * (1 - clamp((y - HOR - 10) / 170)), shimmer: 0.07, slide: 5, lights: wl });
    ptFill(BANK, GRASS2, { key: 'bank2', dir: 0.15, halo: [[PT.orange, 2], [PT.rose, 1.5]], shimmer: 0.03 });
    ptTree(TREE.x, TREE.base, TREE.crown, { key: 'tree2', sun: [0.55, 0.83], lit: [[PT.emerald, 3], [PT.viridian, 3], [PT.orange, 1.5], [PT.yellow, 1]], shade: [[PT.viridian, 3], [PT.ultra, 3], [PT.deep, 2], [PT.violet, 1.5]],
      halo: [[PT.orange, 2], [PT.yellow, 1.2]], trunk: [[PT.deep, 3], [PT.violet, 2], [PT.verm, 1]] });
    // fireflies by the bank (background life)
    if (T >= cu.fly) for (let i = 0; i < 6; i++) { const R = RNG('fly', i); if ((B + i * 3) % 4 < 2) ptDot(250 + R.r(0, 190) + 7 * Math.sin(T * 3 + i), 1010 + R.r(0, 215) + 6 * Math.cos(T * 2.3 + i * 2), i % 2 ? PT.lemon : PT.yellow, { s: 11, a: i, v: i }); }
    // Skiff drifts in, rocks at anchor and lights its lantern: its sails, and its reflection, turn warm
    ptHero(bx, by, HERO_R, { key: 'skiff', dusk: true, rock: 0.03 * Math.sin(T * 3.6), lantern: lit });
  });
  ptBorder(FR.x, FR.y, FR.w, FR.h, { key: 'b2', pal: [[PT.orange, 4], [PT.verm, 2.5], [PT.yellow, 2], [PT.violet, 1.8], [PT.ultra, 1]] });
  ptTag('Dusk');
  ptCaption('The eye does the *mixing*', { hi: PT.violet, at: 0.6 });
}
