  // SCORE BODY — line-art demo (inside buildScore(); see kit/score-head.js). Calm and sparse at 80 BPM: a soft sine/triangle
  // pad, felt-like plucks on the 8ths in D major, a quiet pen hiss while the line draws, a round pop for the blob.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4'], 0.05, { type: 'triangle', cut: 900, att: 0.5, rel: 0.5, send: 0.5 });
  pad(2.95, 6.05, ['G3', 'D4', 'B4'], 0.05, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.7, send: 0.5 });
  drone(0.0, 3.0, nz('D2'), 0.05, { att: 0.6, rel: 0.5 });
  drone(3.0, 6.0, nz('G2'), 0.05, { att: 0.3, rel: 0.8 });
  const arp1 = ['D4', 'A4', 'Fs4', 'A4', 'D5', 'A4', 'E4', 'A4'], arp2 = ['G4', 'B4', 'D5', 'B4', 'G4', 'D5', 'B4', 'D5'];
  for (let i = 0; i < 16; i++) { const t = i * E8, n = (i < 8 ? arp1 : arp2)[i % 8]; pluck(t + 0.004, nz(n), i % 2 ? 0.07 : 0.1, i % 2 ? 0.25 : -0.25, 0.7, 1500, 0.4); }
  pluck(q.blob, nz('A5'), 0.07, 0.1, 0.9, 2200, 0.5);
  chime(3.0, [nz('D5'), nz('G5'), nz('B5')], 0.07, 0.15);
  chime(q.done2, [nz('B5'), nz('D6')], 0.05, -0.2);
  to = 's';
  // the pen on paper: a quiet band of noise for as long as the line is being drawn
  sweep(0.02, q.line + q.lineDur, 0.016, 2600, 3400, 0.1);
  sweep(q.line2 + 0.1, q.line2 + q.line2Dur, 0.014, 2800, 3800, -0.2);
  blip(q.blob, 320, 620, 0.12, 0.06, -0.2);                                  // the blob pops in
  noiseHit(q.steam, 0.5, 'highpass', 5000, 0.5, 0.012, -0.3, 0.4);          // steam
  sweep(2.5, 3.0, 0.02, 500, 1800);                                          // the iris closes on the blob
  for (let i = 0; i < 10; i++) blip(q.rays + i * 0.05, 1500 + i * 90, 1700 + i * 90, 0.04, 0.012, 0.3);   // the rays tick on
