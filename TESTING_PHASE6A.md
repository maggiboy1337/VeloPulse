# Testing Phase 6a: Öffentliche Live-Karte

## ✅ Phase 6a abgeschlossen!

Diese Phase implementiert eine **öffentlich zugängliche Karten-Ansicht** (ohne Login erforderlich), die alle aktiven Live-Sessions in Echtzeit anzeigt.

## 🎯 Implementierte Features

### 1. **Öffentliche Karten-Seite** (`/public/map`)
   - **KEIN LOGIN ERFORDERLICH** - Jeder kann die Karte sehen
   - Leaflet-Karte mit OpenStreetMap-Tiles
   - Zeigt alle öffentlichen Live-Sessions
   - Auto-Refresh alle 10 Sekunden
   - Automatisches Fitting der Karte auf alle Marker

### 2. **Live-Session-Marker**
   - Rote Marker für aktive Fahrer
   - Klickbare Marker mit Popup-Details
   - Avatar oder Initialen des Fahrers
   - Letzte Update-Zeit anzeigen
   - Genauigkeits-Anzeige

### 3. **Session-Details im Popup**
   - Fahrer-Name & Avatar
   - Distanz
   - Geschwindigkeit (wenn geteilt)
   - Dauer der Session
   - Puls (wenn geteilt)
   - Route-Fortschritt (wenn Route vorhanden)

### 4. **Route-Anzeige**
   - Geplante Route als gestrichelte graue Linie
   - Sichtbar wenn Session mit Route gestartet wurde

### 5. **Sidebar mit Session-Liste**
   - Alle aktiven Sessions aufgelistet
   - Live-Badge mit Pulsierung
   - Click-to-Highlight auf Karte
   - Responsive (wird zu Accordion auf Mobile)

### 6. **Dashboard-Integration**
   - Neuer "Live-Karte" Button im Schnellzugriff
   - Direkter Link zu `/public/map`

---

## 🧪 Test-Szenario 1: Öffentliche Karte ohne Login

### Schritt 1: Direkter Zugriff (ohne Login)

```
1. Öffne einen INKOGNITO-Browser (Ctrl+Shift+N in Chrome)
2. URL: http://localhost:8080/public/map
```

**Erwartetes Verhalten:**
```
✅ Seite lädt OHNE Login-Redirect
✅ Header zeigt "🚴 Live-Tracking-Karte"
✅ Karte lädt mit München als Zentrum
✅ Sidebar zeigt "Keine aktiven Sessions" (noch keine Sessions gestartet)
✅ Auto-Refresh läuft (Zeitstempel aktualisiert sich alle 10s)
```

---

## 🧪 Test-Szenario 2: Session erstellen und auf Karte sehen

### Vorbereitung: Live-Session starten

#### Option A: Über UI (empfohlen)

```
1. Öffne normalen Browser (eingeloggt)
2. URL: http://localhost:8080/dashboard
3. Klicke "Tracking starten"
4. Wähle "Freies Tracking"
5. WICHTIG: ✅ "Live-Session öffentlich teilen" aktiviert lassen!
6. Name: "Testfahrt München"
7. Klicke "Tracking jetzt starten"
8. GPS-Permission erlauben
9. Warte bis erste GPS-Punkte erfasst werden (~10 Sekunden)
```

#### Option B: Per PowerShell-Script (schneller für Testing)

```powershell
# Erstelle Test-Session mit Live-Tracking
$baseUrl = "http://localhost:5000"
$email = "test@example.com"
$password = "Test123!"

# 1. Login
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email = $email
    password = $password
} | ConvertTo-Json)

$token = $loginResponse.token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Activity starten
$activityResponse = Invoke-RestMethod -Uri "$baseUrl/api/activities" -Method Post -Headers $headers -Body (@{
    routeId = $null
    name = "Test Öffentliche Session"
} | ConvertTo-Json)

$activityId = $activityResponse.id
Write-Host "✅ Activity gestartet: $activityId"

# 3. Öffentliche Live Session starten
$sessionResponse = Invoke-RestMethod -Uri "$baseUrl/api/live-sessions" -Method Post -Headers $headers -Body (@{
    activityId = $activityId
    isPublic = $true
} | ConvertTo-Json)

$sessionId = $sessionResponse.id
$publicSessionId = $sessionResponse.publicSessionId
Write-Host "✅ Live Session gestartet: $sessionId"
Write-Host "✅ Public Session ID: $publicSessionId"

# 4. GPS-Punkte senden (München Marienplatz)
$startLat = 48.1351
$startLon = 11.5820

Write-Host "`nSende GPS-Punkte..."

