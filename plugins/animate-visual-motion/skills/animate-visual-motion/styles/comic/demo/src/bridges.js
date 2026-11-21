// =====================================================================
//  ERAS, CAMERAS, BRIDGES — comic demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [CM.blueL, CM.blue];
function pieceCam(era, t) {
  if (era === 0) {   // a punch-in on the starburst when it pops, settling back fast
    if (t < cu.ting) return null;
    return camOf({ z: 1 + 0.07 * Math.exp(-(t - cu.ting) * 7), p: [BURST.x, BURST.y], to: [BURST.x, BURST.y] });
  }
  const z = springMove(3.0, 1.14, 1.0, { k: 60, d: 12 });
  return camOf({ z, p: [SUN.x, SUN.y], to: [SUN.x, SUN.y] });
}
const BRIDGES = [
  // the jagged starburst -> the round sun disc: similar proportions, both yellow, so the morph stays clean and vivid
  { tc: 3.0,
    A: () => ({ P: burstPts(), c: CM.yellow }),
    B: () => ({ P: cmCirclePts(SUN.x, SUN.y, SUN.r, 96), c: CM.yellow }) },
];
