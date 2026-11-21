// =====================================================================
//  SCENES — bauhaus demo. World coordinates 1080x1920 on the kit's grid (80 px modules from 60, 220); time TT on 1s.
//  Content inside x 60-940, y 250-1300 (the caption owns y 1310-1460). Both eras stand on the same black rule.
// =====================================================================
const cu = TIMELINE.cues;
const GY = 1180;                                             // the ground rule's top edge
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const TRI = { x: 460, y: 500, w: 240, h: 200 };              // the triangle at rest on the stack
const SUN = { x: 660, y: 480, r: 150 };
const SQ = { x: 460, y: 940, s: 240 }, CI = { x: 580, y: 820, r: 120 };
const HERO_R = 100, HERO_X1 = SQ.x - 1.42 * HERO_R;          // era 1: it stops with its nose on the square
const ground = (u = 1) => bauBar(60, GY + 8, 940, GY + 8, 16, BAU.black, { in: u, ticks: { step: 40, len: 12, side: 1 } });
// the beat counter: a row of dots under the ground, one more each beat, the newest one in colour (it runs through both eras)
const counter = (c) => bauDots(80, 1250, 12, 1, 40, 9, BAU.black, { in: clamp(Math.floor(TT * 2 + 1e-6) + 1, 0, 12) / 12, cf: (i) => (i === Math.floor(TT * 2 + 1e-6) ? c : BAU.black) });

// ---- era 1: three basic shapes
function triState() {   // the bump knocks it two modules up, one whole turn on the way
  const k = bauGo(bauIn(cu.bump, 0.4));
  return { y: TRI.y - 160 * k, rot: k * TAU };
}
const triPts = () => { const s = triState(); return bauTriPts(TRI.x, s.y, TRI.w, TRI.h, 'u', s.rot); };
function sceneBentuk() {
  bauGrid({ in: bauIn(0, 0.4) });
  // a grey quarter circle swings into the top-right corner; a pendulum ticks in front of it (background life)
  bauArc(940, 220, 280, 90, 90, BAU.grey, { in: bauIn(0.1, 0.4) });
  bauPendulum(820, 300, 180, 0.46 * Math.sin(TT * Math.PI), { c: BAU.black, r: 28 });
  // a dot going round its ring; a stripe field creeping along; the beat counter (background life)
  bauOrbit(220, 780, 80, TT * Math.PI - Math.PI / 2);
  bauStripes(780, 1020, 160, 160, 4, BAU.grey, { dir: 'd', in: bauIn(0.3, 0.4), from: 'b', scroll: TT * 20 });
  ground(bauIn(0, 0.4));
  counter(BAU.yellow);
  // the stack: one shape per beat, each stops dead; the bump shoves the lower two a quarter module and back
  const sh = 22 * Math.sin(Math.PI * bauIn(cu.bump, 0.17));
  bauSquare(SQ.x + sh, SQ.y, SQ.s, SQ.s, BAU.black, { in: bauIn(cu.sq - 0.25, 0.25), from: 'r', dist: 700, snap: false });
  bauCircle(CI.x + sh * 0.6, CI.y, CI.r, BAU.blue, { in: bauIn(cu.ci - 0.25, 0.25), from: 't', dist: 900, snap: false });
  const ts = triState();
  bauTri(TRI.x, ts.y, TRI.w, TRI.h, 'u', BAU.yellow, { in: bauIn(cu.tri - 0.25, 0.25), from: 't', dist: 800, rot: ts.rot, snap: false });
  // the hero rolls in (one whole turn), hits the square at full speed, recoils once and looks up
  const hx = lerp(HERO_X1 - TAU * HERO_R, HERO_X1, bauGo(bauIn(cu.roll, cu.bump - cu.roll))) - 28 * Math.sin(Math.PI * bauIn(cu.bump, 0.25)), hit = TT >= cu.bump;
  bauHero(hx, GY - HERO_R, HERO_R, { rot: (hx - HERO_X1) / HERO_R, look: hit ? [0.5, -0.9] : [1, 0], mood: hit ? 'wow' : 'smile' });
  bauTag('bentuk', { c: BAU.yellow });
  bauCaption('Tiga *bentuk* dasar', { hi: BAU.yellow });
}

// ---- era 2: arranged into a city
function sceneKota() {
  bauGrid();
  // the sun: its rays push out, then ratchet a sixteenth of a turn on every beat (background life)
  bauSun(SUN.x, SUN.y, SUN.r, { in: bauIn(cu.rays - 0.1, 0.2), rot: bauTick(cu.rays, 0.5, 0.12) * TAU / 16 });
  // a strip of "water" creeping under the ground rule; the beat counter goes on
  bauStripes(540, 1220, 400, 60, 10, BAU.blue, { dir: 'd', scroll: -TT * 24 });
  ground();
  counter(BAU.blue);
  // the skyline is pushed up out of the ground rule, one block per eighth; where the tall block crosses the sun the
  // overlap is printed black
  const lit = Math.floor(clamp((TT - cu.lit) / 0.75) * 12 + 1e-6);
  const k1 = bauIn(cu.b1 - 0.25, 0.25);
  bauTower(500, GY, 120, 640, BAU.blue, { in: k1, win: { cols: 2, rows: 9, lit: Math.min(lit, 6) * 3 } });
  if (k1 > 0) bauOverlap({ k: 'c', x: SUN.x, y: SUN.y, r: SUN.r }, { k: 'r', x: 500, y: GY - 640 * bauGo(k1), w: 120, h: 640 * bauGo(k1) }, BAU.black);
  bauTower(660, GY, 120, 360, BAU.black, { in: bauIn(cu.b2 - 0.25, 0.25), top: 'arc', win: { cols: 2, rows: 5, lit: lit } });
  bauHouse(340, GY, 120, { in: bauIn(cu.b3 - 0.3, 0.3) });
  // a big wheel on a triangle stand, turning (background life)
  bauTri(800, 940, 120, 240, 'u', BAU.black, { in: bauIn(cu.b4 - 0.25, 0.2), from: 'grow' });
  bauWheel(860, 940, 80, TT * 1.3, { in: bauIn(cu.b4 - 0.12, 0.16), over: 0.06, cabins: 6 });
  // a bird comes down the 45° diagonal, then flies level, flapping on the sixteenths (background life)
  const bt = TT - 3.2, bd = Math.min(bt, 0.8) * 250, bx = 110 + bd + Math.max(0, bt - 0.8) * 36;
  bauBird(bx, 130 + bd + (bt > 0.8 && Math.floor(TT * 4) % 2 ? 10 : 0), 1.25, { flap: Math.floor(TT * 8 + 1e-6) % 2 });
  // the hero rolls in, overshoots once, looks up at the sun and hops on the last two beats
  const hx = lerp(180 - TAU * HERO_R, 180, bauGo(bauIn(cu.roll2, cu.stop - cu.roll2), 0.035));
  const hop = Math.max(Math.sin(Math.PI * bauIn(cu.hop1, 0.3)), Math.sin(Math.PI * bauIn(cu.hop2, 0.3)));
  bauHero(hx, GY - HERO_R - 70 * hop, HERO_R, { rot: (hx - 180) / HERO_R, look: [0.75, -0.7], mood: hop > 0.05 ? 'wow' : 'smile' });
  bauTag('kota', { c: BAU.blue });
  bauCaption('Disusun jadi *kota*', { hi: BAU.blue });
}
