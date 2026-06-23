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
        android.util.Log.d("MainActivity", "onCreate() called - BEFORE super.onCreate()")

        super.onCreate(savedInstanceState)

        android.util.Log.d("MainActivity", "onCreate() called - AFTER super.onCreate()")

        try {
            // Registriere TrackingService Plugin
            android.util.Log.d("MainActivity", "Attempting to register TrackingServicePlugin...")
            registerPlugin(TrackingServicePlugin::class.java)
            android.util.Log.i("MainActivity", "✅ TrackingServicePlugin registered successfully")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "❌ Failed to register TrackingServicePlugin", e)
        }

        android.util.Log.i("MainActivity", "✅ VeloPulse MainActivity initialized")
    }
}
