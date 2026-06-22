#!/bin/bash

# ============================================
# Simple Backend Monitor (Linux)
# Checks if GPS points are arriving
# ============================================

API_URL="${API_URL:-http://localhost:5000}"

echo "🔍 Monitoring Backend API..."
echo "   URL: $API_URL"
echo "   (Press Ctrl+C to stop)"
echo ""

while true; do
    TIMESTAMP=$(date '+%H:%M:%S')
    
    # Get sessions
    RESPONSE=$(curl -s "$API_URL/api/public/live-sessions" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Count sessions
        COUNT=$(echo "$RESPONSE" | grep -o '"publicSessionId"' | wc -l)
        
        echo "[$TIMESTAMP] Active Sessions: $COUNT"
        
        # Check for GPS data
        if echo "$RESPONSE" | grep -q '"currentSnapshot"'; then
            # Extract coordinates (simple grep)
            LAT=$(echo "$RESPONSE" | grep -o '"latitude":[0-9.]*' | head -1 | cut -d':' -f2)
            LON=$(echo "$RESPONSE" | grep -o '"longitude":[0-9.]*' | head -1 | cut -d':' -f2)
            SPEED=$(echo "$RESPONSE" | grep -o '"speedKmh":[0-9.]*' | head -1 | cut -d':' -f2)
            
            if [ ! -z "$LAT" ]; then
                echo "   ✅ GPS: Lat=$LAT, Lon=$LON, Speed=$SPEED km/h"
            else
                echo "   ⚠️  GPS data structure changed"
            fi
        else
            echo "   ⏸️  No GPS data yet"
        fi
    else
        echo "[$TIMESTAMP] ❌ Backend not reachable"
    fi
    
    echo ""
    sleep 10
done
