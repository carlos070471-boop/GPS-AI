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
    private boolean configure(String choice,float rate){
        if(tts==null)return false;
        String language=choice!=null&&choice.startsWith("ca-")?"ca":"es";
        Locale locale=new Locale(language,"ES");
        if(tts.isLanguageAvailable(locale)<TextToSpeech.LANG_AVAILABLE)return false;
        tts.setLanguage(locale);
        tts.setSpeechRate(Math.max(.7f,Math.min(1.3f,rate)));
        boolean male=choice!=null&&choice.endsWith("-male");
        Set<Voice> voices=tts.getVoices();
        if(voices==null)return false;
        for(Voice v:voices){
            if(v.getLocale()==null||!language.equals(v.getLocale().getLanguage()))continue;
            String n=v.getName().toLowerCase(Locale.ROOT);
            boolean looksFemale=n.contains("female")||n.contains("mujer")||n.contains("dona")||n.contains("maria")||n.contains("laura")||n.contains("sofia")||n.contains("paulina")||n.contains("helena");
            boolean looksMale=!looksFemale&&(n.contains("male")||n.contains("hombre")||n.contains("home")||n.contains("carlos")||n.contains("jorge")||n.contains("pablo")||n.contains("diego")||n.contains("joan")||n.contains("enric"));
            if(male?looksMale:looksFemale){tts.setVoice(v);return true;}
        }
        return false;
    }
    @PluginMethod public void speak(PluginCall call){String text=call.getString("text","");String voice=call.getString("voice","es-ES-female");Double r=call.getDouble("rate",1.0);if(!ready||tts==null){call.reject("Motor de voz no disponible");return;}if(!configure(voice,r.floatValue())){call.reject("No hay una voz compatible instalada para esta selección");return;}Bundle b=new Bundle();int result=tts.speak(text,TextToSpeech.QUEUE_FLUSH,b,"gpsai-"+System.currentTimeMillis());if(result==TextToSpeech.ERROR)call.reject("No se pudo reproducir la voz");else call.resolve();}
    @PluginMethod public void speakAndWait(PluginCall call){
        String text=call.getString("text","");String voice=call.getString("voice","es-ES-female");Double rate=call.getDouble("rate",1.0);
        if(!ready||tts==null){call.reject("Motor de voz no disponible");return;}
        if(!configure(voice,rate.floatValue())){call.reject("No hay una voz compatible instalada para esta selección");return;}
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
