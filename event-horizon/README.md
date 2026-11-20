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

## EVENT HORIZON fullscreen HUD: character count and astronomical events

The artwork overlay in both ordinary and fullscreen installation mode now
displays:

- Bottom-left **ASCII: N**: a live, approximately per-second tally of
  character marks submitted by the frame's stars, orbital guide dots, the
  accretion field, planets, clouds, rings, atmosphere and moons. These are
  drawn source glyphs, not OCR/pixel-counted visible characters; glyphs
  covered by foreground opacity are still counted.
- Bottom-right **REAL TIME** at 1×, or **REAL TIME X N** for any other
  simulated time speed, above the original ORBITAL DYNAMICS caption.
- Top-right a collapsed **+ ASTRONOMICAL EVENTS** toggle beneath LIVE.
  Expanding smoothly reveals:
  - **VERDANT NEXT APPROACH:** date/time of its next camera-close pass
  - **NEXT ALIGNMENT:** date/time only when all eight planet centres are
    genuinely near the screen's vertical centre line; otherwise an
    explicit no-forecast message
  - **NEXT ACCRETION PASSING:** first planet whose centre enters the
    projected accretion-disc envelope *in front* of the black hole
- Times are the **expected real-world UK local dates**, using
  Europe/London for automatic BST/GMT, and update on clock speed changes,
  pause/resume or jump-to-pass.
- This UI is visible **only** in the EVENT HORIZON scene. PELAGIC and
  GREENWOOD retain their exact existing HUD text and behaviour.

### Forecast model limitations

The wall-art clock already scales VERDANT's illustrative orbit to a
64.1-day Kepler reference period. The eight rendered paths still do not
follow a validated N-body or full three-dimensional physical ephemeris.

The new event engine in `event-forecast.js` makes screen-space
**visual forecasts**, not physically certified gravitational predictions.
"Next accretion passing" is a projected-disc crossing by a foreground
planet and is not a gas-transfer or companion-star event.

An all-eight alignment requires **each** planet to be within 55% of the
scene's reference black-hole radius horizontally from the screen centre,
and on screen. A ten-simulated-year scan of the illustrative trajectories
may find no such event. In that case the UI reports
**NO DATE FORECAST (10 SIM YEARS)**. It never invents a date or
generates an alignment solely to make the UI look populated.

Alignment scanning is broken into short asynchronous batches and only
runs while the user has the accordion open. It is cancelled when closed.
Accretion passing forecasts cover the next 365 simulated days, with
two-simulated-hour samples and refinement to the entry boundary.

The underlying black-hole art, approved 14-value RGB lighting preset,
opaque planet rendering, orbital shapes, scene source panel, main menu
and developer clock controls are unchanged. No forecast controls or
experimental LIGHT STUDIO UI are imported into production.

Regression tests: `tests/event-horizon-hud.test.cjs` plus existing
production, clock, planetary and PELAGIC depth regression suites.

## On-canvas planet selection and orbit annotations

The live EVENT HORIZON artwork now offers tap-to-inspect planets in
portrait, landscape and full-art mode, without importing a preview UI.

- Touch/click the visible planet (or a ring of ATLAS/HALO) to select it.
  Small distant worlds have a modest extra hit radius. If planets
  overlap, the nearer rendered object is selected.
- Tap the same planet or empty space to dismiss. Dragging is **not** a
  tap. Selection is cleared when switching to another scene. PELAGIC
  touch, swipe, food and sensor interactions remain unchanged.
- A minimal **1px white square outline**, 45-degree leader, short
  horizontal connector, and black-backed **1px white rectangular
  label** follow the moving selected planet. Text gives its name,
  proposed diameter in kilometres, and a compact geology, ocean or
  cloud description. Ringed worlds' selection frames include rings.
- The highlighted orbital path uses the **same projected position
  function as the actual rendered planet**, including VERDANT's
  pinhole-perspective foreground pass. A grey 1px dashed line shows
  the orbit. The last 62% of an orbit fades from grey behind to white
  at the planet, while a short white forward arc indicates travel
  direction. The orbit overlay sits behind the bright accretion disc
  and planet bodies. Its callout is drawn on top.
- Selection is hit-tested against the last **actually drawn** orbital
  timestamp, avoiding drift in very fast developer simulation modes.
- Labels fit within the canvas viewport and are drawn by Canvas 2D,
  keeping the same graphic style in fullscreen.
- Planet measurements and surface descriptions are **invented but
  physically plausible proposals**. They are not measured observations
  or fixed mass/radius outputs from the still-incomplete physical
  model. The drawn orbital trajectories likewise remain illustrative.

Files: `planet-interaction.js`, a small public projected-position
API and hook in `renderer.js`, and scene-scoped canvas tap handling
in the existing main `index.html`.

Regression tests: `tests/event-horizon-interaction.test.cjs`.
The 14 approved black-hole light values, source compositor, planet
surface art, existing scene controls and simulation clock are unchanged.
