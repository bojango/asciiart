'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'preview/event-horizon/renderer.js'),'utf8');
function context() {
  const state={glyphs:0,composites:0};
  const mock=()=>({
    filter:'none',globalCompositeOperation:'source-over',globalAlpha:1,shadowBlur:0,
    save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},arc(){},fill(){},
    fillRect(){},clearRect(){},createRadialGradient(){return{addColorStop(){}}},
    fillText(char,x,y){assert.equal(typeof char,'string');assert.ok(Number.isFinite(x));assert.ok(Number.isFinite(y));state.glyphs++},
    drawImage(){state.composites++}
  });
  const c={window:{},document:{createElement(name){assert.equal(name,'canvas');return{width:0,height:0,getContext:mock}}}};
  vm.runInNewContext(src,c,{filename:'renderer.js'});
  return {renderer:c.window.EventHorizonRebuild,mock,state};
}
test('renderer is independent and exposes comparison controls',()=>{
  const {renderer}=context();
  assert.equal(typeof renderer.draw,'function');
  assert.equal(renderer.state(0).planets.length,8);
  renderer.setShowPlanets(false);assert.equal(renderer.showPlanets,false);
  renderer.setShowPlanets(true);assert.equal(renderer.showPlanets,true);
});
test('Kepler-scale periods and smooth circular orbit closure',()=>{
  const {renderer}=context(),planets=renderer.state(0).planets;
  for(let i=1;i<planets.length;i++){
    assert.ok(planets[i].period>planets[i-1].period);
    const x=planets[i].period**2/planets[i].orbit**3;
    const y=planets[0].period**2/planets[0].orbit**3;
    assert.ok(Math.abs(x/y-1)<1e-10);
  }
  for(const p of planets){
    const at=renderer.state(p.period).planets.find(x=>x.name===p.name);
    assert.ok(Math.hypot(p.x-at.x,p.y-at.y)<1e-6);
  }
});
test('front and back ASCII light layers receive independent additive blur',()=>{
  const {renderer,mock,state}=context(),ctx=mock();
  renderer.setShowPlanets(false);
  renderer.draw(ctx,390,690,45,null,true);
  const diagnostic=renderer.diagnostics();
  assert.ok(diagnostic.glyphs>700);
  assert.ok(diagnostic.hot>90);
  assert.ok(diagnostic.maxHeat>1);
  assert.equal(diagnostic.offscreen,true);
  assert.equal(state.composites,6);
});
test('rendering remains finite on portrait, landscape and low-detail views',()=>{
  const {renderer,mock}=context(),ctx=mock();
  renderer.setShowPlanets(true);
  for(const [w,h] of [[320,600],[390,690],[512,1112],[1400,800]]){
    for(const t of [0,30,300])renderer.draw(ctx,w,h,t,null,false);
  }
});
test('V2 remains the main deployed renderer until visual acceptance',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(html.includes('EVENT HORIZON <strong>/</strong> 002'));
  assert.ok(!html.includes('preview/event-horizon/renderer.js'));
});
