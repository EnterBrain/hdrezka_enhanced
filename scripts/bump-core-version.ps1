$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$coreFile = Join-Path $repoRoot 'hdrezka-core.js'

if (-not (Test-Path -LiteralPath $coreFile)) {
    throw "File not found: $coreFile"
}

$timestamp = Get-Date -Format 'yyyy.MM.dd.HHmmss'
$shortSha = ''
try {
    $shortSha = (git rev-parse --short HEAD 2>$null).Trim()
} catch {
    $shortSha = ''
}

if ([string]::IsNullOrWhiteSpace($shortSha)) {
    $shortSha = 'nohead'
}

$newVersion = "$timestamp-$shortSha"
$content = Get-Content -Path $coreFile -Raw -Encoding UTF8
$pattern = "(?m)^(\s*const HDREZKA_CORE_VERSION = ')[^']*('; // auto-updated by git hook)$"
$updated = [Regex]::Replace($content, $pattern, "`${1}$newVersion`${2}", 1)

if ($updated -eq $content) {
    throw 'Version marker was not found in hdrezka-core.js'
}

Set-Content -Path $coreFile -Value $updated -Encoding UTF8
git add -- hdrezka-core.js
Write-Host "Updated HDREZKA core version to $newVersion"
