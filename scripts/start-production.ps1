# ==============================================================================
# UpdatePilot Production Server Launcher
# Unified Express Backend + Next.js Static Dashboard + Downloads + Multi-User Auth
# ==============================================================================
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot\..").ProviderPath

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting UpdatePilot Production Cloud Platform   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Ensure static web build exists
if (-not (Test-Path "$repoRoot\apps\web\out\index.html")) {
    Write-Host " Building web static export..." -ForegroundColor Yellow
    Push-Location "$repoRoot\apps\web"
    & npm.cmd run build
    Pop-Location
}

# 2. Ensure standalone agent installer exists
if (-not (Test-Path "$repoRoot\dist\installer\UpdatePilot-Agent-Setup-1.0.0.exe")) {
    Write-Host " Building Windows Local Agent installer..." -ForegroundColor Yellow
    & powershell.exe -ExecutionPolicy Bypass -File "$repoRoot\scripts\build-agent-installer.ps1"
}

# 3. Ensure agent setup is deployed to web downloads directory
$downloadsDir = "$repoRoot\apps\web\out\downloads"
if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir -Force | Out-Null
}
Copy-Item "$repoRoot\dist\installer\UpdatePilot-Agent-Setup-1.0.0.exe" "$downloadsDir\UpdatePilot-Agent-Setup-1.0.0.exe" -Force

$env:PORT = if ($env:PORT) { $env:PORT } else { "4000" }
$env:STATIC_WEB_DIR = "$repoRoot\apps\web\out"
$env:NODE_ENV = "production"

Write-Host "`n[UpdatePilot Ready]" -ForegroundColor Green
Write-Host " Web Dashboard:   http://localhost:$env:PORT" -ForegroundColor Green
Write-Host " API & Docs:      http://localhost:$env:PORT/api/docs" -ForegroundColor Green
Write-Host " Agent Download:  http://localhost:$env:PORT/downloads/UpdatePilot-Agent-Setup-1.0.0.exe" -ForegroundColor Green
Write-Host " Multi-User Auth: ACTIVE (JWT Scoped)" -ForegroundColor Green
Write-Host " Hardware GUID:   ACTIVE (No Hostname Collisions)`n" -ForegroundColor Green

Push-Location "$repoRoot\apps\backend"
& node.exe dist/index.js
Pop-Location
