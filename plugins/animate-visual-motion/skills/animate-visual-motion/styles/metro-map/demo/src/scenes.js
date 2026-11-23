// =====================================================================
//  SCENES — metro-map demo. World units = px at zoom 1; time TT on 1s. What matters stays inside x 60-940, y 250-1500.
//  Era 1 is a close ride down the red line (camera at 1.15, following the train); era 2 is the whole map at zoom 1.
// =====================================================================
const cu = TIMELINE.cues;

// ---- era 1 geometry (its own world): the red line snakes down through three stations, then goes on as "planned"
const RIDE = mmPath([400, 620], 'S 160', 'SE 100', 'S 200', 'SW 100', 'S 160', 'S 240', 'SE 90', 'S 500');
const F_PRO = mmFracAt(RIDE, [400, 1340]), F_LAT = F_PRO / 2;      // Proyek; Latihan is halfway along (500, 980)
const F_NEXT = mmFracAt(RIDE, [400, 1520]);                         // the next stop, not built yet
const RIDE_LINE = { t0: cu.line, d: cu.st3 - cu.line, to: F_PRO };  // the head passes Latihan at st2, Proyek at st3
const RIVER1 = mmRoute([[-200, 850], [240, 850], [360, 730], [1300, 730]], { r: 120 });
const CROSS = mmPath([-200, 1210], 'E 840', 'NE 120', 'E 700');     // a yellow line crossing behind
const HALO = { x: 400, y: 1340, r: 96 };                            // the station that swells under the train: bridge shape A
const rideNow = () => mmRide([[0, 0], [cu.arr1, F_LAT, cu.arr1 - cu.dep1], [cu.arr2, F_PRO, cu.arr2 - cu.dep2]]);

function sceneRide() {
  mmView(428, 1340);
  mmGround();
  mmZone(150, 120, 630, 320, { label: 'ZONA PEMULA', at: 'br' });
  mmWater(RIVER1, 90, { label: 'Sungai Ragu', at: 0.56 });                       // background life 1: the dashes drift
  mmPark(80, 930, 210, 190, { label: 'Taman Ide', at: 'bl' });
  mmLine(CROSS, MM.yellow);
  mmTrain(CROSS, lerp(0.04, 0.8, TT / 3), { color: MM.yellow, bg: true, key: 'cross', len: 104 });   // life 2: a train passes on the other line
  mmSign(400, 500, 'Belajar mandiri', MM.red, { bullet: 'A' });
  mmLine(RIDE, MM.plan);                                                         // the planned route
  mmLine(RIDE, MM.red, RIDE_LINE);
  // stations: Dasar is there from the start; the others pop as the line's head passes them
  const out = 1 - ev(cu.halo, 0.125);                                              // Proyek's label makes room for the swelling station
  const pL = mmAt(RIDE, F_LAT), pP = mmAt(RIDE, F_PRO), pN = mmAt(RIDE, F_NEXT);
  mmStation(pN[0], pN[1], { future: true, name: 'Karier', side: 'right' });
  mmStation(400, 620, { terminus: true, name: 'Dasar', sub: 'kenal bentuk & warna', side: 'right' });
  mmYearTag(400, 620, 'BULAN 1', { side: 'left', gap: 58 });
  mmStation(pL[0], pL[1], { t0: mmArrive(RIDE, F_LAT, RIDE_LINE), name: 'Latihan', sub: '30 menit tiap hari', side: 'right', visited: TT > cu.dep2 });
  mmYearTag(pL[0], pL[1], 'BULAN 3', { side: 'left', t0: cu.arr1 });
  ctx.save(); ctx.globalAlpha = out;
  mmStation(pP[0], pP[1], { t0: mmArrive(RIDE, F_PRO, RIDE_LINE), name: 'Proyek', sub: 'karya pertama', side: 'right' });
  mmYearTag(pP[0], pP[1], 'BULAN 6', { side: 'left', t0: cu.arr2 });
  ctx.restore();
  // the station under the train swells into a big station disc (the morph starts from it)
  if (TT > cu.halo) {
    const z = 1.15, r = HALO.r * springEase(TT - cu.halo, 220, 24);
    mmDisc(HALO.x, HALO.y, r + (MM_RING.band + MM_RING.ring) / z, MM.ink); mmDisc(HALO.x, HALO.y, r + MM_RING.band / z, MM.white);
  }
  // the hero: waits at each station on the beat, eases out and into the next
  const ride = rideNow();
  mmTrain(RIDE, ride.frac, { squash: ride.squash, key: 'hero' });
  mmTitle('JALUR A', 'Rute belajar desain', { bullet: [MM.red, 'A'] });
  mmCaption('Belajar itu *perjalanan*', { at: 0.5 });
}

