/* PELAGIC / 017 — local, permission-based iPhone sensory interaction.
 * Touch is immediate; motion and camera require explicit user gestures.
 * Camera pixels are sampled in memory at low resolution, never sent or saved.
 * No network endpoints, biometric identifiers, microphone or audio capture.
 */
(() => {
  'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const mix=(a,b,p)=>a+(b-a)*p;
  const hypo=(a,b)=>Math.hypot(a,b);
  const settings={touch:true};
  let callbacks={onPresence(){},onStartle(){},onFood(){}};
  let now=0,tiltX=0,tiltY=0,targetX=0,targetY=0,dragX=0,dragY=0;
  let motionEnabled=false,motionStatus='OFF',motionLastEvent=0,motionRequested=false;
  let lastAccel=null,lastShake=-100;
  let pointer=null,lastTap=null,interestPoint=null;
  const ripples=[];
  const camera={status:'OFF',mode:'movement',stream:null,video:null,canvas:null,context:null,
    previous:null,token:0,starting:false,detector:null,busy:false,frameAt:0,faceAt:0,
    faceVisible:false,faceWidth:0,lastPresence:-100,events:0};
  let motionEvents=0,shakeEvents=0,foodEvents=0,touchEvents=0;
  const uaStatus=()=>({
    motion:motionStatus,motionEnabled,motionEvents,tilt:[tiltX,tiltY],shakes:shakeEvents,
    camera:camera.status,cameraMode:camera.mode,cameraEnabled:!!camera.stream,cameraEvents:camera.events,
    touch:settings.touch,touches:touchEvents,offered:foodEvents,activeRipples:ripples.length,
  });
  function setCallbacks(value){callbacks={...callbacks,...(value||{})};}
  function onOrientation(e){
    if(!motionEnabled||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;
    // iPhone portrait: gamma is left/right; beta biases fore/aft current.
    // Mapping changes only water current, never directly positions the animal.
    let lateral=clamp(e.gamma/32,-1,1);
    let vertical=clamp((e.beta-40)/60,-1,1);
    const orientation=(window.screen && window.screen.orientation && window.screen.orientation.angle)||
      Number(window.orientation)||0;
    if(Math.abs(orientation)===90){
      const temp=lateral;lateral=vertical*(orientation===90?1:-1);
      vertical=-temp*(orientation===90?1:-1);
    }
    targetX=lateral*13;targetY=vertical*9;
    motionLastEvent=Date.now();motionStatus='ON';motionEvents++;
  }
  function onMotion(e){
    if(!motionEnabled)return;
    const a=e.acceleration || e.accelerationIncludingGravity;
    if(!a||!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(a.z))return;
    const vector=[a.x,a.y,a.z];
    if(lastAccel){
      const delta=hypo(vector[0]-lastAccel[0],vector[1]-lastAccel[1]);
      const jerk=hypo(delta,vector[2]-lastAccel[2]);
      const ms=Date.now();
      if(jerk>15&&ms-lastShake>8500){
        lastShake=ms;shakeEvents++;
        // Shakes usually create a disturbance, only occasionally a startle.
        dragX=clamp(dragX+vector[0]*.35,-20,20);
        dragY=clamp(dragY+vector[1]*.30,-16,16);
        ripples.push({x:.5,y:.5,normalized:true,born:now,kind:'shake'});
        if(Math.random()<.37)callbacks.onStartle('shake');
      }
    }
    lastAccel=vector;
  }
  async function startMotion(){
    if(motionEnabled)return true;
    if(motionRequested)return false;
    motionRequested=true;motionStatus='REQUESTING';
    try{
      if(typeof window.DeviceOrientationEvent==='undefined' &&
        typeof window.DeviceMotionEvent==='undefined'){
        motionStatus='UNAVAILABLE';return false;
      }
      // BOTH permission requests must begin while the click's user activation
      // is still present. Starting the second after awaiting the first fails
      // on some iPhone Safari versions.
      const req=[];
      const O=window.DeviceOrientationEvent,M=window.DeviceMotionEvent;
      if(O&&typeof O.requestPermission==='function')req.push(O.requestPermission());
      if(M&&typeof M.requestPermission==='function')req.push(M.requestPermission());
      const permissions=await Promise.all(req);
      if(document.hidden){motionStatus='OFF';return false;}
      if(permissions.some(v=>v!=='granted')){motionStatus='DENIED';return false;}
      motionEnabled=true;motionStatus='WAITING';
      window.addEventListener('deviceorientation',onOrientation,{passive:true});
      window.addEventListener('devicemotion',onMotion,{passive:true});
      return true;
    }catch(err){motionStatus='ERROR';return false;}
    finally{motionRequested=false;}
  }
  function stopMotion(){
    motionEnabled=false;motionStatus='OFF';lastAccel=null;targetX=0;targetY=0;
    window.removeEventListener('deviceorientation',onOrientation);
    window.removeEventListener('devicemotion',onMotion);
  }
  function motionAvailable(){
    return typeof window.DeviceOrientationEvent!=='undefined'||
      typeof window.DeviceMotionEvent!=='undefined';
  }
  function stopCamera(){
    camera.token++;camera.starting=false;
    if(camera.stream)camera.stream.getTracks().forEach(track=>track.stop());
    if(camera.video){
      camera.video.pause();
      camera.video.srcObject=null;
      camera.video.remove();
    }
    camera.status='OFF';camera.stream=null;camera.video=null;camera.previous=null;
    camera.context=null;camera.canvas=null;camera.detector=null;camera.busy=false;
    camera.faceVisible=false;camera.faceWidth=0;
  }
  async function startCamera(){
    if(camera.stream)return true;
    if(camera.starting)return false;
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
      camera.status='UNAVAILABLE';return false;
    }
    const token=++camera.token;
    camera.starting=true;camera.status='REQUESTING';
    let stream;
    try{
      stream=await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{facingMode:{ideal:'user'},width:{ideal:160},height:{ideal:120},frameRate:{ideal:10,max:15}},
      });
      if(token!==camera.token||document.hidden){
        stream.getTracks().forEach(track=>track.stop());return false;
      }
      const video=document.createElement('video');
      video.playsInline=true;video.autoplay=true;video.muted=true;
      video.setAttribute('playsinline','');
      video.style.cssText='position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none';
      video.srcObject=stream;document.body.appendChild(video);
      camera.stream=stream;camera.video=video;
      const work=document.createElement('canvas');work.width=64;work.height=48;
      camera.canvas=work;camera.context=work.getContext('2d',{willReadFrequently:true});
      camera.previous=null;
      const FaceAPI=window.FaceDetector;
      if(typeof FaceAPI==='function'){
        try{camera.detector=new FaceAPI({fastMode:true,maxDetectedFaces:1});}
        catch(_){camera.detector=null;}
      }
      camera.mode=camera.detector?'face':'movement';
      camera.status=camera.detector?'FACE READY':'MOVEMENT READY';
      stream.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>stopCamera(),{once:true}));
      try{await video.play();}catch(_){/* getUserMedia stream can become playable on a subsequent frame */ }
      return true;
    }catch(err){
      if(stream)stream.getTracks().forEach(track=>track.stop());
      if(token===camera.token)camera.status=err?.name==='NotAllowedError'?'DENIED':'ERROR';
      return false;
    }finally{if(token===camera.token)camera.starting=false;}
  }
  function cameraPresence(strength){
    const ms=Date.now();
    if(ms-camera.lastPresence<14000)return;
    camera.lastPresence=ms;camera.events++;
    callbacks.onPresence(clamp(strength,.30,.85),'camera');
  }
  function sampleCamera(time){
    if(!camera.stream||!camera.video||!camera.context||camera.video.readyState<2)return;
    if(time-camera.frameAt<.25)return;
    camera.frameAt=time;
    try{
      camera.context.drawImage(camera.video,0,0,64,48);
      const data=camera.context.getImageData(0,0,64,48).data;
      const mono=new Uint8Array(64*48);
      let mean=0;
      for(let i=0,j=0;i<data.length;i+=4,j++){
        const v=(77*data[i]+150*data[i+1]+29*data[i+2])>>8;
        mono[j]=v;mean+=v;
      }
      mean/=mono.length;
      if(camera.previous){
        let total=0,meanShift=0;
        const prev=camera.previous;
        for(let i=0;i<mono.length;i++){const diff=mono[i]-prev.data[i];total+=Math.abs(diff);meanShift+=diff;}
        const movement=(total/mono.length-Math.abs(meanShift/mono.length)*.72)/255;
        // Whole-frame exposure changes don't count as human movement.
        if(movement>.045)cameraPresence(.35+movement*2.1);
      }
      camera.previous={data:mono,mean};
      if(camera.status==='WAITING FOR VIDEO')camera.status=camera.detector?'FACE READY':'MOVEMENT READY';
    }catch(err){
      // Safari may briefly block frames when the video is starting/backgrounded.
      camera.status='WAITING FOR VIDEO';
    }
    if(camera.detector&&!camera.busy&&time-camera.faceAt>1.3){
      camera.faceAt=time;camera.busy=true;const token=camera.token;
      camera.detector.detect(camera.video).then(faces=>{
        if(token!==camera.token)return;
        const face=faces[0],found=!!face;
        if(found){
          const width=face.boundingBox?.width||0;
          if(!camera.faceVisible||(width>0&&camera.faceWidth>0&&width>camera.faceWidth*1.22))
            cameraPresence(.55+Math.min(.25,width/300));
          camera.faceWidth=width;camera.status='FACE VISIBLE';
        }else{camera.status='FACE READY';camera.faceWidth=0;}
        camera.faceVisible=found;
      }).catch(()=>{
        if(token===camera.token){camera.detector=null;camera.mode='movement';camera.status='MOVEMENT READY';}
      }).finally(()=>{if(token===camera.token)camera.busy=false;});
    }
  }
  function setTouchEnabled(enabled){
    settings.touch=!!enabled;
    if(!enabled){pointer=null;interestPoint=null;}
  }
  function addRipple(x,y,kind='tap'){ripples.push({x,y,born:now,kind});if(ripples.length>18)ripples.shift();}
  function pointerDown(id,x,y,time){
    if(!settings.touch)return;
    pointer={id,x,y,lastX:x,lastY:y,start:time,moved:false,held:false};
    touchEvents++;addRipple(x,y);
  }
  function pointerMove(id,x,y,time){
    if(!pointer||pointer.id!==id||!settings.touch)return;
    const dx=x-pointer.lastX,dy=y-pointer.lastY;
    pointer.lastX=x;pointer.lastY=y;
    if(hypo(x-pointer.x,y-pointer.y)>9)pointer.moved=true;
    if(pointer.moved&&hypo(dx,dy)>.5){
      dragX=clamp(dragX+dx*.43,-19,19);
      dragY=clamp(dragY+dy*.36,-14,14);
      if(ripples.length<17||time-ripples.at(-1).born>.10)addRipple(x,y,'drag');
    }
  }
  function pointerUp(id,x,y,time){
    if(!pointer||pointer.id!==id)return;
    const p=pointer;pointer=null;
    if(!settings.touch)return;
    const held=time-p.start>.65&&!p.moved;
    if(held){
      interestPoint={x,y,until:time+4.4,strength:.85};
      if(!p.held&&Math.random()<.55)callbacks.onPresence(.65,'hold');
    }else if(!p.moved&&time-p.start<.48){
      if(lastTap&&time-lastTap.time<.39&&hypo(x-lastTap.x,y-lastTap.y)<55){
        lastTap=null;addRipple(x,y,'food');
        if(callbacks.onFood({x,y})!==false)foodEvents++;
      }else lastTap={time,x,y};
    }
  }
  function pointerCancel(id){if(pointer?.id===id)pointer=null;}
  function getInterest(time){
    if(pointer&&!pointer.moved&&time-pointer.start>.65){
      if(!pointer.held){
        pointer.held=true;interestPoint={x:pointer.x,y:pointer.y,until:time+3.0,strength:.85};
        if(Math.random()<.55)callbacks.onPresence(.7,'hold');
      }
      interestPoint={x:pointer.x,y:pointer.y,until:time+.8,strength:.85};
    }
    if(!interestPoint||interestPoint.until<=time)return null;
    return {...interestPoint};
  }
  function update(dt,time){
    now=time;
    const a=1-Math.exp(-dt*2.8);
    tiltX=mix(tiltX,motionEnabled?targetX:0,a);
    tiltY=mix(tiltY,motionEnabled?targetY:0,a);
    dragX*=Math.exp(-dt*1.8);dragY*=Math.exp(-dt*1.8);
    for(let i=ripples.length-1;i>=0;i--)if(time-ripples[i].born>2)ripples.splice(i,1);
    if(camera.stream)sampleCamera(time);
    return {windX:clamp(tiltX+dragX,-24,24),windY:clamp(tiltY+dragY,-20,20)};
  }
  function draw(ctx,view){
    if(!settings.touch)return;
    const time=now,w=view.width,h=view.height;
    ctx.save();
    ctx.textBaseline='middle';ctx.font='10px ui-monospace,monospace';
    for(const r of ripples){
      const u=clamp((time-r.born)/1.85,0,1);
      const x=r.normalized?w*r.x:r.x,y=r.normalized?h*r.y:r.y;
      const rad=5+u*(r.kind==='food'?67:44);
      const opacity=(1-u)*(r.kind==='food'?.63:.33);
      const chars=r.kind==='food'?'✦':'·';
      for(let i=0;i<18;i++){
        const theta=i*Math.PI/9+r.born*.21;
        const px=x+Math.cos(theta)*rad,py=y+Math.sin(theta)*rad*.65;
        ctx.fillStyle='rgba(132,227,243,'+opacity.toFixed(3)+')';
        ctx.fillText(chars,px,py);
      }
    }
    const attract=getInterest(time);
    if(attract){
      ctx.fillStyle='rgba(194,248,247,.45)';
      ctx.fillText('✧',attract.x,attract.y-10);
    }
    ctx.restore();
  }
  function onVisibility(){
    if(document.hidden){stopCamera();stopMotion();pointer=null;interestPoint=null;}
  }
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisibility);
  const api=Object.freeze({setCallbacks,startMotion,stopMotion,motionAvailable,
    startCamera,stopCamera,setTouchEnabled,pointerDown,pointerMove,pointerUp,pointerCancel,
    update,draw,getInterest,state:uaStatus});
  window.PelagicSenses=api;
})();
