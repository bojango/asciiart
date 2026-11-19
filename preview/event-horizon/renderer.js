/* EVENT HORIZON / EXPERIMENTAL — independent procedural ASCII astronomical artwork.
 * Reference-structure Python-to-JavaScript adaptation for private home display,
 * under the permission reported by the owner from JIN2 (@jin_22ee).
 * Experimental only: this is not the live V2 renderer.
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
  let showPlanets=true;

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
    const hole = clamp(Math.min(width * 0.104, height * 0.077), 30, 75);
    const orbitUnit = Math.min(width * 0.54, height * 0.315);
    const stepX = clamp(width / 113, 3.0, 5.3), stepY = clamp(width / 80, 4.8, 8.1);
    return { width, height, x: width * 0.5, y: height * 0.51, hole,
      orbitUnit, stepX, stepY, font: Math.min(10, stepY * 1.12),
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

  function drawBackground(ctx,time,view){
    ctx.fillStyle='#010102';ctx.fillRect(0,0,view.width,view.height);
    setFont(ctx,clamp(view.font*0.84,6.8,9.4));
    for(const star of stars){
      const x=star.u*view.width,y=star.v*view.height;
      if(Math.hypot(x-view.x,y-view.y)<view.hole*1.20)continue;
      const flicker=.96+.04*Math.sin(time*.18+star.phase);
      print(ctx,star.mark,x,y,rgba([192,200,226],(.15+.57*star.power)*flicker));
    }
  }
  // All field values are evaluated directly at screen positions. This keeps
  // the lettering fixed in space while intricate colour currents flow through it.
  // Scalar port of the uploaded Python project's physically motivated gas field.
  // Normalisation uses shadow-radius units, so the original R0 is one.
  const TILT=17*Math.PI/180, ct=Math.cos(TILT),st=Math.sin(TILT);
  const POOLS=['1il!;:','rtfjcvxz=+','aeoun0{}[]<>','08B$#&%Q'];
  const palettesLight=[
    [[190,38,12],[242,78,20],[255,124,34],[255,172,78],[255,222,168]],
    [[107,37,100],[178,67,143],[224,125,178],[246,182,215],[255,230,248]],
    [[41,78,103],[74,128,148],[125,180,189],[208,203,159],[255,233,203]]
  ];
  const softstep=x=>{const c=clamp(x);return c*c*(3-2*c)};
  function flowingGas(phi,rho,t,w){
    const rr=Math.max(.001,rho),phase=phi-Math.pow(rr/1.55,-1.5)*w;
    const lr=Math.log(rr);
    const a=46*lr+.9*Math.sin(phase+3*lr);
    let streak=.55+.3*Math.sin(a)+.15*Math.sin(2.3*a+2*phase)+.12*Math.sin(3*phase-7*lr+.3*t);
    // Retain subtle orbit-following highlights, but not the one-off flash.
    for(const [radius,origin,speed] of [[1.8,0,.95],[2.4,2.1,.8],[3.2,4.2,.65]]){
      const d=((phi-origin-speed*t+9*Math.PI)%(2*Math.PI))-Math.PI;
      const comet=d>0?Math.exp(-Math.pow(d/.18,2)):Math.exp(d/.9);
      streak+=.13*comet*Math.exp(-Math.pow((lr-Math.log(radius))/.07,2));
    }
    return {streak,phase,lr};
  }
  function sampleGas(x,y,time,view){
    const X=(x-view.x)/view.hole,Y=(y-view.y)/view.hole;
    const r=Math.hypot(X,Y),ang=Math.atan2(Y,X);
    const u=X*ct+Y*st,v=-X*st+Y*ct;
    const inc=.18,rho=Math.hypot(u,v/inc),phi=Math.atan2(v/inc,u);
    const t=12+time*.44,w=.060222*t+.28*Math.max(0,t-7.8);
    const gas=flowingGas(phi,rho,t,w);
    const diskEdge=softstep((rho-1.55)/.25)*softstep((5.4-rho)/2.2);
    const disk=1.52*diskEdge*gas.streak*(1.55/Math.max(rho,.00001))*(1-.25*u/Math.max(rho,1e-6));
    const top=.5-.5*Math.sin(ang-TILT),side=Math.pow(Math.abs(Math.cos(ang-TILT)),10);
    const out=Math.max(r-1.1,0);
    const haloBand=Math.exp(-Math.pow(out/(.2+.24*top+.45*side),2))*
      Math.exp(-Math.pow(Math.min(r-1.1,0)/.2,2));
    const haloRho=(1-side)*(1.55+Math.max(r-1,0)*2.6)+side*Math.max(r,1.55);
    const haloFlow=flowingGas(ang-TILT,haloRho,t,w).streak;
    const halo=1.24*haloBand*haloFlow*(.5+.8*top)*(1-.25*Math.cos(ang-TILT));
    const ring=Math.exp(-Math.pow((r-1.02)/.045,2));
    const puff=.5+.5*(.5*Math.sin(2*ang+.9*Math.sin(5*r-.45*t+1.3*t))+
      .3*Math.sin(4.6*ang-5*r+.45*t+.7*t)+.2*Math.sin(8.2*ang+8.5*r-.76*t-1.1*t));
    const aura=.17*Math.exp(-Math.pow(Math.max(0,r-1)/(.32*(.7+.6*puff)),1.6));
    const soft=1-(1-clamp(aura*.55))*(1-clamp(halo))*(1-clamp(disk));
    let heat=Math.max(ring*.95,soft,disk,halo);
    const inside=r<.97,near=v>0;
    if(inside)heat=near && disk>.20?disk:0;
    const grain=hash((Math.floor(x/view.stepX)+1500)*157+Math.floor(y/view.stepY)*79);
    return {disc:disk,lensed:halo,photon:ring,near,inside,shadowDistance:r,
      grain,discRadius:rho,phase:gas.phase,lr:gas.lr,heat,ang,ring};
  }
  // Source palette / luminance mapping plus mobile-screen colour separation.
  // The supplied Python original uses fixed heat tags, TRAIL=.4 BLEND_MAX and
  // two BLEND_ADD blurred copies (.75 small, .45 broad).
  function lightWeights(heat,r){
    const core=Math.exp(-Math.pow((r-1.36)/0.98,2))*softstep((heat-.13)/.33);
    const outer=softstep((r-1.52)/.65)*
      (1-softstep((r-5.25)/1.0))*(.42+.58*softstep((heat-.07)/.33));
    return {core,outer};
  }
  function inkForHeat(heat,r,grain){
    const ramp=palettesLight[paletteIndex];
    const h=Math.max(0,heat*(.96+.08*grain));
    const base=h<.10?ramp[0]:h<.20?ramp[1]:h<.45?ramp[2]:h<.75?ramp[3]:ramp[4];
    const {core,outer}=lightWeights(h,r);
    const gold=lerpRGB(ramp[3],[255,201,89],.82);
    const colour=lerpRGB(lerpRGB(base,gold,outer*.88),[255,255,248],core*.97);
    const sourceLum=Math.min(1.3,.42+.85*h)*(.35+.65*softstep((h-.07)/.15));
    const exposure=1.10+1.32*core+.78*outer;
    return rgba(colour,clamp(sourceLum*exposure,0,1));
  }
  function markForHeat(heat,grain,phase=0,lr=0,ring=false,ang=0){
    if(ring){
      const d=(Math.atan2(-Math.sin(ang),Math.cos(ang))*180/Math.PI+360)%180;
      return d<22.5||d>=157.5?'-':d<67.5?'/':d<112.5?'|':'\\';
    }
    const pool=POOLS[clamp(Math.floor(heat*3.6),0,3)];
    const h=Math.floor(grain*12)+Math.floor(phase*2+lr*6);
    return pool[((h%pool.length)+pool.length)%pool.length];
  }
  let rearCanvas,frontCanvas,rearCtx,frontCtx,trailRear,trailFront,
      trailRearCtx,trailFrontCtx,layerWidth=0,layerHeight=0;
  const diagnostics={glyphs:0,hot:0,maxHeat:0,meanHeat:0,offscreen:false};
  function prepareLayers(w,h){
    if(rearCanvas&&frontCanvas&&trailRear&&trailFront&&
       w===layerWidth&&h===layerHeight)return true;
    const make=()=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):
      typeof document!=='undefined'?Object.assign(document.createElement('canvas'),{width:w,height:h}):null;
    rearCanvas=make();frontCanvas=make();trailRear=make();trailFront=make();
    if(!rearCanvas||!frontCanvas||!trailRear||!trailFront)return false;
    rearCtx=rearCanvas.getContext('2d');frontCtx=frontCanvas.getContext('2d');
    trailRearCtx=trailRear.getContext('2d');trailFrontCtx=trailFront.getContext('2d');
    layerWidth=w;layerHeight=h;
    if(!rearCtx||!frontCtx||!trailRearCtx||!trailFrontCtx)return false;
    for(const ctx of [trailRearCtx,trailFrontCtx]){
      ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';
      ctx.fillRect(0,0,w,h);
    }
    return true;
  }
  function retainLight(current,context){
    // Python: previous frame * TRAIL(.4), then BLEND_MAX(current frame).
    context.globalCompositeOperation='source-over';
    context.fillStyle='rgba(0,0,0,.60)';
    context.fillRect(0,0,layerWidth,layerHeight);
    context.globalCompositeOperation='lighten';
    context.drawImage(current,0,0);
    context.globalCompositeOperation='source-over';
  }
  // Pure luminance adjustment: does not change gas physics, letter selection,
  // planets, stars, the silhouette or the near/far layering.
  const innerLuminance=(heat,r)=>{
    const ringFalloff=Math.exp(-Math.pow((r-1.55)/0.97,2));
    const litGas=softstep((heat-.16)/.38);
    return ringFalloff*litGas;
  };
  function sampleFrame(time,view,highRes){
    const stepX=view.stepX*(highRes?1:1.30),stepY=view.stepY*(highRes?1:1.2);
    const xmin=Math.max(0,view.x-view.halfSpan),xmax=Math.min(view.width,view.x+view.halfSpan);
    const ymin=Math.max(0,view.y-view.halfHeight),ymax=Math.min(view.height,view.y+view.halfHeight);
    const points=[];
    diagnostics.glyphs=0;diagnostics.hot=0;diagnostics.maxHeat=0;diagnostics.meanHeat=0;
    for(let y=ymin;y<ymax;y+=stepY){
      for(let x=xmin;x<xmax;x+=stepX){
        const gas=sampleGas(x,y,time,view),heat=gas.heat;
        if(heat<.07||(heat<.16&&gas.grain<.18))continue;
        const ring=gas.ring>.3&&gas.ring>gas.disc&&gas.ring>gas.lensed;
        const char=markForHeat(heat,gas.grain,gas.phase,gas.lr,ring,gas.ang);
        const coreLight=innerLuminance(heat,gas.shadowDistance);
        const luminousHeat=heat*(1+1.70*coreLight);
        const colour=inkForHeat(luminousHeat,gas.shadowDistance,gas.grain);
        const light=lightWeights(luminousHeat,gas.shadowDistance);
        const point={x,y,char,colour,near:gas.near,hot:heat>.68&&gas.shadowDistance<2.75,
          coreLight:Math.max(coreLight,light.core),edgeLight:light.outer};
        points.push(point);
        diagnostics.glyphs++;diagnostics.maxHeat=Math.max(diagnostics.maxHeat,heat);
        diagnostics.meanHeat+=heat;if(point.hot)diagnostics.hot++;
      }
    }
    diagnostics.meanHeat/=Math.max(1,diagnostics.glyphs);
    return points;
  }
  function drawGasField(ctx,points,view,front,highRes){
    setFont(ctx,view.font*(highRes?1:1.06));
    for(const point of points)if(point.near===front){
      print(ctx,point.char,point.x,point.y,point.colour);
      // All extra light is rendered from the SAME glyph at the SAME position.
      const prev=ctx.globalCompositeOperation;
      ctx.globalCompositeOperation='lighter';
      if(point.edgeLight>.2)
        print(ctx,point.char,point.x,point.y,
          rgba(lerpRGB(palettesLight[paletteIndex][3],[255,208,94],.9),
            clamp((point.edgeLight-.2)*.84,0,.68)));
      if(point.coreLight>.15){
        print(ctx,point.char,point.x,point.y,
          rgba([255,255,249],clamp((point.coreLight-.15)*1.30,0,.90)));
        if(point.coreLight>.57)
          print(ctx,point.char,point.x,point.y,
            rgba([255,255,255],(point.coreLight-.57)*.82));
      }
      ctx.globalCompositeOperation=prev||'source-over';
    }
  }
  function renderBlackHole(ctx,view,time,highRes){
    const points=sampleFrame(time,view,highRes);
    const ready=prepareLayers(Math.ceil(view.width),Math.ceil(view.height));
    diagnostics.offscreen=ready;
    if(!ready){
      drawGasField(ctx,points,view,false,highRes);
      drawShadow(ctx,view);
      drawGasField(ctx,points,view,true,highRes);
      return;
    }
    rearCtx.clearRect(0,0,layerWidth,layerHeight);
    frontCtx.clearRect(0,0,layerWidth,layerHeight);
    drawGasField(rearCtx,points,view,false,highRes);
    drawGasField(frontCtx,points,view,true,highRes);
    retainLight(rearCanvas,trailRearCtx);
    retainLight(frontCanvas,trailFrontCtx);
    function merge(surface){
      ctx.save();ctx.globalCompositeOperation='lighter';
      const small=Math.max(2,Math.round(view.width*5/1080));
      const broad=Math.max(6,Math.round(view.width*22/1080));
      if(typeof ctx.filter==='string'){
        // Source: BLEND_ADD blur(art,4,5)*.75 and blur(art,8,22)*.45.
        ctx.filter='blur('+small+'px)';ctx.globalAlpha=.75;
        ctx.drawImage(surface,0,0);
        ctx.filter='blur('+broad+'px)';ctx.globalAlpha=.45;
        ctx.drawImage(surface,0,0);
        ctx.filter='none';
      }else{
        // Safari fallback retains both additive glow layers.
        ctx.shadowBlur=small*2.5;ctx.shadowColor='rgba(255,237,174,1)';
        ctx.globalAlpha=.75;ctx.drawImage(surface,0,0);
        ctx.shadowBlur=broad*1.7;ctx.shadowColor='rgba(255,166,57,1)';
        ctx.globalAlpha=.45;ctx.drawImage(surface,0,0);
        ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;ctx.drawImage(surface,0,0);ctx.restore();
    }
    merge(trailRear);drawShadow(ctx,view);merge(trailFront);
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
    if(showPlanets)for (const world of worldPositions.filter(p => p.pos.depth > 0).sort((a, b) => b.pos.depth - a.pos.depth))
      drawPlanet(ctx, world.planet, world.pos, view);
    renderBlackHole(ctx,view,time,highRes);

    if(showPlanets)for (const world of worldPositions.filter(p => p.pos.depth <= 0).sort((a, b) => b.pos.depth - a.pos.depth))
      drawPlanet(ctx, world.planet, world.pos, view);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
  }
  function cyclePalette() { paletteIndex = (paletteIndex + 1) % palettes.length; return palettes[paletteIndex].name; }
  function source() { return [
    '// EVENT HORIZON / experimental — reference-based black-hole port',
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
  window.EventHorizonRebuild = Object.freeze({
    draw: drawScene, cyclePalette, source, state,
    diagnostics:()=>({...diagnostics}),
    setShowPlanets(v){showPlanets=Boolean(v)},
    get showPlanets(){return showPlanets},
    get palette() { return palettes[paletteIndex].name; },
    get swatch() { return palettes[paletteIndex].swatch; }
  });
  window.PelagicEventHorizon=window.EventHorizonRebuild;
})();
