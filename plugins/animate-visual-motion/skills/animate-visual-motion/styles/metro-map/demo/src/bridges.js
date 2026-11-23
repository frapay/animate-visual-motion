// =====================================================================
//  ERAS, CAMERAS, BRIDGES — metro-map demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [MM.ground, MM.ground];
function pieceCam(era, t) {
  // era 1: the camera glides with the train, looking a little ahead; half of the sideways jogs are followed
  if (era === 0) return mmFollow(RIDE, rideNow().frac, 1.15, { to: [CX, 1000], xk: 0.5, x0: 450 });
  // era 2: the whole map, a very slow push towards the terminus
  const u = EZ.io(seg(t, 3.4, 6.0));
  return camOf({ z: lerp(1, 1.04, u), p: [500, 900], to: [500, 900] });
}
const BRIDGES = [
  // the swollen station under the train (a disc) -> the interchange (a capsule): similar proportions, different
  // silhouettes. Both white, so the blob is one flat station-white shape inside its double ring.
  { tc: 3.0, d: 0.5, m: 0.2,
    A: () => ({ P: mmDiscPts(HALO.x, HALO.y, HALO.r), c: MM.white }),
    B: () => ({ P: mmCapsulePts(XCH.x, XCH.y, XCH.w, XCH.h), c: MM.white }) },
];
