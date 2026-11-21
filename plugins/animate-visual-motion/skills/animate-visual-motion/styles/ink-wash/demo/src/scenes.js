// =====================================================================
//  SCENES — ink wash demo. World coordinates 1080x1920; time TT on 2s. Content inside x 60-940, y 250-1500.
//  Both eras are the same bare sheet; more than 60% of it stays unpainted. The caption's band (y 1330-1460) and
//  the tag (top-left) are kept clear: nothing is brushed behind them.
// =====================================================================
const cu = TIMELINE.cues;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const MOON = { x: 690, y: 500, r: 118 };
const POND = { x: 470, y: 900, r: 320 };
const moonPts = () => ellipsePts(MOON.x, MOON.y, MOON.r, MOON.r, 0, 64);
const pondPts = () => ellipsePts(POND.x, POND.y, POND.r, POND.r * 0.93, 0, 72);
const CRANE_R = 168;

// ---- era 1: the crane flies far over the mountains
function sceneGunung() {
  inwSet();
  inwMoon(MOON.x, MOON.y, MOON.r, { soak: ev(cu.moon + 0.08, 0.6) });
  // the far range: wash only, soaking in under a blurred ridge
  inwPeak([[370, 1050], [480, 905], [600, 772], [690, 818], [790, 734], [905, 868], [1100, 960]], { c: INW.pale, al: 0.5, base: 1100, soak: ev(0.17, 0.9), soft: 14, key: 'jauh' });
  inwMist(540, 1020, 960, 120, { drift: 16 * TT, key: 'm1' });                                                   // mist drifting (background life)
  // far birds, two flicks each (background life)
  [[236, 468], [312, 512], [190, 536]].forEach(([x, y], i) => inwBird(x + 24 * TT, y - 7 * TT, 0.95 - i * 0.12, { flap: Math.sin(B * 0.9 + i * 2), frac: ev(0.25 + i * 0.17, 0.17), key: 'b' + i }));
  // the middle mountain: its ridge is brushed on, the wash soaks down, texture strokes follow
  inwMountain([[150, 1080], [250, 962], [350, 842], [420, 800], [500, 884], [600, 1004], [730, 1110]], { t: ev(cu.ridge, 0.9), c: INW.light, line: INW.dark, w: 22, base: 1215, cun: 6, key: 'tengah' });
  inwMist(430, 1160, 1000, 100, { drift: -12 * TT, key: 'm2' });
  // water: two long dry strokes and a small boat drifting with its reflection (background life)
  inwStroke([[500, 1268], [700, 1262], [900, 1270]], { w: 6, c: INW.pale, shape: 'leaf', dry: [0.4, 1], frac: ev(0.75, 0.5), load: 0, key: 'air1' });
  inwStroke([[430, 1196], [560, 1192], [650, 1197]], { w: 5, c: INW.pale, shape: 'leaf', dry: [0.4, 1], frac: ev(0.9, 0.5), load: 0, key: 'air2' });
  inwBoat(742 - 13 * TT, 1226, 0.85, { t: ev(0.75, 0.5), key: 'perahu' });
  // the near cliff, darkest, with a crooked pine leaning out
  inwMountain([[-60, 1160], [40, 1112], [130, 1084], [215, 1104], [272, 1186], [304, 1276]], { t: ev(cu.cliff, 0.6), c: INW.mid, line: INW.ink, w: 26, base: 1325, cun: 4, cunC: INW.dark, key: 'dekat' });
  inwPine(118, 1094, 0.86, { t: ev(cu.pine, 0.8), key: 'pinus' });
  // the hero: Bangau glides in from the left on slow wingbeats (wings down on the beat)
  if (TT >= cu.fly) {
    const g = EZ.o2(seg(TT, cu.fly, 2.9));
    inwHero(lerp(-170, 500, g), lerp(790, 690, g) + Math.sin(TT * 3) * 8, 132, { pose: 'fly', flap: -Math.cos((TT - cu.fly) * TAU), key: 'bangau' });
  }
  inwTag('Gunung');
  inwCaption('Bangau *terbang* jauh');
}

