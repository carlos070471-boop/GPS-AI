const mapEl=document.getElementById('map');
const routeInfo=document.getElementById('routeInfo');
const cancelBtn=document.getElementById('cancelNav');
let etaSeconds=null,lastEtaUpdate=0;

// Capa exterior para rotación/perspectiva. Leaflet mantiene #map sin
// transformaciones propias para que zoom, teselas y gestos sigan funcionando.
const stage=document.createElement('div');
stage.id='mapStage';
mapEl.parentNode.insertBefore(stage,mapEl);
stage.appendChild(mapEl);

try{
  Object.defineProperty(mapEl.style,'transform',{configurable:true,get(){return stage.style.transform||''},set(v){stage.style.transform=v||''}});
  Object.defineProperty(mapEl.style,'transformOrigin',{configurable:true,get(){return stage.style.transformOrigin||''},set(v){stage.style.transformOrigin=v||''}});
}catch(e){console.warn('No se pudo instalar proxy de transformación',e)}

const view3dBtn=document.getElementById('view3d');
if(view3dBtn){view3dBtn.addEventListener('click',()=>{setTimeout(()=>{const active=mapEl.classList.contains('perspective');if(active){const current=stage.style.transform||'';if(!current.includes('perspective(')){const rotate=current.match(/rotate\([^)]*\)/)?.[0]||'rotate(0deg)';stage.style.transform=`perspective(700px) rotateX(36deg) ${rotate} scale(1.18)`;stage.style.transformOrigin='center 62%'}}else{stage.style.transform=(stage.style.transform.match(/rotate\([^)]*\)/)?.[0]||'rotate(0deg)');stage.style.transformOrigin='center center'}window.dispatchEvent(new Event('resize'))},0)})}

// Aviso acústico de exceso de velocidad: pitido suave durante un máximo de 3 s.
// Se activa una sola vez al entrar en exceso y no vuelve a sonar hasta bajar
// al límite y superarlo de nuevo.
const limitSign=document.getElementById('limitSign');
let speedWasOver=false,beepCtx=null,beepTimer=null;
function softSpeedBeep(){
  try{
    if(beepTimer)return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    beepCtx=beepCtx||new AC();
    if(beepCtx.state==='suspended')beepCtx.resume();
    const osc=beepCtx.createOscillator(),gain=beepCtx.createGain();
    osc.type='sine';osc.frequency.value=660;
    gain.gain.setValueAtTime(0.035,beepCtx.currentTime);
    osc.connect(gain);gain.connect(beepCtx.destination);osc.start();
    // Pitido intermitente y discreto, limitado estrictamente a tres segundos.
    let on=true;
    const pulse=setInterval(()=>{on=!on;gain.gain.setTargetAtTime(on?0.035:0,beepCtx.currentTime,0.015)},250);
    beepTimer=setTimeout(()=>{clearInterval(pulse);try{gain.gain.setValueAtTime(0,beepCtx.currentTime);osc.stop()}catch{}beepTimer=null},3000);
  }catch{beepTimer=null}
}
if(limitSign){
  const checkSpeedAlert=()=>{const over=limitSign.classList.contains('over');if(over&&!speedWasOver)softSpeedBeep();speedWasOver=over};
  new MutationObserver(checkSpeedAlert).observe(limitSign,{attributes:true,attributeFilter:['class']});
}

const etaBox=document.createElement('div');
etaBox.id='etaBox';etaBox.className='hidden';etaBox.innerHTML='<small>RESTANTE</small><strong id="etaValue">--</strong>';document.getElementById('app').appendChild(etaBox);
const etaValue=document.getElementById('etaValue');
function formatEta(seconds){const mins=Math.max(0,Math.ceil(Number(seconds||0)/60));const h=Math.floor(mins/60),m=mins%60;return h?`${h} h ${m} min`:`${m} min`}
function navigationActive(){return cancelBtn&&!cancelBtn.classList.contains('hidden')}
function paintEta(){if(etaSeconds==null)return;const formatted=formatEta(etaSeconds);if(etaValue)etaValue.textContent=formatted;if(routeInfo){const base=routeInfo.textContent.replace(/\s*·\s*(?:\d+\s*h\s*)?\d+\s*min\s*(?:restantes)?\s*$/i,'').trim();routeInfo.textContent=`${base} · ${formatted} restantes`}etaBox.classList.toggle('hidden',!navigationActive())}
function syncCompactControls(){const active=navigationActive();etaBox.classList.toggle('hidden',!active||etaSeconds==null);document.body.classList.toggle('trip-active',active)}
new MutationObserver(syncCompactControls).observe(cancelBtn,{attributes:true,attributeFilter:['class']});
const originalFetch=window.fetch.bind(window);
window.fetch=async(...args)=>{const response=await originalFetch(...args);try{const url=String(args[0]?.url||args[0]||'');if(url.includes('router.project-osrm.org/route/v1/driving/')){response.clone().json().then(data=>{const duration=data?.routes?.[0]?.duration;if(Number.isFinite(duration)){etaSeconds=duration;lastEtaUpdate=Date.now();setTimeout(()=>{paintEta();syncCompactControls()},0)}}).catch(()=>{})}}catch{}return response};
setInterval(()=>{if(etaSeconds==null||!lastEtaUpdate)return;const now=Date.now(),elapsed=(now-lastEtaUpdate)/1000;if(elapsed>=20){etaSeconds=Math.max(0,etaSeconds-elapsed);lastEtaUpdate=now;paintEta()}},20000);
mapEl.addEventListener('touchend',()=>{setTimeout(()=>window.dispatchEvent(new Event('resize')),60)},{passive:true});
syncCompactControls();