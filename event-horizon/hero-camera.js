/* EVENT HORIZON / FOREGROUND CAMERA — Phase B visual prototype
 * Shared camera coordinates, independent of device aspect ratio.
 * Portrait crops the same spatial orbit that landscape displays more widely.
 * World units, time and the close-approach camera position are illustrative.
 * Replace with calibrated gravitational motion in the physical orbit phase.
 */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const CAMERA=Object.freeze({
    width:440,height:736,blackHoleY:.51,
    viewerDistance:319,orbitRadius:300,
    nearAxis:[4.5,18.5,299.26],
    sideAxis:[.952,.299,-.0348],
    referenceWidth:440,referenceHeight:736
  });
  function norm(v){
    const d=Math.hypot(...v);
    return v.map(n=>n/d);
  }
  function dot(a,b){return a.reduce((r,v,i)=>r+v*b[i],0);}
  const near=norm(CAMERA.nearAxis);
  const side0=CAMERA.sideAxis;
  const side=norm(side0.map((v,i)=>v-dot(side0,near)*near[i]));
  function camera(width,height){
    const w=Math.max(1,width),h=Math.max(1,height);
    // Never "fit" horizontal orbit extents into the screen. A wider display
    // exposes more of the same world; no horizontal stretching or zooming.
    const scale=Math.min(w/CAMERA.width,h/CAMERA.height);
    return {
      width:w,height:h,scale,cx:w*.5,cy:h*CAMERA.blackHoleY,
      visibleWorldHalfWidth:w/(2*scale),
      visibleWorldHalfHeight:h/(2*scale),
      viewerDistance:CAMERA.viewerDistance
    };
  }
  function orbitWorld(phase){
    const c=Math.cos(phase),s=Math.sin(phase),r=CAMERA.orbitRadius;
    return near.map((v,i)=>r*(v*c+side[i]*s));
  }
  function projectWorld(world,width,height){
    const cam=camera(width,height);
    const distance=cam.viewerDistance-world[2];
    const magnification=cam.viewerDistance/Math.max(10,distance);
    return {
      x:cam.cx+world[0]*magnification*cam.scale,
      y:cam.cy+world[1]*magnification*cam.scale,
      distance, magnification, world:[...world],scale:cam.scale,
      near:world[2]>0
    };
  }
  function position(planet,time,width,height){
    const period=planet.period;
    const angle=planet.phase+time*TAU/period;
    const projected=projectWorld(orbitWorld(angle),width,height);
    const cam=camera(width,height);
    // Realistic radial size scaling in this illustrative pinhole camera:
    // the planet's screen radius depends on viewer distance only, not width.
    const radius=planet.radius*projected.magnification*cam.scale;
    const behind=projected.distance>cam.viewerDistance;
    return {
      name:planet.name,orbit:planet.orbit,period:planet.period,
      x:projected.x,y:projected.y,
      radius,depth:behind?Math.abs(projected.world[2])/CAMERA.orbitRadius:
                    -Math.abs(projected.world[2])/CAMERA.orbitRadius,
      cameraDistance:projected.distance,
      magnification:projected.magnification,
      world:projected.world,
      foreground:projected.near,
      heroLOD:radius>=116?'CLOSE':radius>=70?'NEAR':radius>=22?'MID':radius>=10?'FAR':'MIN',
      orbitalPhase:((angle%TAU)+TAU)%TAU
    };
  }
  function closestPhase(){return 0;}
  function nextClosestTime(planet,time){
    // Illustration-only recurrence, NOT a civil-time prediction.
    // Closest camera approach occurs when angle reaches a multiple of 2π.
    const remaining=((-planet.phase-time*TAU/planet.period)%TAU+TAU)%TAU;
    return time+remaining*planet.period/TAU;
  }
  function shadowSafe(pos,width,height,hole){
    // Require the centre of the event horizon plus its brightest inner ring
    // to be entirely unobscured by the near-passing body.
    const cam=camera(width,height);
    const dist=Math.hypot(pos.x-cam.cx,pos.y-cam.cy);
    return !pos.foreground||dist>pos.radius+hole*1.72;
  }
  window.EventHorizonHeroCamera=Object.freeze({
    camera,orbitWorld,projectWorld,position,nextClosestTime,
    closestPhase,shadowSafe,
    config:CAMERA
  });
})();
