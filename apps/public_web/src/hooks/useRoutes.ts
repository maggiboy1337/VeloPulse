import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Route {
  id: string;
  name: string;
  description?: string;
  totalDistanceMeters: number;
  minElevationMeters?: number;
  maxElevationMeters?: number;
  totalAscentMeters?: number;
  totalDescentMeters?: number;
  createdAt: string;
}

export interface RouteDetail extends Route {
  points: Array<{
    sequenceNumber: number;
    latitude: number;
    longitude: number;
    elevationMeters?: number;
    distanceFromStartMeters: number;
  }>;
}

export function useRoutes() {
  const { token } = useAuth();

  const getRoutes = async (): Promise<Route[]> => {
    const response = await fetch(`${API_URL}/api/routes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Laden der Routen');
    return response.json();
  };

  const getRoute = async (id: string): Promise<RouteDetail> => {
    const response = await fetch(`${API_URL}/api/routes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Laden der Route');
    return response.json();
  };

  const importGpx = async (file: File): Promise<Route> => {
    console.log(`Sending GPX file: ${file.name}, size: ${file.size} bytes`);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/routes/import-gpx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - browser will set it automatically with boundary
      },
      body: formData
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorMessage = 'Fehler beim Importieren';

      // Handle authentication errors
      if (response.status === 401) {
        errorMessage = 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.';
      } else {
        try {
          // Read as text first, then try to parse as JSON
          const responseText = await response.text();
          console.error('Server error response:', responseText);
          try {
            const error = JSON.parse(responseText);
            errorMessage = error.message || errorMessage;
            if (error.error) {
              errorMessage += `: ${error.error}`;
            }
          } catch {
            // If not valid JSON, check if it's a system error
            if (responseText.includes('System.ArgumentException') || responseText.includes('System.')) {
              errorMessage = 'GPX-Datei konnte nicht verarbeitet werden. Bitte überprüfen Sie das Format.';
            } else if (responseText.length > 0 && responseText.length < 200) {
              errorMessage = responseText;
            } else {
              errorMessage = `Server-Fehler: ${response.status}`;
            }
          }
        } catch (err) {
          console.error('Error reading response:', err);
          errorMessage = `Server-Fehler: ${response.status}`;
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  };

  const deleteRoute = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/routes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Fehler beim Löschen');
  };

  return { getRoutes, getRoute, importGpx, deleteRoute };
}
