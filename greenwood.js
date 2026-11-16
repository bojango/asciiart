/* GREENWOOD / 001 — an entirely typographic old-English woodland.
   Static field geometry, animated sunlight, canopy, mist and fireflies.
   No image assets, no wildlife, no live-data dependency.
*/
(() => {
  'use strict';
  const TWO_PI=Math.PI*2;
  const mix=(a,b,t)=>a+(b-a)*t;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,v)=>{let t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
  const rnd=(a,b=0)=>{const v=Math.sin(a*127.17+b*217.71+11.41)*43758.5453;return v-Math.floor(v)};
  const n2=(x,y)=>rnd(Math.floor(x)*19.73+Math.floor(y)*88.91);
  const colors={
    sky:[[7,16,29],[28,45,53],[89,122,116]],
    far:[[17,34,38],[42,75,65],[66,97,76]],
    forest:[[22,44,44],[39,83,65],[52,104,70]],
    leaves:[[21,47,41],[48,102,67],[91,133,69]],
    bark:[[38,43,46],[81,74,64],[102,80,57]],
    moss:[[31,57,48],[56,105,65],[91,133,72]],
    ground:[[36,44,42],[90,77,56],[121,103,68]],
    light:[[88,109,114],[189,169,103],[235,205,115]],
    stars:[[129,172,180],[199,224,204],[229,237,216]]
  };
  const seasons=[
    {name:'SPRING',leaf:0.77,hue:0},
    {name:'SUMMER',leaf:1,hue:0},
    {name:'AUTUMN',leaf:0.68,hue:1},
    {name:'WINTER',leaf:0.16,hue:2}
  ];
  let season=1,cache=document.createElement('canvas'),cc=cache.getContext('2d',{alpha:false});
  let lastStatic=-99,lastSignature='',cw=0,ch=0,fw=8.3,stepX=5.1,stepY=9.8;
  let groundSeeds=[],frameCount=0;
  const draw=(c,ch,x,y,color,scale=1)=>{c.fillStyle=color;c.fillText(ch,x,y);};
  function palette(day,fx){
    const night=smooth(.04,.62,day);
    const fog=clamp(fx?.humidity??.4)*.12+clamp(fx?.air??0)*.12;
    const result={};
    for(const [k,triple] of Object.entries(colors)){
      result[k]=Array.from({length:13},(_,i)=>{
        const lum=i/12,base=triple[0].map((x,j)=>mix(x,triple[1][j],night));
        const boost=(k==='sky'?1.15:k==='stars'?1.2:k==='far'?1.03:1.20);
        const exposed=base.map((x,j)=>clamp(x*(.64+1.08*lum+night*.22)*boost+triple[2][j]*Math.max(0,lum-.64)*.50,0,255));
        if(k==='leaves' && season===2){exposed[0]*=1.7;exposed[1]*=.85;exposed[2]*=.55;}
        if(k==='leaves' && season===3){exposed[0]*=.75;exposed[1]*=.86;exposed[2]*=1.1;}
        if(k==='ground' && season===3){exposed[0]*=.88;exposed[1]*=.95;exposed[2]*=1.12;}
        const fogFade=k==='far'?.22:fog;
        return `rgb(${exposed.map(v=>Math.round(clamp(v*(1-fogFade)+46*fogFade,0,255))).join(',')})`;
      });
    }
    return result;
  }
  function setFont(c,px=fw){c.font=`${px}px 'Courier New',ui-monospace,monospace`;c.textBaseline='middle';}
  function skyGap(u,v){
    if(v>.39)return false;
    const center=.52+.03*Math.sin(v*12);
    const width=.235-.20*smooth(.06,.39,v)+.013*Math.sin(v*43);
    return Math.abs(u-center)<width;
  }
  function luminance(u,v,day){
    const r=Math.hypot((u-.53)*1.8,(v-.72)*1.35);
    const pool=1-smooth(.1,.64,r);
    return clamp(.20+pool*(.43+.24*day),0,1);
  }
  function leafMask(u,v,wind=0){
    const edge=.232+.053*Math.sin(v*17+u*12)+.026*Math.sin(v*54-u*21);
    const crown=v<.24 ? (Math.abs(u-.515)>.245+.03*Math.sin(u*21)) : (v<.45 && (u<edge || u>1-edge));
    const sides=v<.72 && ((u<.12+.02*Math.cos(v*31))||(u>.87+.023*Math.sin(v*19)));
    return crown||sides;
  }
  const skyChars=' .··:·.✧+*';
  const foliage='.,:;!*+vx%Y#@';
  const bark='|!IiYl/\\#%';
  const debris='..,:;\'`+*_-=v';
  function staticLayer(w,h,time,fx,quality){
    const dpr=Math.min(devicePixelRatio||1,w<600?1.3:1.7);
    if(cache.width!==Math.round(w*dpr)||cache.height!==Math.round(h*dpr)){
      cache.width=Math.round(w*dpr);cache.height=Math.round(h*dpr);cw=w;ch=h;
    }
    cc.setTransform(dpr,0,0,dpr,0,0);
    const daylight=clamp(fx?.daylight??.58), day=smooth(.04,.62,daylight);
    const rain=clamp(fx?.rain??0), wind=clamp(fx?.wind??0);
    const P=palette(daylight,fx);
    // The sky and shadow gradients are *only light*: all physical scene shapes are glyphs.
    const gradient=cc.createLinearGradient(0,0,0,h);
    gradient.addColorStop(0,day>.25?'#101f23':'#080d19');
    gradient.addColorStop(.50,day>.25?'#101c17':'#080f14');
    gradient.addColorStop(1,'#070e0b');
    cc.fillStyle=gradient;cc.fillRect(0,0,w,h);
    // The canopy opens around an illuminated slice of sky.
    const skylight=cc.createRadialGradient(w*.50,h*.09,w*.02,w*.51,h*.24,w*.50);
    skylight.addColorStop(0,day>.3?'rgba(124,154,148,.19)':'rgba(71,92,143,.17)');
    skylight.addColorStop(1,'rgba(4,9,14,0)');
    cc.fillStyle=skylight;cc.fillRect(0,0,w,h*.8);
    // Diffuse clearing light. Trees and earth remain entirely ASCII.
    const clearingGlow=cc.createRadialGradient(w*.52,h*.68,0,w*.52,h*.68,w*.55);
    clearingGlow.addColorStop(0,day>.3?'rgba(195,145,66,.11)':'rgba(65,93,80,.08)');
    clearingGlow.addColorStop(1,'rgba(0,0,0,0)');
    cc.fillStyle=clearingGlow;cc.fillRect(0,h*.32,w,h*.68);
    fw=clamp((w<460?8.3:9.1)*(quality?1:1.3),8.2,12.4);
    stepX=fw*.60;stepY=fw*1.06;
    setFont(cc);
    const cols=Math.ceil(w/stepX),rows=Math.ceil(h/stepY);
    const glint=fx?.daylight??.58;
    // Layer 0: sky gap, distant tree silhouettes, slowly moving canopy and textured earth.
    for(let iy=0;iy<rows;iy++){
      const v=iy/(rows-1),y=iy*stepY;
      for(let ix=0;ix<cols;ix++){
        const u=ix/(cols-1),x=ix*stepX;
        const r=rnd(ix*.31,iy*.57),r2=rnd(ix*1.13+47,iy*.71+31);
        const pooling=luminance(u,v,day);
        const farForest=v>.29&&v<.76;
        let type='',char='',alpha=1;
        if(skyGap(u,v)){
          if(day<.52&&r>.968){
            type='stars'; char=r>.994?'*':r>.987?'+':'.';alpha=1;
          }else if(day>.15&&r>.83){type='sky';char=r>.96?'+':'.';alpha=.32+.32*r;}
        }else if(v<.48){
          const canopy=leafMask(u+Math.sin(time*.56+v*14)*wind*.014,v);
          if(canopy && r>(1-seasons[season].leaf)*.80){
            type='leaves';char=foliage[Math.floor(r2*foliage.length)];alpha=.62+.35*r;
          }else if(r>.79){type='far';char=r>.94?'%':'.';alpha=.4;}
        }
        if(farForest){
          // Receding trunks rendered at character-cell resolution.
          for(let j=0;j<15;j++){
            const tx=(.04+j*.064)+Math.sin(v*3+j*.9)*.014;
            if(Math.abs(u-tx)<(.0028+j%3*.0012) && v>.26+rnd(j)*.19){
              type='far';char='|I!:.'[Math.floor(r2*5)];alpha=.65+.08*(j%4);break;
            }
          }
          if(v<.61 && u>.08&&u<.94 && r>.92&&type!=='leaves'){
            type='far';char='.:^xY'[Math.floor(r2*5)];alpha=.40;
          }
        }
        if(v>.62){
          const clearing=clamp(1-Math.abs((u-.53)/(.18+Math.max(0,v-.62)*.64)),0,1);
          type=clearing>.21?'ground':'moss';
          if(r < .18+clearing*.27){type='';}
          else {char=debris[Math.floor(r2*debris.length)];alpha=.42+pooling*.48+r*.18;}
          // ground highlights collect near a broken, irregular path of light
          if(clearing>.28&&r>.94){char=r>.986?'*':'.';type='light';alpha=.95*pooling;}
        }
        // Foreground side trunks, bark and deep roots form an arch over the clearing.
        const L=.066+.045*Math.sin(v*2.7+1.1)+.016*(v-.5);
        const R=.928-.025*Math.cos(v*3+1.1);
        let tree='';
        if(v>.08&&Math.abs(u-L)<(.021+.043*v))tree='left';
        else if(v>.12&&Math.abs(u-R)<(.016+.036*v))tree='right';
        if(tree){
          const d=Math.abs(u-(tree==='left'?L:R));
          type='bark';char=bark[Math.floor((r2+v*.23)*bark.length)%bark.length];
          alpha=.78+.20*(1-d/.08);
          if(r>.78)char=(tree==='left'?'|':'/');
        }
        // Large horizontal twisted branch stretching in from the left.
        const branchV=.11+.13*smooth(.06,.65,u)+.018*Math.sin(u*18);
        if(u>.08&&u<.56&&Math.abs(v-branchV)<.006+(.012*(1-u))){
          type='bark';char=r>.5?'/':'=';alpha=.83;
        }
        if(!type||!char)continue;
        const l=clamp(Math.floor((.32+pooling*.63+r*.13)*12),0,12);
        cc.globalAlpha=clamp(alpha,0,1);
        draw(cc,char,x,y,P[type][l]);
      }
    }
    cc.globalAlpha=1;
    // Layer 1: crafted roots, furrows and rocks that read as a forest floor.
    for(let i=0;i<34;i++){
      const r=rnd(i+305),u=(i%2===0?.12:.88)+(r-.5)*.15;
      const baseY=h*(.80+.23*rnd(i+307));
      for(let j=0;j<9;j++){
        const q=j/9,px=w*(u+(i%2===0?1:-1)*q*(.04+.13*r)),py=baseY-h*.028*Math.sin(q*Math.PI*1.12);
        cc.globalAlpha=.42+.33*(1-q);
        draw(cc,'_~-=\\/'[(i+j)%6],px,py,P.bark[4+(i%6)]);
      }
    }
    cc.globalAlpha=1;
    // Layer 2: tiny saplings and branching foreground fern fronds.
    function fern(x0,y0,scale,seed,alpha){
      const windShift=Math.sin(time*.82+seed)*wind*5;
      const stalk=scale*1.7;
      for(let i=0;i<12;i++){
        const u=i/11,px=x0+windShift*u*u+Math.sin(u*2+seed)*stalk*.12,py=y0-stalk*u;
        cc.globalAlpha=alpha*(.70+.30*u);
        draw(cc,i%2?'!':':',px,py,P.leaves[6+(i%5)]);
        if(i>=2){
          const frond=scale*(1-u)*(.7+.3*Math.sin(u*4));
          for(const side of [-1,1]){
            const hx=px+side*frond*.52,hy=py-frond*.13;
            draw(cc,side<0?'\\':'/',hx,hy,P.leaves[7+(i%5)]);
            if(i%3===0)draw(cc,'*',hx+side*stepX*.7,hy-stepY*.35,P.moss[6+i%4]);
          }
        }
      }
    }
    for(let i=0;i<26;i++){
      const side=i%2===0,rx=rnd(501+i),u=side?.04+.32*rx:.68+.28*rx;
      const base=.67+.36*rnd(712+i),size=(.028+.085*rnd(802+i))*h;
      fern(w*u,h*base,size,i*2.13,.65+rx*.30);
    }
    // Fungi are low-key, entirely typographic foreground markers.
    function mushroom(px,py,scale){
      const cap=[['.', '_', '.'],['/', '^', '\\'],['(', '=', ')']];
      for(let iy=0;iy<cap.length;iy++)for(let ix=0;ix<3;ix++){
        cc.globalAlpha=.68;
        draw(cc,cap[iy][ix],px+(ix-1)*stepX*scale,py+(iy-2)*stepY*scale,P.ground[9]);
      }
      cc.globalAlpha=.60;
      draw(cc,'|',px,py+stepY*scale,P.light[8]);
    }
    mushroom(w*.27,h*.935,.85);mushroom(w*.77,h*.94,.72);
    cc.globalAlpha=1;
    lastStatic=time;
    lastSignature=`${w}/${h}/${quality}/${season}/${Math.round(daylight*30)}/${Math.round(rain*6)}/${Math.round(wind*10)}/${Math.round((fx?.humidity??0)*6)}`;
  }
  function drawScene(ctx,w,h,time,fx={},highRes=true){
    frameCount++;
    const day=clamp(fx?.daylight??.6),daylight=smooth(.04,.62,day);
    const rain=clamp(fx?.rain??0),wind=clamp(fx?.wind??0);
    const signature=`${w}/${h}/${highRes}/${season}/${Math.round(day*30)}/${Math.round(rain*6)}/${Math.round(wind*10)}/${Math.round((fx?.humidity??0)*6)}`;
    if(signature!==lastSignature || time-lastStatic>.24 || !cache.width){staticLayer(w,h,time,fx,highRes);}
    ctx.drawImage(cache,0,0,w,h);
    setFont(ctx,fw);
    const top=w*.51;
    // Daylight passes between the branches as flecks of ASCII, never polygons.
    if(daylight>.16){
      for(let i=0;i<250;i++){
        const rr=rnd(i+2001),v=.16+rnd(i+2004)*.73,u=.49+(v-.11)*(.23*rnd(i+2002)-.10);
        if(u<.12||u>.89)continue;
        const oscill=Math.sin(time*.40+i)*wind*.011;
        ctx.globalAlpha=daylight*(.20+.42*rr)*(1-smooth(.80,.98,v));
        draw(ctx,rr>.89?'.':rr>.64?'·':':',w*(u+oscill),h*v,`rgb(${Math.floor(177+48*rr)},${Math.floor(146+40*rr)},${Math.floor(86+32*rr)})`);
      }
    }
    // Drifting low fog as small, separated typographic fragments.
    const humidity=clamp(fx?.humidity??.5),mist=humidity*(.10+.20*(1-daylight));
    for(let i=0;i<85;i++){
      const y=h*(.56+.40*rnd(i+3103)),x=((rnd(i+3101)*w+time*(3+wind*10)*(i%2?1:-1))%w+w)%w;
      ctx.globalAlpha=mist*(.18+.45*rnd(i+3104));
      draw(ctx,i%4===0?'~':'.',x,y,'#a7cbb8');
    }
    // Light rain through the opening and gaps. The stage-2 rainfall pass can replace this.
    if(rain>.01){
      ctx.globalAlpha=rain*.38;
      for(let i=0;i<300;i++){
        const x=(rnd(i+3702)*w+time*(11+wind*40))%w;
        const y=(rnd(i+3703)*h+time*(55+rain*85))%h;
        const u=x/w,v=y/h;
        if(skyGap(u,v) || (v>.29 && u>.18&&u<.84)){
          draw(ctx,i%4===0?'|':'.',x,y,'#a0b7bd');
        }
      }
    }
    // Stars and fireflies at night. Their luminous halo is entirely lettering.
    const night=1-smooth(.04,.54,day);
    if(night>.08){
      for(let i=0;i<36;i++){
        const y=h*(.06+.27*rnd(i+4901)),x=w*(.34+.32*rnd(i+4902));
        if(!skyGap(x/w,y/h))continue;
        const twinkle=.3+.7*Math.pow(.5+.5*Math.sin(time*(.6+.8*rnd(i+4903))+i*4),3);
        ctx.globalAlpha=night*(.12+.62*twinkle);
        draw(ctx,i%11===0?'+':i%4===0?'*':'.',x,y,'#c9dfe3');
      }
      for(let i=0;i<17;i++){
        const seed=i*7.3;
        const x=w*(.27+.49*rnd(i+5101)+.033*Math.sin(time*.37+seed));
        const y=h*(.42+.43*rnd(i+5102)+.027*Math.sin(time*.46+i*1.7));
        const bright=night*(.28+.72*Math.pow(.5+.5*Math.sin(time*.92+i*1.8),3));
        ctx.globalAlpha=bright*.2;
        for(let j=0;j<3;j++)draw(ctx,'.',x+Math.cos(j*TWO_PI/3)*stepX*1.5,y+Math.sin(j*TWO_PI/3)*stepY,'#efbf79');
        ctx.globalAlpha=bright;
        ctx.shadowColor='#ebbc78';ctx.shadowBlur=5+3*bright;
        draw(ctx,i%4===0?'*':'+',x,y,'#ffd888');ctx.shadowBlur=0;
      }
    }
    ctx.globalAlpha=1;
  }
  function setSeason(value){season=((Number(value)%4)+4)%4;lastStatic=-99;return seasons[season].name;}
  function cycleSeason(){return setSeason(season+1);}
  function source(){return [
    '// GREENWOOD / procedural ASCII woodland',
    '// Tree, leaves, sky and forest floor are all rendered as characters.',
    staticLayer.toString(),drawScene.toString(),skyGap.toString(),leafMask.toString(),luminance.toString(),
    '// Weather & season will be extended in the next phase.'
  ].join('\n\n');}
  window.PelagicGreenwood=Object.freeze({draw:drawScene,setSeason,cycleSeason,source,get season(){return seasons[season].name;}});
})();
