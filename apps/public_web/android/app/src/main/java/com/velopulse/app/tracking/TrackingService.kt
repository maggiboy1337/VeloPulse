package com.velopulse.app.tracking

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.velopulse.app.MainActivity
import com.velopulse.app.R
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.roundToInt

/**
 * Android Foreground Service für zuverlässiges GPS-Tracking
 * 
 * Features:
 * - Läuft dauerhaft im Hintergrund mit permanenter Notification
 * - GPS-Erfassung mit Fused Location Provider (auch bei gesperrtem Display)
 * - Automatische Datenübertragung mit Retry-Mechanismus
 * - Offline-Queue für Netzwerkausfälle
 * - WakeLock für CPU-aktiv bei gesperrtem Display
 * - Android 12+ kompatibel (FOREGROUND_SERVICE_LOCATION)
 */
class TrackingService : Service() {

    companion object {
        private const val NOTIFICATION_ID = 12345
        private const val CHANNEL_ID = "velopulse_tracking_channel"
        private const val CHANNEL_NAME = "VeloPulse Live Tracking"
        
        // Actions
        const val ACTION_START_TRACKING = "com.velopulse.app.START_TRACKING"
        const val ACTION_STOP_TRACKING = "com.velopulse.app.STOP_TRACKING"
        const val ACTION_PAUSE_TRACKING = "com.velopulse.app.PAUSE_TRACKING"
        const val ACTION_RESUME_TRACKING = "com.velopulse.app.RESUME_TRACKING"
        
        // Extras
        const val EXTRA_ACTIVITY_ID = "activity_id"
        const val EXTRA_LIVE_SESSION_ID = "live_session_id"
        const val EXTRA_AUTH_TOKEN = "auth_token"
        const val EXTRA_API_URL = "api_url"
        const val EXTRA_UPDATE_INTERVAL = "update_interval"
        const val EXTRA_DISTANCE_FILTER = "distance_filter"
        
        // Status
        var isRunning = false
            private set
        var isPaused = false
            private set
        var lastLocation: Location? = null
            private set
        var totalDistance = 0.0
            private set
    }

    // GPS
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var lastKnownLocation: Location? = null
    
    // Configuration
    private var activityId: String? = null
    private var liveSessionId: String? = null
    private var authToken: String? = null
    private var apiUrl: String = "http://10.0.2.2:5000" // Default for Android emulator
    private var updateIntervalMs: Long = 5000L // 5 seconds default
    private var distanceFilterMeters: Float = 5f // 5 meters default
    
    // Wake Lock
    private var wakeLock: PowerManager.WakeLock? = null
    
