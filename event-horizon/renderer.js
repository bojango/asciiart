/* EVENT HORIZON / FOREGROUND DEPTH PROTOTYPE — independent procedural ASCII astronomical artwork.
 * Reference-structure Python-to-JavaScript adaptation for private home display,
 * under the permission reported by the owner from JIN2 (@jin_22ee).
 * Production scene renderer: accepts the existing main-page UI unchanged.
 * Visual orbits remain illustrative until the physical ephemeris is validated.
 * Fictional planets: orbital periods obey P^2 proportional to a^3. The black
 * hole uses a stylised, screen-space lens approximation, not GR ray tracing.
 */
(() => {
  'use strict';
  // Keep the original EVENT HORIZON scene working if any optional production
  // render module fails to load (e.g. stale service-worker/network asset).
  // The original ./event-horizon.js is registered before this module.
  if(!window.EventHorizonHeroCamera||
     !window.EventHorizonPlanetArt||
     !window.EventHorizonSourceCompositor){
    console.warn('EVENT HORIZON: enhanced scene dependency unavailable; using baseline renderer');
    return;
  }
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
  const physicalOrbits=window.EventHorizonNBody||null;
  const phenomena=()=>window.EventHorizonPhenomena||null;
  const skyDirection=[.23,.86,.46],skyNorm=Math.hypot(...skyDirection);
  const look=skyDirection.map(v=>v/skyNorm);
  const rightNorm=Math.hypot(look[1],look[0]);
  const right=[look[1]/rightNorm,-look[0]/rightNorm,0];
  const up=[look[1]*right[2]-look[2]*right[1],look[2]*right[0]-look[0]*right[2],look[0]*right[1]-look[1]*right[0]];
  const SKY_ROLL=1.10,skyC=Math.cos(SKY_ROLL),skyS=Math.sin(SKY_ROLL);
  const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  let sampledAt=null,sampledBodies=null;
  const physicalSnapshot=time=>{
    if(!physicalOrbits)return null;
    if(time!==sampledAt){sampledAt=time;sampledBodies=physicalOrbits.stateAtSeconds(time)}
    return sampledBodies;
  };
  const guideCache=new Map();

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

  function layout(width,height){
    const cam=window.EventHorizonHeroCamera.camera(width,height);
    const sceneScale=cam.scale;
    // At 440×736 this preserves the accepted source composition exactly.
    // Wider viewports show more world-space horizontally, not stretched art.
    const hole=45.76*sceneScale;
    const orbitUnit=231.84*sceneScale;
    const stepX=Math.max(2.4,440/113*sceneScale);
    const stepY=Math.max(3.3,440/80*sceneScale);
    return {
      width,height,x:cam.cx,y:cam.cy,
      hole,orbitUnit,sceneScale,stepX,stepY,
      font:Math.max(5.5,Math.min(10,stepY*1.12)),
      halfSpan:228.8*sceneScale,halfHeight:hole*3.85
    };
  }
  function projectedPhysicalPoint(body,view){
    const r=Math.hypot(body.x,body.y,body.z)||.000001;
    const v=[body.x/r,body.y/r,body.z/r];
    const a=dot3(v,right),b=dot3(v,up);
    // Monotone radial compression keeps the eight circumbinary orbits
    // legible alongside the deliberately enlarged accretion disc.
    // Orbital phase, 3D inclination and time remain physical.
    const scale=view.orbitUnit*.40*Math.pow(r/.30,.60);
    return {x:view.x+scale*(a*skyC-b*skyS),
      y:view.y+scale*(a*skyS+b*skyC),
      depth:-dot3(v,look),orbitAU:r};
  }
  function orbitPosition(planet,time,view){
    if(physicalOrbits){
      const body=physicalSnapshot(time)?.find(p=>p.name===planet.name);
      if(body){
        const projection=projectedPhysicalPoint(body,view);
        const near=clamp(-projection.depth,0,1);
        const focus=planet.name==='VERDANT'?
          1+12*smooth(.84,.995,near):1;
        const radius=planet.radius*view.sceneScale*(440/390)*
          (1+projection.depth*.075)*focus;
        return {...projection,name:planet.name,radius,depth:projection.depth,
          period:physicalOrbits.estimate(planet.name).periodSeconds,
          orbit:planet.orbit,
          heroLOD:planet.name==='VERDANT'?
            radius>=116?'CLOSE':radius>=70?'NEAR':radius>=22?'MID':
              radius>=10?'FAR':'MIN':undefined};
      }
    }
    if(planet.name==='VERDANT')
      return window.EventHorizonHeroCamera.position(planet,time,view.width,view.height);
    const angle=planet.phase+time*TAU/planet.period;
    const u=Math.cos(angle)*view.orbitUnit*planet.orbit;
    const v=Math.sin(angle)*view.orbitUnit*planet.orbit*cosInc;
    const depth=Math.sin(angle)*sinInc;
    return {
      name:planet.name,
      x:view.x+u*cosRoll-v*sinRoll,
      y:view.y+u*sinRoll+v*cosRoll,
      depth,orbit:planet.orbit,period:planet.period,
      radius:planet.radius*view.sceneScale*(440/390)*(1-depth*.075)
    };
  }
  function setFont(ctx, px) { ctx.font = `${px}px ${fontFamily}`; ctx.textBaseline = 'middle'; }
  function print(ctx, mark, x, y, colour) { ctx.fillStyle = colour; ctx.fillText(mark, x, y); }

  function drawBackground(ctx,time,view){
    sceneASCII.stars=0;
    ctx.fillStyle='#010102';ctx.fillRect(0,0,view.width,view.height);
    setFont(ctx,clamp(view.font*0.84,6.8,9.4));
    for(const star of stars){
      const x=star.u*view.width,y=star.v*view.height;
      if(Math.hypot(x-view.x,y-view.y)<view.hole*1.20)continue;
      const flicker=.96+.04*Math.sin(time*.18+star.phase);
      print(ctx,star.mark,x,y,rgba([192,200,226],(.15+.57*star.power)*flicker));
      sceneASCII.stars++;
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
  // Reduce the old 25% illustrative directional gain to 14%.
  // Alters brightness only; orbital positions, disk geometry and tilt remain unchanged.
  const DIRECTIONAL_BRIGHTNESS_BIAS=.14;
  function sampleGas(x,y,time,view){
    const X=(x-view.x)/view.hole,Y=(y-view.y)/view.hole;
    const r=Math.hypot(X,Y),ang=Math.atan2(Y,X);
    const u=X*ct+Y*st,v=-X*st+Y*ct;
    const inc=.18,rho=Math.hypot(u,v/inc),phi=Math.atan2(v/inc,u);
    const t=12+time*.44,w=.060222*t+.28*Math.max(0,t-7.8);
    const gas=flowingGas(phi,rho,t,w);
    const diskEdge=softstep((rho-1.55)/.25)*softstep((5.4-rho)/2.2);
    const disk=1.52*diskEdge*gas.streak*(1.55/Math.max(rho,.00001))*(1-DIRECTIONAL_BRIGHTNESS_BIAS*u/Math.max(rho,1e-6));
    const top=.5-.5*Math.sin(ang-TILT),side=Math.pow(Math.abs(Math.cos(ang-TILT)),10);
    const out=Math.max(r-1.1,0);
    const haloBand=Math.exp(-Math.pow(out/(.2+.24*top+.45*side),2))*
      Math.exp(-Math.pow(Math.min(r-1.1,0)/.2,2));
    const haloRho=(1-side)*(1.55+Math.max(r-1,0)*2.6)+side*Math.max(r,1.55);
    const haloFlow=flowingGas(ang-TILT,haloRho,t,w).streak;
    const halo=1.24*haloBand*haloFlow*(.5+.8*top)*(1-DIRECTIONAL_BRIGHTNESS_BIAS*Math.cos(ang-TILT));
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
  // The original ranges from deep red through amber to near white-hot.
  const inkTable=palettesLight.map(ramp=>Array.from({length:72},(_,i)=>{
    const heat=i/71*2.5;let c;
    if(heat<.10)c=ramp[0];
    else if(heat<.20)c=ramp[1];
    else if(heat<.45)c=ramp[2];
    else if(heat<.75)c=ramp[3];
    else c=lerpRGB(ramp[4],[255,252,236],softstep((heat-.75)/1.5));
    return Array.from({length:16},(_,alpha)=>rgba(c,alpha/15));
  }));
  function inkForHeat(heat,radius,grain){
    const intensity=clamp(heat*1.8/2.5);
    const level=Math.round(intensity*71);
    const lum=Math.min(1.3,.42+.85*heat)*(.35+.65*softstep((heat-.07)/.15));
    const alpha=Math.round(clamp(lum*(.95-.16*softstep((radius-2.6)/2.5)),0,1)*15);
    return inkTable[paletteIndex][level][alpha];
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
  let rearCanvas,frontCanvas,rearCtx,frontCtx,layerWidth=0,layerHeight=0;
  const diagnostics={glyphs:0,hot:0,maxHeat:0,meanHeat:0,offscreen:false};
  const sceneASCII={stars:0,hints:0,planets:0,gas:0,total:0};
  let usingRGBCompositor=false;
  let lastRenderedOrbitTime=0;
  function prepareLayers(w,h){
    if(rearCanvas&&w===layerWidth&&h===layerHeight)return true;
    const make=()=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):
      typeof document!=='undefined'?Object.assign(document.createElement('canvas'),{width:w,height:h}):null;
    rearCanvas=make();frontCanvas=make();layerWidth=w;layerHeight=h;
    if(!rearCanvas||!frontCanvas)return false;
    rearCtx=rearCanvas.getContext('2d');frontCtx=frontCanvas.getContext('2d');
    return !!(rearCtx&&frontCtx);
  }
  // Pure luminance adjustment: does not change gas physics, letter selection,
  // planets, stars, the silhouette or the near/far layering.
  const innerLuminance=(heat,r)=>{
    const ringFalloff=Math.exp(-Math.pow((r-1.55)/0.97,2));
    const litGas=softstep((heat-.16)/.38);
    return ringFalloff*litGas;
  };
  function sampleFrame(time,view,highRes){
    const sim=window.EventHorizonSceneClock?.visualTime?.()??time;
    const effects=phenomena();
    const flare=effects?.discState?.(sim).flare||0;
    const stepX=view.stepX*(highRes?1:1.30),stepY=view.stepY*(highRes?1:1.2);
    const xmin=Math.max(0,view.x-view.halfSpan),xmax=Math.min(view.width,view.x+view.halfSpan);
    const ymin=Math.max(0,view.y-view.halfHeight),ymax=Math.min(view.height,view.y+view.halfHeight);
    const points=[];
    diagnostics.glyphs=0;diagnostics.hot=0;diagnostics.maxHeat=0;diagnostics.meanHeat=0;
    for(let y=ymin;y<ymax;y+=stepY){
      for(let x=xmin;x<xmax;x+=stepX){
        const gas=sampleGas(x,y,time,view);
        // Transient activity modifies luminous sampled gas, not the fixed
        // approved RGB compositor controls. Flow changes character positions.
        const heat=clamp(gas.heat*(1+.37*flare),0,1.8);
        if(heat<.07||(heat<.16&&gas.grain<.18))continue;
        const ring=gas.ring>.3&&gas.ring>gas.disc&&gas.ring>gas.lensed;
        const char=markForHeat(heat,gas.grain,gas.phase,gas.lr,ring,gas.ang);
        const coreLight=innerLuminance(heat,gas.shadowDistance);
        const luminousHeat=heat*(1+1.70*coreLight);
        const colour=inkForHeat(luminousHeat,gas.shadowDistance,gas.grain);
        const displaced=effects?.motion?.(x,y,sim,view)||{x,y};
        const point={x:displaced.x,y:displaced.y,char,colour,heat,near:gas.near,hot:heat>.68&&gas.shadowDistance<2.75,
          coreLight};
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
      // Repeat only hot inner glyphs through additive blending; the existing
      // two blur layers turn this into light without altering letter geometry.
      if(point.coreLight>.25){
        const previous=ctx.globalCompositeOperation;
        ctx.globalCompositeOperation='lighter';
        const strength=clamp((point.coreLight-.25)*.96,0,.68);
        print(ctx,point.char,point.x,point.y,rgba(palettesLight[paletteIndex][4],strength));
        ctx.globalCompositeOperation=previous||'source-over';
      }
    }
  }
  function renderBlackHole(ctx,view,time,highRes){
    usingRGBCompositor=false;
    const precise=window.EventHorizonSourceCompositor;
    if(precise){
      try{
        const density=highRes?1.67:1.04;
        const sampled={...view,stepX:view.stepX/density,
          stepY:view.stepY/density,font:view.font/density};
        const due=precise.needsFrame(time,view);
        const points=due?sampleFrame(time,sampled,highRes):[];
        const font=sampled.font+"px "+fontFamily;
        if(precise.draw(ctx,view,time,points,paletteIndex,font,drawShadow)){
          usingRGBCompositor=true;return;
        }
      }catch(error){
        console.error("EVENT HORIZON source RGB compositor fallback:",error);
        precise.reset();
        // Recover with the last proven working experimental renderer.
      }
    }
    const points=sampleFrame(time,view,highRes);
    const ready=prepareLayers(Math.ceil(view.width),Math.ceil(view.height));
    diagnostics.offscreen=ready;
    if(!ready){
      drawGasField(ctx,points,view,false,highRes);
      drawShadow(ctx,view);
      drawGasField(ctx,points,view,true,highRes);
      return;
    }
    rearCtx.clearRect(0,0,layerWidth,layerHeight);frontCtx.clearRect(0,0,layerWidth,layerHeight);
    drawGasField(rearCtx,points,view,false,highRes);
    drawGasField(frontCtx,points,view,true,highRes);
    function merge(surface){
      ctx.save();ctx.globalCompositeOperation='lighter';
      if(typeof ctx.filter==='string'){
        ctx.filter='blur(14px)';ctx.globalAlpha=.40;ctx.drawImage(surface,0,0);
        ctx.filter='blur(4px)';ctx.globalAlpha=.66;ctx.drawImage(surface,0,0);
        ctx.filter='none';
      } else {
        // Safari versions without Canvas filter still receive a glow pass.
        ctx.shadowBlur=12;ctx.shadowColor='rgba(255,145,60,.8)';
        ctx.globalAlpha=.6;ctx.drawImage(surface,0,0);
        ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;ctx.drawImage(surface,0,0);ctx.restore();
    }
    merge(rearCanvas);
    drawShadow(ctx,view);
    merge(frontCanvas);
  }
  function drawShadow(ctx, view) {
    const r = view.hole * 1.014;
    ctx.fillStyle = '#000002';
    ctx.beginPath(); ctx.arc(view.x, view.y, r, 0, TAU); ctx.fill();
  }

  function drawOrbitHints(ctx, view, time=0) {
    sceneASCII.hints=0;
    setFont(ctx, Math.max(6.3, view.font * 0.78));
    if(physicalOrbits){
      // Tiny background orbit hints follow the osculating 3D planes too.
      for(let i=0;i<planets.length;i++){
        const p=planets[i];
        const points=physicalOrbits.osculatingPath(p.name,time,64);
        for(let k=0;k<points.length;k++){
          if((k*7+i*13)%23>1)continue;
          const q=projectedPhysicalPoint(points[k],view);
          if(q.x<8||q.x>view.width-8||q.y<8||q.y>view.height-8)continue;
          print(ctx,'.',q.x,q.y,'rgba(130,126,130,0.075)');
          sceneASCII.hints++;
        }
      }
      return;
    }
    for (let k = 0; k < planets.length; k++) {
      const planet = planets[k];
      if(planet.name==='VERDANT'){
        const hero=window.EventHorizonHeroCamera;
        for(let j=0;j<160;j++){
          if((j*11+k*13)%43>1)continue;
          const phase=j/160*TAU;
          const time=(phase-planet.phase)*planet.period/TAU;
          const p=hero.position(planet,time,view.width,view.height);
          if(p.x<8||p.x>view.width-8||p.y<8||p.y>view.height-8)continue;
          print(ctx,'.',p.x,p.y,'rgba(130,126,130,0.07)');
          sceneASCII.hints++;
        }
        continue;
      }
      for (let j = 0; j < 90; j++) {
        if ((j * 7 + k * 13) % 23 > 1) continue;
        const phi = j / 90 * TAU, r = view.orbitUnit * planet.orbit;
        const a = r * Math.cos(phi), b = r * Math.sin(phi) * cosInc;
        const x = view.x + a * cosRoll - b * sinRoll;
        const y = view.y + a * sinRoll + b * cosRoll;
        if (x < 8 || x > view.width - 8 || y < 8 || y > view.height - 8) continue;
        print(ctx, '.', x, y, 'rgba(130,126,130,0.075)');
        sceneASCII.hints++;
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

  function paintPlanet(ctx,planet,pos,view,time){
    const art=window.EventHorizonPlanetArt;
    if(art&&art.draw(ctx,planet,pos,view,time))return;
    // Preserve old standalone and legacy A/B behaviour when art module absent.
    drawPlanet(ctx,planet,pos,view);
  }
  // Soft opacity beneath luminous gas. This runs BEFORE the existing
  // additive RGB light compositor, so the approved glyphs, colour ramps,
  // bloom and event-horizon geometry are completely unaffected.
  // Its only job is to stop background stars and rear planets showing
  // through a bright accretion disc as though the gas were empty space.
  function drawAccretionOcclusion(ctx,view){
    const radius=view.hole*5.40;
    ctx.save();
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=1;
    ctx.translate(view.x,view.y);
    ctx.rotate(TILT);
    // Broad, tilted screen-space projection of the flowing disc.
    // The extended outer edge fades smoothly to preserve diffuse gas.
    ctx.scale(1,.27);
    const matte=ctx.createRadialGradient(0,0,view.hole*.62,0,0,radius);
    matte.addColorStop(0,'rgba(1,1,2,0.92)');
    matte.addColorStop(.24,'rgba(1,1,2,0.73)');
    matte.addColorStop(.57,'rgba(1,1,2,0.48)');
    matte.addColorStop(.83,'rgba(1,1,2,0.20)');
    matte.addColorStop(1,'rgba(1,1,2,0)');
    ctx.fillStyle=matte;
    ctx.beginPath();
    ctx.arc(0,0,radius,0,TAU);
    ctx.fill();
    ctx.restore();
  }
  function donorPosition(time,view){
    if(!physicalOrbits)return null;
    const bodies=physicalSnapshot(time);
    const bh=bodies?.[0],star=bodies?.[1];
    if(!bh||!star)return null;
    const theta=Math.atan2(star.y-bh.y,star.x-bh.x);
    // The actual donor orbit is only 0.01 AU across while the accretion
    // artwork spans several hundred pixels. Enlarge the *marker/guide*
    // to make it selectable; angular phase and period remain numerical.
    const radius=view.hole*1.85;
    return {name:'DONOR_STAR',x:view.x+radius*Math.cos(theta+.32),
      y:view.y+radius*.65*Math.sin(theta+.32),depth:-.12,
      radius:7.2*view.sceneScale,period:window.EventHorizonPhysicalSystem?.
        binary?.periodSeconds??13580,markerScale:'ENLARGED'};
  }
  function drawDonor(ctx,pos,view,time){
    if(!pos||pos.x<-15||pos.x>view.width+15||
       pos.y<-15||pos.y>view.height+15)return;
    setFont(ctx,Math.max(6.8,7.8*view.sceneScale));
    const pulse=.78+.16*Math.sin(time*.7);
    print(ctx,'@',pos.x,pos.y,rgba([252,122,73],pulse));
    print(ctx,'.',pos.x-pos.radius*.7,pos.y-pos.radius*.40,rgba([239,81,52],.48));
    print(ctx,'+',pos.x+pos.radius*.8,pos.y+pos.radius*.2,rgba([244,150,83],.52));
    sceneASCII.planets+=3;
  }
  function projectedOrbit(name,time,width,height,count=480){
    if(!physicalOrbits)return null;
    const view=layout(width,height);
    const anchor=Math.floor(time/3600)*3600;
    const key=name+'/'+anchor+'/'+width+'/'+height+'/'+count;
    if(guideCache.has(key))return guideCache.get(key);
    let points=[],period=null;
    if(name==='DONOR_STAR'){
      period=window.EventHorizonPhysicalSystem?.binary?.periodSeconds;
      const donor=donorPosition(anchor,view);
      if(donor&&period){
        const phase=Math.atan2((donor.y-view.y)/.65,donor.x-view.x);
        const r=view.hole*1.85;
        points=Array.from({length:count+1},(_,i)=>{
          const theta=phase+i/count*TAU;
          return {x:view.x+r*Math.cos(theta),
            y:view.y+r*.65*Math.sin(theta)};
        });
      }
    }else{
      const osc=physicalOrbits.osculating(name,anchor);
      if(osc){
        period=osc.periodSeconds;
        points=Array.from({length:count+1},(_,i)=>
          projectedPhysicalPoint(osc.point(period*i/count),view));
      }
    }
    const result={points,period,baseTime:anchor,approximate:true};
    if(guideCache.size>=24)guideCache.clear();
    guideCache.set(key,result);
    return result;
  }
  function nextPhysicalHeroPass(time){
    const orbit=physicalOrbits?.osculating('VERDANT',time);
    if(!orbit)return null;
    const view=layout(440,736),period=orbit.periodSeconds;
    let best=-Infinity,when=period;
    for(let i=1;i<=96;i++){
      const delta=period*i/96,point=orbit.point(delta);
      const projection=projectedPhysicalPoint(point,view);
      const nearness=-projection.depth;
      if(nearness>best){best=nearness;when=delta}
    }
    return time+when;
  }
  function projectedVisitor(position,width,height){
    if(!position)return null;
    const point=projectedPhysicalPoint(position,layout(width,height));
    return {...point,name:position.id,radius:6};
  }
  function drawScene(ctx, width, height, time, ignoredEffects, highRes = true) {
    const view = layout(width, height);
    ctx.save(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    drawBackground(ctx, time, view);
    drawOrbitHints(ctx, view, window.EventHorizonSceneClock?.visualTime?.()??time);
    const orbitTime=window.EventHorizonSceneClock?.visualTime?.()??time;
    lastRenderedOrbitTime=orbitTime;
    if(showPlanets)window.EventHorizonPlanetInteraction?.drawOrbit?.(
      ctx,width,height,orbitTime);
    if(showPlanets)phenomena()?.drawPath?.(
      ctx,width,height,orbitTime,projectedVisitor);
    if(window.EventHorizonPlanetArt)window.EventHorizonPlanetArt.resetDiagnostics();
    // Planetary travel uses the persisted wall-art clock, independent of the
    // fast local animation time for gas currents, rotation and cloud drift.
    // Display trajectories remain illustrative until the true ephemeris ships.
    const worldPositions = planets.map(p => ({ planet: p, pos: orbitPosition(p, orbitTime, view) }));
    if(showPlanets)for (const world of worldPositions.filter(p => p.pos.depth > 0).sort((a, b) => b.pos.depth - a.pos.depth))
      paintPlanet(ctx, world.planet, world.pos, view, time);
    // The matte is behind the light itself, between far-side planets
    // and the luminous disc. Nearby planets are painted afterwards.
    drawAccretionOcclusion(ctx,view);
    renderBlackHole(ctx,view,time,highRes);
    const transientMarks=phenomena()?.drawTransients?.(
      ctx,view,orbitTime,time)||0;
    if(showPlanets&&physicalOrbits)drawDonor(ctx,donorPosition(orbitTime,view),view,time);

    if(showPlanets)for (const world of worldPositions.filter(p => p.pos.depth <= 0).sort((a, b) => b.pos.depth - a.pos.depth))
      paintPlanet(ctx, world.planet, world.pos, view, time);
    const visitorMarks=showPlanets?phenomena()?.drawObjects?.(
      ctx,width,height,orbitTime,projectedVisitor)||0:0;
    const surface=window.EventHorizonPlanetArt?.diagnostics?.();
    sceneASCII.planets=showPlanets&&surface?
      (surface.glyphs||0)+(surface.cloudGlyphs||0)+
      (surface.ringGlyphs||0)+(surface.moonGlyphs||0)+
      (surface.atmosphereGlyphs||0):0;
    sceneASCII.planets+=visitorMarks;
    sceneASCII.gas=usingRGBCompositor?
      (window.EventHorizonSourceCompositor?.stats?.().totalGlyphs??diagnostics.glyphs):
      diagnostics.glyphs;
    sceneASCII.gas+=transientMarks;
    sceneASCII.total=sceneASCII.stars+sceneASCII.hints+sceneASCII.planets+sceneASCII.gas;
    if(showPlanets)window.EventHorizonPlanetInteraction?.drawCallout?.(
      ctx,width,height,orbitTime);
    if(showPlanets)window.EventHorizonEncounterUI?.drawCallout?.(
      ctx,width,height,orbitTime,projectedVisitor);
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
      planets: planets.map(p => ({ ...orbitPosition(p, time, view),
        radius:p.radius,period:physicalOrbits?
          physicalOrbits.estimate(p.name).periodSeconds:p.period })) };
  }
  window.EventHorizonRebuild = Object.freeze({
    draw: drawScene, cyclePalette, source, state,projectedVisitor,
    heroAt(time,width=440,height=736){
      return orbitPosition(planets[2],time,layout(width,height));
    },
    nextHeroPass(time){return physicalOrbits?nextPhysicalHeroPass(time):
      window.EventHorizonHeroCamera.nextClosestTime(planets[2],time)},
    camera(width,height){return window.EventHorizonHeroCamera.camera(width,height)},
    diagnostics:()=>({...diagnostics,asciiCount:sceneASCII.total,asciiBreakdown:{...sceneASCII}}),
    projectedPlanets(time,width=440,height=736){
      const view=layout(width,height);
      return planets.map(p=>orbitPosition(p,time,view));
    },
    projectedBodies(time,width=440,height=736){
      const worlds=this.projectedPlanets(time,width,height);
      if(physicalOrbits)worlds.push(donorPosition(time,layout(width,height)));
      return worlds;
    },
    projectedPlanet(name,time,width=440,height=736){
      const view=layout(width,height);
      if(name==='DONOR_STAR')return donorPosition(time,view);
      const p=planets.find(p=>p.name===name);
      return p?orbitPosition(p,time,view):null;
    },
    projectedOrbit,
    planetPeriod(name){
      if(name==='DONOR_STAR')
        return window.EventHorizonPhysicalSystem?.binary?.periodSeconds??null;
      return physicalOrbits?.estimate(name)?.periodSeconds??
        planets.find(p=>p.name===name)?.period??null;
    },
    get renderedOrbitTime(){return lastRenderedOrbitTime;},
    setShowPlanets(v){showPlanets=Boolean(v)},
    get showPlanets(){return showPlanets},
    get palette() { return palettes[paletteIndex].name; },
    get swatch() { return palettes[paletteIndex].swatch; }
  });
  window.PelagicEventHorizon=window.EventHorizonRebuild;
})();
