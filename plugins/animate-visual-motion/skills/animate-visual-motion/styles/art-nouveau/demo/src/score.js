  // SCORE BODY — art nouveau demo (inside buildScore(); see kit/score-head.js). Slow and flowing: a harp rolling up
  // and down a chord in 8ths, a soft held pad, a low bass on the half bars, a flute-like note as each petal opens,
  // glassy ticks as the mosaic sets, a faint flutter for the dragonfly. Nothing percussive.
  const T = TIMELINE, q = T.cues;
  const flute = (t, n, vel, pan = 0, dur = 0.5) => { blip(t, nz(n) * 0.995, nz(n), dur, vel, pan); noiseHit(t, 0.12, 'bandpass', nz(n) * 2, 3, vel * 0.25, pan, 0.3); };
  const glass = (t, f, vel, pan = 0) => blip(t, f, f * 1.01, 0.1, vel, pan);
  const flutter = (t0, t1, vel, pan) => { for (let t = t0; t < t1; t += 0.042) noiseHit(t, 0.016, 'bandpass', 2600, 2.5, vel, pan + 0.1 * Math.sin(t * 9)); };
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F4', 'E4'], 0.04, { type: 'triangle', cut: 1000, att: 0.5, rel: 0.4, send: 0.5 });
  pad(3.0, 6.05, ['Bb2', 'F3', 'D4', 'A4', 'C5'], 0.06, { type: 'triangle', cut: 1700, att: 0.25, rel: 0.5, send: 0.55 });
  const hA = ['D3', 'A3', 'D4', 'F4', 'A4', 'E5', 'A4', 'F4'], hB = ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'A4', 'C5', 'A4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; pluck(t, nz((t < 3 ? hA : hB)[i % 8]), (t < 3 ? 0.05 : 0.064) * (i % 8 === 0 ? 1.3 : 1), i % 2 ? 0.28 : -0.28, 0.6, t < 3 ? 2200 : 3000, 0.45); }
  for (let i = 0; i < 6; i++) { const t = i * BEAT * 2; bass(t, nz(t < 3 ? (i % 2 ? 'A2' : 'D2') : (i % 2 ? 'F2' : 'Bb1')) * (t < 3 ? 1 : 2), t < 3 ? 0.07 : 0.085); }
  ['Bb3', 'D4', 'F4', 'A4', 'D5'].forEach((n, i) => pluck(3.0 + i * 0.035, nz(n), 0.09, -0.3 + i * 0.15, 0.8, 3400, 0.5));   // the payoff: the gold halo
  sub(3.0, 0.07);
  chime(3.0, [nz('F5'), nz('A5'), nz('D6')], 0.05, 0);
  to = 's';
  sweep(q.border, q.border + 1.4, 0.008, 400, 2600, 0);                                                                // the border climbs and meets
  chime(1.45, [nz('A5'), nz('E6')], 0.02, 0);
  sweep(q.stem, q.stem + 1.0, 0.01, 300, 1400, -0.1);                                                                  // the stem grows
  ['F5', 'A5', 'D6', 'E6', 'A5', 'F6'].forEach((n, i) => flute(q.bloom + 0.05 + i * 0.15, n, 0.022, -0.3 + i * 0.12, 0.3));   // six petals
  flutter(q.fly, q.fly + 1.0, 0.006, 0.5);                                                                             // the dragonfly glides in
  sweep(q.fold, 3.0, 0.014, 2200, 500, 0);                                                                             // the lily folds away, into the morph
  for (let i = 0; i < 16; i++) glass(q.rings2 + i * 0.1, 1500 + (i * 7 % 5) * 260, 0.012, i % 2 ? 0.4 : -0.4);         // the mosaic sets
  sweep(q.stem2, q.stem2 + 1.0, 0.01, 300, 1500, 0.1);                                                                 // the iris rises
  ['D5', 'F5', 'A5', 'Bb5', 'D6', 'F6'].forEach((n, i) => flute(q.bloom2 + 0.1 + i * 0.2, n, 0.026, 0.3 - i * 0.12, 0.36));   // falls and standards
  chime(q.feather + 1.3, [nz('C6'), nz('F6')], 0.03, -0.5);                                                            // the feather's eye opens
  flutter(q.swoop, q.swoop + 1.1, 0.007, 0.45);                                                                        // the dragonfly loops
