# Low poly

![sample](sample.png)

Low-poly faceted 3D illustration: every form — sky, ridges, a mountain, pines, rocks, clouds, water, the sun and moon, crystals, the fox — is a mesh of **flat-shaded triangles**. Each facet carries one flat colour taken from the form's base colour and a fixed light from the top-left, so neighbouring facets differ in brightness and the eye reads planes, not lines. No outlines, no gradients inside a facet, no blur, no texture. The world is built in depth layers with atmospheric perspective (farther = lighter and closer to the horizon colour). Motion on 1s with smooth easing and springs: shapes assemble facet by facet, a light shimmer sweeps across the facets, layers slide against each other in parallax, clouds drift, water and stars twinkle.

**The one rule: a picture is facets and nothing else.** Depth comes from the tone of each plane; a curve is a polygon; a shadow is a darker facet.

## Palette and meaning (`LP` in kit.js)

Two era palettes, each with its own light (`lit`), shadow (`shd`) and distance haze (`haze`). A scene picks one first thing with `lpUse('dawn' | 'night')`.

| role | dawn | night | use |
|---|---|---|---|
| era ground (`bg`) | `#f3ab8c` peach | `#1a1f4c` indigo | `ERA_BG`: the colour the renderer fades to and from |
| sky stops, zenith → horizon (`sky`) | `#4f629c` `#a985ad` `#f09a86` `#ffc89a` `#ffe6c0` | `#0b0d2a` `#141945` `#1f2862` `#2a4379` `#356a8a` | the triangulated sky gradient |
| light (`lit`) | `#fff0d4` warm cream | `#a4ecd4` mint moonlight | what lit facets lean toward (up to 50%) |
| shadow (`shd`) | `#27456f` blue-teal | `#070919` near-black | what shaded facets lean toward (up to 55%) |
| haze (`haze`) | `#ffd0b0` | `#2a3d76` | atmospheric perspective: `lpHaze(c, far)` |
| the mountain (`peak`) / its cap (`snow`) | `#e9686e` coral / `#fff4e8` | `#35438a` / `#d6eef0` | the subject |
| ridges (`ridge`) | `#cf6f88` | `#2c3a7c` | far layers, always hazed |
| water | `#3d9aa0` teal | `#18386a` | lake band |
| ground / pines / rocks | `#1c4c57` / `#27797a` / `#7a6f95` | `#0e1436` / `#135a64` / `#2b3168` | the foreground (teal shadows at dawn) |
| clouds | `#fff0e0` | `#34407f` | drifting life |
| plates (`ink`) and type (`text`) | `#11323b` / `#fff6e8` | `#090b22` / `#f3ecd2` | caption and tag plates, their lettering |
| highlight chip (`hi`) / its type (`hiText`) | `#ffd36b` gold / `#11323b` | `#8fe3c8` mint / `#0e1436` | the caption's one highlighted word, the tag's number chip, fireflies |
| crystals | — | `#4fd6bd` | glowing mint accents |
| sun / moon | `LP.sun #ffd36b`, facets from `LP.sunPal` (`#fffbe2` → `#f0843f`) | `LP.moon #f3ecd2`, facets from `LP.moonPal` (`#ffffff` → `#8691c0`) | the gems, also the bridge shapes |
| **the hero** | `LP.fox #ff8a2e`, `foxW #fff4e4`, `foxK #2b1c30` | same | amber-orange is the fox's and nothing else's |
| morph sheet | `LP.paper #6f6396` dusk mauve, facets from `LP.dusk` | | the sheet a morph happens on |

A frame uses one era palette plus the fox. Never mix lights: everything in a frame is toned with the same `lit` / `shd` (the gems are the only things that carry their own).

## Facets, shading, seams

