# Test sending a LiveSnapshot manually
# Use this to test if the LiveSession endpoint works

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = "",
    
    [Parameter(Mandatory=$false)]
    [string]$LiveSessionId = ""
)

$API_URL = "http://localhost:5000"

Write-Host "=== Test Live Snapshot Upload ===" -ForegroundColor Cyan
Write-Host ""

# Get token if not provided
if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "Please provide your auth token." -ForegroundColor Yellow
    Write-Host "You can find it in browser DevTools -> Application -> Local Storage -> token" -ForegroundColor Gray
    $Token = Read-Host "Enter token"
}

# Get LiveSession ID if not provided
if ([string]::IsNullOrEmpty($LiveSessionId)) {
    Write-Host ""
    Write-Host "Fetching your active sessions..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
        }
        
        $sessions = Invoke-RestMethod -Uri "$API_URL/api/live-sessions/my-active" -Headers $headers -Method Get
        
        if ($sessions.Count -eq 0) {
            Write-Host "No active live sessions found!" -ForegroundColor Red
            Write-Host "Please start a tracking session first." -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "Found $($sessions.Count) active session(s):" -ForegroundColor Green
        for ($i = 0; $i -lt $sessions.Count; $i++) {
            Write-Host "  [$i] $($sessions[$i].publicSessionId) - Activity: $($sessions[$i].activityId)" -ForegroundColor White
        }
        
        if ($sessions.Count -eq 1) {
            $LiveSessionId = $sessions[0].id
            Write-Host ""
            Write-Host "Using session: $LiveSessionId" -ForegroundColor Green
        } else {
            $index = Read-Host "Select session index (0-$($sessions.Count-1))"
            $LiveSessionId = $sessions[$index].id
        }
    } catch {
        Write-Host "Error fetching sessions: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Sending test snapshot to LiveSession: $LiveSessionId" -ForegroundColor Yellow

# Create test snapshot (Munich area coordinates)
$snapshot = @{
    latitude = 48.1351
    longitude = 11.5820
    gpsAccuracyMeters = 10.0
    speedKmh = 15.5
    distanceCompletedMeters = 1234.56
    distanceRemainingMeters = $null
    routeProgressPercent = $null
    heartRateBpm = $null
    cadenceRpm = $null
    powerWatts = $null
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/live-sessions/$LiveSessionId/snapshots" `
        -Headers $headers `
        -Method Post `
        -Body $snapshot
    
    Write-Host "✓ Snapshot sent successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now check the public map - you should see a marker!" -ForegroundColor Green
    Write-Host "Public Map: http://localhost:5173" -ForegroundColor Cyan
    
} catch {
    Write-Host "✗ Error sending snapshot:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "To verify, run: .\check-live-session.ps1" -ForegroundColor Yellow
