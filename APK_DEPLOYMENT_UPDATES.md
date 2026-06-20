# APK Deployment & Auto-Update Strategien

## Problem 3: APK Download & Automatische Updates

### Optionen für APK-Verteilung und Updates

---

## ✅ Option 1: Direkter APK-Download (Einfach)

### Implementierung
Du kannst einen Download-Link in der Admin-Oberfläche hinzufügen, der die neueste APK bereitstellt.

**Vorteile:**
- Einfach zu implementieren
- Keine Abhängigkeit von App Stores
- Volle Kontrolle über Releases

**Nachteile:**
- Keine automatischen Updates
- Benutzer müssen manuell prüfen und installieren
- Android warnt vor "unbekannten Quellen"

### Code-Beispiel für Admin Dashboard:

```tsx
// apps/public_web/src/pages/Dashboard.tsx
<div className="admin-tools">
  <h3>Admin Tools</h3>
  <a 
    href={`${API_URL}/downloads/velopulse-latest.apk`} 
    className="btn-download-apk"
    download
  >
    📱 Neueste APK herunterladen (v{appVersion})
  </a>
  <p className="version-info">
    Aktuelle Version: {appVersion} | Build: {buildDate}
  </p>
</div>
```

### Backend-Endpoint (optional):
```csharp
// backend/LiveTracking.Api/Controllers/DownloadController.cs
[HttpGet("downloads/velopulse-latest.apk")]
public IActionResult GetLatestApk()
{
    var apkPath = Path.Combine(_webHostEnvironment.ContentRootPath, "downloads", "velopulse-latest.apk");
    
    if (!System.IO.File.Exists(apkPath))
        return NotFound();
    
    var fileBytes = System.IO.File.ReadAllBytes(apkPath);
    return File(fileBytes, "application/vnd.android.package-archive", "VeloPulse.apk");
}
```

---

## ⚡ Option 2: In-App Update Check (Empfohlen)

### Implementierung
Prüfe bei App-Start, ob eine neue Version verfügbar ist und fordere den Benutzer zur Installation auf.

**Vorteile:**
- Benutzer werden über Updates benachrichtigt
- Halbautomatischer Prozess
- Funktioniert ohne Play Store

**Nachteile:**
- Benutzer muss Update manuell bestätigen
- Erfordert Backend-Endpoint für Versionsprüfung

### Backend: Version-Endpoint
```csharp
// backend/LiveTracking.Api/Controllers/AppController.cs
[HttpGet("app/version")]
public ActionResult<AppVersionDto> GetLatestVersion()
{
    return Ok(new AppVersionDto
    {
        Version = "1.2.0",
        BuildNumber = 120,
        ReleaseDate = DateTime.UtcNow,
        DownloadUrl = "https://velopulse.ch/downloads/velopulse-latest.apk",
        Changelog = "- Bugfixes\n- Performance improvements\n- New features"
    });
}
```

### Frontend: Version Check Service
```typescript
// apps/public_web/src/services/appUpdateService.ts
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const appUpdateService = {
  async checkForUpdate(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const appInfo = await App.getInfo();
      const response = await fetch(`${API_URL}/api/app/version`);
      const latestVersion = await response.json();

      const currentBuild = parseInt(appInfo.build);
      const latestBuild = latestVersion.buildNumber;

      if (latestBuild > currentBuild) {
        return true; // Update verfügbar
      }
    } catch (err) {
      console.error('Update check failed:', err);
    }
    return false;
  },

  async promptUpdate(downloadUrl: string): Promise<void> {
    const shouldUpdate = confirm(
      'Eine neue Version von VeloPulse ist verfügbar! Jetzt aktualisieren?'
    );

    if (shouldUpdate) {
      window.open(downloadUrl, '_system');
    }
  }
};
```

### Integration in App.tsx:
```tsx
// apps/public_web/src/App.tsx
useEffect(() => {
  const checkUpdate = async () => {
    if (appUpdateService.checkForUpdate()) {
      const response = await fetch(`${API_URL}/api/app/version`);
      const version = await response.json();
      appUpdateService.promptUpdate(version.downloadUrl);
    }
  };

  checkUpdate();
}, []);
```

---

## 🏆 Option 3: Google Play Store (Professionell)

### Implementierung
Veröffentliche die App im Google Play Store.

