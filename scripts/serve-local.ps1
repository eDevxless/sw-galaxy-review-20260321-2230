$projectRoot = Split-Path -Parent $PSScriptRoot
$netlifyPath = Join-Path $projectRoot "netlify.toml"
$port = 4179

if (!(Test-Path $netlifyPath)) {
  Write-Error "netlify.toml wurde nicht gefunden."
  exit 1
}

$netlifyToml = Get-Content $netlifyPath -Raw
$publishMatch = [regex]::Match($netlifyToml, '^\s*publish\s*=\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Multiline)
$publishDir = if ($publishMatch.Success) { $publishMatch.Groups[1].Value.Trim() } else { "" }
$publishUrlPath = if ([string]::IsNullOrWhiteSpace($publishDir)) { "" } else { ($publishDir -replace '\\', '/' -replace '^\./', '').TrimEnd('/') + "/" }
$rootUrl = "http://127.0.0.1:$port/"
$currentUrl = if ($publishUrlPath) { "$rootUrl$publishUrlPath" } else { $rootUrl }

Write-Host ""
Write-Host "Lokaler Server startet..." -ForegroundColor Cyan
Write-Host "Root-URL:            $rootUrl" -ForegroundColor Green
Write-Host "Aktueller Build:     $currentUrl" -ForegroundColor Green
Write-Host "Regel: Immer Root-URL oder den Wert aus [build].publish in netlify.toml verwenden." -ForegroundColor DarkCyan
Write-Host "Beenden: Ctrl + C" -ForegroundColor Yellow
Write-Host ""

if (Get-Command py -ErrorAction SilentlyContinue) {
  Set-Location $projectRoot
  py -m http.server $port --bind 127.0.0.1
  exit $LASTEXITCODE
}

if (Get-Command python -ErrorAction SilentlyContinue) {
  Set-Location $projectRoot
  python -m http.server $port --bind 127.0.0.1
  exit $LASTEXITCODE
}

Write-Error "Weder 'py' noch 'python' wurde gefunden."
exit 1
