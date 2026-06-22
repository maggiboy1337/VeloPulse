# 🐧 Linux Testing Guide - Background HTTP

## 🚨 **Problem: GPS-Daten werden nicht gesendet bei gesperrtem Display**

### **Ursache:**
Die Android-App nutzt noch den **alten Code** ohne `backgroundHttpService.ts`. Die Änderungen sind im Git, aber **nicht in der APK**.

---

## 🔍 **Quick Diagnosis**

```bash
# 1. Quick check (recommended)
./quick-check-background-http.sh

# Erwartung: Zeigt ob neue oder alte Code-Version läuft
```

**Mögliche Outputs:**

### ✅ **Fall 1: Neue Version läuft**
```
✅ NEW CODE DETECTED!
✅ GPS tracking is active
✅ HTTP requests detected
```
→ **Lösung:** App funktioniert, teste mit: `./test-background-http.sh`

### ❌ **Fall 2: Alte Version läuft** (wahrscheinlich Ihr Fall!)
```
❌ OLD CODE STILL ACTIVE!
🚨 MAIN ISSUE: App has OLD CODE
```
→ **Lösung:** APK neu bauen (siehe unten)

---

## 🔨 **APK neu bauen**

### **Methode 1: Automatisches Build-Script (empfohlen)**

```bash
# 1. Build vorbereiten
./build-android-apk.sh

# 2. Android Studio öffnen (wenn verfügbar)
# Öffne: apps/public_web/android
# Build > Generate Signed Bundle/APK > Release

# 3. Oder: Command Line Build
cd apps/public_web/android
./gradlew assembleRelease

# 4. APK installieren
adb install -r app/build/outputs/apk/release/app-release.apk

# 5. Verifizieren
./quick-check-background-http.sh
```

### **Methode 2: Manuell**

```bash
# 1. Frontend-Dependencies
cd apps/public_web
npm install

# 2. Prüfen ob backgroundHttpService.ts existiert
ls -la src/services/backgroundHttpService.ts
# Sollte existieren!

# 3. Build
npm run build

# 4. Capacitor sync
npx cap sync android

# 5. Android Studio Build
# (siehe oben)
```

---

## 🧪 **Testing**

### **Test 1: Code-Version prüfen**

```bash
./check-app-version.sh
```

**Erwartung:**
```
✅ Background HTTP code detected!
✅ App was rebuilt with new code
```

### **Test 2: Background HTTP testen**

```bash
./test-background-http.sh
```

**Ablauf:**
1. Script fragt nach: Activity in App starten
2. Display wird gesperrt
3. 60 Sekunden Monitoring
4. Logs werden geprüft

**Erwartete Logs:**
```
🚀 [BG] [CAPACITOR HTTP] POST https://api.velopulse.de/api/activities/{id}/points
✅ [BG] Success: 200
✅ GPS point uploaded [BACKGROUND] via Background HTTP
```

### **Test 3: Manual Check**

```bash
# 1. Start activity in app
# 2. Lock display
# 3. Monitor logs
adb logcat | grep -E "CAPACITOR HTTP|Background HTTP|GPS point uploaded"

# Sollte zeigen:
# - [BG] = Background mode
# - CAPACITOR HTTP = Native HTTP aktiv
# - Success: 200 = Request erfolgreich
```

---

## 🐛 **Troubleshooting**

### **Problem 1: "No device connected"**

```bash
# Check devices
adb devices

# Should show:
# List of devices attached
# ABC123456789    device

# If not:
# 1. Connect USB cable
# 2. Enable "USB Debugging" on phone
# 3. Accept "Allow USB debugging" popup
```

### **Problem 2: "App not installed"**

```bash
# Check if installed
adb shell pm list packages | grep velopulse

# If not found:
adb install -r path/to/app-release.apk
```

### **Problem 3: "Old code still active"**

```bash
# Verify file exists
cat apps/public_web/src/services/backgroundHttpService.ts | head -n 5

# Should show:
# /**
#  * Background HTTP Service - Capacitor HTTP für Android Background
#  * ...

# If exists:
# → Rebuild APK (see above)

# If not exists:
git pull origin main
# → File should appear
# → Then rebuild APK
```

