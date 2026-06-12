import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoutes, Route } from '../hooks/useRoutes';
import './SavedRoutes.css';

export function SavedRoutes() {
  const navigate = useNavigate();
  const { getRoutes, deleteRoute } = useRoutes();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRoutes();
      setRoutes(data);
    } catch (err) {
      console.error('Fehler beim Laden der Routen:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Routen');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Route "${name}" wirklich löschen?`)) return;

    try {
      await deleteRoute(id);
      setRoutes(routes.filter(r => r.id !== id));
    } catch (err) {
      alert('Fehler beim Löschen der Route');
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatElevation = (meters?: number) => {
    if (meters === undefined || meters === null) return '-';
    return `${Math.round(meters)} m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="saved-routes">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Lade Strecken...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="saved-routes">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Fehler</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadRoutes}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-routes">
      <div className="page-header">
        <h1>Gespeicherte Strecken</h1>
        <p className="page-subtitle">
          {routes.length} {routes.length === 1 ? 'Strecke' : 'Strecken'} verfügbar
        </p>
      </div>

      {routes.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon">🗺️</div>
          <h2>Noch keine Strecken vorhanden</h2>
          <p>Importiere eine GPX-Datei, um deine erste Strecke hinzuzufügen.</p>
          <p className="help-text">
            GPX-Dateien kannst du z.B. von Komoot, Strava oder anderen Plattformen exportieren.
          </p>
        </div>
      ) : (
        <div className="routes-grid">
          {routes.map(route => (
            <div key={route.id} className="route-card">
              <div className="route-card-header">
                <h3>{route.name}</h3>
                {route.description && (
                  <p className="route-description">{route.description}</p>
                )}
              </div>

              <div className="route-stats-grid">
                <div className="route-stat">
                  <span className="stat-icon">📏</span>
                  <div>
                    <span className="stat-label">Distanz</span>
                    <span className="stat-value">{formatDistance(route.totalDistanceMeters)}</span>
                  </div>
                </div>

                {route.maxElevationMeters !== undefined && (
                  <div className="route-stat">
                    <span className="stat-icon">⛰️</span>
                    <div>
                      <span className="stat-label">Max. Höhe</span>
                      <span className="stat-value">{formatElevation(route.maxElevationMeters)}</span>
                    </div>
                  </div>
                )}

                {route.totalAscentMeters !== undefined && route.totalAscentMeters > 0 && (
                  <div className="route-stat">
                    <span className="stat-icon">📈</span>
                    <div>
                      <span className="stat-label">Anstieg</span>
                      <span className="stat-value">{formatElevation(route.totalAscentMeters)}</span>
                    </div>
                  </div>
                )}

                <div className="route-stat">
                  <span className="stat-icon">📅</span>
                  <div>
                    <span className="stat-label">Erstellt</span>
                    <span className="stat-value">{formatDate(route.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="route-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/tracking/start', { state: { routeId: route.id } })}
                >
                  🚴 Tracking starten
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate(`/routes/${route.id}`)}
                >
                  Details
                </button>
                <button 
                  className="btn btn-danger btn-icon"
                  onClick={() => handleDelete(route.id, route.name)}
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

