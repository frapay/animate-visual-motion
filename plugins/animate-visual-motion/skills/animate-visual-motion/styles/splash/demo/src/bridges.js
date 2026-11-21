// =====================================================================
//  ERAS, CAMERAS, BRIDGES — splash demo (read by kit/morph.js). Two slow pushes toward the product; no cuts.
//  Colours given to the renderer are 6-digit hex: each flavour's base for ERA_BG and for the bridge shapes.
// =====================================================================
const ERA_BG = [SPL.fl[F1].base, SPL.fl[F2].base];
function pieceCam(era, t) {
  return era === 0 ? push(t, 0.0, 3.0, { z: 1.05, p: [CAN.x, CAN.y], to: [CAN.x, CAN.y] })
                   : push(t, 3.0, 6.0, { z: 1.05, p: [BOT.x, BOT.y], to: [BOT.x, BOT.y] });
}
const BRIDGES = [
  // the can -> the bottle: both tall packs of similar height; the wet, lit body changes shape and colour as a glint crosses it
  { tc: 3.0, d: 0.5, A: () => ({ P: spProductPts('can', CAN.x, CAN.y, CAN.s, CAN.rot), c: SPL.fl[F1].base }), B: () => ({ P: spProductPts('bottle', BOT.x, BOT.y, BOT.s, BOT.rot), c: SPL.fl[F2].base }) },
];
