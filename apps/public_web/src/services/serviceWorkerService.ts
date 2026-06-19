// Service Worker Manager - Phase 3 & 4
// Handles registration, updates, and communication with Service Worker

export interface ServiceWorkerStatus {
  registered: boolean;
  installing: boolean;
  waiting: boolean;
  active: boolean;
  controller: boolean;
  updateAvailable: boolean;
}

type StatusCallback = (status: ServiceWorkerStatus) => void;

class ServiceWorkerService {
  private registration: ServiceWorkerRegistration | null = null;
  private statusCallbacks: Set<StatusCallback> = new Set();
  private status: ServiceWorkerStatus = {
    registered: false,
    installing: false,
    waiting: false,
    active: false,
    controller: false,
    updateAvailable: false
  };

  // ========================================
  // REGISTRATION
  // ========================================
  async register(): Promise<boolean> {
    // Check if Service Workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers not supported in this browser');
      return false;
    }

    try {
      console.log('📝 Registering Service Worker...');

      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered successfully');
      console.log('   Scope:', this.registration.scope);

      // Update status
      this.updateStatus({
        registered: true,
        installing: !!this.registration.installing,
        waiting: !!this.registration.waiting,
        active: !!this.registration.active,
        controller: !!navigator.serviceWorker.controller
      });

      // Setup event listeners
      this.setupEventListeners();

      // Check for updates
      this.checkForUpdates();

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  // Setup event listeners for SW lifecycle
  private setupEventListeners() {
    if (!this.registration) return;

    // Track installing worker
    if (this.registration.installing) {
      console.log('🔄 Service Worker installing...');
      this.trackInstalling(this.registration.installing);
    }

    // Track waiting worker
    if (this.registration.waiting) {
      console.log('⏳ Service Worker waiting...');
      this.updateStatus({ waiting: true, updateAvailable: true });
    }

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      console.log('🆕 Service Worker update found');
      const newWorker = this.registration!.installing;
      if (newWorker) {
        this.trackInstalling(newWorker);
      }
    });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      this.updateStatus({ controller: true });
      
