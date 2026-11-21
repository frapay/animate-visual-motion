  // SCORE BODY — packshot demo (inside buildScore(); see kit/score-head.js). A bright, light product spot: a marimba-like
  // pattern in C that lifts to F at the morph, a soft pad, a round bass; a thud when a product lands, a pop for every
  // pill, a shimmer for the glint, a two-note chime for the price.
  const T = TIMELINE, q = T.cues;
  const pop = (t, f = 700, vel = 0.03, pan = 0) => blip(t, f, f * 1.9, 0.07, vel, pan);                                      // something pops in
  const thud = (t, vel = 0.06) => { noiseHit(t, 0.06, 'lowpass', 500, 0.8, vel, 0); blip(t, 150, 80, 0.12, vel, 0); };      // something lands
  const swish = (t, pan = 0) => sweep(t, t + 0.28, 0.012, 700, 2600, pan);                                                   // a prop slides in
  to = 'm';
  pad(0.0, 3.05, ['C3', 'G3', 'E4', 'A4'], 0.035, { type: 'triangle', cut: 1400, att: 0.3, rel: 0.4, send: 0.45 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4', 'G4'], 0.045, { type: 'triangle', cut: 1700, att: 0.2, rel: 0.6, send: 0.45 });
  const pat1 = ['E5', 'G5', 'C5', 'G5', 'A5', 'G5', 'E5', 'G5'], pat2 = ['A5', 'C6', 'F5', 'C6', 'E6', 'C6', 'A5', 'G5'];
  for (let i = 0; i < 12; i++) pluck(i * E8, nz(pat1[i % 8]), 0.04 + (i % 4 === 0 ? 0.012 : 0), i % 2 ? 0.3 : -0.3, 0.26, 3600, 0.35);
  for (let i = 0; i < 12; i++) pluck(3.0 + i * E8, nz(pat2[i % 8]), 0.045 + (i % 4 === 0 ? 0.012 : 0), i % 2 ? 0.3 : -0.3, 0.26, 4000, 0.35);
  for (let i = 0; i < 6; i++) bass(i * BEAT, nz(i % 4 === 3 ? 'G2' : 'C2'), 0.07);
  for (let i = 0; i < 6; i++) bass(3.0 + i * BEAT, nz(i % 4 === 3 ? 'C2' : 'F2'), 0.08);
  ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => pluck(3.0 + i * 0.03, nz(n), 0.07, -0.3 + i * 0.2, 0.8, 3200, 0.45));          // the new set opens
  chime(q.price + 0.05, [nz('C6'), nz('G6')], 0.04, 0.1); chime(q.price + 0.3, [nz('F6'), nz('C7')], 0.035, 0.2);           // the price
  to = 's';
  sweep(q.rise, q.rise + 0.4, 0.014, 300, 900, 0);                                                                           // the podium rises
  swish(q.arch, 0.4); swish(q.disc, -0.4);
  thud(q.drop + 0.34, 0.07); thud(q.hero + 0.34, 0.035);                                                                     // the bottle lands, then the little jar
  pop(q.ball, 500, 0.02, -0.4); pop(q.badge, 760, 0.035, -0.3); pop(q.call, 1100, 0.02, 0.3);
  blip(q.glint + 0.2, 2600, 4200, 0.3, 0.012, 0.1);                                                                          // a glint
  sweep(2.5, 3.0, 0.028, 500, 2600, 0);                                                                                      // the set closes onto the bottle
  sub(q.morph, 0.22); noiseHit(q.morph, 0.3, 'lowpass', 1400, 0.7, 0.035, 0, 0.3, 300);
  swish(q.arch2, -0.4); swish(q.steps, 0.4);
  thud(q.hero2 + 0.34, 0.035); pop(q.ball2, 500, 0.02, 0.4); pop(q.badge2, 760, 0.035, -0.3); pop(q.call2, 1100, 0.02, 0.3); pop(q.price, 620, 0.04, 0);
  blip(q.glint2 + 0.2, 2800, 4400, 0.3, 0.012, -0.1);
