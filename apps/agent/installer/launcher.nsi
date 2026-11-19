; UpdatePilot Agent Silent GUI Launcher
!include "FileFunc.nsh"

Name "UpdatePilot Agent"
OutFile "UpdatePilotAgent.exe"
Caption "UpdatePilot Agent"
Icon "..\..\desktop\assets\icon.ico"
SilentInstall silent
RequestExecutionLevel user

Section
  ${GetParameters} $R0
  ; Launch node.exe with agent.js silently without popping console window
  Exec '"$EXEDIR\node.exe" "$EXEDIR\agent.js" $R0'
SectionEnd
