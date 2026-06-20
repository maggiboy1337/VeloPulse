# App Download Seite - Implementierung

## ✅ Was wurde implementiert?

### Neue Dateien:
1. **apps/public_web/src/pages/AppDownload.tsx** - Hauptkomponente für App-Download-Seite
2. **apps/public_web/src/pages/AppDownload.css** - Styling (responsive, Dark Mode Support)

### Geänderte Dateien:
1. **apps/public_web/src/AppRouter.tsx** - Route `/app-download` hinzugefügt
2. **apps/public_web/src/components/Layout.tsx** - Menü-Eintrag "📱 Android App" hinzugefügt

---

## 🎯 Features der Seite

### 1. **Version-Informationen**
- Zeigt aktuelle Version, Build-Nummer und Release-Datum
- Status-Badge (Verfügbar / Nicht verfügbar)
- Automatisches Laden von API-Endpoint

### 2. **Download-Button**
- Großer, prominenter Download-Button
- Loading-State während Download
- Funktioniert nur wenn APK verfügbar ist

### 3. **Changelog**
- Zeigt What's New aus API-Response
- Formatiert mit `<pre>` für Multiline-Text

### 4. **Features-Grid**
- 6 Feature-Cards mit Icons
- Hover-Effekte
- Responsive Grid-Layout

### 5. **Installations-Anleitung**
- 4 Schritte mit visuellen Nummern
- Klare Anweisungen für Android-Installation
- Hinweise zu Berechtigungen

### 6. **Systemanforderungen**
- Android Version
- Hardware-Anforderungen
- Speicherplatz
- Internetverbindung

### 7. **FAQ-Sektion**
- 5 häufig gestellte Fragen
- Informationen zu Offline-Modus, Akkuverbrauch, etc.

### 8. **Support-Links**
- E-Mail-Kontakt
- GitHub Issues Link

---

## 🔌 API-Integration

### Verwendeter Endpoint:
```typescript
GET /api/download/app/version
```

### Response-Format:
```typescript
interface AppVersion {
  version: string;              // z.B. "1.0.0"
  buildNumber: number;          // z.B. 20250614
  releaseDate: string;          // ISO 8601 Date
  downloadUrl: string;          // Full URL zum Download
  apkAvailable: boolean;        // true wenn APK vorhanden
  changelog: string;            // Multiline Changelog-Text
}
```

### Download-Trigger:
```typescript
window.location.href = `${API_URL}/api/download/app/latest`;
```

---

## 🎨 Design-Features

### Farbschema:
- **Primary Gradient:** `#667eea` → `#764ba2`
- **Background Cards:** White / `#2d3748` (Dark Mode)
- **Text:** `#2d3748` / `#e2e8f0` (Dark Mode)

### Responsive Breakpoints:
- **Desktop:** > 768px (Multi-column Grid)
- **Mobile:** ≤ 768px (Single column, Stack layout)

### Hover-Effekte:
- Download-Button: Transform + Shadow
- Feature-Cards: Lift-Effekt
- Support-Links: Transform + Shadow

### Dark Mode:
- Automatische Erkennung via `prefers-color-scheme`
- Invertierte Farben für bessere Lesbarkeit
- Gradient-Buttons bleiben gleich

---

## 📱 Zugriff auf die Seite

### Im Dashboard-Menü:
```
📱 Android App (zwischen "Statistiken" und "Einstellungen")
```

### Direkte URL:
```
https://www.velopulse.de/app-download
```

### Navigation im Code:
```typescript
navigate('/app-download');
```

---

## 🧪 Testing

### 1. Lokale Entwicklung
```sh
cd apps/public_web
npm run dev
```

Öffne: `http://localhost:5173/app-download`

### 2. Test-Szenarien

#### Szenario 1: APK verfügbar
1. Backend läuft mit APK in `wwwroot/downloads/`
2. Seite zeigt grünen "Verfügbar"-Badge
3. Download-Button ist aktiv
4. Changelog wird angezeigt

#### Szenario 2: APK nicht verfügbar
1. Backend läuft, aber keine APK vorhanden
2. Seite zeigt roten "Nicht verfügbar"-Badge
3. Download-Button ist deaktiviert
4. Warnung wird angezeigt

#### Szenario 3: Backend nicht erreichbar
1. Backend ist offline
2. Seite zeigt Fehler-State
3. "Erneut versuchen"-Button wird angezeigt

### 3. API-Test
```bash
# Version-Info abrufen
curl http://localhost:5000/api/download/app/version

# Erwartete Response:
{
  "version": "1.0.0",
  "buildNumber": 20250614,
  "releaseDate": "2025-06-14T10:30:00Z",
  "downloadUrl": "http://localhost:5000/api/download/app/latest",
  "apkAvailable": true,
  "changelog": "✨ Neue Features:\n- ..."
}
```

---

