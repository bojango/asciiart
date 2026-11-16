/* PELAGIC / 015 — an occasional living ecosystem, independent of the renderer.
   Plankton glows when disturbed; small copepods can only be caught by an actual
   moving tentacle. Fish are wildlife, not scripted prey. All species explore Z.
   The scenes, weather input and smart-home seam remain separate modules.
*/
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const rand=(x)=>{let k=Math.sin(x*127.119+54.29)*43758.5453;return k-Math.floor(k);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const switches={snow:true,blooms:true,prey:true,fish:true};
  const counts={blooms:0,bloomDisturbances:0,preyCaught:0,preyEaten:0,preyEscapes:0,fishVisits:0,fishScatters:0};
  let lastFedAt=-1000;
  const snow=Array.from({length:76},(_,i)=>({x:rand(i*5+13),y:rand(i*7+29),z:mix(-1.3,1.6,rand(i*11+57)),speed:2+rand(i*9+30)*9,phase:rand(i+51)*TAU}));
  const prey=[];
  const fish=[];
  let bloom=null;
  let now=0, nextBloom=18,nextPrey=12,nextFish=29;
  let encounterRate=1;
  let activeAnimal=null,activeRopes=[];
  let activeSize={width:390,height:600};
  const storageKey='pelagic.ecosystem.v1';
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    for(const key of Object.keys(switches))if(typeof saved?.switches?.[key]==='boolean')switches[key]=saved.switches[key];
    if(saved?.encounterRate!=null)encounterRate=clamp(Number(saved.encounterRate),.55,2);
  }catch(_){ }
  const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify({switches,encounterRate}));}catch(_){}};
  function setEnabled(type,yes){if(!(type in switches))return;switches[type]=!!yes;if(!yes){if(type==='blooms')bloom=null;if(type==='prey')prey.length=0;if(type==='fish')fish.length=0;}persist();}
  function setRate(value){encounterRate=clamp(Number(value)||1,.55,2);persist();}
  function project(v,w,h){
    const scale=clamp(Math.exp(-.57*v.z),.30,2.65);
    return {x:w*(.5+(v.x-.5)*scale),y:h*(.5+(v.y-.5)*scale),scale};
  }
  function spawn(type){
    const w=activeSize.width,h=activeSize.height;
    if(type==='feeding' && activeAnimal && activeRopes.length){
      // Debug-only placement near a real moving tentacle; collision remains physical.
      const available=activeRopes.filter(r=>r.points?.length>9);
      if(!available.length)return;
      const r=available[Math.floor(rand(now*7+38)*available.length)];
      const segment=Math.min(r.points.length-1,Math.max(8,Math.floor(r.points.length*.60)));
      const pt=r.points[segment],z=activeAnimal.z;
      const sc=clamp(Math.exp(-.57*z),.30,2.65);
      prey.push({x:.5+(pt.x/w-.5)/sc,y:.5+(pt.y/h-.5)/sc,z,
        vx:0,vy:0,seed:now*33+44,born:now,ttl:now+9,capturedAt:-1,rope:-1,segment:0,curious:false,reactionUntil:0,reaction:'drifting',reactionCooldown:0,hold:.65+rand(now+31)*.55});
      return;
    }
    if(type==='bloom'||type==='blooms'){
      const seed=now*9.71+counts.blooms*27+47;
      bloom={x:.19+rand(seed)*.62,y:.34+rand(seed+2)*.40,z:mix(-1.10,1.50,rand(seed+4)),
        seed,born:now,until:now+17+rand(seed+5)*9,drift:(rand(seed+6)-.5)*.008,
        curious:rand(seed+7)<.38,disturbedAt:-100,spread:0};
      counts.blooms++;nextBloom=now+(58+rand(seed+8)*62)/encounterRate;return;
    }
    if(type==='prey'){
      const seed=now*3.13+prey.length*28+17;
      for(let i=0;i<2+Math.floor(rand(seed+9)*3);i++){
        const angle=rand(seed+i*17)*TAU;
        prey.push({x:clamp(.23+rand(seed+3)*.53+Math.cos(angle)*.055,-.12,1.12),
          y:clamp(.28+rand(seed+7)*.40+Math.sin(angle)*.045,.08,.94),
          z:mix(-1.65,1.85,rand(seed+i*11+19)),vx:(rand(seed+i*3+2)-.5)*.014,
          vy:(rand(seed+i*7+4)-.5)*.010,seed:seed+i*7.1,born:now,ttl:now+22+rand(seed+i*13)*12,
          capturedAt:-1,rope:-1,segment:0,curious:rand(seed+i*7+4)<.42,
          reactionUntil:0,reaction:'drifting',reactionCooldown:0,hold:.60+.65*rand(seed+i*23+9)});
      }
      // Occasionally introduce a food opportunity near, not touching, a
      // tentacle. The prey still decides whether to flee; capture is not guaranteed.
      if(activeAnimal&&activeRopes.length&&rand(seed+109)<.24){
        const active=activeRopes.filter(r=>r.points?.length>10);
        if(active.length){
          const r=active[Math.floor(rand(seed+114)*active.length)];
          const k=Math.max(5,Math.floor(r.points.length*(.44+.30*rand(seed+115))));
          const pt=r.points[k];
          const p=prey[prey.length-1];
          if(p){
            p.z=clamp(activeAnimal.z+(.28*rand(seed+116)-.14),-1.88,2.02);
            const sc=project(p,w,h).scale;
            const offset=10+rand(seed+119)*28,theta=rand(seed+120)*TAU;
            p.x=.5+(pt.x+Math.cos(theta)*offset-w*.5)/(w*sc);
            p.y=.5+(pt.y+Math.sin(theta)*offset-h*.5)/(h*sc);
            p.curious=true;
          }
        }
      }
      nextPrey=now+(34+rand(seed+8)*38)/encounterRate;return;
    }
    if(type==='fish'){
      const seed=now*5.91+counts.fishVisits*31+90;
      const fromLeft=rand(seed+4)<.5,direction=fromLeft?1:-1;
      const n=1+Math.floor(rand(seed+6)*3);
      for(let i=0;i<n;i++){
        fish.push({x:fromLeft?-.19-i*.045:1.19+i*.045,y:.28+rand(seed+8)*.39+i*.03,
          z:mix(-1.65,1.85,rand(seed+i*5+13)),vx:direction*(.035+rand(seed+i*17)*.018),
          vy:(rand(seed+i*3+27)-.5)*.004,dir:direction,seed:seed+i*17,born:now,ttl:now+23,
          fleeUntil:0,curious:rand(seed+i*17+62)<.23});
      }
      counts.fishVisits++;nextFish=now+(69+rand(seed+41)*70)/encounterRate;
    }
  }
  function update(dt,time,animal,ropes,physics,fx){
    now=time;activeSize={width:physics.width,height:physics.height};activeAnimal=animal;activeRopes=ropes;
    const events={caught:0,fed:0};
    if(!Number.isFinite(dt)||dt<=0)return events;
    if(switches.blooms&&!bloom&&time>=nextBloom)spawn('bloom');
    if(switches.prey&&prey.length===0&&time>=nextPrey)spawn('prey');
    if(switches.fish&&fish.length===0&&time>=nextFish)spawn('fish');
    const w=physics.width,h=physics.height;
    if(bloom){
      const b=bloom;
      b.x+=dt*(b.drift+(fx.windX||0)*.000025);
      b.y+=dt*(.0011+Math.sin(time*.48+b.seed)*.00085);
      const bp=project(b,w,h),dist=Math.hypot(bp.x-animal.x,bp.y-animal.y);
      if(b.disturbedAt<0&&dist<physics.radius*physics.scale*1.2&&Math.abs(b.z-animal.z)<.42){
        b.disturbedAt=time;counts.bloomDisturbances++;
        animal.energy=Math.min(1.4,animal.energy+.06); // curiosity, not algae feeding
      }
      if(time>b.until){bloom=null;}
    }
    for(let i=prey.length-1;i>=0;i--){
      const p=prey[i];
      if(p.capturedAt>=0){
        const elapsed=time-p.capturedAt;
        const hold=p.hold||.85,transport=2.55;
        const progress=clamp((elapsed-hold)/transport,0,1);
        // Visible entanglement before slowly following the moving strand to its root.
        const rope=ropes[p.rope];
        if(rope?.points?.length){
          const target=Math.max(1,Math.round(p.segment*(1-progress*.975)));
          const pt=rope.points[Math.min(target,rope.points.length-1)];
          const sc=project({x:.5,y:.5,z:p.z},w,h).scale;
          const follow=1-Math.exp(-dt*(elapsed<hold?8:16));
          p.x=mix(p.x,.5+(pt.x/w-.5)/sc,follow);
          p.y=mix(p.y,.5+(pt.y/h-.5)/sc,follow);
          p.z=mix(p.z,animal.z,1-Math.exp(-dt*3));
        }
        if(elapsed>hold+transport){
          prey.splice(i,1);
          counts.preyEaten++;events.fed++;lastFedAt=time;
          animal.feedGlow=1;animal.digestUntil=Math.max(animal.digestUntil||0,time+5.8);
          animal.feedingUntil=0;
          animal.hunger=clamp((animal.hunger??.5)-.31,.05,1);
          animal.energy=Math.min(1.4,animal.energy+.18);
        }
        continue;
      }
      const seen=project(p,w,h),dx=seen.x-animal.x,dy=seen.y-animal.y;
      const nearby=Math.abs(p.z-animal.z)<.70&&Math.hypot(dx,dy)<physics.radius*physics.scale*2.1;
      if(nearby&&time>p.reactionCooldown){
        const r=rand(p.seed+Math.floor(time*1.2)*9.7);
        p.reaction=r<.22?'freeze':r<.80?'dart':'drift';
        p.reactionUntil=time+.6+r*.8;p.reactionCooldown=time+2.3+r*3.7;
      }
      if(time<p.reactionUntil&&p.reaction==='dart'){
        p.vx=clamp(p.vx+(dx>=0?1:-1)*dt*.055,-.09,.09);
        p.vy=clamp(p.vy+(dy>=0?1:-1)*dt*.035,-.075,.075);
        p.z=clamp(p.z+(p.z>animal.z?1:-1)*dt*.14,-1.9,2.05);
      }
      const frozen=time<p.reactionUntil&&p.reaction==='freeze';
      p.vx*=Math.exp(-dt*(frozen?4:.28));p.vy*=Math.exp(-dt*(frozen?4:.28));
      const dX=Math.sin(time*.7+p.seed)*.0009,dY=Math.cos(time*.63+p.seed)*.0007;
      p.x+=dt*((frozen?.12:1)*p.vx+dX+(fx.windX||0)*.000035);
      p.y+=dt*((frozen?.12:1)*p.vy+dY+(fx.windY||0)*.000018);
      p.z=clamp(p.z+Math.sin(time*.4+p.seed)*dt*.013,-1.9,2.05);
      if(time>p.ttl||p.x<-.20||p.x>1.2){if(p.reaction==='dart')counts.preyEscapes++;prey.splice(i,1);continue;}
      if(Math.abs(p.z-animal.z)>.33)continue;
      const projected=project(p,w,h);
      if(Math.hypot(projected.x-animal.x,projected.y-animal.y)>physics.radius*physics.scale*3)continue;
      let captured=false;
      // Contact must be with moving tentacle segments, never the bell centre.
      for(let j=0;j<ropes.length&&!captured;j++){
        const points=ropes[j].points;if(!points)continue;
        for(let k=3;k<points.length;k+=2){
          const a=points[k-1],b=points[k];
          const vx=b.x-a.x,vy=b.y-a.y;
          const q=clamp(((projected.x-a.x)*vx+(projected.y-a.y)*vy)/(vx*vx+vy*vy||1),0,1);
          const dist=Math.hypot(projected.x-a.x-vx*q,projected.y-a.y-vy*q);
          if(dist<3.1*projected.scale+1.7){
            p.capturedAt=time;p.rope=j;p.segment=k;p.reaction='caught';counts.preyCaught++;events.caught++;
            animal.feedingUntil=Math.max(animal.feedingUntil||0,time+3.6);
            animal.curiousUntil=Math.max(animal.curiousUntil,time+2);
            captured=true;break;
          }
        }
      }
    }
    for(let i=fish.length-1;i>=0;i--){
      const f=fish[i];
      const pos=project(f,w,h);const dist=Math.hypot(pos.x-animal.x,pos.y-animal.y);
      if(Math.abs(f.z-animal.z)<.43&&dist<physics.radius*physics.scale*1.85){
        if(time>f.fleeUntil){counts.fishScatters++;f.fleeUntil=time+2+rand(f.seed)*1.8;}
      }
      if(time<f.fleeUntil){
        const away=(pos.x-animal.x)||f.dir;
        f.vx+=(away>0?1:-1)*dt*.065;
        f.vy+=(pos.y>animal.y?1:-1)*dt*.023;
        f.z=clamp(f.z+dt*.14,-1.9,2.05);
      }
      if(time>=f.fleeUntil){
        for(const other of fish){
          if(other===f||Math.abs(other.z-f.z)>.25)continue;
          const dx=other.x-f.x,dy=other.y-f.y,d=Math.hypot(dx,dy);
          if(d>.015&&d<.15){f.vx+=clamp(dx,-.03,.03)*dt*.10;f.vy+=clamp(dy,-.03,.03)*dt*.08;}
        }
      }
      f.vx=clamp(f.vx,-.14,.14);f.vy=clamp(f.vy,-.05,.05);
      f.x+=f.vx*dt;f.y+=(f.vy+Math.sin(time*2.2+f.seed)*.002)*dt;
      if(time>f.ttl||f.x<-.34||f.x>1.34||f.y<-.1||f.y>1.1){fish.splice(i,1);}
    }
    if(!prey.length&&time>nextPrey-1)nextPrey=Math.max(nextPrey,time+18/encounterRate);
    if(!fish.length&&time>nextFish-1)nextFish=Math.max(nextFish,time+35/encounterRate);
    return events;
  }
  function interest(animal,physics){
    // A modest steering bias is voluntary, probabilistic and interruptible.
    if(animal.startle>.35)return null;
    if(bloom?.curious&&bloom.disturbedAt<0){
      const pos=project(bloom,physics.width,physics.height);
      return {x:pos.x,y:pos.y,z:bloom.z,strength:.30,type:'bloom',id:bloom.seed};
    }
    for(const p of prey){
      if(p.curious&&p.capturedAt<0&&Math.abs(p.z-animal.z)<.65){
        const pos=project(p,physics.width,physics.height);
        return {x:pos.x,y:pos.y,z:p.z,strength:.17,type:'prey',id:p.seed};
      }
    }
    for(const f of fish){
      if(f.curious && f.fleeUntil<now && Math.abs(f.z-animal.z)<.75){
        const pos=project(f,physics.width,physics.height);
        if(Math.hypot(pos.x-animal.x,pos.y-animal.y)<physics.width*.5)
          return {x:pos.x,y:pos.y,z:f.z,strength:.12,type:'fish',id:f.seed};
      }
    }
    return null;
  }
  function draw(ctx,layer,time,animal,physics){
    const w=physics.width,h=physics.height;
    ctx.save();ctx.textBaseline='middle';
    const symbol=(ch,x,y,size,color,glow=0)=>{
      if(x< -30||x>w+30||y< -30||y>h+30)return;
      ctx.font=`${Math.max(5.5,size).toFixed(1)}px 'Courier New',monospace`;
      ctx.fillStyle=color;
      if(glow){ctx.shadowColor=color;ctx.shadowBlur=glow;}
      ctx.fillText(ch,x,y);
      if(glow)ctx.shadowBlur=0;
    };
    if(switches.snow){
      for(let i=0;i<snow.length;i++){
        const s=snow[i];if((s.z>animal.z)!==(layer==='behind'))continue;
        const y=((s.y*h+time*s.speed)%(h+20))/(h+20),x=s.x+Math.sin(time*.16+s.phase)*.018;
        const pos=project({x,y,z:s.z},w,h);
        const alpha=(.04+.12*rand(i+49))*(layer==='behind'?.82:1)*clamp(1-s.z*.33,.30,1.16);
        symbol(i%17===0?'+':i%5===0?':':'.',pos.x,pos.y,6.5*pos.scale,`rgba(155,203,210,${alpha})`);
      }
    }
    if(bloom&&switches.blooms&&((bloom.z>animal.z)===(layer==='behind'))){
      const b=bloom,origin=project(b,w,h);
      const depthFade=clamp(1-Math.max(0,b.z)*.36,.29,1.0);
      const fade=clamp((time-b.born)/2)*clamp((b.until-time)/3)*depthFade;
      const burst=b.disturbedAt>0?clamp((time-b.disturbedAt)/3):0;
      const seed=b.seed;
      // Environmental light is a soft glow, never a raster illustration.
      // The visible algae remain separate ASCII glyphs.
      const glow=ctx.createRadialGradient(origin.x,origin.y,0,origin.x,origin.y,72*origin.scale*(1+burst*.5));
      glow.addColorStop(0,`rgba(26,172,185,${fade*(.10+.11*burst)})`);
      glow.addColorStop(.48,`rgba(24,106,134,${fade*.045})`);
      glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;
      ctx.fillRect(origin.x-90*origin.scale,origin.y-90*origin.scale,180*origin.scale,180*origin.scale);
      for(let i=0;i<65;i++){
        const a=rand(seed+i*3+16)*TAU+time*(.095+.07*rand(i+70));
        const rr=Math.sqrt(rand(seed+i*11+84));
        const wide=(11+45*rr)*(1+burst*1.5)*origin.scale;
        const x=origin.x+Math.cos(a)*wide+Math.sin(time*.47+i)*2;
        const y=origin.y+Math.sin(a)*wide*.63+Math.cos(time*.41+i)*2;
        const twinkle=.62+.38*Math.sin(time*1.8+i*2.2);
        const alpha=fade*(.12+.55*rand(i*17+seed))*twinkle*(b.disturbedAt>0?1.30:1);
        const glyph=i%15===0?'*':i%9===0?'+':i%4===0?':':'.';
        symbol(glyph,x,y,Math.max(6,8*origin.scale),`rgba(${i%7===0?'122,232,248':'76,205,228'},${clamp(alpha,0,.90)})`,i%8===0?6*origin.scale:0);
      }
      if(b.disturbedAt>0&&burst<.7){
        for(let j=0;j<11;j++){
          const a=j*TAU/11+time*.6;
          symbol('.',origin.x+Math.cos(a)*burst*100*origin.scale,origin.y+Math.sin(a)*burst*65*origin.scale,
            7*origin.scale,`rgba(115,245,240,${(.55-burst*.7)*fade})`,2);
        }
      }
    }
    if(switches.prey)for(const p of prey){
      if((p.z>animal.z)!==(layer==='behind'))continue;
      const pos=project(p,w,h), caught=p.capturedAt>=0;
      const flash=caught?(.72+.28*Math.sin(time*13+p.seed)):1;
      const depthFade=clamp(1-Math.max(0,p.z)*.36,.30,1.02);
      symbol(caught?'✦':'.o',pos.x,pos.y,Math.max(5.5,8*pos.scale),
        `rgba(${caught?'181,244,250':'121,214,231'},${clamp((.35+.55*flash)*depthFade,0,1)})`,caught?(4+2*Math.sin(time*9)**2)*pos.scale:0);
      if(caught)symbol('·',pos.x+Math.sin(time*12+p.seed)*5*pos.scale,pos.y-5*pos.scale,
        7*pos.scale,`rgba(135,230,252,${.45*depthFade})`,3*pos.scale);
      if(!caught&&Math.round(time*2+p.seed)%4===0)symbol(':',pos.x-5*pos.scale,pos.y-3*pos.scale,6*pos.scale,'rgba(140,200,232,.24)');
    }
    if(switches.fish)for(const f of fish){
      if((f.z>animal.z)!==(layer==='behind'))continue;
      const pos=project(f,w,h),sc=pos.scale;
      const fnt=Math.max(5.4,8.2*sc),chStep=fnt*.60;
      const visibility=clamp(1-Math.max(0,f.z)*.35,.28,1);
      const right=f.vx>=0;
      const tailWag=Math.sin(time*11+f.seed);
      const rows=right?['  __  ','><((o>','  ~~  ']:['  __  ','<o))><','  ~~  '];
      for(let yy=0;yy<3;yy++){
        for(let xx=0;xx<rows[yy].length;xx++){
          let ch=rows[yy][xx];if(ch===' ')continue;
          const x=pos.x+(xx-3)*chStep+(xx<2?tailWag*sc*1.4:0);
          const y=pos.y+(yy-1)*fnt*.68;
          symbol(ch,x,y,fnt,`rgba(${f.seed%2>1?'145,183,207':'139,200,202'},${(layer==='behind'?.38:.62)*visibility})`);
        }
      }
    }
    ctx.restore();
  }
  function clear(){bloom=null;prey.length=0;fish.length=0;nextBloom=Math.max(nextBloom,now+14);nextPrey=Math.max(nextPrey,now+12);nextFish=Math.max(nextFish,now+24);}
  function startle(){if(bloom?.disturbedAt<0)bloom.disturbedAt=now;for(const f of fish)f.fleeUntil=Math.max(f.fleeUntil,now+2.6);}
  const state=()=>({switches:{...switches},rate:encounterRate,active:{blooms:!!bloom,prey:prey.length,fish:fish.length},lastFedAt,counts:{...counts}});
  window.PelagicEcosystem=Object.freeze({update,draw,interest,setEnabled,setRate,spawn,clear,startle,state});
})();
