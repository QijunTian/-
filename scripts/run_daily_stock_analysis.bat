@echo off
REM Windows 双击/命令行启动入口
REM 注释：调用同目录 PowerShell 脚本完成克隆、安装与启动

cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_daily_stock_analysis.ps1"
pause
