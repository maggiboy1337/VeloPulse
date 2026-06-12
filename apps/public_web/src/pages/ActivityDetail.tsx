import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import { Icon, LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { useActivities, type ActivityDetail as ActivityDetailType } from '../hooks/useActivities';
import 'leaflet/dist/leaflet.css';
import './ActivityDetail.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';

const startIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapFitBounds({ points }: { points: { latitude: number; longitude: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds: LatLngBoundsExpression = points.map(p => [p.latitude, p.longitude]) as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);

  return null;
}

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getActivityDetails } = useActivities();
  const [activity, setActivity] = useState<ActivityDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadActivity();
    }
  }, [id]);

  const loadActivity = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getActivityDetails(id);
      setActivity(data);
    } catch (err) {
      console.error('Fehler beim Laden der Activity:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Activity');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
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
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="activity-detail">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Lade Activity-Details...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="activity-detail">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Fehler</h2>
          <p>{error || 'Activity nicht gefunden'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/activities')}>
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const hasGpsTrack = activity.points && activity.points.length > 0;
  const startPoint = hasGpsTrack ? activity.points[0] : null;
  const endPoint = hasGpsTrack ? activity.points[activity.points.length - 1] : null;
  const polylinePoints = hasGpsTrack 
    ? activity.points.map(p => [p.latitude, p.longitude] as LatLngExpression)
    : [];

  return (
    <div className="activity-detail">
      {/* Header */}
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/activities')}>
          ← Zurück
        </button>
        <h1>{activity.name}</h1>
        <p className="activity-date">{formatDate(activity.startedAt)}</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-detail">
        <div className="stat-card-detail">
          <span className="stat-icon">📏</span>
          <div>
            <span className="stat-label">Distanz</span>
            <span className="stat-value">{formatDistance(activity.totalDistanceMeters)}</span>
          </div>
        </div>

        <div className="stat-card-detail">
          <span className="stat-icon">⏱️</span>
          <div>
            <span className="stat-label">Dauer</span>
            <span className="stat-value">{formatDuration(activity.durationMinutes)}</span>
          </div>
        </div>

        {activity.averageSpeedKmh && (
          <div className="stat-card-detail">
            <span className="stat-icon">⚡</span>
            <div>
              <span className="stat-label">Ø Geschwindigkeit</span>
              <span className="stat-value">{activity.averageSpeedKmh.toFixed(1)} km/h</span>
            </div>
          </div>
        )}

        {activity.maxSpeedKmh && (
          <div className="stat-card-detail">
            <span className="stat-icon">🚀</span>
            <div>
              <span className="stat-label">Max. Geschwindigkeit</span>
              <span className="stat-value">{activity.maxSpeedKmh.toFixed(1)} km/h</span>
            </div>
          </div>
        )}

        {activity.averageHeartRateBpm && (
          <div className="stat-card-detail">
            <span className="stat-icon">❤️</span>
            <div>
              <span className="stat-label">Ø Herzfrequenz</span>
              <span className="stat-value">{activity.averageHeartRateBpm} bpm</span>
            </div>
          </div>
        )}

        {activity.maxHeartRateBpm && (
          <div className="stat-card-detail">
            <span className="stat-icon">💓</span>
            <div>
              <span className="stat-label">Max. Herzfrequenz</span>
              <span className="stat-value">{activity.maxHeartRateBpm} bpm</span>
            </div>
          </div>
        )}

        {activity.routeName && (
          <div className="stat-card-detail route-card">
            <span className="stat-icon">🗺️</span>
            <div>
              <span className="stat-label">Geplante Route</span>
              <span className="stat-value">{activity.routeName}</span>
            </div>
          </div>
        )}

        <div className="stat-card-detail">
          <span className="stat-icon">📊</span>
          <div>
            <span className="stat-label">GPS-Punkte</span>
            <span className="stat-value">{activity.points.length}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      {hasGpsTrack ? (
        <div className="map-section-detail">
          <h2>GPS-Track</h2>
          <div className="map-container-detail">
            <MapContainer
              center={[startPoint!.latitude, startPoint!.longitude]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
              
              {/* GPS Track */}
              <Polyline
                positions={polylinePoints}
                color="#667eea"
                weight={4}
                opacity={0.8}
              />

              {/* Start Marker */}
              {startPoint && (
                <Marker
                  position={[startPoint.latitude, startPoint.longitude]}
                  icon={startIcon}
                />
              )}

              {/* End Marker */}
              {endPoint && (
                <Marker
                  position={[endPoint.latitude, endPoint.longitude]}
                  icon={endIcon}
                />
              )}

              <MapFitBounds points={activity.points} />
            </MapContainer>
          </div>
        </div>
      ) : (
        <div className="no-gps-message">
          <span className="no-gps-icon">📍</span>
          <h3>Keine GPS-Daten verfügbar</h3>
          <p>Für diese Aktivität wurden keine GPS-Punkte aufgezeichnet.</p>
        </div>
      )}
    </div>
  );
}
