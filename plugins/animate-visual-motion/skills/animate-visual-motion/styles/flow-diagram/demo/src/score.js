  // SCORE BODY — flow-diagram demo (inside buildScore(); see kit/score-head.js). A light, clean pulse: a soft kick on
  // the beat, hats on 8ths, a tick as each edge draws, a rising blip as each node lights, a chime when it arrives.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  for (let i = 0; i < 12; i++) { sub(i * BEAT, i === 6 ? 0.36 : i < 6 ? 0.22 : 0.3); bass(i * BEAT + E8, nz(i < 6 ? 'D2' : 'G2') * 2, i < 6 ? 0.05 : 0.07); }
  for (let i = 0; i < 24; i++) noiseHit(i * E8, 0.035, 'highpass', 7500, 0.8, i % 2 ? 0.04 : 0.02, i % 4 < 2 ? -0.25 : 0.25);
  pad(0.0, 3.0, ['D3', 'A3', 'Fs4'], 0.012, { type: 'triangle', cut: 1200, att: 0.3, rel: 0.3, send: 0.3 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'Fs4'], 0.02, { type: 'triangle', cut: 1500, att: 0.35, rel: 0.3, send: 0.4 });
  chime(q.at5, [nz('G5'), nz('B5'), nz('D6')], 0.09, 0.1);
  to = 's';
  for (const t of [q.e1, q.e2, q.ya, q.e4]) { noiseHit(t, 0.12, 'bandpass', 3200, 1.4, 0.03, 0, 0.12, 7000); blip(t + 0.2, 2400, 2200, 0.02, 0.03, 0.2); }   // an edge draws, its arrowhead ticks
  for (const t of [q.n2, q.n3, q.nKirim, q.nSampai]) blip(t, 420, 620, 0.07, 0.04, -0.2);                                 // a node pops
  blip(q.at2, 660, 990, 0.09, 0.07, 0.1); blip(q.at3, 740, 1110, 0.09, 0.07, 0.1);                                         // the packet lands, the node lights
  blip(q.at4, 784, 1176, 0.09, 0.08, 0.1); blip(q.at5, 880, 1320, 0.12, 0.09, 0);
  blip(q.note, 1500, 1300, 0.03, 0.03, 0.35); blip(q.end, 1760, 1760, 0.05, 0.03, 0.2);
  blip(q.tidak, 300, 220, 0.09, 0.035, 0.4); blip(q.nCoba, 260, 200, 0.08, 0.03, 0.4);                                     // the "no" branch: lower, quieter
  sweep(2.5, 3.0, 0.012, 500, 3200, 0);
  noiseHit(3.0, 0.3, 'bandpass', 1400, 1.0, 0.02, 0, 0.3, 500);