for ($i = 0; $i -lt 10; $i++) {
    # Simuliere Bewegung nach Norden
    $lat = $startLat + ($i * 0.0001)
    $lon = $startLon + ($i * 0.00005)
    
    $pointData = @{
        timestamp = (Get-Date).AddSeconds($i * 5).ToString("o")
        latitude = $lat
        longitude = $lon
        elevationMeters = 520.0
        speedKmh = 18.5
        accuracyMeters = 5.0
    }
    
    Invoke-RestMethod -Uri "$baseUrl/api/activities/$activityId/points" -Method Post -Headers $headers -Body ($pointData | ConvertTo-Json) | Out-Null
    
    Write-Host "  GPS-Punkt $($i + 1) gesendet"
    Start-Sleep -Milliseconds 200
}

# 5. Live Snapshot senden (für öffentliche Karte)
$snapshotData = @{
    latitude = $startLat + 0.0009
    longitude = $startLon + 0.00045
    gpsAccuracyMeters = 5.0
    speedKmh = 18.5
    distanceCompletedMeters = 1000.0
    distanceRemainingMeters = $null
    routeProgressPercent = $null
    heartRateBpm = 135
}

Invoke-RestMethod -Uri "$baseUrl/api/live-sessions/$sessionId/snapshots" -Method Post -Headers $headers -Body ($snapshotData | ConvertTo-Json) | Out-Null

Write-Host "`n✅ Test-Session erstellt und läuft!"
Write-Host "`n📍 Öffne jetzt: http://localhost:8080/public/map"
Write-Host "`nDrücke Enter zum Beenden..."
Read-Host
```

### Schritt 2: Öffentliche Karte öffnen

```
URL: http://localhost:8080/public/map (Inkognito-Browser)
```

**Erwartetes Verhalten:**
```
✅ Karte zeigt München-Zentrum
✅ Roter Marker erscheint an Session-Position
✅ Sidebar zeigt "1 aktive Session"
✅ Session-Card in Sidebar:
   - Avatar/Initial des Users
   - "LIVE" Badge (pulsierend)
   - Name: "Test Öffentliche Session" (oder dein Name)
   - Distanz: ~1.00 km
   - Geschwindigkeit: 18.5 km/h
   - Puls: 135 bpm
   - Dauer: ~Xmin
   - Zeit seit letztem Update: "vor Xs"
```

### Schritt 3: Marker-Interaktion

```
Aktion: Klicke auf den roten Marker
```

**Erwartetes Verhalten:**
```
✅ Popup öffnet sich
✅ Popup zeigt:
   - Avatar/Initial oben links
   - User-Name
   - "vor Xs" Zeit seit Update
   - Stats-Grid:
     * Distanz: 1.00 km
     * Geschwindigkeit: 18.5 km/h
     * Dauer: Xmin
     * Puls: 135 bpm
✅ Popup bleibt offen bis woanders geklickt
```

### Schritt 4: Sidebar-Interaktion

```
Aktion: Klicke auf Session-Card in Sidebar
```

**Erwartetes Verhalten:**
```
✅ Session-Card hebt sich hervor (blauer Border)
✅ Karte zentriert auf Session-Marker
✅ Marker bleibt fokussiert
```

### Schritt 5: Auto-Refresh beobachten

```
Aktion: Warte 10 Sekunden ohne Interaktion
```

**Erwartetes Verhalten:**
```
✅ Header-Zeitstempel aktualisiert sich
✅ "vor Xs" Update-Zeit in Cards aktualisiert sich
✅ Keine Fehler in Browser-Konsole
✅ Karte bleibt zentriert (kein Springen)
```

---

## 🧪 Test-Szenario 3: Mehrere Sessions gleichzeitig

### Vorbereitung: Mehrere Test-User & Sessions

```powershell
# Erstelle 3 verschiedene Sessions (erfordert 3 User)
# Führe setup-first-user.ps1 mehrmals mit verschiedenen Emails aus:

# User 1: test1@example.com
# User 2: test2@example.com  
# User 3: test3@example.com

# Dann für jeden User:
# 1. Einloggen
# 2. Activity starten
# 3. Live Session starten (isPublic = true)
# 4. GPS-Punkte senden an verschiedene Positionen:

# User 1: München Marienplatz (48.1351, 11.5820)
# User 2: München Olympiapark (48.1735, 11.5456)
# User 3: München Englischer Garten (48.1640, 11.6050)
```

**Alternative: Demo-Script für 3 Sessions:**

```powershell
# Demo: 3 aktive Sessions
$baseUrl = "http://localhost:5000"

