# EVENT HORIZON — experimental reference port

**This is a separate, unmerged experiment. The production EVENT HORIZON renderer remains restored V2.**

The private-home artwork follows the user's visual reference from **JIN2 (@jin_22ee)**.
The owner reports direct permission from the creator for this personal project.
The rendered page is openly reachable via GitHub Pages; any redistribution,
commercial use, or republication of the source should be cleared separately
with the creator.

## Technical approach

1. Translate the black-hole example's gas field equations into Canvas2D JavaScript.
   The reference's differentiated orbital speeds, high-frequency gas streaks,
   thin shadow, tilted disk and far-side lensing geometry are retained.
2. Use the source's four graded ASCII symbol pools and heat/colour thresholds.
3. Draw the rear and near-side gas as separate transparent glyph canvases.
   Add two blur passes using Canvas2D lighter compositing, followed by crisp glyphs.
   Keep the shadow opaque between the two depth layers.
4. Draw the existing eight planets in their original orbits, with optional
   black-hole-only preview mode.
5. Render a responsive phone preview with live A/B switching against V2.

### Preview

Once the experiment is mirrored to an isolated GitHub Pages path:

https://bojango.github.io/asciiart/preview/event-horizon/

Buttons: PORT/V2 compares against V2; PLANETS ON switches the planets off
to inspect the black hole; DETAIL, PALETTE, SPEED, and PAUSE support inspection.
This **does not** overwrite \`/?scene=event-horizon\`.

### Verification

\`node --test tests/event-horizon-rebuild.test.cjs\`

Local JavaScript smoke tests cover an offscreen-capable Canvas2D mock, additive
blur pass counts, finite glyph coordinates, orbital periods, eight planets and
both modes. **A real iPhone Safari screenshot and frame-rate check are still
needed**; browser rendering cannot be considered visually accepted from
headless geometric checks alone.

### Scientific limits

Gas orbital velocity decreases with radius using the source's Kepler-inspired
scaling. The bright upper band is a lensing approximation, not a relativistic
ray tracer. Planet periods follow Kepler's third law but the eight-world system
is fictional.

## Reference-faithful luminosity pass (19 November 2026)

- The black-hole gas equations, ASCII glyph positions, disc tilt, planets and star field are unchanged.
- Source reproduction: `TRAIL=0.4` retained with fading and Canvas `lighten` (Pygame `BLEND_MAX` analogue), then small and broad additive glow passes, scaled from source blur radii 5 and 22, at alpha 0.75 and 0.45.
- The original's DEEP, RED, ORANGE, AMBER and HOT heat thresholds now drive the coloured text, with extra white-hot colour temperature near the shadow and brighter gold gas towards the edges for mobile legibility.
- Preview script cache version is `renderer.js?v=3`. Production V2 remains unchanged.
- iOS Safari filter support varies; a two-pass shadow-blur fallback preserves additive glow. Actual iPhone validation of brightness and performance is still needed.

## Light Studio — interactive experimental tuning

Open [the source-RGB test page](https://bojango.github.io/asciiart/preview/event-horizon/source.html), then tap **LIGHT STUDIO**.

- **Brightness, core exposure, warmth/gold, saturation, gamma, contrast and highlight rolloff** alter only the black-hole RGB light mapping. Highlight rolloff softens per-channel clipping to help preserve colour separation at high gains.
- **Bloom strength, near bloom radius and wide bloom radius** separately adjust the two additive light passes. Stronger bloom is implemented with repeated finite-alpha passes rather than invalid values above 1.
- The compact mobile dock displays one active slider at a time, with a numeric value. Swipe the horizontal parameter chips or use the previous/next buttons to move between all ten tuners. Defaults reproduce the earlier working source-RGB preview.
- **Copy Settings** exports JSON with all ten numeric controls, palette, detail setting and viewport. On iOS browsers that restrict clipboard access, a manually selectable JSON field appears.
- The browser saves controls to `eventHorizon.lightingTuners.v1`. Individual URL parameters override saved settings so presets can be shared. **RESET** restores the original values.
- Opening the dock hides the normal scene buttons and keeps its height compact so the black hole remains visible during adjustments. **VALUES** opens an optional list of every numeric setting; the A/B V2 mode disables all source-specific tuning controls.
- The production `event-horizon.js`, GREENWOOD, PELAGIC and main app are not modified.

Run: `node --test tests/event-horizon-tuner.test.cjs`.

## Compact mobile dock revision

- Only the experimental `source.html` UI is changed; the RGB compositor, simulation, planet orbits and background stars remain unchanged.
- In **TUNE** mode the scene buttons hide, one slider stays visible, and the chip row scrolls horizontally. **VALUES** is a separate review mode, with **COPY SETTINGS** and **RESET** available at all times.
- Existing saved presets, shareable URL parameters and full JSON export are retained. New scene controls have no effect on production V2.

## Selective Core Bloom — 19 November 2026

The owner-approved baseline is the new **Reset** target. Existing ten tuning values were copied exactly:
`brightness=2`, `coreExposure=3.10`, `warmth=1.70`, `saturation=1.15`,
`gamma=1`, `contrast=.90`, `highlightRolloff=.20`,
`bloomStrength=2`, `bloomRadiusSmall=1.05`, `bloomRadiusWide=1.80`.

Four additional experimental tuners are added, bringing the total to **14**:

- **Core Bloom Strength** (0–6×, default **0**): additive light sourced from inner ASCII glyphs only.
- **Core Bloom Radius** (0.25–6, default **1.10**): width of the isolated 1/4-resolution Gaussian glow.
- **Core Heat Threshold** (0.20–1.50, default **0.70**): minimum gas heat contributing to core glow and white lift.
- **Core White Lift** (0–1, default **0**): shifts selected hot glyphs towards near-white, separately from exposure.

The selective glow uses its own black RGB canvas, Gaussian blur and a masked event-horizon shadow. At its zero-strength defaults, it adds **no additional light** and leaves the existing accepted image unchanged. Existing gas field, geometry, planets, stars and general bloom remain untouched. The new controls are first in the compact review sequence after Core Exposure.

This test build stores new presets under `eventHorizon.lightingTuners.v2` without replacing the previous V1 saved settings. New clean URLs begin from the approved ten-value baseline. The JSON export uses `presetVersion:2` and includes all fourteen controls. The normal V2 artwork and GREENWOOD/PELAGIC are unaffected.

Validation: `node --test tests/event-horizon-tuner.test.cjs` and in-browser inspection at the target iPhone resolution; avoid considering this visually final until reviewed on device.

## Locked lighting preset — 19 November 2026 at 10:47

The accepted 14-setting **EMBER / HI** look has been saved exactly as `getDefaults()`
in `source-compositor.js`. This is the baseline for all future edits, not a
temporary slider state. New fresh previews store overrides in
`eventHorizon.lightingTuners.v3`, so historical V1/V2 tuning sessions remain
intact and cannot silently replace the locked preset. Export format: `presetVersion:3`.

```json
{"brightness":2,"coreExposure":3.85,"coreBloomStrength":3.45,
"coreBloomRadius":2.25,"coreThreshold":0.8,"coreWhiteLift":0.8,
"warmth":1.7,"saturation":1.15,"gamma":1,"contrast":0.9,
"highlightRolloff":0.2,"bloomStrength":2,
"bloomRadiusSmall":1.05,"bloomRadiusWide":1.8}
```

The illustration's asymmetric directional light gain is reduced from 0.25 to
0.14 in both the disk and upper lensing bands of `renderer-reference.js`.
The positions, simulated gas density/shape, tilt, radius, shadow and planetary
rendering remain untouched. **This is an artistic Doppler-beaming approximation,
not a relativistic radiative-transfer calculation.**

## Long-term goal: predictive fictional black-hole planetary system

Today's planet layer is *not yet a physically calibrated solar system*.
Eight fictional planets have circular projected orbits and relative periods
`P=142*(relativeRadius/0.4)^1.5` in display-time units; there is no physical
central mass, measured distance, eccentricity, mutual gravity, or calendar epoch.

A physically grounded future edition should treat rendering and physics as
separate components:

1. Pick a physically specified central black hole (mass, possible spin,
   distance scale, disk inclination, feeding/accretion rate, luminosity).
2. Give each planet a stable identifier, mass and radius plus orbital
   elements `(a,e,i,Ω,ω,M0)` at a shared epoch, expressed in AU, SI or
   gravitational-radius units as appropriate. Derive Kepler periods from `GM`.
3. Compute deterministic 3D positions and velocities from the timestamp,
   solve Kepler's equation initially, then project to the existing ASCII scene.
   Simulated time must be independent of frame rate, playback speed and
   screen geometry. Supply play/pause, date scrub and time scale.
4. Predict reproducible conjunctions, apparent alignments, eclipses/transits
   and oppositions from orbital geometry plus a defined observer viewpoint.
   These must be calculated, not scheduled random events.
5. Validate dynamical stability and disk/planet clearance. Add N-body
   perturbations, relativistic precession, time-delay/light bending and
   dynamical accuracy tests as needed; use stated approximations rather than
   calling illustrations exact general relativity.
6. Compare any upgraded accretion disk against physical relativistic
   ray-tracing/doppler models, without sacrificing the user-approved ASCII
   colour and glyph aesthetic. Explicitly separate physically-derived
   luminosity from the artistic brightness sliders.

Bright accretion disks also imply strong irradiation, so orbital stability
alone does not imply habitability. A plausible system needs both a disk
feeding assumption and appropriate planetary distances.

**No orbital-engine changes are included in this lighting commit.**

## Phase A — spinning ASCII planets (19 November 2026)

**Preview:** https://bojango.github.io/asciiart/preview/event-horizon/planets.html

Dedicated assets: `planet-art.js`, `renderer-planets.js` and `planets.html`.
They are separate from the approved Source RGB preview (`source.html`)
and the live production scenes.

- Replaces static screen-space patterns with visible-sphere surface maps
  sampled using each planet's **own independent axial rotation**.
  Spin phase is a deterministic function of simulation time; pausing,
  resuming and changing playback speed never introduces random drift.
- Preserves all eight established names, orbital paths, orbital periods,
  planet centres and apparent radii. No new planet or black-hole geometry
  has been introduced.
- Distinct identity per planet: CINDER (volcanic), SILEX (fractured ice),
  VERDANT (terrestrial/cloud), RUST (desert), ATLAS (stormy gas giant),
  HALO (ringed gas giant), AZURE (ice giant), UMBRA (dark icy world).
- Material-specific procedural texture (continent-like regions, banding,
  spots, fractures, frost, craters); brightness-weighted ASCII glyphs
  and denser but restrained character sampling rather than image sprites.
- Spherical normals create an initial day/night boundary; illumination
  points towards the central accretion region and varies automatically as
  the existing planet orbit changes. This is an illustrative central-source
  approximation, **not yet a physically integrated luminous disc**.
- HALO's far-side rings render behind the sphere; near-side ring characters
  overlay the sphere. Their tones depend on the central light direction.
  Selected atmospheres have very faint ASCII edge lettering.
- The phase retains the owner-approved 14-setting EMBER black-hole lighting
  and 14% directional bias without modifying its RGB compositor.

**Limits:** surface structures, spin rates, tilts, reflected light and
atmospheric types are visually plausible, not calibrated to an actual black
hole mass, planet ages, compositions or measured radiation field.
Smaller worlds have too few screen pixels for visually strong spin
without increasing apparent size. Accurate extended-disc radiation,
radiative transfer, eclipses, gravitational orbital perturbations and
physical spin-orbit relationships remain Phase B / later simulation work.

Checks: `node --test tests/event-horizon-planets.test.cjs`.
A real iPhone screenshot and motion inspection should be performed before
merging the new planet renderer into the existing scene selector.

## Phase A visual refinement — rounded silhouettes and depth (19 November 2026)

Preview: https://bojango.github.io/asciiart/preview/event-horizon/planets.html

The user requested a clearer circular outline for the small, shadowed
worlds and brighter nearby planets with dimmer distant ones.

- A centred, symmetrical planet-glyph lattice replaces sampling from the
  left edge. Positions and apparent radii do not change, but the characters
  now form a complete circle even on tiny planets.
- A deliberately faint shadow-side fill, a slightly wider terminator and
  soft wrap lighting keep full spheres legible. Smaller bodies receive
  a modest extra ambient floor, rather than a hard half-disc cutoff.
- A deterministic `proximityLight(orbit)` modifies the apparent intensity of
  each planet, its atmosphere and HALO's rings. It uses the existing
  **unprojected orbital radius**, so lighting is stable while a planet
  passes in front of or behind the black hole, and is independent of
  device screen size or CSS projection. Inner orbit 0.40 gets 1.12×
  and outer orbit 1.39 gets approximately 0.71× in the compressed
  lighting model.
- The source still points its main light vector at the central accretion
  region and rotates the day/night boundary as each planet orbits.
- Orbital periods, angles, spin phases, planet geometry, per-planet material
  and all locked black-hole Light Studio values remain unchanged.
- The distance response is **not** claimed to be a calibrated physical
  irradiance model. It is a visibly compressed, inverse-square-inspired
  artistic mapping until the planned orbit and extended-disc light physics
  work is available.

Regression tests in `tests/event-horizon-planets.test.cjs` now check
centred silhouettes, monotonic orbital-light falloff, reproducible
planet texture, full ring layers and nonzero shadow-side visibility.
The accepted `source.html` preview, production V2, Jellyfish and
GREENWOOD remain unchanged.

## Phase A follow-up: nights, two ring systems and moons (19 November 2026)

The experimental `planets.html` scene now has a slightly stronger day/night
contrast: the minimum night-side ambient is reduced by roughly 10–20% and its
opacity is eased back a little. Full circular silhouettes and orbital-distance
lighting remain unchanged.

**Two ringed worlds** are clearly distinguished: ATLAS has one subtle narrow
ASCII ring, while HALO has a more prominent two-band ring. Each renders its
rear segments behind the sphere and foreground segments above it. Ring
characters, spacing, brightness and orientation are tuned for small iPhone
displays while keeping the gas-giant textures visible.

**Five tiny moons** now orbit four hosts: VERDANT (one), ATLAS (two), HALO
(one) and AZURE (one). They consist of one dim ASCII character each, travel
along deterministic, inclined projected local ellipses, and follow each
planet as it orbits the black hole. Moons pass behind or in front of their
host based on local phase and are skipped while hidden by the planet.
Their simulated periods and host-relative radii are artistic, pending the
future calibrated orbital system.

The Phase A preview includes the new planet asset via `planet-art.js?v=3`.
The black-hole compositor, approved Light Studio preset, orbital renderer
and production scenes are unchanged.

Regression checks: `tests/event-horizon-planets.test.cjs` now covers
night/day contrast, ring hierarchy, the five deterministic local moon orbits,
and preservation of existing orbital motion.

## Phase B prototype — VERDANT close-approach camera (19 November 2026)

Preview: https://bojango.github.io/asciiart/preview/event-horizon/depth.html

New, isolated files:
- `hero-camera.js`: deterministic three-dimensional illustrative circular
  orbit with a shared pinhole camera, projected position and apparent angular
  size. `camera(width,height)` computes a *uniform* scene scale from the
  shorter effective screen dimension, rather than fitting the whole orbit
  separately into each aspect ratio.
- `planet-art-depth.js`: same eight spinning worlds and five tiny moons as
  Phase A, with additional rotating, body-fixed surface texture and capped
  ASCII glyph density for VERDANT at closest approach.
- `renderer-depth.js`: the approved black-hole rendering and the seven
  original planets, with only VERDANT routed through the perspective camera.
- `depth.html`: independent iPhone-first page with a minimal bottom-left
  **VIEW PASS** button and collapsible scene menu, allowing close passes to
  remain visible instead of hiding behind the Light Studio.

In the 440×736 reference viewport VERDANT's closest camera approach is
approximately (x=281,y=654) with projected radius 108 CSS px, so it fills
about the bottom quarter of the visible scene while leaving the event horizon
unobstructed. The same instant at 844×390 maps through the *same world*
camera, simply displaying a much wider lateral field of view (around 1593
reference-world units versus 440 in the portrait reference viewport).

Across a demonstration orbit, VERDANT is visible in about 45% of portrait
frames but effectively all landscape frames. It can exit either horizontal
edge and reappear without changing orbital phase, size logic or orbital
period. It retains its existing one-character moon, which becomes visible
during some foreground passes according to its own independent phase.

**Do not mistake this for the finished astronomical model:**
- The geometry is a genuine 3D circular path projected through a pinhole
  camera, but its length and period are composition parameters, not SI values
  inferred from a chosen black-hole mass or Keplerian orbital elements.
- The `VIEW PASS` button jumps to seven *simulation seconds* before the next
  visually closest pass. It is not a wall-clock schedule or a physical
  approach prediction.
- A future physically calibrated orbital engine will replace the camera-path
  composition, while keeping the deterministic projection, near/far depth,
  level-of-detail transitions and moon visibility logic.
- The black-hole geometry, its locked 14 photometry controls, PELAGIC,
  GREENWOOD and the production V2 scene are not modified here.

Validation: `node --test tests/event-horizon-depth.test.cjs`.
Real iPhone (portrait and landscape) review is still required before treating
this as visually approved or merging it into the existing scene selector.

## Phase B close-pass visual refinement — 19 November 2026

The independent `depth.html` preview has been refined without touching
the live app or the approved black-hole Light Studio.

- `hero-camera.js`: visual closest approach is approximately **20% larger**
  than the prior prototype (projected radius **128.5 px**, up from
  **107.5 px** at the 440×736 reference viewport). It remains in the
  bottom foreground near (293, 677), with the accretion-disc shadow clear.
  Camera coordinates are still world-based, so landscape displays a
  wider horizontal view rather than independently scaling the orbit.
- `planet-art-depth.js`: VERDANT now has a distinctly **blue ocean**
  material, coherent and rotating **green/earthy continental landmasses**,
  transitional coastal tones and subtle polar ice. A **separately moving,
  translucent ASCII cloud layer** sits above the terrain.
- A new `CLOSE` level of detail activates only at high angular size.
  It uses about **1,650 body glyphs**, with around **130 sparse cloud
  glyphs** at the reference approach. The glyph count remains bounded
  for phone use, while the distant planet remains compact.
- Axial spin, one-character moon, existing lighting falloff, the other
  seven planets and the user's locked 14 black-hole light values
  remain unchanged. Moon visibility is still determined by local phase.
- `depth.html` cache-busts the camera and Earth-like planet renderer
  as `hero-camera.js?v=2` and `planet-art-depth.js?v=2`.
- These planet materials and the close pass are visually motivated,
  **not a scientifically calibrated model of real oceans, continents,
  clouds or black-hole orbit timing**.

Regression tests: `tests/event-horizon-depth.test.cjs`; includes
deterministic body-fixed continents, separate cloud motion, near-pass
size/safety, glyph budget and unchanged original orbits.

## Phase B occlusion pass — opaque planets and softly backed accretion disc

The `depth.html` preview now uses real foreground/background opacity:

- Every planet draws a fully opaque, near-black circular body in
  `planet-art-depth.js` **before** its coloured surface ASCII glyphs. This
  prevents stars, planets, gas and orbit markers from showing through the
  spaces between glyphs. Rear ring halves and far-side moons still render
  *behind* this solid body; front halves/moons render in front.
- `renderer-depth.js` adds an elliptical, feathered opacity matte underneath
  the existing accretion gas. At its densest the matte approaches 92% black;
  it fades gradually to zero at the outer edge. Rear planets and background
  stars therefore appear partially obscured by dense foreground gas,
  while the glow and character detail remain visible.
- The matte is drawn **before** the approved RGB additive compositor, so
  it does not modify source light colours, exposure, blur/bloom, gas movement,
  disc geometry or the black-hole shadow.
- All planet textures, axial rotation, moon positions, world and camera
  coordinates remain unchanged. This preview makes *visual* occlusion more
  realistic; the matte is not yet density-integrated radiative transfer.

`depth.html` uses `planet-art-depth.js?v=3` and
`renderer-depth.js?v=2`. The approved `source.html`, previous
`planets.html` and production scenes remain unchanged.

Regression tests check full opaque sphere coverage, ordering of planet
rings/moons and source RGB, and a feathered accretion matte.
