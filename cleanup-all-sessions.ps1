# ====================================================================
# PowerShell Script zum Löschen ALLER Live-Sessions aus der Datenbank
# ====================================================================
# 
# Dieses Script entfernt ALLE Live-Sessions, Activities, Routes und Snapshots.
# Nur die Benutzer-Accounts bleiben erhalten.
#
# VERWENDUNG:
#   .\cleanup-all-sessions.ps1
#
# VORAUSSETZUNGEN:
#   - PostgreSQL muss laufen (docker-compose up -d postgres)
#   - Docker Desktop muss laufen
#
# WARNUNG: Dies löscht ALLE Daten außer Benutzern!
# ====================================================================

Write-Host "🧹 Cleaning up ALL sessions from database..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will delete ALL routes, activities, and sessions!" -ForegroundColor Yellow
Write-Host "Only user accounts will remain." -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Are you sure? Type 'yes' to continue"
if ($confirmation -ne 'yes') {
    Write-Host "❌ Cancelled." -ForegroundColor Red
    exit 0
}

Write-Host ""

# Check if Docker is running
$dockerRunning = docker ps 2>$null
if (-not $?) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Find PostgreSQL container
$postgresContainer = docker ps --filter "name=postgres" --format "{{.Names}}" | Select-Object -First 1

if (-not $postgresContainer) {
    Write-Host "❌ PostgreSQL container not found. Please start it with: docker-compose up -d postgres" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found PostgreSQL container: $postgresContainer" -ForegroundColor Green
Write-Host ""

# SQL Commands
$sql = @"
-- Delete ALL snapshots
DELETE FROM \"LiveSnapshots\";

-- Delete ALL live sessions
DELETE FROM \"LiveSessions\";

-- Delete ALL activity points
DELETE FROM \"ActivityPoints\";

-- Delete ALL activities
DELETE FROM \"Activities\";

-- Delete ALL route points
DELETE FROM \"RoutePoints\";

-- Delete ALL routes
DELETE FROM \"Routes\";

-- Show results
SELECT 
    (SELECT COUNT(*) FROM \"LiveSessions\") as live_sessions,
    (SELECT COUNT(*) FROM \"Activities\") as activities,
    (SELECT COUNT(*) FROM \"Routes\") as routes,
    (SELECT COUNT(*) FROM \"Users\") as users;
"@

Write-Host "Executing cleanup SQL..." -ForegroundColor Yellow
Write-Host ""

# Execute SQL using Docker
$result = docker exec -i $postgresContainer psql -U postgres -d livetracking -c $sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Database cleaned successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart the backend: dotnet run --project backend/LiveTracking.Api/LiveTracking.Api.csproj" -ForegroundColor White
    Write-Host "2. Reload public web: http://localhost:5173 (F5)" -ForegroundColor White
    Write-Host "3. Import a GPX file in user web" -ForegroundColor White
    Write-Host "4. Start your tour!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Error cleaning up database:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manual cleanup:" -ForegroundColor Yellow
    Write-Host "docker exec -it $postgresContainer psql -U postgres -d livetracking" -ForegroundColor White
    exit 1
}