- **Light is fixed:** `LP_L` = (−0.55, −0.65, 0.52) normalised — top-left, toward the viewer. A mesh gives every vertex a height; each facet gets Lambert against that light, mapped so a flat facet is the base colour, lit facets go up to +1 and shaded ones to −1. Hand-built things (pines, crystals, the fox) set their tones by hand with the same convention: left / upper facets positive, right / lower facets negative.
- **Tone, never alpha:** a facet's colour is `lpTone(base, s)`: the base mixed toward `lit` (s > 0) or `shd` (s < 0). Add a small seeded jitter (`jit` 0.12) so no two neighbours match.
- **No cracks:** every facet is filled and stroked 1.2 screen px in its own colour (`lpFacet`), and a finished mesh has its silhouette filled first as an undercoat. Never draw facets with `globalAlpha` (the overlapping hairlines would show).
- **Meshes are static.** `lpMesh` caches by key; the outline for a key must never change. Move, scale or sway a mesh with `ctx.translate / scale`, or draw hand-built facets from animated points — never rebuild a triangulation per frame.
- **Facet size carries scale:** large and soft in the sky (4 × 8 cells for the whole frame), about 1/7 of the width on a mountain, small on the hero. Far layers get lower contrast (`k` 0.6–0.8) as well as haze.
- Type: `LP_SANS` = `Futura, "Century Gothic", "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, "Liberation Sans", "DejaVu Sans", sans-serif`, weight 700, flat colour, always on a faceted plate. Captions 72px, ≤ 2 lines, centred at `CX`; tags 36px.

## Motion habits

- On 1s (`ones: true`); smooth easing and springs, never a boil.
- **Things assemble facet by facet.** `t0` + `dur` (or `grow` 0..1) on any mesh: facets flip in by rank (bottom-up by default; `from: 'top' | 'left' | 'center'`), each one unfolding across its own centre with a small overshoot and a flash of light. The mountain takes ~1.25s, a caption plate 0.4s.
- **The shimmer:** one band of light sweeps the frame along the light's diagonal every `LP_SWEEP.every` (3s), starting `at` 1.5s and lasting `len` 1.2s; every mesh brightens where the band crosses it (`shim`, 0.3 by default; 0.45 on the subject, ~0.12 on far layers and plates). It is in screen space, so it crosses all layers as one beam.
- **Parallax:** draw each layer inside `lpPar(depth, …)` (0 = pinned to the screen, 1 = the camera). Demo depths: sky 0, sun / moon 0.12, far ridge 0.3, clouds and birds 0.4, mid ridge 0.5, the mountain 0.75, the lake 0.9, foreground 1. A slow camera push with a small pan (7%, 40px) is enough to make the layers slide.
- **Idle life never stops:** sky facets breathe (±5% tone on slow sines), water facets ripple and now and then one flashes, clouds drift and bob, pines sway at the tip, gems rock their inner ring (`lpGemWob`), stars and fireflies pulse, crystals glow, the fox breathes, blinks, flicks an ear and sways its tail.
- Entrances of small things are springs: pine tiers pop one after another, crystals shoot up from their base, stars pop in a 35ms stagger, caption words rise 0.4 × size.
- Cues sit on the 16th grid (0.125s at 120 BPM); the big ones on beats.
- Camera: a slow ease push inside an era, anchored on the ground line so the foreground never slides under the caption; after a morph the new era opens ~10% close and settles on a slow spring. Never shake.
- **The morph is a gem re-triangulating:** bridge shapes are 12-point gems (`lpGemPts`); `STYLE.blob` draws the blended outline as a cut gem whose inner ring turns one full step during the morph, so every facet shears, re-forms and re-shades while the girdle changes shape. Keep both bridge shapes roundish and of similar size (a spiked 12-gon sun → a 12-gon moon).

## Frame checklist (on top of grammar/FRAME.md)

