import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRoutes, Route } from '../hooks/useRoutes';
import { useActivities, LiveSession } from '../hooks/useActivities';
import './ProfileModal.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: (route: Route) => void;
}

export function ProfileModal({ isOpen, onClose, onStartTour }: ProfileModalProps) {
  const { user, logout, updateProfile } = useAuth();
  const { getRoutes, importGpx, deleteRoute } = useRoutes();
  const { getMyActiveSessions, endLiveSession, finishActivity } = useActivities();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'routes' | 'sessions'>('profile');

  useEffect(() => {
    if (isOpen && activeTab === 'routes') {
      loadRoutes();
    }
    if (isOpen && activeTab === 'sessions') {
      loadActiveSessions();
    }
  }, [isOpen, activeTab]);

  const loadRoutes = async () => {
    try {
      const data = await getRoutes();
      setRoutes(data);
    } catch (err) {
      setError('Fehler beim Laden der Routen');
    }
  };

  const loadActiveSessions = async () => {
    try {
      const data = await getMyActiveSessions();
      setActiveSessions(data);
    } catch (err) {
      setError('Fehler beim Laden der aktiven Sessions');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(displayName, profileImageUrl || undefined);
      setSuccess('Profil aktualisiert!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Aktualisieren');
    } finally {
      setLoading(false);
    }
  };

  const handleGpxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log(`GPX file: ${file.name}, size: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      await importGpx(file);
      setSuccess(`Route "${file.name}" importiert!`);
      setTimeout(() => setSuccess(''), 3000);
      await loadRoutes();
      e.target.value = '';
    } catch (err) {
      console.error('GPX Import Error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Importieren');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Route wirklich löschen?')) return;

    try {
      await deleteRoute(routeId);
      await loadRoutes();
      setSuccess('Route gelöscht!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Löschen');
    }
  };

  const handleStartTour = (route: Route) => {
    onStartTour(route);
    onClose();
  };

  const handleEndSession = async (session: LiveSession) => {
    if (!confirm('Session wirklich beenden?')) return;

    try {
      await endLiveSession(session.id);
      await finishActivity(session.activityId);
      await loadActiveSessions();
      setSuccess('Session beendet!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fehler beim Beenden');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={displayName} />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h2>{displayName}</h2>
          <p className="profile-email">{user?.email}</p>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profil
          </button>
          <button
            className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            Routen
          </button>
          <button
            className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            Aktive Touren {activeSessions.length > 0 && `(${activeSessions.length})`}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="displayName">Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="profileImageUrl">Profilbild URL</label>
              <input
                id="profileImageUrl"
                type="url"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Speichert...' : 'Speichern'}
            </button>

            <button type="button" className="btn btn-secondary" onClick={logout}>
              Ausloggen
            </button>
          </form>
        )}

        {activeTab === 'routes' && (
          <div className="routes-section">
            <div className="upload-section">
              <label htmlFor="gpx-upload" className="btn btn-primary upload-btn">
                📁 GPX-Datei hochladen
              </label>
              <input
                id="gpx-upload"
                type="file"
                accept=".gpx"
                onChange={handleGpxImport}
                style={{ display: 'none' }}
              />
            </div>

            {routes.length === 0 ? (
              <div className="empty-state">
                <p>Noch keine Routen vorhanden</p>
                <small>Lade eine GPX-Datei hoch, um loszulegen</small>
              </div>
            ) : (
              <div className="routes-list">
                {routes.map(route => (
                  <div key={route.id} className="route-card">
                    <div className="route-info">
                      <h4>{route.name}</h4>
                      <div className="route-stats">
                        <span>📏 {(route.totalDistanceMeters / 1000).toFixed(1)} km</span>
                        {route.maxElevationMeters && (
                          <span>⛰️ {route.maxElevationMeters.toFixed(0)} m</span>
                        )}
                      </div>
                    </div>
                    <div className="route-actions">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStartTour(route)}
                      >
                        🚴 Starten
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteRoute(route.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-section">
            {activeSessions.length === 0 ? (
              <div className="empty-state">
                <p>Keine aktiven Touren</p>
                <small>Starte eine Tour um sie hier zu sehen</small>
              </div>
            ) : (
              <div className="sessions-list">
                {activeSessions.map(session => (
                  <div key={session.id} className="session-card-modal">
                    <div className="session-info">
                      <h4>Live Session</h4>
                      <div className="session-details">
                        <span>🆔 {session.publicSessionId}</span>
                        <span>🕐 Gestartet: {new Date(session.startedAt).toLocaleTimeString('de-DE')}</span>
                        <span>{session.isPublic ? '🌍 Öffentlich' : '🔒 Privat'}</span>
                      </div>
                    </div>
                    <div className="session-actions">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleEndSession(session)}
                        disabled={loading}
                      >
                        ⏹️ Beenden
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
