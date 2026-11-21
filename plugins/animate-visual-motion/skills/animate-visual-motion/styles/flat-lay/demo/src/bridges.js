// =====================================================================
//  ERAS, CAMERAS, BRIDGES — flat-lay demo (read by kit/morph.js). The camera hangs over the table: one slow push
//  per era, no cuts.
// =====================================================================
const ERA_BG = [FL.oak, FL.linen];
function pieceCam(era, t) {
  return era === 0 ? push(t, 0.0, 3.0, { z: 1.045, p: [CUP.x, CUP.y], to: [CUP.x, CUP.y] })
                   : push(t, 3.0, 6.0, { z: 1.04, p: [TIN.x, TIN.y], to: [TIN.x, TIN.y] });
}
const BRIDGES = [
  // the cup of coffee -> the round tin: two discs seen from above
  { tc: 3.0, d: 0.5, A: () => ({ P: flCirclePts(CUP.x, CUP.y, CUP.r), c: FL.white }), B: () => ({ P: flCirclePts(TIN.x, TIN.y, TIN.r), c: FL.terra }) },
];
