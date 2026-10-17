import L from 'leaflet';

// Tráfico gratuito oficial del Servei Català de Trànsit.
// La capa "Nivell de servei" del WMS representa la densidad de circulación
// y se actualiza aproximadamente cada 8 minutos según el SCT.
const SCT_WMS='https://sctwms.gencat.cat/WMS/mapserv.exe?map=EstatDelTransit.map';
const REFRESH_MS=8*60*1000;
let trafficLayer=null;

function installTraffic(){
  const map=window.__gpsAiMap;
  if(!map){setTimeout(installTraffic,300);return}
  try{
    trafficLayer=L.tileLayer.wms(SCT_WMS,{
      layers:'NivellServei',
      format:'image/png',
      transparent:true,
      version:'1.1.1',
      uppercase:true,
      opacity:.82,
      attribution:'Tráfico: Servei Català de Trànsit'
    });
    trafficLayer.addTo(map);
    // Mantener la información de tráfico por encima del mapa base/satélite
    // pero debajo de marcadores y rutas de navegación.
    if(trafficLayer.setZIndex)trafficLayer.setZIndex(450);
    setInterval(()=>{
      if(!trafficLayer)return;
      trafficLayer.setParams({_ts:Date.now()},false);
      trafficLayer.redraw();
    },REFRESH_MS);
  }catch(e){console.warn('Capa SCT no disponible',e)}
}
installTraffic();