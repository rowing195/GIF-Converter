@echo off
chcp 65001 > nul
title GIF Converter
echo ========================================================
echo   GIF Converter 服務啟動中...
echo   網址: http://127.0.0.1:8008
echo ========================================================
cd /d "%~dp0"
start http://127.0.0.1:8008
python app.py
pause
