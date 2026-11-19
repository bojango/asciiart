'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../preview/event-horizon');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function load(script,win={}){
  vm.runInNewContext(read(script),{window:win},{filename:script});
  return win;
}
function modules(){
  const win=load('hero-camera.js');
  load('planet-art-depth.js',win);
  load('renderer-depth.js',win);
  return win;
}
const portrait=[440,736],landscape=[844,390];
function visible(p,w,h){
  return p.x+p.radius>0&&p.x-p.radius<w&&p.y+p.radius>0&&p.y-p.radius<h;
}
test('single existing VERDANT gets deterministic 3D perspective (no added planet)',()=>{
  const w=modules(),scene=w.EventHorizonRebuild,first=scene.state(0,440,736);
  assert.equal(first.planets.length,8);
  assert.equal(first.planets.filter(p=>p.name==='VERDANT').length,1);
  const when=scene.nextHeroPass(0),next=scene.nextHeroPass(when+.01);
  assert.ok(next>when);
  assert.ok(next-when>280&&next-when<300);
  const p=scene.heroAt(when,...portrait);
  assert.equal(p.heroLOD,'NEAR');
  assert.ok(p.radius>100&&p.radius<116);
  assert.ok(p.y-p.radius>530&&p.y-p.radius<565);
  assert.ok(p.x>250&&p.x<310);
  assert.ok(w.EventHorizonHeroCamera.shadowSafe(p,...portrait,45.76));
  assert.deepEqual(
    JSON.parse(JSON.stringify(p)),
    JSON.parse(JSON.stringify(scene.heroAt(when,...portrait))),
    'time determines position exactly, not frame count'
  );
});
test('landscape reveals wider orbit rather than rescaling world to fit width',()=>{
  const w=modules(),cam=w.EventHorizonHeroCamera;
  const a=cam.camera(...portrait),b=cam.camera(...landscape);
  assert.ok(2*b.visibleWorldHalfWidth>3*(2*a.visibleWorldHalfWidth));
  const scene=w.EventHorizonRebuild,t1=scene.nextHeroPass(0);
  const x=scene.heroAt(t1,...portrait),y=scene.heroAt(t1,...landscape);
  assert.ok(Math.abs(y.radius/x.radius-b.scale/a.scale)<1e-8);
  let visiblePortrait=0,visibleLandscape=0,unsafe=0;
  for(let i=0;i<720;i++){
    const t=t1+i/720*(scene.nextHeroPass(t1+.01)-t1);
    const pa=scene.heroAt(t,...portrait),la=scene.heroAt(t,...landscape);
    if(visible(pa,...portrait))visiblePortrait++;
    if(visible(la,...landscape))visibleLandscape++;
    if(pa.foreground&&visible(pa,...portrait)&&!cam.shadowSafe(pa,...portrait,45.76))unsafe++;
  }
  assert.ok(visiblePortrait<470,'portrait crops a substantial part of the path');
  assert.ok(visibleLandscape>700,'landscape displays almost all of the orbit');
  assert.equal(unsafe,0,'hero never obscures event horizon');
});
test('other seven planetary paths are exactly preserved in portrait',()=>{
  const newScene=modules().EventHorizonRebuild;
  const oldScene=load('renderer-planets.js').EventHorizonRebuild;
  for(const t of [0,10,45,150,333,950]){
    const a=oldScene.state(t,...portrait).planets;
    const b=newScene.state(t,...portrait).planets;
    for(const [i,p] of a.entries()){
      if(p.name==='VERDANT')continue;
      for(const k of ['x','y','depth','orbit','period','radius'])
        assert.ok(Math.abs(p[k]-b[i][k])<1e-7,p.name+' '+k);
    }
  }
});
test('close-pass planet resolves surface detail while retaining single-glyph moon',()=>{
  const w=modules(),scene=w.EventHorizonRebuild,art=w.EventHorizonPlanetArt;
  const t=scene.nextHeroPass(0),near=scene.heroAt(t,...portrait);
  const far=scene.heroAt(t+(scene.nextHeroPass(t+.1)-t)/2,...portrait);
  const planet={name:'VERDANT',body:[75,130,117],lit:[166,227,174]};
  const view={width:440,height:736,x:220,y:375.36,hole:45.76,
    stepX:440/113,stepY:5.5,font:6.16};
  function sample(pos,time){
    const records=[],ctx={fillStyle:'',font:'',textBaseline:'',
      fillText(ch,x,y){assert.ok(Number.isFinite(x+y));records.push(ch)}};
    art.resetDiagnostics();
    art.draw(ctx,planet,pos,view,time);
    return {glyphs:art.diagnostics().glyphs,records};
  }
  const nearArt=sample(near,t),farArt=sample(far,t+143.7);
  assert.ok(nearArt.glyphs>600&&nearArt.glyphs<2000);
  assert.ok(farArt.glyphs<100);
  assert.equal(art.moonPositions('VERDANT',near,t).length,1);
  let glimpses=0;
  const period=scene.nextHeroPass(t+.01)-t;
  for(let cycle=0;cycle<6;cycle++)for(let delta=-10;delta<=10;delta+=.5){
    const when=t+cycle*period+delta,host=scene.heroAt(when,...portrait);
    if(!visible(host,...portrait)||host.radius<45)continue;
    const moon=art.moonPositions('VERDANT',host,when)[0];
    if(moon.x>3&&moon.x<437&&moon.y>3&&moon.y<733&&
      Math.hypot(moon.x-host.x,moon.y-host.y)>host.radius*1.12)glimpses++;
  }
  assert.ok(glimpses>0,'moon becomes visible for some close-pass phases');
});
test('separate test page provides near-pass button and portrait/landscape controls',()=>{
  const html=read('depth.html');
  for(const script of ['hero-camera.js','planet-art-depth.js','renderer-depth.js'])
    assert.ok(html.includes('./'+script+'?v=1'));
  assert.match(html,/id="jumpPass"/);
  assert.match(html,/id="sceneMenuToggle"/);
  assert.match(html,/nextHeroPass\(elapsed\)-7/);
  assert.match(html,/ILLUSTRATIVE ORBIT/);
  assert.match(html,/Math\.max\(240,innerHeight\)/);
  assert.ok(!read('planets.html').includes('hero-camera.js'),
    'old planet-art preview remains untouched');
});
