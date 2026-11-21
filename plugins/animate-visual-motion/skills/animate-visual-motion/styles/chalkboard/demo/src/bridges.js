// =====================================================================
//  ERAS, CAMERAS, BRIDGES — chalkboard demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#1f3a32', '#1d3631'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 1.4, 2.0, { z: 1.08, p: [560, 760], to: [560, 760] }, 2.2, 2.4);   // lean in on the sun, back out before the morph
  return null;
}
const BRIDGES = [
  { tc: 3.0, A: () => ({ P: ellipsePts(SUN.x, SUN.y, SUN.r, SUN.r, 0, 64), c: '#f3d977' }), B: () => ({ P: ellipsePts(EARTH.x, EARTH.y, EARTH.r, EARTH.r, 0, 64), c: '#9cd0ee' }) },   // the sun -> the Earth
];
