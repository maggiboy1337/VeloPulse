/**
 * Capacitor GPS Service
 * Native GPS tracking with background support
 * Works even when display is locked or app is in background
 */

import { BackgroundGeolocationPlugin, Location } from '@capacitor-community/background-geolocation';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export type GPSCallback = (position: GPSPosition) => void;
export type GPSErrorCallback = (error: { code: number; message: string }) => void;

class CapacitorGPSService {
  private watcherId: string | null = null;
  private isTracking = false;
  private callback: GPSCallback | null = null;
  private errorCallback: GPSErrorCallback | null = null;

  /**
   * Check if running in native environment (iOS/Android)
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isNativePlatform()) {
      console.warn('⚠️ Not running on native platform - permissions not needed');
      return true;
    }

    // Permissions are requested automatically by addWatcher
    console.log('📍 Permissions will be requested automatically by the plugin');
    return true;
  }

  /**
   * Start GPS tracking
   * @param callback Called when new GPS position is received
   * @param errorCallback Called when GPS error occurs
   * @param options Tracking configuration
   */
  async startTracking(
    callback: GPSCallback,
    errorCallback?: GPSErrorCallback,
    options?: {
      distanceFilter?: number;
      backgroundMessage?: string;
      backgroundTitle?: string;
    }
  ): Promise<boolean> {
    if (!this.isNativePlatform()) {
      const errorMsg = 'GPS tracking requires native platform (Android/iOS)';
      console.error('❌', errorMsg);
      if (errorCallback) {
        errorCallback({ code: 1, message: errorMsg });
      }
      return false;
    }

    if (this.isTracking) {
      console.warn('⚠️ GPS tracking already started');
      return true;
    }

    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        const errorMsg = 'Location permission denied';
        console.error('❌', errorMsg);
        if (errorCallback) {
          errorCallback({ code: 2, message: errorMsg });
        }
        return false;
      }

      // Store callbacks
      this.callback = callback;
      this.errorCallback = errorCallback || null;

      // Configure background tracking
      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: options?.backgroundMessage || 'VeloPulse is tracking your activity',
          backgroundTitle: options?.backgroundTitle || 'Live Tracking Active',
          requestPermissions: true,
          stale: false,
          distanceFilter: options?.distanceFilter || 10, // Update every 10 meters
        },
        (position?: Location, error?: any) => {
          if (error) {
            console.error('❌ GPS Error:', error);
            if (this.errorCallback) {
              this.errorCallback({
                code: error.code || 3,
                message: error.message || 'Unknown GPS error',
              });
            }
            return;
          }

          if (!position) {
            console.warn('⚠️ GPS position is null/undefined');
            return;
          }

          // Convert to standard GPSPosition format
          const gpsPosition: GPSPosition = {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            altitude: position.altitude || null,
            speed: position.speed || null,
            heading: position.bearing || null,
            timestamp: position.time || Date.now(),
          };

          console.log('📍 Native GPS Update:', {
            lat: gpsPosition.latitude.toFixed(6),
            lon: gpsPosition.longitude.toFixed(6),
            accuracy: gpsPosition.accuracy.toFixed(2) + 'm',
            speed: gpsPosition.speed ? gpsPosition.speed.toFixed(2) + ' m/s' : 'N/A',
          });

          // Call the callback
          if (this.callback) {
            this.callback(gpsPosition);
          }
        }
      );

      this.watcherId = watcherId;
      this.isTracking = true;

      console.log('✅ Native GPS tracking started (Watcher ID:', watcherId, ')');
      console.log('🔋 Background tracking enabled - works with locked display!');

      return true;
    } catch (error: any) {
      console.error('❌ Failed to start GPS tracking:', error);
      if (this.errorCallback) {
        this.errorCallback({
          code: 4,
          message: error.message || 'Failed to start GPS tracking',
        });
      }
      return false;
    }
  }

  /**
   * Stop GPS tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isNativePlatform()) {
      console.warn('⚠️ Not on native platform - nothing to stop');
      return;
    }

    if (!this.isTracking || !this.watcherId) {
      console.warn('⚠️ GPS tracking not active');
      return;
    }

    try {
      await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      
      this.watcherId = null;
      this.isTracking = false;
      this.callback = null;
      this.errorCallback = null;

      console.log('✅ Native GPS tracking stopped');
    } catch (error) {
      console.error('❌ Failed to stop GPS tracking:', error);
    }
  }

  /**
   * Get current tracking status
   */
  getStatus(): { isTracking: boolean; watcherId: string | null } {
    return {
      isTracking: this.isTracking,
      watcherId: this.watcherId,
    };
  }

  /**
   * Open app settings (for permission configuration)
   */
  async openSettings(): Promise<void> {
    if (!this.isNativePlatform()) {
      console.warn('⚠️ Not on native platform - cannot open settings');
      return;
    }

    try {
      await BackgroundGeolocation.openSettings();
      console.log('✅ Opened app settings');
    } catch (error) {
      console.error('❌ Failed to open settings:', error);
    }
  }
}

// Export singleton instance
export const capacitorGpsService = new CapacitorGPSService();
