  // SCORE BODY — low-poly demo (inside buildScore(); see kit/score-head.js). Dawn: a warm pad in F, a soft bass on the
  // beats and one pentatonic pluck per 8th climbing while the mountain assembles (a facet row each), a chime as the
  // sun clears the ridge, bird chirps. A sweep into the morph, then the payoff at 3.0 (chord stab + sub, the loudest
  // hit) and a calm night groove in D minor: sub on the beats, off-beat bass, an 8th-note arp, soft 16th crickets,
  // a glassy note per star and per crystal, two little blips when the fox's ear twitches.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  pad(0.0, 3.0, ['F3', 'C4', 'A4'], 0.024, { type: 'triangle', cut: 1500, att: 0.3, rel: 0.35, send: 0.5 });
  pad(3.0, 6.05, ['D3', 'A3', 'F4', 'C5'], 0.032, { type: 'triangle', cut: 1800, att: 0.12, rel: 0.3, send: 0.5 });
  for (let i = 0; i < 5; i++) bass(i * BEAT, nz('F2') * (i % 2 ? 1.5 : 1), 0.05);                     // dawn: the beat (it drops out before the morph)
  const climb = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6'];
  for (let i = 0; i < 9; i++) pluck(q.peak + 0.125 + i * E8, nz(climb[i]), 0.038, i % 2 ? 0.3 : -0.3, 0.26, 3400, 0.35);   // facets flipping in, row by row
  chime(q.sun + 0.75, [nz('F5'), nz('A5'), nz('C6')], 0.03, 0.2);                                      // the sun clears the ridge
  for (let i = 0; i < 4; i++) pluck(1.75 + i * BEAT / 2 + E16, nz(['A4', 'C5', 'F5', 'C5'][i]), 0.036, i % 2 ? -0.3 : 0.3, 0.26, 3600, 0.35);
  // the payoff: a short chord stab + a sub on the morph, then the night groove
  for (const [n, p] of [['D3', -0.3], ['A3', 0.3], ['D4', -0.15], ['F4', 0.15], ['A4', 0]]) pluck(3.0, nz(n), 0.046, p, 0.42, 4000, 0.4);
  sub(3.0, 0.1);
  for (let i = 1; i < 6; i++) sub(3.0 + i * BEAT, 0.075);
  for (let i = 0; i < 6; i++) bass(3.0 + i * BEAT + E8, nz('D2') * (i % 2 ? 1.5 : 1), 0.085);
  const arpB = ['A4', 'D5', 'F5', 'D5'];
  for (let i = 2; i < 12; i++) pluck(3.0 + i * E8, nz(arpB[i % 4]), 0.05, i % 2 ? 0.3 : -0.3, 0.28, 4200, 0.4);
  for (let i = 0; i < 12; i++) noiseHit(3.0 + i * E8 + E16, 0.03, 'highpass', 8500, 0.7, 0.02, i % 2 ? 0.3 : -0.3);   // crickets
  for (let i = 0; i < 3; i++) pluck(q.crystal + i * E16, nz(['D5', 'F5', 'A5'][i]), 0.03, -0.4 + i * 0.1, 0.3, 6000, 0.45);   // the crystals shoot up
  to = 's';
  for (let i = 0; i < 3; i++) blip(q.tree + i * E8, 420 + i * 90, 900 + i * 140, 0.07, 0.04, i === 2 ? 0.4 : -0.4);          // the pines pop up
  for (let i = 0; i < 3; i++) { blip(q.birds + 0.1 + i * 0.22, 2400, 3300, 0.035, 0.016, -0.5); blip(q.birds + 0.17 + i * 0.22, 3000, 2500, 0.03, 0.012, -0.5); }   // birds
  blip(q.cap, 900, 1700, 0.07, 0.03, -0.1);                                                              // the snow cap
  sweep(2.45, 3.0, 0.012, 500, 3000, 0);                                                                // into the morph
  noiseHit(3.0, 0.3, 'bandpass', 1400, 1.0, 0.03, 0, 0.3, 500);
  for (let i = 0; i < 8; i++) blip(q.stars + i * 0.07, 2600 + (i * 370) % 1500, 2400 + (i * 370) % 1500, 0.02, 0.014, (i % 3 - 1) * 0.5);   // stars pop in
  blip(q.look, 500, 900, 0.1, 0.035, 0.3);                                                              // the fox looks up
  blip(q.twitch, 1300, 1700, 0.03, 0.02, 0.3); blip(q.twitch + 0.25, 1300, 1700, 0.03, 0.02, 0.3);      // its ear flicks twice
