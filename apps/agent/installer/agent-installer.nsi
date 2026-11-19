; ==============================================================================
; UpdatePilot Windows Local Agent Standalone Installer
; Lightweight standalone installer independent of Electron
; Installs to %LOCALAPPDATA%\UpdatePilotAgent
; Registers HKCU\Software\Microsoft\Windows\CurrentVersion\Run
; Supports Silent Mode (/S) and CLI Pairing (/PAIR=... /SERVER=...)
; ==============================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

Name "UpdatePilot Windows Local Agent"
Caption "UpdatePilot Windows Local Agent Setup"
OutFile "..\..\..\dist\installer\UpdatePilot-Agent-Setup-1.0.0.exe"
InstallDir "$LOCALAPPDATA\UpdatePilotAgent"
InstallDirRegKey HKCU "Software\UpdatePilotAgent" "InstallPath"
RequestExecutionLevel user
SetCompressor /SOLID lzma

!define MUI_ICON "..\..\desktop\assets\icon.ico"
!define MUI_UNICON "..\..\desktop\assets\icon.ico"
!define MUI_ABORTWARNING

; Welcome page
!insertmacro MUI_PAGE_WELCOME
; Directory page
!insertmacro MUI_PAGE_DIRECTORY
; Instfiles page
!insertmacro MUI_PAGE_INSTFILES
; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\UpdatePilotAgent.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Start UpdatePilot Agent in background"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  ; Stop any existing running agent before overwriting
  nsExec::Exec 'taskkill /im UpdatePilotAgent.exe /f'
  
  SetOutPath "$INSTDIR"
  File "..\bundled\agent.js"
  File "UpdatePilotAgent.exe"
  File "updatepilot-agent.cmd"
  File "..\..\desktop\assets\icon.ico"
  File "C:\Program Files\nodejs\node.exe"

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Startup Registry Key
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "UpdatePilotAgent" '"$INSTDIR\UpdatePilotAgent.exe"'

  ; App Registry Key
  WriteRegStr HKCU "Software\UpdatePilotAgent" "InstallPath" "$INSTDIR"

  ; Add/Remove Programs entry
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent" "DisplayName" "UpdatePilot Windows Local Agent"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent" "Publisher" "UpdatePilot Team"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent" "NoRepair" 1

  ; Start menu shortcuts
  CreateDirectory "$SMPROGRAMS\UpdatePilot"
  CreateShortcut "$SMPROGRAMS\UpdatePilot\UpdatePilot Agent (Background).lnk" "$INSTDIR\UpdatePilotAgent.exe" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\UpdatePilot\UpdatePilot Agent CLI.lnk" "$INSTDIR\updatepilot-agent.cmd" "--status" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\UpdatePilot\Uninstall UpdatePilot Agent.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe"

  ; Check command line arguments for silent pairing
  ${GetParameters} $R0
  ${GetOptions} $R0 "/PAIR=" $R1
  ${GetOptions} $R0 "/SERVER=" $R2

  ${If} $R1 != ""
    ${If} $R2 != ""
      nsExec::Exec '"$INSTDIR\node.exe" "$INSTDIR\agent.js" --server "$R2" --pair "$R1"'
    ${Else}
      nsExec::Exec '"$INSTDIR\node.exe" "$INSTDIR\agent.js" --pair "$R1"'
    ${EndIf}
  ${EndIf}
SectionEnd

Section "Uninstall"
  ; Stop any running agent
  nsExec::Exec 'taskkill /im UpdatePilotAgent.exe /f'

  ; Remove Startup Key
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "UpdatePilotAgent"

  ; Remove App & Uninstall Keys
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UpdatePilotAgent"
  DeleteRegKey HKCU "Software\UpdatePilotAgent"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\UpdatePilot\UpdatePilot Agent (Background).lnk"
  Delete "$SMPROGRAMS\UpdatePilot\UpdatePilot Agent CLI.lnk"
  Delete "$SMPROGRAMS\UpdatePilot\Uninstall UpdatePilot Agent.lnk"
  RMDir "$SMPROGRAMS\UpdatePilot"

  ; Remove installed files
  Delete "$INSTDIR\UpdatePilotAgent.exe"
  Delete "$INSTDIR\updatepilot-agent.cmd"
  Delete "$INSTDIR\agent.js"
  Delete "$INSTDIR\node.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\agent-config.json"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
