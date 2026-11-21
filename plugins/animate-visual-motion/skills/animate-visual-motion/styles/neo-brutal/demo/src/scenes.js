// =====================================================================
//  SCENES — neo-brutal demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1500
//  (marquee strips cross the whole frame on purpose). Cue times are moments of IMPACT: things land on them.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing may sit in front of them at the bridge, or it shows in the morph window
const HERO = { x: 520, y: 1150, r: 158 };
const CARD = { x: 110, y: 510, w: 760, h: 610 };
const BTN = { x: 500, y: 1240, w: 700, h: 156 };
const slapped = (t, fn) => { const s = nbSlap(t); if (s.s > 0) fn(s); };

// ---- era 1: the drop. Yellow, then cream the moment the mascot lands.
function sceneDrop() {
  nbGround(past(TT, cu.land) ? NB.cream : NB.yellow, { pattern: 'dots', dy: 36 });
  // things butting against the frame: a seal sunk in the bottom corner, a star cut by the top edge
  nbBurst(930, 1770, 300, '', NB.pink, { rot: 0, n: 18, depth: 0.12, turn: 0.25 });
  slapped(cu.strip1, (s) => nbIcon('star', 968, 176, 128 * s.s, NB.lilac, { rot: s.rot + nbStep(0.5) * 0.3927 }));
  // a black strip behind the mascot, running rightwards
  const [bx] = nbSlam(cu.strip2, 'r');
  nbMarquee(1232, 104, 'V2.0 IS LIVE', NB.ink, { rot: 0.075, speed: 250, tc: NB.yellow, sep: 'star', sepC: NB.pink, dx: bx });
  // a blue strip across the top, running leftwards
  const [ax] = nbSlam(cu.strip1, 'l');
  nbMarquee(452, 100, 'NEW DROP', NB.blue, { rot: -0.075, speed: -240, tc: NB.white, sepC: NB.yellow, dx: ax });
  // the headline: two slams, the second on a highlighter block
  const [ix] = nbSlam(cu.its, 'l'), [hx] = nbSlam(cu.here, 'r');
  nbText("IT'S", 78 + ix, 742, 212, NB.ink, { rot: -0.035 });
  nbText('HERE!', 92 + hx, 952, 212, NB.ink, { hl: NB.pink, rot: 0.018, maxW: 740 });
  // stickers slapped on, one per 8th
  nbBurst(772, 668, 126, 'NEW', NB.mint, { at: cu.seal, rot: 0.2 });
  nbSticker(196, 1092, 'v2.0', NB.lilac, { at: cu.ver, rot: -0.17, size: 70 });
  slapped(cu.bolt, (s) => nbIcon('bolt', 852, 1052, 80 * s.s, NB.yellow, { rot: 0.22 + s.rot }));
  slapped(cu.bolt + 0.125, (s) => nbIcon('asterisk', 138, 1296, 58 * s.s, NB.pink, { rot: s.rot + nbStep(0.25) * 0.262 }));
  // the mascot drops in from the top and stops dead; it looks at the seal, then goes wide-eyed
  const [, hy] = nbSlam(cu.land, 't'), wow = TT >= cu.wow;
  nbHero(HERO.x, HERO.y + hy, HERO.r, { mood: wow ? 'wow' : 'happy', look: TT > cu.seal && !wow ? 0.7 : 0, bob: 1 - seg(TT, 2.15, 2.35) });
  slapped(cu.wow, (s) => nbIcon('arrow', 806, 1236, 64 * s.s, NB.white, { rot: Math.PI + 0.12 + s.rot }));
  nbKicker('LAUNCH DAY', { at: 0.25, dot: NB.pink });
  nbCaption('Say hi to *v2.0*', { at: 0.75 });
}

// ---- era 2: the feature card and the button. Blue, then yellow on the second press.
function sceneCard() {
  const presses = [cu.press1, cu.press2, cu.press3], press = nbPress(presses), hit = presses.filter((t) => TT >= t).pop();
  nbGround(past(TT, cu.press2) ? NB.yellow : NB.blue, { pattern: 'grid', dx: -30, dy: 30 });
  nbMarquee(1660, 110, 'ONE-TAP SETUP', NB.mint, { rot: 0.05, speed: 230, sep: 'star', sepC: NB.pink });
  nbIcon('plus', 1010, 214, 112, NB.pink, { rot: nbStep(0.5) * 0.3927 });
  const [mx] = nbSlam(cu.strip3, 'l');
  nbMarquee(408, 96, 'GET IT TODAY', NB.ink, { rot: -0.06, speed: -260, tc: NB.yellow, sep: 'bolt', sepC: NB.mint, dx: mx });
  // the card (the bridge's counterpart): a window with a feature in it
  nbWindow(CARD.x, CARD.y, CARD.w, CARD.h, { title: 'feature-01', draw: (w, h) => {
    nbTag(160, 60, 'FEATURE 01', NB.mint, { size: 32, sh: 6 });
    nbText('ONE-TAP', 40, 205, 124, NB.ink);
    nbText('SETUP', 56, 335, 124, NB.ink, { hl: NB.pink, hlSh: 8 });
    nbText('Auto mode', 40, 438, 46, NB.ink);
    nbToggle(w - 44 - 150, 384, 150, springEase(TT - cu.toggle, 320, 20), NB.mint);
    nbText('Speed', 40, 516, 46, NB.ink);
    nbSlider(250, 500, w - 250 - 120, lerp(0.15, 0.9, seg(TT, cu.free, cu.press2)), NB.blue);
  } });
  nbBurst(848, 716, 92, 'v2.0', NB.mint, { at: cu.toggle, rot: 0.2, n: 12 });
  nbHero(CARD.x + CARD.w - 112, CARD.y - 92, 84, { at: cu.btn, rot: 0.14, key: 'perch', mood: hit != null && TT - hit < 0.3 ? 'wow' : 'happy', look: -0.5 });
  // the call to action: it slams up from below, then is pressed on the beat
  const [, by] = nbSlam(cu.btn, 'b');
  nbButton(BTN.x, BTN.y + by, BTN.w, BTN.h, 'GET IT NOW', NB.pink, { press, icon: 'arrow', size: 72, tc: NB.ink });
  nbSticker(836, 1158, 'FREE', NB.lilac, { at: cu.free, rot: 0.16, size: 58 });
  if (TT >= cu.press2 - 0.09) nbSticker(176, 1174, 'NICE', NB.blue, { at: cu.press2, rot: -0.15, size: 56, icon: 'check', tc: NB.white });
  // the cursor flies in, lands on the button and clicks with it
  const cin = seg(TT, cu.press1 - 0.3, cu.press1 - 0.06), d = NB.sh * press;
  if (hit != null) nbTicks(806, 1290, 44, hit, { n: 4, a0: -1.25, a1: 0.35 });
  if (cin > 0) nbIcon('cursor', lerp(1040, 800, EZ.o3(cin)) + d, lerp(1640, 1284, EZ.o3(cin)) + d, 40, NB.white, { sh: NB.sh * 0.6 * (1 - press) });
  nbKicker('FEATURE 01', { at: 0.5, dot: NB.yellow });
  nbCaption('Go on, *press it*', { at: 0.75, hl: NB.mint, y: 1432 });
}
