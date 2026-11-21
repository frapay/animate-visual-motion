// =====================================================================
//  ERAS, CAMERAS, BRIDGES — vintage map demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#dcc590', '#cfc79b'];
function pieceCam(era, t) {
  // the magnifier: it starts on the coast being inked, follows the route, and is back on the whole sheet for the bridge
  if (era === 0) return vmpPan(t, [[0, 1.12, 470, 780], [0.7, 1.12, 470, 780], [1.6, 1.16, 565, 960], [2.3, 1, 540, 960]]);
  // opens close on the round city, settles on the whole sheet, then leans toward the arrival
  return vmpPan(t, [[3.0, 1.14, CITY.x, CITY.y], [3.5, 1.14, CITY.x, CITY.y], [4.5, 1, 540, 960], [4.8, 1, 540, 960], [5.6, 1.06, 520, 980]]);
}
const BRIDGES = [
  // the round oasis pool -> the round walled city: two discs; sea blue-grey -> rose
  { tc: 3.0, A: () => ({ P: ellipsePts(LAKE.x, LAKE.y, LAKE.r, LAKE.r, 0, 72), c: VMP.sea }), B: () => ({ P: ellipsePts(CITY.x, CITY.y, CITY.r, CITY.r, 0, 72), c: VMP.rose }) },
];
