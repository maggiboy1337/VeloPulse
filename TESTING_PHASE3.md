# 🚴 VeloPulse - Phase 3 Testing

## ✅ Phase 3 erfolgreich abgeschlossen: Activity History & Route Management

### 🎯 Neue Features:

#### **Backend (ASP.NET Core):**
✅ **Activities-Controller erweitert:**
- `GET /api/activities` - Liste aller Activities (mit Filter & Limit)
- `GET /api/activities/{id}/details` - Activity-Details mit GPS-Track
- Filter nach Status: `?status=Finished`
- Limit: `?limit=10`

✅ **Neue DTOs:**
- `ActivityDetailDto` - Mit vollständigen GPS-Punkten
- `ActivityPointDto` - GPS-Punkt mit allen Daten
- Downsampling auf max 1000 Punkte für Performance

#### **Frontend (React + TypeScript):**
✅ **Gespeicherte Strecken-Seite** (`SavedRoutes.tsx`)
- Liste aller importierten Routen
- Statistiken: Distanz, Höhe, Anstieg, Erstelldatum
- Actions: Tracking starten, Details, Löschen
- Empty-State für neue Nutzer
- Responsive Grid-Layout

✅ **Gefahrene Routen-Seite** (`CompletedActivities.tsx`)
- Liste aller abgeschlossenen Fahrten
- Statistiken: Distanz, Dauer, Durchschnittsgeschwindigkeit
- Route-Badge wenn mit Route gefahren
- Klickbar für Details (Detail-View in zukünftiger Phase)
- Empty-State mit "Erste Fahrt starten"-Button

✅ **useActivities Hook erweitert:**
- `getActivities()` - Liste laden
- `getActivityDetails()` - Details mit GPS-Track
- TypeScript-Interfaces für alle Datentypen

✅ **Responsive Design:**
- Desktop: Grid-Layout mit Cards
- Mobile: Single-Column-Layout
- Touch-optimierte Buttons

---

## 🐳 Docker-Container gestartet

Die Anwendung läuft mit Phase 3:

**Frontend:** http://localhost:8080  
**Backend API:** http://localhost:5000  
**Datenbank:** PostgreSQL auf Port 5432

---

## 🧪 Test-Anweisungen

### 1. Öffne die Anwendung
```
http://localhost:8080
```

### 2. Login
- E-Mail: `test@velopulse.de`
- Passwort: `Test123!@#`

### 3. Navigation testen

**Gespeicherte Strecken:**
- Klicke in der Navigation auf **"Gespeicherte Strecken"**
- ✅ Wenn keine Routen: Empty-State wird angezeigt
- ✅ Wenn Routen vorhanden: Grid mit Route-Cards

**Gefahrene Routen:**
- Klicke in der Navigation auf **"Gefahrene Routen"**
- ✅ Wenn keine Fahrten: Empty-State mit "Erste Fahrt starten"-Button
- ✅ Wenn Fahrten vorhanden: Liste mit Activity-Cards

### 4. Test-Daten erstellen

Da wahrscheinlich noch keine Daten vorhanden sind, erstelle Test-Daten:

#### **Test-Activity erstellen (PowerShell):**

