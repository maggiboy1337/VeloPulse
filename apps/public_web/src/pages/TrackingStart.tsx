import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoutes, Route } from '../hooks/useRoutes';
import { useActivities } from '../hooks/useActivities';
import './TrackingStart.css';

export function TrackingStart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getRoutes } = useRoutes();
  const { startActivity, startLiveSession } = useActivities();

  const [mode, setMode] = useState<'free' | 'route'>('free');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityName, setActivityName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    // Check if route was passed via navigation state
    const state = location.state as { routeId?: string } | null;
    if (state?.routeId) {
      setMode('route');
      loadRoutes(state.routeId);
    }
  }, [location.state]);

  const loadRoutes = async (preselectedRouteId?: string) => {
    try {
      const data = await getRoutes();
      setRoutes(data);

      if (preselectedRouteId) {
        const route = data.find(r => r.id === preselectedRouteId);
        if (route) {
          setSelectedRoute(route);
          setActivityName(`Tour: ${route.name}`);
        }
      }
    } catch (err) {
      console.error('Fehler beim Laden der Routen:', err);
      setError('Fehler beim Laden der Routen');
    }
  };

  const handleModeChange = (newMode: 'free' | 'route') => {
    setMode(newMode);
    if (newMode === 'route' && routes.length === 0) {
      loadRoutes();
    }
  };

  const handleStartTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check GPS permission
      if (!navigator.geolocation) {
        throw new Error('GPS wird von Ihrem Browser nicht unterstützt');
      }

      // Request permission
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        throw new Error('GPS-Zugriff verweigert. Bitte aktivieren Sie die Standortberechtigung in Ihren Browser-Einstellungen.');
      }

      // Get name
      const name = activityName.trim() || (selectedRoute ? `Tour: ${selectedRoute.name}` : 'Neue Tour');

      // Start activity
      const activity = await startActivity(
        selectedRoute?.id || null,  // Pass null instead of empty string
        name
      );

      // Start live session
      await startLiveSession(activity.id, isPublic);

      // Navigate to live tracking view (we'll create this later)
      navigate(`/tracking/live/${activity.id}`);
    } catch (err) {
      console.error('Fehler beim Starten:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Starten des Trackings');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="tracking-start">
      <div className="page-header">
        <h1>Tracking starten</h1>
        <p className="page-subtitle">Wähle deinen Tracking-Modus</p>
      </div>

      {/* Mode Selection */}
      <div className="mode-selection">
        <button
          className={`mode-card ${mode === 'free' ? 'active' : ''}`}
          onClick={() => handleModeChange('free')}
        >
          <span className="mode-icon">🚴</span>
          <h3>Freies Tracking</h3>
          <p>Starte ohne vordefinierte Route und fahre, wohin du möchtest.</p>
          {mode === 'free' && <span className="active-badge">✓</span>}
        </button>

        <button
          className={`mode-card ${mode === 'route' ? 'active' : ''}`}
          onClick={() => handleModeChange('route')}
        >
          <span className="mode-icon">🗺️</span>
          <h3>Mit gespeicherter Route</h3>
          <p>Folge einer deiner gespeicherten Strecken.</p>
          {mode === 'route' && <span className="active-badge">✓</span>}
        </button>
      </div>

      {/* Route Selection (only in route mode) */}
      {mode === 'route' && (
        <div className="route-selection-section">
          <h2>Route auswählen</h2>
          {routes.length === 0 ? (
            <div className="no-routes-message">
              <p>Noch keine Routen vorhanden.</p>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/routes')}
              >
                Routen verwalten
              </button>
            </div>
          ) : (
            <div className="routes-list">
              {routes.map(route => (
                <div
                  key={route.id}
                  className={`route-item ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedRoute(route);
                    setActivityName(`Tour: ${route.name}`);
                  }}
                >
                  <div className="route-item-header">
                    <h4>{route.name}</h4>
                    {selectedRoute?.id === route.id && <span className="selected-badge">✓</span>}
                  </div>
                  <div className="route-item-stats">
                    <span>📏 {formatDistance(route.totalDistanceMeters)}</span>
                    {route.maxElevationMeters && (
                      <span>⛰️ {Math.round(route.maxElevationMeters)}m</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      <div className="tracking-config">
        <h2>Einstellungen</h2>

        <div className="config-group">
          <label htmlFor="activityName">Name der Tour (optional)</label>
          <input
            type="text"
            id="activityName"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder={mode === 'free' ? 'z.B. Morgenrunde' : 'Tour: ...'}
            className="config-input"
          />
        </div>

        <div className="config-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span>Live-Session öffentlich teilen</span>
          </label>
          <p className="help-text">
            Andere können deine Tour in Echtzeit auf der öffentlichen Karte sehen.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* GPS Info */}
      <div className="gps-info-box">
        <h3>📡 GPS-Hinweise</h3>
        <ul>
          <li>Stelle sicher, dass GPS auf deinem Gerät aktiviert ist</li>
          <li>Erlaube dem Browser den Zugriff auf deinen Standort</li>
          <li>Bei schlechtem GPS-Signal werden Punkte lokal zwischengespeichert</li>
          <li>Für zuverlässiges Tracking sollte der Browser-Tab sichtbar bleiben</li>
        </ul>
      </div>

      {/* Start Button */}
      <div className="action-section">
        <button
          className="btn btn-primary btn-large btn-start"
          onClick={handleStartTracking}
          disabled={loading || (mode === 'route' && !selectedRoute)}
        >
          {loading ? (
            <>
              <span className="spinner-small"></span>
              Wird gestartet...
            </>
          ) : (
            <>
              🚴 Tracking jetzt starten
            </>
          )}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => navigate('/dashboard')}
          disabled={loading}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
