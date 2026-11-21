  // SCORE BODY — bauhaus demo (inside buildScore(); see kit/score-head.js). A dry little machine march: a square-wave
  // figure on the 8ths, a woodblock on every beat, a plain bass; every shape that stops dead gets a wooden clack.
  const T = TIMELINE, q = T.cues;
  const clack = (t, vel, pan = 0, f = 1500) => { noiseHit(t, 0.035, 'bandpass', f, 4, vel, pan, 0.12); blip(t, f * 0.42, f * 0.24, 0.05, vel * 0.7, pan); };   // a shape stops dead
  const tick = (t, vel, pan = 0) => noiseHit(t, 0.014, 'highpass', 5200, 1, vel, pan);
  const block = (t, f, vel, pan = 0) => blip(t, f, f * 0.82, 0.045, vel, pan);                                         // woodblock
  const thud = (t, vel, pan = 0) => { sub(t, vel); noiseHit(t, 0.08, 'lowpass', 500, 0.7, vel * 0.3, pan, 0.15); };
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'D4'], 0.035, { type: 'square', cut: 700, att: 0.2, rel: 0.3, send: 0.3 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'F4'], 0.045, { type: 'square', cut: 1000, att: 0.1, rel: 0.3, send: 0.35 });
  const mA = ['D4', 'A4', 'F4', 'A4', 'D4', 'A4', 'G4', 'E4'], mB = ['F4', 'C5', 'A4', 'C5', 'F4', 'D5', 'C5', 'A4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.05 : 0.065, i % 2 ? 0.22 : -0.22, 0.16, t < 3 ? 1500 : 2400, 0.18); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; block(t, i % 4 === 0 ? 1100 : 820, t < 0.5 ? 0.03 : 0.045, 0.3); if (t >= 0.5) bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'F2' : 'C2')) * 2, t < 3 ? 0.07 : 0.09); }
  for (let i = 0; i < 12; i++) tick(3.0 + i * E8 + E16, 0.022, i % 2 ? 0.3 : -0.3);
  ['F4', 'A4', 'C5'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.2 + i * 0.2, 0.45, 3200, 0.35));                      // the payoff: the sun
  sub(3.0, 0.09);
  chime(3.0, [nz('F5'), nz('A5'), nz('C6')], 0.05, 0);
  to = 's';
  sweep(0.0, 0.4, 0.01, 300, 1800, -0.2);                                                                              // the grid and the ground rule themselves in
  [q.sq, q.ci, q.tri].forEach((t, i) => { clack(t, 0.09, [0.25, 0, 0][i], 1100 + i * 350); thud(t, 0.06); });          // square, circle, triangle
  sweep(q.roll, q.bump, 0.022, 180, 520, -0.4);                                                                        // the hero rolls in
  thud(q.bump, 0.12, -0.1); clack(q.bump, 0.1, -0.1, 900);                                                             // the bump
  blip(q.bump + 0.02, 500, 1500, 0.36, 0.04, 0.05);                                                                    // the triangle is knocked up
  sweep(2.4, 3.0, 0.014, 400, 2600, 0);                                                                                // into the morph
  [0, 1, 2, 3].forEach((i) => blip(q.rays - 0.1 + i * 0.03, 1700 + i * 200, 2100 + i * 200, 0.03, 0.02, 0.2));          // the rays push out
  [q.b1, q.b2, q.b3, q.b4].forEach((t, i) => { blip(t - 0.25, 180 + i * 50, 560 + i * 120, 0.24, 0.035, -0.1 + i * 0.15); clack(t, 0.075, -0.1 + i * 0.15, 1200 + i * 250); });   // the blocks are pushed up
  sweep(q.roll2, q.stop, 0.02, 180, 520, -0.5); clack(q.stop, 0.08, -0.45, 900);                                       // the hero rolls in and stops
  for (let i = 0; i < 12; i++) tick(q.lit + i * 0.0625, 0.03, 0.1 + (i % 2) * 0.2);                                    // windows
  [q.hop1, q.hop2].forEach((t) => { blip(t, 420, 900, 0.14, 0.035, -0.45); thud(t + 0.3, 0.07, -0.45); });             // the hops
  for (let i = 0; i < 3; i++) blip(4.1 + i * 0.75, 2500 + (i % 2) * 300, 1900, 0.04, 0.018, -0.2);                     // the bird
