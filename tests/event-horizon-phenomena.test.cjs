'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
function environment(){
  const storage=new Map(),shell={window:{},document:{},console:{warn(){},error(){}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setTimeout:()=>0};
  for(const name of ['event-horizon/physical-system.js',
    'event-horizon/nbody-system.js','event-horizon/hero-camera.js',
    'event-horizon/planet-art.js','event-horizon/source-compositor.js',
    'event-horizon/renderer.js','event-horizon/scene-clock.js',
    'event-horizon/phenomena.js','event-horizon/planet-interaction.js'])
    vm.runInNewContext(read(name),shell,{filename:name});
  return shell.window;
}
function drawing(){
  const texts=[],strokes=[],dashes=[];
  const ctx={
    save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
    stroke(){strokes.push(this.strokeStyle)},setLineDash(x){dashes.push([...x])},
    strokeRect(){},fillRect(){},fillText(x,y,z){texts.push({text:x,x:y,y:z})},
    translate(){},rotate(){},scale(){},arc(){},fill(){},
    createRadialGradient(){return {addColorStop(){}}}
  };
  return {ctx,texts,strokes,dashes};
}
test('hyperbolic interstellar objects obey e>1 and vis-viva speeds',()=>{
  const w=environment(),e=w.EventHorizonPhenomena;
  const id=e.force('COMET',1000000),meta=e.info(id,1000000);
  assert.ok(meta&&meta.eccentricity>1&&meta.periapsisAU>0);
  const b=e.active(1000000).find(x=>x.id===id),mu=6.67430e-11*5.4*1.98847e30;
  const residual=b.speedMS**2-b.record.vinf**2-2*mu/(b.rAU*149597870700);
  assert.ok(Math.abs(residual)<.01);
  assert.equal(meta.outcome,'HYPERBOLIC ESCAPE');
  assert.equal(meta.class,'VOLATILE / ICY');
});
test('active asteroid releases intermittent reproducible ASCII outgassing particles',()=>{
  const w=environment(),e=w.EventHorizonPhenomena,scene=w.EventHorizonRebuild;
  e.force('ACTIVE ASTEROID',1000000);
  const a=drawing(),b=drawing(),c=drawing();
  const project=scene.projectedVisitor;
  const countA=e.drawObjects(a.ctx,390,690,1000000,project);
  const countB=e.drawObjects(b.ctx,390,690,1000000,project);
  const countC=e.drawObjects(c.ctx,390,690,1000000+1200,project);
  assert.ok(countA>1,'active asteroid sprays gas and dust');
  assert.equal(countA,countB);
  assert.deepEqual(a.texts,b.texts,'fixed seed and time reproduce glyph patterns');
  assert.ok(countC>0);
  assert.ok(JSON.stringify(c.texts)!==JSON.stringify(a.texts),'spray evolves');
  assert.ok(a.texts.some(x=>['.',':','*'].includes(x.text)));
});
test('tidal disruption occurs only below material-dependent Roche threshold',()=>{
  const w=environment(),e=w.EventHorizonPhenomena;
  const id=e.force('TIDAL BODY',1000000),meta=e.info(id,1000000);
  assert.ok(meta&&meta.periapsisAU<meta.disruptionAU);
  assert.equal(meta.outcome,'TIDAL FRAGMENTATION');
  const peri=e.active(1000000).find(x=>x.id===id).record.periTime;
  const frag=e.active(peri+60).find(x=>x.id===id);
  assert.ok(frag&&frag.fragmented);
  assert.ok(e.info(id,peri+60).fragmented);
});
test('visitor selection provides past and future dashed trajectory and callout',()=>{
  const w=environment(),e=w.EventHorizonPhenomena,scene=w.EventHorizonRebuild,t=1000000;
  const id=e.force('COMET',t),b=e.active(t).find(v=>v.id===id);
  const p=scene.projectedVisitor(b,390,690);
  assert.equal(e.hitTest(p.x,p.y,390,690,t,scene.projectedVisitor),id);
  const out=drawing();
  e.drawPath(out.ctx,390,690,t,scene.projectedVisitor);
  e.drawCallout(out.ctx,390,690,t,scene.projectedVisitor);
  assert.ok(out.strokes.length>=128);
  assert.ok(out.dashes.some(x=>x[0]===3&&x[1]===5));
  assert.ok(out.texts.some(x=>x.text.includes('INTERSTELLAR')));
  assert.ok(out.texts.some(x=>x.text.startsWith('SPEED:')));
  assert.ok(out.texts.some(x=>x.text.startsWith('PERIAPSIS:')));
  assert.equal(e.tap(-99,-99,390,690,t,scene.projectedVisitor),null);
  assert.equal(e.selected,null);
});
test('flare and jet preview modify gas motion without modifying light presets',()=>{
  const w=environment(),e=w.EventHorizonPhenomena;
  const before=w.EventHorizonSourceCompositor.getDefaults();
  e.trigger('FLARE',0);e.trigger('JET',0);
  const effects=e.discState(10800);
  assert.ok(effects.flare>.95);
  const sample={x:160,y:280,hole:46},point=e.motion(215,300,10800,sample);
  assert.ok(Number.isFinite(point.x+point.y));
  assert.ok(Math.hypot(point.x-215,point.y-300)>.1);
  const out=drawing(),n=e.drawTransients(out.ctx,
    {x:160,y:280,hole:46},10800,35);
  assert.ok(n>=10,'transient glyphs are actually drawn');
  assert.deepEqual(w.EventHorizonSourceCompositor.getDefaults(),before);
});
test('accelerated frequency and switches change activity without changing planet physics',()=>{
  const w=environment(),e=w.EventHorizonPhenomena,scene=w.EventHorizonRebuild;
  const period=scene.planetPeriod('VERDANT');
  assert.equal(e.modeSet('ACTIVE'),'ACTIVE');
  assert.ok(e.snapshot(100000000).mode==='ACTIVE');
  assert.equal(e.toggle(false),false);
  assert.equal(e.active(1000000).length,0);
  assert.equal(e.toggle(true),true);
  assert.equal(scene.planetPeriod('VERDANT'),period);
  assert.ok(e.active(100000000).length<=4,'bounded visitors');
});
test('main page exposes explicit test controls and visitor tracking',()=>{
  const html=read('index.html');
  for(const name of ['horizonForceComet','horizonForceAsteroid','horizonForceTidal',
    'horizonForceFlare','horizonForceJet','horizonEventVisitor',
    'horizonEncounterMode','horizonEncounterEnabled'])
    assert.ok(html.includes('id="'+name+'"'),name);
  assert.ok(html.includes('src="./event-horizon/phenomena.js?v=20261121a"'));
  assert.ok(html.includes('horizonPhenomena?.hitTest?.('));
  assert.ok(html.includes('horizonPhenomena?.clear?.()'));
  assert.ok(!html.includes('src="./preview/event-horizon/phenomena.js"'));
});