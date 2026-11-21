// =====================================================================
//  SCENES — stitch demo. World units = px at zoom 1; time TT on 2s. Content kept inside x 60-940, y 250-1500.
//  Era 1 on linen in a hoop, era 2 on denim. Brick red is the heart's colour: the patch, the house, the bear's tummy.
// =====================================================================
const cu = TIMELINE.cues;
const HOOP = { x: 500, y: 836, r: 392 };
const HRT = { x: 500, y: 832, r: 160 };                    // the felt heart (bridge A)
const HOUSE = { x: 600, y: 884, w: 330, h: 470 };          // the felt house (bridge B)
const BERU = { x: 268, y: 978, s: 138 };
const HEART_N = 22;                                        // blanket stitches round the heart, one per 2s step

// ---- era 1: a heart is sewn onto linen in a hoop
function sceneJahit() {
  stcCloth(STC.linen);
  // loose buttons on the slack cloth outside the hoop
  stcButton(846, 352, 40, STC.mustard, { thread: STC.brick, rot: 0.3 + Math.sin(TT * 1.1) * 0.1 });
  stcButton(752, 300, 25, STC.teal, { holes: 2, rot: -0.4 + Math.sin(TT * 1.4 + 1) * 0.14 });
  stcButton(118, 1190, 30, STC.pink, { thread: STC.tealD, rot: 0.8 + Math.sin(TT * 1.2 + 2) * 0.12 });
  // the wreath: a chain-stitch ring that is still being sewn when the piece opens, satin leaves coming out behind it
  const wf = ev(cu.wreath, 2.0), ring = ellipsePts(HRT.x, HRT.y, 290, 290, 0, 96).map((_, i, P) => P[(i + 72) % 96]);   // start at the top
  stcStitch(ring, { type: 'chain', closed: true, c: STC.sageD, w: 5.5, frac: wf, key: 'wreath' });
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i + 0.5) / 12 * TAU, bx = HRT.x + Math.cos(a) * 290, by = HRT.y + Math.sin(a) * 290, out = i % 2 ? 1 : -1, d = a + Math.PI / 2 + out * -1.0;
    stcLeaf(bx, by, bx + Math.cos(d) * 66, by + Math.sin(d) * 66, 18, i % 2 ? STC.sage : STC.teal, clamp((wf * 12 - i - 0.6) / 1.2));
  }
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; stcFlower(HRT.x + Math.cos(a) * 290, HRT.y + Math.sin(a) * 290, 34, i % 2 ? STC.mustard : STC.pink, { frac: stcStep(cu.flower + i * T3, 6), rot: i, centre: i % 2 ? STC.brick : STC.mustard }); }
  for (let i = 0; i < 4; i++) { const a = 0.36 + i * Math.PI / 2, k = popS(cu.knots + i * T6); for (const d of [-0.09, 0, 0.09]) stcKnot(HRT.x + Math.cos(a + d) * (d ? 236 : 226), HRT.y + Math.sin(a + d) * (d ? 236 : 226), d ? 6 : 8, d ? STC.mustard : STC.brick, k); }
  // the heart: a felt patch drops on, then the needle sews it down
  const hp = stcHeartPts(HRT.x, HRT.y, HRT.r), sewn = stcStep(cu.sew, HEART_N);
  const tip = stcFelt(hp, STC.brick, { n: HEART_N, sw: 7, prong: 24, drop: ev(cu.drop, 0.25), sewn, key: 'blob', lift: 1.3 });
  [[360, 672, STC.mustard], [655, 944, STC.teal], [372, 948, STC.pink]].forEach(([x, y, c], i) => stcSequin(x, y, 15, c, { pop: popS(cu.spark + i * T6), ph: i * 2.1 }));
  stcHoop(HOOP.x, HOOP.y, HOOP.r);
  // the needle: waits above the heart, leads the stitching (in and out on alternate steps), then rests in the cloth
  const st = hp[0], park = [694, 872];
  if (tip) stcNeedle(tip.x, tip.y, { ang: -1.05 + (B % 2) * 0.12, dip: B % 2 ? 0.7 : 0.1, from: [tip.x, tip.y] });
  else if (sewn <= 0) { const u = EZ.o2(ev(cu.sew - 0.5, 0.42)); stcNeedle(lerp(st[0] + 130, st[0], u), lerp(st[1] - 190, st[1], u), { ang: -1.05, from: [st[0] + 300, st[1] - 420] }); }
  else { const u = EZ.o2(ev(cu.spark - T12, 0.25)); stcNeedle(lerp(st[0], park[0], u), lerp(st[1], park[1], u), { ang: lerp(-1.05, -1.35, u), dip: 0.35 * u, len: 190, from: st }); }
  stcTag('JAHIT');
  stcCaption('dijahit dengan\n*sepenuh hati*');
}

