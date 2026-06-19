# Quick Test - GPS Live Map
# Testet ob GPS-Koordinaten korrekt übertragen werden

$API_URL = "http://localhost:5000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Test: GPS Live Map" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Public Live Sessions API
Write-Host "Test 1: Fetching public live sessions..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/public/live-sessions" -Method Get
    
    Write-Host "✅ API erreichbar" -ForegroundColor Green
    Write-Host "   Sessions total: $($response.Count)" -ForegroundColor Cyan
    
    if ($response.Count -gt 0) {
        Write-Host ""
        Write-Host "Session Details:" -ForegroundColor Yellow
        
        foreach ($session in $response) {
            Write-Host ""
            Write-Host "  SessionId: $($session.publicSessionId)" -ForegroundColor Cyan
            Write-Host "  User: $($session.displayName)" -ForegroundColor Cyan
            Write-Host "  Started: $($session.startedAt)" -ForegroundColor Cyan
            
            if ($session.currentSnapshot) {
                Write-Host "  ✅ GPS: Lat=$($session.currentSnapshot.latitude), Lon=$($session.currentSnapshot.longitude)" -ForegroundColor Green
                Write-Host "  ✅ Speed: $($session.currentSnapshot.speedKmh) km/h" -ForegroundColor Green
                Write-Host "  ✅ Distance: $($session.currentSnapshot.distanceCompletedMeters) m" -ForegroundColor Green
                Write-Host "  ✅ Timestamp: $($session.currentSnapshot.timestampUtc)" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Keine GPS-Daten (currentSnapshot = null)" -ForegroundColor Red
                Write-Host "     → Tracking läuft noch nicht ODER" -ForegroundColor Yellow
                Write-Host "     → LiveSession-ID wurde nicht übergeben" -ForegroundColor Yellow
            }
            
            if ($session.routePoints -and $session.routePoints.Count -gt 0) {
                Write-Host "  📍 Route: $($session.routePoints.Count) Punkte" -ForegroundColor Cyan
            }
        }
        
        Write-Host ""
        Write-Host "Zusammenfassung:" -ForegroundColor Yellow
        $withGPS = ($response | Where-Object { $_.currentSnapshot -ne $null }).Count
        $withoutGPS = $response.Count - $withGPS
        Write-Host "  Mit GPS: $withGPS" -ForegroundColor $(if ($withGPS -gt 0) { "Green" } else { "Red" })
        Write-Host "  Ohne GPS: $withoutGPS" -ForegroundColor $(if ($withoutGPS -gt 0) { "Red" } else { "Green" })
        
    } else {
        Write-Host "  ℹ️  Keine aktiven Sessions gefunden" -ForegroundColor Yellow
        Write-Host "     Bitte starte eine neue Tracking-Session mit:" -ForegroundColor Cyan
        Write-Host "     1. Login → Dashboard → 'Neues Tracking'" -ForegroundColor Cyan
        Write-Host "     2. '✅ Live-Session öffentlich teilen' aktivieren" -ForegroundColor Cyan
        Write-Host "     3. 'Tracking jetzt starten'" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Fehler beim Abrufen der Sessions" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Bitte prüfen:" -ForegroundColor Yellow
    Write-Host "   1. Backend läuft (dotnet run im backend/LiveTracking.Api Ordner)" -ForegroundColor Yellow
    Write-Host "   2. URL korrekt: $API_URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 2: Check if Frontend is running
Write-Host "Test 2: Frontend Status..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -UseBasicParsing -TimeoutSec 2
    Write-Host "✅ Frontend läuft auf http://localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend nicht erreichbar" -ForegroundColor Yellow
    Write-Host "   Bitte starten mit: npm run dev (im apps/public_web Ordner)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Nächste Schritte:" -ForegroundColor Cyan
Write-Host "1. Falls 'Ohne GPS' > 0 → Browser-Konsole prüfen für Logs" -ForegroundColor White
Write-Host "2. Datenbank prüfen: .\check-live-snapshots.ps1" -ForegroundColor White
Write-Host "3. Public Map öffnen: http://localhost:5173/" -ForegroundColor White
Write-Host ""
