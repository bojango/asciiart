/* EVENT HORIZON / PHASE B — depth-adaptive spinning ASCII planets
 * Visual modelling only. The existing fictional orbital trajectories and
 * accepted black-hole RGB lighting are unchanged.
 * Rotation rates, atmospheres and material colours are illustrative until
 * a mass-calibrated physical planetary model is introduced.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
  const lerp=(a,b,t)=>a+(b-a)*clamp(t);
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
  const color=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
  const rgb=(a,opacity=1)=>'rgba('+a.map(v=>Math.round(clamp(v,0,255))).join(',')+','+clamp(opacity).toFixed(3)+')';
  const normalize=(x,y,z)=>{const d=Math.hypot(x,y,z)||1;return[x/d,y/d,z/d]};
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const GLYPHS='.:;irsXA253hMHGS#9B&@';
  // Each spin is independent of the orbital period. Rad per simulation unit.
  // Palette colours come from the existing planet definitions in the parent scene.
  const PROFILES=Object.freeze({
    CINDER: Object.freeze({kind:'volcanic',spin:.044,tilt:7,twist:22,phase:.8,scale:1.0,grain:.30,atmosphere:0,seed:17}),
    SILEX: Object.freeze({kind:'ice',spin:.106,tilt:21,twist:-17,phase:1.3,scale:.9,grain:.28,atmosphere:.07,seed:29}),
    VERDANT: Object.freeze({kind:'terrestrial',spin:.163,tilt:28,twist:18,phase:2.1,scale:1.05,grain:.34,atmosphere:.14,seed:37}),
    RUST: Object.freeze({kind:'desert',spin:.127,tilt:13,twist:11,phase:3.4,scale:1.2,grain:.28,atmosphere:.05,seed:43}),
    ATLAS: Object.freeze({kind:'gas',spin:.318,tilt:9,twist:8,phase:.3,scale:1.0,grain:.32,atmosphere:.09,rings:'thin',seed:53}),
    HALO: Object.freeze({kind:'gas',spin:.262,tilt:23,twist:-12,phase:2.7,scale:1.1,grain:.26,atmosphere:.07,rings:'broad',seed:61}),
    AZURE: Object.freeze({kind:'ice-giant',spin:.204,tilt:34,twist:20,phase:4.2,scale:1.1,grain:.23,atmosphere:.10,seed:71}),
    UMBRA: Object.freeze({kind:'dark-ice',spin:.078,tilt:42,twist:-19,phase:1.9,scale:1.0,grain:.20,atmosphere:.035,seed:83})
  });
  // Five tiny, deterministic satellites around four worlds. Their local
  // rotations are distinct from both planet spin and central-system orbits.
  // These are illustrative local orbits, not yet mass-calibrated moons.
  const MOONS=Object.freeze({
    VERDANT:Object.freeze([{size:'small',mark:'.',orbit:2.15,flat:.51,roll:.24,rate:.155,phase:.6}]),
    ATLAS:Object.freeze([
      {size:'large',mark:'o',orbit:2.48,flat:.57,roll:-.30,rate:.092,phase:1.25},
      {size:'small',mark:'.',orbit:3.06,flat:.40,roll:.18,rate:.054,phase:3.15}
    ]),
    HALO:Object.freeze([{size:'small',mark:':',orbit:2.86,flat:.55,roll:.32,rate:.085,phase:4.1}]),
    AZURE:Object.freeze([{size:'small',mark:'.',orbit:2.45,flat:.53,roll:-.27,rate:.067,phase:2.4}])
  });
  const diagnostics={glyphs:0,cloudGlyphs:0,atmosphereGlyphs:0,ringGlyphs:0,moonGlyphs:0,illuminated:0};
  const hash=(n)=>{const v=Math.sin(n*127.13+78.233)*43758.5453;return v-Math.floor(v)};
  const wave=(a,b,c)=>.52*Math.sin(a*4.3+b*3.7+c)+.31*Math.sin(a*8.1-b*6.5+2*c)+.17*Math.sin(a*14.1+b*9.2-c);
  function spinAngle(name,time){
    const p=PROFILES[name];
    if(!p)return 0;
    return ((p.phase+p.spin*time)%TAU+TAU)%TAU;
  }
  function basis(p){
    // Rotate each body's north pole away from the image's vertical axis.
    const tilt=p.tilt*Math.PI/180,twist=p.twist*Math.PI/180;
    const axis=normalize(Math.sin(tilt)*Math.cos(twist),Math.cos(tilt),Math.sin(tilt)*Math.sin(twist));
    const equator=normalize(...cross(axis,[0,0,1]));
    const east=normalize(...cross(equator,axis));
    return {axis,equator,east};
  }
  const BASES=Object.fromEntries(Object.entries(PROFILES).map(([k,p])=>[k,basis(p)]));
  function sampleTexture(profile,normal,time,lod=0){
    const b=BASES[profile.name];
    const lat=Math.asin(clamp(dot(normal,b.axis),-1,1));
    const longitude=Math.atan2(dot(normal,b.east),dot(normal,b.equator))-spinAngle(profile.name,time);
    const seed=profile.seed*.137;
    const lon=longitude*profile.scale,phi=lat*profile.scale;
    const n=wave(lon,phi,seed);
    const craterX=Math.sin(5.7*lon+7.1*phi+seed)*Math.sin(8.9*phi-3.1*lon-seed);
    const streak=Math.sin(13.7*phi+Math.sin(3*lon+seed)*.85);
    let variation=0,cloud=0,land=0,polarIce=0;
    switch(profile.kind){
      case 'gas':{
        // Latitude bands plus longitude-varying storm cells, so spin is legible.
        const bands=Math.sin(phi*21+1.0*Math.sin(lon*2.2+seed));
        const storms=Math.exp(-Math.pow((Math.sin(lon*1.7+seed)*Math.cos(phi*4.5)-.45)/.28,2));
        variation=.24*bands+.15*n+.20*storms;
        break;
      }
      case 'ice-giant':
        variation=.20*Math.sin(phi*14+Math.sin(lon*2.8+seed))+.14*n;
        break;
      case 'terrestrial':{
        // Low-frequency, body-fixed geography. Smooth thresholds create
        // large ocean basins, coherent continental interiors and coastlines.
        const continents=
          .52*Math.sin(lon*1.51+.50*Math.sin(phi*2.0+seed))+
          .29*Math.cos(lon*2.67-phi*2.13+seed*.63)+
          .23*Math.sin(lon*3.89+phi*3.21+seed*.27)+
          .12*Math.cos(lon*7.4-phi*5.1+seed);
        land=smooth(-.13,.14,continents);
        polarIce=smooth(1.02,1.39,Math.abs(phi));
        variation=.25*n+.10*craterX;
        // A separate cloud deck slides slowly across the spinning surface.
        // This is not baked into the rotating land/ocean map.
        const cloudLon=lon+time*.034;
        const clouds=.62*Math.sin(cloudLon*3.6+phi*3.2+seed)+
          .30*Math.cos(cloudLon*6.1-phi*5.7+seed*.3)+
          .15*Math.sin(cloudLon*10.5+phi*8.2);
        cloud=.83*smooth(.24,.56,clouds);
        break;
      }
      case 'volcanic':
        variation=.28*n+.15*craterX+.08*Math.sin(lon*10+phi*12);
        break;
      case 'desert':
        variation=.22*n+.13*Math.sin(phi*8.5+lon*1.1)+.09*craterX;
        break;
      case 'ice':
        variation=.20*n+.18*Math.pow(Math.abs(streak),7)-.08*craterX;
        break;
      case 'dark-ice':
        variation=.22*n+.11*craterX+.07*streak;
        break;
      default:
        variation=.22*n;
    }
    if(lod>0&&profile.kind==='terrestrial'){
      // Reveal geography at close range, rather than amplifying random noise.
      const relief=.040*Math.sin(lon*12.7+phi*10.2+seed)+
        .023*Math.sin(lon*23.2-phi*16.7+seed*2);
      variation+=lod*relief;
      land=clamp(land+lod*.11*relief);
    }
    return {variation:clamp(variation,-.52,.52),cloud,land,polarIce};
  }
  // Artistic tone map of central-source flux ~ 1 / orbit^2. Geometry is
  // intentionally screen-scaled; use the stable orbital parameter rather than
  // screen-space distance (which changes with projection and viewport).
  function proximityLight(orbit){
    const radius=clamp(Number.isFinite(orbit)?orbit:1.0,.40,1.39);
    const relativeFlux=Math.pow(.40/radius,2);
    return clamp(.56+.56*Math.pow(relativeFlux,.54),.70,1.12);
  }
  function lightVector(pos,view){
    // Phase A: dominant irradiation toward the centre of the accretion disc.
    // The z component uses the projected orbital depth so the visible lit
    // hemisphere changes during the orbit. The disc's extended radiance,
    // gravitational bending and physical distances belong to Phase B.
    return normalize(view.x-pos.x,view.y-pos.y,clamp(pos.depth*1.22,-1,1));
  }
  function moonPositions(name,pos,time){
    const specs=MOONS[name]||[];
    return specs.map((moon,index)=>{
      const phase=moon.phase+time*moon.rate;
      const u=Math.cos(phase)*pos.radius*moon.orbit;
      const v=Math.sin(phase)*pos.radius*moon.orbit*moon.flat;
      const a=moon.roll,ca=Math.cos(a),sa=Math.sin(a);
      return {id:name+'-MOON-'+(index+1),x:pos.x+u*ca-v*sa,
        y:pos.y+u*sa+v*ca,depth:Math.sin(phase),
        mark:moon.mark,size:moon.size,host:name};
    });
  }
  function drawMoon(ctx,moon,planet,pos,view,proximity){
    // Leave occultation to the parent planet; never create extra dots inside
    // its own silhouette. A single ASCII mark is enough to read as a moon.
    if(Math.hypot(moon.x-pos.x,moon.y-pos.y)<pos.radius*1.12)return;
    if(moon.x<4||moon.x>view.width-4||moon.y<4||moon.y>view.height-4)return;
    ctx.font=(moon.size==='large'?6.9:5.9)+"px 'Courier New',ui-monospace,monospace";
    ctx.textBaseline='middle';
    const col=color(planet.body,[219,215,208],moon.size==='large'?.68:.48);
    const opacity=clamp((moon.size==='large'?.77:.60)*proximity*
      (moon.depth>0?1:.86),.24,.83);
    ctx.fillStyle=rgb(col,opacity);
    ctx.fillText(moon.mark,moon.x,moon.y);
    diagnostics.moonGlyphs++;
  }
  function ringPass(ctx,planet,pos,view,profile,front,light,proximity){
    const r=pos.radius,thin=profile.rings==='thin';
    const font=Math.max(6.15,Math.min(7.35,view.font*.91));
    ctx.font=font+"px 'Courier New',ui-monospace,monospace";
    ctx.textBaseline='middle';
    const inclination=profile.tilt*Math.PI/180;
    const bands=thin?[1.77]:[1.68,2.15];
    const roll=thin?-.26:.42,cs=Math.cos(roll),sn=Math.sin(roll);
    for(let band=0;band<bands.length;band++){
      for(let k=0;k<84;k++){
        const a=k/84*TAU,sa=Math.sin(a),ca=Math.cos(a);
        if((sa>=0)!==front)continue;
        if((k+band*3)%4===0)continue; // fine broken ASCII arc
        const u=ca*r*bands[band],v=sa*r*(thin?.37:.47)*(.95+.05*Math.cos(inclination));
        const x=pos.x+u*cs-v*sn,y=pos.y+u*sn+v*cs;
        if(x<0||x>view.width||y<0||y>view.height)continue;
        const incidence=clamp((light[0]*ca+light[1]*sa+1)*.5);
        const lit=clamp((.44+.50*incidence)*proximity);
        const colour=color(planet.body,planet.lit,lit);
        const alpha=front?(thin?.76:.88):(thin?.47:.54);
        const opacity=clamp(alpha*(.76+.24*incidence)*proximity,.16,.88);
        ctx.fillStyle=rgb(colour,opacity);
        ctx.fillText(k%13===0?'=':k%6===0?'+':k%4===0?':':'.',x,y);
        diagnostics.ringGlyphs++;
      }
    }
  }
  function render(ctx,planet,pos,view,time){
    const p=PROFILES[planet.name];
    if(!p)return false;
    const r=pos.radius;
    if(pos.x+2.3*r<0||pos.x-2.3*r>view.width||
       pos.y+2.3*r<0||pos.y-2.3*r>view.height)return true;
    const light=lightVector(pos,view),proximity=proximityLight(pos.orbit);
    const moons=moonPositions(planet.name,pos,time);
    for(const moon of moons)if(moon.depth<0)drawMoon(ctx,moon,planet,pos,view,proximity);
    if(p.rings)ringPass(ctx,planet,pos,view,p,false,light,proximity);
    // Dense enough to read as a textured sphere, sparse enough to read as ASCII.
    // No bitmap fill or photographic layer is introduced.
    const hero=planet.name==='VERDANT'&&pos.heroLOD&&pos.heroLOD!=='MIN';
    // Limit mobile fillText workload at close approach while adding far
    // more actual surface samples than a normal distant planet has.
    const isClose=planet.name==='VERDANT'&&pos.heroLOD==='CLOSE';
    const cellX=hero?Math.max(clamp(view.stepX*.67,2.5,3.4),r/(isClose?24:18)):
                        clamp(view.stepX*.67,2.5,3.4);
    const cellY=hero?Math.max(clamp(view.stepY*.65,3.5,4.2),r/(isClose?22:17)):
                        clamp(view.stepY*.65,3.5,4.2);
    ctx.font=(hero?Math.max(5.8,Math.min(isClose?8.0:9.4,cellY*(isClose?1.05:1.22))):
                   Math.max(5.8,Math.min(7.4,cellY*1.66)))+
      "px 'Courier New',ui-monospace,monospace";
    const bodyFont=ctx.font;
    ctx.textBaseline='middle';
    let count=0;
    const shadeAlpha=clamp(1-Math.max(0,pos.depth)*.12,.73,1);
    // Centre the sample lattice on the planet, not on its leftmost edge.
    // Tiny spheres keep a complete top/bottom and left/right silhouette.
    const stepsX=Math.max(2,Math.round(r/cellX));
    const stepsY=Math.max(1,Math.round(r/cellY));
    const readability=1-smooth(5,13,r);
    for(let iy=-stepsY;iy<=stepsY;iy++){
      const oy=iy*r/stepsY;
      for(let ix=-stepsX;ix<=stepsX;ix++){
        const ox=ix*r/stepsX;
        const x=ix/stepsX,y=iy/stepsY,inside=x*x+y*y;
        if(inside>1)continue;
        const z=Math.sqrt(Math.max(0,1-inside));
        const normal=[x,y,z];
        const incidence=dot(normal,light);
        // Small penumbra is justified by an extended emitting disc; precise
        // angular radiance integration remains a separate physics phase.
        // A mild light wrap and softened terminator avoid vanishing
        // semicircles. Neither changes the spherical surface or light vector.
        const diffuse=Math.pow(clamp(incidence+.055),.85);
        const penumbra=smooth(-.34,.34,incidence);
        const limb=Math.pow(clamp(1-z),1.9);
        const texture=sampleTexture({...p,name:planet.name},normal,time,
          pos.heroLOD==='CLOSE'?1:pos.heroLOD==='NEAR'?.72:pos.heroLOD==='MID'?.35:0);
        // Extra minimum reflected light for bodies with only a few glyphs.
        // Slightly darker than Phase A roundness fix: roughly 10–20% less
        // ambient on the night side, without sacrificing full silhouettes.
        const ambient=.142+.060*readability;
        const direct=.64*diffuse+.13*penumbra+.03*limb*Math.max(0,incidence);
        const illum=clamp((ambient+direct)*proximity*(.82+.18*z));
        const material=clamp(.52+texture.variation*p.grain*1.5,.12,.92);
        let tone=color(planet.body.map(c=>c*.64),planet.lit,clamp(illum*(.82+.33*material)));
        let materialLight=illum;
        if(planet.name==='VERDANT'){
          // Oceans and land are materially different, even at low LOD.
          // Colour on both is driven by the same accretion-disc illumination.
          const seaDark=[15,44,77],seaLit=[46,125,178];
          const landDark=[27,51,35],landLit=[102,157,84];
          const coast=smooth(.22,.48,texture.land)*(1-smooth(.62,.85,texture.land));
          const ocean=color(seaDark,seaLit,clamp(materialLight*(.95+.20*material)));
          const terrain=color(landDark,landLit,clamp(materialLight*(.92+.25*material)));
          const coastLit=color(terrain,[178,168,113],coast*.43*diffuse);
          tone=color(ocean,coastLit,texture.land);
          // Subtle polar ice: it follows surface rotation, not cloud drift.
          tone=color(tone,[172,190,188],texture.polarIce*.55*diffuse);
        }else if(texture.cloud>0){
          tone=color(tone,[220,229,212],texture.cloud*diffuse*.20);
        }
        const brightness=clamp(.21+illum*.55+texture.variation*.14+.095*z);
        const index=Math.min(GLYPHS.length-1,Math.floor(brightness*(GLYPHS.length-1)));
        const opacity=clamp((.51+.44*z)*shadeAlpha*(.64+.36*penumbra),.24,.96);
        ctx.fillStyle=rgb(tone,opacity);
        ctx.fillText(GLYPHS[index],pos.x+ox,pos.y+oy);
        // Separate translucent ASCII cloud layer, drifting independently
        // of continents. Sparse marks avoid a white blanket over the sea.
        if(planet.name==='VERDANT'&&hero&&texture.cloud>.44&&diffuse>.07&&
           ((ix+iy*3)%3!==0)){
          const alpha=clamp((texture.cloud-.40)*(.18+.49*diffuse)*
            (isClose?1:.72)*shadeAlpha,.04,.43);
          ctx.fillStyle=rgb([220,229,226],alpha);
          ctx.font=bodyFont;
          ctx.fillText(texture.cloud>.70?'~':':',pos.x+ox+.85,pos.y+oy-1.15);
          diagnostics.cloudGlyphs++;
        }
        count++;diagnostics.glyphs++;
        if(incidence>0)diagnostics.illuminated++;
      }
    }
    if(count<2){
      ctx.fillStyle=rgb(planet.lit,.76*proximity);
      ctx.fillText('o',pos.x,pos.y);diagnostics.glyphs++;
    }
    if(p.atmosphere>0&&r>5){
      // A handful of quiet edge glyphs, not another bright circle or blur.
      const steps=isClose?42:hero?32:14;
      for(let j=0;j<steps;j++){
        const angle=j/steps*TAU;
        const x=Math.cos(angle),y=Math.sin(angle);
        const illumination=clamp(light[0]*x+light[1]*y+.1*light[2]);
        if(illumination<.05)continue;
        const rimStrength=isClose&&planet.name==='VERDANT'?1.6:1;
        ctx.fillStyle=rgb(planet.name==='VERDANT'?[117,174,204]:planet.lit,
          clamp(p.atmosphere*illumination*.44*proximity*rimStrength));
        ctx.fillText(j%3===0?':':'.',pos.x+x*r*1.11,pos.y+y*r*1.11);
        diagnostics.atmosphereGlyphs++;
      }
    }
    if(p.rings)ringPass(ctx,planet,pos,view,p,true,light,proximity);
    for(const moon of moons)if(moon.depth>=0)drawMoon(ctx,moon,planet,pos,view,proximity);
    return true;
  }
  const api=Object.freeze({
    draw:render,
    spinAngle,
    proximityLight,
    moonPositions,
    textureAt(name,normal,time,lod=0){
      const p=PROFILES[name];
      return p?sampleTexture({...p,name},normal,time,lod):null;
    },
    profile(name){
      const p=PROFILES[name];
      return p?{...p}:null;
    },
    names:()=>Object.keys(PROFILES),
    diagnostics:()=>({...diagnostics}),
    resetDiagnostics(){for(const k of Object.keys(diagnostics))diagnostics[k]=0;}
  });
  window.EventHorizonPlanetArt=api;
})();
