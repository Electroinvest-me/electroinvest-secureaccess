# Runs post-install (elevated) from the NSIS installer. Sets up the tun driver.
#  - Win ARM64: install OpenVPN tap-windows6 (Wintun crashes openconnect here) and
#    create a TAP adapter.
#  - Win x64: Wintun installs its own kernel driver on first use (app runs elevated),
#    so no pre-install is needed.
$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') {
  $msi = Join-Path $here 'openvpn\OpenVPN-arm64.msi'
  if (Test-Path $msi) {
    Start-Process msiexec.exe -ArgumentList '/i', "`"$msi`"", '/qn', 'ADDLOCAL=ALL' -Wait
    $tapctl = 'C:\Program Files\OpenVPN\bin\tapctl.exe'
    if (Test-Path $tapctl) {
      $have = & $tapctl list 2>$null | Select-String 'SecureAccess TAP'
      if (-not $have) { & $tapctl create --name 'SecureAccess TAP' 2>$null }
    }
  }
}
exit 0
