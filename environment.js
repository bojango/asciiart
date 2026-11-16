/* PELAGIC ENVIRONMENT / 013
   Live Open-Meteo weather + European AQI. Simulation is retained separately.
   No API keys or smart-home credentials. All effects are smoothed before rendering.
   Live weather refreshes every 20 minutes; air quality once per hour.
*/
(() => {
  'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(n))?Number(n):a));
  const definitions=Object.freeze({
    temperature:{field:'temperatureC',min:-10,max:35,default:14},
    wind:{field:'windKmh',min:0,max:90,default:8},
    rain:{field:'rainPct',min:0,max:100,default:0},
    airQuality:{field:'airQualityIndex',min:0,max:200,default:25},
    humidity:{field:'humidityPct',min:0,max:100,default:55},
    daylight:{field:'daylightPct',min:0,max:100,default:60}
  });
  const defaults=Object.fromEntries(Object.values(definitions).map(d=>[d.field,d.default]));
  defaults.windDirection=35;
  const presets=Object.freeze({
    calm:{temperatureC:14,windKmh:5,windDirection:30,rainPct:0,airQualityIndex:20,humidityPct:50,daylightPct:65},
    storm:{temperatureC:8,windKmh:64,windDirection:140,rainPct:92,airQualityIndex:35,humidityPct:94,daylightPct:20},
    cold:{temperatureC:-8,windKmh:12,windDirection:250,rainPct:8,airQualityIndex:18,humidityPct:72,daylightPct:42},
    heat:{temperatureC:34,windKmh:3,windDirection:25,rainPct:0,airQualityIndex:118,humidityPct:30,daylightPct:100},
    night:{temperatureC:5,windKmh:4,windDirection:0,rainPct:0,airQualityIndex:22,humidityPct:75,daylightPct:0},
    mist:{temperatureC:10,windKmh:2,windDirection:75,rainPct:12,airQualityIndex:65,humidityPct:100,daylightPct:25}
  });
  const STORAGE='pelagic.environment.simulation.v1';
  const CONFIG='pelagic.environment.live.v1';
  const CACHE='pelagic.environment.weather.cache.v1';
  const weatherInterval=20*60*1000;
  const airInterval=60*60*1000;
  const maxCacheAge=3*60*60*1000;
  const defaultLocation={name:'Lancaster, UK',latitude:54.0470,longitude:-2.8007};
  const manual={...defaults};
  const enabled=Object.fromEntries(Object.keys(definitions).map(k=>[k,true]));
  let mode='live',location={...defaultLocation};
  let live=null, weatherUpdated=0, airUpdated=0, nextWeather=0, nextAir=0;
  let weatherStatus='waiting',airStatus='waiting',message='';
  let weatherPromise=null,airPromise=null,locationGeneration=0;
  const smoothed={...defaults};
  try {
    const old=JSON.parse(localStorage.getItem(STORAGE)||'null');
    if(old&&typeof old==='object'){
      for(const [key,def] of Object.entries(definitions)){
        if(typeof old.enabled?.[key]==='boolean')enabled[key]=old.enabled[key];
        if(old.values?.[def.field]!=null)manual[def.field]=clamp(old.values[def.field],def.min,def.max);
      }
      if(old.values?.windDirection!=null)manual.windDirection=clamp(old.values.windDirection,0,360);
    }
    const saved=JSON.parse(localStorage.getItem(CONFIG)||'null');
    if(saved?.mode==='test'||saved?.mode==='live')mode=saved.mode;
    if(saved?.location&&Number.isFinite(saved.location.latitude)&&Number.isFinite(saved.location.longitude)){
      const a=saved.location;
      location={name:String(a.name||'Selected location').slice(0,65),latitude:clamp(a.latitude,-90,90),longitude:clamp(a.longitude,-180,180)};
    }
    const cache=JSON.parse(localStorage.getItem(CACHE)||'null');
    if(cache?.location?.latitude===location.latitude&&cache?.location?.longitude===location.longitude&&
       Date.now()-cache.savedAt<maxCacheAge && cache.savedAt<=Date.now()){
      live={...defaults,...cache.values};weatherUpdated=cache.weatherUpdated||0;airUpdated=cache.airUpdated||0;
      if(cache.sunTimes)live.sunTimes=cache.sunTimes;
      weatherStatus='stale';airStatus=airUpdated?'stale':'waiting';
    }
  }catch(_){/* no storage available, continue with safe defaults */}
  if(mode==='test')Object.assign(smoothed,manual);
  else if(live)Object.assign(smoothed,live);
  function persist(){
    try {
      localStorage.setItem(STORAGE,JSON.stringify({values:manual,enabled}));
      localStorage.setItem(CONFIG,JSON.stringify({mode,location}));
    }catch(_){}
  }
  function persistCache(){
    if(!live)return;
    try{localStorage.setItem(CACHE,JSON.stringify({location,values:live,weatherUpdated,airUpdated,
      sunTimes:live.sunTimes,savedAt:Date.now()}));}catch(_){}
  }
  function setInput(field,value){
    if(field==='windDirection')manual.windDirection=clamp(value,0,360);
    else {
      const d=Object.values(definitions).find(d=>d.field===field);
      if(!d)return;
      manual[field]=clamp(value,d.min,d.max);
    }
    persist();
  }
  function setEnabled(key,value){if(!(key in enabled))return;enabled[key]=!!value;persist();}
  function preset(name){if(!Object.prototype.hasOwnProperty.call(presets,name))return false;Object.assign(manual,presets[name]);persist();return true;}
  function setMode(next){
    if(next!=='test'&&next!=='live')return;
    mode=next;persist();
    if(mode==='live')refresh(true);
  }
  function daylightPercent(time=Date.now()){
    const t=live?.sunTimes;
    if(!t||!Number.isFinite(t.rise)||!Number.isFinite(t.set))return live?.daylightPct??defaults.daylightPct;
    const now=time/1000,center=(t.rise+t.set)/2,duration=Math.max(1,t.set-t.rise);
    const altitude=now<t.rise||now>t.set?0:Math.sin(Math.PI*(now-t.rise)/duration);
    const light=100*Math.pow(Math.max(0,altitude),.63)*(1-.35*clamp(live.cloudCover??0,0,100)/100);
    return clamp(light,0,100);
  }
  async function requestJSON(url){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12500);
    try{
      const res=await fetch(url,{signal:controller.signal,cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const json=await res.json();
      if(json?.error)throw new Error(String(json.reason||'API error'));
      return json;
    }finally{clearTimeout(timeout);}
  }
  async function refreshWeather(force=false){
    if(mode!=='live')return false;
    if(weatherPromise)return weatherPromise;
    const time=Date.now();
    if(!force&&time<nextWeather)return weatherStatus==='fresh';
    const generation=locationGeneration;
    weatherStatus='loading';message='';
    const lat=location.latitude,lon=location.longitude;
    const u=new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude',String(lat));u.searchParams.set('longitude',String(lon));
    u.searchParams.set('current','temperature_2m,relative_humidity_2m,precipitation,rain,showers,wind_speed_10m,wind_direction_10m,cloud_cover,is_day');
    u.searchParams.set('daily','sunrise,sunset');u.searchParams.set('timezone','auto');u.searchParams.set('timeformat','unixtime');
    u.searchParams.set('forecast_days','2');
    weatherPromise=(async()=>{
      try{
        const json=await requestJSON(u.toString());
        if(generation!==locationGeneration||mode!=='live')return false;
        const c=json.current;
        if(!c||!Number.isFinite(c.temperature_2m)||!Number.isFinite(c.wind_speed_10m)||!Number.isFinite(c.relative_humidity_2m))throw Error('Incomplete weather data');
        if(!live)live={...defaults};
        live.temperatureC=clamp(c.temperature_2m,-30,50);
        live.windKmh=clamp(c.wind_speed_10m,0,170);
        live.windDirection=clamp(c.wind_direction_10m??0,0,360);
        live.humidityPct=clamp(c.relative_humidity_2m,0,100);
        const rain=Math.max(0,Number(c.rain??c.precipitation??0)+Number(c.showers??0));
        // Input is mm/h; saturating response avoids depicting drizzle as a storm.
        live.rainPct=clamp(100*(1-Math.exp(-rain/2.4)),0,100);
        live.cloudCover=clamp(c.cloud_cover??0,0,100);
        live.daylightPct=c.is_day===1?75:0;
        const rise=json.daily?.sunrise?.[0],set=json.daily?.sunset?.[0];
        if(Number.isFinite(rise)&&Number.isFinite(set)){
          // The next day is retained for date rollover, where available.
          live.sunTimes={rise,set,dates:json.daily.time,allRises:json.daily.sunrise,allSets:json.daily.sunset};
        }
        weatherUpdated=Date.now();weatherStatus='fresh';nextWeather=weatherUpdated+weatherInterval;
        persistCache();return true;
      }catch(err){
        if(generation!==locationGeneration||mode!=='live')return false;
        weatherStatus=weatherUpdated?'stale':'error';
        message='Weather unavailable: '+String(err?.message||'Connection failed').slice(0,65);
        nextWeather=Date.now()+Math.min(5*60*1000,weatherInterval/4);
        return false;
      }finally{weatherPromise=null;}
    })();
    return weatherPromise;
  }
  async function refreshAir(force=false){
    if(mode!=='live')return false;
    if(airPromise)return airPromise;
    if(!force&&Date.now()<nextAir)return airStatus==='fresh';
    const generation=locationGeneration;
    airStatus='loading';
    const u=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    u.searchParams.set('latitude',String(location.latitude));u.searchParams.set('longitude',String(location.longitude));
    u.searchParams.set('current','european_aqi');u.searchParams.set('timezone','auto');
    airPromise=(async()=>{
      try{
        const result=await requestJSON(u.toString());
        if(generation!==locationGeneration||mode!=='live')return false;
        const aqi=result.current?.european_aqi;
        if(!Number.isFinite(aqi))throw Error('AQI unavailable');
        if(!live)live={...defaults};
        live.airQualityIndex=clamp(aqi,0,200);
        airUpdated=Date.now();airStatus='fresh';nextAir=airUpdated+airInterval;
        persistCache();return true;
      }catch(err){
        if(generation!==locationGeneration||mode!=='live')return false;
        airStatus=airUpdated?'stale':'unavailable';
        nextAir=Date.now()+15*60*1000;
        return false;
      }finally{airPromise=null;}
    })();
    return airPromise;
  }
  function refresh(force=false){
    if(mode!=='live')return Promise.resolve(false);
    return Promise.allSettled([refreshWeather(force),refreshAir(force)]).then(v=>v[0]?.status==='fulfilled'&&v[0].value===true);
  }
  async function setLocation(query){
    if(typeof query!=='string'||query.trim().length<2)throw Error('Enter a town or city');
    const q=query.trim().slice(0,100);
    const u='https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:q,count:'5',language:'en',format:'json'});
    const result=await requestJSON(u);
    const matches=result.results||[];
    const uk=matches.find(x=>x.country_code==='GB')||matches[0];
    if(!uk||!Number.isFinite(uk.latitude)||!Number.isFinite(uk.longitude))throw Error('No matching location found');
    changeLocation({name:[uk.name,uk.admin1,uk.country_code].filter(Boolean).join(', '),latitude:uk.latitude,longitude:uk.longitude});
    return location;
  }
  function changeLocation(where){
    locationGeneration++;
    location={name:String(where.name||'Selected location').slice(0,65),latitude:clamp(where.latitude,-90,90),longitude:clamp(where.longitude,-180,180)};
    live=null;weatherUpdated=0;airUpdated=0;nextWeather=0;nextAir=0;weatherStatus='waiting';airStatus='waiting';
    persist();
    if(mode==='live')refresh(true);
  }
  function useDeviceLocation(){
    if(!navigator.geolocation)return Promise.reject(Error('Geolocation unavailable'));
    return new Promise((resolve,reject)=>{
      navigator.geolocation.getCurrentPosition(pos=>{
        changeLocation({name:'Your location',latitude:pos.coords.latitude,longitude:pos.coords.longitude});resolve(location);
      },err=>reject(Error(err?.message||'Location permission denied')),{enableHighAccuracy:false,timeout:12000,maximumAge:10*60*1000});
    });
  }
  function tick(dt){
    if(mode==='live'){
      const now=Date.now();
      if(!weatherPromise&&now>=nextWeather)void refreshWeather(false);
      if(!airPromise&&now>=nextAir)void refreshAir(false);
      if(live)live.daylightPct=daylightPercent(now);
      if(weatherUpdated&&now-weatherUpdated>weatherInterval*1.5&&weatherStatus==='fresh')weatherStatus='stale';
      if(airUpdated&&now-airUpdated>airInterval*1.5&&airStatus==='fresh')airStatus='stale';
    }
    const dest=mode==='test'?manual:(live||defaults);
    const k=1-Math.exp(-Math.max(0,dt)*.19);
    for(const key of Object.keys(defaults)){
      const val=Number(dest[key]??defaults[key]);
      if(key==='windDirection'){
        const delta=((val-smoothed[key]+540)%360)-180;
        smoothed[key]=(smoothed[key]+delta*k+360)%360;
      }else smoothed[key]+=(val-smoothed[key])*k;
    }
  }
  function effects(){
    const v=smoothed,wind=enabled.wind?v.windKmh:0,rad=v.windDirection*Math.PI/180;
    return {
      temperature:enabled.temperature?clamp((v.temperatureC-12)/30,-1.1,1.1):0,
      windX:Math.cos(rad)*wind*.47,
      windY:Math.sin(rad)*wind*.47,
      wind:wind/90,
      rain:enabled.rain?v.rainPct/100:0,
      air:enabled.airQuality?clamp((v.airQualityIndex-25)/170,0,1):0,
      humidity:enabled.humidity?v.humidityPct/100:.5,
      daylight:enabled.daylight?v.daylightPct/100:.60,
      enabled:{...enabled},source:mode
    };
  }
  function state(){
    const value=mode==='test'?manual:(live||defaults);
    const now=Date.now();
    return {mode,source:mode,values:{...value},enabled:{...enabled},location:{...location},
      weatherStatus,airStatus,message,weatherUpdated,airUpdated,
      weatherAgeMinutes:weatherUpdated?Math.round((now-weatherUpdated)/60000):null,
      nextWeather,hasLiveData:!!live};
  }
  const api=Object.freeze({definitions,presets,setInput,setEnabled,preset,setMode,refresh,setLocation,useDeviceLocation,tick,effects,state});
  window.PelagicEnvironment=api;
  if(mode==='live')void refresh(true);
})();
