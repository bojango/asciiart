/* EVENT HORIZON / 002 — independent procedural ASCII astronomical artwork.
 * All rendering code is original. The visual direction comes from a supplied
 * reference video, not from the third-party source implementation.
 * Fictional planets: orbital periods obey P^2 proportional to a^3. The black
 * hole uses a stylised, screen-space lens approximation, not GR ray tracing.
 */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (lo, hi, x) => { const f = clamp((x - lo) / (hi - lo)); return f * f * (3 - 2 * f); };
  const hash = (i, seed = 0) => { const z = Math.sin(i * 47.173 + seed * 83.719 + 5.213) * 17184.752; return z - Math.floor(z); };
  const lerpRGB = (a, b, k) => a.map((v, i) => mix(v, b[i], clamp(k)));
  const rgba = (c, opacity = 1) => `rgba(${c.map(v => Math.round(v)).join(',')},${clamp(opacity).toFixed(3)})`;
  const fontFamily = "'Courier New',ui-monospace,SFMono-Regular,Menlo,monospace";

  const palettes = [
    { name: 'EMBER', swatch: 'linear-gradient(110deg,#852f1b,#f18937,#ffe5aa)',
      low: [130, 37, 21], mid: [241, 119, 42], high: [255, 223, 161] },
    { name: 'ION', swatch: 'linear-gradient(110deg,#6a416e,#cb91aa,#f7dfe1)',
      low: [96, 49, 104], mid: [204, 120, 149], high: [255, 223, 224] },
    { name: 'SOLSTICE', swatch: 'linear-gradient(110deg,#30596e,#70b1bd,#f2dbad)',
      low: [47, 88, 111], mid: [117, 185, 190], high: [255, 225, 177] }
  ];
  let paletteIndex = 0;

  // Worlds are deliberately fictional.  The positions, phase offsets and
  // visual sizes are composed for portrait viewing, not to mimic our Sun.
  const planets = Object.freeze([
    { name: 'CINDER', orbit: 0.40, radius: 4.3, phase: 2.00, body: [130, 81, 66], lit: [248, 162, 102], seed: 1 },
    { name: 'SILEX', orbit: 0.51, radius: 6.1, phase: 4.60, body: [84, 105, 121], lit: [193, 214, 231], seed: 2 },
    { name: 'VERDANT', orbit: 0.64, radius: 7.9, phase: 1.16, body: [75, 130, 117], lit: [166, 227, 174], seed: 3 },
    { name: 'RUST', orbit: 0.77, radius: 6.8, phase: 5.31, body: [138, 67, 48], lit: [247, 165, 109], seed: 4 },
    { name: 'ATLAS', orbit: 0.92, radius: 14.8, phase: 3.70, body: [159, 114, 77], lit: [245, 210, 155], seed: 5 },
    { name: 'HALO', orbit: 1.07, radius: 12.0, phase: 0.50, body: [151, 146, 107], lit: [244, 230, 171], seed: 6, rings: true },
    { name: 'AZURE', orbit: 1.23, radius: 10.7, phase: 2.74, body: [62, 101, 147], lit: [169, 201, 245], seed: 7 },
    { name: 'UMBRA', orbit: 1.39, radius: 8.8, phase: 5.74, body: [106, 81, 130], lit: [203, 167, 228], seed: 8 }
  ].map(p => Object.freeze({ ...p, period: 142 * Math.pow(p.orbit / 0.40, 1.5) })));
  const stars = Array.from({ length: 126 }, (_, i) => ({
    u: hash(i * 29 + 2), v: hash(i * 29 + 8), phase: hash(i * 19 + 24) * TAU,
    power: Math.pow(hash(i * 43 + 4), 2.1), mark: i % 31 === 0 ? '+' : i % 13 === 0 ? '*' : '.'
  }));
  const viewInclination = 1.08, orbitRoll = 1.28;
  const cosInc = Math.cos(viewInclination), sinInc = Math.sin(viewInclination);
  const cosRoll = Math.cos(orbitRoll), sinRoll = Math.sin(orbitRoll);
  const discRoll = 0.205;
  const cosDisc = Math.cos(discRoll), sinDisc = Math.sin(discRoll);

  function layout(width, height) {
    const hole = clamp(Math.min(width * 0.092, height * 0.078), 21, 78);
    const orbitUnit = Math.min(width * 0.54, height * 0.315);
    const stepX = clamp(width / 98, 3.2, 5.8), stepY = clamp(width / 60, 5.7, 9.1);
    return { width, height, x: width * 0.5, y: height * 0.51, hole,
      orbitUnit, stepX, stepY, font: Math.min(11, stepY * 1.08),
      halfSpan: Math.min(width * 0.52, hole * 6.1), halfHeight: hole * 3.85 };
  }
  function orbitPosition(planet, time, view) {
    const angle = planet.phase + time * TAU / planet.period;
    const u = Math.cos(angle) * view.orbitUnit * planet.orbit;
    const v = Math.sin(angle) * view.orbitUnit * planet.orbit * cosInc;
    const depth = Math.sin(angle) * sinInc;
    return { name: planet.name, x: view.x + u * cosRoll - v * sinRoll,
      y: view.y + u * sinRoll + v * cosRoll, depth, orbit: planet.orbit,
      period: planet.period, radius: planet.radius * clamp(view.width / 390, 0.67, 1.35) * (1 - depth * 0.075) };
  }
  function setFont(ctx, px) { ctx.font = `${px}px ${fontFamily}`; ctx.textBaseline = 'middle'; }
  function print(ctx, mark, x, y, colour) { ctx.fillStyle = colour; ctx.fillText(mark, x, y); }

  function drawBackground(ctx, time, view) {
    ctx.fillStyle = '#020104'; ctx.fillRect(0, 0, view.width, view.height);
    setFont(ctx, clamp(view.font * 0.82, 6.6, 9.4));
    for (const s of stars) {
      const x = s.u * view.width, y = s.v * view.height;
      if (Math.hypot(x - view.x, y - view.y) < view.hole * 1.35) continue;
      const shimmer = 0.96 + 0.04 * Math.sin(time * (0.16 + 0.15 * s.power) + s.phase);
      print(ctx, s.mark, x, y, rgba([158, 162, 181], (0.10 + 0.48 * s.power) * shimmer));
    }
    const p = palettes[paletteIndex];
    // A translucent bloom beneath the glyphs supplies apparent gas luminosity.
    const r = view.hole;
    const g = ctx.createRadialGradient(view.x, view.y, r * 0.45, view.x, view.y, r * 5.6);
    g.addColorStop(0, rgba(p.high, 0.085));
    g.addColorStop(0.20, rgba(p.mid, 0.125));
    g.addColorStop(0.56, rgba(p.low, 0.07));
    g.addColorStop(1, rgba(p.low, 0));
    ctx.save(); ctx.translate(view.x, view.y); ctx.rotate(discRoll);
    ctx.scale(1, 0.49); ctx.translate(-view.x, -view.y);
    ctx.fillStyle = g;
    ctx.fillRect(view.x - r * 5.6, view.y - r * 5.6, r * 11.2, r * 11.2);
    ctx.restore();
  }

  // All field values are evaluated directly at screen positions. This keeps
  // the lettering fixed in space while intricate colour currents flow through it.
  function sampleGas(x, y, time, view) {
    const xx = (x - view.x) / view.hole, yy = (y - view.y) / view.hole;
    const u = xx * cosDisc + yy * sinDisc;
    const v = -xx * sinDisc + yy * cosDisc;
    const shadowDistance = Math.hypot(xx, yy);
    const discY = v / 0.225;
    const discRadius = Math.hypot(u, discY);
    const angle = Math.atan2(discY, u);
    const angularRate = 0.19 / Math.pow(Math.max(discRadius, 1.3), 1.5);
    const flowing = angle - time * angularRate;
    const wave1 = Math.sin(discRadius * 19.2 + 2.1 * Math.sin(flowing * 2.8) - flowing * 1.9);
    const wave2 = Math.cos(discRadius * 47.0 - flowing * 4.7 + 0.8 * Math.sin(time * 0.06));
    const wave3 = Math.sin(discRadius * 7.3 + flowing * 5.1);
    const texture = clamp(0.79 + 0.16 * wave1 + 0.10 * wave2 + 0.09 * wave3, 0.18, 1.2);
    const edge = smooth(1.24, 1.65, discRadius) * (1 - smooth(4.85, 5.85, discRadius));
    const radial = Math.pow(1.58 / Math.max(1.58, discRadius), 0.68);
    const approaching = clamp(1.10 - u * 0.055, 0.76, 1.37);
    const disc = 1.45 * edge * radial * texture * approaching;

    // A broad upper arch evokes the far side magnified over the shadow.
    // This is deliberately illustrative, not a relativistic lens equation.
    const top = smooth(0.10, 1.8, -v);
    const phi = Math.atan2(v, u);
    const haloNoise = 0.80 + 0.18 * Math.sin(13.2 * shadowDistance - 1.5 * phi - time * 0.055) +
      0.12 * Math.cos(25.1 * shadowDistance + phi * 3.2 + time * 0.045);
    const innerArch = Math.exp(-Math.pow((shadowDistance - 1.63) / (0.49 + top * 0.34), 2));
    const outerArch = Math.exp(-Math.pow((shadowDistance - 2.64) / 0.61, 2));
    const joining = 0.25 + 0.75 * top;
    const lensed = (1.25 * innerArch + 0.39 * outerArch) * joining * haloNoise *
      (0.82 + 0.18 * Math.cos(phi * 3 + time * 0.027));
    // A very thin, irregular near-shadow light contour.
    const photon = 0.48 * Math.exp(-Math.pow((shadowDistance - 1.09) / 0.10, 2)) *
      (0.64 + 0.36 * Math.sin(phi * 2.1 + 0.65));
    const grain = hash((Math.floor(x / view.stepX) + 1500) * 157 + Math.floor(y / view.stepY) * 79);
    return { disc, lensed, photon, near: v > 0, shadowDistance, grain, discRadius,
      brightness: Math.min(1.75, disc + lensed * (1 - clamp(disc * 0.44)) + photon),
      v };
  }

  // Quantised colour atlas avoids thousands of CSS string allocations per frame.
  const inkTable = palettes.map(p => Array.from({ length: 64 }, (_, i) => {
    const heat = i / 63 * 1.85;
    const mixLevel = clamp((heat - 0.08) / 0.94);
    const rgb = mixLevel < 0.58 ? lerpRGB(p.low, p.mid, mixLevel / 0.58) :
      lerpRGB(p.mid, p.high, (mixLevel - 0.58) / 0.42);
    return Array.from({ length: 16 }, (_, alpha) => rgba(rgb, alpha / 15));
  }));
  function inkForHeat(heat, radius, grain) {
    const tint = Math.round(clamp(heat * (0.84 + 0.24 * grain) / 1.85) * 63);
    const fade = 1 - clamp((radius - 3.3) / 3.2) * 0.18;
    const alpha = Math.round(clamp((0.32 + heat * 0.76 + (grain - 0.5) * 0.10) * fade, 0.18, 0.99) * 15);
    return inkTable[paletteIndex][tint][alpha];
  }
  function markForHeat(heat, grain) {
    const effective = heat * (0.90 + grain * 0.21);
    const glyphs = '.,:;irx+*%08B#@';
    const n = Math.floor(clamp((effective - 0.08) * 10.2, 0, glyphs.length - 1));
    return glyphs[Math.min(glyphs.length - 1, n + (grain > 0.92 ? 1 : 0))];
  }
  function sampleFrame(time, view, highRes) {
    const sx = view.stepX * (highRes ? 1 : 1.32);
    const sy = view.stepY * (highRes ? 1 : 1.20);
    const xmin = Math.max(1, view.x - view.halfSpan), xmax = Math.min(view.width - 1, view.x + view.halfSpan);
    const ymin = Math.max(1, view.y - view.halfHeight), ymax = Math.min(view.height - 1, view.y + view.halfHeight);
    const marks = [];
    // Sample the moving gas ONCE. Both depth layers then share identical positions.
    for (let y = ymin; y < ymax; y += sy) {
      for (let x = xmin; x < xmax; x += sx) {
        const gas = sampleGas(x, y, time, view);
        const withinShadow = gas.shadowDistance < 1.015;
        const back = withinShadow ? 0 : (gas.near ? 0 : gas.disc * 0.85) + gas.lensed;
        const front = (withinShadow && (!gas.near || gas.disc < 0.23)) ? 0 :
          (gas.near ? gas.disc * 1.12 : 0) + (withinShadow ? 0 : gas.photon);
        const value = heat => (heat < 0.085 || (heat < 0.21 && gas.grain < 0.25)) ? null :
          [markForHeat(heat, gas.grain), inkForHeat(heat, gas.discRadius, gas.grain)];
        const a = value(back), b = value(front);
        if (a || b) marks.push({ x: x + (gas.grain - 0.5) * sx * 0.14, y, a, b });
      }
    }
    return marks;
  }
  function drawGasField(ctx, samples, view, front, highRes) {
    setFont(ctx, view.font * (highRes ? 1 : 1.10));
    for (const m of samples) {
      const v = front ? m.b : m.a;
      if (v) print(ctx, v[0], m.x, m.y, v[1]);
    }
  }
  function drawShadow(ctx, view) {
    const r = view.hole * 1.014;
    ctx.fillStyle = '#000002';
    ctx.beginPath(); ctx.arc(view.x, view.y, r, 0, TAU); ctx.fill();
  }

  function drawOrbitHints(ctx, view) {
    setFont(ctx, Math.max(6.3, view.font * 0.78));
    for (let k = 0; k < planets.length; k++) {
      const planet = planets[k];
      for (let j = 0; j < 90; j++) {
        if ((j * 7 + k * 13) % 23 > 1) continue;
        const phi = j / 90 * TAU, r = view.orbitUnit * planet.orbit;
        const a = r * Math.cos(phi), b = r * Math.sin(phi) * cosInc;
        const x = view.x + a * cosRoll - b * sinRoll;
        const y = view.y + a * sinRoll + b * cosRoll;
        if (x < 8 || x > view.width - 8 || y < 8 || y > view.height - 8) continue;
        print(ctx, '.', x, y, 'rgba(130,126,130,0.075)');
      }
    }
  }
  function drawPlanetRings(ctx, planet, pos, view, back) {
    const r = pos.radius;
    setFont(ctx, Math.max(6.2, view.font * 0.85));
    for (let j = 0; j < 60; j++) {
      const angle = j / 60 * TAU;
      if ((Math.sin(angle) >= 0) !== back) continue;
      const a = Math.cos(angle) * r * 2.1;
      const b = Math.sin(angle) * r * 0.59;
      const x = pos.x + a * 0.89 - b * 0.46;
      const y = pos.y + a * 0.46 + b * 0.89;
      print(ctx, j % 5 === 0 ? ':' : '.', x, y,
        rgba(lerpRGB(planet.body, planet.lit, back ? 0.18 : 0.64), back ? 0.49 : 0.74));
    }
  }
  function drawPlanet(ctx, planet, pos, view) {
    const r = pos.radius;
    if (pos.x + r * 2.2 < 0 || pos.x - r * 2.2 > view.width ||
        pos.y + r * 2.2 < 0 || pos.y - r * 2.2 > view.height) return;
    if (planet.rings) drawPlanetRings(ctx, planet, pos, view, true);
    // Spheres are letter mosaics, lit on the hemisphere facing the hot gas.
    const lx = view.x - pos.x, ly = view.y - pos.y;
    const mag = Math.hypot(lx, ly) || 1;
    const dx = lx / mag, dy = ly / mag;
    const sx = Math.max(3.15, view.stepX * 0.74);
    const sy = Math.max(4.4, view.stepY * 0.70);
    setFont(ctx, Math.max(7, view.font * 0.94));
    let points = 0;
    for (let oy = -r; oy <= r; oy += sy) {
      for (let ox = -r; ox <= r; ox += sx) {
        const xx = ox / r, yy = oy / r, q = xx * xx + yy * yy;
        if (q > 1) continue;
        const zz = Math.sqrt(1 - q);
        const illumination = clamp(0.33 + 0.55 * (xx * dx + yy * dy + zz * 0.22));
        const stripe = Math.sin(yy * 16 + planet.seed * 2 + xx * 0.7);
        const noise = hash(Math.floor((ox + r) * 3) + Math.floor((oy + r) * 7) * 31, planet.seed);
        const intensity = clamp(0.13 + illumination * 0.76 + stripe * 0.065 + noise * 0.06);
        const tone = lerpRGB(planet.body.map(v => v * 0.58), planet.lit, intensity);
        const mark = intensity > 0.7 ? (noise > 0.5 ? '#' : '8') : intensity > 0.46 ? 'x' : intensity > 0.3 ? '+' : ':';
        print(ctx, mark, pos.x + ox, pos.y + oy,
          rgba(tone, (0.45 + 0.52 * zz) * (1 - Math.max(0, pos.depth) * 0.18)));
        points++;
      }
    }
    if (points < 2) print(ctx, 'o', pos.x, pos.y, rgba(planet.lit, 0.91));
    if (planet.rings) drawPlanetRings(ctx, planet, pos, view, false);
  }

  function drawScene(ctx, width, height, time, ignoredEffects, highRes = true) {
    const view = layout(width, height);
    ctx.save(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    drawBackground(ctx, time, view);
    drawOrbitHints(ctx, view);
    const worldPositions = planets.map(p => ({ planet: p, pos: orbitPosition(p, time, view) }));
    for (const world of worldPositions.filter(p => p.pos.depth > 0).sort((a, b) => b.pos.depth - a.pos.depth))
      drawPlanet(ctx, world.planet, world.pos, view);
    const gasSamples = sampleFrame(time, view, highRes);
    drawGasField(ctx, gasSamples, view, false, highRes);
    drawShadow(ctx, view);
    drawGasField(ctx, gasSamples, view, true, highRes);
    for (const world of worldPositions.filter(p => p.pos.depth <= 0).sort((a, b) => b.pos.depth - a.pos.depth))
      drawPlanet(ctx, world.planet, world.pos, view);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
  }
  function cyclePalette() { paletteIndex = (paletteIndex + 1) % palettes.length; return palettes[paletteIndex].name; }
  function source() { return [
    '// EVENT HORIZON / 002 — independent procedural ASCII',
    '// Differentially rotating gas. Eight fictional worlds on Keplerian orbits.',
    '// The near/far disc and gravitational arch are illustrative, not ray tracing.',
    orbitPosition.toString(), sampleGas.toString(), sampleFrame.toString(), drawGasField.toString(),
    drawPlanet.toString(), drawScene.toString()
  ].join('\n\n'); }
  function state(time = 0, width = 390, height = 620) {
    const view = layout(width, height);
    return { palette: palettes[paletteIndex].name,
      planets: planets.map(p => ({ ...orbitPosition(p, time, view), radius: p.radius })) };
  }
  window.PelagicEventHorizon = Object.freeze({
    draw: drawScene, cyclePalette, source, state,
    get palette() { return palettes[paletteIndex].name; },
    get swatch() { return palettes[paletteIndex].swatch; }
  });
})();
