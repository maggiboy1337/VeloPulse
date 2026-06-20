# APK Downloads

## Ordnerstruktur

Dieser Ordner enthält die APK-Dateien für die VeloPulse Android-App.

```
wwwroot/downloads/
├── velopulse-latest.apk    # Neueste APK-Version (automatisch von GitHub Actions)
└── README.md               # Diese Datei
```

## APK bereitstellen

### Option 1: Manuell hochladen
1. APK nach GitHub Actions Build herunterladen
2. Als `velopulse-latest.apk` in diesen Ordner kopieren
3. Backend neu deployen

### Option 2: Automatisch via GitHub Actions
Die GitHub Actions Workflow kann die APK automatisch hochladen:

```yaml
- name: Upload APK to Server
  run: |
    scp apps/public_web/android/app/build/outputs/apk/debug/app-debug.apk \
        user@server:/path/to/backend/wwwroot/downloads/velopulse-latest.apk
```

### Option 3: Docker Volume Mount
Mounte diesen Ordner als Volume in docker-compose.prod.yml:

```yaml
services:
  backend:
    volumes:
      - ./apk-downloads:/app/wwwroot/downloads
```

## API-Endpunkte

Sobald die APK vorhanden ist, sind folgende Endpunkte verfügbar:

### 1. APK herunterladen
```bash
GET /api/download/app/latest
```

**Beispiel:**
```bash
curl -O https://www.velopulse.de/api/download/app/latest
```

### 2. Version-Info abrufen
```bash
GET /api/download/app/version
```

**Response:**
```json
{
  "version": "1.0.0",
  "buildNumber": 20250614,
  "releaseDate": "2025-06-14T10:30:00Z",
  "downloadUrl": "https://www.velopulse.de/api/download/app/latest",
  "apkAvailable": true,
  "changelog": "..."
}
```

### 3. Update-Check
```bash
GET /api/download/app/update-available?currentBuildNumber=20250601
```

**Response:**
```json
{
  "updateAvailable": true,
  "latestVersion": "1.0.0",
  "latestBuildNumber": 20250614,
  "downloadUrl": "https://www.velopulse.de/api/download/app/latest",
  "changelog": "..."
}
```

## Frontend-Integration

### Dashboard Download-Link
```tsx
// apps/public_web/src/pages/Dashboard.tsx
const API_URL = import.meta.env.VITE_API_URL;

<a 
  href={`${API_URL}/api/download/app/latest`}
  className="btn-download-apk"
  download
>
  📱 Android App herunterladen
</a>
```

### In-App Update Check
```typescript
// apps/public_web/src/services/appUpdateService.ts
export const checkForUpdate = async (currentBuild: number): Promise<boolean> => {
  const response = await fetch(
    `${API_URL}/api/download/app/update-available?currentBuildNumber=${currentBuild}`
  );
  const data = await response.json();
  return data.updateAvailable;
};
```

## Versionierung

Die Build-Nummer wird automatisch aus dem APK-Dateidatum generiert:
- Format: `YYYYMMDD` (z.B. `20250614` für 14. Juni 2025)
- Wird bei jedem Build neu generiert
- Ermöglicht automatische Update-Prüfung

## Sicherheit

- ✅ APK-Download ist öffentlich (kein Login erforderlich)
- ✅ HTTPS wird in Production erzwungen
- ✅ CORS ist konfiguriert für Frontend-Zugriff
- ⚠️ Stelle sicher, dass nur signierte Release-APKs deployed werden

## Testing

### Lokal testen
1. APK in `backend/LiveTracking.Api/wwwroot/downloads/` kopieren
2. Backend starten: `dotnet run`
3. Browser öffnen: `http://localhost:5000/api/download/app/latest`
4. APK sollte heruntergeladen werden

### Production testen
```bash
# Version-Info
curl https://www.velopulse.de/api/download/app/version

# APK herunterladen
curl -O https://www.velopulse.de/api/download/app/latest

# Dateigröße prüfen
ls -lh VeloPulse.apk
```

## Troubleshooting

### APK nicht gefunden (404)
- Prüfe ob `velopulse-latest.apk` im Ordner vorhanden ist
- Prüfe Dateiberechtigungen (lesbar für Backend-User)
- Prüfe Backend-Logs: `docker-compose logs backend`

### Download funktioniert nicht
- Prüfe CORS-Settings in Program.cs
- Prüfe ob `app.UseStaticFiles()` aktiviert ist
- Prüfe HTTPS-Konfiguration

### Version-Nummer falsch
- Build-Nummer wird aus APK-Dateidatum generiert
- Bei manueller APK-Upload: Dateidatum wird verwendet
- Bei automatischem Upload: Aktuelles Datum wird verwendet

## Nächste Schritte

1. ✅ Backend deployed mit Download-Controller
2. ⏳ APK von GitHub Actions herunterladen
3. ⏳ APK als `velopulse-latest.apk` hochladen
4. ⏳ Frontend-Integration (Download-Link im Dashboard)
5. ⏳ In-App Update-Check implementieren (optional)
