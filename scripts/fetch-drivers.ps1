<#
  Stages the VPN drivers into drivers/ so the installer can set them up:
   - Wintun (WireGuard, signed) — arm64 + amd64 DLLs
   - OpenVPN (tap-windows6 + tapctl, signed) — arm64 + amd64 MSIs (TAP is used on
     Win ARM64 where Wintun crashes openconnect)
  Run from repo root: powershell -ExecutionPolicy Bypass -File scripts/fetch-drivers.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Drv  = Join-Path $Root 'drivers'
$tmp  = Join-Path $env:TEMP 'ei-drv'
New-Item -ItemType Directory -Force -Path $Drv, "$Drv\wintun\arm64", "$Drv\wintun\amd64", "$Drv\openvpn", $tmp | Out-Null

Invoke-WebRequest 'https://www.wintun.net/builds/wintun-0.14.1.zip' -OutFile "$tmp\wintun.zip"
Expand-Archive "$tmp\wintun.zip" "$tmp\wt" -Force
Copy-Item "$tmp\wt\wintun\bin\arm64\wintun.dll" "$Drv\wintun\arm64\" -Force
Copy-Item "$tmp\wt\wintun\bin\amd64\wintun.dll" "$Drv\wintun\amd64\" -Force

Invoke-WebRequest 'https://swupdate.openvpn.net/community/releases/OpenVPN-2.7.8-I001-arm64.msi' -OutFile "$Drv\openvpn\OpenVPN-arm64.msi"
Invoke-WebRequest 'https://swupdate.openvpn.net/community/releases/OpenVPN-2.7.8-I001-amd64.msi' -OutFile "$Drv\openvpn\OpenVPN-amd64.msi"

Write-Host "Drivers -> $Drv"
Get-ChildItem $Drv -Recurse -File | Select-Object FullName, Length
