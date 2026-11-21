  // SCORE BODY — splash demo (inside buildScore(); see kit/score-head.js). A punchy summer drink spot: a splash and a
  // sub on the eruption, fizz, a bright major riff in D that steps up to E for the second flavour, pops and a chime
  // for the badges, ice clinks, a rising sweep into the morph.
  const T = TIMELINE, q = T.cues, RS = RNG('splash-score');
  to = 'm';
  for (let i = 0; i < 12; i++) {
    const e2 = i >= 6;
    bass(i * BEAT, nz(e2 ? (i % 4 < 2 ? 'E2' : 'B2') : (i % 4 < 2 ? 'D2' : 'A2')), 0.1);
    noiseHit(i * BEAT + E8, 0.03, 'highpass', 7000, 1, 0.022, i % 2 ? 0.3 : -0.3);                                          // an off-beat hat
  }
  pad(0.1, 3.0, ['D3', 'Fs3', 'A3', 'E4'], 0.045, { type: 'triangle', cut: 1800, att: 0.05, rel: 0.3, send: 0.4 });
  pad(3.0, 6.05, ['E3', 'Gs3', 'B3', 'Fs4'], 0.05, { type: 'triangle', cut: 2000, att: 0.05, rel: 0.5, send: 0.4 });
  const riff1 = ['D5', 'Fs5', 'A5', 'Fs5', 'E5', 'A5', 'D6', 'A5'], riff2 = ['E5', 'Gs5', 'B5', 'Gs5', 'Fs5', 'B5', 'E6', 'B5'];
  for (let i = 0; i < 11; i++) pluck(0.25 + i * E8, nz(riff1[i % 8]), 0.04, i % 2 ? 0.3 : -0.3, 0.26, 3200, 0.3);
  for (let i = 0; i < 11; i++) pluck(3.25 + i * E8, nz(riff2[i % 8]), 0.042, i % 2 ? 0.3 : -0.3, 0.26, 3400, 0.3);
  ['D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => pluck(q.splash1 + i * 0.02, nz(n), 0.08, -0.3 + i * 0.2, 0.8, 3000, 0.4));   // the hit
  ['E4', 'Gs4', 'B4', 'E5'].forEach((n, i) => pluck(q.splash2 + i * 0.02, nz(n), 0.085, -0.3 + i * 0.2, 0.9, 3200, 0.4));
  to = 's';
  for (const [t, f] of [[q.splash1, 2200], [q.splash2, 2600]]) {
    sub(t, 0.32);                                                                                                           // the eruption
    noiseHit(t, 0.5, 'bandpass', f, 0.7, 0.1, 0, 0.3, 500);                                                                 // the splash
    sweep(t + 0.05, t + 1.6, 0.014, 6000, 9500, 0.1);                                                                       // fizz that settles
    for (let i = 0; i < 7; i++) blip(t + 0.3 + RS.r(0, 2.0), RS.r(1400, 2600), RS.r(2800, 4200), 0.04, 0.012, RS.n(0.6));   // bubbles popping
  }
  blip(q.pop, 260, 880, 0.14, 0.05, 0);                                                                                     // the can pops up
  blip(q.badge1, 700, 1400, 0.07, 0.05, 0.4); chime(q.badge1 + 0.03, [nz('A5'), nz('D6')], 0.03, 0.4);                      // NEW
  blip(q.glint1 + 0.25, 2600, 4200, 0.25, 0.012, 0.2);                                                                      // a glint
  sweep(2.5, 3.0, 0.03, 500, 3000, 0); sub(q.morph, 0.22);                                                                  // the scene closes onto the can
  for (const [dt, f] of [[0.18, 3100], [0.27, 3700], [0.5, 2800]]) chime(q.splash2 + dt, [f, f * 1.51], 0.018, RS.n(0.5));  // ice
  blip(q.badge2, 800, 1600, 0.07, 0.05, 0.4); chime(q.badge2 + 0.03, [nz('B5'), nz('E6')], 0.03, 0.4);                      // 0 SUGAR
  blip(q.glint2 + 0.25, 2800, 4400, 0.25, 0.012, -0.2);
