// =====================================================================
//  SCENES — origami demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1300 (the
//  caption strip owns y 1350-1450). Each era is one model on an empty table, folded in front of you.
// =====================================================================
const cu = TIMELINE.cues;
const BOAT = { x: 500, y: 760, a: 250 };                     // the sheet's centre and half side
const CRANE = { x: 500, y: 820, r: 351 };                    // the sheet's centre and the crane's half wingspan
// a fold arrow with its step number: drawn on just before the fold at t, gone once the fold is under way
function step(n, t, a, b, bend, at) {
  const al = seg(TT, t - 0.32, t - 0.22) * (1 - seg(TT, t + 0.08, t + 0.28)); if (al <= 0) return;
  oriArrow(a, b, { bend, frac: seg(TT, t - 0.32, t - 0.06), al: al * 0.8 });
  if (n) oriText(String(n), at[0], at[1], 34, ORI.ink, { align: 'center', al: al * 0.8 });
}

// ---- era 1: a square, three folds, a boat
function boatState() {
  const t = Math.max(0, TT - cu.float), on = springEase(TT - cu.float, 120, 17);
  return {
    st: oriSteps([cu.f1, cu.f2, cu.f3], 0.4),
    x: BOAT.x + 16 * t, y: BOAT.y - 900 * (1 - EZ.o3(seg(TT, 0, cu.land))),          // it slides in flat, then drifts
    rot: 0.045 * Math.sin(t * 3.4) * clamp(t / 0.3), lift: 0.12 + 0.68 * on + 0.5 * (1 - seg(TT, 0, cu.land)),
  };
}
function sceneBoat() {
  oriTable(ORI.blue);
  // the crease pattern printed on the table, its dashes creeping (background life)
  oriPattern(BOAT.x, BOAT.y, 310, { lines: 'boat', al: 0.26, march: 14, in: seg(TT, 0, 0.7) });
  // a far little boat drifting across the top (background life)
  oriBoat(630 + 50 * TT, 356, 54, { c: ORI.mustard, rot: 0.08 * Math.sin(TT * 2.6), lift: 0.5 });
  // two pleated paper waves: squeezed shut until the boat is done, then they spring open and keep breathing (background life)
  const wv = oriGo(cu.float, 0.5);
  oriPleat(470, 1108, 12, { len: 46, h: 26, ang: lerp(1.32, 0.5, wv) + 0.07 * Math.sin(TT * 3.1) });
  oriPleat(590, 1184, 9, { len: 46, h: 26, ang: lerp(1.32, 0.56, wv) + 0.07 * Math.sin(TT * 3.1 + 2) });
  const s = boatState();
  oriBoat(s.x, s.y, BOAT.a, { step: s.st, rot: s.rot, lift: s.lift });
  // the instructions: one arrow and its number before each fold
  step(1, cu.f1, [812, 580], [812, 930], -0.22, [782, 700]);
  step(2, cu.f2, [212, 1040], [338, 902], -0.3, [172, 1004]);
  step(0, cu.f2, [788, 1040], [662, 902], 0.3);
  step(3, cu.f3, [800, 900], [690, 590], 0.25, [846, 768]);
  oriTag('boat', { c: ORI.indigo });
  oriCaption('One square, *three folds*', { c: ORI.indigo, at: 0.6 });
}

// ---- era 2: fold again, a crane
function craneState() {
  const t = Math.max(0, TT - cu.head), beat = (t0) => Math.sin(Math.PI * seg(TT, t0, t0 + 0.34));
  return {
    st: oriGo(cu.c1, 0.33) + oriGo(cu.c2, 0.33) + oriGo(cu.open, 0.4) + oriGo(cu.head, 0.3),
    rot: 0.032 * Math.sin(t * 3.1) * clamp(t / 0.4),
    flap: clamp(0.22 + 0.22 * Math.sin(TT * 5.2) + 0.75 * Math.max(beat(cu.flap1), beat(cu.flap2))),
    flap2: clamp(0.3 + 0.3 * Math.sin(TT * 5.2 + 1.4) + 0.6 * Math.max(beat(cu.flap1 + 0.06), beat(cu.flap2 + 0.06))),
  };
}
function sceneCrane() {
  oriTable(ORI.kraft);
  // the bird-base crease pattern under the sheet, its dashes creeping (background life)
  oriPattern(CRANE.x, CRANE.y, 296, { lines: 'bird', rot: Math.PI / 4, al: 0.24, march: 14 });
  // a butterfly on the table, flapping (background life)
  oriButterfly(800 + 10 * Math.sin(TT * 1.3), 374 + 8 * Math.cos(TT * 1.7), 62, { rot: 0.32 + 0.06 * Math.sin(TT * 1.3), flap: 0.5 + 0.5 * Math.sin(TT * 9) });
  // stars whose points fold out one after another, then they turn a little (background life)
  oriStar(176, 1092, 54, { in: seg(TT, cu.star1, cu.star1 + 0.6), rot: -0.2 + 0.12 * Math.sin(TT * 1.9) });
  oriStar(818, 1150, 40, { in: seg(TT, cu.star2, cu.star2 + 0.6), rot: 0.3 + 0.12 * Math.sin(TT * 1.9 + 2) });
  oriStar(236, 470, 30, { in: seg(TT, cu.star2 + 0.25, cu.star2 + 0.85), rot: 0.1 + 0.12 * Math.sin(TT * 1.9 + 4) });
  const s = craneState();
  oriCrane(CRANE.x, CRANE.y, CRANE.r, { step: s.st, rot: s.rot, flap: s.flap, flap2: s.flap2 });
  step(1, cu.c1, [600, 560], [600, 1040], -0.2, [556, 760]);
  step(2, cu.c2, [196, 792], [452, 772], -0.3, [330, 716]);
  step(0, cu.c2, [804, 792], [548, 772], 0.3);
  oriTag('crane', { c: ORI.verm });
  oriCaption('Fold again: *a crane*', { c: ORI.verm, at: 0.7 });
}
