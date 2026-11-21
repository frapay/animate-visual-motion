// =====================================================================
//  SCENES — comic demo. World units = px at zoom 1; time TT on 2s.
//  Content kept inside x 60-940, y 250-1500. Each era is one panel on the paper page.
// =====================================================================
const cu = TIMELINE.cues;
const PAN1 = [[48, 168], [1032, 168], [1032, 1592], [48, 1592]];
const PAN2 = [[48, 206], [1032, 150], [1032, 1556], [48, 1612]];
const BURST = { x: 640, y: 505, rx: 262, ry: 222 };
const SUN = { x: 500, y: 600, r: 250 };
const FLOOR1 = 1262;
// the starburst as drawn at time TT (the bridge uses the same outline): its spikes reseed every 3 boils
const burstBoil = () => Math.floor(B / 3);
function burstPts(s = 1) { return cmBurstPts(BURST.x, BURST.y, BURST.rx * s, BURST.ry * s, 14, { key: 'TING!', boil: burstBoil() }); }

// ---- era 1: the idea
function sceneIdea() {
  cmPaper();
  const got = TT >= cu.ting - 1e-6;
  cmPanel(PAN1, () => {
    ctx.fillStyle = CM.white; ctx.fillRect(0, 0, W, H);
    cmDots(null, CM.blue, { pitch: 26, from: [0, 1060], to: [0, 160], pow: 0.8, r0: 2.5, box: [40, 160, 1040, FLOOR1] });
    // the floor: a yellow band with an ink edge and orange dots
    ctx.fillStyle = CM.yellow; ctx.fillRect(40, FLOOR1, 1000, 400);
    cmDots(null, CM.yellowD, { pitch: 22, from: [0, FLOOR1 + 40], to: [0, 1600], box: [40, FLOOR1, 1040, 1600] });
    cmLine([[40, FLOOR1], [1040, FLOOR1]], { w: 9, cap: 'butt' });
    // before the idea: little question marks drift up; after: the burst, its speed lines, sparkles
    if (!got) {
      [[205, 790, 0], [330, 680, 0.5], [180, 580, 1.1]].forEach(([x, y, ph], i) => {
        const yy = y - mod(TT * 60 + ph * 40, 60), a = Math.sin(TT * 5 + i * 2) * 0.2;
        cmText('?', x, yy, 96 + i * 18, [CM.red, CM.blue, CM.yellow][i], { rot: a });
      });
    } else {
      const s = cmPop(cu.ting);
      cmSpeed(BURST.x, BURST.y, 300, 760, { n: 44, c: CM.blue, key: 'sp1', w: 0.03, hold: 2, reach: 0.75 });
      cmBurst('TING!', BURST.x, BURST.y, { rx: BURST.rx, ry: BURST.ry, t0: cu.ting, key: 'TING!', boil: burstBoil(), size: 168, grad: [CM.red, CM.redD] });
      cmTicks(BURST.x, BURST.y, 250, 400, cu.ting, { n: 12, key: 'tk1', len: 60 });
      [[905, 250, 0], [395, 262, 1.3], [900, 760, 2.4]].forEach(([x, y, ph], i) => cmSparkle(x, y, 34 * s * (0.55 + 0.45 * Math.abs(Math.sin(TT * 4 + ph))), i === 1 ? CM.red : CM.white));
    }
    // the hero: thinking, then a jump with the finger up, then a grin
    const r = 150, x = 300, jumpU = seg(TT, cu.ting, cu.ting + 0.34), jump = got ? Math.sin(jumpU * Math.PI) * 90 : 0;
    const land = TT > cu.ting + 0.34 ? Math.exp(-(TT - cu.ting - 0.34) * 12) : 0;
    // a ground shadow in ink dots
    cmDots(ellipsePts(x + 10, FLOOR1 + 34, 190 - jump * 0.6, 30, 0, 32), CM.ink, { pitch: 12, g: 0.8 });
    cmHero(x, FLOOR1 - r * 1.3 - jump, r, { key: 'bang', mood: got ? 'aha' : 'think', look: got ? 0.7 : 0.2, lookY: got ? -0.5 : 0, squash: -0.16 * land, bob: got ? undefined : Math.sin(TT * TAU * 0.5) * 0.02 });
    cmBulb(300, 700 - jump * 0.5, 120, { t0: cu.ting + 0.08, key: 'bulb' });
    cmBubble('HMM…', 610, 830, { kind: 'thought', tail: [420, 1010], size: 70, out: cu.ting - 0.08 });
    cmBubble('AKU PUNYA\nIDE!', 668, 905, { tail: [432, 1085], size: 62, t0: cu.bubble });
    cmTicks(668, 905, 240, 300, cu.bubble, { n: 8, key: 'tk2', len: 30, w: 6 });
  });
  cmTag('1', 'IDE');
  cmCaption('TIBA-TIBA, MUNCUL\n*IDE CEMERLANG!*', { at: cu.cap1, y: 1478 });
}

