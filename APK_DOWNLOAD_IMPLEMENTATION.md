# APK Download Setup - Vollständige Anleitung

## ✅ Was wurde implementiert?

### Backend-Komponenten:
1. **DownloadController.cs** - API-Endpunkte für APK-Download
2. **Static Files Middleware** - Aktiviert in `Program.cs`
3. **wwwroot/downloads/** - Ordner für APK-Dateien
4. **.gitignore** - APK-Dateien werden nicht in Git committed

### API-Endpunkte:

| Endpoint | Methode | Beschreibung | Auth |
|----------|---------|--------------|------|
| `/api/download/app/latest` | GET | APK herunterladen | ❌ Nein |
| `/api/download/app/version` | GET | Version-Info abrufen | ❌ Nein |
| `/api/download/app/update-available?currentBuildNumber=X` | GET | Update prüfen | ❌ Nein |

---

## 🚀 Deployment-Schritte

### Schritt 1: Backend deployen

```bash
# Änderungen committen
git add .
git commit -m "Add APK download endpoints"
git push origin main

# Production deployment
cd /path/to/production
git pull origin main
docker-compose -f docker-compose.prod.yml build backend
docker-compose -f docker-compose.prod.yml up -d backend
```

### Schritt 2: APK von GitHub Actions holen

1. **GitHub öffnen:**
   ```
   https://github.com/maggiboy1337/VeloPulse/actions
   ```

2. **Neuesten Workflow-Run öffnen:**
   - "Build Android APK" anklicken
   - Neuesten erfolgreichen Run auswählen

3. **APK herunterladen:**
   - Runterscrollen zu "Artifacts"
   - `velopulse-debug-apk` herunterladen
   - ZIP entpacken → `app-debug.apk`

### Schritt 3: APK auf Server hochladen

**Option A: Manuell via SCP**
```bash
scp app-debug.apk user@velopulse.de:/path/to/backend/wwwroot/downloads/velopulse-latest.apk
```

**Option B: Docker Volume**
```bash
# Auf Server
mkdir -p /opt/velopulse/apk-downloads
scp app-debug.apk user@velopulse.de:/opt/velopulse/apk-downloads/velopulse-latest.apk

# docker-compose.prod.yml anpassen
services:
  backend:
    volumes:
      - /opt/velopulse/apk-downloads:/app/wwwroot/downloads
```

**Option C: Direkt in Docker Container**
```bash
# APK in laufenden Container kopieren
docker cp app-debug.apk velopulse-backend:/app/wwwroot/downloads/velopulse-latest.apk
```

### Schritt 4: Testen

```bash
# Version prüfen
curl https://www.velopulse.de/api/download/app/version

# Expected Response:
{
  "version": "1.0.0",
  "buildNumber": 20250614,
  "releaseDate": "2025-06-14T...",
  "downloadUrl": "https://www.velopulse.de/api/download/app/latest",
  "apkAvailable": true,
  "changelog": "..."
}

# APK herunterladen
curl -O https://www.velopulse.de/api/download/app/latest

# Dateigröße prüfen (sollte ~50-100 MB sein)
ls -lh VeloPulse.apk
```

---

## 🌐 Frontend-Integration

### Option 1: Download-Link im Dashboard

**Datei:** `apps/public_web/src/pages/Dashboard.tsx`

```tsx
import { useState, useEffect } from 'react';

export function Dashboard() {
  const [apkVersion, setApkVersion] = useState<any>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // APK-Version laden
    fetch(`${API_URL}/api/download/app/version`)
      .then(res => res.json())
      .then(data => setApkVersion(data))
      .catch(err => console.error('Failed to load APK version:', err));
  }, []);

  return (
    <div className="dashboard">
      {/* Bestehender Dashboard-Code */}

      {/* APK Download Card */}
      <div className="download-section">
        <h2>📱 Android App</h2>
        <div className="download-card">
          <div className="app-icon">📱</div>
          <div className="app-info">
            <h3>VeloPulse für Android</h3>
            {apkVersion && apkVersion.apkAvailable && (
              <>
                <p className="version-info">
                  Version {apkVersion.version} • Build {apkVersion.buildNumber}
                </p>
                <p className="release-date">
                  Veröffentlicht: {new Date(apkVersion.releaseDate).toLocaleDateString('de-DE')}
                </p>
              </>
            )}
          </div>
          {apkVersion?.apkAvailable ? (
            <a 
              href={`${API_URL}/api/download/app/latest`}
              className="btn btn-primary btn-download"
              download
            >
              📥 APK herunterladen
            </a>
          ) : (
            <button className="btn btn-disabled" disabled>
              APK nicht verfügbar
            </button>
          )}
        </div>

        {apkVersion?.apkAvailable && (
          <div className="changelog">
            <h4>Was ist neu?</h4>
            <pre>{apkVersion.changelog}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

### CSS für Download-Card

**Datei:** `apps/public_web/src/pages/Dashboard.css`

```css
.download-section {
  margin-top: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.download-section h2 {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
}

.download-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.app-icon {
  font-size: 4rem;
  flex-shrink: 0;
}

.app-info {
  flex: 1;
}

.app-info h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
}

.version-info {
  margin: 4px 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.release-date {
  margin: 4px 0;
  opacity: 0.7;
  font-size: 0.85rem;
}

.btn-download {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
}

.btn-disabled {
  background: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
  opacity: 0.5;
}

.changelog {
  margin-top: 20px;
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 8px;
}

.changelog h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.changelog pre {
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
  line-height: 1.6;
  font-size: 0.9rem;
}
```

---

## 🔄 In-App Update Check (Optional)

### Update Service erstellen

**Datei:** `apps/public_web/src/services/appUpdateService.ts`

```typescript
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  latestBuildNumber: number;
  downloadUrl: string;
  changelog: string;
}

export const appUpdateService = {
  /**
   * Prüft ob ein Update verfügbar ist
   */
  async checkForUpdate(): Promise<UpdateInfo | null> {
    // Nur auf nativen Plattformen
    if (!Capacitor.isNativePlatform()) {
      console.log('Update check skipped - not a native platform');
      return null;
    }

    try {
      // Aktuelle App-Info holen
      const appInfo = await App.getInfo();
      const currentBuild = parseInt(appInfo.build);

      console.log(`Checking for updates. Current build: ${currentBuild}`);

      // Server nach Updates fragen
      const response = await fetch(
        `${API_URL}/api/download/app/update-available?currentBuildNumber=${currentBuild}`
      );

      if (!response.ok) {
        throw new Error('Update check failed');
      }

      const data: UpdateInfo = await response.json();
      
      console.log(`Update check complete. Update available: ${data.updateAvailable}`);

      return data;
    } catch (err) {
      console.error('Update check failed:', err);
      return null;
    }
  },

  /**
   * Zeigt Update-Dialog und öffnet Download
   */
  async promptUpdate(updateInfo: UpdateInfo): Promise<void> {
    const message = `
Eine neue Version von VeloPulse ist verfügbar!

Aktuelle Version: ${updateInfo.latestVersion}
Build: ${updateInfo.latestBuildNumber}

${updateInfo.changelog}

Jetzt aktualisieren?
    `.trim();

    const shouldUpdate = confirm(message);

    if (shouldUpdate) {
      // Browser öffnen mit Download-Link
      window.open(updateInfo.downloadUrl, '_system');
    }
  }
};
```

### Integration in App.tsx

**Datei:** `apps/public_web/src/App.tsx`

```tsx
import { useEffect } from 'react';
import { appUpdateService } from './services/appUpdateService';

export function App() {
  // Update-Check bei App-Start
  useEffect(() => {
    const checkForUpdates = async () => {
      const updateInfo = await appUpdateService.checkForUpdate();
      
      if (updateInfo && updateInfo.updateAvailable) {
        // Optional: Verzögerung, damit User erst die App sieht
        setTimeout(() => {
          appUpdateService.promptUpdate(updateInfo);
        }, 3000);
      }
    };

    checkForUpdates();
  }, []);

  return (
    // ... Rest der App
  );
}
```

---

## 📊 Swagger-Dokumentation

Die API-Endpunkte sind automatisch in Swagger dokumentiert:

**URL:** `https://www.velopulse.de/swagger/index.html`

### Endpoints:

1. **GET /api/download/app/latest**
   - Response: `application/vnd.android.package-archive`
   - Download-Name: `VeloPulse.apk`

2. **GET /api/download/app/version**
   - Response: `AppVersionDto`
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

3. **GET /api/download/app/update-available**
   - Parameter: `currentBuildNumber` (int, query)
   - Response: `UpdateCheckDto`
   ```json
   {
     "updateAvailable": true,
     "latestVersion": "1.0.0",
     "latestBuildNumber": 20250614,
     "downloadUrl": "https://www.velopulse.de/api/download/app/latest",
     "changelog": "..."
   }
   ```

---

## 🔧 Troubleshooting

### Problem: 404 Not Found

**Ursache:** APK-Datei nicht vorhanden

**Lösung:**
```bash
# Prüfen ob APK existiert
docker exec velopulse-backend ls -la /app/wwwroot/downloads/

# Sollte anzeigen:
-rw-r--r-- 1 root root 85000000 Jun 14 10:30 velopulse-latest.apk

# Falls nicht: APK hochladen (siehe Schritt 3)
```

### Problem: CORS Error

**Ursache:** CORS nicht korrekt konfiguriert

**Lösung:**
```csharp
// backend/LiveTracking.Api/Program.cs
// Prüfe ob CORS vor UseAuthorization() aktiviert ist:
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
```

### Problem: Static Files funktionieren nicht

**Ursache:** `app.UseStaticFiles()` fehlt

**Lösung:**
```csharp
// backend/LiveTracking.Api/Program.cs
// Stelle sicher, dass UseStaticFiles() aktiviert ist:
app.UseStaticFiles();
app.UseCors("AllowAll");
```

### Problem: Download startet nicht

**Ursache:** Content-Type falsch

**Lösung:**
Der Content-Type `application/vnd.android.package-archive` ist korrekt gesetzt.
Prüfe Browser-Console auf Fehler.

---

## 📱 Automatisierung mit GitHub Actions (Optional)

### APK automatisch auf Server hochladen

**Datei:** `.github/workflows/android-build.yml`

```yaml
- name: Upload APK to Production Server
  if: github.ref == 'refs/heads/main'
  run: |
    echo "${{ secrets.SSH_PRIVATE_KEY }}" > ssh_key
    chmod 600 ssh_key
    scp -i ssh_key \
        -o StrictHostKeyChecking=no \
        apps/public_web/android/app/build/outputs/apk/debug/app-debug.apk \
        ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/opt/velopulse/apk-downloads/velopulse-latest.apk
    rm ssh_key
```

**Secrets hinzufügen:**
- `SSH_PRIVATE_KEY`: SSH Private Key für Server-Zugriff
- `SERVER_USER`: SSH-Benutzername
- `SERVER_HOST`: Server-Domain oder IP

---

## ✅ Checkliste

### Backend:
- [x] DownloadController erstellt
- [x] Static Files aktiviert
- [x] wwwroot/downloads/ Ordner erstellt
- [ ] Backend deployed
- [ ] APK hochgeladen
- [ ] API getestet

### Frontend:
- [ ] Dashboard: Download-Card hinzugefügt
- [ ] CSS angepasst
- [ ] In-App Update Check implementiert (optional)
- [ ] Frontend deployed

### Testing:
- [ ] `/api/download/app/version` → Zeigt Version-Info
- [ ] `/api/download/app/latest` → Download startet
- [ ] Download-Link im Dashboard funktioniert
- [ ] Update-Check funktioniert (optional)

---

## 🎯 Zusammenfassung

**Was funktioniert jetzt:**
✅ Backend hat Download-Endpunkte
✅ APK kann über API heruntergeladen werden
✅ Version-Info ist abrufbar
✅ Update-Check ist möglich

**Was noch zu tun ist:**
1. Backend deployen
2. APK von GitHub Actions hochladen
3. Frontend-Integration (Download-Link im Dashboard)
4. Optional: In-App Update Check

**Download-URL:**
```
https://www.velopulse.de/api/download/app/latest
```

Bei Fragen oder Problemen: Check die Backend-Logs!
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```
