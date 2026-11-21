  // SCORE BODY — glass demo (inside buildScore(); see kit/score-head.js). Airy and clean: a soft pad, glassy
  // 8th-note plucks, UI ticks while the number counts, a click per toggle, a kick + bass under the dashboard,
  // a success chime on the check and on 100%.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'E4', 'Fs4'], 0.022, { cut: 1500, att: 0.5, rel: 0.3, send: 0.6 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'Fs4', 'A4'], 0.024, { cut: 2100, att: 0.15, rel: 0.3, send: 0.6 });
  const arpA = ['Fs5', 'A5', 'D6', 'A5'], arpB = ['D5', 'G5', 'B5', 'D6'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.5) continue; pluck(t, nz((t < 3 ? arpA : arpB)[i % 4]), t < 3 ? 0.05 : 0.06, i % 2 ? 0.3 : -0.3, 0.3, 4600, 0.45); }
  for (let i = 2; i < 6; i++) bass(i * BEAT, nz('D3'), 0.07);
  for (let i = 0; i < 6; i++) { const t = 3.0 + i * BEAT; sub(t, i ? 0.2 : 0.26); bass(t + E8, nz('G2') * 2, 0.09); }
  for (let i = 0; i < 12; i++) noiseHit(3.0 + i * E8 + E16, 0.035, 'highpass', 8200, 0.7, 0.026, i % 2 ? 0.3 : -0.3);
  chime(q.done, [nz('A5'), nz('D6'), nz('Fs6')], 0.05, 0.2);
  chime(q.check, [nz('B5'), nz('D6'), nz('G6')], 0.08, 0);
  chime(q.full, [nz('D6'), nz('Fs6'), nz('A6')], 0.06, 0.25);
  to = 's';
  for (let i = 0; i < 10; i++) blip(q.count + i * 0.12, 2300 + i * 70, 2200 + i * 70, 0.012, 0.012, -0.2);        // the number counts
  for (const [t, p] of [[q.ringCard, -0.4], [q.togCard, 0.4], [q.row, 0], [q.chipA, -0.5], [q.bars, -0.4], [q.ring2, 0.4]]) noiseHit(t, 0.22, 'bandpass', 900, 0.8, 0.022, p, 0.3, 2600);   // panels float in
  blip(q.land, 520, 240, 0.08, 0.05, 0.4);                                                                        // the orb lands
  for (const t of [q.tog1, q.tog2, q.tog3]) { blip(t, 760, 1180, 0.04, 0.045, 0.35); noiseHit(t, 0.02, 'highpass', 5000, 0.8, 0.02, 0.35); }   // toggles
  blip(q.done + 0.02, 400, 900, 0.16, 0.035, 0.4);                                                               // the orb cheers
  sweep(2.4, 3.0, 0.02, 500, 4200, 0);
  noiseHit(3.0, 0.35, 'bandpass', 1300, 0.9, 0.05, 0, 0.4, 420);
  blip(q.hero2, 500, 1000, 0.12, 0.04, 0.4);
  for (let i = 0; i < 7; i++) blip(q.bars + 0.15 + i * 0.07, 900 + i * 90, 1000 + i * 90, 0.02, 0.014, -0.4);     // bars rise
