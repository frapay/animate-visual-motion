  // SCORE BODY — flat-lay demo (inside buildScore(); see kit/score-head.js). A bright, dry studio: soft plucks on a
  // major figure, a warm pad, and for every object a short slide across the table that ends in a soft wooden knock.
  const T = TIMELINE, q = T.cues;
  const slide = (t, d, vel, pan = 0) => noiseHit(t, d, 'bandpass', 1800, 0.9, vel, pan, 0.1, 3800);                                  // an object pushed across the table
  const knock = (t, vel, pan = 0) => { blip(t, 420, 180, 0.05, vel, pan); noiseHit(t, 0.03, 'lowpass', 900, 0.8, vel * 0.8, pan, 0.12); };   // it lands
  const place = (t, vel, pan = 0) => { slide(t, 0.2, vel * 0.7, pan); knock(t + 0.22, vel, pan); };
  const tick = (t, vel, pan = 0) => noiseHit(t, 0.02, 'highpass', 5000, 1, vel, pan, 0.08);                                           // a bean, a cube, a petal
  const scratch = (t, d, vel, pan = 0) => { for (let i = 0; i < Math.round(d / 0.06); i++) noiseHit(t + i * 0.06, 0.045, 'bandpass', 3200 + (i % 3) * 500, 2, vel, pan, 0.05); };   // a pencil writing
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'F#4'], 0.035, { type: 'triangle', cut: 1100, att: 0.2, rel: 0.4, send: 0.35 });
  pad(3.0, 6.05, ['G2', 'D3', 'B3', 'E4'], 0.045, { type: 'triangle', cut: 1500, att: 0.15, rel: 0.4, send: 0.4 });
  const mA = ['D4', 'F#4', 'A4', 'F#4', 'E4', 'A4', 'B4', 'A4'], mB = ['G4', 'B4', 'D5', 'B4', 'E5', 'D5', 'B4', 'D5'];
  for (let i = 0; i < 24; i++) { const t = i * E8; pluck(t, nz((t < 3 ? mA : mB)[i % 8]), t < 3 ? 0.07 : 0.085, i % 2 ? 0.25 : -0.2, 0.4, t < 3 ? 2400 : 3200, 0.3); }
  for (let i = 0; i < 12; i++) { const t = i * BEAT; bass(t, nz(t < 3 ? (i % 4 < 2 ? 'D2' : 'A1') : (i % 4 < 2 ? 'G2' : 'E2')) * 2, t < 3 ? 0.06 : 0.08); }
  for (let i = 0; i < 24; i++) if (i % 2) noiseHit(i * E8, 0.05, 'highpass', 7000, 0.8, 0.014, 0.3);                                   // a brushed off-beat
  ['G4', 'B4', 'D5', 'E5'].forEach((n, i) => pluck(3.0 + i * 0.03, nz(n), 0.1, -0.3 + i * 0.2, 0.7, 3400, 0.45));                  // the payoff: the tin
  sub(3.0, 0.07);
  chime(q.list + 0.8, [nz('D6'), nz('G6'), nz('B6')], 0.045, 0);
  to = 's';
  [[q.cup, -0.4], [q.box, 0.4], [q.spoon, -0.3], [q.bowl, 0], [q.tin, 0.4], [q.cloth, 0.2]].forEach(([t, p]) => place(t, 0.08, p));   // the coffee set, piece by piece
  for (let i = 0; i < 5; i++) tick(q.beans + 0.2 + i * 0.05, 0.035, -0.5);
  tick(q.sugar + 0.2, 0.04, -0.3); tick(q.sugar + 0.3, 0.04, -0.3);
  scratch(q.note, 0.6, 0.02, 0.1);
  sweep(2.5, 3.0, 0.016, 500, 2600, 0);                                                                                             // the table closes onto the cup
  [[q.tube, -0.5], [q.bottle, 0.5], [q.glasses, 0.4], [q.sprig, -0.3], [q.flower, -0.4], [q.card, 0.2]].forEach(([t, p]) => place(t, 0.075, p));
  tick(q.citrus + 0.2, 0.04, -0.5); tick(q.citrus + 0.3, 0.04, -0.4);
  [0, 0.22, 0.44].forEach((d, i) => { blip(q.list + d, 700 + i * 120, 1100 + i * 120, 0.05, 0.05, 0.2); scratch(q.list + d + 0.08, 0.3, 0.018, 0.25); });   // three dots pop, three lines are written
