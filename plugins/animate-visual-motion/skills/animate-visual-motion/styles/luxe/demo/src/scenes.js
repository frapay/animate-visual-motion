// =====================================================================
//  SCENES — luxe demo. World coordinates 1080x1920; time TT on 1s. One product per frame; the materials round it are
//  the subject and the light is what moves. Content inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const BOTTLE = { x: 500, y: 1218, s: 560 }, RING = { x: 500, y: 1196, s: 540 };
const HORIZON = 1052;                                         // the back edge of the marble slab in era 1

// ---- era 1: the fragrance. Black marble, a burgundy satin drape, gold and amber.
function sceneFragrance() {
  const up = 0.35 + 0.65 * lxIn(cu.light, 1.2), sweep = seg(TT, cu.sweep, cu.sweep + 1.3), shift = 0.1 * Math.sin(TT * 0.9);
  const drape = () => lxSilk([[590, -120], [580, 400], [540, 780], [545, HORIZON + 40]], { w: [1500, 1320, 1320, 1420], color: 'burgundy', folds: 5, key: 'drape', soft: 3, fall: [0.12 * up, 0.3 * up, 0.82 * up, 0.92 * up] });
  lxWall({ cx: BOTTLE.x, cy: 820, light: up });
  drape();
  lxTable({ horizon: HORIZON, preset: 'black', cx: BOTTLE.x, light: up });
  lxReflect(HORIZON, drape, { a: 0.34, depth: 360, blur: 3 });         // the polished stone mirrors the cloth behind it
  lxBokeh({ n: 12, key: 'back', a: up, area: { x0: 40, y0: 260, x1: 1040, y1: 980 } });
  lxProduct('perfume', BOTTLE.x, BOTTLE.y, BOTTLE.s, { spec: sweep, shift, reflect: 0.5, blur: 1.5, glint: Math.sin(Math.PI * seg(TT, cu.glint, cu.glint + 0.55)) ** 1.4 });
  lxGlint(BOTTLE.x - 132, BOTTLE.y - 330, 70, { every: 1.5, off: 0.4, dur: 0.45 });   // a small flash on the cut shoulder
  lxHaze({ a: up, y0: 600, y1: 1300 });
  lxBokeh({ n: 4, key: 'front', a: up * 0.8, rmin: 70, rmax: 150, area: { x0: 0, y0: 1250, x1: 1080, y1: 1900 } });
  lxVignette(0.6);
  lxTag('Atelier · 01');
  lxTitle('Eau de parfum', 'Light, bottled', { at: cu.title, y: 520 });
  lxCaption('The *light* moves, not the product', { at: 0.9, size: 50 });
}

// ---- era 2: the stone. Emerald marble seen from above, a champagne satin ribbon, a solitaire ring.
function sceneStone() {
  const t = TT - 3, up = 0.5 + 0.5 * lxIn(cu.light2, 1.0), sweep = seg(TT, cu.sweep2, cu.sweep2 + 1.2);
  lxMarble({ preset: 'emerald', cx: RING.x, cy: 860, light: up });
  lxDim(180, 700, 0.42);                                              // dark empty space for the title
  lxSilk([[1300, 560], [900, 760], [560, 1010], [200, 1150], [-240, 1090]], { w: [300, 380, 470, 400, 330], color: 'emerald', folds: 4, key: 'ribbon', shadow: 0.6, depth: 1.0, fall: [0.9 * up, 1.0 * up] });
  lxBokeh({ n: 8, key: 'back2', a: 0.7 * up, area: { x0: 40, y0: 240, x1: 1040, y1: 700 } });
  const r = lxProduct('ring', RING.x, RING.y, RING.s, { shadow: 'drop', spec: sweep, shift: 0.12 * Math.sin(t * 0.9), color: 'diamond', anchor: true, key: 'hero' });
  lxGlint(r.gem[0] - r.gem[2] * 0.36, r.gem[1] - r.gem[2] * 0.4, 210, { at: cu.glint2, dur: 0.6 });      // the stone catches the light: a brief four-point star
  lxGlint(r.gem[0] + r.gem[2] * 0.5, r.gem[1] + r.gem[2] * 0.22, 150, { at: cu.glint3, dur: 0.55, rot: 0.2 });
  lxGlint(RING.x - 150, RING.y - 96, 60, { every: 1.5, off: 0.9, dur: 0.4 });                           // and the band
  lxHaze({ a: 0.7, color: '#a8c9a0', y0: 500, y1: 1400 });
  lxBokeh({ n: 4, key: 'front2', a: 0.7, rmin: 70, rmax: 150, area: { x0: 0, y0: 1300, x1: 1080, y1: 1900 } });
  lxVignette(0.62);
  lxTag('Atelier · 02');
  lxTitle('Fine jewellery', 'Cut to catch it', { at: cu.title2 - 3, y: 520 });
  lxCaption('Marble, satin, gold, *a stone*', { at: 0.9, size: 50 });
}
