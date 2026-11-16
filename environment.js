/* PELAGIC environmental adapter, version 0.1.
   Weather is deliberately simulated until the effects have been reviewed.
   The renderer never requests a weather API or contacts a smart-home service.
   All input smoothing happens here; physics consumes read-only effect values.
*/
(() => {
  'use strict';
  const clamp = (n,a,b) => Math.max(a,Math.min(b,Number.isFinite(Number(n)) ? Number(n) : a));
  const definitions = Object.freeze({
    temperature: {field:'temperatureC',min:-10,max:35,default:14},
    wind:        {field:'windKmh',min:0,max:90,default:8},
    rain:        {field:'rainPct',min:0,max:100,default:0},
    airQuality:  {field:'airQualityIndex',min:0,max:200,default:25},
    humidity:    {field:'humidityPct',min:0,max:100,default:55},
    daylight:    {field:'daylightPct',min:0,max:100,default:60}
  });
  const initial = Object.fromEntries(Object.values(definitions).map(d=>[d.field,d.default]));
  initial.windDirection = 35; // Degrees on the screen: 0=right, 90=down.
  const enabled = Object.fromEntries(Object.keys(definitions).map(k=>[k,true]));
  const target = {...initial};
  const smoothed = {...initial};
  const presets = Object.freeze({
    calm:  {temperatureC:14,windKmh:5,windDirection:30,rainPct:0,airQualityIndex:20,humidityPct:50,daylightPct:65},
    storm: {temperatureC:8,windKmh:64,windDirection:140,rainPct:92,airQualityIndex:35,humidityPct:94,daylightPct:20},
    cold:  {temperatureC:-8,windKmh:12,windDirection:250,rainPct:8,airQualityIndex:18,humidityPct:72,daylightPct:42},
    heat:  {temperatureC:34,windKmh:3,windDirection:25,rainPct:0,airQualityIndex:118,humidityPct:30,daylightPct:100},
    night: {temperatureC:5,windKmh:4,windDirection:0,rainPct:0,airQualityIndex:22,humidityPct:75,daylightPct:0},
    mist:  {temperatureC:10,windKmh:2,windDirection:75,rainPct:12,airQualityIndex:65,humidityPct:100,daylightPct:25}
  });
  const storageKey='pelagic.environment.simulation.v1';
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(saved && typeof saved==='object'){
      for(const [key,d] of Object.entries(definitions)){
        if(typeof saved.enabled?.[key]==='boolean')enabled[key]=saved.enabled[key];
        if(saved.values?.[d.field]!==undefined)target[d.field]=clamp(saved.values[d.field],d.min,d.max);
      }
      if(saved.values?.windDirection!==undefined)target.windDirection=clamp(saved.values.windDirection,0,360);
    }
  }catch(_){}
  Object.assign(smoothed,target);
  function save(){
    try { localStorage.setItem(storageKey,JSON.stringify({enabled,values:target})); } catch(_){}
  }
  function setInput(field,value){
    const item=Object.values(definitions).find(d=>d.field===field);
    if(field==='windDirection')target.windDirection=clamp(value,0,360);
    else if(item)target[field]=clamp(value,item.min,item.max);
    else return;
    save();
  }
  function setEnabled(effect,value){
    if(!(effect in enabled))return;
    enabled[effect]=!!value;
    save();
  }
  function preset(name){
    if(!Object.hasOwn(presets,name))return false;
    Object.assign(target,presets[name]);save();return true;
  }
  function tick(dt){
    const k=1-Math.exp(-Math.max(0,dt)*.85); // no sudden weather jumps
    for(const field of Object.keys(initial)){
      if(field==='windDirection'){
        const delta=((target[field]-smoothed[field]+540)%360)-180;
        smoothed[field]=(smoothed[field]+delta*k+360)%360;
      }else smoothed[field]+=(target[field]-smoothed[field])*k;
    }
  }
  function effects(){
    const v=smoothed;
    const wind=enabled.wind?v.windKmh:0;
    const angle=v.windDirection*Math.PI/180;
    return {
      temperature: enabled.temperature?clamp((v.temperatureC-12)/30,-.9,.9):0,
      windX: Math.cos(angle)*wind*.47,
      windY: Math.sin(angle)*wind*.47,
      wind: wind/90,
      rain: enabled.rain?v.rainPct/100:0,
      air: enabled.airQuality?clamp((v.airQualityIndex-25)/170,0,1):0,
      humidity: enabled.humidity?v.humidityPct/100:.5,
      daylight: enabled.daylight?v.daylightPct/100:.60,
      enabled:{...enabled},
      source:'simulation'
    };
  }
  function state(){return {source:'simulation',values:{...target},enabled:{...enabled}};}
  window.PelagicEnvironment=Object.freeze({definitions,presets,setInput,setEnabled,preset,tick,effects,state});
})();