      // Reload page to use new SW
      if (!this.registration?.waiting) {
        window.location.reload();
      }
    });

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW→Main] Message received:', event.data);
      this.handleMessage(event.data);
    });
  }

  // Track installing worker state
  private trackInstalling(worker: ServiceWorker) {
    this.updateStatus({ installing: true });

    worker.addEventListener('statechange', () => {
      console.log('🔄 Service Worker state changed:', worker.state);

      switch (worker.state) {
        case 'installed':
          this.updateStatus({
            installing: false,
            waiting: true,
            updateAvailable: !!navigator.serviceWorker.controller
          });

          if (navigator.serviceWorker.controller) {
            console.log('🆕 New Service Worker installed - update available');
          } else {
            console.log('✅ Service Worker installed for first time');
          }
          break;

        case 'activated':
          this.updateStatus({
            waiting: false,
            active: true,
            updateAvailable: false
          });
          console.log('✅ Service Worker activated');
          break;

        case 'redundant':
          this.updateStatus({
            installing: false,
            waiting: false
          });
          console.log('❌ Service Worker became redundant');
          break;
      }
    });
  }

  // ========================================
  // PHASE 3: BACKGROUND SYNC
  // ========================================
  
  // Register background sync (called when GPS points are queued)
  async registerBackgroundSync(tag: string = 'sync-gps-points'): Promise<boolean> {
    if (!this.registration) {
      console.warn('⚠️ Service Worker not registered');
      return false;
    }

    // Check if Background Sync is supported
    if (!('sync' in this.registration)) {
      console.warn('⚠️ Background Sync not supported in this browser');
      return false;
    }

    try {
      // Type assertion needed as sync is not fully typed
      await (this.registration.sync as any).register(tag);
      console.log('✅ Background sync registered:', tag);
      return true;
    } catch (error) {
      console.error('❌ Background sync registration failed:', error);
      return false;
    }
  }

  // Register periodic background sync (if supported)
  async registerPeriodicSync(tag: string = 'periodic-gps-sync', minInterval: number = 60000): Promise<boolean> {
    if (!this.registration) {
      console.warn('⚠️ Service Worker not registered');
      return false;
    }

    // Check if Periodic Background Sync is supported
    if (!('periodicSync' in this.registration)) {
      console.warn('⚠️ Periodic Background Sync not supported in this browser');
      console.log('   Supported in: Chrome/Edge 80+ with flag enabled');
      return false;
    }

    try {
      // Experimental API - requires double type assertion via unknown
      const permissionQuery = {
        name: 'periodic-background-sync'
      } as unknown as PermissionDescriptor;

      const status = await navigator.permissions.query(permissionQuery);

      if (status.state === 'granted') {
        // @ts-ignore
        await this.registration.periodicSync.register(tag, {
          minInterval
        });
        console.log('✅ Periodic background sync registered:', tag);
        console.log('   Min interval:', minInterval, 'ms');
        return true;
      } else {
        console.warn('⚠️ Periodic background sync permission not granted');
        return false;
      }
    } catch (error) {
      console.error('❌ Periodic background sync registration failed:', error);
      return false;
    }
  }

  // Manually trigger sync (useful for testing)
  async triggerSync(): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      console.warn('⚠️ No active Service Worker controller');
      return;
    }

    console.log('🔄 Manually triggering sync...');
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_NOW'
    });
  }

  // ========================================
  // PHASE 4: NOTIFICATIONS
  // ========================================
  
  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('⚠️ Notification permission denied by user');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.warn('⚠️ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  // Show notification via Service Worker
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.registration) {
      console.warn('⚠️ Service Worker not registered');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      return;
    }

    try {
      await this.registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      });
      console.log('✅ Notification shown:', title);
    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  }

  // Show tracking notification (persistent during tracking)
  async showTrackingNotification(stats: {
    points: number;
    distance: number;
    duration: number;
  }): Promise<void> {
    const hours = Math.floor(stats.duration / 3600);
    const minutes = Math.floor((stats.duration % 3600) / 60);
    const distanceKm = (stats.distance / 1000).toFixed(2);

    await this.showNotification('VeloPulse Tracking Active', {
      body: `${distanceKm} km • ${hours}h ${minutes}m • ${stats.points} GPS points`,
      tag: 'tracking-active',
      requireInteraction: false,
      silent: true
    });
  }

  // Show GPS warning notification
  async showGPSWarning(message: string): Promise<void> {
    await this.showNotification('⚠️ GPS Warning', {
      body: message,
      tag: 'gps-warning',
      requireInteraction: true,
      silent: false
    });
  }

  // ========================================
  // UPDATE MANAGEMENT
  // ========================================
  
  // Check for Service Worker updates
  async checkForUpdates(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      console.log('✅ Checked for Service Worker updates');
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
    }
  }

  // Apply waiting Service Worker update
  async applyUpdate(): Promise<void> {
    if (!this.registration?.waiting) {
      console.warn('⚠️ No waiting Service Worker to activate');
      return;
    }

    console.log('🔄 Applying Service Worker update...');
    
    this.registration.waiting.postMessage({
      type: 'SKIP_WAITING'
    });

    // Wait for controller change, then reload
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve();
      }, { once: true });
    });

    console.log('✅ Service Worker updated, reloading page...');
    window.location.reload();
  }

  // ========================================
  // STATUS MANAGEMENT
  // ========================================
  
  // Subscribe to status updates
  subscribe(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  // Update status and notify subscribers
  private updateStatus(updates: Partial<ServiceWorkerStatus>) {
    this.status = {
      ...this.status,
      ...updates
    };

    this.statusCallbacks.forEach(callback => {
      callback(this.status);
    });
  }

  // Get current status
  getStatus(): ServiceWorkerStatus {
    return { ...this.status };
  }

  // Handle messages from Service Worker
  private handleMessage(data: any) {
    // Handle different message types
    switch (data.type) {
      case 'SYNC_COMPLETE':
        console.log('✅ Background sync completed');
        break;
      case 'SYNC_ERROR':
        console.error('❌ Background sync error:', data.error);
        break;
      default:
        console.log('📨 Unknown message type:', data.type);
    }
  }

  // ========================================
  // UNREGISTER (for cleanup)
  // ========================================
  
  async unregister(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.unregister();
      this.registration = null;
      this.updateStatus({
        registered: false,
        installing: false,
        waiting: false,
        active: false,
        controller: false,
        updateAvailable: false
      });
      console.log('✅ Service Worker unregistered');
    } catch (error) {
      console.error('❌ Error unregistering Service Worker:', error);
    }
  }
}

// Export singleton instance
export const serviceWorkerService = new ServiceWorkerService();
