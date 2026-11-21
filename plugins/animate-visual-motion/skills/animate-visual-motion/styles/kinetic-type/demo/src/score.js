  // SCORE BODY — kinetic-type demo (inside buildScore(); see kit/score-head.js). A tight percussive grid:
  // kick on the beat, hats on 8ths, a click + whoosh on every word slam, ticks while the ring fills, a chime at full.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  for (let i = 0; i < 12; i++) { sub(i * BEAT, i === 6 ? 0.5 : 0.32); bass(i * BEAT + E8, nz(i < 6 ? 'E2' : 'A1') * 2, 0.07); }
  for (let i = 0; i < 24; i++) noiseHit(i * E8 + (i % 2 ? 0 : 0.0), 0.04, 'highpass', 7000, 0.8, i % 2 ? 0.05 : 0.025, i % 4 < 2 ? -0.2 : 0.2);
  pad(0.0, 3.0, ['E2', 'B2', 'Gs3'], 0.014, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.3, send: 0.3 });   // a quiet bed so era 1 isn't drums only
  pad(3.0, 6.05, ['A2', 'E3', 'Cs4'], 0.018, { type: 'triangle', cut: 1300, att: 0.4, rel: 0.3, send: 0.4 });
  chime(q.full, [nz('A5'), nz('Cs6'), nz('E6')], 0.07, 0.1);
  to = 's';
  for (const t of [q.w2, q.w3]) { noiseHit(t - 0.06, 0.1, 'bandpass', 2400, 1.2, 0.05, 0, 0.1, 6000); blip(t, 1800, 900, 0.03, 0.06, 0.2); }
  for (const t of [q.w2 + 0.25, q.stop]) blip(t, 500, 260, 0.06, 0.06, 0.25);   // the dot lands
  sweep(q.out - 0.1, q.out + 0.25, 0.03, 1200, 6000, 0);                  // words leave
  blip(q.grow + 0.1, 220, 660, 0.25, 0.05, 0);
  sweep(2.5, 3.0, 0.012, 500, 3000, 0);
  noiseHit(3.0, 0.3, 'bandpass', 1400, 1.0, 0.02, 0, 0.3, 500);
  for (let i = 0; i < 10; i++) blip(q.ring + i * 0.1, 3200, 3000, 0.012, 0.015, 0.3);   // ring ticks
  blip(q.bar1, 400, 900, 0.1, 0.04, -0.3); blip(q.bar2, 500, 1200, 0.1, 0.05, 0.3);
  blip(q.land, 500, 260, 0.06, 0.06, 0.2);   // the dot lands as the full stop
