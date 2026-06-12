import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard, Dashboard as DashboardData } from '../hooks/useDashboard';
import './Dashboard.css';

export function Dashboard() {
  const navigate = useNavigate();
  const { getDashboard } = useDashboard();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Fehler beim Laden der Dashboard-Daten:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-error">
          <span className="error-icon">⚠️</span>
          <h2>Fehler</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadDashboardData}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button 
          className="btn btn-primary btn-start-tracking"
          onClick={() => navigate('/tracking/start')}
        >
          🚴 Neue Fahrt starten
        </button>
      </div>

      {/* Statistik-Kacheln */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <h3>Gesamtkilometer</h3>
            <p className="stat-value">{dashboard?.stats.totalDistanceKm.toFixed(1)} km</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Dieser Monat</h3>
            <p className="stat-value">{dashboard?.stats.currentMonthKm.toFixed(1)} km</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📆</div>
          <div className="stat-content">
            <h3>Diese Woche</h3>
            <p className="stat-value">{dashboard?.stats.currentWeekKm.toFixed(1)} km</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Anzahl Fahrten</h3>
            <p className="stat-value">{dashboard?.stats.totalActivities}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>Gesamtzeit</h3>
            <p className="stat-value">{formatDuration(dashboard?.stats.totalDurationMinutes || 0)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>Ø Geschwindigkeit</h3>
            <p className="stat-value">{dashboard?.stats.averageSpeedKmh.toFixed(1)} km/h</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⛰️</div>
          <div className="stat-content">
            <h3>Höhenmeter</h3>
            <p className="stat-value">{dashboard?.stats.totalElevationMeters.toFixed(0)} m</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>Längste Tour</h3>
            <p className="stat-value">{dashboard?.stats.longestTourKm.toFixed(1)} km</p>
          </div>
        </div>
      </div>

      {/* Aktive Sessions */}
      {dashboard && dashboard.activeSessions.length > 0 && (
        <div className="active-sessions-section">
          <h2>🔴 Aktive Tracking-Sessions</h2>
          <div className="sessions-list">
            {dashboard.activeSessions.map(session => (
              <div key={session.id} className="session-item">
                <div className="session-header">
                  <h3>{session.activityName}</h3>
                  <span className="status-badge active">● Live</span>
                </div>
                <div className="session-stats">
                  <div className="session-stat">
                    <span className="stat-label">Distanz</span>
                    <span className="stat-value">{session.currentDistanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="session-stat">
                    <span className="stat-label">Dauer</span>
                    <span className="stat-value">{formatDuration(session.currentDurationMinutes)}</span>
                  </div>
                  <div className="session-stat">
                    <span className="stat-label">Gestartet</span>
                    <span className="stat-value">{formatDate(session.startedAt)}</span>
                  </div>
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/sessions/active')}
                >
                  Details anzeigen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letzte Aktivitäten */}
      {dashboard && dashboard.recentActivities.length > 0 && (
        <div className="recent-activities-section">
          <h2>📈 Letzte Aktivitäten</h2>
          <div className="activities-list">
            {dashboard.recentActivities.slice(0, 5).map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-header">
                  <h3>{activity.name}</h3>
                  <span className="activity-date">{formatDate(activity.startedAt)}</span>
                </div>
                <div className="activity-stats">
                  <span className="activity-stat">
                    📏 {activity.distanceKm.toFixed(1)} km
                  </span>
                  <span className="activity-stat">
                    ⏱️ {formatDuration(activity.durationMinutes)}
                  </span>
                  {activity.averageSpeedKmh && (
                    <span className="activity-stat">
                      ⚡ {activity.averageSpeedKmh.toFixed(1)} km/h
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {dashboard.recentActivities.length > 5 && (
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/activities')}
            >
              Alle Aktivitäten anzeigen
            </button>
          )}
        </div>
      )}

      {/* Schnellzugriffe */}
      <div className="quick-actions">
        <h2>Schnellzugriff</h2>
        <div className="action-cards">
          <button 
            className="action-card"
            onClick={() => navigate('/sessions/active')}
          >
            <span className="action-icon">⏱️</span>
            <h3>Aktive Sessions</h3>
            <p>Laufende Tracking-Sessions anzeigen</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/routes')}
          >
            <span className="action-icon">🗺️</span>
            <h3>Strecken</h3>
            <p>Gespeicherte Routen verwalten</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/activities')}
          >
            <span className="action-icon">📈</span>
            <h3>Aktivitäten</h3>
            <p>Gefahrene Routen ansehen</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/public/map')}
          >
            <span className="action-icon">🌍</span>
            <h3>Live-Karte</h3>
            <p>Öffentliche Sessions auf Karte sehen</p>
          </button>
        </div>
      </div>

      {/* Info-Box für neue Nutzer */}
      {dashboard?.stats.totalActivities === 0 && (
        <div className="welcome-box">
          <h2>👋 Willkommen bei VeloPulse!</h2>
          <p>Starte deine erste Fahrt und verfolge deine Fortschritte.</p>
          <div className="welcome-steps">
            <div className="step">
              <span className="step-number">1</span>
              <p>GPS-Berechtigung erteilen</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <p>Tracking starten</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <p>Fahrt aufzeichnen</p>
            </div>
          </div>
          <button 
            className="btn btn-primary btn-large"
            onClick={() => navigate('/tracking/start')}
          >
            Erste Fahrt starten
          </button>
        </div>
      )}
    </div>
  );
}
