/* EVENT HORIZON / Newtonian 3D ten-body integration.
 * Eight assumed-mass planets interact with a 5 M_sun black hole and a
 * 0.4 M_sun Roche-filling donor. The binary is also free to respond.
 * Assumed planet masses, inclinations, eccentricities, nodes and epochs are
 * explicitly fictional initial conditions, not observed measurements.
 * Kick-drift-kick velocity Verlet; fixed 300-second integration steps.
 * No relativistic precession, hydrodynamics, mass evolution or collisions.
 */
(() => {
  'use strict';
  const physical=typeof window!=='undefined'?window.EventHorizonPhysicalSystem:null;
  if(!physical)return;
  const TAU=Math.PI*2,AU_M=physical.SI.AU_M,DAY=86400;
  const G=physical.SI.G*physical.SI.SOLAR_MASS_KG*DAY*DAY/(AU_M*AU_M*AU_M);
  const EARTH=5.9722e24/physical.SI.SOLAR_MASS_KG;
  const JUPITER=1.89813e27/physical.SI.SOLAR_MASS_KG;
  // In order CINDER, SILEX, VERDANT, RUST, ATLAS, HALO, AZURE, UMBRA.
  const ELEMENTS=Object.freeze([
    ['CINDER',.30,.007,5,10,0.35,.7*EARTH],
    ['SILEX',.42,.015,17,78,2.20,1.1*EARTH],
    ['VERDANT',.55,.010,9,148,4.10,1.0*EARTH],
    ['RUST',.75,.022,31,228,1.25,.65*EARTH],
    ['ATLAS',1.00,.012,4,302,3.80,.55*JUPITER],
    ['HALO',1.30,.016,25,28,5.20,.35*JUPITER],
    ['AZURE',1.75,.018,38,126,2.72,14*EARTH],
    ['UMBRA',2.40,.025,12,254,.90,8*EARTH]
  ].map(([name,a,e,inclinationDeg,nodeDeg,meanAnomaly,massSolar])=>
    Object.freeze({name,a,e,inclinationDeg,nodeDeg,meanAnomaly,massSolar})));
  const names=Object.freeze(['BLACK_HOLE','DONOR_STAR',...ELEMENTS.map(p=>p.name)]);
  const masses=new Float64Array([5,.4,...ELEMENTS.map(p=>p.massSolar)]);
  const N=masses.length,DT_S=300,CHECK_EVERY=24,MAX_CHECKPOINTS=5000;
  const totalMass=masses.reduce((a,b)=>a+b,0);
  const phase=(a)=>((a%TAU)+TAU)%TAU;
  const copy=state=>({step:state.step,
    x:new Float64Array(state.x),v:new Float64Array(state.v)});
  const epoch={step:0,x:new Float64Array(N*3),v:new Float64Array(N*3)};
  // A circular Roche-filling binary in the X/Y plane, centred initially
  // on the two-body barycentre. Planetary backreaction is integrated.
  const aBin=physical.binary.separationAU;
  const omega=Math.sqrt(G*(masses[0]+masses[1])/(aBin*aBin*aBin));
  epoch.x[0]=-aBin*masses[1]/(masses[0]+masses[1]);
  epoch.x[3]=aBin*masses[0]/(masses[0]+masses[1]);
  epoch.v[1]=epoch.x[0]*omega;
  epoch.v[4]=epoch.x[3]*omega;
  // Standard orbital elements -> Cartesian barycentric state, with the
  // binary's full mass as the dominant Keplerian central potential.
  ELEMENTS.forEach((p,i)=>{
    const j=(i+2)*3;
    let E=p.meanAnomaly;
    for(let n=0;n<9;n++)E-=(E-p.e*Math.sin(E)-p.meanAnomaly)/(1-p.e*Math.cos(E));
    const cs=Math.cos(E),sn=Math.sin(E),q=Math.sqrt(1-p.e*p.e);
    const x=p.a*(cs-p.e),y=p.a*q*sn;
    const factor=Math.sqrt(G*(masses[0]+masses[1])/p.a)/(1-p.e*cs);
    const vx=-factor*sn,vy=factor*q*cs;
    const node=p.nodeDeg*Math.PI/180,inc=p.inclinationDeg*Math.PI/180;
    const cn=Math.cos(node),ss=Math.sin(node),ci=Math.cos(inc),si=Math.sin(inc);
    epoch.x[j]=x*cn-y*ss*ci;
    epoch.x[j+1]=x*ss+y*cn*ci;
    epoch.x[j+2]=y*si;
    epoch.v[j]=vx*cn-vy*ss*ci;
    epoch.v[j+1]=vx*ss+vy*cn*ci;
    epoch.v[j+2]=vy*si;
  });
  // Bring the full system, including planets, into its actual initial
  // ten-body centre-of-mass frame with zero total linear momentum.
  for(const field of ['x','v']){
    const sums=[0,0,0];
    for(let i=0;i<N;i++)for(let k=0;k<3;k++)sums[k]+=masses[i]*epoch[field][3*i+k];
    for(let i=0;i<N;i++)for(let k=0;k<3;k++)epoch[field][3*i+k]-=sums[k]/totalMass;
  }
  function accelerations(x){
    const a=new Float64Array(N*3);
    for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){
      const ii=i*3,jj=j*3;
      const dx=x[jj]-x[ii],dy=x[jj+1]-x[ii+1],dz=x[jj+2]-x[ii+2];
      const rsq=dx*dx+dy*dy+dz*dz;
      if(rsq<1e-12)throw Error('Unresolved close approach: orbit integration halted');
      const inv=G/(rsq*Math.sqrt(rsq)),mi=masses[i]*inv,mj=masses[j]*inv;
      a[ii]+=mj*dx;a[ii+1]+=mj*dy;a[ii+2]+=mj*dz;
      a[jj]-=mi*dx;a[jj+1]-=mi*dy;a[jj+2]-=mi*dz;
    }
    return a;
  }
  function advance(state,dtDays){
    const before=accelerations(state.x),h=dtDays;
    for(let j=0;j<N*3;j++)state.v[j]+=.5*h*before[j];
    for(let j=0;j<N*3;j++)state.x[j]+=h*state.v[j];
    const after=accelerations(state.x);
    for(let j=0;j<N*3;j++)state.v[j]+=.5*h*after[j];
    return state;
  }
  const checkpoints=new Map([[0,copy(epoch)]]);
  let recent=copy(epoch);
  function stepTo(target){
    if(!Number.isSafeInteger(target)||Math.abs(target)>6e7)
      throw new RangeError('Time exceeds supported numerical integration range');
    if(target===recent.step)return copy(recent);
    const sign=target>=0?1:-1;
    // Find the closest checkpoint on the same side of the epoch and not
    // beyond the requested simulation time. Reuse recent when appropriate.
    let anchor=copy(epoch),distance=Math.abs(target);
    for(const candidate of [...checkpoints.values(),recent]){
      if(candidate.step*sign<0||Math.abs(candidate.step)>Math.abs(target))continue;
      const d=Math.abs(target-candidate.step);
      if(d<distance){anchor=candidate;distance=d}
    }
    let next=copy(anchor),count=0;
    while(next.step!==target){
      advance(next,sign*DT_S/DAY);
      next.step+=sign;
      if(++count>6e7)throw Error('Integration step budget exceeded');
      if(next.step%CHECK_EVERY===0){
        checkpoints.set(next.step,copy(next));
        if(checkpoints.size>MAX_CHECKPOINTS){
          // Keep epoch and recent checkpoints bounded in memory.
          for(const key of checkpoints.keys())if(key!==0){checkpoints.delete(key);break}
        }
      }
    }
    recent=copy(next);
    return next;
  }
  function stateAtSeconds(t){
    if(!Number.isFinite(t))throw new RangeError('Simulation time must be finite');
    const step=Math.floor(t/DT_S);
    const state=stepTo(step);
    const remaining=(t-step*DT_S)/DAY;
    if(remaining>1e-12)advance(state,remaining);
    return names.map((name,i)=>{
      const j=i*3;
      return {name,massSolar:masses[i],
        x:state.x[j],y:state.x[j+1],z:state.x[j+2],
        vx:state.v[j],vy:state.v[j+1],vz:state.v[j+2]};
    });
  }
  function position(name,t){
    const i=names.indexOf(name);
    return i<0?null:stateAtSeconds(t)[i];
  }
  function energyAt(t){
    const bodies=stateAtSeconds(t);
    let ke=0,pe=0;
    for(let i=0;i<N;i++){
      const p=bodies[i];ke+=.5*masses[i]*(p.vx*p.vx+p.vy*p.vy+p.vz*p.vz);
      for(let j=0;j<i;j++){
        const q=bodies[j];
        pe-=G*masses[i]*masses[j]/Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);
      }
    }
    return {kinetic:ke,potential:pe,total:ke+pe};
  }
  // Tangent Kepler ellipse at the current integrated state. Useful for a
  // smooth and cheap guide curve. This is a local approximation: the actual
  // ten-body numerical trajectory is used for every displayed body position.
  function osculating(name,t){
    const bodies=stateAtSeconds(t),idx=names.indexOf(name);
    if(idx<2)return null;
    const body=bodies[idx],bh=bodies[0],donor=bodies[1];
    const mass=bh.massSolar+donor.massSolar;
    const central=[
      (bh.x*bh.massSolar+donor.x*donor.massSolar)/mass,
      (bh.y*bh.massSolar+donor.y*donor.massSolar)/mass,
      (bh.z*bh.massSolar+donor.z*donor.massSolar)/mass
    ];
    const velocity=[
      (bh.vx*bh.massSolar+donor.vx*donor.massSolar)/mass,
      (bh.vy*bh.massSolar+donor.vy*donor.massSolar)/mass,
      (bh.vz*bh.massSolar+donor.vz*donor.massSolar)/mass
    ];
    const r=[body.x-central[0],body.y-central[1],body.z-central[2]];
    const v=[body.vx-velocity[0],body.vy-velocity[1],body.vz-velocity[2]];
    const cross=(a,b)=>[
      a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]
    ];
    const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    const norm=a=>Math.hypot(...a),u=(a)=>a.map(x=>x/norm(a));
    const rr=norm(r),mu=G*(mass+body.massSolar);
    const h=cross(r,v),hn=u(h);
    const eccentricityVector=cross(v,h).map((x,i)=>x/mu-r[i]/rr);
    const e=norm(eccentricityVector);
    const a=1/(2/rr-dot(v,v)/mu);
    if(!(a>0&&e<1))return null;
    const p=e>1e-8?u(eccentricityVector):u(r),q=cross(hn,p);
    const cosNu=dot(r,p)/rr,sinNu=dot(r,q)/rr;
    const denom=1+e*cosNu;
    const anomaly= Math.atan2(Math.sqrt(1-e*e)*sinNu/denom,
      (e+cosNu)/denom);
    const M0=anomaly-e*Math.sin(anomaly);
    const n=Math.sqrt(mu/(a*a*a));
    function point(deltaSeconds){
      const M=M0+n*deltaSeconds/DAY;
      let E=phase(M);
      for(let i=0;i<8;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
      const xp=a*(Math.cos(E)-e),yq=a*Math.sqrt(1-e*e)*Math.sin(E);
      return {name,
        x:central[0]+p[0]*xp+q[0]*yq,
        y:central[1]+p[1]*xp+q[1]*yq,
        z:central[2]+p[2]*xp+q[2]*yq};
    }
    return {name,a,e,periodSeconds:TAU/n*DAY,point};
  }
  function osculatingPath(name,t,count=96){
    const path=osculating(name,t);
    if(!path)return [];
    return Array.from({length:count+1},(_,i)=>
      path.point(path.periodSeconds*i/count));
  }
  function estimate(name){
    const p=ELEMENTS.find(p=>p.name===name);
    if(!p)return null;
    const baseline=physical.plannedPlanets.find(q=>q.name===name);
    const // Ramanujan approximation for the initial osculating ellipse.
      b=p.a*Math.sqrt(1-p.e*p.e),h=(p.a-b)**2/(p.a+b)**2;
    const circumferenceAU=Math.PI*(p.a+b)*(1+3*h/(10+Math.sqrt(4-3*h)));
    return {...p,
      periodSeconds:baseline.keplerPeriodSeconds,
      periodDays:baseline.keplerPeriodDays,
      orbitDistanceMiles:circumferenceAU*AU_M/1609.344,
      model:'osculating Kepler approximation; actual N-body period varies'};
  }
  const api=Object.freeze({
    version:'newtonian-nbody-v1',names,ELEMENTS,
    constants:Object.freeze({G,AU_M,DT_S,EARTH,JUPITER}),
    stateAtSeconds,position,estimate,energyAt,osculating,osculatingPath,
    donorMassLossTimescaleYears:physical.companion.massSolar/
      physical.accretion.nominalTransferSolarMassesPerJulianYear,
    assumptions:'Fictional starting masses/angles; no measured ephemeris; '+
      'Newtonian gravity and fixed 5-minute leapfrog steps. Mass transfer '+
      'and stellar evolution are not dynamically simulated.'
  });
  window.EventHorizonNBody=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})();