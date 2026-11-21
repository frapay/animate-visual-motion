  // SCORE BODY — aurora demo (inside buildScore(); see kit/score-head.js). Air, not rhythm: a wide minor-ninth pad
  // for the dusk that opens to a major add-nine for the mint, soft bell notes as the words land, breath-like noise
  // for the curtain of light, one deep soft note where the orb turns, a bell chord on the payoff.
  const T = TIMELINE, q = T.cues;
  const bell = (t, n, vel, pan = 0) => pluck(t, nz(n), vel, pan, 1.1, 3600, 0.7);
  to = 'm';
  pad(0.0, 3.2, ['D2', 'A2', 'F3', 'C4', 'E4'], 0.046, { type: 'triangle', cut: 850, att: 0.9, rel: 0.6, send: 0.65 });
  pad(0.4, 3.1, ['A4', 'E5'], 0.01, { type: 'sine', cut: 3200, att: 1.2, rel: 0.7, send: 0.8 });
  pad(3.0, 6.05, ['D2', 'A2', 'F#3', 'A3', 'E4'], 0.056, { type: 'triangle', cut: 1500, att: 0.35, rel: 0.7, send: 0.65 });
  pad(3.2, 6.05, ['F#4', 'A4', 'E5'], 0.013, { type: 'sine', cut: 4200, att: 0.8, rel: 0.8, send: 0.8 });
  drone(0.0, 6.0, nz('D2'), 0.035, { att: 0.8, rel: 0.6 });
  ['A4', 'C5', 'E5', 'G5'].forEach((n, i) => bell(q.words + i * 0.25, n, 0.05, -0.3 + i * 0.2));                    // the teaser's four words
  bell(q.line, 'F5', 0.035, 0.2); bell(q.line + 0.5, 'E5', 0.03, -0.2);                                             // the caption
  bell(2.5, 'A5', 0.026, 0.3);
  chime(q.payoff, [nz('D5'), nz('F#5'), nz('A5')], 0.05, 0);                                                        // "Now"
  chime(q.payoff + 0.25, [nz('E5'), nz('A5'), nz('D6')], 0.055, 0);                                                 // "available."
  ['D4', 'A4', 'F#5', 'E5', 'A5', 'D6'].forEach((n, i) => bell(q.pill + i * 0.25, n, 0.034, i % 2 ? 0.35 : -0.35)); // it settles
  to = 's';
  sweep(0.0, 1.4, 0.012, 600, 2400, -0.3);                                                                          // the curtain unrolls
  sweep(q.close - 0.3, q.turn, 0.02, 500, 3200, 0);                                                                 // the dusk closes onto the orb
  sub(q.turn, 0.07);                                                                                                // the orb turns
  noiseHit(q.turn, 0.5, 'highpass', 5200, 0.7, 0.012, 0, 0.5);
  sweep(q.ring - 0.1, q.ring + 0.5, 0.012, 3800, 1600, 0.2);                                                        // the ring opens
  blip(q.ring, 520, 880, 0.3, 0.018, 0.2);
  noiseHit(q.pill, 0.02, 'highpass', 4200, 1, 0.03, 0, 0.3); blip(q.pill, 880, 1320, 0.07, 0.02, 0);               // the pill lands
  for (let i = 0; i < 3; i++) noiseHit(q.arcs + 0.3 + i * 0.4, 0.012, 'highpass', 7000, 1, 0.008, i % 2 ? 0.5 : -0.5); // hairline dots
