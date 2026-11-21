// =====================================================================
//  styles/graffiti/kit.js — GRAFFITI: spray paint on a city wall. The ground is a wall (painted brick or raw concrete
//  with mortar lines, stains, buffed patches and a faded old tag). Paint is aerosol and matte, in two behaviours:
//    FREEHAND SPRAY  grfSpray / grfLine / grfDot — soft dithered edges, overspray specks, drips with a bead
//    STENCIL         grfStencil / grfPiece / grfText — crisp cut edges with small ties, a halo of overspray, a card
//                    that slaps on, is sprayed over and peels off
//  plus bubble lettering (grfWord: thick outline, 3D block, speckled fade, shine).
//
//  How it works: a shape is drawn as an alpha MASK on a scratch canvas (same transform as the real one). Its edge is
//  broken up by stroking the outline with cached seeded SPECK TILES (fine / mid / dense dots), adding specks outside
//  and punching holes inside, so the falloff is dithered like real aerosol, never a smooth blur. The mask is then cut
//  by the path of an invisible can (speckle at the front, solid behind), tinted and laid on the wall. All the
//  thousands of specks live in three 384 px tiles and the wall caches; nothing is regenerated per frame.
//  After the paint, grfDone() lays the wall's relief (mortar grooves, pores) back over it, so paint sits IN the wall.
//  Built on kit/core.js. Motion on 1s. Helpers are prefixed grf…; the palette is GRF. Needs from the piece head: CX.
//  Optional in the piece: const GRF_ERA_WALL = ['brick', 'concrete'] (each era's wall, for the morph backdrop).
// =====================================================================
const GRF = {
  brick: '#84493a', brickD: '#5c3128', mortar: '#8d8076',     // WALL 1: painted brick, its dark bricks, its mortar
  concrete: '#8b8d8c', concreteD: '#5d6061',                   // WALL 2: raw concrete, its shadows
  buff: '#8e877d',                                             // grey buff paint rolled over old work: the morph's ground
  pink: '#ff2e93', cyan: '#19c8e6', lime: '#a8e22a', yellow: '#ffd21f', white: '#f4f1e8', black: '#16141a',   // PAINT
  pinkD: '#b0125e', cyanD: '#0a7890', limeD: '#5c8a10', yellowD: '#c48a00',                                    // shadow-layer shades
  card: '#b89c72',                                             // the stencil card (a prop: it never stays in the frame)
};
const GRF_BUBBLE = '"Arial Rounded MT Bold", "Varela Round", "Baloo 2", "Nunito", "Segoe UI Black", "Arial Black", "DejaVu Sans", "Liberation Sans", Arial, sans-serif';
const GRF_BLOCK = '"Arial Black", "Segoe UI Black", "Helvetica Neue", "DejaVu Sans", "Liberation Sans", Arial, sans-serif';

// ---------------------------------------------------------------------
//  colour: hex or rgb() in, rgb() out
// ---------------------------------------------------------------------
function grfRGB(c) { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
const grfMix = (a, b, u) => { const x = grfRGB(a), y = grfRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const grfLift = (c, k) => grfMix(c, '#ffffff', k);
const grfShade = (c, k) => grfMix(c, '#08060c', k);

// ---------------------------------------------------------------------
//  speck tiles (the only place specks are generated) and patterns made from them
//    'fine' ~4% cover (far overspray)   'mid' ~20%   'dense' ~55% (the edge of a fill)   'blotch' soft density clouds
// ---------------------------------------------------------------------
const GRF_TILE = {}, GRF_PAT = new Map(), GRF_TS = 384;
function grfTile(kind) {
  if (GRF_TILE[kind]) return GRF_TILE[kind];
  const S = GRF_TS, c = GRF_TILE[kind] = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = RNG('grftile', kind);
  if (kind === 'blotch') {
    for (let i = 0; i < 40; i++) {
      const x = R.r(0, S), y = R.r(0, S), r = R.r(24, 80), a = R.r(0.25, 0.9);
      for (const [ox, oy] of [[0, 0], [-S, 0], [0, -S], [-S, -S], [S, 0], [0, S]]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); }
    }
    return c;
  }
  const [n, a, b] = { fine: [2300, 0.5, 1.35], mid: [8200, 0.6, 1.6], dense: [20000, 0.7, 1.9] }[kind];
  g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = R.r(0, S), y = R.r(0, S), r = R.r(a, b);
    for (const ox of x + r > S ? [0, -S] : [0]) for (const oy of y + r > S ? [0, -S] : [0]) { g.moveTo(x + ox + r, y + oy); g.arc(x + ox, y + oy, r, 0, TAU); }
  }
  g.fill();
  return c;
}
// a repeating pattern of a tile, in black (for masks) or tinted with colour c (to stroke / fill straight onto the wall)
function grfPat(kind, c) {
  const id = kind + '|' + (c || ''); let p = GRF_PAT.get(id); if (p) return p;
  if (GRF_PAT.size > 80) GRF_PAT.clear();
  let t = grfTile(kind);
  if (c) { const d = document.createElement('canvas'); d.width = d.height = GRF_TS; const dg = d.getContext('2d'); dg.drawImage(t, 0, 0); dg.globalCompositeOperation = 'source-in'; dg.fillStyle = c; dg.fillRect(0, 0, GRF_TS, GRF_TS); t = d; }
  p = ctx.createPattern(t, 'repeat'); GRF_PAT.set(id, p); return p;
}

// ---------------------------------------------------------------------
//  scratch canvases: grfOn(i, bb, draw) swaps ctx to scratch i (same transform, cleared and clipped to the world box
//  bb), runs draw(), swaps back and returns the box in screen px. grfStamp tints a mask and lays it on the current ctx;
//  grfLay lays a scratch that was drawn in colour.
// ---------------------------------------------------------------------
const GRF_S = [];
function grfScr(i) { if (!GRF_S[i]) { const c = document.createElement('canvas'); c.width = W; c.height = H; GRF_S[i] = { c, g: c.getContext('2d') }; } return GRF_S[i]; }
function grfSBox(bb, m) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x1, bb.y1], [bb.x0, bb.y1]]) { const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
  x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2); x1 = Math.min(W, Math.ceil(x1) + 2); y1 = Math.min(H, Math.ceil(y1) + 2);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
function grfOn(i, bb, draw) {
  const S = grfScr(i), g = S.g, m = ctx.getTransform(), sb = grfSBox(bb, m); if (!sb) return null;
  const keep = ctx;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowColor = 'transparent'; g.filter = 'none'; g.setLineDash([]);
  g.clearRect(sb.x, sb.y, sb.w, sb.h); g.beginPath(); g.rect(sb.x, sb.y, sb.w, sb.h); g.clip();
  g.setTransform(m); g.fillStyle = g.strokeStyle = '#000'; g.lineJoin = g.lineCap = 'round';
  ctx = g; try { draw(sb); } finally { ctx = keep; g.restore(); }
  return sb;
}
function grfStamp(i, sb, c, al = 1, op = 'source-over') {
  const S = grfScr(i), g = S.g;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(sb.x, sb.y, sb.w, sb.h); g.clip(); g.globalCompositeOperation = 'source-in'; g.fillStyle = c; g.fillRect(sb.x, sb.y, sb.w, sb.h); g.restore();
  grfLay(i, sb, al, op);
}
function grfLay(i, sb, al = 1, op = 'source-over') {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ctx.globalAlpha * al; ctx.globalCompositeOperation = op;
  ctx.drawImage(grfScr(i).c, sb.x, sb.y, sb.w, sb.h, sb.x, sb.y, sb.w, sb.h); ctx.restore();
}

