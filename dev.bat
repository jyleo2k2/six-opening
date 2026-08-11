@echo off
setlocal

set "PROJECT_DIR=%~dp0web"
pushd "%PROJECT_DIR%"
if errorlevel 1 (
  echo Unable to open the web project folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js and try again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing project packages...
  call npm install
  if errorlevel 1 (
    echo Package installation failed.
    pause
    exit /b 1
  )
)

echo Starting the development server...
echo Open http://localhost:3000 in your browser.
call npm run dev

pause
