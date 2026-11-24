/* EVENT HORIZON — screen-space event forecasts for the illustrative
 * eight-planet renderer. These are *not* validated physical ephemerides.
 * The all-eight centre-line event is deliberately not fabricated when absent.
 */
(() => {
  'use strict';
  const scene=window.EventHorizonRebuild;
  const clock=window.EventHorizonSceneClock;
  const ROLL=17*Math.PI/180;
  const C=Math.cos(ROLL),S=Math.sin(ROLL);
  const DAY=86400;
  const SIM_HOUR=3600;
  const MAX_ALIGNMENT_YEARS=10;
  const threshold=0.55;
  function frame(width,height){
    const camera=scene.camera(width,height);
    return {camera,hole:45.76*camera.scale,width,height};
  }
  function positions(visualTime,view){
    return scene.state(visualTime,view.width,view.height).planets;
  }
  function discPresence(planet,view){
    if(planet.depth>0||
       planet.x+planet.radius<0||planet.x-planet.radius>view.width||
       planet.y+planet.radius<0||planet.y-planet.radius>view.height)return false;
    const dx=planet.x-view.camera.cx,dy=planet.y-view.camera.cy;
    const u=dx*C+dy*S,v=-dx*S+dy*C;
    const rho=Math.hypot(u/view.hole,v/(view.hole*.27));
    // Include the central shadow so a foreground transit stays active while
    // the planet crosses the black hole, not just the illuminated annulus.
    return rho<=5.1;
  }
  function aligned(planetPositions,view){
    // All EIGHT planet centres must be near the screen's vertical centre,
    // and all bodies must be within the available artwork viewport.
    const maxX=Math.max(6,view.hole*threshold);
    return planetPositions.length===8&&planetPositions.every(p=>
      Math.abs(p.x-view.camera.cx)<=maxX&&
      p.y+p.radius>=0&&p.y-p.radius<=view.height);
  }
  function bisection(lo,hi,accept){
    for(let i=0;i<15;i++){
      const mid=(lo+hi)*.5;
      if(accept(mid))hi=mid;else lo=mid;
    }
    return hi;
  }
  // A transit uses the same foreground projection as the 'next disc'
  // forecast. Count down to the modelled exit, not an invented duration.
  function activeAccretionVisual(startVisual,width,height){
    const view=frame(width,height);
    const active=positions(startVisual,view).filter(p=>discPresence(p,view));
    if(!active.length)return null;
    const hole=view.camera;
    // When two bodies overlap, track the one closest to the central shadow.
    active.sort((a,b)=>Math.hypot(a.x-hole.cx,a.y-hole.cy)-
      Math.hypot(b.x-hole.cx,b.y-hole.cy));
    const bodyName=active[0].name;
    const present=t=>{
      const body=positions(t,view).find(p=>p.name===bodyName);
      return Boolean(body&&discPresence(body,view));
    };
    const ratio=clock.snapshot().orbitToPhysicalRatio;
    const step=2*SIM_HOUR*ratio;
    const count=Math.ceil(365*DAY/(2*SIM_HOUR));
    let prior=startVisual;
    for(let i=1;i<=count;i++){
      const now=startVisual+i*step;
      if(!present(now)){
        const exit=bisection(prior,now,t=>!present(t));
        return Object.freeze({name:bodyName,exitVisualTime:exit,
          event:'planet exits projected foreground accretion-disc region',
          physicallyPredicted:false});
      }
      prior=now;
    }
    return Object.freeze({name:bodyName,exitVisualTime:null,
      event:'projected foreground accretion-disc transit; exit not found',
      physicallyPredicted:false});
  }
  function nextAccretionVisual(startVisual,width,height){
    const view=frame(width,height);
    const ratio=clock.snapshot().orbitToPhysicalRatio;
    const step=2*SIM_HOUR*ratio;
    const count=Math.ceil(365*DAY/(2*SIM_HOUR));
    let previous=positions(startVisual,view).map(p=>discPresence(p,view));
    for(let i=1;i<=count;i++){
      const now=startVisual+i*step;
      const ps=positions(now,view);
      for(let j=0;j<ps.length;j++){
        const present=discPresence(ps[j],view);
        if(present&&!previous[j]){
          const name=ps[j].name,lo=now-step;
          const refined=bisection(lo,now,t=>{
            const body=positions(t,view).find(p=>p.name===name);
            return body?discPresence(body,view):false;
          });
          return Object.freeze({
            name,visualTime:refined,
            event:'planet enters projected foreground accretion-disc region',
            physicallyPredicted:false
          });
        }
      }
      previous=ps.map(p=>discPresence(p,view));
    }
    return null;
  }
  function searchAlignmentAsync(startVisual,width,height,onResult){
    const view=frame(width,height);
    const ratio=clock.snapshot().orbitToPhysicalRatio;
    const step=6*SIM_HOUR*ratio;
    const steps=Math.ceil(MAX_ALIGNMENT_YEARS*365.25*DAY/(6*SIM_HOUR));
    let index=0,cancelled=false;
    function chunk(){
      if(cancelled)return;
      const stop=Math.min(steps,index+280);
      while(index<stop){
        index++;
        const at=startVisual+index*step;
        if(aligned(positions(at,view),view)){
          const first=bisection(at-step,at,
            t=>aligned(positions(t,view),view));
          onResult(Object.freeze({
            visualTime:first,event:'all-eight screen-centre alignment',
            physicallyPredicted:false
          }));
          return;
        }
      }
      if(index<steps)setTimeout(chunk,0);
      else onResult(null);
    }
    setTimeout(chunk,0);
    return ()=>{cancelled=true};
  }
  // First pairwise conjunction in *barycentric orbital longitude*.
  // This is a model prediction from the evolving 3D ten-body state, not
  // a claim that the two worlds are physically adjacent or observable.
  function nextConjunctionVisual(startVisual,horizonDays=365){
    const nbody=window.EventHorizonNBody;
    if(!nbody)return null;
    const names=nbody.ELEMENTS.map(p=>p.name);
    const differences=(t)=>{
      const bodies=nbody.stateAtSeconds(t).slice(2);
      const result=[];
      for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
        const a=Math.atan2(bodies[i].y,bodies[i].x);
        const b=Math.atan2(bodies[j].y,bodies[j].x);
        result.push({i,j,delta:Math.atan2(Math.sin(a-b),Math.cos(a-b))});
      }
      return result;
    };
    const step=6*SIM_HOUR,limit=Math.ceil(horizonDays*DAY/step);
    let previous=differences(startVisual);
    for(let i=1;i<=limit;i++){
      const t=startVisual+i*step,current=differences(t);
      for(let j=0;j<current.length;j++){
        const old=previous[j].delta,next=current[j].delta;
        if(old*next>0||Math.abs(old)>Math.PI/2||
           Math.abs(next)>Math.PI/2)continue;
        const a=current[j].i,b=current[j].j;
        let lo=t-step,hi=t;
        const firstSign=Math.sign(old)||1;
        for(let k=0;k<21;k++){
          const mid=(lo+hi)*.5;
          const d=differences(mid)[j].delta;
          if(Math.sign(d)===firstSign)lo=mid;else hi=mid;
        }
        return Object.freeze({name:names[a]+' / '+names[b],
          visualTime:hi,event:'barycentric longitude conjunction',
          physicallyPredicted:false,origin:'assumed-parameter N-body numerical model'});
      }
      previous=current;
    }
    return null;
  }
  function wallDate(visualTime,now=Date.now()){
    if(!Number.isFinite(visualTime))return null;
    const snapshot=clock.snapshot(now);
    if(snapshot.paused||!(snapshot.rate>0))return null;
    const simulatedSeconds=(visualTime-snapshot.visualTime)/
      snapshot.orbitToPhysicalRatio;
    if(simulatedSeconds<0)return null;
    const millis=now+1000*simulatedSeconds/snapshot.rate;
    return Number.isFinite(millis)&&Math.abs(millis)<8.64e15?
      new Date(millis).toISOString():null;
  }
  window.EventHorizonEventForecast=Object.freeze({
    nextAccretionVisual,activeAccretionVisual,nextConjunctionVisual,searchAlignmentAsync,wallDate,discPresence,
    MAX_ALIGNMENT_YEARS,alignmentTolerance:'55% of reference hole radius',
    physicallyPredicted:false
  });
})();