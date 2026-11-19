/* EVENT HORIZON — wall-art / development simulation clock, v1.
 * Separates physically-scaled orbital progression from fast disc/cloud animation.
 * The display orbits are still illustrative. The clock uses VERDANT's
 * 64.1-day Kepler period as a time scale, NOT a validated N-body ephemeris.
 * Time is based on wall-clock UTC and persisted locally between page loads.
 */
(() => {
  'use strict';
  const DEFAULT_MODE='WALL';
  const MODES=Object.freeze({
    WALL:5,REAL:1,FAST:100,TEST:1440,DEMO:86400
  });
  const STORAGE_KEY='eventHorizon.clock.wall.v1';
  const SIMULATION_EPOCH_UTC='2026-11-19T00:00:00.000Z';
  const EPOCH_MS=Date.parse(SIMULATION_EPOCH_UTC);
  const DAY_SECONDS=86400;
  const MAX_RATE=1e6;
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

  const physics=window.EventHorizonPhysicalSystem;
  const visual=window.EventHorizonRebuild;
  const physicalVerdant=physics?.plannedPlanets?.find(p=>p.name==='VERDANT');
  const visualVerdant=visual?.state(0,440,736)?.planets?.find(p=>p.name==='VERDANT');
  const physicalPeriodSeconds=physicalVerdant?.keplerPeriodSeconds||64.1*DAY_SECONDS;
  const visualPeriod=visualVerdant?.period||287.3878;
  const ratio=visualPeriod/physicalPeriodSeconds;

  function safeRead(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(!value||value.version!==1||!Number.isFinite(value.baseSimSeconds)||
         !Number.isFinite(value.anchorRealMs)||!Number.isFinite(value.rate)||
         value.rate<0||value.rate>MAX_RATE||
         !['WALL','REAL','FAST','TEST','DEMO','CUSTOM'].includes(value.mode)||
         typeof value.paused!=='boolean')return null;
      // Reject dates from wildly wrong clock or corrupt backup data.
      if(value.anchorRealMs<1600000000000||value.anchorRealMs>4102444800000)return null;
      return value;
    }catch(_){return null;}
  }
  function safeWrite(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}
  }
  function fresh(now){
    return {version:1,baseSimSeconds:0,anchorRealMs:now,
      mode:DEFAULT_MODE,rate:MODES[DEFAULT_MODE],paused:false};
  }
  let state=safeRead()||fresh(Date.now());
  if(!Object.hasOwn(MODES,state.mode)&&state.mode!=='CUSTOM')state=fresh(Date.now());

  function simSeconds(now=Date.now()){
    return state.baseSimSeconds+(state.paused?0:(now-state.anchorRealMs)/1000*state.rate);
  }
  function visualTime(now=Date.now()){return simSeconds(now)*ratio;}
  function setReference(nextSimSeconds,now=Date.now()){
    if(!Number.isFinite(nextSimSeconds)||!Number.isFinite(now))throw new RangeError('Invalid clock time');
    state={...state,baseSimSeconds:nextSimSeconds,anchorRealMs:now};
    safeWrite();
    return snapshot(now);
  }
  function setMode(mode,now=Date.now()){
    if(!Object.hasOwn(MODES,mode))throw new RangeError('Invalid clock mode');
    const elapsed=simSeconds(now);
    state={...state,mode,rate:MODES[mode],baseSimSeconds:elapsed,anchorRealMs:now};
    safeWrite();
    return snapshot(now);
  }
  function setRate(rate,now=Date.now()){
    const value=Number(rate);
    if(!Number.isFinite(value)||value<.001||value>MAX_RATE)
      throw new RangeError('Clock rate must be between 0.001× and 1,000,000×');
    const elapsed=simSeconds(now);
    state={...state,mode:'CUSTOM',rate:value,baseSimSeconds:elapsed,anchorRealMs:now};
    safeWrite();
    return snapshot(now);
  }
  function setPaused(paused,now=Date.now()){
    const elapsed=simSeconds(now);
    state={...state,paused:Boolean(paused),baseSimSeconds:elapsed,anchorRealMs:now};
    safeWrite();
    return snapshot(now);
  }
  function nextPass(now=Date.now()){
    const current=visualTime(now);
    const next=visual?.nextHeroPass?.(current);
    if(!Number.isFinite(next))return null;
    // Treat exact passes as one complete cycle away; avoid "0 seconds"
    // ETA becoming stuck while the planet is already at its peri-camera pass.
    const target=next-current<1e-7?next+visualPeriod:next;
    const deltaVisual=Math.max(0,target-current);
    const simUntilSeconds=deltaVisual/ratio;
    return Object.freeze({
      nextVisualTime:target,
      simulatedSecondsUntil:simUntilSeconds,
      realSecondsUntil:state.paused?null:simUntilSeconds/state.rate,
      realTimeISO:state.paused?null:new Date(now+simUntilSeconds/state.rate*1000).toISOString(),
      kind:'illustrative camera pass',
      physicallyPredicted:false
    });
  }
  function jumpToNextPass(now=Date.now()){
    const next=nextPass(now);
    if(!next)throw new Error('No close pass available in the renderer');
    return setReference(next.nextVisualTime/ratio,now);
  }
  function reset(now=Date.now()){
    state=fresh(now);
    safeWrite();
    return snapshot(now);
  }
  function snapshot(now=Date.now()){
    const seconds=simSeconds(now);
    return Object.freeze({
      mode:state.mode,rate:state.rate,paused:state.paused,
      simSeconds:seconds,simDays:seconds/DAY_SECONDS,
      visualTime:seconds*ratio,
      simulatedDateISO:new Date(EPOCH_MS+seconds*1000).toISOString(),
      periodSeconds:physicalPeriodSeconds,
      periodRealDays:physicalPeriodSeconds/(DAY_SECONDS*state.rate),
      visualPeriod,orbitToPhysicalRatio:ratio,
      epochUTC:SIMULATION_EPOCH_UTC,
      stage:'time-scaled illustrative orbits; not N-body physics',
      persistence:'browser-localStorage; no cross-device sync'
    });
  }
  window.EventHorizonSceneClock=Object.freeze({
    MODES,STORAGE_KEY,SIMULATION_EPOCH_UTC,
    snapshot,simSeconds,visualTime,nextPass,jumpToNextPass,
    setMode,setRate,setPaused,reset
  });
})();