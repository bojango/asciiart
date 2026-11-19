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
  assert.equal(p.heroLOD,'CLOSE');
  assert.ok(p.radius>126&&p.radius<131,'~20% larger than previous 107.5px radius');
  assert.ok(p.y-p.radius>540&&p.y-p.radius<555);
  assert.ok(p.x>285&&p.x<300);
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
      save(){},restore(){},beginPath(){},arc(){},fill(){},
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
  for(const script of ['hero-camera.js?v=2','planet-art-depth.js?v=3','renderer-depth.js?v=2'])
    assert.ok(html.includes('./'+script));
  assert.match(html,/id="jumpPass"/);
  assert.match(html,/id="sceneMenuToggle"/);
  assert.match(html,/nextHeroPass\(elapsed\)-7/);
  assert.match(html,/ILLUSTRATIVE ORBIT/);
  assert.match(html,/Math\.max\(240,innerHeight\)/);
  assert.ok(!read('planets.html').includes('hero-camera.js'),
    'old planet-art preview remains untouched');
});

test('VERDANT has visible blue oceans, green continents and separately moving translucent clouds',()=>{
  const win=modules(),scene=win.EventHorizonRebuild,art=win.EventHorizonPlanetArt;
  const t=scene.nextHeroPass(0),pos=scene.heroAt(t,...portrait);
  const view={width:440,height:736,x:220,y:375.36,hole:45.76,
    stepX:440/113,stepY:5.5,font:6.16};
  const records=[];
  const ctx={fillStyle:'',font:'',textBaseline:'',
    save(){},restore(){},beginPath(){},arc(){},fill(){},
    fillText(ch,x,y){records.push({ch,x,y,color:this.fillStyle})}};
  art.resetDiagnostics();
  art.draw(ctx,{name:'VERDANT',body:[75,130,117],lit:[166,227,174]},pos,view,t);
  const stat=art.diagnostics();
  assert.equal(pos.heroLOD,'CLOSE');
  assert.ok(stat.glyphs>1300&&stat.glyphs<2000,'denser detailed but bounded ASCII surface');
  assert.ok(stat.cloudGlyphs>60&&stat.cloudGlyphs<450,'separate sparse cloud layer');
  function parseRGBA(row){
    const match=row.color.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
    assert.ok(match);
    return match.slice(1).map(Number);
  }
  let blue=0,green=0;
  for(const row of records){
    if(!'~:'.includes(row.ch)){
      const [r,g,b,a]=parseRGBA(row);
      if(b>g*1.2&&b>r*1.3)blue++;
      if(g>b*1.12&&g>r*1.1)green++;
    }
  }
  assert.ok(blue>250,'large blue ocean regions');
  assert.ok(green>120,'distinct green landmasses');
  const normals=Array.from({length:180},(_,i)=>{
    const a=i/180*Math.PI*2;return [.9*Math.cos(a),.9*Math.sin(a),Math.sqrt(1-.9**2)];
  });
  const now=normals.map(n=>art.textureAt('VERDANT',n,t,1));
  const later=normals.map(n=>art.textureAt('VERDANT',n,t+21,1));
  assert.ok(now.some(v=>v.land>.8)&&now.some(v=>v.land<.2),
    'continental map retains coastlines and broad oceans');
  assert.ok(now.some((v,i)=>Math.abs(v.land-later[i].land)>.2),
    'landmasses rotate with the planet');
  assert.ok(now.some((v,i)=>Math.abs(v.cloud-later[i].cloud)>.25),
    'cloud cover moves separately over the rotating map');
  assert.deepEqual(
    JSON.parse(JSON.stringify(now)),
    JSON.parse(JSON.stringify(normals.map(n=>art.textureAt('VERDANT',n,t,1)))),
    'surface is deterministic at a fixed simulation time');
});
test('only the depth preview changes; approved source lighting and other scene previews are isolated',()=>{
  assert.match(read('depth.html'),/hero-camera\.js\?v=2/);
  assert.match(read('depth.html'),/planet-art-depth\.js\?v=3/);
  assert.match(read('depth.html'),/renderer-depth\.js\?v=2/);
  assert.ok(!read('planets.html').includes('planet-art-depth.js'));
  assert.ok(!read('source.html').includes('hero-camera.js'));
});

