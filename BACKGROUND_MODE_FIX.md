# Background Mode Fix - WebView Pause Problem

## 🚨 Problem

```
Display sperren → App paused → App stopped → WebView pausiert → JavaScript stoppt
```

**Logcat zeigt:**
```
App paused
App stopped
```

**Resultat:** `backgroundHttpService.ts` kann nicht laufen, da JavaScript pausiert ist.

---

## ✅ Lösung 1: WakeLock in MainActivity (Implementiert)

**Was wurde geändert:**
- `MainActivity.java` erweitert mit `PARTIAL_WAKE_LOCK`
- Hält CPU aktiv im Hintergrund
- WebView und JavaScript laufen weiter

**Datei:** `apps/public_web/android/app/src/main/java/com/velopulse/app/MainActivity.java`

**Was es macht:**
```java
// onCreate: WakeLock erstellen
PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
    PowerManager.PARTIAL_WAKE_LOCK,
    "VeloPulse::BackgroundTracking"
);

// onResume: WakeLock aktivieren
wakeLock.acquire();

// onPause: WakeLock NICHT releasen (bleibt aktiv!)
// onDestroy: WakeLock erst dann releasen
```

---

## ✅ Lösung 2: Capacitor Background Mode Plugin (Empfohlen)

### Installation:

```bash
cd apps/public_web
npm install @capacitor-community/background-mode
npx cap sync android
```

### Usage in LiveTracking.tsx:

```typescript
import { BackgroundMode } from '@capacitor-community/background-mode';

// In useEffect beim Tracking-Start:
await BackgroundMode.enable();
await BackgroundMode.disableWebViewOptimizations();

// Bei Tracking-Ende:
await BackgroundMode.disable();
```

**Vorteile:**
- ✅ Offizielle Lösung
- ✅ Verhindert WebView Pause
- ✅ Konfigurierbare Notification
- ✅ Besseres Battery Management

---

## 🔨 Rebuild erforderlich!

Da wir Java-Code geändert haben:

```bash
# 1. Capacitor sync
cd apps/public_web
npx cap sync android

# 2. Clean & Rebuild in Android Studio
Build > Clean Project
Build > Rebuild Project

# 3. Run auf Device
▶️ Play

# 4. Test
# Display sperren
# Logcat sollte NICHT mehr zeigen:
# ❌ App paused
# ❌ App stopped
```

---

## 📊 Erwartetes Ergebnis nach Fix:

### Vorher (FEHLER):
```
[14:20:31] App paused          ← WebView pausiert
[14:20:31] App stopped         ← JavaScript stoppt
[14:20:32] 📍 GPS Update       ← GPS läuft weiter (nativ)
[14:20:32] ❌ No HTTP request  ← Kein Upload!
```

### Nachher (FUNKTIONIERT):
```
[14:20:31] 🔒 Display locked
[14:20:32] 📍 GPS Update [BACKGROUND]
[14:20:32] 🚀 [BG] [CAPACITOR HTTP] POST
[14:20:32] ✅ [BG] Success: 200
[14:20:33] ✅ GPS point uploaded [BACKGROUND]
```

**Kein "App paused" mehr!**

---

## 🧪 Test nach Rebuild:

```bash
# 1. Logcat monitoren
adb logcat | grep -E "Capacitor|paused|stopped|Background"

# 2. In App: Tracking starten

# 3. Display sperren

# 4. Check Logcat:
# ✅ Kein "App paused"
# ✅ "GPS Update [BACKGROUND]"
# ✅ "CAPACITOR HTTP POST"
# ✅ "Success: 200"

# 5. Backend Check:
curl http://localhost:5000/api/public/live-sessions
# Sollte neue GPS-Punkte zeigen (alle 30s)
```

---

## 📱 Alternative: Background Mode Plugin

Falls MainActivity-Fix nicht reicht:

```bash
# Install plugin
npm install @capacitor-community/background-mode

# In LiveTracking.tsx einfügen:
import { BackgroundMode } from '@capacitor-community/background-mode';

// Start tracking
useEffect(() => {
  if (isTracking && !isPaused) {
    BackgroundMode.enable();
    BackgroundMode.disableWebViewOptimizations();
  }
  
  return () => {
    BackgroundMode.disable();
  };
}, [isTracking, isPaused]);
```

---

## 🔍 Debugging:

### Check WakeLock aktiv:

```bash
adb shell dumpsys power | grep -i wake
# Sollte zeigen: VeloPulse::BackgroundTracking (active)
```

### Check WebView läuft:

```bash
adb logcat | grep "Capacitor"
# Sollte zeigen: Logs auch bei gesperrtem Display
```

### Check Battery Optimization:

```bash
adb shell dumpsys deviceidle whitelist
# VeloPulse sollte gelistet sein
```

---

## 📋 Zusammenfassung:

**Problem:** WebView pausiert → JavaScript stoppt → Keine HTTP-Requests

**Lösung:** WakeLock in MainActivity → WebView bleibt aktiv → JavaScript läuft → HTTP funktioniert

**Status:** ✅ Implementiert, Rebuild erforderlich

**Next:** Android Studio → Build > Rebuild Project → Run → Test

---

**WICHTIG:** Nach dem Rebuild sollte "App paused/stopped" nicht mehr erscheinen!
