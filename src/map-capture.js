import L from 'leaflet';

// Captura la instancia que crea main.js sin modificar su lógica de navegación.
const originalMap=L.map.bind(L);
L.map=function(...args){
  const map=originalMap(...args);
  window.__gpsAiMap=map;
  return map;
};
