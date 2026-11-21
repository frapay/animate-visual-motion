// =====================================================================
//  SCENES — splash demo. World coordinates 1080x1920; time TT on 1s. One product in the middle of each frame,
//  standing in its crown; fruit, ice and mint thrown out round it; type above, a caption below.
//  Content inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: the can and the bottle (their outlines are the morph's two shapes)
const CAN = { x: 500, y: 945, s: 640, rot: -0.07 }, BOT = { x: 500, y: 955, s: 700, rot: 0.05 };
const F1 = 'citrus', F2 = 'lime';
// things thrown out of the eruption: [what, target x, y, size, start angle, spin (rad/s), tilt, in front of the product?]
const THROWN1 = [
  ['orange', 858, 905, 104, 0.4, 0.22, 0.86, false], ['orange', 150, 760, 76, 1.2, -0.3, 0.62, false], ['ice', 880, 1130, 58, 0.3, 0.16, 1, false],
  ['leaf', 205, 945, 58, -0.6, 0.25, 1, false], ['ice', 118, 1105, 46, -0.4, -0.2, 1, false], ['leaf', 120, 590, 44, 0.9, -0.2, 1, false],
  ['ice', 772, 1272, 66, 0.5, 0.12, 1, true], ['orange', 900, 1610, 96, 0.2, 0.2, 0.7, true], ['leaf', 150, 1590, 60, 0.4, -0.2, 1, true],
];
const THROWN2 = [
  ['lime', 150, 850, 100, 0.2, -0.24, 0.85, false], ['lime', 866, 1040, 82, 1.0, 0.3, 0.6, false], ['ice', 884, 860, 56, -0.3, 0.18, 1, false],
  ['leaf', 208, 1050, 66, 0.5, -0.22, 1, false], ['leaf', 905, 590, 46, 2.3, 0.2, 1, false],
  ['lime', 222, 1232, 104, 0.8, 0.2, 0.93, true], ['ice', 796, 1262, 62, -0.5, -0.12, 1, true], ['leaf', 915, 1235, 52, -0.9, 0.24, 1, true],
  ['lime', 160, 1620, 92, 0.3, -0.2, 0.7, true], ['ice', 900, 1600, 60, 0.2, 0.15, 1, true],
];
function thrown(list, front, t, from, tint) {
  list.forEach(([what, x, y, r, a0, spin, tilt, fr], i) => {
    if (fr !== front) return;
    const [px, py, g] = spFly(t - i * 0.02, from, [x, y], { drift: 0.04 }); if (g <= 0.02) return;
    const rot = a0 + spin * TT + (1 - Math.min(1, g)) * 3, k = Math.min(1, g);          // a fast turn out of the crown, then a slow tumble
    if (what === 'ice') spIce(px, py, r * k, rot, { tint });
    else if (what === 'leaf') spLeaf(px, py, r * k, rot);
    else spSlice(what, px, py, r * k, rot, { tilt: clamp(tilt + 0.1 * Math.sin(TT * 0.8 + i), 0.2, 1) });
  });
}

// ---- era 1: citrus. The crown erupts on the first beat and the can pops up through it.
function sceneCitrus() {
  const t = TT - cu.splash1, base = CAN.y + CAN.s * 0.43, from = [CAN.x, base - 80];
  const p = springEase(TT - cu.pop, 210, 14), canY = CAN.y + (1 - p) * 460;                // the can: up through the splash, a small overshoot
  spGround(F1, { cx: CAN.x, cy: CAN.y - 60 });
  spBubbles('c-back', 30, { x0: 50, x1: 1030, y0: 180, y1: 1740 });
  spSwoosh(CAN.x - 10, base - 120, 360, Math.PI * 1.02, Math.PI * 1.62, 58, F1, { u: spFreeze(t - 0.05, 7), key: 'arc-a', hi: 0.45 });
  thrown(THROWN1, false, t, from, F1);
  spSplash(CAN.x, base, t, F1, { part: 'back', R: 300, h: 430, key: 'c1' });
  if (TT >= cu.pop) spProduct('can', CAN.x, canY, CAN.s, {
    flavor: F1, rot: CAN.rot, scale: 0.6 + 0.4 * p, key: 'can', label: { name: 'SUNZIP', sub: 'SPARKLING ORANGE' },
    glint: seg(TT, cu.glint1, cu.glint1 + 0.7), a: clamp((TT - cu.pop) / 0.06),
  });
  spSplash(CAN.x, base, t, F1, { part: 'front', R: 300, h: 430, key: 'c1' });
  thrown(THROWN1, true, t, from, F1);
  { const [hx, hy, g] = spFly(t - 0.04, from, [212, 1215], { drift: 0.04 }); if (g > 0.02) spHero(hx, hy, 118 * Math.min(1, g), { key: 'hero' }); }   // the hero wheel, lower left
  spBadge('NEW', 800, 692, { flavor: F1, at: cu.badge1, rot: 0.14, size: 50 });
  spBokeh('c-front', 7, F1);
  spTag('01', 'Citrus', { flavor: F1 });
  spHeadline(['PEEL THE', 'FIZZ!'], { flavor: F1, at: cu.head1, y: 415, size: 120 });
  spCaption('Orange that *pops*', { flavor: F1, at: 1.0 });
}

// ---- era 2: lime. The bottle is already there (it is the morph's second shape); the crown erupts round it.
function sceneLime() {
  const t = TT - cu.splash2, base = BOT.y + BOT.s * 0.45, from = [BOT.x, base - 90];
  const hit = t > 0 ? 0.05 * Math.exp(-t * 6) * Math.sin(t * 20) : 0;                        // the bottle takes the hit: a small bump
  spGround(F2, { cx: BOT.x, cy: BOT.y - 60 });
  spBubbles('l-back', 30, { x0: 50, x1: 1030, y0: 180, y1: 1740 });
  spSwoosh(BOT.x + 10, base - 120, 360, Math.PI * 1.98, Math.PI * 1.38, 58, F2, { u: spFreeze(t - 0.05, 7), key: 'arc-bb', hi: 0.45 });
  thrown(THROWN2, false, t, from, F2);
  spSplash(BOT.x, base, t, F2, { part: 'back', R: 290, h: 440, key: 'l2' });
  spProduct('bottle', BOT.x, BOT.y, BOT.s, {
    flavor: F2, rot: BOT.rot, scale: 1 + hit, key: 'bottle', label: { name: 'MINTIKA', sub: 'LIME + MINT SODA' },
    glint: seg(TT, cu.glint2, cu.glint2 + 0.7), run: 6,
  });
  spSplash(BOT.x, base, t, F2, { part: 'front', R: 290, h: 440, key: 'l2' });
  thrown(THROWN2, true, t, from, F2);
  { const [hx, hy, g] = spFly(t - 0.06, from, [138, 632], { drift: 0.04 }); if (g > 0.02) spHero(hx, hy, 62 * Math.min(1, g), { key: 'hero' }); }   // the hero comes back, small: the callback
  spBadge('0 SUGAR', 792, 706, { flavor: F2, at: cu.badge2, rot: 0.12, size: 44 });
  spBokeh('l-front', 7, F2);
  spTag('02', 'Lime', { flavor: F2 });
  spHeadline(['STAY', 'FROSTY'], { flavor: F2, at: cu.head2 - 3.0, y: 415, size: 120 });
  spCaption('Lime + mint, *ice cold*', { flavor: F2, at: 0.9 });
}
