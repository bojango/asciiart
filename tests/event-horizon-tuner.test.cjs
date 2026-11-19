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
const keys=['brightness','coreExposure','warmth','saturation','gamma','contrast',
  'highlightRolloff','bloomStrength','bloomRadiusSmall','bloomRadiusWide'];

test('ten independently exposed numeric tuners and original defaults',()=>{
  const p=load(),def=p.getDefaults();
  assert.deepEqual(Object.keys(def),keys);
  assert.equal(def.brightness,1);
  assert.equal(def.coreExposure,1);
  assert.equal(def.gamma,1);
  assert.equal(def.highlightRolloff,0);
  assert.equal(def.bloomRadiusSmall,1.25);
  assert.equal(def.bloomRadiusWide,2.75);
  for(const key of keys)assert.equal(p.getParams()[key],def[key]);
});
test('setters clamp unsafe values, round step increments and ignore invalid inputs',()=>{
  const p=load();
  const values=p.setParams({brightness:40,coreExposure:-1,gamma:'bad',
    bloomRadiusWide:500,warmth:1.73,saturation:1.18});
  assert.equal(values.brightness,16);
  assert.equal(values.coreExposure,.10);
  assert.equal(values.gamma,1);
  assert.equal(values.bloomRadiusWide,12);
  assert.equal(values.warmth,1.75);
  assert.equal(values.saturation,1.20);
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
  assert.match(html,/eventHorizon\.lightingTuners\.v1/);
  assert.match(html,/source-compositor\.js\?v=4/);
  const prod=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(!prod.includes('lightingTuners'));
  assert.ok(prod.includes('event-horizon.js?v=20261119'));
});
