// =====================================================================
//  ERAS, CAMERAS, BRIDGES — diorama demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [DIO.dusk.tones[3], DIO.night.tones[4]];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 2.5, { z: 1.04, p: [500, 900], to: [500, 900] });
  const z = springMove(3.0, 1.07, 1.0, { k: 16, d: 8 });
  return camOf({ z, p: [540, 940], to: [540, 940] });
}
const BRIDGES = [
  // the sun disc (a circle of light) -> the lantern's paper body (a rounded barrel of light): similar proportions,
  // cream -> amber. The lantern hangs on the lantern's own sheet, so its outline carries that sheet's parallax.
  { tc: 3.0,
    A: () => ({ P: dioCirclePts(SUN.x, SUN.y, SUN.r), c: DIO.dusk.light }),
    B: () => { const [ox, oy] = dioOff(LAN.depth); return { P: dioLanternPts(LAN.x + ox, LAN.y + oy, LAN.s, { top: LAN.top + oy }), c: DIO.warm }; } },
];
