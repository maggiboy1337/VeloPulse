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

export interface ActivityPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  speedKmh?: number;
  accuracyMeters?: number;
  distanceFromStartMeters: number;
}

export interface ActivityDetail extends Activity {
  maxSpeedKmh?: number;
  averageHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  durationMinutes: number;
  points: ActivityPoint[];
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

  const getActivities = async (status?: string, limit?: number): Promise<Activity[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${API_URL}/api/activities?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sitzung abgelaufen');
      }
      throw new Error('Fehler beim Laden der Aktivitäten');
    }

    return response.json();
  };

  const getActivityDetails = async (id: string): Promise<ActivityDetail> => {
    const response = await fetch(`${API_URL}/api/activities/${id}/details`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sitzung abgelaufen');
      }
      throw new Error('Fehler beim Laden der Activity-Details');
    }

    return response.json();
  };

  const startActivity = async (routeId: string | null, name: string): Promise<Activity> => {
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        routeId: routeId || null,  // Ensure null instead of empty string
        name 
      })
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

  const sendSnapshot = async (activityId: string, data: {
    timestamp: string;
    latitude: number;
    longitude: number;
    elevationMeters?: number;
    speedKmh?: number;
    accuracyMeters?: number;
    heartRateBpm?: number;
    cadenceRpm?: number;
    powerWatts?: number;
  }): Promise<void> => {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('401: Sitzung abgelaufen');
      }
      throw new Error('Fehler beim Senden des GPS-Updates');
    }
  };

  const pauseActivity = async (activityId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/pause`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Pausieren der Activity');
  };

  const resumeActivity = async (activityId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Fortsetzen der Activity');
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
    getActivities,
    getActivityDetails,
    startActivity,
    startLiveSession,
    sendSnapshot,
    pauseActivity,
    resumeActivity,
    endLiveSession,
    finishActivity,
    getMyActiveSessions
  };
}
