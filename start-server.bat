@echo off
chcp 936 >nul
title XiaoAo Learning
echo.
echo ==========================================
echo   XiaoAo Learning - Local Server
echo ==========================================
echo.
echo 1. Phone and PC must use the SAME WiFi
echo 2. Open Chrome on phone, use address below
echo 3. Menu - Add to Home screen
echo.
echo Your PC IP addresses:
ipconfig | findstr /i "IPv4"
echo.
echo On phone open:  http://YOUR_IP:8080
echo   replace YOUR_IP with numbers above
echo.
echo Starting server on port 8080 ...
echo Close this window to stop.
echo.
python -m http.server 8080
pause