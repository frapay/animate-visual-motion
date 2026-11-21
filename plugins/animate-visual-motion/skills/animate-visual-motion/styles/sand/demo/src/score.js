  // SCORE BODY — sand demo (inside buildScore(); see kit/score-head.js). A slow desert tune: a low drone, a plucked
  // phrase in D (hijaz colour), a soft frame-drum pulse; sand is noise — a hiss for every pour, a swish for every wipe.
  const T = TIMELINE, q = T.cues;
  const hiss = (t0, t1, vel, pan = 0) => sweep(t0, t1, vel, 5200, 2600, pan);                                          // sand falling
  const swish = (t, dur, vel, pan = 0, f0 = 900, f1 = 2600) => noiseHit(t, dur, 'bandpass', f0, 1.4, vel, pan, 0.2, f1);   // a finger through sand
  const poke = (t, f, vel, pan = 0) => { blip(t, f, f * 0.7, 0.05, vel, pan); noiseHit(t, 0.03, 'highpass', 5000, 0.7, vel * 0.5, pan); };
  to = 'm';
  drone(0.0, 3.1, nz('D2'), 0.06, { att: 0.3, rel: 0.3 });
  pad(0.0, 3.1, ['D3', 'A3', 'D4'], 0.045, { type: 'triangle', cut: 1100, att: 0.4, rel: 0.3, send: 0.45 });
  drone(3.0, 6.05, nz('G2'), 0.06, { att: 0.2, rel: 0.4 });
  pad(3.0, 6.05, ['G3', 'D4', 'Bb4'], 0.06, { type: 'triangle', cut: 1500, att: 0.25, rel: 0.4, send: 0.5 });
  const mA = ['D4', 'Eb4', 'Fs4', 'G4', 'A4', 'G4', 'Fs4', 'Eb4'], mB = ['G4', 'Bb4', 'D5', 'Bb4', 'A4', 'G4', 'D5', 'G5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5 || (t >= 2.75 && t < 3.0)) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.06 : 0.055, i % 2 ? 0.22 : -0.22, 0.3, t < 3 ? 2000 : 2600, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? 'D2' : 'G2') * 2, i % 2 ? 0.05 : 0.08); if (i % 2) noiseHit(t + E8, 0.05, 'bandpass', 420, 2, 0.035, 0.15); }
  ['G4', 'Bb4', 'D5'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.2 + i * 0.2, 0.5, 3000, 0.4));                         // the payoff: night
  sub(3.0, 0.08);
  chime(3.0, [nz('G5'), nz('D6')], 0.05, 0);
  to = 's';
  swish(q.sweep, 0.6, 0.07, -0.3, 500, 2400);                                                                           // the table is swept
  hiss(q.pour1, q.pour1 + 0.75, 0.035, 0.35); hiss(q.pour2, q.pour2 + 0.8, 0.035, -0.3);                               // two pours
  hiss(q.palm, q.palm + 0.6, 0.02, -0.5);                                                                               // the palm is dribbled on
  swish(q.sun, 0.55, 0.06, 0.2, 700, 1800);                                                                             // the sun is rubbed clean
  for (let i = 0; i < 5; i++) noiseHit(1.2 + i * 0.25, 0.04, 'lowpass', 700, 0.8, 0.03, -0.3 + i * 0.12);              // soft steps in sand
  blip(q.look + 0.05, 500, 760, 0.12, 0.03, 0.05);                                                                      // Unta looks up
  swish(2.4, 0.6, 0.05, 0, 1800, 500); swish(3.05, 0.5, 0.04, 0, 600, 2200);                                           // into and out of the morph
  STARS_T.forEach((t, i) => poke(t, 1500 + (i * 370) % 900, 0.035, -0.5 + (i % 5) * 0.25));                            // stars
  [0, 1, 2].forEach((i) => poke(q.win + i * 0.25, 700 + i * 90, 0.03, -0.45));                                         // the mosque's windows
  noiseHit(q.sit + 0.3, 0.12, 'lowpass', 380, 0.8, 0.06, -0.1);                                                         // Unta lies down
  swish(q.lamp, 0.25, 0.04, 0.4, 900, 1700); chime(q.lamp + 0.2, [nz('D5'), nz('G5')], 0.035, 0.4);                    // the lamp
  blip(q.sleep, 620, 420, 0.3, 0.025, -0.1);                                                                            // asleep
  swish(q.shoot, 0.2, 0.04, 0.5, 2400, 4200);                                                                           // a shooting star
