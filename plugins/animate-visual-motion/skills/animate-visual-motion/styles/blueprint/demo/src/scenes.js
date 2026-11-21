// =====================================================================
//  SCENES — blueprint demo. World units = px at zoom 1; time TT on 1s.
//  Content kept inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
const GEAR = { x: 500, y: 770, rt: 215, rr: 172, n: 12 };
const PIN = { x: 500 + 292 * Math.cos(210 * DEG), y: 770 + 292 * Math.sin(210 * DEG), rt: 118, rr: 76, n: 6 };
const BULB = { x: 500, y: 690, r: 200 };
const HERO = { x: 826, y: 1135, r: 122 };
// the gear stands still while it is drawn, then eases into a turn (anticlockwise)
const gearRot = () => { const t = Math.max(0, TT - cu.spin); return -0.55 * t * t / (t + 0.35); };

function jangka(o = {}) {
  const { x, r } = HERO, T = 0.42;
  const hopU = o.hop != null ? seg(TT, o.hop, o.hop + T) : 0, hop = Math.sin(hopU * Math.PI) * 90;
  const land = o.hop != null && TT > o.hop + T ? Math.exp(-(TT - o.hop - T) * 14) : 0;
  bpHero(x, HERO.y - hop, r, { key: 'jangka', look: o.look ?? -0.8, lookY: o.lookY ?? -0.7, mood: o.mood, squash: -0.16 * land, spread: hop > 1 ? 0.3 - 0.12 * Math.sin(hopU * Math.PI) : undefined });
}

// ---- era 1: how a gear works
function sceneGear() {
  bpSheet();
  const G = GEAR, rot = gearRot();
  // construction first (on the sheet from frame 0): centre lines, a scale bar, a registration cross
  bpCentre(G.x, G.y, G.rt + 62, G.rt + 62);
  bpScale(110, 1205, 280, { to: '100 MM' });
  bpCross(250, 1100, 16);
  // the pinion that the gear drives (thinner, pale cyan: the secondary part)
  bpCentre(PIN.x, PIN.y, PIN.rt + 30, PIN.rt + 30, { frac: ev(cu.pin, 0.3), a: 0.6 });
  bpDraw(bpGearPts(PIN.x, PIN.y, PIN.rt, PIN.rr, PIN.n, -2 * rot), BP.cyan, cu.pin + 0.05, 0.55, { closed: true, w: BP_W.part });
  bpDraw(bpCirclePts(PIN.x, PIN.y, 28, 32, -2 * rot), BP.cyan, cu.pin + 0.35, 0.3, { closed: true, w: BP_W.thin });
  // the gear: a faint wash, the outline, the pitch circle, the hub with its keyway, six lightening holes
  const gp = bpGearPts(G.x, G.y, G.rt, G.rr, G.n, rot);
  bpFill(gp, BP.line, 0.06 * ev(cu.gear + 0.7, 0.4));
  bpDraw(gp, BP.line, cu.gear, 0.85, { closed: true });
  bpDraw(bpCirclePts(G.x, G.y, 195, 96, -Math.PI / 2), BP.cyan, cu.gear + 0.45, 0.5, { closed: true, dash: 'centre', w: 2, a: 0.8, pen: false });
  bpDraw(bpCirclePts(G.x, G.y, 56, 48, rot), BP.line, cu.hub, 0.35, { closed: true, w: BP_W.part });
  bpDraw(xform([[-13, -55], [-13, -74], [13, -74], [13, -55]], G.x, G.y, rot), BP.line, cu.hub + 0.2, 0.25, { w: BP_W.part, pen: false });
  for (let k = 0; k < 6; k++) { const a = rot + (k * 60 + 30) * DEG; bpDraw(bpCirclePts(G.x + Math.cos(a) * 114, G.y + Math.sin(a) * 114, 25, 28, a), BP.line, cu.hub + 0.1 + k * 0.06, 0.3, { closed: true, w: BP_W.thin }); }
  // its measure
  bpDim(G.x - G.rt, G.y, G.x + G.rt, G.y, 'Ø 430', { off: 280, gap: 240, frac: ev(cu.dim, 0.6) });
  // it turns: a dashed arc whose dashes march, with an arrowhead
  const fa = ev(cu.spin, 0.4);
  if (fa > 0) {
    const a1 = 16 * DEG;
    bpLine(bpCirclePts(G.x, G.y, 254, 24, 56 * DEG, a1), BP.cyan, { dash: 'hidden', w: 3, frac: EZ.o2(fa), march: 70 });
    if (fa >= 1) bpArrow(G.x + Math.cos(a1 - 0.05) * 254, G.y + Math.sin(a1 - 0.05) * 254, Math.atan2(-Math.cos(a1), Math.sin(a1)), 26, BP.cyan);
  }
  // the one thing pointed out: a tooth, in amber, counted by a callout that follows it round
  const fc = ev(cu.call, 0.6);
  if (fc > 0) {
    const a = rot + 11 * TAU / G.n;
    bpLine(bpGearTooth(G.x, G.y, G.rt, G.rr, G.n, rot, 11), BP.amber, { w: 7.5, frac: EZ.o2(ev(cu.call, 0.3)) });
    bpCallout(G.x + Math.cos(a) * (G.rt + 12), G.y + Math.sin(a) * (G.rt + 12), 716, 486, '12 GIGI', { c: BP.amber, frac: fc });
  }
  jangka({ hop: cu.call, mood: TT > cu.call && TT < cu.call + 0.8 ? 'wow' : 'smile' });
  bpTag('01', 'RODA GIGI', { sub: 'SKALA 1:2', at: -1 });
  bpCaption('RODA GIGI\n*MEMUTAR* DINAMO');
}