1. **Everything is facets:** no outline, no smooth curve, no gradient inside a shape, no soft shadow. A frame that could be flat vector has too few facets on its subject.
2. **One light.** Lit planes face the top-left, shaded planes the bottom-right, on every object in the frame; shadows take the era's `shd` (teal-blue at dawn, near-black at night).
3. **Depth is stacked:** at least three layers behind the subject (sky, far ridge, mid ridge), each lighter and closer to the haze colour than the one in front; the foreground is the darkest thing in the frame.
4. **One subject** (the mountain) in the upper-middle, about 70% of the frame width; the light source (sun or moon) clear of it, never behind a cloud or a ridge at the moment of a morph.
5. **Amber-orange only on the fox.** The highlight chip is gold at dawn and mint at night; its word is dark type on it and must read at phone size.
6. **Type sits on a plate**, never straight on the facets; plates and tags stay inside x 60–940, y 250–1500.
7. **Something is moving** in every held frame (shimmer, water, a cloud, a blink) — and nothing reshuffles: a mesh that flickers between frames is a bug.
8. **No light cracks** between facets anywhere, including the sky and the morph sheet (zoom a still to check).

## Kit API (`kit.js`, on top of `kit/core.js`)

- Palette and colour: `LP` (`dawn`, `night`, `sunPal`, `moonPal`, `dusk`, `sun`, `moon`, `fox`, `foxW`, `foxK`, `paper`), `lpUse(name | pal)` → the palette (sets the current one, `lpPal`), `LP_SANS`, `LP_L`, `LP_SWEEP`; `lpRGB`, `lpHex`, `lpMix(a, b, u)`, `lpTone(c, s, pal)`, `lpHaze(c, far, pal)`, `lpGrad(stops, u)` (all accept `#hex` or `rgb()`).
- **Any shape, low-poly:** `lpPoly(key, outline, base, o)` = `lpDraw(lpMesh(key, outline, o), base, o)`. `lpMesh` options: `cell` (facet size) or `n` (about how many interior points), `z(x, y, R, isEdge)` (vertex height; default a dome), `bulge`, `from`. `lpDraw` options: `pal`, `k` (contrast), `jit`, `shim`, `tw` / `twf` (twinkle), `t0` + `dur` or `grow`, `tone(t)`, `col(t, rgb)`. Seeded interior points on a jittered grid + Delaunay (`lpDelaunay`); concave outlines are clipped, so the silhouette is exact.
- Low level: `lpFacet(P, c, s, pal)` (one flat facet, seam-safe), `lpPath(P)`, `lpLambert(A, B, C)`, `lpInside(P, x, y)`, `lpCentroid(P)`, `lpZoom()`, `lpBand()`.
- Depth: `lpPar(depth, draw)`, `lpParPts(P, depth, cam)` (a far object's outline in the camera's own coordinates, for bridges: `lpParPts(lpGemPts(…), depth, camAt(era, TT))`).
- Sky: `lpSky(pal, { horizon })`, `lpSheet(c, pal)` (the same sheet in one colour), `lpStars(key, n, [x0, y0, x1, y1], { t0, avoid(x, y), c })`, `lpMotes(key, n, box, c, { t0 })` (fireflies, pollen, snow), `lpCloud(key, x, y, w, c, { drift })`, `lpBird(x, y, span, c, { ph, f })`, `lpSpark(x, y, r, c)`.
- Gems: `lpGemPts(x, y, r, n = 12, spike)` (bridge outline), `lpGemDraw(O, c, { turn, pal, inner, k })`, `lpGem(x, y, r, c, { spike, pal })`, `lpGemWob()`.
- Land: `lpRidge(key, y, amp, c, { n, bot, k, shim })` + `lpRidgePts`, `lpPeak(key, x, y, w, h, c, { t0, dur, capT0, snow, shim })` + `lpPeakPts` → `{ P, cap }`, `lpRock(key, x, y, r, c)`, `lpTree(x, y, h, { c, t0 })`.
- Water and crystals: `lpWater(key, x0, y0, w, h, c, { rows, cell, glint: { x, w, c } })`, `lpCrystal(x, y, h, c, { t0, lean, glow })`.
- Type: `lpFont(size, weight)`, `lpText(str, x, y, size, color, { align, base, weight, al, maxW })`, `lpTextW`, `lpPlate(key, x, y, w, h, c, { grow | t0 + dur })`.
- Hero: `lpFox(x, y, s, { key, flip, tilt, twitch: t | [t…], pop, shadow, pal })` — (x, y) between its front paws, s its height (ears included); sets `SPARK_AT`. `lpFoxPts(x, y, r)` (bridge silhouette).
- Captions (through `DEFER`): `lpCaption('line one\nline *highlight*', { y, size, at, x, pal })`, `lpTag('01', 'LABEL', { pal })`; both fold away during the first 0.3s of a bridge's shrink (`lpLeaving()`) and, after a bridge, wait until the growing window has passed them (`lpArrive()`). With the default `y` 1450 and size 72 a two-line plate spans y 1266–1493.
- `STYLE`: `paper` (dusk mauve), `backdrop` (a faceted sheet in the given colour), `window` (a clean mask framed by a girdle of facets in the bridge colour), `blob` (the re-triangulating gem), `hero` (`lpFox`), `heroColor`, `heroPts`, `post` (nothing), `ones: true`.

