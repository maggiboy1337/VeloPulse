import { registerPlugin } from '@capacitor/core';

/**
 * TypeScript Interface für TrackingService Plugin
 * 
 * Dieses Plugin ermöglicht die Steuerung des nativen Android Foreground Service
 * für zuverlässiges GPS-Tracking im Hintergrund
 */

export interface TrackingServicePlugin {
  /**
   * Startet den nativen Tracking Service
   * 
   * @param options Konfiguration für das Tracking
   * @returns Promise das resolved wenn Service gestartet wurde
   */
  startTracking(options: {
    activityId: string;
    authToken: string;
    apiUrl: string;
    liveSessionId?: string;
    updateIntervalMs?: number; // Standard: 5000 (5 Sekunden)
    distanceFilterMeters?: number; // Standard: 5 Meter
  }): Promise<void>;

  /**
   * Stoppt den Tracking Service
   * 
   * @returns Promise das resolved wenn Service gestoppt wurde
   */
  stopTracking(): Promise<void>;

  /**
   * Pausiert das Tracking (GPS läuft weiter, aber keine Uploads)
   * 
   * @returns Promise das resolved wenn Tracking pausiert wurde
   */
  pauseTracking(): Promise<void>;

  /**
   * Setzt das Tracking fort
   * 
   * @returns Promise das resolved wenn Tracking fortgesetzt wurde
   */
  resumeTracking(): Promise<void>;

  /**
   * Gibt den aktuellen Status des Services zurück
   * 
   * @returns Promise mit Status-Informationen
   */
  getStatus(): Promise<TrackingStatus>;

  /**
   * Prüft ob erforderliche Berechtigungen vorhanden sind
   * 
   * @returns Promise mit Permission-Status
   */
  checkTrackingPermissions(): Promise<PermissionStatus>;

  /**
   * Fordert erforderliche Berechtigungen an
   * 
   * @returns Promise mit Permission-Status nach Request
   */
  requestTrackingPermissions(): Promise<PermissionStatus>;
}

/**
 * Status des Tracking Service
 */
export interface TrackingStatus {
  /** Läuft der Service? */
  isRunning: boolean;
  /** Ist das Tracking pausiert? */
  isPaused: boolean;
  /** Zurückgelegte Distanz in Metern */
  totalDistance: number;
  /** Letzte GPS-Position (null wenn noch keine Position) */
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    speed?: number; // km/h
    timestamp: number; // Unix timestamp in ms
  };
}

/**
 * Permission Status
 */
export interface PermissionStatus {
  /** Standort-Berechtigung erteilt? */
  location: boolean;
  /** Hintergrund-Standort-Berechtigung erteilt? (Android 10+) */
  backgroundLocation: boolean;
  /** Alle erforderlichen Berechtigungen erteilt? */
  allGranted: boolean;
}

// Plugin über Capacitor.Plugins aufrufen (für lokale Plugins)
import { Capacitor } from '@capacitor/core';

const TrackingService = Capacitor.Plugins.TrackingServicePlugin as TrackingServicePlugin;

export default TrackingService;
