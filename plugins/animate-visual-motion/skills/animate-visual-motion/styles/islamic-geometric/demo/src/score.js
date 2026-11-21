  // SCORE BODY — islamic-geometric demo (inside buildScore(); see kit/score-head.js). A calm open-fifth drone by
  // night, a D major pad by day; an oud-like line in D hijaz (D Eb F# G A) with one pluck per compass circle, on
  // the 16th grid; a soft frame-drum pulse (dum on the beat, tek between); a chime when the star gains its points.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'D4'], 0.026, { type: 'triangle', cut: 1100, att: 0.5, rel: 0.4, send: 0.6 });
  pad(2.9, 6.05, ['D3', 'A3', 'Fs4'], 0.034, { type: 'triangle', cut: 1500, att: 0.4, rel: 0.5, send: 0.6 });
  drone(0.0, 6.05, nz('D2'), 0.03, { att: 0.6, rel: 0.5 });
  // night: one note per circle of the rosette (8 circles, a 16th apart), then the squares, the outer star, the tips
  ['D5', 'Eb5', 'Fs5', 'G5', 'A5', 'G5', 'Fs5', 'Eb5'].forEach((n, i) => pluck(q.rosette + i * E16, nz(n), 0.05, (i % 2 ? 0.25 : -0.25), 0.5, 2400, 0.45));
  pluck(q.squares, nz('D5'), 0.055, -0.2, 0.7, 2400, 0.45); pluck(q.squares + E8, nz('Fs5'), 0.055, 0.2, 0.7, 2400, 0.45);
  pluck(q.outer, nz('A5'), 0.055, -0.2, 0.7, 2600, 0.45); pluck(q.outer + E8, nz('Bb5'), 0.045, 0.2, 0.6, 2600, 0.45);
  chime(q.done, [nz('A5'), nz('D6')], 0.034, 0);
  // day: the zellige builds in the arch (a rising line), the star gains points, the chime answers on the beat
  ['D5', 'Fs5', 'G5', 'A5', 'Bb5', 'A5'].forEach((n, i) => pluck(q.arch + E8 + i * E8, nz(n), 0.06, (i % 2 ? 0.2 : -0.2), 0.6, 2800, 0.45));
  pluck(5.5, nz('Fs5'), 0.05, -0.2, 0.9, 2400, 0.5); pluck(5.75, nz('D5'), 0.05, 0.2, 1.0, 2400, 0.5);
  chime(q.ring, [nz('D6'), nz('A5'), nz('Fs6')], 0.075, 0);
  bass(0.0, nz('D2'), 0.07); bass(3.0, nz('D2'), 0.09); bass(q.ring, nz('D2'), 0.09);
  // frame drum: quiet, low and round; rests through the morph so the turn breathes
  for (let b = 1.0; b < 6.0 - 1e-6; b += BEAT) {
    if (b > 2.3 && b < 3.4) continue;
    const day = b >= 3.5, v = day ? 0.07 : 0.05;
    noiseHit(b, 0.16, 'lowpass', 190, 1.2, v, 0, 0.2);                                  // dum
    noiseHit(b + E8, 0.05, 'bandpass', 2300, 2.2, v * 0.3, 0.25, 0.25);               // tek
    if (day) noiseHit(b + E8 + E16, 0.04, 'bandpass', 2700, 2.2, v * 0.22, -0.25, 0.25);
  }
  to = 's';
  sweep(2.5, 3.02, 0.008, 500, 2000, 0);
  blip(q.star, 700, 1400, 0.12, 0.028);
