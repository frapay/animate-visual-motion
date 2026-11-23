  // SCORE BODY — infographic demo (inside buildScore(); see kit/score-head.js). Light and friendly: a soft kick on
  // the beat, shakers on 8ths, a warm pad, a rising pluck for every person counted, blips for the columns, a chime
  // when the hero lands on the coral column and when the line arrives.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  for (let i = 0; i < 12; i++) { sub(i * BEAT, i === 6 ? 0.32 : 0.24); bass(i * BEAT + E8, nz(i < 6 ? 'C2' : 'F2') * 2, 0.06); }
  for (let i = 0; i < 24; i++) noiseHit(i * E8, 0.035, 'highpass', 7500, 0.8, i % 2 ? 0.04 : 0.02, i % 4 < 2 ? -0.25 : 0.25);
  pad(0.0, 3.0, ['C3', 'G3', 'E4'], 0.02, { type: 'triangle', cut: 1400, att: 0.3, rel: 0.3, send: 0.35 });
  pad(3.0, 6.05, ['F2', 'C3', 'A3', 'E4'], 0.022, { type: 'triangle', cut: 1500, att: 0.4, rel: 0.3, send: 0.4 });
  // one pluck per person, up a major scale: the seventh lands on the octave's doorstep
  ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'E5'].forEach((n, i) => pluck(q.fill + i * E8, nz(n), 0.1 + i * 0.008, lerp(-0.3, 0.3, i / 6), 0.3, 3000));
  chime(q.last + E8, [nz('G5'), nz('C6'), nz('E6')], 0.06, 0);
  ['F3', 'A3', 'C4', 'F4', 'A4'].forEach((n, i) => pluck(q.cols + i * 0.1, nz(n), 0.09, lerp(-0.3, 0.3, i / 4), 0.28, 2600));
  chime(q.land, [nz('A5'), nz('C6'), nz('F6')], 0.07, 0.05);
  chime(q.lineEnd, [nz('C6'), nz('F6')], 0.045, 0.3);
  to = 's';
  for (let i = 0; i < 7; i++) blip(q.fill + i * E8, 620, 380, 0.04, 0.035, lerp(-0.3, 0.3, i / 6));   // the hero's hops
  blip(q.solid, 300, 620, 0.2, 0.045, -0.2);                               // the donut closes
  blip(q.perch, 520, 280, 0.06, 0.05, -0.2);
  sweep(2.5, 3.0, 0.012, 500, 3200, 0);
  noiseHit(3.0, 0.3, 'bandpass', 1400, 1.0, 0.014, 0, 0.3, 500);
  blip(q.land, 520, 260, 0.07, 0.06, 0);                                   // the hero lands on the column
  sweep(q.line, q.lineEnd, 0.01, 700, 2600, 0.3);                          // the line draws on
  blip(q.chip, 700, 1400, 0.08, 0.04, -0.2);
