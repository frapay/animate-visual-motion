  // SCORE BODY — wayang demo (inside buildScore(); see kit/score-head.js). A gamelan-like texture in a slendro-like
  // five-note scale (five equal ~240-cent steps, so nothing here is tuned to the piano): saron on the beat (the
  // balungan), bonang twice as fast an octave up, kenong every 4 beats, a kendang pattern with a roll into the morph,
  // kecrek clicks, and a gong (a low beating pair, no pitch drop) on the first beat and on the morph.
  const T = TIMELINE, q = T.cues;
  const SL = (deg, oct = 0) => 293.66 * 2 ** (oct + deg * 240 / 1200);   // slendro-like: five ~240-cent steps
  const gong = (t, vel) => {
    to = 'm';
    const f = SL(0, -2);   // ~73 Hz
    drone(t, t + 3.0, f, vel * 0.55, { att: 0.012, rel: 2.6 }); drone(t, t + 2.9, f * 1.021, vel * 0.4, { att: 0.012, rel: 2.5 });   // the beating pair (ombak, ~1.5 Hz)
    drone(t, t + 2.2, f * 2, vel * 0.22, { att: 0.01, rel: 2.0 });                                                                 // the octave, so a phone speaker still has a gong
    noiseHit(t, 0.09, 'lowpass', 320, 0.7, vel * 0.5);                                                                             // the padded mallet
    chime(t, [SL(0, -1), SL(2, -1) * 1.003], vel * 0.4, 0);
  };
  to = 'm';
  drone(0.0, 6.05, SL(0, -1), 0.01, { att: 0.6, rel: 0.5 }); drone(0.0, 6.05, SL(3, -1), 0.007, { att: 0.6, rel: 0.5 });   // a quiet bed on the scale's own 1 and 4
  const balungan = [2, 1, 2, 3, 5, 3, 2, 1, 2, 3, 2, 0];                   // one note a beat
  balungan.forEach((d, i) => pluck(i * BEAT, SL(d), 0.11, -0.2, 0.55, 2600, 0.35));
  for (let i = 0; i < 24; i++) { const d = balungan[Math.floor(i / 2)]; pluck(i * E8 + 0.01, SL((d + (i % 2 ? 2 : 0)) % 5, 1), 0.045, 0.35, 0.3, 4200, 0.25); }   // bonang
  for (let i = 1; i < 6; i += 2) chime(i * BEAT * 2 - BEAT, [SL(3, -1), SL(3, 0)], 0.05, -0.1);   // kenong
  gong(0.0, 0.16); gong(3.0, 0.2);
  // kendang: 'd' = dung (a low pitched skin), 't' = tak (a dry slap), one character an 8th; a roll of 16ths into the morph
  to = 'm';
  const dung = (t, v) => { blip(t, 175, 108, 0.13, v, -0.12); noiseHit(t, 0.03, 'lowpass', 520, 0.7, v * 0.4, -0.12); };
  const tak = (t, v) => noiseHit(t, 0.035, 'bandpass', 1500, 3, v, 0.18);
  'd.t.d.ttd.t.d.t.d.ttd.t.d.t.d.tt'.slice(0, 24).split('').forEach((ch, i) => { if (ch === 'd') dung(i * E8, i === 12 ? 0.05 : 0.075); else if (ch === 't') tak(i * E8, 0.035); });
  for (let k = 0; k < 4; k++) tak(2.5 + k * E16, 0.02 + k * 0.008);
  to = 's';
  for (let i = 0; i < 24; i++) if (i % 4 === 3) noiseHit(i * E8, 0.05, 'highpass', 5200, 0.8, 0.03, 0.4, 0.1);   // kecrek
  noiseHit(q.spin, 0.9, 'bandpass', 900, 0.8, 0.02, 0, 0.4, 2400);                       // the gunungan's whoosh
  // puppet steps, on the landings of its hops (3 a second: see wyPuppet's walk phase in scenes.js)
  for (let t = q.walk + 1 / 3; t < q.stop + 0.05; t += 1 / 3) noiseHit(t, 0.06, 'bandpass', 420, 2, 0.05, -0.3);
  sweep(2.5, 3.0, 0.012, 400, 2200, 0);
  for (let t = q.walk2 + 1 / 3; t < q.stop2 + 0.05; t += 1 / 3) noiseHit(t, 0.06, 'bandpass', 420, 2, 0.05, -0.3);
  blip(q.house, 300, 500, 0.12, 0.03, 0.3);
  for (let i = 0; i < 3; i++) blip(q.birds + 0.1 + i * 0.18, 2600, 3400, 0.05, 0.015, 0.4 - i * 0.2);
