/* EVENT HORIZON / Planet identification overlay
 * Fictional descriptions; sizes are proposed physical diameters, not
 * values inferred from the visual glyph radius or a validated N-body model.
 * Annotations are purely visual and do not alter planetary motion or art.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const EARTH_DIAMETER_KM=12742;
  const INFO=Object.freeze({
    CINDER:Object.freeze({diameterKm:9920,kind:'ROCKY / VOLCANIC',
      description:'Black basalt plains, lava fractures and iron-rich ash highlands.'}),
    SILEX:Object.freeze({diameterKm:11600,kind:'ROCKY / FROZEN',
      description:'Pale silicate ridges, broken ice sheets and ancient impact basins.'}),
    VERDANT:Object.freeze({diameterKm:13260,kind:'TERRESTRIAL / OCEANIC',
      description:'Deep blue oceans, green continents and drifting cloud systems.'}),
    RUST:Object.freeze({diameterKm:10570,kind:'ROCKY / DESERT',
      description:'Oxidised dune seas, dry canyons and dust-filled crater fields.'}),
    ATLAS:Object.freeze({diameterKm:123600,kind:'BANDED GAS GIANT',
      description:'Ochre hydrogen clouds, ammonia storms and a narrow ice ring.'}),
    HALO:Object.freeze({diameterKm:142700,kind:'RINGED GAS GIANT',
      description:'Golden cloud belts, deep jet streams and broad icy rings.'}),
    AZURE:Object.freeze({diameterKm:49700,kind:'ICE GIANT',
      description:'Methane-blue atmosphere over deep, high-pressure fluid layers.'}),
    UMBRA:Object.freeze({diameterKm:34400,kind:'DARK ICE GIANT',
      description:'Low-light carbon haze, cold clouds and a hidden dense mantle.'})
  });
  const scene=()=>window.EventHorizonRebuild;
  let selected=null;

  // Derive genuine values from the project's idealised circular Kepler model,
  // not from the arbitrary visual orbit radius or canvas projection.
  function orbitalStats(name){
    const physics=window.EventHorizonPhysicalSystem;
    const body=physics?.plannedPlanets?.find(p=>p.name===name);
    const seconds=body?.keplerPeriodSeconds;
    const axis=body?.semimajorAxisAU;
    const auMetres=physics?.SI?.AU_M;
    let orbitTimeText='—',orbitDistanceText='—';
    if(Number.isFinite(seconds)&&seconds>0){
      const whole=Math.round(seconds);
      const days=Math.floor(whole/86400);
      const remainder=whole%86400;
      const pad=n=>String(n).padStart(2,'0');
      orbitTimeText=days+'d '+pad(Math.floor(remainder/3600))+':'+
        pad(Math.floor(remainder%3600/60))+':'+pad(remainder%60);
    }
    if(Number.isFinite(axis)&&axis>0&&Number.isFinite(auMetres))
      orbitDistanceText=Math.round(TAU*axis*auMetres/1609.344).
        toLocaleString('en-GB')+' MILES';
    const count=window.EventHorizonPlanetArt?.moonCount?.(name);
    return {orbitTimeText,orbitDistanceText,
      moonCount:Number.isInteger(count)?count:'—'};
  }
  function info(name){
    const p=INFO[name];
    return p?Object.freeze({...p,...orbitalStats(name),name,
      radiusEarth:p.diameterKm/EARTH_DIAMETER_KM,
      diameterText:p.diameterKm.toLocaleString('en-GB')+' KM DIAMETER'}):null;
  }
  function current(name,time,width,height){
    return scene()?.projectedPlanet?.(name,time,width,height)||null;
  }
  function period(name){return scene()?.planetPeriod?.(name)||null;}
  function visible(pos,w,h){
    return !!pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)&&
      pos.radius>0&&pos.x+pos.radius>=0&&pos.x-pos.radius<=w&&
      pos.y+pos.radius>=0&&pos.y-pos.radius<=h;
  }
  function ringHit(pos,x,y,name){
    const ring=window.EventHorizonPlanetArt?.profile?.(name)?.rings;
    if(!ring)return false;
    const r=pos.radius;
    const roll=ring==='thin'?-.26:.42;
    const dx=x-pos.x,dy=y-pos.y;
    const u=dx*Math.cos(roll)+dy*Math.sin(roll);
    const v=-dx*Math.sin(roll)+dy*Math.cos(roll);
    const axis=ring==='thin'?.37:.47;
    const bands=ring==='thin'?[1.77]:[1.68,2.15];
    return bands.some(b=>{
      const a=Math.hypot(u/(r*b),v/(r*b*axis));
      return Math.abs(a-1)<Math.max(.12,7/(r*b));
    });
  }
  function hitTest(x,y,w,h,time){
    if(!scene()?.showPlanets)return null;
    const ps=scene()?.projectedPlanets?.(time,w,h)||[];
    const matches=ps.filter(pos=>{
      if(!visible(pos,w,h))return false;
      const radius=Math.max(12,pos.radius+6);
      return Math.hypot(x-pos.x,y-pos.y)<=radius||
        ringHit(pos,x,y,pos.name);
    });
    // depth < 0 is near the viewer; select what was painted last.
    matches.sort((a,b)=>a.depth-b.depth);
    return matches[0]?.name||null;
  }
  function tap(x,y,w,h,time){
    const name=hitTest(x,y,w,h,time);
    selected=name===selected?null:name;
    return selected;
  }
  function select(name){
    selected=Object.prototype.hasOwnProperty.call(INFO,name)?name:null;
    return selected;
  }
  function clear(){selected=null;}

  function drawOrbit(ctx,width,height,time){
    if(!selected)return;
    const periodSec=period(selected),sceneNow=scene();
    if(!(periodSec>0)||!sceneNow?.projectedPlanet||
       typeof ctx.setLineDash!=='function')return;
    // Equally spaced 4px dashes in screen-space arc length, including on
    // the foreshortened elliptical orbits.
    const SAMPLES=480,DASH=4,GAP=4,points=[];
    for(let i=0;i<=SAMPLES;i++)
      points.push(sceneNow.projectedPlanet(
        selected,periodSec*i/SAMPLES,width,height));
    const currentPhase=((time%periodSec)+periodSec)%periodSec/periodSec;
    ctx.save();
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.lineWidth=1;ctx.lineCap='butt';ctx.setLineDash([]);
    let cumulative=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(!a||!b||!Number.isFinite(a.x+a.y+b.x+b.y))continue;
      const length=Math.hypot(b.x-a.x,b.y-a.y);
      if(length<1e-8)continue;
      let offset=0;
      while(offset<length-1e-7){
        const phase=(cumulative+offset)%(DASH+GAP);
        const dash=phase<DASH;
        const available=(dash?DASH:DASH+GAP)-phase;
        const step=Math.min(length-offset,Math.max(available,1e-6));
        if(dash&&step>1e-5){
          const u=offset/length,v=(offset+step)/length;
          const f=((i-1)+(offset+step*.5)/length)/SAMPLES;
          const behind=(currentPhase-f+1)%1;
          const ahead=(f-currentPhase+1)%1;
          // Pale-grey entire orbit; brighter recent path and forward motion.
          let glow=behind<.62?Math.pow(1-behind/.62,1.65):0;
          if(ahead<.115)glow=Math.max(glow,.68+.32*(1-ahead/.115));
          const shade=Math.round(191+64*glow);
          ctx.strokeStyle='rgba('+shade+','+shade+','+
            Math.min(255,shade+4)+','+(.72+.27*glow).toFixed(3)+')';
          ctx.beginPath();
          ctx.moveTo(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u);
          ctx.lineTo(a.x+(b.x-a.x)*v,a.y+(b.y-a.y)*v);
          ctx.stroke();
        }
        offset+=step;
      }
      cumulative+=length;
    }
    ctx.restore();
  }
  function wrap(text,limit,maxLines=3){
    const lines=[],words=text.split(/\s+/);let line='';
    for(const word of words){
      if((line+' '+word).trim().length>limit&&line){
        lines.push(line);line=word;
      }else line=(line+' '+word).trim();
    }
    if(line)lines.push(line);
    return lines.slice(0,maxLines);
  }

  function calloutGeometry(pos,w,h,name){
    const profile=window.EventHorizonPlanetArt?.profile?.(name);
    const ringMultiplier=profile?.rings?
      (profile.rings==='thin'?1.88:2.27):1;
    const extent=Math.max(8,pos.radius*ringMultiplier+5);
    const margin=8;
    const boxW=Math.max(80,Math.min(244,Math.max(200,w*.63),w-2*margin));
    const descriptor=info(name);
    const limit=Math.max(13,Math.floor((boxW-16)/(9*.60)));
    const description=wrap(descriptor?.description||'',limit,3);
    const boxH=96+12*description.length;
    const offscreen=!visible(pos,w,h)||pos.x<0||pos.x>w||
      pos.y<0||pos.y>h;
    if(offscreen){
      // Box is pinned just inside the relevant screen edge. The short
      // connector points toward the selected planet even when offscreen.
      const side=pos.x<0?-1:pos.x>w?1:pos.x>=w/2?1:-1;
      const gutter=Math.min(36,Math.max(24,w*.09));
      const boxX=side>0?w-gutter-boxW:gutter;
      const upper=Math.min(72,Math.max(margin,h*.10));
      const lower=Math.max(upper,h-boxH-Math.min(60,h*.09));
      const boxY=clamp(pos.y-boxH*.5,upper,lower);
      const entryX=side>0?boxX+boxW:boxX;
      const entryY=clamp(pos.y,boxY+14,boxY+boxH-14);
      return {offscreen,extent,boxX,boxY,boxW,boxH,description,side,
        entryX,entryY,elbowX:entryX+side*11,
        startX:side>0?w-1:1,startY:clamp(pos.y,8,h-8)};
    }
    const leftRoom=pos.x-extent-margin;
    const rightRoom=w-pos.x-extent-margin;
    const side=rightRoom>=leftRoom?1:-1;
    const room=Math.max(leftRoom,rightRoom);
    const vertical=pos.y<h*.5?1:-1;
    if(room>=boxW+36){
      // When space permits, the entire box stays outside the highlight.
      const gap=Math.min(52,Math.max(36,room-boxW));
      const boxX=side>0?pos.x+extent+gap:
        pos.x-extent-gap-boxW;
      const startX=pos.x+side*extent;
      const startY=pos.y+vertical*Math.min(12,extent*.25);
      const elbowX=startX+side*19;
      const elbowY=startY+vertical*19;
      const boxY=clamp(elbowY-(vertical>0?12:boxH-12),
        margin,Math.max(margin,h-boxH-margin));
      return {offscreen:false,mode:'lateral',extent,boxX,boxY,boxW,boxH,
        description,side,startX,startY,elbowX,elbowY,
        entryX:side>0?boxX:boxX+boxW,
        entryY:clamp(elbowY,boxY+10,boxY+boxH-10)};
    }
    // Mobile cannot fit a large ringed planet and its label side by side.
    // Switch above/below with a 24px gap, preserving the angular leader.
    const downSpace=h-(pos.y+extent);
    const upSpace=pos.y-extent;
    const v=downSpace>=boxH+24?1:
      upSpace>=boxH+24?-1:downSpace>=upSpace?1:-1;
    const boxX=clamp(pos.x-boxW*.5+side*12,
      margin,Math.max(margin,w-boxW-margin));
    const boxY=clamp(v>0?pos.y+extent+24:
      pos.y-extent-boxH-24,margin,Math.max(margin,h-boxH-margin));
    const startX=pos.x+side*extent;
    const startY=pos.y+v*extent;
    const elbowX=startX+side*16;
    const elbowY=startY+v*16;
    return {offscreen:false,mode:'vertical',extent,boxX,boxY,boxW,boxH,
      description,side,startX,startY,elbowX,elbowY,
      entryX:clamp(elbowX+side*15,boxX+12,boxX+boxW-12),
      entryY:v>0?boxY:boxY+boxH};
  }
  function drawCallout(ctx,width,height,time){
    if(!selected)return;
    const pos=current(selected,time,width,height);
    if(!pos||!Number.isFinite(pos.x+pos.y+pos.radius))return;
    const metadata=info(selected);
    if(!metadata)return;
    const g=calloutGeometry(pos,width,height,selected);
    ctx.save();
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.shadowBlur=0;ctx.lineWidth=1;ctx.setLineDash([]);
    ctx.strokeStyle='rgba(255,255,255,0.93)';
    if(!g.offscreen){
      ctx.strokeRect(Math.round(pos.x-g.extent)+.5,
        Math.round(pos.y-g.extent)+.5,
        Math.round(g.extent*2),Math.round(g.extent*2));
    }
    ctx.beginPath();
    if(g.offscreen){
      ctx.moveTo(g.entryX,g.entryY);
      ctx.lineTo(g.elbowX,g.entryY);
      ctx.lineTo(g.startX,g.startY);
    }else{
      ctx.moveTo(g.startX,g.startY);
      ctx.lineTo(g.elbowX,g.elbowY);
      ctx.lineTo(g.entryX,g.elbowY);
      if(Math.abs(g.entryY-g.elbowY)>.5)
        ctx.lineTo(g.entryX,g.entryY);
    }
    ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,0.88)';
    ctx.fillRect(g.boxX,g.boxY,g.boxW,g.boxH);
    ctx.strokeRect(Math.round(g.boxX)+.5,Math.round(g.boxY)+.5,
      Math.round(g.boxW),Math.round(g.boxH));
    ctx.textBaseline='top';
    ctx.fillStyle='rgba(255,255,255,0.96)';
    ctx.font='bold 10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    ctx.fillText(metadata.name,g.boxX+8,g.boxY+8);
    ctx.font='9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    ctx.fillStyle='rgba(232,235,241,0.88)';
    ctx.fillText(metadata.diameterText,g.boxX+8,g.boxY+23);
    ctx.font=(g.boxW<221?'8.3':'9')+
      'px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    ctx.fillText('ORBIT TIME: '+metadata.orbitTimeText,g.boxX+8,g.boxY+41);
    ctx.fillText('ORBIT DISTANCE: '+metadata.orbitDistanceText,
      g.boxX+8,g.boxY+54);
    ctx.fillText('MOONS: '+metadata.moonCount,g.boxX+8,g.boxY+67);
    ctx.font='9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    ctx.fillStyle='rgba(194,207,218,0.84)';
    for(let i=0;i<g.description.length;i++)
      ctx.fillText(g.description[i].toUpperCase(),
        g.boxX+8,g.boxY+86+i*12);
    ctx.restore();
  }
  window.EventHorizonPlanetInteraction=Object.freeze({
    tap,hitTest,select,clear,drawOrbit,drawCallout,info,
    calloutGeometry,get selected(){return selected},
    names:()=>Object.keys(INFO)
  });
})();