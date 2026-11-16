# PELAGIC - Living ASCII

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
