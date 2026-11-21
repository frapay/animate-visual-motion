// =====================================================================
//  ERAS, CAMERAS, BRIDGES — flash-sale demo (read by kit/morph.js). No camera moves: a banner, slammed together.
// =====================================================================
const ERA_BG = [FS_PRESETS.hot.bg, FS_PRESETS.berry.bg];
const BRIDGES = [
  // the bolt mascot -> the product card: lemon into white
  { tc: 3.0, d: 0.5, A: () => SP(HERO.x, HERO.y, HERO.r, 0), B: () => ({ P: rrectPts(CARD.x, CARD.y, CARD.w, CARD.h, 46), c: FS.white }) },
];
