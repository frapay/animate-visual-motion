// =====================================================================
//  SCENES — retro-80s demo. World coordinates 1080x1920; time TT on 1s. Content inside x 60-940, y 250-1500.
//  Era 1 "Senja": a sunset sky over a grid floor (horizon y = 1000). Era 2 "Pesta": a cream Memphis party wall
//  over a pink dance floor (horizon y = 1232). The grid floor and Kaset are the thread through both.
// =====================================================================
const cu = TIMELINE.cues;
const HY = 1000, HY2 = 1232;
// the bridge objects: nothing else may overlap them at the bridge, or it shows in the morph window
const SUN = { x: 520, y: 712, r: 200 };
const REC = { x: 530, y: 800, r: 225 };
const HERO_R = 104, FEET = 1292;                 // Kaset stands on y = FEET, clear of the caption bar (1338-1446)
const heroY = FEET - 0.95 * HERO_R;
// a damped squash after a landing at time t0
const landQ = (t0, amt = 0.16) => (TT < t0 ? 0 : amt * Math.exp(-(TT - t0) * 9) * Math.cos((TT - t0) * 24));

// ---- era 1: a cool 80s sunset
const sunY = () => springMove(cu.rise, HY + 250, SUN.y, SPRING.heavy);
const sunPts = () => r80SunPts(SUN.x, sunY(), SUN.r);
const TRI = [[520, 368], [886, 968], [154, 968]], TRI_C = [520, 968];
function sceneSenja() {
  r80Sky(HY, { sun: { x: SUN.x, y: SUN.y } });
  // sparkles popping on the beat, stripe clouds drifting, three gulls (background life)
  r80Twinkles('senja', { box: [90, 290, 930, 600], n: 2, s: [26, 52], avoid: [[40, 230, 330, 360], [300, 340, 740, 620]] });
  r80Cloud(196 + 10 * TT, 470, 230, { key: 'c1' });
  r80Cloud(826 - 8 * TT, 410, 184, { key: 'c2' });
  for (let i = 0; i < 3; i++) r80Bird(770 - 44 * TT + i * 62, 318 + i * 24 + 5 * Math.sin(TT * 3 + i), 20 - i * 3, Math.sin(TT * 9 + i * 1.3));
  // a chrome triangle springs up behind the sun, then a shine sweeps across it
  const tk = springEase(TT - cu.tri, 240, 17);
  if (tk > 0.02) {
    const sc = (P, k) => P.map(([x, y]) => [TRI_C[0] + (x - TRI_C[0]) * k, TRI_C[1] + (y - TRI_C[1]) * k]);
    const ce = [520, 768], outer = sc(TRI, tk), inner = sc(TRI.map(([x, y]) => [ce[0] + (x - ce[0]) * 0.74, ce[1] + (y - ce[1]) * 0.74]), tk);
    r80Chrome(outer, { hole: inner, bevel: 8, shine: seg(TT, cu.shine1, cu.shine1 + 0.6) });
  }
  // the sun rises from behind the horizon; its slats keep sliding down
  r80Sun(SUN.x, sunY(), SUN.r, { clipY: HY });
  // silhouette layers, each with its own parallax; they dip where the sun sits
  r80Range('far', HY, { amp: 250, step: 112, x: -6 * TT, gap: [SUN.x, 440, 0.06], sunX: SUN.x, stops: ['#9a45d6', '#4a1d8f'] });
  r80City('kota', HY, { amp: 150, x0: 650, x1: 1200, x: -12 * TT, stops: ['#5a22a6', '#2f1470'] });
  r80Range('near', HY, { amp: 140, step: 84, x: -18 * TT, gap: [SUN.x, 400, 0.04], sunX: SUN.x, stops: ['#4a1d8f', R80.indigo], lit: '#ff7fc0' });
  r80Floor(HY, { sun: { x: SUN.x }, speed: 1.1 });
  r80Palm(118, 1034, 470, { key: 'p1', lean: 0.45 });
  r80Palm(912, 1026, 390, { key: 'p2', lean: -0.55 });
  r80Twinkle(TRI[0][0], TRI[0][1] + 8, 96, cu.shine1 + 0.45);                                   // the shine leaves a sparkle on the apex
  r80Twinkle(SUN.x + SUN.r * 0.82, SUN.y - SUN.r * 0.82, 84, cu.jump);                          // one on the sun's rim (outside the disc)
  // Kaset tumbles in from the left in two hops, lands with a squash, bops on the beat, then jumps for joy
  const u = seg(TT, cu.roll, cu.land), e = EZ.o2(u), rolling = u < 1, jump = Math.sin(Math.PI * ev(cu.jump, 0.42));
  const bop = TT > cu.land + 0.2 ? r80Beat(BEAT) : 0, sq = landQ(cu.land) + landQ(cu.jump + 0.42, 0.14) + 0.06 * bop - 0.09 * jump;
  const wow = TT >= cu.jump && TT < cu.jump + 0.8;
  r80Twinkle(330, FEET - 4, 64, cu.land - 0.04, { dur: 0.35 });
  r80Hero(lerp(-160, 286, e), heroY, HERO_R, {
    tilt: rolling ? -(1 - e) * TAU : 0.07 * Math.sin(TT * TAU) * (1 - jump), lift: (rolling ? Math.abs(Math.sin(u * TAU)) * 64 : 0) + 100 * jump,
    sx: 1 + sq, sy: 1 / (1 + sq), step: rolling ? 0 : Math.sin(TT * TAU), mood: wow ? 'wow' : rolling ? 'happy' : 'smile', look: wow ? [0.6, -0.9] : [0.7, -0.4],
  });
  r80Tag('Senja');
  r80Caption('Senja *keren* era 80-an');
}