// ---- era 2: the lamp it lights
const RAYS = [222, 246, 270, 294, 318];
function sceneBulb() {
  bpSheet({ c: BP.paper2 });
  const { x, y, r } = BULB, P = bpBulbPts(x, y, r), lit = ev(cu.lit, 0.2), pulse = Math.exp(-mod(TT - cu.lit, BEAT) * 5);
  bpCentre(x, y + r * 0.3125, 0, r * 1.4375);
  // the current: a dashed wire whose dashes march into the base
  bpLine([[-80, 1180], [x, 1180], [x, y + r * 1.78 + 26]], BP.cyan, { dash: 'hidden', w: 3, march: 110, a: 0.9 });
  bpArrow(x, y + r * 1.78 + 4, -Math.PI / 2, 26, BP.cyan);
  bpText('ARUS', 112, 1160, 30, BP.cyan);
  // the glass: a wash; once lit, an amber pool inside the glass
  bpFill(P, BP.line, 0.05);
  if (lit > 0) { ctx.save(); bpPath(bpCirclePts(x, y, r - 3, 60), true); ctx.clip(); bpWash(x, y + r * 0.05, r * 1.05, BP.amber, (0.26 + 0.12 * pulse) * lit); ctx.restore(); }
  // the screw base in section, its threads, the glass stem (hidden line), the support wires
  const base = [[x - r * 0.36, y + r * 1.12], [x + r * 0.36, y + r * 1.12], [x + r * 0.36, y + r * 1.62], [x + r * 0.16, y + r * 1.78], [x - r * 0.16, y + r * 1.78], [x - r * 0.36, y + r * 1.62]];
  bpHatch(base, BP.cyan, { gap: 13, a: 0.5, frac: ev(cu.base, 0.5) });
  bpDraw([[x - r * 0.36, y + r * 1.12], [x + r * 0.36, y + r * 1.12]], BP.line, cu.base, 0.2, { w: BP_W.part, pen: false });
  for (let i = 0; i < 4; i++) { const yy = y + r * (1.24 + i * 0.11); bpDraw([[x - r * 0.36, yy + 9], [x + r * 0.36, yy - 9]], BP.line, cu.base + 0.08 + i * 0.07, 0.22, { w: BP_W.thin }); }
  bpDraw([[x - r * 0.15, y + r * 1.12], [x - r * 0.09, y + r * 0.56], [x + r * 0.09, y + r * 0.56], [x + r * 0.15, y + r * 1.12]], BP.cyan, cu.stem, 0.35, { dash: 'hidden', w: 2.6, pen: false });
  for (const s of [-1, 1]) bpDraw([[x + s * r * 0.07, y + r * 0.56], [x + s * r * 0.3, y + r * 0.05]], BP.line, cu.stem + 0.1, 0.3, { w: BP_W.thin });
  bpLine(P, BP.line, { closed: true });
  // the filament, in amber: the thing this drawing is about
  const coil = []; for (let i = 0; i <= 80; i++) { const u = i / 80; coil.push([x + (u - 0.5) * r * 0.6, y + r * 0.05 - Math.sin(u * TAU * 5) * r * 0.085]); }
  bpDraw(coil, BP.amber, cu.fil, 0.5, { w: 5.5 });
  RAYS.forEach((d, i) => {
    const k = EZ.back(ev(cu.lit + i * 0.03, 0.25)); if (k <= 0) return;
    const a = d * DEG, r0 = r + 36, r1 = r0 + (34 + 16 * pulse) * k;
    bpLine([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], BP.amber, { w: 4.5 });
  });
  // the parts, named
  bpCallout(x + Math.cos(335 * DEG) * r, y + Math.sin(335 * DEG) * r, 770, 520, 'KACA', { frac: ev(cu.kaca, 0.5) });
  bpCallout(x + r * 0.3, y + r * 0.05, 750, 760, 'FILAMEN', { c: BP.amber, frac: ev(cu.lit + 0.05, 0.5) });
  bpCallout(x + r * 0.36, y + r * 1.37, 700, 1000, 'ULIR', { frac: ev(cu.ulir, 0.5) });
  bpDim(x, y - r, x, y + r * 1.78, '110 MM', { off: 280, gap: 44, frac: ev(cu.dim2, 0.6) });
  jangka({ hop: cu.lit, mood: TT > cu.lit && TT < cu.lit + 0.9 ? 'wow' : 'smile' });
  bpTag('02', 'LAMPU PIJAR', { sub: 'SKALA 1:1' });
  bpCaption('DAN LAMPU PUN\n*MENYALA*');
}
