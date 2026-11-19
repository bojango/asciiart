/* EVENT HORIZON / source-faithful RGB compositor
 * Adapted from the owner's authorised JIN2 black_hole.py reference.
 * Recreates per-pixel RGB luminance, TRAIL=0.4 + BLEND_MAX, plus two
 * BLEND_ADD Gaussian glow layers without Canvas alpha accumulation.
 * Experimental only: production scenes are untouched.
 */
(() => {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const n=clamp(v);return n*n*(3-2*n)};
  const TAGS=[
    [[190,38,12],[242,78,20],[255,124,34],[255,172,78],[255,222,168]],
    [[107,37,100],[178,67,143],[224,125,178],[246,182,215],[255,230,248]],
    [[41,78,103],[74,128,148],[125,180,189],[208,203,159],[255,233,203]]
  ];
  // Owner-approved locked 14-value preset, 2026-11-19 at 10:47.
  // Visual baseline for future orbital-physics work. Values are kept exact.
  const defaults=Object.freeze({
    brightness:2,coreExposure:3.85,
    coreBloomStrength:3.45,coreBloomRadius:2.25,coreThreshold:.80,coreWhiteLift:.80,
    warmth:1.7,saturation:1.15,gamma:1,contrast:.9,highlightRolloff:.2,
    bloomStrength:2,bloomRadiusSmall:1.05,bloomRadiusWide:1.8
  });
  const limits=Object.freeze({
    brightness:[.25,16,.25],coreExposure:[.10,8,.05],
    coreBloomStrength:[0,6,.05],coreBloomRadius:[.25,6,.05],
    coreThreshold:[.2,1.5,.05],coreWhiteLift:[0,1,.05],
    warmth:[0,3,.05],saturation:[0,2.5,.05],
    gamma:[.25,3,.05],contrast:[.25,4,.05],
    highlightRolloff:[0,1,.05],bloomStrength:[0,4,.05],
    bloomRadiusSmall:[.25,6,.05],bloomRadiusWide:[.5,12,.05]
  });
  const params={...defaults};
  const getParams=()=>({...params});
  const getDefaults=()=>({...defaults});
  let sizes=null,art,actx,trail,tctx,trailData,bloomSmall,bloomWide,
      smallCtx,wideCtx,tempSmall,tempWide,tempSmallCtx,tempWideCtx,
      coreArt,coreArtCtx,coreGlow,coreGlowCtx,coreTemp,coreTempCtx,lastTime=null;
  const createCanvas=(w,h)=>{
    if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  };
  const create=(w,h)=>{const canvas=createCanvas(w,h);return [canvas,canvas.getContext('2d',{willReadFrequently:true})]};
  const stats={active:false,pixels:0,brightPixels:0,totalGlyphs:0,rawMax:0,reason:''};
  function allocate(view){
    const pad=26;
    const x=Math.max(0,Math.floor(view.x-view.halfSpan-pad)),y=Math.max(0,Math.floor(view.y-view.halfHeight-pad));
    const w=Math.max(1,Math.min(view.width-x,Math.ceil(view.halfSpan*2+pad*2)));
    const h=Math.max(1,Math.min(view.height-y,Math.ceil(view.halfHeight*2+pad*2)));
    const next=[x,y,w,h];
    if(sizes&&sizes.every((v,i)=>v===next[i]))return;
    sizes=next;
    [art,actx]=create(w,h);[trail,tctx]=create(w,h);
    [bloomSmall,smallCtx]=create(Math.ceil(w/4),Math.ceil(h/4));
    [bloomWide,wideCtx]=create(Math.ceil(w/8),Math.ceil(h/8));
    [tempSmall,tempSmallCtx]=create(bloomSmall.width,bloomSmall.height);
    [tempWide,tempWideCtx]=create(bloomWide.width,bloomWide.height);
    // Independent, spatially masked core light. Never accumulated as a trail.
    [coreArt,coreArtCtx]=create(w,h);
    [coreGlow,coreGlowCtx]=create(Math.ceil(w/4),Math.ceil(h/4));
    [coreTemp,coreTempCtx]=create(coreGlow.width,coreGlow.height);
    trailData=new Uint8ClampedArray(w*h*4);
    for(let i=3;i<trailData.length;i+=4)trailData[i]=255;
    lastTime=null;
  }
  function tint(heat,palette){
    // The defaults deliberately reproduce the current, approved preview.
    // Controls affect only RGB tone, not field geometry or character sampling.
    const base=TAGS[palette][heat<.1?0:heat<.2?1:heat<.45?2:heat<.75?3:4];
    const warmBoost=smooth((heat-.42)/.22);
    const coreBoost=smooth((heat-.74)/.12);
    const lum=clamp(.50+1.02*heat,0,1.58)*(.38+.62*smooth((heat-.07)/.15));
    const coreMask=smooth((heat-.55)/.25);
    const exposure=params.brightness*(1+(params.coreExposure-1)*coreMask);
    const out=base.map(v=>v*lum);
    out[0]+=10*warmBoost+10*coreBoost;
    out[1]+=22*warmBoost+28*coreBoost;
    out[2]+= 8*warmBoost+54*coreBoost;
    const warmth=params.warmth-1;
    const warmMask=smooth((heat-.28)/.35);
    out[0]*=1+.12*warmth*warmMask;
    out[1]*=1+.20*warmth*warmMask;
    out[2]*=1-.08*warmth*warmMask;
    let channels=out.map(v=>Math.max(0,v*exposure/255));
    if(params.saturation!==1){
      const luma=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
      channels=channels.map(v=>Math.max(0,luma+(v-luma)*params.saturation));
    }
    if(params.contrast!==1){
      channels=channels.map(v=>v===0?0:Math.max(0,.18+(v-.18)*params.contrast));
    }
    if(params.gamma!==1){
      channels=channels.map(v=>Math.pow(v,1/params.gamma));
    }
    // Soft highlight knee keeps individual RGB channels separated instead
    // of immediately clipping each of them to the same 255 grey.
    const shoulder=params.highlightRolloff;
    if(shoulder>0){
      const knee=1-.82*shoulder;
      const width=1-knee;
      channels=channels.map(v=>v<=knee?v:knee+width*(1-Math.exp(-(v-knee)/width)));
    }
    return channels.map(v=>Math.round(clamp(v)*255));
  }
  function coreMask(point,view){
    const r=Math.hypot(point.x-view.x,point.y-view.y)/Math.max(1,view.hole);
    if(r<.98)return 0;
    const radial=Math.exp(-.5*Math.pow((r-1.52)/.85,2));
    const hot=smooth((point.heat-params.coreThreshold)/.38);
    return clamp(radial*hot);
  }
  function gaussian(srcCtx,dstCtx,w,h,sigma){
    const pixels=srcCtx.getImageData(0,0,w,h).data;
    const radius=Math.ceil(sigma*2.5),kernel=new Float32Array(radius*2+1);
    let norm=0;for(let k=-radius;k<=radius;k++){const v=Math.exp(-.5*Math.pow(k/sigma,2));kernel[k+radius]=v;norm+=v}
    for(let i=0;i<kernel.length;i++)kernel[i]/=norm;
    const tmp=new Float32Array(w*h*3),out=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const pixel=(y*w+x)*3;
      for(let channel=0;channel<3;channel++){
        let value=0;
        for(let d=-radius;d<=radius;d++){
          const xx=clamp(x+d,0,w-1);
          value+=pixels[(y*w+xx)*4+channel]*kernel[d+radius];
        }
        tmp[pixel+channel]=value;
      }
    }
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const pixel=(y*w+x)*4;
      for(let channel=0;channel<3;channel++){
        let value=0;
        for(let d=-radius;d<=radius;d++){
          const yy=clamp(y+d,0,h-1);
          value+=tmp[(yy*w+x)*3+channel]*kernel[d+radius];
        }
        out[pixel+channel]=Math.round(value);
      }
      out[pixel+3]=255;
    }
    dstCtx.putImageData(new ImageData(out,w,h),0,0);
  }
  function blurAtDownscale(tmpCtx,dstCtx,dstCanvas,sigma){
    const w=dstCanvas.width,h=dstCanvas.height;
    tmpCtx.globalCompositeOperation='source-over';
    tmpCtx.fillStyle='#000';tmpCtx.fillRect(0,0,w,h);
    tmpCtx.imageSmoothingEnabled=true;tmpCtx.drawImage(trail,0,0,w,h);
    gaussian(tmpCtx,dstCtx,w,h,sigma);
  }
  function composite(ctx,view,shadow){
    if(typeof shadow==='function')shadow(ctx,view);
    const [x0,y0,w,h]=sizes;
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=1;ctx.drawImage(trail,x0,y0);
    // Multiple additive passes permit bloom >1x without invalid globalAlpha.
    // Source pixels remain black where there is no gas light.
    function bloom(layer,alpha){
      let remaining=alpha*params.bloomStrength;
      while(remaining>.001){
        const portion=Math.min(1,remaining);
        ctx.globalAlpha=portion;
        ctx.drawImage(layer,x0,y0,w,h);
        remaining-=portion;
      }
    }
    bloom(bloomSmall,.98);
    bloom(bloomWide,.62);
    if(params.coreBloomStrength>0)
      bloom(coreGlow,.85*params.coreBloomStrength);
    ctx.restore();
  }
  function draw(ctx,view,time,points,palette,font,shadow){
    if(!Array.isArray(points))return false;
    if(lastTime!==null&&time<lastTime-.3)sizes=null;
    allocate(view);
    const [x0,y0,w,h]=sizes;
    // Match the reference's 30fps cap for the expensive light simulation.
    // The full page/planets remain free to redraw at display refresh speed.
    if(lastTime!==null&&time-lastTime>=0&&time-lastTime<1/30){
      composite(ctx,view,shadow);return true;
    }
    actx.globalCompositeOperation='source-over';
    actx.fillStyle='#000';actx.fillRect(0,0,w,h);
    actx.textBaseline='middle';actx.font=font;
    const drawCore=params.coreBloomStrength>0;
    if(drawCore){
      coreArtCtx.globalCompositeOperation='source-over';
      coreArtCtx.fillStyle='#000';coreArtCtx.fillRect(0,0,w,h);
      coreArtCtx.textBaseline='middle';coreArtCtx.font=font;
    }
    let count=0;
    for(const point of points){
      const heat=point.heat;
      if(!(heat>.07))continue;
      let colour=tint(heat,palette);
      const mask=(drawCore||params.coreWhiteLift>0)?coreMask(point,view):0;
      if(params.coreWhiteLift>0&&mask>0){
        const lift=clamp(mask*params.coreWhiteLift),white=[255,253,243];
        colour=colour.map((v,c)=>Math.round(v+(white[c]-v)*lift));
      }
      actx.fillStyle='rgb('+colour.join(',')+')';
      actx.fillText(point.char,point.x-x0,point.y-y0);
      if(drawCore&&mask>.015){
        coreArtCtx.fillStyle='rgb('+
          [255,249,225].map(v=>Math.round(v*mask)).join(',')+')';
        coreArtCtx.fillText(point.char,point.x-x0,point.y-y0);
      }
      count++;
    }
    stats.totalGlyphs=count;
    const frame=actx.getImageData(0,0,w,h).data;
    let bright=0,max=0;
    // Pygame BLEND_MULT(.4) then BLEND_MAX: exact RGB pixel arithmetic.
    // Alpha stays opaque 255 so black never becomes a bright layer.
    for(let i=0;i<trailData.length;i+=4){
      trailData[i]=Math.max(Math.round(trailData[i]*.4),frame[i]);
      trailData[i+1]=Math.max(Math.round(trailData[i+1]*.4),frame[i+1]);
      trailData[i+2]=Math.max(Math.round(trailData[i+2]*.4),frame[i+2]);
      trailData[i+3]=255;
      max=Math.max(max,trailData[i],trailData[i+1],trailData[i+2]);
      if(trailData[i]>190&&trailData[i+1]>175)bright++;
    }
    stats.pixels=w*h;stats.brightPixels=bright;stats.rawMax=max;
    tctx.putImageData(new ImageData(trailData,w,h),0,0);
    blurAtDownscale(tempSmallCtx,smallCtx,bloomSmall,params.bloomRadiusSmall);
    blurAtDownscale(tempWideCtx,wideCtx,bloomWide,params.bloomRadiusWide);
    if(drawCore){
      const cw=coreGlow.width,ch=coreGlow.height;
      coreTempCtx.globalCompositeOperation='source-over';
      coreTempCtx.fillStyle='#000';coreTempCtx.fillRect(0,0,cw,ch);
      coreTempCtx.imageSmoothingEnabled=true;
      coreTempCtx.drawImage(coreArt,0,0,cw,ch);
      gaussian(coreTempCtx,coreGlowCtx,cw,ch,params.coreBloomRadius);
      // Retain the dark silhouette, even with strong selective glow.
      coreGlowCtx.save();
      coreGlowCtx.globalCompositeOperation='destination-out';
      coreGlowCtx.beginPath();
      coreGlowCtx.arc((view.x-x0)/4,(view.y-y0)/4,
        view.hole*.93/4,0,Math.PI*2);
      coreGlowCtx.fill();
      coreGlowCtx.restore();
    }
    // Crisp RGB + two existing blooms + optional isolated core bloom.
    composite(ctx,view,shadow);
    stats.active=true;stats.reason='';lastTime=time;
    return true;
  }
  function setParams(next={}){
    if(!next||typeof next!=='object')return getParams();
    let changed=false,tonalChange=false;
    for(const key of Object.keys(defaults)){
      if(!Object.prototype.hasOwnProperty.call(next,key))continue;
      const n=Number(next[key]);
      if(!Number.isFinite(n))continue;
      const [min,max,step]=limits[key];
      const v=Number((Math.round((clamp(n,min,max)-min)/step)*step+min).toFixed(3));
      if(v!==params[key]){
        params[key]=v;changed=true;
        if(!['bloomStrength','bloomRadiusSmall','bloomRadiusWide',
          'coreBloomStrength','coreBloomRadius','coreThreshold'].includes(key))
          tonalChange=true;
      }
    }
    if(changed){
      // Tone changes invalidate temporal RGB trails. Bloom-only changes can
      // reuse the original trail pixels; both force a fresh display frame.
      if(tonalChange&&trailData)for(let i=0;i<trailData.length;i+=4){
        trailData[i]=0;trailData[i+1]=0;trailData[i+2]=0;trailData[i+3]=255;
      }
      lastTime=null;
    }
    return getParams();
  }
  function setBrightness(value){return setParams({brightness:value}).brightness}
  window.EventHorizonSourceCompositor={
    draw,getParams,getDefaults,setParams,setBrightness,
    get brightness(){return params.brightness},needsFrame(time,view){
      if(!sizes||lastTime===null||time<lastTime-.3||time-lastTime>=1/30)return true;
      const pad=26,x=Math.max(0,Math.floor(view.x-view.halfSpan-pad)),y=Math.max(0,Math.floor(view.y-view.halfHeight-pad));
      const w=Math.max(1,Math.min(view.width-x,Math.ceil(view.halfSpan*2+pad*2))),
            h=Math.max(1,Math.min(view.height-y,Math.ceil(view.halfHeight*2+pad*2)));
      return sizes[0]!==x||sizes[1]!==y||sizes[2]!==w||sizes[3]!==h;
    },
    reset(){sizes=null;lastTime=null},stats:()=>({...stats})
  };
})();