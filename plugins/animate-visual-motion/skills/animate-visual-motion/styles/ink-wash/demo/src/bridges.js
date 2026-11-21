// =====================================================================
//  ERAS, CAMERAS, BRIDGES — ink wash demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [INW.paper, INW.paper];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.6, 2.3, { z: 1.05, p: [430, 900], to: [450, 890] });                                       // drift toward the mountains
  return camMix(camOf({ z: 1.1, p: [POND.x, POND.y], to: [540, 900] }), CAM0, EZ.io(seg(t, 3.3, 4.4)));                      // open close on the pond, settle back
}
const BRIDGES = [
  // the moon (a round pale wash) -> the pond (a round light wash): the same proportions; pale -> light ink
  { tc: 3.0, A: () => ({ P: moonPts(), c: INW.pale }), B: () => ({ P: pondPts(), c: INW.light }) },
];
