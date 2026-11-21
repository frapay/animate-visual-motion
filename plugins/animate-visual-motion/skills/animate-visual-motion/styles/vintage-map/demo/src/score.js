  // SCORE BODY — vintage map demo (inside buildScore(); see kit/score-head.js). A small caravan tune in D hijaz:
  // a warm drone pad, low oud-like plucks on the 8ths, a frame drum (dum on the beat, tek between). The quill
  // scratches as it draws; every place that is inked gets a soft tick; the arrival gets a chime.
  const T = TIMELINE, q = T.cues;
  const scratch = (t, dur, vel, pan = 0) => noiseHit(t, dur, 'bandpass', 3800, 1.4, vel, pan, 0.1, 5200);                // the pen on paper
  const tick = (t, f, vel, pan = 0) => blip(t, f, f * 0.7, 0.05, vel, pan);                                               // a place is inked
  const dum = (t, vel) => { sub(t, vel); noiseHit(t, 0.08, 'lowpass', 420, 0.8, vel * 0.5, 0, 0.15); };
  const tek = (t, vel, pan = 0) => noiseHit(t, 0.035, 'bandpass', 2400, 2.2, vel, pan, 0.15);
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'D4'], 0.05, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.3, send: 0.45 });
  pad(3.0, 6.05, ['D3', 'A3', 'Fs4', 'A4'], 0.07, { type: 'triangle', cut: 1600, att: 0.15, rel: 0.3, send: 0.45 });
  const mA = ['D4', 'Eb4', 'Fs4', 'G4', 'A4', 'G4', 'Fs4', 'Eb4'], mB = ['A4', 'Bb4', 'A4', 'G4', 'Fs4', 'G4', 'A4', 'D5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]) / 2, t < 3 ? 0.07 : 0.085, i % 2 ? 0.2 : -0.2, 0.3, t < 3 ? 1500 : 2200, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; if (t < 0.5) continue; bass(t, nz(i % 4 === 3 ? 'A2' : 'D2') * 2, t < 3 ? 0.07 : 0.09); }
  for (let i = 1; i < 12; i++) { const t = i * BEAT; if (i % 2 === 0) dum(t, t < 3 ? 0.045 : 0.06); tek(t + E8, 0.03, 0.2); if (t >= 3) tek(t + E8 + E16, 0.018, -0.2); }
  ['D4', 'Fs4', 'A4'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.2 + i * 0.2, 0.5, 3000, 0.4));                          // the payoff: the city
  sub(3.0, 0.08);
  chime(3.0, [nz('D5'), nz('Fs5'), nz('A5')], 0.05, 0);
  to = 's';
  for (let i = 0; i < 6; i++) scratch(0.04 + i * 0.11, 0.09, 0.02 + (i % 2) * 0.008, -0.5 + i * 0.2);                     // the quill inks the coast
  tick(q.city, 900, 0.045, -0.4);
  for (let i = 0; i < 6; i++) tek(q.go + i * 0.25, 0.022, lerp(-0.3, 0.3, i / 5));                                        // the camel's steps
  tick(q.dune, 700, 0.03, 0.1); tick(q.dune2, 760, 0.03, 0.4); tick(q.gurun, 640, 0.03, -0.4);
  [0, 0.08, 0.16].forEach((d, i) => blip(q.palm + d, 1200 + i * 150, 1500 + i * 150, 0.05, 0.03, -0.2 + i * 0.3));         // palms pop
  scratch(q.oasis, 0.22, 0.03, 0); blip(q.oasis + 0.1, 520, 780, 0.16, 0.04, 0);                                           // the pool is inked
  blip(q.arrive + 0.08, 700, 1050, 0.1, 0.04, 0.3);                                                                        // a happy hop
  sweep(2.4, 3.0, 0.014, 400, 2400, 0);                                                                                    // into the morph
  for (let i = 0; i < 4; i++) scratch(q.mount + i * 0.11, 0.08, 0.022, -0.2 + i * 0.2);                                    // mountains
  scratch(q.river, 0.4, 0.02, 0.4);
  [0, 0.1, 0.2, 0.3].forEach((d, i) => tick(q.forest + d, 1000 + i * 90, 0.025, -0.5));                                    // trees
  for (let i = 0; i < 5; i++) tek(q.go2 + 0.15 + i * 0.25, 0.022, lerp(-0.5, 0, i / 4));                                   // steps
  scratch(q.arrive2, 0.1, 0.045, 0.1); scratch(q.arrive2 + 0.12, 0.1, 0.045, 0.1);                                         // the X: two strokes
  blip(q.flag, 600, 1200, 0.12, 0.05, 0.1); chime(q.flag, [nz('A5'), nz('D6')], 0.04, 0.1);                                // the flag goes up
  blip(q.hop2, 700, 1050, 0.1, 0.035, -0.1);
  for (let i = 0; i < 3; i++) blip(3.7 + i * 0.8, 2100 + (i % 2) * 300, 1700, 0.04, 0.014, 0.3);                           // gulls
