/**
 * Background HTTP Service - Capacitor HTTP für Android Background
 * Funktioniert auch bei gesperrtem Display und minimierter App
 */

import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface BackgroundHttpOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
}

class BackgroundHttpService {
  /**
   * Check if running on native platform
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Send HTTP request - uses Capacitor HTTP on native, fetch on web
   */
  async request<T = any>(options: BackgroundHttpOptions): Promise<T> {
    const isNative = this.isNative();
    
    if (isNative) {
      return this.nativeRequest<T>(options);
    } else {
      return this.webRequest<T>(options);
    }
  }

  /**
   * Native HTTP using Capacitor (works in background)
   */
  private async nativeRequest<T>(options: BackgroundHttpOptions): Promise<T> {
    const bgStatus = document.visibilityState === 'hidden' ? '[BG]' : '[FG]';
    
    try {
      console.log(`🚀 ${bgStatus} [CAPACITOR HTTP] ${options.method} ${options.url}`);
      
      const response: HttpResponse = await CapacitorHttp.request({
        url: options.url,
        method: options.method,
        headers: options.headers || {},
        data: options.data,
        readTimeout: 30000, // 30 seconds
        connectTimeout: 30000
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ ${bgStatus} Success: ${response.status}`);
        return response.data as T;
      } else {
        console.error(`❌ ${bgStatus} Error: ${response.status}`, response.data);
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      console.error(`❌ ${bgStatus} Request failed:`, error);
      throw error;
    }
  }

  /**
   * Web fallback using fetch (limited background support)
   */
  private async webRequest<T>(options: BackgroundHttpOptions): Promise<T> {
    const response = await fetch(options.url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.data ? JSON.stringify(options.data) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json() as T;
  }

  /**
   * Send GPS point to activity endpoint (Background-compatible)
   */
  async sendActivityPoint(
    activityId: string,
    token: string,
    point: {
      timestamp: string;
      latitude: number;
      longitude: number;
      elevationMeters?: number;
      speedKmh?: number;
      accuracyMeters?: number;
      heartRateBpm?: number;
      cadenceRpm?: number;
      powerWatts?: number;
    }
  ): Promise<void> {
    const bgStatus = document.visibilityState === 'hidden' ? '[BACKGROUND]' : '[FOREGROUND]';
    console.log(`📍 ${bgStatus} Sending activity point:`, {
      activityId,
      lat: point.latitude.toFixed(6),
      lon: point.longitude.toFixed(6)
    });

    await this.request({
      url: `${API_URL}/api/activities/${activityId}/points`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: point
    });
  }

  /**
   * Send live snapshot to live session (Background-compatible)
   */
  async sendLiveSnapshot(
    liveSessionId: string,
    token: string,
    snapshot: {
      latitude: number;
      longitude: number;
      gpsAccuracyMeters?: number;
      speedKmh?: number;
      distanceCompletedMeters?: number;
      distanceRemainingMeters?: number;
      routeProgressPercent?: number;
      heartRateBpm?: number;
      cadenceRpm?: number;
      powerWatts?: number;
    }
  ): Promise<void> {
    const bgStatus = document.visibilityState === 'hidden' ? '[BACKGROUND]' : '[FOREGROUND]';
    console.log(`📡 ${bgStatus} Sending live snapshot:`, {
      liveSessionId,
      lat: snapshot.latitude.toFixed(6),
      lon: snapshot.longitude.toFixed(6)
    });

    await this.request({
      url: `${API_URL}/api/live-sessions/${liveSessionId}/snapshots`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: snapshot
    });
  }
}

// Export singleton
export const backgroundHttpService = new BackgroundHttpService();
