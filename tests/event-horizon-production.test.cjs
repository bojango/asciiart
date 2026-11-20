'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const original=read('event-horizon.js');
const modules=[
  'event-horizon/source-compositor.js',
  'event-horizon/hero-camera.js',
  'event-horizon/planet-art.js',
  'event-horizon/physical-system.js',
  'event-horizon/renderer.js',
  'event-horizon/scene-clock.js',
  'event-horizon/event-forecast.js',
  'event-horizon/planet-interaction.js'
];
function makeShell(full=true){
  const shell={window:{},document:{},console:{warn(){}},Math};
  vm.runInNewContext(original,shell,{filename:'event-horizon.js'});
  const baseline=shell.window.PelagicEventHorizon;
  const list=full?modules:['event-horizon/renderer.js'];
  for(const file of list)vm.runInNewContext(read(file),shell,{filename:file});
  return {shell,baseline,horizon:shell.window.PelagicEventHorizon};
}

test('original production UI remains in place and loads no preview controls',()=>{
  const html=read('index.html');
  assert.match(html,/class="app"/);
  assert.match(html,/id="sceneToggle"/);
  assert.match(html,/id="color"/);
  assert.match(html,/id="density"/);
  assert.match(html,/id="speed"/);
  assert.match(html,/id="expandArt"/);
  assert.match(html,/id="codeInner"/);
  assert.match(html,/id="devPanel"/);
  assert.match(html,/const sceneOrder=\['pelagic','greenwood','event-horizon'\]/);
  assert.match(html,/horizon\.draw\(ctx,width,height,time,null,highRes\)/);
  for(const file of modules){
    const version=file==='event-horizon/renderer.js'?'4':'1';
    assert.ok(html.includes('src="./'+file+'?v='+version+'"'),file+' included on main page');
  }
  for(const forbidden of ['preview/event-horizon/','tuneToggle','jumpPass','sceneMenuToggle',
    'LIGHT STUDIO','VIEW PASS','ILLUSTRATIVE ORBIT'])
    assert.ok(!html.includes(forbidden),'experimental control excluded: '+forbidden);
  assert.ok(html.indexOf('src="./event-horizon.js?v=20261119"')<
    html.indexOf('src="./event-horizon/renderer.js?v=4"'),
    'baseline loaded before optional enhancement');
});

test('enhanced renderer takes original window.PelagicEventHorizon interface',()=>{
  const {shell,baseline,horizon}=makeShell();
  assert.notEqual(horizon,baseline);
  assert.equal(horizon,shell.window.EventHorizonRebuild);
  assert.equal(typeof horizon.draw,'function');
  assert.equal(typeof horizon.source,'function');
  assert.equal(typeof horizon.state,'function');
  assert.equal(horizon.palette,'EMBER');
  assert.equal(horizon.cyclePalette(),'ION');
  assert.equal(horizon.cyclePalette(),'SOLSTICE');
  assert.equal(horizon.cyclePalette(),'EMBER');
  assert.equal(horizon.state(0,440,736).planets.length,8);
  const t=horizon.nextHeroPass(0),p=horizon.heroAt(t,440,736);
  assert.equal(p.name,'VERDANT');
  assert.ok(p.radius>126&&p.radius<131);
  assert.equal(p.heroLOD,'CLOSE');
  assert.match(horizon.source(),/orbitPosition/);
});

test('all 14 approved light values are intact and separate from main UI',()=>{
  const {shell}=makeShell();
  const light=shell.window.EventHorizonSourceCompositor.getDefaults();
  const approved={
    brightness:2,coreExposure:3.85,coreBloomStrength:3.45,
    coreBloomRadius:2.25,coreThreshold:.8,coreWhiteLift:.8,
    warmth:1.7,saturation:1.15,gamma:1,contrast:.9,
    highlightRolloff:.2,bloomStrength:2,bloomRadiusSmall:1.05,bloomRadiusWide:1.8
  };
  assert.equal(Object.keys(light).length,14);
  assert.deepEqual(JSON.parse(JSON.stringify(light)),approved);
  assert.deepEqual(JSON.parse(JSON.stringify(
    shell.window.EventHorizonSourceCompositor.getParams())),approved);
});

test('hidden binary module is loaded but never shown as a body',()=>{
  const {shell,horizon}=makeShell(),model=shell.window.EventHorizonPhysicalSystem;
  assert.ok(model);
  assert.equal(model.blackHole.massSolar,5);
  assert.equal(model.companion.massSolar,.4);
  assert.equal(model.companion.visible,false);
  assert.equal(model.accretion.visible,false);
  assert.equal(model.plannedPlanets.length,8);
  assert.ok(Math.abs(model.binary.periodSeconds/3600-3.7723)<.001);
  assert.ok(Math.abs(model.companion.rocheFillFactor-1)<.003);
  assert.equal(model.metadata.visualIntegration,false);
  assert.equal(model.metadata.eventClockIntegrated,false);
  assert.equal(shell.window.EventHorizonSceneClock.snapshot().mode,'WALL');
  assert.ok(horizon.state(0,440,736).planets[2].period!==
    model.plannedPlanets[2].keplerPeriodSeconds,
    'physical periods not falsely passed off as already-integrated visual orbits');
});

test('new modules gracefully preserve original renderer when a dependency is missing',()=>{
  const {baseline,horizon}=makeShell(false);
  assert.equal(horizon,baseline);
  assert.equal(horizon.state(0).planets.length,8);
});

test('main scene draws opaque planets and matte before source RGB at varied sizes',()=>{
  const {shell,horizon}=makeShell();
  const events=[];
  shell.window.EventHorizonSourceCompositor.needsFrame=()=>false;
  shell.window.EventHorizonSourceCompositor.draw=()=>{events.push('RGB');return true};
  let saves=0,restores=0;
  const ctx={
    fillStyle:'',font:'',globalAlpha:1,globalCompositeOperation:'source-over',
    textBaseline:'',shadowBlur:0,save(){saves++},restore(){restores++},
    translate(){},rotate(){},scale(){},fillRect(){},
    beginPath(){},arc(x,y,r){assert.ok(Number.isFinite(x+y+r))},
    fill(){if(this.fillStyle==='#010102')events.push('BODY')},
    fillText(char,x,y){assert.equal(typeof char,'string');assert.ok(Number.isFinite(x+y))},
    createRadialGradient(){events.push('MATTE');return{addColorStop(){}}}
  };
  for(const [w,h] of [[320,500],[390,550],[440,736],[844,390]]){
    events.length=0;
    horizon.draw(ctx,w,h,horizon.nextHeroPass(0),null,true);
    const matte=events.indexOf('MATTE'),rgb=events.indexOf('RGB');
    assert.ok(matte>=0&&rgb>matte,'matte under RGB');
    assert.ok(events.slice(0,matte).includes('BODY'),'rear planets drawn');
    assert.ok(events.slice(rgb+1).includes('BODY'),'front planets drawn');
  }
  assert.equal(saves,restores,'canvas state balanced');
});
