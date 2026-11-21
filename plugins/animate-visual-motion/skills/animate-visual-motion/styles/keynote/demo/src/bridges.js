// =====================================================================
//  ERAS, CAMERAS, BRIDGES — keynote demo (read by kit/morph.js). Two slow pushes, eased in and out; no cuts.
//  Colours given to the renderer are 6-digit hex: the stage for ERA_BG, the finish's base colour for the bridge shapes.
// =====================================================================
const ERA_BG = ['#08080b', '#08080b'];
STYLE.heroColor = KEY.fin[KEY_FINISH].base;                  // the hero wears the piece's finish
function pieceCam(era, t) {
  return era === 0 ? push(t, 0.0, 3.0, { z: 1.06, p: [CASE.x, CASE.y], to: [CASE.x, CASE.y] })
                   : push(t, 3.0, 6.0, { z: 1.035, p: [520, 860], to: [520, 860] });
}
const BRIDGES = [
  // the case -> the puck inside it: similar height and width, the same finish; the lit body changes shape as a glint crosses it
  { tc: 3.0, d: 0.5, A: () => ({ P: keyCasePts(CASE.x, CASE.y, CASE.w, CASE.h), c: KEY.fin[KEY_FINISH].base }), B: () => ({ P: keyPuckPts(PUCK.x, PUCK.y, PUCK.r), c: KEY.fin[KEY_FINISH].base }) },
];