// ---- era 2: the felt house on denim
const HILL = (() => { const P = []; for (let i = 0; i <= 28; i++) { const u = i / 28; P.push([150 + 700 * u, 1130 - 28 * Math.sin(Math.PI * u) - 7 * Math.sin(3 * Math.PI * u) + (i === 0 || i === 28 ? 14 : 0)]); } return P.concat([[850, 1186], [838, 1198], [162, 1198], [150, 1186]]); })();
const STARS = [[190, 520, 15, 0, 1], [338, 596, 17, 1, 0], [176, 706, 13, 2, 0], [432, 506, 13, 3, 1], [322, 772, 11, 4, 0], [585, 500, 12, 5, 0]];
function sceneRumah() {
  stcCloth(STC.denim);
  stcCrossBorder(80, 410, 840, 860, 20, { frac: ev(cu.border, 1.75), cols: [STC.cream, STC.cream, STC.pink], dot: STC.mustard });
  STARS.forEach(([x, y, r, i, seq]) => { const k = popS(cu.stars + i * T6); if (seq) stcSequin(x, y, r, i % 2 ? STC.pink : STC.cream, { pop: k, ph: i }); else stcStar(x, y, r * (1 + 0.16 * Math.sin(TT * 4 + i * 2)), i % 2 ? STC.cream : STC.mustard, k, TT * 0.3 + i); });
  // the button sun: its rays are sewn one per step, then they breathe
  const rays = Math.floor(stcStep(cu.sun + T6, 12) * 12 + 1e-6), S = [];
  for (let i = 0; i < rays; i++) { const a = -Math.PI / 2 + i / 12 * TAU, r1 = 98 + (i % 2 ? -10 : 6) + 5 * Math.sin(TT * 3 + i); S.push([744 + Math.cos(a) * 70, 576 + Math.sin(a) * 70, 744 + Math.cos(a) * r1, 576 + Math.sin(a) * r1]); }
  stcThread(S, STC.mustard, 6);
  stcButton(744, 576, 54, STC.mustard, { thread: STC.brick, rot: TT * 0.22, pop: popS(cu.sun) });
  stcFelt(HILL, STC.sage, { stitch: 'running', thread: STC.cream, sw: 4, key: 'hill' });
  [[196, 1150, 26], [420, 1136, 30], [470, 1140, 22], [826, 1150, 26]].forEach(([x, y, h], i) => stcTuft(x, y, h, i % 2 ? STC.cream : STC.sageD, ev(3.4 + i * T6, 0.25)));
  stcStitch([[806, 1128], [806, 1086]], { type: 'back', c: STC.sageD, w: 4, n: 3, frac: ev(4.0, 0.25) });
  stcFlower(806, 1062, 26, STC.pink, { frac: stcStep(4.25, 6), rot: TT * 0.2 });
  // chimney smoke: French knots rising on a loop
  for (let i = 0; i < 5; i++) { const u = mod(TT * 0.42 + i / 5, 1), k = Math.min(1, u * 6) * (1 - smooth(0.7, 1, u)); stcKnot(534 - u * 44 + Math.sin(u * 5 + i) * 12, 676 - u * 150, lerp(5, 11, u), STC.cream, k); }
  stcHouse(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h, { sheen: 0.4 + 0.25 * Math.sin(TT * 2.2) });
  stcBear(BERU.x, BERU.y, BERU.s, { drop: ev(cu.bear, 0.3), wave: TT > cu.bear + 0.5 });
  stcTag('RUMAH', { at: 0.6 });
  stcCaption('jadilah rumah\n*yang hangat*', { at: 1.0 });
}
