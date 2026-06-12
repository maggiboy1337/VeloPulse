import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface DashboardStats {
  totalDistanceKm: number;
  totalActivities: number;
  totalDurationMinutes: number;
  averageSpeedKmh: number;
  totalElevationMeters: number;
  currentMonthKm: number;
  currentWeekKm: number;
  longestTourKm: number;
}

export interface RecentActivity {
  id: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  distanceKm: number;
  averageSpeedKmh?: number;
  durationMinutes: number;
  status: string;
}

export interface ActiveSession {
  id: string;
  publicSessionId: string;
  activityId: string;
  activityName: string;
  startedAt: string;
  currentDistanceKm: number;
  currentDurationMinutes: number;
  isPublic: boolean;
}

export interface Dashboard {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  activeSessions: ActiveSession[];
}

export function useDashboard() {
  const { token } = useAuth();

  const getDashboard = async (): Promise<Dashboard> => {
    const response = await fetch(`${API_URL}/api/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sitzung abgelaufen');
      }
      throw new Error('Fehler beim Laden der Dashboard-Daten');
    }

    return response.json();
  };

  const getStats = async (): Promise<DashboardStats> => {
    const response = await fetch(`${API_URL}/api/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sitzung abgelaufen');
      }
      throw new Error('Fehler beim Laden der Statistiken');
    }

    return response.json();
  };

  return { getDashboard, getStats };
}
