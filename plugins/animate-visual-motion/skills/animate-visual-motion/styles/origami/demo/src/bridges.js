// =====================================================================
//  ERAS, CAMERAS, BRIDGES — origami demo (read by kit/morph.js). No camera moves: the table is photographed from a
//  fixed stand.
// =====================================================================
const ERA_BG = [ORI.blue, ORI.kraft];
const BRIDGES = [
  // the finished boat -> the flat square the crane is folded from: both about as wide as tall
  { tc: 3.0, A: () => { const s = boatState(); return { P: oriBoatPts(s.x, s.y, BOAT.a, s.rot), c: ORI.indigo }; }, B: () => ({ P: oriSheetPts(CRANE.x, CRANE.y, CRANE.r), c: ORI.verm }) },
];
