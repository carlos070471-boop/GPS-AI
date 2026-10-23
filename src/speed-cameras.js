import L from 'leaflet';

// Datos comunitarios cercanos. Los controles móviles se presentan siempre como
// zonas posibles, nunca como una posición en tiempo real.
const CAMERA_QUERY='[out:json][timeout:12];(node(around:25000,{lat},{lon})[highway=speed_camera];node(around:25000,{lat},{lon})[enforcement=maxspeed];node(around:25000,{lat},{lon})[enforcement=speed_camera];node(around:25000,{lat},{lon})[speed_camera];node(around:25000,{lat},{lon})[enforcement=traffic_signals];node(around:25000,{lat},{lon})[camera:type=red_light];node(around:25000,{lat},{lon})[man_made=surveillance][surveillance:type=camera][surveillance:zone=traffic];);out tags;';
let points=[],markers=[],mobileZones=[],lastLoadPos=null,lastLoadAt=0,lastAlertId='',lastAlertAt=0;const alerted=new Map();
const map=()=>window.__gpsAiMap||null;
function dist(a,b){const R=6371000,r=Math.PI/180,dLat=(b[0]-a[0])*r,dLon=(b[1]-a[1])*r,p1=a[0]*r,p2=b[0]*r,h=Math.sin(dLat/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function say(text){try{if(window.NativeVoice?.speak){window.NativeVoice.speak({text});return}}catch{}if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(text);u.lang='es-ES';u.rate=1;window.speechSynthesis.cancel();window.speechSynthesis.speak(u)}
function clearMarkers(){const m=map();if(m)markers.forEach(x=>{try{m.removeLayer(x)}catch{}});markers=[]}
function label(p){return p.kind==='radar'?'Radar fijo':p.kind==='redlight'?'Cámara de semáforo':'Cámara de tráfico'}
function emoji(p){return p.kind==='radar'?'📷':p.kind==='redlight'?'🚦':'🎥'}
function cameraSize(){const z=map()?.getZoom()??16;return Math.max(10,Math.min(46,Math.round(26*Math.pow(1.24,z-16))))}
function paint(){const m=map();if(!m)return;clearMarkers();[...points,...mobileZones].forEach(p=>{const size=cameraSize();const icon=L.divIcon({className:'camera-marker',html:`<span style="font-size:${size}px;line-height:${size}px;display:block">${p.kind==='mobile'?'⚠️':emoji(p)}</span>`,iconSize:[size,size],iconAnchor:[size/2,size/2]});markers.push(L.marker([p.lat,p.lon],{icon,interactive:true,zIndexOffset:650}).addTo(m).bindTooltip(p.kind==='mobile'?'Zona de posible control móvil':label(p)))})}
function classify(e){const t=e.tags||{};if(t.enforcement==='traffic_signals'||t['camera:type']==='red_light'||t['enforcement:type']==='traffic_signals')return'redlight';if(t.highway==='speed_camera'||t.enforcement==='maxspeed'||t.enforcement==='speed_camera'||t.speed_camera)return'radar';return'camera'}
async function loadNearby(lat,lon){const now=Date.now(),pos=[lat,lon];if(lastLoadPos&&dist(lastLoadPos,pos)<5000&&now-lastLoadAt<20*60*1000)return;lastLoadPos=pos;lastLoadAt=now;try{const q=CAMERA_QUERY.replaceAll('{lat}',String(lat)).replaceAll('{lon}',String(lon));const urls=['https://overpass-api.de/api/interpreter?data=','https://overpass.kumi.systems/api/interpreter?data='];let data=null;for(const base of urls){try{const r=await fetch(base+encodeURIComponent(q));if(r.ok){data=await r.json();break}}catch{}}if(!data)return;points=(data.elements||[]).map(e=>({id:`osm-${e.type}-${e.id}`,lat:+e.lat,lon:+e.lon,kind:classify(e)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));paint()}catch(e){console.warn('No se pudieron actualizar radares/cámaras',e)}}
function setMobileZones(zones=[]){mobileZones=zones.map((z,i)=>({id:z.id||`mobile-${i}`,lat:+z.lat,lon:+z.lon,kind:'mobile',road:z.road||''})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));paint()}
function check(lat,lon){
 const now=Date.now(),pos=[lat,lon];
 // Avisar al entrar en la franja de 500-800 m, y como máximo una vez
 // cada diez minutos por radar. No anunciar puntos a más de 800 m.
 const nearby=[...points,...mobileZones].map(p=>({p,d:dist(pos,[p.lat,p.lon])})).filter(x=>x.d<=800&&x.d>=0).sort((a,b)=>a.d-b.d);
 for(const {p,d} of nearby){
  if(now-(alerted.get(p.id)||0)<10*60*1000)continue;
  alerted.set(p.id,now);
  const meters=Math.max(50,Math.round(d/50)*50);
  if(p.kind==='radar')say(`Atención, radar fijo a ${meters} metros`);
  else if(p.kind==='redlight')say(`Atención, cámara de semáforo a ${meters} metros`);
  else if(p.kind==='mobile')say(`Atención, zona de posible control móvil a ${meters} metros`);
  else say(`Atención, cámara de tráfico a ${meters} metros`);
  break;
 }
}
function onPosition(lat,lon){loadNearby(lat,lon);check(lat,lon)}
window.addEventListener('gpsai-position',e=>{const {lat,lon}=e.detail||{};if(Number.isFinite(lat)&&Number.isFinite(lon))onPosition(lat,lon)});
window.addEventListener('gpsai-mobile-zones',e=>setMobileZones(e.detail?.zones||[]));
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>onPosition(p.coords.latitude,p.coords.longitude),()=>{},{enableHighAccuracy:false,timeout:8000,maximumAge:60000})}
window.__gpsAiSpeedCameras={refresh:loadNearby,check,setMobileZones};

function attachCameraZoom(){const m=map();if(!m){setTimeout(attachCameraZoom,400);return}m.on('zoomend',paint)}
attachCameraZoom();
