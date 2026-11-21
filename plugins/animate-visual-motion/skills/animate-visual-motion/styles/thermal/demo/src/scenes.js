// =====================================================================
//  SCENES — thermal demo. World coordinates 1080x1920; time TT on 1s. Scenes draw TEMPERATURE (0..1) in greyscale;
//  the kit's post pass maps it through the ramp and draws the HUD. Content inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
const THM_SPAN = [[0, 90], [8, 40]];        // each era's span in degrees C (temperature 0 and 1)
const THM_NUC = [cu.nuc];                   // the shutter recalibrates at the bridge
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const MUG = { x: 500, y: 960, w: 290, h: 380 }, CAT = { x: 500, y: 955, r: 235 };
const K = { wall: 0.2, table: 0.165, tea: 0.88, ice: 0.04 }, HL = { wall: 0.3, floor: 0.25 };
// things seen lying on a table or floor are squashed: draw fn round (x, y) with the y axis shortened
const onFloor = (x, y, fn, sq = 0.58) => { ctx.save(); ctx.translate(x, y); ctx.scale(1, sq); fn(); ctx.restore(); };
const PAWS = (() => { const out = []; for (let i = 0; i < 6; i++) { const u = i / 5, x = lerp(905, 655, u), y = lerp(1345, 1248, u) - 26 * Math.sin(u * Math.PI); out.push([x + (i % 2 ? 20 : -20), y + (i % 2 ? 16 : -16)]); } return out; })();
const mouseAt = (t) => (t < cu.mouse ? null : [lerp(74, 318, EZ.o2(seg(t, cu.mouse, cu.mouse + 0.7))), 1118 - 5 * Math.abs(Math.sin(t * 26)) * (t < cu.mouse + 0.7 ? 1 : 0)]);

// ---- era 1: a cold kitchen counter; the kettle pours
function sceneKitchen() {
  const lv = EZ.io(seg(TT, cu.fill, cu.stop)), heat = thmWarm(cu.fill, 0, 1, 0.9);
  thmAmbient(K.wall, { key: 'kitchen', to: K.wall - 0.015 });
  thmPlane(1070, K.table, { far: 0.025 });
  // the glass of ice: a dark hole; cold pools round it on the table
  onFloor(222, 1158, () => thmFrost(0, 0, 215, { grow: 0.45 + 0.55 * thmIn(cu.frost, 2.6), t: 0.075, key: 'ice', n: 8 }), 0.34);
  thmBody([[146, 916], [222, 912], [298, 916], [286, 1146], [222, 1152], [158, 1146]], { t: K.ice, edge: 0.095, soft: 20, bloom: 34, cold: true, halo: 0.3 });
  [[196, 1010, 0.3], [250, 1056, -0.2], [205, 1100, 0.1]].forEach(([x, y, a], i) => thmBlob(x, y + 3 * Math.sin(TT * 1.6 + i * 2), 30, 0.0, { cold: true, hard: 0.5, rot: a, ry: 24 }));   // the cubes bob
  thmSpot(222, 1010, { label: 'Sp1', dx: -136, dy: -124, align: 'left' });
  // a hand rested here a moment ago: its print cools into the table
  onFloor(752, 1300, () => thmPrint(thmHandPts(0, 0, 112, 0.5), { t: 0.62, amb: K.table, age: seg(TT, -0.4, 3.4) }), 0.74);
  // the table warms under the mug
  onFloor(MUG.x, MUG.y + MUG.h / 2 + 4, () => thmBlob(0, 0, 150 + 130 * heat, lerp(K.table, 0.46, heat), { a: 0.9 }), 0.3);
  // the kettle's spout (already hot) and the mug
  thmBody(rrectPts(742, -160, 520, 470, 110), { t: 0.78, edge: 0.6, soft: 70, bloom: 50 });
  thmBody([[706, 214], [760, 262], [800, 318], [700, 440], [592, 566], [556, 580], [526, 574], [520, 552], [560, 470], [640, 330]], { t: 0.92, edge: 0.78, soft: 26, bloom: 40 });
  // a spoon stands in the mug: bare metal reads cold, then heat creeps up it
  thmConduct([[592, 800], [640, 742], [716, 652]], { w: 15, t0: 0.8, t1: 0.52, base: 0.13, frac: seg(TT, cu.spoon, cu.spoon + 1.7), bloom: 18 });
  thmBlob(722, 645, 15, 0.13, { cold: true, hard: 0.5, a: 0.9 * (1 - seg(TT, cu.spoon + 1.2, cu.spoon + 1.9)) });
  const m = thmMug(MUG.x, MUG.y, MUG.w, MUG.h, { level: lv, heat, hot: K.tea, cold: 0.27 });
  // the stream: its front falls, it runs while the mug fills, its cut end falls
  thmPour(533, 566, m.rim[0] + 6, m.rim[1] + 4, { w: 17, t: 0.98, bend: -14, head: seg(TT, cu.pour, cu.pour + 0.25), tail: seg(TT, cu.stop, cu.stop + 0.22) });
  if (TT > cu.fill && TT < cu.stop + 0.2) thmBlob(m.rim[0] + 6, m.rim[1] + 4, 34 + 6 * Math.sin(TT * 30), 1, { ry: 14, a: 0.9 });   // where it lands
  // steam off the tea
  thmSteam(MUG.x, m.rim[1] - 6, { h: 320, w: 70, r: 32, t: 0.56, a: 0.8 * clamp(lv * 1.5), from: cu.steam, n: 3, m: 6, key: 'tea' });
  thmTag('kitchen');
  thmCaption('Pour the *heat*', { at: 0.5 });
}

