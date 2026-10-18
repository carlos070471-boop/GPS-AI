package com.gpsai.app.car;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.model.NavigationTemplate;

public class GpsAiNavigationScreen extends Screen {
    public GpsAiNavigationScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        Action recenter = new Action.Builder()
                .setIcon(CarIcon.APP_ICON)
                .setOnClickListener(() -> invalidate())
                .build();

        ActionStrip mapActions = new ActionStrip.Builder()
                .addAction(recenter)
                .build();

        return new NavigationTemplate.Builder()
                .setMapActionStrip(mapActions)
                .build();
    }
}
