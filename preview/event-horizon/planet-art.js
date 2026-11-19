/* EVENT HORIZON / PHASE A — spinning ASCII planets
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
    ATLAS: Object.freeze({kind:'gas',spin:.318,tilt:9,twist:8,phase:.3,scale:1.0,grain:.32,atmosphere:.09,seed:53}),
    HALO: Object.freeze({kind:'gas',spin:.262,tilt:23,twist:-12,phase:2.7,scale:1.1,grain:.26,atmosphere:.07,rings:true,seed:61}),
    AZURE: Object.freeze({kind:'ice-giant',spin:.204,tilt:34,twist:20,phase:4.2,scale:1.1,grain:.23,atmosphere:.10,seed:71}),
    UMBRA: Object.freeze({kind:'dark-ice',spin:.078,tilt:42,twist:-19,phase:1.9,scale:1.0,grain:.20,atmosphere:.035,seed:83})
  });
  const diagnostics={glyphs:0,atmosphereGlyphs:0,ringGlyphs:0,illuminated:0};
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
  function sampleTexture(profile,normal,time){
    const b=BASES[profile.name];
    const lat=Math.asin(clamp(dot(normal,b.axis),-1,1));
    const longitude=Math.atan2(dot(normal,b.east),dot(normal,b.equator))-spinAngle(profile.name,time);
    const seed=profile.seed*.137;
    const lon=longitude*profile.scale,phi=lat*profile.scale;
    const n=wave(lon,phi,seed);
    const craterX=Math.sin(5.7*lon+7.1*phi+seed)*Math.sin(8.9*phi-3.1*lon-seed);
    const streak=Math.sin(13.7*phi+Math.sin(3*lon+seed)*.85);
    let variation=0,cloud=0;
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
      case 'terrestrial':
        // Coherent continent-like regions plus sparse cloud veils.
        variation=.30*Math.tanh(1.8*n)+.10*craterX;
        cloud=smooth(.30,.70,Math.sin(lon*5.2+phi*4.7+seed)*Math.cos(phi*6.1-lon*2.4));
        break;
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
    return {variation:clamp(variation,-.52,.52),cloud};
  }
  function lightVector(pos,view){
    // Phase A: dominant irradiation toward the centre of the accretion disc.
    // The z component uses the projected orbital depth so the visible lit
    // hemisphere changes during the orbit. The disc's extended radiance,
    // gravitational bending and physical distances belong to Phase B.
    return normalize(view.x-pos.x,view.y-pos.y,clamp(pos.depth*1.22,-1,1));
  }
  function ringPass(ctx,planet,pos,view,profile,front,light){
    const r=pos.radius,font=Math.max(5.5,Math.min(7.0,view.font*.82));
    ctx.font=font+"px 'Courier New',ui-monospace,monospace";
    ctx.textBaseline='middle';
    const inclination=profile.tilt*Math.PI/180;
    for(let band=0;band<2;band++){
      const mult=band===0?1.72:2.08;
      for(let k=0;k<90;k++){
        const a=k/90*TAU,sa=Math.sin(a),ca=Math.cos(a);
        if((sa>=0)!==front)continue;
        if((k+band*3)%3===0)continue; // deliberately sparse ASCII rings
        const x0=ca*r*mult,y0=sa*r*(.42+.08*Math.cos(inclination));
        const x=pos.x+x0*.91-y0*.41,y=pos.y+x0*.41+y0*.91;
        const lit=clamp(.30+.56*(light[0]*ca+light[1]*sa+1)*.5);
        const col=color(planet.body,planet.lit,lit);
        const opacity=clamp((front?.72:.40)*(.50+.50*lit),.08,.80);
        if(x<0||x>view.width||y<0||y>view.height)continue;
        ctx.fillStyle=rgb(col,opacity);
        ctx.fillText(k%11===0?'=':k%5===0?':':'.',x,y);
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
    const light=lightVector(pos,view);
    if(p.rings)ringPass(ctx,planet,pos,view,p,true,light);
    // Dense enough to read as a textured sphere, sparse enough to read as ASCII.
    // No bitmap fill or photographic layer is introduced.
    const cellX=clamp(view.stepX*.67,2.5,3.4),
          cellY=clamp(view.stepY*.65,3.5,4.2);
    ctx.font=Math.max(5.8,Math.min(7.4,cellY*1.66))+"px 'Courier New',ui-monospace,monospace";
    ctx.textBaseline='middle';
    let count=0;
    const shadeAlpha=clamp(1-Math.max(0,pos.depth)*.12,.73,1);
    for(let oy=-r;oy<=r+1e-5;oy+=cellY){
      for(let ox=-r;ox<=r+1e-5;ox+=cellX){
        const x=ox/r,y=oy/r,inside=x*x+y*y;
        if(inside>1)continue;
        const z=Math.sqrt(Math.max(0,1-inside));
        const normal=[x,y,z];
        const incidence=dot(normal,light);
        // Small penumbra is justified by an extended emitting disc; precise
        // angular radiance integration remains a separate physics phase.
        const diffuse=Math.pow(clamp(incidence),.80);
        const penumbra=smooth(-.18,.18,incidence);
        const limb=Math.pow(clamp(1-z),1.9);
        const texture=sampleTexture({...p,name:planet.name},normal,time);
        let illum=clamp(.055+.76*diffuse+.12*penumbra+.045*limb*Math.max(0,incidence));
        illum*=.79+.21*z;
        const material=clamp(.52+texture.variation*p.grain*1.5,.12,.92);
        let tone=color(planet.body.map(c=>c*.45),planet.lit,clamp(illum*(.75+.43*material)));
        // Atmospheric clouds alter only the visible day side.
        if(texture.cloud>0)tone=color(tone,[220,229,212],texture.cloud*diffuse*.20);
        const brightness=clamp(.10+illum*.66+texture.variation*.17+.10*z);
        const index=Math.min(GLYPHS.length-1,Math.floor(brightness*(GLYPHS.length-1)));
        const opacity=clamp((.37+.60*z)*shadeAlpha*(.40+.60*penumbra),.14,.95);
        ctx.fillStyle=rgb(tone,opacity);
        ctx.fillText(GLYPHS[index],pos.x+ox,pos.y+oy);
        count++;diagnostics.glyphs++;
        if(incidence>0)diagnostics.illuminated++;
      }
    }
    if(count<2){
      ctx.fillStyle=rgb(planet.lit,.82);
      ctx.fillText('o',pos.x,pos.y);diagnostics.glyphs++;
    }
    if(p.atmosphere>0&&r>5){
      // A handful of quiet edge glyphs, not another bright circle or blur.
      const steps=14;
      for(let j=0;j<steps;j++){
        const angle=j/steps*TAU;
        const x=Math.cos(angle),y=Math.sin(angle);
        const illumination=clamp(light[0]*x+light[1]*y+.1*light[2]);
        if(illumination<.05)continue;
        ctx.fillStyle=rgb(planet.lit,p.atmosphere*illumination*.44);
        ctx.fillText(j%3===0?':':'.',pos.x+x*r*1.11,pos.y+y*r*1.11);
        diagnostics.atmosphereGlyphs++;
      }
    }
    if(p.rings)ringPass(ctx,planet,pos,view,p,false,light);
    return true;
  }
  const api=Object.freeze({
    draw:render,
    spinAngle,
    textureAt(name,normal,time){
      const p=PROFILES[name];
      return p?sampleTexture({...p,name},normal,time):null;
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
