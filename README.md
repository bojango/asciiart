# PELAGIC - Living ASCII

## EVENT HORIZON / 002 — restored (19 November 2026)

- Restored the original V2 `event-horizon.js` content exactly from commit `19ff7be570a36a744606487c76e5798eeb63e4de`, after V3 through V5 failed to match the supplied visual reference. This rollback makes no changes to PELAGIC or GREENWOOD.
- `index.html` shows EVENT HORIZON / 002 and loads `event-horizon.js?v=20261119` to bypass stale mobile browser caches.
- V2 includes an animated, tilted ASCII black hole, eight fictional orbiting planets, a sparse star field and palette selection. Its accretion light, lensing and orbital scales are illustrative, not a scientifically accurate simulation.
- This is a **rollback**, not an approved final visual design. Future work should be reviewed with actual browser-rendered screenshots before changing the live artwork.
- JIN2's original reference repository expressly prohibits use of its code with AI; do not copy, port or adapt the source without the necessary permission. Any new rendering implementation should be original and independently evaluated against the visual brief.


## PELAGIC 017 — sensory awareness for iPhone

### What changed
- Added **DEV → SENSE** with explicit opt-in toggles for motion/tilt and the front camera, plus a toggle to disable touch. Existing WEATHER/LIFE, gallery view, live environment and ecosystem controls remain independent.
- **Tilt** (iPhone DeviceOrientation/DeviceMotion APIs): the device's angle creates gentle left/right and fore/aft currents. An abrupt shake sometimes causes a brief startle, but never directly moves the jellyfish to the phone's position. iPhone Safari permission is requested **only from an ENABLE tap**; denied/unsupported states are shown.
- **Camera presence:** starting the camera requests permission explicitly. When a native FaceDetector implementation exists it can detect a nearby face; otherwise it falls back to coarse low-resolution frame motion. The jellyfish may investigate, ignore or become curious. **There is no guaranteed face detection on iPhone Safari.**
- **Touch interactions:** single tap creates a small ASCII ripple, hold establishes a temporary curiosity point, drag swirls the water, and **double tap offers one tiny plankton-like prey** at the location touched. Offered prey lives in the normal ecosystem and must physically encounter a marginal tentacle to be captured and eaten. The LIFE prey switch is respected.
- Sensor readings bias existing autonomy, water currents and attention; there is no direct joystick, scripted pursuit or forced consumption.

### Privacy, compatibility and limits
- Motion and camera **start disabled**. Touch works without permissions. Camera requests **video only** using the preferred front-facing camera, never audio.
- Camera data is processed entirely in the browser at approximately 64×48 pixels. Only the immediately previous coarse frame is kept transiently in memory for motion comparison; images/face identities are **not recorded, stored persistently or uploaded**.
- The camera and motion listeners stop on page/tab hide. Both sensors also stop when switching to GREENWOOD. Permissions and stream availability may differ by browser and system settings.
- Requires secure HTTPS for camera and motion sensor APIs. The GitHub Pages URL supplies HTTPS; embedded webviews may impose additional restrictions.
- Camera movement detection does not guarantee that a person is present; background motion and changing light can create false positives.
- No remote phone-to-wall pairing is implemented in V17. The later QR-controlled installation will require a shared real-time service and session security, rather than assuming GitHub Pages alone can connect separate viewers.

### Testing
- `node --test tests/*.test.cjs` runs the new sensor tests plus the existing depth tests; zero third-party packages.
- Tests cover opt-in behaviour, motion permission sequence, tilt currents, camera-only/no-audio capture, stopping camera when hidden, touch gestures, genuine offered prey and perspective/close-visit regressions.
- Additional mocked mobile-size UI smoke testing verified SENSE tab navigation, WEATHER/LIFE hiding, touch toggle and double-tap prey integration.
- Physical **iPhone Safari permission prompts, device motion values and camera responsiveness still require live-device acceptance**.


## PELAGIC 016.6 — genuine Z projection, rare friendly close-ups and measurable regression tests

