/**
 * Native Tracking Service Wrapper
 * 
 * High-level Service für die Integration des nativen Android Foreground Service
 * in die React-Anwendung
 * 
 * Features:
 * - Automatische Plattform-Erkennung (Android vs. Browser)
 * - Vereinfachte API für GPS-Tracking
 * - Status-Updates per Event-Listener
 * - Automatisches Fallback auf Browser-GPS wenn nicht auf Android
 */

import { Capacitor } from '@capacitor/core';
import TrackingService, { 
  TrackingStatus, 
  PermissionStatus 
} from '../plugins/trackingService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type StatusCallback = (status: TrackingStatus) => void;

class NativeTrackingService {
  private statusCallbacks = new Set<StatusCallback>();
  private statusCheckInterval: number | null = null;
  private isAndroid: boolean;

  constructor() {
    this.isAndroid = Capacitor.getPlatform() === 'android';
    
    if (this.isAndroid) {
      console.log('✅ Native Tracking Service available (Android)');
    } else {
      console.log('ℹ️ Native Tracking Service not available (running in browser)');
      console.log('   Will use browser GPS fallback');
    }
  }

  /**
   * Prüft ob nativer Service verfügbar ist (nur auf Android)
   */
  isAvailable(): boolean {
    return this.isAndroid;
  }

  /**
   * Prüft Berechtigungen
   */
  async checkPermissions(): Promise<PermissionStatus> {
    if (!this.isAndroid) {
      return {
        location: false,
        backgroundLocation: false,
        allGranted: false
      };
    }

    try {
      return await TrackingService.checkTrackingPermissions();
    } catch (error) {
      console.error('❌ Failed to check permissions:', error);
      throw error;
    }
  }

  /**
   * Fordert Berechtigungen an
   */
  async requestPermissions(): Promise<PermissionStatus> {
    if (!this.isAndroid) {
      console.warn('Permission request only available on Android');
      return {
        location: false,
        backgroundLocation: false,
        allGranted: false
      };
    }

    try {
      console.log('📋 Requesting tracking permissions...');
      const result = await TrackingService.requestTrackingPermissions();
      
      if (result.allGranted) {
        console.log('✅ All permissions granted');
      } else {
        console.warn('⚠️ Not all permissions granted:', result);
        
        if (!result.location) {
          console.error('❌ Location permission denied');
        }
        if (!result.backgroundLocation) {
          console.warn('⚠️ Background location permission denied');
          console.warn('   Tracking may not work reliably with locked screen');
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
      throw error;
    }
  }

  /**
   * Startet das GPS-Tracking
   */
  async startTracking(options: {
    activityId: string;
    authToken: string;
    liveSessionId?: string;
    updateIntervalMs?: number;
    distanceFilterMeters?: number;
  }): Promise<boolean> {
    if (!this.isAndroid) {
      console.warn('⚠️ Native tracking not available - use browser GPS fallback');
      return false;
    }

    try {
      // Check permissions first
      const permissions = await this.checkPermissions();
      
      if (!permissions.allGranted) {
        console.warn('⚠️ Permissions not granted, requesting...');
        const newPermissions = await this.requestPermissions();
        
        if (!newPermissions.allGranted) {
          console.error('❌ Cannot start tracking without permissions');
          return false;
        }
      }

      // Start native service
      await TrackingService.startTracking({
        activityId: options.activityId,
        authToken: options.authToken,
        apiUrl: API_URL,
        liveSessionId: options.liveSessionId,
        updateIntervalMs: options.updateIntervalMs || 5000,
        distanceFilterMeters: options.distanceFilterMeters || 5
      });

      console.log('✅ Native tracking service started');
      console.log('   Activity ID:', options.activityId);
      console.log('   Update interval:', options.updateIntervalMs || 5000, 'ms');
      console.log('   Distance filter:', options.distanceFilterMeters || 5, 'm');

      // Start status polling
      this.startStatusPolling();

      return true;
    } catch (error) {
      console.error('❌ Failed to start tracking:', error);
      throw error;
    }
  }

  /**
   * Stoppt das GPS-Tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isAndroid) {
      return;
    }

    try {
      await TrackingService.stopTracking();
      console.log('✅ Native tracking service stopped');

      // Stop status polling
      this.stopStatusPolling();
    } catch (error) {
      console.error('❌ Failed to stop tracking:', error);
      throw error;
    }
  }

  /**
   * Pausiert das Tracking
   */
  async pauseTracking(): Promise<void> {
    if (!this.isAndroid) {
      return;
    }

    try {
      await TrackingService.pauseTracking();
      console.log('⏸️ Tracking paused');
    } catch (error) {
      console.error('❌ Failed to pause tracking:', error);
      throw error;
    }
  }

  /**
   * Setzt das Tracking fort
   */
  async resumeTracking(): Promise<void> {
    if (!this.isAndroid) {
      return;
    }

    try {
      await TrackingService.resumeTracking();
      console.log('▶️ Tracking resumed');
    } catch (error) {
      console.error('❌ Failed to resume tracking:', error);
      throw error;
    }
  }

  /**
   * Gibt aktuellen Status zurück
   */
  async getStatus(): Promise<TrackingStatus> {
    if (!this.isAndroid) {
      return {
        isRunning: false,
        isPaused: false,
        totalDistance: 0
      };
    }

    try {
      return await TrackingService.getStatus();
    } catch (error) {
      console.error('❌ Failed to get status:', error);
      throw error;
    }
  }

  /**
   * Abonniert Status-Updates
   */
  subscribe(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Startet Status-Polling (prüft Status alle 2 Sekunden)
   */
  private startStatusPolling(): void {
    if (this.statusCheckInterval !== null) {
      return; // Already polling
    }

    this.statusCheckInterval = window.setInterval(async () => {
      try {
        const status = await this.getStatus();
        
        // Notify all subscribers
        this.statusCallbacks.forEach(callback => {
          callback(status);
        });
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 2000); // Every 2 seconds

    console.log('📊 Status polling started');
  }

  /**
   * Stoppt Status-Polling
   */
  private stopStatusPolling(): void {
    if (this.statusCheckInterval !== null) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
      console.log('📊 Status polling stopped');
    }
  }
}

// Export singleton instance
export const nativeTrackingService = new NativeTrackingService();
