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
