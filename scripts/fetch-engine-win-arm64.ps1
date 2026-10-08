<#
  Fetches the prebuilt native Windows ARM64 engine (engines/win32-arm64/).
  The blob is produced reproducibly by scripts/build-engine-win-arm64.ps1 and
  published as a release asset; CI uses this fetch for speed/reliability instead
  of building openconnect from source on the runner.
  Run from repo root: powershell -ExecutionPolicy Bypass -File scripts/fetch-engine-win-arm64.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Out  = Join-Path $Root 'engines'
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$url = $env:ENGINE_WIN_ARM64_URL
if (-not $url) {
  $url = 'https://github.com/Electroinvest-me/electroinvest-secureaccess/releases/download/v0.1.0-preview/engine-win32-arm64.zip'
}
$zip = Join-Path $env:TEMP 'engine-win32-arm64.zip'
Invoke-WebRequest $url -OutFile $zip
Expand-Archive $zip -DestinationPath $Out -Force   # extracts win32-arm64/ into engines/

Write-Host "Engine -> $Out\win32-arm64"
Get-ChildItem (Join-Path $Out 'win32-arm64') | Select-Object Name, Length
