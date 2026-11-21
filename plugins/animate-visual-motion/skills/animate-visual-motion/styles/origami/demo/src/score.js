  // SCORE BODY — origami demo (inside buildScore(); see kit/score-head.js). Quiet and dry, like a room with one
  // table in it: soft koto-like plucks on a pentatonic figure, a low pad, and on every fold a paper swish that ends
  // in a crisp crease tick.
  const T = TIMELINE, q = T.cues;
  const swish = (t, d, vel, pan = 0) => { noiseHit(t, d, 'bandpass', 2600, 0.8, vel, pan, 0.15, 5200); noiseHit(t + d * 0.15, d * 0.8, 'highpass', 6000, 0.7, vel * 0.5, pan, 0.1); };   // a flap turning through the air
  const crease = (t, vel, pan = 0) => { noiseHit(t, 0.022, 'highpass', 4200, 1, vel, pan, 0.08); blip(t, 900, 520, 0.035, vel * 0.5, pan); };                                        // the fold pressed flat
  const fold = (t, d, vel, pan = 0) => { swish(t, d * 0.55, vel, pan); crease(t + d * 0.55, vel * 1.2, pan); };
  const tap = (t, vel, pan = 0) => { sub(t, vel * 0.5); noiseHit(t, 0.05, 'lowpass', 700, 0.7, vel, pan, 0.1); };
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'E4'], 0.03, { type: 'triangle', cut: 900, att: 0.3, rel: 0.4, send: 0.4 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'F#4'], 0.045, { type: 'triangle', cut: 1300, att: 0.15, rel: 0.4, send: 0.45 });
  const mA = ['D4', 'A4', 'F#4', 'E4', 'D4', 'B4', 'A4', 'F#4'], mB = ['G4', 'D5', 'B4', 'A4', 'F#5', 'D5', 'B4', 'D5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5 || (t < 3 && i % 2)) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.07 : 0.085, i % 2 ? 0.25 : -0.2, 0.5, t < 3 ? 2200 : 3000, 0.4); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; if (t >= 0.5) bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'G2' : 'D2')) * 2, t < 3 ? 0.06 : 0.085); }
  ['G4', 'B4', 'D5', 'F#5'].forEach((n, i) => pluck(3.0 + i * 0.03, nz(n), 0.1, -0.3 + i * 0.2, 0.7, 3400, 0.45));       // the payoff: the new sheet
  sub(3.0, 0.08);
  chime(q.head + 0.18, [nz('D6'), nz('F#6'), nz('A6')], 0.05, 0);                                                           // the crane is done
  to = 's';
  sweep(0.0, q.land, 0.02, 500, 1500, 0); tap(q.land, 0.07);                                                                // the sheet slides in and settles
  [q.f1, q.f2, q.f3].forEach((t, i) => fold(t, 0.36, 0.09, [0, 0.1, -0.1][i]));                                              // three folds
  swish(q.float, 0.3, 0.05, -0.2); crease(q.float + 0.22, 0.05, 0.2);                                                       // the paper waves spring open
  sweep(2.4, 3.0, 0.016, 500, 3000, 0);                                                                                     // flattening back into the square
  fold(q.c1, 0.3, 0.09, 0); fold(q.c2, 0.3, 0.09, 0);                                                                        // in half, into a kite
  swish(q.open, 0.34, 0.1, -0.15); swish(q.open + 0.05, 0.3, 0.07, 0.25); crease(q.open + 0.3, 0.09, 0);                    // it opens
  fold(q.head, 0.26, 0.07, -0.4);                                                                                           // the head
  for (let i = 0; i < 5; i++) { crease(q.star1 + 0.05 + i * 0.1, 0.03, -0.5); crease(q.star2 + 0.05 + i * 0.1, 0.028, 0.5); } // the stars' points
  [q.flap1, q.flap2].forEach((t) => { swish(t, 0.3, 0.07, 0.1); tap(t + 0.3, 0.03, 0); });                                   // the wings flex
  for (let i = 0; i < 6; i++) noiseHit(3.6 + i * 0.4, 0.03, 'highpass', 7000, 1, 0.012, 0.55);                              // the butterfly
