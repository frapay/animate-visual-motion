  // SCORE BODY — impasto demo (inside buildScore(); see kit/score-head.js). A painter at work: a warm pad in
  // D minor that opens into D major at the bridge, a plucked figure like a guitar in the next room, a soft bass;
  // every run of brush marks is a stream of soft bristle swishes, the palette knife is a longer scrape that ends
  // in a tick, each star is a small bell, and a gust through the wheat is one slow breath of noise.
  const T = TIMELINE, q = T.cues;
  const swish = (t, vel, pan = 0, f = 1100, dur = 0.085) => noiseHit(t, dur, 'bandpass', f, 0.9, vel, pan, 0.08, f * 1.7);            // one mark: the bristles lift
  const lay = (t0, t1, vel, pan0 = -0.3, pan1 = 0.3, every = E16, f = 1100) => { let i = 0; for (let t = t0; t < t1 - 1e-6; t += every, i++) swish(t + (i % 3) * 0.008, vel * (0.6 + 0.4 * ((i * 5) % 4) / 3), lerp(pan0, pan1, (t - t0) / (t1 - t0)), f * (0.8 + 0.4 * ((i * 3) % 5) / 4)); };
  const knife = (t, vel, pan = 0, dur = 0.26) => { noiseHit(t, dur, 'bandpass', 2600, 2.4, vel, pan, 0.1, 1000); noiseHit(t + dur, 0.025, 'highpass', 4200, 1, vel * 0.7, pan); };   // a scrape, the knife lifts
  const bell = (t, f, vel, pan = 0) => { blip(t, f, f * 0.995, 0.22, vel, pan); blip(t, f * 2.01, f * 2, 0.1, vel * 0.4, pan); };
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F4'], 0.055, { type: 'triangle', cut: 950, att: 0.3, rel: 0.3, send: 0.4 });
  pad(3.0, 6.05, ['D3', 'A3', 'Fs4'], 0.075, { type: 'triangle', cut: 1700, att: 0.15, rel: 0.3, send: 0.45 });
  const mA = ['D4', 'F4', 'A4', 'E4', 'F4', 'D4', 'A3', 'C4'], mB = ['Fs4', 'A4', 'D5', 'B4', 'A4', 'Fs5', 'E5', 'D5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.055 : 0.07, i % 2 ? 0.22 : -0.22, 0.3, t < 3 ? 1800 : 3000, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'D2' : 'G1')) * 2, t < 3 ? 0.07 : 0.09); }
  ['D4', 'Fs4', 'A4'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.2 + i * 0.2, 0.55, 3200, 0.4));                        // the payoff: the sun
  chime(3.0 + 1 / 12, [nz('Fs5'), nz('A5'), nz('D6')], 0.05, 0.2);
  to = 's';
  lay(q.sky, q.sky + 1.1, 0.03, -0.5, 0.5, E16, 900);                                                                   // the sky is brushed in
  lay(q.hill, q.hill + 0.6, 0.02, -0.4, 0.4, E16, 1300);                                                                // the hill
  knife(q.moon, 0.05, 0.3);                                                                                             // the moon is dragged on
  lay(q.field, q.field + 0.9, 0.026, 0.5, -0.5, E16, 700);                                                              // the field's rows
  STARS.forEach((s, i) => bell(q.stars + i * 0.125, nz(['A5', 'D6', 'F6', 'E6', 'A6', 'D6'][i % 6]), 0.022, (s[0] - 540) / 700));   // stars
  [0, 0.125, 0.3].forEach((d, i) => knife(q.house + d, 0.03, 0.3, 0.14));                                               // the farmhouse slabs
  lay(q.flower, q.flower + 0.6, 0.03, -0.5, -0.4, E16, 1700);                                                           // the sunflower
  blip(q.lamp, 520, 660, 0.12, 0.03, 0.3);                                                                              // the window is lit
  blip(q.nod, 700, 500, 0.12, 0.022, -0.5);                                                                             // it nods in its sleep
  sweep(2.4, 3.0, 0.016, 500, 2600, 0);                                                                                 // scraped back to the canvas
  knife(3.0, 0.05, 0.25, 0.2);                                                                                          // the orb is knifed over in chrome
  lay(q.sky2, q.sky2 + 0.9, 0.03, 0.5, -0.5, E16, 1000);                                                                // the day sky
  lay(q.field2, q.field2 + 0.9, 0.028, -0.5, 0.5, E16, 800);                                                            // wheat
  [0, 0.125, 0.3].forEach((d) => knife(q.house2 + d, 0.028, 0.3, 0.14));
  [0, 0.25, 0.75, 1.5].forEach((d, i) => blip(q.birds + d + (i % 2) * E16, 980 - i * 40, 640, 0.09, 0.018, 0.1 - i * 0.2));   // crows
  blip(q.wake, 440, 880, 0.4, 0.03, -0.5);                                                                              // the sunflower turns to the sun
  [q.gust1, q.gust2].forEach((t) => sweep(t, t + 0.5, 0.02, 2400, 700, 0));                                             // a gust through the wheat
  [q.nod1, q.nod2].forEach((t) => blip(t, 620, 930, 0.12, 0.026, -0.5));                                                // it nods on the beat
