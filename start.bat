@echo off
title GIF Converter
echo ========================================================
echo   GIF Converter 服務啟動中...
echo   網址: http://127.0.0.1:8080
echo ========================================================
cd /d "%~dp0"
start http://127.0.0.1:8080
python app.py
pause
