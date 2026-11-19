'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'preview/event-horizon/source-compositor.js'),'utf8');
const html=fs.readFileSync(path.join(root,'preview/event-horizon/source.html'),'utf8');

function load(){
  const sandbox={window:{}};
  vm.runInNewContext(source,sandbox,{filename:'source-compositor.js'});
  return sandbox.window.EventHorizonSourceCompositor;
}
const keys=['brightness','coreExposure','coreBloomStrength','coreBloomRadius',
  'coreThreshold','coreWhiteLift','warmth','saturation','gamma','contrast',
  'highlightRolloff','bloomStrength','bloomRadiusSmall','bloomRadiusWide'];

test('fourteen independently exposed tuners preserve the final owner-approved visual baseline',()=>{
  const p=load(),def=p.getDefaults();
  assert.deepEqual(Object.keys(def),keys);
  assert.equal(def.brightness,2);
  assert.equal(def.coreExposure,3.85);
  assert.equal(def.warmth,1.7);
  assert.equal(def.saturation,1.15);
  assert.equal(def.gamma,1);
  assert.equal(def.contrast,.9);
  assert.equal(def.highlightRolloff,.2);
  assert.equal(def.bloomStrength,2);
  assert.equal(def.bloomRadiusSmall,1.05);
  assert.equal(def.bloomRadiusWide,1.8);
  assert.equal(def.coreBloomStrength,3.45);
  assert.equal(def.coreBloomRadius,2.25);
  assert.equal(def.coreThreshold,.8);
  assert.equal(def.coreWhiteLift,.8);
  for(const key of keys)assert.equal(p.getParams()[key],def[key]);
});
test('setters clamp unsafe values, round step increments and ignore invalid inputs',()=>{
  const p=load();
  const values=p.setParams({brightness:40,coreExposure:-1,gamma:'bad',
    bloomRadiusWide:500,warmth:1.73,saturation:1.18,
    coreBloomStrength:900,coreBloomRadius:-2,coreThreshold:8,coreWhiteLift:-1});
  assert.equal(values.brightness,16);
  assert.equal(values.coreExposure,.10);
  assert.equal(values.gamma,1);
  assert.equal(values.bloomRadiusWide,12);
  assert.equal(values.warmth,1.75);
  assert.equal(values.saturation,1.20);
  assert.equal(values.coreBloomStrength,6);
  assert.equal(values.coreBloomRadius,.25);
  assert.equal(values.coreThreshold,1.5);
  assert.equal(values.coreWhiteLift,0);
  assert.equal(p.setBrightness(.25),.25);
  p.setParams(p.getDefaults());
  assert.deepEqual({...p.getParams()},{...p.getDefaults()});
});
test('controls and copy workflow are confined to the experimental preview',()=>{
  for(const key of keys)assert.ok(html.includes("key:'"+key+"'"),key);
  assert.match(html,/COPY SETTINGS/);
  assert.match(html,/id="activeSlider"/);
  assert.match(html,/id="tunerChips"/);
  assert.match(html,/id="tunerPrev"/);
  assert.match(html,/id="tunerNext"/);
  assert.match(html,/id="valuesPanel"/);
  assert.match(html,/id="copySettings"/);
  assert.match(html,/id="resetSettings"/);
  assert.match(html,/classList\.toggle\('studio-open'/);
  assert.match(html,/.controls\.studio-open>\.buttons/);
  assert.match(html,/nodes\.activeSlider\.addEventListener\('input'/);
  assert.match(html,/selectTuner\(activeIndex\+1\)/);
  assert.match(html,/setStudioOpen\(false\)/);
  assert.match(html,/navigator\.clipboard\.writeText/);
  assert.match(html,/history\.replaceState/);
  assert.match(html,/eventHorizon\.lightingTuners\.v3/);
  assert.match(html,/source-compositor\.js\?v=6/);
  assert.match(html,/selectTuner\(2,false\)/);
  assert.match(html,/presetVersion:3/);
  assert.match(html,/renderer-reference\.js\?v=2/);
  const prod=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(!prod.includes('lightingTuners'));
  assert.ok(prod.includes('event-horizon.js?v=20261119'));
});

test('core bloom remains isolated to inner gas and event horizon remains masked',()=>{
  assert.match(source,/if\(params\.coreBloomStrength>0\)/);
  assert.match(source,/if\(drawCore\)/);
  assert.match(source,/function coreMask\(point,view\)/);
  assert.match(source,/r<\.98/);
  assert.match(source,/destination-out/);
  const p=load();
  assert.equal(p.getParams().coreBloomStrength,3.45);
  p.setParams({coreBloomStrength:2.5,coreBloomRadius:1.4,coreThreshold:.55,coreWhiteLift:.7});
  assert.equal(p.getParams().coreBloomStrength,2.5);
  assert.equal(p.getParams().coreBloomRadius,1.4);
  assert.equal(p.getParams().coreThreshold,.55);
  assert.equal(p.getParams().coreWhiteLift,.7);
  p.setParams(p.getDefaults());
  assert.equal(p.getParams().coreBloomStrength,3.45);
  assert.equal(p.getParams().coreWhiteLift,.8);
});

test('directional light bias reduced without changing geometry or orbital periods',()=>{
  const renderer=fs.readFileSync(path.join(root,'preview/event-horizon/renderer-reference.js'),'utf8');
  assert.match(renderer,/const DIRECTIONAL_BRIGHTNESS_BIAS=\.14/);
  assert.match(renderer,/disk=1\.52\*diskEdge/);
  assert.match(renderer,/DIRECTIONAL_BRIGHTNESS_BIAS\*u/);
  assert.match(renderer,/DIRECTIONAL_BRIGHTNESS_BIAS\*Math\.cos/);
  const sandbox={window:{}};
  vm.runInNewContext(renderer,sandbox,{filename:'renderer-reference.js'});
  const scene=sandbox.window.EventHorizonRebuild;
  const planets=scene.state(0,440,736).planets;
  assert.equal(planets.length,8);
  for(let i=1;i<planets.length;i++)
    assert.ok(planets[i].period>planets[i-1].period);
});
