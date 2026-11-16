# PELAGIC - Living ASCII

A generative ASCII jellyfish artwork built with vanilla HTML, CSS and JavaScript.

Live site: https://bojango.github.io/asciiart/

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