# Array mit Test-Users (müssen existieren)
$users = @(
    @{ email = "test1@example.com"; password = "Test123!"; lat = 48.1351; lon = 11.5820; name = "Max" }
    @{ email = "test2@example.com"; password = "Test123!"; lat = 48.1735; lon = 11.5456; name = "Lisa" }
    @{ email = "test3@example.com"; password = "Test123!"; lat = 48.1640; lon = 11.6050; name = "Tom" }
)

foreach ($user in $users) {
    Write-Host "`nErstelle Session für $($user.name)..."
    
    # Login
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{
        email = $user.email
        password = $user.password
    } | ConvertTo-Json)
    
    $token = $loginResponse.token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Activity starten
    $activityResponse = Invoke-RestMethod -Uri "$baseUrl/api/activities" -Method Post -Headers $headers -Body (@{
        routeId = $null
        name = "Tour von $($user.name)"
    } | ConvertTo-Json)
    
    $activityId = $activityResponse.id
    
    # Live Session starten
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/api/live-sessions" -Method Post -Headers $headers -Body (@{
        activityId = $activityId
        isPublic = $true
    } | ConvertTo-Json)
    
    $sessionId = $sessionResponse.id
    
    # GPS-Punkte senden
    for ($i = 0; $i -lt 5; $i++) {
        $pointData = @{
            timestamp = (Get-Date).AddSeconds($i * 5).ToString("o")
            latitude = $user.lat + ($i * 0.0001)
            longitude = $user.lon + ($i * 0.00005)
            elevationMeters = 520.0
            speedKmh = 15.0 + (Get-Random -Minimum 0 -Maximum 10)
            accuracyMeters = 5.0
        }
        
        Invoke-RestMethod -Uri "$baseUrl/api/activities/$activityId/points" -Method Post -Headers $headers -Body ($pointData | ConvertTo-Json) | Out-Null
    }
    
    # Live Snapshot senden
    $snapshotData = @{
        latitude = $user.lat + 0.0004
        longitude = $user.lon + 0.0002
        gpsAccuracyMeters = 5.0
        speedKmh = 18.5
        distanceCompletedMeters = 500.0
        heartRateBpm = 130 + (Get-Random -Minimum 0 -Maximum 20)
    }
    
    Invoke-RestMethod -Uri "$baseUrl/api/live-sessions/$sessionId/snapshots" -Method Post -Headers $headers -Body ($snapshotData | ConvertTo-Json) | Out-Null
    
    Write-Host "✅ Session für $($user.name) erstellt"
}

Write-Host "`n✅ Alle 3 Sessions laufen!"
Write-Host "`n📍 Öffne: http://localhost:8080/public/map"
```

### Öffentliche Karte öffnen

```
URL: http://localhost:8080/public/map
```

**Erwartetes Verhalten:**
```
✅ Header zeigt "3 aktive Sessions"
✅ Karte zeigt 3 rote Marker
✅ Karte zoomt automatisch um alle 3 Marker zu zeigen
✅ Sidebar zeigt 3 Session-Cards
✅ Jede Card zeigt:
   - Verschiedene Namen (Max, Lisa, Tom)
   - LIVE Badge
   - Individuelle Stats (Geschwindigkeit, Puls variieren)
✅ Click auf Card → Karte zentriert auf entsprechenden Marker
```

---

## 🧪 Test-Szenario 4: Session mit Route

### Vorbereitung: Route importieren & Session damit starten

```
1. Login: http://localhost:8080/dashboard
2. Navigiere zu: Gespeicherte Routen
3. Importiere GPX-Datei (z.B. test-route-muenchen.gpx)
4. Gehe zu: Tracking starten
5. Wähle: "Mit gespeicherter Route"
6. Wähle importierte Route
7. ✅ "Live-Session öffentlich teilen"
8. Klicke "Tracking jetzt starten"
```

### Öffentliche Karte öffnen

```
URL: http://localhost:8080/public/map
```

**Erwartetes Verhalten:**
```
✅ Marker für Session erscheint
✅ Gestrichelte graue Linie zeigt geplante Route
✅ Popup zeigt zusätzlich:
   - "Route: 45%" (Fortschritt)
   - Route-Name im Session-Card
✅ Session-Card zeigt Route-Icon: 🛣️
```

---

## 🧪 Test-Szenario 5: Mobile Testing

### Test auf Smartphone (im gleichen WLAN)

#### Setup:
```powershell
# Finde deine IP:
ipconfig
# Beispiel: 192.168.1.100

