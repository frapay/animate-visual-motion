  // SCORE BODY — liquid demo (inside buildScore(); see kit/score-head.js). Soft and bubbly: a warm triangle pad,
  // marimba-like plucks, a gentle kick in the second half; every drop is a rising "bloop", every splash a short wet noise.
  const T = TIMELINE, q = T.cues;
  const bloop = (t, f, vel, pan = 0) => blip(t, f, f * 2.6, 0.09, vel, pan);                       // a water drop
  const splash = (t, vel, pan = 0) => { noiseHit(t, 0.28, 'bandpass', 2800, 0.8, vel, pan, 0.45, 700); noiseHit(t + 0.02, 0.12, 'highpass', 5200, 0.7, vel * 0.5, pan, 0.3); };
  to = 'm';
  pad(0.0, 3.1, ['C3', 'G3', 'E4', 'A4'], 0.022, { type: 'triangle', cut: 1700, att: 0.5, rel: 0.3, send: 0.5 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4', 'G4'], 0.026, { type: 'triangle', cut: 2300, att: 0.12, rel: 0.3, send: 0.5 });
  const mA = ['E5', 'G5', 'C5', 'A5', 'G5', 'E5', 'D5', 'G5'], mB = ['A5', 'C6', 'F5', 'E6', 'C6', 'A5', 'G5', 'C6'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.9 && i % 2) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.045 : 0.055, i % 2 ? 0.3 : -0.3, 0.3, t < 3 ? 2600 : 3600, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'C2' : 'A1') : (i % 4 < 2 ? 'F2' : 'C2')) * 2, t < 3 ? 0.07 : 0.1); }
  for (let i = 0; i < 6; i++) { sub(3.0 + i * BEAT, i ? 0.2 : 0.3); noiseHit(3.0 + i * BEAT + E8, 0.05, 'highpass', 7000, 0.7, 0.028, i % 2 ? 0.25 : -0.25); }
  chime(3.0, [nz('F5'), nz('A5'), nz('C6')], 0.06, 0);
  chime(q.drip2 + 0.65, [nz('C6'), nz('E6'), nz('G6')], 0.04, 0.2);
  to = 's';
  sweep(0.0, 0.55, 0.02, 500, 2600, 0);                                    // the opening wave leaves
  blip(q.fall, 1500, 520, 0.45, 0.022, -0.3);                              // Tetes falls
  bloop(q.land, 300, 0.08, -0.3); splash(q.land + 0.01, 0.05, -0.3);      // and lands
  bloop(q.split1 + 0.45, 620, 0.04, 0.3); bloop(q.split2 + 0.4, 760, 0.04, -0.2);   // droplets snap off
  bloop(q.join + 0.3, 420, 0.05, 0);                                       // and flow back
  sweep(2.4, 3.0, 0.014, 400, 3200, 0);
  noiseHit(3.0, 0.3, 'bandpass', 1200, 0.9, 0.03, 0, 0.4, 400);
  sweep(q.waves, q.waves + 0.5, 0.016, 300, 1800, 0);                      // the sea rises
  bloop(q.pop, 260, 0.07, -0.35); splash(q.pop + 0.05, 0.045, -0.35);     // Tetes pops out
  for (const t of [q.drip1, q.drip2]) { blip(t + 0.4, 1100, 600, 0.25, 0.018, 0); bloop(t + 0.66, 480, 0.06, 0); splash(t + 0.67, 0.03, 0); }
  [0.4, 1.3, 1.75, 2.2, 3.9, 4.6, 5.3, 5.7].forEach((t, i) => bloop(t, 900 + (i * 137) % 500, 0.014, i % 2 ? 0.5 : -0.5));   // bubbles
