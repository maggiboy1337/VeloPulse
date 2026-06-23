Param(
    [string]$SourcePath = "android\\app\\build\\outputs\\apk\\release\\app-release.apk",
    [string]$DestDir = "backend\\LiveTracking.Api\\wwwroot\\downloads",
    [switch]$Versioned
)

# Ensure paths are rooted
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$sourceFull = Resolve-Path -Path $SourcePath -ErrorAction SilentlyContinue
if (-not $sourceFull) {
    Write-Host "❌ Source APK not found at $SourcePath" -ForegroundColor Red
    exit 1
}

$destDirFull = Join-Path -Path $root -ChildPath $DestDir
if (-not (Test-Path $destDirFull)) {
    Write-Host "📁 Creating destination directory: $destDirFull"
    New-Item -ItemType Directory -Path $destDirFull -Force | Out-Null
}

$destFile = Join-Path -Path $destDirFull -ChildPath "velopulse-latest.apk"
Copy-Item -Path $sourceFull -Destination $destFile -Force
Write-Host "✅ Copied APK to $destFile"

if ($Versioned) {
    $timestamp = Get-Date -Format "yyyyMMddHHmm"
    $versioned = Join-Path -Path $destDirFull -ChildPath "velopulse-$timestamp.apk"
    Copy-Item -Path $sourceFull -Destination $versioned -Force
    Write-Host "✅ Created versioned APK: $versioned"
}

Write-Host "Done."