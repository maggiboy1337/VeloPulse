# 🧪 Test-Anleitung: Background GPS Tracking

## Vorbereitung

1. **Backend starten:**
```bash
cd backend/LiveTracking.Api
dotnet run
```

2. **Frontend starten:**
```bash
cd apps/public_web
npm run dev
```

3. **Browser öffnen:**
- Chrome/Edge empfohlen (beste Wake Lock Unterstützung)
- https://localhost:5173 (oder entsprechende URL)

---

## Test 1: Wake Lock Aktivierung ✅

### Schritte:
1. Einloggen und neue Aktivität starten
2. Zum Live-Tracking navigieren
3. **ERWARTETES VERHALTEN:**
   - ✅ GPS-Indikator: "GPS verbunden"
   - ✅ Neuer Indikator erscheint: "🔒 Display aktiv"
   - ✅ Display sollte NICHT dimmen/einschlafen
   
4. **Browser Console öffnen** (F12):
```
🔒 Wake Lock activated - display will stay awake
🚀 GPS Queue Service started for activity: ...
   Sync interval: 30 seconds
   Background-ready: Yes
🛰️ Starting GPS tracking (Background-ready)...
```

5. **Nach 1 Minute warten:**
   - Display sollte immer noch hell sein
   - Keine Auto-Sleep

### Erfolgskriterien:
- ✅ "🔒 Display aktiv" wird angezeigt
- ✅ Display schläft nicht ein
- ✅ Console zeigt "Wake Lock activated"

---

## Test 2: Background-Modus Detection ✅

### Schritte:
1. Tracking läuft (aus Test 1)
2. **Tab wechseln** zu anderem Browser-Tab
3. **15-30 Sekunden warten**
4. **Zurück zum Tracking-Tab**
5. **Browser Console prüfen:**

```
🌙 Page hidden - background tracking mode active
   GPS will continue tracking in background
📍 GPS Update [🌙 BACKGROUND]: lat=48.123456, lon=11.654321, acc=15.0m
💓 Tracking Heartbeat [🌙 BACKGROUND] [🔒 LOCKED]: Points=5, Distance=0.15km
✅ GPS point uploaded [BACKGROUND] to activity backend
🔄 Syncing 3 GPS points [🌙 BACKGROUND]...
```

6. **UI prüfen:**
   - ✅ "🌙 Hintergrund-Modus aktiv" Indikator erscheint (wenn Tab hidden)
   - ✅ Verschwindet wenn Tab wieder sichtbar

### Erfolgskriterien:
- ✅ GPS-Updates auch im Background (Console-Logs)
- ✅ Heartbeat-Logs alle 15s
- ✅ UI-Indikator für Background-Modus
- ✅ GPS-Punkte wurden weiter gesammelt

---

## Test 3: Heartbeat-Mechanismus ✅

### Schritte:
1. Tracking starten
2. **Browser Console beobachten**
3. **Alle 15 Sekunden** sollte erscheinen:

```
💓 Tracking Heartbeat [🌙/👁️ STATUS] [🔒/🔓 LOCK]: Points=X, Distance=Y
```

### Varianten testen:

**Foreground + Wake Lock:**
```
💓 Tracking Heartbeat [👁️ FOREGROUND] [🔒 LOCKED]: Points=10, Distance=0.25km
```

**Background + Wake Lock:**
```
💓 Tracking Heartbeat [🌙 BACKGROUND] [🔒 LOCKED]: Points=15, Distance=0.38km
```

**Foreground ohne Wake Lock** (nach Manual Release):
```
💓 Tracking Heartbeat [👁️ FOREGROUND] [🔓 UNLOCKED]: Points=20, Distance=0.52km
```

### Erfolgskriterien:
- ✅ Heartbeat alle 15 Sekunden
- ✅ Korrekte Status-Anzeige (Background/Foreground)
- ✅ Korrekte Wake Lock Anzeige
- ✅ Points und Distance erhöhen sich

---

## Test 4: GPS-Timeout Verbesserung ✅

### Schritte:
1. **Innenraum gehen** (schlechter GPS-Empfang)
2. Tracking starten
3. **Browser Console beobachten**

