'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'event-horizon/scene-clock.js'),'utf8');
const physicsSource=fs.readFileSync(path.join(root,'event-horizon/physical-system.js'),'utf8');
const cameraSource=fs.readFileSync(path.join(root,'event-horizon/hero-camera.js'),'utf8');
const artSource=fs.readFileSync(path.join(root,'event-horizon/planet-art.js'),'utf8');
const rendererSource=fs.readFileSync(path.join(root,'event-horizon/renderer.js'),'utf8');
function make(sharedStore=new Map()){
  const localStorage={getItem:k=>sharedStore.get(k)||null,setItem:(k,v)=>sharedStore.set(k,v)};
  const shell={window:{},localStorage,console:{warn(){},error(){}},document:{}};
  for(const source of [physicsSource,cameraSource,artSource,rendererSource])
    vm.runInNewContext(source,shell);
  vm.runInNewContext(script,shell);
  return{clock:shell.window.EventHorizonSceneClock,store:sharedStore,shell};
}
const T0=Date.parse('2026-11-19T17:00:00Z');
test('WALL default is 5x and VERDANT takes roughly a real fortnight',()=>{
  const {clock}=make();
  const x=clock.reset(T0);
  assert.equal(x.mode,'WALL');
  assert.equal(x.rate,5);
  assert.ok(x.periodRealDays>12&&x.periodRealDays<14);
  const future=clock.snapshot(T0+86400*1000);
  assert.ok(Math.abs(future.simDays-5)<1e-9);
  assert.equal(future.visualTime,clock.visualTime(T0+86400*1000));
});
test('speed presets and custom values preserve the exact simulation time',()=>{
  const {clock}=make();
  clock.reset(T0);
  const at=T0+13*1000,before=clock.snapshot(at).simSeconds;
  clock.setMode('REAL',at);
  assert.equal(clock.snapshot(at).simSeconds,before);
  clock.setMode('FAST',at);
  assert.equal(clock.snapshot(at).rate,100);
  clock.setMode('TEST',at);
  assert.equal(clock.snapshot(at).rate,1440);
  clock.setMode('DEMO',at);
  assert.equal(clock.snapshot(at).rate,86400);
  clock.setRate(35.25,at);
  assert.equal(clock.snapshot(at).rate,35.25);
  assert.equal(clock.snapshot(at).mode,'CUSTOM');
  assert.ok(Math.abs(clock.snapshot(at).simSeconds-before)<1e-9);
  assert.throws(()=>clock.setRate(-1),RangeError);
  assert.throws(()=>clock.setRate(1000001),RangeError);
  assert.throws(()=>clock.setMode('BAD'),RangeError);
});
test('pause, resume and jump to next event update the persisted clock',()=>{
  const store=new Map(),{clock}=make(store);
  clock.reset(T0);clock.setPaused(true,T0+1000);
  const a=clock.snapshot(T0+1000),b=clock.snapshot(T0+500000);
  assert.equal(a.simSeconds,b.simSeconds);
  assert.equal(clock.nextPass(T0+500000).realTimeISO,null);
  clock.setPaused(false,T0+500000);
  const c=clock.snapshot(T0+501000);
  assert.ok(c.simSeconds>b.simSeconds);
  const pass=clock.nextPass(T0+501000);
  assert.ok(pass.realSecondsUntil>0);
  const arrived=clock.jumpToNextPass(T0+501000);
  assert.ok(arrived.simSeconds>c.simSeconds);
  assert.ok(Math.abs(arrived.visualTime-pass.nextVisualTime)<1e-8);
  const restored=make(store).clock.snapshot(T0+501000);
  assert.ok(Math.abs(restored.simSeconds-arrived.simSeconds)<1e-7);
});
test('render time for fast gas animation is independent of slow orbit time',()=>{
  const {shell,clock}=make();
  const realNow=Date.now();clock.reset(realNow);
  const horizon=shell.window.EventHorizonRebuild;
  const events=[];
  shell.window.EventHorizonPlanetArt={
    draw(ctx,planet,pos,view,time){
      events.push({name:planet.name,x:pos.x,y:pos.y,animationTime:time});return true;
    },
    resetDiagnostics(){}
  };
  shell.window.EventHorizonSourceCompositor.draw=()=>true;
  shell.window.EventHorizonSourceCompositor.needsFrame=()=>false;
  const ctx={save(){},restore(){},fillText(){},fillRect(){},beginPath(){},arc(){},fill(){},
    translate(){},rotate(){},scale(){},
    createRadialGradient(){return{addColorStop(){}}}};
  horizon.draw(ctx,440,736,20,null,true);
  const p1=events.find(v=>v.name==='VERDANT');events.length=0;
  clock.setMode('DEMO',realNow);
  // Render continues using 20 seconds of local animation time in both frames,
  // but orbital wall time has moved ahead via an explicit clock change.
  clock.jumpToNextPass(realNow);
  horizon.draw(ctx,440,736,20,null,true);
  const p2=events.find(v=>v.name==='VERDANT');
  assert.equal(p1.animationTime,20);
  assert.equal(p2.animationTime,20);
  assert.ok(Math.hypot(p1.x-p2.x,p1.y-p2.y)>20,'planet moves without time-jumping the gas');
});
test('main-page astronomy DEV exists without replacing environmental DEV',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/id="horizonDevPanel"/);
  assert.match(html,/id="horizonClockMode"/);
  assert.match(html,/id="horizonCustomRate"/);
  assert.match(html,/id="horizonClockPause"/);
  assert.match(html,/id="horizonJumpPass"/);
  assert.match(html,/id="horizonClockReset"/);
  assert.match(html,/id="horizonPassETA"/);
  assert.match(html,/id="horizonBodies"/);
  assert.match(html,/devToggle\.style\.display=''/);
  assert.match(html,/const cosmos=currentScene==='event-horizon';/);
  assert.match(html,/id="devTabWeather"/);
  assert.match(html,/id="devTabLife"/);
  assert.match(html,/id="devTabSense"/);
  assert.doesNotMatch(html,/src="\.\/preview\/event-horizon\//);
});
