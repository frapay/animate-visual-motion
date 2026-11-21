// =====================================================================
//  ERAS, CAMERAS, BRIDGES — bauhaus demo (read by kit/morph.js). No camera moves: the sheet is a printed poster.
// =====================================================================
const ERA_BG = [BAU.paper, BAU.paper];
const BRIDGES = [
  // the yellow triangle (knocked off the stack) -> the sun's disc: similar size, the same yellow
  { tc: 3.0, A: () => ({ P: triPts(), c: BAU.yellow }), B: () => ({ P: bauCirclePts(SUN.x, SUN.y, SUN.r), c: BAU.yellow }) },
];
