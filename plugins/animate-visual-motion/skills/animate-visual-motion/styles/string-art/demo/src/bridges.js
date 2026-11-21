// =====================================================================
//  ERAS, CAMERAS, BRIDGES — string-art demo (read by kit/morph.js). No camera moves: the board hangs on a wall.
// =====================================================================
const ERA_BG = [STR_TONE.walnut[0], STR_TONE.ebony[0]];
STR.tones = ['walnut', 'ebony'];
const BRIDGES = [
  // the sun's ring of nails -> the balloon's ring: round into round, mustard thread into turquoise, re-strung from step 13 to 17
  { tc: 3.0, A: () => ({ P: ellipsePts(SUN.x, SUN.y, SUN.r, SUN.r, 0, 72), c: STR.mustard }), B: () => ({ P: P_BAL, c: STR.teal }) },
];
