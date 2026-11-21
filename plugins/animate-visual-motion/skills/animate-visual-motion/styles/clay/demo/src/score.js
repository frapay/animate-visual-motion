  // SCORE BODY — clay demo (inside buildScore(); see kit/score-head.js). A toy-box tune: a soft triangle pad, short
  // woody plucks on the 8ths, a small bass; every landing is a soft thud, every pat and pop a short "plop".
  const T = TIMELINE, q = T.cues;
  const plop = (t, f, vel, pan = 0) => blip(t, f, f * 0.45, 0.08, vel, pan);                                           // clay pressed
  const pop = (t, f, vel, pan = 0) => blip(t, f, f * 2.2, 0.06, vel, pan);                                             // something pops out
  const thud = (t, vel, pan = 0) => { sub(t, vel); noiseHit(t, 0.09, 'lowpass', 500, 0.7, vel * 0.3, pan, 0.2); };
  to = 'm';
  pad(0.0, 3.1, ['C3', 'G3', 'E4'], 0.06, { type: 'triangle', cut: 1200, att: 0.3, rel: 0.3, send: 0.4 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4'], 0.085, { type: 'triangle', cut: 1700, att: 0.15, rel: 0.3, send: 0.4 });
  const mA = ['E4', 'G4', 'C5', 'G4', 'A4', 'G4', 'E4', 'D4'], mB = ['A4', 'C5', 'F5', 'C5', 'G5', 'F5', 'C5', 'A4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.055 : 0.07, i % 2 ? 0.25 : -0.25, 0.22, t < 3 ? 1800 : 2600, 0.25); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; if (t < 0.5) continue; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'C2' : 'G1') : (i % 4 < 2 ? 'F2' : 'C2')) * 2, t < 3 ? 0.07 : 0.09); }
  for (let i = 0; i < 6; i++) noiseHit(3.0 + i * BEAT + E8, 0.04, 'highpass', 6500, 0.7, 0.03, i % 2 ? 0.25 : -0.25);
  ['F4', 'A4', 'C5'].forEach((n, i) => pluck(3.0, nz(n), 0.11, -0.2 + i * 0.2, 0.45, 3200, 0.35));                     // the payoff: the tree
  sub(3.0, 0.09);
  chime(3.0, [nz('F5'), nz('A5'), nz('C6')], 0.06, 0);
  to = 's';
  blip(0.1, 1300, 420, 0.38, 0.03, 0.15);                                                                              // the seed falls
  thud(q.land, 0.1, 0.1); plop(q.land, 260, 0.05, 0.1);
  [0, 0.25].forEach((d, i) => plop(q.hopin + d + 0.2, 420 + i * 60, 0.05, -0.4 + i * 0.15));                           // the hero hops in
  plop(q.pat + 0.12, 200, 0.06, 0.05);                                                                                 // the pat
  pop(q.jump, 380, 0.05, 0.1); thud(q.jump + 0.34, 0.07, 0.1);                                                         // the seed jumps
  sweep(2.4, 3.0, 0.014, 400, 2400, 0);                                                                                // into the morph
  plop(2.92, 150, 0.05, 0);
  [q.f1, q.f1 + 1 / 6, q.f2 + 1 / 12, q.f3].forEach((t, i) => pop(t, 620 + i * 110, 0.05, -0.1 + i * 0.12));           // fruit
  blip(q.drop, 1100, 500, 0.24, 0.022, 0.35); thud(q.bounce, 0.1, 0.35); plop(q.bounce, 300, 0.05, 0.35);              // one drops and bounces
  [q.bounce + 0.34, q.hop2 + 0.34].forEach((t) => plop(t, 240, 0.04, -0.35));                                          // the hero lands
  for (let i = 0; i < 3; i++) blip(3.6 + i * 0.75 + (i % 2) * E16, 2300 + (i % 2) * 400, 1800, 0.035, 0.02, 0.4);     // the bird
