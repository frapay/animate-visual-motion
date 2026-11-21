// =====================================================================
//  ERAS, CAMERAS, BRIDGES — kinetic-type demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [KT.paper, KT.ink];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 2.6, { z: 1.03, p: [500, 800], to: [500, 800] });
  const z = springMove(3.0, 1.08, 1.0, { k: 30, d: 11 });
  return camOf({ z, p: [RING.x, RING.y], to: [RING.x, RING.y] });
}
const BRIDGES = [
  // the grown dot (a circle) -> the stat tile (a square, the Swiss block that frames the ring): similar proportions,
  // different silhouettes, so the corners visibly grow out of the dot. Both accent: the blob stays one flat colour
  // (accent -> ink would pass through a muddy brown) and the square then opens onto the ink era like a flat iris.
  { tc: 3.0, d: 0.5, m: 0.2,
    A: () => ({ P: ktCirclePts(DOT_BIG.x, DOT_BIG.y, DOT_BIG.r), c: KT.accent }),
    B: () => ({ P: ktBoxPts(TILE.x, TILE.y, TILE.s), c: KT.accent }) },
];
