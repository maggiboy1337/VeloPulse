import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import * as signalR from '@microsoft/signalr';
import { PublicLiveSession } from './types';
import { useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { SessionExpiredModal } from './components/SessionExpiredModal';
import { ElevationProfile } from './components/ElevationProfile';
import { Route } from './hooks/useRoutes';
import { useRoutes } from './hooks/useRoutes';
import { useActivities } from './hooks/useActivities';
import 'leaflet/dist/leaflet.css';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5000/hubs/live-tracking';
const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION || '© OpenStreetMap contributors';

const markerIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedMarkerIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ selectedSession }: { selectedSession: PublicLiveSession | null }) {
  const map = useMap();

  useEffect(() => {
    // Always center on selected session's current position
    if (selectedSession?.currentSnapshot) {
      map.setView(
        [selectedSession.currentSnapshot.latitude, selectedSession.currentSnapshot.longitude], 
        map.getZoom() < 13 ? 13 : map.getZoom(), // Ensure minimum zoom of 13
        { animate: true }
      );
    }
  }, [selectedSession?.currentSnapshot?.latitude, selectedSession?.currentSnapshot?.longitude, selectedSession?.publicSessionId, map]);

  return null;
}

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { getRoute } = useRoutes();
  const { startActivity, startLiveSession, sendSnapshot, endLiveSession, finishActivity } = useActivities();
  
  const [sessions, setSessions] = useState<PublicLiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PublicLiveSession | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  // Active tour state
  const [activeTour, setActiveTour] = useState<{
    activityId: string;
    sessionId: string;
    route: Route;
    routePoints: any[];
    currentIndex: number;
    gpsStatus?: 'searching' | 'active' | 'error';
    lastGPSUpdate?: Date;
  } | null>(null);
  const tourIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    fetchSessions();
    setupSignalR();
    return () => {
      connection?.stop();
      if (tourIntervalRef.current) {
        clearInterval(tourIntervalRef.current);
      }
    };
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/public/live-sessions`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      console.log('Fetched sessions:', data);
      const uniqueSessions = data.reduce((acc: PublicLiveSession[], current: PublicLiveSession) => {
        if (!acc.find(s => s.publicSessionId === current.publicSessionId)) {
          acc.push(current);
        }
        return acc;
      }, []);
      console.log('Unique sessions:', uniqueSessions);
      setSessions(uniqueSessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Verbindung zum Server fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSignalR = async () => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL)
      .withAutomaticReconnect()
      .build();

    newConnection.on('LiveSessionStarted', (publicSessionId: string, sessionData: PublicLiveSession) => {
      console.log('SignalR: LiveSessionStarted', publicSessionId, sessionData);
      setSessions(prev => {
        if (prev.find(s => s.publicSessionId === publicSessionId)) return prev;
        return [...prev, sessionData];
      });
    });

    newConnection.on('LiveSessionUpdated', (publicSessionId: string, snapshotData: any) => {
      console.log('SignalR: LiveSessionUpdated', publicSessionId, snapshotData);
      setSessions(prev => prev.map(session => 
        session.publicSessionId === publicSessionId
          ? { ...session, currentSnapshot: snapshotData }
          : session
      ));
    });

    newConnection.on('LiveSessionEnded', (publicSessionId: string) => {
      console.log('SignalR: LiveSessionEnded', publicSessionId);
      setSessions(prev => prev.filter(s => s.publicSessionId !== publicSessionId));
      if (selectedSession?.publicSessionId === publicSessionId) {
        setSelectedSession(null);
      }
    });

    try {
      await newConnection.start();
      setConnection(newConnection);
    } catch (err) {
      console.error('SignalR connection error:', err);
    }
  };

  const handleStartTour = async (route: Route) => {
    try {
      console.log('Starting tour for route:', route);

      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error('Geolocation wird von Ihrem Browser nicht unterstützt');
      }

      // Request location permission
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        throw new Error('GPS-Zugriff wurde verweigert. Bitte aktivieren Sie die Standortberechtigung.');
      }

      // 1. Start Activity
      const activity = await startActivity(route.id, `Tour: ${route.name}`);
      console.log('Activity started:', activity);

      // 2. Start Live Session
      const session = await startLiveSession(activity.id, true);
      console.log('Live session started:', session);

      // 3. Load Route Details
      const routeDetail = await getRoute(route.id);
      console.log('Route detail loaded:', routeDetail.points?.length, 'points');

      if (!routeDetail.points || routeDetail.points.length === 0) {
        throw new Error('Route hat keine Punkte');
      }

      setActiveTour({
        activityId: activity.id,
        sessionId: session.id,
        route,
        routePoints: routeDetail.points,
        currentIndex: 0
      });

      console.log('Active tour set, starting GPS tracking...');

      // 4. Start GPS Tracking (not simulation)
      startGPSTracking(session.id, route, routeDetail.points);

    } catch (err) {
      console.error('Error starting tour:', err);
      alert('Fehler beim Starten der Tour: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    }
  };

  const startGPSTracking = (sessionId: string, route: Route, routePoints: any[]) => {
    console.log('Starting real GPS tracking');

    let totalDistance = 0;
    let lastPosition: GeolocationPosition | null = null;

    // Set GPS status to searching
    setActiveTour(prev => prev ? { ...prev, gpsStatus: 'searching' } : null);

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        console.log('GPS Update:', position.coords);

        // Update GPS status to active
        setActiveTour(prev => prev ? { 
          ...prev, 
          gpsStatus: 'active',
          lastGPSUpdate: new Date()
        } : null);

        // Calculate distance from last position
        if (lastPosition) {
          const distance = calculateDistance(
            lastPosition.coords.latitude,
            lastPosition.coords.longitude,
            position.coords.latitude,
            position.coords.longitude
          );
          totalDistance += distance;
        }
        lastPosition = position;

        // Calculate progress along route (find nearest point)
        let nearestIndex = 0;
        let minDistance = Infinity;
        routePoints.forEach((point, index) => {
          const dist = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            point.latitude,
            point.longitude
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestIndex = index;
          }
        });

        const progress = (nearestIndex / routePoints.length) * 100;
        const distanceRemaining = route.totalDistanceMeters - totalDistance;

        console.log(`GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}, Progress: ${progress.toFixed(1)}%`);

        try {
          await sendSnapshot(sessionId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speedKmh: position.coords.speed ? position.coords.speed * 3.6 : undefined, // m/s to km/h
            distanceCompletedMeters: totalDistance,
            distanceRemainingMeters: distanceRemaining > 0 ? distanceRemaining : 0,
            routeProgressPercent: progress
          });

          setActiveTour(prev => prev ? { ...prev, currentIndex: nearestIndex } : null);
        } catch (err) {
          console.error('Error sending GPS snapshot:', err);

          // Check if it's an authentication error
          if (err instanceof Error && (err.message.includes('401') || err.message.includes('Sitzung abgelaufen'))) {
            await handleStopTour();
            setShowSessionExpiredModal(true);
            return;
          }
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        setActiveTour(prev => prev ? { ...prev, gpsStatus: 'error' } : null);

        let errorMessage = 'GPS-Fehler: ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Zugriff verweigert. Bitte aktivieren Sie die Standortberechtigung.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Position nicht verfügbar.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Zeitüberschreitung.';
            break;
          default:
            errorMessage += error.message;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Store watch ID in ref for cleanup
    if (tourIntervalRef.current !== null) {
      clearInterval(tourIntervalRef.current);
    }
    tourIntervalRef.current = watchId;
  };

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleStopTour = async () => {
    if (!activeTour) return;

    if (tourIntervalRef.current !== null) {
      // Check if it's a watchPosition ID or interval ID
      if (typeof tourIntervalRef.current === 'number') {
        // Could be either interval or watchPosition, try both
        clearInterval(tourIntervalRef.current);
        navigator.geolocation.clearWatch(tourIntervalRef.current);
      }
      tourIntervalRef.current = null;
    }

    try {
      await endLiveSession(activeTour.sessionId);
      await finishActivity(activeTour.activityId);
    } catch (err) {
      console.error('Error stopping tour:', err);
    }

    setActiveTour(null);
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <div className="app">
        <header className="header">
          <h1>🚴 VeloPulse Live Tracking</h1>
          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <button className="btn btn-avatar" onClick={() => setShowProfileModal(true)}>
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt={user.displayName} />
                  ) : (
                    <span>{user?.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </button>
                <button className="btn btn-secondary" onClick={() => { logout(); window.location.reload(); }}>
                  Logout
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
                Login
              </button>
            )}
          </div>
        </header>

        {activeTour && (
          <div className="active-tour-banner">
            <div className="tour-info">
              <div>
                <span>🚴 Tour aktiv: {activeTour.route.name}</span>
                <span> • {activeTour.routePoints && activeTour.routePoints.length > 0 ? ((activeTour.currentIndex / activeTour.routePoints.length) * 100).toFixed(0) : 0}% abgeschlossen</span>
              </div>
              <div className="gps-status">
                {activeTour.gpsStatus === 'searching' && <span className="gps-searching">📡 GPS wird gesucht...</span>}
                {activeTour.gpsStatus === 'active' && <span className="gps-active">✓ GPS aktiv</span>}
                {activeTour.gpsStatus === 'error' && <span className="gps-error">⚠️ GPS-Fehler</span>}
              </div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={handleStopTour}>
              Beenden
            </button>
          </div>
        )}

        <main className="main-content">
          <div className="map-section">
            <div className="map-container">
              <MapContainer center={[51.1657, 10.4515]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />

                {sessions.map(session => {
                  if (!session.currentSnapshot) return null;
                  const position: LatLngExpression = [session.currentSnapshot.latitude, session.currentSnapshot.longitude];
                  const isSelected = selectedSession?.publicSessionId === session.publicSessionId;

                  return (
                    <Marker key={session.publicSessionId} position={position} icon={isSelected ? selectedMarkerIcon : markerIcon} eventHandlers={{ click: () => setSelectedSession(session) }}>
                      <Popup>
                        <strong>{session.displayName}</strong><br />
                        {session.currentSnapshot.speedKmh && <>🏃 {session.currentSnapshot.speedKmh.toFixed(1)} km/h<br /></>}
                        {session.currentSnapshot.heartRateBpm && <>❤️ {session.currentSnapshot.heartRateBpm} bpm</>}
                      </Popup>
                    </Marker>
                  );
                })}

                {sessions.map(session => {
                  if (!session.routePoints || session.routePoints.length === 0) return null;
                  const isSelected = selectedSession?.publicSessionId === session.publicSessionId;
                  return (
                    <Polyline
                      key={`route-${session.publicSessionId}`}
                      positions={session.routePoints.map(p => [p.latitude, p.longitude] as LatLngExpression)}
                      color={isSelected ? "#8b5cf6" : "#06b6d4"}
                      weight={isSelected ? 4 : 2}
                      opacity={isSelected ? 0.9 : 0.4}
                    />
                  );
                })}

                <MapUpdater selectedSession={selectedSession} />
              </MapContainer>
            </div>

            {selectedSession && selectedSession.routePoints && selectedSession.routePoints.length > 0 && selectedSession.currentSnapshot && (
              <ElevationProfile 
                routePoints={selectedSession.routePoints}
                currentIndex={selectedSession.currentSnapshot.routeProgressPercent != null ? 
                  Math.floor((selectedSession.currentSnapshot.routeProgressPercent / 100) * selectedSession.routePoints.length)
                  : 0
                }
                displayName={selectedSession.displayName}
              />
            )}
          </div>

          <aside className="sidebar">
            <h2>Live unterwegs ({sessions.filter(s => s.currentSnapshot).length})</h2>
            
            {isLoading && <div className="empty-state"><div className="empty-state-icon">⏳</div><p>Lade Daten...</p></div>}
            {error && <div className="empty-state"><div className="empty-state-icon">⚠️</div><h3>Fehler</h3><p>{error}</p></div>}
            {!isLoading && !error && sessions.filter(s => s.currentSnapshot).length === 0 && (
              <div className="empty-state"><div className="empty-state-icon">🚴</div><h3>Niemand live unterwegs</h3></div>
            )}

            {sessions.filter(s => s.currentSnapshot).map(session => (
              <div
                key={session.publicSessionId}
                className={`session-card ${selectedSession?.publicSessionId === session.publicSessionId ? 'active' : ''}`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="session-header">
                  <div className="profile-image">
                    {session.profileImageUrl ? <img src={session.profileImageUrl} alt="" /> : getInitials(session.displayName)}
                  </div>
                  <div>
                    <div className="session-name">{session.displayName}</div>
                    <div className="session-time"><span className="status-badge live">● Live</span></div>
                  </div>
                </div>
                {session.currentSnapshot && (
                  <div className="session-stats">
                    {session.currentSnapshot.speedKmh && (
                      <div className="stat-item">
                        <span className="stat-label">Geschwindigkeit</span>
                        <span className="stat-value">{session.currentSnapshot.speedKmh.toFixed(1)} km/h</span>
                      </div>
                    )}
                    <div className="stat-item">
                      <span className="stat-label">Zurückgelegt</span>
                      <span className="stat-value">{formatDistance(session.currentSnapshot.distanceCompletedMeters)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </aside>
        </main>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} onStartTour={handleStartTour} />
      <SessionExpiredModal 
        isOpen={showSessionExpiredModal} 
        onClose={() => setShowSessionExpiredModal(false)}
        onLogout={() => {
          if (logout) {
            logout();
          }
        }}
      />
    </>
  );
}

export default App;
