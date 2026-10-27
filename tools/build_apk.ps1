# 构建 Android APK（本机已装便携工具链）

> 本脚本按当前项目的 `_build_tools/` 便携 JDK 17 + Android SDK 34 构建；
> 换机器时先按 `docs/native.md` 安装 Android Studio / JDK，再改下面的路径。

param(
  [ValidateSet('debug', 'release')]
  [string]$Mode = 'release'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Jdk = Join-Path $Root '_build_tools\jdk17'
$Sdk = Join-Path $Root '_build_tools\android-sdk'
$Gradle = Join-Path $Root '_build_tools\gradle-8.2.1\bin\gradle.bat'
$Tmp = Join-Path $Root '_build_tools\tmp'
$GradleHome = Join-Path $Root '_build_tools\gradle-home'

foreach ($p in @($Jdk, $Sdk, $Gradle)) {
  if (-not (Test-Path $p)) { throw "缺少构建工具：$p（见 docs/native.md）" }
}
New-Item -ItemType Directory -Force $Tmp | Out-Null

$env:JAVA_HOME = $Jdk
Remove-Item Env:JAVA_TOOL_OPTIONS -ErrorAction SilentlyContinue
$env:TEMP = $Tmp
$env:TMP = $Tmp
$env:ANDROID_HOME = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk
$env:GRADLE_USER_HOME = $GradleHome

Push-Location (Join-Path $Root 'android')
try {
  & $Gradle "assemble$(if ($Mode -eq 'release') { 'Release' } else { 'Debug' })" `
    --no-daemon --console=plain '-Dorg.gradle.native=false' "-Djava.io.tmpdir=$Tmp"
  if ($LASTEXITCODE -ne 0) { throw "Gradle 退出码 $LASTEXITCODE" }
} finally {
  Pop-Location
}

$apk = if ($Mode -eq 'release') {
  Join-Path $Root 'android\app\build\outputs\apk\release\app-release.apk'
} else {
  Join-Path $Root 'android\app\build\outputs\apk\debug\app-debug.apk'
}
if (-not (Test-Path $apk)) { throw "没有找到 APK：$apk" }

$out = Join-Path $Root ('dist\课刻-ClassTick-v1.6-Android' + $(if ($Mode -eq 'release') { '' } else { '-debug' }) + '.apk')
Copy-Item $apk $out -Force
$hash = (Get-FileHash $out -Algorithm SHA256).Hash
Write-Host "APK: $out"
Write-Host "SHA256: $hash"
