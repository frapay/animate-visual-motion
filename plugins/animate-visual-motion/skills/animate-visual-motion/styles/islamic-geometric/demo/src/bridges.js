// =====================================================================
//  ERAS, CAMERAS, BRIDGES — islamic-geometric demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#10284a', '#f1e2c2'];
// era 2: a slow push toward the dome (a few percent; the dome stays whole in frame)
function pieceCam(era, t) { return era === 1 ? push(t, 3.7, 5.9, { z: 1.035, p: [500, 820], to: [500, 820] }) : null; }
const BRIDGES = [
  // the full moon -> the turquoise dome (both round, similar size: a clean morph)
  { tc: 3.0,
    A: () => ({ P: ellipsePts(MOON.x, moonY(), MOON.r, MOON.r, 0, 72), c: IG.goldL }),
    B: () => ({ P: igDomePts(DOME.x, DOME.yb, DOME.w, DOME.h), c: IG.turq }) },
];
