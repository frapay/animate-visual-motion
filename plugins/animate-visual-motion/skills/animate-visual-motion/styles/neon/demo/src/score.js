  // SCORE BODY — neon demo (inside buildScore(); see kit/score-head.js). Synthwave: detuned saw pads, an 8th-note
  // bass arp, gated kick + snare in the music era, buzz-zaps on every power-on.
  const T = TIMELINE, q = T.cues;
  // a neon buzz: a short mains hum (sawtooth at 120 Hz, band-passed) — the sign's transformer catching
  const buzz = (t, dur, vel, pan = 0) => {
    const o = osc('sawtooth', 120, t, t + dur + 0.05), o2 = osc('square', 240.7, t, t + dur + 0.05);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.4;
    const g = ac.createGain(); env(g, t, 0.004, vel, dur); o.connect(bp); o2.connect(bp); bp.connect(g); out(g, pan, 0.15);
  };
  to = 'm';
  pad(0.0, 3.1, ['A2', 'E3', 'A3', 'C4', 'E4'], 0.024, { cut: 1300, att: 0.6, rel: 0.3, send: 0.6 });
  pad(3.0, 6.05, ['F2', 'C3', 'F3', 'A3', 'E4'], 0.026, { cut: 1900, att: 0.15, rel: 0.3, send: 0.6 });
  const arpA = ['A2', 'A3', 'E3', 'A3'], arpF = ['F2', 'F3', 'C3', 'F3'];
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t < 0.9) continue; bass(t, nz((t < 3 ? arpA : arpF)[i % 4]), t < 3 ? 0.08 : 0.11); }
  chime(q.word + 0.5, [nz('E5'), nz('A5'), nz('C6')], 0.06, 0.2);
  for (let i = 0; i < 6; i++) { const t = 3.0 + i * BEAT; sub(t, 0.22); if (i % 2) noiseHit(t, 0.16, 'bandpass', 2200, 0.8, 0.12, 0, 0.35); }
  for (let i = 0; i < 12; i++) noiseHit(3.0 + i * E8 + E16, 0.04, 'highpass', 8000, 0.7, 0.03, (i % 2 ? 0.3 : -0.3));
  to = 's';
  // power-on stutters: buzz-zaps on the board, the heart, each letter of BUKA, the robot, the label
  [[0.05, -0.2], [q.heart, 0], [q.heart + 0.15, 0], [q.hero, -0.4], [q.label, 0.2], [q.rec, 0]].forEach(([t, p], i) => buzz(t, 0.09 + (i % 2) * 0.05, 0.05, p));
  for (let i = 0; i < 4; i++) { buzz(q.word + i * E16, 0.07, 0.05, -0.3 + i * 0.2); blip(q.word + i * E16 + 0.05, 1400 + i * 200, 2600, 0.04, 0.02, -0.3 + i * 0.2); }
  blip(q.hop, 300, 900, 0.18, 0.06, -0.4); blip(q.hop + 0.42, 600, 200, 0.08, 0.05, -0.4);
  riser(2.3, 3.0, 0.03);
  noiseHit(3.0, 0.35, 'bandpass', 900, 0.9, 0.06, 0, 0.4, 300);
  for (let i = 0; i < 5; i++) blip(q.notes + [0, 0.25, 0.75, 1.25, 1.5][i], 1200 + i * 150, 1800, 0.05, 0.02, i % 2 ? 0.4 : -0.4);
