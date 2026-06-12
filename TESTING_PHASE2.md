# 🚴 VeloPulse - Phase 2 Testing

## ✅ Phase 2 erfolgreich abgeschlossen: Dashboard mit echten Daten

### 🎯 Neue Features:

- ✅ **Dashboard-Controller** im Backend
- ✅ **Statistik-Berechnung** aus abgeschlossenen Activities
- ✅ **Echte Daten** vom Server statt Dummy-Werte
- ✅ **Aktive Sessions** werden angezeigt
- ✅ **Letzte Aktivitäten** werden angezeigt
- ✅ **Detaillierte Statistiken**: Woche, Monat, längste Tour, etc.

---

## 🐳 Docker-Container gestartet

Die Anwendung läuft jetzt in Docker mit Phase 2:

**Frontend:** http://localhost:8080  
**Backend API:** http://localhost:5000  
**Datenbank:** PostgreSQL auf Port 5432

---

## 🧪 Test-Anweisungen

### 1. Öffne die Anwendung
```
http://localhost:8080
```

### 2. Login mit bestehendem Benutzer
Falls du bereits einen Benutzer aus Phase 1 hast:
- E-Mail: `test@velopulse.de`
- Passwort: `Test123!@#`

**ODER** Registriere einen neuen Benutzer

### 3. Dashboard wird geladen
- ✅ **Loading-Spinner** wird kurz angezeigt
- ✅ Dashboard lädt **echte Daten** vom Backend
- ✅ Wenn noch keine Fahrten vorhanden: Alle Werte sind 0
- ✅ **Welcome-Box** wird angezeigt (für neue Nutzer)

### 4. Teste mit echten Daten

Da du wahrscheinlich noch keine Fahrten hast, kannst du Test-Daten erstellen:

#### Option A: Manuell eine Test-Activity erstellen (via API)

**Öffne ein neues PowerShell-Fenster:**

```powershell
# Login und Token holen
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body (@{
    email = "test@velopulse.de"
    password = "Test123!@#"
} | ConvertTo-Json) -ContentType "application/json"

$token = $loginResponse.accessToken

# Test-Activity erstellen
$activityResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/activities" -Method POST -Headers @{
    Authorization = "Bearer $token"
} -Body (@{
    routeId = $null
    name = "Testfahrt 1"
} | ConvertTo-Json) -ContentType "application/json"

$activityId = $activityResponse.id
Write-Host "Activity created: $activityId"

# Activity beenden (mit Distanz)
Invoke-RestMethod -Uri "http://localhost:5000/api/activities/$activityId/finish" -Method POST -Headers @{
    Authorization = "Bearer $token"
}

Write-Host "Activity finished! Reload Dashboard to see stats."
```

#### Option B: GPX-Route importieren und Tour simulieren

Falls du das **ProfileModal** verwendest (aus früheren Versionen):
1. Öffne Profil (Avatar oben rechts)
2. Klicke auf "Routen"-Tab
3. Lade eine GPX-Datei hoch
4. Starte eine Tour mit dieser Route

### 5. Dashboard nach Test-Daten aktualisieren

**Aktualisiere die Seite:** `F5` oder `Ctrl+R`

Jetzt solltest du sehen:
- ✅ **Gesamtkilometer** > 0
- ✅ **Anzahl Fahrten** > 0
- ✅ **Gesamtzeit** angezeigt
- ✅ **Durchschnittsgeschwindigkeit** (falls Speed-Daten vorhanden)
- ✅ **Diese Woche / Dieser Monat** Kilometer

### 6. Teste "Letzte Aktivitäten"-Sektion

Wenn du mehrere Test-Activities erstellt hast:
- ✅ **Letzte 5 Aktivitäten** werden angezeigt
- ✅ Name, Datum, Distanz, Dauer, Geschwindigkeit
- ✅ Hover-Effekt auf Activity-Cards
- ✅ Button "Alle Aktivitäten anzeigen" (führt zu Placeholder-Seite)

### 7. Teste "Aktive Sessions"-Sektion

Wenn eine Live-Session läuft:
- ✅ **Grüner Border** um Session-Card
- ✅ "● Live"-Badge pulsiert
- ✅ Aktuelle Distanz und Dauer werden angezeigt
- ✅ Button "Details anzeigen"

---

## 📊 Was zeigt das Dashboard jetzt?

### Statistik-Kacheln (alle mit echten Daten):
1. **📏 Gesamtkilometer** - Summe aller abgeschlossenen Fahrten
2. **📅 Dieser Monat** - Kilometer im aktuellen Monat
3. **📆 Diese Woche** - Kilometer in der aktuellen Woche (Mo-So)
4. **🎯 Anzahl Fahrten** - Anzahl abgeschlossener Activities
5. **⏱️ Gesamtzeit** - Summe aller Fahrzeiten
6. **⚡ Ø Geschwindigkeit** - Durchschnitt über alle Fahrten
7. **⛰️ Höhenmeter** - Aktuell 0 (wird später implementiert)
8. **🏆 Längste Tour** - Die Tour mit der größten Distanz

