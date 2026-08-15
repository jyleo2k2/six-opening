# 수기 초안 진행판. pwsh 로 띄운다 (powershell.exe 5.1 은 한글이 깨진다).
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$target = 32
$dir = Join-Path $PSScriptRoot 'items'

while ($true) {
  $files = @(Get-ChildItem (Join-Path $dir '*.json') -ErrorAction SilentlyContinue)
  Clear-Host
  Write-Host ("수기 뉴스 초안   {0} / {1} 건" -f $files.Count, $target) -ForegroundColor Cyan
  Write-Host ('─' * 64) -ForegroundColor DarkGray

  foreach ($file in ($files | Sort-Object LastWriteTime)) {
    $item = Get-Content $file -Raw -Encoding utf8 | ConvertFrom-Json
    $tag = if ($item.replaces) { '[교체]' } else { '      ' }
    Write-Host ("{0} {1}  {2}" -f $tag, $file.BaseName, $item.headline.text)
  }

  if ($files.Count -eq 0) { Write-Host '  (아직 없음)' -ForegroundColor DarkGray }

  Write-Host ''
  Write-Host ("남은 {0}건 · 미리보기 manual-drafts\preview.html" -f ($target - $files.Count)) -ForegroundColor DarkGray
  Write-Host ("갱신 " + (Get-Date -Format 'HH:mm:ss') + "  (Ctrl+C 로 종료)") -ForegroundColor DarkGray
  Start-Sleep -Seconds 5
}
