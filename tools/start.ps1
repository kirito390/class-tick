param(
  [switch]$NoOpen,
  [switch]$Widget,
  [switch]$InstallStartup,
  [switch]$RemoveStartup,
  [switch]$Stop
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$port = 8788
$baseUrl = "http://127.0.0.1:$port/"
$widgetUrl = "http://127.0.0.1:$port/?widget=1"
$startupLnk = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\课刻小组件.lnk'

function Test-Server {
  try {
    $client = New-Object Net.Sockets.TcpClient
    $client.Connect('127.0.0.1', $port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Find-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe'),
    (Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe')
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  return $null
}

function Start-ClasstickServer {
  if (Test-Server) {
    Write-Host "[OK] 课刻服务已经在运行：$baseUrl" -ForegroundColor Green
    return $true
  }
  $node = Find-Node
  if (-not $node) {
    Write-Host "[X] 没有找到 Node.js。" -ForegroundColor Red
    Write-Host "    请安装 Node.js 20 或更新版本：https://nodejs.org/ ，装好后再双击一次。"
    return $false
  }
  Write-Host "正在启动课刻服务（端口 $port）..."
  Start-Process -FilePath $node -ArgumentList @('server.mjs', "$port") -WorkingDirectory $root -WindowStyle Minimized
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-Server) {
      Write-Host "[OK] 课刻服务已就绪：$baseUrl" -ForegroundColor Green
      return $true
    }
  }
  Write-Host "[X] 服务启动超时。可以手动在本目录运行：node server.mjs $port" -ForegroundColor Red
  return $false
}

function Find-Browser {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  return $null
}

if ($Stop) {
  Write-Host "正在停止课刻服务（端口 $port）..."
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $conns.OwningProcess | Sort-Object -Unique | ForEach-Object {
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] 服务已停止。" -ForegroundColor Green
  } else {
    Write-Host "课刻服务本来就没有在运行。"
  }
  exit 0
}

if ($RemoveStartup) {
  if (Test-Path -LiteralPath $startupLnk) {
    Remove-Item -LiteralPath $startupLnk -Force
    Write-Host "[OK] 已取消课刻的开机自启。" -ForegroundColor Green
  } else {
    Write-Host "课刻本来就没有设置开机自启。"
  }
  exit 0
}

if ($InstallStartup) {
  $target = Join-Path $root '课刻-小组件.cmd'
  if (-not (Test-Path -LiteralPath $target)) {
    Write-Host "[X] 找不到 课刻-小组件.cmd，请确认文件完整。" -ForegroundColor Red
    exit 1
  }
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($startupLnk)
  $shortcut.TargetPath = $target
  $shortcut.WorkingDirectory = $root
  $shortcut.WindowStyle = 7
  $shortcut.Description = '课刻 ClassTick 课程表小组件'
  $shortcut.Save()
  Write-Host "[OK] 已设置开机自启：登录 Windows 后会自动打开课刻小组件。" -ForegroundColor Green
  Write-Host "     取消自启：双击「课刻-取消开机自启.cmd」"
  exit 0
}

$ok = Start-ClasstickServer
if (-not $ok) {
  Write-Host ""
  Read-Host "按回车键关闭"
  exit 1
}

if ($Widget) {
  $browser = Find-Browser
  if ($browser) {
    Write-Host "正在以小组件窗口打开…"
    Start-Process -FilePath $browser -ArgumentList @(
      "--app=$widgetUrl",
      '--window-size=420,820',
      '--window-position=1480,80'
    )
    Write-Host "提示：把这个小窗口拖到屏幕角落即可；双击「课刻-开机自启.cmd」可以登录后自动打开。"
  } else {
    Write-Host "没有找到 Edge / Chrome，改用默认浏览器打开：$widgetUrl"
    Start-Process $widgetUrl
  }
  exit 0
}

if (-not $NoOpen) {
  Start-Process $baseUrl
  Write-Host ""
  Write-Host "课刻已经打开：$baseUrl"
  Write-Host "装成桌面应用：浏览器地址栏右侧点「安装」图标，或课刻右上角的「安装」。"
  Write-Host "只要小窗口：双击「课刻-小组件.cmd」。"
  Write-Host "停止服务：双击「课刻-停止服务.cmd」。"
}
exit 0
