<#
  Assembles the Windows x64 engine (engines/win32-x64/) from the official
  OpenConnect-GUI bundle (GnuTLS-based openconnect.exe + DLLs), plus Wintun x64
  (stable on x64) and the real vpnc-script-win.js.
  Run from repo root: powershell -ExecutionPolicy Bypass -File scripts/fetch-engine-win-x64.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Out  = Join-Path $Root 'engines\win32-x64'
$tmp  = Join-Path $env:TEMP 'ei-ocx64'
New-Item -ItemType Directory -Force -Path $tmp, $Out | Out-Null

$installer = Join-Path $tmp 'ocgui.exe'
Invoke-WebRequest 'https://www.infradead.org/openconnect-gui/download/openconnect-gui-1.6.2-win64.exe' -OutFile $installer

$sz = (Get-Command 7z -ErrorAction SilentlyContinue).Source
if (-not $sz) { $sz = 'C:\Program Files\7-Zip\7z.exe' }
& $sz x -y -o"$tmp\x" $installer | Out-Null

$ocDir = (Get-ChildItem "$tmp\x" -Recurse -Filter openconnect.exe | Select-Object -First 1).DirectoryName
if (-not $ocDir) { throw 'openconnect.exe not found in OpenConnect-GUI bundle' }
Copy-Item "$ocDir\openconnect.exe" $Out -Force
Copy-Item "$ocDir\*.dll" $Out -Force -ErrorAction SilentlyContinue

# Wintun x64 (works on x64; crashes only on arm64 builds)
Invoke-WebRequest 'https://www.wintun.net/builds/wintun-0.14.1.zip' -OutFile "$tmp\wintun.zip"
Expand-Archive "$tmp\wintun.zip" "$tmp\wt" -Force
Copy-Item "$tmp\wt\wintun\bin\amd64\wintun.dll" $Out -Force

Invoke-WebRequest 'https://gitlab.com/openconnect/vpnc-scripts/-/raw/master/vpnc-script-win.js' -OutFile (Join-Path $Out 'vpnc-script-win.js')
Write-Host "Engine -> $Out"
Get-ChildItem $Out | Select-Object Name, Length
