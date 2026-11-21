  // SCORE BODY — string-art demo (inside buildScore(); see kit/score-head.js). A quiet workroom: a warm pad, a
  // soft bass on the beat and a thumb-piano figure in D that opens to G at the bridge. Every nail is a small dry
  // hammer tap; every strand that goes taut is a plucked note, climbing a pentatonic scale and getting faster as
  // the web fills (the same curve as strWind); a re-string is a zip down and a new climb; the heart is two low plucks.
  const T = TIMELINE, q = T.cues;
  const PENTA = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6'];
  const tap = (t, vel, pan = 0) => { noiseHit(t, 0.016, 'bandpass', 2700, 2.5, vel, pan, 0.05); blip(t, 560, 330, 0.025, vel * 0.9, pan); };                 // hammer on a nail head
  const taps = (t0, dur, n, vel, pan0 = -0.3, pan1 = 0.3) => { for (let i = 0; i < n; i++) tap(t0 + dur * i / n + (i % 3) * 0.004, vel * (0.7 + 0.3 * ((i * 5) % 4) / 3), lerp(pan0, pan1, i / n)); };
  // n strands going taut over [t0, t0 + d] on the winding curve u^p; the notes climb from scale step s0
  const wind = (t0, d, n, vel, pan = 0, s0 = 0, p = 1.9, span = 9) => { for (let i = 0; i < n; i++) { const t = t0 + d * ((i + 1) / n) ** (1 / p); pluck(t, nz(PENTA[Math.min(PENTA.length - 1, s0 + Math.floor(i / n * span))]), vel * (0.75 + 0.25 * (i % 2)), pan + 0.12 * (i % 2 ? 1 : -1), 0.16, 4200, 0.18); } };
  const twang = (t, f, vel, pan = 0) => { pluck(t, f, vel, pan, 0.22, 2600, 0.3); blip(t, f * 1.02, f * 0.985, 0.14, vel * 0.35, pan); };                    // one long strand, plucked
  const beat = (t, vel) => { pluck(t, nz('D3'), vel, -0.3, 0.2, 900, 0.2); pluck(t + 0.11, nz('A2'), vel * 0.8, -0.3, 0.24, 800, 0.2); sub(t, vel * 0.5); };   // the heart: lub-dub
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F#4'], 0.05, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.3, send: 0.4 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'F#4'], 0.07, { type: 'triangle', cut: 1600, att: 0.15, rel: 0.3, send: 0.45 });
  const mA = ['D4', 'A4', 'F#4', 'A4', 'B4', 'A4', 'F#4', 'E4'], mB = ['G4', 'D5', 'B4', 'D5', 'F#5', 'D5', 'B4', 'A4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 1.0) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]) / 2, t < 3 ? 0.05 : 0.065, i % 2 ? 0.25 : -0.25, 0.3, t < 3 ? 1500 : 2200, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'G1' : 'D2')) * 2, t < 3 ? 0.065 : 0.085); }
  ['G3', 'D4', 'G4', 'B4', 'D5', 'F#5'].forEach((n, i) => pluck(3.0 + i * 0.028, nz(n), 0.09, -0.3 + i * 0.12, 0.6, 3400, 0.45));                             // the payoff: a strum as the ring lands
  to = 's';
  taps(q.sunNails, 0.33, 12, 0.05, 0.1, 0.4);                                                                             // the sun's ring
  taps(q.boatNails, 0.45, 14, 0.04, -0.4, 0.1);                                                                           // the boat
  taps(q.waveNails, 0.6, 16, 0.03, -0.5, 0.5);                                                                            // three rows of waves
  wind(q.sun, 0.75, 18, 0.05, 0.3, 0);                                                                                    // the sun fills: 36 chords, a note for every second one
  wind(q.sails, 0.6, 10, 0.04, -0.2, 2);                                                                                  // main sail
  wind(q.sails + 0.2, 0.55, 8, 0.035, -0.4, 4);                                                                           // jib
  wind(q.hull, 0.4, 8, 0.035, -0.2, 0, 1.4, 5);                                                                           // hull
  [0, 1, 2].forEach((i) => wind(q.waves + i * 0.15, 0.5, 9, 0.028, -0.4 + i * 0.4, i * 2, 1.4, 6));                       // waves
  taps(q.rays - 0.12, 0.12, 4, 0.04, 0.3, 0.4); wind(q.rays, 0.35, 12, 0.035, 0.35, 5, 1, 6);                              // rays
  taps(q.heartNails, 0.3, 8, 0.04, -0.5, -0.4); wind(q.heart, 0.3, 10, 0.045, -0.45, 3, 1, 8);                             // the heart
  twang(q.heart + 0.5, nz('A4'), 0.05, -0.3);                                                                             // its string goes taut
  [0, 0.125].forEach((d, i) => { tap(q.birds + d, 0.03, i ? -0.5 : 0); blip(q.birds + d + 0.1, 2100 + i * 300, 1700, 0.05, 0.015, i ? -0.5 : 0); });   // gulls
  [q.beat1, 2.0].forEach((t) => { beat(t, 0.07); twang(t, nz('A3'), 0.03, -0.3); });                                       // the heart beats; its string is plucked
  for (let i = 0; i < 6; i++) pluck(2.4 + i * 0.033, nz(PENTA[9 - i]), 0.03, 0.3, 0.1, 3000, 0.2);                         // the rays are unpicked
  sweep(2.4, 3.0, 0.014, 500, 2600, 0);                                                                                   // the board is cut down to the ring
  for (let i = 0; i < 8; i++) pluck(2.8 + i * 0.05, nz(PENTA[2 + i]), 0.035, 0.2 - i * 0.04, 0.12, 3600, 0.25);            // the ring is re-strung as its nails move
  taps(q.nails2, 0.4, 16, 0.04, -0.5, 0.5);                                                                               // peaks and basket
  [0, 1, 2].forEach((i) => wind(q.peaks + i * 0.15, 0.5, 9, 0.03, -0.4 + i * 0.4, i * 2, 1.4, 7));                        // three fans
  wind(q.ropes, 0.25, 4, 0.03, 0.05, 4, 1, 4);                                                                            // ropes
  STARS.forEach((s, i) => { tap(q.stars + i * 0.0625, 0.03, (s[0] - 540) / 600); pluck(q.stars + i * 0.0625 + 0.1, nz(PENTA[6 + i % 5]) * 2, 0.022, (s[0] - 540) / 600, 0.25, 6000, 0.45); });
  wind(q.gold, 0.7, 18, 0.045, 0.05, 1);                                                                                  // the mustard web
  taps(q.heart2 - 0.15, 0.3, 8, 0.04, -0.5, -0.4); wind(q.heart2, 0.28, 10, 0.045, -0.45, 3, 1, 8);                        // the heart
  twang(q.heart2 + 0.45, nz('B4'), 0.05, -0.3);
  for (let i = 0; i < 9; i++) pluck(q.unpick + i * 0.027, nz(PENTA[10 - i]), 0.035, 0.05, 0.09, 3200, 0.2);                // unpicked: a zip down
  sweep(q.unpick, q.restring, 0.012, 2600, 600, 0);
  wind(q.restring, 0.6, 18, 0.05, 0.05, 2, 1.5);                                                                          // re-strung as a cardioid
  [q.beat2, q.beat3].forEach((t) => { beat(t, 0.08); twang(t, nz('B3'), 0.03, -0.3); });
  chime(5.5, [nz('D5'), nz('F#5'), nz('B5')], 0.03, 0.1);
