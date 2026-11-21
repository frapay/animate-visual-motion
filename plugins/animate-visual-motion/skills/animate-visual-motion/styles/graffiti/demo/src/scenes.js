// =====================================================================
//  SCENES — graffiti demo. World coordinates 1080x1920, no camera (a wall does not move); time TT on 1s.
//  Pictures inside x 60-940, y 250-1310 (the caption strip owns y 1335-1435).
// =====================================================================
const cu = TIMELINE.cues;
const GRF_ERA_WALL = ['brick', 'concrete'];                  // read by the kit's morph backdrop
const EACH = 0.375;                                          // one stencil layer: card on, can over, card off
// the bridge objects: two round sprayed blobs of similar size; nothing overlaps them at the bridge
const BLOB_A = { x: 735, y: 525, r: 182 }, BLOB_B = { x: 560, y: 640, r: 212 };
const blobA = () => grfBlobPts(BLOB_A.x, BLOB_A.y, BLOB_A.r, 'A'), blobB = () => grfBlobPts(BLOB_B.x, BLOB_B.y, BLOB_B.r, 'B');
const bumpAt = (t0, d = 0.18) => { const u = (TT - t0) / d; return u < 0 || u > 1 ? 0 : Math.sin(Math.PI * u); };
const blinkAt = (...ts) => ts.some((t) => TT >= t && TT < t + 0.1);

// ---- era 1: a brick wall gets its first piece
function sceneBrick() {
  grfWall('brick');
  // one press of the can: a round yellow blob bursts on, and a moment later it starts to run
  const pb = ev(cu.blob, 0.3);
  grfSpray(blobA(), GRF.yellow, { p: pb, mode: 'burst', soft: 18, drips: 4, dripKey: 'bridge', dripT: TT - cu.blob - 0.25, key: 'A' });
  if (pb < 1) { grfPuff(BLOB_A.x, BLOB_A.y, BLOB_A.r * 1.5, GRF.yellow, 0.5 * (1 - pb)); grfSpit(BLOB_A.x, BLOB_A.y, BLOB_A.r * 1.4 * (0.3 + pb), GRF.yellow, { key: 'A', n: 40 }); }
  // Kaleng is stencilled on: cyan base, black shadows, white highlights. Then he blinks and presses his nozzle on
  // every letter (a little squash, a puff of pink mist)
  const ht = TT - cu.s1, built = ht >= 3 * EACH, press = built ? Math.max(...[0, 1, 2, 3, 4].map((i) => bumpAt(cu.w1 + i * 0.125 - 0.04, 0.16))) : 0;
  grfHero(262, 705, 232, { t: built ? undefined : ht, each: EACH, look: [0.9, 0.6], blink: built && blinkAt(1.54, 2.08), mood: press > 0.1 ? 'wow' : 'smile', sy: 1 - 0.05 * press, sx: 1 + 0.03 * press, spray: press, sprayC: GRF.pink });
  // the word pops on letter by letter; its outline runs
  const wt = TT - cu.w1;
  if (wt >= 0) {
    for (let i = 0; i < 5; i++) { const u = (wt - i * 0.125) / 0.3; if (u >= 0 && u < 1) grfPuff(190 + i * 155, 1110, 160 * (0.6 + u), GRF.pink, 0.45 * (1 - u)); }
    grfWord('PAINT', 500, 1204, 250, { t: wt, w: 850, fill: GRF.pink, shade: GRF.cyan, drips: 3, key: 'paint' });
  }
  // a lime fat-cap underline, with two runs; two white dots pop beside the word
  const UL = [[100, 1276], [300, 1268], [520, 1278], [720, 1266], [900, 1272]];
  grfLine(UL, 24, GRF.lime, { p: ev(cu.line, 0.25), drips: [0.22, 0.83], dripT: TT - cu.line - 0.3, dripLen: 38, key: 'ul' });
  grfDot(915, 1010, 20, GRF.white, { p: ev(cu.line + 0.125, 0.1), key: 'd1' });
  grfDot(888, 962, 11, GRF.white, { p: ev(cu.line + 0.25, 0.1), key: 'd2' });
  // overspray hanging in the air (background life), then the wall's grooves back over the paint
  grfMist(GRF.white, { n: 6, al: 0.1, key: 'm1' }); grfMist(GRF.pink, { n: 3, al: 0.07, key: 'm2', box: [200, 800, 900, 1300] });
  grfDone();
  grfTag('brick');
  grfCaption('Walls want *colour*', { hi: GRF.yellow });
}

// ---- era 2: a concrete wall, a bird on a wire
function sceneConcrete() {
  grfWall('concrete');
  // the pink blob (it has been running for a while, and still creeps)
  grfSpray(blobB(), GRF.pink, { soft: 18, drips: 4, dripKey: 'bridge', dripT: GRF_DRIP_T + Math.max(0, TT - 3.2), key: 'B' });
  // a black fat-cap wire is sprayed across, under the blob
  const WIRE = [[70, 872], [300, 878], [560, 870], [800, 878], [1000, 872]];
  grfLine(WIRE, 20, GRF.black, { p: ev(cu.wire, 0.2), core: '#4a464f', drips: [0.12, 0.9], dripT: TT - cu.wire - 0.3, dripLen: 70, key: 'wire' });
  // the bird: lime base, black shadows, white highlights. It blinks, and hops with a flap on the last beat
  const bt = TT - cu.b1, built = bt >= 3 * EACH, hop = bumpAt(cu.hop, 0.3);
  grfBird(585, 690, 228, { t: built ? undefined : bt, each: EACH, wing: hop, blink: built && blinkAt(5.0, 5.75), tilt: -0.05 * hop, key: 'bird' });
  // Kaleng again, small, bottom left: he presses his nozzle and FLY pops on
  const press = Math.max(...[0, 1, 2].map((i) => bumpAt(cu.f1 + i * 0.125 - 0.04, 0.16)));
  grfHero(182, 1092, 130, { look: [0.9, -0.3], blink: blinkAt(3.9, 5.5), mood: press > 0.1 ? 'wow' : 'smile', sy: 1 - 0.05 * press, sx: 1 + 0.03 * press, spray: press, sprayC: GRF.yellow, key: 'hero2' });
  const wt = TT - cu.f1;
  if (wt >= 0) {
    for (let i = 0; i < 3; i++) { const u = (wt - i * 0.125) / 0.3; if (u >= 0 && u < 1) grfPuff(470 + i * 165, 1110, 160 * (0.6 + u), GRF.yellow, 0.45 * (1 - u)); }
    grfWord('FLY', 630, 1212, 255, { t: wt, w: 600, fill: GRF.yellow, fill2: '#ff8f1f', shade: GRF.cyan, drips: 2, key: 'fly' });
  }
  // sprayed dots pop beside the word
  grfDot(925, 985, 22, GRF.lime, { p: ev(cu.d1, 0.1), key: 'd3' });
  grfDot(900, 940, 12, GRF.white, { p: ev(cu.d1 + 0.09, 0.1), key: 'd4' });
  grfDot(345, 985, 15, GRF.cyan, { p: ev(cu.d2, 0.1), key: 'd5' });
  grfMist(GRF.white, { n: 6, al: 0.1, key: 'm3' }); grfMist(GRF.yellow, { n: 3, al: 0.06, key: 'm4', box: [200, 800, 900, 1300] });
  grfDone();
  grfTag('concrete');
  grfCaption('Leave a *mark*', { hi: GRF.cyan });
}
