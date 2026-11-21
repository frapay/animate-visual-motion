  // SCORE BODY — comic demo (inside buildScore(); see kit/score-head.js). A cartoon caper: sneaky staccato plucks while
  // the hero is stuck, a bright ding + stab on TING!, a pop for the balloon, a riser into the morph, then a bouncy
  // kick / snare / riff with a whoosh on WUSS!.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  // era 1: tiptoe bass (D minor), pizzicato answers
  ['D2', 'F2', 'A2', 'D3', 'A2', 'F2', 'D2', 'F2', 'A2', 'D3', 'E3', 'A2'].forEach((n, i) => bass(i * E8, nz(n) * 2, 0.085));
  [['D4', 0.25], ['F4', 0.75], ['A4', 1.25], ['D5', 1.5], ['A4', 2.0], ['F4', 2.25]].forEach(([n, t], i) => pluck(t, nz(n), 0.05, i % 2 ? 0.3 : -0.3, 0.18, 2600, 0.15));
  for (let i = 0; i < 12; i++) noiseHit(i * E8, 0.03, 'highpass', 7500, 0.8, i % 2 ? 0.018 : 0.03, i % 2 ? 0.25 : -0.25);
  // TING!: a major stab over the tiptoe
  [['D4', -0.3], ['Fs4', 0], ['A4', 0.3], ['D5', 0.1]].forEach(([n, p]) => pluck(q.ting, nz(n), 0.085, p, 0.5, 5200, 0.3));
  // era 2: D major, four on the floor, snare on 2 and 4, an 8th-note riff
  pad(3.0, 6.05, ['D3', 'A3', 'Fs4'], 0.016, { type: 'square', cut: 1500, att: 0.05, rel: 0.25, send: 0.3 });
  for (let i = 0; i < 6; i++) { const t = 3.0 + i * BEAT; sub(t, i === 0 ? 0.5 : 0.34); if (i % 2) noiseHit(t, 0.14, 'bandpass', 2000, 0.8, 0.13, 0, 0.3); }
  for (let i = 0; i < 12; i++) { const t = 3.0 + i * E8; noiseHit(t, 0.035, 'highpass', 8000, 0.7, i % 2 ? 0.05 : 0.028, i % 2 ? 0.3 : -0.3); bass(t, nz(['D2', 'D2', 'Fs2', 'A2', 'B2', 'A2', 'Fs2', 'A2', 'D2', 'D2', 'Fs2', 'A2'][i]) * 2, 0.11); }
  [['D5', 3.5], ['Fs5', 3.75], ['A5', 4.0], ['B5', 4.25], ['A5', 4.5], ['Fs5', 4.75], ['A5', 5.0], ['D6', 5.25], ['A5', 5.5], ['D6', 5.75]].forEach(([n, t], i) => pluck(t, nz(n), 0.07, i % 2 ? 0.25 : -0.25, 0.22, 4200, 0.25));
  to = 's';
  blip(0.0, 300, 220, 0.14, 0.035, -0.3); blip(0.25, 240, 200, 0.12, 0.03, -0.3);     // "hmm…"
  chime(q.ting, [nz('A5'), nz('D6'), nz('Fs6')], 0.09, 0.2);                             // the ding
  noiseHit(q.ting, 0.12, 'bandpass', 3200, 1.2, 0.07, 0.2, 0.2, 900);                    // the burst's snap
  blip(q.ting + 0.02, 380, 1100, 0.2, 0.05, -0.4);                                       // the jump
  blip(q.ting + 0.36, 500, 180, 0.07, 0.05, -0.4);                                       // ... and the landing
  blip(q.bubble, 500, 1500, 0.07, 0.07, 0.3); noiseHit(q.bubble, 0.04, 'bandpass', 1800, 2, 0.05, 0.3);   // the balloon pops open
  noiseHit(q.cap1, 0.06, 'lowpass', 900, 0.8, 0.09, 0); blip(q.cap1, 260, 180, 0.06, 0.05, 0);              // the caption box thunks down
  riser(2.3, 3.0, 0.03);
  noiseHit(3.0, 0.35, 'bandpass', 1100, 0.9, 0.06, 0, 0.35, 320);
  blip(q.sun, 700, 1400, 0.09, 0.04, 0);
  sweep(q.zoom - 0.05, q.zoom + 0.32, 0.075, 500, 6500, -0.5);                           // WUSS!
  blip(q.zoom, 250, 1300, 0.28, 0.045, -0.3);
  noiseHit(q.wuss, 0.1, 'bandpass', 2600, 1.2, 0.06, -0.2, 0.2, 800);
  chime(q.cap2, [nz('D6'), nz('Fs6'), nz('A6')], 0.06, 0.1);
  noiseHit(q.cap2, 0.06, 'lowpass', 900, 0.8, 0.08, 0);
