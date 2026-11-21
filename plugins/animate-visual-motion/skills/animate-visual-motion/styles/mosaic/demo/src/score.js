  // SCORE BODY — mosaic demo (inside buildScore(); see kit/score-head.js). A courtyard tune: a soft pad, plucked
  // strings in D minor that open into F major, a small bass; every tile is a dry stone click, in streams while
  // an area is being laid; water is a falling blip, gold is a chime.
  const T = TIMELINE, q = T.cues;
  const click = (t, vel, pan = 0, f = 3200) => { noiseHit(t, 0.014, 'bandpass', f, 3, vel, pan, 0.08); blip(t, f * 0.62, f * 0.5, 0.012, vel * 0.5, pan); };   // one tessera set
  const lay = (t0, t1, vel, pan0 = -0.4, pan1 = 0.4, every = E16 / 2) => { let i = 0; for (let t = t0; t < t1 - 1e-6; t += every, i++) click(t + (i % 3) * 0.004, vel * (0.7 + 0.3 * ((i * 7) % 5) / 4), lerp(pan0, pan1, (t - t0) / (t1 - t0)), 2600 + ((i * 5) % 7) * 260); };
  const drop = (t, f, vel, pan = 0) => blip(t, f, f * 0.5, 0.09, vel, pan);
  const thud = (t, vel, pan = 0) => { sub(t, vel); noiseHit(t, 0.08, 'lowpass', 600, 0.7, vel * 0.3, pan, 0.2); };
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F4'], 0.06, { type: 'triangle', cut: 1300, att: 0.3, rel: 0.3, send: 0.45 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4'], 0.085, { type: 'triangle', cut: 1800, att: 0.15, rel: 0.3, send: 0.45 });
  const mA = ['D4', 'F4', 'A4', 'G4', 'F4', 'E4', 'D4', 'A3'], mB = ['A4', 'C5', 'F5', 'E5', 'G5', 'F5', 'C5', 'A4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.06 : 0.075, i % 2 ? 0.25 : -0.25, 0.3, t < 3 ? 2400 : 3200, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'F2' : 'C2')) * 2, t < 3 ? 0.07 : 0.09); }
  for (let i = 0; i < 6; i++) noiseHit(3.0 + i * BEAT + E8, 0.04, 'highpass', 6500, 0.7, 0.028, i % 2 ? 0.25 : -0.25);
  ['F4', 'A4', 'C5'].forEach((n, i) => pluck(3.0, nz(n), 0.11, -0.2 + i * 0.2, 0.5, 3400, 0.4));                        // the payoff: the sun
  sub(3.0, 0.09);
  chime(3.0, [nz('F5'), nz('A5'), nz('C6')], 0.06, 0);
  to = 's';
  lay(0.0, 0.72, 0.022, -0.5, 0.5, E16 / 4);                                                                            // the sea is laid
  lay(q.shell, q.shell + 0.5, 0.03, -0.1, 0.1);                                                                         // waves, the shell
  lay(q.pearl, q.pearl + 0.36, 0.034, 0, 0); chime(q.pearl + 0.36, [nz('A5'), nz('D6')], 0.03, 0);                      // the pearl
  [0, 0.25, 0.5].forEach((d, i) => drop(q.swim + d, 700 - i * 60, 0.03, -0.5 + i * 0.12));                              // the fish swims in
  thud(q.nudge, 0.07, -0.1); click(q.nudge, 0.06, -0.1, 1800);                                                          // the nudge
  blip(q.nudge + 0.08, 500, 1500, 0.3, 0.035, 0);                                                                       // the pearl rises
  sweep(2.4, 3.0, 0.014, 500, 2600, 0);                                                                                 // into the morph
  lay(2.75, 3.0, 0.03, -0.2, 0.2); lay(3.0, 3.25, 0.03, -0.2, 0.2);                                                     // the medallion is re-laid
  lay(q.rays, q.rays + 0.5, 0.034, -0.4, 0.4, E16 / 2);                                                                 // the rays, one by one
  [q.f1, q.f2, q.f3].forEach((t, i) => { lay(t, t + 0.12, 0.034, -0.4, -0.3, E16 / 4); pluck(t, nz(['C6', 'D6', 'F6'][i]), 0.04, -0.35, 0.2, 5200, 0.3); });   // fruit
  blip(q.leap, 400, 1300, 0.2, 0.035, 0.2); noiseHit(q.leap, 0.12, 'highpass', 3000, 0.7, 0.03, 0.2, 0.2);              // the leap
  thud(q.splash, 0.08, 0.15); noiseHit(q.splash, 0.22, 'bandpass', 2400, 0.8, 0.05, 0.15, 0.3, 900);                    // the splash
  chime(q.splash + 0.17, [nz('C6'), nz('F6')], 0.03, 0);                                                                // the gold glint crossing the sun
  blip(q.leap2, 450, 1100, 0.14, 0.03, 0.15); noiseHit(q.splash2, 0.16, 'bandpass', 2600, 0.8, 0.04, 0.15, 0.3, 1000);
  for (let i = 0; i < 4; i++) drop(3.7 + i * 0.5 + (i % 2) * E16, 1500 + (i % 2) * 300, 0.014, 0.5);                    // the fountain
