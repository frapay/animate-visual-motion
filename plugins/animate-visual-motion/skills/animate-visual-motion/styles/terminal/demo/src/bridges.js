// =====================================================================
//  ERAS, THEMES, CAMERAS, BRIDGES — terminal demo (read by kit/morph.js and the terminal STYLE hooks)
// =====================================================================
const ERA_THEME = ['green', 'cyan'];
const ERA_BG = [TRM_THEMES.green.bg, TRM_THEMES.cyan.bg];
function pieceCam() { return null; }   // a terminal has no camera: things move by whole cells
// the core (a ball of shade characters) -> the chart panel (a box 19 x 10 cells): both squarish, a clean morph
const BRIDGES = [
  { tc: 3.0,
    A: () => ({ P: ellipsePts(CORE.x, CORE.y, CORE.r, CORE.r, 0, 64), c: TRM_THEMES.green.ink }),
    B: () => ({ P: rrectPts(PANEL.col * TRM_CW, PANEL.row * TRM_CH, PANEL.w * TRM_CW, PANEL.h * TRM_CH, 20), c: TRM_THEMES.cyan.ink }) },
];
