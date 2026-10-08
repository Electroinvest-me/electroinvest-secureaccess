# Runs on uninstall (elevated). Removes the TAP adapter we created.
$ErrorActionPreference = 'Continue'
$tapctl = 'C:\Program Files\OpenVPN\bin\tapctl.exe'
if (Test-Path $tapctl) { & $tapctl delete 'SecureAccess TAP' 2>$null }
exit 0
