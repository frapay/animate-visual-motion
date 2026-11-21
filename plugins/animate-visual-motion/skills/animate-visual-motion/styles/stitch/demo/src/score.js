  // SCORE BODY — stitch demo (inside buildScore(); see kit/score-head.js). A music-box lullaby waltz: 60 BPM in
  // triplets (two bars of three beats, D major then G - A), the melody on the triplet 8ths, an oom-pah-pah bass,
  // and the needle ticking on the 2s grid (1/12 s) exactly where the picture lands a stitch.
  const T = TIMELINE, q = T.cues;
  const PN = ['D5', 'E5', 'Fs5', 'A5', 'B5', 'D6', 'E6', 'Fs6', 'A6'].map(nz);
  const tick = (t, vel, pan = 0) => { to = 's'; noiseHit(t, 0.022, 'highpass', 6200, 0.7, vel, pan, 0.05); };
  const pof = (t, vel) => { to = 's'; noiseHit(t, 0.14, 'lowpass', 520, 0.8, vel, 0, 0.1); blip(t, 170, 95, 0.12, vel * 0.8, 0); };
  to = 'm';
  pad(0.0, 3.05, ['D3', 'A3', 'Fs4'], 0.036, { type: 'triangle', cut: 900, att: 0.5, rel: 0.5, send: 0.5 });
  pad(3.0, 4.55, ['G3', 'D4', 'B4'], 0.05, { type: 'triangle', cut: 900, att: 0.3, rel: 0.4, send: 0.5 });
  pad(4.5, 6.05, ['A3', 'E4', 'Cs5'], 0.05, { type: 'triangle', cut: 900, att: 0.3, rel: 0.5, send: 0.5 });
  const mel = [2, 3, 5, 4, 3, 2, 3, 1, 0, 3, 4, 6, 5, 4, 3, 4, 6, 8];   // one note a triplet 8th
  mel.forEach((d, i) => pluck(i * T3, PN[d], (i % 3 ? 0.05 : 0.06) * (i < 9 ? 0.85 : 1), i % 2 ? 0.25 : -0.2, 0.75, 5200, 0.45));
  [[0, 'D2'], [3, 'G2'], [4.5, 'A2']].forEach(([t, n]) => bass(t, nz(n), 0.06));
  [[1, ['A3', 'D4']], [2, ['A3', 'Fs4']], [4, ['B3', 'D4']], [5, ['Cs4', 'E4']]].forEach(([t, ns]) => ns.forEach((n, i) => pluck(t, nz(n), 0.032, i ? 0.3 : -0.3, 0.5, 1800, 0.3)));
  chime(0.0, [PN[0], PN[3]], 0.035, -0.2); chime(3.0, [PN[3], PN[5], PN[7]], 0.026, 0);
  // sfx: the felt lands, the needle ticks once per stitch (the pull a little louder every other one), petals, sequins
  pof(Math.max(0, q.drop + 0.1), 0.035);
  for (let i = 0; i < 22; i++) tick(q.sew + i * T12, i % 2 ? 0.01 : 0.018, -0.3 + i * 0.027);
  to = 's';
  for (let i = 0; i < 4; i++) blip(q.flower + i * T3, 1500 + i * 180, 1900 + i * 180, 0.06, 0.012, i % 2 ? 0.4 : -0.4);
  for (let i = 0; i < 3; i++) blip(q.spark + i * T6, 3000 + i * 400, 3500 + i * 400, 0.05, 0.016, 0.4 - i * 0.3);
  sweep(2.45, 3.0, 0.012, 600, 2600, 0);
  // era 2: cross-stitches run round the border, the bear lands, the button sun clicks on and gets its rays, stars
  for (let i = 0; i < 9; i++) tick(3.25 + i * T6, 0.011, 0.5 - i * 0.12);
  pof(q.bear + 0.2, 0.035);
  to = 's'; blip(q.sun, 950, 520, 0.05, 0.028, 0.4); noiseHit(q.sun, 0.03, 'bandpass', 2400, 2, 0.03, 0.4, 0.1);
  for (let i = 0; i < 12; i++) tick(q.sun + T6 + i * T12, 0.011, 0.4);
  to = 's';
  for (let i = 0; i < 6; i++) blip(q.stars + i * T6, 2800 + (i % 3) * 380, 3300 + (i % 3) * 380, 0.05, 0.013, i % 2 ? 0.4 : -0.4);
  blip(5.0, 620, 880, 0.09, 0.02, -0.3); blip(5.17, 700, 990, 0.1, 0.02, -0.3);   // the bear says hello
