// =====================================================================
//  ERAS, CAMERAS, BRIDGES — watercolor demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#b9c3d6', '#bfdcee'];                                   // a rain-grey sheet, a clear-sky sheet
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.9, 2.3, { z: 1.05, p: [PUD.x, PUD.y], to: [556, 1112] });                                 // lean toward the puddle
  return camMix(camOf({ z: 1.1, p: [LAKE.x, LAKE.y], to: [540, 1120] }), CAM0, EZ.io(seg(t, 3.4, 4.6)));                 // open close on the lake, settle back
}
const BRIDGES = [
  // the puddle (a wide oval wash) -> the lake (a wider oval wash): the same proportions; grey-blue -> clear blue
  { tc: 3.0, A: () => ({ P: puddlePts(), c: WCL.water }), B: () => ({ P: lakePts(), c: WCL.lake }) },
];
