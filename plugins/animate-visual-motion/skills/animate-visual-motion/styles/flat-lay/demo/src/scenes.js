// =====================================================================
//  SCENES — flat-lay demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1300 (the
//  caption card owns y 1345-1455). Era 1 is a knolled grid; era 2 is one hero with props round it.
// =====================================================================
const cu = TIMELINE.cues;
const G1 = flGrid({ x: 96, y: 352, w: 808, h: 928, cols: 3, rows: 4, gap: 28 });
const CUP = { x: G1.cell(0, 0, 2, 2).cx, y: G1.cell(0, 0, 2, 2).cy, r: 122, plate: 204 };
const TIN = { x: 500, y: 772, r: 166 };

// ---- era 1: a coffee set on pale oak, squared on a 3 x 4 grid
function sceneCoffee() {
  flSurface('oak');
  flWindowLight({ x: 250, y: 1180, w: 520, h: 560, vx: 16, vy: 6, al: 0.22 });                        // a patch of sun, drifting (background life)
  G1.marks(1 - seg(TT, 1.3, 1.8));                                                                   // the stylist's guide ticks, gone once everything is down
  const B = G1.cell(2, 0, 1, 2), S = G1.cell(0, 2, 1, 2), D = G1.cell(1, 2), E = G1.cell(2, 2), F = G1.cell(1, 3, 2, 1);
  flItem('plate', CUP.x, CUP.y, CUP.plate, { at: cu.cup, from: 'l', spin: -0.6, band: FL.navy });
  flScatter('sugar', [[CUP.x - 150, CUP.y + 62, 0.5, 1], [CUP.x - 118, CUP.y + 104, 0.1, 1]], 15, { at: cu.sugar, step: 0.1, key: 'cube' });
  flItem('cup', CUP.x, CUP.y, CUP.r, { at: cu.cup, from: 'l', spin: -0.6, ripple: TT });               // the coffee ripples (background life)
  flItem('box', B.cx, B.cy, B.h / 2 - 2, { at: cu.box, from: 'r', spin: 0.5, w: 53, label: 'ROAST', sub: 'No. 4', mark: 'bean' });
  flItem('spoon', S.x + 74, S.cy, S.h / 2 - 4, { at: cu.spoon, from: 'b', spin: 0.45 });
  flScatter('bean', [0, 1, 2, 3, 4].map((i) => [S.x + 190, S.y + 44 + i * (S.h - 88) / 4, 0.55, 1]), 25, { at: cu.beans, step: 0.05 });
  flItem('bowl', D.cx, D.cy, D.s - 4, { at: cu.bowl, from: 'l', spin: -0.5, c: FL.sageP, liquid: '#f3eee4', grains: { n: 120, s: 11 }, key: 'sugar' });
  flItem('tin', E.cx, E.cy, E.s - 4, { at: cu.tin, from: 'r', spin: 0.5, c: FL.navy, knurl: true, label: 'No.4', sub: 'GROUND COFFEE', mark: 'bean' });
  flItem('cloth', F.cx, F.cy, F.w / 2, { at: cu.cloth, from: 'b', spin: -0.3, hh: F.h / F.w * 100, stripe: FL.terra });
  flSteam(CUP.x, CUP.y, CUP.r, { al: 0.8 * seg(TT, cu.cup + 0.4, cu.cup + 1) });                     // steam curls off the cup (background life)
  // set dressing that runs off the bottom of the frame, as in any flat lay
  flItem('notebook', 236, 1742, 214, { c: '#a8876a', label: false });
  flItem('monstera', 800, 1740, 250, { rot: -2.5 + 0.012 * Math.sin(TT * 1.7) });
  flScatter('bean', [[520, 1590, 0.4, 1], [574, 1640, 2.1, 1], [498, 1668, 1.2, 1]], 23, { key: 'loose' });
  flLeafShadow({ x: 1150, y: 300, s: 600, rot: 2.62, al: 0.2 });                                      // a plant by the window, swaying (background life)
  flNote('still warm', 512, 326, { at: cu.note, size: 46, from: [500, 318], to: [CUP.x + 62, CUP.y - CUP.r + 26], bend: -0.3 });
  flTag('coffee');
  flCaption('A place for *everything*', { at: 0.55, tape: FL.mustard });
}

// ---- era 2: the hero tin on linen, a skincare set round it
function sceneSkin() {
  flSurface('linen');
  flWindowLight({ x: 640, y: 560, w: 560, h: 620, vx: -14, vy: 6, al: 0.2 });                         // the sun patch drifts the other way (background life)
  flItem('sprig', 280, 452, 176, { at: cu.sprig, from: 't', spin: 0.4, rot: -Math.PI / 2, sway: 0.05 * Math.sin(TT * 2.4) });   // its leaves stir (background life)
  flItem('glasses', 742, 452, 150, { at: cu.glasses, from: 'r', spin: 0.4, glare: mod(TT * 0.22, 1) });
  flItem('tube', 170, TIN.y, 192, { at: cu.tube, from: 'l', spin: -0.5, c: FL.blush, label: 'CREAM', sub: 'hand' });
  flItem('bottle', 830, TIN.y, 192, { at: cu.bottle, from: 'r', spin: 0.5, label: 'OIL', sub: 'face' });
  flHero(TIN.x, TIN.y, TIN.r, { glint: seg(TT, 5.2, 5.85) });
  flScatter('citrus', [[150, 1112, 0.3, 1], [294, 1112, 1.4, 1]], 64, { at: cu.citrus, step: 0.1 });
  flItem('flower', 216, 1258, 100, { at: cu.flower, from: 'l', spin: -0.4, rot: Math.PI / 2 });
  flCard(650, 1146, 496, 236, { at: cu.card, from: 'r', spin: 0.25, rot: 0.012, tape: FL.mustard, tapeW: 150, draw: () => {
    flType('WHAT IS IN IT', -212, -78, 21, FL.soft, { weight: 700, track: 0.2, align: 'left' });
    flList(['orange peel', 'eucalyptus', 'shea butter'], -196, -30, { size: 38, gap: 54, at: cu.list, step: 0.22 });
  } });
  flDot(1, 96, 1058, { at: cu.list });
  flDot(2, 440, 384, { at: cu.list + 0.22 });
  flDot(3, TIN.x - 122, TIN.y - 122, { at: cu.list + 0.44 });
  flItem('bowl', 250, 1712, 128, { liquid: '#f4ead8', swirl: TT * 0.5 });                                // set dressing off the bottom edge: a bowl of cream, slowly turning
  flItem('cloth', 770, 1736, 196, { hh: 74, c: FL.sageP, stripe: FL.white, key: 'towel' });
  flLeafShadow({ x: 1150, y: 230, s: 600, rot: 2.45, al: 0.17, kind: 'monstera', sway: 0.03, speed: 1.2 });   // a monstera's shadow, swaying (background life)
  flTag('skincare');
  flCaption('Made with *three* things', { at: 0.75, tape: FL.sage });
}
