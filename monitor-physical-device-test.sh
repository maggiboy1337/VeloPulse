#!/bin/bash

# ============================================
# Monitor Physical Device Test - Linux
# Backend monitoring during physical device testing
# ============================================

echo "========================================="
echo "📱 Android Device Testing - Background HTTP"
echo "========================================="
echo ""

echo "✅ App läuft auf Gerät"
echo "   Device: Xiaomi M2102J20SG"
echo ""

echo "📋 Test-Schritte:"
echo ""
echo "1️⃣  In der App:"
echo "   - Login (falls nötig)"
echo "   - Dashboard → 'Neues Tracking'"
echo "   - '✅ Live-Session öffentlich teilen' aktivieren"
echo "   - 'Tracking jetzt starten'"
echo ""

echo "2️⃣  GPS aktivieren:"
echo "   - Gehe nach draußen oder ans Fenster"
echo "   - Warte bis GPS-Signal gefunden"
echo "   - In App: Grünes GPS-Icon sollte erscheinen"
echo ""

echo "3️⃣  Background Test:"
echo "   - Drücke Power-Button (Display sperren)"
echo "   - Warte 2-3 Minuten"
echo "   - Dieses Script zeigt ob Daten ankommen"
echo ""

echo "Press Enter when tracking started..."
read

echo ""
echo "🔍 Monitoring Backend for GPS updates..."
echo "   (Press Ctrl+C to stop)"
echo ""

API_URL="${API_URL:-http://localhost:5000}"

# Check if backend is running
if ! curl -s -f "$API_URL/api/public/live-sessions" > /dev/null 2>&1; then
    echo "❌ Backend nicht erreichbar!"
    echo "   Bitte starten: cd backend/LiveTracking.Api && dotnet run"
    exit 1
fi

echo "✅ Backend erreichbar"
echo ""

ITERATION=0
declare -A LAST_SNAPSHOTS

while true; do
    ((ITERATION++))
    
    RESPONSE=$(curl -s "$API_URL/api/public/live-sessions")
    
    TIMESTAMP=$(date '+%H:%M:%S')
    echo "[$TIMESTAMP] Iteration $ITERATION"
    
    # Check if response contains sessions
    SESSION_COUNT=$(echo "$RESPONSE" | grep -o '"publicSessionId"' | wc -l)
    
    if [ "$SESSION_COUNT" -gt 0 ]; then
        # Parse each session
        echo "$RESPONSE" | python3 -c "
import sys, json

data = json.load(sys.stdin)

for session in data:
    session_id = session.get('publicSessionId', 'unknown')
    snapshot = session.get('currentSnapshot')
    
    if snapshot:
        lat = snapshot.get('latitude', 0)
        lon = snapshot.get('longitude', 0)
        speed = snapshot.get('speedKmh', 0)
        timestamp = snapshot.get('timestampUtc', '')
        
        print(f'   📍 Session: {session_id[:8]}...')
        print(f'      Lat: {lat:.6f}')
        print(f'      Lon: {lon:.6f}')
        print(f'      Speed: {speed} km/h')
        print(f'      Time: {timestamp}')
        print(f'   🆕 GPS DATA RECEIVED!')
    else:
        print(f'   ⚠️  Session active but no GPS data yet')
" 2>/dev/null || {
            # Fallback if python3 not available
            if echo "$RESPONSE" | grep -q '"currentSnapshot"'; then
                echo "   📍 GPS data present in response"
                LAT=$(echo "$RESPONSE" | grep -o '"latitude":[0-9.]*' | head -1 | cut -d':' -f2)
                LON=$(echo "$RESPONSE" | grep -o '"longitude":[0-9.]*' | head -1 | cut -d':' -f2)
                
                if [ ! -z "$LAT" ] && [ ! -z "$LON" ]; then
                    echo "      Lat: $LAT"
                    echo "      Lon: $LON"
                    echo "   🆕 NEW GPS POINT!"
                fi
            else
                echo "   ⚠️  Session active but no GPS data yet"
            fi
        }
    else
        echo "   ⚠️  No active sessions"
        echo "      Please start tracking in app"
    fi
    
    echo ""
    sleep 10
done
