import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PublicMap.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Custom marker icons
const activeUserIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedUserIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49]
});

// Component to handle map bounds and focus
function MapController({ 
  sessions, 
  selectedSession,
  traveledPaths,
  initialLoad
}: { 
  sessions: PublicSession[];
  selectedSession: string | null;
  traveledPaths: Map<string, RoutePoint[]>;
  initialLoad: boolean;
}) {
  const map = useMap();
  const previousSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedSession && selectedSession !== previousSelectedRef.current) {
      // Focus on selected session
      const session = sessions.find(s => s.publicSessionId === selectedSession);
      if (session?.currentSnapshot) {
        const { latitude, longitude } = session.currentSnapshot;
        const traveledPath = traveledPaths.get(selectedSession) || [];

        if (traveledPath.length > 1) {
          // Fit bounds to show entire traveled path + current position
          const allPoints = [
            ...traveledPath.map(p => [p.latitude, p.longitude] as [number, number]),
            [latitude, longitude] as [number, number]
          ];

          if (session.routePoints && session.routePoints.length > 0) {
            // Add remaining route points if available
            allPoints.push(...session.routePoints.map(p => [p.latitude, p.longitude] as [number, number]));
          }

          const bounds = L.latLngBounds(allPoints);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
          // Just center on current position with appropriate zoom
          map.setView([latitude, longitude], 14, { animate: true });
        }
      }
      previousSelectedRef.current = selectedSession;
    } else if (!selectedSession && initialLoad && sessions.length > 0) {
      // Initial load - show all markers
      const validSessions = sessions.filter(s => s.currentSnapshot);
      if (validSessions.length > 0) {
        const bounds = L.latLngBounds(
          validSessions.map(s => [
            s.currentSnapshot!.latitude,
            s.currentSnapshot!.longitude
          ])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [selectedSession, sessions, map, traveledPaths, initialLoad]);

  return null;
}

interface RoutePoint {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
}

interface PublicSnapshot {
  timestampUtc: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  speedKmh?: number;
  distanceCompletedMeters: number;
  distanceRemainingMeters?: number;
  routeProgressPercent?: number;
  heartRateBpm?: number;
}

interface PublicSession {
  publicSessionId: string;
  displayName: string;
  profileImageUrl?: string;
  startedAt: string;
  currentSnapshot?: PublicSnapshot;
  routePoints?: RoutePoint[];
}

const PublicMap: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [traveledPaths, setTraveledPaths] = useState<Map<string, RoutePoint[]>>(new Map());
  const [pathLoading, setPathLoading] = useState<Set<string>>(new Set());
  const [initialLoad, setInitialLoad] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const retryTimeoutRef = useRef<number>();

  // Fetch traveled path for a specific session
  const fetchTraveledPath = async (publicSessionId: string) => {
    if (pathLoading.has(publicSessionId)) return;

    setPathLoading(prev => new Set(prev).add(publicSessionId));

    try {
      const response = await fetch(`${API_URL}/api/public/live-sessions/${publicSessionId}/path`);

      if (!response.ok) {
        console.error('Failed to fetch traveled path for session', publicSessionId);
        return;
      }

      const data: RoutePoint[] = await response.json();
      setTraveledPaths(prev => {
        const newMap = new Map(prev);
        newMap.set(publicSessionId, data);
        return newMap;
      });
    } catch (err) {
      console.error('Error fetching traveled path:', err);
    } finally {
      setPathLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(publicSessionId);
        return newSet;
      });
    }
  };

  // Fetch public sessions
  const fetchSessions = async (isRetry = false) => {
    try {
      const response = await fetch(`${API_URL}/api/public/live-sessions`);

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Live-Sessions');
      }

      const data: PublicSession[] = await response.json();
      setSessions(data);
      setLastUpdate(new Date());
      setError('');
      setConnectionError(false);

      // Auto-fetch traveled paths for sessions with snapshots
      data.forEach(session => {
        if (session.currentSnapshot && !traveledPaths.has(session.publicSessionId)) {
          fetchTraveledPath(session.publicSessionId);
        }
      });

    } catch (err) {
      console.error('Error fetching sessions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Live-Sessions';
      setError(errorMessage);
      setConnectionError(true);

      // Retry with exponential backoff
      if (isRetry) {
        const retryDelay = Math.min(30000, 5000 * Math.pow(2, Math.floor(Math.random() * 3)));
        retryTimeoutRef.current = window.setTimeout(() => fetchSessions(true), retryDelay);
      }
    } finally {
      setLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Update traveled path for selected session periodically
  useEffect(() => {
    if (!selectedSession) return;

    const interval = setInterval(() => {
      fetchTraveledPath(selectedSession);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedSession]);

  // Handle session selection
  const handleSessionSelect = (publicSessionId: string) => {
    setSelectedSession(prev => prev === publicSessionId ? null : publicSessionId);

    // Fetch traveled path if not already loaded
    if (!traveledPaths.has(publicSessionId)) {
      fetchTraveledPath(publicSessionId);
    }
  };

  // Calculate duration
  const calculateDuration = (startedAt: string): string => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  // Get time since last update
  const getTimeSinceUpdate = (timestamp: string): string => {
    const updateTime = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - updateTime.getTime()) / 1000);

    if (diffSeconds < 60) {
      return `vor ${diffSeconds}s`;
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `vor ${diffMinutes}min`;
    }
    const hours = Math.floor(diffMinutes / 60);
    return `vor ${hours}h`;
  };

  // Calculate remaining route from current position
  const getRemainingRoute = (session: PublicSession): RoutePoint[] | null => {
    if (!session.routePoints || session.routePoints.length === 0 || !session.currentSnapshot) {
      return null;
    }

    if (session.currentSnapshot.routeProgressPercent === undefined) {
      return null;
    }

    const progressPercent = session.currentSnapshot.routeProgressPercent;
    const progressIndex = Math.floor((progressPercent / 100) * session.routePoints.length);

    // Return route points from current progress onwards
    const remaining = session.routePoints.slice(Math.max(0, progressIndex));

    // Add current position as first point if it's not close to the route
    if (remaining.length > 0) {
      const { latitude, longitude } = session.currentSnapshot;
      return [{ latitude, longitude }, ...remaining];
    }

    return remaining;
  };

  if (loading) {
    return (
      <div className="public-map-container">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Lade Live-Sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-map-container">
      {/* Header */}
      <div className="public-map-header">
        <div className="header-content">
          <h1>🚴 VeloPulse Live-Karte</h1>
          <p className="subtitle">
            {sessions.length === 0 
              ? 'Keine aktiven Sessions' 
              : `${sessions.length} aktive ${sessions.length === 1 ? 'Session' : 'Sessions'}`
            }
          </p>
        </div>
        <div className="header-actions">
          <div className="header-info">
            <div className="update-time">
              {lastUpdate.toLocaleTimeString('de-DE')}
            </div>
            <div className="auto-refresh">
              <span className={`pulse-dot-small ${connectionError ? 'error' : ''}`}></span>
              {connectionError ? 'Verbindungsfehler' : 'Auto-Refresh'}
            </div>
          </div>
          <button 
            className="btn-login"
            onClick={() => navigate('/login')}
          >
            🔐 Login
          </button>
        </div>
      </div>

      {error && !connectionError && (
        <div className="error-banner-public">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="public-map-content">
        {/* Map */}
        <div className="map-section">
          <MapContainer
            center={[48.1351, 11.5820]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Layers for selected session */}
            {selectedSession && sessions.map(session => {
              if (session.publicSessionId !== selectedSession || !session.currentSnapshot) return null;

              const traveledPath = traveledPaths.get(selectedSession) || [];
              const remainingRoute = getRemainingRoute(session);

              return (
                <LayerGroup key={`selected-${session.publicSessionId}`}>
                  {/* Traveled path - solid line */}
                  {traveledPath.length > 1 && (
                    <Polyline
                      positions={traveledPath.map(p => [p.latitude, p.longitude])}
                      color="#3b82f6"
                      weight={4}
                      opacity={0.8}
                    />
                  )}

                  {/* Remaining route - dashed line */}
                  {remainingRoute && remainingRoute.length > 1 && (
                    <Polyline
                      positions={remainingRoute.map(p => [p.latitude, p.longitude])}
                      color="#94a3b8"
                      weight={3}
                      opacity={0.6}
                      dashArray="10, 10"
                    />
                  )}
                </LayerGroup>
              );
            })}

            {/* Markers for all active users */}
            {sessions.map(session => {
              if (!session.currentSnapshot) return null;

              const { latitude, longitude } = session.currentSnapshot;
              const isSelected = selectedSession === session.publicSessionId;

              return (
                <Marker
                  key={`marker-${session.publicSessionId}`}
                  position={[latitude, longitude]}
                  icon={isSelected ? selectedUserIcon : activeUserIcon}
                  eventHandlers={{
                    click: () => handleSessionSelect(session.publicSessionId)
                  }}
                  zIndexOffset={isSelected ? 1000 : 0}
                >
                    <Popup>
                      <div className="marker-popup">
                        <div className="popup-header">
                          {session.profileImageUrl ? (
                            <img 
                              src={session.profileImageUrl} 
                              alt={session.displayName}
                              className="popup-avatar"
                            />
                          ) : (
                            <div className="popup-avatar-placeholder">
                              {session.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="popup-user">
                            <strong>{session.displayName}</strong>
                            <span className="popup-time">
                              {getTimeSinceUpdate(session.currentSnapshot.timestampUtc)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="popup-stats">
                          <div className="popup-stat">
                            <span className="stat-label">Distanz</span>
                            <span className="stat-value">
                              {formatDistance(session.currentSnapshot.distanceCompletedMeters)}
                            </span>
                          </div>
                          
                          {session.currentSnapshot.speedKmh !== undefined && (
                            <div className="popup-stat">
                              <span className="stat-label">Geschwindigkeit</span>
                              <span className="stat-value">
                                {session.currentSnapshot.speedKmh.toFixed(1)} km/h
                              </span>
                            </div>
                          )}
                          
                          <div className="popup-stat">
                            <span className="stat-label">Dauer</span>
                            <span className="stat-value">
                              {calculateDuration(session.startedAt)}
                            </span>
                          </div>
                          
                          {session.currentSnapshot.heartRateBpm && (
                            <div className="popup-stat">
                              <span className="stat-label">Puls</span>
                              <span className="stat-value">
                                {session.currentSnapshot.heartRateBpm} bpm
                              </span>
                            </div>
                          )}
                          
                          {session.currentSnapshot.routeProgressPercent !== undefined && (
                            <div className="popup-stat">
                              <span className="stat-label">Route</span>
                              <span className="stat-value">
                                {session.currentSnapshot.routeProgressPercent.toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            {/* Map controller for bounds and focus */}
            <MapController 
              sessions={sessions} 
              selectedSession={selectedSession}
              traveledPaths={traveledPaths}
              initialLoad={initialLoad}
            />
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="sessions-sidebar">
          <h2>Aktive Sessions</h2>
          
          {sessions.length === 0 ? (
            <div className="empty-state-sidebar">
              <span className="empty-icon">🚴</span>
              <p>Keine aktiven Sessions</p>
              <p className="empty-hint">
                Starte eine öffentliche Live-Session, um hier zu erscheinen!
              </p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map(session => (
                <div
                  key={session.publicSessionId}
                  className={`session-card ${selectedSession === session.publicSessionId ? 'selected' : ''}`}
                  onClick={() => handleSessionSelect(session.publicSessionId)}
                >
                  <div className="session-card-header">
                    {session.profileImageUrl ? (
                      <img 
                        src={session.profileImageUrl} 
                        alt={session.displayName}
                        className="session-avatar"
                      />
                    ) : (
                      <div className="session-avatar-placeholder">
                        {session.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="session-info">
                      <strong>{session.displayName}</strong>
                      <span className="session-duration">
                        {calculateDuration(session.startedAt)}
                      </span>
                    </div>
                    <div className="session-live-badge">
                      <span className="pulse-dot-small"></span>
                      LIVE
                    </div>
                  </div>
                  
                  {session.currentSnapshot && (
                    <div className="session-card-stats">
                      <div className="session-stat">
                        <span className="icon">📍</span>
                        {formatDistance(session.currentSnapshot.distanceCompletedMeters)}
                      </div>
                      
                      {session.currentSnapshot.speedKmh !== undefined && (
                        <div className="session-stat">
                          <span className="icon">⚡</span>
                          {session.currentSnapshot.speedKmh.toFixed(1)} km/h
                        </div>
                      )}
                      
                      {session.currentSnapshot.heartRateBpm && (
                        <div className="session-stat">
                          <span className="icon">❤️</span>
                          {session.currentSnapshot.heartRateBpm} bpm
                        </div>
                      )}
                      
                      {session.currentSnapshot.routeProgressPercent !== undefined && (
                        <div className="session-stat">
                          <span className="icon">🛣️</span>
                          {session.currentSnapshot.routeProgressPercent.toFixed(0)}%
                        </div>
                      )}
                      
                      <div className="session-stat session-time">
                        <span className="icon">🕐</span>
                        {getTimeSinceUpdate(session.currentSnapshot.timestampUtc)}
                      </div>
                    </div>
                  )}

                  {selectedSession === session.publicSessionId && (
                    <div className="session-details">
                      {traveledPaths.has(session.publicSessionId) && (
                        <div className="path-info">
                          <span className="path-indicator traveled">━━━</span>
                          <span className="path-label">Gefahrene Strecke</span>
                        </div>
                      )}
                      {getRemainingRoute(session) && (
                        <div className="path-info">
                          <span className="path-indicator planned">╌╌╌</span>
                          <span className="path-label">Verbleibende Route</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicMap;
