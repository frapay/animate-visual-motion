// =====================================================================
//  SCENES — liquid demo. World units = px at zoom 1; time TT on 1s. Content inside x 60-940, y 250-1500.
//  Era 1 on the light ground, era 2 on the deep ground.
// =====================================================================
const cu = TIMELINE.cues;
const IDE = { x: 560, y: 690, r: 185 };
const HEART = { x: 500, y: 640, r: 200 };
const PUD = { x: 290, y: 1196 };
const HERO_R = 92;

// ---- era 1: ideas flow
const ideOpt = () => { const q = lqLand(cu.land, 0.07, 15, 5) + lqLand(cu.join + 0.3, 0.08, 16, 6); return { key: 'ide', amp: 0.075, speed: 1.2, sx: 1 + q, sy: 1 / (1 + q) }; };
const idePts = () => lqBlobPts(IDE.x, IDE.y, IDE.r, ideOpt());
function sceneIde() {
  lqGround(LQ.paper, LQ.paperB);
  lqDrift('bg1', 4, [LQ.g.peach, LQ.g.lilac, LQ.g.mint], { r: [170, 300], box: [60, 200, 1000, 1700] });
  lqBubbles('b1', 14, { c: LQ.g.berry[1], al: 0.55, r: [9, 24] });
  // a lime pair in the corner that keeps merging and splitting
  const lg = 62 + 58 * Math.sin(TT * 2.1);
  lqGoo([{ x: 800 - lg, y: 420 + Math.sin(TT * 1.3) * 14, r: 50, key: 'l1', amp: 0.08 }, { x: 800 + lg * 0.55, y: 436 - Math.sin(TT * 1.3) * 14, r: 32, key: 'l2', amp: 0.08 }], LQ.g.lime, { v: 0.55 });
  // the blob of ideas: two droplets pull out of it, hang on a neck, snap off, then flow back in
  const back = 1 - EZ.io(seg(TT, cu.join, cu.join + 0.4));
  const o1 = EZ.io(seg(TT, cu.split1, cu.split1 + 0.6)) * back, o2 = EZ.io(seg(TT, cu.split2, cu.split2 + 0.5)) * back;
  const s1 = { x: IDE.x + (150 + 190 * o1) * Math.cos(0.62), y: IDE.y + (150 + 190 * o1) * Math.sin(0.62) + Math.sin(TT * 3) * 8 * o1, r: 26 + 40 * Math.min(1, o1 * 2.5), key: 's1', amp: 0.09 };
  const s2 = { x: IDE.x + (140 + 170 * o2) * Math.cos(3.75), y: IDE.y + (140 + 170 * o2) * Math.sin(3.75) + Math.cos(TT * 3) * 8 * o2, r: 22 + 30 * Math.min(1, o2 * 2.5), key: 's2', amp: 0.09 };
  lqGoo([{ x: IDE.x, y: IDE.y, r: IDE.r, P: idePts() }, s1, s2], LQ.g.coral, { v: 0.5, reach: 2.6 });
  // the puddle and the hero: Tetes falls, lands with a squash, splashes
  const hit = TT - cu.land, pw = 150 + 70 * lqPop(cu.land, 200, 13);
  lqFill(lqBlobPts(PUD.x, PUD.y, pw, { key: 'pud', amp: 0.05, sy: 0.19, speed: 1.4 }), LQ.g.sky, { gloss: 0.6, shadow: 8 });
  const fu = seg(TT, cu.fall, cu.land), foot = PUD.y - 10;
  if (TT >= cu.fall) {
    const y = lerp(-220, foot - HERO_R, EZ.i2(fu)), falling = fu < 1;
    lqHero(PUD.x, y, HERO_R, { key: 'tetes', bob: falling ? 0 : undefined, squash: falling ? -0.12 : lqLand(cu.land, 0.42), tip: falling ? 0.95 : 0.55 + lqLand(cu.land, -0.3, 14, 5), look: falling ? 0 : 0.7, lookY: falling ? 1 : -0.6, mood: hit > 0 && hit < 0.7 ? 'wow' : 'smile' });
  }
  lqSplash(PUD.x, foot + 4, hit, LQ.g.sky, { key: 'land', n: 12, power: 1.25, spread: 105, r: 18 });
  // the opening: a wave band sweeps up and away
  if (TT < 0.6) lqWipe(lerp(0.76, 1, EZ.io(TT / 0.6)), LQ.g.berry, { key: 'open' });
  lqTag('01', 'IDE', { c: LQ.g.coral });
  lqCaption('Biarkan ide\n*mengalir bebas*', { at: 0.9 });
}

