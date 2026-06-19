/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SIGNALR_HUB_URL: string;
  readonly VITE_TILE_URL: string;
  readonly VITE_TILE_ATTRIBUTION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ========================================
// PHASE 1: Wake Lock API Type Definitions
// ========================================
interface WakeLockSentinel extends EventTarget {
  readonly type: 'screen';
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: (this: WakeLockSentinel, ev: Event) => any, options?: boolean | AddEventListenerOptions): void;
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface Navigator {
  readonly wakeLock?: WakeLock;
}

// ========================================
// PHASE 3 & 4: Service Worker & Notifications Type Definitions
// ========================================

// Background Sync API
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
  readonly periodicSync?: PeriodicSyncManager;
}

// Periodic Background Sync (experimental)
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  getTags(): Promise<string[]>;
  unregister(tag: string): Promise<void>;
}

// Notification Actions (not in all browsers)
interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationOptions {
  actions?: NotificationAction[];
  badge?: string;
  body?: string;
  data?: any;
  dir?: 'auto' | 'ltr' | 'rtl';
  icon?: string;
  image?: string;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  vibrate?: number | number[];
}