**VORHER (10s Timeout):**
```
❌ GPS error: TIMEOUT
GPS-Timeout. Versuche erneut...
```
(Sehr häufig bei schlechtem Empfang)

**NACHHER (30s Timeout):**
```
📍 GPS Update [👁️ FOREGROUND]: lat=48.123456, lon=11.654321, acc=45.0m
```
(Timeout seltener, da mehr Zeit für GPS-Fix)

### Erfolgskriterien:
- ✅ Weniger Timeouts in Gebäuden
- ✅ GPS wartet bis zu 30s auf Signal
- ✅ maximumAge erlaubt gecachte Position (5s)

---

## Test 5: Sync-Optimierung (30s) ✅

### Schritte:
1. Tracking starten
2. **Netzwerk offline schalten** (Browser DevTools > Network > Offline)
3. **1 Minute bewegen** (GPS-Punkte sammeln)
4. **Browser Console prüfen:**

```
⚠️ Direct upload failed, queueing for offline sync:
GPS point queued for offline sync
```

5. **Netzwerk wieder online**
6. **Max 30 Sekunden warten**
7. **Console sollte zeigen:**

```
🔄 Syncing 3 GPS points [👁️ FOREGROUND]...
✅ GPS point uploaded to activity backend
✅ Sync completed [👁️ FOREGROUND]: 3 successful, 0 failed
```

### Erfolgskriterien:
- ✅ Sync startet automatisch innerhalb 30s
- ✅ Alle Offline-Punkte werden hochgeladen
- ✅ IndexedDB Queue funktioniert

---

## Test 6: Display-Lock bei Pause/Stop ✅

### Schritte:
1. Tracking läuft mit Wake Lock aktiv
2. **UI prüfen:** "🔒 Display aktiv"
3. **Pause-Button klicken**
4. **Erwartetes Verhalten:**
   - ✅ "🔒 Display aktiv" ändert zu "🔓 Display-Sperre aus"
   - ✅ Console: "🔓 Wake Lock manually released"
   - ✅ Display kann jetzt einschlafen

5. **Resume-Button klicken**
6. **Erwartetes Verhalten:**
   - ✅ Wake Lock wird wieder aktiviert
   - ✅ "🔒 Display aktiv" erscheint wieder
   - ✅ Console: "🔒 Wake Lock activated..."

### Erfolgskriterien:
- ✅ Wake Lock wird bei Pause released
- ✅ Wake Lock wird bei Resume re-acquired
- ✅ UI-Indikatoren passen sich an

---

## Test 7: Mobile Testing (wichtig!) 📱

### Android Chrome/Edge:
1. **Aktivität starten** auf Handy
2. **Display sperren** (Power-Button)
3. **30 Sekunden warten**
4. **Display entsperren**
5. **Zurück zur App**

**Erwartetes Verhalten:**
- ✅ GPS-Punkte wurden weiter gesammelt
- ✅ Console zeigt Background-Logs
- ⚠️ Wake Lock könnte released sein (OS-Einstellung)

### iOS Safari (iOS 16.4+):
⚠️ **WICHTIG:** iOS hat strikte Background-Limitierungen

**Einschränkungen:**
- Wake Lock unterstützt ab iOS 16.4
- Background-Tracking sehr limitiert
- App muss im Vordergrund bleiben

**Test:**
1. Tracking starten
2. **NICHT** Display sperren
3. **NICHT** App wechseln
4. Display bleibt wach → ✅ funktioniert

**Wenn App gewechselt:**
- GPS wird nach ~3 Minuten pausiert (iOS-Limitierung)
- Wake Lock wird released
- Nur Web Push Notifications könnten helfen (Phase 4)

---

## Test 8: Browser-Kompatibilität ✅

### Chrome/Edge (Beste Unterstützung):
- ✅ Wake Lock funktioniert perfekt
- ✅ Background-Tracking zuverlässig
- ✅ Alle Features verfügbar

### Firefox:
- ✅ Wake Lock ab Version 126
- ✅ Background-Tracking funktioniert
- ⚠️ Einige Privacy-Settings können GPS blockieren