# Öffne auf Smartphone:
http://192.168.1.100:8080/public/map
```

**Erwartetes Verhalten:**
```
✅ Seite lädt ohne Login
✅ Karte zeigt Sessions
✅ Responsive Layout:
   - Header: 2-zeilig
   - Karte: Obere 50% des Screens
   - Sidebar: Untere 50% des Screens (scrollbar)
✅ Touch-Bedienung:
   - Pinch-to-Zoom auf Karte funktioniert
   - Marker klickbar
   - Session-Cards klickbar
   - Sidebar scrollbar
✅ Performance:
   - Keine Lags bei Karten-Bewegung
   - Auto-Refresh störl nicht
```

---

## 🧪 Test-Szenario 6: Teilen-Funktion

### Use Case: Freund soll Session verfolgen

#### Schritt 1: Public Session ID finden

**Option A: Über Backend-Log**
```powershell
docker logs livetracking-backend | Select-String "PublicSessionId"
```

**Option B: Über Database**
```sql
SELECT "PublicSessionId", "IsPublic", "StartedAt" 
FROM "LiveSessions" 
WHERE "EndedAt" IS NULL AND "IsPublic" = true;
```

#### Schritt 2: Direkt-Link teilen

```
Format: http://localhost:8080/public/map?session=ABC123XYZ

Beispiel: http://localhost:8080/public/map?session=F3K9M2P7Q5
```

**Erwartetes Verhalten:**
```
✅ Seite lädt
✅ Karte zentriert automatisch auf diese spezifische Session
✅ Marker ist hervorgehoben
✅ Session-Card in Sidebar ist selected
```

> **Hinweis:** Query-Parameter-Logik muss noch implementiert werden (Feature-Erweiterung)

---

## 🧪 Test-Szenario 7: Performance mit vielen Sessions

### Test: 20+ gleichzeitige Sessions

```powershell
# Performance-Test: 20 Sessions erstellen
# (erfordert viele Test-User oder Loop mit Token-Refresh)

# Vereinfachter Test: Manuelle DB-Inserts
# oder Demo-Data-Seeder erweitern
```

**Erwartetes Verhalten:**
```
✅ Karte lädt in < 2 Sekunden
✅ Alle Marker werden gerendert
✅ Karte zoomt um alle Marker zu zeigen
✅ Auto-Refresh bleibt flüssig
✅ Sidebar scrollt flüssig durch 20+ Cards
✅ Keine Memory-Leaks (DevTools Memory Tab)
```

---

## 🧪 Test-Szenario 8: Edge Cases

### Test 8.1: Keine aktiven Sessions

```
Aktion: Stoppe alle Sessions oder öffne leere DB
URL: http://localhost:8080/public/map
```

**Erwartetes Verhalten:**
```
✅ Header zeigt "Keine aktiven Sessions"
✅ Karte zeigt München (Default-Center)
✅ Sidebar zeigt Empty-State:
   - Icon: 🚴
   - Text: "Keine aktiven Sessions"
   - Hint: "Starte eine öffentliche Live-Session..."
✅ Keine Fehler
```

### Test 8.2: Session endet während Betrachtung

```
Aktion:
1. Öffentliche Karte öffnen (Session läuft)
2. In anderem Tab: Session beenden
3. Warte auf Auto-Refresh (10s)
```

**Erwartetes Verhalten:**
```
✅ Nach 10s: Marker verschwindet
✅ Session-Card verschwindet
✅ Header aktualisiert Count
✅ Wenn keine Sessions mehr: Empty-State
```

### Test 8.3: Session ohne GPS-Snapshots

```
Aktion: Starte Live-Session aber sende KEINE Snapshots
```

**Erwartetes Verhalten:**
```
✅ Session erscheint NICHT auf Karte
✅ Sidebar zeigt "Keine aktiven Sessions"
✅ Keine Fehler/Crashes
```

### Test 8.4: Session mit alter Position (>5min)

```
Aktion: Snapshot ist >5 Minuten alt
```

**Erwartetes Verhalten:**
```
✅ Session wird trotzdem angezeigt
✅ Zeit: "vor 5min", "vor 10min", etc.
✅ Ggf. visuelles "Stale"-Indicator (optional)
```

---

## 🛠️ Debugging-Tipps

### Backend-API checken:

```powershell
# Alle öffentlichen Sessions abrufen
curl http://localhost:5000/api/public/live-sessions

