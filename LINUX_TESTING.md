# Test-Skripte für Linux

## Voraussetzungen

1. **jq** installieren (für JSON-Parsing):
```bash
sudo apt install jq
# ODER
sudo yum install jq
```

2. **PostgreSQL Client** installieren (für Datenbank-Tests):
```bash
sudo apt install postgresql-client
# ODER
sudo yum install postgresql
```

3. **curl** (sollte bereits installiert sein)

## Skripte ausführbar machen

```bash
chmod +x quick-test-gps.sh
chmod +x check-live-snapshots.sh
```

## Verwendung

### 1. Quick GPS Test (API-Test)

Testet ob die Public Live Sessions API erreichbar ist und GPS-Daten liefert:

```bash
./quick-test-gps.sh
```

**Ausgabe:**
```
========================================
Quick Test: GPS Live Map
========================================

Test 1: Fetching public live sessions...
✅ API erreichbar
   Sessions total: 1

Session Details:

  SessionId: N_dVssU80cAIhmZJO...
  User: Marc
  Started: 2025-01-19T14:23:45Z
  ✅ GPS: Lat=48.13510, Lon=11.58200
  ✅ Speed: 25.3 km/h
  ✅ Distance: 1234 m
  ✅ Timestamp: 2025-01-19T14:24:15Z

Zusammenfassung:
  Mit GPS: 1 ✅
  Ohne GPS: 0 ✅

========================================

Test 2: Frontend Status...
✅ Frontend läuft auf http://localhost:5173
```

### 2. Datenbank-Snapshots Check

Prüft ob GPS-Snapshots in der Datenbank gespeichert werden:

```bash
./check-live-snapshots.sh
```

**Ausgabe:**
```
========================================
Checking LiveSession Snapshots
========================================

Active Public Live Sessions:

PublicSessionId        | User | Activity | IsPublic | Snapshots | Started
-----------------------|------|----------|----------|-----------|--------
N_dVssU80cAIhmZJO...   | Marc | Test     | t        | 5         | 2025-01-19 14:23

Latest GPS Snapshots (Last 10):

SessionId       | Timestamp | Lat      | Lon     | Speed | Distance
----------------|-----------|----------|---------|-------|----------
N_dVssU80cAI... | 14:24:15  | 48.13510 | 11.5820 | 25.3  | 1234

✅ All active public sessions have GPS snapshots.
```

## Problembehandlung

### Fehler: "jq: command not found"
```bash
sudo apt install jq
```

### Fehler: "psql: command not found"
```bash
sudo apt install postgresql-client
```

### Fehler: "Connection refused" (API)
- Backend läuft nicht
- Starte Backend: `cd backend/LiveTracking.Api && dotnet run`

### Fehler: "Connection refused" (PostgreSQL)
- Datenbank läuft nicht
- Starte PostgreSQL: `sudo systemctl start postgresql`
- Prüfe Connection-String in `appsettings.json`

### Fehler: "FATAL: password authentication failed"
- Falsches Passwort
- Ändere Passwort in Skript: `PASSWORD="DeinPasswort"`

## Häufige Probleme

### Problem 1: "Ohne GPS: 1 ❌"
**Lösung:**
1. Browser-Konsole öffnen (F12)
2. Prüfen ob Log erscheint: `✅ Live snapshot uploaded to backend`
3. Falls nicht → LiveSession-ID wurde nicht übergeben
4. Backend und Frontend neu starten

### Problem 2: "No snapshots found"
**Lösung:**
1. Datenbank-Verbindung prüfen
2. Backend-Logs prüfen: `cd backend/LiveTracking.Api && dotnet run`
3. Fehler bei POST `/api/live-sessions/{id}/snapshots` suchen

### Problem 3: "No active public live sessions found"
**Lösung:**
1. Neue Session starten:
   - Login → Dashboard → "Neues Tracking"
   - ✅ "Live-Session öffentlich teilen" aktivieren
   - "Tracking jetzt starten"

## Alternative: cURL direkt

Wenn die Skripte nicht funktionieren, teste direkt mit cURL:

```bash
# Test Public Live Sessions API
curl -s http://localhost:5000/api/public/live-sessions | jq .

# Erwartet:
# [
#   {
#     "publicSessionId": "...",
#     "displayName": "Marc",
#     "currentSnapshot": {
#       "latitude": 48.13510,
#       "longitude": 11.58200,
#       ...
#     }
#   }
# ]
```

## Logs in Echtzeit verfolgen

### Backend-Logs
```bash
cd backend/LiveTracking.Api
dotnet run | grep -E "(GPS|Live|Snapshot)"
```

### PostgreSQL-Logs (je nach Installation)
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
# ODER
sudo journalctl -u postgresql -f
```

## Datenbankabfrage manuell

```bash
psql -h localhost -U livetracking_user -d livetracking

# Aktive Sessions
SELECT "PublicSessionId", "IsPublic", "StartedAt" 
FROM "LiveSessions" 
WHERE "IsPublic" = true AND "EndedAt" IS NULL;

# Snapshots zählen
SELECT ls."PublicSessionId", COUNT(snap."Id") 
FROM "LiveSessions" ls
LEFT JOIN "LiveSnapshots" snap ON ls."Id" = snap."LiveSessionId"
WHERE ls."IsPublic" = true AND ls."EndedAt" IS NULL
GROUP BY ls."PublicSessionId";
```

## Weitere Hilfe

Siehe: `TESTING_PHASE7.md` für detaillierte Erklärungen.
