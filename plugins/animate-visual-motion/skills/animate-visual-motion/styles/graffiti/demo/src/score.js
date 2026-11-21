  // SCORE BODY — graffiti demo (inside buildScore(); see kit/score-head.js). Two bars of boom-bap at 80 BPM: bar 1
  // (brick) on D minor, bar 2 (concrete) lifts to F. On top: the can (hiss, rattle), stencil cards (slap, peel),
  // letter pops, drips, and the street light's tube ticking when it flickers.
  const T = TIMELINE, q = T.cues;
  const hiss = (t0, t1, vel, pan = 0) => { noiseHit(t0, t1 - t0, 'highpass', 6200, 0.7, vel, pan, 0.12); noiseHit(t0, t1 - t0, 'bandpass', 3800, 1.2, vel * 0.5, pan, 0.1, 5200); };   // the can
  const rattle = (t, vel, pan = 0) => { for (let i = 0; i < 5; i++) noiseHit(t + i * 0.045, 0.02, 'bandpass', 2600 + (i % 2) * 700, 6, vel, pan); };                               // the ball in the can
  const slap = (t, vel, pan = 0) => { noiseHit(t, 0.05, 'lowpass', 900, 0.8, vel, pan, 0.1); blip(t, 220, 110, 0.06, vel * 0.6, pan); };                                           // a card lands on the wall
  const peel = (t, vel, pan = 0) => noiseHit(t, 0.09, 'bandpass', 1200, 1.2, vel, pan, 0.1, 3600);
  const pop = (t, f, vel, pan = 0) => blip(t, f, f * 1.8, 0.07, vel, pan);
  const drip = (t, vel, pan = 0) => blip(t, 1500, 760, 0.05, vel, pan);
  const kick = (t, v) => sub(t, v);
  const snare = (t, v) => { noiseHit(t, 0.13, 'bandpass', 1900, 0.9, v, 0, 0.3); blip(t, 240, 150, 0.08, v * 0.6); };
  const hat = (t, v, pan = 0) => noiseHit(t, 0.03, 'highpass', 7600, 1, v, pan);
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F4'], 0.03, { cut: 900, att: 0.25, rel: 0.4, send: 0.4 });
  pad(3.0, 6.05, ['F3', 'C4', 'A4'], 0.04, { cut: 1300, att: 0.1, rel: 0.4, send: 0.45 });
  for (let bar = 0; bar < 2; bar++) {
    const t0 = bar * 4 * BEAT, root = bar ? 'F2' : 'D2', fifth = bar ? 'C3' : 'A2', v = bar ? 1.15 : 1;
    [0, 1.5, 2.5].forEach((b) => kick(t0 + b * BEAT, (b ? 0.085 : 0.12) * v));
    [1, 3].forEach((b) => snare(t0 + b * BEAT, 0.085 * v));
    for (let i = 0; i < 8; i++) hat(t0 + i * E8 + (i % 2 ? 0.035 : 0), (i % 2 ? 0.022 : 0.034) * v, i % 2 ? 0.3 : -0.3);
    [[0, root], [1.5, root], [2.5, fifth], [3.5, root]].forEach(([b, n]) => bass(t0 + b * BEAT, nz(n) * 2, 0.09 * v));
    const ch = bar ? ['A3', 'C4', 'E4', 'G4'] : ['F3', 'A3', 'C4', 'E4'];
    [0, 2.5].forEach((b) => ch.forEach((n, i) => pluck(t0 + b * BEAT + i * 0.012, nz(n), 0.05 * v, -0.3 + i * 0.2, 0.5, 2200, 0.35)));
  }
  [['A4', 3.75], ['C5', 4.125], ['D5', 4.5], ['F5', 4.875], ['E5', 5.25], ['C5', 5.625]].forEach(([n, t], i) => pluck(t, nz(n), 0.06, i % 2 ? 0.25 : -0.25, 0.3, 3000, 0.3));   // the bird's tune
  ['F4', 'A4', 'C5'].forEach((n, i) => pluck(3.0, nz(n), 0.09, -0.2 + i * 0.2, 0.5, 3200, 0.4));
  chime(3.0, [nz('F5'), nz('A5'), nz('C6')], 0.04, 0);
  to = 's';
  hiss(q.blob, q.blob + 0.3, 0.07, 0.3); [0.45, 0.8, 1.3, 1.9].forEach((dt, i) => drip(q.blob + dt, 0.022, 0.35 - i * 0.05));    // the yellow blob, and it runs
  rattle(q.s1 - 0.25, 0.03, -0.4);
  [q.s1, q.s2, q.s3].forEach((t, i) => { slap(t + 0.02, 0.09, -0.4); hiss(t + 0.07, t + 0.27, 0.05, -0.4); peel(t + 0.28, 0.035 + i * 0.005, -0.3); });   // Kaleng, three layers
  for (let i = 0; i < 5; i++) { const t = q.w1 + i * 0.125; pop(t, 520 + i * 70, 0.05, -0.2 + i * 0.1); hiss(t, t + 0.09, 0.035, -0.3); }                  // P A I N T
  hiss(q.line, q.line + 0.25, 0.055, 0); pop(q.line + 0.125, 1300, 0.03, 0.5); pop(q.line + 0.25, 1700, 0.025, 0.45);
  sweep(2.4, 3.0, 0.016, 500, 3000, 0); hiss(2.8, 3.2, 0.04, 0);                                                                                       // buffed out, into the morph
  hiss(q.wire, q.wire + 0.2, 0.05, 0);
  [q.b1, q.b2, q.b3].forEach((t, i) => { slap(t + 0.02, 0.09, 0.1); hiss(t + 0.07, t + 0.27, 0.05, 0.1); peel(t + 0.28, 0.035 + i * 0.005, 0.2); });      // the bird, three layers
  for (let i = 0; i < 3; i++) { const t = q.f1 + i * 0.125; pop(t, 660 + i * 110, 0.055, -0.1 + i * 0.15); hiss(t, t + 0.09, 0.035, -0.5); }               // F L Y
  blip(q.hop, 2300, 3100, 0.07, 0.035, 0.1); blip(q.hop + 0.1, 2600, 3400, 0.06, 0.03, 0.1);                                                            // the bird hops and chirps
  [q.d1, q.d1 + 0.09, q.d2].forEach((t, i) => { pop(t, 1200 + i * 250, 0.035, 0.5 - i * 0.4); hiss(t, t + 0.05, 0.025, 0.4 - i * 0.4); });
  for (let i = 0; i < 72; i++) if (grfFlick(i / 12 + 0.01) > 0.05) noiseHit(i / 12, 0.04, 'bandpass', 3400, 9, 0.012, 0.7);                              // the street light's tube ticks
