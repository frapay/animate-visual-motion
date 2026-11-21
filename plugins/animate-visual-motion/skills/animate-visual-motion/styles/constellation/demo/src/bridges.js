// =====================================================================
//  ERAS, CAMERAS, BRIDGES — constellation demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [CST.night2, CST.night2];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.3, 2.5, { z: 1.05, p: [520, 900], to: [540, 920] });                                           // a slow push toward the boat
  return camMix(camOf({ z: 1.12, p: [PLANET.x, PLANET.y], to: [540, 960] }), CAM0, EZ.io(seg(t, 3.3, 4.6)));                    // open close on the planet, settle back to the whole chart
}
const BRIDGES = [
  // the full moon (a round disc) -> the planet's disc: same proportions; moon white -> planet teal
  { tc: 3.0, d: 0.5, A: () => ({ P: moonPts(), c: CST.moon }), B: () => ({ P: planetPts(), c: CST.planet }) },
];
