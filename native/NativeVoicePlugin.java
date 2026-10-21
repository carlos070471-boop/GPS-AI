package com.gpsai.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "NativeVoice")
public class NativeVoicePlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech tts;
    private boolean ready=false;
    @Override public void load(){ tts=new TextToSpeech(getContext(),this); }
    @Override public void onInit(int status){ ready=status==TextToSpeech.SUCCESS; if(ready){tts.setSpeechRate(1f);tts.setPitch(1f);} }
    private void configure(String choice,float rate){
        if(tts==null)return;
        Locale locale=choice!=null&&choice.startsWith("es-CO")?new Locale("es","CO"):new Locale("es","ES");
        tts.setLanguage(locale);tts.setSpeechRate(Math.max(.7f,Math.min(1.3f,rate)));
        boolean male=choice!=null&&choice.endsWith("male");
        Set<Voice> voices=tts.getVoices();Voice fallback=null;
        if(voices!=null)for(Voice v:voices){if(v.getLocale()!=null&&v.getLocale().getLanguage().equals("es")){if(fallback==null)fallback=v;String n=v.getName().toLowerCase();boolean looksMale=n.contains("male")||n.contains("hombre")||n.contains("carlos")||n.contains("jorge")||n.contains("pablo")||n.contains("diego");boolean looksFemale=n.contains("female")||n.contains("mujer")||n.contains("maria")||n.contains("laura")||n.contains("sofia")||n.contains("paulina");if((male&&looksMale)||(!male&&looksFemale)){tts.setVoice(v);return;}}}
        if(fallback!=null)tts.setVoice(fallback);
    }
    @PluginMethod public void speak(PluginCall call){String text=call.getString("text","");String voice=call.getString("voice","es-ES-female");Double r=call.getDouble("rate",1.0);if(!ready||tts==null){call.reject("Motor de voz no disponible");return;}configure(voice,r.floatValue());Bundle b=new Bundle();int result=tts.speak(text,TextToSpeech.QUEUE_FLUSH,b,"gpsai-"+System.currentTimeMillis());if(result==TextToSpeech.ERROR)call.reject("No se pudo reproducir la voz");else call.resolve();}
    @PluginMethod public void speakAndWait(PluginCall call){
        String text=call.getString("text","");String voice=call.getString("voice","es-ES-female");Double rate=call.getDouble("rate",1.0);
        if(!ready||tts==null){call.reject("Motor de voz no disponible");return;}
        configure(voice,rate.floatValue());
        String id="weather-"+System.nanoTime();
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
            @Override public void onStart(String utteranceId){}
            @Override public void onDone(String utteranceId){if(id.equals(utteranceId))call.resolve();}
            @Override public void onError(String utteranceId){if(id.equals(utteranceId))call.reject("Error en la locución meteorológica");}
            @Override public void onStop(String utteranceId,boolean interrupted){if(id.equals(utteranceId))call.reject("Locución interrumpida");}
        });
        int result=tts.speak(text,TextToSpeech.QUEUE_FLUSH,new Bundle(),id);
        if(result==TextToSpeech.ERROR)call.reject("No se pudo iniciar la locución");
    }
    @PluginMethod public void stop(PluginCall call){if(tts!=null)tts.stop();call.resolve();}
    @Override protected void handleOnDestroy(){if(tts!=null){tts.stop();tts.shutdown();tts=null;}super.handleOnDestroy();}
}
