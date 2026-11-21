'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function model(){
  const storage=new Map(),tasks=[];
  const shell={window:{},console:{warn(){}},document:{},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setTimeout:fn=>{tasks.push(fn);return tasks.length}};
  for(const file of ['event-horizon/physical-system.js',
    'event-horizon/nbody-system.js','event-horizon/hero-camera.js',
    'event-horizon/planet-art.js','event-horizon/source-compositor.js',
    'event-horizon/renderer.js','event-horizon/scene-clock.js',
    'event-horizon/event-forecast.js','event-horizon/planet-interaction.js'])
    vm.runInNewContext(read(file),shell,{filename:file});
  return shell.window;
}
test('ten gravitational bodies use real units, specified masses and physical orbital periods',()=>{
  const w=model(),n=w.EventHorizonNBody,p=w.EventHorizonPhysicalSystem;
  assert.equal(n.names.length,10);
  assert.equal(n.ELEMENTS.length,8);
  assert.equal(n.donorMassLossTimescaleYears,400000000);
  assert.ok(n.ELEMENTS.every(x=>x.massSolar>0&&x.e>=0&&x.e<1&&x.inclinationDeg>0));
  assert.ok(Math.abs(p.binary.periodSeconds/3600-3.7723)<.001);
  for(const planet of p.plannedPlanets){
    const days=w.EventHorizonRebuild.planetPeriod(planet.name)/86400;
    assert.ok(Math.abs(days-planet.keplerPeriodDays)<1e-9);
    assert.ok(n.estimate(planet.name).orbitDistanceMiles>100000000);
  }
  assert.equal(w.EventHorizonSceneClock.snapshot().orbitToPhysicalRatio,1);
});
test('osculating 3D ellipse starts at integrated body position and closes',()=>{
  const n=model().EventHorizonNBody,at=5*86400;
  for(const e of n.ELEMENTS){
    const trueBody=n.position(e.name,at),osc=n.osculating(e.name,at);
    assert.ok(osc&&osc.periodSeconds>0);
    const start=osc.point(0),end=osc.point(osc.periodSeconds);
    assert.ok(Math.hypot(start.x-trueBody.x,start.y-trueBody.y,
      start.z-trueBody.z)<1e-9,e.name+' starts on integrated state');
    assert.ok(Math.hypot(start.x-end.x,start.y-end.y,start.z-end.z)<1e-9);
  }
});
test('one simulated year conserves ten-body energy within a strict bound',()=>{
  const n=model().EventHorizonNBody;
  const start=n.energyAt(0).total,end=n.energyAt(365.25*86400).total;
  const error=Math.abs((end-start)/start);
  assert.ok(error<.0002,'relative energy drift: '+error);
});
test('donor and planets share numeric orbit clock and nine interactive bodies',()=>{
  const w=model(),scene=w.EventHorizonRebuild,ui=w.EventHorizonPlanetInteraction;
  const t=86400;
  assert.equal(scene.projectedPlanets(t,390,690).length,8);
  assert.equal(scene.projectedBodies(t,390,690).length,9);
  const donor=scene.projectedPlanet('DONOR_STAR',t,390,690);
  assert.ok(donor&&Number.isFinite(donor.x+donor.y));
  assert.equal(ui.hitTest(donor.x,donor.y,390,690,t),'DONOR_STAR');
  assert.match(ui.info('DONOR_STAR').transferText,/1\.0E-9/);
  assert.equal(ui.info('DONOR_STAR').massLossText,'400M YEARS AT CONSTANT RATE');
});
test('model-derived conjunction converges on a real numerical longitude crossing',()=>{
  const w=model(),fc=w.EventHorizonEventForecast;
  const event=fc.nextConjunctionVisual(0);
  assert.ok(event&&event.visualTime>0);
  const [first,second]=event.name.split(' / ');
  const a=w.EventHorizonNBody.position(first,event.visualTime);
  const b=w.EventHorizonNBody.position(second,event.visualTime);
  const angle=Math.atan2(Math.sin(Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x)),
    Math.cos(Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x)));
  assert.ok(Math.abs(angle)<1e-3,'model longitudes coincide');
});
test('event dates change inversely with speed and pause hides wall-time predictions',()=>{
  const w=model(),clock=w.EventHorizonSceneClock,fc=w.EventHorizonEventForecast;
  const now=Date.parse('2026-11-21T00:30:00.000Z');
  clock.reset(now);
  const event=fc.nextConjunctionVisual(clock.visualTime(now));
  clock.setMode('REAL',now);
  const d1=Date.parse(fc.wallDate(event.visualTime,now))-now;
  clock.setMode('WALL',now);
  const d5=Date.parse(fc.wallDate(event.visualTime,now))-now;
  clock.setMode('FAST',now);
  const d100=Date.parse(fc.wallDate(event.visualTime,now))-now;
  assert.ok(Math.abs(d1-5*d5)<6,'5x speed timing');
  assert.ok(Math.abs(d1-100*d100)<100,'100x speed timing');
  clock.setPaused(true,now);
  assert.equal(fc.wallDate(event.visualTime,now),null);
});