**Vorteile:**
- **Automatische Updates** (wenn Benutzer Auto-Update aktiviert hat)
- Vertrauenswürdige Quelle
- Einfache Installation
- In-App Update Library verfügbar

**Nachteile:**
- Erfordert Google Play Developer Account ($25 einmalig)
- Review-Prozess (1-3 Tage)
- Datenschutz-Richtlinien müssen erfüllt werden

### In-App Updates mit Play Core Library:
```typescript
// Capacitor Plugin für Play Core
import { AppUpdate } from '@capawesome/capacitor-app-update';

export const playStoreUpdateService = {
  async checkForUpdate() {
    try {
      const result = await AppUpdate.getAppUpdateInfo();
      
      if (result.updateAvailability === UpdateAvailability.UPDATE_AVAILABLE) {
        // Update verfügbar - In-App Update starten
        await AppUpdate.performImmediateUpdate();
      }
    } catch (err) {
      console.error('Play Store Update check failed:', err);
    }
  }
};
```

**Installation:**
```bash
npm install @capawesome/capacitor-app-update
npx cap sync
```

---

## 📊 Vergleichstabelle

| Feature | Direkter Download | In-App Check | Play Store |
|---------|------------------|--------------|------------|
| Automatische Updates | ❌ Nein | ⚠️ Halbautomatisch | ✅ Ja |
| Implementierungsaufwand | 🟢 Niedrig | 🟡 Mittel | 🔴 Hoch |
| Benutzerfreundlichkeit | 🔴 Niedrig | 🟡 Mittel | 🟢 Hoch |
| Vertrauenswürdigkeit | 🔴 Niedrig | 🟡 Mittel | 🟢 Hoch |
| Kosten | 🟢 Kostenlos | 🟢 Kostenlos | 🟡 $25 einmalig |
| Review-Prozess | 🟢 Keiner | 🟢 Keiner | 🔴 Ja (1-3 Tage) |

---

## 💡 Empfehlung

### Für Development/Testing:
→ **Option 1: Direkter APK-Download**

### Für Beta-Testing:
→ **Option 2: In-App Update Check**

### Für Production:
→ **Option 3: Google Play Store** (langfristig beste Lösung)

---

## 🚀 Schnellstart: Direkter Download im Dashboard

### 1. APK im Backend ablegen:
```bash
# Erstelle downloads-Ordner
mkdir -p backend/LiveTracking.Api/wwwroot/downloads

# Kopiere APK nach Build
cp apps/public_web/android/app/build/outputs/apk/release/app-release.apk \
   backend/LiveTracking.Api/wwwroot/downloads/velopulse-latest.apk
```

### 2. Backend: Static Files aktivieren (Program.cs):
```csharp
// backend/LiveTracking.Api/Program.cs
app.UseStaticFiles(); // Vor app.UseRouting()
```

### 3. Frontend: Download-Link im Dashboard:
```tsx
// apps/public_web/src/pages/Dashboard.tsx
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

<section className="admin-section">
  <h2>📱 App Downloads</h2>
  <div className="download-card">
    <h3>VeloPulse Android App</h3>
    <p>Version 1.0.0 | Build 100</p>
    <a 
      href={`${API_URL}/downloads/velopulse-latest.apk`}
      className="btn-primary"
      download
    >
      📥 APK herunterladen
    </a>
  </div>
</section>
```

### 4. CSS für Download-Card:
```css
/* apps/public_web/src/pages/Dashboard.css */
.download-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.download-card h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.download-card p {
  color: #666;
  margin-bottom: 15px;
}

.btn-primary {
  display: inline-block;
  background: #667eea;
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}
```

---

## 🔐 Sicherheitshinweise

1. **APK signieren:** Verwende immer einen Release-Build mit Signing Key
2. **HTTPS verwenden:** Downloads nur über HTTPS
3. **Versionsprüfung:** Validiere Versionen serverseitig
4. **Changelog:** Zeige Changelog vor Update an

---

## 📝 Zusammenfassung

✅ **Direkter APK-Download ist möglich** - einfach zu implementieren
✅ **In-App Update Check ist empfohlen** - bessere User Experience
✅ **Play Store ist ideal** - aber nur mit Account und Review-Prozess

**Automatische Updates ohne Benutzerinteraktion sind nur über den Play Store möglich.**
