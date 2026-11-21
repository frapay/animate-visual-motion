// =====================================================================
//  SCENES — diorama demo. World units = px at zoom 1; time TT on 1s. One valley, cut once and used twice: the same
//  sheets (same keys, same shapes) in the dusk ramp and in the night ramp. Sheets are listed back to front; DEP is
//  each sheet's depth (0 = the back of the box, 1 = the leaf frame against the glass).
// =====================================================================
const cu = TIMELINE.cues;
const SUN = { x: 350, y: 640, r: 118 }, MOON = { x: 338, y: 548, r: 92 };
const LAN = { x: 822, y: 716, s: 215, top: 120, depth: 0.85 };
const DEER = { x: 330, s: 250 };
const DEP = { cloud: 0.06, volc: 0.14, far: 0.26, vil: 0.4, ridge: 0.55, near: 0.74, leaf: 1 };
const RID = {
  far: dioRidge('far', 1105, { amp: 44 }),
  vil: dioRidge('vil', 1205, { amp: 28 }),
  ridge: dioRidge('ridge', 1322, { amp: 28, bumps: [[330, 40, 200]] }),
  near: dioRidge('near', 1470, { amp: 24 }),
};
const VIL = (() => {   // the village sheet: its windows are real holes (VIL.holes), lit from behind at night
  const g = (x) => RID.vil(x) + 14;
  return dioJoin({ P: [dioHillPts(RID.vil)] }, dioHouse(610, g(610), 150, 104), dioMosque(790, g(790), 180), dioHouse(1012, g(1012), 124, 88, { wins: [0] }), { P: dioPalm(700, g(700), 250, 'p1', 0.1) });
})();
const WIN_AT = [cu.win2, cu.win3, cu.win1, cu.win1 + 0.08, cu.win1 + 0.16, cu.win4, cu.win5];   // when each hole lights (house, mosque arches, minaret, house)
const GEO = {
  volc: () => dioVolcanoPts(650, 1270, 620, 505),
  far: () => [dioHillPts(RID.far), ...dioTree(150, RID.far(150) + 8, 96, 'f1'), ...dioTree(212, RID.far(212) + 8, 70, 'f2')],
  ridge: () => [dioHillPts(RID.ridge), ...dioPalm(985, RID.ridge(985) + 10, 300, 'r2', -0.1), ...dioPalm(1065, RID.ridge(1065) + 10, 230, 'r3', 0.12)],
  near: () => [dioHillPts(RID.near), ...dioTree(30, RID.near(30) + 12, 470, 'n1'), ...[250, 330, 470, 560, 650, 735, 830, 900, 990].flatMap((x, i) => dioGrass(x, RID.near(x), 84 + (i * 37) % 60, 'g' + i))],
};
// the sheets every era shares, back to front; o = each sheet's slide offsets, hooks draw between sheets.
// The three hill sheets behind the near ground are cached only down to `floor` (plain paper below it).
function valley(o) {
  dioSheet('volc', GEO.volc, 3, { depth: DEP.volc });
  dioSheet('far', GEO.far, 4, { depth: DEP.far, floor: 1420, bare: o.vil > 1 });
  if (o.lit) dioWindows(VIL.holes, 'back', o.lit, { depth: DEP.vil, dy: o.vil });
  dioSheet('vil', VIL, 5, { depth: DEP.vil, dy: o.vil, floor: 1500, bare: o.ridge > 1 });
  if (o.lit) dioWindows(VIL.holes, 'glow', o.lit, { depth: DEP.vil, dy: o.vil });
  dioLayer(DEP.ridge, o.deer, { dy: o.ridge });                     // the deer stands just behind the ridge's cut edge
  dioSheet('ridge', GEO.ridge, 6, { depth: DEP.ridge, dy: o.ridge, floor: 1620, bare: o.near > 1 });
  if (o.mid) o.mid();
  dioSheet('near', GEO.near, 7, { depth: DEP.near, dy: o.near });
  if (o.front) o.front();
  dioLeafSheets('leaf', 8, { slide: o.leaf });
}

