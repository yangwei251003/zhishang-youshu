@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PAPER_PORT=5190
echo Paper Workshop v0.3.0 - http://127.0.0.1:5190
echo If already running, open the address above in your browser.
node scripts\serve.mjs
pause
