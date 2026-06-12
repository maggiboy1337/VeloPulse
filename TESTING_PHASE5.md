# Testing Phase 5: Live-Tracking-View

## ✅ Phase 5 abgeschlossen!

Diese Phase implementiert die Live-Tracking-Ansicht mit Echtzeit-GPS-Updates während einer aktiven Tracking-Session.

## 🎯 Implementierte Features

### 1. **Live-Tracking-Seite** (`/tracking/live/:id`)
   - Echtzeit-Karte mit GPS-Tracking
   - Automatische Position-Updates alle paar Sekunden
   - GPS-Track-Visualisierung als Polyline
   - Start-Marker (grün) und Current-Position-Marker (blau)
   - Automatisches Zentrieren auf aktuelle Position

### 2. **Live-Statistiken**
   - Distanz (Echtzeit-Berechnung mit Haversine-Formel)
   - Zeit (Stoppuhr)
   - Aktuelle Geschwindigkeit
   - Durchschnittsgeschwindigkeit
   - Maximale Geschwindigkeit
   - Anzahl GPS-Punkte

### 3. **Tracking-Controls**
   - **Pausieren** - Stoppt GPS-Tracking und Backend-Updates
   - **Fortsetzen** - Setzt GPS-Tracking fort
   - **Beenden** - Schließt Aktivität ab und navigiert zu Details

### 4. **GPS-Management**
   - Automatische GPS-Permission-Checks
   - Hochpräzises GPS-Tracking (`enableHighAccuracy: true`)
   - GPS-Status-Anzeige (verbunden/suche Signal)
   - Genauigkeitsanzeige in Metern
   - Fehlerbehandlung für GPS-Fehler
   - Automatisches Filtern von GPS-Drift (<5m Bewegung wird ignoriert)

### 5. **Backend-Integration**
   - Automatisches Senden von GPS-Punkten an `/api/activities/{id}/points`
   - Pause/Resume via `/api/activities/{id}/pause` und `/api/activities/{id}/resume`
   - Activity beenden via `/api/activities/{id}/finish`
   - Laden vorhandener GPS-Punkte beim Start

### 6. **Mobile-Optimierung**
   - Vollbild-Karte mit optimierter Touch-Bedienung
   - Responsive Stats-Grid (2 Spalten auf Mobile, 6 auf Desktop)
   - Große Touch-Targets für Controls
   - Landscape-Mode-Support

---

## 🧪 Test-Szenario 1: Kompletter Tracking-Workflow

### Voraussetzungen:
- Docker Container laufen (`docker-compose ps`)
- Bestehender User registriert
- Optional: Gespeicherte Route vorhanden

### Schritt-für-Schritt Test:

#### 1. **Login**
```
URL: http://localhost:8080/login
Credentials: Dein registrierter User
```

#### 2. **Tracking starten**
```
Navigation: Dashboard → "Tracking starten" Button
URL: http://localhost:8080/tracking/start

Aktion:
- Wähle "Freies Tracking" ODER "Mit Route"
- (Optional) Wähle eine gespeicherte Route
- Gib Namen ein: "Test Live-Tracking"
- Aktiviere "Öffentliche Live-Session"
- Klicke "Tracking starten"
```

⚠️ **Wichtig:** Wenn du auf einem Desktop-Browser testest:
- Browser wird GPS-Permission anfragen
- Falls keine GPS-Hardware: Browser simuliert GPS-Position
- Chrome DevTools: Mehr Tools → Sensoren → Location Override

#### 3. **Live-Tracking-View öffnet sich**
```
URL: http://localhost:8080/tracking/live/{activityId}

Erwartetes Verhalten:
✅ Karte lädt OpenStreetMap-Tiles
✅ "Warte auf GPS-Signal..." erscheint kurz
✅ Grüner Start-Marker erscheint an erster Position
✅ Blauer Current-Marker erscheint
✅ Live-Badge pulsiert oben rechts
✅ Statistiken zeigen:
   - Distanz: 0.00 km (steigt an)
   - Zeit: 00:00:00 (läuft)
   - Aktuell: X.X km/h
   - Ø Tempo: X.X km/h
   - Max: X.X km/h
   - Punkte: Anzahl GPS-Punkte
✅ GPS-Status: "GPS verbunden"
✅ Genauigkeit: "±Xm"
✅ Controls: "Pausieren" und "Beenden" Buttons
```

