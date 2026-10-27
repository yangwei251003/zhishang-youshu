@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24，或在已配置的本机环境运行。
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo 尚未构建运行包。请在本项目目录执行 npm install 和 npm run build。
  pause
  exit /b 1
)
echo 在浏览器打开 http://127.0.0.1:5187
node scripts\serve.mjs
pause
