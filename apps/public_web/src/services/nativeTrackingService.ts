/**
 * Vereinfachter Native Foreground Tracking Service
 * Direkter Zugriff auf Android Foreground Service
 */

import { Capacitor } from '@capacitor/core';
import ForegroundTracking from '../plugins/trackingService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class NativeTrackingService {
  private isAndroid: boolean;

  constructor() {
    this.isAndroid = Capacitor.getPlatform() === 'android';

    if (this.isAndroid) {
      console.log('✅ Native Foreground Service available (Android)');
    } else {
      console.log('ℹ️ Running in browser - native service not available');
    }
  }

  isAvailable(): boolean {
    return this.isAndroid;
  }

  async startTracking(options: {
    activityId: string;
    authToken: string;
    liveSessionId?: string;
  }): Promise<boolean> {
    if (!this.isAndroid) {
      console.warn('⚠️ Native tracking only available on Android');
      return false;
    }

    try {
      await ForegroundTracking.startService({
        activityId: options.activityId,
        authToken: options.authToken,
        apiUrl: API_URL,
        liveSessionId: options.liveSessionId
      });

      console.log('✅ Foreground Service started');
      console.log('   GPS tracking active (works with locked display)');
      console.log('   Permanent notification visible');

      return true;
    } catch (error) {
      console.error('❌ Failed to start foreground service:', error);
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isAndroid) return;

    try {
      await ForegroundTracking.stopService();
      console.log('✅ Foreground Service stopped');
    } catch (error) {
      console.error('❌ Failed to stop service:', error);
      throw error;
    }
  }

  async pauseTracking(): Promise<void> {
    if (!this.isAndroid) return;

    try {
      await ForegroundTracking.pauseService();
      console.log('⏸️ Tracking paused');
    } catch (error) {
      console.error('❌ Failed to pause:', error);
      throw error;
    }
  }

  async resumeTracking(): Promise<void> {
    if (!this.isAndroid) return;

    try {
      await ForegroundTracking.resumeService();
      console.log('▶️ Tracking resumed');
    } catch (error) {
      console.error('❌ Failed to resume:', error);
      throw error;
    }
  }

  async getStatus() {
    if (!this.isAndroid) {
      return { isRunning: false, isPaused: false, totalDistance: 0 };
    }

    try {
      return await ForegroundTracking.getServiceStatus();
    } catch (error) {
      console.error('❌ Failed to get status:', error);
      return { isRunning: false, isPaused: false, totalDistance: 0 };
    }
  }
}

export const nativeTrackingService = new NativeTrackingService();
