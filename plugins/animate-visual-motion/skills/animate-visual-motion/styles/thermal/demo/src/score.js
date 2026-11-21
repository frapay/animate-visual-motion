  // SCORE BODY — thermal demo (inside buildScore(); see kit/score-head.js). An instrument, not a room: a cool
  // electronic pulse in D minor that warms to F major, a sine that rises as the mug heats, soft sensor ticks for the
  // readings, a two-part shutter click at the recalibration, metal ticks as the radiator's fins expand.
  const T = TIMELINE, q = T.cues;
  const tick = (t, vel, pan = 0, f = 5200) => noiseHit(t, 0.012, 'highpass', f, 1, vel, pan);                              // a reading updates
  const click = (t, vel) => { noiseHit(t, 0.022, 'bandpass', 2300, 3, vel, 0, 0.05); blip(t, 180, 90, 0.04, vel * 0.8); };  // the shutter
  const ping = (t, n, vel, pan = 0) => pluck(t, nz(n), vel, pan, 0.2, 5200, 0.35);                                         // metal expanding
  to = 'm';
  pad(0.0, 3.1, ['D2', 'A2', 'F3'], 0.05, { type: 'triangle', cut: 700, att: 0.4, rel: 0.3, send: 0.45 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4'], 0.06, { type: 'triangle', cut: 1300, att: 0.2, rel: 0.4, send: 0.5 });
  const pA = ['D4', 'A3', 'D4', 'F4', 'D4', 'A3', 'E4', 'D4'], pB = ['F4', 'C4', 'A4', 'C5', 'F4', 'C4', 'G4', 'A4'];
  for (let i = 0; i < 24; i++) { const t = i * E8; blip(t, nz((t < 3 ? pA : pB)[i % 8]), nz((t < 3 ? pA : pB)[i % 8]), 0.09, t < 3 ? 0.03 : 0.036, i % 2 ? 0.3 : -0.3); }   // the pulse
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'F2' : 'C2')), t < 3 ? 0.07 : 0.085); }
  for (let i = 0; i < 12; i++) tick(i * BEAT + E8, 0.012, i % 2 ? 0.4 : -0.4, 7000);
  // the tone rises as the mug heats: purple to white is a fifth, then an octave
  blip(q.fill, nz('D4'), nz('A5'), q.stop - q.fill, 0.03, 0);
  blip(q.fill, nz('D3'), nz('D4'), q.stop - q.fill, 0.03, 0);
  chime(q.stop, [nz('A5'), nz('D6')], 0.03, 0);
  ['F4', 'A4', 'C5'].forEach((n, i) => pluck(3.0 + 1 / 6, nz(n), 0.085, -0.2 + i * 0.2, 0.5, 2600, 0.4));                  // the payoff: the cat
  drone(3.4, 6.0, 55, 0.05, { att: 0.5, rel: 0.4 }); drone(3.4, 6.0, 82.4, 0.02, { att: 0.5, rel: 0.4 });                // a purr under it
  to = 's';
  sweep(q.pour, q.stop + 0.2, 0.02, 900, 2600, 0.05);                                                                       // the pour
  noiseHit(q.pour + 0.25, 0.3, 'bandpass', 700, 1.2, 0.03, 0.05, 0.1, 1500);                                                // it lands
  for (let i = 0; i < 7; i++) tick(q.fill + i * 0.18, 0.02, 0.1, 4200 + i * 500);                                           // the spot reading climbs
  sweep(q.steam, 2.5, 0.008, 3000, 5200, -0.1);                                                                             // steam
  sweep(2.5, 3.0, 0.014, 500, 1800, 0);                                                                                     // the room closes onto the mug
  click(q.nuc, 0.11); click(q.nuc + 2 / 24, 0.08);                                                                          // NUC: shutter in, shutter out
  for (let i = 0; i < 5; i++) ping(q.rad + 0.35 + i * 0.14, ['C6', 'F6', 'A6', 'C7', 'F7'][i], 0.02, 0.45);           // the fins heat one by one
  sweep(q.draught, 5.6, 0.007, 1400, 500, -0.6);                                                                            // the draught
  for (let i = 0; i < 5; i++) blip(q.mouse + i * 0.13, 3400 + (i % 2) * 500, 3000, 0.03, 0.012, -0.6 + i * 0.05);           // the mouse
  blip(q.ear, 700, 1000, 0.05, 0.02, 0);                                                                                    // the ear turns
  tick(q.blink, 0.02, 0, 3000);                                                                                             // a blink
