  // SCORE BODY — ui-mockup demo (inside buildScore(); see kit/score-head.js). Light and clicky: a soft pluck pulse in
  // D major that opens to G, and interface sounds that land on the frames where the UI answers: a touch, key ticks,
  // a pop, a two-note chime for each banner, a mouse click, bars rising as plucks, a toggle blip.
  const T = TIMELINE, q = T.cues;
  const tap = (t, vel = 0.05) => { noiseHit(t, 0.016, 'bandpass', 1900, 2.2, vel, 0, 0.04); blip(t, 420, 260, 0.045, vel * 0.9); };                 // a finger on glass
  const key = (t, i) => noiseHit(t, 0.009, 'highpass', 3600 + (i % 3) * 500, 1, 0.016 + (i % 2) * 0.005, i % 2 ? 0.14 : -0.14);                  // a key lands
  const mouse = (t, vel = 0.06) => { noiseHit(t, 0.007, 'highpass', 4200, 1, vel, 0.1); noiseHit(t + 0.075, 0.006, 'highpass', 5200, 1, vel * 0.55, 0.1); };   // down, up
  const ding = (t, a, b, vel = 0.05, pan = 0) => { chime(t, [nz(a)], vel, pan); chime(t + 0.085, [nz(b)], vel * 0.9, pan); };                     // a banner
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 1500, att: 0.25, rel: 0.3, send: 0.4 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'E4'], 0.042, { type: 'triangle', cut: 1900, att: 0.2, rel: 0.4, send: 0.45 });
  const pA = ['D4', 'A4', 'Fs4', 'A4', 'D4', 'B4', 'Fs4', 'A4'], pB = ['G4', 'B4', 'D5', 'B4', 'G4', 'E5', 'D5', 'B4'];
  for (let i = 0; i < 24; i++) { const t = i * E8, n = (t < 3 ? pA : pB)[i % 8]; pluck(t, nz(n), t < 3 ? 0.04 : 0.048, i % 2 ? 0.25 : -0.25, 0.22, 2400, 0.3); }   // the pulse
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'G1' : 'E2')), t < 3 ? 0.06 : 0.075); }
  for (let i = 0; i < 12; i++) noiseHit(i * BEAT + E8, 0.012, 'highpass', 7500, 1, i < 6 ? 0.008 : 0.012, i % 2 ? 0.35 : -0.35);                    // a hat on the off-beats
  ['G4', 'B4', 'D5', 'G5'].forEach((n, i) => pluck(3.0 + 1 / 6 + i * 0.03, nz(n), 0.07, -0.2 + i * 0.13, 0.5, 3200, 0.4));                           // the payoff: the card opens
  to = 's';
  sweep(0.0, 0.3, 0.012, 500, 1600, 0);                                                                                                           // the phone drifts in
  tap(q.tap);                                                                                                                                      // the field
  for (let i = 0; i < 12; i++) key(q.type + i / 12, i);                                                                                           // twelve keys, twelve characters
  tap(q.add, 0.06); blip(q.add + 1 / 24, 520, 990, 0.09, 0.045, 0.1);                                                                              // add: a touch and a pop as the row opens
  ding(q.toast, 'A5', 'D6');                                                                                                                       // "Task added"
  blip(q.kick, 880, 1320, 0.06, 0.02, 0.4);                                                                                                        // the icon jumps
  sweep(2.5, 2.98, 0.016, 700, 2400, 0);                                                                                                          // the world closes onto the icon
  noiseHit(3.0, 0.03, 'bandpass', 900, 1.5, 0.05, 0, 0.1); blip(3.0, 300, 600, 0.12, 0.04, 0);                                                    // tile -> card
  mouse(q.seg);                                                                                                                                    // the view switch
  ['D5', 'E5', 'G5', 'B5', 'G5', 'E5', 'D5'].forEach((n, i) => pluck(q.seg + 0.06 + i * 0.03, nz(n), 0.03, -0.3 + i * 0.1, 0.14, 4200, 0.25));       // seven bars answer
  for (let i = 0; i < 7; i++) noiseHit(q.seg + 0.1 + i * 0.09, 0.006, 'highpass', 5200 + i * 300, 1, 0.012, 0.3);                                    // the count runs up
  sweep(q.scroll, q.scroll + 0.42, 0.009, 1800, 900, -0.1);                                                                                       // the page scrolls
  blip(q.lens, 700, 1400, 0.08, 0.028, 0.35);                                                                                                      // the lens pops
  mouse(q.toggle); blip(q.toggle + 1 / 24, 660, 990, 0.07, 0.04, 0.2);                                                                             // the toggle flips on
  ding(q.toast2, 'B5', 'E6', 0.05, 0.25);                                                                                                          // "Digest on"
