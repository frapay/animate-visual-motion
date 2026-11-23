// =====================================================================
//  ERAS, CAMERAS, BRIDGES — flow-diagram demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [FD.bg, FD.bg];
// the camera follows the active node down the flow: a small zoom, the active node pulled a little toward the middle
function pieceCam(era, t) {
  if (era === 0) {
    // close on the first node, then pulling back and down as the flow grows
    const K = [0, cu.go1 + 0.2, cu.go2 + 0.2], sp = { k: 60, d: 14 };
    const ya = springTrack([[K[0], L1.by.pesan.y], [K[1], L1.by.bayar.y], [K[2], L1.by.lunas.y]], sp);
    const to = springTrack([[K[0], 625], [K[1], 866], [K[2], L1.by.lunas.y]], sp), z = springTrack([[K[0], 1.1], [K[1], 1.05], [K[2], 1.0]], sp);
    return camOf({ z, p: [500, ya], to: [500, to] });
  }
  // after the morph the branch opens a little close and settles; it fills the safe width, so the camera then holds
  const z = springMove(3.0, 1.07, 1.0, { k: 30, d: 11 });
  return camOf({ z, p: [500, 860], to: [500, 860] });
}
const BRIDGES = [
  // the decision diamond -> a circle (a lens over the same decision in the next era): similar proportions, different
  // silhouettes. Both in the signal colour, so the blob (the packet, with its eyes) stays one flat colour.
  { tc: 3.0, d: 0.5, m: 0.2,
    A: () => ({ P: fdShapePts(L1.by.lunas), c: FD.signal }),
    B: () => ({ P: fdCirclePts(LENS.x, LENS.y, LENS.r), c: FD.signal }) },
];
