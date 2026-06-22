# ============================================
# Start App & Monitor Logs
# Für physisches Android-Gerät Testing
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📱 Android Device Testing - Background HTTP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ App läuft auf Gerät (Process ID: 1704)" -ForegroundColor Green
Write-Host "   Device: Xiaomi M2102J20SG" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Test-Schritte:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  In der App:" -ForegroundColor White
Write-Host "   - Login (falls nötig)" -ForegroundColor Gray
Write-Host "   - Dashboard → 'Neues Tracking'" -ForegroundColor Gray
Write-Host "   - '✅ Live-Session öffentlich teilen' aktivieren" -ForegroundColor Gray
Write-Host "   - 'Tracking jetzt starten'" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  GPS aktivieren:" -ForegroundColor White
Write-Host "   - Gehe nach draußen oder ans Fenster" -ForegroundColor Gray
Write-Host "   - Warte bis GPS-Signal gefunden" -ForegroundColor Gray
Write-Host "   - In App: Grünes GPS-Icon sollte erscheinen" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Background Test:" -ForegroundColor White
Write-Host "   - Drücke Power-Button (Display sperren)" -ForegroundColor Gray
Write-Host "   - Warte 2-3 Minuten" -ForegroundColor Gray
Write-Host "   - Dieses Script zeigt ob Daten ankommen" -ForegroundColor Gray
Write-Host ""

Write-Host "Press Enter when tracking started..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "🔍 Monitoring Backend for GPS updates..." -ForegroundColor Cyan
Write-Host "   (Press Ctrl+C to stop)" -ForegroundColor Gray
Write-Host ""

$API_URL = "http://localhost:5000"

# Check if backend is running
try {
    $testResponse = Invoke-RestMethod -Uri "$API_URL/api/public/live-sessions" -Method Get -TimeoutSec 5
    Write-Host "✅ Backend erreichbar" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend nicht erreichbar!" -ForegroundColor Red
    Write-Host "   Bitte starten: cd backend\LiveTracking.Api; dotnet run" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

$iteration = 0
$lastSnapshots = @{}

while ($true) {
    $iteration++
    
    try {
        $sessions = Invoke-RestMethod -Uri "$API_URL/api/public/live-sessions" -Method Get
        
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Iteration $iteration" -ForegroundColor Cyan
        
        if ($sessions -and $sessions.Count -gt 0) {
            foreach ($session in $sessions) {
                $sessionId = $session.publicSessionId
                
                if ($session.currentSnapshot) {
                    $snapshot = $session.currentSnapshot
                    $timestamp = [DateTime]::Parse($snapshot.timestampUtc)
                    $ageSeconds = ([DateTime]::UtcNow - $timestamp).TotalSeconds
                    
                    # Check if new snapshot
                    if ($lastSnapshots.ContainsKey($sessionId)) {
                        $lastTimestamp = $lastSnapshots[$sessionId]
                        if ($timestamp -gt $lastTimestamp) {
                            Write-Host "   🆕 NEW GPS POINT!" -ForegroundColor Green -BackgroundColor Black
                            Write-Host "      Lat: $($snapshot.latitude.ToString('F6'))" -ForegroundColor Green
                            Write-Host "      Lon: $($snapshot.longitude.ToString('F6'))" -ForegroundColor Green
                            Write-Host "      Speed: $($snapshot.speedKmh) km/h" -ForegroundColor Green
                            Write-Host "      Age: $([int]$ageSeconds)s" -ForegroundColor Green
                            $lastSnapshots[$sessionId] = $timestamp
                        } else {
                            Write-Host "   ⏸️  No new data (Last: $([int]$ageSeconds)s ago)" -ForegroundColor Yellow
                        }
                    } else {
                        Write-Host "   📍 Initial GPS point received" -ForegroundColor Cyan
                        Write-Host "      Lat: $($snapshot.latitude.ToString('F6'))" -ForegroundColor Cyan
                        Write-Host "      Lon: $($snapshot.longitude.ToString('F6'))" -ForegroundColor Cyan
                        $lastSnapshots[$sessionId] = $timestamp
                    }
                } else {
                    Write-Host "   ⚠️  Session active but no GPS data yet" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "   ⚠️  No active sessions" -ForegroundColor Yellow
            Write-Host "      Please start tracking in app" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Seconds 10
}
