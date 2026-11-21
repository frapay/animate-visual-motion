// =====================================================================
//  ERAS, CAMERAS, BRIDGES — ui-mockup demo (read by kit/morph.js).
// =====================================================================
const ERA_BG = [UI.ground, UI.groundD];
const BRIDGES = [
  // the app-icon tile -> the count card in the browser: both rounded accent tiles of similar proportions and corner radius
  { tc: 3.0, d: 0.5, A: () => ({ P: uiAppIconPts(ICON.x, ICON.y, ICON.s), c: UI.accent }), B: () => ({ P: kpiPts(), c: UI.accent }) },
];
