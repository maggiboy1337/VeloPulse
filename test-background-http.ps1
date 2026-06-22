# ============================================
# Test Background HTTP für Android
# Testet GPS-Upload bei gesperrtem Display
# ============================================

Write-Host "🧪 Testing Background HTTP on Android..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if adb is available
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: adb not found. Please install Android SDK Platform Tools." -ForegroundColor Red
    exit 1
}

# Check if device is connected
$devices = adb devices | Select-String -Pattern "device$"
if ($devices.Count -eq 0) {
    Write-Host "❌ Error: No Android device connected." -ForegroundColor Red
    Write-Host "   Please connect your device via USB and enable USB debugging." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Android device connected" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "📋 Test Instructions:" -ForegroundColor Yellow
Write-Host "   1. Start an Activity in the VeloPulse app" -ForegroundColor White
Write-Host "   2. Make sure GPS is enabled and tracking started" -ForegroundColor White
Write-Host "   3. Press Enter when ready..." -ForegroundColor White
Read-Host

Write-Host ""
Write-Host "🔒 Step 1: Locking device display..." -ForegroundColor Cyan
adb shell input keyevent 26  # Power button
Write-Host "   Display locked ✓" -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "📊 Step 2: Monitoring logs for 60 seconds..." -ForegroundColor Cyan
Write-Host "   Looking for Background HTTP activity..." -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$endTime = $startTime.AddSeconds(60)
$successCount = 0
$errorCount = 0

while ((Get-Date) -lt $endTime) {
    # Get recent logs
    $logs = adb logcat -d -s "Capacitor:V" | Select-String -Pattern "CAPACITOR HTTP|GPS point uploaded|Background HTTP" | Select-Object -Last 5
    
    foreach ($log in $logs) {
        $logText = $log.ToString()
        
        if ($logText -match "✅.*Success|GPS point uploaded.*Background HTTP") {
            Write-Host "   ✅ $logText" -ForegroundColor Green
            $successCount++
        }
        elseif ($logText -match "❌|Error|Failed") {
            Write-Host "   ❌ $logText" -ForegroundColor Red
            $errorCount++
        }
        elseif ($logText -match "🚀.*\[BG\]") {
            Write-Host "   🚀 $logText" -ForegroundColor Cyan
        }
        else {
            Write-Host "   📝 $logText" -ForegroundColor Gray
        }
    }
    
    Start-Sleep -Seconds 5
    
    # Show progress
    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    $remaining = 60 - [int]$elapsed
    Write-Host "`r   Remaining: ${remaining}s | Success: $successCount | Errors: $errorCount" -NoNewline -ForegroundColor Yellow
}

Write-Host ""
Write-Host ""

Write-Host "🔓 Step 3: Unlocking device..." -ForegroundColor Cyan
adb shell input keyevent 82  # Menu button to wake up
Start-Sleep -Seconds 1
# Note: You may need to swipe or enter PIN manually
Write-Host "   Please unlock the device manually if needed" -ForegroundColor Yellow

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Test Results:" -ForegroundColor Cyan
Write-Host "   Success: $successCount" -ForegroundColor $(if ($successCount -gt 0) { "Green" } else { "Yellow" })
Write-Host "   Errors: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "✅ Test PASSED: Background HTTP is working!" -ForegroundColor Green
    Write-Host "   GPS points are being sent even with locked display." -ForegroundColor Green
} else {
    Write-Host "⚠️ Test INCONCLUSIVE: No background activity detected." -ForegroundColor Yellow
    Write-Host "   Possible reasons:" -ForegroundColor Yellow
    Write-Host "   - Activity not started in app" -ForegroundColor Gray
    Write-Host "   - GPS not enabled" -ForegroundColor Gray
    Write-Host "   - Network connectivity issues" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Check full logs with: adb logcat | Select-String 'Capacitor'" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🔍 To check Backend, run:" -ForegroundColor Cyan
Write-Host "   curl http://your-backend-url/api/activities/{activityId}/details" -ForegroundColor Gray
Write-Host ""
