# 🚀 Capacitor Migration Guide für VeloPulse

## ✅ Was wurde vorbereitet

Diese Anleitung führt Sie durch die Capacitor-Migration für natives GPS-Tracking.

---

## 📋 Voraussetzungen

Bevor Sie starten, stellen Sie sicher:

1. **Node.js 18+ installiert**
   ```bash
   node --version  # Sollte >= 18.0.0 sein
   ```

2. **Für Android:**
   - Android Studio installiert
   - Android SDK (API Level 22+)
   - Java JDK 11+

3. **Für iOS (nur auf macOS):**
   - Xcode 14+
   - CocoaPods installiert

---

## 🔧 Schritt 1: Capacitor installieren

```bash
cd apps/public_web

# Capacitor Core und CLI
npm install @capacitor/core @capacitor/cli

# Plattformen
npm install @capacitor/android @capacitor/ios

# Background Geolocation Plugin
npm install @capacitor-community/background-geolocation
```

---

## 🎯 Schritt 2: Capacitor initialisieren

```bash
cd apps/public_web

# Initialisieren
npx cap init "VeloPulse" "com.velopulse.app" --web-dir=dist

# Android hinzufügen
npx cap add android

# iOS hinzufügen (nur auf macOS)
npx cap add ios
```

---

## 📱 Schritt 3: Capacitor Config erstellen

Erstellen Sie `apps/public_web/capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velopulse.app',
  appName: 'VeloPulse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Für Development:
    // url: 'http://your-ip:5173',
    // cleartext: true
  },
  plugins: {
    BackgroundGeolocation: {
      notificationTitle: "VeloPulse Tracking",
      notificationText: "Tracking active",
      backgroundMessage: "Location tracking in progress",
      locationPermissionMessage: "VeloPulse needs access to your location for GPS tracking",
    }
  }
};

export default config;
```

---

## 🔌 Schritt 4: Background Geolocation Service erstellen

Erstellen Sie `apps/public_web/src/services/capacitorGpsService.ts`:

```typescript
import { BackgroundGeolocation } from '@capacitor-community/background-geolocation';
import { Capacitor } from '@capacitor/core';

interface GPSCallback {
  (latitude: number, longitude: number, accuracy: number, speed: number | null): void;
}

class CapacitorGpsService {
  private watcherId: string | null = null;
  private callbacks: Set<GPSCallback> = new Set();

  // Check if running as native app
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Start background GPS tracking
  async startTracking(callback: GPSCallback): Promise<void> {
    if (!this.isNative()) {
      console.log('Not running as native app, using web geolocation');
      return;
    }

    this.callbacks.add(callback);

    try {
      // Request permissions
      const permStatus = await BackgroundGeolocation.checkPermissions();
      
      if (permStatus.location !== 'granted') {
        const requested = await BackgroundGeolocation.requestPermissions({
          permissions: ['location']
        });
        
        if (requested.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      // Configure and start
      await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Tracking: {distance} km",
          backgroundTitle: "VeloPulse Tracking",
          requestPermissions: true,
          stale: false,
          distanceFilter: 10, // Update every 10 meters
          desiredAccuracy: 'high'
        },
        (location, error) => {
          if (error) {
            console.error('[GPS] Error:', error);
            return;
          }

          if (location) {
            console.log('[GPS] Native location:', location);
            
            // Call all callbacks
            this.callbacks.forEach(cb => {
              cb(
                location.latitude,
                location.longitude,
                location.accuracy || 0,
                location.speed || null
              );
            });
          }
        }
      ).then(id => {
        this.watcherId = id;
        console.log('✅ Background GPS tracking started, watcherId:', id);
      });

    } catch (error) {
      console.error('❌ Failed to start GPS tracking:', error);
      throw error;
    }
  }

  // Stop tracking
  async stopTracking(): Promise<void> {
    if (this.watcherId) {
      await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      this.watcherId = null;
      console.log('🛑 Background GPS tracking stopped');
    }
  }

  // Remove callback
  removeCallback(callback: GPSCallback): void {
    this.callbacks.delete(callback);
  }
}

export const capacitorGpsService = new CapacitorGpsService();
```

