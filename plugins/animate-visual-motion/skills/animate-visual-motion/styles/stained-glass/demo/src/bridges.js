// =====================================================================
//  ERAS, CAMERAS, BRIDGES — stained glass demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#1b2a78', '#e9a53a'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.6, 2.4, { z: 1.04, p: [500, 1000], to: [500, 1000] });                              // lean in a little
  return camMix(camOf({ z: 1.1, p: [500, 1000], to: [500, 1000] }), CAM0, EZ.io(seg(t, 3.4, 4.6)));   // open a little close, settle back to the whole window
}
const BRIDGES = [
  // the moon medallion (a round of cobalt glass) -> the sun rosette (a round of amber glass): same size, same place
  { tc: 3.0, A: () => ({ P: sglCirclePts(MOON.x, MOON.y, MOON.r, 64), c: SGL.cobalt }), B: () => ({ P: sglCirclePts(SUN.x, SUN.y, SUN.r, 64), c: SGL.amber }) },
];
