#!/bin/bash

# ============================================
# Check if Background HTTP code is in app
# Verifies if app was rebuilt with new code
# ============================================

echo "========================================="
echo "🔍 Checking if Background HTTP is active"
echo "========================================="
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ Error: adb not found"
    exit 1
fi

# Check if device is connected
DEVICE_COUNT=$(adb devices | grep -c "device$")
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "❌ No Android device connected"
    exit 1
fi

echo "✅ Device connected"
echo ""

# Get package name
PACKAGE="de.velopulse.app"  # Adjust if different

echo "📱 Checking app package: $PACKAGE"
echo ""

# Check if app is installed
if ! adb shell pm list packages | grep -q "$PACKAGE"; then
    echo "❌ App not installed on device"
    echo "   Please install the APK first"
    exit 1
fi

echo "✅ App is installed"
echo ""

# Start monitoring logs
echo "🔍 Monitoring app logs for 10 seconds..."
echo "   Looking for Background HTTP indicators..."
echo ""

# Clear logcat
adb logcat -c

# Wait for logs
sleep 2

# Check logs
LOGS=$(adb logcat -d -s "Capacitor:V" "chromium:I" | grep -E "backgroundHttpService|CAPACITOR HTTP|Background HTTP")

if [ ! -z "$LOGS" ]; then
    echo "✅ Background HTTP code detected!"
    echo ""
    echo "Found logs:"
    echo "$LOGS"
    echo ""
    echo "✅ App was rebuilt with new code"
else
    echo "❌ No Background HTTP code found in logs"
    echo ""
    echo "⚠️ PROBLEM: App is using OLD CODE!"
    echo ""
    echo "📋 Required actions:"
    echo "   1. Rebuild app with: npx cap sync android"
    echo "   2. Build APK in Android Studio"
    echo "   3. Install new APK: adb install -r app-release.apk"
    echo ""
    echo "🔍 Current code check:"
    echo "   Looking for service initialization..."
    
    # Try to find any Capacitor logs
    CAPACITOR_LOGS=$(adb logcat -d | grep -i capacitor | head -n 5)
    if [ ! -z "$CAPACITOR_LOGS" ]; then
        echo ""
        echo "Found Capacitor activity:"
        echo "$CAPACITOR_LOGS"
    fi
fi

echo ""
echo "========================================="
echo ""

# Additional check: Look for old code patterns
echo "🔍 Checking for old code patterns..."
OLD_PATTERN=$(adb logcat -d | grep -E "sendSnapshotRef|gpsQueueService\.enqueue" | head -n 3)

if [ ! -z "$OLD_PATTERN" ]; then
    echo "⚠️ WARNING: Old code patterns found!"
    echo "$OLD_PATTERN"
    echo ""
    echo "❌ App is definitely using OLD CODE"
    echo "   Please rebuild and reinstall the app"
else
    echo "✅ No old code patterns found"
fi

echo ""
echo "Next steps:"
echo "1. If old code: Rebuild app and reinstall"
echo "2. If new code: Run test-background-http.sh"
echo ""
