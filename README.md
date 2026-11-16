# PELAGIC - Living ASCII

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