// ---- era 2: time for a music party
const recPts = () => r80SunPts(REC.x, REC.y, REC.r);
function scenePesta() {
  const t = TT - 3;
  r80Wall();
  r80Band(64, 96, 'check', { speed: 50 });
  r80Floor(HY2, { stops: ['#ff7ab6', R80.mag, R80.purple], c: R80.yellow, hc: R80.indigo, speed: 1.4, gap: 210, w: 8 });
  // Memphis confetti springs in on the 16ths, spins and pulses with the beat (background life)
  r80Confetti('pesta', 10, {
    box: [80, 370, 920, 1195], at: (i) => cu.pop + i * E16,
    avoid: [[REC.x - REC.r, REC.y - REC.r, REC.x + REC.r, REC.y + REC.r], [250, 360, 800, 545], [690, 560, 930, 650], [140, 1040, 380, HY2], [50, 240, 310, 350], [800, 680, 890, 1080]],
  });
  // notes float up beside the record
  if (t > 0.6) for (let i = 0; i < 3; i++) { const ph = mod((t - 0.6) * 0.45 + i / 3, 1); r80Note(838 + 26 * Math.sin(ph * TAU + i), lerp(1070, 700, ph), 64 * Math.sin(Math.PI * ph) ** 0.5, [R80.purple, R80.mag, R80.orange][i], 0.2 * Math.sin(ph * 9 + i)); }
  // the record the sun became: it spins, and sparkles pop on its shine
  r80Record(REC.x, REC.y, REC.r, { spin: t * 4 });
  r80Twinkle(REC.x + REC.r * 0.6, REC.y - REC.r * 0.62, 90, 4.25, { shadow: true });
  r80Twinkle(REC.x - REC.r * 0.62, REC.y + REC.r * 0.6, 70, 5.25, { shadow: true });
  // chrome lettering drops in, a shine sweeps across it, then a brush-script word is written under it
  const tk = springEase(TT - cu.title, 250, 15);
  if (tk > 0.02) { ctx.save(); ctx.translate(520, 522); ctx.rotate(-0.035); ctx.scale(tk, tk); r80ChromeText('ASYIK!', 0, 0, 190, { shine: seg(TT, cu.shine2, cu.shine2 + 0.5) }); ctx.restore(); }
  r80Twinkle(796, 388, 86, cu.shine2 + 0.4, { shadow: true });
  r80Script('banget', 806, 626, 78, R80.mag, { reveal: seg(TT, cu.script, cu.script + 0.3), rot: -0.12 });
  // Kaset dances: a bop on every beat, a sway, and a hop at the end
  const hop = Math.sin(Math.PI * ev(cu.hop, 0.4)), bop = r80Beat(BEAT), sq = 0.07 * bop + landQ(cu.hop + 0.4, 0.15) - 0.08 * hop;
  r80Hero(252, heroY + (HY2 + 60 - FEET), HERO_R, {
    tilt: 0.12 * Math.sin(TT * TAU) * (1 - hop), lift: 12 * bop + 96 * hop, sx: 1 + sq, sy: 1 / (1 + sq), step: Math.sin(TT * TAU),
    mood: t < 0.75 ? 'wow' : 'happy', look: [0.7, -0.5],
  });
  r80Tag('Pesta', { c: R80.yellow });
  r80Caption('Saatnya *pesta* musik!');
}
