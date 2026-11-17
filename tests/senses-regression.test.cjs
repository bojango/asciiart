'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sensesSource = fs.readFileSync(path.join(__dirname, '..', 'senses.js'), 'utf8');
const ecosystemSource = fs.readFileSync(path.join(__dirname, '..', 'ecosystem.js'), 'utf8');

function setup() {
  const events = new Map();
  const docEvents = new Map();
  let cameraRequests = 0,tracksStopped = 0,readCount=0;
  const drawContext = {
    drawImage() {},
    getImageData() {
      const data = new Uint8ClampedArray(64*48*4);
      readCount++;
      for(let j=0;j<64*48;j++){
        const intensity=((j%2) === (readCount%2)) ? 240 : 30;
        const k=j*4;data[k]=intensity;data[k+1]=intensity;data[k+2]=intensity;data[k+3]=255;
      }
      return {data};
    },
  };
  const stream={
    getTracks:()=>[{stop(){tracksStopped++}}],
    getVideoTracks:()=>[],
  };
  const navigator={mediaDevices:{
    async getUserMedia(constraints){
      cameraRequests++;
      assert.equal(constraints.audio,false,'microphone must remain disabled');
      assert.equal(constraints.video.facingMode.ideal,'user','prefer front camera');
      return stream;
    },
  }};
  const document={
    hidden:false,
    body:{appendChild(){}},
    addEventListener(name,handler){docEvents.set(name,handler)},
    createElement(name){
      if(name==='canvas')return {width:0,height:0,getContext(){return drawContext}};
      if(name==='video')return {
        muted:false,autoplay:false,playsInline:false,style:{},readyState:3,
        setAttribute(){},play(){return Promise.resolve()},pause(){},remove(){},srcObject:null,
      };
      throw Error('Unexpected element: '+name);
    },
  };
  const motionPermissions=[];
  const window={
    screen:{orientation:{angle:0}},
    DeviceOrientationEvent:{requestPermission(){motionPermissions.push('orientation');return Promise.resolve('granted')}},
    DeviceMotionEvent:{requestPermission(){motionPermissions.push('motion');return Promise.resolve('granted')}},
    addEventListener(name,handler){events.set(name,handler)},
    removeEventListener(name){events.delete(name)},
  };
  new Function('window','document','navigator',sensesSource)(window,document,navigator);
  const senses=window.PelagicSenses;
  return {senses,events,docEvents,document,motionPermissions,
    cameraRequests:()=>cameraRequests,tracksStopped:()=>tracksStopped};
}

test('no camera or motion access before an explicit opt-in',()=>{
  const x=setup(),s=x.senses.state();
  assert.equal(s.cameraEnabled,false);
  assert.equal(s.motionEnabled,false);
  assert.equal(s.touch,true);
  assert.equal(x.cameraRequests(),0);
  assert.equal(x.events.size,0);
});

test('tap, double-tap food offering, hold and drag currents',()=>{
  const x=setup();let offered=0,presences=0;
  x.senses.setCallbacks({onFood:()=>offered++,onPresence:()=>presences++});
  x.senses.update(.05,.95);
  x.senses.pointerDown(1,100,200,1);
  x.senses.pointerUp(1,100,200,1.08);
  x.senses.pointerDown(1,103,203,1.27);
  x.senses.pointerUp(1,103,203,1.31);
  assert.equal(offered,1,'double tap should offer exactly one prey');
  x.senses.pointerDown(2,130,210,2);
  x.senses.pointerMove(2,176,222,2.12);
  x.senses.pointerUp(2,176,222,2.23);
  const current=x.senses.update(.1,2.23);
  assert.ok(current.windX>0,'drag should create a real environmental current');
  x.senses.pointerDown(3,180,230,3);
  x.senses.update(.1,3.85);
  assert.ok(x.senses.getInterest(3.85),'long press should establish a point of curiosity');
  x.senses.pointerUp(3,180,230,3.9);
  x.senses.setTouchEnabled(false);
  assert.equal(x.senses.state().touch,false);
});

test('motion permissions are explicit and tilt changes current, not position',async()=>{
  const x=setup();
  await x.senses.startMotion();
  assert.deepEqual(x.motionPermissions,['orientation','motion']);
  x.events.get('deviceorientation')({gamma:30,beta:70});
  const fx=x.senses.update(.4,1);
  assert.ok(fx.windX>5&&fx.windY>0,'tilt should influence current');
  assert.equal(x.senses.state().motionEnabled,true);
  x.senses.stopMotion();
  assert.equal(x.senses.state().motionEnabled,false);
  assert.equal(x.events.has('deviceorientation'),false);
});

test('camera uses only on-device frames and stops tracks on hide or opt-out',async()=>{
  const x=setup();let presences=0;
  x.senses.setCallbacks({onPresence:()=>presences++});
  await x.senses.startCamera();
  assert.equal(x.cameraRequests(),1);
  assert.equal(x.senses.state().cameraEnabled,true);
  x.senses.update(.3,.3);
  x.senses.update(.3,.65);
  assert.ok(presences>=1,'moving image should generate a presence cue');
  x.document.hidden=true;
  x.docEvents.get('visibilitychange')();
  assert.equal(x.senses.state().cameraEnabled,false);
  assert.ok(x.tracksStopped()>=1,'camera tracks stopped when tab hidden');
  assert.equal(x.senses.state().motionEnabled,false);
});


test('offered food is real autonomous prey, respecting LIFE switches',()=>{
  const window={};
  const localStorage={getItem(){return null},setItem(){}};
  new Function('window','localStorage',ecosystemSource)(window,localStorage);
  const eco=window.PelagicEcosystem;
  const animal={x:195,y:190,z:.2,energy:.7,hunger:.5,startle:0};
  eco.update(1/60,0,animal,[],{width:390,height:600,radius:100,scale:1},{windX:0,windY:0});
  const offered=eco.spawn('offered',{x:140,y:300,z:.2});
  assert.equal(offered,true,'finger offers prey without instant feeding');
  assert.equal(eco.state().counts.offered,1);
  assert.equal(eco.state().active.prey,1);
  assert.equal(eco.state().counts.preyEaten,0,'prey must actually touch a tentacle');
  eco.setEnabled('prey',false);
  assert.equal(eco.spawn('offered',{x:180,y:300}),false,'respect disabled prey option');
});
