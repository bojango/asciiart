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
  assert.ok(artSource.indexOf('ringPass(ctx,planet,pos,view,p,false,light,proximity)')<
    artSource.indexOf('const cellX='));
  assert.ok(artSource.indexOf('ringPass(ctx,planet,pos,view,p,true,light,proximity)')>
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
  assert.match(html,/planet-art\.js\?v=3/);
  assert.match(html,/renderer-planets\.js\?v=1/);
  assert.match(html,/source-compositor\.js\?v=6/);
  assert.match(html,/eventHorizon\.lightingTuners\.v3/);
  assert.match(html,/presetVersion:3/);
});

test('light intensity falls smoothly with orbital distance, not screen location',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const orbits=[.4,.51,.64,.77,.92,1.07,1.23,1.39];
  const gains=orbits.map(v=>art.proximityLight(v));
  for(let i=1;i<gains.length;i++)assert.ok(gains[i]<gains[i-1],'outer orbit dimmer');
  assert.ok(gains[0]>1.1&&gains.at(-1)>.7,'compressed, readable falloff');
  assert.equal(art.proximityLight(.92),art.proximityLight(.92),'deterministic tone map');
});
test('small planet outlines have a centred full circular silhouette',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const cinder=planets[0],{ctx,records}=stage();
  art.draw(ctx,{name:cinder[0],body:cinder[2],lit:cinder[3]},
    {x:180,y:260,radius:4.8,depth:0,orbit:.4},view,44);
  const xs=records.map(g=>g.x-180),ys=records.map(g=>g.y-260);
  assert.ok(records.length>=7,'complete small sphere');
  assert.ok(Math.abs(Math.max(...xs)+Math.min(...xs))<1e-7,'left/right symmetry');
  assert.ok(Math.abs(Math.max(...ys)+Math.min(...ys))<1e-7,'top/bottom symmetry');
});
test('shadow side stays readable and body brightness responds to proximity',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const getLuma=(orbit)=>{
    const {ctx,records}=stage();
    const cinder=planets[0];
    art.draw(ctx,{name:cinder[0],body:cinder[2],lit:cinder[3]},
      {x:180,y:260,radius:7.2,depth:.2,orbit},view,44);
    return records.map(g=>{
      const parts=g.colour.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
      assert.ok(parts,'valid RGBA');
      return (+parts[1]*.2126+(+parts[2])*.7152+(+parts[3])*.0722)*(+parts[4]);
    });
  };
  const near=getLuma(.4),far=getLuma(1.39);
  assert.equal(near.length,far.length,'orbital distance must not affect silhouette');
  const avg=v=>v.reduce((a,b)=>a+b,0)/v.length;
  assert.ok(avg(near)>avg(far)*1.13,'inner world visibly brighter');
  assert.ok(Math.min(...far)>5,'outer world retains nonzero shadow-side detail');
});

test('ATLAS and HALO have visually distinct visible ring systems',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const ringed=art.names().filter(name=>art.profile(name).rings);
  assert.deepEqual([...ringed],['ATLAS','HALO']);
  const atlas=stage(),halo=stage();
  art.resetDiagnostics();
  art.draw(atlas.ctx,{name:'ATLAS',body:[159,114,77],lit:[245,210,155]},
    {x:170,y:300,radius:16.8,depth:0,orbit:.92},view,25);
  const atlasRings=art.diagnostics().ringGlyphs;
  art.resetDiagnostics();
  art.draw(halo.ctx,{name:'HALO',body:[151,146,107],lit:[244,230,171]},
    {x:250,y:300,radius:13.6,depth:0,orbit:1.07},view,25);
  const haloRings=art.diagnostics().ringGlyphs;
  assert.ok(atlasRings>30,'ATLAS subtle but visible ring');
  assert.ok(haloRings>atlasRings,'HALO stronger two-band ring');
  assert.ok(halo.records.length>haloRings,'planet still present within rings');
});
test('exactly five faint moons orbit four planets at independent repeatable rates',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const names=['VERDANT','ATLAS','HALO','AZURE'];
  const host={x:200,y:320,radius:14};
  let count=0;
  for(const name of names){
    const now=art.moonPositions(name,host,30);
    const later=art.moonPositions(name,host,43);
    assert.equal(JSON.stringify(now),JSON.stringify(art.moonPositions(name,host,30)),
      name+' deterministic moon positions');
    assert.ok(now.length>0,name+' has satellite(s)');
    assert.notEqual(JSON.stringify(now),JSON.stringify(later),name+' has changing moon positions');
    for(let i=0;i<now.length;i++){
      assert.ok(Number.isFinite(now[i].x)&&Number.isFinite(now[i].y),'finite coordinates');
      assert.ok(['.',':','o'].includes(now[i].mark),'tiny ASCII moon only');
      assert.ok(Math.hypot(now[i].x-host.x,now[i].y-host.y)<host.radius*3.2,
        'moons remain locally bound to parent');
    }
    count+=now.length;
  }
  assert.equal(count,5,'moon count');
  assert.equal(art.moonPositions('CINDER',host,30).length,0,'no unnecessary moons');
});
test('refined terminator darkens the unlit hemisphere without losing full planet',()=>{
  const art=moduleIn(artSource).EventHorizonPlanetArt;
  const {ctx,records}=stage();
  const px=325;
  art.draw(ctx,{name:'VERDANT',body:[75,130,117],lit:[166,227,174]},
    {x:px,y:330,radius:10,depth:0,orbit:.64},view,28);
  const lum=r=>{
    const m=r.colour.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
    assert.ok(m);
    return (+m[1]*.2126+ +m[2]*.7152+ +m[3]*.0722)*+m[4];
  };
  const avg=xs=>xs.reduce((n,r)=>n+lum(r),0)/xs.length;
  const day=records.filter(r=>r.x<px-2),night=records.filter(r=>r.x>px+2);
  assert.ok(day.length>5&&night.length>5,'full planet has visible two hemispheres');
  assert.ok(avg(day)>avg(night)*1.5,'directional day/night gradient');
  assert.ok(avg(night)>15,'night remains distinguishable from empty background');
});
