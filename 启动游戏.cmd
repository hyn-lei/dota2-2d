@echo off
cd /d "%~dp0"
if not exist "node_modules\ws\package.json" (
  call npm ci --omit=dev
  if errorlevel 1 exit /b 1
)
node scripts/server.mjs
pause
