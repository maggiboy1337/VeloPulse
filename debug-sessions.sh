#!/bin/bash

# Debug: Why no sessions visible?
# Analysiert warum Sessions nicht in der API erscheinen

echo "========================================"
echo "Session Debugging Tool"
echo "========================================"
echo ""

# Step 1: Check API
echo "Step 1: API Response"
echo "----------------------------------------"
API_URL="${1:-http://localhost:5000}"
response=$(curl -s "$API_URL/api/public/live-sessions")

if [ $? -eq 0 ]; then
    echo "✅ API erreichbar"
    
    if echo "$response" | python3 -m json.tool 2>/dev/null > /dev/null; then
        echo "✅ Gültiges JSON"
        echo ""
        echo "Response:"
        echo "$response" | python3 -m json.tool
    else
        echo "⚠️  Response ist kein gültiges JSON:"
        echo "$response"
    fi
else
    echo "❌ API nicht erreichbar"
    exit 1
fi

echo ""
echo "----------------------------------------"
echo ""

# Step 2: Database check
echo "Step 2: Datenbank-Check"
echo "----------------------------------------"

if ! command -v psql &> /dev/null; then
    echo "❌ psql nicht installiert"
    echo "   Installieren: apt install postgresql-client"
    exit 1
fi

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-livetracking}"
DB_USER="${DB_USER:-livetracking_user}"
DB_PASS="${DB_PASS:-SecurePassword123!}"

export PGPASSWORD="$DB_PASS"

echo "Verbindung: $DB_USER@$DB_HOST/$DB_NAME"
echo ""

# Test connection
if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Datenbank-Verbindung fehlgeschlagen"
    echo ""
    echo "Bitte prüfen:"
    echo "  DB_HOST=$DB_HOST"
    echo "  DB_NAME=$DB_NAME"
    echo "  DB_USER=$DB_USER"
    echo "  DB_PASS=$DB_PASS"
    echo ""
    echo "Umgebungsvariablen setzen:"
    echo "  export DB_HOST=localhost"
    echo "  export DB_PASS=DeinPasswort"
    exit 1
fi

echo "✅ Datenbank-Verbindung erfolgreich"
echo ""

# Check all LiveSessions
echo "Alle LiveSessions (Letzte 5):"
echo ""
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        \"Id\",
        \"PublicSessionId\",
        \"IsPublic\",
        \"StartedAt\",
        \"EndedAt\",
        (\"EndedAt\" IS NULL) as \"IsActive\"
    FROM \"LiveSessions\" 
    ORDER BY \"StartedAt\" DESC
    LIMIT 5;
"

echo ""
echo "Öffentliche aktive Sessions:"
echo ""
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        ls.\"PublicSessionId\",
        ls.\"IsPublic\",
        ls.\"StartedAt\",
        u.\"UserName\",
        COUNT(snap.\"Id\") as \"SnapshotCount\"
    FROM \"LiveSessions\" ls
    LEFT JOIN \"AspNetUsers\" u ON ls.\"UserId\" = u.\"Id\"
    LEFT JOIN \"LiveSnapshots\" snap ON ls.\"Id\" = snap.\"LiveSessionId\"
    WHERE ls.\"IsPublic\" = true AND ls.\"EndedAt\" IS NULL
    GROUP BY ls.\"PublicSessionId\", ls.\"IsPublic\", ls.\"StartedAt\", u.\"UserName\";
"

echo ""
echo "Snapshots (Letzte 5):"
echo ""
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        snap.\"Id\",
        snap.\"PublicSessionId\",
        snap.\"TimestampUtc\",
        snap.\"Latitude\",
        snap.\"Longitude\",
        snap.\"CreatedAt\"
    FROM \"LiveSnapshots\" snap
    ORDER BY snap.\"CreatedAt\" DESC
    LIMIT 5;
"

echo ""
echo "----------------------------------------"
echo ""

# Step 3: Compare
echo "Step 3: Analyse"
echo "----------------------------------------"

# Count sessions in DB
db_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
    SELECT COUNT(*) 
    FROM \"LiveSessions\" 
    WHERE \"IsPublic\" = true AND \"EndedAt\" IS NULL;
")

# Count sessions in API
if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
    api_count=$(echo "$response" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
else
    api_count=0
fi

echo "Sessions in Datenbank: $db_count"
echo "Sessions in API:       $api_count"
echo ""

if [ "$db_count" -gt 0 ] && [ "$api_count" -eq 0 ]; then
    echo "❌ PROBLEM GEFUNDEN:"
    echo "   Datenbank hat Sessions, aber API liefert keine!"
    echo ""
    echo "Mögliche Ursachen:"
    echo "1. Backend verbindet zu falscher Datenbank"
    echo "2. Fehler im PublicLiveSessionsController"
    echo "3. Include/Join-Problem beim Laden"
    echo ""
    echo "Prüfen:"
    echo "  docker logs velopulse-backend-1 --tail 100"
    echo "  Backend appsettings.json → ConnectionString"
    
elif [ "$db_count" -eq 0 ]; then
    echo "ℹ️  Keine aktiven öffentlichen Sessions in DB"
    echo ""
    echo "Session starten mit:"
    echo "1. Tracking-Start-Seite öffnen"
    echo "2. ✅ 'Live-Session öffentlich teilen' aktivieren"
    echo "3. 'Tracking jetzt starten'"
    echo ""
    echo "Oder prüfe ob Sessions existieren aber nicht öffentlich:"
    
    private_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
        SELECT COUNT(*) 
        FROM \"LiveSessions\" 
        WHERE \"IsPublic\" = false AND \"EndedAt\" IS NULL;
    ")
    
    if [ "$private_count" -gt 0 ]; then
        echo ""
        echo "⚠️  $private_count private Session(s) gefunden!"
        echo "   Diese sind nicht auf der Public Map sichtbar."
    fi
    
elif [ "$db_count" -gt 0 ] && [ "$api_count" -gt 0 ]; then
    echo "✅ Sessions werden korrekt ausgegeben"
    echo ""
    echo "Falls 'Warte auf GPS' angezeigt wird:"
    echo "→ currentSnapshot ist null"
    echo "→ GPS-Daten werden nicht gesendet"
    echo "→ Browser-Konsole prüfen!"
fi

unset PGPASSWORD

echo ""
echo "========================================"
echo ""