// ---------------------------------------------------------------------
//  outlines. A shape is one outline [[x, y], ...] or a list of outlines (drawn as their union).
// ---------------------------------------------------------------------
const grfMulti = (P) => (Array.isArray(P[0][0]) ? P : [P]);
const grfFlat = (P) => (Array.isArray(P[0][0]) ? P.flat() : P);
function grfSub(Q, sharp) {   // add one closed outline to the current path: straight cuts (sharp) or a smooth hand curve
  const n = Q.length; if (n < 2) return;
  if (sharp) { ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(Q[i][0], Q[i][1]); }
  else { ctx.moveTo((Q[n - 1][0] + Q[0][0]) / 2, (Q[n - 1][1] + Q[0][1]) / 2); for (let i = 0; i < n; i++) { const p = Q[i], q = Q[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } }
  ctx.closePath();
}
function grfBegin(P, sharp) { ctx.beginPath(); for (const Q of grfMulti(P)) grfSub(Q, sharp); }
function grfFillEach(P, sharp) { for (const Q of grfMulti(P)) { ctx.beginPath(); grfSub(Q, sharp); ctx.fill(); } }
// a fixed hand-made unevenness along an outline (seeded by key: paint does not boil, it stays where it was sprayed)
function grfRough(P, amt = 4, key = 'r', step = 18) {
  const Q = resample(P, true, step), n = Q.length; if (!amt) return Q;
  const R = RNG('grfrough', key), f1 = R.r(0.012, 0.03), f2 = R.r(0.05, 0.1), p1 = R.r(0, TAU), p2 = R.r(0, TAU), out = new Array(n); let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    const o = amt * (0.7 * Math.sin(s * f1 + p1) + 0.4 * Math.sin(s * f2 + p2));
    out[i] = [Q[i][0] + nx / l * o, Q[i][1] + ny / l * o];
  }
  return out;
}
// a round sprayed blob's outline: a circle with a few slow lumps (the same key gives the same blob)
function grfBlobPts(x, y, r, key = 'blob', n = 72) {
  const R = RNG('grfblob', key), p1 = R.r(0, TAU), p2 = R.r(0, TAU), p3 = R.r(0, TAU), P = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + 0.035 * Math.sin(2 * a + p1) + 0.025 * Math.sin(3 * a + p2) + 0.015 * Math.sin(5 * a + p3); P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
  return P;
}
function grfStarPts(x, y, r, n = 5, k = 0.45, rot = -Math.PI / 2) { const P = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r * k : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return P; }

