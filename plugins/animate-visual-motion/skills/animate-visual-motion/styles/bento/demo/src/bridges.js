// =====================================================================
//  ERAS, CAMERAS, BRIDGES — bento demo (read by kit/morph.js). No camera moves: a board is read flat.
// =====================================================================
const ERA_BG = [BENTO.dark.ground, BENTO.light.ground];
const BRIDGES = [
  // the hero tile (2 x 2) -> the tinted headline tile (3 x 2): both rounded tiles in the accent, so only the proportions change
  { tc: 3.0, d: 0.5, A: () => ({ P: bentoPts(G.cell(...L1.hero)), c: BENTO.accent }), B: () => ({ P: bentoPts(G.cell(...A2.life)), c: BENTO.accent }) },
];
