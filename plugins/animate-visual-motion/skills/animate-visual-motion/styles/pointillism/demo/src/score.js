  // SCORE BODY — pointillism demo (inside buildScore(); see kit/score-head.js). A light harp figure in D over a soft
  // pad; every clutch of dabs is a quiet brush tick. At 3.0s it settles into a warmer, fuller B minor / G with bells
  // for the moon, the stars, the lamps and the lantern.
  const T = TIMELINE, q = T.cues;
  const dab = (t, vel, pan = 0, f = 2600) => noiseHit(t, 0.03, 'bandpass', f, 2.2, vel, pan, 0.1);                      // a brush touch
  const bell = (t, n, vel, pan = 0) => chime(t, [nz(n), nz(n) * 2.01], vel, pan);
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4'], 0.03, { type: 'triangle', cut: 1400, att: 0.5, rel: 0.4, send: 0.5 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'Fs4'], 0.05, { type: 'sawtooth', cut: 1100, att: 0.15, rel: 0.4, send: 0.5 });
  const hA = ['D4', 'A4', 'Fs5', 'A4', 'E4', 'A4', 'E5', 'A4'], hB = ['G4', 'D5', 'B5', 'D5', 'Fs4', 'D5', 'A5', 'D5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.25) continue; pluck(t, nz((t < 3 ? hA : hB)[i % 8]), t < 3 ? 0.05 : 0.07, i % 2 ? 0.3 : -0.3, 0.42, t < 3 ? 2600 : 3400, 0.4); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; if (t >= 0.5) bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A2') : (i % 4 < 2 ? 'G2' : 'D2')), t < 3 ? 0.06 : 0.095); }
  ['G4', 'B4', 'D5', 'Fs5'].forEach((n, i) => pluck(3.0 + i * 0.02, nz(n), 0.1, -0.3 + i * 0.2, 0.7, 3600, 0.5));       // the payoff: the moon
  sub(3.0, 0.08);
  bell(3.0, 'D6', 0.05, 0);
  to = 's';
  for (let i = 0; i < 26; i++) { const t = i / 12; dab(t, 0.018 + 0.012 * ((i * 5) % 3), ((i * 7) % 5 - 2) * 0.2, 2000 + ((i * 11) % 6) * 320); }   // the picture is dabbed in
  bell(q.sun, 'A5', 0.035, 0.25);                                                                                       // the first dabs: the sun
  sweep(q.water, q.water + 0.75, 0.012, 500, 1500, -0.3);                                                               // the water, left to right
  for (let i = 0; i < 5; i++) dab(q.boat + i * 0.085, 0.035, -0.3, 1500 + i * 300);                                     // Skiff, keel to masthead
  sweep(q.wave, q.wave + 1.0, 0.016, 700, 2400, 0);                                                                     // the warm wave
  for (let i = 0; i < 3; i++) blip(q.birds + 0.2 + i * 0.4, 2700 + (i % 2) * 300, 2100, 0.05, 0.014, 0.3 - i * 0.2);    // birds
  sweep(2.4, 3.0, 0.014, 500, 3000, 0);                                                                                 // into the morph
  for (let i = 0; i < 7; i++) bell(q.star + i * 0.25, ['A5', 'D6', 'Fs6', 'E6', 'B5', 'A6', 'D6'][i], 0.022, -0.4 + i * 0.13);   // stars
  [q.lamp1, q.lamp2, q.lamp3].forEach((t, i) => { dab(t, 0.05, 0.1 + i * 0.2, 3200); blip(t, 900 + i * 150, 1300 + i * 150, 0.09, 0.03, 0.1 + i * 0.2); });   // lamps
  bell(q.lantern, 'Fs5', 0.06, 0.1); bell(q.lantern + 0.02, 'B5', 0.045, 0.2); sub(q.lantern, 0.05);                    // the lantern
  for (let i = 0; i < 5; i++) blip(q.fly + i * 0.14, 3300 + (i % 3) * 250, 3600, 0.03, 0.012, -0.5 + (i % 2) * 0.2);    // fireflies