// ---- era 2 geometry: the whole map. Red and blue share a corridor (side by side, 4px apart) below the interchange.
const RED2 = mmPath([300, 500], 'S 160', 'SE 126', 'S 214', 'SW 100', 'S 180');
const BLUE2 = mmPath([1160, 600], 'W 520', 'SW 184', 'S 276', 'SE 120', 'S 100');
const XA = [426, 900], XB = [456, 900];                              // the interchange joins these two points
const F_XR = mmFracAt(RED2, XA), F_XB = mmFracAt(BLUE2, XB), F_KELAS = mmFracAt(BLUE2, [800, 600]);
const RIVER2 = mmRoute([[-100, 1192], [690, 1192], [790, 1092], [1300, 1092]], { r: 100 });
const XCH = { x: 441, y: 900, w: 250, h: 150 };                      // bridge shape B: a big interchange capsule
const BLUE_IN = { t0: cu.blue, d: cu.join - cu.blue, to: F_XB };     // the blue line comes in and reaches the interchange at join
const mapRide = () => mmRide([[3.0, F_XR], [cu.arr3, 1, cu.arr3 - cu.dep3]]);

function sceneMap() {
  mmView(428, 1500);
  mmGround();
  mmZone(560, 470, 480, 240, { label: 'ZONA B', at: 'tl' });
  mmWater(RIVER2, 64, { label: 'Sungai Ragu', at: 0.17 });                       // life 1: drifting dashes
  mmPark(70, 690, 190, 170, { label: 'Taman Ide', at: 'bl' });
  mmLine(RED2, MM.plan); mmLine(BLUE2, MM.plan);                                 // the planned network
  mmLine(BLUE2, MM.blue, BLUE_IN);
  mmLine(BLUE2, MM.blue, { t0: cu.ext, d: cu.term - cu.ext, from: F_XB });
  mmLine(RED2, MM.red, { to: F_XR });                                            // the part already travelled
  mmLine(RED2, MM.red, { t0: cu.ext, d: cu.term - cu.ext, from: F_XR });
  mmTrain(BLUE2, lerp(0, 0.52, seg(TT, 3.6, 6.0)), { color: MM.blue, bg: true, key: 'blue', len: 104 });   // life 2: the blue line's train
  // stations
  mmStation(300, 500, { terminus: true, name: 'Dasar', side: 'right' });
  mmStation(300, 592, { visited: true, name: 'Latihan', side: 'right' });
  const pk = mmAt(BLUE2, F_KELAS);
  mmStation(pk[0], pk[1], { t0: mmArrive(BLUE2, F_KELAS, BLUE_IN), name: 'Kelas', side: 'top' });
  mmInterchange(XA, XB, { seed: true, t0: cu.join, name: 'Proyek', sub: 'ganti jalur', side: 'left', dx: -14 });
  const endR = mmAt(RED2, 1), endB = mmAt(BLUE2, 1);
  mmStation(endR[0], endR[1], { terminus: true, t0: cu.term, name: 'Karier', side: 'right', dx: 26 });
  mmStation(endB[0], endB[1], { terminus: true, t0: cu.term, name: 'Freelance', side: 'right' });
  mmLegend(606, 800, [{ c: MM.red, ch: 'A', label: 'Belajar mandiri' }, { c: MM.blue, ch: 'B', label: 'Bareng mentor' }], { title: 'JALUR', t0: cu.legend });   // life 3: its bullets tick
  // the hero leaves the interchange and stops with its nose on the terminus; "you are here" lands with it
  const ride = mapRide();
  mmTrain(RED2, ride.frac, { squash: ride.squash, key: 'hero' });
  mmHere(endR[0], endR[1], { t0: cu.arr3, color: MM.red, label: 'DI SINI', side: 'left', spread: 1.6 });   // life 4: it pulses
  mmTitle('PETA JALUR', 'Tujuan: karier', { bullet: [MM.red, 'A'], at: 0.5 });
  mmCaption('Dua jalur, satu *tujuan*', { at: 0.75 });
}
