<#
  Builds a native Windows ARM64 `openconnect` and assembles the engine payload
  into engines/win32-arm64/.  Reproduces the manual steps that got us a WORKING
  ARM64 build (upstream/third-party binaries have a broken crypto backend).

  Requires: Windows on ARM64. Installs MSYS2 (CLANGARM64) if missing.
  Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts/build-engine-win-arm64.ps1
#>
$ErrorActionPreference = 'Stop'
$Root   = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root 'engines\win32-arm64'
$Msys   = 'C:\msys64'

if (-not (Test-Path "$Msys\usr\bin\bash.exe")) {
  Write-Host 'Instaliram MSYS2…'
  $inst = Join-Path $env:TEMP 'msys2.exe'
  Invoke-WebRequest 'https://repo.msys2.org/distrib/msys2-x86_64-latest.exe' -OutFile $inst
  & $inst in --confirm-command --accept-messages --root $Msys | Out-Null
}
$bash = "$Msys\usr\bin\bash.exe"

$build = @'
#!/usr/bin/env bash
set -eo pipefail
export MSYSTEM=CLANGARM64; source /etc/profile
export PATH=/clangarm64/bin:/usr/bin:$PATH
pacman -Sy  --noconfirm --disable-download-timeout
pacman -S   --noconfirm --needed --disable-download-timeout git make autoconf automake libtool \
  mingw-w64-clang-aarch64-clang mingw-w64-clang-aarch64-pkgconf \
  mingw-w64-clang-aarch64-gnutls mingw-w64-clang-aarch64-libxml2 mingw-w64-clang-aarch64-zlib
cd ~
rm -rf openconnect
git clone --depth 1 https://gitlab.com/openconnect/openconnect.git
cd openconnect
# llvm-mingw has no <sec_api/stdlib_s.h>; it was only needed for errno_t
sed -i 's|#include <sec_api/stdlib_s.h>.*|#ifndef _ERRNO_T_DEFINED\n#define _ERRNO_T_DEFINED\ntypedef int errno_t;\n#endif|' compat.c
./autogen.sh
./configure --with-gnutls --without-openssl --disable-nls --with-vpnc-script=vpnc-script-win.js
# the "vpnc-script-win.js" make target tries to download and may exit 127,
# but openconnect.exe links before that — so tolerate it and verify the exe.
make -j"$(nproc)" || true
test -f .libs/openconnect.exe
D=/c/oc-dist; rm -rf "$D"; mkdir -p "$D"
cp .libs/openconnect.exe "$D/openconnect.exe"
cp .libs/*.dll "$D/" 2>/dev/null || true      # libopenconnect-5.dll
collect() { for d in $(ldd "$1" 2>/dev/null | awk '/clangarm64/{print $3}'); do cp -un "$d" "$D/" 2>/dev/null || true; done; }
collect .libs/openconnect.exe
for i in 1 2 3; do for f in "$D"/*.dll; do collect "$f"; done; done
cp /clangarm64/bin/libwinpthread-1.dll "$D/" 2>/dev/null || true
# the REAL routing script (the one bundled in some builds is empty!)
curl -L -o "$D/vpnc-script-win.js" https://gitlab.com/openconnect/vpnc-scripts/-/raw/master/vpnc-script-win.js
ls -la "$D"
'@
$build = $build -replace "`r`n", "`n"
[IO.File]::WriteAllText("$Msys\tmp\build-oc.sh", $build)
& $bash -lc 'bash /tmp/build-oc.sh'
if ($LASTEXITCODE -ne 0) { throw "build failed ($LASTEXITCODE)" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Copy-Item 'C:\oc-dist\*' $OutDir -Force
Write-Host "Engine -> $OutDir"
Get-ChildItem $OutDir | Select-Object Name, Length