// ---- era 2: the work is loved
const heartPts = () => { const q = TT < 3.6 ? 0 : 0.06 * Math.exp(-mod(TT - 3, BEAT) * 7); return lqHeartPts(HEART.x, HEART.y + Math.sin(TT * 1.6) * 8 * seg(TT, 3.6, 4.2), HEART.r * (1 + q)); };
const SEA = { back: { key: 'w1', amp: 34, len: 700, speed: 0.6 }, mid: { key: 'w2', amp: 38, len: 560, speed: 0.9 }, front: { key: 'w3', amp: 42, len: 640, speed: 1.2 } };
function sceneKarya() {
  lqGround(LQ.deep, LQ.deepB);
  lqDrift('bg2', 4, [LQ.g.dusk], { r: [190, 320], box: [60, 200, 1000, 1200] });
  lqBubbles('b2a', 16, { c: '#ffffff', al: 0.5, r: [8, 22], box: [40, 1150, 1040, 180] });
  const rise = (1 - springEase(TT - cu.waves, 70, 15)) * 620;   // the sea sweeps up as the era opens
  const yB = 1090 + rise, yM = 1170 + rise * 1.15, yF = 1262 + rise * 1.3;
  lqWave(yB, LQ.g.dusk2, SEA.back);
  // the heart, and the drops that hang from it, stretch, let go and fall into the sea
  const HP = heartPts(), tipY = HEART.y + HEART.r * 0.86, drops = [];
  for (const [i, t0] of [cu.drip1, cu.drip2].entries()) {
    const t = TT - t0, dx = HEART.x + (i ? -6 : 6), seaY = lqWaveY(dx, yM, SEA.mid) + 14; if (t < 0) continue;
    const hang = EZ.io(seg(t, 0, 0.4)), fall = Math.max(0, t - 0.4), y = tipY - 30 + hang * 78 + 0.5 * 2600 * fall * fall;
    if (y < seaY) drops.push({ x: dx, y, r: 10 + 22 * hang, key: 'dr' + i, amp: 0.05, sy: 1 + Math.min(0.5, fall * 2.2), sx: 1 / Math.sqrt(1 + Math.min(0.5, fall * 2.2)) });
  }
  lqGoo([{ P: HP, x: HEART.x, y: tipY - 62, r: 56, spot: [HEART.x, HEART.y - 6, HEART.r * 0.98, HEART.r * 0.86] }, ...drops], LQ.g.heart, { v: 0.6, reach: 2.4 });
  lqWave(yM, LQ.g.violet, SEA.mid);
  for (const [i, t0] of [cu.drip1, cu.drip2].entries()) {   // each drop's splash, where it met the sea
    const dx = HEART.x + (i ? -6 : 6), seaY0 = 1170 + 14, fallT = Math.sqrt(2 * (seaY0 - (tipY + 48)) / 2600);
    lqSplash(dx, lqWaveY(dx, yM, SEA.mid) + 14, TT - t0 - 0.4 - fallT, LQ.g.heart, { key: 'drip' + i, n: 7, power: 0.7, r: 11 });
  }
  // Tetes pops out of the water and rides the front wave
  const hx = 250, wy = lqWaveY(hx, yF, SEA.front), up = lqPop(cu.pop, 150, 11);
  if (TT >= cu.pop) lqHero(hx, lerp(wy + 300, wy - 78, up), 104, { key: 'tetes', bob: 0, squash: lqLand(cu.pop + 0.28, -0.2, 14, 5), lean: Math.sin(TT * 2.3) * 0.12, look: 0.75, lookY: -0.9, mood: TT < cu.pop + 0.8 || (TT > cu.drip2 + 0.6 && TT < cu.drip2 + 1.2) ? 'wow' : 'smile' });
  lqWave(yF, LQ.g.lime, SEA.front);
  lqSplash(hx, wy + 6, TT - cu.pop - 0.05, LQ.g.lime, { key: 'pop', n: 12, power: 1.15, spread: 120, r: 17 });
  lqBubbles('b2b', 9, { c: '#ffffff', al: 0.6, r: [7, 16], box: [40, 1900, 1040, 1300] });
  lqTag('02', 'KARYA', { c: LQ.g.heart });
  lqCaption('jadi karya\nyang *disukai*', { at: 0.95 });
}
