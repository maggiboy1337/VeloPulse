# ====================================================================
# PowerShell Script für Ersteinrichtung mit Test-Benutzer
# ====================================================================
# 
# Dieses Script:
# 1. Löscht alte Browser-Daten (localStorage)
# 2. Registriert einen Test-Benutzer
# 3. Öffnet User Web für Login
#
# VERWENDUNG:
#   .\setup-first-user.ps1
#
# VORAUSSETZUNGEN:
#   - Backend muss laufen (http://localhost:5000)
#   - Datenbank muss leer sein (setup-fresh-database.ps1)
#
# ====================================================================

Write-Host "🚀 Setting up first user..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "http://localhost:5000"
$USER_EMAIL = "test@velopulse.app"
$USER_PASSWORD = "Test123!"
$USER_DISPLAY_NAME = "Test User"

# Check if backend is running
Write-Host "1️⃣ Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/swagger/index.html" -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the backend first:" -ForegroundColor Yellow
    Write-Host "dotnet run --project backend\LiveTracking.Api\LiveTracking.Api.csproj" -ForegroundColor White
    exit 1
}

Write-Host ""

# Register new user
Write-Host "2️⃣ Registering new user..." -ForegroundColor Yellow
Write-Host "   Email: $USER_EMAIL" -ForegroundColor Gray
Write-Host "   Display Name: $USER_DISPLAY_NAME" -ForegroundColor Gray

$registerBody = @{
    email = $USER_EMAIL
    password = $USER_PASSWORD
    displayName = $USER_DISPLAY_NAME
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "   ✅ User registered successfully!" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.userId)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "   ⚠️  User might already exist, trying to login..." -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Login
Write-Host "3️⃣ Logging in..." -ForegroundColor Yellow

$loginBody = @{
    email = $USER_EMAIL
    password = $USER_PASSWORD
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "   ✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($loginResponse.accessToken.Substring(0, 20))..." -ForegroundColor Gray
    
    $accessToken = $loginResponse.accessToken
    $displayName = $loginResponse.displayName
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create HTML file to set localStorage and redirect
Write-Host "4️⃣ Setting up browser..." -ForegroundColor Yellow

$autoLoginHtml = @"
<!DOCTYPE html>
<html>
<head>
    <title>VeloPulse - Auto Login</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            backdrop-filter: blur(10px);
        }
        h1 { margin: 0 0 1rem 0; }
        p { margin: 0.5rem 0; }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 VeloPulse</h1>
        <div class="spinner"></div>
        <p>Automatischer Login läuft...</p>
        <p id="status"></p>
    </div>
    <script>
        const userData = {
            userId: '$($loginResponse.userId)',
            email: '$USER_EMAIL',
            displayName: '$displayName',
            accessToken: '$accessToken',
            refreshToken: '$($loginResponse.refreshToken)',
            expiresAt: '$($loginResponse.expiresAt)'
        };

        // Clear old data
        localStorage.clear();
        
        // Set new data
        localStorage.setItem('authToken', userData.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        document.getElementById('status').textContent = 'Login erfolgreich! Weiterleitung...';
        
        // Wait a moment, then redirect
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    </script>
</body>
</html>
"@

$autoLoginPath = "apps\user_web\auto-login.html"
$autoLoginHtml | Out-File -FilePath $autoLoginPath -Encoding UTF8

Write-Host "   ✅ Browser setup complete" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Test Account:" -ForegroundColor Yellow
Write-Host "  📧 Email:    $USER_EMAIL" -ForegroundColor White
Write-Host "  🔑 Password: $USER_PASSWORD" -ForegroundColor White
Write-Host "  👤 Name:     $USER_DISPLAY_NAME" -ForegroundColor White
Write-Host ""
Write-Host "Opening User Web App..." -ForegroundColor Yellow

# Open auto-login page in default browser
Start-Process (Resolve-Path $autoLoginPath).Path

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Browser should open automatically" -ForegroundColor White
Write-Host "2. You will be logged in automatically" -ForegroundColor White
Write-Host "3. Import a GPX file (test-route-muenchen.gpx)" -ForegroundColor White
Write-Host "4. Start your tour!" -ForegroundColor White
Write-Host "5. Open http://localhost:5173 to see yourself on the map" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: You can use this account to login manually:" -ForegroundColor Gray
Write-Host "   $USER_EMAIL / $USER_PASSWORD" -ForegroundColor Gray
