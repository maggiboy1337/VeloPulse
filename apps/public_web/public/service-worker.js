// VeloPulse Service Worker - Phase 3 & 4
// Background Sync + Notifications

const CACHE_NAME = 'velopulse-v1';
const API_URL = self.location.origin.includes('localhost') 
  ? 'http://localhost:5000' 
  : 'https://api.velopulse.example.com';

// ========================================
// INSTALL & ACTIVATE
// ========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
  
  // Force activation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  return self.clients.claim();
});

// ========================================
// PHASE 3: BACKGROUND SYNC
// ========================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event triggered:', event.tag);
  
  if (event.tag === 'sync-gps-points') {
    event.waitUntil(syncGPSPoints());
  }
});

// Sync GPS points from IndexedDB to backend
async function syncGPSPoints() {
  console.log('[SW] 🔄 Starting background GPS sync...');
  
  try {
    // Open IndexedDB
    const db = await openDatabase();
    const unsyncedPoints = await getUnsyncedPoints(db);
    
    if (unsyncedPoints.length === 0) {
      console.log('[SW] ✅ No unsynced points to upload');
      return;
    }
    
    console.log(`[SW] 📤 Uploading ${unsyncedPoints.length} GPS points...`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Upload in batches
    const batchSize = 10;
    for (let i = 0; i < unsyncedPoints.length; i += batchSize) {
      const batch = unsyncedPoints.slice(i, i + batchSize);
      
      for (const point of batch) {
        try {
          await uploadGPSPoint(point);
          await markPointAsSynced(db, point.id);
          successCount++;
        } catch (error) {
          console.error('[SW] ❌ Failed to upload point:', error);
          await incrementAttempts(db, point.id);
          failureCount++;
        }
      }
      
      // Small delay between batches
      if (i + batchSize < unsyncedPoints.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[SW] ✅ Sync completed: ${successCount} successful, ${failureCount} failed`);
    
    // Show notification about sync result
    if (successCount > 0) {
      await showNotification('GPS Sync Complete', {
        body: `${successCount} GPS points uploaded successfully`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'sync-complete'
      });
    }
    
  } catch (error) {
    console.error('[SW] ❌ Background sync error:', error);
    throw error; // Rethrow to retry later
  }
}

// Upload single GPS point to backend
async function uploadGPSPoint(point) {
  const response = await fetch(`${API_URL}/api/activities/${point.activityId}/points`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${point.token}` // Token stored with point
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
    throw new Error(`Upload failed with status ${response.status}`);
  }
  
  return response.json();
}

// ========================================
// INDEXEDDB OPERATIONS
// ========================================
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VeloPulseDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('gpsPoints')) {
        const store = db.createObjectStore('gpsPoints', { keyPath: 'id', autoIncrement: true });
        store.createIndex('activityId', 'activityId', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

function getUnsyncedPoints(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gpsPoints'], 'readonly');
    const store = transaction.objectStore('gpsPoints');
    const index = store.index('synced');
    const request = index.getAll(0); // synced = 0 means unsynced
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function markPointAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gpsPoints'], 'readwrite');
    const store = transaction.objectStore('gpsPoints');
    const request = store.get(id);
    
    request.onsuccess = () => {
      const point = request.result;
      if (point) {
        point.synced = 1;
        const updateRequest = store.put(point);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

function incrementAttempts(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gpsPoints'], 'readwrite');
    const store = transaction.objectStore('gpsPoints');
    const request = store.get(id);
    
    request.onsuccess = () => {
      const point = request.result;
      if (point) {
        point.attempts = (point.attempts || 0) + 1;
        
        // Give up after 5 attempts
        if (point.attempts >= 5) {
          console.warn(`[SW] Point ${id} failed 5 times, marking as synced to skip`);
          point.synced = 1;
        }
        
        const updateRequest = store.put(point);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// PHASE 4: NOTIFICATIONS
// ========================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  // Open/focus app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Helper to show notifications
async function showNotification(title, options) {
  const permission = await self.registration.pushManager?.permissionState?.({ userVisibleOnly: true });
  
  if (permission === 'granted' || Notification.permission === 'granted') {
    return self.registration.showNotification(title, options);
  } else {
    console.warn('[SW] Notification permission not granted');
  }
}

// ========================================
// PERIODIC BACKGROUND SYNC (if supported)
// ========================================
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'periodic-gps-sync') {
    event.waitUntil(syncGPSPoints());
  }
});

// ========================================
// MESSAGE HANDLING (from main thread)
// ========================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncGPSPoints());
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ========================================
// FETCH HANDLER (Network-first strategy)
// ========================================
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API requests (handle directly)
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response and cache it
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Return cached version if network fails
        return caches.match(event.request);
      })
  );
});

console.log('[SW] Service Worker loaded successfully');
