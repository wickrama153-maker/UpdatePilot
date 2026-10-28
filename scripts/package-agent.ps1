Write-Host "Packaging UpdatePilot Windows Local Agent..." -ForegroundColor Cyan

$agentDir = Join-Path $PSScriptRoot "..\apps\agent"
$distDir = Join-Path $PSScriptRoot "..\dist\UpdatePilot-Agent-Windows-x64"

if (Test-Path $distDir) {
    Remove-Item -Recurse -Force $distDir
}
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

# Ensure agent is built
Write-Host "Compiling agent before packaging..." -ForegroundColor Cyan
& npm.cmd run build --prefix "$agentDir"

# Copy compiled files and dependencies
Copy-Item -Path "$agentDir\dist" -Destination "$distDir\dist" -Recurse
Copy-Item -Path "$agentDir\package.json" -Destination "$distDir\"

if (Test-Path "$agentDir\node_modules") {
    Copy-Item -Path "$agentDir\node_modules" -Destination "$distDir\node_modules" -Recurse
} else {
    $rootModules = Join-Path $PSScriptRoot "..\node_modules"
    if (Test-Path $rootModules) {
        Copy-Item -Path $rootModules -Destination "$distDir\node_modules" -Recurse
    }
}

# Create runnable batch file with runtime check for Windows users
$batContent = @"
@echo off
setlocal
echo ==================================================
echo        UpdatePilot Windows Local Agent
echo ==================================================

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js runtime not found in PATH!
    echo Please install Node.js v18 or newer to run this agent.
    pause
    exit /b 1
)

cd /d "%~dp0"
node dist/index.js %*
"@

Set-Content -Path "$distDir\run-agent.bat" -Value $batContent -Encoding ASCII

# Create README.txt in the distribution folder
$readmeContent = @"
UpdatePilot Windows Local Agent (Portable Distribution)
======================================================

Prerequisites:
- Windows 10 (1809+) or Windows 11 (64-bit)
- Windows Package Manager (winget.exe)
- Node.js v18+ runtime

How to Use:
1. Pair with your UpdatePilot dashboard:
   run-agent.bat --pair <PAIRING_TOKEN>

2. Run an immediate local discovery scan:
   run-agent.bat --scan

3. Start background monitoring daemon:
   run-agent.bat

4. Check local device status:
   run-agent.bat --status
"@

Set-Content -Path "$distDir\README.txt" -Value $readmeContent -Encoding ASCII

Write-Host "✔ Packaged Windows Agent standalone folder created at: $distDir" -ForegroundColor Green
Write-Host "✔ Includes run-agent.bat and README.txt instructions." -ForegroundColor Yellow
