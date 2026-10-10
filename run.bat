@echo off
title Fatafat Brief
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies, first run only...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist ".env.local" (
  echo Note: no .env.local found - add VITE_GEMINI_API_KEY=... to enable Gemini, or use "Add AI key" in the app.
)

echo Starting Fatafat Brief at http://localhost:5173/  (close this window to stop)
start "" http://localhost:5173/
call npm run dev -- --port 5173 --strictPort --host
pause
