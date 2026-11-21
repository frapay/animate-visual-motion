// =====================================================================
//  SCENES — impasto demo. World coordinates 1080x1920; time TT on 2s. Every region is an outline handed to
//  impFill with a flow and a weighted palette; flat things are knife slabs. Content inside x 60-940, y 250-1300
//  (the caption owns y 1340-1460).
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const MOON = { x: 735, y: 455, r: 112 }, SUN = { x: 725, y: 470, r: 124 };
const HILL = (x) => 925 + 58 * Math.sin(x / 260 + 0.5) + 14 * Math.sin(x / 95);
const FIELD = (x) => 1052 + 16 * Math.sin(x / 310 + 2.2);
const ridgePoly = (fn, bottom) => { const P = []; for (let x = -40; x <= 1120; x += 40) P.push([x, fn(x)]); P.push([1120, bottom], [-40, bottom]); return P; };
const P_SKY = impRectPts(0, 0, W, 1050), P_HILL = ridgePoly(HILL, 1110), P_FIELD = ridgePoly(FIELD, H + 40);
const EDDY = { x: 325, y: 610, r: 215 };
const STARS = [[168, 430, 44], [470, 318, 38], [905, 255, 34], [545, 770, 42], [900, 770, 34], [EDDY.x, EDDY.y, 50]];
const HERO = { x: 232, y: 915, r: 126, stem: 4.3 };
const SUN_P = impSunPts(SUN.x, SUN.y, SUN.r, 10, 0.045);
const glow = (x, y, cx, cy, r) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (r * r));

// palettes: two or three neighbours for the local colour, one light, a touch of the complement
const NIGHT_SKY = [[IMP.ultra, 5], [IMP.cobalt, 4], [IMP.prussian, 3], [IMP.cerulean, 1.6], [IMP.violet, 1.2], [IMP.viridian, 0.6]];
const NIGHT_GLOW = [[IMP.cerulean, 4], [IMP.sky, 3.2], [IMP.lemon, 2], [IMP.white, 1.4], [IMP.cobalt, 2]];
const NIGHT_HILL = [[IMP.prussian, 6], [IMP.ink, 3], [IMP.violet, 2.2], [IMP.viridian, 2], [IMP.ultra, 1.5]];
const NIGHT_FIELD = [[IMP.viridian, 5], [IMP.prussian, 3], [IMP.olive, 2.5], [IMP.emerald, 2], [IMP.ultra, 1.6], [IMP.ochre, 1], [IMP.lemon, 0.5]];
const DAY_SKY = [[IMP.cerulean, 5], [IMP.cobalt, 3.4], [IMP.sky, 3.6], [IMP.turq, 1.5], [IMP.white, 1.1]];
const DAY_CLOUD = [[IMP.white, 5], [IMP.lemon, 2.6], [IMP.sky, 2.4], [IMP.lilac, 1]];
const DAY_HILL = [[IMP.cobalt, 3], [IMP.violet, 3], [IMP.viridian, 2.6], [IMP.lilac, 2], [IMP.emerald, 1.6]];
const DAY_FIELD = [[IMP.chrome, 5], [IMP.ochre, 3.4], [IMP.orange, 2.4], [IMP.lemon, 2], [IMP.sap, 1.6], [IMP.emerald, 0.9], [IMP.sienna, 0.8]];

