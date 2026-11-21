// =====================================================================
//  ERAS, CAMERAS, BRIDGES — thermal demo (read by kit/morph.js). No camera moves: a handheld camera, held still.
//  Colours given to the renderer are temperatures: thmC(t) is the grey for t, and the kit reads the blend back.
// =====================================================================
const ERA_BG = [thmC(K.wall), thmC(HL.wall)];
const BRIDGES = [
  // the hot mug -> the warm cat: similar height and width; the blob cools from tea to fur as it changes shape
  { tc: 3.0, d: 0.5, A: () => ({ P: thmMugPts(MUG.x, MUG.y, MUG.w, MUG.h), c: thmC(0.8) }), B: () => ({ P: thmCatPts(CAT.x, CAT.y, CAT.r), c: thmC(0.64) }) },
];
