// =====================================================================
//  SCENES — constellation demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1500.
//  Era 1: a drifting sky, a full moon, a boat of stars. Era 2: the sky turning about a ringed planet, a bird of stars.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const MOON = { x: 742, y: 520, r: 106 };
const PLANET = { x: 540, y: 990, r: 104 };
const moonPts = () => ellipsePts(MOON.x, MOON.y, MOON.r, MOON.r, 0, 48);
const planetPts = () => ellipsePts(PLANET.x, PLANET.y, PLANET.r, PLANET.r, 0, 48);
const HERO_R = 36;
// the hero rides a figure's pen; its tail points back along the way it came
function heroOnPen(fig, times, o = {}) {
  const p = cstTimed(times), a = cstFigurePen(fig.points, fig.edges, p), b = cstFigurePen(fig.points, fig.edges, cstTimed(times, TT - 0.05));
  const moving = Math.hypot(a[0] - b[0], a[1] - b[1]) > 1.5;
  return { x: a[0], y: a[1], dir: moving ? Math.atan2(b[1] - a[1], b[0] - a[0]) : o.rest ?? Math.PI * 0.75, tail: moving ? 1.15 : 0.7, p };
}

// ---- era 1: stars become a boat
function sceneBintang() {
  const rock = Math.sin(TT * 2.1) * smooth(1.9, 2.5, TT);                    // once the boat is whole it rocks on the waves
  const BOAT = cstBoat(470, 1150 + 5 * rock, 1.45);
  cstSky({ dx: -9 * TT, dy: 3 * TT, rot: 0.35 });                             // the sky drifts slowly past (background life)
  cstGrid({ pole: [1260, -420], r0: 620, dr: 250, n: 8, spokes: 36, rot: 0.08 });
  cstEcliptic(-40, 1590, 1120, 1500, -70);
  cstCluster(186, 690, 44, 9, 'c1');                                           // a small cluster twinkling (background life)
  cstShoot(TT - cu.shoot1, { from: [150, 420], to: [520, 640], len: 330 });   // a shooting star (background life)
  // the full moon: it must be clear of everything at the bridge
  cstMoon(MOON.x, MOON.y, MOON.r, { glow: 0.9 + 0.12 * Math.sin(TT * 2.2) });
  // dotted waves under the hull, running left (they fade up with the picture)
  const wa = smooth(1.9, 2.4, TT);
  for (let k = 0; k < 2; k++) { const P = []; for (let i = 0; i <= 30; i++) { const x = 110 + i * 25; P.push([x, 1296 + k * 26 + 7 * Math.sin(x * 0.03 + TT * 3 + k * 1.7)]); } cstDotted(P, { al: 0.42 * wa * (1 - k * 0.3), gap: 10 }); }
  // the boat: eight faint stars; the pen (and the hero) lights them one by one and the lines join them
  const h = heroOnPen(BOAT, BOAT_T, { rest: Math.PI * 0.6 });
  cstFigure(BOAT.points, BOAT.edges, { progress: h.p, ghost: 0.55, illus: BOAT.illus, illusAl: smooth(1.9, 2.5, TT), labels: true, key: 'perahu' });
  // Kejora flies in from the left, lights the stars, then hovers by the mast top, pleased
  const inn = EZ.o3(seg(TT, 0, cu.first)), done = TT >= cu.boat, hov = smooth(cu.boat, cu.boat + 0.3, TT);
  const hx = lerp(lerp(130, h.x, inn), h.x - 112, hov), hy = lerp(lerp(930, h.y, inn), h.y - 66, hov);
  cstHero(hx, hy, HERO_R, { key: 'kejora', dir: TT < cu.first ? Math.PI * 0.85 : h.dir, tail: done ? 0.6 : h.tail, mood: done ? 'happy' : 'smile', look: done ? [0.6, 0.5] : [0.4, 0.2], bob: done, al: seg(TT, 0.02, 0.2) });
  cstDim(1 - EZ.o2(seg(TT, 0, 0.45)));                                         // the sky fades up
  cstTag('Bintang');
  cstCaption('Bintang jadi *perahu*');
}

// ---- era 2: a sky full of signs
function sceneLangit() {
  const t = TT - 3;
  const BIRD = cstBird(545, 575, 1.15);
  cstSky({ pole: [PLANET.x, PLANET.y], rot: 1.9 + 0.022 * t });               // the whole sky turns slowly about the planet (background life)
  cstGrid({ pole: [PLANET.x, PLANET.y], r0: 470, dr: 190, n: 6, spokes: 24, rot: 0.022 * t, al: 0.1 });
  cstCluster(150, 770, 40, 8, 'c2');
  cstShoot(TT - cu.shoot2, { from: [928, 1010], to: [650, 1270], len: 330 }); // a shooting star (background life)
  // the chart ring draws round the planet, then keeps turning
  cstRing(PLANET.x, PLANET.y, 300, { frac: EZ.io(seg(TT, cu.ring - 0.2, cu.ring + 0.8)), rot: -Math.PI / 2 + 0.05 * t, labels: [[0, '6h'], [180, '18h']] });
  // two moons on one orbit (background life); the far half of the orbit is drawn first
  const ORB = [PLANET.x, PLANET.y, 236, 72, -0.28], moons = [[-0.42 + 1.05 * t, 15, CST.moon], [2.6 + 1.05 * t, 10, CST.warm]].map(([a, r, c]) => [...cstOrbitPt(...ORB, a), r, c]);
  cstOrbit(...ORB, { dash: 5, al: 0.4 * seg(TT, 3.2, 3.6) });
  moons.filter((m) => !m[2]).forEach(([x, y, , r, c]) => cstMoon(x, y, r, { c, glow: 0.5, key: 'm' + r }));
  const rk = EZ.o3(seg(TT, 3.17, 3.75));                                       // the ring forms once the window has opened
  cstPlanet(PLANET.x, PLANET.y, PLANET.r, { ring: { al: rk, s: lerp(0.72, 1, rk) }, key: 'pl' });
  moons.filter((m) => m[2]).forEach(([x, y, , r, c]) => cstMoon(x, y, r, { c, glow: 0.5, key: 'm' + r }));
  // the bird: ten stars lit by the hero
  const h = heroOnPen(BIRD, BIRD_T, { rest: Math.PI * 0.3 });
  cstFigure(BIRD.points, BIRD.edges, { progress: h.p, ghost: 0.55 * seg(TT, 3.2, 3.6), illus: BIRD.illus, illusAl: smooth(5.3, 5.85, TT), labels: true, key: 'burung' });
  // Kejora rises from beside the planet to the beak, lights the bird, then hovers above the wing tip, amazed
  const inn = EZ.io(seg(TT, 3.3, cu.bird0)), done = TT >= cu.bird, hov = smooth(cu.bird, cu.bird + 0.3, TT);
  const hx = lerp(lerp(250, h.x, inn), h.x + 96, hov), hy = lerp(lerp(840, h.y, inn), h.y + 40, hov);
  cstHero(hx, hy, HERO_R, { key: 'kejora', dir: TT < cu.bird0 ? Math.PI * 0.45 : h.dir, tail: done ? 0.6 : h.tail, mood: done ? 'happy' : TT > cu.shoot2 && TT < cu.shoot2 + 0.5 ? 'wow' : 'smile', look: done ? [-0.7, 0.4] : [0.3, -0.3], bob: done || TT < cu.bird0, al: seg(TT, 3.25, 3.45) });
  cstTag('Langit', { c: CST.warm });
  cstCaption('Langit penuh *tanda*');
}
