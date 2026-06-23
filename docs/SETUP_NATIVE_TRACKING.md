# Setup-Anleitung: Native Android Tracking Service

## 📋 Voraussetzungen

- Android Studio (neueste Version)
- Node.js 18+
- Capacitor CLI installiert
- Android SDK 33+ (Android 13)

## 🚀 Installation

### 1. Dependencies installieren

```bash
cd apps/public_web
npm install
```

### 2. Capacitor Sync

```bash
npx cap sync android
```

Dies kopiert die neuen Kotlin-Dateien und aktualisiert das Android-Projekt.

### 3. Android Studio öffnen

```bash
npx cap open android
```

### 4. Gradle Sync

Android Studio sollte automatisch Gradle syncen. Falls nicht:
- `File` → `Sync Project with Gradle Files`

### 5. Build & Run

#### Option A: Android Studio
1. Gerät/Emulator auswählen
2. `Run` → `Run 'app'`

#### Option B: Command Line
```bash
# Debug Build
cd apps/public_web
npx cap run android

# Release Build
npx cap build android
```

## 🔧 Konfiguration

### API URL setzen

**Für Entwicklung:**
```typescript
// apps/public_web/.env.development
VITE_API_URL=http://10.0.2.2:5000  # Android Emulator
# oder
VITE_API_URL=http://192.168.1.100:5000  # Echtes Gerät (deine lokale IP)
```

**Für Production:**
```typescript
// apps/public_web/.env.production
VITE_API_URL=https://api.velopulse.com
```

### Network Security Config (für lokale API)

Falls du auf eine lokale API (HTTP) zugreifen möchtest:

**`apps/public_web/android/app/src/main/res/xml/network_security_config.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext traffic for development -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain> <!-- Emulator -->
        <domain includeSubdomains="true">192.168.1.100</domain> <!-- Deine IP -->
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

## 📱 Erste Verwendung

### 1. App starten

```bash
npx cap run android
```

### 2. Berechtigungen erteilen

Beim ersten Start werden Berechtigungen angefragt:
1. **Standort** → "Während der Verwendung der App zulassen"
2. **Hintergrund-Standort** → "Immer zulassen" (wichtig!)
3. **Benachrichtigungen** → Erlauben

### 3. Tracking starten

1. Aktivität erstellen/starten
2. Live Tracking öffnen
3. Service startet automatisch
4. Notification erscheint

### 4. Display sperren

Sperre das Display → Tracking läuft weiter!

```bash
# Logs beobachten
adb logcat | grep "TrackingService"
```

## 🧪 Testen

### Emulator mit GPS

```bash
# Terminal 1: App starten
npx cap run android

# Terminal 2: GPS simulieren
adb emu geo fix 13.404954 52.520008  # Berlin
```

### Echtes Gerät

1. USB Debugging aktivieren
2. Gerät verbinden
3. App deployen:
   ```bash
   npx cap run android --target=<device-id>
   ```
4. Draußen testen oder Mock Location nutzen

## 🔍 Debugging

### Android Studio Logcat

```
Filter: "TrackingService"
```

Relevante Logs:
- `✅ Tracking started for activity: ...`
- `📍 GPS Update: lat=..., lon=...`
- `✅ Activity point uploaded`
- `✅ Live snapshot uploaded`

### ADB Logcat

```bash
# Alle Logs
adb logcat | grep "TrackingService"

# Nur GPS Updates
adb logcat | grep "GPS Update"

# Nur Uploads
adb logcat | grep "uploaded"

# Nur Errors
adb logcat | grep "❌"
```

### React DevTools

Öffne Chrome DevTools:
```
chrome://inspect
```

Wähle deine App und prüfe Console-Logs:
- `🚀 Using NATIVE ANDROID FOREGROUND SERVICE`
- `✅ Native Foreground Service started`

## ⚠️ Häufige Probleme

### Problem: Build Error "Cannot resolve symbol 'TrackingService'"

**Lösung:**
```bash
cd apps/public_web/android
./gradlew clean
./gradlew build
```

### Problem: "Google Play Services not available"

**Lösung:**
- Emulator mit Google Play Services nutzen
- Oder echtes Gerät

### Problem: GPS funktioniert nicht

**Lösung:**
```bash
# GPS aktivieren
adb shell settings put secure location_providers_allowed gps,network

# Location Mode auf High Accuracy setzen
adb shell settings put secure location_mode 3
```

### Problem: Berechtigungen werden nicht angefragt

**Lösung:**
```bash
# App-Daten löschen und neu installieren
adb shell pm clear com.velopulse.app
npx cap run android
```

### Problem: Service startet nicht

**Lösung:**
1. Prüfe AndroidManifest.xml → Service registriert?
2. Prüfe MainActivity.kt → Plugin registriert?
3. Prüfe Logs:
   ```bash
   adb logcat | grep "MainActivity"
   adb logcat | grep "TrackingServicePlugin"
   ```

## 📦 Production Build

### Signed APK erstellen

```bash
cd apps/public_web
npx cap build android --release
```

Oder in Android Studio:
1. `Build` → `Generate Signed Bundle / APK`
2. APK wählen
3. Keystore auswählen/erstellen
4. Release Build

### Play Store Upload

1. **App Bundle** erstellen (empfohlen):
   ```bash
   cd apps/public_web/android
   ./gradlew bundleRelease
   ```

2. Bundle Location:
   ```
   apps/public_web/android/app/build/outputs/bundle/release/app-release.aab
   ```

3. Im Play Console hochladen

## 📊 Performance-Überwachung

### Battery Stats

```bash
# Battery Stats zurücksetzen
adb shell dumpsys batterystats --reset

# App verwenden...

# Stats anzeigen
adb shell dumpsys batterystats com.velopulse.app
```

### Memory Profiler

Android Studio:
1. `View` → `Tool Windows` → `Profiler`
2. App auswählen
3. `Memory` wählen
4. Heap Dump erstellen

## 🔄 Updates

### Nach Code-Änderungen

```bash
# TypeScript/React
cd apps/public_web
npm run build
npx cap sync

# Android Kotlin
npx cap open android
# Build in Android Studio
```

### Nach Capacitor Updates

```bash
npm install @capacitor/core@latest @capacitor/android@latest
npx cap sync android
```

## ✅ Checkliste für Production

- [ ] API URL auf Production setzen
- [ ] Release Keystore erstellen
- [ ] Signed Build erstellen
- [ ] Testen auf verschiedenen Geräten
- [ ] GPS-Tracking im Hintergrund testen
- [ ] Battery Drain prüfen
- [ ] Memory Leaks prüfen
- [ ] Play Store Listing vorbereiten
- [ ] Privacy Policy aktualisieren (GPS-Tracking)
- [ ] Screenshots erstellen

## 📚 Nächste Schritte

1. Lies die vollständige Dokumentation: `docs/NATIVE_TRACKING_SERVICE.md`
2. Teste die App auf einem echten Gerät
3. Implementiere zusätzliche Features (siehe Dokumentation)
4. Erstelle Production Build

## 🆘 Support

Bei Problemen:
1. Prüfe die Logs (`adb logcat`)
2. Lies die vollständige Dokumentation
3. Prüfe Common Issues im Troubleshooting-Bereich

**Happy Tracking! 🚴‍♂️💨**