- **Root cause repaired:** V16.5 calculated `bodyScale()` but never applied it in the bell's `project()` function. The entire bell therefore stayed a constant size while some tentacle dimensions changed. `project()` now multiplies the complete local bell geometry by the same Z-derived factor used for tentacle lengths, rim anchors, oral arms and collision geometry.
- **Normal depth movement is visibly three-dimensional**, with the same autonomous Z goals, temporary swimming bursts, depth-sorted particles and atmospheric light changes as before.
- **Rare brief close-up visits** now let the jellyfish approach the screen more closely, using a smooth extra near-plane perspective boost. A visit lasts roughly 7–8 seconds including the approach; its return to an ordinary distance is automatically triggered and temporarily protected from other depth decisions. Ordinary activity can still be ignored or investigated independently.
- **Cooldown:** Close-up opportunities are separated by several minutes. The existing `PELAGIC.presence()` integration seam may modestly advance a future opportunity with a probability, without guaranteeing a visitor response. No sensor permissions or hardware integration are added.
- **DEV status:** Weather tab readout includes real Z position, actual applied scale and whether a close approach/retreat is occurring. `PELAGIC.debug()` now includes visit count and current approach/retreat flags.
- **Automated regression test:** `node --test tests/depth-regression.test.cjs` compares measured pixel-space bell geometry at six different Z positions against the effective scale, then simulates seven minutes of autonomous movement to check near encounters, forced retreat and tentacle-root integrity. No packages or build step required.
- **Validation:** In a 390 px test viewport the actual projected bell width measured **357 px near** (Z −2.6) versus **148 px far** (Z +2), exactly matching the depth scaling ratios. A simulated 12-minute run produced **three** brief visits with full retreats, maximum extreme near dwell **7.1 seconds**, and maximum tentacle root stretch **1.07×**. The two persistent regression tests passed against the staged GitHub source.
- **Preserved:** GREENWOOD, live Open-Meteo weather, LIFE ecosystem, prey feeding and tentacle dynamics. iPhone Safari visual acceptance remains a separate check.


## PELAGIC 016.5 — perceptible 3D approaches and retreats

- **Why 016.4 looked static:** The Z state was changing, but `bodyScale()` had been frozen at 1.0 to avoid V16's extreme zooms. Very subtle fog and particles alone were insufficient to signal the jellyfish moving forwards/backwards on mobile.
- Reintroduced modest, real **perspective size changes**, continuously linked to the simulated Z position: `bodyScale() = clamp(exp(-0.175 * z), 0.73, 1.32)`. The bell, anchors, oral arms, marginal filaments and feeding physics receive the same scale so nothing stretches independently. This is far gentler than the old 0.34–2.40 scale range.
- **Occasional depth surges** (about half of swimming bursts) now commit to a new, bounded Z target and use a brief increased Z force. Ordinary bursts and gradual autonomous depth exploration remain, so the animal is neither static nor locked to a repeating zoom loop.
- Maintained V16.4's depth-sorted ASCII particles, distance lighting, creature behaviour, tentacle physics, live weather, DEV tools, rare encounters and GREENWOOD.
- The debug API adds `depthRush` and `depthRushCount`, with `debug().z`, `debug().scale` and `debug().depthGoal` available for monitoring.
- **Simulated QA:** 360 seconds in a portrait viewport, seven depth surges, Z reaching approximately −1.76 to +2.01, scale from 0.73 to 1.32, and oral-arm length ratio 0.825–1.116. Root attachment gaps stayed ≤1.07× physical segment length. No JavaScript exceptions. This is not yet a Safari visual acceptance test.


## PELAGIC 016.4 — perceptible Z-axis movement without zoom

