import L from 'leaflet';

let heading=0, userTriangle=null, trafficLights=[], trafficLightMarkers=[], lastLightsPos=null, lastLightsAt=0;
const map=()=>window.__gpsAiMap||null;
const distance=(a,b)=>{const R=6371000,r=Math.PI/180,dLat=(b[0]-a[0])*r,dLon=(b[1]-a[1])*r,p1=a[0]*r,p2=b[0]*r,h=Math.sin(dLat/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
function triangleIcon(h=0){return L.divIcon({className:'gps-heading-marker',html:`<div class="gps-heading-triangle" style="transform:rotate(${h}deg)"></div>`,iconSize:[20,20],iconAnchor:[10,10]})}
function updateTriangle(lat,lon,h){const m=map();if(!m)return;if(Number.isFinite(h)&&h>=0)heading=h;if(!userTriangle)userTriangle=L.marker([lat,lon],{icon:triangleIcon(heading),interactive:false,zIndexOffset:1000}).addTo(m);else{userTriangle.setLatLng([lat,lon]);userTriangle.setIcon(triangleIcon(heading))}}
function clearLights(){const m=map();if(m)trafficLightMarkers.forEach(x=>{try{m.removeLayer(x)}catch{}});trafficLightMarkers=[]}
function paintLights(){const m=map();if(!m)return;clearLights();trafficLights.forEach(p=>{const icon=L.divIcon({className:'traffic-light-marker',html:'🚦',iconSize:[18,18],iconAnchor:[9,9]});trafficLightMarkers.push(L.marker([p.lat,p.lon],{icon,interactive:false,zIndexOffset:500}).addTo(m))})}
async function loadLights(lat,lon){const now=Date.now(),pos=[lat,lon];if(lastLightsPos&&distance(lastLightsPos,pos)<3000&&now-lastLightsAt<15*60*1000)return;lastLightsPos=pos;lastLightsAt=now;const q=`[out:json][timeout:10];node(around:12000,${lat},${lon})[highway=traffic_signals];out;`;for(const base of ['https://overpass-api.de/api/interpreter?data=','https://overpass.kumi.systems/api/interpreter?data=']){try{const r=await fetch(base+encodeURIComponent(q));if(!r.ok)continue;const d=await r.json();trafficLights=(d.elements||[]).map(e=>({lat:+e.lat,lon:+e.lon})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));paintLights();return}catch{}}}
function onPosition(d={}){if(!Number.isFinite(d.lat)||!Number.isFinite(d.lon))return;updateTriangle(d.lat,d.lon,d.heading);loadLights(d.lat,d.lon)}
window.addEventListener('gpsai-position',e=>onPosition(e.detail||{}));
if(navigator.geolocation)navigator.geolocation.watchPosition(p=>onPosition({lat:p.coords.latitude,lon:p.coords.longitude,heading:p.coords.heading}),()=>{},{enableHighAccuracy:true,maximumAge:2000,timeout:10000});
