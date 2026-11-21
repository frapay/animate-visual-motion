// =====================================================================
//  SCENES — line-art demo. World units = px at zoom 1; time TT on 1s.
//  Content inside x 80-940, y 260-1500. Everything stands on one line at GY. Most of the frame stays empty.
// =====================================================================
const cu = TIMELINE.cues;
const GY = 1130;
const CAT = { x: 700, r: 168 };
const CUP = { x: 330, s: 1 };
const BLOB = { x: 372, y: 990, r: 178 };
const SUN = { x: 668, y: 548, r: 140 };
const POT = { x: 310, s: 1 };

// ---- era 1: the coffee. ONE line: the table, the cup, the table again, the cat, its tail.
function coffeeLine() {
  const sway = TT > cu.line + cu.lineDur ? Math.sin((TT - cu.line - cu.lineDur) * 1.7) * 0.2 : 0;
  return laJoin([[96, GY], [CUP.x - 72 * CUP.s, GY]], laCupPts(CUP.x, GY, CUP.s), laCatPts(CAT.x, GY, CAT.r, { sway }));
}
function sceneCoffee() {
  laGround(LA.ground);
  laBlob(laBlobPts(BLOB.x, BLOB.y, BLOB.r, 'cup'), { t0: cu.blob });
  laSteam(CUP.x - 34, GY - 262, 150, cu.steam, { key: 'a' });
  laSteam(CUP.x + 30, GY - 252, 128, cu.steam + 0.3, { key: 'b', period: 1.6 });
  const f = laDraw(coffeeLine(), cu.line, cu.lineDur);
  laCatFace(CAT.x, GY, CAT.r, { on: seg(TT, cu.line + cu.lineDur - 0.05, cu.line + cu.lineDur + 0.2), look: -0.9, lookY: 0.3, mood: TT > cu.blob && TT < cu.blob + 0.55 ? 'happy' : 'calm' });
  laTag('01', 'pagi');
  laCaption('Mulai hari\ndengan *tenang*', { at: 0.45 });
}

// ---- era 2: the plant. The same line, picked up at the cat: along the sill, round the pot, up the stem, leaf by leaf.
function plantLine() {
  const sw = Math.sin((TT - 3) * 1.3) * 0.07;
  const cat = laReverse(laCatPts(CAT.x, GY, CAT.r, { sway: Math.sin((TT - 3) * 1.7 + 1) * 0.2 }));
  const rest = laJoin([[CAT.x - 0.52 * CAT.r, GY], [POT.x + 60 * POT.s, GY]], laPlantPts(POT.x, GY, POT.s, { sway: sw }));
  return { P: laJoin(cat, rest), start: laLen(cat) / (laLen(cat) + laLen(rest)) };
}
function scenePlant() {
  laGround(LA.tint);
  laFill(laCirclePts(SUN.x, SUN.y, SUN.r), LA.accent);                                   // the sun IS the blob
  laLine(laCirclePts(SUN.x + LA.off[0], SUN.y + LA.off[1], SUN.r), { closed: true });
  laRays(SUN.x + LA.off[0], SUN.y + LA.off[1], SUN.r, cu.rays, { n: 10 });
  const bt = TT - cu.bird;
  if (bt > 0) laBird(150 + bt * 34, 470 - bt * 10 + Math.sin(bt * 1.5) * 8, 58, { al: clamp(bt * 3) });
  if (bt > 0.5) laBird(88 + bt * 30, 540 - bt * 8 + Math.sin(bt * 1.5 + 1) * 8, 40, { al: clamp((bt - 0.5) * 3), ph: 1.7 });
  const L = plantLine();
  laDraw(L.P, cu.line2, cu.line2Dur, { start: L.start });
  laCatFace(CAT.x, GY, CAT.r, { look: -0.8, lookY: -0.8, mood: TT > cu.done2 && TT < cu.done2 + 0.7 ? 'happy' : 'calm' });
  laTag('02', 'tumbuh', { at: 0.6 });
  laCaption('lalu tumbuh\n*pelan-pelan*', { at: 0.75 });
}