// the sky's flow: a slow wave with two eddies (one loose in the sky, one round the orb) that breathe with time
const skyFlow = (orb) => impFlowSwirl((x, y) => -0.1 + 0.24 * Math.sin(x / 210 + y / 300 + TT * 0.7), [
  { x: EDDY.x + 10 * Math.sin(TT * 1.3), y: EDDY.y, r: EDDY.r, s: 1, k: 3.4 },
  { x: orb.x, y: orb.y, r: 250, s: -1, k: 4, pull: 0.05 },
  { x: 900, y: 880, r: 150, s: 1, k: 2 },
]);
const fieldFlow = impFlowRadial(560, 940, 0.09, 60);
// the farmhouse: knife slabs. wall, roof, chimney, a window, a door
function house(t0, wall, roof, win, door) {
  impKnife([[628, 934], [828, 930], [830, 1062], [626, 1064]], wall, { a: Math.PI / 2, key: 'wall', frac: impIn(t0, 0.25), c2: impTone(wall, 0.4) });
  impKnife([[770, 862], [796, 861], [797, 912], [770, 912]], roof, { a: -Math.PI / 2, key: 'chim', frac: impIn(t0 + 0.2, 0.15), lift: 3 });
  impKnife([[602, 940], [668, 874], [806, 872], [852, 936]], roof, { a: 0.04, key: 'roof', frac: impIn(t0 + 0.125, 0.25), c2: IMP.orange, lift: 5 });
  impKnife([[762, 968], [800, 967], [801, 1050], [762, 1050]], door, { a: Math.PI / 2, key: 'door', frac: impIn(t0 + 0.3, 0.15), lift: 2, lip: 3 });
  if (win) impKnife([[664, 964], [716, 962], [717, 1018], [664, 1019]], win, { a: 0.1, key: 'win1', c2: IMP.lemon, lift: 3, lip: 3 });
}
// chimney smoke: a few marks that climb a wandering path, one step every eighth
function smoke(pal, t0) {
  if (TT < t0) return; const st = impStep(0.25), P = [];
  for (let i = 0; i <= 7; i++) P.push([783 - i * 9 + 16 * Math.sin(i * 0.9 + st * 0.8), 852 - i * 22]);
  impAlong(P, pal, { w: 15, len: 44, key: 'smoke' + (st % 3), frac: impIn(t0, 0.5), step: 0.75, wet: 1 });
}

// ---- era 1: laid on thick, at night
function sceneNight() {
  impGround();
  // the sky: brushed in in bands, churning round its eddies; lighter paint near the moon and in the eddy's heart
  impFill(P_SKY, NIGHT_SKY, { key: 'sky', flow: skyFlow(MOON), w: 28, len: 104, edge: false, live: true, drift: 120, rate: 0.45, frac: 0.32 + 0.68 * impIn(cu.sky, 1.1),
    pal2: NIGHT_GLOW, mix: (x, y) => 0.95 * glow(x, y, MOON.x, MOON.y, 210) + 0.85 * glow(x, y, EDDY.x, EDDY.y, 120) + 0.3 * glow(x, y, 760, 930, 260),
    tone: (x, y) => -0.5 * clamp((560 - y) / 560) });
  // the moon: dragged on with the knife, then a halo of marks turning round it
  impRing(MOON.x, MOON.y, MOON.r + 34, MOON.r + 108, [[IMP.lemon, 4], [IMP.white, 2], [IMP.sky, 2.5], [IMP.chrome, 1.2]], { pal2: NIGHT_GLOW, w: 22, len: 70, rot: impStep(0.25) * 0.09, counter: true, key: 'halo', frac: impIn(cu.moon + 0.3, 0.6) });
  impOrb(impDiscPts(MOON.x, MOON.y, MOON.r), IMP.lemon, { frac: impIn(cu.moon, 0.3) });
  // stars are dabbed in one per eighth; their halos turn a notch on every eighth
  STARS.forEach(([x, y, r], i) => impStar(x, y, r, { key: 'st' + i, frac: impIn(cu.stars + i * 0.125, 0.3), rot: impStep(0.25, i * 0.37) * 0.16 }));
  // the far hill follows its own ridge
  impFill(P_HILL, NIGHT_HILL, { key: 'hill', flow: impFlowAlong(HILL, 0.16), w: 24, len: 84, frac: 0.25 + 0.75 * impIn(cu.hill, 0.6), tone: (x, y) => 0.5 * glow(x, y, 760, 990, 200) });
  house(cu.house, '#3a4ea8', '#7a2f2a', TT >= cu.lamp ? (impStep(0.25) % 4 === 3 ? IMP.chrome : IMP.orange) : null, IMP.prussian);
  smoke([[IMP.lilac, 3], [IMP.sky, 2], [IMP.white, 1.5]], cu.house + 0.5);
  // the field: ridged rows that run to a vanishing point, moonlight on the ridges below the moon
  impFill(P_FIELD, NIGHT_FIELD, { key: 'field', flow: fieldFlow, edge: false, w: 30, len: 112, frac: 0.22 + 0.78 * impIn(cu.field, 0.9),
    pal2: [[IMP.cerulean, 3], [IMP.emerald, 3], [IMP.lemon, 2], [IMP.sky, 1.5]], mix: (x, y) => 0.5 * glow(x, y, 720, 1180, 190), tone: (x, y) => -0.45 * clamp((y - 1350) / 500) });
  // the sunflower, asleep: petals half folded, head turned away; it nods once
  const nod = 16 * Math.sin(Math.PI * impIn(cu.nod, 0.34));
  impSunflower(HERO.x, HERO.y, HERO.r, { frac: impIn(cu.flower, 0.6), open: 0.5, turn: -0.55, nod: 10 + nod, key: 'hero', stem: HERO.stem });
  impTag('night');
  impCaption('Paint it *thick*');
}

