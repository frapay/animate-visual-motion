  // SCORE BODY — storybook demo (inside buildScore(); see kit/score-head.js)
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['F3', 'C4', 'A4'], 0.03, { type: 'triangle', cut: 900, att: 0.3, rel: 0.3, send: 0.4 });                         // a hush of night
  [['A5', 0.25], ['C6', 0.75], ['F5', 1.25], ['G5', 1.75], ['A5', 2.25]].forEach(([n, t], i) => pluck(t, nz(n), 0.11, -0.2 + i * 0.1, 0.6, 2600, 0.5));   // a music box
  pluck(cu.look, nz('E6'), 0.12, 0.2, 0.6, 3000, 0.5);
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4'], 0.045, { cut: 1100, att: 0.25, rel: 0.3, send: 0.4 });                                // morning
  ['F4', 'A4', 'C5'].forEach((n, i) => pluck(3.0, nz(n), 0.2, -0.2 + i * 0.2, 0.45, 3400, 0.35));                                  // the payoff: a short chord stab as the sun appears (the loudest moment)
  sub(3.0, 0.16);
  [cu.hop1, cu.hop2].forEach((t, i) => pluck(t, nz(i ? 'C5' : 'A4'), 0.14, 0.15, 0.4, 3000, 0.3));                               // the hops
  pluck(5.5, nz('F5'), 0.1, 0, 0.5, 2800, 0.5);                                                                                   // home                                // the hops
  [['F5', 0], ['A5', E16], ['C6', E8]].forEach(([n, dt], i) => pluck(cu.wave + dt, nz(n), 0.16 - i * 0.03, -0.1 + i * 0.1, 0.5, 4200, 0.4));   // the wave
  to = 's';
  sweep(2.4, 3.0, 0.012, 400, 2400, 0);                                                                                           // into the morph
  chime(3.0, [nz('F5'), nz('C6'), nz('A6')], 0.08, 0);                                                                            // the sun
  for (let i = 0; i < 4; i++) blip(3.9 + i * E8 + (i % 2) * E16, 2400 + (i % 2) * 500, 1900, 0.03, 0.022, 0.3);                // birds
