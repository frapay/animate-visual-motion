// =====================================================================
//  SCENES — flat-vector demo. World units = px at zoom 1; time TT on 1s; every entrance on a spring.
//  Content kept inside x 60-940, y 250-1500. Era 1 on the cream ground, era 2 on navy.
// =====================================================================
const cu = TIMELINE.cues;
const BULB = { x: 500, y: 690, r: 175 };
const GLOBE = { x: 500, y: 720, r: 200 };
const FLOOR_Y = 1262;
const fvNum = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // 12.480 (id-ID)

// a badge disc with the object's long shadow clipped inside it (the classic flat-icon setting)
function badgeDisc(x, y, r, c, t0, inner) {
  const s = fvPop(t0, SPRING.smooth); if (s <= 0.001) return;
  const P = fvCirclePts(x, y, r * s, 96);
  fvShape(P, c);
  ctx.save(); fvPath(P); ctx.clip(); inner(); ctx.restore();
}
// floaters: [kind, x, y, size, colour, phase]
const FLOAT1 = [
  ['circle', 140, 520, 34, FV.yellowL, 0.2], ['ring', 880, 470, 50, FV.blueL, 1.1], ['plus', 165, 800, 40, FV.tealL, 2.3],
  ['square', 880, 790, 36, FV.blueL, 0.7], ['tri', 840, 1010, 34, FV.yellowL, 1.9], ['circle', 120, 1080, 22, FV.blueL, 2.9],
  ['star', 720, 400, 30, FV.yellow, 0.4],
];
const FLOAT2 = [
  ['star', 130, 450, 26, FV.yellow, 0.1], ['star', 880, 420, 20, FV.white, 1.4], ['star', 860, 1000, 24, FV.yellowL, 2.2],
  ['star', 150, 980, 18, FV.white, 0.9], ['star', 300, 380, 14, FV.blueL, 2.7], ['star', 720, 360, 16, FV.white, 3.3],
  ['circle', 905, 860, 22, FV.yellowL, 1.7], ['ring', 110, 690, 40, FV.teal, 0.5],
];
function floaters(list, t0) {
  list.forEach(([k, x, y, s, c, ph], i) => fvPopIn(t0 + i * 0.06, x, y, () => fvFloater(k, x, y, s, c, { ph, amp: 10 + (i % 3) * 4 }), SPRING.playful));
}

// ---- era 1: the idea
const FV_CARD = { k: 210, d: 21 };   // UI cards: a tiny overshoot (about 4%), then still
function chartVals() {   // the bars tick to a new reading every beat after the card lands
  const keys = [[0, 0, 0, 0]], R = RNG('fvchart');
  keys.push([cu.card + 0.15, 0.35, 0.55, 0.45]);
  for (let t = 1.0; t < 3.0; t += BEAT) keys.push([t, R.r(0.3, 0.6), R.r(0.55, 0.95), R.r(0.4, 0.8)]);
  return [1, 2, 3].map((j) => springTrack(keys.map((k) => [k[0], k[j]]), SPRING.snappy));
}
function sceneIdea() {
  fvGround(FV.cream);
  floaters(FLOAT1, -1);   // the first frame already holds the set: floor, disc, floaters and the hero, waiting
  fvPill(90, FLOOR_Y - 22, 820, 44, FV.creamD);
  // the bulb on its badge disc, with a long shadow inside the disc; it switches on at cu.on (and swells with a kick)
  const on = EZ.o2(ev(cu.on, 0.12)), baseY = BULB.y + BULB.r * 1.4;
  const bs = fvPop(cu.bulb, SPRING.playful) * (1 + fvKick(cu.on, 0.07));
  badgeDisc(BULB.x, BULB.y + 40, 290, FV.creamD, -1, () => {   // the shadow grows with the bulb, never pops
    if (bs > 0.02) fvLongShadow(fvBulbPts(BULB.x, BULB.y, BULB.r).concat([[BULB.x, BULB.y + BULB.r * 2.1]]).map(([px, py]) => [BULB.x + (px - BULB.x) * bs, baseY + (py - baseY) * bs]), 420 * clamp(bs), FV.creamDD);
  });
  if (on > 0) fvRays(BULB.x, BULB.y, BULB.r + 32, 66, cu.on, { n: 7, w: 20 });
  if (bs > 0.001) { ctx.save(); ctx.translate(BULB.x, baseY); ctx.scale(bs, bs); ctx.translate(-BULB.x, -baseY); fvBulb(BULB.x, BULB.y, BULB.r, { on }); ctx.restore(); }
  // the chart card: lands on the floor, its bars tick every beat; a +42% badge pops just after the light comes on
  const cx = 742, cy = 1140;
  fvPopIn(cu.card, cx, FLOOR_Y, () => {
    fvIcon('chart', cx, cy, 260, { vals: chartVals(), lip: 13 });
    fvPopIn(cu.badge, cx + 110, cy - 108, () => { fvPill(cx + 46, cy - 136, 132, 56, FV.teal, { lip: 5 }); fvText('+42%', cx + 112, cy - 98, 30, FV.white, { align: 'center', maxW: 108 }); }, SPRING.playful);
  }, FV_CARD);
  // the speech bubble: "Aha!" typed, then a blinking cursor
  fvPopIn(cu.chat, 262, 968, () => {
    const x0 = 96, y0 = 838, w = 226, h = 96;
    fvShape([[x0 + w * 0.56, y0 + h - 4], [x0 + w * 0.8, y0 + h - 4], [x0 + w * 0.74, y0 + h + 34]], FV.white);
    fvRect(x0, y0, w, h, 30, FV.white, { lip: 8 });
    const str = 'Aha!', n = Math.floor(clamp((TT - cu.chat - 0.18) * 14, 0, str.length));
    const tw = fvText(str.slice(0, n), x0 + 34, y0 + 64, 46, FV.navy, { maxW: w - 80 });
    if (n === str.length ? mod(TT, 0.5) < 0.25 : true) fvRect(x0 + 40 + tw, y0 + 26, 7, 46, 3, FV.navy);
  }, SPRING.playful);
  // the hero is there from the first frame, watching the disc; it hops when the bulb lights
  fvMascot(250, FLOOR_Y, 240, { key: 'hero', hop: cu.on, look: [0.55, -0.7], mood: TT > cu.on - 0.05 && TT < cu.on + 0.95 ? 'wow' : 'smile' });
  fvTag('01', 'IDE', { dark: false });
  fvCaption('Semua dimulai\ndari *satu ide*', { dark: false, y: 1452, size: 72, at: 0.75 });
}