#### 4. **GPS-Tracking läuft**
```
Erwartetes Verhalten:
✅ Alle 5-10 Sekunden neuer GPS-Punkt
✅ Blaue Polyline wächst mit Bewegung
✅ Current-Marker bewegt sich
✅ Karte zentriert automatisch auf aktuelle Position
✅ Distanz erhöht sich
✅ Stoppuhr läuft
✅ Geschwindigkeiten aktualisieren sich
✅ Punkte-Zähler erhöht sich

Browser-Konsole Check:
- Keine Fehler
- Keine "Failed to send GPS point" Meldungen
```

#### 5. **Pausieren testen**
```
Aktion: Klicke "Pausieren" Button

Erwartetes Verhalten:
✅ Button ändert zu "Fortsetzen" (grün)
✅ GPS-Tracking stoppt
✅ Stoppuhr pausiert
✅ Keine neuen GPS-Punkte
✅ Backend erhält Pause-Request
```

#### 6. **Fortsetzen testen**
```
Aktion: Klicke "Fortsetzen" Button

Erwartetes Verhalten:
✅ Button ändert zu "Pausieren" (orange)
✅ GPS-Tracking startet erneut
✅ Stoppuhr läuft weiter
✅ Neue GPS-Punkte werden hinzugefügt
```

#### 7. **Beenden**
```
Aktion: Klicke "Beenden" Button

Erwartetes Verhalten:
✅ Bestätigungs-Dialog erscheint
✅ Bei "OK": Navigation zu Activity-Detail-Seite
✅ Activity-Detail zeigt kompletten GPS-Track
✅ Status ist "Finished"
✅ Alle Statistiken sind berechnet
```

---

## 🧪 Test-Szenario 2: GPS-Simulation mit Chrome DevTools

Für Testing ohne tatsächliche GPS-Hardware:

### Setup:
1. Öffne http://localhost:8080
2. Drücke **F12** (DevTools öffnen)
3. Drücke **Ctrl+Shift+P** (Command Palette)
4. Tippe: "Show Sensors"
5. Wähle "Sensors" Tab

### GPS-Position simulieren:

#### Variante A: Feste Position
```
Location: Custom location
Latitude: 48.1351
Longitude: 11.5820
(München, Marienplatz)
```

#### Variante B: Route simulieren
Erstelle mehrere Positionen manuell:

```javascript
// Position 1 (Start): München Marienplatz
Lat: 48.1351, Lon: 11.5820

// Position 2: 100m nach Norden
Lat: 48.1360, Lon: 11.5820

// Position 3: 100m nach Osten
Lat: 48.1360, Lon: 11.5835

// Position 4: 100m nach Norden
Lat: 48.1369, Lon: 11.5835
```

**Während Live-Tracking aktiv:**
- Ändere Position alle 10 Sekunden
- Beobachte, wie sich Track auf Karte aufbaut
- Prüfe, ob Distanz korrekt berechnet wird

---

## 🧪 Test-Szenario 3: Wiedereinstieg in laufende Session

### Test: Lade Seite neu während Tracking läuft

#### Vorbereitung:
1. Starte Live-Tracking
2. Lasse 30 Sekunden laufen (mehrere GPS-Punkte sammeln)
3. Notiere die aktuelle Distanz und Zeit

#### Aktion:
```
Drücke F5 (Seite neu laden)
```

#### Erwartetes Verhalten:
```
✅ Seite lädt neu
✅ "Lade Aktivität..." Spinner erscheint kurz
✅ Karte lädt mit ALLEN bisherigen GPS-Punkten
✅ Kompletter Track ist sichtbar (nicht nur neu aufbauend)
✅ Statistiken zeigen korrekte Distanz (nicht bei 0)
✅ Zeit läuft weiter (nicht von 0)
✅ GPS-Tracking setzt fort
✅ Neue Punkte werden hinzugefügt
```

---

## 🧪 Test-Szenario 4: Fehlerbehandlung

### Test 4.1: GPS-Berechtigung verweigern

#### Setup (Chrome):
```
1. Öffne http://localhost:8080
2. Settings (Icon links neben URL) → Site Settings
3. Location: Block
4. Seite neu laden
```

#### Starte Live-Tracking:
```
Erwartetes Verhalten:
✅ Fehlermeldung erscheint:
   "GPS-Berechtigung verweigert. Bitte erlauben Sie den Standortzugriff."
✅ Karte zeigt Platzhalter: "Warte auf GPS-Signal..."
✅ Keine GPS-Punkte werden gesammelt
✅ App stürzt NICHT ab
✅ Controls sind weiterhin bedienbar
```

