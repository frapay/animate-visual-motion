// =====================================================================
//  ERAS, CAMERAS, BRIDGES — aurora demo (read by kit/morph.js). A slow push on each orb, nothing else.
// =====================================================================
const ERA_BG = [AUR.presets.dusk.ground, AUR.presets.mint.ground];
function pieceCam(era, t) {
  return era === 0 ? camOf({ z: 1 + 0.06 * seg(t, 0, 3.5), p: [ORB_A.x, ORB_A.y], to: [ORB_A.x, ORB_A.y] })
                   : camOf({ z: 1 + 0.06 * seg(t, 2.5, 6), p: [ORB_B.x, ORB_B.y], to: [ORB_B.x, ORB_B.y] });
}
const BRIDGES = [
  // the warm orb -> the mint orb: the same size, so the outline only travels; the colour turns from orange to mint
  { tc: 3.0, d: 0.5, A: () => ({ P: aurOrbPts(...orbA(), ORB_A.r), c: ORB_A.c }), B: () => ({ P: aurOrbPts(...orbB(), ORB_B.r), c: ORB_B.c }) },
];
