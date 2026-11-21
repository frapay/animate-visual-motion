// =====================================================================
//  SCENES — art nouveau demo. World coordinates 1080x1920; time TT on 1s. The poster plate is NOU_PANEL; what
//  matters sits inside x 100-940, y 250-1300; the cartouche owns y 1335-1485; the plinth below it is ornament.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: at the bridge nothing may lie over them (era 1 folds its lily away and empties the rings first;
// era 2 only starts growing once the window is open)
const HALO1 = { x: 540, y: 660, r: 300 }, HALO2 = { x: 540, y: 720, r: 330 };
const FLY = { x: 790, y: 1085, r: 122 };                     // where the dragonfly hovers (both eras: it carries across)
const breath = () => Math.sin(TT * 2.3);

// ---- era 1: a lily in sage and rose
function sceneLily() {
  const fold = nouIn(cu.fold + 0.04, 0.44);                  // before the bridge: the flower closes, the stem draws back, the rings empty
  nouPanel({ in: TT / 1.4, tint: '#e3e0c2', sp: NOU.sage, bead: NOU.ochre });
  nouSpandrel(-1, { in: (TT - 0.5) / 1.3, sway: 0.05 * Math.sin(TT * 1.6) });
  nouSpandrel(1, { in: (TT - 0.75) / 1.3, variant: 1, sway: 0.05 * Math.sin(TT * 1.6 + 2) });
  nouHalo(HALO1.x, HALO1.y, HALO1.r * (0.3 + 0.7 * nouIn(0, 0.6)), { c: NOU.rose, kind: 'floral', cols: [NOU.cream, NOU.roseD, NOU.ochre], in: nouIn(cu.rings, 1.35) * (1 - fold), key: 'h1' });
  // petals drifting down the two sides (background life)
  nouFall('pl', 3, { box: { x0: 120, x1: 215, y0: 470, y1: 1480 }, c: NOU.rose, shade: NOU.roseD, speed: 80 });
  nouFall('pr', 3, { box: { x0: 865, x1: 960, y0: 470, y1: 1480 }, c: NOU.cream, shade: NOU.rose, speed: 70 });
  // side tendrils: they curl into their spirals and the tips sway (background life)
  nouStem([[150, 1560], [112, 1330], [196, 1150], [128, 985], [176, 880]], {
    grow: nouIn(cu.stem + 0.1, 1.5), w: 11, c: NOU.olive, spiral: { r: 38, turns: 1.8, dir: 1 }, sway: 0.11 * Math.sin(TT * 1.9), swayPow: 2.6,
    leaves: [{ at: 0.2, side: -1, len: 120, c: NOU.sage, shade: NOU.olive }, { at: 0.42, side: 1, len: 64, kind: 'bud' }, { at: 0.62, side: -1, len: 100, c: NOU.sage, shade: NOU.olive }, { at: 0.84, side: 1, len: 56, kind: 'bud' }],
  });
  nouStem([[930, 1560], [972, 1420], [905, 1310], [948, 1235]], {
    grow: nouIn(cu.stem + 0.3, 1.3), w: 9, c: NOU.olive, spiral: { r: 30, turns: 1.6, dir: -1 }, sway: -0.12 * Math.sin(TT * 1.7 + 1), swayPow: 2.4,
    leaves: [{ at: 0.3, side: 1, len: 90, c: NOU.sage, shade: NOU.olive }, { at: 0.7, side: -1, len: 52, kind: 'bud' }],
  });
  // the lily: the stem grows up a whiplash curve, leaves unfurl as the tip passes, the flower opens petal by petal
  const g = nouIn(cu.stem, 0.95) * lerp(1, 0.56, fold);
  const st = nouStem([[505, 1570], [566, 1390], [468, 1190], [580, 965], [540, 760]], {
    grow: g, w: 22, tip: 6, c: NOU.olive, lw: 3.6, taper: 2.2,
    leaves: [{ at: 0.16, side: -1, len: 250, w: 62, ang: 0.62, c: NOU.sage, shade: NOU.olive, lw: 4 }, { at: 0.3, side: 1, len: 230, w: 56, ang: 0.6, c: NOU.sage, shade: NOU.olive, lw: 4 }, { at: 0.47, side: -1, len: 150, w: 40, ang: 0.7, c: NOU.sage, shade: NOU.olive }],
  });
  const fk = nouE((g - 0.8) / 0.2);
  if (fk > 0) nouLily(st.tip[0], st.tip[1], 225 * fk, { rot: st.ang, open: nouIn(cu.bloom, 0.95) * (1 - fold), breathe: breath() });
  nouPlinth({ c: NOU.olive, cols: [NOU.sage, NOU.ochre] });
  // the dragonfly glides in on an S-curve and hovers (the hero)
  const a = nouIn(cu.fly, 1.0), path = nouCurve([[1160, 760], [1010, 980], [900, 960], [FLY.x, FLY.y]], 14), [p, th] = nouAt(path, Math.max(0.02, a)), hv = nouHover('fly', 9);
  nouDragonfly(p[0] + hv[0] * a, p[1] + hv[1] * a, FLY.r, { rot: lerp(th + Math.PI / 2, -0.5, a) + hv[2], flap: Math.sin(TT * TAU * 6), curl: Math.sin(TT * 2.1) });
  nouCaption('The *lily* opens', { hi: NOU.roseD });
}

