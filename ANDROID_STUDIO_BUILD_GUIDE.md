# 📱 Android Studio Build & Test Guide

## ✅ **Vorbereitungen abgeschlossen!**

Folgende Schritte wurden bereits ausgeführt:
1. ✅ Git pull (Code aktualisiert)
2. ✅ npm install (Dependencies installiert)
3. ✅ npm run build (Web-Assets gebaut)
4. ✅ npx cap sync android (Android-Projekt aktualisiert)
5. ✅ Android Studio geöffnet

---

## 🔨 **In Android Studio: Build APK**

### **Option 1: Debug-Build (schneller, für Testing)**

1. **Warte bis Gradle Sync fertig ist**
   - Unten rechts in Android Studio: "Gradle Sync in progress..."
   - Warte bis "Gradle Sync finished" erscheint

2. **Select Run Configuration**
   - Oben in der Toolbar: Dropdown neben ▶️ Play-Button
   - Wähle: `app`

3. **Run auf Emulator oder Device**
   - Klicke ▶️ Play-Button (grünes Dreieck)
   - Oder: Klicke ⚙️ Run-Dropdown > "Run 'app'"
   - Oder: `Shift + F10`

4. **Wähle Target**
   - **Emulator:** Wähle einen Android Virtual Device (AVD)
   - **Physical Device:** Wähle dein per USB verbundenes Gerät

### **Option 2: Release-Build (für Produktion)**

1. **Build > Generate Signed Bundle / APK**

2. **Wähle: APK**
   - Klicke "APK"
   - Klicke "Next"

3. **Key Store**
   - Falls vorhanden: Wähle existierenden Keystore
   - Falls neu: "Create new..."
     - Key store path: `C:\Projects\VeloPulse\velopulse-keystore.jks`
     - Password: (wähle sicheres Passwort)
     - Alias: `velopulse`
     - Validity: 25 years
     - Certificate: Deine Daten

4. **Build Variant: release**
   - Wähle: `release`
   - Klicke "Create"

5. **APK Location**
   ```
   C:\Projects\VeloPulse\apps\public_web\android\app\build\outputs\apk\release\app-release.apk
   ```

---

## 🧪 **Testing im Android Studio Emulator**

### **Schritt 1: Emulator starten**

1. **Device Manager öffnen**
   - Klicke 📱 Icon in der Toolbar
   - Oder: Tools > Device Manager

2. **Emulator auswählen**
   - Empfehlung: Pixel 5 API 33 (Android 13)
   - Falls nicht vorhanden: "Create Device" > Pixel 5 > Next > API 33 (Tiramisu) > Finish

3. **Emulator starten**
   - Klicke ▶️ Play bei deinem AVD
   - Warte bis Emulator läuft

### **Schritt 2: App installieren & starten**

1. **Run App**
   - Klicke ▶️ Play-Button in Android Studio
   - Wähle den laufenden Emulator
   - App wird installiert und gestartet

2. **Logcat öffnen**
   - Unten in Android Studio: Tab "Logcat"
   - Filter einstellen: `package:de.velopulse.app`

### **Schritt 3: GPS simulieren im Emulator**

1. **Extended Controls öffnen**
   - Im Emulator: Klicke "..." (More) in der Sidebar
   - Oder: `Ctrl + Shift + Down`

2. **Location setzen**
   - Wähle: "Location"
   - Option 1: Single Point
     - Latitude: `48.1351` (München)
     - Longitude: `11.5820`
     - Klicke "Send"
   
   - Option 2: GPX Route
     - Klicke "Load GPX/KML"
     - Wähle: `test-route-muenchen.gpx`
     - Speed: `10` (10x schneller)
     - Klicke "Play Route"

### **Schritt 4: Display Lock simulieren**

1. **Lock Display**
   - Im Emulator: Drücke "Power Button" (rechts in Sidebar)
   - Oder im Logcat: Nutze ADB Command
     ```powershell
     adb -e shell input keyevent 26
     ```

2. **Check Logs für Background HTTP**
   - Logcat Filter: `Capacitor`
   - Suche nach:
     ```
     🚀 [BG] [CAPACITOR HTTP] POST
     ✅ [BG] Success: 200
     ✅ GPS point uploaded [BACKGROUND]
     ```

### **Schritt 5: Backend Monitoring (parallel)**

Öffne PowerShell (zweites Terminal):

```powershell
# Monitor Backend Logs
cd C:\Projects\VeloPulse\backend\LiveTracking.Api
dotnet run

# In neuem PowerShell:
.\check-live-snapshots.ps1

# Output sollte zeigen:
# ✅ New GPS points arriving every ~30 seconds
```

---

## 🔍 **Logcat Filter für Testing**

### **Filter 1: Background HTTP**
```
tag:Capacitor level:verbose
```

Suche nach:
- `[BG]` = Background mode
- `CAPACITOR HTTP` = Native HTTP aktiv
- `Success: 200` = Request erfolgreich

### **Filter 2: GPS Updates**
```
tag:BackgroundGeolocation
```

Suche nach:
- `Location update`
- `lat=` und `lon=`
- `accuracy=`

### **Filter 3: Fehler**
```
level:error
```

Suche nach:
- `401` = Token expired
- `Network error` = Connectivity issues
- `Permission denied` = GPS permission fehlt

---

## 📊 **Expected Log Output**

### **✅ ERFOLG (neue Code-Version):**

