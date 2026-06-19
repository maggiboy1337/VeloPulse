#!/bin/bash

# Check LiveSession Snapshots in Database
# This script verifies if GPS snapshots are stored for public live sessions

SERVER="localhost"
DATABASE="livetracking"
USERNAME="livetracking_user"
PASSWORD="SecurePassword123!"

export PGPASSWORD="$PASSWORD"

echo "========================================"
echo "Checking LiveSession Snapshots"
echo "========================================"
echo ""

# Check active public live sessions
QUERY1="SELECT 
    ls.\"Id\",
    ls.\"PublicSessionId\",
    ls.\"IsPublic\",
    ls.\"StartedAt\",
    ls.\"EndedAt\",
    u.\"UserName\",
    up.\"DisplayName\",
    a.\"Name\" as ActivityName,
    COUNT(snap.\"Id\") as SnapshotCount
FROM \"LiveSessions\" ls
INNER JOIN \"AspNetUsers\" u ON ls.\"UserId\" = u.\"Id\"
LEFT JOIN \"UserProfiles\" up ON u.\"Id\" = up.\"UserId\"
LEFT JOIN \"Activities\" a ON ls.\"ActivityId\" = a.\"Id\"
LEFT JOIN \"LiveSnapshots\" snap ON ls.\"Id\" = snap.\"LiveSessionId\"
WHERE ls.\"IsPublic\" = true AND ls.\"EndedAt\" IS NULL
GROUP BY ls.\"Id\", ls.\"PublicSessionId\", ls.\"IsPublic\", ls.\"StartedAt\", ls.\"EndedAt\", u.\"UserName\", up.\"DisplayName\", a.\"Name\"
ORDER BY ls.\"StartedAt\" DESC;"

echo "Active Public Live Sessions:"
echo ""

result1=$(psql -h "$SERVER" -U "$USERNAME" -d "$DATABASE" -t -A -F "|" -c "$QUERY1" 2>&1)

if [ $? -eq 0 ] && [ -n "$result1" ]; then
    echo "PublicSessionId        | User | Activity | IsPublic | Snapshots | Started"
    echo "-----------------------|------|----------|----------|-----------|--------"
    
    echo "$result1" | while IFS='|' read -r id publicId isPublic startedAt endedAt userName displayName activityName snapshots; do
        if [ -n "$publicId" ]; then
            publicIdShort="${publicId:0:20}"
            user="${displayName:-$userName}"
            activity="${activityName:-N/A}"
            started="${startedAt:0:16}"
            
            if [ "$snapshots" -gt 0 ]; then
                echo -e "\033[32m$publicIdShort | $user | $activity | $isPublic | $snapshots | $started\033[0m"
            else
                echo -e "\033[31m$publicIdShort | $user | $activity | $isPublic | $snapshots | $started\033[0m"
            fi
        fi
    done
else
    echo "No active public live sessions found."
fi

echo ""
echo "----------------------------------------"

# Check latest snapshots for each session
QUERY2="SELECT 
    ls.\"PublicSessionId\",
    snap.\"TimestampUtc\",
    snap.\"Latitude\",
    snap.\"Longitude\",
    snap.\"SpeedKmh\",
    snap.\"DistanceCompletedMeters\",
    snap.\"CreatedAt\"
FROM \"LiveSnapshots\" snap
INNER JOIN \"LiveSessions\" ls ON snap.\"LiveSessionId\" = ls.\"Id\"
WHERE ls.\"IsPublic\" = true AND ls.\"EndedAt\" IS NULL
ORDER BY snap.\"TimestampUtc\" DESC
LIMIT 10;"

echo ""
echo "Latest GPS Snapshots (Last 10):"
echo ""

result2=$(psql -h "$SERVER" -U "$USERNAME" -d "$DATABASE" -t -A -F "|" -c "$QUERY2" 2>&1)

if [ $? -eq 0 ] && [ -n "$result2" ]; then
    echo "SessionId       | Timestamp | Lat      | Lon     | Speed | Distance"
    echo "----------------|-----------|----------|---------|-------|----------"
    
    echo "$result2" | while IFS='|' read -r sessionId timestamp lat lon speed distance createdAt; do
        if [ -n "$sessionId" ]; then
            sessionIdShort="${sessionId:0:15}"
            timestampShort="${timestamp:11:8}"
            latRounded=$(printf "%.5f" "$lat" 2>/dev/null || echo "$lat")
            lonRounded=$(printf "%.5f" "$lon" 2>/dev/null || echo "$lon")
            speedRounded=$(printf "%.1f" "$speed" 2>/dev/null || echo "N/A")
            distanceRounded=$(printf "%.0f" "$distance" 2>/dev/null || echo "0")
            
            echo "$sessionIdShort | $timestampShort | $latRounded | $lonRounded | $speedRounded | $distanceRounded"
        fi
    done
else
    echo -e "\033[31mNo snapshots found.\033[0m"
fi

echo ""
echo "========================================"
echo ""

# Check if any sessions have no snapshots
QUERY3="SELECT COUNT(*)
FROM \"LiveSessions\" ls
WHERE ls.\"IsPublic\" = true 
  AND ls.\"EndedAt\" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM \"LiveSnapshots\" snap 
    WHERE snap.\"LiveSessionId\" = ls.\"Id\"
  );"

result3=$(psql -h "$SERVER" -U "$USERNAME" -d "$DATABASE" -t -A -c "$QUERY3" 2>&1)

if [ $? -eq 0 ] && [ -n "$result3" ] && [ "$result3" -gt 0 ]; then
    echo -e "\033[31m⚠️  WARNING: $result3 active public session(s) have NO snapshots!\033[0m"
    echo -e "\033[33m   This means GPS data is not being sent to LiveSession.\033[0m"
else
    echo -e "\033[32m✅ All active public sessions have GPS snapshots.\033[0m"
fi

echo ""

unset PGPASSWORD
