package com.velopulse.app;

import android.os.Bundle;
import android.os.PowerManager;
import android.content.Context;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep WebView alive in background
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "VeloPulse::BackgroundTracking"
        );
    }

    @Override
    protected void onResume() {
        super.onResume();

        // Keep CPU awake for background tracking
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();

        // DO NOT release wake lock - keep running in background
        // This allows JavaScript to continue running
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        // Release wake lock only when app is destroyed
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
