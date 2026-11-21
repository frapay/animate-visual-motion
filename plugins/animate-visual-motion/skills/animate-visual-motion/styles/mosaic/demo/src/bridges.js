// =====================================================================
//  ERAS, CAMERAS, BRIDGES — mosaic demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [MOS.teal, MOS.sand];
function pieceCam() { return null; }          // a wall does not move: the tiles stay crisp, the laying is the motion
const BRIDGES = [
  // the pearl (a round marble medallion) -> the sun (a round gold medallion): same proportions; marble -> gold
  { tc: 3.0, A: () => ({ P: pearlPts(), c: MOS.marble }), B: () => ({ P: sunPts(), c: MOS.gold }) },
];
