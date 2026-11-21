  // SCORE BODY — stained glass demo (inside buildScore(); see kit/score-head.js). Night: a low hollow pad and glassy
  // tings as panes light. Morning: a bright major pad, a plucked melody on the 8ths and a small bass.
  const T = TIMELINE, q = T.cues;
  const ting = (t, n, vel, pan = 0) => pluck(t, nz(n), vel, pan, 0.5, 7000, 0.5);                                      // a pane lights
  const tick = (t, vel, pan = 0) => noiseHit(t, 0.03, 'highpass', 7500, 0.8, vel, pan, 0.3);                           // glass ticking as light runs along the lead
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F4'], 0.045, { type: 'triangle', cut: 900, att: 0.5, rel: 0.3, send: 0.5 });
  drone(0.0, 3.0, nz('D2'), 0.035);
  pad(3.0, 6.05, ['D3', 'A3', 'Fs4', 'A4'], 0.085, { type: 'sawtooth', cut: 1500, att: 0.15, rel: 0.4, send: 0.45 });
  const mA = ['D5', 'F5', 'A5', 'F5', 'E5', 'A5', 'D6', 'A5'], mB = ['Fs5', 'A5', 'D6', 'A5', 'B5', 'D6', 'Fs6', 'D6'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; if (t < 3) ting(t, mA[i % 8], 0.03, i % 2 ? 0.3 : -0.3); else pluck(t, nz(mB[i % 8]), 0.065, i % 2 ? 0.25 : -0.25, 0.26, 3600, 0.3); }
  for (let i = 6; i < 12; i++) bass(i * BEAT, nz(i % 4 < 2 ? 'D2' : 'A1') * 2, 0.09);
  for (let i = 0; i < 6; i++) noiseHit(3.0 + i * BEAT + E8, 0.04, 'highpass', 6500, 0.7, 0.028, i % 2 ? 0.25 : -0.25);
  ['Fs4', 'A4', 'D5'].forEach((n, i) => pluck(3.0, nz(n), 0.12, -0.2 + i * 0.2, 0.5, 3600, 0.4));                      // the payoff: the sun
  sub(3.0, 0.1);
  chime(3.0, [nz('D5'), nz('Fs5'), nz('A5')], 0.07, 0);
  to = 's';
  for (let i = 0; i < 16; i++) tick(0.1 + i * 0.1, 0.012, -0.5 + i / 16);                                              // the border lights round the arch
  chime(q.moon, [nz('A5'), nz('D6')], 0.05, 0);                                                                        // the crescent
  [q.s1, q.s2, q.s3, q.s4].forEach((t, i) => chime(t, [nz(['A5', 'D6', 'E6', 'A6'][i])], 0.04, [0, -0.5, 0.5, 0.1][i]));   // the stars
  for (let i = 0; i < 5; i++) tick(q.s3 + 0.05 + i * 0.07, 0.014, 0.2 + i * 0.1);                                      // the comet
  sweep(q.sweep, q.sweep + 0.5, 0.02, 2500, 9000, 0); blip(q.wake, 800, 1300, 0.12, 0.04, 0.4);                        // the band of light wakes the dove
  sweep(2.45, 3.0, 0.015, 500, 3000, 0);                                                                               // into the morph
  for (let i = 0; i < 10; i++) tick(3.3 + i * 0.06, 0.014, -0.4 + i * 0.08);                                           // the rays light round the sun
  [q.b1, q.b2, q.b3].forEach((t, i) => { blip(t, 520 + i * 90, 900 + i * 120, 0.07, 0.05, 0.3); noiseHit(t, 0.08, 'bandpass', 1800, 1.2, 0.03, 0.3, 0.2); });   // the dove's steps
  [q.f1, q.f2, q.f3].forEach((t, i) => blip(t + 0.12, 700 + i * 130, 1500 + i * 200, 0.06, 0.045, -0.2 + i * 0.12));  // tulips light
  sweep(q.sweep2, q.sweep2 + 0.5, 0.022, 2500, 10000, 0);
  chime(q.pulse, [nz('D6'), nz('Fs6'), nz('A6')], 0.05, 0);
