; NSIS include — runs the bundled VPN driver setup after install (elevated).
; perMachine install already runs elevated, so the driver setup gets admin.
!macro customInstall
  DetailPrint "Postavljam VPN drajvere (Wintun / TAP-Windows6)…"
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\drivers\install-win.ps1"'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\drivers\uninstall-win.ps1"'
!macroend
