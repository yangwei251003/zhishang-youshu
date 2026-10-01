@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PAPER_PORT=5189
echo 纸上有数第二版：http://127.0.0.1:5189
echo 如果此入口已启动，直接在浏览器打开以上地址即可。
node scripts\serve.mjs
pause
