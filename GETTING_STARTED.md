# 🚀 Live-Tracking MVP - Startanleitung

## ✅ Was bereits läuft:

1. **PostgreSQL** in Docker
2. **Datenbank-Migration** angewendet
3. **Backend kompiliert** erfolgreich
4. **Produktions-Setup** ohne Demo-Daten

## 📋 Schnellstart (3 Schritte)

### 1. Backend starten

```powershell
cd C:\Projects\VeloPulse
dotnet run --project backend/LiveTracking.Api/LiveTracking.Api.csproj
```

**Erwartete Ausgabe:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
```

**URLs:**
- API: http://localhost:5000
- Swagger UI: http://localhost:5000/swagger
- SignalR Hub: http://localhost:5000/hubs/live-tracking

### 2. Public Web starten (neues Terminal)

```powershell
cd C:\Projects\VeloPulse\apps\public_web
npm install
npm run dev
```

**URL:**
- Public Web: http://localhost:5173

### 3. Browser öffnen

**Option A: Benutzer registrieren**
1. Öffne http://localhost:5000/swagger
2. Verwende `POST /api/auth/register`:
```json
{
  "email": "ihre@email.com",
  "password": "SicheresPasswort123!",
  "displayName": "Ihr Name"
}
```
3. Notieren Sie sich die Zugangsdaten!

**Option B: User Dashboard (mit Login + eigene Touren starten)**
1. Öffne `C:\Projects\VeloPulse\apps\user_web\index.html` im Browser (File → Open File)
2. **Registrieren oder einloggen:**
   - Registriere einen neuen Account über Swagger (siehe Option A)
   - ODER logge dich mit einem bestehenden Account ein
3. **Routen verwalten**:
   - Klicke auf "🔄 Routen aktualisieren" um deine Routen zu sehen
   - Importiere eine GPX-Datei (z.B. `test-route-muenchen.gpx`)
4. **Tour starten**:
   - Klicke bei einer Route auf "Tour starten"
   - Die App startet automatisch eine Activity und Live-Session
   - GPS-Updates werden alle 3 Sekunden simuliert
5. **Live verfolgen**:
   - Öffne http://localhost:5173 in einem zweiten Tab
   - Du siehst dich selbst live auf der Karte bewegen!

**Option C: Public Web (Live-Karte ohne Login)**
1. Öffne http://localhost:5173
2. Du siehst eine **Leaflet-Karte**
3. Wenn jemand eine Tour gestartet hat, siehst du ihn live
4. Klicke auf einen Marker → Sidebar zeigt Details
5. Live-Updates alle 3 Sekunden via SignalR

## 🧪 Was du testen kannst:

### Backend API (Swagger)

Gehe zu http://localhost:5000/swagger

#### Test 1: Registrierung
```
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "Test123!",
  "displayName": "Test User"
}
```

#### Test 2: Login
```
POST /api/auth/login
{
  "email": "ihre@email.com",
  "password": "SicheresPasswort123!"
}
```
→ Kopiere den `accessToken`

#### Test 3: Profil abrufen (mit Token)
```
GET /api/profile
Authorization: Bearer <accessToken>
```

### Public Web

1. **Live-Karte ansehen**: http://localhost:5173
2. **Eigene Tour starten**: User Web verwenden
3. **Marker anklicken**: Details in der Sidebar
4. **Responsive Design**: Browser-Fenster verkleinern
5. **SignalR-Updates**: DevTools → Network → WS (WebSocket-Verbindung)

## 👤 Erste Schritte

### Neuen Benutzer anlegen

**Via Swagger UI:**
1. Öffne http://localhost:5000/swagger
2. Verwende `POST /api/auth/register`
3. Registriere dich mit einer E-Mail und Passwort

**Beispiel:**
```json
{
  "email": "max@example.com",
  "password": "MeinPasswort123!",
  "displayName": "Max Mustermann"
}
```

**Via User Web:**
1. Öffne `apps\user_web\index.html`
2. Klicke auf "Registrieren" (falls implementiert)
3. Oder registriere dich über Swagger und logge dich dann ein

## 🎯 Was funktioniert:

### ✅ Backend
- [x] PostgreSQL in Docker
- [x] Datenbank-Migrationen
- [x] JWT-Authentifizierung (Register, Login, Refresh, Logout)
- [x] Profile (Get, Update)
- [x] Routes (List, Get, Import GPX, Delete)
- [x] Activities (Start, Pause, Resume, Finish, Add Points)
- [x] Live Sessions (Start, Update Visibility, Add Snapshots, End)
- [x] Public Live Sessions (List, Get by ID)
- [x] SignalR Hub
- [x] Swagger UI

### ✅ Public Web
- [x] React + TypeScript + Vite
- [x] Leaflet-Karte mit OpenStreetMap-Tiles
- [x] SignalR-Integration
- [x] Marker für Live-Sessions
- [x] Sidebar mit Session-Details
- [x] Responsive Design
- [x] Accessibility (Tastatur-Navigation, ARIA-Labels)

### ⚠️ Was NICHT implementiert ist (wie geplant):

- ❌ **Flutter-App** (nicht erstellt im MVP)
- ❌ **BLE/ANT+ Integration** (nur vorbereitet)
- ❌ **Tests** (nur Struktur vorhanden)
- ❌ **Passwort vergessen** (nur Endpoint vorbereitet)
- ❌ **E-Mail-Verifikation**
- ❌ **Profilbild-Upload** (Speicherung fehlt)
- ❌ **Background-Tracking** (Flutter Foreground Service fehlt)

## 🐛 Troubleshooting

### Backend startet nicht
```powershell
# PostgreSQL prüfen
docker ps