// ---- era 2: the world
function orbitPt(th) { const rot = -0.2, x = Math.cos(th) * 340, y = Math.sin(th) * 92; return [GLOBE.x + x * Math.cos(rot) - y * Math.sin(rot), GLOBE.y + 40 + x * Math.sin(rot) + y * Math.cos(rot)]; }
function orbitIcons(front) {
  const kinds = ['check', 'chat', 'gear'];
  kinds.forEach((k, i) => {
    const th = -Math.PI / 2 + 0.5 + i * TAU / 3 + (TT - 3) * 0.55, isFront = Math.sin(th) > -0.05;
    if (isFront !== front) return;
    const [x, y] = orbitPt(th), depth = 0.82 + 0.18 * Math.sin(th), t0 = cu.icons + i * E16;
    fvPopIn(t0, x, y, () => {
      ctx.save(); ctx.translate(x, y); ctx.scale(depth, depth); ctx.translate(-x, -y);
      fvIcon(k, x, y, 132, { frac: ev(t0 + 0.2, 0.3), dots: true, rot: TT * 1.6, lip: 7 });
      ctx.restore();
    }, SPRING.playful);
  });
}
function orbitRing(back) {
  const fr = EZ.io(ev(cu.orbit, 0.6)); if (fr <= 0) return;
  const P = []; for (let i = 0; i <= 96; i++) { const th = (back ? Math.PI : 0) + i / 96 * Math.PI; P.push(orbitPt(th)); }
  fvStroke(subPath(P, fr), back ? '#3a4590' : '#5463c0', 6 / fvZoom());
}
function sceneWorld() {
  fvGround(FV.navy);
  floaters(FLOAT2, 3.1);
  fvPopIn(3.0, CX, FLOOR_Y, () => fvPill(90, FLOOR_Y - 22, 820, 44, FV.navyD), SPRING.smooth);
  badgeDisc(GLOBE.x, GLOBE.y, 300, FV.navyL, 3.0, () => fvLongShadow(fvGlobePts(GLOBE.x, GLOBE.y, GLOBE.r), 420, FV.navyD));
  orbitRing(true); orbitIcons(false);
  fvGlobe(GLOBE.x, GLOBE.y, GLOBE.r, { spin: (TT - 3) * 0.45 });
  orbitRing(false); orbitIcons(true);
  // the counter card: users ticking up (the number shrinks to fit the card; fonts differ in width)
  const x0 = 528, y0 = 1084, w = 374, h = 156;
  fvPopIn(cu.notif, x0 + w / 2, FLOOR_Y, () => {
    fvRect(x0, y0, w, h, 32, FV.white, { lip: 12, lipC: 'rgba(0,0,0,0.35)' });
    fvCircle(x0 + 72, y0 + h / 2, 42, FV.teal, { rim: [-10, -8] });
    fvShape([[x0 + 72, y0 + h / 2 - 22], [x0 + 94, y0 + h / 2 + 6], [x0 + 50, y0 + h / 2 + 6]], FV.white);
    fvRect(x0 + 64, y0 + h / 2, 16, 22, 3, FV.white);
    const n = 12480 * EZ.o3(ev(cu.notif + 0.15, 1.3)) + Math.max(0, Math.floor((TT - cu.notif - 1.45) * 12)) * 7;
    fvText(fvNum(n), x0 + 134, y0 + 84, 52, FV.navy, { maxW: w - 134 - 28 });
    fvText('pengguna', x0 + 136, y0 + 122, 28, FV.inkL, { weight: 600, maxW: w - 136 - 28 });
  }, FV_CARD);
  fvMascot(250, FLOOR_Y, 240, { key: 'hero', pop: cu.hero2, hop: cu.hop2, wave: TT > cu.hero2 + 0.5, look: [0.3, -0.2], dark: true });
  fvTag('02', 'DUNIA', { dark: true });
  fvCaption('lalu tumbuh\njadi *mendunia*', { dark: true, y: 1452, size: 72, at: 0.75 });
}
