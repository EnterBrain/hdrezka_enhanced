@echo off
setlocal

where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\run-pre-commit-tasks.ps1 %*
  exit /b %errorlevel%
)

where powershell >nul 2>nul
if %errorlevel%==0 (
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-pre-commit-tasks.ps1 %*
  exit /b %errorlevel%
)

echo PowerShell not found, skip generated assets and hdrezka-core.js version bump. 1>&2
exit /b 0