    // Background HTTP Upload
    private val uploadQueue = ConcurrentLinkedQueue<LocationData>()
    private var uploadJob: Job? = null
    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Statistics
    private var startTime: Long = 0
    private var pointCount = 0
    private var uploadSuccessCount = 0
    private var uploadFailureCount = 0
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Fused Location Provider
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        // Acquire Wake Lock for keeping CPU active
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "VeloPulse::TrackingWakeLock"
        )
        
        // Create Notification Channel (required for Android 8.0+)
        createNotificationChannel()
        
        android.util.Log.d("TrackingService", "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_TRACKING -> {
                startTracking(intent)
            }
            ACTION_STOP_TRACKING -> {
                stopTracking()
            }
            ACTION_PAUSE_TRACKING -> {
                pauseTracking()
            }
            ACTION_RESUME_TRACKING -> {
                resumeTracking()
            }
        }
        
        // START_STICKY: Service wird automatisch neu gestartet falls beendet
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        // Unbound Service - keine Bindung erforderlich
        return null
    }

    /**
     * Startet GPS-Tracking und Foreground Service
     */
    private fun startTracking(intent: Intent) {
        // Bereits gestartet?
        if (isRunning) {
            android.util.Log.w("TrackingService", "Tracking already running")
            return
        }
        
        // Konfiguration aus Intent lesen
        activityId = intent.getStringExtra(EXTRA_ACTIVITY_ID)
        liveSessionId = intent.getStringExtra(EXTRA_LIVE_SESSION_ID)
        authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN)
        apiUrl = intent.getStringExtra(EXTRA_API_URL) ?: apiUrl
        updateIntervalMs = intent.getLongExtra(EXTRA_UPDATE_INTERVAL, 5000L)
        distanceFilterMeters = intent.getFloatExtra(EXTRA_DISTANCE_FILTER, 5f)
        
        // Validierung
        if (activityId == null || authToken == null) {
            android.util.Log.e("TrackingService", "Missing required parameters: activityId or authToken")
            stopSelf()
            return
        }
        
        // Check Location Permissions
        if (!hasLocationPermissions()) {
            android.util.Log.e("TrackingService", "Location permissions not granted")
            stopSelf()
            return
        }
        
        // Start Foreground Service mit permanenter Notification
        startForeground(NOTIFICATION_ID, createNotification())
        
        // Acquire Wake Lock
        wakeLock?.acquire()
        
        // Initialize
        startTime = System.currentTimeMillis()
        totalDistance = 0.0
        pointCount = 0
        uploadSuccessCount = 0
        uploadFailureCount = 0
        lastKnownLocation = null
        
        // Start GPS tracking
        startLocationUpdates()
        
        // Start background upload worker
        startUploadWorker()
        
        isRunning = true
        isPaused = false
        
        android.util.Log.i("TrackingService", "✅ Tracking started for activity: $activityId")
        android.util.Log.i("TrackingService", "   API URL: $apiUrl")
        android.util.Log.i("TrackingService", "   Update interval: ${updateIntervalMs}ms")
        android.util.Log.i("TrackingService", "   Distance filter: ${distanceFilterMeters}m")
    }

    /**
     * Stoppt GPS-Tracking und beendet Service
     */
    private fun stopTracking() {
        if (!isRunning) {
            return
        }
        
        android.util.Log.i("TrackingService", "🛑 Stopping tracking...")
        
        // Stop GPS
        fusedLocationClient.removeLocationUpdates(locationCallback)
        
        // Stop upload worker
        uploadJob?.cancel()
        
        // Upload remaining queued points
        uploadRemainingPoints()
        
        // Release Wake Lock
        wakeLock?.release()
        
        // Stop foreground service
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        
        // Reset state
        isRunning = false
        isPaused = false
        lastLocation = null
        
        android.util.Log.i("TrackingService", "✅ Tracking stopped")
        android.util.Log.i("TrackingService", "   Total points: $pointCount")
        android.util.Log.i("TrackingService", "   Uploaded: $uploadSuccessCount")
        android.util.Log.i("TrackingService", "   Failed: $uploadFailureCount")
        android.util.Log.i("TrackingService", "   Distance: ${(totalDistance / 1000.0).roundToInt()} km")
    }

    /**
     * Pausiert GPS-Tracking (GPS weiter aktiv, aber keine Datenübertragung)
     */
    private fun pauseTracking() {
        if (!isRunning || isPaused) {
            return
        }
        
        isPaused = true
        updateNotification()
        
        android.util.Log.i("TrackingService", "⏸️ Tracking paused")
    }

    /**
     * Setzt GPS-Tracking fort
     */
    private fun resumeTracking() {
        if (!isRunning || !isPaused) {
            return
        }
        
        isPaused = false
        updateNotification()
        
        android.util.Log.i("TrackingService", "▶️ Tracking resumed")
    }

    /**
     * Startet GPS Location Updates
     */
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            updateIntervalMs
        ).apply {
            setMinUpdateDistanceMeters(distanceFilterMeters)
            setWaitForAccurateLocation(false)
            setMaxUpdateDelayMillis(updateIntervalMs * 2)
        }.build()
        
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    handleLocationUpdate(location)
                }
            }
        }
        
        // Check permissions
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            android.util.Log.e("TrackingService", "Location permission not granted")
            stopTracking()
            return
        }
        
        // Start location updates
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
        
        android.util.Log.i("TrackingService", "📍 GPS location updates started")
    }

    /**
     * Verarbeitet GPS Location Update
     */
    private fun handleLocationUpdate(location: Location) {
        val displayState = if (isPowerScreenOn()) "🔆 Display ON" else "🌑 Display OFF"
        android.util.Log.d("TrackingService", "📍 GPS Update [$displayState]: " +
                "lat=${location.latitude.format(6)}, " +
                "lon=${location.longitude.format(6)}, " +
                "acc=${location.accuracy.format(1)}m")
        
        // Skip if paused
        if (isPaused) {
            return
        }
        
        // Calculate distance from last point
        lastKnownLocation?.let { lastLoc ->
            val distance = lastLoc.distanceTo(location)
            
            // Ignore GPS drift (< 5 meters unless significant time passed)
            if (distance < distanceFilterMeters) {
                return
            }
            
            totalDistance += distance.toDouble()
        }
        
        // Update last known location
        lastKnownLocation = location
        lastLocation = location
        pointCount++
        
        // Create location data
        val locationData = LocationData(
            timestamp = location.time,
            latitude = location.latitude,
            longitude = location.longitude,
            altitude = if (location.hasAltitude()) location.altitude else null,
            accuracy = location.accuracy,
            speed = if (location.hasSpeed()) location.speed * 3.6 else null, // m/s -> km/h
            bearing = if (location.hasBearing()) location.bearing else null
        )
        
        // Add to upload queue
        uploadQueue.offer(locationData)
        
        // Update notification with current stats
        updateNotification()
    }

    /**
     * Background Worker für HTTP Upload
     */
    private fun startUploadWorker() {
        uploadJob = coroutineScope.launch {
            while (isActive) {
                try {
                    // Upload all queued points
                    while (uploadQueue.isNotEmpty()) {
                        val locationData = uploadQueue.poll() ?: break
                        
                        val success = uploadLocationData(locationData)
                        
                        if (success) {
                            uploadSuccessCount++
                        } else {
                            uploadFailureCount++
                            // Re-queue on failure (with limit)
                            if (uploadQueue.size < 100) {
                                uploadQueue.offer(locationData)
                            }
                        }
                        
                        // Small delay between uploads
                        delay(100)
                    }
                    
                    // Wait before next check
                    delay(2000)
                } catch (e: Exception) {
                    android.util.Log.e("TrackingService", "Upload worker error: ${e.message}")
                    delay(5000) // Wait longer on error
                }
            }
        }
        
        android.util.Log.i("TrackingService", "📤 Upload worker started")
    }

    /**
     * Lädt GPS-Punkt zum Backend hoch
     */
    private suspend fun uploadLocationData(data: LocationData): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // Upload to Activity Points endpoint
                val activitySuccess = uploadToActivity(data)
                
                // Upload to Live Session if available
                if (liveSessionId != null) {
                    uploadToLiveSession(data)
                }
                
                activitySuccess
            } catch (e: Exception) {
                android.util.Log.e("TrackingService", "Upload failed: ${e.message}")
                false
            }
        }
    }

    /**
     * Upload zu /api/activities/{id}/points
     */
    private fun uploadToActivity(data: LocationData): Boolean {
        val url = "$apiUrl/api/activities/$activityId/points"
        
        return try {
            val json = JSONObject().apply {
                put("timestamp", data.toIsoString())
                put("latitude", data.latitude)
                put("longitude", data.longitude)
                data.altitude?.let { put("elevationMeters", it) }
                data.speed?.let { put("speedKmh", it) }
                data.accuracy.let { put("accuracyMeters", it) }
            }
            
            val success = sendHttpPost(url, json)
            
            if (success) {
                android.util.Log.d("TrackingService", "✅ Activity point uploaded")
            }
            
            success
        } catch (e: Exception) {
            android.util.Log.e("TrackingService", "❌ Activity upload failed: ${e.message}")
            false
        }
    }

    /**
     * Upload zu /api/live-sessions/{id}/snapshots
     */
    private fun uploadToLiveSession(data: LocationData): Boolean {
        val url = "$apiUrl/api/live-sessions/$liveSessionId/snapshots"
        
        return try {
            val json = JSONObject().apply {
                put("latitude", data.latitude)
                put("longitude", data.longitude)
                data.accuracy.let { put("gpsAccuracyMeters", it) }
                data.speed?.let { put("speedKmh", it) }
                put("distanceCompletedMeters", totalDistance)
            }
            
            val success = sendHttpPost(url, json)
            
            if (success) {
                android.util.Log.d("TrackingService", "✅ Live snapshot uploaded")
            }
            
            success
        } catch (e: Exception) {
            android.util.Log.e("TrackingService", "❌ Live snapshot upload failed: ${e.message}")
            false
        }
    }

    /**
     * HTTP POST Request
     */
    private fun sendHttpPost(urlString: String, json: JSONObject): Boolean {
        var connection: HttpURLConnection? = null
        
        return try {
            val url = URL(urlString)
            connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $authToken")
                connectTimeout = 10000
                readTimeout = 10000
                doOutput = true
            }
            
            // Write JSON body
            connection.outputStream.use { os: OutputStream ->
                val input = json.toString().toByteArray(Charsets.UTF_8)
                os.write(input, 0, input.size)
            }
            
            // Check response
            val responseCode = connection.responseCode
            
            if (responseCode in 200..299) {
                true
            } else {
                android.util.Log.w("TrackingService", "HTTP $responseCode: ${connection.responseMessage}")
                false
            }
        } catch (e: Exception) {
            android.util.Log.e("TrackingService", "HTTP request failed: ${e.message}")
            false
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Upload verbleibender Punkte beim Stoppen
     */
    private fun uploadRemainingPoints() {
        if (uploadQueue.isEmpty()) {
            return
        }
        
        android.util.Log.i("TrackingService", "Uploading ${uploadQueue.size} remaining points...")
        
        // Synchronous upload of remaining points
        runBlocking {
            while (uploadQueue.isNotEmpty()) {
                val locationData = uploadQueue.poll() ?: break
                uploadLocationData(locationData)
            }
        }
    }

    /**
     * Erstellt Notification Channel (Android 8+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "GPS tracking notifications"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Erstellt Notification für Foreground Service
     */
    private fun createNotification(): Notification {
        // Intent für Tap auf Notification -> öffnet App
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        // Stop-Action
        val stopIntent = Intent(this, TrackingService::class.java).apply {
            action = ACTION_STOP_TRACKING
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        // Notification bauen
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("VeloPulse Live Tracking")
            .setContentText(getNotificationText())
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true) // Nicht wegwischbar
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop",
                stopPendingIntent
            )
            .build()
    }

    /**
     * Aktualisiert Notification mit aktuellen Stats
     */
    private fun updateNotification() {
        val notification = createNotification()
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    /**
     * Notification Text mit Stats
     */
    private fun getNotificationText(): String {
        if (isPaused) {
            return "Paused - ${(totalDistance / 1000.0).format(2)} km"
        }
        
        val distance = (totalDistance / 1000.0).format(2)
        val duration = (System.currentTimeMillis() - startTime) / 1000 / 60 // minutes
        val speed = lastLocation?.speed?.let { (it * 3.6).format(1) } ?: "0.0"
        
        return "$distance km • $duration min • $speed km/h"
    }

    /**
     * Prüft ob Location Permissions vorhanden sind
     */
    private fun hasLocationPermissions(): Boolean {
        return ActivityCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Prüft ob Display eingeschaltet ist
     */
    private fun isPowerScreenOn(): Boolean {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            powerManager.isInteractive
        } else {
            @Suppress("DEPRECATION")
            powerManager.isScreenOn
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        
        // Cleanup
        uploadJob?.cancel()
        coroutineScope.cancel()
        wakeLock?.release()
        
        android.util.Log.d("TrackingService", "Service destroyed")
    }

    // Helper Extensions
    private fun Double.format(decimals: Int): String = "%.${decimals}f".format(this)
    private fun Float.format(decimals: Int): String = "%.${decimals}f".format(this)
}

/**
 * GPS Location Data
 */
data class LocationData(
    val timestamp: Long,
    val latitude: Double,
    val longitude: Double,
    val altitude: Double?,
    val accuracy: Float,
    val speed: Double?, // km/h
    val bearing: Float?
) {
    fun toIsoString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date(timestamp))
    }
}
