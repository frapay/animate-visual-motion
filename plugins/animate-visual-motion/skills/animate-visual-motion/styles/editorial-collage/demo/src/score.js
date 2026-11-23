  // SCORE BODY — editorial-collage demo (inside buildScore(); see kit/score-head.js). A dry newsroom pulse:
  // a soft kick on the beat, a plucked ostinato, paper slaps for every piece that lands, a squeak for the highlighter
  // and the marker, a low thud for the stamp.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  for (let i = 0; i < 12; i++) { sub(i * BEAT, i >= 6 ? 0.34 : 0.22); if (i >= 6) bass(i * BEAT + E8, nz(i < 10 ? 'D2' : 'A1') * 2, 0.07); }
  for (let i = 0; i < 24; i++) noiseHit(i * E8, 0.03, 'highpass', 8000, 0.8, i >= 12 ? (i % 2 ? 0.045 : 0.022) : (i % 2 ? 0.02 : 0), i % 4 < 2 ? -0.25 : 0.25);
  const riff = ['D4', 'A4', 'F4', 'A4', 'D4', 'C5', 'A4', 'F4'];
  for (let i = 0; i < 24; i++) if (i < 10 || i >= 14) pluck(i * E8, nz(riff[i % 8]), i >= 12 ? 0.075 : 0.045, i % 2 ? 0.2 : -0.2, 0.2, i >= 12 ? 3200 : 2200, 0.2);
  pad(0.0, 2.6, ['D3', 'A3', 'F4'], 0.012, { type: 'triangle', cut: 1000, att: 0.3, rel: 0.3, send: 0.3 });
  pad(3.3, 6.05, ['D3', 'A3', 'F4', 'C5'], 0.02, { type: 'triangle', cut: 1400, att: 0.3, rel: 0.3, send: 0.4 });
  chime(q.stamp, [nz('D5'), nz('A5')], 0.05, 0.1);
  to = 's';
  const slap = (t, v = 0.06, pan = 0) => { noiseHit(t, 0.07, 'bandpass', 1500, 0.9, v, pan, 0.08); noiseHit(t, 0.02, 'highpass', 5000, 0.8, v * 0.6, pan); };
  slap(q.clip, 0.05, 0.3); for (const [t, p] of [[q.w1, -0.3], [q.w2, -0.1], [q.w3, -0.3], [q.w4, 0.1]]) slap(t, 0.045, p);
  slap(q.q, 0.06, 0.3); blip(q.pin, 1400, 900, 0.03, 0.04, 0.3); blip(q.tape, 2600, 1800, 0.05, 0.02, 0.3);
  sweep(q.hi, q.hi + 0.3, 0.02, 2800, 5200, 0.1);                               // the highlighter
  for (const t of [q.tap1, q.tap2, q.tap3, q.tap4]) blip(t, 520, 300, 0.05, 0.05, 0.25);   // the hand taps
  sweep(2.5, 3.0, 0.012, 500, 2600, 0); noiseHit(3.0, 0.3, 'bandpass', 1200, 1.0, 0.02, 0, 0.3, 500);   // the tear
  slap(q.phone, 0.07, -0.3);
  sweep(q.circle, q.circle + 0.4, 0.022, 1800, 3000, -0.2); sweep(q.arrow, q.arrow + 0.4, 0.022, 2200, 3600, 0.1); blip(q.cross, 2400, 2000, 0.06, 0.02, 0.3);   // the marker
  sub(q.stamp, 0.6); noiseHit(q.stamp, 0.14, 'lowpass', 900, 0.8, 0.12, 0, 0.2);   // the stamp