// ---- era 2: and rests at the pond
function sceneKolam() {
  const t = TT - 3;
  inwSet();
  inwWash(pondPts(), { c: INW.light, key: 'inwblob' });                                                          // the pond (the moon, arrived)
  // still water: broken rings, dark and bare-paper light
  const calm = ev(3.6, 0.6);
  if (calm > 0) {
    inwWash(ellipsePts(POND.x + 30, POND.y + 40, 190, 150, 0, 40), { c: INW.mid, al: 0.17, feather: 90, grow: calm, edge: 0, blooms: 3, key: 'dalam' });   // the deep middle soaks outward
    inwRipple(POND.x + 40, POND.y + 150, 170, { al: 0.55 * calm, sy: 0.3, key: 'k1' });
    inwRipple(POND.x - 30, POND.y - 150, 150, { al: 0.5 * calm, sy: 0.28, c: INW.paper, over: true, w: 5, key: 'k2' });
    inwRipple(POND.x + 110, POND.y - 20, 90, { al: 0.5 * calm, sy: 0.3, key: 'k3' });
  }
  // a grey fish swimming an arc on the right (background life)
  const th = -0.75 + 0.78 * (TT - 3.6), fx = POND.x + 222 * Math.cos(th), fy = POND.y + 205 * Math.sin(th);
  if (TT >= 3.6) inwFish(fx, fy, 0.9, th + Math.PI / 2 + 0.12, { al: ev(3.6, 0.4), key: 'ikan' });
  inwMist(430, 1290, 720, 70, { drift: 18 * t, key: 'k' });                                                       // mist under the pond (background life)
  // reeds at the pond's edge, swaying (background life)
  inwReeds(212, 1112, { n: 6, h: 210, lean: -0.22, t: ev(3.6, 0.5), key: 'il1' });
  inwReeds(690, 1160, { n: 4, h: 130, lean: 0.2, t: ev(3.85, 0.5), key: 'il2' });
  // bamboo leaning in from the right: a pale far stalk, then the near one joint by joint, then its leaves
  inwBamboo(1056, 1960, 946, 430, { t: ev(cu.bambu + 0.12, 0.9), n: 8, w: 20, c: INW.pale, bend: 0.03, key: 'bambu2', leaves: [[0.9, -1, 3, 96]] });
  inwBamboo(985, 1960, 832, 280, { t: ev(cu.bambu, 1.0), n: 9, w: 30, c: INW.mid, bend: 0.05, key: 'bambu', leaves: [[0.93, -1, 5, 150], [0.8, -1, 4, 128], [0.86, 1, 3, 96], [0.66, -1, 3, 110]] });
  // the leaf: it lets go, rocks down and settles on the water
  const LEAF = [640, 880], fall = seg(TT, cu.leaf, cu.plop);
  if (TT >= cu.leaf) {
    const k = EZ.i2(fall) * 0.4 + fall * 0.6;
    inwLeaf(lerp(700, LEAF[0], k) + Math.sin(fall * 9) * 34 * (1 - fall), lerp(560, LEAF[1], k), 64, fall < 1 ? 0.5 + Math.sin(fall * 9) * 0.8 : 0.25, { key: 'gugur' });
    inwRipples(LEAF[0], LEAF[1] + 6, TT - cu.plop, { r: 120, sy: 0.38, key: 'rl' });
  }
  // the hero: Bangau glides down, lands in the pond with its wings up, folds them, then bows to look at the leaf
  if (TT >= cu.glide) {
    const g = seg(TT, cu.glide, cu.land), hx = 392, hy = 872;
    if (g < 1) inwHero(lerp(-140, hx, EZ.o2(g)), lerp(520, hy - 30, EZ.io(g)), lerp(120, CRANE_R, g), { pose: 'fly', flap: Math.cos(g * TAU * 1.5) * 0.9 + 0.1, key: 'bangau' });
    else {
      inwRipples(hx + 12, hy + CRANE_R * 0.86, TT - cu.land, { r: 170, sy: 0.34, n: 3, key: 'rb' });
      inwHero(hx, hy, CRANE_R, { wing: 1 - EZ.io(ev(cu.land + 0.08, 0.42)), wade: 0.28, bow: 0.62 * EZ.io(ev(cu.plop + 0.08, 0.34)), mood: TT >= cu.leaf && TT < cu.plop ? 'wow' : 'smile', key: 'bangau' });
    }
  }
  inwTag('Kolam');
  inwCaption('lalu *singgah* di kolam');
}
