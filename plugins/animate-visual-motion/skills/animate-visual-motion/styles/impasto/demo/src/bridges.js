// =====================================================================
//  ERAS, CAMERAS, BRIDGES — impasto demo (read by kit/morph.js). No camera moves: it is a painting on a canvas.
// =====================================================================
const ERA_BG = [IMP.ultra, IMP.cerulean];
const BRIDGES = [
  // the knifed moon disc -> the sun (a disc whose rim swells into soft flames): lemon turns to chrome yellow
  { tc: 3.0, A: () => ({ P: impDiscPts(MOON.x, MOON.y, MOON.r), c: IMP.lemon }), B: () => ({ P: SUN_P, c: IMP.chrome }) },
];
