// =====================================================================
//  ERAS, CAMERAS, BRIDGES — infographic demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [IG.ground, IG.ground];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 2.4, { z: 1.03, p: [500, 820], to: [500, 820] });
  const z = springMove(3.0, 1.06, 1.0, { k: 30, d: 11 });
  return camOf({ z, p: [500, 740], to: [500, 740] });
}
const BRIDGES = [
  // the donut, closed into a solid teal disc -> the columns' card (a rounded rectangle): similar proportions,
  // different silhouettes. Teal -> white stays a clean flat tint on the way.
  { tc: 3.0, d: 0.5, m: 0.2,
    A: () => ({ P: igCirclePts(DONUT.x, DONUT.y, DONUT.r + DONUT.w / 2), c: IG.teal }),
    B: () => ({ P: igCardPts(CARD2.x, CARD2.y, CARD2.w, CARD2.h), c: '#ffffff' }) },
];
