  // SCORE BODY — chalkboard demo (inside buildScore(); see kit/score-head.js)
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['C3', 'G3', 'E4'], 0.03, { type: 'triangle', cut: 900, att: 0.05, rel: 0.2 });
  [['C5', 0], ['E5', E16], ['G5', E8]].forEach(([n, dt], i) => pluck(cu.ring + dt, nz(n), 0.2 - i * 0.04, -0.1 + i * 0.1, 0.5, 4200, 0.4));   // the circle lands
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4'], 0.045, { cut: 800, att: 0.3, rel: 0.3, send: 0.4 });
  [cu.hop1, cu.hop2].forEach((t, i) => pluck(t, nz(i ? 'C5' : 'A4'), 0.2, 0.15, 0.4, 3000, 0.3));                                          // the hops
  to = 's';
  for (let i = 0; i < 6; i++) noiseHit(cu.wipe + i * E8 * 0.6, 0.16, 'lowpass', 900, 0.7, 0.07, 0.2);                                        // the eraser
  for (let i = 0; i < 10; i++) noiseHit(cu.sun + i * E16, 0.05, 'bandpass', 5200 + (i % 3) * 500, 3, 0.05, -0.2);                          // chalk scratches
  for (let i = 0; i < 8; i++) noiseHit(cu.temp + i * E16 / 2, 0.04, 'bandpass', 6000, 3, 0.04, 0.2);                                       // writing
  for (let i = 0; i < 3; i++) noiseHit(2.42 + i * 0.12, 0.14, 'lowpass', 900, 0.7, 0.05, -0.2 + i * 0.2);                                       // the captions are wiped
  sweep(2.5, 3.0, 0.012, 500, 2800, 0);                                                                                                     // into the morph
  chime(3.0, [nz('C5'), nz('G5'), nz('D6')], 0.07, 0);                                                                                      // the Earth
  for (let i = 0; i < 8; i++) noiseHit(cu.month + i * E16, 0.04, 'bandpass', 5600, 3, 0.04, 0.1);                                           // the equation
  blip(cu.tick, 1800, 2600, 0.06, 0.04, 0.2);                                                                                               // the tick