### **Problem 4: "No GPS activity"**

```bash
# Check GPS permission
adb shell dumpsys package de.velopulse.app | grep -A 5 permission

# Should include:
# android.permission.ACCESS_FINE_LOCATION: granted=true
# android.permission.ACCESS_BACKGROUND_LOCATION: granted=true
```

### **Problem 5: "No HTTP requests"**

```bash
# Check network connectivity
adb shell "ping -c 3 api.velopulse.de"

# Check if token is valid
adb logcat | grep -E "401|Unauthorized|Token"

# If 401 errors: Token expired
# → Re-login in app
```

---

## 📊 **Verification Checklist**

Nach dem Build und Installation:

### ✅ **Frontend Check**
```bash
# 1. New code present
cat apps/public_web/src/services/backgroundHttpService.ts

# 2. Import in LiveTracking
grep "backgroundHttpService" apps/public_web/src/pages/LiveTracking.tsx

# 3. Code uses backgroundHttpService
grep "backgroundHttpService.sendActivityPoint" apps/public_web/src/pages/LiveTracking.tsx
```

### ✅ **App Check**
```bash
# 1. App has new code
./check-app-version.sh

# 2. Background HTTP active
./quick-check-background-http.sh

# 3. Full test
./test-background-http.sh
```

### ✅ **Backend Check**
```bash
# Check if points are arriving
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.velopulse.de/api/activities/YOUR_ACTIVITY_ID/details" \
  | jq '.points[-5:]'

# Should show recent points with timestamps
```

---

## 🎯 **Expected Behavior**

### **Before (OLD CODE):**
```
App minimized → ❌ No HTTP requests
Display locked → ❌ No data sent
```

### **After (NEW CODE):**
```
App minimized → ✅ HTTP requests continue
Display locked → ✅ Data sent every 30s
```

### **Logs Comparison:**

**OLD CODE:**
```
📍 GPS Update [BACKGROUND]: lat=48.xxx, lon=11.xxx
⚠️ Direct upload failed, queueing for offline sync
// No HTTP activity in background!
```

**NEW CODE:**
```
📍 [BACKGROUND] Sending activity point: { ... }
🚀 [BG] [CAPACITOR HTTP] POST https://...
✅ [BG] Success: 200
✅ GPS point uploaded [BACKGROUND] via Background HTTP
```

---

## 🚀 **Quick Start (TL;DR)**

```bash
# 1. Diagnose
./quick-check-background-http.sh

# 2. If old code detected:
./build-android-apk.sh
# Build APK in Android Studio
adb install -r app-release.apk

# 3. Test
./test-background-http.sh

# 4. If still issues:
adb logcat | grep -E "CAPACITOR|VeloPulse"
```

---

## 📞 **Support**

**Issue:** Old code still active after rebuild

**Check:**
```bash
# 1. Verify commit
git log --oneline -1
# Should show: "Fix: Background HTTP für GPS-Tracking..."

# 2. Verify file exists
ls -la apps/public_web/src/services/backgroundHttpService.ts

# 3. Verify Capacitor sync
ls -la apps/public_web/android/app/src/main/assets/public/

# 4. Check build date
stat -c %y apps/public_web/android/app/build/outputs/apk/release/app-release.apk
# Should be recent
```

**Next:**
- Re-run `npx cap sync android`
- Rebuild APK
- Reinstall on device

---

## 📚 **Related Files**

```
.
├── test-background-http.sh              ← Test script
├── check-app-version.sh                 ← Version check
├── build-android-apk.sh                 ← Build script
├── quick-check-background-http.sh       ← Quick diagnosis
├── LINUX_TESTING_BACKGROUND_HTTP.md     ← This file
├── BACKGROUND_HTTP_IMPLEMENTATION.md    ← Technical details
└── apps/public_web/
    ├── src/services/
    │   └── backgroundHttpService.ts     ← NEW CODE
    └── src/pages/
        └── LiveTracking.tsx             ← MODIFIED
```

---

**Status:** Ready for Testing on Linux/Prod
**Last Updated:** 2024-01-XX
**Priority:** HIGH - Fix for production issue
