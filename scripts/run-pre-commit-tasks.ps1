$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'build-player-controls-sprite.ps1')
& (Join-Path $PSScriptRoot 'bump-core-version.ps1')