// ---- era 2: the take-off
function sceneDash() {
  cmPaper();
  cmPanel(PAN2, () => {
    ctx.fillStyle = CM.blue; ctx.fillRect(0, 0, W, H);
    cmDots(null, CM.blueD, { pitch: 26, from: [0, 760], to: [0, 1640], r0: 2, box: [40, 140, 1040, 1620] });
    cmSpeed(SUN.x, SUN.y, SUN.r * 1.5, 1700, { n: 78, c: CM.white, key: 'sp2', w: 0.02, hold: 1 });
    cmSpeed(SUN.x, SUN.y, SUN.r * 1.9, 1700, { n: 40, c: CM.ink, key: 'sp2k', w: 0.011, hold: 1, reach: 0.6 });
    // the sun: a red spiked ring turning behind a yellow disc
    const k = cmPop(cu.sun, { k: 300, d: 20 });
    if (k > 0.03) cmShape(cmBurstPts(SUN.x, SUN.y, SUN.r * (1 + 0.3 * k), SUN.r * (1 + 0.3 * k), 18, { key: 'sun', inner: 0.8, jit: 0.02, rot: Math.floor(B / 2) * 0.09 }), CM.red, { w: 10, join: 'miter' });
    const disc = cmCirclePts(SUN.x, SUN.y, SUN.r, 96);
    cmShape(disc, CM.yellow, { w: 12 });
    cmDots(disc, CM.yellowD, { pitch: 20, from: [SUN.x - 25, SUN.y - 25], to: [SUN.x + SUN.r * 0.8, SUN.y + SUN.r * 0.9] });
    cmShape(disc, null, { w: 12 });
    ctx.save(); ctx.strokeStyle = CM.white; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, SUN.r * 0.76, -2.75, -2.0); ctx.stroke(); ctx.restore();
    // dust puffs kicked up at the launch corner, drifting on 2s
    [[130, 1330, 74, 0], [262, 1392, 58, 1.7], [92, 1452, 66, 3.1], [372, 1470, 46, 4.4]].forEach(([x, y, r, ph], i) => {
      const s = cmPop(cu.zoom + 0.06 + i * 0.05, { k: 300, d: 22 });
      cmPuff(x + Math.sin(TT * 1.6 + ph) * 10, y + Math.cos(TT * 1.3 + ph) * 6, r * s, { phase: ph + Math.floor(B / 3) * 0.5 });
    });
    // the hero shoots in from the lower left and hangs in front of the sun
    const u = TT < cu.zoom ? 0 : springEase(TT - cu.zoom + 0.04, 240, 19), r = 150;
    const hx = lerp(-260, 598, u), hy = lerp(1560, 880, u);
    if (TT >= cu.zoom - 1e-6) {
      cmZip(hx - 150, hy + 170, 136 * DEG, { n: 8, len: 430 + 500 * (1 - clamp(u)), spread: 250, c: CM.white, w: 16, key: 'zipw', hold: 1 });
      cmZip(hx - 170, hy + 150, 136 * DEG, { n: 6, len: 330, spread: 300, c: CM.ink, w: 9, key: 'zipk', hold: 1 });
      cmHero(hx, hy, r, { key: 'bang', mood: 'dash', rot: -0.3 + 0.12 * Math.exp(-Math.max(0, TT - cu.zoom) * 5), wind: 1, stride: 1, look: 0.8, lookY: -0.4, bob: Math.sin(TT * TAU * 1.0) * 0.05 });
      cmTicks(772, 742, 40, 110, cu.zoom + 0.3, { n: 7, key: 'tk3', len: 34, c: CM.white, w: 8 });
    }
    [[880, 330, 0.4], [150, 420, 1.9], [905, 1150, 3.0]].forEach(([x, y, ph]) => cmSparkle(x, y, 36 * (0.5 + 0.5 * Math.abs(Math.sin(TT * 4.5 + ph))), CM.yellow));
    cmSfx('WUSS!', 345, 1186, 178, CM.yellow, { t0: cu.wuss, rot: -9 * DEG, grad: [CM.yellow, CM.yellowD] });
  });
  cmTag('2', 'AKSI', { c: CM.blueD });
  cmCaption('…DAN LANGSUNG\n*BERAKSI!*', { at: cu.cap2 - 3, y: 1478 });
}
