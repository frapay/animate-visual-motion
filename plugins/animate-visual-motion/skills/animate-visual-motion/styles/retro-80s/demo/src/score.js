  // SCORE BODY — retro-80s demo (inside buildScore(); see kit/score-head.js). Synth-pop: a saw pad, an octave bass on
  // the 8ths, a bright 16th arpeggio, a kick / snare / hat kit that comes in fully at the party; sparkles are chimes.
  const T = TIMELINE, q = T.cues;
  const snare = (t, v) => { noiseHit(t, 0.15, 'bandpass', 1900, 0.8, v, 0, 0.35); blip(t, 230, 150, 0.07, v * 0.5); };
  const hat = (t, v, pan = 0) => noiseHit(t, 0.035, 'highpass', 7500, 0.7, v, pan);
  const spark = (t, v, pan = 0) => chime(t, [nz('E6'), nz('A6')], v, pan);
  const pop = (t, f, v, pan = 0) => blip(t, f, f * 2.1, 0.06, v, pan);
  const thud = (t, v, pan = 0) => { sub(t, v); noiseHit(t, 0.08, 'lowpass', 600, 0.7, v * 0.3, pan, 0.2); };
  to = 'm';
  pad(0.0, 3.1, ['A2', 'E3', 'A3', 'C4'], 0.045, { cut: 1300, att: 0.4, rel: 0.3, send: 0.4 });
  pad(3.0, 4.55, ['C3', 'G3', 'C4', 'E4'], 0.06, { cut: 2000, att: 0.1, rel: 0.2, send: 0.4 });
  pad(4.5, 6.05, ['F2', 'C3', 'A3', 'F4'], 0.06, { cut: 2000, att: 0.1, rel: 0.3, send: 0.4 });
  for (let i = 0; i < 24; i++) { const t = i * E8, root = t < 3 ? 'A' : t < 4.5 ? 'C' : 'F'; bass(t, nz(root + (i % 2 ? '3' : '2')), t < 3 ? 0.075 : 0.095); }
  const aA = ['A4', 'C5', 'E5', 'C5'], aC = ['C5', 'E5', 'G5', 'E5'], aF = ['C5', 'F5', 'A5', 'F5'];
  for (let i = 0; i < 48; i++) { const t = i * E16; if (t < 1.0) continue; const A = t < 3 ? aA : t < 4.5 ? aC : aF; pluck(t, nz(A[i % 4]), t < 3 ? 0.04 : 0.055, i % 2 ? 0.3 : -0.3, 0.16, t < 3 ? 2600 : 4200, 0.25); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; if (t >= 1.0) sub(t, t < 3 ? 0.07 : 0.1); if (t >= 3 && i % 2) snare(t, 0.07); }
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t >= 1.0) hat(t, t < 3 ? 0.018 : 0.03, i % 2 ? 0.3 : -0.3); }
  ['C4', 'E4', 'G4', 'C5'].forEach((n, i) => pluck(3.0, nz(n), 0.1, -0.3 + i * 0.2, 0.5, 4200, 0.35));                     // the payoff: the party
  chime(3.0, [nz('C6'), nz('E6'), nz('G6')], 0.05, 0);
  to = 's';
  blip(q.rise + 0.02, 180, 620, 0.6, 0.03, 0);                                                                           // the sun rises
  [0, 0.25, 0.5].forEach((d, i) => pop(q.roll + d, 300 + i * 70, 0.04, -0.6 + i * 0.25));                                // Kaset tumbles in
  pop(q.tri, 520, 0.05, 0); noiseHit(q.tri, 0.1, 'bandpass', 2400, 1.2, 0.03, 0, 0.3);                                   // the chrome triangle springs up
  thud(q.land, 0.1, -0.3);
  sweep(q.shine1, q.shine1 + 0.5, 0.014, 2500, 9000, 0); spark(q.shine1 + 0.5, 0.045, 0);                                 // the shine and its sparkle
  blip(q.jump, 420, 980, 0.2, 0.04, -0.3); spark(q.jump + 0.05, 0.04, 0.3); thud(q.jump + 0.42, 0.07, -0.3);              // the jump
  riser(2.4, 3.0, 0.028);                                                                                                 // into the morph
  sub(3.0, 0.12); noiseHit(3.0, 0.2, 'bandpass', 900, 3, 0.05, 0, 0.15, 3400);                                            // the record starts
  for (let i = 0; i < 7; i++) pop(q.pop + i * E16, 560 + i * 90, 0.04, -0.5 + i * 0.16);                                   // confetti
  thud(q.title, 0.12, 0); noiseHit(q.title, 0.12, 'highpass', 3000, 0.7, 0.04, 0, 0.3);                                   // the lettering slams in
  spark(4.25, 0.04, 0.3);
  sweep(q.shine2, q.shine2 + 0.45, 0.016, 2500, 9500, 0); spark(q.shine2 + 0.45, 0.045, 0.4);
  blip(q.script, 900, 1500, 0.28, 0.03, 0.4);                                                                             // the brush word is written
  spark(5.25, 0.035, -0.3);
  blip(q.hop, 420, 980, 0.2, 0.04, -0.4); thud(q.hop + 0.4, 0.08, -0.4);                                                  // the last hop
