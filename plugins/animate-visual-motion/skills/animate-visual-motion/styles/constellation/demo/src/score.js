  // SCORE BODY — constellation demo (inside buildScore(); see kit/score-head.js). Calm and wide: a slow sine/triangle
  // pad, a soft pulse on the beat, and ONE bell for every star that lights, climbing a pentatonic scale. Shooting
  // stars are a thin falling whistle; the morph is a breath in and a low bloom.
  const T = TIMELINE, q = T.cues;
  const bell = (t, n, vel, pan = 0) => { pluck(t, nz(n), vel, pan, 0.7, 5200, 0.55); chime(t, [nz(n) * 2], vel * 0.35, pan); };
  const whistle = (t, vel, pan) => { blip(t, 3200, 900, 0.5, vel, pan); noiseHit(t, 0.5, 'bandpass', 5200, 1.4, vel * 0.7, pan, 0.5, 1400); };
  to = 'm';
  pad(0.0, 3.15, ['D3', 'A3', 'E4'], 0.05, { type: 'triangle', cut: 900, att: 0.5, rel: 0.35, send: 0.6 });
  pad(0.0, 3.15, ['D2', 'A2'], 0.035, { type: 'sine', cut: 500, att: 0.6, rel: 0.4, send: 0.3 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'Fs4'], 0.075, { type: 'triangle', cut: 1500, att: 0.2, rel: 0.4, send: 0.6 });
  pad(3.0, 6.05, ['D4', 'A4'], 0.03, { type: 'sine', cut: 2400, att: 0.4, rel: 0.4, send: 0.6 });
  for (let i = 0; i < 12; i++) { const t = i * BEAT; if (t < 0.25) continue; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A2') : (i % 4 < 2 ? 'G2' : 'D2')) * (t < 3 ? 1 : 2), t < 3 ? 0.05 : 0.075); }
  for (let i = 0; i < 12; i++) pluck(3.0 + i * E8, nz(['B4', 'D5', 'Fs5', 'A5'][i % 4]), 0.022, i % 2 ? 0.4 : -0.4, 0.3, 3000, 0.5);   // a quiet shimmer under the payoff
  ['G3', 'B3', 'D4', 'Fs4'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.3 + i * 0.2, 0.9, 2600, 0.5));                               // the planet opens
  sub(3.0, 0.075);
  chime(3.0, [nz('D5'), nz('Fs5'), nz('A5')], 0.05, 0);
  to = 's';
  // one bell per star lit: the boat (eight stars), then the bird (ten)
  const boatStars = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0], boatNotes = ['D4', 'E4', 'Fs4', 'A4', 'B4', 'A4', 'D5', 'Fs5'];
  boatStars.forEach((t, i) => bell(t, boatNotes[i], 0.06, -0.3 + i * 0.08));
  chime(q.boat, [nz('D5'), nz('A5'), nz('D6')], 0.05, 0);                                                                             // the boat is whole
  whistle(q.shoot1, 0.016, -0.4);
  sweep(2.5, 3.0, 0.012, 300, 2200, 0);                                                                                               // into the morph
  blip(3.2, 500, 900, 0.5, 0.02, 0);                                                                                                  // the ring forms
  const birdStars = [3.75, 4.0, 4.25, 4.5, 4.625, 4.75, 5.0, 5.125, 5.25, 5.5], birdNotes = ['G4', 'A4', 'B4', 'D5', 'E5', 'D5', 'Fs5', 'A5', 'B5', 'D6'];
  birdStars.forEach((t, i) => bell(t, birdNotes[i], 0.065, 0.3 - i * 0.06));
  whistle(q.shoot2, 0.02, 0.45);
  chime(q.bird, [nz('G5'), nz('B5'), nz('D6')], 0.06, 0);                                                                             // the bird is whole
  for (let i = 0; i < 5; i++) blip(0.6 + i * 1.1 + (i % 2) * E16, 4200 + (i % 3) * 500, 3900, 0.05, 0.008, i % 2 ? 0.5 : -0.5);      // a far twinkle
