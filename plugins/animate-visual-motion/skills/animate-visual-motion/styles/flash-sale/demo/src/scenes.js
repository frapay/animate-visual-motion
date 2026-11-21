// =====================================================================
//  SCENES — flash-sale demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1500
//  (rays, confetti and the tag's string run off the frame on purpose). Cue times are moments of IMPACT.
//  All words, prices and the currency live here: the kit writes none of them.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing may sit in front of them at the bridge, or it shows in the morph window
const HERO = { x: 186, y: 742, r: 132 };
const CARD = { x: 130, y: 400, w: 720, h: 740 };
const BTN = { x: 500, y: 1264, w: 640, h: 128 };
const rp = (n) => 'Rp ' + fsFmt(n);                            // the piece's own currency format

// ---- era 1: the teaser. Red to orange; the lockup is the biggest thing.
function sceneTeaser() {
  fsGround({ preset: 'hot', cx: 520, cy: 700, speed: 0.3 });
  fsConfetti({ key: 'a', n: 22, coins: 7 });
  fsSparkles(8, { key: 'a' });
  fsLockup(500, 566, 210, { at1: cu.flash, at2: cu.sale, maxW: 790, size2: 226, dx2: 116, maxW2: 590, bolt: false, preset: 'hot' });
  // the -70% starburst counts up as it lands
  const pct = Math.round(fsCount(cu.badge, cu.count, 0, 70));
  fsBurst(246, 1022, 142, '-' + pct + '%', { at: cu.badge, sub: 'DISKON' });
  // the voucher ticket slams in from the right
  const [vx] = fsSlam(cu.coupon, 'r');
  fsCoupon(432 + vx, 922, 480, 196, FS.white, { rot: 0.045, unit: 'VOUCHER', value: '50RB', title: 'EXTRA HEMAT', sub: 'Min. belanja Rp 300RB', code: 'KILAT50', sweep: cu.tick2 });
  // the countdown: ticks once a second
  if (TT >= cu.timer - 0.1) fsText('BERAKHIR DALAM', 500, 1220, 40, FS.white, { align: 'center', stroke: 0, depth: 4, ext: FS_PRESETS.hot.deep, s: fsPop(cu.timer, { over: 0.1 }) });
  fsTimer(500, 1308, 2 * 3600 + 14 * 60 + 59, { size: 118, at: cu.timer });
  // the mascot pops beside SALE; it goes wide-eyed at the badge, then holds still for the bridge
  const wow = TT >= cu.badge && TT < cu.count + 0.25;
  fsHero(HERO.x, HERO.y, HERO.r, { at: cu.zap, mood: wow ? 'wow' : 'happy', look: wow ? 0.4 : 0, bob: 1 - seg(TT, 2.1, 2.3) });
  fsKicker('MEGA SALE 12.12', { at: 0.25 });
  fsCaption('Cuma *hari ini*!', { at: cu.cap1 });
}

// ---- era 2: the deal. Magenta to violet; the card is the biggest thing, the price its loudest part.
function sceneProduct() {
  const taps = [cu.tap1, cu.tap2], press = fsPress(taps), hit = taps.filter((t) => TT >= t).pop();
  fsGround({ preset: 'berry', cx: 490, cy: 760, speed: -0.3 });
  fsConfetti({ key: 'b', n: 20, coins: 8 });
  fsSparkles(8, { key: 'b' });
  fsShip(626, 316, 'GRATIS ONGKIR', { at: cu.ship, size: 36 });
  // the card (the bridge's counterpart): the price runs down from the old one and lands on the beat
  const price = Math.round(fsCount(cu.price, cu.land, 499000, 149000) / 1000) * 1000, landed = TT >= cu.land;
  const sold = Math.round(lerp(12, 87, EZ.o3(seg(TT, cu.stock, cu.stock + 0.6))));
  fsPopper(CARD.x + CARD.w / 2, CARD.y + 420, cu.land, { key: 'land', v: 1500, n: 34 });   // thrown from behind the card
  fsCard(CARD.x, CARD.y, CARD.w, CARD.h, {
    product: 'sneaker', pc: FS.red, pc2: FS.gold, px: -24, pr: 0.6, title: 'Sneaker Kilat X1', rating: 4.9, ratingText: '4.9  |  2,1rb terjual',
    old: rp(499000), now: rp(price), strike: seg(TT, cu.price, cu.price + 0.17), nowS: landed ? fsPop(cu.land, { over: 0.14 }) : 1,
    chip: 'Hemat 350rb', chipS: fsPop(cu.land + 0.125),
    stock: { frac: sold / 100, label: 'TERJUAL ' + sold + '%' }, sweep: cu.land,
  });
  // the tag drops in on its string and swings
  const [, ty] = fsSlam(cu.tag, 't', { dist: 700, over: 0 });
  fsTag(236, -40 + ty, 310, 196, 168, FS.gold, { ang: fsSwing(cu.tag, { amp: 0.36 }), lines: ['HARGA', 'KILAT'] });
  fsBurst(826, 478, 106, '-70%', { at: cu.badge2, sub: 'DISKON' });
  // the call to action slams up, pulses on the beat and is tapped twice
  const [, by] = fsSlam(cu.cta, 'b');
  fsButton(BTN.x, BTN.y + by, BTN.w, BTN.h, 'BELI SEKARANG', FS.orange, { pulse: TT > cu.cta + 0.2 ? fsPulse(0.5, 0.05) : 1, press, size: 54, sweep: cu.tap1 + 0.1 });
  fsHero(112, 1262, 58, { at: cu.cta + 0.125, rot: -0.14, key: 'perch', mood: hit != null && TT - hit < 0.3 ? 'wow' : 'happy', look: 0.6 });
  if (hit != null) fsRipple(790, 1300, 96, hit);
  const cin = seg(TT, cu.tap1 - 0.34, cu.tap1 - 0.04);
  if (cin > 0) fsHand(lerp(1040, 790, EZ.o3(cin)), lerp(1660, 1304, EZ.o3(cin)) + press * 8, 78, { press });
  fsCaption('Stok *hampir habis*!', { at: 1.75, y: 1440 });
}
