// =====================================================================
//  SCENES — study-notes demo. World units = px at zoom 1; time TT on 2s. Content inside x 60-940, y 250-1500.
//  Baselines sit on the page's rules: snLineY(n) = 336 + 84 n.
// =====================================================================
const cu = TIMELINE.cues;
const BULB = { x: 740, y: 1080, s: 122, R: 175 };                 // the lightbulb and its glow (the bridge's round shape)
const STICKY = { x: 176, y: 500, w: 410, h: 370, rot: -0.05 };      // the sticky note (the bridge's squarish shape)
const PEN_R = 92;

// ---- era 1: two ways to focus
function sceneTips() {
  const pg = snPage();
  snTab(640, SN.pink); snTab(742, SN.mint); snTab(844, SN.lilac);                                  // index tabs on the page edge
  snHeading('3 cara belajar\nlebih fokus', pg.left + 14, snLineY(0), 76, { style: 'box', fill: SN.sky, boxT0: cu.box, hi: { word: 'fokus', color: SN.yellow, t0: cu.headHi } });
  const tips = snBullets([
    { s: 'matikan notifikasi HP', t0: cu.b1, t1: cu.b1 + 0.75, hi: { word: 'notifikasi', color: SN.pink, t0: cu.hi1 } },
    { s: 'satu tugas, satu waktu', t0: cu.b2, t1: cu.b2 + 0.75, hi: { phrase: 'satu tugas,', color: SN.mint, t0: cu.hi2 } },
  ], pg.left, snLineY(3), { marker: 'num', size: 56, lh: 2 * pg.pitch });   // a rule left free between the tips
  snSticky(774, 266, 172, 168, SN.pink, { rot: 0.06, text: 'catat\nini!', size: 44, curl: 0.2 });                          // background life: its corner lifts
  // a taped-in card with a brain doodle, an arrow to the idea
  snCard(180, 935, 250, 275, { t0: cu.card, rot: -0.06, tape: 'stripes', tapeC: SN.mint, draw: () => snDoodle('brain', 0, 14, 86, { t0: cu.card + 0.25, d: 0.75 }) });
  snArrow([420, 912], [BULB.x - 150, BULB.y - 172], cu.bulb, { bow: -0.38, loop: true, d: 0.5 });
  // the lightbulb: drawn on, then its glow (a highlighter blob) pops in behind it
  snBlob(BULB.x, BULB.y - 20, BULB.R, SN.yellow, cu.glow);
  snDoodle('lightbulb', BULB.x, BULB.y, BULB.s, { t0: cu.bulb, d: 1.0, fill: false });
  // background life: margin stars that twinkle
  snDoodle('star', 250, 1290, 30, { twinkle: true, key: 's1' });
  snDoodle('star', 896, 862, 24, { twinkle: true, key: 'star2' });
  snDoodle('heart', 600, 1300, 24, {});
  // the hero writes both tips, hopping from line to line
  const p = snPenAt([tips[0], tips[1]], { from: [pg.left + 40, snLineY(3) - 40] });
  snHero(p.x, p.y, PEN_R, p);
  snCaption('Fokus itu bisa *dilatih*', { at: 0.5 });
}

// ---- era 2: the third way
function sceneBreak() {
  const pg = snPage();
  snTab(640, SN.pink); snTab(742, SN.mint); snTab(844, SN.lilac); snTab(946, SN.yellow, null, { t0: cu.tab });
  // the sticky note (the morph lands on it): the hero writes on it, then underlines the time
  const note = snSticky(STICKY.x, STICKY.y, STICKY.w, STICKY.h, SN.sticky, { rot: STICKY.rot, text: 'istirahat\n5 menit', size: 68, textT0: [cu.note, cu.note2], speed: 30 });
  const l2 = note.lines[1];
  const wavy = snUnderline(l2.a, l2.b, { style: 'wavy', t0: cu.wavy, d: 0.25, w: 5.5, gap: 16 });
  // a clock doodle, its hand going round, and an arrow to it
  snDoodle('clock', 780, 660, 112, { t0: cu.clock, d: 0.75, time: (TT - 3) * 0.35 });
  snArrow([606, 640], [652, 668], cu.clock + 0.5, { bow: -0.4, d: 0.25, head: 18 });
  // the checklist: written on in turn, ticked on consecutive 8ths
  const list = snBullets(['minum air', 'regangkan badan', 'tarik napas'], pg.left, snLineY(8), { marker: 'check', size: 56, t0: cu.list, stagger: 0.25, speed: 34, ticks: [cu.tick1, cu.tick2, cu.tick3] });
  snDoodle('star', 850, snLineY(9) - 20, 36, { twinkle: true, key: 's3' });
  snDoodle('cloud', 760, snLineY(11) + 30, 60, {});
  const p = snPenAt([note.lines[0], l2, wavy, list[0].tick, list[1].tick, list[2].tick], { from: [STICKY.x + 60, STICKY.y + 120], rest: [650, snLineY(10) + 30], restAfter: 0.04, hop: 0.2 });
  snHero(p.x, p.y, PEN_R, p);
  snTitle('cara ke-3', 'Beri otak jeda', { at: 0.5, hi: SN.pink });
  snCaption('Otak juga butuh *jeda*', { at: 1.0, hi: SN.mint });
}
