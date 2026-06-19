#!/bin/bash

# Direct API Test - Raw Output
# Zeigt die rohe API-Antwort

API_URL="${1:-http://localhost:5000}"

echo "========================================"
echo "Direct API Test"
echo "API: $API_URL"
echo "========================================"
echo ""

echo "Calling: $API_URL/api/public/live-sessions"
echo ""

# Get raw response
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/api/public/live-sessions")

# Split response and status code
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | grep -v "HTTP_CODE:")

echo "Status: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ API Response (200 OK):"
    echo "========================================"
    
    # Try pretty print with Python
    if command -v python3 &> /dev/null; then
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo "$body"
    fi
    
    echo "========================================"
    echo ""
    
    # Basic analysis
    if echo "$body" | grep -q '"publicSessionId"'; then
        count=$(echo "$body" | grep -o '"publicSessionId"' | wc -l)
        echo "📊 Sessions gefunden: $count"
    else
        echo "📊 Sessions gefunden: 0"
    fi
    
    if echo "$body" | grep -q '"currentSnapshot":null'; then
        echo "⚠️  currentSnapshot ist NULL"
    elif echo "$body" | grep -q '"currentSnapshot":{'; then
        echo "✅ currentSnapshot hat Daten"
        
        if echo "$body" | grep -q '"latitude"'; then
            echo "✅ GPS-Koordinaten vorhanden"
        fi
    elif echo "$body" | grep -q '"currentSnapshot":{}'; then
        echo "⚠️  currentSnapshot ist leer"
    fi
    
else
    echo "❌ API Fehler (Status: $http_code)"
    echo "========================================"
    echo "$body"
    echo "========================================"
fi

echo ""
echo "Backend-Log prüfen mit:"
echo "  docker logs velopulse-backend-1 --tail 50"
echo ""
