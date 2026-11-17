'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ecosystemSource = fs.readFileSync(path.join(root, 'ecosystem.js'), 'utf8');
const sensesSource = fs.readFileSync(path.join(root, 'senses.js'), 'utf8');

function createSimulation() {
  const nodes = new Map();
  class Element {
    constructor(id) {
      this.id = id;
      this.dataset = {};
      this.style = {};
      this.hidden = id === 'devPanel';
      this.children = [];
      this.value = '';
      this.classList = { toggle() {}, contains() { return false; }, add() {}, remove() {} };
    }
    getBoundingClientRect() { return { width: 390, height: 600, left: 0, top: 0 }; }
    addEventListener() {}
    setAttribute() {}
    appendChild(child) { this.children.push(child); }
    append(...children) { this.children.push(...children); }
    querySelector(selector) { return new Element(selector); }
  }
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, new Element(id));
    return nodes.get(id);
  };
  const document = {
    getElementById: get, querySelector: get, querySelectorAll: () => [],
    createElement: get, addEventListener() {},
  };
  const ctx = {
    fillText() {}, fillRect() {}, setTransform() {}, save() {}, restore() {},
    createRadialGradient() { return { addColorStop() {} }; },
  };
  get('sea').getContext = () => ctx;
  const localStorage = { getItem: () => null, setItem() {} };
  const window = { devicePixelRatio: 1, location: { search: '?scene=pelagic' }, addEventListener() {} };
  new Function('window', 'localStorage', ecosystemSource)(window, localStorage);
  new Function('window', 'document', 'navigator', sensesSource)(window, document, {});
  window.PelagicGreenwood = {
    draw() {}, source() { return '// test'; }, cycleSeason() { return 'SUMMER'; },
    get season() { return 'SUMMER'; },
  };
  const definitions = Object.fromEntries(['temperature', 'wind', 'rain', 'airQuality', 'humidity', 'daylight']
    .map(key => [key, { min: 0, max: 100 }]));
  window.PelagicEnvironment = {
    definitions,
    tick() {},
    effects() { return { temperature: 0, daylight: .5, air: 0, humidity: .3, rain: 0, windX: 0, windY: 0, enabled: { temperature: true } }; },
    state() {
      return {
        values: { temperatureC: 10, windKmh: 0, rainPct: 0, airQualityIndex: 10, humidityPct: 30, daylightPct: 50, windDirection: 0 },
        enabled: { temperature: true }, mode: 'test', weatherStatus: 'ready', airStatus: 'ready',
        location: { name: 'Lancaster' }, weatherUpdated: 0, airUpdated: 0,
      };
    },
    setInput() {}, setEnabled() {}, preset() {},
  };
  let nextFrame;
  let script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'main inline animation script exists');
  const probe = 'depthGoal:swimmer.depthGoal';
  assert.ok(script.includes(probe), 'stable debug test injection point exists');
  script = script.replace(probe, [
    '_setTestZ:z=>{swimmer.z=z;swimmer.vz=0},',
    '_bellBounds:()=>{',
    'let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;',
    'for(let p=0;p<=12;p++)for(let i=0;i<64;i++){',
    'const q=bellSurface(p/12*PI*.5,TAU*i/64,t),a=project(q.x,q.y,q.z);',
    'minX=Math.min(minX,a.x);maxX=Math.max(maxX,a.x);',
    'minY=Math.min(minY,a.y);maxY=Math.max(maxY,a.y);',
    '}return {width:maxX-minX,height:maxY-minY}},',
    probe,
  ].join(''));
  // Keep real swimming, ropes and ecosystem running; skip repetitive glyph
  // drawing except at launch and during the first near-camera visit.
  const renderAnchor = 'if(drawDebt>=1/30){render(t);drawDebt=0;';
  assert.ok(script.includes(renderAnchor), 'render loop instrumented');
  script = script.replace(renderAnchor,
    'if(drawDebt>=1/30){if(t<.5||(t>125&&t<126))render(t);drawDebt=0;');
  class SearchParams { get(key) { return key === 'scene' ? 'pelagic' : null; } }
  new Function('document', 'window', 'localStorage', 'location', 'matchMedia',
    'requestAnimationFrame', 'cancelAnimationFrame', 'URLSearchParams', script)(
      document, window, localStorage, window.location, () => ({ matches: false }),
      fn => { nextFrame = fn; return 1; }, () => {}, SearchParams);
  return {
    debug: () => window.PELAGIC.debug(),
    frame: timeMs => nextFrame(timeMs),
  };
}

test('actual bell projection, not only a scale variable, responds to Z', () => {
  const sim = createSimulation();
  const samples = [-2.6, -1.8, -1, 0, 1, 2].map(z => {
    sim.debug()._setTestZ(z);
    const state = sim.debug();
    return { z, scale: state.scale, ...state._bellBounds() };
  });
  const baseline = samples.find(point => point.z === 0);
  for (const point of samples) {
    const rendered = point.width / baseline.width;
    const predicted = point.scale / baseline.scale;
    assert.ok(Math.abs(rendered - predicted) < .025,
      'bell geometry must scale with Z at ' + point.z + ', not just debug().scale');
  }
  assert.ok(samples[0].width > samples.at(-1).width * 2,
    'near/far changes should be unmistakable on screen');
});

test('autonomous close visits are rare, visible and end with a retreat', () => {
  const sim = createSimulation();
  let maxExtremeFrames = 0, consecutive = 0, visits = 0, completedRetreat = false;
  let zMin = Infinity, zMax = -Infinity, maxRootGap = 0;
  for (let frame = 1; frame <= 12600; frame++) { // seven simulated minutes
    sim.frame(frame * 1000 / 30);
    const state = sim.debug();
    visits = Math.max(visits, state.closeVisits);
    zMin = Math.min(zMin, state.z);
    zMax = Math.max(zMax, state.z);
    if (frame % 30 === 0) maxRootGap = Math.max(maxRootGap, state.maxRootGap);
    consecutive = state.scale > 1.55 ? consecutive + 1 : 0;
    maxExtremeFrames = Math.max(maxExtremeFrames, consecutive);
    if (visits && !state.closeApproach && !state.closeRetreat && state.scale < 1.35)
      completedRetreat = true;
  }
  assert.ok(visits >= 1, 'at least one close encounter should occur over seven minutes');
  assert.ok(completedRetreat, 'close visit must transition back to ordinary depth');
  assert.ok(maxExtremeFrames / 30 < 13, 'near-screen scale must never persist');
  assert.ok(zMin < -2.3 && zMax > 1.3, 'near and far extremes must both be reached');
  assert.ok(maxRootGap <= 1.1, 'tentacles must remain attached throughout scaling');
});
