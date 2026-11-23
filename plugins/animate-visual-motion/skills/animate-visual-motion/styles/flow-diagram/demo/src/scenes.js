// =====================================================================
//  SCENES — flow-diagram demo. World units = px at zoom 1; time TT on 1s. Content inside x 60-940, y 250-1500.
//  Era 1: the flow builds down the frame. Era 2: the decision branches. Node boxes are 640 wide (73% of the safe
//  width), titles 46-48px, mono labels and chips 30px+.
// =====================================================================
const cu = TIMELINE.cues;
const HR = 40;   // the hero's half size

// ---- layouts (geometry only: edges are routed from these before anything is drawn)
const L1 = fdStack([{ id: 'pesan' }, { id: 'bayar' }, { id: 'lunas', shape: 'diamond', w: 440, h: 256 }], { x: 500, y: 581, w: 640, h: 170, gap: 96 });
const L2 = fdStack([
  { id: 'lunas', shape: 'diamond', w: 320, h: 250 },
  { id: 'coba', side: 1, branch: 535, w: 330, h: 170 },           // the "no" branch sits beside the decision
  { id: 'kirim', gap: 120, dx: 160, h: 160 },
  { id: 'sampai', shape: 'pill', gap: 96, dx: 160, h: 150 },
], { x: 240, y: 645, w: 640 });
const LENS = { x: L2.by.lunas.x, y: L2.by.lunas.y, r: 160 };   // the circle the morph ends on: a lens over the decision

// ---- era 1: Pesan -> Bayar -> Lunas?
function sceneFlow() {
  const { pesan, bayar, lunas } = L1.by;
  fdGround();
  fdGroup(120, 430, 760, springTrack([[0, 280], [cu.e1, 546]], SPRING.smooth), 'APLIKASI');   // the container grows as the flow does
  // edges: each draws just before its node pops, and carries the signal colour while the hero rides it
  const e1 = fdEdge(pesan, bayar, { t0: cu.e1, d: 0.3, active: [cu.go1, cu.at2] });
  const e2 = fdEdge(bayar, lunas, { t0: cu.e2, d: 0.3, active: [cu.go2, cu.at3] });
  fdFlow(e1, { t0: cu.at2 }); fdFlow(e2, { t0: cu.at3 });
  fdNode(pesan, { title: 'Pesan', sub: 'pilih barang', icon: 'cart', color: FD.blue, step: 1, active: [-1, cu.go1], done: cu.go1 });
  fdNode(bayar, { title: 'Bayar', sub: 'transfer', icon: 'card', color: FD.violet, step: 2, t0: cu.n2, active: [cu.at2, cu.go2], done: cu.go2 });
  fdNode(lunas, { title: 'Lunas?', color: FD.amber, step: 3, t0: cu.n3, active: cu.at3 });
  fdNote(838, 1040, 'otomatis', { t0: cu.note, to: [652, 1114] });
  // the hero: the packet. It rides each edge and lands as the node lights.
  const h = fdWalk([
    { from: fdSeat(pesan, HR), path: e1, to: fdSeat(bayar, HR), t0: cu.go1, d: 0.5 },
    { from: fdSeat(bayar, HR), path: e2, to: fdSeat(lunas, HR), t0: cu.go2, d: 0.5 },
  ]);
  fdHero(h.x, h.y, HR, { key: 'hero', squash: h.squash, look: h.look, lookY: h.lookY, trail: h.trail, idle: !h.moving, mood: TT >= cu.at3 + 0.1 ? 'wow' : 'idle' });
  fdTitle('ALUR PESANAN', 'Cara pesananmu sampai', { at: -1 });
  fdProgress(5, TT < cu.at2 ? 1 : TT < cu.at3 ? 2 : 3, { at: -1 });
  fdCaption('Pesan dulu, lalu *bayar*', { at: -1 });
}

// ---- era 2: ya -> Kirim -> Sampai, tidak -> a retry loop
function sceneBranch() {
  const { lunas, kirim, coba, sampai } = L2.by;
  const seatK = [lunas.x + 100, kirim.top[1] - HR * 0.96];                 // the hero's seat on Kirim: beside where the "ya" edge lands
  fdGround();
  fdEdge([lunas.x, 418], lunas);                                           // where the flow came from
  fdEdge(lunas, coba, { t0: cu.tidak, d: 0.35, label: 'tidak', labelAt: 0.42, dim: true, dimTo: 0.85 });
  fdEdge(coba, [lunas.x + 10, 446], { from: 'top', to: 'right', via: [[coba.x, 446]], t0: cu.loop, d: 0.5, dashed: true, march: 46, dim: true, dimTo: 0.85 });
  const ya = fdEdge(lunas, [lunas.x, kirim.top[1] - 5], { t0: cu.ya, d: 0.3, label: 'ya', labelColor: FD.green, active: [cu.go3, cu.at4] });
  const e4 = fdEdge(kirim, sampai, { t0: cu.e4, d: 0.3, active: [cu.go4, cu.at5] });
  fdFlow(ya, { t0: cu.at4 }); fdFlow(e4, { t0: cu.at5 });
  fdPing(sampai.x, sampai.y, cu.at5, { r: 300, d: 0.7 });
  fdNode(lunas, { title: 'Lunas?', size: 46, color: FD.amber, step: 3, active: [-1, cu.go3], done: cu.go3 });
  fdNode(coba, { title: 'Coba lagi', sub: 'bayar ulang', size: 44, t0: cu.nCoba, dim: true, dimTo: 0.78 });
  fdNode(kirim, { title: 'Kirim', sub: 'kurir jemput', icon: 'truck', color: FD.blue, step: 4, t0: cu.nKirim, active: [cu.at4, cu.go4], done: cu.go4 });
  fdNode(sampai, { title: 'Sampai', sub: 'di rumahmu', icon: 'home', color: FD.green, step: 5, t0: cu.nSampai, active: cu.at5, done: cu.at5 });
  fdBadge(834, sampai.y, 'SELESAI', { t0: cu.end, color: FD.green });
  const h = fdWalk([
    { from: fdSeat(lunas, HR), path: ya, to: seatK, t0: cu.go3, d: 0.5 },
    { from: seatK, path: e4, to: fdSeat(sampai, HR), t0: cu.go4, d: 0.5 },
  ]);
  fdHero(h.x, h.y, HR, { key: 'hero', squash: h.squash, look: h.look, lookY: h.lookY, trail: h.trail, idle: !h.moving, mood: TT >= cu.at5 ? 'happy' : 'idle' });
  fdTitle('KEPUTUSAN', 'Lunas atau belum?', { color: FD.amber });
  fdProgress(5, TT < cu.at4 ? 3 : TT < cu.at5 ? 4 : 5);
  fdCaption('Lunas? Paket *langsung dikirim*', { at: 0.5 });
}