### Test 4.2: GPS deaktiviert (Windows)

#### Setup:
```
Windows Settings → Datenschutz → Standort → Aus
```

#### Starte Live-Tracking:
```
Erwartetes Verhalten:
✅ Fehlermeldung: "GPS-Position nicht verfügbar. Bitte aktivieren Sie GPS."
✅ Karte zeigt Platzhalter
✅ App bleibt stabil
```

### Test 4.3: Backend nicht erreichbar

#### Setup:
```powershell
# Stoppe Backend-Container
docker stop livetracking-backend
```

#### Aktion:
```
Live-Tracking läuft → GPS-Punkt wird gesendet
```

#### Erwartetes Verhalten:
```
✅ GPS-Tracking läuft weiter (lokale Erfassung)
✅ Karte aktualisiert sich weiterhin
✅ Statistiken aktualisieren sich
✅ Konsolenfehler: "Failed to send GPS point"
✅ User sieht KEINE Fehlermeldung (Silent Fail)
✅ App funktioniert weiter
```

#### Cleanup:
```powershell
docker start livetracking-backend
```

---

## 🧪 Test-Szenario 5: Performance & Ressourcen

### Test 5.1: Lange Session (viele GPS-Punkte)

#### Vorbereitung:
Simuliere Session mit vielen Punkten via PowerShell:

```powershell
# Teste Phase 5 mit simulierten GPS-Daten
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
    name = "Performance Test - 500 Punkte"
} | ConvertTo-Json)

$activityId = $activityResponse.id
Write-Host "Activity gestartet: $activityId"

# 3. Live Session starten
$sessionResponse = Invoke-RestMethod -Uri "$baseUrl/api/live-sessions" -Method Post -Headers $headers -Body (@{
    activityId = $activityId
    isPublic = $true
} | ConvertTo-Json)

$sessionId = $sessionResponse.id
Write-Host "Live Session gestartet: $sessionId"

# 4. 500 GPS-Punkte simulieren (München Route)
$startLat = 48.1351
$startLon = 11.5820
$pointCount = 500

Write-Host "Sende $pointCount GPS-Punkte..."

for ($i = 0; $i -lt $pointCount; $i++) {
    # Simuliere Bewegung nach Norden und leicht nach Osten
    $lat = $startLat + ($i * 0.0001)  # ~11m pro Punkt
    $lon = $startLon + ($i * 0.00005) # ~5.5m pro Punkt
    
    # Simuliere Geschwindigkeit 15-25 km/h
    $speed = 15 + (Get-Random -Minimum 0 -Maximum 10)
    
    $timestamp = (Get-Date).AddSeconds($i * 5).ToString("o")
    
    $pointData = @{
        timestamp = $timestamp
        latitude = $lat
        longitude = $lon
        elevationMeters = 520 + (Get-Random -Minimum -5 -Maximum 5)
        speedKmh = $speed
        accuracyMeters = 5.0 + (Get-Random -Minimum -2 -Maximum 2)
    }
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/activities/$activityId/points" -Method Post -Headers $headers -Body ($pointData | ConvertTo-Json) | Out-Null
        
        if ($i % 50 -eq 0) {
            Write-Host "  → $i Punkte gesendet..."
        }
    } catch {
        Write-Host "Fehler bei Punkt $i : $_" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 10  # Kurze Pause zwischen Requests
}

Write-Host "`n✅ Test abgeschlossen!"
Write-Host "Activity ID: $activityId"
Write-Host "Öffne: http://localhost:8080/tracking/live/$activityId"
Write-Host "`nDrücke eine Taste zum Beenden..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
```

#### Dann in Browser:
```
URL: http://localhost:8080/tracking/live/{activityId}

Erwartetes Verhalten:
✅ Karte lädt ohne Verzögerung
✅ Alle 500 Punkte werden als Polyline angezeigt
✅ Karte ist interaktiv (Zoom, Pan funktioniert flüssig)
✅ Statistiken sind korrekt berechnet
✅ App ist responsive (keine Lags)
✅ Speicherverbrauch bleibt stabil
```

#### Performance Check:
```
Browser DevTools → Performance Tab
- Aufzeichnung starten
- Seite laden
- Aufzeichnung stoppen

