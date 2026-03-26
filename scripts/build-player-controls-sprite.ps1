$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'assets/player-controls-icons'
$outputPath = Join-Path $repoRoot 'assets/player-controls-icons-sprite.svg'

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Source directory not found: $sourceDir"
}

$svgFiles = Get-ChildItem -LiteralPath $sourceDir -Filter '*.svg' | Sort-Object Name
if (-not $svgFiles) {
    throw "No SVG files found in $sourceDir"
}

$symbolBlocks = foreach ($file in $svgFiles) {
    $raw = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $match = [Regex]::Match($raw, '<svg\b([^>]*)>([\s\S]*?)</svg>', 'IgnoreCase')
    if (-not $match.Success) {
        throw "Invalid SVG file: $($file.FullName)"
    }

    $attributes = $match.Groups[1].Value
    $inner = $match.Groups[2].Value.Trim()
    $viewBoxMatch = [Regex]::Match($attributes, 'viewBox\s*=\s*"([^"]+)"', 'IgnoreCase')
    $viewBox = if ($viewBoxMatch.Success) { $viewBoxMatch.Groups[1].Value } else { '0 0 24 24' }
    $symbolId = "hdw-icon-$($file.BaseName)"

@"
  <symbol id="$symbolId" viewBox="$viewBox" fill="none">
    $inner
  </symbol>
"@
}

$sprite = @"
<svg xmlns="http://www.w3.org/2000/svg">
$($symbolBlocks -join [Environment]::NewLine)
</svg>
"@

[System.IO.File]::WriteAllText($outputPath, $sprite, [System.Text.UTF8Encoding]::new($false))
git add -- assets/player-controls-icons-sprite.svg
Write-Host "Built player controls sprite: assets/player-controls-icons-sprite.svg"