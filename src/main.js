import maplibregl from 'maplibre-gl';import 'maplibre-gl/dist/maplibre-gl.css';import L from 'leaflet';import 'leaflet/dist/leaflet.css';import './style.css';
const map=L.map('map',{zoomControl:false,zoomSnap:.25,zoomDelta:.5,touchZoom:true,doubleClickZoom:true}).setView([41.3874,2.1686],14);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
let userPos=null,userMarker=null,roadLabel=null,destMarker=null,routeLine=null,currentDest=null,currentName='',watchId=null,currentSteps=[],navActive=false,lastRoute=0,lastSpokenKey='',lastSpokenAt=0,speedLimit=null,lastLimitCheck=0,lastRoadCheck=0,lastRoadName='',lastSpeedWarn=0,wasOverLimit=false,is3d=false,lastHeading=0,northUp=false,manualRotation=0,gestureActive=false,gestureStartAngle=null,gestureStartRotation=0,lastGpsPos=null;
const $=s=>document.querySelector(s),results=$('#results'),card=$('#routeCard'),info=$('#routeInfo'),startBtn=$('#startNav'),cancelBtn=$('#cancelNav'),finishBtn=$('#finishNav'),view3d=$('#view3d'),northBtn=$('#northMode'),speedPanel=$('#speedPanel'),speedLimitEl=$('#speedLimit'),currentSpeedEl=$('#currentSpeed'),limitSign=$('#limitSign'),currentSign=$('#currentSign'),nextTurn=$('#nextTurn'),turnArrow=$('#turnArrow'),turnDistance=$('#turnDistance'),turnText=$('#turnText'),mapEl=$('#map'),savedMenu=$('#savedMenu'),savedList=$('#savedList'),savedTitle=$('#savedTitle'),favoriteCurrent=$('#favoriteCurrent');
/* Keep saved destinations panel above the map and navigation overlays. */
savedMenu.parentElement!==document.body&&document.body.appendChild(savedMenu);
const readStore=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}},writeStore=(k,v)=>localStorage.setItem(k,JSON.stringify(v));let recents=readStore('gpsai-recents'),favorites=readStore('gpsai-favorites');function destObj(){return currentDest?{name:currentName,lat:currentDest[0],lon:currentDest[1]}:null}function sameDest(a,b){return a&&b&&Math.abs(a.lat-b.lat)<1e-6&&Math.abs(a.lon-b.lon)<1e-6}function addRecent(d){recents=[d,...recents.filter(x=>!sameDest(x,d))].slice(0,20);writeStore('gpsai-recents',recents)}function isFavorite(d){return favorites.some(x=>sameDest(x,d))}function refreshFavoriteStar(){const d=destObj(),on=isFavorite(d);favoriteCurrent.textContent=on?'★':'☆';favoriteCurrent.classList.toggle('active',on);favoriteCurrent.setAttribute('aria-pressed',String(on))}function renderSaved(kind){const arr=kind==='favorites'?favorites:recents;savedTitle.textContent=kind==='favorites'?'Favoritos':'Últimos destinos';savedList.innerHTML='';if(!arr.length){savedList.innerHTML='<div class="savedEmpty">No hay destinos guardados</div>';return}arr.forEach(d=>{const row=document.createElement('div');row.className='savedRow',go=document.createElement('button');go.className='savedGo';go.textContent=d.name;go.onclick=()=>{savedMenu.classList.add('hidden');choose({lat:d.lat,lon:d.lon,display_name:d.name})};row.appendChild(go);if(kind==='favorites'){const star=document.createElement('button');star.className='savedStar';star.textContent='★';star.onclick=()=>{favorites=favorites.filter(x=>!sameDest(x,d));writeStore('gpsai-favorites',favorites);renderSaved('favorites');refreshFavoriteStar()};row.appendChild(star)}savedList.appendChild(row)})}
const voicePrefs=Object.assign({lang:'es-ES',gender:'female',volume:1},JSON.parse(localStorage.getItem('gpsai-voice')||'{}'));
function availableVoice(){const voices=window.speechSynthesis?.getVoices()||[];const matches=voices.filter(v=>v.lang.toLowerCase().startsWith(voicePrefs.lang.slice(0,2).toLowerCase()));const female=/female|mujer|dona|monica|mónica|helena|laura|lucia|lucía|paulina|marisol/i,male=/male|hombre|home|jorge|diego|pablo|enric|joan/i;return matches.find(v=>(voicePrefs.gender==='female'?female:male).test(v.name))||matches[0]||null}
function speak(text){if(!text||!window.speechSynthesis)return;if(window.GPSAI_WEATHER_SPEAKING){window.GPSAI_PENDING_DIRECTION=text;return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=voicePrefs.lang;u.rate=1;u.volume=voicePrefs.volume;const v=availableVoice();if(v)u.voice=v;window.speechSynthesis.speak(u)}
function installVoiceSettings(){const menu=document.getElementById('quickMenu');if(!menu)return;const btn=document.createElement('button');btn.type='button';btn.textContent='🔊 VOZ';menu.appendChild(btn);btn.onclick=()=>{document.getElementById('gpsaiVoicePanel')?.remove();const panel=document.createElement('div');panel.id='gpsaiVoicePanel';panel.style.cssText='position:fixed;z-index:2147483647;top:12%;left:5%;width:90%;max-width:420px;background:white;color:#111;padding:22px;border-radius:16px;box-shadow:0 4px 28px #0007;font:16px Arial';panel.innerHTML='<h3>Configuración de voz</h3><label>Idioma <select id="gpsVoiceLang"><option value="es-ES">Español</option><option value="ca-ES">Català</option></select></label><br><br><label>Voz <select id="gpsVoiceGender"><option value="female">Femenina</option><option value="male">Masculina</option></select></label><br><br><label>Volumen <input id="gpsVoiceVolume" type="range" min="0" max="100"></label><br><br><button id="gpsVoiceTest">Probar voz</button> <button id="gpsVoiceClose">Cerrar</button>';document.body.appendChild(panel);const lang=panel.querySelector('#gpsVoiceLang'),gender=panel.querySelector('#gpsVoiceGender'),volume=panel.querySelector('#gpsVoiceVolume');lang.value=voicePrefs.lang;gender.value=voicePrefs.gender;volume.value=Math.round(voicePrefs.volume*100);const save=()=>{voicePrefs.lang=lang.value;voicePrefs.gender=gender.value;voicePrefs.volume=Number(volume.value)/100;localStorage.setItem('gpsai-voice',JSON.stringify(voicePrefs))};[lang,gender,volume].forEach(el=>el.addEventListener('change',save));volume.addEventListener('input',save);panel.querySelector('#gpsVoiceTest').onclick=()=>speak(voicePrefs.lang==='ca-ES'?'Aquesta és la veu de navegació.':'Esta es la voz de navegación.');panel.querySelector('#gpsVoiceClose').onclick=()=>panel.remove();menu.classList.add('hidden')}}document.addEventListener('DOMContentLoaded',installVoiceSettings);
function distanceM(a,b){const R=6371000,r=Math.PI/180,dLat=(b[0]-a[0])*r,dLon=(b[1]-a[1])*r,la1=a[0]*r,la2=b[0]*r,h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}function bearing(a,b){const r=Math.PI/180,p1=a[0]*r,p2=b[0]*r,dl=(b[1]-a[1])*r,y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return(Math.atan2(y,x)*180/Math.PI+360)%360}function smoothHeading(prev,next,a=.35){const d=((next-prev+540)%360)-180;return(prev+d*a+360)%360}function instruction(s){const m=s?.maneuver||{},t=m.type||'',mod=m.modifier||'',road=s.name?` hacia ${s.name}`:'';if(t==='arrive')return'Has llegado a tu destino';if(t==='roundabout'||t==='rotary')return`En la rotonda,${m.exit?` toma la salida ${m.exit}`:' continúa por la rotonda'}${road}`;if(t==='depart')return`Continúa${road}`;if(mod.includes('right'))return`gira a la derecha${road}`;if(mod.includes('left'))return`gira a la izquierda${road}`;if(mod==='uturn')return'haz un cambio de sentido';if(mod==='straight')return`continúa recto${road}`;return`continúa${road}`}function arrowFor(s){const m=s?.maneuver||{},mod=m.modifier||'',t=m.type||'';if(t==='roundabout'||t==='rotary')return'↻';if(t==='arrive')return'●';if(mod==='uturn')return'↶';if(mod.includes('right'))return'→';if(mod.includes('left'))return'←';return'↑'}function nearestStep(pos){let best=null,d=Infinity;for(const s of currentSteps){const l=s.maneuver?.location;if(!l)continue;const x=distanceM(pos,[l[1],l[0]]);if(x<d){d=x;best=s}}return best?{step:best,distance:d}:null}function updateTurnPanel(pos){if(!navActive){nextTurn.classList.add('hidden');return}const n=nearestStep(pos);if(!n)return;nextTurn.classList.remove('hidden');turnArrow.textContent=arrowFor(n.step);turnDistance.textContent=n.distance<1000?`${Math.max(10,Math.round(n.distance/10)*10)} m`:`${(n.distance/1000).toFixed(1)} km`;turnText.textContent=instruction(n.step)}let map3d=null,marker3d=null,destination3d=null,routeCoords3d=null;
function ensureMap3d(){
 if(map3d)return true;
 if(!maplibregl.supported()){alert('La vista 3D necesita WebGL. Comprueba que Android System WebView esté actualizado. La vista 2D sigue disponible.');return false}
 try{
  map3d=new maplibregl.Map({container:'map3d',style:{version:8,sources:{osm:{type:'raster',tiles:['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png','https://b.tile.openstreetmap.org/{z}/{x}/{y}.png','https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap'}},layers:[{id:'osm',type:'raster',source:'osm'}]},center:[map.getCenter().lng,map.getCenter().lat],zoom:map.getZoom(),pitch:58,bearing:0,attributionControl:false,dragRotate:true,touchPitch:true});
  map3d.on('load',()=>{map3d.addSource('route3d',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[]},properties:{}}});map3d.addLayer({id:'route3d',type:'line',source:'route3d',paint:{'line-color':'#2472f5','line-width':8,'line-opacity':.9}});sync3dOverlays()});
  map3d.on('error',e=>{console.warn('Mapa 3D:',e.error||e);if(is3d&&!map3d.loaded())console.warn('Error al cargar teselas o motor WebGL')});
  return true
 }catch(e){console.error('No se pudo crear el mapa 3D',e);map3d=null;alert('No se ha podido activar el mapa 3D en este dispositivo.');return false}
}
function sync3dOverlays(){
 if(!map3d)return;
 if(userPos){if(!marker3d){const el=document.createElement('div');el.className='gps3d-user';marker3d=new maplibregl.Marker({element:el}).setLngLat([userPos[1],userPos[0]]).addTo(map3d)}else marker3d.setLngLat([userPos[1],userPos[0]])}
 if(currentDest){if(!destination3d){const el=document.createElement('div');el.className='gps3d-dest';destination3d=new maplibregl.Marker({element:el}).setLngLat([currentDest[1],currentDest[0]]).addTo(map3d)}else destination3d.setLngLat([currentDest[1],currentDest[0]])}else if(destination3d){destination3d.remove();destination3d=null}
 const source=map3d.getSource('route3d');if(source)source.setData({type:'Feature',geometry:{type:'LineString',coordinates:routeCoords3d||[]},properties:{}})
}
function sync3dCamera(){
 if(!is3d||!map3d)return;
 const center=navActive&&userPos?{lng:userPos[1],lat:userPos[0]}:map.getCenter();
 map3d.jumpTo({center:[center.lng,center.lat],zoom:map.getZoom(),bearing:northUp?0:lastHeading,pitch:58});
 sync3dOverlays()
}
function applyMapView(h=lastHeading){
 lastHeading=Number.isFinite(h)?h:lastHeading;
 // Leaflet 2D: rotate the complete map around its centre so travel stays upwards.
 const stage=document.getElementById('mapStage');
 if(stage){
  const angle=navActive&&!northUp?-lastHeading:0;
  stage.style.setProperty('transform',navActive&&!northUp?`rotate(${angle}deg) scale(1.45)`:'none','important');
  stage.style.setProperty('transform-origin','center center','important');
  // Keep the vehicle arrow pointing upwards in heading-up navigation.
  const arrow=stage.querySelector('.gps-heading-triangle');
  if(arrow)arrow.style.transform=navActive&&!northUp?`rotate(${lastHeading}deg)`:'';
 }
 sync3dCamera();
}
function touchAngle(t){const a=t[0],b=t[1];return Math.atan2(b.clientY-a.clientY,b.clientX-a.clientX)*180/Math.PI}mapEl.addEventListener('touchstart',e=>{if(e.touches.length===2){gestureActive=true;gestureStartAngle=touchAngle(e.touches);gestureStartRotation=manualRotation}},{passive:true});mapEl.addEventListener('touchmove',e=>{if(e.touches.length===2&&gestureStartAngle!==null){manualRotation=gestureStartRotation+(touchAngle(e.touches)-gestureStartAngle);applyMapView(lastHeading)}},{passive:true});mapEl.addEventListener('touchend',e=>{if(e.touches.length<2){gestureActive=false;gestureStartAngle=null}},{passive:true});mapEl.addEventListener('touchcancel',()=>{gestureActive=false;gestureStartAngle=null},{passive:true});
function roadFromRoute(pos){let best=null,bestD=Infinity;for(const s of currentSteps){if(!s.name)continue;const l=s.maneuver?.location;if(!l)continue;const d=distanceM(pos,[l[1],l[0]]);if(d<bestD){bestD=d;best=s.name}}return bestD<500?best:null}function showRoadLabel(pos,name){const label=document.getElementById('currentRoadLabel');if(label){label.textContent=name||lastRoadName||'Identificando vía…';label.classList.toggle('hidden',!navActive)}if(roadLabel){map.removeLayer(roadLabel);roadLabel=null}}async function updateRoadName(pos){const routeName=roadFromRoute(pos);if(routeName){lastRoadName=routeName;showRoadLabel(pos,routeName)}const now=Date.now();if(now-lastRoadCheck<12000)return;lastRoadCheck=now;try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${pos[0]}&lon=${pos[1]}`),d=await r.json(),a=d.address||{},name=a.road||a.pedestrian||a.footway||a.cycleway||a.path||a.motorway||a.trunk||a.neighbourhood||routeName;if(name){lastRoadName=name;showRoadLabel(pos,name)}}catch{if(lastRoadName)showRoadLabel(pos,lastRoadName)}}
function closeSavedOverlay(){savedMenu.classList.add('hidden');quickMenu?.classList.add('hidden');menuToggle?.setAttribute('aria-expanded','false')}
function endTrip(arrived=false){navActive=false;document.body.classList.remove('trip-active');document.getElementById('app').classList.remove('trip-active');savedMenu.classList.add('hidden');closeSavedOverlay();document.getElementById('currentRoadLabel')?.classList.add('hidden');if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null}speedPanel.classList.add('hidden');nextTurn.classList.add('hidden');cancelBtn.classList.add('hidden');startBtn.classList.add('hidden');finishBtn.classList.remove('hidden');finishBtn.textContent='VIAJE FINALIZADO';lastHeading=0;manualRotation=0;applyMapView(0);speak(arrived?'Has llegado a tu destino. Viaje finalizado.':'Viaje cancelado.')}function voiceGuide(pos){if(!navActive||!currentSteps.length)return;const rem=currentDest?distanceM(pos,currentDest):Infinity;if(rem<30){endTrip(true);return}const n=nearestStep(pos);if(!n)return;const s=n.step,d=n.distance,key=`${s.maneuver?.location?.join(',')}-${s.maneuver?.type}-${s.maneuver?.modifier}`,now=Date.now();let text='';if(s.maneuver?.type==='arrive'&&d<35)text='Has llegado a tu destino';else if(d<=30)text=`En ${Math.max(10,Math.round(d/10)*10)} metros, ${instruction(s)}`;else if(d<=120)text=`En ${Math.round(d/10)*10} metros, ${instruction(s)}`;else if(d<=350)text=`En ${Math.round(d/50)*50} metros, ${instruction(s)}`;if(text&&key!==lastSpokenKey&&now-lastSpokenAt>5000){lastSpokenKey=key;lastSpokenAt=now;speak(text)}}async function updateRoadLimit(pos){
 const now=Date.now();if(now-lastLimitCheck<9000)return;lastLimitCheck=now;
 try{
  const q='[out:json][timeout:9];way(around:65,'+pos[0]+','+pos[1]+')[highway];out geom;';
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10500);
  let response;
  try{response=await fetch('https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent(q),{signal:ctrl.signal});}
  finally{clearTimeout(timer)}
  if(!response.ok)throw Error('speed query failed');
  const data=await response.json();
  function segmentDistance(p,a,b){
   const kx=111320*Math.cos(p[0]*Math.PI/180),ky=111320;
   const x=(p[1]-a[1])*kx,y=(p[0]-a[0])*ky,dx=(b[1]-a[1])*kx,dy=(b[0]-a[0])*ky;
   const t=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy||1)));
   return Math.hypot(x-t*dx,y-t*dy);
  }
  const matches=(data.elements||[]).map(w=>{
   const tags=w.tags||{},raw=String(tags.maxspeed||tags['maxspeed:forward']||tags['maxspeed:backward']||'').toLowerCase();
   let n=Number(raw.match(/^\s*(\d+(?:\.\d+)?)/)?.[1]);
   if(raw.includes('mph'))n=Math.round(n*1.609344);
   if(!Number.isFinite(n)||n<10||n>140)n=null;
   const pts=(w.geometry||[]).map(p=>[p.lat,p.lon]);let dist=Infinity;
   for(let i=1;i<pts.length;i++)dist=Math.min(dist,segmentDistance(pos,pts[i-1],pts[i]));
   return {limit:n,dist,road:tags.highway};
  }).filter(x=>x.dist<=35).sort((a,b)=>a.dist-b.dist);
  // Never invent a speed limit from the road class: signs and local rules may differ.
  const match=matches.find(x=>x.limit!==null);
  speedLimit=match?.limit??null;
  speedLimitEl.textContent=speedLimit??'--';
 }catch{
  // Preserve the last known value briefly rather than falsely showing a new limit.
  speedLimitEl.textContent=speedLimit??'--';
 }
}
function updateSpeed(p){let kmh=null;if(Number.isFinite(p.coords.speed)&&p.coords.speed>=0)kmh=Math.round(p.coords.speed*3.6);else if(lastGpsPos&&p.timestamp&&window.__gpsLastTime&&p.timestamp>window.__gpsLastTime&&p.coords.accuracy<=40){const dt=(p.timestamp-window.__gpsLastTime)/1000;if(dt>=1&&dt<=12)kmh=Math.round(distanceM(lastGpsPos,[p.coords.latitude,p.coords.longitude])/dt*3.6)}window.__gpsLastTime=p.timestamp||Date.now();currentSpeedEl.textContent=kmh==null?'--':kmh;const over=kmh!=null&&speedLimit!=null&&kmh>speedLimit+2;limitSign.classList.toggle('over',over);currentSign.classList.toggle('over',over);if(over&&(!wasOverLimit||Date.now()-lastSpeedWarn>45000)){lastSpeedWarn=Date.now();speak('Has superado el límite de velocidad permitido')}wasOverLimit=over}function setPosition(p,c=false){userPos=[p.coords.latitude,p.coords.longitude];if(userMarker)userMarker.setLatLng(userPos);else userMarker=L.circleMarker(userPos,{radius:11,weight:4,fillOpacity:1}).addTo(map).bindPopup('Tu ubicación');if(roadLabel)roadLabel.setLatLng(userPos);if(c)map.setView(userPos,17);if(is3d)sync3dCamera()}async function locate(){try{const p=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:12000,maximumAge:3000}));setPosition(p,true);lastGpsPos=[...userPos]}catch(e){if(e?.code!==1)alert('No se ha podido obtener la ubicación. Comprueba que el GPS esté activado.')}}
$('#locate').onclick=locate;$('#zoomIn').onclick=()=>{if(is3d&&map3d)map3d.zoomIn();else map.zoomIn(.5)};$('#zoomOut').onclick=()=>{if(is3d&&map3d)map3d.zoomOut();else map.zoomOut(.5)};northBtn.onclick=()=>{northUp=!northUp;manualRotation=0;northBtn.classList.toggle('active',northUp);northBtn.setAttribute('aria-pressed',String(northUp));northBtn.setAttribute('aria-label',northUp?'Desactivar orientación norte':'Orientar mapa al norte');applyMapView(lastHeading)};view3d.onclick=()=>{const surface=document.getElementById('map3d');const show2d=()=>{is3d=false;surface.classList.remove('visible');view3d.classList.remove('active');view3d.setAttribute('aria-pressed','false');map.invalidateSize({pan:false});setTimeout(()=>map.invalidateSize({pan:false}),200)};if(is3d){show2d();return}surface.classList.add('visible');if(!ensureMap3d()){show2d();return}is3d=true;view3d.classList.add('active');view3d.setAttribute('aria-pressed','true');let ready=false;let timeout=setTimeout(()=>{if(is3d&&!ready){show2d();alert('No se ha podido cargar el mapa 3D. Se ha restaurado la vista 2D.')}},9000);const onReady=()=>{ready=true;clearTimeout(timeout);if(is3d){map3d.resize();sync3dCamera()}};map3d.once('idle',onReady);requestAnimationFrame(()=>{if(!is3d)return;map3d.resize();sync3dCamera();setTimeout(()=>{if(is3d){map3d.resize();sync3dCamera()}},350)})};const menuToggle=$('#openMenu'),quickMenu=$('#quickMenu');function closeQuickMenu(){quickMenu.classList.add('hidden');menuToggle.setAttribute('aria-expanded','false')}menuToggle.onclick=()=>{const opening=quickMenu.classList.contains('hidden');quickMenu.classList.toggle('hidden',!opening);menuToggle.setAttribute('aria-expanded',String(opening));savedMenu.classList.add('hidden')};function openSavedDestinations(kind){
 closeQuickMenu();setSearchOpen(false);savedMenu.classList.add('hidden');
 document.getElementById('gpsaiSavedDialog')?.remove();
 const overlay=document.createElement('div');overlay.id='gpsaiSavedDialog';
 overlay.style.cssText='position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(0,0,0,.28)!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;padding:calc(env(safe-area-inset-top) + 96px) 14px 20px!important;box-sizing:border-box!important;';
 const panel=document.createElement('section');
 panel.style.cssText='width:100%!important;max-width:430px!important;max-height:70vh!important;overflow-y:auto!important;background:#fff!important;color:#222!important;border-radius:18px!important;box-shadow:0 10px 30px #0005!important;padding:12px!important;box-sizing:border-box!important;';
 const header=document.createElement('div');header.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:4px 5px 12px;font-weight:800;font-size:19px;';
 const title=document.createElement('span');title.textContent=kind==='favorites'?'★ Favoritos':'Últimos 20 destinos';
 const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Cerrar');close.style.cssText='border:0;background:transparent;font-size:26px;padding:0 8px;color:#333';close.onclick=()=>overlay.remove();
 header.append(title,close);panel.appendChild(header);
 const list=document.createElement('div');panel.appendChild(list);
 function populate(){
  list.replaceChildren();
  const items=readStore(kind==='favorites'?'gpsai-favorites':'gpsai-recents');
  if(!items.length){const empty=document.createElement('p');empty.textContent='No hay destinos guardados';empty.style.cssText='padding:16px;color:#666';list.appendChild(empty);return}
  items.slice(0,kind==='favorites'?undefined:20).forEach(d=>{
   const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;border-top:1px solid #eee;min-height:54px;';
   const go=document.createElement('button');go.type='button';go.textContent=d.name||'Destino guardado';go.style.cssText='flex:1;text-align:left;padding:14px 8px;background:#fff;border:0;font-size:14px;color:#222;overflow-wrap:anywhere;';
   go.onclick=()=>{overlay.remove();choose({lat:d.lat,lon:d.lon,display_name:d.name})};row.appendChild(go);
   if(kind==='favorites'){const del=document.createElement('button');del.type='button';del.textContent='★';del.setAttribute('aria-label','Quitar de favoritos');del.style.cssText='border:0;background:#fff;color:#f0b400;font-size:28px;padding:6px 12px;';del.onclick=()=>{favorites=favorites.filter(x=>!sameDest(x,d));writeStore('gpsai-favorites',favorites);refreshFavoriteStar();populate()};row.appendChild(del)}
   list.appendChild(row);
  });
 }
 populate();overlay.appendChild(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.appendChild(overlay);
}$('#recentBtn').onclick=()=>openSavedDestinations('recents');$('#favoritesBtn').onclick=()=>openSavedDestinations('favorites');favoriteCurrent.onclick=()=>{const d=destObj();if(!d)return;if(isFavorite(d))favorites=favorites.filter(x=>!sameDest(x,d));else favorites=[d,...favorites.filter(x=>!sameDest(x,d))];writeStore('gpsai-favorites',favorites);refreshFavoriteStar()};locate();
const searchForm=$('#search'),searchToggle=$('#openSearch');function setSearchOpen(open){if(open){closeQuickMenu();savedMenu.classList.add('hidden')}searchForm.classList.toggle('hidden',!open);searchToggle.setAttribute('aria-expanded',String(open));if(open)$('#destination').focus();else results.innerHTML=''}searchToggle.onclick=()=>setSearchOpen(searchForm.classList.contains('hidden'));$('#closeSearch').onclick=()=>setSearchOpen(false);
const searchEndpoint='https://nominatim.openstreetmap.org/search';
async function searchFetch(url,timeout=5500){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('Search failed');return await r.json()}finally{clearTimeout(timer)}
}
function numberedAddress(q){
 const parts=q.split(',').map(x=>x.trim()).filter(Boolean);
 const first=parts[0]||'';
 const match=first.match(/^(.+?)\s+(?:n[úu]mero\s*|n[º°.]?\s*)?(\d+[A-Za-z]?)$/i);
 return match?{road:match[1].trim(),number:match[2].toLowerCase(),city:parts.slice(1).join(', ')}:null;
}
const streetSwaps=[[/^avenida\b/i,'Avinguda'],[/^avinguda\b/i,'Avenida'],[/^calle\b/i,'Carrer'],[/^carrer\b/i,'Calle'],[/^paseo\b/i,'Passeig'],[/^passeig\b/i,'Paseo'],[/^plaza\b/i,'Plaça'],[/^plaça\b/i,'Plaza'],[/^ronda\b/i,'Ronda'],[/^carretera\b/i,'Carretera']];
function roadVariants(road){const variants=new Set([road]);for(const [re,to] of streetSwaps)if(re.test(road))variants.add(road.replace(re,to));return [...variants]}
const normalizedRoad=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(avenida|avinguda|calle|carrer|plaza|placa|paseo|passeig|de|del|dels|la|el)\b/g,' ').replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
async function searchPlaces(q){const parts=q.split(',');const road=parts.shift().trim(),suffix=parts.join(',').trim();const queries=roadVariants(road).map(v=>[v,suffix].filter(Boolean).join(', '));const responses=await Promise.allSettled(queries.map(query=>searchFetch(searchEndpoint+'?'+new URLSearchParams({format:'jsonv2',addressdetails:'1',namedetails:'1',limit:'30',dedupe:'1',countrycodes:'es',q:query}))));return responses.flatMap(r=>r.status==='fulfilled'?r.value:[])}
async function searchNumberedAddress(q){
 const a=numberedAddress(q);if(!a)return [];
 const city=a.city.split(',')[0]||'',urls=new Set(),wanted=normalizedRoad(a.road);
 for(const road of roadVariants(a.road)){
  for(const query of [[road,a.number,city].filter(Boolean).join(', '),[a.number,road,city].filter(Boolean).join(' ')]){
   urls.add(searchEndpoint+'?'+new URLSearchParams({format:'jsonv2',addressdetails:'1',limit:'30',countrycodes:'es',q:query}));
  }
  urls.add(searchEndpoint+'?'+new URLSearchParams({format:'jsonv2',addressdetails:'1',limit:'30',countrycodes:'es',street:a.number+' '+road,...(city?{city}:{})}));
 }
 const responses=await Promise.allSettled([...urls].map(url=>searchFetch(url,6500)));
 const found=[],seen=new Set();
 for(const response of responses){if(response.status!=='fulfilled')continue;
  for(const x of response.value||[]){
   const number=String(x.address?.house_number||'').trim().toLowerCase();
   if(number!==a.number)continue;
   const road=normalizedRoad(x.address?.road||x.address?.pedestrian||x.address?.residential||'');
   if(road&&road!==wanted&&!road.includes(wanted)&&!wanted.includes(road))continue;
   const place=normalizedRoad([x.address?.city,x.address?.town,x.address?.municipality,x.address?.village,x.display_name].filter(Boolean).join(' '));
   if(city&&!place.includes(normalizedRoad(city)))continue;
   const key=x.osm_type+':'+x.osm_id;
   if(!seen.has(key)){seen.add(key);found.push(x)}
  }
 }
 return found;
}
async function searchBusinesses(q){
 if(!userPos||q.trim().length<3)return [];
 const safe=q.trim().slice(0,60).replace(/[^a-zA-Z0-9À-ÿ \-]/g,' ').trim();
 if(!safe)return [];
 const expr='[out:json][timeout:5];(nwr(around:20000,'+userPos[0]+','+userPos[1]+')[name~"'+safe+'",i];);out center 30;';
 try{
  const data=await searchFetch('https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent(expr),4500);
  return (data.elements||[]).map(e=>{
   const t=e.tags||{};
   return {lat:e.lat??e.center?.lat,lon:e.lon??e.center?.lon,name:t.name||q,display_name:[t.name||q,[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' '),t['addr:city']].filter(Boolean).join(', '),place_id:'osm-'+e.type+'-'+e.id};
  }).filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon));
 }catch{return []}
}
function formatPlace(x){
 const n=x.namedetails||{},name=x.name||n['name:es']||n.name||x.display_name?.split(',')[0]||'Lugar',address=x.display_name||'Dirección no disponible';
 return {name,address,label:name===address?name:name+' — '+address};
}
let searchRequest=0;
$('#search').onsubmit=async e=>{
 e.preventDefault();const q=$('#destination').value.trim();if(!q)return;
 const request=++searchRequest;
 savedMenu.classList.add('hidden');results.innerHTML='<div class="result">Buscando destinos…</div>';
 const numbered=numberedAddress(q);
 try{
  const jobs=[numbered?searchNumberedAddress(q):searchPlaces(q)];
  if(!numbered&&userPos)jobs.push(searchBusinesses(q));
  const responses=await Promise.allSettled(jobs);
  if(request!==searchRequest)return;
  const unique=new Map();
  for(const response of responses){
   if(response.status!=='fulfilled')continue;
   for(const x of response.value||[]){
    if(!Number.isFinite(+x.lat)||!Number.isFinite(+x.lon))continue;
    const key=x.place_id||[x.lat,x.lon,x.display_name].join(',');
    if(!unique.has(key))unique.set(key,x);
   }
  }
  const data=[...unique.values()];
  if(userPos)data.sort((a,b)=>distanceM(userPos,[+a.lat,+a.lon])-distanceM(userPos,[+b.lat,+b.lon]));
  results.replaceChildren();
  for(const x of data){
   const p=formatPlace(x),button=document.createElement('button');button.type='button';button.className='result';
   button.textContent=p.label;button.title=p.address;
   button.onclick=()=>choose({...x,display_name:p.label});results.appendChild(button);
  }
  if(!data.length)results.innerHTML='<div class="result">'+(numbered?'No se ha encontrado ese número exacto. Comprueba la dirección.':'No hay resultados disponibles. Prueba el nombre y la localidad.')+'</div>';
 }catch{
  if(request===searchRequest)results.innerHTML='<div class="result">No se pudo completar la búsqueda. Comprueba la conexión.</div>';
 }
};
async function choose(x){setSearchOpen(false);closeQuickMenu();savedMenu.classList.add('hidden');const dest=[+x.lat,+x.lon];currentDest=dest;currentName=x.display_name;addRecent({name:currentName,lat:dest[0],lon:dest[1]});refreshFavoriteStar();finishBtn.classList.add('hidden');startBtn.classList.remove('hidden');if(destMarker)destMarker.setLatLng(dest);else destMarker=L.marker(dest).addTo(map);destMarker.bindPopup(x.display_name).openPopup();map.setView(dest,16);if(is3d)sync3dCamera();if(!userPos)await locate();if(userPos)route(dest,x.display_name)}
async function route(dest,name,fit=true){try{const u=`https://router.project-osrm.org/route/v1/driving/${userPos[1]},${userPos[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&steps=true`,r=await fetch(u),d=await r.json();if(!d.routes?.length)throw 0;const rt=d.routes[0],coords=rt.geometry.coordinates.map(c=>[c[1],c[0]]);routeCoords3d=rt.geometry.coordinates;sync3dOverlays();currentSteps=rt.legs.flatMap(l=>l.steps||[]);if(routeLine)map.removeLayer(routeLine);routeLine=L.polyline(coords,{weight:7,opacity:.85}).addTo(map);if(fit)map.fitBounds(routeLine.getBounds(),{padding:[60,60]});if(is3d)sync3dCamera();$('#routeTitle').textContent=name.split(',')[0];info.textContent=`${(rt.distance/1000).toFixed(1)} km · ${Math.round(rt.duration/60)} min`;if(!navActive)startBtn.classList.remove('hidden');card.classList.remove('hidden');return rt}catch{alert('No se ha podido calcular la ruta. Inténtalo de nuevo.')}}
startBtn.onclick=()=>{if(!routeLine||!currentDest)return;navActive=true;showRoadLabel(userPos,lastRoadName);northUp=false;northBtn.classList.remove('active');northBtn.setAttribute('aria-pressed','false');closeSavedOverlay();document.getElementById('currentRoadLabel')?.classList.remove('hidden');if(lastRoadName)showRoadLabel(userPos,lastRoadName);lastSpokenKey='';manualRotation=0;lastGpsPos=userPos?[...userPos]:null;window.__gpsLastTime=null;currentSpeedEl.textContent='--';speedLimit=null;speedLimitEl.textContent='--';lastLimitCheck=0;startBtn.classList.add('hidden');cancelBtn.classList.remove('hidden');finishBtn.classList.add('hidden');speedPanel.classList.remove('hidden');nextTurn.classList.remove('hidden');map.setView(userPos,18.5);applyMapView(lastHeading);speak('Navegación iniciada. Sigue la ruta indicada.');updateRoadLimit(userPos);updateRoadName(userPos);updateTurnPanel(userPos);if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=navigator.geolocation.watchPosition(async p=>{const prev=lastGpsPos,next=[p.coords.latitude,p.coords.longitude];let h=Number.isFinite(p.coords.heading)&&p.coords.heading>=0&&((p.coords.speed??0)>1.2)?p.coords.heading:null;if(h==null&&prev&&distanceM(prev,next)>4)h=bearing(prev,next);if(h!=null)lastHeading=smoothHeading(lastHeading,h);updateSpeed(p);lastGpsPos=next;setPosition(p);if(navActive&&!northUp&&!gestureActive)manualRotation=0;map.setView(userPos,map.getZoom(),{animate:false});applyMapView(lastHeading);updateRoadLimit(userPos);updateRoadName(userPos);updateTurnPanel(userPos);voiceGuide(userPos);const now=Date.now();if(navActive&&now-lastRoute>15000){lastRoute=now;await route(currentDest,currentName,false)}},()=>{},{enableHighAccuracy:true,maximumAge:1000,timeout:12000})};cancelBtn.onclick=()=>{endTrip(false);if(roadLabel){map.removeLayer(roadLabel);roadLabel=null}if(routeLine){map.removeLayer(routeLine);routeLine=null}if(destMarker){map.removeLayer(destMarker);destMarker=null}currentDest=null;currentSteps=[];routeCoords3d=null;sync3dOverlays();info.textContent='Viaje cancelado'};finishBtn.onclick=()=>{navActive=false;document.body.classList.remove('trip-active');document.getElementById('app').classList.remove('trip-active');closeSavedOverlay();document.getElementById('currentRoadLabel')?.classList.add('hidden');finishBtn.classList.add('hidden');card.classList.add('hidden');nextTurn.classList.add('hidden');manualRotation=0;lastHeading=0;applyMapView(0);if(roadLabel){map.removeLayer(roadLabel);roadLabel=null}if(routeLine){map.removeLayer(routeLine);routeLine=null}if(destMarker){map.removeLayer(destMarker);destMarker=null}currentDest=null;currentSteps=[];routeCoords3d=null;sync3dOverlays();$('#destination').value='';locate()};
map.on('zoomend moveend',()=>{if(is3d&&!navActive)sync3dCamera()});
