import L from 'leaflet';

// Vista satélite alternativa sin depender de Google Maps ni de una clave de Google.
// La capa usa World Imagery y mantiene encima las rutas, marcadores y tráfico de Leaflet.
const mapEl=document.getElementById('map');
const satelliteBtn=document.getElementById('satelliteMode');
let satelliteLayer=null;
let satelliteOn=false;

function findLeafletMap(){
  // main.js crea el mapa antes de cargar este módulo. Leaflet no expone una referencia
  // global, así que localizamos el mapa a través de las capas registradas en el elemento.
  const id=mapEl?._leaflet_id;
  if(!id)return null;
  // La referencia se publica mediante un pequeño evento para evitar tocar la lógica de navegación.
  return window.__gpsAiMap||null;
}

function ensureSatelliteLayer(map){
  if(satelliteLayer)return satelliteLayer;
  satelliteLayer=L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom:19,
      attribution:'Tiles © Esri — Source: Esri, Vantor, Earthstar Geographics and the GIS User Community'
    }
  );
  return satelliteLayer;
}

function toggleSatellite(){
  const map=findLeafletMap();
  if(!map)return;
  satelliteOn=!satelliteOn;
  const layer=ensureSatelliteLayer(map);
  if(satelliteOn){
    layer.addTo(map);
    // Mantener los elementos interactivos de navegación visibles sobre la fotografía.
    layer.bringToBack();
    satelliteBtn.classList.add('active');
    satelliteBtn.textContent='MAPA';
    satelliteBtn.setAttribute('aria-pressed','true');
  }else{
    map.removeLayer(layer);
    satelliteBtn.classList.remove('active');
    satelliteBtn.textContent='SATÉLITE';
    satelliteBtn.setAttribute('aria-pressed','false');
  }
}

satelliteBtn?.addEventListener('click',toggleSatellite);
