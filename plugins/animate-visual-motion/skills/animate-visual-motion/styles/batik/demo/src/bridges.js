// =====================================================================
//  ERAS, CAMERAS, BRIDGES — batik demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [BT.sogan, BT.indigo];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.3, 2.4, { z: 1.04, p: [540, 800], to: [540, 800] });
  const z = springMove(3.0, 1.07, 1.0, { k: 22, d: 9.5 });
  return camOf({ z, p: [CLD.x, CLD.y], to: [CLD.x, CLD.y] });
}
const BRIDGES = [
  // the wax-filled kawung flower (four lobes, round) -> a mega mendung cloud (scalloped, a little wider): cream -> pale blue
  { tc: 3.0,
    A: () => ({ P: btKawungPts(KAW.x, KAW.y, KAW.r), c: BT.cream }),
    B: () => ({ P: btCloudPts(CLD.x, CLD.y, CLD.w, CLD.h, 'megaB'), c: BT_BLUES[0] }) },
];
