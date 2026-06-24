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

        // Plugin explizit registrieren
        android.util.Log.i("MainActivity", "🔧 Registering ForegroundTrackingPlugin...")

        try {
            registerPlugin(ForegroundTrackingPlugin::class.java)
            android.util.Log.i("MainActivity", "✅ ForegroundTrackingPlugin registered successfully")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "❌ Failed to register plugin", e)
        }

        android.util.Log.i("MainActivity", "✅ VeloPulse initialized - Build v1.0.7")
    }
}
