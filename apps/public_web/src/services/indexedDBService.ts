// IndexedDB Service for offline GPS point storage
const DB_NAME = 'VeloPulseDB';
const DB_VERSION = 1;
const STORE_NAME = 'gpsPoints';

export interface StoredGPSPoint {
  id?: number; // Auto-increment ID from IndexedDB
  activityId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  speedKmh?: number;
  accuracyMeters?: number;
  heartRateBpm?: number;
  cadenceRpm?: number;
  powerWatts?: number;
  synced: boolean; // false = needs upload
  attempts: number; // retry counter
  createdAt: number; // local timestamp for ordering
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // Initialize database
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB initialization error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Create indexes
          objectStore.createIndex('activityId', 'activityId', { unique: false });
          objectStore.createIndex('synced', 'synced', { unique: false });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          objectStore.createIndex('activityIdAndSynced', ['activityId', 'synced'], { unique: false });

          console.log('IndexedDB object store created');
        }
      };
    });

    return this.initPromise;
  }

  // Add GPS point to local storage
  async addGPSPoint(point: Omit<StoredGPSPoint, 'id' | 'synced' | 'attempts' | 'createdAt'>): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const pointWithMetadata: Omit<StoredGPSPoint, 'id'> = {
        ...point,
        synced: false,
        attempts: 0,
        createdAt: Date.now()
      };

      const request = store.add(pointWithMetadata);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        console.error('Error adding GPS point to IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  // Get all unsynced points for an activity
  async getUnsyncedPoints(activityId: string): Promise<StoredGPSPoint[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      // Validate activityId
      if (!activityId || typeof activityId !== 'string') {
        console.warn('Invalid activityId provided to getUnsyncedPoints:', activityId);
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('activityIdAndSynced');

      try {
        const request = index.getAll(IDBKeyRange.only([activityId, false]));

        request.onsuccess = () => {
          const points = request.result as StoredGPSPoint[];
          // Sort by createdAt to maintain order
          points.sort((a, b) => a.createdAt - b.createdAt);
          resolve(points);
        };

        request.onerror = () => {
          console.error('Error getting unsynced points:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Error creating IDBKeyRange:', error);
        reject(error);
      }
    });
  }

  // Mark point as synced
  async markAsSynced(id: number): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const point = getRequest.result as StoredGPSPoint;
        if (point) {
          point.synced = true;
          const updateRequest = store.put(point);

          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(); // Point doesn't exist, nothing to do
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Increment retry attempts
  async incrementAttempts(id: number): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const point = getRequest.result as StoredGPSPoint;
        if (point) {
          point.attempts += 1;
          const updateRequest = store.put(point);

          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Delete synced points older than X days (cleanup)
  async cleanupSyncedPoints(daysOld: number = 7): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');

      const request = index.openCursor(IDBKeyRange.only(true));
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const point = cursor.value as StoredGPSPoint;
          if (point.createdAt < cutoffTime) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedCount} old synced GPS points`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get count of unsynced points for an activity
  async getUnsyncedCount(activityId: string): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('activityIdAndSynced');

      const request = index.count(IDBKeyRange.only([activityId, false]));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Delete all unsynced points for an activity (e.g., when activity is cancelled)
  async deleteUnsyncedPoints(activityId: string): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('activityIdAndSynced');

      const request = index.openCursor(IDBKeyRange.only([activityId, false]));
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Deleted ${deletedCount} unsynced GPS points for activity ${activityId}`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get database statistics
  async getStats(): Promise<{ total: number; synced: number; unsynced: number }> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');

      let total = 0;
      let synced = 0;

      const totalRequest = store.count();
      totalRequest.onsuccess = () => {
        total = totalRequest.result;

        const syncedRequest = index.count(IDBKeyRange.only(true));
        syncedRequest.onsuccess = () => {
          synced = syncedRequest.result;
          resolve({
            total,
            synced,
            unsynced: total - synced
          });
        };
        syncedRequest.onerror = () => reject(syncedRequest.error);
      };

      totalRequest.onerror = () => reject(totalRequest.error);
    });
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
