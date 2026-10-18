package com.gpsai.app.car;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;

public class GpsAiCarAppService extends CarAppService {
    @NonNull
    @Override
    public HostValidator createHostValidator() {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
        }
        return new HostValidator.Builder(getApplicationContext()).build();
    }

    @NonNull
    @Override
    public Session onCreateSession() {
        return new GpsAiCarSession();
    }
}
