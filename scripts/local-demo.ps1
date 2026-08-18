<#
.SYNOPSIS
    영웅 키움 로컬 시연 — 프로덕션 서버와 Cloudflare 터널을 한 번에 띄운다.

.DESCRIPTION
    발표 시연용이다. 앱을 이 컴퓨터에서 그대로 돌리고 바깥에서 접속할 주소만 만든다.
    클라우드에 올리지 않는 이유는 시세 API의 IP 제한 때문이다 — 토스는 사전 등록한 IP만
    통과시키고, 키움은 토큰을 발급받은 IP와 호출 IP가 같아야 한다(에러 8010).
    터널은 나가는 요청을 이 컴퓨터에서 보내므로 두 조건을 그대로 만족한다.

    이 스크립트가 하는 일:
      1. 저장소 루트 .env 를 현재 프로세스 환경변수로 주입한다
      2. 시세 제공자 순서를 고정한다
      3. next build (생략 가능)
      4. next start 를 백그라운드로 띄우고 포트가 열릴 때까지 기다린다
      5. 시세 한 건을 조회해 실데이터인지 확인한다
      6. cloudflared 터널을 띄우고 공개 주소를 크게 찍는다

.PARAMETER Port
    앱이 사용할 로컬 포트. 기본 3010. 세션 관리기가 쓰는 3100 대역과 겹치지 않게 둔다.

.PARAMETER SkipBuild
    이미 빌드해 둔 .next 를 그대로 쓴다. 코드를 안 고쳤으면 이걸로 시간을 아낀다.

.PARAMETER Provider
    먼저 시도할 시세 제공자. 기본 toss.

.PARAMETER Fallback
    첫 제공자가 실패할 때 넘어갈 제공자. 기본 kiwoom.

.PARAMETER Quic
    cloudflared 를 QUIC(UDP 7844)로 연결한다. 기본은 http2 — 대부분의 공유기가 UDP 7844 를
    막고 있어 QUIC 을 먼저 시도하면 빨간 ERR 줄이 뜬 뒤에야 http2 로 넘어간다.

.PARAMETER NoTunnel
    터널을 열지 않고 로컬 서버까지만 띄운다. 바깥에 노출하지 않고 빌드·시세만 확인할 때 쓴다.
    서버는 계속 떠 있으므로 끝나면 -Stop 으로 내린다.

.PARAMETER Stop
    이 스크립트가 띄운 서버와 터널을 정리한다.

.EXAMPLE
    .\scripts\local-demo.ps1
    빌드부터 터널까지 전부 실행한다.

.EXAMPLE
    .\scripts\local-demo.ps1 -SkipBuild
    빌드를 건너뛰고 바로 띄운다.

.EXAMPLE
    .\scripts\local-demo.ps1 -Stop
    남아 있는 서버와 터널을 끈다.
#>
[CmdletBinding()]
param(
    [int]$Port = 3010,
    [switch]$SkipBuild,
    [string]$Provider = 'toss',
    [string]$Fallback = 'kiwoom',
    [switch]$Quic,
    [switch]$NoTunnel,
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$WebDir   = Join-Path $RepoRoot 'web'
$LogDir   = Join-Path $env:TEMP 'six-opening-demo'
$PidFile  = Join-Path $LogDir 'server.pid'

function Write-Step($text)  { Write-Host "`n[단계] $text" -ForegroundColor Cyan }
function Write-Ok($text)    { Write-Host "  OK   $text" -ForegroundColor Green }
function Write-Note($text)  { Write-Host "  경고 $text" -ForegroundColor Yellow }
function Write-Fail($text)  { Write-Host "  실패 $text" -ForegroundColor Red }

function Find-Cloudflared {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        'C:\Program Files (x86)\cloudflared\cloudflared.exe',
        'C:\Program Files\cloudflared\cloudflared.exe'
    )
    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
    return $null
}

# `.env` 는 Git 이 추적하지 않아 관제 저장소 루트에만 있다. worktree 에서 실행하면
# 아무리 위로 올라가도 없으므로, worktree 의 `.git` 파일이 가리키는 관제 루트를 따라간다.
# web/shared/repo-root.ts 의 controlRepositoryRoot 와 같은 규칙이다.
function Resolve-EnvFile($root) {
    $direct = Join-Path $root '.env'
    if (Test-Path $direct) { return $direct }

    $gitPath = Join-Path $root '.git'
    if (-not (Test-Path $gitPath -PathType Leaf)) { return $null }

    $line = Get-Content $gitPath -First 1 -ErrorAction SilentlyContinue
    if ($line -notmatch 'gitdir:\s*(.+)$') { return $null }

    $gitdir = $matches[1].Trim()
    if (-not [System.IO.Path]::IsPathRooted($gitdir)) { $gitdir = Join-Path $root $gitdir }

    # gitdir = <관제 루트>/.git/worktrees/<이름> 이므로 세 단계 위가 관제 루트다.
    $controlRoot = Resolve-Path (Join-Path $gitdir '..\..\..') -ErrorAction SilentlyContinue
    if (-not $controlRoot) { return $null }

    $candidate = Join-Path $controlRoot.Path '.env'
    if (Test-Path $candidate) { return $candidate }
    return $null
}

