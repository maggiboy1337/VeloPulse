#!/bin/bash

# ============================================
# Test Background HTTP für Android
# Testet GPS-Upload bei gesperrtem Display
# ============================================

echo "========================================="
echo "🧪 Testing Background HTTP on Android"
echo "========================================="
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ Error: adb not found. Please install Android SDK Platform Tools."
    exit 1
fi

# Check if device is connected
DEVICE_COUNT=$(adb devices | grep -c "device$")
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "❌ Error: No Android device connected."
    echo "   Please connect your device via USB and enable USB debugging."
    exit 1
fi

echo "✅ Android device connected"
echo ""

# Instructions
echo "📋 Test Instructions:"
echo "   1. Start an Activity in the VeloPulse app"
echo "   2. Make sure GPS is enabled and tracking started"
echo "   3. Press Enter when ready..."
read

echo ""
echo "🔒 Step 1: Locking device display..."
adb shell input keyevent 26  # Power button
echo "   Display locked ✓"
sleep 3

echo ""
echo "📊 Step 2: Monitoring logs for 60 seconds..."
echo "   Looking for Background HTTP activity..."
echo ""

SUCCESS_COUNT=0
ERROR_COUNT=0
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 60))

while [ $(date +%s) -lt $END_TIME ]; do
    # Get recent logs
    LOGS=$(adb logcat -d -s "Capacitor:V" | grep -E "CAPACITOR HTTP|GPS point uploaded|Background HTTP" | tail -n 5)
    
    if [ ! -z "$LOGS" ]; then
        echo "$LOGS" | while IFS= read -r line; do
            if echo "$line" | grep -qE "✅.*Success|GPS point uploaded.*Background HTTP"; then
                echo "   ✅ $line"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            elif echo "$line" | grep -qE "❌|Error|Failed"; then
                echo "   ❌ $line"
                ERROR_COUNT=$((ERROR_COUNT + 1))
            elif echo "$line" | grep -qE "🚀.*\[BG\]"; then
                echo "   🚀 $line"
            else
                echo "   📝 $line"
            fi
        done
    fi
    
    sleep 5
    
    # Show progress
    ELAPSED=$(($(date +%s) - START_TIME))
    REMAINING=$((60 - ELAPSED))
    echo -ne "\r   Remaining: ${REMAINING}s | Success: $SUCCESS_COUNT | Errors: $ERROR_COUNT"
done

echo ""
echo ""

echo "🔓 Step 3: Unlocking device..."
adb shell input keyevent 82  # Menu button to wake up
sleep 1
echo "   Please unlock the device manually if needed"

echo ""
echo "========================================="
echo "📊 Test Results:"
echo "   Success: $SUCCESS_COUNT"
echo "   Errors: $ERROR_COUNT"
echo ""

if [ "$SUCCESS_COUNT" -gt 0 ]; then
    echo "✅ Test PASSED: Background HTTP is working!"
    echo "   GPS points are being sent even with locked display."
else
    echo "⚠️ Test INCONCLUSIVE: No background activity detected."
    echo "   Possible reasons:"
    echo "   - Activity not started in app"
    echo "   - GPS not enabled"
    echo "   - Network connectivity issues"
    echo "   - App not rebuilt with new code"
    echo ""
    echo "   Check full logs with: adb logcat | grep Capacitor"
fi

echo ""
echo "🔍 To check Backend, run:"
echo "   curl -H 'Authorization: Bearer {token}' https://api.velopulse.de/api/activities/{activityId}/details"
echo ""
