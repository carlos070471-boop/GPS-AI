const mapEl=document.getElementById('map');
const routeInfo=document.getElementById('routeInfo');
let etaSeconds=null,lastEtaUpdate=0;

// La rotación/perspectiva se aplica a una capa exterior. Leaflet conserva #map
// sin transformaciones CSS propias, de modo que su pinch-zoom puede trabajar
// sobre sus teselas sin recortar el lienzo.
const stage=document.createElement('div');
stage.id='mapStage';
mapEl.parentNode.insertBefore(stage,mapEl);
stage.appendChild(mapEl);

const styleProto=CSSStyleDeclaration.prototype;
const transformDesc=Object.getOwnPropertyDescriptor(styleProto,'transform');
if(transformDesc?.set&&transformDesc?.get){
  Object.defineProperty(mapEl.style,'transform',{
    configurable:true,
    get(){return stage.style.transform||''},
    set(v){stage.style.transform=v||''}
  });
  Object.defineProperty(mapEl.style,'transformOrigin',{
    configurable:true,
    get(){return stage.style.transformOrigin||''},
    set(v){stage.style.transformOrigin=v||''}
  });
}

function formatEta(seconds){
  const mins=Math.max(0,Math.ceil(Number(seconds||0)/60));
  const h=Math.floor(mins/60),m=mins%60;
  return h?`${h} h ${m} min`:`${m} min`;
}
function paintEta(){
  if(!routeInfo||etaSeconds==null)return;
  const base=routeInfo.textContent.replace(/\s*·\s*(?:\d+\s*h\s*)?\d+\s*min\s*(?:restantes)?\s*$/i,'').trim();
  routeInfo.textContent=`${base} · ${formatEta(etaSeconds)} restantes`;
}

// Captura la duración real que devuelve OSRM. Cada nuevo cálculo de ruta
// sustituye la estimación anterior; entre recálculos descontamos el tiempo real.
const originalFetch=window.fetch.bind(window);
window.fetch=async(...args)=>{
  const response=await originalFetch(...args);
  try{
    const url=String(args[0]?.url||args[0]||'');
    if(url.includes('router.project-osrm.org/route/v1/driving/')){
      const clone=response.clone();
      clone.json().then(data=>{
        const duration=data?.routes?.[0]?.duration;
        if(Number.isFinite(duration)){
          etaSeconds=duration;
          lastEtaUpdate=Date.now();
          setTimeout(paintEta,0);
        }
      }).catch(()=>{});
    }
  }catch{}
  return response;
};

setInterval(()=>{
  if(etaSeconds==null||!lastEtaUpdate)return;
  const now=Date.now();
  const elapsed=(now-lastEtaUpdate)/1000;
  if(elapsed>=20){
    etaSeconds=Math.max(0,etaSeconds-elapsed);
    lastEtaUpdate=now;
    paintEta();
  }
},20000);

// Tras los gestos, fuerza un redibujado visual de las teselas sin tocar la UI.
mapEl.addEventListener('touchend',()=>{
  setTimeout(()=>window.dispatchEvent(new Event('resize')),60);
},{passive:true});