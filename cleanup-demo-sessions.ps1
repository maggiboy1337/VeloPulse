# ====================================================================
# PowerShell Script zum Löschen der Demo-Sessions aus der Datenbank
# ====================================================================
# 
# Dieses Script entfernt alle Demo-Sessions, die vom DemoLiveSessionsService
# erstellt wurden, aus der Datenbank.
#
# VERWENDUNG:
#   .\cleanup-demo-sessions.ps1
#
# VORAUSSETZUNGEN:
#   - PostgreSQL muss laufen (docker-compose up -d postgres)
#   - Docker Desktop muss laufen
#
# ====================================================================

Write-Host "🧹 Cleaning up demo sessions from database..." -ForegroundColor Cyan
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

Write-Host "✅ Found PostgreSQL container: $postgresContainer" -ForegroundColor Green
Write-Host ""

# SQL Commands
$sql = @"
-- Delete demo snapshots
DELETE FROM \"LiveSnapshots\" WHERE \"PublicSessionId\" LIKE 'demo-session-%';

-- Delete demo live sessions
DELETE FROM \"LiveSessions\" WHERE \"PublicSessionId\" LIKE 'demo-session-%';

-- Delete demo activities
DELETE FROM \"Activities\" WHERE \"Name\" LIKE 'Demo Tour%';

-- Delete demo routes
DELETE FROM \"Routes\" WHERE \"Name\" IN ('München → Starnberger See', 'Alpenrundfahrt', 'Donauradweg');

-- Show remaining sessions
SELECT COUNT(*) as remaining_sessions FROM \"LiveSessions\" WHERE \"EndedAt\" IS NULL;
"@

Write-Host "Executing cleanup SQL..." -ForegroundColor Yellow
Write-Host ""

# Execute SQL using Docker
$result = docker exec -i $postgresContainer psql -U postgres -d livetracking -c $sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Demo sessions successfully removed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart the backend: dotnet run --project backend/LiveTracking.Api/LiveTracking.Api.csproj" -ForegroundColor White
    Write-Host "2. Reload public web: http://localhost:5173 (F5)" -ForegroundColor White
    Write-Host "3. Start your own tour from user web!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Error cleaning up database:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manual cleanup:" -ForegroundColor Yellow
    Write-Host "docker exec -it $postgresContainer psql -U postgres -d livetracking" -ForegroundColor White
    exit 1
}
