package com.velopulse.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.velopulse.app.plugins.ForegroundTrackingPlugin

/**
 * MainActivity für VeloPulse
 * Registriert ForegroundTrackingPlugin
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Plugin wird automatisch über @CapacitorPlugin Annotation erkannt
        registerPlugin(ForegroundTrackingPlugin::class.java)

        android.util.Log.i("MainActivity", "✅ VeloPulse initialized with ForegroundTracking")
    }
}
