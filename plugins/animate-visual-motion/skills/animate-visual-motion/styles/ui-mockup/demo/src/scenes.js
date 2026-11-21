// =====================================================================
//  SCENES — ui-mockup demo. World coordinates 1080x1920; time TT on 1s. Screens are drawn in each device's own
//  logical units (the phone's screen is 280 wide, the browser's page 480); g.at(lx, ly) turns a screen point into a
//  world point for the pointer, the lens and the call-outs. Content inside x 60-940, y 250-1500.
// =====================================================================
const cu = TIMELINE.cues;
// ---- era 1: the phone
const PH = { x: 480, y: 965, h: 1060 }, PHO = { tilt: -0.022, tilt0: 0.075, in: -0.3, from: [0, 130], float: 3, vw: 280 };
const ICON = { x: 815, y: 590, s: 168 };                      // the hero and the bridge object: nothing else may overlap it at the bridge
const TASK = 'Call the lab';
const ROWS = [['AN', 'Review deck', 'Ana · 2 pm', 0], ['KA', 'Send invoice', 'Kai · 4 pm', 1], ['MI', 'Book venue', 'Mia · Fri', 3]];
const LIST = { y: 104, rh: 68 }, FIELD = { x: 14, y: 458, w: 252, h: 54 };

function phoneScreen(v) {
  const added = uiAt(cu.add), ins = uiSpring(cu.add), n = added ? 0 : uiTyped(TASK, cu.type), press = uiPress(cu.add);
  const focus = (uiAt(cu.tap) ? EZ.o3(seg(TT + 1 / FPS, cu.tap, cu.tap + 0.15)) : 0) * (1 - EZ.o3(seg(TT, cu.add + 0.04, cu.add + 0.3)));
  uiNav(v, 'Today', { chip: (added ? 4 : 3) + ' open', chipOn: added ? 1 - seg(TT, cu.add + 0.45, cu.add + 0.75) : 0 });
  // the list: three rows resolve out of skeletons; the new task opens a row at the top and pushes the rest down
  uiScroll(0, LIST.y, v.w, LIST.rh * 4 + 6, 0, () => {
    uiRow(0, LIST.y, v.w, LIST.rh, { initials: 'ME', tint: 2, title: TASK, sub: 'You · Today', right: 'check', k: ins, hi: added ? 1 - seg(TT, cu.add + 0.5, cu.add + 1.0) : 0 });
    ROWS.forEach(([ini, title, sub, tint], i) => {
      const y = LIST.y + (i + ins) * LIST.rh, k = EZ.o3(seg(TT, cu.load + i * 0.09, cu.load + i * 0.09 + 0.22));
      uiResolve(k, () => uiSkelRow(0, y, v.w, LIST.rh, { sweep: [0, v.w], key: i }), () => uiRow(0, y, v.w, LIST.rh, { initials: ini, tint, title, sub, right: 'check' }));
    });
  });
  // the field: focused by the first tap, typed into key by key, emptied by the add button
  uiField(FIELD.x, FIELD.y, FIELD.w, FIELD.h, { text: TASK, n, placeholder: 'Add a task', focus, typing: n > 0 && n < TASK.length, size: 17 });
  uiButton(FIELD.x + FIELD.w - 47, FIELD.y + 7, 40, 40, '', { glyph: 'up', press, kind: n > 0 || press > 0 ? 'primary' : 'plain', size: 22 });
  uiTabBar(v, ['list', 'chart', 'user'], 0);
}
function scenePhone() {
  uiGround(UI.ground, { glow: [PH.x + 50 + Math.sin(TT * 0.7) * 36, 930 + Math.cos(TT * 0.5) * 28, 700] });
  uiDrift('phone', 7);
  const g = uiPhone(PH.x, PH.y, PH.h, PHO, phoneScreen);
  // the hero: the app's icon floats at the phone's shoulder and jumps when its task lands
  uiAppIcon(ICON.x, ICON.y, ICON.s, { kick: cu.kick, bob: 1 - seg(TT, 2.1, 2.45), k: springEase(TT + 0.22, 200, 17) });
  // the banner drops over the top of the phone
  uiToast(240, 440, 480, { t0: cu.toast, title: 'Task added', sub: TASK + ' · Today', h: 104 });
  // label chips
  const btn = g.at(FIELD.x + FIELD.w - 27, FIELD.y + 27), row = g.at(11, LIST.y + LIST.rh / 2);
  uiCallout('One tap', 818, 1232, btn[0] + 24, btn[1] - 22, { k: uiSpring(cu.add + 0.08, SPRING.smooth) });
  uiCallout('Synced', 150, 690, row[0], row[1], { k: uiSpring(cu.kick + 0.1, SPRING.smooth), size: 26 });
  // the touch: taps the field, waits below while the keys land, taps add, leaves
  const f = g.at(150, FIELD.y + 27), rest = g.at(168, 548);
  uiTap([[0.1, 850, 1400], [cu.tap, f[0], f[1], 'click'], [1.0, rest[0], rest[1]], [cu.add, btn[0], btn[1], 'click'], [2.3, 850, 1420]], { out: 2.15 });
  uiTag('Quick add');
  uiCaption('Add it in *one tap*');
}

