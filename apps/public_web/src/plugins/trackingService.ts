import { registerPlugin } from '@capacitor/core';

/**
 * Vereinfachtes Foreground Tracking Plugin
 * Startet nativen Android Service direkt
 */
export interface ForegroundTrackingPlugin {
  startService(options: {
    activityId: string;
    authToken: string;
    apiUrl: string;
    liveSessionId?: string;
  }): Promise<void>;

  stopService(): Promise<void>;
  pauseService(): Promise<void>;
  resumeService(): Promise<void>;

  getServiceStatus(): Promise<{
    isRunning: boolean;
    isPaused: boolean;
    totalDistance: number;
    lastLocation?: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
    };
  }>;
}

const ForegroundTracking = registerPlugin<ForegroundTrackingPlugin>('ForegroundTracking');

export default ForegroundTracking;
