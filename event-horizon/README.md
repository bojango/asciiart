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
