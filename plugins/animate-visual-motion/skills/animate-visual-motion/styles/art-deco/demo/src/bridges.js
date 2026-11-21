// =====================================================================
//  ERAS, CAMERAS, BRIDGES — art deco demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [DEC.night, DEC.emerald];
function pieceCam(era, t) {   // a very slow push, nothing else
  if (era === 0) return push(t, 0.5, 2.9, { z: 1.035, p: [540, 880], to: [540, 880] });
  return push(t, 3.3, 6.0, { z: 1.04, p: [540, 880], to: [540, 880] });
}
const BRIDGES = [
  // the full moon (a round disc) -> the round lantern: the same proportions; champagne -> lit gold
  { tc: 3.0, A: () => ({ P: moonPts(), c: DEC.moon }), B: () => ({ P: lampPts(), c: '#f0cc74' }) },
];
