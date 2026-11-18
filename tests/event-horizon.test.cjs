'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(root, 'event-horizon.js'), 'utf8');
const shell = { window: {} };
vm.runInNewContext(moduleSource, shell, { filename: 'event-horizon.js' });
const horizon = shell.window.PelagicEventHorizon;

test('independent renderer, source and palettes', () => {
  assert.equal(typeof horizon.draw, 'function');
  assert.equal(horizon.palette, 'EMBER');
  assert.equal(horizon.cyclePalette(), 'ION');
  assert.equal(horizon.cyclePalette(), 'SOLSTICE');
  assert.equal(horizon.cyclePalette(), 'EMBER');
  assert.match(horizon.source(), /orbitPosition/);
});

test('eight ordered orbits obey Kepler third law', () => {
  const planets = horizon.state(0).planets;
  assert.equal(planets.length, 8);
  for (let i = 1; i < planets.length; i++) {
    assert.ok(planets[i].period > planets[i - 1].period);
    const a = planets[i - 1].period ** 2 / planets[i - 1].orbit ** 3;
    const b = planets[i].period ** 2 / planets[i].orbit ** 3;
    assert.ok(Math.abs(a / b - 1) < 1e-10);
  }
});

test('orbit positions evolve smoothly and close at their period', () => {
  for (const start of horizon.state(0).planets) {
    const halfway = horizon.state(start.period / 2).planets.find(p => p.name === start.name);
    const full = horizon.state(start.period).planets.find(p => p.name === start.name);
    assert.ok(Math.hypot(start.x - halfway.x, start.y - halfway.y) > 3);
    assert.ok(Math.hypot(start.x - full.x, start.y - full.y) < 1e-7);
  }
});

test('ASCII rendering is finite and leaves canvas state balanced at diverse sizes', () => {
  let saves = 0, restores = 0, glyphs = 0;
  const ctx = {
    save() { saves++; }, restore() { restores++; },
    translate() {}, rotate() {}, scale() {},
    beginPath() {}, fill() {},
    arc(...args) { assert.ok(args.every(Number.isFinite)); },
    fillRect(...args) { assert.ok(args.every(Number.isFinite)); },
    fillText(char, x, y) { assert.equal(typeof char, 'string'); assert.ok(Number.isFinite(x) && Number.isFinite(y)); glyphs++; },
    createRadialGradient() { return { addColorStop() {} }; }
  };
  for (const [w, h] of [[320, 600], [390, 690], [512, 1112], [1400, 800]]) {
    for (const t of [0, 75, 1500]) horizon.draw(ctx, w, h, t, null, true);
  }
  assert.ok(saves >= 12);
  assert.equal(restores, saves);
  assert.ok(glyphs > 15000);
});

test('the accretion disc fills most of a portrait frame with ASCII', () => {
  const width=390,height=690,points=[];
  const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},arc(){},fill(){},fillRect(){},
    createRadialGradient(){return {addColorStop(){}}},
    fillText(char,x,y){points.push({char,x,y})}
  };
  horizon.draw(ctx,width,height,40,null,true);
  const disc=points.filter(p=>Math.abs(p.y-height*.51)<55 && Math.abs(p.x-width*.5)>90);
  assert.ok(disc.length>250,`expected a wide, textured disc, got ${disc.length} characters`);
  const extent=disc.reduce((a,p)=>[Math.min(a[0],p.x),Math.max(a[1],p.x)],[Infinity,-Infinity]);
  assert.ok(extent[1]-extent[0]>width*0.73);
});

test('scene is registered without changing the old renderers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /const sceneOrder=\['pelagic','greenwood','event-horizon'\]/);
  assert.match(html, /src=".\/event-horizon.js(?:\?v=\d+)?"/);
  assert.match(html, /horizon.draw\(ctx,width,height,time,null,highRes\)/);
  assert.match(html, /greenwood.draw\(ctx,width,height,time,environmentalFx,highRes\)/);
  assert.match(html, /drawBell\(time\)/);
  assert.match(html, /currentScene==='pelagic'/);
});