```powershell
# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body (@{
    email = "test@velopulse.de"
    password = "Test123!@#"
} | ConvertTo-Json) -ContentType "application/json"

$token = $loginResponse.accessToken

# Activity 1: Kurze Morgenrunde
$activity1 = Invoke-RestMethod -Uri "http://localhost:5000/api/activities" -Method POST -Headers @{
    Authorization = "Bearer $token"
} -Body (@{
    name = "Morgenrunde"
} | ConvertTo-Json) -ContentType "application/json"

# Simulate some distance
$update = @{
    TotalDistanceMeters = 5200
    AverageSpeedKmh = 18.5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/activities/$($activity1.id)/finish" -Method POST -Headers @{
    Authorization = "Bearer $token"
}

# Activity 2: Längere Tour
$activity2 = Invoke-RestMethod -Uri "http://localhost:5000/api/activities" -Method POST -Headers @{
    Authorization = "Bearer $token"
} -Body (@{
    name = "Feierabendrunde"
} | ConvertTo-Json) -ContentType "application/json"

Invoke-RestMethod -Uri "http://localhost:5000/api/activities/$($activity2.id)/finish" -Method POST -Headers @{
    Authorization = "Bearer $token"
}

# Activity 3: Wochenendtour
$activity3 = Invoke-RestMethod -Uri "http://localhost:5000/api/activities" -Method POST -Headers @{
    Authorization = "Bearer $token"
} -Body (@{
    name = "Wochenendtour am Fluss"
} | ConvertTo-Json) -ContentType "application/json"

Invoke-RestMethod -Uri "http://localhost:5000/api/activities/$($activity3.id)/finish" -Method POST -Headers @{
    Authorization = "Bearer $token"
}

Write-Host "✅ 3 Test-Activities erstellt! Lade die Seiten neu."
```

### 5. Teste "Gefahrene Routen"-Seite

Nach dem Erstellen der Test-Activities:
- ✅ Aktualisiere die Seite `F5`
- ✅ **3 Activity-Cards** werden angezeigt
- ✅ Jede Card zeigt:
  - Name der Tour
  - Datum & Uhrzeit
  - Distanz (noch 0 bei Test-Daten)
  - Dauer
  - Durchschnittsgeschwindigkeit
- ✅ **Hover-Effekt**: Card hebt sich hervor
- ✅ **Pfeil-Icon** bewegt sich bei Hover
- ✅ **Klick** auf Card führt zu Details (noch Placeholder)

### 6. Teste "Gespeicherte Strecken"-Seite

Falls du bereits GPX-Routen importiert hast:
- ✅ Route-Cards zeigen Statistiken
- ✅ **"Tracking starten"**-Button
- ✅ **"Details"**-Button
- ✅ **Löschen-Button** (🗑️)
- ✅ Bestätigungsdialog beim Löschen

**GPX-Route importieren** (falls noch keine vorhanden):
- Nutze das ProfileModal (Avatar → Profil → Routen-Tab)
- ODER verwende API direkt

---

## 📊 Neue API-Endpunkte (Phase 3)

### GET `/api/activities`
Liefert Liste aller Activities des Nutzers:
```http
GET /api/activities?status=Finished&limit=10
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "...",
    "name": "Morgenrunde",
    "status": "Finished",
    "startedAt": "2026-06-12T08:30:00Z",
    "finishedAt": "2026-06-12T09:15:00Z",
    "totalDistanceMeters": 5200,
    "averageSpeedKmh": 18.5,
    "routeId": null,
    "routeName": null
  }
]
```

### GET `/api/activities/{id}/details`
Liefert Activity-Details mit GPS-Track:
```http
GET /api/activities/{id}/details
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "...",
  "name": "Morgenrunde",
  "status": "Finished",
  "startedAt": "2026-06-12T08:30:00Z",
  "finishedAt": "2026-06-12T09:15:00Z",
  "totalDistanceMeters": 5200,
  "averageSpeedKmh": 18.5,
  "maxSpeedKmh": 32.4,
  "durationMinutes": 45,
  "points": [
    {
      "timestamp": "2026-06-12T08:30:00Z",
      "latitude": 48.1351,
      "longitude": 11.5820,
      "elevationMeters": 520,
      "speedKmh": 15.2,
      "accuracyMeters": 5.0,
      "distanceFromStartMeters": 0
    },
    ...
  ]
}
```

---

## 🎨 UI-Komponenten

### **Gespeicherte Strecken:**
- **Route-Cards** im Grid-Layout
- **Statistik-Icons**: 📏 📈 ⛰️ 📅
- **Action-Buttons**: Tracking starten, Details, Löschen
- **Hover-Effekte**: Card hebt sich hervor
- **Empty-State**: Für neue Nutzer

