import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useActivities } from '../hooks/useActivities';
import { useAuth } from '../contexts/AuthContext';
import { gpsQueueService, SyncStatus } from '../services/gpsQueueService';
import { serviceWorkerService } from '../services/serviceWorkerService';
import { capacitorGpsService } from '../services/capacitorGpsService';
import { backgroundHttpService } from '../services/backgroundHttpService';
import './LiveTracking.css';

// Custom icons
const currentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to center map on current position
function MapCenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  
  return null;
}

interface GPSPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  elevation?: number;
  speed?: number;
  accuracy?: number;
}

interface ActivityStatus {
  id: string;
  name: string | undefined;
  status: string;
  startedAt: string;
  totalDistanceMeters: number;
}

const LiveTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { getActivityDetails, sendSnapshot, sendLiveSnapshot, finishActivity, pauseActivity, resumeActivity, getMyActiveSessions } = useActivities();

  const [activity, setActivity] = useState<ActivityStatus | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [gpsPoints, setGpsPoints] = useState<GPSPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string>('');
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [useNativeGps, setUseNativeGps] = useState(false); // Track if using Capacitor GPS
  const [stats, setStats] = useState({
    distance: 0,
    duration: 0,
    currentSpeed: 0,
    averageSpeed: 0,
    maxSpeed: 0
  });

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const maxSpeedRef = useRef<number>(0);
  const lastPointRef = useRef<GPSPoint | null>(null);
  const lastUploadTimeRef = useRef<number>(0); // Timestamp of last backend upload
  const sendSnapshotRef = useRef(sendSnapshot);
  const sendLiveSnapshotRef = useRef(sendLiveSnapshot);
  const liveSessionIdRef = useRef<string | null>(null); // Ref for GPS handler closure

  // Keep refs up to date
  useEffect(() => {
    sendSnapshotRef.current = sendSnapshot;
    sendLiveSnapshotRef.current = sendLiveSnapshot;
  }, [sendSnapshot, sendLiveSnapshot]);

  // ========================================
  // PHASE 1: WAKE LOCK API
  // Keep display awake during tracking
  // ========================================
  useEffect(() => {
    if (!isTracking || isPaused) {
      releaseWakeLock();
      return;
    }

    requestWakeLock();

    // Re-acquire wake lock when visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTracking && !isPaused) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isTracking, isPaused]);

  // Request Wake Lock
  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('⚠️ Wake Lock API not supported');
      return;
    }

    try {
      // Release existing lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }

      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockActive(true);
      console.log('🔒 Wake Lock activated - display will stay awake');

      wakeLockRef.current.addEventListener('release', () => {
        console.log('🔓 Wake Lock released');
        setWakeLockActive(false);
      });
    } catch (err) {
      console.error('❌ Failed to acquire Wake Lock:', err);
      setWakeLockActive(false);
    }
  };

  // Release Wake Lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        console.log('🔓 Wake Lock manually released');
      } catch (err) {
        console.error('❌ Error releasing Wake Lock:', err);
      }
    }
  };

  // ========================================
  // PHASE 2: VISIBILITY API
  // Track page visibility for background operation
  // ========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);

      if (visible) {
        console.log('👁️ Page visible - normal tracking mode');
      } else {
        console.log('🌑 Page hidden - background tracking mode active');
        console.log('   GPS will continue tracking in background');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Sync liveSessionId state with ref for GPS handler
  useEffect(() => {
    liveSessionIdRef.current = liveSessionId;
    if (liveSessionId) {
      console.log('🔗 LiveSessionId ref updated:', liveSessionId);
    }
  }, [liveSessionId]);

  // Format time as HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  // Calculate distance between two GPS points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Load activity details
  useEffect(() => {
    if (!id || !token) return;

    let isMounted = true; // Prevent state updates after unmount

    const loadActivity = async () => {
      try {
        const details = await getActivityDetails(id);

        if (!isMounted) return; // Component unmounted, abort

        setActivity({
          id: details.id,
          name: details.name,
          status: details.status,
          startedAt: details.startedAt,
          totalDistanceMeters: details.totalDistanceMeters
        });

        // Load LiveSession ID - first check navigation state, then API
        const navigationState = location.state as { liveSessionId?: string } | null;
        if (navigationState?.liveSessionId) {
          setLiveSessionId(navigationState.liveSessionId);
          console.log('✅ LiveSession ID from navigation:', navigationState.liveSessionId);
        } else {
          try {
            const sessions = await getMyActiveSessions();
            if (!isMounted) return;

            const currentSession = sessions.find(s => s.activityId === id);
            if (currentSession) {
              setLiveSessionId(currentSession.id);
              console.log('✅ Found LiveSession ID from API:', currentSession.id);
            } else {
              console.warn('⚠️ No active LiveSession found for this activity');
            }
          } catch (err) {
            console.warn('Could not load LiveSession:', err);
          }
        }

        // Load existing GPS points
        if (details.points && details.points.length > 0) {
          const points = details.points.map(p => ({
            timestamp: new Date(p.timestamp),
            latitude: p.latitude,
            longitude: p.longitude,
            elevation: p.elevationMeters,
            speed: p.speedKmh,
            accuracy: p.accuracyMeters
          }));
          setGpsPoints(points);

          // Set last point as reference
          const lastPoint = points[points.length - 1];
          lastPointRef.current = lastPoint;
          setCurrentPosition([lastPoint.latitude, lastPoint.longitude]);

          // Update stats with existing data
          setStats(prev => ({
            ...prev,
            distance: details.totalDistanceMeters,
            maxSpeed: details.maxSpeedKmh || 0
          }));
          maxSpeedRef.current = details.maxSpeedKmh || 0;
        }

        // Check if activity is paused
        if (details.status === 'Paused') {
          setIsPaused(true);
          setIsTracking(false);
        }

        // Start GPS Queue Service ONCE
        console.log('🚀 Starting GPS Queue Service...');
        gpsQueueService.start(id, token);
      } catch (err) {
        if (!isMounted) return;
        setError('Fehler beim Laden der Aktivität');
        console.error('❌ Error loading activity:', err);
      }
    };

    loadActivity();

    // Subscribe to sync status updates
    const unsubscribe = gpsQueueService.subscribe((status) => {
      if (isMounted) {
        setSyncStatus(status);
      }
    });

    // Cleanup on unmount
    return () => {
      isMounted = false;
      unsubscribe();
      gpsQueueService.stop();
      console.log('🛑 LiveTracking unmounted, GPS Queue Service stopped');
    };
  }, [id, token]); // REMOVED problematic dependencies!

  // GPS tracking - Hybrid: Native (Capacitor) or Browser fallback
  useEffect(() => {
    if (!isTracking || !id) {
      console.log('GPS tracking skipped - isTracking:', isTracking, 'id:', id);
      return;
    }

    // Check if native GPS is available
    const isNative = capacitorGpsService.isNativePlatform();
    setUseNativeGps(isNative);

    if (isNative) {
      console.log('🚀 Starting NATIVE GPS tracking (Capacitor)');
      startNativeGpsTracking();
    } else {
      console.log('🌐 Starting BROWSER GPS tracking (fallback)');
      startBrowserGpsTracking();
    }

    return () => {
      if (isNative) {
        capacitorGpsService.stopTracking();
        console.log('🛑 Native GPS tracking stopped');
      } else if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('🛑 Browser GPS tracking stopped');
      }
    };
  }, [isTracking, isPaused, id]);

  // Start Native GPS tracking (Capacitor)
  const startNativeGpsTracking = async () => {
    const success = await capacitorGpsService.startTracking(
      (position) => {
        // Convert native GPS position to standard format
        handleGpsUpdate({
          coords: {
            latitude: position.latitude,
            longitude: position.longitude,
            altitude: position.altitude,
            speed: position.speed,
            accuracy: position.accuracy,
            heading: position.heading,
            altitudeAccuracy: null
          },
          timestamp: position.timestamp
        } as GeolocationPosition);
      },
      (error) => {
        console.error('❌ Native GPS Error:', error);
        if (error.code === 2) {
          setGpsPermissionDenied(true);
          setError('GPS-Berechtigung verweigert');
        } else {
          setError(`GPS-Fehler: ${error.message}`);
        }
      },
      {
        distanceFilter: 5, // Update every 5 meters
        backgroundTitle: 'VeloPulse Live Tracking',
        backgroundMessage: `${stats.distance > 0 ? (stats.distance / 1000).toFixed(2) + ' km' : 'Tracking...'}`
      }
    );

    if (!success) {
      console.error('❌ Failed to start native GPS');
      setError('Native GPS konnte nicht gestartet werden');
    }
  };

  // Start Browser GPS tracking (fallback)
  const startBrowserGpsTracking = () => {
    if (!navigator.geolocation) {
      setError('GPS wird von diesem Gerät nicht unterstützt');
      return;
    }

    // Check if running on HTTPS (required by most modern browsers for geolocation)
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      console.warn('Geolocation may not work on non-HTTPS sites');
      setError('GPS funktioniert möglicherweise nur über HTTPS. Bitte verwenden Sie eine sichere Verbindung.');
      return;
    }

    console.log('Starting GPS tracking for activity:', id);

    // Shared GPS update handler for both native and browser GPS
    const handleGpsUpdate = async (position: GeolocationPosition) => {
      const { latitude, longitude, altitude, speed, accuracy } = position.coords;
      const timestamp = new Date(position.timestamp);

      // Log background status
      const bgStatus = document.visibilityState === 'hidden' ? '🌑 BACKGROUND' : '👁️ FOREGROUND';
      console.log(`📍 GPS Update [${bgStatus}]: lat=${latitude.toFixed(6)}, lon=${longitude.toFixed(6)}, acc=${accuracy?.toFixed(1)}m`);

      const newPoint: GPSPoint = {
        timestamp,
        latitude,
        longitude,
        elevation: altitude || undefined,
        speed: speed ? speed * 3.6 : undefined, // Convert m/s to km/h
        accuracy: accuracy || undefined
      };

      // Calculate distance from last point
      let addedDistance = 0;
      if (lastPointRef.current) {
        addedDistance = calculateDistance(
          lastPointRef.current.latitude,
          lastPointRef.current.longitude,
          latitude,
          longitude
        );

        // Only add point if moved at least 5 meters (to avoid GPS drift)
        if (addedDistance < 5) {
          return;
        }
      }

      // Update state
      setGpsPoints(prev => [...prev, newPoint]);
      setCurrentPosition([latitude, longitude]);
      lastPointRef.current = newPoint;

      // Update statistics
      const currentSpeed = newPoint.speed || 0;
      if (currentSpeed > maxSpeedRef.current) {
        maxSpeedRef.current = currentSpeed;
      }

      let newDistance = 0;
      setStats(prev => {
        newDistance = prev.distance + addedDistance;
        const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
        const averageSpeed = duration > 0 ? (newDistance / duration) * 3.6 : 0; // Convert m/s to km/h

        return {
          distance: newDistance,
          duration,
          currentSpeed,
          averageSpeed,
          maxSpeed: maxSpeedRef.current
        };
      });

      // Send to backend - EVENT-BASED UPLOAD
      // ⭐ WICHTIG: Upload bei JEDEM GPS-Update (nicht timer-basiert)
      // Timer funktionieren nicht zuverlässig im Android Background
      const now = Date.now();
      const timeSinceLastUpload = now - lastUploadTimeRef.current;
      const isFirstUpload = lastUploadTimeRef.current === 0;
      // Spam-Schutz: Minimum 5 Sekunden zwischen Uploads
      const shouldUpload = isFirstUpload || timeSinceLastUpload >= 5000;

      if (shouldUpload) {
        lastUploadTimeRef.current = now;
        const uploadMode = document.visibilityState === 'hidden' ? 'BACKGROUND' : 'FOREGROUND';

        // Type guard: ensure id is defined
        const activityId = id;
        if (!activityId) return;

        try {
          // ⭐ NEU: Nutze Background HTTP Service für Capacitor
          await backgroundHttpService.sendActivityPoint(
            activityId,
            token!, // Token aus AuthContext
            {
              timestamp: timestamp.toISOString(),
              latitude,
              longitude,
              elevationMeters: newPoint.elevation,
              speedKmh: newPoint.speed,
              accuracyMeters: newPoint.accuracy
            }
          );
          console.log(`✅ GPS point uploaded [${uploadMode}] via Background HTTP (event-based)`);

          // Also send to LiveSession if available
          const currentLiveSessionId = liveSessionIdRef.current;
          if (currentLiveSessionId) {
            try {
              await backgroundHttpService.sendLiveSnapshot(
                currentLiveSessionId,
                token!,
                {
                  latitude,
                  longitude,
                  gpsAccuracyMeters: newPoint.accuracy,
                  speedKmh: newPoint.speed,
                  distanceCompletedMeters: newDistance,
                  distanceRemainingMeters: undefined,
                  routeProgressPercent: undefined,
                  heartRateBpm: undefined,
                  cadenceRpm: undefined,
                  powerWatts: undefined
                }
              );
              console.log(`✅ Live snapshot uploaded [${uploadMode}] via Background HTTP (event-based)`);
            } catch (liveErr) {
              console.error('⚠️ Failed to send live snapshot:', liveErr);
            }
          } else {
            console.warn('⚠️ No LiveSession ID available yet - snapshot not sent to live map');
          }
        } catch (err) {
          console.error('❌ Background HTTP upload failed:', err);
          // Keine Offline-Queue mehr (wie gewünscht)
        }
      } else {
        const remainingSeconds = (5 - timeSinceLastUpload / 1000).toFixed(0);
        console.log(`⏱️ Next upload possible in ${remainingSeconds}s (throttling)`);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Browser GPS error:', error);
      let errorMessage = '';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'GPS-Berechtigung verweigert. Bitte erlauben Sie den Standortzugriff in Ihren Browser-Einstellungen.';
          console.error('PERMISSION_DENIED: User denied geolocation permission');
          setGpsPermissionDenied(true);
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'GPS-Position nicht verfügbar. Bitte aktivieren Sie GPS.';
          console.error('POSITION_UNAVAILABLE: GPS position unavailable');
          break;
        case error.TIMEOUT:
          errorMessage = 'GPS-Timeout. Versuche erneut...';
          console.error('TIMEOUT: GPS request timed out');
          // Don't set error for timeout, it will retry
          return;
      }
      setError(errorMessage);
    };

    console.log('🛰️ Starting Browser GPS tracking (Background-limited)...');

    // Start watching position with optimized settings for background operation
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleGpsUpdate,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased from 10s to 30s for better background reliability
        maximumAge: 5000 // Allow cached position up to 5s old
      }
    );

    console.log('Browser GPS watchPosition started with id:', watchIdRef.current);
  };

  // Shared GPS update handler - used by both native and browser GPS
  const handleGpsUpdate = async (position: GeolocationPosition) => {
    if (!id) return; // Safety check

    const { latitude, longitude, altitude, speed, accuracy } = position.coords;
    const timestamp = new Date(position.timestamp);

    // Log background status
    const bgStatus = document.visibilityState === 'hidden' ? '🌑 BACKGROUND' : '👁️ FOREGROUND';
    console.log(`📍 GPS Update [${bgStatus}]: lat=${latitude.toFixed(6)}, lon=${longitude.toFixed(6)}, acc=${accuracy?.toFixed(1)}m`);

    const newPoint: GPSPoint = {
      timestamp,
      latitude,
      longitude,
      elevation: altitude || undefined,
      speed: speed ? speed * 3.6 : undefined, // Convert m/s to km/h
      accuracy: accuracy || undefined
    };

    // Calculate distance from last point
    let addedDistance = 0;
    if (lastPointRef.current) {
      addedDistance = calculateDistance(
        lastPointRef.current.latitude,
        lastPointRef.current.longitude,
        latitude,
        longitude
      );

      // Only add point if moved at least 5 meters (to avoid GPS drift)
      if (addedDistance < 5) {
        return;
      }
    }

    // Update state
    setGpsPoints(prev => [...prev, newPoint]);
    setCurrentPosition([latitude, longitude]);
    lastPointRef.current = newPoint;

    // Update statistics
    const currentSpeed = newPoint.speed || 0;
    if (currentSpeed > maxSpeedRef.current) {
      maxSpeedRef.current = currentSpeed;
    }

    let newDistance = 0;
    setStats(prev => {
      newDistance = prev.distance + addedDistance;
      const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
      const averageSpeed = duration > 0 ? (newDistance / duration) * 3.6 : 0; // Convert m/s to km/h

      return {
        distance: newDistance,
        duration,
        currentSpeed,
        averageSpeed,
        maxSpeed: maxSpeedRef.current
      };
    });

    // Send to backend (with offline queue fallback)
    // Upload every 30 seconds, or immediately for first GPS point
    const now = Date.now();
    const timeSinceLastUpload = now - lastUploadTimeRef.current;
    const isFirstUpload = lastUploadTimeRef.current === 0;
    const shouldUpload = isFirstUpload || timeSinceLastUpload >= 30000; // 30 seconds

    if (shouldUpload) {
      lastUploadTimeRef.current = now;
      const uploadMode = document.visibilityState === 'hidden' ? 'BACKGROUND' : 'FOREGROUND';

      // Type guard: ensure id is defined
      const activityId = id;
      if (!activityId) return;

      try {
        // ⭐ NEU: Nutze Background HTTP Service für Capacitor
        await backgroundHttpService.sendActivityPoint(
          activityId,
          token!, // Token aus AuthContext
          {
            timestamp: timestamp.toISOString(),
            latitude,
            longitude,
            elevationMeters: newPoint.elevation,
            speedKmh: newPoint.speed,
            accuracyMeters: newPoint.accuracy
          }
        );
        console.log(`✅ GPS point uploaded [${uploadMode}] via Background HTTP`);

        // Also send to LiveSession if available
        const currentLiveSessionId = liveSessionIdRef.current;
        if (currentLiveSessionId) {
          try {
            await backgroundHttpService.sendLiveSnapshot(
              currentLiveSessionId,
              token!,
              {
                latitude,
                longitude,
                gpsAccuracyMeters: newPoint.accuracy,
                speedKmh: newPoint.speed,
                distanceCompletedMeters: newDistance,
                distanceRemainingMeters: undefined,
                routeProgressPercent: undefined,
                heartRateBpm: undefined,
                cadenceRpm: undefined,
                powerWatts: undefined
              }
            );
            console.log(`✅ Live snapshot uploaded [${uploadMode}] via Background HTTP`);
          } catch (liveErr) {
            console.error('⚠️ Failed to send live snapshot:', liveErr);
          }
        } else {
          console.warn('⚠️ No LiveSession ID available yet - snapshot not sent to live map');
        }
      } catch (err) {
        console.error('❌ Background HTTP upload failed:', err);
        // Keine Offline-Queue mehr (wie gewünscht)
      }
    } else {
      const remainingSeconds = (30 - timeSinceLastUpload / 1000).toFixed(0);
      console.log(`⏱️ Next upload in ${remainingSeconds}s`);
    }
  };

  // Update duration every second
  useEffect(() => {
    if (!isTracking || isPaused) return;

    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        duration: prev.duration + 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  // ========================================
  // HEARTBEAT FOR BACKGROUND TRACKING
  // Logs status every 15 seconds to verify tracking is active
  // ========================================
  useEffect(() => {
    if (!isTracking || isPaused) return;

    const heartbeat = setInterval(() => {
      const bgStatus = document.visibilityState === 'hidden' ? '🌑 BACKGROUND' : '👁️ FOREGROUND';
      const wakeLockStatus = wakeLockActive ? '🔒 LOCKED' : '🔓 UNLOCKED';
      console.log(`💓 Tracking Heartbeat [${bgStatus}] [${wakeLockStatus}]: Points=${gpsPoints.length}, Distance=${(stats.distance / 1000).toFixed(2)}km`);
    }, 15000); // Every 15 seconds

    return () => clearInterval(heartbeat);
  }, [isTracking, isPaused, gpsPoints.length, stats.distance, wakeLockActive]);

  // Handle pause
  const handlePause = async () => {
    if (!id) return;

    try {
      await pauseActivity(id);
      setIsTracking(false);
      setIsPaused(true);
    } catch (err) {
      setError('Fehler beim Pausieren der Aktivität');
      console.error(err);
    }
  };

  // ========================================
  // PHASE 4: NOTIFICATION UPDATES
  // Update tracking notification every minute
  // ========================================
  useEffect(() => {
    if (!isTracking || isPaused) return;

    const notificationUpdate = setInterval(() => {
      serviceWorkerService.showTrackingNotification({
        points: gpsPoints.length,
        distance: stats.distance,
        duration: stats.duration
      });
    }, 60000); // Every 60 seconds

    return () => clearInterval(notificationUpdate);
  }, [isTracking, isPaused, gpsPoints.length, stats.distance, stats.duration]);

  // Handle resume
  const handleResume = async () => {
    if (!id) return;
    
    try {
      await resumeActivity(id);
      setIsTracking(true);
      setIsPaused(false);
      setError('');
    } catch (err) {
      setError('Fehler beim Fortsetzen der Aktivität');
      console.error(err);
    }
  };

  // Handle stop
  const handleStop = async () => {
    if (!id) return;

    if (!window.confirm('Möchten Sie die Aktivität wirklich beenden?')) {
      return;
    }

    try {
      setIsTracking(false);
      await finishActivity(id);
      navigate(`/activities/${id}`);
    } catch (err) {
      setError('Fehler beim Beenden der Aktivität');
      console.error(err);
    }
  };

  // Request GPS permission
  const handleRequestGpsPermission = () => {
    console.log('Manually requesting GPS permission...');
    setError('');
    setGpsPermissionDenied(false);

    // Try to get position once to trigger permission prompt
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('GPS permission granted!', position);
        setCurrentPosition([position.coords.latitude, position.coords.longitude]);
        // Restart tracking
        setIsTracking(false);
        setTimeout(() => setIsTracking(true), 100);
      },
      (error) => {
        console.error('GPS permission denied again:', error);
        setGpsPermissionDenied(true);
        setError('GPS-Berechtigung verweigert. Bitte erlauben Sie den Standortzugriff.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Prepare polyline points for map
  const polylinePoints: [number, number][] = gpsPoints.map(p => [p.latitude, p.longitude]);
  const startPoint = gpsPoints.length > 0 ? gpsPoints[0] : null;

  if (!activity) {
    return (
      <div className="live-tracking">
        <div className="loading">
          <div className="spinner"></div>
          <p>Lade Aktivität...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="live-tracking">
      <div className="live-header">
        <h1>{activity.name || 'Live-Tracking'}</h1>
        <div className="live-badge">
          <span className="pulse-dot"></span>
          LIVE
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          {gpsPermissionDenied && (
            <button 
              className="btn-retry-gps" 
              onClick={handleRequestGpsPermission}
              style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '0.9em' }}
            >
              🔄 Nochmal versuchen
            </button>
          )}
        </div>
      )}

      {/* Map */}
      <div className="map-container">
        {currentPosition ? (
          <MapContainer
            center={currentPosition}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {/* GPS Track */}
            {polylinePoints.length > 0 && (
              <Polyline 
                positions={polylinePoints} 
                color="#667eea" 
                weight={4} 
                opacity={0.8} 
              />
            )}
            
            {/* Start marker */}
            {startPoint && (
              <Marker 
                position={[startPoint.latitude, startPoint.longitude]} 
                icon={startIcon}
              />
            )}
            
            {/* Current position marker */}
            {currentPosition && (
              <Marker position={currentPosition} icon={currentIcon} />
            )}
            
            {/* Center map on current position */}
            <MapCenter position={currentPosition} />
          </MapContainer>
        ) : (
          <div className="map-placeholder">
            <div className="spinner"></div>
            <p>Warte auf GPS-Signal...</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="live-stats">
        <div className="stat-card">
          <div className="stat-label">Distanz</div>
          <div className="stat-value">{formatDistance(stats.distance)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Zeit</div>
          <div className="stat-value">{formatDuration(stats.duration)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Aktuell</div>
          <div className="stat-value">{stats.currentSpeed.toFixed(1)} km/h</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Ø Tempo</div>
          <div className="stat-value">{stats.averageSpeed.toFixed(1)} km/h</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Max</div>
          <div className="stat-value">{stats.maxSpeed.toFixed(1)} km/h</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Punkte</div>
          <div className="stat-value">{gpsPoints.length}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="live-controls">
        {!isPaused ? (
          <button className="btn-pause" onClick={handlePause}>
            <span>⏸</span> Pausieren
          </button>
        ) : (
          <button className="btn-resume" onClick={handleResume}>
            <span>▶</span> Fortsetzen
          </button>
        )}
        
        <button className="btn-stop" onClick={handleStop}>
          <span>⏹</span> Beenden
        </button>
      </div>

      {/* GPS Info */}
      <div className="gps-info">
        <div className="gps-status">
          <span className={`status-dot ${currentPosition ? 'connected' : 'searching'}`}></span>
          {currentPosition ? 'GPS verbunden' : 'Suche GPS-Signal...'}
        </div>
        {gpsPoints.length > 0 && gpsPoints[gpsPoints.length - 1].accuracy && (
          <div className="gps-accuracy">
            Genauigkeit: ±{gpsPoints[gpsPoints.length - 1].accuracy!.toFixed(0)}m
          </div>
        )}

        {/* Background Tracking Indicators */}
        <div className="tracking-indicators">
          <div className={`indicator ${useNativeGps ? 'native' : 'browser'}`}>
            {useNativeGps ? '📱 Native GPS (Hintergrund-fähig)' : '🌐 Browser GPS (eingeschränkt)'}
          </div>
          <div className={`indicator ${wakeLockActive ? 'active' : 'inactive'}`}>
            {wakeLockActive ? '🔒 Display aktiv' : '🔓 Display-Sperre aus'}
          </div>
          {!isPageVisible && (
            <div className="indicator background-mode">
              🌙 Hintergrund-Modus aktiv
            </div>
          )}
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && syncStatus.unsyncedCount > 0 && (
        <div className="sync-status-bar">
          <div className="sync-status-content">
            {syncStatus.isSyncing ? (
              <>
                <div className="sync-spinner"></div>
                <span>Synchronisiere {syncStatus.unsyncedCount} GPS-Punkte...</span>
              </>
            ) : (
              <>
                <span className="sync-icon">📦</span>
                <span>{syncStatus.unsyncedCount} GPS-Punkte offline gespeichert</span>
                {syncStatus.lastSyncAttempt && (
                  <span className="sync-time">
                    Letzte Sync: {new Date(syncStatus.lastSyncAttempt).toLocaleTimeString('de-DE')}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