# Erwartete Response:
[
  {
    "publicSessionId": "ABC123",
    "displayName": "Max Mustermann",
    "profileImageUrl": null,
    "startedAt": "2024-01-15T10:30:00Z",
    "currentSnapshot": {
      "timestampUtc": "2024-01-15T10:35:00Z",
      "latitude": 48.1351,
      "longitude": 11.5820,
      "speedKmh": 18.5,
      "distanceCompletedMeters": 1000,
      "heartRateBpm": 135
    },
    "routePoints": null
  }
]
```

### Browser-Konsole checken:

**Normale Ausgabe:**
```javascript
// Keine Fehler
// Fetch-Requests alle 10 Sekunden:
// GET http://localhost:5000/api/public/live-sessions → Status 200
```

**Fehlersuche:**
```javascript
// CORS-Fehler? → CORS Policy im Backend checken
// 404 Not Found? → Route falsch konfiguriert
// Empty Array []? → Keine öffentlichen Sessions aktiv
```

### Network-Traffic analysieren:

```
DevTools → Network Tab

Erwartete Requests:
- GET /api/public/live-sessions (alle 10s)
- Status: 200 OK
- Response-Size: Variiert je nach Sessions
- Duration: < 500ms
```

---

## ✅ Acceptance Criteria - Checkliste

### Core Functionality:
- [ ] Öffentliche Karte lädt OHNE Login
- [ ] Route `/public/map` ist erreichbar
- [ ] API-Call `GET /api/public/live-sessions` funktioniert
- [ ] Aktive Sessions werden auf Karte angezeigt
- [ ] Marker sind klickbar und zeigen Details
- [ ] Sidebar zeigt Session-Liste
- [ ] Auto-Refresh alle 10 Sekunden funktioniert

### User Experience:
- [ ] Karte zentriert automatisch auf alle Sessions
- [ ] Session-Cards sind klickbar und highlighten Marker
- [ ] Empty-State bei keinen Sessions
- [ ] Loading-State beim initialen Laden
- [ ] Timestamps sind benutzerfreundlich formatiert

### Data Display:
- [ ] Fahrer-Name korrekt angezeigt
- [ ] Avatar/Initial angezeigt wenn kein Bild
- [ ] Distanz formatiert (km/m)
- [ ] Geschwindigkeit angezeigt (wenn geteilt)
- [ ] Puls angezeigt (wenn geteilt)
- [ ] Route-Polyline angezeigt (wenn vorhanden)
- [ ] Route-Fortschritt angezeigt (wenn vorhanden)

### Responsive Design:
- [ ] Desktop: Sidebar rechts neben Karte
- [ ] Tablet: Sidebar bleibt rechts, schmaler
- [ ] Mobile: Sidebar unter Karte, 50/50 Split
- [ ] Touch-Bedienung funktioniert (Pinch, Pan)

### Performance:
- [ ] Initial Load < 2 Sekunden
- [ ] Auto-Refresh läuft flüssig
- [ ] Keine Memory-Leaks
- [ ] 20+ Sessions ohne Lag

### Integration:
- [ ] Link vom Dashboard funktioniert
- [ ] Navigation zurück zum Dashboard möglich (Browser Back-Button)
- [ ] Keine Konflikte mit private Routes

---

## 🎉 Testing abgeschlossen!

Wenn alle Tests erfolgreich sind, ist **Phase 6a** vollständig funktional!

**Nächste Phase:** Phase 6b - Offline GPS-Speicherung mit IndexedDB

---

## 📞 Support & Troubleshooting

### Problem: "Keine aktiven Sessions" obwohl Sessions laufen

**Lösung:**
1. Check: Sind Sessions `isPublic = true`?
   ```sql
   SELECT "IsPublic", "EndedAt" FROM "LiveSessions";
   ```
2. Check: Haben Sessions Snapshots?
   ```sql
   SELECT COUNT(*) FROM "LiveSnapshots";
   ```
3. Backend-Log checken:
   ```powershell
   docker logs livetracking-backend --tail 50
   ```

### Problem: Karte zeigt falsche Position

**Lösung:**
1. Check GPS-Koordinaten im Snapshot
2. Latitude/Longitude vertauscht?
3. Falsche Dezimaltrennzeichen?

### Problem: Auto-Refresh funktioniert nicht

**Lösung:**
1. Browser-Konsole auf Errors checken
2. Network-Tab: Sind Requests blockiert?
3. Backend erreichbar? `curl http://localhost:5000/api/public/live-sessions`

---

**Viel Erfolg beim Testen! 🚴‍♂️🌍**
