// =====================================================================
//  SCENES — string-art demo. World coordinates 1080x1920; time TT on 1s. Every scene: the board, then thread
//  (later colours over earlier ones), then the nail heads on top. Content inside x 60-940, y 250-1300 (the
//  caption owns y 1330-1470). All nail positions are fixed constants: nails never move once they are in.
// =====================================================================
const cu = TIMELINE.cues;
// ---- era 1: the sun (the bridge object: nothing else may overlap its disc), its twelve rays
const SUN = { x: 690, y: 505, r: 150 };
const N_SUN = strCircle(SUN.x, SUN.y, SUN.r, 36);
const N_TIP = Array.from({ length: 12 }, (_, i) => { const a = -Math.PI / 2 + (3 * i + 1) / 36 * TAU; return [SUN.x + Math.cos(a) * (SUN.r + 58), SUN.y + Math.sin(a) * (SUN.r + 58)]; });
const RAY_V = N_TIP.flatMap((t, i) => [N_SUN[3 * i], t, N_SUN[3 * i + 2]]);                      // each ray a V from two rim nails
const RAY_I = N_TIP.flatMap((t, i) => [N_SUN[3 * i + 1], t, N_SUN[3 * i + 1]]);                  // re-strung: each ray a single spoke
// ---- the boat: a mast, two sails (each a parabolic corner: one row of nails runs into the corner, one out of it), a hull
const MAST = [[392, 590], [392, 1018]];
const SA = strLine([406, 612], [406, 990], 15), SB = strLine([406, 990], [664, 990], 15);       // main sail: down the mast, out along the boom
const JA = strLine([378, 668], [378, 990], 12), JB = strLine([378, 990], [176, 990], 12);       // jib
const HT = strLine([150, 1018], [684, 1018], 20), HB = strLine([236, 1096], [606, 1096], 20);   // hull: gunwale and keel
const N_BOAT = [...MAST, ...SA, ...SB.slice(1), ...JA, ...JB.slice(1), ...HT, ...HB];
// ---- waves: rows of scallops; each scallop is a V of nails laced into a hanging curve
function waveRow(x0, y0, n, shift = 0, hw = 88, dp = 58, per = 7) {
  const P = [], N = [];
  for (let c = 0; c < n; c++) {
    const a = [x0 + c * 2 * hw, y0], b = [a[0] + hw, y0 + dp], d = [a[0] + 2 * hw, y0], L = strLine(a, b, per), Rr = strLine(b, d, per);
    P.push(...strLacePath(L, Rr, shift)); N.push(...L, ...Rr.slice(1, c === n - 1 ? per : per - 1));
  }
  return { P, N };
}
const WAVES = [[60, 1104, 5, STR.teal], [148, 1168, 4, STR.white], [60, 1232, 5, STR.teal]].map(([x, y, n, c]) => ({ c, a: waveRow(x, y, n, 0), b: waveRow(x, y, n, 1) }));
const KITE1 = { x: 222, y: 448, r: 76 }, KITE2 = { x: 205, y: 800, r: 76 };
// ---- era 2: the balloon (the bridge object), its basket, three peaks, six stars
const BAL = { x: 560, y: 585, R: 185 };
const P_BAL = (() => { const P = []; for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, s = Math.sin(a), c = -Math.cos(a); P.push([BAL.x + BAL.R * s * (c > 0 ? 1 - 0.4 * c * c : 1), BAL.y + BAL.R * c * (c > 0 ? 1.28 : 1)]); } return P; })();
const N_BAL = strNailsOn(P_BAL, 36);                                             // nail 0 at the crown, nail 18 at the mouth
const N_BAL_C = [...N_BAL.slice(18), ...N_BAL.slice(0, 18)];                     // the same nails counted from the mouth: the cardioid's cusp sits there
const BT = strLine([514, 912], [606, 912], 5), BB = strLine([526, 974], [594, 974], 5);
const ROPES = [N_BAL[21], BT[0], BT[1], N_BAL[19], N_BAL[17], BT[3], BT[4], N_BAL[15]];
function peak(l, apex, r, n = 13) { const A = strLine(l, apex, n), Bq = strLine(apex, r, n); return { A, B: Bq, N: [...A, ...Bq.slice(1)], hub: [apex[0], l[1]], sA: A.slice(n - 5), sB: Bq.slice(0, 5) }; }
const PEAKS = [peak([60, 1290], [218, 1030], [410, 1290]), peak([610, 1290], [796, 1012], [940, 1290]), peak([330, 1290], [520, 1112], [720, 1290])];
const STARS = [[322, 318, 28], [868, 330, 34], [150, 462, 22], [884, 652, 26], [118, 640, 22], [850, 880, 20]];
const pluckSeg = (a, b, t0) => {   // a taut strand plucked on the beat: a shallow triangle that dies away in a few frames
  const age = mod(TT - t0 + 1e-6, 0.5), l = dist(a, b), amp = TT >= t0 ? 11 * Math.exp(-age * 11) * (F % 2 ? 1 : -1) : 0;
  return [[a[0], a[1], b[0], b[1], (a[0] + b[0]) / 2 - (b[1] - a[1]) / l * amp, (a[1] + b[1]) / 2 + (b[0] - a[0]) / l * amp]];
};

