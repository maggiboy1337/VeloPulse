import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useActivities } from '../hooks/useActivities';
import { useAuth } from '../contexts/AuthContext';
import { gpsQueueService, SyncStatus } from '../services/gpsQueueService';
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
  const { token } = useAuth();
  const { getActivityDetails, sendSnapshot, finishActivity, pauseActivity, resumeActivity } = useActivities();

  const [activity, setActivity] = useState<ActivityStatus | null>(null);
  const [gpsPoints, setGpsPoints] = useState<GPSPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string>('');
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [stats, setStats] = useState({
    distance: 0,
    duration: 0,
    currentSpeed: 0,
    averageSpeed: 0,
    maxSpeed: 0
  });

  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const maxSpeedRef = useRef<number>(0);
  const lastPointRef = useRef<GPSPoint | null>(null);
  const lastUploadTimeRef = useRef<number>(0); // Timestamp of last backend upload
  const sendSnapshotRef = useRef(sendSnapshot);

  // Keep sendSnapshotRef up to date
  useEffect(() => {
    sendSnapshotRef.current = sendSnapshot;
  }, [sendSnapshot]);

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

    const loadActivity = async () => {
      try {
        const details = await getActivityDetails(id);
        setActivity({
          id: details.id,
          name: details.name,
          status: details.status,
          startedAt: details.startedAt,
          totalDistanceMeters: details.totalDistanceMeters
        });

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

        // Start GPS Queue Service
        gpsQueueService.start(id, token);
      } catch (err) {
        setError('Fehler beim Laden der Aktivität');
        console.error(err);
      }
    };

    loadActivity();

    // Subscribe to sync status updates
    const unsubscribe = gpsQueueService.subscribe((status) => {
      setSyncStatus(status);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      gpsQueueService.stop();
    };
  }, [id, token, getActivityDetails]);

  // GPS tracking
  useEffect(() => {
    if (!isTracking || !id) {
      console.log('GPS tracking skipped - isTracking:', isTracking, 'id:', id);
      return;
    }

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

    const handlePosition = async (position: GeolocationPosition) => {
      const { latitude, longitude, altitude, speed, accuracy } = position.coords;
      const timestamp = new Date(position.timestamp);
      
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

      setStats(prev => {
        const newDistance = prev.distance + addedDistance;
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
      // Only upload every 10 seconds to reduce database load
      const now = Date.now();
      const timeSinceLastUpload = now - lastUploadTimeRef.current;
      const shouldUpload = timeSinceLastUpload >= 10000; // 10 seconds

      if (shouldUpload) {
        lastUploadTimeRef.current = now;

        try {
          // Try direct upload first using ref to avoid re-renders
          await sendSnapshotRef.current(id, {
            timestamp: timestamp.toISOString(),
            latitude,
            longitude,
            elevationMeters: newPoint.elevation,
            speedKmh: newPoint.speed,
            accuracyMeters: newPoint.accuracy
          });
          console.log('GPS point uploaded to backend');
        } catch (err) {
          console.warn('Direct upload failed, queueing for offline sync:', err);
          // Queue for offline sync
          try {
            await gpsQueueService.enqueue(id, {
              timestamp: timestamp.toISOString(),
              latitude,
              longitude,
              elevationMeters: newPoint.elevation,
              speedKmh: newPoint.speed,
              accuracyMeters: newPoint.accuracy
            });
          } catch (queueErr) {
            console.error('Failed to queue GPS point:', queueErr);
          }
        }
      } else {
        console.log(`Skipping upload - ${(10 - timeSinceLastUpload / 1000).toFixed(1)}s until next upload`);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('GPS error:', error);
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

    console.log('Calling navigator.geolocation.watchPosition...');

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    console.log('GPS watchPosition started with id:', watchIdRef.current);

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        console.log('Stopping GPS tracking, watch id:', watchIdRef.current);
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking, id]); // Removed sendSnapshot from dependencies to prevent re-renders

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
