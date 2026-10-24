const native=()=>window.Capacitor?.Plugins?.NativeVoice||null;
class NativeUtterance{constructor(text=''){this.text=text;this.lang='es-ES';this.rate=1;this.volume=1;this.voice=null;this.onerror=null;this.onend=null;}}
const bridge={onvoiceschanged:null,getVoices(){return[]},cancel(){native()?.stop?.().catch(()=>{})},resume(){},speak(u){const p=native();if(!p)return;p.speak({text:String(u?.text||''),voice:window.GPSAIVoiceChoice||`${u?.lang||'es-ES'}-female`,rate:Number(u?.rate||1),volume:Number(u?.volume??1)}).then(()=>u?.onend?.()).catch(e=>u?.onerror?.(e));}};
try{Object.defineProperty(window,'speechSynthesis',{value:bridge,configurable:true});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:NativeUtterance,configurable:true});}catch{window.speechSynthesis=bridge;window.SpeechSynthesisUtterance=NativeUtterance;}
window.GPSAINativeVoice=bridge;
