// =====================================================================
//  ERAS, CAMERAS, BRIDGES — pointillism demo (read by kit/morph.js). No camera moves: it is a painting on a wall.
// =====================================================================
const ERA_BG = [PT.cobalt, PT.violet];
function pieceCam() { return null; }
const BRIDGES = [
  // the sun's disc -> the moon's disc: the same round shape, cadmium yellow -> a pale lemon
  { tc: 3.0, A: () => ({ P: ptDiscPts(SUN.x, SUN.y, SUN.r), c: PT.yellow }), B: () => ({ P: ptDiscPts(MOON.x, MOON.y, MOON.r), c: '#f6eaa2' }) },
];
