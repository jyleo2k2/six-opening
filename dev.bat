@echo off
setlocal

set "REPO_DIR=%~dp0"
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

rem The chatbot answers glossary, FAQ and four-step questions without the API key.
rem Only the LLM fallback path needs it, so a missing .env is a warning, not an error.
if not exist "%REPO_DIR%.env" (
  echo [warn] .env was not found in this folder.
  echo [warn] Glossary, FAQ and four-step answers still work.
  echo [warn] The LLM fallback needs OPENAI_API_KEY - copy .env.example to .env.
)

rem Each parallel session gets its own port from the session registry.
rem Falls back to 3000 when this folder is not a registered worktree.
set "PORT=3000"
for /f "usebackq delims=" %%p in (`node "%REPO_DIR%scripts\dev-port.mjs" "%REPO_DIR%." 2^>nul`) do set "PORT=%%p"

echo Starting the development server...
echo Open http://localhost:%PORT% in your browser.
call npm run dev -- -p %PORT%

pause