## 🚀 Deployment

### 1. Code committen
```sh
git add apps/public_web/src/pages/AppDownload.tsx
git add apps/public_web/src/pages/AppDownload.css
git add apps/public_web/src/AppRouter.tsx
git add apps/public_web/src/components/Layout.tsx
git commit -m "Add App Download page to dashboard"
git push origin main
```

### 2. Frontend neu bauen
```sh
cd apps/public_web
npm run build
```

### 3. Production deployen
```sh
# Docker-basiertes Deployment
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### 4. APK hochladen (falls noch nicht geschehen)
```sh
# APK von GitHub Actions herunterladen
# https://github.com/maggiboy1337/VeloPulse/actions

# Auf Server hochladen
scp app-debug.apk user@velopulse.de:/path/to/backend/wwwroot/downloads/velopulse-latest.apk

# ODER in Docker Container kopieren
docker cp app-debug.apk velopulse-backend:/app/wwwroot/downloads/velopulse-latest.apk
```

---

## 🔧 Anpassungen

### Changelog anpassen
Changelog wird automatisch aus dem Backend geladen (`DownloadController.cs`):

```csharp
// backend/LiveTracking.Api/Controllers/DownloadController.cs
Changelog: @"
✨ Neue Features:
- Deine neuen Features hier

🐛 Bugfixes:
- Deine Bugfixes hier
".Trim()
```

### Support-E-Mail ändern
```tsx
// apps/public_web/src/pages/AppDownload.tsx
<a href="mailto:deine-email@domain.com" className="support-link">
  📧 deine-email@domain.com
</a>
```

### Features hinzufügen
```tsx
// apps/public_web/src/pages/AppDownload.tsx
<div className="feature-card">
  <div className="feature-icon">🎨</div>
  <h4>Neues Feature</h4>
  <p>Beschreibung des Features</p>
</div>
```

---

## 📊 Metriken & Monitoring

### Download-Tracking (optional)
Du kannst in `DownloadController.cs` Logging hinzufügen:

```csharp
[HttpGet("app/latest")]
public IActionResult GetLatestApk()
{
    // ... existing code ...
    
    _logger.LogInformation("APK downloaded by user");
    
    // Optional: In Datenbank loggen für Analytics
    // _context.Downloads.Add(new Download { ... });
    // await _context.SaveChangesAsync();
    
    return File(...);
}
```

---

## 🐛 Troubleshooting

### Problem: "APK nicht verfügbar"
**Lösung:**
1. Prüfe ob APK in `backend/LiveTracking.Api/wwwroot/downloads/velopulse-latest.apk` existiert
2. Prüfe Dateiberechtigungen (lesbar für Backend-User)
3. Prüfe Backend-Logs: `docker-compose logs backend`

### Problem: Download startet nicht
**Lösung:**
1. Prüfe CORS-Settings in `Program.cs`
2. Öffne Browser-Console (F12) und suche nach Fehlern
3. Teste API direkt: `curl http://localhost:5000/api/download/app/latest`

### Problem: Version-Info wird nicht geladen
**Lösung:**
1. Prüfe ob Backend läuft
2. Prüfe API-Endpoint: `curl http://localhost:5000/api/download/app/version`
3. Prüfe VITE_API_URL in `.env` / `.env.production`

---

## ✅ Checkliste für Deployment

- [ ] App-Download-Seite wurde erstellt
- [ ] Route wurde zu AppRouter hinzugefügt
- [ ] Menü-Eintrag wurde zu Layout hinzugefügt
- [ ] Backend hat DownloadController
- [ ] Static Files sind aktiviert in Program.cs
- [ ] APK wurde hochgeladen als `velopulse-latest.apk`
- [ ] API-Endpoint getestet: `/api/download/app/version`
- [ ] API-Endpoint getestet: `/api/download/app/latest`
- [ ] Frontend gebaut: `npm run build`
- [ ] Production deployed
- [ ] Download funktioniert im Browser
- [ ] Responsive Design getestet (Mobile + Desktop)

---

## 📝 Zusammenfassung

Die App-Download-Seite ist jetzt vollständig integriert und bietet:

✅ **Vollständige Version-Informationen** von Backend-API
✅ **Download-Button** mit Loading-State
✅ **Changelog-Anzeige** aus Backend
✅ **Features-Grid** mit 6 Feature-Cards
✅ **Installations-Anleitung** mit 4 Schritten
✅ **Systemanforderungen** übersichtlich dargestellt
✅ **FAQ-Sektion** mit 5 häufigen Fragen
✅ **Support-Links** (E-Mail + GitHub)
✅ **Responsive Design** (Mobile + Desktop)
✅ **Dark Mode Support** automatisch
✅ **Error Handling** mit Retry-Button
✅ **Loading States** für bessere UX

**Zugriff:** Dashboard → 📱 Android App (oder `/app-download`)
