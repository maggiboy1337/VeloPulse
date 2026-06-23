package com.velopulse.app.tracking

import android.content.Intent
import android.os.Build
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor Plugin für TrackingService
 * Ermöglicht React-App die Steuerung des nativen Tracking-Services
 */
@CapacitorPlugin(name = "TrackingServicePlugin")
class TrackingServicePlugin : Plugin() {

    /**
     * Startet den Tracking Service
     */
    @PluginMethod
    fun startTracking(call: PluginCall) {
        try {
            val activityId = call.getString("activityId")
            val authToken = call.getString("authToken")
            val apiUrl = call.getString("apiUrl")
            val liveSessionId = call.getString("liveSessionId")
            val updateInterval = call.getInt("updateIntervalMs", 5000)
            val distanceFilter = call.getInt("distanceFilterMeters", 5)

            // Validierung
            if (activityId.isNullOrEmpty()) {
                call.reject("activityId is required")
                return
            }
            if (authToken.isNullOrEmpty()) {
                call.reject("authToken is required")
                return
            }
            if (apiUrl.isNullOrEmpty()) {
                call.reject("apiUrl is required")
                return
            }

            // Intent für Service erstellen
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_START_TRACKING
                putExtra(TrackingService.EXTRA_ACTIVITY_ID, activityId)
                putExtra(TrackingService.EXTRA_AUTH_TOKEN, authToken)
                putExtra(TrackingService.EXTRA_API_URL, apiUrl)
                putExtra(TrackingService.EXTRA_UPDATE_INTERVAL, (updateInterval ?: 5000).toLong())
                putExtra(TrackingService.EXTRA_DISTANCE_FILTER, (distanceFilter ?: 5).toFloat())

                if (!liveSessionId.isNullOrEmpty()) {
                    putExtra(TrackingService.EXTRA_LIVE_SESSION_ID, liveSessionId)
                }
            }

            // Service starten
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }

            call.resolve()
            
            android.util.Log.i("TrackingServicePlugin", "✅ Tracking service start requested")
        } catch (e: Exception) {
            call.reject("Failed to start tracking: ${e.message}", e)
            android.util.Log.e("TrackingServicePlugin", "Failed to start tracking", e)
        }
    }

    /**
     * Stoppt den Tracking Service
     */
    @PluginMethod
    fun stopTracking(call: PluginCall) {
        try {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_STOP_TRACKING
            }
            
            context.startService(intent)
            call.resolve()
            
            android.util.Log.i("TrackingServicePlugin", "🛑 Tracking service stop requested")
        } catch (e: Exception) {
            call.reject("Failed to stop tracking: ${e.message}", e)
            android.util.Log.e("TrackingServicePlugin", "Failed to stop tracking", e)
        }
    }

    /**
     * Pausiert das Tracking
     */
    @PluginMethod
    fun pauseTracking(call: PluginCall) {
        try {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_PAUSE_TRACKING
            }
            
            context.startService(intent)
            call.resolve()
            
            android.util.Log.i("TrackingServicePlugin", "⏸️ Tracking pause requested")
        } catch (e: Exception) {
            call.reject("Failed to pause tracking: ${e.message}", e)
        }
    }

    /**
     * Setzt das Tracking fort
     */
    @PluginMethod
    fun resumeTracking(call: PluginCall) {
        try {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_RESUME_TRACKING
            }
            
            context.startService(intent)
            call.resolve()
            
            android.util.Log.i("TrackingServicePlugin", "▶️ Tracking resume requested")
        } catch (e: Exception) {
            call.reject("Failed to resume tracking: ${e.message}", e)
        }
    }

    /**
     * Gibt den aktuellen Status des Services zurück
     */
    @PluginMethod
    fun getStatus(call: PluginCall) {
        try {
            val ret = com.getcapacitor.JSObject()
            ret.put("isRunning", TrackingService.isRunning)
            ret.put("isPaused", TrackingService.isPaused)
            ret.put("totalDistance", TrackingService.totalDistance)
            
            // Last location
            TrackingService.lastLocation?.let { location ->
                val locationObj = com.getcapacitor.JSObject()
                locationObj.put("latitude", location.latitude)
                locationObj.put("longitude", location.longitude)
                locationObj.put("accuracy", location.accuracy)
                locationObj.put("altitude", if (location.hasAltitude()) location.altitude else null)
                locationObj.put("speed", if (location.hasSpeed()) location.speed * 3.6 else null) // m/s -> km/h
                locationObj.put("timestamp", location.time)
                
                ret.put("lastLocation", locationObj)
            }
            
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to get status: ${e.message}", e)
        }
    }

    /**
     * Prüft ob erforderliche Berechtigungen vorhanden sind
     */
    @PluginMethod
    fun checkTrackingPermissions(call: PluginCall) {
        try {
            val ret = com.getcapacitor.JSObject()

            val hasLocation = hasPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
            val hasBackgroundLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                hasPermission(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            } else {
                true // Not required on Android < 10
            }

            ret.put("location", hasLocation)
            ret.put("backgroundLocation", hasBackgroundLocation)
            ret.put("allGranted", hasLocation && hasBackgroundLocation)

            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to check permissions: ${e.message}", e)
        }
    }

    /**
     * Fordert erforderliche Berechtigungen an
     */
    @PluginMethod
    fun requestTrackingPermissions(call: PluginCall) {
        try {
            val permissions = mutableListOf(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            )

            // Android 10+ requires separate background location permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                permissions.add(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
            
            // Android 13+ requires notification permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
            }
            
            requestPermissionForAliases(
                permissions.toTypedArray(),
                call,
                "permissionCallback"
            )
        } catch (e: Exception) {
            call.reject("Failed to request permissions: ${e.message}", e)
        }
    }

    /**
     * Callback für Permission Request
     */
    @PluginMethod
    fun permissionCallback(call: PluginCall) {
        val ret = com.getcapacitor.JSObject()
        
        val hasLocation = hasPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
        val hasBackgroundLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            hasPermission(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            true
        }
        
        ret.put("location", hasLocation)
        ret.put("backgroundLocation", hasBackgroundLocation)
        ret.put("allGranted", hasLocation && hasBackgroundLocation)
        
        call.resolve(ret)
    }
}
