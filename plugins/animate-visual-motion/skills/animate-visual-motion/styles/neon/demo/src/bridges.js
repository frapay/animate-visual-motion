// =====================================================================
//  ERAS, CAMERAS, BRIDGES — neon demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [NEO.ground, NEO.groundT];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.3, 2.5, { z: 1.04, p: [HEART.x, HEART.y], to: [HEART.x, HEART.y] });
  const z = springMove(3.0, 1.1, 1.0, { k: 22, d: 9.5 });
  return camOf({ z, p: [REC.x, REC.y], to: [REC.x, REC.y] });
}
const BRIDGES = [
  // the sign's heart (round-ish) -> the record (a circle): similar proportions, morph cleanly; magenta -> violet stays vivid
  { tc: 3.0,
    A: () => ({ P: neoHeartPts(HEART.x, HEART.y, HEART.r), c: NEO.mag }),
    B: () => ({ P: neoCirclePts(REC.x, REC.y, REC.r, 96), c: NEO.violet }) },
];
