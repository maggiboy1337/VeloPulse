# ====================================================================
# PowerShell Script für frische Datenbank (Produktions-Setup)
# ====================================================================
# 
# Dieses Script löscht ALLE Daten aus der Datenbank und startet
# mit einer komplett leeren Datenbank (keine Demo-Daten).
#
# VERWENDUNG:
#   .\setup-fresh-database.ps1
#
# VORAUSSETZUNGEN:
#   - PostgreSQL muss laufen (docker-compose up -d postgres)
#   - Docker Desktop muss laufen
#
# WARNUNG: Dies löscht ALLE Daten inkl. aller Benutzer!
# ====================================================================

Write-Host "🧹 Setting up fresh database (Production Mode)..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will delete ALL data including users!" -ForegroundColor Yellow
Write-Host "The database will be completely empty after this." -ForegroundColor Yellow
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

# SQL Commands to delete ALL data
$sql = @"
-- Delete ALL data
DELETE FROM \"LiveSnapshots\";
DELETE FROM \"LiveSessions\";
DELETE FROM \"ActivityPoints\";
DELETE FROM \"Activities\";
DELETE FROM \"RoutePoints\";
DELETE FROM \"Routes\";
DELETE FROM \"SensorDevices\";
DELETE FROM \"UserProfiles\";
DELETE FROM \"AspNetUserTokens\";
DELETE FROM \"AspNetUserRoles\";
DELETE FROM \"AspNetUserLogins\";
DELETE FROM \"AspNetUserClaims\";
DELETE FROM \"AspNetUsers\";
DELETE FROM \"AspNetRoles\";

-- Verify empty database
SELECT 
    (SELECT COUNT(*) FROM \"AspNetUsers\") as users,
    (SELECT COUNT(*) FROM \"Routes\") as routes,
    (SELECT COUNT(*) FROM \"Activities\") as activities,
    (SELECT COUNT(*) FROM \"LiveSessions\") as live_sessions;
"@

Write-Host "Executing database cleanup..." -ForegroundColor Yellow
Write-Host ""

# Execute SQL using Docker
$result = docker exec -i $postgresContainer psql -U postgres -d livetracking -c $sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Database is now completely empty!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start the backend: dotnet run --project backend/LiveTracking.Api/LiveTracking.Api.csproj" -ForegroundColor White
    Write-Host "2. Register a new user via Swagger: http://localhost:5000/swagger" -ForegroundColor White
    Write-Host "3. Login to user web with your new account" -ForegroundColor White
    Write-Host "4. Import a GPX file and start your tour!" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 You're now running in PRODUCTION MODE (no demo data)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error cleaning up database:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manual cleanup:" -ForegroundColor Yellow
    Write-Host "docker exec -it $postgresContainer psql -U postgres -d livetracking" -ForegroundColor White
    exit 1
}
