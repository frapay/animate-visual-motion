// =====================================================================
//  ERAS, CAMERAS, BRIDGES — blueprint demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [BP.paper, BP.paper2];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.3, 2.5, { z: 1.04, p: [GEAR.x, GEAR.y], to: [GEAR.x, GEAR.y] });
  const z = springMove(3.0, 1.08, 1.0, { k: 26, d: 10 });
  return camOf({ z, p: [BULB.x, BULB.y + 80], to: [BULB.x, BULB.y + 80] });
}
const BRIDGES = [
  // the gear (round, 430 across) -> the bulb (400 wide, 556 tall): similar proportions, morph cleanly; white line -> white line
  { tc: 3.0, d: 0.5,
    A: () => ({ P: bpGearPts(GEAR.x, GEAR.y, GEAR.rt, GEAR.rr, GEAR.n, gearRot()), c: BP.line }),
    B: () => ({ P: bpBulbPts(BULB.x, BULB.y, BULB.r), c: BP.line }) },
];