### **Gefahrene Routen:**
- **Activity-Cards** in Liste
- **Route-Badge**: Zeigt verknüpfte Route an
- **Statistiken**: Distanz, Dauer, Speed
- **Pfeil-Icon**: Bewegt sich bei Hover
- **Empty-State**: Mit "Erste Fahrt starten"-Button

### **Responsive:**
- **Desktop**: Grid-Layout (Routen) / Liste (Activities)
- **Tablet**: Angepasstes Grid
- **Mobile**: Single-Column, Touch-optimiert

---

## 🔧 Technische Details

### **Backend:**
- **Downsampling**: GPS-Tracks mit > 1000 Punkten werden für Performance reduziert
- **Filterung**: Nach Status (Active, Paused, Finished)
- **Limit**: Anzahl der Ergebnisse begrenzen
- **Authorization**: Nur eigene Activities

### **Frontend:**
- **Error Handling**: Fehler werden angezeigt
- **Loading States**: Spinner während des Ladens
- **Empty States**: Hilfreiche Hinweise für neue Nutzer
- **Navigation**: State-basierte Weiterleitung (`state: { routeId }`)

---

## 🐛 Troubleshooting

### Seite zeigt "Fehler beim Laden"?
1. Backend läuft? → `docker ps`
2. Token gültig? → Neu einloggen
3. Browser-Console (F12) → Network-Tab prüfen

### Keine Activities werden angezeigt?
```bash
# Prüfe Datenbank
docker exec -it livetracking-postgres psql -U postgres -d livetracking -c "SELECT * FROM \"Activities\" WHERE \"Status\" = 2;"
```

### Keine Routen vorhanden?
- Importiere GPX-Datei über ProfileModal
- ODER verwende API: `POST /api/routes/import-gpx`

---

## ✅ Checklist für Testing

- [ ] Login funktioniert
- [ ] Navigation zu "Gespeicherte Strecken" funktioniert
- [ ] Navigation zu "Gefahrene Routen" funktioniert
- [ ] Empty-States werden angezeigt (wenn keine Daten)
- [ ] Test-Activities erstellen funktioniert
- [ ] Activity-Cards werden angezeigt (mit Daten)
- [ ] Route-Cards werden angezeigt (falls Routen vorhanden)
- [ ] Hover-Effekte funktionieren
- [ ] Buttons sind klickbar
- [ ] Mobile-Ansicht funktioniert (Browser kleiner machen)
- [ ] Löschen-Button funktioniert (mit Bestätigung)

---

## 🚀 Nächste Schritte: Phase 4

Nach erfolgreichem Test implementiere ich:

### **Phase 4: Tracking Start & Activity Details**
1. ✅ **Tracking-Start-Seite**
   - Option 1: Freies Tracking (ohne Route)
   - Option 2: Mit ausgewählter Route
   - GPS-Permission-Check
   - Route-Auswahl-Modal

2. ✅ **Activity-Detail-View**
   - Karte mit GPS-Track
   - Höhenprofil
   - Detaillierte Statistiken
   - Export-Funktionen (GPX, PDF)

3. ✅ **Route-Detail-View**
   - Karte mit Route
   - Höhenprofil
   - Statistiken
   - "Tracking starten"-Button

---

## 📝 Feedback erwünscht:

Bitte teste:
- ✅ Seiten laden ohne Fehler?
- ✅ Empty-States erscheinen korrekt?
- ✅ Activity-Cards zeigen richtige Daten?
- ✅ Navigation funktioniert?
- ✅ Buttons sind funktional?
- ✅ UI ist übersichtlich?

**Die Anwendung ist bereit unter:** http://localhost:8080 🚴‍♂️

Sag Bescheid, wenn alles funktioniert, dann machen wir weiter mit Phase 4!