- **Cause:** Depth physics was functioning, but V16.3 fixed the specimen scale at 1.0 and flattened perspective so near/far travel became nearly invisible. No movement regression was found in the Z-force integration.
- Restored genuine **near/far visual cues** using depth-sorted ASCII dust: particles can now pass *behind* or *in front of* the creature as it crosses their Z plane. Their apparent positions and sizes change continuously with relative depth, providing parallax and occlusion while the main creature remains a fixed size.
- Deep positions slightly soften and dim the jellyfish's colours/opacity; closer positions restore clarity and luminosity. The marine environment and weather continue to affect the palette independently.
- Depth decisions now carry a gentle probability bias away from an extreme, reducing long successive periods at the same end of the tank, without introducing a fixed route or deterministic back-and-forth animation.
- DEV debug exposes `depthFog` and particle counts by `depthLayers.front`/`depthLayers.behind`, alongside the existing real Z/goal/depthChanges counters.
- **QA:** 270 seconds of simulated browser runtime in a portrait-sized viewport. Z traversed roughly **−1.51 to +1.69**, nine depth decisions occurred, and **3–142** dust particles became foreground as depth changed. Creature scale stayed exactly **1**. Rope-root ratios stayed at or below **1.07×**, and the scene drew without exceptions.
- Existing oral/marginal dynamics, feeding, visitors, weather, DEV controls, and GREENWOOD were not changed. iPhone Safari visual acceptance remains outstanding.


## PELAGIC 016.3 — flowing tentacle dynamics with stable specimen scale

- **Oral arms:** Replaced the overly prescriptive per-point pose follower with a lightly shape-restored, damped Verlet spine. Broad travelling waves, inherited root motion, stronger inertia and mild bending stiffness give the central ribbons visible delayed movement, while length/vertical constraints prevent an accordion-like knot.
- **Marginal tentacles:** Increased downward settling relative to lateral currents, added stronger segment compression resistance and gradual anti-hover recovery, and preserved flexible attachment straight from the moving bell rim. This reduces weightless lateral bunching without reinstating an artificial straight shaft.
- **Consistent main-jellyfish size:** The hero's overall scale is now fixed at **1.0** throughout its Z range; local bell perspective varies by no more than approximately ±2.1% rather than zooming dramatically. Natural rotations still change its silhouette, but movement through depth no longer grows or shrinks its anatomy.
- Preserved automatic LIFE encounters, rare visitors, feeding, live weather, DEV controls and GREENWOOD.
- **Regression evidence:** A simulated 1,500-frame portrait runtime comparison, with forced near/far Z positions, confirmed fixed scale, near-vertical settling of marginal strands, no collapsed marginal segments in sampled frames and attached roots (maximum root gap 1.07×). Oral arms retained at least 0.817× their intended hanging length while achieving a wider lateral swing than V16.2.
- This test uses a mocked browser/canvas, not a verified Safari screenshot or full browser visual acceptance test.


## PELAGIC 016.2 — balanced tentacle rigidity and attachment

- **Central oral arms:** Increased length relative to all marginal filaments. Slightly reduced shape-restoring stiffness, strengthened slow lateral waves and body-current response, and kept the downward weighted posture that prevents bunching.
- **Thin marginal filaments:** Moderately increased damping and shortened/flatter wave forces to reduce excessive flapping, retaining independent reactive strands.
- **Dynamic at the attachment:** Removed the forced straightening of the first three marginal joints. Bell movement translates adjacent points without forcing a vertical rod; the first joint may pivot within a broad approximately ±58° envelope, staying anatomically connected without folding backwards over the rim.
- **Validation:** A 1,050-frame mocked portrait/mobile simulation verified the central arms were longer than every marginal filament at the same depth; oral-arm vertical extent remained 0.906–1.115× intended length, first-joint angles remained within ±1.02 radians and root extension stayed ≤1.07×.
- **Preserved:** Physics and feeding mechanics outside the tentacle refinements, rare visitors, life controls, live/test weather, GREENWOOD and the monochrome interface. Actual iPhone Safari visual acceptance is still required.


## PELAGIC 016.1 — heavier, non-bunching oral arms

- Corrected the over-flexible, tangled central oral arms seen in the 16 November screen recording. The central frilled arms now have their **own heavily damped, shape-restoring spine** instead of sharing the unrestricted Verlet rope solver with the marginal tentacles.
- Oral-arm control points keep a near-full-length hanging posture with a strong downward restoring bias, resisting compressive folding around the underside of the bell. They sway slowly with currents and movement, without forming a persistent tight knot.
- Enforced minimum vertical spacing and separate maximum stretch limits near the base, while retaining fixed underside attachment anchors.
- Left the 32 thin outer marginal filaments flexible and preserved their existing prey collision/feeding interactions, rare visitors, live weather and GREENWOOD.
- Extended `window.PELAGIC.debug()` with `oralHang` values, allowing the arm-tip vertical ratios and offsets to be inspected while testing.
- Mocked portrait/mobile animation test across 700 frame updates: oral-arm vertical extent was **0.937–1.014×** intended length; root stretch stayed at or below **1.07×**. This is a simulated regression, not an iPhone Safari visual acceptance test.