// ---- era 1: senja — the valley builds up sheet by sheet under a low sun
function sceneSenja() {
  dioEra('dusk');
  dioSky(SUN.x, SUN.y);
  dioDisc(SUN.x, SUN.y, SUN.r);
  dioSheet('cloudA', () => dioCloudPts(800, 520, 330, 'a'), 2, { depth: DEP.cloud, dx: 46 - TT * 13, gap: 0.5 });
  dioSheet('cloudB', () => dioCloudPts(150, 965, 270, 'b'), 2, { depth: DEP.cloud + 0.03, dx: -34 + TT * 10, gap: 0.5 });
  for (let i = 0; i < 3; i++) {   // three birds cross the sky (they stay right of the sun)
    const t0 = cu.birds + i * 0.22, x = 1150 - (TT - t0) * 250 - i * 26, y = 610 + i * 46 + Math.sin(TT * 2 + i) * 10;
    if (TT > t0) dioLayer(0.1, () => dioBird(x, y, 30 - i * 4, TT * 9 + i * 1.7));
  }
  const graze = 1 - EZ.io(seg(TT, cu.look, cu.look + 0.45));
  valley({
    vil: dioRise(cu.vil), ridge: dioRise(cu.ridge), near: dioRise(cu.near), leaf: dioRise(cu.leaves, 460),
    deer: () => dioDeer(DEER.x, RID.ridge(DEER.x) + 8, DEER.s, { graze, look: 0.5 * (1 - graze) }),
    mid: () => dioLayer(0.65,   // falling leaves, kept right of the sun and the peak so nothing crosses the morph shape
      () => dioLeavesFall('senja', 5, dioTone(7), { x0: 790, x1: 900, y0: 600, y1: 1420 })),
  });
  dioTitle('SENJA');
  dioCaption('Senja turun di *lembah*', { at: 1.45 });   // after the ridge has risen, so the deer never passes behind the strip
}

// ---- era 2: malam — the same valley at night: moon, stars, a lantern, windows lighting up, the deer
function sceneMalam() {
  dioEra('night');
  dioSky(MOON.x, MOON.y);
  dioStars('malam', 52, { y0: 150, y1: 1060, avoid: [[MOON.x, MOON.y, MOON.r + 80], [LAN.x, LAN.y, 200]], t0: cu.stars, stagger: 0.022 });
  dioDisc(MOON.x, MOON.y, MOON.r);
  dioSheet('cloudB', () => dioCloudPts(150, 965, 270, 'b'), 2, { depth: DEP.cloud + 0.03, dx: 10 + (TT - 3) * 10, gap: 0.5 });
  const go = EZ.io(seg(TT, cu.deer, cu.stop)), dx = lerp(-190, DEER.x, go), hop = TT > cu.deer && TT < cu.stop ? Math.abs(Math.sin((TT - cu.deer) * Math.PI * 3)) * 9 : 0;
  const ear = Math.sin(seg(TT, cu.ear, cu.ear + 0.28) * Math.PI) + Math.sin(seg(TT, cu.ear + 0.36, cu.ear + 0.6) * Math.PI) * 0.7;
  valley({
    vil: 0, ridge: 0, near: dioRise(cu.near2, 420, 0.9), leaf: dioRise(cu.leaves2, 460, 0.9),
    lit: (i) => EZ.o2(ev(WIN_AT[i], 0.22)),
    deer: () => dioDeer(dx, RID.ridge(dx) + 8 - hop, DEER.s, { look: EZ.io(seg(TT, cu.look2, cu.look2 + 0.4)), ear: TT > cu.ear ? ear : undefined }),
    front: () => {
      dioLayer(0.7, () => dioFireflies('malam', 7, { x: 110, y: 1170, w: 640, h: 230, t0: cu.flies }));
      dioLayer(LAN.depth, () => dioLantern(LAN.x, LAN.y, LAN.s, { top: LAN.top, ribs: ev(3.62, 0.3) }));
    },
  });
  dioTitle('MALAM');
  dioCaption('Malam tiba, *lentera* menyala');
}
