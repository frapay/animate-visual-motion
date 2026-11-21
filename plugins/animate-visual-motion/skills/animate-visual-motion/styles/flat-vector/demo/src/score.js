  // SCORE BODY — flat-vector demo (inside buildScore(); see kit/score-head.js). Bright and bouncy: a soft pad in D,
  // a bass on the beats, off-beat plucks once the bulb is lit; a short sweep into the morph, then the payoff at 3.0
  // (chord stab + sub, the loudest hit) and a fuller groove in G under the globe: sub on the beats, off-beat bass,
  // an 8th-note arp, 16th hats. Every entrance gets a pop; hops get a rising blip and a soft thud on the landing.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  pad(0.0, 3.0, ['D3', 'A3', 'Fs4'], 0.03, { type: 'triangle', cut: 1600, att: 0.3, rel: 0.35, send: 0.5 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'Fs4'], 0.024, { type: 'triangle', cut: 1900, att: 0.12, rel: 0.3, send: 0.5 });
  for (let i = 0; i < 5; i++) bass(i * BEAT, nz('D2') * (i % 2 ? 2 : 1), 0.085);             // era 1: the beat (it drops out before the morph)
  const arpA = ['A4', 'Fs4', 'D5', 'A4'];
  for (let i = 0; i < 6; i++) pluck(q.on + E8 + i * E8, nz(arpA[i % 4]), 0.05, i % 2 ? 0.3 : -0.3, 0.26, 3600, 0.35);
  chime(q.on, [nz('D5'), nz('Fs5'), nz('A5')], 0.045, 0.1);                                // the light comes on
  // the payoff: a short chord stab + a sub on the morph, then the groove
  for (const [n, p] of [['G3', -0.3], ['B3', 0.3], ['D4', -0.15], ['Fs4', 0.15], ['A4', 0]]) pluck(3.0, nz(n), 0.13, p, 0.42, 4200, 0.4);
  sub(3.0, 0.4);
  for (let i = 1; i < 6; i++) sub(3.0 + i * BEAT, 0.1);
  for (let i = 0; i < 6; i++) bass(3.0 + i * BEAT + E8, nz('G2') * (i % 2 ? 2 : 1), 0.085);
  const arpB = ['D5', 'G5', 'B5', 'G5'];
  for (let i = 2; i < 12; i++) pluck(3.0 + i * E8, nz(arpB[i % 4]), 0.05, i % 2 ? 0.3 : -0.3, 0.28, 4400, 0.4);
  for (let i = 0; i < 12; i++) noiseHit(3.0 + i * E8 + E16, 0.03, 'highpass', 8000, 0.7, 0.022, i % 2 ? 0.3 : -0.3);
  pluck(q.icons, nz('B4'), 0.09, -0.3); pluck(q.icons + E16, nz('D5'), 0.09, 0); pluck(q.icons + 2 * E16, nz('G5'), 0.09, 0.3);   // the icons pop in
  to = 's';
  blip(q.bulb, 380, 900, 0.08, 0.05); blip(q.card, 500, 1100, 0.08, 0.04, 0.3);
  blip(q.on, 320, 760, 0.14, 0.04, -0.3); noiseHit(q.on + 0.42, 0.06, 'lowpass', 500, 0.7, 0.05, -0.3);   // the hero hops, lands
  blip(q.badge, 900, 1600, 0.06, 0.03, 0.3);
  blip(q.chat, 600, 1200, 0.07, 0.035, -0.3);
  for (let i = 0; i < 4; i++) blip(q.chat + 0.18 + i / 14, 2600, 2200, 0.012, 0.02, -0.3);   // typing
  sweep(2.45, 3.0, 0.012, 500, 3000, 0);                                                    // into the morph
  noiseHit(3.0, 0.3, 'bandpass', 1400, 1.0, 0.03, 0, 0.3, 500);
  blip(q.hero2, 300, 700, 0.1, 0.05, -0.3); blip(q.notif, 500, 1100, 0.08, 0.04, 0.3);
  for (const t of [q.hop2]) { blip(t, 400, 1000, 0.12, 0.04, -0.3); noiseHit(t + 0.42, 0.06, 'lowpass', 500, 0.7, 0.05, -0.3); }
  for (let i = 0; i < 8; i++) blip(q.notif + 0.2 + i * 0.15, 3000, 2800, 0.01, 0.012, 0.3);   // the counter