### Zusätzliche Sektionen:
- **🔴 Aktive Tracking-Sessions** (wenn vorhanden)
  - Live-Badge
  - Aktuelle Distanz
  - Laufende Dauer
  - Startzeit

- **📈 Letzte Aktivitäten** (die letzten 5)
  - Name
  - Datum & Uhrzeit
  - Distanz
  - Dauer
  - Durchschnittsgeschwindigkeit

- **Schnellzugriff-Buttons**
  - Aktive Sessions
  - Strecken
  - Aktivitäten

- **👋 Welcome-Box** (nur für neue Nutzer ohne Fahrten)

---

## 🆕 Backend-API-Endpunkte (NEU in Phase 2)

### GET `/api/dashboard`
Liefert komplette Dashboard-Daten:
```json
{
  "stats": {
    "totalDistanceKm": 125.5,
    "totalActivities": 15,
    "totalDurationMinutes": 420,
    "averageSpeedKmh": 18.5,
    "totalElevationMeters": 0,
    "currentMonthKm": 45.2,
    "currentWeekKm": 12.8,
    "longestTourKm": 35.7
  },
  "recentActivities": [...],
  "activeSessions": [...]
}
```

### GET `/api/dashboard/stats`
Liefert nur die Statistiken:
```json
{
  "totalDistanceKm": 125.5,
  "totalActivities": 15,
  ...
}
```

---

## 🔧 Technische Details

### Backend-Berechnung:
- **Woche**: Montag bis Sonntag
- **Monat**: Erster bis letzter Tag des aktuellen Monats
- **Nur abgeschlossene Activities** (`Status = Finished`)
- **Performance**: Alle Berechnungen auf Serverseite

### Frontend:
- **Lazy Loading**: Dashboard lädt beim ersten Aufruf
- **Error Handling**: Fehler werden angezeigt
- **Loading States**: Spinner während des Ladens
- **Formatierung**:
  - Distanz: `XX.X km`
  - Zeit: `Xh Xm` oder nur `Xm`
  - Datum: `TT.MM.JJJJ HH:MM`

---

## 🐛 Troubleshooting

### Dashboard zeigt immer noch 0-Werte?

**1. Prüfe Backend-Logs:**
```bash
docker logs livetracking-backend --tail 50
```

**2. Prüfe ob Activities in der Datenbank sind:**
```bash
docker exec -it livetracking-postgres psql -U postgres -d livetracking -c "SELECT * FROM \"Activities\" WHERE \"Status\" = 2;"
```
(Status 2 = Finished)

**3. Test API direkt:**
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@velopulse.de","password":"Test123!@#"}'

# Dashboard (mit Token)
curl http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Fehler "401 Unauthorized"?
- Token ist abgelaufen
- Logout und erneut einloggen

### Fehler beim Laden?
- Backend läuft nicht → `docker ps` prüfen
- CORS-Probleme → Browser-Console (F12) prüfen

---

## ✅ Checklist für Testing

- [ ] Login funktioniert
- [ ] Dashboard lädt ohne Fehler
- [ ] Statistik-Kacheln zeigen echte Werte (falls Daten vorhanden)
- [ ] Welcome-Box erscheint für neue Nutzer
- [ ] "Neue Fahrt starten"-Button funktioniert
- [ ] Navigation zu anderen Seiten funktioniert
- [ ] Aktive Sessions werden angezeigt (falls vorhanden)
- [ ] Letzte Aktivitäten werden angezeigt (falls vorhanden)
- [ ] Mobile-Ansicht funktioniert (Browser kleiner machen)
- [ ] Logout funktioniert

---

## 🚀 Nächste Schritte: Phase 3

Nach erfolgreichem Test implementiere ich:

### Phase 3: Activity History & Route Management
1. ✅ **Gespeicherte Strecken-Seite**
   - Liste aller Routen
   - Route Details anzeigen
   - Route löschen
   - GPX-Import (bereits vorhanden, aber UI verbessern)

2. ✅ **Gefahrene Routen-Seite**
   - Liste aller abgeschlossenen Activities
   - Activity Details mit Karte
   - GPS-Track anzeigen
   - Filterung & Sortierung

3. ✅ **Route Detail-View**
   - Karte mit Route
   - Höhenprofil
   - Statistiken

---

## 📝 Feedback erwünscht:

Bitte teste und gib Bescheid:
- ✅ Dashboard lädt echte Daten?
- ✅ Statistiken werden korrekt berechnet?
- ✅ Aktive Sessions werden angezeigt?
- ✅ Letzte Aktivitäten erscheinen?
- ✅ UI ist übersichtlich?
- ✅ Performance ist gut?

**Bereit für die Anwendung unter:** http://localhost:8080 🎉
