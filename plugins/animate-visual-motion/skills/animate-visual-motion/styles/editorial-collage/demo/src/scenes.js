// =====================================================================
//  SCENES — editorial-collage demo. World units = px at zoom 1; time TT on 2s. What matters sits in x 60-940, y 250-1500.
//  Draw order is the stacking order: desk, background sheets, cut-outs, scraps, fixings, marks, the hand.
// =====================================================================
const cu = TIMELINE.cues;
const ASK = { x: 770, y: 905, r: 118 };                           // the round "?" scrap: the bridge's first shape
const CK = { x: 715, y: 1000, w: 370, h: 390, rot: 0.045 };      // the clock clipping: the squarish shape it becomes

// ---- era 1: the question
function sceneAsk() {
  ecDesk();
  // sheets that were already lying on the desk
  ecScrap('news', 860, 150, 520, 330, { rot: -0.06, key: 'bgTop', bake: (w, h) => { for (let c = 0; c < 3; c++) ecGreek(-w / 2 + 24 + c * 160, -h / 2 + 30, 140, h, 'bgTop' + c); } });
  ecScrap('kraft', 180, 1700, 520, 380, { rot: 0.06, key: 'bgLow' });
  ecScrap('graph', 395, 735, 640, 720, { rot: 0.035, key: 'bgGraph', tear: [1, 0.15, 1, 0.15] });
  ecScrap('legal', 255, 1190, 440, 330, { rot: -0.07, key: 'bgLegal', tear: [0.1, 0.1, 1, 0.1] });
  ecClip(86, 1075, 86, 0.22);
  // the subject: a halftone person, slapped in from the left
  ecCutout('bust', 318, 706, 530, { rot: -0.05, t0: cu.person, from: [-700, -120] });
  // a clipping taped beside it
  ecClipping('Besok saja, katanya', 742, 566, 350, 400, { rot: 0.06, t0: cu.clip, from: [0, -300], spin: 0.2, kicker: 'KABAR HARI INI', image: true });
  ecTape(735, 372, 150, -0.07, { t0: cu.tape, key: 'tape1' });
  // the headline, one word per paper strip, on the beat
  const bx = ecHeadline([['Kenapa', 'kita'], ['suka', { s: 'menunda?', hi: cu.hi }]], 66, 1128, 100, { t0: cu.w1, stagger: 0.25, lh: 146 });
  // the round scrap that asks, pinned on: it becomes the clock clipping
  ecScrap('kraft', ASK.x, ASK.y, ASK.r * 2, ASK.r * 2, { round: true, rot: -0.09, t0: cu.q, from: [0, -420], spin: -0.3, key: 'q', draw: () => ecText('?', 0, 62, 180, EC.ink, { align: 'center' }) });
  ecPin(ASK.x - 6, ASK.y - 92, 13, { t0: cu.pin });
  // the hand hops in and taps the keyword
  if (TT >= cu.hand - 1e-6) {
    const tip = [bx[3].right - 96, bx[3].top + 10], h = ecHop([1180, 900], tip, cu.hand, 0.25, 60);
    ecHero(h.x, h.y, 96, { a: 1.72, tap: [cu.tap1, cu.tap2] });
  }
  ecTitle('PERTANYAAN HARI INI', null, { t0: cu.kicker });
  ecCaption('Tugas ada, tapi *nanti dulu*', { t0: cu.cap1 });
}

// ---- era 2: the usual answer
function sceneLater() {
  ecDesk({ key: 'desk2' });
  ecScrap('graph', 150, 130, 520, 360, { rot: 0.07, key: 'bg2Top' });
  ecScrap('news', 300, 1740, 560, 330, { rot: -0.05, key: 'bg2Low', bake: (w, h) => { for (let c = 0; c < 3; c++) ecGreek(-w / 2 + 26 + c * 175, -h / 2 + 30, 150, h, 'bg2Low' + c); } });
  ecScrap('legal', 265, 1020, 470, 560, { rot: 0.05, key: 'bg2Legal', tear: [1, 0.1, 0.1, 0.1] });
  ecScrap('kraft', 840, 1345, 330, 250, { rot: -0.1, key: 'bg2Kraft' });
  // a to-do card: only one line ever gets its cross
  ecCard(['[ ] TUGAS', '[ ] LAPORAN', '[ ] REBAHAN'], 738, 612, 330, 222, { rot: 0.04, key: 'todo', title: 'HARI INI',
    draw: (w, h, m, lineY) => ecCross(-w / 2 + 24 + 27, lineY(2) - 9, 12, cu.cross, { w: 7, key: 'tick' }) });
  ecStaple(600, 520, 36, -0.5);
  // the clock clipping (the bridge opens out of it), its hands ticking on the 8ths
  ecScrap('news', CK.x, CK.y, CK.w, CK.h, { rot: CK.rot, key: 'ck', bake: (w, h) => { ecGreek(-w / 2 + 22, -h / 2 + 24, w * 0.44, h, 'cka'); ecGreek(w * 0.04, -h / 2 + 24, w * 0.44, h, 'ckb'); } });
  ecCutout('clock', CK.x, CK.y + 4, 300, { rot: -0.05, key: 'clock', over: (at, k) => ecClockHands(at, k, 11, 56, 40 + Math.floor(TT * 4 + 1e-6)) });
  ecTape(CK.x + 150, CK.y - 182, 130, 0.6, { key: 'tape2' });
  // the phone, slapped in from the left
  ecCutout('phone', 300, 842, 600, { rot: -0.07, tint: 'steel', t0: cu.phone, from: [-650, 120] });
  // the marker does the pointing: this ... leads to that
  ecCircle(309, 684, 152, 64, cu.circle, { key: 'ring' });
  ecArrow([468, 700], [CK.x - 96, CK.y - 172], cu.arrow, { bend: -0.22, key: 'link' });
  // the verdict
  ecStamp('NANTI SAJA', 428, 1262, 92, cu.stamp, { rot: -0.1 });
  if (TT >= cu.hand2 - 1e-6) {
    const h = ecHop([1190, 1130], [754, 1240], cu.hand2, 0.25, 70);
    ecHero(h.x, h.y, 96, { a: 3.06, tap: [cu.tap3, cu.tap4], key: 'hero2' });
  }
  ecTitle('ALASAN KLASIK', '“Lima menit lagi.”');
  ecCaption('Padahal, *nanti* itu kapan?', { t0: cu.cap2 });
}
