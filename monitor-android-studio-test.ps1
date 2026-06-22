# ============================================
# Android Studio Testing Monitor
# Monitors Backend während Emulator-Tests
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📊 Android Studio Testing Monitor" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Instructions:" -ForegroundColor Yellow
Write-Host "   1. Start app in Android Studio Emulator" -ForegroundColor White
Write-Host "   2. Login and start activity" -ForegroundColor White
Write-Host "   3. This script will monitor backend" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter when app is ready..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "🔍 Monitoring backend for GPS updates..." -ForegroundColor Cyan
Write-Host "   (Updates every 10 seconds)" -ForegroundColor Gray
Write-Host ""

$API_URL = "http://localhost:5000"

# Get public sessions
function Get-PublicSessions {
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/public/live-sessions" -Method Get
        return $response
    } catch {
        return $null
    }
}

$lastSnapshots = @{}
$iteration = 0

while ($true) {
    $iteration++
    Clear-Host
    
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "📊 Live GPS Monitor (Iteration: $iteration)" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $sessions = Get-PublicSessions
    
    if ($sessions -and $sessions.Count -gt 0) {
        Write-Host "✅ Active Sessions: $($sessions.Count)" -ForegroundColor Green
        Write-Host ""
        
        foreach ($session in $sessions) {
            Write-Host "📍 Session: $($session.publicSessionId)" -ForegroundColor Cyan
            Write-Host "   User: $($session.displayName)" -ForegroundColor White
            Write-Host "   Started: $($session.startedAt)" -ForegroundColor White
            
            if ($session.currentSnapshot) {
                $snapshot = $session.currentSnapshot
                $sessionId = $session.publicSessionId
                
                # Parse timestamp
                $timestamp = [DateTime]::Parse($snapshot.timestampUtc)
                $ageSeconds = ([DateTime]::UtcNow - $timestamp).TotalSeconds
                
                Write-Host ""
                Write-Host "   GPS Data:" -ForegroundColor Yellow
                Write-Host "   ├─ Lat: $($snapshot.latitude.ToString('F6'))" -ForegroundColor White
                Write-Host "   ├─ Lon: $($snapshot.longitude.ToString('F6'))" -ForegroundColor White
                Write-Host "   ├─ Speed: $($snapshot.speedKmh) km/h" -ForegroundColor White
                Write-Host "   ├─ Distance: $($snapshot.distanceCompletedMeters) m" -ForegroundColor White
                Write-Host "   └─ Age: $([int]$ageSeconds)s ago" -ForegroundColor $(if ($ageSeconds -lt 60) { "Green" } else { "Yellow" })
                
                # Check if this is a new snapshot
                if ($lastSnapshots.ContainsKey($sessionId)) {
                    $lastTimestamp = $lastSnapshots[$sessionId]
                    if ($timestamp -gt $lastTimestamp) {
                        Write-Host ""
                        Write-Host "   🆕 NEW SNAPSHOT RECEIVED!" -ForegroundColor Green -BackgroundColor Black
                        $lastSnapshots[$sessionId] = $timestamp
                    }
                } else {
                    $lastSnapshots[$sessionId] = $timestamp
                }
                
            } else {
                Write-Host ""
                Write-Host "   ⚠️ No GPS data yet" -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "   -----------------------------------------" -ForegroundColor DarkGray
            Write-Host ""
        }
        
        # Summary
        $activeCount = ($sessions | Where-Object { $_.currentSnapshot -ne $null }).Count
        $recentCount = ($sessions | Where-Object { 
            $_.currentSnapshot -ne $null -and 
            (([DateTime]::UtcNow - [DateTime]::Parse($_.currentSnapshot.timestampUtc)).TotalSeconds -lt 60)
        }).Count
        
        Write-Host "📊 Summary:" -ForegroundColor Cyan
        Write-Host "   Active with GPS: $activeCount / $($sessions.Count)" -ForegroundColor White
        Write-Host "   Recent updates (<60s): $recentCount" -ForegroundColor $(if ($recentCount -gt 0) { "Green" } else { "Yellow" })
        
    } else {
        Write-Host "⚠️ No active sessions found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Possible reasons:" -ForegroundColor Gray
        Write-Host "   - Activity not started in app" -ForegroundColor Gray
        Write-Host "   - Live session not public" -ForegroundColor Gray
        Write-Host "   - Backend not running" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Next update in 10 seconds... (Ctrl+C to stop)" -ForegroundColor Gray
    
    Start-Sleep -Seconds 10
}