# Falls nicht läuft:
docker-compose up -d postgres

# Warte 5 Sekunden, dann:
dotnet ef database update --project backend\LiveTracking.Infrastructure\LiveTracking.Infrastructure.csproj --startup-project backend\LiveTracking.Api\LiveTracking.Api.csproj
```

### Public Web startet nicht
```powershell
# Node-Version prüfen (sollte >= 16)
node --version

# Falls veraltet:
# Download von https://nodejs.org/

# Dependencies neu installieren
cd apps/public_web
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

### Keine Live-Sessions sichtbar

Das ist normal, wenn niemand gerade eine Tour fährt!

**So startest du eine Live-Session:**
1. Öffne `apps\user_web\index.html` im Browser
2. Registriere dich über Swagger (siehe oben) oder logge dich ein
3. Importiere eine GPX-Datei oder wähle eine vorhandene Route
4. Klicke auf "Tour starten"
5. Öffne http://localhost:5173 → Du siehst dich selbst auf der Karte!

**Debugging:**
1. **Backend-Logs prüfen**: Im Terminal sollten GPS-Updates ankommen
2. **Browser-Konsole öffnen** (F12): Siehst du SignalR-Nachrichten?
3. **API direkt testen**: http://localhost:5000/api/public/live-sessions

### User Web: 401 Unauthorized Fehler

Das ist normal! Die `user_web` App benötigt Login:
1. Öffne `apps\user_web\index.html` direkt im Browser (File → Open File)
2. Registriere dich über Swagger: http://localhost:5000/swagger
3. Logge dich mit deinen Zugangsdaten ein
4. Token wird automatisch im localStorage gespeichert

### GPX-Import funktioniert nicht

Stelle sicher:
1. Du bist eingeloggt (Token ist gültig)
2. Die GPX-Datei hat das richtige Format (Komoot-Export funktioniert)
3. Backend läuft und ist erreichbar
4. Browser-Konsole zeigt keine CORS-Fehler

### CORS-Fehler

Falls CORS-Fehler auftreten:
- Backend muss auf Port 5000 laufen
- Public Web muss auf Port 5173 laufen
- Prüfe `apps/public_web/.env` → `VITE_API_URL=http://localhost:5000`

## 📊 Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  Public Web (React + Leaflet)                               │
│  http://localhost:5173                                      │
│  ↓ REST API & SignalR                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend (ASP.NET Core 8.0)                                 │
│  http://localhost:5000                                      │
│  ├─ Controllers (Auth, Profile, Routes, Activities, Live)  │
│  ├─ SignalR Hub (/hubs/live-tracking)                      │
│  ├─ Demo Service (3 simulierte Sessions)                   │
│  └─ EF Core + Identity                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL 16 (Docker)                                     │
│  localhost:5432                                             │
│  User: postgres / Password: postgres                        │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Nächste Schritte (Post-MVP)

1. **Flutter-App** mit Login, Dashboard und GPS-Service
2. **BLE-Sensor-Integration** (Herzfrequenz, Geschwindigkeit)
3. **Tests** (xUnit, Flutter Tests)
4. **Profilbild-Upload** (File Storage)
5. **Background-Tracking** (Android Foreground Service)
6. **ANT+ native Integration** (Android Platform Channel)
7. **Höhendaten-Service** (SRTM oder Open-Elevation API)
8. **DSGVO-Compliance** (Datenlöschung, Consent-Management)

## 💡 Tipps für Entwicklung

### Hot Reload

**Backend:**
```powershell
dotnet watch --project backend/LiveTracking.Api/LiveTracking.Api.csproj
```

**Public Web:**
```powershell
npm run dev  # Läuft bereits mit Hot Reload
```

### Datenbank zurücksetzen

```powershell
# Container stoppen und Volume löschen
docker-compose down -v

# Neu starten
docker-compose up -d postgres

# Migration neu anwenden
dotnet ef database update --project backend\LiveTracking.Infrastructure\LiveTracking.Infrastructure.csproj --startup-project backend\LiveTracking.Api\LiveTracking.Api.csproj
```

### Neue Migration erstellen

```powershell
dotnet ef migrations add <Name> --project backend\LiveTracking.Infrastructure\LiveTracking.Infrastructure.csproj --startup-project backend\LiveTracking.Api\LiveTracking.Api.csproj
```

---

**🎉 Viel Erfolg beim Testen!**
