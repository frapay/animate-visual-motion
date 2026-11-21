// =====================================================================
//  SCENES — aurora demo. World coordinates 1080x1920; time TT on 1s. Every scene starts with its mesh (aurMesh), then
//  ribbons, hairlines, the objects, and last the type (which draws after the camera, at screen size).
//  Content inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: two orbs of the same size. Nothing else may overlap them at the bridge.
const ORB_A = { x: 540, y: 1100, r: 188, c: '#ff7a4a' }, ORB_B = { x: 520, y: 800, r: 188, c: '#2fdcb2' };
const RING = { r: 310, tilt: 0.3, rot: -0.38, w: 30 };
// one mesh per era: where each colour field sits (the type's corner stays deep). The kit's morph backdrop reads these too.
const AUR_ERAS = [
  { preset: 'dusk', key: 'dusk', fields: [{ x: 900, y: 1350, r: 800, c: 2, a: 0.95 }, { x: 150, y: 1560, r: 740, c: 1, a: 0.85 }, { x: 1000, y: 560, r: 600, c: 0, a: 0.85 }, { x: 60, y: 980, r: 560, c: 3, a: 0.7 }, { x: 560, y: 1880, r: 620, c: 4, a: 0.8 }] },
  { preset: 'mint', key: 'mint', fields: [{ x: 180, y: 420, r: 760, c: 0, a: 0.85 }, { x: 980, y: 900, r: 420, c: 4, a: 0.45 }, { x: 800, y: 200, r: 680, c: 2, a: 0.8 }, { x: 60, y: 1250, r: 560, c: 3, a: 0.7 }, { x: 1000, y: 1700, r: 520, c: 1, a: 0.7 }] },
];
// where each orb is now: it rises and settles on a soft spring, then floats
const orbA = () => { const [dx, dy] = aurFloat('orbA', 9); return [ORB_A.x + dx, aurRise(cu.rise, ORB_A.y + 430, ORB_A.y) + dy]; };
const orbB = () => { const [dx, dy] = aurFloat('orbB', 8); return [ORB_B.x + dx, ORB_B.y + dy]; };

// ---- era 1: dusk. The teaser.
function sceneDusk() {
  aurMesh(AUR_ERAS[0]);
  const [ox, oy] = orbA(), on = aurIn(cu.orbit, 1.2);
  aurRibbon([[-160, 1430], [240, 1310], [620, 1410], [1240, 1220]], { h: 560, a: 0.62 * aurIn(0, 1.2), cols: ['#8f6bff', '#ff5aa8', '#ffa35c'], amp: 50, key: 'duskA' });
  aurRibbon([[560, 800], [840, 690], [1240, 760]], { h: 330, a: 0.3 * aurIn(0.3, 1.2), cols: ['#6d3bff', '#b06bff'], amp: 30, key: 'duskB' });
  aurMarks('dusk', { a: 0.42, skip: (x, y) => y < 830 || Math.hypot(x - ORB_A.x, y - ORB_A.y) < 240 });
  // hairline orbits round the orb: they draw on, the dashed one turns
  aurHair(ox, oy, 280, { a0: -2.0 + TT * 0.12, frac: on, a: 0.5 });
  aurHair(ox, oy, 372, { a0: -0.45, a1: Math.PI + 0.45, frac: on, a: 0.26, dash: [3, 12], rot: Math.sin(TT * 0.5) * 0.05 });
  aurHair(ox, oy, 470, { a0: 0.3, a1: 1.9, frac: aurIn(cu.orbit + 0.3, 1.2), a: 0.3, dot: 0.3 + 1.6 * aurIn(cu.orbit + 0.3, 1.2) });
  aurDust('dusk', 26, { y0: 760, y1: 1720 });
  aurOrb(ox, oy, ORB_A.r, { c: ORB_A.c });
  // the hero: a small satellite orb circling on the inner orbit
  const sa = -2.7 + TT * 1.05;
  aurHero(ox + Math.cos(sa) * 280, oy + Math.sin(sa) * 280, 30 * aurIn(cu.orbit, 0.7), { key: 'sat', bob: false });
  aurTag('Coming soon');
  aurHeadline('Something\n*brighter*\nis near.', { x: 84, y: 500, size: 128, at: cu.words, stagger: 0.25 });
  aurCaption('See your day in a *new light*', { at: cu.line, y: 1452 });
}

// ---- era 2: mint. The payoff.
function sceneMint() {
  aurMesh(AUR_ERAS[1]);
  const [ox, oy] = orbB(), s = aurRise(cu.ring, 0.5, 1, { k: 60, d: 11 }), ra = aurIn(cu.ring - 0.1, 0.5), R = { ...RING, rot: RING.rot + Math.sin(TT * 0.7) * 0.04 };
  const ringCols = ['#b4ef3a', '#2f9dff', '#62f0c6', '#10c8a6'];
  aurRibbon([[-160, 560], [300, 430], [700, 540], [1240, 380]], { h: 420, a: 0.55, cols: ['#2f9dff', '#35e6c0', '#c2f55a'], amp: 40, key: 'mintA' });
  aurMarks('mint', { a: 0.4, at: 0.5, skip: (x, y) => y > 1040 || Math.hypot(x - ORB_B.x, y - ORB_B.y) < 330 });
  aurHair(ox, oy, 420, { a0: 2.2, a1: 2.2 + TAU * 0.7, frac: aurIn(cu.arcs, 1.3), a: 0.34, dot: 2.2 + TAU * 0.7 * aurIn(cu.arcs, 1.3) });
  aurHair(ox, oy, 500, { a0: -1.2, a1: 0.5, frac: aurIn(cu.arcs + 0.2, 1.2), a: 0.22, dash: [3, 12] });
  aurDust('mint', 24, { y0: 300, y1: 1300 });
  // the orb inside its ring: back half, satellite if it is behind, orb, front half, satellite if it is in front
  const [sx, sy, front] = aurRingPt(ox, oy, RING.r * s, 0.7 + TT * 1.3, R), sat = () => aurHero(sx, sy, 28 * ra, { key: 'sat', bob: false });
  aurRing(ox, oy, RING.r * s, { ...R, w: RING.w * s, half: 'back', a: ra, cols: ringCols });
  if (!front) sat();
  aurOrb(ox, oy, ORB_B.r, { c: ORB_B.c });
  aurRing(ox, oy, RING.r * s, { ...R, w: RING.w * s, half: 'front', a: ra, cols: ringCols });
  if (front) sat();
  aurTag('Out now', { at: 0.6 });
  aurHeadline('Now\n*available.*', { align: 'center', y: 1200, size: 144, at: cu.payoff - 3, stagger: 0.25 });
  aurPill('Get it today', CX, 1452, { at: cu.pill - 3 });
}
