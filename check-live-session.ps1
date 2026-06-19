# Check Live Session Status
# This script checks if LiveSessions exist and have snapshots

$API_URL = "http://localhost:5000"

Write-Host "=== Checking Live Sessions ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check public live sessions (no auth needed)
Write-Host "1. Public Live Sessions:" -ForegroundColor Yellow
try {
    $publicSessions = Invoke-RestMethod -Uri "$API_URL/api/public/live-sessions" -Method Get
    Write-Host "   Found $($publicSessions.Count) public session(s)" -ForegroundColor Green
    
    foreach ($session in $publicSessions) {
        Write-Host ""
        Write-Host "   Session ID: $($session.publicSessionId)" -ForegroundColor White
        Write-Host "   Display Name: $($session.displayName)" -ForegroundColor White
        Write-Host "   Started At: $($session.startedAt)" -ForegroundColor White
        
        if ($session.currentSnapshot) {
            Write-Host "   ✓ HAS SNAPSHOT!" -ForegroundColor Green
            Write-Host "     Latitude: $($session.currentSnapshot.latitude)" -ForegroundColor White
            Write-Host "     Longitude: $($session.currentSnapshot.longitude)" -ForegroundColor White
            Write-Host "     Distance: $($session.currentSnapshot.distanceCompletedMeters)m" -ForegroundColor White
            Write-Host "     Timestamp: $($session.currentSnapshot.timestampUtc)" -ForegroundColor White
        } else {
            Write-Host "   ✗ NO SNAPSHOT - This is why no marker appears!" -ForegroundColor Red
        }
        
        if ($session.routePoints -and $session.routePoints.Count -gt 0) {
            Write-Host "   Route Points: $($session.routePoints.Count)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Solution ===" -ForegroundColor Cyan
Write-Host "If 'NO SNAPSHOT' appears above:" -ForegroundColor Yellow
Write-Host "1. Make sure you've refreshed the LiveTracking page after the code changes" -ForegroundColor White
Write-Host "2. Check the browser console in LiveTracking for 'Found LiveSession ID:' message" -ForegroundColor White
Write-Host "3. Check for 'Live snapshot uploaded to backend' message every 10 seconds" -ForegroundColor White
Write-Host "4. If not appearing, the new code might not be loaded yet - try Ctrl+F5" -ForegroundColor White
Write-Host ""
Write-Host "To manually test sending a snapshot, run: .\test-send-live-snapshot.ps1" -ForegroundColor Green
