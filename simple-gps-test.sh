#!/bin/bash

# Simple GPS Test - No dependencies required
# Tests if GPS coordinates are transmitted correctly

API_URL="http://localhost:5000"

echo "========================================"
echo "Simple GPS Test (No jq required)"
echo "========================================"
echo ""

# Test 1: Get raw JSON
echo "Test 1: Fetching public live sessions..."
echo ""

response=$(curl -s "$API_URL/api/public/live-sessions")

if [ $? -eq 0 ]; then
    echo "✅ API erreichbar"
    echo ""
    echo "Raw JSON Response:"
    echo "----------------------------------------"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo "----------------------------------------"
    echo ""
    
    # Count sessions (simple check)
    if echo "$response" | grep -q "publicSessionId"; then
        session_count=$(echo "$response" | grep -o "publicSessionId" | wc -l)
        echo "📊 Gefundene Sessions: $session_count"
        
        # Check for GPS data
        if echo "$response" | grep -q "currentSnapshot"; then
            echo "✅ Sessions haben currentSnapshot"
            
            # Check if currentSnapshot has data or is null
            if echo "$response" | grep -q '"currentSnapshot":null'; then
                echo "⚠️  WARNUNG: currentSnapshot ist NULL!"
                echo "   → GPS-Daten werden nicht gesendet"
            else
                echo "✅ currentSnapshot enthält Daten"
                
                # Try to extract coordinates
                if echo "$response" | grep -q "latitude"; then
                    echo "✅ GPS-Koordinaten gefunden"
                else
                    echo "❌ Keine GPS-Koordinaten in Snapshot"
                fi
            fi
        else
            echo "❌ Keine currentSnapshot Property"
        fi
    else
        echo "ℹ️  Keine aktiven Sessions"
        echo ""
        echo "Mögliche Gründe:"
        echo "1. Keine Session gestartet"
        echo "2. Session ist nicht öffentlich (isPublic = false)"
        echo "3. Session wurde beendet (endedAt ist gesetzt)"
    fi
else
    echo "❌ API nicht erreichbar"
    echo "   Backend läuft nicht oder falsche URL: $API_URL"
fi

echo ""
echo "========================================"
echo ""

# Test 2: Direct database query if psql is available
echo "Test 2: Datenbank-Check (falls psql installiert)..."
echo ""

if command -v psql &> /dev/null; then
    # Try to connect (you may need to adjust these)
    DB_HOST="localhost"
    DB_NAME="livetracking"
    DB_USER="livetracking_user"
    
    echo "Versuche Verbindung zu PostgreSQL..."
    
    # Simple query without password prompt
    export PGPASSWORD="SecurePassword123!"
    
    result=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM \"LiveSessions\" WHERE \"IsPublic\" = true AND \"EndedAt\" IS NULL;" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Datenbank-Verbindung erfolgreich"
        echo "   Aktive öffentliche Sessions: $result"
        
        if [ "$result" -gt 0 ]; then
            echo ""
            echo "Session-Details:"
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT 
                    \"PublicSessionId\",
                    \"IsPublic\",
                    \"StartedAt\",
                    \"EndedAt\"
                FROM \"LiveSessions\" 
                WHERE \"IsPublic\" = true AND \"EndedAt\" IS NULL
                LIMIT 5;
            " 2>&1
            
            echo ""
            echo "Snapshot-Count pro Session:"
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT 
                    ls.\"PublicSessionId\",
                    COUNT(snap.\"Id\") as SnapshotCount
                FROM \"LiveSessions\" ls
                LEFT JOIN \"LiveSnapshots\" snap ON ls.\"Id\" = snap.\"LiveSessionId\"
                WHERE ls.\"IsPublic\" = true AND ls.\"EndedAt\" IS NULL
                GROUP BY ls.\"PublicSessionId\";
            " 2>&1
        else
            echo ""
            echo "⚠️  Keine aktiven öffentlichen Sessions in Datenbank"
            echo ""
            echo "Prüfe alle Sessions (auch private/beendete):"
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
                SELECT 
                    \"PublicSessionId\",
                    \"IsPublic\",
                    \"StartedAt\",
                    \"EndedAt\"
                FROM \"LiveSessions\" 
                ORDER BY \"StartedAt\" DESC
                LIMIT 5;
            " 2>&1
        fi
    else
        echo "❌ Datenbank-Verbindung fehlgeschlagen"
        echo "   Fehler: $result"
        echo ""
        echo "   Mögliche Ursachen:"
        echo "   1. Falsches Passwort (aktuell: SecurePassword123!)"
        echo "   2. Falscher Datenbankname (aktuell: $DB_NAME)"
        echo "   3. PostgreSQL läuft nicht"
    fi
    
    unset PGPASSWORD
else
    echo "⚠️  psql nicht installiert - Datenbank-Check übersprungen"
    echo "   Installieren mit: apt install postgresql-client"
fi

echo ""
echo "========================================"
echo ""
echo "Troubleshooting:"
echo "1. API zeigt Sessions, aber DB nicht?"
echo "   → Backend verbindet zu anderer DB"
echo ""
echo "2. currentSnapshot ist null?"
echo "   → GPS wird nicht gesendet"
echo "   → Browser-Konsole prüfen"
echo ""
echo "3. Keine Sessions sichtbar?"
echo "   → Session ist nicht öffentlich (isPublic=false)"
echo "   → Session wurde beendet"
echo ""
echo "Manuelle Tests:"
echo "  curl $API_URL/api/public/live-sessions"
echo "  psql -h localhost -U livetracking_user -d livetracking"
echo ""
