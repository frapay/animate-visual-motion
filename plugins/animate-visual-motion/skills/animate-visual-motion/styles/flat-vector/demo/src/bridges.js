// =====================================================================
//  ERAS, CAMERAS, BRIDGES — flat-vector demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [FV.cream, FV.navy];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.4, 2.6, { z: 1.05, p: [500, 820], to: [500, 820] });
  const z = springMove(3.0, 1.1, 1.0, { k: 22, d: 9.5 });   // era 2 opens a touch close and settles out on a slow spring
  return camOf({ z, p: [GLOBE.x, GLOBE.y], to: [GLOBE.x, GLOBE.y] });
}
const BRIDGES = [
  // the bulb's glass (pear: a circle with a neck) -> the globe (circle): similar proportions, morph cleanly
  { tc: 3.0,
    A: () => ({ P: fvBulbPts(BULB.x, BULB.y, BULB.r), c: FV.yellow }),
    B: () => ({ P: fvGlobePts(GLOBE.x, GLOBE.y, GLOBE.r), c: FV.teal }) },
];
