// =====================================================================
//  ERAS, CAMERAS, BRIDGES — cave-painting demo (read by kit/morph.js). No camera: the wall is fixed, the light moves.
// =====================================================================
const ERA_BG = [CAVE.rock, CAVE.rock];
const BRIDGES = [
  // the rubbed red disc -> the blown halo of the first hand stencil (both round, about the same size)
  { tc: 3.0, A: () => ({ P: caveDiscPts(DISC.x, DISC.y, DISC.r), c: CAVE.red }), B: () => ({ P: caveDiscPts(HALO.x, HALO.y, HALO.r), c: CAVE.red, spray: HALO.spray }) },
];