// ---- era 2: an iris in teal and gold
function sceneIris() {
  nouPanel({ tint: '#d3ddca', sp: NOU.tealL, bead: NOU.rose });
  nouSpandrel(-1, { c: NOU.teal, leaf: NOU.cream, bud: NOU.ochre, variant: 1, sway: 0.05 * Math.sin(TT * 1.6) });
  nouSpandrel(1, { c: NOU.teal, leaf: NOU.cream, bud: NOU.ochre, sway: 0.05 * Math.sin(TT * 1.6 + 2) });
  nouHalo(HALO2.x, HALO2.y, HALO2.r, { c: NOU.ochre, kind: 'mosaic', cols: [NOU.teal, NOU.cream, NOU.gold, NOU.tealL, NOU.teal, NOU.gold], in: nouIn(cu.rings2, 1.7), key: 'h2', bead: NOU.cream, rings: 5 });
  // ginkgo leaves start to drift down once the panel is open (background life)
  nouFall('gk', 6, { kind: 'ginkgo', c: NOU.ochre, t0: cu.leaves, every: 0.32, speed: 150, box: { x0: 130, x1: 950, y0: 330, y1: 1500 }, s: 34 });
  // peacock feathers: the stems grow, the eyes open ring by ring, the tips sway (background life)
  nouFeather([[172, 1560], [120, 1370], [192, 1200], [136, 1050], [152, 975]], { grow: nouIn(cu.feather, 1.5), sway: 0.06 * Math.sin(TT * 1.8), s: 1.12 });
  nouFeather([[925, 1560], [972, 1470], [922, 1380], [952, 1310]], { grow: nouIn(cu.feather + 0.35, 1.4), sway: -0.08 * Math.sin(TT * 1.6 + 1), s: 0.72 });
  // the iris: sword leaves and the stem rise together; the falls drop one by one, then the standards lift
  const lg = nouIn(cu.stem2, 1.1);
  nouLeaf(500, 1570, 620 * lg, -Math.PI / 2 - 0.2, { w: 92, fat: 0.62, bend: -0.1, c: NOU.tealL, shade: '#6fa49b', sh: [-14, -4], lw: 4.2 });
  nouLeaf(592, 1570, 540 * lg, -Math.PI / 2 + 0.24, { w: 84, fat: 0.62, bend: 0.12, c: NOU.tealL, shade: '#6fa49b', sh: [-13, -4], lw: 4.2 });
  const st = nouStem([[548, 1570], [526, 1380], [566, 1180], [534, 990], [540, 830]], { grow: nouIn(cu.stem2 + 0.05, 1.0), w: 20, tip: 7, c: NOU.olive, lw: 3.6, taper: 2.4 });
  const fk = nouE((st.grow - 0.8) / 0.2);
  if (fk > 0) nouIris(st.tip[0], st.tip[1], 235 * fk, { rot: st.ang, open: nouIn(cu.bloom2, 1.3), breathe: breath() });
  nouPlinth({ c: NOU.teal, n: 5, motif: (x, y, i) => nouPoppy(x, y - 4, i % 2 ? 62 : 78, { c: i % 2 ? NOU.ochre : NOU.rose, shade: i % 2 ? NOU.gold : NOU.roseD, breathe: breath() }) });
  // the dragonfly is where it was; it loops once towards the flower and settles again
  const sw = Math.sin(Math.PI * nouIn(cu.swoop, 1.1)), hv = nouHover('fly', 9);
  nouDragonfly(FLY.x + hv[0] - 70 * sw, FLY.y + hv[1] - 90 * sw, FLY.r, { rot: -0.5 - 0.5 * sw + hv[2], flap: Math.sin(TT * TAU * 6), curl: Math.sin(TT * 2.1) });
  nouCaption('An *iris* in gold', { hi: NOU.teal, at: 0.75 });
}
