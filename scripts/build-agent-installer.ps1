# Build standalone Windows x64 NSIS Installer for UpdatePilot Local Agent
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot\..").ProviderPath
$agentDir = "$repoRoot\apps\agent"
$installerDir = "$agentDir\installer"
$makensis = "C:\Users\Apex\AppData\Local\electron-builder\Cache\nsis\nsis-3.0.4.1\makensis.exe"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Building UpdatePilot Standalone Agent Installer  " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Compile Agent TypeScript
Write-Host "`n[1/5] Compiling Agent TypeScript..." -ForegroundColor Yellow
Push-Location $agentDir
& npm.cmd run build
Pop-Location

# 2. Bundle Agent into a single self-contained JS file
Write-Host "`n[2/5] Bundling Agent with esbuild..." -ForegroundColor Yellow
$bundledDir = "$agentDir\bundled"
if (-not (Test-Path $bundledDir)) {
    New-Item -ItemType Directory -Path $bundledDir -Force | Out-Null
}
& npx.cmd esbuild "$agentDir\src\index.ts" --bundle --platform=node --target=node18 --outfile="$bundledDir\agent.js"

# 3. Compile Launcher Executable
Write-Host "`n[3/5] Compiling UpdatePilotAgent.exe launcher via NSIS..." -ForegroundColor Yellow
Push-Location $installerDir
& $makensis "launcher.nsi"
Pop-Location

# 4. Prepare Output Directories
$distInstallerDir = "$repoRoot\dist\installer"
$webDownloadsDir = "$repoRoot\apps\web\public\downloads"
if (-not (Test-Path $distInstallerDir)) {
    New-Item -ItemType Directory -Path $distInstallerDir -Force | Out-Null
}
if (-not (Test-Path $webDownloadsDir)) {
    New-Item -ItemType Directory -Path $webDownloadsDir -Force | Out-Null
}

# 5. Compile Full Installer
Write-Host "`n[4/5] Compiling UpdatePilot-Agent-Setup-1.0.0.exe via NSIS..." -ForegroundColor Yellow
Push-Location $installerDir
& $makensis "agent-installer.nsi"
Pop-Location

# 6. Copy to Web Public Downloads
Write-Host "`n[5/5] Deploying installer to web static downloads..." -ForegroundColor Yellow
$setupExe = "$distInstallerDir\UpdatePilot-Agent-Setup-1.0.0.exe"
Copy-Item $setupExe "$webDownloadsDir\UpdatePilot-Agent-Setup-1.0.0.exe" -Force

$fileSizeMB = [math]::Round(((Get-Item $setupExe).Length / 1MB), 2)
Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " Installer Built Successfully: $setupExe ($fileSizeMB MB)" -ForegroundColor Green
Write-Host " Web Download Link: /downloads/UpdatePilot-Agent-Setup-1.0.0.exe" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
