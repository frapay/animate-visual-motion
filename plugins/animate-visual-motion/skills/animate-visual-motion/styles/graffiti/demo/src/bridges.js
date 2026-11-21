// =====================================================================
//  ERAS, CAMERAS, BRIDGES — graffiti demo (read by kit/morph.js). No camera moves: the wall holds still.
// =====================================================================
const ERA_BG = [GRF.brick, GRF.concrete];
const BRIDGES = [
  // the yellow blob on brick -> the pink blob on concrete: both round, similar size, the same drips ('bridge')
  { tc: 3.0, A: () => ({ P: blobA(), c: GRF.yellow }), B: () => ({ P: blobB(), c: GRF.pink }) },
];
