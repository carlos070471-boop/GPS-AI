import L from 'leaflet';

function getMap(){return window.__gpsAiMap||null}

function tuneTileLayers(map){
  map.eachLayer(layer=>{
    if(layer instanceof L.TileLayer){
      layer.options.keepBuffer=10;
      layer.options.updateWhenZooming=true;
      layer.options.updateWhenIdle=false;
      layer.options.updateInterval=80;
    }
  });
}

function refreshMap(map){
  tuneTileLayers(map);
  map.invalidateSize({pan:false,animate:false});
  map.eachLayer(layer=>{
    if(layer instanceof L.TileLayer&&typeof layer.redraw==='function') layer.redraw();
  });
}

function install(){
  const map=getMap();
  if(!map){setTimeout(install,80);return}
  tuneTileLayers(map);
  const mapEl=document.getElementById('map');
  const view3d=document.getElementById('view3d');
  const zoomIn=document.getElementById('zoomIn');
  const zoomOut=document.getElementById('zoomOut');

  map.on('zoomstart',()=>tuneTileLayers(map));
  map.on('zoomend',()=>{refreshMap(map);setTimeout(()=>refreshMap(map),120)});
  map.on('moveend',()=>tuneTileLayers(map));

  view3d?.addEventListener('click',()=>{
    setTimeout(()=>refreshMap(map),30);
    setTimeout(()=>refreshMap(map),220);
    setTimeout(()=>refreshMap(map),520);
  });
  zoomIn?.addEventListener('click',()=>setTimeout(()=>refreshMap(map),140));
  zoomOut?.addEventListener('click',()=>setTimeout(()=>refreshMap(map),140));

  mapEl?.addEventListener('touchend',()=>setTimeout(()=>refreshMap(map),100),{passive:true});

  const observer=new MutationObserver(()=>{
    tuneTileLayers(map);
    if(mapEl?.classList.contains('perspective')) setTimeout(()=>refreshMap(map),60);
  });
  if(mapEl) observer.observe(mapEl,{attributes:true,attributeFilter:['class']});
}

install();
