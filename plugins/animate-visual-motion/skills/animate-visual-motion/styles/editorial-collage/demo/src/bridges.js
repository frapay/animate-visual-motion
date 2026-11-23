// =====================================================================
//  ERAS, CAMERAS, BRIDGES — editorial-collage demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [EC.desk, EC.desk];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 2.4, { z: 1.04, p: [500, 880], to: [500, 880] });   // a slow push on the question
  const z = springMove(3.0, 1.07, 1.02, { k: 30, d: 11 });                                // opens close, settles, then drifts across the desk
  return camOf({ z, p: [512 - 9 * (t - 3), 880], to: [500, 880] });
}
const BRIDGES = [
  // a torn round scrap -> a torn squarish clipping: similar proportions, different silhouettes, both warm paper
  { tc: 3.0, d: 0.5,
    A: () => ({ P: ecRoundPts(ASK.x, ASK.y, ASK.r), c: EC.kraft }),
    B: () => ({ P: ecBoxPts(CK.x, CK.y, CK.w, CK.h, CK.rot), c: EC.news }) },
];
