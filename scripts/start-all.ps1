Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "     Launching UpdatePilot Platform Suite         " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Prerequisite Checks
Write-Host "`n[1/5] Verifying system prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = & node -v
    Write-Host "✔ Node.js runtime detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✖ Error: Node.js is required but was not found in PATH." -ForegroundColor Red
    exit 1
}

try {
    $wingetVersion = & winget --version
    Write-Host "✔ Windows Package Manager detected: $wingetVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: winget CLI not detected. Agent will run in Registry-only discovery mode." -ForegroundColor Yellow
}

# 2. Environment and Build Verification
Write-Host "`n[2/5] Checking configuration and compilation artifacts..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "..\apps\backend"
$agentPath = Join-Path $PSScriptRoot "..\apps\agent"
$webPath = Join-Path $PSScriptRoot "..\apps\web"

if (-not (Test-Path "$backendPath\.env")) {
    Copy-Item "$backendPath\.env.example" "$backendPath\.env"
    Write-Host "✔ Created apps/backend/.env from template." -ForegroundColor Green
}

if (-not (Test-Path "$backendPath\dist\index.js")) {
    Write-Host "Compiling backend TypeScript..." -ForegroundColor Cyan
    & npm.cmd run build --prefix "$backendPath"
}

if (-not (Test-Path "$agentPath\dist\index.js")) {
    Write-Host "Compiling Windows Agent TypeScript..." -ForegroundColor Cyan
    & npm.cmd run build --prefix "$agentPath"
}

# 3. Database Sync Verification
Write-Host "`n[3/5] Verifying database schema and connectivity..." -ForegroundColor Yellow
try {
    Push-Location "$backendPath"
    & npx.cmd prisma db push --skip-generate | Out-Null
    Pop-Location
    Write-Host "✔ Database schema is in sync (SQLite / PostgreSQL)." -ForegroundColor Green
} catch {
    Pop-Location
    Write-Host "⚠ Database check warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. Service Launch
Write-Host "`n[4/5] Starting application services..." -ForegroundColor Yellow
Write-Host "Starting Backend API Server on http://localhost:4000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; node dist/index.js"
Start-Sleep -Seconds 2

Write-Host "Starting Windows Local Agent Daemon..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$agentPath'; node dist/index.js"
Start-Sleep -Seconds 2

Write-Host "Starting Web Dashboard on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webPath'; npm.cmd run start"

# 5. Service Summary & Health URLs
Write-Host "`n[5/5] All UpdatePilot services launched successfully!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Web Dashboard:       http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Backend API:         http://localhost:4000" -ForegroundColor Yellow
Write-Host "  Swagger UI Docs:     http://localhost:4000/api/docs" -ForegroundColor Yellow
Write-Host "  Healthcheck:         http://localhost:4000/api/v1/health" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