---

## 🔄 Schritt 5: LiveTracking.tsx erweitern

Fügen Sie in `apps/public_web/src/pages/LiveTracking.tsx` hinzu:

```typescript
import { capacitorGpsService } from '../services/capacitorGpsService';

// Am Anfang der Komponente:
const isNative = capacitorGpsService.isNative();

// Im GPS-Tracking useEffect:
useEffect(() => {
  if (!isTracking || !id) return;

  // Native App: Use Capacitor Background Geolocation
  if (isNative) {
    console.log('🚀 Starting native background GPS tracking...');
    
    capacitorGpsService.startTracking((latitude, longitude, accuracy, speed) => {
      handleNativeGPSUpdate(latitude, longitude, accuracy, speed);
    });

    return () => {
      capacitorGpsService.stopTracking();
    };
  }

  // Web: Use existing browser geolocation
  console.log('🌐 Starting web GPS tracking...');
  // ... existing web GPS code ...
}, [isTracking, id, isNative]);

// Handler für native GPS updates:
const handleNativeGPSUpdate = async (
  latitude: number,
  longitude: number,
  accuracy: number,
  speed: number | null
) => {
  console.log('[Native GPS]', { latitude, longitude, accuracy, speed });
  
  // ... same logic as handlePosition but for native updates
};
```

---

## 🛠️ Schritt 6: Build und Sync

```bash
cd apps/public_web

# Build Web-App
npm run build

# Sync zu nativen Projekten
npx cap sync

# Öffne Android Studio
npx cap open android

# Öffne Xcode (nur macOS)
npx cap open ios
```

---

## 📱 Schritt 7: Android-Spezifische Konfiguration

In `android/app/src/main/AndroidManifest.xml` hinzufügen:

```xml
<manifest>
  <!-- Permissions -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

  <application>
    <!-- Foreground Service -->
    <service 
      android:name="com.getcapacitor.community.background.geolocation.BackgroundGeolocationService"
      android:enabled="true"
      android:foregroundServiceType="location"
      android:exported="false" />
  </application>
</manifest>
```

---

## 🍎 Schritt 8: iOS-Spezifische Konfiguration

In `ios/App/App/Info.plist` hinzufügen:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
</array>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>VeloPulse needs your location to track your activity</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>VeloPulse needs your location to track your activity</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>VeloPulse needs your location even when in background to continue tracking</string>
```

---

## ✅ Schritt 9: Testen

### Android:
```bash
# Debug Build
npx cap run android

# Release Build
cd android
./gradlew assembleRelease
```

### iOS:
```bash
# Öffne Xcode
npx cap open ios

# Build und run in Xcode
# Wähle Gerät/Simulator und drücke Play
```

---

## 🎯 Ergebnis

**Nach der Migration:**
- ✅ GPS läuft im Hintergrund (auch bei gesperrtem Display)
- ✅ Persistent Notification zeigt Tracking-Status
- ✅ Keine Browser-Limitierungen mehr
- ✅ Professionelles GPS-Tracking wie Strava/Komoot
- ✅ App kann im Google Play Store / App Store veröffentlicht werden

---

## 🔧 Troubleshooting

### "npm not found"
```bash
# Stelle sicher dass Node.js im PATH ist
# Neu installieren oder PATH anpassen
```

### Android Build Fehler
```bash
# Gradle Cache löschen
cd android
./gradlew clean

# Neu syncen
cd ..
npx cap sync android
```

### iOS Build Fehler
```bash
# CocoaPods neu installieren
cd ios/App
pod install
```

---

## 📚 Weitere Ressourcen

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Background Geolocation Plugin](https://github.com/capacitor-community/background-geolocation)
- [Android Development](https://developer.android.com/)
- [iOS Development](https://developer.apple.com/)

---

**Status: Bereit für Capacitor-Migration! 🚀**

Führen Sie die Schritte 1-9 aus, um VeloPulse in eine native App zu verwandeln!
