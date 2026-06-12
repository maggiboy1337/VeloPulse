import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Activity {
  id: string;
  name?: string;
  status: 'Active' | 'Paused' | 'Finished';
  startedAt: string;
  finishedAt?: string;
  totalDistanceMeters: number;
  averageSpeedKmh?: number;
  routeId?: string;
  routeName?: string;
}

export interface LiveSession {
  id: string;
  publicSessionId: string;
  isPublic: boolean;
  startedAt: string;
  endedAt?: string;
  activityId: string;
}

export function useActivities() {
  const { token } = useAuth();

  const startActivity = async (routeId: string, name: string): Promise<Activity> => {
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ routeId, name })
    });

    if (!response.ok) throw new Error('Fehler beim Starten der Activity');
    return response.json();
  };

  const startLiveSession = async (activityId: string, isPublic: boolean = true): Promise<LiveSession> => {
    const response = await fetch(`${API_URL}/api/live-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ activityId, isPublic })
    });

    if (!response.ok) throw new Error('Fehler beim Starten der Live-Session');
    return response.json();
  };

  const sendSnapshot = async (sessionId: string, data: {
    latitude: number;
    longitude: number;
    speedKmh?: number;
    heartRateBpm?: number;
    distanceCompletedMeters: number;
    distanceRemainingMeters?: number;
    routeProgressPercent?: number;
  }): Promise<void> => {
    const response = await fetch(`${API_URL}/api/live-sessions/${sessionId}/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...data,
        gpsAccuracyMeters: 5.0
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('401: Sitzung abgelaufen');
      }
      throw new Error('Fehler beim Senden des GPS-Updates');
    }
  };

  const endLiveSession = async (sessionId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/live-sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Beenden der Session');
  };

  const finishActivity = async (activityId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/finish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Beenden der Activity');
  };

  const getMyActiveSessions = async (): Promise<LiveSession[]> => {
    const response = await fetch(`${API_URL}/api/live-sessions/my-active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Laden der aktiven Sessions');
    return response.json();
  };

  return {
    startActivity,
    startLiveSession,
    sendSnapshot,
    endLiveSession,
    finishActivity,
    getMyActiveSessions
  };
}
