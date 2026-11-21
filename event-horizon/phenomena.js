/* EVENT HORIZON / stochastic small-body and transient-effects experiment.
 * Arrival frequency is artistically accelerated. Each visitor follows an
 * exact Newtonian TWO-BODY hyperbolic orbit about the assumed 5.4 M_sun
 * barycentric point mass. It does NOT yet exchange energy with planets or
 * modify the ten-body simulation. Osculating visitor trajectories, speeds
 * and tidal thresholds are physical under that restricted assumption.
 * Outgassing, bursts, jet morphology and particle glyphs are stylised.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2,DAY=86400,AU=149597870700,G=6.67430e-11,
    MS=1.98847e30,mu=G*5.4*MS;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const hash=x=>{const n=Math.sin(x*127.1+91.17)*43758.5453;return n-Math.floor(n)};
  const scalar=(id,salt=0)=>hash(id*31.151+salt*73.37);
  const randomLabel=n=>'ISO-'+String(Math.abs(n)).padStart(4,'0');
  const arrivalModes=Object.freeze({RARE:90,NORMAL:22,ACTIVE:6});
  let mode='NORMAL',enabled=true,selected=null,serial=0;
  let forced=[],manualFlare=null,manualJet=null;
  const cached=new Map();
  const cleanAngle=v=>((v%TAU)+TAU)%TAU;
  function encounter(id,start,style='RANDOM',forcedKind=false){
    const seed=Math.abs(id)+113;
    const picker=scalar(seed,1);
    const kind=style==='RANDOM'?
      (picker<.52?'COMET':picker<.82?'ACTIVE ASTEROID':'ROCKY ASTEROID'):style;
    const isTidal=kind==='TIDAL BODY';
    const volatile=kind==='COMET'||kind==='ACTIVE ASTEROID'||isTidal;
    const density=kind==='ROCKY ASTEROID'?2600:volatile?750:1400;
    const diameterKm=kind==='COMET'?1.4+scalar(seed,2)*9:
      kind==='ROCKY ASTEROID'?.3+scalar(seed,3)*5:.15+scalar(seed,4)*3;
    const periAU=isTidal?.008+scalar(seed,5)*.004:
      .035+Math.pow(scalar(seed,6),1.2)*.95;
    const vinf=25000+scalar(seed,7)*95000; // m/s
    const semimajorAbsMetres=mu/(vinf*vinf);
    const e=1+periAU*AU/semimajorAbsMetres;
    const unitTime=Math.sqrt(semimajorAbsMetres**3/mu);
    const edgeAU=3.3;
    const cosh=(edgeAU*AU/semimajorAbsMetres+1)/e;
    const edgeAnomaly=Math.acosh(Math.max(1,cosh));
    const transit=unitTime*(e*Math.sinh(edgeAnomaly)-edgeAnomaly);
    const inclination=(scalar(seed,8)*150-75)*Math.PI/180;
    const node=scalar(seed,9)*TAU,phase=scalar(seed,10)*TAU;
    const cN=Math.cos(node),sN=Math.sin(node),cI=Math.cos(inclination),
      sI=Math.sin(inclination),cP=Math.cos(phase),sP=Math.sin(phase);
    const disruptionAU=Math.cbrt(3*(5*MS)/(2*Math.PI*density))/AU;
    const enters=start,periTime=enters+transit,exits=periTime+transit;
    const outcome=isTidal||periAU<disruptionAU?'TIDAL FRAGMENTATION':'HYPERBOLIC ESCAPE';
    return Object.freeze({id:randomLabel(id),index:id,kind,volatile,
      diameterKm,density,periAU,vinf,e,semimajorAbsMetres,unitTime,
      enters,periTime,exits,transit,angle:inclination,
      disruptionAU,outcome,manual:forcedKind,
      cN,sN,cI,sI,cP,sP});
  }
  function bodyAt(body,t){
    const m=(t-body.periTime)/body.unitTime;
    let H=Math.asinh(m/Math.max(1,body.e)); // robust initial guess
    for(let i=0;i<15;i++){
      const f=body.e*Math.sinh(H)-H-m;
      const df=body.e*Math.cosh(H)-1;
      const d=clamp(f/Math.max(.00001,df),-2,2);
      H-=d;
      if(Math.abs(d)<1e-11)break;
    }
    const aa=body.semimajorAbsMetres;
    const x=aa*(body.e-Math.cosh(H)),y=aa*Math.sqrt(body.e**2-1)*Math.sinh(H);
    const X=x*body.cP-y*body.sP,Y=x*body.sP+y*body.cP;
    const metres=[
      X*body.cN-Y*body.sN*body.cI,
      X*body.sN+Y*body.cN*body.cI,
      Y*body.sI
    ];
    const r=Math.hypot(...metres),rAU=r/AU;
    const speed=Math.sqrt(body.vinf**2+2*mu/r);
    const fragmented=body.outcome==='TIDAL FRAGMENTATION'&&t>=body.periTime;
    const dustActivity=body.volatile?
      clamp((3.3-rAU)/2.35,0,1)*clamp((body.exits-t)/DAY,0,1):0;
    return {id:body.id,kind:body.kind,record:body,t,
      x:metres[0]/AU,y:metres[1]/AU,z:metres[2]/AU,
      rAU,speedMS:speed,fragmented,dustActivity,
      approaching:t<body.periTime};
  }
  function scheduled(k){
    if(k<0)return null;
    const existing=cached.get(k);if(existing)return existing;
    const step=arrivalModes[mode]*DAY;
    const start=k*step+step*(.13+.55*scalar(k+97,32));
    const b=encounter(k+1,start,'RANDOM',false);
    if(cached.size>75)cached.clear();
    cached.set(k,b);return b;
  }
  function active(t){
    if(!enabled||!Number.isFinite(t))return [];
    const step=arrivalModes[mode]*DAY,idx=Math.floor(t/step);
    const bodies=[];
    for(let k=Math.max(0,idx-7);k<=idx+1;k++){
      const b=scheduled(k);
      if(b&&b.enters<=t&&t<=b.exits)bodies.push(bodyAt(b,t));
    }
    for(const b of forced)if(b.enters<=t&&t<=b.exits)bodies.push(bodyAt(b,t));
    bodies.sort((a,b)=>a.rAU-b.rAU);
    return bodies.slice(0,4);
  }
  function selectedBody(t){
    return selected?active(t).find(b=>b.id===selected)||null:null;
  }
  function select(id,t){
    if(active(t).some(b=>b.id===id)){selected=id;return id}
    return null;
  }
  function clear(){selected=null}
  function modeSet(next){
    if(!Object.hasOwn(arrivalModes,next))return mode;
    mode=next;cached.clear();return mode;
  }
  function toggle(next){enabled=Boolean(next);if(!enabled)clear();return enabled}
  function force(kind='COMET',t=0){
    const id=100000+(++serial);
    const visitor=encounter(id,t-2*DAY,kind,true);
    // Skip the long approach ONLY for the dev demonstration. Subsequent
    // movement remains exactly the generated hyperbolic time law.
    const b=Object.freeze({...visitor,
      enters:t-2*DAY,periTime:t+6*3600,exits:t+6*3600+visitor.transit});
    forced.push(b);if(forced.length>6)forced=forced.slice(-6);
    selected=b.id;
    return b.id;
  }
  function transient(t,type){
    const interval=(type==='JET'?140:35)*DAY;
    const n=Math.floor(t/interval),phase=(t-n*interval)/interval;
    const lo=.10+.35*scalar(n+71,type==='JET'?13:18);
    const span=type==='JET'?.025:.08;
    const d=(phase-lo)/span;
    return d>0&&d<1?Math.sin(Math.PI*d)**2:0;
  }
  function envelope(t,stamp,duration){
    if(stamp===null)return 0;
    const u=(t-stamp)/duration;
    return u>=0&&u<=1?Math.sin(Math.PI*u)**2:0;
  }
  function discState(t){
    const flare=clamp(transient(t,'FLARE')+
      envelope(t,manualFlare,6*3600),0,1);
    const jet=clamp(transient(t,'JET')+
      envelope(t,manualJet,3*3600)*.95,0,1);
    return {flare,jet,estimatedRelativeEmission:1+flare*1.9,
      // Brightness is illustrative, not a simulated disc instability.
      luminosityModel:'ILLUSTRATIVE / NOT HYDRODYNAMIC'};
  }
  function trigger(type,t=0){
    if(type==='FLARE')manualFlare=t;
    else if(type==='JET')manualJet=t;
    else return null;
    return type;
  }
  function motion(x,y,t,view){
    if(!enabled)return {x,y};
    const d=discState(t),dx=x-view.x,dy=y-view.y;
    const r=Math.hypot(dx,dy);
    if(r<view.hole*1.15||r>view.hole*5.4)return {x,y};
    const power=.55+4.4*d.flare+1.6*d.jet;
    const angle=Math.atan2(dy,dx);
    const ripple=Math.sin((r/view.hole)*8-angle*4+t/2800)*.55;
    // Movement applies to ASCII glyph coordinates after original sampling;
    // no changes to source RGB lighting or the approved 14 preset values.
    return {x:x+(-Math.sin(angle))*power*(.65+ripple),
      y:y+Math.cos(angle)*power*(.65+ripple)*.29};
  }
  function drawPath(ctx,width,height,t,project){
    const b=selectedBody(t);
    if(!b||typeof ctx.setLineDash!=='function')return;
    const object=b.record,steps=128;
    const start=object.enters,end=object.exits;
    const time=clamp(t,start,end),widthS=(end-start)/steps;
    ctx.save();ctx.globalCompositeOperation='source-over';
    ctx.lineWidth=1;ctx.setLineDash([3,5]);
    for(let i=0;i<steps;i++){
      const ta=start+i*widthS,tb=ta+widthS;
      const a=project(bodyAt(object,ta),width,height),
        z=project(bodyAt(object,tb),width,height);
      if(!a||!z||!Number.isFinite(a.x+a.y+z.x+z.y))continue;
      const passed=tb<time;
      ctx.strokeStyle=passed?'rgba(235,242,248,0.82)':
        'rgba(157,172,185,0.53)';
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(z.x,z.y);ctx.stroke();
    }
    ctx.restore();
  }
  function drawObjects(ctx,width,height,t,project){
    if(!enabled)return 0;
    const bodies=active(t);let glyphCount=0;
    ctx.save();ctx.globalCompositeOperation='source-over';
    ctx.font='9px ui-monospace,SFMono-Regular,Menlo,monospace';
    ctx.textBaseline='middle';
    for(const b of bodies){
      const p=project(b,width,height);if(!p||!Number.isFinite(p.x+p.y))continue;
      if(p.x<-45||p.y<-45||p.x>width+45||p.y>height+45)continue;
      const seed=b.record.index,blink=.65+.28*Math.sin(t/240+seed);
      const bodyMark=b.fragmented?'%':b.kind==='COMET'?'*':b.kind==='ACTIVE ASTEROID'?'o':'+';
      const main=b.kind==='ROCKY ASTEROID'?'rgba(163,164,170,0.85)':
        'rgba(199,220,220,'+blink.toFixed(2)+')';
      ctx.fillStyle=main;ctx.fillText(bodyMark,p.x,p.y);glyphCount++;
      // True random-looking periodic particle *spray*: reproducible from
      // seed/time, only for volatile bodies in the active irradiation zone.
      const activity=b.dustActivity;
      const count=b.fragmented?22:Math.round(activity*
        (b.kind==='COMET'?21:9));
      const norm=Math.hypot(p.x-width*.5,p.y-height*.51)||1;
      const ux=(p.x-width*.5)/norm,uy=(p.y-height*.51)/norm;
      const burst=hash(Math.floor(t/900)+seed*3);
      for(let i=0;i<count;i++){
        const age=hash(i*19+seed*37+Math.floor(t/3600)*3);
        const delay=hash(i*37+seed*17+Math.floor(t/900));
        if(!b.fragmented&&delay>.38+.45*activity*burst)continue;
        const spread=(hash(i*11+seed*51)-.5)*2;
        const length=3+age*(b.fragmented?42:19);
        const sx=p.x+ux*length+uy*spread*8;
        const sy=p.y+uy*length-ux*spread*8;
        ctx.fillStyle='rgba(173,190,198,'+
          Math.max(.09,.58*(1-age)).toFixed(2)+')';
        ctx.fillText(i%5===0?'*':i%3===0?':':'.',sx,sy);
        glyphCount++;
      }
    }
    ctx.restore();return glyphCount;
  }
  function drawTransients(ctx,view,t,animationTime){
    if(!enabled)return 0;
    const state=discState(t),radius=view.hole;
    let count=0;
    ctx.save();ctx.font='8px ui-monospace,SFMono-Regular,Menlo,monospace';
    ctx.textBaseline='middle';
    if(state.flare>.08){
      const amount=Math.ceil(12+55*state.flare);
      for(let i=0;i<amount;i++){
        const angle=i*2.399963+animationTime*.07+hash(i)*.1;
        const r=radius*(1.4+3.4*hash(i*97));
        const x=view.x+r*Math.cos(angle),y=view.y+r*.27*Math.sin(angle);
        ctx.fillStyle='rgba(255,226,175,'+
          (.08+.62*state.flare).toFixed(2)+')';
        ctx.fillText(i%4===0?'*':'.',x,y);count++;
      }
    }
    if(state.jet>.10){
      // Jet orientation is an artistic projection. No magnetohydrodynamic
      // jet mechanism or relativistic radiation is claimed.
      const len=radius*(3+state.jet*2);
      for(const sign of [-1,1])for(let i=0;i<42;i++){
        const v=(i+1)/42,spread=(hash(i*67+sign*23)-.5)*8*v;
        const x=view.x+sign*len*v*.16+spread;
        const y=view.y+sign*len*v;
        ctx.fillStyle='rgba(183,221,249,'+
          (state.jet*(1-v)*.68).toFixed(2)+')';
        ctx.fillText(i%3===0?'+':'.',x,y);count++;
      }
    }
    ctx.restore();return count;
  }
  function snapshot(t){
    const bodies=active(t);
    return {enabled,mode,selected,visitors:bodies.map(b=>({
      id:b.id,kind:b.kind,distanceAU:b.rAU,speedKms:b.speedMS/1000,
      periapsisAU:b.record.periAU,periapsisTime:b.record.periTime,
      eccentricity:b.record.e,diameterKm:b.record.diameterKm,
      outcome:b.record.outcome,dustActivity:b.dustActivity,
      fragmented:b.fragmented,approaching:b.approaching,
      // Incoming interstellar speeds and orientations are assumed inputs.
      simulated:true})),...discState(t)};
  }
  function info(id,t){
    const b=active(t).find(x=>x.id===id);if(!b)return null;
    return {...snapshot(t).visitors.find(x=>x.id===id),
      densityKgM3:b.record.density,vinfKms:b.record.vinf/1000,
      disruptionAU:b.record.disruptionAU,
      class:b.record.volatile?'VOLATILE / ICY':'ROCKY',
      timeToPeriSeconds:b.record.periTime-t};
  }
  window.EventHorizonPhenomena=Object.freeze({
    version:'experimental-encounters-v1',active,bodyAt,snapshot,info,
    select,clear,force,trigger,modeSet,toggle,motion,discState,
    drawPath,drawObjects,drawTransients,
    get selected(){return selected},get enabled(){return enabled},
    get mode(){return mode},
    limitations:'Restricted point-mass hyperbolas; test particles are not '+
      'yet gravitationally perturbed by the moving planets. Mass transfer '+
      'and jets are artistic effects, not a hydrodynamics simulation.'
  });
})();