// =====================================================================
//  SCENES — storybook demo. World coordinates 1080x1920; time TT on 2s; ev / popS for events.
// =====================================================================
// the bridge objects sit in clear sky: nothing may overlap them, or it shows in the morph window
const DM_MOON = { x: 620, y: 520, r: 150 };
const DM_SUN = { x: 560, y: 520, r: 160 };
const DM_FAR = [[-220, 1110], [140, 1000], [430, 1050], [770, 960], [1300, 1060]];
const DM_NEAR = [[-220, 1290], [200, 1215], [520, 1196], [860, 1225], [1300, 1320]];

// ---- era 0: night on the hill
function demoNight() {
  const cu = TIMELINE.cues;
  sbSky(SB.night, '#c4b2de', { key: 'nsky' });
  // stars twinkle on 2s (background life)
  [[150, 540, 24], [410, 430, 18], [940, 300, 22], [300, 730, 15], [965, 560, 16], [560, 270, 13], [110, 880, 12], [820, 220, 10]].forEach(([x, y, r], i) => sbStar(x, y, r, { key: 'nst' + i }));
  sbMoon(DM_MOON.x, DM_MOON.y, DM_MOON.r, { key: 'moon', mood: 'sleepy' });
  // a cloud drifting past below the moon
  sbCloud(150 + 18 * TT, 650, 300, 124, { key: 'ncl', c: '#d9d4f2', line: sbTone('#9a96d0', -0.2) });
  // the far hill with a cottage (a lit window) and a tree
  sbHill(DM_FAR, '#6c74b6', { key: 'nfar', w: 3.4 });
  sbTree(890, 1000, 0.9, { key: 'ntree', c: '#6c9fa0' });
  sbHouse(225, 1050, 1.05, { key: 'nhouse', lit: 0.9 + 0.1 * Math.sin(B * 0.9), wall: '#ead2b4', roof: '#9b88cc', door: '#6a79b8' });
  // the near hill
  sbHill(DM_NEAR, '#73a98d', { key: 'nnear', tufts: 14 });
  sbPath([[215, 1212], [270, 1300], [190, 1430], [290, 1580], [210, 1780], [330, 2000]], 46, 300, '#c9c3cf', { key: 'npath', pebbles: 6, line: sbTone('#8a86b8', -0.2) });
  // fireflies drifting over the grass (background life)
  for (let i = 0; i < 5; i++) {
    const t = TT * 0.35 + i * 0.23, x = 140 + i * 190 + 46 * Math.sin(t * TAU + i), y = 1010 + 70 * Math.sin(t * TAU * 1.3 + i * 2) + (i % 2) * 90;
    sbFirefly(x, y, 'ff' + i);
  }
  sbBush(60, 1300, 260, 150, '#5f8f80', { key: 'nb1' }); sbBush(1010, 1330, 280, 160, '#5f8f80', { key: 'nb2' });
  // the hero reads; on the cue it looks up at the moon
  const up = TT >= cu.look, k = ev(cu.look, 0.25);
  sbHero(520, 1062 - 18 * Math.sin(Math.PI * k), 150, { key: 'hero', mood: up ? 'wow' : 'smile', look: up ? [0.5, -1] : [0, 0.9], arms: [-1.3, -1.3], sy: 1 + 0.05 * Math.sin(Math.PI * k) });
  sbBook(520, 1190, 0.82, { key: 'nbook', c: SB.skyD, glow: 0.5 + 0.15 * Math.sin(B * 0.8) });
  if (up) for (let i = 0; i < 3; i++) sbSparkle(640 + i * 30, 850 - i * 46, 14 * EZ.back(ev(cu.look + i * 0.08, 0.25)), SB.cream);
  sbTag('Malam');
  sbCaption('Selamat malam, Bulan!');
}

// ---- era 1: morning on the same hill
function demoMorning() {
  const cu = TIMELINE.cues, t = TT - 3;
  sbSky(SB.sky, SB.skyL, { key: 'dsky' });
  sbSun(DM_SUN.x, DM_SUN.y, DM_SUN.r, { key: 'sun', rays01: ev(cu.rays - 0.2, 0.5), mood: 'happy' });
  // clouds drifting (background life)
  sbCloud(140 + 22 * t, 470, 270, 112, { key: 'dcl1' });
  sbCloud(890 - 18 * t, 300, 220, 92, { key: 'dcl2' });
  // birds gliding in over the tree on 2s (background life); they stay clear of the sun and the hero
  for (let i = 0; i < 2; i++) sbBird(990 - 55 * t + i * 110, 430 + i * 70 + 8 * Math.sin(B * 1.3 + i), 0.95 - i * 0.12, (B + i) % 2, 'bird' + i, i ? SB.lilacD : SB.skyD);
  // the far hill: cottage with chimney smoke, a tree with pink fruit
  sbHill(DM_FAR, SB.leafL, { key: 'dfar', w: 3.4 });
  sbTree(890, 1000, 0.9, { key: 'dtree', fruit: SB.pink });
  sbHouse(225, 1050, 1.05, { key: 'dhouse', smoke: true });
  // the near hill with flowers that sway
  sbHill(DM_NEAR, SB.leaf, { key: 'dnear', tufts: 14 });
  sbPath([[215, 1212], [270, 1300], [190, 1430], [290, 1580], [210, 1780], [330, 2000]], 46, 300, '#f3dcae', { key: 'dpath', pebbles: 6 });
  [[640, 1560, SB.pink], [820, 1640, SB.sun], [520, 1700, SB.lilac]].forEach(([x, y, c], i) => sbFlower(x, y, 1.0, c, 'lf' + i));
  sbBush(60, 1300, 260, 150, SB.leafD, { key: 'db1', berries: SB.pink }); sbBush(1010, 1330, 280, 160, SB.leafD, { key: 'db2' });
  [[200, 1262, SB.pink], [340, 1240, SB.sun], [740, 1246, SB.lilac], [860, 1290, SB.pink]].forEach(([x, y, c], i) => sbFlower(x, y, 1.15, c, 'fl' + i));
  sbBook(740, 1250, 0.55, { key: 'dbook', c: SB.lilacD, rot: 0.06 });
  // a butterfly fluttering around the hero (background life)
  sbButterfly(380 + 60 * Math.sin(t * 1.6), 820 + 40 * Math.sin(t * 3.1), 1.3, 'bfly');
  // the hero waves, then hops on the beat
  const hop = Math.max(Math.sin(Math.PI * ev(cu.hop1, 0.25)), Math.sin(Math.PI * ev(cu.hop2, 0.25)));
  const land = Math.max(Math.sin(Math.PI * ev(cu.hop1 + 0.25, 0.17)), Math.sin(Math.PI * ev(cu.hop2 + 0.25, 0.17)));   // a squash as it lands (follow-through)
  const wave = TT >= cu.wave ? 1.35 + 0.3 * ((B % 4) < 2 ? 1 : -1) : 0.2;
  sbHero(520, 1062, 150, { key: 'hero', mood: 'happy', arms: [0.15 + 0.5 * hop, wave], lift: 80 * hop, sx: 1 - 0.05 * hop + 0.07 * land, sy: 1 + 0.07 * hop - 0.08 * land });
  if (hop > 0.2) for (let i = 0; i < 2; i++) sbSparkle(420 + i * 200, 1200 - 20 * hop, 12 * hop, SB.cream);
  sbTag('Pagi', { c: SB.sun });
  sbCaption('Selamat pagi, Matahari!');
}
