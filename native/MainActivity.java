package com.gpsai.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState){
        registerPlugin(NativeVoicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
