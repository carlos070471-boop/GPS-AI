import L from 'leaflet';

// Captura la instancia y desactiva las animaciones de teselas/zoom que en Android WebView
// pueden dejar bordes sin dibujar cuando el mapa está rotado o inclinado.
const originalMap=L.map.bind(L);
L.map=function(id,options={}){
  const map=originalMap(id,{...options,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
  window.__gpsAiMap=map;
  window.L=L;
  map.on('zoomend resize moveend',()=>requestAnimationFrame(()=>map.invalidateSize({pan:false,animate:false})));
  return map;
};