Erwartete Werte:
✅ Initial Render: < 1 Sekunde
✅ Frame Rate: ~60 FPS bei Karten-Interaktion
✅ Memory: < 100 MB für komplette Session
```

### Test 5.2: Speicherlecks prüfen

#### Aktion:
```
1. Starte Live-Tracking
2. Lasse 5 Minuten laufen
3. Öffne DevTools → Memory Tab
4. Erstelle Heap Snapshot
5. Warte weitere 5 Minuten
6. Erstelle zweiten Heap Snapshot
7. Vergleiche
```

#### Erwartetes Ergebnis:
```
✅ Speicherverbrauch steigt linear mit GPS-Punkten
✅ Keine "Detached DOM Nodes"
✅ Keine unbegrenzten Array-Wachstum
✅ watchPosition wird korrekt bereinigt bei Unmount
```

---

## 🧪 Test-Szenario 6: Mobile Testing

### Test auf echtem Smartphone:

#### Voraussetzungen:
1. **Entwicklungs-PC und Smartphone im gleichen WLAN**
2. **PC's IP-Adresse ermitteln:**

```powershell
ipconfig
# Suche "IPv4-Adresse" unter "WLAN"
# Beispiel: 192.168.1.100
```

3. **CORS temporär erweitern** (nur für Testing):

```csharp
// backend/LiveTracking.Api/Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:8080", "http://192.168.1.100:8080")  // Füge deine IP hinzu
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

```powershell
# Neu bauen
docker-compose down
docker-compose up -d --build
```

4. **Auf Smartphone öffnen:**
```
URL: http://192.168.1.100:8080
```

#### Mobile Tests:

**Test 6.1: GPS-Genauigkeit im Freien**
```
Aktion:
- Gehe nach draußen (freie Sicht zum Himmel)
- Starte Live-Tracking
- Laufe/Fahre ~100m

Erwartetes Verhalten:
✅ GPS verbindet innerhalb 10 Sekunden
✅ Genauigkeit: ±5-15m (bei gutem Signal)
✅ Track folgt tatsächlicher Bewegung
✅ Keine wilden Sprünge
✅ Geschwindigkeit realistisch
```

**Test 6.2: Touch-Bedienung**
```
✅ Karte: Pinch-to-Zoom funktioniert
✅ Karte: Panning mit Finger funktioniert
✅ Buttons: Große Touch-Targets
✅ Buttons: Keine Fehlklicks
✅ Stats: Gut lesbar auf kleinem Screen
```

**Test 6.3: Landscape Mode**
```
Aktion: Drehe Smartphone ins Querformat

Erwartetes Verhalten:
✅ Layout passt sich an
✅ Stats-Grid zeigt alle 6 Karten in einer Reihe
✅ Karte nutzt volle Breite
✅ Controls bleiben bedienbar
```

**Test 6.4: Screen bleibt an**
```
Erwartetes Verhalten:
✅ Screen geht NICHT aus während Tracking
✅ App läuft weiter im Hintergrund
✅ GPS-Tracking läuft auch bei gesperrtem Screen
   (Browser-abhängig, bei PWA besser)
```

**Test 6.5: Batterieverbrauch**
```
Aktion: 30 Minuten Live-Tracking

Monitoring:
- Batterie-Stand vorher notieren
- Batterie-Stand nachher notieren

Erwartetes Verhalten:
✅ ~5-10% Batterieverbrauch pro Stunde
✅ Keine ungewöhnliche Hitzeentwicklung
```

---

## 🧪 Test-Szenario 7: Edge Cases

### Test 7.1: Aktivität ohne GPS-Punkte beenden

```
Aktion:
1. Starte Live-Tracking
2. Klicke sofort "Beenden" (vor erstem GPS-Punkt)

Erwartetes Verhalten:
✅ Bestätigung erscheint
✅ Activity wird beendet
✅ Navigation zu Detail-Seite
✅ Detail-Seite zeigt "Keine GPS-Daten"
✅ Distanz: 0 km
✅ Zeit: ~0 Minuten
✅ Keine App-Fehler
```

### Test 7.2: Sehr kurze Bewegungen (GPS-Drift Filter)

```
Aktion:
1. Starte Live-Tracking
2. Bleibe komplett stehen
3. Beobachte GPS-Updates

Erwartetes Verhalten:
✅ GPS-Drift (<5m) wird NICHT als Bewegung gezählt
✅ Distanz bleibt bei 0 oder steigt minimal
✅ Marker "zittert" leicht (normal)
✅ Polyline zeigt keine wilden Sprünge
```

### Test 7.3: Sehr hohe Geschwindigkeit

```
Aktion:
Simuliere unrealistisch hohe Geschwindigkeit (z.B. 200 km/h):

// In Chrome DevTools Sensors:
Location 1: 48.1351, 11.5820
(10 Sekunden warten)
Location 2: 48.2000, 11.6500  // ~10km entfernt
```

