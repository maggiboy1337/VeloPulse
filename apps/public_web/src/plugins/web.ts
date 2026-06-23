import { WebPlugin } from '@capacitor/core';
import type { 
  TrackingServicePlugin, 
  TrackingStatus, 
  PermissionStatus 
} from './trackingService';

/**
 * Web-Fallback für TrackingService Plugin
 * 
 * Wird verwendet wenn die App im Browser läuft (nicht auf Android)
 * Bietet eingeschränkte Funktionalität für Entwicklung/Tests
 */
export class TrackingServiceWeb extends WebPlugin implements TrackingServicePlugin {
  
  constructor() {
    super();
    console.log('🌐 TrackingService Web Fallback loaded (limited functionality)');
  }

  async startTracking(): Promise<void> {
    console.warn('⚠️ TrackingService.startTracking() not available in web browser');
    console.warn('   Native GPS tracking only works on Android devices');
    throw new Error('Native tracking not available in browser. Use capacitorGpsService fallback.');
  }

  async stopTracking(): Promise<void> {
    console.warn('⚠️ TrackingService.stopTracking() not available in web browser');
  }

  async pauseTracking(): Promise<void> {
    console.warn('⚠️ TrackingService.pauseTracking() not available in web browser');
  }

  async resumeTracking(): Promise<void> {
    console.warn('⚠️ TrackingService.resumeTracking() not available in web browser');
  }

  async getStatus(): Promise<TrackingStatus> {
    return {
      isRunning: false,
      isPaused: false,
      totalDistance: 0
    };
  }

  async checkTrackingPermissions(): Promise<PermissionStatus> {
    // Im Browser keine nativen Permissions
    return {
      location: false,
      backgroundLocation: false,
      allGranted: false
    };
  }

  async requestTrackingPermissions(): Promise<PermissionStatus> {
    console.warn('⚠️ TrackingService.requestTrackingPermissions() not available in web browser');
    console.warn('   Use browser geolocation API instead');

    return {
      location: false,
      backgroundLocation: false,
      allGranted: false
    };
  }
}
