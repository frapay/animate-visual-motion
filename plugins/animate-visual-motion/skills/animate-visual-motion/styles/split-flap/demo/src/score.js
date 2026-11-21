  // SCORE BODY — split-flap demo (inside buildScore(); see kit/score-head.js). A station hall: a soft pad in D minor
  // that lifts to F major at the bridge, a three-note gong, a clock that ticks on the second, a plucked figure and a
  // bass on the beat. The clatter is not written by hand: every flap that lands on the two boards (flapActivity)
  // gets its own dry click, so the sound has exactly the waves the picture has.
  const T = TIMELINE, q = T.cues;
  const clack = (t, vel, pan = 0, f = 3300) => { noiseHit(t, 0.016, 'bandpass', f, 1.3, vel, pan, 0.05); noiseHit(t, 0.03, 'bandpass', f * 0.33, 2.4, vel * 0.7, pan, 0.04); };   // a flap lands: a click and its wooden body
  const clatter = (board, t0, t1, gain) => flapActivity(board).forEach(([t, n, pan], j) => {
    if (t < t0 - 1e-6 || t >= t1) return;
    const k = Math.min(3, Math.ceil(n / 5)), vel = gain * Math.min(1, 0.34 + 0.13 * Math.sqrt(n));
    for (let i = 0; i < k; i++) clack(t + i / (FPS * k) + ((j + i) % 3) * 0.002, vel * (1 - 0.2 * i), pan + (i - 1) * 0.12, 3000 + ((j * 7 + i * 3) % 5) * 220);
  });
  const stream = (t0, t1, vel0, vel1, pan0 = -0.4, pan1 = 0.4, every = 1 / 48) => { let i = 0; for (let t = t0; t < t1 - 1e-6; t += every, i++) { const u = (t - t0) / (t1 - t0); clack(t + (i % 3) * 0.003, lerp(vel0, vel1, u) * (0.7 + 0.3 * ((i * 5) % 4) / 3), lerp(pan0, pan1, u) + 0.2 * Math.sin(i * 2.4), 2900 + ((i * 3) % 5) * 240); } };
  const tick = (t, vel, hi) => { blip(t, hi ? 2100 : 1500, hi ? 1900 : 1300, 0.02, vel, -0.5); noiseHit(t, 0.01, 'highpass', 6000, 1, vel * 0.8, -0.5); };
  const gong = (t, notes, vel) => notes.forEach((n, i) => chime(t + i * 0.25, [nz(n), nz(n) * 2.01], vel, -0.2 + i * 0.2));
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F4'], 0.045, { type: 'triangle', cut: 900, att: 0.3, rel: 0.3, send: 0.45 });
  pad(3.0, 6.05, ['F3', 'C4', 'A4'], 0.075, { type: 'triangle', cut: 1600, att: 0.12, rel: 0.3, send: 0.5 });
  gong(0.0, ['A4', 'F4', 'D4'], 0.05);                                                                  // "attention please": falling
  const mA = ['D4', 'F4', 'A4', 'G4', 'F4', 'E4', 'D4', 'A3'], mB = ['F4', 'A4', 'C5', 'A4', 'F5', 'C5', 'A4', 'C5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.75) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.05 : 0.075, i % 2 ? 0.22 : -0.22, 0.26, t < 3 ? 1800 : 3000, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'F2' : 'C2')) * 2, t < 3 ? 0.07 : 0.1); }
  ['F4', 'A4', 'C5'].forEach((n, i) => pluck(3.0, nz(n), 0.11, -0.2 + i * 0.2, 0.5, 3200, 0.4));         // the payoff: the heart
  gong(3.0, ['C5', 'F5', 'A5'], 0.06);                                                                   // rising
  to = 's';
  clatter(BOARD_A, 0, 2.4, 0.05);                                                                        // every flap of era 1
  clatter(BOARD_B, 3.6, 6, 0.06);                                                                        // and of era 2
  stream(0.5, 1.0, 0.03, 0.03, -0.3, 0.3, 1 / 24);                                                       // the caption rows
  stream(3.75, 4.3, 0.035, 0.035, -0.3, 0.3, 1 / 24);
    stream(2.4, 2.8, 0.03, 0.06, -0.6, 0.3);                                                               // the window closes on the sun: a wave of flaps
  stream(2.8, 3.2, 0.04, 0.05, 0.2, 0.3, 1 / 36);                                                        // the sun turns over
  sub(3.0, 0.11);
  stream(3.2, 3.6, 0.06, 0.03, 0.3, -0.5);                                                               // the new board opens
  for (let s = 1; s <= 5; s++) tick(s, 0.03, s % 2);                                                     // the clock, on the second
  [q.hop1, q.hop2, q.hop3, q.hop4, q.hop5].forEach((t, i) => blip(t, 620, 1050, 0.09, 0.03, -0.5 + i * 0.2));   // the bird hops
  [0, 1, 2, 3].forEach((i) => { const t = q.beat + i * 0.5; sub(t, 0.085); noiseHit(t, 0.08, 'lowpass', 380, 0.7, 0.04, 0.2, 0.15); sub(t + 0.14, 0.05); });   // the heart: lub-dub
