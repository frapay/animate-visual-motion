// =====================================================================
//  SCENES — terminal demo. Each scene draws inside trmScreen(theme, ...) in CELLS (36 x 32, 30 x 60 px each).
//  Text stays inside columns 2..30 and rows 4..24 (the phone-safe area); rows 0..3 and 25..31 hold only decoration.
// =====================================================================
const CORE = { x: 330, y: 1110, r: 210 };            // the loading core: cells 4..17 x 15..21
const PANEL = { col: 2, row: 12, w: 19, h: 10 };     // the chart panel it becomes

function sceneBoot() {
  const q = TIMELINE.cues;
  trmScreen('green', (t) => {
    trmScan(2, 'nyala');                 // life: a block steps along the top rule
    trmMem(27, 5, 'mem1');               // life: the memory map flickers below
    // the command, typed at 16 characters a second
    trmType(2, 6, '> mulai', q.type, t.hi, { cursor: TT < q.l1 });
    // three checks: the dots tick across, then "oke"
    trmCheck(2, 8, 'periksa memori', q.l1, q.l1 + 0.25, 29);
    trmCheck(2, 9, 'periksa layar', q.l2, q.l2 + 0.25, 29);
    trmCheck(2, 10, 'bangunkan robot', q.l3, q.wake, 29);
    // the progress bar fills cell by cell; the core fills row by row with it
    const u = seg(TT, q.bar, q.done), done = TT >= q.done - 1e-6;
    if (TT >= q.bar - 1e-6) {
      trmPut(2, 12, done ? 'selesai' : 'memuat...', done ? t.hi : t.ink);
      if (!done) trmSpin(12, 12, t.hi);
      trmBar(2, 13, 24, u, t.ink);
      trmPut(27, 13, String(Math.floor(u * 100 + 1e-6)).padStart(3, ' ') + '%', t.hi);
    }
    const P = ellipsePts(CORE.x, CORE.y, CORE.r, CORE.r, 0, 64), rows = 7, lit = Math.floor(u * rows + 1e-6), top = 22 - lit;
    trmFill(P, t.dim, { shade: 0.1 });                                              // the empty shell
    if (lit > 0) trmFill(P, t.ink, { where: (x, y) => y >= top * TRM_CH });        // the lit part, from the bottom up
    // Bit sleeps until its check passes, then wakes with a hop; hops again when loading is done
    const awake = TT >= q.wake - 1e-6, hop = trmHop(q.wake) + trmHop(q.done);
    trmHero(22, 17, { key: 'hero', sleep: !awake, mood: hop ? 'wow' : done ? 'happy' : 'smile', hop });
    if (awake && TT < q.wake + 0.5) trmSet(28, 17, '!', TRM.amber);
    trmTag('01', 'HIDUPKAN');
    trmCaption('komputer sedang *menyala*', { at: 0.5 });
  });
}

const LOG = ['sensor oke', 'motor  oke', 'kamera oke', 'suara  oke', 'lampu  oke', 'roda   oke', 'memori oke', 'layar  oke'];
function sceneDash() {
  const q = TIMELINE.cues;
  trmScreen('cyan', (t) => {
    trmScan(2, 'dasbor', { rate: 24 });
    trmMem(27, 5, 'mem2');
    // status light, top right
    trmSet(24, 4, '●', trmBlink(0.5) ? t.hi : t.dim); trmPut(26, 4, 'aktif', t.ink);
    // Bit and its speech bubble
    const said = TT >= q.halo - 1e-6, hop = trmHop(q.hop) + trmHop(q.hop2);
    trmHero(3, 7, { key: 'hero', mood: hop ? 'wow' : said ? 'happy' : 'smile', hop, wave: said && TT < q.halo + 1.0 && !hop });
    if (said) trmBubble(10, 7, 'halo!', t.ink, { n: trmTyped('halo!', q.halo, 16), c: TRM.amber });
    // the log scrolls up a whole row twice a second; the newest line is the brightest
    const k = trmStep(2, 3.0);
    for (let j = 0; j < 4; j++) { const i = k - 3 + j; if (i >= 0) trmPut(21, 7 + j, LOG[i % LOG.length], j === 3 ? t.ink : t.dim); }
    // the chart panel (the bridge's counterpart): bars grow half a cell per frame, one after another
    trmBox(PANEL.col, PANEL.row, PANEL.w, PANEL.h, t.ink, { title: 'energi' });
    trmChart(4, 19, [0.34, 0.58, 0.5, 0.75, 1.0], { h: 6, labels: ['sn', 'sl', 'rb', 'km', 'jm'], colors: [t.ink, t.ink, t.ink, t.ink, t.hi], halves: (i) => trmStep(24, q.chart + i * E16) });
    // the table counts up
    const cu = seg(TT, q.count, q.count + 0.5), num = (v) => String(Math.floor(v * cu + 1e-6));
    trmTable(22, 12, [['data', 'nil'], ['suhu', num(36)], ['daya', num(87)], ['roda', num(4)]], { w: [5, 3] });
    // the signal: a sparkline that scrolls left one cell at a time
    trmPut(22, 18, 'sinyal', t.dim);
    const sk = trmStep(8, 3.0);
    trmSpark(22, 19, Array.from({ length: 9 }, (_, i) => 0.5 + 0.32 * Math.sin((sk + i) * 0.8) + RNG('sinyal', sk + i).n(0.18)), t.ink);
    trmPut(22, 21, 'pantau', t.dim); trmSpin(29, 21, t.hi);
    trmTag('02', 'DASBOR');
    trmCaption('semua sistem *siap*', { at: q.siap });
  });
}
