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
  function info(name){
    const p=INFO[name];
    return p?Object.freeze({...p,name,
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
  function clear(){selected=null;}
  function strokeSegment(ctx,a,b,opacity,shade=255){
    if(!a||!b||!Number.isFinite(a.x+a.y+b.x+b.y))return;
    ctx.strokeStyle='rgba('+shade+','+shade+','+shade+','+
      clamp(opacity,0,1).toFixed(3)+')';
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  function drawOrbit(ctx,width,height,time){
    if(!selected)return;
    const periodSec=period(selected);
    if(!(periodSec>0))return;
    const sceneNow=scene();
    if(!sceneNow?.projectedPlanet||typeof ctx.setLineDash!=='function')return;
    // Trace the true *currently rendered* illustrative orbit (including the
    // perspective-foreshortened VERDANT orbit). No invented circle/ellipse.
    const SAMPLES=192,points=[];
    for(let i=0;i<=SAMPLES;i++)
      points.push(sceneNow.projectedPlanet(selected,periodSec*i/SAMPLES,width,height));
    ctx.save();
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.lineWidth=1;ctx.setLineDash([4,6]);
    ctx.lineCap='butt';ctx.strokeStyle='rgba(187,192,200,0.31)';
    ctx.beginPath();
    for(let i=0;i<points.length;i++){
      const p=points[i];if(!p)continue;
      if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();

    // Recently traversed 62% of this path fades from white at the planet
    // back to grey. Draw 48 small dashed segments for a travelling gradient.
    const TRAIL_SEGMENTS=48,TRAIL_FRACTION=.62;
    let previous=sceneNow.projectedPlanet(
      selected,time-periodSec*TRAIL_FRACTION,width,height);
    ctx.setLineDash([4,6]);
    for(let i=1;i<=TRAIL_SEGMENTS;i++){
      const fraction=i/TRAIL_SEGMENTS;
      const at=time-periodSec*TRAIL_FRACTION*(1-fraction);
      const next=sceneNow.projectedPlanet(selected,at,width,height);
      const intensity=Math.pow(fraction,1.6);
      strokeSegment(ctx,previous,next,.13+.81*intensity,
        Math.round(176+79*intensity));
      previous=next;
    }
    // Direction-of-travel cue: the short forward arc is bright white.
    // The longer fading tail above indicates distance just covered.
    ctx.setLineDash([4,6]);
    const FORWARD=14,forwardFraction=.115;
    previous=sceneNow.projectedPlanet(selected,time,width,height);
    for(let i=1;i<=FORWARD;i++){
      const next=sceneNow.projectedPlanet(
        selected,time+periodSec*forwardFraction*i/FORWARD,width,height);
      strokeSegment(ctx,previous,next,.94-.33*i/FORWARD,255);
      previous=next;
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
    const ringMultiplier=profile?.rings?(profile.rings==='thin'?1.88:2.27):1;
    const extent=pos.radius*ringMultiplier+5;
    const margin=8;
    const boxW=Math.min(230,Math.max(145,w-2*margin));
    const descriptor=info(name);
    const limit=Math.max(13,Math.floor((boxW-18)/(9*.60)));
    const description=wrap(descriptor?.description||'',limit,3);
    const boxH=45+12*description.length;
    const right=(w-(pos.x+extent))>=(pos.x-extent);
    const direction=right?1:-1;
    const below=pos.y<h*.43;
    const vertical=below?1:-1;
    const startX=pos.x+direction*extent;
    const startY=pos.y+vertical*Math.min(extent*.25,12);
    const elbowDistance=Math.max(22,Math.min(40,extent*.3+18));
    const elbowX=startX+direction*elbowDistance;
    const elbowY=startY+vertical*elbowDistance;
    const proposedX=right?elbowX+12:elbowX-12-boxW;
    const boxX=clamp(proposedX,margin,Math.max(margin,w-boxW-margin));
    const boxY=clamp(elbowY-boxH*.25,margin,Math.max(margin,h-boxH-margin));
    const entryX=right?boxX:boxX+boxW;
    const entryY=clamp(elbowY,boxY+8,boxY+boxH-8);
    return {extent,startX,startY,elbowX,elbowY,entryX,entryY,
      boxX,boxY,boxW,boxH,description,side:direction};
  }
  function drawCallout(ctx,width,height,time){
    if(!selected)return;
    const pos=current(selected,time,width,height);
    if(!visible(pos,width,height))return;
    const metadata=info(selected);
    if(!metadata)return;
    const g=calloutGeometry(pos,width,height,selected);
    ctx.save();
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.shadowBlur=0;ctx.lineWidth=1;ctx.setLineDash([]);
    ctx.strokeStyle='rgba(255,255,255,0.93)';
    // Crisp, square planet highlight. Ringed planets include their rings.
    ctx.strokeRect(Math.round(pos.x-g.extent)+.5,
      Math.round(pos.y-g.extent)+.5,
      Math.round(g.extent*2),Math.round(g.extent*2));
    ctx.beginPath();
    ctx.moveTo(g.startX,g.startY);
    ctx.lineTo(g.elbowX,g.elbowY);  // 45° diagonal
    ctx.lineTo(g.entryX,g.elbowY); // short horizontal connector
    ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,0.82)';
    ctx.fillRect(g.boxX,g.boxY,g.boxW,g.boxH);
    ctx.strokeRect(Math.round(g.boxX)+.5,Math.round(g.boxY)+.5,
      Math.round(g.boxW),Math.round(g.boxH));
    ctx.textBaseline='top';
    ctx.fillStyle='rgba(255,255,255,0.96)';
    ctx.font='bold 10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    ctx.fillText(metadata.name,g.boxX+8,g.boxY+7);
    ctx.font='9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    ctx.fillStyle='rgba(232,235,241,0.88)';
    ctx.fillText(metadata.diameterText,g.boxX+8,g.boxY+22);
    ctx.fillStyle='rgba(194,207,218,0.84)';
    for(let i=0;i<g.description.length;i++)
      ctx.fillText(g.description[i].toUpperCase(),g.boxX+8,g.boxY+39+i*12);
    ctx.restore();
  }
  window.EventHorizonPlanetInteraction=Object.freeze({
    tap,hitTest,clear,drawOrbit,drawCallout,info,
    calloutGeometry,get selected(){return selected},
    names:()=>Object.keys(INFO)
  });
})();