  // SCORE BODY — linocut demo (inside buildScore(); see kit/score-head.js). A workshop at night: a low drone, a
  // plucked figure in A minor that opens into C major, a soft bass; every gouge is a short dry scrape, in streams
  // while something is carved; the press is a heavy thud; the second colour lands with a damp click.
  const T = TIMELINE, q = T.cues;
  const scrape = (t, vel, pan = 0, f = 2600, dur = 0.05) => noiseHit(t, dur, 'bandpass', f, 1.6, vel, pan, 0.06, f * 0.45);            // one cut
  const carve = (t0, t1, vel, pan0 = -0.3, pan1 = 0.3, every = E16 / 2, f = 2600) => { let i = 0; for (let t = t0; t < t1 - 1e-6; t += every, i++) scrape(t + (i % 3) * 0.006, vel * (0.65 + 0.35 * ((i * 5) % 4) / 3), lerp(pan0, pan1, (t - t0) / (t1 - t0)), f * (0.85 + 0.3 * ((i * 3) % 5) / 4)); };
  const clearing = (t0, t1, vel, pan = 0) => { for (let t = t0; t < t1 - 1e-6; t += E8) noiseHit(t, 0.2, 'bandpass', 1500, 1.1, vel, pan + 0.3 * Math.sin(t * 9), 0.1, 520); };   // long wide cuts
  const press = (t, vel) => { sub(t, vel); noiseHit(t, 0.14, 'lowpass', 420, 0.7, vel * 0.5, 0, 0.2); noiseHit(t + 0.02, 0.05, 'bandpass', 900, 2, vel * 0.25, 0, 0.1); };
  const land = (t, vel, pan = 0) => { blip(t, 620, 380, 0.05, vel, pan); noiseHit(t, 0.03, 'bandpass', 1900, 3, vel * 0.6, pan, 0.15); };            // colour drops in
  const tick = (t, vel, pan = 0) => noiseHit(t, 0.014, 'highpass', 5600, 1, vel, pan);
  to = 'm';
  pad(0.0, 3.1, ['A2', 'E3', 'A3'], 0.05, { type: 'triangle', cut: 900, att: 0.3, rel: 0.3, send: 0.4 });
  pad(3.0, 6.05, ['C3', 'G3', 'E4'], 0.075, { type: 'triangle', cut: 1500, att: 0.15, rel: 0.3, send: 0.45 });
  const mA = ['A3', 'C4', 'E4', 'D4', 'C4', 'B3', 'A3', 'E3'], mB = ['G4', 'C5', 'E5', 'D5', 'G5', 'E5', 'C5', 'G4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.055 : 0.07, i % 2 ? 0.22 : -0.22, 0.26, t < 3 ? 1900 : 3000, 0.28); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'A1' : 'E1') : (i % 4 < 2 ? 'C2' : 'G1')) * 2, t < 3 ? 0.07 : 0.09); }
  for (let i = 0; i < 6; i++) tick(3.0 + i * BEAT + E8, 0.024, i % 2 ? 0.25 : -0.25);
  ['C4', 'E4', 'G4'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.2 + i * 0.2, 0.5, 3200, 0.4));                           // the payoff: the sun
  chime(3.0 + 1 / 12, [nz('E5'), nz('G5'), nz('C6')], 0.05, 0);
  to = 's';
  carve(q.moon, q.moon + 0.5, 0.03, 0.2, 0.35);                                                                         // the moon's rows
  STARS.slice(0, 10).forEach((s, i) => tick(q.stars + i * 0.0625, 0.02, (s[0] - 540) / 700));                           // stars are nicked
  carve(q.ridge, q.ridge + 0.6, 0.026, -0.5, 0.5, E16 / 2, 2200);                                                       // the ridge
  carve(q.hare, q.hare + 0.75, 0.032, -0.4, -0.3, E16 / 2, 3000);                                                       // the hare
  carve(q.grass, q.grass + 0.7, 0.02, -0.5, 0.5, E16 / 2, 3600);                                                        // grass
  press(q.press, 0.13); land(q.press + 1 / 12, 0.06, 0.25);                                                             // the press; poppies print
  [0, 0.33].forEach((d) => blip(q.twitch + d, 900, 1300, 0.05, 0.022, -0.35));                                          // the ear flicks
  sweep(2.4, 3.0, 0.014, 400, 2400, 0);                                                                                 // the block is cut down to the moon
  press(3.0, 0.14); land(3.0 + 1 / 12, 0.07, 0.1);                                                                      // pressed: the moon prints as the sun
  clearing(q.sky, q.sky + 0.85, 0.035, 0);                                                                              // the sky is cleared
  carve(q.rays, q.rays + 0.5, 0.026, 0.1, 0.25, E16 / 2, 3200);                                                         // rays
  carve(q.hills, q.hills + 1.1, 0.026, -0.5, 0.5, E16 / 2, 2200);                                                       // three hills
  carve(q.hare2, q.hare2 + 0.6, 0.03, -0.4, -0.3, E16 / 2, 3000);                                                       // the hare
  press(q.press2, 0.12); land(q.press2 + 1 / 12, 0.06, 0.2);                                                            // the second press
  [q.hop1, q.hop2].forEach((t) => { blip(t, 420, 880, 0.14, 0.035, -0.4); sub(t + 0.33, 0.05); noiseHit(t + 0.33, 0.06, 'lowpass', 500, 0.7, 0.025, -0.4, 0.15); });   // the hops
  for (let i = 0; i < 4; i++) blip(3.9 + i * 0.5 + (i % 2) * E16, 2300 + (i % 2) * 300, 1800, 0.04, 0.014, -0.3);       // the birds