```
[Capacitor] 📍 [BACKGROUND] Sending activity point: {
              activityId: 'xxx',
              lat: 48.1351,
              lon: 11.5820
            }
[Capacitor] 🚀 [BG] [CAPACITOR HTTP] POST https://api.velopulse.de/api/activities/{id}/points
[Capacitor] ✅ [BG] Success: 200
[Capacitor] ✅ GPS point uploaded [BACKGROUND] via Background HTTP

[Capacitor] 📡 [BACKGROUND] Sending live snapshot: {
              liveSessionId: 'yyy',
              lat: 48.1351,
              lon: 11.5820
            }
[Capacitor] 🚀 [BG] [CAPACITOR HTTP] POST https://api.velopulse.de/api/live-sessions/{id}/snapshots
[Capacitor] ✅ [BG] Success: 204
[Capacitor] ✅ Live snapshot uploaded [BACKGROUND] via Background HTTP
```

**Key Indicators:**
- `[BACKGROUND]` oder `[BG]` = App im Background
- `CAPACITOR HTTP` = Nutzt native HTTP (nicht fetch!)
- `Success: 200/204` = Request erfolgreich

### **❌ FEHLER (alte Code-Version):**

```
[Capacitor] 📍 GPS Update [BACKGROUND]: lat=48.xxx, lon=11.xxx
[Capacitor] ⚠️ Direct upload failed, queueing for offline sync
[Capacitor] ✅ GPS point queued to IndexedDB
```

**Problem:**
- Kein `CAPACITOR HTTP` → Nutzt alten Code
- `queueing for offline sync` → Fallback zu Queue
- Keine `Success: 200` → Requests werden blockiert

**Lösung:**
- Android Studio: Build > Clean Project
- Dann: Build > Rebuild Project
- Dann: Run App neu

---

## 🎯 **Test-Szenarien**

### **Test 1: Foreground Tracking**

1. Start Activity in App
2. GPS Enable
3. Monitor Logcat
4. **Erwartung:** Uploads alle 30 Sekunden

**Check:**
```powershell
# In zweitem Terminal:
.\check-live-snapshots.ps1

# Sollte zeigen:
# Latest snapshot: 5 seconds ago
```

### **Test 2: Background Tracking (Wichtigster Test!)**

1. Start Activity in App
2. GPS Enable
3. Lock Display (Power Button im Emulator)
4. Warte 2 Minuten
5. Monitor Logcat

**Erwartung:**
- `[BG]` Logs erscheinen weiterhin
- `CAPACITOR HTTP` Requests alle 30 Sekunden
- `Success: 200` kontinuierlich

**Check:**
```powershell
.\check-live-snapshots.ps1

# Sollte zeigen neue Punkte WÄHREND Display gesperrt war:
# 14:32:15 - 14:32:45 - 14:33:15 (Display gesperrt)
```

### **Test 3: App Minimieren**

1. Start Activity
2. GPS Enable
3. Home Button (im Emulator Sidebar)
4. Warte 2 Minuten
5. Check Logs

**Erwartung:**
- Gleich wie Test 2
- Background HTTP funktioniert

---

## 🐛 **Troubleshooting im Emulator**

### **Problem 1: "No GPS signal"**

**Lösung:**
```
Extended Controls > Location
- Setze Koordinaten manuell
- Oder: Load GPX route
```

### **Problem 2: "Network unavailable"**

**Lösung:**
```
Settings > Network & Internet
- Ensure Wi-Fi ON
- Or: Enable Mobile Data simulation
```

### **Problem 3: "App crashes on start"**

**Check Logcat:**
```
level:error
```

**Common issues:**
- Missing permissions → Check AndroidManifest.xml
- Network config → Check network_security_config.xml

### **Problem 4: "Old code still running"**

**Lösung:**
```
1. Android Studio: Build > Clean Project
2. Build > Rebuild Project
3. Uninstall app from emulator:
   - Long press app icon
   - Uninstall
4. Run app again
```

---

## 📱 **Emulator vs. Physical Device**

### **Emulator:**
✅ Schnelles Testing
✅ GPS Simulation einfach
✅ Display Lock funktioniert
❌ Kein echter Doze Mode
❌ Keine echte Battery Optimization

### **Physical Device:**
✅ Echter Doze Mode
✅ Echte Battery Optimization
✅ Real-world GPS
❌ Langsamer Deployment
❌ USB-Kabel nötig

**Empfehlung:**
1. Erst im Emulator testen
2. Dann auf echtem Device verifizieren

---

## 🚀 **Schnell-Start (TL;DR)**

```powershell
# 1. Bereits erledigt:
cd C:\Projects\VeloPulse\apps\public_web
npm run build
npx cap sync android
npx cap open android

# 2. In Android Studio:
# - Wait for Gradle Sync
# - Click ▶️ Play
# - Select Emulator

# 3. In App:
# - Login
# - Start Activity
# - Enable GPS

# 4. Test Background:
# - Lock Display (Power Button)
# - Check Logcat für [BG] logs

# 5. Verify:
.\check-live-snapshots.ps1
```

---

## 📊 **Success Metrics**

| Metric | Target | Check |
|--------|--------|-------|
| Logcat shows `[BG]` | Yes | ✅ |
| `CAPACITOR HTTP` present | Yes | ✅ |
| `Success: 200` during lock | Yes | ✅ |
| Backend receives points | Yes | ✅ |
| Live Map updates | Yes | ✅ |

---

## 📚 **Nächste Schritte nach erfolgreichem Test:**

1. ✅ **Emulator Test OK** → Deploy auf echtes Device
2. ✅ **Physical Device Test OK** → Release Build erstellen
3. ✅ **Release APK OK** → Deploy zu Production

**Release Checklist:**
- [ ] Signed APK erstellt
- [ ] Tested auf min. 2 Devices
- [ ] Backend Monitoring läuft
- [ ] Dokumentation aktualisiert

---

**Status:** Android Studio Build Ready
**Next:** Run App in Emulator & Check Logcat for [BG] logs
**Test:** Lock display and verify Background HTTP works
