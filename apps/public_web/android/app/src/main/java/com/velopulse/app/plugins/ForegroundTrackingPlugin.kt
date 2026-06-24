package com.velopulse.app.plugins

import android.content.Intent
import android.os.Build
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.velopulse.app.tracking.TrackingService

/**
 * Einfaches Capacitor Plugin für direkten Service-Start
 * Ohne komplexe Registrierungs-Logik
 */
@CapacitorPlugin(name = "ForegroundTracking")
class ForegroundTrackingPlugin : Plugin() {

    @PluginMethod
    fun startService(call: PluginCall) {
        try {
            val activityId = call.getString("activityId") ?: run {
                call.reject("activityId required")
                return
            }
            
            val authToken = call.getString("authToken") ?: run {
                call.reject("authToken required")
                return
            }
            
            val apiUrl = call.getString("apiUrl") ?: "http://10.0.2.2:5000"
            val liveSessionId = call.getString("liveSessionId")
            
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_START_TRACKING
                putExtra(TrackingService.EXTRA_ACTIVITY_ID, activityId)
                putExtra(TrackingService.EXTRA_AUTH_TOKEN, authToken)
                putExtra(TrackingService.EXTRA_API_URL, apiUrl)
                putExtra(TrackingService.EXTRA_UPDATE_INTERVAL, 5000L)
                putExtra(TrackingService.EXTRA_DISTANCE_FILTER, 5f)
                
                liveSessionId?.let {
                    putExtra(TrackingService.EXTRA_LIVE_SESSION_ID, it)
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }

            call.resolve()
            android.util.Log.i("ForegroundTracking", "✅ Service started successfully")
        } catch (e: Exception) {
            call.reject("Failed to start service: ${e.message}", e)
            android.util.Log.e("ForegroundTracking", "❌ Failed to start service", e)
        }
    }

    @PluginMethod
    fun stopService(call: PluginCall) {
        try {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_STOP_TRACKING
            }
            context.startService(intent)
            call.resolve()
            android.util.Log.i("ForegroundTracking", "🛑 Service stop requested")
        } catch (e: Exception) {
            call.reject("Failed to stop service: ${e.message}", e)
        }
    }

    @PluginMethod
    fun pauseService(call: PluginCall) {
        try {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_PAUSE_TRACKING
            }
            context.startService(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to pause service: ${e.message}", e)
        }
    }

    @PluginMethod
    fun resumeService(call: PluginCall) {
        try {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = TrackingService.ACTION_RESUME_TRACKING
            }
            context.startService(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to resume service: ${e.message}", e)
        }
    }

    @PluginMethod
    fun getServiceStatus(call: PluginCall) {
        try {
            val ret = com.getcapacitor.JSObject().apply {
                put("isRunning", TrackingService.isRunning)
                put("isPaused", TrackingService.isPaused)
                put("totalDistance", TrackingService.totalDistance)
                
                TrackingService.lastLocation?.let { location ->
                    val locationObj = com.getcapacitor.JSObject().apply {
                        put("latitude", location.latitude)
                        put("longitude", location.longitude)
                        put("accuracy", location.accuracy)
                        put("timestamp", location.time)
                    }
                    put("lastLocation", locationObj)
                }
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to get status: ${e.message}", e)
        }
    }
}