// ---- era 1: a sun, a boat and the sea, wound on a walnut board
function sceneSea() {
  strBoard('walnut');
  const bt = strBeat(0.5);
  // the sun: 36 nails on a ring, strung nail i to nail i+13 by one thread, then the rim wrapped
  strFill(N_SUN, { k: 13, c: STR.mustard, frac: strWind(cu.sun, 0.75), key: 'sun' });
  strWrap(N_SUN, { c: STR.mustard, frac: strIn(cu.sun + 0.7, 0.3), key: 'sunw' });
  // the rays are re-strung on the beat (V, spoke, V); they are unpicked and their nails pulled as the bridge starts
  const rayAlt = TT >= 1.5 && TT < 2.4 && bt % 2 === 1;
  strThread(rayAlt ? RAY_I : RAY_V, { c: STR.mustard, w: 2.4, frac: TT < 2.4 ? strIn(cu.rays, 0.35) : 1 - strIn(2.4, 0.2), key: 'ray' + rayAlt });
  strNails(N_TIP, { t0: cu.rays - 0.12, dur: 0.12, out: 2.45, outDur: 0.2 });
  strNails(N_SUN, { t0: cu.sunNails, dur: 0.33 });
  // the boat
  strWrap(MAST, { closed: false, c: STR.white, frac: strIn(cu.sails - 0.1, 0.15), key: 'mast' });
  strLace(SA, SB, { c: STR.white, frac: strWind(cu.sails, 0.6), key: 'main' });
  strLace(JA, JB, { c: STR.teal, frac: strWind(cu.sails + 0.2, 0.55), key: 'jib' });
  strLace(HT, HB, { c: STR.mustard, frac: strWind(cu.hull, 0.4, 1.4), key: 'hull' });
  strWrap([...HT, ...HB.slice().reverse()], { c: STR.mustard, frac: strIn(cu.hull + 0.35, 0.3), key: 'hullw' });
  // the sea: three rows, each wound left to right; on every beat a row is re-laced one nail along (the swell)
  WAVES.forEach((w, i) => strThread(((bt + i) % 2 && TT >= 1.5 ? w.b : w.a).P, { c: w.c, w: 2.2, a: 0.78, g: 3, frac: strWind(cu.waves + i * 0.15, 0.5, 1.4), key: 'wave' + i + (bt + i) % 2, nails: w.a.N }));
  WAVES.forEach((w, i) => strNails(w.a.N, { r: 4.8, t0: cu.waveNails + i * 0.12, dur: 0.4 }));
  strNails(N_BOAT, { t0: cu.boatNails, dur: 0.45 });
  // two gulls: five nails each, re-strung wings up / wings down
  [[462, 322, 28], [118, 716, 24]].forEach(([x, y, s], i) => { if (TT >= cu.birds + i * 0.125) strBird(x, y, s, { t0: cu.birds + i * 0.125, frac: strIn(cu.birds + 0.1 + i * 0.125, 0.12), flap: strBeat(0.25, i * 0.5) % 2 }); });
  // the hero: a heart flown as a kite from the masthead; its string is plucked on the beat
  if (TT >= cu.heartNails) {
    const tip = strHeartPts(KITE1.x, KITE1.y, KITE1.r)[13];
    if (TT < cu.beat1) strThread([MAST[0], tip], { c: STR.coral, w: 2, frac: strIn(cu.heart + 0.4, 0.1), amp: 12 });
    else strThread(pluckSeg(MAST[0], tip, cu.beat1), { c: STR.coral, w: 2 });
    strHeart(KITE1.x, KITE1.y, KITE1.r, { t0: cu.heartNails, frac: strIn(cu.heart, 0.45), beat: TT >= cu.beat1 && strHit(0.5, 0.13) });
  }
  strTag('SEA');
  strCaption('NAIL BY *NAIL*', { at: 0.375 });
}

