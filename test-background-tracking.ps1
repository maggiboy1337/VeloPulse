# Quick Test Script for Background GPS Tracking - Phase 1 & 2
# PowerShell Version

Write-Host "🚀 Starting Background GPS Tracking Test..." -ForegroundColor Cyan
Write-Host ""

# Check if running in correct directory
if (-not (Test-Path "apps\public_web\package.json")) {
    Write-Host "❌ Error: Must be run from VeloPulse root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Test Checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Wake Lock API"
Write-Host "   - Display stays awake during tracking"
Write-Host "   - UI shows '🔒 Display aktiv'"
Write-Host "   - Console: '🔒 Wake Lock activated'"
Write-Host ""

Write-Host "2. Background-Modus Detection"
Write-Host "   - Switch tabs while tracking"
Write-Host "   - GPS continues in background"
Write-Host "   - UI shows '🌙 Hintergrund-Modus aktiv'"
Write-Host "   - Console: GPS Update [🌙 BACKGROUND]"
Write-Host ""

Write-Host "3. Heartbeat (every 15s)"
Write-Host "   - Console: '💓 Tracking Heartbeat [STATUS] [LOCK]: Points=X, Distance=Y'"
Write-Host ""

Write-Host "4. GPS Timeout Increased"
Write-Host "   - Timeout: 10s → 30s"
Write-Host "   - Fewer timeouts in buildings"
Write-Host ""

Write-Host "5. Sync Optimization"
Write-Host "   - Sync every 30s (was 60s)"
Write-Host "   - Faster background upload"
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Test browser support
Write-Host "🌐 Browser Compatibility:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Chrome/Edge 84+     - Full support" -ForegroundColor Green
Write-Host "✅ Safari 16.4+        - Full support" -ForegroundColor Green
Write-Host "✅ Firefox 126+        - Full support" -ForegroundColor Green
Write-Host "⚠️  Older browsers     - Fallback (no Wake Lock)" -ForegroundColor Yellow
Write-Host ""

# Test platform support
Write-Host "📱 Platform Support:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Android            - Excellent (Chrome/Edge)" -ForegroundColor Green
Write-Host "⚠️  iOS               - Limited (strict background rules)" -ForegroundColor Yellow
Write-Host "✅ Desktop            - Perfect" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Instructions
Write-Host "🧪 Testing Instructions:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start Backend:" -ForegroundColor Cyan
Write-Host "   cd backend\LiveTracking.Api && dotnet run"
Write-Host ""
Write-Host "2. Start Frontend:" -ForegroundColor Cyan
Write-Host "   cd apps\public_web && npm run dev"
Write-Host ""
Write-Host "3. Open Browser:" -ForegroundColor Cyan
Write-Host "   - Chrome/Edge recommended"
Write-Host "   - Navigate to: http://localhost:5173"
Write-Host ""
Write-Host "4. Start Activity:" -ForegroundColor Cyan
Write-Host "   - Login"
Write-Host "   - Start new tracking activity"
Write-Host "   - Open Browser Console (F12)"
Write-Host ""
Write-Host "5. Verify Features:" -ForegroundColor Cyan
Write-Host "   ✅ '🔒 Display aktiv' indicator visible"
Write-Host "   ✅ Display does not sleep"
Write-Host "   ✅ Switch tabs → '🌙 Hintergrund-Modus aktiv'"
Write-Host "   ✅ Console shows background GPS updates"
Write-Host "   ✅ Heartbeat every 15 seconds"
Write-Host ""
Write-Host "6. Test Background Tracking:" -ForegroundColor Cyan
Write-Host "   - Switch to different tab"
Write-Host "   - Wait 30 seconds"
Write-Host "   - Switch back"
Write-Host "   - Verify GPS points collected"
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Expected console output
Write-Host "📊 Expected Console Output:" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
🔒 Wake Lock activated - display will stay awake
🚀 GPS Queue Service started for activity: abc123
   Sync interval: 30 seconds
   Background-ready: Yes
🛰️ Starting GPS tracking (Background-ready)...
GPS watchPosition started with id: 1

📍 GPS Update [👁️ FOREGROUND]: lat=48.123456, lon=11.654321, acc=15.0m
✅ GPS point uploaded [FOREGROUND] to activity backend
✅ Live snapshot uploaded [FOREGROUND] (LiveSession ID: xyz789)

💓 Tracking Heartbeat [👁️ FOREGROUND] [🔒 LOCKED]: Points=5, Distance=0.12km

🌙 Page hidden - background tracking mode active
   GPS will continue tracking in background

📍 GPS Update [🌙 BACKGROUND]: lat=48.123789, lon=11.654654, acc=18.0m
✅ GPS point uploaded [BACKGROUND] to activity backend

💓 Tracking Heartbeat [🌙 BACKGROUND] [🔒 LOCKED]: Points=10, Distance=0.28km

🔄 Syncing 3 GPS points [🌙 BACKGROUND]...
✅ Sync completed [🌙 BACKGROUND]: 3 successful, 0 failed

👁️ Page visible - normal tracking mode
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Files changed
Write-Host "📝 Files Modified:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ apps\public_web\src\pages\LiveTracking.tsx" -ForegroundColor Green
Write-Host "   - Wake Lock API implementation"
Write-Host "   - Visibility API tracking"
Write-Host "   - Heartbeat mechanism"
Write-Host "   - UI indicators"
Write-Host ""
Write-Host "✅ apps\public_web\src\pages\LiveTracking.css" -ForegroundColor Green
Write-Host "   - Indicator styles"
Write-Host "   - Background mode UI"
Write-Host ""
Write-Host "✅ apps\public_web\src\services\gpsQueueService.ts" -ForegroundColor Green
Write-Host "   - Sync interval: 60s → 30s"
Write-Host "   - Background status logging"
Write-Host ""
Write-Host "✅ apps\public_web\src\vite-env.d.ts" -ForegroundColor Green
Write-Host "   - Wake Lock API type definitions"
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Documentation
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ PHASE1_2_BACKGROUND_TRACKING.md - Implementation details" -ForegroundColor Green
Write-Host "✅ TESTING_BACKGROUND_TRACKING.md  - Full test guide" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "✨ Ready to test! Follow the instructions above." -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Quick Links:" -ForegroundColor Cyan
Write-Host "   - Implementation: PHASE1_2_BACKGROUND_TRACKING.md"
Write-Host "   - Testing Guide: TESTING_BACKGROUND_TRACKING.md"
Write-Host "   - Frontend: http://localhost:5173"
Write-Host ""

Write-Host "💡 Pro Tip: Test on real mobile device for best results!" -ForegroundColor Magenta
Write-Host ""

# Optionally start services
$startServices = Read-Host "Start backend and frontend now? (y/n)"
if ($startServices -eq "y" -or $startServices -eq "Y") {
    Write-Host ""
    Write-Host "Starting services..." -ForegroundColor Cyan
    Write-Host ""
    
    # Start backend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend\LiveTracking.Api; dotnet run"
    
    # Wait a bit
    Start-Sleep -Seconds 2
    
    # Start frontend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\public_web; npm run dev"
    
    Write-Host "✅ Services starting in separate windows..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Wait for both to start, then open:" -ForegroundColor Yellow
    Write-Host "   http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
}
