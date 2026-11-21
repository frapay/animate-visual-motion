// =====================================================================
//  SCENES — glass demo. World units = px at zoom 1; time TT on 1s.
//  Content kept inside x 60-940, y 250-1500. Cards float (glCard); bridge shapes follow them (glCardPose).
// =====================================================================
const cu = TIMELINE.cues;
const MAIN = { x: 100, y: 390, w: 800, h: 480, o: { key: 'main', depth: 0.5 } };
const RINGC = { x: 100, y: 905, w: 380, h: 310, o: { key: 'ringc', depth: 0.8, t0: cu.ringCard } };
const TOGC = { x: 520, y: 905, w: 380, h: 310, o: { key: 'togc', depth: 1.0, t0: cu.togCard } };
const RING = { x: 290, y: 1030, r: 92 };
const BADGE = { x: 340, y: 360, w: 320, h: 320, o: { key: 'badge', depth: 0.6, r: 72 } };
const SALDO = 12480000, CHART = [3, 3.6, 3.2, 4.4, 4.1, 5.3, 5.0, 6.4, 6.1, 7.6];

// ---- era 1: the wallet
function sceneWallet() {
  glAurora({ key: 'a1', cols: [GL.violet, GL.blue, GL.pink, GL.teal] });
  glBokeh('b1', 9);
  glGlints('g1', 9);
  // the balance card (there from the first frame)
  glCard(MAIN.x, MAIN.y, MAIN.w, MAIN.h, MAIN.o, () => {
    glAvatar(170, 462, 36);
    glText('Halo, Dita', 224, 474, 34, GL.white, { weight: 600 });
    glChip('+8,2%', 852, 462, { align: 'right', icon: 'arrowUp', c: GL.mint, size: 30, a: ev(cu.done - 0.1, 0.3) });
    glText('Saldo utama', 150, 556, 32, GL.inkD, { weight: 500 });
    glText(glRp(glCount(cu.count, cu.done - cu.count, 9200000, SALDO, 5000)), 146, 660, 92, GL.white, { weight: 800 });
    glSpark(150, 708, 700, 122, CHART, { frac: EZ.io(seg(TT, cu.chart, cu.done + 0.1)), c: GL.white });
  });
  // the savings ring (this is the shape that morphs)
  glCard(RINGC.x, RINGC.y, RINGC.w, RINGC.h, RINGC.o, () => {
    const f = 0.72 * EZ.o3(seg(TT, cu.ring, cu.done));
    glRing(RING.x, RING.y, RING.r, f, { c: GL.blue, c2: GL.teal });
    glText(Math.round(f * 100) + '%', RING.x, RING.y + 4, 52, GL.white, { align: 'center', base: 'middle', weight: 800 });
    glText('Target tabungan', RING.x, 1182, 30, GL.inkD, { align: 'center', weight: 600 });
  });
  // the toggles flip on the beat
  glCard(TOGC.x, TOGC.y, TOGC.w, TOGC.h, TOGC.o, () => {
    [['card', 'Tagihan', cu.tog1], ['shield', 'Proteksi', cu.tog2], ['bell', 'Notifikasi', cu.tog3]].forEach(([ic, label, t], i) => {
      const y = 975 + i * 85;
      glIcon(ic, 572, y, 19, GL.white, { w: 3.5 });
      glText(label, 610, y + 2, 31, GL.white, { base: 'middle', weight: 600 });
      glToggle(776, y - 25, 90, glFlip(t), { c: GL.mint });
    });
  });
  // Embun drops onto the balance card's top edge, watches the number, cheers when it lands
  const p = glCardPose(MAIN.x, MAIN.y, MAIN.w, MAIN.h, MAIN.o), r = 70, [hx, sitY] = p.map(790, MAIN.y - r + 8);
  const fall = EZ.i2(seg(TT, 0.18, cu.land)), hop = Math.sin(seg(TT, cu.done, cu.done + 0.4) * Math.PI) * 70;
  const lt = TT - cu.land, ht = TT - cu.done - 0.4;
  const sq = (lt > 0 ? -0.24 * Math.exp(-lt * 9) * Math.cos(lt * 22) : 0) + (ht > 0 ? -0.16 * Math.exp(-ht * 10) * Math.cos(ht * 22) : 0);
  glHero(hx, lerp(sitY - 330, sitY, fall) - hop, r, { look: -0.8, lookY: TT < cu.done ? 0.9 : 0.4, mood: TT > cu.done && TT < cu.done + 1.0 ? 'wow' : 'smile', squash: sq, bob: 0 });
  glTag('01', 'DOMPET', { c: GL.teal });
  glCaption('Semua keuangan\ndalam *satu aplikasi*', { hi: GL.sun });
}

