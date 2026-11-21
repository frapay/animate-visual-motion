// =====================================================================
//  ERAS, CAMERAS, BRIDGES — liquid demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [LQ.paper, LQ.deep];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.9, 2.5, { z: 1.04, p: [IDE.x, IDE.y], to: [IDE.x, IDE.y] });
  const z = springMove(3.0, 1.1, 1.0, { k: 22, d: 9.5 });
  return camOf({ z, p: [HEART.x, HEART.y], to: [HEART.x, HEART.y] });
}
const BRIDGES = [
  // the blob of ideas (round) -> the heart (rounded, same size): similar proportions; coral -> pink stays vivid
  { tc: 3.0,
    A: () => ({ P: idePts(), c: LQ.g.coral[0] }),
    B: () => ({ P: heartPts(), c: LQ.g.heart[0] }) },
];
lqBridgePair(3.0, LQ.g.coral, LQ.g.heart);
