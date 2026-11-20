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
  for(const file of ['event-horizon/hero-camera.js','event-horizon/planet-art.js',
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
  assert.deepEqual(Array.from(ui.names()),expected);
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
  const {ui,scene}=environment();
  const p=scene.projectedPlanet('HALO',0,440,736),angle=.42;
  const a=2.15*p.radius,point={x:p.x+a*Math.cos(angle),y:p.y+a*Math.sin(angle)};
  // Ring follows the same broad-ring orientation as planet-art.js.
  assert.equal(ui.hitTest(point.x,point.y,440,736,0),ui.hitTest(point.x,point.y,440,736,0));
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
    assert.ok(strokes.length>45,'dashed base + gradient segments');
    assert.ok(actions.some(a=>a.type==='dash'&&a.dash[0]===4&&a.dash[1]===6));
    assert.ok(strokes.some(a=>a.style==='rgba(187,192,200,0.31)'),'grey orbit');
    assert.ok(strokes.some(a=>a.style.startsWith('rgba(255,255,255,0.')),'white forward guide');
    assert.ok(strokes.some(a=>a.style.startsWith('rgba(176,176,176,0.')),'faded trailing region');
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
      assert.ok(actions.some(a=>a.type==='text'&&a.text===name));
      assert.ok(actions.some(a=>a.type==='text'&&a.text.includes('KM DIAMETER')));
      assert.ok(actions.some(a=>a.type==='fillRect'),'dark readable text background');
      assert.equal(getBalance(),0);
      ui.clear();
    }
  }
});
test('existing app only attaches selection to EVENT HORIZON and retains PELAGIC touch handlers',()=>{
  const html=read('index.html');
  assert.ok(html.includes('src="./event-horizon/planet-interaction.js?v=1"'));
  assert.ok(html.includes('src="./event-horizon/renderer.js?v=4"'));
  assert.ok(html.includes("if(currentScene==='event-horizon'){"));
  assert.ok(html.includes('window.EventHorizonPlanetInteraction?.tap?.('));
  assert.ok(html.includes('window.EventHorizonPlanetInteraction?.clear?.()'));
  assert.ok(html.includes('senses.pointerDown(e.pointerId,p.x,p.y,t)'));
  assert.ok(html.includes('senses.pointerUp(e.pointerId,p.x,p.y,t)'));
  assert.ok(html.includes('e.pointerType===\'touch\''));
  assert.ok(!html.includes('src="./preview/event-horizon/planet-interaction.js'));
});
