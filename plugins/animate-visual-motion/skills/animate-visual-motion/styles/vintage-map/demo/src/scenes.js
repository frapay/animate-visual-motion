// =====================================================================
//  SCENES — vintage map demo. World coordinates 1080x1920 (the sheet); time TT on 2s. Content inside x 60-940,
//  y 250-1500. The parchment, the sea wash, the rhumb web and the border of each era are painted once (vmpSheet);
//  everything inked is drawn live so that it boils and can be written on.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const LAKE = { x: 540, y: 1180, r: 112 };
const CITY = { x: 560, y: 772, r: 160 };

// ---- era 1: Berangkat — a desert coast, a port, and the route to the oasis
const COAST1 = [[-30, 722], [90, 700], [170, 652], [260, 668], [330, 628], [430, 642], [520, 592], [640, 612], [720, 562], [840, 576], [930, 522], [1110, 500]];
const ROSE1 = { x: 790, y: 396, r: 100 };
const ROUTE1 = [[292, 818], [340, 905], [480, 938], [640, 862], [790, 905], [872, 1040], [832, 1200]];
function sceneBerangkat() {
  const t = TT;
  vmpSheet('berangkat', () => {
    vmpParchment();
    vmpSea(COAST1, { key: 'laut1', close: [[1110, -30], [-30, -30]] });
    vmpRhumb(ROSE1.x, ROSE1.y);
    vmpBorder();
  });
  // the quill inks the coast from left to right; the ochre wash of the land follows it
  const kc = lerp(0.06, 1, EZ.io(seg(t, cu.coast, 0.7))), S1 = vmpSmooth(COAST1, false, 10);
  vmpWash([...S1, [1110, 1960], [-30, 1960]], VMP.ochre, { key: 'gurun', al: 0.5, k: lerp(0.25, 1, EZ.o2(seg(t, 0.1, 0.75))) });
  // on the sea: the rose (its needle swings and settles), a dhow on bobbing waves, gulls (background life)
  vmpCompass(ROSE1.x, ROSE1.y, ROSE1.r, { needle: vmpSwing(0.25, 1.3) });
  vmpWaves(300 + 5 * t, 566, 170, { key: 'ombak1' }); vmpShip(300 + 5 * t, 556, 0.95, { key: 'dhow1' });
  vmpGulls(560, 480, { key: 'camar1' });
  vmpCoast(S1, { raw: true, side: 1, frac: kc, key: 'pantai1', pen: true });
  // the places are inked as the route reaches them
  vmpDunes(560, 762, 150, 40, { key: 'd1', p: ev(cu.dune, 0.4) });
  vmpDunes(712, 1000, 56, 26, { key: 'd4', n: 2, p: ev(cu.dune2 + 0.2, 0.3) });
  vmpDunes(880, 770, 60, 34, { key: 'd2', n: 2, p: ev(cu.dune2, 0.3) });
  vmpDunes(205, 1045, 125, 55, { key: 'd3', p: ev(cu.gurun, 0.4) });
  vmpLabel('Gurun', 215, 962, 36, { caps: true, track: 0.34, curve: 10, al: 0.8, reveal: ev(cu.gurun, 0.4), key: 'gurun' });
  vmpCity(120, 1222, '', { kind: 'tents', p: ev(cu.palm - 0.1, 0.3), s: 0.9, key: 'kemah' });
  vmpCaravan([[70, 1300], [200, 1294], [330, 1302]], 0.5 + 0.09 * t, 3, { s: 0.42, key: 'kaf' });   // a far caravan plods along (background life)
  vmpLake(LAKE.x, LAKE.y, LAKE.r, { p: ev(cu.oasis, 0.3), key: 'oasis' });
  vmpLabel('Oasis', LAKE.x - 6, LAKE.y - LAKE.r - 26, 42, { curve: 12, reveal: ev(cu.oasis + 0.1, 0.3), key: 'oasis' });
  vmpPalm(388, 1210, 1.0, { key: 'p1', p: ev(cu.palm, 0.25) }); vmpPalm(352, 1150, 0.78, { key: 'p2', p: ev(cu.palm + 0.08, 0.25) }); vmpPalm(690, 1108, 0.86, { key: 'p3', p: ev(cu.palm + 0.16, 0.25) });
  vmpCity(170, 795, 'Bandar', { p: ev(cu.city, 0.34), s: 1.1, key: 'bandar' });
  // the route and the hero at its head
  const u = seg(t, cu.go, cu.arrive), head = vmpRoute(ROUTE1, t < cu.go ? 0.001 : lerp(u, u * u * (3 - 2 * u), 0.5), { key: 'r1' });
  const done = t >= cu.arrive, hop = Math.sin(Math.PI * ev(cu.arrive + 0.08, 0.3));
  vmpHero(head.x, head.y, 72, { dir: Math.cos(head.a) >= -0.2 ? 1 : -1, step: done || t < cu.go ? 0 : head.d / 68, mood: done ? 'happy' : t < cu.go ? 'wow' : 'calm', lift: 26 * hop });
  vmpTag('Berangkat');
  vmpCaption('Kafilah mulai *berangkat*');
}

