'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function environment(){
  const w={},shell={window:w,document:{},console:{warn(){},error(){}}};
  for(const file of ['event-horizon/physical-system.js','event-horizon/nbody-system.js',
      'event-horizon/hero-camera.js','event-horizon/planet-art.js',
      'event-horizon/source-compositor.js','event-horizon/renderer.js',
      'event-horizon/planet-interaction.js'])
    vm.runInNewContext(read(file),shell,{filename:file});
  return {w,scene:w.EventHorizonRebuild,ui:w.EventHorizonPlanetInteraction};
}
function context(){
  const actions=[];
  let saves=0,restores=0;
  const ctx={fillStyle:'',font:'',strokeStyle:'',lineWidth:1,
    globalAlpha:1,globalCompositeOperation:'source-over',textBaseline:'',shadowBlur:0,
    save(){saves++;actions.push({type:'save'})},
    restore(){restores++;actions.push({type:'restore'})},
    setLineDash(dash){actions.push({type:'dash',dash:[...dash]})},
    beginPath(){actions.push({type:'beginPath'})},
    moveTo(x,y){assert.ok(Number.isFinite(x+y));actions.push({type:'move',x,y})},
    lineTo(x,y){assert.ok(Number.isFinite(x+y));actions.push({type:'line',x,y})},
    stroke(){actions.push({type:'stroke',style:this.strokeStyle,width:this.lineWidth})},
    strokeRect(x,y,w,h){actions.push({type:'strokeRect',x,y,w,h,width:this.lineWidth})},
    fillRect(x,y,w,h){actions.push({type:'fillRect',x,y,w,h})},
    fillText(text,x,y){assert.ok(Number.isFinite(x+y));actions.push({type:'text',text,x,y})},
    translate(){},rotate(){},scale(){},arc(){},fill(){},
    createRadialGradient(){return{addColorStop(){}}}
  };
  return {ctx,actions,getBalance:()=>saves-restores};
}
test('all eight bodies have distinct plausible fictional sizes and concise surface descriptions',()=>{
  const {ui,scene}=environment();
  const expected=['CINDER','SILEX','VERDANT','RUST','ATLAS','HALO','AZURE','UMBRA'];
  assert.deepEqual(Array.from(ui.names()),[...expected,'DONOR_STAR']);
  for(const name of expected){
    const meta=ui.info(name),p=scene.projectedPlanet(name,0,440,736);
    assert.ok(meta&&p&&meta.diameterKm>9000&&meta.diameterKm<160000);
    assert.ok(meta.diameterText.includes('KM DIAMETER'));
    assert.ok(meta.description.length>=35&&meta.description.length<100);
  }
  assert.match(ui.info('VERDANT').description,/oceans.*continents.*cloud/i);
  assert.match(ui.info('ATLAS').description,/ring/i);
  assert.match(ui.info('HALO').description,/rings/i);
  assert.match(ui.info('AZURE').description,/methane/i);
});
test('tap hits the actual projected planet and toggles selected/empty states',()=>{
  const {scene,ui}=environment();
  for(const [w,h,t] of [[390,690,0],[440,736,200],[844,390,81]]){
    const ps=scene.projectedPlanets(t,w,h);
    assert.equal(ps.length,8);
    assert.ok(ps.every(p=>p.radius>0&&Number.isFinite(p.x+p.y+p.radius)));
    for(const p of ps.filter(p=>p.x>20&&p.x<w-20&&p.y>20&&p.y<h-20)){
      assert.ok(ui.hitTest(p.x,p.y,w,h,t),'visible centre can be hit');
    }
  }
  const body=scene.projectedPlanets(0,440,736).find(p=>
    p.x>25&&p.x<415&&p.y>25&&p.y<711);
  assert.ok(body);
  const hit=ui.hitTest(body.x,body.y,440,736,0);
  assert.equal(ui.tap(body.x,body.y,440,736,0),hit);
  assert.equal(ui.selected,hit);
  assert.equal(ui.tap(body.x,body.y,440,736,0),null);
  assert.equal(ui.tap(body.x,body.y,440,736,0),hit);
  assert.equal(ui.tap(-100,-100,440,736,0),null);
  assert.equal(ui.selected,null);
});
test('overlapping planets use front-most depth, while ringed bodies can be selected on their rings',()=>{
  const shell={window:{EventHorizonRebuild:{
    showPlanets:true,
    projectedPlanets(){return[
      {name:'CINDER',x:50,y:60,radius:12,depth:.6},
      {name:'VERDANT',x:50,y:60,radius:8,depth:-.8}
    ]}
  },EventHorizonPlanetArt:{profile(){return null}}}};
  vm.runInNewContext(read('event-horizon/planet-interaction.js'),shell);
  assert.equal(shell.window.EventHorizonPlanetInteraction.hitTest(50,60,150,200,0),'VERDANT');
  shell.window.EventHorizonRebuild.showPlanets=false;
  assert.equal(shell.window.EventHorizonPlanetInteraction.hitTest(50,60,150,200,0),null);
  // Isolated visible ring can be tapped outside the solid planet sphere.
  const ringWindow={EventHorizonRebuild:{
    showPlanets:true,
    projectedPlanets(){return [{name:'HALO',x:90,y:75,radius:20,depth:-.4}]}
  },EventHorizonPlanetArt:{profile(){return {rings:'broad'}}}};
  vm.runInNewContext(read('event-horizon/planet-interaction.js'),{window:ringWindow});
  const a=2.15*20,roll=.42;
  const x=90+a*Math.cos(roll),y=75+a*Math.sin(roll);
  assert.ok(Math.hypot(x-90,y-75)>20+6,'tap is outside planetary sphere');
  assert.equal(ringWindow.EventHorizonPlanetInteraction.hitTest(x,y,180,180,0),'HALO');
});
test('selected orbit follows the live projected 3D path with grey dashes and directional white fade',()=>{
  const {ui,scene}=environment();
  for(const name of ['CINDER','VERDANT','HALO']){
    const p=scene.projectedPlanet(name,0,440,736);
    ui.tap(p.x,p.y,440,736,0);
    if(ui.selected!==name){
      // In a rare overlap the foreground world correctly takes priority:
      // independently reset selection via an uncontested orbital phase.
      ui.clear();
      let chosen=false;
      for(let i=0;i<360;i++){
        const t=i*scene.planetPeriod(name)/360;
        const q=scene.projectedPlanet(name,t,440,736);
        if(q.x<15||q.x>425||q.y<15||q.y>721)continue;
        if(ui.hitTest(q.x,q.y,440,736,t)!==name)continue;
        ui.tap(q.x,q.y,440,736,t);chosen=true;break;
      }
      assert.ok(chosen,'planet can be independently selected: '+name);
    }
    const {ctx,actions,getBalance}=context();
    ui.drawOrbit(ctx,440,736,43);
    const strokes=actions.filter(a=>a.type==='stroke');
    assert.ok(strokes.length>45,'equal short dashed segments');
    // Manually segmented dashes retain equal screen-space lengths after
    // foreshortening, rather than relying on angle-based setLineDash.
    assert.ok(actions.some(a=>a.type==='dash'&&a.dash.length===0));
    const shade=strokes.map(a=>Number(a.style.match(/^rgba\((\d+),/)?.[1]));
    assert.ok(shade.some(x=>x>=245),'white leading path');
    assert.ok(shade.some(x=>x<=198),'light-grey full path');
    assert.equal(getBalance(),0);
    ui.clear();
  }
});
test('planetary callout uses two 1px white square frames and clipped readable mobile text',()=>{
  const {ui,scene}=environment();
  for(const [w,h] of [[320,580],[390,690],[440,736],[844,390]]){
    for(const name of ui.names()){
      let t=0,planet=null;
      for(let i=0;i<160;i++){
        const time=i*scene.planetPeriod(name)/160;
        const p=scene.projectedPlanet(name,time,w,h);
        if(p.x>15&&p.x<w-15&&p.y>15&&p.y<h-15&&
           ui.hitTest(p.x,p.y,w,h,time)===name){t=time;planet=p;break}
      }
      if(!planet)continue;
      ui.tap(planet.x,planet.y,w,h,t);
      assert.equal(ui.selected,name);
      const geometry=ui.calloutGeometry(planet,w,h,name);
      assert.ok(geometry.boxX>=7&&geometry.boxY>=7);
      assert.ok(geometry.boxX+geometry.boxW<=w-7);
      assert.ok(geometry.boxY+geometry.boxH<=h-7);
      assert.ok(Math.abs(Math.abs(geometry.elbowX-geometry.startX)-
        Math.abs(geometry.elbowY-geometry.startY))<1e-8,'45-degree leader');
      assert.ok(Math.abs(geometry.entryX-geometry.elbowX)>1,'horizontal segment');
      const {ctx,actions,getBalance}=context();
      ui.drawCallout(ctx,w,h,t);
      const frames=actions.filter(a=>a.type==='strokeRect');
      assert.equal(frames.length,2);
      assert.ok(frames.every(a=>a.width===1));
      assert.ok(actions.some(a=>a.type==='text'&&
        a.text===(name==='DONOR_STAR'?'DONOR STAR / RED DWARF':name)));

      assert.ok(actions.some(a=>a.type==='text'&&a.text.includes('KM DIAMETER')));
      for(const stat of (name==='DONOR_STAR'?
        ['ORBIT TIME:','MASS:','TRANSFER:','MASS-LOSS:']:
        ['ORBIT TIME:','ORBIT DISTANCE:','MOONS:']))
        assert.ok(actions.some(a=>a.type==='text'&&a.text.startsWith(stat)),stat);
      assert.ok(actions.some(a=>a.type==='fillRect'),'dark readable text background');
      assert.equal(getBalance(),0);
      ui.clear();
    }
  }
});
test('adaptive annotations stay inside the viewport and avoid planet silhouettes',()=>{
  const {ui,scene}=environment();
  let checked=0,offscreen=0;
  for(const [w,h] of [[320,600],[353,680],[390,690],[844,390]]){
    for(const name of ui.names()){
      const period=scene.planetPeriod(name);
      for(let i=0;i<20;i++){
        const t=period*i/20,p=scene.projectedPlanet(name,t,w,h);
        const g=ui.calloutGeometry(p,w,h,name,t);
        assert.ok(g.boxX>=7&&g.boxY>=7,name+' box margin');
        assert.ok(g.boxX+g.boxW<=w-7&&g.boxY+g.boxH<=h-7,name+' box bounds');
        if(g.offscreen){offscreen++;continue}
        // Compare the actual planet/ring square against the information box.
        const overlapX=Math.max(0,Math.min(g.boxX+g.boxW,p.x+g.extent)-
          Math.max(g.boxX,p.x-g.extent));
        const overlapY=Math.max(0,Math.min(g.boxY+g.boxH,p.y+g.extent)-
          Math.max(g.boxY,p.y-g.extent));
        assert.ok(overlapX*overlapY<.1,name+' cannot be covered by its label');
        assert.ok(Math.abs(Math.abs(g.elbowX-g.startX)-
          Math.abs(g.elbowY-g.startY))<1e-8,'45-degree leader');
        checked++;
      }
    }
  }
  assert.ok(checked>500&&offscreen>0,'visible and offscreen states exercised');
});
test('planet selector and physical data come from actual model definitions',()=>{
  const {ui}=environment();
  const expected={CINDER:0,SILEX:0,VERDANT:1,RUST:0,ATLAS:2,
    HALO:1,AZURE:1,UMBRA:0};
  for(const [name,moonCount] of Object.entries(expected)){
    const meta=ui.info(name);
    assert.equal(meta.moonCount,moonCount);
    assert.match(meta.orbitTimeText,/^\d+d \d{2}:\d{2}:\d{2}$/);
    assert.match(meta.orbitDistanceText,/^[\d,]+ MILES$/);
    assert.equal(ui.select(name),name);
    assert.equal(ui.selected,name);
  }
  ui.clear();
  assert.equal(ui.selected,null);
});
test('donor is selectable and its position follows the integrated binary phase',()=>{
  const {ui,scene}=environment();
  const t=86400,w=390,h=690,star=scene.projectedPlanet('DONOR_STAR',t,w,h);
  assert.ok(star&&star.markerScale==='ENLARGED');
  assert.equal(ui.hitTest(star.x,star.y,w,h,t),'DONOR_STAR');
  assert.equal(ui.select('DONOR_STAR'),'DONOR_STAR');
  const {ctx,actions}=context();
  ui.drawOrbit(ctx,w,h,t);ui.drawCallout(ctx,w,h,t);
  assert.ok(actions.some(a=>a.type==='text'&&a.text.includes('TRANSFER:')));
  assert.equal(ui.info('DONOR_STAR').massLossText,'400M YR (FIXED RATE)');
});
test('existing app only attaches selection to EVENT HORIZON and retains PELAGIC touch handlers',()=>{
  const html=read('index.html');
  assert.ok(html.includes('src="./event-horizon/planet-interaction.js?v=2026112102"'));
  assert.ok(html.includes('src="./event-horizon/renderer.js?v=20261121"'));
  assert.ok(html.includes("if(currentScene==='event-horizon'){"));
  assert.ok(html.includes('window.EventHorizonPlanetInteraction?.tap?.('));
  assert.ok(html.includes('window.EventHorizonPlanetInteraction?.clear?.()'));
  assert.ok(html.includes('senses.pointerDown(e.pointerId,p.x,p.y,t)'));
  assert.ok(html.includes('senses.pointerUp(e.pointerId,p.x,p.y,t)'));
  assert.ok(html.includes('e.pointerType===\'touch\''));
  assert.ok(!html.includes('src="./preview/event-horizon/planet-interaction.js'));
});

test('orbit renders behind disc and planets, callout above them, with exact hit-test timestamp',()=>{
  const {w,scene}=environment(),events=[];
  w.EventHorizonPlanetInteraction={
    drawOrbit(){events.push('orbit')},
    drawCallout(){events.push('callout')}
  };
  w.EventHorizonPlanetArt={
    resetDiagnostics(){},
    draw(){events.push('body');return true},
    diagnostics(){return {glyphs:18,cloudGlyphs:0,ringGlyphs:0,moonGlyphs:0,atmosphereGlyphs:0}}
  };
  w.EventHorizonSourceCompositor={
    needsFrame(){return false},draw(){events.push('disc');return true},
    stats(){return {totalGlyphs:500}}
  };
  const {ctx}=context();
  scene.draw(ctx,440,736,73,null,true);
  assert.equal(scene.renderedOrbitTime,73);
  assert.ok(events.indexOf('orbit')>=0&&events.indexOf('orbit')<events.indexOf('body'));
  assert.ok(events.indexOf('body')<events.indexOf('disc'));
  assert.ok(events.indexOf('disc')<events.indexOf('callout'));
  assert.ok(scene.diagnostics().asciiCount>500);
});