// ---- era 2: the dashboard, success
function sceneDash() {
  glAurora({ key: 'a2', cols: [GL.teal, GL.blue, GL.violet, GL.mint, GL.blue, GL.pink], mid: '#0f2350' });
  glBokeh('b2', 10, { cols: [GL.white, GL.mint, GL.teal, GL.blue] });
  glGlints('g2', 10);
  // the success badge card: the morph lands here
  glCard(BADGE.x, BADGE.y, BADGE.w, BADGE.h, BADGE.o, () => {
    const pop = springMove(3.05, 0.6, 1, SPRING.playful);
    glBadge(500, 488, 82 * pop, { frac: EZ.o2(seg(TT, cu.check, cu.check + 0.3)) });
    glText('Berhasil', 500, 634, 42, GL.white, { align: 'center', weight: 700, a: ev(cu.check + 0.1, 0.3) });
  });
  // two floating pills
  glCard(84, 438, 210, 76, { key: 'chipA', depth: 1.3, t0: cu.chipA, r: 38, rise: 50 }, () => { glIcon('bolt', 128, 476, 17, GL.sun); glText('Cepat', 158, 478, 32, GL.white, { base: 'middle', weight: 700 }); });
  glCard(100, 548, 194, 76, { key: 'chipB', depth: 1.1, t0: cu.chipB, r: 38, rise: 50 }, () => { glIcon('shield', 144, 586, 18, GL.white, { w: 3.5 }); glText('Aman', 176, 588, 32, GL.white, { base: 'middle', weight: 700 }); });
  // the transfer row
  glCard(100, 720, 800, 140, { key: 'row', depth: 0.7, t0: cu.row }, () => {
    glAvatar(176, 790, 40, { c1: GL.teal, c2: GL.blue });
    glText('Transfer ke Rani', 238, 784, 34, GL.white, { weight: 600 });
    glText('Baru saja', 238, 826, 28, GL.inkD, { weight: 500 });
    glText(glRp(250000), 864, 802, 36, GL.white, { align: 'right', weight: 800 });
  });
  // weekly bars
  glCard(100, 900, 380, 310, { key: 'bars', depth: 0.9, t0: cu.bars }, () => {
    glText('Minggu ini', 136, 962, 30, GL.inkD, { weight: 600 });
    glBars(136, 990, 308, 180, [3, 5, 4, 6, 5, 8, 6.5], { t0: cu.bars + 0.15, hi: 5, stagger: 0.07 });
  });
  // the ring comes back and reaches 100%
  glCard(520, 900, 380, 310, { key: 'ring2', depth: 1.0, t0: cu.ring2 }, () => {
    const f = lerp(0.72, 1, EZ.io(seg(TT, cu.fill, cu.full))), full = TT >= cu.full;
    glRing(710, 1026, 84, f, { c: full ? GL.mint : GL.blue, c2: GL.teal });
    glText(Math.round(f * 100) + '%', 710, 1030, 46, GL.white, { align: 'center', base: 'middle', weight: 800 });
    glText(full ? 'Target tercapai' : 'Target tabungan', 710, 1180, 30, full ? GL.white : GL.inkD, { align: 'center', weight: full ? 700 : 600 });
    if (full) { const u = seg(TT, cu.full, cu.full + 0.5); ctx.save(); ctx.globalAlpha *= 1 - u; ctx.beginPath(); ctx.arc(710, 1026, 84 + u * 60, 0, TAU); ctx.strokeStyle = GL.mint; ctx.lineWidth = 6 * (1 - u) + 1; ctx.stroke(); ctx.restore(); }
  });
  // Embun pops in beside the badge and bounces on the beat
  const s = springMove(cu.hero2, 0, 1, SPRING.playful), beat = Math.abs(Math.sin((TT - 3.0) * Math.PI / BEAT)), [sx, sy] = glSway(1.2);
  if (TT >= cu.hero2) glHero(796 + sx, 520 + sy - beat * 22, 70 * s, { look: -0.9, lookY: -0.1, mood: TT < 4.4 || TT > cu.full ? 'wow' : 'smile', squash: 0.05 * (1 - beat) - 0.03, bob: 0 });
  glTag('02', 'DASBOR', { c: GL.mint });
  glCaption('Beres dalam\n*hitungan detik*', { hi: GL.mint });
}
