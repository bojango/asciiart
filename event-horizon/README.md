# EVENT HORIZON: production integration

This folder holds the selected, approved renderer and first-stage physics
model used by the existing three-scene main page.

## Integration and visual safeguards

- The original root event-horizon.js loads first as a fallback.
  The production renderer.js replaces its existing
  window.PelagicEventHorizon scene interface only after the compositor,
  hero camera and planet art modules load. If a dependency is missing,
  the original renderer remains active.
- The original main UI, scene switcher, palette/detail/speed buttons,
  scrolling source code and full-art mode are unchanged.
  No independent LIGHT STUDIO, VIEW PASS, test menu or preview UI is loaded.
- The approved RGB glow and fixed 14-value lighting preset, soft disc
  occlusion, solid planets, Earth-like VERDANT materials and independent
  clouds, moons, rings and camera close pass are carried into production.
- These modules are independent copies of preview assets. Future preview
  experiments cannot silently modify the production scene.

## Physics: included but not yet controlling the artwork

physical-system.js provides the global EventHorizonPhysicalSystem:
a 5-solar-mass black hole and hidden 0.4-solar-mass red-dwarf donor,
at 0.01 AU separation with a 3.7723-hour circular binary period.
The donor nearly fills its Roche lobe. Eight planned circumbinary planet
distances and point-mass Kepler periods are included.

The existing visible orbital paths and their animation speed remain
ILLUSTRATIVE, deliberately unchanged until planet masses/orbital elements,
stability, and the persistent simulation clock are validated.
The companion, gas stream and physical model have no visible component yet.
Continuous accretion assumptions need more disc-instability modelling.

## Validation

The production integration regression tests cover the existing UI,
scene interface, all fourteen Light Studio values, absence of test controls,
invisible model, fallback renderer and scene layering at multiple sizes.
Existing PELAGIC and GREENWOOD implementation files are untouched.

## Production astronomy DEV and persistent orbital clock

The original DEV button in the bottom menu now opens a dedicated
**DEV / EVENT HORIZON** panel when the astronomy scene is selected.
It occupies the existing source-code panel, not the artwork. PELAGIC
and GREENWOOD retain their WEATHER / LIFE / SENSE developer tools.

The wall-art clock is in `scene-clock.js`, independent of the
accretion-disc / cloud / surface-animation time. It uses the
stage-one physical system's **VERDANT 64.1-day Kepler period** to scale
the current illustrative 3D path. This lets the close pass occur
approximately every **12.8 real days** at the default **WALL 5×** speed.

Supported developer speeds:
- **WALL:** 5× simulated time; persistent default
- **REAL:** 1×
- **FAST:** 100×
- **TEST:** 1,440× (one simulated day per real minute)
- **DEMO:** 86,400× (one simulated day per real second)
- **CUSTOM:** 0.001×–1,000,000×, adjustable in DEV

The bottom **speed** button cycles presets in EVENT HORIZON; in the
other two scenes, the existing animation-speed behaviour is preserved.
DEV supports orbit pause/resume, reset epoch, jump to VERDANT's next
illustrative close pass, UTC simulation date, elapsed days, ETA in
real time, camera LOD/radius, render glyph counters, and the hidden
binary mass and period. The accretion disc, cloud and axial spin
continue at attractive animation speed while the planets orbit slowly.

The clock saves rate, simulated time and pause state to browser-local
storage; resuming or reopening advances by actual elapsed wall time.
This is **not** synced across different devices yet. An offline wall
display will catch up on reload when its clock and browser storage are
preserved. A fully persistent installation service/epoch is a later
stage.

**Scientific status:** The binary masses and VERDANT period are from
the stage-one physical model. The *rendered* paths of all eight planets
remain illustrative and their relative periods have not yet been
replaced by a validated circumbinary ephemeris. Predicted 'next pass'
times are **camera-path events**, not scientifically calibrated
conjunctions, transits or eclipses.

Regression coverage: `tests/event-horizon-production.test.cjs` and
`tests/event-horizon-clock.test.cjs`.
