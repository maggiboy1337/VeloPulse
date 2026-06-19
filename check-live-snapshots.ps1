# Check LiveSession Snapshots in Database
# This script verifies if GPS snapshots are stored for public live sessions

$serverName = "localhost"
$databaseName = "livetracking"
$username = "livetracking_user"
$password = "SecurePassword123!"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking LiveSession Snapshots" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check active public live sessions
$query1 = @"
SELECT 
    ls."Id",
    ls."PublicSessionId",
    ls."IsPublic",
    ls."StartedAt",
    ls."EndedAt",
    u."UserName",
    up."DisplayName",
    a."Name" as ActivityName,
    COUNT(snap."Id") as SnapshotCount
FROM "LiveSessions" ls
INNER JOIN "AspNetUsers" u ON ls."UserId" = u."Id"
LEFT JOIN "UserProfiles" up ON u."Id" = up."UserId"
LEFT JOIN "Activities" a ON ls."ActivityId" = a."Id"
LEFT JOIN "LiveSnapshots" snap ON ls."Id" = snap."LiveSessionId"
WHERE ls."IsPublic" = true AND ls."EndedAt" IS NULL
GROUP BY ls."Id", ls."PublicSessionId", ls."IsPublic", ls."StartedAt", ls."EndedAt", u."UserName", up."DisplayName", a."Name"
ORDER BY ls."StartedAt" DESC;
"@

Write-Host "Active Public Live Sessions:" -ForegroundColor Yellow
Write-Host ""

$env:PGPASSWORD = $password
$result1 = psql -h $serverName -U $username -d $databaseName -t -A -F "|" -c $query1

if ($result1) {
    Write-Host "PublicSessionId | User | Activity | IsPublic | Snapshots | Started" -ForegroundColor Green
    Write-Host "----------------|------|----------|----------|-----------|--------" -ForegroundColor Green
    
    foreach ($line in $result1) {
        $parts = $line -split '\|'
        if ($parts.Length -ge 9) {
            $publicId = $parts[1].Substring(0, [Math]::Min(20, $parts[1].Length))
            $user = if ($parts[6]) { $parts[6] } else { $parts[5] }
            $activity = if ($parts[7]) { $parts[7] } else { "N/A" }
            $isPublic = $parts[2]
            $snapshots = $parts[8]
            $started = $parts[3].Substring(0, 16)
            
            $color = if ([int]$snapshots -gt 0) { "Green" } else { "Red" }
            Write-Host "$publicId | $user | $activity | $isPublic | $snapshots | $started" -ForegroundColor $color
        }
    }
} else {
    Write-Host "No active public live sessions found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Check latest snapshots for each session
$query2 = @"
SELECT 
    ls."PublicSessionId",
    snap."TimestampUtc",
    snap."Latitude",
    snap."Longitude",
    snap."SpeedKmh",
    snap."DistanceCompletedMeters",
    snap."CreatedAt"
FROM "LiveSnapshots" snap
INNER JOIN "LiveSessions" ls ON snap."LiveSessionId" = ls."Id"
WHERE ls."IsPublic" = true AND ls."EndedAt" IS NULL
ORDER BY snap."TimestampUtc" DESC
LIMIT 10;
"@

Write-Host ""
Write-Host "Latest GPS Snapshots (Last 10):" -ForegroundColor Yellow
Write-Host ""

$result2 = psql -h $serverName -U $username -d $databaseName -t -A -F "|" -c $query2

if ($result2) {
    Write-Host "SessionId | Timestamp | Lat | Lon | Speed | Distance" -ForegroundColor Green
    Write-Host "----------|-----------|-----|-----|-------|----------" -ForegroundColor Green
    
    foreach ($line in $result2) {
        $parts = $line -split '\|'
        if ($parts.Length -ge 6) {
            $sessionId = $parts[0].Substring(0, [Math]::Min(15, $parts[0].Length))
            $timestamp = $parts[1].Substring(11, 8)  # Extract time only
            $lat = [math]::Round([double]$parts[2], 5)
            $lon = [math]::Round([double]$parts[3], 5)
            $speed = if ($parts[4]) { [math]::Round([double]$parts[4], 1) } else { "N/A" }
            $distance = if ($parts[5]) { [math]::Round([double]$parts[5], 0) } else { "0" }
            
            Write-Host "$sessionId | $timestamp | $lat | $lon | $speed | $distance" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "No snapshots found." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if any sessions have no snapshots
$query3 = @"
SELECT COUNT(*)
FROM "LiveSessions" ls
WHERE ls."IsPublic" = true 
  AND ls."EndedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "LiveSnapshots" snap 
    WHERE snap."LiveSessionId" = ls."Id"
  );
"@

$result3 = psql -h $serverName -U $username -d $databaseName -t -A -c $query3

if ($result3 -and [int]$result3 -gt 0) {
    Write-Host "⚠️  WARNING: $result3 active public session(s) have NO snapshots!" -ForegroundColor Red
    Write-Host "   This means GPS data is not being sent to LiveSession." -ForegroundColor Yellow
} else {
    Write-Host "✅ All active public sessions have GPS snapshots." -ForegroundColor Green
}

Write-Host ""
