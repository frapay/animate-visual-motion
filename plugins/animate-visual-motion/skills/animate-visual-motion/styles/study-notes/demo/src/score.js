  // SCORE BODY — study-notes demo (inside buildScore(); see kit/score-head.js). A soft lo-fi study bed: a warm pad,
  // a quiet kick on the beat, plucks for the highlighters, pencil scratches while the hero writes, a slap for the
  // note, three rising ticks for the checklist.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  for (let i = 0; i < 12; i++) { sub(i * BEAT, i === 6 ? 0.28 : 0.2); if (i % 2) noiseHit(i * BEAT, 0.09, 'bandpass', 1900, 1.1, 0.035, 0.1, 0.2); }
  for (let i = 0; i < 24; i++) noiseHit(i * E8, 0.03, 'highpass', 8000, 0.8, i % 2 ? 0.022 : 0.012, i % 4 < 2 ? -0.25 : 0.25);
  pad(0.0, 3.0, ['F2', 'C3', 'A3', 'E4'], 0.02, { type: 'triangle', cut: 1000, att: 0.3, rel: 0.3, send: 0.4 });
  pad(3.0, 6.05, ['D2', 'A2', 'F3', 'C4', 'E4'], 0.024, { type: 'triangle', cut: 1200, att: 0.4, rel: 0.3, send: 0.45 });
  [[q.headHi, 'A4'], [q.hi1, 'C5'], [q.hi2, 'E5']].forEach(([t, n], i) => pluck(t, nz(n), 0.16, -0.2 + i * 0.2, 0.45, 3600, 0.35));   // highlighter sweeps
  [['F5', 0], ['A5', E16], ['C6', E8]].forEach(([n, dt], i) => pluck(q.glow + dt, nz(n), 0.17 - i * 0.03, 0.2, 0.5, 4400, 0.45));       // the bulb lights
  [[q.tick1, 'D5'], [q.tick2, 'F5'], [q.tick3, 'A5']].forEach(([t, n], i) => pluck(t, nz(n), 0.2, -0.1 + i * 0.1, 0.4, 4200, 0.35));    // ticks on the beat
  chime(q.rest, [nz('D5'), nz('A5'), nz('E6')], 0.05, 0);
  to = 's';
  const scratch = (t0, t1, pan) => { for (let t = t0; t < t1 - 0.01; t += E16 / 2) noiseHit(t, 0.05, 'bandpass', 3000 + ((t * 40) % 3) * 500, 2.2, 0.03, pan); };
  scratch(q.b1, q.b1 + 0.75, -0.15); scratch(q.b2, q.b2 + 0.75, -0.1);
  scratch(q.bulb, q.bulb + 0.9, 0.3);
  for (const t of [q.headHi, q.hi1, q.hi2]) sweep(t, t + 0.28, 0.018, 900, 2600, 0);        // the marker's felt tip
  noiseHit(q.card, 0.12, 'lowpass', 700, 0.8, 0.07, -0.3, 0.15);                              // the card lands
  sweep(2.5, 3.0, 0.012, 500, 2800, 0);                                                      // into the morph
  noiseHit(3.0, 0.16, 'lowpass', 600, 0.8, 0.07, -0.2, 0.2);                                 // the note slaps on
  scratch(q.note, q.note + 0.3, -0.2); scratch(q.note2, q.note2 + 0.25, -0.2); scratch(q.wavy, q.wavy + 0.25, -0.2);
  scratch(q.clock, q.clock + 0.7, 0.3);
  blip(q.tab, 500, 800, 0.08, 0.03, 0.5);
  for (const t of [q.tick1, q.tick2, q.tick3]) noiseHit(t, 0.06, 'bandpass', 2400, 1.6, 0.05, -0.1);
