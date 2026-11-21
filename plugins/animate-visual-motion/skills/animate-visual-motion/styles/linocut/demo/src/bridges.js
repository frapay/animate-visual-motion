// =====================================================================
//  ERAS, CAMERAS, BRIDGES — linocut demo (read by kit/morph.js). No camera moves: it is a print on a sheet.
// =====================================================================
const ERA_BG = [LIN.ink, LIN.paper];
const BRIDGES = [
  // the carved moon disc -> the sun disc: the same size, paper becomes the second colour at the press
  { tc: 3.0, A: () => ({ P: linDiscPts(MOON.x, MOON.y, MOON.r), c: LIN.paper }), B: () => ({ P: linDiscPts(SUN.x, SUN.y, SUN.r), c: LIN.color }) },
];
