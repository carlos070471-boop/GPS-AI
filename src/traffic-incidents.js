// Capa gratuita de tráfico/incidencias basada en datos abiertos del SCT (Cataluña).
// Rojo = retención/corte/incidencia fuerte; amarillo = afectación moderada.
// Las vías sin incidencia permanecen con el color normal del mapa.
const TRAFFIC_URL='https://www.gencat.cat/transit/opendata/incidenciesGML.xml';
const REFRESH_MS=5*60*1000;
let trafficLayer=null;

function textOf(el,names){for(const n of names){const x=el.getElementsByTagName(n)[0]||el.getElementsByTagNameNS('*',n)[0];if(x?.textContent?.trim())return x.textContent.trim()}return''}
function severity(text){const s=(text||'').toLowerCase();if(/tall|tanc|retenci|aturat|bloque|accident|greu|intens|congest|cua|cortad/.test(s))return'heavy';return'moderate'}
function coordsFrom(el){const tags=['pos','coordinates','posList'];for(const tag of tags){const nodes=[...el.getElementsByTagNameNS('*',tag)];for(const n of nodes){const nums=(n.textContent.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);if(nums.length>=2){let a=nums[0],b=nums[1];if(Math.abs(a)>90||Math.abs(b)<=90&&Math.abs(a)<20){const t=a;a=b;b=t}if(Math.abs(a)<=90&&Math.abs(b)<=180)return[a,b]}}}return null}
function entries(doc){const all=[...doc.getElementsByTagName('*')];return all.filter(e=>/incid|situation|record|featuremember|member/i.test(e.localName||e.nodeName))}
function popupText(el){return textOf(el,['descripcio','description','nom','name','via','road','carretera','causa','cause'])||'Incidencia de tráfico'}

async function loadTraffic(){
  if(!window.L||!window.__gpsAiMap)return;
  try{
    const r=await fetch(TRAFFIC_URL,{cache:'no-store'});if(!r.ok)throw new Error('traffic');
    const xml=await r.text(),doc=new DOMParser().parseFromString(xml,'application/xml');
    const group=L.layerGroup();const seen=new Set();
    for(const el of entries(doc)){
      const p=coordsFrom(el);if(!p)continue;const key=p.map(v=>v.toFixed(4)).join(',');if(seen.has(key))continue;seen.add(key);
      const desc=popupText(el),heavy=severity(desc)==='heavy';
      L.circleMarker(p,{radius:heavy?9:7,weight:3,color:heavy?'#d60000':'#f4b400',fillColor:heavy?'#d60000':'#f4b400',fillOpacity:.75}).bindPopup(`<b>${heavy?'TRÁFICO INTENSO':'TRÁFICO MODERADO'}</b><br>${desc.replace(/[<>]/g,'')}`).addTo(group);
    }
    if(trafficLayer)window.__gpsAiMap.removeLayer(trafficLayer);trafficLayer=group.addTo(window.__gpsAiMap);
  }catch(e){console.warn('Datos de tráfico no disponibles',e)}
}

function start(){if(!window.__gpsAiMap){setTimeout(start,300);return}loadTraffic();setInterval(loadTraffic,REFRESH_MS)}
start();