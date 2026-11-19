'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const physics=require('../preview/event-horizon/physical-system.js');
const {blackHole,companion,binary,accretion,plannedPlanets,SI}=physics;

test('binary masses and Roche-filling low-mass donor are physically consistent',()=>{
  assert.equal(blackHole.massSolar,5);
  assert.equal(companion.massSolar,.4);
  assert.equal(binary.totalMassSolar,5.4);
  assert.equal(binary.separationAU,.01);
  assert.ok(Math.abs(binary.periodSeconds/3600-3.7723)<.001);
  assert.ok(Math.abs(companion.rocheFillFactor-1)<.003);
  assert.equal(companion.massTransferMechanism,'Roche-lobe overflow');
  assert.ok(blackHole.schwarzschildRadiusKm>14&&blackHole.schwarzschildRadiusKm<16);
});

test('time-based circular binary exactly preserves barycentre and distance',()=>{
  for(const t of [0,1,500,3600,98765,123456789,2.5e9]){
    const state=physics.binaryAt(t);
    const {blackHole:bh,donor}=state;
    const distance=Math.hypot(...bh.positionAU.map((v,i)=>v-donor.positionAU[i]));
    assert.ok(Math.abs(distance-binary.separationAU)<1e-12);
    const barycentre=bh.positionAU.map((v,i)=>
      v*blackHole.massSolar+donor.positionAU[i]*companion.massSolar);
    assert.ok(Math.hypot(...barycentre)<1e-12);
    const barycentreV=bh.velocityMetresPerSecond.map((v,i)=>
      v*blackHole.massSolar+donor.velocityMetresPerSecond[i]*companion.massSolar);
    assert.ok(Math.hypot(...barycentreV)<1e-5);
    assert.equal(state.timeSeconds,t);
  }
  const a=physics.binaryAt(0),b=physics.binaryAt(binary.periodSeconds);
  for(let i=0;i<3;i++)
    assert.ok(Math.abs(a.donor.positionAU[i]-b.donor.positionAU[i])<1e-12);
});

test('Kepler orbital-period scaling uses entire 5.4-solar-mass central binary',()=>{
  const expected=[
    ['CINDER',.30,25.8],['SILEX',.42,42.8],
    ['VERDANT',.55,64.1],['RUST',.75,102.1],
    ['ATLAS',1.00,157.2],['HALO',1.30,233.0],
    ['AZURE',1.75,363.9],['UMBRA',2.40,584.4]
  ];
  assert.equal(plannedPlanets.length,8);
  for(let i=0;i<expected.length;i++){
    const [name,axis,days]=expected[i],actual=plannedPlanets[i];
    assert.equal(actual.name,name);
    assert.equal(actual.semimajorAxisAU,axis);
    assert.ok(Math.abs(actual.keplerPeriodDays-days)<.06,name+' period');
  }
  const periodRatio=physics.planetPeriodSeconds(1.3)/physics.planetPeriodSeconds(1);
  assert.ok(Math.abs(periodRatio-Math.pow(1.3,1.5))<1e-12);
});

test('accretion is plausible baseline assumption, not faked stability or flare physics',()=>{
  assert.equal(accretion.source,'DONOR_STAR');
  assert.ok(accretion.nominalTransferKgPerSecond>1e13);
  assert.ok(accretion.nominalTransferKgPerSecond<1e14);
  assert.ok(accretion.nominalLuminosityWatts>1e29);
  assert.ok(accretion.nominalLuminosityWatts<accretion.eddingtonLuminosityWatts*.02);
  assert.ok(accretion.illustrativeOuterDiscLimitAU<binary.separationAU);
  assert.equal(accretion.thermalStabilityValidated,false);
  assert.equal(accretion.viscousDelayModelIncluded,false);
  assert.equal(accretion.variabilityModelIncluded,false);
});

test('companion and physics remain invisible and disconnected from existing scenes',()=>{
  assert.equal(blackHole.visible,false);
  assert.equal(companion.visible,false);
  assert.equal(accretion.visible,false);
  assert.equal(physics.metadata.visualIntegration,false);
  assert.equal(physics.metadata.eventClockIntegrated,false);
  assert.equal(physics.metadata.dynamicallyStableEightPlanetSystemVerified,false);
  assert.throws(()=>physics.binaryAt(Infinity),RangeError);
  assert.throws(()=>physics.planetPeriodSeconds(0),RangeError);
  assert.throws(()=>physics.eggletonFraction(-1),RangeError);
});
