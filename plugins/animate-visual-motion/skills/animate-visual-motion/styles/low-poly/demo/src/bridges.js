// =====================================================================
//  ERAS, CAMERAS, BRIDGES — low-poly demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [LP.dawn.bg, LP.night.bg];
function pieceCam(era, t) {
  // dawn: a slow push toward the mountain with a small pan, so the depth layers slide against each other
  if (era === 0) return push(t, 0.2, 2.9, { z: 1.07, p: [520, 1250], to: [480, 1250] });
  const z = springMove(3.0, 1.1, 1.0, { k: 22, d: 9.5 });   // night opens a touch close and settles out on a slow spring
  return camOf({ z, p: [470, 1250], to: [470, 1250] });
}
const BRIDGES = [
  // the sun (a 12-gon gem with shallow spikes) -> the moon (a 12-gon gem): both live on a far layer, so their
  // outlines are handed over in the camera's own coordinates (lpParPts)
  { tc: 3.0,
    A: () => ({ P: lpParPts(lpGemPts(SUN.x, SUN.y, SUN.r, 12, SUN.spike), D_SKY, camAt(0, TT)), c: LP.sun }),
    B: () => ({ P: lpParPts(lpGemPts(MOON.x, MOON.y, MOON.r, 12, 0), D_SKY, camAt(1, TT)), c: LP.moon }) },
];
