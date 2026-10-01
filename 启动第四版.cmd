@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PAPER_PORT=5192
set PAPER_DIST=dist-v4
if not exist "dist-v4\index.html" (
  echo Please build the fourth edition first: npm run build
  pause
  exit /b 1
)
start "" http://127.0.0.1:5192
node scripts\serve.mjs
pause
