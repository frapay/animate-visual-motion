// =====================================================================
//  ERAS, CAMERAS, BRIDGES — study-notes demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [SN.paper, SN.paper];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 2.4, { z: 1.03, p: [540, 820], to: [540, 820] });      // a slow push while the notes are written
  const z = springMove(3.0, 1.06, 1.0, { k: 30, d: 11 });                                   // era 2 opens a little close and settles
  return camOf({ z, p: [STICKY.x + STICKY.w / 2, STICKY.y + STICKY.h / 2], to: [STICKY.x + STICKY.w / 2, STICKY.y + STICKY.h / 2] });
}
const BRIDGES = [
  // the bulb's glow (a round highlighter blob) -> the sticky note (squarish): similar proportions, different
  // silhouettes, both yellows, so the blob stays one clean colour while its corners grow out.
  { tc: 3.0, d: 0.5, m: 0.2,
    A: () => ({ P: ellipsePts(BULB.x, BULB.y - 20, BULB.R, BULB.R, 0, 72), c: SN.yellow }),
    B: () => ({ P: snStickyPts(STICKY.x, STICKY.y, STICKY.w, STICKY.h, STICKY.rot), c: SN.sticky }) },
];
