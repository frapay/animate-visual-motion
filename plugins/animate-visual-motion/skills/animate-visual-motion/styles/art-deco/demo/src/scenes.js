// =====================================================================
//  SCENES — art deco demo. World coordinates 1080x1920; time TT on 1s. Everything is mirrored about x = 540; what
//  matters sits inside x 140-940, y 250-1500. Both eras share the frame, the horizon rules (y = 1240) and the dado.
//  Era 1: black-navy. Era 2: emerald.
// =====================================================================
const cu = TIMELINE.cues;
const HZN = 1240;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const MOON = { x: 540, y: 800, r: 118 };
const LAMP = { x: 540, y: 700, r: 118 };
const BIRD_R = 120;
const moonY = () => MOON.y + 36 * (1 - EZ.io(seg(TT, cu.ring, cu.fan)));
const moonPts = () => decCirclePts(MOON.x, moonY(), MOON.r);
const lampPts = () => decCirclePts(LAMP.x, LAMP.y, LAMP.r);

// the shared furniture: the frame, the horizon (one heavy rule and three hairlines, drawn from the middle out), the dado
function furniture(p, water) {
  decRules([[82, 1508], [998, 1508]], { from: 'mid', p, n: 1, side: -1 });
  decChevrons(540, 1556, 880, { s: 22, h: 18, n: 2, p, al: 0.85 });
  decScallops(96, 1586, 888, 118, { s: 37, al: 0.42, p });
  decFrame({ p: 0.3 + 0.7 * p, fans: 'top', fan: 104 });
  decRules([[74, HZN], [1006, HZN]], { from: 'mid', p, n: 3, gap: 10, side: -1 });
  if (p >= 1) decShimmer(540, HZN + 52, { w: 400, rows: 3, key: water });
}

// ---- era 1: the full moon shines
const STARS = [[150, 430, 13], [262, 392, 9], [112, 610, 10], [214, 540, 15], [330, 420, 8], [96, 780, 9], [300, 640, 9]];
function sceneMalam() {
  decGround(DEC.night);
  furniture(EZ.io(ev(-0.2, 0.95)), 'w1');
  STARS.forEach(([sx, sy, s], i) => { const k = EZ.io(ev(cu.moon + i * 0.125, 0.3)); if (k > 0) decMirror(() => decGem(sx, sy, s * k, { key: 'st' + i, c: i % 3 === 1 ? 'cream' : 'gold', rate: 3 + (i % 3) })); });
  // the moon: its rim draws on from the top, it fills from the middle, and the sunburst opens behind it like a hand fan
  const my = moonY();
  decFan(MOON.x, my, 400, { r0: 154, n: 21, span: 80 * DEG, open: EZ.io(ev(cu.fan, 0.6)), ext: ev(cu.fan + 0.1, 0.8), rim: true });
  decDisc(MOON.x, my, MOON.r, { p: EZ.io(ev(cu.ring, 0.5)), fill: ev(cu.moon, 0.45), bands: 3 });
  // the skyline: stepped towers rising tier by tier (a tier every 8th), then their windows come on
  const lit = ev(cu.lit, 0.9);
  decMirror(() => {
    decZig(198, HZN, 170, 430, { tiers: 4, rise: seg(TT, cu.rise, cu.rise + 1.0), lit, spire: 56, key: 'tw1' });
    decZig(322, HZN, 86, 232, { tiers: 3, rise: seg(TT, cu.rise + 0.25, cu.rise + 1.0), lit, spire: 30, key: 'tw2' });
  });
  // the crane sleeps with its head down, wakes when the fan opens and looks up at the moon
  const neck = lerp(-1, 1, EZ.io(ev(cu.look, 0.5))) - 0.35 * EZ.io(ev(cu.look + 0.6, 0.4));
  decBird(540, HZN - BIRD_R, BIRD_R, { key: 'bangau', neck, fan: 0.1 * Math.sin(Math.PI * ev(cu.look + 0.25, 0.5)), step: Math.sin(Math.PI * ev(cu.look + 0.5, 0.4)) });
  decTag('Malam', { at: 0.2 });
  decCaption('Purnama *bersinar*', { at: 0.5, hi: 'cream' });
}

// ---- era 2: the lantern lights up
const GEMS = [[150, 440, 12], [330, 404, 8], [104, 700, 9], [150, 900, 8], [316, 520, 7]];
function sceneCahaya() {
  decGround(DEC.emerald);
  furniture(1, 'w2');
  GEMS.forEach(([sx, sy, s], i) => decMirror(() => decGem(sx, sy, s, { key: 'gm' + i, c: i % 2 ? 'cream' : 'gold', rate: 3 + (i % 3) })));
  // the lantern's light: fine rays going out one after another, then breathing
  const breath = 1 + 0.035 * Math.sin((TT - 3) * TAU);
  decFan(LAMP.x, LAMP.y, 300 * breath, { r0: 156, n: 27, span: 130 * DEG, wedge: false, w: DEC_W.hair, ext: ev(cu.rays, 0.75), alt: 0.72, tips: true });
  decArch(540, HZN, 420, 812, { kind: 'pointed', n: 1, p: EZ.io(ev(3.1, 0.65)) });
  decLantern(LAMP.x, LAMP.y, LAMP.r, { hang: 432, lit: lerp(0.72, 1, ev(3.2, 0.5)) - 0.06 * (0.5 + 0.5 * Math.sin((TT - 3) * TAU * 2)), key: 'lampu' });
  // two small lanterns on long chains light on the beat; under them the fountains start and their water loops
  decMirror(() => {
    decLantern(232, 640, 44, { hang: 174, ribs: 1, lit: 0.12 + 0.88 * EZ.io(ev(cu.side, 0.35)), key: 'kecil' });
    decLeaves(174, HZN, 72, { n: 3, mid: -118 * DEG, span: 26 * DEG, p: ev(3.4, 0.6) });
    decLeaves(290, HZN, 54, { n: 3, mid: -70 * DEG, span: 20 * DEG, p: ev(3.5, 0.6) });
    decFountain(232, HZN, 0.72, { rise: ev(cu.jet, 0.5) });
  });
  // the crane looks up at the lantern, then opens its tail like a fan; light ripples across the tail, and it bows
  const fan = ev(cu.tail, 0.6), bow = Math.sin(Math.PI * ev(cu.bow, 0.5));
  decBird(540, HZN - BIRD_R, BIRD_R, { key: 'bangau', neck: lerp(0.75, 0.15, EZ.io(fan)) - 0.7 * bow, fan, tw: TT >= cu.ripple ? mod((TT - cu.ripple) / 0.5, 1) : null });
  decTag('Cahaya', { at: 0.55 });
  decCaption('Lentera pun *menyala*', { at: 0.7, hi: 'teal' });
}
