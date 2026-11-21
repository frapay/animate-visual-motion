// =====================================================================
//  SCENES — packshot demo. World coordinates 1080x1920; time TT on 1s. One product per frame, on a podium, in the
//  sun; props in the scene's own colour family round it. Content inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: at the bridge they stand still on their podiums
const BOT = { x: 500, y: 1130, s: 1 }, JAR = { x: 520, y: 1110, s: 1.22 };
const BOT_C = PK.scene.sky.deep, JAR_C = PK.scene.peach.deep;

// ---- era 1: the serum. A sky-blue set builds itself, then the bottle drops in.
function sceneSerum() {
  pkStage('sky', { horizon: 1090 });
  pkGobo('palm', { x: 1110, y: 300, a: 0.36 });
  const S = PK_S, rise = pkSpring(cu.rise), drop = pkDrop(cu.drop, 640), hd = pkDrop(cu.hero, 380);
  let bot;
  pkLit(() => {
    pkArch(712 + 560 * (1 - pkSpring(cu.arch)), 1150, 300, 640);
    pkDisc(228 - 460 * (1 - pkSpring(cu.disc)), 1162, 172, { half: true });
    pkSphere(170, 842 + Math.sin(TT * 1.7) * 13, 52, { color: PK.cream, wall: true });               // a floating ball, bobbing
    const pod = pkPodium(BOT.x, 1260, 440, 130 * rise);
    bot = pkProduct('bottle', BOT.x, pod.y, BOT.s, { color: BOT_C, on: pod, floor: 1260, dy: drop.dy, a: drop.a, glint: seg(TT, cu.glint, cu.glint + 0.8), label: { mark: 'sun', text: '50 ml' } });
    const p2 = pkPodium(820, 1338, 190, 62 * pkSpring(cu.rise + 0.2), { color: S.prop2 });
    pkHero(820, p2.y - 58, 60, { on: p2, floor: 1338, dy: hd.dy, a: hd.a });
    pkSphere(238 - 420 * (1 - pkSpring(cu.ball)), 1352 - 42, 42, { floor: 1352 });
  });
  pkMotes({ key: 'serum', n: 26 });
  pkBadge('NEW', 262, 668, { at: cu.badge, rot: -0.12, solid: true });
  pkCallout(bot.x + 60, 836, 652, 786, 'Vitamin C', { at: cu.call, sub: 'brightening' });
  pkHeadline('New in', 'Glow serum', { at: 0.9 });                                                  // after the bottle has passed
  pkCaption('Sunlight in a *bottle*', { at: 1.25 });
}

// ---- era 2: the cream. What the bottle turned into, on a peach set, with its price.
function sceneCream() {
  pkStage('peach', { horizon: 1090 });
  pkGobo('blinds', { x: 640, y: 600, w: 400, h: 470, a: 0.3 });
  const S = PK_S, hd = pkDrop(cu.hero2, 380);
  let jar;
  pkLit(() => {
    pkArch(268 - 560 * (1 - pkSpring(cu.arch2)), 1150, 320, 520, { open: 0.6 });
    pkSteps(858 + 420 * (1 - pkSpring(cu.steps)), 1196, 204, 262, 3);
    pkSphere(268, 800 + Math.sin(TT * 1.7 + 1) * 13, 46, { color: PK.cream, wall: true });
    const p1 = pkPodium(JAR.x, 1296, 610, 70), p2 = pkPodium(JAR.x, p1.y, 470, 116, { color: S.prop2, on: p1, floor: 1296 });
    jar = pkProduct('jar', JAR.x, p2.y, JAR.s, { color: JAR_C, on: p2, floor: 1296, glint: seg(TT, cu.glint2, cu.glint2 + 0.8), label: { mark: 'leaf' } });
    const p3 = pkPodium(196, 1352, 196, 44 * pkSpring(cu.arch2 + 0.1));
    pkHero(196, p3.y - 58, 60, { on: p3, floor: 1352, dy: hd.dy, a: hd.a, key: 'hero2' });
    pkSphere(842 + 420 * (1 - pkSpring(cu.ball2)), 1364 - 38, 38, { floor: 1364, color: S.prop2 });
  });
  pkMotes({ key: 'cream', n: 26 });
  pkBadge('50 ml', 262, 990, { at: cu.badge2, rot: -0.1 });
  pkCallout(jar.x + 92, jar.top + 34, 664, 762, 'Shea + oat', { at: cu.call2, sub: '48 h moisture', run: 26, size: 38 });
  pkPrice('$24', 'Shop now', CX, 556, { at: cu.price });
  pkHeadline('Rich repair', 'Cloud cream', { at: 0.6 });
  pkCaption('Soft skin, *all day*', { at: 0.75 });
}
