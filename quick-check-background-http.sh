#!/bin/bash

# ============================================
# Quick check: Is Background HTTP working?
# Run this first to diagnose the issue
# ============================================

echo "========================================="
echo "🔍 Quick Check: Background HTTP Status"
echo "========================================="
echo ""

# Function to check adb
check_adb() {
    if ! command -v adb &> /dev/null; then
        echo "❌ adb not found"
        echo "   Install: sudo apt install adb"
        return 1
    fi
    
    if ! adb devices | grep -q "device$"; then
        echo "❌ No device connected"
        echo "   1. Connect device via USB"
        echo "   2. Enable USB debugging"
        echo "   3. Run: adb devices"
        return 1
    fi
    
    echo "✅ Device connected"
    return 0
}

# Function to check app
check_app() {
    local PACKAGE="de.velopulse.app"
    
    if ! adb shell pm list packages | grep -q "$PACKAGE"; then
        echo "❌ App not installed"
        return 1
    fi
    
    echo "✅ App installed: $PACKAGE"
    return 0
}

# Function to check logs for new code
check_new_code() {
    echo ""
    echo "🔍 Checking for Background HTTP code..."
    
    # Clear old logs
    adb logcat -c
    sleep 1
    
    # Get recent logs
    local LOGS=$(adb logcat -d | grep -E "backgroundHttpService|CAPACITOR HTTP" | head -n 5)
    
    if [ ! -z "$LOGS" ]; then
        echo "✅ NEW CODE DETECTED!"
        echo ""
        echo "Sample logs:"
        echo "$LOGS"
        return 0
    else
        echo "❌ OLD CODE STILL ACTIVE!"
        echo ""
        echo "🚨 PROBLEM FOUND:"
        echo "   The app is using OLD CODE without Background HTTP"
        echo ""
        echo "📋 Solution:"
        echo "   1. Build new APK: ./build-android-apk.sh"
        echo "   2. Install: adb install -r path/to/app-release.apk"
        echo "   3. Re-run this check"
        return 1
    fi
}

# Function to check if tracking is active
check_tracking() {
    echo ""
    echo "🔍 Checking if tracking is active..."
    
    # Look for GPS updates
    local GPS_LOGS=$(adb logcat -d | grep -E "GPS Update|Location update" | tail -n 3)
    
    if [ ! -z "$GPS_LOGS" ]; then
        echo "✅ GPS tracking is active"
        echo ""
        echo "Recent GPS updates:"
        echo "$GPS_LOGS"
        return 0
    else
        echo "⚠️ No GPS activity detected"
        echo "   Please start an activity in the app"
        return 1
    fi
}

# Function to check network requests
check_network() {
    echo ""
    echo "🔍 Checking network requests..."
    
    # Look for HTTP activity
    local HTTP_LOGS=$(adb logcat -d | grep -E "HTTP.*POST.*activities|LiveSession" | tail -n 3)
    
    if [ ! -z "$HTTP_LOGS" ]; then
        echo "✅ HTTP requests detected"
        echo ""
        echo "Recent requests:"
        echo "$HTTP_LOGS"
        return 0
    else
        echo "❌ No HTTP requests found"
        echo "   This confirms the issue: No data is being sent!"
        return 1
    fi
}

# Main execution
main() {
    echo "Running diagnostics..."
    echo ""
    
    # Check 1: ADB and Device
    if ! check_adb; then
        echo ""
        echo "❌ Cannot proceed without device connection"
        exit 1
    fi
    
    # Check 2: App installation
    if ! check_app; then
        echo ""
        echo "❌ App not found on device"
        exit 1
    fi
    
    # Check 3: Code version
    NEW_CODE=0
    if check_new_code; then
        NEW_CODE=1
    fi
    
    # Check 4: Tracking activity
    TRACKING=0
    if check_tracking; then
        TRACKING=1
    fi
    
    # Check 5: Network requests
    NETWORK=0
    if check_network; then
        NETWORK=1
    fi
    
    echo ""
    echo "========================================="
    echo "📊 Diagnosis Summary"
    echo "========================================="
    echo ""
    
    if [ $NEW_CODE -eq 0 ]; then
        echo "🚨 MAIN ISSUE: App has OLD CODE"
        echo ""
        echo "   Current situation:"
        echo "   ❌ backgroundHttpService NOT found"
        echo "   ❌ Still using fetch() (blocked in background)"
        echo ""
        echo "   ✅ SOLUTION:"
        echo "   1. Rebuild APK: ./build-android-apk.sh"
        echo "   2. Install new APK on device"
        echo "   3. Re-run this check"
        echo ""
        echo "   The code changes are in Git but NOT in your APK!"
    elif [ $TRACKING -eq 0 ]; then
        echo "⚠️ New code installed, but tracking not active"
        echo ""
        echo "   Please start an activity in the app first"
    elif [ $NETWORK -eq 0 ]; then
        echo "⚠️ Tracking active but no HTTP requests"
        echo ""
        echo "   Possible issues:"
        echo "   - Network connectivity"
        echo "   - API endpoint unreachable"
        echo "   - Token expired"
    else
        echo "✅ Everything looks good!"
        echo ""
        echo "   Next step: Test with locked display"
        echo "   Run: ./test-background-http.sh"
    fi
    
    echo ""
    echo "📋 Quick actions:"
    echo "  - View full logs: adb logcat | grep VeloPulse"
    echo "  - Check app version: ./check-app-version.sh"
    echo "  - Rebuild app: ./build-android-apk.sh"
    echo ""
}

# Run main
main
