SVG icons for HDRezka player control buttons.

Prepared icons:
- `watchlist.svg`
- `watchlist_favorite.svg`
- `watchlist_watching.svg`
- `watchlist_later.svg`
- `watchlist_completed.svg`
- `watchlist_abandoned.svg`
- `theater-mode.svg`
- `audio-compressor.svg`
- `trash.svg`
- `video-blur.svg`
- `video-mirror.svg`
- `playback-overlay.svg`
- `translator-audio.svg`

Guidelines:
- `viewBox="0 0 24 24"`
- use `stroke="currentColor"` so buttons can inherit text color
- keep shapes simple for small-size rendering
- intended render size in the panel: about `16px` to `18px`

Generated artifact:
- `../player-controls-icons-sprite.svg`

Generation:
- built automatically by `scripts/build-player-controls-sprite.ps1`
- hook entry point: `scripts/run-pre-commit-tasks.ps1`