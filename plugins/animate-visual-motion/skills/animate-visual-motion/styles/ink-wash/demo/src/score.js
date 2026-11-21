  // SCORE BODY — ink wash demo (inside buildScore(); see kit/score-head.js). Quiet and sparse: a low drone, a soft
  // open-fifth pad, koto-like plucks in a five-note scale (D E G A B), a breathy flute line. Every brush stroke is a
  // soft band of noise ("bristles on paper"); water is a falling sine drop.
  const T = TIMELINE, q = T.cues;
  const koto = (t, n, vel, pan = 0) => pluck(t, nz(n), vel, pan, 0.9, 2600, 0.5);
  const flute = (t0, t1, n, vel) => { pad(t0, t1, [n], vel, { type: 'sine', cut: 2600, att: 0.12, rel: 0.28, send: 0.6 }); noiseHit(t0, 0.18, 'bandpass', nz(n), 6, vel * 0.5, 0, 0.4); };
  const brush = (t, dur, vel, pan = 0, f0 = 700, f1 = 2200) => sweep(t, t + dur, vel, f0, f1, pan);                    // bristles on paper
  const drop = (t, f, vel, pan = 0) => blip(t, f, f * 0.42, 0.14, vel, pan);                                           // a water drop
  const stamp = (t) => { blip(t, 190, 80, 0.09, 0.07, -0.4); noiseHit(t, 0.05, 'lowpass', 700, 0.7, 0.04, -0.4, 0.2); }; // the seal pressed on
  const wing = (t, vel, pan) => noiseHit(t, 0.2, 'bandpass', 380, 0.9, vel, pan, 0.25, 700);
  to = 'm';
  drone(0.0, 6.05, nz('D2'), 0.05, { att: 0.6 });
  pad(0.0, 3.1, ['D3', 'A3'], 0.035, { type: 'triangle', cut: 900, att: 0.6, rel: 0.4, send: 0.5 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'D4'], 0.06, { type: 'triangle', cut: 1500, att: 0.2, rel: 0.4, send: 0.5 });
  [[0.5, 'A4'], [1.0, 'D5'], [1.25, 'B4'], [1.5, 'A4'], [2.0, 'E4'], [2.0, 'G4'], [2.5, 'D4'], [2.75, 'E4']].forEach(([t, n], i) => koto(t, n, 0.07, i % 2 ? 0.25 : -0.25));
  [[3.5, 'B4'], [3.75, 'D5'], [4.0, 'E5'], [4.5, 'D5'], [4.5, 'G4'], [5.0, 'B4'], [5.25, 'A4'], [5.5, 'G4'], [5.75, 'D5']].forEach(([t, n], i) => koto(t, n, 0.09, i % 2 ? 0.25 : -0.25));
  flute(1.0, 1.9, 'A5', 0.022); flute(2.0, 2.8, 'B5', 0.022); flute(3.5, 4.4, 'D6', 0.028); flute(4.5, 5.4, 'B5', 0.028); flute(5.5, 6.0, 'G5', 0.024);
  for (let i = 1; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'G1' : 'D2')) * 2, t < 3 ? 0.05 : 0.075); }
  for (let i = 0; i < 6; i++) blip(3.25 + i * BEAT, 1250, 1050, 0.035, 0.022, i % 2 ? 0.3 : -0.3);                    // a wood block on the off-beats
  ['G3', 'D4', 'B4', 'D5'].forEach((n, i) => pluck(3.0 + i * 0.02, nz(n), 0.12, -0.3 + i * 0.2, 1.1, 3000, 0.5));     // the payoff: the pond
  sub(3.0, 0.09);
  chime(3.0, [nz('G5'), nz('B5'), nz('D6')], 0.06, 0);
  to = 's';
  stamp(0.25); stamp(3.75);
  brush(q.ridge, 0.55, 0.022, -0.3); brush(q.cliff, 0.4, 0.024, -0.5, 500, 1500); brush(q.pine, 0.35, 0.018, -0.5, 900, 2600);
  [1.0, 2.0].forEach((t) => wing(t, 0.05, -0.2));                                                                     // slow wingbeats
  sweep(2.4, 3.0, 0.014, 300, 1800, 0);                                                                               // the enso closes on the moon
  [0, 0.25, 0.5, 0.75].forEach((d, i) => brush(q.bambu + d, 0.2, 0.02, 0.5, 800 + i * 150, 1800 + i * 300));          // bamboo joints
  [3.75, 4.08, 4.33].forEach((t, i) => wing(t, 0.045, -0.4 + i * 0.15));                                              // the glide down
  noiseHit(q.land, 0.3, 'highpass', 2200, 0.7, 0.06, -0.15, 0.4, 5500); drop(q.land, 520, 0.07, -0.15); drop(q.land + 0.12, 700, 0.03, -0.1);   // landing in the water
  blip(q.leaf, 1500, 1200, 0.05, 0.02, 0.3);                                                                          // the leaf lets go
  drop(q.plop, 900, 0.07, 0.25); drop(q.plop + 0.1, 1350, 0.035, 0.25);                                               // ...and touches the water
