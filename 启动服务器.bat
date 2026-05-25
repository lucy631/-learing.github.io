@echo off
chcp 936 >nul
title 小奥学习
echo.
echo ==========================================
echo   小奥学习 - 本地服务器
echo ==========================================
echo.
echo 1. 手机和电脑请连接同一 WiFi
echo 2. 手机用 Chrome 打开下面显示的地址
echo 3. Chrome 菜单里选 添加到主屏幕
echo.
echo 你电脑的 IP 地址如下
ipconfig | findstr /i "IPv4"
echo.
echo 手机浏览器输入  http://上面的IP:8080
echo.
echo 正在启动 端口 8080 ...
python -m http.server 8080
pause