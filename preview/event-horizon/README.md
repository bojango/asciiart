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