#### Erwartetes Verhalten:
```
✅ App akzeptiert Punkt (kein Filter)
✅ Geschwindigkeit zeigt 200+ km/h
✅ Max-Speed aktualisiert sich
✅ Distanz springt stark (korrekt)
✅ Keine App-Fehler
```

---

## 🛠️ Debugging-Tipps

### Browser-Konsole checken:

**Normale Ausgabe:**
```javascript
// Keine Fehler außer:
// (Optional) "Failed to send GPS point" bei Netzwerkproblemen
```

**Fehler-Suche:**
```javascript
// 401 Unauthorized → Token abgelaufen, neu einloggen
// 404 Not Found → Activity-ID ungültig
// Position error → GPS-Problem
```

### Backend-Logs checken:

```powershell
docker logs livetracking-backend -f
```

**Erwartete Logs während Live-Tracking:**
```
info: LiveTracking.Api.Controllers.ActivitiesController[0]
      POST /api/activities/{id}/points
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      INSERT INTO ActivityPoints ...
```

### Netzwerk-Traffic analysieren:

```
DevTools → Network Tab

Erwartete Requests während Tracking:
- POST /api/activities/{id}/points (alle 5-10 Sekunden)
- Status: 204 No Content
```

---

## ✅ Acceptance Criteria - Checkliste

Alle Features müssen funktionieren:

### Core Functionality:
- [ ] Live-Tracking-Seite lädt ohne Fehler
- [ ] GPS-Permission wird angefordert
- [ ] GPS-Tracking startet automatisch
- [ ] Karte zeigt aktuelle Position
- [ ] GPS-Track wird als Polyline gezeichnet
- [ ] Statistiken aktualisieren sich in Echtzeit
- [ ] Pausieren stoppt Tracking
- [ ] Fortsetzen startet Tracking neu
- [ ] Beenden schließt Activity ab und navigiert zu Details

### Data Integrity:
- [ ] GPS-Punkte werden an Backend gesendet
- [ ] Distanz wird korrekt berechnet (Haversine)
- [ ] Zeit läuft korrekt (Stoppuhr)
- [ ] Geschwindigkeiten sind realistisch
- [ ] GPS-Drift wird gefiltert (<5m)

### User Experience:
- [ ] Loading States sind sichtbar
- [ ] Fehlermeldungen sind verständlich
- [ ] Controls sind immer bedienbar
- [ ] Karte ist flüssig (60 FPS)
- [ ] Mobile Touch-Bedienung funktioniert

### Error Handling:
- [ ] GPS-Berechtigung verweigert → Fehlermeldung
- [ ] GPS nicht verfügbar → Fehlermeldung
- [ ] Backend nicht erreichbar → Silent Fail, Tracking läuft weiter
- [ ] Seite neu laden → Session wird fortgesetzt

### Performance:
- [ ] 500+ GPS-Punkte ohne Lag
- [ ] Keine Speicherlecks
- [ ] Batterieverbrauch akzeptabel (~5-10%/h)

---

## 🎉 Testing abgeschlossen!

Wenn alle Tests erfolgreich sind, ist **Phase 5** vollständig funktional!

**Nächste Phase:** Phase 6 - Offline GPS-Speicherung mit IndexedDB

---

## 📞 Support & Troubleshooting

### Problem: GPS funktioniert nicht im Browser

**Lösung:**
1. HTTPS erforderlich (außer localhost)
2. Permissions in Browser-Settings prüfen
3. Location Services im OS aktiviert?
4. Chrome DevTools Sensors als Fallback

### Problem: Karte lädt nicht

**Lösung:**
1. Internet-Verbindung prüfen (OpenStreetMap Tiles)
2. Browser-Konsole auf Leaflet-Fehler checken
3. CORS-Probleme? (DevTools Network Tab)

### Problem: Distanz steigt nicht

**Lösung:**
1. Bewegung > 5 Meter? (Drift-Filter)
2. GPS-Genauigkeit gut? (Check Accuracy-Anzeige)
3. Backend erhält Punkte? (Network Tab)

### Problem: App laggt bei vielen Punkten

**Lösung:**
1. Downsampling aktiviert? (Details-Endpoint limitiert auf 1000 Punkte)
2. Performance-Tab öffnen und Bottleneck identifizieren
3. Leaflet-Version aktuell?

---

**Viel Erfolg beim Testen! 🚴‍♂️📍**
