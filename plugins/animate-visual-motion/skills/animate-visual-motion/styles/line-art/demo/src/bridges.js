// =====================================================================
//  ERAS, CAMERAS, BRIDGES — line-art demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [LA.ground, LA.tint];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 2.4, { z: 1.03, p: [500, 1000], to: [500, 1000] });
  const z = springMove(3.0, 1.05, 1.0, { k: 24, d: 9.5 });
  return camOf({ z, p: [SUN.x, SUN.y], to: [SUN.x, SUN.y] });
}
const BRIDGES = [
  // the blob behind the cup (a soft round) -> the sun (a circle): the same proportions and the same accent, a clean morph
  { tc: 3.0, d: 0.5,
    A: () => ({ P: laBlobPts(BLOB.x, BLOB.y, BLOB.r, 'cup'), c: LA.accent }),
    B: () => ({ P: laCirclePts(SUN.x, SUN.y, SUN.r), c: LA.accent }) },
];
