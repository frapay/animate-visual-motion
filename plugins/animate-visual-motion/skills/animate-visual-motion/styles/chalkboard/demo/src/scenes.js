// =====================================================================
//  SCENES — chalkboard demo. World coordinates 1080x1920 (the board); time TT on 2s; ev / popS for events.
// =====================================================================
const SUN = { x: 500, y: 820, r: 170 };
const EARTH = { x: 500, y: 820, r: 165 };

// ---- era 0: the sun
function sceneSun() {
  const cu = TIMELINE.cues;
  chBoard();
  // last lesson, still on the board, wiped away by the eraser (signature motion)
  chText('2 × 3 = 6', 590, 478, 60, { key: 'old', col: CH.white });
  chUnderline(590, 830, 500, { col: CH.white, w: 5, key: 'oldu' });
  const wf = ev(cu.wipe, 0.65);
  chWipe([[520, 455], [680, 447], [840, 462], [990, 452]], 150, EZ.io(wf), { key: 'wipe0' });
  const lift = ev(cu.wipe + 0.65, 0.3);   // follow-through: the eraser lifts off the board and leaves to the right
  if (wf >= 1 && lift < 1) { ctx.save(); ctx.globalAlpha = 1 - lift * lift; chEraser(990 + 190 * EZ.i2(lift), 452 - 26 * Math.sin(Math.PI * lift * 0.5), Math.PI / 2 + 0.25 * lift, (150 / 180) * (1 + 0.12 * lift)); ctx.restore(); }
  // twinkling margin stars
  chTwinkle(880, 880, 30, { key: 'tw1', ph: 0 }); chTwinkle(930, 1090, 22, { key: 'tw2', ph: 1 }); chTwinkle(120, 640, 26, { key: 'tw3', ph: 2, col: CH.white });
  // the sun: outline chalked in (the stick follows it), scribbled yellow, rays flick out and turn slowly
  const f = ev(cu.sun, 1.0);
  chSun(SUN.x, SUN.y, SUN.r, { frac: f, turn: TT * 0.15, key: 'sun' });
  if (f > 0 && f < 0.75) {
    const tip = f < 0.4 ? chTip(chLoopPts(SUN.x, SUN.y, SUN.r, SUN.r, 0.08), f / 0.4) : [SUN.x - 140 + 280 * ((B % 4) / 3), SUN.y - 100 + 200 * seg(f, 0.4, 0.75)];
    chStick(tip[0], tip[1], -0.8 + 0.06 * Math.sin(B * 1.7), 1, CH.yellow);
  }
  // its temperature writes itself where the old sum was; a yellow ring and an arrow tie it to the sun
  const [t0, t1] = chText('suhu ± 5.500°C', 450, 478, 60, { frac: ev(cu.temp, 0.4), key: 'temp' });
  const e = chTextEntry('suhu ± 5.500°C', 60, CH.white, 700), kx = t0 + e.xs[7];
  chCircle((kx + t1) / 2 + 4, 458, (t1 - kx) / 2 + 16, 50, { frac: ev(cu.ring - 0.2, 0.25), key: 'ring' });   // lands on the beat
  chArrow(arcPts(710, 540, 150, -0.15, Math.PI / 2 - 0.1, 14), { frac: ev(cu.ring + 0.05, 0.3), key: 'arr0', col: CH.white });
  // the hero: points at the sun, eyes wide once it's lit
  const lit = TT >= cu.sun + 0.75, hop = Math.sin(Math.PI * ev(cu.ring, 0.25));
  chHero(200, 1075 - 40 * hop, 92, { key: 'hero', mood: lit ? 'wow' : 'calm', look: [0.8, -0.7], arms: [-0.7, lit ? 0.95 : -0.6], sy: 1 + 0.05 * hop, sx: 1 - 0.04 * hop });
  chTag('Pelajaran 1');
  chCaption(['Matahari adalah', 'sebuah bintang'], [1, 'bintang', 'underline']);
}

// ---- era 1: the Earth
function sceneEarth() {
  const cu = TIMELINE.cues;
  chBoard();
  // the moon's orbit (faint, dry chalk), a written-on arrow riding it, the moon going round on 2s
  const ORB = (a) => [EARTH.x + Math.cos(a) * 275, EARTH.y + Math.sin(a) * 255];
  const orbit = []; for (let i = 0; i <= 60; i++) orbit.push(ORB(i / 60 * TAU));
  chLine(orbit, { w: 4, key: 'orbit', a: 0.55, press: 0.5, dens: 0.7 });
  const arc = []; for (let i = 0; i <= 16; i++) arc.push(ORB(-2.6 + i / 16 * 1.3));
  chArrow(arc, { frac: ev(cu.arrow, 0.35), key: 'oarr', col: CH.pink, w: 6 });
  const ma = 0.6 + (TT - 3) * 1.1, [mx, my] = ORB(ma);
  chFill(ellipsePts(mx, my, 34, 34, 0, 20), CH.dim, { key: 'moonf', gap: 9, a: 0.7, base: 0.2 });
  chLine(ellipsePts(mx, my, 34, 34, 0, 20), { closed: true, w: 5, key: 'moon', step: 7 });
  // the Earth (the bridge's counterpart): blue scribble, its land scribbles in
  chEarth(EARTH.x, EARTH.y, EARTH.r, { frac: lerp(0.72, 1, ev(3.2, 0.5)), key: 'earth' });
  // the fact writes itself, gets a yellow underline and a green tick
  const FACT = '1 putaran ≈ 27 hari';
  const [x0, x1] = chText(FACT, CX, 478, 56, { align: 'center', frac: ev(cu.month, 0.7), key: 'month' });
  const e = chTextEntry(FACT, 56, CH.white, 700);
  chUnderline(x0 + e.xs[FACT.indexOf('27')], x1, 500, { frac: ev(cu.month + 0.8, 0.2), key: 'yu' });
  chTick(x1 + 70, 460, 1, { frac: ev(cu.tick, 0.2), key: 'ytick' });
  // twinkles
  chTwinkle(140, 640, 24, { key: 'tw4', ph: 1 }); chTwinkle(900, 960, 28, { key: 'tw5', ph: 2 });
  // the hero waves from the right and hops on the beat
  const hop = Math.max(Math.sin(Math.PI * ev(cu.hop1, 0.25)), Math.sin(Math.PI * ev(cu.hop2, 0.25)));
  const wave = 1.0 + 0.45 * ((B % 4) < 2 ? 1 : -1);
  chHero(820, 1110 - 50 * hop, 88, { key: 'hero', mood: 'happy', look: [-0.6, -0.6], arms: [wave, -0.6], sy: 1 + 0.06 * hop, sx: 1 - 0.04 * hop });
  chTag('Pelajaran 2');
  chCaption(['Bulan mengelilingi', 'Bumi'], [1, 'Bumi', 'circle', CH.yellow]);
}
