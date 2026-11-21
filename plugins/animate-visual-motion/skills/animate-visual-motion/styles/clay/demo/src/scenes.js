// =====================================================================
//  SCENES — clay demo. World coordinates 1080x1920; time TT on 2s. Content inside x 60-940, y 250-1500.
//  Both eras stand on the same table (it meets the card at y = 1000). Era 1: a sky-blue card and a bare cream
//  table. Era 2: a butter card and a grass-green slab.
// =====================================================================
const cu = TIMELINE.cues;
const TABLE_Y = 1000;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const SEED = { x: 612, base: 1128, r: 112 };
const CROWN = { x: 560, y: 650, r: 228 };
const HERO_R = 122;

// ---- era 1: a small seed
function seedState() {
  const fall = seg(TT, 0, cu.land), jump = Math.sin(Math.PI * ev(cu.jump, 0.34));
  const push = Math.sin(Math.PI * ev(cu.pat, 0.34));
  const q = clyLand(cu.land, 0.3, 16, 6) - 0.2 * push + clyLand(cu.pat + 0.34, 0.1, 17, 7) - 0.12 * jump + clyLand(cu.jump + 0.34, 0.18, 16, 7);
  const rx = SEED.r * (1 + q), ry = SEED.r / (1 + q);
  return { x: SEED.x + 16 * push, y: SEED.base - ry - lerp(900, 0, EZ.i2(fall)) - 76 * jump, rx, ry, rot: (1 - fall) * -2.4, air: clamp((1 - fall) * 3 + jump) };
}
const seedPts = () => { const s = seedState(); return clyBlobPts(s.x, s.y, s.rx, s.ry, { key: 'seed', lump: 0.04, rot: s.rot }); };
function sceneBiji() {
  clySet(CL.sky, CL.cream, { hz: TABLE_Y });
  // clouds stuck on the card, drifting (background life)
  clyCloud(215 + 14 * TT, 560, 250, { key: 'c1' });
  clyCloud(815 - 9 * TT, 400, 190, { key: 'c2' });
  // a worm watching from its hole, pebbles, a blue beetle walking by (background life)
  clyWorm(868, 1076, 84, { key: 'worm1', out: ev(0.9, 0.4) });
  clyPebble(150, 1090, 40, 24, 'p1'); clyPebble(462, 1276, 30, 17, 'p2'); clyPebble(905, 1262, 22, 13, 'p3');
  const bx = 690 + 34 * TT, by = 1262 + (B % 2) * 3;
  clyShadow(bx, by + 18, 30, 8, 0.28);
  clyLump(clyBlobPts(bx, by, 25, 20, { key: 'beetle', n: 20 }), CL.blue, { key: 'beetle', amt: 0.7, inner: () => clySeam([[bx + 2, by - 22], [bx + 2, by + 22]], { w: 2.4 }) });
  clyLump(ellipsePts(bx + 27, by + 3, 10, 9, 0, 12), CL.choc, { key: 'beetleh', amt: 0.4, grain: false });
  // the seed: it drops in spinning, lands with a squash, gets pinched by a push, then jumps on its own
  const s = seedState();
  clyShadow(s.x, SEED.base + 4, s.rx * 1.1 * (1 - 0.5 * s.air), 24 * (1 - 0.5 * s.air), 0.36 * (1 - 0.6 * s.air));
  clySeed(seedPts(), CL.brown, { key: 'seed', rot: s.rot, dents: TT >= cu.pat + 0.15 ? 3 : 1 });
  clyBits(SEED.x, SEED.base - 8, TT - cu.land, [CL.brown, CL.cream], { key: 'land', n: 8, spread: 100, r: 10 });
  clyBits(SEED.x, SEED.base - 8, TT - cu.jump - 0.34, [CL.brown, CL.mustard], { key: 'jump', n: 6, spread: 100, power: 0.8, r: 8 });
  // the hero hops in from the left in two hops, pushes the seed, and is amazed when it jumps
  const hin = seg(TT, cu.hopin, cu.hopin + 0.5), hx = lerp(-170, 322, EZ.o2(hin)), hop = hin < 1 ? Math.abs(Math.sin(hin * TAU)) : 0;
  const pat = Math.sin(Math.PI * ev(cu.pat - 0.08, 0.42)), wow = TT >= cu.jump && TT < cu.jump + 0.75, sq = clyLand(cu.hopin + 0.5, 0.14, 17, 7);
  clyHero(hx + 52 * pat, SEED.base + 62 - HERO_R, HERO_R, { key: 'bulat', lift: 64 * hop, sx: 1 + sq + 0.06 * pat, sy: 1 / (1 + sq + 0.06 * pat),
    arms: wow ? [1.1, 1.1] : [-0.5 - 0.3 * hop, lerp(TT >= cu.pat - 0.25 ? 0.9 : -0.4, -0.25, pat)], look: wow ? [0.8, -0.5] : [0.85, 0.3], mood: wow ? 'wow' : hin < 1 ? 'happy' : 'smile' });
  clyTag('Biji', { c: CL.mustard });
  clyCaption('Sebutir *biji* kecil', { hi: CL.mustard });
}

