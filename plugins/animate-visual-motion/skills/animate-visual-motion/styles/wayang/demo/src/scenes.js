// =====================================================================
//  SCENES — wayang demo. World units = px at zoom 1; motion on 2s. Everything stands on the stage line
//  (WY_STAGE, 1530); the stage band, the top border and the flicker are drawn by STYLE.post.
// =====================================================================
const cu = TIMELINE.cues;
const GUN = { x: 540, x2: 715, h: 900 };
const MTN = { x: 540, w: 1000, h: 880 };
const HERO_S = 740;

// ---- era 1: the opening — the gunungan spins on its rod and steps aside; the puppet walks in and presents it
function sceneOpen() {
  wyScreen(WY.amber);
  wyMotes(28, 'open');
  const x = springMove(cu.aside, GUN.x, GUN.x2, SPRING.heavy);
  const spin = EZ.io(seg(TT, cu.spin, cu.spin + 1.1)) * TAU;
  const dt = TT - cu.aside, tilt = dt > 0 ? 0.11 * Math.sin(dt * 7) * Math.exp(-dt * 1.8) * (1 - ev(2.6, 0.35)) : 0;
  wyGunungan(x, WY_STAGE, GUN.h, { turn: Math.cos(spin), tilt });
  const walking = TT >= cu.walk && TT < cu.stop;
  const hx = lerp(-320, 200, EZ.o2(seg(TT, cu.walk, cu.stop)));
  wyPuppet(hx, WY_STAGE, HERO_S, { key: 'hero', walk: walking ? (TT - cu.walk) * TAU * 1.5 : null, stop: cu.stop, reach: EZ.o2(ev(cu.present, 0.4)) });
  wyTag('BABAK I');
  wyCaption('Pada zaman\ndahulu kala…');
}

// ---- era 2: the village at the foot of the mountain
const rise = (t0) => (1 - EZ.o3(ev(t0, 0.5))) * 760;
function sceneVillage() {
  wyScreen(WY.dusk);
  wyMotes(28, 'village');
  wyMountain(880, WY_STAGE, 620, 560, { key: 'back', depth: 1 });
  wyMountain(MTN.x, WY_STAGE, MTN.w, MTN.h, { key: 'main', depth: 0.85 });
  for (let i = 0; i < 3; i++) {
    const t0 = cu.birds + i * 0.18, bx = 1160 - (TT - t0) * 300 - i * 30, by = 720 + i * 60 + Math.sin(TT * 3 + i) * 12;
    if (TT > t0) wyBird(bx, by, 70 - i * 10, i * 1.3);
  }
  wyHouse(690, WY_STAGE + rise(cu.house), 330, { depth: 0.25 });
  wyTree(70, WY_STAGE + rise(cu.trees), 430, { key: 'left', depth: 0.4 });
  wyTree(1020, WY_STAGE + rise(cu.trees + 0.12), 600, { key: 'right', depth: 0.3 });
  const walking = TT >= cu.walk2 && TT < cu.stop2;
  const hx = lerp(-320, 290, EZ.o2(seg(TT, cu.walk2, cu.stop2)));
  wyPuppet(hx, WY_STAGE, HERO_S, { key: 'hero', walk: walking ? (TT - cu.walk2) * TAU * 1.5 : null, stop: cu.stop2, wave: TT > cu.wave, reach: 0.55 * EZ.o2(ev(cu.wave, 0.3)) });
  wyTag('BABAK II');
  wyCaption('di sebuah desa\ndi kaki gunung');
}