### Safari Desktop:
- ✅ Wake Lock ab macOS Ventura (13.0)
- ✅ Background-Tracking funktioniert
- ⚠️ Location-Permission erforderlich

### Ältere Browser:
**Ohne Wake Lock Unterstützung:**
```
⚠️ Wake Lock API not supported
```
- ✅ App funktioniert weiterhin
- ⚠️ Display kann einschlafen
- ✅ GPS-Tracking läuft trotzdem (wenn Display an)

---

## Test 9: Long-Running Test (30+ Minuten) ⏱️

### Schritte:
1. **Aktivität starten**
2. **30 Minuten lang tracken** (z.B. Fahrradtour)
3. **Zwischendurch:**
   - Tab wechseln (5 Minuten)
   - Zurück zur App
   - Wieder Tab wechseln
   
4. **Browser Console überwachen:**
   - Heartbeat sollte durchgehend alle 15s kommen
   - GPS-Updates kontinuierlich
   - Sync alle 30s

### Erfolgskriterien:
- ✅ Keine Memory Leaks
- ✅ Wake Lock bleibt aktiv
- ✅ GPS-Tracking kontinuierlich
- ✅ Sync funktioniert durchgehend
- ✅ Alle GPS-Punkte gesammelt

---

## Test 10: Battery Impact 🔋

### Monitoring:
1. **Batterie-Stand notieren** (vor Start)
2. **1 Stunde tracken**
3. **Batterie-Stand notieren** (nach Ende)

**Erwarteter Verbrauch:**
- 📱 Mobile: ~5-10% pro Stunde (mit GPS + Wake Lock)
- 💻 Desktop: ~2-5% pro Stunde (minimal)

**Optimierungen aktiv:**
- GPS nur bei Bewegung >5m
- Sync-Batching alle 30s
- Wake Lock nur während Tracking

---

## Troubleshooting 🔧

### Problem: Wake Lock funktioniert nicht
**Mögliche Ursachen:**
1. Browser zu alt (Chrome <84, Safari <16.4, Firefox <126)
2. HTTPS erforderlich (localhost OK)
3. User-Permissions verweigert

**Lösung:**
- Browser updaten
- HTTPS verwenden
- Feature-Detection prüft automatisch

### Problem: GPS-Tracking stoppt im Background
**Mögliche Ursachen:**
1. iOS-Limitierungen (App-Wechsel)
2. Aggressive Battery-Saver
3. Browser-Privacy-Settings

**Lösung:**
- Android: Battery-Saver deaktivieren
- iOS: App im Vordergrund lassen
- Browser-Permissions prüfen

### Problem: Heartbeat stoppt
**Mögliche Ursachen:**
1. Tab wurde suspended (Browser-Optimierung)
2. Display Sleep trotz Wake Lock
3. JavaScript Error

**Lösung:**
- Browser Console prüfen auf Errors
- Wake Lock Status prüfen
- Tab im Vordergrund lassen

---

## Erfolgs-Checkliste ✅

Nach allen Tests sollten folgende Features funktionieren:

- [x] Wake Lock aktiviert beim Tracking-Start
- [x] Wake Lock released bei Pause/Stop
- [x] Display bleibt wach während Tracking
- [x] Background-Modus Detection (Tab-Wechsel)
- [x] GPS-Updates auch im Background
- [x] Heartbeat alle 15 Sekunden
- [x] UI-Indikatoren (Wake Lock, Background-Modus)
- [x] GPS-Timeout erhöht (30s statt 10s)
- [x] Sync alle 30s (statt 60s)
- [x] Background-Status in Logs
- [x] Browser-Kompatibilität mit Fallbacks
- [x] Keine Memory Leaks
- [x] Akzeptabler Battery-Verbrauch

---

## Nächste Schritte 🚀

Wenn alle Tests erfolgreich:
1. ✅ Production-Build erstellen
2. ✅ Deployment auf Server
3. ✅ Real-World Testing
4. ⏳ Phase 3 starten: Service Worker + Background Sync

---

**Test-Status: ⏳ BEREIT FÜR TESTING**