function Get-ListenerPid($portNumber) {
    $conn = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
    if ($conn) { return @($conn)[0].OwningProcess }
    return $null
}

function Stop-Demo {
    Write-Step '정리'
    # $env:TEMP 는 보통 8.3 단축 이름(예: KDA35~1)을 포함한다. Remove-Item 은 그 `~` 를
    # 홈 경로로 해석해 -LiteralPath 를 줘도 PSArgumentException 을 낸다. 파일 조작은
    # 경로를 해석하지 않는 .NET API 로 처리한다.
    if ([System.IO.File]::Exists($PidFile)) {
        $savedPid = ([System.IO.File]::ReadAllText($PidFile)).Trim()
        if ($savedPid) {
            $p = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
            if ($p) {
                Stop-Process -Id $savedPid -Force -Confirm:$false -ErrorAction SilentlyContinue
                Write-Ok "앱 서버 종료 (PID $savedPid)"
            }
        }
        [System.IO.File]::Delete($PidFile)
    }
    $listener = Get-ListenerPid $Port
    if ($listener) {
        Stop-Process -Id $listener -Force -Confirm:$false -ErrorAction SilentlyContinue
        Write-Ok "$Port 포트 점유 프로세스 종료 (PID $listener)"
    }
    $tunnels = Get-Process cloudflared -ErrorAction SilentlyContinue
    if ($tunnels) {
        $tunnels | Stop-Process -Force -Confirm:$false -ErrorAction SilentlyContinue
        Write-Ok "cloudflared 종료"
    }
    Write-Host ''
}

if ($Stop) { Stop-Demo; return }

[System.IO.Directory]::CreateDirectory($LogDir) | Out-Null
$ServerOut = Join-Path $LogDir 'server.out.log'
$ServerErr = Join-Path $LogDir 'server.err.log'

Write-Host ''
Write-Host '=== 영웅 키움 로컬 시연 ===' -ForegroundColor White
Write-Host "저장소: $RepoRoot"
Write-Host "포트:   $Port"

# ---------------------------------------------------------------------------
# 1. .env 주입
#
# next start 는 NODE_ENV=production 이고, web/app/api/dev-env.ts 는 프로덕션이면
# .env 를 읽지 않고 즉시 반환한다. 시세 제공자와 Supabase 가 전부 그 함수를 거치므로
# 여기서 직접 넣지 않으면 키가 하나도 없는 채로 떠서 픽스처 시세가 나온다.
# ---------------------------------------------------------------------------
Write-Step '.env 주입'
$EnvFile = Resolve-EnvFile $RepoRoot
if (-not $EnvFile) {
    Write-Fail "$RepoRoot 와 관제 저장소 루트 어디에도 .env 가 없다."
    Write-Host '       .env.example 을 복사해 값을 채워라.' -ForegroundColor Yellow
    return
}
Write-Ok "원본: $EnvFile"
$injected = 0
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $key = $matches[1]
        $value = $matches[2].Trim()
        if ($value.Length -ge 2) {
            $first = $value.Substring(0, 1)
            $last = $value.Substring($value.Length - 1, 1)
            if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }
        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        $injected++
    }
}
Write-Ok "$injected 개 주입"

$env:QUOTE_PROVIDER = $Provider
$env:QUOTE_PROVIDER_FALLBACK = $Fallback
Write-Ok "시세 제공자: $Provider (폴백 $Fallback)"

# DEMO_USER_ID 는 쿠키 없이 API 를 열어 주는 개발용 우회다. 공개 주소에서는 위험하다.
if ([Environment]::GetEnvironmentVariable('DEMO_USER_ID', 'Process')) {
    [Environment]::SetEnvironmentVariable('DEMO_USER_ID', $null, 'Process')
    Write-Note 'DEMO_USER_ID 를 제거했다 — 공개 주소에서 인증 우회가 열리면 안 된다.'
}

$required = @('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'OPENAI_API_KEY')
if ($Provider -eq 'toss' -or $Fallback -eq 'toss') { $required += @('TOSS_CLIENT_ID', 'TOSS_CLIENT_SECRET') }
if ($Provider -eq 'kiwoom' -or $Fallback -eq 'kiwoom') { $required += @('KIWOOM_APP_KEY', 'KIWOOM_SECRET_KEY') }
$missing = @()
foreach ($name in ($required | Select-Object -Unique)) {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) { $missing += $name }
}
if ($missing.Count -gt 0) { Write-Note "값이 비었다: $($missing -join ', ')" }

# ---------------------------------------------------------------------------
# 2. 포트 확인
# ---------------------------------------------------------------------------
Write-Step '포트 확인'
$busy = Get-ListenerPid $Port
if ($busy) {
    $owner = Get-Process -Id $busy -ErrorAction SilentlyContinue
    Write-Fail "$Port 포트를 PID $busy ($($owner.ProcessName)) 가 쓰고 있다."
    Write-Host '       -Port 로 다른 포트를 주거나, -Stop 으로 정리한 뒤 다시 실행해라.' -ForegroundColor Yellow
    return
}
Write-Ok "$Port 비어 있음"