test('all eight planets have fully opaque black spherical backs before ASCII texture',()=>{
  const w=modules(),art=w.EventHorizonPlanetArt;
  const palettes={
    CINDER:[[130,81,66],[248,162,102]],SILEX:[[84,105,121],[193,214,231]],
    VERDANT:[[75,130,117],[166,227,174]],RUST:[[138,67,48],[247,165,109]],
    ATLAS:[[159,114,77],[245,210,155]],HALO:[[151,146,107],[244,230,171]],
    AZURE:[[62,101,147],[169,201,245]],UMBRA:[[106,81,130],[203,167,228]]
  };
  const view={width:440,height:736,x:220,y:375.36,stepX:440/113,stepY:5.5,font:6.16};
  assert.equal(art.names().length,8);
  for(const name of art.names()){
    const logs=[],ctx={fillStyle:'',globalAlpha:1,globalCompositeOperation:'source-over',
      font:'',textBaseline:'',save(){logs.push('save')},restore(){logs.push('restore')},
      beginPath(){},arc(x,y,r){logs.push(['circle',x,y,r])},
      fill(){logs.push(['fill',this.fillStyle,this.globalAlpha,this.globalCompositeOperation])},
      fillText(ch,x,y){logs.push(['glyph',ch,x,y])}};
    const [body,lit]=palettes[name];
    art.draw(ctx,{name,body,lit},{x:170,y:250,radius:14,depth:-.2,orbit:.8},view,42);
    const fillIdx=logs.findIndex(c=>Array.isArray(c)&&c[0]==='fill'&&c[1]==='#010102');
    assert.ok(fillIdx>=0,name+' opaque black body');
    const glyphAfter=logs.slice(fillIdx+1).findIndex(c=>Array.isArray(c)&&c[0]==='glyph');
    assert.ok(glyphAfter>=0,name+' textured letters drawn after opaque circle');
    const shape=logs.find(c=>Array.isArray(c)&&c[0]==='circle');
    assert.ok(Math.abs(shape[3]-14)<1e-8,name+' unchanged radius');
    assert.equal(logs[fillIdx][2],1,name+' completely opaque');
    assert.equal(logs[fillIdx][3],'source-over',name+' solid compositing');
  }
});
test('accretion disc draws a feathered dark matte under approved source RGB only',()=>{
  const w=modules(),scene=w.EventHorizonRebuild;
  const seq=[],ctx={
    fillStyle:'',font:'',textBaseline:'',globalAlpha:1,globalCompositeOperation:'source-over',
    shadowBlur:0,save(){},restore(){},fillRect(){},fillText(){},
    beginPath(){},arc(){},fill(){if(this.fillStyle==='#010102')seq.push('planet-body')},
    translate(){},rotate(){},scale(){},
    createRadialGradient(){seq.push('disc-matte');return{
      addColorStop(a,col){seq.push(['stop',a,col])}
    }}
  };
  w.EventHorizonSourceCompositor={
    needsFrame(){return false},
    draw(){seq.push('approved-source-rgb');return true},
    reset(){}
  };
  const t=scene.nextHeroPass(0);
  scene.draw(ctx,440,736,t,null,true);
  const matte=seq.indexOf('disc-matte'),rgb=seq.indexOf('approved-source-rgb');
  assert.ok(matte>=0&&rgb>matte,'the disc matte is below the original RGB artwork');
  assert.ok(seq.slice(0,matte).includes('planet-body'),'rear objects rendered before disc');
  assert.ok(seq.slice(rgb+1).includes('planet-body'),'foreground planets cover disc');
  const stops=seq.filter(entry=>Array.isArray(entry)&&entry[0]==='stop');
  assert.equal(stops.length,5,'smooth alpha gradient rather than opaque black patch');
  assert.equal(stops.at(-1)[2],'rgba(1,1,2,0)','disc edges fade to transparency');
  assert.ok(stops[0][2].endsWith('0.92)'),'core area substantially shields objects');
  assert.ok(!read('source-compositor.js').includes('drawAccretionOcclusion'),
    'approved source lighting module not modified');
});
