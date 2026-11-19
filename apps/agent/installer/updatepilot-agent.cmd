@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%node.exe" (
    "%SCRIPT_DIR%node.exe" "%SCRIPT_DIR%agent.js" %*
) else (
    node "%SCRIPT_DIR%..\bundled\agent.js" %*
)
endlocal
