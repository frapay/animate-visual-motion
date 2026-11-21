// =====================================================================
//  ERAS, CAMERAS, BRIDGES — sand demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [SND.amber, SND.moon];
// sand animation is shot from a locked-off camera above the table: no camera moves
function pieceCam() { return null; }
const BRIDGES = [
  // the sun (a disc rubbed clean) -> the full moon (a disc rubbed clean): same proportions; warm cream -> cool white
  { tc: 3.0, A: () => ({ P: ellipsePts(SUN.x, SUN.y, SUN.r, SUN.r, 0, 56), c: SND.cream }), B: () => ({ P: ellipsePts(MOON.x, MOON.y, MOON.r, MOON.r, 0, 56), c: SND.moonlit }) },
];
