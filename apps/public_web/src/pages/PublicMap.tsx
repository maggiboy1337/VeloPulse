import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Component to fit map to all markers
function MapBounds({ sessions }: { sessions: PublicSession[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (sessions.length > 0) {
      const validSessions = sessions.filter(s => s.currentSnapshot);
      if (validSessions.length > 0) {
        const bounds = L.latLngBounds(
          validSessions.map(s => [
            s.currentSnapshot!.latitude,
            s.currentSnapshot!.longitude
          ])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [sessions, map]);
  
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

  // Fetch public sessions
  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/public/live-sessions`);

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Live-Sessions');
      }

      const data: PublicSession[] = await response.json();
      console.log('🔍 Fetched sessions:', data);
      console.log('🔍 Sessions with snapshots:', data.filter(s => s.currentSnapshot));
      console.log('🔍 Sessions with coordinates:', data.filter(s => s.currentSnapshot && s.currentSnapshot.latitude && s.currentSnapshot.longitude));
      setSessions(data);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Live-Sessions');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

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
    return `vor ${diffMinutes}min`;
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
              <span className="pulse-dot-small"></span>
              Auto-Refresh
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

      {error && (
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
            center={[48.1351, 11.5820]} // München als Default
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {/* User markers and routes */}
            {sessions.map(session => {
              console.log('🗺️ Processing session for map:', session.publicSessionId, {
                hasSnapshot: !!session.currentSnapshot,
                snapshot: session.currentSnapshot
              });

              if (!session.currentSnapshot) {
                console.log('⚠️ No snapshot for session:', session.publicSessionId);
                return null;
              }

              const { latitude, longitude } = session.currentSnapshot;
              console.log('📍 Marker position:', { latitude, longitude, sessionId: session.publicSessionId });

              return (
                <React.Fragment key={session.publicSessionId}>
                  {/* Route polyline if available */}
                  {session.routePoints && session.routePoints.length > 0 && (
                    <Polyline
                      positions={session.routePoints.map(p => [p.latitude, p.longitude])}
                      color="#94a3b8"
                      weight={3}
                      opacity={0.5}
                      dashArray="5, 10"
                    />
                  )}
                  
                  {/* User marker */}
                  <Marker
                    position={[latitude, longitude]}
                    icon={activeUserIcon}
                    eventHandlers={{
                      click: () => setSelectedSession(session.publicSessionId)
                    }}
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
                </React.Fragment>
              );
            })}
            
            {/* Auto-fit bounds */}
            <MapBounds sessions={sessions} />
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
            <>
              <div className="sessions-info-box">
                <div>Sessions total: {sessions.length}</div>
                <div>Mit GPS: {sessions.filter(s => s.currentSnapshot).length}</div>
                <div>Ohne GPS: {sessions.filter(s => !s.currentSnapshot).length}</div>
              </div>
              <div className="sessions-list">
              {sessions.map(session => (
                <div
                  key={session.publicSessionId}
                  className={`session-card ${selectedSession === session.publicSessionId ? 'selected' : ''}`}
                  onClick={() => setSelectedSession(session.publicSessionId)}
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

                  {session.currentSnapshot ? (
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
                  ) : (
                    <div className="session-no-gps">
                      <span className="icon">⚠️</span>
                      Warte auf GPS-Daten...
                    </div>
                  )}
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicMap;
