/* EVENT HORIZON / 005 — independent procedural ASCII astronomical artwork.
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
  const stars = Array.from({ length: 162 }, (_, i) => ({
    u: hash(i * 29 + 2), v: hash(i * 29 + 8), phase: hash(i * 19 + 24) * TAU,
    power: Math.pow(hash(i * 43 + 4), 2.1), mark: i % 31 === 0 ? '+' : i % 13 === 0 ? '*' : '.'
  }));
  const viewInclination = 1.08, orbitRoll = 1.28;
  const cosInc = Math.cos(viewInclination), sinInc = Math.sin(viewInclination);
  const cosRoll = Math.cos(orbitRoll), sinRoll = Math.sin(orbitRoll);
  const discRoll = 0.205;
  const cosDisc = Math.cos(discRoll), sinDisc = Math.sin(discRoll);

  function layout(width, height) {
    const hole = clamp(Math.min(width * 0.088, height * 0.074), 20, 74);
    const orbitUnit = Math.min(width * 0.60, height * 0.355);
    const stepX = clamp(width / 98, 3.2, 5.8), stepY = clamp(width / 60, 5.7, 9.1);
    return { width, height, x: width * 0.5, y: height * 0.51, hole,
      orbitUnit, stepX, stepY, font: Math.min(11, stepY * 1.08),
      halfSpan: Math.min(width * 0.48, hole * 5.45), halfHeight: hole * 3.35 };
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

  function drawBackground(ctx,time,view){
    ctx.fillStyle='#010102';ctx.fillRect(0,0,view.width,view.height);
    setFont(ctx,clamp(view.font*0.84,6.8,9.8));
    for(const star of stars){
      const x=star.u*view.width,y=star.v*view.height;
      if(Math.hypot(x-view.x,y-view.y)<view.hole*1.35)continue;
      const flicker=0.95+0.05*Math.sin(time*(0.16+0.15*star.power)+star.phase);
      print(ctx,star.mark,x,y,rgba([176,182,208],(0.18+0.60*star.power)*flicker));
    }
    const p=palettes[paletteIndex],r=view.hole;
    const g=ctx.createRadialGradient(view.x,view.y,r*0.48,view.x,view.y,r*3.1);
    g.addColorStop(0,rgba(p.high,0.24));
    g.addColorStop(0.23,rgba(p.mid,0.13));
    g.addColorStop(0.58,rgba(p.low,0.028));
    g.addColorStop(1,rgba(p.low,0));
    ctx.save();ctx.translate(view.x,view.y);ctx.rotate(discRoll);
    ctx.scale(1,0.42);ctx.translate(-view.x,-view.y);
    ctx.fillStyle=g;
    ctx.fillRect(view.x-r*3.1,view.y-r*3.1,r*6.2,r*6.2);
    ctx.restore();
  }

  // A continuous, tilted gas sheet, with a separately visible far-side image
  // above the shadow. All sampled light is rendered as ASCII and then composited.
  function sampleGas(x, y, time, view) {
    const xx=(x-view.x)/view.hole, yy=(y-view.y)/view.hole;
    const u=xx*cosDisc+yy*sinDisc, v=-xx*sinDisc+yy*cosDisc;
    const r=Math.hypot(xx,yy), phi=Math.atan2(yy,xx);
    const planeRadius=Math.hypot(u,v/0.185), planeAngle=Math.atan2(v/0.185,u);
    const flowing=planeAngle-time*(0.075/Math.pow(Math.max(1.5,planeRadius),1.3));
    const turbulence=0.75
      +0.17*Math.sin(17.7*planeRadius+2.4*flowing)
      +0.13*Math.sin(36*planeRadius-2*flowing)
      +0.10*Math.sin(3.2*planeAngle+9*planeRadius+0.09*time);
    const discEnvelope=smooth(1.1,1.7,planeRadius)*(1-smooth(3.8,5.15,planeRadius));
    const disc=4.6*discEnvelope
      *Math.exp(-Math.pow(Math.max(0,planeRadius-1.62)/1.47,1.46))
      *turbulence*(1-0.25*u/Math.max(planeRadius,1));
    // A warped diffuse image above the shadow, not a narrow geometric outline.
    const upper=smooth(-0.42,0.58,-v);
    const bowRadius=1.50+0.16*Math.cos(2*phi-0.42)+0.06*Math.sin(3*phi+0.11*time);
    const halo=3.4*Math.exp(-Math.pow((r-bowRadius)/(0.52+0.26*upper),2))*upper
      *(0.90+0.15*Math.sin(8.4*r-1.8*phi+0.045*time));
    const rim=0.62*Math.exp(-Math.pow((r-1.085)/0.135,2))*(0.60+0.40*upper);
    const grain=hash((Math.floor(x/view.stepX)+1500)*157+Math.floor(y/view.stepY)*79);
    return {disc, lensed:halo, photon:rim, near:v>=-0.02,
      shadowDistance:r, grain, discRadius:planeRadius, v};
  }

  // Dark reds remain faint; the central accretion gas reaches near-white.
  // The alpha is coupled to heat rather than the glyph level alone.
  const inkTable=palettes.map(p=>Array.from({length:72},(_,i)=>{
    const heat=i/71*4.5;
    const rgb=heat<0.20 ? lerpRGB(p.low,[222,62,18],smooth(0.04,0.2,heat)):
      heat<0.65 ? lerpRGB(p.low,p.mid,smooth(0.16,0.65,heat)):
      heat<1.55 ? lerpRGB(p.mid,p.high,smooth(0.65,1.55,heat)):
      lerpRGB(p.high,[255,251,239],smooth(1.55,3.0,heat));
    return Array.from({length:16},(_,alpha)=>rgba(rgb,alpha/15));
  }));
  function inkForHeat(heat,radius,grain){
    const h=Math.max(0,heat*(0.92+0.17*grain));
    const tint=Math.round(clamp(h/4.5)*71);
    const radialFade=Math.exp(-Math.pow(Math.max(0,radius-2.15)/2.0,1.32));
    const alpha=Math.round(clamp((0.16+h*0.59)*radialFade,0.035,1)*15);
    return inkTable[paletteIndex][tint][alpha];
  }

  function markForHeat(heat, grain) {
    const effective = heat * (0.90 + grain * 0.21);
    const glyphs = '.,:;irx+*%08B#@';
    const n = Math.floor(clamp((effective - 0.08) * 10.2, 0, glyphs.length - 1));
    return glyphs[Math.min(glyphs.length - 1, n + (grain > 0.92 ? 1 : 0))];
  }
  function sampleFrame(time,view,highRes){
    const sx=view.stepX*(highRes?1:1.32),sy=view.stepY*(highRes?1:1.2);
    const xmin=Math.max(1,view.x-view.halfSpan),xmax=Math.min(view.width-1,view.x+view.halfSpan);
    const ymin=Math.max(1,view.y-view.halfHeight),ymax=Math.min(view.height-1,view.y+view.halfHeight);
    const marks=[];
    for(let y=ymin;y<ymax;y+=sy){
      for(let x=xmin;x<xmax;x+=sx){
        const gas=sampleGas(x,y,time,view),r=gas.shadowDistance;
        const inside=r<0.98;
        const rear=inside?0:(gas.near?0:gas.disc*0.90)+gas.lensed+gas.photon;
        const near=(inside&&(!gas.near||gas.disc<0.25))?0:
          (gas.near?gas.disc*1.10:0)+(inside?0:gas.photon*0.48);
        const make=heat=>{
          if(heat<0.10||(heat<0.18&&gas.grain<0.24))return null;
          const v=Math.min(4.5,heat*(0.88+gas.grain*0.25));
          return [markForHeat(v,gas.grain),inkForHeat(v,r,gas.grain),v>1.05&&r<2.4];
        };
        const a=make(rear),b=make(near);
        if(a||b)marks.push({x:x+(gas.grain-0.5)*sx*0.12,y,a,b});
      }
    }
    return marks;
  }
  function drawGasField(ctx,samples,view,front,highRes){
    setFont(ctx,view.font*(highRes?1:1.10));
    // Add a small secondary luminous pass behind only the hottest characters.
    // This preserves discrete letters instead of blurring the whole disc into fog.
    const previous=ctx.globalCompositeOperation;
    for(const m of samples){
      const v=front?m.b:m.a;
      if(!v)continue;
      ctx.shadowBlur=0;
      print(ctx,v[0],m.x,m.y,v[1]);
      if(v[2]){
        ctx.globalCompositeOperation='lighter';
        ctx.shadowBlur=7;
        ctx.shadowColor=v[1];
        print(ctx,v[0],m.x,m.y,v[1]);
        ctx.shadowBlur=0;
        ctx.globalCompositeOperation=previous||'source-over';
      }
    }
    ctx.shadowBlur=0;
    ctx.globalCompositeOperation=previous||'source-over';
  }

  function drawShadow(ctx, view) {
    const r = view.hole * 0.98;
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
        print(ctx, '.', x, y, 'rgba(152,146,146,0.095)');
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
    const sx = Math.max(2.55, view.stepX * 0.58);
    const sy = Math.max(3.4, view.stepY * 0.54);
    setFont(ctx, Math.max(6.7, view.font * 0.88));
    let points = 0;
    for (let oy = -r; oy <= r; oy += sy) {
      for (let ox = -r; ox <= r; ox += sx) {
        const xx = ox / r, yy = oy / r, q = xx * xx + yy * yy;
        if (q > 1) continue;
        const zz = Math.sqrt(1 - q);
        const illumination = clamp(0.33 + 0.55 * (xx * dx + yy * dy + zz * 0.22));
        const stripe = Math.sin(yy * 16 + planet.seed * 2 + xx * 0.7);
        const noise = hash(Math.floor((ox + r) * 3) + Math.floor((oy + r) * 7) * 31, planet.seed);
        const crater = Math.sin(xx * 11 - yy * 7 + planet.seed * 3.1) * 0.055;
        const intensity = clamp(0.12 + illumination * 0.80 + stripe * 0.075 + noise * 0.07 + crater);
        const tone = lerpRGB(planet.body.map(v => v * 0.58), planet.lit, intensity);
        const mark = intensity > 0.82 ? (noise > 0.45 ? '@' : '#') : intensity > 0.66 ? (noise > 0.52 ? '8' : '0') : intensity > 0.50 ? 'x' : intensity > 0.34 ? '+' : ':';
        print(ctx, mark, pos.x + ox, pos.y + oy,
          rgba(tone, (0.50 + 0.48 * zz) * (1 - Math.max(0, pos.depth) * 0.16)));
        points++;
      }
    }
    if (points < 2) print(ctx, 'o', pos.x, pos.y, rgba(planet.lit, 0.94));
    else print(ctx, '·', pos.x - dx * r * 0.32, pos.y - dy * r * 0.32, rgba(planet.lit, 0.88));
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
    '// EVENT HORIZON / 005 — independently rebuilt accretion lighting',
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
