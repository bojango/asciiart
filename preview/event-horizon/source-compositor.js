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
  let sizes=null,art,actx,trail,tctx,trailData,bloomSmall,bloomWide,
      smallCtx,wideCtx,tempSmall,tempWide,tempSmallCtx,tempWideCtx,lastTime=null;
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
    trailData=new Uint8ClampedArray(w*h*4);
    for(let i=3;i<trailData.length;i+=4)trailData[i]=255;
    lastTime=null;
  }
  function tint(heat,palette){
    // The source multiplies RGB pixels by intensity, not alpha.
    const base=TAGS[palette][heat<.1?0:heat<.2?1:heat<.45?2:heat<.75?3:4];
    const lum=clamp(.42+.85*heat,0,1.3)*(.35+.65*smooth((heat-.07)/.15));
    return base.map(v=>Math.min(255,Math.round(v*lum)));
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
    ctx.globalAlpha=.75;ctx.drawImage(bloomSmall,x0,y0,w,h);
    ctx.globalAlpha=.45;ctx.drawImage(bloomWide,x0,y0,w,h);
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
    let count=0;
    for(const point of points){
      const heat=point.heat;
      if(!(heat>.07))continue;
      const colour=tint(heat,palette);
      actx.fillStyle='rgb('+colour.join(',')+')';
      actx.fillText(point.char,point.x-x0,point.y-y0);
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
    blurAtDownscale(tempSmallCtx,smallCtx,bloomSmall,1.25);
    blurAtDownscale(tempWideCtx,wideCtx,bloomWide,2.75);
    // One crisp RGB art layer, then two source-equivalent BLEND_ADD glows.
    composite(ctx,view,shadow);
    stats.active=true;stats.reason='';lastTime=time;
    return true;
  }
  window.EventHorizonSourceCompositor={
    draw,reset(){sizes=null;lastTime=null},
    stats:()=>({...stats})
  };
})();