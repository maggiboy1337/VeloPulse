import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities, Activity } from '../hooks/useActivities';
import './CompletedActivities.css';

export function CompletedActivities() {
  const navigate = useNavigate();
  const { getActivities } = useActivities();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getActivities('Finished');
      setActivities(data);
    } catch (err) {
      console.error('Fehler beim Laden der Aktivitäten:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Aktivitäten');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const minutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="completed-activities">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Lade Aktivitäten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="completed-activities">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Fehler</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadActivities}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="completed-activities">
      <div className="page-header">
        <h1>Gefahrene Routen</h1>
        <p className="page-subtitle">
          {activities.length} {activities.length === 1 ? 'Fahrt' : 'Fahrten'} abgeschlossen
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon">📈</div>
          <h2>Noch keine abgeschlossenen Fahrten</h2>
          <p>Starte deine erste Tour und zeichne deine Fahrt auf.</p>
          <button 
            className="btn btn-primary btn-large"
            onClick={() => navigate('/tracking/start')}
          >
            Erste Fahrt starten
          </button>
        </div>
      ) : (
        <div className="activities-list">
          {activities.map(activity => (
            <div 
              key={activity.id} 
              className="activity-card"
              onClick={() => navigate(`/activities/${activity.id}`)}
            >
              <div className="activity-card-header">
                <div className="activity-title-section">
                  <h3>{activity.name || 'Unbenannte Tour'}</h3>
                  <p className="activity-date">{formatDate(activity.startedAt)}</p>
                </div>
                {activity.routeName && (
                  <span className="route-badge">🗺️ {activity.routeName}</span>
                )}
              </div>

              <div className="activity-stats-row">
                <div className="activity-stat">
                  <span className="stat-icon">📏</span>
                  <div>
                    <span className="stat-label">Distanz</span>
                    <span className="stat-value">{formatDistance(activity.totalDistanceMeters)}</span>
                  </div>
                </div>

                <div className="activity-stat">
                  <span className="stat-icon">⏱️</span>
                  <div>
                    <span className="stat-label">Dauer</span>
                    <span className="stat-value">{formatDuration(activity.startedAt, activity.finishedAt)}</span>
                  </div>
                </div>

                {activity.averageSpeedKmh && (
                  <div className="activity-stat">
                    <span className="stat-icon">⚡</span>
                    <div>
                      <span className="stat-label">Ø Speed</span>
                      <span className="stat-value">{activity.averageSpeedKmh.toFixed(1)} km/h</span>
                    </div>
                  </div>
                )}

                <div className="activity-arrow">
                  →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

