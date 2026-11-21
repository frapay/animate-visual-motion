  // SCORE BODY — bento demo (inside buildScore(); see kit/score-head.js). A product film in miniature: a clean
  // plucked pattern in A major over a soft four-on-the-floor, one small pop per tile climbing a pentatonic ladder,
  // UI clicks for the switches; the chord lifts to D when the headline tile opens, ticks while the number counts,
  // a swoosh as the grid re-flows and a last chime as the board settles back on A.
  const T = TIMELINE, q = T.cues;
  const pop = (t, n, vel, pan = 0) => { blip(t, nz(n) * 0.5, nz(n), 0.07, vel, pan); noiseHit(t, 0.015, 'highpass', 6000, 1, vel * 0.35, pan); };   // a tile lands
  const click = (t, vel, pan = 0) => { noiseHit(t, 0.014, 'bandpass', 3200, 4, vel, pan); blip(t + 0.03, 1500, 2100, 0.035, vel * 0.5, pan); };      // a switch
  const tick = (t, vel, f = 5200) => noiseHit(t, 0.01, 'highpass', f, 1, vel, 0.1);
  const chordAt = (t) => (t < 3 ? ['A2', 'E3', 'Cs4'] : t < q.reflow ? ['D2', 'A2', 'Fs3'] : ['A2', 'E3', 'Cs4', 'E4']);
  to = 'm';
  pad(0.0, 3.05, chordAt(0), 0.045, { type: 'triangle', cut: 900, att: 0.3, rel: 0.3, send: 0.4 });
  pad(3.0, q.reflow + 0.05, chordAt(3.2), 0.055, { type: 'triangle', cut: 1500, att: 0.15, rel: 0.3, send: 0.5 });
  pad(q.reflow, 6.05, chordAt(5), 0.055, { type: 'triangle', cut: 1700, att: 0.1, rel: 0.5, send: 0.5 });
  const pA = ['A4', 'Cs5', 'E5', 'Cs5', 'A4', 'E5', 'B4', 'Cs5'], pD = ['D5', 'Fs5', 'A5', 'Fs5', 'D5', 'A5', 'E5', 'Fs5'], pE = ['A4', 'E5', 'A5', 'Cs6', 'E5', 'A5', 'Cs6', 'E6'];
  for (let i = 0; i < 24; i++) { const t = i * E8, p = t < 3 ? pA : t < q.reflow ? pD : pE; if (t > 2.6 && t < 3) continue; pluck(t, nz(p[i % 8]), t < 3 ? 0.05 : 0.06, i % 2 ? 0.25 : -0.25, 0.26, 3600, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; if (t > 2.6 && t < 3) continue; sub(t, t < 3 ? 0.11 : 0.13); bass(t + E8, nz(t < 3 ? 'A2' : t < q.reflow ? 'D2' : 'A2') , 0.06); }
  for (let i = 0; i < 24; i++) { const t = i * E8 + E16; if (t > 2.5 && t < 3.1) continue; tick(t, 0.012, 8000); }
  ['D5', 'Fs5', 'A5', 'D6'].forEach((n, i) => pluck(3.0 + 1 / 6 + i * 0.02, nz(n), 0.07, -0.3 + i * 0.2, 0.6, 4200, 0.45));   // the headline tile opens
  chime(q.reflow + 0.2, [nz('A5'), nz('Cs6'), nz('E6')], 0.03, 0);
  chime(q.badge, [nz('E6'), nz('A6')], 0.025, 0.1);
  to = 's';
  const ladder = ['A4', 'B4', 'Cs5', 'E5', 'Fs5', 'A5', 'B5', 'Cs6', 'E6'];
  pop(0.0, 'A3', 0.05);                                                                             // the hero tile
  ladder.forEach((n, i) => pop(q.tiles + i * E16, n, 0.032, -0.5 + i * 0.125));                     // the board assembles
  click(q.flip, 0.07, 0.3);                                                                         // noise cancelling on
  blip(q.pick, 900, 1300, 0.08, 0.03, 0);                                                           // the ring slides to the accent finish
  blip(q.press, 300, 180, 0.09, 0.06, -0.2);                                                        // a tap on the hero tile
  sweep(2.5, 3.0, 0.035, 500, 3200, 0);                                                             // the board closes onto it
  sweep(3.0, 3.45, 0.02, 2600, 700, 0);                                                             // and opens again
  ['D5', 'E5', 'Fs5', 'A5', 'B5', 'D6', 'E6', 'Fs6'].forEach((n, i) => pop(q.tiles2 + i * E16, n, 0.026, 0.5 - i * 0.14));
  for (let i = 0; i < 10; i++) tick(q.count + i * 0.0625, 0.018, 3600 + i * 350);                   // 48 counts up
  sweep(q.reflow - 0.1, q.reflow + 0.2, 0.03, 700, 2400, 0);                                        // the grid re-flows
  blip(q.reflow + 0.12, 220, 330, 0.12, 0.05, 0);
  click(q.saver, 0.07, -0.2);                                                                       // low power on
