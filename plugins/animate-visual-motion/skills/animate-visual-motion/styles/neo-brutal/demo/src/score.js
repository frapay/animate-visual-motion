  // SCORE BODY — neo-brutal demo (inside buildScore(); see kit/score-head.js). Punchy and percussive: a
  // four-on-the-floor kick, claps on the off beats, 8th hats, a fat square-ish bass riff (E minor, then G major for
  // the card). Every picture impact has a sound on the same frame: a thud per slam, a slap per sticker, a switch
  // click, a two-part button click per press.
  const T = TIMELINE, q = T.cues;
  const kick = (t, vel = 0.34) => { sub(t, vel); noiseHit(t, 0.016, 'lowpass', 1200, 1, vel * 0.3); };
  const clap = (t, vel = 0.085) => { for (const d of [0, 0.012, 0.025]) noiseHit(t + d, 0.06, 'bandpass', 1900, 1.3, vel, 0.1, 0.14); };
  const hat = (t, vel, pan = 0) => noiseHit(t, 0.022, 'highpass', 8200, 1, vel, pan);
  const thud = (t, vel = 0.2, pan = 0) => { blip(t, 170, 52, 0.1, vel, pan); noiseHit(t, 0.06, 'lowpass', 520, 1, vel * 0.7, pan); };          // a block lands
  const slap = (t, vel = 0.1, pan = 0) => { noiseHit(t, 0.03, 'bandpass', 3000, 2.2, vel, pan, 0.08); blip(t, 820, 410, 0.035, vel * 0.5, pan); };   // a sticker goes on
  const btn = (t, vel = 0.14) => { blip(t, 1300, 520, 0.03, vel); noiseHit(t, 0.012, 'highpass', 4800, 1, vel * 0.7); blip(t + 0.125, 760, 1180, 0.022, vel * 0.55); };   // down, then up
  const stab = (t, notes, vel = 0.05) => notes.forEach((n, i) => pluck(t, nz(n), vel, -0.3 + i * 0.3, 0.16, 4200, 0.2));
  to = 'm';
  for (let i = 0; i < 12; i++) { const t = i * BEAT; kick(t, t < 3 ? 0.24 : i === 10 ? 0.5 : 0.4); if (i % 2) clap(t, t < 3 ? 0.055 : 0.1); }
  for (let i = 0; i < 24; i++) { const t = i * E8; if (t >= 2.5 && t < 3) continue; hat(t, i % 2 ? 0.03 : 0.014, i % 2 ? 0.35 : -0.35); if (t >= 3.5) hat(t + E16, 0.012, 0); }
  const rA = ['E2', 'E2', 'G2', 'E2', 'A2', 'E2', 'B2', 'G2'], rB = ['G2', 'G2', 'B2', 'G2', 'C3', 'G2', 'D3', 'B2'];
  for (let i = 0; i < 24; i++) { const t = i * E8, n = (t < 3 ? rA : rB)[i % 8]; if (t >= 2.5 && t < 3) continue; bass(t, nz(n), t < 3 ? 0.12 : 0.18); pluck(t, nz(n) * 2, 0.035, 0, 0.11, 1500, 0.05); }
  for (let i = 0; i < 6; i++) { const t = i * BEAT * 2 + E8; if (t >= 2.5 && t < 3) continue; stab(t, t < 3 ? ['E4', 'G4', 'B4'] : ['G4', 'B4', 'D5'], 0.045); stab(t + BEAT, t < 3 ? ['D4', 'G4', 'B4'] : ['G4', 'C5', 'E5'], 0.04); }
  const lead = ['G5', 'D5', 'B4', 'D5', 'E5', 'D5', 'B4', 'G4'];
  for (let i = 14; i < 24; i++) pluck(i * E8, nz(lead[i % 8]), 0.05, i % 2 ? 0.3 : -0.3, 0.14, 5200, 0.25);   // the card's hook
  riser(2.5, 3.0, 0.04);
  stab(3.0, ['G3', 'D4', 'G4', 'B4'], 0.1);                                             // the card
  chime(q.press2, [nz('G5'), nz('B5'), nz('D6')], 0.09, 0); stab(q.press2, ['G3', 'D4', 'G4', 'B4', 'D5'], 0.11);                              // the press that works
  to = 's';
  thud(q.its, 0.13, -0.3); thud(q.here, 0.13, 0.3); thud(q.land, 0.18, 0); thud(q.strip1, 0.09, -0.4); thud(q.strip2, 0.09, 0.4);
  slap(q.seal, 0.07, 0.4); slap(q.ver, 0.07, -0.5); slap(q.bolt, 0.08, 0.5); slap(q.bolt + 0.125, 0.06, -0.5); slap(q.wow, 0.08, 0.4);
  blip(q.wow, 520, 1040, 0.09, 0.05, 0);                                                 // the mascot goes wide-eyed
  for (let i = 0; i < 6; i++) noiseHit(2.5 + i * 0.07, 0.03, 'bandpass', 900 + i * 420, 3, 0.03 + i * 0.008, 0);   // the frame closes onto the block
  thud(3.0 + 1 / 6, 0.2, 0);                                                              // the card opens
  thud(q.strip3, 0.14, -0.4); thud(q.btn, 0.26, 0); slap(q.btn, 0.07, 0.4);
  blip(q.toggle, 1900, 2600, 0.018, 0.09, 0.3); noiseHit(q.toggle, 0.01, 'highpass', 6000, 1, 0.06, 0.3); slap(q.toggle, 0.08, -0.5);   // the toggle snaps; the seal
  slap(q.free, 0.1, 0.5);
  for (let i = 0; i < 6; i++) blip(q.free + i * 0.125, 500 + i * 110, 520 + i * 110, 0.03, 0.02, 0.2);   // the slider fills, notch by notch
  for (const t of [q.press1, q.press2, q.press3]) btn(t);
  slap(q.press2, 0.12, -0.5); thud(q.press2, 0.3, 0);                                    // the ground cuts to yellow
