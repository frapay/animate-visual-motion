  // SCORE BODY — diorama demo (inside buildScore(); see kit/score-head.js). Slow and calm, like a music box beside
  // a light box: a soft triangle pad (D major at dusk, B minor at night), a music-box line on the beat with a few
  // 8ths, a low note every two beats, paper sliding as each sheet rises, a chime on the morph and one for every
  // window that lights, crickets at night.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4', 'B4'], 0.062, { cut: 1300, att: 0.6, rel: 0.4, send: 0.6, type: 'triangle' });
  pad(3.0, 6.05, ['B2', 'Fs3', 'D4', 'A4'], 0.07, { cut: 1150, att: 0.3, rel: 0.5, send: 0.6, type: 'triangle' });
  const box = [[0, 'Fs5'], [1, 'A5'], [1.5, 'B5'], [2, 'D6'], [3, 'A5'], [3.5, 'Fs5'], [4, 'E5'], [5, 'A5'], [5.5, 'D6'],
               [6, 'Fs6'], [7, 'D6'], [7.5, 'B5'], [8, 'A5'], [9, 'B5'], [9.5, 'D6'], [10, 'Fs5'], [11, 'B5'], [11.5, 'A5']];
  box.forEach(([b, n], i) => { const t = b * BEAT; pluck(t, nz(n), 0.09, i % 2 ? 0.25 : -0.25, 0.75, 5200, 0.5); pluck(t + 0.012, nz(n) / 2, 0.035, 0, 0.5, 2400, 0.4); });
  for (let i = 0; i < 6; i++) bass(i * BEAT * 2, nz(i < 3 ? 'D3' : 'B2'), 0.08);
  for (let i = 0; i < 3; i++) bass(i * BEAT * 2 + BEAT * 1.5, nz('A2'), 0.045);
  for (let i = 0; i < 3; i++) bass(3 + i * BEAT * 2 + BEAT * 1.5, nz('Fs2') * 2, 0.05);
  chime(3.0, [nz('D5'), nz('A5'), nz('Fs6')], 0.1, 0.2);                                  // the sun becomes the lantern
  [[q.win1, 'D6'], [q.win2, 'Fs6'], [q.win3, 'A6'], [q.win4, 'B6'], [q.win5, 'D7']].forEach(([t, n], i) => chime(t, [nz(n), nz(n) * 1.5], 0.045, -0.3 + i * 0.15));   // windows light up
  to = 's';
  for (const [t, p] of [[q.vil, -0.3], [q.ridge, 0.2], [q.near, -0.1], [q.leaves, 0], [q.near2, 0.1], [q.leaves2, 0]]) noiseHit(t, 0.55, 'bandpass', 620, 0.8, 0.034, p, 0.3, 1900);   // a sheet of paper slides into place
  for (let i = 0; i < 3; i++) { const t = q.birds + 0.2 + i * 0.22; blip(t, 2500 + i * 180, 3300 + i * 180, 0.05, 0.014, 0.5 - i * 0.2); blip(t + 0.09, 2900, 2500, 0.04, 0.01, 0.5 - i * 0.2); }   // birds
  blip(q.look, 420, 640, 0.14, 0.03, -0.2);                                               // the deer lifts its head
  sweep(2.4, 3.0, 0.02, 380, 2800, 0);
  noiseHit(3.0, 0.4, 'bandpass', 1100, 0.9, 0.045, 0, 0.4, 380);
  for (let t = q.deer + 1 / 3; t < q.stop; t += 1 / 3) noiseHit(t, 0.05, 'lowpass', 380, 1, 0.045, -0.4 + (t - q.deer) * 0.3);   // the deer's steps
  for (let i = 0; i < 11; i++) { const t = 3.4 + i * E8 * 1.0 + (i % 2) * 0.03; for (let k = 0; k < 3; k++) blip(t + k * 0.035, 4300, 4250, 0.018, 0.0055, i % 2 ? 0.6 : -0.6); }   // crickets
  blip(q.ear, 900, 1300, 0.05, 0.016, -0.2); blip(q.ear + 0.36, 950, 1350, 0.05, 0.012, -0.2);                                   // an ear flicks
