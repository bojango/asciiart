'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const folder=path.join(root,'preview/event-horizon');
const artSource=fs.readFileSync(path.join(folder,'planet-art.js'),'utf8');
const rendererSource=fs.readFileSync(path.join(folder,'renderer-planets.js'),'utf8');
const fallbackSource=fs.readFileSync(path.join(folder,'renderer-reference.js'),'utf8');
const html=fs.readFileSync(path.join(folder,'planets.html'),'utf8');
function moduleIn(source,window={}){
  vm.runInNewContext(source,{window},{filename:'test-renderer.js'});
  return window;
}
function stage(){
  const records=[];
  const ctx={font:'',fillStyle:'',textBaseline:'',
    fillText(ch,x,y){
      assert.ok(Number.isFinite(x)&&Number.isFinite(y),'finite characters');
      records.push({ch,x,y,colour:this.fillStyle});
    }
  };
  return {ctx,records};
}
const planets=[
  ['CINDER',4.8,[130,81,66],[248,162,102]],
  ['SILEX',6.8,[84,105,121],[193,214,231]],
  ['VERDANT',8.9,[75,130,117],[166,227,174]],
  ['RUST',7.7,[138,67,48],[247,165,109]],
  ['ATLAS',16.8,[159,114,77],[245,210,155]],
  ['HALO',13.6,[151,146,107],[244,230,171]],
  ['AZURE',12.1,[62,101,147],[169,201,245]],
  ['UMBRA',9.95,[106,81,130],[203,167,228]]
];
const view={width:440,height:736,x:220,y:375,stepX:3.89,stepY:5.5,font:7.2};
test('eight distinctive ASCII worlds retain existing identifiers',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  assert.deepEqual([...art.names()],planets.map(p=>p[0]));
  for(const [name]of planets){
    const p=art.profile(name);
    assert.ok(['gas','ice-giant','terrestrial','ice','volcanic','desert','dark-ice'].includes(p.kind));
    assert.ok(p.spin>0);
    assert.ok(p.tilt>=0);
  }
});
test('procedural surface textures spin independently and are repeatable',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const normal=[.43,.17,Math.sqrt(1-.43**2-.17**2)];
  const phases=new Set();
  for(const [name]of planets){
    const a=art.textureAt(name,normal,0);
    const b=art.textureAt(name,normal,30);
    const again=art.textureAt(name,normal,30);
    assert.ok(Math.abs(a.variation-b.variation)>.0005,name+' must rotate');
    assert.equal(b.variation,again.variation,name+' deterministic spin');
    phases.add(art.spinAngle(name,30).toFixed(4));
  }
  assert.equal(phases.size,8,'unique rotation phases');
});
test('planet bodies are still ASCII, with bounded glyph counts and lighting',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const colours=new Set();
  for(let i=0;i<planets.length;i++){
    const [name,radius,body,lit]=planets[i];
    const {ctx,records}=stage();
    const pos={x:60+i*42,y:250+(i%2)*45,radius,depth:(i-3.5)/7};
    assert.equal(art.draw(ctx,{name,body,lit},pos,view,42),true);
    assert.ok(records.length>=4,name+' must have visible ASCII');
    assert.ok(records.length<220,name+' must stay restrained');
    for(const record of records)colours.add(record.colour);
  }
  assert.ok(colours.size>80,'detailed surface shading');
});
test('rings render as back pass, then body, then front pass',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const {ctx,records}=stage();
  const p={name:'HALO',body:[151,146,107],lit:[244,230,171]};
  const pos={x:220,y:320,radius:14,depth:.1};
  art.draw(ctx,p,pos,view,20);
  const st=art.diagnostics();
  assert.ok(st.ringGlyphs>50,'fine ring texture');
  assert.ok(st.glyphs>20,'ring planet body');
  // The source layer ordering is intentional and regression-protected.
  assert.ok(artSource.indexOf('ringPass(ctx,planet,pos,view,p,false,light)')<
    artSource.indexOf('const cellX='));
  assert.ok(artSource.indexOf('ringPass(ctx,planet,pos,view,p,true,light)')>
    artSource.indexOf('const cellX='));
  assert.ok(records.length>st.ringGlyphs);
});
test('existing orbit mechanics and black-hole lighting remain unchanged',()=>{
  const before=moduleIn(fallbackSource).EventHorizonRebuild;
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const after=moduleIn(rendererSource,{EventHorizonPlanetArt:art}).EventHorizonRebuild;
  for(const time of [0,8.3,56,120,360,720]){
    const oldPlanets=before.state(time,440,736).planets;
    const newPlanets=after.state(time,440,736).planets;
    assert.equal(JSON.stringify(oldPlanets),JSON.stringify(newPlanets));
    assert.equal(newPlanets.length,8);
  }
  assert.match(rendererSource,/const DIRECTIONAL_BRIGHTNESS_BIAS=\.14/);
  assert.match(rendererSource,/if\(art&&art.draw\(ctx,planet,pos,view,time\)\)return/);
  assert.ok(!fs.readFileSync(path.join(folder,'source.html'),'utf8').includes('planet-art.js'));
});
test('new mobile route has all render modules and accepts existing Light Studio settings',()=>{
  assert.match(html,/planet-art\.js\?v=1/);
  assert.match(html,/renderer-planets\.js\?v=1/);
  assert.match(html,/source-compositor\.js\?v=6/);
  assert.match(html,/eventHorizon\.lightingTuners\.v3/);
  assert.match(html,/presetVersion:3/);
});
