// =====================================================================
//  ERAS, CAMERAS, BRIDGES — packshot demo (read by kit/morph.js). Two slow pushes toward the product; no cuts.
//  Colours given to the renderer are 6-digit hex: the wall for ERA_BG, the product's body colour for the bridge shapes.
// =====================================================================
const ERA_BG = [PK.scene.sky.wall, PK.scene.peach.wall];
function pieceCam(era, t) {
  return era === 0 ? push(t, 0.0, 3.0, { z: 1.05, p: [500, 960], to: [500, 960] })
                   : push(t, 3.0, 6.0, { z: 1.045, p: [520, 980], to: [520, 980] });
}
const BRIDGES = [
  // the bottle -> the jar: the product itself changes shape (and colour) in the sun while a glint crosses it
  { tc: 3.0, d: 0.5, A: () => ({ P: pkProductPts('bottle', BOT.x, BOT.y, BOT.s), c: BOT_C }), B: () => ({ P: pkProductPts('jar', JAR.x, JAR.y, JAR.s), c: JAR_C }) },
];
