package com.velopulse.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.velopulse.app.tracking.TrackingServicePlugin

/**
 * MainActivity für VeloPulse
 * Registriert native Capacitor Plugins
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Registriere TrackingService Plugin
        registerPlugin(TrackingServicePlugin::class.java)

        android.util.Log.i("MainActivity", "✅ VeloPulse MainActivity initialized")
        android.util.Log.i("MainActivity", "   TrackingServicePlugin registered")
    }
}
