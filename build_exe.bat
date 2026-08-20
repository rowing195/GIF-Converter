@echo off
title GIF Converter - Build EXE
cd /d "%~dp0"

echo ========================================================
echo   GIF Converter 打包中...
echo   輸出：dist\GIFConverter\GIFConverter.exe
echo ========================================================

python -m pip install pyinstaller
python -m PyInstaller gif_converter.spec --noconfirm

if errorlevel 1 (
  echo.
  echo [失敗] 打包過程發生錯誤，請往上捲動查看訊息。
  pause
  exit /b 1
)

echo.
echo 正在壓縮成 dist\GIFConverter.zip（檔案較大，請稍候）...
powershell -NoProfile -Command "Compress-Archive -Path 'dist\GIFConverter\*' -DestinationPath 'dist\GIFConverter.zip' -Force"

echo.
echo [完成] 資料夾：dist\GIFConverter\
echo         壓縮檔：dist\GIFConverter.zip
pause
