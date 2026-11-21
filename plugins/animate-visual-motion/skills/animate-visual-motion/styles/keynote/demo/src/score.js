  // SCORE BODY — keynote demo (inside buildScore(); see kit/score-head.js). A hall before a reveal: a low drone and a
  // slow pulse in D, air that brightens as the key light sweeps, then a warm D major chord when the product is shown;
  // a soft tick for every step a numeral counts and a bell when it settles.
  const T = TIMELINE, q = T.cues;
  const tick = (t, vel, pan = 0, f = 6000) => noiseHit(t, 0.01, 'highpass', f, 1, vel, pan);                               // a numeral steps
  const bell = (t, n, vel, pan = 0) => chime(t, [nz(n), nz(n) * 2], vel, pan);                                             // it settles
  to = 'm';
  drone(0.0, 3.1, 36.7, 0.05, { att: 0.6, rel: 0.3 }); drone(0.0, 3.1, 73.4, 0.022, { att: 0.8, rel: 0.3 });             // the hall, in the dark
  pad(0.4, 3.1, ['D3', 'A3', 'E4'], 0.03, { type: 'triangle', cut: 600, att: 1.2, rel: 0.3, send: 0.5 });
  for (let i = 0; i < 6; i++) bass(i * BEAT, nz('D2'), 0.05 + i * 0.006);                                                  // a slow pulse
  ['A3', 'D4', 'E4', 'A4'].forEach((n, i) => pluck(q.sweep + i * BEAT * 0.5 + 0.25, nz(n), 0.035 + i * 0.006, -0.3 + i * 0.2, 0.7, 1800 + i * 500, 0.45));   // the light arrives
  pad(3.0, 6.05, ['D2', 'A2', 'Fs3', 'A3', 'E4'], 0.07, { type: 'triangle', cut: 1500, att: 0.15, rel: 0.5, send: 0.5 });   // the reveal: D major
  ['D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => pluck(3.0 + 1 / 6 + i * 0.02, nz(n), 0.09, -0.3 + i * 0.2, 0.9, 3000, 0.45));
  for (let i = 0; i < 6; i++) bass(3.0 + i * BEAT, nz(i % 4 < 2 ? 'D2' : 'A2'), 0.085);
  const arp = ['A4', 'D5', 'Fs5', 'A5', 'Fs5', 'D5', 'E5', 'A5'];
  for (let i = 0; i < 10; i++) pluck(3.5 + i * E8, nz(arp[i % 8]), 0.028, i % 2 ? 0.35 : -0.35, 0.3, 2600, 0.4);
  [['A5', q.spec1], ['D6', q.spec2], ['Fs6', q.spec3]].forEach(([n, t], i) => bell(t + 0.75, n, 0.035, 0.25));              // each numeral settles on the beat
  to = 's';
  sweep(q.beam, q.beam + 0.9, 0.012, 300, 1200, 0);                                                                         // the beam comes up
  sweep(q.sweep, q.sweep + 1.25, 0.022, 900, 4200, 0.1);                                                                    // the key light crosses
  blip(q.glint + 0.3, 2400, 3600, 0.25, 0.012, 0.2);                                                                        // a glint
  blip(q.led, 1320, 1320, 0.08, 0.03, 0); blip(q.led + 0.12, 1760, 1760, 0.1, 0.03, 0);                                     // its light comes on
  sweep(2.5, 3.0, 0.03, 400, 2400, 0);                                                                                      // the stage closes onto it
  sub(q.morph, 0.3); noiseHit(q.morph, 0.5, 'lowpass', 900, 0.7, 0.05, 0, 0.3, 200);                                        // the reveal lands
  [q.lead1, q.lead2, q.lead3].forEach((t, i) => blip(t, 900 + i * 150, 1500 + i * 150, 0.3, 0.012, 0.3));                   // a leader reaches out
  [q.spec1, q.spec2, q.spec3].forEach((t, i) => { for (let j = 0; j < 9; j++) tick(t + 0.75 * (1 - (1 - j / 9) ** 2) * 0.96, 0.018 - j * 0.001, 0.3, 5200 + i * 600); });   // counting: fast, then slowing
  blip(q.glint2 + 0.3, 2800, 4200, 0.3, 0.01, -0.2);                                                                        // a glint on the glass