## Do / don't

- **Do** start every scene with `lpUse(...)` and `lpSky(pal)`; the sky is the ground of the look.
- **Do** give a mountain or ridge a height function with a ridge line (`z`), so whole flanks fall into light or shadow; the default dome suits rocks, clouds and plates.
- **Do** haze far layers (`lpHaze`) and lower their contrast; keep the strongest contrast and the shimmer on the subject.
- **Do** hand over far objects' bridge outlines with `lpParPts`, or the morph window opens in the wrong place.
- **Do** anchor the camera's zoom on the ground line when a caption plate sits just below it.
- **Don't** stroke outlines, use gradients as fills, blur, glow or drop shadows.
- **Don't** change a mesh's outline under the same key, or key a mesh on anything that changes per frame.
- **Don't** draw meshes with `globalAlpha` < 1; fade by flipping facets out (`grow`) instead.
- **Don't** spend amber-orange on anything but the fox, or put the fox on a facet of similar warmth without a dark facet behind it.
- **Don't** morph a round gem into a long thin shape (the renderer resamples by angle and pinches).

## Not matched / known weaknesses

- Built from the genre's conventions, not measured from a specific reference.
- The shading is a 2.5D trick (a height per vertex, Lambert on the facet): there is no real 3D, so nothing can rotate in depth; a "turning" gem only rocks its inner ring.
- Delaunay ignores the outline's edges: on a strongly concave outline a facet may bridge a notch and be cut by the clip, leaving a facet edge that is not a triangle side. Subdivide such outlines or split them into convex parts.
- The fox is a front view only (flip moves the tail); it has no walk or hop.
- The sky is not cached (its facets breathe every frame) and costs about 10 ms of the ~30 ms a frame.
- Caption plates assemble slightly later than the first word starts rising; with very short captions the first word can show on a half-built plate for 2–3 frames.
- Font width depends on the system (Futura on macOS, Century Gothic / Segoe UI on Windows, DejaVu on Linux): leave ~10% slack in caption lines.

## Proven on

Its demo only. `demo/` (6s, 9:16, 120 BPM, 24fps): at dawn, under a faceted peach-to-blue sky, a coral mountain assembles facet by facet and gets its snow cap while the sun gem climbs out from behind the ridges; pines pop up tier by tier, three birds cross, clouds drift, the lake twinkles with the sun's reflection and the fox sits watching ("Pagi merekah di *gunung*"). At 3.0s the sun re-triangulates into the moon on a dusk-mauve sheet and the same world opens at night: stars pop in, mint crystals shoot up, fireflies drift, the fox lifts its head to the moon and flicks an ear ("malam turun, *rubah* berjaga"). Score: an F pad with a climbing pluck per facet row, then a chord stab + sub on the morph and a calm D-minor groove with crickets. Tile deterministic, 18–45 ms/frame (export 18–32, tile 30–45); `review.mjs` all PASS, −14.7 LUFS, true peak −3.1 dBFS.
