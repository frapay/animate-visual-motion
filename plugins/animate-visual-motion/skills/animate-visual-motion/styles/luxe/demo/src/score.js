  // SCORE BODY — luxe demo (inside buildScore(); see kit/score-head.js). A quiet room: a low warm pad and a slow
  // harp figure in D, air that brightens as the light sweeps across the gold, a small bell on each glint; then a warm
  // D major chord when the stone appears and two glassy bells on its star glints.
  const T = TIMELINE, q = T.cues;
  const bell = (t, n, vel, pan = 0) => chime(t, [nz(n), nz(n) * 2], vel, pan);
  to = 'm';
  drone(0.0, 3.1, 73.4, 0.03, { att: 0.8, rel: 0.3 });                                                                      // the room
  pad(0.0, 3.1, ['D3', 'A3', 'E4', 'Fs4'], 0.045, { type: 'triangle', cut: 800, att: 1.0, rel: 0.4, send: 0.6 });
  ['D4', 'A4', 'E5', 'Fs5', 'A5', 'E5'].forEach((n, i) => pluck(0.5 + i * BEAT * 0.75, nz(n), 0.05, -0.3 + i * 0.12, 0.9, 2400, 0.55));   // a slow harp figure
  for (let i = 0; i < 3; i++) bass(i * BEAT * 2, nz('D2'), 0.06);
  pad(3.0, 6.05, ['D2', 'A2', 'Fs3', 'A3', 'D4', 'E4'], 0.065, { type: 'triangle', cut: 1500, att: 0.2, rel: 0.5, send: 0.6 });   // the stone: D major
  ['D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => pluck(3.0 + 1 / 6 + i * 0.03, nz(n), 0.08, -0.3 + i * 0.2, 1.0, 3000, 0.5));
  for (let i = 0; i < 3; i++) bass(3.0 + i * BEAT * 2, nz(i === 1 ? 'A2' : 'D2'), 0.075);
  ['A5', 'Fs5', 'D6', 'A5', 'E6', 'Fs6', 'D6', 'A6'].forEach((n, i) => pluck(3.5 + i * E8 * 1.25, nz(n), 0.028, i % 2 ? 0.35 : -0.35, 0.5, 3200, 0.5));
  to = 's';
  sweep(q.light, q.light + 1.2, 0.01, 300, 1100, 0);                                                                        // the light comes up
  sweep(q.sweep, q.sweep + 1.3, 0.018, 900, 4200, 0.1);                                                                     // the sweep crosses gold and glass
  bell(q.glint + 0.25, 'A6', 0.03, -0.2);                                                                                   // the cap glints
  sweep(2.5, 3.0, 0.025, 400, 2400, 0);                                                                                     // the frame closes onto the bottle
  sub(q.morph, 0.26); noiseHit(q.morph, 0.5, 'lowpass', 900, 0.7, 0.04, 0, 0.3, 200);                                       // the stone lands
  sweep(q.sweep2, q.sweep2 + 1.2, 0.014, 1200, 5000, -0.1);
  bell(q.glint2 + 0.3, 'D6', 0.04, -0.15); bell(q.glint2 + 0.36, 'A6', 0.02, 0.1);                                           // star glints
  bell(q.glint3 + 0.27, 'Fs6', 0.035, 0.2);
