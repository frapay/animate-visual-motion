  // SCORE BODY — cave-painting demo (inside buildScore(); see kit/score-head.js). Deep in a cave: a low skin
  // drum, a slow breath, a bone flute in A minor pentatonic, the fire crackling throughout; every daub is a dry
  // finger scrape, blown pigment is a short puff of breath.
  const T = TIMELINE, q = T.cues;
  const drum = (t, vel, hi = false) => { const o = osc('sine', hi ? 150 : 96, t, t + 0.6); o.frequency.exponentialRampToValueAtTime(hi ? 88 : 52, t + 0.22); const g = ac.createGain(); env(g, t, 0.004, vel, hi ? 0.3 : 0.5); o.connect(g); out(g, hi ? 0.15 : -0.1, 0.3); noiseHit(t, 0.05, 'lowpass', hi ? 900 : 480, 0.8, vel * 0.5, 0, 0.25); };
  const breath = (t0, t1, vel, f = 700, pan = 0) => { const src = ac.createBufferSource(); src.buffer = noise; src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(f * 0.7, t0); bp.frequency.linearRampToValueAtTime(f * 1.25, (t0 + t1) / 2); bp.frequency.linearRampToValueAtTime(f * 0.8, t1); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vel, (t0 + t1) / 2); g.gain.exponentialRampToValueAtTime(0.0001, t1); src.connect(bp); bp.connect(g); out(g, pan, 0.5); src.start(t0, (t0 * 1.7) % 1.5); src.stop(t1 + 0.05); };
  const flute = (t, n, dur, vel, pan = 0) => {   // a bone flute: a breathy sine with a slow vibrato that opens late
    const f = nz(n), o = osc('sine', f * 0.985, t, t + dur + 0.2); o.frequency.linearRampToValueAtTime(f, t + 0.07);
    const lfo = osc('sine', 5.2, t, t + dur + 0.2), lg = ac.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.7); lfo.connect(lg); lg.connect(o.frequency);
    const o2 = osc('sine', f * 2.01, t, t + dur + 0.2), g2 = ac.createGain(); g2.gain.value = 0.16; o2.connect(g2);
    const o3 = osc('sine', f * 3.0, t, t + dur + 0.2), g3 = ac.createGain(); g3.gain.value = 0.05; o3.connect(g3);
    const src = ac.createBufferSource(); src.buffer = noise; src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3; const gn = ac.createGain(); gn.gain.value = 0.5; src.connect(bp); bp.connect(gn); src.start(t, (t * 2.3) % 1.2); src.stop(t + dur + 0.2);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.06); g.gain.setValueAtTime(vel * 0.85, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    o.connect(g); g2.connect(g); g3.connect(g); gn.connect(g); out(g, pan, 0.6);
  };
  const crackle = (t0, t1, vel) => { let i = 0; for (let t = t0; t < t1; i++) { const h = hash('crk', i), a = (h % 1000) / 1000, b = ((h >> 10) % 1000) / 1000; t += 0.03 + a * 0.13; if (t >= t1) break; noiseHit(t, 0.008 + b * 0.02, 'highpass', 2400 + b * 3500, 1, vel * (0.35 + 0.65 * a * a), (b - 0.5) * 1.2, 0.08); } };
  const scrape = (t0, t1, vel, pan0 = -0.3, pan1 = 0.3, f = 1500) => { let i = 0; for (let t = t0; t < t1 - 1e-6; t += E16, i++) noiseHit(t + (i % 3) * 0.007, 0.1, 'bandpass', f * (0.85 + 0.3 * ((i * 3) % 5) / 4), 0.9, vel * (0.6 + 0.4 * ((i * 5) % 4) / 3), lerp(pan0, pan1, (t - t0) / (t1 - t0)), 0.1, f * 0.5); };   // a dry finger on rock
  const dab = (t, vel, pan = 0) => { noiseHit(t, 0.03, 'lowpass', 700, 1.2, vel, pan, 0.1); blip(t, 240, 170, 0.04, vel * 0.5, pan); };
  const puff = (t, dur, vel, pan = 0) => breath(t, t + dur, vel, 2400, pan);                                               // pigment blown from the mouth
  to = 'm';
  drone(0.0, 6.05, nz('A1'), 0.05, { att: 0.6, rel: 0.5 });
  pad(0.0, 3.1, ['A2', 'E3'], 0.03, { type: 'triangle', cut: 600, att: 0.5, rel: 0.4, send: 0.5 });
  pad(3.0, 6.05, ['A2', 'E3', 'A3'], 0.05, { type: 'triangle', cut: 900, att: 0.2, rel: 0.4, send: 0.5 });
  for (let i = 0; i < 6; i++) { const t = i * BEAT; drum(t, i % 2 ? 0.1 : 0.16); if (i % 2) drum(t + E8, 0.06, true); }               // the hunt: a slow heartbeat
  for (let i = 0; i < 12; i++) { const t = 3.0 + i * E8; drum(t, i % 4 === 0 ? 0.22 : i % 2 === 0 ? 0.14 : 0.07, i % 4 === 3 || i % 4 === 1); }   // the hands: it doubles
  breath(0.1, 1.5, 0.03, 600, -0.2); breath(1.6, 2.9, 0.035, 650, 0.2); breath(3.3, 4.6, 0.03, 600, -0.2); breath(4.7, 5.9, 0.03, 650, 0.2);
  flute(1.0, 'E5', 0.9, 0.035, 0.2); flute(2.0, 'D5', 0.45, 0.03, 0.2); flute(2.5, 'C5', 0.45, 0.03, 0.2);
  [['A4', 3.0, 0.45], ['C5', 3.5, 0.22], ['D5', 3.75, 0.22], ['E5', 4.0, 0.7], ['G5', 4.75, 0.22], ['E5', 5.0, 0.45], ['D5', 5.5, 0.2], ['E5', 5.75, 0.22]].forEach(([n, t, d]) => flute(t, n, d, 0.075, 0.15));
  to = 's';
  crackle(0.0, 6.0, 0.03);
  scrape(q.disc, q.disc + 0.5, 0.03, 0.3, 0.4, 1300);                                                                      // the disc is rubbed on
  scrape(q.bison, q.bison + 1.1, 0.034, -0.4, 0.1, 1500);                                                                  // the bison
  scrape(q.horse, q.horse + 0.7, 0.024, -0.5, -0.3, 1900);                                                                 // the horse
  scrape(q.stag, q.stag + 0.8, 0.03, 0.3, 0.5, 1700);                                                                      // the stag
  [0, 0.15].forEach((d, i) => scrape(q.hunters + d, q.hunters + d + 0.4, 0.02, -0.6 + i * 0.2, -0.5 + i * 0.2, 2200));     // two hunters
  for (let i = 0; i < 7; i++) dab(q.dots + i * 0.0625, 0.03, 0.4 + i * 0.05);                                              // seven finger dots
  sweep(q.spear, q.spear + 0.4, 0.02, 900, 2600, 0); dab(q.spear + 0.5, 0.05, 0.1);                                        // the spear flies
  sweep(2.4, 2.85, 0.016, 1800, 300, 0);                                                                                   // the light closes on the disc
  puff(2.8, 0.45, 0.07, 0.2);                                                                                              // in the dark it is blown over
  sub(3.0, 0.12);
  blip(q.lift, 300, 520, 0.12, 0.03, 0.2);                                                                                 // the hand comes off the wall
  [[q.hand1, -0.4], [q.hand2, 0.5], [q.hand3, -0.1]].forEach(([t, pan]) => { puff(t, 0.22, 0.06, pan); puff(t + 0.24, 0.2, 0.05, pan); blip(t + 0.47, 300, 520, 0.1, 0.025, pan); });   // two breaths and a lift for every hand
  scrape(q.pig, q.pig + 1.0, 0.03, -0.5, 0, 1500);                                                                         // the babirusa
  scrape(q.anoa, q.anoa + 0.6, 0.02, -0.6, -0.5, 2000);                                                                    // the anoa
  for (let i = 0; i < 7; i++) dab(q.dots2 + i * 0.0625, 0.028, -0.5 + i * 0.12);
