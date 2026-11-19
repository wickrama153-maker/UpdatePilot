@echo off
title UpdatePilot Services Launcher
echo =======================================================
echo    Starting UpdatePilot Windows Management Services   
echo =======================================================
echo.

cd /d "%~dp0apps\backend"
start "UpdatePilot Backend & Web Server" cmd /k "node dist/index.js"

timeout /t 2 /nobreak >nul

cd /d "%~dp0apps\agent"
start "UpdatePilot Local Agent" cmd /k "node dist/index.js"

echo.
echo Services started successfully!
echo Open your browser at:
echo   - http://localhost:4000
echo   - http://localhost:3000 (auto-redirected)
echo.
echo You can also run UpdatePilot Desktop application directly.
echo =======================================================
timeout /t 5
