  // SCORE BODY — watercolor demo (inside buildScore(); see kit/score-head.js). Slow and wet: a soft pad under sparse
  // kalimba-like plucks; rain is a thin hiss with ticks, each big drop a "plink"; every rainbow band is a rising chime.
  const T = TIMELINE, q = T.cues;
  const plink = (t, f, vel, pan = 0) => { blip(t, f, f * 1.6, 0.09, vel, pan); noiseHit(t, 0.03, 'highpass', 5200, 0.7, vel * 0.5, pan, 0.3); };   // a drop lands
  const chirp = (t, vel, pan = 0) => { blip(t, 2500, 3500, 0.05, vel, pan); blip(t + 0.085, 3000, 3900, 0.045, vel * 0.8, pan); };
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F4'], 0.07, { type: 'triangle', cut: 1000, att: 0.4, rel: 0.4, send: 0.5 });
  pad(3.0, 6.05, ['D3', 'A3', 'Fs4', 'A4'], 0.085, { type: 'triangle', cut: 1700, att: 0.2, rel: 0.4, send: 0.5 });
  const mA = ['D4', 'F4', 'A4', 'F4', 'E4', 'F4', 'D4', 'A3'], mB = ['D4', 'Fs4', 'A4', 'D5', 'B4', 'A4', 'Fs4', 'A4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 3 && i % 2 && i % 4 !== 3) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.06 : 0.065, i % 2 ? 0.25 : -0.25, 0.4, t < 3 ? 1500 : 2400, 0.4); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'D2' : 'G2')) * 2, t < 3 ? 0.06 : 0.08); }
  ['D4', 'Fs4', 'A4'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.2 + i * 0.2, 0.6, 3000, 0.45));                       // the payoff: the sky clears
  sub(3.0, 0.07);
  chime(3.0, [nz('D5'), nz('Fs5'), nz('A5')], 0.05, 0);
  to = 's';
  [q.c1, q.c2, q.c3].forEach((t, i) => sweep(t, t + 0.5, 0.012, 300, 900, -0.3 + i * 0.3));                             // clouds bloom
  noiseHit(q.rain - 0.1, 1.5, 'highpass', 4200, 0.5, 0.016, 0, 0.3);                                                    // the rain: a hiss and ticks
  for (let i = 0; i < 22; i++) { const R = RNG('raintick', i), t = q.rain + i * 0.06 + R.r(0, 0.03); if (t < q.stop + 0.1) noiseHit(t, 0.02, 'bandpass', R.r(2600, 6000), 2, 0.02, R.n(0.6)); }
  [q.d1, q.d2, q.d3].forEach((t, i) => plink(t, [880, 990, 1170][i], 0.07, [-0.1, 0.15, 0][i]));
  blip(q.peek, 1500, 2300, 0.07, 0.035, -0.45);                                                                         // the bird looks up
  sweep(2.4, 3.0, 0.014, 400, 2200, 0);                                                                                 // into the morph
  sweep(q.sun, q.sun + 0.5, 0.01, 800, 2400, 0.4);                                                                      // the sun
  ['D5', 'E5', 'Fs5', 'A5', 'B5', 'D6'].forEach((n, i) => chime(q.bow + i * E16, [nz(n)], 0.05, -0.4 + i * 0.16));      // the rainbow, band by band
  for (let i = 0; i < 4; i++) noiseHit(q.fly + i * 0.25, 0.07, 'bandpass', 900, 1.2, 0.022, -0.5 + i * 0.2);            // wing beats
  chirp(q.sing + 0.08, 0.045, 0.1); chirp(q.sing2, 0.045, 0.1);                                                         // the bird sings
