// =====================================================================
//  ERAS, CAMERAS, BRIDGES — clay demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [CL.sky, CL.butter];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.9, 2.3, { z: 1.06, p: [560, 1040], to: [540, 1010] });                                        // lean toward the seed
  return camMix(camOf({ z: 1.12, p: [CROWN.x, CROWN.y], to: [540, 700] }), CAM0, EZ.io(seg(t, 3.4, 4.6)));                     // open close on the crown, settle back to the whole tree
}
const BRIDGES = [
  // the seed (a round ball) -> the tree's crown (a round bumpy ball): similar proportions; brown -> leaf green
  { tc: 3.0, A: () => ({ P: seedPts(), c: CL.brown }), B: () => ({ P: crownPts(), c: CL.leaf }) },
];
