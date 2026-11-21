// =====================================================================
//  ERAS, CAMERAS, BRIDGES — storybook demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#8f8fd0', '#bfe3ef'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 1.6, 2.4, { z: 1.12, p: [620, 520], to: [600, 570] });                  // lean toward the moon
  return camMix(camOf({ z: 1.1, p: [540, 520], to: [540, 540] }), CAM0, EZ.io(seg(t, 3.5, 5.0)));     // then settle back to the whole hill
}
const BRIDGES = [
  { tc: 3.0, A: () => ({ P: sbCircle(DM_MOON.x, DM_MOON.y, DM_MOON.r, 64), c: SB.moon }), B: () => ({ P: sbCircle(DM_SUN.x, DM_SUN.y, DM_SUN.r, 64), c: SB.sun }) },   // the moon -> the sun
];
