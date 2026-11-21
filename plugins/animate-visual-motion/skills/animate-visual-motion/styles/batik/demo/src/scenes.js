// =====================================================================
//  SCENES — batik demo. World units = px at zoom 1; time TT on 2s. Content kept inside x 60-940, y 250-1500.
//  Era 1 on sogan brown, era 2 on indigo. The same bird (mengkudu red + gold) in both.
// =====================================================================
const cu = TIMELINE.cues;
const MED = { x: 480, y: 932, rx: 372, ry: 318 };          // the plain medallion the bird is waxed on
const KAW = { x: 790, y: 425, r: 150 };                    // the big kawung flower (bridge A)
const CLD = { x: 640, y: 520, w: 520, h: 330 };            // the mega mendung cloud (bridge B)
const BIRD = { x: 505, y: 925, s: 236 };

// ---- era 1: kawung on sogan
function sceneKawung() {
  btGround(BT.sogan);
  btKawungField({ s: 180, cx: MED.x, cy: MED.y, t0: cu.field, speed: 430, c: BT.creamD, fill: BT.soganL });
  btParang(-60, -30, W + 120, 215, { frac: ev(cu.border, 1.3), bg: BT.soganD, gap: 92, key: 'top' });
  btParang(-60, 1585, W + 120, 380, { frac: ev(cu.border + 0.2, 1.5), bg: BT.soganD, gap: 92, dir: -1, key: 'bot' });
  // the medallion: plain dyed cloth, a wax line, a cecek ring inside, a fine rule outside
  const mp = ellipsePts(MED.x, MED.y, MED.rx, MED.ry, 0, 72);
  btFill(btInset(mp, 1.07), BT.sogan);
  btFill(mp, BT.soganD);
  ctx.save(); btPath(btInset(mp, 1.07), true); ctx.strokeStyle = BT.cream; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  btLine(mp, { closed: true, w: 8, key: 'med' });
  btDots(btInset(mp, 0.94), { closed: true, gap: 24, r: 3.6 });
  // a branch for the bird: a vine with two curls and leaves
  const bf = ev(cu.bird - 0.1, 0.7);
  btLine([[210, 1086], [330, 1068], [470, 1060], [610, 1066], [720, 1050]], { w: 7, key: 'branch', frac: bf });
  btScroll(742, 1022, 34, { a0: 1.9, dir: -1, frac: ev(cu.bird + 0.4, 0.5), key: 'u1' });
  btScroll(300, 1110, 30, { a0: -1.9, dir: 1, frac: ev(cu.bird + 0.6, 0.5), key: 'u2' });
  [[400, 1064, 372, 1136, 0.9], [640, 1064, 690, 1128, 1.1]].forEach(([x0, y0, x1, y1, d], i) => {
    const g = ev(cu.bird + d * 0.6, 0.4); if (g <= 0) return;
    const P = btLeafPts(x0, y0, lerp(x0, x1, EZ.o2(g)), lerp(y0, y1, EZ.o2(g)), 20, 0.1);
    btFill(P, BT.soganL, { al: g }); btLine(P, { closed: true, w: 4, key: 'lf' + i, drops: false });
  });
  // the bird, waxed on by a canting
  const b = btBird(BIRD.x, BIRD.y, BIRD.s, { frac: ev(cu.bird, 1.35) });
  // the big kawung flower on its own plain disc: waxed, then filled with wax (it becomes the bridge shape)
  const disc = ellipsePts(KAW.x, KAW.y, KAW.r * 1.22, KAW.r * 1.22, 0, 56);
  btFill(disc, BT.soganD); btDots(disc, { closed: true, gap: 22, r: 3.4, c: BT.creamD });
  const kp = btKawungPts(KAW.x, KAW.y, KAW.r), kf = ev(cu.flower, 0.7), glow = EZ.io(ev(cu.glow, 0.5));
  if (glow > 0) { ctx.save(); ctx.globalAlpha = glow; btLayers(kp, BT.cream, 0); btCrackle(kp, { n: 16, key: 'kawA' }); ctx.restore(); }
  const kt = btLine(kp, { closed: true, w: 7, key: 'blob', frac: kf, drops: false });
  btKawung(KAW.x, KAW.y, KAW.r * 0.5, { frac: ev(cu.flower + 0.5, 0.6), c: glow > 0.5 ? BT.soganM : BT.cream, w: 4, key: 'kin' });
  [[615, 300, 20, 0], [935, 610, 17, 0.19], [600, 560, 15, 0.38]].forEach(([x, y, r, d], i) => btTruntum(x, y, r * (1 + 0.12 * Math.sin(TT * 5 + i)), { c: BT.gold, frac: ev(cu.spark + d, 0.35), rot: TT * 0.5 + i }));
  const tip = kt || b.tip;
  if (tip) btCanting(tip.x, tip.y, { ang: -0.62 + Math.sin(TT * 9) * 0.05 });
  btTag('MOTIF KAWUNG');
  btCaption('Batik, warisan\n*budaya bangsa*');
}

// ---- era 2: mega mendung on indigo
const CLOUDS = [[118, 640, 330, 215, 0.25], [965, 860, 400, 255, 0.1], [170, 1190, 450, 275, 0.4], [820, 1215, 380, 235, 0.55]];
const STARS = [[250, 405, 24, 0], [930, 318, 18, 0.2], [80, 900, 20, 0.35], [735, 1010, 22, 0.5], [560, 1150, 17, 0.7], [395, 770, 16, 0.9]];
function sceneMega() {
  btGround(BT.indigo);
  btParang(-60, -30, W + 120, 215, { bg: BT.indigoD, gap: 92, key: 'top', c: '#dfe3d6' });
  btParang(-60, 1585, W + 120, 380, { bg: BT.indigoD, gap: 92, dir: -1, key: 'bot', c: '#dfe3d6' });
  CLOUDS.forEach(([x, y, w, h, d], i) => btCloud(x + Math.sin(TT * 0.7 + i * 1.7) * 14, y, w, h, { key: 'm' + i, grow: ev(cu.clouds + d, 0.9) }));
  STARS.forEach(([x, y, r, d], i) => btTruntum(x, y, r * (1 + 0.14 * Math.sin(TT * 4 + i * 2)), { c: i % 2 ? BT.cream : BT.gold, frac: ev(cu.stars + d, 0.4), rot: TT * 0.4 + i }));
  btCloud(CLD.x, CLD.y, CLD.w, CLD.h, { key: 'megaB', w: 7 });   // the bridge cloud: whole from the first frame
  // the bird flies in from the left and climbs, then hovers
  const u = EZ.o2(seg(TT, cu.fly, 5.2));
  btBird(lerp(250, 500, u), lerp(1060, 905, u) + Math.sin(TT * 2.6) * 10, 205, { fly: true, tilt: lerp(-0.3, -0.1, u), key: 'kukila' });
  btTag('MEGA MENDUNG', { bg: BT.indigoD, at: 0.6 });
  btCaption('karya perajin\n*terbang mendunia*', { bg: BT.indigoD, at: 1.0 });
}