// ---- era 2: a balloon over three peaks, on a midnight board
function sceneSky() {
  strBoard('ebony');
  const bt = strBeat(0.5);
  // three peaks: every flank nail strung to one hub nail at the foot (a fan), with a small white lace at the top for snow
  PEAKS.forEach((p, i) => {
    strFill(p.N, { rule: 'fan', hub: p.hub, c: STR.teal, frac: strWind(cu.peaks + i * 0.15, 0.5, 1.4), key: 'peak' + i });
    strLace(p.sA, p.sB, { c: STR.white, w: 2.4, a: 0.9, frac: strIn(cu.peaks + 0.45 + i * 0.15, 0.2), key: 'snow' + i });
    strNails([...p.N, p.hub], { r: 5.5, t0: cu.nails2 + i * 0.06, dur: 0.3 });
  });
  // the balloon: the ring the bridge left, strung i to i+17. A mustard web is wound over it; then the turquoise
  // web is unpicked and re-strung as a cardioid (nail i to nail 2i, counted from the mouth)
  if (TT < cu.restring) strFill(N_BAL, { k: 17, c: STR.teal, frac: 1 - EZ.i2(strIn(cu.unpick, 0.25)), key: 'bal' });
  else strFill(N_BAL_C, { rule: 'times', m: 2, c: STR.teal, frac: strWind(cu.restring, 0.6, 1.5), key: 'balc' });
  strFill(N_BAL, { k: 11, c: STR.mustard, frac: strWind(cu.gold, 0.7), key: 'balg' });
  strWrap(N_BAL, { c: STR.teal, key: 'balw' });
  // ropes and the basket
  strThread(ROPES, { c: STR.white, w: 2.2, frac: strIn(cu.ropes, 0.25), key: 'ropes' });
  strLace(BT, BB, { c: STR.mustard, frac: strIn(cu.ropes + 0.2, 0.2), key: 'bask' });
  strWrap([...BT, ...BB.slice().reverse()], { c: STR.mustard, frac: strIn(cu.ropes + 0.35, 0.2), key: 'baskw' });
  strNails([...BT, ...BB], { r: 5, t0: cu.nails2, dur: 0.15 });
  strNails(N_BAL, {});
  // stars: ten nails each, wrapped one per sixteenth; two at a time are re-strung as pentagrams (they twinkle)
  STARS.forEach(([x, y, r], i) => { const t0 = cu.stars + i * 0.0625; if (TT >= t0) strStar(x, y, r, { t0, frac: strIn(t0 + 0.08, 0.15), alt: TT >= 4.5 && (bt + i) % 3 === 0, rot: -Math.PI / 2 + i * 0.2 }); });
  // the hero: tied to the basket now
  if (TT >= cu.heart2 - 0.15) {
    const tip = strHeartPts(KITE2.x, KITE2.y, KITE2.r)[13];
    if (TT < cu.beat2) strThread([BT[0], tip], { c: STR.coral, w: 2, frac: strIn(cu.heart2 + 0.35, 0.1), amp: 12 });
    else strThread(pluckSeg(BT[0], tip, cu.beat2), { c: STR.coral, w: 2 });
    strHeart(KITE2.x, KITE2.y, KITE2.r, { t0: cu.heart2 - 0.15, frac: strIn(cu.heart2, 0.4), beat: TT >= cu.beat2 && strHit(0.5, 0.13) });
  }
  strTag('SKY', { at: 0.6 });
  strCaption('PULL IT *TAUT*', { at: 0.6 });
}
