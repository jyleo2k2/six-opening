$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

$configPath = Join-Path $PSScriptRoot ".env.kiwoom.local"

if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw "설정 파일이 없습니다: $configPath"
}

Write-Host "키움 30종목 대시보드를 시작합니다."
Write-Host "브라우저 주소: http://127.0.0.1:8787"
Write-Host "종료하려면 Ctrl+C를 누르세요."
node "$PSScriptRoot\kiwoom-dashboard-server.mjs"

if ($LASTEXITCODE -ne 0) {
    throw "키움 대시보드 서버가 오류 코드 $LASTEXITCODE 로 종료되었습니다."
}
