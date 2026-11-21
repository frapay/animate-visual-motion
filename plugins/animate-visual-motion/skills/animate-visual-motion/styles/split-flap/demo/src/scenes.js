// =====================================================================
//  SCENES — split-flap demo. The board is 16 x 18 cells of 60 x 84 px from (60, 256); a scene is one board program
//  (flapBoard) drawn at time TT. Content sits in columns 0–13 and rows 0–13 (x 60–900, y 256–1432); row 13 is the
//  caption's. Pictures count HALF rows (hrow): each cell has a top and a bottom flap.
// =====================================================================
flapSetup({ clock: 6 * 3600 + 59 * 60 + 57 });                 // the board says 06:59:57 at t = 0, so 07:00:00 lands on the bridge
const cu = TIMELINE.cues;
// the bridge objects: 7 x 10 half-cell pictures on the same spot (columns 7–13, half rows 4–13 = rows 2–6)
const PIC = { col: 7, hrow: 4 };
const SUN_MAP = ['..yyy..', '.yyyyy.', 'yyyyyyy', 'yyyyyyy', 'yyyyyyy', 'yyyyyyy', 'yyyyyyy', 'yyyyyyy', '.yyyyy.', '..yyy..'];
const HEART_MAP = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '.rrrrr.', '..rrr..', '..rrr..', '...r...'];
// rays round the picture, as two maps on an 11 x 14 patch (2 columns and 2 half rows of margin): near and far
const RAYS_A = ['.....y.....', '...........', '...........', '...........', '...........', '...........', 'y.........y', 'y.........y', '...........', '...........', '...........', '...........', '...........', '.....y.....'];
const RAYS_B = ['...........', '...........', '.y.......y.', '...........', '...........', '...........', '...........', '...........', '...........', '...........', '...........', '.y.......y.', '...........', '...........'];
const RAY = { col: PIC.col - 2, hrow: PIC.hrow - 2 };
const STRAY = [[0, 2, 4, 6], [0, 14, 15, 14], [11, 0, 15, 1]];   // where idle cells may re-flip: left of the picture, under the caption, top right
// a band of green chevrons along the bottom (half rows 30-34, under the phone UI): it marches one column a beat
const CHEV = ['g..', '.g.', '..g', '.g.', 'g..'], CHEV_AT = { col: 0, hrow: 30 };
const chevMap = (step, dir) => CHEV.map((s) => { let o = ''; for (let c = 0; c < FLAP_G.cols; c++) o += s[mod(dir * c - step, 4)] || '.'; return o; });
const chevMarch = (b, t0, t1, dir, first) => { let n = 0; for (let t = t0; t < t1 - 1e-6; t += 0.5, n++) { if (n) b.pic(t, CHEV_AT.col, CHEV_AT.hrow, chevMap(n - 1, dir), { erase: true, flips: 1, wave: 'none' }); b.pic(t, CHEV_AT.col, CHEV_AT.hrow, chevMap(n, dir), n || !first ? { flips: 1, wave: 'none' } : { flips: 2, wave: 'lr', gap: 0.025 }); } };

// ---- era 1: departures
const BOARD_A = flapBoard('depart', (b) => {
  b.text(cu.title, 0, 0, 'DEPARTURES', { flips: 5, gap: 0.035 });
  b.clock(cu.clock, 3.2, 0, 1, { gap: 0.03 });
  b.pic(cu.sun, PIC.col, PIC.hrow, SUN_MAP, { flips: 3, gap: 0.05 });                        // from the middle outward
  [RAYS_A, RAYS_B, RAYS_A, RAYS_B, RAYS_A].forEach((m, i, all) => {                          // the rays step out and back on the 8ths
    if (i) b.pic(cu.rays + i * 0.25, RAY.col, RAY.hrow, all[i - 1], { erase: true, flips: 1, wave: 'none' });
    b.pic(cu.rays + i * 0.25, RAY.col, RAY.hrow, m, { flips: 1, wave: 'none' });
  });
  b.text(cu.list, 0, 11, 'LISBOA   07:10', { gap: 0.03 });
  b.text(cu.gate, 8, 11, 'GATE 4', { flips: 3, gap: 0.03 });                                 // the time turns over to the gate
  b.sprite(FLAP_BIRD, [[cu.bird, 0, 16], [cu.hop1, 1, 14], [cu.hop1 + 0.125, 2, 16], [cu.hop2, 3, 14], [cu.hop2 + 0.125, 4, 16]]);
  chevMarch(b, 0.25, 3.0, 1, true);                                                          // this way out
  STRAY.forEach((box, i) => b.stray(0.4, 2.3, { n: 3, box, key: 'a' + i }));
});
function sceneDepart() {
  flapScene(BOARD_A);
  flapCaption('EVERY *GOODBYE*', { row: 13, at: 0.5 });
}

// ---- era 2: arrivals. The heart, the clock and the bird are already there when the window opens
const BOARD_B = flapBoard('arrive', (b) => {
  b.pic(-2, PIC.col, PIC.hrow, HEART_MAP);
  b.clock(2.5, 6, 0, 1);
  b.sprite(FLAP_BIRD, [[-2, 4, 16], [cu.hop3, 5, 14], [cu.hop3 + 0.125, 6, 16], [cu.hop4, 7, 14], [cu.hop4 + 0.125, 8, 16], [cu.hop5, 8, 14], [cu.hop5 + 0.125, 8, 16]]);
  b.text(cu.arrive, 0, 0, 'ARRIVALS', { flips: 5, gap: 0.035 });
  b.text(cu.landed, 0, 11, 'LISBOA  LANDED', { gap: 0.03 });
  [0, 1, 2, 3].forEach((i) => {
    b.flick(cu.beat + i * 0.5, PIC.col, PIC.hrow, HEART_MAP, 'w', { gap: 0.05, from: [10, 4.2] });   // a heartbeat: white runs out from the middle
    const m = i % 2 ? RAYS_B : RAYS_A, pal = { y: i % 2 ? 'w' : 'r' };
    b.pic(cu.beat + 0.25 + i * 0.5, RAY.col, RAY.hrow, m, { pal, flips: 1, wave: 'none' });          // and sparks answer on the off-beat
    b.pic(cu.beat + 0.5 + i * 0.5, RAY.col, RAY.hrow, m, { erase: true, flips: 1, wave: 'none' });
  });
  b.pic(-2, CHEV_AT.col, CHEV_AT.hrow, chevMap(0, -1)); b.pic(3.5, CHEV_AT.col, CHEV_AT.hrow, chevMap(0, -1), { erase: true, flips: 1, wave: 'none' });
  chevMarch(b, 3.5, 6.0, -1, false);                                                         // this way in: the chevrons turn round
  STRAY.forEach((box, i) => b.stray(3.6, 5.9, { n: 3, box, key: 'b' + i }));
});
function sceneArrive() {
  flapScene(BOARD_B);
  flapCaption('FLIPS TO *HELLO*', { row: 13, at: 0.75 });
}
