// =====================================================================
//  SCENES — infographic demo. World units = px at zoom 1; time TT on 1s. Content inside x 60-940, y 250-1500.
//  ALL NUMBERS ARE INVENTED for the demo (a fictional class of ten): the screen says "data ilustrasi".
//  Colour: teal = pupils who had breakfast, grey = the rest, coral = the number the story follows (70%, then the
//  busiest day) and the hero, indigo = the weekly trend, amber = the ticking marker.
// =====================================================================
const cu = TIMELINE.cues;
const CARD1 = { x: 60, y: 490, w: 880, h: 470 };
const GRID1 = { x: 110, y: 536, w: 780, rowH: 206, s: 124 };
const DONUT = { x: 222, y: 1176, r: 108, w: 46 };
const CARD2 = { x: 60, y: 440, w: 880, h: 590 };
const CARD3 = { x: 60, y: 1052, w: 880, h: 250 };
const HERO_R = 25;
const DAYS = [{ v: 5, label: 'Sen' }, { v: 6, label: 'Sel' }, { v: 9, label: 'Rab' }, { v: 7, label: 'Kam' }, { v: 4, label: 'Jum' }];
const WEEKS = [4.8, 5.1, 5.0, 5.6, 5.9, 6.2];

// ---- era 1: the survey, 7 of 10
function sceneSurvey() {
  igGround();
  igCard(CARD1.x, CARD1.y, CARD1.w, CARD1.h);
  igTick(CARD1.x + 50, CARD1.x + CARD1.w - 50, CARD1.y + CARD1.h - 26);          // background life: the marker steps on every 8th
  // the isotype array: ten pupils, seven take colour, one per 8th note
  const g = igPictoGrid('person', GRID1.x, GRID1.y, GRID1.w, cu.fill, { n: 10, cols: 5, filled: 7, stagger: 0.25, c: IG.teal, s: GRID1.s, rowH: GRID1.rowH, tIn: -0.6 });
  // the same seven as a donut and as the big number: all three driven by g.value, so they move and finish together
  const solid = igIn(cu.solid, 0.25);
  const dn = igDonut(DONUT.x, DONUT.y, DONUT.r, DONUT.w, [{ v: 7, c: IG.teal }], 0, {
    total: 10, u: g.value / 7, fill: solid,
    centre: { to: 7, v: g.count, size: 76, c: solid > 0.5 ? IG.white : IG.ink, label: 'dari 10', labelC: solid > 0.5 ? IG.white : IG.grey },
  });
  igLabel('sudah sarapan', 420, 1092, 30, IG.grey);
  igCounter(420, 1250, 190, 70, 0, { v: g.count * 10, suffix: '%', pop: g.cells.slice(0, 7).map((c) => c.t) });
  igLegend(420, 1306, [{ c: IG.teal, label: 'sarapan' }, { c: IG.greyL, label: 'belum' }], { t0: 0.25 });
  // the hero stands on the head being counted, then hops onto the donut
  const tops = g.cells.slice(0, 7).map((c) => [c.top[0], c.top[1] - 4]);
  const P = [...tops, [dn.top[0], dn.top[1] - 2]], T = [...g.cells.slice(0, 7).map((c) => c.t), cu.perch];
  const h = igHops(P, T, 70, 0.2, { wait: true });
  igHero(h.x, h.y, HERO_R, { key: 'hero', squash: h.squash, look: TT < cu.last ? 0.5 : -0.3, mood: TT >= cu.last && TT < cu.solid ? 'wow' : 'pin' });
  igTitle('Survei kelas', 'Siapa yang sarapan\nsebelum sekolah?', { at: -1 });
  igSource('Data ilustrasi: kelas fiksi, 10 siswa', { y: 1362, at: -1 });
  igCaption('*7 dari 10* sudah sarapan', { at: 0.75 });
}

// ---- era 2: which day
function sceneDays() {
  igGround();
  igCard(CARD2.x, CARD2.y, CARD2.w, CARD2.h);
  igCard(CARD3.x, CARD3.y, CARD3.w, CARD3.h, { t0: 3.5 });
  igLabel('siswa sarapan', 100, 508, 30, IG.grey, { al: igIn(3.4, 0.4) });
  igTick(560, 880, 500, { n: 8, every: 0.25 });                                  // background life
  const ch = igColumns(90, 470, 820, 540, DAYS, cu.cols, { hi: 2, max: 10, ticks: 5, hiIn: true, top: 120, stagger: 0.1, c: IG.teal });
  // the weekly trend: the line draws on, the average under its head counts with it
  if (TT >= 3.6) {
    const ln = igLine(500, 1070, 400, 212, WEEKS, cu.line, { d: cu.lineEnd - cu.line, axis: false, min: 4.5, max: 6.3, area: true, c: IG.indigo, labels: ['Mgg 1', null, null, null, null, 'Mgg 6'], axisT: 3.7 });
    igLabel('rata-rata', 100, 1112, 30, IG.grey, { al: igIn(3.7, 0.4) });
    const ct = igCounter(100, 1236, 104, 6.2, 0, { v: TT < cu.line ? WEEKS[0] : ln.v, dec: 1, c: IG.ink, al: igIn(3.7, 0.4), pop: [cu.lineEnd] });
    igDelta(ct.right + 28, 1198, '29%', { t0: cu.chip });
  }
  // the hero: pops up on the card's edge, then lands on the coral column on cu.land
  const col = ch.cols[2], perch = [860, CARD2.y], land = [col.x, col.top - 2];
  const h = igHops([perch, land], [3.5, cu.land], 24, 0.3, { wait: false });
  if (h) igHero(h.x, h.y, 34 * clamp(igSpr(3.5, SPRING.playful), 0, 1.15), { key: 'hero2', squash: h.squash, look: TT < cu.land ? -0.6 : 0.2, mood: TT >= cu.land && TT < cu.land + 0.75 ? 'wow' : 'pin' });
  igTitle('Per hari', 'Hari apa paling ramai?');
  igSource('Data ilustrasi: kelas fiksi, 10 siswa', { y: 1362 });
  igCaption('Rabu paling ramai: *9 siswa*', { at: 0.75 });
}
