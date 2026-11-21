// =====================================================================
//  ERAS, CAMERAS, BRIDGES — glass demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#241a66', '#123a5c'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 2.4, { z: 1.035, p: [500, 760], to: [500, 760] });
  const z = springMove(3.0, 1.09, 1.0, { k: 22, d: 9.5 });
  return camOf({ z, p: [500, 520], to: [500, 520] });
}
const BRIDGES = [
  // the savings ring (a circle) -> the success badge card (a rounded square): similar proportions; blue -> mint stays vivid.
  // Both shapes follow their floating cards (glCardPose), so the window closes exactly on the ring.
  { tc: 3.0,
    A: () => { const p = glCardPose(RINGC.x, RINGC.y, RINGC.w, RINGC.h, RINGC.o), [x, y] = p.map(RING.x, RING.y); return { P: glCirclePts(x, y, RING.r + 10), c: GL.blue }; },
    B: () => { const p = glCardPose(BADGE.x, BADGE.y, BADGE.w, BADGE.h, BADGE.o); return { P: glRRectPts(BADGE.x, BADGE.y, BADGE.w, BADGE.h, BADGE.o.r).map(([x, y]) => p.map(x, y)), c: GL.mint }; } },
];