// ---------------------------------------------------------------------
//  THE WALL. grfWall(kind) at the start of a scene, grfDone() at its end (never forget it).
//    kind: 'brick' | 'concrete', optionally with a seed for another layout of stains, patches and old tag: 'brick:2'
//  Each wall is built once: a base canvas (the wall) and a relief canvas (mortar grooves, seams, pores, cracks) that
//  grfDone() lays back over the paint. Draw walls at camera zoom >= 1 (the cache is exactly one frame).
// ---------------------------------------------------------------------
const GRF_WALLC = new Map(); let GRF_WALL = 'brick';
function grfWallCv(id) {
  let w = GRF_WALLC.get(id); if (w) return w;
  const kind = id.split(':')[0], mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H + 2; return c; };
  const base = mk(), rel = mk(), g = base.getContext('2d'), r = rel.getContext('2d'), R = RNG('grfwall', id);
  const specks = (q, n, col, a0, a1, s0, s1) => { q.fillStyle = col; for (let i = 0; i < n; i++) { q.globalAlpha = R.r(a0, a1); const s = R.r(s0, s1); q.fillRect(R.r(0, W), R.r(0, H), s, s); } q.globalAlpha = 1; };
  if (kind === 'brick') {
    g.fillStyle = GRF.mortar; g.fillRect(0, 0, W, H + 2);
    const bw = 150, bh = 64, gap = 9; r.fillStyle = '#120a08';
    for (let row = -1, y = -20; y < H + bh; y += bh, row++) {
      const off = (mod(row, 2)) * bw / 2 + R.n(5);
      r.fillRect(0, y - gap / 2 + 1.5, W, gap - 3);
      for (let x = -bw + off; x < W; x += bw) {
        g.fillStyle = grfMix(GRF.brick, R.pick([GRF.brickD, '#a25c45', '#6b3f35', '#955241', '#7b4a40']), R.r(0, 0.6));
        const bx = x + gap / 2 + R.n(1.5), by = y + gap / 2 + R.n(1.5), ww = bw - gap + R.n(2), hh = bh - gap + R.n(2);
        g.beginPath(); g.roundRect(bx, by, ww, hh, 3); g.fill();
        g.fillStyle = 'rgba(255,220,190,0.08)'; g.fillRect(bx, by, ww, 3); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(bx, by + hh - 3, ww, 3);
        if (R.f() < 0.12) { g.fillStyle = 'rgba(20,10,8,0.3)'; g.beginPath(); g.moveTo(bx + ww, by + hh); g.lineTo(bx + ww - R.r(10, 30), by + hh); g.lineTo(bx + ww, by + hh - R.r(8, 20)); g.fill(); }   // a chipped corner
        r.fillRect(x - gap / 2 + 1.5, y, gap - 3, bh);
      }
    }
    specks(g, 2600, '#1a0e0a', 0.06, 0.24, 1, 3); specks(g, 1400, '#ffe2cc', 0.04, 0.13, 1, 2.6); specks(r, 900, '#120a08', 0.3, 0.8, 1.4, 3);
  } else {
    g.fillStyle = GRF.concrete; g.fillRect(0, 0, W, H + 2);
    for (let i = 0; i < 70; i++) { const x = R.r(0, W), y = R.r(0, H), rr = R.r(120, 420), gr = g.createRadialGradient(x, y, 0, x, y, rr), d = R.f() < 0.5; gr.addColorStop(0, d ? `rgba(30,32,34,${R.r(0.04, 0.09)})` : `rgba(235,235,230,${R.r(0.03, 0.08)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    specks(g, 5200, '#191b1c', 0.08, 0.32, 1, 3.2); specks(g, 1600, '#f0f0ea', 0.05, 0.14, 1, 2.6); specks(r, 1100, '#0e0f10', 0.3, 0.8, 1.4, 3.2);
    const sy = [560 + R.n(40), 1235 + R.n(40)], sx = [540 + R.n(160)];   // formwork seams and tie holes
    for (const y of sy) { g.fillStyle = 'rgba(20,22,24,0.34)'; g.fillRect(0, y, W, 4); g.fillStyle = 'rgba(240,240,235,0.14)'; g.fillRect(0, y + 4, W, 2); r.fillStyle = '#0e0f10'; r.fillRect(0, y, W, 4); }
    for (const x of sx) { g.fillStyle = 'rgba(20,22,24,0.3)'; g.fillRect(x, 0, 4, H); g.fillStyle = 'rgba(240,240,235,0.12)'; g.fillRect(x + 4, 0, 2, H); r.fillStyle = '#0e0f10'; r.fillRect(x, 0, 4, H); }
    for (const y of [sy[0] - 300, sy[0] + 330, sy[1] + 330]) for (const x of [150, 540 - 150, 540 + 240, 990]) {
      g.fillStyle = 'rgba(18,19,20,0.6)'; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); g.strokeStyle = 'rgba(240,240,235,0.2)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y + 1, 12, 0.2, Math.PI - 0.2); g.stroke();
      r.fillStyle = '#0e0f10'; r.beginPath(); r.arc(x, y, 11, 0, TAU); r.fill();
    }
    for (const q of [g, r]) {   // a crack
      let x = R.r(700, 940), y = -5; q.strokeStyle = q === g ? 'rgba(15,16,18,0.6)' : '#0e0f10'; q.lineWidth = 2.5; q.lineJoin = 'round'; q.beginPath(); q.moveTo(x, y);
      const C2 = RNG('grfcrack', id); for (let i = 0; i < 16; i++) { x += C2.n(34) - 9; y += C2.r(18, 46); q.lineTo(x, y); } q.stroke();
    }
  }
  // dirt: rain streaks from the top, soot along the bottom
  for (let i = 0; i < 11; i++) {
    const x = R.r(0, W), y = R.f() < 0.6 ? -10 : R.r(0, H * 0.5), l = R.r(300, 1000), w2 = R.r(30, 130), a = R.r(0.1, 0.24), gr = g.createLinearGradient(0, y, 0, y + l);
    gr.addColorStop(0, 'rgba(14,10,10,1)'); gr.addColorStop(1, 'rgba(14,10,10,0)'); g.fillStyle = gr;
    for (let k = 0; k < w2; k += 3) { g.globalAlpha = a * Math.sin(Math.PI * (k + 1.5) / w2) ** 1.5 * R.r(0.7, 1); g.fillRect(x + k, y, 3, l * R.r(0.75, 1)); }
    g.globalAlpha = 1;
  }
  const so = g.createLinearGradient(0, H - 460, 0, H); so.addColorStop(0, 'rgba(12,9,10,0)'); so.addColorStop(1, 'rgba(12,9,10,0.34)'); g.fillStyle = so; g.fillRect(0, H - 460, W, 462);
  // the faded earlier tag: a fat-cap signature with a loop, an underline and a crown, mostly weathered away
  const tx = R.r(90, 420), ty = R.r(700, 1050), tc = kind === 'brick' ? '#e6d6ba' : '#27323f', T = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60; T.push([tx + t * 470 + 46 * Math.sin(t * 11), ty + 74 * Math.sin(t * 6.5 + 1) - t * 40]); }
  g.save(); g.lineCap = g.lineJoin = 'round'; g.strokeStyle = tc;
  const way = (P, wd) => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.globalAlpha = 0.07; g.lineWidth = wd * 1.7; g.stroke(); g.globalAlpha = 0.17; g.lineWidth = wd; g.stroke(); };
  way(T, 20); way([[tx - 20, ty + 120], [tx + 250, ty + 96], [tx + 520, ty + 104]], 16);
  way([[tx + 140, ty - 150], [tx + 150, ty - 215], [tx + 185, ty - 170], [tx + 215, ty - 225], [tx + 245, ty - 170], [tx + 280, ty - 215], [tx + 290, ty - 150], [tx + 140, ty - 150]], 13);
  g.globalAlpha = 0.16; g.fillStyle = tc; g.fillRect(tx + 60, ty + 70, 5, 130); g.fillRect(tx + 380, ty + 20, 5, 90); g.restore();
  // buffed patches: dull paint rolled over older work, one of them half over the tag
  const pc = kind === 'brick' ? ['#7b594d', '#93857a', '#6d4a40'] : ['#9c9d98', '#777a7b', '#a39f95'];
  const spots = [[tx + R.r(180, 330), ty + R.r(-60, 60)], [R.r(40, 700), R.r(180, 520)], [R.r(300, 760), R.r(1180, 1560)]];
  spots.forEach(([px, py], i) => {
    const pw = R.r(230, 400), ph = R.r(150, 300), P = [];
    for (let k = 0; k <= 8; k++) P.push([px + pw * k / 8, py + R.n(7)]); for (let k = 1; k < 5; k++) P.push([px + pw + R.n(4), py + ph * k / 5]);
    for (let k = 8; k >= 0; k--) P.push([px + pw * k / 8, py + ph + R.n(7)]); for (let k = 4; k > 0; k--) P.push([px + R.n(4), py + ph * k / 5]);
    g.save(); g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.closePath(); g.globalAlpha = 0.9; g.fillStyle = pc[i]; g.fill(); g.clip();
    const lane = pw / 4;                                                                                     // roller lanes: each pass a hair lighter or darker, thin where the roller ran dry
    for (let k = 0; k < 4; k++) { g.globalAlpha = R.r(0.03, 0.09); g.fillStyle = R.f() < 0.5 ? '#000' : '#fff'; g.fillRect(px + lane * k, py - 10, lane, ph + 20); }
    g.globalAlpha = 0.22; g.drawImage(rel, 0, 0);
    g.restore();
  });
  specks(g, 500, '#0d0a0a', 0.05, 0.16, 1, 2.4);
  w = { base, rel }; GRF_WALLC.set(id, w); return w;
}
function grfWall(id = 'brick') { GRF_WALL = id; ctx.drawImage(grfWallCv(id).base, 0, 0); }
// the wall's relief over the paint: grooves and pores stay visible through every colour. al: how deep (0.27)
function grfDone(al = 0.27) { ctx.save(); ctx.globalAlpha = al; ctx.drawImage(grfWallCv(GRF_WALL).rel, 0, 0); ctx.restore(); }
const grfEraWall = (e) => (typeof GRF_ERA_WALL !== 'undefined' && e != null && GRF_ERA_WALL[e]) || GRF_WALL;

// ---------------------------------------------------------------------
//  the invisible can. A fill is revealed along the can's path over the shape's box: 'zig' = side-to-side passes from
//  the top down, 'burst' = one growing puff from the middle (o.from = [x, y]). Speckle leads, solid follows.
//    o: mode, band (the height of one pass, px), lag (how far the solid trails the speckle, px), from
// ---------------------------------------------------------------------
function grfZig(bb, o = {}) {
  const h = bb.y1 - bb.y0, rows = Math.max(1, Math.round(h / (o.band ?? clamp(h / 3.2, 46, 150)))), bd = h / rows, Z = [];
  for (let r = 0; r < rows; r++) {
    const y = bb.y0 + bd * (r + 0.5), n = Math.max(2, Math.ceil((bb.x1 - bb.x0) / 70));
    for (let i = 0; i <= n; i++) { const f = r % 2 ? 1 - i / n : i / n, x = lerp(bb.x0, bb.x1, f); Z.push([x, y + bd * 0.1 * Math.sin(x * 0.021 + r * 2.1)]); }
  }
  const len = pathLen(Z) || 1, lag = Math.min(0.45, (o.lag ?? 180) / len);
  return { Z, wz: bd * 1.8, lag, len };
}
// where the can is at progress p (for a puff of mist at the nozzle)
function grfCanAt(bb, p, o = {}) { if (o.mode === 'burst') return o.from ?? [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2]; const z = grfZig(bb, o); return pointAt(z.Z, clamp(p * (1 + z.lag))); }
function grfCanMask(bb, p, o = {}) {   // draws the covered area as a mask on the current ctx
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
  if (o.mode === 'burst') {
    const [cx, cy] = o.from ?? [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2], R = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 12, lag = R * 0.42, r0 = p * (R + lag);
    for (const [st, rr] of [[grfPat('mid'), r0], [grfPat('dense'), r0 - lag * 0.5], ['#000', r0 - lag]]) if (rr > 0.5) { ctx.fillStyle = st; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); }
  } else {
    const z = grfZig(bb, o), q = p * (1 + z.lag);
    for (const [st, f, wd] of [[grfPat('mid'), q, z.wz * 1.22], [grfPat('dense'), q - z.lag * 0.5, z.wz * 1.12], ['#000', q - z.lag, z.wz]]) {
      if (f <= 0) continue; const Q = subPath(z.Z, f); if (Q.length < 2) continue;
      ctx.strokeStyle = st; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.stroke();
    }
  }
  ctx.restore();
}
// cut the mask being drawn on the current scratch down to what the can has covered
function grfReveal(bb, p, o = {}) {
  if (p >= 1) return;
  const sb = grfOn(1, bb, () => grfCanMask(bb, p, o));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-in';
  if (sb) ctx.drawImage(grfScr(1).c, sb.x, sb.y, sb.w, sb.h, sb.x, sb.y, sb.w, sb.h); else ctx.clearRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  mist and flying specks (the only things regenerated per frame, a few dozen marks)
// ---------------------------------------------------------------------
const GRF_PUFF = new Map();
function grfPuffCv(c) {
  let cv = GRF_PUFF.get(c); if (cv) return cv; if (GRF_PUFF.size > 24) GRF_PUFF.clear();
  cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'), gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.7; g.fillStyle = g.createPattern(grfTile('dense'), 'repeat'); g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-in'; g.fillStyle = c; g.fillRect(0, 0, 256, 256);
  GRF_PUFF.set(c, cv); return cv;
}
// one puff of speckled mist: at the nozzle, where a letter pops, where a stencil slaps down
function grfPuff(x, y, r, c = GRF.white, al = 0.5) { if (al <= 0.01 || r < 2) return; ctx.save(); ctx.globalAlpha = ctx.globalAlpha * al; ctx.drawImage(grfPuffCv(c), x - r, y - r, 2 * r, 2 * r); ctx.restore(); }
// overspray mist hanging in the air and drifting (idle life). o: n (6), box [x0, y0, x1, y1], al (0.12), key, vx
function grfMist(c = GRF.white, o = {}) {
  const n = o.n ?? 6, R = RNG('grfmist', o.key ?? 'mist'), [x0, y0, x1, y1] = o.box ?? [0, 200, W, 1400], cv = grfPuffCv(c);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const per = R.r(5, 9), fr = mod(TT / per + R.f(), 1), s = R.r(280, 560), x = lerp(x0 - 150, x1 + 150, mod(R.f() + fr * R.r(0.15, 0.4) * (o.vx ?? 1), 1)), y = R.r(y0, y1) - 70 * fr;
    ctx.globalAlpha = (o.al ?? 0.12) * Math.sin(Math.PI * fr); ctx.drawImage(cv, x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
}
// specks flying off the nozzle this frame. o: n (26), key, al
function grfSpit(x, y, r, c, o = {}) {
  const R = RNG('grfspit', o.key ?? 'spit', F), n = o.n ?? 26;
  ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = ctx.globalAlpha * (o.al ?? 0.85); ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = R.r(0, TAU), d = r * R.f() ** 0.7, s = R.r(1.2, 3.6); ctx.rect(x + Math.cos(a) * d - s / 2, y + Math.sin(a) * d - s / 2, s, s); }
  ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  DRIPS: thin vertical runs with a bead, from the lowest edge of a shape. They start a moment after the paint lands,
//  creep down and stop (some keep creeping for seconds: idle life).
//    o: n (3), t (seconds since the paint landed; omit = fully run), key, len (the longest, px), w (7), k (length x)
// ---------------------------------------------------------------------
function grfBottomAt(L, x) {
  let best = null;
  for (const Q of L) for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue; const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); if (best == null || y > best) best = y; }
  return best;
}
function grfDripAt(x, y, len, w, c) {
  if (len < 1.5) return;
  const e = Math.min(len, w * 2.4);
  ctx.save(); ctx.fillStyle = ctx.strokeStyle = c; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - w * 1.15, y); ctx.quadraticCurveTo(x - w * 0.36, y + e * 0.5, x - w * 0.36, y + e); ctx.lineTo(x + w * 0.36, y + e); ctx.quadraticCurveTo(x + w * 0.36, y + e * 0.5, x + w * 1.15, y); ctx.closePath(); ctx.fill();
  ctx.lineWidth = w * 0.72; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y + len, w * 0.6, w * 0.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - w * 0.18, y + len - w * 0.1, w * 0.16, 0, TAU); ctx.fill();   // the bead is still wet
  ctx.restore();
}
function grfDrips(P, c, o = {}) {
  const L = grfMulti(P), bb = bbox(grfFlat(P)), n = o.n ?? 3, R = RNG('grfdrip', o.key ?? 'drip'), t = o.t;
  for (let i = 0; i < n; i++) {
    const x = lerp(bb.x0, bb.x1, 0.14 + 0.72 * (i + R.r(0.15, 0.85)) / n), len = (o.len ?? clamp((bb.y1 - bb.y0) * 0.5, 50, 210)) * R.r(0.35, 1) * (o.k ?? 1), w = (o.w ?? 7) * R.r(0.75, 1.3), delay = R.r(0.05, 0.45), tau = R.r(0.35, 1.5);
    const y = grfBottomAt(L, x); if (y == null) continue;
    const g = t == null ? 1 : t <= delay ? 0 : 1 - Math.exp(-(t - delay) / tau);
    grfDripAt(x, y - 8, len * g + 8 * Math.min(1, g * 4), w, c);
  }
}

// ---------------------------------------------------------------------
//  FREEHAND SPRAY — any closed outline as a sprayed fill: solid in the middle, a dithered edge, overspray around it.
//    grfSpray(P, colour, o)   o: p (0..1 sprayed on along the can's path; mode / band / lag / from as in grfZig),
//      soft (how wide the edge is, 16), al (0.96: the wall just shows through), thin (0.1: uneven density),
//      sharp (straight segments), drips (n), dripT (seconds since it landed), dripKey, dripLen, dripW, key
//  Give it ONE outline when soft > 0 (a list's inner boundaries would be eroded too).
// ---------------------------------------------------------------------
function grfSpray(P, c, o = {}) {
  const soft = o.soft ?? 16, p = clamp(o.p ?? 1); if (p <= 0) return P;
  const bb = bbox(grfFlat(P), soft * 4 + 10), sh = !!o.sharp;
  const sb = grfOn(0, bb, () => {
    grfBegin(P, sh);
    if (soft > 0) {
      ctx.strokeStyle = grfPat('fine'); ctx.lineWidth = soft * 7; ctx.stroke();
      ctx.strokeStyle = grfPat('mid'); ctx.lineWidth = soft * 3.4; ctx.stroke();
      ctx.strokeStyle = grfPat('dense'); ctx.lineWidth = soft * 1.5; ctx.stroke();
    }
    grfFillEach(P, sh);
    ctx.globalCompositeOperation = 'destination-out';
    if (soft > 0) { grfBegin(P, sh); ctx.strokeStyle = grfPat('mid'); ctx.lineWidth = soft * 2.6; ctx.stroke(); ctx.strokeStyle = grfPat('dense'); ctx.lineWidth = soft * 1.0; ctx.stroke(); }
    ctx.globalAlpha = o.thin ?? 0.1; ctx.fillStyle = grfPat('blotch'); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (p < 1) grfReveal(bb, p, o);
  });
  if (sb) grfStamp(0, sb, c, o.al ?? 0.96);
  if (o.drips && (o.dripT == null || o.dripT > 0) && p >= 1) grfDrips(P, c, { n: o.drips, t: o.dripT, key: o.dripKey ?? o.key ?? 'spray', len: o.dripLen, w: o.dripW });
  return P;
}
// a sprayed dot (one short press of the nozzle). o: as grfSpray; pops from the middle
function grfDot(x, y, r, c, o = {}) { return grfSpray(ellipsePts(x, y, r, r, 0, 28), c, { soft: Math.max(5, r * 0.32), mode: 'burst', ...o }); }
// A FAT-CAP LINE along an open path: a soft speckled edge, solid paint, a brighter centre where the paint is thickest.
//    grfLine(P, width, colour, o)  o: p (0..1 written on), core (the centre's colour), al, closed, spit (false = no
//      flying specks at the tip), drips ([fractions along the path]), dripT, dripLen, key
function grfLine(P, w, c, o = {}) {
  const p = clamp(o.p ?? 1); if (p <= 0 || P.length < 2) return;
  let Q = o.closed ? [...P, P[0]] : P; if (p < 1) Q = subPath(Q, p); if (Q.length < 2) return;
  const core = o.core ?? grfLift(c, 0.38);
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.globalAlpha = ctx.globalAlpha * (o.al ?? 1); trace(Q, false);
  for (const [st, k] of [[grfPat('fine', c), 2.9], [grfPat('mid', c), 1.85], [grfPat('dense', c), 1.3], [c, 0.9], [grfPat('dense', core), 0.5]]) { ctx.strokeStyle = st; ctx.lineWidth = w * k; ctx.stroke(); }
  ctx.globalAlpha = ctx.globalAlpha * 0.75; ctx.strokeStyle = core; ctx.lineWidth = w * 0.2; ctx.stroke();
  ctx.restore();
  const tip = Q[Q.length - 1];
  if (p < 1 && o.spit !== false) grfSpit(tip[0], tip[1], w * 1.6, c, { key: o.key ?? 'line' });
  if (o.drips) { const R = RNG('grfld', o.key ?? 'line'); for (const f of o.drips) { const len = (o.dripLen ?? w * 3.2) * R.r(0.5, 1), tau = R.r(0.4, 1.3); if (f > p) continue; const [x, y] = pointAt(o.closed ? [...P, P[0]] : P, f), t = o.dripT, g = t == null ? 1 : t <= 0 ? 0 : 1 - Math.exp(-t / tau); grfDripAt(x, y + w * 0.2, len * g, Math.max(4, w * 0.22), c); } }
}

// ---------------------------------------------------------------------
//  STENCIL — any closed outline (or a list of outlines) cut in a card and sprayed through: a crisp edge, small ties
//  where the card held together, slightly uneven paint, a thin halo of overspray outside the edge.
//    grfStencil(P, colour, o)  o: p (0..1 the whole act: 0-0.2 the card slaps on, 0.18-0.72 the can passes over,
//      0.74-1 the card peels off; omit = just the finished shape), holes ([outlines] cut out of the shape),
//      ties (n small gaps across the edge of the first outline), gaps ([[x1, y1, x2, y2, w]] cuts of your own),
//      halo (the overspray's reach, 24; 0 = none), sharp (true: straight knife cuts; false = smooth), al, thin,
//      card (false = no card), margin (the card's border, 46), band / lag (the can), key
// ---------------------------------------------------------------------
function grfStencil(P, c, o = {}) {
  const p = o.p == null ? 1 : clamp(o.p), key = o.key ?? 'sten'; if (p <= 0) return;
  const L = grfMulti(P), flat = grfFlat(P), sh = o.sharp !== false, halo = o.halo ?? 24, bbR = bbox(flat, 10), bb = bbox(flat, halo * 1.4 + 12);
  const a = p < 1 ? seg(p, 0, 0.2) : 1, b = p < 1 ? seg(p, 0.18, 0.72) : 1, d = p < 1 ? seg(p, 0.74, 1) : 1;
  if (b > 0) {
    const sb = grfOn(0, bb, () => {
      if (halo > 0) { grfBegin(L, sh); ctx.globalAlpha = 0.85; ctx.strokeStyle = grfPat('fine'); ctx.lineWidth = halo * 2; ctx.stroke(); ctx.globalAlpha = 0.6; ctx.strokeStyle = grfPat('mid'); ctx.lineWidth = halo * 0.55; ctx.stroke(); ctx.globalAlpha = 1; }
      grfFillEach(L, sh);
      ctx.globalCompositeOperation = 'destination-out';
      if (o.holes) grfFillEach(o.holes, sh);
      ctx.lineCap = 'butt'; ctx.strokeStyle = '#000';
      const R = RNG('grftie', key), Q = L[0], n = Q.length;
      for (let k = 0; k < (o.ties ?? 0); k++) {   // ties: short cuts straight across the edge
        const i = R.i(0, n - 1), A = Q[i], B = Q[(i + 1) % n], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = (A[1] - B[1]) / l, ny = (B[0] - A[0]) / l, len = o.tieLen ?? 30;
        ctx.lineWidth = o.tieW ?? 6; ctx.beginPath(); ctx.moveTo(mx - nx * len, my - ny * len); ctx.lineTo(mx + nx * len, my + ny * len); ctx.stroke();
      }
      for (const [x1, y1, x2, y2, gw] of o.gaps ?? []) { ctx.lineWidth = gw ?? 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.globalAlpha = o.thin ?? 0.12; ctx.fillStyle = grfPat('blotch'); ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (b < 1) grfReveal(bb, b, { ...o, mode: 'zig' });
    });
    if (sb) grfStamp(0, sb, c, o.al ?? 0.97);
  }
  if (p < 1 && o.card !== false) grfCard(L, bb, bbR, c, a, b, d, key, o);
}
// the stencil card: kraft board with the shape cut out, the passing can's overspray on it. It drops onto the wall
// (a = 0..1), stays while the can passes (b), then lifts off, turns and leaves (d). Its shadow says how far off it is.
function grfCard(L, bbZ, bbR, c, a, b, d, key, o = {}) {
  const m = o.margin ?? 46, R = RNG('grfcard', key), x0 = bbR.x0 - m, y0 = bbR.y0 - m, w = bbR.x1 - bbR.x0 + 2 * m, h = bbR.y1 - bbR.y0 + 2 * m;
  grfScr(2).g.clearRect(0, 0, W, H);   // the card is drawn back scaled and turned: nothing stale may sit beside it
  const sb = grfOn(2, { x0: x0 - 4, y0: y0 - 4, x1: x0 + w + 4, y1: y0 + h + 4 }, () => {
    ctx.fillStyle = GRF.card; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 10); ctx.fill();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = 'rgba(70,48,26,0.12)'; ctx.lineWidth = 2; ctx.beginPath(); for (let y = y0 + 9; y < y0 + h; y += 13) { ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); } ctx.stroke();   // corrugation
    ctx.fillStyle = grfPat('mid', R.pick([GRF.black, GRF.pink, GRF.yellow, GRF.white])); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x0 + w * R.pick([0.08, 0.92]), y0 + h * R.pick([0.1, 0.9]), R.r(60, 120), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;   // an older job
    if (b > 0) {
      const z = grfZig(bbZ, o), q = b * (1 + z.lag); ctx.lineCap = ctx.lineJoin = 'round';
      for (const [st, f, wd] of [[grfPat('mid', c), q, z.wz * 1.5], [grfPat('dense', c), q - z.lag * 0.4, z.wz * 1.1]]) { if (f <= 0) continue; const Q = subPath(z.Z, f); if (Q.length < 2) continue; ctx.strokeStyle = st; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(60,40,20,0.4)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 10); ctx.stroke();
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; grfFillEach(L, o.sharp !== false); if (o.holes) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = GRF.card; grfFillEach(o.holes, o.sharp !== false); }
  });
  if (!sb) return;
  const cin = 1 - EZ.o3(a), lift = EZ.i2(d), dir = R.f() < 0.5 ? -1 : 1, z = Math.abs(ctx.getTransform().a) || 1, px = sb.x + sb.w / 2, py = sb.y + sb.h / 2, off = cin + lift;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(px + 320 * lift * dir * z, py - (70 * cin + 560 * lift) * z); ctx.rotate(-0.07 * cin * dir + 0.32 * lift * dir); ctx.scale(1 + 0.2 * cin + 0.24 * lift, 1 + 0.2 * cin + 0.24 * lift); ctx.translate(-px, -py);
  ctx.globalAlpha = ctx.globalAlpha * Math.min(1, a * 4) * (1 - seg(d, 0.6, 1));
  ctx.shadowColor = 'rgba(0,0,0,0.42)'; ctx.shadowBlur = (6 + 34 * off) * z; ctx.shadowOffsetX = (5 + 36 * off) * z; ctx.shadowOffsetY = (8 + 46 * off) * z;
  ctx.drawImage(grfScr(2).c, sb.x, sb.y, sb.w, sb.h, sb.x, sb.y, sb.w, sb.h); ctx.restore();
}
// A STENCIL PICTURE, back to front: layers = [{ P, c, ...grfStencil options }], usually a flat base, a darker shadow
// layer and a white highlight layer. o: t (seconds since the first card went on; omit = finished), each (seconds per
// layer, 0.375), key, card. Returns how many layers are finished.
function grfPiece(layers, o = {}) {
  const each = o.each ?? 0.375; let done = 0;
  layers.forEach((ly, i) => {
    const p = o.t == null ? 1 : (o.t - i * each) / each; if (p <= 0) return; if (p >= 1) done++;
    grfStencil(ly.P, ly.c, { ...ly, p: Math.min(1, p), key: (o.key ?? 'pc') + i, card: o.card });
  });
  return done;
}

// ---------------------------------------------------------------------
//  ready-made stencil pictures (three layers each). r = half the picture's size.
// ---------------------------------------------------------------------
// KALENG, the hero: a spray can with a face. Base colour body, a black shadow layer (side shade, eyes, mouth, feet),
// white highlights (streak, glints). The gaps between cap, shoulder and body are the stencil's own bridges.
//   o: c (the body, cyan), dark, hi, tilt, sx, sy (squash; the feet stay put), look [x, y] (-1..1), blink, mood ('smile' | 'wow')
function grfCanLayers(x, y, r, o = {}) {
  const sy = o.sy ?? 1, T = (P) => xform(P, x, y + 1.06 * r * (1 - sy), o.tilt ?? 0, r * (o.sx ?? 1), r * sy);
  const [lx, ly] = o.look ?? [0.4, -0.2], E = [[-0.24, 0.0], [0.08, 0.0]], ery = o.blink ? 0.018 : 0.125;
  const base = [rrectPts(-0.5, -0.38, 1.0, 1.3, 0.1, 5), [[-0.5, -0.42], [-0.43, -0.56], [-0.25, -0.66], [0.25, -0.66], [0.43, -0.56], [0.5, -0.42]], rrectPts(-0.2, -0.98, 0.4, 0.28, 0.05, 3), [[0.2, -0.92], [0.33, -0.92], [0.33, -0.8], [0.2, -0.8]]];
  const mouth = o.mood === 'wow' ? ellipsePts(-0.08, 0.31, 0.07, 0.09, 0, 20) : [...arcPts(-0.08, 0.2, 0.16, 0.25, Math.PI - 0.25, 12), ...arcPts(-0.08, 0.17, 0.13, Math.PI - 0.5, 0.5, 10)];
  const dark = [[[0.3, -0.33], [0.46, -0.33], [0.46, 0.87], [0.3, 0.87]], [[0.27, -0.62], [0.4, -0.55], [0.47, -0.45], [0.3, -0.45]], rrectPts(-0.42, 0.96, 0.32, 0.1, 0.04, 3), rrectPts(0.1, 0.96, 0.32, 0.1, 0.04, 3),
    ...E.map(([ex, ey]) => ellipsePts(ex, ey, 0.085, ery, 0, 24)), mouth, [[-0.5, 0.62], [0.3, 0.62], [0.3, 0.68], [-0.5, 0.68]]];
  const hi = [rrectPts(-0.42, -0.3, 0.075, 0.5, 0.03, 3), rrectPts(-0.42, 0.27, 0.075, 0.14, 0.03, 3), [[-0.15, -0.94], [-0.08, -0.94], [-0.08, -0.76], [-0.15, -0.76]], [[-0.4, -0.46], [-0.33, -0.56], [-0.22, -0.61], [-0.22, -0.56], [-0.32, -0.46]],
    ...(o.blink ? [] : E.map(([ex, ey]) => ellipsePts(ex + 0.028 * lx, ey - 0.035 + 0.03 * ly, 0.032, 0.032, 0, 12)))];
  return [{ P: base.map(T), c: o.c ?? GRF.cyan, ties: 2, halo: r * 0.12 }, { P: dark.map(T), c: o.dark ?? GRF.black, halo: r * 0.07 }, { P: hi.map(T), c: o.hi ?? GRF.white, halo: r * 0.05 }];
}
const grfCanNozzle = (x, y, r, o = {}) => xform([[0.36, -0.86]], x, y + 1.06 * r * (1 - (o.sy ?? 1)), o.tilt ?? 0, r * (o.sx ?? 1), r * (o.sy ?? 1))[0];
// o: everything grfCanLayers takes, plus t / each (it is stencilled on, layer by layer), spray (0..1: the nozzle is
// pressed, a puff of mist leaves it), sprayC, key
function grfHero(x, y, r, o = {}) {
  grfPiece(grfCanLayers(x, y, r, o), { t: o.t, each: o.each, key: o.key ?? 'hero' });
  SPARK_AT = toScreen(x, y);
  if (o.spray > 0) { const [nx, ny] = grfCanNozzle(x, y, r, o), c = o.sprayC ?? GRF.white; grfPuff(nx + r * 0.5, ny, r * 0.55 * o.spray, c, 0.55); grfSpit(nx + r * 0.45, ny, r * 0.5, c, { key: (o.key ?? 'hero') + 'spit', n: 20 }); }
}
function grfHeroPts(x, y, r) {
  return xform([[-0.2, -0.98], [0.2, -0.98], [0.2, -0.68], [0.25, -0.66], [0.43, -0.56], [0.5, -0.42], [0.5, 0.5], [0.5, 1.0], [0.42, 1.06], [-0.42, 1.06], [-0.5, 1.0], [-0.5, 0.5], [-0.5, -0.42], [-0.43, -0.56], [-0.25, -0.66], [-0.2, -0.68]], x, y, 0, r, r);
}
// a stencil bird (facing right; o.flip faces it left). o: c (base, lime), dark (limeD … or black), hi, wing (0..1 lifts the wing), blink
function grfBirdLayers(x, y, r, o = {}) {
  const f = o.flip ? -1 : 1, T = (P) => xform(P, x, y, o.tilt ?? 0, r * f, r), wu = (o.wing ?? 0) * 0.16;
  const base = [ellipsePts(0, 0.08, 0.58, 0.4, -0.3, 40), ellipsePts(0.5, -0.36, 0.25, 0.24, 0, 28), [[-0.38, -0.06], [-1.0, -0.44], [-1.07, -0.22], [-0.86, -0.12], [-1.03, 0.05], [-0.4, 0.3]]];
  const wing = [[0.22, -0.12], [-0.1, -0.24 - wu], [-0.46, -0.12 - wu * 2], [-0.76, 0.22 - wu * 3], [-0.3, 0.3 - wu], [0.06, 0.2]];
  const dark = [wing, [[0.72, -0.43], [1.02, -0.33], [0.73, -0.25]], ...(o.blink ? [[[0.5, -0.43], [0.62, -0.43], [0.62, -0.41], [0.5, -0.41]]] : [ellipsePts(0.56, -0.42, 0.05, 0.05, 0, 14)]),
    [[-0.05, 0.42], [0.0, 0.42], [0.02, 0.74], [-0.03, 0.74]], [[0.18, 0.38], [0.23, 0.38], [0.25, 0.74], [0.2, 0.74]], [[-0.16, 0.72], [0.12, 0.72], [0.12, 0.77], [-0.16, 0.77]], [[0.1, 0.72], [0.36, 0.72], [0.36, 0.77], [0.1, 0.77]]];
  const hi = [[[0.08, -0.06], [-0.1, -0.15 - wu], [-0.34, -0.08 - wu * 2], [-0.1, -0.08 - wu]], [[0.02, 0.06], [-0.3, 0.02 - wu * 2], [-0.52, 0.12 - wu * 3], [-0.24, 0.1 - wu]], [[-0.04, 0.17], [-0.28, 0.2 - wu], [-0.5, 0.24 - wu * 2], [-0.26, 0.25 - wu]],
    [[0.34, -0.06], [0.5, 0.02], [0.46, 0.3], [0.38, 0.14]], ...(o.blink ? [] : [ellipsePts(0.575, -0.437, 0.018, 0.018, 0, 10)]), [...arcPts(0.5, -0.36, 0.2, -2.6, -1.5, 8), ...arcPts(0.5, -0.36, 0.16, -1.5, -2.6, 8)]];
  return [{ P: base.map(T), c: o.c ?? GRF.lime, ties: 3, halo: r * 0.1 }, { P: dark.map(T), c: o.dark ?? GRF.black, halo: r * 0.06 }, { P: hi.map(T), c: o.hi ?? GRF.white, halo: r * 0.04 }];
}
const grfBird = (x, y, r, o = {}) => grfPiece(grfBirdLayers(x, y, r, o), { t: o.t, each: o.each, key: o.key ?? 'bird' });

// ---------------------------------------------------------------------
//  LETTERING
//  grfText: stencilled block capitals (crisp, a thin bridge cut through the letters, a little overspray).
//  grfWord: bubble letters — overspray, a 3D block, a thick outline, a fill that fades (speckled) to a deeper shade,
//           a white shine along the upper left. Letters pop in one by one. Keep words short (3-6 letters).
// ---------------------------------------------------------------------
const grfFont = (size, kind = 'block') => `900 ${size}px ${kind === 'bubble' ? GRF_BUBBLE : GRF_BLOCK}`;
function grfTextW(str, size, kind) { ctx.save(); ctx.font = grfFont(size, kind); const w = ctx.measureText(str).width; ctx.restore(); return w; }
//   o: align ('left' | 'center' | 'right'), kind ('block' | 'bubble'), p (0..1 sprayed on from the left), halo (true),
//      cut (true: the stencil bridge), al
function grfText(str, x, y, size, c, o = {}) {
  const p = clamp(o.p ?? 1); if (p <= 0 || !str) return 0;
  const font = grfFont(size, o.kind), w = grfTextW(str, size, o.kind), x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const bb = { x0: x0 - size * 0.3, y0: y - size * 1.05, x1: x0 + w + size * 0.3, y1: y + size * 0.42 };
  const sb = grfOn(0, bb, () => {
    ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    if (o.halo !== false) { ctx.globalAlpha = 0.8; ctx.strokeStyle = grfPat('fine'); ctx.lineWidth = size * 0.36; ctx.strokeText(str, x0, y); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#000'; ctx.fillText(str, x0, y);
    if (o.cut !== false) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillRect(x0 - 4, y - size * 0.4, w + 8, Math.max(2, size * 0.045)); ctx.globalCompositeOperation = 'source-over'; }
    if (p < 1) grfReveal(bb, p, { band: size * 3, lag: size * 1.4 });
  });
  if (sb) grfStamp(0, sb, c, o.al ?? 1);
  return w;
}
//   grfWord(str, x (centre), y (baseline), size, o)
//   o: fill (pink), fill2 (the fade's lower colour), line (the outline, black), shade (the 3D block, cyan), hi (white),
//      t (seconds since the first letter popped; omit = all there), step (seconds between letters, 0.125), w (the
//      widest it may be: it shrinks to fit), ow (outline, 0.12 of size), depth (0.085), drips (n), dripLen, key
function grfWord(str, x, y, size, o = {}) {
  const key = o.key ?? str, fill = o.fill ?? GRF.pink, fill2 = o.fill2 ?? grfShade(fill, 0.3), line = o.line ?? GRF.black, shade = o.shade ?? GRF.cyan, hi = o.hi ?? GRF.white, step = o.step ?? 0.125, t = o.t, chs = [...str];
  ctx.save();
  // narrow letters (I, J) get a wider slot: the outlines may touch, the letters themselves never collide
  const lay = (sz) => { ctx.font = grfFont(sz, 'bubble'); const ws = chs.map((ch) => Math.max(ctx.measureText(ch).width, sz * 0.46)), tr = sz * 0.015; return { ws, tr, tot: ws.reduce((a, b) => a + b, 0) + tr * (ws.length - 1) }; };
  let m = lay(size); if (o.w && m.tot > o.w) { size *= o.w / m.tot; m = lay(size); }
  const font = ctx.font, ow = size * (o.ow ?? 0.12), dep = size * (o.depth ?? 0.085), yo = size * 0.36; let pen = x - m.tot / 2;
  const All = chs.map((ch, i) => { const R = RNG('grfword', key, i), w = m.ws[i], L = { ch, i, w, cx: pen + w / 2, dy: R.n(size * 0.03), rot: R.n(0.045), s: t == null ? 1 : t < i * step ? 0 : EZ.back(clamp((t - i * step) / 0.2)) }; pen += w + m.tr; return L; });
  const Ls = All.filter((L) => L.ch !== ' ' && L.s > 0.02);
  if (Ls.length) {
    const set = () => { ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; };
    const each = (fn, ox = 0, oy = 0) => { for (const L of Ls) { ctx.save(); ctx.translate(L.cx + ox, y + L.dy - yo + oy); ctx.rotate(L.rot); ctx.scale(L.s, L.s); fn(L); ctx.restore(); } };
    set();
    ctx.strokeStyle = grfPat('fine', line); ctx.lineWidth = ow * 3.8; each((L) => ctx.strokeText(L.ch, 0, yo));
    ctx.strokeStyle = grfPat('mid', line); ctx.lineWidth = ow * 2.1; each((L) => ctx.strokeText(L.ch, 0, yo));
    ctx.strokeStyle = ctx.fillStyle = shade; ctx.lineWidth = ow;
    for (let k = dep; k > 0; k -= 3) each((L) => { ctx.strokeText(L.ch, 0, yo); ctx.fillText(L.ch, 0, yo); }, k * 0.8, k);
    ctx.strokeStyle = line; each((L) => ctx.strokeText(L.ch, 0, yo));
    const bb = { x0: x - m.tot / 2 - ow * 3, y0: y - size * 1.0, x1: x + m.tot / 2 + ow * 3, y1: y + size * 0.34 }, bw = bb.x1 - bb.x0;
    const sb = grfOn(0, bb, () => {
      set(); ctx.fillStyle = fill; each((L) => ctx.fillText(L.ch, 0, yo));
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = grfPat('mid', fill2); ctx.fillRect(bb.x0, y - size * 0.42, bw, size); ctx.fillStyle = grfPat('dense', fill2); ctx.fillRect(bb.x0, y - size * 0.28, bw, size); ctx.fillStyle = fill2; ctx.fillRect(bb.x0, y - size * 0.13, bw, size);
      const i0 = size * 0.032, hx = size * 0.03, hy = size * 0.045;
      const sh = grfOn(1, bb, () => { set(); each((L) => ctx.fillText(L.ch, 0, yo), i0, i0); ctx.globalCompositeOperation = 'destination-out'; each((L) => ctx.fillText(L.ch, 0, yo), i0 + hx, i0 + hy); ctx.fillRect(bb.x0, y - size * 0.3, bw, size); });
      if (sh) grfStamp(1, sh, hi, 0.95, 'source-atop');
    });
    if (sb) grfLay(0, sb);
    const RD = RNG('grfwd', key);
    for (let k = 0; k < (o.drips ?? 0); k++) {
      const L = All[RD.i(0, All.length - 1)], dx = RD.n(L.w * 0.22), len = size * (o.dripLen ?? 0.34) * RD.r(0.4, 1), tau = RD.r(0.4, 1.2), tt = t == null ? null : t - L.i * step - 0.25;
      if (L.s < 1 && t != null && tt <= 0) continue;
      grfDripAt(L.cx + dx, y + L.dy + ow * 0.2, len * (tt == null ? 1 : tt <= 0 ? 0 : 1 - Math.exp(-tt / tau)), size * 0.028, line);
    }
  }
  ctx.restore();
  return m.tot;
}

// ---------------------------------------------------------------------
//  tag and caption (through DEFER: after the camera, at screen size). Both are a ROLLER STRIP — a band of flat paint
//  rolled over the wall, ragged at the ends — with stencilled capitals on it, so the words never fight the picture.
//  The caption's *word* sits on a block of spray colour. Both roll off as a bridge starts and return after it.
// ---------------------------------------------------------------------
function grfBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  for (const r of BRIDGES) {
    const d = r.d ?? 0.6;
    if (TT >= r.tc - d - 1e-6 && TT < r.tc) return 1 - seg(TT, r.tc - d, r.tc - d + 0.2);
    if (TT >= r.tc && TT < r.tc + d) return 0;
  }
  return 1;
}
function grfStrip(x, y, w, h, c, key, u = 1) {
  if (u <= 0) return;
  const R = RNG('grfstrip', key), P = [], n = Math.max(4, Math.round(w / 60));
  for (let i = 0; i <= n; i++) P.push([x + w * i / n, y + R.n(2.5)]); for (let j = 1; j < 5; j++) P.push([x + w + R.n(9), y + h * j / 5]);
  for (let i = n; i >= 0; i--) P.push([x + w * i / n, y + h + R.n(2.5)]); for (let j = 4; j > 0; j--) P.push([x + R.n(9), y + h * j / 5]);
  ctx.save();
  if (u < 1) { ctx.beginPath(); ctx.rect(x - 20, y - 20, (w + 40) * u, h + 40); ctx.clip(); }
  grfBegin(P, true); ctx.fillStyle = c; ctx.fill(); ctx.clip();
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'; ctx.fillRect(x - 10, y + h * R.f(), w + 20, R.r(2, 7)); }   // roller lanes
  ctx.globalAlpha = 0.22; ctx.fillStyle = grfPat('fine', '#3a3432'); ctx.fillRect(x - 10, y - 10, w + 20, h + 20);                                                   // the wall's pores
  ctx.restore();
}
//   'words *highlight* words' — o: x (CX), y (the strip's centre, 1385), w (the widest the strip may be, 860), size (54),
//      hi (the block: yellow), bg (the strip: white), col (the letters: black), at (seconds after the era starts, 0.5), upper (true)
function grfCaptionNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.5), k = grfBridgeK(); if (k <= 0 || TT < at) return;
  const cx = o.x ?? CX, cy = o.y ?? 1385, maxW = o.w ?? 860, hi = o.hi ?? GRF.yellow;
  let size = o.size ?? 54;
  const toks = (o.upper === false ? str : str.toUpperCase()).split('*').map((s, i) => ({ s: s.trim(), hi: i % 2 === 1 })).filter((t) => t.s);
  const lay = () => { const pad = size * 0.22; let tw = 0; toks.forEach((t, i) => { t.w = grfTextW(t.s, size); t.gap = i === 0 ? (t.hi ? pad : 0) : (/^[!?.,]/.test(t.s) ? size * 0.04 : size * 0.3) + (t.hi || toks[i - 1].hi ? pad * 0.7 : 0); tw += t.w + t.gap; }); return tw + (toks[toks.length - 1].hi ? pad : 0); };
  let tw = lay(); if (tw > maxW - size * 1.3) { size *= (maxW - size * 1.3) / tw; tw = lay(); }
  const pad = size * 0.22, bw = tw + size * 1.3, bh = size * 1.85, bx = cx - bw / 2, by = cy - bh / 2, base = cy + size * 0.36;
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(bx - 30, by - 30, (bw + 60) * k, bh + 60); ctx.clip(); }
  grfStrip(bx, by, bw, bh, o.bg ?? GRF.white, 'cap' + str, EZ.o2(ev(at, 0.3)));
  let xx = cx - tw / 2;
  toks.forEach((t, i) => {
    xx += t.gap;
    const u = ev(at + 0.25 + i * 0.125, 0.17);
    if (u > 0) {
      if (t.hi) { const s = 0.7 + 0.3 * EZ.back(u), w2 = (t.w + 2 * pad) * s, h2 = size * 1.3 * s, mx = xx + t.w / 2, my = base - size * 0.36; ctx.strokeStyle = grfPat('fine', hi); ctx.lineWidth = 24; ctx.strokeRect(mx - w2 / 2, my - h2 / 2, w2, h2); ctx.fillStyle = hi; ctx.fillRect(mx - w2 / 2, my - h2 / 2, w2, h2); }
      grfText(t.s, xx, base, size, o.col ?? GRF.black, { p: u, halo: !t.hi });
    }
    xx += t.w;
  });
  ctx.restore();
}
//   a short label on a small black strip, top-left. o: x (60), y (the strip's top, 262), size (40), bg, c, at (0.25)
function grfTagNow(str, o = {}) {
  const at = E0 + (o.at ?? 0.25), k = grfBridgeK(); if (k <= 0 || TT < at) return;
  const size = o.size ?? 40, s = o.upper === false ? str : str.toUpperCase(), w = grfTextW(s, size), bw = w + size * 1.1, bh = size * 1.75, bx = o.x ?? 60, by = o.y ?? 262;
  ctx.save();
  if (k < 1) { ctx.beginPath(); ctx.rect(bx - 30, by - 30, (bw + 60) * k, bh + 60); ctx.clip(); }
  grfStrip(bx, by, bw, bh, o.bg ?? GRF.black, 'tag' + str, EZ.o2(ev(at, 0.25)));
  grfText(s, bx + size * 0.55, by + bh / 2 + size * 0.36, size, o.c ?? GRF.white, { p: ev(at + 0.2, 0.2), halo: false });
  ctx.restore();
}
const grfCaption = (str, o = {}) => { const f = () => grfCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const grfTag = (str, o = {}) => { const f = () => grfTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---------------------------------------------------------------------
//  the street light: a faint warm pool high on the wall, dark corners, and a tube that flickers (the whole wall dips a
//  few percent for a frame or two). grfFlick(t) = how dark the dip is at time t (the score can click on it).
// ---------------------------------------------------------------------
let GRF_LIGHTC = null;
function grfLight() {
  if (GRF_LIGHTC) return GRF_LIGHTC;
  const c = GRF_LIGHTC = document.createElement('canvas'); c.width = W / 4; c.height = H / 4; const g = c.getContext('2d');
  const gr = g.createRadialGradient(c.width * 0.5, c.height * 0.3, c.height * 0.06, c.width * 0.5, c.height * 0.42, c.height * 0.78);
  gr.addColorStop(0, 'rgba(255,214,150,0.13)'); gr.addColorStop(0.36, 'rgba(255,214,150,0.04)'); gr.addColorStop(0.6, 'rgba(12,10,20,0.16)'); gr.addColorStop(0.82, 'rgba(12,10,20,0.42)'); gr.addColorStop(1, 'rgba(12,10,20,0.66)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function grfFlick(t) { const i = Math.floor(t * 12 + 1e-6), R = RNG('grfflick', i); return 0.02 * (0.5 + 0.5 * Math.sin(t * 7.3)) + (R.f() < 0.1 ? R.r(0.06, 0.12) : 0); }

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const GRF_DRIP_T = 2.5;   // bridge blobs carry drips this old: spray a bridge blob at least ~2 s before its bridge, with dripKey 'bridge'
const STYLE = {
  name: 'graffiti',
  paper: GRF.buff,
  // the wall with buff paint in colour c rolled over it (the old piece is painted out); mid-morph the brick under the
  // buff changes to the next era's wall
  backdrop(c, o = {}) {
    const A = grfWallCv(grfEraWall(o.eraA)), B = grfWallCv(grfEraWall(o.eraB)), u = o.phase === 'morph' ? o.u : o.phase === 'grow' ? 1 : 0;
    ctx.save(); screen();
    if (u < 1) ctx.drawImage(A.base, 0, 0); if (u > 0) { ctx.globalAlpha = u; ctx.drawImage(B.base, 0, 0); }
    ctx.globalAlpha = 0.66; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.07; for (let i = 0, R = RNG('grfbuff'); i < 14; i++) { ctx.fillStyle = i % 2 ? '#000' : '#fff'; ctx.fillRect(R.r(0, W), 0, R.r(40, 150), H); }   // roller lanes
    if (u < 1) { ctx.globalAlpha = 0.3 * (1 - u); ctx.drawImage(A.rel, 0, 0); } if (u > 0) { ctx.globalAlpha = 0.3 * u; ctx.drawImage(B.rel, 0, 0); }
    ctx.restore();
  },
  // the era seen through the bridge shape; its edge is a sprayed ring in the blob's colour (specks, then solid),
  // thinning as the window closes onto the blob. Near the blob the blob's drips hang from it.
  window(P, key, src, o = {}) {
    const c = o.c ?? GRF.white, u = o.u ?? 0, near = o.phase === 'grow' ? 1 - smooth(0, 0.35, u) : smooth(0.65, 1, u), k = o.phase === 'grow' ? Math.min(1, u * 4) : Math.min(1, (1 - u) * 4), w = lerp(5, 20, k);
    ctx.save(); screen(); grfBegin(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); screen(); ctx.lineJoin = 'round'; grfBegin(P);
    for (const [st, kk] of [[grfPat('fine', c), 6.5], [grfPat('mid', c), 3.4], [grfPat('dense', c), 1.7], [c, 0.8]]) { ctx.strokeStyle = st; ctx.lineWidth = w * kk; ctx.stroke(); }
    if (near > 0.02) grfDrips(P, c, { n: 4, key: 'bridge', t: GRF_DRIP_T, k: near });
    ctx.restore();
  },
  // the morphing shape: wet paint on the buffed wall, sprayed from one outline into the other. Its edge goes softer
  // and specks fly while it moves; its drips keep hanging.
  blob(P, c, key, u = 0) {
    const q = Math.sin(Math.PI * clamp(u)), bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, r = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2;
    ctx.save(); screen();
    grfPuff(cx, cy, r * (1.5 + 0.5 * q), c, 0.16 + 0.2 * q);
    grfSpray(P, c, { soft: 16 + 12 * q, key, drips: 4, dripKey: 'bridge', dripT: GRF_DRIP_T });
    if (q > 0.05) { const R = RNG('grfblobspit', key, F), n = P.length; ctx.fillStyle = c; ctx.globalAlpha = 0.85; ctx.beginPath(); for (let j = 0; j < 70 * q; j++) { const [x, y] = P[R.i(0, n - 1)], s = R.r(1.5, 4), d = 1 + R.r(0.02, 0.3); ctx.rect(cx + (x - cx) * d, cy + (y - cy) * d, s, s); } ctx.fill(); }
    ctx.restore();
  },
  hero(x, y, r, o = {}) { ctx.save(); grfHero(x, y - r * 0.04, r * 0.94, { key: o.key, mood: o.mood === 'wow' ? 'wow' : 'smile' }); ctx.restore(); },
  heroColor: GRF.cyan,
  heroPts(x, y, r) { return grfHeroPts(x, y - r * 0.04, r * 0.94); },
  // the street light over the finished frame, and its flicker
  post() {
    ctx.save(); screen(); ctx.imageSmoothingEnabled = true; ctx.drawImage(grfLight(), 0, 0, W, H);
    ctx.fillStyle = `rgba(8,6,14,${grfFlick(TT).toFixed(4)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  ones: true,
};
