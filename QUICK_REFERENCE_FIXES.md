# Quick Reference: Session & LiveTracking Fixes

## 🔧 Was wurde geändert?

### 1. JWT Token-Laufzeit erhöht
```diff
// backend/LiveTracking.Api/appsettings.json
"Jwt": {
-   "AccessTokenExpirationMinutes": 15,
+   "AccessTokenExpirationMinutes": 10080,  // 7 Tage
    "RefreshTokenExpirationDays": 30
}
```

### 2. LiveSession Auto-Beenden
```diff
// backend/LiveTracking.Api/Controllers/ActivitiesController.cs
public ActivitiesController(
    ApplicationDbContext context, 
+   IHubContext<LiveTrackingHub> hubContext
)

[HttpPost("{id}/finish")]
public async Task<IActionResult> FinishActivity(Guid id) {
    // Activity beenden
    activity.Status = ActivityStatus.Finished;
    
+   // LiveSession automatisch beenden
+   var liveSession = await _context.LiveSessions
+       .FirstOrDefaultAsync(ls => ls.ActivityId == id && ls.EndedAt == null);
+   
+   if (liveSession != null) {
+       liveSession.EndedAt = DateTime.UtcNow;
+       
+       // SignalR-Benachrichtigung
+       if (liveSession.IsPublic) {
+           await _hubContext.SendLiveSessionEnded(liveSession.PublicSessionId);
+       }
+   }
}
```

---

## ✅ Was funktioniert jetzt?

### Problem 1: Session-Ablauf ✅
**Vorher:**
- Login nur 15 Minuten gültig
- Automatisches Logout während Live-Tracking

**Jetzt:**
- Login 7 Tage gültig (bis manueller Logout)
- Kein Logout während aktiver Nutzung
- Bei 401: Automatische Umleitung zum Login (nur bei Admin-Navigation)

### Problem 2: LiveSession-Beendigung ✅
**Vorher:**
- Activity beenden → LiveSession läuft weiter
- Öffentliche Karte zeigt weiterhin "LIVE"

**Jetzt:**
- Activity beenden → LiveSession wird automatisch beendet
- SignalR-Event → Karte wird sofort aktualisiert
- Tracking vollständig gestoppt

### Problem 3: APK-Updates ℹ️
**Antwort:**
- Direkter Download: Einfach, aber manuell
- In-App Check: Empfohlen für Beta
- Play Store: Automatische Updates (Production)

Siehe: `APK_DEPLOYMENT_UPDATES.md`

---

## 🚀 Deployment

### Docker Production
```bash
# Backend neu bauen
docker-compose -f docker-compose.prod.yml build backend

# Neustarten
docker-compose -f docker-compose.prod.yml up -d backend

# Logs prüfen
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Lokale Entwicklung
```bash
cd backend/LiveTracking.Api
dotnet build
dotnet run
```

---

## 🧪 Testing Checkliste

### Test 1: Lange Session
- [ ] Login durchführen
- [ ] Live-Tracking starten
- [ ] 30+ Minuten warten
- [ ] GPS-Updates funktionieren weiterhin
- [ ] Keine 401-Fehler

### Test 2: Activity beenden
- [ ] Live-Session starten (öffentlich)
- [ ] Öffentliche Karte öffnen (zweiter Browser/Tab)
- [ ] Activity beenden
- [ ] Karte zeigt "Beendet" (innerhalb 5 Sekunden)
- [ ] Keine weiteren GPS-Updates

### Test 3: Multiple Sessions
- [ ] Zwei Benutzer starten Live-Sessions
- [ ] Benutzer A beendet Activity
- [ ] Nur Session A wird beendet
- [ ] Session B läuft weiterhin

---

## 📊 Session-Verhalten

| Situation | Verhalten |
|-----------|-----------|
| Login | Token gültig für 7 Tage |
| Logout (manuell) | Token wird gelöscht |
| Token abgelaufen | 401 bei API-Request |
| Activity beenden | LiveSession wird beendet |
| Browser schließen | Token bleibt gültig (localStorage) |
| App im Hintergrund | Session bleibt aktiv |

---

## 🔒 Sicherheit

### Was ist implementiert?
✅ JWT mit Secret Key  
✅ Bearer Token Authentication  
✅ HTTPS in Production  
✅ Authorization auf Endpoints  
✅ User-bezogene Isolation  

### Empfehlungen für Production
⚠️ Secret Key in Environment Variable  
⚠️ HTTPS erzwingen (Redirect)  
⚠️ Rate Limiting für Login  
⚠️ Token Blacklist für Logout  

---

## 📝 Nächste Schritte

### Optional: Refresh Token implementieren
Falls du kürzere Access Token Laufzeit möchtest (z.B. 1 Stunde), aber längere Sessions:

1. **Frontend:** Token-Refresh vor Ablauf
2. **Backend:** Refresh-Endpoint bereits vorhanden
3. **Auto-Refresh:** Silent refresh im Hintergrund

### Optional: APK-Download im Dashboard
1. Static Files aktivieren (`app.UseStaticFiles()`)
2. APK in `wwwroot/downloads/` ablegen
3. Download-Link im Dashboard hinzufügen

Siehe: `APK_DEPLOYMENT_UPDATES.md` für Details

---

## 🐛 Troubleshooting

### Problem: 401 trotz Login
**Lösung:** Cache leeren, neu einloggen (alte Tokens laufen noch ab)

### Problem: LiveSession nicht beendet
**Lösung:** Backend-Logs prüfen:
```bash
docker-compose -f docker-compose.prod.yml logs backend | grep "LiveSession"
```

### Problem: SignalR funktioniert nicht
**Lösung:** 
- CORS-Settings prüfen
- SignalR-Verbindung in Browser-Console prüfen
- WebSocket-Support prüfen

---

## 📞 Support

Alle Details in:
- `SESSION_LIVETRACKING_FIXES.md` (vollständige Dokumentation)
- `APK_DEPLOYMENT_UPDATES.md` (APK-Deployment-Strategien)

Bei Fragen: Check die Logs!
```bash
# Backend
docker-compose logs -f backend

# Frontend (Browser)
F12 → Console
```
