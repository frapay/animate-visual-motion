// =====================================================================
//  ERAS, CAMERAS, BRIDGES — art nouveau demo (read by kit/morph.js). No camera moves: it is a printed poster.
// =====================================================================
const ERA_BG = ['#e3e0c2', '#d3ddca'];
const BRIDGES = [
  // halo disc -> halo disc: the rose halo (emptied of its rings, the lily folded away) becomes the gold one
  { tc: 3.0, A: () => ({ P: ellipsePts(HALO1.x, HALO1.y, HALO1.r, HALO1.r, 0, 96), c: NOU.rose }), B: () => ({ P: ellipsePts(HALO2.x, HALO2.y, HALO2.r, HALO2.r, 0, 96), c: NOU.ochre }) },
];