// ---- era 2: the same picture, repainted in daylight
function sceneDay() {
  impGround();
  impFill(P_SKY, DAY_SKY, { key: 'sky2', flow: skyFlow(SUN), w: 28, len: 104, edge: false, live: true, drift: 120, rate: 0.45, frac: 0.4 + 0.6 * impIn(cu.sky2, 0.9),
    pal2: DAY_CLOUD, mix: (x, y) => 0.9 * glow(x, y, EDDY.x, EDDY.y, 150) + 0.75 * glow(x, y, SUN.x, SUN.y, 250) + 0.7 * glow(x, y, 900, 880, 120) + 0.35 * glow(x, y, 200, 930, 260),
    tone: (x, y) => -0.3 * clamp((420 - y) / 420) });
  // the sun: the bridge's orb, with rings of chrome and lemon turning round it
  impRing(SUN.x, SUN.y, SUN.r + 34, SUN.r + 150, [[IMP.chrome, 4], [IMP.lemon, 3], [IMP.orange, 1.6], [IMP.white, 1.4]], { pal2: [[IMP.white, 3], [IMP.lemon, 3], [IMP.sky, 2.5]], w: 24, len: 78, rot: impStep(0.25) * 0.1, counter: true, key: 'sunring', frac: impIn(cu.rays - 0.25, 0.75) });
  impOrb(SUN_P, IMP.chrome);
  // crows: two marks each, flapping on the eighths, crossing to the left
  if (TT >= cu.birds) [0, 1, 2].forEach((i) => { const st = impStep(0.25, i * 0.5); impBird(470 - (TT - cu.birds) * 70 + i * 92, 420 - i * 52 + (st % 2) * 9, 30 - i * 4, { flap: st % 2, key: i }); });
  impFill(P_HILL, DAY_HILL, { key: 'hill2', flow: impFlowAlong(HILL, 0.16), w: 24, len: 84, frac: 0.3 + 0.7 * impIn(cu.sky2 + 0.1, 0.5), tone: (x, y) => 0.4 * glow(x, y, 760, 990, 240) });
  house(cu.house2, IMP.white, IMP.verm, IMP.cobalt, IMP.viridian);
  smoke([[IMP.white, 3], [IMP.lilac, 2], [IMP.sky, 2]], cu.house2 + 0.4);
  // wheat: the same rows in chrome yellow; a gust re-lays a band of wet marks that crosses the field, twice
  const f = impFill(P_FIELD, DAY_FIELD, { key: 'field2', flow: fieldFlow, edge: false, w: 30, len: 112, frac: 0.3 + 0.7 * impIn(cu.field2, 0.9),
    pal2: [[IMP.lemon, 4], [IMP.white, 2], [IMP.chrome, 3]], mix: (x, y) => 0.5 * glow(x, y, 720, 1150, 220), tone: (x, y) => -0.4 * clamp((y - 1400) / 480) });
  for (const g of [cu.gust1, cu.gust2]) if (TT >= g && TT < g + 0.5) { const gx = lerp(1150, -120, (TT - g) / 0.5); impWet(f, (x, y) => (Math.abs(x - gx - (y - 1300) * 0.25) < 70 && y < 1560 ? 0.8 : 0)); }
  // the sunflower wakes: petals spread, the head swings round to the sun, then it nods on the last two beats
  const wake = EZ.io(impIn(cu.wake, 0.5)), nod = 14 * Math.max(Math.sin(Math.PI * impIn(cu.nod1, 0.34)), Math.sin(Math.PI * impIn(cu.nod2, 0.34)));
  impSunflower(HERO.x, HERO.y, HERO.r, { open: lerp(0.5, 1, wake), turn: lerp(-0.55, 0.7, wake), nod: 10 * (1 - wake) + nod - 8 * wake, key: 'hero', stem: HERO.stem });
  impTag('day');
  impCaption('Follow the *sun*', { at: 0.75 });
}
