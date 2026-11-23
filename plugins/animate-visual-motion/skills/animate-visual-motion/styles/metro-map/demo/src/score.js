  // SCORE BODY — metro-map demo (inside buildScore(); see kit/score-head.js). Steady like a train: a soft kick on the
  // beat, rail clicks in pairs on the 8ths, a warm pad per era, a ding at each stop, a two-tone chime on arrival.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  for (let i = 0; i < 12; i++) { sub(i * BEAT, i === 6 ? 0.34 : 0.25); bass(i * BEAT + E8, nz(i < 6 ? 'D2' : 'G1') * 2, 0.06); }
  for (let i = 0; i < 24; i++) { noiseHit(i * E8, 0.03, 'highpass', 6500, 0.8, i % 2 ? 0.04 : 0.022, i % 4 < 2 ? -0.25 : 0.25); if (i % 2) noiseHit(i * E8 + 0.07, 0.025, 'highpass', 5200, 0.8, 0.02, i % 4 < 2 ? -0.25 : 0.25); }
  pad(0.0, 3.0, ['D2', 'A2', 'Fs3'], 0.016, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.3, send: 0.3 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3'], 0.018, { type: 'triangle', cut: 1300, att: 0.4, rel: 0.3, send: 0.4 });
  chime(q.arr3, [nz('G5'), nz('B5'), nz('D6')], 0.06, 0.1);
  to = 's';
  sweep(q.line, q.st3, 0.008, 300, 900, -0.2);                             // the line being laid
  for (const t of [q.st2, q.st3]) blip(t, 1500, 1100, 0.04, 0.04, 0.25);   // a station pops as the head passes
  for (const t of [q.arr1, q.arr2]) { blip(t, nz('A5'), nz('A5'), 0.16, 0.05, 0.1); noiseHit(t - 0.1, 0.12, 'bandpass', 1800, 1.0, 0.018, 0, 0.1, 700); }   // the train stops: brake hiss, ding
  blip(q.halo, 260, 620, 0.22, 0.045, 0);                                  // the station swells
  sweep(2.5, 3.0, 0.012, 500, 3000, 0);
  noiseHit(3.0, 0.3, 'bandpass', 1400, 1.0, 0.02, 0, 0.3, 500);
  sweep(q.blue, q.join, 0.008, 400, 1100, 0.3);                            // the blue line comes in
  blip(q.join, 700, 1400, 0.09, 0.05, 0.2);                                // the interchange opens
  blip(q.legend, 1800, 1500, 0.03, 0.03, 0.4); blip(q.legend + 0.125, 2000, 1700, 0.03, 0.03, 0.4);
  blip(q.term, 1500, 1100, 0.04, 0.04, -0.2);                              // the terminus bar
  blip(q.arr3, nz('D5'), nz('D5'), 0.14, 0.05, 0); blip(q.arr3 + 0.25, nz('G5'), nz('G5'), 0.2, 0.05, 0);   // arrival: two tones
