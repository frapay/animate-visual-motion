// =====================================================================
//  ERAS, CAMERAS, BRIDGES — retro-80s demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#ff4f9e', '#ffd2b0'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.6, 2.3, { z: 1.05, p: [SUN.x, 860], to: [540, 860] });                                       // a slow push toward the sun
  return camMix(camOf({ z: 1.1, p: [REC.x, REC.y], to: [REC.x, REC.y] }), CAM0, EZ.io(seg(t, 3.3, 4.3)));                      // open close on the record, settle back
}
const BRIDGES = [
  // the sun (a disc) -> the record (a disc): the same proportions; orange -> hot pink
  { tc: 3.0, A: () => ({ P: sunPts(), c: R80.orange }), B: () => ({ P: recPts(), c: R80.pink }) },
];
