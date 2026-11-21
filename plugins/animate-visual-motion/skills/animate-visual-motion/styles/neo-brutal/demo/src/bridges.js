// =====================================================================
//  ERAS, CAMERAS, BRIDGES — neo-brutal demo (read by kit/morph.js). No camera moves: a poster, slammed together.
// =====================================================================
const ERA_BG = [NB.cream, NB.blue];
const BRIDGES = [
  // the mascot block -> the feature card: a block into a block (similar proportions), orange into white
  { tc: 3.0, d: 0.5, A: () => SP(HERO.x, HERO.y, HERO.r, 0), B: () => ({ P: rrectPts(CARD.x, CARD.y, CARD.w, CARD.h, 2), c: NB.white }) },
];
