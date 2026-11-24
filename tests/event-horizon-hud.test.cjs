'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const modules=['event-horizon/physical-system.js','event-horizon/nbody-system.js','event-horizon/hero-camera.js',
  'event-horizon/planet-art.js','event-horizon/source-compositor.js',
  'event-horizon/renderer.js','event-horizon/scene-clock.js',
  'event-horizon/phenomena.js','event-horizon/event-forecast.js','event-horizon/planet-interaction.js'];
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
test('fullscreen HUD has the approved astronomy accordion and Halcyon observer state',()=>{
  const html=read('index.html');
  assert.match(html,/id="horizonEvents"[^>]*data-open="false" hidden/);
  assert.match(html,/id="horizonPlanets"[^>]*data-open="false" hidden/);
  assert.match(html,/id="horizonPlanetsToggle"[^>]*aria-expanded="false"/);
  assert.match(html,/id="horizonPlanetList"/);
  assert.match(html,/\.hud\.bottom-left\.horizon-mode\{display:flex;flex-direction:column/);
  assert.match(html,/\.horizon-planet-list\{[\s\S]*?background:transparent\}/);
  assert.match(html,/document\.getElementById\('bottomLeftStatus'\)\.textContent=/);
  assert.match(html,/id="horizonEventsToggle"[^>]*aria-expanded="false"/);
  assert.match(html,/\+ ASTRONOMICAL EVENTS/);
  assert.match(html,/id="horizonEventApproach"/);
  assert.match(html,/id="horizonEventAlignment"/);
  assert.match(html,/id="horizonEventAccretion"/);
  assert.match(html,/VERDANT NEXT APPROACH:/);
  assert.match(html,/NEXT PAIR CONJUNCTION:/);
  assert.match(html,/NEXT DISC VIEW PASS:/);
  assert.match(html,/\.horizon-event-list\{max-height:0;opacity:0/);
  assert.match(html,/transition:max-height \.32s ease,opacity \.26s ease/);
  assert.match(html,/text-decoration:none/);
  assert.match(html,/ASCII: /);
  assert.match(html,/REAL TIME X /);
  assert.match(html,/ORBITAL DYNAMICS/);
  assert.match(html,/GW-003 <strong>\/ NO FEED<\/strong>/);
  assert.match(html,/SIGNAL OFFLINE/);
  assert.match(html,/ACTIVE DISC TRANSIT:/);
  assert.match(html,/horizon-event-line\.active-transit/);
  assert.match(html,/CHANGE FEED/);
  assert.match(html,/Unauthorised access, admin only/);
  assert.match(html,/statusTop-12/);
  assert.match(html,/command==='DEV'/);
  assert.match(html,/MEDUSA <strong>ASTRALIS<\/strong>/);
  assert.doesNotMatch(html,/src="\.\/preview\/event-horizon\//);
  for(const name of ['event-horizon/nbody-system.js?v=2026112102','event-horizon/renderer.js?v=20261121e','event-horizon/phenomena.js?v=20261121b','event-horizon/event-forecast.js?v=20261124a','event-horizon/planet-interaction.js?v=2026112102'])
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
test('active transit has a foreground planet and a modelled exit, including crossing the central shadow',()=>{
  const {world:w}=world(),clock=w.EventHorizonSceneClock,forecast=w.EventHorizonEventForecast;
  clock.reset(T0);
  const viewCam=w.EventHorizonRebuild.camera(440,736);
  const view={camera:viewCam,hole:45.76*viewCam.scale,width:440,height:736};
  const centre={name:'TEST',x:viewCam.cx,y:viewCam.cy,radius:5,depth:-.5};
  assert.equal(forecast.discPresence(centre,view),true,
    'crossing over the black-hole shadow must not interrupt the transit');
  const next=forecast.nextAccretionVisual(clock.snapshot(T0).visualTime,440,736);
  assert.ok(next);
  const ongoing=forecast.activeAccretionVisual(next.visualTime+1,440,736);
  assert.ok(ongoing,'newly entering planet should produce an active transit');
  assert.equal(ongoing.name,next.name);
  assert.ok(Number.isFinite(ongoing.exitVisualTime)&&
    ongoing.exitVisualTime>next.visualTime);
  const departed=w.EventHorizonRebuild.state(ongoing.exitVisualTime+1,440,736)
    .planets.find(p=>p.name===ongoing.name);
  assert.equal(forecast.discPresence(departed,view),false);
});
test('N-body barycentric conjunction is computed, not fabricated',()=>{
  const {world:w}=world(),clock=w.EventHorizonSceneClock,forecast=w.EventHorizonEventForecast;
  clock.reset(T0);
  const start=clock.snapshot(T0).visualTime;
  const event=forecast.nextConjunctionVisual(start,365);
  assert.ok(event&&event.visualTime>start);
  assert.match(event.name,/^[A-Z]+ \/ [A-Z]+$/);
  assert.equal(event.event,'barycentric longitude conjunction');
  const epochSeconds=event.visualTime;
  const p=w.EventHorizonNBody.stateAtSeconds(epochSeconds).slice(2);
  const [first,second]=event.name.split(' / ').map(n=>p.find(body=>body.name===n));
  const d=Math.atan2(Math.sin(Math.atan2(first.y,first.x)-
    Math.atan2(second.y,second.x)),
    Math.cos(Math.atan2(first.y,first.x)-Math.atan2(second.y,second.x)));
  assert.ok(Math.abs(d)<.001,'true integrated longitude conjunction');
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
