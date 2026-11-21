// =====================================================================
//  SCENES — islamic-geometric demo. World units = px at 1080x1920; time TT on 1s, smooth eases.
//  Text and the hero stay inside x 60-940, y 250-1500; ornament may run to the frame edge.
// =====================================================================
const cu = TIMELINE.cues;
const MOON = { x: 500, y: 700, r: 150 };
const DOME = { x: 500, yb: 905, w: 300, h: 300 };
const moonY = () => lerp(MOON.y + 70, MOON.y, EZ.o3(ev(cu.moon, 1.3)));
function skyGrad(top, bot, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
}
const archWin = (x, yb, w, h, c, o = {}) => igShape(igArchPts(x, yb, w, h, { point: 0.4, ...o }), c);

// ---- era 1: the night city
// The rosette is a real compass construction, so every line meets a point the step before it made:
//   1 a master circle (R0) round the moon          2 eight circles on it, one per 16th note; neighbours cross
//   3 two squares in the master circle (the khatam; their inner octagon frames the moon)
//   4 the outer khatam: its tips are exactly where neighbouring circles cross, its notches sit on the squares' corners
const ROS = (() => { const R0 = 236, k = 1 / igStarRi(8); return { R0, R1: R0 * k, rc: R0 * Math.sqrt(1 + k * k - 2 * k * Math.cos(Math.PI / 8)) }; })();
function rosette(x, y) {
  const { R0, rc, R1 } = ROS, c = TIMELINE.cues, sw = (t0, d) => EZ.io(ev(t0, d));
  ctx.save(); ctx.strokeStyle = IG.goldL; ctx.lineWidth = igHair(1.5); ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
  const u0 = sw(c.moon, 0.5);
  if (u0 > 0) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(x, y, R0, -Math.PI / 2, -Math.PI / 2 + TAU * u0); ctx.stroke(); }
  for (let k = 0; k < 8; k++) {
    const u = sw(c.rosette + k * E16, 0.45); if (u <= 0) continue;
    const a = -Math.PI / 2 + k * Math.PI / 4, cx = x + Math.cos(a) * R0, cy = y + Math.sin(a) * R0;
    ctx.globalAlpha = 0.36; ctx.beginPath(); ctx.arc(cx, cy, rc, a + Math.PI, a + Math.PI + TAU * u); ctx.stroke();
    ctx.globalAlpha = 0.8 * clamp(u * 4); ctx.fillStyle = IG.goldL; ctx.beginPath(); ctx.arc(cx, cy, igHair(3.2), 0, TAU); ctx.fill();   // the compass point
  }
  ctx.strokeStyle = IG.gold;
  for (let q = 0; q < 2; q++) {   // the two squares
    const u = sw(c.squares + q * E8, 0.5); if (u <= 0) continue;
    const S = []; for (let i = 0; i <= 4; i++) { const a = -Math.PI / 2 + q * Math.PI / 4 + i * Math.PI / 2; S.push([x + Math.cos(a) * R0, y + Math.sin(a) * R0]); }
    ctx.globalAlpha = 0.9; ctx.lineWidth = igHair(2.6);
    if (u >= 1) igPoly(S.slice(0, 4)); else igPoly(subPath(S, u), false);
    ctx.stroke();
  }
  const u2 = sw(c.outer, 0.5);
  if (u2 > 0) {
    const S = igStarPts(x, y, R1, 8, { rot: -Math.PI / 2 + Math.PI / 8 });
    ctx.globalAlpha = 0.75; ctx.lineWidth = igHair(2.2);
    if (u2 >= 1) igPoly(S); else igPoly(subPath([...S, S[0]], u2), false);
    ctx.stroke();
  }
  const u3 = ev(c.done, 0.35);   // the eight tips light up on the beat
  if (u3 > 0) for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + Math.PI / 8 + k * Math.PI / 4, px = x + Math.cos(a) * R1, py = y + Math.sin(a) * R1;
    ctx.globalAlpha = 1; igPoly(igStarPts(px, py, 11 * EZ.back(u3), 8)); ctx.fillStyle = IG.goldL; ctx.fill();
  }
  ctx.restore();
}
function skyline(yb) {
  const c = IG.tealD, lit = (i) => 0.6 + 0.4 * Math.sin(TT * TAU * 0.35 + i * 1.7);
  ctx.fillStyle = c;
  // houses at the edges
  for (const [x, w, h] of [[-20, 150, 190], [110, 90, 120], [860, 110, 150], [950, 160, 230]]) ctx.fillRect(x, yb - h, w, h);
  igMinaret(175, yb, 54, 470, { c, trim: null, cap: c });
  igMinaret(835, yb, 50, 420, { c, trim: null, cap: c });
  // the mosque: side wings with small domes, a wall, a drum and the great dome
  for (const sx of [-1, 1]) { ctx.fillRect(500 + sx * 260 - 60, yb - 120, 120, 120); igShape(igDomePts(500 + sx * 260, yb - 120, 110, 92), c); }
  ctx.fillRect(300, yb - 210, 400, 210);
  ctx.fillRect(370, yb - 250, 260, 44);
  igShape(igDomePts(500, yb - 248, 230, 196), c);
  igFinial(500, yb - 448, 70, c);
  // lit arched windows, each breathing at its own pace
  const wins = [[350, yb - 40, 34, 80], [425, yb - 40, 34, 80], [575, yb - 40, 34, 80], [650, yb - 40, 34, 80], [500, yb - 30, 60, 130],
    [240, yb - 30, 30, 56], [760, yb - 30, 30, 56], [175, yb - 250, 16, 34], [835, yb - 220, 16, 34], [30, yb - 110, 28, 48], [1000, yb - 140, 28, 48], [880, yb - 70, 26, 44]];
  wins.forEach(([x, y, w, h], i) => { ctx.globalAlpha = lit(i); archWin(x, y, w, h, IG.goldL); ctx.globalAlpha = 1; });
}
function sceneNight() {
  skyGrad(IG.night, IG.nightL, 0, 1500);
  igStars(20, 40, 1060, 1150, 110, { key: 'night', avoid: [[MOON.x, MOON.y, 250], [170, 295, 130], [200, 455, 120]] });
  const my = moonY();
  rosette(MOON.x, my);
  // the full moon: a soft halo, then a flat glazed disc with a fine gold rim
  const g = ctx.createRadialGradient(MOON.x, my, MOON.r * 0.9, MOON.x, my, MOON.r * 2.0);
  g.addColorStop(0, igRGBA(IG.goldL, 0.38)); g.addColorStop(1, igRGBA(IG.goldL, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(MOON.x, my, MOON.r * 2.0, 0, TAU); ctx.fill();
  const mg = ctx.createRadialGradient(MOON.x - 40, my - 45, 10, MOON.x, my, MOON.r);
  mg.addColorStop(0, IG.ivory); mg.addColorStop(1, IG.goldL);
  ctx.beginPath(); ctx.arc(MOON.x, my, MOON.r, 0, TAU); ctx.fillStyle = mg; ctx.fill();
  ctx.beginPath(); ctx.arc(MOON.x, my, MOON.r, 0, TAU); igStroke(IG.gold, 3);
  // lanterns hanging from the top edge
  igLantern(650, -10, 150, 66, { amp: 0.05, f: 0.32, ph: 0.4 });
  igLantern(790, -10, 250, 84, { amp: 0.04, f: 0.27, ph: 1.9 });
  igLantern(935, -10, 160, 60, { amp: 0.06, f: 0.36, ph: 3.1 });
  skyline(1530);
  // the frieze: woven strapwork constructing itself along the bottom. Three whole rows of tiles (s = 120) fill the
  // band exactly, so no star is cut by the border; its layout shows as a faint underdrawing from the first frame.
  const fr = [[-10, 1560], [W + 10, 1560], [W + 10, H + 10], [-10, H + 10]];
  igPattern(fr, { s: 120, ox: 500, oy: 1740, ground: IG.tealD, oct: IG.lapis, sq: IG.terra, inner: IG.turq, strap: IG.gold, prog: EZ.io(ev(cu.frieze, 1.8)), sheen: true, ghost: IG.goldL });
  igBand(-10, W + 10, 1528, 32, { cx: 500, ground: IG.lapisD, c: IG.gold, c2: IG.turq });
  ctx.fillStyle = IG.ink; ctx.fillRect(-10, 1560, W + 20, 3);
  // the hero glides in from the left and settles in the corner the rosette leaves free
  if (TT > cu.hero) {
    const hx = springMove(cu.hero, -120, 200, SPRING.heavy), hy = springMove(cu.hero, 640, 455, SPRING.heavy) + Math.sin(TT * TAU * 0.5) * 8;
    igHero(hx, hy, 58, { n0: 8 });
  }
  igTag('Malam');
  igCaption('Bulan purnama bersinar', { y: 1420 });
}

// ---- era 2: the masjid by day
function domeTiled(d) {
  const P = igDomePts(d.x, d.yb, d.w, d.h);
  igShape(P, IG.turq);
  ctx.save(); igPoly(P); ctx.clip();
  igPattern(P, { s: 64, ox: d.x, oy: d.yb - d.h * 0.45, lines: IG.turqL, w: 2, al: 0.55 });
  // ribs and a soft glaze highlight on the left
  ctx.beginPath();
  for (const f of [-0.6, -0.2, 0.2, 0.6]) { const Q = igBez([d.x + f * d.w / 2, d.yb], [d.x + f * d.w / 2 * 1.16, d.yb - d.h * 0.5], [d.x + f * d.w * 0.05, d.yb - d.h * 0.7], [d.x, d.yb - d.h], 18); ctx.moveTo(Q[0][0], Q[0][1]); Q.forEach((p) => ctx.lineTo(p[0], p[1])); }
  igStroke(IG.gold, 2.2, { hair: true });
  const g = ctx.createLinearGradient(d.x - d.w / 2, 0, d.x + d.w / 2, 0);
  g.addColorStop(0, 'rgba(255,250,235,0)'); g.addColorStop(0.28, 'rgba(255,250,235,0.22)'); g.addColorStop(0.45, 'rgba(255,250,235,0)'); g.addColorStop(1, 'rgba(10,26,36,0.18)');
  ctx.fillStyle = g; ctx.fillRect(d.x - d.w, d.yb - d.h, d.w * 2, d.h);
  ctx.restore();
  igPoly(P); igStroke(IG.gold, 3.5, { join: 'round' });
  ctx.fillStyle = IG.gold; ctx.fillRect(d.x - d.w / 2 - 8, d.yb - 6, d.w + 16, 10);
  igFinial(d.x, d.yb - d.h + 4, 120, IG.gold);
}
function voussoirArch(cx, yb, w, h, horse) {   // the great arch: a ring of constant width in striped voussoirs on two columns
  const I = igArchPts(cx, yb, w, h, { horse, point: 0.35 }), O = igOffset(I, 30);
  const hw = w / 2, e = hw * 0.35, R = hw + e, ys = yb - (h - Math.sqrt(R * R - e * e)), jx = -e + R * Math.cos(horse), jy = ys + R * Math.sin(horse);
  const a0 = Math.atan2(jy - ys, jx), N = 21;   // an odd count: a keystone on the axis, the same colour at both feet
  ctx.save();
  ctx.beginPath();
  for (const Q of [O, I]) { ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.closePath(); }
  ctx.clip('evenodd');
  ctx.fillStyle = IG.cream; ctx.fillRect(cx - hw - 80, yb - h - 80, w + 160, h + 160);
  const A = Math.PI - a0, span = Math.PI + 2 * a0;
  for (let k = 0; k < N; k += 2) {
    ctx.beginPath(); ctx.moveTo(cx, ys); ctx.arc(cx, ys, 600, A + k * span / N, A + (k + 1) * span / N); ctx.closePath(); ctx.fillStyle = IG.terra; ctx.fill();
  }
  ctx.fillStyle = IG.cream; ctx.fillRect(cx - hw - 80, jy, w + 160, yb - jy + 40);          // the columns under the springing
  ctx.fillStyle = IG.gold; ctx.fillRect(cx - hw - 80, jy - 5, w + 160, 12);                  // capitals
  ctx.fillStyle = IG.terra; ctx.fillRect(cx - hw - 80, jy + 7, w + 160, 5);
  ctx.fillStyle = IG.gold; ctx.fillRect(cx - hw - 80, yb - 22, w + 160, 6);                  // bases
  ctx.restore();
  igPoly(O); igStroke(IG.ink, 5, { join: 'round' }); igPoly(O); igStroke(IG.gold, 2.5, { join: 'round' });
  return I;
}
function domeGlints(d) {   // "berkilau": small glints wink on and off along the dome's lit side
  const pts = [[-0.22, 0.62], [0.12, 0.8], [-0.3, 0.3], [0.2, 0.42], [0.02, 0.2]];
  pts.forEach(([fx, fy], i) => {
    const u = mod(TT * 0.55 + i * 0.37, 1), a = Math.sin(clamp(u / 0.45) * Math.PI);
    if (a <= 0.02) return;
    ctx.globalAlpha = a; star4(d.x + fx * d.w, d.yb - fy * d.h, 10 + 12 * a, IG.ivory); ctx.globalAlpha = 1;
  });
}
function sceneMasjid() {
  skyGrad('#f7ecd3', '#ecd5a8', 0, 1380);
  igPattern([[-300, -300], [W + 300, -300], [W + 300, 1380], [-300, 1380]], { s: 210, ox: 500, oy: 760, lines: IG.sand, w: 2.4, al: 0.7 });
  // minarets
  const kl = (x, y, w, h) => { ctx.strokeStyle = IG.goldD; ctx.lineWidth = igHair(1.6); ctx.strokeRect(x, y, w, h); };   // cream on cream needs a keyline
  for (const x of [95, 905]) igMinaret(x, 1380, 56, 800, { c: IG.cream, trim: IG.gold, win: IG.lapis, cap: IG.turq, line: IG.goldD });
  // dome on its drum
  ctx.fillStyle = IG.cream; ctx.fillRect(335, DOME.yb, 330, 78); kl(335, DOME.yb, 330, 78);
  for (let i = 0; i < 6; i++) archWin(370 + i * 52, DOME.yb + 50, 22, 38, IG.lapis);   // clear of the merlons below
  domeTiled(DOME);
  domeGlints(DOME);
  // the facade: a cream wall, stepped merlons, an alfiz (frame) around the great arch
  ctx.fillStyle = IG.cream; ctx.fillRect(150, 990, 700, 390); kl(150, 990, 700, 390);
  for (let i = 0; i < 14; i++) { const x = 150 + i * 50; igShape([[x + 6, 990], [x + 6, 966], [x + 18, 966], [x + 18, 956], [x + 32, 956], [x + 32, 966], [x + 44, 966], [x + 44, 990]], IG.terra); }
  ctx.fillStyle = IG.terra; ctx.fillRect(150, 990, 700, 12); ctx.fillStyle = IG.gold; ctx.fillRect(150, 1002, 700, 4);
  ctx.fillStyle = IG.lapis; ctx.fillRect(318, 1012, 364, 368);
  ctx.strokeStyle = IG.gold; ctx.lineWidth = 4; ctx.strokeRect(324, 1018, 352, 362);
  for (const sx of [-1, 1]) {   // a khatam set in each spandrel
    const px = 500 + sx * 142, py = 1054;
    igPoly(igStarPts(px, py, 22, 8)); ctx.fillStyle = IG.gold; ctx.fill();
    igPoly(igStarPts(px, py, 12, 8, { rot: -Math.PI / 2 + Math.PI / 8 })); ctx.fillStyle = IG.turq; ctx.fill();
  }
  const I = voussoirArch(500, 1380, 250, 322, 0.28);
  const prog = EZ.io(ev(cu.arch, 1.5));
  // zellige: the centre of construction is the star just under the lantern, so the lantern never hides it
  igPattern(I, { s: 96, ox: 500, oy: 1204, ground: IG.tealD, oct: IG.turq, sq: IG.terra, inner: IG.ivory, strap: IG.gold, prog, sheen: true, sheenSpeed: 0.3, ghost: IG.goldL });
  igPoly(I); igStroke(IG.ink, 8, { join: 'round' }); igPoly(I); igStroke(IG.gold, 4.5, { join: 'round' });
  igLantern(500, 1064, 26, 44, { amp: 0.07, f: 0.3, ph: 0.8 });
  // side windows with mashrabiya lattice
  for (const x of [235, 765]) {
    const P = igArchPts(x, 1330, 104, 200, { point: 0.4, horse: 0.18 });
    igPattern(P, { s: 30, ox: x, oy: 1240, ground: IG.lapisD, lines: IG.gold, w: 2.6, al: 1 });
    igPoly(P); igStroke(IG.ink, 7, { join: 'round' }); igPoly(P); igStroke(IG.gold, 4, { join: 'round' });
  }
  // the courtyard floor: settled tiles
  const fl = [[-300, 1380], [W + 300, 1380], [W + 300, H + 300], [-300, H + 300]];
  igPattern(fl, { s: 120, ox: 500, oy: 1700, ground: IG.sand, oct: IG.cream, sq: IG.terraL, inner: IG.turq, strap: IG.gold, key: IG.goldD, bw: 5 });
  const fg = ctx.createLinearGradient(0, 1400, 0, H + 100);   // the court falls away from the wall: a little shade toward the viewer
  fg.addColorStop(0, 'rgba(143,106,34,0)'); fg.addColorStop(1, 'rgba(143,106,34,0.3)');
  ctx.fillStyle = fg; ctx.fillRect(-300, 1400, W + 600, H);
  igBand(-300, W + 300, 1374, 30, { cx: 500, ground: IG.terra, c: IG.goldL, c2: IG.cream });
  // the hero rises from the dome's tip and gains points
  if (TT > cu.star) {
    const hx = springMove(cu.star, 500, 290, SPRING.smooth), hy = springMove(cu.star, 600, 500, SPRING.smooth) + Math.sin(TT * TAU * 0.5) * 7;
    const r = 66 * clamp(EZ.back(ev(cu.star, 0.45)), 0, 2);
    igHero(hx, hy, r, { n0: 8, n1: 12, gain: ev(cu.gain, 0.5), ring: TT > cu.ring ? ev(cu.ring, 0.9) : 0 });
    if (TT > cu.ring) for (let k = 0; k < 6; k++) {   // small sparkles drifting off the new points
      const a = k / 6 * TAU + 0.3, u = mod((TT - cu.ring) * 0.6 + k * 0.17, 1);
      ctx.globalAlpha = Math.sin(u * Math.PI); star4(hx + Math.cos(a) * (100 + u * 50), hy + Math.sin(a) * (100 + u * 50), 10, IG.gold); ctx.globalAlpha = 1;
    }
  }
  igTag('Masjid', { c: IG.lapisD, at: 0.7 });
  igCaption('Kubah masjid berkilau', { y: 1440, at: 0.75 });
}
