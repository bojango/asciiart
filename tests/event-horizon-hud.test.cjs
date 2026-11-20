'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const modules=['event-horizon/physical-system.js','event-horizon/hero-camera.js',
  'event-horizon/planet-art.js','event-horizon/source-compositor.js',
  'event-horizon/renderer.js','event-horizon/scene-clock.js',
  'event-horizon/event-forecast.js','event-horizon/planet-interaction.js'];
const T0=Date.parse('2026-11-20T18:00:00Z');
function world(){
  const tasks=[],storage=new Map(),shell={
    window:{},document:{},console:{warn(){},error(){}},
    setTimeout:fn=>{tasks.push(fn);return tasks.length},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}
  };
  for(const file of modules)vm.runInNewContext(read(file),shell,{filename:file});
  return {shell,world:shell.window,tasks,storage};
}
test('fullscreen HUD has the approved collapsed astronomy accordion and original other-scene text',()=>{
  const html=read('index.html');
  assert.match(html,/id="horizonEvents"[^>]*data-open="false" hidden/);
  assert.match(html,/id="horizonEventsToggle"[^>]*aria-expanded="false"/);
  assert.match(html,/\+ ASTRONOMICAL EVENTS/);
  assert.match(html,/id="horizonEventApproach"/);
  assert.match(html,/id="horizonEventAlignment"/);
  assert.match(html,/id="horizonEventAccretion"/);
  assert.match(html,/VERDANT NEXT APPROACH:/);
  assert.match(html,/NEXT ALIGNMENT:/);
  assert.match(html,/NEXT ACCRETION PASSING:/);
  assert.match(html,/\.horizon-event-list\{max-height:0;opacity:0/);
  assert.match(html,/transition:max-height \.32s ease,opacity \.26s ease/);
  assert.match(html,/text-decoration:none/);
  assert.match(html,/ASCII: /);
  assert.match(html,/REAL TIME X /);
  assert.match(html,/ORBITAL DYNAMICS/);
  assert.match(html,/THE <strong>OLD GROVE<\/strong>/);
  assert.match(html,/MEDUSA <strong>ASTRALIS<\/strong>/);
  assert.doesNotMatch(html,/src="\.\/preview\/event-horizon\//);
  for(const name of ['event-horizon/renderer.js?v=4','event-horizon/event-forecast.js?v=1','event-horizon/planet-interaction.js?v=1'])
    assert.ok(html.includes('src="./'+name+'"'));
});
test('renderer counts stars, orbit hints, planetary glyphs and actual cached disc source glyphs',()=>{
  const {world:w}=world(),scene=w.EventHorizonRebuild,precise=w.EventHorizonSourceCompositor;
  precise.needsFrame=()=>false;precise.draw=()=>true;
  precise.stats=()=>({totalGlyphs:750});
  const ctx={fillStyle:'',font:'',textBaseline:'',globalAlpha:1,globalCompositeOperation:'source-over',
    shadowBlur:0,save(){},restore(){},translate(){},rotate(){},scale(){},
    beginPath(){},arc(){},fill(){},fillText(){},fillRect(){},
    createRadialGradient(){return {addColorStop(){}}}};
  scene.draw(ctx,440,736,14,null,true);
  const stats=scene.diagnostics(),parts=stats.asciiBreakdown;
  assert.ok(parts.stars>70&&parts.stars<130);
  assert.ok(parts.hints>0);
  assert.ok(parts.planets>50);
  assert.equal(parts.gas,750);
  assert.equal(stats.asciiCount,parts.stars+parts.hints+parts.planets+parts.gas);
  assert.ok(stats.asciiCount>900);
});
test('next disc passing is a future foreground entry into the projected luminous disc',()=>{
  const {world:w}=world(),clock=w.EventHorizonSceneClock,forecast=w.EventHorizonEventForecast;
  clock.reset(T0);
  const start=clock.snapshot(T0).visualTime;
  const hit=forecast.nextAccretionVisual(start,440,736);
  assert.ok(hit&&hit.visualTime>start,'a future crossing exists within the scan');
  assert.equal(hit.physicallyPredicted,false);
  const body=w.EventHorizonRebuild.state(hit.visualTime+.0001,440,736)
    .planets.find(p=>p.name===hit.name);
  const viewCam=w.EventHorizonRebuild.camera(440,736);
  const view={camera:viewCam,hole:45.76*viewCam.scale,width:440,height:736};
  assert.ok(body.depth<=0&&forecast.discPresence(body,view));
  const stamp=forecast.wallDate(hit.visualTime,T0);
  assert.ok(stamp&&Date.parse(stamp)>T0);
});
test('rare all-eight centre-line alignment is searched, never assigned an invented date',()=>{
  const {world:w,tasks}=world(),clock=w.EventHorizonSceneClock,forecast=w.EventHorizonEventForecast;
  clock.reset(T0);
  let result='pending';
  forecast.searchAlignmentAsync(clock.snapshot(T0).visualTime,440,736,x=>{result=x});
  let jobs=0;
  while(tasks.length){tasks.shift()();if(++jobs>100)throw Error('unbounded event search')}
  assert.equal(result,null,'no verified all-eight centre alignment in ten illustrative years');
  assert.equal(forecast.MAX_ALIGNMENT_YEARS,10);
});
test('changing clock speeds updates calendar forecasts; pausing suppresses real dates',()=>{
  const {world:w}=world(),clock=w.EventHorizonSceneClock,forecast=w.EventHorizonEventForecast;
  clock.reset(T0);
  const pass=clock.nextPass(T0),wall=Date.parse(pass.realTimeISO);
  clock.setMode('FAST',T0);
  const quick=Date.parse(clock.nextPass(T0).realTimeISO);
  assert.ok(quick>T0&&quick<wall);
  const visual=forecast.nextAccretionVisual(clock.snapshot(T0).visualTime,440,736);
  assert.ok(forecast.wallDate(visual.visualTime,T0));
  clock.setPaused(true,T0);
  assert.equal(forecast.wallDate(visual.visualTime,T0),null);
  assert.equal(clock.nextPass(T0).realTimeISO,null);
});
