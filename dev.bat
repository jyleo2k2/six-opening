@echo off
setlocal
chcp 65001 >nul

set "REPO_DIR=%~dp0"
pushd "%REPO_DIR%."
if errorlevel 1 (
  echo Unable to open the repository folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js and try again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm and try again.
  pause
  exit /b 1
)

node "%REPO_DIR%scripts\dev-runner.mjs" "%REPO_DIR%."
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Press any key to close this window after checking the message above.
  pause >nul
)

popd
exit /b %EXIT_CODE%
