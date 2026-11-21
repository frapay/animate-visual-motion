// =====================================================================
//  ERAS, CAMERAS, BRIDGES — luxe demo (read by kit/morph.js). Two very slow pushes, eased in and out; no cuts.
//  Colours given to the renderer are 6-digit hex: the studio's dark for ERA_BG, a liquid's / a stone's base colour for the bridge shapes.
// =====================================================================
const ERA_BG = ['#0b0807', '#06140f'];
function pieceCam(era, t) {
  return era === 0 ? push(t, 0.0, 3.0, { z: 1.06, p: [BOTTLE.x, BOTTLE.y - 300], to: [BOTTLE.x, BOTTLE.y - 300] })
                   : push(t, 3.0, 6.0, { z: 1.05, p: [RING.x, RING.y - 400], to: [RING.x, RING.y - 400] });
}
const BRIDGES = [
  // the bottle -> the stone of the ring: cut glass with amber in it becomes a clear cut stone while a band of light crosses it
  { tc: 3.0, d: 0.5, A: () => ({ P: lxProductPts('perfume', BOTTLE.x, BOTTLE.y, BOTTLE.s), c: LUX.liquid.amber.base }), B: () => ({ P: lxProductPts('ring', RING.x, RING.y, RING.s), c: LUX.gem.diamond }) },
];
