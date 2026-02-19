$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$coreFile = Join-Path $repoRoot 'hdrezka-core.js'

if (-not (Test-Path -LiteralPath $coreFile)) {
    throw "File not found: $coreFile"
}

$timestamp = Get-Date -Format 'yyyy.MM.dd.HHmmss.fff'
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
$pattern = "(?m)^(\s*const HDREZKA_CORE_VERSION = ')[^']*(';\s*// auto-updated by git hook)\r?$"
$updated = [Regex]::Replace(
    $content,
    $pattern,
    {
        param($match)
        return "$($match.Groups[1].Value)$newVersion$($match.Groups[2].Value)"
    },
    1
)

if ($updated -eq $content) {
    throw 'Version marker was not found in hdrezka-core.js'
}

Set-Content -Path $coreFile -Value $updated -Encoding UTF8
git add -- hdrezka-core.js
Write-Host "Updated HDREZKA core version to $newVersion"

