/* EVENT HORIZON / 001 — autonomous black-hole planetary system.
 * Artistic scale, physically ordered orbital periods: P^2 is proportional to a^3.
 * The accretion disc and its gravitationally lensed outline are an illustration,
 * not a relativistic ray tracer. No weather inputs or external data required.
 */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const rnd = n => { const q = Math.sin(n * 127.117 + 39.33) * 43758.5453; return q - Math.floor(q); };
  const palettes = [
    { name: 'EMBER', swatch: 'linear-gradient(110deg,#7b3627,#f2a251,#ffe5aa)',
      outer: [105, 42, 30], mid: [224, 110, 51], inner: [255, 225, 157] },
    { name: 'ION', swatch: 'linear-gradient(110deg,#413668,#b17dc8,#e5cee9)',
      outer: [72, 48, 115], mid: [163, 109, 181], inner: [236, 212, 241] },
    { name: 'SOLSTICE', swatch: 'linear-gradient(110deg,#355874,#91bbb7,#ffe0aa)',
      outer: [47, 82, 104], mid: [123, 179, 174], inner: [250, 220, 170] },
  ];
  // These are fictional worlds, not a scale model of the Solar System.
  // Orbits are circular and nearly coplanar, with a fixed viewing inclination.
  const planets = Object.freeze([
    { name: 'CINDER', orbit: 0.43, radius: 3.6, phase: 0.38, color: [197, 127, 102], bright: [255, 199, 148], texture: 4 },
    { name: 'SILEX', orbit: 0.54, radius: 4.9, phase: 3.12, color: [113, 135, 149], bright: [182, 210, 220], texture: 7 },
    { name: 'VERDANT', orbit: 0.66, radius: 6.6, phase: 4.85, color: [91, 138, 121], bright: [166, 215, 176], texture: 11 },
    { name: 'RUST', orbit: 0.79, radius: 5.2, phase: 1.95, color: [174, 89, 72], bright: [241, 160, 119], texture: 15 },
    { name: 'ATLAS', orbit: 0.94, radius: 13, phase: 5.78, color: [176, 120, 91], bright: [250, 196, 139], texture: 20 },
    { name: 'HALO', orbit: 1.11, radius: 10.5, phase: 2.87, color: [157, 151, 119], bright: [244, 214, 158], texture: 23, rings: true },
    { name: 'AZURE', orbit: 1.32, radius: 8.5, phase: 0.75, color: [81, 108, 167], bright: [153, 188, 224], texture: 31 },
    { name: 'UMBRA', orbit: 1.51, radius: 6.0, phase: 4.02, color: [111, 94, 145], bright: [166, 148, 191], texture: 35 },
  ].map(p => Object.freeze({ ...p, period: 150 * Math.pow(p.orbit / 0.43, 1.5) })));

  const gas = Array.from({ length: 1150 }, (_, i) => ({
    angle: rnd(i * 31 + 2) * TAU,
    radius: 1.14 + 1.30 * Math.sqrt(rnd(i * 23 + 5)),
    grain: rnd(i * 13 + 7),
    wave: rnd(i * 37 + 11) * TAU,
    glyph: '.:,;+=*x%#'[Math.floor(rnd(i * 17 + 9) * 10)],
  }));
  const stars = Array.from({ length: 118 }, (_, i) => ({
    x: 0.025 + rnd(i * 11 + 1) * 0.95,
    y: 0.028 + rnd(i * 19 + 3) * 0.944,
    magnitude: Math.pow(rnd(i * 29 + 6), 2.3),
    phase: rnd(i * 7 + 17) * TAU,
    glyph: i % 27 === 0 ? '+' : i % 15 === 0 ? '*' : '.',
  }));
  let paletteIndex = 0;
  const INCLINATION = 1.04; // ~60° from face-on; projected orbital ellipse.
  const ROLL = 1.25;        // Camera roll: orbital major axis suits portrait screens.
  const CI = Math.cos(INCLINATION), SI = Math.sin(INCLINATION);
  const CR = Math.cos(ROLL), SR = Math.sin(ROLL);
  const fontFace = "'Courier New', ui-monospace, monospace";
  const ink = (rgb, alpha = 1) => `rgba(${rgb.map(v => Math.round(v)).join(',')},${clamp(alpha).toFixed(3)})`;
  const shade = (a, b, t) => a.map((v, i) => mix(v, b[i], clamp(t)));

  function layout(width, height) {
    const unit = Math.min(width * 0.55, height * 0.34);
    return { width, height, x: width * 0.5, y: height * 0.50,
      unit, hole: unit * 0.172, font: clamp(width * 0.021, 7.4, 9.2) };
  }
  function orbitPosition(planet, time, view) {
    const angle = planet.phase + time * TAU / planet.period;
    const distance = view.unit * planet.orbit;
    const u = distance * Math.cos(angle);
    const v = distance * Math.sin(angle) * CI;
    const depth = Math.sin(angle) * SI; // +depth = behind the black hole.
    return { name: planet.name, x: view.x + u * CR - v * SR,
      y: view.y + u * SR + v * CR, depth,
      radius: planet.radius * 1.13 * clamp(view.unit / 180, 0.62, 1.22) * (1 - depth * 0.085),
      period: planet.period, orbit: planet.orbit };
  }
  function setFont(ctx, size) { ctx.font = `${size}px ${fontFace}`; ctx.textBaseline = 'middle'; }
  function glyph(ctx, symbol, x, y, fill) { ctx.fillStyle = fill; ctx.fillText(symbol, x, y); }

  function drawStars(ctx, time, view) {
    setFont(ctx, Math.max(7, view.font * 0.9));
    for (const star of stars) {
      const x = star.x * view.width, y = star.y * view.height;
      const d = Math.hypot(x - view.x, y - view.y);
      if (d < view.hole * 2.5) continue;
      const twinkle = 0.94 + 0.06 * Math.sin(time * (0.07 + star.magnitude * 0.09) + star.phase);
      const a = (0.09 + star.magnitude * 0.49) * twinkle;
      glyph(ctx, star.glyph, x, y, ink([146, 160, 184], a));
    }
  }
  function drawOrbits(ctx, time, view) {
    // Faint, discontinuous orbital guides; the worlds still move without trails.
    setFont(ctx, Math.max(6.5, view.font * 0.75));
    for (let k = 0; k < planets.length; k++) {
      const p = planets[k];
      for (let j = 0; j < 125; j++) {
        if ((j + 9 * k) % 7 > 1) continue;
        const angle = j / 125 * TAU;
        const distance = view.unit * p.orbit;
        const u = distance * Math.cos(angle), v = distance * Math.sin(angle) * CI;
        const x = view.x + u * CR - v * SR, y = view.y + u * SR + v * CR;
        if (x < 4 || x > view.width - 4 || y < 4 || y > view.height - 4) continue;
        const depth = Math.sin(angle) * SI;
        glyph(ctx, '.', x, y, ink([119, 118, 124], depth > 0 ? 0.085 : 0.13));
      }
    }
  }
  function drawHalo(ctx, view) {
    // Extremely restrained non-ASCII illumination: the structure is made of glyphs.
    const r = view.hole;
    const grad = ctx.createRadialGradient(view.x, view.y, r * 0.65, view.x, view.y, r * 3.5);
    const p = palettes[paletteIndex];
    grad.addColorStop(0, ink(p.mid, 0.11));
    grad.addColorStop(0.48, ink(p.outer, 0.055));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(view.x - r * 3.5, view.y - r * 3.5, r * 7, r * 7);
  }
  function gasPart(ctx, item, view, time, front, highRes) {
    const p = palettes[paletteIndex];
    const r = item.radius * view.hole;
    // Keplerian differential rotation in the disc; deliberately slow.
    const rate = 0.025 * Math.pow(item.radius, -1.5);
    const angle = item.angle + time * rate + 0.014 * Math.sin(time * 0.095 + item.wave);
    const sin = Math.sin(angle), cos = Math.cos(angle);
    if ((sin <= 0) !== front) return;
    const u = r * cos, v = r * sin * CI;
    const x = view.x + u * CR - v * SR;
    const y = view.y + u * SR + v * CR;
    const inBand = clamp((item.radius - 1.14) / 1.30);
    const innerHot = Math.pow(1 - inBand, 0.83);
    // Doppler-like asymmetry: approaching material appears hotter/brighter.
    const approaching = 0.70 + 0.30 * Math.cos(angle - 1.2);
    const wave = 0.91 + 0.09 * Math.sin(time * 0.23 + item.wave);
    const brightness = approaching * wave * (0.35 + 0.65 * innerHot);
    const color = shade(p.outer, p.mid, clamp(0.27 + brightness * 0.98));
    const rgb = shade(color, p.inner, innerHot * brightness * 0.67);
    const a = clamp((0.15 + item.grain * 0.54) * brightness * (front ? 1 : 0.78), 0, 0.92);
    const mark = item.grain > 0.91 ? '*' : item.grain > 0.72 ? '+' : item.glyph;
    glyph(ctx, mark, x, y, ink(rgb, a));
    if (highRes && item.grain > 0.986 && innerHot > 0.40) {
      ctx.shadowColor = ink(rgb, 0.32);
      ctx.shadowBlur = 4;
      glyph(ctx, '.', x + 0.35, y + 0.6, ink(rgb, a * 0.43));
      ctx.shadowBlur = 0;
    }
  }
  function drawGas(ctx, time, view, front, highRes) {
    setFont(ctx, view.font * (highRes ? 0.91 : 1.05));
    for (let i = 0; i < gas.length; i += highRes ? 1 : 2) {
      gasPart(ctx, gas[i], view, time, front, highRes);
    }
  }
  function drawPhotonRing(ctx, time, view) {
    const p = palettes[paletteIndex], r = view.hole * 1.055;
    setFont(ctx, Math.max(7, view.font * 0.93));
    // The photon-ring outline is an artistic cue; precise lensing is not simulated.
    for (let i = 0; i < 162; i++) {
      if (i % 8 === 0) continue;
      const a = i / 162 * TAU;
      const glow = 0.47 + 0.44 * (0.5 + 0.5 * Math.cos(a - 2.1));
      const ripple = 0.991 + 0.009 * Math.sin(a * 9 + time * 0.12);
      const r1 = r * ripple;
      const x = view.x + Math.cos(a) * r1;
      const y = view.y + Math.sin(a) * r1;
      const rgb = shade(p.mid, p.inner, glow * 0.78);
      glyph(ctx, glow > 0.71 ? '+' : ':', x, y, ink(rgb, glow * 0.64));
    }
    // A faint second lensed arc above the shadow suggests the far-side disc.
    for (let i = 0; i < 65; i++) {
      const a = Math.PI * (1.08 + 0.84 * i / 65);
      const rr = view.hole * (1.25 + 0.038 * Math.sin(time * 0.05 + a * 5));
      glyph(ctx, i % 4 === 0 ? '+' : '.', view.x + rr * Math.cos(a),
        view.y + rr * Math.sin(a), ink(p.inner, 0.13 + 0.22 * Math.sin(i / 65 * Math.PI)));
    }
  }
  function drawBlackHole(ctx, time, view) {
    const r = view.hole;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(view.x, view.y, r, 0, TAU); ctx.fill();
    drawPhotonRing(ctx, time, view);
  }
  function drawRings(ctx, planet, pos, view, back) {
    const rx = pos.radius * 1.8, ry = pos.radius * 0.52;
    const color = ink(shade(planet.color, planet.bright, back ? 0.20 : 0.66), back ? 0.30 : 0.75);
    setFont(ctx, Math.max(7, view.font * 0.77));
    for (let j = 0; j < 48; j++) {
      const a = j / 48 * TAU;
      if ((Math.sin(a) > 0) !== back) continue;
      const dx = rx * Math.cos(a), dy = ry * Math.sin(a);
      const x = pos.x + dx * 0.80 - dy * 0.60;
      const y = pos.y + dx * 0.60 + dy * 0.80;
      glyph(ctx, j % 4 ? '.' : ':', x, y, color);
    }
  }
  function drawPlanet(ctx, planet, pos, view) {
    const r = pos.radius;
    if (pos.x + r * 2.1 < 0 || pos.x - r * 2.1 > view.width || pos.y + r * 2.1 < 0 || pos.y - r * 2.1 > view.height) return;
    if (planet.rings) drawRings(ctx, planet, pos, view, true);
    const stepX = Math.max(3.25, view.font * 0.57);
    const stepY = Math.max(4.7, view.font * 0.83);
    setFont(ctx, Math.max(7.0, view.font * 0.93));
    // Central accretion light illuminates the hemisphere facing the black hole.
    const lightDx = (view.x - pos.x), lightDy = (view.y - pos.y);
    const ll = Math.hypot(lightDx, lightDy) || 1;
    const lx = lightDx / ll, ly = lightDy / ll;
    for (let y = -r; y <= r; y += stepY) {
      for (let x = -r; x <= r; x += stepX) {
        const nx = x / r, ny = y / r, q = nx * nx + ny * ny;
        if (q > 1) continue;
        const nz = Math.sqrt(1 - q);
        const terminator = clamp(0.30 + 0.64 * (nx * lx + ny * ly + 0.22 * nz));
        const band = 0.5 + 0.5 * Math.sin(ny * (planet.texture * 0.39) + nx * 3.4 + planet.texture);
        const grain = rnd((Math.round(x * 2) + 241) * (planet.texture + 1) + Math.round(y * 3));
        const m = clamp(0.15 + terminator * 0.72 + band * 0.14 - (1 - nz) * 0.22);
        const rgb = shade(planet.color.map(v => v * 0.36), planet.bright, m * (0.83 + 0.17 * grain));
        const glyphChar = grain > 0.81 ? '@' : m > 0.68 ? '#' : m > 0.46 ? 'x' : m > 0.29 ? '+' : ':';
        glyph(ctx, glyphChar, pos.x + x, pos.y + y, ink(rgb, (0.66 + 0.34 * nz) * (1 - Math.max(0, pos.depth) * 0.24)));
      }
    }
    // The smallest planets need one distinct core glyph to remain legible.
    if (r < stepY * 0.82) {
      glyph(ctx, 'o', pos.x, pos.y, ink(planet.bright, 0.83));
    }
    if (planet.rings) drawRings(ctx, planet, pos, view, false);
  }
  function drawScene(ctx, width, height, time, fx, highRes = true) {
    const view = layout(width, height);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#010104'; ctx.fillRect(0, 0, width, height);
    drawStars(ctx, time, view);
    drawOrbits(ctx, time, view);
    const all = planets.map(p => ({ planet: p, pos: orbitPosition(p, time, view) }));
    // Far worlds disappear naturally behind the central occluder and bright gas.
    for (const entry of all.filter(p => p.pos.depth > 0).sort((a, b) => b.pos.depth - a.pos.depth)) {
      drawPlanet(ctx, entry.planet, entry.pos, view);
    }
    drawHalo(ctx, view);
    drawGas(ctx, time, view, false, highRes);
    drawBlackHole(ctx, time, view);
    drawGas(ctx, time, view, true, highRes);
    for (const entry of all.filter(p => p.pos.depth <= 0).sort((a, b) => b.pos.depth - a.pos.depth)) {
      drawPlanet(ctx, entry.planet, entry.pos, view);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function cyclePalette() { paletteIndex = (paletteIndex + 1) % palettes.length; return palettes[paletteIndex].name; }
  function source() { return [
    '// EVENT HORIZON / 001 — Kepler-inspired orbits around a black hole',
    '// All worlds are fictional; the black-hole glow is stylised rather than ray-traced.',
    '// P = 150s × (a / 0.43)^(3/2). Time is accelerated for the installation.',
    orbitPosition.toString(), drawGas.toString(), drawPhotonRing.toString(),
    drawPlanet.toString(), drawScene.toString(),
  ].join('\n\n'); }
  function state(time = 0, width = 390, height = 620) {
    const view = layout(width, height);
    return { palette: palettes[paletteIndex].name,
      planets: planets.map(p => ({ ...orbitPosition(p, time, view), radius: p.radius })) };
  }
  window.PelagicEventHorizon = Object.freeze({
    draw: drawScene, cyclePalette, source, state,
    get palette() { return palettes[paletteIndex].name; },
    get swatch() { return palettes[paletteIndex].swatch; },
  });
})();
