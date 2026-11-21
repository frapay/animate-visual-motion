// =====================================================================
//  SCENES — keynote demo. World coordinates 1080x1920; time TT on 1s. One product per frame, on the floor, under
//  the beam; type and leaders round it. Content inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
const KEY_FINISH = 'gold';                                   // the piece's one accent: 'titanium' | 'midnight' | 'gold'
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const CASE = { x: 500, y: 944, w: 500, h: 424 }, PUCK = { x: 262, y: 858, r: 176 };
const FLOOR1 = CASE.y + CASE.h / 2 + 2, FLOOR2 = PUCK.y + PUCK.r + 2;
// the specs: [value, unit, label, decimals, baseline y, the point on the puck its leader starts from]
const SPECS = [
  [48, 'h', 'battery life', 0, 640, [PUCK.x + 34, PUCK.y - 92]],                      // on the charge ring
  [2, 'x', 'brightness', 0, 840, [PUCK.x - 26, PUCK.y - 68]],                         // on the glass
  [0.3, 'mm', 'bezel', 1, 1040, [PUCK.x + 112, PUCK.y + 130]],                        // on the rim
];
const SPEC_X = 566, SPEC_SIZE = 140;

// ---- era 1: the teaser. A silhouette, then light.
function sceneTeaser() {
  const rim = 0.3 + 0.7 * keyIn(cu.rim, 0.5), beam = keyIn(cu.beam, 0.9), sweep = keyIn(cu.sweep, 1.25);
  const sway = Math.sin(TT * 0.9) * 10, breathe = 1 + 0.05 * Math.sin(TT * 2.1), spot = { a: beam * breathe, w: 370, sx: CASE.x + 46 + sway };
  keyStage({ floor: FLOOR1, cx: CASE.x, light: 0.1 + 0.9 * beam });
  keySpot(CASE.x, FLOOR1, spot);
  keyDust(CASE.x, FLOOR1, { ...spot, a: beam, n: 30, key: 'back' });                 // motes behind the product
  keyCase(CASE.x, CASE.y, CASE.w, CASE.h, {
    floor: FLOOR1, rim, sweep, spec: seg(TT, cu.glint, cu.glint + 0.9), reflect: 0.16 + 0.2 * beam,
    led: keyIn(cu.led, 0.2) * (0.7 + 0.3 * Math.sin((TT - cu.led) * TAU * 1.5)),
  });
  keyDust(CASE.x, FLOOR1, { ...spot, a: beam * 0.8, n: 16, key: 'front' });           // and a few in front of it
  keyTag('01 — Teaser');
  keyHeadline('Launch day', 'Out of the dark', { at: 1.0 });
  keyCaption('It starts as a *silhouette*', { at: 0.4 });
}

// ---- era 2: the feature moment. What was inside, and its numbers.
function sceneSpecs() {
  const spot = { a: 1 + 0.05 * Math.sin(TT * 2.1), w: 280, sx: PUCK.x + 54 + Math.sin(TT * 0.9) * 10 };
  keyStage({ floor: FLOOR2, cx: PUCK.x, light: 1, span: 330 });
  keySpot(PUCK.x, FLOOR2, spot);
  keyDust(PUCK.x, FLOOR2, { ...spot, a: 1, n: 30, key: 'back2' });
  keyPuck(PUCK.x, PUCK.y, PUCK.r, { floor: FLOOR2, ring: 0.06 + 0.82 * keyIn(cu.charge, 2.0), spec: seg(TT, cu.glint2, cu.glint2 + 0.9), specA: 0.42 });
  keyDust(PUCK.x, FLOOR2, { ...spot, a: 0.8, n: 14, key: 'front2' });
  SPECS.forEach(([v, unit, label, dec, y, from], i) => {                               // one at a time: the leader reaches out, then the numeral counts
    keyLeader(from[0], from[1], SPEC_X - 24, y - SPEC_SIZE * 0.36, { at: cu['lead' + (i + 1)], dur: 0.4 });
    keySpec(v, unit, label, SPEC_X, y, { at: cu['spec' + (i + 1)], dur: 0.75, dec, size: SPEC_SIZE });
  });
  keyTag('02 — Specs');
  keyHeadline('The numbers', 'Small. Tireless.', { at: 0.55, y: 452, size: 80 });
  keyCaption('Then the *numbers* land', { at: 0.7 });
}
