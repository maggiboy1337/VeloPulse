#!/bin/bash

# ============================================
# ADB Logcat Monitor (Linux)
# Monitors Android logs for Background HTTP
# ============================================

echo "========================================="
echo "📱 ADB Logcat Monitor - Background HTTP"
echo "========================================="
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ adb not found"
    echo "   Install: sudo apt install adb"
    exit 1
fi

# Check device
if ! adb devices | grep -q "device$"; then
    echo "❌ No device connected"
    echo "   Please connect device via USB"
    exit 1
fi

echo "✅ Device connected"
echo ""

echo "🔍 Monitoring logcat for Background HTTP..."
echo "   Looking for: CAPACITOR HTTP, Background HTTP"
echo "   (Press Ctrl+C to stop)"
echo ""

# Clear old logs
adb logcat -c

# Start monitoring
adb logcat -s "Capacitor:V" | while IFS= read -r line; do
    TIMESTAMP=$(date '+%H:%M:%S')
    
    # Check for important patterns
    if echo "$line" | grep -qE "CAPACITOR HTTP|Background HTTP|GPS point uploaded"; then
        if echo "$line" | grep -qE "\[BG\]"; then
            echo "[$TIMESTAMP] 🚀 $line"
        elif echo "$line" | grep -qE "Success|✅"; then
            echo "[$TIMESTAMP] ✅ $line"
        elif echo "$line" | grep -qE "Error|Failed|❌"; then
            echo "[$TIMESTAMP] ❌ $line"
        else
            echo "[$TIMESTAMP] 📝 $line"
        fi
    fi
done
