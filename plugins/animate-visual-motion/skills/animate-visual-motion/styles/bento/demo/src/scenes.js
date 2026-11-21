// =====================================================================
//  SCENES — bento demo. World coordinates 1080x1920; time TT on 1s. One grid for both boards: 4 x 5 cells inside
//  the phone-safe box (x 60-940), the tag above it, the caption tile below it.
// =====================================================================
const cu = TIMELINE.cues;
const G = bentoGrid({ cols: 4, rows: 5, rect: [60, 334, 880, 1016] });
// era 1: the feature board. id: [col, row, spanC, spanR]
const L1 = { chip: [0, 0, 2, 1], water: [2, 0, 1, 1], safe: [3, 0, 1, 1], hero: [0, 1, 2, 2], quiet: [2, 1, 2, 1], sound: [2, 2, 2, 1], bass: [0, 3, 1, 2], finish: [1, 3, 2, 1], eco: [3, 3, 1, 2], weight: [1, 4, 2, 1] };
// era 2: the battery board, before and after the re-flow
const A2 = { day: [0, 0, 2, 1], bolt: [2, 0, 1, 1], cell: [3, 0, 1, 2], life: [0, 1, 3, 2], leaf: [3, 2, 1, 1], health: [0, 3, 1, 2], fast: [1, 3, 2, 1], saver: [1, 4, 2, 1], week: [3, 3, 1, 2] };
const B2 = { life: [0, 0, 4, 2], day: [0, 2, 2, 1], fast: [2, 2, 2, 1], health: [0, 3, 1, 2], saver: [1, 3, 2, 1], week: [3, 3, 1, 2], bolt: [1, 4, 1, 1], leaf: [2, 4, 1, 1] };
for (const [name, spec] of [['L1', L1], ['A2', A2], ['B2', B2]]) { const bad = bentoCheck(G, spec); if (bad.length) console.warn('bento layout ' + name + ': ' + bad.join('; ')); }
// tiles pop in on the 16ths, spiralling out from the hero tile
const popAt = (order, t0) => Object.fromEntries(order.map((id, i) => [id, t0 + i * E16]));
const POP1 = popAt(['quiet', 'sound', 'chip', 'water', 'safe', 'bass', 'finish', 'eco', 'weight'], cu.tiles);
const POP2 = popAt(['day', 'bolt', 'cell', 'leaf', 'health', 'fast', 'saver', 'week'], cu.tiles2);
const FLOW2 = ['life', 'day', 'fast', 'bolt', 'leaf', 'cell', 'health', 'saver', 'week'];   // the order tiles set off in: the headline first

// ---- era 1: everything on one board (dark ground)
function sceneBoard() {
  bentoGround('dark');
  const tile = (id, o = {}) => bentoTile(G, L1[id], { at: POP1[id], ...o });
  bentoHeroTile(G, L1.hero, { at: -0.12, press: cu.press });
  bentoToggle(tile('quiet'), { label: 'Noise cancelling', on: true, flip: cu.flip });
  bentoChart(tile('sound'), { label: 'Tuned sound', data: [3, 5, 8, 6, 9, 7, 4, 6, 3], hi: 'max' });
  bentoStat(tile('chip'), { label: 'New chip', value: 2, from: 1, decimals: 1, suffix: '× faster', dur: 0.5 });
  bentoIcon(tile('water'), 'drop', { label: 'Waterproof' });
  bentoIcon(tile('safe'), 'shield', { label: 'Private' });
  // the level meter never sits still: it follows the music
  bentoMeter(tile('bass'), { kind: 'level', n: 7, label: 'Bass', value: 0.66 + 0.2 * Math.sin(TT * TAU * 2) * (0.6 + 0.4 * Math.sin(TT * 3.1)) });
  bentoSwatches(tile('finish'), { label: 'Four finishes', pick: springTrack([[0, 0], [cu.pick, 3]], SPRING.snappy) });
  bentoRing(tile('eco'), { label: 'Recycled', value: 0.92, suffix: '%' });
  bentoStat(tile('weight'), { label: 'Featherlight', value: 38, from: 90, suffix: 'g' });
  bentoTag('Launch day');
  bentoCaption('All new. *All in one.*', { at: 0.5 });
}

// ---- era 2: the headline number (light ground); the grid re-flows at cu.reflow
function sceneBattery() {
  bentoGround('light');
  const L = bentoFlow(cu.reflow, G.layout(A2), G.layout(B2), { order: FLOW2, step: 0.03 });
  const tile = (id, o = {}) => bentoTile(G, L[id], { at: POP2[id], ...o });
  bentoChart(tile('day'), { label: 'Efficiency', kind: 'area', data: [3, 3.6, 3.3, 4.6, 5.2, 4.9, 6.4, 7.2], max: 8 });
  bentoIcon(tile('bolt'), 'bolt', { label: 'Fast' });
  bentoMeter(tile('cell'), { label: 'Charge', value: 0.86 });
  bentoIcon(tile('leaf'), 'leaf', { label: 'Eco' });
  bentoRing(tile('health'), { label: 'Health', value: 0.96, suffix: '%' });
  bentoStat(tile('fast'), { label: '0 to 50%', value: 18, from: 60, suffix: 'min' });
  bentoToggle(tile('saver'), { label: 'Low power', on: true, flip: cu.saver });
  bentoChart(tile('week'), { label: 'This week', data: [4, 6, 5, 8, 9], hi: 'last' });
  // the one tinted tile: it is the bridge object, so it is there from the first frame; its number arrives after the board opens
  bentoStat(tile('life', { at: null, fill: 'accent' }), { label: 'Battery life', value: 48, from: 0, suffix: 'h', at: cu.count, dur: 0.625 });
  bentoTag('Battery');
  bentoCaption('*48 hours.* One charge.', { at: 0.75 });
}