// ---- era 2: the browser
const BR = { x: 500, y: 941.5, w: 840, h: 947 }, BRO = { vw: 480, bar: 72, url: 'app.example/week' };
const PAGE = { seg: { x: 276, y: 18, w: 184, h: 40 }, kpi: { x: 20, y: 74, w: 194, h: 132 }, dig: { x: 228, y: 74, w: 232, h: 132 }, chart: { x: 20, y: 222, w: 440, h: 210 }, team: { x: 20, y: 448, w: 440, h: 180 } };
const MINE = [3, 4, 3, 5, 6, 2, 1], TEAM = [10, 13, 19, 22, 15, 11, 6], DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SCROLL = 60, pageScroll = () => SCROLL * EZ.io(seg(TT, cu.scroll, cu.scroll + 0.45));
const barK = (i) => uiSpring(cu.seg + i * 0.03, { k: 210, d: 17 });                     // each bar answers the click, a little after its neighbour
const chartBox = () => { const c = PAGE.chart; return [c.x + 18, c.y + 52, c.w - 36, c.h - 64]; };
const chartVals = () => MINE.map((m, i) => lerp(m / 10, TEAM[i] / 25, barK(i)));
const chartHi = () => (barK(3) > 0.5 ? 3 : 4);
const chartOpt = () => ({ max: 1, head: 36, labels: DAYS, size: 14, hi: chartHi(), value: chartHi() === 3 ? Math.round(lerp(5, 22, clamp(barK(3)))) : 6 });
const kpiPts = () => { const g = uiBrowserGeo(BR.x, BR.y, BR.w, BR.h, BRO), c = PAGE.kpi; return rrectPts(c.x, c.y, c.w, c.h, 22, 8).map(([x, y]) => g.at(x, y)); };

