  // SCORE BODY — blueprint demo (inside buildScore(); see kit/score-head.js). A drafting room: a clean plucked
  // arpeggio over a soft triangle pad, plotter ticks on the 8ths, a pen scratch under every line that draws itself,
  // a click where a measurement lands, a kick from the morph on, a chime when the lamp lights.
  const T = TIMELINE, q = T.cues;
  // the pen: band-passed noise that rises a little as the line is drawn
  const scratch = (t0, dur, vel = 0.016, pan = 0) => sweep(t0, t0 + dur, vel, 2200, 4200, pan);
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'D4', 'F4'], 0.022, { type: 'triangle', cut: 1500, att: 0.5, rel: 0.3, send: 0.5 });
  pad(3.0, 6.05, ['F2', 'C3', 'F3', 'A3', 'C4'], 0.024, { type: 'triangle', cut: 2200, att: 0.12, rel: 0.3, send: 0.5 });
  const arpD = ['D4', 'F4', 'A4', 'D5'], arpF = ['F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4', 'C5'];
  for (let i = 0; i < 24; i++) {
    const t = i * E8;
    if (t < 3) { if (t >= 0.5) pluck(t, nz(arpD[i % 4]), 0.05, i % 2 ? 0.25 : -0.25, 0.3, 2600, 0.3); }
    else pluck(t, nz(arpF[i % 8]), 0.07, i % 2 ? 0.3 : -0.3, 0.3, 3600, 0.3);
    noiseHit(t, 0.03, 'highpass', 7500, 0.8, t < 3 ? 0.014 : 0.03, i % 2 ? 0.3 : -0.3);          // plotter ticks
  }
  for (let i = 0; i < 6; i++) bass(i * BEAT, nz('D2'), i < 2 ? 0.05 : 0.08);
  for (let i = 0; i < 6; i++) { const t = 3.0 + i * BEAT; sub(t, 0.17); bass(t + E8, nz('F2'), 0.11); if (i % 2) noiseHit(t, 0.12, 'bandpass', 2400, 0.9, 0.05, 0, 0.25); }
  chime(q.lit, [nz('C6'), nz('F6'), nz('A6')], 0.05, 0.1);
  to = 's';
  scratch(0.02, 0.45, 0.02, -0.1); scratch(q.hub, 0.5, 0.012, 0); scratch(q.pin, 0.6, 0.014, -0.4); scratch(q.call, 0.35, 0.014, 0.3);
  scratch(q.fil, 0.5, 0.02, 0); scratch(q.base, 0.4, 0.012, 0); scratch(q.kaca, 0.3, 0.012, 0.4); scratch(q.ulir, 0.3, 0.012, 0.4);
  for (const t of [q.dim + 0.45, q.dim2 + 0.45]) { blip(t, 2400, 2400, 0.03, 0.035, -0.2); blip(t + 0.06, 3200, 3200, 0.03, 0.03, 0.2); }   // arrowheads land
  blip(q.spin, 240, 420, 0.3, 0.04, 0);                                    // the gear starts to turn
  blip(q.call, 1400, 1900, 0.06, 0.04, 0.3);                               // the callout
  blip(q.call, 320, 800, 0.16, 0.04, 0.5); blip(q.call + 0.42, 560, 220, 0.07, 0.04, 0.5);   // Jangka hops
  riser(2.4, 3.0, 0.022);
  noiseHit(3.0, 0.3, 'bandpass', 1000, 0.9, 0.035, 0, 0.35, 320);
  blip(q.lit, 900, 2600, 0.12, 0.03, 0);                                   // the lamp lights
  blip(q.lit, 320, 800, 0.16, 0.035, 0.5); blip(q.lit + 0.42, 560, 220, 0.07, 0.035, 0.5);
  blip(q.ulir, 1400, 1900, 0.06, 0.03, 0.3); blip(q.kaca, 1400, 1900, 0.06, 0.03, 0.3);
