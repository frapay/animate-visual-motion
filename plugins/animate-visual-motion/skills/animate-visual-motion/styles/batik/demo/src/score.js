  // SCORE BODY — batik demo (inside buildScore(); see kit/score-head.js). Gentle and Javanese: a siter-like pluck
  // line in a pelog-like five-note scale (D Eb G A Bb) on the 8ths at 80 BPM, gender chimes on the beats, a soft
  // gong at the start and on the morph, and the hiss of wax being drawn.
  const T = TIMELINE, q = T.cues;
  const PL = ['D4', 'Eb4', 'G4', 'A4', 'Bb4', 'D5', 'Eb5', 'G5'].map(nz);
  const gong = (t, vel) => { to = 'm'; drone(t, t + 3.0, 73.4, vel * 0.5, { att: 0.012, rel: 2.5 }); drone(t, t + 2.8, 74.6, vel * 0.32, { att: 0.012, rel: 2.3 }); sub(t, vel * 0.55); };
  const wax = (t0, t1, vel, pan = 0) => { to = 's'; sweep(t0, t1, vel, 5200, 7400, pan); };
  to = 'm';
  pad(0.0, 6.05, ['D3', 'A3'], 0.011, { type: 'triangle', cut: 800, att: 0.7, rel: 0.5, send: 0.6 });
  const line = [0, 2, 3, 2, 4, 3, 2, 0, 3, 4, 5, 4, 6, 5, 4, 3];          // one note an 8th; era 2 sits higher
  line.forEach((d, i) => pluck(i * E8, PL[d], i % 2 ? 0.075 : 0.105, i % 2 ? 0.25 : -0.2, 0.7, 2800, 0.4));
  for (let i = 0; i < 16; i++) if (i % 4 === 1 || i > 9) pluck(i * E8 + E16, PL[(line[i] + 2) % 8] * (i > 7 ? 2 : 1), 0.035, 0.4, 0.4, 4200, 0.35);   // ornaments
  for (let i = 0; i < 8; i++) chime(i * BEAT, [PL[i < 4 ? 0 : 3] * 2], 0.035, i % 2 ? 0.3 : -0.3);   // gender on the beat
  for (let i = 0; i < 8; i++) bass(i * BEAT, nz(i < 4 ? 'D2' : 'G2') , 0.07);
  gong(0.0, 0.15); gong(3.0, 0.19);
  to = 'm'; chime(3.0, [PL[3] * 2, PL[5] * 2, PL[7] * 2], 0.05, 0);
  // sfx: wax hiss while lines draw on, a chirp when the bird is done, soft wing beats, truntum twinkles
  wax(0.1, 1.4, 0.012, -0.2); wax(q.flower, q.flower + 0.7, 0.014, 0.4);
  to = 's';
  blip(1.5, 2500, 3300, 0.06, 0.02, -0.1); blip(1.62, 2700, 3600, 0.07, 0.02, -0.1);
  blip(q.glow, 500, 1100, 0.3, 0.025, 0.4);
  for (let i = 0; i < 3; i++) blip(q.spark + i * 0.19, 2900 + i * 300, 3300 + i * 300, 0.05, 0.014, 0.5 - i * 0.2);
  sweep(2.45, 3.0, 0.014, 500, 2400, 0);
  for (let i = 0; i < 6; i++) noiseHit(3.3 + i * (1 / 2.2), 0.12, 'bandpass', 380, 1.2, 0.03, -0.3 + i * 0.06, 0.15);
  for (let i = 0; i < 6; i++) blip(q.stars + [0, 0.2, 0.35, 0.5, 0.7, 0.9][i], 3000 + (i % 3) * 350, 3400 + (i % 3) * 350, 0.05, 0.012, i % 2 ? 0.4 : -0.4);
  blip(4.5, 2500, 3300, 0.06, 0.018, 0.1); blip(4.62, 2700, 3600, 0.07, 0.018, 0.1);
