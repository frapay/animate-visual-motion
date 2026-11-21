// =====================================================================
//  ERAS, CAMERAS, BRIDGES — stitch demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [STC.linen, STC.denim];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.25, 2.25, { z: 1.05, p: [HRT.x, HRT.y], to: [HRT.x, HRT.y] });
  const z = springMove(3.0, 1.06, 1.0, { k: 22, d: 9.5 });
  return camOf({ z, p: [HOUSE.x, HOUSE.y], to: [HOUSE.x, HOUSE.y] });
}
const BRIDGES = [
  // the sewn felt heart -> the felt house (both about as wide as tall), brick red the whole way
  { tc: 3.0,
    A: () => ({ P: stcHeartPts(HRT.x, HRT.y, HRT.r), c: STC.brick }),
    B: () => ({ P: stcHousePts(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h), c: STC.brick }) },
];
