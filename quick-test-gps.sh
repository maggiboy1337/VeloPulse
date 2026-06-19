#!/bin/bash

# Quick Test - GPS Live Map
# Testet ob GPS-Koordinaten korrekt übertragen werden

API_URL="http://localhost:5000"

echo "========================================"
echo "Quick Test: GPS Live Map"
echo "========================================"
echo ""

# Test 1: Public Live Sessions API
echo "Test 1: Fetching public live sessions..."
response=$(curl -s "$API_URL/api/public/live-sessions")

if [ $? -eq 0 ]; then
    echo "✅ API erreichbar"
    
    # Count sessions
    session_count=$(echo "$response" | jq '. | length')
    echo "   Sessions total: $session_count"
    
    if [ "$session_count" -gt 0 ]; then
        echo ""
        echo "Session Details:"
        
        # Loop through sessions
        echo "$response" | jq -c '.[]' | while read -r session; do
            echo ""
            publicId=$(echo "$session" | jq -r '.publicSessionId')
            displayName=$(echo "$session" | jq -r '.displayName')
            startedAt=$(echo "$session" | jq -r '.startedAt')
            
            echo "  SessionId: $publicId"
            echo "  User: $displayName"
            echo "  Started: $startedAt"
            
            # Check if currentSnapshot exists
            hasSnapshot=$(echo "$session" | jq -r '.currentSnapshot != null')
            
            if [ "$hasSnapshot" = "true" ]; then
                lat=$(echo "$session" | jq -r '.currentSnapshot.latitude')
                lon=$(echo "$session" | jq -r '.currentSnapshot.longitude')
                speed=$(echo "$session" | jq -r '.currentSnapshot.speedKmh // "N/A"')
                distance=$(echo "$session" | jq -r '.currentSnapshot.distanceCompletedMeters')
                timestamp=$(echo "$session" | jq -r '.currentSnapshot.timestampUtc')
                
                echo "  ✅ GPS: Lat=$lat, Lon=$lon"
                echo "  ✅ Speed: $speed km/h"
                echo "  ✅ Distance: $distance m"
                echo "  ✅ Timestamp: $timestamp"
            else
                echo "  ❌ Keine GPS-Daten (currentSnapshot = null)"
                echo "     → Tracking läuft noch nicht ODER"
                echo "     → LiveSession-ID wurde nicht übergeben"
            fi
            
            routeCount=$(echo "$session" | jq -r '.routePoints | length')
            if [ "$routeCount" -gt 0 ]; then
                echo "  📍 Route: $routeCount Punkte"
            fi
        done
        
        echo ""
        echo "Zusammenfassung:"
        withGPS=$(echo "$response" | jq '[.[] | select(.currentSnapshot != null)] | length')
        withoutGPS=$((session_count - withGPS))
        
        if [ "$withGPS" -gt 0 ]; then
            echo "  Mit GPS: $withGPS ✅"
        else
            echo "  Mit GPS: $withGPS ❌"
        fi
        
        if [ "$withoutGPS" -gt 0 ]; then
            echo "  Ohne GPS: $withoutGPS ❌"
        else
            echo "  Ohne GPS: $withoutGPS ✅"
        fi
        
    else
        echo "  ℹ️  Keine aktiven Sessions gefunden"
        echo "     Bitte starte eine neue Tracking-Session mit:"
        echo "     1. Login → Dashboard → 'Neues Tracking'"
        echo "     2. '✅ Live-Session öffentlich teilen' aktivieren"
        echo "     3. 'Tracking jetzt starten'"
    fi
    
else
    echo "❌ Fehler beim Abrufen der Sessions"
    echo ""
    echo "   Bitte prüfen:"
    echo "   1. Backend läuft (dotnet run im backend/LiveTracking.Api Ordner)"
    echo "   2. URL korrekt: $API_URL"
    echo "   3. jq installiert: sudo apt install jq"
fi

echo ""
echo "========================================"
echo ""

# Test 2: Check if Frontend is running
echo "Test 2: Frontend Status..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173" | grep -q "200\|301\|302"; then
    echo "✅ Frontend läuft auf http://localhost:5173"
else
    echo "⚠️  Frontend nicht erreichbar"
    echo "   Bitte starten mit: npm run dev (im apps/public_web Ordner)"
fi

echo ""
echo "Nächste Schritte:"
echo "1. Falls 'Ohne GPS' > 0 → Browser-Konsole prüfen für Logs"
echo "2. Datenbank prüfen: ./check-live-snapshots.sh"
echo "3. Public Map öffnen: http://localhost:5173/"
echo ""
