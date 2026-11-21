// =====================================================================
//  ERAS, CAMERAS, BRIDGES — split-flap demo (read by kit/morph.js). No camera moves: it is a board on a wall.
// =====================================================================
const ERA_BG = [FLP.housingD, FLP.housingD];
const BRIDGES = [
  // the sun of yellow flaps -> the heart of red flaps: the same 7 x 10 half-cell patch, the outlines of the two maps
  { tc: 3.0, A: () => ({ P: flapMapPts(SUN_MAP, PIC.col, PIC.hrow), c: FLP.yellow }), B: () => ({ P: flapMapPts(HEART_MAP, PIC.col, PIC.hrow), c: FLP.red }) },
];
