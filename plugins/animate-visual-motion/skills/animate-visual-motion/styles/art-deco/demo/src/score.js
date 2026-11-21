  // SCORE BODY — art deco demo (inside buildScore(); see kit/score-head.js). A slow, elegant waltz-less 4/4: a soft pad,
  // harp-like plucks rising in arpeggios, a small bass; a glassy tick for every tier, a shimmer as the fan opens,
  // chimes for the lanterns, soft water for the fountains.
  const T = TIMELINE, q = T.cues;
  const tick = (t, f, vel, pan = 0) => { blip(t, f, f * 0.98, 0.05, vel, pan); noiseHit(t, 0.02, 'highpass', 7000, 0.7, vel * 0.4, pan); };   // a tier lands
  const twinkle = (t, f, vel, pan = 0) => blip(t, f, f * 1.02, 0.12, vel, pan);
  to = 'm';
  pad(0.0, 3.1, ['A2', 'E3', 'C4', 'B4'], 0.05, { type: 'triangle', cut: 1100, att: 0.4, rel: 0.3, send: 0.5 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4', 'G4'], 0.075, { type: 'triangle', cut: 1800, att: 0.15, rel: 0.4, send: 0.5 });
  const hA = ['A3', 'E4', 'A4', 'B4', 'C5', 'B4', 'A4', 'E4'], hB = ['F3', 'C4', 'F4', 'A4', 'C5', 'E5', 'G5', 'E5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; pluck(t, nz((t < 3 ? hA : hB)[i % 8]), t < 3 ? 0.05 : 0.065, i % 2 ? 0.3 : -0.3, 0.5, t < 3 ? 2400 : 3400, 0.4); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'A2' : 'E2') : (i % 4 < 2 ? 'F2' : 'C3')), t < 3 ? 0.07 : 0.09); }
  ['F4', 'A4', 'C5', 'E5'].forEach((n, i) => pluck(3.0 + i * 0.03, nz(n), 0.1, -0.3 + i * 0.2, 0.7, 3600, 0.45));        // the payoff: the lantern
  sub(3.0, 0.08);
  chime(3.0, [nz('F5'), nz('A5'), nz('C6')], 0.06, 0);
  to = 's';
  for (let i = 0; i < 4; i++) tick(q.rise + i * 0.25, 880 * 2 ** (i * 2 / 12), 0.035, i % 2 ? 0.35 : -0.35);                // towers: a tier every 8th
  sweep(q.ring, q.ring + 0.5, 0.01, 1800, 4200, 0);                                                                       // the moon's rim draws on
  chime(q.moon, [nz('E5'), nz('B5')], 0.035, 0);                                                                          // the moon fills
  [0, 1, 2, 3, 4, 5].forEach((i) => twinkle(q.fan + i * 0.07, nz(['A5', 'C6', 'E6', 'A6', 'C7', 'E7'][i]), 0.02, -0.5 + i * 0.2));   // the fan opens
  sweep(q.fan, q.fan + 0.6, 0.012, 2400, 7000, 0);
  blip(q.look, 520, 780, 0.16, 0.03, 0);                                                                                  // the crane wakes
  [0, 0.25, 0.5].forEach((d, i) => twinkle(q.lit + d, 2100 + i * 300, 0.014, i % 2 ? 0.4 : -0.4));                         // windows come on
  sweep(2.4, 3.0, 0.014, 500, 3000, 0);                                                                                   // into the morph
  [0, 1, 2, 3, 4, 5, 6].forEach((i) => twinkle(q.rays + i * 0.09, 1400 + i * 180, 0.014, i % 2 ? 0.3 : -0.3));             // rays go out one after another
  chime(q.side, [nz('C6'), nz('G6')], 0.04, 0);                                                                           // the side lanterns light
  sweep(q.jet, q.jet + 0.5, 0.012, 900, 5200, 0);                                                                         // the fountains come up
  for (let i = 0; i < 14; i++) noiseHit(q.jet + 0.5 + i * 0.105, 0.05, 'bandpass', 4200 + (i % 3) * 900, 1.2, 0.012, i % 2 ? 0.55 : -0.55, 0.2);   // water
  sweep(q.tail, q.tail + 0.6, 0.014, 1600, 6000, 0);                                                                      // the tail opens
  [0, 1, 2, 3, 4].forEach((i) => twinkle(q.tail + i * 0.11, nz(['C5', 'E5', 'G5', 'C6', 'E6'][i]), 0.026, -0.3 + i * 0.15));
  [0, 1, 2, 3, 4, 5].forEach((i) => twinkle(q.ripple + i * 0.05, 2600 + i * 220, 0.014, -0.4 + i * 0.16));                 // light ripples across the tail
  blip(q.bow, 700, 480, 0.2, 0.028, 0);                                                                                   // the bow
