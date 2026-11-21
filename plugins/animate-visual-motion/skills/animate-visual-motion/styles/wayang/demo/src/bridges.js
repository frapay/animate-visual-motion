// =====================================================================
//  ERAS, CAMERAS, BRIDGES — wayang demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [WY.amber, WY.dusk];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.3, 2.7, { z: 1.035, p: [540, WY_STAGE], to: [540, WY_STAGE] });
  const z = springMove(3.0, 1.06, 1.0, { k: 22, d: 9.5 });
  return camOf({ z, p: [540, WY_STAGE], to: [540, WY_STAGE] });
}
const BRIDGES = [
  // the gunungan (a tall pointed leaf) -> the mountain (a broad peak): both pointed tops on a flat base
  { tc: 3.0,
    A: () => ({ P: wyGununganPts(GUN.x2, WY_STAGE, GUN.h), c: WY.ink }),
    B: () => ({ P: wyMountainPts(MTN.x, WY_STAGE, MTN.w, MTN.h, 'main'), c: WY.far }) },
];
