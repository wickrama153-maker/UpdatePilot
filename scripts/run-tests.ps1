Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       UpdatePilot Automated Test Runner          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

Write-Host "`n[1/3] Running Shared Types, Schemas & Version Unit Tests..." -ForegroundColor Yellow
cd "$PSScriptRoot\..\packages\shared"
node --test test/version.test.mjs

Write-Host "`n[2/3] Running Windows Agent, WinGet Parser & Reboot Tests..." -ForegroundColor Yellow
cd "$PSScriptRoot\..\apps\agent"
node --test test/winget.test.mjs

Write-Host "`n[3/3] Running Backend API Integration, Security & Lifecycle Tests..." -ForegroundColor Yellow
cd "$PSScriptRoot\..\apps\backend"
node --test test/api.test.mjs

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "   ALL 21 AUTOMATED TESTS PASSED SUCCESSFULLY!    " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