// ---- era 2: it grew into a tree
const crownPts = () => clyCrownPts(CROWN.x, CROWN.y, CROWN.r, 'pohoncr');
const FRUIT = [[468, 590], [668, 566], [560, 760], [706, 716]];
function scenePohon() {
  const t = TT - 3;
  clySet(CL.butter, CL.grass, { hz: TABLE_Y });
  clyCloud(170 + 12 * t, 470, 215, { key: 'd1' });
  clyCloud(900 - 10 * t, 548, 160, { key: 'd2' });
  // a blue bird flapping across the top (background life)
  clyBird(985 - 52 * t, 372 + 10 * Math.sin(B * 1.1), 0.95, B % 2, 'burung');
  // grass, flowers and the worm again (the thread from era 1)
  [[92, 1080, 0.9], [905, 1092, 1], [392, 1066, 0.8], [690, 1290, 1.05], [128, 1296, 1]].forEach(([x, y, s], i) => clyTuft(x, y, s, CL.leaf, 'tf' + i));
  clyFlower(908, 1300, 1.0, CL.white, 'fl1'); clyFlower(70, 1206, 0.85, CL.pink, 'fl2');
  clyWorm(452, 1284, 78, { key: 'worm2', out: ev(4.0, 0.4) });
  // the tree; its crown gives a little as each fruit pops out of it
  clyTree(CROWN.x, 1150, CROWN, { key: 'pohon' });
  const fall = EZ.i2(seg(TT, cu.drop, cu.bounce)), rest = [800, 1180];
  FRUIT.forEach(([x, y], i) => {
    const s = popS([cu.f1, cu.f1 + 1 / 6, cu.f2 + 1 / 12, cu.f3][i]), last = i === 3;
    if (last && TT >= cu.drop) {   // the last fruit lets go, falls and bounces on the table
      const q = clyLand(cu.bounce, 0.3, 17, 6.5);
      if (fall >= 1) clyShadow(rest[0], rest[1] + 38, 44, 10, 0.3);
      clyFruit(lerp(x, rest[0], fall), lerp(y, rest[1], fall), 38, CL.mustard, { key: 'fr' + i, squash: q });
    } else clyFruit(x, y + Math.sin(B * 0.8 + i) * 2, 38, CL.mustard, { key: 'fr' + i, s });
  });
  clyBits(rest[0], rest[1] + 30, TT - cu.bounce, [CL.grass, CL.mustard], { key: 'bounce', n: 8, spread: 40, r: 9 });
  // the hero looks up amazed, then cheers with both arms and hops
  const cheer = TT >= cu.cheer, hop = Math.max(Math.sin(Math.PI * ev(cu.bounce, 0.34)), Math.sin(Math.PI * ev(cu.hop2, 0.34)));
  const sq = clyLand(cu.bounce + 0.34, 0.15, 17, 7) + clyLand(cu.hop2 + 0.34, 0.15, 17, 7) - 0.04 * hop;
  const wave = cheer ? 1.15 + 0.22 * ((B % 4) < 2 ? 1 : -1) : -0.4;
  clyHero(250, 1215 - HERO_R, HERO_R, { key: 'bulat', lift: 78 * hop, sx: 1 + sq, sy: 1 / (1 + sq), arms: [cheer ? 2.3 - wave : -0.4, wave], look: [0.7, -0.8], mood: cheer ? 'happy' : 'wow' });
  clyTag('Pohon', { c: CL.blue });
  clyCaption('tumbuh jadi *pohon*!', { hi: CL.leaf });
}