## PELAGIC 016 — anatomy, anchored tentacles and rare visitors

### Tentacle anatomy
- Rebuilt the underside of the jellyfish into **32 fine marginal filaments** attached around the living bell rim, plus **four wider, milky, frilled oral arms** attached beneath the bell centre.
- Oral arms now use several layered ASCII glyph strands to suggest semi-translucent tissue. Their heavier drag and slower fluid response distinguish them from delicate stinging filaments.
- Marginal tentacles have varied lengths and precise moving rim anchors. The first three joints follow the bell more rigidly, are corrected after hull collision and are length-clamped (at most 1.07 times the physical segment length) so strands cannot visibly separate at their roots.
- The DEV debugging readout now exposes `ropeKinds` and `maxRootGap` through `window.PELAGIC.debug()` for monitoring joint integrity.

### Feeding
- Prey can only be caught by a marginal tentacle: central oral arms are no longer treated as capture nets.
- Captured prey remains entangled briefly, then moves inwards along the marginal strand and transitions into the central oral-arm region before consumption and the existing bioluminescent afterglow.
- Automatic prey and voluntary/avoidant behaviour from V15 remain.

### Rare visitor encounters
- A separate rare visitor scheduler introduces occasional, temporary **distant jellyfish** or **octopus** silhouettes. They are rendered entirely as ASCII glyphs with perspective depth, gentle movement and atmospheric fading.
- First automatic visitor is considered after about 82 seconds of continuous PELAGIC runtime; later visitors are typically about 3–6 minutes apart at the default LIFE rate. These are not permanent decorative background jellyfish.
- The main jellyfish can ignore or sometimes investigate visitors when close enough. An octopus may occasionally trigger a startle response without scripted pursuit.
- DEV → LIFE adds a **Rare visitors** toggle and manual **JELLY**/**OCTO** encounter buttons; all other weather, LIFE and scene controls remain.

### Validation and caveats
- JavaScript parsed without errors. A mocked mobile-size animation runtime confirmed 32 marginal / 4 oral arms and a maximum root-segment stretch of about 1.07× over 120 frames.
- A separate 7-second ecosystem simulation verified tentacle capture, entanglement and consumption (around 3.3 seconds after capture). Both manual visitor types rendered into a mock canvas and updated without errors.
- These are code/runtime checks, not a visual acceptance test in iPhone Safari. Inspect the published scene to confirm the frilled anatomy and rare visitors look right at actual display resolution.


## PELAGIC 015 — living behaviour, stronger 3D depth and feeding

- More pronounced **near/far Z movement** with atmospheric perspective: particle parallax, changing scale, brightness and ASCII character detail. The swimmer can approach the viewer or retreat further into the tank.
- A slow-changing behaviour model now differentiates **drifting, exploring, curious, investigating, feeding, digesting and startled** states. Hunger, energy, temperament and curiosity influence decisions, but the jellyfish can still ignore encounters.
- Small prey can **freeze, flee or drift** when the jellyfish approaches. Prey must physically meet a moving tentacle at compatible depth to be captured. Once caught, it remains visibly entangled before being drawn inward along that strand; only successful consumption increases energy and reduces hunger.
- A successful meal creates a brief **cyan/pearl bioluminescent shimmer** across the jellyfish and visible tentacles. There is no guaranteed feeding or forced targeting.
- Independently moving fish now exhibit light schooling and startle/escape behaviour. Snow, fish, prey and plankton blooms have stronger distance-based size and visibility. Some prey may appear near (but not on) a tentacle, leaving the outcome to the existing physics.
- Removed the four decorative/background jellyfish silhouettes. The background retains drifting ASCII glyphs, snow, plankton and living ecosystem elements.
- DEV → LIFE adds a **FEED** encounter test button. Existing manual controls and automatic events remain. `window.PELAGIC.debug()` exposes mood, hunger and feed glow.

### Validation

The JavaScript syntax was checked and a timed ecosystem simulation verified a real tentacle contact, entanglement, transport and consumption after approximately 3.3 simulated seconds. Fish and plankton updates completed without errors. No independent Safari/Chromium render test was performed for this commit.


## Version 14: minimalist source and expanded artwork HUD

- Removed the grey execution-trace highlight and abrupt line jumps. Source now scrolls continuously at a gentle pace.
- The PELAGIC / GREENWOOD switcher uses a black background and white text.
- The far-right Pause button has been replaced by a square expand-art icon. Space still pauses/resumes on desktop.
- Expanded mode retains all four artwork corner labels, including the green LIVE indicator. The EXIT control is centred at the top so it doesn't overlap LIVE.
- Weather, LIFE events, and the two scenes are unchanged.


## PELAGIC 012 — rare living ecosystem and wider depth

This iteration makes PELAGIC a quiet deep-sea ecosystem rather than a jellyfish with random decorative events.

- The jellyfish can roam a much wider simulated **Z-axis**; perspective scales across near and distant depths without an artificial whole-body pulse.
- A separate `ecosystem.js` module simulates **marine snow**, occasional **bioluminescent plankton blooms**, drifting **copepod-like prey**, and intermittent groups of **small ASCII fish**. Each has independent position and depth. A bloom scatters and brightens when the jellyfish passes through.
- Predation is **contact-based**: a prey item must meet an actual moving tentacle segment at a compatible depth to be caught. It then travels towards the bell; fish react to proximity but are not scripted prey.
- Curiosity is probabilistic, not compulsory. The jellyfish may investigate a bloom, inspect nearby fish or prey, or ignore them entirely. Environmental influences do not prescribe its path.
- **DEV → LIFE** provides independent visibility toggles, an encounter-rate control and manual BLOOM, PREY, FISH and FEED tests. WEATHER retains its existing controls. FEED plants a test prey item beside a moving strand and still requires a real collision.
- No new API, camera, sensor, dependency or credential is required. The two scenes still share the existing website and environment controls.

**Development note:** All ecological dynamics are intentionally stylised. Jellyfish realistically capture small drifting prey with their tentacles; the glowing bloom is an atmospheric plankton effect, not algae that a jellyfish directly eats. Naturally occurring encounters are deliberately intermittent.

## GREENWOOD V2: compositional rebuild

GREENWOOD now uses a portrait-oriented cinematic woodland composition: a large, textured foreground oak on the **right**, a sunlit clearing **left of centre**, a visible sky opening, layered distant trunks, a small forest-floor stream, roots, ferns, moss, stones and mushrooms. Different materials use distinct ASCII characters, density and palette logic. The scene retains its weather simulation, season switching, daylight shafts, mist, rain, stars and night fireflies.

This phase deliberately contains no wildlife or scripted encounters. The renderer remains isolated in `greenwood.js`, and the existing PELAGIC scene, developer mode, environmental adapter, and direct `?scene=greenwood` link remain available.


## GREENWOOD 001 — a second living ASCII scene

The toolbar now switches between **PELAGIC** (the existing autonomous jellyfish) and **GREENWOOD** (a new portrait-first woodland clearing) without leaving the site. The scene selection is remembered in the browser.

GREENWOOD renders every visible landscape form using monospaced characters: an opening to the sky, distant trees, an ancient foreground trunk and branches, layered canopy, roots, ferns, moss, mushrooms and the forest floor. Light gradients provide ambience only. At night, the sky reveals stars and a few fireflies; during the day, typographic sunbeams illuminate the clearing. Wind gently moves vegetation, and the existing DEV weather simulation controls daylight, rain and haze. The existing colour button cycles early spring/summer/autumn/winter looks.

This is an **art-direction prototype**: the scene is designed to be reviewed before wildlife, rare events or detailed seasonal physics are added. The new renderer is isolated in `greenwood.js`; the original PELAGIC rendering and physics remain intact. The code panel shows the currently selected scene's own source.

### Planned GREENWOOD phases
1. **Composition and atmosphere (001):** portrait framing, typographic depth layers, day/night, gentle motion. Review visual direction.
2. **Environmental refinement (002):** improve sunlight, moonlight, wind, rain, mist, seasonal foliage/branches and controls.
3. **Rare wildlife (003):** occasional rabbits, deer, foxes or owls with believable motion and depth occlusion.
4. **Ambient ecology (004):** falling leaves, insects, rare discoveries, subtle interactions and performance improvements.
5. **Live inputs / installation (005):** Open-Meteo weather while retaining simulation; later Raspberry Pi and optional smart-home sensors.


A generative ASCII jellyfish artwork built with vanilla HTML, CSS and JavaScript.

Live site: https://bojango.github.io/asciiart/

## Version 13: live weather, compact monochrome gallery and live life events

### Artwork and code layout
- Main artwork occupies 75% of the available main content area, with the source/dev panel at 25% and a thin dividing toolbar.
- White/black-only toolbar buttons, pure black source background and white terminal typography.
- A grey-highlighted source line advances through **functions that actually execute** (physics, tentacles, ecosystem, drawing and weather). The trace advances at a readable sampling rate; it is not a literal JavaScript instruction-pointer debugger.
- Removed cell-count metadata and “All Glyphs / No Images”. The upper-right LIVE dot is green and pulses; it stops flashing when paused.

### Live Open-Meteo weather
- The weather developer tab has a persistent **LIVE / TEST** switch. LIVE is the default for new installations, and any previous mode choice is remembered.
- LIVE reads Open-Meteo current temperature, precipitation, wind speed/direction, humidity and cloud cover, plus sunrise/sunset. A separate Open-Meteo European AQI feed provides air quality.
- Forecast-derived sunlight changes continuously through daylight hours between sunrise and sunset, so the installation evolves through the day without requiring a new model value for every frame.
- Weather is refreshed **every 20 minutes**, air quality **every 60 minutes**, with shorter backoff on failures. Input values transition gradually.
- Default location: Lancaster, UK. DEV can select another town/city using Open-Meteo geocoding or explicitly ask permission for browser geolocation. Location/mode and test settings are saved locally.
- Last-successful data is cached for short outages. DEV exposes fresh/stale/error state and latest refresh time. If no live data is available, the artwork uses neutral baseline values and displays ERROR rather than claiming they are live observations.
- TEST retains manual sliders, effect checkboxes and presets. Both scenes use the same active environmental effects.
- Weather comes from Open-Meteo's free non-commercial endpoints and uses no API key. Attribution: https://open-meteo.com/

### Automatic ecosystem
- When PELAGIC is selected, random plankton blooms, prey, fish and marine snow continue automatically via ecosystem.js; they are not dependent on weather mode.
- DEV → LIFE retains switches, frequency controls and manual test encounters. Previous preferences are preserved.

### Privacy and limitations
- Public GitHub Pages contains no smart-home tokens. Device location is never requested automatically.
- Open-Meteo weather/current conditions are model-based, not a private weather station; air quality is from CAMS model data.
- Browser access to live APIs requires connectivity. Simulated and failed-network browser tests have been run, but live Safari API traffic must be checked after GitHub Pages deploys.

## Version 11: deeper exploration and occasional plankton encounters

- The jellyfish explores **near and far depth goals** with inertia rather than hovering around one average Z position. It sometimes approaches significantly closer to the viewer before drifting away.
- Sideways leaning is reduced. Banking responds more to lateral motion and settles toward upright when calm.
- Faster swimming bursts happen occasionally; the existing ceiling-avoidance and bell-driven propulsion remain.
- Small, faint **bioluminescent plankton blooms** sometimes appear, drift and fade. The jellyfish may investigate; a close encounter scatters the characters and subtly increases its energy. Most of the time, nothing special happens.
- The developer simulation, weather toggles, code view and installation mode remain unchanged.

## Version 10: northern England temperature range and natural edge avoidance

- Temperature colours now progress from **deep blue at -10°C**, through light blue and cyan around freezing, into **orange from +10°C** and coral/red as the temperature rises. The simulated temperature slider runs from -10°C to +35°C. Weather remains simulation-only and effects can still be toggled independently.
- The jellyfish no longer continually thrusts against the upper frame edge. It anticipates the upper region, reduces propulsive effort and glides diagonally downward before resuming strokes. Soft, slowly changing currents encourage it to explore the middle of the frame; hard bounds are emergency catches only.
- Brief partial edge exits remain possible, but the animal has a gentle tendency to return. Touch-triggered bursts near the top favour depth/sideways movement instead of pushing into the ceiling.
- Cold-to-warm colour lookup is cached to avoid creating temperature colour arrays for every ASCII glyph on each frame.

## Version 9: compact simulator, temperature palette and quick swimming bursts

DEV now **replaces the scrolling code panel**, staying below the artwork instead of covering it. Seven simulated environmental inputs are presented in a compact two-column grid, with presets, presence, touch and installation controls visible together on mobile without scrolling. Closing DEV restores the live code.

Temperature has a pronounced spectral influence: extreme cold moves the jellyfish toward blue/cyan and extreme heat toward red/coral, with intermediate temperatures blending smoothly. Each environmental effect remains individually switchable and weather is still simulation-only.

The jellyfish sometimes makes short, fast, autonomous movements in depth and diagonally. A touch usually causes a stronger startled escape, but occasionally only a small flinch. Faster movement briefly narrows the bell's hem rather than shrinking the entire animal. Touch still cannot drag or directly steer it.

## Version 8: autonomous depth and simulated environment

The animation and the environment inputs are deliberately separate. The jellyfish retains its own pulse-driven propulsion, flowing and colliding tentacles, and internal temperament. A Z axis lets it swim nearer or further from the screen, with perspective scaling and depth cues.

Environmental simulation independently affects:
- Temperature: spectral colour shift.
- Wind speed/direction: background drift and simulated currents affecting body and tentacles.
- Rain: ASCII rain, restrained current turbulence.
- Air quality: atmospheric haze and contrast.
- Humidity: drifting mist.
- Daylight: relative ambient brightness and bioluminescence.

In DEV mode, toggle each influence separately, adjust its slider or test presets: calm, storm, cold, heatwave, night and mist. Preferences persist in the current browser.

Simulate a nearby person to test curiosity and a gradual 3D approach. Simulated touch and touching the artwork cause a gentle startle, not direct manipulation.

Full-screen installation mode is available at the bottom of DEV and hides code, menus and metadata. The discreet EXIT control returns to the normal layout.

## Controls and files

index.html: ASCII renderer, creature physics, depth and behaviour engine, developer UI and scrolling live source.

environment.js: offline weather simulation, presets, smoothing, feature toggles and local preferences.

archive/v1-concept.html: earlier prototype.

Toolbar: Colour, Detail, Speed, DEV, Pause. Keyboard: C, D, Space, backtick (DEV) and Escape.

## Staged development

Stage 1: Visual refinement, Z-axis, autonomous behavioural state, touch/presence simulation, installation mode. This is the current build.

Stage 2: Link Open-Meteo weather and air-quality APIs after choosing which effects to keep. Retain manual simulation, show data freshness and handle unavailable network data safely.

Stage 3: Raspberry Pi kiosk display, optional local Home Assistant or compatible smart-home sensor connection. No HomeKit or Home Assistant access exists yet. Do not put secret tokens in a public GitHub Pages repo.

For future adapters, browser-side methods are exposed:
- window.PELAGIC.environment.setInput('temperatureC', 6)
- window.PELAGIC.environment.setEnabled('rain', false)
- window.PELAGIC.environment.preset('storm')
- window.PELAGIC.presence(1)
- window.PELAGIC.touch(200, 250)
- window.PELAGIC.debug()

These methods are an interface, not a sensor integration.

## Local development

From the repository root, run python3 -m http.server 8000 and visit http://localhost:8000/. Both index.html and environment.js must be present.

GitHub Pages: publish the main branch from /(root). The artwork is a stylised physics simulation, not a real fluid dynamics model.