function browserPage(v) {
  const team = uiAt(cu.seg), on = uiSpring(cu.toggle);
  uiScroll(0, 0, v.w, v.h, pageScroll(), () => {
    // the header: the app's icon, the page title, the view switch
    uiAppIcon(40, 38, 36, { shadow: 1, bob: 0 });
    uiText('This week', 68, 48, 26, UI.ink, { weight: 700 });
    uiSeg(PAGE.seg.x, PAGE.seg.y, PAGE.seg.w, PAGE.seg.h, ['Mine', 'Team'], uiSpring(cu.seg), { size: 16 });
    // the count card (the bridge object): the number runs up when the view changes
    const c = PAGE.kpi;
    uiCard(c.x, c.y, c.w, c.h, { fill: UI.accent, line: null, shadow: 2, r: 22 }, () => {
      uiText('Tasks done', c.x + 18, c.y + 38, 17, 'rgba(255,255,255,0.86)', { weight: 600 });
      uiText(uiCount(cu.seg, 0.7, 24, 96), c.x + 17, c.y + 106, 60, '#ffffff', { weight: 700 });
      uiCirc(c.x + c.w - 32, c.y + 32, 15); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill(); uiGlyph('up', c.x + c.w - 32, c.y + 32, 7.5, '#ffffff', { w: 0.3 });
    });
    // the digest card: its toggle answers the second click
    const d = PAGE.dig;
    uiCard(d.x, d.y, d.w, d.h, { r: 22, press: uiPress(cu.toggle) * 0.5 }, () => {
      uiText('Weekly digest', d.x + 18, d.y + 40, 19, UI.ink, { weight: 600 });
      uiText(uiAt(cu.toggle) ? 'On · Mondays' : 'Off', d.x + 18, d.y + 67, 16, uiAt(cu.toggle) ? UI.accent : UI.ink2);
      uiToggle(d.x + d.w - 18 - 58, d.y + d.h - 18 - 35, 58, on);
    });
    // the chart card
    const h = PAGE.chart;
    uiCard(h.x, h.y, h.w, h.h, { r: 22 }, () => {
      uiText('Completed', h.x + 18, h.y + 37, 19, UI.ink, { weight: 600 });
      uiText(team ? 'Team · 7 days' : 'You · 7 days', h.x + h.w - 18, h.y + 37, 16, UI.ink2, { align: 'right' });
      uiChart(...chartBox(), chartVals(), chartOpt());
    });
    // further down the page: who did the most (the scroll brings it up)
    const m = PAGE.team;
    uiCard(m.x, m.y, m.w, m.h, { r: 22 }, () => {
      uiText('Most active', m.x + 18, m.y + 37, 19, UI.ink, { weight: 600 });
      uiRow(m.x + 2, m.y + 50, m.w - 4, 62, { initials: 'AN', tint: 0, title: 'Ana', sub: '31 done' });
      uiRow(m.x + 2, m.y + 112, m.w - 4, 62, { initials: 'KA', tint: 1, title: 'Kai', sub: '27 done', sep: false });
    });
  });
}
function sceneBrowser() {
  uiGround(UI.groundD, { glow: [560 + Math.sin(TT * 0.6) * 44, 860 + Math.cos(TT * 0.45) * 30, 780] });
  uiDrift('browser', 7, { dark: true });
  const device = () => uiBrowser(BR.x, BR.y, BR.w, BR.h, BRO, browserPage), g = device();
  // the lens: the peak of the chart, magnified
  const pk = uiChartPts(...chartBox(), chartVals(), chartOpt())[chartHi()], src = g.at(pk.x, pk.y - 16 - pageScroll());
  uiZoom(src[0], src[1], 62, 772, 1336, 108, { k: uiSpring(cu.lens, SPRING.smooth) }, device);
  // the banner drops over the window's corner
  uiToast(566, 462, 360, { t0: cu.toast2, title: 'Digest on', sub: 'Mondays, 9 am', glyph: 'bell', h: 100 });
  // the cursor: switches the view, waits while the page scrolls, flips the toggle, moves off
  const sg = g.at(PAGE.seg.x + PAGE.seg.w * 0.75 + 26, PAGE.seg.y + 27), tg = g.at(PAGE.dig.x + PAGE.dig.w - 44, PAGE.dig.y + PAGE.dig.h - 34 - SCROLL), off = g.at(392, 262);
  uiCursor([[3.4, 930, 1240], [cu.seg, sg[0], sg[1], 'click'], [cu.toggle, tg[0], tg[1], 'click'], [5.6, off[0], off[1]]]);
  uiTag('Insights', { dark: true });
  uiCaption('Watch it *add up*', { dark: true });
}
// the camera pushes slowly toward the part being used, anchored on the device's top edge (captions sit above it)
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.5, 1.7, { z: 1.07, p: [PH.x, PH.y - PH.h / 2], to: [PH.x, PH.y - PH.h / 2] }, 2.1, 2.45);
  return push(t, 3.6, 5.4, { z: 1.05, p: [BR.x, BR.y - BR.h / 2], to: [BR.x, BR.y - BR.h / 2] });
}
