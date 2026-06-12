import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities } from '../hooks/useActivities';
import './ActiveSessions.css';

interface LiveSession {
  id: string;
  publicSessionId: string;
  isPublic: boolean;
  startedAt: string;
  endedAt?: string;
  activityId: string;
}

export function ActiveSessions() {
  const navigate = useNavigate();
  const { getMyActiveSessions, endLiveSession, finishActivity } = useActivities();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingSession, setProcessingSession] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadSessions();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getMyActiveSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Fehler beim Laden der aktiven Sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (session: LiveSession) => {
    if (!window.confirm('Möchten Sie diese Session wirklich beenden? Die Aktivität wird automatisch abgeschlossen.')) {
      return;
    }

    setProcessingSession(session.id);

    try {
      // End live session
      await endLiveSession(session.id);

      // Finish activity
      await finishActivity(session.activityId);

      // Reload sessions
      await loadSessions();

      // Navigate to activity detail
      navigate(`/activities/${session.activityId}`);
    } catch (err) {
      console.error('Error ending session:', err);
      setError('Fehler beim Beenden der Session');
    } finally {
      setProcessingSession(null);
    }
  };

  const handleViewLive = (session: LiveSession) => {
    navigate(`/tracking/live/${session.activityId}`);
  };

  const handleViewDetail = (session: LiveSession) => {
    navigate(`/activities/${session.activityId}`);
  };

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

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="active-sessions">
        <div className="loading">
          <div className="spinner"></div>
          <p>Lade aktive Sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="active-sessions">
      <div className="page-header">
        <h1>🔴 Aktive Sessions</h1>
        <p className="subtitle">Verwalte deine laufenden Tracking-Sessions</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button className="btn-retry" onClick={loadSessions}>
            Erneut versuchen
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚴</div>
          <h2>Keine aktiven Sessions</h2>
          <p>Du hast momentan keine laufenden Tracking-Sessions.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/tracking/start')}
          >
            Neues Tracking starten
          </button>
        </div>
      ) : (
        <>
          <div className="sessions-count">
            <span className="count-badge">{sessions.length}</span>
            <span>aktive {sessions.length === 1 ? 'Session' : 'Sessions'}</span>
          </div>

          <div className="sessions-grid">
            {sessions.map(session => (
              <div key={session.id} className="session-card">
                <div className="session-header">
                  <div className="session-status">
                    <span className="status-indicator live"></span>
                    <span className="status-label">LIVE</span>
                  </div>

                  {session.isPublic && (
                    <div className="public-badge" title="Öffentlich sichtbar">
                      🌍 Öffentlich
                    </div>
                  )}
                </div>

                <div className="session-info">
                  <div className="info-row">
                    <span className="info-label">Session-ID:</span>
                    <span className="info-value session-id" title={session.publicSessionId}>
                      {session.publicSessionId.substring(0, 8)}...
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Gestartet:</span>
                    <span className="info-value">{formatDateTime(session.startedAt)}</span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Dauer:</span>
                    <span className="info-value duration">
                      {calculateDuration(session.startedAt)}
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Activity-ID:</span>
                    <span className="info-value activity-id" title={session.activityId}>
                      {session.activityId.substring(0, 8)}...
                    </span>
                  </div>
                </div>

                <div className="session-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewLive(session)}
                    title="Live-Tracking anzeigen"
                  >
                    📡 Live anzeigen
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewDetail(session)}
                    title="Activity-Details anzeigen"
                  >
                    📊 Details
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleEndSession(session)}
                    disabled={processingSession === session.id}
                    title="Session beenden"
                  >
                    {processingSession === session.id ? (
                      <>
                        <span className="spinner-small"></span>
                        Beende...
                      </>
                    ) : (
                      <>⏹ Beenden</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="info-box">
            <h3>ℹ️ Hinweis</h3>
            <ul>
              <li>Sessions werden automatisch alle 10 Sekunden aktualisiert</li>
              <li>Das Beenden einer Session schließt auch die zugehörige Aktivität ab</li>
              <li>Öffentliche Sessions sind auf der Live-Karte für alle sichtbar</li>
              <li>Du kannst zu jeder Session zurückkehren um das Live-Tracking zu sehen</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
