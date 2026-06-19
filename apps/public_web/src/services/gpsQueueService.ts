// GPS Queue Service for managing offline GPS point synchronization
import { indexedDBService, StoredGPSPoint } from './indexedDBService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface SyncStatus {
  isSyncing: boolean;
  unsyncedCount: number;
  failedCount: number;
  lastSyncAttempt: Date | null;
  lastSuccessfulSync: Date | null;
}

type SyncStatusCallback = (status: SyncStatus) => void;

class GPSQueueService {
  private syncStatusCallbacks: Set<SyncStatusCallback> = new Set();
  private syncStatus: SyncStatus = {
    isSyncing: false,
    unsyncedCount: 0,
    failedCount: 0,
    lastSyncAttempt: null,
    lastSuccessfulSync: null
  };
  private syncInterval: number | null = null;
  private currentActivityId: string | null = null;
  private token: string | null = null;
  private isStarted: boolean = false;
  private failureCount: number = 0;
  private maxFailures: number = 5;

  // Start queue service for an activity
  start(activityId: string, token: string) {
    // Prevent multiple starts for the same activity
    if (this.isStarted && this.currentActivityId === activityId) {
      console.log('GPS Queue Service already running for activity:', activityId);
      return;
    }

    // Stop any existing service first
    if (this.isStarted) {
      console.log('Stopping existing GPS Queue Service before starting new one');
      this.stop();
    }

    this.currentActivityId = activityId;
    this.token = token;
    this.isStarted = true;
    this.failureCount = 0; // Reset failure count on start

    // Initial sync attempt
    this.syncNow();

    // Setup periodic sync every 60 seconds (reduced from 30s to prevent overload)
    this.syncInterval = window.setInterval(() => {
      this.syncNow();
    }, 60000); // 60 seconds

    console.log('GPS Queue Service started for activity:', activityId);
  }

  // Stop queue service
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.currentActivityId = null;
    this.token = null;
    this.isStarted = false;
    console.log('GPS Queue Service stopped');
  }

  // Add GPS point to queue (stores in IndexedDB)
  async enqueue(
    activityId: string,
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
    try {
      await indexedDBService.addGPSPoint({
        activityId,
        ...point
      });

      // Update unsynced count
      const count = await indexedDBService.getUnsyncedCount(activityId);
      this.updateSyncStatus({ unsyncedCount: count });

      console.log('GPS point queued for offline sync');
    } catch (error) {
      console.error('Failed to queue GPS point:', error);
      throw error;
    }
  }

  // Sync queued points to backend
  async syncNow(): Promise<boolean> {
    if (!this.currentActivityId || !this.token) {
      console.warn('Cannot sync: No active activity or token');
      return false;
    }

    if (this.syncStatus.isSyncing) {
      console.log('Sync already in progress, skipping');
      return false;
    }

    // Circuit breaker: stop syncing after too many failures
    if (this.failureCount >= this.maxFailures) {
      console.error(`❌ GPS Queue Service stopped: ${this.failureCount} consecutive failures`);
      console.error('   Please check network connection and backend status');
      this.stop();
      return false;
    }

    // Store activityId locally to prevent issues if service is stopped during sync
    const activityId = this.currentActivityId;

    this.updateSyncStatus({
      isSyncing: true,
      lastSyncAttempt: new Date()
    });

    try {
      const unsyncedPoints = await indexedDBService.getUnsyncedPoints(activityId);

      if (unsyncedPoints.length === 0) {
        console.log('No unsynced points to upload');
        this.failureCount = 0; // Reset on success
        this.updateSyncStatus({
          isSyncing: false,
          unsyncedCount: 0,
          lastSuccessfulSync: new Date()
        });
        return true;
      }

      console.log(`Syncing ${unsyncedPoints.length} GPS points...`);

      let successCount = 0;
      let failureCount = 0;

      // Upload points in batches of 10 to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < unsyncedPoints.length; i += batchSize) {
        const batch = unsyncedPoints.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(point => this.uploadPoint(point))
        );

        results.forEach((result, index) => {
          const point = batch[index];
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            failureCount++;
            console.error(`Failed to upload point ${point.id}:`, result.reason);
          }
        });

        // Small delay between batches
        if (i + batchSize < unsyncedPoints.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 100ms to 500ms
        }
      }

      console.log(`Sync completed: ${successCount} successful, ${failureCount} failed`);

      const remainingCount = await indexedDBService.getUnsyncedCount(activityId);

      // Update failure counter
      if (failureCount > 0 && successCount === 0) {
        this.failureCount++;
      } else {
        this.failureCount = 0; // Reset on any success
      }

      this.updateSyncStatus({
        isSyncing: false,
        unsyncedCount: remainingCount,
        failedCount: failureCount,
        lastSuccessfulSync: successCount > 0 ? new Date() : this.syncStatus.lastSuccessfulSync
      });

      // Cleanup old synced points (older than 7 days)
      await indexedDBService.cleanupSyncedPoints(7);

      return failureCount === 0;
    } catch (error) {
      console.error('Sync error:', error);
      this.failureCount++;
      this.updateSyncStatus({
        isSyncing: false
      });
      return false;
    }
  }

  // Upload single point to backend
  private async uploadPoint(point: StoredGPSPoint): Promise<void> {
    if (!this.token) {
      throw new Error('No authentication token');
    }

    try {
      const response = await fetch(`${API_URL}/api/activities/${point.activityId}/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          timestamp: point.timestamp,
          latitude: point.latitude,
          longitude: point.longitude,
          elevationMeters: point.elevationMeters,
          speedKmh: point.speedKmh,
          accuracyMeters: point.accuracyMeters,
          heartRateBpm: point.heartRateBpm,
          cadenceRpm: point.cadenceRpm,
          powerWatts: point.powerWatts
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - token expired');
        }
        throw new Error(`Upload failed with status ${response.status}`);
      }

      // Mark as synced
      if (point.id) {
        await indexedDBService.markAsSynced(point.id);
      }
    } catch (error) {
      // Increment attempts counter
      if (point.id) {
        await indexedDBService.incrementAttempts(point.id);
      }

      // Give up after 5 attempts
      if (point.attempts >= 5) {
        console.warn(`Point ${point.id} failed 5 times, marking as synced to skip`);
        if (point.id) {
          await indexedDBService.markAsSynced(point.id);
        }
      }

      throw error;
    }
  }

  // Subscribe to sync status updates
  subscribe(callback: SyncStatusCallback): () => void {
    this.syncStatusCallbacks.add(callback);

    // Send initial status
    callback(this.syncStatus);

    // Return unsubscribe function
    return () => {
      this.syncStatusCallbacks.delete(callback);
    };
  }

  // Update sync status and notify subscribers
  private updateSyncStatus(updates: Partial<SyncStatus>) {
    this.syncStatus = {
      ...this.syncStatus,
      ...updates
    };

    // Notify all subscribers
    this.syncStatusCallbacks.forEach(callback => {
      callback(this.syncStatus);
    });
  }

  // Get current sync status
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Get unsynced count for activity
  async getUnsyncedCount(activityId: string): Promise<number> {
    return await indexedDBService.getUnsyncedCount(activityId);
  }

  // Clear all unsynced points for an activity (e.g., on cancel)
  async clearQueue(activityId: string): Promise<void> {
    await indexedDBService.deleteUnsyncedPoints(activityId);
    this.updateSyncStatus({ unsyncedCount: 0 });
    console.log('Queue cleared for activity:', activityId);
  }
}

// Export singleton instance
export const gpsQueueService = new GPSQueueService();
