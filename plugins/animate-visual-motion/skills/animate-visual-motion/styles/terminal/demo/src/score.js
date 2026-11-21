  // SCORE BODY — terminal demo (inside buildScore(); see kit/score-head.js). An old computer waking up:
  // a mains hum, key clicks, check beeps, a rising tick as the bar fills; then a square-wave arp over a
  // triangle bass on the dashboard, a two-note "halo" chirp. A minor -> C major, 120 BPM.
  const T = TIMELINE, q = T.cues;
  const sq = (t, n, vel, dur = 0.1, pan = 0, type = 'square', cut = 2600) => {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut;
    const g = ac.createGain(); env(g, t, 0.003, vel, dur);
    osc(type, typeof n === 'number' ? n : nz(n), t, t + dur + 0.05).connect(lp); lp.connect(g); out(g, pan, 0.1);
  };
  const tri = (t, n, vel, dur = 0.22) => { const g = ac.createGain(); env(g, t, 0.004, vel, dur); osc('triangle', nz(n), t, t + dur + 0.05).connect(g); out(g, 0, 0); };
  const key = (t, vel = 0.03, pan = 0) => { noiseHit(t, 0.018, 'bandpass', 2600, 2.5, vel, pan); noiseHit(t + 0.006, 0.03, 'lowpass', 500, 0.8, vel * 0.8, pan); };
  to = 'm';
  // the tube's hum under everything (two octaves: a phone speaker hears the upper one), a soft pad per era
  drone(0.0, 6.05, 110, 0.03, { att: 0.3, rel: 0.2 }); drone(0.0, 6.05, 220, 0.016, { att: 0.3, rel: 0.2 });
  pad(0.0, 3.1, ['A2', 'E3', 'A3', 'C4'], 0.016, { cut: 900, att: 0.5, rel: 0.3, send: 0.4, type: 'square' });
  pad(3.0, 6.05, ['C3', 'G3', 'C4', 'E4'], 0.028, { cut: 1300, att: 0.15, rel: 0.3, send: 0.4, type: 'square' });
  // era 1: a sparse pulse on the beat
  for (let i = 0; i < 6; i++) tri(i * BEAT, i % 2 ? 'E3' : 'A2', 0.06, 0.3);
  for (let i = 2; i < 12; i++) sq(i * E8, ['A3', 'C4', 'E4', 'C4'][i % 4], 0.016, 0.09, -0.15, 'square', 1500);
  // era 2: 16th-note arp, bass on 8ths
  const arp = ['C5', 'G4', 'E5', 'G4', 'D5', 'G4', 'C5', 'A4'];
  for (let i = 0; i < 24; i++) sq(3.0 + i * E16, arp[i % 8], 0.034, 0.08, i % 2 ? 0.2 : -0.2, 'square', 3000);
  for (let i = 0; i < 12; i++) tri(3.0 + i * E8, ['C3', 'C3', 'G2', 'G2', 'A2', 'A2', 'E3', 'E3', 'F3', 'F3', 'G3', 'G3'][i], 0.15, 0.2);
  to = 's';
  for (let i = 0; i < 7; i++) key(q.type + i / 16, 0.035, -0.2 + (i % 3) * 0.1);          // "> mulai", 16 keys a second
  [q.l1, q.l2, q.wake].forEach((t, i) => sq(t + (i < 2 ? 0.25 : 0), 880 + i * 220, 0.035, 0.07, 0.2));   // each "oke"
  for (let i = 0; i < 12; i++) sq(q.bar + i * E8, 330 * 2 ** (i / 12), 0.011, 0.04, 0.3, 'square', 4000);   // the bar ticks up
  blip(q.wake, 500, 1100, 0.14, 0.05, 0.3);                                               // Bit wakes and hops
  sq(q.done, 'A5', 0.04, 0.09, 0); sq(q.done + 0.09, 'E6', 0.04, 0.22, 0);              // selesai
  sweep(2.5, 3.0, 0.014, 500, 3000, 0);                                                   // into the morph
  sq(3.0, 'C5', 0.04, 0.3, -0.2); sq(3.0, 'E5', 0.035, 0.3, 0); sq(3.0, 'G5', 0.035, 0.3, 0.2);
  for (let i = 0; i < 5; i++) sq(q.chart + i * E16, 440 + i * 110, 0.02, 0.05, -0.3, 'square', 3500);   // bars rise
  sq(q.halo, 'E6', 0.045, 0.08, -0.3); sq(q.halo + 0.1, 'G6', 0.045, 0.2, -0.3);         // "halo!"
  blip(q.hop, 400, 900, 0.14, 0.045, -0.3); blip(q.hop2, 400, 900, 0.14, 0.045, -0.3);
  for (let i = 0; i < 17; i++) key(q.siap + i / 30, 0.02, 0.1);                            // the caption types
  for (let i = 0; i < 6; i++) noiseHit(3.0 + i * 0.5, 0.03, 'highpass', 6000, 0.8, 0.012, 0.35);   // the log scrolls