# ---------------------------------------------------------------------------
# 3. 빌드
# ---------------------------------------------------------------------------
if ($SkipBuild) {
    Write-Step '빌드 생략 (-SkipBuild)'
    if (-not (Test-Path (Join-Path $WebDir '.next'))) {
        Write-Fail '.next 가 없다. -SkipBuild 없이 다시 실행해라.'
        return
    }
    Write-Ok '기존 .next 사용'
} else {
    Write-Step '빌드 (next build)'
    Push-Location $WebDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Fail "빌드 실패 (exit $LASTEXITCODE)"; return }
    } finally {
        Pop-Location
    }
    Write-Ok '빌드 완료'
}

# ---------------------------------------------------------------------------
# 4. 앱 서버
# ---------------------------------------------------------------------------
Write-Step "앱 서버 기동 (next start -p $Port)"
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { $npm = 'npm.cmd' }
$server = Start-Process -FilePath $npm `
    -ArgumentList @('start', '--', '-p', "$Port") `
    -WorkingDirectory $WebDir `
    -PassThru -NoNewWindow `
    -RedirectStandardOutput $ServerOut `
    -RedirectStandardError $ServerErr
[System.IO.File]::WriteAllText($PidFile, [string]$server.Id)

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    if ($server.HasExited) { break }
    if (Get-ListenerPid $Port) { $ready = $true; break }
}
if (-not $ready) {
    Write-Fail '서버가 포트를 열지 못했다.'
    Write-Host "       로그: $ServerOut" -ForegroundColor Yellow
    Write-Host "             $ServerErr" -ForegroundColor Yellow
    Stop-Demo
    return
}
Write-Ok "http://localhost:$Port (PID $($server.Id))"

# ---------------------------------------------------------------------------
# 5. 시세 점검 — 실데이터인지 픽스처인지 여기서 갈린다
# ---------------------------------------------------------------------------
Write-Step '시세 점검 (005930)'
try {
    $quote = Invoke-RestMethod -Uri "http://localhost:$Port/api/quote/005930" -TimeoutSec 30
    if ($quote.source -eq 'live') {
        Write-Ok "실시간 — provider=$($quote.provider) price=$($quote.price) rate=$([Math]::Round($quote.rate, 2))%"
    } else {
        Write-Note "실시간이 아니다 — source=$($quote.source) provider=$($quote.provider)"
        Write-Host '       IP 허용 등록, API 키, 네트워크를 확인해라. 가격이 멈춘 채로 시연된다.' -ForegroundColor Yellow
    }
} catch {
    Write-Note "시세 조회 실패: $($_.Exception.Message)"
}

# ---------------------------------------------------------------------------
# 6. 터널
# ---------------------------------------------------------------------------
if ($NoTunnel) {
    Write-Step '터널 생략 (-NoTunnel)'
    Write-Ok "로컬 전용으로 떠 있다: http://localhost:$Port"
    Write-Host "       끝나면 정리해라: .\scripts\local-demo.ps1 -Stop -Port $Port" -ForegroundColor Yellow
    Write-Host ''
    return
}

Write-Step 'Cloudflare 터널'
$cf = Find-Cloudflared
if (-not $cf) {
    Write-Fail 'cloudflared 가 없다. 아래 명령으로 설치한 뒤 다시 실행해라.'
    Write-Host '       winget install --id Cloudflare.cloudflared' -ForegroundColor Yellow
    Stop-Demo
    return
}
Write-Ok "cloudflared: $cf"

$cfArgs = @('tunnel', '--url', "http://localhost:$Port", '--no-autoupdate')
if (-not $Quic) { $cfArgs += @('--protocol', 'http2') }

Write-Host ''
Write-Host '터널을 여는 중. 주소가 나오면 아래에 크게 표시된다.' -ForegroundColor Cyan
Write-Host '이 창을 닫거나 Ctrl+C 를 누르면 시연이 끝난다.' -ForegroundColor DarkGray
Write-Host ''

$publicUrl = $null
try {
    & $cf @cfArgs 2>&1 | ForEach-Object {
        $line = $_.ToString()
        if ((-not $publicUrl) -and ($line -match 'https://[a-z0-9-]+\.trycloudflare\.com')) {
            $publicUrl = $matches[0]
            Write-Host ''
            Write-Host '  =========================================================' -ForegroundColor Green
            Write-Host '   공개 주소 - 폰에서 이걸 열어라' -ForegroundColor Green
            Write-Host '  =========================================================' -ForegroundColor Green
            Write-Host "   $publicUrl" -ForegroundColor White
            Write-Host ''
            Write-Host '   확인: 로그인 화면 -> 로그인 -> 탐색 탭 가격이 5초마다 움직이는지' -ForegroundColor DarkGray
            Write-Host ''
        }
        Write-Host $line -ForegroundColor DarkGray
    }
} finally {
    Stop-Demo
}