// ---- era 2: Tiba — the round walled city on the far shore
const COAST2 = [[-30, 1150], [120, 1124], [260, 1160], [380, 1130], [520, 1166], [680, 1134], [820, 1170], [960, 1140], [1110, 1152]];
const ROSE2 = { x: 872, y: 1250, r: 54 };
const ROUTE2 = [[-50, 772], [110, 782], [232, 880], [306, 1006], [436, 1096]];
const XMARK = [584, 1096];
function sceneTiba() {
  const t = TT;
  vmpSheet('tiba', () => {
    vmpParchment();
    vmpSea(COAST2, { key: 'laut2', close: [[1110, 1960], [-30, 1960]] });
    vmpRhumb(ROSE2.x, ROSE2.y, { R: 520 });
    vmpBorder();
    vmpWash([...vmpSmooth(COAST2, false, 10), [1110, -30], [-30, -30]], VMP.sage, { key: 'hijau', al: 0.5 });
  });
  vmpCoast(COAST2, { side: -1, key: 'pantai2' });
  // the country behind the city is inked in: mountains, a river running to the sea, forests, a scale bar
  vmpMountains(410, 492, 905, 516, { key: 'gunung', rows: 2, s: 78, n: 5, p: ev(cu.mount, 0.5) });
  vmpRiver([[792, 548], [852, 640], [822, 780], [880, 930], [852, 1060], [884, 1152]], { key: 'sungai', frac: EZ.o2(ev(cu.river, 0.6)) });
  vmpForest(190, 616, 112, 52, { key: 'hutan', n: 13, p: ev(cu.forest, 0.4) });
  vmpForest(128, 1010, 62, 34, { key: 'hutan2', n: 6, p: ev(cu.forest + 0.25, 0.3) });
  vmpScale(86, 436, 232, { p: ev(cu.mount + 0.2, 0.4) });
  // the harbour: two dhows on bobbing waves, gulls, the small rose (its needle swings and settles) — background life
  vmpLabel('Laut', 462, 1288, 34, { caps: true, track: 0.5, al: 0.75, c: VMP.seaD, haloC: VMP.sea, key: 'laut' });
  vmpCompass(ROSE2.x, ROSE2.y, ROSE2.r, { needle: vmpSwing(3.5, -1.2), letter: '', plain: true, key: 'rose2' });
  vmpWaves(236 + 7 * (t - 3), 1262, 150, { key: 'ombak2' }); vmpShip(236 + 7 * (t - 3), 1252, 0.9, { key: 'dhow2' });
  vmpWaves(690 - 5 * (t - 3), 1272, 120, { key: 'ombak3' }); vmpShip(690 - 5 * (t - 3), 1264, 0.72, { key: 'dhow3x', dir: -1 });
  vmpGulls(470, 1212, { key: 'camar2', s: 0.9 });
  // the round city (the bridge object) and its name
  vmpWalledCity(CITY.x, CITY.y, CITY.r, { key: 'kota' });
  vmpLabel('Kota Bundar', CITY.x, CITY.y - CITY.r - 22, 42, { curve: 16, reveal: ev(3.7, 0.4), key: 'kotab' });
  // the last of the route: the hero walks in from the left, the X is struck, the flag goes up
  const u = seg(t, cu.go2, cu.arrive2), head = vmpRoute(ROUTE2, u, { key: 'r2', start: false });
  vmpX(XMARK[0], XMARK[1], 22, ev(cu.arrive2, 0.25));
  vmpFlag(XMARK[0], XMARK[1], 1, { p: popS(cu.flag), key: 'bendera' });
  const done = t >= cu.arrive2, hop = Math.max(Math.sin(Math.PI * ev(cu.flag, 0.3)), Math.sin(Math.PI * ev(cu.hop2, 0.3)));
  if (t >= cu.go2 - 0.1) vmpHero(head.x, head.y, 72, { dir: 1, step: done ? 0 : head.d / 68, mood: done ? 'happy' : 'calm', lift: 28 * hop });
  vmpTag('Tiba');
  vmpCaption('akhirnya *tiba* di kota!');
}
