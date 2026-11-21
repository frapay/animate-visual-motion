  // SCORE BODY — flash-sale demo (inside buildScore(); see kit/score-head.js). Bright and pushy: a four-on-the-floor
  // kick, claps on the off beats, 16th hats, a bouncing bass riff (A minor, then C major for the card), a stab hook.
  // Every picture impact has a sound on the same frame: a thud per slam, a pop per badge, a tick per second of the
  // countdown, a falling run while the price drops, a cash-register chime when it lands, a click per tap.
  const T = TIMELINE, q = T.cues;
  const kick = (t, vel = 0.34) => { sub(t, vel); noiseHit(t, 0.016, 'lowpass', 1200, 1, vel * 0.3); };
  const clap = (t, vel = 0.085) => { for (const d of [0, 0.012, 0.025]) noiseHit(t + d, 0.06, 'bandpass', 1900, 1.3, vel, 0.1, 0.14); };
  const hat = (t, vel, pan = 0) => noiseHit(t, 0.02, 'highpass', 8600, 1, vel, pan);
  const thud = (t, vel = 0.2, pan = 0) => { blip(t, 180, 55, 0.1, vel, pan); noiseHit(t, 0.06, 'lowpass', 560, 1, vel * 0.7, pan); };          // a block lands
  const pop = (t, vel = 0.1, pan = 0) => { blip(t, 420, 980, 0.05, vel, pan); noiseHit(t, 0.025, 'bandpass', 3200, 2, vel * 0.6, pan, 0.08); };   // a badge pops
  const tick = (t, vel = 0.07) => { blip(t, 2400, 1900, 0.014, vel, 0.2); noiseHit(t, 0.008, 'highpass', 6500, 1, vel * 0.6, 0.2); };            // a flip card
  const tap = (t, vel = 0.14) => { blip(t, 1300, 520, 0.03, vel); noiseHit(t, 0.012, 'highpass', 4800, 1, vel * 0.7); blip(t + 0.11, 760, 1180, 0.022, vel * 0.5); };
  const stab = (t, notes, vel = 0.05) => notes.forEach((n, i) => pluck(t, nz(n), vel, -0.3 + i * 0.3, 0.16, 4600, 0.2));
  to = 'm';
  for (let i = 0; i < 12; i++) { const t = i * BEAT; kick(t, t < 3 ? 0.26 : 0.4); if (i % 2) clap(t, t < 3 ? 0.06 : 0.1); }
  for (let i = 0; i < 48; i++) { const t = i * E16; if (t >= 2.5 && t < 3) continue; hat(t, i % 4 === 2 ? 0.032 : i % 2 ? 0.01 : 0.016, i % 2 ? 0.35 : -0.35); }
  const rA = ['A2', 'A2', 'C3', 'A2', 'D3', 'A2', 'E3', 'C3'], rB = ['C3', 'C3', 'E3', 'C3', 'F3', 'C3', 'G3', 'E3'];
  for (let i = 0; i < 24; i++) { const t = i * E8, n = (t < 3 ? rA : rB)[i % 8]; if (t >= 2.5 && t < 3) continue; bass(t, nz(n), t < 3 ? 0.13 : 0.18); pluck(t, nz(n) * 2, 0.035, 0, 0.11, 1600, 0.05); }
  for (let i = 0; i < 6; i++) { const t = i * BEAT * 2 + E8; if (t >= 2.5 && t < 3) continue; stab(t, t < 3 ? ['A4', 'C5', 'E5'] : ['C5', 'E5', 'G5'], 0.045); stab(t + BEAT, t < 3 ? ['G4', 'C5', 'E5'] : ['C5', 'F5', 'A5'], 0.04); }
  const lead = ['E5', 'G5', 'C6', 'G5', 'A5', 'G5', 'E5', 'C5'];
  for (let i = 14; i < 24; i++) pluck(i * E8, nz(lead[i % 8]), 0.05, i % 2 ? 0.3 : -0.3, 0.14, 5400, 0.25);   // the deal's hook
  riser(2.5, 3.0, 0.04);
  stab(3.0, ['C4', 'G4', 'C5', 'E5'], 0.1);                                               // the card
  to = 's';
  thud(q.flash, 0.14, -0.3); thud(q.sale, 0.14, 0.3); pop(q.zap, 0.1, -0.4); pop(q.timer, 0.07, 0); pop(q.badge, 0.12, -0.3); thud(q.coupon, 0.14, 0.4);
  for (let i = 0; i < 6; i++) blip(q.badge + i * 0.083, 500 + i * 120, 540 + i * 120, 0.03, 0.03, -0.3);   // the discount counts up
  for (const t of [1, 2]) tick(t);                                                         // the countdown's seconds (the bridge covers 3.0)
  thud(q.cap1, 0.08, 0);
  for (let i = 0; i < 6; i++) noiseHit(2.5 + i * 0.07, 0.03, 'bandpass', 900 + i * 420, 3, 0.03 + i * 0.008, 0);   // the frame closes onto the bolt
  thud(3.0 + 1 / 6, 0.2, 0);                                                               // the card opens
  blip(q.tag, 900, 300, 0.12, 0.07, -0.4); pop(q.badge2, 0.11, 0.4); pop(q.ship, 0.08, 0.2); thud(q.cta, 0.24, 0);
  for (let i = 0; i < 9; i++) blip(q.price + i * 0.083, 1500 - i * 110, 1440 - i * 110, 0.03, 0.035, 0.1);   // the price runs down
  chime(q.land, [nz('C6'), nz('E6'), nz('G6')], 0.1, 0); noiseHit(q.land, 0.05, 'highpass', 7000, 1, 0.09, 0, 0.3); thud(q.land, 0.2, 0);   // ka-ching
  for (const t of [q.tap1, q.tap2]) tap(t);
  chime(q.tap2, [nz('G5'), nz('C6'), nz('E6')], 0.07, 0);