// ---- era 2: a hallway at night; the warm one
function sceneHall() {
  thmAmbient(HL.wall, { key: 'hall', to: HL.wall - 0.02 });
  thmPlane(1096, HL.floor, { far: 0.03 });
  ctx.fillStyle = thmC(HL.wall - 0.035); ctx.fillRect(-W, 1070, W * 3, 26);                                   // the skirting board
  // a cold window, and the draught that falls from it
  thmFrost(214, 800, 250, { grow: thmIn(cu.draught, 2.3), t: 0.12, key: 'draught', sy: 1.25, a: 0.85 });
  thmBody(rrectPts(96, 400, 236, 304, 8), { t: 0.19, edge: 0.22, soft: 12, bloom: 44, cold: true, halo: 0.26 });
  for (const [x, y] of [[112, 416], [220, 416], [112, 558], [220, 558]]) thmBody(rrectPts(x, y, 96, 130, 4), { t: 0.035, edge: 0.07, soft: 16, bloom: 0 });
  // the radiator: the pipe heats, then each fin from the bottom up, one after another
  const rh = thmIn(cu.rad, 2.0);
  thmConduct([[1010, 1058], [724, 1058]], { w: 16, t0: 1, t1: 0.9, base: 0.32, frac: seg(TT, cu.rad - 0.2, cu.rad + 0.8), bloom: 18 });
  for (let i = 0; i < 5; i++) { const x = 846 - i * 27; thmConduct([[x, 1044], [x, 730]], { w: 21, t0: 0.99, t1: 0.74, base: 0.33, frac: seg(TT, cu.rad + i * 0.14, cu.rad + 1.1 + i * 0.14), bloom: 26 }); }
  thmSteam(792, 724, { h: 250, w: 60, r: 44, t: 0.44, a: 0.4 * rh, n: 2, m: 5, speed: 0.3, from: cu.rad + 0.5, key: 'rad' });
  thmSpot(792, 776, { label: 'Sp1', dx: -104, dy: -82, align: 'left' });
  // it walked in: paw prints cool behind it, the oldest first
  PAWS.forEach(([x, y], i) => onFloor(x, y, () => thmPrint(thmPawPts(0, 0, 40, -1.05), { t: 0.64, amb: HL.floor, age: seg(TT, 2.4 + i * 0.4, 5.6 + i * 0.4) })));
  // a mouse runs along the wall and stops; its trail fades
  const mp = mouseAt(TT);
  if (mp) { thmTrail(mouseAt, { r: 26, ry: 16, t: 0.6, amb: HL.wall, n: 9, dt: 0.045 }); thmBlob(mp[0], mp[1], 27, 0.86, { ry: 17, hard: 0.3 }); thmBlob(mp[0] + 20, mp[1] - 4, 13, 0.95, { hard: 0.3 }); thmConduct([[mp[0] - 22, mp[1] + 4], [mp[0] - 58, mp[1] + 9 + 4 * Math.sin(TT * 9)]], { w: 5, t0: 0.6, t1: 0.42, bloom: 0 }); }
  // the cat: the tail swishes, an ear turns to the mouse, the head follows, a slow blink
  const look = -(thmIn(cu.ear, 0.3) - thmIn(5.75, 0.25));
  thmCat(CAT.x, CAT.y, CAT.r, { tail: Math.sin(TT * 2.6), ear: Math.sin(Math.PI * seg(TT, cu.ear - 0.2, cu.ear + 0.1)), look, blink: TT >= cu.blink && TT < cu.blink + 0.13 });
  thmTag('hallway');
  thmCaption('Find the *cat*', { at: 0.75 });
}
